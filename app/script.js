/* ===== Markdown renderer semplice ===== */
function renderMarkdown(text) {
  if (!text) return '';

  return text
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')

    // Bold e Italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')

    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')

    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

    // Lists
    .replace(/^\- (.+)$/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')

    // Blockquotes
    .replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>')

    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gim, '<p>$1</p>')

    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-6]>)/g, '$1')
    .replace(/(<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(<blockquote>)/g, '$1')
    .replace(/(<\/blockquote>)<\/p>/g, '$1')
    .replace(/<p>(<pre>)/g, '$1')
    .replace(/(<\/pre>)<\/p>/g, '$1');
}

/* ===== Utility functions ===== */
function normalize(str) {
  return (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/* ===== Search helpers ===== */
function simpleQueryString() {
  const raw = document.getElementById('searchInput').value || '';
  return normalize(raw).trim();
}

function toolSearchScore(tool, q) {
  if (!q) return 0;

  const normalizedQuery = q;
  const nameNorm = normalize(tool.name || '');
  const idNorm = normalize(tool.id || '');
  const descNorm = normalize(tool.desc || '');
  const descLongNorm = normalize(tool.desc_long || '');

  let score = 0;

  // Match esatto nel nome o ID (massima priorità)
  if (nameNorm === normalizedQuery || idNorm === normalizedQuery) {
    score += 1000;
  }
  // Nome inizia con la query
  else if (nameNorm.startsWith(normalizedQuery) || idNorm.startsWith(normalizedQuery)) {
    score += 500;
  }
  // Nome contiene la query
  else if (nameNorm.includes(normalizedQuery) || idNorm.includes(normalizedQuery)) {
    score += 200;
  }

  // Match nella descrizione breve
  if (descNorm.includes(normalizedQuery)) {
    score += 50;
  }

  // Match nella descrizione lunga
  if (descLongNorm.includes(normalizedQuery)) {
    score += 20;
  }

  // Match nelle capabilities
  const capsMatch = (tool.caps || []).some(cap => normalize(cap).includes(normalizedQuery));
  if (capsMatch) score += 30;

  // Match nei tags
  const tagsMatch = (tool.tags || []).some(tag => normalize(tag).includes(normalizedQuery));
  if (tagsMatch) score += 25;

  // Match nel path
  const pathMatch = (tool.category_path || []).some(p => normalize(p).includes(normalizedQuery));
  if (pathMatch) score += 15;

  // Bonus per match multipli di parole
  const terms = q.split(/\s+/).filter(Boolean);
  if (terms.length > 1) {
    const allFields = normalize([
      tool.name, tool.id, tool.desc, tool.desc_long,
      ...(tool.caps || []), ...(tool.tags || []), ...(tool.category_path || [])
    ].join(' '));

    const matchedTerms = terms.filter(term => allFields.includes(term));
    if (matchedTerms.length === terms.length) {
      score += 100 * matchedTerms.length;
    }
  }

  return score;
}

function toolSimpleMatch(tool, q) {
  if (!q) return true;
  return toolSearchScore(tool, q) > 0;
}

/* ===== Registry patch & download helpers ===== */

/** Serializza note come block scalar YAML (|) con indent coerente */
function formatNotesForYaml(content, baseIndent = 2) {
  if (!content || content.trim().length === 0) return '';
  const lines = content.trimEnd().split('\n');
  const indent = ' '.repeat(baseIndent);
  return '|' + '\n' + lines.map(line => indent + line).join('\n');
}

/** Rimuove SOLO la sezione `notes:` dal blocco YAML */
function removeExistingNotes(block) {
  const lines = block.split('\n');
  const output = [];
  let skipping = false;
  let baseIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!skipping) {
      const match = line.match(/^(\s*)notes:\s*(.*)$/);
      if (match) {
        skipping = true;
        baseIndent = match[1].length;
        continue; // Salta la riga "notes:"
      }
      output.push(line);
    } else {
      // Dentro le note finché indent > baseIndent o linea vuota
      const indent = (line.match(/^(\s*)/) || [, ''])[1].length;
      if (line.trim() === '' || indent > baseIndent) {
        continue; // Consuma righe del block scalar
      } else {
        skipping = false;
        output.push(line); // Prima riga fuori da notes
      }
    }
  }
  return output.join('\n');
}

/** Appende `notes:` in coda al blocco con indent calcolato */
function addNotesToBlock(block, notes, indent) {
  const cleanBlock = block.replace(/\n+$/, '');
  const indentStr = ' '.repeat(indent);
  if (!notes || notes.trim().length === 0) {
    return cleanBlock + '\n' + indentStr + 'notes:\n';
  }
  const formatted = formatNotesForYaml(notes, indent + 2);
  return cleanBlock + '\n' + indentStr + 'notes: ' + formatted + '\n';
}

/**
 * PATCH non distruttiva del registry YAML
 * Modifica solo i blocchi presenti in notesMap, preservando tutto il resto
 */
function patchRegistryYaml(origYaml, notesMap) {
  try {
    const lines = (origYaml || '').split('\n');

    // Trova gli inizi dei blocchi: righe che iniziano con "- id:"
    const blockStartIndices = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^\-\s+id:\s*/.test(lines[i])) blockStartIndices.push(i);
    }
    if (blockStartIndices.length === 0) {
      console.warn('Nessun "- id:" trovato nel YAML. Nessuna modifica applicata.');
      return origYaml;
    }

    const prefix = lines.slice(0, blockStartIndices[0]).join('\n');

    // Estrai i blocchi
    const blocks = [];
    for (let b = 0; b < blockStartIndices.length; b++) {
      const start = blockStartIndices[b];
      const end = (b + 1 < blockStartIndices.length) ? blockStartIndices[b + 1] : lines.length;
      blocks.push(lines.slice(start, end).join('\n'));
    }

    // Processa i blocchi per cui abbiamo note da aggiornare
    const processedBlocks = blocks.map(block => {
      const idMatch = block.match(/^\-\s+id:\s*(.+?)$/m);
      const id = idMatch ? idMatch[1].trim().replace(/^['"]|['"]$/g, '') : null;
      if (!id || !notesMap || !notesMap.has(id)) return block;

      const notes = notesMap.get(id);

      // Stima dell'indentazione delle chiavi del blocco
      const indentMatch = block.match(/\n(\s+)[a-zA-Z_]/);
      const indent = indentMatch ? indentMatch[1].length : 2;

      const withoutNotes = removeExistingNotes(block);
      return addNotesToBlock(withoutNotes, notes, indent);
    });

    const result = (prefix ? prefix + '\n' : '') + processedBlocks.join('\n');
    return result.endsWith('\n') ? result : result + '\n';
  } catch (err) {
    console.error('Errore nel patch del YAML (preservo originale):', err);
    return origYaml; // Mai rigenerare tutto se c'è un errore
  }
}

/** Download helper per file YAML */
function download(filename, text) {
  const blob = new Blob([text], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}

/* ===== Data & State initialization ===== */
const _elToolsData = document.getElementById('toolsData');
const TOOLS_DATA = _elToolsData ? JSON.parse(_elToolsData.textContent || '[]') : [];

const _elTreeData = document.getElementById('treeData');
const TREE_DATA = _elTreeData ? JSON.parse(_elTreeData.textContent || '{}') : {};

const _elRegYaml = document.getElementById('registryYaml');
const REGISTRY_YAML_ORIG = _elRegYaml
  ? ((_elRegYaml.textContent || '').replace(/\r\n/g, '\n').replace(/\r/g, ''))
  : '';

// Normalizza i dati dei tools
const TOOLS = TOOLS_DATA.map(tool => ({
  ...tool,
  name: tool.name || tool.id,
  kind: (tool.kind || 'both').toLowerCase(),
  phases: Array.isArray(tool.phases) ? tool.phases : [],
  caps: Array.isArray(tool.caps) ? tool.caps : [],
  tags: Array.isArray(tool.tags) ? tool.tags : [],
  best_in: Array.isArray(tool.best_in) ? tool.best_in : [],
  best_in_paths: Array.isArray(tool.best_in_paths) ? tool.best_in_paths : [],
  category_path: (tool.category_path || []).map(s => String(s)).filter(Boolean),
  notes: tool.notes || '',
  version: tool.version || null
}));

// State management globale
let selectedPath = [];
let expandedNodes = new Set();
let selectedToolId = null;
let currentEditingTool = null;

// Storage delle note (in memoria per questa sessione)
const notesStorage = new Map();
const LS_PREFIX = 'pttoolmap.notes.';
for (const tool of TOOLS) {
  const stored = localStorage.getItem(LS_PREFIX + tool.id);
  notesStorage.set(tool.id, (stored !== null) ? stored : (tool.notes || ''));
}

/* ===== Color themes per fasi ===== */
const PHASE_COLORS = {
  "00_Common": {
    main: "#66BB6A",
    dark: "#2E7D32",
    light: "#A5D6A7"
  },
  "01_Information_Gathering": {
    main: "#4FC3F7",
    dark: "#0277BD",
    light: "#B3E5FC"
  },
  "02_Exploitation": {
    main: "#EF5350",
    dark: "#C62828",
    light: "#FFCDD2"
  },
  "03_Post_Exploitation": {
    main: "#FFA726",
    dark: "#F57C00",
    light: "#FFCC80"
  },
  "04_Miscellaneous": {
    main: "#9E9E9E",
    dark: "#616161",
    light: "#E0E0E0"
  },
  "default": {
    main: "#4FC3F7",
    dark: "#0277BD",
    light: "#B3E5FC"
  }
};

function updateThemeColors() {
  const phase = selectedPath[0] || "default";
  const colors = PHASE_COLORS[phase] || PHASE_COLORS["default"];
  const root = document.documentElement;

  root.style.setProperty('--accent', colors.main);
  root.style.setProperty('--accent-container', colors.dark);
  root.style.setProperty('--on-accent-container', colors.light);
}

/* ===== Tree navigation helpers ===== */
function pathToKey(pathArray) {
  return pathArray.map(encodeURIComponent).join('/');
}

function keyToPath(key) {
  return key.split('/').map(decodeURIComponent).filter(Boolean);
}

function getPhaseFromKey(key) {
  return (key || '').split('/')[0] || '';
}

function isAncestorPath(ancestorKey, descendantKey) {
  if (!ancestorKey) return true; // Root è antenato di tutto
  return descendantKey === ancestorKey || descendantKey.startsWith(ancestorKey + '/');
}

function getTreeChildren(node, pathPrefix) {
  let current = node;
  for (const segment of pathPrefix) {
    if (!segment) break;
    if (!current[segment]) return [];
    current = current[segment];
  }
  if (typeof current !== 'object' || current === null) {
    return [];
  }
  return Object.keys(current).sort();
}

function buildAllTreePaths(node, prefix = [], accumulator = []) {
  for (const key of Object.keys(node)) {
    const path = [...prefix, key];
    accumulator.push(path);
    buildAllTreePaths(node[key], path, accumulator);
  }
  return accumulator;
}

function pathMatches(itemPath, filterPrefix) {
  if (!filterPrefix.length) return true;
  if (itemPath.length < filterPrefix.length) return false;
  for (let i = 0; i < filterPrefix.length; i++) {
    if (itemPath[i] !== filterPrefix[i]) return false;
  }
  return true;
}

function isToolBestPick(tool) {
  if (selectedPath.length) {
    // Controlla se è best in fase
    if ((tool.best_in || []).includes(selectedPath[0])) return true;

    // Controlla se è best in path specifico
    for (const bestPath of (tool.best_in_paths || [])) {
      if (selectedPath.length >= bestPath.length) {
        let matches = true;
        for (let i = 0; i < bestPath.length; i++) {
          if (selectedPath[i] !== bestPath[i]) {
            matches = false;
            break;
          }
        }
        if (matches) return true;
      }
    }
  }
  return false;
}

/* ===== Rendering functions ===== */
function renderBreadcrumbs() {
  const breadcrumbs = document.getElementById('breadcrumbs');
  if (selectedPath.length === 0) {
    breadcrumbs.textContent = 'Tutte le sezioni';
  } else {
    breadcrumbs.textContent = selectedPath.join(' → ');
  }
}

function renderToolsGrid() {
  const query = simpleQueryString();

  let filteredTools = TOOLS.filter(tool =>
    pathMatches(tool.category_path, selectedPath)
  );

  if (query) {
    filteredTools = filteredTools.filter(tool => toolSimpleMatch(tool, query));

    // Ordina per rilevanza quando c'è una ricerca attiva
    filteredTools.sort((a, b) => {
      const scoreA = toolSearchScore(a, query);
      const scoreB = toolSearchScore(b, query);
      if (scoreA !== scoreB) return scoreB - scoreA;

      // A parità di score, best picks hanno priorità
      const aBest = isToolBestPick(a) ? 1 : 0;
      const bBest = isToolBestPick(b) ? 1 : 0;
      if (aBest !== bBest) return bBest - aBest;

      return (a.name || '').localeCompare(b.name || '');
    });
  } else {
    // Senza ricerca: ordina per best picks, poi alfabeticamente
    filteredTools.sort((a, b) => {
      const aBest = isToolBestPick(a) ? 1 : 0;
      const bBest = isToolBestPick(b) ? 1 : 0;
      if (aBest !== bBest) return bBest - aBest;
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  const grid = document.getElementById('toolsGrid');
  const emptyState = document.getElementById('emptyState');

  if (filteredTools.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'block';
  } else {
    grid.style.display = 'grid';
    emptyState.style.display = 'none';

    grid.innerHTML = filteredTools.map(tool => {
      const isBest = isToolBestPick(tool);
      const isActive = tool.id === selectedToolId;
      const hasNotes = notesStorage.has(tool.id) && notesStorage.get(tool.id).trim();

      return `
        <article class="tool-card ${isActive ? 'active' : ''}" data-tool-id="${tool.id}">
          <div class="tool-header">
            ${isBest ? '<div class="tool-star">⭐</div>' : ''}
            <div class="tool-info">
              <h3 class="tool-title">
                <span class="tool-badge ${tool.kind}">${tool.kind}</span>
                ${tool.name}
                ${tool.version ? `<span class="tool-badge version" title="Versione">v${tool.version}</span>` : ''}
              </h3>
              <div class="tool-meta">
                <div class="tool-caps">
                  ${(tool.caps || []).map(cap => 
                    `<span class="tool-cap">${cap}</span>`
                  ).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="tool-description">
            ${tool.desc_long || tool.desc || 'Nessuna descrizione disponibile'}
          </div>

          ${tool.category_path?.length ? 
            `<div class="tool-path">${tool.category_path.join(' → ')}</div>` : 
            ''
          }

          <div class="tool-actions">
            <div>
              ${tool.repo ? 
                `<a href="${tool.repo}" target="_blank" rel="noopener" class="tool-repo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15,3 21,3 21,9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Repository
                </a>` : 
                '<span style="color: var(--md-on-surface-muted);">Nessun repository</span>'
              }
            </div>
            <button class="btn tool-notes-btn" data-action="notes" data-tool-id="${tool.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
              </svg>
              ${hasNotes ? 'Note ●' : 'Note'}
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Event listeners per le card
    grid.querySelectorAll('.tool-card').forEach(card => {
      const toolId = card.dataset.toolId;

      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="notes"]')) return;
        selectedToolId = selectedToolId === toolId ? null : toolId;
        renderToolsGrid();
      });

      card.addEventListener('click', createRippleEffect);
    });

    grid.querySelectorAll('[data-action="notes"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const toolId = btn.dataset.toolId;
        openNotesModal(toolId);
      });
    });
  }

  renderBreadcrumbs();
}

function renderTree() {
  const query = simpleQueryString();
  const searchActive = !!query;
  const activeKey = pathToKey(selectedPath);

  function countToolsInPath(pathPrefix) {
    return TOOLS.filter(tool =>
      pathMatches(tool.category_path, pathPrefix) &&
      (!query || toolSimpleMatch(tool, query))
    ).length;
  }

  function isAncestorOfSelected(path) {
    if (!selectedPath.length) return false;
    if (path.length >= selectedPath.length) return false;
    for (let i = 0; i < path.length; i++) {
      if (selectedPath[i] !== path[i]) return false;
    }
    return true;
  }

  // Durante la ricerca, espandi automaticamente solo le FASI (livello 1) con risultati
  if (searchActive) {
    const matchingTools = TOOLS.filter(t => toolSimpleMatch(t, query));
    const phasesWithResults = new Set();

    // Raccogli le fasi che hanno risultati
    for (const tool of matchingTools) {
      const categoryPath = tool.category_path || [];
      if (categoryPath.length > 0) {
        phasesWithResults.add(categoryPath[0]);
      }
    }

    // Espandi solo le fasi con risultati, mantieni gli altri nodi come erano
    const newExpanded = new Set();
    for (const phase of phasesWithResults) {
      newExpanded.add(pathToKey([phase]));
    }

    // Mantieni aperti anche i nodi che erano già espansi dall'utente
    for (const key of expandedNodes) {
      const path = keyToPath(key);
      // Se è una fase senza risultati, la chiudiamo
      if (path.length === 1 && !phasesWithResults.has(path[0])) {
        continue;
      }
      // Altrimenti manteniamo lo stato
      newExpanded.add(key);
    }

    expandedNodes = newExpanded;
  }

  // Assicurati che il path selezionato sia sempre espanso
  for (let i = 1; i <= selectedPath.length; i++) {
    expandedNodes.add(pathToKey(selectedPath.slice(0, i)));
  }

  function renderTreeNode(pathPrefix) {
    const children = getTreeChildren(TREE_DATA, pathPrefix);
    return children.map(childName => {
      const childPath = [...pathPrefix, childName];
      const hasChildren = getTreeChildren(TREE_DATA, childPath).length > 0;
      const toolCount = countToolsInPath(childPath);
      const key = pathToKey(childPath);

      // NON nascondiamo mai i nodi, anche durante la ricerca
      const isExpanded = expandedNodes.has(key);
      const isActive = key === activeKey;
      const isAncestor = isAncestorOfSelected(childPath);

      // Evidenzia visivamente i nodi con risultati durante la ricerca
      const hasResults = searchActive && toolCount > 0;
      const noResults = searchActive && toolCount === 0;

      // Ottieni il colore della fase per questo nodo
      const phaseKey = childPath[0] || '';
      const phaseColors = PHASE_COLORS[phaseKey] || PHASE_COLORS["default"];
      const countStyle = (toolCount > 0 && searchActive)
        ? `style="background-color: ${phaseColors.main}; color: white;"`
        : '';

      const childrenHtml = hasChildren
        ? `<ul class="tree-children" style="display: ${isExpanded ? 'block' : 'none'};">
            ${(renderTreeNode(childPath) || []).join('')}
           </ul>`
        : '';

      return `
        <li class="${isExpanded ? 'expanded' : ''} ${isActive ? 'active' : ''} ${isAncestor ? 'ancestor' : ''} ${hasResults ? 'has-results' : ''} ${noResults ? 'no-results' : ''}"
            data-path="${key}" data-phase="${childPath[0] || ''}">
          <div class="tree-row">
            ${hasChildren
              ? `<div class="tree-caret">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <polyline points="9,18 15,12 9,6"></polyline>
                   </svg>
                 </div>`
              : '<div style="width: 20px;"></div>'
            }
            <span class="tree-label">${childName}</span>
            <span class="tree-count ${toolCount > 0 && searchActive ? 'highlight' : ''}" ${countStyle}>${toolCount}</span>
          </div>
          ${childrenHtml}
        </li>
      `;
    }).filter(Boolean);
  }

  const treeNav = document.getElementById('treeNav');
  const rootNodes = renderTreeNode([]);
  treeNav.innerHTML = `<ul>${(rootNodes || []).join('')}</ul>`;
}

/* ===== Logica di navigazione della sidebar corretta ===== */
function handleTreeClick(e) {
  const treeNav = document.getElementById('treeNav');
  const row = e.target.closest('.tree-row');
  if (!row || !treeNav.contains(row)) return;

  const li = row.closest('li[data-path][data-phase]');
  if (!li) return;

  const key = li.dataset.path;
  const phase = li.dataset.phase || getPhaseFromKey(key);
  const clickedPath = keyToPath(key);
  const wasExpanded = expandedNodes.has(key);

  // Se clicchiamo su una fase (livello 1)
  if (clickedPath.length === 1) {
    if (wasExpanded) {
      // Chiudiamo tutta la fase e torniamo alla vista globale
      expandedNodes.clear();
      selectedPath = [];
      selectedToolId = null;
    } else {
      // Espandiamo solo questa fase, chiudiamo le altre
      const phasesToClose = Array.from(expandedNodes).filter(k => {
        const p = getPhaseFromKey(k);
        return p && p !== phase;
      });
      phasesToClose.forEach(k => expandedNodes.delete(k));

      // Espandiamo solo la fase, non i suoi figli
      expandedNodes.add(key);
      selectedPath = clickedPath;
      selectedToolId = null;
    }
  } else {
    // Clicchiamo su un sottoelemento
    if (wasExpanded) {
      // Chiudiamo il sottoelemento E TUTTI I SUOI DISCENDENTI
      const nodesToClose = Array.from(expandedNodes).filter(k =>
        k === key || k.startsWith(key + '/')
      );
      nodesToClose.forEach(k => expandedNodes.delete(k));

      // Se il path selezionato era questo o un discendente, saliamo al padre
      const selectedKey = pathToKey(selectedPath);
      if (selectedKey === key || isAncestorPath(key, selectedKey)) {
        selectedPath = clickedPath.slice(0, -1); // Sali al padre
        selectedToolId = null;
      }
    } else {
      // Espandiamo SOLO questo sottoelemento, senza toccare i figli
      expandedNodes.add(key);
      selectedPath = clickedPath;
      selectedToolId = null;
    }
  }

  updateThemeColors();
  renderTree();
  renderToolsGrid();
}

function createRippleEffect(e) {
  const button = e.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  ripple.className = 'ripple';
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';

  button.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
}

/* ===== Notes modal ===== */
function openNotesModal(toolId) {
  const tool = TOOLS.find(t => t.id === toolId);
  if (!tool) return;

  currentEditingTool = toolId;
  const modal = document.getElementById('notesModal');
  const modalTitle = document.getElementById('modalTitle');
  const notesEditor = document.getElementById('notesEditor');

  modalTitle.textContent = `Note - ${tool.name}`;
  notesEditor.value = notesStorage.get(toolId) || '';

  // Reset dei tab al pannello editor
  document.querySelectorAll('.modal-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelector('[data-tab="edit"]').classList.add('active');
  document.getElementById('editPanel').classList.add('active');

  modal.classList.add('show');

  setTimeout(() => {
    notesEditor.focus();
  }, 300);
}

function closeNotesModal() {
  const modal = document.getElementById('notesModal');
  modal.classList.remove('show');
  currentEditingTool = null;
}

function saveNotes() {
  if (!currentEditingTool) return;

  const notesEditor = document.getElementById('notesEditor');
  const content = notesEditor.value.trim();

  notesStorage.set(currentEditingTool, content);
  localStorage.setItem(LS_PREFIX + currentEditingTool, content);

  renderToolsGrid();

  const yaml = patchRegistryYaml(REGISTRY_YAML_ORIG, notesStorage);
  download('registry.yml', yaml);

  closeNotesModal();
}

function updateNotesPreview() {
  const notesEditor = document.getElementById('notesEditor');
  const notesPreview = document.getElementById('notesPreview');
  const content = notesEditor.value.trim();

  if (content) {
    const isHTML = /<[^>]+>/.test(content);

    if (isHTML) {
      // Sanitizza l'HTML rimuovendo script e handler eventi
      notesPreview.innerHTML = content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    } else {
      notesPreview.innerHTML = renderMarkdown(content);
    }
  } else {
    notesPreview.innerHTML = '<p style="color: var(--md-on-surface-muted); text-align: center; margin-top: 40px;">L\'anteprima apparirà qui...</p>';
  }
}

/* ===== Event Listeners ===== */
function initializeEventListeners() {
  document.getElementById('treeNav').addEventListener('click', handleTreeClick);

  const searchInput = document.getElementById('searchInput');
  const resetBtn = document.getElementById('resetBtn');
  const expandAllBtn = document.getElementById('expandAllBtn');
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  const backToTopBtn = document.getElementById('backToTopBtn');
  const downloadRegistryBtn = document.getElementById('downloadRegistryBtn');
  const notesModal = document.getElementById('notesModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const saveNotesBtn = document.getElementById('saveNotesBtn');
  const notesEditor = document.getElementById('notesEditor');
  const scroller = document.querySelector('.tools-scroll') || window;

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderTree();
      renderToolsGrid();
    }, 250);
  });

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    expandedNodes.clear();
    selectedPath = [];
    selectedToolId = null;
    updateThemeColors();
    renderTree();
    renderToolsGrid();
  });

  expandAllBtn.addEventListener('click', () => {
    const allPaths = buildAllTreePaths(TREE_DATA);
    allPaths.forEach(path => expandedNodes.add(pathToKey(path)));
    renderTree();
  });

  collapseAllBtn.addEventListener('click', () => {
    expandedNodes.clear();
    for (let i = 1; i <= selectedPath.length; i++) {
      expandedNodes.add(pathToKey(selectedPath.slice(0, i)));
    }
    renderTree();
  });

  closeModalBtn.addEventListener('click', closeNotesModal);
  saveNotesBtn.addEventListener('click', saveNotes);

  notesModal.addEventListener('click', (e) => {
    if (e.target === notesModal) {
      closeNotesModal();
    }
  });

  // Tab switching nel modal
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(targetTab + 'Panel').classList.add('active');

      if (targetTab === 'preview') {
        updateNotesPreview();
      }
    });
  });

  notesEditor.addEventListener('input', () => {
    clearTimeout(notesEditor._updateTimeout);
    notesEditor._updateTimeout = setTimeout(() => {
      if (document.getElementById('previewPanel').classList.contains('active')) {
        updateNotesPreview();
      }
    }, 300);
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }

    if (e.key === 'Escape') {
      if (notesModal.classList.contains('show')) {
        closeNotesModal();
      } else if (searchInput.value) {
        searchInput.value = '';
        renderTree();
        renderToolsGrid();
        searchInput.blur();
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && notesModal.classList.contains('show')) {
      e.preventDefault();
      saveNotes();
    }
  });

  // Back to top button visibility
  let scrollTimeout;
  scroller.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const y = (scroller === window)
       ? (window.pageYOffset || document.documentElement.scrollTop || 0)
       : (scroller.scrollTop || 0);
     backToTopBtn.classList.toggle('show', y > 200);
   }, 10);
  });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
    if (scroller === window) {
       window.scrollTo({ top: 0, behavior: 'smooth' });
       document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
       scroller.scrollTo({ top: 0, behavior: 'smooth' });
   }
   });
  }

  if (downloadRegistryBtn) {
    downloadRegistryBtn.addEventListener('click', () => {
      const yaml = patchRegistryYaml(REGISTRY_YAML_ORIG, notesStorage);
      download('registry.yml', yaml);
    });
  }

  // Ripple effect per tutti i pulsanti
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', createRippleEffect);
  });
}

/* ===== Initialization ===== */
function initialize() {
  updateThemeColors();
  renderTree();
  renderToolsGrid();
  initializeEventListeners();

 const scInit = document.querySelector('.tools-scroll') || window;
 const y = (scInit === window)
   ? (window.pageYOffset || document.documentElement.scrollTop || 0)
   : (scInit.scrollTop || 0);
 if (y > 400) {
   document.getElementById('backToTopBtn').classList.add('show');
 }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}