// ============================================================================
// NOTES MODAL
// ============================================================================

/**
 * @typedef {Object} Tool
 * @property {string} [id]
 * @property {string} [name]
 * @property {string} [title]
 * @property {string} [phase]
 * @property {string[]} [phases]
 * @property {string} [phaseColor]
 * @property {string} [notes]
 */

class NotesModal {
    constructor(onSave) {
        this.onSave = onSave;
        /** @type {Tool|null} */
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
        const preview = this._qs('.notes-preview');
        const editBtn = this._qs('.edit-btn');
        const saveBtn = this._qs('.save-btn');
        const content = this._qs('.modal-content');

        if (content) {
            // Imposta il colore di fase sulla modale (se definito)
            const phaseColor = tool?.phaseColor || this._derivePhaseColor(tool);
            if (phaseColor) content.style.setProperty('--phase', phaseColor);
            else content.style.removeProperty('--phase');
        }

        if (textarea) {
            textarea.value = (tool?.notes || '');
            textarea.style.display = 'none';
        }
        if (preview) preview.style.display = 'block';
        if (editBtn) editBtn.style.display = 'inline-flex';
        if (saveBtn) saveBtn.style.display = 'none';

        this._updatePreview();

        // Mostra modale + focus-trap
        this._previousFocus = document.activeElement;
        this.modal.style.display = 'flex';
        this.modal.classList.remove('closing');
        void this.modal.offsetWidth;
        this.modal.classList.add('open');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        this._focusFirst();
    }

    hide() {
        if (!this.modal) return;
        this.modal.classList.remove('open');
        this.modal.classList.add('closing');

        const onEnd = () => {
            this.modal.style.display = 'none';
            this.modal.classList.remove('closing');
            this.modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';

            if (this._previousFocus && typeof this._previousFocus.focus === 'function') {
                this._previousFocus.focus();
            }
            this._previousFocus = null;
            this.currentTool = null;
        };

        this.modal.addEventListener('transitionend', function handler(e) {
            if (e.target && e.target.classList && e.target.classList.contains('modal-content')) {
                e.currentTarget.removeEventListener('transitionend', handler);
                onEnd();
            }
        });

        setTimeout(onEnd, 280);
    }

    _derivePhaseColor(tool) {
        const PHASE_COLORS = {
            '00_Common': 'hsl(270 91% 65%)',
            '01_Information_Gathering': 'hsl(210 100% 62%)',
            '02_Exploitation': 'hsl(4 85% 62%)',
            '03_Post_Exploitation': 'hsl(32 98% 55%)',
            '04_Miscellaneous': 'hsl(158 64% 52%)'
        };
        const phase = tool?.phase || (Array.isArray(tool?.phases) ? tool.phases[0] : null);
        return PHASE_COLORS[phase] || 'hsl(var(--accent))';
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
            <button class="back-btn" type="button" title="Back to preview" aria-label="Back to preview" style="display:none;margin-right:8px;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Back
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
        const editBtn = this._qs('.edit-btn');
        const saveBtn = this._qs('.save-btn');
        const textarea = this._qs('.notes-textarea');
        const backBtn = this._qs('.back-btn');

        backBtn?.addEventListener('click', () => this._toggleEdit(false));
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
        const preview = this._qs('.notes-preview');
        const editBtn = this._qs('.edit-btn');
        const saveBtn = this._qs('.save-btn');
        const backBtn = this._qs('.back-btn');

        if (this.isEditing) {
            textarea && (textarea.style.display = 'block');
            preview && (preview.style.display = 'none');
            editBtn && (editBtn.style.display = 'none');
            saveBtn && (saveBtn.style.display = 'inline-flex');
            backBtn && (backBtn.style.display = 'inline-flex');
            textarea?.focus();
        } else {
            textarea && (textarea.style.display = 'none');
            preview && (preview.style.display = 'block');
            editBtn && (editBtn.style.display = 'inline-flex');
            saveBtn && (saveBtn.style.display = 'none');
            backBtn && (backBtn.style.display = 'none');
        }
        this._updatePreview();
    }

    _updatePreview() {
        const textarea = this._qs('.notes-textarea');
        const preview = this._qs('.notes-preview');
        const titleEl = this._qs('.modal-title');

        // Titolo
        if (titleEl) {
            const phase = this._getPhase();
            const base = this.currentTool?.name || this.currentTool?.title || 'Tool';
            titleEl.textContent = phase ? `Notes: ${base} — ${phase}` : `Notes: ${base}`;
        }

        // Preview
        if (preview) {
            const markdown = (textarea ? textarea.value : '') || '*No notes yet*';
            preview.innerHTML = this._renderMarkdown(markdown);
            preview.style.display = this.isEditing ? 'none' : 'block';
        }
    }

    /** @returns {string} */
    _getPhase() {
        const t = this.currentTool || /** @type {Tool} */ ({});
        const raw = t.phase || (Array.isArray(t.phases) ? t.phases[0] : '');
        return this._formatPhase(raw || '');
    }

    _renderMarkdown(text) {
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
            const langLabel = lang.trim();
            return `<pre style="background:hsl(var(--muted));border:1px solid hsl(var(--border));border-radius:8px;padding:14px;overflow-x:auto;margin:10px 0;"><code class="language-${langLabel}" style="font-family:'JetBrains Mono',Consolas,monospace;font-size:0.92em;color:hsl(var(--foreground));">${code}</code></pre>`;
        });

        // Header # ## ###
        html = html
            .replace(/^### (.*)$/gim, '<h3>$1</h3>')
            .replace(/^## (.*)$/gim, '<h2>$1</h2>')
            .replace(/^# (.*)$/gim, '<h1>$1</h1>');

        // Bold / italic / inline code
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');

        // Links [text](url) — usa callback (niente $1/$2)
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (m, text, url) =>
            `<a href="${url}" target="_blank" rel="noopener">${text}</a>`
        );

        // Liste non ordinate "- "
        const lines = html.split('\n');
        let inList = false;
        const out = [];
        for (const line of lines) {
            if (/^\s*-\s+/.test(line)) {
                if (!inList) {
                    out.push('<ul>');
                    inList = true;
                }
                out.push('<li>' + line.replace(/^\s*-\s+/, '') + '</li>');
            } else {
                if (inList) {
                    out.push('</ul>');
                    inList = false;
                }
                out.push(line);
            }
        }
        if (inList) out.push('</ul>');
        html = out.join('\n');

        // Paragrafi / <br>
        html = html.replace(/\n{2,}/g, '</p><p>');
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
        // this._exportMarkdown(note);

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
            const blob = new Blob([note || ''], {type: 'text/markdown;charset=utf-8'});
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
        const last = focusables[focusables.length - 1];
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

    _qs(sel) {
        return this.modal ? this.modal.querySelector(sel) : null;
    }
}

window.NotesModal = NotesModal;
