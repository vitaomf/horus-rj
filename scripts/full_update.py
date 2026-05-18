#!/usr/bin/env python3
"""
full_update.py — Atualiza todos os dados do HORUS RJ do zero.

Sequência:
  1. Migra schema (renomeia status -> codigo_emenda, sincroniza valor_empenhado)
  2. Limpa cache dos anos recentes (2023, 2024, 2025) para re-coletar da API
  3. Roda coleta_emendas.py (todos os anos com cache inteligente)
  4. Roda coleta_contratos.py (cria tabela + popula ano corrente)
  5. Roda enrich_fotos.py (foto de cada político sem foto)
  6. Validação final: imprime contagens e totais
  7. Push para o Turso

Uso:
    python scripts/full_update.py
"""
import sqlite3
import subprocess
import sys
import os
import time
from pathlib import Path

ROOT = Path(__file__).parent.parent
DB   = ROOT / "transparencia_rj.db"
PY   = ROOT / ".venv" / "Scripts" / "python.exe"
if not PY.exists():
    PY = sys.executable  # fallback para python do sistema

def run(label, *args, timeout=3600):
    print(f"\n{'='*60}")
    print(f"[{label}] Iniciando...")
    print(f"{'='*60}")
    r = subprocess.run(
        [str(PY), *args],
        cwd=str(ROOT),
        timeout=timeout,
    )
    if r.returncode != 0:
        print(f"[{label}] FALHOU (exit {r.returncode})")
        sys.exit(r.returncode)
    print(f"[{label}] OK")

# ─── 1. Migração de schema ────────────────────────────────────────────────────
print("\n" + "="*60)
print("[MIGRACAO] Ajustando schema do banco...")
print("="*60)

conn = sqlite3.connect(str(DB))
cur  = conn.cursor()

# 1a. Renomear coluna status -> codigo_emenda (SQLite 3.25+)
cols = [c[1] for c in cur.execute("PRAGMA table_info(emendas)").fetchall()]
if "status" in cols and "codigo_emenda" not in cols:
    print("  Renomeando coluna status -> codigo_emenda...")
    cur.execute("ALTER TABLE emendas RENAME COLUMN status TO codigo_emenda")
    conn.commit()
    print("  OK")
elif "codigo_emenda" in cols:
    print("  codigo_emenda ja existe. Pulando.")
else:
    print("  AVISO: nem 'status' nem 'codigo_emenda' encontrado. Verificar.")

# 1b. Adicionar colunas se faltarem
for col, typ, default in [
    ("valor_empenhado", "REAL", "0"),
    ("valor_pago",      "REAL", "0"),
    ("foto_url",        "TEXT", "NULL"),
]:
    if col not in cols:
        try:
            cur.execute(f"ALTER TABLE emendas ADD COLUMN {col} {typ} DEFAULT {default}")
            conn.commit()
            print(f"  Coluna {col} adicionada.")
        except sqlite3.OperationalError:
            pass

# Refresh cols list
cols = [c[1] for c in cur.execute("PRAGMA table_info(emendas)").fetchall()]

# 1c. Sincronizar valor_empenhado a partir de valor onde ainda é 0
if "valor_empenhado" in cols:
    n = cur.execute(
        "UPDATE emendas SET valor_empenhado = valor WHERE (valor_empenhado IS NULL OR valor_empenhado = 0) AND valor > 0"
    ).rowcount
    conn.commit()
    print(f"  valor_empenhado sincronizado em {n} emendas a partir do campo valor.")

# 1d. foto_url nos politicos (garantir que existe)
p_cols = [c[1] for c in cur.execute("PRAGMA table_info(politicos)").fetchall()]
if "foto_url" not in p_cols:
    cur.execute("ALTER TABLE politicos ADD COLUMN foto_url TEXT DEFAULT NULL")
    conn.commit()
    print("  Coluna foto_url adicionada a politicos.")

conn.close()
print("[MIGRACAO] Concluida.")

# ─── 2. Limpa cache dos anos recentes para forçar re-coleta fresca ────────────
print("\n" + "="*60)
print("[CACHE] Limpando anos recentes (2023, 2024, 2025)...")
print("="*60)
cache_dir = ROOT / "cache" / "emendas"
for ano in [2023, 2024, 2025]:
    f = cache_dir / f"emendas_{ano}.json"
    if f.exists():
        f.unlink()
        print(f"  Removido: {f.name}")
    else:
        print(f"  Nao encontrado (ok): {f.name}")

# ─── 3. Coleta de emendas ─────────────────────────────────────────────────────
run("EMENDAS", "coleta_emendas.py")

# ─── 4. Coleta de contratos ───────────────────────────────────────────────────
run("CONTRATOS", "coleta_contratos.py")

# ─── 5. Enriquecimento de fotos ───────────────────────────────────────────────
run("FOTOS", "scripts/enrich_fotos.py")

# ─── 6. Validacao final ───────────────────────────────────────────────────────
print("\n" + "="*60)
print("[VALIDACAO] Estado final do banco:")
print("="*60)

conn = sqlite3.connect(str(DB))
cur  = conn.cursor()

for table in ["politicos", "emendas", "contratos", "campanhas", "doadores"]:
    try:
        n = cur.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {n} registros")
    except Exception as e:
        print(f"  {table}: ERRO - {e}")

print()
rows = cur.execute(
    "SELECT ano, COUNT(*), SUM(valor), SUM(valor_empenhado), SUM(valor_pago) FROM emendas GROUP BY ano ORDER BY ano"
).fetchall()
total_val = 0
total_emp = 0
total_pago = 0
for r in rows:
    v  = r[2] or 0
    ve = r[3] or 0
    vp = r[4] or 0
    total_val  += v
    total_emp  += ve
    total_pago += vp
    print(f"  {r[0]}: {r[1]} emendas | valor R${v:>15,.0f} | empenhado R${ve:>15,.0f} | pago R${vp:>12,.0f}")

print(f"\n  TOTAL: valor R${total_val:,.0f} | empenhado R${total_emp:,.0f} | pago R${total_pago:,.0f}")

try:
    c_row = cur.execute("SELECT COUNT(*), SUM(valor) FROM contratos").fetchone()
    print(f"\n  contratos: {c_row[0]} | total R${(c_row[1] or 0):,.0f}")
except Exception as e:
    print(f"\n  contratos: ERRO - {e}")

try:
    sf = cur.execute("SELECT COUNT(*) FROM politicos WHERE foto_url IS NULL AND cargo != 'Autor Coletivo'").fetchone()[0]
    cf = cur.execute("SELECT COUNT(*) FROM politicos WHERE foto_url IS NOT NULL").fetchone()[0]
    print(f"\n  fotos: {cf} com foto | {sf} sem foto")
except Exception as e:
    print(f"\n  fotos: {e}")

conn.close()

# ─── 7. Push para o Turso ────────────────────────────────────────────────────
print()
run("TURSO", "push_to_turso.py")

print("\n" + "="*60)
print("ATUALIZACAO COMPLETA! Banco local e Turso sincronizados.")
print("="*60)
