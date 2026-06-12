"""
Enriquece a tabela politicos com dados biográficos das APIs oficiais.

Fase 1 do PLANO_MELHORIAS.md:
  - Adiciona colunas: nome_urna, data_nascimento, municipio_nascimento,
    uf_nascimento, escolaridade, profissao, bio_json, mandatos_json,
    atualizado_em
  - Para cada parlamentar, busca na Câmara API e/ou Senado API
  - Salva resultado serializado no banco
  - Idempotente: só atualiza se atualizado_em é nulo ou mais antigo que 30 dias

Como rodar:
    python scripts/enriquecer_politicos.py            # enriquece quem precisa
    python scripts/enriquecer_politicos.py --force    # reenriquece tudo
"""

import sqlite3, requests, time, unicodedata, re, json, sys, os
from datetime import datetime, timedelta
from difflib import SequenceMatcher

DB = "transparencia_rj.db"
CACHE_FILE = "cache/camara_completa.json"
DIAS_VALIDADE = 30

# Legislaturas da Câmara (anos reais — 56ª = 2019-2023, 57ª = 2023-2027).
# ATENÇÃO: tabela anterior estava deslocada +4 anos, gerando mandatos fantasmas
# futuros (ex: "2027-2031") em todos os perfis. Mantida em sincronia com api.py.
LEGISLATURAS = {
    50: (1995, 1999), 51: (1999, 2003), 52: (2003, 2007),
    53: (2007, 2011), 54: (2011, 2015), 55: (2015, 2019),
    56: (2019, 2023), 57: (2023, 2027), 58: (2027, 2031),
}

# ── Migração ──────────────────────────────────────────────────────────────────

NOVAS_COLUNAS = [
    ("nome_urna", "TEXT"),
    ("data_nascimento", "TEXT"),
    ("municipio_nascimento", "TEXT"),
    ("uf_nascimento", "TEXT"),
    ("escolaridade", "TEXT"),
    ("profissao", "TEXT"),
    ("bio_json", "TEXT"),
    ("bio_texto", "TEXT"),
    ("mandatos_json", "TEXT"),
    ("atualizado_em", "TEXT"),
]

def migrar(conn):
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(politicos)")
    existentes = {r[1] for r in cur.fetchall()}
    adicionadas = 0
    for nome, tipo in NOVAS_COLUNAS:
        if nome not in existentes:
            cur.execute(f"ALTER TABLE politicos ADD COLUMN {nome} {tipo}")
            adicionadas += 1
    if adicionadas:
        cur.execute("CREATE INDEX IF NOT EXISTS idx_politicos_atualizado ON politicos(atualizado_em)")
        conn.commit()
        print(f"  [migrate] +{adicionadas} colunas adicionadas")
    else:
        print(f"  [migrate] schema já atualizado")

# ── Normalização ──────────────────────────────────────────────────────────────

def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").upper())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip()

# ── Câmara API ────────────────────────────────────────────────────────────────

def carregar_catalogo_camara() -> dict[str, int]:
    """Retorna {nome_normalizado: dep_id} via catálogo cacheado."""
    if not os.path.exists(CACHE_FILE):
        print("  [cache] cache de Câmara não existe — rode scripts/fotos_completas.py primeiro")
        return {}
    with open(CACHE_FILE, encoding="utf-8") as f:
        mapa = json.load(f)
    # Extrai dep_id da URL: bandep/{id}.jpg
    out = {}
    for nome, url in mapa.items():
        m = re.search(r"bandep/(\d+)\.jpg", url)
        if m:
            out[nome] = int(m.group(1))
    return out

def buscar_camara(sess: requests.Session, dep_id: int) -> dict | None:
    """Busca dados completos de um deputado pela API da Câmara."""
    try:
        r = sess.get(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{dep_id}", timeout=15)
        if not r.ok: return None
        bio = r.json().get("dados", {})
    except Exception:
        return None

    # Mandatos
    mandatos = []
    try:
        h = sess.get(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{dep_id}/historico", timeout=15)
        if h.ok:
            hist_raw = h.json().get("dados", [])
            mds = {}
            for x in hist_raw:
                leg = x.get("idLegislatura")
                if not leg: continue
                if leg not in mds: mds[leg] = {"idLegislatura": leg, "partidos": []}
                p = x.get("siglaPartido")
                if p and p != "S.PART." and p not in mds[leg]["partidos"]:
                    mds[leg]["partidos"].append(p)
            for leg, m in sorted(mds.items()):
                anos = LEGISLATURAS.get(leg, (None, None))
                mandatos.append({"idLegislatura": leg, "anoInicio": anos[0], "anoFim": anos[1], "partidos": m["partidos"]})
    except Exception: pass

    # Profissão
    profissao = None
    try:
        p = sess.get(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{dep_id}/profissoes", timeout=10)
        if p.ok:
            profs = p.json().get("dados", [])
            if profs: profissao = profs[-1].get("titulo")
    except Exception: pass

    return {
        "fonte": "camara",
        "id_externo": dep_id,
        "nome_urna": bio.get("ultimoStatus", {}).get("nomeEleitoral"),
        "data_nascimento": bio.get("dataNascimento"),
        "municipio_nascimento": bio.get("municipioNascimento"),
        "uf_nascimento": bio.get("ufNascimento"),
        "escolaridade": bio.get("escolaridade"),
        "profissao": profissao,
        "url_perfil": f"https://www.camara.leg.br/deputados/{dep_id}",
        "rede_social": bio.get("redeSocial") or [],
        "mandatos": mandatos,
    }

# ── Senado API ────────────────────────────────────────────────────────────────

def buscar_senado_atual() -> list[dict]:
    """Lista senadores atuais (com NomeParlamentar/CodigoParlamentar)."""
    sess = requests.Session()
    sess.headers["Accept"] = "application/json"
    todos = []
    for leg in range(50, 58):
        try:
            r = sess.get(f"https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/{leg}", timeout=15)
            if r.ok:
                parl = r.json().get("ListaParlamentarLegislatura",{}).get("Parlamentares",{}).get("Parlamentar",[])
                for p in parl:
                    ip = p.get("IdentificacaoParlamentar", {})
                    if ip: todos.append(ip)
            time.sleep(0.3)
        except Exception: pass
    return todos

def montar_mapa_senado(senadores: list[dict]) -> dict[str, dict]:
    mapa = {}
    for ip in senadores:
        cod = ip.get("CodigoParlamentar", "")
        if not cod: continue
        for n in [ip.get("NomeParlamentar"), ip.get("NomeCompletoParlamentar")]:
            nn = norm(n)
            if nn and nn not in mapa:
                mapa[nn] = {
                    "fonte": "senado",
                    "id_externo": int(cod) if cod.isdigit() else cod,
                    "nome_urna": ip.get("NomeParlamentar"),
                    "url_perfil": f"https://www25.senado.leg.br/web/senadores/senador/-/perfil/{cod}",
                }
    return mapa

# ── Pipeline ──────────────────────────────────────────────────────────────────

def deve_atualizar(atualizado_em: str | None) -> bool:
    if not atualizado_em: return True
    try:
        dt = datetime.fromisoformat(atualizado_em)
        return (datetime.utcnow() - dt).days > DIAS_VALIDADE
    except Exception:
        return True

def main():
    force = "--force" in sys.argv
    print("=== Enriquecimento de politicos ===")
    conn = sqlite3.connect(DB, timeout=30)
    conn.row_factory = sqlite3.Row
    migrar(conn)

    print("\n[1/3] Carregando catálogos")
    catalogo_camara = carregar_catalogo_camara()
    print(f"  Câmara catálogo: {len(catalogo_camara)} deputados")

    senadores = buscar_senado_atual()
    mapa_senado = montar_mapa_senado(senadores)
    print(f"  Senado: {len(mapa_senado)} senadores")

    print("\n[2/3] Selecionando parlamentares para enriquecer")
    cur = conn.cursor()
    cur.execute("""
        SELECT id, nome, atualizado_em FROM politicos
        WHERE cargo != 'Autor Coletivo' AND nome NOT LIKE 'Sem inform%'
          AND nome NOT LIKE 'COM.%' AND nome NOT LIKE 'COMISSAO%'
          AND nome NOT LIKE '%BANCADA%' AND nome NOT LIKE 'RELATOR%'
          AND nome NOT LIKE '%LIDER%'
    """)
    todos = cur.fetchall()
    a_processar = [r for r in todos if force or deve_atualizar(r["atualizado_em"])]
    print(f"  Total: {len(todos)} | A processar: {len(a_processar)}")

    print(f"\n[3/3] Enriquecendo (~5min para 2000 perfis)")
    sess = requests.Session()
    sess.headers.update({"Accept": "application/json", "User-Agent": "HorusRJ/1.0"})

    enr = 0
    senado_only = 0
    nao_encontrados = 0
    agora = datetime.utcnow().isoformat()

    for idx, row in enumerate(a_processar, 1):
        nn = norm(row["nome"])
        dados = None

        # Câmara
        dep_id = catalogo_camara.get(nn)
        if dep_id:
            dados = buscar_camara(sess, dep_id)
            time.sleep(0.1)

        # Senado fallback
        if not dados and nn in mapa_senado:
            dados = mapa_senado[nn]
            senado_only += 1

        if not dados:
            nao_encontrados += 1
            cur.execute("UPDATE politicos SET atualizado_em = ? WHERE id = ?", (agora, row["id"]))
            continue

        bio_json = json.dumps(dados, ensure_ascii=False)
        mandatos_json = json.dumps(dados.get("mandatos", []), ensure_ascii=False)

        cur.execute("""
            UPDATE politicos SET
              nome_urna = COALESCE(NULLIF(?, ''), nome_urna),
              data_nascimento = COALESCE(?, data_nascimento),
              municipio_nascimento = COALESCE(?, municipio_nascimento),
              uf_nascimento = COALESCE(?, uf_nascimento),
              escolaridade = COALESCE(?, escolaridade),
              profissao = COALESCE(?, profissao),
              bio_json = ?,
              mandatos_json = ?,
              atualizado_em = ?
            WHERE id = ?
        """, (
            dados.get("nome_urna") or "",
            dados.get("data_nascimento"),
            dados.get("municipio_nascimento"),
            dados.get("uf_nascimento"),
            dados.get("escolaridade"),
            dados.get("profissao"),
            bio_json,
            mandatos_json,
            agora,
            row["id"],
        ))
        enr += 1

        if idx % 100 == 0:
            conn.commit()
            print(f"  {idx}/{len(a_processar)} | enriquecidos: {enr} | só-senado: {senado_only} | não-encontrado: {nao_encontrados}")

    conn.commit()
    conn.close()

    print(f"\n=== Resultado ===")
    print(f"  Enriquecidos (Câmara/Senado): {enr}")
    print(f"  Apenas Senado: {senado_only}")
    print(f"  Não encontrados: {nao_encontrados}")

if __name__ == "__main__":
    main()
