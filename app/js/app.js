// ============================================================================
// app.js
// ============================================================================
// Descrizione: Orchestrator principale - gestisce stato globale, rendering, eventi
// Dipendenze: constants.js, utils.js, registry.js, renderer.js, features.js

(() => {
    'use strict';

    const CONSTANTS = window.TOOLMAP_CONSTANTS;
    const ToolUtils = window.ToolUtils;
    const DOMUtils = window.DOMUtils;

    // ============================================================================
    // STATE
    // ============================================================================

    const state = {
        scopeAll: true,
        scopeIds: null,
        pathKey: null,
        isResetting: false
    };

    let grid, resetBtn, notesModal, detailsModal, toolsRenderer;
    let hasVisitedAnyPhase = false;
    let eventsWired = false;

    // ============================================================================
    // STORAGE
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
            } catch {}
        },

        remove(key) {
            try {
                sessionStorage.removeItem(key);
            } catch {}
        },

        // ========================================================================
        // PULIZIA TOTALE (localStorage + sessionStorage)
        // ========================================================================
        clearAll() {
            try {
                // Pulisci tutto il localStorage
                localStorage.clear();
                console.log('[app] localStorage cleared');
            } catch (e) {
                console.warn('[app] Failed to clear localStorage:', e);
            }

            try {
                // Pulisci tutto il sessionStorage
                sessionStorage.clear();
                console.log('[app] sessionStorage cleared');
            } catch (e) {
                console.warn('[app] Failed to clear sessionStorage:', e);
            }
        }
    };

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    DOMUtils.ready(() => {
        // ========================================================================
        // PULIZIA AL CARICAMENTO DELLA PAGINA (Ctrl+R)
        // ========================================================================
        cleanupOnLoad();

        initializeDOM();
        restoreState();
        wireEvents();
        render();
    });

    function cleanupOnLoad() {
        // Rileva se è un reload (Ctrl+R, F5, ecc.)
        const isReload = performance.getEntriesByType('navigation')[0]?.type === 'reload';

        if (isReload) {
            Storage.clearAll();
        }
    }

    function initializeDOM() {
        grid = document.getElementById(CONSTANTS.SELECTORS.grid);
        resetBtn = document.getElementById(CONSTANTS.SELECTORS.resetBtn);

        if (window.NotesModal) {
            notesModal = new window.NotesModal(saveNoteAndExport);
        }

        if (window.DetailsModal) {
            detailsModal = new window.DetailsModal();
        }

        if (window.ToolsRenderer) {
            toolsRenderer = new window.ToolsRenderer(
                grid,
                (tool) => detailsModal?.show(tool),
                (tool) => notesModal?.show(tool)
            );
        }
    }

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

    // ============================================================================
    // EVENT WIRING
    // ============================================================================

    function wireEvents() {
        if (eventsWired) return;
        eventsWired = true;

        window.addEventListener('tm:scope:set', handleScopeSet);
        window.addEventListener('tm:tool:toggleStar', handleToggleStar);
        window.addEventListener('tm:tools:showAll', handleShowAll);
        window.addEventListener('tm:reset', handleReset);
        window.addEventListener('tm:registry:ready', handleRegistryReady);
        window.addEventListener('tm:card:openNotes', handleCardOpenNotes);
        window.addEventListener('tm:card:openDetails', handleCardOpenDetails);
        window.addEventListener('tm:stars:updated', handleStarsUpdated);

        resetBtn?.addEventListener('click', handleResetClick);

        // ========================================================================
        // LISTENER CTRL+R / F5 - Pulisce tutto prima del reload
        // ========================================================================
        window.addEventListener('beforeunload', () => {
            console.log('[app] Page unloading - clearing all storage');
            Storage.clearAll();
        });
    }

    function handleScopeSet(event) {
        if (state.isResetting && !event.detail?.all) return;

        const { all, ids, pathKey } = event.detail || {};
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

    function handleToggleStar() {
        render();
    }

    function handleStarsUpdated() {
        render();
    }

    function handleShowAll() {
        state.scopeAll = true;
        render();
    }

    function handleResetClick() {
        console.log('[app] Reset button clicked - clearing all storage');

        state.isResetting = true;

        // ========================================================================
        // PULIZIA TOTALE (localStorage + sessionStorage)
        // ========================================================================
        Storage.clearAll();

        // Reset state
        state.scopeAll = true;
        state.scopeIds = null;
        state.pathKey = null;
        hasVisitedAnyPhase = false;

        // Dispatch events
        window.dispatchEvent(new Event('tm:reset'));
        window.dispatchEvent(new CustomEvent('tm:scope:set', { detail: { all: true } }));
        window.dispatchEvent(new CustomEvent('tm:phase:color', { detail: { color: null } }));

        render();

        setTimeout(() => {
            state.isResetting = false;
        }, 100);

        console.log('[app] Reset completed - state restored to initial');
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
        const savedPathKey = Storage.get(CONSTANTS.STORAGE_KEYS.pathKey);
        if (savedPathKey && !state.isResetting) {
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

        if (toolsRenderer) {
            toolsRenderer.render(tools);
        }

        // Apply stagger animation
        requestAnimationFrame(() => {
            const cards = grid.querySelectorAll('.card');
            cards.forEach((card, index) => {
                card.style.setProperty('--card-index', index);
            });
        });
    }

    function computeVisibleTools() {
        const tm = window.Toolmap || {};
        const toolsById = tm.toolsById || {};
        const allIds = Object.keys(toolsById);

        const baseIds = state.scopeAll ? allIds : (state.scopeIds || []);
        return baseIds.map(id => toolsById[id]).filter(Boolean);
    }

    function applyStarredState(tools) {
        const starsMap = window.StarsManager?.load() || {};

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
                const cmp = keyA.str.localeCompare(keyB.str, undefined, { sensitivity: 'base' });
                if (cmp !== 0) return cmp;
            }

            // Sort by starred
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
            window.dispatchEvent(new CustomEvent('tm:context:summary', { detail: summary }));
        } catch {}
    }

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

    // ============================================================================
    // NOTES & EXPORT
    // ============================================================================

    function saveNoteAndExport(toolId, note) {
        const tm = window.Toolmap || {};
        const tool = tm.toolsById?.[toolId];

        // Salva la nota in memoria
        if (tool) {
            tool.notes = note ?? '';
        }

        // Salva e scarica JSON
        if (window.JSONExporter) {
            const json = window.JSONExporter.serialize();
            if (json) {
                sessionStorage.setItem(CONSTANTS.STORAGE_KEYS.registryJSON, json);
                window.JSONExporter.download();
                console.log('[app] Note saved and JSON exported for tool:', toolId);
            }
        }
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.ToolmapApp = {
        render,
        state
    };
})();