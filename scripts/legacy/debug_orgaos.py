import requests
import os
from dotenv import load_dotenv

load_dotenv()
chave_api = os.getenv("CHAVE_API_PORTAL")

url = "https://api.portaldatransparencia.gov.br/api-de-dados/orgaos-siafi"
headers = {"chave-api-dados": chave_api, "Accept": "application/json"}
res = requests.get(url, headers=headers, params={"pagina": 1})
print(f"Status: {res.status_code}")
if res.status_code == 200:
    dados = res.json()
    print(f"Items: {len(dados)}")
    if (len(dados) > 0):
        print(dados[0])
else:
    print(res.text)
