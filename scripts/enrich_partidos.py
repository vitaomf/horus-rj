"""Enriquece a coluna `partido` cruzando com a API da Câmara dos Deputados.

Por que: a API do Portal da Transparência não retorna mais `siglaPartidoPolitico`
nas emendas. Sem esse cruzamento, todos os parlamentares ficam com partido NULL.

Estratégia:
1. Pega TODOS os deputados que aparecem na API da Câmara (legislaturas atuais
   e anteriores, todos os UFs — pra cobrir parlamentares já saídos).
2. Normaliza nomes (UPPER + sem acentos).
3. UPDATE politicos.partido onde nome bate.

Idempotente. Roda quantas vezes precisar.
"""
import sqlite3
import unicodedata
import os
import sys
import requests

DB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'transparencia_rj.db')
BASE = 'https://dadosabertos.camara.leg.br/api/v2'


def normalize(s):
    if not s:
        return ''
    nfd = unicodedata.normalize('NFD', str(s))
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn').upper().strip()


def fetch_deputados_legislaturas(legislaturas):
    """Busca deputados em múltiplas legislaturas. Retorna {nome_normalizado: sigla_partido}."""
    out = {}
    for leg in legislaturas:
        print(f'  legislatura {leg}...', end=' ', flush=True)
        page = 1
        count = 0
        while True:
            try:
                r = requests.get(
                    f'{BASE}/deputados',
                    params={'idLegislatura': leg, 'itens': 100, 'pagina': page},
                    timeout=20
                )
                if r.status_code != 200:
                    break
                data = r.json().get('dados', [])
                if not data:
                    break
                for d in data:
                    nome = d.get('nome', '')
                    sigla = d.get('siglaPartido')
                    if nome and sigla:
                        # Adiciona o nome principal e variações comuns
                        out[normalize(nome)] = sigla
                count += len(data)
                page += 1
            except Exception as e:
                print(f'erro: {e}', end=' ')
                break
        print(f'{count} deputados')
    return out


def main():
    print('Buscando deputados em múltiplas legislaturas (cobre 2014→2024)...')
    # Legislaturas: 55=2015-2018, 56=2019-2022, 57=2023-2026
    catalogo = fetch_deputados_legislaturas([55, 56, 57])
    print(f'\nCatálogo total: {len(catalogo)} deputados únicos por nome normalizado')

    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute('SELECT id, nome, partido FROM politicos')
    politicos = cur.fetchall()

    matched = 0
    not_matched = []
    for pid, nome, partido_atual in politicos:
        sigla = catalogo.get(normalize(nome))
        if sigla and sigla != partido_atual:
            cur.execute('UPDATE politicos SET partido = ? WHERE id = ?', (sigla, pid))
            matched += 1
        elif not sigla:
            not_matched.append(nome)

    conn.commit()
    print(f'\n=== Resultado ===')
    print(f'  Atualizados: {matched}')
    print(f'  Sem match: {len(not_matched)}')
    if not_matched:
        print(f'  Primeiros 15 sem match:')
        for n in not_matched[:15]:
            print(f'    - {n}')
    conn.close()


if __name__ == '__main__':
    main()
