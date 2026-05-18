# PLANO DE MELHORIAS — HORUS RJ

> Documento de trabalho. Atualizar conforme implementação avança.
> Iniciado em: 2026-05-11

---

## ESTADO ATUAL DO DOSSIÊ POLÍTICO

| Recurso | Status | Observação |
|---|---|---|
| Foto portrait grande no hero | ✅ Implementado 2026-05-11 | 208×272px, borda dourada |
| Nome enorme (hero) | ✅ Implementado 2026-05-11 | text-8xl Bebas, imediatamente visível |
| Bio real (nascimento, escolaridade) | ✅ Implementado 2026-05-11 | Proxy `/api/camara/bio` → Câmara API |
| Bio irônica (algoritmo de gastos) | ✅ Funciona | `PoliticoPage.tsx` `getBioIronica()` |
| Cruzamento emendas × contratos | ✅ Funciona | `api.py:833` |
| Finanças de campanha TSE | ✅ Funciona | `PoliticoPage.tsx` seção TSE |
| Tags comportamentais (ELEITOREIRO etc.) | ✅ Funciona | `PoliticoPage.tsx` |
| Mapa de atuação (RJ) | ✅ Funciona | `PoliticoPage.tsx` |
| Header compacto sticky (ao rolar) | ✅ Implementado 2026-05-11 | Foto pequena + nome + stats |

---

## 1. DOSSIÊ POLÍTICO

Objetivo: tornar o dossiê uma peça jornalística completa, não apenas um painel de dados.

### 1(a) FOTO

**Estado atual:** foto portrait grande no hero — proxy backend busca via Câmara API, sem CORS.

**Pendente:**
- [ ] **Senadores sem foto**: a Câmara API só cobre deputados federais. Romário, por ex., fica sem foto. Adicionar fallback Senado API: `legis.senado.leg.br/dadosabertos/senador/lista/atual`
- [ ] **Cache no banco**: salvar `foto_url` e `bio_json` no banco após o primeiro fetch, evitando chamadas repetidas a cada visualização
- [ ] **Match por apelido**: nomes de urna diferentes do nome civil (ex: "Lula" vs "LUIZ INÁCIO LULA DA SILVA") causam falha no match

---

### 1(b) NOME E IDENTIFICAÇÃO

**Estado atual:** nome exibido como coletado do Portal da Transparência (nome civil completo em maiúsculas).

**Melhorias planejadas:**

- [ ] **Nome de urna / apelido político**: exibir o nome pelo qual o parlamentar é conhecido publicamente (ex: "Rodrigo Maia" em vez de "RODRIGO MAIA PEREIRA") — disponível na Câmara API campo `nomeCivil` vs `nome`
- [ ] **Mandato atual**: indicar visualmente se o parlamentar ainda está em exercício ou se o mandato encerrou
- [ ] **UF de origem / partido atual**: o partido pode ter mudado desde a última eleição. Considerar fonte atualizada
- [ ] **Tipo de cargo com link**: "Deputado Federal" com link para o perfil oficial na Câmara ou no Senado

---

### 1(c) HISTÓRIA

**Estado atual (2026-05-11):** bio real implementada via proxy `/api/camara/bio` — nascimento, UF, escolaridade já aparecem no hero para deputados federais.

**O que falta:**
- Trajetória política (quando entrou na vida pública, mandatos anteriores)
- Partidos pelos quais passou
- Cargos anteriores (vereador, prefeito, secretário, etc.)
- Comissões em que atua
- Projetos de lei relevantes (ou ausência deles)
- Polêmicas e investigações públicas (CPI, processo no STF, etc.)

**Fontes disponíveis para automação:**

| Fonte | O que fornece | Tipo |
|---|---|---|
| Câmara API (`/deputados/{id}`) | biografia oficial, escolaridade, profissão, situação | API aberta |
| Senado API (`/senador/{id}`) | dados biográficos, comissões, mandatos | API aberta |
| Wikipedia API | artigo biográfico em texto livre | API aberta |
| Portal da Câmara (scraping) | histórico de votações, projetos | Scraping (instável) |

**Abordagem proposta — em fases:**

**Fase 1 — Bio oficial da Câmara (automática)**
- Durante a coleta de emendas, enriquecer cada deputado com dados da Câmara API:
  - `dataNascimento`, `municipioNascimento`, `escolaridade`, `profissao`
  - `urlFoto` (resolve o problema de cache de foto também)
  - `urlWebSite`, `redeSocial`
- Salvar numa nova coluna `bio_json` na tabela `politicos` (TEXT, JSON serializado)
- Expor via `/api/politicos/{id}` (já retorna o objeto do parlamentar)
- Exibir no dossiê: uma ficha biográfica discreta abaixo da bio irônica

**Fase 2 — Histórico de mandatos**
- Câmara API: `GET /deputados/{id}/mandatos` — lista todos os mandatos do parlamentar
- Senado API: equivalente para senadores
- Exibir como linha do tempo vertical no dossiê

**Fase 3 — Texto biográfico (Wikipedia ou curado)**
- Opção A: Wikipedia API — busca automática por nome, extrai o primeiro parágrafo
  - Risco: pode não ter artigo, ou trazer artigo errado (homônimos)
  - Implementação: `https://pt.wikipedia.org/api/rest_v1/page/summary/{nome_formatado}`
- Opção B: campo manual `bio_texto` no banco, editável via script ou endpoint admin
  - Mais confiável para uso jornalístico
  - Requer curadoria

**Recomendação:** fazer Fase 1 primeiro (automática, dados oficiais, sem risco editorial), depois decidir entre Wikipedia automatizado e curadoria manual para o texto livre.

**Colunas novas necessárias na tabela `politicos`:**

```sql
ALTER TABLE politicos ADD COLUMN nome_urna TEXT;
ALTER TABLE politicos ADD COLUMN data_nascimento TEXT;
ALTER TABLE politicos ADD COLUMN municipio_nascimento TEXT;
ALTER TABLE politicos ADD COLUMN escolaridade TEXT;
ALTER TABLE politicos ADD COLUMN profissao TEXT;
ALTER TABLE politicos ADD COLUMN url_perfil_oficial TEXT;
ALTER TABLE politicos ADD COLUMN bio_json TEXT;       -- dados estruturados da Câmara/Senado API
ALTER TABLE politicos ADD COLUMN bio_texto TEXT;      -- texto biográfico livre (curado ou Wikipedia)
ALTER TABLE politicos ADD COLUMN mandatos_json TEXT;  -- histórico de mandatos
ALTER TABLE politicos ADD COLUMN atualizado_em TEXT;  -- timestamp do último enriquecimento
```

**Script de enriquecimento:**
- Novo arquivo: `enriquecer_politicos.py`
- Lê todos os parlamentares da tabela `politicos`
- Para cada um, tenta buscar na Câmara API (se cargo = Deputado Federal) ou Senado API
- Salva os campos acima no banco
- Idempotente: só atualiza se `atualizado_em` for nulo ou > 30 dias

---

## PRÓXIMOS PONTOS A DEFINIR

*(adicionar aqui conforme a conversa avança)*

---

## ORDEM DE IMPLEMENTAÇÃO SUGERIDA

| Prioridade | Item | Status |
|---|---|---|
| 1 | Hero com foto grande + nome + bio real (Câmara API) | ✅ Feito |
| 2 | Senado API — foto e bio para senadores | ⬜ Próximo |
| 3 | Cache de foto + bio no banco (`enriquecer_politicos.py`) | ⬜ |
| 4 | Nome de urna visível no dossiê | ⬜ |
| 5 | Linha do tempo de mandatos (Fase 2 do histórico) | ⬜ |
| 6 | Texto biográfico livre (Wikipedia ou curadoria manual) | ⬜ |

---

## DÍVIDAS TÉCNICAS QUE AFETAM ESTE PLANO

- Coluna `foto_url` existe mas está vazia para a maioria dos parlamentares (preenchida ao vivo)
- `schema.sql` desatualizado — qualquer `ALTER TABLE` deve ser documentado nos dois lados
- Sem testes: validar enriquecimentos manualmente antes de popular o banco de produção
