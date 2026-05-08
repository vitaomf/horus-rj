#!/usr/bin/env python3
"""
enrich_fotos.py — Enriquece a tabela `politicos` com fotos oficiais da
API pública da Câmara dos Deputados.

Uso:
    python scripts/enrich_fotos.py

Funciona em modo idempotente: só busca quem ainda não tem foto.
Pode rodar quantas vezes quiser. Falhas silenciosas (alguns políticos não
estão na Câmara — senadores, ex-parlamentares, autores coletivos).
"""
import sqlite3
import sys
import os
import time
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERRO: pip install requests")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).parent.parent
DB_PATH = PROJECT_ROOT / "transparencia_rj.db"
API_CAMARA = "https://dadosabertos.camara.leg.br/api/v2/deputados"

# ─── Conexão ──────────────────────────────────────────────────────────────────
conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()

# Migração: adiciona coluna foto_url se não existir
try:
    cur.execute("ALTER TABLE politicos ADD COLUMN foto_url TEXT DEFAULT NULL")
    print("[OK] Coluna foto_url adicionada.")
except sqlite3.OperationalError:
    pass  # já existe

# ─── Busca políticos sem foto ─────────────────────────────────────────────────
cur.execute("""
    SELECT id, nome, cargo
    FROM politicos
    WHERE (foto_url IS NULL OR foto_url = '')
      AND COALESCE(cargo,'') != 'Autor Coletivo'
    ORDER BY nome
""")
faltam = cur.fetchall()
print(f"Politicos sem foto: {len(faltam)}")

if not faltam:
    print("Tudo enriquecido. Saindo.")
    conn.close()
    sys.exit(0)

# ─── Loop ──────────────────────────────────────────────────────────────────────
ok, miss = 0, 0
for i, (pid, nome, cargo) in enumerate(faltam, 1):
    if i % 10 == 0:
        print(f"  [{i}/{len(faltam)}] processados | {ok} fotos | {miss} sem registro")
        conn.commit()

    try:
        resp = requests.get(API_CAMARA, params={"nome": nome, "itens": 5}, timeout=10)
        if not resp.ok:
            miss += 1
            continue

        dados = resp.json().get("dados", [])
        if not dados:
            miss += 1
            continue

        # Match por primeiro nome ou nome similar
        primeiro = nome.split()[0].upper()
        match = next(
            (d for d in dados if primeiro in (d.get("nome") or "").upper()),
            dados[0]  # fallback: primeiro resultado
        )
        cam_id = match.get("id")
        if not cam_id:
            miss += 1
            continue

        foto_url = f"https://www.camara.leg.br/internet/deputado/bandep/{cam_id}.jpg"
        cur.execute("UPDATE politicos SET foto_url = ? WHERE id = ?", (foto_url, pid))
        ok += 1

    except Exception as e:
        print(f"    ! erro em {nome}: {e}")
        miss += 1

    time.sleep(0.15)  # respeita rate limit da API

conn.commit()
conn.close()
print(f"\nConcluido: {ok} fotos enriquecidas, {miss} sem registro na Camara.")
