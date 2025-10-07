// ============================================================================
// BREADCRUMB MANAGER
// ============================================================================

(() => {
    'use strict';

    const el = document.getElementById('breadcrumb');
    if (!el) return;

    let currentPathSlash = null; // path in formato slash per copia
    let _lastContextSummary = {toolsCount: 0, scopeAll: false, pathKey: null, hasVisitedAnyPhase: false};

    // Trasforma "01_Information_Gathering" → "Information Gathering"
    // e "My_Node_Name" → "My Node Name"
    function formatLabel(text) {
        const s = String(text || '');
        // rimuove prefissi numerici tipo "01_" o "001_"
        const noPrefix = s.replace(/^\d+_/, '');
        // sostituisce underscore con spazio
        return noPrefix.replace(/_/g, ' ');
    }

    function copyCurrentPath() {
        if (!currentPathSlash) return;
        navigator.clipboard.writeText(currentPathSlash).then(() => {
            const icon = document.querySelector('.copy-path-icon');
            const btn = document.querySelector('.copy-path-btn');

            // icona → check → icona originale (totale 1200ms)
            if (icon) {
                icon.innerHTML = `
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>`;
                setTimeout(() => {
                    icon.innerHTML = `
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>`;
                }, 1200);
            }

            // Toast "Copiato!" con durata totale 1200ms (show .2s, visible .8s, hide .2s)
            if (btn) {
                const r = btn.getBoundingClientRect();
                const t = document.createElement('div');
                t.className = 'copy-toast';
                t.textContent = 'Copiato!';
                t.style.left = (r.left + r.width / 2) + 'px';
                t.style.top = (r.top - 8) + 'px';
                document.body.appendChild(t);
                requestAnimationFrame(() => t.classList.add('show'));
                setTimeout(() => {
                    t.classList.add('hide');
                    const onEnd = () => {
                        if (t.classList.contains('hide')) t.remove();
                    };
                    t.addEventListener('animationend', onEnd, {once: true});
                }, 1000);
            }
        }).catch(() => {
        });
    }

    // Costruisce i segmenti e collega i click
    function renderCrumb(pathKey) {
        el.innerHTML = '';

        // Se non c'è un path attivo → stato "All tools"
        if (!pathKey || typeof pathKey !== 'string') {
            currentPathSlash = null;
            const span = document.createElement('span');
            span.className = 'breadcrumb-item';
            // Regola: 'No tools' SOLO quando non è mai stata visitata alcuna fase,
            // non c'è un path attivo, NON stiamo mostrando 'All' e non ci sono tool visibili.
            const showNoTools = (!_lastContextSummary?.hasVisitedAnyPhase) && (!_lastContextSummary?.pathKey) && (!_lastContextSummary?.scopeAll) && ((_lastContextSummary?.toolsCount || 0) === 0);
            span.textContent = showNoTools ? 'No tools' : 'All tools';
            el.appendChild(span);
            return;
        }

        // Salva il path in formato slash per la copia
        currentPathSlash = pathKey.replace(/>/g, '/').replace(/^Root\//, '');

        // Scomponi path "Root>Fase>SubNodo"
        let parts = pathKey.split('>').filter(Boolean);

        // Nascondi "Root" se è il primo segmento
        if (parts.length && parts[0].toLowerCase() === 'root') {
            parts = parts.slice(1);
        }

        // Se dopo il filtro non resta nulla → All tools
        if (!parts.length) {
            currentPathSlash = null;
            const span = document.createElement('span');
            span.className = 'breadcrumb-item';
            span.textContent = 'All tools';
            el.appendChild(span);
            return;
        }

        parts.forEach((p, i) => {
            const isLast = i === parts.length - 1;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'breadcrumb-item' + (isLast ? ' active' : '');
            btn.textContent = formatLabel(p);
            btn.setAttribute('aria-current', isLast ? 'page' : 'false');

            btn.addEventListener('click', () => {
                // Ricostruisci la chiave fino a questo segmento
                const fullParts = rebuildFullParts(parts, i + 1);
                const key = fullParts.join('>');
                const ids = Array.from(window.Toolmap?.allToolsUnder?.[key] || []);

                window.dispatchEvent(new CustomEvent('tm:scope:set', {
                    detail: {pathKey: key, ids}
                }));
            });

            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });

            el.appendChild(btn);

            if (!isLast) {
                const sep = document.createElement('span');
                sep.className = 'breadcrumb-separator';
                sep.textContent = '/';
                sep.setAttribute('aria-hidden', 'true');
                el.appendChild(sep);
            }
        });
    }

    // Ricostruisce i segmenti completi includendo "Root" se presente nel path corrente
    // Usa l'ultimo pathKey noto da tm:scope:set per preservare l'eventuale prefisso "Root"
    function rebuildFullParts(visibleParts, takeCount) {
        const lastKey = _lastPathKey;
        let base = [];
        if (lastKey && typeof lastKey === 'string') {
            const raw = lastKey.split('>').filter(Boolean);
            // se il primo è Root, preservalo
            if (raw.length && raw[0].toLowerCase() === 'root') {
                base = ['Root'];
            }
        }
        return base.concat(visibleParts.slice(0, takeCount));
    }

    // Crea i bottoni "Show All" e "Copy Path" nella breadcrumb-bar
    function ensureBreadcrumbButtons() {
        const bar = document.querySelector('.breadcrumb-bar');
        if (!bar) return;

        // Controlla se già esistono
        if (bar.querySelector('.breadcrumb-actions')) return;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'breadcrumb-actions';
        actionsDiv.innerHTML = `
      <button class="show-all-btn icon-btn" type="button" title="Show all tools" aria-label="Show all tools">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        <b>Show All</b>
      </button>
      <button class="copy-path-btn icon-btn copy-path-icon" type="button" title="Copy current path" aria-label="Copy current path">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      </button>
    `;

        bar.appendChild(actionsDiv);

        // Bind eventi
        const showAllBtn = actionsDiv.querySelector('.show-all-btn');
        const copyBtn = actionsDiv.querySelector('.copy-path-btn');

        showAllBtn?.addEventListener('click', () => {
            // Mostra "All tools" nella breadcrumb…
            currentPathSlash = null;
            renderCrumb(null);
            // …ma NON toccare la sidebar: chiedi solo al manager di mostrare tutto
            window.dispatchEvent(new CustomEvent('tm:tools:showAll'));
        });

        copyBtn?.addEventListener('click', () => {
            if (!currentPathSlash) return;
            copyCurrentPath();
        });
    }

    // Stato interno: conserva l'ultimo pathKey per ricostruire "Root"
    let _lastPathKey = null;

    // Aggiorna breadcrumb quando cambia lo scope
    window.addEventListener('tm:scope:set', (ev) => {
        const key = ev.detail?.pathKey || null;
        _lastPathKey = key;
        renderCrumb(key);
    });

    // Reset globale → torna ad "All tools"
    window.addEventListener('tm:reset', () => {
        _lastPathKey = null;
        currentPathSlash = null;
        renderCrumb(null);
    });

    // Ricevi riepilogo dal tools-manager (per regola 'No tools')
    window.addEventListener('tm:context:summary', (ev) => {
        _lastContextSummary = Object.assign(_lastContextSummary, ev.detail || {});
        // Se siamo in stato 'no path', aggiorna la label con la regola
        if (!_lastContextSummary.pathKey) renderCrumb(null);
    });

    // Bootstrap iniziale
    ensureBreadcrumbButtons();
    renderCrumb(null);
})();