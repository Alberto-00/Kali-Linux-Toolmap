const TIMINGS = {
    hoverDelay: 280,
    transitionEnd: 260,
    paneActivation: 40,
    searchApply: 50,
    autoGrowInitial: 0,
    autoGrowShort: 100,
    autoGrowMedium: 220,
    autoGrowLong: 300,
    autoGrowVeryLong: 600,
    animationTracking: 500,
    hoverSetup: 150
};

// Selectors e classi comuni (evita ripetizioni)
const SELECTORS = {
    pathNodes: '.folder-leaf, .leaf, .section-title',
    containers: '.children, .children-nested',
    activeNodes: '.folder-leaf.active, .leaf.active, .section-title.active',
    searchHit: '.folder-leaf.search-hit, .leaf.search-hit',
    searchIntermediate: '.folder-leaf.search-path-intermediate, .leaf.search-path-intermediate'
};

const CLASSES = {
    active: 'active',
    inActivePath: 'in-active-path',
    hasActivePath: 'has-active-path',
    searchMode: 'search-mode',
    searchHit: 'search-hit',
    searchIntermediate: 'search-path-intermediate',
    open: 'open',
    collapsed: 'collapsed'
};

// Helper per operazioni comuni
const QueryHelpers = {
    clearActive: (container) => {
        container.querySelectorAll(SELECTORS.activeNodes)
            .forEach(n => n.classList.remove(CLASSES.active));
    },

    clearSearchMarks: (container) => {
        container.querySelectorAll(SELECTORS.searchHit)
            .forEach(el => el.classList.remove(CLASSES.searchHit));
        container.querySelectorAll(SELECTORS.searchIntermediate)
            .forEach(el => el.classList.remove(CLASSES.searchIntermediate));
    }
};

// OTTIMIZZAZIONE: Debounced wrapper per AutoGrow per evitare chiamate duplicate
let autoGrowTimer = null;
const scheduleAutoGrow = () => {
    if (autoGrowTimer) clearTimeout(autoGrowTimer);
    autoGrowTimer = setTimeout(() => {
        window.SidebarAutoGrow?.schedule();
        autoGrowTimer = null;
    }, 50); // Debounce di 50ms
};

(() => {
    "use strict";

    // TAXONOMY & ICONS
    const taxonomy = {
        "00_Common": {
            "Metasploit_Plugins": {},
            "Network": {},
            "Scripts": {},
            "Tools_Windows": {},
            "Wordlists": {}
        },
        "01_Information_Gathering": {
            "OSINT": {
                "People_Search": {},
                "Social_Media": {},
                "Email_Harvesting": {},
                "Domain_Intelligence": {}
            },
            "Recon": {
                "Infrastructure": {
                    "DNS_Subdomains": {},
                    "Port_Scanning": {},
                    "Service_Fingerprinting": {}
                },
                "Web": {
                    "Content_Discovery": {},
                    "Fingerprinting": {
                        "HTTP_Analysis": {},
                        "Visual_Recon": {},
                        "WAF": {}
                    },
                    "Params_Discovery": {}
                }
            },
            "Enumeration": {
                "Infrastructure": {
                    "SMTP": {},
                    "VoIP": {},
                    "Porta_113": {},
                    "SMB": {},
                    "SNMP": {},
                    "LDAP_AD": {},
                    "Database": {}
                },
                "Web": {
                    "API": {},
                    "CMS": {
                        "General": {},
                        "Joomla": {}
                    },
                    "Crawling": {
                        "Active": {}
                    }
                }
            },
            "Vulnerability_Scanning": {},
            "Network_Sniffing": {},
            "Social_Engineering": {}
        },
        "02_Exploitation": {
            "General": {},
            "Crypto": {},
            "Infrastructure": {
                "RTSP": {},
                "Database": {},
                "Network": {},
                "SSL_TLS": {}
            },
            "Web": {
                "CMS_Exploits": {
                    "Drupal": {},
                    "Joomla": {},
                    "WordPress": {}
                },
                "File_Upload": {},
                "Injection": {
                    "LFI": {},
                    "SQLi": {},
                    "XSS": {},
                    "XXE": {},
                    "Command_Injection": {},
                    "CSRF": {},
                    "SSTI": {}
                },
                "Deserialization": {},
                "JBoss_&_WildFly": {},
                "Proxy_MITM": {},
                "SSRF": {},
                "Next_js": {},
                "Tomcat": {}
            },
            "Wireless": {
                "WiFi": {},
                "Bluetooth": {},
                "RFID_NFC": {}
            }
        },
        "03_Post_Exploitation": {
            "AD_Windows": {
                "Credential_Dump": {},
                "Kerberos_ADCS_Relay": {},
                "Lateral_Movement": {},
                "Recon_Health": {},
                "Toolkits": {}
            },
            "Credentials": {
                "Dumping": {},
                "Cracking": {},
                "Brute_Force": {},
                "Spraying": {}
            },
            "Persistence": {},
            "Pivoting": {},
            "Privilege_Escalation": {
                "Linux": {},
                "Windows": {},
                "Multi_Platform": {}
            },
            "Reverse_Engineering": {}
        },
        "04_Red_Team": {
            "C2_Frameworks": {},
            "Evasion": {},
            "Payload_Generation": {},
        },
        "05_Forensics": {
            "Disk_Analysis": {},
            "Memory_Analysis": {},
            "Network_Forensics": {},
            "File_Carving": {},
            "Malware_Analysis": {}
        },
        "06_Miscellaneous": {
            "AI_MCP": {},
            "Utilities": {}
        }
    };

    const formatLabel = (text) => String(text).replace(/_/g, " ").replace(/^\d+_/, "");
    const chevronSVG = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
    const folderSVG = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';

    const ICONS = {
        defaults: {folderClosed: folderSVG, folderOpen: folderSVG, terminal: chevronSVG},
        byPath: {},
        byPrefix: {}
    };

    const svg_common =
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="4 17 10 11 4 5"></polyline>' +
        '<line x1="12" x2="20" y1="19" y2="19"></line>' +
        '</svg>';

    const svg_inf_gather =
        '<svg class="icon"  stroke="currentColor" stroke-width="2" viewBox="-0.5 0 25 25" fill="none" >' +
        '<path d="M22 11.8201C22 9.84228 21.4135 7.90885 20.3147 6.26436C19.2159 4.61987 17.6542 3.33813 15.8269 2.58126C13.9996 1.82438 11.9889 1.62637 10.0491 2.01223C8.10927 2.39808 6.32748 3.35052 4.92896 4.74904C3.53043 6.14757 2.578 7.92935 2.19214 9.86916C1.80629 11.809 2.00436 13.8197 2.76123 15.6469C3.51811 17.4742 4.79985 19.036 6.44434 20.1348C8.08883 21.2336 10.0222 21.8201 12 21.8201"/>' +
        '<path d="M2 11.8201H22"/>' +
        '<path d="M12 21.8201C10.07 21.8201 8.5 17.3401 8.5 11.8201C8.5 6.30007 10.07 1.82007 12 1.82007C13.93 1.82007 15.5 6.30007 15.5 11.8201"/>' +
        '<path d="M18.3691 21.6901C20.3021 21.6901 21.8691 20.1231 21.8691 18.1901C21.8691 16.2571 20.3021 14.6901 18.3691 14.6901C16.4361 14.6901 14.8691 16.2571 14.8691 18.1901C14.8691 20.1231 16.4361 21.6901 18.3691 21.6901Z"/>' +
        '<path d="M22.9998 22.8202L20.8398 20.6702"/>' +
        '</svg>';

    const svg_exploit =
        '<svg class="icon" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" fill="none">' +
        '<path d="M7 14.3333C7 13.0872 7 12.4641 7.26795 12C7.44349 11.696 7.69596 11.4435 8 11.2679C8.4641 11 9.08718 11 10.3333 11H13.6667C14.9128 11 15.5359 11 16 11.2679C16.304 11.4435 16.5565 11.696 16.7321 12C17 12.4641 17 13.0872 17 14.3333V16C17 16.9293 17 17.394 16.9231 17.7804C16.6075 19.3671 15.3671 20.6075 13.7804 20.9231C13.394 21 12.9293 21 12 21V21C11.0707 21 10.606 21 10.2196 20.9231C8.63288 20.6075 7.39249 19.3671 7.07686 17.7804C7 17.394 7 16.9293 7 16V14.3333Z" />' +
        '<path d="M9 9C9 8.06812 9 7.60218 9.15224 7.23463C9.35523 6.74458 9.74458 6.35523 10.2346 6.15224C10.6022 6 11.0681 6 12 6V6C12.9319 6 13.3978 6 13.7654 6.15224C14.2554 6.35523 14.6448 6.74458 14.8478 7.23463C15 7.60218 15 8.06812 15 9V11H9V9Z"/>' +
        '<path d="M12 11V15" />' +
        '<path d="M15 3L13 6" />' +
        '<path d="M9 3L11 6" />' +
        '<path d="M7 16H2"/>' +
        '<path d="M22 16H17"/>' +
        '<path d="M20 9V10C20 11.6569 18.6569 13 17 13V13" />' +
        '<path d="M20 22V22C20 20.3431 18.6569 19 17 19V19"/>' +
        '<path d="M4 9V10C4 11.6569 5.34315 13 7 13V13" />' +
        '<path d="M4 22V22C4 20.3431 5.34315 19 7 19V19"/>' +
        '</svg>';

    const svg_post_exploit =
        '<svg class="icon" fill="none" stroke-width="35" stroke="currentColor" viewBox="0 0 512 512">' +
        '<path d="M265.394,179.642v-27.998h-18.788v27.998c-35.003,4.265-62.699,31.969-66.964,66.964h-27.997v18.787h27.997 c4.265,34.995,31.961,62.7,66.964,66.964v27.989h18.788v-27.989c35.003-4.265,62.7-31.97,66.964-66.964h27.998v-18.787h-27.998 C328.093,211.611,300.397,183.907,265.394,179.642z M246.606,308.635c-11.003-1.961-20.824-7.215-28.442-14.799 c-7.6-7.618-12.846-17.44-14.799-28.442h43.241V308.635z M246.606,246.606h-43.241c1.953-11.004,7.198-20.833,14.799-28.442 c7.618-7.593,17.439-12.855,28.442-14.799V246.606z M293.836,293.836c-7.617,7.584-17.431,12.838-28.442,14.799v-43.241h43.241 C306.69,276.396,301.436,286.218,293.836,293.836z M265.394,246.606v-43.241c11.011,1.944,20.825,7.206,28.442,14.799 c7.6,7.609,12.854,17.438,14.799,28.442H265.394z"/>' +
        '<path d="M457.605,244.252C451.739,142.065,369.934,60.26,267.748,54.395V0h-23.489v54.395 C142.066,60.26,60.261,142.058,54.395,244.252H0v23.497h54.395c5.866,102.178,87.671,183.991,189.864,189.857V512h23.489v-54.395 c102.185-5.866,183.991-87.679,189.857-189.857H512v-23.497H457.605z M434.058,267.748c-2.9,44.616-22.115,84.705-51.856,114.454 c-29.749,29.724-69.838,48.956-114.454,51.856v-23.053h-23.489v23.053c-44.624-2.9-84.721-22.132-114.462-51.856 c-29.741-29.749-48.948-69.838-51.856-114.454h23.053v-23.497H77.942c2.908-44.623,22.114-84.705,51.856-114.462 c29.74-29.733,69.822-48.948,114.462-51.847v23.053h23.489V77.942c44.616,2.899,84.713,22.123,114.462,51.847 c29.732,29.758,48.947,69.839,51.847,114.462h-23.054v23.497H434.058z"/>' +
        '</svg>';

    const svg_redteam =
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline>' +
        '<line x1="13" y1="19" x2="19" y2="13"></line>' +
        '<line x1="16" y1="16" x2="20" y2="20"></line>' +
        '<line x1="19" y1="21" x2="21" y2="19"></line>' +
        '</svg>';

    const svg_forensics =
        '<svg class="icon" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" fill="none">' +
        '<circle cx="11" cy="11" r="8"/>' +
        '<line x1="16.5" y1="16.5" x2="21" y2="21"/>' +
        '<line x1="8" y1="11" x2="14" y2="11" stroke-width="3"/>' +
        '<line x1="11" y1="8" x2="11" y2="14" stroke-width="3"/>' +
        '</svg>';

    ICONS.byPrefix['00_Common'] = {open: svg_common, closed: svg_common, terminal: svg_common};
    ICONS.byPrefix['01_Information_Gathering'] = {
        open: svg_inf_gather,
        closed: svg_inf_gather,
        terminal: svg_inf_gather
    };
    ICONS.byPrefix['02_Exploitation'] = {open: svg_exploit, closed: svg_exploit, terminal: svg_exploit};
    ICONS.byPrefix['03_Post_Exploitation'] = {
        open: svg_post_exploit,
        closed: svg_post_exploit,
        terminal: svg_post_exploit
    };
    ICONS.byPrefix['04_Red_Team'] = {open: svg_redteam, closed: svg_redteam, terminal: svg_redteam};
    ICONS.byPrefix['05_Forensics'] = {open: svg_forensics, closed: svg_forensics, terminal: svg_forensics};

    window.SIDEBAR_ICONS = {
        common: svg_common,
        information_gathering: svg_inf_gather,
        exploitation: svg_exploit,
        post_exploitation: svg_post_exploit,
        red_team: svg_redteam,
        forensics: svg_forensics,
        miscellaneous: folderSVG
    };

    const ICON_MAP = new Map();

    const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
    const hasChildrenNode = (n) => isObject(n) && Object.keys(n).length > 0;
    const isNodeVisible = (el) => !!(el && el.offsetParent !== null);

    function getIconStatic(path, hasKids) {
        let v = ICONS.byPath[path];
        if (v) return (typeof v === 'string')
            ? v
            : (hasKids ? (v.closed || v.any || ICONS.defaults.folderClosed)
                : (v.terminal || v.any || v.closed || ICONS.defaults.folderClosed));

        let bestKey = null;
        for (const key of Object.keys(ICONS.byPrefix)) {
            if (path.startsWith(key) && (!bestKey || key.length > bestKey.length)) bestKey = key;
        }
        const vp = bestKey ? ICONS.byPrefix[bestKey] : null;
        if (vp) return (typeof vp === 'string')
            ? (!hasKids ? vp : ICONS.defaults.folderClosed)
            : (hasKids ? (vp.closed || vp.any || ICONS.defaults.folderClosed)
                : (vp.terminal || vp.any || vp.closed || ICONS.defaults.folderClosed));

        if (!hasKids) {
            const parts = splitPath(path);
            for (let i = parts.length - 2; i >= 0; i--) {
                const anc = parts.slice(0, i + 1).join('/');
                const va = ICONS.byPath[anc];
                if (va) return (typeof va === 'string')
                    ? va
                    : (va.terminal || va.any || va.closed || ICONS.defaults.folderClosed);
            }
        }
        return ICONS.defaults.folderClosed;
    }

    function precomputeIconMap() {
        (function walk(node, base = '') {
            for (const [k, sub] of Object.entries(node)) {
                const path = base ? `${base}/${k}` : k;
                const kids = hasChildrenNode(sub);
                ICON_MAP.set(path, getIconStatic(path, kids));
                walk(sub, path);
            }
        })(taxonomy);
    }

    // MEMORIA (path attivo + rami espansi)
    const MEM = {
        collapsed: 'tm:sidebar:collapsed',
        pathKey: 'tm:active:path',
        pathSlash: 'tm:active:slash',
        preSearchSlash: 'tm:presearch:slash',
        searchTempSlash: 'tm:search:tempSlash'
    };

    const phaseMemory = Object.fromEntries(
        Object.keys(taxonomy).map(phase => [phase, {activePathSlash: null, expanded: new Set()}])
    );

    function ensurePhase(phaseKey) {
        if (!phaseMemory[phaseKey]) phaseMemory[phaseKey] = {activePathSlash: null, expanded: new Set()};
        return phaseMemory[phaseKey];
    }

    function setActivePathSlash(phaseKey, fullSlash) {
        ensurePhase(phaseKey).activePathSlash = fullSlash;
    }

    function getActivePathSlash(phaseKey) {
        return ensurePhase(phaseKey).activePathSlash || null;
    }

    function expandBranch(phaseKey, path) {
        ensurePhase(phaseKey).expanded.add(path);
    }

    function collapseSubtree(phaseKey, prefix) {
        const s = ensurePhase(phaseKey).expanded;
        [...s].forEach(p => {
            if (p === prefix || p.startsWith(prefix + '/')) s.delete(p);
        });
    }

    function getExpandedPaths(phaseKey) {
        return [...ensurePhase(phaseKey).expanded].sort((a, b) => a.split('/').length - b.split('/').length);
    }

    function resolveToolIdsForSlashPath(slashPath) {
        const tm = window.Toolmap || {};
        const keys = Object.keys(tm.nodeIndex || {});
        const root = (tm.registry && (tm.registry.name || tm.registry.title)) || 'Root';
        const suffix = slashPath.replace(/\//g, '>');
        const candidates = [suffix, `${root}>${suffix}`];

        let bestKey = null;
        for (const cand of candidates) if (tm.allToolsUnder?.[cand]) {
            bestKey = cand;
            break;
        }
        if (!bestKey) {
            for (const k of keys) {
                if (k === suffix || k.endsWith('>' + suffix) || k.endsWith(suffix)) {
                    if (!bestKey || k.length > bestKey.length) bestKey = k;
                }
            }
        }
        const ids = bestKey ? Array.from(tm.allToolsUnder[bestKey] || []) : [];

        if (!bestKey) {
            bestKey = `${root}>${suffix}`;
        }

        return {pathKey: bestKey, ids};
    }

    function phaseToColor(phase) {
        return window.TOOLMAP_CONSTANTS.PHASE_COLORS[phase] || 'hsl(var(--accent))';
    }

    function isSearchMode() {
        const sb = document.getElementById('sidebar');
        return !!(sb && sb.classList.contains(CLASSES.searchMode));
    }

    function getPhaseFromPath(slashPath) {
        if (!slashPath || typeof slashPath !== 'string') return null;
        return slashPath.split('/')[0] || null;
    }

    function splitPath(slashPath) {
        if (!slashPath || typeof slashPath !== 'string') return [];
        return slashPath.split('/').filter(Boolean);
    }

    function getNavItem(phaseKey) {
        if (!phaseKey) return null;
        return document.querySelector(`.nav-item[data-phase="${phaseKey}"]`);
    }

    function getOpenNavItems() {
        return Array.from(document.querySelectorAll('.nav-item.open'));
    }

    function derivePhaseColor(phaseKey, ids) {
        const tById = (window.Toolmap && window.Toolmap.toolsById) || {};
        for (const id of ids) {
            const t = tById[id];
            if (t?.phaseColor) return t.phaseColor;
        }
        return phaseToColor(phaseKey);
    }

    // BUILD & RENDER
    function getNodeByPath(obj, path) {
        return path.split('/').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
    }

    function depthFromPath(path) {
        const parts = splitPath(path);
        return Math.max(0, parts.length - 1);
    }

    function createNestedContainer(pathSlash, node, animated = true) {
        const depth = depthFromPath(pathSlash);
        const nest = document.createElement('div');
        nest.className = 'children children-nested';
        nest.dataset.parent = pathSlash;
        nest.style.setProperty('--level', String(depth));
        nest.innerHTML = buildChildren(node, pathSlash);

        if (animated) {
            nest.style.maxHeight = '0px';
            nest.style.opacity = '0';
            nest.style.paddingTop = '0px';
        } else {
            nest.style.maxHeight = 'none';
            nest.style.opacity = '1';
            nest.style.paddingTop = '2px';
        }

        return nest;
    }

    // Unificata: apre o chiude con animazione
    // Fallback timeout garantisce che il callback venga chiamato anche se transitionend non scatta
    const NESTED_ANIMATION_FALLBACK_MS = 400;

    function animateNested(nest, isOpening, onComplete) {
        if (!nest) return;

        const setStyles = (styles) => Object.entries(styles).forEach(([k, v]) => nest.style[k] = v);
        let completed = false;

        if (isOpening) {
            // Misura altezza in modo affidabile con visibility:hidden
            setStyles({visibility: 'hidden', maxHeight: 'none', opacity: '1', paddingTop: '2px'});
            forceReflow(nest);
            const target = nest.scrollHeight;

            // Ripristina stato iniziale e anima
            setStyles({visibility: '', maxHeight: '0px', opacity: '0', paddingTop: '0px'});
            forceReflow(nest);
            setStyles({maxHeight: `${target}px`, opacity: '1', paddingTop: '2px'});

            const complete = () => {
                if (completed) return;
                completed = true;
                if (document.body.contains(nest) && nest.style.opacity === '1') {
                    nest.style.maxHeight = 'none';
                }
                onComplete?.();
            };

            nest.addEventListener('transitionend', complete, {once: true});
            setTimeout(complete, NESTED_ANIMATION_FALLBACK_MS);
        } else {
            const h = nest.scrollHeight;
            setStyles({maxHeight: `${h}px`, opacity: '1', paddingTop: '2px'});
            forceReflow(nest);
            setStyles({maxHeight: '0px', opacity: '0', paddingTop: '0px'});

            const complete = () => {
                if (completed) return;
                completed = true;
                nest.remove();
                onComplete?.();
            };

            nest.addEventListener('transitionend', complete, {once: true});
            setTimeout(complete, NESTED_ANIMATION_FALLBACK_MS);
        }
    }

    // Anima apertura/chiusura dei children delle macro fasi (come animateNested ma senza rimuovere)
    // Fallback timeout garantisce che il callback venga chiamato anche se transitionend non scatta
    // (es. quando .typing disabilita le transizioni CSS)
    const ANIMATION_FALLBACK_MS = 400;

    /**
     * Anima chiusura CONTEMPORANEA di nested e fasi (batch)
     * Nested e fasi si chiudono insieme per un effetto fluido
     * @param {Array} nestedArray - array di elementi .children-nested da animare
     * @param {Array} childrenData - array di {item, children} per le fasi
     * @param {Function} onAllComplete - callback finale
     */
    function animateCloseAllBatch(nestedArray, childrenData, onAllComplete) {
        const hasNested = nestedArray && nestedArray.length > 0;
        const hasPhases = childrenData && childrenData.length > 0;

        if (!hasNested && !hasPhases) {
            onAllComplete?.();
            return;
        }

        // Conta totale elementi da animare
        let totalToComplete = (hasNested ? nestedArray.length : 0) + (hasPhases ? childrenData.length : 0);
        let completedCount = 0;

        const checkAllComplete = () => {
            completedCount++;
            if (completedCount >= totalToComplete) {
                // Cleanup fasi
                if (hasPhases) {
                    childrenData.forEach(({item, children}) => {
                        item.classList.remove(CLASSES.open);
                        children.style.removeProperty('max-height');
                        children.style.removeProperty('opacity');
                    });
                }
                onAllComplete?.();
            }
        };

        // Usa un singolo RAF per sincronizzare tutte le animazioni
        requestAnimationFrame(() => {
            const setStyles = (el, styles) => Object.entries(styles).forEach(([k, v]) => el.style[k] = v);

            // FASE 1: Imposta stili iniziali su TUTTI gli elementi
            const nestedHeights = [];
            const phaseHeights = [];

            if (hasNested) {
                nestedArray.forEach((nest, i) => {
                    nestedHeights[i] = nest.scrollHeight;
                    setStyles(nest, {maxHeight: `${nestedHeights[i]}px`, opacity: '1', paddingTop: '2px'});
                });
            }

            if (hasPhases) {
                childrenData.forEach(({children}, i) => {
                    phaseHeights[i] = children.scrollHeight;
                    setStyles(children, {maxHeight: `${phaseHeights[i]}px`, opacity: '1'});
                });
            }

            // FASE 2: UN SOLO forceReflow per tutti
            forceReflow(hasNested ? nestedArray[0] : childrenData[0].children);

            // FASE 3: Imposta stili finali su TUTTI (trigger transizione contemporanea)
            if (hasNested) {
                nestedArray.forEach((nest) => {
                    setStyles(nest, {maxHeight: '0px', opacity: '0', paddingTop: '0px'});

                    let completed = false;
                    const complete = () => {
                        if (completed) return;
                        completed = true;
                        nest.remove();
                        checkAllComplete();
                    };

                    nest.addEventListener('transitionend', complete, {once: true});
                    setTimeout(complete, NESTED_ANIMATION_FALLBACK_MS);
                });
            }

            if (hasPhases) {
                childrenData.forEach(({children}) => {
                    setStyles(children, {maxHeight: '0px', opacity: '0'});

                    let completed = false;
                    const complete = () => {
                        if (completed) return;
                        completed = true;
                        checkAllComplete();
                    };

                    const handler = (e) => {
                        if (e.propertyName !== 'max-height') return;
                        children.removeEventListener('transitionend', handler);
                        complete();
                    };
                    children.addEventListener('transitionend', handler);
                    setTimeout(complete, ANIMATION_FALLBACK_MS);
                });
            }
        });
    }

    function animatePhaseChildren(children, isOpening, onComplete) {
        if (!children) return;

        const setStyles = (styles) => Object.entries(styles).forEach(([k, v]) => children.style[k] = v);
        let completed = false;

        const complete = () => {
            if (completed) return;
            completed = true;
            onComplete?.();
        };

        if (isOpening) {
            // Apertura: misura altezza in modo affidabile, poi anima
            // Usa visibility:hidden + max-height:none per calcolo preciso (anche alla prima apertura)
            setStyles({visibility: 'hidden', maxHeight: 'none', opacity: '1'});
            forceReflow(children);
            const target = children.scrollHeight;

            // Ripristina stato iniziale e anima
            setStyles({visibility: '', maxHeight: '0px', opacity: '0'});
            forceReflow(children);
            setStyles({maxHeight: `${target}px`, opacity: '1'});

            const handler = (e) => {
                if (e.propertyName !== 'max-height') return;
                children.removeEventListener('transitionend', handler);
                if (document.body.contains(children) && children.style.opacity === '1') {
                    children.style.maxHeight = 'none';
                }
                complete();
            };
            children.addEventListener('transitionend', handler);
            // Fallback se transitionend non scatta
            setTimeout(complete, ANIMATION_FALLBACK_MS);
        } else {
            // Chiusura: prima imposta altezza reale, poi transiziona a 0
            const h = children.scrollHeight;
            setStyles({maxHeight: `${h}px`, opacity: '1'});
            forceReflow(children);
            setStyles({maxHeight: '0px', opacity: '0'});

            const handler = (e) => {
                if (e.propertyName !== 'max-height') return;
                children.removeEventListener('transitionend', handler);
                complete();
            };
            children.addEventListener('transitionend', handler);
            // Fallback se transitionend non scatta
            setTimeout(complete, ANIMATION_FALLBACK_MS);
        }
    }

    function expandAndHighlightPath(container, pathSlash, phaseKey) {
        if (!container || !pathSlash) return;

        expandAncestors(container, pathSlash);

        container.querySelectorAll(SELECTORS.activeNodes)
            .forEach(n => n.classList.remove(CLASSES.active));

        const activeEl = container.querySelector(
            `.folder-leaf[data-path="${pathSlash}"], .leaf[data-path="${pathSlash}"]`
        );
        if (activeEl) activeEl.classList.add(CLASSES.active);

        highlightActivePath(phaseKey);
    }

    function buildChildren(obj, parentPath = '') {
        let html = '';
        if (!isObject(obj)) return html;

        for (const [key, sub] of Object.entries(obj)) {
            const path = parentPath ? `${parentPath}/${key}` : key;
            const hasKids = hasChildrenNode(sub);
            const icon = ICON_MAP.get(path) || ICONS.defaults.folderClosed;
            const pathKey = path.replace(/\//g, '>');
            html += `
        <div class="folder-leaf${hasKids ? "" : " terminal"}"
             data-path="${path}"
             data-pathkey="${pathKey}"
             data-has-children="${hasKids}">
          <span class="node-icon" aria-hidden="true">${icon}</span>
          <span>${formatLabel(key)}</span>
        </div>
      `;
        }
        return html;
    }

    // Ottimizzato: loop inverso senza creare array intermedio
    function markLastVisible(container) {
        if (!container) return;

        container.querySelectorAll(':scope > .folder-leaf.is-last-visible')
            .forEach(n => n.classList.remove('is-last-visible'));

        const folders = container.querySelectorAll(':scope > .folder-leaf');
        for (let i = folders.length - 1; i >= 0; i--) {
            if (isNodeVisible(folders[i])) {
                folders[i].classList.add('is-last-visible');
                break;
            }
        }
    }

    function updateSearchContainersVLines(root) {
        if (!root) return;

        // OTTIMIZZAZIONE: Query più specifica invece di controllare ogni child
        // Usa :has() se disponibile, altrimenti fallback a iterazione
        root.querySelectorAll('.children, .children-nested, .hover-root').forEach(container => {
            // Ottimizzazione: usa querySelector invece di Array.from().some()
            const hasSearchNodes = !!(
                container.querySelector(`.${CLASSES.searchHit}`) ||
                container.querySelector(`.${CLASSES.searchIntermediate}`)
            );

            container.classList.toggle(CLASSES.hasActivePath, hasSearchNodes);
        });
    }

    function buildNav() {
        const nav = document.getElementById('nav');
        if (!nav) return;

        let html = '';
        Object.entries(taxonomy).forEach(([phase, tree]) => {
            const hasChildren = hasChildrenNode(tree);
            const childrenHTML = hasChildren ? buildChildren(tree, phase) : '';

            html += `
        <div class="nav-item ${hasChildren ? "has-children" : ""}" data-phase="${phase}">
          <button class="btn" data-search="${formatLabel(phase).toLowerCase()}" type="button">
            <span class="node-icon" aria-hidden="true">${ICON_MAP.get(phase) || ICONS.defaults.folderClosed}</span>
            <span class="label">${formatLabel(phase)}</span>
            ${hasChildren ? `<span class="chev">${chevronSVG}</span>` : ""}
          </button>
          ${hasChildren ? `<div class="children">${childrenHTML}</div>` : ""}
          ${hasChildren ? `
            <div class="flyout">
              <div class="flyout-title"><span class="node-icon" aria-hidden="true"></span><span>${formatLabel(phase)}</span></div>
              <div class="children">${childrenHTML}</div>
            </div>
          ` : ""}
        </div>
      `;
        });

        nav.innerHTML = html;
        attachPhaseToggles();
        attachFolderLeafDrilldown(document);
        document.querySelectorAll('.nav-item > .children').forEach(markLastVisible);
        positionFlyouts();
    }

    // Con controllo difensivo
    function forceReflow(element) {
        if (!element || !element.offsetHeight) return;
        void element.offsetHeight;
    }

    // HIGHLIGHT & THEME
    function clearPathHighlight(scope) {
        if (!scope) return;

        if (scope.classList && scope.classList.contains('nav-item')) {
            scope.classList.remove(CLASSES.hasActivePath);
        }

        scope.querySelectorAll(SELECTORS.pathNodes)
            .forEach(el => el.classList.remove(CLASSES.inActivePath, CLASSES.active));

        scope.querySelectorAll(SELECTORS.containers)
            .forEach(n => n.classList.remove(CLASSES.hasActivePath));

        if (scope === document) {
            scope.querySelectorAll('.nav-item').forEach(i => i.classList.remove(CLASSES.hasActivePath));
            scope.querySelectorAll('.nav-item > .btn.active')
                .forEach(b => b.classList.remove(CLASSES.active));
        }
    }

    function highlightActivePath(phaseKey) {
        const sb = document.getElementById('sidebar');
        if (sb && sb.classList.contains(CLASSES.searchMode)) return;

        const navItem = getNavItem(phaseKey);
        if (!navItem) return;

        const activeSlash = getActivePathSlash(phaseKey);
        if (!activeSlash) {
            navItem.classList.remove(CLASSES.hasActivePath);
            clearPathHighlight(navItem);
            return;
        }

        navItem.classList.add(CLASSES.hasActivePath);
        const parts = splitPath(activeSlash);

        navItem.querySelectorAll('.folder-leaf').forEach(el => el.classList.remove(CLASSES.inActivePath));

        for (let i = 1; i <= parts.length; i++) {
            const partial = parts.slice(0, i).join('/');
            const node = navItem.querySelector(`.folder-leaf[data-path="${partial}"]`);
            if (node) node.classList.add(CLASSES.inActivePath);
        }

        navItem.querySelectorAll('.children-nested').forEach(n => {
            if (n.querySelector(`.folder-leaf.${CLASSES.inActivePath}`)) n.classList.add(CLASSES.hasActivePath);
            else n.classList.remove(CLASSES.hasActivePath);
        });

        QueryHelpers.clearActive(navItem);
        const finalNode = navItem.querySelector(`.folder-leaf[data-path="${activeSlash}"], .leaf[data-path="${activeSlash}"]`);
        if (finalNode) finalNode.classList.add(CLASSES.active);
    }

    function applyPhaseThemeToPane(pane, phaseKey) {
        const navItem = getNavItem(phaseKey);
        if (!navItem || !pane) return;

        const cs = getComputedStyle(navItem);
        ['--phase', '--gutter', '--tree-x', '--tree-w', '--elbow-w', '--elbow-h', '--elbow-top']
            .forEach(p => {
                const v = cs.getPropertyValue(p);
                if (v) pane.style.setProperty(p, v.trim());
            });

        pane.style.setProperty('--tree-stroke', 'rgba(255,255,255,.12)');
        pane.style.setProperty('--tree-stroke-fade', 'rgba(255,255,255,.08)');
        pane.dataset.phase = phaseKey;
    }

    function highlightPathInContainer(container, activeSlash) {
        const inSearch = isSearchMode();
        if (inSearch) {
            activeSlash = null;
        }
        if (!container) return;

        container.querySelectorAll(SELECTORS.pathNodes)
            .forEach(el => el.classList.remove(CLASSES.inActivePath));
        container.querySelectorAll(SELECTORS.containers)
            .forEach(n => n.classList.remove(CLASSES.hasActivePath));

        if (!activeSlash) return;

        const parts = splitPath(activeSlash);
        const targets = [];

        for (let i = 1; i <= parts.length; i++) {
            const partial = parts.slice(0, i).join('/');
            const node = container.querySelector(
                `.folder-leaf[data-path="${partial}"], .leaf[data-path="${partial}"]`
            );
            if (node) {
                targets.push(node);
            }
        }

        targets.forEach(n => n.classList.add(CLASSES.inActivePath));

        container.querySelectorAll(SELECTORS.containers).forEach(n => {
            const directNodes = Array.from(
                n.querySelectorAll(':scope > .leaf, :scope > .folder-leaf, :scope > .section-title')
            );
            const should = directNodes.some(el => el.classList.contains(CLASSES.inActivePath));
            n.classList.toggle(CLASSES.hasActivePath, should);
        });
    }

    // SYNC ESPANSIONI
    function ensureExpandedInContainer(container, path) {
        const leaf = container.querySelector(`.folder-leaf[data-path="${path}"]`);
        if (!leaf) return;

        const next = leaf.nextElementSibling;
        if (next && next.classList?.contains('children-nested') && next.dataset.parent === path) return;

        const node = getNodeByPath(taxonomy, path);
        if (!hasChildrenNode(node)) return;

        const nest = createNestedContainer(path, node, false);
        leaf.after(nest);
        markLastVisible(leaf.parentElement);
        markLastVisible(nest);
        attachFolderLeafDrilldown(nest);
    }

    function expandFromMemoryInContainer(container, phaseKey) {
        getExpandedPaths(phaseKey).forEach(p => ensureExpandedInContainer(container, p));
        refreshAllVLinesDebounced(container);

        const current = getActivePathSlash(phaseKey);
        if (!container) return;

        if (container.classList && container.classList.contains('hover-pane')) {
            const sbEl = document.getElementById('sidebar');
            const inSearch =
                !!(sbEl && sbEl.classList.contains(CLASSES.searchMode)) ||
                container.classList.contains(CLASSES.searchMode);

            highlightPathInContainer(container, current);

            if (!inSearch && current) {
                const last =
                    container.querySelector(`.folder-leaf[data-path="${current}"]`) ||
                    container.querySelector(`.leaf[data-path="${current}"]`);
                if (last) {
                    QueryHelpers.clearActive(container);
                    last.classList.add(CLASSES.active);
                }
            }
        } else {
            highlightActivePath(phaseKey);
        }
        window.SidebarAutoGrow?.schedule();
    }

    // DISPATCH FILTRO
    function dispatchScopeAndPhase(slashPath, opts = {}) {
        const phaseKey = getPhaseFromPath(slashPath);
        const {pathKey, ids} = resolveToolIdsForSlashPath(slashPath);

        const sidebarEl = document.getElementById('sidebar');
        const inSearch = !!(sidebarEl && sidebarEl.classList.contains(CLASSES.searchMode));

        const currentPhase = getPhaseFromPath(slashPath);
        setActivePathSlash(currentPhase, slashPath);

        if (!inSearch) {
            localStorage.setItem(MEM.pathSlash, slashPath);
            if (pathKey) localStorage.setItem(MEM.pathKey, pathKey);
            else localStorage.removeItem(MEM.pathKey);
        } else {
            localStorage.setItem(MEM.searchTempSlash, slashPath);
        }

        window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {pathKey, ids, ...opts}}));
        const color = derivePhaseColor(phaseKey, ids);
        window.dispatchEvent(new CustomEvent('tm:phase:color', {detail: {color}}));
    }

    // ============================================================================
    // SEARCH MODE PHASE RESTORATION
    // ============================================================================

    function restoreSearchPhases(clickedPhase = null) {
        const lastCtx = window.__lastSearchContext;
        if (!lastCtx || !lastCtx.hasQuery || !lastCtx.paths) return;

        // RIMUOVI TUTTI I PHASE-BADGE
        document.querySelectorAll('.sidebar .phase-badge').forEach(badge => {
            badge.remove();
        });

        // Recupera le fasi che erano aperte prima
        const savedPhasesStr = localStorage.getItem('tm:search:open-phases');
        let savedPhases = [];
        if (savedPhasesStr) {
            try {
                savedPhases = JSON.parse(savedPhasesStr);
            } catch (e) {
                console.warn('[sidebar] Error parsing saved phases:', e);
            }
        }

        // Se è stata cliccata una fase specifica e non era nelle fasi salvate, aggiungila
        if (clickedPhase && !savedPhases.includes(clickedPhase)) {
            savedPhases.push(clickedPhase);
            localStorage.setItem('tm:search:open-phases', JSON.stringify(savedPhases));
        }

        // Se non ci sono fasi salvate, non aprire nulla ma comunque aggiungi i badge
        // Identifica TUTTE le fasi con risultati
        const phasesWithResults = new Set();
        if (lastCtx.paths) {
            lastCtx.paths.forEach(pathArr => {
                if (pathArr && pathArr.length > 0) {
                    phasesWithResults.add(pathArr[0]);
                }
            });
        }

        // AGGIUNGI I BADGE A TUTTE LE FASI CON RISULTATI (aperte o chiuse)
        phasesWithResults.forEach(phase => {
            const item = getNavItem(phase);
            if (!item) return;

            const phaseBtn = item.querySelector('.btn');
            if (phaseBtn) {
                // Rimuovi TUTTI i badge esistenti
                phaseBtn.querySelectorAll('.phase-badge, .search-badge').forEach(b => b.remove());

                const count = lastCtx.countsByPhase[phase] || 0;
                if (count > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'search-badge';
                    badge.textContent = String(count);
                    badge.setAttribute('aria-label', `${count} risultati`);

                    const chev = phaseBtn.querySelector('.chev');
                    if (chev) phaseBtn.insertBefore(badge, chev);
                    else phaseBtn.appendChild(badge);
                }
            }
        });

        // APRI SOLO le fasi che erano aperte prima
        if (savedPhases.length === 0) return;

        savedPhases.forEach(phase => {
            const item = getNavItem(phase);
            if (!item) return;

            item.classList.add(CLASSES.open);
            item.querySelector('.btn')?.classList.add(CLASSES.active);

            const phasePaths = lastCtx.paths.filter(arr => arr && arr[0] === phase);

            // Espandi i path
            for (const arr of phasePaths) {
                if (!arr || arr.length === 0) continue;
                const slash = arr.join('/');
                expandAncestorsWithHits(item, slash, arr);
            }

            // Applica le classi di search
            for (const arr of phasePaths) {
                const fullPath = arr.join('/');
                const terminalNode = item.querySelector(
                    `.folder-leaf[data-path="${fullPath}"], .leaf[data-path="${fullPath}"]`
                );
                if (terminalNode) {
                    terminalNode.classList.add(CLASSES.searchHit);
                }

                const parts = [];
                for (let i = 0; i < arr.length - 1; i++) {
                    parts.push(arr[i]);
                    const partial = parts.join('/');
                    const node = item.querySelector(
                        `.folder-leaf[data-path="${partial}"], .leaf[data-path="${partial}"]`
                    );
                    if (node) {
                        node.classList.add(CLASSES.searchIntermediate);
                    }
                }
            }

            updateSearchContainersVLines(item);
        });

        // Dispatch scope per tutte le fasi aperte
        const tm = window.Toolmap || {};
        const allSearchIds = lastCtx.foundToolIds || [];
        const toolsById = tm.toolsById || {};

        const phaseToolIds = allSearchIds.filter(id => {
            const tool = toolsById[id];
            if (!tool || !tool.category_path) return false;
            const toolPhase = tool.category_path[0];
            return savedPhases.includes(toolPhase);
        });

        window.dispatchEvent(new CustomEvent('tm:scope:set', {
            detail: {
                ids: phaseToolIds,
                pathKey: `search:phases:${savedPhases.join(',')}`,
                all: false,
                source: clickedPhase ? 'search-expand-from-phase-click' : 'search-expand-from-collapse'
            }
        }));
        refreshAllVLinesDebounced();
        window.SidebarAutoGrow?.schedule();
    }

    // INTERAZIONE NEL NAV
    function attachFolderLeafDrilldown(scope = document) {
        scope.querySelectorAll('.children .folder-leaf').forEach(el => {
            if (el.dataset._drillbound) return;
            el.dataset._drillbound = '1';

            el.addEventListener('click', (ev) => {
                ev.stopPropagation();

                const pathSlash = el.dataset.path;
                const node = getNodeByPath(taxonomy, pathSlash);
                const hasKids = hasChildrenNode(node);
                const phaseKey = getPhaseFromPath(pathSlash);

                Object.keys(taxonomy).forEach(otherPhase => {
                    if (otherPhase !== phaseKey) {
                        const otherActive = getActivePathSlash(otherPhase);
                        const otherNavItem = document.querySelector(`.nav-item[data-phase="${otherPhase}"]`);
                        if (otherActive && otherNavItem) {
                            const otherParts = otherActive.split('/');
                            for (let i = 1; i <= otherParts.length; i++) {
                                const partial = otherParts.slice(0, i).join('/');
                                const node = otherNavItem.querySelector(`.folder-leaf[data-path="${partial}"]`);
                                if (node && !node.classList.contains(CLASSES.inActivePath)) {
                                    node.classList.add(CLASSES.inActivePath);
                                }
                            }
                            QueryHelpers.clearActive(otherNavItem);
                            otherNavItem.classList.add(CLASSES.hasActivePath);
                            otherNavItem.querySelectorAll('.children-nested').forEach(n => {
                                if (n.querySelector(`.folder-leaf.${CLASSES.inActivePath}`)) {
                                    n.classList.add(CLASSES.hasActivePath);
                                }
                            });
                        }
                    }
                });

                setActivePathSlash(phaseKey, pathSlash);
                const inSearch = isSearchMode();
                const currentNavItem = el.closest('.nav-item');
                if (currentNavItem) {
                    QueryHelpers.clearActive(currentNavItem);
                }
                if (!inSearch) el.classList.add(CLASSES.active);
                if (!inSearch) highlightActivePath(phaseKey);

                dispatchScopeAndPhase(pathSlash, {source: 'sidebar'});

                if (currentNavItem) {
                    QueryHelpers.clearActive(currentNavItem);
                }
                if (!inSearch) el.classList.add(CLASSES.active);

                if (!hasKids) {
                    refreshAllVLinesDebounced();
                    return;
                }

                const next = el.nextElementSibling;
                const isOpen = !!(next && next.classList.contains('children-nested') && next.dataset.parent === pathSlash);

                if (isOpen) {
                    animateNested(next, false, () => {
                        markLastVisible(el.parentElement);
                        highlightActivePath(phaseKey);
                        collapseSubtree(phaseKey, pathSlash);
                        refreshAllVLinesDebounced();
                        window.SidebarAutoGrow?.schedule();
                    });
                    return;
                }

                const nest = createNestedContainer(pathSlash, node, true);
                el.after(nest);
                markLastVisible(el.parentElement);
                markLastVisible(nest);

                animateNested(nest, true, () => {
                    highlightActivePath(phaseKey);
                    expandBranch(phaseKey, pathSlash);
                    refreshAllVLinesDebounced();
                    window.SidebarAutoGrow?.schedule();
                });

                attachFolderLeafDrilldown(nest);
            });
        });
    }

    function expandAncestors(container, slashPath) {
        if (!slashPath) return;
        const parts = splitPath(slashPath);
        const acc = [];
        for (const p of parts) {
            acc.push(p);
            ensureExpandedInContainer(container, acc.join('/'));
        }
    }

    function expandAncestorsWithHits(container, slashPath, pathArray) {
        if (!slashPath || !pathArray || pathArray.length === 0) return;

        const acc = [];
        for (let i = 0; i < pathArray.length - 1; i++) {
            acc.push(pathArray[i]);
            const partial = acc.join('/');
            ensureExpandedInContainer(container, partial);
        }
    }

    function attachPhaseToggles() {
        document.querySelectorAll('.nav-item.has-children > .btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const navItem = btn.closest('.nav-item');
                const phaseKey = navItem.dataset.phase;

                const sidebar = document.getElementById('sidebar');
                const inSearch = sidebar && sidebar.classList.contains(CLASSES.searchMode);
                if (inSearch && navItem.classList.contains('search-disabled')) {
                    return;
                }

                const wasOpen = navItem.classList.contains(CLASSES.open);

                // ============================================================
                // CASO 1: Sidebar COLLAPSED - si espande cliccando sulla fase
                // ============================================================
                if (sidebar && sidebar.classList.contains(CLASSES.collapsed)) {
                    sidebar.classList.remove(CLASSES.collapsed);
                    localStorage.setItem(MEM.collapsed, '0');
                    hideHoverPane();

                    const inSearch = sidebar.classList.contains(CLASSES.searchMode);

                    // Salva il badge prima che venga rimosso (solo per modalità normale)
                    const currentPhaseBadge = btn.querySelector('.phase-badge, .search-badge');
                    let savedBadgeData = null;
                    if (currentPhaseBadge && !inSearch) {
                        savedBadgeData = {
                            value: currentPhaseBadge.textContent,
                            ariaLabel: currentPhaseBadge.getAttribute('aria-label'),
                            isSearchBadge: currentPhaseBadge.classList.contains('search-badge')
                        };
                    }

                    // Chiudi tutte le altre fasi con animazione fluida
                    const otherOpenPhases = Array.from(document.querySelectorAll('.nav-item.open'))
                        .filter(item => item !== navItem);

                    otherOpenPhases.forEach(item => {
                        const children = item.querySelector(':scope > .children');
                        item.querySelector('.btn')?.classList.remove(CLASSES.active);
                        clearPathHighlight(item);
                        animatePhaseChildren(children, false, () => {
                            item.classList.remove(CLASSES.open);
                        });
                    });

                    // Apri la fase cliccata con animazione fluida
                    navItem.classList.add(CLASSES.open);
                    btn.classList.add(CLASSES.active);
                    const newChildren = navItem.querySelector(':scope > .children');
                    animatePhaseChildren(newChildren, true);

                    // Rimuovi eventuali nested children esistenti
                    navItem.querySelectorAll('.children-nested').forEach(n => n.remove());

                    if (inSearch) {
                        // USA LA FUNZIONE HELPER per ripristinare le fasi in search mode
                        restoreSearchPhases(phaseKey);
                    } else {
                        // Modalità normale (non search)
                        expandFromMemoryInContainer(navItem, phaseKey);

                        const current = getActivePathSlash(phaseKey);
                        if (current && typeof current === 'string') {
                            highlightActivePath(phaseKey);
                            dispatchScopeAndPhase(current, {source: 'sidebar'});
                        } else {
                            const slash = phaseKey;
                            setActivePathSlash(phaseKey, slash);
                            highlightActivePath(phaseKey);
                            dispatchScopeAndPhase(slash, {source: 'sidebar'});
                        }

                        let targetSlash = getActivePathSlash(phaseKey) || phaseKey;
                        if (!inSearch && targetSlash !== phaseKey) {
                            expandAncestors(navItem, targetSlash);
                            QueryHelpers.clearActive(navItem);
                            const activeEl = navItem.querySelector(`.folder-leaf[data-path="${targetSlash}"], .leaf[data-path="${targetSlash}"]`);
                            if (activeEl) activeEl.classList.add(CLASSES.active);
                        }

                        if (!inSearch) {
                            highlightActivePath(phaseKey);
                            dispatchScopeAndPhase(targetSlash, {source: 'sidebar'});
                        }

                        // Ripristina il badge in modalità normale
                        if (!inSearch && savedBadgeData && !savedBadgeData.isSearchBadge) {
                            setTimeout(() => {
                                const existingBadge = btn.querySelector('.phase-badge');
                                if (!existingBadge && parseInt(savedBadgeData.value) > 0) {
                                    const badge = document.createElement('span');
                                    badge.className = 'phase-badge';
                                    badge.textContent = savedBadgeData.value;
                                    badge.setAttribute('aria-label', savedBadgeData.ariaLabel || `${savedBadgeData.value} tools`);

                                    const chevron = btn.querySelector('.chev');
                                    if (chevron) {
                                        btn.insertBefore(badge, chevron);
                                    } else {
                                        btn.appendChild(badge);
                                    }
                                }
                            }, 150);
                        }
                    }

                    btn.focus?.();

                    requestAnimationFrame(() => {
                        if (!inSearch) highlightActivePath(phaseKey);
                        refreshAllVLinesDebounced(navItem);
                    });

                    window.SidebarAutoGrow?.schedule();
                    return;
                }

                // ============================================================
                // CASO 2: Sidebar APERTA - toggle normale delle fasi
                // ============================================================

                // Raccogli le fasi da chiudere (solo in modalità normale)
                const phasesToClose = !inSearch
                    ? Array.from(document.querySelectorAll('.nav-item.open')).filter(item => item !== navItem)
                    : [];

                if (!wasOpen) {
                    // APERTURA della fase
                    // Chiudi le altre fasi con animazione fluida
                    phasesToClose.forEach(item => {
                        const children = item.querySelector(':scope > .children');
                        item.querySelector('.btn')?.classList.remove(CLASSES.active);
                        clearPathHighlight(item);
                        animatePhaseChildren(children, false, () => {
                            item.classList.remove(CLASSES.open);
                        });
                    });

                    // Apri la nuova fase con animazione fluida
                    navItem.classList.add(CLASSES.open);
                    btn.classList.add(CLASSES.active);
                    const newChildren = navItem.querySelector(':scope > .children');
                    animatePhaseChildren(newChildren, true);

                    if (inSearch) {
                        const lastCtx = window.__lastSearchContext;
                        if (lastCtx && lastCtx.hasQuery && lastCtx.paths) {
                            navItem.querySelectorAll('.children-nested').forEach(nest => nest.remove());

                            const phasePaths = lastCtx.paths.filter(arr => arr && arr[0] === phaseKey);

                            for (const arr of phasePaths) {
                                if (!arr || arr.length === 0) continue;
                                const slash = arr.join('/');
                                expandAncestorsWithHits(navItem, slash, arr);
                            }

                            for (const arr of phasePaths) {
                                const fullPath = arr.join('/');
                                const terminalNode = navItem.querySelector(
                                    `.folder-leaf[data-path="${fullPath}"], .leaf[data-path="${fullPath}"]`
                                );
                                if (terminalNode) {
                                    terminalNode.classList.add(CLASSES.searchHit);
                                }

                                const parts = [];
                                for (let i = 0; i < arr.length - 1; i++) {
                                    parts.push(arr[i]);
                                    const partial = parts.join('/');
                                    const node = navItem.querySelector(
                                        `.folder-leaf[data-path="${partial}"], .leaf[data-path="${partial}"]`
                                    );
                                    if (node) {
                                        node.classList.add(CLASSES.searchIntermediate);
                                    }
                                }
                            }
                            updateSearchContainersVLines(navItem);

                            // SALVA lo stato delle fasi aperte
                            // Usa setTimeout(0) invece di requestAnimationFrame per garantire esecuzione immediata
                            setTimeout(() => {
                                const openPhases = getOpenNavItems().map(item => item.dataset.phase);

                                // Salva le fasi aperte nel localStorage
                                if (openPhases.length > 0) {
                                    localStorage.setItem('tm:search:open-phases', JSON.stringify(openPhases));
                                }

                                if (openPhases.length === 0) {
                                    // USA gli IDs dalla ricerca originale
                                    const allSearchIds = lastCtx.foundToolIds || [];

                                    window.dispatchEvent(new CustomEvent('tm:scope:set', {
                                        detail: {
                                            ids: allSearchIds,
                                            pathKey: 'search:all',
                                            all: false,
                                            source: 'search-phase-all-closed'
                                        }
                                    }));
                                } else {
                                    // Filtra solo i tool che matchano la ricerca per le fasi aperte
                                    const tm = window.Toolmap || {};
                                    const allSearchIds = lastCtx.foundToolIds || [];
                                    const toolsById = tm.toolsById || {};

                                    const phaseToolIds = allSearchIds.filter(id => {
                                        const tool = toolsById[id];
                                        if (!tool || !tool.category_path) return false;
                                        const toolPhase = tool.category_path[0];
                                        return openPhases.includes(toolPhase);
                                    });

                                    window.dispatchEvent(new CustomEvent('tm:scope:set', {
                                        detail: {
                                            ids: phaseToolIds,
                                            pathKey: `search:phases:${openPhases.join(',')}`,
                                            all: false,
                                            source: 'search-phases-open'
                                        }
                                    }));
                                }
                            }, 0);
                        }
                    } else {
                        highlightActivePath(phaseKey);
                        expandFromMemoryInContainer(navItem, phaseKey);

                        const last = getActivePathSlash(phaseKey);
                        if (last && typeof last === 'string') {
                            QueryHelpers.clearActive(navItem);
                            const lastEl = navItem.querySelector(`.folder-leaf[data-path="${last}"], .leaf[data-path="${last}"]`);
                            if (lastEl) lastEl.classList.add(CLASSES.active);
                            dispatchScopeAndPhase(last, {source: 'sidebar'});
                            highlightActivePath(phaseKey);
                        }

                        const current = getActivePathSlash(phaseKey);
                        if (!current) {
                            const slash = phaseKey;
                            setActivePathSlash(phaseKey, slash);
                            highlightActivePath(phaseKey);
                            dispatchScopeAndPhase(slash, {source: 'sidebar'});
                        }

                        setTimeout(() => {
                            const existingBadge = btn.querySelector('.phase-badge');
                            if (!existingBadge) {
                                const targetPath = getActivePathSlash(phaseKey) || phaseKey;
                                const {ids} = resolveToolIdsForSlashPath(targetPath);

                                if (ids.length > 0) {
                                    const badge = document.createElement('span');
                                    badge.className = 'phase-badge';
                                    badge.textContent = String(ids.length);
                                    badge.setAttribute('aria-label', `${ids.length} tool${ids.length !== 1 ? 's' : ''}`);

                                    const chevron = btn.querySelector('.chev');
                                    if (chevron) {
                                        btn.insertBefore(badge, chevron);
                                    } else {
                                        btn.appendChild(badge);
                                    }
                                }
                            }
                        }, 150);
                    }
                } else {
                    // CHIUSURA della fase con animazione fluida
                    btn.classList.remove(CLASSES.active);
                    clearPathHighlight(navItem);
                    const children = navItem.querySelector(':scope > .children');

                    // Rimuovi IMMEDIATAMENTE la classe open per aggiornare lo stato prima del dispatch
                    navItem.classList.remove(CLASSES.open);

                    animatePhaseChildren(children, false);

                    if (inSearch) {
                        const lastCtx = window.__lastSearchContext;
                        if (lastCtx && lastCtx.hasQuery && lastCtx.paths) {
                            // SALVA lo stato delle fasi aperte (dopo la chiusura)
                            // Usa setTimeout(0) invece di requestAnimationFrame per garantire che venga eseguito subito
                            setTimeout(() => {
                                const openPhases = getOpenNavItems().map(item => item.dataset.phase);

                                // Aggiorna le fasi aperte nel localStorage
                                if (openPhases.length > 0) {
                                    localStorage.setItem('tm:search:open-phases', JSON.stringify(openPhases));
                                } else {
                                    localStorage.removeItem('tm:search:open-phases');
                                }

                                if (openPhases.length === 0) {
                                    const allSearchIds = lastCtx.foundToolIds || [];

                                    window.dispatchEvent(new CustomEvent('tm:scope:set', {
                                        detail: {
                                            ids: allSearchIds,
                                            pathKey: 'search:all',
                                            all: false,
                                            source: 'search-phase-all-closed'
                                        }
                                    }));
                                } else {
                                    // Filtra solo i tool che matchano la ricerca per le fasi aperte
                                    const tm = window.Toolmap || {};
                                    const allSearchIds = lastCtx.foundToolIds || [];
                                    const toolsById = tm.toolsById || {};

                                    const phaseToolIds = allSearchIds.filter(id => {
                                        const tool = toolsById[id];
                                        if (!tool || !tool.category_path) return false;
                                        const toolPhase = tool.category_path[0];
                                        return openPhases.includes(toolPhase);
                                    });

                                    window.dispatchEvent(new CustomEvent('tm:scope:set', {
                                        detail: {
                                            ids: phaseToolIds,
                                            pathKey: `search:phases:${openPhases.join(',')}`,
                                            all: false,
                                            source: 'search-phases-open'
                                        }
                                    }));
                                }
                            }, 0);
                        }
                    }
                }
            });

            btn.addEventListener('mouseenter', () => {
                const sidebarEl = document.getElementById('sidebar');
                if (sidebarEl && sidebarEl.classList.contains(CLASSES.collapsed)) {
                    const navItem = btn.closest('.nav-item');
                    const phaseKey = navItem.dataset.phase;
                    const phaseData = taxonomy[phaseKey];
                    if (hasChildrenNode(phaseData)) {
                        clearTimeout(hoverTimeout);

                        const lastCtx = window.__lastSearchContext;
                        const inSearch = sidebarEl.classList.contains(CLASSES.searchMode);

                        // OTTIMIZZAZIONE: Aggiungi delay prima di mostrare hover pane
                        // Previene aperture accidentali durante movimenti rapidi del mouse
                        hoverTimeout = setTimeout(() => {
                            if (inSearch && lastCtx && lastCtx.hasQuery) {
                                const phasePaths = (lastCtx.paths || []).filter(arr => arr && arr[0] === phaseKey);

                                if (phasePaths.length === 0) {
                                    return;
                                }

                                showHoverPaneForNode(btn, phaseData, phaseKey);

                                // OTTIMIZZAZIONE: Ridotto delay per applicazione ricerca
                                setTimeout(() => {
                                    window.applySearchToHoverPane && window.applySearchToHoverPane(lastCtx);

                                    // Filtra i tool trovati per questa fase
                                    const tm = window.Toolmap || {};
                                    const allSearchIds = lastCtx.foundToolIds || [];
                                    const toolsById = tm.toolsById || {};

                                    const phaseToolIds = allSearchIds.filter(id => {
                                        const tool = toolsById[id];
                                        if (!tool || !tool.category_path) return false;
                                        const toolPhase = tool.category_path[0];
                                        return toolPhase === phaseKey;
                                    });

                                    if (phaseToolIds.length > 0) {
                                        window.dispatchEvent(new CustomEvent('tm:scope:set', {
                                            detail: {
                                                ids: phaseToolIds,
                                                pathKey: `search:${phaseKey}`,
                                                all: false,
                                                source: 'hover-search-phase'
                                            }
                                        }));
                                    }
                                }, 30); // Ridotto da 50ms a 30ms
                            } else {
                                showHoverPaneForNode(btn, phaseData, phaseKey);

                                const last = getActivePathSlash(phaseKey);
                                if (last && typeof last === 'string') {
                                    dispatchScopeAndPhase(last);
                                }
                            }
                        }, 100); // Delay di 100ms prima di mostrare l'hover pane
                    }
                }
            });

            btn.addEventListener('mouseleave', () => {
                const sidebarEl = document.getElementById('sidebar');
                if (sidebarEl && sidebarEl.classList.contains(CLASSES.collapsed)) {
                    hoverTimeout = setTimeout(() => {
                        hideHoverPane();
                        const inSearch = sidebarEl.classList.contains(CLASSES.searchMode);
                        if (!inSearch) {
                            const lastSlash = localStorage.getItem(MEM.pathSlash);
                            if (lastSlash) {
                                dispatchScopeAndPhase(lastSlash, {source: 'hover-leave'});
                            }
                        }
                    }, TIMINGS.hoverDelay);
                }
            });

            document.addEventListener('mouseenter', (e) => {
                if (e.target.closest('.hover-pane')) clearTimeout(hoverTimeout);
            }, true);
        });
    }

    window.addEventListener('tm:sidebar:closeAll', () => {
        // Chiudi tutte le fasi CON ANIMAZIONE SEQUENZIALE (come Collapse All)
        const openItems = Array.from(document.querySelectorAll('.nav-item.open'));
        const childrenToAnimate = [];

        openItems.forEach(item => {
            item.querySelector('.btn')?.classList.remove(CLASSES.active);
            const children = item.querySelector(':scope > .children');
            if (children) {
                childrenToAnimate.push({item, children});
            } else {
                item.classList.remove(CLASSES.open);
            }
        });

        // Raccogli nested da animare
        const nestedToAnimate = Array.from(document.querySelectorAll('.children-nested'));

        // Anima in batch: nested e fasi si chiudono contemporaneamente
        animateCloseAllBatch(nestedToAnimate, childrenToAnimate, () => {
            clearPathHighlight();

            // Rimuovi tutti i badge NELLA SIDEBAR
            document.querySelectorAll('.sidebar .phase-badge, .sidebar .search-badge').forEach(b => {
                b.style.animation = 'badgePopIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
                setTimeout(() => b.remove(), 300);
            });

            refreshAllVLinesDebounced();
            window.SidebarAutoGrow?.schedule();
        });
    });

    function positionFlyouts() {
        const sidebar = document.getElementById('sidebar');
        document.querySelectorAll('.nav-item.has-children').forEach(item => {
            const flyout = item.querySelector('.flyout');
            if (!flyout) return;

            item.addEventListener('mouseenter', () => {
                if (!sidebar || !sidebar.classList.contains(CLASSES.collapsed)) return;
                const rect = item.getBoundingClientRect();
                flyout.style.left = `${rect.right + 10}px`;
                flyout.style.top = `${rect.top}px`;
            });
        });
    }

    // SIDEBAR CONTROLS
    function attachSidebarControls() {
        const sidebar = document.getElementById('sidebar');
        const collapseBtn = document.getElementById('collapseBtn');
        const collapseAllBtn = document.getElementById('collapseAllBtn');
        const expandAllBtn = document.getElementById('expandAllBtn');
        const headerActions = document.querySelector('.header-actions');

        function applyCollapsedStyle() {
            const isColl = sidebar.classList.contains(CLASSES.collapsed);
            sidebar.querySelectorAll('.btn').forEach(b => {
                b.style.gap = isColl ? '0px' : '10px';
            });
            sidebar.querySelectorAll('.toggle, .icon-btn').forEach(el => {
                if (isColl) el.style.marginLeft = '-10px';
                else el.style.removeProperty('margin-left');
            });
        }

        collapseBtn?.addEventListener('click', () => {
            const now = !sidebar.classList.contains(CLASSES.collapsed);
            const inSearch = sidebar.classList.contains(CLASSES.searchMode);

            // SALVA lo stato delle fasi aperte in search mode prima di collassare
            if (now && inSearch) {
                const openPhases = Array.from(document.querySelectorAll('.nav-item.open'))
                    .map(item => item.dataset.phase)
                    .filter(Boolean);

                if (openPhases.length > 0) {
                    localStorage.setItem('tm:search:open-phases', JSON.stringify(openPhases));
                }

                // RIMUOVI SOLO i phase-badge (NON i search-badge) prima di collassare
                document.querySelectorAll('.sidebar .phase-badge:not(.search-badge)').forEach(badge => {
                    badge.remove();
                });
            }

            // Toggle collapsed e chiusura fasi in PARALLELO
            sidebar.classList.toggle(CLASSES.collapsed, now);
            localStorage.setItem(MEM.collapsed, now ? '1' : '0');
            applyCollapsedStyle();

            if (now) {
                // Chiudi le fasi in parallelo con il collapse
                document.querySelectorAll('.nav-item.open').forEach(item => {
                    const children = item.querySelector(':scope > .children');
                    item.querySelector('.btn')?.classList.remove(CLASSES.active);

                    if (children) {
                        animatePhaseChildren(children, false, () => {
                            item.classList.remove(CLASSES.open);
                            children.style.removeProperty('max-height');
                            children.style.removeProperty('opacity');
                        });
                    } else {
                        item.classList.remove(CLASSES.open);
                    }
                });
                clearPathHighlight();
                hideHoverPane();
            } else {
                hideHoverPane();

                // RIPRISTINA le fasi aperte in search mode quando si espande
                if (inSearch) {
                    setTimeout(() => {
                        restoreSearchPhases();
                    }, 100);
                }
            }

            window.dispatchEvent(new CustomEvent('tm:sidebar:toggle', {detail: {collapsed: now}}));
        });

        headerActions?.addEventListener('click', () => setTimeout(applyCollapsedStyle, 0));

        const moCollapsed = new MutationObserver(muts => {
            for (const m of muts) if (m.type === 'attributes' && m.attributeName === 'class') applyCollapsedStyle();
        });
        moCollapsed.observe(sidebar, {attributes: true, attributeFilter: ['class']});

        applyCollapsedStyle();

        collapseAllBtn?.addEventListener('click', () => {
            const openItems = Array.from(document.querySelectorAll('.nav-item.open'));
            const childrenToAnimate = [];

            // Prepara la chiusura di tutte le fasi
            openItems.forEach(item => {
                item.querySelector('.btn')?.classList.remove(CLASSES.active);
                const children = item.querySelector(':scope > .children');
                if (children) {
                    childrenToAnimate.push({item, children});
                } else {
                    item.classList.remove(CLASSES.open);
                }
            });

            // Raccogli nested da animare
            const nestedToAnimate = Array.from(document.querySelectorAll('.children-nested'));

            // Anima in batch: nested e fasi si chiudono contemporaneamente
            animateCloseAllBatch(nestedToAnimate, childrenToAnimate, () => {
                clearPathHighlight();
                refreshAllVLinesDebounced();
                window.SidebarAutoGrow?.schedule();
            });
        });

        expandAllBtn?.addEventListener('click', () => {
            const sb = document.getElementById('sidebar');
            const inSearch = sb && sb.classList.contains(CLASSES.searchMode);

            if (inSearch) {
                const lastCtx = window.__lastSearchContext;
                if (!lastCtx || !lastCtx.hasQuery || !lastCtx.paths) return;

                const phasesWithResults = new Set();
                lastCtx.paths.forEach(arr => {
                    if (arr && arr.length > 0) phasesWithResults.add(arr[0]);
                });

                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove(CLASSES.open);
                    item.querySelector('.btn')?.classList.remove(CLASSES.active);
                    const ch = item.querySelector(':scope > .children');
                    if (ch) {
                        ch.style.removeProperty('max-height');
                        ch.style.removeProperty('opacity');
                    }
                    item.querySelectorAll('.children-nested').forEach(nest => nest.remove());
                });

                phasesWithResults.forEach(phaseKey => {
                    const item = getNavItem(phaseKey);
                    if (!item) return;

                    item.classList.add(CLASSES.open);
                    item.querySelector('.btn')?.classList.add(CLASSES.active);

                    // Anima l'apertura dei children
                    const children = item.querySelector(':scope > .children');
                    if (children) animatePhaseChildren(children, true);

                    const phasePaths = lastCtx.paths.filter(arr => arr && arr[0] === phaseKey);

                    for (const arr of phasePaths) {
                        if (!arr || arr.length === 0) continue;
                        const slash = arr.join('/');
                        expandAncestorsWithHits(item, slash, arr);
                    }

                    for (const arr of phasePaths) {
                        const fullPath = arr.join('/');
                        const terminalNode = item.querySelector(
                            `.folder-leaf[data-path="${fullPath}"], .leaf[data-path="${fullPath}"]`
                        );
                        if (terminalNode) {
                            terminalNode.classList.add(CLASSES.searchHit);
                        }

                        const parts = [];
                        for (let i = 0; i < arr.length - 1; i++) {
                            parts.push(arr[i]);
                            const partial = parts.join('/');
                            const node = item.querySelector(
                                `.folder-leaf[data-path="${partial}"], .leaf[data-path="${partial}"]`
                            );
                            if (node) {
                                node.classList.add(CLASSES.searchIntermediate);
                            }
                        }
                    }
                });

                document.querySelectorAll('.nav-item.has-search-results').forEach(item => {
                    updateSearchContainersVLines(item);
                });

                const allToolIds = new Set();
                lastCtx.paths.forEach(pathArr => {
                    if (!pathArr || pathArr.length === 0) return;
                    const slash = pathArr.join('/');
                    const {ids} = resolveToolIdsForSlashPath(slash);
                    ids.forEach(id => allToolIds.add(id));
                });

                window.dispatchEvent(new CustomEvent('tm:scope:set', {
                    detail: {
                        ids: Array.from(allToolIds),
                        pathKey: 'search:all-expanded',
                        all: false,
                        source: 'expand-all-search'
                    }
                }));

                refreshAllVLinesDebounced();
                window.SidebarAutoGrow?.schedule();
                return;
            }

            const globalActiveSlash = localStorage.getItem(MEM.pathSlash);
            const globalActivePhase = globalActiveSlash ? globalActiveSlash.split('/')[0] : null;

            document.querySelectorAll('.nav-item.has-children').forEach(item => {
                const phaseKey = item.dataset.phase;
                const btn = item.querySelector('.btn');
                const isGloballyActive = (phaseKey === globalActivePhase);

                if (!item.classList.contains(CLASSES.open)) {
                    item.classList.add(CLASSES.open);
                    btn?.classList.add(CLASSES.active);

                    // Anima l'apertura dei children
                    const children = item.querySelector(':scope > .children');
                    if (children) animatePhaseChildren(children, true);
                }

                const activeSlash = getActivePathSlash(phaseKey);
                if (activeSlash && typeof activeSlash === 'string') {
                    const parts = activeSlash.split('/');
                    let acc = [];
                    for (const p of parts) {
                        acc.push(p);
                        const partial = acc.join('/');
                        expandBranch(phaseKey, partial);
                        ensureExpandedInContainer(item, partial);
                    }

                    if (isGloballyActive) {
                        highlightActivePath(phaseKey);
                    } else {
                        item.classList.add(CLASSES.hasActivePath);

                        for (let i = 1; i <= parts.length; i++) {
                            const partial = parts.slice(0, i).join('/');
                            const node = item.querySelector(`.folder-leaf[data-path="${partial}"]`);
                            if (node) node.classList.add(CLASSES.inActivePath);
                        }

                        item.querySelectorAll('.children-nested').forEach(n => {
                            if (n.querySelector(`.folder-leaf.${CLASSES.inActivePath}`)) {
                                n.classList.add(CLASSES.hasActivePath);
                            } else {
                                n.classList.remove(CLASSES.hasActivePath);
                            }
                        });

                        QueryHelpers.clearActive(item);
                    }
                } else {
                    expandFromMemoryInContainer(item, phaseKey);

                    if (!isGloballyActive) {
                        QueryHelpers.clearActive(item);
                    }
                }
            });
            refreshAllVLinesDebounced();
            window.SidebarAutoGrow?.schedule();
        });
    }

    // HOVER-PANE
    let hoverPane = null;
    let hoverTimeout = null;

    function createHoverPane() {
        if (!hoverPane) {
            hoverPane = document.createElement('div');
            hoverPane.className = 'hover-pane';
            document.body.appendChild(hoverPane);

            hoverPane.addEventListener('mouseenter', () => clearTimeout(hoverTimeout));
            hoverPane.addEventListener('mouseleave', () => {
                hoverTimeout = setTimeout(() => hideHoverPane(), TIMINGS.hoverDelay);
            });

            hoverPane.addEventListener('click', (e) => {
                const leaf = e.target.closest('.folder-leaf');
                if (!leaf || !hoverPane.contains(leaf)) return;

                const pathSlash = leaf.dataset.path;
                const phaseKey = getPhaseFromPath(pathSlash);
                const node = getNodeByPath(taxonomy, pathSlash);
                const hasKids = hasChildrenNode(node);

                setActivePathSlash(phaseKey, pathSlash);
                dispatchScopeAndPhase(pathSlash, {source: 'hover'});

                const inSearch = isSearchMode();

                clearPathHighlight(hoverPane);

                document.querySelectorAll('.nav-item').forEach(navItem => {
                    if (navItem.dataset.phase !== phaseKey) {
                        const activeInPhase = getActivePathSlash(navItem.dataset.phase);
                        if (activeInPhase) {
                            const activeEl = navItem.querySelector(
                                `.folder-leaf[data-path="${activeInPhase}"], .leaf[data-path="${activeInPhase}"]`
                            );
                            if (activeEl && !activeEl.classList.contains(CLASSES.active)) {
                                activeEl.classList.add(CLASSES.active);
                            }
                        }
                    }
                });

                applyPhaseThemeToPane(hoverPane, phaseKey);

                const parts = splitPath(pathSlash);
                let acc = [];
                for (const p of parts.slice(0, -1)) {
                    acc.push(p);
                    ensureExpandedInContainer(hoverPane, acc.join('/'));
                }

                // Un solo forceReflow dopo tutte le modifiche DOM
                forceReflow(hoverPane);

                if (!inSearch) {
                    highlightPathInContainer(hoverPane, pathSlash);
                    leaf.classList.add(CLASSES.active);
                } else {
                    hoverPane.classList.add(CLASSES.searchMode);
                }

                highlightActivePath(phaseKey);

                requestAnimationFrame(() => {
                    refreshAllVLines(hoverPane);
                });

                if (hasKids) {
                    const next = leaf.nextElementSibling;
                    const isOpen = !!(next && next.classList.contains('children-nested') && next.dataset.parent === pathSlash);

                    if (isOpen) {
                        animateNested(next, false, () => {
                            markLastVisible(leaf.parentElement);
                            collapseSubtree(phaseKey, pathSlash);
                            refreshAllVLinesDebounced(hoverPane);
                            window.SidebarAutoGrow?.schedule();
                            const cur = getActivePathSlash(phaseKey);
                            highlightPathInContainer(hoverPane, null);
                            forceReflow(hoverPane);
                            highlightPathInContainer(hoverPane, cur);
                            highlightActivePath(phaseKey);
                        });
                        return;
                    }

                    const nest = createNestedContainer(pathSlash, node, true);
                    leaf.after(nest);
                    markLastVisible(leaf.parentElement);
                    markLastVisible(nest);

                    animateNested(nest, true, () => {
                        expandBranch(phaseKey, pathSlash);
                        refreshAllVLinesDebounced(hoverPane);
                        window.SidebarAutoGrow?.schedule();
                        const cur = getActivePathSlash(phaseKey);
                        highlightPathInContainer(hoverPane, null);
                        forceReflow(hoverPane);
                        highlightPathInContainer(hoverPane, cur);
                        highlightActivePath(phaseKey);
                    });
                } else {
                    refreshAllVLinesDebounced(hoverPane);
                    window.SidebarAutoGrow?.schedule();
                    const cur = getActivePathSlash(phaseKey);
                    highlightPathInContainer(hoverPane, null);
                    forceReflow(hoverPane);
                    highlightPathInContainer(hoverPane, cur);
                    highlightActivePath(phaseKey);
                }
            });
        }
        return hoverPane;
    }

    function hideHoverPane() {
        if (hoverPane) {
            hoverPane.classList.remove(CLASSES.active);
            hoverPane.style.removeProperty('width');
        }

        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains(CLASSES.collapsed)) {
            window.SidebarAutoGrow?.reset();
            if (window.SidebarAutoGrow?.apply?._last) {
                window.SidebarAutoGrow.apply._last = {key: null, value: null};
            }
        }
    }

    function ensureHoverPaneStyles() {
        if (document.getElementById('hover-pane-styles')) return;
        const css = `
          .hover-pane .children.has-active-path::before,
          .hover-pane .children-nested.has-active-path::before { background: var(--phase); width: 3px; }
          .hover-pane .folder-leaf.in-active-path::before,
          .hover-pane .leaf.in-active-path::before { border-left-color: var(--phase); border-bottom-color: var(--phase); border-left-width: 3px; border-bottom-width: 3px; }
          .hover-pane .folder-leaf.in-active-path, .hover-pane .leaf.in-active-path { color: var(--phase); font-weight: 600; }
          .hover-pane .folder-leaf.active { background: color-mix(in srgb, var(--phase) 15%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--phase) 30%, transparent); }`;
        const style = document.createElement('style');
        style.id = 'hover-pane-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function showHoverPaneForNode(element, node, path) {
        ensureHoverPaneStyles();
        const pane = createHoverPane();

        const phaseKey = path.includes('/') ? path.split('/')[0] : path;
        const isChangingPhase = pane.dataset.phase && pane.dataset.phase !== phaseKey;

        // Se cambia fase, resetta per animazione pulita
        if (isChangingPhase && pane.classList.contains(CLASSES.active)) {
            pane.classList.remove(CLASSES.active);
            pane.style.opacity = '0';
        }

        const lastCtx = window.__lastSearchContext;
        const inSearch = isSearchMode();

        const childrenHTML = buildChildren(node, phaseKey);
        const navItem = getNavItem(phaseKey);
        const hasActivePath = navItem && navItem.classList.contains(CLASSES.hasActivePath);
        const phaseIcon = ICON_MAP.get(phaseKey) || ICONS.defaults.folderClosed;
        const phaseColor = navItem ? getComputedStyle(navItem).getPropertyValue('--phase').trim() : '';

        pane.innerHTML = `
          <div class="hover-pane-header${hasActivePath ? ' has-active-path' : ''}"${hasActivePath && phaseColor ? ` style="color: ${phaseColor}"` : ''}>
            <span class="hover-pane-icon">${phaseIcon}</span>
            <span class="hover-pane-title">${formatLabel(phaseKey)}</span>
          </div>
          <div class="children children-nested hover-root" data-parent="${phaseKey}" style="--level: 1">
            ${childrenHTML}
          </div>
        `;
        pane.dataset.phase = phaseKey;
        pane.style.removeProperty('opacity')

        const rootChildren = pane.querySelector('.hover-root');
        markLastVisible(rootChildren);

        applyPhaseThemeToPane(pane, phaseKey);
        forceReflow(pane);

        const fromPane = !!(element.closest && element.closest('.hover-pane'));
        if (!fromPane) {
            const rect = element.getBoundingClientRect();
            pane.style.left = `${rect.right + 10}px`;
            pane.style.top = `${rect.top}px`;
        }

        pane.classList.add(CLASSES.active);

        if (inSearch && lastCtx && lastCtx.hasQuery) {
            pane.classList.add(CLASSES.searchMode);

            setTimeout(() => {
                applySearchToHoverPane(lastCtx);
            }, 10);

        } else {
            expandFromMemoryInContainer(pane, phaseKey);
        }

        // OTTIMIZZAZIONE: Single delayed call invece di multiple
        // Batching degli aggiornamenti per ridurre reflow/repaint
        requestAnimationFrame(() => {
            if (!inSearch) {
                const currentSlash = getActivePathSlash(phaseKey);
                if (currentSlash) {
                    highlightPathInContainer(pane, currentSlash);
                    const activeLeaf = pane.querySelector(`.folder-leaf[data-path="${currentSlash}"], .leaf[data-path="${currentSlash}"]`);
                    if (activeLeaf) activeLeaf.classList.add(CLASSES.active);
                }
            }

            // OTTIMIZZAZIONE: Single refresh con delay per permettere al DOM di stabilizzarsi
            setTimeout(() => {
                refreshAllVLines(pane);
                window.SidebarAutoGrow?.schedule();
            }, 50);
        });

        window.dispatchEvent(new Event('tm:hover:show'));
    }

    // RICERCA
    (function () {
        const SIDEBAR = document.getElementById('sidebar');
        const NAV = document.getElementById('nav');
        if (!SIDEBAR || !NAV) return;

        function clearSearchGhost() {
            SIDEBAR.classList.remove(CLASSES.searchMode);
            NAV.querySelectorAll('.nav-item').forEach(item => {
                item.style.removeProperty('display');
                item.classList.remove('search-disabled', 'has-search-results');
                const b = item.querySelector('.btn .search-badge');
                if (b) b.remove();
                QueryHelpers.clearSearchMarks(item);
                // CRITICO: Rimuovi i nested children creati durante la ricerca
                // per evitare interferenze con il ripristino dello stato PRE-ricerca
                item.querySelectorAll('.children-nested').forEach(nest => nest.remove());

                // CRITICO: Pulisci gli stili inline del .children principale
                // che potrebbero essere stati impostati durante la ricerca
                const children = item.querySelector(':scope > .children');
                if (children) {
                    children.style.removeProperty('max-height');
                    children.style.removeProperty('opacity');
                }
            });
            if (hoverPane && hoverPane.classList.contains(CLASSES.active)) {
                hoverPane.classList.remove(CLASSES.searchMode);
                QueryHelpers.clearSearchMarks(hoverPane);
            }
            refreshAllVLinesDebounced();
            window.SidebarAutoGrow?.schedule();
        }

        function applySearchGhost(detail) {
            const {hasQuery, phaseKeys = [], paths = [], countsByPhase = {}} = detail || {};
            if (!hasQuery) {
                clearSearchGhost();
                return;
            }

            // RIMUOVI TUTTI I PHASE-BADGE prima di applicare la ricerca
            document.querySelectorAll('.sidebar .phase-badge').forEach(badge => {
                badge.remove();
            });

            SIDEBAR.classList.add(CLASSES.searchMode);

            // OTTIMIZZAZIONE: Batch clear operations
            QueryHelpers.clearActive(NAV);
            const pathNodes = NAV.querySelectorAll(SELECTORS.pathNodes);
            const containers = NAV.querySelectorAll(SELECTORS.containers);

            // Single loop per rimuovere classi
            pathNodes.forEach(el => el.classList.remove(CLASSES.inActivePath));
            containers.forEach(n => n.classList.remove(CLASSES.hasActivePath));

            const phaseSet = new Set(phaseKeys);

            if (phaseSet.size === 0 || paths.length === 0) {
                NAV.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove(CLASSES.open, 'has-search-results');
                    item.querySelector('.btn')?.classList.remove(CLASSES.active);
                    item.style.removeProperty('display');

                    const btn = item.querySelector('.btn');
                    if (btn) {
                        // SEMPRE rimuovi i badge quando non ci sono risultati
                        btn.querySelector('.search-badge')?.remove();
                    }

                    QueryHelpers.clearSearchMarks(item);
                });
                refreshAllVLinesDebounced();
                return;
            }

            NAV.querySelectorAll('.nav-item').forEach(item => {
                const phase = item.dataset.phase;
                const hasResults = phaseSet.size === 0 || phaseSet.has(phase);

                item.style.removeProperty('display');

                if (hasResults) {
                    item.classList.add('has-search-results');
                } else {
                    item.classList.remove('has-search-results');
                }

                // Resetta sempre stili inline dei children (potrebbero essere rimasti da animazioni)
                const children = item.querySelector(':scope > .children');
                if (children) {
                    children.style.removeProperty('max-height');
                    children.style.removeProperty('opacity');
                }

                if (hasResults) {
                    item.classList.add(CLASSES.open);
                    item.querySelector('.btn')?.classList.add(CLASSES.active);
                } else {
                    item.classList.remove(CLASSES.open);
                    item.querySelector('.btn')?.classList.remove(CLASSES.active);
                }

                const btn = item.querySelector('.btn');
                if (btn) {
                    // SEMPRE aggiorna i badge in base a countsByPhase
                    btn.querySelector('.search-badge')?.remove();

                    // Se questa fase ha risultati, mostra il badge
                    const n = countsByPhase[phase] || 0;
                    if (n > 0) {
                        const chev = btn.querySelector('.chev');
                        const sb = document.createElement('span');
                        sb.className = 'search-badge';
                        sb.setAttribute('aria-label', `${n} risultati`);
                        sb.textContent = String(n);
                        if (chev) btn.insertBefore(sb, chev);
                        else btn.appendChild(sb);
                    }
                }

                QueryHelpers.clearSearchMarks(item);
                item.querySelectorAll('.children-nested').forEach(nest => {
                    nest.remove();
                });
            });

            for (const arr of paths) {
                if (!arr || !arr.length) continue;
                const phaseKey = arr[0];
                const item = NAV.querySelector(`.nav-item[data-phase="${phaseKey}"]`);
                if (!item) continue;

                if (!item.classList.contains('has-search-results')) continue;

                const slash = arr.join('/');

                expandAncestorsWithHits(item, slash, arr);

                const fullPath = arr.join('/');
                const terminalNode = item.querySelector(
                    `.folder-leaf[data-path="${fullPath}"], .leaf[data-path="${fullPath}"]`
                );

                if (terminalNode) {
                    terminalNode.classList.add(CLASSES.searchHit);
                }

                const parts = [];
                for (let i = 0; i < arr.length - 1; i++) {
                    parts.push(arr[i]);
                    const partial = parts.join('/');
                    const node = item.querySelector(
                        `.folder-leaf[data-path="${partial}"], .leaf[data-path="${partial}"]`
                    );
                    if (node) {
                        node.classList.add(CLASSES.searchIntermediate);
                    }
                }
            }

            // OTTIMIZZAZIONE: Batch update delle vline invece di per-fase
            // Raccogliamo tutte le fasi e aggiorniamo in un'unica chiamata
            const hasSearchResults = NAV.querySelectorAll('.nav-item.has-search-results');
            hasSearchResults.forEach(item => {
                updateSearchContainersVLines(item);
            });

            if (hoverPane && hoverPane.classList.contains(CLASSES.active)) {
                applySearchToHoverPane(detail);
            }

            // OTTIMIZZAZIONE: Single refresh invece di multiple chiamate
            // Usa setTimeout per permettere al DOM di stabilizzarsi
            setTimeout(() => {
                refreshAllVLinesDebounced(NAV);
                window.SidebarAutoGrow?.schedule();
            }, 50);
        }

        function applySearchToHoverPane(detail) {
            if (!hoverPane || !hoverPane.classList.contains(CLASSES.active)) return;

            const {hasQuery, paths = []} = detail || {};
            if (!hasQuery) {
                hoverPane.classList.remove(CLASSES.searchMode);
                return;
            }

            hoverPane.classList.add(CLASSES.searchMode);

            hoverPane.querySelectorAll('.folder-leaf, .leaf').forEach(el => {
                el.classList.remove(CLASSES.searchHit, 'search-has-children', CLASSES.searchIntermediate);
            });

            const nestedToRemove = hoverPane.querySelectorAll('.children-nested:not(.hover-root)');
            nestedToRemove.forEach(nest => nest.remove());

            clearPathHighlight(hoverPane);

            const currentPhase = hoverPane.dataset.phase;

            const relevantPaths = paths.filter(arr => arr && arr.length > 0 && arr[0] === currentPhase);

            for (const arr of relevantPaths) {
                const acc = [];
                for (let i = 0; i < arr.length; i++) {
                    acc.push(arr[i]);
                    const partial = acc.join('/');

                    const existingNested = hoverPane.querySelector(`.children-nested[data-parent="${partial}"]`);
                    if (existingNested) continue;

                    const parentLeaf = hoverPane.querySelector(`.folder-leaf[data-path="${partial}"]`);
                    if (!parentLeaf) continue;

                    const node = getNodeByPath(taxonomy, partial);
                    if (!hasChildrenNode(node)) continue;

                    const nest = createNestedContainer(partial, node, false);
                    parentLeaf.after(nest);

                    markLastVisible(parentLeaf.parentElement);
                    markLastVisible(nest);

                    attachFolderLeafDrilldown(nest);
                }
            }

            forceReflow(hoverPane);

            for (const arr of relevantPaths) {
                const fullPath = arr.join('/');
                const terminalNode = hoverPane.querySelector(`.folder-leaf[data-path="${fullPath}"], .leaf[data-path="${fullPath}"]`);

                if (terminalNode) {
                    terminalNode.classList.add(CLASSES.searchHit);
                }

                const parts = [];
                for (let i = 0; i < arr.length - 1; i++) {
                    parts.push(arr[i]);
                    const partial = parts.join('/');
                    const node = hoverPane.querySelector(`.folder-leaf[data-path="${partial}"], .leaf[data-path="${partial}"]`);
                    if (node) {
                        node.classList.add(CLASSES.searchIntermediate);
                    }
                }
            }

            updateSearchContainersVLines(hoverPane);

            requestAnimationFrame(() => {
                refreshAllVLines(hoverPane);
                window.SidebarAutoGrow?.schedule();
            });
        }

        window.applySearchToHoverPane = applySearchToHoverPane;

        window.addEventListener('tm:search:context', (ev) => {
            const detail = ev.detail || {};

            window.__lastSearchContext = detail;

            if (!detail.hasQuery) clearSearchGhost();
            else applySearchGhost(detail);
        });

        window.addEventListener('tm:hover:show', () => {
            window.SidebarAutoGrow?.schedule();

            const lastContext = window.__lastSearchContext;
            const inSearch = isSearchMode();

            if (inSearch && lastContext && lastContext.hasQuery) {
                if (window.applySearchToHoverPane) {
                    window.applySearchToHoverPane(lastContext);
                    setTimeout(() => window.applySearchToHoverPane(lastContext), TIMINGS.searchApply);
                }
            }
        });

        const sidebar = document.getElementById('sidebar');

        function saveAndClearPathHighlight() {
            NAV.querySelectorAll(`.${CLASSES.hasActivePath}`).forEach(el => el.classList.remove(CLASSES.hasActivePath));
            NAV.querySelectorAll(SELECTORS.pathNodes)
                .forEach(el => el.classList.remove(CLASSES.inActivePath));
            QueryHelpers.clearActive(NAV);
        }

        function clearSearchDecorations() {
            QueryHelpers.clearSearchMarks(document);
            document.querySelectorAll('.sidebar .search-badge').forEach(el => el.remove());
        }

        function openOnlyActivePathOnClear() {
            const sidebarEl = document.getElementById('sidebar');
            const nav = document.getElementById('nav');

            const preSearchSlash = localStorage.getItem(MEM.preSearchSlash);
            const pathSlash = localStorage.getItem(MEM.pathSlash);
            const lastSlash = preSearchSlash || pathSlash;


            if (!lastSlash) {
                sidebarEl?.classList.remove(CLASSES.searchMode);
                clearSearchDecorations();

                document.querySelectorAll('.nav-item.open').forEach(item => {
                    item.classList.remove(CLASSES.open);
                    item.querySelector('.btn')?.classList.remove(CLASSES.active);
                    item.style.removeProperty('display');
                });

                document.querySelectorAll('.children-nested').forEach(n => n.remove());
                clearPathHighlight();

                // Dispatch per mostrare tutti i tool quando non c'è path precedente
                localStorage.setItem('tm:scope:showAll', '1');
                window.dispatchEvent(new CustomEvent('tm:scope:set', {
                    detail: {all: true, source: 'search-clear-no-path'}
                }));

                if (typeof refreshAllVLinesDebounced === 'function') refreshAllVLinesDebounced();
                window.SidebarAutoGrow?.schedule();
                return;
            }

            sidebarEl?.classList.remove(CLASSES.searchMode);
            clearSearchDecorations();

            document.querySelectorAll('.nav-item.open').forEach(item => {
                item.classList.remove(CLASSES.open);
                item.querySelector('.btn')?.classList.remove(CLASSES.active);
                item.style.removeProperty('display');
            });

            document.querySelectorAll('.children-nested').forEach(n => n.remove());
            clearPathHighlight();

            const parts = lastSlash.split('/').filter(Boolean);
            const phaseKey = parts[0];
            const phaseItem = getNavItem(phaseKey);
            if (phaseItem) {
                phaseItem.classList.add(CLASSES.open);
                phaseItem.querySelector('.btn')?.classList.add(CLASSES.active);
                phaseItem.style.removeProperty('display');
            }

            for (let i = 1; i <= parts.length; i++) {
                const p = parts.slice(0, i).join('/');
                expandBranch(phaseKey, p);
                ensureExpandedInContainer(phaseItem || nav, p);
            }

            setActivePathSlash(phaseKey, lastSlash);
            highlightPathInContainer(phaseItem || nav, lastSlash);

            const leaf = (phaseItem || nav).querySelector(
                `.folder-leaf[data-path="${lastSlash}"], .leaf[data-path="${lastSlash}"]`
            );

            if (leaf) {
                QueryHelpers.clearActive(phaseItem || nav);
                leaf.classList.add(CLASSES.active);

                leaf.classList.add(CLASSES.inActivePath);
                let p = leaf.parentElement;
                while (p && p !== (phaseItem || nav)) {
                    if (p.classList) {
                        if (p.classList.contains('children') || p.classList.contains('children-nested')) {
                            p.classList.add(CLASSES.hasActivePath);
                        }
                        if (p.classList.contains('folder-leaf') || p.classList.contains('leaf') || p.classList.contains('section-title')) {
                            p.classList.add(CLASSES.inActivePath);
                        }
                    }
                    p = p.parentElement;
                }
            }

            if (typeof refreshAllVLinesDebounced === 'function') {
                refreshAllVLinesDebounced(phaseItem || nav);
            }
            window.SidebarAutoGrow?.schedule();

            if (lastSlash) {
                try {
                    localStorage.setItem(MEM.pathSlash, lastSlash);
                    dispatchScopeAndPhase(lastSlash, {source: 'search-clear'});
                } catch (e) {
                }
            }
            try {
                localStorage.removeItem(MEM.preSearchSlash);
                localStorage.removeItem(MEM.searchTempSlash);
            } catch (e) {
            }

            // Aggiungi badge per il path ripristinato
            if (lastSlash && phaseItem) {
                setTimeout(() => {
                    const btn = phaseItem.querySelector('.btn');
                    if (!btn) return;

                    const existingBadge = btn.querySelector('.phase-badge');
                    if (existingBadge) existingBadge.remove();

                    const {ids} = resolveToolIdsForSlashPath(lastSlash);
                    if (ids.length === 0) return;

                    const badge = document.createElement('span');
                    badge.className = 'phase-badge';
                    badge.textContent = String(ids.length);
                    badge.setAttribute('aria-label', `${ids.length} tool${ids.length !== 1 ? 's' : ''}`);

                    const chevron = btn.querySelector('.chev');
                    if (chevron) {
                        btn.insertBefore(badge, chevron);
                    } else {
                        btn.appendChild(badge);
                    }
                }, 200);
            }
        }

        window.addEventListener('tm:search:set', (ev) => {
            const hasQuery = !!(ev.detail && ev.detail.hasQuery);

            if (hasQuery) {
                try {
                    if (!localStorage.getItem(MEM.preSearchSlash)) {
                        const cur = localStorage.getItem(MEM.pathSlash);
                        if (cur) localStorage.setItem(MEM.preSearchSlash, cur);
                    }
                } catch (e) {
                    console.warn('[sidebar] Failed to save pre-search path:', e);
                }

                sidebar.classList.add(CLASSES.searchMode);

                // RIMUOVI TUTTI I PHASE-BADGE quando entri in search mode
                document.querySelectorAll('.sidebar .phase-badge').forEach(badge => {
                    badge.remove();
                });

                saveAndClearPathHighlight();

                QueryHelpers.clearActive(NAV);
                NAV.querySelectorAll(SELECTORS.pathNodes)
                    .forEach(el => el.classList.remove(CLASSES.inActivePath));
                NAV.querySelectorAll(SELECTORS.containers)
                    .forEach(n => n.classList.remove(CLASSES.hasActivePath));
                NAV.querySelectorAll('.nav-item > .btn.active')
                    .forEach(b => b.classList.remove(CLASSES.active));

                if (hoverPane) {
                    hoverPane.classList.add(CLASSES.searchMode);
                    hoverPane.querySelectorAll('.folder-leaf, .leaf, .section-title').forEach(el => el.classList.remove(CLASSES.inActivePath, CLASSES.active));
                    hoverPane.querySelectorAll(SELECTORS.containers).forEach(n => n.classList.remove(CLASSES.hasActivePath));
                }
            } else {
                try {
                    localStorage.removeItem('tm:search:open-phases');
                } catch (e) {
                    console.warn('[sidebar] Failed to remove search phases:', e);
                }

                try {
                    clearSearchGhost();
                } catch (_) {
                    sidebar.classList.remove(CLASSES.searchMode);
                    clearSearchDecorations();
                }

                if (hoverPane) {
                    hoverPane.classList.remove(CLASSES.searchMode);
                    hoverPane.querySelectorAll('.folder-leaf, .leaf, .section-title')
                        .forEach(el => el.classList.remove(CLASSES.inActivePath, CLASSES.active, CLASSES.searchHit));
                    hoverPane.querySelectorAll(SELECTORS.containers)
                        .forEach(n => n.classList.remove(CLASSES.hasActivePath));
                }
                openOnlyActivePathOnClear();
            }
        });

        window.addEventListener('tm:sidebar:restore-snapshot', (ev) => {
            const {openPhases = [], badgeStates = {}, scopeAll} = ev.detail || {};

            // Rimuovi search mode
            sidebar.classList.remove(CLASSES.searchMode);
            clearSearchDecorations();

            // Se era Show All, chiudi tutto e RIMUOVI tutti i badge
            if (scopeAll) {
                NAV.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove(CLASSES.open);
                    item.querySelector('.btn')?.classList.remove(CLASSES.active);

                    // RIMUOVI completamente i badge in Show All mode
                    const badge = item.querySelector('.phase-badge');
                    if (badge) {
                        badge.remove();
                    }
                });
            } else {
                NAV.querySelectorAll('.nav-item').forEach(item => {
                    const phase = item.dataset.phase;
                    if (!phase) return;

                    const wasOpen = openPhases.includes(phase);

                    if (wasOpen) {
                        item.classList.add(CLASSES.open);
                        item.querySelector('.btn')?.classList.add(CLASSES.active);

                        // CRITICO: Ripristina anche i nested children che erano espansi PRIMA della ricerca
                        // Questo garantisce che lo stato sia completamente ripristinato
                        if (typeof expandFromMemoryInContainer === 'function') {
                            expandFromMemoryInContainer(item, phase);
                        }

                        // Ripristina l'evidenziazione del path attivo per questa fase
                        if (typeof highlightActivePath === 'function') {
                            highlightActivePath(phase);
                        }

                        // Ripristina gli stili del .children per renderlo visibile
                        const children = item.querySelector(':scope > .children');
                        if (children) {
                            children.style.maxHeight = 'none';
                            children.style.opacity = '1';
                        }
                    } else {
                        item.classList.remove(CLASSES.open);
                        item.querySelector('.btn')?.classList.remove(CLASSES.active);

                        // CRITICO: Imposta gli stili del .children per renderlo nascosto
                        // Questo è necessario perché durante la ricerca potrebbero essere stati impostati
                        const children = item.querySelector(':scope > .children');
                        if (children) {
                            children.style.maxHeight = '0px';
                            children.style.opacity = '0';
                        }
                    }

                    const badgeState = badgeStates[phase];
                    const existingBadge = item.querySelector('.phase-badge');

                    if (badgeState && badgeState.visible) {
                        if (existingBadge) {
                            existingBadge.style.display = '';
                            existingBadge.textContent = badgeState.text;
                        }
                    } else if (existingBadge) {
                        existingBadge.remove();
                    }
                });
            }

            refreshAllVLinesDebounced();
            window.SidebarAutoGrow?.schedule();
        });

        window.addEventListener('tm:reset', () => {
            localStorage.removeItem('tm:search:open-phases');

            // Pulisci contesto ricerca globale
            window.__lastSearchContext = null;

            // Cancella hover timeout pendente
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }

            document.querySelectorAll('.sidebar .phase-badge, .sidebar .search-badge').forEach(badge => {
                badge.remove();
            });

            localStorage.removeItem(MEM.pathKey);
            localStorage.removeItem(MEM.pathSlash);
            localStorage.removeItem(MEM.preSearchSlash);
            localStorage.removeItem(MEM.searchTempSlash);

            Object.keys(phaseMemory).forEach(k => {
                phaseMemory[k].activePathSlash = null;
                phaseMemory[k].expanded.clear();
            });

            const sidebarEl = document.getElementById('sidebar');
            sidebarEl?.classList.remove(CLASSES.searchMode);
            QueryHelpers.clearSearchMarks(document);

            // Chiudi le fasi aperte CON ANIMAZIONE SEQUENZIALE (come Collapse All)
            const openItems = Array.from(document.querySelectorAll('.nav-item.open'));
            const childrenToAnimate = [];

            openItems.forEach(item => {
                item.querySelector('.btn')?.classList.remove(CLASSES.active);
                const children = item.querySelector(':scope > .children');
                if (children) {
                    childrenToAnimate.push({item, children});
                } else {
                    item.classList.remove(CLASSES.open);
                }
            });

            // Reset altri stati PRIMA delle animazioni (evita interferenze)
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove(CLASSES.hasActivePath);
                item.style.removeProperty('display');
            });

            clearPathHighlight();

            // Raccogli nested da animare PRIMA di iniziare
            const nestedToAnimate = Array.from(document.querySelectorAll('.children-nested'));

            // Anima in batch: nested e fasi si chiudono contemporaneamente
            animateCloseAllBatch(nestedToAnimate, childrenToAnimate, () => {
                if (hoverPane) {
                    hoverPane.classList.remove(CLASSES.searchMode, CLASSES.active);
                    hoverPane.querySelectorAll('.folder-leaf, .leaf, .section-title')
                        .forEach(el => el.classList.remove(CLASSES.inActivePath, CLASSES.active, CLASSES.searchHit));
                    hoverPane.querySelectorAll(SELECTORS.containers)
                        .forEach(n => n.classList.remove(CLASSES.hasActivePath));
                    hideHoverPane();
                }

                refreshAllVLinesDebounced();
                window.SidebarAutoGrow?.schedule();
            });
        });

        window.addEventListener('tm:show:all', (ev) => {
            const sb = document.getElementById('sidebar');
            const inSearch = sb && sb.classList.contains(CLASSES.searchMode);

            if (inSearch) {
                const lastCtx = window.__lastSearchContext;
                if (!lastCtx || !lastCtx.hasQuery || !lastCtx.paths) return;

                ev.stopImmediatePropagation();

                const isCollapsed = sb && sb.classList.contains(CLASSES.collapsed);

                // Identifica tutte le fasi con risultati
                const phasesWithResults = new Set();
                lastCtx.paths.forEach(arr => {
                    if (arr && arr.length > 0) phasesWithResults.add(arr[0]);
                });

                // Salva lo stato delle fasi da aprire (sia collapsed che aperta)
                const openPhases = Array.from(phasesWithResults);
                if (openPhases.length > 0) {
                    localStorage.setItem('tm:search:open-phases', JSON.stringify(openPhases));
                }

                // Dispatch scope con TUTTI i tool trovati nella ricerca
                const allToolIds = lastCtx.foundToolIds || [];

                window.dispatchEvent(new CustomEvent('tm:search:filter:all', {
                    detail: {
                        context: lastCtx,
                        allPaths: lastCtx.paths,
                        allToolIds: allToolIds,
                        showAll: true
                    }
                }));

                window.dispatchEvent(new CustomEvent('tm:scope:set', {
                    detail: {
                        ids: allToolIds,
                        pathKey: 'search:all-expanded',
                        all: false,
                        source: 'search-show-all'
                    }
                }));

                // Se la sidebar è COLLAPSED, NON espanderla - salva solo lo stato
                if (isCollapsed) {
                    return;
                }

                // Controlla se le fasi sono già tutte aperte
                const currentlyOpenPhases = new Set(
                    Array.from(document.querySelectorAll('.nav-item.open'))
                        .map(item => item.dataset.phase)
                        .filter(Boolean)
                );

                // Se tutte le fasi con risultati sono già aperte, salta chiusura/apertura
                const allAlreadyOpen = Array.from(phasesWithResults).every(phase =>
                    currentlyOpenPhases.has(phase)
                );

                if (allAlreadyOpen && phasesWithResults.size === currentlyOpenPhases.size) {
                    // Le fasi sono già tutte aperte - aggiorna solo i badge
                    phasesWithResults.forEach(phaseKey => {
                        const item = getNavItem(phaseKey);
                        if (!item) return;

                        const phaseBtn = item.querySelector('.btn');
                        if (phaseBtn) {
                            phaseBtn.querySelectorAll('.phase-badge, .search-badge').forEach(b => b.remove());

                            const count = lastCtx.countsByPhase[phaseKey] || 0;
                            if (count > 0) {
                                const badge = document.createElement('span');
                                badge.className = 'search-badge';
                                badge.textContent = String(count);
                                badge.setAttribute('aria-label', `${count} risultati`);

                                const chev = phaseBtn.querySelector('.chev');
                                if (chev) phaseBtn.insertBefore(badge, chev);
                                else phaseBtn.appendChild(badge);
                            }
                        }
                    });

                    refreshAllVLinesDebounced();
                    window.SidebarAutoGrow?.schedule();
                    return;
                }

                // Se la sidebar è APERTA, espandi tutte le fasi
                // Chiudi tutte le fasi prima
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove(CLASSES.open);
                    item.querySelector('.btn')?.classList.remove(CLASSES.active);
                    item.style.removeProperty('display');
                });

                // Rimuovi tutti i nested children
                document.querySelectorAll('.children-nested').forEach(n => n.remove());

                // Apri tutte le fasi con risultati
                phasesWithResults.forEach(phaseKey => {
                    const item = getNavItem(phaseKey);
                    if (!item) return;

                    item.classList.add(CLASSES.open);
                    item.querySelector('.btn')?.classList.add(CLASSES.active);

                    const phasePaths = lastCtx.paths.filter(arr => arr && arr[0] === phaseKey);

                    // Espandi i path
                    for (const arr of phasePaths) {
                        const slash = arr.join('/');
                        expandAncestorsWithHits(item, slash, arr);
                    }

                    // Applica le classi di search
                    for (const arr of phasePaths) {
                        const fullPath = arr.join('/');
                        const terminalNode = item.querySelector(
                            `.folder-leaf[data-path="${fullPath}"], .leaf[data-path="${fullPath}"]`
                        );
                        if (terminalNode) {
                            terminalNode.classList.add(CLASSES.searchHit);
                        }

                        const parts = [];
                        for (let i = 0; i < arr.length - 1; i++) {
                            parts.push(arr[i]);
                            const partial = parts.join('/');
                            const node = item.querySelector(
                                `.folder-leaf[data-path="${partial}"], .leaf[data-path="${partial}"]`
                            );
                            if (node) {
                                node.classList.add(CLASSES.searchIntermediate);
                            }
                        }
                    }

                    updateSearchContainersVLines(item);

                    // Aggiungi i badge per ogni fase
                    const phaseBtn = item.querySelector('.btn');
                    if (phaseBtn) {
                        phaseBtn.querySelectorAll('.phase-badge, .search-badge').forEach(b => b.remove());

                        const count = lastCtx.countsByPhase[phaseKey] || 0;
                        if (count > 0) {
                            const badge = document.createElement('span');
                            badge.className = 'search-badge';
                            badge.textContent = String(count);
                            badge.setAttribute('aria-label', `${count} risultati`);

                            const chev = phaseBtn.querySelector('.chev');
                            if (chev) phaseBtn.insertBefore(badge, chev);
                            else phaseBtn.appendChild(badge);
                        }
                    }
                });

                refreshAllVLinesDebounced();
                window.SidebarAutoGrow?.schedule();

                return;
            }

            // MODALITÀ NORMALE - Show All
            localStorage.removeItem('tm:scope:showAll');

            // Rimuovi TUTTI i badge nella sidebar
            document.querySelectorAll('.sidebar .phase-badge').forEach(badge => {
                badge.remove();
            });
        }, true);
    })();

    // BOOTSTRAP
    window.addEventListener('tm:scope:set', (ev) => {
        const detail = ev.detail || {};
        if (detail.all) {
            clearPathHighlight();
            localStorage.removeItem(MEM.pathKey);
            localStorage.removeItem(MEM.pathSlash);

            // La chiusura animata è gestita da tm:sidebar:closeAll
            // phaseMemory NON viene resettata qui - solo Reset la resetta
            return;
        }

        const __sb = document.getElementById('sidebar');
        if (__sb && __sb.classList.contains(CLASSES.searchMode)) {
            // Se siamo in search mode e non ci sono risultati, chiudi tutte le fasi
            const ids = detail.ids;
            if (ids && Array.isArray(ids) && ids.length === 0) {
                document.querySelectorAll('.nav-item.open').forEach(item => {
                    item.classList.remove(CLASSES.open);
                    const btn = item.querySelector('.btn');
                    if (btn) btn.classList.remove(CLASSES.active);
                });
            }
            return;
        }

        const key = detail.pathKey;
        if (!key || typeof key !== 'string') return;

        let slash = key.replace(/>/g, '/').replace(/^Root\//, '');
        const parts = slash.split('/').filter(Boolean);
        const phaseKey = parts[0];
        if (!phaseKey) return;

        localStorage.setItem(MEM.pathKey, key);
        localStorage.setItem(MEM.pathSlash, slash);

        const navItem = getNavItem(phaseKey);
        const sidebarEl = document.getElementById('sidebar');
        const isCollapsed = !!(sidebarEl && sidebarEl.classList.contains(CLASSES.collapsed));

        if (navItem) {
            if (!isCollapsed && !navItem.classList.contains(CLASSES.open)) {
                navItem.classList.add(CLASSES.open);
                navItem.querySelector('.btn')?.classList.add(CLASSES.active);
            }

            const fromSidebar = detail && detail.source === 'sidebar';
            if (!isCollapsed && !fromSidebar) {
                const pane = navItem;
                let acc = [];
                for (const p of parts) {
                    acc.push(p);
                    ensureExpandedInContainer(pane, acc.join('/'));
                }
            }

            setActivePathSlash(phaseKey, slash);
            highlightActivePath(phaseKey);

            if (navItem && !isCollapsed) {
                if (!fromSidebar) {
                    expandAndHighlightPath(navItem, slash, phaseKey);
                } else {
                    QueryHelpers.clearActive(navItem);
                    const activeEl = navItem.querySelector(`.folder-leaf[data-path="${slash}"], .leaf[data-path="${slash}"]`);
                    if (activeEl) activeEl.classList.add(CLASSES.active);
                }
                if (typeof refreshAllVLinesDebounced === 'function') refreshAllVLinesDebounced(navItem);
                window.SidebarAutoGrow?.schedule();
            }

            try {
                if (isCollapsed && hoverPane && document.body.contains(hoverPane)) {
                    clearTimeout(hoverTimeout);

                    const currentPhase = phaseKey;
                    const currentPath = slash;

                    if (!currentPhase || !currentPath) {
                    } else if (hoverPane.dataset.phase !== currentPhase) {
                        const btn = document.querySelector(`.nav-item[data-phase="${currentPhase}"] > .btn`);
                        const phaseData = (typeof taxonomy !== 'undefined') ? taxonomy[currentPhase] : null;

                        if (btn && phaseData && hasChildrenNode(phaseData) && typeof showHoverPaneForNode === 'function') {
                            showHoverPaneForNode(btn, phaseData, currentPhase);
                            requestAnimationFrame(() => {
                                highlightPathInContainer(hoverPane, currentPath);
                                QueryHelpers.clearActive(hoverPane);
                                const activeLeaf = hoverPane.querySelector(`.folder-leaf[data-path="${currentPath}"], .leaf[data-path="${currentPath}"]`);
                                if (activeLeaf) activeLeaf.classList.add(CLASSES.active);
                                if (typeof refreshAllVLinesDebounced === 'function') {
                                    refreshAllVLinesDebounced(hoverPane);
                                }
                            });
                        }
                    } else {
                        hoverPane.querySelectorAll('.folder-leaf, .leaf, .section-title')
                            .forEach(el => el.classList.remove(CLASSES.inActivePath, CLASSES.active));
                        hoverPane.querySelectorAll(SELECTORS.containers)
                            .forEach(n => n.classList.remove(CLASSES.hasActivePath));

                        forceReflow(hoverPane);

                        highlightPathInContainer(hoverPane, currentPath);
                        if (typeof expandFromMemoryInContainer === 'function') {
                            expandFromMemoryInContainer(hoverPane, currentPhase);
                        }

                        const activeLeaf = hoverPane.querySelector(`.folder-leaf[data-path="${currentPath}"], .leaf[data-path="${currentPath}"]`);
                        if (activeLeaf) activeLeaf.classList.add(CLASSES.active);

                        requestAnimationFrame(() => {
                            if (typeof refreshAllVLinesDebounced === 'function') {
                                refreshAllVLinesDebounced(hoverPane);
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn('[hover-sync] errore nel sync hover pane:', e);
            }

            document.querySelectorAll('.nav-item').forEach(i => {
                if (i.dataset.phase !== phaseKey) {
                    const otherPhaseKey = i.dataset.phase;
                    const otherActive = getActivePathSlash(otherPhaseKey);

                    if (otherActive && typeof otherActive === 'string') {
                        i.classList.add(CLASSES.hasActivePath);

                        const otherParts = otherActive.split('/');
                        for (let j = 1; j <= otherParts.length; j++) {
                            const partial = otherParts.slice(0, j).join('/');
                            const node = i.querySelector(`.folder-leaf[data-path="${partial}"]`);
                            if (node && !node.classList.contains(CLASSES.inActivePath)) {
                                node.classList.add(CLASSES.inActivePath);
                            }
                        }

                        QueryHelpers.clearActive(i);

                        i.querySelectorAll('.children-nested').forEach(n => {
                            if (n.querySelector(`.folder-leaf.${CLASSES.inActivePath}`)) {
                                n.classList.add(CLASSES.hasActivePath);
                            }
                        });
                    }
                }
            });
            if (!isCollapsed) requestAnimationFrame(() => refreshAllVLinesDebounced(navItem));
        }
    });

    function setCollapsed(v) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle(CLASSES.collapsed, v);
        localStorage.setItem(MEM.collapsed, v ? '1' : '0');
        window.dispatchEvent(new CustomEvent('tm:sidebar:toggle', {detail: {collapsed: v}}));
    }

    function getCollapsed() {
        return localStorage.getItem(MEM.collapsed) === '1';
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.taxonomy = taxonomy;
        precomputeIconMap();
        buildNav();
        attachSidebarControls();

        setCollapsed(getCollapsed());

        const lastSlash = localStorage.getItem(MEM.pathSlash);
        if (lastSlash) {
            const phaseKey = lastSlash.split('/')[0];
            setActivePathSlash(phaseKey, lastSlash);
            highlightActivePath(phaseKey);
            dispatchScopeAndPhase(lastSlash);
        }
    });

    // Variabile per tracciare ultima fase con badge attivo
    let lastBadgePhase = null;

    // PHASE TOOL COUNT BADGE
    (function PhaseBadgeModule() {
        function isSidebarOpen() {
            const sb = document.getElementById('sidebar');
            return !!sb && !sb.classList.contains(CLASSES.collapsed);
        }

        function removeBadges(phaseKey, badgeClass) {
            const phaseSelector = phaseKey ? `.nav-item[data-phase="${phaseKey}"]` : '.nav-item';
            const badgeSelector = badgeClass ? `.${badgeClass}` : '.phase-badge, .search-badge';
            document.querySelectorAll(`${phaseSelector} .btn ${badgeSelector}`).forEach(n => n.remove());
        }

        function setBadge(btn, badgeClass, value, phaseChanged = false) {
            if (!btn) return;

            const existing = btn.querySelector(`.${badgeClass}`);

            if (!value) {
                if (existing) {
                    existing.style.animation = 'badgePopIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
                    setTimeout(() => existing.remove(), 300);
                }
                return;
            }

            if (existing) {
                // Numero diverso: anima il cambio
                if (existing.textContent !== String(value)) {
                    // PULSE solo se è cambiata la fase
                    if (phaseChanged) {
                        existing.classList.add('updating');
                    }

                    // Counter animation (sempre)
                    const start = parseInt(existing.textContent) || 0;
                    const end = parseInt(value) || 0;
                    const duration = 400;
                    const startTime = performance.now();

                    const animate = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);

                        // Easing function
                        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
                        const current = Math.round(start + (end - start) * easeOutCubic);

                        existing.textContent = String(current);

                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        } else {
                            existing.textContent = String(end);
                            if (phaseChanged) {
                                setTimeout(() => existing.classList.remove('updating'), 100);
                            }
                        }
                    };

                    requestAnimationFrame(animate);
                }
                return;
            }

            // Crea nuovo badge (prima apparizione)
            const badge = document.createElement('span');
            badge.className = badgeClass;
            badge.setAttribute('aria-label', `${value} risultati`);
            badge.textContent = String(value);

            const chev = btn.querySelector('.chev');
            if (chev) btn.insertBefore(badge, chev);
            else btn.appendChild(badge);
        }

        function updateBadge(phaseKey, count) {
            if (!isSidebarOpen()) {
                const inSearch = isSearchMode();
                removeBadges(null, inSearch ? 'phase-badge' : null);
                lastBadgePhase = null;
                return;
            }

            document.querySelectorAll('.nav-item .btn .phase-badge').forEach(b => {
                const owner = b.closest('.nav-item');
                if (!owner || owner.dataset.phase !== phaseKey) b.remove();
            });

            const navItem = getNavItem(phaseKey);
            if (!navItem) return;
            if (!navItem.classList.contains(CLASSES.hasActivePath)) {
                const inSearch = isSearchMode();
                removeBadges(phaseKey, inSearch ? 'phase-badge' : null);
                lastBadgePhase = null;
                return;
            }

            const btn = navItem.querySelector('.btn');
            if (!btn) return;

            // Determina se è cambiata la fase
            const phaseChanged = lastBadgePhase !== phaseKey;
            lastBadgePhase = phaseKey;

            setBadge(btn, 'phase-badge', count, phaseChanged);
        }

        window.addEventListener('tm:context:summary', (ev) => {
            const d = ev.detail || {};
            const scopeAll = !!d.scopeAll;
            const pathKey = d.pathKey || '';
            const count = Number(d.toolsCount || 0);

            if (!isSidebarOpen() || scopeAll || !pathKey) {
                const inSearch = isSearchMode();
                // Non rimuovere i badge se siamo in una fase aperta
                const hasOpenPhases = document.querySelectorAll('.nav-item.open').length > 0;
                if (!hasOpenPhases || scopeAll) {
                    removeBadges(null, inSearch ? 'phase-badge' : null);
                }
                return;
            }

            const parts = String(pathKey).split('>');
            const phaseKey = parts.length >= 2 ? parts[1] : null;
            if (!phaseKey) {
                const inSearch = isSearchMode();
                removeBadges(null, inSearch ? 'phase-badge' : null);
                return;
            }

            updateBadge(phaseKey, count);
        });

        window.addEventListener('tm:sidebar:toggle', (ev) => {
            if (ev.detail?.collapsed) {
                removeBadges();
                lastBadgePhase = null;
            }
        });
        window.addEventListener('tm:reset', () => {
            // Solo reset dello stato locale - la pulizia DOM è gestita dal handler principale
            removeBadges();
            lastBadgePhase = null;
        });
        window.addEventListener('tm:search:set', (ev) => {
            const hasQuery = !!(ev.detail && ev.detail.hasQuery);
            // Durante la ricerca, rimuovi SOLO i phase-badge (i search-badge sono gestiti da applySearchGhost)
            if (hasQuery) removeBadges(null, 'phase-badge');
        });
    })();
})();

// V-LINE CLAMP UTILITIES - Ottimizzato per performance
// Evita getClientRects() che causa reflow costosi
function isVisible(el) {
    if (!el) return false;
    // offsetParent è null per elementi hidden/display:none - molto più veloce di getClientRects
    return el.offsetParent !== null;
}

function getDirectNodes(container) {
    const sel = ':scope > .leaf, :scope > .folder-leaf, :scope > .section-title';
    const list = (container || document).querySelectorAll(sel);
    const out = [];
    for (let i = 0; i < list.length; i++) {
        const el = list[i];
        // Controllo veloce: se ha offsetParent è visibile
        if (el.offsetParent !== null) out.push(el);
    }
    return out;
}

// Cache per valori CSS che non cambiano frequentemente
const ELBOW_DEFAULTS = { top: 0, h: 12 };

function computeVLineEndPx(container) {
    const items = getDirectNodes(container);
    if (items.length === 0) return null;

    const last = items[items.length - 1];

    // Leggi offsetTop prima di getComputedStyle per batch reading
    const lastOffsetTop = last.offsetTop;
    const containerScrollHeight = container.scrollHeight;

    // getComputedStyle solo se necessario
    const csLast = getComputedStyle(last);
    const elbowTop = parseFloat(csLast.getPropertyValue('--elbow-top')) || ELBOW_DEFAULTS.top;
    const elbowH = parseFloat(csLast.getPropertyValue('--elbow-h')) || ELBOW_DEFAULTS.h;

    let endY = lastOffsetTop + elbowTop + (elbowH / 2);

    // Usa valore default per paddingBottom se possibile (solitamente 0)
    const csCont = getComputedStyle(container);
    const padB = parseFloat(csCont.paddingBottom) || 0;
    const extraBottom = Math.round((elbowH * 0.8) + (padB * 0.5) + 6);

    endY = Math.max(0, Math.min(endY, containerScrollHeight));
    endY = Math.max(0, endY - extraBottom);

    // Aggiorna classe is-last solo se cambiata
    if (!last.classList.contains('is-last')) {
        items.forEach(el => el.classList.remove('is-last'));
        last.classList.add('is-last');
    }

    return Math.round(endY);
}

function setVLine(container) {
    if (!container) return;
    const endPx = computeVLineEndPx(container);
    if (endPx == null) container.style.removeProperty('--vline-end');
    else container.style.setProperty('--vline-end', endPx + 'px');
}

function refreshAllVLines(root = document) {
    root = normalizeRoot(root);
    const all = root.querySelectorAll('.children, .children-nested');

    // OTTIMIZZAZIONE: Usa DocumentFragment per batch DOM reads
    // Leggi tutte le dimensioni prima di scrivere (evita layout thrashing)
    const updates = [];

    for (let i = 0; i < all.length; i++) {
        const container = all[i];
        // Se il container non è visibile (offsetParent null), salta
        if (container.offsetParent === null) continue;

        // OTTIMIZZAZIONE: Salta container vuoti o con altezza 0
        if (container.children.length === 0 || container.clientHeight === 0) continue;

        updates.push(container);
    }

    // Applica aggiornamenti in batch
    updates.forEach(container => setVLine(container));
}

function refreshAllVLinesDebounced(root = document) {
    root = normalizeRoot(root);
    // Cancella richieste pendenti per evitare aggiornamenti duplicati
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }

    rafId = requestAnimationFrame(() => {
        refreshAllVLines(root);
        rafId = null;
    });
}

function normalizeRoot(root) {
    if (!root) return document;
    if (typeof Event !== 'undefined' && root instanceof Event) return document;
    if (Array.isArray(root) || (typeof NodeList !== 'undefined' && root instanceof NodeList)) {
        root.forEach(el => refreshAllVLines(el));
        return document;
    }
    return (root && typeof root.querySelectorAll === 'function') ? root : document;
}

let rafId = null;

function initVLineClamp() {
    refreshAllVLines();
    window.addEventListener('resize', refreshAllVLinesDebounced);

    // Osserva solo la sidebar invece di document.body per ridurre mutazioni catturate
    // OTTIMIZZAZIONE: Throttle delle mutation con debounce più aggressivo
    const sidebar = document.getElementById('sidebar');
    let mutationDebounceTimer = null;
    const MUTATION_DEBOUNCE_MS = 150; // Throttle mutation observer calls

    const observer = new MutationObserver(() => {
        // Debounce aggressivo: salta chiamate frequenti durante animazioni
        if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
        mutationDebounceTimer = setTimeout(() => {
            refreshAllVLinesDebounced();
            mutationDebounceTimer = null;
        }, MUTATION_DEBOUNCE_MS);
    });

    observer.observe(sidebar || document.body, {
        childList: true,
        subtree: true,
        // OTTIMIZZAZIONE: Rimuovi 'attributes' - troppo aggressivo
        // Le vline verranno aggiornate dai trigger espliciti nel codice
    });

    // Throttled animation tracking - invece di ogni frame (16ms), ogni 100ms
    // Riduce chiamate da ~30 a ~5 per animazione
    let animTicker = null;
    let lastTickTime = 0;
    const TICK_THROTTLE_MS = 100;

    document.addEventListener('transitionstart', (e) => {
        if (!(e.target instanceof Element)) return;
        if (!e.target.closest('.children, .children-nested')) return;

        const start = performance.now();
        const tick = (t) => {
            // Throttle: aggiorna solo se passati almeno TICK_THROTTLE_MS
            if (t - lastTickTime >= TICK_THROTTLE_MS) {
                refreshAllVLines();
                lastTickTime = t;
            }
            if (t - start < TIMINGS.animationTracking) {
                animTicker = requestAnimationFrame(tick);
            } else {
                cancelAnimationFrame(animTicker);
                animTicker = null;
                refreshAllVLines(); // Refresh finale
            }
        };
        if (!animTicker) {
            lastTickTime = 0;
            animTicker = requestAnimationFrame(tick);
        }
    }, true);

    window.refreshAllVLines = refreshAllVLines;
    window.refreshAllVLinesDebounced = refreshAllVLinesDebounced;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVLineClamp);
} else {
    initVLineClamp();
}

// SIDEBAR AUTO-GROW
(() => {
    "use strict";

    const CFG = {
        base: 320,
        safety: 20,
        maxVW: 0.90,
        minPathWidth: 320,
        hoverMinWidth: 200,
        hoverBaseWidth: 320,
        textSelectors: ".btn .label, .folder-leaf > span:not(.node-icon), .leaf > span, .section-title > span"
    };

    const ready = (fn) => (document.readyState === "loading")
        ? document.addEventListener("DOMContentLoaded", fn)
        : fn();

    ready(() => {
        const sidebar = document.getElementById("sidebar");
        const nav = document.getElementById("nav");
        if (!sidebar || !nav) return;

        let lastApplied = null;
        const isCollapsed = () => sidebar.classList.contains("collapsed");
        const cap = () => Math.floor(window.innerWidth * CFG.maxVW);

        const leftNoTransform = (el) => {
            let x = 0, n = el;
            while (n && n !== sidebar) {
                x += n.offsetLeft || 0;
                n = n.offsetParent;
            }
            return x;
        };

        const leftInContainer = (el, container) => {
            let x = 0, n = el;
            while (n && n !== container) {
                x += n.offsetLeft || 0;
                n = n.offsetParent;
            }
            return x;
        };

        const isInOpenTree = (el) => {
            for (let p = el; p && p !== sidebar; p = p.parentElement) {
                if (p.classList.contains("children")) {
                    const item = p.closest(".nav-item");
                    if (!item || !item.classList.contains("open")) return false;
                }
                if (p.classList.contains("children-nested")) {
                    const style = getComputedStyle(p);
                    if (style.maxHeight === "0px") return false;
                }
            }
            return true;
        };

        const getPathWidth = (el) => {
            if (!el || !el.dataset || !el.dataset.path) return 0;
            const path = el.dataset.path;
            const parts = path.split("/");
            const depth = parts.length - 1;
            const gutter = 28;
            const indentation = depth * gutter;
            const span = el.querySelector(':scope > span:not(.node-icon)');
            const textWidth = span ? (span.scrollWidth || span.offsetWidth) : 0;
            const iconWidth = 16;
            const gap = 8;
            return indentation + iconWidth + gap + textWidth + CFG.safety;
        };

        const computeNeeded = () => {
            const hover = document.querySelector('.hover-pane.active');
            const useHover = isCollapsed() && hover;

            if (isCollapsed() && !hover) return null;

            const sourceRoot = useHover ? hover : nav;
            const sourceStyle = getComputedStyle(useHover ? hover : sidebar);
            const padL = parseFloat(sourceStyle.paddingLeft) || 0;
            const padR = parseFloat(sourceStyle.paddingRight) || 0;

            let needed = useHover ? CFG.hoverMinWidth : CFG.base;

            const labels = sourceRoot.querySelectorAll(CFG.textSelectors);

            for (const el of labels) {
                if (!el || !el.offsetParent) continue;

                const parent = el.closest(".folder-leaf, .leaf, .btn, .section-title");
                if (!parent) continue;

                const isFromHover = !!(hover && hover.contains(el));

                if (!isFromHover && !isInOpenTree(parent)) continue;

                if (parent.classList.contains("folder-leaf") || parent.classList.contains("leaf")) {
                    const pathWidth = getPathWidth(parent);
                    needed = Math.max(needed, pathWidth + padL + padR);
                }

                const left = isFromHover ? leftInContainer(el, hover) : leftNoTransform(el);
                const textWidth = el.scrollWidth || el.offsetWidth || 0;
                const requiredWidth = Math.ceil(left + textWidth + padR + CFG.safety);
                needed = Math.max(needed, requiredWidth);
            }

            const minWidth = useHover ? CFG.hoverMinWidth : CFG.minPathWidth;
            needed = Math.max(needed, minWidth);
            return Math.min(needed, cap());
        };

        const apply = () => {
            const target = computeNeeded();
            if (target == null) return;

            const hover = document.querySelector('.hover-pane.active');
            const key = (isCollapsed() && hover) ? 'hover' : 'sidebar';

            if (!apply._last) apply._last = {key: null, value: null};

            if (key === 'hover') {
                if (!hover) return;

                const current = Math.round(parseFloat(getComputedStyle(hover).width) || hover.offsetWidth || CFG.hoverBaseWidth);

                if (apply._last.key === 'hover' && Math.abs(apply._last.value - target) <= 2) return;
                if (Math.abs(current - target) <= 2) {
                    apply._last = {key, value: target};
                    return;
                }

                hover.style.width = target + 'px';
                apply._last = {key, value: target};

                requestAnimationFrame(() => {
                    if (typeof window.refreshAllVLines === "function") {
                        window.refreshAllVLines(hover);
                    }
                });
                return;
            }

            const current = Math.round(parseFloat(getComputedStyle(sidebar).width));
            if (apply._last.key === 'sidebar' && Math.abs(apply._last.value - target) <= 1) return;
            if (Math.abs(current - target) <= 1) {
                apply._last = {key, value: target};
                return;
            }

            sidebar.style.width = target + "px";
            apply._last = {key, value: target};

            if (typeof window.refreshAllVLinesDebounced === "function") window.refreshAllVLinesDebounced();
            else if (typeof window.refreshAllVLines === "function") window.refreshAllVLines();
        };

        // Throttle con debounce minimo per evitare chiamate troppo frequenti
        let ticking = false;
        let lastScheduleTime = 0;
        const SCHEDULE_MIN_INTERVAL = 50; // Minimo 50ms tra chiamate effettive

        const schedule = () => {
            if (ticking) return;

            const now = performance.now();
            if (now - lastScheduleTime < SCHEDULE_MIN_INTERVAL) return;

            ticking = true;
            lastScheduleTime = now;
            requestAnimationFrame(() => {
                ticking = false;
                const hoverActive = !!document.querySelector('.hover-pane.active');
                if (!isCollapsed() || hoverActive) apply();
            });
        };

        const reset = () => {
            sidebar.style.removeProperty("width");
            const hover = document.querySelector('.hover-pane');
            if (hover) hover.style.removeProperty("width");
            if (apply._last) apply._last = {key: null, value: null};
            lastApplied = null;
        };

        const onCollapseChange = () => {
            if (isCollapsed()) {
                const hover = document.querySelector('.hover-pane.active');
                if (!hover) {
                    reset();
                } else {
                    setTimeout(schedule, 0);
                }
            } else {
                setTimeout(schedule, TIMINGS.autoGrowInitial);
                setTimeout(schedule, TIMINGS.autoGrowMedium);
            }
        };

        const moNav = new MutationObserver(schedule);
        moNav.observe(nav, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "style", "data-open", "aria-expanded"]
        });

        const observeHoverPane = () => {
            const hover = document.querySelector('.hover-pane');
            if (hover && !hover.dataset.observed) {
                hover.dataset.observed = 'true';
                const moHover = new MutationObserver(schedule);
                moHover.observe(hover, {
                    subtree: true,
                    childList: true,
                    attributes: true,
                    attributeFilter: ["class", "style"]
                });

                const roHover = new ResizeObserver(schedule);
                roHover.observe(hover);
            }
        };

        const moBody = new MutationObserver(() => {
            const hover = document.querySelector('.hover-pane');
            if (hover && !hover.dataset.observed) {
                observeHoverPane();
            }
        });
        moBody.observe(document.body, {childList: true, subtree: false});

        window.addEventListener('tm:hover:show', () => {
            observeHoverPane();
            setTimeout(schedule, TIMINGS.autoGrowInitial);
            setTimeout(schedule, TIMINGS.searchApply);
            setTimeout(schedule, TIMINGS.hoverSetup);
        });

        const moSidebar = new MutationObserver(muts => {
            for (const m of muts) {
                if (m.type === "attributes" && m.attributeName === "class") {
                    onCollapseChange();
                    return;
                }
            }
            schedule();
        });
        moSidebar.observe(sidebar, {attributes: true, attributeFilter: ["class", "style"]});

        const ro = new ResizeObserver(schedule);
        ro.observe(sidebar);
        ro.observe(nav);

        nav.addEventListener("transitionend", e => {
            if (["max-height", "height", "opacity", "width"].includes(e.propertyName)) schedule();
        }, true);

        window.addEventListener("resize", schedule);

        setTimeout(schedule, TIMINGS.autoGrowInitial);
        setTimeout(schedule, TIMINGS.autoGrowLong);
        setTimeout(schedule, TIMINGS.autoGrowVeryLong);

        window.SidebarAutoGrow = {schedule, apply, computeNeeded, reset};
    });

    // ============================================================================
    // BADGE ON SIDEBAR OPEN (quando chiusa e riaperta)
    // ============================================================================

    (function setupSidebarOpenBadge() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        let badgeTimeout = null;

        // Monitora cambiamenti della classe "collapsed"
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const wasCollapsed = mutation.oldValue?.includes('collapsed');
                    const isCollapsed = sidebar.classList.contains('collapsed');

                    // Quando la sidebar viene APERTA (collapsed -> non collapsed)
                    if (wasCollapsed && !isCollapsed) {
                        clearTimeout(badgeTimeout);
                        badgeTimeout = setTimeout(() => {
                            addBadgeForActivePath();
                        }, 150);
                    }
                }
            });
        });

        observer.observe(sidebar, {
            attributes: true,
            attributeOldValue: true,
            attributeFilter: ['class']
        });

        function addBadgeForActivePath() {
            const sidebar = document.getElementById('sidebar');

            if (sidebar && sidebar.classList.contains('search-mode')) {
                return;
            }
            const savedPath = localStorage.getItem('tm:active:slash');
            const savedPathKey = localStorage.getItem('tm:active:path');

            // Se non c'è path salvato, non fare nulla
            if (!savedPath) {
                return;
            }

            // Se il pathKey salvato è "Root" (Show All), non mostrare badge
            if (savedPathKey === 'Root') {
                return;
            }

            const phase = savedPath.split('/')[0];

            const navItem = document.querySelector(`.nav-item[data-phase="${phase}"]`);
            if (!navItem) {
                return;
            }

            const btn = navItem.querySelector('.btn');
            if (!btn) {
                return;
            }

            // Rimuovi badge esistente se presente
            const existingBadge = btn.querySelector('.phase-badge');
            if (existingBadge) {
                return;
            }

            // Risolvi i tool IDs
            const tm = window.Toolmap || {};
            const root = (tm.registry && (tm.registry.name || tm.registry.title)) || 'Root';
            const suffix = savedPath.replace(/\//g, '>');
            const pathKey = `${root}>${suffix}`;

            let toolIds = null;
            if (tm.allToolsUnder && tm.allToolsUnder[pathKey]) {
                toolIds = Array.from(tm.allToolsUnder[pathKey]);
            }

            if (!toolIds || toolIds.length === 0) {
                return;
            }

            const toolCount = toolIds.length;

            // Ottieni il colore della fase
            const computedStyle = getComputedStyle(navItem);
            let phaseColor = computedStyle.getPropertyValue('--phase').trim();

            if (!phaseColor) {
                const PHASE_COLORS = {
                    '00_Common': 'hsl(270 91% 65%)',
                    '01_Information_Gathering': 'hsl(210 100% 62%)',
                    '02_Exploitation': 'hsl(4 85% 62%)',
                    '03_Post_Exploitation': 'hsl(32 98% 55%)',
                    '04_Miscellaneous': 'hsl(158 64% 52%)'
                };
                phaseColor = PHASE_COLORS[phase] || 'hsl(var(--accent))';
            }

            btn.style.setProperty('--phase', phaseColor);

            // Crea il badge
            const badge = document.createElement('span');
            badge.className = 'phase-badge';
            badge.textContent = String(toolCount);
            badge.setAttribute('aria-label', `${toolCount} tool${toolCount !== 1 ? 's' : ''}`);

            const chevron = btn.querySelector('.chev');
            if (chevron) {
                btn.insertBefore(badge, chevron);
            } else {
                btn.appendChild(badge);
            }
        }

        // Listener per rimuovere badge quando si clicca Show All
        window.addEventListener('tm:show:all', () => {
            // Rimuovi SOLO i badge nella sidebar, non nelle card
            document.querySelectorAll('.sidebar .phase-badge').forEach(badge => {
                badge.style.animation = 'badgePopIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
                setTimeout(() => badge.remove(), 300);
            });
            localStorage.setItem('tm:scope:showAll', '1');
        });

        // Listener per rimuovere badge quando si cambia scope
        window.addEventListener('tm:scope:set', (ev) => {
            const detail = ev.detail || {};

            if (detail.all || detail.pathKey === 'Root') {
                // Rimuovi SOLO i badge nella sidebar, non nelle card
                document.querySelectorAll('.sidebar .phase-badge').forEach(badge => {
                    badge.style.animation = 'badgePopIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
                    setTimeout(() => badge.remove(), 300);
                });
                localStorage.setItem('tm:scope:showAll', '1');
                localStorage.removeItem('tm:active:slash');
                localStorage.removeItem('tm:active:path');
            } else {
                localStorage.removeItem('tm:scope:showAll');
            }
        });
    })();

    // ============================================================================
    // LISTENER DIRETTO SUL PULSANTE "SHOW ALL"
    // ============================================================================
    document.addEventListener('DOMContentLoaded', function () {
        const showAllBtn = document.querySelector('.show-all-btn');

        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                // Pulisci i path salvati così il badge non si ricrea
                localStorage.removeItem('tm:active:slash');
                localStorage.removeItem('tm:active:path');
                localStorage.setItem('tm:scope:showAll', '1');

                // Rimuovi SOLO i badge nella sidebar, non nelle card
                document.querySelectorAll('.sidebar .phase-badge').forEach(badge => {
                    badge.style.animation = 'badgePopIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
                    setTimeout(() => badge.remove(), 300);
                });
            });
        }
    });
})();