// ============================================================================
// tools-manager.js
// ============================================================================

/**
 * @typedef {Object} ToolItem
 * @property {string} id
 * @property {string=} name
 * @property {string=} title
 * @property {string=} phase
 * @property {string[]=} phases
 * @property {string[]=} category_path
 * @property {string[]=} categoryPath
 * @property {string=} repo
 * @property {string=} desc
 * @property {string=} desc_long
 * @property {string[]=} caps
 * @property {string[]=} tags
 * @property {string=} icon
 * @property {string=} notes
 * @property {string=} phaseColor
 * @property {string[]=} path
 */

(() => {
    'use strict';

    const SEL = {
        grid: 'toolsGrid', resetBtn: 'resetBtn', searchInput: 'searchInput'
    };

    const MEM = {
        search: 'tm:search:q', pathKey: 'tm:active:path',    // per coerenza con sidebar.js
        pathSlash: 'tm:active:slash'  // per coerenza con sidebar.js
    };

    const state = {
        scopeAll: false,      // true = mostra tutti i tool
        scopeIds: null,       // array di id (nodo + discendenti)
        pathKey: null,        // "Root>Fase>…>Nodo"
        search: '',           // query testuale
        isResetting: false    // flag per gestire il reset
    };

    let grid, resetBtn, notesModal, detailsModal, rendererAdapter;
    let hasVisitedAnyPhase = false;

    /** @param {Partial<ToolItem>=} t */
    function getCatPath(t) {
        if (!t) return [];
        return Array.isArray(t.category_path) ? t.category_path
            : Array.isArray(t.categoryPath) ? t.categoryPath
                : [];
    }

    // ---------------------------- Bootstrap DOM ----------------------------
    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn, {once: true});
        } else {
            (window.queueMicrotask ? queueMicrotask : setTimeout)(fn, 0);
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

        if (savedQ) {
            window.dispatchEvent(new CustomEvent('tm:search:set', {detail: {q: savedQ, hasQuery: true}}));
        }

        // Ripristina path salvato (se esiste)
        const savedPathKey = localStorage.getItem(MEM.pathKey);
        if (savedPathKey && !savedQ) { // solo se non c'è una ricerca attiva
            state.pathKey = savedPathKey;
            state.scopeAll = false;
            // Risolvi gli IDs dal pathKey
            const tm = window.Toolmap || {};
            if (tm.allToolsUnder && tm.allToolsUnder[savedPathKey]) {
                state.scopeIds = Array.from(tm.allToolsUnder[savedPathKey]);
            }
        }

        // Wiring eventi app
        if (__wired) return;
        wireEvents();

        // Primo render
        render();
    });

    // ----------------------------- Event wiring ----------------------------
    let __wired = false;

    function wireEvents() {
        if (__wired) return;
        __wired = true;

        // Filtro di scope da sidebar/breadcrumb mini
        window.addEventListener('tm:scope:set', (ev) => {
            // Se stiamo resettando, ignora eventi di scope che non sono "all"
            if (state.isResetting && !ev.detail?.all) {
                return;
            }

            const {all, ids, pathKey} = ev.detail || {};
            state.scopeAll = !!all || (!ids && !pathKey);
            state.scopeIds = ids || null;
            state.pathKey = pathKey || null;

            // Mark session as 'visited' if a phase path is selected
            if (state.pathKey && typeof state.pathKey === 'string') {
                const parts = state.pathKey.split('>').filter(Boolean);
                const first = (parts[0] && parts[0].toLowerCase() === 'root') ? parts[1] : parts[0];
                if (first) hasVisitedAnyPhase = true;
            }
            render();
        });

        // Ricerca testuale (gestita da search-manager.js)
        // Ricerca testuale (gestita da search-manager.js)
        window.addEventListener('tm:search:set', (ev) => {
            const newSearch = (ev.detail?.q || '').trim();
            const hadSearch = !!state.search;
            const hasSearch = !!newSearch;

            state.search = newSearch;

            if (hasSearch) {
                localStorage.setItem(MEM.search, state.search);
            } else {
                localStorage.removeItem(MEM.search);
            }

            const ctx = buildSearchContext();
            window.__lastSearchContext = ctx;
            window.dispatchEvent(new CustomEvent('tm:search:context', {detail: ctx}));

            // Se passi da "ricerca attiva" a "nessuna ricerca" E non sei in reset
            // ripristina l'ultimo scope/path salvato (se esiste)
            if (hadSearch && !hasSearch && !state.isResetting) {
                const savedPathKey = localStorage.getItem(MEM.pathKey);
                const savedPathSlash = localStorage.getItem(MEM.pathSlash);

                if (savedPathSlash) {
                    const tm = window.Toolmap || {};
                    const pathKey = savedPathKey || `Root>${savedPathSlash.replace(/\//g, '>')}`;
                    const ids = tm.allToolsUnder?.[pathKey] ? Array.from(tm.allToolsUnder[pathKey]) : [];

                    state.pathKey = pathKey;
                    state.scopeAll = false;
                    state.scopeIds = ids;

                    // Notifica il ripristino dello scope
                    window.dispatchEvent(new CustomEvent('tm:scope:set', {
                        detail: {pathKey, ids, source: 'search-cleared'}
                    }));
                }
            }

            render();
        });

        // Colore di fase
        window.addEventListener('tm:phase:color', (ev) => {
            const content = document.querySelector('.content');
            const color = ev.detail?.color || null;
            if (content) {
                if (color) content.style.setProperty('--hover-color', `color-mix(in srgb, ${color} 100%, transparent)`); else content.style.removeProperty('--hover-color');
            }
            window.dispatchEvent(new CustomEvent('tm:phase:color:apply', {detail: {color}}));
        });

        // Reset globale - CORRETTO
        resetBtn?.addEventListener('click', () => {
            // Imposta flag di reset
            state.isResetting = true;

            // 1) Pulisci TUTTO da localStorage (inclusi i path della sidebar!)
            localStorage.removeItem(MEM.search);
            localStorage.removeItem(MEM.pathKey);
            localStorage.removeItem(MEM.pathSlash);

            // 2) Reset UI della search
            const input = document.getElementById(SEL.searchInput);
            if (input) input.value = '';

            // 3) Reset contesto di ricerca
            const emptyCtx = {hasQuery: false, phaseKeys: [], paths: [], countsByPhase: {}};
            window.__lastSearchContext = emptyCtx;
            window.dispatchEvent(new CustomEvent('tm:search:context', {detail: emptyCtx}));

            // 4) Reset stato locale
            state.scopeAll = true;
            state.scopeIds = null;
            state.pathKey = null;
            state.search = '';
            hasVisitedAnyPhase = false;

            // 5) Notifica reset globale (sidebar, hover, etc.)
            window.dispatchEvent(new Event('tm:reset'));

            // 6) Imposta scope su "all tools"
            window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {all: true}}));

            // 7) Rimuovi colore di fase
            window.dispatchEvent(new CustomEvent('tm:phase:color', {detail: {color: null}}));

            // 8) Render finale
            render();

            // 9) Rimuovi flag di reset dopo un tick per evitare race conditions
            setTimeout(() => {
                state.isResetting = false;
            }, 100);
        });

        // Listener per reset events da altre parti
        window.addEventListener('tm:reset', () => {
            if (state.isResetting) return; // Evita loop se siamo già in reset

            const content = document.querySelector('.content');
            content?.style.removeProperty('--hover-color');

            // Reset stato solo se non siamo già in reset
            if (!state.isResetting) {
                state.scopeAll = true;
                state.scopeIds = null;
                state.pathKey = null;
                hasVisitedAnyPhase = false;
            }
        });

        // Quando il registry è pronto
        window.addEventListener('tm:registry:ready', () => {
            // Se c'era un path salvato e il registry ora è pronto, ripristinalo
            const savedPathKey = localStorage.getItem(MEM.pathKey);
            if (savedPathKey && !state.search && !state.isResetting) {
                const tm = window.Toolmap || {};
                if (tm.allToolsUnder && tm.allToolsUnder[savedPathKey]) {
                    state.pathKey = savedPathKey;
                    state.scopeAll = false;
                    state.scopeIds = Array.from(tm.allToolsUnder[savedPathKey]);
                    render();
                }
            }
        });

        // Eventi per modali
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

        if (window.ToolsRenderer && typeof window.ToolsRenderer === 'function') {
            try {
                const inst = new window.ToolsRenderer(SEL.grid, (tool) => detailsModal?.show(tool), (tool) => notesModal?.show(tool), {activePath: []});
                window.toolsRenderer = inst;
                rendererAdapter = {
                    kind: 'instance-new', render: (tools) => inst.render(tools)
                };
                return rendererAdapter;
            } catch (_) { /* fallback */
            }
        }

        if (window.toolsRenderer && typeof window.toolsRenderer.render === 'function') {
            rendererAdapter = {
                kind: 'instance-existing', render: (tools) => window.toolsRenderer.render(tools)
            };
            return rendererAdapter;
        }

        if (window.ToolsRenderer && typeof window.ToolsRenderer.render === 'function') {
            rendererAdapter = {
                kind: 'static', render: (tools) => window.ToolsRenderer.render(tools, grid)
            };
            return rendererAdapter;
        }

        rendererAdapter = {
            kind: 'fallback', render: (tools) => fallbackRender(tools)
        };
        return rendererAdapter;
    }

    function computeVisibleTools() {
        const tm = window.Toolmap || {};
        const toolsById = tm.toolsById || {};
        const allIds = Object.keys(toolsById);

        const qRaw = (state.search || '');
        const q = norm(qRaw);
        const tokens = tokenize(q);

        // Base set - CORRETTO: la ricerca è SEMPRE globale
        let baseIds;
        if (tokens.length) {
            // Ricerca attiva: cerca in TUTTI i tool (globale)
            baseIds = allIds;
        } else {
            // Nessuna ricerca: usa lo scope corrente
            baseIds = state.scopeAll ? allIds : (state.scopeIds || []);
        }

        if (!tokens.length) {
            return baseIds.map(id => toolsById[id]).filter(Boolean);
        }

        // Search with ranking
        const W = {
            name: 6, caps: 4, tags: 3, desc: 2, desc_long: 2, phase: 5, node: 5
        };

        const hits = [];

        for (const id of baseIds) {
            const t = toolsById[id];
            if (!t) continue;

            const name = norm(t.title || t.name || t.id || '');
            const nameNS = stripSep(name);
            const desc = norm((t.desc || t.description || '') + ' ' + (t.desc_long || ''));
            const descNS = stripSep(desc);
            const caps = norm(Array.isArray(t.caps) ? t.caps.join(' ') : '');
            const capsNS = stripSep(caps);
            const tags = norm(Array.isArray(t.tags) ? t.tags.join(' ') : '');
            const tagsNS = stripSep(tags);
            const phaseRaw = t.phase || (Array.isArray(t.phases) ? t.phases[0] : '');
            const phase = normLabel(phaseRaw);
            const phaseNS = stripSep(phase);
            const nodesArr = getCatPath(t);
            const nodesHuman = nodesArr.map(normLabel);
            const nodesJoined = nodesHuman.join(' ');
            const nodesNS = stripSep(nodesJoined);

            let score = 0;
            let matched = false;

            for (const tok of tokens) {
                const tokNS = stripSep(tok);
                let bestTokField = 0;

                if (name.includes(tok) || nameNS.includes(tokNS)) {
                    matched = true;
                    bestTokField = Math.max(bestTokField, W.name);
                    if (name.startsWith(tok) || nameNS.startsWith(tokNS)) score += 1;
                }
                if (desc.includes(tok) || descNS.includes(tokNS)) {
                    matched = true;
                    bestTokField = Math.max(bestTokField, W.desc);
                }
                if (caps.includes(tok) || capsNS.includes(tokNS)) {
                    matched = true;
                    bestTokField = Math.max(bestTokField, W.caps);
                }
                if (tags.includes(tok) || tagsNS.includes(tokNS)) {
                    matched = true;
                    bestTokField = Math.max(bestTokField, W.tags);
                }
                if (phase && (phase.includes(tok) || tok === phase || phaseNS.includes(tokNS))) {
                    matched = true;
                    bestTokField = Math.max(bestTokField, W.phase);
                }
                if (nodesJoined.includes(tok) || nodesNS.includes(tokNS) || nodesHuman.some(n => n === tok)) {
                    matched = true;
                    bestTokField = Math.max(bestTokField, W.node);
                    if (nodesHuman.some(n => n.startsWith(tok)) || nodesNS.startsWith(tokNS)) score += 1;
                }

                score += bestTokField;
            }

            if (matched) {
                hits.push({id, t, score});
            }
        }

        hits.sort((a, b) => b.score - a.score || (a.t.title || a.t.name || '').localeCompare(b.t.title || b.t.name || ''));
        return hits.map(h => h.t);
    }

    // Search helpers
    function norm(s) {
        return String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .trim();
    }

    function stripSep(s) {
        return String(s || '').replace(/[\s_\-\/\\>.:]+/g, '');
    }

    function normLabel(s) {
        return norm(String(s || '').replace(/^\d+[_-]*/, '').replace(/_/g, ' '));
    }

    function tokenize(q) {
        q = String(q || '').trim();
        if (!q) return [];
        const out = [];
        const re = /"([^"]+)"|'([^']+)'|([A-Za-z0-9_.\-\/\\> ]+)/g;
        let m;
        while ((m = re.exec(q)) !== null) {
            const chunk = m[1] || m[2] || m[3] || '';
            const parts = chunk.split(/[^A-Za-z0-9]+/).filter(Boolean);
            for (const p of parts) {
                const t = norm(p);
                if (t) out.push(t);
            }
        }
        return out;
    }

    function buildSearchContext() {
        const tm = window.Toolmap || {};
        const toolsById = tm.toolsById || {};

        // La ricerca è SEMPRE globale per il contesto (sidebar needs all matches)
        const searchIds = Object.keys(toolsById);

        const q = norm(state.search);
        const tokens = tokenize(q);
        if (!tokens.length) return {hasQuery: false};

        const phaseSet = new Set();
        const paths = [];
        const countsByPhase = {};

        for (const id of searchIds) {
            const t = toolsById[id];
            if (!t) continue;

            const name = norm(t.title || t.name || t.id || '');
            const nameNS = stripSep(name);
            const desc = norm((t.desc || t.description || '') + ' ' + (t.desc_long || ''));
            const descNS = stripSep(desc);
            const caps = norm(Array.isArray(t.caps) ? t.caps.join(' ') : '');
            const capsNS = stripSep(caps);
            const tags = norm(Array.isArray(t.tags) ? t.tags.join(' ') : '');
            const tagsNS = stripSep(tags);
            const phaseRaw = t.phase || (Array.isArray(t.phases) ? t.phases[0] : '');
            const phase = normLabel(phaseRaw);
            const phaseNS = stripSep(phase);
            const nodesArr = getCatPath(t);
            const nodesHuman = nodesArr.map(normLabel);
            const nodesJoined = nodesHuman.join(' ');
            const nodesNS = stripSep(nodesJoined);

            let ok = false;
            for (const tok of tokens) {
                const tokNS = stripSep(tok);
                if (name.includes(tok) || nameNS.includes(tokNS) || desc.includes(tok) || descNS.includes(tokNS) || caps.includes(tok) || capsNS.includes(tokNS) || tags.includes(tok) || tagsNS.includes(tokNS) || (phase && (phase.includes(tok) || tok === phase || phaseNS.includes(tokNS))) || nodesJoined.includes(tok) || nodesNS.includes(tokNS) || nodesHuman.some(n => n === tok)) {
                    ok = true;
                    break;
                }
            }
            if (!ok) continue;

            const phaseKey = nodesArr.length ? nodesArr[0] : (t.phase || null);
            if (phaseKey) {
                phaseSet.add(phaseKey);
                countsByPhase[phaseKey] = (countsByPhase[phaseKey] || 0) + 1;
            }
            if (nodesArr.length) {
   paths.push(nodesArr);
 }
        }

        return {
            hasQuery: true, phaseKeys: Array.from(phaseSet), paths, countsByPhase
        };
    }

    function render() {
        if (!grid) return;

        const tools = computeVisibleTools();

        // Notify breadcrumb
        try {
            const summary = {
                toolsCount: tools.length,
                scopeAll: !!state.scopeAll,
                pathKey: state.pathKey || null,
                hasVisitedAnyPhase: !!hasVisitedAnyPhase
            };
            window.dispatchEvent(new CustomEvent('tm:context:summary', {detail: summary}));
        } catch (__) {
        }

        if (!tools.length) {
            grid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <h3>No tools found</h3>
          <p>${state.search ? 'No matches for your search.' : 'No tools available for this category.'} Try changing your selection or press <strong>Reset</strong>.</p>
        </div>`;
            return;
        }

        const r = getRenderer();
        r.render(tools);

        enhanceCardsWithPhase(tools);
        window.refreshAllVLinesDebounced?.();
    }

    // Card enhancements
    function enhanceCardsWithPhase(tools) {
        const byId = {};
        for (const t of tools) byId[t.id] = t;

        const cards = grid.querySelectorAll('[data-tool-id], .tool-card');
        cards.forEach(card => {
            let id = card.getAttribute?.('data-tool-id');
            if (!id) id = card.getAttribute?.('data-id');

            const t = id ? byId[id] : null;
            if (!t) return;

            const phase = t.phase || (Array.isArray(t.phases) ? t.phases[0] : null);
            if (phase) card.setAttribute('data-phase', phase);
            if (t.phaseColor) card.style.setProperty('--phase', t.phaseColor);

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

            if (!card.dataset._boundCard) {
                card.dataset._boundCard = '1';
                card.addEventListener('click', (e) => {
                    if (e.target.closest?.('[data-action="notes"], .btn-notes')) return;
                    detailsModal?.show(t);
                });
            }
        });
    }

    // Fallback renderer
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

        tools.forEach(t => {
            const el = grid.querySelector(`[data-tool-id="${CSS.escape(t.id)}"]`);
            if (el && t.phaseColor) el.style.setProperty('--phase', t.phaseColor);
        });

        enhanceCardsWithPhase(tools);
    }

    // Notes & Export
    function saveNoteAndExport(toolId, note) {
        const tm = window.Toolmap || {};
        const tool = tm.toolsById?.[toolId];
        if (tool) tool.notes = note;

        const reg = tm.registry ? structuredClone(tm.registry) : null;
        if (!reg || !window.jsyaml) return;

        injectNotesIntoRegistry(reg, tm.toolsById || {});
        try {
            const yaml = window.jsyaml.dump(reg, {lineWidth: 120});
            downloadFile('registry_2.yml', yaml, 'text/yaml;charset=utf-8');
        } catch (e) {
            console.error('[tools-manager] Export YAML failed:', e);
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

    // Utilities
    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
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

    // Tool Details Modal
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

            const modalContent = this.modal.querySelector('.modal-content');
            if (modalContent && phaseColor) modalContent.style.setProperty('--phase', phaseColor);

            if (title) {
                const name = tool.name || tool.title || 'Tool Details';
                title.innerHTML = escapeHtml(name) + (tool.version ? ` <span style="background: rgba(255, 255, 255, .1);" class="version-chip">v${escapeHtml(tool.version)}</span>` : '');
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

            ${getCatPath(tool).length ? `
              <div class="detail-section">
                <h3>Category Path</h3>
                <div class="category-path-row">
                    <button class="icon-btn copy-catpath" title="Copy category path" aria-label="Copy category path">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                      <span class="sr-only">Copy category path</span>
                    </button>
                    <p class="category-path" style="color:var(--muted);font-size:14px;">${getCatPath(tool).map(p => escapeHtml(formatLabel(p))).join(' / ')}</p>
                </div>
              </div>` : ''}
          </div>
        `;

                const cp = this.modal.querySelector('.category-path');
                if (cp) {
                    try {
                        const raw = getCatPath(tool);
                        cp.dataset.raw = raw.join('/');
                        const humanizeSeg = (seg) => String(seg || '')
                            .replace(/^\d{2}_/, '')
                            .replace(/_/g, ' ');
                        const human = raw.map(humanizeSeg);
                        cp.textContent = human.join(' / ');
                    } catch (e) { /* noop */
                    }
                }

                const btnCopyCP = this.modal.querySelector('.copy-catpath');
                if (cp && btnCopyCP) {
                    btnCopyCP.addEventListener('click', () => {
                        const text = (cp.dataset && cp.dataset.raw) ? cp.dataset.raw : (cp.textContent || '').trim();
                        if (!text) return;
                        navigator.clipboard.writeText(text).then(() => {
                            const svg = btnCopyCP.querySelector('svg');
                            if (svg) {
                                const orig = svg.outerHTML;
                                svg.outerHTML = '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
                                setTimeout(() => {
                                    const s = btnCopyCP.querySelector('svg');
                                    if (s) s.outerHTML = orig;
                                }, 1200);
                            }
                        });
                    });
                }
            }
            this.modal.style.display = 'flex';
            this.modal.classList.remove('closing');
            void this.modal.offsetWidth;
            this.modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        hide() {
            if (!this.modal) return;
            this.modal.classList.remove('open');
            this.modal.classList.add('closing');

            const onEnd = (e) => {
                if (e && e.target && !e.target.classList.contains('modal-overlay')) return;
                this.modal.removeEventListener('transitionend', onEnd);
                this.modal.style.display = 'none';
                this.modal.classList.remove('closing');
                document.body.style.overflow = '';
            };
            this.modal.addEventListener('transitionend', onEnd);
            setTimeout(onEnd, 260);
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