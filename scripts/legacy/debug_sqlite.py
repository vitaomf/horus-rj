import sqlite3
conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()
cur.execute('SELECT municipio_destino, COUNT(*) FROM emendas GROUP BY municipio_destino LIMIT 10')
for row in cur.fetchall():
    print(row)
conn.close()
