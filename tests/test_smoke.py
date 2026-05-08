"""
Smoke tests para a API Horus RJ.
Roda contra o banco real (transparencia_rj.db) — não cria fixtures.
Executa com: pytest tests/test_smoke.py -v

Pré-requisito: banco populado (rodar coleta_emendas.py pelo menos uma vez).
"""
import pytest
from fastapi.testclient import TestClient

# Garante que o import funcione tanto de dentro de /tests quanto da raiz
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api import app

client = TestClient(app)


# ------------------------------------------------------------------
# Health
# ------------------------------------------------------------------

def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["db"] == "ok"


# ------------------------------------------------------------------
# Totais — devem retornar número > 0 se o banco estiver populado
# ------------------------------------------------------------------

def test_total_emendas():
    r = client.get("/api/emendas/total")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data or isinstance(data, (int, float))


def test_total_politicos():
    r = client.get("/api/politicos/total")
    assert r.status_code == 200


# ------------------------------------------------------------------
# Listagens básicas
# ------------------------------------------------------------------

def test_municipios_lista():
    r = client.get("/api/municipios")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert len(body) > 0, "Banco sem municípios — rode coleta_emendas.py"


def test_politicos_lista():
    r = client.get("/api/politicos")
    assert r.status_code == 200
    body = r.json()
    # Endpoint paginado: {"politicos": [...], "total": N, "pagina": 1, "total_paginas": N}
    assert "politicos" in body
    assert isinstance(body["politicos"], list)
    assert body["total"] > 0, "Banco sem políticos — rode coleta_emendas.py"


def test_heatmap():
    r = client.get("/api/municipios/heatmap")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    # Cada item deve ter nome e valor_total
    if body:
        assert "nome" in body[0]
        assert "valor_total" in body[0]


def test_estatisticas():
    r = client.get("/api/estatisticas")
    assert r.status_code == 200
    body = r.json()
    assert "valor_total_geral" in body
    assert "top_politicos" in body


# ------------------------------------------------------------------
# Busca textual
# ------------------------------------------------------------------

def test_busca_emendas_retorna_lista():
    r = client.get("/api/emendas/busca", params={"q": "saude"})
    assert r.status_code == 200
    body = r.json()
    # Endpoint paginado: {"resultados": [...], "pagina": 1, "paginas": N, "limite": N}
    assert "resultados" in body
    assert isinstance(body["resultados"], list)


def test_busca_politicos_retorna_lista():
    r = client.get("/api/politicos/busca", params={"q": "silva"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ------------------------------------------------------------------
# Detalhe de político — pega o primeiro da lista e consulta
# ------------------------------------------------------------------

def test_detalhe_politico():
    resp = client.get("/api/politicos").json()
    politicos = resp.get("politicos", resp) if isinstance(resp, dict) else resp
    if not politicos:
        pytest.skip("Banco sem políticos")
    politico_id = politicos[0]["id"]
    r = client.get(f"/api/politicos/{politico_id}")
    assert r.status_code == 200
    body = r.json()
    assert "nome" in body
    assert "ultimas_emendas" in body
    assert isinstance(body["ultimas_emendas"], list)


# ------------------------------------------------------------------
# Detalhe de município — pega o primeiro da lista e consulta
# ------------------------------------------------------------------

def test_detalhe_municipio():
    lista = client.get("/api/municipios").json()
    if not lista:
        pytest.skip("Banco sem municípios")
    nome = lista[0]["nome"] if isinstance(lista[0], dict) else lista[0]
    r = client.get(f"/api/municipios/{nome}/detalhes")
    assert r.status_code in (200, 404)  # 404 ok se município sem emenda


# ------------------------------------------------------------------
# 404 esperado
# ------------------------------------------------------------------

def test_politico_inexistente_retorna_404():
    r = client.get("/api/politicos/999999999")
    assert r.status_code == 404
