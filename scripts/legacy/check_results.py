import sqlite3
import urllib.request
import json
import time

max_retries = 3
for _ in range(max_retries):
    try:
        req = urllib.request.Request('http://127.0.0.1:7291/api/estatisticas', headers={'Accept': 'application/json'})
        with urllib.request.urlopen(req) as response:
            print("=== /api/estatisticas ===")
            print(json.dumps(json.loads(response.read().decode()), indent=2))
        
        req2 = urllib.request.Request('http://127.0.0.1:7291/api/politicos/total', headers={'Accept': 'application/json'})
        with urllib.request.urlopen(req2) as response:
            print("\n=== /api/politicos/total ===")
            print(json.dumps(json.loads(response.read().decode()), indent=2))
            
        req3 = urllib.request.Request('http://127.0.0.1:7291/api/emendas/total', headers={'Accept': 'application/json'})
        with urllib.request.urlopen(req3) as response:
            print("\n=== /api/emendas/total ===")
            print(json.dumps(json.loads(response.read().decode()), indent=2))
        
        break
    except Exception as e:
        print(f"Wait... {e}")
        time.sleep(2)

print("\n=== DUMP DIRETO DO SQLITE ===")
conn = sqlite3.connect('transparencia_rj.db')
c = conn.cursor()
c.execute("SELECT COUNT(*), SUM(valor) FROM emendas")
emendas_row = c.fetchone()
print(f"Total Emendas BD: {emendas_row[0]}")
print(f"Soma Valor BD: R$ {emendas_row[1]:,.2f}")

c.execute("SELECT COUNT(*) FROM politicos")
print(f"Total Políticos BD: {c.fetchone()[0]}")
conn.close()
