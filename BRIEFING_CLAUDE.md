# Briefing HORUS RJ — contexto para passar pro Claude

> **Como usar:** abra o Claude (claude.ai, Claude Code, Cursor, Cowork) com o
> projeto `C:\Users\joaov\OneDrive\Desktop\HORUS` aberto e cole este arquivo
> inteiro como primeira mensagem. Ele tem o contexto do sistema, os bugs
> mapeados e o plano de deploy. Sou o Vitor; trabalho com edição, sites e
> sistemas; sou militante do Missão/MBL; o HORUS é meu sistema de
> transparência para o RJ. Preciso colocar online com orçamento de R$110/mês.

---

## 1. O que é o HORUS

Site de transparência pública do Rio de Janeiro. Coleta emendas
parlamentares, contratos federais e dados de campanha (TSE) de 3 APIs
oficiais, cruza num SQLite local e expõe num painel React. Ferramenta de
análise jornalística, dev solo, hoje rodando local. Repositório em
`C:\Users\joaov\OneDrive\Desktop\HORUS`.

## 2. Stack

- **Backend:** FastAPI + uvicorn, SQLite, APScheduler — Python 3.x
- **Frontend:** React 19 + Vite 7 + TypeScript + Tailwind 3 + D3 7
- **OS dev:** Windows 10 (PowerShell). `start.sh` cobre Linux/WSL.
- **Banco:** `transparencia_rj.db` (~750 KB) com tabelas `politicos`,
  `emendas`, `contratos`, `campanhas`, `doadores`. Tabelas `municipios`,
  `problemas`, `empresas`, `empresa_politico` declaradas em `schema.sql`
  mas **não usadas** pela API.
- **Em produção:** FastAPI também serve o build do Vite — uma porta só
  (7291). Hoje só roda local.
- **Exposição pública:** a definir (ngrok foi removido em 2026-05-07).

## 3. Como rodar localmente

```powershell
# Windows
.\start.ps1
# Linux/WSL
./start.sh
```

Individual:

```bash
python -m uvicorn backend.api:app --port 7291    # backend
cd frontend && npm run dev                       # frontend dev (5173)
cd frontend && npm run build                     # build prod
python scheduler/scheduler.py                    # scheduler
python coleta_emendas.py                         # coleta manual emendas
python coleta_contratos.py                       # coleta manual contratos
python backend/migrate_tse.py                    # cria tabelas TSE
python backend/collectors/coleta_tse.py          # coleta TSE
python rebuild_db.py                             # reset total (com backup)
```

## 4. Convenções não-óbvias do código

- Município no banco fica MAIÚSCULO com sufixo " - RJ" (ex: `NITERÓI - RJ`).
- Filtro de UF aceita 4 padrões: ` - RJ`, `RIO DE JANEIRO`, `(RJ)`, `RJ`.
- Valor de emenda: cascata `valorEmenda → valorEmpenhado → valorPago →
  valorLiquidado → valorRestoPago` (a API muda campos entre anos).
- Frontend usa `API_BASE_URL = ''` (relativo). Não trocar por
  `VITE_API_URL`.
- Coletas usam `INSERT OR IGNORE` com UNIQUE em `(codigo_emenda,
  municipio_destino)` — idempotentes.
- Cache de emendas: anos ≥ 2 atrás = permanente; ano atual e anterior =
  expira em 7 dias.
- Scheduler em timezone `America/Sao_Paulo`.

## 5. Regras invioláveis

- Integridade dos dados é prioridade (uso jornalístico). Antes de mudar
  formato de coleta, normalização de nomes ou campos exibidos, considerar
  se isso muda o que aparece publicamente ou quebra reprodução de análises
  antigas.
- Nunca commitar `.env` ou bancos (`*.db`). `.gitignore` já cobre, mas
  verificar `git status` antes de qualquer commit.
- Nunca rodar coleta com chave de API exposta em log/PR/print. Já houve
  vazamento.
- Nunca quebrar idempotência das coletas. Sempre `INSERT OR IGNORE`.
- Queries SQL sempre parametrizadas — nunca concatenar input.

## 6. Bugs e riscos identificados (em ordem de prioridade)

### CRÍTICOS — bloquear o deploy até resolver

- **6.1 Chave da API exposta em `.env`** [RESOLVIDO 2026-05]: chave anterior
  rotacionada no Portal da Transparência. `.env` confirmado fora do git
  via `.gitignore`. Nova chave armazenada apenas localmente.
- **6.2 CORS aberto em `backend/api.py` linha 29:** `allow_origins=["*"]`.
  Trocar pelo domínio real antes de expor publicamente.
- **6.3 Sem rate limiting.** Adicionar `slowapi` (ex: 60 req/min/IP) nos
  endpoints públicos. SQLite serializa escrita — sem proteção, um bot
  derruba o uvicorn.
- **6.4 Build do frontend desatualizado:** `frontend/dist/index.html`
  linha 7 tem `<title>frontend</title>` em vez de "Horus RJ —
  Transparência do Rio de Janeiro". Rodar `cd frontend && npm run build`
  antes do deploy.

### MÉDIOS — corrigir antes ou logo depois do deploy

- **6.5 `coleta_contratos.py` engole erros silenciosamente** (linhas
  82-83): `if response.status_code != 200: break` sem logar. Adicionar
  `print(f"[ERRO] Órgão {orgao_codigo} pág {pagina}: HTTP
  {response.status_code} - {response.text[:200]}")`.
- **6.6 `coleta_contratos.py` filtro RJ frágil** (linha 94): `if "RJ" not
  in municipio.upper()`. Usar mesmo padrão do `coleta_emendas.py` linha 45:
  `(' - RJ' in nm_upper or 'RIO DE JANEIRO' in nm_upper or
  nm_upper.endswith('(RJ)') or nm_upper == 'RJ')`.
- **6.7 `coleta_contratos.py` fixado em 2024** (linhas 73-74): hardcode
  `dataInicial="01/01/2024"`, `dataFinal="31/12/2024"`. Tornar dinâmico
  com `datetime.now().year`.
- **6.8 `obter_detalhes_politico` retorna emendas sem LIMIT**
  (`backend/api.py` linha 596-602). Para deputados com muitas emendas,
  vira centenas/milhares de linhas no JSON. Adicionar paginação no servidor
  ou `LIMIT 1000` defensivo.
- **6.9 Sem endpoint `/api/health`.** Adicionar:

  ```python
  @app.get("/api/health")
  def health():
      try:
          conn = get_db_connection()
          conn.execute("SELECT 1").fetchone()
          conn.close()
          return {"status": "ok", "db": "ok"}
      except Exception as e:
          raise HTTPException(503, f"db error: {e}")
  ```

- **6.10 Scheduler não roda coleta TSE.** `scheduler/scheduler.py` cobre
  só emendas (3h) e contratos (3h30). Adicionar job para
  `backend/collectors/coleta_tse.py`.
- **6.11 `cache_manager.status_cache` mostra status enganoso** (linhas
  47-58): para anos `<= ano_atual - 2` o cache é permanente, mas
  `status_cache()` ainda imprime "expirado" se o arquivo é antigo. Marcar
  como `permanente` quando `ano <= datetime.now().year - 2`.
- **6.12 `schema.sql` dessincronizado** com o que os coletores criam.
  Atualizar para refletir todas as tabelas reais (`contratos`, `campanhas`,
  `doadores`).
- **6.13 GeoJSON dos municípios vem do GitHub raw**
  (`MapaRJ.tsx` linha 46:
  `https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-33-mun.json`).
  Baixar para `frontend/public/municipios-rj.json` e referenciar como
  `/municipios-rj.json`.
- **6.14 Frontend depende de Google Fonts CDN** (`index.css` linha 1).
  Aceitável, mas registrar.
- **6.15 Sem testes automatizados.** Pelo menos um smoke test
  (pytest batendo nos endpoints contra o `transparencia_rj.db` real)
  ajudaria muito antes de cada deploy.
- **6.16 SQLite + uvicorn:** se algum dia subir `--workers > 1`, ativar
  WAL: `PRAGMA journal_mode=WAL`.

## 7. Plano de deploy — VPS pequeno (recomendado)

Hetzner CX11 ou DigitalOcean droplet (~R$25-30/mês) + domínio
(R$40-60/ano). Sobra muito do orçamento de R$110/mês. Render/Railway free
tier não funciona aqui porque SQLite zera no redeploy e o scheduler
precisa de processo persistente.

### Passo 1 — antes de qualquer coisa

1. Rotacionar chave da API do Portal da Transparência.
2. `git log --all --full-history -- .env` — se a chave antiga aparecer em
   algum commit, reescrever histórico.
3. `cd frontend && npm run build`.

### Passo 2 — hardening do código

Aplicar 6.1, 6.2, 6.3, 6.9 e baixar GeoJSON local (6.13). Refazer
`npm run build`. Testar com `start.ps1` antes de subir.

### Passo 3 — provisionar VPS Ubuntu 24.04 LTS

```bash
# como root
apt update && apt upgrade -y
apt install -y python3-venv python3-pip nginx git
adduser --disabled-password --gecos "" horus
usermod -aG sudo horus
su - horus

# como horus
git clone <url-do-repo> ~/horus
cd ~/horus
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt slowapi

# Node para buildar frontend no VPS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
cd frontend && npm ci && npm run build && cd ..

# .env com chave NOVA
nano .env

# coletas iniciais (1x)
python coleta_emendas.py
python coleta_contratos.py
python backend/migrate_tse.py
python backend/collectors/coleta_tse.py
```

### Passo 4 — systemd

`/etc/systemd/system/horus-api.service`:

```ini
[Unit]
Description=Horus RJ FastAPI
After=network.target

[Service]
User=horus
WorkingDirectory=/home/horus/horus
ExecStart=/home/horus/horus/.venv/bin/uvicorn backend.api:app --host 127.0.0.1 --port 7291
Restart=always
EnvironmentFile=/home/horus/horus/.env

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/horus-scheduler.service`:

```ini
[Unit]
Description=Horus RJ Scheduler
After=network.target

[Service]
User=horus
WorkingDirectory=/home/horus/horus
ExecStart=/home/horus/horus/.venv/bin/python scheduler/scheduler.py
Restart=always
EnvironmentFile=/home/horus/horus/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now horus-api horus-scheduler
sudo systemctl status horus-api horus-scheduler
```

### Passo 5 — Nginx reverse proxy + HTTPS

`/etc/nginx/sites-available/horus`:

```nginx
server {
    listen 80;
    server_name horus.seudominio.com.br;
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:7291;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/horus /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d horus.seudominio.com.br
```

### Passo 6 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Passo 7 — monitoramento e backup

- UptimeRobot ou BetterStack monitorando
  `https://horus.seudominio.com.br/api/health` a cada 5 min.
- Cron diário copiando `transparencia_rj.db` para `~/backups/horus-
  $(date +%Y%m%d).db`, limpando arquivos > 30 dias.

## 8. Alternativa zero-custo — Cloudflare Tunnel

Se eu deixar meu desktop ligado 24/7, Cloudflare Tunnel expõe
`localhost:7291` em `https://horus.meudominio.com.br` sem VPS, IP fixo
nem porta aberta. Configura em ~10 min, custo zero. Bom caminho pra
começar e migrar pra VPS quando pegar tração.

## 9. Próximas tasks (ordem proposta para o Claude executar)

1. Aplicar hardening: 6.1, 6.2, 6.3, 6.4, 6.9 (chave, CORS, rate limit,
   build, health-check). Commit em branch separado.
2. Aplicar correções de coleta: 6.5, 6.6, 6.7 (`coleta_contratos.py`).
3. Adicionar GeoJSON local (6.13).
4. Adicionar job TSE no scheduler (6.10).
5. Sincronizar `schema.sql` (6.12).
6. Escrever smoke test mínimo (6.15).
7. Decidir entre VPS e Cloudflare Tunnel; executar o passo a passo do
   plano escolhido.

## 10. Como confirmar que está tudo funcionando

- `curl https://horus.seudominio.com.br/api/health` retorna 200 com
  `{"status":"ok","db":"ok"}`.
- `curl https://horus.seudominio.com.br/api/emendas/total` retorna número
  > 0.
- Acessar `https://horus.seudominio.com.br/` no navegador renderiza a
  homepage com o mapa do RJ e os 3 cards de métricas.
- `sudo systemctl status horus-api horus-scheduler` mostra ambos `active
  (running)`.
- Logs do scheduler em `journalctl -u horus-scheduler -n 50` mostram as
  próximas execuções agendadas.

---

**Glossário rápido para o Claude:** Emenda = verba que parlamentar
federal direciona pra destino específico. Empenhado = orçamento reservado
(é o valor que o HORUS mostra). Liquidado = serviço entregue. Pago =
dinheiro efetivamente transferido. TSE/DivulgaCandContas = fonte dos
dados de campanha. Portal da Transparência = API gov federal de emendas
e contratos.
