"""
Varredor nacional de instâncias SAPL (Interlegis).

Muitas câmaras municipais e assembleias usam o SAPL do Senado/Interlegis, todas
com a MESMA API REST em https://sapl.<slug>.<uf>.leg.br/api/. Não existe lista
mestra pública, então varremos:
  - os 5.570 municípios (municipios_ibge) → sapl.<slug>.<uf>.leg.br
  - as 27 assembleias                      → sapl.al.<uf>.leg.br

Grava o registro em backend/sapl_casas.json (allowlist anti-SSRF do adapter):
  "<slug>-<uf>": {nome, uf, codigo_ibge, sapl_host, tipo}

Idempotente: reescreve o JSON inteiro. Read-only na web (só GET /api/).

Rodar:
    python scripts/varre_sapl.py                 # nacional
    python scripts/varre_sapl.py --uf RJ         # só uma UF
    python scripts/varre_sapl.py --uf RJ,SP,MG   # algumas
"""
import json
import os
import re
import sqlite3
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor

import requests

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")
OUT_PATH = os.path.join(PROJECT_ROOT, "backend", "sapl_casas.json")

UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
       'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
       'SP', 'SE', 'TO']
# Código IBGE da UF (2 primeiros dígitos do código do município)
UF_COD = {'RO': 11, 'AC': 12, 'AM': 13, 'RR': 14, 'PA': 15, 'AP': 16, 'TO': 17,
          'MA': 21, 'PI': 22, 'CE': 23, 'RN': 24, 'PB': 25, 'PE': 26, 'AL': 27,
          'SE': 28, 'BA': 29, 'MG': 31, 'ES': 32, 'RJ': 33, 'SP': 35, 'PR': 41,
          'SC': 42, 'RS': 43, 'MS': 50, 'MT': 51, 'GO': 52, 'DF': 53}


def slug(nome: str) -> str:
    s = unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', s.lower())


def _sess():
    s = requests.Session()
    s.headers.update({'User-Agent': 'HorusRJ/1.0 (transparencia)', 'Accept': 'application/json'})
    return s


def probe(item):
    """item: (host, nome, uf, codigo_ibge, tipo). Retorna dict se SAPL ativo."""
    host, nome, uf, cod, tipo = item
    url = f"https://{host}/api/"
    try:
        r = requests.get(url, timeout=7, headers={'User-Agent': 'HorusRJ/1.0', 'Accept': 'application/json'})
        if r.status_code == 200 and 'json' in r.headers.get('content-type', ''):
            return {"slug_uf": f"{slug(nome)}-{uf.lower()}" if tipo == 'municipal' else f"al-{uf.lower()}",
                    "nome": nome, "uf": uf, "codigo_ibge": cod, "sapl_host": host, "tipo": tipo}
    except Exception:
        pass
    return None


def main():
    ufs = UFS
    if len(sys.argv) > 2 and sys.argv[1] == '--uf':
        ufs = [u.strip().upper() for u in sys.argv[2].split(',')]

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    alvos = []
    for uf in ufs:
        cod0 = UF_COD[uf] * 100000
        cod1 = cod0 + 99999
        muns = conn.execute(
            "SELECT codigo_ibge, nome FROM municipios_ibge WHERE codigo_ibge BETWEEN ? AND ?",
            (cod0, cod1)
        ).fetchall()
        for m in muns:
            alvos.append((f"sapl.{slug(m['nome'])}.{uf.lower()}.leg.br", m['nome'], uf, m['codigo_ibge'], 'municipal'))
        # assembleia legislativa da UF
        alvos.append((f"sapl.al.{uf.lower()}.leg.br", f"Assembleia Legislativa - {uf}", uf, UF_COD[uf], 'estadual'))
    conn.close()

    print(f"varrendo {len(alvos)} alvos em {len(ufs)} UF(s)...", flush=True)
    achados = []
    with ThreadPoolExecutor(max_workers=32) as ex:
        for i, res in enumerate(ex.map(probe, alvos), 1):
            if res:
                achados.append(res)
            if i % 500 == 0:
                print(f"  {i}/{len(alvos)} ... {len(achados)} SAPL ativos", flush=True)

    registro = {}
    for a in sorted(achados, key=lambda x: (x['uf'], x['nome'])):
        registro[a.pop('slug_uf')] = a

    # Se for varredura parcial (--uf), preserva o que já havia das outras UFs.
    if len(sys.argv) > 2 and sys.argv[1] == '--uf' and os.path.exists(OUT_PATH):
        try:
            antigo = json.load(open(OUT_PATH, encoding='utf-8'))
            varridas = {u.lower() for u in ufs}
            for k, v in antigo.items():
                if v.get('uf', '').lower() not in varridas:
                    registro[k] = v
        except Exception:
            pass

    json.dump(dict(sorted(registro.items())), open(OUT_PATH, 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    print(f"\ngravado {OUT_PATH} com {len(registro)} casas SAPL", flush=True)
    por_uf = {}
    for v in registro.values():
        por_uf[v['uf']] = por_uf.get(v['uf'], 0) + 1
    print("por UF:", dict(sorted(por_uf.items())), flush=True)


if __name__ == '__main__':
    main()
