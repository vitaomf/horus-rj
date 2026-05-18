"""
coleta_parlamentares.py
Coleta todos os parlamentares federais em exercício:
  - 513 Deputados Federais via API da Câmara dos Deputados
  - 81 Senadores via API do Senado Federal

Salva/atualiza na tabela politicos com campos:
  nome, partido, cargo, uf, casa, id_camara, foto_url
"""
import sqlite3
import requests
import time
import os
import json

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "transparencia_rj.db")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
}

CAMARA_BASE = "https://dadosabertos.camara.leg.br/api/v2"
SENADO_BASE = "https://legis.senado.leg.br/dadosabertos"

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn

def upsert_parlamentar(cur, nome, partido, cargo, uf, casa, id_externo, foto_url):
    """INSERT ou UPDATE de parlamentar. Idempotente por (nome, casa)."""
    cur.execute("SELECT id FROM politicos WHERE nome = ? AND (casa = ? OR casa IS NULL)", (nome, casa))
    row = cur.fetchone()
    if row:
        cur.execute("""
            UPDATE politicos SET partido=?, cargo=?, uf=?, casa=?, id_camara=?, foto_url=?
            WHERE id=?
        """, (partido, cargo, uf, casa, id_externo, foto_url, row[0]))
    else:
        cur.execute("""
            INSERT OR IGNORE INTO politicos (nome, partido, cargo, uf, casa, id_camara, foto_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (nome, partido, cargo, uf, casa, id_externo, foto_url))

# ─── CÂMARA DOS DEPUTADOS ────────────────────────────────────────────────────

def coletar_deputados(cur):
    """Coleta todos os deputados em exercício via API da Câmara."""
    print("\n=== CÂMARA DOS DEPUTADOS ===")
    total = 0
    pagina = 1

    while True:
        try:
            r = requests.get(
                f"{CAMARA_BASE}/deputados",
                params={"itens": 100, "pagina": pagina, "ordem": "ASC", "ordenarPor": "nome"},
                headers=HEADERS,
                timeout=20,
            )
            r.raise_for_status()
            data = r.json().get("dados", [])
            if not data:
                break

            for dep in data:
                dep_id   = dep.get("id")
                nome     = dep.get("nome", "").strip()
                partido  = dep.get("siglaPartido", "")
                uf       = dep.get("siglaUf", "")
                foto_url = dep.get("urlFoto") or (f"https://www.camara.leg.br/internet/deputado/bandep/{dep_id}.jpg" if dep_id else None)

                if not nome:
                    continue

                upsert_parlamentar(cur, nome, partido, "Deputado Federal", uf, "camara", dep_id, foto_url)
                total += 1

            print(f"  Página {pagina}: {len(data)} deputados | Total: {total}")

            # Checa próxima página pelo header Link
            links = r.json().get("links", [])
            tem_proxima = any(l.get("rel") == "next" for l in links)
            if not tem_proxima or len(data) < 100:
                break

            pagina += 1
            time.sleep(0.5)

        except Exception as e:
            print(f"  ERRO página {pagina}: {e}")
            break

    print(f"Deputados coletados: {total}")
    return total

# ─── SENADO FEDERAL ──────────────────────────────────────────────────────────

def coletar_senadores(cur):
    """Coleta todos os senadores em exercício via API do Senado."""
    print("\n=== SENADO FEDERAL ===")
    total = 0

    try:
        # API do Senado retorna XML por padrão; forçar JSON com Accept header
        r = requests.get(
            f"{SENADO_BASE}/senador/lista/atual.json",
            headers=HEADERS,
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()

        senadores = (
            data
            .get("ListaParlamentarEmExercicio", {})
            .get("Parlamentares", {})
            .get("Parlamentar", [])
        )

        if not isinstance(senadores, list):
            senadores = [senadores]

        for s in senadores:
            id_sen   = s.get("IdentificacaoParlamentar", {})
            nome     = id_sen.get("NomeParlamentar", id_sen.get("NomeCompletoParlamentar", "")).strip()
            partido  = id_sen.get("SiglaPartidoParlamentar", "")
            uf       = id_sen.get("UfParlamentar", "")
            foto_url = id_sen.get("UrlFotoParlamentar")
            sen_id   = id_sen.get("CodigoParlamentar")

            if not nome:
                continue

            upsert_parlamentar(cur, nome, partido, "Senador", uf, "senado", sen_id, foto_url)
            total += 1

        print(f"Senadores coletados: {total}")

    except Exception as e:
        print(f"  ERRO ao coletar senadores: {e}")
        # Fallback: tenta endpoint alternativo
        try:
            r = requests.get(
                f"{SENADO_BASE}/senador/lista/atual",
                headers={**HEADERS, "Accept": "application/json"},
                timeout=20,
            )
            r.raise_for_status()
            data = r.json()
            senadores = data.get("ListaParlamentarEmExercicio", {}).get("Parlamentares", {}).get("Parlamentar", [])
            if not isinstance(senadores, list):
                senadores = [senadores]
            for s in senadores:
                id_sen = s.get("IdentificacaoParlamentar", {})
                nome = id_sen.get("NomeParlamentar", "").strip()
                partido = id_sen.get("SiglaPartidoParlamentar", "")
                uf = id_sen.get("UfParlamentar", "")
                foto_url = id_sen.get("UrlFotoParlamentar")
                sen_id = id_sen.get("CodigoParlamentar")
                if not nome:
                    continue
                upsert_parlamentar(cur, nome, partido, "Senador", uf, "senado", sen_id, foto_url)
                total += 1
            print(f"Senadores coletados (fallback): {total}")
        except Exception as e2:
            print(f"  ERRO fallback senadores: {e2}")

    return total

# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print(f"Banco: {DB_PATH}")
    conn = get_db()
    cur = conn.cursor()

    dep = coletar_deputados(cur)
    conn.commit()

    sen = coletar_senadores(cur)
    conn.commit()

    # Resumo
    cur.execute("SELECT casa, COUNT(*) FROM politicos WHERE casa IS NOT NULL GROUP BY casa")
    print("\n=== RESUMO ===")
    for row in cur.fetchall():
        print(f"  {row[0]}: {row[1]}")
    cur.execute("SELECT COUNT(*) FROM politicos WHERE uf IS NOT NULL AND uf != ''")
    print(f"  Total com UF: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM politicos WHERE foto_url IS NOT NULL")
    print(f"  Total com foto: {cur.fetchone()[0]}")

    conn.close()
    print(f"\nConcluído! Deputados: {dep} | Senadores: {sen}")

if __name__ == "__main__":
    main()
