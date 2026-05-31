"""
Backfill da coluna `emendas.uf` para emendas legadas onde a UF estava NULL/vazia.

Contexto: ~74% das emendas (47k de 64k) não tinham a coluna `uf` preenchida.
A maior parte (88%) é "destino estadual" — municipio_destino é o nome do estado
seguido de " (UF)". O nome do estado é a fonte da UF.

Padrões cobertos:
  - "AMAZONAS (UF)" → AM
  - "BAHIA (UF)" → BA
  - ... 27 UFs

Idempotente: só atualiza linhas com uf NULL ou vazia. Roda dentro de transação.

Uso:
  python scripts/backfill_uf_emendas.py --dry-run   # só conta, não escreve
  python scripts/backfill_uf_emendas.py             # aplica
"""
import argparse
import os
import sqlite3
import sys
import unicodedata
from datetime import datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")
LOG_DIR = os.path.join(PROJECT_ROOT, "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "backfill_uf.log")

# Nome oficial do estado (UPPER, sem acento) → sigla UF.
NOME_UF = {
    "ACRE": "AC",
    "ALAGOAS": "AL",
    "AMAPA": "AP",
    "AMAZONAS": "AM",
    "BAHIA": "BA",
    "CEARA": "CE",
    "DISTRITO FEDERAL": "DF",
    "ESPIRITO SANTO": "ES",
    "GOIAS": "GO",
    "MARANHAO": "MA",
    "MATO GROSSO": "MT",
    "MATO GROSSO DO SUL": "MS",
    "MINAS GERAIS": "MG",
    "PARA": "PA",
    "PARAIBA": "PB",
    "PARANA": "PR",
    "PERNAMBUCO": "PE",
    "PIAUI": "PI",
    "RIO DE JANEIRO": "RJ",
    "RIO GRANDE DO NORTE": "RN",
    "RIO GRANDE DO SUL": "RS",
    "RONDONIA": "RO",
    "RORAIMA": "RR",
    "SANTA CATARINA": "SC",
    "SAO PAULO": "SP",
    "SERGIPE": "SE",
    "TOCANTINS": "TO",
}


def sem_acento(s: str) -> str:
    nfd = unicodedata.normalize("NFD", s)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def derivar_uf(municipio_destino: str) -> str | None:
    """Tenta extrair a UF do municipio_destino. Retorna None se não bater."""
    if not municipio_destino:
        return None
    s = municipio_destino.strip()
    # Padrão "NOME ESTADO (UF)"
    if s.upper().endswith(" (UF)"):
        nome = s[:-5].strip()
        return NOME_UF.get(sem_acento(nome).upper())
    # Padrão "NOME MUNICÍPIO - XX"
    if len(s) >= 4 and s[-3] == "-" and s[-2:].isalpha():
        sigla = s[-2:].upper()
        if sigla in NOME_UF.values():
            return sigla
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Conta sem escrever")
    args = parser.parse_args()

    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado em {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row

    antes_total = conn.execute("SELECT COUNT(*) FROM emendas").fetchone()[0]
    antes_sem_uf = conn.execute(
        "SELECT COUNT(*) FROM emendas WHERE uf IS NULL OR uf = ''"
    ).fetchone()[0]
    print(f"antes: {antes_total:,} emendas | sem uf: {antes_sem_uf:,} ({100*antes_sem_uf/antes_total:.1f}%)")

    rows = conn.execute(
        "SELECT id, municipio_destino FROM emendas WHERE uf IS NULL OR uf = ''"
    ).fetchall()

    atualizacoes: list[tuple[str, int]] = []  # (uf, id)
    por_uf: dict[str, int] = {}
    for r in rows:
        uf = derivar_uf(r["municipio_destino"] or "")
        if uf:
            atualizacoes.append((uf, r["id"]))
            por_uf[uf] = por_uf.get(uf, 0) + 1

    print(f"\nmatches encontrados: {len(atualizacoes):,}")
    print("distribuição:")
    for uf, n in sorted(por_uf.items(), key=lambda x: -x[1])[:10]:
        print(f"  {uf}: {n:,}")
    cobertura_extra = 100 * len(atualizacoes) / antes_total
    print(f"\ncobertura adicional do mapa: +{cobertura_extra:.1f}% das emendas totais")

    if args.dry_run:
        print("\n--dry-run: nada foi escrito.")
        conn.close()
        return

    if not atualizacoes:
        print("nada a atualizar.")
        conn.close()
        return

    cur = conn.cursor()
    cur.execute("BEGIN")
    try:
        cur.executemany(
            "UPDATE emendas SET uf = ? WHERE id = ? AND (uf IS NULL OR uf = '')",
            atualizacoes,
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise

    depois_sem_uf = conn.execute(
        "SELECT COUNT(*) FROM emendas WHERE uf IS NULL OR uf = ''"
    ).fetchone()[0]
    print(f"\ndepois: sem uf restantes: {depois_sem_uf:,} ({100*depois_sem_uf/antes_total:.1f}%)")

    # Log persistente da mudança
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        ts = datetime.now().isoformat(timespec="seconds")
        f.write(
            f"{ts} | backfill_uf | atualizadas={len(atualizacoes)} "
            f"antes_sem_uf={antes_sem_uf} depois_sem_uf={depois_sem_uf}\n"
        )
        for uf, n in sorted(por_uf.items(), key=lambda x: -x[1]):
            f.write(f"{ts} | backfill_uf |   {uf}: +{n}\n")
    print(f"log: {LOG_FILE}")

    conn.close()


if __name__ == "__main__":
    main()
