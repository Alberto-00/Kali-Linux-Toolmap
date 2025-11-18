/**
 * Gestione ricerca tool (fuzzy e API)
 * - Fuzzy: ricerca in tempo reale su nome tool
 * - API: ricerca semantica AI
 */

(function() {
    'use strict';

    // ========================================================================
    // CONSTANTS
    // ========================================================================

    const SEARCH_MODES = Object.freeze({
        FUZZY: 'fuzzy',
        API: 'api'
    });

    const STORAGE_KEYS = Object.freeze({
        mode: 'tm:search:mode',
        preSearchState: 'tm:search:prestate'
    });

    // ========================================================================
    // STATE
    // ========================================================================

    const state = {
        mode: SEARCH_MODES.FUZZY,
        isActive: false,
        currentQuery: '',
        preSearchState: null
    };

    // ========================================================================
    // DOM ELEMENTS
    // ========================================================================

    let searchInput, searchModeToggle, searchSendBtn;

    // ========================================================================
    // SEARCH IMPLEMENTATIONS
    // ========================================================================

    /**
     * Ricerca fuzzy su nome tool
     * Case-insensitive, cerca tutti i termini nel nome
     */
    function performFuzzySearch(query) {
        const tm = window.Toolmap || {};
        const toolsById = tm.toolsById || {};

        if (!query) {
            exitSearchMode();
            return;
        }

        // Notifica che siamo in modalità ricerca
        window.dispatchEvent(new CustomEvent('tm:search:set', {
            detail: { hasQuery: true }
        }));

        // Converti query in termini separati (lowercase)
        const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

        // Cerca tool che matchano
        const results = [];
        const phaseHits = new Map();
        const pathHits = new Map();
        const countsByPhase = {};

        for (const [toolId, tool] of Object.entries(toolsById)) {
            const toolName = (tool.name || tool.id || '').toLowerCase();

            // Verifica se TUTTI i termini sono presenti nel nome
            const nameMatch = searchTerms.every(term => toolName.includes(term));

            // Calcola score (priorità match all'inizio del nome)
            let score = 0;
            if (nameMatch) {
                score = 10;
                if (toolName.startsWith(searchTerms[0])) {
                    score += 5;
                }
            }

            if (score > 0) {
                results.push({ tool, score });

                const categoryPath = tool.category_path || [];
                if (categoryPath.length > 0) {
                    const phase = categoryPath[0];
                    const pathSlash = categoryPath.join('/');

                    if (!phaseHits.has(phase)) {
                        phaseHits.set(phase, new Set());
                    }
                    phaseHits.get(phase).add(pathSlash);

                    if (!pathHits.has(pathSlash)) {
                        pathHits.set(pathSlash, []);
                    }
                    pathHits.get(pathSlash).push(toolId);

                    countsByPhase[phase] = (countsByPhase[phase] || 0) + 1;
                }
            }
        }

        // Ordina risultati per score
        results.sort((a, b) => b.score - a.score);

        // Prepara dati per sidebar
        const phaseKeys = Array.from(phaseHits.keys());
        const paths = [];

        phaseHits.forEach((pathSet) => {
            pathSet.forEach(pathSlash => {
                paths.push(pathSlash.split('/'));
            });
        });

        const foundToolIds = results.map(r => r.tool.id);

        // Notifica sidebar e aggiorna scope
        const searchContext = {
            hasQuery: true,
            phaseKeys,
            paths,
            countsByPhase,
            searchedQuery: query,
            foundToolIds
        };

        window.dispatchEvent(new CustomEvent('tm:search:context', {
            detail: searchContext
        }));

        window.dispatchEvent(new CustomEvent('tm:scope:set', {
            detail: {
                ids: foundToolIds.length > 0 ? foundToolIds : [],
                source: 'search'
            }
        }));
    }

    /**
     * Ricerca API/AI (semantica)
     * TODO: Da implementare con backend AI
     */
    function performAPISearch(query) {
        if (!query) return;

        console.log('[search] API search non ancora implementata:', query);

        // Notifica stato (per UI feedback)
        window.dispatchEvent(new CustomEvent('tm:search:set', {
            detail: { hasQuery: true }
        }));

        // Placeholder per futura implementazione
        // TODO:
        // 1. Invia query a backend AI
        // 2. Ricevi risultati semantici
        // 3. Processa e filtra tool come fuzzy search
        // 4. Dispatch tm:search:context e tm:scope:set

        window.dispatchEvent(new CustomEvent('tm:search:api', {
            detail: {
                query,
                status: 'not-implemented'
            }
        }));
    }

    // ========================================================================
    // SEARCH MODE MANAGEMENT
    // ========================================================================

    /**
     * Salva stato sidebar prima di entrare in ricerca
     */
    function savePreSearchState() {
        const sidebar = document.getElementById('sidebar');
        const openPhases = Array.from(
            document.querySelectorAll('.nav-item.open')
        ).map(item => item.dataset.phase);

        state.preSearchState = {
            pathKey: localStorage.getItem('tm:active:path'),
            pathSlash: localStorage.getItem('tm:active:slash'),
            openPhases: openPhases,
            sidebarCollapsed: sidebar?.classList.contains('collapsed')
        };

        localStorage.setItem(STORAGE_KEYS.preSearchState, JSON.stringify(state.preSearchState));
    }

    /**
     * Esce dalla modalità ricerca
     */
    function exitSearchMode() {
        if (!state.isActive) return;

        state.isActive = false;
        state.currentQuery = '';

        // Notifica sistema
        window.dispatchEvent(new CustomEvent('tm:search:set', {
            detail: { hasQuery: false }
        }));

        // Ripristina stato pre-ricerca
        if (state.preSearchState) {
            restorePreSearchState();
        }
    }

    /**
     * Ripristina stato sidebar salvato
     */
    function restorePreSearchState() {
        if (!state.preSearchState) return;

        const { pathKey, pathSlash, openPhases } = state.preSearchState;

        // Ripristina scope
        if (pathKey && pathSlash) {
            const tm = window.Toolmap || {};
            if (tm.allToolsUnder?.[pathKey]) {
                const ids = Array.from(tm.allToolsUnder[pathKey]);

                window.dispatchEvent(new CustomEvent('tm:scope:set', {
                    detail: { pathKey, ids, source: 'search-restore' }
                }));
            }
        }

        // Ripristina stato sidebar (asincrono)
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('tm:sidebar:restore-snapshot', {
                detail: {
                    openPhases: openPhases || [],
                    scopeAll: !pathKey
                }
            }));
        }, 100);

        state.preSearchState = null;
        localStorage.removeItem(STORAGE_KEYS.preSearchState);
    }

    /**
     * Pulisce ricerca e ripristina stato
     */
    function clearSearch() {
        searchInput.value = '';
        state.currentQuery = '';
        exitSearchMode();
    }

    // ========================================================================
    // UI UPDATES
    // ========================================================================

    /**
     * Aggiorna UI in base alla modalità attiva
     */
    function updateModeUI() {
        if (!searchModeToggle || !searchSendBtn) return;

        // CSS classes per styling
        searchModeToggle.classList.toggle('mode-fuzzy', state.mode === SEARCH_MODES.FUZZY);
        searchModeToggle.classList.toggle('mode-api', state.mode === SEARCH_MODES.API);

        // Mostra/nascondi button invio (solo API)
        searchSendBtn.style.display = state.mode === SEARCH_MODES.API ? 'flex' : 'none';

        // Aggiorna placeholder
        searchInput.placeholder = state.mode === SEARCH_MODES.FUZZY
            ? 'Search tools...'
            : 'Ask AI about tools...';

        // Aggiorna tooltip
        searchModeToggle.title = state.mode === SEARCH_MODES.FUZZY
            ? 'Switch to AI search'
            : 'Switch to fuzzy search';
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Gestisce input ricerca in tempo reale
     */
    function handleSearchInput(event) {
        const query = event.target.value;
        const queryTrimmed = query.trim();

        state.currentQuery = queryTrimmed;

        // Query vuota: esci da modalità ricerca
        if (!queryTrimmed) {
            exitSearchMode();
            return;
        }

        // Prima ricerca: salva stato pre-search
        if (!state.isActive) {
            savePreSearchState();
            state.isActive = true;
        }

        // Notifica breadcrumb (animazione query in tempo reale)
        window.dispatchEvent(new CustomEvent('tm:search:query', {
            detail: { query: queryTrimmed, mode: state.mode }
        }));

        // Solo fuzzy mode esegue ricerca in tempo reale
        if (state.mode === SEARCH_MODES.FUZZY) {
            performFuzzySearch(queryTrimmed);
        }
    }

    /**
     * Gestisce tastiera (ESC, Enter)
     */
    function handleSearchKeydown(event) {
        if (event.key === 'Escape') {
            clearSearch();
        } else if (event.key === 'Enter') {
            if (state.mode === SEARCH_MODES.API) {
                handleSendQuery();
            }
        }
    }

    /**
     * Toggle tra modalità fuzzy e API
     */
    function handleModeToggle() {
        state.mode = state.mode === SEARCH_MODES.FUZZY
            ? SEARCH_MODES.API
            : SEARCH_MODES.FUZZY;

        localStorage.setItem(STORAGE_KEYS.mode, state.mode);
        updateModeUI();

        // Se c'è query attiva, ri-trigger ricerca con nuova modalità
        if (state.currentQuery) {
            window.dispatchEvent(new CustomEvent('tm:search:query', {
                detail: { query: state.currentQuery, mode: state.mode }
            }));

            if (state.mode === SEARCH_MODES.FUZZY) {
                performFuzzySearch(state.currentQuery);
            }
        }
    }

    /**
     * Invia query in modalità API (click su button)
     */
    function handleSendQuery() {
        if (!state.currentQuery || state.mode !== SEARCH_MODES.API) return;

        performAPISearch(state.currentQuery);
    }

    function handleClearSearch() {
        clearSearch();
    }

    function handleReset() {
        clearSearch();
        state.preSearchState = null;
    }

    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================

    function attachEventListeners() {
        // Eventi input
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keydown', handleSearchKeydown);

        // Toggle modalità
        searchModeToggle?.addEventListener('click', handleModeToggle);

        // Button invio (API mode)
        searchSendBtn?.addEventListener('click', handleSendQuery);

        // Eventi globali
        window.addEventListener('tm:search:clear', handleClearSearch);
        window.addEventListener('tm:reset', handleReset);
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    function initialize() {
        searchInput = document.getElementById('searchInput');
        searchModeToggle = document.querySelector('.search-mode-toggle');
        searchSendBtn = document.querySelector('.search-send-btn');

        if (!searchInput) {
            console.warn('[search] Input non trovato');
            return;
        }

        // Ripristina modalità salvata
        const savedMode = localStorage.getItem(STORAGE_KEYS.mode);
        if (savedMode && Object.values(SEARCH_MODES).includes(savedMode)) {
            state.mode = savedMode;
        }

        updateModeUI();
        attachEventListeners();
    }

    // ========================================================================
    // AUTO-INITIALIZE
    // ========================================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();