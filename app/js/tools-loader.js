// ============================================================================
// tools-loader.js
// ============================================================================

(() => {
    'use strict';

    // Evita doppio bootstrap
    if (window.Toolmap && window.Toolmap.__loaded) return;

    const Toolmap = (window.Toolmap = window.Toolmap || {});
    const ROOT = 'Root';

    // Percorsi possibili
    const CANDIDATES = [
        '../data/registry.yml',
        '../../data/registry.yml',
        './data/registry.yml',
        '/data/registry.yml',
        'data/registry.yml',
        'registry.yml'
    ];

    // ---- Sessione -------------------------------------------------------------

    const SESSION = {
        registryYAML: 'tm:session:registry-yaml',
        booted: 'tm:session:booted' // flag: il tab ha già fatto un boot almeno una volta
    };

    function sget(k) {
        try {
            return sessionStorage.getItem(k);
        } catch (_) {
            return null;
        }
    }

    function sset(k, v) {
        try {
            sessionStorage.setItem(k, v);
        } catch (_) {
        }
    }

    // Rileva reload della pagina (stesso tab) o boot già avvenuto
    function isReloadNavigation() {
        try {
            const nav = performance.getEntriesByType('navigation')[0];
            if (nav && nav.type === 'reload') return true;
        } catch (_) { /* noop */
        }
        return sget(SESSION.booted) === '1';
    }

    // ---- Utilità --------------------------------------------------------------

    function ensureYaml() {
        if (window.jsyaml && typeof window.jsyaml.load === 'function') return true;
        console.error('[tools-loader] js-yaml non trovato: includi js-yaml PRIMA di questo file.');
        return false;
    }

    async function fetchFirst(paths) {
        for (const url of paths) {
            try {
                const r = await fetch(url, {cache: 'no-cache'});
                if (r.ok) return await r.text();
            } catch (_) { /* continua */
            }
        }
        return null;
    }

    function parseListFromYAML(yamlText) {
        try {
            const data = window.jsyaml.load(yamlText);
            if (Array.isArray(data)) return data;
            console.error('[tools-loader] Formato non valido: atteso ARRAY di tool (lista piatta). Ricevuto:', typeof data);
            return [];
        } catch (e) {
            console.error('[tools-loader] Errore parsing YAML:', e);
            return [];
        }
    }

    function normalizeId(s) {
        return String(s || '')
            .trim()
            .toLowerCase()
            .replace(/[^\w\- ]+/g, '')
            .replace(/\s+/g, '-')
            .replace(/\-+/g, '-');
    }

    function phaseToColor(phase) {
        const PHASE_COLORS = {
            '00_Common': 'hsl(270 91% 65%)',
            '01_Information_Gathering': 'hsl(210 100% 62%)',
            '02_Exploitation': 'hsl(4 85% 62%)',
            '03_Post_Exploitation': 'hsl(32 98% 55%)',
            '04_Miscellaneous': 'hsl(158 64% 52%)'
        };
        return PHASE_COLORS[phase] || 'hsl(var(--accent))';
    }

    function keyFromSegments(segments) {
        return segments.join('>');
    }

    // ---- Build indici da LISTA piatta ----------------------------------------

    function buildFromFlatList(list) {
        // Indici di output
        const toolsById = {};
        const nodeIndex = {}; // key -> { tools: [ids diretti], children: Set(keys) }
        const allToolsUnder = {}; // key -> Set(ids cumulativi discendenti)
        const allPathKeys = new Set();

        // Assicurati che il ROOT esista nel nodeIndex
        nodeIndex[ROOT] = nodeIndex[ROOT] || {tools: [], children: new Set()};
        allPathKeys.add(ROOT);

        // 1) Normalizza tool e raccogli tutti i path keys
        const toolLeafKey = {}; // id -> leafKey
        for (const raw of (Array.isArray(list) ? list : [])) {
            // id & phase
            const id = normalizeId(raw.id || raw.name || raw.title);
            if (!id) continue;

            const phase = raw.phase || (Array.isArray(raw.phases) ? raw.phases[0] : null) || null;
            const color = phase ? phaseToColor(phase) : null;

            // path
            const category_path = Array.isArray(raw.category_path) ? raw.category_path.filter(Boolean) : [];
            const pathSegments = [ROOT, ...category_path];
            const leafKey = keyFromSegments(pathSegments);

            // arricchisci tool
            toolsById[id] = {...raw, id, phase, phaseColor: color, path: pathSegments};
            toolLeafKey[id] = leafKey;

            // registra tutti i nodi lungo il percorso
            for (let i = 1; i <= pathSegments.length; i++) {
                const key = keyFromSegments(pathSegments.slice(0, i));
                if (!nodeIndex[key]) nodeIndex[key] = {tools: [], children: new Set()};
                allPathKeys.add(key);

                // collega parent→child (salta ROOT unico caso i===1 → parent=ROOT)
                if (i > 1) {
                    const parentKey = keyFromSegments(pathSegments.slice(0, i - 1));
                    nodeIndex[parentKey].children.add(key);
                }
            }

            // tool diretto sul leaf
            nodeIndex[leafKey].tools.push(id);
        }

        // 2) Calcola allToolsUnder aggiungendo ogni tool a TUTTI i suoi antenati (incluso ROOT)
        for (const [id, leafKey] of Object.entries(toolLeafKey)) {
            const segments = leafKey.split('>');
            for (let i = 1; i <= segments.length; i++) {
                const key = keyFromSegments(segments.slice(0, i));
                (allToolsUnder[key] || (allToolsUnder[key] = new Set())).add(id);
            }
        }

        // assicurati che ogni nodo abbia un Set anche se vuoto
        for (const key of allPathKeys) {
            allToolsUnder[key] = allToolsUnder[key] || new Set();
            // converti children in array per coerenza output
            nodeIndex[key].children = Array.from(nodeIndex[key].children);
        }

        return {
            rootName: ROOT,
            toolsById,
            nodeIndex,
            allToolsUnder,
            allPathKeys: Array.from(allPathKeys)
        };
    }

    // ---- Bootstrap ------------------------------------------------------------

    (async function init() {
        if (Toolmap.__loaded) return;

        if (!ensureYaml()) {
            // Fallback vuoto (ma non blocchiamo l'app)
            Object.assign(Toolmap, {
                registry: [],
                toolsById: {},
                nodeIndex: {[ROOT]: {tools: [], children: []}},
                allToolsUnder: {[ROOT]: new Set()},
                allPathKeys: [ROOT],
                rootName: ROOT,
                __loaded: true
            });
            window.dispatchEvent(
                new CustomEvent('tm:registry:ready', {
                    detail: {rootName: ROOT, totals: {tools: 0, nodes: 1}, keys: [ROOT]}
                })
            );
            window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {all: true}}));
            return;
        }

        // 1) Prendi YAML dal server (sorgente all'avvio)
        const serverYAML = await fetchFirst(CANDIDATES);

        // 2) Prendi YAML da sessione (se presente)
        const sessYAML = sget(SESSION.registryYAML);

        // 3) Decide in base al tipo di navigazione
        const preferSession = isReloadNavigation();
        let chosenYAML = null;
        let source = 'server';

        if (preferSession && sessYAML) {
            // Reload: preferisci sessione se valida
            chosenYAML = sessYAML;
            source = 'session';
        } else if (serverYAML) {
            // Primo avvio o niente sessione valida: usa server e sincronizza sessione
            chosenYAML = serverYAML;
            source = 'server';
            sset(SESSION.registryYAML, serverYAML);
        } else if (sessYAML) {
            // Server assente ma sessione disponibile
            chosenYAML = sessYAML;
            source = 'session(no-server)';
        } else {
            // Nessuna fonte disponibile → fallback vuoto
            console.error('[tools-loader] registry.yml non trovato. Percorsi provati:', CANDIDATES);
            Object.assign(Toolmap, {
                registry: [],
                toolsById: {},
                nodeIndex: {[ROOT]: {tools: [], children: []}},
                allToolsUnder: {[ROOT]: new Set()},
                allPathKeys: [ROOT],
                rootName: ROOT,
                __loaded: true
            });
            window.dispatchEvent(
                new CustomEvent('tm:registry:ready', {
                    detail: {rootName: ROOT, totals: {tools: 0, nodes: 1}, keys: [ROOT]}
                })
            );
            window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {all: true}}));
            // segna il tab come booted comunque
            sset(SESSION.booted, '1');
            return;
        }

        // 4) Parse lista e build indici
        const list = parseListFromYAML(chosenYAML);
        const built = buildFromFlatList(list);

        // Esporta nel namespace globale
        Toolmap.registry = list; // formato nativo: lista
        Toolmap.toolsById = built.toolsById;
        Toolmap.nodeIndex = built.nodeIndex;
        Toolmap.allToolsUnder = built.allToolsUnder;
        Toolmap.allPathKeys = built.allPathKeys;
        Toolmap.rootName = built.rootName;
        Toolmap.__loaded = true;

        // Diagnostica + sorgente scelta
        try {
            window.dispatchEvent(
                new CustomEvent('tm:registry:source', {detail: {source}})
            );
        } catch (_) {
        }

        // Notifica registry pronto
        window.dispatchEvent(
            new CustomEvent('tm:registry:ready', {
                detail: {
                    rootName: built.rootName,
                    totals: {tools: Object.keys(built.toolsById).length, nodes: built.allPathKeys.length},
                    keys: built.allPathKeys
                }
            })
        );

        // Mostra tutti i tool all'avvio
        window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {all: true}}));

        // 5) Segna il tab come "booted": i prossimi caricamenti sono reload logici
        sset(SESSION.booted, '1');
    })();
})();
