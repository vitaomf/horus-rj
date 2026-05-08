#!/bin/bash
# Script prático para rodar todos os serviços do Horus RJ juntos
# Requer um terminal que suporte jobs em background.

echo "[1/3] Iniciando Backend FastAPI (Porta 7291)..."
python3 -m uvicorn backend.api:app --port 7291 &
BACKEND_PID=$!

echo "[2/3] Iniciando Frontend React (Vite)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "[3/3] Iniciando APScheduler..."
python3 scheduler/scheduler.py &
SCHEDULER_PID=$!

echo "Todos os serviços do HORUS RJ estão rodando!"
echo "Pressione [CTRL+C] para encerrar todos."

trap "echo 'Encerrando serviços...'; kill $BACKEND_PID $FRONTEND_PID $SCHEDULER_PID; exit" INT

wait
