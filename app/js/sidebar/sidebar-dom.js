(function () {
    'use strict';

    const {CLASSES, SELECTORS, QueryHelpers, taxonomy, formatLabel, hasChildrenNode, isNodeVisible, splitPath, getPhaseFromPath, getNodeByPath, isSearchMode, forceReflow} = window.SidebarConstants;
    const {ICON_MAP, ICONS, chevronSVG} = window.SidebarIcons;
    const {getActivePathSlash, expandBranch, collapseSubtree, getExpandedPaths, getNavItem, clearNavItemCache, setActivePathSlash, resolveToolIdsForSlashPath, derivePhaseColor, MEM} = window.SidebarState;

    const NESTED_ANIMATION_FALLBACK_MS = 400;
    const ANIMATION_FALLBACK_MS = 400;
    const activeAnimations = new WeakMap();

    function depthFromPath(path) {
        const parts = splitPath(path);
        return Math.max(0, parts.length - 1);
    }

    function createNestedContainer(pathSlash, node, animated) {
        if (animated === undefined) animated = true;
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

    function animateNested(nest, isOpening, onComplete) {
        if (!nest) return;

        const existing = activeAnimations.get(nest);
        if (existing) {
            clearTimeout(existing.timeout);
            nest.removeEventListener('transitionend', existing.handler);
            activeAnimations.delete(nest);
        }

        const setStyles = (styles) => Object.entries(styles).forEach(([k, v]) => nest.style[k] = v);
        let completed = false;

        if (isOpening) {
            setStyles({visibility: 'hidden', maxHeight: 'none', opacity: '1', paddingTop: '2px'});
            forceReflow(nest);
            const target = nest.scrollHeight;

            setStyles({visibility: '', maxHeight: '0px', opacity: '0', paddingTop: '0px'});
            forceReflow(nest);
            setStyles({maxHeight: `${target}px`, opacity: '1', paddingTop: '2px'});

            const complete = () => {
                if (completed) return;
                completed = true;
                activeAnimations.delete(nest);
                if (document.body.contains(nest) && nest.style.opacity === '1') {
                    nest.style.maxHeight = 'none';
                }
                onComplete?.();
            };

            const handler = (e) => {
                if (e.propertyName !== 'max-height') return;
                nest.removeEventListener('transitionend', handler);
                complete();
            };

            const timeout = setTimeout(complete, NESTED_ANIMATION_FALLBACK_MS);
            activeAnimations.set(nest, {handler, timeout});
            nest.addEventListener('transitionend', handler);
        } else {
            const h = nest.scrollHeight;
            setStyles({maxHeight: `${h}px`, opacity: '1', paddingTop: '2px'});
            forceReflow(nest);
            setStyles({maxHeight: '0px', opacity: '0', paddingTop: '0px'});

            const complete = () => {
                if (completed) return;
                completed = true;
                activeAnimations.delete(nest);
                nest.remove();
                onComplete?.();
            };

            const handler = (e) => {
                if (e.propertyName !== 'max-height') return;
                nest.removeEventListener('transitionend', handler);
                complete();
            };

            const timeout = setTimeout(complete, NESTED_ANIMATION_FALLBACK_MS);
            activeAnimations.set(nest, {handler, timeout});
            nest.addEventListener('transitionend', handler);
        }
    }

    function animateCloseAllBatch(nestedArray, childrenData, onAllComplete) {
        const hasNested = nestedArray && nestedArray.length > 0;
        const hasPhases = childrenData && childrenData.length > 0;

        if (!hasNested && !hasPhases) {
            onAllComplete?.();
            return;
        }

        let totalToComplete = (hasNested ? nestedArray.length : 0) + (hasPhases ? childrenData.length : 0);
        let completedCount = 0;

        const checkAllComplete = () => {
            completedCount++;
            if (completedCount >= totalToComplete) {
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

        requestAnimationFrame(() => {
            const setStyles = (el, styles) => Object.entries(styles).forEach(([k, v]) => el.style[k] = v);

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

            forceReflow(hasNested ? nestedArray[0] : childrenData[0].children);

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

                    const handler = (e) => {
                        if (e.propertyName !== 'max-height') return;
                        nest.removeEventListener('transitionend', handler);
                        complete();
                    };
                    nest.addEventListener('transitionend', handler);
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
            setStyles({visibility: 'hidden', maxHeight: 'none', opacity: '1'});
            forceReflow(children);
            const target = children.scrollHeight;

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
            setTimeout(complete, ANIMATION_FALLBACK_MS);
        } else {
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

    function buildChildren(obj, parentPath) {
        if (parentPath === undefined) parentPath = '';
        let html = '';
        if (!window.SidebarConstants.isObject(obj)) return html;

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

        root.querySelectorAll('.children, .children-nested, .hover-root').forEach(container => {
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

        clearNavItemCache();

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

        // These will be called by sidebar-main.js after buildNav
        document.querySelectorAll('.nav-item > .children').forEach(markLastVisible);
        positionFlyouts();
    }

    function clearPathHighlight(scope) {
        if (!scope) scope = document;

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
    }

    function expandFromMemoryInContainer(container, phaseKey) {
        getExpandedPaths(phaseKey).forEach(p => ensureExpandedInContainer(container, p));

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

    function dispatchScopeAndPhase(slashPath, opts) {
        if (!opts) opts = {};
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
        }

        window.dispatchEvent(new CustomEvent('tm:scope:set', {detail: {pathKey, ids, ...opts}}));
        const color = derivePhaseColor(phaseKey, ids);
        window.dispatchEvent(new CustomEvent('tm:phase:color', {detail: {color}}));
    }

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

    window.SidebarDOM = {
        createNestedContainer,
        animateNested,
        animateCloseAllBatch,
        animatePhaseChildren,
        expandAndHighlightPath,
        buildChildren,
        markLastVisible,
        updateSearchContainersVLines,
        buildNav,
        clearPathHighlight,
        highlightActivePath,
        applyPhaseThemeToPane,
        highlightPathInContainer,
        ensureExpandedInContainer,
        expandFromMemoryInContainer,
        expandAncestors,
        expandAncestorsWithHits,
        dispatchScopeAndPhase,
        positionFlyouts
    };
})();
