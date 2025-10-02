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
                const navItem = btn.closest(".nav-item");
                const phaseKey = navItem.dataset.phase;
                const wasOpen = navItem.classList.contains("open");

                // If sidebar is collapsed, open it and the phase
                if (sidebar && sidebar.classList.contains("collapsed")) {
                    sidebar.classList.remove("collapsed");
                    hideHoverPane();

                    // Open this phase
                    navItem.classList.add("open");
                    btn.classList.add("active");
                    highlightActivePath(phaseKey);
                    return;
                }

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

            // Add hover handler for collapsed sidebar
            btn.addEventListener("mouseenter", () => {
                if (sidebar && sidebar.classList.contains("collapsed")) {
                    const navItem = btn.closest(".nav-item");
                    const phaseKey = navItem.dataset.phase;
                    const phaseData = taxonomy[phaseKey];

                    if (hasChildrenNode(phaseData)) {
                        clearTimeout(hoverTimeout);
                        showHoverPaneForNode(btn, phaseData, phaseKey);
                    }
                }
            });

            btn.addEventListener("mouseleave", () => {
                if (sidebar && sidebar.classList.contains("collapsed")) {
                    hoverTimeout = setTimeout(() => {
                        hideHoverPane();
                    }, 200);
                }
            });
        });

        // Keep hover pane open when mouse enters it
        document.addEventListener("mouseenter", (e) => {
            if (e.target.closest(".hover-pane")) {
                clearTimeout(hoverTimeout);
            }
        }, true);
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

                // 1) Memoria path + ricolorazione (testo colorato sui nodi del path)
                phasePathMap.set(phaseKey, path);
                highlightActivePath(phaseKey);

                // 2) Background SEMPRE sull'ultimo nodo cliccato (anche se ha figli)
                document.querySelectorAll(".leaf.active, .folder-leaf.active, .section-title.active")
                    .forEach(n => n.classList.remove("active"));
                el.classList.add("active");

                // 3) Se non ha figli, abbiamo finito
                if (!hasKids) return;

                // 4) Se è già aperto → CHIUSURA con animazione, background rimane su questo nodo
                const next = el.nextElementSibling;
                const isOpen = !!(next && next.classList.contains("children-nested") && next.dataset.parent === path);

                if (isOpen) {
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
                        highlightActivePath(phaseKey);   // ricalcola i connettori e il path
                    }, {once: true});

                    return;
                }

                // 5) NON era aperto → APERTURA (il background resta sul nodo aperto)
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
                    highlightActivePath(phaseKey); // aggiorna connettori dopo apertura
                };
                nest.addEventListener("transitionend", onOpenEnd);

                attachFolderLeafDrilldown(nest);
                refreshAllVLinesDebounced(nest);
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
        const collapseAllBtn = document.getElementById("collapseAllBtn");
        const expandAllBtn = document.getElementById("expandAllBtn");

        if (collapseBtn) {
            collapseBtn.addEventListener("click", () => {
                sidebar.classList.toggle("collapsed");

                if (sidebar.classList.contains("collapsed")) {
                    document.querySelectorAll(".nav-item.open").forEach(item => {
                        item.classList.remove("open");
                        item.querySelector(".btn")?.classList.remove("active");
                    });
                    clearAllPathHighlights();
                    hideHoverPane();
                }
            });
        }

        if (collapseAllBtn) {
            collapseAllBtn.addEventListener("click", () => {
                document.querySelectorAll(".nav-item.open").forEach(item => {
                    item.classList.remove("open");
                    item.querySelector(".btn")?.classList.remove("active");
                });
                document.querySelectorAll(".children-nested").forEach(nested => {
                    nested.remove();
                });
                clearAllPathHighlights();
            });
        }

        if (expandAllBtn) {
            expandAllBtn.addEventListener("click", () => {
                document.querySelectorAll(".nav-item.has-children").forEach(item => {
                    const btn = item.querySelector(".btn");
                    if (!item.classList.contains("open")) {
                        item.classList.add("open");
                        btn?.classList.add("active");
                        const phaseKey = item.dataset.phase;
                        highlightActivePath(phaseKey);
                    }
                });
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
    // HOVER PANE FOR COLLAPSED SIDEBAR
    // -------------------------------
    let hoverPane = null;
    let hoverTimeout = null;

    function createHoverPane() {
        if (!hoverPane) {
            hoverPane = document.createElement("div");
            hoverPane.className = "hover-pane";
            document.body.appendChild(hoverPane);
        }
        return hoverPane;
    }

    function hideHoverPane() {
        if (hoverPane) {
            hoverPane.classList.remove("active");
        }
    }

    function showHoverPaneForNode(element, node, path) {
        const pane = createHoverPane();
        const childrenHTML = buildChildren(node, path);

        pane.innerHTML = childrenHTML;

        const rect = element.getBoundingClientRect();
        pane.style.left = `${rect.right + 10}px`;
        pane.style.top = `${rect.top}px`;

        setTimeout(() => {
            pane.classList.add("active");
        }, 50);

        // Attach hover handlers for nested navigation
        attachHoverPaneHandlers(pane);
        // Attach click handlers for opening sidebar
        attachHoverPaneClickHandlers(pane, path);
    }

    function attachHoverPaneHandlers(pane) {
        pane.querySelectorAll(".folder-leaf").forEach(leaf => {
            leaf.addEventListener("mouseenter", (e) => {
                e.stopPropagation();
                const path = leaf.dataset.path;
                const node = getNodeByPath(taxonomy, path);
                const hasKids = hasChildrenNode(node);

                if (hasKids) {
                    clearTimeout(hoverTimeout);
                    showHoverPaneForNode(leaf, node, path);
                }
            });
        });

        pane.addEventListener("mouseleave", () => {
            hoverTimeout = setTimeout(() => {
                hideHoverPane();
            }, 200);
        });

        pane.addEventListener("mouseenter", () => {
            clearTimeout(hoverTimeout);
        });
    }

    function attachHoverPaneClickHandlers(pane, basePath) {
        pane.querySelectorAll(".folder-leaf").forEach(leaf => {
            leaf.addEventListener("click", (e) => {
                e.stopPropagation();
                const clickedPath = leaf.dataset.path;
                const phaseKey = clickedPath.split("/")[0];

                // Open sidebar
                const sidebar = document.getElementById("sidebar");
                sidebar.classList.remove("collapsed");

                // Open the phase
                const navItem = document.querySelector(`.nav-item[data-phase="${phaseKey}"]`);
                if (navItem && !navItem.classList.contains("open")) {
                    navItem.classList.add("open");
                    navItem.querySelector(".btn")?.classList.add("active");
                }

                // Expand path to the clicked node
                expandPathTo(clickedPath);

                // Hide hover pane
                hideHoverPane();
            });
        });
    }

    function expandPathTo(targetPath) {
        const parts = targetPath.split("/");
        const phaseKey = parts[0];

        // Build path progressively
        for (let i = 1; i < parts.length; i++) {
            const partialPath = parts.slice(0, i + 1).join("/");
            const parentPath = parts.slice(0, i).join("/");

            const parentNode = document.querySelector(`.folder-leaf[data-path="${parentPath}"]`);
            if (parentNode) {
                const node = getNodeByPath(taxonomy, partialPath);
                const hasKids = hasChildrenNode(node);

                if (hasKids) {
                    // Check if already expanded
                    const next = parentNode.nextElementSibling;
                    const isOpen = !!(next && next.classList.contains("children-nested") && next.dataset.parent === parentPath);

                    if (!isOpen) {
                        // Expand it
                        const depth = depthFromPath(parentPath);
                        const nest = document.createElement("div");
                        nest.className = "children children-nested";
                        nest.dataset.parent = parentPath;
                        nest.style.setProperty("--level", depth);

                        nest.innerHTML = buildChildren(node, parentPath);
                        nest.style.maxHeight = "none";
                        nest.style.opacity = "1";
                        nest.style.paddingTop = "2px";

                        parentNode.after(nest);
                        markLastVisible(parentNode.parentElement);
                        markLastVisible(nest);
                        attachFolderLeafDrilldown(nest);
                        refreshAllVLinesDebounced(nest);
                    }
                }
            }
        }

        // Highlight and activate the final node
        const finalNode = document.querySelector(`.folder-leaf[data-path="${targetPath}"]`);
        if (finalNode) {
            document.querySelectorAll(".leaf.active, .folder-leaf.active, .section-title.active")
                .forEach(n => n.classList.remove("active"));
            finalNode.classList.add("active");
            phasePathMap.set(phaseKey, targetPath);
            highlightActivePath(phaseKey);

            // Scroll into view
            setTimeout(() => {
                finalNode.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
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

/* === Sidebar Auto-Grow (Dynamic Width Based on Content & Path) === */
(() => {
  "use strict";

  const CFG = {
    base: 320,           // Base width
    safety: 20,          // Extra padding for safety
    maxVW: 0.90,         // Max 90% of viewport width
    minPathWidth: 320,   // Minimum width for paths
    // All visible text elements including labels and folder names
    textSelectors: ".btn .label, .folder-leaf > span, .leaf > span, .section-title > span"
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

    // Calculate left position without considering transform
    const leftNoTransform = (el) => {
      let x = 0, n = el;
      while (n && n !== sidebar) {
        x += n.offsetLeft || 0;
        n = n.offsetParent;
      }
      return x;
    };

    // Check if element is in an open tree branch
    const isInOpenTree = (el) => {
      for (let p = el; p && p !== sidebar; p = p.parentElement) {
        // Check if parent is a collapsed phase
        if (p.classList.contains("children")) {
          const item = p.closest(".nav-item");
          if (!item || !item.classList.contains("open")) return false;
        }
        // Check if parent is a closed nested folder
        if (p.classList.contains("children-nested")) {
          // If it's not marked as open AND has max-height: 0, it's closed
          const style = getComputedStyle(p);
          const maxHeight = style.maxHeight;
          if (maxHeight === "0px") return false;
        }
      }
      return true;
    };

    // Compute the full path width for a folder-leaf element
    const getPathWidth = (el) => {
      if (!el || !el.dataset || !el.dataset.path) return 0;

      const path = el.dataset.path;
      const parts = path.split("/");

      // Calculate indentation based on depth
      const depth = parts.length - 1;
      const gutter = 28; // --gutter from CSS
      const indentation = depth * gutter;

      // Get the actual text width
      const span = el.querySelector("span");
      const textWidth = span ? (span.scrollWidth || span.offsetWidth) : 0;

      // Icon width + gap + text + indentation + safety
      const iconWidth = 16;
      const gap = 8;

      return indentation + iconWidth + gap + textWidth + CFG.safety;
    };

    const computeNeeded = () => {
      if (isCollapsed()) return null;

      const sidebarPadding = parseFloat(getComputedStyle(sidebar).paddingLeft) || 0;
      const padR = parseFloat(getComputedStyle(sidebar).paddingRight) || 0;
      let needed = CFG.base;

      // Check all visible text elements
      const labels = nav.querySelectorAll(CFG.textSelectors);
      for (const el of labels) {
        if (!el || !el.offsetParent) continue;

        const parent = el.closest(".folder-leaf, .leaf, .btn, .section-title");
        if (!parent) continue;

        // Only consider elements in open tree branches
        if (!isInOpenTree(parent)) continue;

        // Calculate required width based on position and content
        const left = leftNoTransform(el);
        const textWidth = el.scrollWidth || el.offsetWidth || 0;

        // For folder-leaf elements, also consider full path width
        if (parent.classList.contains("folder-leaf")) {
          const pathWidth = getPathWidth(parent);
          needed = Math.max(needed, pathWidth + padR);
        }

        // Calculate width needed for this element
        const requiredWidth = Math.ceil(left + textWidth + padR + CFG.safety);
        needed = Math.max(needed, requiredWidth);
      }

      // Ensure minimum path width
      needed = Math.max(needed, CFG.minPathWidth);

      // Cap at max viewport width
      return Math.min(needed, cap());
    };

    const apply = () => {
      const target = computeNeeded();
      if (target == null) return;

      const current = Math.round(parseFloat(getComputedStyle(sidebar).width));

      // Avoid unnecessary updates
      if (lastApplied !== null && Math.abs(lastApplied - target) <= 1) return;
      if (Math.abs(current - target) <= 1) {
        lastApplied = target;
        return;
      }

      sidebar.style.width = target + "px";
      lastApplied = target;

      // Refresh vertical lines after width change
      if (typeof window.refreshAllVLinesDebounced === "function") {
        window.refreshAllVLinesDebounced();
      } else if (typeof window.refreshAllVLines === "function") {
        window.refreshAllVLines();
      }
    };

    let ticking = false;
    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!isCollapsed()) apply();
      });
    };

    const onCollapseChange = () => {
      if (isCollapsed()) {
        // Reset to CSS default when collapsed
        sidebar.style.removeProperty("width");
        lastApplied = null;
      } else {
        // Recalculate when expanding
        setTimeout(schedule, 0);
        setTimeout(schedule, 220);
      }
    };

    // Watch for DOM changes in nav
    const moNav = new MutationObserver(schedule);
    moNav.observe(nav, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-open", "aria-expanded"]
    });

    // Watch for sidebar collapse/expand
    const moSidebar = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === "attributes" && m.attributeName === "class") {
          onCollapseChange();
          return;
        }
      }
      schedule();
    });
    moSidebar.observe(sidebar, {
      attributes: true,
      attributeFilter: ["class", "style"]
    });

    // Watch for resize of sidebar and nav
    const ro = new ResizeObserver(schedule);
    ro.observe(sidebar);
    ro.observe(nav);

    // Listen to transition end events to recalculate after animations
    nav.addEventListener("transitionend", e => {
      if (e.propertyName === "max-height" ||
          e.propertyName === "height" ||
          e.propertyName === "opacity" ||
          e.propertyName === "width") {
        schedule();
      }
    }, true);

    // Listen to window resize
    window.addEventListener("resize", schedule);

    // Initial calculation after sidebar is built
    setTimeout(schedule, 0);
    setTimeout(schedule, 300);
    setTimeout(schedule, 600);

    // Expose for manual triggering and debugging
    window.SidebarAutoGrow = { schedule, apply, computeNeeded };
  });
})();
