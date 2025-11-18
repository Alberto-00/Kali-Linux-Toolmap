/**
 * Pulsante "Back to Top" con rilevamento scroll
 * Si mostra automaticamente dopo aver scrollato oltre la soglia
 * Si adatta ai colori delle fasi
 */

(function() {
    'use strict';

    // Previeni doppia inizializzazione
    if (window.__BackToTopInit) return;
    window.__BackToTopInit = true;

    // Configurazione
    const CONFIG = Object.freeze({
        buttonId: 'backToTopBtn',
        scrollThreshold: 200,      // Mostra button dopo 200px di scroll
        visibleClass: 'visible'
    });

    // State interno
    const state = {
        button: null,
        scrollContainer: null,
        onScrollHandler: null
    };

    // ========================================================================
    // SCROLL CONTAINER
    // ========================================================================

    const ScrollContainer = {
        /**
         * Ottiene il container di scroll attuale
         * Priorità: .tools-grid > document
         */
        get() {
            const grid = document.querySelector('.tools-grid');
            return grid || document.scrollingElement || document.documentElement;
        },

        /**
         * Verifica se il container è il document stesso
         */
        isDocument(container) {
            return container === document.scrollingElement ||
                   container === document.documentElement;
        },

        /**
         * Ottiene posizione scroll in pixel
         */
        getScrollTop(container) {
            if (!container) return 0;

            if (this.isDocument(container)) {
                return window.scrollY || document.documentElement.scrollTop || 0;
            }

            return container.scrollTop || 0;
        },

        /**
         * Scrolla a inizio pagina con animazione smooth
         */
        scrollToTop(container) {
            if (!container) return;

            if (this.isDocument(container)) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                container.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    };

    // ========================================================================
    // BUTTON
    // ========================================================================

    const Button = {
        /**
         * Assicura che il button esista, lo crea se necessario
         */
        ensure() {
            state.button = document.getElementById(CONFIG.buttonId);

            if (state.button) return state.button;

            // Crea e inietta button
            state.button = this.create();
            document.body.appendChild(state.button);
            this.attachEventListeners();

            return state.button;
        },

        /**
         * Crea elemento button DOM
         */
        create() {
            const button = document.createElement('button');
            button.id = CONFIG.buttonId;
            button.className = 'back-to-top';
            button.title = 'Torna su';
            button.setAttribute('aria-label', 'Torna su');
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                     width="24" height="24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" 
                          stroke-width="2" d="M5 15l7-7 7 7"/>
                </svg>
            `;
            return button;
        },

        /**
         * Attacca event listeners (click e tastiera)
         */
        attachEventListeners() {
            if (!state.button) return;

            // Click handler
            state.button.addEventListener('click', () => {
                ScrollContainer.scrollToTop(ScrollContainer.get());
            }, { passive: true });

            // Accessibilità tastiera (Enter/Spazio)
            state.button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    ScrollContainer.scrollToTop(ScrollContainer.get());
                }
            });
        },

        /**
         * Aggiorna visibilità button in base a posizione scroll
         */
        updateVisibility() {
            if (!state.button || !state.scrollContainer) return;

            const scrollTop = ScrollContainer.getScrollTop(state.scrollContainer);
            const shouldShow = scrollTop > CONFIG.scrollThreshold;

            state.button.classList.toggle(CONFIG.visibleClass, shouldShow);
        },

        /**
         * Applica colore fase al button
         */
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

    // ========================================================================
    // SCROLL LISTENER
    // ========================================================================

    const ScrollListener = {
        /**
         * Attacca scroll listener al container corrente
         */
        attach() {
            this.detach(); // Pulisci listener precedente

            state.scrollContainer = ScrollContainer.get();
            state.onScrollHandler = () => Button.updateVisibility();

            const options = { passive: true };

            if (ScrollContainer.isDocument(state.scrollContainer)) {
                window.addEventListener('scroll', state.onScrollHandler, options);
            } else {
                state.scrollContainer.addEventListener('scroll', state.onScrollHandler, options);
            }

            // Check visibilità iniziale
            Button.updateVisibility();
        },

        /**
         * Rimuove scroll listener (cleanup)
         */
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

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

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

    // ========================================================================
    // INIT
    // ========================================================================

    function initialize() {
        Button.ensure();
        ScrollListener.attach();

        // Registra event listeners globali
        window.addEventListener('tm:scope:set', handleScopeSet);
        window.addEventListener('tm:phase:color', handlePhaseColor);
        window.addEventListener('tm:reset', handleReset);
    }

    initialize();
})();