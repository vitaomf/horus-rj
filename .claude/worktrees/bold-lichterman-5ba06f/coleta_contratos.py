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
    headers = {
        "chave-api-dados": chave_api,
        "Accept": "application/json"
    }

    db_path = "transparencia_rj.db"
    try:
        conn = sqlite3.connect(db_path)
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
    
    ano_atual = datetime.now().year
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
                response = requests.get(url, headers=headers, params=params)
                
                if response.status_code != 200:
                    print(f"[ERRO] Órgão {orgao_codigo} pág {pagina}: HTTP {response.status_code} - {response.text[:200]}")
                    break
                    
                dados = response.json()
                if not dados or len(dados) == 0:
                    break
                    
                contratos_pagina = 0
                
                for c in dados:
                    municipio = c.get("municipioFornecedor", "")
                    nm_upper = municipio.upper() if municipio else ""
                    if not municipio or not (
                        ' - RJ' in nm_upper or
                        'RIO DE JANEIRO' in nm_upper or
                        nm_upper.endswith('(RJ)') or
                        nm_upper == 'RJ'
                    ):
                        continue
                        
                    numero = c.get("numero", "")
                    if not numero:
                        continue

                    objeto = c.get("objeto", "")
                    valor_str = c.get("valorInicial", "0,00")
                    valor = processar_valor(valor_str)
                    data_inicio = c.get("dataInicioVigencia", "")
                    data_fim = c.get("dataFimVigencia", "")
                    
                    fornecedor = c.get("fornecedor", {})
                    fornecedor_nome = fornecedor.get("nome", "")
                    fornecedor_cnpj = fornecedor.get("niFornecedor", "")
                    
                    orgao_dict = c.get("unidadeGestora", {}).get("orgaoVinculado", {})
                    orgao = orgao_dict.get("nome", "")
                    
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
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Erro no Órgão {orgao_codigo} página {pagina}: {e}")
                break

    conn.close()
    print(f"Coleta de contratos finalizada! Total inserido: {total_inseridos}")

if __name__ == "__main__":
    iniciar_coleta()
