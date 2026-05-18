"""
coleta_nacional.py
Roda coleta_emendas.py para todas as 27 UFs em sequência.
Idempotente — pula UFs que já têm cache. Use --force para refazer.

Estimativa: ~10-30 min por UF (depende do volume e velocidade da API).
Total: pode levar várias horas. Roda em background sem problema.

Uso:
    python scripts/coleta_nacional.py
    python scripts/coleta_nacional.py --force     # refaz tudo
    python scripts/coleta_nacional.py --uf RJ SP  # só essas UFs
    python scripts/coleta_nacional.py --skip RJ   # pula RJ (já tem)
"""
import subprocess
import sys
import os
import time
import sqlite3
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLETA_SCRIPT = os.path.join(PROJECT_ROOT, "coleta_emendas.py")
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")

UFS_BRASIL = [
    'AC','AL','AP','AM','BA','CE','DF','ES','GO',
    'MA','MT','MS','MG','PA','PB','PR','PE','PI',
    'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

def contar_emendas(uf: str) -> int:
    try:
        db = sqlite3.connect(DB_PATH)
        cur = db.cursor()
        cur.execute("SELECT COUNT(*) FROM emendas WHERE uf = ?", (uf,))
        n = cur.fetchone()[0]
        db.close()
        return n
    except Exception:
        return 0

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--force",  action="store_true", help="Força recoleta mesmo com cache")
    parser.add_argument("--uf",     nargs="+",           help="Coleta só estas UFs (ex: --uf SP MG)")
    parser.add_argument("--skip",   nargs="+",           help="Pula estas UFs (ex: --skip RJ)")
    args = parser.parse_args()

    ufs = [u.upper() for u in (args.uf or UFS_BRASIL)]
    skip = set(u.upper() for u in (args.skip or []))
    ufs = [u for u in ufs if u not in skip]

    print(f"{'='*60}")
    print(f"COLETA NACIONAL DE EMENDAS — HORUS")
    print(f"Início: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"UFs a coletar: {len(ufs)} — {', '.join(ufs)}")
    print(f"Modo force: {args.force}")
    print(f"{'='*60}\n")

    resultados = {}

    for i, uf in enumerate(ufs, 1):
        antes = contar_emendas(uf)
        print(f"\n[{i:02d}/{len(ufs)}] {uf} — {antes:,} emendas existentes")

        cmd = [sys.executable, COLETA_SCRIPT, "--uf", uf]
        if args.force:
            cmd.append("--force-refresh")

        t0 = time.time()
        try:
            result = subprocess.run(
                cmd,
                cwd=PROJECT_ROOT,
                capture_output=False,   # deixa stdout aparecer em tempo real
                timeout=7200,           # 2h por UF
            )
            duracao = time.time() - t0
            depois = contar_emendas(uf)
            novas = depois - antes
            resultados[uf] = {"ok": result.returncode == 0, "novas": novas, "duracao": duracao}
            status = "OK" if result.returncode == 0 else f"ERRO (exit {result.returncode})"
            print(f"\n  [{uf}] {status} | +{novas:,} emendas | {duracao:.0f}s")

        except subprocess.TimeoutExpired:
            duracao = time.time() - t0
            resultados[uf] = {"ok": False, "novas": 0, "duracao": duracao}
            print(f"\n  [{uf}] TIMEOUT após {duracao:.0f}s")

        # Pausa entre estados para não sobrecarregar a API
        if i < len(ufs):
            print(f"  Aguardando 10s antes da próxima UF...")
            time.sleep(10)

    # Resumo final
    print(f"\n{'='*60}")
    print(f"RESUMO FINAL — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    total_novas = 0
    for uf, r in resultados.items():
        status = "OK" if r["ok"] else "FALHOU"
        print(f"  {uf}: {status} | +{r['novas']:,} emendas | {r['duracao']:.0f}s")
        total_novas += r["novas"]

    print(f"\nTotal de novas emendas inseridas: {total_novas:,}")

    # Contagem total do banco
    try:
        db = sqlite3.connect(DB_PATH)
        cur = db.cursor()
        cur.execute("SELECT COUNT(*) FROM emendas")
        total = cur.fetchone()[0]
        cur.execute("SELECT uf, COUNT(*) FROM emendas GROUP BY uf ORDER BY 2 DESC LIMIT 10")
        print(f"Total no banco: {total:,}")
        print("Top UFs:")
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]:,}")
        db.close()
    except Exception as e:
        print(f"Erro lendo banco final: {e}")

if __name__ == "__main__":
    main()
