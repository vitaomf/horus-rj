"""
Coleta o IDHM (Índice de Desenvolvimento Humano Municipal) do Atlas do
Desenvolvimento Humano (PNUD/IPEA/FJP), via ipeadata, e persiste em
indices_municipio / indices_estado.

Série ipeadata: ADH_IDHM  "IDHM - Índice de Desenvolvimento Humano Municipal"
  (série GERAL — sem sufixo de dimensão E/L/R, sexo HOM/MUL ou raça BRA/NEG).
Níveis: Estados (TERCODIGO = código UF) e Municípios (TERCODIGO = IBGE 7 díg.).
Periodicidade decenal (1991, 2000, 2010). 2010 é o ÚLTIMO IDHM municipal OFICIAL
— a CLAUDE.md já assume esse ano ("município (2010 oficial; estimativas anuais)").

Régua HORUS:
  - IDHM é índice 0–1 → cascata por média ponderada por população (default backend).
    O Brasil/região exibidos são esse agregado (aprox.), como nos demais indicadores;
    o valor municipal/estadual exibido é o oficial PNUD, exato.
  - maior é melhor → ranking na direção padrão (não entra em INDICE_MENOR_MELHOR).
  - sem dado = ausência de registro → endpoint cai pra média estadual ('estimado').

Idempotente: limpa o indicador antes e reinsere.

Rodar:
    python scripts/migrate_indices.py
    python scripts/coleta_indices_idhm.py
"""
import os
import sqlite3
import sys

import requests

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")
URL = "http://www.ipeadata.gov.br/api/odata4/ValoresSerie(SERCODIGO='ADH_IDHM')"
INDICADOR = "idhm"
FONTE = "PNUD/Atlas Brasil"
UNIDADE = ""  # índice adimensional 0–1


def _ano(reg):
    return int(str(reg["VALDATA"])[:4])


def main():
    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado em {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    sess = requests.Session()
    sess.headers["User-Agent"] = "HorusRJ/1.0 (transparencia)"
    print("baixando IDHM (ADH_IDHM) do ipeadata...")
    r = sess.get(URL, timeout=180)
    r.raise_for_status()
    valores = [x for x in r.json()["value"] if x.get("VALVALOR") is not None]
    print(f"  {len(valores):,} registros")

    conn = sqlite3.connect(DB_PATH, timeout=60)
    tabs = {x[0] for x in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
    if "indices_municipio" not in tabs or "indices_estado" not in tabs:
        print("[ERRO] tabelas de índices não existem — rode migrate_indices.py primeiro")
        sys.exit(1)

    total = 0
    for nivel_nome, tabela in (("Estados", "indices_estado"),
                               ("Municípios", "indices_municipio")):
        rows = [x for x in valores if x.get("NIVNOME") == nivel_nome]
        if not rows:
            print(f"  [aviso] nível '{nivel_nome}' sem dados")
            continue
        ano = max(_ano(x) for x in rows)
        reg = []
        for x in rows:
            if _ano(x) != ano:
                continue
            try:
                cod = int(str(x["TERCODIGO"]).strip())
            except (ValueError, TypeError):
                continue
            reg.append((cod, float(x["VALVALOR"])))
        conn.execute(f"DELETE FROM {tabela} WHERE indicador=?", (INDICADOR,))
        conn.executemany(
            f"INSERT OR REPLACE INTO {tabela} "
            f"(codigo_ibge, ano, indicador, valor, fonte, unidade) VALUES (?,?,?,?,?,?)",
            [(c, ano, INDICADOR, v, FONTE, UNIDADE) for c, v in reg])
        conn.commit()
        total += len(reg)
        vmin = min(v for _, v in reg)
        vmax = max(v for _, v in reg)
        print(f"  {nivel_nome:11} ano={ano}  {len(reg):>5} territórios  "
              f"(mín={vmin:.3f}  máx={vmax:.3f})")

    print("\n=== amostra (cod, idhm, ano) ===")
    nomes = {33: "RJ", 35: "SP", 11: "RO", 3548807: "S.Caetano",
             3304557: "Rio-cap", 3550308: "SP-cap"}
    for cod, nm in nomes.items():
        tab = "indices_estado" if cod < 100 else "indices_municipio"
        row = conn.execute(
            f"SELECT valor, ano FROM {tab} WHERE indicador=? AND codigo_ibge=?",
            (INDICADOR, cod)).fetchone()
        print(f"  {nm:10} {row[0]:.3f}  ({row[1]})" if row else f"  {nm:10} —")
    print(f"\ntotal persistido: {total:,}")
    conn.close()


if __name__ == "__main__":
    main()
