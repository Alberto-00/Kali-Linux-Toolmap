// ============================================================================
// SEARCH MANAGER (sostituzione completa - event-driven, no class)
// - Debounce su input (300ms)
// - Persistenza query in localStorage (chiave: tm:search:q)
// - ESC nel campo: pulisce query e dispatch di filtro vuoto
// - Shortcut globale "/": mette focus sul campo (se non stai già scrivendo in un input/textarea)
// - Emette sempre `tm:search:set` con { q } (stringa, anche vuota)
// - Si azzera su `tm:reset`
// ============================================================================

(() => {
  'use strict';

  // Evita doppie inizializzazioni
  if (window.__SearchManagerInit) return;
  window.__SearchManagerInit = true;

  const INPUT_ID = 'searchInput';
  const LS_KEY   = 'tm:search:q';
  const DEBOUNCE = 300;

  const input = document.getElementById(INPUT_ID);
  if (!input) return;

  // Ripristina valore salvato (se presente)
  const saved = localStorage.getItem(LS_KEY) || '';
  if (saved) input.value = saved;

  // Dispatch helper
  const dispatch = (q) => {
    window.dispatchEvent(new CustomEvent('tm:search:set', { detail: { q } }));
  };

  // Debounce helper
  let t = null;
  const debounced = (fn, ms) => (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };

  // Gestione input (debounced)
  const onInput = debounced(() => {
    const q = (input.value || '');
    localStorage.setItem(LS_KEY, q);
    dispatch(q);
  }, DEBOUNCE);

  input.addEventListener('input', onInput);

  // ESC: pulisce il campo e notifica
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      input.value = '';
      localStorage.removeItem(LS_KEY);
      dispatch('');
    }
  });

  // Shortcut globale "/": focus al campo (se non si sta scrivendo altrove)
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/') return;
    const ae = document.activeElement;
    const isTyping =
      ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
    if (isTyping) return;
    e.preventDefault();
    input.focus();
  });

  // Reset globale: azzera input + storage + filtro
  window.addEventListener('tm:reset', () => {
    input.value = '';
    localStorage.removeItem(LS_KEY);
    dispatch('');
  });

  // Allineamento iniziale: se avevamo una query salvata, notifichiamo il manager
  if (saved) dispatch(saved);
})();
