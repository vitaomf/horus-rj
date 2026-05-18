import sqlite3
import requests
import os
import time
from typing import List, Dict

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "transparencia_rj.db")
BASE_URL = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def fetch_json(url: str) -> Dict:
    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            return response.json()
        print(f"Erro ao buscar {url}: Status {response.status_code}")
    except Exception as e:
        print(f"Exceção ao buscar {url}: {e}")
    return {}

def get_candidates_list(ano: int, uf: str, cargo: int) -> List[Dict]:
    """Lista todos os candidatos do estado em um determinado ano e cargo."""
    # ID Eleição 2022 Geral: 2040602022
    eleicao_id = 2040602022 if ano == 2022 else 2045202024
    url = f"{BASE_URL}/candidatura/listar/{ano}/{uf}/{eleicao_id}/{cargo}/candidatos"
    data = fetch_json(url)
    return data.get('candidatos', [])

def get_candidate_summary(ano: int, uf: str, eleicao_id: int, sq_candidato: str) -> Dict:
    """Busca detalhes e resumo financeiro de um candidato específico."""
    url = f"{BASE_URL}/candidatura/buscar/{ano}/{uf}/{eleicao_id}/candidato/{sq_candidato}"
    return fetch_json(url)

def get_candidate_finances_consolidated(id_eleicao: int, ano: int, uf: str, cargo: int, nr_partido: int, nr_candidato: int, sq_candidato: str) -> Dict:
    """Busca o resumo financeiro consolidado do prestador de contas."""
    url = f"{BASE_URL}/prestador/consulta/{id_eleicao}/{ano}/{uf}/{cargo}/{nr_partido}/{nr_candidato}/{sq_candidato}"
    return fetch_json(url)

def get_top_doadores(id_eleicao: int, id_prestador: int, id_ultima_entrega: int) -> List[Dict]:
    """Busca o ranking de doadores (receitas)."""
    url = f"{BASE_URL}/prestador/consulta/receitas/{id_eleicao}/{id_prestador}/{id_ultima_entrega}/rank?pagina=1"
    data = fetch_json(url)
    if isinstance(data, list):
        return data
    return data.get('rankingDoadores', [])

def sync_tse_data():
    conn = get_db_connection()
    politicos = conn.execute("SELECT id, nome FROM politicos").fetchall()
    
    ano = 2022
    eleicao_id = 2040602022
    cargos = [6, 7] # 6: Federal, 7: Estadual
    
    all_tse_candidates = []
    for cargo in cargos:
        print(f"Buscando lista de candidatos RJ 2022 (Cargo {cargo}) no TSE...")
        all_tse_candidates.extend(get_candidates_list(ano, "RJ", cargo))
    
    if not all_tse_candidates:
        print("Nenhum candidato encontrado no TSE.")
        return

    # Mapeamento por nome para busca rápida
    name_map = {c['nomeCompleto'].upper(): c for c in all_tse_candidates}
    name_map_short = {c['nomeUrna'].upper(): c for c in all_tse_candidates}

    count_synced = 0
    for p in politicos:
        p_id = p['id']
        p_nome = p['nome'].upper()
        
        target = name_map.get(p_nome) or name_map_short.get(p_nome)
        
        if target:
            sq_candidato = target['id']
            print(f"Match encontrado: {p_nome} -> SQ: {sq_candidato}")
            
            # 1. Busca detalhes básicos e IDs de eleição/cargo
            details = get_candidate_summary(ano, "RJ", eleicao_id, sq_candidato)
            nr_partido = details.get('partido', {}).get('numero')
            nr_candidato = details.get('numero')
            cargo_id = details.get('cargo', {}).get('codigo')
            cargo_nome = details.get('cargo', {}).get('nome', 'N/A')
            situacao = details.get('descricaoSituacao', 'Desconhecido')

            if nr_partido and nr_candidato and cargo_id:
                # 2. Busca Financeiro Consolidado
                print(f"Buscando financeiro para {p_nome}...")
                fin_res = get_candidate_finances_consolidated(eleicao_id, ano, "RJ", cargo_id, nr_partido, nr_candidato, sq_candidato)
                
                # Extraindo valores do JSON complexo do TSE
                dados_consolidados = fin_res.get('dadosConsolidados', {})
                receitas = dados_consolidados.get('totalRecebido', 0)
                
                # Despesas podem vir em diferentes campos, pegamos o contratado que é o mais comum
                despesas_info = fin_res.get('despesas', {})
                despesas = despesas_info.get('totalDespesasContratadas', 0)
                
                # IDs para o ranking de doadores
                id_prestador = fin_res.get('idPrestador')
                id_ultima_entrega = fin_res.get('idUltimaEntrega')

                # Salva na tabela campanhas (Limpa anterior para este parlamentar se existir)
                conn.execute("DELETE FROM doadores WHERE campanha_id IN (SELECT id FROM campanhas WHERE politico_id = ?)", (p_id,))
                conn.execute("DELETE FROM campanhas WHERE politico_id = ?", (p_id,))
                
                cur = conn.execute("""
                    INSERT INTO campanhas (politico_id, ano, cargo, total_receitas, total_despesas, situacao)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (p_id, 2022, cargo_nome, receitas, despesas, situacao))
                campanha_id = cur.lastrowid

                # 3. Busca Doadores (Ranking)
                if id_prestador and id_ultima_entrega and campanha_id:
                    print(f"Buscando ranking de doadores para {p_nome}...")
                    doadores_ranking = get_top_doadores(eleicao_id, id_prestador, id_ultima_entrega)
                    
                    for doador in doadores_ranking[:5]:
                        conn.execute("""
                            INSERT INTO doadores (campanha_id, nome_doador, documento_doador, valor)
                            VALUES (?, ?, ?, ?)
                        """, (campanha_id, doador.get('nomeDoador'), doador.get('cpfCnpjDoador'), doador.get('totalRecebido')))
                
                count_synced += 1
                conn.commit()
                time.sleep(1.2) # Respeitando o TSE

    conn.commit()
    conn.close()
    print(f"Sincronização concluída. {count_synced} políticos atualizados com dados de campanha.")

if __name__ == "__main__":
    sync_tse_data()
