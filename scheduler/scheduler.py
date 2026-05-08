from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
import subprocess, logging, sqlite3, os, traceback
from datetime import datetime
from pathlib import Path

# ── Logging persistente ───────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent

LOG_DIR  = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "scheduler.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),   # persiste em disco
        logging.StreamHandler(),                            # também no terminal
    ],
)
log = logging.getLogger("horus-scheduler")

# ── Arquivo de erros recentes (lido pelo /api/health) ────────────────────────
ERRORS_FILE = LOG_DIR / "coleta_errors.log"

def _registrar_erro(job: str, msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(ERRORS_FILE, "a", encoding="utf-8") as f:
        f.write(f"{ts} | {job} | {msg}\n")

def _limpar_erros_antigos():
    """Mantém apenas os últimos 100 erros no arquivo."""
    if not ERRORS_FILE.exists():
        return
    linhas = ERRORS_FILE.read_text(encoding="utf-8").splitlines()
    if len(linhas) > 100:
        ERRORS_FILE.write_text("\n".join(linhas[-100:]) + "\n", encoding="utf-8")

# ── Executor genérico ─────────────────────────────────────────────────────────
def _executar(job_name: str, script_relativo: str):
    script = PROJECT_ROOT / script_relativo
    if not script.exists():
        log.warning(f"[{job_name}] Script não encontrado: {script}")
        return

    log.info(f"[{job_name}] Iniciando...")
    try:
        result = subprocess.run(
            [os.sys.executable, str(script)],
            capture_output=True, text=True,
            cwd=str(PROJECT_ROOT),
            timeout=3600,          # máximo 1h por coleta
        )
        if result.returncode == 0:
            saida = (result.stdout or "")[-500:]
            log.info(f"[{job_name}] Concluído com sucesso.\n{saida}")
        else:
            erro = (result.stderr or result.stdout or "sem output")[-800:]
            log.error(f"[{job_name}] Falhou (código {result.returncode}):\n{erro}")
            _registrar_erro(job_name, f"exit {result.returncode}: {erro[:200]}")
    except subprocess.TimeoutExpired:
        msg = "timeout após 3600s"
        log.error(f"[{job_name}] {msg}")
        _registrar_erro(job_name, msg)
    except Exception as e:
        msg = traceback.format_exc()
        log.error(f"[{job_name}] Exceção inesperada:\n{msg}")
        _registrar_erro(job_name, str(e)[:200])
    finally:
        _limpar_erros_antigos()

# ── Jobs ──────────────────────────────────────────────────────────────────────
def coletar_emendas():
    _executar("emendas", "coleta_emendas.py")

def coletar_contratos():
    _executar("contratos", "coleta_contratos.py")

def coletar_tse():
    _executar("tse", "backend/collectors/coleta_tse.py")

def status_banco():
    db_path = PROJECT_ROOT / "transparencia_rj.db"
    try:
        conn = sqlite3.connect(str(db_path))
        cur  = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM emendas")
        emendas = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM contratos")
        contratos = cur.fetchone()[0]
        conn.close()
        log.info(f"[status] Banco: {emendas} emendas | {contratos} contratos")
    except Exception as e:
        log.error(f"[status] Erro ao ler banco: {e}")

# ── Agendamentos ──────────────────────────────────────────────────────────────
scheduler = BlockingScheduler(timezone="America/Sao_Paulo")

# Coleta emendas todos os dias às 3h da manhã
scheduler.add_job(coletar_emendas,  CronTrigger(hour=3, minute=0),
    id="emendas_diario",  name="Coleta diária de emendas (3h)")

# Coleta contratos todos os dias às 3h30 da manhã
scheduler.add_job(coletar_contratos, CronTrigger(hour=3, minute=30),
    id="contratos_diario", name="Coleta diária de contratos (3h30)")

# Coleta TSE toda segunda às 3h da manhã (dados mudam raramente)
scheduler.add_job(coletar_tse, CronTrigger(day_of_week="mon", hour=3, minute=0),
    id="tse_semanal", name="Coleta semanal TSE (seg 3h)")

# Status a cada 6h
scheduler.add_job(status_banco, CronTrigger(hour="0,6,12,18"),
    id="status", name="Status do banco (6/6h)")

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    log.info("=" * 60)
    log.info("Horus RJ Scheduler iniciado")
    log.info(f"Log em: {LOG_FILE}")
    log.info("Próximas execuções:")
    for job in scheduler.get_jobs():
        log.info(f"  {job.name}: {job.next_run_time}")
    status_banco()
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Scheduler encerrado.")
