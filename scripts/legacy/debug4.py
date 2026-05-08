import sqlite3
conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()
cur.execute("SELECT p.nome, COUNT(*), SUM(e.valor) FROM emendas e JOIN politicos p ON e.politico_id = p.id WHERE e.municipio_destino = 'NITERÓI - RJ' GROUP BY p.nome ORDER BY SUM(e.valor) DESC LIMIT 5")
print(cur.fetchall())
conn.close()
