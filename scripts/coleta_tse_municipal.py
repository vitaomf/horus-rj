"""
coleta_tse_municipal.py
Coleta prefeitos, vice-prefeitos e vereadores eleitos na eleição municipal 2024
a partir dos dados abertos do TSE (CSV consolidado).

Fluxo:
  1. Baixa ZIP consolidado da TSE (~50MB) em cache/tse_2024.zip
     (idempotente: se ZIP já existe e --force não foi passado, pula)
  2. Lê CSV streaming (Latin-1, separador ;) — sem carregar tudo em memória
  3. Filtra apenas cargos PREFEITO / VICE-PREFEITO / VEREADOR com situação ELEITO
  4. Insere/atualiza tabela eleitos_municipais via INSERT OR REPLACE
  5. URL da foto é construída a partir do SQ_CANDIDATO (padrão TSE)

Espera-se ~70.000 registros eleitos. Tempo total: 5-15min em máquina normal.

Uso:
    python scripts/coleta_tse_municipal.py
    python scripts/coleta_tse_municipal.py --force    # re-baixa ZIP e recoleta
    python scripts/coleta_tse_municipal.py --uf RJ    # apenas uma UF
"""
import os, sys, csv, zipfile, sqlite3, time, urllib.request

ROOT      = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH   = os.path.join(ROOT, "transparencia_rj.db")
CACHE_DIR = os.path.join(ROOT, "cache")
ZIP_PATH  = os.path.join(CACHE_DIR, "tse_2024.zip")

URL_ZIP = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2024.zip"

CARGOS_MAP = {
    'PREFEITO':       'prefeito',
    'VICE-PREFEITO':  'vice_prefeito',
    'VEREADOR':       'vereador',
}

# Situações de eleito (DS_SIT_TOT_TURNO)
SITUACOES_ELEITO = {
    'ELEITO', 'ELEITO POR QP', 'ELEITO POR MÉDIA',
    '#NULO#', '#NE#',  # placeholders — vamos filtrar antes pelo "ELEITO" prefix
}


def baixar_zip(force: bool = False) -> bool:
    """Baixa o ZIP da TSE se ainda não existir. Retorna True se OK."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    if not force and os.path.exists(ZIP_PATH) and os.path.getsize(ZIP_PATH) > 1_000_000:
        print(f"[OK] ZIP já existe ({os.path.getsize(ZIP_PATH) / 1e6:.1f} MB) — pulando download")
        return True

    print(f"[..] Baixando {URL_ZIP}")
    print(f"[..] Destino: {ZIP_PATH}")
    inicio = time.time()
    try:
        req = urllib.request.Request(URL_ZIP, headers={"User-Agent": "Horus/1.0"})
        with urllib.request.urlopen(req, timeout=120) as resp:
            tamanho_esperado = int(resp.headers.get("Content-Length", "0"))
            print(f"[..] Tamanho: {tamanho_esperado / 1e6:.1f} MB" if tamanho_esperado else "[..] Tamanho: ?")
            baixado = 0
            with open(ZIP_PATH, "wb") as f:
                while True:
                    bloco = resp.read(64 * 1024)
                    if not bloco:
                        break
                    f.write(bloco)
                    baixado += len(bloco)
                    if tamanho_esperado:
                        pct = 100 * baixado / tamanho_esperado
                        if int(pct) % 10 == 0:
                            print(f"    {pct:5.1f}%  {baixado / 1e6:.1f} MB", end="\r")
        print(f"\n[OK] Download concluido em {time.time() - inicio:.0f}s")
        return True
    except Exception as e:
        print(f"\n[ERRO] Download falhou: {e}")
        if os.path.exists(ZIP_PATH):
            os.remove(ZIP_PATH)
        return False


def construir_foto_url(uf: str, sq_candidato: str) -> str:
    """Padrão TSE para URL da foto. 2045202024 = ID da eleição municipal 2024."""
    return f"https://divulgacandcontas.tse.jus.br/divulga/rest/arquivo/img/2045202024/{sq_candidato}/{uf}"


def importar_csv(uf_filtro: str | None = None) -> dict:
    """Lê o ZIP, filtra eleitos municipais e insere no banco."""
    if not os.path.exists(ZIP_PATH):
        print("[ERRO] ZIP nao encontrado. Rode com --force ou sem flags primeiro.")
        return {}

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    cur  = conn.cursor()

    contadores = {'prefeito': 0, 'vice_prefeito': 0, 'vereador': 0, 'lidos': 0, 'pulados': 0}
    inicio = time.time()

    with zipfile.ZipFile(ZIP_PATH) as z:
        # Procura por consulta_cand_2024_BRASIL.csv ou consulta_cand_2024_{UF}.csv
        csvs = [n for n in z.namelist() if n.lower().endswith('.csv')]
        if not csvs:
            print(f"[ERRO] Nenhum CSV no ZIP. Conteudo: {z.namelist()[:5]}")
            return contadores

        for nome_csv in csvs:
            # Se filtro UF foi passado, pula CSVs de outras UFs
            if uf_filtro and f"_{uf_filtro.upper()}." not in nome_csv and "_BRASIL." not in nome_csv:
                continue

            print(f"\n[..] Processando {nome_csv}")
            with z.open(nome_csv) as raw:
                # CSV TSE: Latin-1, separador ;, com aspas
                texto = raw.read().decode("latin-1")
                reader = csv.DictReader(texto.splitlines(), delimiter=";")

                conn.execute("BEGIN TRANSACTION")
                try:
                    for linha in reader:
                        contadores['lidos'] += 1

                        cargo_raw  = (linha.get("DS_CARGO") or "").strip().upper()
                        cargo_slug = CARGOS_MAP.get(cargo_raw)
                        if not cargo_slug:
                            continue  # ignora cargos federais/estaduais nesse coletor

                        situacao = (linha.get("DS_SIT_TOT_TURNO") or "").strip().upper()
                        if not situacao.startswith("ELEITO"):
                            continue

                        uf = (linha.get("SG_UF") or "").strip().upper()
                        if uf_filtro and uf != uf_filtro.upper():
                            continue

                        municipio   = (linha.get("NM_UE") or "").strip().upper()
                        nome        = (linha.get("NM_CANDIDATO") or "").strip().upper()
                        nome_urna   = (linha.get("NM_URNA_CANDIDATO") or "").strip().upper()
                        partido     = (linha.get("SG_PARTIDO") or "").strip().upper()
                        sq          = (linha.get("SQ_CANDIDATO") or "").strip()
                        numero_str  = (linha.get("NR_CANDIDATO") or "").strip()
                        try:
                            numero = int(numero_str) if numero_str.isdigit() else None
                        except (ValueError, TypeError):
                            numero = None

                        if not nome or not sq or not uf or not municipio:
                            contadores['pulados'] += 1
                            continue

                        foto_url = construir_foto_url(uf, sq)
                        mandato  = "2025-2028" if cargo_slug in ('prefeito', 'vice_prefeito') else "2025-2028"

                        cur.execute("""
                            INSERT INTO eleitos_municipais
                              (uf, municipio, cargo, nome, nome_urna, partido, numero,
                               foto_url, ano_eleicao, mandato, sq_candidato, sigla_situacao)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2024, ?, ?, ?)
                            ON CONFLICT(sq_candidato, ano_eleicao) DO UPDATE SET
                              nome=excluded.nome, nome_urna=excluded.nome_urna,
                              partido=excluded.partido, foto_url=excluded.foto_url,
                              sigla_situacao=excluded.sigla_situacao
                        """, (uf, municipio, cargo_slug, nome, nome_urna, partido,
                              numero, foto_url, mandato, sq, situacao))
                        contadores[cargo_slug] += 1

                        # Log a cada 5000 inserções
                        total_insercoes = sum(contadores[k] for k in ('prefeito','vice_prefeito','vereador'))
                        if total_insercoes > 0 and total_insercoes % 5000 == 0:
                            print(f"    {total_insercoes:6d} eleitos | "
                                  f"prefeito={contadores['prefeito']} "
                                  f"vice={contadores['vice_prefeito']} "
                                  f"vereador={contadores['vereador']} | "
                                  f"decorrido {(time.time() - inicio)/60:.1f}min")

                    conn.commit()
                except Exception as e:
                    conn.rollback()
                    print(f"[ERRO] Falha ao processar CSV: {e}")
                    raise

    conn.close()
    print(f"\n[OK] Coleta concluida em {(time.time() - inicio)/60:.1f}min")
    print(f"     Linhas lidas:    {contadores['lidos']:>8}")
    print(f"     Prefeitos:       {contadores['prefeito']:>8}")
    print(f"     Vice-prefeitos:  {contadores['vice_prefeito']:>8}")
    print(f"     Vereadores:      {contadores['vereador']:>8}")
    print(f"     Pulados (dados): {contadores['pulados']:>8}")
    return contadores


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
