# Horus RJ

Site de transparência pública do Rio de Janeiro. Coleta emendas parlamentares, contratos federais e dados de campanha (TSE) de 3 APIs oficiais, cruza num SQLite local e expõe num painel React. **Ferramenta de análise jornalística** — dev solo, roda no desktop e fica público via ngrok com domínio fixo.

## Stack

- **Backend**: FastAPI + uvicorn, SQLite, APScheduler — Python 3.x
- **Frontend**: React 19 + Vite 7 + TypeScript + Tailwind 3 + D3 7
- **OS principal**: Windows 10 (PowerShell). `start.sh` cobre Linux/WSL.
- **Exposição pública**: a definir (ngrok removido em 2026-05-07).

## Como rodar

```powershell
# Tudo junto — Windows
.\start.ps1

# Linux/WSL
./start.sh
```

Individual:

```bash
python -m uvicorn backend.api:app --port 7291    # backend
cd frontend && npm run dev                       # frontend dev (5173)
cd frontend && npm run build                     # build prod (FastAPI passa a servir)
python scheduler/scheduler.py                    # scheduler
```

Coletas manuais:

```bash
python coleta_emendas.py                         # emendas 2014→ano atual
python coleta_contratos.py                       # contratos federais 2024
python backend/collectors/coleta_tse.py          # campanhas + doadores TSE 2022
python backend/migrate_tse.py                    # cria tabelas campanhas/doadores
python rebuild_db.py                             # reset total (faz backup automático)
```

## Arquitetura

```
APIs externas (Portal Transparência, TSE, GeoJSON)
       ↓
scripts Python de coleta (cache JSON em cache/emendas/)
       ↓
transparencia_rj.db (SQLite, ~750 KB)
       ↓
backend/api.py (FastAPI, 11 endpoints REST, CORS aberto)
       ↓
frontend/ (SPA React sem router — estado em App.tsx)
```

Em produção, FastAPI **também serve o build do Vite** — uma porta só (7291). Hoje só roda local; estratégia de exposição pública a definir.

## Banco

| Tabela | Origem | Status |
|---|---|---|
| `politicos`, `emendas` | criadas em [coleta_emendas.py](coleta_emendas.py) | ativas |
| `contratos` | criada em [coleta_contratos.py](coleta_contratos.py) | ativa |
| `campanhas`, `doadores` | criadas em [backend/migrate_tse.py](backend/migrate_tse.py) | ativas |
| `municipios`, `problemas`, `empresas`, `empresa_politico` | declaradas em [schema.sql](schema.sql) | **não usadas** pela API |

⚠️ `schema.sql` está dessincronizado — não tem `contratos`/`campanhas`/`doadores`. Se mexer no schema, atualizar os dois lados.

## Convenções não-óbvias

- Município no banco fica **maiúsculo com sufixo " - RJ"** (ex: `NITERÓI - RJ`).
- Filtro de UF aceita 4 padrões: ` - RJ`, `RIO DE JANEIRO`, `(RJ)`, `RJ`.
- Valor de emenda: cascata `valorEmenda → valorEmpenhado → valorPago → valorLiquidado → valorRestoPago` (a API muda campos entre anos).
- Frontend usa `API_BASE_URL = ''` (relativo, mesmo domínio). **Não** trocar por `VITE_API_URL`.
- Coletas usam `INSERT OR IGNORE` com UNIQUE em `(codigo_emenda, municipio_destino)` — idempotentes.
- Cache de emendas: anos ≥ 2 atrás = permanente; ano atual e anterior = expira em 7 dias.
- Scheduler em timezone `America/Sao_Paulo`.

## Regras invioláveis

- **Integridade dos dados é prioridade** (uso jornalístico). Antes de mudar formato de coleta, normalização de nomes ou campos exibidos, considerar: muda o que aparece publicamente? quebra reprodução de análises antigas? Se sim, registrar a mudança e a data.
- **Nunca commitar `.env`** ou bancos (`*.db`). O `.gitignore` atual começa com `*` — a intenção é ignorar tudo, mas verificar `git status` antes de qualquer commit.
- **Nunca rodar coleta com chave de API exposta em log/PR/print.** Já houve vazamento prévio (ver comentário no `.env`).
- **Nunca quebrar a idempotência das coletas.** Sempre usar `INSERT OR IGNORE`.
- Queries SQL **sempre parametrizadas** — nunca concatenar input.

## Dívidas técnicas conhecidas

- [ ] Chave do Portal da Transparência no `.env` em texto puro — pendente rotacionar (já vazou antes)
- [ ] CORS `allow_origins=["*"]` — fechar antes de qualquer deploy sério
- [ ] Coleta TSE não está agendada (manual)
- [ ] Sem testes; validação manual via scripts `scripts/legacy/`

## Roadmap (próximas prioridades)

Ordem proposta — ajustar conforme necessidade editorial:

1. **Rotacionar a chave do Portal da Transparência** — única ação manual restante de segurança operacional. Afeta credibilidade do uso jornalístico.
2. **Definir nova estratégia de exposição pública** (ngrok removido). Opções: VPS pequeno (Hetzner/DigitalOcean), Cloudflare Tunnel, Render/Railway plano grátis.
3. (futuro) Agendar coleta TSE no scheduler — hoje só roda manual.
4. (futuro) Fechar CORS (`allow_origins=["*"]`) antes de deploy remoto.
5. (futuro) Adicionar testes (hoje validação é manual via `scripts/legacy/`).

## Glossário

- **Emenda**: verba que parlamentar federal direciona pra destino específico
- **Empenhado** (estágio 1): orçamento reservado — *é o valor que o Horus mostra*
- **Liquidado** (estágio 2): serviço entregue
- **Pago** (estágio 3): dinheiro efetivamente transferido (pode ser < empenhado)
- **TSE / DivulgaCandContas**: fonte dos dados de campanha eleitoral
- **Portal da Transparência**: API gov federal para emendas e contratos
