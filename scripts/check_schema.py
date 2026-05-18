import sqlite3
conn = sqlite3.connect("transparencia_rj.db")
cur = conn.cursor()

# Schema real de cada tabela
tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
for (t,) in tables:
    print(f"\n=== {t} ===")
    cols = cur.execute(f"PRAGMA table_info({t})").fetchall()
    for c in cols:
        print(f"  col {c[1]} ({c[2]}) default={c[4]}")

conn.close()
