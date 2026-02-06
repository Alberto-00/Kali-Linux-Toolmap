/**
 * Sidebar Main - Bootstrap, controls, phase toggles, folder drilldown, scope handler
 * Depends on: sidebar-constants.js, sidebar-icons.js, sidebar-state.js, sidebar-dom.js,
 *             sidebar-hover.js, sidebar-search.js
 */
(function () {
    'use strict';

    const {CLASSES, SELECTORS, QueryHelpers, taxonomy, hasChildrenNode, getPhaseFromPath, getNodeByPath, isSearchMode, splitPath, forceReflow, TIMINGS} = window.SidebarConstants;
    const {ICON_MAP, precomputeIconMap} = window.SidebarIcons;
    const {MEM, getActivePathSlash, setActivePathSlash, expandBranch, collapseSubtree, getExpandedPaths, getNavItem, clearNavItemCache, getOpenNavItems, resolveToolIdsForSlashPath, derivePhaseColor, phaseMemory} = window.SidebarState;
    const {createNestedContainer, animateNested, animateCloseAllBatch, animatePhaseChildren, expandAndHighlightPath, buildNav, clearPathHighlight, highlightActivePath, highlightPathInContainer, ensureExpandedInContainer, expandFromMemoryInContainer, expandAncestors, expandAncestorsWithHits, updateSearchContainersVLines, dispatchScopeAndPhase, positionFlyouts, markLastVisible} = window.SidebarDOM;
    const {getHoverPane, hideHoverPane, showHoverPaneForNode, clearHoverTimeout, setHoverTimeout, attachHoverPaneListener, getCurrentHoverButton} = window.SidebarHover;
    const {restoreSearchPhases} = window.SidebarSearch;

    // ========================================================================
    // FOLDER LEAF DRILLDOWN (event delegation)
    // ========================================================================

    function attachFolderLeafDrilldown() {
        const NAV = document.getElementById('nav');
        if (!NAV) return;

        // Only attach once
        if (NAV.dataset.drilldownAttached) return;
        NAV.dataset.drilldownAttached = '1';

        // Single delegated listener for all folder-leaf clicks
        NAV.addEventListener('click', (ev) => {
            const el = ev.target.closest('.children .folder-leaf');
            if (!el) return;

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
                window.refreshAllVLinesDebounced();
                return;
            }

            const next = el.nextElementSibling;
            const isOpen = !!(next && next.classList.contains('children-nested') && next.dataset.parent === pathSlash);

            if (isOpen) {
                animateNested(next, false, () => {
                    markLastVisible(el.parentElement);
                    highlightActivePath(phaseKey);
                    collapseSubtree(phaseKey, pathSlash);
                    window.refreshAllVLinesDebounced();
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
                window.refreshAllVLinesDebounced();
                window.SidebarAutoGrow?.schedule();
            });
        });
    }

    // ========================================================================
    // PHASE TOGGLES
    // ========================================================================

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

                    // Rimuovi eventuali nested children esistenti
                    navItem.querySelectorAll('.children-nested').forEach(n => n.remove());

                    // Espandi subito (in parallelo con l'animazione)
                    if (inSearch) {
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

                    // Forza layout reflow per ottenere altezze corrette
                    void newChildren.offsetHeight;

                    // Refresh PRIMA dell'animazione con tutto già espanso
                    window.refreshAllVLines(navItem);

                    // Avvia animazione con vlines già corrette
                    animatePhaseChildren(newChildren, true, () => {
                        window.SidebarAutoGrow?.schedule();
                    });

                    btn.focus?.();

                    requestAnimationFrame(() => {
                        if (!inSearch) highlightActivePath(phaseKey);
                        window.refreshAllVLinesDebounced(navItem);
                    });

                    window.SidebarAutoGrow?.schedule();
                    return;
                }

                // ============================================================
                // CASO 2: Sidebar APERTA - toggle normale delle fasi
                // ============================================================

                const phasesToClose = !inSearch
                    ? Array.from(document.querySelectorAll('.nav-item.open')).filter(item => item !== navItem)
                    : [];

                if (!wasOpen) {
                    // APERTURA della fase
                    phasesToClose.forEach(item => {
                        const children = item.querySelector(':scope > .children');
                        item.querySelector('.btn')?.classList.remove(CLASSES.active);
                        clearPathHighlight(item);
                        animatePhaseChildren(children, false, () => {
                            item.classList.remove(CLASSES.open);
                        });
                    });

                    navItem.classList.add(CLASSES.open);
                    btn.classList.add(CLASSES.active);
                    const newChildren = navItem.querySelector(':scope > .children');

                    // Espandi nested children PRIMA dell'animazione
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

                            // Salva lo stato delle fasi aperte
                            setTimeout(() => {
                                const openPhases = getOpenNavItems().map(item => item.dataset.phase);

                                if (openPhases.length > 0) {
                                    localStorage.setItem('tm:search:open-phases', JSON.stringify(openPhases));
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

                    // Forza layout reflow
                    void newChildren.offsetHeight;

                    // Refresh PRIMA dell'animazione
                    if (inSearch) {
                        updateSearchContainersVLines(navItem);
                    } else {
                        window.refreshAllVLines(navItem);
                    }

                    // Avvia l'animazione
                    animatePhaseChildren(newChildren, true, () => {
                        window.SidebarAutoGrow?.schedule();
                    });
                } else {
                    // CHIUSURA della fase con animazione fluida
                    btn.classList.remove(CLASSES.active);
                    clearPathHighlight(navItem);
                    const children = navItem.querySelector(':scope > .children');

                    navItem.classList.remove(CLASSES.open);

                    animatePhaseChildren(children, false);

                    if (inSearch) {
                        const lastCtx = window.__lastSearchContext;
                        if (lastCtx && lastCtx.hasQuery && lastCtx.paths) {
                            setTimeout(() => {
                                const openPhases = getOpenNavItems().map(item => item.dataset.phase);

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

            // HOVER: mouseenter on phase button
            btn.addEventListener('mouseenter', () => {
                const sidebarEl = document.getElementById('sidebar');
                if (sidebarEl && sidebarEl.classList.contains(CLASSES.collapsed)) {
                    const navItem = btn.closest('.nav-item');
                    const phaseKey = navItem.dataset.phase;
                    const phaseData = taxonomy[phaseKey];
                    if (hasChildrenNode(phaseData)) {
                        // Clear ALL hover timeouts
                        const allButtons = document.querySelectorAll('.nav-item.has-children > .btn');
                        allButtons.forEach(b => clearHoverTimeout(b));

                        const lastCtx = window.__lastSearchContext;
                        const inSearch = sidebarEl.classList.contains(CLASSES.searchMode);

                        setHoverTimeout(btn, () => {
                            if (inSearch && lastCtx && lastCtx.hasQuery) {
                                const phasePaths = (lastCtx.paths || []).filter(arr => arr && arr[0] === phaseKey);

                                if (phasePaths.length === 0) {
                                    return;
                                }

                                showHoverPaneForNode(btn, phaseData, phaseKey);

                                setTimeout(() => {
                                    window.applySearchToHoverPane && window.applySearchToHoverPane(lastCtx);

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
                                }, 30);
                            } else {
                                showHoverPaneForNode(btn, phaseData, phaseKey);

                                const last = getActivePathSlash(phaseKey);
                                if (last && typeof last === 'string') {
                                    dispatchScopeAndPhase(last);
                                }
                            }
                        }, 100);
                    }
                }
            });

            // HOVER: mouseleave on phase button
            btn.addEventListener('mouseleave', () => {
                const sidebarEl = document.getElementById('sidebar');
                if (sidebarEl && sidebarEl.classList.contains(CLASSES.collapsed)) {
                    setHoverTimeout(btn, () => {
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
        });
    }

    // ========================================================================
    // SIDEBAR CLOSE ALL EVENT
    // ========================================================================

    window.addEventListener('tm:sidebar:closeAll', () => {
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

        const nestedToAnimate = Array.from(document.querySelectorAll('.children-nested'));

        animateCloseAllBatch(nestedToAnimate, childrenToAnimate, () => {
            clearPathHighlight();

            document.querySelectorAll('.sidebar .phase-badge, .sidebar .search-badge').forEach(b => {
                b.style.animation = 'badgePopIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
                setTimeout(() => b.remove(), 300);
            });

            window.refreshAllVLinesDebounced();
            window.SidebarAutoGrow?.schedule();
        });
    });

    // ========================================================================
    // SIDEBAR CONTROLS
    // ========================================================================

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

            // Salva stato fasi aperte in search mode prima di collassare
            if (now && inSearch) {
                const openPhases = Array.from(document.querySelectorAll('.nav-item.open'))
                    .map(item => item.dataset.phase)
                    .filter(Boolean);

                if (openPhases.length > 0) {
                    localStorage.setItem('tm:search:open-phases', JSON.stringify(openPhases));
                }

                document.querySelectorAll('.sidebar .phase-badge:not(.search-badge)').forEach(badge => {
                    badge.remove();
                });
            }

            sidebar.classList.toggle(CLASSES.collapsed, now);
            localStorage.setItem(MEM.collapsed, now ? '1' : '0');
            applyCollapsedStyle();

            if (now) {
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

            openItems.forEach(item => {
                item.querySelector('.btn')?.classList.remove(CLASSES.active);
                const children = item.querySelector(':scope > .children');
                if (children) {
                    childrenToAnimate.push({item, children});
                } else {
                    item.classList.remove(CLASSES.open);
                }
            });

            const nestedToAnimate = Array.from(document.querySelectorAll('.children-nested'));

            animateCloseAllBatch(nestedToAnimate, childrenToAnimate, () => {
                clearPathHighlight();
                window.refreshAllVLinesDebounced();
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

                window.refreshAllVLinesDebounced();
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
            window.refreshAllVLinesDebounced();
            window.SidebarAutoGrow?.schedule();
        });
    }

    // ========================================================================
    // SCOPE SET HANDLER
    // ========================================================================

    window.addEventListener('tm:scope:set', (ev) => {
        const detail = ev.detail || {};
        if (detail.all) {
            clearPathHighlight();
            localStorage.removeItem(MEM.pathKey);
            localStorage.removeItem(MEM.pathSlash);
            return;
        }

        const __sb = document.getElementById('sidebar');
        if (__sb && __sb.classList.contains(CLASSES.searchMode)) {
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
        const hoverPane = getHoverPane();

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
                if (typeof window.refreshAllVLinesDebounced === 'function') window.refreshAllVLinesDebounced(navItem);
                window.SidebarAutoGrow?.schedule();
            }

            try {
                if (isCollapsed && hoverPane && document.body.contains(hoverPane)) {
                    const currentHoverButton = getCurrentHoverButton();
                    if (currentHoverButton) clearHoverTimeout(currentHoverButton);

                    const currentPhase = phaseKey;
                    const currentPath = slash;

                    if (!currentPhase || !currentPath) {
                        // no-op
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
                                if (typeof window.refreshAllVLinesDebounced === 'function') {
                                    window.refreshAllVLinesDebounced(hoverPane);
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
                        expandFromMemoryInContainer(hoverPane, currentPhase);

                        const activeLeaf = hoverPane.querySelector(`.folder-leaf[data-path="${currentPath}"], .leaf[data-path="${currentPath}"]`);
                        if (activeLeaf) activeLeaf.classList.add(CLASSES.active);

                        requestAnimationFrame(() => {
                            if (typeof window.refreshAllVLinesDebounced === 'function') {
                                window.refreshAllVLinesDebounced(hoverPane);
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
            if (!isCollapsed) requestAnimationFrame(() => window.refreshAllVLinesDebounced(navItem));
        }
    });

    // ========================================================================
    // COLLAPSED STATE HELPERS
    // ========================================================================

    function setCollapsed(v) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle(CLASSES.collapsed, v);
        localStorage.setItem(MEM.collapsed, v ? '1' : '0');
        window.dispatchEvent(new CustomEvent('tm:sidebar:toggle', {detail: {collapsed: v}}));
    }

    function getCollapsed() {
        return localStorage.getItem(MEM.collapsed) === '1';
    }

    // ========================================================================
    // MOBILE DRAWER (solo < 768px)
    // ========================================================================

    function attachMobileDrawer() {
        const hamburger = document.getElementById('mobileHamburger');
        const closeBtn = document.getElementById('sidebarCloseBtn');
        const overlay = document.getElementById('sidebarOverlay');
        const sidebar = document.getElementById('sidebar');
        if (!hamburger || !overlay || !sidebar) return;

        function openDrawer() {
            sidebar.classList.add('mobile-open');
            document.body.classList.add('sidebar-drawer-open');
            overlay.style.display = 'block';
            requestAnimationFrame(() => overlay.classList.add('visible'));
        }

        function closeDrawer() {
            sidebar.classList.remove('mobile-open');
            document.body.classList.remove('sidebar-drawer-open');
            overlay.classList.remove('visible');
            // Nascondi overlay dopo la transizione
            const onEnd = () => {
                overlay.style.display = 'none';
                overlay.removeEventListener('transitionend', onEnd);
            };
            overlay.addEventListener('transitionend', onEnd);
        }

        // Hamburger apre il drawer
        hamburger.addEventListener('click', openDrawer);

        // X dentro il sidebar chiude il drawer
        if (closeBtn) {
            closeBtn.addEventListener('click', closeDrawer);
        }

        // Overlay chiude il drawer
        overlay.addEventListener('click', closeDrawer);

        // Chiudi drawer su resize se torniamo a desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && sidebar.classList.contains('mobile-open')) {
                closeDrawer();
            }
        });
    }

    // ========================================================================
    // BOOTSTRAP
    // ========================================================================

    document.addEventListener('DOMContentLoaded', () => {
        window.taxonomy = taxonomy;
        precomputeIconMap();
        buildNav();
        attachPhaseToggles();
        attachSidebarControls();
        attachFolderLeafDrilldown();
        attachHoverPaneListener();
        attachMobileDrawer();
        positionFlyouts();

        setCollapsed(getCollapsed());

        const lastSlash = localStorage.getItem(MEM.pathSlash);
        if (lastSlash) {
            const phaseKey = lastSlash.split('/')[0];
            setActivePathSlash(phaseKey, lastSlash);
            highlightActivePath(phaseKey);
            dispatchScopeAndPhase(lastSlash);
        }
    });

})();
