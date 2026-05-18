import sqlite3

conn = sqlite3.connect("transparencia_rj.db")
cur = conn.cursor()

tables = ["politicos", "emendas", "contratos", "campanhas", "doadores"]
for t in tables:
    try:
        n = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f"{t}: {n} registros")
    except Exception as e:
        print(f"{t}: ERRO - {e}")

print()
rows = cur.execute(
    "SELECT ano, COUNT(*), SUM(valor_empenhado), SUM(valor_pago) FROM emendas GROUP BY ano ORDER BY ano"
).fetchall()
for r in rows:
    print(f"  {r[0]}: {r[1]} emendas | empenhado R${r[2]:,.0f} | pago R${r[3]:,.0f}")

print()
row = cur.execute(
    "SELECT MIN(data_inicio), MAX(data_inicio), COUNT(*), SUM(valor) FROM contratos"
).fetchone()
print(f"contratos: de {row[0]} ate {row[1]} | {row[2]} registros | R${row[3]:,.0f} total")

print()
try:
    sem_foto = cur.execute(
        "SELECT COUNT(*) FROM politicos WHERE foto_url IS NULL AND cargo != 'Autor Coletivo'"
    ).fetchone()[0]
    print(f"politicos sem foto: {sem_foto}")
except Exception as e:
    print(f"foto_url check: {e}")

conn.close()
