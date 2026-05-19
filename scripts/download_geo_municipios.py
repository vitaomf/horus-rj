"""
download_geo_municipios.py
Baixa GeoJSONs de municípios dos 27 estados brasileiros do repositório tbrugz/geodata-br
(dados oficiais IBGE) e salva em frontend/public/geo/mun/{uf}.json.

Idempotente: arquivos existentes são pulados (pass --force para forçar re-download).
Uso:
    python scripts/download_geo_municipios.py            # baixa o que falta
    python scripts/download_geo_municipios.py --force    # re-baixa tudo
"""
import os
import sys
import time
import json
import urllib.request

# UF → código IBGE (necessário para a URL)
UF_CODIGO = {
    'AC': 12, 'AL': 27, 'AP': 16, 'AM': 13, 'BA': 29, 'CE': 23,
    'DF': 53, 'ES': 32, 'GO': 52, 'MA': 21, 'MT': 51, 'MS': 50,
    'MG': 31, 'PA': 15, 'PB': 25, 'PR': 41, 'PE': 26, 'PI': 22,
    'RJ': 33, 'RN': 24, 'RS': 43, 'RO': 11, 'RR': 14, 'SC': 42,
    'SP': 35, 'SE': 28, 'TO': 17,
}

BASE_URL = "https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-{codigo}-mun.json"
OUT_DIR  = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend", "public", "geo", "mun"
)
HEADERS  = {"User-Agent": "Mozilla/5.0 Horus-GeoDownload"}


def baixar_uf(uf: str, codigo: int, force: bool = False) -> tuple[bool, int]:
    """Baixa o GeoJSON de uma UF. Retorna (sucesso, tamanho_em_kb)."""
    dest = os.path.join(OUT_DIR, f"{uf.lower()}.json")
    if not force and os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return True, round(os.path.getsize(dest) / 1024)

    url = BASE_URL.format(codigo=codigo)
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        # valida JSON
        json.loads(data)
        with open(dest, "wb") as f:
            f.write(data)
        return True, round(len(data) / 1024)
    except Exception as e:
        print(f"  ERRO {uf}: {e}")
        return False, 0


def main():
    force = "--force" in sys.argv

    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"Pasta destino: {OUT_DIR}")
    print(f"Forcar re-download: {force}\n")

    total_ok = 0
    total_kb = 0
    falhas   = []

    for i, (uf, codigo) in enumerate(sorted(UF_CODIGO.items()), 1):
        sucesso, kb = baixar_uf(uf, codigo, force)
        if sucesso:
            total_ok += 1
            total_kb += kb
            print(f"  [{i:2d}/27] {uf}  {kb:>5} KB  OK")
        else:
            falhas.append(uf)
            print(f"  [{i:2d}/27] {uf}  FALHOU")
        time.sleep(0.2)  # gentil com o github

    print(f"\nResumo: {total_ok}/27 estados | {total_kb / 1024:.1f} MB total")
    if falhas:
        print(f"Falhas: {', '.join(falhas)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
