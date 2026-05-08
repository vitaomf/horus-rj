import requests

BASE_URL = "https://divulgacandcontas.tse.jus.br/divulga/rest/v1"

def discover_elections(ano):
    url = f"{BASE_URL}/eleicao/listar/{ano}"
    try:
        res = requests.get(url)
        if res.status_code == 200:
            print(f"Eleições em {ano}:")
            for ele in res.json().get('eleicoes', []):
                print(f"ID: {ele.get('id')} - Nome: {ele.get('nome')}")
        else:
            print(f"Erro: {res.status_code}")
    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    discover_elections(2022)
    discover_elections(2024)
