"""
Liga cada eleito (eleitos_estaduais, TSE 2022) ao seu registro em `politicos`,
gravando `eleitos_estaduais.politico_id`. Assim o card do eleito em
HierarquiaCargos abre o perfil com a ATUAÇÃO legislativa (votações, scorecard,
proposições) — que hoje só existe pra quem tem id_camara em `politicos`.

Por que persistir (e não casar por nome no SQL): o nome do TSE é o nome LEGAL
(ROSEANA SARNEY MURAD) ou o de URNA (DELEGADO RAMAGEM), enquanto a Câmara usa o
nome parlamentar (Alexandre Ramagem). UPPER() puro no SQLite nem tira acento.
Aqui o match é normalizado (sem acento) e, quando o exato falha, fuzzy por
tokens com trava anti-falso-positivo (mesma UF + folga mínima sobre o 2º melhor).

Matching por cargo (pool correto evita ligar deputado ao prefeito homônimo):
  deputado_federal -> politicos com id_camara (deputados em exercício)
  senador          -> politicos cargo='Senador'
  governador/vice  -> qualquer politico da UF, só match exato (sem fuzzy)
  deputado_estadual-> não casa (não há perfil federal) — fica null

Integridade: link errado mostraria os votos do parlamentar errado. Por isso o
fuzzy é conservador; 52 eleitos ficam sem link (cassados/suplentes não empossados
realmente não têm atuação em `politicos`) — e isso é o correto, não um bug.

Idempotente: zera politico_id e recalcula. Rodar:
    python scripts/ligar_eleitos_politicos.py
"""
import os
import re
import sqlite3
import sys
import unicodedata

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")

STOP = {"DA", "DE", "DO", "DAS", "DOS", "E", "DR", "DRA", "PROF", "PROFESSOR",
        "PROFESSORA", "DELEGADO", "DELEGADA", "SARGENTO", "CABO", "PASTOR",
        "PADRE", "CORONEL", "CAP", "CAPITAO", "JUNIOR", "JR", "FILHO", "NETO",
        "SOBRINHO", "DEPUTADO", "DEPUTADA", "TIO", "TIA"}


def _strip(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    return "".join(ch for ch in s if unicodedata.category(ch) != "Mn")


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", _strip(s)).upper().strip()


def toks(s: str) -> set:
    return {t for t in re.sub(r"[^A-Za-z ]", " ", _strip(s)).upper().split()
            if len(t) > 1 and t not in STOP}


def _index(pol):
    by_nome = {}
    for p in pol:
        p["toks"] = toks(p["nome"]) | toks(p["nome_urna"])
        for k in (norm(p["nome"]), norm(p["nome_urna"])):
            if k:
                by_nome.setdefault(k, []).append(p)
    return by_nome


def _match(e, pool, by_nome, fuzzy=True):
    # 1) exato normalizado (nome legal ou de urna), desempate por UF
    for k in (norm(e["nome"]), norm(e["nome_urna"])):
        if k in by_nome:
            cs = by_nome[k]
            cs = [x for x in cs if x["uf"] == e["uf"]] or cs
            return cs[0], "exato"
    if not fuzzy:
        return None, None
    # 2) fuzzy por tokens, mesma UF, melhor Jaccard com folga sobre o 2º
    et = toks(e["nome"]) | toks(e["nome_urna"])
    if not et:
        return None, None
    best, bj, second = None, 0.0, 0.0
    for p in pool:
        if p["uf"] != e["uf"]:
            continue
        inter = et & p["toks"]
        if not inter:
            continue
        j = len(inter) / len(et | p["toks"])
        if j > bj:
            second, bj, best = bj, j, p
        elif j > second:
            second = j
    if best and bj >= 0.34 and (bj - second) >= 0.15:
        return best, "fuzzy"
    return None, None


def main():
    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado em {DB_PATH}", file=sys.stderr)
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.row_factory = sqlite3.Row

    cols = [c[1] for c in conn.execute("PRAGMA table_info(eleitos_estaduais)")]
    if "politico_id" not in cols:
        conn.execute("ALTER TABLE eleitos_estaduais ADD COLUMN politico_id INTEGER")
        print("[migrate] coluna politico_id criada")
    conn.execute("UPDATE eleitos_estaduais SET politico_id = NULL")

    pol = [dict(r) for r in conn.execute(
        "SELECT id, nome, nome_urna, partido, uf, id_camara, cargo FROM politicos")]
    pool_dep = [p for p in pol if p["id_camara"] not in (None, "")]
    pool_sen = [p for p in pol if (p["cargo"] or "") == "Senador"]
    idx_dep, idx_sen, idx_all = _index(pool_dep), _index(pool_sen), _index(pol)

    POOLS = {
        "deputado_federal": (pool_dep, idx_dep, True),
        "senador":          (pool_sen, idx_sen, True),
        "governador":       (pol, idx_all, False),
        "vice_governador":  (pol, idx_all, False),
    }

    stats = {}
    el = [dict(r) for r in conn.execute(
        "SELECT id, cargo, nome, nome_urna, uf FROM eleitos_estaduais WHERE ano_eleicao = 2022")]
    upd = []
    for e in el:
        cfg = POOLS.get(e["cargo"])
        if not cfg:
            continue
        pool, idx, fuzzy = cfg
        hit, how = _match(e, pool, idx, fuzzy)
        if hit:
            upd.append((hit["id"], e["id"]))
            stats.setdefault(e["cargo"], {"exato": 0, "fuzzy": 0})
            stats[e["cargo"]][how] += 1

    conn.executemany("UPDATE eleitos_estaduais SET politico_id = ? WHERE id = ?", upd)
    conn.commit()

    print("=== vínculos por cargo (exato + fuzzy) ===")
    for cargo, s in sorted(stats.items()):
        total = conn.execute(
            "SELECT COUNT(*) FROM eleitos_estaduais WHERE cargo=? AND ano_eleicao=2022",
            (cargo,)).fetchone()[0]
        print(f"  {cargo:18} {s['exato']+s['fuzzy']:>4}/{total:<4} (exato {s['exato']}, fuzzy {s['fuzzy']})")
    # quantos desses têm atuação de fato (id_camara)
    com_atuacao = conn.execute("""
        SELECT COUNT(*) FROM eleitos_estaduais e JOIN politicos p ON p.id = e.politico_id
        WHERE e.cargo='deputado_federal' AND p.id_camara IS NOT NULL""").fetchone()[0]
    print(f"\ndeputados federais com perfil+atuação ligados: {com_atuacao}")
    print(f"total politico_id gravados: {len(upd)}")
    conn.close()


if __name__ == "__main__":
    main()
