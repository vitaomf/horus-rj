import sqlite3
conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()

# 1. Total de emendas no banco
cur.execute('SELECT COUNT(*) FROM emendas')
print('Total emendas:', cur.fetchone())

# 2. Exemplos com RJ
cur.execute("SELECT municipio_destino, valor FROM emendas WHERE municipio_destino LIKE '%RJ%' LIMIT 5")
print('Com RJ:', cur.fetchall())

# 3. Busca por Aperibe
cur.execute("SELECT municipio_destino, valor FROM emendas WHERE municipio_destino LIKE '%APERIB%'")
print('Aperibe:', cur.fetchall())

# 4. Primeiros 3 registros brutos
cur.execute('SELECT municipio_destino, valor, ano FROM emendas LIMIT 3')
print('Primeiros:', cur.fetchall())

conn.close()
