import sqlite3

def migrate():
    conn = sqlite3.connect('transparencia_rj.db')
    cursor = conn.cursor()
    
    try:
        # Verificar se a coluna 'status' existe
        cursor.execute("PRAGMA table_info(emendas)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'status' in columns and 'codigo_emenda' not in columns:
            print("Renomeando coluna 'status' para 'codigo_emenda'...")
            cursor.execute("ALTER TABLE emendas RENAME COLUMN status TO codigo_emenda")
            conn.commit()
            print("Migração concluída com sucesso.")
        elif 'codigo_emenda' in columns:
            print("A coluna 'codigo_emenda' já existe.")
        else:
            print("Nenhuma coluna compatível encontrada na tabela 'emendas'.")
            print(f"Colunas existentes: {columns}")
            
    except Exception as e:
        print(f"Erro durante a migração: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
