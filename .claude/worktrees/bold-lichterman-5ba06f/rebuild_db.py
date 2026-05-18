import os
import sqlite3

# Drop existing database to force a clean rebuild
if os.path.exists('transparencia_rj.db'):
    if os.path.exists('transparencia_rj_backup.db'):
        os.remove('transparencia_rj_backup.db')
    os.rename('transparencia_rj.db', 'transparencia_rj_backup.db')
    print("Banco de dados anterior substituído em transparencia_rj_backup.db")

# Import and run the actual collector
import coleta_emendas
print("Iniciando coleta limpa...")
coleta_emendas.coletar_emendas()
print("Coleta concluída!")
