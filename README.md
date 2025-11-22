# Cybersecurity Toolmap


# Conversione base
python yaml_to_json.py config.yaml

# Specifica file di output
python yaml_to_json.py config.yaml -o config.json

# Con indentazione personalizzata
python yaml_to_json.py config.yaml --indent 4

# Escape caratteri non ASCII
python yaml_to_json.py config.yaml --ensure-ascii

# Versione semplificata
python yaml_to_json_simple.py input.yaml output.json