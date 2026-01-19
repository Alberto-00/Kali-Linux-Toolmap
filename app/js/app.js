/**
 * Orchestratore principale applicazione
 * - Gestisce stato globale e scope visualizzazione
 * - Coordina rendering cards e modali
 * - Sincronizza eventi tra moduli
 */

(function () {
    'use strict';

    const CONSTANTS = window.TOOLMAP_CONSTANTS;
    const ToolUtils = window.ToolUtils;
    const DOMUtils = window.DOMUtils;

    // ========================================================================
    // STATE
    // ========================================================================

    const state = {
        scopeAll: true,          // Mostra tutti i tool
        scopeIds: null,          // Array IDs tool filtrati
        pathKey: null,           // Path attivo (es: "Root>Phase>Category")
        isResetting: false       // Flag per evitare race condition durante reset
    };

    let hasVisitedAnyPhase = false;  // Traccia se l'utente ha mai aperto una fase
    let previousToolIds = '';         // Cache per evitare render inutili
    let eventsWired = false;          // Previene doppio wiring

    // ========================================================================
    // DOM ELEMENTS
    // ========================================================================

    let grid, resetBtn, notesModal, detailsModal, toolsRenderer;

    // ========================================================================
    // STORAGE UTILITIES
    // ========================================================================

    const Storage = {
        /**
         * Legge valore da sessionStorage
         */
        get(key) {
            try {
                return sessionStorage.getItem(key);
            } catch {
                return null;
            }
        },

        /**
         * Salva valore in sessionStorage
         */
        set(key, value) {
            try {
                sessionStorage.setItem(key, value);
            } catch (error) {
                console.warn('[app] Errore salvataggio storage:', error);
            }
        },

        /**
         * Rimuove valore da sessionStorage
         */
        remove(key) {
            try {
                sessionStorage.removeItem(key);
            } catch {
            }
        },

        /**
         * Pulizia totale localStorage + sessionStorage
         */
        clearAll() {
            try {
                localStorage.clear();
            } catch (error) {
                console.warn('[app] Errore pulizia localStorage:', error);
            }

            try {
                sessionStorage.clear();
            } catch (error) {
                console.warn('[app] Errore pulizia sessionStorage:', error);
            }
        }
    };

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Inizializzazione principale
     */
    DOMUtils.ready(async () => {
        // Load environment configuration first
        if (window.Config) {
            await window.Config.load();
        }

        cleanupOnLoad();
        initializeDOM();
        restoreState();
        wireEvents();
        render();
    });

    /**
     * Pulisce storage al reload pagina (Ctrl+R, F5)
     */
    function cleanupOnLoad() {
        const nav = performance.getEntriesByType('navigation')[0];
        const isReload = nav?.type === 'reload';

        if (isReload) {
            Storage.clearAll();
        }
    }

    /**
     * Inizializza riferimenti DOM e istanze modali/renderer
     */
    function initializeDOM() {
        grid = document.getElementById(CONSTANTS.SELECTORS.grid);
        resetBtn = document.getElementById(CONSTANTS.SELECTORS.resetBtn);

        if (!grid) {
            console.error('[app] Grid non trovato');
            return;
        }

        // Inizializza modali
        if (window.NotesModal) {
            notesModal = new window.NotesModal(saveNoteAndExport);
        }

        if (window.DetailsModal) {
            detailsModal = new window.DetailsModal();
        }

        // Inizializza renderer
        if (window.ToolsRenderer) {
            toolsRenderer = new window.ToolsRenderer(
                grid,
                (tool) => detailsModal?.show(tool),
                (tool) => notesModal?.show(tool)
            );
        }
    }

    /**
     * Ripristina stato salvato da sessione precedente
     */
    function restoreState() {
        const savedPathKey = Storage.get(CONSTANTS.STORAGE_KEYS.pathKey);

        if (savedPathKey) {
            state.pathKey = savedPathKey;
            state.scopeAll = false;

            const tm = window.Toolmap || {};
            if (tm.allToolsUnder?.[savedPathKey]) {
                state.scopeIds = Array.from(tm.allToolsUnder[savedPathKey]);
            }
        }
    }

    // ========================================================================
    // EVENT WIRING
    // ========================================================================

    /**
     * Attacca tutti gli event listener (chiamato una sola volta)
     */
    function wireEvents() {
        if (eventsWired) return;
        eventsWired = true;

        // Eventi globali applicazione
        window.addEventListener('tm:scope:set', handleScopeSet);
        window.addEventListener('tm:tool:toggleStar', handleToggleStar);
        window.addEventListener('tm:stars:updated', handleStarsUpdated);
        window.addEventListener('tm:tools:showAll', handleShowAll);
        window.addEventListener('tm:reset', handleReset);
        window.addEventListener('tm:registry:ready', handleRegistryReady);

        // Eventi card (apertura modali)
        window.addEventListener('tm:card:openNotes', handleCardOpenNotes);
        window.addEventListener('tm:card:openDetails', handleCardOpenDetails);

        // Button reset
        resetBtn?.addEventListener('click', handleResetClick);

        // Pulizia storage prima del reload
        window.addEventListener('beforeunload', () => {
            Storage.clearAll();
        });

        // ESC per pulire ricerca
        document.addEventListener('keydown', handleEscapeKey);

        // Coordina transizioni card quando sidebar cambia stato
        window.addEventListener('tm:sidebar:toggle', handleSidebarToggle);

        // Se registry è già caricato (race condition), inizializza subito
        const tm = window.Toolmap || {};
        if (tm.__loaded && tm.toolsById && Object.keys(tm.toolsById).length > 0) {
            handleRegistryReady();
        }
    }

    /**
     * Gestisce toggle sidebar per coordinare animazioni grid
     */
    let sidebarTransitioning = false;
    function handleSidebarToggle() {
        // Marca che sidebar sta transizionando per evitare jank
        sidebarTransitioning = true;

        // Dopo la transizione sidebar (~350ms), rimuovi il flag
        setTimeout(() => {
            sidebarTransitioning = false;
        }, 380);
    }

    // ========================================================================
    // EVENT HANDLERS - Scope & Navigation
    // ========================================================================

    /**
     * Gestisce cambio scope (filtro tool visualizzati)
     */
    function handleScopeSet(event) {
        // Durante reset, ignora eventi non espliciti
        if (state.isResetting && !event.detail?.all) return;

        const {all, ids, pathKey} = event.detail || {};

        state.scopeAll = !!all || (!ids && !pathKey);
        state.scopeIds = ids || null;
        state.pathKey = pathKey || null;

        // Traccia se l'utente ha visitato almeno una fase
        if (state.pathKey && typeof state.pathKey === 'string') {
            const parts = state.pathKey.split('>').filter(Boolean);
            const first = (parts[0]?.toLowerCase() === 'root') ? parts[1] : parts[0];
            if (first) hasVisitedAnyPhase = true;
        }

        // Render solo se i tool sono effettivamente cambiati
        const tools = computeVisibleTools();
        const currentToolIds = tools.map(t => t.id).sort().join(',');

        if (currentToolIds !== previousToolIds) {
            previousToolIds = currentToolIds;
            // Show/Hide mode è istantaneo, un singolo rAF basta
            requestAnimationFrame(render);
        }
    }

    /**
     * Gestisce click "Show All"
     */
    function handleShowAll() {
        state.scopeAll = true;
        // Show/Hide mode è istantaneo
        requestAnimationFrame(render);
    }

    /**
     * Gestisce evento reset (chiamato da altri moduli)
     */
    function handleReset() {
        if (state.isResetting) return;

        const content = document.querySelector('.content');
        content?.style.removeProperty('--hover-color');

        state.scopeAll = true;
        state.scopeIds = null;
        state.pathKey = null;
        hasVisitedAnyPhase = false;
        previousToolIds = '';
    }

    /**
     * Gestisce click su button Reset
     */
    function handleResetClick() {
        state.isResetting = true;

        // 1. Pulisci input ricerca
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        // 2. Dispatch reset PRIMA (così search.js pulisce il suo stato)
        window.dispatchEvent(new Event('tm:reset'));

        // 3. DOPO il reset, pulisci storage
        Storage.clearAll();

        // 4. Dispatch clear ricerca (DOPO clearAll) con skipRestore per evitare ripristino pre-search
        window.dispatchEvent(new CustomEvent('tm:search:clear', {
            detail: { skipRestore: true }
        }));

        // 5. Reset stato interno
        state.scopeAll = true;
        state.scopeIds = null;
        state.pathKey = null;
        hasVisitedAnyPhase = false;
        // NON resettare previousToolIds qui - lascia che handleScopeSet lo gestisca

        // 6. Dispatch altri eventi - tm:scope:set triggererà il render
        window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {all: true}}));
        window.dispatchEvent(new CustomEvent('tm:phase:color', {detail: {color: null}}));

        // 7. Sblocca flag reset (dopo che le animazioni sono partite)
        setTimeout(() => {
            state.isResetting = false;
        }, 100);
    }

    /**
     * Gestisce tasto ESC (pulisce ricerca)
     */
    function handleEscapeKey(event) {
        if (event.key !== 'Escape') return;

        const searchInput = document.getElementById('searchInput');
        if (!searchInput || searchInput !== document.activeElement) return;

        if (searchInput.value) {
            // Input ha contenuto: puliscilo
            searchInput.value = '';
            window.dispatchEvent(new CustomEvent('tm:search:clear'));
        } else {
            // Input vuoto: rimuovi focus
            searchInput.blur();
        }
    }

    // ========================================================================
    // EVENT HANDLERS - Stars & Registry
    // ========================================================================

    /**
     * Gestisce toggle stella (re-render)
     */
    function handleToggleStar() {
        // In Show/Hide mode le stelle vengono aggiornate direttamente
        // tramite handleStarsUpdated, non serve fare nulla qui
    }

    /**
     * Gestisce aggiornamento stelle
     */
    function handleStarsUpdated(event) {
        const { id, value } = event.detail || {};

        // In Show/Hide mode aggiorna direttamente la stella nel DOM
        if (toolsRenderer?.isInitialized() && id) {
            toolsRenderer.updateStarState(id, !!value);
            return;
        }

        // Fallback: re-render completo
        render();
    }

    /**
     * Gestisce registry pronto (ripristina stato salvato)
     */
    let registryInitialized = false;
    function handleRegistryReady() {
        // Previeni chiamate multiple
        if (registryInitialized) return;

        const tm = window.Toolmap || {};
        const toolsById = tm.toolsById || {};
        const allTools = Object.values(toolsById).filter(Boolean);

        // Inizializza tutte le card una volta sola (Show/Hide mode)
        if (toolsRenderer && allTools.length > 0) {
            applyStarredState(allTools);
            sortTools(allTools);
            toolsRenderer.initAll(allTools);
            registryInitialized = true;
        }

        // Ripristina stato salvato se presente
        const savedPathKey = Storage.get(CONSTANTS.STORAGE_KEYS.pathKey);

        if (savedPathKey && !state.isResetting) {
            if (tm.allToolsUnder?.[savedPathKey]) {
                state.pathKey = savedPathKey;
                state.scopeAll = false;
                state.scopeIds = Array.from(tm.allToolsUnder[savedPathKey]);
                render();
            }
        } else {
            // Mostra tutte le card
            render();
        }
    }

    // ========================================================================
    // EVENT HANDLERS - Modali
    // ========================================================================

    /**
     * Apre modale note
     */
    function handleCardOpenNotes(event) {
        const tool = event.detail?.tool;
        if (tool && notesModal) {
            notesModal.show(tool);
        }
    }

    /**
     * Apre modale dettagli
     */
    function handleCardOpenDetails(event) {
        const tool = event.detail?.tool;
        if (tool && detailsModal) {
            detailsModal.show(tool);
        }
    }

    // ========================================================================
    // RENDERING LOGIC
    // ========================================================================

    /**
     * Rendering principale cards (usa Show/Hide mode se inizializzato)
     */
    function render() {
        if (!grid) return;

        const tools = computeVisibleTools();
        applyStarredState(tools);
        sortTools(tools);
        notifyBreadcrumb(tools);

        // Se renderer è in Show/Hide mode, usa showOnly (molto più veloce)
        if (toolsRenderer?.isInitialized()) {
            if (!tools.length) {
                toolsRenderer.showOnly([], []);
                return;
            }

            const visibleIds = tools.map(t => t.id);
            toolsRenderer.showOnly(visibleIds, tools);
            return;
        }

        // Fallback: rendering tradizionale (prima dell'inizializzazione)
        if (!tools.length) {
            renderEmptyState();
            return;
        }

        if (toolsRenderer) {
            toolsRenderer.render(tools);
        }

        // Applica indici per stagger animation (solo primi 20 - oltre CSS ha cap)
        requestAnimationFrame(() => {
            const cards = grid.querySelectorAll('.card');
            const maxStagger = Math.min(cards.length, 20);
            for (let i = 0; i < maxStagger; i++) {
                cards[i].style.setProperty('--card-index', i);
            }
        });
    }

    /**
     * Calcola tool visibili in base a scope corrente
     */
    function computeVisibleTools() {
        const tm = window.Toolmap || {};
        const toolsById = tm.toolsById || {};
        const allIds = Object.keys(toolsById);

        const baseIds = state.scopeAll ? allIds : (state.scopeIds || []);
        return baseIds.map(id => toolsById[id]).filter(Boolean);
    }

    /**
     * Applica stato starred ai tool (da localStorage + registry)
     */
    function applyStarredState(tools) {
        const starsMap = window.StarsManager?.load() || {};

        for (const tool of tools) {
            // Priorità: localStorage > registry
            const localStar = Object.prototype.hasOwnProperty.call(starsMap, tool.id)
                ? !!starsMap[tool.id]
                : undefined;

            const registryStar = ToolUtils.readBestInFlag(tool);
            tool._starred = localStar !== undefined ? localStar : registryStar;
        }
    }

    /**
     * Ordina tool per: fase > starred > nome
     */
    function sortTools(tools) {
        tools.sort((a, b) => {
            // 1. Ordina per fase
            const keyA = ToolUtils.getPhaseGroupKey(a);
            const keyB = ToolUtils.getPhaseGroupKey(b);

            if (keyA.num !== keyB.num) return keyA.num - keyB.num;

            if (keyA.str !== keyB.str) {
                const cmp = keyA.str.localeCompare(keyB.str, undefined, {sensitivity: 'base'});
                if (cmp !== 0) return cmp;
            }

            // 2. Ordina per starred (starred prima)
            const starA = a._starred ? 0 : 1;
            const starB = b._starred ? 0 : 1;
            if (starA !== starB) return starA - starB;

            // 3. Ordina per nome
            return ToolUtils.compareByName(a, b);
        });
    }

    /**
     * Notifica breadcrumb del contesto corrente
     */
    function notifyBreadcrumb(tools) {
        try {
            const summary = {
                toolsCount: tools.length,
                scopeAll: !!state.scopeAll,
                pathKey: state.pathKey || null,
                hasVisitedAnyPhase: !!hasVisitedAnyPhase
            };

            window.dispatchEvent(new CustomEvent('tm:context:summary', {
                detail: summary
            }));
        } catch (error) {
            console.warn('[app] Errore notifica breadcrumb:', error);
        }
    }

    /**
     * Renderizza stato vuoto (nessun tool trovato)
     */
    function renderEmptyState() {
        const message = 'No tools available for this category.';

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

    // ========================================================================
    // NOTES & EXPORT
    // ========================================================================

    /**
     * Salva nota e scarica JSON aggiornato
     * Chiamato da NotesModal al salvataggio
     */
    function saveNoteAndExport(toolId, note) {
        const tm = window.Toolmap || {};
        const tool = tm.toolsById?.[toolId];

        // Salva nota in memoria
        if (tool) {
            tool.notes = note ?? '';
        }

        // Serializza e scarica JSON
        if (window.JSONExporter) {
            const json = window.JSONExporter.serialize();

            if (json) {
                sessionStorage.setItem(CONSTANTS.STORAGE_KEYS.registryJSON, json);
                window.JSONExporter.download();
            }
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    window.ToolmapApp = {
        render,
        state
    };
})();