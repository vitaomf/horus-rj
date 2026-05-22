"""
Coleta dados de votos do TSE para cada candidato eleito.

Para cada candidato eleito presente em eleitos_estaduais/eleitos_municipais,
busca quantos votos recebeu em cada município/zona.

Fonte: https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/

Schema da tabela votos_candidato:
  sq_candidato TEXT   -- chave do TSE (presente em eleitos_*)
  ano INTEGER
  uf TEXT
  municipio TEXT
  zona INTEGER
  votos INTEGER

Como rodar:
    python scripts/coleta_votos_tse.py            # baixa + processa 2022 e 2024
    python scripts/coleta_votos_tse.py --ano 2024 # só um ano
"""

import sqlite3, requests, zipfile, csv, io, os, sys, time

DB = "transparencia_rj.db"
CACHE_DIR = "cache/tse"

# Layout 2018+ documentado em:
# https://www.tse.jus.br/eleicoes/estatisticas/repositorio-de-dados-eleitorais
# Colunas relevantes (separador ';', encoding latin-1):
COLS = {
    "ANO_ELEICAO": "ano",
    "SG_UF": "uf",
    "NM_MUNICIPIO": "municipio",
    "NR_ZONA": "zona",
    "SQ_CANDIDATO": "sq_candidato",
    "QT_VOTOS_NOMINAIS": "votos",
    "DS_SIT_TOT_TURNO": "situacao",
}

def baixar(ano: int) -> str:
    """Baixa o ZIP do TSE para o ano, retorna caminho local."""
    url = f"https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_{ano}.zip"
    os.makedirs(CACHE_DIR, exist_ok=True)
    out = f"{CACHE_DIR}/votacao_{ano}.zip"
    if os.path.exists(out) and os.path.getsize(out) > 1_000_000:
        print(f"  [cache] {out} já existe ({os.path.getsize(out)/1e6:.0f}MB)")
        return out

    print(f"  Baixando {url}")
    with requests.get(url, stream=True, timeout=180) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        baixado = 0
        with open(out, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)
                baixado += len(chunk)
                if total:
                    pct = baixado * 100 // total
                    if baixado % (50 * 1024 * 1024) < 1024 * 1024:
                        print(f"    {baixado/1e6:.0f}/{total/1e6:.0f}MB ({pct}%)")
    print(f"  OK {out} ({os.path.getsize(out)/1e6:.0f}MB)")
    return out

def migrar(conn):
    """Cria tabela votos_candidato se não existir."""
    conn.execute("""
        CREATE TABLE IF NOT EXISTS votos_candidato (
            sq_candidato TEXT NOT NULL,
            ano INTEGER NOT NULL,
            uf TEXT NOT NULL,
            municipio TEXT NOT NULL,
            zona INTEGER,
            votos INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (sq_candidato, ano, uf, municipio, zona)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_votos_sq ON votos_candidato(sq_candidato)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_votos_uf_ano ON votos_candidato(uf, ano)")
    conn.commit()

def sqs_relevantes(conn) -> set[str]:
    """Retorna sq_candidato dos eleitos que temos no banco."""
    sqs = set()
    for tabela in ("eleitos_estaduais", "eleitos_municipais"):
        try:
            for r in conn.execute(f"SELECT DISTINCT sq_candidato FROM {tabela} WHERE sq_candidato IS NOT NULL"):
                if r[0]: sqs.add(str(r[0]))
        except Exception:
            pass
    return sqs

def _commit_retry(conn, batch, retries=10):
    """Tenta commit várias vezes em caso de DB locked."""
    for tentativa in range(retries):
        try:
            conn.execute("BEGIN IMMEDIATE")
            cur = conn.cursor()
            cur.executemany("""
                INSERT OR REPLACE INTO votos_candidato
                (sq_candidato, ano, uf, municipio, zona, votos)
                VALUES (?,?,?,?,?,?)
            """, batch)
            conn.commit()
            return True
        except sqlite3.OperationalError as e:
            if "locked" in str(e):
                time.sleep(2 + tentativa * 2)
                try: conn.rollback()
                except: pass
                continue
            raise
    print("    [WARN] falha após retries, pulando batch")
    return False

def processar_zip(zip_path: str, sqs_filtro: set[str], conn) -> int:
    """Processa ZIP do TSE filtrando apenas candidatos relevantes."""
    inseridos = 0
    cur = conn.cursor()

    with zipfile.ZipFile(zip_path) as z:
        csvs = [n for n in z.namelist() if n.endswith(".csv") and "BR" not in n.upper()]
        # BR = arquivo agregado nacional (redundante com per-UF)
        print(f"  {len(csvs)} arquivos CSV no ZIP (1 por UF)")

        for nome in csvs:
            with z.open(nome) as f:
                raw = io.TextIOWrapper(f, encoding="latin-1", newline="")
                reader = csv.DictReader(raw, delimiter=";")
                batch = []
                lidos = 0
                for row in reader:
                    lidos += 1
                    sq = row.get("SQ_CANDIDATO") or row.get("CD_CANDIDATO")
                    if not sq or sq not in sqs_filtro:
                        continue
                    try:
                        votos = int(row.get("QT_VOTOS_NOMINAIS") or 0)
                    except ValueError:
                        votos = 0
                    if votos == 0:
                        continue
                    batch.append((
                        sq,
                        int(row.get("ANO_ELEICAO") or 0),
                        row.get("SG_UF", ""),
                        row.get("NM_MUNICIPIO", ""),
                        int(row.get("NR_ZONA") or 0),
                        votos,
                    ))
                    if len(batch) >= 5000:
                        if _commit_retry(conn, batch):
                            inseridos += len(batch)
                        batch = []
                if batch:
                    if _commit_retry(conn, batch):
                        inseridos += len(batch)
                print(f"    {nome}: {lidos} linhas, +{inseridos} inseridos acumulado")
    return inseridos

def main():
    ano_arg = None
    if "--ano" in sys.argv:
        ano_arg = int(sys.argv[sys.argv.index("--ano") + 1])
    anos = [ano_arg] if ano_arg else [2022, 2024]

    print("=== Coleta de votos TSE ===\n")
    conn = sqlite3.connect(DB, timeout=120)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")
    migrar(conn)

    print("[1/3] Identificando candidatos relevantes (eleitos)")
    sqs = sqs_relevantes(conn)
    print(f"  {len(sqs)} sq_candidato únicos\n")

    for ano in anos:
        print(f"[ano {ano}]")
        zip_path = baixar(ano)
        n = processar_zip(zip_path, sqs, conn)
        print(f"  Inseridos {ano}: {n}\n")

    # Stats
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM votos_candidato")
    print(f"Total votos_candidato: {c.fetchone()[0]} linhas")
    c.execute("SELECT COUNT(DISTINCT sq_candidato) FROM votos_candidato")
    print(f"Candidatos únicos com votos: {c.fetchone()[0]}")
    conn.close()

if __name__ == "__main__":
    main()
