// ============================================================================
// tools-manager.js (sostituzione completa - event-driven, compatibile)
// ============================================================================

(() => {
    'use strict';

    const SEL = {
        grid: 'toolsGrid',
        resetBtn: 'resetBtn',
        searchInput: 'searchInput'
    };

    const MEM = {
        search: 'tm:search:q'
    };

    const state = {
        scopeAll: true,      // true = mostra tutti i tool
        scopeIds: null,      // array di id (nodo + discendenti)
        pathKey: null,       // "Root>Fase>…>Nodo"
        search: ''           // query testuale
    };

    let grid, resetBtn, notesModal, detailsModal, rendererAdapter;

    // ---------------------------- Bootstrap DOM ----------------------------

// --- aggiungi in cima, vicino a state/ready ---
    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, {once: true});
        } else {
            (window.queueMicrotask ? queueMicrotask : setTimeout)(fn, 0);
        }
    }

// Avvia lo scope "All tools" anche se l'evento iniziale è mancato
    function kickstartAllToolsOnce() {
        const loaded = !!(window.Toolmap && window.Toolmap.__loaded);
        const count = loaded ? Object.keys(window.Toolmap.toolsById || {}).length : 0;

        if (loaded && count > 0) {
            // forza la vista "tutti"
            window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {all: true}}));
        } else {
            // aspetta il registry e poi forza
            window.addEventListener('tm:registry:ready', () => {
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {all: true}}));
                }, 0);
            }, {once: true});
        }
    }

    ready(() => {
        grid = document.getElementById(SEL.grid);
        resetBtn = document.getElementById(SEL.resetBtn);

        // Modali
        if (window.NotesModal) {
            notesModal = new window.NotesModal(saveNoteAndExport);
        }
        detailsModal = new ToolDetailsModal();

        // Ripristina search salvata (se esiste)
        const savedQ = localStorage.getItem(MEM.search) || '';
        state.search = savedQ;
        const input = document.getElementById(SEL.searchInput);
        if (input && savedQ) input.value = savedQ;

        // Wiring eventi app
        wireEvents();

        // Primo render (mostra empty o attende tm:scope:set all:true dal loader)
        render();
    });

    // ----------------------------- Event wiring ----------------------------
    function wireEvents() {
        // Filtro di scope da sidebar/breadcrumb mini
        window.addEventListener('tm:scope:set', (ev) => {
            const {all, ids, pathKey} = ev.detail || {};
            state.scopeAll = !!all || (!ids && !pathKey);
            state.scopeIds = ids || null;
            state.pathKey = pathKey || null;
            render();
        });

        // Ricerca testuale (gestita da search-manager.js)
        window.addEventListener('tm:search:set', (ev) => {
            state.search = (ev.detail?.q || '');
            localStorage.setItem(MEM.search, state.search);
            render();
        });

        // Colore di fase (propaga anche a back-to-top)
        window.addEventListener('tm:phase:color', (ev) => {
            const content = document.querySelector('.content');
            const color = ev.detail?.color || null;
            if (content) {
                if (color) content.style.setProperty('--hover-color', `color-mix(in srgb, ${color} 100%, transparent)`);
                else content.style.removeProperty('--hover-color');
            }
            // Notifica il bottone "back to top"
            window.dispatchEvent(new CustomEvent('tm:phase:color:apply', {detail: {color}}));
        });

        // Reset globale
        resetBtn?.addEventListener('click', () => {
            localStorage.removeItem(MEM.search);
            const input = document.getElementById(SEL.searchInput);
            if (input) input.value = '';
            // Cascata di reset per sidebar, breadcrumb, search, hover pane, ecc.
            window.dispatchEvent(new Event('tm:reset'));
            // Torna a "tutti i tool"
            window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {all: true}}));
            // Rimuovi colore
            window.dispatchEvent(new CustomEvent('tm:phase:color', {detail: {color: null}}));
        });

        // Pulizia estetica extra su reset
        window.addEventListener('tm:reset', () => {
            const content = document.querySelector('.content');
            content?.style.removeProperty('--hover-color');
        });

        // (Opzionale) quando il registry è pronto, se per qualche motivo non arriva tm:scope:set, forziamo "all"
        window.addEventListener('tm:registry:ready', () => {
            // Il tools-loader già emette tm:scope:set { all:true }, quindi qui non serve forzare.
            // Manteniamo lo hook per estensioni future.
        });

        // Eventi di fallback emessi dal renderer (se non sono state passate callback)
        window.addEventListener('tm:card:openNotes', (e) => {
            const tool = e.detail?.tool;
            if (tool && notesModal) notesModal.show(tool);
        });
        window.addEventListener('tm:card:openDetails', (e) => {
            const tool = e.detail?.tool;
            if (tool && detailsModal) detailsModal.show(tool);
        });

    }

    // ------------------------------ Rendering ------------------------------
    function getRenderer() {
        if (rendererAdapter) return rendererAdapter;

        // 1) Se esiste la classe → istanziala (così passiamo le callback)
        if (window.ToolsRenderer && typeof window.ToolsRenderer === 'function') {
            try {
                const inst = new window.ToolsRenderer(
                    SEL.grid,
                    (tool) => detailsModal?.show(tool),   // click card
                    (tool) => notesModal?.show(tool),     // click notes
                    {activePath: []}
                );
                window.toolsRenderer = inst;
                rendererAdapter = {
                    kind: 'instance-new',
                    render: (tools) => inst.render(tools)
                };
                return rendererAdapter;
            } catch (_) { /* fallback sotto */
            }
        }

        // 2) Istanza già esistente
        if (window.toolsRenderer && typeof window.toolsRenderer.render === 'function') {
            rendererAdapter = {
                kind: 'instance-existing',
                render: (tools) => window.toolsRenderer.render(tools)
            };
            return rendererAdapter;
        }

        // 3) API statica (senza callback) – lasciata come ultima scelta
        if (window.ToolsRenderer && typeof window.ToolsRenderer.render === 'function') {
            rendererAdapter = {
                kind: 'static',
                render: (tools) => window.ToolsRenderer.render(tools, grid)
            };
            return rendererAdapter;
        }

        // 4) Fallback minimale interno
        rendererAdapter = {
            kind: 'fallback',
            render: (tools) => fallbackRender(tools)
        };
        return rendererAdapter;
    }

    function computeVisibleTools() {
        const toolsById = window.Toolmap?.toolsById || {};
        let ids = state.scopeAll
            ? Object.keys(toolsById)
            : (state.scopeIds || []);

        // Ricerca
        const q = (state.search || '').trim().toLowerCase();
        if (q) {
            ids = ids.filter(id => {
                const t = toolsById[id] || {};
                const hay = [
                    t.title || t.name || '',
                    t.desc || t.description || '',
                    t.desc_long || '',
                    t.phase || '',
                    Array.isArray(t.tags) ? t.tags.join(' ') : '',
                    Array.isArray(t.caps) ? t.caps.join(' ') : ''
                ].join(' ').toLowerCase();
                return hay.includes(q);
            });
        }

        return ids.map(id => toolsById[id]).filter(Boolean);
    }

    function render() {
        if (!grid) return;

        const tools = computeVisibleTools();

        if (!tools.length) {
            grid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <h3>No tools found</h3>
          <p>Nessun tool disponibile per questo nodo. Cambia nodo o premi <strong>Reset</strong>.</p>
        </div>`;
            return;
        }

        const r = getRenderer();
        r.render(tools);

        // Post-enhance: applica data-phase / --phase alle card se hanno data-tool-id
        enhanceCardsWithPhase(tools);

        // Aggiorna linee se disponibile
        window.refreshAllVLinesDebounced?.();
    }

    // --------------------------- Card enhancements --------------------------
    function enhanceCardsWithPhase(tools) {
        const byId = {};
        for (const t of tools) byId[t.id] = t;

        const cards = grid.querySelectorAll('[data-tool-id], .tool-card');
        cards.forEach(card => {
            // prova id esplicito
            let id = card.getAttribute?.('data-tool-id');
            // fallback: se ToolsRenderer mette data-id
            if (!id) id = card.getAttribute?.('data-id');

            const t = id ? byId[id] : null;
            if (!t) return;

            const phase = t.phase || (Array.isArray(t.phases) ? t.phases[0] : null);
            if (phase) card.setAttribute('data-phase', phase);
            if (t.phaseColor) card.style.setProperty('--phase', t.phaseColor);

            // Bind azioni se il renderer non le ha fatte:
            // - click sul pulsante note
            const btnNotes = card.querySelector?.('[data-role="notes"], [data-action="notes"], .btn-notes');
            if (btnNotes && notesModal) {
                if (!btnNotes.dataset._boundNotes) {
                    btnNotes.dataset._boundNotes = '1';
                    btnNotes.addEventListener('click', (e) => {
                        e.stopPropagation();
                        notesModal.show(t);
                    });
                }
            }
            // - click card → dettagli
            if (!card.dataset._boundCard) {
                card.dataset._boundCard = '1';
                card.addEventListener('click', (e) => {
                    // evita doppio trigger se hai pulsanti interni
                    if (e.target.closest?.('[data-action="notes"], .btn-notes')) return;
                    detailsModal?.show(t);
                });
            }
        });
    }

    // ----------------------------- Fallback UI ------------------------------
    function fallbackRender(tools) {
        grid.innerHTML = `
      <div class="tools-grid-inner">
        ${tools.map(t => `
          <article class="card tool-card" data-tool-id="${escapeHtml(t.id)}" data-phase="${escapeHtml(t.phase || '')}">
            <header class="card-h">
              <div class="card-icon" style="${t.icon ? `background-image:url('${escapeAttr(t.icon)}')` : ''}"></div>
              <h3 class="card-title">${escapeHtml(t.title || t.name || t.id)}</h3>
            </header>
            <p class="card-desc">${escapeHtml(t.desc || t.description || 'No description')}</p>
            <footer class="card-f">
              ${t.phase ? `<span class="pill" title="Phase">${escapeHtml(formatLabel(t.phase))}</span>` : ''}
              <button class="btn btn-notes" type="button" data-action="notes">Notes</button>
            </footer>
          </article>
        `).join('')}
      </div>
    `;

        // Colora per-fase
        tools.forEach(t => {
            const el = grid.querySelector(`[data-tool-id="${CSS.escape(t.id)}"]`);
            if (el && t.phaseColor) el.style.setProperty('--phase', t.phaseColor);
        });

        // Bind
        enhanceCardsWithPhase(tools);
    }

    // ------------------------------ Notes & Export --------------------------
    function saveNoteAndExport(toolId, note) {
        const tm = window.Toolmap || {};
        const tool = tm.toolsById?.[toolId];
        if (tool) tool.notes = note;

        // Merge delle note nel registry e export YAML
        const reg = tm.registry ? structuredClone(tm.registry) : null;
        if (!reg || !window.jsyaml) return;

        injectNotesIntoRegistry(reg, tm.toolsById || {});
        try {
            const yaml = window.jsyaml.dump(reg, {lineWidth: 120});
            downloadFile('registry_2.yml', yaml, 'text/yaml;charset=utf-8');
        } catch (e) {
            console.error('[tools-manager] Export YAML fallito:', e);
        }
    }

    function injectNotesIntoRegistry(node, toolsById) {
        if (!node) return;
        if (Array.isArray(node.tools)) {
            node.tools.forEach(t => {
                const nid = normalizeId(t.id || t.name || t.title);
                const src = toolsById[nid];
                if (src && Object.prototype.hasOwnProperty.call(src, 'notes')) {
                    t.notes = src.notes || '';
                }
            });
        }
        if (Array.isArray(node.children)) {
            node.children.forEach(child => injectNotesIntoRegistry(child, toolsById));
        }
    }

    function downloadFile(name, content, mime) {
        const blob = new Blob([content], {type: mime});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // ------------------------------- Utilities ------------------------------
    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    }

    function escapeAttr(s) {
        return escapeHtml(s).replace(/"/g, '&quot;');
    }

    function formatLabel(s) {
        return String(s || '').replace(/^\d+[_-]*/, '').replace(/_/g, ' ').trim();
    }

    function normalizeId(s) {
        return String(s || '').trim().toLowerCase()
            .replace(/[^\w\- ]+/g, '')
            .replace(/\s+/g, '-')
            .replace(/\-+/g, '-');
    }

    // ========================================================================
    // Tool Details Modal (classe compatibile con la tua UI)
    // ========================================================================
    class ToolDetailsModal {
        constructor() {
            this.modal = null;
            this._createModal();
        }

        show(tool) {
            if (!this.modal) return;

            const title = this.modal.querySelector('.modal-title');
            const content = this.modal.querySelector('.modal-body');

            const phase = tool.phase || (Array.isArray(tool.phases) ? tool.phases[0] : null);
            const phaseColor = tool.phaseColor || phaseColorFromPhase(phase);

            if (title) {
                const name = tool.name || tool.title || 'Tool Details';
                title.innerHTML = escapeHtml(name) + (tool.version ? ` <span style="font-size:.85em;color:var(--muted)">v${escapeHtml(tool.version)}</span>` : '');
            }

            if (content) {
                const description = tool.desc_long || tool.desc || tool.description || 'No description available';
                const phasesHtml = (tool.phases && tool.phases.length ? tool.phases : (phase ? [phase] : []))
                    .map(ph => `
            <span class="phase-tag"
              style="--phase:${phaseColorFromPhase(ph)};background:color-mix(in srgb, ${phaseColorFromPhase(ph)} 15%, transparent);color:${phaseColorFromPhase(ph)};padding:6px 12px;border-radius:8px;font-size:13px;font-weight:600;display:inline-block;margin:4px;">
              ${escapeHtml(formatLabel(ph))}
            </span>`).join('');

                content.innerHTML = `
          <div class="tool-details">
            ${tool.icon ? `
              <div class="tool-icon" style="background-image:url('${escapeAttr(tool.icon)}');background-size:contain;background-position:center;background-repeat:no-repeat;width:80px;height:80px;margin:0 auto 20px;border-radius:12px;border:1px solid var(--border);background-color:${phaseColor ? `${phaseColor}10` : 'transparent'};"></div>
            ` : ''}

            <div class="detail-section">
              <h3>Description</h3>
              <p>${escapeHtml(description)}</p>
            </div>

            ${(phasesHtml && phasesHtml.trim()) ? `
            <div class="detail-section">
              <h3>Phases</h3>
              <div class="phase-tags">${phasesHtml}</div>
            </div>` : ''}

            ${Array.isArray(tool.caps) && tool.caps.length ? `
              <div class="detail-section">
                <h3>Capabilities</h3>
                <div class="caps-tags">
                  ${tool.caps.map(cap => `<span class="cap-tag" style="background:rgba(255,255,255,.05);border:1px solid var(--border);padding:6px 12px;border-radius:8px;font-size:13px;color:var(--muted);display:inline-block;margin:4px;">${escapeHtml(cap)}</span>`).join('')}
                </div>
              </div>` : ''}

            ${tool.repo ? `
              <div class="detail-section">
                <h3>Repository</h3>
                <a href="${escapeAttr(tool.repo)}" target="_blank" rel="noopener noreferrer" class="repo-link" style="color:var(--accent);text-decoration:none;word-break:break-all;">
                  ${escapeHtml(tool.repo)}
                </a>
              </div>` : ''}

            ${Array.isArray(tool.category_path) && tool.category_path.length ? `
              <div class="detail-section">
                <h3>Category Path</h3>
                <p class="category-path" style="color:var(--muted);font-size:14px;">${tool.category_path.map(p => escapeHtml(formatLabel(p))).join(' / ')}</p>
              </div>` : ''}
          </div>
        `;
            }

            this.modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        hide() {
            if (!this.modal) return;
            this.modal.style.display = 'none';
            document.body.style.overflow = '';
        }

        _createModal() {
            const html = `
        <div class="modal-overlay" id="detailsModal" style="display:none;">
          <div class="modal-content" style="max-width:600px;">
            <div class="modal-header">
              <h2 class="modal-title"></h2>
              <button class="modal-close" title="Close">&times;</button>
            </div>
            <div class="modal-body"></div>
          </div>
        </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            this.modal = document.getElementById('detailsModal');

            const closeBtn = this.modal.querySelector('.modal-close');
            closeBtn?.addEventListener('click', () => this.hide());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.hide();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal.style.display === 'flex') this.hide();
            });
        }
    }

    function phaseColorFromPhase(phase) {
        const map = {
            '00_Common': 'var(--color-common)',
            '01_Information_Gathering': 'var(--color-info)',
            '02_Exploitation': 'var(--color-exploit)',
            '03_Post_Exploitation': 'var(--color-post)',
            '04_Miscellaneous': 'var(--color-misc)'
        };
        return map[phase] || 'var(--accent-2)';
    }

})();
