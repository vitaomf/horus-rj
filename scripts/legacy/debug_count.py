import sqlite3
conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM emendas")
print("Emendas no banco:", cur.fetchone()[0])
conn.close()
