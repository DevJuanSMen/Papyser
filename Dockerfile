FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema para pdf2image
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias Python
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el proyecto
COPY . .

# Crear directorio de datos
RUN mkdir -p /app/data

# Ejecutar seed para inicializar DB
RUN python seed.py

# Exponer puerto
EXPOSE 8000

# Comando de inicio
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
