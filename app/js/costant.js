// ============================================================================
// constants.js
// ============================================================================
// Descrizione: Costanti condivise (colori fasi, storage keys, selectors)
// Dipendenze: Nessuna

(() => {
    'use strict';

    window.TOOLMAP_CONSTANTS = {
        PHASE_COLORS: {
            '00_Common': 'hsl(270 91% 65%)',
            '01_Information_Gathering': 'hsl(210 100% 62%)',
            '02_Exploitation': 'hsl(4 85% 62%)',
            '03_Post_Exploitation': 'hsl(32 98% 55%)',
            '04_Miscellaneous': 'hsl(158 64% 52%)'
        },

        STORAGE_KEYS: {
            pathKey: 'tm:active:path',
            pathSlash: 'tm:active:slash',
            stars: 'tm:stars',
            registryJSON: 'tm:session:registry-json',
            booted: 'tm:session:booted',
            collapsed: 'tm:sidebar:collapsed'
        },

        SELECTORS: {
            grid: 'toolsGrid',
            sidebar: 'sidebar',
            nav: 'nav',
            resetBtn: 'resetBtn',
            breadcrumb: 'breadcrumb'
        },

        ROOT_NAME: 'Root'
    };
})();