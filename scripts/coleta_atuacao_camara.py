"""
coleta_atuacao_camara.py — Atuação legislativa dos deputados federais (dimensão #2).

Para cada deputado com id_camara, coleta da API da Câmara (dadosabertos):
  - proposições de autoria (PLs/PECs/...) — "legislar"
  - órgãos/comissões (Titular/Suplente)    — "comissões"
  - discursos recentes                      — "discursar"

Lições do histórico de coleta (logs/coleta_errors.log):
  - "database is locked" derrubou emendas 2x → aqui usamos WAL + busy_timeout e
    commit CURTO por deputado (transação curta), nunca uma transação gigante.
  - "timeout 1.5h" → tudo BOUNDED: nº de itens por chamada limitado, janela de
    data nos discursos, retry com teto.

Idempotente: INSERT OR REPLACE com PK natural. Re-rodar é seguro.

Rodar:
    python scripts/coleta_atuacao_camara.py --limit 3   # teste rápido
    python scripts/coleta_atuacao_camara.py             # todos (~594 deputados)
"""
import argparse
import os
import sqlite3
import sys
import time
from datetime import date

import requests

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "transparencia_rj.db")
BASE = "https://dadosabertos.camara.leg.br/api/v2"
HEADERS = {"User-Agent": "HorusRJ/1.0 (transparencia)", "Accept": "application/json"}
JANELA_DISCURSOS = "2024-01-01"  # discursos a partir daqui (bounded)


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")    # leitura (API) + escrita (coleta) sem travar
    conn.execute("PRAGMA busy_timeout=60000")  # espera lock até 60s em vez de estourar
    return conn


def criar_tabelas(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS atuacao_proposicoes (
            politico_id INTEGER NOT NULL, id_prop INTEGER NOT NULL,
            sigla TEXT, numero TEXT, ano INTEGER, ementa TEXT, data TEXT,
            PRIMARY KEY (politico_id, id_prop));
        CREATE TABLE IF NOT EXISTS atuacao_orgaos (
            politico_id INTEGER NOT NULL, id_orgao INTEGER NOT NULL,
            sigla TEXT, nome TEXT, titulo TEXT, data_inicio TEXT, data_fim TEXT,
            PRIMARY KEY (politico_id, id_orgao, data_inicio));
        CREATE TABLE IF NOT EXISTS atuacao_discursos (
            politico_id INTEGER NOT NULL, data_hora TEXT NOT NULL,
            sumario TEXT, keywords TEXT, fase TEXT, url TEXT,
            PRIMARY KEY (politico_id, data_hora));
        CREATE INDEX IF NOT EXISTS idx_atu_prop_pol ON atuacao_proposicoes(politico_id);
        CREATE INDEX IF NOT EXISTS idx_atu_org_pol  ON atuacao_orgaos(politico_id);
        CREATE INDEX IF NOT EXISTS idx_atu_disc_pol ON atuacao_discursos(politico_id);
    """)
    conn.commit()


def _get(sess, url, params):
    """GET com retry/backoff (teto 3). Retorna lista `dados` (vazia em falha)."""
    for i in range(3):
        try:
            r = sess.get(url, params=params, timeout=25)
            if r.status_code == 200:
                return r.json().get("dados", []) or []
            if r.status_code == 404:
                return []
        except Exception:
            pass
        time.sleep(1.5 * (i + 1))
    return []


def coletar(limit=None):
    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado: {DB_PATH}", file=sys.stderr); sys.exit(1)
    sess = requests.Session(); sess.headers.update(HEADERS)
    conn = get_db()
    criar_tabelas(conn)

    deps = conn.execute(
        "SELECT id, id_camara FROM politicos WHERE id_camara IS NOT NULL ORDER BY id"
    ).fetchall()
    if limit:
        deps = deps[:limit]
    print(f"deputados a coletar: {len(deps)}", flush=True)

    hoje = date.today().isoformat()
    tot = {"prop": 0, "org": 0, "disc": 0, "erros": 0}

    for n, (pid, idc) in enumerate(deps, 1):
        try:
            # 1) proposições de autoria
            props = _get(sess, f"{BASE}/proposicoes",
                         {"idDeputadoAutor": idc, "ordenarPor": "ano", "ordem": "DESC", "itens": 30})
            conn.executemany(
                "INSERT OR REPLACE INTO atuacao_proposicoes (politico_id,id_prop,sigla,numero,ano,ementa,data) VALUES (?,?,?,?,?,?,?)",
                [(pid, p.get("id"), p.get("siglaTipo"), str(p.get("numero") or ""),
                  int(p["ano"]) if str(p.get("ano") or "").isdigit() else None,
                  (p.get("ementa") or "")[:500], p.get("dataApresentacao")) for p in props if p.get("id")])

            # 2) órgãos/comissões
            orgs = _get(sess, f"{BASE}/deputados/{idc}/orgaos",
                        {"ordem": "DESC", "itens": 20})
            conn.executemany(
                "INSERT OR REPLACE INTO atuacao_orgaos (politico_id,id_orgao,sigla,nome,titulo,data_inicio,data_fim) VALUES (?,?,?,?,?,?,?)",
                [(pid, o.get("idOrgao"), o.get("siglaOrgao"), o.get("nomeOrgao"),
                  o.get("titulo"), o.get("dataInicio") or "", o.get("dataFim")) for o in orgs if o.get("idOrgao")])

            # 3) discursos (janela de data — obrigatória)
            disc = _get(sess, f"{BASE}/deputados/{idc}/discursos",
                        {"dataInicio": JANELA_DISCURSOS, "dataFim": hoje,
                         "ordenarPor": "dataHoraInicio", "ordem": "DESC", "itens": 15})
            conn.executemany(
                "INSERT OR REPLACE INTO atuacao_discursos (politico_id,data_hora,sumario,keywords,fase,url) VALUES (?,?,?,?,?,?)",
                [(pid, d.get("dataHoraInicio"), (d.get("sumario") or "")[:500],
                  d.get("keywords"), d.get("faseEvento", {}).get("titulo") if isinstance(d.get("faseEvento"), dict) else None,
                  d.get("urlTexto")) for d in disc if d.get("dataHoraInicio")])

            conn.commit()  # transação CURTA por deputado (anti database-locked)
            tot["prop"] += len(props); tot["org"] += len(orgs); tot["disc"] += len(disc)
        except Exception as e:
            tot["erros"] += 1
            print(f"  [skip] dep id_camara={idc}: {type(e).__name__} {str(e)[:60]}", flush=True)
        if n % 50 == 0:
            print(f"  {n}/{len(deps)} ... prop={tot['prop']} org={tot['org']} disc={tot['disc']} erros={tot['erros']}", flush=True)
        time.sleep(0.15)  # gentil com a API

    print(f"\nOK — proposições={tot['prop']} | comissões={tot['org']} | discursos={tot['disc']} | erros={tot['erros']}", flush=True)
    conn.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    coletar(ap.parse_args().limit)
