import requests
import os
from dotenv import load_dotenv

load_dotenv()
chave_api = os.getenv("CHAVE_API_PORTAL")

url = "https://api.portaldatransparencia.gov.br/api-de-dados/contratos"
headers = {"chave-api-dados": chave_api, "Accept": "application/json"}
params = {
    "dataInicial": "01/01/2024",
    "dataFinal": "31/12/2024",
    "codigoOrgao": "26000",
    "pagina": 1
}

res = requests.get(url, headers=headers, params=params)
print(f"Status: {res.status_code}")
if res.status_code == 200:
    print(f"Items: {len(res.json())}")
    if (len(res.json()) > 0):
        print(res.json()[0])
else:
    print(res.text)
