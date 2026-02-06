/**
 * Sidebar Auto-Grow - Dynamically adjusts sidebar width based on content
 * Depends on: sidebar-constants.js (TIMINGS)
 */
(() => {
    "use strict";

    const TIMINGS = window.SidebarConstants.TIMINGS;

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

        let ticking = false;
        let lastScheduleTime = 0;
        const SCHEDULE_MIN_INTERVAL = 50;

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

        const observers = [];

        const moNav = new MutationObserver(schedule);
        moNav.observe(nav, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "style", "data-open", "aria-expanded"]
        });
        observers.push(moNav);

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
                observers.push(moHover);

                const roHover = new ResizeObserver(schedule);
                roHover.observe(hover);
                observers.push(roHover);
            }
        };

        const moBody = new MutationObserver(() => {
            const hover = document.querySelector('.hover-pane');
            if (hover && !hover.dataset.observed) {
                observeHoverPane();
            }
        });
        moBody.observe(document.body, {childList: true, subtree: false});
        observers.push(moBody);

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
        observers.push(moSidebar);

        const ro = new ResizeObserver(schedule);
        ro.observe(sidebar);
        ro.observe(nav);
        observers.push(ro);

        nav.addEventListener("transitionend", e => {
            if (["max-height", "height", "opacity", "width"].includes(e.propertyName)) schedule();
        }, true);

        window.addEventListener("resize", schedule);

        setTimeout(schedule, TIMINGS.autoGrowInitial);
        setTimeout(schedule, TIMINGS.autoGrowLong);
        setTimeout(schedule, TIMINGS.autoGrowVeryLong);

        const cleanup = () => {
            observers.forEach(observer => {
                if (observer && typeof observer.disconnect === 'function') {
                    observer.disconnect();
                }
            });
            observers.length = 0;
        };

        window.SidebarAutoGrow = {schedule, apply, computeNeeded, reset, cleanup};

        window.addEventListener('beforeunload', cleanup);
    });
})();
