"""
Estratégia definitiva: baixa catálogo COMPLETO da Câmara (paginação) sem filtro de legislatura.
Resultado: dicionário { nome_normalizado: foto_url } de TODOS os deputados históricos.
Depois faz match fuzzy contra os parlamentares sem foto.
"""

import sqlite3, requests, time, unicodedata, re, json, os
from difflib import SequenceMatcher

DB = "transparencia_rj.db"
CACHE_FILE = "cache/camara_completa.json"

def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").upper())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def baixar_catalogo_completo() -> dict[str, str]:
    """Baixa todos os deputados históricos. Cacheia em JSON."""
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, encoding="utf-8") as f:
            cache = json.load(f)
            if isinstance(cache, dict) and len(cache) > 1000:
                print(f"  Cache: {len(cache)} deputados carregados")
                return cache

    mapping: dict[str, str] = {}
    sess = requests.Session()
    sess.headers["Accept"] = "application/json"

    print("  Baixando catálogo completo da Câmara...")
    pagina = 1
    while True:
        try:
            r = sess.get(
                "https://dadosabertos.camara.leg.br/api/v2/deputados",
                params={"itens": 100, "pagina": pagina, "ordem": "ASC", "ordenarPor": "nome"},
                timeout=25,
            )
            r.raise_for_status()
            data = r.json()
            deps = data.get("dados", [])
            if not deps:
                break
            for d in deps:
                uri = d.get("uri", "")
                dep_id = uri.rstrip("/").split("/")[-1] if uri else str(d.get("id", ""))
                if not dep_id: continue
                foto = f"https://www.camara.leg.br/internet/deputado/bandep/{dep_id}.jpg"
                for n in [d.get("nome"), d.get("nomeEleitoral")]:
                    nn = norm(n)
                    if nn: mapping[nn] = foto
            links = data.get("links", [])
            has_next = any(l.get("rel") == "next" for l in links)
            if not has_next: break
            pagina += 1
            if pagina % 10 == 0: print(f"    pág {pagina}, {len(mapping)} mapas")
            time.sleep(0.15)
        except Exception as e:
            print(f"    pág {pagina}: {e}")
            time.sleep(2)
            continue

    print(f"  Total: {len(mapping)} mapas")
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=1)
    return mapping

def main():
    print("=== Coleta definitiva de fotos ===\n")
    print("[1/2] Catálogo Câmara")
    mapa = baixar_catalogo_completo()

    print(f"\n[2/2] Matching")
    conn = sqlite3.connect(DB, timeout=30)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""
        SELECT id, nome FROM politicos
        WHERE (foto_url IS NULL OR foto_url = '')
          AND cargo != 'Autor Coletivo'
          AND nome NOT LIKE 'COM.%'
          AND nome NOT LIKE 'COMISSAO%'
          AND nome NOT LIKE '%BANCADA%'
          AND nome NOT LIKE 'RELATOR%'
          AND nome NOT LIKE '%LIDER%'
          AND nome NOT LIKE 'Sem inform%'
    """)
    sem_foto = c.fetchall()
    print(f"  Parlamentares sem foto: {len(sem_foto)}")

    atualizados = 0
    nao_encontrados = []
    nomes_mapa = list(mapa.keys())

    for row in sem_foto:
        nn = norm(row["nome"])
        foto = mapa.get(nn)

        # Tier 2: match exato em qualquer ordem de palavras
        if not foto:
            palavras_nn = set(nn.split())
            for k in nomes_mapa:
                palavras_k = set(k.split())
                if palavras_nn == palavras_k:
                    foto = mapa[k]
                    break

        # Tier 3: subset match (todas as palavras do DB estão no nome da API)
        if not foto:
            palavras_nn = set(nn.split())
            if palavras_nn:
                candidatos = [k for k in nomes_mapa
                             if palavras_nn.issubset(set(k.split()))]
                if len(candidatos) == 1:
                    foto = mapa[candidatos[0]]
                elif len(candidatos) > 1:
                    melhor = min(candidatos, key=len)  # nome mais curto = mais provável
                    foto = mapa[melhor]

        # Tier 4: fuzzy match alto
        if not foto:
            melhor, score = None, 0
            for k in nomes_mapa:
                s = SequenceMatcher(None, nn, k).ratio()
                if s > score:
                    score, melhor = s, k
            if score >= 0.85:
                foto = mapa[melhor]

        if foto:
            c.execute("UPDATE politicos SET foto_url = ? WHERE id = ?", (foto, row["id"]))
            atualizados += 1
        else:
            nao_encontrados.append(row["nome"])

    conn.commit()
    c.execute("SELECT COUNT(*) FROM politicos WHERE foto_url IS NOT NULL AND foto_url != ''")
    total_com = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM politicos")
    total = c.fetchone()[0]
    conn.close()

    print(f"\n  Novos: {atualizados}")
    print(f"  Não encontrados: {len(nao_encontrados)}")
    print(f"  Cobertura total: {total_com}/{total} ({total_com*100//total}%)")

    if nao_encontrados:
        print(f"\n  Amostra de não encontrados ({len(nao_encontrados)} total):")
        for n in nao_encontrados[:30]:
            print(f"    - {n}")

if __name__ == "__main__":
    main()
