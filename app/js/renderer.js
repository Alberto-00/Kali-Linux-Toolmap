/**
 * Renderizza le card dei tool nel grid HTML
 * Genera markup e gestisce eventi interattivi
 */

(function() {
    'use strict';

    const ToolUtils = window.ToolUtils;
    const DOMUtils = window.DOMUtils;

    // ========================================================================
    // ICON GENERATOR
    // ========================================================================

    /**
     * Generatore di icone SVG per fasi e azioni
     */
    const Icons = {
        /**
         * Ottiene icona per fase (da SIDEBAR_ICONS o fallback)
         */
        phase(phase) {
            const canonicalKey = this._getCanonicalKey(phase);
            const sidebarIcons = window.SIDEBAR_ICONS;

            if (sidebarIcons?.[canonicalKey]) {
                return sidebarIcons[canonicalKey];
            }

            return this._getFallback(canonicalKey);
        },

        /**
         * Normalizza nome fase per lookup icona
         */
        _getCanonicalKey(phase) {
            const normalized = String(phase || '')
                .toLowerCase()
                .replace(/^\d+[\s_-]*/, '')
                .replace(/[^\w\s\/-]+/g, '')
                .replace(/[\s-]+/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '');

            const map = {
                common: 'common',
                information_gathering: 'information_gathering',
                exploitation: 'exploitation',
                post_exploitation: 'post_exploitation',
                miscellaneous: 'miscellaneous'
            };

            return map[normalized] || normalized || 'miscellaneous';
        },

        /**
         * Icona fallback se non trovata in SIDEBAR_ICONS
         */
        _getFallback(key) {
            const iconMap = {
                information_gathering: this.search(),
                exploitation: this.bolt(),
                post_exploitation: this.gear(),
                common: this.grid()
            };
            return iconMap[key] || this.dots();
        },

        // Icone SVG inline
        repo() {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>`;
        },

        notes() {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>`;
        },

        grid() {
            return `<svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>`;
        },

        search() {
            return `<svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 2a8 8 0 105.3 14l4.1 4.1 1.4-1.4-4.1-4.1A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/></svg>`;
        },

        bolt() {
            return `<svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 2L4 14h6l-2 8 9-12h-6l2-8z"/></svg>`;
        },

        gear() {
            return `<svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.7 3.4l-1.7-.3a6.7 6.7 0 00-.8-1.8l1-1.4-1.4-1.4-1.4 1a6.7 6.7 0 00-1.8-.8l-.3-1.7h-2l-.3 1.7a6.7 6.7 0 00-1.8.8l-1.4-1-1.4 1.4 1 1.4a6.7 6.7 0 00-.8 1.8l-1.7.3v2l1.7.3c.2.6.5 1.2.8 1.8l-1 1.4 1.4 1.4 1.4-1a6.7 6.7 0 001.8.8l.3 1.7h2l.3-1.7a6.7 6.7 0 001.8-.8l1.4 1 1.4-1.4-1-1.4c.3-.6.6-1.2.8-1.8l1.7-.3v-2z"/></svg>`;
        },

        dots() {
            return `<svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>`;
        }
    };

    // ========================================================================
    // STAR UTILITIES
    // ========================================================================

    /**
     * Helper per determinare stato "starred" di un tool
     */
    const StarUtils = {
        /**
         * Verifica se tool è starred (locale o da registry)
         */
        isStarred(tool) {
            if (!tool) return false;

            // Priorità: flag locale _starred > flag registry best_in
            if (tool._starred === true || tool._starred === 'true') return true;

            return !!ToolUtils.readBestInFlag(tool);
        }
    };

    // ========================================================================
    // MARKUP GENERATOR
    // ========================================================================

    /**
     * Genera HTML per card e componenti
     */
    const Markup = {
        /**
         * Genera HTML completo di una card tool
         */
        card(tool) {
            if (!tool) return '';

            const phase = ToolUtils.getPrimaryPhase(tool);
            const phaseColor = ToolUtils.getPhaseColor(phase);
            const title = ToolUtils.getName(tool);
            const version = tool?.version ? String(tool.version) : '';
            const description = (tool?.desc || tool?.description || '').trim();

            return `
                <article class="card tool-card" 
                         data-tool-id="${DOMUtils.escapeAttr(tool?.id ?? '')}" 
                         data-phase="${DOMUtils.escapeAttr(phase)}" 
                         style="--phase:${phaseColor}">
                    <div class="card-badges">${this._starBadge(tool)}</div>
                    <div class="img" style="${this._imageStyle(tool, phaseColor)}"></div>
                    <h3 class="card-title">
                        <span class="title-text">
                            ${DOMUtils.escapeHtml(title)}${version ? ` <span class="version-chip">v${DOMUtils.escapeHtml(version)}</span>` : ''}
                        </span>
                    </h3>
                    <p class="info">${DOMUtils.escapeHtml(description || 'No description available')}</p>
                    <div class="card-meta">
                        <span class="phase-badge" style="--phase:${phaseColor};">
                            <span class="phase-icon-wrap" aria-hidden="true">${Icons.phase(phase)}</span>
                            <span class="phase-label">${DOMUtils.escapeHtml(DOMUtils.formatLabel(phase))}</span>
                        </span>
                    </div>
                    <div class="card-footer">
                        <div class="card-actions">
                            ${this._repoButton(tool)}
                            ${this._notesButton()}
                        </div>
                    </div>
                </article>
            `;
        },

        /**
         * Stato vuoto quando non ci sono tool
         */
        emptyState() {
            return `
                <div class="empty-state" style="color:var(--muted);text-align:center;padding:2rem;">
                    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
                        <path fill="currentColor" d="M4 4h10l4 4v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm12 1H5v14h12V9h-3a2 2 0 0 1-2-2V5z"/>
                    </svg>
                    <h3 style="margin:.6rem 0 0 0;">No tools found</h3>
                    <p style="margin:.2rem 0 0 0;">Try selecting a different category or adjusting your filters</p>
                </div>
            `;
        },

        /**
         * Genera style per immagine card (icona o gradient)
         */
        _imageStyle(tool, phaseColor) {
            if (tool?.icon) {
                return `background-image:url('${DOMUtils.escapeAttr(tool.icon)}');`;
            }
            // Gradient sfumato con colore fase
            return `background:linear-gradient(135deg, color-mix(in srgb, ${phaseColor} 22%, transparent), color-mix(in srgb, ${phaseColor} 11%, transparent));`;
        },

        /**
         * Badge stella (favorito)
         */
        _starBadge(tool) {
            const categoryPath = ToolUtils.getCategoryPath(tool);
            const label = categoryPath.length ? categoryPath[categoryPath.length - 1] : 'Best in category';
            const phase = categoryPath.length ? categoryPath[0] : '04_Miscellaneous';
            const activeColor = ToolUtils.getPhaseColor(phase);
            const isStarred = StarUtils.isStarred(tool);
            const mutedFill = 'hsl(var(--muted, 0 0% 60%))';

            return `
                <svg class="best-star" viewBox="0 0 24 24"
                     role="button" tabindex="0"
                     data-role="star" data-starred="${isStarred ? '1' : '0'}"
                     aria-pressed="${isStarred ? 'true' : 'false'}"
                     aria-label="${DOMUtils.escapeHtml(label)}">
                    <title>${DOMUtils.escapeHtml(label)}</title>
                    <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.4l1.1-6.5L2.6 9.3l6.5-.9L12 2.5z"
                          style="${isStarred ? `fill:${activeColor};stroke:none;` : `fill:${mutedFill};stroke:none;`}"/>
                </svg>
            `;
        },

        /**
         * Button link repository (se presente)
         */
        _repoButton(tool) {
            if (!tool?.repo) return '';

            return `
                <a href="${DOMUtils.escapeAttr(tool.repo)}" target="_blank" rel="noopener noreferrer"
                   class="repo-link icon-btn" data-role="repo" title="Repository" aria-label="Open repository">
                    ${Icons.repo()}<b>Repo</b>
                </a>
            `;
        },

        /**
         * Button note (sempre presente)
         */
        _notesButton() {
            return `
                <button class="notes-btn icon-btn" data-role="notes" type="button" 
                        title="View/Edit Notes" aria-label="View or edit notes">
                    ${Icons.notes()}<b>Notes</b>
                </button>
            `;
        }
    };

    // ========================================================================
    // RENDERER CLASS
    // ========================================================================

    /**
     * Classe principale per rendering delle card
     * Gestisce rendering e attach event listeners
     */
    class ToolsRenderer {
        constructor(gridId, onCardClick, onNotesClick) {
            // Accetta sia ID stringa che elemento DOM
            this.grid = typeof gridId === 'string'
                ? document.getElementById(gridId)
                : gridId;

            this.onCardClick = onCardClick;
            this.onNotesClick = onNotesClick;
        }

        /**
         * Renderizza array di tool nel container
         * @param {Array} tools - Array di oggetti tool
         * @param {String|Element} containerOverride - Container opzionale (override this.grid)
         */
        render(tools, containerOverride) {
            const container = containerOverride
                ? (typeof containerOverride === 'string' ? document.getElementById(containerOverride) : containerOverride)
                : this.grid;

            if (!container) {
                console.warn('[renderer] Container non trovato');
                return;
            }

            // Mostra empty state se nessun tool
            if (!Array.isArray(tools) || tools.length === 0) {
                container.innerHTML = Markup.emptyState();
                return;
            }

            // Genera HTML e inietta nel DOM
            container.innerHTML = tools.map(tool => Markup.card(tool)).join('');

            // Attacca event listeners
            this._attachEventListeners(container, tools);
        }

        /**
         * Attacca tutti gli event listener alle card renderizzate
         * @private
         */
        _attachEventListeners(container, tools) {
            const cards = Array.from(container.querySelectorAll('.card[data-tool-id]'));

            cards.forEach((card, index) => {
                const tool = tools[index];
                if (!tool) return;

                this._attachCardClick(card, tool);
                this._attachNotesButton(card, tool);
                this._attachRepoLink(card);
                this._attachStarButton(card, tool);
            });
        }

        /**
         * Click su card (apre dettagli)
         * @private
         */
        _attachCardClick(card, tool) {
            // Previeni doppio binding
            if (card.dataset._boundCard) return;
            card.dataset._boundCard = '1';

            card.addEventListener('click', (e) => {
                // Ignora click su bottoni/link interni
                const isAction = e.target.closest('[data-role="notes"], [data-role="repo"], [data-role="star"]');
                if (isAction) return;

                // Chiama callback o dispatch evento
                if (typeof this.onCardClick === 'function') {
                    this.onCardClick(tool);
                } else {
                    window.dispatchEvent(new CustomEvent('tm:card:openDetails', {
                        detail: { tool }
                    }));
                }
            });
        }

        /**
         * Click su button note
         * @private
         */
        _attachNotesButton(card, tool) {
            const btn = card.querySelector('[data-role="notes"]');
            if (!btn || btn.dataset._boundNotes) return;
            btn.dataset._boundNotes = '1';

            btn.addEventListener('click', (e) => {
                e.stopPropagation();

                if (typeof this.onNotesClick === 'function') {
                    this.onNotesClick(tool);
                } else {
                    window.dispatchEvent(new CustomEvent('tm:card:openNotes', {
                        detail: { tool }
                    }));
                }
            });
        }

        /**
         * Click su link repository (previene propagazione)
         * @private
         */
        _attachRepoLink(card) {
            const link = card.querySelector('[data-role="repo"]');
            if (!link || link.dataset._boundRepo) return;
            link.dataset._boundRepo = '1';

            link.addEventListener('click', (e) => e.stopPropagation());
        }

        /**
         * Click su stella (toggle favorite)
         * @private
         */
        _attachStarButton(card, tool) {
            const star = card.querySelector('[data-role="star"]');
            if (!star || star.dataset._boundStar) return;
            star.dataset._boundStar = '1';

            const toggle = (e) => {
                e.stopPropagation();
                const current = star.getAttribute('data-starred') === '1';

                window.dispatchEvent(new CustomEvent('tm:tool:toggleStar', {
                    detail: { id: tool.id, value: !current }
                }));
            };

            // Click e accessibilità tastiera
            star.addEventListener('click', toggle);
            star.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle(e);
                }
            });
        }

        /**
         * Metodo statico per rendering veloce (senza istanza)
         */
        static render(tools, containerElOrId) {
            const element = typeof containerElOrId === 'string'
                ? document.getElementById(containerElOrId)
                : containerElOrId;

            const instance = new ToolsRenderer(element, null, null);
            return instance.render(tools, element);
        }
    }

    // ========================================================================
    // EXPORT
    // ========================================================================

    window.ToolsRenderer = ToolsRenderer;

})();