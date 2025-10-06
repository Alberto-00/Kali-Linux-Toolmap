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
  const folderSVG  = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>';

  // === ICONS registry ========================================================
  const ICONS = {
    defaults: { folderClosed: folderSVG, folderOpen: folderSVG, terminal: chevronSVG },
    byPath:   {},
    byPrefix: {}
  };

  const svg_common =
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="4 17 10 11 4 5"></polyline>' +
    '<line x1="12" x2="20" y1="19" y2="19"></line>' +
    '</svg>';

  const svg_inf_gather =
    '<svg class="icon"  stroke="currentColor" stroke-width="2" viewBox="-0.5 0 25 25" fill="none" >' +
    '<path d="M22 11.8201C22 9.84228 21.4135 7.90885 20.3147 6.26436C19.2159 4.61987 17.6542 3.33813 15.8269 2.58126C13.9996 1.82438 11.9889 1.62637 10.0491 2.01223C8.10927 2.39808 6.32748 3.35052 4.92896 4.74904C3.53043 6.14757 2.578 7.92935 2.19214 9.86916C1.80629 11.809 2.00436 13.8197 2.76123 15.6469C3.51811 17.4742 4.79985 19.036 6.44434 20.1348C8.08883 21.2336 10.0222 21.8201 12 21.8201"/>' +
    '<path d="M2 11.8201H22"/>' +
    '<path d="M12 21.8201C10.07 21.8201 8.5 17.3401 8.5 11.8201C8.5 6.30007 10.07 1.82007 12 1.82007C13.93 1.82007 15.5 6.30007 15.5 11.8201"/>' +
    '<path d="M18.3691 21.6901C20.3021 21.6901 21.8691 20.1231 21.8691 18.1901C21.8691 16.2571 20.3021 14.6901 18.3691 14.6901C16.4361 14.6901 14.8691 16.2571 14.8691 18.1901C14.8691 20.1231 16.4361 21.6901 18.3691 21.6901Z"/>' +
    '<path d="M22.9998 22.8202L20.8398 20.6702"/>' +
    '</svg>';

  const svg_exploit =
    '<svg class="icon" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" fill="none">' +
    '<path d="M7 14.3333C7 13.0872 7 12.4641 7.26795 12C7.44349 11.696 7.69596 11.4435 8 11.2679C8.4641 11 9.08718 11 10.3333 11H13.6667C14.9128 11 15.5359 11 16 11.2679C16.304 11.4435 16.5565 11.696 16.7321 12C17 12.4641 17 13.0872 17 14.3333V16C17 16.9293 17 17.394 16.9231 17.7804C16.6075 19.3671 15.3671 20.6075 13.7804 20.9231C13.394 21 12.9293 21 12 21V21C11.0707 21 10.606 21 10.2196 20.9231C8.63288 20.6075 7.39249 19.3671 7.07686 17.7804C7 17.394 7 16.9293 7 16V14.3333Z" />' +
    '<path d="M9 9C9 8.06812 9 7.60218 9.15224 7.23463C9.35523 6.74458 9.74458 6.35523 10.2346 6.15224C10.6022 6 11.0681 6 12 6V6C12.9319 6 13.3978 6 13.7654 6.15224C14.2554 6.35523 14.6448 6.74458 14.8478 7.23463C15 7.60218 15 8.06812 15 9V11H9V9Z"/>' +
    '<path d="M12 11V15" />' +
    '<path d="M15 3L13 6" />' +
    '<path d="M9 3L11 6" />' +
    '<path d="M7 16H2"/>' +
    '<path d="M22 16H17"/>' +
    '<path d="M20 9V10C20 11.6569 18.6569 13 17 13V13" />' +
    '<path d="M20 22V22C20 20.3431 18.6569 19 17 19V19"/>' +
    '<path d="M4 9V10C4 11.6569 5.34315 13 7 13V13" />' +
    '<path d="M4 22V22C4 20.3431 5.34315 19 7 19V19"/>' +
    '</svg>';

  const svg_post_exploit =
    '<svg class="icon" fill="none" stroke-width="35" stroke="currentColor" viewBox="0 0 512 512">' +
    '<path d="M265.394,179.642v-27.998h-18.788v27.998c-35.003,4.265-62.699,31.969-66.964,66.964h-27.997v18.787h27.997 c4.265,34.995,31.961,62.7,66.964,66.964v27.989h18.788v-27.989c35.003-4.265,62.7-31.97,66.964-66.964h27.998v-18.787h-27.998 C328.093,211.611,300.397,183.907,265.394,179.642z M246.606,308.635c-11.003-1.961-20.824-7.215-28.442-14.799 c-7.6-7.618-12.846-17.44-14.799-28.442h43.241V308.635z M246.606,246.606h-43.241c1.953-11.004,7.198-20.833,14.799-28.442 c7.618-7.593,17.439-12.855,28.442-14.799V246.606z M293.836,293.836c-7.617,7.584-17.431,12.838-28.442,14.799v-43.241h43.241 C306.69,276.396,301.436,286.218,293.836,293.836z M265.394,246.606v-43.241c11.011,1.944,20.825,7.206,28.442,14.799 c7.6,7.609,12.854,17.438,14.799,28.442H265.394z"/>' +
    '<path d="M457.605,244.252C451.739,142.065,369.934,60.26,267.748,54.395V0h-23.489v54.395 C142.066,60.26,60.261,142.058,54.395,244.252H0v23.497h54.395c5.866,102.178,87.671,183.991,189.864,189.857V512h23.489v-54.395 c102.185-5.866,183.991-87.679,189.857-189.857H512v-23.497H457.605z M434.058,267.748c-2.9,44.616-22.115,84.705-51.856,114.454 c-29.749,29.724-69.838,48.956-114.454,51.856v-23.053h-23.489v23.053c-44.624-2.9-84.721-22.132-114.462-51.856 c-29.741-29.749-48.948-69.838-51.856-114.454h23.053v-23.497H77.942c2.908-44.623,22.114-84.705,51.856-114.462 c29.74-29.733,69.822-48.948,114.462-51.847v23.053h23.489V77.942c44.616,2.899,84.713,22.123,114.462,51.847 c29.732,29.758,48.947,69.839,51.847,114.462h-23.054v23.497H434.058z"/>' +
    '</svg>';

  ICONS.byPrefix['00_Common'] = { open: svg_common, closed: svg_common, terminal: svg_common };
  ICONS.byPrefix['01_Information_Gathering'] = { open: svg_inf_gather, closed: svg_inf_gather, terminal: svg_inf_gather };
  ICONS.byPrefix['02_Exploitation'] = { open: svg_exploit, closed: svg_exploit, terminal: svg_exploit };
  ICONS.byPrefix['03_Post_Exploitation'] = { open: svg_post_exploit, closed: svg_post_exploit, terminal: svg_post_exploit };

  // Icone dei path per le cards (se usate altrove)
  window.SIDEBAR_ICONS = {
    common: svg_common,
    information_gathering: svg_inf_gather,
    exploitation: svg_post_exploit,
    post_exploitation: svg_post_exploit,
    miscellaneous: folderSVG
  };

  const ICON_MAP = new Map();

  const isObject        = (v) => v && typeof v === "object" && !Array.isArray(v);
  const hasChildrenNode = (n) => isObject(n) && Object.keys(n).length > 0;
  const isNodeVisible   = (el) => !!(el && el.offsetParent !== null);

  function getIconStatic(path, hasKids) {
    // byPath esatto
    let v = ICONS.byPath[path];
    if (v) return (typeof v === 'string')
      ? v
      : (hasKids ? (v.closed || v.any || ICONS.defaults.folderClosed)
                 : (v.terminal || v.any || v.closed || ICONS.defaults.folderClosed));

    // byPrefix più lungo
    let bestKey = null;
    for (const key of Object.keys(ICONS.byPrefix)) {
      if (path.startsWith(key) && (!bestKey || key.length > bestKey.length)) bestKey = key;
    }
    const vp = bestKey ? ICONS.byPrefix[bestKey] : null;
    if (vp) return (typeof vp === 'string')
      ? (!hasKids ? vp : ICONS.defaults.folderClosed)
      : (hasKids ? (vp.closed || vp.any || ICONS.defaults.folderClosed)
                 : (vp.terminal || vp.any || vp.closed || ICONS.defaults.folderClosed));

    // eredita dal padre (solo leaf)
    if (!hasKids) {
      const parts = path.split('/');
      for (let i = parts.length - 2; i >= 0; i--) {
        const anc = parts.slice(0, i+1).join('/');
        const va = ICONS.byPath[anc];
        if (va) return (typeof va === 'string')
          ? va
          : (va.terminal || va.any || va.closed || ICONS.defaults.folderClosed);
      }
    }
    return ICONS.defaults.folderClosed;
  }

  function precomputeIconMap() {
    (function walk(node, base = '') {
      for (const [k, sub] of Object.entries(node)) {
        const path = base ? `${base}/${k}` : k;
        const kids = hasChildrenNode(sub);
        ICON_MAP.set(path, getIconStatic(path, kids));
        walk(sub, path);
      }
    })(taxonomy);
  }

  // ==========================================================================
  // SEZIONE B · MEMORIA (path attivo + rami espansi) & UTILS
  // ==========================================================================
  const MEM = {
    collapsed: 'tm:sidebar:collapsed',
    pathKey:   'tm:active:path',   // es. "Root>01_Information_Gathering>Web"
    pathSlash: 'tm:active:slash'   // es. "01_Information_Gathering/Web"
  };

  // per fase
  const phaseMemory = Object.fromEntries(
    Object.keys(taxonomy).map(phase => [phase, { activePathSlash: null, expanded: new Set() }])
  );
  function ensurePhase(phaseKey) {
    if (!phaseMemory[phaseKey]) phaseMemory[phaseKey] = { activePathSlash: null, expanded: new Set() };
    return phaseMemory[phaseKey];
  }
  function setActivePathSlash(phaseKey, fullSlash) {
    ensurePhase(phaseKey).activePathSlash = fullSlash;
  }
  function getActivePathSlash(phaseKey) {
    return ensurePhase(phaseKey).activePathSlash || null;
  }
  function expandBranch(phaseKey, path) {
    ensurePhase(phaseKey).expanded.add(path);
  }
  function collapseSubtree(phaseKey, prefix) {
    const s = ensurePhase(phaseKey).expanded;
    [...s].forEach(p => { if (p === prefix || p.startsWith(prefix + '/')) s.delete(p); });
  }
  function getExpandedPaths(phaseKey) {
    return [...ensurePhase(phaseKey).expanded].sort((a,b) => a.split('/').length - b.split('/').length);
  }

  // Risolve un path "slash" (Phase/Sub/Node) in un pathKey del Toolmap e i toolIds
  function resolveToolIdsForSlashPath(slashPath) {
    const tm = window.Toolmap || {};
    const keys = Object.keys(tm.nodeIndex || {});
    const root = (tm.registry && (tm.registry.name || tm.registry.title)) || 'Root';
    const suffix = slashPath.replace(/\//g, '>');
    const candidates = [
      suffix,
      `${root}>${suffix}`
    ];

    let bestKey = null;
    // match diretto
    for (const cand of candidates) if (tm.allToolsUnder?.[cand]) { bestKey = cand; break; }
    // match per suffisso
    if (!bestKey) {
      for (const k of keys) {
        if (k === suffix || k.endsWith('>' + suffix) || k.endsWith(suffix)) {
          if (!bestKey || k.length > bestKey.length) bestKey = k;
        }
      }
    }
    const ids = bestKey ? Array.from(tm.allToolsUnder[bestKey] || []) : [];
    return { pathKey: bestKey, ids };
  }

  function phaseToColor(phase) {
    const map = {
      '00_Common': 'var(--color-common)',
      '01_Information_Gathering': 'var(--color-info)',
      '02_Exploitation': 'var(--color-exploit)',
      '03_Post_Exploitation': 'var(--color-post)',
      '04_Miscellaneous': 'var(--color-misc)'
    };
    return map[phase] || 'var(--accent-2)';
  }

  function derivePhaseColor(phaseKey, ids) {
    // 1) prova tool phaseColor
    const tById = (window.Toolmap && window.Toolmap.toolsById) || {};
    for (const id of ids) {
      const t = tById[id];
      if (t?.phaseColor) return t.phaseColor;
    }
    // 2) fallback: dalla fase
    return phaseToColor(phaseKey);
  }

  // ==========================================================================
  // SEZIONE C · BUILD & RENDER (NAV + CHILDREN)
  // ==========================================================================
  function getNodeByPath(obj, path) {
    return path.split('/').reduce((acc,k) => (acc && acc[k]!=null ? acc[k] : undefined), obj);
  }
  function depthFromPath(path) {
    const parts = path.split('/');
    return Math.max(0, parts.length - 1);
  }

  function buildChildren(obj, parentPath = '') {
    let html = '';
    if (!isObject(obj)) return html;

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
    const visibles = Array.from(container.querySelectorAll(':scope > .folder-leaf'))
      .filter(isNodeVisible);
    if (visibles.length) visibles[visibles.length - 1].classList.add('is-last-visible');
  }

  function buildNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;

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
    attachPhaseToggles();
    attachFolderLeafDrilldown(document);
    document.querySelectorAll('.nav-item > .children').forEach(markLastVisible);
    positionFlyouts();
  }

  // ==========================================================================
  // SEZIONE D · HIGHLIGHT & THEME
  // ==========================================================================
  function resetPathHighlight(navItem) {
    if (!navItem) return;
    navItem.classList.remove('has-active-path');
    navItem.querySelectorAll('.folder-leaf').forEach(el => el.classList.remove('in-active-path'));
    navItem.querySelectorAll('.children-nested').forEach(n => n.classList.remove('has-active-path'));
  }

  function clearAllPathHighlights() {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('has-active-path'));
    document.querySelectorAll('.folder-leaf').forEach(el => el.classList.remove('in-active-path','active'));
    document.querySelectorAll('.children-nested').forEach(n => n.classList.remove('has-active-path'));
  }

  function highlightActivePath(phaseKey) {
    const navItem = document.querySelector(`.nav-item[data-phase="${phaseKey}"]`);
    if (!navItem) return;

    const activeSlash = getActivePathSlash(phaseKey);
    if (!activeSlash) {
      navItem.classList.remove('has-active-path');
      resetPathHighlight(navItem);
      return;
    }

    navItem.classList.add('has-active-path');
    const parts = activeSlash.split('/');
    navItem.querySelectorAll('.folder-leaf').forEach(el => el.classList.remove('in-active-path'));

    for (let i = 1; i <= parts.length; i++) {
      const partial = parts.slice(0, i).join('/');
      const node = navItem.querySelector(`.folder-leaf[data-path="${partial}"]`);
      if (node) node.classList.add('in-active-path');
    }

    navItem.querySelectorAll('.children-nested').forEach(n => {
      if (n.querySelector('.folder-leaf.in-active-path')) n.classList.add('has-active-path');
      else n.classList.remove('has-active-path');
    });
  }

  function applyPhaseThemeToPane(pane, phaseKey) {
    const navItem = document.querySelector(`.nav-item[data-phase="${phaseKey}"]`);
    if (!navItem || !pane) return;

    const cs = getComputedStyle(navItem);
    ['--phase','--gutter','--tree-x','--tree-w','--elbow-w','--elbow-h','--elbow-top']
      .forEach(p => { const v = cs.getPropertyValue(p); if (v) pane.style.setProperty(p, v.trim()); });

    pane.style.setProperty('--tree-stroke', 'rgba(255,255,255,.12)');
    pane.style.setProperty('--tree-stroke-fade', 'rgba(255,255,255,.08)');
    pane.dataset.phase = phaseKey;
  }

  function highlightPathInContainer(container, activeSlash) {
    if (!container) return;

    // reset
    container.querySelectorAll('.folder-leaf, .leaf, .section-title')
      .forEach(el => el.classList.remove('in-active-path'));
    container.querySelectorAll('.children, .children-nested')
      .forEach(n => n.classList.remove('has-active-path'));

    if (!activeSlash) return;

    const parts = activeSlash.split('/');
    const targets = [];
    for (let i = 1; i <= parts.length; i++) {
      const partial = parts.slice(0, i).join('/');
      const node = container.querySelector(`.folder-leaf[data-path="${partial}"], .leaf[data-path="${partial}"]`);
      if (node) targets.push(node);
    }
    targets.forEach(n => n.classList.add('in-active-path'));

    container.querySelectorAll('.children, .children-nested').forEach(n => {
      const directNodes = Array.from(n.querySelectorAll(':scope > .leaf, :scope > .folder-leaf, :scope > .section-title'));
      const should = directNodes.some(el => el.classList.contains('in-active-path'));
      n.classList.toggle('has-active-path', should);
    });
  }

  // ==========================================================================
  // SEZIONE E · SYNC ESPANSIONI (NAV / HOVER-PANE)
  // ==========================================================================
  function ensureExpandedInContainer(container, path) {
    const leaf = container.querySelector(`.folder-leaf[data-path="${path}"]`);
    if (!leaf) return;

    const next = leaf.nextElementSibling;
    if (next && next.classList?.contains('children-nested') && next.dataset.parent === path) return;

    const node = getNodeByPath(taxonomy, path);
    if (!hasChildrenNode(node)) return;

    const depth = depthFromPath(path);
    const nest = document.createElement('div');
    nest.className = 'children children-nested';
    nest.dataset.parent = path;
    nest.style.setProperty('--level', depth);
    nest.innerHTML = buildChildren(node, path);

    // open senza animazione durante la ricostruzione
    nest.style.maxHeight = 'none';
    nest.style.opacity = '1';
    nest.style.paddingTop = '2px';

    leaf.after(nest);
    markLastVisible(leaf.parentElement);
    markLastVisible(nest);
    attachFolderLeafDrilldown(nest);
  }

  function expandFromMemoryInContainer(container, phaseKey) {
    getExpandedPaths(phaseKey).forEach(p => ensureExpandedInContainer(container, p));
    refreshAllVLinesDebounced(container);

    const current = getActivePathSlash(phaseKey);
    if (!container) return;

    if (container.classList && container.classList.contains('hover-pane')) {
      highlightPathInContainer(container, current);
      if (current) {
        const last = container.querySelector(`.folder-leaf[data-path="${current}"]`);
        if (last) {
          container.querySelectorAll('.folder-leaf.active').forEach(n => n.classList.remove('active'));
          last.classList.add('active');
        }
      }
    } else {
      highlightActivePath(phaseKey);
    }
  }

  // ==========================================================================
  // SEZIONE F · DISPATCH FILTRO (tm:scope:set) + COLORE FASE
  // ==========================================================================
  function dispatchScopeAndPhase(slashPath) {
    const phaseKey = slashPath.split('/')[0];
    const { pathKey, ids } = resolveToolIdsForSlashPath(slashPath);

    // salva memoria globale
    localStorage.setItem(MEM.pathSlash, slashPath);
    if (pathKey) localStorage.setItem(MEM.pathKey, pathKey); else localStorage.removeItem(MEM.pathKey);

    // Notifica filtro + colore fase
    window.dispatchEvent(new CustomEvent('tm:scope:set', { detail: { pathKey, ids }}));
    const color = derivePhaseColor(phaseKey, ids);
    window.dispatchEvent(new CustomEvent('tm:phase:color', { detail: { color }}));
  }

  // ==========================================================================
  // SEZIONE G · INTERAZIONE NEL NAV (sidebar aperta) + TOGGLES
  // ==========================================================================
  function attachFolderLeafDrilldown(scope = document) {
    scope.querySelectorAll('.children .folder-leaf').forEach(el => {
      if (el.dataset._drillbound) return;
      el.dataset._drillbound = '1';

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();

        const pathSlash = el.dataset.path;
        const node = getNodeByPath(taxonomy, pathSlash);
        const hasKids = hasChildrenNode(node);
        const phaseKey = pathSlash.split('/')[0];

        // Memoria + highlight
        setActivePathSlash(phaseKey, pathSlash);
        highlightActivePath(phaseKey);

        // Dispatch filtro (nodo + discendenti)
        dispatchScopeAndPhase(pathSlash);

        // BG sull'ultimo cliccato
        document.querySelectorAll('.leaf.active, .folder-leaf.active, .section-title.active')
          .forEach(n => n.classList.remove('active'));
        el.classList.add('active');

        // Se terminale → fine
        if (!hasKids) { refreshAllVLinesDebounced(); return; }

        // Toggle nested
        const next = el.nextElementSibling;
        const isOpen = !!(next && next.classList.contains('children-nested') && next.dataset.parent === pathSlash);

        if (isOpen) {
          const h = next.scrollHeight;
          next.style.maxHeight = h + 'px';
          next.style.opacity = '1';
          next.style.paddingTop = '2px';
          void next.getBoundingClientRect();
          next.style.maxHeight = '0px';
          next.style.opacity = '0';
          next.style.paddingTop = '0px';

          next.addEventListener('transitionend', () => {
            next.remove();
            markLastVisible(el.parentElement);
            highlightActivePath(phaseKey);
            collapseSubtree(phaseKey, pathSlash);
            refreshAllVLinesDebounced();
          }, { once: true });

          return;
        }

        // APRI + memoria espansa
        const depth = depthFromPath(pathSlash);
        const nest = document.createElement('div');
        nest.className = 'children children-nested';
        nest.dataset.parent = pathSlash;
        nest.style.setProperty('--level', depth);
        nest.innerHTML = buildChildren(node, pathSlash);

        nest.style.maxHeight = '0px';
        nest.style.opacity = '0';
        nest.style.paddingTop = '0px';

        el.after(nest);
        markLastVisible(el.parentElement);
        markLastVisible(nest);

        const target = nest.scrollHeight;
        void nest.getBoundingClientRect();
        nest.style.maxHeight = target + 'px';
        nest.style.opacity = '1';
        nest.style.paddingTop = '2px';

        const onOpenEnd = () => {
          nest.removeEventListener('transitionend', onOpenEnd);
          if (document.body.contains(nest) && nest.style.opacity === '1') {
            nest.style.maxHeight = 'none';
          }
          highlightActivePath(phaseKey);
          expandBranch(phaseKey, pathSlash);
          refreshAllVLinesDebounced();
        };
        nest.addEventListener('transitionend', onOpenEnd);

        attachFolderLeafDrilldown(nest);
      });
    });
  }

  function attachPhaseToggles() {
    const sidebar = document.getElementById('sidebar');

    document.querySelectorAll('.nav-item.has-children > .btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const navItem = btn.closest('.nav-item');
        const phaseKey = navItem.dataset.phase;
        const wasOpen = navItem.classList.contains('open');

        // Se sidebar collapsed: aprila ma NON cambiare il filtro attivo
        if (sidebar && sidebar.classList.contains('collapsed')) {
          sidebar.classList.remove('collapsed');
          localStorage.setItem(MEM.collapsed, '0');
          hideHoverPane();

          navItem.classList.add('open');
          btn.classList.add('active');

          // ripulisci nested stantii, poi ricostruisci da memoria
          navItem.querySelectorAll('.children-nested').forEach(n => n.remove());
          expandFromMemoryInContainer(navItem, phaseKey);

          requestAnimationFrame(() => {
            highlightActivePath(phaseKey);
            refreshAllVLinesDebounced(navItem);
          });
          return;
        }

        // Chiudi altre fasi
        document.querySelectorAll('.nav-item.open').forEach(item => {
          if (item !== navItem) {
            item.classList.remove('open');
            item.querySelector('.btn')?.classList.remove('active');
            resetPathHighlight(item);
          }
        });

        if (!wasOpen) {
          navItem.classList.add('open');
          btn.classList.add('active');
          highlightActivePath(phaseKey);
          expandFromMemoryInContainer(navItem, phaseKey);

          // Se non hai ancora selezionato nulla, il click sulla fase imposta il filtro alla fase
          const current = getActivePathSlash(phaseKey);
          if (!current) {
            const slash = phaseKey; // solo fase
            setActivePathSlash(phaseKey, slash);
            highlightActivePath(phaseKey);
            dispatchScopeAndPhase(slash);
          }
        } else {
          navItem.classList.remove('open');
          btn.classList.remove('active');
          resetPathHighlight(navItem);
        }
      });

      // Hover → riquadro quando sidebar è collapsed
      btn.addEventListener('mouseenter', () => {
        const sidebarEl = document.getElementById('sidebar');
        if (sidebarEl && sidebarEl.classList.contains('collapsed')) {
          const navItem = btn.closest('.nav-item');
          const phaseKey = navItem.dataset.phase;
          const phaseData = taxonomy[phaseKey];
          if (hasChildrenNode(phaseData)) {
            clearTimeout(hoverTimeout);
            showHoverPaneForNode(btn, phaseData, phaseKey);
          }
        }
      });

      btn.addEventListener('mouseleave', () => {
        const sidebarEl = document.getElementById('sidebar');
        if (sidebarEl && sidebarEl.classList.contains('collapsed')) {
          hoverTimeout = setTimeout(() => hideHoverPane(), 280);
        }
      });
    });

    // se il mouse entra nel riquadro, non chiudere
    document.addEventListener('mouseenter', (e) => {
      if (e.target.closest('.hover-pane')) clearTimeout(hoverTimeout);
    }, true);
  }

  function positionFlyouts() {
    const sidebar = document.getElementById('sidebar');
    document.querySelectorAll('.nav-item.has-children').forEach(item => {
      const flyout = item.querySelector('.flyout');
      if (!flyout) return;

      item.addEventListener('mouseenter', () => {
        if (!sidebar || !sidebar.classList.contains('collapsed')) return;
        const rect = item.getBoundingClientRect();
        flyout.style.left = `${rect.right + 10}px`;
        flyout.style.top  = `${rect.top}px`;
      });
    });
  }

  // ==========================================================================
  // SEZIONE H · SIDEBAR CONTROLS (collapse/open)
  // ==========================================================================
  function attachSidebarControls() {
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('collapseBtn');
    const collapseAllBtn = document.getElementById('collapseAllBtn');
    const expandAllBtn = document.getElementById('expandAllBtn');
    const headerActions = document.querySelector('.header-actions');

    function applyCollapsedStyle() {
      const isColl = sidebar.classList.contains('collapsed');
      if (headerActions) headerActions.style.gap = isColl ? '0px' : '6px';
      sidebar.querySelectorAll('.btn').forEach(b => { b.style.gap = isColl ? '0px' : '10px'; });
      sidebar.querySelectorAll('.toggle, .icon-btn').forEach(el => {
        if (isColl) el.style.marginLeft = '-5px'; else el.style.removeProperty('margin-left');
      });
    }

    collapseBtn?.addEventListener('click', () => {
      const now = !sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed', now);
      localStorage.setItem(MEM.collapsed, now ? '1' : '0');
      applyCollapsedStyle();

      if (now) {
        document.querySelectorAll('.nav-item.open').forEach(item => {
          item.classList.remove('open');
          item.querySelector('.btn')?.classList.remove('active');
        });
        clearAllPathHighlights();
        hideHoverPane();
      }
      // NON si altera il filtro attivo: resta valido
      window.dispatchEvent(new CustomEvent('tm:sidebar:toggle', { detail: { collapsed: now }}));
    });

    headerActions?.addEventListener('click', () => setTimeout(applyCollapsedStyle, 0));

    const moCollapsed = new MutationObserver(muts => {
      for (const m of muts) if (m.type === 'attributes' && m.attributeName === 'class') applyCollapsedStyle();
    });
    moCollapsed.observe(sidebar, { attributes: true, attributeFilter: ['class'] });

    applyCollapsedStyle();

    collapseAllBtn?.addEventListener('click', () => {
      document.querySelectorAll('.nav-item.open').forEach(item => {
        item.classList.remove('open');
        item.querySelector('.btn')?.classList.remove('active');
      });
      document.querySelectorAll('.children-nested').forEach(n => n.remove());
      clearAllPathHighlights();
      Object.keys(phaseMemory).forEach(k => phaseMemory[k].expanded.clear());
      refreshAllVLinesDebounced();
    });

    expandAllBtn?.addEventListener('click', () => {
      document.querySelectorAll('.nav-item.has-children').forEach(item => {
        const btn = item.querySelector('.btn');
        if (!item.classList.contains('open')) {
          item.classList.add('open');
          btn?.classList.add('active');
          const phaseKey = item.dataset.phase;
          highlightActivePath(phaseKey);
          expandFromMemoryInContainer(item, phaseKey);
        }
      });
    });
  }

  // ==========================================================================
  // SEZIONE I · HOVER-PANE (sidebar chiusa)
  // ==========================================================================
  let hoverPane = null;
  let hoverTimeout = null;

  function createHoverPane() {
    if (!hoverPane) {
      hoverPane = document.createElement('div');
      hoverPane.className = 'hover-pane';
      document.body.appendChild(hoverPane);

      hoverPane.addEventListener('mouseenter', () => clearTimeout(hoverTimeout));
      hoverPane.addEventListener('mouseleave', () => {
        hoverTimeout = setTimeout(() => hideHoverPane(), 280);
      });

      // click dentro il riquadro
      hoverPane.addEventListener('click', (e) => {
        const leaf = e.target.closest('.folder-leaf');
        if (!leaf || !hoverPane.contains(leaf)) return;

        const pathSlash = leaf.dataset.path;
        const phaseKey  = pathSlash.split('/')[0];
        const node      = getNodeByPath(taxonomy, pathSlash);
        const hasKids   = hasChildrenNode(node);

        // Memoria & dispatch filtro
        setActivePathSlash(phaseKey, pathSlash);
        dispatchScopeAndPhase(pathSlash);

        // Reset + reapply highlight per coerenza
        highlightPathInContainer(hoverPane, null);
        hoverPane.querySelectorAll('.folder-leaf.active, .leaf.active').forEach(n => n.classList.remove('active'));
        void hoverPane.offsetHeight;
        applyPhaseThemeToPane(hoverPane, phaseKey);
        void hoverPane.offsetHeight;
        const current = getActivePathSlash(phaseKey);
        const clicked = leaf;
        clicked.classList.add('active');
        highlightPathInContainer(hoverPane, current);
        highlightActivePath(phaseKey);
        refreshAllVLines(hoverPane);

        // Toggle nested in-place
        if (hasKids) {
          const next = leaf.nextElementSibling;
          const isOpen = !!(next && next.classList.contains('children-nested') && next.dataset.parent === pathSlash);

          if (isOpen) {
            const h = next.scrollHeight;
            next.style.maxHeight = h + 'px';
            next.style.opacity = '1';
            next.style.paddingTop = '2px';
            void next.getBoundingClientRect();
            next.style.maxHeight = '0px';
            next.style.opacity = '0';
            next.style.paddingTop = '0px';
            next.addEventListener('transitionend', () => {
              next.remove();
              markLastVisible(leaf.parentElement);
              collapseSubtree(phaseKey, pathSlash);
              refreshAllVLinesDebounced(hoverPane);
              const cur = getActivePathSlash(phaseKey);
              highlightPathInContainer(hoverPane, null);
              void hoverPane.offsetHeight;
              highlightPathInContainer(hoverPane, cur);
              highlightActivePath(phaseKey);
            }, { once: true });
            return;
          }

          const depth = depthFromPath(pathSlash);
          const nest = document.createElement('div');
          nest.className = 'children children-nested';
          nest.dataset.parent = pathSlash;
          nest.style.setProperty('--level', depth);
          nest.innerHTML = buildChildren(node, pathSlash);
          nest.style.maxHeight = '0px';
          nest.style.opacity = '0';
          nest.style.paddingTop = '0px';

          leaf.after(nest);
          markLastVisible(leaf.parentElement);
          markLastVisible(nest);

          const target = nest.scrollHeight;
          void nest.getBoundingClientRect();
          nest.style.maxHeight = `${target}px`;
          nest.style.opacity = '1';
          nest.style.paddingTop = '2px';

          const onOpenEnd = () => {
            nest.removeEventListener('transitionend', onOpenEnd);
            if (document.body.contains(nest) && nest.style.opacity === '1') {
              nest.style.maxHeight = 'none';
            }
            expandBranch(phaseKey, pathSlash);
            refreshAllVLinesDebounced(hoverPane);
            const cur = getActivePathSlash(phaseKey);
            highlightPathInContainer(hoverPane, null);
            void hoverPane.offsetHeight;
            highlightPathInContainer(hoverPane, cur);
            highlightActivePath(phaseKey);
          };
          nest.addEventListener('transitionend', onOpenEnd);
        } else {
          refreshAllVLinesDebounced(hoverPane);
          const cur = getActivePathSlash(phaseKey);
          highlightPathInContainer(hoverPane, null);
          void hoverPane.offsetHeight;
          highlightPathInContainer(hoverPane, cur);
          highlightActivePath(phaseKey);
        }
      });
    }
    return hoverPane;
  }

  function hideHoverPane() {
    if (hoverPane) hoverPane.classList.remove('active');
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
    ensureHoverPaneStyles();
    const pane = createHoverPane();

    const phaseKey = path.includes('/') ? path.split('/')[0] : path;
    const childrenHTML = buildChildren(node, phaseKey);

    pane.innerHTML = `
      <div class="children children-nested hover-root" data-parent="${phaseKey}" style="--level: 1">
        ${childrenHTML}
      </div>
    `;

    // posizione
    const fromPane = !!(element.closest && element.closest('.hover-pane'));
    if (!fromPane) {
      const rect = element.getBoundingClientRect();
      pane.style.left = `${rect.right + 10}px`;
      pane.style.top  = `${rect.top}px`;
    }

    const rootChildren = pane.querySelector('.hover-root');
    markLastVisible(rootChildren);

    applyPhaseThemeToPane(pane, phaseKey);
    void pane.offsetHeight;

    expandFromMemoryInContainer(pane, phaseKey);
    setTimeout(() => pane.classList.add('active'), 40);

    requestAnimationFrame(() => {
      const currentSlash = getActivePathSlash(phaseKey);
      refreshAllVLines(pane);
      if (currentSlash) {
        highlightPathInContainer(pane, null);
        void pane.offsetHeight;
        highlightPathInContainer(pane, currentSlash);
        const activeLeaf = pane.querySelector(`.folder-leaf[data-path="${currentSlash}"], .leaf[data-path="${currentSlash}"]`);
        if (activeLeaf) {
          pane.querySelectorAll('.folder-leaf.active, .leaf.active').forEach(n => n.classList.remove('active'));
          activeLeaf.classList.add('active');
        }
      }
    });
  }

  // ==========================================================================
  // SEZIONE J · BOOTSTRAP + RESET
  // ==========================================================================
  function setCollapsed(v) {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed', v);
    localStorage.setItem(MEM.collapsed, v ? '1' : '0');
    window.dispatchEvent(new CustomEvent('tm:sidebar:toggle', { detail: { collapsed: v }}));
  }
  function getCollapsed() { return localStorage.getItem(MEM.collapsed) === '1'; }

  document.addEventListener('DOMContentLoaded', () => {
    window.taxonomy = taxonomy;
    precomputeIconMap();
    buildNav();
    attachSidebarControls();

    // ripristina stato collapsed
    setCollapsed(getCollapsed());

    // restore ultima selezione (se c'è). Usiamo slash (nostra memoria) per highlight,
    // e ricalcoliamo pathKey+ids per la griglia.
    const lastSlash = localStorage.getItem(MEM.pathSlash);
    if (lastSlash) {
      const phaseKey = lastSlash.split('/')[0];
      setActivePathSlash(phaseKey, lastSlash);
      highlightActivePath(phaseKey);
      dispatchScopeAndPhase(lastSlash);
    }
  });

  // Reset globale: azzera tutto (memoria path/expanded/hover)
  window.addEventListener('tm:reset', () => {
    localStorage.removeItem(MEM.pathKey);
    localStorage.removeItem(MEM.pathSlash);

    Object.keys(phaseMemory).forEach(k => {
      phaseMemory[k].activePathSlash = null;
      phaseMemory[k].expanded.clear();
    });

    // chiudi fasi, rimuovi nested, highlight, hover
    document.querySelectorAll('.nav-item.open').forEach(item => {
      item.classList.remove('open');
      item.querySelector('.btn')?.classList.remove('active');
    });
    document.querySelectorAll('.children-nested').forEach(n => n.remove());
    clearAllPathHighlights();
    hideHoverPane();
    refreshAllVLinesDebounced();
  });

})(); // end IIFE principale

// ============================================================================
// SEZIONE L · V-LINE CLAMP UTILITIES (GLOBALI) - invariata
// ============================================================================
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
  const csLast = getComputedStyle(last);
  const csCont = getComputedStyle(container);

  const elbowTop = parseFloat(csLast.getPropertyValue('--elbow-top')) || 0;
  const elbowH   = parseFloat(csLast.getPropertyValue('--elbow-h'))   || 12;

  let endY = last.offsetTop + elbowTop + (elbowH / 2);

  const padB = parseFloat(csCont.paddingBottom) || 0;
  const extraBottom = Math.round((elbowH * 0.8) + (padB * 0.5) + 6);

  const maxH = container.scrollHeight;
  endY = Math.max(0, Math.min(endY, maxH));
  endY = Math.max(0, endY - extraBottom);

  items.forEach(el => el.classList.remove('is-last'));
  last.classList.add('is-last');

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
  rafId = requestAnimationFrame(() => { refreshAllVLines(root); rafId = null; });
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
// SEZIONE M · SIDEBAR AUTO-GROW (larghezza dinamica) - invariata
// ============================================================================
(() => {
  "use strict";

  const CFG = {
    base: 320,
    safety: 20,
    maxVW: 0.90,
    minPathWidth: 320,
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

    const leftNoTransform = (el) => {
      let x = 0, n = el;
      while (n && n !== sidebar) { x += n.offsetLeft || 0; n = n.offsetParent; }
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
      if (Math.abs(current - target) <= 1) { lastApplied = target; return; }

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
      requestAnimationFrame(() => { ticking = false; if (!isCollapsed()) apply(); });
    };

    const onCollapseChange = () => {
      if (isCollapsed()) { sidebar.style.removeProperty("width"); lastApplied = null; }
      else { setTimeout(schedule, 0); setTimeout(schedule, 220); }
    };

    const moNav = new MutationObserver(schedule);
    moNav.observe(nav, { subtree: true, childList: true, attributes: true, attributeFilter: ["class","style","data-open","aria-expanded"] });

    const moSidebar = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === "attributes" && m.attributeName === "class") { onCollapseChange(); return; }
      }
      schedule();
    });
    moSidebar.observe(sidebar, { attributes: true, attributeFilter: ["class","style"] });

    const ro = new ResizeObserver(schedule);
    ro.observe(sidebar);
    ro.observe(nav);

    nav.addEventListener("transitionend", e => {
      if (["max-height","height","opacity","width"].includes(e.propertyName)) schedule();
    }, true);

    window.addEventListener("resize", schedule);

    setTimeout(schedule, 0);
    setTimeout(schedule, 300);
    setTimeout(schedule, 600);

    window.SidebarAutoGrow = { schedule, apply, computeNeeded };
  });
})();
