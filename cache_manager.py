import json
import os
from datetime import datetime

CACHE_DIR = "cache/emendas"

def garantir_pasta():
    os.makedirs(CACHE_DIR, exist_ok=True)

def caminho_cache(ano: int, uf: str = "") -> str:
    """Retorna caminho do arquivo de cache.
    Com uf (ex: 'SP'): cache específico por UF — emendas_SP_2024.json
    Sem uf: cache geral (todas as UFs) — emendas_2024.json
    """
    nome = f"emendas_{uf}_{ano}.json" if uf else f"emendas_{ano}.json"
    return os.path.join(CACHE_DIR, nome)

def cache_existe(ano: int, force_refresh: bool = False, uf: str = "") -> bool:
    """
    Retorna True se cache válido existe. `force_refresh=True` ignora todo cache.

    Política de TTL (alinhada ao quanto o Portal da Transparência ainda atualiza dados):
      - ano atual         → 7 dias  (dados ainda chegando)
      - ano - 1           → 30 dias (raros ajustes)
      - ano - 2 a ano - 5 → 60 dias (estabilizado)
      - mais antigo       → permanente
    """
    path = caminho_cache(ano, uf)
    if not os.path.exists(path):
        return False
    if force_refresh:
        return False

    ano_atual    = datetime.now().year
    diff         = ano_atual - ano
    modificado   = os.path.getmtime(path)
    dias_passados = (datetime.now().timestamp() - modificado) / 86400

    if diff >= 6:  return True              # > 5 anos atrás: permanente
    if diff >= 2:  return dias_passados < 60
    if diff == 1:  return dias_passados < 30
    return dias_passados < 7                # ano atual

def salvar_cache(ano: int, dados: list, uf: str = ""):
    garantir_pasta()
    path = caminho_cache(ano, uf)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump({
            "ano": ano,
            "uf": uf,
            "total": len(dados),
            "coletado_em": datetime.now().isoformat(),
            "dados": dados
        }, f, ensure_ascii=False, indent=2)
    label = f"{uf} " if uf else ""
    print(f"[CACHE] {len(dados)} emendas {label}{ano} salvas em {path}")

def carregar_cache(ano: int, uf: str = "") -> list:
    path = caminho_cache(ano, uf)
    with open(path, 'r', encoding='utf-8') as f:
        conteudo = json.load(f)
    label = f"{conteudo.get('uf', '')} " if conteudo.get('uf') else ""
    print(f"[CACHE] Carregando {conteudo['total']} emendas {label}{ano} "
          f"(coletado em {conteudo['coletado_em'][:10]})")
    return conteudo["dados"]

def status_cache(uf: str = ""):
    garantir_pasta()
    label = f" ({uf})" if uf else ""
    print(f"\n=== STATUS DO CACHE{label} ===")
    ano_atual = datetime.now().year
    for ano in range(2014, ano_atual + 1):
        path = caminho_cache(ano, uf)
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                info = json.load(f)
            # Mesmo TTL escalonado usado em cache_existe()
            if cache_existe(ano, force_refresh=False, uf=uf):
                valido = "[ok] valido"
            else:
                valido = "[!] expirado"
            print(f"  {ano}: {info['total']} emendas | "
                  f"coletado {info['coletado_em'][:10]} | {valido}")
        else:
            print(f"  {ano}: [x] sem cache")
    print("=======================\n")
