// ============================================================================
// notes-modal.js
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
    // ============================================================================
    // CONSTANTS
    // ============================================================================

    static PHASE_COLORS = {
        '00_Common': 'hsl(270 91% 65%)',
        '01_Information_Gathering': 'hsl(210 100% 62%)',
        '02_Exploitation': 'hsl(4 85% 62%)',
        '03_Post_Exploitation': 'hsl(32 98% 55%)',
        '04_Miscellaneous': 'hsl(158 64% 52%)'
    };

    static TRANSITION_DURATION = 280;

    static SELECTORS = {
        modalOverlay: '#notesModal',
        modalContent: '.modal-content',
        modalClose: '.modal-close',
        modalTitle: '.modal-title',
        textarea: '.notes-textarea',
        preview: '.notes-preview',
        editBtn: '.edit-btn',
        saveBtn: '.save-btn',
        backBtn: '.back-btn'
    };

    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    constructor(onSave) {
        this.onSave = onSave;
        this.currentTool = null;
        this.isEditing = false;
        this.modal = null;
        this.previousFocus = null;

        this._initialize();
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    _initialize() {
        this._createModal();
        this._attachEventListeners();
    }

    _createModal() {
        const modalHTML = `
            <div class="modal-overlay" id="notesModal" role="dialog" aria-modal="true" 
                 aria-hidden="true" style="display:none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title" id="notesTitle"></h2>
                        <button class="modal-close" type="button" title="Close" aria-label="Close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <textarea class="notes-textarea" placeholder="Write your notes in Markdown..." 
                                  spellcheck="false"></textarea>
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
                        <button class="back-btn" type="button" title="Back to preview" aria-label="Back to preview" 
                                style="display:none;margin-right:8px;">
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

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    show(tool) {
        if (!this.modal) return;

        this.currentTool = tool || null;
        this.isEditing = false;

        this._applyPhaseColor(tool);
        this._resetToPreviewMode();
        this._updatePreview();
        this._openModal();
    }

    hide() {
        if (!this.modal) return;

        this.modal.classList.remove('open');
        this.modal.classList.add('closing');

        const handleTransitionEnd = () => {
            this._closeModal();
        };

        this.modal.addEventListener('transitionend', function handler(e) {
            if (e.target?.classList?.contains('modal-content')) {
                e.currentTarget.removeEventListener('transitionend', handler);
                handleTransitionEnd();
            }
        });

        setTimeout(handleTransitionEnd, NotesModal.TRANSITION_DURATION);
    }

    // ============================================================================
    // MODAL STATE MANAGEMENT
    // ============================================================================

    _openModal() {
        this.previousFocus = document.activeElement;
        this.modal.style.display = 'flex';
        this.modal.classList.remove('closing');
        void this.modal.offsetWidth;
        this.modal.classList.add('open');
        this.modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        this._focusFirst();
    }

    _closeModal() {
        this.modal.style.display = 'none';
        this.modal.classList.remove('closing');
        this.modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        if (this.previousFocus?.focus) {
            this.previousFocus.focus();
        }

        this.previousFocus = null;
        this.currentTool = null;
    }

    _resetToPreviewMode() {
        const elements = this._getElements();

        if (elements.textarea) {
            elements.textarea.value = this.currentTool?.notes || '';
            elements.textarea.style.display = 'none';
        }

        if (elements.preview) {
            elements.preview.style.display = 'block';
        }

        if (elements.editBtn) {
            elements.editBtn.style.display = 'inline-flex';
        }

        if (elements.saveBtn) {
            elements.saveBtn.style.display = 'none';
        }

        if (elements.backBtn) {
            elements.backBtn.style.display = 'none';
        }
    }

    // ============================================================================
    // PHASE COLOR
    // ============================================================================

    _applyPhaseColor(tool) {
        const content = this._querySelector(NotesModal.SELECTORS.modalContent);
        if (!content) return;

        const phaseColor = tool?.phaseColor || this._derivePhaseColor(tool);

        if (phaseColor) {
            content.style.setProperty('--phase', phaseColor);
        } else {
            content.style.removeProperty('--phase');
        }
    }

    _derivePhaseColor(tool) {
        const phase = tool?.phase || (Array.isArray(tool?.phases) ? tool.phases[0] : null);
        return NotesModal.PHASE_COLORS[phase] || 'hsl(var(--accent))';
    }

    // ============================================================================
    // EDIT MODE TOGGLE
    // ============================================================================

    _toggleEdit(editing) {
        this.isEditing = !!editing;
        const elements = this._getElements();

        if (this.isEditing) {
            this._enterEditMode(elements);
        } else {
            this._exitEditMode(elements);
        }

        this._updatePreview();
    }

    _enterEditMode(elements) {
        if (elements.textarea) {
            elements.textarea.style.display = 'block';
            elements.textarea.focus();
        }
        if (elements.preview) elements.preview.style.display = 'none';
        if (elements.editBtn) elements.editBtn.style.display = 'none';
        if (elements.saveBtn) elements.saveBtn.style.display = 'inline-flex';
        if (elements.backBtn) elements.backBtn.style.display = 'inline-flex';
    }

    _exitEditMode(elements) {
        if (elements.textarea) elements.textarea.style.display = 'none';
        if (elements.preview) elements.preview.style.display = 'block';
        if (elements.editBtn) elements.editBtn.style.display = 'inline-flex';
        if (elements.saveBtn) elements.saveBtn.style.display = 'none';
        if (elements.backBtn) elements.backBtn.style.display = 'none';
    }

    // ============================================================================
    // PREVIEW RENDERING
    // ============================================================================

    _updatePreview() {
        const elements = this._getElements();

        this._updateTitle(elements.title);
        this._updatePreviewContent(elements);
    }

    _updateTitle(titleElement) {
        if (!titleElement) return;

        const phase = this._getFormattedPhase();
        const baseName = this.currentTool?.name || this.currentTool?.title || 'Tool';
        titleElement.textContent = phase ? `Notes: ${baseName} — ${phase}` : `Notes: ${baseName}`;
    }

    _updatePreviewContent(elements) {
        if (!elements.preview) return;

        const markdown = elements.textarea?.value || '*No notes yet*';
        elements.preview.innerHTML = MarkdownRenderer.render(markdown);
        elements.preview.style.display = this.isEditing ? 'none' : 'block';
    }

    _getFormattedPhase() {
        const tool = this.currentTool || {};
        const rawPhase = tool.phase || (Array.isArray(tool.phases) ? tool.phases[0] : '');
        return this._formatPhaseLabel(rawPhase);
    }

    _formatPhaseLabel(phase) {
        if (!phase) return '';
        return String(phase).replace(/^\d+_/, '').replace(/_/g, ' ');
    }

    // ============================================================================
    // SAVE FUNCTIONALITY
    // ============================================================================

    _save() {
        const elements = this._getElements();
        const note = elements.textarea?.value || '';

        if (this.currentTool && typeof this.onSave === 'function') {
            this.onSave(this.currentTool.id, note);
        }

        this._toggleEdit(false);
    }

    // ============================================================================
    // EVENT LISTENERS
    // ============================================================================

    _attachEventListeners() {
        if (!this.modal) return;

        this._attachButtonListeners();
        this._attachBackdropListener();
        this._attachTextareaListener();
        this._attachKeyboardListeners();
        this._attachAppListeners();
    }

    _attachButtonListeners() {
        const elements = this._getElements();

        elements.closeBtn?.addEventListener('click', () => this.hide());
        elements.editBtn?.addEventListener('click', () => this._toggleEdit(true));
        elements.saveBtn?.addEventListener('click', () => this._save());
        elements.backBtn?.addEventListener('click', () => this._toggleEdit(false));
    }

    _attachBackdropListener() {
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    _attachTextareaListener() {
        const textarea = this._querySelector(NotesModal.SELECTORS.textarea);
        textarea?.addEventListener('input', () => this._updatePreview());
    }

    _attachKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.modal.style.display !== 'flex') return;

            if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
                return;
            }

            const isModKey = e.ctrlKey || e.metaKey;

            if (isModKey && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                this._toggleEdit(!this.isEditing);
                return;
            }

            if (isModKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                this._save();
                return;
            }

            if (e.key === 'Tab') {
                this._trapTab(e);
            }
        });
    }

    _attachAppListeners() {
        window.addEventListener('tm:reset', () => {
            if (this.modal.style.display === 'flex') {
                this.hide();
            }
        });
    }

    // ============================================================================
    // FOCUS MANAGEMENT
    // ============================================================================

    _trapTab(event) {
        const focusables = this._getFocusableElements();
        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;

        if (event.shiftKey) {
            if (active === first || !this.modal.contains(active)) {
                event.preventDefault();
                last.focus();
            }
        } else {
            if (active === last) {
                event.preventDefault();
                first.focus();
            }
        }
    }

    _focusFirst() {
        const focusables = this._getFocusableElements();
        const firstElement = focusables[0] || this._querySelector(NotesModal.SELECTORS.modalClose);
        firstElement?.focus();
    }

    _getFocusableElements() {
        const content = this._querySelector(NotesModal.SELECTORS.modalContent);
        if (!content) return [];

        const selector = 'button, [href], input, textarea, select, details, [tabindex]:not([tabindex="-1"])';

        return Array.from(content.querySelectorAll(selector)).filter(
            el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
        );
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    _getElements() {
        return {
            textarea: this._querySelector(NotesModal.SELECTORS.textarea),
            preview: this._querySelector(NotesModal.SELECTORS.preview),
            editBtn: this._querySelector(NotesModal.SELECTORS.editBtn),
            saveBtn: this._querySelector(NotesModal.SELECTORS.saveBtn),
            backBtn: this._querySelector(NotesModal.SELECTORS.backBtn),
            closeBtn: this._querySelector(NotesModal.SELECTORS.modalClose),
            title: this._querySelector(NotesModal.SELECTORS.modalTitle)
        };
    }

    _querySelector(selector) {
        return this.modal ? this.modal.querySelector(selector) : null;
    }
}

// ============================================================================
// MARKDOWN RENDERER (Static Utility)
// ============================================================================

class MarkdownRenderer {
    static render(text) {
        let html = this._escapeHtml(text);

        html = this._renderCodeBlocks(html);
        html = this._renderHeaders(html);
        html = this._renderInlineFormatting(html);
        html = this._renderLinks(html);
        html = this._renderLists(html);
        html = this._renderParagraphs(html);

        return html;
    }

    static _escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    static _renderCodeBlocks(html) {
        return html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang = '', code = '') => {
            const langLabel = lang.trim();
            return `<pre style="background:hsl(var(--muted));border:1px solid hsl(var(--border));border-radius:8px;padding:14px;overflow-x:auto;margin:10px 0;"><code class="language-${langLabel}" style="font-family:'JetBrains Mono',Consolas,monospace;font-size:0.92em;color:hsl(var(--foreground));">${code}</code></pre>`;
        });
    }

    static _renderHeaders(html) {
        return html
            .replace(/^### (.*)$/gim, '<h3>$1</h3>')
            .replace(/^## (.*)$/gim, '<h2>$1</h2>')
            .replace(/^# (.*)$/gim, '<h1>$1</h1>');
    }

    static _renderInlineFormatting(html) {
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
        return html;
    }

    static _renderLinks(html) {
        return html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (match, text, url) =>
            `<a href="${url}" target="_blank" rel="noopener">${text}</a>`
        );
    }

    static _renderLists(html) {
        const lines = html.split('\n');
        let inList = false;
        const output = [];

        for (const line of lines) {
            if (/^\s*-\s+/.test(line)) {
                if (!inList) {
                    output.push('<ul>');
                    inList = true;
                }
                output.push('<li>' + line.replace(/^\s*-\s+/, '') + '</li>');
            } else {
                if (inList) {
                    output.push('</ul>');
                    inList = false;
                }
                output.push(line);
            }
        }

        if (inList) output.push('</ul>');
        return output.join('\n');
    }

    static _renderParagraphs(html) {
        html = html.replace(/\n{2,}/g, '</p><p>');
        if (!/^<([a-z]+)([^>]*)>/.test(html)) {
            html = '<p>' + html + '</p>';
        }
        return html;
    }
}

// ============================================================================
// EXPORT
// ============================================================================

window.NotesModal = NotesModal;