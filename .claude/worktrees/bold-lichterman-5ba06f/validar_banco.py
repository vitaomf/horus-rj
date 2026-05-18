import sqlite3

conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()

print("=== VALIDAÇÃO HORUS RJ ===\n")

# Totais gerais
cur.execute("SELECT COUNT(*) FROM emendas")
print(f"Total emendas: {cur.fetchone()[0]:,}")

cur.execute("SELECT SUM(valor) FROM emendas")
print(f"Valor total: R$ {cur.fetchone()[0]:,.2f}")

cur.execute("SELECT COUNT(*) FROM politicos")
print(f"Total políticos: {cur.fetchone()[0]:,}")

# Por ano
print("\n--- Por ano ---")
cur.execute("SELECT ano, COUNT(*), SUM(valor) FROM emendas GROUP BY ano ORDER BY ano")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]:,} emendas | R$ {row[2]:,.0f}")

# Top 5 valores (checar se tem absurdo)
print("\n--- Top 5 maiores valores ---")
cur.execute("SELECT valor, municipio_destino, ano FROM emendas ORDER BY valor DESC LIMIT 5")
for row in cur.fetchall():
    print(f"  R$ {row[0]:,.2f} → {row[1]} ({row[2]})")

# Checar valores suspeitos acima de 50M
cur.execute("SELECT COUNT(*) FROM emendas WHERE valor > 50000000")
suspeitos = cur.fetchone()[0]
print(f"\n⚠️  Emendas acima de R$ 50M: {suspeitos}")

conn.close()
print("\n=========================")
