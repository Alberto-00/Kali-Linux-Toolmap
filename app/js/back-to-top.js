// ============================================================================
// BACK TO TOP (sostituzione completa)
// - Crea un unico bottone flottante
// - Mostra/nasconde in base allo scroll della .tools-grid (fallback: window)
// - Scorre in top con smooth scroll
// - Colore fase dinamico via evento `tm:phase:color:apply`
// - Pulisce il colore su `tm:reset`
// ============================================================================

(() => {
  'use strict';

  // Evita doppie inizializzazioni se il file viene incluso due volte
  if (window.__BackToTopInit) return;
  window.__BackToTopInit = true;

  const BTN_ID = 'backToTopBtn';
  const THRESHOLD = 200; // px di scroll per rendere visibile il bottone
  let btn = null;
  let scrollContainer = null;
  let onScrollBound = null;

  // Trova il container di scroll: preferisci la grid; altrimenti il documento
  function getScrollContainer() {
    const grid = document.querySelector('.tools-grid');
    if (grid) return grid;
    // Fallback: documento
    return document.scrollingElement || document.documentElement;
  }

  function ensureButton() {
    btn = document.getElementById(BTN_ID);
    if (btn) return btn;

    btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.className = 'back-to-top';
    btn.title = 'Back to top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
      </svg>
    `;
    document.body.appendChild(btn);

    // Click / tastiera
    btn.addEventListener('click', scrollTop, { passive: true });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollTop();
      }
    });
    return btn;
  }

  function getScrollTop() {
    if (!scrollContainer) return 0;
    // Se siamo sul documento usiamo window.scrollY
    if (scrollContainer === document.scrollingElement || scrollContainer === document.documentElement) {
      return window.scrollY || document.documentElement.scrollTop || 0;
    }
    return scrollContainer.scrollTop || 0;
  }

  function updateVisibility() {
    if (!btn) return;
    btn.classList.toggle('visible', getScrollTop() > THRESHOLD);
  }

  function attachScrollListener() {
    detachScrollListener();
    scrollContainer = getScrollContainer();
    // Ascolta lo scroll sul container scelto
    onScrollBound = () => updateVisibility();
    if (scrollContainer === document.scrollingElement || scrollContainer === document.documentElement) {
      window.addEventListener('scroll', onScrollBound, { passive: true });
    } else {
      scrollContainer.addEventListener('scroll', onScrollBound, { passive: true });
    }
    // Aggiorna subito la visibilità alla prima attivazione
    updateVisibility();
  }

  function detachScrollListener() {
    if (!onScrollBound || !scrollContainer) return;
    if (scrollContainer === document.scrollingElement || scrollContainer === document.documentElement) {
      window.removeEventListener('scroll', onScrollBound);
    } else {
      scrollContainer.removeEventListener('scroll', onScrollBound);
    }
    onScrollBound = null;
  }

  function scrollTop() {
    const sc = getScrollContainer();
    // Se è la grid, scrolliamo quella; altrimenti la finestra
    if (sc && sc !== document.scrollingElement && sc !== document.documentElement) {
      sc.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Collega agli eventi app per reagire a cambi di layout/filtri
  function wireAppEvents() {
    // Quando cambia lo scope, la grid potrebbe essere ri-renderizzata: riattacca
    window.addEventListener('tm:scope:set', attachScrollListener);
    // Applica/Rimuove colore fase
    window.addEventListener('tm:phase:color:apply', (ev) => {
      const color = ev.detail?.color || null;
      if (color) {
        btn?.style.setProperty('--phase-color', `color-mix(in srgb, ${color} 100%, transparent)`);
      } else {
        btn?.style.removeProperty('--phase-color');
      }
    });
    window.addEventListener('tm:reset', () => {
      btn?.style.removeProperty('--phase-color');
      // Anche il contenitore potrebbe cambiare dopo reset
      attachScrollListener();
    });
  }

  // Bootstrap
  ensureButton();
  attachScrollListener();
  wireAppEvents();
})();
