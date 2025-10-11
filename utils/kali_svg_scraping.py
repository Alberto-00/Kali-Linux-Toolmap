import os
import re
import time
import json
from urllib.parse import urljoin, urlparse
from typing import Optional

import requests
from bs4 import BeautifulSoup

BASE = "https://www.kali.org"
START = "https://www.kali.org/tools/"
OUT_JSON = "../data/kali_tools.json"
OUT_DIR = "../app/icons"

HEADERS = {
    "User-Agent": "kali-svg-scraper/2.0 (+https://example.org)"
}
REQUEST_DELAY = 0.5  # secondi tra richieste

TOOLS_PATH_RE = re.compile(r'^/tools/[^/]+/?$')


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def fetch(url: str, session: requests.Session, timeout: int = 20) -> Optional[str]:
    try:
        r = session.get(url, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
        return r.text
    except Exception as e:
        print(f"[ERROR] fetch {url}: {e}")
        return None


def canonical_tool_url(raw_href: str, base_url: str) -> Optional[str]:
    try:
        full = urljoin(base_url, raw_href.strip())
        p = urlparse(full)
        if not p.netloc or "kali.org" not in p.netloc:
            return None

        path = p.path

        if not TOOLS_PATH_RE.match(path):
            return None

        parts = [x for x in path.split("/") if x]
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


def extract_tool_info(html: str, tool_url: str) -> Optional[dict]:
    """
    Estrae informazioni dal tool dalla sezione <aside>:
    - nome del tool (da <h3>)
    - SVG logo (da <img src="images/...">)
    - versione (da <code>version: X.X.X</code>)
    """
    soup = BeautifulSoup(html, "html.parser")

    # Trova l'aside
    aside = soup.find("aside")
    if not aside:
        return None

    # Estrai il nome del tool
    h3 = aside.find("h3")
    tool_name = h3.get_text(strip=True) if h3 else None

    # Estrai lo slug dall'URL
    slug = urlparse(tool_url).path.strip("/").split("/")[-1]

    # Estrai l'SVG dall'aside
    svg_url = None
    svg_filename = None
    img = aside.find("img", src=True)
    if img:
        src = img["src"].strip()
        if src.lower().endswith(".svg"):
            svg_url = urljoin(tool_url, src)
            # Usa il filename originale dell'immagine
            svg_filename = os.path.basename(urlparse(src).path)

    # Estrai la versione
    version = None
    for code in aside.find_all("code"):
        text = code.get_text(strip=True)
        if text.startswith("version:"):
            version = text.replace("version:", "").strip()
            break

    if not svg_url or not svg_filename:
        return None

    return {
        "name": tool_name or slug,
        "slug": slug,
        "url": tool_url,
        "svg_url": svg_url,
        "svg_filename": svg_filename,
        "version": version
    }


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
    tools_data = []

    try:
        print(f"[INFO] Fetch start: {START}")
        start_html = fetch(START, session)
        if start_html is None:
            print("[FATAL] Impossibile accedere a /tools/.")
            return

        tool_links = extract_tool_links(start_html, START)

        # Cerca "List all tools" per ampliare la lista
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
        print(f"[INFO] Totale tool da processare: {len(tool_links)}")

        # Visita ogni tool, estrai info e scarica SVG
        total_svgs = 0
        for i, link in enumerate(tool_links, 1):
            print(f"[{i}/{len(tool_links)}] {link}")
            html = fetch(link, session)
            if html is None:
                print("   -> skip (errore pagina)")
                time.sleep(REQUEST_DELAY)
                continue

            tool_info = extract_tool_info(html, link)
            if not tool_info:
                print("   -> nessuna info/SVG trovato nell'aside")
                time.sleep(REQUEST_DELAY)
                continue

            # Scarica l'SVG usando il filename originale
            svg_url = tool_info["svg_url"]
            filename = tool_info["svg_filename"]
            out_path = os.path.join(OUT_DIR, filename)

            if os.path.exists(out_path):
                print(f"   - {filename} esiste già")
            else:
                print(f"   - scarico {filename}")
                ok = download(svg_url, out_path, session)
                if ok:
                    total_svgs += 1
                else:
                    # Pulizia file parziale
                    try:
                        if os.path.exists(out_path):
                            os.remove(out_path)
                    except Exception:
                        pass
                    time.sleep(REQUEST_DELAY)
                    continue

            # Aggiungi info al JSON con path completo icona
            # Usa sempre forward slash per compatibilità cross-platform
            icon_path = f"{OUT_DIR}/{filename}".replace("\\", "/")
            tool_data = {
                "name": tool_info["name"],
                "url": tool_info["url"],
                "icon_path": icon_path,
                "version": tool_info["version"]
            }
            tools_data.append(tool_data)

            time.sleep(REQUEST_DELAY)

        # Salva JSON
        with open(OUT_JSON, "w", encoding="utf-8") as f:
            json.dump(tools_data, f, indent=2, ensure_ascii=False)

        print(f"\n[DONE] Finito!")
        print(f"  - SVG scaricati: {total_svgs}")
        print(f"  - Tool processati: {len(tools_data)}")
        print(f"  - JSON salvato in: {OUT_JSON}")

    finally:
        session.close()


if __name__ == "__main__":
    main()