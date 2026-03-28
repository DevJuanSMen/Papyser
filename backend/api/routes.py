from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from backend.api.schemas import InvoiceResponse
from backend.extractor.factory import get_extractor
from backend.core.excel_maker import generate_excel
from backend.core.document_utils import format_document
from pydantic import ValidationError

router = APIRouter()

@router.post("/extract", response_model=InvoiceResponse)
async def extract_invoice(file: UploadFile = File(...)):
    """
    Recibe un documento (Imagen o PDF), lo procesa con la IA, 
    y retorna la estructura JSON extraída.
    """
    try:
        content = await file.read()
        mime_type = file.content_type
        
        # 1. Normalizar documento a imagen (Ej. PDF -> JPG)
        formatted_bytes, formatted_mime = format_document(content, mime_type)
        
        # 2. Instanciar Motor IA
        extractor = get_extractor()
        
        # 3. Procesar y obtener diccionario crudo del LLM
        raw_dict = await extractor.process(formatted_bytes, formatted_mime)
        
        # 4. Pydantic validación / casteo automático de tipos
        # Validará que 'total' sea float y no string. Ignorará campos extras o basura.
        validated_data = InvoiceResponse(**raw_dict)
        
        return validated_data
        
    except ValidationError as ve:
        raise HTTPException(status_code=422, detail=f"La IA devolvió un esquema inesperado o incompleto. Error: {str(ve)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def export_to_excel(invoice_data: InvoiceResponse):
    """
    Recibe el JSON (ya confirmado por el usuario en el frontend), 
    y retorna el archivo .xlsx para descargar.
    """
    try:
        # Pydantic a dict
        data_dict = invoice_data.model_dump()
        
        # Generar excel stream
        excel_io = generate_excel(data_dict)
        
        filename = f"factura_{data_dict.get('numero_factura', 'export')}.xlsx"
        
        return StreamingResponse(
            excel_io,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando Excel: {str(e)}")
