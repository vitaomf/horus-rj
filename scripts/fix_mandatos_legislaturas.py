"""
Repara mandatos_json gravado com a tabela de legislaturas deslocada (+4 anos).

Bug: enriquecer_politicos.py mapeava 56ª->2023-2027 e 57ª->2027-2031 (real:
56ª=2019-2023, 57ª=2023-2027). Resultado: trajetória exibia mandato fantasma
no futuro ("2027 · Mandato 2027-2031") em todos os deputados enriquecidos.

Como mandatos_json preserva idLegislatura, o reparo é in-place: re-deriva
anoInicio/anoFim da tabela correta. Idempotente (re-rodar não muda nada).

Rodar:
    python scripts/fix_mandatos_legislaturas.py
"""
import json
import os
import sqlite3
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(PROJECT_ROOT, "transparencia_rj.db")

# Tabela correta — igual a backend/api.py e enriquecer_politicos.py (corrigido)
LEGISLATURAS = {
    50: (1995, 1999), 51: (1999, 2003), 52: (2003, 2007),
    53: (2007, 2011), 54: (2011, 2015), 55: (2015, 2019),
    56: (2019, 2023), 57: (2023, 2027), 58: (2027, 2031),
}


def main():
    if not os.path.exists(DB_PATH):
        print(f"DB não encontrado em {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.row_factory = sqlite3.Row

    rows = conn.execute(
        "SELECT id, mandatos_json FROM politicos "
        "WHERE mandatos_json IS NOT NULL AND mandatos_json != ''"
    ).fetchall()

    total = corrigidos = intactos = invalidos = 0
    for r in rows:
        total += 1
        try:
            mandatos = json.loads(r["mandatos_json"])
        except (json.JSONDecodeError, TypeError):
            invalidos += 1
            continue
        if not isinstance(mandatos, list):
            invalidos += 1
            continue

        mudou = False
        for m in mandatos:
            leg = m.get("idLegislatura")
            anos = LEGISLATURAS.get(leg)
            if not anos:
                continue
            if m.get("anoInicio") != anos[0] or m.get("anoFim") != anos[1]:
                m["anoInicio"], m["anoFim"] = anos
                mudou = True

        if mudou:
            conn.execute(
                "UPDATE politicos SET mandatos_json = ? WHERE id = ?",
                (json.dumps(mandatos, ensure_ascii=False), r["id"]),
            )
            corrigidos += 1
        else:
            intactos += 1

    conn.commit()
    print(f"politicos com mandatos_json: {total}")
    print(f"  corrigidos: {corrigidos}")
    print(f"  ja corretos: {intactos}")
    print(f"  json invalido (pulados): {invalidos}")

    # Spot-check: 372 (Gilson Marques) não pode mais ter mandato 2027-2031
    row = conn.execute("SELECT mandatos_json FROM politicos WHERE id=372").fetchone()
    if row and row["mandatos_json"]:
        mj = json.loads(row["mandatos_json"])
        rotulos = [f"{m.get('idLegislatura')}:{m.get('anoInicio')}-{m.get('anoFim')}" for m in mj]
        fantasma = any(m.get("anoInicio") == 2027 for m in mj)
        print(f"  spot 372: {rotulos} | fantasma 2027? {'SIM (FALHOU)' if fantasma else 'nao'}")

    conn.close()


if __name__ == "__main__":
    main()
