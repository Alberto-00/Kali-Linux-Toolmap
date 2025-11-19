#!/usr/bin/env python3
"""
Script per convertire file YAML in JSON
"""

import yaml
import json
import sys
import argparse
from pathlib import Path


def yaml_to_json(input_file, output_file=None, indent=2, ensure_ascii=False):
    """
    Converte un file YAML in JSON

    Args:
        input_file (str): Percorso del file YAML in input
        output_file (str, optional): Percorso del file JSON in output
        indent (int): Indentazione per il JSON
        ensure_ascii (bool): Se escape caratteri non ASCII
    """
    try:
        # Legge il file YAML
        with open(input_file, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)

        # Se non è specificato un file di output, usa lo stesso nome con estensione .json
        if output_file is None:
            output_file = Path(input_file).with_suffix('.json')

        # Scrive il file JSON
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=indent, ensure_ascii=ensure_ascii, sort_keys=False)

        print(f"✅ Convertito: {input_file} -> {output_file}")

    except FileNotFoundError:
        print(f"❌ Errore: File non trovato - {input_file}")
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"❌ Errore nel parsing YAML: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Errore generico: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Converti file YAML in JSON')
    parser.add_argument('input', help='File YAML di input')
    parser.add_argument('-o', '--output', help='File JSON di output (opzionale)')
    parser.add_argument('--indent', type=int, default=2, help='Indentazione JSON (default: 2)')
    parser.add_argument('--ensure-ascii', action='store_true', help='Escape caratteri non ASCII')

    args = parser.parse_args()

    # Verifica che il file di input esista
    if not Path(args.input).exists():
        print(f"❌ Errore: Il file {args.input} non esiste")
        sys.exit(1)

    yaml_to_json(args.input, args.output, args.indent, args.ensure_ascii)


if __name__ == "__main__":
    main()