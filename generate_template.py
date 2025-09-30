import json, yaml
from pathlib import Path

BASE = Path(__file__).parent
REG_YML = BASE / "data/registry.yml"
TAXO_YML = BASE / "data/taxonomy.yml"
OUT_HTML = BASE / "app/PT_Toolmap_Dashboard.html"


def build_tree(paths):
    root = {}
    for p in paths:
        n = root
        for seg in p:
            n = n.setdefault(str(seg), {})
    return root


def build_html(tools, tree, raw_registry_text):
    data_json = json.dumps(tools, ensure_ascii=False)
    tree_json = json.dumps(tree, ensure_ascii=False)
    html = r"""
<!doctype html>
<html lang="it">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Kali Linux Toolmap</title>
    <link rel="stylesheet" href="style.css">
    <script src="script.js" defer></script>
</head>
<body>
    <header>
      <div class="header-container">
        <div class="header-brand">
          <div class="header-icon">
            <img src="kali.svg" alt="Logo Kali Toolmap" style="width:100%;">
          </div>
          <h1>Kali Linux Toolmap</h1>
        </div>

        <div class="header-search">
          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input id="searchInput" class="search-input" placeholder="Cerca tool, capabilities, fasi..." autocomplete="off"/>
          </div>
        </div>

        <div class="header-actions">
          <button id="resetBtn" class="btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            Reset
          </button>
        </div>
      </div>
    </header>

    <div class="main-container">
      <div class="layout">
        <aside class="sidebar">
          <div class="sidebar-header">
            <h2 class="sidebar-title">Navigazione</h2>
            <div class="sidebar-controls">
              <button id="expandAllBtn" class="btn" title="Espandi tutto">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="7,13 12,18 17,13"></polyline>
                  <polyline points="7,6 12,11 17,6"></polyline>
                </svg>
              </button>
              <button id="collapseAllBtn" class="btn" title="Comprimi tutto">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="17,11 12,6 7,11"></polyline>
                  <polyline points="17,18 12,13 7,18"></polyline>
                </svg>
              </button>
              <button id="downloadRegistryBtn" class="btn btn-primary" title="Scarica registry.yml">Scarica YAML</button>
            </div>
          </div>
          <div class="tree-container">
            <nav id="treeNav" class="tree" aria-label="Navigazione gerarchica"></nav>
          </div>
        </aside>
        
        <div id="breadcrumbs" class="breadcrumbs">Tutte le sezioni</div>
        <div class="tools-scroll">
            <section class="content-area">
              <div class="tools-scroll-container">
                <div id="toolsGrid" class="tools-grid"></div>
                <div id="emptyState" class="empty-state" style="display:none">
                    <h3>Nessun risultato trovato</h3>
                    <p>Prova a rimuovere filtri o modifica la query</p>
                </div>
              </div>
            </section>
        </div>
      </div>
    </div>

    <!-- Modal per le note -->
    <div id="notesModal" class="modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title" id="modalTitle">Note - Tool</h2>
          <button class="modal-close" id="closeModalBtn" aria-label="Chiudi">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="modal-tabs">
            <button class="modal-tab active" data-tab="edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Editor
            </button>
            <button class="modal-tab" data-tab="preview">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Anteprima
            </button>
          </div>

          <div class="modal-content">
            <div class="tab-panel active" id="editPanel">
              <textarea id="notesEditor" class="notes-editor" 
              placeholder="Scrivi le tue note in Markdown o HTML...

                    Esempi:
                    # Titolo
                    ## Sottotitolo

                    **Testo in grassetto**
                    *Testo in corsivo*

                    - Lista puntata
                    - Altro elemento

                    ```bash
                    comando di esempio
                    ```

                    > Citazione importante

                    [Link](https://example.com)
                    ">
                </textarea>
            </div>

            <div class="tab-panel" id="previewPanel">
              <div id="notesPreview" class="notes-preview markdown-content">
                <p style="color: var(--md-on-surface-muted); text-align: center; margin-top: 40px;">
                  L'anteprima apparirà qui...
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="saveNotesBtn" class="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17,21 17,13 7,13 7,21"></polyline>
              <polyline points="7,3 7,8 15,8"></polyline>
            </svg>
            Salva Note
          </button>
        </div>
      </div>
    </div>

    <button id="backToTopBtn" class="back-to-top" aria-label="Torna su">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5,12 12,5 19,12"></polyline>
      </svg>
    </button>

    <script id="toolsData" type="application/json">__DATA__</script>
    <script id="treeData" type="application/json">__TREE__</script>
    <script id="registryYaml" type="text/plain">__REGISTRY__</script>

</body>
</html>
""".replace("__DATA__", data_json).replace("__TREE__", tree_json).replace("__REGISTRY__", raw_registry_text)
    return html


def main():
    try:
        # Carica i file YAML con gestione errori
        with open(REG_YML, "r", encoding="utf-8") as f:
            raw_registry_text = f.read()
            f.seek(0)
            tools = yaml.safe_load(f) or []

        with open(TAXO_YML, "r", encoding="utf-8") as f:
            tax = yaml.safe_load(f) or {}

        print(f"Loaded {len(tools)} tools from registry")

        def normalize_path(cp):
            return [str(s).strip() for s in (cp or []) if str(s).strip()]

        # Costruisci i path dalla taxonomy e dai tool
        paths = list(tax.get("paths", []))
        seen = set(tuple(p) for p in paths)

        for tool in tools:
            cp = normalize_path(tool.get("category_path"))
            if cp and tuple(cp) not in seen:
                paths.append(cp)
                seen.add(tuple(cp))

        print(f"Built tree with {len(paths)} total paths")

        tree = build_tree(paths)

        # Assicura che ogni tool abbia un campo notes
        for tool in tools:
            if 'notes' not in tool or tool['notes'] is None:
                tool['notes'] = ''
            # Fix per notes incomplete
            if isinstance(tool['notes'], str) and tool['notes'].strip().endswith('Utilizzo principale:'):
                tool['notes'] = tool[
                                    'notes'] + '\n```bash\n# Esempi di utilizzo\ndirsearch -u https://target.com -e php,html,js\n```'

        html_content = build_html(tools, tree, raw_registry_text)
        OUT_HTML.write_text(html_content, encoding="utf-8")

        print(f"Generated improved HTML dashboard: {OUT_HTML}")
        print(f"Processed {len(tools)} tools with {len(paths)} category paths")

    except yaml.YAMLError as e:
        print(f"YAML parsing error: {e}")
        print("Check your registry.yml and taxonomy.yml for syntax errors")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()