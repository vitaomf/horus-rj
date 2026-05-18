# ── Build do frontend ────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# ── Imagem final ─────────────────────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Dependências do sistema (necessárias para alguns pacotes Python)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Código do backend
COPY backend/ ./backend/
COPY scheduler/ ./scheduler/
COPY coleta_emendas.py coleta_contratos.py ./

# Frontend buildado
COPY --from=frontend-build /frontend/dist ./frontend/dist

# Arquivos públicos extras (GeoJSON, etc.)
COPY frontend/public/ ./frontend/public/ 2>/dev/null || true

# Porta padrão do Koyeb
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "backend.api:app", "--host", "0.0.0.0", "--port", "8000"]
