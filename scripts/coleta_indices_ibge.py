"""
Coleta índices territoriais da API pública do IBGE (servicodados.ibge.gov.br)
e persiste em indices_municipio / indices_estado (schema: migrate_indices.py).

Fonte primária: Censo Demográfico 2022.
Indicadores nesta leva:
    populacao         — agregado 4714, variável 93  (População residente)
    alfabetizacao_pct — agregado 9543, variável 2513 (Taxa de alfabetização 15+)

População é a espinha dorsal da cascata (médias ponderadas por habitante) além de
ser um índice exibível. Idempotente: INSERT OR REPLACE em (codigo_ibge, ano, indicador).

Rodar:
    python scripts/migrate_indices.py        # garante schema
    python scripts/coleta_indices_ibge.py
"""
import os
import sqlite3
import sys
import time

import requests

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")
BASE = "https://servicodados.ibge.gov.br/api/v3/agregados"

# (indicador, agregado, periodo, variavel, fonte, unidade)
COLETAS = [
    ("populacao",         "4714", "2022", "93",   "IBGE Censo 2022", "Pessoas"),
    ("alfabetizacao_pct", "9543", "2022", "2513", "IBGE Censo 2022", "%"),
]


def _session():
    s = requests.Session()
    s.headers["User-Agent"] = "HorusRJ/1.0 (transparencia)"
    return s


def _buscar(sess, agregado, periodo, variavel, nivel):
    """nivel: 'N3' (estado) ou 'N6' (município). Retorna [(codigo_ibge, valor)]."""
    url = f"{BASE}/{agregado}/periodos/{periodo}/variaveis/{variavel}?localidades={nivel}[all]"
    r = sess.get(url, timeout=60)
    r.raise_for_status()
    dados = r.json()
    if not dados or "resultados" not in dados[0]:
        return []
    out = []
    for serie in dados[0]["resultados"][0]["series"]:
        cod = serie["localidade"]["id"]
        valores = list(serie["serie"].values())
        if not valores:
            continue
        bruto = valores[0]
        if bruto in ("-", "...", "..", "X", None, ""):
            continue  # IBGE usa esses para "sem dado" — não persistir (nunca zero)
        try:
            valor = float(str(bruto).replace(",", "."))
        except ValueError:
            continue
        try:
            out.append((int(cod), valor))
        except ValueError:
            continue
    return out


def main():
    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado em {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH, timeout=60)
    tabs = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    if "indices_municipio" not in tabs or "indices_estado" not in tabs:
        print("[ERRO] tabelas de índices não existem — rode migrate_indices.py primeiro")
        sys.exit(1)

    sess = _session()
    total = 0

    for indicador, agregado, periodo, variavel, fonte, unidade in COLETAS:
        for nivel, tabela in (("N3", "indices_estado"), ("N6", "indices_municipio")):
            rotulo = "estados" if nivel == "N3" else "municípios"
            try:
                linhas = _buscar(sess, agregado, periodo, variavel, nivel)
            except Exception as e:
                print(f"  [ERRO] {indicador} {rotulo}: {type(e).__name__} {str(e)[:80]}")
                continue

            registros = [
                (cod, int(periodo), indicador, valor, fonte, unidade)
                for cod, valor in linhas
            ]
            conn.executemany(
                f"INSERT OR REPLACE INTO {tabela} "
                f"(codigo_ibge, ano, indicador, valor, fonte, unidade) VALUES (?,?,?,?,?,?)",
                registros,
            )
            conn.commit()
            total += len(registros)
            print(f"  [ok] {indicador:18} {rotulo:11}: {len(registros):>5} registros")
            time.sleep(0.5)

    # Validação
    print("\n=== amostra ===")
    for r in conn.execute("""
        SELECT codigo_ibge, indicador, valor, unidade FROM indices_estado
        WHERE codigo_ibge IN (33, 35, 11) ORDER BY indicador, codigo_ibge
    """):
        print(f"  estado {r[0]}: {r[1]} = {r[2]} {r[3]}")

    print(f"\ntotal persistido: {total:,}")
    conn.close()


if __name__ == "__main__":
    main()
