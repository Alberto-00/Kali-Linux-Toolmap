/**
 * Sidebar Search - Search mode ghost overlay, decorations, event handlers
 * Depends on: sidebar-constants.js, sidebar-state.js, sidebar-dom.js, sidebar-hover.js
 */
(function () {
    'use strict';

    const {CLASSES, SELECTORS, QueryHelpers, taxonomy, hasChildrenNode, getNodeByPath, isSearchMode, forceReflow, TIMINGS} = window.SidebarConstants;
    const {MEM, getActivePathSlash, setActivePathSlash, expandBranch, getNavItem, getOpenNavItems, resolveToolIdsForSlashPath, phaseMemory} = window.SidebarState;
    const {clearPathHighlight, highlightActivePath, highlightPathInContainer, ensureExpandedInContainer, expandFromMemoryInContainer, expandAncestorsWithHits, updateSearchContainersVLines, createNestedContainer, markLastVisible, dispatchScopeAndPhase, animateCloseAllBatch} = window.SidebarDOM;
    const {getHoverPane, hideHoverPane, clearHoverTimeout} = window.SidebarHover;

    const SIDEBAR = document.getElementById('sidebar');
    const NAV = document.getElementById('nav');
    if (!SIDEBAR || !NAV) return;

    // ========================================================================
    // RESTORE SEARCH PHASES
    // ========================================================================

    function restoreSearchPhases(clickedPhase) {
        clickedPhase = clickedPhase || null;
        const lastCtx = window.__lastSearchContext;
        if (!lastCtx || !lastCtx.hasQuery || !lastCtx.paths) return;

        // Rimuovi tutti i phase-badge
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

        // Identifica TUTTE le fasi con risultati
        const phasesWithResults = new Set();
        if (lastCtx.paths) {
            lastCtx.paths.forEach(pathArr => {
                if (pathArr && pathArr.length > 0) {
                    phasesWithResults.add(pathArr[0]);
                }
            });
        }

        // Aggiungi i badge a tutte le fasi con risultati (aperte o chiuse)
        phasesWithResults.forEach(phase => {
            const item = getNavItem(phase);
            if (!item) return;

            const phaseBtn = item.querySelector('.btn');
            if (phaseBtn) {
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

        // Apri SOLO le fasi che erano aperte prima
        if (savedPhases.length === 0) return;

        savedPhases.forEach(phase => {
            const item = getNavItem(phase);
            if (!item) return;

            item.classList.add(CLASSES.open);
            item.querySelector('.btn')?.classList.add(CLASSES.active);

            const phasePaths = lastCtx.paths.filter(arr => arr && arr[0] === phase);

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
        window.refreshAllVLinesDebounced();
        window.SidebarAutoGrow?.schedule();
    }

    // ========================================================================
    // SEARCH GHOST (search mode overlay on sidebar)
    // ========================================================================

    function clearSearchGhost() {
        SIDEBAR.classList.remove(CLASSES.searchMode);
        NAV.querySelectorAll('.nav-item').forEach(item => {
            item.style.removeProperty('display');
            item.classList.remove('search-disabled', 'has-search-results');
            const b = item.querySelector('.btn .search-badge');
            if (b) b.remove();
            QueryHelpers.clearSearchMarks(item);
            // Rimuovi i nested children creati durante la ricerca
            item.querySelectorAll('.children-nested').forEach(nest => nest.remove());

            // Pulisci gli stili inline del .children principale
            const children = item.querySelector(':scope > .children');
            if (children) {
                children.style.removeProperty('max-height');
                children.style.removeProperty('opacity');
            }
        });
        const hoverPane = getHoverPane();
        if (hoverPane && hoverPane.classList.contains(CLASSES.active)) {
            hoverPane.classList.remove(CLASSES.searchMode);
            QueryHelpers.clearSearchMarks(hoverPane);
        }
        window.refreshAllVLinesDebounced();
        window.SidebarAutoGrow?.schedule();
    }

    function applySearchGhost(detail) {
        const {hasQuery, phaseKeys = [], paths = [], countsByPhase = {}} = detail || {};
        if (!hasQuery) {
            clearSearchGhost();
            return;
        }

        // Rimuovi tutti i phase-badge prima di applicare la ricerca
        document.querySelectorAll('.sidebar .phase-badge').forEach(badge => {
            badge.remove();
        });

        SIDEBAR.classList.add(CLASSES.searchMode);

        // Batch clear operations
        QueryHelpers.clearActive(NAV);
        const pathNodes = NAV.querySelectorAll(SELECTORS.pathNodes);
        const containers = NAV.querySelectorAll(SELECTORS.containers);

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
                    btn.querySelector('.search-badge')?.remove();
                }

                QueryHelpers.clearSearchMarks(item);
            });
            window.refreshAllVLinesDebounced();
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

            // Resetta stili inline dei children
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
                btn.querySelector('.search-badge')?.remove();

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

        // Batch update delle vline
        const hasSearchResults = NAV.querySelectorAll('.nav-item.has-search-results');
        hasSearchResults.forEach(item => {
            updateSearchContainersVLines(item);
        });

        const hoverPane = getHoverPane();
        if (hoverPane && hoverPane.classList.contains(CLASSES.active)) {
            applySearchToHoverPane(detail);
        }

        setTimeout(() => {
            window.refreshAllVLinesDebounced(NAV);
            window.SidebarAutoGrow?.schedule();
        }, 50);
    }

    function applySearchToHoverPane(detail) {
        const hoverPane = getHoverPane();
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
            window.refreshAllVLines(hoverPane);
            window.SidebarAutoGrow?.schedule();
        });
    }

    // Expose globally for hover pane integration
    window.applySearchToHoverPane = applySearchToHoverPane;

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

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

        // Read from search.js's unified state
        const preSearchState = localStorage.getItem('tm:search:prestate');
        const preSearchSlash = preSearchState ? JSON.parse(preSearchState).pathSlash : null;
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

            localStorage.setItem('tm:scope:showAll', '1');
            window.dispatchEvent(new CustomEvent('tm:scope:set', {
                detail: {all: true, source: 'search-clear-no-path'}
            }));

            if (typeof window.refreshAllVLinesDebounced === 'function') window.refreshAllVLinesDebounced();
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

        if (typeof window.refreshAllVLinesDebounced === 'function') {
            window.refreshAllVLinesDebounced(phaseItem || nav);
        }
        window.SidebarAutoGrow?.schedule();

        if (lastSlash) {
            try {
                localStorage.setItem(MEM.pathSlash, lastSlash);
                dispatchScopeAndPhase(lastSlash, {source: 'search-clear'});
            } catch (e) {
            }
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

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    window.addEventListener('tm:search:context', (ev) => {
        const detail = ev.detail || {};

        if (!detail.hasQuery) {
            window.__lastSearchContext = null;
            clearSearchGhost();
        } else {
            window.__lastSearchContext = detail;
            applySearchGhost(detail);
        }
    });

    window.addEventListener('tm:search:set', (ev) => {
        const detail = ev.detail || {};
        if (!detail.hasQuery) {
            window.__lastSearchContext = null;
            clearSearchGhost();
        }
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

    // tm:search:set (full handler for search enter/exit)
    window.addEventListener('tm:search:set', (ev) => {
        const hasQuery = !!(ev.detail && ev.detail.hasQuery);
        const hoverPane = getHoverPane();

        if (hasQuery) {
            SIDEBAR.classList.add(CLASSES.searchMode);

            // Rimuovi tutti i phase-badge quando entri in search mode
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
                SIDEBAR.classList.remove(CLASSES.searchMode);
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

        SIDEBAR.classList.remove(CLASSES.searchMode);
        clearSearchDecorations();

        if (scopeAll) {
            NAV.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove(CLASSES.open);
                item.querySelector('.btn')?.classList.remove(CLASSES.active);

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

                    if (typeof expandFromMemoryInContainer === 'function') {
                        expandFromMemoryInContainer(item, phase);
                    }

                    if (typeof highlightActivePath === 'function') {
                        highlightActivePath(phase);
                    }

                    const children = item.querySelector(':scope > .children');
                    if (children) {
                        children.style.maxHeight = 'none';
                        children.style.opacity = '1';
                    }
                } else {
                    item.classList.remove(CLASSES.open);
                    item.querySelector('.btn')?.classList.remove(CLASSES.active);

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

        window.refreshAllVLinesDebounced();
        window.SidebarAutoGrow?.schedule();
    });

    window.addEventListener('tm:reset', () => {
        window.__lastSearchContext = null;

        // Cancella tutti gli hover timeout pendenti
        const buttons = document.querySelectorAll('.nav-item.has-children > .btn');
        buttons.forEach(btn => clearHoverTimeout(btn));

        document.querySelectorAll('.sidebar .phase-badge, .sidebar .search-badge').forEach(badge => {
            badge.remove();
        });

        localStorage.removeItem(MEM.pathKey);
        localStorage.removeItem(MEM.pathSlash);

        Object.keys(phaseMemory).forEach(k => {
            phaseMemory[k].activePathSlash = null;
            phaseMemory[k].expanded.clear();
        });

        const sidebarEl = document.getElementById('sidebar');
        sidebarEl?.classList.remove(CLASSES.searchMode);
        QueryHelpers.clearSearchMarks(document);

        // Chiudi le fasi aperte CON ANIMAZIONE SEQUENZIALE
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

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove(CLASSES.hasActivePath);
            item.style.removeProperty('display');
        });

        clearPathHighlight();

        const nestedToAnimate = Array.from(document.querySelectorAll('.children-nested'));

        const hoverPane = getHoverPane();
        animateCloseAllBatch(nestedToAnimate, childrenToAnimate, () => {
            if (hoverPane) {
                hoverPane.classList.remove(CLASSES.searchMode, CLASSES.active);
                hoverPane.querySelectorAll('.folder-leaf, .leaf, .section-title')
                    .forEach(el => el.classList.remove(CLASSES.inActivePath, CLASSES.active, CLASSES.searchHit));
                hoverPane.querySelectorAll(SELECTORS.containers)
                    .forEach(n => n.classList.remove(CLASSES.hasActivePath));
                hideHoverPane();
            }

            window.refreshAllVLinesDebounced();
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

            const phasesWithResults = new Set();
            lastCtx.paths.forEach(arr => {
                if (arr && arr.length > 0) phasesWithResults.add(arr[0]);
            });

            const openPhases = Array.from(phasesWithResults);
            if (openPhases.length > 0) {
                localStorage.setItem('tm:search:open-phases', JSON.stringify(openPhases));
            }

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

            if (isCollapsed) {
                return;
            }

            const currentlyOpenPhases = new Set(
                Array.from(document.querySelectorAll('.nav-item.open'))
                    .map(item => item.dataset.phase)
                    .filter(Boolean)
            );

            const allAlreadyOpen = Array.from(phasesWithResults).every(phase =>
                currentlyOpenPhases.has(phase)
            );

            if (allAlreadyOpen && phasesWithResults.size === currentlyOpenPhases.size) {
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

                window.refreshAllVLinesDebounced();
                window.SidebarAutoGrow?.schedule();
                return;
            }

            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove(CLASSES.open);
                item.querySelector('.btn')?.classList.remove(CLASSES.active);
                item.style.removeProperty('display');
            });

            document.querySelectorAll('.children-nested').forEach(n => n.remove());

            phasesWithResults.forEach(phaseKey => {
                const item = getNavItem(phaseKey);
                if (!item) return;

                item.classList.add(CLASSES.open);
                item.querySelector('.btn')?.classList.add(CLASSES.active);

                const phasePaths = lastCtx.paths.filter(arr => arr && arr[0] === phaseKey);

                for (const arr of phasePaths) {
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

                updateSearchContainersVLines(item);

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

            window.refreshAllVLinesDebounced();
            window.SidebarAutoGrow?.schedule();

            return;
        }

        // MODALITÀ NORMALE - Show All
        localStorage.removeItem('tm:scope:showAll');

        document.querySelectorAll('.sidebar .phase-badge').forEach(badge => {
            badge.remove();
        });
    }, true);

    // ========================================================================
    // EXPORT
    // ========================================================================

    window.SidebarSearch = {
        restoreSearchPhases,
        clearSearchGhost,
        applySearchGhost,
        applySearchToHoverPane,
        clearSearchDecorations,
        openOnlyActivePathOnClear
    };

})();
