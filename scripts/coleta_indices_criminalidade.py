"""
Coleta a Taxa de Homicídios (por 100 mil hab.) do Atlas da Violência (IPEA/FBSP),
via ipeadata, e persiste em indices_municipio / indices_estado.

Séries ipeadata:
  AVIOL12_THOMIC  "Taxa de homicídios (100.000 Habitantes)"  — usada p/ ESTADOS
  AVIOL12_HOMIC   "Número de homicídios"                       — usada p/ MUNICÍPIOS

⚠️ INTEGRIDADE — por que os municípios são CALCULADOS, não lidos direto:
A série de TAXA municipal está corrompida no ano mais recente (ex.: Belém 2022 =
7179/100k, sendo que vinha ~24 em 2021 e teve 339 homicídios → taxa real ≈ 26).
O número de homicídios municipal, porém, está íntegro. Então a taxa municipal é
recalculada: homicídios ÷ população (Censo IBGE, tabela indices_municipio) × 100k.
Estados usam a taxa publicada (íntegra: máx ~57, valores plausíveis).

Régua HORUS:
  - taxa → cascata por média ponderada por população (default no backend).
  - 0,0 é valor REAL (município sem homicídio no ano), não "sem dado".
  - ausência de registro = sem dado → endpoint cai pra média estadual ('estimado').
  - taxas altíssimas em municípios minúsculos (poucos hab.) são reais, só voláteis;
    não são capadas — alterar dado seria a mentira, não o valor verdadeiro.

Idempotente: limpa o indicador antes e reinsere. INSERT OR REPLACE por chave.

Rodar:
    python scripts/migrate_indices.py
    python scripts/coleta_indices_criminalidade.py
"""
import os
import sqlite3
import sys

import requests

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")
ODATA = "http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='{}')"
INDICADOR = "homicidios_100k"
FONTE = "Atlas da Violência/IPEA"
UNIDADE = "por 100 mil hab"


def _ano(reg):
    return int(str(reg["VALDATA"])[:4])


def _serie(sess, codigo):
    r = sess.get(ODATA.format(codigo), timeout=180)
    r.raise_for_status()
    return r.json()["value"]


def _ult_ano(rows):
    return max(_ano(r) for r in rows)


def main():
    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado em {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH, timeout=60)
    tabs = {x[0] for x in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "indices_municipio" not in tabs or "indices_estado" not in tabs:
        print("[ERRO] tabelas de índices não existem — rode migrate_indices.py primeiro")
        sys.exit(1)

    sess = requests.Session()
    sess.headers["User-Agent"] = "HorusRJ/1.0 (transparencia)"

    # ── ESTADOS: taxa publicada (íntegra), ano mais recente ──────────────────
    print("baixando taxa de homicídios (estados)...")
    thomic = [r for r in _serie(sess, "AVIOL12_THOMIC")
              if r.get("NIVNOME") == "Estados" and r.get("VALVALOR") is not None]
    ano_uf = _ult_ano(thomic)
    reg_uf = [(int(str(r["TERCODIGO"]).strip()), float(r["VALVALOR"]))
              for r in thomic if _ano(r) == ano_uf]
    conn.execute("DELETE FROM indices_estado WHERE indicador=?", (INDICADOR,))
    conn.executemany(
        "INSERT OR REPLACE INTO indices_estado "
        "(codigo_ibge, ano, indicador, valor, fonte, unidade) VALUES (?,?,?,?,?,?)",
        [(c, ano_uf, INDICADOR, v, FONTE, UNIDADE) for c, v in reg_uf])
    conn.commit()
    print(f"  estados     ano={ano_uf}  {len(reg_uf)} UFs  "
          f"(máx={max(v for _, v in reg_uf):.1f})")

    # ── MUNICÍPIOS: taxa recalculada = nº homicídios ÷ população × 100k ───────
    print("baixando número de homicídios (municípios)...")
    homic = [r for r in _serie(sess, "AVIOL12_HOMIC")
             if r.get("NIVNOME") == "Municípios" and r.get("VALVALOR") is not None]
    ano_mun = _ult_ano(homic)
    n_homic = {int(str(r["TERCODIGO"]).strip()): float(r["VALVALOR"])
               for r in homic if _ano(r) == ano_mun}
    pop = {r[0]: r[1] for r in conn.execute(
        "SELECT codigo_ibge, valor FROM indices_municipio WHERE indicador='populacao'")}

    reg_mun, sem_pop = [], 0
    for cod, h in n_homic.items():
        p = pop.get(cod)
        if not p or p <= 0:
            sem_pop += 1            # sem população → sem taxa (nunca divide por zero)
            continue
        reg_mun.append((cod, round(h / p * 100000, 4)))

    conn.execute("DELETE FROM indices_municipio WHERE indicador=?", (INDICADOR,))
    conn.executemany(
        "INSERT OR REPLACE INTO indices_municipio "
        "(codigo_ibge, ano, indicador, valor, fonte, unidade) VALUES (?,?,?,?,?,?)",
        [(c, ano_mun, INDICADOR, v, FONTE, UNIDADE) for c, v in reg_mun])
    conn.commit()
    zeros = sum(1 for _, v in reg_mun if v == 0.0)
    print(f"  municípios  ano={ano_mun}  {len(reg_mun)} (sem pop: {sem_pop})  "
          f"zeros={zeros}  máx={max(v for _, v in reg_mun):.1f}")

    print("\n=== amostra (cod, taxa, ano) ===")
    nomes = {33: "RJ", 35: "SP", 11: "RO", 3304557: "Rio-cap",
             3550308: "SP-cap", 1501402: "Belém", 2927408: "Salvador"}
    for cod, nm in nomes.items():
        tab = "indices_estado" if cod < 100 else "indices_municipio"
        row = conn.execute(
            f"SELECT valor, ano FROM {tab} WHERE indicador=? AND codigo_ibge=?",
            (INDICADOR, cod)).fetchone()
        print(f"  {nm:8} {row[0]:.1f}  ({row[1]})" if row else f"  {nm:8} —")
    conn.close()


if __name__ == "__main__":
    main()
