import sqlite3
for _ in range(2):
    try:
        conn = sqlite3.connect('transparencia_rj.db')
        cur = conn.cursor()
        cur.execute('SELECT COUNT(*) FROM emendas')
        print('Total emendas:', cur.fetchone()[0])
        cur.execute('SELECT ano, COUNT(*) FROM emendas GROUP BY ano ORDER BY ano')
        for row in cur.fetchall():
            print(row)
        conn.close()
        break
    except sqlite3.OperationalError:
        import time
        time.sleep(1)
