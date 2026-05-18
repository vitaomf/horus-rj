import sqlite3
conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()
cur.execute("SELECT id, politico_id FROM emendas WHERE municipio_destino = 'NITERÓI - RJ' LIMIT 5")
print("Emendas (Niterói):", cur.fetchall())
cur.execute("SELECT id, nome FROM politicos LIMIT 5")
print("Políticos:", cur.fetchall())
conn.close()
