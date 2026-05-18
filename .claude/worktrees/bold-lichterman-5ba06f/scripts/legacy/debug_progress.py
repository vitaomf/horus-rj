import sqlite3, time
for _ in range(3):
    conn = sqlite3.connect('transparencia_rj.db')
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM emendas')
    total = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM emendas WHERE politico_id IS NOT NULL')
    com_id = cur.fetchone()[0]
    cur.execute('SELECT COUNT(*) FROM politicos')
    politicos = cur.fetchone()[0]
    conn.close()
    print(f'Emendas: {total} | Com politico_id: {com_id} | Politicos: {politicos}', flush=True)
    time.sleep(10)
