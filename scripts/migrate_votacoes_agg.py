"""
Pré-computa agregados por votação (tabela votacoes_agg) a partir dos 450k+ votos
nominais já coletados em votacoes_votos. Permite scorecard legislativo por
parlamentar (alinhamento, votações disputadas) com query barata.

Por que pré-computar: "alinhamento com a maioria" precisa, por votação, da posição
vencedora — recalcular isso a cada request varreria centenas de milhares de linhas.
Aqui rodamos uma vez (idempotente) e o endpoint só faz join indexado.

Granularidade: uma linha por id_votacao.
  pos_maioria : 'Sim' | 'Não' | 'Empate'  (só considera Sim/Não — votos de mérito)
  margem      : |sim - nao| / (sim + nao). 0 = disputa máxima, 1 = unanimidade.
  aprovacao   : resultado oficial (de votacoes.aprovacao): 1 aprovada, 0 rejeitada, NULL.

Rodar após cada coleta de votações:
    python scripts/coleta_votacoes_camara.py
    python scripts/migrate_votacoes_agg.py

Idempotente: DROP + recria. Seguro re-rodar.
"""
import os
import sqlite3
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")


def main():
    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado em {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")

    tabs = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    if "votacoes_votos" not in tabs:
        print("[ERRO] tabela votacoes_votos não existe — rode coleta_votacoes_camara.py primeiro")
        sys.exit(1)

    print("Recriando votacoes_agg...")
    conn.execute("DROP TABLE IF EXISTS votacoes_agg")
    conn.execute("""
        CREATE TABLE votacoes_agg (
            id_votacao       TEXT PRIMARY KEY,
            total_sim        INTEGER NOT NULL DEFAULT 0,
            total_nao        INTEGER NOT NULL DEFAULT 0,
            total_abstencao  INTEGER NOT NULL DEFAULT 0,
            total_obstrucao  INTEGER NOT NULL DEFAULT 0,
            total_outros     INTEGER NOT NULL DEFAULT 0,
            total_votos      INTEGER NOT NULL DEFAULT 0,
            pos_maioria      TEXT,
            margem           REAL,
            aprovacao        INTEGER,
            data             TEXT
        )
    """)

    # Agrega votos por votação. COUNT condicional por tipo de voto.
    print("Agregando votos por votação...")
    conn.execute("""
        INSERT INTO votacoes_agg (
            id_votacao, total_sim, total_nao, total_abstencao,
            total_obstrucao, total_outros, total_votos
        )
        SELECT
            vv.id_votacao,
            SUM(CASE WHEN vv.voto = 'Sim'       THEN 1 ELSE 0 END),
            SUM(CASE WHEN vv.voto = 'Não'       THEN 1 ELSE 0 END),
            SUM(CASE WHEN vv.voto = 'Abstenção' THEN 1 ELSE 0 END),
            SUM(CASE WHEN vv.voto = 'Obstrução' THEN 1 ELSE 0 END),
            SUM(CASE WHEN vv.voto NOT IN ('Sim','Não','Abstenção','Obstrução') THEN 1 ELSE 0 END),
            COUNT(*)
        FROM votacoes_votos vv
        GROUP BY vv.id_votacao
    """)

    # posição da maioria + margem (só Sim/Não — votos de mérito)
    print("Calculando maioria e margem...")
    conn.execute("""
        UPDATE votacoes_agg
        SET pos_maioria = CASE
                WHEN total_sim > total_nao THEN 'Sim'
                WHEN total_nao > total_sim THEN 'Não'
                ELSE 'Empate'
            END,
            margem = CASE
                WHEN (total_sim + total_nao) > 0
                THEN CAST(ABS(total_sim - total_nao) AS REAL) / (total_sim + total_nao)
                ELSE NULL
            END
    """)

    # copia aprovação/data oficiais da tabela votacoes, se existir
    if "votacoes" in tabs:
        print("Vinculando aprovação/data oficiais...")
        conn.execute("""
            UPDATE votacoes_agg
            SET aprovacao = (SELECT v.aprovacao FROM votacoes v WHERE v.id_votacao = votacoes_agg.id_votacao),
                data      = (SELECT v.data      FROM votacoes v WHERE v.id_votacao = votacoes_agg.id_votacao)
        """)

    conn.execute("CREATE INDEX IF NOT EXISTS idx_votacoes_agg_margem ON votacoes_agg(margem)")
    conn.commit()

    # Validação
    n = conn.execute("SELECT COUNT(*) FROM votacoes_agg").fetchone()[0]
    n_maioria = conn.execute("SELECT COUNT(*) FROM votacoes_agg WHERE pos_maioria IN ('Sim','Não')").fetchone()[0]
    n_disputa = conn.execute("SELECT COUNT(*) FROM votacoes_agg WHERE margem < 0.1").fetchone()[0]
    amostra = conn.execute(
        "SELECT id_votacao, total_sim, total_nao, pos_maioria, ROUND(margem,3) m, aprovacao "
        "FROM votacoes_agg WHERE total_sim+total_nao > 50 ORDER BY margem ASC LIMIT 3"
    ).fetchall()

    print(f"\n=== votacoes_agg pronta ===")
    print(f"  votações agregadas: {n:,}")
    print(f"  com maioria definida (Sim/Não): {n_maioria:,}")
    print(f"  disputadas (margem < 10%): {n_disputa:,}")
    print(f"  amostra das mais disputadas:")
    for r in amostra:
        line = f"    {r[0]}: Sim {r[1]} x Nao {r[2]} -> maioria {r[3]} (margem {r[4]}) aprov={r[5]}"
        # console Windows (cp1252) nao engole alguns unicode; degrada gracioso
        try:
            print(line)
        except UnicodeEncodeError:
            print(line.encode("ascii", "replace").decode("ascii"))

    conn.close()


if __name__ == "__main__":
    main()
