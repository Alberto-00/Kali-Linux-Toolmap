(() => {
    "use strict";

    // ==========================================================================
    // SEZIONE A · TAXONOMY & ICONS
    // ==========================================================================
    const taxonomy = {
        "00_Common": {
            "Metasploit_Plugins": {}, "Scripts": {}, "Tools_Windows": {}, "Wordlists": {}
        },
        "01_Information_Gathering": {
            "01_Recon": {
                "Infrastructure": {"DNS_Subdomains": {}},
                "Web": {
                    "Content_Discovery": {},
                    "Fingerprinting": {"Visual_Recon": {}, "WAF": {}},
                    "Params_Discovery": {}
                }
            },
            "02_Enumeration": {
                "Infrastructure": {"SMB": {}},
                "Web": {"API": {}, "CMS": {"Joomla": {}}, "Crawling": {"Active": {}}}
            }
        },
        "02_Exploitation": {
            "General": {},
            "Infrastructure": {"RTSP": {}},
            "Web": {
                "CMS_Exploits": {"Drupal": {}, "Joomla": {}, "WordPress": {}},
                "File_Upload": {},
                "Injection": {"LFI": {}, "XSS": {}, "XXE": {}},
                "Next_js": {},
                "Tomcat": {}
            }
        },
        "03_Post_Exploitation": {
            "AD_Windows": {"Kerberos_ADCS_Relay": {}, "Recon_Health": {}},
            "Credentials": {"Credentials_Hunting": {}, "Passwords_Cracking": {}},
            "Evasion": {}, "Pivoting": {}, "Privilege_Escalation": {"Linux": {}}, "Reverse_Engineering": {}
        },
        "04_Miscellaneous": {}
    };

    const formatLabel = (text) => String(text).replace(/_/g, " ").replace(/^\d+_/, "");
    const chevronSVG = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
    const folderSVG = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';

    const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
    const hasChildrenNode = (node) => isObject(node) && Object.keys(node).length > 0;

    // Variante locale per evitare conflitti con l'utility globale isVisible
    const isNodeVisible = (el) => !!(el && el.offsetParent !== null);

    // ==========================================================================
    // SEZIONE B · MEMORIA UNICA (path attivo + rami espansi) & UTILS
    // ==========================================================================

    // Una entry per ogni fase top-level:
    // {
    //   activePath: "Phase/.../Last",
    //   visited: { ...alberatura dei path visitati... },
    //   expanded: Set([...path che hanno il ramo aperto...])
    // }
    const phaseMemory = Object.fromEntries(
        Object.keys(taxonomy).map(phase => [
            phase,
            {activePath: null, visited: {}, expanded: new Set()}
        ])
    );

    function ensurePhase(phaseKey) {
        if (!phaseMemory[phaseKey]) {
            phaseMemory[phaseKey] = {activePath: null, visited: {}, expanded: new Set()};
        }
        return phaseMemory[phaseKey];
    }

    function setActivePath(phaseKey, fullPath) {
        const mem = ensurePhase(phaseKey);
        mem.activePath = fullPath;

        // aggiorna "visited" come albero (senza cancellare rami precedenti)
        const parts = fullPath.split("/").slice(1); // rimuovo la fase
        let node = mem.visited;
        for (const p of parts) {
            node[p] = node[p] || {};
            node = node[p];
        }
    }

    function getActivePath(phaseKey) {
        return ensurePhase(phaseKey).activePath || null;
    }

    function expandBranch(phaseKey, path) {
        ensurePhase(phaseKey).expanded.add(path);
    }

    // Rimuove un ramo e tutti i suoi discendenti dall'insieme expanded
    function collapseSubtree(phaseKey, pathPrefix) {
        const mem = ensurePhase(phaseKey);
        const toDrop = [];
        for (const p of mem.expanded) {
            if (p === pathPrefix || p.startsWith(pathPrefix + "/")) toDrop.push(p);
        }
        toDrop.forEach(p => mem.expanded.delete(p));
    }

    function getExpandedPaths(phaseKey) {
        // genitori prima dei figli (importante per creare i nested in ordine)
        return Array.from(ensurePhase(phaseKey).expanded)
            .sort((a, b) => a.split("/").length - b.split("/").length);
    }

    // ==========================================================================
    // SEZIONE C · BUILD & RENDER (NAV + CHILDREN)
    // ==========================================================================
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

    function markLastVisible(container) {
        if (!container) return;
        container.querySelectorAll(':scope > .folder-leaf.is-last-visible')
            .forEach(n => n.classList.remove('is-last-visible'));
        const visibles = Array.from(container.querySelectorAll(':scope > .folder-leaf'))
            .filter(isNodeVisible);
        if (visibles.length) visibles[visibles.length - 1].classList.add('is-last-visible');
    }

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

    // ==========================================================================
    // SEZIONE D · HIGHLIGHT (NAV) + HIGHLIGHT (RIQUADRO) + TEMA DI FASE
    // ==========================================================================
    function resetPathHighlight(navItem) {
        if (!navItem) return;
        navItem.classList.remove("has-active-path");
        navItem.querySelectorAll(".folder-leaf").forEach(el => el.classList.remove("in-active-path"));
        navItem.querySelectorAll(".children-nested").forEach(nested => nested.classList.remove("has-active-path"));
    }

    function clearAllPathHighlights() {
        document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("has-active-path"));
        document.querySelectorAll(".folder-leaf").forEach(el => el.classList.remove("in-active-path"));
        document.querySelectorAll(".children-nested").forEach(nested => nested.classList.remove("has-active-path"));
    }

    // Evidenzia il path attivo nel NAV (sidebar aperta)
    function highlightActivePath(phaseKey) {
        const navItem = document.querySelector(`.nav-item[data-phase="${phaseKey}"]`);
        if (!navItem) return;

        const activePath = getActivePath(phaseKey);

        if (!activePath) {
            navItem.classList.remove("has-active-path");
            resetPathHighlight(navItem);
            return;
        }

        navItem.classList.add("has-active-path");

        const pathParts = activePath.split("/");
        navItem.querySelectorAll(".folder-leaf").forEach(el => el.classList.remove("in-active-path"));

        for (let i = 1; i <= pathParts.length; i++) {
            const partialPath = pathParts.slice(0, i).join("/");
            const node = navItem.querySelector(`.folder-leaf[data-path="${partialPath}"]`);
            if (node) node.classList.add("in-active-path");
        }

        navItem.querySelectorAll(".children-nested").forEach(nested => {
            if (nested.querySelector(".folder-leaf.in-active-path")) nested.classList.add("has-active-path");
            else nested.classList.remove("has-active-path");
        });
    }

    function highlightPathInContainer(container, activePath) {
        if (!container) return;

        // RESET COMPLETO E FORZATO
        // Rimuovi tutte le classi di evidenziazione in un singolo passaggio
        const allElements = container.querySelectorAll(".folder-leaf, .leaf, .section-title");
        allElements.forEach(el => {
            el.classList.remove("in-active-path");
            // NON rimuoviamo .active qui perché indica l'ultimo click
        });

        // Reset dei contenitori (children e nested)
        const allContainers = container.querySelectorAll(".children, .children-nested");
        allContainers.forEach(n => {
            n.classList.remove("has-active-path");
        });

        // Se non c'è un path attivo, ci fermiamo qui (reset completo)
        if (!activePath) return;

        // APPLICAZIONE DEL NUOVO PATH
        // Ora applichiamo le classi per il nuovo path
        const parts = activePath.split("/");
        const nodesToHighlight = [];

        // Raccogliamo prima tutti i nodi da evidenziare
        for (let i = 1; i <= parts.length; i++) {
            const partial = parts.slice(0, i).join("/");
            const node = container.querySelector(
                `.folder-leaf[data-path="${partial}"], .leaf[data-path="${partial}"]`
            );
            if (node) nodesToHighlight.push(node);
        }

        // Applichiamo la classe in un singolo batch
        nodesToHighlight.forEach(node => node.classList.add("in-active-path"));

        // Infine aggiorniamo i contenitori che hanno nodi evidenziati
        allContainers.forEach(n => {
            // SOLO se il path passa da UNO DEI FIGLI DIRETTI di questo contenitore
            let directNodes = [];
            if (typeof getDirectNodes === 'function') {
                directNodes = getDirectNodes(n);
            } else {
                directNodes = Array.from(n.querySelectorAll(':scope > .leaf, :scope > .folder-leaf, :scope > .section-title'));
            }
            const shouldColor = directNodes.some(el => el.classList.contains('in-active-path'));
            if (shouldColor) n.classList.add('has-active-path');
            else n.classList.remove('has-active-path');
        });
    }

    // Copia le CSS custom properties di fase dal nav-item al riquadro (colore linee, ecc.)
    function applyPhaseThemeToPane(pane, phaseKey, {preserveUserSpacing = true} = {}) {
        const navItem = document.querySelector(`.nav-item[data-phase="${phaseKey}"]`);
        if (!navItem || !pane) return;

        const cs = getComputedStyle(navItem);
        // Copiamo SOLO le variabili necessarie al tema, evitando di ereditare i colori dei connettori
        // dallo stato del NAV (che potrebbe forzare linee colorate ovunque).
        const propsToCopy = [
            '--phase',
            '--gutter', '--tree-x', '--tree-w',
            '--elbow-w', '--elbow-h', '--elbow-top'
        ];

        // 1) Override spacing utente (prima, così "preserve" lo protegge)
        const G = 18;
        if (!pane.style.getPropertyValue('--gutter')) {
            pane.style.setProperty('--gutter', `${G}px`);
        }
        const elbowW = parseFloat(cs.getPropertyValue('--elbow-w')) || 16;
        if (!pane.style.getPropertyValue('--tree-x')) {
            pane.style.setProperty('--tree-x', `${Math.max(0, G - elbowW)}px`);
        }

        // 2) Copia tema della fase senza sovrascrivere gli override inline
        propsToCopy.forEach(p => {
            if (preserveUserSpacing && (p === '--gutter' || p === '--tree-x')) {
                if (pane.style.getPropertyValue(p)) return;
            }
            const v = cs.getPropertyValue(p);
            if (v) pane.style.setProperty(p, v.trim());
        });

        // 3) Per l'hover-pane forziamo connettori neutri: solo il percorso attivo sarà colorato
        if (pane.classList && pane.classList.contains('hover-pane')) {
            pane.style.setProperty('--tree-stroke', 'rgba(255, 255, 255, 0.12)');
            pane.style.setProperty('--tree-stroke-fade', 'rgba(255, 255, 255, 0.08)');
        } else {
            // NAV mantiene i valori calcolati dal nav-item
            const ts = cs.getPropertyValue('--tree-stroke');
            const tsf = cs.getPropertyValue('--tree-stroke-fade');
            if (ts) pane.style.setProperty('--tree-stroke', ts.trim());
            if (tsf) pane.style.setProperty('--tree-stroke-fade', tsf.trim());
        }

        pane.dataset.phase = phaseKey;
    }

    function syncPaneColors(phaseKey) {
        if (!hoverPane) return;
        const current = getActivePath(phaseKey);

        // 1) Reset esplicito
        highlightPathInContainer(hoverPane, null);

        // 2) Forza reflow
        void hoverPane.offsetHeight;

        // 3) Applica il nuovo path
        highlightPathInContainer(hoverPane, current);

        // 4) Nella prossima frame: aggiorna V-lines e ribatti l'highlight per sicurezza
        requestAnimationFrame(() => {
            refreshAllVLines(hoverPane);
            // Doppio colpo per garantire che le classi CSS siano processate
            queueMicrotask(() => highlightPathInContainer(hoverPane, current));
        });
    }


    // ==========================================================================
    // SEZIONE E · SYNC ESPANSIONI: materializzare memoria in NAV o nel riquadro
    // ==========================================================================
    function ensureExpandedInContainer(container, path) {
        const leaf = container.querySelector(`.folder-leaf[data-path="${path}"]`);
        if (!leaf) return;

        const next = leaf.nextElementSibling;
        if (next && next.classList?.contains("children-nested") && next.dataset.parent === path) return;

        const node = getNodeByPath(taxonomy, path);
        if (!hasChildrenNode(node)) return;

        const depth = depthFromPath(path);
        const nest = document.createElement("div");
        nest.className = "children children-nested";
        nest.dataset.parent = path;
        nest.style.setProperty("--level", depth);
        nest.innerHTML = buildChildren(node, path);

        // apro subito, senza animazione (per ricostruire stato memorizzato)
        nest.style.maxHeight = "none";
        nest.style.opacity = "1";
        nest.style.paddingTop = "2px";

        leaf.after(nest);
        markLastVisible(leaf.parentElement);
        markLastVisible(nest);
        attachFolderLeafDrilldown(nest);
    }

    function ensureHoverPaneStyles() {
        if (document.getElementById('hover-pane-styles')) return;
        const css = `
          .hover-pane .children.has-active-path::before,
          .hover-pane .children-nested.has-active-path::before {
            background: var(--phase);
            width: 3px;
          }
          .hover-pane .folder-leaf.in-active-path::before,
          .hover-pane .leaf.in-active-path::before {
            border-left-color: var(--phase);
            border-bottom-color: var(--phase);
            border-left-width: 3px;
            border-bottom-width: 3px;
          }
          .hover-pane .folder-leaf.in-active-path,
          .hover-pane .leaf.in-active-path {
            color: var(--phase);
            font-weight: 600;
          }
          .hover-pane .folder-leaf.active {
            background: color-mix(in srgb, var(--phase) 15%, transparent);
            box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--phase) 30%, transparent);
          }`.trim();

        const style = document.createElement('style');
        style.id = 'hover-pane-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }


    function expandFromMemoryInContainer(container, phaseKey) {
        const paths = getExpandedPaths(phaseKey);
        for (const p of paths) ensureExpandedInContainer(container, p);
        refreshAllVLinesDebounced(container);

        const current = getActivePath(phaseKey);
        if (container.classList && container.classList.contains("hover-pane")) {
            // dentro riquadro
            highlightPathInContainer(container, current);
            if (current) {
                const last = container.querySelector(`.folder-leaf[data-path="${current}"]`);
                if (last) {
                    container.querySelectorAll(".folder-leaf.active").forEach(n => n.classList.remove("active"));
                    last.classList.add("active");
                }
            }
        } else {
            // nel NAV
            highlightActivePath(phaseKey);
        }
    }

    // ==========================================================================
    // SEZIONE F · INTERAZIONE NEL NAV (sidebar aperta) + TOGGLES
    // ==========================================================================
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

                // Memoria UNICA + highlight
                setActivePath(phaseKey, path);
                highlightActivePath(phaseKey);

                // BG sull'ultimo nodo cliccato
                document.querySelectorAll(".leaf.active, .folder-leaf.active, .section-title.active")
                    .forEach(n => n.classList.remove("active"));
                el.classList.add("active");

                // Se terminale → finito
                if (!hasKids) return;

                // Toggle children-nested
                const next = el.nextElementSibling;
                const isOpen = !!(next && next.classList.contains("children-nested") && next.dataset.parent === path);

                if (isOpen) {
                    // CHIUDI + aggiorna memoria espansa
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
                        collapseSubtree(phaseKey, path); // <<< memoria
                        refreshAllVLinesDebounced();
                    }, {once: true});

                    return;
                }

                // APRI + aggiorna memoria espansa
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
                    expandBranch(phaseKey, path); // <<< memoria
                    refreshAllVLinesDebounced();
                };
                nest.addEventListener("transitionend", onOpenEnd);

                attachFolderLeafDrilldown(nest);
            });
        });
    }

    // Gestione fasi (open/close) + hover per riquadro quando collapsed
    function attachPhaseToggles() {
        const sidebar = document.getElementById("sidebar");

        document.querySelectorAll(".nav-item.has-children > .btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const navItem = btn.closest(".nav-item");
                const phaseKey = navItem.dataset.phase;
                const wasOpen = navItem.classList.contains("open");

                // Se collapsed → apri sidebar e questa fase
                if (sidebar && sidebar.classList.contains("collapsed")) {
                    sidebar.classList.remove("collapsed");
                    hideHoverPane();

                    navItem.classList.add("open");
                    btn.classList.add("active");

                    // Clean any stale nested nodes so we rebuild strictly from memory
                    navItem.querySelectorAll('.children-nested').forEach(n => n.remove());

                    // First reconstruct expansions from memory, THEN highlight
                    expandFromMemoryInContainer(navItem, phaseKey);

                    // Apply highlighting after expansion is complete
                    requestAnimationFrame(() => {
                        highlightActivePath(phaseKey);
                        refreshAllVLinesDebounced(navItem);
                    });

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

                    // Ricostruisci espansioni memorizzate
                    expandFromMemoryInContainer(navItem, phaseKey);
                } else {
                    navItem.classList.remove("open");
                    btn.classList.remove("active");
                    resetPathHighlight(navItem);
                }
            });

            // Hover → riquadro quando sidebar è collapsed
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
                    }, 280);
                }
            });
        });

        // Se il mouse entra nel riquadro, non chiudere
        document.addEventListener("mouseenter", (e) => {
            if (e.target.closest(".hover-pane")) {
                clearTimeout(hoverTimeout);
            }
        }, true);
    }

    function positionFlyouts() {
        // (lasciato per compatibilità con eventuale .flyout interno)
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

    // ==========================================================================
    // SEZIONE G · SIDEBAR CONTROLS (collapse/open + search) + stile richiesto
    // ==========================================================================
    function attachSidebarControls() {
        const sidebar = document.getElementById("sidebar");
        const collapseBtn = document.getElementById("collapseBtn");
        const collapseAllBtn = document.getElementById("collapseAllBtn");
        const expandAllBtn = document.getElementById("expandAllBtn");
        const headerActions = document.querySelector(".header-actions");

        // Punti 1–3: gap/margini dinamici quando si chiude/apre la sidebar
        function applyCollapsedStyle() {
            const isColl = sidebar.classList.contains("collapsed");

            // 1) .header-actions gap 6→0
            if (headerActions) headerActions.style.gap = isColl ? "0px" : "6px";

            // 2) .btn gap 10→0
            sidebar.querySelectorAll(".btn").forEach(b => {
                b.style.gap = isColl ? "0px" : "10px";
            });

            // 3) .toggle, .icon-btn margin-left -5px quando chiusa
            sidebar.querySelectorAll(".toggle, .icon-btn").forEach(el => {
                if (isColl) el.style.marginLeft = "-5px";
                else el.style.removeProperty("margin-left");
            });
        }

        if (collapseBtn) {
            collapseBtn.addEventListener("click", () => {
                sidebar.classList.toggle("collapsed");
                applyCollapsedStyle();

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

        // Se clicco l'area .header-actions e altrove scatta il toggle, riapplica gli stili
        if (headerActions) {
            headerActions.addEventListener("click", () => setTimeout(applyCollapsedStyle, 0));
        }

        // Observer su classe 'collapsed'
        const moCollapsed = new MutationObserver(muts => {
            for (const m of muts) {
                if (m.type === "attributes" && m.attributeName === "class") {
                    applyCollapsedStyle();
                }
            }
        });
        moCollapsed.observe(sidebar, {attributes: true, attributeFilter: ["class"]});

        // Stato iniziale
        applyCollapsedStyle();

        if (collapseAllBtn) {
            collapseAllBtn.addEventListener("click", () => {
                document.querySelectorAll(".nav-item.open").forEach(item => {
                    item.classList.remove("open");
                    item.querySelector(".btn")?.classList.remove("active");
                });
                document.querySelectorAll(".children-nested").forEach(nested => nested.remove());
                clearAllPathHighlights();

                // svuota memoria espansa (opzionale: commenta se non la vuoi svuotare)
                Object.keys(phaseMemory).forEach(k => phaseMemory[k].expanded.clear());
                refreshAllVLinesDebounced();
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
                        expandFromMemoryInContainer(item, phaseKey);
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
                        const phaseKey = item.dataset.phase;
                        expandFromMemoryInContainer(item, phaseKey);
                    }
                });
                document.querySelectorAll('.children, .children-nested').forEach(markLastVisible);
                refreshAllVLinesDebounced();
            });
        }
    }

    // ==========================================================================
    // SEZIONE H · RIQUADRO (hover-pane) sincronizzato con NAV
    // ==========================================================================
    let hoverPane = null;
    let hoverTimeout = null;

    function createHoverPane() {
        if (!hoverPane) {
            hoverPane = document.createElement("div");
            hoverPane.className = "hover-pane";
            document.body.appendChild(hoverPane);

            // keep-alive hover
            hoverPane.addEventListener("mouseenter", () => clearTimeout(hoverTimeout));
            hoverPane.addEventListener("mouseleave", () => {
                hoverTimeout = setTimeout(() => hideHoverPane(), 280);
            });

            // Delegation: click dentro il riquadro → espandi/chiudi in-place + sync memoria
            hoverPane.addEventListener("click", (e) => {
                const leaf = e.target.closest(".folder-leaf");
                if (!leaf || !hoverPane.contains(leaf)) return;

                const clickedPath = leaf.dataset.path;
                const phaseKey = clickedPath.split("/")[0];
                const node = getNodeByPath(taxonomy, clickedPath);
                const hasKids = hasChildrenNode(node);

                // 1) Memoria unica - This updates the memory for BOTH sidebar and hover pane
                setActivePath(phaseKey, clickedPath);

                // 2) RESET COMPLETO del riquadro PRIMA di qualsiasi altra operazione
                highlightPathInContainer(hoverPane, null); // reset esplicito
                hoverPane.querySelectorAll(".folder-leaf.active, .leaf.active").forEach(n => n.classList.remove("active"));

                // 3) Forza il browser a processare il reset
                void hoverPane.offsetHeight;

                // 4) Ora applica il tema e il nuovo path
                applyPhaseThemeToPane(hoverPane, phaseKey, {preserveUserSpacing: true});
                void hoverPane.offsetHeight; // secondo reflow dopo il tema

                // 5) Applica il nuovo highlight (sia nel NAV che nel riquadro)
                highlightActivePath(phaseKey); // Updates NAV sidebar
                leaf.classList.add("active");
                highlightPathInContainer(hoverPane, clickedPath); // Updates hover pane

                // 6) Aggiorna le linee verticali
                refreshAllVLines(hoverPane);


                // 3) Toggle in-place con linee corrette
                if (hasKids) {
                    const next = leaf.nextElementSibling;
                    const isOpen = !!(next && next.classList.contains("children-nested") && next.dataset.parent === clickedPath);

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
                            markLastVisible(leaf.parentElement);
                            collapseSubtree(phaseKey, clickedPath); // memoria - syncs to main sidebar
                            refreshAllVLinesDebounced(hoverPane);

                            // FIX: Sync colors and highlight properly
                            const currentPath = getActivePath(phaseKey);
                            highlightPathInContainer(hoverPane, null);
                            void hoverPane.offsetHeight;
                            highlightPathInContainer(hoverPane, currentPath);
                            highlightActivePath(phaseKey); // Sync NAV sidebar too
                        }, {once: true});
                        return;
                    }

                    const depth = depthFromPath(clickedPath);
                    const nest = document.createElement("div");
                    nest.className = "children children-nested";
                    nest.dataset.parent = clickedPath;
                    nest.style.setProperty("--level", depth);
                    nest.innerHTML = buildChildren(node, clickedPath);

                    // animazione apertura
                    nest.style.maxHeight = "0px";
                    nest.style.opacity = "0";
                    nest.style.paddingTop = "0px";

                    leaf.after(nest);
                    markLastVisible(leaf.parentElement);
                    markLastVisible(nest);

                    const target = nest.scrollHeight;
                    void nest.getBoundingClientRect();
                    nest.style.maxHeight = `${target}px`;
                    nest.style.opacity = "1";
                    nest.style.paddingTop = "2px";

                    const onOpenEnd = () => {
                        nest.removeEventListener("transitionend", onOpenEnd);
                        if (document.body.contains(nest) && nest.style.opacity === "1") {
                            nest.style.maxHeight = "none";
                        }
                        expandBranch(phaseKey, clickedPath); // memoria - syncs to main sidebar
                        refreshAllVLinesDebounced(hoverPane);

                        // FIX: Sync colors and highlight properly
                        const currentPath = getActivePath(phaseKey);
                        highlightPathInContainer(hoverPane, null);
                        void hoverPane.offsetHeight;
                        highlightPathInContainer(hoverPane, currentPath);
                        highlightActivePath(phaseKey); // Sync NAV sidebar too
                    };
                    nest.addEventListener("transitionend", onOpenEnd);
                } else {
                    // terminale: aggiorna linee/path e resta aperto
                    refreshAllVLinesDebounced(hoverPane);

                    // FIX: Sync colors and highlight properly
                    const currentPath = getActivePath(phaseKey);
                    highlightPathInContainer(hoverPane, null);
                    void hoverPane.offsetHeight;
                    highlightPathInContainer(hoverPane, currentPath);
                    highlightActivePath(phaseKey); // Sync NAV sidebar too
                }
            });
        }
        return hoverPane;
    }

    function hideHoverPane() {
        if (hoverPane) {
            hoverPane.classList.remove("active");
            // non svuotiamo l'HTML per evitare flash; verrà rimpiazzato al prossimo show
        }
    }

    // Costruisce il riquadro per una fase, con root "children-nested" (linee subito visibili)
    function showHoverPaneForNode(element, node, path) {
        ensureHoverPaneStyles();

        const pane = createHoverPane();
        // FIX: path is actually phaseKey when called from button hover
        const phaseKey = path.includes("/") ? path.split("/")[0] : path;
        const childrenHTML = buildChildren(node, phaseKey);

        pane.innerHTML = `
    <div class="children children-nested hover-root" data-parent="${phaseKey}" style="--level: 1">
      ${childrenHTML}
    </div>
  `;

        // Posizionamento
        const fromPane = !!(element.closest && element.closest(".hover-pane"));
        if (!fromPane) {
            const rect = element.getBoundingClientRect();
            pane.style.left = `${rect.right + 10}px`;
            pane.style.top = `${rect.top}px`;
        }

        // Stabilizza DOM
        const rootChildren = pane.querySelector(".hover-root");
        markLastVisible(rootChildren);

        // CRITICO: applica tema E forza reflow PRIMA di ricostruire espansioni
        applyPhaseThemeToPane(pane, phaseKey, {preserveUserSpacing: true});
        void pane.offsetHeight; // Forza il browser a calcolare le CSS vars

        // Solo DOPO il reflow ricostruisci lo stato memorizzato
        expandFromMemoryInContainer(pane, phaseKey);

        // Attiva l'animazione di fade-in del riquadro
        setTimeout(() => pane.classList.add("active"), 40);

        // NELLA FRAME SUCCESSIVA: clamp + highlight completo e sincrono
        requestAnimationFrame(() => {
            const currentPath = getActivePath(phaseKey);
            refreshAllVLines(pane); // sincrono, non debounced

            // FIX: Apply highlighting with proper sync
            if (currentPath) {
                // First reset
                highlightPathInContainer(pane, null);
                void pane.offsetHeight;

                // Then apply the active path
                highlightPathInContainer(pane, currentPath);

                // Mark the active leaf
                const activeLeaf = pane.querySelector(`.folder-leaf[data-path="${currentPath}"], .leaf[data-path="${currentPath}"]`);
                if (activeLeaf) {
                    pane.querySelectorAll(".folder-leaf.active, .leaf.active").forEach(n => n.classList.remove("active"));
                    activeLeaf.classList.add("active");
                }
            }
        });

        attachHoverPaneHandlers(pane);
    }

    function attachHoverPaneHandlers(pane) {
        // Evita timeout di chiusura quando sorvoli i leaf
        pane.querySelectorAll(".folder-leaf").forEach(leaf => {
            leaf.addEventListener("mouseenter", () => clearTimeout(hoverTimeout));
        });
    }

    // ==========================================================================
    // SEZIONE I · BOOTSTRAP
    // ==========================================================================
    document.addEventListener("DOMContentLoaded", () => {
        window.taxonomy = taxonomy; // opzionale: utile se servono introspezioni
        buildNav();
        attachSidebarControls();
    });

})(); // end IIFE principale

// ============================================================================
// SEZIONE L · V-LINE CLAMP UTILITIES (GLOBALI)
// ============================================================================

// Visibilità generica (usata per clamp delle V-line)
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
    if (!Number.isNaN(elbowH)) endY = last.offsetTop + elbowTop + (elbowH / 2);
    else endY = last.offsetTop + (last.offsetHeight / 2);

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
    if (endPx == null) container.style.removeProperty('--vline-end');
    else container.style.setProperty('--vline-end', endPx + 'px');
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

// ============================================================================
// SEZIONE M · SIDEBAR AUTO-GROW (larghezza dinamica) - invariata, ripulita
// ============================================================================
(() => {
    "use strict";

    const CFG = {
        base: 320,          // base width
        safety: 20,         // padding di sicurezza
        maxVW: 0.90,        // max 90% viewport
        minPathWidth: 320,  // larghezza minima
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

        // posizione X relativa senza considerare eventuali transform
        const leftNoTransform = (el) => {
            let x = 0, n = el;
            while (n && n !== sidebar) {
                x += n.offsetLeft || 0;
                n = n.offsetParent;
            }
            return x;
        };

        // True se il nodo è in un ramo attualmente visibile (fase aperta e nested aperti)
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

        // Calcola la larghezza necessaria per un folder-leaf in base al path/indentazione
        const getPathWidth = (el) => {
            if (!el || !el.dataset || !el.dataset.path) return 0;

            const path = el.dataset.path;
            const parts = path.split("/");
            const depth = parts.length - 1;
            const gutter = 28; // deve coincidere con il CSS
            const indentation = depth * gutter;

            const span = el.querySelector("span");
            const textWidth = span ? (span.scrollWidth || span.offsetWidth) : 0;

            const iconWidth = 16;
            const gap = 8;

            return indentation + iconWidth + gap + textWidth + CFG.safety;
        };

        const computeNeeded = () => {
            if (isCollapsed()) return null;

            const padR = parseFloat(getComputedStyle(sidebar).paddingRight) || 0;
            let needed = CFG.base;

            const labels = nav.querySelectorAll(CFG.textSelectors);
            for (const el of labels) {
                if (!el || !el.offsetParent) continue;

                const parent = el.closest(".folder-leaf, .leaf, .btn, .section-title");
                if (!parent) continue;

                if (!isInOpenTree(parent)) continue;

                const left = leftNoTransform(el);
                const textWidth = el.scrollWidth || el.offsetWidth || 0;

                if (parent.classList.contains("folder-leaf")) {
                    const pathWidth = getPathWidth(parent);
                    needed = Math.max(needed, pathWidth + padR);
                }

                const requiredWidth = Math.ceil(left + textWidth + padR + CFG.safety);
                needed = Math.max(needed, requiredWidth);
            }

            needed = Math.max(needed, CFG.minPathWidth);
            return Math.min(needed, cap());
        };

        const apply = () => {
            const target = computeNeeded();
            if (target == null) return;

            const current = Math.round(parseFloat(getComputedStyle(sidebar).width));
            if (lastApplied !== null && Math.abs(lastApplied - target) <= 1) return;
            if (Math.abs(current - target) <= 1) {
                lastApplied = target;
                return;
            }

            sidebar.style.width = target + "px";
            lastApplied = target;

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
                sidebar.style.removeProperty("width");
                lastApplied = null;
            } else {
                setTimeout(schedule, 0);
                setTimeout(schedule, 220);
            }
        };

        const moNav = new MutationObserver(schedule);
        moNav.observe(nav, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "style", "data-open", "aria-expanded"]
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

        const ro = new ResizeObserver(schedule);
        ro.observe(sidebar);
        ro.observe(nav);

        nav.addEventListener("transitionend", e => {
            if (e.propertyName === "max-height" ||
                e.propertyName === "height" ||
                e.propertyName === "opacity" ||
                e.propertyName === "width") {
                schedule();
            }
        }, true);

        window.addEventListener("resize", schedule);

        setTimeout(schedule, 0);
        setTimeout(schedule, 300);
        setTimeout(schedule, 600);

        window.SidebarAutoGrow = {schedule, apply, computeNeeded};
    });
})();