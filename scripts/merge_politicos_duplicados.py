"""
Funde políticos duplicados entre as coletas (Câmara × emendas).

Problema: a coleta da Câmara insere "Arthur Lira" (mixed-case, com id_camara,
votos, bio) e a coleta de emendas insere "ARTHUR LIRA" (UPPER, com emendas).
Como politicos é chaveado por nome, a mesma pessoa vira DOIS perfis: um com o
raio-x e zero emendas, outro com as emendas e nada mais. 453 parlamentares
estavam nessa situação.

Critério de fusão (conservador — só o padrão 100% verificado):
  - mesmo UPPER(nome)
  - exatamente 2 registros
  - um COM id_camara (canônico: tem bio/votos/partido/uf da Câmara)
  - um SEM id_camara e COM emendas (duplicata da coleta de emendas)
  - nenhum dos dois é 'Autor Coletivo'
Grupos com 3+ registros não são tocados (zero hoje, mas é a salvaguarda
contra homônimos).

Operação por par:
  1. Repointa FKs da duplicata -> canônico: emendas, campanhas,
     votacoes_votos, bio_wikipedia (se existirem).
  2. Copia partido/uf da duplicata pro canônico apenas se o canônico for NULL.
  3. Apaga a duplicata.
  4. Loga em logs/merge_politicos.log (auditável — exigência da constituição).

Idempotente: re-rodar encontra 0 pares.
"""
import os
import sqlite3
import sys
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")
LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "merge_politicos.log")

FK_TABELAS = ["emendas", "campanhas", "votacoes_votos", "bio_wikipedia"]


def main():
    dry = "--dry-run" in sys.argv
    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado em {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.row_factory = sqlite3.Row
    tabs = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    fk_tabelas = [t for t in FK_TABELAS if t in tabs]

    pares = conn.execute("""
        SELECT can.id AS can_id, dup.id AS dup_id, can.nome AS can_nome,
               dup.nome AS dup_nome, dup.partido AS dup_partido, dup.uf AS dup_uf
        FROM politicos can
        JOIN politicos dup
          ON UPPER(can.nome) = UPPER(dup.nome)
         AND can.id != dup.id
        WHERE can.id_camara IS NOT NULL
          AND dup.id_camara IS NULL
          AND COALESCE(can.cargo,'') != 'Autor Coletivo'
          AND COALESCE(dup.cargo,'') != 'Autor Coletivo'
          AND EXISTS (SELECT 1 FROM emendas e WHERE e.politico_id = dup.id)
          AND (SELECT COUNT(*) FROM politicos p WHERE UPPER(p.nome) = UPPER(can.nome)
               AND COALESCE(p.cargo,'') != 'Autor Coletivo') = 2
    """).fetchall()

    print(f"pares a fundir: {len(pares)}{' (dry-run)' if dry else ''}")
    if dry or not pares:
        conn.close()
        return

    ts = datetime.now().isoformat(timespec="seconds")
    total_emendas_movidas = 0
    with open(LOG_FILE, "a", encoding="utf-8") as log:
        log.write(f"\n=== merge {ts} | {len(pares)} pares ===\n")
        cur = conn.cursor()
        cur.execute("BEGIN")
        try:
            for p in pares:
                movidas = {}
                for t in fk_tabelas:
                    cur.execute(
                        f"UPDATE {t} SET politico_id = ? WHERE politico_id = ?",
                        (p["can_id"], p["dup_id"]),
                    )
                    if cur.rowcount:
                        movidas[t] = cur.rowcount
                total_emendas_movidas += movidas.get("emendas", 0)
                # completa campos faltantes do canônico
                cur.execute("""
                    UPDATE politicos SET
                        partido = COALESCE(partido, ?),
                        uf      = COALESCE(uf, ?)
                    WHERE id = ?
                """, (p["dup_partido"], p["dup_uf"], p["can_id"]))
                cur.execute("DELETE FROM politicos WHERE id = ?", (p["dup_id"],))
                log.write(f"{p['dup_id']} ({p['dup_nome']}) -> {p['can_id']} "
                          f"({p['can_nome']}) | {movidas}\n")
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    # Validação
    orfas = conn.execute("""
        SELECT COUNT(*) FROM emendas e
        WHERE e.politico_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM politicos p WHERE p.id = e.politico_id)
    """).fetchone()[0]
    restantes = conn.execute("""
        SELECT COUNT(*) FROM (
            SELECT UPPER(nome) FROM politicos
            WHERE COALESCE(cargo,'') != 'Autor Coletivo'
            GROUP BY UPPER(nome) HAVING COUNT(*) > 1
        )
    """).fetchone()[0]
    lira = conn.execute(
        "SELECT id, (SELECT COUNT(*) FROM emendas e WHERE e.politico_id=p.id) emendas, "
        "(SELECT COUNT(*) FROM votacoes_votos v WHERE v.politico_id=p.id) votos "
        "FROM politicos p WHERE UPPER(nome) LIKE '%ARTHUR%LIRA%'"
    ).fetchall()

    print(f"emendas repontadas: {total_emendas_movidas:,}")
    print(f"emendas órfãs após merge: {orfas} (esperado 0)")
    print(f"nomes ainda duplicados: {restantes} (esperado 0)")
    for r in lira:
        print(f"spot Arthur Lira: id {r['id']} | {r['emendas']} emendas | {r['votos']} votos")
    print(f"log: {LOG_FILE}")
    conn.close()


if __name__ == "__main__":
    main()
