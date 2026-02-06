/**
 * Sidebar V-Line Clamp Utilities
 * Calculates and updates vertical tree lines for the sidebar navigation
 * Depends on: sidebar-constants.js (TIMINGS)
 */
(function () {
    'use strict';

    const TIMINGS = window.SidebarConstants.TIMINGS;

    function isVisible(el) {
        if (!el) return false;
        return el.offsetParent !== null;
    }

    function getDirectNodes(container) {
        const sel = ':scope > .leaf, :scope > .folder-leaf, :scope > .section-title';
        const list = (container || document).querySelectorAll(sel);
        const out = [];
        for (let i = 0; i < list.length; i++) {
            const el = list[i];
            if (el.offsetParent !== null) out.push(el);
        }
        return out;
    }

    const ELBOW_DEFAULTS = {top: 0, h: 12};

    function computeVLineEndPx(container) {
        const items = getDirectNodes(container);
        if (items.length === 0) return null;

        const last = items[items.length - 1];

        const lastOffsetTop = last.offsetTop;
        const containerScrollHeight = container.scrollHeight;

        const csLast = getComputedStyle(last);
        const elbowTop = parseFloat(csLast.getPropertyValue('--elbow-top')) || ELBOW_DEFAULTS.top;
        const elbowH = parseFloat(csLast.getPropertyValue('--elbow-h')) || ELBOW_DEFAULTS.h;

        let endY = lastOffsetTop + elbowTop + (elbowH / 2);

        const csCont = getComputedStyle(container);
        const padB = parseFloat(csCont.paddingBottom) || 0;
        const extraBottom = Math.round((elbowH * 0.8) + (padB * 0.5) + 6);

        endY = Math.max(0, Math.min(endY, containerScrollHeight));
        endY = Math.max(0, endY - extraBottom);

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

    function refreshAllVLines(root) {
        root = normalizeRoot(root);
        const all = root.querySelectorAll('.children, .children-nested');

        const updates = [];

        for (let i = 0; i < all.length; i++) {
            const container = all[i];
            if (container.offsetParent === null) continue;
            if (container.children.length === 0 || container.clientHeight === 0) continue;
            updates.push(container);
        }

        updates.forEach(container => setVLine(container));
    }

    function refreshAllVLinesDebounced(root) {
        root = normalizeRoot(root);
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        rafId = requestAnimationFrame(() => {
            refreshAllVLines(root);
            rafId = null;
        });
    }

    function initVLineClamp() {
        refreshAllVLines();
        window.addEventListener('resize', refreshAllVLinesDebounced);

        const sidebar = document.getElementById('sidebar');
        let mutationDebounceTimer = null;
        const MUTATION_DEBOUNCE_MS = 150;

        const observer = new MutationObserver(() => {
            if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
            mutationDebounceTimer = setTimeout(() => {
                refreshAllVLinesDebounced();
                mutationDebounceTimer = null;
            }, MUTATION_DEBOUNCE_MS);
        });

        observer.observe(sidebar || document.body, {
            childList: true,
            subtree: true,
        });

        let animTicker = null;
        let lastTickTime = 0;
        const TICK_THROTTLE_MS = 100;

        document.addEventListener('transitionstart', (e) => {
            if (!(e.target instanceof Element)) return;
            if (!e.target.closest('.children, .children-nested')) return;

            const start = performance.now();
            const tick = (t) => {
                if (t - lastTickTime >= TICK_THROTTLE_MS) {
                    refreshAllVLines();
                    lastTickTime = t;
                }
                if (t - start < TIMINGS.animationTracking) {
                    animTicker = requestAnimationFrame(tick);
                } else {
                    cancelAnimationFrame(animTicker);
                    animTicker = null;
                    refreshAllVLines();
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

    window.SidebarVLines = {
        refreshAllVLines,
        refreshAllVLinesDebounced
    };
})();
