from backend.core.config import ACTIVE_EXTRACTOR
from backend.extractor.base import BaseExtractor
from backend.extractor.engine_gemini import GeminiExtractor

def get_extractor() -> BaseExtractor:
    """
    Factory que retorna el extractor configurado en las variables de entorno.
    Si quisieras añadir OpenAI u Ollama en el futuro, solo los agregas acá.
    """
    if ACTIVE_EXTRACTOR == "GEMINI":
        return GeminiExtractor()
    else:
        # Por defecto siempre Gemini por ahora
        return GeminiExtractor()
