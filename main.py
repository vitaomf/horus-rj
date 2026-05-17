"""
Entrypoint mínimo para satisfazer a detecção FastAPI do Vercel.
Todo o tráfego real é roteado via rewrites no vercel.json para o ngrok.
"""
from fastapi import FastAPI

app = FastAPI(title="HORUS RJ")


@app.get("/api/status")
def status():
    return {"status": "proxy", "note": "traffic routed via vercel.json rewrites"}
