// ============================================================================
// tools-renderer.js
// ============================================================================

function _getBestInValue(tool) {
    if (!tool || typeof tool !== 'object') return undefined;
    // bracket notation evita l'errore "unresolved property"
    const anyTool = /** @type {any} */ (tool);
    return anyTool['best_in'] ?? anyTool['bestIn'] ?? anyTool['best-in'] ?? anyTool['best'];
}

// Legge lo stato "best_in" effettivo (registry + override locale)
function _isLocallyStarred(tool) {
    return tool && (tool._starred === true || tool._starred === 'true');
}

function _isStarredEffective(tool) {
    const reg = _getBestInValue(tool);
    return !!(_isLocallyStarred(tool) || reg);
}

(function () {
    'use strict';

    const PHASE_COLORS = {
        '00_Common': 'var(--color-common)',
        '01_Information_Gathering': 'var(--color-info)',
        '02_Exploitation': 'var(--color-exploit)',
        '03_Post_Exploitation': 'var(--color-post)',
        '04_Miscellaneous': 'var(--color-misc)'
    };

    // Mappa alternative → chiave canonica per le icone (SIDEBAR_ICONS)
    const CANON_MAP = {
        common: 'common', general: 'common',
        information: 'information_gathering', info: 'information_gathering',
        reconnaissance: 'information_gathering', recon: 'information_gathering',
        enumeration: 'information_gathering', discovery: 'information_gathering',
        information_gathering: 'information_gathering',
        exploit: 'exploitation', exploitation: 'exploitation',
        post: 'post_exploitation', 'post-exploitation': 'post_exploitation', post_exploitation: 'post_exploitation',
        misc: 'miscellaneous', miscellaneous: 'miscellaneous', other: 'miscellaneous'
    };

    class ToolsRenderer {
        constructor(gridId, onCardClick, onNotesClick, options = {}) {
            this.grid = typeof gridId === 'string' ? document.getElementById(gridId) : gridId;
            this.onCardClick = onCardClick;
            this.onNotesClick = onNotesClick;
            this.activePath = this._normalizeActivePath(options.activePath);
        }

        render(tools, containerOverride) {
            const container = containerOverride
                ? (typeof containerOverride === 'string' ? document.getElementById(containerOverride) : containerOverride)
                : this.grid;

            if (!container) return;
            if (!Array.isArray(tools) || tools.length === 0) {
                container.innerHTML = this._emptyHTML();
                return;
            }

            container.innerHTML = tools.map(t => this._cardHTML(t)).join('');

            // Bind azioni (card + notes)
            const cards = Array.from(container.querySelectorAll('.card[data-tool-id]'));
            cards.forEach((card, i) => {
                const tool = tools[i];
                // Click card → dettagli
                if (!card.dataset._boundCard) {
                    card.dataset._boundCard = '1';
                    card.addEventListener('click', (e) => {
                        // Evita conflitto con il bottone note
                        if (e.target.closest?.('[data-role="notes"], [data-role="repo"], [data-role="star"]')) return;
                        if (typeof this.onCardClick === 'function') this.onCardClick(tool);
                        else window.dispatchEvent(new CustomEvent('tm:card:openDetails', {detail: {tool}}));
                    });
                }
                // Click note → NotesModal
                const notesBtn = card.querySelector('[data-role="notes"]');
                if (notesBtn && !notesBtn.dataset._boundNotes) {
                    notesBtn.dataset._boundNotes = '1';
                    notesBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (typeof this.onNotesClick === 'function') this.onNotesClick(tool);
                        else window.dispatchEvent(new CustomEvent('tm:card:openNotes', {detail: {tool}}));
                    });
                }
                const repoLink = card.querySelector('[data-role="repo"]');
                if (repoLink && !repoLink.dataset._boundRepo) {
                    repoLink.dataset._boundRepo = '1';
                    repoLink.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                }
                const starEl = card.querySelector?.('[data-role="star"]');
                if (starEl && !starEl.dataset._boundStar) {
                    starEl.dataset._boundStar = '1';
                    const toggle = (ev) => {
                        ev.stopPropagation();
                        const current = starEl.getAttribute('data-starred') === '1';
                        const next = !current;
                        window.dispatchEvent(new CustomEvent('tm:tool:toggleStar', {
                            detail: {id: tool.id, value: next}
                        }));
                    };
                    starEl.addEventListener('click', toggle);
                    starEl.addEventListener('keydown', (ke) => {
                        if (ke.key === 'Enter' || ke.key === ' ') {
                            ke.preventDefault();
                            toggle(ke);
                        }
                    });
                }
            });
        }

        // ---------------------------- Markup ---------------------------------
        _cardHTML(tool) {
            const phase = tool?.phase || (Array.isArray(tool?.phases) ? tool.phases[0] : null) || '00_Common';
            const phaseColor = this._phaseColor(phase);
            const title = tool?.title || tool?.name || tool?.id || 'Unknown Tool';
            const version = tool?.version ? String(tool.version) : '';
            const desc = (tool?.desc || tool?.description || '').trim();

            const imgStyle = tool?.icon
                ? `background-image:url('${this._escAttr(tool.icon)}');background-size:contain;background-position:center;background-repeat:no-repeat;background-color:color-mix(in srgb, ${phaseColor} 10%, transparent);`
                : `background:linear-gradient(135deg, color-mix(in srgb, ${phaseColor} 22%, transparent), color-mix(in srgb, ${phaseColor} 11%, transparent));`;

            const bestStars = this._bestStars(tool);

            const repoBtn = tool?.repo ? `
        <a href="${this._escAttr(tool.repo)}" target="_blank" rel="noopener noreferrer"
           class="repo-link icon-btn" data-role="repo" title="Repository" aria-label="Open repository">
          ${this._iconRepo()}<b>Repo</b>
        </a>` : '';

            const notesBtn = `
        <button class="notes-btn icon-btn" data-role="notes" type="button" title="View/Edit Notes" aria-label="View or edit notes">
          ${this._iconNotes()}<b>Notes</b>
        </button>`;

            const phaseIcon = this._phaseIcon(phase);

            return `
        <article class="card tool-card" data-tool-id="${this._escAttr(tool?.id ?? '')}" data-phase="${this._escAttr(phase)}" style="--phase:${phaseColor}">
          <div class="card-badges">${bestStars}</div>

          <div class="img" style="${imgStyle}"></div>

          <h3 class="card-title">
            <span class="title-text">
              ${this._escHTML(title)}${version ? ` <span class="version-chip">v${this._escHTML(version)}</span>` : ''}
            </span>
          </h3>

          <p class="info">${this._escHTML(desc || 'No description available')}</p>

          <div class="card-meta">
            <span class="phase-badge" style="--phase:${phaseColor};">
              <span class="phase-icon-wrap" aria-hidden="true">${phaseIcon}</span>
              <span class="phase-label">${this._escHTML(this._formatLabel(phase))}</span>
            </span>
          </div>

          <div class="card-footer">
            <div class="card-actions">
              ${repoBtn}
              ${notesBtn}
            </div>
          </div>
        </article>
      `;
        }

        _emptyHTML() {
            return `
        <div class="empty-state" style="color:var(--muted);text-align:center;padding:2rem;">
          <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
            <path fill="currentColor" d="M4 4h10l4 4v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm12 1H5v14h12V9h-3a2 2 0 0 1-2-2V5z"/>
          </svg>
          <h3 style="margin:.6rem 0 0 0;">No tools found</h3>
          <p style="margin:.2rem 0 0 0;">Try selecting a different category or adjusting your search</p>
        </div>`;
        }

        // -------------------------- Best-in / Stars ---------------------------
        _bestStars(tool) {
            const cat = Array.isArray(tool?.category_path) ? tool.category_path : [];
            const label = cat.length ? cat[cat.length - 1] : 'Best in category';
            const ph = (cat.length ? cat[0] : (tool?.phase || tool?.phases?.[0])) || '04_Miscellaneous';

            const activeColor = this._phaseColor(ph);             // colore fase quando ON
            const isOn = _isStarredEffective(tool);

            // Grigio pieno quando OFF (usa --muted se definito; fallback a 60% gray)
            const mutedFill = 'hsl(var(--muted, 0 0% 60%))';

            return `
              <svg class="best-star" viewBox="0 0 24 24"
                   role="button" tabindex="0"
                   data-role="star" data-starred="${isOn ? '1' : '0'}"
                   aria-pressed="${isOn ? 'true' : 'false'}"
                   aria-label="${this._escHTML(label)}">
                <title>${this._escHTML(label)}</title>
                <path
                  d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.4l1.1-6.5L2.6 9.3l6.5-.9L12 2.5z"
                  style="${isOn
                            ? `fill:${activeColor};stroke:none;`
                            : `fill:${mutedFill};stroke:none;`}"
                />
              </svg>`;
        }

        // ----------------------------- Icone ---------------------------------
        _phaseIcon(phase) {
            // Usa SIDEBAR_ICONS se disponibile
            const canon = this._canonPhaseKey(phase);
            const iconMap = (typeof window !== 'undefined' && window.SIDEBAR_ICONS) ? window.SIDEBAR_ICONS : null;
            if (iconMap && iconMap[canon]) return iconMap[canon];

            // Fallback interni
            if (canon === 'information_gathering') return this._iconSearch();
            if (canon === 'exploitation') return this._iconBolt();
            if (canon === 'post_exploitation') return this._iconGear();
            if (canon === 'common') return this._iconGrid();
            return this._iconDots();
        }

        _iconRepo() {
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="lucide lucide-external-link w-3.5 h-3.5">
          <path d="M15 3h6v6"></path><path d="M10 14 21 3"></path>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        </svg>`;
        }

        _iconNotes() {
            return `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
             viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             class="lucide lucide-file-text w-3.5 h-3.5">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
          <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
          <path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path>
        </svg>`;
        }

        _iconGrid() {
            return `
        <svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
        </svg>`;
        }

        _iconSearch() {
            return `
        <svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M10 2a8 8 0 105.3 14l4.1 4.1 1.4-1.4-4.1-4.1A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z"/>
        </svg>`;
        }

        _iconBolt() {
            return `
        <svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M13 2L4 14h6l-2 8 9-12h-6l2-8z"/>
        </svg>`;
        }

        _iconGear() {
            return `
        <svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12 8a4 4 0 100 8 4 4 0 000-8zm8.7 3.4l-1.7-.3a6.7 6.7 0 00-.8-1.8l1-1.4-1.4-1.4-1.4 1a6.7 6.7 0 00-1.8-.8l-.3-1.7h-2l-.3 1.7a6.7 6.7 0 00-1.8.8l-1.4-1-1.4 1.4 1 1.4a6.7 6.7 0 00-.8 1.8l-1.7.3v2l1.7.3c.2.6.5 1.2.8 1.8l-1 1.4 1.4 1.4 1.4-1a6.7 6.7 0 001.8.8l.3 1.7h2l.3-1.7a6.7 6.7 0 001.8-.8l1.4 1 1.4-1.4-1-1.4c.3-.6.6-1.2.8-1.8l1.7-.3v-2z"/>
        </svg>`;
        }

        _iconDots() {
            return `
        <svg class="phase-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/>
        </svg>`;
        }

        // ---------------------------- Helpers --------------------------------
        _phaseColor(phase) {
            return PHASE_COLORS[phase] || 'var(--accent-2)';
        }

        _canonPhaseKey(phase) {
            const k = this._normKey(phase);
            return CANON_MAP[k] || k || 'miscellaneous';
        }

        _formatLabel(s) {
            return String(s || '').replace(/^\d+[_-]*/, '').replace(/_/g, ' ').trim() || 'Common';
        }

        _normKey(s) {
            return String(s || '')
                .toLowerCase()
                .replace(/^\d+[\s_-]*/, '')
                .replace(/[^\w\s\/-]+/g, '')
                .replace(/[\s-]+/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '');
        }

        _normalizeActivePath(activePath) {
            if (!activePath) return [];
            if (typeof activePath === 'string') {
                return activePath.split(/[\/>]/).map(s => s.trim()).filter(Boolean);
            }
            return Array.isArray(activePath) ? activePath : [];
        }

        _escHTML(str) {
            return String(str).replace(/[&<>"']/g, s => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[s]));
        }

        _escAttr(str) {
            return this._escHTML(str).replace(/"/g, '&quot;');
        }

        // ------------------------ API statica helper -------------------------
        static render(tools, containerElOrId) {
            const el = typeof containerElOrId === 'string'
                ? document.getElementById(containerElOrId)
                : containerElOrId;
            const inst = new ToolsRenderer(el, null, null, {});
            return inst.render(tools, el);
        }
    }

    // Esporta globalmente (classe con metodo statico .render)
    window.ToolsRenderer = ToolsRenderer;
})();
