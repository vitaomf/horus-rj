"""
Tabela de resolução nome → código IBGE (municipios_ibge).

Fonte: API de localidades do IBGE — 1 GET retorna os 5.570 municípios com
código (7 dígitos), nome oficial e UF. É o elo que faltava entre o
municipio_destino do Portal (nome, ex: "NITERÓI - RJ") e as tabelas
indices_municipio (codigo_ibge), permitindo exibir índices na página da cidade.

Idempotente: CREATE TABLE IF NOT EXISTS + INSERT OR REPLACE.

Rodar:
    python scripts/coleta_municipios_ibge.py
"""
import os
import sqlite3
import sys
import unicodedata

import requests

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")
URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado"


def normalizar(s: str) -> str:
    """UPPER + sem acento — mesma semântica do _unaccent do api.py."""
    nfd = unicodedata.normalize("NFD", s or "")
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn").upper().strip()


def main():
    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado em {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    sess = requests.Session()
    sess.headers["User-Agent"] = "HorusRJ/1.0 (transparencia)"
    print("Baixando municípios do IBGE...")
    r = sess.get(URL, timeout=60)
    r.raise_for_status()
    dados = r.json()
    print(f"  recebidos: {len(dados):,}")

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS municipios_ibge (
            codigo_ibge       INTEGER PRIMARY KEY,
            nome              TEXT NOT NULL,
            nome_normalizado  TEXT NOT NULL,
            uf                TEXT NOT NULL
        )
    """)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_mun_ibge_nome ON municipios_ibge(nome_normalizado, uf)"
    )

    registros = []
    for m in dados:
        cod = m.get("municipio-id")
        nome = m.get("municipio-nome")
        uf = m.get("UF-sigla")
        if not (cod and nome and uf):
            continue
        registros.append((int(cod), nome, normalizar(nome), uf))

    conn.executemany(
        "INSERT OR REPLACE INTO municipios_ibge (codigo_ibge, nome, nome_normalizado, uf) "
        "VALUES (?,?,?,?)",
        registros,
    )
    conn.commit()

    n = conn.execute("SELECT COUNT(*) FROM municipios_ibge").fetchone()[0]
    print(f"  persistidos: {n:,}")

    # Colisões dentro da mesma UF (nome_normalizado duplicado) — não deve haver
    col = conn.execute("""
        SELECT nome_normalizado, uf, COUNT(*) c FROM municipios_ibge
        GROUP BY nome_normalizado, uf HAVING c > 1
    """).fetchall()
    print(f"  colisões (nome+uf duplicado): {len(col)}")
    for c in col[:5]:
        print(f"    {c[0]} - {c[1]}: {c[2]}x")

    # Validação contra os destinos reais das emendas: taxa de match
    taxa = conn.execute("""
        WITH destinos AS (
            SELECT DISTINCT UPPER(municipio_destino) AS d, uf
            FROM emendas
            WHERE uf IN (SELECT DISTINCT uf FROM municipios_ibge)
              AND municipio_destino IS NOT NULL AND municipio_destino != ''
              AND municipio_destino NOT LIKE '%(UF)%'
        )
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN EXISTS (
                SELECT 1 FROM municipios_ibge mi
                WHERE mi.uf = destinos.uf
                  AND mi.nome_normalizado = REPLACE(destinos.d, ' - ' || destinos.uf, '')
            ) THEN 1 ELSE 0 END) AS matched
        FROM destinos
    """).fetchone()
    if taxa and taxa[0]:
        print(f"  match contra destinos de emendas: {taxa[1]:,}/{taxa[0]:,} "
              f"({100*taxa[1]/taxa[0]:.1f}%)")

    # Spot-checks
    for nome, uf, esperado in (("NITEROI", "RJ", 3303302), ("RIO DE JANEIRO", "RJ", 3304557),
                               ("SAO PAULO", "SP", 3550308)):
        row = conn.execute(
            "SELECT codigo_ibge FROM municipios_ibge WHERE nome_normalizado=? AND uf=?",
            (nome, uf)
        ).fetchone()
        ok = "ok" if row and row[0] == esperado else f"FALHOU (got {row})"
        print(f"  spot {nome}-{uf}: {ok}")

    conn.close()


if __name__ == "__main__":
    main()
