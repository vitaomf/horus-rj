# Horus RJ - Deployment Guide

Este documento descreve os passos práticos para rodar todo o ecossistema do **Horus RJ** no seu ambiente.

A stack é dividida em três pilares principais rodando em paralelo:

### 1. Backend (FastAPI)

O backend processa consultas ao banco de dados SQLite (`transparencia_rj.db`) provendo os endpoints na porta 7291.
Para iniciar:

```bash
python3 -m uvicorn backend.api:app --port 7291
```

### 2. Frontend (React/Vite)

A interface baseada em React renderizando os gráficos e painéis.
Para iniciar:

```bash
cd frontend
npm run dev
```

### 3. Scheduler (APScheduler)

Operário automático encarregado de rodar em plano de fundo permanentemente para continuar caçando registros ou monitorar a saúde do DB, sem impactar as requisições principais de clientes web.
Para iniciar apenas o scheduler:

```bash
python3 scheduler/scheduler.py
# Ou através do script bash: 
./scheduler/run.sh
```

---

## 🚀 Método Prático (start.sh)

Se você estiver rodando em um terminal bash compatível (Linux/Mac/WSL), pode instanciar toda a plataforma com um único comando:

```bash
chmod +x start.sh
./start.sh
```

Isso vai colocar as 3 instâncias online mapeadas em background e fechá-las caso você encerre com `CTRL+C`.
