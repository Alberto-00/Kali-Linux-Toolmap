// ================================
// Sidebar Tree - Full JS with Path Tracking
// ================================
(() => {
    "use strict";

    // -------------------------------
    // PATH TRACKING MAP (uno per fase)
    // -------------------------------
    const phasePathMap = new Map();

    // -------------------------------
    // 1) TAXONOMY (solo cartelle {})
    // -------------------------------
    const taxonomy = {
        "00_Common": {
            "Metasploit_Plugins": {}, "Scripts": {}, "Tools_Windows": {}, "Wordlists": {}
        },

        "01_Information_Gathering": {
            "01_Recon": {
                "Infrastructure": {
                    "DNS_Subdomains": {}
                }, "Web": {
                    "Content_Discovery": {}, "Fingerprinting": {
                        "Visual_Recon": {}, "WAF": {}
                    }, "Params_Discovery": {}
                }
            }, "02_Enumeration": {
                "Infrastructure": {
                    "SMB": {}
                }, "Web": {
                    "API": {}, "CMS": {"Joomla": {}}, "Crawling": {"Active": {}}
                }
            }
        },

        "02_Exploitation": {
            "General": {}, "Infrastructure": {"RTSP": {}}, "Web": {
                "CMS_Exploits": {
                    "Drupal": {}, "Joomla": {}, "WordPress": {}
                }, "File_Upload": {}, "Injection": {
                    "LFI": {}, "XSS": {}, "XXE": {}
                }, "Next_js": {}, "Tomcat": {}
            }
        },

        "03_Post_Exploitation": {
            "AD_Windows": {
                "Kerberos_ADCS_Relay": {}, "Recon_Health": {}
            }, "Credentials": {
                "Credentials_Hunting": {}, "Passwords_Cracking": {}
            }, "Evasion": {}, "Pivoting": {}, "Privilege_Escalation": {"Linux": {}}, "Reverse_Engineering": {}
        },

        "04_Miscellaneous": {}
    };

    // -------------------------------
    // 2) ICONS & UTILS
    // -------------------------------
    const formatLabel = (text) => String(text).replace(/_/g, " ").replace(/^\d+_/, "");
    const chevronSVG = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
    const folderSVG = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';

    const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
    const hasChildrenNode = (node) => isObject(node) && Object.keys(node).length > 0;

    function isVisible(el) {
        return !!(el && el.offsetParent !== null);
    }

    function markLastVisible(container) {
        if (!container) return;
        container.querySelectorAll(':scope > .folder-leaf.is-last-visible')
            .forEach(n => n.classList.remove('is-last-visible'));
        const visibles = Array.from(container.querySelectorAll(':scope > .folder-leaf'))
            .filter(isVisible);
        if (visibles.length) visibles[visibles.length - 1].classList.add('is-last-visible');
    }

    function getNodeByPath(obj, path) {
        return path.split("/").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
    }

    function depthFromPath(path) {
        const parts = path.split("/");
        return Math.max(0, parts.length - 1);
    }

    function buildChildren(obj, parentPath = "") {
        let html = "";
        if (!isObject(obj)) return html;

        for (const [key, sub] of Object.entries(obj)) {
            const path = parentPath ? `${parentPath}/${key}` : key;
            const hasKids = hasChildrenNode(sub);
            html += `
        <div class="folder-leaf${hasKids ? "" : " terminal"}"
             data-path="${path}"
             data-has-children="${hasKids}">
          ${folderSVG}<span>${formatLabel(key)}</span>
        </div>
      `;
        }
        return html;
    }

    // -------------------------------
    // PATH HIGHLIGHTING LOGIC
    // -------------------------------
    function highlightActivePath(phaseKey) {
        const navItem = document.querySelector(`.nav-item[data-phase="${phaseKey}"]`);
        if (!navItem) return;

        const activePath = phasePathMap.get(phaseKey);

        if (!activePath) {
            // Nessun percorso: rimuovi la classe e reset
            navItem.classList.remove("has-active-path");
            resetPathHighlight(navItem);
            return;
        }

        // C'è un percorso attivo: aggiungi la classe
        navItem.classList.add("has-active-path");

        const pathParts = activePath.split("/");

        // Reset tutti i nodi della fase
        navItem.querySelectorAll(".folder-leaf").forEach(el => {
            el.classList.remove("in-active-path");
        });

        // Evidenzia ogni nodo nel percorso
        for (let i = 1; i <= pathParts.length; i++) {
            const partialPath = pathParts.slice(0, i).join("/");
            const node = navItem.querySelector(`.folder-leaf[data-path="${partialPath}"]`);
            if (node) {
                node.classList.add("in-active-path");
            }
        }

        // Marca i children-nested che contengono nodi del percorso
        navItem.querySelectorAll(".children-nested").forEach(nested => {
            if (nested.querySelector(".folder-leaf.in-active-path")) {
                nested.classList.add("has-active-path");
            } else {
                nested.classList.remove("has-active-path");
            }
        });
    }

    function resetPathHighlight(navItem) {
        if (!navItem) return;
        navItem.classList.remove("has-active-path");
        navItem.querySelectorAll(".folder-leaf").forEach(el => {
            el.classList.remove("in-active-path");
        });
        navItem.querySelectorAll(".children-nested").forEach(nested => {
            nested.classList.remove("has-active-path");
        });
    }

    function clearAllPathHighlights() {
        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.remove("has-active-path");
        });
        document.querySelectorAll(".folder-leaf").forEach(el => {
            el.classList.remove("in-active-path");
        });
        document.querySelectorAll(".children-nested").forEach(nested => {
            nested.classList.remove("has-active-path");
        });
    }

    // -------------------------------
    // 3) RENDER PHASES NAV
    // -------------------------------
    function buildNav() {
        const nav = document.getElementById("nav");
        if (!nav) return;

        let html = "";

        Object.entries(taxonomy).forEach(([phase, tree]) => {
            const hasChildren = hasChildrenNode(tree);
            const childrenHTML = hasChildren ? buildChildren(tree, phase) : "";

            html += `
        <div class="nav-item ${hasChildren ? "has-children" : ""}" data-phase="${phase}">
          <button class="btn" data-search="${formatLabel(phase).toLowerCase()}">
            ${folderSVG}
            <span class="label">${formatLabel(phase)}</span>
            ${hasChildren ? `<span class="chev">${chevronSVG}</span>` : ""}
          </button>
          ${hasChildren ? `<div class="children">${childrenHTML}</div>` : ""}
          ${hasChildren ? `
            <div class="flyout">
              <div class="flyout-title">${folderSVG}<span>${formatLabel(phase)}</span></div>
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

    // Toggle fasi (one-at-a-time)
    function attachPhaseToggles() {
        const sidebar = document.getElementById("sidebar");
        document.querySelectorAll(".nav-item.has-children > .btn").forEach(btn => {
            btn.addEventListener("click", () => {
                if (sidebar && sidebar.classList.contains("collapsed")) return;

                const navItem = btn.closest(".nav-item");
                const phaseKey = navItem.dataset.phase;
                const wasOpen = navItem.classList.contains("open");

                // Chiudi tutte le altre fasi
                document.querySelectorAll(".nav-item.open").forEach(item => {
                    if (item !== navItem) {
                        item.classList.remove("open");
                        item.querySelector(".btn")?.classList.remove("active");
                        resetPathHighlight(item);
                    }
                });

                if (!wasOpen) {
                    navItem.classList.add("open");
                    btn.classList.add("active");
                    highlightActivePath(phaseKey);
                } else {
                    navItem.classList.remove("open");
                    btn.classList.remove("active");
                    resetPathHighlight(navItem);
                }
            });
        });
    }

    // Drill-down ricorsivo con path tracking
    function attachFolderLeafDrilldown(scope = document) {
        scope.querySelectorAll(".children .folder-leaf").forEach(el => {
            if (el.dataset._drillbound) return;
            el.dataset._drillbound = "1";

            el.addEventListener("click", (ev) => {
                ev.stopPropagation();

                const path = el.dataset.path;
                const node = getNodeByPath(taxonomy, path);
                const hasKids = hasChildrenNode(node);
                const phaseKey = path.split("/")[0];

                // Aggiorna il path tracking per la fase corrente
                phasePathMap.set(phaseKey, path);

                // Applica l'evidenziazione del percorso
                highlightActivePath(phaseKey);

                // stato active tra i fratelli
                el.parentElement.querySelectorAll(":scope > .folder-leaf")
                    .forEach(s => s.classList.toggle("active", s === el));

                if (!hasKids) return;

                // SE È GIÀ APERTO → CHIUSURA
                const next = el.nextElementSibling;
                if (next && next.classList.contains("children-nested") && next.dataset.parent === path) {
                    const h = next.scrollHeight;
                    next.style.maxHeight = h + "px";
                    next.style.opacity = "1";
                    next.style.paddingTop = "2px";
                    void next.getBoundingClientRect();
                    next.style.maxHeight = "0px";
                    next.style.opacity = "0";
                    next.style.paddingTop = "0px";

                    next.addEventListener("transitionend", () => {
                        next.remove();
                        markLastVisible(el.parentElement);
                        highlightActivePath(phaseKey);
                    }, {once: true});
                    return;
                }

                // NON ERA APERTO → APERTURA
                const depth = depthFromPath(path);
                const nest = document.createElement("div");
                nest.className = "children children-nested";
                nest.dataset.parent = path;
                nest.style.setProperty("--level", depth);

                nest.innerHTML = buildChildren(node, path);
                nest.style.maxHeight = "0px";
                nest.style.opacity = "0";
                nest.style.paddingTop = "0px";

                el.after(nest);
                markLastVisible(el.parentElement);
                markLastVisible(nest);

                const target = nest.scrollHeight;
                void nest.getBoundingClientRect();
                nest.style.maxHeight = target + "px";
                nest.style.opacity = "1";
                nest.style.paddingTop = "2px";

                const onOpenEnd = () => {
                    nest.removeEventListener("transitionend", onOpenEnd);
                    if (document.body.contains(nest) && nest.style.opacity === "1") {
                        nest.style.maxHeight = "none";
                    }
                    highlightActivePath(phaseKey);
                };
                nest.addEventListener("transitionend", onOpenEnd);

                attachFolderLeafDrilldown(nest);
            });
        });
    }

    function positionFlyouts() {
        const sidebar = document.getElementById("sidebar");
        document.querySelectorAll(".nav-item.has-children").forEach(item => {
            const flyout = item.querySelector(".flyout");
            if (!flyout) return;

            item.addEventListener("mouseenter", () => {
                if (!sidebar || !sidebar.classList.contains("collapsed")) return;
                const rect = item.getBoundingClientRect();
                flyout.style.left = `${rect.right + 10}px`;
                flyout.style.top = `${rect.top}px`;
            });
        });
    }

    // -------------------------------
    // 4) SIDEBAR COLLAPSE & SEARCH
    // -------------------------------
    function attachSidebarControls() {
        const sidebar = document.getElementById("sidebar");
        const collapseBtn = document.getElementById("collapseBtn");
        if (collapseBtn) {
            collapseBtn.addEventListener("click", () => {
                sidebar.classList.toggle("collapsed");

                if (sidebar.classList.contains("collapsed")) {
                    document.querySelectorAll(".nav-item.open").forEach(item => {
                        item.classList.remove("open");
                        item.querySelector(".btn")?.classList.remove("active");
                    });
                    clearAllPathHighlights();
                }
            });
        }

        const searchInput = document.getElementById("searchInput");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                const term = e.target.value.toLowerCase().trim();

                document.querySelectorAll(".nav-item").forEach(item => {
                    const btn = item.querySelector(".btn");
                    const btnText = btn.getAttribute("data-search") || "";
                    const leaves = item.querySelectorAll(".children .folder-leaf");

                    let hasMatch = btnText.includes(term);

                    leaves.forEach(leaf => {
                        const text = (leaf.textContent || "").toLowerCase().trim();
                        const match = text.includes(term);
                        leaf.style.display = match || term === "" ? "flex" : "none";
                        if (match) hasMatch = true;
                    });

                    item.style.display = hasMatch || term === "" ? "block" : "none";

                    if (hasMatch && term !== "" && item.classList.contains("has-children")) {
                        item.classList.add("open");
                        btn.classList.add("active");
                    }
                });
                document.querySelectorAll('.children, .children-nested').forEach(markLastVisible);
            });
        }
    }

    // -------------------------------
    // 5) BOOT
    // -------------------------------
    document.addEventListener("DOMContentLoaded", () => {
        window.taxonomy = taxonomy;
        buildNav();
        attachSidebarControls();
    });
})();

// -------------------------------
// V-LINE CLAMP UTILITIES
// -------------------------------
function isVisible(el) {
    if (!el) return false;
    const rects = el.getClientRects();
    return el.offsetParent !== null || rects.length > 0;
}

function getDirectNodes(container) {
    const sel = ':scope > .leaf, :scope > .folder-leaf, :scope > .section-title';
    return Array.from(container.querySelectorAll(sel)).filter(isVisible);
}

function computeVLineEndPx(container) {
    const items = getDirectNodes(container);
    if (items.length === 0) return null;

    const last = items[items.length - 1];
    const cs = getComputedStyle(last);
    const elbowTop = parseFloat(cs.getPropertyValue('--elbow-top')) || 0;
    const elbowH = parseFloat(cs.getPropertyValue('--elbow-h'));

    let endY;
    if (!Number.isNaN(elbowH)) {
        endY = last.offsetTop + elbowTop + (elbowH / 2);
    } else {
        endY = last.offsetTop + (last.offsetHeight / 2);
    }

    const maxH = container.scrollHeight;
    if (endY < 0) endY = 0;
    if (endY > maxH) endY = maxH;

    items.forEach(el => el.classList.remove('is-last'));
    last.classList.add('is-last');

    const EXTRA_BOTTOM = 35;
    endY = Math.max(0, endY - EXTRA_BOTTOM);

    return Math.round(endY);
}

function setVLine(container) {
    if (!container) return;
    const endPx = computeVLineEndPx(container);
    if (endPx == null) {
        container.style.removeProperty('--vline-end');
    } else {
        container.style.setProperty('--vline-end', endPx + 'px');
    }
}

function refreshAllVLines(root = document) {
    root = normalizeRoot(root);
    const all = root.querySelectorAll('.children, .children-nested');
    all.forEach(setVLine);
}

function refreshAllVLinesDebounced(root = document) {
    root = normalizeRoot(root);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
        refreshAllVLines(root);
        rafId = null;
    });
}

function normalizeRoot(root) {
    // Accept: Element | Document | DocumentFragment | Event | NodeList | Array | null/undefined
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

    const observer = new MutationObserver(() => refreshAllVLinesDebounced());
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-expanded']
    });

    let animTicker = null;
    document.addEventListener('transitionstart', (e) => {
        if (!(e.target instanceof Element)) return;
        if (!e.target.closest('.children, .children-nested')) return;

        const start = performance.now();
        const tick = (t) => {
            refreshAllVLines();
            if (t - start < 500) {
                animTicker = requestAnimationFrame(tick);
            } else {
                cancelAnimationFrame(animTicker);
                animTicker = null;
                refreshAllVLines();
            }
        };
        if (!animTicker) animTicker = requestAnimationFrame(tick);
    }, true);

    window.refreshAllVLines = refreshAllVLines;
    window.refreshAllVLinesDebounced = refreshAllVLinesDebounced;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVLineClamp);
} else {
    initVLineClamp();
}