import requests
import sys
import os
import sqlite3
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from cache_manager import cache_existe, salvar_cache, carregar_cache, status_cache

# Padrões que identificam autores coletivos no campo "autor" da API.
# Bancadas, comissões e relatores não são parlamentares individuais e precisam
# ser segregados pra rankings/listagens públicas não ficarem distorcidos.
_AUTOR_COLETIVO_PATTERNS = (
    'BANCADA', 'COMISS', 'RELATOR', 'FRENTE',
    'ASSEMBL', 'EXECUTIVO', 'MINIST', 'COMITÊ', 'COMITE'
)

def _classificar_cargo(nome: str) -> str:
    """Decide se o autor da emenda é parlamentar individual ou autor coletivo."""
    upper = (nome or '').upper()
    if any(p in upper for p in _AUTOR_COLETIVO_PATTERNS):
        return 'Autor Coletivo'
    return 'Parlamentar Federal'

def processar_valor(valor_str):
    if not valor_str:
        return 0.0
    try:
        valor_limpo = valor_str.replace('.', '').replace(',', '.')
        return float(valor_limpo)
    except ValueError:
        return 0.0

import re as _re

def _extrair_uf(municipio: str) -> str:
    """Extrai sigla de UF de strings como 'NITERÓI - RJ' ou 'SÃO PAULO - SP'."""
    if not municipio:
        return ""
    s = municipio.upper().strip()
    m = _re.search(r'\s-\s([A-Z]{2})$', s)
    if m and m.group(1) not in ('UF',):
        return m.group(1)
    m = _re.search(r'\(([A-Z]{2})\)$', s)
    if m and m.group(1) not in ('UF',):
        return m.group(1)
    if _re.match(r'^[A-Z]{2}$', s):
        return s
    return ""

def processar_emendas_lote(dados, cursor, filtro_uf: str = ""):
    """Processa e insere emendas no banco.
    filtro_uf: se informado (ex: 'SP'), só processa emendas daquela UF.
    Vazio = processa todas as UFs.
    """
    insercoes = 0
    for emenda in dados:
        nm_municipio1 = emenda.get('nomeMunicipioConvenio') or ''
        nm_municipio2 = emenda.get('localidadeDoGasto') or ''
        nm_municipio = nm_municipio1 if nm_municipio1 else nm_municipio2

        # Extrai UF do município destino
        uf_emenda = _extrair_uf(nm_municipio)

        # Filtro por UF (quando passado via --uf)
        if filtro_uf and uf_emenda != filtro_uf.upper():
            continue

        # Ignora emendas sem município identificado
        if not nm_municipio.strip():
            continue

        nome_politico = emenda.get("autor", "Desconhecido")
        sigla_partido = emenda.get("siglaPartidoPolitico", None)

        cursor.execute("SELECT id FROM politicos WHERE nome = ?", (nome_politico,))
        resultado = cursor.fetchone()

        if resultado:
            politico_id = resultado[0]
        else:
            cargo = _classificar_cargo(nome_politico)
            cursor.execute("""
                INSERT INTO politicos (nome, cargo, partido)
                VALUES (?, ?, ?)
            """, (nome_politico, cargo, sigla_partido))
            politico_id = cursor.lastrowid

        ano_emenda = emenda.get("ano")

        valor_empenhado = processar_valor(
            emenda.get("valorEmpenhado") or emenda.get("valorEmenda") or "0,00"
        )
        valor_pago = processar_valor(
            emenda.get("valorPago") or emenda.get("valorLiquidado") or emenda.get("valorRestoPago") or "0,00"
        )
        valor = valor_empenhado if valor_empenhado > 0 else processar_valor(
            emenda.get("valorEmenda") or emenda.get("valorEmpenhado") or
            emenda.get("valorPago") or emenda.get("valorLiquidado") or
            emenda.get("valorRestoPago") or "0,00"
        )

        descricao = emenda.get("tipoEmenda", "")
        objetivo = emenda.get("funcao", "")
        municipio = nm_municipio
        codigo_emenda = emenda.get("codigoEmenda", "")
        fonte_url = f"https://portaldatransparencia.gov.br/emendas/detalhe?codigoEmenda={codigo_emenda}" if codigo_emenda else None

        cursor.execute("""
            INSERT OR IGNORE INTO emendas
            (politico_id, ano, valor, valor_empenhado, valor_pago,
             descricao, objetivo, municipio_destino, codigo_emenda, fonte_url, uf)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            politico_id, ano_emenda,
            valor, valor_empenhado, valor_pago,
            descricao, objetivo, municipio, codigo_emenda, fonte_url, uf_emenda
        ))

        if cursor.rowcount == 0 and (valor_empenhado > 0 or valor_pago > 0):
            cursor.execute("""
                UPDATE emendas
                SET valor_empenhado = ?, valor_pago = ?, uf = ?
                WHERE codigo_emenda = ? AND municipio_destino = ?
            """, (valor_empenhado, valor_pago, uf_emenda, codigo_emenda, municipio))

        if cursor.rowcount > 0:
            insercoes += 1
    return insercoes

def coletar_emendas(force_refresh: bool = False, filtro_uf: str = ""):
    load_dotenv()
    
    chave_api = os.getenv("CHAVE_API_PORTAL")
    if not chave_api:
        print("[ERRO] Chave da API não definida no arquivo .env.")
        sys.exit(1)

    url = "https://api.portaldatransparencia.gov.br/api-de-dados/emendas"
    # User-Agent de browser real pra contornar AWS WAF (bloqueia python-requests default)
    headers = {
        "chave-api-dados": chave_api,
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    db_path = "transparencia_rj.db"
    try:
        conn = sqlite3.connect(db_path, timeout=30)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys = ON")
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS politicos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT UNIQUE,
                cargo TEXT,
                partido TEXT
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS emendas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                politico_id INTEGER,
                ano INTEGER,
                valor REAL,
                valor_empenhado REAL DEFAULT 0,
                valor_pago REAL DEFAULT 0,
                descricao TEXT,
                objetivo TEXT,
                municipio_destino TEXT,
                codigo_emenda TEXT,
                fonte_url TEXT,
                UNIQUE(codigo_emenda, municipio_destino)
            )
        """)
        # Migração: adiciona colunas se o banco já existe sem elas
        for col, default in [("valor_empenhado", 0), ("valor_pago", 0)]:
            try:
                cursor.execute(f"ALTER TABLE emendas ADD COLUMN {col} REAL DEFAULT {default}")
            except sqlite3.OperationalError:
                pass  # coluna já existe
        conn.commit()
    except sqlite3.Error as e:
        print(f"[ERRO] Falha ao conectar ao banco ou criar a tabela em {db_path}: {e}")
        sys.exit(1)

    # Coleta desde 2010 (início das emendas parlamentares individualizadas no Portal)
    ANO_INICIO = int(os.getenv("COLETA_ANO_INICIO", "2010"))
    ANOS = list(range(ANO_INICIO, datetime.now().year + 1))
    resumo_por_ano = {}
    total_processado = 0
    total_inserido = 0
    
    label_uf = f" [{filtro_uf}]" if filtro_uf else " [NACIONAL]"
    print(f"Iniciando coleta de emendas multiplos anos{label_uf}...")
    status_cache(uf=filtro_uf)

    # Separar anos que precisam de coleta da API vs anos com cache
    anos_com_cache = []
    anos_sem_cache = []
    for ano in ANOS:
        if cache_existe(ano, force_refresh=force_refresh, uf=filtro_uf):
            anos_com_cache.append(ano)
        else:
            anos_sem_cache.append(ano)

    # Processar anos com cache (rápido, sequencial)
    for ano in anos_com_cache:
        print(f"[CACHE] Ano {ano} já coletado. Usando cache local.")
        dados_ano = carregar_cache(ano, uf=filtro_uf)

        conn.execute("BEGIN TRANSACTION")
        insercoes_ano = processar_emendas_lote(dados_ano, cursor, filtro_uf=filtro_uf)
        conn.commit()

        total_processado += len(dados_ano)
        total_inserido += insercoes_ano
        resumo_por_ano[ano] = insercoes_ano

    # Coletar anos sem cache em paralelo (threads)
    def coletar_ano_api(ano):
        """Coleta um ano inteiro da API e retorna os dados brutos."""
        pagina_atual = 1
        dados_coletados = []
        
        while True:
            params = {
                "anoEmenda": ano,
                "pagina": pagina_atual
            }
        
            try:
                if pagina_atual % 5 == 1 or pagina_atual == 1:
                    print(f"  [THREAD] Ano {ano} | Página {pagina_atual}")
                    
                response = requests.get(url, params=params, headers=headers, timeout=15)
                response.raise_for_status()
                
                dados = response.json()
                
                if not dados or not isinstance(dados, list):
                    print(f"  [THREAD] Ano {ano} | Fim na página {pagina_atual}")
                    break
                    
                dados_coletados.extend(dados)
                pagina_atual += 1
                time.sleep(0.3)
            
            except requests.exceptions.RequestException as e:
                print(f"  [THREAD] Ano {ano} | ERRO página {pagina_atual}: {e}")
                break

        return ano, dados_coletados

    if anos_sem_cache:
        tempo_inicio = time.time()
        total_anos   = len(anos_sem_cache)
        concluidos   = 0
        print(f"\n[>>] Coletando {total_anos} ano(s) em paralelo: {anos_sem_cache}")
        # Máximo 3 threads simultâneas para não estourar rate limit da API
        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {executor.submit(coletar_ano_api, ano): ano for ano in anos_sem_cache}

            for future in as_completed(futures):
                ano, dados_coletados = future.result()
                concluidos += 1
                tempo_decorrido = time.time() - tempo_inicio
                eta = (tempo_decorrido / concluidos) * (total_anos - concluidos) if concluidos < total_anos else 0

                if dados_coletados:
                    # Inserção no banco é sequencial (SQLite não suporta escrita paralela)
                    conn.execute("BEGIN TRANSACTION")
                    insercoes_ano = processar_emendas_lote(dados_coletados, cursor, filtro_uf=filtro_uf)
                    conn.commit()

                    salvar_cache(ano, dados_coletados, uf=filtro_uf)

                    total_processado += len(dados_coletados)
                    total_inserido += insercoes_ano
                    resumo_por_ano[ano] = insercoes_ano
                    print(f"  [OK {concluidos:2d}/{total_anos}] Ano {ano}: {len(dados_coletados)} total | "
                          f"{insercoes_ano} inseridas | decorrido {tempo_decorrido/60:.1f}min | "
                          f"ETA {eta/60:.1f}min")
                else:
                    resumo_por_ano[ano] = 0
                    print(f"  [!! {concluidos:2d}/{total_anos}] Ano {ano}: nenhuma emenda encontrada | "
                          f"decorrido {tempo_decorrido/60:.1f}min | ETA {eta/60:.1f}min")
    else:
        print("\n[OK] Todos os anos ja possuem cache valido!")

    conn.close()
    
    print(f"\n--- Resumo Final Multiano ---")
    print(f"Total de emendas processadas da API/Cache: {total_processado}")
    print(f"Total de NOVAS emendas salvas no Banco de Dados: {total_inserido}")
    
    print("\nResumo por Ano:")
    resumo_str = " | ".join([f"{a}: {v} emendas" for a, v in sorted(resumo_por_ano.items())])
    print(resumo_str)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Coleta emendas parlamentares do Portal da Transparência")
    parser.add_argument("--force-refresh", action="store_true", help="Ignora cache permanente e recoleta todos os anos")
    parser.add_argument("--uf", default="", help="Filtra por UF (ex: SP, MG). Vazio = todas as UFs")
    args = parser.parse_args()
    coletar_emendas(force_refresh=args.force_refresh, filtro_uf=args.uf.upper())
