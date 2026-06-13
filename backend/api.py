import sqlite3
import math
import unicodedata
import re
import os
import json
import logging
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Optional

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(LOG_DIR, "api.log"), encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("horus-api")

# Suporte Turso (libSQL): usado quando rodando na nuvem (Koyeb).
# Localmente continua usando SQLite via sqlite3.
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")
_use_turso = bool(TURSO_DATABASE_URL and TURSO_AUTH_TOKEN)
# Config parcial é quase sempre erro de deploy (esqueceu uma das duas vars) —
# avisa em vez de cair pro SQLite local silenciosamente.
if bool(TURSO_DATABASE_URL) != bool(TURSO_AUTH_TOKEN):
    _faltando = "TURSO_AUTH_TOKEN" if TURSO_DATABASE_URL else "TURSO_DATABASE_URL"
    logger.warning("Turso configurado pela metade (falta %s) — usando SQLite local.", _faltando)
if _use_turso:
    try:
        import libsql_experimental as libsql  # noqa: F401 — só importa se disponível (Linux/Koyeb)
    except ImportError:
        _use_turso = False
        print("AVISO: libsql_experimental não encontrado; usando SQLite local.")


def _unaccent(value):
    """Remove acentos pra busca textual case/acento-insensitive."""
    if value is None:
        return ''
    nfd = unicodedata.normalize('NFD', str(value))
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')


def _mun_key(value):
    """Chave canônica de município: sem acento, maiúsculo, pontuação (hífen,
    apóstrofo, ponto) virada em espaço e espaços colapsados. Faz
    "GRÃO-PARÁ" == "GRÃO PARÁ" e "PINGO-D'ÁGUA" == "PINGO D'ÁGUA" — o Portal da
    Transparência e o TSE divergem na pontuação dos nomes."""
    s = _unaccent(value).upper()
    s = s.replace("'", ' ').replace('-', ' ').replace('.', ' ')
    return re.sub(r'\s+', ' ', s).strip()


# Municípios cujo nome no Portal da Transparência (emendas) diverge do nome
# atual do TSE — renomeações oficiais do IBGE e grafias antigas. Sem isto a
# página da cidade não casa o registro do TSE e prefeito/vereadores "somem".
# Chave (UF, nome-Portal); valor: nome-TSE atual. Per-UF de propósito: BA
# "Santa Teresinha" → "Santa Terezinha", mas PB tem "Santa Teresinha" real.
_MUN_ALIAS_RAW = {
    ('RO', "ESPIGÃO D'OESTE"):         'Espigão do Oeste',
    ('RO', "ALVORADA D'OESTE"):        'Alvorada do Oeste',
    ('RS', 'SANTANA DO LIVRAMENTO'):   "Sant'Ana do Livramento",
    ('CE', 'ITAPAGÉ'):                 'Itapajé',
    ('MT', 'POXORÉO'):                 'Poxoréu',
    ('MG', 'BRASÓPOLIS'):              'Brazópolis',
    ('PE', 'IGUARACI'):                'Iguaracy',
    ('RJ', 'TRAJANO DE MORAIS'):       'Trajano de Moraes',
    ('SE', 'GRACHO CARDOSO'):          'Graccho Cardoso',
    ('BA', 'CAMACAN'):                 'Camacã',
    ('BA', 'MUQUÉM DE SÃO FRANCISCO'): 'Muquém do São Francisco',
    ('BA', 'SANTA TERESINHA'):         'Santa Terezinha',
    ('SP', 'EMBU'):                    'Embu das Artes',
    ('SP', 'FLORÍNIA'):                'Florínea',
    ('TO', 'FORTALEZA DO TABOCÃO'):    'Tabocão',
    ('RN', 'AÇU'):                     'Assú',
    ('RN', 'ARÊS'):                    'Arez',
    ('RN', 'PRESIDENTE JUSCELINO'):    'Serra Caiada',
    ('RN', 'AUGUSTO SEVERO'):          'Campo Grande',
    ('RN', 'JANUÁRIO CICCÓ'):          'Boa Saúde',
}
MUN_ALIAS = {(uf, _mun_key(p)): _mun_key(t) for (uf, p), t in _MUN_ALIAS_RAW.items()}

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(title="Transparência RJ API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

class CacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error("Unhandled exception in middleware: %s", exc, exc_info=True)
            raise
        path = request.url.path
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        elif path.startswith("/assets/"):
            response.headers["Cache-Control"] = "public, max-age=86400"
        return response

app.add_middleware(CacheMiddleware)

# Compressão GZip — reduz payloads JSON grandes (estatísticas, listas de emendas)
# em ~70-85%. minimum_size evita comprimir respostas pequenas (overhead).
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Hierarquia territorial codificada no próprio código IBGE:
#   município (7 díg) -> estado = cod // 100000 ; região = cod // 1000000
#   estado (2 díg)    -> região = cod // 10
REGIAO_NOME = {1: "norte", 2: "nordeste", 3: "sudeste", 4: "sul", 5: "centro-oeste"}
REGIAO_DIGITO = {v: k for k, v in REGIAO_NOME.items()}
UF_CODIGO = {
    "RO": 11, "AC": 12, "AM": 13, "RR": 14, "PA": 15, "AP": 16, "TO": 17,
    "MA": 21, "PI": 22, "CE": 23, "RN": 24, "PB": 25, "PE": 26, "AL": 27, "SE": 28, "BA": 29,
    "MG": 31, "ES": 32, "RJ": 33, "SP": 35,
    "PR": 41, "SC": 42, "RS": 43,
    "MS": 50, "MT": 51, "GO": 52, "DF": 53,
}
CODIGO_UF = {v: k for k, v in UF_CODIGO.items()}
UF_NOME = {
    "RO": "Rondônia", "AC": "Acre", "AM": "Amazonas", "RR": "Roraima", "PA": "Pará",
    "AP": "Amapá", "TO": "Tocantins", "MA": "Maranhão", "PI": "Piauí", "CE": "Ceará",
    "RN": "Rio Grande do Norte", "PB": "Paraíba", "PE": "Pernambuco", "AL": "Alagoas",
    "SE": "Sergipe", "BA": "Bahia", "MG": "Minas Gerais", "ES": "Espírito Santo",
    "RJ": "Rio de Janeiro", "SP": "São Paulo", "PR": "Paraná", "SC": "Santa Catarina",
    "RS": "Rio Grande do Sul", "MS": "Mato Grosso do Sul", "MT": "Mato Grosso",
    "GO": "Goiás", "DF": "Distrito Federal",
}
# Como cada indicador agrega na cascata: 'sum' (totais) ou 'wmean' (média ponderada por pop)
INDICE_AGG = {"populacao": "sum", "desmatamento_km2": "sum"}  # default = wmean

# Filtro: rankings públicos só consideram parlamentares individuais.
# Autores coletivos (bancadas, comissões, relatores) são marcados em
# coleta_emendas.py com cargo='Autor Coletivo' e excluídos via este predicado.
NOT_AUTOR_COLETIVO_SQL = "COALESCE(p.cargo, '') != 'Autor Coletivo'"

# As 27 UFs oficiais do Brasil — exclui valores espúrios (BR, MULT, REG, EXT, etc.)
# usados em distribuição geográfica e filtros de mapa.
UFS_OFICIAIS = frozenset({
    'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
    'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
})

# CORS: em produção definir ALLOWED_ORIGINS no .env (ex: "https://horus.dominio.com.br")
# Padrão local: apenas localhost:5173 (Vite dev) e localhost:7291 (API próprio)
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:7291,http://127.0.0.1:5173,http://127.0.0.1:7291")
_allow_origins = [o.strip() for o in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Caminho do banco (fica um diretório acima do /backend case seja executado na raiz)
# Se executado dentro da pasta backend, db fica num nível acima
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "transparencia_rj.db")
if not os.path.exists(DB_PATH):
    # Fallback caso seja executado diretamente na raiz
    DB_PATH = "transparencia_rj.db"

def get_db_connection():
    """
    Retorna conexão com o banco.
    - Turso (libSQL): quando TURSO_DATABASE_URL e TURSO_AUTH_TOKEN estão definidos (Koyeb).
      Usa embedded replica: lê do SQLite local sincronizado com a nuvem.
    - SQLite padrão: para desenvolvimento local.
    """
    if _use_turso:
        import libsql_experimental as libsql
        conn = libsql.connect(
            database=DB_PATH,
            sync_url=TURSO_DATABASE_URL,
            auth_token=TURSO_AUTH_TOKEN,
        )
        conn.sync()
    else:
        conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")   # leituras simultâneas com escrita
    conn.execute("PRAGMA foreign_keys = ON")
    conn.create_function("unaccent", 1, _unaccent)
    conn.create_function("mun_key", 1, _mun_key)
    return conn




@app.get("/api/municipios/heatmap")
@limiter.limit("30/minute")
def obter_municipios_heatmap(request: Request):
    """
    Retorna lista de municípios com valor total de emendas e contagem,
    usado para gerar o heatmap no mapa.
    """
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Query SQL para agrupar emendas por município e somar os valores
        cur.execute("""
            SELECT
                UPPER(municipio_destino) as nome,
                SUM(valor) as valor_total,
                COUNT(*) as total_emendas
            FROM emendas
            WHERE municipio_destino IS NOT NULL AND municipio_destino != ''
            GROUP BY UPPER(municipio_destino)
            ORDER BY valor_total DESC
            LIMIT 2000
        """)
        rows = cur.fetchall()
        return [
            {"nome": r["nome"], "valor_total": r["valor_total"], "total_emendas": r["total_emendas"]}
            for r in rows
        ]
    finally:
        conn.close()


@app.get("/api/emendas/busca")
@limiter.limit("30/minute")
def buscar_emendas(
    request: Request,
    q: Optional[str] = Query(None),
    ano: Optional[int] = Query(None),
    municipio: Optional[str] = Query(None),
    politico: Optional[int] = Query(None),
    pagina: int = Query(1, ge=1),
    limite: int = Query(50, ge=1, le=200)
):
    """
    Busca avançada de emendas com múltiplos filtros.
    """
    conn = get_db_connection()
    try:
        query = """
            SELECT e.*, p.nome as politico_nome, p.partido as politico_partido
            FROM emendas e
            LEFT JOIN politicos p ON e.politico_id = p.id
            WHERE 1=1
        """
        params = []

        if q:
            # Busca acento/case-insensitive: normaliza tanto o conteúdo quanto a query.
            # "saude" bate com "Saúde", "EDUCAÇÃO" bate com "educacao".
            query += " AND (UPPER(unaccent(e.descricao)) LIKE UPPER(unaccent(?)) OR UPPER(unaccent(e.objetivo)) LIKE UPPER(unaccent(?)))"
            params.extend([f"%{q}%", f"%{q}%"])
        
        if ano:
            query += " AND e.ano = ?"
            params.append(ano)
            
        if municipio:
            query += " AND UPPER(e.municipio_destino) LIKE UPPER(?)"
            params.append(f"%{municipio}%")
            
        if politico:
            query += " AND e.politico_id = ?"
            params.append(politico)

        # Contar total para paginação
        count_query = f"SELECT COUNT(*) as total FROM ({query})"
        result_count = conn.execute(count_query, params).fetchone()
        total = result_count["total"] if result_count else 0
        paginas = math.ceil(total / limite) if total > 0 else 0

        # 404 quando pagina solicitada está fora do intervalo válido.
        if total > 0 and pagina > paginas:
            raise HTTPException(
                status_code=404,
                detail=f"Página {pagina} fora do intervalo. Total de páginas: {paginas}."
            )

        # Paginação
        query += " ORDER BY e.ano DESC, e.valor DESC LIMIT ? OFFSET ?"
        params.extend([limite, (pagina - 1) * limite])

        rows = conn.execute(query, params).fetchall()

        return {
            "total": total,
            "pagina": pagina,
            "limite": limite,
            "paginas": paginas,
            "resultados": [dict(r) for r in rows]
        }
    finally:
        conn.close()


@app.get("/api/municipios")
@limiter.limit("60/minute")
def listar_municipios(
    request: Request,
    busca: Optional[str] = Query(None),
    uf:    Optional[str] = Query(None),
    limite: int = Query(2000, ge=1, le=10000),
):
    """
    Lista municípios. Filtros: busca (nome), uf (sigla 2 letras).
    Fonte: tabela municipios ou fallback em emendas.municipio_destino.
    """
    conn = get_db_connection()
    try:
        query  = "SELECT id, nome FROM municipios WHERE 1=1"
        params: list = []

        if busca:
            query += " AND UPPER(nome) LIKE UPPER(?)"
            params.append(f'%{busca}%')

        if uf:
            # Nomes armazenados como "CIDADE - UF"
            query += " AND UPPER(nome) LIKE UPPER(?)"
            params.append(f'% - {uf.upper()}')

        query += " ORDER BY nome LIMIT ?"
        params.append(limite)

        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]
    except sqlite3.OperationalError:
        try:
            q = "SELECT DISTINCT municipio_destino as nome FROM emendas WHERE municipio_destino != ''"
            p: list = []
            if busca:
                q += " AND UPPER(municipio_destino) LIKE UPPER(?)"; p.append(f'%{busca}%')
            if uf:
                q += " AND UPPER(municipio_destino) LIKE UPPER(?)"; p.append(f'% - {uf.upper()}')
            q += f" ORDER BY municipio_destino LIMIT {limite}"
            rows = conn.execute(q, p).fetchall()
            return [{"id": i + 1, "nome": r["nome"]} for i, r in enumerate(rows)]
        except sqlite3.OperationalError:
            return []
    finally:
        conn.close()


@app.get("/api/municipios/ranking")
@limiter.limit("30/minute")
def ranking_municipios(
    request: Request,
    limite: int = Query(50, ge=5, le=200),
    uf: Optional[str] = Query(None),
    ordenar: str = Query("valor", pattern="^(valor|emendas)$"),
):
    """
    Ranking dos municípios que mais receberam emendas no Brasil.
    Filtros: ?uf=SP para filtrar por estado. Ordenação: ?ordenar=valor (padrão) ou ?ordenar=emendas.
    """
    conn = get_db_connection()
    try:
        where = []
        params: list = []
        if uf:
            where.append("UPPER(uf) = ?"); params.append(uf.upper().strip())
        # Exclui pseudo-municípios — MÚLTIPLO/Nacional/estados '(UF)'/regiões
        # dominavam o pódio do ranking (MÚLTIPLO 'ganhava' com R$ 194B).
        where.append("municipio_destino IS NOT NULL")
        where.append("municipio_destino != ''")
        where.append("LENGTH(municipio_destino) > 3")
        where.append("municipio_destino NOT LIKE '%(UF)%'")
        where.append("UPPER(municipio_destino) NOT LIKE '%M_LTIPLO%'")
        where.append("UPPER(municipio_destino) NOT LIKE '%NACIONAL%'")
        where.append("UPPER(municipio_destino) NOT LIKE '%EXTERIOR%'")
        where.append("UPPER(municipio_destino) NOT IN ('NORTE','NORDESTE','CENTRO-OESTE','SUDESTE','SUL')")

        order = "valor_total DESC" if ordenar == "valor" else "total_emendas DESC"
        where_sql = (" AND ".join(where)) if where else "1=1"

        rows = conn.execute(f"""
            SELECT
                municipio_destino                    AS municipio,
                uf,
                COUNT(*)                             AS total_emendas,
                COALESCE(SUM(valor), 0)              AS valor_total,
                COUNT(DISTINCT politico_id)          AS total_politicos,
                MIN(ano) AS ano_min, MAX(ano) AS ano_max
            FROM emendas
            WHERE {where_sql}
            GROUP BY municipio_destino, uf
            ORDER BY {order}
            LIMIT ?
        """, params + [limite]).fetchall()

        return [
            {
                "municipio":      r["municipio"],
                "uf":             r["uf"],
                "total_emendas":  r["total_emendas"],
                "valor_total":    float(r["valor_total"]),
                "total_politicos":r["total_politicos"],
                "ano_min":        r["ano_min"],
                "ano_max":        r["ano_max"],
            }
            for r in rows
        ]
    except Exception as e:
        logger.error("Erro em /municipios/ranking: %s", e)
        return []
    finally:
        conn.close()


@app.get("/api/estados/{uf}/stats")
@limiter.limit("60/minute")
def stats_estado(request: Request, uf: str):
    """Stats rápidas de emendas para um estado: total, valor, parlamentares únicos, municípios."""
    conn = get_db_connection()
    try:
        uf_upper = uf.upper()
        row = conn.execute("""
            SELECT
                COUNT(*)                        AS total_emendas,
                COALESCE(SUM(valor), 0)         AS valor_total,
                COUNT(DISTINCT politico_id)     AS parlamentares,
                COUNT(DISTINCT municipio_destino) AS municipios
            FROM emendas
            WHERE UPPER(uf) = ?
        """, (uf_upper,)).fetchone()
        if not row:
            return {"total_emendas": 0, "valor_total": 0.0, "parlamentares": 0, "municipios": 0}
        return {
            "total_emendas":  row[0] or 0,
            "valor_total":    float(row[1] or 0),
            "parlamentares":  row[2] or 0,
            "municipios":     row[3] or 0,
        }
    except Exception as e:
        logger.error("Erro em /estados/%s/stats: %s", uf, e)
        return {"total_emendas": 0, "valor_total": 0.0, "parlamentares": 0, "municipios": 0}
    finally:
        conn.close()


@app.get("/api/eleitos/estadual")
@limiter.limit("60/minute")
def eleitos_estaduais_uf(request: Request,
                         uf: str = Query(..., min_length=2, max_length=2)):
    """
    Retorna governador, vice-governador, senadores (3 por UF), deputados federais
    e deputados estaduais ELEITOS em 2022 para uma UF.
    """
    uf_u = uf.upper().strip()
    conn = get_db_connection()
    try:
        # JOIN com politicos para obter politico_id quando houver correspondência por nome
        rows = conn.execute("""
            SELECT e.cargo, e.nome, e.nome_urna, e.partido, e.numero,
                   e.foto_url, e.mandato, e.sigla_situacao, e.id,
                   p.id AS politico_id
            FROM eleitos_estaduais e
            LEFT JOIN politicos p
                   ON UPPER(p.nome) = UPPER(e.nome)
                   OR UPPER(p.nome) = UPPER(e.nome_urna)
            WHERE e.uf = ? AND e.ano_eleicao = 2022
            ORDER BY e.cargo, e.nome
        """, (uf_u,)).fetchall()

        governador = None
        vice       = None
        senadores: list = []
        dep_federais: list = []
        dep_estaduais: list = []

        for r in rows:
            d = {
                "id":          r["id"],
                "nome":        r["nome"],
                "nome_urna":   r["nome_urna"],
                "partido":     r["partido"],
                "numero":      r["numero"],
                "foto_url":    r["foto_url"],
                "mandato":     r["mandato"],
                "situacao":    r["sigla_situacao"],
                "politico_id": r["politico_id"],  # None se não houver emendas
            }
            c = r["cargo"]
            if   c == "governador":        governador = d
            elif c == "vice_governador":   vice = d
            elif c == "senador":           senadores.append(d)
            elif c == "deputado_federal":  dep_federais.append(d)
            elif c == "deputado_estadual": dep_estaduais.append(d)

        return {
            "governador":         governador,
            "vice_governador":    vice,
            "senadores":          senadores,
            "deputados_federais":  dep_federais,
            "deputados_estaduais": dep_estaduais,
        }
    except Exception as e:
        logger.error("Erro em /eleitos/estadual %s: %s", uf_u, e)
        return {"governador": None, "vice_governador": None, "senadores": [],
                "deputados_federais": [], "deputados_estaduais": []}
    finally:
        conn.close()


@app.get("/api/foto_tse/{kind}/{registro_id}")
def proxy_foto_tse(kind: str, registro_id: int):
    """
    Proxy de foto TSE para eleitos (estaduais ou municipais).
    Resolve CORS, instabilidade 502 do TSE (com retry) e adiciona cache.

    kind = "estadual" ou "municipal"
    """
    import time, urllib.request

    if kind not in ("estadual", "municipal"):
        raise HTTPException(status_code=400, detail="kind invalido")

    _cache = getattr(proxy_foto_tse, "_cache", {})
    proxy_foto_tse._cache = _cache

    key = (kind, registro_id)
    now = time.time()
    if key in _cache:
        ts, ct, data = _cache[key]
        if now - ts < 86400:  # 24h
            return Response(content=data, media_type=ct,
                            headers={"Cache-Control": "public, max-age=86400"})

    tabela = "eleitos_estaduais" if kind == "estadual" else "eleitos_municipais"
    conn = get_db_connection()
    try:
        row = conn.execute(f"SELECT foto_url FROM {tabela} WHERE id = ?", (registro_id,)).fetchone()
    finally:
        conn.close()

    if not row or not row["foto_url"]:
        raise HTTPException(status_code=404, detail="sem foto")

    url = row["foto_url"]
    # Retry para resolver 502 intermitentes do TSE
    data, ct = None, "image/jpeg"
    for tentativa in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 Horus"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                ct   = resp.headers.get("Content-Type", "image/jpeg")
                data = resp.read()
            break
        except Exception:
            if tentativa < 2:
                time.sleep(1.5 * (tentativa + 1))
            continue

    if not data or len(data) < 500:
        raise HTTPException(status_code=502, detail="foto indisponivel")

    _cache[key] = (now, ct, data)
    return Response(content=data, media_type=ct,
                    headers={"Cache-Control": "public, max-age=86400"})


@app.get("/api/eleitos/municipal")
@limiter.limit("60/minute")
def eleitos_municipais(request: Request,
                       uf: str = Query(..., min_length=2, max_length=2),
                       municipio: str = Query(..., min_length=2)):
    """
    Retorna prefeito, vice-prefeito e vereadores eleitos em 2024 para um município.
    Match por (uf, municipio) case-insensitive, com normalização de acentos.

    Response: {
        prefeito: {nome, partido, foto_url, ...} | null,
        vice:     {nome, partido, foto_url, ...} | null,
        vereadores: [{nome, partido, foto_url, numero, ...}, ...]
    }
    """
    uf_u  = uf.upper().strip()
    # Remove sufixo " - UF" que vem do frontend (ex: "NITERÓI - RJ" → "NITERÓI")
    mun_clean = re.sub(r'\s*-\s*[A-Z]{2}$', '', municipio.strip().upper()).strip()
    # Chave canônica (sem acento, pontuação colapsada) + tradução de nomes que o
    # Portal grava diferente do TSE (renomeações IBGE/grafia antiga).
    mun_k = _mun_key(mun_clean)
    mun_k = MUN_ALIAS.get((uf_u, mun_k), mun_k)

    conn = get_db_connection()
    try:
        # Match por chave canônica. mun_key é função registrada na conexão —
        # dobra acento E pontuação ("GRÃO-PARÁ"=="GRÃO PARÁ"), o que UPPER()/
        # unaccent puro não faziam, deixando cidades caírem no placeholder.
        rows = conn.execute("""
            SELECT id, cargo, nome, nome_urna, partido, numero, foto_url, sigla_situacao
            FROM eleitos_municipais
            WHERE uf = ?
              AND mun_key(municipio) = ?
              AND ano_eleicao = 2024
        """, (uf_u, mun_k)).fetchall()

        # Resolve politico_id por match de nome (case-insensitive)
        nomes_upper = list({(r["nome"] or '').upper() for r in rows if r["nome"]})
        politico_por_nome: dict = {}
        if nomes_upper:
            placeholders = ",".join("?" * len(nomes_upper))
            pol_rows = conn.execute(
                f"SELECT id, nome FROM politicos WHERE UPPER(nome) IN ({placeholders})",
                nomes_upper
            ).fetchall()
            for p in pol_rows:
                politico_por_nome[(p["nome"] or '').upper()] = p["id"]

        prefeito  = None
        vice      = None
        vereadores: list = []

        for r in rows:
            nome_up = (r["nome"] or '').upper()
            d = {
                "id":          r["id"],
                "nome":        r["nome"],
                "nome_urna":   r["nome_urna"],
                "partido":     r["partido"],
                "numero":      r["numero"],
                "foto_url":    r["foto_url"],
                "situacao":    r["sigla_situacao"],
                "politico_id": politico_por_nome.get(nome_up),
            }
            if   r["cargo"] == "prefeito":      prefeito = d
            elif r["cargo"] == "vice_prefeito": vice     = d
            elif r["cargo"] == "vereador":      vereadores.append(d)

        # ordena vereadores por nome
        vereadores.sort(key=lambda v: v["nome"] or "")

        return {"prefeito": prefeito, "vice": vice, "vereadores": vereadores}
    except Exception as e:
        logger.error("Erro em /eleitos/municipal %s/%s: %s", uf_u, mun_k, e)
        return {"prefeito": None, "vice": None, "vereadores": []}
    finally:
        conn.close()


@app.get("/api/municipios/{municipio_id}/problemas")
def listar_problemas(municipio_id: int, severidade_min: Optional[int] = Query(None)):
    """
    Retorna problemas de um município filtrados por severidade_min (opcional).
    Ordenados por severidade decrescente.
    """
    conn = get_db_connection()
    try:
        query = "SELECT * FROM problemas WHERE municipio_id = ?"
        params = [municipio_id]
        
        if severidade_min is not None:
            query += " AND severidade >= ?"
            params.append(severidade_min)
            
        query += " ORDER BY severidade DESC"
        
        problemas = conn.execute(query, params).fetchall()
        return [dict(p) for p in problemas]
    except sqlite3.OperationalError as e:
        # Caso a tabela problemas não exista
        if "no such table" in str(e):
            return []
        logger.error("Erro em /problemas municipio_id=%s: %s", municipio_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno")
    finally:
        conn.close()


@app.get("/api/municipios/{municipio_id}/emendas")
def listar_emendas(municipio_id: int):
    """
    Retorna emendas destinadas a esse município.
    Traz o nome do político autor junto através de um JOIN.
    """
    conn = get_db_connection()
    try:
        # Precisamos descobrir o nome do município primeiro para cruzar com "municipio_destino" da tabela de emendas.
        # Se sua tabela `emendas` já tiver a coluna `municipio_id` configurada, basta alterar esta lógica.
        try:
            mun_row = conn.execute("SELECT nome FROM municipios WHERE id = ?", (municipio_id,)).fetchone()
            if not mun_row:
                raise HTTPException(status_code=404, detail="Município não encontrado.")
            nome_municipio = mun_row["nome"]
        except sqlite3.OperationalError:
            municipios = conn.execute(
                "SELECT DISTINCT municipio_destino FROM emendas WHERE municipio_destino != '' ORDER BY municipio_destino LIMIT 10000"
            ).fetchall()
            if municipio_id <= 0 or municipio_id > len(municipios):
                raise HTTPException(status_code=404, detail="Município não encontrado.")
            nome_municipio = municipios[municipio_id - 1]["municipio_destino"]

        query = """
            SELECT e.*, p.nome as politico_nome, p.partido as politico_partido
            FROM emendas e
            LEFT JOIN politicos p ON e.politico_id = p.id
            WHERE e.municipio_destino = ?
            ORDER BY e.valor DESC
            LIMIT 500
        """
        emendas = conn.execute(query, (nome_municipio,)).fetchall()
        return [dict(e) for e in emendas]
        
    except sqlite3.OperationalError as e:
        logger.error("Erro em /emendas municipio_id=%s: %s", municipio_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno")
    finally:
        conn.close()

@app.get("/api/emendas/total")
def obter_total_emendas():
    """
    Retorna a contagem total de emendas registradas no banco.
    """
    conn = get_db_connection()
    try:
        resultado = conn.execute("SELECT COUNT(id) as total FROM emendas").fetchone()
        return {"total": resultado["total"]}
    except sqlite3.OperationalError:
        return {"total": 0}
    finally:
        conn.close()


@app.get("/api/emendas/por_uf")
@limiter.limit("60/minute")
def emendas_por_uf(request: Request):
    """
    Contagem de emendas por UF (só as 27 oficiais). Endpoint leve e focado —
    a RegiaoPage usava /status/coleta (diagnóstico pesado: lê logs, parlamentares,
    pendências) só pra extrair esta fatia. Aqui é um único GROUP BY indexado.
    """
    conn = get_db_connection()
    try:
        ufs_tuple = tuple(UFS_OFICIAIS)
        placeholders = ",".join("?" * len(ufs_tuple))
        rows = conn.execute(f"""
            SELECT uf, COUNT(*) AS total, MIN(ano) AS ano_min, MAX(ano) AS ano_max
            FROM emendas
            WHERE uf IN ({placeholders})
            GROUP BY uf ORDER BY total DESC
        """, ufs_tuple).fetchall()
        return {"emendas_por_uf": [
            {"uf": r["uf"], "total": r["total"], "ano_min": r["ano_min"], "ano_max": r["ano_max"]}
            for r in rows
        ]}
    except sqlite3.OperationalError:
        return {"emendas_por_uf": []}
    finally:
        conn.close()


@app.get("/api/politicos/total")
def obter_total_politicos():
    """
    Retorna a contagem total de políticos individuais (exclui autores coletivos).
    """
    conn = get_db_connection()
    try:
        # Conta apenas políticos com pelo menos 1 emenda registrada — exclui stubs de
        # governadores/prefeitos criados a partir das tabelas de eleitos TSE.
        resultado = conn.execute(f"""
            SELECT COUNT(DISTINCT p.id) as total
            FROM politicos p
            JOIN emendas e ON e.politico_id = p.id
            WHERE {NOT_AUTOR_COLETIVO_SQL}
        """).fetchone()
        return {"total": resultado["total"]}
    except sqlite3.OperationalError:
        return {"total": 0}
    finally:
        conn.close()



@app.get("/api/politicos")
@limiter.limit("60/minute")
def listar_politicos_paginado(
    request: Request,
    pagina:  int = Query(1, ge=1),
    limite:  int = Query(20, ge=1, le=2000),
    busca:   Optional[str] = Query(None),
    uf:      Optional[str] = Query(None),
    casa:    Optional[str] = Query(None),
    partido: Optional[str] = Query(None),
    ordenar: Optional[str] = Query(None),  # valor|emendas|nome
    ano:     Optional[int] = Query(None),  # filtra parlamentares com emendas neste ano
):
    """
    Lista políticos paginados. Filtros: busca, uf, casa (camara|senado).
    Retorna foto_url para uso direto no frontend.
    """
    conn = get_db_connection()
    try:
        where_parts = [NOT_AUTOR_COLETIVO_SQL]
        params: list = []

        if busca and busca.strip():
            where_parts.append("UPPER(p.nome) LIKE UPPER(?)")
            params.append(f'%{busca.strip()}%')

        if uf and uf.strip():
            where_parts.append("UPPER(p.uf) = UPPER(?)")
            params.append(uf.strip())

        if casa and casa.strip():
            where_parts.append("p.casa = ?")
            params.append(casa.strip().lower())

        if partido and partido.strip():
            where_parts.append("UPPER(p.partido) LIKE UPPER(?)")
            params.append(f'%{partido.strip()}%')

        if ano:
            where_parts.append("EXISTS (SELECT 1 FROM emendas e2 WHERE e2.politico_id = p.id AND e2.ano = ?)")
            params.append(ano)

        where_clause = "WHERE " + " AND ".join(where_parts)

        _row  = conn.execute(f"SELECT COUNT(DISTINCT p.id) FROM politicos p {where_clause}", params).fetchone()
        total = _row[0] if _row and _row[0] is not None else 0
        total_paginas = max(1, math.ceil(total / limite))

        # Ordenação explícita via param ou heurística por filtro
        if ordenar == 'nome':    order = "p.nome ASC"
        elif ordenar == 'emendas': order = "total_emendas DESC"
        elif ordenar == 'valor': order = "valor_total DESC"
        else: order = "p.nome ASC" if (uf or casa) else "valor_total DESC"

        offset = (pagina - 1) * limite
        rows = conn.execute(f"""
            SELECT p.id, p.nome, p.partido, p.cargo, p.uf, p.casa, p.foto_url,
                   COUNT(e.id) as total_emendas,
                   COALESCE(SUM(e.valor), 0) as valor_total
            FROM politicos p
            LEFT JOIN emendas e ON p.id = e.politico_id
            {where_clause}
            GROUP BY p.id
            ORDER BY {order}
            LIMIT ? OFFSET ?
        """, params + [limite, offset]).fetchall()

        politicos = [
            {
                "id":           r["id"],
                "nome":         r["nome"],
                "partido":      r["partido"],
                "cargo":        r["cargo"],
                "uf":           r["uf"],
                "casa":         r["casa"],
                "foto_url":     r["foto_url"],
                "total_emendas": r["total_emendas"] or 0,
                "valor_total":  float(r["valor_total"]) if r["valor_total"] else 0,
            }
            for r in rows
        ]

        return {"politicos": politicos, "total": total, "pagina": pagina, "total_paginas": total_paginas}
    except Exception as e:
        logger.error("Erro em /politicos paginado: %s", e, exc_info=True)
        return {"politicos": [], "total": 0, "pagina": 1, "total_paginas": 1}
    finally:
        conn.close()

@app.get("/api/foto/{politico_id}")
def proxy_foto_politico(politico_id: int):
    """
    Proxy leve de foto: busca o URL do DB, faz fetch externo (com cache in-memory de 1h),
    retorna a imagem com headers de cache. Resolve CORS e hotlink sem baixar tudo de uma vez.
    """
    import time, urllib.request

    _cache = getattr(proxy_foto_politico, "_cache", {})
    proxy_foto_politico._cache = _cache

    now = time.time()
    if politico_id in _cache:
        ts, ct, data = _cache[politico_id]
        if now - ts < 3600:
            return Response(content=data, media_type=ct,
                            headers={"Cache-Control": "public, max-age=3600"})

    conn = get_db_connection()
    try:
        row = conn.execute("SELECT foto_url FROM politicos WHERE id = ?", (politico_id,)).fetchone()
    finally:
        conn.close()

    if not row or not row["foto_url"]:
        # Tenta buscar via API da Câmara pelo nome do parlamentar
        try:
            conn2 = get_db_connection()
            nome_row = conn2.execute("SELECT nome FROM politicos WHERE id = ?", (politico_id,)).fetchone()
            conn2.close()
            if nome_row and nome_row["nome"]:
                import urllib.request as _ur
                import urllib.parse
                import json as _json
                nome_enc = urllib.parse.quote(nome_row["nome"])
                api_url = f"https://dadosabertos.camara.leg.br/api/v2/deputados?nome={nome_enc}&itens=1&ordenarPor=nome"
                req2 = _ur.Request(api_url, headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"})
                with _ur.urlopen(req2, timeout=6) as resp2:
                    dados = _json.loads(resp2.read()).get("dados", [])
                    if dados:
                        dep = dados[0]
                        dep_uri = dep.get("uri", "")
                        dep_id = dep_uri.rstrip("/").split("/")[-1] if dep_uri else str(dep.get("id", ""))
                        if dep_id:
                            foto_nova = f"https://www.camara.leg.br/internet/deputado/bandep/{dep_id}.jpg"
                            # Salva no banco para próximas chamadas
                            conn3 = get_db_connection()
                            conn3.execute("UPDATE politicos SET foto_url = ? WHERE id = ?", (foto_nova, politico_id))
                            conn3.commit()
                            conn3.close()
                            row = {"foto_url": foto_nova}
        except Exception:
            pass
    if not row or not row["foto_url"]:
        raise HTTPException(status_code=404, detail="Sem foto")

    url = row["foto_url"]
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            ct   = resp.headers.get("Content-Type", "image/jpeg")
            data = resp.read()
    except Exception:
        raise HTTPException(status_code=502, detail="Foto indisponível")

    _cache[politico_id] = (now, ct, data)
    return Response(content=data, media_type=ct,
                    headers={"Cache-Control": "public, max-age=3600"})


@app.get("/api/busca/global")
@limiter.limit("60/minute")
def busca_global(request: Request, q: str = Query(..., min_length=2)):
    """
    Busca consolidada em 4 fontes: municípios, parlamentares, emendas, leis (futuro).
    Substitui as 3 chamadas paralelas do SearchBar por uma única requisição.
    """
    q_like = f"%{q.strip()}%"
    conn   = get_db_connection()
    result: dict = {"municipios": [], "parlamentares": [], "emendas": [], "leis": []}

    # 1. Municípios — try com tabela `municipios`, fallback em emendas
    try:
        try:
            mun_rows = conn.execute(
                "SELECT id, nome FROM municipios WHERE UPPER(nome) LIKE UPPER(?) ORDER BY nome LIMIT 5",
                (q_like,)
            ).fetchall()
        except Exception:
            mun_rows = conn.execute(
                "SELECT ROW_NUMBER() OVER() AS id, municipio_destino AS nome FROM emendas "
                "WHERE UPPER(municipio_destino) LIKE UPPER(?) GROUP BY municipio_destino ORDER BY municipio_destino LIMIT 5",
                (q_like,)
            ).fetchall()
        result["municipios"] = [{"id": r["id"], "nome": r["nome"]} for r in mun_rows]
    except Exception as e:
        logger.warning("busca/global municipios falhou: %s", e)

    # 2. Parlamentares
    try:
        NOT_COL = ("NOT (nome LIKE '%BANCADA%' OR nome LIKE 'RELATOR%' "
                   "OR nome = 'Sem informação' OR nome LIKE '%LÍDER%')")
        pol_rows = conn.execute(
            f"SELECT id, nome, partido, cargo FROM politicos "
            f"WHERE UPPER(nome) LIKE UPPER(?) AND {NOT_COL} ORDER BY nome LIMIT 5",
            (q_like,)
        ).fetchall()
        result["parlamentares"] = [
            {"id": r["id"], "nome": r["nome"], "partido": r["partido"], "cargo": r["cargo"]}
            for r in pol_rows
        ]
    except Exception as e:
        logger.warning("busca/global parlamentares falhou: %s", e)

    # 3. Emendas — busca em descrição e objetivo
    try:
        eme_rows = conn.execute("""
            SELECT e.id, e.ano, e.valor, e.descricao, e.objetivo, e.municipio_destino,
                   p.nome AS politico_nome
            FROM emendas e
            LEFT JOIN politicos p ON p.id = e.politico_id
            WHERE UPPER(e.descricao) LIKE UPPER(?) OR UPPER(e.objetivo) LIKE UPPER(?)
            ORDER BY e.valor DESC LIMIT 4
        """, (q_like, q_like)).fetchall()
        result["emendas"] = [{
            "id":                r["id"],
            "ano":               r["ano"],
            "valor":             float(r["valor"]) if r["valor"] else 0,
            "descricao":         r["descricao"],
            "objetivo":          r["objetivo"],
            "municipio_destino": r["municipio_destino"],
            "politico_nome":     r["politico_nome"],
        } for r in eme_rows]
    except Exception as e:
        logger.warning("busca/global emendas falhou: %s", e)

    conn.close()
    return result


@app.get("/api/politicos/busca")
@limiter.limit("30/minute")
def buscar_politicos(request: Request, q: str = Query(..., description="Termo de busca pelo nome")):
    """
    Busca políticos individuais pelo nome (case-insensitive, exclui autores coletivos).
    Retorna até 8 resultados contendo id, nome, partido e cargo.
    """
    conn = get_db_connection()
    try:
        query = f"""
            SELECT p.id, p.nome, p.partido, p.cargo
            FROM politicos p
            WHERE UPPER(p.nome) LIKE UPPER(?)
              AND {NOT_AUTOR_COLETIVO_SQL}
            ORDER BY p.nome
            LIMIT 8
        """
        politicos = conn.execute(query, (f'%{q}%',)).fetchall()
        return [dict(p) for p in politicos]
    except sqlite3.OperationalError as e:
        logger.error("Erro em /politicos/busca q=%s: %s", q, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno")
    finally:
        conn.close()

@app.get("/api/municipios/{nome}/detalhes")
@limiter.limit("30/minute")
def obter_detalhes_municipio(request: Request, nome: str):
    conn = get_db_connection()
    try:
        # A query vai receber o nome COMPLETO do frontend (ex: "NITERÓI"),
        # e vai buscar no banco usando LIKE para bater com "NITERÓI - RJ" ou similares.
        termo_busca = nome.strip().upper()
        # Se o nome não tiver o sufixo - RJ, adicionamos um curinga no final
        if " - RJ" not in termo_busca:
            termo_like = f"{termo_busca}%"
        else:
            termo_like = termo_busca

        # 1. Total Geral do Municipio
        totais = conn.execute("""
            SELECT COUNT(id) as total_emendas, SUM(valor) as valor_total
            FROM emendas
            WHERE municipio_destino LIKE ?
        """, (termo_like,)).fetchone()

        total_emendas = totais["total_emendas"] if totais and totais["total_emendas"] else 0
        valor_total = totais["valor_total"] if totais and totais["valor_total"] else 0

        # 404 quando município não existe (sem nenhuma emenda associada).
        # Distingue "município sem dados" de "termo inválido".
        if total_emendas == 0:
            raise HTTPException(status_code=404, detail=f"Município '{nome}' não encontrado.")

        # 2. Ranking de Políticos para este Municipio
        politicos_rows = conn.execute("""
            SELECT 
                p.id as id,
                p.nome as nome,  
                p.partido as partido, 
                COUNT(e.id) as total_emendas, 
                SUM(e.valor) as valor_total
            FROM emendas e
            JOIN politicos p ON e.politico_id = p.id
            WHERE e.municipio_destino LIKE ?
            GROUP BY p.id
            ORDER BY valor_total DESC
            LIMIT 20
        """, (termo_like,)).fetchall()
        
        politicos = []
        for row in politicos_rows:
            politicos.append({
                "id": row["id"],
                "nome": row["nome"],
                "partido": row["partido"],
                "total_emendas": row["total_emendas"],
                "valor_total": float(row["valor_total"]) if row["valor_total"] else 0
            })

        # 3. Lista de Emendas
        emendas_rows = conn.execute("""
            SELECT ano, valor, 
                   descricao, objetivo, fonte_url
            FROM emendas
            WHERE municipio_destino LIKE ?
            ORDER BY ano DESC, valor DESC
        """, (termo_like,)).fetchall()
        
        emendas = []
        for row in emendas_rows:
            emendas.append({
                "ano": row["ano"],
                "valor": float(row["valor"]) if row["valor"] else 0,
                "descricao": row["descricao"] or "SEM ESPECIFICAÇÃO",
                "objetivo": row["objetivo"] or "NÃO INFORMADO",
                "status": "CADASTRADA",
                "fonte_url": row["fonte_url"]
            })

        return {
            "municipio": nome.upper(),
            "total_emendas": total_emendas,
            "valor_total": float(valor_total),
            "politicos": politicos,
            "emendas": emendas
        }

    except Exception as e:
        logger.error("Erro em /municipios/%s/detalhes: %s", nome, e, exc_info=True)
        return {
            "municipio": nome,
            "total_emendas": 0,
            "valor_total": 0,
            "politicos": [],
            "emendas": []
        }
    finally:
        conn.close()

@app.get("/api/municipios/{nome}/contratos")
@limiter.limit("30/minute")
def obter_contratos_municipio(request: Request, nome: str):
    conn = get_db_connection()
    try:
        termo_busca = f"%{nome.strip().upper()}%"
        
        contratos_rows = conn.execute("""
            SELECT numero, objeto, valor, fornecedor_nome, data_inicio, fonte_url
            FROM contratos
            WHERE UPPER(municipio) LIKE ?
            ORDER BY valor DESC
        """, (termo_busca,)).fetchall()
        
        contratos = []
        for r in contratos_rows:
            contratos.append({
                "numero": r["numero"],
                "objeto": r["objeto"] or "Sem Objeto",
                "valor": float(r["valor"]) if r["valor"] else 0,
                "fornecedor_nome": r["fornecedor_nome"] or "Não Informado",
                "data_inicio": r["data_inicio"],
                "fonte_url": r["fonte_url"]
            })
            
        return contratos
    except sqlite3.OperationalError as e:
        if "no such table" in str(e):
            return []
        logger.error("Erro em /municipios/%s/contratos: %s", nome, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno")
    except Exception as e:
        logger.error("Erro em /municipios/%s/contratos: %s", nome, e, exc_info=True)
        return []
    finally:
        conn.close()

def _tem_coluna_foto() -> bool:
    """Verifica uma vez se a coluna foto_url existe (cache em módulo)."""
    try:
        conn = get_db_connection()
        conn.execute("SELECT foto_url FROM politicos LIMIT 1").fetchone()
        conn.close()
        return True
    except sqlite3.OperationalError:
        return False

_FOTO_COL = _tem_coluna_foto()


@app.get("/api/politicos/{politico_id}/distribuicao")
@limiter.limit("60/minute")
def distribuicao_emendas_por_uf(request: Request, politico_id: int):
    """
    Retorna o volume de emendas de um parlamentar agregado por UF.
    Usado para colorir o mapa de atuação nacional.
    """
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT uf,
                   COUNT(*)           AS total_emendas,
                   COALESCE(SUM(valor), 0) AS valor_total
            FROM emendas
            WHERE politico_id = ?
              AND uf IS NOT NULL AND uf != ''
            GROUP BY uf
            ORDER BY valor_total DESC
        """, (politico_id,)).fetchall()
        return [
            {"uf": r["uf"], "total_emendas": r["total_emendas"], "valor_total": float(r["valor_total"])}
            for r in rows
            if r["uf"] in UFS_OFICIAIS
        ]
    except Exception as e:
        logger.error("Erro em /distribuicao politico %s: %s", politico_id, e)
        return []
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}/distribuicao_municipios")
@limiter.limit("60/minute")
def distribuicao_municipios(request: Request, politico_id: int, uf: str):
    """
    Municípios de um estado UF onde o parlamentar enviou emendas.
    Usado para drill-down do mapa de atuação (clique no estado → zoom em municípios).
    """
    uf_u = uf.upper().strip()
    if uf_u not in UFS_OFICIAIS:
        return []
    conn = get_db_connection()
    try:
        rows = conn.execute("""
            SELECT
                TRIM(REPLACE(municipio_destino, ' - ' || ?, '')) AS municipio,
                COUNT(*)                AS total_emendas,
                COALESCE(SUM(valor), 0) AS valor_total
            FROM emendas
            WHERE politico_id = ?
              AND UPPER(uf)   = ?
              AND municipio_destino IS NOT NULL
              AND municipio_destino != ''
            GROUP BY municipio_destino
            ORDER BY valor_total DESC
        """, (uf_u, politico_id, uf_u)).fetchall()
        return [
            {"municipio": r["municipio"], "total_emendas": r["total_emendas"],
             "valor_total": float(r["valor_total"])}
            for r in rows
        ]
    except Exception as e:
        logger.error("Erro em /distribuicao_municipios politico %s uf %s: %s", politico_id, uf_u, e)
        return []
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}/perfil_tipo")
@limiter.limit("30/minute")
def perfil_tipo(request: Request, politico_id: int):
    """
    Detecta o cargo principal e dispara métricas específicas para o tipo:
      - deputado_federal: emendas, comissões, votações Câmara
      - senador: emendas, presença Senado
      - deputado_estadual: projetos ALE, votos
      - governador / vice: vetos, decretos, orçamento (placeholders)
      - prefeito / vice: orçamento municipal, vetos (placeholders)
      - vereador: projetos câmara, presença (placeholders)

    Retorna:
      tipo_principal: string
      hierarquia_nivel: 'federal' | 'estadual' | 'municipal'
      poder: 'legislativo' | 'executivo'
      metricas: { ... } específicas do tipo
      roadmap: [coletas planejadas que ainda não rodaram]
    """
    conn = get_db_connection()
    try:
        # Hierarquia de prioridade dos cargos (mais alto primeiro)
        HIERARQUIA = [
            ("presidente", "federal", "executivo"),
            ("vice_presidente", "federal", "executivo"),
            ("governador", "estadual", "executivo"),
            ("vice_governador", "estadual", "executivo"),
            ("senador", "federal", "legislativo"),
            ("deputado_federal", "federal", "legislativo"),
            ("prefeito", "municipal", "executivo"),
            ("vice_prefeito", "municipal", "executivo"),
            ("deputado_estadual", "estadual", "legislativo"),
            ("vereador", "municipal", "legislativo"),
        ]

        cols = {r[1] for r in conn.execute("PRAGMA table_info(politicos)").fetchall()}
        sel = "nome, nome_urna" if "nome_urna" in cols else "nome, nome as nome_urna"
        sel += ", partido, cargo"
        row = conn.execute(f"SELECT {sel} FROM politicos WHERE id = ?", (politico_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Não encontrado")

        nomes = list({(row["nome"] or "").upper(), (row["nome_urna"] or "").upper()})
        nomes = [n for n in nomes if n]
        if not nomes:
            return {"tipo_principal": None, "metricas": {}}

        # Busca todos os cargos do parlamentar (eleitos + emendas indicam dep federal)
        cargos_encontrados = []
        placeholders = ",".join("?" * len(nomes))

        for tabela in ("eleitos_estaduais", "eleitos_municipais"):
            try:
                rs = conn.execute(f"""
                    SELECT cargo, ano_eleicao, uf, mandato, sigla_situacao FROM {tabela}
                    WHERE UPPER(nome) IN ({placeholders}) OR UPPER(nome_urna) IN ({placeholders})
                    ORDER BY ano_eleicao DESC
                """, nomes + nomes).fetchall()
                for r in rs:
                    cargos_encontrados.append({
                        "cargo": (r["cargo"] or "").lower().replace(" ", "_"),
                        "ano": r["ano_eleicao"], "uf": r["uf"],
                        "mandato": r["mandato"], "situacao": r["sigla_situacao"],
                    })
            except Exception as _e:
                logger.warning("perfil_tipo: erro ao buscar cargos TSE para %s: %s", politico_id, _e)

        # Se tem emendas, é deputado federal/senador (fallback se TSE não tem)
        r_emendas = conn.execute("SELECT COUNT(*) FROM emendas WHERE politico_id = ?", (politico_id,)).fetchone()
        n_emendas = r_emendas[0] if r_emendas else 0
        if n_emendas > 0 and not any(c["cargo"] in ("deputado_federal", "senador") for c in cargos_encontrados):
            cargos_encontrados.append({"cargo": "deputado_federal", "ano": None, "uf": None,
                                       "mandato": None, "situacao": "Detectado via emendas"})

        # Cargo principal: pega o mais alto da hierarquia (preferência por mais recente)
        tipo_principal = None
        nivel = None
        poder = None
        for cargo_h, niv, pod in HIERARQUIA:
            matches = [c for c in cargos_encontrados if c["cargo"] == cargo_h]
            if matches:
                tipo_principal = cargo_h
                nivel = niv
                poder = pod
                break

        # Constrói métricas baseadas no tipo
        metricas: dict = {}
        roadmap: list = []

        if tipo_principal in ("deputado_federal", "senador"):
            # Tem emendas — métricas de eficiência legislativa
            r = conn.execute("""
                SELECT COUNT(*) as n,
                       SUM(valor) as total,
                       SUM(COALESCE(valor_pago, 0)) as pago,
                       SUM(COALESCE(valor_empenhado, valor, 0)) as empenhado
                FROM emendas WHERE politico_id = ?
            """, (politico_id,)).fetchone()
            empenhado = float(r["empenhado"] or 0)
            pago = float(r["pago"] or 0)
            metricas["emendas"] = {
                "total_emendas": r["n"] or 0,
                "valor_total": float(r["total"] or 0),
                "valor_pago": pago,
                "valor_empenhado": empenhado,
                "pct_executado": round((pago / empenhado * 100) if empenhado > 0 else 0, 1),
            }
            roadmap.extend([
                {"item": "Presença em sessões plenárias", "fonte": "Câmara API /deputados/{id}/discursos", "status": "pendente"},
                {"item": "Projetos de lei apresentados", "fonte": "Câmara API /proposicoes", "status": "pendente"},
                {"item": "Votações nominais", "fonte": "Câmara API /votacoes/votos", "status": "parcial — só perfil ativo"},
            ])
        elif tipo_principal in ("deputado_estadual",):
            metricas["legislativo_estadual"] = {
                "obs": "Sem agregação automática — cada ALE tem seu portal próprio",
            }
            roadmap.extend([
                {"item": "Projetos apresentados na ALE", "fonte": "Portal da Assembleia (por UF)", "status": "pendente"},
                {"item": "Presença em sessões", "fonte": "Portal da ALE", "status": "pendente"},
                {"item": "Votações estaduais", "fonte": "Portal da ALE", "status": "pendente"},
            ])
        elif tipo_principal in ("governador", "vice_governador"):
            metricas["executivo_estadual"] = {
                "obs": "Vetos e decretos exigem coleta do Diário Oficial estadual",
            }
            roadmap.extend([
                {"item": "Vetos a leis estaduais", "fonte": "DO Estadual", "status": "pendente"},
                {"item": "Decretos publicados", "fonte": "DO Estadual", "status": "pendente"},
                {"item": "Execução orçamentária do estado", "fonte": "Portal Transparência estadual", "status": "pendente"},
            ])
        elif tipo_principal in ("prefeito", "vice_prefeito"):
            metricas["executivo_municipal"] = {
                "obs": "Vetos municipais e decretos exigem coleta do Diário Oficial do município",
            }
            roadmap.extend([
                {"item": "Vetos a leis municipais", "fonte": "DO municipal", "status": "pendente"},
                {"item": "Decretos publicados", "fonte": "DO municipal", "status": "pendente"},
                {"item": "Execução orçamentária da prefeitura", "fonte": "Portal Transparência municipal", "status": "pendente"},
            ])
        elif tipo_principal == "vereador":
            metricas["legislativo_municipal"] = {
                "obs": "Câmaras municipais não têm padrão nacional — cada uma tem seu portal",
            }
            roadmap.extend([
                {"item": "Projetos apresentados na Câmara Municipal", "fonte": "Portal da CM (por município)", "status": "pendente"},
                {"item": "Presença em sessões", "fonte": "Portal da CM", "status": "pendente"},
            ])
        elif tipo_principal == "presidente":
            roadmap.extend([
                {"item": "Vetos a leis federais", "fonte": "Planalto", "status": "pendente"},
                {"item": "Medidas Provisórias editadas", "fonte": "Planalto", "status": "pendente"},
            ])

        # Votos eleitorais (sempre que disponíveis)
        try:
            rv = conn.execute(f"""
                SELECT SUM(votos) as total, COUNT(DISTINCT municipio) as muns
                FROM votos_candidato v
                JOIN (
                    SELECT sq_candidato FROM eleitos_estaduais
                    WHERE UPPER(nome) IN ({placeholders}) OR UPPER(nome_urna) IN ({placeholders})
                    UNION
                    SELECT sq_candidato FROM eleitos_municipais
                    WHERE UPPER(nome) IN ({placeholders}) OR UPPER(nome_urna) IN ({placeholders})
                ) e ON e.sq_candidato = v.sq_candidato
            """, nomes + nomes + nomes + nomes).fetchone()
            if rv and rv["total"]:
                metricas["votos_eleitorais"] = {"total": rv["total"] or 0, "municipios": rv["muns"] or 0}
        except Exception as _e:
            logger.warning("perfil_tipo: erro ao buscar votos eleitorais para %s: %s", politico_id, _e)

        return {
            "tipo_principal": tipo_principal,
            "hierarquia_nivel": nivel,
            "poder": poder,
            "cargos_encontrados": cargos_encontrados,
            "metricas": metricas,
            "roadmap": roadmap,
        }
    except HTTPException: raise
    except Exception as e:
        logger.error("Erro em /perfil_tipo: %s", e, exc_info=True)
        return {"tipo_principal": None, "metricas": {}, "roadmap": []}
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}/trajetoria")
@limiter.limit("30/minute")
def trajetoria_politico(request: Request, politico_id: int):
    """
    Linha do tempo eleitoral: agrega cada candidatura/mandato do parlamentar
    cruzando eleitos_estaduais, eleitos_municipais e mandatos_json (Câmara).
    Retorna ordenado por ano descendente.
    """
    conn = get_db_connection()
    try:
        # Pega nome + nome_urna para match
        cols_p = {r[1] for r in conn.execute("PRAGMA table_info(politicos)").fetchall()}
        cols_select = "nome, nome_urna" if "nome_urna" in cols_p else "nome, nome as nome_urna"
        cols_select += ", mandatos_json" if "mandatos_json" in cols_p else ""
        row = conn.execute(f"SELECT {cols_select} FROM politicos WHERE id = ?", (politico_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Não encontrado")

        nome = row["nome"] or ""
        nome_urna = row["nome_urna"] or nome
        nomes_busca = list({nome.upper(), nome_urna.upper()})

        eventos = []

        # 1. eleitos_estaduais (deputados federais, estaduais, senadores, governadores 2022)
        for tabela, nivel in [("eleitos_estaduais", "estadual"), ("eleitos_municipais", "municipal")]:
            try:
                placeholders = ",".join("?" * len(nomes_busca))
                rs = conn.execute(f"""
                    SELECT uf, cargo, ano_eleicao, mandato, partido, sigla_situacao, sq_candidato
                           {", municipio" if tabela == "eleitos_municipais" else ""}
                    FROM {tabela}
                    WHERE UPPER(nome) IN ({placeholders}) OR UPPER(nome_urna) IN ({placeholders})
                    ORDER BY ano_eleicao DESC
                """, nomes_busca + nomes_busca).fetchall()
                for r in rs:
                    eventos.append({
                        "tipo": "eleicao",
                        "nivel": nivel,
                        "uf": r["uf"],
                        "municipio": r["municipio"] if tabela == "eleitos_municipais" else None,
                        "cargo": r["cargo"],
                        "ano": r["ano_eleicao"],
                        "mandato": r["mandato"],
                        "partido": r["partido"],
                        "situacao": r["sigla_situacao"],
                        "sq_candidato": r["sq_candidato"],
                    })
            except Exception:
                pass

        # 2. mandatos_json (Câmara federal histórico)
        try:
            mj = row["mandatos_json"] if "mandatos_json" in row.keys() else None
        except Exception:
            mj = None
        if mj:
            try:
                for m in json.loads(mj):
                    eventos.append({
                        "tipo": "mandato",
                        "nivel": "federal",
                        "cargo": "deputado_federal",
                        "ano": m.get("anoInicio"),
                        "ano_fim": m.get("anoFim"),
                        "mandato": f'{m.get("anoInicio")}-{m.get("anoFim")}' if m.get("anoInicio") else None,
                        "legislatura": m.get("idLegislatura"),
                        "partidos": m.get("partidos", []),
                        "partido": (m.get("partidos") or [None])[-1],
                    })
            except Exception:
                pass

        # 3. Total de votos (se temos votos_candidato)
        sqs = [e.get("sq_candidato") for e in eventos if e.get("sq_candidato")]
        votos_por_sq = {}
        try:
            if sqs:
                placeholders = ",".join("?" * len(sqs))
                rs = conn.execute(f"""
                    SELECT sq_candidato, SUM(votos) as total, COUNT(DISTINCT municipio) as muns
                    FROM votos_candidato WHERE sq_candidato IN ({placeholders})
                    GROUP BY sq_candidato
                """, sqs).fetchall()
                for r in rs:
                    votos_por_sq[r["sq_candidato"]] = {"total": r["total"], "municipios": r["muns"]}
        except Exception:
            pass

        for e in eventos:
            sq = e.get("sq_candidato")
            if sq and sq in votos_por_sq:
                e["votos_total"] = votos_por_sq[sq]["total"]
                e["votos_municipios"] = votos_por_sq[sq]["municipios"]

        eventos.sort(key=lambda x: (x.get("ano") or 0), reverse=True)
        return {"trajetoria": eventos, "tem_votos": bool(votos_por_sq)}
    except HTTPException: raise
    except Exception as e:
        logger.error("Erro em /trajetoria: %s", e, exc_info=True)
        return {"trajetoria": [], "tem_votos": False}
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}/votos")
@limiter.limit("30/minute")
def votos_politico(request: Request, politico_id: int, ano: Optional[int] = Query(None)):
    """Votos por município de um parlamentar (todas eleições onde aparece)."""
    conn = get_db_connection()
    try:
        cols_p = {r[1] for r in conn.execute("PRAGMA table_info(politicos)").fetchall()}
        cols_select = "nome, nome_urna" if "nome_urna" in cols_p else "nome, nome as nome_urna"
        row = conn.execute(f"SELECT {cols_select} FROM politicos WHERE id = ?", (politico_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Não encontrado")

        nomes = list({(row["nome"] or "").upper(), (row["nome_urna"] or "").upper()})
        nomes = [n for n in nomes if n]
        if not nomes:
            return {"votos": [], "total": 0}

        placeholders = ",".join("?" * len(nomes))
        params: list = list(nomes) + list(nomes)
        sql_ano = ""
        if ano:
            sql_ano = " AND v.ano = ?"
            params.append(ano)

        rs = conn.execute(f"""
            SELECT v.ano, v.uf, v.municipio,
                   SUM(v.votos) as votos,
                   e.cargo, e.partido
            FROM votos_candidato v
            JOIN (
                SELECT sq_candidato, cargo, partido FROM eleitos_estaduais
                WHERE UPPER(nome) IN ({placeholders}) OR UPPER(nome_urna) IN ({placeholders})
                UNION
                SELECT sq_candidato, cargo, partido FROM eleitos_municipais
                WHERE UPPER(nome) IN ({placeholders}) OR UPPER(nome_urna) IN ({placeholders})
            ) e ON e.sq_candidato = v.sq_candidato
            WHERE 1=1 {sql_ano}
            GROUP BY v.ano, v.uf, v.municipio, e.cargo, e.partido
            ORDER BY votos DESC
            LIMIT 200
        """, params + nomes + nomes).fetchall()

        votos = [dict(r) for r in rs]
        total = sum(v["votos"] for v in votos)
        return {"votos": votos, "total": total}
    except HTTPException: raise
    except Exception as e:
        logger.error("Erro em /votos: %s", e, exc_info=True)
        return {"votos": [], "total": 0}
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}/votacoes_nominais")
@limiter.limit("30/minute")
def votacoes_nominais_politico(
    request: Request, politico_id: int,
    pagina: int = Query(1, ge=1),
    limite: int = Query(30, ge=1, le=100),
    voto: Optional[str] = Query(None),
):
    """Votações nominais de um deputado federal com seu respectivo voto."""
    conn = get_db_connection()
    try:
        tabelas = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()}
        if "votacoes_votos" not in tabelas:
            return {"votacoes": [], "total": 0, "resumo": {}, "disponivel": False}

        where = ["vv.politico_id = ?"]
        params: list = [politico_id]
        if voto and voto.strip():
            where.append("LOWER(vv.voto) = LOWER(?)"); params.append(voto.strip())
        where_sql = " AND ".join(where)

        _row = conn.execute(
            f"SELECT COUNT(*) FROM votacoes_votos vv WHERE {where_sql}", params
        ).fetchone()
        total = _row[0] if _row else 0

        offset = (pagina - 1) * limite
        rows = conn.execute(f"""
            SELECT vv.id_votacao, vv.voto, vv.data_hora,
                   v.data, v.descricao, v.aprovacao, v.sigla_orgao
            FROM votacoes_votos vv
            LEFT JOIN votacoes v ON vv.id_votacao = v.id_votacao
            WHERE {where_sql}
            ORDER BY vv.data_hora DESC
            LIMIT ? OFFSET ?
        """, params + [limite, offset]).fetchall()

        # Resumo de votos
        resumo_rows = conn.execute("""
            SELECT voto, COUNT(*) as total
            FROM votacoes_votos WHERE politico_id = ?
            GROUP BY voto ORDER BY total DESC
        """, (politico_id,)).fetchall()
        resumo = {r["voto"]: r["total"] for r in resumo_rows}

        return {
            "votacoes": [dict(r) for r in rows],
            "total": total,
            "total_paginas": max(1, -(-total // limite)),
            "pagina": pagina,
            "resumo": resumo,
            "disponivel": True,
        }
    except Exception as e:
        logger.error("Erro em /votacoes_nominais: %s", e, exc_info=True)
        return {"votacoes": [], "total": 0, "resumo": {}, "disponivel": False}
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}/scorecard_legislativo")
@limiter.limit("30/minute")
def scorecard_legislativo(request: Request, politico_id: int):
    """
    Scorecard de atuação legislativa derivado das votações nominais (sem coleta nova).
    Prioridade #2 da régua do HORUS — perfil não fala só de emenda.

    Métricas (todas descritivas, não juízo de valor):
      - participação: % de comparecimento na janela ativa do parlamentar + ausências
      - perfil de voto: Sim/Não/Abstenção/Obstrução
      - alinhamento com a maioria: % das vezes que votou com o lado vencedor do plenário
      - votações mais disputadas em que votou: como se posicionou nos placares apertados

    Depende de votacoes_agg (scripts/migrate_votacoes_agg.py). Degrada gracioso.
    """
    conn = get_db_connection()
    try:
        tabs = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()}
        if "votacoes_votos" not in tabs or "votacoes_agg" not in tabs:
            return {"disponivel": False}

        # Janela ativa + total participadas
        _jan = conn.execute("""
            SELECT MIN(a.data) AS ini, MAX(a.data) AS fim, COUNT(*) AS participadas
            FROM votacoes_votos vv
            JOIN votacoes_agg a ON vv.id_votacao = a.id_votacao
            WHERE vv.politico_id = ?
        """, (politico_id,)).fetchone()

        participadas = _jan["participadas"] if _jan else 0
        if not participadas:
            return {"disponivel": False}

        ini, fim = _jan["ini"], _jan["fim"]

        # Votações nominais ocorridas na janela ativa (denominador da presença)
        _per = conn.execute(
            "SELECT COUNT(*) FROM votacoes_agg WHERE data IS NOT NULL AND data BETWEEN ? AND ?",
            (ini, fim)
        ).fetchone()
        no_periodo = _per[0] if _per and _per[0] else participadas
        ausencias = max(0, no_periodo - participadas)
        presenca_pct = round(100 * participadas / no_periodo, 1) if no_periodo else None

        # Perfil de voto
        _resumo = {r["voto"]: r["c"] for r in conn.execute(
            "SELECT voto, COUNT(*) c FROM votacoes_votos WHERE politico_id = ? GROUP BY voto",
            (politico_id,)
        ).fetchall()}

        # Alinhamento com a maioria (só votos de mérito Sim/Não, votação com maioria definida)
        _alin = conn.execute("""
            SELECT
                SUM(CASE WHEN vv.voto = a.pos_maioria THEN 1 ELSE 0 END) AS com,
                COUNT(*) AS base
            FROM votacoes_votos vv
            JOIN votacoes_agg a ON vv.id_votacao = a.id_votacao
            WHERE vv.politico_id = ?
              AND vv.voto IN ('Sim','Não')
              AND a.pos_maioria IN ('Sim','Não')
        """, (politico_id,)).fetchone()
        alin_base = _alin["base"] if _alin else 0
        alinhamento_pct = round(100 * _alin["com"] / alin_base, 1) if alin_base else None

        # Votações mais disputadas em que votou (placares apertados)
        disputadas = conn.execute("""
            SELECT a.id_votacao, a.margem, a.total_sim, a.total_nao,
                   a.pos_maioria, a.aprovacao, vv.voto AS meu_voto,
                   v.descricao, v.data
            FROM votacoes_votos vv
            JOIN votacoes_agg a ON vv.id_votacao = a.id_votacao
            LEFT JOIN votacoes v ON vv.id_votacao = v.id_votacao
            WHERE vv.politico_id = ?
              AND a.margem IS NOT NULL
              AND vv.voto IN ('Sim','Não')
            ORDER BY a.margem ASC, a.data DESC
            LIMIT 8
        """, (politico_id,)).fetchall()

        return {
            "disponivel": True,
            "periodo": {"inicio": ini, "fim": fim},
            "participacao": {
                "presentes": participadas,
                "no_periodo": no_periodo,
                "ausencias": ausencias,
                "presenca_pct": presenca_pct,
            },
            "perfil_voto": {
                "sim": _resumo.get("Sim", 0),
                "nao": _resumo.get("Não", 0),
                "abstencao": _resumo.get("Abstenção", 0),
                "obstrucao": _resumo.get("Obstrução", 0),
                # "Artigo 17" = voto de liderança (orienta a bancada). Para líderes é a
                # maior parte da atividade — não pode ser omitido do perfil.
                "lideranca": _resumo.get("Artigo 17", 0),
            },
            "alinhamento_maioria_pct": alinhamento_pct,
            "votacoes_disputadas": [
                {
                    "id_votacao": r["id_votacao"],
                    "descricao": r["descricao"],
                    "data": r["data"],
                    "total_sim": r["total_sim"],
                    "total_nao": r["total_nao"],
                    "margem": round(r["margem"], 3) if r["margem"] is not None else None,
                    "pos_maioria": r["pos_maioria"],
                    "aprovacao": r["aprovacao"],
                    "meu_voto": r["meu_voto"],
                    "votou_com_maioria": r["meu_voto"] == r["pos_maioria"],
                }
                for r in disputadas
            ],
        }
    except Exception as e:
        logger.error("Erro em /scorecard_legislativo politico %s: %s", politico_id, e, exc_info=True)
        return {"disponivel": False}
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}/emendas")
@limiter.limit("60/minute")
def emendas_politico_paginadas(
    request: Request, politico_id: int,
    pagina: int = Query(1, ge=1),
    limite: int = Query(20, ge=1, le=100),
    uf: Optional[str] = Query(None),
    municipio: Optional[str] = Query(None),
):
    """Emendas de um parlamentar com paginação e filtros opcionais por UF/município."""
    where = ["politico_id = ?"]
    params: list = [politico_id]
    if uf and uf.strip():
        where.append("UPPER(uf) = ?"); params.append(uf.upper().strip())
    if municipio and municipio.strip():
        where.append("UPPER(municipio_destino) LIKE UPPER(?)"); params.append(f"%{municipio.strip()}%")
    where_sql = " AND ".join(where)

    conn = get_db_connection()
    try:
        _r = conn.execute(f"SELECT COUNT(*) FROM emendas WHERE {where_sql}", params).fetchone()
        total = _r[0] if _r and _r[0] is not None else 0
        total_paginas = max(1, math.ceil(total / limite))
        offset = (pagina - 1) * limite

        rows = conn.execute(f"""
            SELECT id, ano, valor, descricao, objetivo, codigo_emenda,
                   municipio_destino, uf, fonte_url,
                   COALESCE(valor_empenhado, valor, 0) AS valor_empenhado,
                   COALESCE(valor_pago, 0)             AS valor_pago
            FROM emendas
            WHERE {where_sql}
            ORDER BY ano DESC, valor DESC
            LIMIT ? OFFSET ?
        """, params + [limite, offset]).fetchall()

        return {
            "resultados": [{**dict(r), "status": "CADASTRADA"} for r in rows],
            "total": total,
            "pagina": pagina,
            "total_paginas": total_paginas,
        }
    except Exception as e:
        logger.error("Erro em /politicos/%s/emendas: %s", politico_id, e)
        return {"resultados": [], "total": 0, "pagina": 1, "total_paginas": 1}
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}")
@limiter.limit("30/minute")
def obter_detalhes_politico(request: Request, politico_id: int):
    conn = get_db_connection()
    try:
        tem_foto_col = _FOTO_COL

        # Verifica colunas enriquecidas (presente após scripts/enriquecer_politicos.py)
        cur = conn.execute("PRAGMA table_info(politicos)")
        cols = {r[1] for r in cur.fetchall()}
        enr_select = ""
        if "nome_urna" in cols:
            enr_select = """, p.nome_urna, p.data_nascimento, p.municipio_nascimento,
                            p.uf_nascimento, p.escolaridade, p.profissao,
                            p.bio_texto, p.mandatos_json"""

        if tem_foto_col:
            politico_info = conn.execute(f"""
                SELECT p.id, p.nome, p.partido, p.cargo, p.foto_url{enr_select},
                       COUNT(e.id) as total_emendas,
                       SUM(e.valor) as valor_total
                FROM politicos p
                LEFT JOIN emendas e ON p.id = e.politico_id
                WHERE p.id = ?
                GROUP BY p.id
            """, (politico_id,)).fetchone()
        else:
            politico_info = conn.execute(f"""
                SELECT p.id, p.nome, p.partido, p.cargo, NULL as foto_url{enr_select},
                       COUNT(e.id) as total_emendas,
                       SUM(e.valor) as valor_total
                FROM politicos p
                LEFT JOIN emendas e ON p.id = e.politico_id
                WHERE p.id = ?
                GROUP BY p.id
            """, (politico_id,)).fetchone()

        if not politico_info:
            raise HTTPException(status_code=404, detail="Político não encontrado")

        # 2. Municípios Beneficiados — top 10 + contagem agregada
        municipios_rows = conn.execute("""
            SELECT UPPER(municipio_destino) as nome,
                   COUNT(id) as total,
                   SUM(valor) as valor
            FROM emendas
            WHERE politico_id = ?
            GROUP BY UPPER(municipio_destino)
            ORDER BY valor DESC
            LIMIT 10
        """, (politico_id,)).fetchall()

        municipios_beneficiados = [
            {"nome": r["nome"], "total": r["total"], "valor": float(r["valor"]) if r["valor"] else 0}
            for r in municipios_rows
        ]

        # Total agregado de municípios distintos (CompararPage precisa do total real,
        # não dos 10 do ranking).
        _tmrow = conn.execute(
            "SELECT COUNT(DISTINCT UPPER(municipio_destino)) FROM emendas "
            "WHERE politico_id = ? AND municipio_destino IS NOT NULL AND municipio_destino != ''",
            (politico_id,)
        ).fetchone()
        total_municipios_distintos = _tmrow[0] if _tmrow and _tmrow[0] is not None else 0

        # Total de UFs distintas alcançadas — só conta UFs oficiais (filtra MULTIPLO, etc.)
        _terow = conn.execute(
            f"SELECT COUNT(DISTINCT uf) FROM emendas "
            f"WHERE politico_id = ? AND uf IN ({','.join('?'*len(UFS_OFICIAIS))})",
            (politico_id, *UFS_OFICIAIS)
        ).fetchone()
        total_estados_distintos = _terow[0] if _terow and _terow[0] is not None else 0

        # Resumo de atuação legislativa: votações nominais agregadas.
        # Aderente à régua de prioridade do CLAUDE.md — perfil não fala só de emenda.
        votacoes_resumo = None
        _tabs = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()}
        if "votacoes_votos" in _tabs:
            _vrows = conn.execute(
                "SELECT voto, COUNT(*) c FROM votacoes_votos WHERE politico_id = ? GROUP BY voto",
                (politico_id,)
            ).fetchall()
            _total_v = sum(r["c"] for r in _vrows)
            if _total_v > 0:
                _por_voto = {r["voto"]: r["c"] for r in _vrows}
                votacoes_resumo = {
                    "total": _total_v,
                    "sim": _por_voto.get("Sim", 0),
                    "nao": _por_voto.get("Não", 0),
                    "abstencao": _por_voto.get("Abstenção", 0),
                    "obstrucao": _por_voto.get("Obstrução", 0),
                    "outros": _total_v - sum(
                        _por_voto.get(k, 0) for k in ("Sim", "Não", "Abstenção", "Obstrução")
                    ),
                }

        # 3. Emendas por Ano
        ano_rows = conn.execute("""
            SELECT ano,
                   COUNT(id) as total,
                   SUM(valor) as valor_total
            FROM emendas
            WHERE politico_id = ?
            GROUP BY ano
            ORDER BY ano ASC
        """, (politico_id,)).fetchall()

        emendas_por_ano = [
            {"ano": r["ano"], "total": r["total"], "valor_total": float(r["valor_total"]) if r["valor_total"] else 0}
            for r in ano_rows
        ]

        # 4. Dados de Campanha (TSE)
        campanha_row = conn.execute("""
            SELECT id, cargo, total_receitas, total_despesas, situacao 
            FROM campanhas 
            WHERE politico_id = ? 
            ORDER BY ano DESC 
            LIMIT 1
        """, (politico_id,)).fetchone()

        dados_campanha = None
        if campanha_row:
            # Top 10 doadores — todos os tipos
            doadores_rows = conn.execute("""
                SELECT nome_doador, valor
                FROM doadores
                WHERE campanha_id = ?
                ORDER BY valor DESC
                LIMIT 10
            """, (campanha_row["id"],)).fetchall()

            dados_campanha = {
                "cargo": campanha_row["cargo"],
                "total_receitas": float(campanha_row["total_receitas"]),
                "total_despesas": float(campanha_row["total_despesas"]),
                "situacao": campanha_row["situacao"],
                "top_doadores": [
                    {"nome": r["nome_doador"], "valor": float(r["valor"])}
                    for r in doadores_rows
                ]
            }

        # 5. Emendas — primeiras 100 mais recentes (paginação adicional via /api/politicos/{id}/emendas)
        ultimas_emendas_rows = conn.execute("""
            SELECT ano, valor,
                   COALESCE(valor_empenhado, valor, 0) as valor_empenhado,
                   COALESCE(valor_pago, 0)             as valor_pago,
                   descricao, objetivo, municipio_destino, fonte_url
            FROM emendas
            WHERE politico_id = ?
            ORDER BY ano DESC, valor DESC
            LIMIT 100
        """, (politico_id,)).fetchall()

        ultimas_emendas = [
            {
                "ano": r["ano"],
                "valor": float(r["valor"]) if r["valor"] else 0,
                "valor_empenhado": float(r["valor_empenhado"]) if r["valor_empenhado"] else 0,
                "valor_pago": float(r["valor_pago"]) if r["valor_pago"] else 0,
                "descricao": r["descricao"] or "SEM ESPECIFICAÇÃO",
                "objetivo": r["objetivo"] or "NÃO INFORMADO",
                "municipio_destino": r["municipio_destino"],
                "status": "CADASTRADA",
                "fonte_url": r["fonte_url"]
            }
            for r in ultimas_emendas_rows
        ]

        def _get(col):
            try: return politico_info[col]
            except (IndexError, KeyError): return None

        mandatos_json = _get("mandatos_json")
        try: mandatos_list = json.loads(mandatos_json) if mandatos_json else []
        except Exception: mandatos_list = []

        return {
            "id": politico_info["id"],
            "nome": politico_info["nome"],
            "nome_urna": _get("nome_urna"),
            "partido": politico_info["partido"],
            "cargo": politico_info["cargo"],
            "foto_url": politico_info["foto_url"] if tem_foto_col else None,
            "data_nascimento": _get("data_nascimento"),
            "municipio_nascimento": _get("municipio_nascimento"),
            "uf_nascimento": _get("uf_nascimento"),
            "escolaridade": _get("escolaridade"),
            "profissao": _get("profissao"),
            "bio_texto": _get("bio_texto"),
            "mandatos": mandatos_list,
            "total_emendas": politico_info["total_emendas"] or 0,
            "valor_total": float(politico_info["valor_total"]) if politico_info["valor_total"] else 0,
            "total_municipios": total_municipios_distintos,
            "total_estados": total_estados_distintos,
            "votacoes_resumo": votacoes_resumo,
            "dados_campanha": dados_campanha,
            "municipios_beneficiados": municipios_beneficiados,
            "emendas_por_ano": emendas_por_ano,
            "ultimas_emendas": ultimas_emendas
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro em /politicos/%s: %s", politico_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno")
    finally:
        conn.close()

# Cache em memória do /estatisticas: ~2.3s de GROUP BYs sobre 109k emendas,
# e o dado só muda após coleta (job diário 3h). TTL 10min cobre com folga.
_ESTAT_CACHE: dict = {"ts": 0.0, "data": None}
_ESTAT_TTL = 600  # segundos


@app.get("/api/estatisticas")
@limiter.limit("20/minute")
def obter_estatisticas(request: Request):
    import time as _time
    if _ESTAT_CACHE["data"] is not None and (_time.time() - _ESTAT_CACHE["ts"]) < _ESTAT_TTL:
        return _ESTAT_CACHE["data"]
    conn = get_db_connection()
    try:
        # 1. Total Geral e Média
        totais = conn.execute("""
            SELECT SUM(valor) as valor_total_geral, 
                   AVG(valor) as media_por_emenda,
                   COUNT(id) as total_absoluto
            FROM emendas
        """).fetchone()

        valor_total_geral = float(totais["valor_total_geral"]) if totais["valor_total_geral"] else 0
        media_por_emenda = float(totais["media_por_emenda"]) if totais["media_por_emenda"] else 0

        # 2. TOP 10 Políticos (exclui autores coletivos)
        top_politicos_rows = conn.execute(f"""
            SELECT p.id, p.nome, p.partido, p.cargo,
                   COUNT(e.id) as total_emendas,
                   SUM(e.valor) as valor_total
            FROM politicos p
            JOIN emendas e ON p.id = e.politico_id
            WHERE {NOT_AUTOR_COLETIVO_SQL}
            GROUP BY p.id
            ORDER BY valor_total DESC
            LIMIT 10
        """).fetchall()

        top_politicos = [
            {
                "id": r["id"],
                "nome": r["nome"],
                "partido": r["partido"],
                "cargo": r["cargo"],
                "total_emendas": r["total_emendas"],
                "valor_total": float(r["valor_total"]) if r["valor_total"] else 0
            }
            for r in top_politicos_rows
        ]

        # 3. TOP 10 Municípios — só cidades reais. Pseudo-destinos (MÚLTIPLO,
        # Nacional, estados '(UF)', macrorregiões, Exterior) dominavam o topo
        # do ranking 'cidades destinatárias' (MÚLTIPLO sozinho = R$ 194B).
        top_municipios_rows = conn.execute("""
            SELECT municipio_destino as nome,
                   COUNT(id) as total_emendas,
                   SUM(valor) as valor_total
            FROM emendas
            WHERE municipio_destino != ''
              AND municipio_destino NOT LIKE '%(UF)%'
              AND UPPER(municipio_destino) NOT LIKE '%M_LTIPLO%'
              AND UPPER(municipio_destino) NOT LIKE '%NACIONAL%'
              AND UPPER(municipio_destino) NOT LIKE '%EXTERIOR%'
              AND UPPER(municipio_destino) NOT IN ('NORTE','NORDESTE','CENTRO-OESTE','SUDESTE','SUL')
            GROUP BY municipio_destino
            ORDER BY valor_total DESC
            LIMIT 10
        """).fetchall()

        top_municipios = [
            {
                "nome": r["nome"].replace(" - RJ", "").strip(),
                "total_emendas": r["total_emendas"],
                "valor_total": float(r["valor_total"]) if r["valor_total"] else 0
            }
            for r in top_municipios_rows
        ]

        # 4. Por Ano
        por_ano_rows = conn.execute("""
            SELECT ano,
                   COUNT(id) as total_emendas,
                   SUM(valor) as valor_total
            FROM emendas
            GROUP BY ano
            ORDER BY ano ASC
        """).fetchall()

        por_ano = [
            {
                "ano": r["ano"],
                "total_emendas": r["total_emendas"],
                "valor_total": float(r["valor_total"]) if r["valor_total"] else 0
            }
            for r in por_ano_rows
        ]

        # 5. Por Objetivo (Top 8)
        por_objetivo_rows = conn.execute("""
            SELECT objetivo,
                   COUNT(id) as total,
                   SUM(valor) as valor_total
            FROM emendas
            WHERE objetivo != '' AND objetivo IS NOT NULL
            GROUP BY objetivo
            ORDER BY valor_total DESC
            LIMIT 8
        """).fetchall()

        por_objetivo = [
            {
                "objetivo": r["objetivo"],
                "total": r["total"],
                "valor_total": float(r["valor_total"]) if r["valor_total"] else 0
            }
            for r in por_objetivo_rows
        ]

        # 6. Por Partido (Top 12)
        por_partido_rows = conn.execute(f"""
            SELECT p.partido,
                   COUNT(e.id) as total_emendas,
                   SUM(e.valor) as valor_total,
                   COUNT(DISTINCT p.id) as total_politicos
            FROM politicos p
            JOIN emendas e ON p.id = e.politico_id
            WHERE {NOT_AUTOR_COLETIVO_SQL} AND p.partido IS NOT NULL AND p.partido != ''
            GROUP BY p.partido
            ORDER BY valor_total DESC
            LIMIT 12
        """).fetchall()

        por_partido = [
            {
                "partido": r["partido"],
                "total_emendas": r["total_emendas"],
                "valor_total": float(r["valor_total"]) if r["valor_total"] else 0,
                "total_politicos": r["total_politicos"],
            }
            for r in por_partido_rows
        ]

        resultado = {
            "valor_total_geral": valor_total_geral,
            "media_por_emenda": media_por_emenda,
            "top_politicos": top_politicos,
            "top_municipios": top_municipios,
            "por_ano": por_ano,
            "por_objetivo": por_objetivo,
            "por_partido": por_partido,
        }
        _ESTAT_CACHE["data"] = resultado
        _ESTAT_CACHE["ts"] = _time.time()
        return resultado

    except Exception as e:
        logger.error("Erro em /estatisticas: %s", e, exc_info=True)
        return {"erro": "Erro interno"}
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}/cruzamento")
@limiter.limit("20/minute")
def cruzamento_emendas_contratos(request: Request, politico_id: int):
    """
    Cruzamento investigativo: emendas do político × contratos federais nos mesmos municípios.
    Camada 1 — geográfica: municípios que receberam emendas e também têm contratos federais.
    Camada 2 — financeira: doadores de campanha que coincidem com empresas contratadas.
    """
    conn = get_db_connection()
    try:
        # ── Camada 1: Municípios com emendas E contratos ──────────────────
        geo_rows = conn.execute("""
            SELECT
                e.municipio_destino,
                SUM(e.valor)   AS valor_emendas,
                COUNT(e.id)    AS num_emendas,
                COUNT(c.id)    AS num_contratos,
                COALESCE(SUM(c.valor), 0) AS valor_contratos
            FROM emendas e
            LEFT JOIN contratos c
                ON UPPER(REPLACE(c.municipio, ' - RJ', ''))
                   LIKE '%' || UPPER(REPLACE(REPLACE(e.municipio_destino,' - RJ',''), ' - RJ', '')) || '%'
            WHERE e.politico_id = ?
            GROUP BY e.municipio_destino
            HAVING valor_contratos > 0
            ORDER BY valor_contratos DESC
            LIMIT 10
        """, (politico_id,)).fetchall()

        camada_geo = [
            {
                "municipio":       r["municipio_destino"].replace(" - RJ", ""),
                "valor_emendas":   float(r["valor_emendas"] or 0),
                "num_emendas":     r["num_emendas"],
                "valor_contratos": float(r["valor_contratos"] or 0),
                "num_contratos":   r["num_contratos"],
            }
            for r in geo_rows
        ]

        # ── Camada 2: Doadores que coincidem com contratados ──────────────
        fin_rows = conn.execute("""
            SELECT
                d.nome_doador,
                d.documento_doador,
                d.valor              AS valor_doacao,
                SUM(c.valor)         AS valor_contratos,
                COUNT(DISTINCT c.id) AS num_contratos,
                GROUP_CONCAT(DISTINCT REPLACE(c.municipio,' - RJ','')) AS municipios
            FROM campanhas camp
            JOIN doadores d    ON d.campanha_id = camp.id
            JOIN contratos c   ON (
                (d.documento_doador != '' AND d.documento_doador = c.fornecedor_cnpj)
                OR UPPER(c.fornecedor_nome) LIKE '%' || UPPER(SUBSTR(d.nome_doador,1,10)) || '%'
            )
            WHERE camp.politico_id = ?
              AND c.valor > 0
              AND d.valor > 0
            GROUP BY d.nome_doador, d.documento_doador
            ORDER BY valor_contratos DESC
            LIMIT 10
        """, (politico_id,)).fetchall()

        camada_fin = [
            {
                "doador":          r["nome_doador"],
                "documento":       r["documento_doador"] or "",
                "valor_doacao":    float(r["valor_doacao"] or 0),
                "valor_contratos": float(r["valor_contratos"] or 0),
                "num_contratos":   r["num_contratos"],
                "municipios":      r["municipios"] or "",
            }
            for r in fin_rows
        ]

        return {
            "camada_geografica":  camada_geo,
            "camada_financeira":  camada_fin,
            "tem_cruzamento":     len(camada_geo) > 0 or len(camada_fin) > 0,
        }

    except Exception as e:
        logger.error("Erro em /politicos/%s/cruzamento: %s", politico_id, e, exc_info=True)
        return {"camada_geografica": [], "camada_financeira": [], "tem_cruzamento": False}
    finally:
        conn.close()


@app.get("/api/camara/atividade")
@limiter.limit("10/minute")
def atividade_camara(request: Request, dep_id: int = Query(..., description="ID do deputado na Câmara API")):
    """Retorna votações recentes + PLs autorais de um deputado.
    Dados atualizados a cada requisição (mudanças diárias)."""
    import requests as _req, concurrent.futures as _cf
    from datetime import datetime as _dt, timedelta as _td

    BASE = "https://dadosabertos.camara.leg.br/api/v2"
    HDR  = {"Accept": "application/json", "User-Agent": "HorusRJ/1.0"}
    SESS = _req.Session()
    SESS.headers.update(HDR)

    def _get(url, params=None):
        r = SESS.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()

    hoje   = _dt.now().strftime("%Y-%m-%d")
    inicio = (_dt.now() - _td(days=90)).strftime("%Y-%m-%d")

    # ── PLs autorais (só autoria principal + status real) ────────────────────
    # Câmara API retorna por ordem de número (mais antigos primeiro), então
    # pegamos até 100 por tipo para não perder os mais recentes.
    pls_raw = []
    for sigla in ("PL", "PEC", "PDL"):
        try:
            dados = _get(f"{BASE}/proposicoes",
                         {"siglaTipo": sigla, "idDeputadoAutor": dep_id, "itens": 100}
                        ).get("dados", [])
            pls_raw.extend(dados)
        except Exception:
            pass

    def _enriquecer_pl(p):
        """Filtra por autoria principal e enriquece com status real."""
        pid = p.get("id")
        if not pid:
            return None
        try:
            # /autores indica quem é o autor principal (ordemAssinatura=1 / proponente=1)
            autores = _get(f"{BASE}/proposicoes/{pid}/autores").get("dados", []) or []
            autor_principal = next(
                (a for a in autores if a.get("ordemAssinatura") == 1
                                    or str(a.get("proponente")) == "1"),
                None
            )
            # Se não conseguimos identificar autor principal, fallback: assume é nosso (conservador)
            if autor_principal:
                uri = autor_principal.get("uri") or ""
                if uri and str(dep_id) not in uri:
                    return None  # outro deputado é o autor principal → é co-autoria

            # /proposicoes/{id} → statusProposicao com descricaoSituacao, siglaOrgao etc.
            detalhe = _get(f"{BASE}/proposicoes/{pid}").get("dados", {}) or {}
            status = detalhe.get("statusProposicao") or {}
            return {
                "id":           pid,
                "tipo":         p.get("siglaTipo"),
                "numero":       p.get("numero"),
                "ano":          p.get("ano"),
                "ementa":       (p.get("ementa") or "")[:200],
                "data":         (p.get("dataApresentacao") or "")[:10],
                "status":       status.get("descricaoSituacao") or "Em tramitação",
                "status_orgao": status.get("siglaOrgao") or "",
                "status_data":  (status.get("dataHora") or "")[:10],
                "url": f"https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao={pid}",
            }
        except Exception:
            # Em caso de erro de rede/API, retorna o PL básico sem enriquecimento
            # (melhor mostrar com status genérico do que perder o dado)
            return {
                "id":           pid,
                "tipo":         p.get("siglaTipo"),
                "numero":       p.get("numero"),
                "ano":          p.get("ano"),
                "ementa":       (p.get("ementa") or "")[:200],
                "data":         (p.get("dataApresentacao") or "")[:10],
                "status":       "Em tramitação",
                "status_orgao": "",
                "status_data":  "",
                "url": f"https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao={pid}",
            }

    with _cf.ThreadPoolExecutor(max_workers=10) as pool:
        pls = [r for r in pool.map(_enriquecer_pl, pls_raw) if r is not None]

    pls.sort(key=lambda x: x.get("data", ""), reverse=True)

    # ── Votações plenárias recentes (idOrgao=180 = Plenário) ─────────────────
    votacoes_resultado = []
    try:
        sessoes = _get(f"{BASE}/votacoes",
                       {"dataInicio": inicio, "dataFim": hoje, "idOrgao": 180, "itens": 40}
                      ).get("dados", [])

        def _check_voto(sessao):
            vid = sessao.get("id")
            if not vid:
                return None
            try:
                votos = _get(f"{BASE}/votacoes/{vid}/votos").get("dados", [])
                if not votos:
                    return None
                meu = next((v for v in votos if (v.get("deputado_") or {}).get("id") == dep_id), None)
                if not meu:
                    return None
                prop = sessao.get("proposicaoObjeto") or {}
                return {
                    "data":      (sessao.get("data") or "")[:10],
                    "hora":      ((sessao.get("dataHoraRegistro") or "")[11:16]),
                    "voto":      meu.get("tipoVoto", "—"),
                    "descricao": (sessao.get("descricao") or "")[:180],
                    "aprovado":  sessao.get("aprovacao"),
                    "pl_tipo":   prop.get("siglaTipo", ""),
                    "pl_numero": prop.get("numero", ""),
                    "pl_ano":    prop.get("ano", ""),
                    "pl_ementa": (prop.get("ementa") or "")[:150],
                    "url": f"https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao={prop.get('id')}" if prop.get("id") else "",
                }
            except Exception:
                return None

        with _cf.ThreadPoolExecutor(max_workers=8) as pool:
            resultados = list(pool.map(_check_voto, sessoes))

        votacoes_resultado = [r for r in resultados if r is not None]
        votacoes_resultado.sort(key=lambda x: x.get("data", "") + x.get("hora", ""), reverse=True)
    except Exception:
        pass

    return {
        "dep_id":  dep_id,
        "periodo": {"inicio": inicio, "fim": hoje},
        "votacoes": votacoes_resultado,
        "pls":      pls[:40],
    }


@app.get("/api/camara/bio")
@limiter.limit("10/minute")
def bio_camara(request: Request, nome: str = Query(..., description="Nome do parlamentar")):
    """Proxy server-side para a Câmara API — evita CORS no browser.
    Retorna bio, histórico de mandatos, profissão, órgãos e redes sociais."""
    import urllib.request, urllib.parse, json as _json

    LEGISLATURAS = {53:(2007,2011), 54:(2011,2015), 55:(2015,2019), 56:(2019,2023), 57:(2023,2027), 58:(2027,2031)}

    def _fetch(url):
        req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "HorusRJ/1.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            return _json.loads(r.read())

    try:
        nome_enc = urllib.parse.quote(nome)
        busca = _fetch(f"https://dadosabertos.camara.leg.br/api/v2/deputados?nome={nome_enc}&itens=5")
        dados = busca.get("dados", [])
        if not dados:
            return {"encontrado": False}

        primeiro_nome = nome.upper().split()[0]
        dep = next((d for d in dados if primeiro_nome in (d.get("nome") or "").upper()), dados[0])
        dep_id = dep.get("id")
        if not dep_id:
            return {"encontrado": False}

        bio_raw = _fetch(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{dep_id}")
        bio = bio_raw.get("dados", {})

        # Histórico de mandatos: agrupa por legislatura, rastreia mudanças de partido
        historico_raw = []
        try:
            hist = _fetch(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{dep_id}/historico")
            historico_raw = hist.get("dados", [])
        except Exception:
            pass

        mandatos = {}
        for h in historico_raw:
            leg = h.get("idLegislatura")
            if not leg:
                continue
            partido = h.get("siglaPartido", "")
            if leg not in mandatos:
                mandatos[leg] = {"idLegislatura": leg, "partidos": []}
            if partido and partido not in ("", "S.PART.") and partido != (mandatos[leg]["partidos"] or [None])[-1]:
                mandatos[leg]["partidos"].append(partido)

        historico = []
        for leg, m in sorted(mandatos.items()):
            anos = LEGISLATURAS.get(leg, (None, None))
            historico.append({
                "idLegislatura": leg,
                "anoInicio": anos[0],
                "anoFim": anos[1],
                "partidos": m["partidos"],
            })

        # Profissão
        profissao = None
        try:
            prof = _fetch(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{dep_id}/profissoes")
            profs = prof.get("dados", [])
            if profs:
                profissao = profs[-1].get("titulo")
        except Exception:
            pass

        # Órgãos (comissões atuais)
        orgaos = []
        try:
            org = _fetch(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{dep_id}/orgaos")
            for o in org.get("dados", [])[:5]:
                nome_org = o.get("nomeOrgao") or o.get("siglaOrgao", "")
                titulo = o.get("titulo", "")
                if nome_org:
                    orgaos.append({"nome": nome_org, "titulo": titulo})
        except Exception:
            pass

        return {
            "encontrado": True,
            "id": dep_id,
            "nomeCivil": bio.get("nomeCivil"),
            "nomeEleitoral": bio.get("ultimoStatus", {}).get("nomeEleitoral"),
            "dataNascimento": bio.get("dataNascimento"),
            "municipioNascimento": bio.get("municipioNascimento"),
            "ufNascimento": bio.get("ufNascimento"),
            "escolaridade": bio.get("escolaridade"),
            "profissao": profissao,
            "urlFoto": dep.get("urlFoto"),
            "redeSocial": bio.get("redeSocial") or [],
            "historico": historico,
            "orgaos": orgaos,
        }
    except Exception as e:
        return {"encontrado": False, "erro": str(e)}


# ── Wikipedia: biografia complementar para enriquecer trajetória política ──
_WIKI_TABLE_CHECKED = {"ok": False}

def _garantir_tabela_wiki(conn):
    """Cria tabela bio_wikipedia se não existir. Cache de 30 dias."""
    if _WIKI_TABLE_CHECKED["ok"]:
        return
    conn.execute("""
        CREATE TABLE IF NOT EXISTS bio_wikipedia (
            politico_id INTEGER PRIMARY KEY,
            titulo      TEXT,
            resumo      TEXT,
            formacao    TEXT,
            profissao   TEXT,
            cargos_json TEXT,
            eventos_json TEXT,
            url         TEXT,
            fetched_at  TEXT
        )
    """)
    conn.commit()
    _WIKI_TABLE_CHECKED["ok"] = True


@app.get("/api/politicos/{politico_id}/ranking")
@limiter.limit("60/minute")
def politico_ranking(request: Request, politico_id: int):
    """Posição do político em rankings: nacional, dentro do partido e da UF.
    Usado pelo dashboard do perfil. Sempre por valor_total e total_emendas."""
    conn = get_db_connection()
    try:
        # Dados básicos do político-alvo
        alvo = conn.execute(f"""
            SELECT p.id, p.nome, p.partido, p.uf,
                   COUNT(e.id) AS total_emendas,
                   COALESCE(SUM(e.valor), 0) AS valor_total
            FROM politicos p
            LEFT JOIN emendas e ON e.politico_id = p.id
            WHERE p.id = ? AND {NOT_AUTOR_COLETIVO_SQL}
            GROUP BY p.id
        """, (politico_id,)).fetchone()

        if not alvo:
            raise HTTPException(404, "Político não encontrado")

        valor = float(alvo["valor_total"])
        nemend = int(alvo["total_emendas"])
        partido = alvo["partido"]
        uf = alvo["uf"]

        def _pos(scope_sql: str, params: tuple, metric: str) -> dict:
            # Conta quantos estão à frente + tamanho do grupo
            row = conn.execute(f"""
                WITH agg AS (
                    SELECT p.id,
                           COUNT(e.id) AS n_emendas,
                           COALESCE(SUM(e.valor), 0) AS v_total
                    FROM politicos p
                    LEFT JOIN emendas e ON e.politico_id = p.id
                    WHERE {NOT_AUTOR_COLETIVO_SQL} AND ({scope_sql})
                    GROUP BY p.id
                    HAVING n_emendas > 0
                )
                SELECT COUNT(*) AS total,
                       SUM(CASE WHEN {metric} > ? THEN 1 ELSE 0 END) AS acima
                FROM agg
            """, params + (valor if metric == 'v_total' else nemend,)).fetchone()
            total = int(row["total"] or 0)
            acima = int(row["acima"] or 0)
            return {"posicao": acima + 1 if (valor > 0 or nemend > 0) else None,
                    "de": total}

        result = {
            "politico_id": politico_id,
            "valor_total": valor,
            "total_emendas": nemend,
            "partido": partido,
            "uf": uf,
            "nacional_valor":  _pos("1=1", (), "v_total"),
            "nacional_emendas": _pos("1=1", (), "n_emendas"),
        }
        if partido:
            result["partido_valor"]   = _pos("UPPER(p.partido) = UPPER(?)", (partido,), "v_total")
            result["partido_emendas"] = _pos("UPPER(p.partido) = UPPER(?)", (partido,), "n_emendas")
        if uf:
            result["uf_valor"]   = _pos("UPPER(p.uf) = UPPER(?)", (uf,), "v_total")
            result["uf_emendas"] = _pos("UPPER(p.uf) = UPPER(?)", (uf,), "n_emendas")
        return result
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}/wikipedia")
@limiter.limit("20/minute")
def wiki_politico(request: Request, politico_id: int):
    """Biografia complementar via Wikipedia. Cache 30 dias em SQLite."""
    import urllib.request, urllib.parse, json as _json, re as _re
    from datetime import datetime as _dt, timedelta as _td

    conn = get_db_connection()
    try:
        _garantir_tabela_wiki(conn)
        row = conn.execute("SELECT * FROM bio_wikipedia WHERE politico_id = ?", (politico_id,)).fetchone()
        if row:
            fetched = _dt.fromisoformat(row["fetched_at"]) if row["fetched_at"] else None
            if fetched and (_dt.now() - fetched) < _td(days=30):
                return {
                    "encontrado": bool(row["resumo"]),
                    "titulo": row["titulo"],
                    "resumo": row["resumo"],
                    "formacao": row["formacao"],
                    "profissao": row["profissao"],
                    "cargos": _json.loads(row["cargos_json"] or "[]"),
                    "eventos": _json.loads(row["eventos_json"] or "[]"),
                    "url": row["url"],
                    "cache": True,
                }

        pol = conn.execute("SELECT nome FROM politicos WHERE id = ?", (politico_id,)).fetchone()
        if not pol:
            raise HTTPException(404, "Político não encontrado")
        nome = pol["nome"]

        # Normaliza nome para busca (Title Case mantém acentos)
        nome_busca = ' '.join(p.capitalize() for p in nome.split())

        def _fetch_json(url):
            req = urllib.request.Request(url, headers={"User-Agent": "HorusRJ/1.0 (transparência pública RJ)"})
            with urllib.request.urlopen(req, timeout=8) as r:
                return _json.loads(r.read())

        # 1. Busca o artigo (a API resolve redirects automaticamente)
        nome_enc = urllib.parse.quote(nome_busca)
        try:
            summary = _fetch_json(f"https://pt.wikipedia.org/api/rest_v1/page/summary/{nome_enc}")
        except Exception:
            summary = None

        if not summary or summary.get("type") == "disambiguation":
            # Cache negativo curto pra não martelar a API
            conn.execute("""INSERT OR REPLACE INTO bio_wikipedia
                (politico_id, titulo, resumo, formacao, profissao, cargos_json, eventos_json, url, fetched_at)
                VALUES (?, NULL, NULL, NULL, NULL, '[]', '[]', NULL, ?)""",
                (politico_id, _dt.now().isoformat()))
            conn.commit()
            return {"encontrado": False, "motivo": "não localizado na Wikipedia"}

        titulo = summary.get("title") or nome_busca
        resumo = summary.get("extract") or ""
        url_artigo = (summary.get("content_urls", {}) or {}).get("desktop", {}).get("page", "")

        # 2. Wikitexto para extrair infobox (formação, profissão, cargos)
        formacao = profissao = None
        cargos = []
        eventos = []
        try:
            titulo_enc = urllib.parse.quote(titulo.replace(' ', '_'))
            wt = _fetch_json(f"https://pt.wikipedia.org/w/api.php?action=parse&page={titulo_enc}&prop=wikitext&format=json&section=0")
            wikitext = wt.get("parse", {}).get("wikitext", {}).get("*", "")

            def _campo(nome_campo):
                m = _re.search(r'\|\s*' + nome_campo + r'\s*=\s*([^\n|]+)', wikitext, _re.IGNORECASE)
                if not m:
                    return None
                v = m.group(1).strip()
                v = _re.sub(r'<ref[^>]*>.*?</ref>', '', v, flags=_re.DOTALL)
                v = _re.sub(r'<ref[^/]*/>', '', v)
                v = _re.sub(r'\[\[([^|\]]+)\|([^\]]+)\]\]', r'\2', v)
                v = _re.sub(r'\[\[([^\]]+)\]\]', r'\1', v)
                v = _re.sub(r"'''?([^']+)'''?", r'\1', v)
                v = _re.sub(r'\{\{[^}]+\}\}', '', v)
                return v.strip().rstrip('.,;').strip() or None

            formacao = _campo('alma_mater') or _campo('formação') or _campo('formacao') or _campo('educação')
            profissao = _campo('ocupação') or _campo('ocupacao') or _campo('profissão') or _campo('profissao')

            # Cargos prévios — campos comuns: cargo, cargo2..., cargo_anterior
            for n in range(1, 9):
                suf = '' if n == 1 else str(n)
                c = _campo(f'cargo{suf}')
                inicio = _campo(f'mandato_inicio{suf}') or _campo(f'a_inicio{suf}')
                fim = _campo(f'mandato_fim{suf}') or _campo(f'a_fim{suf}')
                if c:
                    cargos.append({"cargo": c, "inicio": inicio, "fim": fim})

            # Eventos extraídos do resumo: anos no formato (em 1996), (1996), "em 1996"
            anos_no_resumo = sorted({int(y) for y in _re.findall(r'\b(19\d{2}|20\d{2})\b', resumo)})
            for a in anos_no_resumo[:8]:
                # Pega ~120 chars de contexto em torno do ano
                m = _re.search(r'([^.]*\b' + str(a) + r'\b[^.]*\.)', resumo)
                if m:
                    eventos.append({"ano": a, "trecho": m.group(1).strip()[:200]})
        except Exception:
            pass

        # Salva no cache
        conn.execute("""INSERT OR REPLACE INTO bio_wikipedia
            (politico_id, titulo, resumo, formacao, profissao, cargos_json, eventos_json, url, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (politico_id, titulo, resumo, formacao, profissao,
             _json.dumps(cargos, ensure_ascii=False),
             _json.dumps(eventos, ensure_ascii=False),
             url_artigo, _dt.now().isoformat()))
        conn.commit()

        return {
            "encontrado": True,
            "titulo": titulo,
            "resumo": resumo,
            "formacao": formacao,
            "profissao": profissao,
            "cargos": cargos,
            "eventos": eventos,
            "url": url_artigo,
            "cache": False,
        }
    finally:
        conn.close()


@app.get("/api/status/coleta")
def status_coleta():
    """Dashboard de monitoramento: emendas por UF, parlamentares, logs recentes."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Apenas as 27 UFs oficiais do Brasil — exclui BR, MULT, REG, EXT, etc.
        ufs_tuple = tuple(UFS_OFICIAIS)
        placeholders = ','.join('?' * len(ufs_tuple))

        # Emendas por UF (só estados reais)
        cur.execute(f"""
            SELECT uf, COUNT(*) as total, MIN(ano) as ano_min, MAX(ano) as ano_max
            FROM emendas
            WHERE uf IN ({placeholders})
            GROUP BY uf ORDER BY total DESC
        """, ufs_tuple)
        emendas_por_uf = [
            {"uf": r["uf"], "total": r["total"], "ano_min": r["ano_min"], "ano_max": r["ano_max"]}
            for r in cur.fetchall()
        ]

        # Totais gerais
        cur.execute("SELECT COUNT(*) FROM emendas")
        _row = cur.fetchone()
        total_emendas = _row[0] if _row else 0
        ufs_com_dados = len(emendas_por_uf)  # já filtrado — sempre ≤ 27

        # Parlamentares por casa
        cur.execute("""
            SELECT COALESCE(casa, 'sem_casa') as casa, COUNT(*) as total
            FROM politicos GROUP BY casa ORDER BY total DESC
        """)
        parlamentares = {r["casa"]: r["total"] for r in cur.fetchall()}

        # Tamanho do banco
        import os as _os
        db_size_kb = round(_os.path.getsize(DB_PATH) / 1024, 1) if _os.path.exists(DB_PATH) else 0

        conn.close()
    except Exception as e:
        logger.error("Erro em /api/status/coleta: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno")

    # Log recente da coleta nacional
    log_nacional = []
    log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs", "coleta_nacional.log")
    if os.path.exists(log_path):
        try:
            with open(log_path, encoding="utf-8", errors="replace") as f:
                linhas = f.readlines()
            log_nacional = [l.rstrip() for l in linhas[-30:] if l.strip()]
        except Exception:
            pass

    # Log de erros
    erros = []
    err_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs", "coleta_errors.log")
    if os.path.exists(err_path):
        try:
            with open(err_path, encoding="utf-8", errors="replace") as f:
                linhas = f.readlines()
            erros = [l.rstrip() for l in linhas[-10:] if l.strip()]
        except Exception:
            pass

    ufs_brasil = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
                  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
    ufs_coletadas = {e["uf"] for e in emendas_por_uf}
    ufs_pendentes = [u for u in ufs_brasil if u not in ufs_coletadas]

    return {
        "banco": {"total_emendas": total_emendas, "ufs_com_dados": ufs_com_dados, "tamanho_kb": db_size_kb},
        "emendas_por_uf": emendas_por_uf,
        "ufs_pendentes": ufs_pendentes,
        "parlamentares": parlamentares,
        "log_coleta_nacional": log_nacional,
        "erros_recentes": erros,
    }


@app.get("/api/indices/municipio_por_nome")
@limiter.limit("60/minute")
def indices_municipio_por_nome(request: Request, nome: str = Query(..., min_length=2),
                               uf: str = Query(..., min_length=2, max_length=2)):
    """
    Índices do território para a página de município, que identifica a cidade
    por NOME (ex: "NITERÓI - RJ") e não por código IBGE. Resolve via tabela
    municipios_ibge (nome normalizado + UF, 99.4% de match) e responde no mesmo
    shape do /indices/municipio/{cod}. Sem match: 404 (fallback honesto no front).
    """
    uf_u = uf.upper().strip()
    if uf_u not in UF_CODIGO:
        raise HTTPException(status_code=404, detail="UF desconhecida")
    # Remove sufixo " - UF" se vier junto no nome
    base = nome.strip()
    if base.upper().endswith(f" - {uf_u}"):
        base = base[: -(len(uf_u) + 3)].strip()
    nome_norm = _unaccent(base).upper().strip()

    conn = get_db_connection()
    try:
        tabs = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()}
        if "municipios_ibge" not in tabs or "indices_estado" not in tabs:
            return {"disponivel": False}

        row = conn.execute(
            "SELECT codigo_ibge, nome FROM municipios_ibge WHERE nome_normalizado = ? AND uf = ?",
            (nome_norm, uf_u)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Município não resolvido para código IBGE")
        cod_mun, nome_oficial = row["codigo_ibge"], row["nome"]
        cod_uf = cod_mun // 100000

        est: dict = {}
        for r in conn.execute("SELECT codigo_ibge, indicador, valor, unidade, fonte, ano FROM indices_estado"):
            est.setdefault(r["indicador"], {})[r["codigo_ibge"]] = (
                r["valor"], r["unidade"], r["fonte"], r["ano"]
            )
        mun = {}
        if "indices_municipio" in tabs:
            for r in conn.execute(
                "SELECT indicador, valor, unidade, fonte, ano FROM indices_municipio WHERE codigo_ibge = ?",
                (cod_mun,)
            ):
                mun[r["indicador"]] = (r["valor"], r["unidade"], r["fonte"], r["ano"])

        out = []
        for ind in sorted(est.keys()):
            if ind in mun and mun[ind][0] is not None:
                _, unidade, fonte, ano = mun[ind]
                out.append({"indicador": ind, "valor": round(mun[ind][0], 2),
                            "unidade": unidade, "fonte": fonte, "ano": ano, "estimado": False})
            else:
                vals = est.get(ind, {})
                if cod_uf in vals and vals[cod_uf][0] is not None:
                    v, unidade, fonte, ano = vals[cod_uf]
                    out.append({"indicador": ind, "valor": round(v, 2),
                                "unidade": unidade, "fonte": fonte, "ano": ano,
                                "estimado": True, "estimado_por": f"média de {CODIGO_UF.get(cod_uf, '')}"})
        if not out:
            return {"disponivel": False}
        return {"disponivel": True, "nivel": "municipio", "id": str(cod_mun),
                "nome": nome_oficial, "uf": uf_u, "indicadores": out}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro em /indices/municipio_por_nome %s-%s: %s", nome, uf, e, exc_info=True)
        return {"disponivel": False}
    finally:
        conn.close()


@app.get("/api/indices/{nivel}/{territorio_id}")
@limiter.limit("60/minute")
def indices_territoriais(request: Request, nivel: str, territorio_id: str):
    """
    Índices territoriais em cascata (CLAUDE.md).
      brasil          -> média/total nacional + extremos (5 melhores / 5 piores estados)
      regiao/{slug}   -> agregado da região + posição no ranking nacional
      estado/{uf}     -> valor direto + posição entre 27 + comparativo região/Brasil
      municipio/{cod} -> valor direto; fallback média estadual com flag 'estimado'

    Médias são ponderadas por população; totais (população, desmatamento_km2) somam.
    Sem dado: omite o indicador (nunca zero — mentira estatística).
    """
    nivel = (nivel or "").lower().strip()
    conn = get_db_connection()
    try:
        tabs = {r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()}
        if "indices_estado" not in tabs:
            return {"disponivel": False}

        # Carrega todos os índices estaduais: est[indicador][uf_cod] = (valor, unidade, fonte, ano)
        est: dict = {}
        for r in conn.execute("SELECT codigo_ibge, indicador, valor, unidade, fonte, ano FROM indices_estado"):
            est.setdefault(r["indicador"], {})[r["codigo_ibge"]] = (
                r["valor"], r["unidade"], r["fonte"], r["ano"]
            )
        if not est:
            return {"disponivel": False}

        pop_est = {c: v[0] for c, v in est.get("populacao", {}).items()}

        def agrega(indicador: str, uf_codes: list):
            """Agrega valores de um conjunto de UFs conforme o método do indicador."""
            vals = est.get(indicador, {})
            pares = [(c, vals[c][0]) for c in uf_codes if c in vals and vals[c][0] is not None]
            if not pares:
                return None
            if INDICE_AGG.get(indicador) == "sum":
                return sum(v for _, v in pares)
            # média ponderada por população (fallback média simples se sem pop)
            num = sum(v * pop_est.get(c, 0) for c, v in pares)
            den = sum(pop_est.get(c, 0) for c, _ in pares)
            if den > 0:
                return num / den
            return sum(v for _, v in pares) / len(pares)

        todos_ufs = sorted({c for vals in est.values() for c in vals})
        meta = lambda ind: next(iter(est.get(ind, {}).values()), (None, None, None, None))

        def pacote(indicador, valor, **extra):
            _, unidade, fonte, ano = meta(indicador)
            return {"indicador": indicador, "valor": round(valor, 2) if valor is not None else None,
                    "unidade": unidade, "fonte": fonte, "ano": ano, **extra}

        # ── BRASIL ───────────────────────────────────────────────────────────
        if nivel in ("brasil", "br", "nacional"):
            out = []
            for ind in sorted(est.keys()):
                nacional = agrega(ind, todos_ufs)
                if nacional is None:
                    continue
                ranking = sorted(
                    [(c, est[ind][c][0]) for c in est[ind] if est[ind][c][0] is not None],
                    key=lambda x: x[1], reverse=True
                )
                fmt = lambda t: {"uf": CODIGO_UF.get(t[0], str(t[0])),
                                 "nome": UF_NOME.get(CODIGO_UF.get(t[0], ""), ""),
                                 "valor": round(t[1], 2)}
                out.append(pacote(ind, nacional,
                                  melhores=[fmt(t) for t in ranking[:5]],
                                  piores=[fmt(t) for t in ranking[-5:][::-1]]))
            return {"disponivel": True, "nivel": "brasil", "nome": "Brasil", "indicadores": out}

        # ── REGIÃO ───────────────────────────────────────────────────────────
        if nivel in ("regiao", "região", "regiao".encode().decode()):
            slug = territorio_id.lower().strip()
            dig = REGIAO_DIGITO.get(slug)
            if dig is None:
                raise HTTPException(status_code=404, detail="Região desconhecida")
            uf_codes = [c for c in todos_ufs if c // 10 == dig]
            out = []
            for ind in sorted(est.keys()):
                val = agrega(ind, uf_codes)
                if val is None:
                    continue
                nacional = agrega(ind, todos_ufs)
                # posição da região entre as 5
                regioes_vals = []
                for d in REGIAO_NOME:
                    rc = [c for c in todos_ufs if c // 10 == d]
                    rv = agrega(ind, rc)
                    if rv is not None:
                        regioes_vals.append((d, rv))
                regioes_vals.sort(key=lambda x: x[1], reverse=True)
                pos = next((i + 1 for i, (d, _) in enumerate(regioes_vals) if d == dig), None)
                out.append(pacote(ind, val, brasil=round(nacional, 2) if nacional is not None else None,
                                  ranking={"posicao": pos, "de": len(regioes_vals)}))
            return {"disponivel": True, "nivel": "regiao", "id": slug,
                    "nome": slug.replace("-", " ").title(), "indicadores": out}

        # ── ESTADO ───────────────────────────────────────────────────────────
        if nivel in ("estado", "uf"):
            uf = territorio_id.upper().strip()
            cod = UF_CODIGO.get(uf) if not uf.isdigit() else int(uf)
            if cod is None or cod not in CODIGO_UF:
                raise HTTPException(status_code=404, detail="Estado desconhecido")
            uf = CODIGO_UF[cod]
            dig = cod // 10
            uf_regiao = [c for c in todos_ufs if c // 10 == dig]
            out = []
            for ind in sorted(est.keys()):
                vals = est.get(ind, {})
                if cod not in vals or vals[cod][0] is None:
                    continue
                valor = vals[cod][0]
                ranking = sorted([(c, vals[c][0]) for c in vals if vals[c][0] is not None],
                                 key=lambda x: x[1], reverse=True)
                pos = next((i + 1 for i, (c, _) in enumerate(ranking) if c == cod), None)
                out.append(pacote(ind, valor,
                                  ranking={"posicao": pos, "de": len(ranking)},
                                  regiao=round(agrega(ind, uf_regiao), 2) if agrega(ind, uf_regiao) is not None else None,
                                  brasil=round(agrega(ind, todos_ufs), 2) if agrega(ind, todos_ufs) is not None else None))
            return {"disponivel": True, "nivel": "estado", "id": uf,
                    "nome": UF_NOME.get(uf, uf), "indicadores": out}

        # ── MUNICÍPIO ────────────────────────────────────────────────────────
        if nivel in ("municipio", "município", "mun"):
            if not territorio_id.isdigit():
                raise HTTPException(status_code=400, detail="codigo_ibge do município deve ser numérico")
            cod_mun = int(territorio_id)
            cod_uf = cod_mun // 100000
            if cod_uf not in CODIGO_UF:
                raise HTTPException(status_code=404, detail="Código IBGE de município inválido")
            mun = {}
            if "indices_municipio" in tabs:
                for r in conn.execute(
                    "SELECT indicador, valor, unidade, fonte, ano FROM indices_municipio WHERE codigo_ibge = ?",
                    (cod_mun,)
                ):
                    mun[r["indicador"]] = (r["valor"], r["unidade"], r["fonte"], r["ano"])
            out = []
            for ind in sorted(est.keys()):
                if ind in mun and mun[ind][0] is not None:
                    _, unidade, fonte, ano = mun[ind]
                    out.append({"indicador": ind, "valor": round(mun[ind][0], 2),
                                "unidade": unidade, "fonte": fonte, "ano": ano, "estimado": False})
                else:
                    # fallback: valor do estado, marcado como estimado
                    vals = est.get(ind, {})
                    if cod_uf in vals and vals[cod_uf][0] is not None:
                        v, unidade, fonte, ano = vals[cod_uf]
                        out.append({"indicador": ind, "valor": round(v, 2),
                                    "unidade": unidade, "fonte": fonte, "ano": ano,
                                    "estimado": True, "estimado_por": f"média de {CODIGO_UF.get(cod_uf, '')}"})
            if not out:
                return {"disponivel": False}
            return {"disponivel": True, "nivel": "municipio", "id": str(cod_mun),
                    "uf": CODIGO_UF.get(cod_uf, ""), "indicadores": out}

        raise HTTPException(status_code=404, detail="Nível inválido (brasil|regiao|estado|municipio)")
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Erro em /indices/%s/%s: %s", nivel, territorio_id, e, exc_info=True)
        return {"disponivel": False}
    finally:
        conn.close()


@app.get("/api/health")
def health():
    """
    Health check. Inclui últimos erros de coleta (se existirem)
    lendo o arquivo logs/coleta_errors.log gerado pelo scheduler.
    """
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM emendas")
        _r1 = cur.fetchone()
        total_emendas = _r1[0] if _r1 and _r1[0] is not None else 0
        cur.execute("SELECT MAX(ano) FROM emendas")
        _r2 = cur.fetchone()
        ultimo_ano = _r2[0] if _r2 and _r2[0] is not None else None
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"db error: {e}")

    # Lê erros recentes do scheduler. Filtra só linhas com timestamp no início
    # (formato "YYYY-MM-DD HH:MM:SS | job | msg") — descarta continuações de
    # stacktrace de logs antigos que eram multi-linha.
    import re as _re
    _ts_pattern = _re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| ")
    erros_recentes = []
    errors_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "logs", "coleta_errors.log"
    )
    if os.path.exists(errors_file):
        try:
            with open(errors_file, encoding="utf-8") as f:
                linhas = [l.strip() for l in f.readlines()]
            erros_recentes = [l for l in linhas if _ts_pattern.match(l)][-5:]
        except Exception as _e:
            logger.warning("health: erro lendo coleta_errors.log: %s", _e)

    return {
        "status": "ok",
        "db": "ok",
        "emendas": total_emendas,
        "ultimo_ano": ultimo_ano,
        "coleta_errors": erros_recentes,   # lista vazia = tudo ok
    }


@app.get("/api/inconsistencias")
@limiter.limit("10/minute")
def relatorio_inconsistencias(request: Request):
    """
    Relatório de inconsistências nos dados:
    - Emendas sem município destino
    - Emendas com valor zero
    - Emendas sem político vinculado
    - Políticos sem emendas
    - Emendas com valor_pago > valor_empenhado (anomalia)
    """
    conn = get_db_connection()
    try:
        r: dict = {}

        # 1. Emendas sem município
        row = conn.execute("SELECT COUNT(*) FROM emendas WHERE municipio_destino IS NULL OR TRIM(municipio_destino) = ''").fetchone()
        r["emendas_sem_municipio"] = row[0] if row else 0

        # 2. Emendas com valor zero
        row = conn.execute("SELECT COUNT(*) FROM emendas WHERE COALESCE(valor, 0) = 0").fetchone()
        r["emendas_valor_zero"] = row[0] if row else 0

        # 3. Emendas sem político (politico_id nulo ou sem match)
        row = conn.execute("""
            SELECT COUNT(*) FROM emendas e
            WHERE e.politico_id IS NULL
               OR NOT EXISTS (SELECT 1 FROM politicos p WHERE p.id = e.politico_id)
        """).fetchone()
        r["emendas_sem_politico"] = row[0] if row else 0

        # 4. Políticos sem nenhuma emenda
        row = conn.execute(f"""
            SELECT COUNT(*) FROM politicos p
            WHERE {NOT_AUTOR_COLETIVO_SQL}
              AND NOT EXISTS (SELECT 1 FROM emendas e WHERE e.politico_id = p.id)
        """).fetchone()
        r["politicos_sem_emendas"] = row[0] if row else 0

        # 5. Anomalia: valor_pago > valor_empenhado (diferença > 5%)
        row = conn.execute("""
            SELECT COUNT(*) FROM emendas
            WHERE valor_pago IS NOT NULL AND valor_empenhado IS NOT NULL
              AND valor_empenhado > 0
              AND valor_pago > valor_empenhado * 1.05
        """).fetchone()
        r["anomalia_pago_maior_empenhado"] = row[0] if row else 0

        # 6. Emendas sem UF — exclui destinos que legitimamente não têm UF única:
        # estaduais (`NOME (UF)`), nacionais, federais, multi-estado e macrorregiões.
        row = conn.execute("""
            SELECT COUNT(*) FROM emendas
            WHERE (uf IS NULL OR TRIM(uf) = '')
              AND municipio_destino NOT LIKE '%(UF)%'
              AND UPPER(municipio_destino) NOT LIKE '%NACIONAL%'
              AND UPPER(municipio_destino) NOT LIKE '%FEDERAL%'
              AND UPPER(municipio_destino) NOT LIKE '%M_LTIPLO%'
              AND UPPER(municipio_destino) NOT LIKE '%EXTERIOR%'
              AND UPPER(municipio_destino) NOT IN ('NORTE', 'NORDESTE', 'CENTRO-OESTE', 'SUDESTE', 'SUL')
              AND (municipio_destino IS NOT NULL AND TRIM(municipio_destino) != '')
        """).fetchone()
        r["emendas_sem_uf"] = row[0] if row else 0

        # 7. Anos com cobertura parcial (menos de 100 emendas no ano)
        anos_rows = conn.execute("""
            SELECT ano, COUNT(*) as total FROM emendas
            WHERE ano IS NOT NULL GROUP BY ano HAVING total < 100 ORDER BY ano
        """).fetchall()
        r["anos_cobertura_parcial"] = [{"ano": a["ano"], "total": a["total"]} for a in anos_rows]

        # 8. Total geral para contexto
        row = conn.execute("SELECT COUNT(*) FROM emendas").fetchone()
        r["total_emendas"] = row[0] if row else 0

        # Score de qualidade: % de emendas sem problemas
        problemas = r["emendas_sem_municipio"] + r["emendas_valor_zero"] + r["emendas_sem_politico"] + r["emendas_sem_uf"]
        r["score_qualidade"] = round((1 - problemas / max(r["total_emendas"], 1)) * 100, 1)

        return r
    except Exception as e:
        logger.error("Erro em /inconsistencias: %s", e, exc_info=True)
        return {"erro": "Erro interno"}
    finally:
        conn.close()


# Configuração para servir o Frontend (React/Vite)
FRONTEND_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

if os.path.exists(FRONTEND_PATH):
    # Monta a pasta de assets e arquivos estáticos
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_PATH, "assets")), name="assets")
    
    # Rota para servir o index.html em qualquer caminho que não seja API
    @app.get("/{rest_of_path:path}")
    async def serve_frontend(rest_of_path: str):
        # Se o caminho começar com 'api/', retornar 404 para não mascarar erros de API
        if rest_of_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
            
        # Tenta servir o arquivo solicitado na pasta dist (ex: imagens, svgs)
        file_path = os.path.join(FRONTEND_PATH, rest_of_path)
        if os.path.isfile(file_path):
            # #48 Cache headers: GeoJSONs (7d) e imagens (24h) raramente mudam
            ext = os.path.splitext(file_path)[1].lower()
            if ext == '.json' and 'geo' in rest_of_path:
                return FileResponse(file_path, headers={"Cache-Control": "public, max-age=604800"})
            if ext in ('.jpg', '.jpeg', '.png', '.webp', '.svg'):
                return FileResponse(file_path, headers={"Cache-Control": "public, max-age=86400"})
            return FileResponse(file_path)

        # Fallback para o index.html (SPA routing)
        return FileResponse(os.path.join(FRONTEND_PATH, "index.html"))
else:
    print(f"AVISO: Pasta dist do frontend não encontrada em {FRONTEND_PATH}")
