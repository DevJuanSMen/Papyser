from pdf2image import convert_from_bytes
import io

def format_document(file_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
    """
    Convierte el archivo a un formato óptimo para el modelo de visión.
    Si es PDF, extrae la primera página como imagen JPEG.
    Si ya es imagen, la devuelve intacta.
    Retorna la tupla (bytes_imagen, nuevo_mime_type)
    """
    if mime_type == "application/pdf":
        try:
            # Convierte la primera página a imagen
            images = convert_from_bytes(file_bytes, first_page=1, last_page=1)
            if not images:
                raise Exception("El PDF subido parece estar vacío o corrupto.")
            
            img = images[0]
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG')
            
            return img_byte_arr.getvalue(), "image/jpeg"
        except Exception as e:
            # Nota: si falla aquí, puede ser por falta de Poppler instalado en Windows.
            raise Exception(f"No se pudo convertir el PDF. ¿Poppler está instalado?: {str(e)}")
            
    # Si ya es jpeg o png, retorna igual
    if mime_type in ["image/jpeg", "image/png", "image/webp"]:
        return file_bytes, mime_type
        
    raise Exception(f"Formato no soportado: {mime_type}")
