/**
 * Sidebar Hover Pane - Floating panel shown when sidebar is collapsed
 * Depends on: sidebar-constants.js, sidebar-icons.js, sidebar-state.js, sidebar-dom.js
 */
(function () {
    'use strict';

    const {CLASSES, taxonomy, formatLabel, hasChildrenNode, getPhaseFromPath, getNodeByPath, isSearchMode, forceReflow, splitPath, TIMINGS} = window.SidebarConstants;
    const {ICON_MAP, ICONS} = window.SidebarIcons;
    const {getActivePathSlash, setActivePathSlash, expandBranch, collapseSubtree, getNavItem} = window.SidebarState;
    const {buildChildren, markLastVisible, applyPhaseThemeToPane, highlightPathInContainer, highlightActivePath, clearPathHighlight, ensureExpandedInContainer, expandFromMemoryInContainer, animateNested, createNestedContainer, dispatchScopeAndPhase} = window.SidebarDOM;

    /**
     * Sincronizza la classe has-active-path sull'header dell'hover pane.
     * Controlla se esiste almeno un folder-leaf/leaf con in-active-path
     * dentro il pane, e aggiorna l'header di conseguenza.
     */
    function syncHeaderActivePath(pane) {
        if (!pane) return;
        const header = pane.querySelector('.hover-pane-header');
        if (!header) return;
        const hasActive = !!pane.querySelector(`.folder-leaf.${CLASSES.inActivePath}, .leaf.${CLASSES.inActivePath}, .folder-leaf.${CLASSES.active}, .leaf.${CLASSES.active}`);
        header.classList.toggle(CLASSES.hasActivePath, hasActive);
    }

    let hoverPane = null;
    let currentHoverButton = null;

    // Per-element hover timeouts using WeakMap
    const hoverTimeouts = new WeakMap();

    function clearHoverTimeout(element) {
        const timeout = hoverTimeouts.get(element);
        if (timeout) {
            clearTimeout(timeout);
            hoverTimeouts.delete(element);
        }
    }

    function setHoverTimeout(element, callback, delay) {
        clearHoverTimeout(element);
        const timeout = setTimeout(() => {
            hoverTimeouts.delete(element);
            callback();
        }, delay);
        hoverTimeouts.set(element, timeout);
    }

    function createHoverPane() {
        if (!hoverPane) {
            hoverPane = document.createElement('div');
            hoverPane.className = 'hover-pane';
            document.body.appendChild(hoverPane);

            hoverPane.addEventListener('mouseenter', () => {
                if (currentHoverButton) clearHoverTimeout(currentHoverButton);
            });
            hoverPane.addEventListener('mouseleave', () => {
                if (currentHoverButton) {
                    setHoverTimeout(currentHoverButton, () => hideHoverPane(), TIMINGS.hoverDelay);
                }
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

                forceReflow(hoverPane);

                if (!inSearch) {
                    highlightPathInContainer(hoverPane, pathSlash);
                    leaf.classList.add(CLASSES.active);
                } else {
                    hoverPane.classList.add(CLASSES.searchMode);
                }

                highlightActivePath(phaseKey);
                syncHeaderActivePath(hoverPane);

                requestAnimationFrame(() => {
                    if (typeof window.refreshAllVLines === 'function') window.refreshAllVLines(hoverPane);
                });

                if (hasKids) {
                    const next = leaf.nextElementSibling;
                    const isOpen = !!(next && next.classList.contains('children-nested') && next.dataset.parent === pathSlash);

                    if (isOpen) {
                        animateNested(next, false, () => {
                            markLastVisible(leaf.parentElement);
                            collapseSubtree(phaseKey, pathSlash);
                            if (typeof window.refreshAllVLinesDebounced === 'function') window.refreshAllVLinesDebounced(hoverPane);
                            window.SidebarAutoGrow?.schedule();
                            const cur = getActivePathSlash(phaseKey);
                            highlightPathInContainer(hoverPane, null);
                            forceReflow(hoverPane);
                            highlightPathInContainer(hoverPane, cur);
                            highlightActivePath(phaseKey);
                            syncHeaderActivePath(hoverPane);
                        });
                        return;
                    }

                    const nest = createNestedContainer(pathSlash, node, true);
                    leaf.after(nest);

                    // Applica filtro installed ai nuovi figli
                    if (window.applyInstalledFilterToHoverPane) {
                        window.applyInstalledFilterToHoverPane();
                    }

                    markLastVisible(leaf.parentElement);
                    markLastVisible(nest);

                    animateNested(nest, true, () => {
                        expandBranch(phaseKey, pathSlash);
                        if (typeof window.refreshAllVLinesDebounced === 'function') window.refreshAllVLinesDebounced(hoverPane);
                        window.SidebarAutoGrow?.schedule();
                        const cur = getActivePathSlash(phaseKey);
                        highlightPathInContainer(hoverPane, null);
                        forceReflow(hoverPane);
                        highlightPathInContainer(hoverPane, cur);
                        highlightActivePath(phaseKey);
                        syncHeaderActivePath(hoverPane);
                    });
                } else {
                    if (typeof window.refreshAllVLinesDebounced === 'function') window.refreshAllVLinesDebounced(hoverPane);
                    window.SidebarAutoGrow?.schedule();
                    const cur = getActivePathSlash(phaseKey);
                    highlightPathInContainer(hoverPane, null);
                    forceReflow(hoverPane);
                    highlightPathInContainer(hoverPane, cur);
                    highlightActivePath(phaseKey);
                    syncHeaderActivePath(hoverPane);
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
        currentHoverButton = element;
        ensureHoverPaneStyles();
        const pane = createHoverPane();

        const phaseKey = path.includes('/') ? path.split('/')[0] : path;
        const isChangingPhase = pane.dataset.phase && pane.dataset.phase !== phaseKey;

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

        pane.innerHTML = `
          <div class="hover-pane-header${hasActivePath ? ' has-active-path' : ''}">
            <span class="hover-pane-icon">${phaseIcon}</span>
            <span class="hover-pane-title">${formatLabel(phaseKey)}</span>
          </div>
          <div class="children children-nested hover-root" data-parent="${phaseKey}" style="--level: 1">
            ${childrenHTML}
          </div>
        `;
        pane.dataset.phase = phaseKey;
        pane.style.removeProperty('opacity');

        const rootChildren = pane.querySelector('.hover-root');

        // Applica filtro installed (coerenza con sidebar aperta)
        if (window.applyInstalledFilterToHoverPane) {
            window.applyInstalledFilterToHoverPane();
        }

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
                if (window.applySearchToHoverPane) window.applySearchToHoverPane(lastCtx);
            }, 10);

        } else {
            expandFromMemoryInContainer(pane, phaseKey);
        }

        requestAnimationFrame(() => {
            if (!inSearch) {
                const currentSlash = getActivePathSlash(phaseKey);
                if (currentSlash) {
                    highlightPathInContainer(pane, currentSlash);
                    const activeLeaf = pane.querySelector(`.folder-leaf[data-path="${currentSlash}"], .leaf[data-path="${currentSlash}"]`);
                    if (activeLeaf) activeLeaf.classList.add(CLASSES.active);
                }
                syncHeaderActivePath(pane);
            }

            setTimeout(() => {
                if (typeof window.refreshAllVLines === 'function') window.refreshAllVLines(pane);
                window.SidebarAutoGrow?.schedule();
            }, 50);
        });

        window.dispatchEvent(new Event('tm:hover:show'));
    }

    // Document-level listener for hover pane (attached once)
    let hoverPaneListenerAttached = false;

    function attachHoverPaneListener() {
        if (hoverPaneListenerAttached) return;
        hoverPaneListenerAttached = true;

        document.addEventListener('mouseenter', (e) => {
            if (e.target.closest('.hover-pane')) {
                const buttons = document.querySelectorAll('.nav-item.has-children > .btn');
                buttons.forEach(b => clearHoverTimeout(b));
            }
        }, true);
    }

    window.SidebarHover = {
        getHoverPane: () => hoverPane,
        hideHoverPane,
        showHoverPaneForNode,
        clearHoverTimeout,
        setHoverTimeout,
        attachHoverPaneListener,
        getCurrentHoverButton: () => currentHoverButton,
        syncHeaderActivePath
    };
})();
