import base64
import json
from google import genai
from google.genai import types
from backend.core.config import GEMINI_API_KEY
from backend.extractor.base import BaseExtractor

class GeminiExtractor(BaseExtractor):
    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY no está configurada en .env")
        # Inicializar el cliente del SDK de Gemini
        self.client = genai.Client(api_key=GEMINI_API_KEY)

    async def process(self, file_bytes: bytes, mime_type: str) -> dict:
        # Generamos el formato correcto para Gemini basado en el mimetype y bytes
        # Nota: Gemini SDK usa types.Part.from_bytes
        
        document_part = types.Part.from_bytes(
            data=file_bytes,
            mime_type=mime_type
        )
        
        prompt = """
        Eres un asistente de contabilidad experto. Analiza la imagen de esta factura y extrae la información requerida.
        
        Tu respuesta debe ser ESTRICTAMENTE un JSON válido que represente el siguiente esquema:
        {
          "proveedor": "Nombre del proveedor (string)",
          "nit": "NIT o RUT del proveedor (string)",
          "numero_factura": "Número de la factura (string)",
          "fecha": "Fecha en formato YYYY-MM-DD (string)",
          "subtotal": Subtotal numérico (float),
          "impuestos": Impuestos numéricos (float),
          "total": Total cobrado numérico (float),
          "items": [
            {
              "descripcion": "Descripción del item (string)",
              "cantidad": Cantidad (float),
              "precio_unitario": Precio unitario (float),
              "total_item": Total del item (float)
            }
          ]
        }
        
        Reglas importantes:
        - Si no puedes encontrar un dato de forma segura, asigna null.
        - Para los valores numéricos (subtotal, impuestos, total, cantidad, precio_unitario, total_item) devuelve SÓLO el número, sin comas (ej. 1500.50 en vez de "1,500.50").
        - No incluyas explicaciones ni markdown envolviendo el JSON. La salida debe empezar con { y terminar con }
        """
        
        try:
            # Hacemos el llamado a Gemini. Se aconseja gemini-2.5-flash para esto
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[document_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1 # Baja temperatura para mayor determinismo
                ),
            )
            
            # response.text contendrá el String JSON
            json_str = response.text
            return json.loads(json_str)
            
        except Exception as e:
            raise Exception(f"Error procesando documento con Gemini: {str(e)}")
