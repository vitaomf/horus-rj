"""
coleta_tse_estadual.py
Coleta governadores, vice-governadores, senadores e deputados eleitos
nas eleições GERAIS 2022 a partir dos dados abertos do TSE.

Espera-se ~1.700 registros eleitos (27 govs + 27 vices + 81 senadores + 513 deputados federais + ~1.059 estaduais).

Uso:
    python scripts/coleta_tse_estadual.py
    python scripts/coleta_tse_estadual.py --force
    python scripts/coleta_tse_estadual.py --uf RJ
"""
import os, sys, csv, zipfile, sqlite3, time, urllib.request

ROOT      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH   = os.path.join(ROOT, "transparencia_rj.db")
CACHE_DIR = os.path.join(ROOT, "cache")
ZIP_PATH  = os.path.join(CACHE_DIR, "tse_2022.zip")

URL_ZIP = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip"

# Mapeamento DS_CARGO TSE → slug interno
CARGOS_MAP = {
    'PRESIDENTE':         'presidente',
    'VICE-PRESIDENTE':    'vice_presidente',
    'GOVERNADOR':         'governador',
    'VICE-GOVERNADOR':    'vice_governador',
    'SENADOR':            'senador',
    'DEPUTADO FEDERAL':   'deputado_federal',
    'DEPUTADO ESTADUAL':  'deputado_estadual',
    'DEPUTADO DISTRITAL': 'deputado_estadual',  # DF
}


def baixar_zip(force: bool = False) -> bool:
    os.makedirs(CACHE_DIR, exist_ok=True)
    if not force and os.path.exists(ZIP_PATH) and os.path.getsize(ZIP_PATH) > 1_000_000:
        print(f"[OK] ZIP ja existe ({os.path.getsize(ZIP_PATH) / 1e6:.1f} MB) - pulando download")
        return True

    print(f"[..] Baixando {URL_ZIP}")
    inicio = time.time()
    try:
        req = urllib.request.Request(URL_ZIP, headers={"User-Agent": "Horus/1.0"})
        with urllib.request.urlopen(req, timeout=120) as resp:
            tam = int(resp.headers.get("Content-Length", "0"))
            print(f"[..] Tamanho: {tam / 1e6:.1f} MB")
            baixado = 0
            with open(ZIP_PATH, "wb") as f:
                while True:
                    bloco = resp.read(64 * 1024)
                    if not bloco:
                        break
                    f.write(bloco)
                    baixado += len(bloco)
                    if tam and int(100 * baixado / tam) % 10 == 0:
                        print(f"    {100 * baixado / tam:5.1f}%", end="\r")
        print(f"\n[OK] Download em {time.time() - inicio:.0f}s")
        return True
    except Exception as e:
        print(f"\n[ERRO] {e}")
        if os.path.exists(ZIP_PATH):
            os.remove(ZIP_PATH)
        return False


def foto_url(uf: str, sq_candidato: str) -> str:
    """Padrão TSE para URL da foto. 2040602022 = ID da eleição geral 2022."""
    return f"https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/2040602022/{sq_candidato}/{uf}"


def importar_csv(uf_filtro: str | None = None):
    if not os.path.exists(ZIP_PATH):
        print("[ERRO] ZIP nao encontrado.")
        return

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    cur  = conn.cursor()

    inicio = time.time()
    contadores = {slug: 0 for slug in set(CARGOS_MAP.values())}
    contadores['lidos'] = 0

    with zipfile.ZipFile(ZIP_PATH) as z:
        csvs = [n for n in z.namelist() if n.lower().endswith('.csv')]
        if not csvs:
            print(f"[ERRO] Nenhum CSV. Conteudo: {z.namelist()[:5]}")
            return

        for nome_csv in csvs:
            # Só queremos o BRASIL.csv (evita duplicação com por-UF)
            if "BRASIL" not in nome_csv.upper():
                continue

            print(f"\n[..] Processando {nome_csv}")
            with z.open(nome_csv) as raw:
                texto = raw.read().decode("latin-1")
                reader = csv.DictReader(texto.splitlines(), delimiter=";")

                conn.execute("BEGIN TRANSACTION")
                try:
                    for linha in reader:
                        contadores['lidos'] += 1

                        cargo_raw  = (linha.get("DS_CARGO") or "").strip().upper()
                        cargo_slug = CARGOS_MAP.get(cargo_raw)
                        if not cargo_slug:
                            continue
                        if cargo_slug in ('presidente', 'vice_presidente'):
                            continue  # Lula/Alckmin já hardcoded

                        situacao = (linha.get("DS_SIT_TOT_TURNO") or "").strip().upper()
                        if not situacao.startswith("ELEITO"):
                            continue

                        uf = (linha.get("SG_UF") or "").strip().upper()
                        if uf_filtro and uf != uf_filtro.upper():
                            continue

                        nome      = (linha.get("NM_CANDIDATO") or "").strip().upper()
                        nome_urna = (linha.get("NM_URNA_CANDIDATO") or "").strip().upper()
                        partido   = (linha.get("SG_PARTIDO") or "").strip().upper()
                        sq        = (linha.get("SQ_CANDIDATO") or "").strip()
                        numero_str = (linha.get("NR_CANDIDATO") or "").strip()
                        try:
                            numero = int(numero_str) if numero_str.isdigit() else None
                        except (ValueError, TypeError):
                            numero = None

                        if not nome or not sq or not uf:
                            continue

                        mandato = "2023-2026" if cargo_slug != 'senador' else "2023-2030"

                        cur.execute("""
                            INSERT INTO eleitos_estaduais
                              (uf, cargo, nome, nome_urna, partido, numero,
                               foto_url, ano_eleicao, mandato, sq_candidato, sigla_situacao)
                            VALUES (?, ?, ?, ?, ?, ?, ?, 2022, ?, ?, ?)
                            ON CONFLICT(sq_candidato, ano_eleicao) DO UPDATE SET
                              nome=excluded.nome, nome_urna=excluded.nome_urna,
                              partido=excluded.partido, foto_url=excluded.foto_url,
                              sigla_situacao=excluded.sigla_situacao
                        """, (uf, cargo_slug, nome, nome_urna, partido, numero,
                              foto_url(uf, sq), mandato, sq, situacao))
                        contadores[cargo_slug] += 1

                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    print(f"[ERRO] {e}")
                    raise

    conn.close()
    print(f"\n[OK] Concluido em {(time.time() - inicio):.1f}s")
    print(f"     Linhas lidas:           {contadores['lidos']:>6}")
    for slug in ['governador', 'vice_governador', 'senador', 'deputado_federal', 'deputado_estadual']:
        print(f"     {slug:<20}    {contadores.get(slug, 0):>6}")


def main():
    force      = "--force" in sys.argv
    uf_filtro  = None
    if "--uf" in sys.argv:
        idx = sys.argv.index("--uf")
        if idx + 1 < len(sys.argv):
            uf_filtro = sys.argv[idx + 1].upper()
            print(f"Filtro UF: {uf_filtro}")

    if not baixar_zip(force=force):
        sys.exit(1)
    importar_csv(uf_filtro=uf_filtro)


if __name__ == "__main__":
    main()
