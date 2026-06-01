"""
Schema das tabelas de índices territoriais (IDH, saneamento, criminalidade,
desmatamento, alfabetismo). Base da feature 'índices em cascata' do CLAUDE.md.

Modelo (key-value longo, conforme constituição):
    indices_municipio(codigo_ibge, ano, indicador, valor, fonte, unidade)
    indices_estado   (codigo_ibge, ano, indicador, valor, fonte, unidade)

Por que key-value longo e não colunas fixas: cada indicador tem fonte/ano/
cobertura diferente; novos indicadores entram sem ALTER TABLE. A cascata
(Brasil/Região) é calculada na API por agregação — não se armazena.

UNIQUE(codigo_ibge, ano, indicador) garante idempotência: re-coletar
sobrescreve via INSERT OR REPLACE, nunca duplica.

Códigos IBGE:
    município = 7 dígitos (ex: 3304557 = Rio de Janeiro)
    estado    = 2 dígitos (ex: 33 = RJ)

Indicadores canônicos (string estável usada pela API e pelos coletores):
    idhm | idhm_renda | idhm_long | idhm_educ
    esgoto_coletado_pct | esgoto_tratado_pct | agua_pct
    homicidios_100k
    desmatamento_km2 | desmatamento_pct_territorio
    alfabetizacao_pct | escolaridade_media_anos

Rodar:
    python scripts/migrate_indices.py
Idempotente (CREATE TABLE IF NOT EXISTS).
"""
import os
import sqlite3
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")

DDL = """
CREATE TABLE IF NOT EXISTS indices_municipio (
    codigo_ibge  INTEGER NOT NULL,
    ano          INTEGER NOT NULL,
    indicador    TEXT    NOT NULL,
    valor        REAL,
    fonte        TEXT,
    unidade      TEXT,
    coletado_em  TEXT DEFAULT (datetime('now')),
    UNIQUE(codigo_ibge, ano, indicador)
);

CREATE TABLE IF NOT EXISTS indices_estado (
    codigo_ibge  INTEGER NOT NULL,
    ano          INTEGER NOT NULL,
    indicador    TEXT    NOT NULL,
    valor        REAL,
    fonte        TEXT,
    unidade      TEXT,
    coletado_em  TEXT DEFAULT (datetime('now')),
    UNIQUE(codigo_ibge, ano, indicador)
);

CREATE INDEX IF NOT EXISTS idx_imun_lookup ON indices_municipio(codigo_ibge, indicador, ano);
CREATE INDEX IF NOT EXISTS idx_imun_ind    ON indices_municipio(indicador, ano);
CREATE INDEX IF NOT EXISTS idx_iest_lookup ON indices_estado(codigo_ibge, indicador, ano);
CREATE INDEX IF NOT EXISTS idx_iest_ind    ON indices_estado(indicador, ano);
"""


def main():
    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado em {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.executescript(DDL)
    conn.commit()

    tabs = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    for t in ("indices_municipio", "indices_estado"):
        n = conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        status = "ok" if t in tabs else "FALHOU"
        print(f"  [{status}] {t}: {n} linhas")

    conn.close()
    print("schema de índices pronto.")


if __name__ == "__main__":
    main()
