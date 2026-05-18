import requests
import json
import os
api_key = os.getenv("PORTAL_API_KEY", "")
res = requests.get("https://transparencia.gov.br/api-de-dados/emendas", params={"codigoEmenda": "201826760002"}, headers={"chave-api-dados": api_key})
print(json.dumps(res.json(), indent=2))
