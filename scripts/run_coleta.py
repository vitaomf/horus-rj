#!/usr/bin/env python3
"""
Continua o full_update a partir da coleta (migracao ja foi feita).
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
    PY = sys.executable

def run(label, *args, timeout=7200):
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

# ─── Coleta de emendas ─────────────────────────────────────────────────────────
print("[INFO] Cache limpo e schema migrado. Iniciando coleta...")
run("EMENDAS", "coleta_emendas.py")

# ─── Coleta de contratos ───────────────────────────────────────────────────────
run("CONTRATOS", "coleta_contratos.py")

# ─── Enriquecimento de fotos ──────────────────────────────────────────────────
run("FOTOS", "scripts/enrich_fotos.py")

# ─── Validacao final ──────────────────────────────────────────────────────────
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
total_val = total_emp = total_pago = 0
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

# ─── Push para Turso ─────────────────────────────────────────────────────────
print()
run("TURSO", "push_to_turso.py")

print("\n" + "="*60)
print("[CONCLUIDO] Banco local e Turso sincronizados com sucesso!")
print("="*60)
