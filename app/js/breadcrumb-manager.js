// ============================================================================
// BREADCRUMB MANAGER (sostituzione completa - event-driven)
// - Aggiorna la breadcrumb in base a `tm:scope:set` (usa detail.pathKey)
// - Clic (e tastiera) su un segmento → filtra fino a quel nodo (nodo + discendenti)
// - Mostra "All tools" quando non c'è un percorso attivo
// - Nasconde automaticamente "Root" se presente come primo segmento
// - Si resetta su `tm:reset`
// ============================================================================

(() => {
  'use strict';

  const el = document.getElementById('breadcrumb');
  if (!el) return;

  // Trasforma "01_Information_Gathering" → "Information Gathering"
  // e "My_Node_Name" → "My Node Name"
  function formatLabel(text) {
    const s = String(text || '');
    // rimuove prefissi numerici tipo "01_" o "001_"
    const noPrefix = s.replace(/^\d+_/, '');
    // sostituisce underscore con spazio
    return noPrefix.replace(/_/g, ' ');
  }

  // Costruisce i segmenti e collega i click
  function renderCrumb(pathKey) {
    el.innerHTML = '';

    // Se non c'è un path attivo → stato "All tools"
    if (!pathKey || typeof pathKey !== 'string') {
      const span = document.createElement('span');
      span.className = 'breadcrumb-item';
      span.textContent = 'All tools';
      el.appendChild(span);
      return;
    }

    // Scomponi path "Root>Fase>SubNodo"
    let parts = pathKey.split('>').filter(Boolean);

    // Nascondi "Root" se è il primo segmento
    if (parts.length && parts[0].toLowerCase() === 'root') {
      parts = parts.slice(1);
    }

    // Se dopo il filtro non resta nulla → All tools
    if (!parts.length) {
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
          detail: { pathKey: key, ids }
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
    renderCrumb(null);
  });

  // Bootstrap iniziale
  renderCrumb(null);
})();
