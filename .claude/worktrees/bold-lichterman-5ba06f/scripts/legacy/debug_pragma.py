import sqlite3
conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()
print("--- EMENDAS ---")
cur.execute('PRAGMA table_info(emendas)')
for row in cur.fetchall():
    print(row)
print("\n--- POLITICOS ---")
cur.execute('PRAGMA table_info(politicos)')
for row in cur.fetchall():
    print(row)
conn.close()
