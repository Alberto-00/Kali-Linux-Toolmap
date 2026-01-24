/**
 * Gestione ricerca tool (fuzzy e API)
 * - Fuzzy: ricerca in tempo reale su nome e descrizione tool
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
        preSearchState: null,
        searchDebounceTimer: null,
        isTyping: false
    };

    // Costanti per debounce
    const DEBOUNCE_DELAY = 150; // ms prima di eseguire la ricerca
    const TYPING_COOLDOWN = 300; // ms dopo l'ultima digitazione per riabilitare animazioni

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
     * Ricerca FUZZY su nome e descrizione tool
     * Case-insensitive, cerca tutti i termini nel nome e/o descrizione
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
            const nameLower = toolId.toLowerCase();
            const descLower = (tool.desc || tool.description || '').toLowerCase();

            // Verifica match nel nome (tutti i termini)
            const nameMatch = searchTerms.every(term => nameLower.includes(term));

            // Verifica match nella descrizione (tutti i termini)
            const descMatch = searchTerms.every(term => descLower.includes(term));

            // Verifica match combinato (ogni termine in nome O descrizione)
            const combinedMatch = searchTerms.every(term =>
                nameLower.includes(term) || descLower.includes(term)
            );

            // Calcola score (priorità: nome > descrizione > combinato)
            let score = 0;

            if (nameMatch) {
                // Match completo nel nome: massima priorità
                score = 20;
                if (nameLower.startsWith(searchTerms[0])) {
                    score += 10; // Bonus se inizia con il primo termine
                }
            } else if (descMatch) {
                // Match completo nella descrizione
                score = 10;
            } else if (combinedMatch) {
                // Match distribuito tra nome e descrizione
                score = 5;
                // Bonus per ogni termine trovato nel nome
                searchTerms.forEach(term => {
                    if (nameLower.includes(term)) score += 2;
                });
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

        // CRITICO: Riattiva le animazioni dopo la ricerca AI
        // Senza questo, la classe 'typing' rimane attiva e disabilita tutte le animazioni
        setTypingMode(false);

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
    function exitSearchMode(skipRestore = false) {
        if (!state.isActive) return;

        state.isActive = false;
        state.currentQuery = '';

        // CRITICO: Cancella lo stato delle fasi aperte DURANTE la ricerca
        // Questo previene interferenze con il ripristino dello stato PRE-ricerca
        localStorage.removeItem('tm:search:open-phases');

        // Notifica sistema
        window.dispatchEvent(new CustomEvent('tm:search:set', {
            detail: {hasQuery: false}
        }));

        // Se skipRestore è true, non ripristinare lo stato pre-search
        if (skipRestore) {
            state.preSearchState = null;
            localStorage.removeItem(STORAGE_KEYS.preSearchState);
            return;
        }

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
     * @param {boolean} skipRestore - Se true, non ripristina lo stato pre-search
     */
    function clearSearch(skipRestore = false) {
        searchInput.value = '';
        state.currentQuery = '';
        exitSearchMode(skipRestore);
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
     * Attiva/disattiva modalità typing (disabilita animazioni sidebar)
     */
    function setTypingMode(isTyping) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        if (isTyping && !state.isTyping) {
            sidebar.classList.add('typing');
            state.isTyping = true;
        } else if (!isTyping && state.isTyping) {
            sidebar.classList.remove('typing');
            state.isTyping = false;
        }
    }

    /**
     * Gestisce input ricerca in tempo reale (con debounce)
     */
    function handleSearchInput(event) {
        const query = event.target.value;
        const queryTrimmed = query.trim();

        state.currentQuery = queryTrimmed;

        // Cancella timer precedente
        if (state.searchDebounceTimer) {
            clearTimeout(state.searchDebounceTimer);
            state.searchDebounceTimer = null;
        }

        // Query vuota: esci da modalità ricerca immediatamente
        if (!queryTrimmed) {
            setTypingMode(false);
            exitSearchMode();
            return;
        }

        // Prima ricerca: salva stato pre-search
        if (!state.isActive) {
            savePreSearchState();
            state.isActive = true;
        }

        // Attiva modalità typing (disabilita animazioni sidebar)
        setTypingMode(true);

        // Notifica breadcrumb (animazione query in tempo reale - senza debounce)
        window.dispatchEvent(new CustomEvent('tm:search:query', {
            detail: {query: queryTrimmed, mode: state.mode}
        }));

        // Solo fuzzy mode esegue ricerca in tempo reale (CON DEBOUNCE)
        if (state.mode === SEARCH_MODES.FUZZY) {
            state.searchDebounceTimer = setTimeout(() => {
                performFuzzySearch(queryTrimmed);

                // Disattiva typing mode dopo un breve delay per permettere animazione finale
                setTimeout(() => setTypingMode(false), TYPING_COOLDOWN);
            }, DEBOUNCE_DELAY);
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

    function handleClearSearch(event) {
        const skipRestore = event?.detail?.skipRestore || false;
        clearSearch(skipRestore);
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

    /**
     * Gestisce Ctrl+F per attivare ricerca
     */
    function handleGlobalKeydown(event) {
        // Ctrl+F (o Cmd+F su Mac) attiva la ricerca
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault(); // Previeni ricerca browser
            if (searchInput) {
                searchInput.focus();
                searchInput.select(); // Seleziona testo esistente
            }
        }
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

        // Ctrl+F per attivare ricerca
        document.addEventListener('keydown', handleGlobalKeydown);

        // Cleanup timer prima del reload
        window.addEventListener('beforeunload', () => {
            if (state.searchDebounceTimer) {
                clearTimeout(state.searchDebounceTimer);
                state.searchDebounceTimer = null;
            }
        });
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