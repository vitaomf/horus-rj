"""
Coleta votações nominais da Câmara dos Deputados via bulk JSON.

Fonte: dadosabertos.camara.leg.br/arquivos/votacoesVotos/json/votacoesVotos-{ano}.json
       dadosabertos.camara.leg.br/arquivos/votacoes/json/votacoes-{ano}.json

Estratégia:
  - Stream-parse o JSON de votos (arquivo grande, >30MB)
  - Filtra apenas deputados que existem no nosso banco (por id_camara)
  - Salva voto por voto em votacoes_votos e metadados em votacoes

Idempotente: usa INSERT OR IGNORE em (id_votacao, id_camara).

Como rodar:
    python scripts/coleta_votacoes_camara.py          # 2022–ano atual
    python scripts/coleta_votacoes_camara.py --ano 2024
    python scripts/coleta_votacoes_camara.py --force   # rebusca todos os anos
"""

import sqlite3, requests, sys, time, json, ijson
from datetime import datetime
from pathlib import Path

DB = "transparencia_rj.db"
ANOS = list(range(2022, datetime.now().year + 1))
BASE_VOTOS = "https://dadosabertos.camara.leg.br/arquivos/votacoesVotos/json/votacoesVotos-{ano}.json"
BASE_META  = "https://dadosabertos.camara.leg.br/arquivos/votacoes/json/votacoes-{ano}.json"


def criar_tabelas(conn: sqlite3.Connection):
    conn.execute("CREATE TABLE IF NOT EXISTS votacoes (id_votacao TEXT PRIMARY KEY, data TEXT, descricao TEXT, aprovacao INTEGER, sigla_orgao TEXT)")
    conn.execute("""CREATE TABLE IF NOT EXISTS votacoes_votos (
        id_votacao TEXT NOT NULL, id_camara INTEGER NOT NULL, politico_id INTEGER,
        voto TEXT NOT NULL, data_hora TEXT,
        PRIMARY KEY (id_votacao, id_camara),
        FOREIGN KEY (politico_id) REFERENCES politicos(id))""")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_votacoes_votos_politico ON votacoes_votos(politico_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_votacoes_votos_camara ON votacoes_votos(id_camara)")
    conn.commit()


def carregar_id_camara_map(conn: sqlite3.Connection) -> dict:
    """Retorna {id_camara_str: politico_id} para todos os deputados federais."""
    rows = conn.execute(
        "SELECT id_camara, id FROM politicos WHERE id_camara IS NOT NULL"
    ).fetchall()
    return {str(r[0]): r[1] for r in rows}


def coletar_meta(conn: sqlite3.Connection, ano: int):
    """Baixa metadados das votações (descricao, data, aprovacao)."""
    url = BASE_META.format(ano=ano)
    print(f"  [meta] Baixando {url}")
    try:
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        dados = r.json().get("dados", [])
        inserted = 0
        for v in dados:
            conn.execute(
                "INSERT OR IGNORE INTO votacoes (id_votacao, data, descricao, aprovacao, sigla_orgao) VALUES (?,?,?,?,?)",
                (v.get("id"), v.get("data"), v.get("descricao"), v.get("aprovacao"), v.get("siglaOrgao"))
            )
            inserted += 1
        conn.commit()
        print(f"  [meta] {inserted} votações salvas para {ano}")
    except Exception as e:
        print(f"  [meta] ERRO {ano}: {e}")


def coletar_votos(conn: sqlite3.Connection, ano: int, id_camara_map: dict):
    """Stream-parse do arquivo bulk de votos, filtrando apenas nossos deputados."""
    url = BASE_VOTOS.format(ano=ano)
    print(f"  [votos] Baixando {url}")

    try:
        r = requests.get(url, stream=True, timeout=120)
        r.raise_for_status()
        r.raw.decode_content = True  # descomprime gzip transparentemente

        inserted = 0
        skipped = 0
        batch = []

        for item in ijson.items(r.raw, "dados.item"):
            dep = item.get("deputado_", {})
            id_cam = str(dep.get("id", ""))

            if id_cam not in id_camara_map:
                skipped += 1
                continue

            politico_id = id_camara_map[id_cam]
            batch.append((
                item.get("idVotacao"),
                int(id_cam),
                politico_id,
                item.get("voto", ""),
                item.get("dataHoraVoto"),
            ))

            if len(batch) >= 500:
                conn.executemany(
                    "INSERT OR IGNORE INTO votacoes_votos (id_votacao, id_camara, politico_id, voto, data_hora) VALUES (?,?,?,?,?)",
                    batch
                )
                conn.commit()
                inserted += len(batch)
                batch = []

        if batch:
            conn.executemany(
                "INSERT OR IGNORE INTO votacoes_votos (id_votacao, id_camara, politico_id, voto, data_hora) VALUES (?,?,?,?,?)",
                batch
            )
            conn.commit()
            inserted += len(batch)

        print(f"  [votos] {ano}: {inserted} votos inseridos | {skipped} fora do banco ignorados")

    except Exception as e:
        print(f"  [votos] ERRO {ano}: {e}")


def main():
    args = sys.argv[1:]
    force = "--force" in args
    ano_unico = None
    if "--ano" in args:
        idx = args.index("--ano")
        ano_unico = int(args[idx + 1])

    anos = [ano_unico] if ano_unico else ANOS

    conn = sqlite3.connect(DB, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=30000")

    criar_tabelas(conn)
    id_camara_map = carregar_id_camara_map(conn)
    print(f"Deputados no banco: {len(id_camara_map)}")

    for ano in anos:
        print(f"\n=== {ano} ===")

        if not force:
            existing = conn.execute(
                "SELECT COUNT(*) FROM votacoes_votos vv JOIN votacoes v ON vv.id_votacao=v.id_votacao WHERE v.data LIKE ?",
                (f"{ano}%",)
            ).fetchone()[0]
            if existing > 0:
                print(f"  Já tem {existing} votos para {ano}. Use --force para rebuscar.")
                continue

        coletar_meta(conn, ano)
        time.sleep(0.5)
        coletar_votos(conn, ano, id_camara_map)
        time.sleep(1)

    # Resumo final
    total_votos = conn.execute("SELECT COUNT(*) FROM votacoes_votos").fetchone()[0]
    total_votacoes = conn.execute("SELECT COUNT(*) FROM votacoes").fetchone()[0]
    deps_com_dados = conn.execute("SELECT COUNT(DISTINCT politico_id) FROM votacoes_votos").fetchone()[0]
    print(f"\n=== Resumo ===")
    print(f"  Votações: {total_votacoes}")
    print(f"  Registros de voto: {total_votos}")
    print(f"  Deputados com dados: {deps_com_dados}")

    conn.close()


if __name__ == "__main__":
    main()
