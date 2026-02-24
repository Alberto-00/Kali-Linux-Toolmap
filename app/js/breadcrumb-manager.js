/**
 * Gestione breadcrumb di navigazione
 * - Visualizza path corrente o query di ricerca
 * - Animazioni per cambio query in tempo reale
 * - Pulsanti: Show All, Copy Path, Download Registry
 */

(function() {
    'use strict';

    // ========================================================================
    // CONSTANTS
    // ========================================================================

    const SELECTORS = Object.freeze({
        breadcrumb: 'breadcrumb',
        searchInput: 'searchInput',
        breadcrumbBar: '.breadcrumb-bar',
        breadcrumbActions: '.breadcrumb-actions'
    });

    const ANIMATION_DURATION = Object.freeze({
        iconChange: 1200,
        toastVisible: 1000
    });

    // ========================================================================
    // STATE
    // ========================================================================

    const state = {
        currentPathSlash: null,
        lastPathKey: null,
        lastSearchQuery: '',
        lastContextSummary: {
            toolsCount: 0,
            scopeAll: false,
            pathKey: null,
            hasVisitedAnyPhase: false
        }
    };

    // ========================================================================
    // DOM ELEMENTS
    // ========================================================================

    const breadcrumbElement = document.getElementById(SELECTORS.breadcrumb);
    if (!breadcrumbElement) {
        console.warn('[breadcrumb] Elemento breadcrumb non trovato');
        return;
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    const Utils = {
        /**
         * Formatta label rimuovendo prefissi numerici e underscore
         */
        formatLabel(text) {
            const str = String(text || '');
            const withoutPrefix = str.replace(/^\d+_/, '');
            return withoutPrefix.replace(/_/g, ' ');
        },

        /**
         * Escape HTML per prevenire XSS
         */
        escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        /**
         * Converte pathKey (Root>Phase>Sub) in path slash (Phase/Sub)
         */
        convertPathToSlash(pathKey) {
            if (!pathKey) return null;
            return pathKey.replace(/>/g, '/').replace(/^Root\//, '');
        },

        /**
         * Split pathKey in parti e rimuove Root
         */
        splitPathKey(pathKey) {
            if (!pathKey || typeof pathKey !== 'string') return [];

            let parts = pathKey.split('>').filter(Boolean);

            if (parts.length && parts[0].toLowerCase() === 'root') {
                parts = parts.slice(1);
            }

            return parts;
        },

        /**
         * Ricostruisce pathKey completo includendo Root se necessario
         */
        rebuildFullParts(visibleParts, takeCount) {
            const base = [];

            if (state.lastPathKey && typeof state.lastPathKey === 'string') {
                const raw = state.lastPathKey.split('>').filter(Boolean);
                if (raw.length && raw[0].toLowerCase() === 'root') {
                    base.push('Root');
                }
            }

            return base.concat(visibleParts.slice(0, takeCount));
        },

        /**
         * Ottiene query corrente da input ricerca
         */
        getCurrentSearch() {
            const searchInput = document.getElementById(SELECTORS.searchInput);
            return searchInput ? searchInput.value.trim() : '';
        }
    };

    // ========================================================================
    // COPY PATH FUNCTIONALITY
    // ========================================================================

    const CopyPath = {
        /**
         * Copia path corrente in clipboard
         */
        async copy() {
            if (!state.currentPathSlash) return;

            try {
                await navigator.clipboard.writeText(state.currentPathSlash);
                this.showFeedback();
            } catch (error) {
                if (window.MessageModal) {
                    MessageModal.danger('Errore Copia', 'Impossibile copiare il percorso negli appunti.');
                }
            }
        },

        /**
         * Mostra feedback visivo dopo copia
         */
        showFeedback() {
            this.updateIcon();
            this.showToast();
        },

        /**
         * Cambia icona button temporaneamente (checkmark)
         */
        updateIcon() {
            const icon = document.querySelector('.copy-path-icon');
            if (!icon) return;

            const checkmarkSVG = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
            `;

            const copySVG = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
            `;

            icon.innerHTML = checkmarkSVG;

            setTimeout(() => {
                icon.innerHTML = copySVG;
            }, ANIMATION_DURATION.iconChange);
        },

        /**
         * Mostra toast "Copiato!"
         */
        showToast() {
            const button = document.querySelector('.copy-path-btn');
            if (!button) return;

            const rect = button.getBoundingClientRect();
            const toast = this.createToast(rect);

            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));

            setTimeout(() => {
                toast.classList.add('hide');
                toast.addEventListener('animationend', () => {
                    if (toast.classList.contains('hide')) {
                        toast.remove();
                    }
                }, { once: true });
            }, ANIMATION_DURATION.toastVisible);
        },

        /**
         * Crea elemento toast
         */
        createToast(buttonRect) {
            const toast = document.createElement('div');
            toast.className = 'copy-toast';
            toast.textContent = 'Copiato!';
            toast.style.left = (buttonRect.left + buttonRect.width / 2) + 'px';
            toast.style.top = (buttonRect.top - 8) + 'px';
            return toast;
        },

        /**
         * Aggiorna stato abilitazione button (disabilita in search mode)
         */
        updateButtonState() {
            const button = document.querySelector('.copy-path-btn');
            if (!button) return;

            const currentSearch = Utils.getCurrentSearch();
            const inSearchMode = !!currentSearch;

            // Disabilita se non c'è path O se siamo in search mode
            const isDisabled = !state.currentPathSlash || inSearchMode;

            button.disabled = isDisabled;
            button.style.opacity = isDisabled ? '0.5' : '1';
            button.style.cursor = isDisabled ? 'default' : 'pointer';
            button.style.pointerEvents = isDisabled ? 'none' : 'auto';

            if (inSearchMode) {
                button.title = 'Cannot copy path in search mode';
            } else if (!state.currentPathSlash) {
                button.title = 'No path to copy';
            } else {
                button.title = 'Copy current path';
            }
        }
    };

    // ========================================================================
    // BREADCRUMB RENDERING
    // ========================================================================

    const BreadcrumbRenderer = {
        /**
         * Renderizza breadcrumb basandosi su pathKey
         */
        render(pathKey) {
            const currentSearch = Utils.getCurrentSearch();

            // Non auto-renderizzare in search mode
            if (currentSearch) {
                return;
            }

            // Reset search query quando esci dalla ricerca
            if (state.lastSearchQuery) {
                state.lastSearchQuery = '';
            }

            breadcrumbElement.innerHTML = '';

            // Ignora pathKey speciali della ricerca (search:*)
            if (pathKey && pathKey.startsWith('search:')) {
                pathKey = null;
            }

            if (!pathKey || typeof pathKey !== 'string') {
                this.renderDefaultBreadcrumb();
                return;
            }

            this.renderPathBreadcrumb(pathKey);
        },

        /**
         * Renderizza breadcrumb ricerca con animazione typing
         */
        renderSearchBreadcrumb(searchQuery) {
            const existingSearch = breadcrumbElement.querySelector('.search-breadcrumb');
            const queryChanged = state.lastSearchQuery !== searchQuery;

            if (existingSearch && !queryChanged) {
                return;
            }

            const oldQuery = state.lastSearchQuery;
            state.lastSearchQuery = searchQuery;

            // Query cambiata: anima solo il testo
            if (existingSearch && queryChanged) {
                const searchText = existingSearch.querySelector('.search-text strong');

                if (searchText) {
                    this.animateTextChange(searchText, oldQuery, searchQuery);
                }

                CopyPath.updateButtonState();
                return;
            }

            // Prima ricerca: crea breadcrumb completo
            const span = document.createElement('span');
            span.className = 'breadcrumb-item search-breadcrumb';
            span.innerHTML = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <span class="search-text">Search: <strong>${Utils.escapeHTML(searchQuery)}</strong></span>
            `;

            breadcrumbElement.innerHTML = '';
            breadcrumbElement.appendChild(span);

            CopyPath.updateButtonState();
        },

        /**
         * Anima cambio testo (typing effect)
         * Identifica prefisso/suffisso comuni e anima solo la parte cambiata
         */
        animateTextChange(element, oldText, newText) {
            if (!element) return;

            // Trova prefisso comune
            let prefixLen = 0;
            const minLen = Math.min(oldText.length, newText.length);

            for (let i = 0; i < minLen; i++) {
                if (oldText[i].toLowerCase() === newText[i].toLowerCase()) {
                    prefixLen = i + 1;
                } else {
                    break;
                }
            }

            // Trova suffisso comune
            let suffixLen = 0;
            if (prefixLen < minLen) {
                for (let i = 0; i < minLen - prefixLen; i++) {
                    const oldIdx = oldText.length - 1 - i;
                    const newIdx = newText.length - 1 - i;

                    if (oldText[oldIdx].toLowerCase() === newText[newIdx].toLowerCase()) {
                        suffixLen = i + 1;
                    } else {
                        break;
                    }
                }
            }

            // Parti da modificare
            const oldMiddle = oldText.slice(prefixLen, oldText.length - suffixLen);
            const newMiddle = newText.slice(prefixLen, newText.length - suffixLen);

            const prefix = oldText.slice(0, prefixLen);
            const suffix = oldText.slice(oldText.length - suffixLen);

            let currentMiddle = oldMiddle;
            let deleteIndex = 0;

            // Fase 1: Cancella caratteri
            const deleteInterval = setInterval(() => {
                if (deleteIndex >= oldMiddle.length) {
                    clearInterval(deleteInterval);
                    startTyping();
                    return;
                }

                currentMiddle = currentMiddle.slice(0, -1);
                element.textContent = prefix + currentMiddle + suffix;
                deleteIndex++;
            }, 40);

            // Fase 2: Scrivi nuovi caratteri
            const startTyping = () => {
                let typeIndex = 0;
                currentMiddle = '';

                const typeInterval = setInterval(() => {
                    if (typeIndex >= newMiddle.length) {
                        clearInterval(typeInterval);
                        return;
                    }

                    currentMiddle += newMiddle[typeIndex];
                    element.textContent = prefix + currentMiddle + suffix;
                    typeIndex++;
                }, 60);
            };
        },

        /**
         * Renderizza breadcrumb default ("All tools" o "No tools")
         */
        renderDefaultBreadcrumb() {
            state.currentPathSlash = null;

            const span = document.createElement('span');
            span.className = 'breadcrumb-item';

            // Mostra "No tools" solo se nessuna fase è mai stata visitata
            const showNoTools = !state.lastContextSummary.hasVisitedAnyPhase &&
                !state.lastContextSummary.pathKey &&
                !state.lastContextSummary.scopeAll &&
                (state.lastContextSummary.toolsCount || 0) === 0;

            span.textContent = showNoTools ? 'No tools' : 'All tools';
            breadcrumbElement.appendChild(span);
            CopyPath.updateButtonState();
        },

        /**
         * Renderizza breadcrumb path (es: Phase / Category / Subcategory)
         */
        renderPathBreadcrumb(pathKey) {
            state.currentPathSlash = Utils.convertPathToSlash(pathKey);
            const parts = Utils.splitPathKey(pathKey);

            if (!parts.length) {
                this.renderDefaultBreadcrumb();
                return;
            }

            // Renderizza ogni parte con separatore
            parts.forEach((part, index) => {
                this.renderPathSegment(part, index, parts);

                if (index < parts.length - 1) {
                    this.renderSeparator();
                }
            });

            CopyPath.updateButtonState();
        },

        /**
         * Renderizza singolo segmento path (cliccabile)
         */
        renderPathSegment(part, index, allParts) {
            const isLast = index === allParts.length - 1;
            const button = document.createElement('button');

            button.type = 'button';
            button.className = 'breadcrumb-item' + (isLast ? ' active' : '');
            button.textContent = Utils.formatLabel(part);
            button.setAttribute('aria-current', isLast ? 'page' : 'false');

            // Click: naviga a questo livello
            button.addEventListener('click', () => {
                this.handleSegmentClick(allParts, index + 1);
            });

            // Accessibilità tastiera
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });

            breadcrumbElement.appendChild(button);
        },

        /**
         * Renderizza separatore "/"
         */
        renderSeparator() {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = '/';
            separator.setAttribute('aria-hidden', 'true');
            breadcrumbElement.appendChild(separator);
        },

        /**
         * Gestisce click su segmento breadcrumb (navigazione)
         */
        handleSegmentClick(parts, takeCount) {
            const fullParts = Utils.rebuildFullParts(parts, takeCount);
            const pathKey = fullParts.join('>');
            const ids = Array.from(window.Toolmap?.allToolsUnder?.[pathKey] || []);

            window.dispatchEvent(new CustomEvent('tm:scope:set', {
                detail: { pathKey, ids }
            }));
        }
    };

    // ========================================================================
    // BREADCRUMB ACTIONS (Buttons)
    // ========================================================================

    const BreadcrumbActions = {
        /**
         * Assicura che i button azioni esistano
         */
        ensure() {
            const bar = document.querySelector(SELECTORS.breadcrumbBar);
            if (!bar || bar.querySelector(SELECTORS.breadcrumbActions)) return;

            const actionsDiv = this.createActionsContainer();
            bar.appendChild(actionsDiv);
            this.attachEventListeners(actionsDiv);
        },

        /**
         * Crea container HTML con button azioni
         */
        createActionsContainer() {
            const div = document.createElement('div');
            div.className = 'breadcrumb-actions';
            div.innerHTML = `
                <button class="show-all-btn icon-btn" type="button"
                        title="Show all tools" aria-label="Show all tools">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                    </svg>
                    <b>Show All</b>
                </button>
                
                 <button class="ai-manager-btn icon-btn" type="button"
                        title="AI Search Manager" aria-label="AI Search Manager">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                    </svg>
                    <span>AI</span>
                </button>

                <button class="is-installed-btn icon-btn" type="button"
                        title="Tool is Installed" aria-label="Tool is Installed">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                </button>
                
                <button class="copy-path-btn icon-btn copy-path-icon" type="button"
                        title="Copy current path" aria-label="Copy current path">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                </button>
        
                <button class="download-registry-btn icon-btn" type="button"
                        title="Download updated registry" aria-label="Download registry">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                </button>
            `;
            return div;
        },

        /**
         * Attacca event listeners ai button
         */
        attachEventListeners(container) {
            const showAllBtn = container.querySelector('.show-all-btn');
            const downloadBtn = container.querySelector('.download-registry-btn');
            const copyBtn = container.querySelector('.copy-path-btn');
            const aiManagerBtn = container.querySelector('.ai-manager-btn');
            const installedBtn = container.querySelector('.is-installed-btn');

            showAllBtn?.addEventListener('click', this.handleShowAll);
            downloadBtn?.addEventListener('click', this.handleDownload);
            copyBtn?.addEventListener('click', () => CopyPath.copy());
            aiManagerBtn?.addEventListener('click', this.handleAIManager);
            installedBtn?.addEventListener('click', this.handleInstalledToggle);
        },

        /**
         * Handler button "Show All"
         * Comportamento unificato: esci sempre da search mode e mostra tutti i tool
         */
        handleShowAll() {
            const sidebar = document.getElementById('sidebar');
            const inSearch = sidebar && sidebar.classList.contains('search-mode');

            // Se siamo in search mode, prima pulisci la ricerca
            if (inSearch) {
                const searchInput = document.getElementById(SELECTORS.searchInput);
                if (searchInput) {
                    searchInput.value = '';
                }
                // Pulisci stato ricerca senza ripristinare pre-search state
                window.dispatchEvent(new CustomEvent('tm:search:clear', {
                    detail: { skipRestore: true }
                }));
            }

            // Comportamento comune: mostra tutti i tool
            state.currentPathSlash = null;
            BreadcrumbRenderer.render(null);

            window.dispatchEvent(new CustomEvent('tm:sidebar:closeAll'));
            window.dispatchEvent(new CustomEvent('tm:tools:showAll'));
            window.dispatchEvent(new CustomEvent('tm:scope:set', { detail: { all: true } }));
        },

        /**
         * Handler button "Download Registry"
         */
        handleDownload() {
            window.dispatchEvent(new CustomEvent('tm:registry:download'));
        },

        /**
         * Handler button "AI Manager"
         */
        handleAIManager() {
            if (window.AIManagerModal) {
                window.AIManagerModal.open();
            } else {
                console.error('[breadcrumb] AI Manager Modal not loaded');
            }
        },

        /**
         * Handler button "Installed Toggle"
         * Toggle tra visualizzazione solo installed e tutti
         */
        handleInstalledToggle() {
            window.dispatchEvent(new CustomEvent('tm:installed:toggle-mode'));
        },

        /**
         * Aggiorna stato visivo del button installed
         */
        updateInstalledButton(installedOnly) {
            const btn = document.querySelector('.is-installed-btn');
            if (!btn) return;

            btn.classList.toggle('active', !!installedOnly);
            btn.title = installedOnly ? 'Showing installed only – click to show all' : 'Showing all tools – click to show installed only';
            btn.setAttribute('aria-pressed', installedOnly ? 'true' : 'false');
        }
    };

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    function handleScopeSet(event) {
        const pathKey = event.detail?.pathKey || null;

        // Ignora pathKey speciali della ricerca (search:*)
        if (pathKey && pathKey.startsWith('search:')) {
            const currentSearch = Utils.getCurrentSearch();
            if (currentSearch) {
                // Mantieni breadcrumb di ricerca
                return;
            } else {
                // Nessuna ricerca attiva: ripristina
                state.lastPathKey = null;
                BreadcrumbRenderer.render(null);
                return;
            }
        }

        state.lastPathKey = pathKey;
        BreadcrumbRenderer.render(pathKey);
    }

    function handleReset() {
        state.lastPathKey = null;
        state.currentPathSlash = null;
        state.lastSearchQuery = '';
        BreadcrumbRenderer.render(null);
    }

    function handleContextSummary(event) {
        Object.assign(state.lastContextSummary, event.detail || {});

        if (!state.lastContextSummary.pathKey) {
            BreadcrumbRenderer.render(null);
        }
    }

    function handleSearchSet() {
        BreadcrumbRenderer.render(state.lastPathKey);
    }

    /**
     * Handler per aggiornamento query in tempo reale (con animazione)
     */
    function handleSearchQuery(event) {
        const { query, mode } = event.detail || {};

        if (!query) {
            state.lastSearchQuery = '';
            BreadcrumbRenderer.render(state.lastPathKey);
            CopyPath.updateButtonState();
            return;
        }

        // Update breadcrumb con animazione
        const existingSearch = breadcrumbElement.querySelector('.search-breadcrumb');
        const queryChanged = state.lastSearchQuery !== query;

        if (existingSearch && queryChanged) {
            const searchText = existingSearch.querySelector('.search-text strong');
            if (searchText) {
                BreadcrumbRenderer.animateTextChange(searchText, state.lastSearchQuery, query);
            }
            state.lastSearchQuery = query;

            // Update mode indicator (se presente)
            const modeIndicator = existingSearch.querySelector('.search-mode');
            if (modeIndicator) {
                modeIndicator.textContent = mode === 'api' ? '🤖' : '🔍';
                modeIndicator.title = mode === 'api' ? 'AI Search' : 'Fuzzy Search';
            }
        } else if (!existingSearch) {
            // Prima ricerca: crea breadcrumb
            state.lastSearchQuery = query;
            BreadcrumbRenderer.renderSearchBreadcrumb(query, mode);
        }

        CopyPath.updateButtonState();
    }

    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================

    function handleInstalledModeChanged(event) {
        const { installedOnly } = event.detail || {};
        BreadcrumbActions.updateInstalledButton(!!installedOnly);
    }

    function initializeEventListeners() {
        window.addEventListener('tm:scope:set', handleScopeSet);
        window.addEventListener('tm:reset', handleReset);
        window.addEventListener('tm:context:summary', handleContextSummary);
        window.addEventListener('tm:search:set', handleSearchSet);
        window.addEventListener('tm:search:query', handleSearchQuery);
        window.addEventListener('tm:installed:mode-changed', handleInstalledModeChanged);
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    function initialize() {
        BreadcrumbActions.ensure();
        initializeEventListeners();
        BreadcrumbRenderer.render(null);
    }

    initialize();
})();