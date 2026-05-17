import json
import os
from datetime import datetime

CACHE_DIR = "cache/emendas"

def garantir_pasta():
    os.makedirs(CACHE_DIR, exist_ok=True)

def caminho_cache(ano: int) -> str:
    return os.path.join(CACHE_DIR, f"emendas_{ano}.json")

def cache_existe(ano: int, force_refresh: bool = False) -> bool:
    """Retorna True se cache válido existe. `force_refresh=True` ignora cache permanente."""
    path = caminho_cache(ano)
    if not os.path.exists(path):
        return False
    if force_refresh:
        return False
    # Anos antigos (2 anos atrás ou mais): cache permanente, nunca expira
    ano_atual = datetime.now().year
    if ano <= ano_atual - 2:
        return True
    # Anos recentes (ano atual e anterior): cache válido por 7 dias
    modificado = os.path.getmtime(path)
    dias_passados = (datetime.now().timestamp() - modificado) / 86400
    return dias_passados < 7

def salvar_cache(ano: int, dados: list):
    garantir_pasta()
    path = caminho_cache(ano)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({
            "ano": ano,
            "total": len(dados),
            "coletado_em": datetime.now().isoformat(),
            "dados": dados
        }, f, ensure_ascii=False, indent=2)
    print(f"[CACHE] {len(dados)} emendas de {ano} salvas em {path}")

def carregar_cache(ano: int) -> list:
    path = caminho_cache(ano)
    with open(path, 'r', encoding='utf-8') as f:
        conteudo = json.load(f)
    print(f"[CACHE] Carregando {conteudo['total']} emendas de {ano} "
          f"(coletado em {conteudo['coletado_em']})")
    return conteudo["dados"]

def status_cache():
    garantir_pasta()
    print("\n=== STATUS DO CACHE ===")
    for ano in range(2014, datetime.now().year + 1):
        path = caminho_cache(ano)
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                info = json.load(f)
            modificado = os.path.getmtime(path)
            dias = (datetime.now().timestamp() - modificado) / 86400
            valido = "[ok] valido" if dias < 7 else "[!] expirado"
            print(f"  {ano}: {info['total']} emendas | "
                  f"coletado {info['coletado_em'][:10]} | {valido}")
        else:
            print(f"  {ano}: [x] sem cache")
    print("=======================\n")
