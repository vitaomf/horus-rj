import sqlite3
conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()
cur.execute("SELECT municipio_destino, COUNT(*), SUM(valor) FROM emendas WHERE municipio_destino LIKE '% - RJ' GROUP BY municipio_destino LIMIT 5")
for row in cur.fetchall():
    print(row)
conn.close()
