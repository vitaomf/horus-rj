import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "transparencia_rj.db")

def check_data():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    
    # Check campanhas for Altineu (ID 37)
    campanhas = conn.execute("SELECT * FROM campanhas WHERE politico_id = 37").fetchall()
    print("--- CAMPANHAS (ID 37) ---")
    for row in campanhas:
        print(dict(row))
    
    if campanhas:
        campanha_id = campanhas[0]['id']
        doadores = conn.execute("SELECT * FROM doadores WHERE campanha_id = ?", (campanha_id,)).fetchall()
        print("\n--- DOADORES ---")
        for row in doadores:
            print(dict(row))
    
    # Check any other politician that might have data
    others = conn.execute("SELECT * FROM campanhas WHERE total_receitas > 0 LIMIT 5").fetchall()
    print("\n--- OUTRAS CAMPANHAS COM VALOR > 0 ---")
    for row in others:
        print(dict(row))
        
    conn.close()

if __name__ == "__main__":
    check_data()
