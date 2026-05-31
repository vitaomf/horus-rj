"""
Busca textos biográficos da Wikipedia REST API para cada parlamentar
e popula a coluna bio_texto na tabela politicos.

Estratégia:
  1. Para cada parlamentar com nome_urna válido (ou nome civil), consulta
     `https://pt.wikipedia.org/api/rest_v1/page/summary/{slug}`
  2. Valida com heurística: o extract deve mencionar termos políticos
     (deputado, senador, vereador, prefeito, governador) ou o nome do partido
  3. Salva o `extract` (primeiro parágrafo) na coluna bio_texto

Idempotente: só processa quem ainda não tem bio_texto.

Como rodar:
    python scripts/bio_wikipedia.py            # busca quem precisa
    python scripts/bio_wikipedia.py --force    # rebusca todos
"""

import sqlite3, requests, time, urllib.parse, sys, re, unicodedata

DB = "transparencia_rj.db"
TERMOS_POLITICOS = ("deputad", "senador", "vereador", "prefeit", "governador",
                    "ministr", "secretári", "polític", "partid", "presidente")

def norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

def slug_wiki(nome: str) -> str:
    """Converte 'Romeu Zema' → 'Romeu_Zema'."""
    # Capitaliza cada palavra (preservando acentos)
    palavras = nome.lower().split()
    palavras = [p.capitalize() for p in palavras]
    return urllib.parse.quote("_".join(palavras), safe="_-")

def buscar_wikipedia(sess: requests.Session, nome: str) -> str | None:
    """Tenta vários slugs e valida o resultado."""
    if not nome or len(nome) < 3: return None

    candidatos = [
        slug_wiki(nome),
        slug_wiki(nome) + "_(politico)",
        slug_wiki(nome) + "_(pol%C3%ADtico)",
    ]

    for slug in candidatos:
        try:
            r = sess.get(f"https://pt.wikipedia.org/api/rest_v1/page/summary/{slug}", timeout=3)
            if r.status_code != 200: continue
            d = r.json()
            extract = norm(d.get("extract", ""))
            if not extract or len(extract) < 50: continue

            # Validação: deve mencionar termo político ou ser pessoa
            extract_low = extract.lower()
            descr = (d.get("description") or "").lower()
            if any(t in extract_low or t in descr for t in TERMOS_POLITICOS):
                return extract
            time.sleep(0.1)  # só dorme após 200 OK
        except (requests.Timeout, requests.ConnectionError):
            # Falhas transitórias de rede: pula candidato, tenta próximo
            continue
        except Exception as e:
            # Erro inesperado (JSON malformado, parse, etc): log curto e continua
            print(f"  [wiki] erro em '{slug}': {type(e).__name__}: {str(e)[:80]}", file=sys.stderr)
    return None

def main():
    force = "--force" in sys.argv
    sess = requests.Session()
    sess.headers["User-Agent"] = "HorusRJ/1.0 (https://horus-rj.vercel.app)"
    sess.headers["Accept"] = "application/json"

    conn = sqlite3.connect(DB, timeout=30)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # Verifica que colunas existem
    cols = {r[1] for r in c.execute("PRAGMA table_info(politicos)").fetchall()}
    if "bio_texto" not in cols:
        print("[ERRO] coluna bio_texto não existe — rode scripts/enriquecer_politicos.py primeiro")
        return

    where = "(bio_texto IS NULL OR bio_texto = '')" if not force else "1=1"
    # COALESCE para NULL-safe: politicos sem cargo cadastrado nao sao perdidos pelo filtro
    c.execute(f"""
        SELECT id, nome, nome_urna FROM politicos
        WHERE {where}
          AND COALESCE(cargo, '') != 'Autor Coletivo'
          AND COALESCE(nome, '') NOT LIKE 'Sem inform%'
          AND COALESCE(nome, '') NOT LIKE 'COM.%'
          AND COALESCE(nome, '') NOT LIKE 'COMISSAO%'
          AND COALESCE(nome, '') NOT LIKE '%BANCADA%'
          AND COALESCE(nome, '') NOT LIKE 'RELATOR%'
          AND COALESCE(nome, '') NOT LIKE '%LIDER%'
    """)
    rows = c.fetchall()
    print(f"Total a buscar: {len(rows)}")

    encontrados = 0
    nao = 0

    for idx, row in enumerate(rows, 1):
        # Preferência: nome_urna (mais conciso, mais provável de bater com Wikipedia)
        nome_busca = row["nome_urna"] or row["nome"]
        # Pula nomes muito curtos ou em CAPS lock só (não capitalizam bem)
        if len(nome_busca) < 4:
            nao += 1
            continue

        extract = buscar_wikipedia(sess, nome_busca)
        if extract:
            # Limita a ~600 chars para não inchar o banco
            if len(extract) > 600:
                extract = extract[:597].rstrip() + "..."
            c.execute("UPDATE politicos SET bio_texto = ? WHERE id = ?", (extract, row["id"]))
            encontrados += 1
        else:
            nao += 1

        if idx % 50 == 0:
            conn.commit()
            print(f"  {idx}/{len(rows)} | encontrados: {encontrados} | sem-bio: {nao}")
        time.sleep(0.15)  # Respeitar rate limit Wikipedia

    conn.commit()
    conn.close()
    print(f"\n=== Resultado ===")
    print(f"  Encontrados: {encontrados}/{len(rows)}")
    print(f"  Não encontrados: {nao}")

if __name__ == "__main__":
    main()
