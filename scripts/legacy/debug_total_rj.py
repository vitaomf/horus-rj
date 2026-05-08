import sqlite3
import time

for _ in range(5):
    try:
        conn = sqlite3.connect('transparencia_rj.db')
        cur = conn.cursor()
        cur.execute('SELECT COUNT(*) FROM emendas')
        print('Total:', cur.fetchone()[0])
        cur.execute('SELECT ano, COUNT(*) FROM emendas GROUP BY ano ORDER BY ano')
        for r in cur.fetchall(): print(r)
        conn.close()
        break
    except sqlite3.OperationalError:
        time.sleep(1)
