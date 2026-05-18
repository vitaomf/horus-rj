import sqlite3
import requests
import json
import time
import os

conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()

# Get total unfixed records map
cur.execute("SELECT id, ano, valor FROM emendas WHERE politico_id IS NULL")
emendas_nulas = cur.fetchall()

print(f"Total de emendas órfãs: {len(emendas_nulas)}")

# Dicionário em memória: {(ano, valor_exato): politico_id}
cache_autores = {}

# 1. Carregar todos os politicos do banco para memória
cur.execute("SELECT id, UPPER(nome) FROM politicos")
politicos_db = {row[1]: row[0] for row in cur.fetchall()}

def get_politico_id(nome_autor, partido):
    nome_upper = nome_autor.strip().upper()
    if nome_upper in politicos_db:
        return politicos_db[nome_upper]
    
    # Se não existir, cria e atualiza cache em memória
    cur.execute("INSERT INTO politicos (nome, cargo, partido) VALUES (?, 'Parlamentar Federal', ?)", (nome_autor, partido))
    new_id = cur.lastrowid
    politicos_db[nome_upper] = new_id
    return new_id

API_BASE = "https://transparencia.gov.br/api-de-dados/emendas"
import os
headers = {"chave-api-dados": os.getenv("PORTAL_API_KEY", "")}

pagina = 1
emendas_mapeadas = 0

print("Buscando autores da API em blocos (paginação)...")

try:
    while True:
        params = {"anoEmenda": 2024, "codigoEstado": "RJ", "pagina": pagina}
        res = requests.get(API_BASE, params=params, headers=headers, timeout=15)
        res.raise_for_status()
        dados = res.json()
        
        if not dados:
            break
            
        for emenda in dados:
            valor_str = emenda.get("valorEmpenhado", "0,00").replace(".", "").replace(",", ".")
            try:
                valor = float(valor_str)
            except:
                valor = 0.0
                
            ano = emenda.get("ano")
            autor = emenda.get("autor", "Desconhecido")
            partido = emenda.get("siglaPartidoPolitico", None)
            
            p_id = get_politico_id(autor, partido)
            cache_autores[(ano, valor)] = p_id
            
        print(f"Página {pagina} mapeada. ({len(dados)} registros)")
        pagina += 1
        time.sleep(0.3)
except Exception as e:
    print(f"Erro na paginação: {e}")

print(f"Autores extraídos. Iniciando cruzamento local agressivo...")

atualizados = 0

conn.execute("BEGIN TRANSACTION")
for id_emenda, ano, valor in emendas_nulas:
    p_id = cache_autores.get((ano, valor))
    if p_id:
        cur.execute("UPDATE emendas SET politico_id = ? WHERE id = ?", (p_id, id_emenda))
        atualizados += 1

conn.commit()
print(f"\nFinalizado! {atualizados} emendas foram reconectadas aos seus políticos.")
conn.close()
