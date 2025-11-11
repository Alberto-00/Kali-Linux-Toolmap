// ============================================================================
// back-to-top.js
// ============================================================================
// Descrizione: Gestisce il pulsante "Back to Top" con scroll detection
// Dipendenze: Nessuna

(() => {
    'use strict';

    if (window.__BackToTopInit) return;
    window.__BackToTopInit = true;

    const CONFIG = {
        buttonId: 'backToTopBtn',
        scrollThreshold: 200,
        visibleClass: 'visible'
    };

    const state = {
        button: null,
        scrollContainer: null,
        onScrollHandler: null
    };

    // ============================================================================
    // SCROLL CONTAINER
    // ============================================================================

    const ScrollContainer = {
        get() {
            const grid = document.querySelector('.tools-grid');
            return grid || document.scrollingElement || document.documentElement;
        },

        isDocument(container) {
            return container === document.scrollingElement ||
                   container === document.documentElement;
        },

        getScrollTop(container) {
            if (!container) return 0;

            if (this.isDocument(container)) {
                return window.scrollY || document.documentElement.scrollTop || 0;
            }

            return container.scrollTop || 0;
        },

        scrollToTop(container) {
            if (!container) return;

            if (this.isDocument(container)) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                container.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    // ============================================================================
    // BUTTON
    // ============================================================================

    const Button = {
        ensure() {
            state.button = document.getElementById(CONFIG.buttonId);

            if (state.button) return state.button;

            state.button = this.create();
            document.body.appendChild(state.button);
            this.attachEventListeners();

            return state.button;
        },

        create() {
            const button = document.createElement('button');
            button.id = CONFIG.buttonId;
            button.className = 'back-to-top';
            button.title = 'Back to top';
            button.setAttribute('aria-label', 'Back to top');
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                     width="24" height="24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" 
                          stroke-width="2" d="M5 15l7-7 7 7"/>
                </svg>
            `;
            return button;
        },

        attachEventListeners() {
            if (!state.button) return;

            state.button.addEventListener('click', () => {
                ScrollContainer.scrollToTop(ScrollContainer.get());
            }, { passive: true });

            state.button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    ScrollContainer.scrollToTop(ScrollContainer.get());
                }
            });
        },

        updateVisibility() {
            if (!state.button || !state.scrollContainer) return;

            const scrollTop = ScrollContainer.getScrollTop(state.scrollContainer);
            const isVisible = scrollTop > CONFIG.scrollThreshold;

            state.button.classList.toggle(CONFIG.visibleClass, isVisible);
        },

        applyPhaseColor(color) {
            if (!state.button) return;

            if (color) {
                state.button.style.setProperty(
                    '--phase-color',
                    `color-mix(in srgb, ${color} 100%, transparent)`
                );
            } else {
                state.button.style.removeProperty('--phase-color');
            }
        }
    };

    // ============================================================================
    // SCROLL LISTENER
    // ============================================================================

    const ScrollListener = {
        attach() {
            this.detach();

            state.scrollContainer = ScrollContainer.get();
            state.onScrollHandler = () => Button.updateVisibility();

            const options = { passive: true };

            if (ScrollContainer.isDocument(state.scrollContainer)) {
                window.addEventListener('scroll', state.onScrollHandler, options);
            } else {
                state.scrollContainer.addEventListener('scroll', state.onScrollHandler, options);
            }

            Button.updateVisibility();
        },

        detach() {
            if (!state.onScrollHandler || !state.scrollContainer) return;

            if (ScrollContainer.isDocument(state.scrollContainer)) {
                window.removeEventListener('scroll', state.onScrollHandler);
            } else {
                state.scrollContainer.removeEventListener('scroll', state.onScrollHandler);
            }

            state.onScrollHandler = null;
        }
    };

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================

    function handleScopeSet() {
        ScrollListener.attach();
    }

    function handlePhaseColor(event) {
        const color = event.detail?.color || null;
        Button.applyPhaseColor(color);
    }

    function handleReset() {
        Button.applyPhaseColor(null);
        ScrollListener.attach();
    }

    // ============================================================================
    // INIT
    // ============================================================================

    function initialize() {
        Button.ensure();
        ScrollListener.attach();

        window.addEventListener('tm:scope:set', handleScopeSet);
        window.addEventListener('tm:phase:color:apply', handlePhaseColor);
        window.addEventListener('tm:reset', handleReset);
    }

    initialize();
})();