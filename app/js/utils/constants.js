/**
 * Costanti globali dell'applicazione Toolmap
 * Colori fasi, chiavi storage, selettori DOM
 */

(function() {
    'use strict';

    window.TOOLMAP_CONSTANTS = Object.freeze({

        // Colori delle fasi (HSL)
        PHASE_COLORS: Object.freeze({
            '00_Common': 'hsl(270 91% 65%)',
            '01_Information_Gathering': 'hsl(210 100% 62%)',
            '02_Exploitation': 'hsl(4 85% 62%)',
            '03_Post_Exploitation': 'hsl(32 98% 55%)',
            '04_Red_Team': 'hsl(4 85% 62%)',
            '05_Forensics': 'hsl(220 85% 55%)',
            '06_Miscellaneous': 'hsl(158 64% 52%)'
        }),

        // Chiavi per localStorage/sessionStorage
        STORAGE_KEYS: Object.freeze({
            pathKey: 'tm:active:path',
            pathSlash: 'tm:active:slash',
            stars: 'tm:stars',
            installed: 'tm:installed',
            installedOnly: 'tm:installed:only',
            registryJSON: 'tm:session:registry-json',
            booted: 'tm:session:booted',
            collapsed: 'tm:sidebar:collapsed'
        }),

        // Selettori DOM (ID senza #)
        SELECTORS: Object.freeze({
            grid: 'toolsGrid',
            sidebar: 'sidebar',
            nav: 'nav',
            resetBtn: 'resetBtn',
            breadcrumb: 'breadcrumb'
        }),

        // Nome nodo radice
        ROOT_NAME: 'Root'
    });

})();