-- Schema canônico do banco transparencia_rj.db
--
-- Este arquivo documenta a estrutura real do banco. As tabelas com
-- coletor ativo são criadas via CREATE TABLE IF NOT EXISTS pelos
-- scripts de coleta — este SQL é a referência única e idempotente.
--
-- Última sincronização: 2026-05-07 (hardening + scheduler TSE)

-- ============================================================
-- TABELAS ATIVAS (populadas pelos coletores)
-- ============================================================

-- politicos: parlamentares federais identificados nas emendas (autores)
-- Coletor: coleta_emendas.py (insere via INSERT OR IGNORE quando aparece autor novo)
CREATE TABLE IF NOT EXISTS politicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE,
    cargo TEXT,
    partido TEXT
);

-- emendas: emendas parlamentares destinadas ao RJ
-- Fonte: api.portaldatransparencia.gov.br/api-de-dados/emendas
-- Coletor: coleta_emendas.py (anos 2014→atual, com cache JSON em cache/emendas/)
CREATE TABLE IF NOT EXISTS emendas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    politico_id INTEGER,
    ano INTEGER,
    valor REAL,
    descricao TEXT,
    objetivo TEXT,
    municipio_destino TEXT,
    codigo_emenda TEXT,
    fonte_url TEXT,
    UNIQUE(codigo_emenda, municipio_destino),
    FOREIGN KEY (politico_id) REFERENCES politicos(id)
);

-- contratos: contratos federais com fornecedores no RJ
-- Fonte: api.portaldatransparencia.gov.br/api-de-dados/contratos
-- Coletor: coleta_contratos.py (ano corrente dinâmico, ministérios principais; expandir conforme necessidade)
CREATE TABLE IF NOT EXISTS contratos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT UNIQUE,
    objeto TEXT,
    valor REAL,
    data_inicio TEXT,
    data_fim TEXT,
    fornecedor_nome TEXT,
    fornecedor_cnpj TEXT,
    orgao TEXT,
    municipio TEXT,
    fonte_url TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- campanhas: financiamento eleitoral por candidato (TSE)
-- Fonte: divulgacandcontas.tse.jus.br
-- Coletor: backend/collectors/coleta_tse.py (MANUAL — não está no scheduler)
-- Migração: backend/migrate_tse.py (cria as tabelas campanhas + doadores)
CREATE TABLE IF NOT EXISTS campanhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    politico_id INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    cargo TEXT,
    total_receitas REAL DEFAULT 0,
    total_despesas REAL DEFAULT 0,
    situacao TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (politico_id) REFERENCES politicos(id) ON DELETE CASCADE
);

-- doadores: top doadores por campanha (TSE)
CREATE TABLE IF NOT EXISTS doadores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campanha_id INTEGER NOT NULL,
    nome_doador TEXT NOT NULL,
    documento_doador TEXT,
    valor REAL NOT NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campanha_id) REFERENCES campanhas(id) ON DELETE CASCADE
);

-- ============================================================
-- TABELAS DECLARADAS MAS DORMENTES (sem coletor ativo)
-- A API faz fallback de /api/municipios extraindo nomes únicos da
-- coluna municipio_destino de emendas quando estas tabelas estão vazias.
-- ============================================================

-- municipios: catálogo dos municípios do RJ
CREATE TABLE IF NOT EXISTS municipios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    regiao TEXT,
    populacao INTEGER,
    latitude REAL,
    longitude REAL
);

-- empresas: cadastro de empresas (CNPJ)
CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cnpj TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    situacao TEXT,
    data_abertura DATE,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- empresa_politico: vínculos entre empresas e políticos
CREATE TABLE IF NOT EXISTS empresa_politico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    politico_id INTEGER NOT NULL,
    tipo_vinculo TEXT,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (politico_id) REFERENCES politicos(id) ON DELETE CASCADE
);

-- problemas: problemas/incidentes registrados por município
CREATE TABLE IF NOT EXISTS problemas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    municipio_id INTEGER NOT NULL,
    tipo TEXT,
    descricao TEXT,
    severidade INTEGER CHECK (severidade >= 1 AND severidade <= 10),
    data_ocorrencia DATE,
    fonte TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (municipio_id) REFERENCES municipios(id) ON DELETE CASCADE
);

-- ============================================================
-- ÍNDICES (otimizam as queries da API)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_politicos_nome ON politicos(nome);
CREATE INDEX IF NOT EXISTS idx_politicos_partido ON politicos(partido);
CREATE INDEX IF NOT EXISTS idx_politicos_cargo ON politicos(cargo);

CREATE INDEX IF NOT EXISTS idx_emendas_politico_id ON emendas(politico_id);
CREATE INDEX IF NOT EXISTS idx_emendas_ano ON emendas(ano);
CREATE INDEX IF NOT EXISTS idx_emendas_municipio_destino ON emendas(municipio_destino);
CREATE INDEX IF NOT EXISTS idx_emendas_codigo_emenda ON emendas(codigo_emenda);

CREATE INDEX IF NOT EXISTS idx_contratos_municipio ON contratos(municipio);
CREATE INDEX IF NOT EXISTS idx_contratos_orgao ON contratos(orgao);
CREATE INDEX IF NOT EXISTS idx_contratos_fornecedor_cnpj ON contratos(fornecedor_cnpj);

CREATE INDEX IF NOT EXISTS idx_campanhas_politico_id ON campanhas(politico_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_ano ON campanhas(ano);
CREATE INDEX IF NOT EXISTS idx_doadores_campanha_id ON doadores(campanha_id);

CREATE INDEX IF NOT EXISTS idx_municipios_nome ON municipios(nome);
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_nome ON empresas(nome);
CREATE INDEX IF NOT EXISTS idx_empresa_politico_empresa_id ON empresa_politico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_empresa_politico_politico_id ON empresa_politico(politico_id);
CREATE INDEX IF NOT EXISTS idx_problemas_municipio_id ON problemas(municipio_id);
CREATE INDEX IF NOT EXISTS idx_problemas_severidade ON problemas(severidade);
