from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
import subprocess, logging, sqlite3, os
from datetime import datetime

logging.basicConfig(level=logging.INFO, 
    format='%(asctime)s - %(message)s')

# Bug 5 fix: caminho absoluto baseado na raiz do projeto
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

scheduler = BlockingScheduler(timezone="America/Sao_Paulo")

def coletar_emendas():
    logging.info("Iniciando coleta de emendas...")
    import sys
    executable = sys.executable
    script = os.path.join(PROJECT_ROOT, 'coleta_emendas.py')
    result = subprocess.run([executable, script], 
                          capture_output=True, text=True, cwd=PROJECT_ROOT)
    out = result.stdout[-200:] if result.stdout else "Nenhum output"
    logging.info(f"Coleta de emendas finalizada. Output: {out}")

def coletar_contratos():
    logging.info("Iniciando coleta de contratos públicos...")
    import sys
    executable = sys.executable
    script = os.path.join(PROJECT_ROOT, 'coleta_contratos.py')
    if not os.path.exists(script):
        logging.warning(f"Script {script} não encontrado. Pulando coleta de contratos.")
        return
    result = subprocess.run([executable, script],
                          capture_output=True, text=True, cwd=PROJECT_ROOT)
    out = result.stdout[-200:] if result.stdout else "Nenhum output"
    logging.info(f"Coleta de contratos finalizada. Output: {out}")

def coletar_tse():
    logging.info("Iniciando coleta TSE (campanhas e doadores)...")
    import sys
    executable = sys.executable
    script = os.path.join(PROJECT_ROOT, 'backend', 'collectors', 'coleta_tse.py')
    if not os.path.exists(script):
        logging.warning(f"Script {script} não encontrado. Pulando coleta TSE.")
        return
    result = subprocess.run([executable, script],
                          capture_output=True, text=True, cwd=PROJECT_ROOT)
    out = result.stdout[-200:] if result.stdout else "Nenhum output"
    logging.info(f"Coleta TSE finalizada. Output: {out}")

def status_banco():
    db_path = os.path.join(PROJECT_ROOT, 'transparencia_rj.db')
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM emendas')
    total = cur.fetchone()[0]
    conn.close()
    logging.info(f"Status banco: {total} emendas registradas")

# Coleta emendas todo dia às 3h da manhã
scheduler.add_job(coletar_emendas, CronTrigger(hour=3, minute=0),
    id='coleta_diaria_emendas', name='Coleta diária de emendas')

# Coleta contratos todo dia às 3h30 da manhã
scheduler.add_job(coletar_contratos, CronTrigger(hour=3, minute=30),
    id='coleta_diaria_contratos', name='Coleta diária de contratos públicos')

# Coleta TSE toda segunda-feira às 4h (dados mudam raramente)
scheduler.add_job(coletar_tse, CronTrigger(day_of_week='mon', hour=4, minute=0),
    id='coleta_semanal_tse', name='Coleta semanal TSE (campanhas e doadores)')

# Status do banco a cada 6 horas
scheduler.add_job(status_banco, CronTrigger(hour='0,6,12,18'),
    id='status', name='Status do banco')

if __name__ == '__main__':
    logging.info("Scheduler Horus RJ iniciado.")
    logging.info("Próximas execuções:")
    for job in scheduler.get_jobs():
        logging.info(f"  {job.name}: {job.next_run_time}")
    status_banco()
    scheduler.start()
