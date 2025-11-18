/**
 * Caricamento e indicizzazione registry.json
 * Costruisce indici per accesso veloce ai tool
 */

(function() {
    'use strict';

    // Previeni doppia inizializzazione
    if (window.Toolmap?.__loaded) return;

    const CONSTANTS = window.TOOLMAP_CONSTANTS;
    const ToolUtils = window.ToolUtils;

    const CONFIG = {
        rootName: CONSTANTS.ROOT_NAME,
        registryPath: 'data/registry.json'
    };

    const Toolmap = window.Toolmap || {};
    window.Toolmap = Toolmap;

    // ========================================================================
    // FETCH REGISTRY (sempre fresco, no cache)
    // ========================================================================

    async function fetchRegistry() {
        try {
            const response = await fetch(CONFIG.registryPath, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (response.ok) {
                return await response.text();
            }
        } catch (error) {
            console.error('[registry] Errore fetch:', CONFIG.registryPath, error);
        }
        return null;
    }

    // ========================================================================
    // BUILD INDICES
    // ========================================================================

    /**
     * Costruisce gli indici:
     * - toolsById: Map ID → tool object
     * - nodeIndex: Struttura gerarchica categorie
     * - allToolsUnder: Map path → Set tool IDs sotto quel path
     */
    function buildIndices(tools) {
        const toolsById = {};
        const nodeIndex = { [CONFIG.rootName]: { tools: [], children: new Set() } };
        const allToolsUnder = {};
        const allPathKeys = new Set([CONFIG.rootName]);
        const toolLeafKey = {};

        // Processa ogni tool
        for (const tool of tools) {
            const id = ToolUtils.normalizeId(tool.id || tool.name || tool.title);
            if (!id) continue;

            const phase = ToolUtils.getPrimaryPhase(tool);
            const color = phase ? ToolUtils.getPhaseColor(phase) : null;
            const categoryPath = ToolUtils.getCategoryPath(tool);
            const pathSegments = [CONFIG.rootName, ...categoryPath];
            const leafKey = ToolUtils.createPathKey(pathSegments);

            // Salva tool arricchito
            toolsById[id] = {
                ...tool,
                id,
                phase,
                phaseColor: color,
                path: pathSegments
            };
            toolLeafKey[id] = leafKey;

            // Registra nodi path
            for (let i = 1; i <= pathSegments.length; i++) {
                const key = ToolUtils.createPathKey(pathSegments.slice(0, i));

                if (!nodeIndex[key]) {
                    nodeIndex[key] = { tools: [], children: new Set() };
                }

                allPathKeys.add(key);

                // Link parent-child
                if (i > 1) {
                    const parentKey = ToolUtils.createPathKey(pathSegments.slice(0, i - 1));
                    nodeIndex[parentKey].children.add(key);
                }
            }

            // Assegna tool al nodo foglia
            nodeIndex[leafKey].tools.push(id);
        }

        // Calcola distribuzione tool (ogni tool appartiene a tutti i parent)
        for (const [toolId, leafKey] of Object.entries(toolLeafKey)) {
            const segments = leafKey.split('>');

            for (let i = 1; i <= segments.length; i++) {
                const key = ToolUtils.createPathKey(segments.slice(0, i));

                if (!allToolsUnder[key]) {
                    allToolsUnder[key] = new Set();
                }

                allToolsUnder[key].add(toolId);
            }
        }

        // Finalizza (converti Set in Array per children)
        for (const key of allPathKeys) {
            if (!allToolsUnder[key]) allToolsUnder[key] = new Set();
            nodeIndex[key].children = Array.from(nodeIndex[key].children);
        }

        return {
            rootName: CONFIG.rootName,
            toolsById,
            nodeIndex,
            allToolsUnder,
            allPathKeys: Array.from(allPathKeys)
        };
    }

    // ========================================================================
    // FALLBACK (in caso di errore caricamento)
    // ========================================================================

    function applyFallback() {
        Object.assign(Toolmap, {
            registry: [],
            toolsById: {},
            nodeIndex: { [CONFIG.rootName]: { tools: [], children: [] } },
            allToolsUnder: { [CONFIG.rootName]: new Set() },
            allPathKeys: [CONFIG.rootName],
            rootName: CONFIG.rootName,
            __loaded: true
        });

        window.dispatchEvent(new CustomEvent('tm:registry:ready', {
            detail: {
                rootName: CONFIG.rootName,
                totals: { tools: 0, nodes: 1 },
                keys: [CONFIG.rootName]
            }
        }));

        window.dispatchEvent(new CustomEvent('tm:scope:set', { detail: { all: true } }));
    }

    // ========================================================================
    // INIT
    // ========================================================================

    async function initialize() {
        if (Toolmap.__loaded) return;

        // Carica sempre dal server (no cache session)
        const json = await fetchRegistry();

        if (!json) {
            console.warn('[registry] Nessun dato, uso fallback');
            applyFallback();
            return;
        }

        let tools;
        try {
            tools = JSON.parse(json);
        } catch (error) {
            console.error('[registry] Errore parsing JSON:', error);
            applyFallback();
            return;
        }

        if (!Array.isArray(tools)) {
            console.error('[registry] JSON non è array');
            applyFallback();
            return;
        }

        // Costruisci indici
        const built = buildIndices(tools);

        // Assegna a Toolmap globale
        Object.assign(Toolmap, {
            registry: tools,
            toolsById: built.toolsById,
            nodeIndex: built.nodeIndex,
            allToolsUnder: built.allToolsUnder,
            allPathKeys: built.allPathKeys,
            rootName: built.rootName,
            __loaded: true
        });

        // Notifica caricamento completato
        window.dispatchEvent(new CustomEvent('tm:registry:source', {
            detail: { source: 'server' }
        }));

        window.dispatchEvent(new CustomEvent('tm:registry:ready', {
            detail: {
                rootName: built.rootName,
                totals: {
                    tools: Object.keys(built.toolsById).length,
                    nodes: built.allPathKeys.length
                },
                keys: built.allPathKeys
            }
        }));

        window.dispatchEvent(new CustomEvent('tm:scope:set', {
            detail: { all: true }
        }));
    }

    // Avvia inizializzazione
    initialize().catch(error => {
        console.error('[registry] Errore init:', error);
        applyFallback();
    });

})();