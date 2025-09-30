import yaml
from pathlib import Path

reg_p = Path("data/registry.yml")
tax_p = Path("data/taxonomy.yml")

tools = yaml.safe_load(reg_p.read_text(encoding="utf-8")) or []

def norm(cp):
    return [str(s).strip() for s in (cp or []) if str(s).strip()]

seen = set()
paths = []
for t in tools:
    cp = norm(t.get("category_path"))
    if cp and tuple(cp) not in seen:
        seen.add(tuple(cp))
        paths.append(cp)

tax = {"paths": paths}
tax_p.write_text(yaml.safe_dump(tax, sort_keys=False, allow_unicode=True), encoding="utf-8")
print(f"taxonomy.yml scritto con {len(paths)} path")
