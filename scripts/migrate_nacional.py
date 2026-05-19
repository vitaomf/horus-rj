"""
migrate_nacional.py
Adiciona colunas uf, casa, id_camara em politicos e uf em emendas.
Idempotente — pode rodar mais de uma vez sem problema.
"""
import sqlite3, re, sys, os

DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "transparencia_rj.db")

def coluna_existe(cur, tabela, coluna):
    cur.execute(f"PRAGMA table_info({tabela})")
    return any(r[1] == coluna for r in cur.fetchall())

def extrair_uf(municipio_destino: str) -> str:
    """Extrai UF de strings como 'NITERÓI - RJ' ou 'RIO DE JANEIRO (UF)'."""
    if not municipio_destino:
        return ""
    s = municipio_destino.upper().strip()
    # Padrão "CIDADE - UF"
    m = re.search(r'\s-\s([A-Z]{2})$', s)
    if m:
        return m.group(1)
    # Padrão "CIDADE (UF)"
    m = re.search(r'\(([A-Z]{2})\)$', s)
    if m:
        return m.group(1)
    # Bare "UF"
    if re.match(r'^[A-Z]{2}$', s):
        return s
    return ""

def main():
    print(f"Banco: {DB}")
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    # ── Tabela emendas ──────────────────────────────────────────────────────
    if not coluna_existe(cur, "emendas", "uf"):
        print("ADD COLUMN emendas.uf ...")
        cur.execute("ALTER TABLE emendas ADD COLUMN uf TEXT")
        print("Preenchendo uf a partir de municipio_destino ...")
        cur.execute("SELECT id, municipio_destino FROM emendas WHERE uf IS NULL OR uf = ''")
        rows = cur.fetchall()
        updated = 0
        for row_id, dest in rows:
            uf = extrair_uf(dest or "")
            if uf:
                cur.execute("UPDATE emendas SET uf = ? WHERE id = ?", (uf, row_id))
                updated += 1
        print(f"  Emendas atualizadas: {updated} / {len(rows)}")
    else:
        print("emendas.uf já existe — verificando dados vazios ...")
        cur.execute("SELECT COUNT(*) FROM emendas WHERE uf IS NULL OR uf = ''")
        sem_uf = cur.fetchone()[0]
        if sem_uf:
            cur.execute("SELECT id, municipio_destino FROM emendas WHERE uf IS NULL OR uf = ''")
            for row_id, dest in cur.fetchall():
                uf = extrair_uf(dest or "")
                if uf:
                    cur.execute("UPDATE emendas SET uf = ? WHERE id = ?", (uf, row_id))
            print(f"  Preenchidos {sem_uf} registros sem uf")
        else:
            print("  Todos os registros já têm uf")

    # ── Tabela politicos ────────────────────────────────────────────────────
    for col, tipo in [("uf", "TEXT"), ("casa", "TEXT"), ("id_camara", "INTEGER")]:
        if not coluna_existe(cur, "politicos", col):
            print(f"ADD COLUMN politicos.{col} ...")
            cur.execute(f"ALTER TABLE politicos ADD COLUMN {col} {tipo}")
        else:
            print(f"politicos.{col} já existe")

    # ── Indexes ─────────────────────────────────────────────────────────────
    indexes = [
        ("idx_emendas_uf",          "CREATE INDEX IF NOT EXISTS idx_emendas_uf ON emendas(uf)"),
        ("idx_emendas_uf_ano",      "CREATE INDEX IF NOT EXISTS idx_emendas_uf_ano ON emendas(uf, ano)"),
        ("idx_emendas_politico_uf", "CREATE INDEX IF NOT EXISTS idx_emendas_politico_uf ON emendas(politico_id, uf)"),
        ("idx_politicos_uf",        "CREATE INDEX IF NOT EXISTS idx_politicos_uf ON politicos(uf)"),
        ("idx_politicos_casa",      "CREATE INDEX IF NOT EXISTS idx_politicos_casa ON politicos(casa)"),
    ]
    for nome, sql in indexes:
        cur.execute(sql)
        print(f"Index {nome} OK")

    conn.commit()

    # ── Verificação final ───────────────────────────────────────────────────
    cur.execute("SELECT COUNT(*) FROM emendas")
    total_e = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM emendas WHERE uf IS NOT NULL AND uf != ''")
    com_uf_e = cur.fetchone()[0]
    cur.execute("SELECT uf, COUNT(*) FROM emendas GROUP BY uf ORDER BY 2 DESC LIMIT 5")
    top = cur.fetchall()

    print(f"\nEmendas: {total_e} total | {com_uf_e} com uf")
    print("Top UFs:")
    for uf, cnt in top:
        print(f"  {uf}: {cnt}")

    conn.close()
    print("\nMigration concluida.")

if __name__ == "__main__":
    main()
