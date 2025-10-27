// ============================================================================
// search-manager.js
// ============================================================================

(() => {
    'use strict';

    // Prevent double initialization
    if (window.__SearchManagerInit) return;
    window.__SearchManagerInit = true;

    // ============================================================================
    // CONSTANTS
    // ============================================================================

    const CONFIG = {
        inputId: 'searchInput',
        storageKey: 'tm:search:q',
        debounceDelay: 300
    };

    const KEYS = {
        escape: 'Escape',
        slash: '/'
    };

    // ============================================================================
    // DOM ELEMENTS
    // ============================================================================

    const searchInput = document.getElementById(CONFIG.inputId);
    if (!searchInput) return;

    // ============================================================================
    // STORAGE UTILITIES
    // ============================================================================

    const Storage = {
        get() {
            try {
                return localStorage.getItem(CONFIG.storageKey) || '';
            } catch {
                return '';
            }
        },

        set(value) {
            try {
                localStorage.setItem(CONFIG.storageKey, value);
            } catch {}
        },

        remove() {
            try {
                localStorage.removeItem(CONFIG.storageKey);
            } catch {}
        }
    };

    // ============================================================================
    // SEARCH DISPATCH
    // ============================================================================

    const SearchDispatcher = {
        dispatch(query) {
            const trimmedQuery = (query || '').trim();

            window.dispatchEvent(new CustomEvent('tm:search:set', {
                detail: {
                    q: trimmedQuery,
                    hasQuery: !!trimmedQuery,
                    source: 'search-input'
                }
            }));
        }
    };

    // ============================================================================
    // DEBOUNCE UTILITY
    // ============================================================================

    const Debounce = {
        timerId: null,

        create(callback, delay) {
            return (...args) => {
                clearTimeout(this.timerId);
                this.timerId = setTimeout(() => callback(...args), delay);
            };
        }
    };

    // ============================================================================
    // INPUT HANDLERS
    // ============================================================================

    const InputHandlers = {
        handleInput: Debounce.create(() => {
            const query = searchInput.value.trim();
            Storage.set(query);
            SearchDispatcher.dispatch(query);
        }, CONFIG.debounceDelay),

        handleKeydown(event) {
            if (event.key === KEYS.escape) {
                event.preventDefault();
                this.clearSearch();
            }
        },

        clearSearch() {
            searchInput.value = '';
            Storage.remove();
            SearchDispatcher.dispatch('');
        }
    };

    // ============================================================================
    // GLOBAL SHORTCUTS
    // ============================================================================

    const GlobalShortcuts = {
        handleSlashShortcut(event) {
            if (event.key !== KEYS.slash) return;
            if (this.isTypingContext()) return;

            event.preventDefault();
            searchInput.focus();
        },

        isTypingContext() {
            const activeElement = document.activeElement;
            if (!activeElement) return false;

            const isInputField = activeElement.tagName === 'INPUT' ||
                               activeElement.tagName === 'TEXTAREA';
            const isContentEditable = activeElement.isContentEditable;

            return isInputField || isContentEditable;
        }
    };

    // ============================================================================
    // APP EVENT HANDLERS
    // ============================================================================

    const AppEventHandlers = {
        handleReset() {
            const hadQuery = !!(searchInput.value && searchInput.value.trim());

            searchInput.value = '';
            Storage.remove();

            if (hadQuery) {
                SearchDispatcher.dispatch('');
            }
        }
    };

    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================

    function attachEventListeners() {
        // Input events
        searchInput.addEventListener('input', InputHandlers.handleInput);
        searchInput.addEventListener('keydown', (e) => InputHandlers.handleKeydown(e));

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => GlobalShortcuts.handleSlashShortcut(e));

        // App events
        window.addEventListener('tm:reset', () => AppEventHandlers.handleReset());
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function initialize() {
        const savedQuery = Storage.get();

        if (savedQuery) {
            searchInput.value = savedQuery;
            SearchDispatcher.dispatch(savedQuery);
        }

        attachEventListeners();
    }

    initialize();
})();