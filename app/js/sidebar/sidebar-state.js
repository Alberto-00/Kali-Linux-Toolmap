/**
 * Sidebar State - Memory management, path resolution, nav item cache
 * Depends on: sidebar-constants.js
 */
(function () {
    'use strict';

    const {taxonomy, phaseToColor} = window.SidebarConstants;

    // Storage keys
    const MEM = {
        collapsed: 'tm:sidebar:collapsed',
        pathKey: 'tm:active:path',
        pathSlash: 'tm:active:slash'
    };

    // Per-phase memory (active path + expanded branches)
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

    function resetPhaseMemory() {
        Object.keys(phaseMemory).forEach(k => {
            phaseMemory[k].activePathSlash = null;
            phaseMemory[k].expanded.clear();
        });
    }

    // Resolve tool IDs from a slash-separated path
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

    function derivePhaseColor(phaseKey, ids) {
        const tById = (window.Toolmap && window.Toolmap.toolsById) || {};
        for (const id of ids) {
            const t = tById[id];
            if (t?.phaseColor) return t.phaseColor;
        }
        return phaseToColor(phaseKey);
    }

    // Nav item cache
    const navItemCache = new Map();

    function getNavItem(phaseKey) {
        if (!phaseKey) return null;

        if (navItemCache.has(phaseKey)) {
            const cached = navItemCache.get(phaseKey);
            if (cached && document.body.contains(cached)) {
                return cached;
            }
            navItemCache.delete(phaseKey);
        }

        const item = document.querySelector(`.nav-item[data-phase="${phaseKey}"]`);
        if (item) navItemCache.set(phaseKey, item);
        return item;
    }

    function clearNavItemCache() {
        navItemCache.clear();
    }

    function getOpenNavItems() {
        return Array.from(document.querySelectorAll('.nav-item.open'));
    }

    window.SidebarState = {
        MEM,
        phaseMemory,
        setActivePathSlash,
        getActivePathSlash,
        expandBranch,
        collapseSubtree,
        getExpandedPaths,
        resetPhaseMemory,
        resolveToolIdsForSlashPath,
        derivePhaseColor,
        getNavItem,
        clearNavItemCache,
        getOpenNavItems
    };
})();
