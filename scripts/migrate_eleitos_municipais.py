"""
migrate_eleitos_municipais.py
Cria tabela `eleitos_municipais` para armazenar prefeitos, vice-prefeitos e vereadores
eleitos nas eleições 2024. Dados preenchidos por scripts/coleta_tse_municipal.py.

Idempotente.
"""
import os, sqlite3

DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "transparencia_rj.db")


def main():
    print(f"Banco: {DB}")
    conn = sqlite3.connect(DB, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS eleitos_municipais (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            uf              TEXT    NOT NULL,
            municipio       TEXT    NOT NULL,
            cargo           TEXT    NOT NULL,  -- 'prefeito' | 'vice_prefeito' | 'vereador'
            nome            TEXT    NOT NULL,
            nome_urna       TEXT,
            partido         TEXT,
            numero          INTEGER,
            foto_url        TEXT,
            ano_eleicao     INTEGER NOT NULL,
            mandato         TEXT,
            sq_candidato    TEXT,             -- ID único TSE
            sigla_situacao  TEXT,             -- 'ELEITO' | 'ELEITO POR QP' etc
            coletado_em     TEXT    DEFAULT (datetime('now')),
            UNIQUE(sq_candidato, ano_eleicao)
        )
    """)
    print("Tabela eleitos_municipais OK")

    cur.execute("""
        CREATE TABLE IF NOT EXISTS eleitos_estaduais (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            uf              TEXT    NOT NULL,
            cargo           TEXT    NOT NULL,  -- 'governador' | 'vice_governador' | 'senador' | 'deputado_federal' | 'deputado_estadual'
            nome            TEXT    NOT NULL,
            nome_urna       TEXT,
            partido         TEXT,
            numero          INTEGER,
            foto_url        TEXT,
            ano_eleicao     INTEGER NOT NULL,
            mandato         TEXT,
            sq_candidato    TEXT,
            sigla_situacao  TEXT,
            coletado_em     TEXT    DEFAULT (datetime('now')),
            UNIQUE(sq_candidato, ano_eleicao)
        )
    """)
    print("Tabela eleitos_estaduais OK")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_eleitos_est_uf_cargo ON eleitos_estaduais(uf, cargo)")
    print("Index idx_eleitos_est_uf_cargo OK")

    for nome, sql in [
        ("idx_eleitos_uf_mun",
         "CREATE INDEX IF NOT EXISTS idx_eleitos_uf_mun ON eleitos_municipais(uf, municipio)"),
        ("idx_eleitos_cargo",
         "CREATE INDEX IF NOT EXISTS idx_eleitos_cargo ON eleitos_municipais(cargo)"),
        ("idx_eleitos_municipio",
         "CREATE INDEX IF NOT EXISTS idx_eleitos_municipio ON eleitos_municipais(municipio)"),
    ]:
        cur.execute(sql)
        print(f"Index {nome} OK")

    conn.commit()
    conn.close()
    print("Migration concluida.")


if __name__ == "__main__":
    main()
