// ============================================================================
// tools-loader.js
// ============================================================================

(() => {
    'use strict';

    // Prevent double initialization
    if (window.Toolmap?.__loaded) return;

    // ============================================================================
    // CONSTANTS
    // ============================================================================

    const CONFIG = {
        rootName: 'Root',
        registryPaths: [
            '../data/registry.yml',
            '../../data/registry.yml',
            './data/registry.yml',
            '/data/registry.yml',
            'data/registry.yml',
            'registry.yml'
        ]
    };

    const SESSION_KEYS = {
        registryYAML: 'tm:session:registry-yaml',
        booted: 'tm:session:booted'
    };

    const PHASE_COLORS = {
        '00_Common': 'hsl(270 91% 65%)',
        '01_Information_Gathering': 'hsl(210 100% 62%)',
        '02_Exploitation': 'hsl(4 85% 62%)',
        '03_Post_Exploitation': 'hsl(32 98% 55%)',
        '04_Miscellaneous': 'hsl(158 64% 52%)'
    };

    // ============================================================================
    // TOOLMAP INITIALIZATION
    // ============================================================================

    const Toolmap = window.Toolmap || {};
    window.Toolmap = Toolmap;

    // ============================================================================
    // SESSION STORAGE UTILITIES
    // ============================================================================

    const SessionStorage = {
        get(key) {
            try {
                return sessionStorage.getItem(key);
            } catch {
                return null;
            }
        },

        set(key, value) {
            try {
                sessionStorage.setItem(key, value);
            } catch {}
        }
    };

    // ============================================================================
    // NAVIGATION DETECTION
    // ============================================================================

    const NavigationDetector = {
        isReloadNavigation() {
            if (this.isPerformanceReload()) return true;
            return this.hasBootedBefore();
        },

        isPerformanceReload() {
            try {
                const entries = performance.getEntriesByType('navigation');
                const navigation = entries[0];
                return navigation?.type === 'reload';
            } catch {
                return false;
            }
        },

        hasBootedBefore() {
            return SessionStorage.get(SESSION_KEYS.booted) === '1';
        }
    };

    // ============================================================================
    // YAML UTILITIES
    // ============================================================================

    const YAMLUtils = {
        isAvailable() {
            return window.jsyaml && typeof window.jsyaml.load === 'function';
        },

        ensureAvailable() {
            if (this.isAvailable()) return true;

            console.error('[tools-loader] js-yaml not found: include js-yaml BEFORE this file.');
            return false;
        },

        parse(yamlText) {
            try {
                const data = window.jsyaml.load(yamlText);

                if (Array.isArray(data)) return data;

                console.error(
                    '[tools-loader] Invalid format: expected ARRAY of tools (flat list). Received:',
                    typeof data
                );
                return [];
            } catch (error) {
                console.error('[tools-loader] YAML parsing error:', error);
                return [];
            }
        }
    };

    // ============================================================================
    // REGISTRY FETCHER
    // ============================================================================

    const RegistryFetcher = {
        async fetchFirst(paths) {
            for (const url of paths) {
                try {
                    const response = await fetch(url, { cache: 'no-cache' });
                    if (response.ok) {
                        return await response.text();
                    }
                } catch {
                    // Continue to next path
                }
            }
            return null;
        },

        async getYAML() {
            const serverYAML = await this.fetchFirst(CONFIG.registryPaths);
            const sessionYAML = SessionStorage.get(SESSION_KEYS.registryYAML);
            const preferSession = NavigationDetector.isReloadNavigation();

            return this.selectYAML(serverYAML, sessionYAML, preferSession);
        },

        selectYAML(serverYAML, sessionYAML, preferSession) {
            let chosenYAML = null;
            let source = 'server';

            if (preferSession && sessionYAML) {
                chosenYAML = sessionYAML;
                source = 'session';
            } else if (serverYAML) {
                chosenYAML = serverYAML;
                source = 'server';
                SessionStorage.set(SESSION_KEYS.registryYAML, serverYAML);
            } else if (sessionYAML) {
                chosenYAML = sessionYAML;
                source = 'session(no-server)';
            }

            return { yaml: chosenYAML, source };
        }
    };

    // ============================================================================
    // TOOL UTILITIES
    // ============================================================================

    const ToolUtils = {
        normalizeId(str) {
            return String(str || '')
                .trim()
                .toLowerCase()
                .replace(/[^\w\- ]+/g, '')
                .replace(/\s+/g, '-')
                .replace(/\-+/g, '-');
        },

        getPhaseColor(phase) {
            return PHASE_COLORS[phase] || 'hsl(var(--accent))';
        },

        createPathKey(segments) {
            return segments.join('>');
        }
    };

    // ============================================================================
    // REGISTRY BUILDER
    // ============================================================================

    const RegistryBuilder = {
        buildFromFlatList(list) {
            const toolsById = {};
            const nodeIndex = {};
            const allToolsUnder = {};
            const allPathKeys = new Set();
            const toolLeafKey = {};

            this.initializeRoot(nodeIndex, allPathKeys);
            this.processTools(list, toolsById, nodeIndex, allPathKeys, toolLeafKey);
            this.calculateToolDistribution(toolLeafKey, allToolsUnder);
            this.finalizeNodeIndex(nodeIndex, allPathKeys, allToolsUnder);

            return {
                rootName: CONFIG.rootName,
                toolsById,
                nodeIndex,
                allToolsUnder,
                allPathKeys: Array.from(allPathKeys)
            };
        },

        initializeRoot(nodeIndex, allPathKeys) {
            nodeIndex[CONFIG.rootName] = { tools: [], children: new Set() };
            allPathKeys.add(CONFIG.rootName);
        },

        processTools(list, toolsById, nodeIndex, allPathKeys, toolLeafKey) {
            for (const rawTool of (Array.isArray(list) ? list : [])) {
                this.processSingleTool(rawTool, toolsById, nodeIndex, allPathKeys, toolLeafKey);
            }
        },

        processSingleTool(rawTool, toolsById, nodeIndex, allPathKeys, toolLeafKey) {
            const id = ToolUtils.normalizeId(rawTool.id || rawTool.name || rawTool.title);
            if (!id) return;

            const phase = this.extractPhase(rawTool);
            const color = phase ? ToolUtils.getPhaseColor(phase) : null;
            const pathSegments = this.buildPathSegments(rawTool);
            const leafKey = ToolUtils.createPathKey(pathSegments);

            toolsById[id] = { ...rawTool, id, phase, phaseColor: color, path: pathSegments };
            toolLeafKey[id] = leafKey;

            this.registerPathNodes(pathSegments, nodeIndex, allPathKeys);
            this.assignToolToLeaf(leafKey, id, nodeIndex);
        },

        extractPhase(tool) {
            return tool.phase || (Array.isArray(tool.phases) ? tool.phases[0] : null) || null;
        },

        buildPathSegments(tool) {
            const categoryPath = Array.isArray(tool.category_path)
                ? tool.category_path.filter(Boolean)
                : [];
            return [CONFIG.rootName, ...categoryPath];
        },

        registerPathNodes(pathSegments, nodeIndex, allPathKeys) {
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
        },

        assignToolToLeaf(leafKey, toolId, nodeIndex) {
            nodeIndex[leafKey].tools.push(toolId);
        },

        calculateToolDistribution(toolLeafKey, allToolsUnder) {
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
        },

        finalizeNodeIndex(nodeIndex, allPathKeys, allToolsUnder) {
            for (const key of allPathKeys) {
                if (!allToolsUnder[key]) {
                    allToolsUnder[key] = new Set();
                }
                nodeIndex[key].children = Array.from(nodeIndex[key].children);
            }
        }
    };

    // ============================================================================
    // FALLBACK HANDLER
    // ============================================================================

    const FallbackHandler = {
        createEmptyToolmap() {
            return {
                registry: [],
                toolsById: {},
                nodeIndex: { [CONFIG.rootName]: { tools: [], children: [] } },
                allToolsUnder: { [CONFIG.rootName]: new Set() },
                allPathKeys: [CONFIG.rootName],
                rootName: CONFIG.rootName,
                __loaded: true
            };
        },

        applyFallback() {
            Object.assign(Toolmap, this.createEmptyToolmap());
            this.dispatchEvents();
            SessionStorage.set(SESSION_KEYS.booted, '1');
        },

        dispatchEvents() {
            window.dispatchEvent(
                new CustomEvent('tm:registry:ready', {
                    detail: {
                        rootName: CONFIG.rootName,
                        totals: { tools: 0, nodes: 1 },
                        keys: [CONFIG.rootName]
                    }
                })
            );

            window.dispatchEvent(
                new CustomEvent('tm:scope:set', {
                    detail: { all: true }
                })
            );
        }
    };

    // ============================================================================
    // EVENT DISPATCHER
    // ============================================================================

    const EventDispatcher = {
        dispatchSource(source) {
            try {
                window.dispatchEvent(
                    new CustomEvent('tm:registry:source', {
                        detail: { source }
                    })
                );
            } catch {}
        },

        dispatchReady(built) {
            window.dispatchEvent(
                new CustomEvent('tm:registry:ready', {
                    detail: {
                        rootName: built.rootName,
                        totals: {
                            tools: Object.keys(built.toolsById).length,
                            nodes: built.allPathKeys.length
                        },
                        keys: built.allPathKeys
                    }
                })
            );
        },

        dispatchShowAll() {
            window.dispatchEvent(
                new CustomEvent('tm:scope:set', {
                    detail: { all: true }
                })
            );
        }
    };

    // ============================================================================
    // MAIN INITIALIZATION
    // ============================================================================

    async function initialize() {
        if (Toolmap.__loaded) return;

        if (!YAMLUtils.ensureAvailable()) {
            FallbackHandler.applyFallback();
            return;
        }

        const { yaml, source } = await RegistryFetcher.getYAML();

        if (!yaml) {
            console.error(
                '[tools-loader] registry.yml not found. Paths tried:',
                CONFIG.registryPaths
            );
            FallbackHandler.applyFallback();
            return;
        }

        const list = YAMLUtils.parse(yaml);
        const built = RegistryBuilder.buildFromFlatList(list);

        Object.assign(Toolmap, {
            registry: list,
            toolsById: built.toolsById,
            nodeIndex: built.nodeIndex,
            allToolsUnder: built.allToolsUnder,
            allPathKeys: built.allPathKeys,
            rootName: built.rootName,
            __loaded: true
        });

        EventDispatcher.dispatchSource(source);
        EventDispatcher.dispatchReady(built);
        EventDispatcher.dispatchShowAll();

        SessionStorage.set(SESSION_KEYS.booted, '1');
    }

    // Execute initialization and handle any errors
    initialize().catch(error => {
        console.error('[tools-loader] Initialization failed:', error);
        FallbackHandler.applyFallback();
    });
})();