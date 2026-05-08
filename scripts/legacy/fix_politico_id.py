import sqlite3
import requests
import json
import concurrent.futures
import threading

conn = sqlite3.connect('transparencia_rj.db', check_same_thread=False)
cur = conn.cursor()

# Get all unique emenda codes (status column) that need a politico_id
cur.execute("SELECT DISTINCT status FROM emendas WHERE politico_id IS NULL AND status != ''")
emendas_codes = [row[0] for row in cur.fetchall()]
total = len(emendas_codes)
print(f"Total unique emenda codes to fetch authors for: {total}")

API_BASE = "https://transparencia.gov.br/api-de-dados/emendas"
import os
headers = {"chave-api-dados": os.getenv("PORTAL_API_KEY", "")}

processed = 0
updated = 0
lock = threading.Lock()

def fetch_and_update(codigo_emenda):
    global processed, updated
    try:
        res = requests.get(API_BASE, params={"codigoEmenda": codigo_emenda}, headers=headers, timeout=10)
        res.raise_for_status()
        dados = res.json()
        
        if dados and len(dados) > 0:
            emenda_api = dados[0]
            nome_politico = emenda_api.get("autor", "Desconhecido")
            sigla_partido = emenda_api.get("siglaPartidoPolitico", None)
            
            with lock:
                # 1. Find or create politician
                cur.execute("SELECT id FROM politicos WHERE nome = ?", (nome_politico,))
                politico_row = cur.fetchone()
                
                if politico_row:
                    p_id = politico_row[0]
                else:
                    cur.execute("INSERT INTO politicos (nome, cargo, partido) VALUES (?, 'Parlamentar Federal', ?)", (nome_politico, sigla_partido))
                    p_id = cur.lastrowid
                
                # 2. Update all emendas with this code
                cur.execute("UPDATE emendas SET politico_id = ? WHERE status = ?", (p_id, codigo_emenda))
                conn.commit()
                updated += cur.rowcount
                
        with lock:
            processed += 1
            if processed % 50 == 0:
                print(f"Progress: {processed}/{total} (Updated {updated} records)")
                
    except Exception as e:
        with lock:
            processed += 1

# Using ThreadPool to highly accelerate API fetching
with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
    executor.map(fetch_and_update, emendas_codes)

print(f"\nFinished! Total Emendas updated: {updated}")
conn.close()
