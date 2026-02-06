/**
 * Sidebar Badges - Phase badge management + sidebar open badge
 * Depends on: sidebar-constants.js, sidebar-state.js
 */
(function () {
    'use strict';

    const {CLASSES, isSearchMode} = window.SidebarConstants;
    const {getNavItem} = window.SidebarState;

    // Variabile per tracciare ultima fase con badge attivo
    let lastBadgePhase = null;

    // ========================================================================
    // PHASE BADGE MODULE
    // ========================================================================

    function isSidebarOpen() {
        const sb = document.getElementById('sidebar');
        return !!sb && !sb.classList.contains(CLASSES.collapsed);
    }

    function removeBadges(phaseKey, badgeClass) {
        const phaseSelector = phaseKey ? `.nav-item[data-phase="${phaseKey}"]` : '.nav-item';
        const badgeSelector = badgeClass ? `.${badgeClass}` : '.phase-badge, .search-badge';
        document.querySelectorAll(`${phaseSelector} .btn ${badgeSelector}`).forEach(n => n.remove());
    }

    function setBadge(btn, badgeClass, value, phaseChanged) {
        phaseChanged = phaseChanged || false;
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

    // ========================================================================
    // PHASE BADGE EVENT HANDLERS
    // ========================================================================

    window.addEventListener('tm:context:summary', (ev) => {
        const d = ev.detail || {};
        const scopeAll = !!d.scopeAll;
        const pathKey = d.pathKey || '';
        const count = Number(d.toolsCount || 0);

        if (!isSidebarOpen() || scopeAll || !pathKey) {
            const inSearch = isSearchMode();
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

    // ========================================================================
    // SIDEBAR OPEN BADGE (quando chiusa e riaperta)
    // ========================================================================

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

            if (!savedPath) {
                return;
            }

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

    // ========================================================================
    // SHOW ALL BUTTON LISTENER
    // ========================================================================

    document.addEventListener('DOMContentLoaded', function () {
        const showAllBtn = document.querySelector('.show-all-btn');

        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                localStorage.removeItem('tm:active:slash');
                localStorage.removeItem('tm:active:path');
                localStorage.setItem('tm:scope:showAll', '1');

                document.querySelectorAll('.sidebar .phase-badge').forEach(badge => {
                    badge.style.animation = 'badgePopIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
                    setTimeout(() => badge.remove(), 300);
                });
            });
        }
    });

    // ========================================================================
    // EXPORT
    // ========================================================================

    window.SidebarBadges = {
        removeBadges,
        setBadge,
        updateBadge
    };

})();
