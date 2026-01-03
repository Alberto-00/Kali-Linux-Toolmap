# Cybersecurity Toolmap
Kali Toolmap è un'applicazione web che funziona come una mappa interattiva di tutti i tool di sicurezza informatica disponibili in Kali Linux (e non solo). Contiene 500+ tool di sicurezza. Trovarli, capire a cosa servono e ricordarsi quali usare in ogni fase di un pentest è difficile. Kali Toolmap organizza tutto questo in una struttura logica e navigabile.

## Indice

- [Panoramica](#panoramica)
- [Quick Start](#quick-start)
- [Struttura del Progetto](#struttura-del-progetto)
- [Gestione Fasi](#gestione-fasi)
  - [Aggiungere una nuova Fase](#aggiungere-una-nuova-fase)
  - [Aggiungere un Tool](#aggiungere-un-tool)
- [Ricerca AI (OpenAI)](#ricerca-ai-openai)
- [Funzionamento UI](#funzionamento-ui)
- [Altri Scripts](#altri-scripts)


## Panoramica

### Caratteristiche principali

- **Tassonomia a 7 fasi** - dalla ricognizione al red teaming
- **Ricerca duale** - fuzzy search + ricerca semantica con AI (OpenAI)
- **Note personali** - annota ogni tool in Markdown
- **Preferiti** - sistema di "star" per i tool più usati
- **Export** - scarica il JSON aggiornato
- **Zero backend** - tutto gira nel browser, nessun server richiesto (solo un server HTTP statico)


## Quick Start

### Requisiti

- Python 3.x (per il server HTTP locale)
- Browser moderno (Chrome, Firefox, Edge, Safari)

### Avvio

**Windows:**
```bash
# Doppio click su:
utils\windows\start-server.bat

# Oppure da terminale:
cd Kali-Linux-Toolmap
python -m http.server 8000
# Apri http://localhost:8000/app/
```

**Linux / macOS:**
```bash
# Rendi eseguibile e lancia:
chmod +x utils/linux/start-server.sh
./utils/linux/start-server.sh

# Oppure manualmente:
cd Kali-Linux-Toolmap
python3 -m http.server 8000
# Apri http://localhost:8000/app/
```

Il browser si aprirà automaticamente su `http://localhost:8000/app/`

> **Nota**: Lo script mostra anche l'IP locale per accedere da altri dispositivi sulla stessa rete.

### Installare icona Desktop

Puoi creare un'icona desktop per avviare Toolmap come un'app:

**Windows:**
```bash
# Esegui una volta:
utils\windows\install-desktop-shortcut.bat

# Apparirà "Toolmap" sul desktop
# Click destro > "Aggiungi alla barra delle applicazioni"
```

**Linux:**
```bash
# Esegui una volta:
chmod +x utils/linux/install-desktop-shortcut.sh
./utils/linux/install-desktop-shortcut.sh

# Apparirà "Toolmap" sul desktop e nel menu applicazioni
# Click destro > "Aggiungi ai preferiti" per la dock
```

> **Rimuovere l'icona**: elimina semplicemente il collegamento dal desktop. Il progetto rimane intatto.



## Struttura del Progetto

```
Kali-Linux-Toolmap/
│
├── app/                              # Applicazione principale
│   ├── index.html                    # home html
│   │
│   ├── data/                         # Dati e configurazione
│   │   ├── registry.json             # Database dei tool (principale)
│   │   ├── taxonomy.js               # Albero delle categorie
│   │   ├── kali_tools.json           # Metadata originali Kali
│   │   ├── system-prompt.md          # System Prompt per la ricerca semantica
│   │   ├── secret.env                # Configurazione API OpenAI
│   │   └── secret_backup.env         # Template di backup
│   │
│   ├── js/                           # Moduli JavaScript
│   │   ├── app.js                    # Orchestratore principale
│   │   ├── search.js                 # Logica di ricerca (fuzzy + AI)
│   │   ├── sidebar.js                # Navigazione ad albero + icone fasi
│   │   ├── modal.js                  # Dettagli tool e note
│   │   ├── ai/                       # Integrazione OpenAI
│   │   │   ├── config.js             # Gestione API key
│   │   │   ├── ai-search.js          # Chat Completions API
│   │   │   └── ai-manager-modal.js   # UI configurazione
│   │   └── utils/                    # Utility
│   │       ├── constants.js          # Colori fasi, selettori, chiavi storage
│   │       ├── helpers.js            # Normalizzazione ID, Markdown
│   │       ├── registry.js           # Caricamento e indicizzazione
│   │       ├── renderer.js           # Generazione card HTML + icone fallback
│   │       └── features.js           # Star e export
│   │
│   ├── css/                          # Stili (8 moduli)
│   │   ├── base.css                  # Variabili, reset, tipografia
│   │   ├── sidebar.css               # Albero navigazione
│   │   ├── card.css                  # Card dei tool
│   │   ├── modal.css                 # Modal dettagli
│   │   └── ...
│   │
│   ├── icons/                        # Loghi SVG dei tool (~400 file)
│   │   ├── nmap-logo.svg
│   │   ├── metasploit-logo.svg
│   │   └── ...
│   │
│   └── favicon/                      # Icone app
│
└── utils/                            # Script di utilità
    ├── windows/                      # Script Windows
    │   ├── start-server.bat          # Avvia server
    │   └── install-desktop-shortcut.bat  # Installa icona desktop
    │
    ├── linux/                        # Script Linux/Mac
    │   ├── start-server.sh           # Avvia server
    │   ├── install-desktop-shortcut.sh   # Installa icona desktop
    │   └── toolmap.desktop           # Template .desktop
    │
    ├── build_taxonomy_from_registry.py   # Genera taxonomy.js
    └── kali_svg_scraping.py          # Scraping icone da Kali
```



## Gestione Fasi

I tool sono organizzati in **7 fasi** che rispecchiano il workflow di un penetration test:

| Fase                       | Descrizione                                         |
|-|--|
| `00_Common`                | Tool generici, plugin Metasploit, wordlist, script  |
| `01_Information_Gathering` | OSINT, reconnaissance, scanning                     |
| `02_Exploitation`          | Exploit web, infrastruttura, wireless               |
| `03_Post_Exploitation`     | Active Directory, privilege escalation, persistence |
| `04_Red_Team`              | C2 frameworks, evasion, payload generation          |
| `05_Forensics`             | Analisi disco, memoria, rete, malware               |
| `06_Miscellaneous`         | Tool non categorizzati                              |

### Aggiungere una nuova Fase

Per aggiungere una nuova fase (es. `07_New_Phase`) devi modificare **4 file**:

#### 1. Aggiungi la fase in `sidebar.js`

```javascript
// app/js/sidebar.js
const taxonomy = {
    "00_Common": { ... },
    "01_Information_Gathering": { ... },
    // ...
    "07_New_Phase": {                    // <-- Nuova fase
        "Subcategory_One": {},
        "Subcategory_Two": {
            "Nested_Category": {}
        }
    }
};
```

#### 2. Aggiungi il colore in `constants.js`

```javascript
// app/js/utils/constants.js
PHASE_COLORS: {
    '00_Common': 'hsl(270 91% 65%)',
    '01_Information_Gathering': 'hsl(210 100% 62%)',
    '02_Exploitation': 'hsl(4 85% 62%)',
    '03_Post_Exploitation': 'hsl(32 98% 55%)',
    '04_Red_Team': 'hsl(4 85% 62%)',
    '05_Forensics': 'hsl(220 85% 55%)',
    '06_Miscellaneous': 'hsl(158 64% 52%)',
    '07_New_Phase': 'hsl(180 70% 50%)',  // <-- Colore per la nuova fase
}
```

#### 3. Aggiungi l'icona in `sidebar.js`

Definisci l'SVG e aggiungilo a `SIDEBAR_ICONS`:

```javascript
// app/js/sidebar.js

// Definisci l'icona SVG (cerca le altre definizioni svg_* come riferimento)
const svg_new_phase =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<circle cx="12" cy="12" r="10"/>' +
    '<path d="M12 6v12M6 12h12"/>' +
    '</svg>';

// Aggiungi alla mappa SIDEBAR_ICONS
window.SIDEBAR_ICONS = {
    common: svg_common,
    information_gathering: svg_inf_gather,
    exploitation: svg_exploit,
    post_exploitation: svg_post_exploit,
    red_team: svg_redteam,
    forensics: svg_forensics,
    miscellaneous: folderSVG,
    new_phase: svg_new_phase,            // <-- Nuova icona
};
```

#### 4. Aggiungi il mapping in `renderer.js`

Aggiorna la mappa di normalizzazione e il fallback:

```javascript
// app/js/utils/renderer.js

// Nel metodo _getCanonicalKey(), aggiungi alla mappa:
const map = {
    common: 'common',
    information_gathering: 'information_gathering',
    exploitation: 'exploitation',
    post_exploitation: 'post_exploitation',
    red_team: 'red_team',
    forensics: 'forensics',
    miscellaneous: 'miscellaneous',
    new_phase: 'new_phase',              // <-- Nuova fase
};

// Nel metodo _getFallback(), aggiungi un fallback (opzionale):
const iconMap = {
    information_gathering: this.search(),
    exploitation: this.bolt(),
    post_exploitation: this.gear(),
    common: this.grid(),
    forensics: this.grid(),
    red_team: this.bolt(),
    new_phase: this.dots(),              // <-- Fallback per nuova fase
};
```

#### 5. Assegna i tool

Modifica `category_path` nei tool in `registry.json`:

```json
{
    "id": "my-tool",
    "category_path": ["07_New_Phase", "Subcategory_One"]
}
```

> **Convenzione**: I prefissi numerici (`00_`, `01_`, ...) controllano l'ordine nella sidebar.



### Aggiungere un Tool

Ogni tool in `registry.json` ha questa struttura:

```json
{
    "id": "tool-id",
    "name": "Tool Name",
    "version": "1.0.0",
    "icon": "../app/icons/tool-id-logo.svg",
    "installation": "Kali",
    "repo": "https://github.com/author/tool",
    "desc": "Breve descrizione (1-2 righe)",
    "desc_long": "<h4>Descrizione dettagliata</h4><p>Con HTML...</p>",
    "best_in": false,
    "category_path": ["01_Information_Gathering", "Recon", "Port_Scanning"],
    "notes": null
}
```

#### Campi
| Campo           | Tipo         | Descrizione                                          |
|-----------------|--------------|------------------------------------------------------|
| `id`            | string       | Identificatore univoco                               |
| `name`          | string       | Nome visualizzato nel frontend                       |
| `version`       | string       | Versione                                             |
| `icon`          | string       | Path all'icona SVG                                   |
| `installation`  | string       | "Kali", "GitHub", "pip", etc.                        |
| `repo`          | string       | URL repository o pagina ufficiale                    |
| `desc`          | string       | Descrizione breve (per card e AI search)             |
| `desc_long`     | string       | HTML con descrizione estesa (per modal)              |
| `best_in`       | boolean      | `true` per tool consigliati                          |
| `category_path` | array        | Percorso nella tassonomia                            |
| `notes`         | string\|null | Note utente (gestite automaticamente)                |

## Ricerca AI (OpenAI)

L'app supporta ricerca semantica tramite OpenAI Chat Completions API.

### Configurazione

1. **Ottieni una API key** da [OpenAI Platform](https://platform.openai.com/api-keys)

2. **Configura `secret.env`**:

    ```env
    # app/data/secret.env
    OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
    OPENAI_MODEL=gpt-4.1-mini-2025-04-14
    OPENAI_TEMPERATURE=0
    OPENAI_MAX_RESULTS=20
    OPENAI_MAX_TOKENS=1000
    ```

3. **Ricarica** la pagina (F5)

### Parametri

| Parametro            | Default                   | Descrizione                      |
|----------------------|---------------------------|----------------------------------|
| `OPENAI_API_KEY`     | -                         | La tua API key (obbligatoria)    |
| `OPENAI_MODEL`       | `gpt-4.1-mini-2025-04-14` | Modello da usare                 |
| `OPENAI_TEMPERATURE` | `0`                       | 0 = deterministico, 1 = creativo |
| `OPENAI_MAX_RESULTS` | `20`                      | Max tool restituiti              |
| `OPENAI_MAX_TOKENS`  | `1000`                    | Limite token risposta            |


### Come funziona

1. Il system prompt (`system-prompt.md`) definisce il comportamento del chatbot
2. Il registry viene inviato come contesto (solo i campi essenziali)
3. La query utente viene analizzata semanticamente
4. Il modello restituisce solo gli ID dei tool rilevanti

> **Nota**: Con `TEMPERATURE=0` le risposte sono deterministiche. Aumenta per risultati più vari.



## Funzionamento UI

#### Modalità ricerca

Click sull'icona nella barra di ricerca per switchare tra:
- **Fuzzy** - Ricerca locale istantanea per nome
- **AI** - Ricerca semantica (richiede API key)

#### Preferiti

- Click sulla stella nella card per aggiungere ai preferiti
- I preferiti sono salvati in `localStorage`
- Esportabili con il pulsante "Download JSON"

#### Note

- Click su una card per aprire i dettagli
- Tab "Notes" per scrivere note in Markdown
- Salvate automaticamente in `localStorage`

## Altri Scripts

#### Rigenerare la tassonomia

Se modifichi `registry.json`, rigenera `taxonomy.js`:

```bash
python utils/build_taxonomy_from_registry.py
```

#### Scraping icone

Per scaricare icone da Kali tools:

```bash
python utils/kali_svg_scraping.py
```
