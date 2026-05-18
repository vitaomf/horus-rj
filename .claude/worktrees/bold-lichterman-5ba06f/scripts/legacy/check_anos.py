import sqlite3
conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()
cur.execute('SELECT DISTINCT ano FROM emendas ORDER BY ano')
print('Anos no banco:', [r[0] for r in cur.fetchall()])
conn.close()
