// ============================================================================
// registry.js
// ============================================================================
// Descrizione: Carica registry.json SEMPRE fresco dal server (no cache)
// Dipendenze: constants.js, utils.js

(() => {
    'use strict';

    if (window.Toolmap?.__loaded) return;

    const CONSTANTS = window.TOOLMAP_CONSTANTS;
    const ToolUtils = window.ToolUtils;

    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    const CONFIG = {
        rootName: CONSTANTS.ROOT_NAME,
        registryPath: 'data/registry.json' // Path singolo
    };

    const Toolmap = window.Toolmap || {};
    window.Toolmap = Toolmap;

    // ============================================================================
    // FETCH REGISTRY - SEMPRE dal server (no cache/session)
    // ============================================================================

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
                const text = await response.text();
                console.log('[registry] Loaded fresh from server:', CONFIG.registryPath);
                return text;
            }
        } catch (error) {
            console.error('[registry] Failed to fetch from:', CONFIG.registryPath, error);
        }
        return null;
    }

    // ============================================================================
    // BUILD INDICES
    // ============================================================================

    function buildIndices(tools) {
        const toolsById = {};
        const nodeIndex = { [CONFIG.rootName]: { tools: [], children: new Set() } };
        const allToolsUnder = {};
        const allPathKeys = new Set([CONFIG.rootName]);
        const toolLeafKey = {};

        // Process each tool
        for (const tool of tools) {
            const id = ToolUtils.normalizeId(tool.id || tool.name || tool.title);
            if (!id) continue;

            const phase = ToolUtils.getPrimaryPhase(tool);
            const color = phase ? ToolUtils.getPhaseColor(phase) : null;
            const categoryPath = ToolUtils.getCategoryPath(tool);
            const pathSegments = [CONFIG.rootName, ...categoryPath];
            const leafKey = ToolUtils.createPathKey(pathSegments);

            // Store tool
            toolsById[id] = { ...tool, id, phase, phaseColor: color, path: pathSegments };
            toolLeafKey[id] = leafKey;

            // Register path nodes
            for (let i = 1; i <= pathSegments.length; i++) {
                const key = ToolUtils.createPathKey(pathSegments.slice(0, i));

                if (!nodeIndex[key]) {
                    nodeIndex[key] = { tools: [], children: new Set() };
                }

                allPathKeys.add(key);

                if (i > 1) {
                    const parentKey = ToolUtils.createPathKey(pathSegments.slice(0, i - 1));
                    nodeIndex[parentKey].children.add(key);
                }
            }

            // Assign tool to leaf
            nodeIndex[leafKey].tools.push(id);
        }

        // Calculate tool distribution
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

        // Finalize
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

    // ============================================================================
    // FALLBACK
    // ============================================================================

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

    // ============================================================================
    // INIT
    // ============================================================================

    async function initialize() {
        if (Toolmap.__loaded) return;

        // ========================================================================
        // CARICA SEMPRE DAL SERVER (no session storage)
        // ========================================================================
        const json = await fetchRegistry();

        if (!json) {
            console.error('[registry] JSON not found at:', CONFIG.registryPath);
            applyFallback();
            return;
        }

        let tools;
        try {
            tools = JSON.parse(json);
        } catch (error) {
            console.error('[registry] Parse error:', error);
            applyFallback();
            return;
        }

        if (!Array.isArray(tools)) {
            console.error('[registry] Expected array, got:', typeof tools);
            applyFallback();
            return;
        }

        const built = buildIndices(tools);

        Object.assign(Toolmap, {
            registry: tools,
            toolsById: built.toolsById,
            nodeIndex: built.nodeIndex,
            allToolsUnder: built.allToolsUnder,
            allPathKeys: built.allPathKeys,
            rootName: built.rootName,
            __loaded: true
        });

        console.log(`[registry] Loaded ${tools.length} tools fresh from server`);

        window.dispatchEvent(new CustomEvent('tm:registry:source', { detail: { source: 'server' } }));
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
        window.dispatchEvent(new CustomEvent('tm:scope:set', { detail: { all: true } }));
    }

    initialize().catch(error => {
        console.error('[registry] Init failed:', error);
        applyFallback();
    });
})();