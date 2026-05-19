"""
download_fotos_governadores.py
Baixa as fotos dos 27 governadores do Wikipedia REST API e salva localmente
em frontend/public/img/governadores/{uf}.jpg.

Por que: URLs externas do Wikimedia mudam, dão 429, e o padrão /thumb/.../Npx-
não funciona com todos os tamanhos. Hospedar local é bulletproof.

Uso:
    python scripts/download_fotos_governadores.py            # baixa o que falta
    python scripts/download_fotos_governadores.py --force    # re-baixa todos
"""
import os, sys, json, time, urllib.request

# UF → título da página Wikipedia (em pt) do governador atual
GOVERNADORES = {
    'AC': 'Gladson Cameli',
    'AL': 'Paulo Dantas',
    'AP': 'Clécio Luís',
    'AM': 'Wilson Lima',
    'BA': 'Jerônimo Rodrigues',
    'CE': 'Elmano de Freitas',
    'DF': 'Ibaneis Rocha',
    'ES': 'Renato Casagrande',
    'GO': 'Ronaldo Caiado',
    'MA': 'Carlos Brandão (político)',
    'MT': 'Mauro Mendes',
    'MS': 'Eduardo Riedel',
    'MG': 'Romeu Zema',
    'PA': 'Helder Barbalho',
    'PB': 'João Azevêdo',
    'PR': 'Ratinho Junior',
    'PE': 'Raquel Lyra',
    'PI': 'Rafael Fonteles',
    'RJ': 'Cláudio Castro',
    'RN': 'Fátima Bezerra',
    'RS': 'Eduardo Leite',
    'RO': 'Marcos Rocha (político)',
    'RR': 'Arthur Henrique',
    'SC': 'Jorginho Mello',
    'SP': 'Tarcísio de Freitas',
    'SE': 'Fábio Mitidieri',
    'TO': 'Wanderlei Barbosa',
}

OUT_DIR  = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend", "public", "img", "governadores"
)
HEADERS  = {"User-Agent": "Horus/1.0 (transparência pública)"}


def _request_com_retry(url: str, max_retry: int = 5) -> bytes | None:
    """Faz request com retry/backoff exponencial em 429."""
    import urllib.error
    for tentativa in range(max_retry):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                espera = (2 ** tentativa) * 10  # 10, 20, 40, 80, 160s
                print(f"    429 — aguardando {espera}s (tentativa {tentativa + 1}/{max_retry})")
                time.sleep(espera)
                continue
            elif e.code == 404:
                print(f"    404 — arquivo não existe")
                return None
            else:
                print(f"    HTTP {e.code}: {e.reason}")
                return None
        except Exception as e:
            print(f"    erro: {type(e).__name__}: {str(e)[:60]}")
            return None
    print(f"    falhou após {max_retry} retries")
    return None


def fetch_summary_image_url(titulo: str) -> str | None:
    """Usa Wikipedia REST API para obter URL da imagem principal."""
    titulo_url = urllib.parse.quote(titulo.replace(' ', '_'))
    api = f"https://pt.wikipedia.org/api/rest_v1/page/summary/{titulo_url}"
    dados = _request_com_retry(api)
    if not dados:
        return None
    try:
        d = json.loads(dados)
        img = d.get('originalimage') or d.get('thumbnail')
        return img.get('source') if img else None
    except Exception:
        return None


def baixar_imagem(url: str, destino: str) -> tuple[bool, int]:
    """Baixa imagem para arquivo. Retorna (sucesso, tamanho_kb)."""
    dados = _request_com_retry(url)
    if not dados:
        return False, 0
    with open(destino, "wb") as f:
        f.write(dados)
    return True, round(len(dados) / 1024)


def main():
    force = "--force" in sys.argv
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"Pasta destino: {OUT_DIR}")
    print(f"Forcar re-download: {force}\n")

    import urllib.parse  # garante import dentro do main
    globals()['urllib'].parse = urllib.parse

    ok, falhas, pulados = 0, [], 0
    for i, (uf, titulo) in enumerate(sorted(GOVERNADORES.items()), 1):
        dest = os.path.join(OUT_DIR, f"{uf.lower()}.jpg")
        if not force and os.path.exists(dest) and os.path.getsize(dest) > 5000:
            print(f"  [{i:2d}/27] {uf}  ja existe, pulando")
            pulados += 1
            ok += 1
            continue

        print(f"  [{i:2d}/27] {uf}  '{titulo}'")
        img_url = fetch_summary_image_url(titulo)
        if not img_url:
            print(f"           Imagem nao encontrada na Wikipedia")
            falhas.append(uf)
            continue

        sucesso, kb = baixar_imagem(img_url, dest)
        if sucesso:
            print(f"           {kb} KB  OK  ({img_url[:80]}...)")
            ok += 1
        else:
            falhas.append(uf)
        time.sleep(8.0)  # gentil com Wikipedia (rate limit aggressive)

    print(f"\nResumo: {ok}/27 OK | {pulados} ja existiam | {len(falhas)} falharam")
    if falhas:
        print(f"Falhas: {', '.join(falhas)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
