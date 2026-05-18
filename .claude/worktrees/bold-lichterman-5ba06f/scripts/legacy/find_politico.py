import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "transparencia_rj.db")

def find_altineu():
    conn = sqlite3.connect(DB_PATH)
    res = conn.execute("SELECT id, nome FROM politicos WHERE nome LIKE '%ALTINEU%'").fetchall()
    print(res)
    conn.close()

if __name__ == "__main__":
    find_altineu()
