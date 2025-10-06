// ============================================================================
// NOTES MODAL (sostituzione completa)
// - Classe compatibile: new NotesModal(onSave)
// - Edit/Preview Markdown sicuro (escape HTML + sostituzioni minime)
// - Focus trap + scorciatoie: Esc (chiudi), Ctrl/Cmd+E (toggle edit), Ctrl/Cmd+S (salva)
// - Click su backdrop per chiudere, chiusura anche su `tm:reset`
// - Colora la modale con la fase del tool (se disponibile) via CSS var --phase
// - "Save & Export": chiama onSave(tool.id, note) e scarica un .md
// ============================================================================

class NotesModal {
  constructor(onSave) {
    this.onSave = onSave;
    this.currentTool = null;
    this.isEditing = false;
    this.modal = null;
    this._previousFocus = null;
    this._createModal();
    this._attachEventListeners();
  }

  // ---------- Public API ----------
  show(tool) {
    if (!this.modal) return;

    this.currentTool = tool || null;
    this.isEditing = false;

    const textarea = this._qs('.notes-textarea');
    const preview  = this._qs('.notes-preview');
    const editBtn  = this._qs('.edit-btn');
    const saveBtn  = this._qs('.save-btn');
    const content  = this._qs('.modal-content');

    if (content) {
      // Imposta il colore di fase sulla modale (se definito)
      if (tool?.phaseColor) content.style.setProperty('--phase', tool.phaseColor);
      else content.style.removeProperty('--phase');
    }

    if (textarea) {
      textarea.value = (tool?.notes || '');
      textarea.style.display = 'none';
    }
    if (preview) preview.style.display = 'block';
    if (editBtn)  editBtn.style.display = 'inline-flex';
    if (saveBtn)  saveBtn.style.display = 'none';

    this._updatePreview();

    // Mostra modale + focus-trap
    this._previousFocus = document.activeElement;
    this.modal.style.display = 'flex';
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    this._focusFirst();
  }

  hide() {
    if (!this.modal) return;
    this.modal.style.display = 'none';
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Ripristina focus precedente
    if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
      this._previousFocus.focus();
    }
    this._previousFocus = null;
    this.currentTool = null;
  }

  // ---------- Private ----------
  _createModal() {
    const modalHTML = `
      <div class="modal-overlay" id="notesModal" role="dialog" aria-modal="true" aria-hidden="true" style="display:none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2 class="modal-title" id="notesTitle"></h2>
            <button class="modal-close" type="button" title="Close" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body">
            <textarea class="notes-textarea" placeholder="Write your notes in Markdown..." spellcheck="false"></textarea>
            <div class="notes-preview"></div>
          </div>
          <div class="modal-footer">
            <button class="edit-btn" type="button">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Edit
            </button>
            <button class="save-btn" type="button" style="display:none;">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Save & Export
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('notesModal');
  }

  _attachEventListeners() {
    if (!this.modal) return;

    const closeBtn = this._qs('.modal-close');
    const editBtn  = this._qs('.edit-btn');
    const saveBtn  = this._qs('.save-btn');
    const textarea = this._qs('.notes-textarea');

    closeBtn?.addEventListener('click', () => this.hide());

    // Click sul backdrop per chiudere
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hide();
    });

    editBtn?.addEventListener('click', () => this._toggleEdit(true));
    saveBtn?.addEventListener('click', () => this._save());

    textarea?.addEventListener('input', () => this._updatePreview());

    // Scorciatoie tastiera globali quando la modale è aperta
    document.addEventListener('keydown', (e) => {
      if (this.modal.style.display !== 'flex') return;

      // ESC → chiudi
      if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd+E → toggle edit
      if (mod && (e.key.toLowerCase() === 'e')) {
        e.preventDefault();
        this._toggleEdit(!this.isEditing);
        return;
      }

      // Ctrl/Cmd+S → salva
      if (mod && (e.key.toLowerCase() === 's')) {
        e.preventDefault();
        this._save();
        return;
      }

      // Trap TAB
      if (e.key === 'Tab') {
        this._trapTab(e);
      }
    });

    // Chiudi su reset app
    window.addEventListener('tm:reset', () => {
      if (this.modal.style.display === 'flex') this.hide();
    });
  }

  _toggleEdit(editing) {
    this.isEditing = !!editing;

    const textarea = this._qs('.notes-textarea');
    const preview  = this._qs('.notes-preview');
    const editBtn  = this._qs('.edit-btn');
    const saveBtn  = this._qs('.save-btn');

    if (this.isEditing) {
      textarea && (textarea.style.display = 'block');
      preview  && (preview.style.display  = 'none');
      editBtn  && (editBtn.style.display  = 'none');
      saveBtn  && (saveBtn.style.display  = 'inline-flex');
      textarea?.focus();
    } else {
      textarea && (textarea.style.display = 'none');
      preview  && (preview.style.display  = 'block');
      editBtn  && (editBtn.style.display  = 'inline-flex');
      saveBtn  && (saveBtn.style.display  = 'none');
    }
    this._updatePreview();
  }

  _updatePreview() {
    const textarea = this._qs('.notes-textarea');
    const preview  = this._qs('.notes-preview');
    const titleEl  = this._qs('.modal-title');

    // Titolo
    if (titleEl) {
      const phase = this._formatPhase(this.currentTool?.phase || this.currentTool?.phases?.[0] || '');
      const base  = this.currentTool?.name || this.currentTool?.title || 'Tool';
      titleEl.textContent = phase ? `Notes: ${base} — ${phase}` : `Notes: ${base}`;
    }

    // Preview
    if (preview) {
      const markdown = (textarea ? textarea.value : '') || '*No notes yet*';
      preview.innerHTML = this._renderMarkdown(markdown);
      preview.style.display = this.isEditing ? 'none' : 'block';
    }
  }

  _renderMarkdown(text) {
    // Escape HTML (semplice, sicuro)
    const escapeHtml = (s) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    let html = escapeHtml(text);

    // Blocchi di codice ```lang\n...\n```
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang = '', code = '') => {
      return `<pre><code class="language-${lang.trim()}">${code}</code></pre>`;
    });

    // Header # ## ###
    html = html
      .replace(/^### (.*)$/gim, '<h3>$1</h3>')
      .replace(/^## (.*)$/gim, '<h2>$1</h2>')
      .replace(/^# (.*)$/gim, '<h1>$1</h1>');

    // Bold **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic *text* (evita conflitti con liste/asterischi adiacenti)
    html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

    // Inline code `code`
    html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Liste non ordinate "- "
    const lines = html.split('\n');
    let inList = false;
    const out = [];
    for (const line of lines) {
      if (/^\s*-\s+/.test(line)) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + line.replace(/^\s*-\s+/, '') + '</li>');
      } else {
        if (inList) { out.push('</ul>'); inList = false; }
        out.push(line);
      }
    }
    if (inList) out.push('</ul>');
    html = out.join('\n');

    // Paragrafi e <br>
    html = html
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');

    if (!/^<([a-z]+)([^>]*)>/.test(html)) {
      html = '<p>' + html + '</p>';
    }
    return html;
  }

  _save() {
    const textarea = this._qs('.notes-textarea');
    const note = textarea ? textarea.value : '';

    // 1) Persiste fuori (delegato)
    if (this.currentTool && typeof this.onSave === 'function') {
      this.onSave(this.currentTool.id, note);
    }

    // 2) Export .md
    this._exportMarkdown(note);

    // 3) Torna in preview
    this._toggleEdit(false);
  }

  _exportMarkdown(note) {
    try {
      const name = (this.currentTool?.name || this.currentTool?.title || 'tool')
        .replace(/[^\w\-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
      const fileName = `${name || 'notes'}.md`;
      const blob = new Blob([note || ''], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (_) {
      // silenzioso: export optional
    }
  }

  _formatPhase(phase) {
    if (!phase) return '';
    return String(phase).replace(/^\d+_/, '').replace(/_/g, ' ');
  }

  _trapTab(e) {
    const focusables = this._focusableEls();
    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || !this.modal.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  _focusFirst() {
    const focusables = this._focusableEls();
    (focusables[0] || this._qs('.modal-close'))?.focus();
  }

  _focusableEls() {
    const root = this._qs('.modal-content');
    if (!root) return [];
    return Array.from(
      root.querySelectorAll(
        'button, [href], input, textarea, select, details,[tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  }

  _qs(sel) { return this.modal ? this.modal.querySelector(sel) : null; }
}

window.NotesModal = NotesModal;
