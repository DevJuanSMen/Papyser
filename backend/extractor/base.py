from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseExtractor(ABC):
    """Interfaz estándar para todos los motores de extracción de facturas."""
    
    @abstractmethod
    async def process(self, file_bytes: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Analiza el documento y retorna un diccionario con la estructura 
        establecida en InvoiceResponse.
        """
        pass
