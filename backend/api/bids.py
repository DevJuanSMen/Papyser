"""
Bids (Licitaciones) API Routes — CRUD + Análisis IA + Checklist.
"""
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from backend.database.db import get_db
from backend.core.auth_utils import get_current_user
from backend.extractor.factory import get_extractor
from backend.core.document_utils import format_document

router = APIRouter()

class BidCreate(BaseModel):
    title: str
    entity: Optional[str] = None
    object_description: Optional[str] = None
    budget: Optional[float] = None
    source_platform: Optional[str] = None
    close_date: Optional[str] = None
    observation_deadline: Optional[str] = None

class BidUpdate(BaseModel):
    title: Optional[str] = None
    entity: Optional[str] = None
    object_description: Optional[str] = None
    budget: Optional[float] = None
    close_date: Optional[str] = None
    status: Optional[str] = None
    risk_level: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None

class ChecklistItemCreate(BaseModel):
    document_name: str
    responsible_area: Optional[str] = None
    status: Optional[str] = "pendiente"
    due_date: Optional[str] = None

def _generate_code(cursor):
    year = datetime.now().year
    cursor.execute("SELECT COUNT(*) as c FROM bids WHERE code LIKE ?", (f"LIC-{year}-%",))
    count = cursor.fetchone()["c"] + 1
    return f"LIC-{year}-{count:03d}"

@router.get("")
async def list_bids(request: Request, status: Optional[str] = None):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    query = "SELECT * FROM bids"
    params = []
    if status:
        query += " WHERE status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC"
    
    c.execute(query, params)
    bids = [dict(row) for row in c.fetchall()]
    conn.close()
    return {"bids": bids}

@router.post("")
async def create_bid(data: BidCreate, request: Request):
    user = get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    code = _generate_code(c)
    
    c.execute("""
        INSERT INTO bids (code, title, entity, object_description, budget, 
        source_platform, close_date, observation_deadline, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (code, data.title, data.entity, data.object_description, data.budget,
          data.source_platform, data.close_date, data.observation_deadline, user["user_id"]))
    
    bid_id = c.lastrowid
    
    c.execute("""
        INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (user["user_id"], "Creó oportunidad de licitación", "bid", bid_id, f"{code} - {data.title}"))
    
    conn.commit()
    conn.close()
    return {"id": bid_id, "code": code, "message": "Licitación creada exitosamente"}

@router.get("/{bid_id}")
async def get_bid(bid_id: int, request: Request):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM bids WHERE id = ?", (bid_id,))
    bid = c.fetchone()
    if not bid:
        conn.close()
        raise HTTPException(status_code=404, detail="Licitación no encontrada")
    
    c.execute("SELECT * FROM bid_checklist WHERE bid_id = ? ORDER BY id", (bid_id,))
    checklist = [dict(row) for row in c.fetchall()]
    
    c.execute("SELECT * FROM documents WHERE related_bid_id = ? ORDER BY created_at DESC", (bid_id,))
    documents = [dict(row) for row in c.fetchall()]
    
    conn.close()
    return {"bid": dict(bid), "checklist": checklist, "documents": documents}

@router.put("/{bid_id}")
async def update_bid(bid_id: int, data: BidUpdate, request: Request):
    user = get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    updates = []
    params = []
    for field, value in data.model_dump(exclude_none=True).items():
        updates.append(f"{field} = ?")
        params.append(value)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(bid_id)
    
    c.execute(f"UPDATE bids SET {', '.join(updates)} WHERE id = ?", params)
    
    c.execute("""
        INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
        VALUES (?, ?, ?, ?, ?)
    """, (user["user_id"], "Actualizó licitación", "bid", bid_id, 
          f"Campos: {', '.join(data.model_dump(exclude_none=True).keys())}"))
    
    conn.commit()
    conn.close()
    return {"message": "Licitación actualizada"}

@router.post("/{bid_id}/analyze")
async def analyze_bid(bid_id: int, request: Request, file: UploadFile = File(...)):
    """Analiza un pliego con IA y extrae información clave."""
    user = get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    
    c.execute("SELECT * FROM bids WHERE id = ?", (bid_id,))
    bid = c.fetchone()
    if not bid:
        conn.close()
        raise HTTPException(status_code=404, detail="Licitación no encontrada")
    
    try:
        content = await file.read()
        mime_type = file.content_type
        formatted_bytes, formatted_mime = format_document(content, mime_type)
        
        extractor = get_extractor()
        
        # Usar prompt especial para análisis de pliegos
        from google.genai import types
        from backend.core.config import GEMINI_API_KEY
        from google import genai
        
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        document_part = types.Part.from_bytes(data=formatted_bytes, mime_type=formatted_mime)
        
        prompt = """Analiza este pliego o documento de licitación y extrae la información en JSON:
        {
            "entidad": "Nombre de la entidad contratante",
            "objeto": "Objeto del contrato (resumen breve)",
            "presupuesto": número o null,
            "fecha_cierre": "YYYY-MM-DD o null",
            "fecha_observaciones": "YYYY-MM-DD o null",
            "resumen_ejecutivo": "Resumen de 3-5 líneas del proceso",
            "requisitos_habilitantes": ["req1", "req2", ...],
            "documentos_obligatorios": [
                {"nombre": "Nombre del documento", "area_responsable": "Área sugerida"}
            ],
            "riesgos": ["riesgo1", "riesgo2", ...],
            "experiencia_requerida": "Descripción de la experiencia solicitada",
            "condiciones_especiales": ["condición1", ...],
            "viabilidad_score": número del 0 al 100 estimando probabilidad de éxito para una empresa de suministros de papelería
        }
        Responde SOLO con el JSON, sin markdown ni explicaciones."""
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[document_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            ),
        )
        
        analysis = json.loads(response.text)
        
        # Actualizar licitación con resultados
        c.execute("""
            UPDATE bids SET 
                entity = COALESCE(?, entity),
                object_description = COALESCE(?, object_description),
                budget = COALESCE(?, budget),
                close_date = COALESCE(?, close_date),
                ai_summary = ?,
                ai_risks = ?,
                requirements = ?,
                required_documents = ?,
                viability_score = ?,
                status = CASE WHEN status = 'detectada' THEN 'analisis' ELSE status END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (
            analysis.get("entidad"),
            analysis.get("objeto"),
            analysis.get("presupuesto"),
            analysis.get("fecha_cierre"),
            analysis.get("resumen_ejecutivo"),
            json.dumps(analysis.get("riesgos", []), ensure_ascii=False),
            json.dumps(analysis.get("requisitos_habilitantes", []), ensure_ascii=False),
            json.dumps(analysis.get("documentos_obligatorios", []), ensure_ascii=False),
            analysis.get("viabilidad_score"),
            bid_id
        ))
        
        # Crear checklist automáticamente
        docs = analysis.get("documentos_obligatorios", [])
        for doc in docs:
            name = doc.get("nombre", doc) if isinstance(doc, dict) else doc
            area = doc.get("area_responsable", "") if isinstance(doc, dict) else ""
            c.execute("""
                INSERT INTO bid_checklist (bid_id, document_name, responsible_area, status)
                VALUES (?, ?, ?, 'pendiente')
            """, (bid_id, name, area))
        
        # Guardar documento
        c.execute("""
            INSERT INTO documents (filename, mime_type, doc_type, extracted_data, 
            classification_confidence, uploaded_by, related_bid_id)
            VALUES (?, ?, 'pliego', ?, 0.95, ?, ?)
        """, (file.filename, mime_type, json.dumps(analysis, ensure_ascii=False), 
              user["user_id"], bid_id))
        
        c.execute("""
            INSERT INTO activity_log (user_id, action, entity_type, entity_id, details)
            VALUES (?, ?, ?, ?, ?)
        """, (user["user_id"], "Analizó pliego con IA", "bid", bid_id, file.filename))
        
        conn.commit()
        conn.close()
        
        return {"analysis": analysis, "checklist_items_created": len(docs)}
        
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error en análisis IA: {str(e)}")

@router.get("/{bid_id}/checklist")
async def get_checklist(bid_id: int, request: Request):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM bid_checklist WHERE bid_id = ? ORDER BY id", (bid_id,))
    items = [dict(row) for row in c.fetchall()]
    conn.close()
    return {"checklist": items}

@router.post("/{bid_id}/checklist")
async def add_checklist_item(bid_id: int, data: ChecklistItemCreate, request: Request):
    user = get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        INSERT INTO bid_checklist (bid_id, document_name, responsible_area, status, due_date)
        VALUES (?, ?, ?, ?, ?)
    """, (bid_id, data.document_name, data.responsible_area, data.status, data.due_date))
    conn.commit()
    conn.close()
    return {"message": "Item agregado al checklist"}

@router.put("/{bid_id}/checklist/{item_id}")
async def update_checklist_item(bid_id: int, item_id: int, request: Request, status: str = "tiene"):
    get_current_user(request)
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE bid_checklist SET status = ? WHERE id = ? AND bid_id = ?", (status, item_id, bid_id))
    conn.commit()
    conn.close()
    return {"message": "Checklist actualizado"}
