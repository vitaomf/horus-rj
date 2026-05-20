"""
Busca fotos de parlamentares faltantes via APIs da Câmara e do Senado.
Estratégia:
  1. Baixa lista completa de deputados de todas as legislaturas (52-57)
  2. Baixa lista completa de senadores (legislaturas recentes)
  3. Faz match por nome normalizado
  4. Atualiza foto_url no banco
"""

import sqlite3
import requests
import time
import re
import sys
from difflib import SequenceMatcher

DB = "transparencia_rj.db"
SESSION = requests.Session()
SESSION.headers.update({"Accept": "application/json", "User-Agent": "Horus/1.0"})

def normalizar(nome: str) -> str:
    """Remove acentos, lowercase, strip."""
    import unicodedata
    s = unicodedata.normalize("NFD", (nome or "").upper())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"\s+", " ", s).strip()
    return s

def similaridade(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()

# ── 1. Câmara: busca por todas as legislaturas ────────────────────────────────

def buscar_deputados_camara() -> dict[str, str]:
    """Retorna {nome_normalizado: foto_url} para todos os deputados históricos."""
    mapping = {}
    legislaturas = [52, 53, 54, 55, 56, 57]
    for leg in legislaturas:
        pagina = 1
        total_pages = 1
        while pagina <= total_pages:
            try:
                r = SESSION.get(
                    "https://dadosabertos.camara.leg.br/api/v2/deputados",
                    params={"idLegislatura": leg, "itens": 100, "pagina": pagina,
                            "ordem": "ASC", "ordenarPor": "nome"},
                    timeout=20,
                )
                r.raise_for_status()
                data = r.json()
                deputados = data.get("dados", [])
                links = data.get("links", [])

                for d in deputados:
                    nome_norm = normalizar(d.get("nome", ""))
                    uri = d.get("uri", "")
                    dep_id = uri.rstrip("/").split("/")[-1] if uri else str(d.get("id", ""))
                    if dep_id:
                        foto = f"https://www.camara.leg.br/internet/deputado/bandep/{dep_id}.jpg"
                        mapping[nome_norm] = foto
                        # Também mapeia pelo nome de urna se disponível
                        nome_urna = normalizar(d.get("nomeEleitoral", ""))
                        if nome_urna and nome_urna not in mapping:
                            mapping[nome_urna] = foto

                # Detecta última página
                has_next = any(l.get("rel") == "next" for l in links)
                if not has_next:
                    break
                pagina += 1
                time.sleep(0.1)
            except Exception as e:
                print(f"  [WARN] Câmara leg {leg} pág {pagina}: {e}")
                break

        print(f"  Câmara leg {leg}: {len(mapping)} mapeamentos acumulados")

    return mapping

# ── 2. Senado: busca senadores ────────────────────────────────────────────────

def buscar_senadores() -> dict[str, str]:
    """Retorna {nome_normalizado: foto_url} para senadores."""
    mapping = {}
    # Legislaturas: 53 (2007-11), 54 (2011-15), 55 (2015-19), 56 (2019-23), 57 (2023-)
    for leg in [53, 54, 55, 56, 57]:
        try:
            r = SESSION.get(
                f"https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/{leg}",
                headers={"Accept": "application/json"},
                timeout=20,
            )
            r.raise_for_status()
            data = r.json()
            # Estrutura: ListaParlamentarLegislatura > Parlamentares > Parlamentar[]
            parlamentares = (
                data.get("ListaParlamentarLegislatura", {})
                    .get("Parlamentares", {})
                    .get("Parlamentar", [])
            )
            for p in parlamentares:
                id_parl = p.get("IdentificacaoParlamentar", {})
                nome = id_parl.get("NomeParlamentar", "")
                nome_completo = id_parl.get("NomeCompletoParlamentar", "")
                codigo = id_parl.get("CodigoParlamentar", "")
                foto = id_parl.get("UrlFotoParlamentar", "")
                if not foto and codigo:
                    foto = f"https://www.senado.leg.br/senadores/img/fotos-oficiais/senador{codigo}.jpg"
                if foto:
                    for n in [nome, nome_completo]:
                        nn = normalizar(n)
                        if nn:
                            mapping[nn] = foto
            print(f"  Senado leg {leg}: {len(mapping)} mapeamentos acumulados")
            time.sleep(0.3)
        except Exception as e:
            print(f"  [WARN] Senado leg {leg}: {e}")

    return mapping

# ── 3. Match e update ─────────────────────────────────────────────────────────

def main():
    print("=== Busca de fotos de parlamentares ===\n")

    print("[1/3] Buscando deputados na API da Câmara...")
    mapa_camara = buscar_deputados_camara()
    print(f"  Total mapeado Câmara: {len(mapa_camara)}\n")

    print("[2/3] Buscando senadores na API do Senado...")
    mapa_senado = buscar_senadores()
    print(f"  Total mapeado Senado: {len(mapa_senado)}\n")

    mapa_total = {**mapa_camara, **mapa_senado}
    print(f"[3/3] Atualizando banco — {len(mapa_total)} fotos disponíveis para match\n")

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute("""
        SELECT id, nome FROM politicos
        WHERE (foto_url IS NULL OR foto_url = '')
          AND cargo != 'Autor Coletivo'
          AND nome != 'Sem informacao'
          AND nome IS NOT NULL
    """)
    sem_foto = c.fetchall()
    print(f"  Parlamentares sem foto: {len(sem_foto)}")

    atualizados = 0
    nao_encontrados = []

    for row in sem_foto:
        nome_norm = normalizar(row["nome"])

        # Exact match
        foto = mapa_total.get(nome_norm)

        # Partial match: nome de urna (primeiro sobrenome)
        if not foto:
            partes = nome_norm.split()
            if partes:
                ultimo = partes[-1]
                candidatos = [(k, v) for k, v in mapa_total.items() if ultimo in k]
                if len(candidatos) == 1:
                    foto = candidatos[0][1]
                elif len(candidatos) > 1:
                    # Pick highest similarity
                    melhor = max(candidatos, key=lambda x: similaridade(nome_norm, x[0]))
                    if similaridade(nome_norm, melhor[0]) > 0.75:
                        foto = melhor[1]

        if foto:
            c.execute("UPDATE politicos SET foto_url = ? WHERE id = ?", (foto, row["id"]))
            atualizados += 1
        else:
            nao_encontrados.append(row["nome"])

    conn.commit()
    conn.close()

    print(f"\n  Atualizados: {atualizados}")
    print(f"  Não encontrados: {len(nao_encontrados)}")
    if nao_encontrados[:20]:
        print("\n  Exemplos não encontrados:")
        for n in nao_encontrados[:20]:
            print(f"    - {n}")

    print("\n=== Concluído ===")

if __name__ == "__main__":
    main()
