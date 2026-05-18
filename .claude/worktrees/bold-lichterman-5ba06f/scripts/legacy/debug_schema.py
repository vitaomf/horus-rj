import sqlite3
conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()
cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='emendas'")
print(cur.fetchone()[0])
conn.close()
