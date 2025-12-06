/**
 * Gestione ricerca tool (fuzzy e API)
 * - Fuzzy: ricerca in tempo reale su nome tool
 * - API: ricerca semantica AI
 */

(function () {
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

    let searchInput, searchModeToggle, searchSendBtn, loadingOverlay;

    // ========================================================================
    // LOADING OVERLAY
    // ========================================================================

    /**
     * Create loading overlay element
     */
    function createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'ai-loading-overlay';
        overlay.innerHTML = `
            <div class="ai-loading-spinner">
                <div class="spinner"></div>
                <p class="loading-text">AI is searching...</p>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * Show loading overlay
     */
    function showLoading() {
        if (!loadingOverlay) {
            loadingOverlay = createLoadingOverlay();
        }
        // Force reflow to trigger animation
        loadingOverlay.offsetHeight;
        loadingOverlay.classList.add('visible');
    }

    /**
     * Hide loading overlay
     */
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('visible');
        }
    }

    // ========================================================================
    // SEARCH IMPLEMENTATIONS
    // ========================================================================

    /**
     * Build search context from tool IDs
     * Constructs phaseHits, pathHits, countsByPhase for sidebar rendering
     */
    function buildSearchContext(toolIds, query) {
        const tm = window.Toolmap || {};
        const toolsById = tm.toolsById || {};

        const phaseHits = new Map();
        const pathHits = new Map();
        const countsByPhase = {};

        toolIds.forEach(toolId => {
            const tool = toolsById[toolId];
            if (!tool) return;

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
        });

        const phaseKeys = Array.from(phaseHits.keys());
        const paths = [];

        phaseHits.forEach((pathSet) => {
            pathSet.forEach(pathSlash => {
                paths.push(pathSlash.split('/'));
            });
        });

        return {
            hasQuery: true,
            phaseKeys,
            paths,
            countsByPhase,
            searchedQuery: query,
            foundToolIds: toolIds
        };
    }

    /**
     * Ricerca FUZZY su nome tool
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
            detail: {hasQuery: true}
        }));

        // Converti query in termini separati (lowercase)
        const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

        // Cerca tool che matchano
        const results = [];

        for (const [toolId, tool] of Object.entries(toolsById)) {
            // Verifica se TUTTI i termini sono presenti nel nome
            const nameMatch = searchTerms.every(term => toolId.includes(term));

            // Calcola score (priorità match all'inizio del nome)
            let score = 0;
            if (nameMatch) {
                score = 10;
                if (toolId.startsWith(searchTerms[0])) {
                    score += 5;
                }
            }

            if (score > 0) {
                results.push({tool, score});
            }
        }

        // Ordina risultati per score
        results.sort((a, b) => b.score - a.score);

        const foundToolIds = results.map(r => r.tool.id);

        // Build search context using helper
        const searchContext = buildSearchContext(foundToolIds, query);

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
     * Utilizza OpenAI per ricerca basata su linguaggio naturale
     */
    async function performAPISearch(query) {
        if (!query) return;

        // Check if AI search is available
        if (!window.AISearch || !window.AISearch.isAvailable()) {
            MessageModal.warning(
                'AI Search Not Available',
                'AI search is not configured. Please set your OPENAI_API_KEY in the secret.env file to enable AI search.'
            );
            return;
        }

        // Show a full-page loading overlay
        showLoading();

        // Notifica stato (per UI feedback)
        window.dispatchEvent(new CustomEvent('tm:search:set', {
            detail: {hasQuery: true}
        }));

        // Show loading state
        window.dispatchEvent(new CustomEvent('tm:search:api', {
            detail: {
                query,
                status: 'loading'
            }
        }));

        // Call AI search service (errors handled internally with MessageModal)
        const toolIds = await window.AISearch.search(query);

        // Hide loading overlay
        hideLoading();

        if (!toolIds || toolIds.length === 0) {
            window.dispatchEvent(new CustomEvent('tm:search:api', {
                detail: {
                    query,
                    status: 'no-results'
                }
            }));

            window.dispatchEvent(new CustomEvent('tm:search:context', {
                detail: {
                    hasQuery: true,
                    phaseKeys: [],
                    paths: [],
                    countsByPhase: {},
                    searchedQuery: query,
                    foundToolIds: []
                }
            }));

            // Show empty results
            window.dispatchEvent(new CustomEvent('tm:scope:set', {
                detail: {
                    ids: [],
                    source: 'search-ai'
                }
            }));
            return;
        }

        // Build search context using helper
        const searchContext = buildSearchContext(toolIds, query);

        window.dispatchEvent(new CustomEvent('tm:search:context', {
            detail: searchContext
        }));

        window.dispatchEvent(new CustomEvent('tm:scope:set', {
            detail: {
                ids: toolIds,
                source: 'search-ai'
            }
        }));

        window.dispatchEvent(new CustomEvent('tm:search:api', {
            detail: {
                query,
                status: 'success',
                count: toolIds.length
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
            detail: {hasQuery: false}
        }));

        if (state.preSearchState && state.preSearchState.pathKey) {
            restorePreSearchState();
        } else {
            localStorage.removeItem(STORAGE_KEYS.preSearchState);
        }
    }

    /**
     * Ripristina stato sidebar salvato
     */
    function restorePreSearchState() {
        if (!state.preSearchState) return;

        const {pathKey, pathSlash, openPhases} = state.preSearchState;

        // Ripristina scope
        if (pathKey && pathSlash) {
            const tm = window.Toolmap || {};
            if (tm.allToolsUnder?.[pathKey]) {
                const ids = Array.from(tm.allToolsUnder[pathKey]);

                window.dispatchEvent(new CustomEvent('tm:scope:set', {
                    detail: {pathKey, ids, source: 'search-restore'}
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
            detail: {query: queryTrimmed, mode: state.mode}
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
                detail: {query: state.currentQuery, mode: state.mode}
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
        state.preSearchState = null;
        localStorage.removeItem(STORAGE_KEYS.preSearchState);

        if (searchInput) {
            searchInput.value = '';
        }
        state.currentQuery = '';
        state.isActive = false;
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