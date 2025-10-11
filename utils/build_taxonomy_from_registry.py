import yaml
import json
from pathlib import Path

reg_p = Path("../data/registry.yml")
tax_js_p = Path("../data/taxonomy.js")

tools = yaml.safe_load(reg_p.read_text(encoding="utf-8")) or []

def norm(cp):
    return [str(s).strip() for s in (cp or []) if str(s).strip()]

# Raccogli tutti i category_path unici
seen = set()
paths = []
for t in tools:
    cp = norm(t.get("category_path"))
    if cp and tuple(cp) not in seen:
        seen.add(tuple(cp))
        paths.append(cp)

# Costruisci la struttura ad albero
taxonomy = {}

for path in paths:
    current = taxonomy
    for segment in path:
        if segment not in current:
            current[segment] = {}
        current = current[segment]

# Genera il file JS
js_content = f"const taxonomy = {json.dumps(taxonomy, indent=4, ensure_ascii=False)};\n"

tax_js_p.write_text(js_content, encoding="utf-8")
print(f"taxonomy.js scritto con {len(paths)} path unici")
print(f"Struttura taxonomy generata in: {tax_js_p}")