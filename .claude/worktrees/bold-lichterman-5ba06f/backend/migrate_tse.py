import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "transparencia_rj.db")

def migrate():
    print(f"Iniciando migração no banco: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Tabela de Campanhas
        print("Criando tabela 'campanhas'...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campanhas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                politico_id INTEGER NOT NULL,
                ano INTEGER NOT NULL,
                cargo TEXT,
                total_receitas REAL DEFAULT 0,
                total_despesas REAL DEFAULT 0,
                situacao TEXT,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (politico_id) REFERENCES politicos(id) ON DELETE CASCADE
            )
        """)

        # Tabela de Doadores
        print("Criando tabela 'doadores'...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS doadores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campanha_id INTEGER NOT NULL,
                nome_doador TEXT NOT NULL,
                documento_doador TEXT,
                valor REAL NOT NULL,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campanha_id) REFERENCES campanhas(id) ON DELETE CASCADE
            )
        """)

        # Índices para performance
        print("Criando índices...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_campanhas_politico_id ON campanhas(politico_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_campanhas_ano ON campanhas(ano)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_doadores_campanha_id ON doadores(campanha_id)")

        conn.commit()
        print("Migração concluída com sucesso!")
    except Exception as e:
        print(f"Erro durante a migração: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
