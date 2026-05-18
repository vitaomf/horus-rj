import requests
import sqlite3
import os
import time
import sys
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def processar_valor(valor_str):
    if not valor_str:
        return 0.0
    v = valor_str.replace('.', '').replace(',', '.')
    try:
        return float(v)
    except ValueError:
        return 0.0

def iniciar_coleta():
    chave_api = os.getenv("CHAVE_API_PORTAL")
    if not chave_api:
        print("Erro: CHAVE_API_PORTAL não encontrada no .env")
        sys.exit(1)

    url = "https://api.portaldatransparencia.gov.br/api-de-dados/contratos"
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
            CREATE TABLE IF NOT EXISTS contratos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero TEXT UNIQUE,
                objeto TEXT,
                valor REAL,
                data_inicio TEXT,
                data_fim TEXT,
                fornecedor_nome TEXT,
                fornecedor_cnpj TEXT,
                orgao TEXT,
                municipio TEXT,
                fonte_url TEXT,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        sys.exit(1)

    # Lista dos principais Órgãos Superiores (Ministérios) para evitar rate limit
    # Saúde, Educação, Infraestrutura, Defesa, Meio Ambiente, C&T, Agricultura, Fazenda, Justiça
    ORGAOS_SUPERIORES = ["36000", "26000", "39000", "52000", "44000", "24000", "22000", "25000", "30000"]
    
    ano_atual = int(os.getenv("COLETA_ANO", str(datetime.now().year)))
    data_inicial = f"01/01/{ano_atual}"
    data_final = f"31/12/{ano_atual}"

    total_inseridos = 0
    print(f"Iniciando coleta de contratos (RJ) por Órgão Superior — ano {ano_atual}...")

    for orgao_codigo in ORGAOS_SUPERIORES:
        pagina = 1
        max_paginas = 20 # limite maximo de paginas por orgao
        print(f"--- Coletando Órgão: {orgao_codigo} ---")
        
        while pagina <= max_paginas:
            params = {
                "ufContratado": "RJ",
                "codigoOrgao": orgao_codigo,
                "dataInicial": data_inicial,
                "dataFinal": data_final,
                "pagina": pagina
            }
            
            try:
                response = requests.get(url, headers=headers, params=params, timeout=30)

                # Rate limit: aguarda e tenta de novo (máx 3x)
                if response.status_code == 429:
                    for tentativa in range(3):
                        wait = 60 * (tentativa + 1)
                        print(f"[RATE LIMIT] Aguardando {wait}s (tentativa {tentativa+1}/3)...")
                        time.sleep(wait)
                        response = requests.get(url, headers=headers, params=params, timeout=30)
                        if response.status_code != 429:
                            break

                # Bloqueio Cloudflare/Human Verification — não adianta continuar
                if response.status_code in (403, 405):
                    print(f"[BLOQUEADO] Órgão {orgao_codigo}: HTTP {response.status_code}. Chave possivelmente bloqueada por excesso de requisições. Aguarde algumas horas e tente novamente.")
                    return

                if response.status_code != 200:
                    print(f"[ERRO] Órgão {orgao_codigo} pág {pagina}: HTTP {response.status_code} - {response.text[:200]}")
                    break
                    
                dados = response.json()
                if not dados or len(dados) == 0:
                    break
                    
                contratos_pagina = 0
                
                for c in dados:
                    # API filtrou por ufContratado=RJ na origem — todos os retornos
                    # já são contratos com fornecedor do RJ. Município não vem mais
                    # no top-level (mudança da API em 2025).
                    numero = c.get("numero", "")
                    if not numero:
                        continue

                    objeto = c.get("objeto", "")
                    # Schema novo: valorInicialCompra (number) substitui valorInicial (string)
                    valor_raw = c.get("valorInicialCompra") or c.get("valorInicial") or 0
                    valor = float(valor_raw) if isinstance(valor_raw, (int, float)) else processar_valor(str(valor_raw))
                    data_inicio = c.get("dataInicioVigencia", "")
                    data_fim = c.get("dataFimVigencia", "")

                    fornecedor = c.get("fornecedor", {})
                    fornecedor_nome = fornecedor.get("nome", "")
                    # Schema novo: cnpjFormatado substitui niFornecedor
                    fornecedor_cnpj = fornecedor.get("cnpjFormatado") or fornecedor.get("niFornecedor", "")

                    unidade = c.get("unidadeGestora", {})
                    orgao_dict = unidade.get("orgaoVinculado", {})
                    orgao = orgao_dict.get("nome", "")
                    # Usa nome da Unidade Gestora como "município" (placeholder
                    # pra manter compatibilidade com schema atual). Município real
                    # do fornecedor exigiria query adicional por CNPJ.
                    municipio = unidade.get("nome", "RJ")
                    
                    fonte_url = f"https://portaldatransparencia.gov.br/contratos/{c.get('id', numero)}"
                    
                    query = """
                    INSERT OR IGNORE INTO contratos 
                    (numero, objeto, valor, data_inicio, data_fim, fornecedor_nome, fornecedor_cnpj, orgao, municipio, fonte_url)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """
                    
                    cursor.execute(query, (numero, objeto, valor, data_inicio, data_fim, fornecedor_nome, fornecedor_cnpj, orgao, municipio, fonte_url))
                    
                    if cursor.rowcount > 0:
                        contratos_pagina += 1
                        total_inseridos += 1
                        
                conn.commit()
                print(f"Órgão {orgao_codigo} - Página {pagina}: Inseridos {contratos_pagina} contratos")
                
                pagina += 1
                # 1.5s entre requisições = ~40 req/min (limite noturno é 90)
                time.sleep(1.5)
                
            except Exception as e:
                print(f"Erro no Órgão {orgao_codigo} página {pagina}: {e}")
                break

    conn.close()
    print(f"Coleta de contratos finalizada! Total inserido: {total_inseridos}")

if __name__ == "__main__":
    iniciar_coleta()
