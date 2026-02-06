/**
 * Sidebar Icons - SVG icons, ICONS registry, ICON_MAP precomputation
 * Depends on: sidebar-constants.js
 */
(function () {
    'use strict';

    const {taxonomy, hasChildrenNode} = window.SidebarConstants;

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
    ICONS.byPrefix['01_Information_Gathering'] = {open: svg_inf_gather, closed: svg_inf_gather, terminal: svg_inf_gather};
    ICONS.byPrefix['02_Exploitation'] = {open: svg_exploit, closed: svg_exploit, terminal: svg_exploit};
    ICONS.byPrefix['03_Post_Exploitation'] = {open: svg_post_exploit, closed: svg_post_exploit, terminal: svg_post_exploit};
    ICONS.byPrefix['04_Red_Team'] = {open: svg_redteam, closed: svg_redteam, terminal: svg_redteam};
    ICONS.byPrefix['05_Forensics'] = {open: svg_forensics, closed: svg_forensics, terminal: svg_forensics};

    // Exposed globally for renderer.js
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
            const parts = path.split('/');
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
        (function walk(node, base) {
            for (const [k, sub] of Object.entries(node)) {
                const path = base ? `${base}/${k}` : k;
                const kids = hasChildrenNode(sub);
                ICON_MAP.set(path, getIconStatic(path, kids));
                walk(sub, path);
            }
        })(taxonomy, '');
    }

    window.SidebarIcons = {
        ICONS,
        ICON_MAP,
        chevronSVG,
        folderSVG,
        precomputeIconMap
    };
})();
