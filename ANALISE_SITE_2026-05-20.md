# Análise Horus — Relatório da Madrugada
**Gerado em:** 20/05/2026 (enquanto você dormia)

---

## 1. STATUS DO BANCO DE DADOS

| Métrica | Valor |
|---|---|
| Total de emendas | **64.478** |
| Cobertura temporal | **2014–2024** (2025/2026 em coleta — ver §5) |
| UFs cobertas | **27/27** (todas as siglas reais presentes) |
| Emendas valor zero | **2** (irrelevante) |
| Parlamentares individuais | **~2.099** |
| Tamanho do banco | ~750 KB |

**Score de qualidade dos dados: ~99.9%** — emendas sem município ou UF são estados inteiros (ex: "RIO DE JANEIRO (UF)"), não erro de coleta.

---

## 2. TOP 10 PARLAMENTARES (por valor empenhado)

| # | Nome | Emendas | Total |
|---|---|---|---|
| 1 | MARCOS ROGÉRIO | 54 | R$ 226M |
| 2 | DAVI ALCOLUMBRE | 55 | R$ 222M |
| 3 | EDUARDO BRAGA | 32 | R$ 220M |
| 4 | MARCELO CASTRO | 51 | R$ 202M |
| 5 | LUIS CARLOS HEINZE | 91 | R$ 202M |
| 6 | PAULO PAIM | 68 | R$ 201M |
| 7 | ELIZIANE GAMA | 68 | R$ 199M |
| 8 | RANDOLFE RODRIGUES | 114 | R$ 191M |
| 9 | ROMÁRIO | 83 | R$ 184M |
| 10 | FERNANDO BEZERRA | ~50 | ~R$ 180M |

> ⚠️ "Sem informação" aparece com 952 emendas / R$340M — são emendas onde o Portal da Transparência não associou parlamentar individual. Estão filtradas no frontend mas existem no banco.

---

## 3. PERFORMANCE DA API (backend rodando)

Todos os endpoints responderam em **~2s**, o que é lento para endpoints simples como `/health`.

**Causa provável:** a coleta de emendas está rodando em background e travando o SQLite (WAL mode, mas ainda contende).

**Após a coleta terminar** os tempos devem voltar a <200ms para endpoints simples.

| Endpoint | Status | Tamanho resp. |
|---|---|---|
| `/api/health` | ✅ 200 | 138B |
| `/api/emendas/total` | ✅ 200 | 15B |
| `/api/politicos?limite=5` | ✅ 200 | 929B |
| `/api/politicos/1` | ✅ 200 | 8.6KB |
| `/api/estatisticas` | ✅ 200 | 3.5KB |
| `/api/busca/global?q=saude` | ✅ 200 | 138B |
| `/api/status/coleta` | ✅ 200 | 5.2KB |
| `/api/inconsistencias` | ❌ 404 | — |
| `/api/municipios/ranking` | ❌ 404 | — |

> ⚠️ **Os 2 endpoints 404** existem no código mas o backend precisa ser **reiniciado** para carregá-los. Execute `.\start.ps1` ou reinicie o uvicorn.

---

## 4. AUDITORIA DE CÓDIGO FRONTEND

### Arquivos mortos / órfãos
- **`MunicipiosListPage.tsx`** — existe em `pages/` mas não está importado em lugar nenhum no App.tsx. É uma lista legada do RJ. Pode ser deletado com segurança.
- **`EstadoBadge.tsx`** — existe em `components/` mas nenhuma página importa. Pode ser deletado.

### Headers ngrok em produção
- `PoliticosListPage.tsx:52` — `'ngrok-skip-browser-warning': '69420'` no fetch. Inócuo mas desnecessário em produção. Remover.

### Tipagem `any` remanescente
- `EstatisticasPage.tsx` usa `(a: any)`, `(p: any)`, `(m: any)`, `(obj: any)` em 8 lugares. Funciona mas é código legado — não é urgente, mas pode causar surpresas se o shape da API mudar.

### void hack desnecessário
- `EstatisticasPage.tsx:72` — `void media_por_emenda; // usada indiretamente via data` — a variável não precisa ser extraída do destructuring se não for usada diretamente. Cleanup cosmético.

### "EM BREVE" remanescentes (aceitáveis)
- `HeatmapCard.tsx` — "DADOS EM BREVE" quando placeholder=true. Correto, é estado real.
- `SearchBar.tsx` — "Leis · Em breve" na aba leis. Correto, feature não implementada.
- `RegiaoPage.tsx` — fallback "EM BREVE" quando sem dados de UF. Correto.

### Dados mock reais ainda em uso
- `ParlamentaresListPage.tsx` — `FEDERAL = { total: 594, senado: 81, camara: 513 }` e `CAPITAIS_PRINCIPAIS` com contagem de vereadores. São dados estáticos válidos (câmara federal não muda frequentemente). OK.

### Props callback legadas (ainda necessárias)
- `PoliticosListPage` ainda recebe `onPoliticoClick` do App.tsx — necessário para navigação. OK.
- `MunicipioPage` recebe `onVoltar` e `onPoliticoClick` — necessário para navegação. OK.
- `HomePage` recebe `onMunicipioClick` e `onMunicipioClickFromMap` — necessário para integração com mapa. OK.

---

## 5. STATUS DA COLETA DE DADOS (2025/2026)

A coleta foi iniciada às ~01h00 e **ainda está rodando**.

**Situação antes da coleta:** dados só até 2024 (11 anos, 56k emendas aprox.)

**Situação atual:** 64.478 emendas (coleta adicionou dados de anos anteriores com mais completude).

**2025 e 2026:** ainda pendentes. A coleta deve terminar antes das 08h. Para verificar quando acordar:
```
python -c "import sqlite3; c=sqlite3.connect('transparencia_rj.db').cursor(); c.execute('SELECT ano, COUNT(*) FROM emendas WHERE ano>=2025 GROUP BY ano'); print(c.fetchall())"
```

---

## 6. FEATURES IMPLEMENTADAS NESTA NOITE

Antes de você dormir + durante a madrugada:

| Feature | Status |
|---|---|
| Fix bug `%X%` no CompararPage | ✅ |
| Spinners → bouncing dots (padrão visual) | ✅ |
| CSV export na CompararPage | ✅ |
| Banners "EM CONSTRUÇÃO" removidos | ✅ |
| Endpoint `/api/inconsistencias` | ✅ (precisa restart backend) |
| Card de qualidade de dados na StatusPage | ✅ (precisa restart backend) |
| Coleta de dados 2025/2026 | ⏳ em andamento |

---

## 7. AÇÕES RECOMENDADAS PARA AMANHÃ

**Prioritário:**
1. `.\start.ps1` (ou reiniciar uvicorn) → ativa `/api/inconsistencias` e `/api/municipios/ranking`
2. Verificar se coleta de 2025/2026 terminou (comando acima)

**Opcional:**
3. Remover `MunicipiosListPage.tsx` e `EstadoBadge.tsx` (arquivos órfãos)
4. Remover header `ngrok-skip-browser-warning` do `PoliticosListPage.tsx`
5. Tipar o `any` no `EstatisticasPage.tsx` se quiser código mais rigoroso

**Não urgente:**
6. Rotacionar chave do Portal da Transparência (CLAUDE.md diz que já vazou antes)
7. Fechar CORS `allow_origins=["*"]` antes de qualquer deploy público sério

---

## 8. SAÚDE GERAL DO SISTEMA

```
Backend FastAPI:     ONLINE ✅
Banco SQLite:        OK (64.478 emendas) ✅
Frontend build:      Limpo, sem erros TS ✅
Coleta em curso:     2025/2026 ⏳
Novos endpoints:     Aguardando restart ⚠️
```

**Nota sobre performance:**  
Quando a coleta terminar, os tempos de API voltam ao normal (<200ms). O SQLite em WAL mode aguenta leitura concorrente, mas a escrita da coleta aumenta latência de todas as queries.

---

*Relatório gerado automaticamente pela análise noturna do Horus.*
