// ============================================================================
// tools-loader.js
// ============================================================================

(() => {
  'use strict';

  // Evita doppio bootstrap
  if (window.Toolmap && window.Toolmap.__loaded) return;

  const Toolmap = window.Toolmap = window.Toolmap || {};
  const ROOT = 'Root';

  // Percorsi possibili (in base alla tua struttura: index.html in /app, registry in /data)
  const CANDIDATES = [
    '../data/registry_2.yml',   // <-- principale per /app/index.html
    '../../data/registry_2.yml',
    './data/registry_2.yml',
    '/data/registry_2.yml',
    'data/registry_2.yml',
    'registry_2.yml'
  ];

  // ---- Utilità --------------------------------------------------------------

  function ensureYaml() {
    if (window.jsyaml && typeof window.jsyaml.load === 'function') return true;
    console.error('[tools-loader] js-yaml non trovato: includi js-yaml PRIMA di questo file.');
    return false;
  }

  async function fetchFirst(paths) {
    for (const url of paths) {
      try {
        const r = await fetch(url, { cache: 'no-cache' });
        if (r.ok) return await r.text();
      } catch (_) { /* continua */ }
    }
    return null;
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
    // CSS vars coerenti con i tuoi temi
    const map = {
      '00_Common':                'var(--color-common)',
      '01_Information_Gathering': 'var(--color-info)',
      '02_Exploitation':          'var(--color-exploit)',
      '03_Post_Exploitation':     'var(--color-post)',
      '04_Miscellaneous':         'var(--color-misc)'
    };
    return map[phase] || 'var(--accent-2)';
  }

  function keyFromSegments(segments) {
    return segments.join('>');
  }

  // ---- Build indici da LISTA piatta ----------------------------------------

  function buildFromFlatList(list) {
    // Indici di output
    const toolsById = {};
    const nodeIndex = {};       // key -> { tools: [ids diretti], children: Set(keys) }
    const allToolsUnder = {};   // key -> Set(ids cumulativi discendenti)
    const allPathKeys = new Set();

    // Assicurati che il ROOT esista nel nodeIndex
    nodeIndex[ROOT] = nodeIndex[ROOT] || { tools: [], children: new Set() };
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
      const tool = { ...raw, id, phase, phaseColor: color, path: pathSegments };
      toolsById[id] = tool;
      toolLeafKey[id] = leafKey;

      // registra tutti i nodi lungo il percorso
      for (let i = 1; i <= pathSegments.length; i++) {
        const key = keyFromSegments(pathSegments.slice(0, i));
        if (!nodeIndex[key]) nodeIndex[key] = { tools: [], children: new Set() };
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
        nodeIndex: { [ROOT]: { tools: [], children: [] } },
        allToolsUnder: { [ROOT]: new Set() },
        allPathKeys: [ROOT],
        rootName: ROOT,
        __loaded: true
      });
      window.dispatchEvent(new CustomEvent('tm:registry:ready', {
        detail: { rootName: ROOT, totals: { tools: 0, nodes: 1 }, keys: [ROOT] }
      }));
      window.dispatchEvent(new CustomEvent('tm:scope:set', { detail: { all: true } }));
      return;
    }

    const yamlText = await fetchFirst(CANDIDATES);
    if (!yamlText) {
      console.error('[tools-loader] registry_2.yml non trovato. Percorsi provati:', CANDIDATES);
      Object.assign(Toolmap, {
        registry: [],
        toolsById: {},
        nodeIndex: { [ROOT]: { tools: [], children: [] } },
        allToolsUnder: { [ROOT]: new Set() },
        allPathKeys: [ROOT],
        rootName: ROOT,
        __loaded: true
      });
      window.dispatchEvent(new CustomEvent('tm:registry:ready', {
        detail: { rootName: ROOT, totals: { tools: 0, nodes: 1 }, keys: [ROOT] }
      }));
      window.dispatchEvent(new CustomEvent('tm:scope:set', { detail: { all: true } }));
      return;
    }

    let list;
    try {
      list = window.jsyaml.load(yamlText);
    } catch (e) {
      console.error('[tools-loader] Errore parsing YAML:', e);
      list = [];
    }

    if (!Array.isArray(list)) {
      console.error('[tools-loader] Formato non valido: atteso ARRAY di tool (lista piatta). Ricevuto:', typeof list);
      list = [];
    }

    const built = buildFromFlatList(list);

    // Esporta
    Toolmap.registry      = list;  // formato nativo: lista
    Toolmap.toolsById     = built.toolsById;
    Toolmap.nodeIndex     = built.nodeIndex;
    Toolmap.allToolsUnder = built.allToolsUnder;
    Toolmap.allPathKeys   = built.allPathKeys;
    Toolmap.rootName      = built.rootName;
    Toolmap.__loaded      = true;

    // Diagnostica + scope iniziale
    window.dispatchEvent(new CustomEvent('tm:registry:ready', {
      detail: {
        rootName: built.rootName,
        totals: { tools: Object.keys(built.toolsById).length, nodes: built.allPathKeys.length },
        keys: built.allPathKeys
      }
    }));

    // Mostra tutti i tool all'avvio
    window.dispatchEvent(new CustomEvent('tm:scope:set', { detail: { all: true } }));
  })();
})();
