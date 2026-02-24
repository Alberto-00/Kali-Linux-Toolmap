#!/usr/bin/env python3
"""
sort_tools.py - Ordina i tool per fase della tassonomia e alfabeticamente.

Ordinamento:
  1. Posizione nella tassonomia (fase/sottocategoria)
  2. best_in=True prima di best_in=False
  3. Alfabetico per nome

Usage:
    python sort_tools.py -j tools.json -t taxonomy.js
    python sort_tools.py -j tools.json -t taxonomy.js -o output.json
"""

import json
import re
import argparse
from pathlib import Path


def load_taxonomy(taxonomy_path: str) -> dict:
    """Estrae la tassonomia dal file JS (gestisce 'const taxonomy = {...};')"""
    content = Path(taxonomy_path).read_text(encoding="utf-8")
    # Rimuove trailing commas (valide in JS, non in JSON)
    content = re.sub(r',\s*([}\]])', r'\1', content)
    # Estrae il blocco JSON
    match = re.search(r'const\s+taxonomy\s*=\s*(\{.*\})\s*;', content, re.DOTALL)
    json_str = match.group(1) if match else content
    return json.loads(json_str)


def build_category_order(taxonomy: dict) -> dict:
    """
    Visita ricorsivamente la tassonomia e restituisce
    { (path, tuple): order_index } per ogni nodo.
    """
    order_map = {}
    counter = [0]

    def visit(node: dict, path: list):
        for key, children in node.items():
            current_path = path + [key]
            order_map[tuple(current_path)] = counter[0]
            counter[0] += 1
            if isinstance(children, dict) and children:
                visit(children, current_path)

    visit(taxonomy, [])
    return order_map


def get_sort_key(tool: dict, order_map: dict) -> tuple:
    """
    Chiave di ordinamento: (fase, not_best_in, nome).
    - Cerca il path completo, poi parziale, poi mette in fondo.
    - best_in=True -> 0 (prima), False/None -> 1 (dopo).
    """
    path_tuple = tuple(tool.get("category_path") or [])

    idx = order_map.get(path_tuple)
    if idx is None:
        for length in range(len(path_tuple) - 1, 0, -1):
            idx = order_map.get(path_tuple[:length])
            if idx is not None:
                break
    if idx is None:
        idx = 999999

    not_best = 0 if tool.get("best_in") else 1
    name = (tool.get("name") or "").lower()
    return (idx, not_best, name)


def sort_tools(tools: list, order_map: dict) -> list:
    return sorted(tools, key=lambda t: get_sort_key(t, order_map))


def print_tool_row(i: int, tool: dict) -> None:
    path = " > ".join(tool.get("category_path") or [])
    best = " [*]" if tool.get("best_in") else ""
    name = tool.get("name") or "(senza nome)"
    print(f"  {i+1:4}. [{path}]{best} {name}")


def main():
    parser = argparse.ArgumentParser(description="Ordina tool per tassonomia e nome")
    parser.add_argument("-j", "--json",     required=True, help="Path al file tools.json")
    parser.add_argument("-t", "--taxonomy", required=True, help="Path al file taxonomy.js")
    parser.add_argument("-o", "--output",   default=None,  help="Path output (default: tools_sorted.json accanto al JSON)")
    parser.add_argument("--indent",         type=int, default=2, help="Indentazione JSON output (default: 2)")
    args = parser.parse_args()

    json_path = Path(args.json)
    tax_path  = Path(args.taxonomy)

    # --- Esistenza file ---
    if not json_path.exists():
        print(f"[!] Errore: file JSON non trovato -> {json_path}")
        return
    if not tax_path.exists():
        print(f"[!] Errore: file tassonomia non trovato -> {tax_path}")
        return

    # --- Output path ---
    out_path = Path(args.output) if args.output else json_path.parent / "tools_sorted.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # --- Carica JSON tool ---
    try:
        tools = json.loads(json_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"[!] Errore: JSON dei tool non valido: {e}")
        return
    except Exception as e:
        print(f"[!] Errore lettura file JSON: {e}")
        return

    if not isinstance(tools, list):
        print("[!] Errore: il file JSON deve contenere una lista (array) di tool.")
        return

    if len(tools) == 0:
        print("[!] Attenzione: nessun tool trovato. Scrivo array vuoto.")
        out_path.write_text("[]", encoding="utf-8")
        return

    # --- Valida tool ---
    warnings = []
    for i, tool in enumerate(tools):
        if not isinstance(tool, dict):
            warnings.append(f"  #{i}: non e' un oggetto dict")
            continue
        if not tool.get("name"):
            warnings.append(f"  #{i} (id: {tool.get('id', 'N/A')}): 'name' mancante o vuoto")
        if not tool.get("category_path"):
            warnings.append(f"  #{i} ({tool.get('name', 'N/A')}): 'category_path' mancante -> verra' messo in fondo")

    if warnings:
        print(f"[!] {len(warnings)} avvisi sui dati dei tool:")
        for w in warnings:
            print(w)
        print()

    # --- Carica tassonomia ---
    try:
        taxonomy = load_taxonomy(str(tax_path))
    except json.JSONDecodeError as e:
        print(f"[!] Errore: tassonomia non valida: {e}")
        return
    except Exception as e:
        print(f"[!] Errore lettura tassonomia: {e}")
        return

    if not isinstance(taxonomy, dict) or not taxonomy:
        print("[!] Errore: la tassonomia e' vuota o malformata.")
        return

    # --- Ordina ---
    order_map    = build_category_order(taxonomy)
    sorted_tools = sort_tools(tools, order_map)

    print(f"[*] Tassonomia: {len(order_map)} nodi")
    print(f"[*] Tool ordinati: {len(sorted_tools)}")

    # --- Salva ---
    try:
        out_path.write_text(
            json.dumps(sorted_tools, indent=args.indent, ensure_ascii=False),
            encoding="utf-8"
        )
    except Exception as e:
        print(f"[!] Errore salvataggio output: {e}")
        return

    print(f"[+] Salvato in: {out_path}\n")

    # --- Preview ---
    total = len(sorted_tools)
    top_n = min(10, total)
    bot_n = min(5, total)

    print(f"--- Primi {top_n} ---")
    for i in range(top_n):
        print_tool_row(i, sorted_tools[i])

    middle = total - top_n - bot_n
    if middle > 0:
        print(f"\n  ... ({middle} tool nel mezzo) ...\n")
    else:
        print()

    bot_start = max(top_n, total - bot_n)
    if bot_start < total:
        print(f"--- Ultimi {total - bot_start} ---")
        for i in range(bot_start, total):
            print_tool_row(i, sorted_tools[i])


if __name__ == "__main__":
    main()