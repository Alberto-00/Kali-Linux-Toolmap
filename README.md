# Cybersecurity Toolmap

Kali Toolmap è un'applicazione web client-side che funziona come una mappa interattiva di **500+ tool di sicurezza informatica**. Trovarli, capire a cosa servono e ricordarsi quali usare in ogni fase di un pentest è difficile — Toolmap organizza tutto in una struttura logica e navigabile, direttamente nel browser, senza backend.

## Indice

- [Caratteristiche](#caratteristiche)
- [Quick Start](#quick-start)
- [Struttura del Progetto](#struttura-del-progetto)
- [Architettura](#architettura)
  - [Flusso Dati](#flusso-dati)
  - [Moduli JavaScript](#moduli-javascript)
  - [Sidebar](#sidebar)
  - [CSS](#css)
- [Tassonomia e Fasi](#tassonomia-e-fasi)
  - [Aggiungere una Fase](#aggiungere-una-fase)
  - [Aggiungere un Tool](#aggiungere-un-tool)
- [Funzionalità Utente](#funzionalità-utente)
  - [Ricerca](#ricerca)
  - [Preferiti](#preferiti)
  - [Tool Installati](#tool-installati)
  - [Note](#note)
  - [Storage](#storage)
- [Ricerca AI](#ricerca-ai)
- [Script di Utilità](#script-di-utilità)

## Caratteristiche

| Funzionalità | Descrizione |
|---|---|
| **Tassonomia a 7 fasi** | Struttura che segue il workflow di un pentest, dalla ricognizione al red teaming |
| **Ricerca duale** | Fuzzy search locale istantanea + ricerca semantica AI via OpenAI |
| **Preferiti** | Sistema di "star" salvato in localStorage |
| **Tool installati** | Segna i tool installati sul tuo sistema, filtra per visualizzare solo quelli |
| **Note personali** | Annotazioni Markdown per ogni tool, salvate in localStorage |
| **Export JSON** | Scarica il registry aggiornato con le personalizzazioni utente |
| **Responsive** | Mobile-first con drawer sidebar, breakpoint adattivi e safe area per notch |
| **Zero backend** | Tutto nel browser — serve solo un server HTTP statico |

## Quick Start

**Requisiti:** Python 3.x · Browser moderno (Chrome, Firefox, Edge, Safari)

### Avvio

| Piattaforma | Script rapido | Manuale |
|---|---|---|
| **Windows** | Doppio click su `utils\windows\start-server.bat` | `python -m http.server 8000` |
| **Linux / macOS** | `./utils/linux/start-server.sh` | `python3 -m http.server 8000` |

Poi apri `http://localhost:8000/app/` nel browser.

> Lo script mostra anche l'IP locale per accedere da altri dispositivi sulla stessa rete.

### Icona Desktop (opzionale)

| Piattaforma | Comando |
|---|---|
| **Windows** | `utils\windows\install-desktop-shortcut.bat` |
| **Linux** | `chmod +x utils/linux/install-desktop-shortcut.sh && ./utils/linux/install-desktop-shortcut.sh` |

Per rimuovere: elimina il collegamento dal desktop. Il progetto rimane intatto.

## Struttura del Progetto

```
Kali-Linux-Toolmap/
│
├── app/                              # Applicazione principale
│   ├── index.html                    # Entry point HTML
│   │
│   ├── data/                         # Dati e configurazione
│   │   ├── registry.json             # Database dei tool (~500 voci, ~1.6MB)
│   │   ├── taxonomy.js               # Albero delle categorie (auto-generato)
│   │   ├── kali_tools.json           # Metadata originali Kali
│   │   ├── system-prompt.md          # System prompt per la ricerca AI
│   │   ├── secret.env                # Configurazione API OpenAI
│   │   └── secret_backup.env         # Template di backup
│   │
│   ├── js/                           # Moduli JavaScript
│   │   ├── app.js                    # Orchestratore principale
│   │   ├── search.js                 # Ricerca fuzzy + AI
│   │   ├── modal.js                  # Modal dettagli tool e note
│   │   ├── breadcrumb-manager.js     # Breadcrumb di navigazione
│   │   ├── back-to-top.js            # Scroll to top
│   │   ├── modal-message.js          # Modal messaggi di sistema
│   │   ├── sidebar/                  # Navigazione ad albero (10 moduli)
│   │   │   ├── sidebar-constants.js  # Tassonomia, costanti, helper
│   │   │   ├── sidebar-icons.js      # Icone SVG delle fasi
│   │   │   ├── sidebar-state.js      # Stato, memoria fasi, cache
│   │   │   ├── sidebar-dom.js        # Costruzione DOM, animazioni
│   │   │   ├── sidebar-vlines.js     # Linee verticali dell'albero
│   │   │   ├── sidebar-autogrow.js   # Larghezza dinamica sidebar
│   │   │   ├── sidebar-hover.js      # Hover pane (sidebar chiusa)
│   │   │   ├── sidebar-search.js     # Decorazioni ricerca sidebar
│   │   │   ├── sidebar-badges.js     # Badge conteggio tool per fase
│   │   │   └── sidebar-main.js       # Bootstrap, controlli, event handlers
│   │   ├── ai/                       # Integrazione OpenAI
│   │   │   ├── config.js             # Gestione API key
│   │   │   ├── ai-search.js          # Chat Completions API
│   │   │   └── ai-manager-modal.js   # UI configurazione AI
│   │   └── utils/                    # Utility condivise
│   │       ├── constants.js          # Colori fasi, selettori DOM, chiavi storage
│   │       ├── helpers.js            # Normalizzazione ID, rendering Markdown
│   │       ├── registry.js           # Caricamento e indicizzazione registry
│   │       ├── renderer.js           # Generazione HTML card + icone fallback
│   │       └── features.js           # StarsManager, InstalledManager, JSONExporter
│   │
│   ├── css/                          # Fogli di stile (9 moduli)
│   │   ├── base.css                  # Variabili CSS, reset, tipografia, animazioni
│   │   ├── sidebar.css               # Sidebar desktop e collapsed state
│   │   ├── card.css                  # Card dei tool
│   │   ├── main-section.css          # Grid, breadcrumb, back-to-top, empty state
│   │   ├── modal.css                 # Modal dettagli/note
│   │   ├── modal-message.css         # Modal messaggi di sistema
│   │   ├── ai-manager-modal.css      # Modal configurazione AI
│   │   ├── ai-loading.css            # Animazione loading AI
│   │   └── responsive.css            # Media queries, mobile drawer, breakpoint
│   │
│   ├── icons/                        # Loghi SVG dei tool (~400 file)
│   └── favicon/                      # Icone app
│
└── utils/                            # Script di utilità
    ├── windows/
    │   ├── start-server.bat          # Avvia server HTTP
    │   └── install-desktop-shortcut.bat
    ├── linux/
    │   ├── start-server.sh           # Avvia server HTTP
    │   ├── install-desktop-shortcut.sh
    │   └── toolmap.desktop           # Template .desktop Linux
    ├── build_taxonomy_from_registry.py   # Rigenera taxonomy.js da registry.json
    ├── sort_tools.py                     # Ordina tool per fase/best_in/nome
    └── kali_svg_scraping.py              # Scraping icone SVG da Kali
```

## Architettura

### Flusso Dati

Il ciclo di vita di un'interazione segue sempre questo percorso:

```
registry.json
     │
     ▼
registry.js  ──────────────────────────────────────────────
  carica e indicizza i tool                                │
  (toolsById, nodeIndex, allToolsUnder)                    │
     │                                                     │
     ▼                                                     │
sidebar-constants.js                                       │
  costruisce l'albero dalla tassonomia                     │
     │                                                     ▼
     │  utente clicca categoria          app.js (orchestratore)
     │──────── tm:scope:set ────────────────► computeVisibleTools()
                                                           │
                                                           ▼
                                                    ToolsRenderer
                                           mostra/nasconde card via .card-hidden
                                           (500+ card pre-renderizzate, no DOM recreation)
```

### Moduli JavaScript

**Ordine di caricamento** (tutti con `defer` in `index.html`):

```
[1] constants.js → helpers.js → modal-message.js
[2] config.js → ai-search.js → ai-manager-modal.js
[3] registry.js → renderer.js → features.js
[4] modal.js → search.js
[5] sidebar-constants.js → sidebar-icons.js → sidebar-state.js → sidebar-dom.js
    → sidebar-vlines.js → sidebar-autogrow.js → sidebar-hover.js → sidebar-search.js
    → sidebar-badges.js → sidebar-main.js
[6] breadcrumb-manager.js → back-to-top.js → app.js
```

### Sidebar

La sidebar è il componente più complesso: è suddivisa in **10 moduli** con catena di dipendenze stretta.

| Modulo | Global esposto | Responsabilità |
|---|---|---|
| `sidebar-constants.js` | `SidebarConstants` | Tassonomia, TIMINGS, SELECTORS, CLASSES, helper `formatLabel` |
| `sidebar-icons.js` | `SidebarIcons`, `SIDEBAR_ICONS` | SVG delle fasi, `ICON_MAP`, `chevronSVG` |
| `sidebar-state.js` | `SidebarState` | Memoria fasi aperte, path attivo, cache nav items |
| `sidebar-dom.js` | `SidebarDOM` | `buildNav`, animazioni expand/collapse, highlight path |
| `sidebar-vlines.js` | `SidebarVLines`, `refreshAllVLines` | Calcolo altezza e clamp linee verticali (MutationObserver) |
| `sidebar-autogrow.js` | `SidebarAutoGrow` | Adattamento larghezza dinamica sidebar |
| `sidebar-hover.js` | `SidebarHover` | Pannello floating quando la sidebar è collassata |
| `sidebar-search.js` | `SidebarSearch` | Ghost overlay decorazioni in modalità ricerca |
| `sidebar-badges.js` | `SidebarBadges` | Badge con contatore animato per fase |
| `sidebar-main.js` | — | Bootstrap, toggle fasi, drilldown cartelle, controlli globali |

**Dove intervenire:**

| Cosa modificare | File |
|---|---|
| Aggiungere/modificare categorie nella tassonomia | `sidebar-constants.js` |
| Cambiare icona di una fase | `sidebar-icons.js` |
| Timing animazioni | `sidebar-constants.js` (TIMINGS) |
| Animazione expand/collapse | `sidebar-dom.js` |
| Comportamento hover pane | `sidebar-hover.js` |
| Evidenziazione in modalità ricerca | `sidebar-search.js` |
| Badge e contatori | `sidebar-badges.js` |
| Click sulle fasi | `sidebar-main.js` → `attachPhaseToggles` |
| Click sulle cartelle/foglie | `sidebar-main.js` → `attachFolderLeafDrilldown` |
| Pulsanti collapse/expand all | `sidebar-main.js` → `attachSidebarControls` |
| Linee verticali albero | `sidebar-vlines.js` |

### CSS

9 moduli in `app/css/`, caricati in ordine in `index.html`:

| File | Responsabilità |
|---|---|
| `base.css` | Variabili `:root` (`--bg`, `--panel`, `--text`, `--accent`, `--color-*`), reset, tipografia, bottoni, scrollbar |
| `sidebar.css` | Sidebar desktop: header, search box, albero, collapsed state, `.filtered-empty` |
| `card.css` | Card tool: layout, hover, thumbnail, badge, footer, animazione slide-in |
| `main-section.css` | Area contenuto: breadcrumb bar, action buttons, griglia, back-to-top, empty state |
| `modal.css` | Modal dettagli tool e note |
| `modal-message.css` | Modal messaggi di sistema |
| `ai-manager-modal.css` | Modal configurazione AI |
| `ai-loading.css` | Animazione loading durante ricerca AI |
| `responsive.css` | Media queries per tutti i breakpoint, mobile drawer, hamburger, touch target |

## Tassonomia e Fasi

I tool sono organizzati in **7 fasi** che rispecchiano il workflow di un penetration test:

| # | Fase | Descrizione |
|---|---|---|
| 00 | `00_Common` | Tool generici, plugin Metasploit, wordlist, script condivisi |
| 01 | `01_Information_Gathering` | OSINT, reconnaissance, port scanning, fingerprinting |
| 02 | `02_Exploitation` | Exploit web, infrastruttura, wireless |
| 03 | `03_Post_Exploitation` | Active Directory, privilege escalation, persistence, lateral movement |
| 04 | `04_Red_Team` | C2 frameworks, payload generation, evasion |
| 05 | `05_Forensics` | Analisi disco, memoria, rete, malware |
| 06 | `06_Miscellaneous` | Tool non categorizzati altrove |

I prefissi numerici (`00_`, `01_`, ...) controllano l'ordine di visualizzazione nella sidebar.

### Aggiungere una Fase

Per aggiungere una nuova fase (es. `07_New_Phase`) occorre modificare **6 file**:

| # | File | Cosa aggiungere |
|---|---|---|
| 1 | `sidebar-constants.js` | Nuova chiave nel `taxonomy` object |
| 2 | `constants.js` | Nuovo colore HSL in `PHASE_COLORS` |
| 3 | `sidebar-icons.js` | SVG dell'icona + mapping in `SIDEBAR_ICONS` |
| 4 | `renderer.js` | Mapping in `_getCanonicalKey()` e fallback in `_getFallback()` |
| 5 | `base.css` | Variabile `--color-new-phase` nel `:root` + selettore `[data-phase="07_New_Phase"]` |
| 6 | `registry.json` | `category_path` dei tool assegnati alla nuova fase |

**1. Tassonomia** (`sidebar-constants.js`):
```javascript
const taxonomy = {
    "00_Common": { ... },
    "07_New_Phase": {
        "Subcategory_One": {},
        "Subcategory_Two": { "Nested_Category": {} }
    }
};
```

**2. Colore** (`constants.js`):
```javascript
PHASE_COLORS: {
    // ...fasi esistenti...
    '07_New_Phase': 'hsl(180 70% 50%)',
}
```

**3. Icona** (`sidebar-icons.js`):
```javascript
const svg_new_phase =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<circle cx="12" cy="12" r="10"/>' +
    '</svg>';

window.SIDEBAR_ICONS = {
    // ...icone esistenti...
    new_phase: svg_new_phase,
};
```

**4. Mapping renderer** (`renderer.js`):
```javascript
// _getCanonicalKey()
const map = {
    // ...voci esistenti...
    new_phase: 'new_phase',
};

// _getFallback()
const iconMap = {
    // ...voci esistenti...
    new_phase: this.dots(),
};
```

**5. CSS** (`base.css`):
```css
:root {
    --color-new-phase: #00bcd4;
}
[data-phase="07_New_Phase"] {
    --phase: var(--color-new-phase);
}
```

**6. Assegna tool** (`registry.json`):
```json
{ "id": "my-tool", "category_path": ["07_New_Phase", "Subcategory_One"] }
```

### Aggiungere un Tool

Aggiungi una voce in `registry.json` con questa struttura:

```json
{
    "id": "tool-id",
    "name": "Tool Name",
    "version": "1.0.0",
    "icon": "../app/icons/tool-id-logo.svg",
    "installation": "Kali",
    "repo": "https://github.com/author/tool",
    "desc": "Breve descrizione (1-2 righe, usata anche dall'AI search)",
    "desc_long": "<h4>Titolo</h4><p>Descrizione estesa in HTML per il modal</p>",
    "best_in": false,
    "installed": false,
    "category_path": ["01_Information_Gathering", "Recon", "Port_Scanning"],
    "notes": null
}
```

| Campo | Tipo | Descrizione |
|---|---|---|
| `id` | string | Identificatore univoco (usato come chiave in `toolsById`) |
| `name` | string | Nome visualizzato nelle card e nei modal |
| `version` | string | Versione corrente del tool |
| `icon` | string | Path relativo all'icona SVG in `app/icons/` |
| `installation` | string | Sorgente di installazione: `"Kali"`, `"GitHub"`, `"pip"`, etc. |
| `repo` | string | URL del repository o della pagina ufficiale |
| `desc` | string | Descrizione breve (card + contesto AI search) |
| `desc_long` | string | HTML con descrizione estesa (modal dettagli) |
| `best_in` | boolean | `true` per tool raccomandati (badge visivo + ordinamento prioritario) |
| `installed` | boolean | Valore di default da registry; l'utente può sovrascrivere via localStorage |
| `category_path` | array | Percorso nella tassonomia: `["Fase", "Sottocategoria", "Foglia"]` |
| `notes` | string\|null | Note utente in Markdown (gestite automaticamente dall'app) |

Dopo aver modificato il registry, rigenera la tassonomia:
```bash
python utils/build_taxonomy_from_registry.py
```

## Funzionalità Utente

### Ricerca

Due modalità selezionabili dall'icona nella barra di ricerca:

| Modalità | Come funziona | Requisiti |
|---|---|---|
| **Fuzzy** | Ricerca locale istantanea per nome del tool | Nessuno |
| **AI** | Ricerca semantica tramite OpenAI — trova tool per concetto, fase, caso d'uso | API key OpenAI |

### Preferiti

- Click sulla stella in una card per aggiungere/rimuovere dai preferiti
- Salvati in `localStorage` (`tm:stars`)
- Esportabili con il pulsante "Download JSON"

### Tool Installati

- Click sull'icona "installed" in una card per segnare il tool come installato
- Gli override utente sovrascrivono il valore `installed` del registry (priorità: localStorage > registry)
- Il filtro "Installed only" nella toolbar mostra solo i tool installati
- Con il filtro attivo, la sidebar nasconde automaticamente le fasi/categorie senza tool installati

### Note

- Click su una card per aprire il modal dettagli
- Tab "Notes" per scrivere annotazioni in Markdown
- Salvate automaticamente in `localStorage` al cambio di tool

### Storage

Tutte le chiavi sono definite in `constants.js` sotto `STORAGE_KEYS`:

| Chiave | Storage | Contenuto |
|---|---|---|
| `tm:stars` | localStorage | Mappa dei preferiti utente `{id: true}` |
| `tm:installed` | localStorage | Override stato installato `{id: true/false}` |
| `tm:installed:only` | sessionStorage | Modalità filtro installed-only (`"true"/"false"`) |
| `tm:active:path` | sessionStorage | Path di navigazione corrente nella sidebar |
| `tm:session:registry-json` | sessionStorage | Registry cachato per la sessione |
| `tm:search:mode` | localStorage | Modalità ricerca attiva: `"fuzzy"` o `"api"` |

> Il pulsante **Reset** esegue `localStorage.clear()` + `sessionStorage.clear()` completo.

## Ricerca AI

La ricerca semantica usa OpenAI Chat Completions API con un system prompt dedicato.

### Configurazione

1. Ottieni un'API key da [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Compila `app/data/secret.env`:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4.1-mini-2025-04-14
OPENAI_TEMPERATURE=0
OPENAI_MAX_RESULTS=20
OPENAI_MAX_TOKENS=1000
```

3. Ricarica la pagina (F5)

### Parametri

| Parametro | Default | Descrizione |
|---|---|---|
| `OPENAI_API_KEY` | — | API key OpenAI (obbligatoria) |
| `OPENAI_MODEL` | `gpt-4.1-mini-2025-04-14` | Modello da usare |
| `OPENAI_TEMPERATURE` | `0` | `0` = deterministico, `1` = creativo |
| `OPENAI_MAX_RESULTS` | `20` | Numero massimo di tool restituiti |
| `OPENAI_MAX_TOKENS` | `1000` | Limite token per la risposta |

### Come funziona

1. Il system prompt (`system-prompt.md`) definisce il comportamento del modello
2. Il registry viene inviato come contesto (solo i campi essenziali: `id`, `name`, `desc`, `category_path`)
3. La query utente viene analizzata semanticamente
4. Il modello restituisce esclusivamente una lista di ID tool rilevanti

## Script di Utilità

| Script | Utilizzo | Descrizione |
|---|---|---|
| `build_taxonomy_from_registry.py` | Da eseguire dopo ogni modifica a `registry.json` | Rigenera `app/data/taxonomy.js` scansionando tutti i `category_path` |
| `sort_tools.py` | Opzionale, per mantenere il registry ordinato | Ordina i tool per posizione in tassonomia, poi `best_in`, poi alfabetico |
| `kali_svg_scraping.py` | Per aggiornare le icone | Scarica i loghi SVG dalla pagina ufficiale dei tool Kali |

### Rigenerare la tassonomia

```bash
python utils/build_taxonomy_from_registry.py
```

### Ordinare i tool

Applica tre criteri in cascata: posizione nella tassonomia → `best_in=true` prima → alfabetico per nome.

```bash
# Output in tools_sorted.json accanto al registry
python utils/sort_tools.py -j app/data/registry.json -t app/data/taxonomy.js

# Sovrascrive direttamente il registry
python utils/sort_tools.py -j app/data/registry.json -t app/data/taxonomy.js -o app/data/registry.json
```

### Scraping icone

```bash
python utils/kali_svg_scraping.py
```
