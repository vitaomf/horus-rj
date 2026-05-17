import sqlite3
import math
import unicodedata
import os
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Optional

# Suporte Turso (libSQL): usado quando rodando na nuvem (Koyeb).
# Localmente continua usando SQLite via sqlite3.
TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")
_use_turso = bool(TURSO_DATABASE_URL and TURSO_AUTH_TOKEN)
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

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(title="Transparência RJ API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Cache-Control: dados mudam raramente, então cacheia por 1h no browser.
# /api/health nunca é cacheado (mostra estado em tempo real).
from starlette.middleware.base import BaseHTTPMiddleware

class CacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        elif path.startswith("/assets/"):
            response.headers["Cache-Control"] = "public, max-age=86400"
        return response

app.add_middleware(CacheMiddleware)

# Filtro: rankings públicos só consideram parlamentares individuais.
# Autores coletivos (bancadas, comissões, relatores) são marcados em
# coleta_emendas.py com cargo='Autor Coletivo' e excluídos via este predicado.
NOT_AUTOR_COLETIVO_SQL = "COALESCE(p.cargo, '') != 'Autor Coletivo'"

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
        conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.create_function("unaccent", 1, _unaccent)
    return conn




@app.get("/api/municipios/heatmap")
def obter_municipios_heatmap():
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
        """)
        rows = cur.fetchall()
        return [
            {"nome": r["nome"], "valor_total": r["valor_total"], "total_emendas": r["total_emendas"]}
            for r in rows
        ]
    finally:
        conn.close()


@app.get("/api/emendas/busca")
def buscar_emendas(
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
def listar_municipios(busca: Optional[str] = Query(None)):
    """
    Retorna lista de todos os municípios do RJ com id e nome.
    Se a tabela `municipios` ainda não existir, extrai unicamente do `municipio_destino` da tabela de `emendas`.
    Pode ser filtrado opcionalmente pelo parâmetro `busca`.
    """
    conn = get_db_connection()
    try:
        # Tenta buscar da tabela oficial `municipios` caso exista
        query = "SELECT id, nome FROM municipios WHERE 1=1"
        params = []
        
        if busca:
            query += " AND UPPER(nome) LIKE UPPER(?)"
            params.append(f'%{busca}%')
            
        query += " ORDER BY nome"
        
        municipios = conn.execute(query, params).fetchall()
        return [dict(m) for m in municipios]
    except sqlite3.OperationalError:
        try:
            # Fallback: Extrai nomes únicos direto das emendas se a tabela municipios não tiver sido criada
            query_fallback = "SELECT DISTINCT municipio_destino as nome FROM emendas WHERE municipio_destino != ''"
            params_fallback = []
            if busca:
                query_fallback += " AND UPPER(municipio_destino) LIKE UPPER(?)"
                params_fallback.append(f'%{busca}%')
                
            query_fallback += " ORDER BY municipio_destino"
                
            municipios = conn.execute(query_fallback, params_fallback).fetchall()
            # Gera um ID fake baseado na ordem para não quebrar a listagem do front-end
            return [{"id": i+1, "nome": m["nome"]} for i, m in enumerate(municipios)]
        except sqlite3.OperationalError:
            return []
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
        raise HTTPException(status_code=500, detail=str(e))
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
            # Se não existe a tabela de município, a gente pega pelo ID fake do endpoint anterior (ordem alfabética)
            municipios = conn.execute("SELECT DISTINCT municipio_destino FROM emendas WHERE municipio_destino != '' ORDER BY municipio_destino").fetchall()
            if municipio_id <= 0 or municipio_id > len(municipios):
                raise HTTPException(status_code=404, detail="Município não encontrado.")
            nome_municipio = municipios[municipio_id - 1]["municipio_destino"]
            
        # Busca as emendas usando o JOIN
        query = """
            SELECT e.*, p.nome as politico_nome, p.partido as politico_partido 
            FROM emendas e 
            LEFT JOIN politicos p ON e.politico_id = p.id 
            WHERE e.municipio_destino = ?
            ORDER BY e.valor DESC
        """
        emendas = conn.execute(query, (nome_municipio,)).fetchall()
        return [dict(e) for e in emendas]
        
    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=str(e))
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


@app.get("/api/politicos/total")
def obter_total_politicos():
    """
    Retorna a contagem total de políticos individuais (exclui autores coletivos).
    """
    conn = get_db_connection()
    try:
        resultado = conn.execute(f"""
            SELECT COUNT(id) as total
            FROM politicos p
            WHERE {NOT_AUTOR_COLETIVO_SQL}
        """).fetchone()
        return {"total": resultado["total"]}
    except sqlite3.OperationalError:
        return {"total": 0}
    finally:
        conn.close()



@app.get("/api/politicos")
def listar_politicos_paginado(
    pagina: int = Query(1, ge=1),
    limite: int = Query(20, ge=1, le=2000),
    busca: Optional[str] = Query(None)
):
    """
    Lista políticos paginados com total de emendas e valor.
    Suporta busca por nome.
    """
    conn = get_db_connection()
    try:
        where_parts = [NOT_AUTOR_COLETIVO_SQL]
        params = []

        if busca and busca.strip():
            where_parts.append("UPPER(p.nome) LIKE UPPER(?)")
            params.append(f'%{busca.strip()}%')

        where_clause = "WHERE " + " AND ".join(where_parts)

        # Contar total
        count_query = f"""
            SELECT COUNT(DISTINCT p.id) as total
            FROM politicos p
            {where_clause}
        """
        total = conn.execute(count_query, params).fetchone()["total"]
        total_paginas = max(1, math.ceil(total / limite))
        
        # Buscar página
        offset = (pagina - 1) * limite
        data_query = f"""
            SELECT p.id, p.nome, p.partido, p.cargo,
                   COUNT(e.id) as total_emendas,
                   SUM(e.valor) as valor_total
            FROM politicos p
            LEFT JOIN emendas e ON p.id = e.politico_id
            {where_clause}
            GROUP BY p.id
            ORDER BY valor_total DESC
            LIMIT ? OFFSET ?
        """
        data_params = params + [limite, offset]
        rows = conn.execute(data_query, data_params).fetchall()
        
        politicos = [
            {
                "id": r["id"],
                "nome": r["nome"],
                "partido": r["partido"],
                "cargo": r["cargo"],
                "total_emendas": r["total_emendas"] or 0,
                "valor_total": float(r["valor_total"]) if r["valor_total"] else 0
            }
            for r in rows
        ]
        
        return {
            "politicos": politicos,
            "total": total,
            "pagina": pagina,
            "total_paginas": total_paginas
        }
    except Exception as e:
        print(f"Erro ao listar politicos paginado:", e)
        return {"politicos": [], "total": 0, "pagina": 1, "total_paginas": 1}
    finally:
        conn.close()

@app.get("/api/politicos/busca")
def buscar_politicos(q: str = Query(..., description="Termo de busca pelo nome")):
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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/municipios/{nome}/detalhes")
def obter_detalhes_municipio(nome: str):
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
        print(f"Erro ao buscar detalhes do municipio {nome}:", e)
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
def obter_contratos_municipio(nome: str):
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
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Erro ao buscar contratos do municipio {nome}:", e)
        return []
    finally:
        conn.close()

@app.get("/api/politicos/{politico_id}")
def obter_detalhes_politico(politico_id: int):
    conn = get_db_connection()
    try:
        # 1. Informações básicas do político e totais gerais
        # COALESCE para foto_url (coluna pode não existir em bancos antigos)
        try:
            conn.execute("SELECT foto_url FROM politicos LIMIT 1").fetchone()
            tem_foto_col = True
        except sqlite3.OperationalError:
            tem_foto_col = False

        if tem_foto_col:
            politico_info = conn.execute("""
                SELECT p.id, p.nome, p.partido, p.cargo, p.foto_url,
                       COUNT(e.id) as total_emendas,
                       SUM(e.valor) as valor_total
                FROM politicos p
                LEFT JOIN emendas e ON p.id = e.politico_id
                WHERE p.id = ?
                GROUP BY p.id
            """, (politico_id,)).fetchone()
        else:
            politico_info = conn.execute("""
                SELECT p.id, p.nome, p.partido, p.cargo, NULL as foto_url,
                       COUNT(e.id) as total_emendas,
                       SUM(e.valor) as valor_total
                FROM politicos p
                LEFT JOIN emendas e ON p.id = e.politico_id
                WHERE p.id = ?
                GROUP BY p.id
            """, (politico_id,)).fetchone()

        if not politico_info:
            raise HTTPException(status_code=404, detail="Político não encontrado")

        # 2. Municípios Beneficiados
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

        # 5. Todas as Emendas (LIMIT 1000 defensivo — evita payload gigante; paginação no frontend)
        ultimas_emendas_rows = conn.execute("""
            SELECT ano, valor,
                   COALESCE(valor_empenhado, valor, 0) as valor_empenhado,
                   COALESCE(valor_pago, 0)             as valor_pago,
                   descricao, objetivo, municipio_destino, fonte_url
            FROM emendas
            WHERE politico_id = ?
            ORDER BY ano DESC, valor DESC
            LIMIT 1000
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

        return {
            "id": politico_info["id"],
            "nome": politico_info["nome"],
            "partido": politico_info["partido"],
            "cargo": politico_info["cargo"],
            "foto_url": politico_info["foto_url"] if tem_foto_col else None,
            "total_emendas": politico_info["total_emendas"] or 0,
            "valor_total": float(politico_info["valor_total"]) if politico_info["valor_total"] else 0,
            "dados_campanha": dados_campanha,
            "municipios_beneficiados": municipios_beneficiados,
            "emendas_por_ano": emendas_por_ano,
            "ultimas_emendas": ultimas_emendas
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar politico {politico_id}:", e)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/estatisticas")
def obter_estatisticas():
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

        # 3. TOP 10 Municípios
        top_municipios_rows = conn.execute("""
            SELECT municipio_destino as nome,
                   COUNT(id) as total_emendas,
                   SUM(valor) as valor_total
            FROM emendas
            WHERE municipio_destino != ''
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

        return {
            "valor_total_geral": valor_total_geral,
            "media_por_emenda": media_por_emenda,
            "top_politicos": top_politicos,
            "top_municipios": top_municipios,
            "por_ano": por_ano,
            "por_objetivo": por_objetivo
        }

    except Exception as e:
        print(f"Erro ao buscar estatisticas gerais:", e)
        return {"erro": str(e)}
    finally:
        conn.close()


@app.get("/api/politicos/{politico_id}/cruzamento")
def cruzamento_emendas_contratos(politico_id: int):
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
        print(f"Erro no cruzamento politico {politico_id}:", e)
        return {"camada_geografica": [], "camada_financeira": [], "tem_cruzamento": False}
    finally:
        conn.close()


@app.get("/api/camara/atividade")
def atividade_camara(dep_id: int = Query(..., description="ID do deputado na Câmara API")):
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
    inicio = (_dt.now() - _td(days=60)).strftime("%Y-%m-%d")

    # ── PLs autorais ─────────────────────────────────────────────────────────
    pls = []
    for sigla in ("PL", "PEC", "PDL"):
        try:
            dados = _get(f"{BASE}/proposicoes",
                         {"siglaTipo": sigla, "idDeputadoAutor": dep_id, "itens": 20}
                        ).get("dados", [])
            for p in dados:
                pls.append({
                    "id":      p.get("id"),
                    "tipo":    p.get("siglaTipo"),
                    "numero":  p.get("numero"),
                    "ano":     p.get("ano"),
                    "ementa":  (p.get("ementa") or "")[:200],
                    "data":    (p.get("dataApresentacao") or "")[:10],
                    "url": f"https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao={p.get('id')}",
                })
        except Exception:
            pass
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
def bio_camara(nome: str = Query(..., description="Nome do parlamentar")):
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
        total_emendas = cur.fetchone()[0]
        cur.execute("SELECT MAX(ano) FROM emendas")
        ultimo_ano = cur.fetchone()[0]
        conn.close()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"db error: {e}")

    # Lê erros recentes do scheduler (últimas 5 linhas)
    erros_recentes = []
    errors_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "logs", "coleta_errors.log"
    )
    if os.path.exists(errors_file):
        try:
            linhas = open(errors_file, encoding="utf-8").readlines()
            erros_recentes = [l.strip() for l in linhas[-5:] if l.strip()]
        except Exception:
            pass

    return {
        "status": "ok",
        "db": "ok",
        "emendas": total_emendas,
        "ultimo_ano": ultimo_ano,
        "coleta_errors": erros_recentes,   # lista vazia = tudo ok
    }


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
            return FileResponse(file_path)
            
        # Fallback para o index.html (SPA routing)
        return FileResponse(os.path.join(FRONTEND_PATH, "index.html"))
else:
    print(f"AVISO: Pasta dist do frontend não encontrada em {FRONTEND_PATH}")
