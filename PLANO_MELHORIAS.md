# 🗺️ PLANO DE MELHORIAS — pós-postagem

> Atualizado em 11/06/2026. Substitui a versão de 11/05 (dossiê — entregue: bio real, mandatos,
> nome de urna, enriquecimento, foto). Item remanescente daquela versão (foto/bio de senadores
> via Senado API) foi absorvido na Fase C.
>
> Sequência aprovada: **A → B → C → D → E** (município → índices completos → senadores → PLs persistidos → chave).
> Critério: régua da constituição (CLAUDE.md) — primeiro o que fecha a promessa
> "entre pelo seu lugar e veja a realidade dele".
> Esforço: 🟢 horas · 🟡 1-2 dias · 🔴 3-5 dias

---

## FASE A — Índices na página de município (nome → código IBGE) 🟡

**Por quê primeiro:** o PainelIndices existe em Brasil/Região/Estado mas não no município — e o
cidadão entra pela cidade dele. É o elo que falta da cascata.

**Problema técnico:** MunicipioPage identifica município por **nome** (`"NITERÓI - RJ"`); as
tabelas `indices_municipio` usam **código IBGE 7 dígitos** (`3303302`).

**Passos:**
1. `scripts/migrate_municipios_ibge.py` — tabela `municipios_ibge(codigo_ibge INTEGER PK, nome TEXT,
   nome_normalizado TEXT, uf TEXT)` + índice `(nome_normalizado, uf)`.
2. `scripts/coleta_municipios_ibge.py` — popula da API de localidades do IBGE
   (`/api/v1/localidades/municipios`, 5.570 itens em 1 GET). Normalização: UPPER + sem acento
   (mesma `_unaccent` do api.py). Idempotente (INSERT OR REPLACE).
3. Backend: `GET /api/indices/municipio_por_nome?nome=X&uf=Y` — resolve via `municipios_ibge` e
   delega pra lógica existente do `/indices/municipio/{cod}`. 404 se não resolver (sem chute).
4. Frontend: `MunicipioPage` monta `<PainelIndices>` (adaptar prop pra aceitar nome+uf).
5. **Validação:** taxa de match dos municípios com emendas (esperado >95%); spot-check Niterói
   (3303302), Rio (3304557), São Paulo (3550308). Não-resolvidos → `logs/municipios_sem_ibge.log`.

**Risco:** grafias divergentes (ex: "MOJI MIRIM" vs "MOGI MIRIM"). Mitigação: log de
não-resolvidos + fallback "—" explícito (nunca dado errado).

---

## FASE B — Completar os 5 indicadores da constituição 🔴 (1 coletor por vez)

**Estado:** 2/5 prontos (população, alfabetização — IBGE Censo 2022). O frontend
(`PainelIndices.META`) **já tem** ícone/cor pra idhm, esgoto, homicídios, desmatamento —
renderiza sozinho quando o dado chegar.

| Ordem | Indicador | Fonte | Caminho técnico | Esforço |
|---|---|---|---|---|
| B1 | **IDH-M** | PNUD Atlas Brasil | Sem API estável → CSV municipal (2010 oficial) versionado em `cache/indices/`, importador `coleta_indices_idhm.py` | 🟢 |
| B2 | **Homicídios/100k** | IPEA Atlas da Violência | API pública do IPEA (séries por município/UF) → `coleta_indices_violencia.py` | 🟡 |
| B3 | **Desmatamento km²** | INPE TerraBrasilis (PRODES) | API REST por município/ano → `coleta_indices_desmatamento.py`. Cobertura: Amazônia Legal (resto "—", honesto) | 🟡 |
| B4 | **Esgoto coletado/tratado %** | SNIS/MDR | Sem API — CSV da Série Histórica (IN015/IN046), importador como B1 | 🟡 |

**Regras pra todos (constituição):** idempotente; "sem dado" → omitir (nunca zero); `fonte` e
`ano` gravados por linha; validação de amostra contra valor público conhecido antes do commit
(ex: IDH São Caetano ≈ 0,862 topo nacional).

**Entrega incremental:** 1 coletor = 1 commit = aparece no site na hora.

---

## FASE C — Raio-X (e foto/bio) para senadores 🟡

**Estado:** votações coletadas são só da Câmara → senador não tem raio-x (o gate de exibição já
inclui Senador; falta só o dado). Foto/bio de senador também não tem fonte (Câmara API não cobre).

**Passos:**
1. `scripts/coleta_votacoes_senado.py` — API dados abertos do Senado
   (`legis.senado.leg.br/dadosabertos`, votações nominais de plenário). Persiste nas tabelas
   existentes `votacoes`/`votacoes_votos` com `id_votacao` prefixado `sen-` (evita colisão).
2. Matching senador↔`politicos` por nome normalizado contra `cargo='Senador'` (+nome_urna).
   Logar não-matcheados.
3. Re-rodar `migrate_votacoes_agg.py` (idempotente — pega Câmara+Senado juntos).
4. No mesmo coletor: foto (`urlFoto`) e bio do senador → `politicos.foto_url`/`bio_json`
   (fecha o item remanescente do plano de 11/05).
5. Agendar no scheduler junto do job semanal de votações.
6. **Validação:** scorecard de 2-3 senadores conhecidos; alinhamento deve discriminar
   (não pode ficar todo mundo ~50%).

**Risco:** parte dos endpoints do Senado é XML antigo — pode exigir parsing extra.

---

## FASE D — PLs autorais persistidos 🟡

**Estado:** seção "Atuação Legislativa" consulta a Câmara **ao vivo** (até 30s);
`BlocoProjetosLegislativos` é placeholder.

**Passos:**
1. `scripts/migrate_proposicoes.py` — tabela `proposicoes(id_camara INTEGER PK, politico_id, tipo,
   numero, ano, ementa, status, status_data, status_orgao, url, coletado_em)` + índices
   `(politico_id)`, `(ano)`.
2. `scripts/coleta_proposicoes.py` — `/proposicoes?idDeputadoAutor=` por deputado ativo
   (513 com id_camara), idempotente, rate-limit cortês (~1 req/s).
3. Endpoint `GET /api/politicos/{id}/proposicoes` (paginado, padrão dos existentes).
4. Frontend: `BlocoProjetosLegislativos` sai do placeholder; seção legada lê do banco
   (30s → instantâneo), Câmara-viva vira fallback.
5. Agendar coleta semanal no scheduler.
6. **Validação:** deputado produtivo conhecido deve listar dezenas de PLs; contagem bate com o
   site da Câmara.

**Bônus desbloqueado:** ranking por produção legislativa (dimensão #2 da régua) vira query barata.

---

## FASE E — Rotacionar chave do Portal da Transparência 🟢 (manual, Vitor)

1. **Vitor:** portal → gerar chave nova → substituir no `.env` → revogar a antiga.
2. **Claude:** varrer repo confirmando que nenhum log/commit imprime a chave (re-conferir pós-rotação).

> Pendência de segurança desde antes do loop (a chave atual já vazou uma vez).
> Única ação 100% manual do plano.

---

## 📌 Fechamento de cada fase

`tsc` limpo + build + smoke test live + commit descritivo + linha no `logs/loop_progress.log`.
Dado novo: validação de amostra contra fonte pública antes do commit (integridade = regra #1).

## ⚠️ Relação com a postagem

Nada aqui bloqueia o push de agora — o site está pronto. Este plano é o pós-post.
Fases A-D são autônomas (posso rodar em loop); a E é do Vitor.
Pendência da postagem (fora deste plano): definir como o banco de produção (Turso) recebe os
dados novos — re-upload do SQLite local ou rodar migrations/coletas lá.
