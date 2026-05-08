"""One-shot: marca políticos institucionais existentes com cargo='Autor Coletivo'.

Idempotente — pode rodar quantas vezes precisar. Usado para retroativar a
mudança feita em coleta_emendas.py (que agora classifica na inserção).
"""
import sqlite3
import os

DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'transparencia_rj.db')

PATTERNS = ('BANCADA', 'COMISS', 'RELATOR', 'FRENTE', 'ASSEMBL',
            'EXECUTIVO', 'MINIST', 'COMITE', 'COMITÊ')

def main():
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    likes = ' OR '.join('UPPER(nome) LIKE ?' for _ in PATTERNS)
    params = tuple(f'%{p}%' for p in PATTERNS)
    cur.execute(f'SELECT id, nome, cargo FROM politicos WHERE {likes}', params)
    matches = cur.fetchall()
    print(f'Match: {len(matches)} políticos institucionais')
    for i, n, c in matches:
        cur.execute('SELECT COUNT(*), COALESCE(SUM(valor), 0) FROM emendas WHERE politico_id = ?', (i,))
        cnt, val = cur.fetchone()
        print(f'  id={i:3}  cargo_atual={c!r:25}  emendas={cnt:4}  R$ {val:>14,.0f}  {n}')
    if matches:
        ids = tuple(i for i, _, _ in matches)
        placeholders = ','.join('?' * len(ids))
        sql = f"UPDATE politicos SET cargo = 'Autor Coletivo' WHERE id IN ({placeholders})"
        cur.execute(sql, ids)
        print(f'\nAtualizados: {cur.rowcount} registros')
        conn.commit()
    conn.close()

if __name__ == '__main__':
    main()
