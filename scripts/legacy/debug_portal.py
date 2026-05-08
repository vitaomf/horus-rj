import requests, json, os
from dotenv import load_dotenv

load_dotenv()
chave = os.getenv('CHAVE_API_PORTAL')
url = 'https://api.portaldatransparencia.gov.br/api-de-dados/emendas'
headers = {'chave-api-dados': chave}

try:
    r = requests.get(url, params={'anoEmenda': 2024, 'pagina': 1}, headers=headers, timeout=10)
    dados = r.json()
    print('Exemplo 1:')
    print(json.dumps(dados[0], indent=2))
except Exception as e:
    print("Erro:", e)
