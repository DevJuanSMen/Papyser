"""
Documents (IA Documental) API Routes — Upload + Clasificación + Extracción.
Evolución del extractor original de facturas.
"""
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import StreamingResponse
from backend.api.schemas import InvoiceResponse
from backend.extractor.factory import get_extractor
from backend.core.excel_maker import generate_excel
from backend.core.document_utils import format_document
from backend.database.db import get_db
from backend.core.auth_utils import get_current_user
from pydantic import ValidationError

router = APIRouter()

@router.post("/upload")
async def upload_and_classify(request: Request, file: UploadFile = File(...)):
    """Sube documento, la IA lo clasifica y extrae datos según tipo."""
    user = get_current_user(request)
    
    try:
        content = await file.read()
        mime_type = file.content_type
        formatted_bytes, formatted_mime = format_document(content, mime_type)
        
        # Usar Gemini para clasificar + extraer
        from google.genai import types
        from backend.core.config import GEMINI_API_KEY
        from google import genai
        
        client = genai.Client(api_key=GEMINI_API_KEY)
        document_part = types.Part.from_bytes(data=formatted_bytes, mime_type=formatted_mime)
        
        prompt = """Analiza este documento y responde en JSON:
        {
            "tipo_documento": "cotizacion|factura|pliego|anexo_tecnico|certificacion|orden_compra|poliza|otro",
            "confianza": 0.0 a 1.0,
            "datos_extraidos": {
                // Si es cotización o factura:
                "proveedor": "...",
                "nit": "...",
                "numero_documento": "...",
                "fecha": "YYYY-MM-DD",
                "items": [{"descripcion": "...", "cantidad": 0, "precio_unitario": 0, "total_item": 0}],
                "subtotal": 0,
                "impuestos": 0,
                "total": 0,
                "condiciones_pago": "...",
                "tiempo_entrega": "...",
                "vigencia": "..."
                
                // Si es pliego: 
                // "entidad": "...", "objeto": "...", "presupuesto": 0, "fecha_cierre": "..."
                
                // Si es certificación:
                // "entidad_que_certifica": "...", "tipo_certificacion": "...", "vigencia": "..."
            },
            "resumen": "Resumen breve del documento en 1-2 líneas"
        }
        Incluye solo los campos relevantes al tipo. Responde SOLO JSON."""
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[document_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            ),
        )
        
        result = json.loads(response.text)
        
        # Map tipo to DB enum
        tipo_map = {
            "cotizacion": "cotizacion",
            "factura": "factura",
            "pliego": "pliego",
            "anexo_tecnico": "anexo_tecnico",
            "certificacion": "certificacion",
            "orden_compra": "orden_compra",
            "poliza": "poliza",
        }
        doc_type = tipo_map.get(result.get("tipo_documento", ""), "otro")
        
        # Guardar en DB
        conn = get_db()
        c = conn.cursor()
        c.execute("""
            INSERT INTO documents (filename, mime_type, doc_type, extracted_data, 
            classification_confidence, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            file.filename, mime_type, doc_type,
            json.dumps(result.get("datos_extraidos", {}), ensure_ascii=False),
            result.get("confianza", 0),
            user["user_id"]
        ))
        doc_id = c.lastrowid
        
        c.execute("""
            INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?)
        """, (user["user_id"], "Procesó documento con IA", "document", doc_id, 
              f"{file.filename} → {doc_type}"))
        
        conn.commit()
        conn.close()
        
        return {
            "id": doc_id,
            "filename": file.filename,
            "doc_type": doc_type,
            "confidence": result.get("confianza"),
            "extracted_data": result.get("datos_extraidos", {}),
            "summary": result.get("resumen", ""),
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando documento: {str(e)}")

@router.get("")
async def list_documents(request: Request):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        SELECT d.*, u.full_name as uploaded_by_name 
        FROM documents d 
        LEFT JOIN users u ON d.uploaded_by = u.id 
        ORDER BY d.created_at DESC
    """)
    docs = [dict(row) for row in c.fetchall()]
    conn.close()
    return {"documents": docs}

@router.get("/{doc_id}")
async def get_document(doc_id: int, request: Request):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    doc = c.fetchone()
    conn.close()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    result = dict(doc)
    if result.get("extracted_data"):
        try:
            result["extracted_data"] = json.loads(result["extracted_data"])
        except:
            pass
    return result

# Mantener endpoint legacy de extracción para compatibilidad
@router.post("/extract", response_model=InvoiceResponse)
async def extract_invoice(file: UploadFile = File(...)):
    try:
        content = await file.read()
        mime_type = file.content_type
        formatted_bytes, formatted_mime = format_document(content, mime_type)
        extractor = get_extractor()
        raw_dict = await extractor.process(formatted_bytes, formatted_mime)
        validated_data = InvoiceResponse(**raw_dict)
        return validated_data
    except ValidationError as ve:
        raise HTTPException(status_code=422, detail=f"Esquema inesperado: {str(ve)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export")
async def export_to_excel(invoice_data: InvoiceResponse):
    try:
        data_dict = invoice_data.model_dump()
        excel_io = generate_excel(data_dict)
        filename = f"factura_{data_dict.get('numero_factura', 'export')}.xlsx"
        return StreamingResponse(
            excel_io,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando Excel: {str(e)}")
