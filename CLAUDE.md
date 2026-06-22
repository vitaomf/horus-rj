# Horus

Site de transparência política nacional. Permite que o cidadão acesse e enxergue, pelo lugar onde mora, **quem são seus políticos, o que cada um faz e o que deveria fazer**. Coleta dados de APIs oficiais (Portal da Transparência, TSE, Câmara), cruza num SQLite local e expõe num painel React.

## REGRA FUNDAMENTAL — não é "site de emendas"

Emenda parlamentar é **uma das dimensões** da atuação política, não o eixo do produto. O HORUS retrata o político como pessoa pública completa. A régua de prioridade para qualquer nova feature, refactor ou texto exibido é, na ordem:

1. **Mapeamento territorial** — quem representa o lugar onde o usuário mora (federal, estadual, municipal)
2. **Atuação legislativa** — projetos de lei apresentados, votações nominais, comissões, presença, alinhamento
3. **Resultado/desempenho** — indicadores objetivos do mandato (presença, autoria, impacto)
4. **Mapeamento das emendas** — pra onde direcionou verba, com que objetivo
5. **Relatórios e patrimônio** — bens declarados, evolução patrimonial, prestação de contas
6. **Conduta** — escândalos, processos, inquéritos, sanções

Antes de adicionar UI nova ou priorizar coleta, perguntar: **isso responde "quem representa meu lugar e o que ele faz" ou só "quanto de emenda ele mandou"?** Se for só emenda, balancear com pelo menos uma outra dimensão.

## Índices territoriais em cascata (Brasil → Região → Estado → Município)

O mapa nacional e cada nível de drill-down deve carregar índices contextuais do território — não só dados do parlamentar. Cidadão entra pelo lugar e enxerga **a realidade daquele lugar** antes (ou ao lado) de quem o representa.

**Indicadores prioritários** (pelo menos esses na primeira leva):

| Indicador | Fonte | Granularidade nativa | Cascata |
|---|---|---|---|
| IDH-M | PNUD Atlas Brasil | município (2010 oficial; estimativas anuais) | μ por região; UF agregada; município direto |
| Saneamento (% esgoto coletado/tratado) | SNIS / MDR | município (anual) | μ ponderada por população |
| Criminalidade (homicídios/100k hab) | Atlas da Violência IPEA + SINESP | município (anual com lag) | μ por região; UF direta; município com fallback p/ UF se ausente |
| Desmatamento | INPE PRODES (Amazônia Legal) + MapBiomas (demais biomas) | município (anual) | soma absoluta + % do território; cascata aditiva |
| Alfabetismo / Escolaridade | IBGE Censo 2022 | município | μ ponderada |

**Regras de cascata e exibição**:

- **Brasil**: indicador médio nacional + ranking dos extremos (5 melhores / 5 piores estados).
- **Região**: média ponderada por população, posição no ranking nacional, evolução nos últimos 5 anos quando a fonte permitir.
- **Estado**: valor direto, posição entre os 27, comparativo com média da região e do Brasil.
- **Município**: valor direto quando a fonte cobre; fallback para média do estado com flag explícita "*estimado pela média estadual*".
- **Sem dado**: mostrar "—" e a fonte/ano da última medição, **nunca** zero (é mentira estatística).
- **Posicionamento estético no mapa**: cantos do mapa, painel lateral compacto OU sobreposição on-hover — nunca poluir o mapa em si.

**Coleta**: scripts dedicados em `scripts/coleta_indices_*.py`, persistidos em tabelas `indices_municipio`, `indices_estado` com `(codigo_ibge, ano, indicador, valor)`. Idempotente. Endpoint REST `/api/indices/{nivel}/{id}` retorna os indicadores em um GET único.

## Top 10 funções de um parlamentar federal

Lista canônica usada para classificar "atuação". Cada perfil de parlamentar deve mostrar evidência (ou ausência reconhecida) em cada uma:

1. **Legislar** — apresentar e relatar PLs, PLPs, PECs, PDLs
2. **Votar** — comparecer e votar nominalmente nas proposições (presença + posição)
3. **Aprovar e fiscalizar o Orçamento** — LDO, LOA, e execução orçamentária
4. **Apresentar emendas individuais e de bancada** — destino, objeto, execução (empenhado→pago)
5. **Atuar em comissões temáticas e CPIs** — membro, relator, presidente
6. **Pedir informações ao Executivo** — requerimentos formais ao Governo
7. **Representar o eleitor** — gabinete, audiências, agenda no estado
8. **Participar de viagens oficiais e missões** — comitivas, eventos, custo público
9. **Articular politicamente** — liderança partidária, bloco, governo/oposição, autoria de obstrução
10. **Discursar e debater em plenário** — discursos registrados, pronunciamentos, ordem do dia

Para senador, acrescenta-se "aprovar nomeações" (ministros do STF/TCU, embaixadores) e "ratificar tratados internacionais". Para deputado estadual e vereador, a lista se ajusta ao escopo (LDO/LOA estadual/municipal, CPI estadual/municipal etc.).

## Stack

- **Backend**: FastAPI + uvicorn, SQLite, APScheduler — Python 3.x
- **Frontend**: React 19 + Vite 7 + TypeScript + Tailwind 3 + D3 7
- **OS principal**: Windows 10 (PowerShell). `start.sh` cobre Linux/WSL.
- **Exposição pública**: ngrok (domínio fixo) → Vercel Edge proxy → `horus-rj.vercel.app`

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
python coleta_emendas.py                          # emendas 2014→ano atual
python coleta_contratos.py                        # contratos federais 2024
python backend/collectors/coleta_tse.py           # campanhas + doadores TSE 2022 (RJ)
python backend/migrate_tse.py                     # cria tabelas campanhas/doadores
python rebuild_db.py                              # reset total (faz backup automático)

# Eleitos (autoridades exibidas em HierarquiaCargos):
python scripts/migrate_eleitos_municipais.py      # cria tabelas eleitos_municipais e eleitos_estaduais
python scripts/coleta_tse_estadual.py             # gov, vice-gov, senadores, dep. fed/est ELEITOS 2022 (~1.7k)
python scripts/coleta_tse_municipal.py            # prefeitos, vice, vereadores ELEITOS 2024 (~70k)
python scripts/ligar_eleitos_politicos.py         # liga eleitos→politicos.id (perfil+atuação); rodar após coleta_tse_estadual

# Suporte: GeoJSON municípios e fotos
python scripts/download_geo_municipios.py         # GeoJSONs das 27 UFs para mapa interativo
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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
