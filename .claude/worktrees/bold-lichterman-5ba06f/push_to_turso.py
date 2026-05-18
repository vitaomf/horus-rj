#!/usr/bin/env python3
"""
push_to_turso.py — Sincroniza o banco SQLite local com o Turso na nuvem.

Roda no Windows usando só requests + sqlite3 (sem libsql-experimental).
Execute depois de cada coleta para atualizar os dados na nuvem.

Uso:
    python push_to_turso.py

Requer no .env:
    TURSO_DATABASE_URL=libsql://horus-rj-<org>.turso.io
    TURSO_AUTH_TOKEN=eyJ...
"""
import sqlite3
import sys
import os

try:
    import requests
except ImportError:
    print("ERRO: instale requests:  pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # ok rodar sem python-dotenv se as vars já estão no ambiente

# ── Credenciais ─────────────────────────────────────────────────────────────
TURSO_URL   = os.getenv("TURSO_DATABASE_URL", "").replace("libsql://", "https://")
TURSO_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")
DB_PATH     = os.getenv("DB_PATH", "transparencia_rj.db")

if not TURSO_URL or TURSO_URL == "https://":
    print("ERRO: TURSO_DATABASE_URL não definido no .env")
    sys.exit(1)
if not TURSO_TOKEN:
    print("ERRO: TURSO_AUTH_TOKEN não definido no .env")
    sys.exit(1)

# ── Helpers HTTP ─────────────────────────────────────────────────────────────
HEADERS = {
    "Authorization": f"Bearer {TURSO_TOKEN}",
    "Content-Type": "application/json",
}

def _arg(v):
    """Converte valor Python para o formato de argumento do Turso HTTP API."""
    if v is None:
        return {"type": "null"}
    if isinstance(v, bool):
        return {"type": "integer", "value": "1" if v else "0"}
    if isinstance(v, int):
        return {"type": "integer", "value": str(v)}
    if isinstance(v, float):
        return {"type": "real", "value": str(v)}
    return {"type": "text", "value": str(v)}


def turso_pipeline(reqs: list) -> dict:
    """Envia um batch de requests ao endpoint /v2/pipeline do Turso."""
    resp = requests.post(
        f"{TURSO_URL}/v2/pipeline",
        headers=HEADERS,
        json={"requests": reqs},
        timeout=60,
    )
    if not resp.ok:
        print(f"  ✗ HTTP {resp.status_code}: {resp.text[:300]}")
        resp.raise_for_status()
    return resp.json()


def turso_exec(sql: str, args: list | None = None):
    stmt = {"sql": sql}
    if args is not None:
        stmt["args"] = [_arg(v) for v in args]
    turso_pipeline([{"type": "execute", "stmt": stmt}, {"type": "close"}])


# ── Ordem de inserção (respeita FK) ─────────────────────────────────────────
TABLE_ORDER = [
    "politicos",
    "emendas",
    "contratos",
    "municipios",
    "empresas",
    "campanhas",
    "doadores",
    "empresa_politico",
    "problemas",
]

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    if not os.path.exists(DB_PATH):
        print(f"ERRO: banco '{DB_PATH}' não encontrado. Rode coleta_emendas.py primeiro.")
        sys.exit(1)

    src = sqlite3.connect(DB_PATH)
    src.row_factory = sqlite3.Row

    # Tabelas presentes localmente
    local_tables = {
        r[0]
        for r in src.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()
    }

    print(f"Conectado ao Turso: {TURSO_URL}")
    print(f"Banco local: {DB_PATH}\n")

    for table in TABLE_ORDER:
        if table not in local_tables:
            print(f"  skip {table} (não existe localmente)")
            continue

        ddl = src.execute(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table,)
        ).fetchone()["sql"]

        # Garante CREATE TABLE IF NOT EXISTS
        if "IF NOT EXISTS" not in ddl.upper():
            ddl = ddl.replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS", 1)

        rows = src.execute(f"SELECT * FROM {table}").fetchall()
        n = len(rows)
        print(f"  {table}: {n} linhas...", end=" ", flush=True)

        # 1. Cria tabela
        turso_exec(ddl)

        # 2. Limpa dados existentes
        turso_exec(f"DELETE FROM {table}")

        if n == 0:
            print("ok (vazia)")
            continue

        # 3. Insere em batches de 80 rows
        n_cols = len(rows[0])
        placeholders = ",".join(["?" for _ in range(n_cols)])
        insert_sql = f"INSERT OR IGNORE INTO {table} VALUES ({placeholders})"

        BATCH = 80
        for i in range(0, n, BATCH):
            batch = rows[i : i + BATCH]
            reqs = [
                {
                    "type": "execute",
                    "stmt": {"sql": insert_sql, "args": [_arg(v) for v in list(row)]},
                }
                for row in batch
            ]
            reqs.append({"type": "close"})
            turso_pipeline(reqs)

        print("ok")

    src.close()
    print("\n✓ Sincronização concluída!")
    print("  Os dados do Turso agora refletem o banco local.")


if __name__ == "__main__":
    main()
