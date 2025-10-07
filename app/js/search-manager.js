// ============================================================================
// SEARCH MANAGER
// ============================================================================

(() => {
    'use strict';

    if (window.__SearchManagerInit) return;
    window.__SearchManagerInit = true;

    const INPUT_ID = 'searchInput';
    const LS_KEY = 'tm:search:q';
    const DEBOUNCE = 300;

    const input = document.getElementById(INPUT_ID);
    if (!input) return;

    // Ripristina valore salvato
    const saved = localStorage.getItem(LS_KEY) || '';
    if (saved) input.value = saved;

    // Dispatch helper
    const dispatch = (q) => {
        const qq = (q || '').trim();
        window.dispatchEvent(new CustomEvent('tm:search:set', {
            detail: {q: qq, hasQuery: !!qq, source: 'search-input'}
        }));
    };


    // Debounce helper
    let t = null;
    const debounced = (fn, ms) => (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };

    // Input handler (debounced)
    const onInput = debounced(() => {
        const q = input.value.trim();
        localStorage.setItem(LS_KEY, q);
        dispatch(q);
    }, DEBOUNCE);

    input.addEventListener('input', onInput);

    // ESC: pulisce tutto
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            input.value = '';
            localStorage.removeItem(LS_KEY);
            dispatch('');
        }
    });

    // Shortcut globale "/"
    document.addEventListener('keydown', (e) => {
        if (e.key !== '/') return;
        const ae = document.activeElement;
        const isTyping = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
        if (isTyping) return;
        e.preventDefault();
        input.focus();
    });

    // Reset globale
    window.addEventListener('tm:reset', () => {
        const had = !!(input.value && input.value.trim());
        input.value = '';
        localStorage.removeItem(LS_KEY);
        if (had) dispatch('');   // emetti solo se stavi cercando
    });

    // Init
    if (saved) dispatch(saved);
})();