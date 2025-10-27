// ============================================================================
// tools-renderer.js
// ============================================================================

(() => {
    'use strict';

    // ============================================================================
    // CONSTANTS
    // ============================================================================

    const PHASE_COLORS = {
        '00_Common': 'hsl(270 91% 65%)',
        '01_Information_Gathering': 'hsl(210 100% 62%)',
        '02_Exploitation': 'hsl(4 85% 62%)',
        '03_Post_Exploitation': 'hsl(32 98% 55%)',
        '04_Miscellaneous': 'hsl(158 64% 52%)'
    };

    const PHASE_CANONICAL_MAP = {
        common: 'common',
        general: 'common',
        information: 'information_gathering',
        info: 'information_gathering',
        reconnaissance: 'information_gathering',
        recon: 'information_gathering',
        enumeration: 'information_gathering',
        discovery: 'information_gathering',
        information_gathering: 'information_gathering',
        exploit: 'exploitation',
        exploitation: 'exploitation',
        post: 'post_exploitation',
        'post-exploitation': 'post_exploitation',
        post_exploitation: 'post_exploitation',
        misc: 'miscellaneous',
        miscellaneous: 'miscellaneous',
        other: 'miscellaneous'
    };

    const DATA_ROLES = {
        notes: 'notes',
        repo: 'repo',
        star: 'star'
    };

    // ============================================================================
    // TOOL UTILITIES
    // ============================================================================

    const ToolStarUtils = {
        getBestInValue(tool) {
            if (!tool || typeof tool !== 'object') return undefined;
            const anyTool = tool;
            return anyTool['best_in'] ?? anyTool['bestIn'] ?? anyTool['best-in'] ?? anyTool['best'];
        },

        isLocallyStarred(tool) {
            return tool && (tool._starred === true || tool._starred === 'true');
        },

        isStarredEffective(tool) {
            const registryValue = this.getBestInValue(tool);
            return !!(this.isLocallyStarred(tool) || registryValue);
        }
    };

    // ============================================================================
    // TOOLS RENDERER CLASS
    // ============================================================================

    class ToolsRenderer {
        constructor(gridId, onCardClick, onNotesClick, options = {}) {
            this.grid = this._resolveElement(gridId);
            this.onCardClick = onCardClick;
            this.onNotesClick = onNotesClick;
            this.activePath = this._normalizeActivePath(options.activePath);
        }

        // ========================================================================
        // PUBLIC API
        // ========================================================================

        render(tools, containerOverride) {
            const container = this._resolveContainer(containerOverride);
            if (!container) return;

            if (!Array.isArray(tools) || tools.length === 0) {
                container.innerHTML = MarkupGenerator.emptyState();
                return;
            }

            container.innerHTML = tools.map(tool => MarkupGenerator.card(tool)).join('');
            this._attachEventListeners(container, tools);
        }

        // ========================================================================
        // EVENT LISTENERS
        // ========================================================================

        _attachEventListeners(container, tools) {
            const cards = Array.from(container.querySelectorAll('.card[data-tool-id]'));

            cards.forEach((card, index) => {
                const tool = tools[index];
                this._attachCardClickListener(card, tool);
                this._attachNotesButtonListener(card, tool);
                this._attachRepoLinkListener(card);
                this._attachStarButtonListener(card, tool);
            });
        }

        _attachCardClickListener(card, tool) {
            if (card.dataset._boundCard) return;

            card.dataset._boundCard = '1';
            card.addEventListener('click', (e) => {
                const isActionButton = e.target.closest(
                    `[data-role="${DATA_ROLES.notes}"], [data-role="${DATA_ROLES.repo}"], [data-role="${DATA_ROLES.star}"]`
                );

                if (isActionButton) return;

                if (typeof this.onCardClick === 'function') {
                    this.onCardClick(tool);
                } else {
                    window.dispatchEvent(new CustomEvent('tm:card:openDetails', { detail: { tool } }));
                }
            });
        }

        _attachNotesButtonListener(card, tool) {
            const notesBtn = card.querySelector(`[data-role="${DATA_ROLES.notes}"]`);
            if (!notesBtn || notesBtn.dataset._boundNotes) return;

            notesBtn.dataset._boundNotes = '1';
            notesBtn.addEventListener('click', (e) => {
                e.stopPropagation();

                if (typeof this.onNotesClick === 'function') {
                    this.onNotesClick(tool);
                } else {
                    window.dispatchEvent(new CustomEvent('tm:card:openNotes', { detail: { tool } }));
                }
            });
        }

        _attachRepoLinkListener(card) {
            const repoLink = card.querySelector(`[data-role="${DATA_ROLES.repo}"]`);
            if (!repoLink || repoLink.dataset._boundRepo) return;

            repoLink.dataset._boundRepo = '1';
            repoLink.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        _attachStarButtonListener(card, tool) {
            const starElement = card.querySelector(`[data-role="${DATA_ROLES.star}"]`);
            if (!starElement || starElement.dataset._boundStar) return;

            starElement.dataset._boundStar = '1';

            const toggleStar = (event) => {
                event.stopPropagation();
                const currentState = starElement.getAttribute('data-starred') === '1';
                const nextState = !currentState;

                window.dispatchEvent(new CustomEvent('tm:tool:toggleStar', {
                    detail: { id: tool.id, value: nextState }
                }));
            };

            starElement.addEventListener('click', toggleStar);
            starElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleStar(e);
                }
            });
        }

        // ========================================================================
        // HELPER METHODS
        // ========================================================================

        _resolveElement(elementOrId) {
            return typeof elementOrId === 'string'
                ? document.getElementById(elementOrId)
                : elementOrId;
        }

        _resolveContainer(containerOverride) {
            if (containerOverride) {
                return this._resolveElement(containerOverride);
            }
            return this.grid;
        }

        _normalizeActivePath(activePath) {
            if (!activePath) return [];

            if (typeof activePath === 'string') {
                return activePath.split(/[\/>]/).map(s => s.trim()).filter(Boolean);
            }

            return Array.isArray(activePath) ? activePath : [];
        }

        // ========================================================================
        // STATIC API
        // ========================================================================

        static render(tools, containerElOrId) {
            const element = typeof containerElOrId === 'string'
                ? document.getElementById(containerElOrId)
                : containerElOrId;

            const instance = new ToolsRenderer(element, null, null, {});
            return instance.render(tools, element);
        }
    }

    // ============================================================================
    // MARKUP GENERATOR
    // ============================================================================

    class MarkupGenerator {
        static card(tool) {
            const phase = this._extractPhase(tool);
            const phaseColor = PhaseUtils.getColor(phase);
            const title = tool?.title || tool?.name || tool?.id || 'Unknown Tool';
            const version = tool?.version ? String(tool.version) : '';
            const description = (tool?.desc || tool?.description || '').trim();

            return `
                <article class="card tool-card" 
                         data-tool-id="${HTMLUtils.escapeAttr(tool?.id ?? '')}" 
                         data-phase="${HTMLUtils.escapeAttr(phase)}" 
                         style="--phase:${phaseColor}">
                    <div class="card-badges">${this._starBadge(tool)}</div>
                    <div class="img" style="${this._imageStyle(tool, phaseColor)}"></div>
                    <h3 class="card-title">
                        <span class="title-text">
                            ${HTMLUtils.escape(title)}${version ? ` <span class="version-chip">v${HTMLUtils.escape(version)}</span>` : ''}
                        </span>
                    </h3>
                    <p class="info">${HTMLUtils.escape(description || 'No description available')}</p>
                    <div class="card-meta">
                        <span class="phase-badge" style="--phase:${phaseColor};">
                            <span class="phase-icon-wrap" aria-hidden="true">${IconGenerator.phase(phase)}</span>
                            <span class="phase-label">${HTMLUtils.escape(PhaseUtils.formatLabel(phase))}</span>
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
        }

        static emptyState() {
            return `
                <div class="empty-state" style="color:var(--muted);text-align:center;padding:2rem;">
                    <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
                        <path fill="currentColor" d="M4 4h10l4 4v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm12 1H5v14h12V9h-3a2 2 0 0 1-2-2V5z"/>
                    </svg>
                    <h3 style="margin:.6rem 0 0 0;">No tools found</h3>
                    <p style="margin:.2rem 0 0 0;">Try selecting a different category or adjusting your search</p>
                </div>
            `;
        }

        static _extractPhase(tool) {
            return tool?.phase || (Array.isArray(tool?.phases) ? tool.phases[0] : null) || '00_Common';
        }

        static _imageStyle(tool, phaseColor) {
            if (tool?.icon) {
                return `background-image:url('${HTMLUtils.escapeAttr(tool.icon)}');`;
            }

            return `background:linear-gradient(135deg, color-mix(in srgb, ${phaseColor} 22%, transparent), color-mix(in srgb, ${phaseColor} 11%, transparent));`;
        }

        static _starBadge(tool) {
            const categoryPath = Array.isArray(tool?.category_path) ? tool.category_path : [];
            const label = categoryPath.length ? categoryPath[categoryPath.length - 1] : 'Best in category';
            const phase = categoryPath.length ? categoryPath[0] : (tool?.phase || tool?.phases?.[0]) || '04_Miscellaneous';
            const activeColor = PhaseUtils.getColor(phase);
            const isStarred = ToolStarUtils.isStarredEffective(tool);
            const mutedFill = 'hsl(var(--muted, 0 0% 60%))';

            return `
                <svg class="best-star" viewBox="0 0 24 24"
                     role="button" tabindex="0"
                     data-role="star" data-starred="${isStarred ? '1' : '0'}"
                     aria-pressed="${isStarred ? 'true' : 'false'}"
                     aria-label="${HTMLUtils.escape(label)}">
                    <title>${HTMLUtils.escape(label)}</title>
                    <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.4l1.1-6.5L2.6 9.3l6.5-.9L12 2.5z"
                          style="${isStarred ? `fill:${activeColor};stroke:none;` : `fill:${mutedFill};stroke:none;`}"/>
                </svg>
            `;
        }

        static _repoButton(tool) {
            if (!tool?.repo) return '';

            return `
                <a href="${HTMLUtils.escapeAttr(tool.repo)}" target="_blank" rel="noopener noreferrer"
                   class="repo-link icon-btn" data-role="repo" title="Repository" aria-label="Open repository">
                    ${IconGenerator.repo()}<b>Repo</b>
                </a>
            `;
        }

        static _notesButton() {
            return `
                <button class="notes-btn icon-btn" data-role="notes" type="button" 
                        title="View/Edit Notes" aria-label="View or edit notes">
                    ${IconGenerator.notes()}<b>Notes</b>
                </button>
            `;
        }
    }

    // ============================================================================
    // PHASE UTILITIES
    // ============================================================================

    class PhaseUtils {
        static getColor(phase) {
            return PHASE_COLORS[phase] || 'hsl(var(--accent))';
        }

        static formatLabel(str) {
            return String(str || '')
                .replace(/^\d+[_-]*/, '')
                .replace(/_/g, ' ')
                .trim() || 'Common';
        }

        static getCanonicalKey(phase) {
            const normalized = this._normalizeKey(phase);
            return PHASE_CANONICAL_MAP[normalized] || normalized || 'miscellaneous';
        }

        static _normalizeKey(str) {
            return String(str || '')
                .toLowerCase()
                .replace(/^\d+[\s_-]*/, '')
                .replace(/[^\w\s\/-]+/g, '')
                .replace(/[\s-]+/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '');
        }
    }

    // ============================================================================
    // ICON GENERATOR
    // ============================================================================

    class IconGenerator {
        static phase(phase) {
            const canonicalKey = PhaseUtils.getCanonicalKey(phase);
            const sidebarIcons = window.SIDEBAR_ICONS;

            if (sidebarIcons && sidebarIcons[canonicalKey]) {
                return sidebarIcons[canonicalKey];
            }

            return this._getFallbackIcon(canonicalKey);
        }

        static _getFallbackIcon(canonicalKey) {
            const iconMap = {
                information_gathering: this.search(),
                exploitation: this.bolt(),
                post_exploitation: this.gear(),
                common: this.grid()
            };

            return iconMap[canonicalKey] || this.dots();
        }

        static repo() {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                     viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                     class="lucide lucide-external-link w-3.5 h-3.5">
                    <path d="M15 3h6v6"></path>
                    <path d="M10 14 21 3"></path>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                </svg>
            `;
        }

        static notes() {
            return `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                     viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                     class="lucide lucide-file-text w-3.5 h-3.5">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                    <path d="M10 9H8"></path>
                    <path d="M16 13H8"></path>
                    <path d="M16 17H8"></path>
                </svg>
            `;
        }

        static grid() {
            return `
                <svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
                </svg>
            `;
        }

        static search() {
            return `
                <svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M10 2a8 8 0 105.3 14l4.1 4.1 1.4-1.4-4.1-4.1A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/>
                </svg>
            `;
        }

        static bolt() {
            return `
                <svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M13 2L4 14h6l-2 8 9-12h-6l2-8z"/>
                </svg>
            `;
        }

        static gear() {
            return `
                <svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.7 3.4l-1.7-.3a6.7 6.7 0 00-.8-1.8l1-1.4-1.4-1.4-1.4 1a6.7 6.7 0 00-1.8-.8l-.3-1.7h-2l-.3 1.7a6.7 6.7 0 00-1.8.8l-1.4-1-1.4 1.4 1 1.4a6.7 6.7 0 00-.8 1.8l-1.7.3v2l1.7.3c.2.6.5 1.2.8 1.8l-1 1.4 1.4 1.4 1.4-1a6.7 6.7 0 001.8.8l.3 1.7h2l.3-1.7a6.7 6.7 0 001.8-.8l1.4 1 1.4-1.4-1-1.4c.3-.6.6-1.2.8-1.8l1.7-.3v-2z"/>
                </svg>
            `;
        }

        static dots() {
            return `
                <svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="5" cy="12" r="2" fill="currentColor"/>
                    <circle cx="12" cy="12" r="2" fill="currentColor"/>
                    <circle cx="19" cy="12" r="2" fill="currentColor"/>
                </svg>
            `;
        }
    }

    // ============================================================================
    // HTML UTILITIES
    // ============================================================================

    class HTMLUtils {
        static escape(str) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };

            return String(str).replace(/[&<>"']/g, char => map[char]);
        }

        static escapeAttr(str) {
            return this.escape(str).replace(/"/g, '&quot;');
        }
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.ToolsRenderer = ToolsRenderer;
})();