import requests
import os
from dotenv import load_dotenv

load_dotenv()
CHAVE = os.getenv("CHAVE_API_PORTAL")

if not CHAVE:
    print("[ERRO] CHAVE_API_PORTAL não encontrada no .env")
    exit(1)

print(f"Chave API encontrada: {CHAVE[:8]}...")

for ano in [2025, 2026]:
    url = "https://api.portaldatransparencia.gov.br/api-de-dados/emendas"
    params = {
        "anoEmenda": ano,
        "pagina": 1
    }
    headers = {
        "chave-api-dados": CHAVE,
        "Accept": "application/json"
    }
    try:
        r = requests.get(url, params=params, headers=headers, timeout=15)
        r.raise_for_status()
        dados = r.json()
        total = len(dados) if isinstance(dados, list) else 0
        print(f"\nAno {ano}: {total} emendas encontradas na pagina 1")
        if total > 0:
            exemplo = dados[0]
            autor = exemplo.get('autor', 'Desconhecido')
            local = exemplo.get('localidadeDoGasto', '?')
            valor = exemplo.get('valorEmenda', '?')
            print(f"  Exemplo: {autor} -> {local} | Valor: {valor}")
        else:
            print(f"  Nenhuma emenda encontrada para {ano}.")
    except requests.exceptions.RequestException as e:
        print(f"\nAno {ano}: ERRO na requisicao - {e}")
    except Exception as e:
        print(f"\nAno {ano}: ERRO inesperado - {e}")
