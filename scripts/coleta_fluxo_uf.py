"""
Coleta o FLUXO de dinheiro por UF: quanto SAI (arrecadação federal) e quanto
VOLTA (transferências da União), pra mostrar o saldo de cada estado com a União.

Fontes oficiais (nível estadual — município não tem 'sai' publicado):
  SAI   = Receita Federal, "Arrecadação por UF" (.ods mensal) → linha TOTAL GERAL,
          somada nos 12 meses do ano. Concentra em sedes de empresas (caveat).
  VOLTA = SICONFI/Tesouro (DCA Anexo I-C), conta RO1.7.1.0.00.0.0
          "Transferências da União e de suas Entidades", coluna Receitas Brutas
          Realizadas, por ente estadual.

Grava em fluxo_uf(uf, ano, sai, volta, meses_sai, fonte). Idempotente (REPLACE).

Rodar:
    python scripts/coleta_fluxo_uf.py            # ano completo mais recente
    python scripts/coleta_fluxo_uf.py --ano 2023
"""
import io
import os
import re
import sqlite3
import sys
import time
import zipfile
import xml.etree.ElementTree as ET

import requests

try:
    sys.stdout.reconfigure(encoding="utf-8")  # console cp1252 não engole acentos/setas
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "transparencia_rj.db")
RFB_INDEX = ("https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/"
             "receitadata/arrecadacao/arrecadacao-por-estado")
SICONFI = "http://apidatalake.tesouro.gov.br/ords/siconfi/tt/dca"

UF_COD = {'RO': 11, 'AC': 12, 'AM': 13, 'RR': 14, 'PA': 15, 'AP': 16, 'TO': 17,
          'MA': 21, 'PI': 22, 'CE': 23, 'RN': 24, 'PB': 25, 'PE': 26, 'AL': 27,
          'SE': 28, 'BA': 29, 'MG': 31, 'ES': 32, 'RJ': 33, 'SP': 35, 'PR': 41,
          'SC': 42, 'RS': 43, 'MS': 50, 'MT': 51, 'GO': 52, 'DF': 53}
UFS = set(UF_COD)
T = '{urn:oasis:names:tc:opendocument:xmlns:table:1.0}'
P = '{urn:oasis:names:tc:opendocument:xmlns:text:1.0}'
MESES = {'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'março': 3, 'abril': 4, 'maio': 5,
         'junho': 6, 'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10,
         'novembro': 11, 'dezembro': 12}


def sess():
    s = requests.Session()
    s.headers.update({'User-Agent': 'Mozilla/5.0 HorusRJ', 'Accept': '*/*'})
    return s


def _num(br: str):
    br = (br or '').strip()
    if not br:
        return None
    try:
        return float(br.replace('.', '').replace(',', '.'))
    except ValueError:
        return None


def _get_text(s, url, tent=3):
    """GET resiliente (gov.br é lento/instável)."""
    for i in range(tent):
        try:
            r = s.get(url, timeout=90)
            if r.ok:
                return r.text
        except Exception:
            pass
        time.sleep(3)
    return ""


def listar_ods(s):
    """Crawl no índice + subpáginas → [(url, ano, mes)]. Robusto a timeouts."""
    subs = set()
    # Subpáginas-semente conhecidas (o índice às vezes nem carrega).
    for slug in ('', '/copy_of_arrecadacao-uf-2021', '/arrecadacao-uf-2022',
                 '/arrecadacao-uf-2023', '/arrecadacao-uf-2024', '/arrecadacao-uf-2025'):
        subs.add(RFB_INDEX + slug)
    idx = _get_text(s, RFB_INDEX)
    for u in re.findall(r'href="([^"]*arrecadacao-(?:uf|por-estado)[^"]*)"', idx, re.I):
        if 'internet' in u:
            continue
        subs.add(u if u.startswith('http') else 'https://www.gov.br' + u)
    achados = []
    for sub in subs:
        html = _get_text(s, sub)
        if not html:
            continue
        for f in re.findall(r'(https?://[^"]+?\.ods|/[^"]+?\.ods)', html, re.I):
            url = f if f.startswith('http') else 'https:' + f if f.startswith('//') else 'https://www.gov.br' + f
            m = re.search(r'internet-([a-zç]+)-(\d{4})', url, re.I)
            if m and m.group(1).lower() in MESES:
                achados.append((url, int(m.group(2)), MESES[m.group(1).lower()]))
    # dedup
    return sorted(set(achados), key=lambda x: (x[1], x[2]))


def baixar_ods(s, url):
    for _ in range(4):
        try:
            r = s.get(url, timeout=60)
            if r.ok and r.content[:2] == b'PK':
                return r.content
        except Exception:
            pass
        time.sleep(2)
    return None


def parse_total_geral(content):
    """{uf: valor TOTAL GERAL} de um .ods mensal."""
    rows = []
    for tr in ET.fromstring(zipfile.ZipFile(io.BytesIO(content)).read('content.xml')).iter(T + 'table-row'):
        cells = []
        for tc in tr.findall(T + 'table-cell'):
            txt = ''.join(p.text or '' for p in tc.iter(P + 'p'))
            rep = int(tc.get(T + 'number-columns-repeated', '1'))
            cells.extend([txt] * min(rep, 40))
        rows.append(cells)
    hdr = next((r for r in rows if 'RJ' in r and 'SP' in r), None)
    tot = next((r for r in rows if r and 'TOTAL GERAL' in (r[0] or '').upper()), None)
    if not hdr or not tot:
        return {}
    col = {hdr[i]: i for i in range(len(hdr)) if hdr[i] in UFS}
    out = {}
    for uf, i in col.items():
        if i < len(tot):
            v = _num(tot[i])
            if v is not None:
                out[uf] = v
    return out


def coletar_sai(s, ano):
    """Soma TOTAL GERAL por UF nos meses disponíveis do ano. (sai_uf, n_meses)."""
    arquivos = [(u, m) for (u, a, m) in listar_ods(s) if a == ano]
    sai = {uf: 0.0 for uf in UFS}
    meses = set()
    for url, mes in arquivos:
        c = baixar_ods(s, url)
        if not c:
            print(f"  [skip] {mes:02d}/{ano} download falhou")
            continue
        d = parse_total_geral(c)
        if not d:
            print(f"  [skip] {mes:02d}/{ano} parse vazio")
            continue
        for uf, v in d.items():
            sai[uf] += v
        meses.add(mes)
        print(f"  [ok] SAI {mes:02d}/{ano}: {len(d)} UFs")
        time.sleep(0.3)
    return sai, len(meses)


def coletar_volta(s, ano):
    """Transferências da União (DCA RO1.7.1.0.00.0.0, realizadas) por UF."""
    volta = {}
    for uf, cod in UF_COD.items():
        try:
            j = s.get(f"{SICONFI}?an_exercicio={ano}&no_anexo={requests.utils.quote('DCA-Anexo I-C')}&id_ente={cod}",
                      timeout=60, headers={'Accept': 'application/json'}).json()
        except Exception as e:
            print(f"  [skip] VOLTA {uf}: {type(e).__name__}")
            continue
        v = sum(it.get('valor') or 0 for it in j.get('items', [])
                if it.get('cod_conta') == 'RO1.7.1.0.00.0.0' and it.get('coluna') == 'Receitas Brutas Realizadas')
        if v:
            volta[uf] = float(v)
            print(f"  [ok] VOLTA {uf}: {v/1e9:.2f} bi")
        time.sleep(0.2)
    return volta


def main():
    ano = None
    if len(sys.argv) > 2 and sys.argv[1] == '--ano':
        ano = int(sys.argv[2])
    s = sess()

    if ano is None:
        anos = sorted({a for (_, a, _) in listar_ods(s)})
        ano = anos[-2] if len(anos) >= 2 else (anos[-1] if anos else 2023)  # penúltimo = ano fechado
    print(f"== Fluxo UF -- ano {ano} ==")

    conn = sqlite3.connect(DB)
    conn.execute("""CREATE TABLE IF NOT EXISTS fluxo_uf (
        uf TEXT NOT NULL, ano INTEGER NOT NULL,
        sai REAL, volta REAL, meses_sai INTEGER, fonte TEXT,
        coletado_em TEXT DEFAULT (datetime('now','localtime')),
        UNIQUE(uf, ano))""")
    conn.commit()
    FONTE = "RFB Arrecadacao por UF + SICONFI/Tesouro DCA"

    # VOLTA primeiro: SICONFI é rápido e confiável; grava já (saída pode falhar).
    print("VOLTA (SICONFI transferencias da Uniao):")
    volta = coletar_volta(s, ano)
    for uf, vv in volta.items():
        conn.execute("INSERT INTO fluxo_uf (uf, ano, volta, meses_sai, fonte) VALUES (?,?,?,0,?) "
                     "ON CONFLICT(uf, ano) DO UPDATE SET volta=excluded.volta, fonte=excluded.fonte",
                     (uf, ano, vv, FONTE))
    conn.commit()
    print(f"  VOLTA gravado: {len(volta)} UFs")

    # SAI best-effort (Receita gov.br é instável): atualiza quando vier.
    print("SAI (Receita Federal por UF -- best-effort):")
    sai, n_meses = coletar_sai(s, ano)
    print(f"  {n_meses} meses somados")
    if n_meses:
        for uf, sv in sai.items():
            conn.execute("INSERT INTO fluxo_uf (uf, ano, sai, meses_sai, fonte) VALUES (?,?,?,?,?) "
                         "ON CONFLICT(uf, ano) DO UPDATE SET sai=excluded.sai, meses_sai=excluded.meses_sai",
                         (uf, ano, sv, n_meses, FONTE))
        conn.commit()
    n = conn.execute("SELECT COUNT(*) FROM fluxo_uf WHERE ano=?", (ano,)).fetchone()[0]
    print(f"\ngravado fluxo_uf: {n} UFs (ano {ano}, {n_meses} meses de SAI)")
    print("amostra:")
    for r in conn.execute("SELECT uf, sai, volta FROM fluxo_uf WHERE ano=? AND uf IN ('RJ','SP','MG','PI','MA') ORDER BY uf", (ano,)):
        sai_b = (r[1] or 0) / 1e9; vol_b = (r[2] or 0) / 1e9
        print(f"  {r[0]}: sai R$ {sai_b:.1f} bi · volta R$ {vol_b:.1f} bi · saldo R$ {vol_b - sai_b:+.1f} bi")
    conn.close()


if __name__ == '__main__':
    main()
