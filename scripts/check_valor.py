import sqlite3
conn = sqlite3.connect("transparencia_rj.db")
cur = conn.cursor()

rows = cur.execute("SELECT ano, COUNT(*), SUM(valor), AVG(valor) FROM emendas GROUP BY ano ORDER BY ano").fetchall()
print("=== CAMPO valor (legado) ===")
for r in rows:
    total = r[2] or 0
    media = r[3] or 0
    print(f"  {r[0]}: {r[1]} emendas | total R${total:,.0f} | media R${media:,.0f}")

com_valor = cur.execute("SELECT COUNT(*) FROM emendas WHERE valor > 0").fetchone()[0]
sem_valor = cur.execute("SELECT COUNT(*) FROM emendas WHERE valor = 0 OR valor IS NULL").fetchone()[0]
print(f"\nCom valor > 0: {com_valor} | Sem valor: {sem_valor}")

print("\nExemplos com valor:")
ex = cur.execute("SELECT codigo_emenda, ano, valor, municipio_destino FROM emendas WHERE valor > 0 LIMIT 5").fetchall()
for e in ex:
    print(f"  {e}")

conn.close()
