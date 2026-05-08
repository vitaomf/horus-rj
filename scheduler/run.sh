#!/bin/bash
cd "$(dirname "$0")/.."
echo "Iniciando Horus RJ Scheduler..."
# Pode usar python ou python3 de acordo com a instalação local
python3 scheduler/scheduler.py
