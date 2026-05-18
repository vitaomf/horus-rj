import sqlite3
conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM emendas WHERE politico_id IS NULL")
print("Null politico_id:", cur.fetchone())
cur.execute("SELECT COUNT(*) FROM emendas WHERE politico_id IS NOT NULL")
print("Not null politico_id:", cur.fetchone())
conn.close()
