// ============================================================================
// tools-manager.js
// ============================================================================

/**
 * @typedef {Object} ToolItem
 * @property {string} id
 * @property {string=} name
 * @property {string=} title
 * @property {string=} phase
 * @property {string[]=} phases
 * @property {string[]=} category_path
 * @property {string[]=} categoryPath
 * @property {string=} repo
 * @property {string=} desc
 * @property {string=} desc_long
 * @property {string[]=} caps
 * @property {string[]=} tags
 * @property {string=} icon
 * @property {string=} notes
 * @property {string=} phaseColor
 * @property {string[]=} path
 */

(() => {
    'use strict';

    // ============================================================================
    // CONSTANTS & CONFIGURATION
    // ============================================================================

    const SELECTORS = {
        grid: 'toolsGrid',
        resetBtn: 'resetBtn',
        searchInput: 'searchInput'
    };

    const STORAGE_KEYS = {
        search: 'tm:search:q',
        pathKey: 'tm:active:path',
        pathSlash: 'tm:active:slash',
        stars: 'tm:stars',
        sessYAML: 'tm:session:registry-yaml'
    };

    const PHASE_COLORS = {
        '00_Common': 'hsl(270 91% 65%)',
        '01_Information_Gathering': 'hsl(210 100% 62%)',
        '02_Exploitation': 'hsl(4 85% 62%)',
        '03_Post_Exploitation': 'hsl(32 98% 55%)',
        '04_Miscellaneous': 'hsl(158 64% 52%)'
    };

    const SEARCH_WEIGHTS = {
        name: 6,
        caps: 4,
        tags: 3,
        desc: 2,
        desc_long: 2,
        phase: 5,
        node: 5
    };

    const YAML_DUMP_OPTIONS = {
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
        flowLevel: 2,
        quotingType: '"',
        forceQuotes: true
    };

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    const state = {
        scopeAll: false,
        scopeIds: null,
        pathKey: null,
        search: '',
        isResetting: false
    };

    let grid, resetBtn, notesModal, detailsModal, rendererAdapter;
    let hasVisitedAnyPhase = false;
    let eventsWired = false;

    // ============================================================================
    // STORAGE UTILITIES
    // ============================================================================

    const Storage = {
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
            } catch {
            }
        },

        remove(key) {
            try {
                sessionStorage.removeItem(key);
            } catch {
            }
        },

        getJSON(key, defaultValue = {}) {
            try {
                return JSON.parse(this.get(key) || 'null') || defaultValue;
            } catch {
                return defaultValue;
            }
        },

        setJSON(key, value) {
            try {
                this.set(key, JSON.stringify(value || {}));
            } catch {
            }
        }
    };

    // ============================================================================
    // STARS MANAGEMENT
    // ============================================================================

    const Stars = {
        load() {
            return Storage.getJSON(STORAGE_KEYS.stars, {});
        },

        save(map) {
            Storage.setJSON(STORAGE_KEYS.stars, map);
        },

        toggle(toolId, value) {
            const map = this.load();
            map[toolId] = value;
            this.save(map);
            return map;
        }
    };

    // ============================================================================
    // TOOL UTILITIES
    // ============================================================================

    const ToolUtils = {
        getName(tool) {
            return (tool?.title || tool?.name || tool?.id || '').toString();
        },

        getCategoryPath(tool) {
            if (!tool) return [];
            return Array.isArray(tool.category_path) ? tool.category_path
                : Array.isArray(tool.categoryPath) ? tool.categoryPath
                    : [];
        },

        getPrimaryPhase(tool) {
            if (tool?.phase) return tool.phase;
            if (Array.isArray(tool?.phases) && tool.phases.length) return tool.phases[0];
            if (Array.isArray(tool?.category_path) && tool.category_path.length) return tool.category_path[0];
            return '';
        },

        getPhaseGroupKey(tool) {
            const phase = this.getPrimaryPhase(tool) || '';
            const match = /^(\d{2,})\D/.exec(phase);
            return match
                ? {num: parseInt(match[1], 10), str: ''}
                : {num: 9998, str: phase.toLowerCase()};
        },

        readBestInFlag(tool) {
            if (!tool || typeof tool !== 'object') return false;
            return !!(tool['best_in'] ?? tool['bestIn'] ?? tool['best-in'] ?? tool['best']);
        },

        compareByName(a, b) {
            return ToolUtils.getName(a).localeCompare(
                ToolUtils.getName(b),
                undefined,
                {sensitivity: 'base'}
            );
        },

        getPhaseColor(phase) {
            return PHASE_COLORS[phase] || 'hsl(var(--accent))';
        }
    };

    // ============================================================================
    // SEARCH UTILITIES
    // ============================================================================

    const SearchUtils = {
        normalize(str) {
            return String(str || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .trim();
        },

        stripSeparators(str) {
            return String(str || '').replace(/[\s_\-\/\\>.:]+/g, '');
        },

        normalizeLabel(str) {
            const cleaned = String(str || '')
                .replace(/^\d+[_-]*/, '')
                .replace(/_/g, ' ');
            return SearchUtils.normalize(cleaned);
        },

        tokenize(query) {
            query = String(query || '').trim();
            if (!query) return [];

            const tokens = [];
            const regex = /"([^"]+)"|'([^']+)'|([A-Za-z0-9_.\-\/\\> ]+)/g;
            let match;

            while ((match = regex.exec(query)) !== null) {
                const chunk = match[1] || match[2] || match[3] || '';
                const parts = chunk.split(/[^A-Za-z0-9]+/).filter(Boolean);

                for (const part of parts) {
                    const normalized = SearchUtils.normalize(part);
                    if (normalized) tokens.push(normalized);
                }
            }

            return tokens;
        }
    };

    // ============================================================================
    // DOM UTILITIES
    // ============================================================================

    const DOMUtils = {
        escapeHtml(str) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return String(str || '').replace(/[&<>"']/g, m => map[m]);
        },

        escapeAttr(str) {
            return DOMUtils.escapeHtml(str).replace(/"/g, '&quot;');
        },

        formatLabel(str) {
            return String(str || '')
                .replace(/^\d+[_-]*/, '')
                .replace(/_/g, ' ')
                .trim();
        },

        ready(callback) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback, {once: true});
            } else {
                (window.queueMicrotask || setTimeout)(callback, 0);
            }
        }
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    DOMUtils.ready(() => {
        initializeDOM();
        restoreState();
        wireEvents();
        render();
    });

    function initializeDOM() {
        grid = document.getElementById(SELECTORS.grid);
        resetBtn = document.getElementById(SELECTORS.resetBtn);

        if (window.NotesModal) {
            notesModal = new window.NotesModal(saveNoteAndExport);
        }
        detailsModal = new ToolDetailsModal();
    }

    function restoreState() {
        const savedSearch = Storage.get(STORAGE_KEYS.search) || '';
        state.search = savedSearch;

        const searchInput = document.getElementById(SELECTORS.searchInput);
        if (searchInput && savedSearch) {
            searchInput.value = savedSearch;
        }

        if (savedSearch) {
            window.dispatchEvent(new CustomEvent('tm:search:set', {
                detail: {q: savedSearch, hasQuery: true}
            }));
        }

        const savedPathKey = Storage.get(STORAGE_KEYS.pathKey);
        if (savedPathKey && !savedSearch) {
            state.pathKey = savedPathKey;
            state.scopeAll = false;

            const tm = window.Toolmap || {};
            if (tm.allToolsUnder?.[savedPathKey]) {
                state.scopeIds = Array.from(tm.allToolsUnder[savedPathKey]);
            }
        }
    }

    // ============================================================================
    // EVENT WIRING
    // ============================================================================

    function wireEvents() {
        if (eventsWired) return;
        eventsWired = true;

        window.addEventListener('tm:scope:set', handleScopeSet);
        window.addEventListener('tm:tool:toggleStar', handleToggleStar);
        window.addEventListener('tm:search:phases:changed', handleSearchPhasesChanged);
        window.addEventListener('tm:search:set', handleSearchSet);
        window.addEventListener('tm:phase:color', handlePhaseColor);
        window.addEventListener('tm:tools:showAll', handleShowAll);
        window.addEventListener('tm:reset', handleReset);
        window.addEventListener('tm:registry:ready', handleRegistryReady);
        window.addEventListener('tm:registry:download', exportFullRegistryYAML);
        window.addEventListener('tm:card:openNotes', handleCardOpenNotes);
        window.addEventListener('tm:card:openDetails', handleCardOpenDetails);

        resetBtn?.addEventListener('click', handleResetClick);
    }

    function handleScopeSet(event) {
        if (state.isResetting && !event.detail?.all) return;

        const {all, ids, pathKey} = event.detail || {};
        state.scopeAll = !!all || (!ids && !pathKey);
        state.scopeIds = ids || null;
        state.pathKey = pathKey || null;

        if (state.pathKey && typeof state.pathKey === 'string') {
            const parts = state.pathKey.split('>').filter(Boolean);
            const first = (parts[0]?.toLowerCase() === 'root') ? parts[1] : parts[0];
            if (first) hasVisitedAnyPhase = true;
        }

        render();
    }

    function handleToggleStar(event) {
        const {id, value} = event.detail || {};
        if (!id) return;

        Stars.toggle(id, !!value);
        const tm = window.Toolmap || {};

        if (tm.toolsById?.[id]) {
            tm.toolsById[id]._starred = !!value;
        }

        const record = tm.registry?.find(x => x?.id === id);
        if (record) {
            record.best_in = !!value;
        }

        const newYAML = serializeFullRegistryYAML();
        if (newYAML) {
            Storage.set(STORAGE_KEYS.sessYAML, newYAML);
        }

        render();
    }

    function handleSearchPhasesChanged() {
        if (state.search) render();
    }

    function handleSearchSet(event) {
        const newSearch = (event.detail?.q || '').trim();
        const hadSearch = !!state.search;
        const hasSearch = !!newSearch;

        state.search = newSearch;

        if (hasSearch) {
            Storage.set(STORAGE_KEYS.search, state.search);
        } else {
            Storage.remove(STORAGE_KEYS.search);
        }

        const ctx = buildSearchContext();
        window.__lastSearchContext = ctx;
        window.dispatchEvent(new CustomEvent('tm:search:context', {detail: ctx}));

        if (hadSearch && !hasSearch && !state.isResetting) {
            restoreSavedScope();
        }

        render();
    }

    function restoreSavedScope() {
        const savedPathKey = Storage.get(STORAGE_KEYS.pathKey);
        const savedPathSlash = Storage.get(STORAGE_KEYS.pathSlash);

        if (savedPathSlash) {
            const tm = window.Toolmap || {};
            const pathKey = savedPathKey || `Root>${savedPathSlash.replace(/\//g, '>')}`;
            const ids = tm.allToolsUnder?.[pathKey] ? Array.from(tm.allToolsUnder[pathKey]) : [];

            state.pathKey = pathKey;
            state.scopeAll = false;
            state.scopeIds = ids;

            window.dispatchEvent(new CustomEvent('tm:scope:set', {
                detail: {pathKey, ids, source: 'search-cleared'}
            }));
        }
    }

    function handlePhaseColor(event) {
        const content = document.querySelector('.content');
        const color = event.detail?.color || null;

        if (content) {
            if (color) {
                content.style.setProperty('--hover-color', `color-mix(in srgb, ${color} 100%, transparent)`);
            } else {
                content.style.removeProperty('--hover-color');
            }
        }
        window.dispatchEvent(new CustomEvent('tm:phase:color:apply', {detail: {color}}));
    }

    function handleShowAll() {
        state.scopeAll = true;
        render();
    }

    function handleResetClick() {
        state.isResetting = true;

        // Clear session storage
        Storage.remove(STORAGE_KEYS.search);
        Storage.remove(STORAGE_KEYS.pathKey);
        Storage.remove(STORAGE_KEYS.pathSlash);

        // Reset search input
        const searchInput = document.getElementById(SELECTORS.searchInput);
        if (searchInput) searchInput.value = '';

        // Reset search context
        const emptyContext = {hasQuery: false, phaseKeys: [], paths: [], countsByPhase: {}};
        window.__lastSearchContext = emptyContext;
        window.dispatchEvent(new CustomEvent('tm:search:context', {detail: emptyContext}));

        // Reset state
        state.scopeAll = true;
        state.scopeIds = null;
        state.pathKey = null;
        state.search = '';
        hasVisitedAnyPhase = false;

        // Dispatch reset events
        window.dispatchEvent(new Event('tm:reset'));
        window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {all: true}}));
        window.dispatchEvent(new CustomEvent('tm:phase:color', {detail: {color: null}}));

        render();

        setTimeout(() => {
            state.isResetting = false;
        }, 100);
    }

    function handleReset() {
        if (state.isResetting) return;

        const content = document.querySelector('.content');
        content?.style.removeProperty('--hover-color');

        state.scopeAll = true;
        state.scopeIds = null;
        state.pathKey = null;
        hasVisitedAnyPhase = false;
    }

    function handleRegistryReady() {
        const savedPathKey = Storage.get(STORAGE_KEYS.pathKey);
        if (savedPathKey && !state.search && !state.isResetting) {
            const tm = window.Toolmap || {};
            if (tm.allToolsUnder?.[savedPathKey]) {
                state.pathKey = savedPathKey;
                state.scopeAll = false;
                state.scopeIds = Array.from(tm.allToolsUnder[savedPathKey]);
                render();
            }
        }
    }

    function handleCardOpenNotes(event) {
        const tool = event.detail?.tool;
        if (tool && notesModal) notesModal.show(tool);
    }

    function handleCardOpenDetails(event) {
        const tool = event.detail?.tool;
        if (tool && detailsModal) detailsModal.show(tool);
    }

    // ============================================================================
    // RENDERING
    // ============================================================================

    function getRenderer() {
        if (rendererAdapter) return rendererAdapter;

        // Try new instance
        if (window.ToolsRenderer && typeof window.ToolsRenderer === 'function') {
            try {
                const instance = new window.ToolsRenderer(
                    SELECTORS.grid,
                    (tool) => detailsModal?.show(tool),
                    (tool) => notesModal?.show(tool),
                    {activePath: []}
                );
                window.toolsRenderer = instance;
                rendererAdapter = {
                    kind: 'instance-new',
                    render: (tools) => instance.render(tools)
                };
                return rendererAdapter;
            } catch {
            }
        }

        // Try existing instance
        if (window.toolsRenderer?.render) {
            rendererAdapter = {
                kind: 'instance-existing',
                render: (tools) => window.toolsRenderer.render(tools)
            };
            return rendererAdapter;
        }

        // Try static method
        if (window.ToolsRenderer?.render) {
            rendererAdapter = {
                kind: 'static',
                render: (tools) => window.ToolsRenderer.render(tools, grid)
            };
            return rendererAdapter;
        }

        // Fallback
        rendererAdapter = {
            kind: 'fallback',
            render: (tools) => fallbackRender(tools)
        };
        return rendererAdapter;
    }

    function computeVisibleTools() {
        const tm = window.Toolmap || {};
        const toolsById = tm.toolsById || {};
        const allIds = Object.keys(toolsById);

        const query = SearchUtils.normalize(state.search);
        const tokens = SearchUtils.tokenize(query);

        let baseIds = getBaseIds(allIds, toolsById, tokens);

        if (!tokens.length) {
            return baseIds.map(id => toolsById[id]).filter(Boolean);
        }

        return searchAndRank(baseIds, toolsById, tokens);
    }

    function getBaseIds(allIds, toolsById, tokens) {
        if (!tokens.length) {
            return state.scopeAll ? allIds : (state.scopeIds || []);
        }

        let baseIds = allIds;
        const sidebar = document.getElementById('sidebar');

        if (sidebar?.classList.contains('search-mode')) {
            const isCollapsed = sidebar.classList.contains('collapsed');

            if (isCollapsed) {
                // Sidebar collapsed: usa state.scopeIds se presente (da hover-search-phase)
                if (state.scopeIds && state.scopeIds.length > 0) {
                    return state.scopeIds;
                }

                // Fallback: filtra per hover-pane attivo
                const hoverPane = document.querySelector('.hover-pane.active');
                if (hoverPane) {
                    const hoverPhase = hoverPane.dataset.phase;
                    if (hoverPhase) {
                        baseIds = baseIds.filter(id => {
                            const tool = toolsById[id];
                            if (!tool) return false;
                            const toolPhase = tool.phase || (Array.isArray(tool.phases) ? tool.phases[0] : null);
                            return toolPhase === hoverPhase;
                        });
                    }
                }
            } else {
                // Sidebar aperta: filtra per fasi aperte
                const openPhases = new Set();

                document.querySelectorAll('.nav-item.open').forEach(item => {
                    openPhases.add(item.dataset.phase);
                });

                if (openPhases.size > 0) {
                    baseIds = baseIds.filter(id => {
                        const tool = toolsById[id];
                        if (!tool) return false;

                        const toolPhase = tool.phase || (Array.isArray(tool.phases) ? tool.phases[0] : null);
                        return toolPhase && openPhases.has(toolPhase);
                    });
                }
            }
        }

        return baseIds;
    }

    function searchAndRank(baseIds, toolsById, tokens) {
        const hits = [];

        for (const id of baseIds) {
            const tool = toolsById[id];
            if (!tool) continue;

            const searchFields = extractSearchFields(tool);
            const {matched, score} = scoreToolAgainstTokens(searchFields, tokens);

            if (matched) {
                hits.push({id, t: tool, score});
            }
        }

        hits.sort((a, b) =>
            b.score - a.score ||
            ToolUtils.getName(a.t).localeCompare(ToolUtils.getName(b.t))
        );

        return hits.map(h => h.t);
    }

    function extractSearchFields(tool) {
        const norm = SearchUtils.normalize;
        const strip = SearchUtils.stripSeparators;
        const normLabel = SearchUtils.normalizeLabel;

        const name = norm(tool.title || tool.name || tool.id || '');
        const desc = norm((tool.desc || tool.description || '') + ' ' + (tool.desc_long || ''));
        const caps = norm(Array.isArray(tool.caps) ? tool.caps.join(' ') : '');
        const tags = norm(Array.isArray(tool.tags) ? tool.tags.join(' ') : '');
        const phaseRaw = tool.phase || (Array.isArray(tool.phases) ? tool.phases[0] : '');
        const phase = normLabel(phaseRaw);
        const nodes = ToolUtils.getCategoryPath(tool).map(normLabel);
        const nodesJoined = nodes.join(' ');

        return {
            name, nameNS: strip(name),
            desc, descNS: strip(desc),
            caps, capsNS: strip(caps),
            tags, tagsNS: strip(tags),
            phase, phaseNS: strip(phase),
            nodes, nodesJoined, nodesNS: strip(nodesJoined)
        };
    }

    function scoreToolAgainstTokens(fields, tokens) {
        let score = 0;
        let matched = false;

        for (const token of tokens) {
            const tokenNS = SearchUtils.stripSeparators(token);
            let bestFieldScore = 0;

            // Name matching
            if (fields.name.includes(token) || fields.nameNS.includes(tokenNS)) {
                matched = true;
                bestFieldScore = Math.max(bestFieldScore, SEARCH_WEIGHTS.name);
                if (fields.name.startsWith(token) || fields.nameNS.startsWith(tokenNS)) {
                    score += 1;
                }
            }

            // Description matching
            if (fields.desc.includes(token) || fields.descNS.includes(tokenNS)) {
                matched = true;
                bestFieldScore = Math.max(bestFieldScore, SEARCH_WEIGHTS.desc);
            }

            // Capabilities matching
            if (fields.caps.includes(token) || fields.capsNS.includes(tokenNS)) {
                matched = true;
                bestFieldScore = Math.max(bestFieldScore, SEARCH_WEIGHTS.caps);
            }

            // Tags matching
            if (fields.tags.includes(token) || fields.tagsNS.includes(tokenNS)) {
                matched = true;
                bestFieldScore = Math.max(bestFieldScore, SEARCH_WEIGHTS.tags);
            }

            // Phase matching
            if (fields.phase && (fields.phase.includes(token) || token === fields.phase || fields.phaseNS.includes(tokenNS))) {
                matched = true;
                bestFieldScore = Math.max(bestFieldScore, SEARCH_WEIGHTS.phase);
            }

            // Node matching
            if (fields.nodesJoined.includes(token) || fields.nodesNS.includes(tokenNS) || fields.nodes.some(n => n === token)) {
                matched = true;
                bestFieldScore = Math.max(bestFieldScore, SEARCH_WEIGHTS.node);
                if (fields.nodes.some(n => n.startsWith(token)) || fields.nodesNS.startsWith(tokenNS)) {
                    score += 1;
                }
            }

            score += bestFieldScore;
        }

        return {matched, score};
    }

    function buildSearchContext() {
        const tm = window.Toolmap || {};
        const toolsById = tm.toolsById || {};
        const searchIds = Object.keys(toolsById);

        const query = SearchUtils.normalize(state.search);
        const tokens = SearchUtils.tokenize(query);

        if (!tokens.length) {
            return {hasQuery: false};
        }

        const phaseSet = new Set();
        const paths = [];
        const countsByPhase = {};

        for (const id of searchIds) {
            const tool = toolsById[id];
            if (!tool) continue;

            const fields = extractSearchFields(tool);
            const {matched} = scoreToolAgainstTokens(fields, tokens);

            if (!matched) continue;

            const catPath = ToolUtils.getCategoryPath(tool);
            const phaseKey = catPath.length ? catPath[0] : (tool.phase || null);

            if (phaseKey) {
                phaseSet.add(phaseKey);
                countsByPhase[phaseKey] = (countsByPhase[phaseKey] || 0) + 1;
            }

            if (catPath.length) {
                paths.push(catPath);
            }
        }

        return {
            hasQuery: true,
            phaseKeys: Array.from(phaseSet),
            paths,
            countsByPhase
        };
    }

    function render() {
        if (!grid) return;

        const tools = computeVisibleTools();
        applyStarredState(tools);
        sortTools(tools);
        notifyBreadcrumb(tools);

        if (!tools.length) {
            renderEmptyState();
            return;
        }

        const renderer = getRenderer();
        renderer.render(tools);
        enhanceCardsWithPhase(tools);
        window.refreshAllVLinesDebounced?.();
    }

    function applyStarredState(tools) {
        const starsMap = Stars.load();

        for (const tool of tools) {
            const localStar = Object.prototype.hasOwnProperty.call(starsMap, tool.id)
                ? !!starsMap[tool.id]
                : undefined;
            const registryStar = ToolUtils.readBestInFlag(tool);
            tool._starred = localStar !== undefined ? localStar : registryStar;
        }
    }

    function sortTools(tools) {
        tools.sort((a, b) => {
            // Sort by phase
            const keyA = ToolUtils.getPhaseGroupKey(a);
            const keyB = ToolUtils.getPhaseGroupKey(b);

            if (keyA.num !== keyB.num) return keyA.num - keyB.num;
            if (keyA.str !== keyB.str) {
                const cmp = keyA.str.localeCompare(keyB.str, undefined, {sensitivity: 'base'});
                if (cmp !== 0) return cmp;
            }

            // Sort by starred status
            const starA = a._starred ? 0 : 1;
            const starB = b._starred ? 0 : 1;
            if (starA !== starB) return starA - starB;

            // Sort by name
            return ToolUtils.compareByName(a, b);
        });
    }

    function notifyBreadcrumb(tools) {
        try {
            const summary = {
                toolsCount: tools.length,
                scopeAll: !!state.scopeAll,
                pathKey: state.pathKey || null,
                hasVisitedAnyPhase: !!hasVisitedAnyPhase
            };
            window.dispatchEvent(new CustomEvent('tm:context:summary', {detail: summary}));
        } catch {
        }
    }

    function renderEmptyState() {
        const message = state.search
            ? 'No matches for your search.'
            : 'No tools available for this category.';

        grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <h3>No tools found</h3>
                <p>${message} Try changing your selection or press <strong>Reset</strong>.</p>
            </div>
        `;
    }

    // ============================================================================
    // YAML SERIALIZATION
    // ============================================================================

    function serializeFullRegistryYAML() {
        const tm = window.Toolmap || {};
        const stars = Stars.load();
        const registry = tm.registry ? structuredClone(tm.registry) : null;

        if (!registry || !window.jsyaml) return '';

        updateRegistryRecords(registry, stars, tm);
        let yaml = window.jsyaml.dump(registry, YAML_DUMP_OPTIONS);
        yaml = normalizeYAML(yaml);

        return yaml;
    }

    function updateRegistryRecords(registry, stars, tm) {
        for (const item of registry) {
            const id = item?.id;
            if (!id) continue;

            const tool = tm.toolsById?.[id];
            if (tool) {
                item.notes = tool.notes || '';
            }

            const localStar = Object.prototype.hasOwnProperty.call(stars, id)
                ? !!stars[id]
                : undefined;
            const registryStar = !!(item['best_in'] ?? item['bestIn'] ?? item['best-in'] ?? item['best']);
            const starred = localStar !== undefined ? localStar : registryStar;

            delete item['bestIn'];
            delete item['best-in'];
            delete item['best'];
            item['best_in'] = !!starred;
        }
    }

    function normalizeYAML(yaml) {
        // Empty notes
        yaml = yaml.replace(/^(\s*)notes:\s*""\s*$/gm, '$1notes:');

        // Block scalar for multiline notes
        yaml = yaml.replace(/^(\s*)notes:\s*"([\s\S]*?)"$/gm, (match, indent, body) => {
            if (!/\\n/.test(body)) return match;

            const text = body
                .replace(/\\\\/g, '\\')
                .replace(/\\"/g, '"')
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t');
            const pad = indent + '  ';
            return `${indent}notes: |\n` + text.split('\n').map(l => pad + l).join('\n');
        });

        // Ensure blank line between records
        yaml = yaml.replace(/(\r?\n)+(?=^- )/gm, '\n\n');

        return yaml;
    }

    function exportFullRegistryYAML() {
        const yaml = serializeFullRegistryYAML();
        if (!yaml) return;

        Storage.set(STORAGE_KEYS.sessYAML, yaml);
        downloadFile('registry.yml', yaml, 'text/yaml;charset=utf-8');
    }

    // ============================================================================
    // CARD ENHANCEMENT
    // ============================================================================

    function enhanceCardsWithPhase(tools) {
        const toolsById = {};
        for (const tool of tools) {
            toolsById[tool.id] = tool;
        }

        const cards = grid.querySelectorAll('[data-tool-id], .tool-card');

        cards.forEach(card => {
            const id = card.getAttribute?.('data-tool-id') || card.getAttribute?.('data-id');
            const tool = id ? toolsById[id] : null;
            if (!tool) return;

            setCardPhaseAttributes(card, tool);
            attachNotesButton(card, tool);
            attachCardClickHandler(card, tool);
        });
    }

    function setCardPhaseAttributes(card, tool) {
        const phase = tool.phase || (Array.isArray(tool.phases) ? tool.phases[0] : null);
        if (phase) {
            card.setAttribute('data-phase', phase);
        }
        if (tool.phaseColor) {
            card.style.setProperty('--phase', tool.phaseColor);
        }
    }

    function attachNotesButton(card, tool) {
        const notesButton = card.querySelector?.('[data-role="notes"], [data-action="notes"], .btn-notes');
        if (!notesButton || !notesModal) return;

        if (!notesButton.dataset._boundNotes) {
            notesButton.dataset._boundNotes = '1';
            notesButton.addEventListener('click', (e) => {
                e.stopPropagation();
                notesModal.show(tool);
            });
        }
    }

    function attachCardClickHandler(card, tool) {
        if (card.dataset._boundCard) return;

        card.dataset._boundCard = '1';
        card.addEventListener('click', (e) => {
            if (e.target.closest?.('[data-action="notes"], .btn-notes')) return;
            detailsModal?.show(tool);
        });
    }

    // ============================================================================
    // FALLBACK RENDERER
    // ============================================================================

    function fallbackRender(tools) {
        const html = DOMUtils.escapeHtml;
        const attr = DOMUtils.escapeAttr;
        const fmt = DOMUtils.formatLabel;

        grid.innerHTML = `
            <div class="tools-grid-inner">
                ${tools.map(tool => `
                    <article class="card tool-card" 
                             data-tool-id="${html(tool.id)}" 
                             data-phase="${html(tool.phase || '')}">
                        <header class="card-h">
                            <div class="card-icon" 
                                 style="${tool.icon ? `background-image:url('${attr(tool.icon)}')` : ''}">
                            </div>
                            <h3 class="card-title">${html(tool.title || tool.name || tool.id)}</h3>
                        </header>
                        <p class="card-desc">${html(tool.desc || tool.description || 'No description')}</p>
                        <footer class="card-f">
                            ${tool.phase ? `<span class="pill" title="Phase">${html(fmt(tool.phase))}</span>` : ''}
                            <button class="btn btn-notes" type="button" data-action="notes">Notes</button>
                        </footer>
                    </article>
                `).join('')}
            </div>
        `;

        tools.forEach(tool => {
            const element = grid.querySelector(`[data-tool-id="${CSS.escape(tool.id)}"]`);
            if (element && tool.phaseColor) {
                element.style.setProperty('--phase', tool.phaseColor);
            }
        });

        enhanceCardsWithPhase(tools);
    }

    // ============================================================================
    // NOTES & FILE UTILITIES
    // ============================================================================

    function saveNoteAndExport(toolId, note) {
        const tm = window.Toolmap || {};
        const tool = tm.toolsById?.[toolId];
        if (tool) {
            tool.notes = note ?? '';
        }
        exportFullRegistryYAML();
    }

    function downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], {type: mimeType});
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    }

    // ============================================================================
    // TOOL DETAILS MODAL
    // ============================================================================

    class ToolDetailsModal {
        constructor() {
            this.modal = null;
            this._createModal();
        }

        show(tool) {
            if (!this.modal) return;

            this._setTitle(tool);
            this._setContent(tool);
            this._applyPhaseColor(tool);
            this._openModal();
        }

        hide() {
            if (!this.modal) return;

            this.modal.classList.remove('open');
            this.modal.classList.add('closing');

            const handleTransitionEnd = (e) => {
                if (e?.target && !e.target.classList.contains('modal-overlay')) return;

                this.modal.removeEventListener('transitionend', handleTransitionEnd);
                this.modal.style.display = 'none';
                this.modal.classList.remove('closing');
                document.body.style.overflow = '';
            };

            this.modal.addEventListener('transitionend', handleTransitionEnd);
            setTimeout(handleTransitionEnd, 260);
        }

        _createModal() {
            const modalHTML = `
                <div class="modal-overlay" id="detailsModal" style="display:none;">
                    <div class="modal-content" style="max-width:750px;">
                        <div class="modal-header">
                            <h2 class="modal-title"></h2>
                            <button class="modal-close" title="Close">&times;</button>
                        </div>
                        <div class="modal-body"></div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.modal = document.getElementById('detailsModal');

            this._attachEventListeners();
        }

        _attachEventListeners() {
            const closeButton = this.modal.querySelector('.modal-close');
            closeButton?.addEventListener('click', () => this.hide());

            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.hide();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                    this.hide();
                }
            });
        }

        _setTitle(tool) {
            const title = this.modal.querySelector('.modal-title');
            if (!title) return;

            const name = tool.name || tool.title || 'Tool Details';
            const versionChip = tool.version
                ? ` <span style="background: hsl(var(--muted));" class="version-chip">v${DOMUtils.escapeHtml(tool.version)}</span>`
                : '';

            title.innerHTML = DOMUtils.escapeHtml(name) + versionChip;
        }

        _setContent(tool) {
            const content = this.modal.querySelector('.modal-body');
            if (!content) return;

            content.innerHTML = this._buildContentHTML(tool);
            this._attachCopyPathHandler();
        }

        _buildContentHTML(tool) {
            const html = DOMUtils.escapeHtml;
            const attr = DOMUtils.escapeAttr;

            const description = tool.desc_long || tool.desc || tool.description || 'No description available';
            const phases = this._getPhasesHTML(tool);
            const capabilities = this._getCapabilitiesHTML(tool);
            const categoryPath = this._getCategoryPathHTML(tool);

            return `
                <div class="tool-details">
                    ${tool.icon ? `
                        <div class="tool-icon" style="background-image:url('${attr(tool.icon)}');
                             background-size:contain;background-position:center;background-repeat:no-repeat;
                             width:80px;height:80px;margin:0 auto 20px;"></div>
                    ` : ''}

                    <div class="detail-section">
                        <h3>Description</h3>
                        <div class="rt">${description}</div>
                    </div>

                    ${phases}
                    ${capabilities}
                    ${tool.kind ? this._getKindHTML(tool.kind) : ''}
                    ${tool.repo ? this._getRepoHTML(tool.repo) : ''}
                    ${categoryPath}
                </div>
            `;
        }

        _getPhasesHTML(tool) {
            const phase = tool.phase || (Array.isArray(tool.phases) ? tool.phases[0] : null);
            const phasesArray = tool.phases?.length ? tool.phases : (phase ? [phase] : []);

            if (!phasesArray.length) return '';

            const phaseTags = phasesArray.map(ph => {
                const color = ToolUtils.getPhaseColor(ph);
                return `
                    <span class="phase-tag" style="border:1px solid;--phase:${color};
                          background:color-mix(in srgb, ${color} 12%, hsl(var(--card)));
                          color:${color};padding:6px 12px;border-radius:8px;
                          font-size:13px;font-weight:600;display:inline-block;margin:4px;">
                        ${DOMUtils.escapeHtml(DOMUtils.formatLabel(ph))}
                    </span>
                `;
            }).join('');

            return `
                <div class="detail-section">
                    <h3>Phases</h3>
                    <div class="phase-tags">${phaseTags}</div>
                </div>
            `;
        }

        _getCapabilitiesHTML(tool) {
            if (!Array.isArray(tool.caps) || !tool.caps.length) return '';

            const capTags = tool.caps.map(cap => `
                <span class="cap-tag" style="background:hsl(var(--muted));border:1px solid var(--border);
                      padding:6px 12px;border-radius:8px;font-size:13px;color:var(--muted);
                      display:inline-block;margin:4px;">
                    ${DOMUtils.escapeHtml(cap)}
                </span>
            `).join('');

            return `
                <div class="detail-section">
                    <h3>Capabilities</h3>
                    <div class="caps-tags">${capTags}</div>
                </div>
            `;
        }

        _getKindHTML(kind) {
            return `
                <div class="detail-section">
                    <h3>Kind</h3>
                    <div class="kind-tag" style="display:inline-block;background:hsl(var(--muted));
                         border:1px solid var(--border);padding:6px 12px;border-radius:8px;
                         font-size:13px;color:var(--muted);">
                        ${DOMUtils.escapeHtml(kind)}
                    </div>
                </div>
            `;
        }

        _getRepoHTML(repo) {
            return `
                <div class="detail-section">
                    <h3>Repository</h3>
                    <a href="${DOMUtils.escapeAttr(repo)}" target="_blank" rel="noopener noreferrer" 
                       class="repo-link" style="color:var(--accent-2);text-decoration:none;word-break:break-all;">
                        ${DOMUtils.escapeHtml(repo)}
                    </a>
                </div>
            `;
        }

        _getCategoryPathHTML(tool) {
            const catPath = ToolUtils.getCategoryPath(tool);
            if (!catPath.length) return '';

            const pathSegments = catPath.map(p => DOMUtils.escapeHtml(DOMUtils.formatLabel(p))).join(' / ');

            return `
                <div class="detail-section">
                    <h3>Category Path</h3>
                    <div class="category-path-row">
                        <button class="icon-btn copy-catpath" title="Copy category path" aria-label="Copy category path">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2z">
                                </path>
                            </svg>
                            <span class="sr-only">Copy category path</span>
                        </button>
                        <p class="category-path" data-raw="${catPath.join('/')}" 
                           style="color:var(--muted);font-size:14px;">
                            ${pathSegments}
                        </p>
                    </div>
                </div>
            `;
        }

        _attachCopyPathHandler() {
            const copyButton = this.modal.querySelector('.copy-catpath');
            const pathElement = this.modal.querySelector('.category-path');

            if (!copyButton || !pathElement) return;

            copyButton.addEventListener('click', () => {
                const text = pathElement.dataset.raw || pathElement.textContent.trim();
                if (!text) return;

                navigator.clipboard.writeText(text).then(() => {
                    this._showCopySuccess(copyButton);
                });
            });
        }

        _showCopySuccess(button) {
            const svg = button.querySelector('svg');
            if (!svg) return;

            const originalSVG = svg.outerHTML;
            svg.outerHTML = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
            `;

            setTimeout(() => {
                const currentSVG = button.querySelector('svg');
                if (currentSVG) currentSVG.outerHTML = originalSVG;
            }, 1200);
        }

        _applyPhaseColor(tool) {
            const phase = tool.phase || (Array.isArray(tool.phases) ? tool.phases[0] : null);
            const phaseColor = tool.phaseColor || ToolUtils.getPhaseColor(phase);

            const modalContent = this.modal.querySelector('.modal-content');
            if (modalContent && phaseColor) {
                modalContent.style.setProperty('--phase', phaseColor);
            }
        }

        _openModal() {
            this.modal.style.display = 'flex';
            this.modal.classList.remove('closing');
            void this.modal.offsetWidth; // Force reflow
            this.modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    window.SearchUtils = SearchUtils;
})();