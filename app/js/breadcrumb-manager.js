// ============================================================================
// breadcrumb-manager.js
// ============================================================================

(() => {
    'use strict';

    // ============================================================================
    // CONSTANTS & CONFIGURATION
    // ============================================================================

    const SELECTORS = {
        breadcrumb: 'breadcrumb',
        searchInput: 'searchInput',
        breadcrumbBar: '.breadcrumb-bar',
        breadcrumbActions: '.breadcrumb-actions'
    };

    const ANIMATION_DURATION = {
        iconChange: 1200,
        toastVisible: 1000
    };

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

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

    // ============================================================================
    // DOM ELEMENTS
    // ============================================================================

    const breadcrumbElement = document.getElementById(SELECTORS.breadcrumb);
    if (!breadcrumbElement) return;

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    const Utils = {
        formatLabel(text) {
            const str = String(text || '');
            const withoutPrefix = str.replace(/^\d+_/, '');
            return withoutPrefix.replace(/_/g, ' ');
        },

        escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        convertPathToSlash(pathKey) {
            if (!pathKey) return null;
            return pathKey.replace(/>/g, '/').replace(/^Root\//, '');
        },

        splitPathKey(pathKey) {
            if (!pathKey || typeof pathKey !== 'string') return [];

            let parts = pathKey.split('>').filter(Boolean);

            if (parts.length && parts[0].toLowerCase() === 'root') {
                parts = parts.slice(1);
            }

            return parts;
        },

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

        getCurrentSearch() {
            const searchInput = document.getElementById(SELECTORS.searchInput);
            return searchInput ? searchInput.value.trim() : '';
        }
    };

    // ============================================================================
    // COPY PATH FUNCTIONALITY
    // ============================================================================

    const CopyPath = {
        async copy() {
            if (!state.currentPathSlash) return;

            try {
                await navigator.clipboard.writeText(state.currentPathSlash);
                this.showFeedback();
            } catch (error) {
                console.error('Failed to copy path:', error);
            }
        },

        showFeedback() {
            this.updateIcon();
            this.showToast();
        },

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
                }, {once: true});
            }, ANIMATION_DURATION.toastVisible);
        },

        createToast(buttonRect) {
            const toast = document.createElement('div');
            toast.className = 'copy-toast';
            toast.textContent = 'Copiato!';
            toast.style.left = (buttonRect.left + buttonRect.width / 2) + 'px';
            toast.style.top = (buttonRect.top - 8) + 'px';
            return toast;
        },

        updateButtonState() {
            const button = document.querySelector('.copy-path-btn');
            if (!button) return;

            const isDisabled = !state.currentPathSlash;
            button.disabled = isDisabled;
            button.style.opacity = isDisabled ? '0.5' : '1';
            button.style.cursor = isDisabled ? 'default' : 'pointer';
            button.style.pointerEvents = isDisabled ? 'none' : 'auto';

            if (isDisabled) {
                button.title = 'No path to copy';
            } else {
                button.title = 'Copy current path';
            }
        }
    };

    // ============================================================================
    // BREADCRUMB RENDERING
    // ============================================================================

    const BreadcrumbRenderer = {
        render(pathKey) {
            const currentSearch = Utils.getCurrentSearch();

            if (currentSearch) {
                this.renderSearchBreadcrumb(currentSearch);
                return;
            }

            // Reset search query quando esci dalla ricerca
            if (state.lastSearchQuery) {
                state.lastSearchQuery = '';
            }

            breadcrumbElement.innerHTML = '';

            if (!pathKey || typeof pathKey !== 'string') {
                this.renderDefaultBreadcrumb();
                return;
            }

            this.renderPathBreadcrumb(pathKey);
        },

        renderSearchBreadcrumb(searchQuery) {
            const existingSearch = breadcrumbElement.querySelector('.search-breadcrumb');
            const queryChanged = state.lastSearchQuery !== searchQuery;

            if (existingSearch && !queryChanged) {
                return;
            }

            const oldQuery = state.lastSearchQuery;
            state.lastSearchQuery = searchQuery;

            // Se esiste già un breadcrumb di ricerca e la query è cambiata
            if (existingSearch && queryChanged) {
                const searchText = existingSearch.querySelector('.search-text strong');

                if (searchText) {
                    this.animateTextChange(searchText, oldQuery, searchQuery);
                }

                CopyPath.updateButtonState();
                return;
            }

            // Prima ricerca: crea il breadcrumb completo
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

        animateTextChange(element, oldText, newText) {
            if (!element) return;

            // Aggiungi classe typing per mostrare cursor
            element.classList.add('typing');

            // Trova il prefisso comune
            let commonLength = 0;
            const minLength = Math.min(oldText.length, newText.length);

            for (let i = 0; i < minLength; i++) {
                if (oldText[i].toLowerCase() === newText[i].toLowerCase()) {
                    commonLength = i + 1;
                } else {
                    break;
                }
            }

            // Fase 1: Cancella i caratteri in eccesso (da destra verso sinistra)
            const charsToDelete = oldText.length - commonLength;
            let currentText = oldText;
            let deleteIndex = 0;

            const deleteInterval = setInterval(() => {
                if (deleteIndex >= charsToDelete) {
                    clearInterval(deleteInterval);
                    // Fase 2: Inizia a scrivere i nuovi caratteri
                    startTyping();
                    return;
                }

                currentText = currentText.slice(0, -1);
                element.textContent = currentText;
                deleteIndex++;
            }, 40); // 40ms per carattere durante la cancellazione

            const startTyping = () => {
                const charsToAdd = newText.slice(commonLength);
                let typeIndex = 0;

                const typeInterval = setInterval(() => {
                    if (typeIndex >= charsToAdd.length) {
                        clearInterval(typeInterval);
                        // Rimuovi cursor dopo aver finito
                        setTimeout(() => {
                            element.classList.remove('typing');
                        }, 500);
                        return;
                    }

                    currentText += charsToAdd[typeIndex];
                    element.textContent = currentText;
                    typeIndex++;
                }, 60); // 60ms per carattere durante la scrittura
            };
        },

        renderDefaultBreadcrumb() {
            state.currentPathSlash = null;

            const span = document.createElement('span');
            span.className = 'breadcrumb-item';

            const showNoTools = !state.lastContextSummary.hasVisitedAnyPhase &&
                !state.lastContextSummary.pathKey &&
                !state.lastContextSummary.scopeAll &&
                (state.lastContextSummary.toolsCount || 0) === 0;

            span.textContent = showNoTools ? 'No tools' : 'All tools';
            breadcrumbElement.appendChild(span);
            CopyPath.updateButtonState();
        },

        renderPathBreadcrumb(pathKey) {
            state.currentPathSlash = Utils.convertPathToSlash(pathKey);
            const parts = Utils.splitPathKey(pathKey);

            if (!parts.length) {
                this.renderDefaultBreadcrumb();
                return;
            }

            parts.forEach((part, index) => {
                this.renderPathSegment(part, index, parts);

                if (index < parts.length - 1) {
                    this.renderSeparator();
                }
            });

            CopyPath.updateButtonState();
        },

        renderPathSegment(part, index, allParts) {
            const isLast = index === allParts.length - 1;
            const button = document.createElement('button');

            button.type = 'button';
            button.className = 'breadcrumb-item' + (isLast ? ' active' : '');
            button.textContent = Utils.formatLabel(part);
            button.setAttribute('aria-current', isLast ? 'page' : 'false');

            button.addEventListener('click', () => {
                this.handleSegmentClick(allParts, index + 1);
            });

            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });

            breadcrumbElement.appendChild(button);
        },

        renderSeparator() {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = '/';
            separator.setAttribute('aria-hidden', 'true');
            breadcrumbElement.appendChild(separator);
        },

        handleSegmentClick(parts, takeCount) {
            const fullParts = Utils.rebuildFullParts(parts, takeCount);
            const pathKey = fullParts.join('>');
            const ids = Array.from(window.Toolmap?.allToolsUnder?.[pathKey] || []);

            window.dispatchEvent(new CustomEvent('tm:scope:set', {
                detail: {pathKey, ids}
            }));
        }
    };

    // ============================================================================
    // BREADCRUMB ACTIONS (Buttons)
    // ============================================================================

    const BreadcrumbActions = {
        ensure() {
            const bar = document.querySelector(SELECTORS.breadcrumbBar);
            if (!bar || bar.querySelector(SELECTORS.breadcrumbActions)) return;

            const actionsDiv = this.createActionsContainer();
            bar.appendChild(actionsDiv);
            this.attachEventListeners(actionsDiv);
        },

        createActionsContainer() {
            const div = document.createElement('div');
            div.className = 'breadcrumb-actions';
            div.innerHTML = `
                <button class="show-all-btn icon-btn" type="button" 
                        title="Show all tools" aria-label="Show all tools">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                    <b>Show All</b>
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

        attachEventListeners(container) {
            const showAllBtn = container.querySelector('.show-all-btn');
            const downloadBtn = container.querySelector('.download-registry-btn');
            const copyBtn = container.querySelector('.copy-path-btn');

            showAllBtn?.addEventListener('click', this.handleShowAll);
            downloadBtn?.addEventListener('click', this.handleDownload);
            copyBtn?.addEventListener('click', () => CopyPath.copy());
        },

        handleShowAll() {
            const sidebar = document.getElementById('sidebar');
            const inSearch = sidebar && sidebar.classList.contains('search-mode');

            if (inSearch) {
                // Modalità ricerca: emetti evento specifico per show all in ricerca
                window.dispatchEvent(new CustomEvent('tm:show:all', {
                    detail: {source: 'breadcrumb', searchMode: true}
                }));
            } else {
                // Modalità normale
                state.currentPathSlash = null;
                BreadcrumbRenderer.render(null);
                window.dispatchEvent(new CustomEvent('tm:tools:showAll'));
            }
        },

        handleDownload() {
            window.dispatchEvent(new CustomEvent('tm:registry:download'));
        }
    };

    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================

    function initializeEventListeners() {
        window.addEventListener('tm:scope:set', handleScopeSet);
        window.addEventListener('tm:reset', handleReset);
        window.addEventListener('tm:context:summary', handleContextSummary);
        window.addEventListener('tm:search:set', handleSearchSet);
    }

    function handleScopeSet(event) {
        const pathKey = event.detail?.pathKey || null;
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

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function initialize() {
        BreadcrumbActions.ensure();
        initializeEventListeners();
        BreadcrumbRenderer.render(null);
    }

    initialize();
})();