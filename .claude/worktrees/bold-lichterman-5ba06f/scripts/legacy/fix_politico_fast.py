import sqlite3

conn = sqlite3.connect('transparencia_rj.db')
cur = conn.cursor()

# 1. Total records that need fix
cur.execute("SELECT COUNT(*) FROM emendas WHERE politico_id IS NULL AND descricao IS NOT NULL")
total_emendas_null = cur.fetchone()[0]
print(f"Total de emendas sem politico_id: {total_emendas_null}")

if total_emendas_null > 0:
    print("Iniciando cruzamento local de dados (descricao -> politicos.nome)...")
    
    # Faz o update matando 2 coelhos com uma cajadada só (usando a coluna 'descricao' onde o script coleta_emendas.py guardou acidentalmente os autores/tipos)
    # A query procura se o nome salvo em descricao existe na tabela politicos
    cur.execute("""
        UPDATE emendas 
        SET politico_id = (
            SELECT p.id FROM politicos p 
            WHERE p.nome = emendas.descricao
        )
        WHERE politico_id IS NULL
    """)
    
    linhas_afetadas = cur.rowcount
    conn.commit()
    print(f"Update concluído. {linhas_afetadas} emendas tentaram ser vinculadas.")
    
    # Checando quantos sobraram
    cur.execute("SELECT COUNT(*) FROM emendas WHERE politico_id IS NULL")
    restantes = cur.fetchone()[0]
    print(f"Total de emendas que continuam sem politico_id longo da descricao: {restantes}")
    
conn.close()
