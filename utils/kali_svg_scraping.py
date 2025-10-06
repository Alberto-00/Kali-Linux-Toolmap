import os
import re
import time
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE = "https://www.kali.org"
START = "https://www.kali.org/tools/"
OUT_LINKS = "../data/kali_tool_links.txt"
OUT_DIR = "../app/icons"

HEADERS = {
    "User-Agent": "kali-svg-scraper/2.0 (+https://example.org)"
}
REQUEST_DELAY = 0.5  # secondi tra richieste

TOOLS_PATH_RE = re.compile(r'^/tools/[^/]+/?$')

def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)

def fetch(url: str, session: requests.Session, timeout: int = 20) -> str | None:
    try:
        r = session.get(url, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"[ERROR] fetch {url}: {e}")
        return None

def canonical_tool_url(raw_href: str, base_url: str) -> str | None:
    try:
        full = urljoin(base_url, raw_href.strip())
        p = urlparse(full)
        if not p.netloc or "kali.org" not in p.netloc:
            return None

        # rimuovi query e fragment
        path = p.path

        # match esattamente /tools/<slug>/
        if not TOOLS_PATH_RE.match(path):
            return None

        parts = [x for x in path.split("/") if x]
        # parts = ["tools", "<slug>"]
        if len(parts) != 2:
            return None
        slug = parts[1]
        if slug in {"all-tools"}:
            return None

        return f"{BASE}/tools/{slug}/"
    except Exception:
        return None

def extract_tool_links(html: str, base_url: str) -> set[str]:
    soup = BeautifulSoup(html, "html.parser")
    found: set[str] = set()

    for a in soup.find_all("a", href=True):
        url = canonical_tool_url(a["href"], base_url)
        if url:
            found.add(url)
    return found

def find_svgs_for_tool(html: str, tool_url: str) -> set[str]:
    """
    Cerca SVG del logo del tool dentro la pagina del tool.
    Regole:
      - <img src> che termina con .svg
      - preferenza a quelli nel sotto-percorso '/tools/<slug>/images/'
    """
    soup = BeautifulSoup(html, "html.parser")
    svgs: set[str] = set()

    # ricava slug dal tool_url
    slug = urlparse(tool_url).path.strip("/").split("/")[-1]

    for img in soup.find_all("img", src=True):
        src = img["src"].strip()
        if not src.lower().endswith(".svg"):
            continue
        full = urljoin(tool_url, src)
        # priorità: immagini nel percorso del tool
        if f"/tools/{slug}/images/" in urlparse(full).path:
            svgs.add(full)

    # fallback: qualunque svg nella pagina (se nessuno nel percorso specifico)
    if not svgs:
        for img in soup.find_all("img", src=True):
            src = img["src"].strip()
            if src.lower().endswith(".svg"):
                svgs.add(urljoin(tool_url, src))

    return svgs

def save_text_lines(filename: str, lines: list[str]) -> None:
    with open(filename, "w", encoding="utf-8") as f:
        for l in lines:
            f.write(l + "\n")
    print(f"[INFO] Salvati {len(lines)} link in {filename}")

def download(url: str, out_path: str, session: requests.Session) -> bool:
    try:
        with session.get(url, stream=True, headers=HEADERS, timeout=30) as r:
            r.raise_for_status()
            with open(out_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
        return True
    except Exception as e:
        print(f"[ERROR] download {url}: {e}")
        return False

def main():
    ensure_dir(OUT_DIR)
    session = requests.Session()

    print(f"[INFO] Fetch start: {START}")
    start_html = fetch(START, session)
    if start_html is None:
        print("[FATAL] Impossibile accedere a /tools/.")
        return

    tool_links = extract_tool_links(start_html, START)

    # Se presente, segui "List all tools" per ampliare la lista
    soup = BeautifulSoup(start_html, "html.parser")
    all_tools_link = None
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if "/tools/all-tools/" in href:
            all_tools_link = urljoin(START, href)
            break

    if all_tools_link:
        print(f"[INFO] Trovato 'All tools': {all_tools_link}")
        all_html = fetch(all_tools_link, session)
        if all_html:
            more = extract_tool_links(all_html, all_tools_link)
            print(f"[INFO] Link tool aggiuntivi trovati su /all-tools/: {len(more)}")
            tool_links |= more
        else:
            print("[WARN] Non riesco a scaricare /all-tools/")

    tool_links = sorted(tool_links)
    save_text_lines(OUT_LINKS, tool_links)

    # visita ogni tool e scarica svg
    total_svgs = 0
    for i, link in enumerate(tool_links, 1):
        print(f"[{i}/{len(tool_links)}] {link}")
        html = fetch(link, session)
        if html is None:
            print("   -> skip (errore pagina)")
            time.sleep(REQUEST_DELAY)
            continue

        svgs = find_svgs_for_tool(html, link)
        if not svgs:
            print("   -> nessun SVG trovato")
            time.sleep(REQUEST_DELAY)
            continue

        for svg_url in sorted(svgs):
            filename = os.path.basename(urlparse(svg_url).path) or "logo.svg"
            out_path = os.path.join(OUT_DIR, filename)
            if os.path.exists(out_path):
                print(f"   - {filename} esiste, salto")
                continue
            print(f"   - scarico {filename}")
            ok = download(svg_url, out_path, session)
            if ok:
                total_svgs += 1
            else:
                # pulizia file parziale
                try:
                    if os.path.exists(out_path):
                        os.remove(out_path)
                except Exception:
                    pass
            time.sleep(REQUEST_DELAY)

        time.sleep(REQUEST_DELAY)

    print(f"[DONE] Finito. SVG scaricati: {total_svgs}. Link tool: {len(tool_links)}")

if __name__ == "__main__":
    main()
