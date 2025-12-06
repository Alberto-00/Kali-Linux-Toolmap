/**
 * Gestione modali per note e dettagli tool
 * - NotesModal: editor Markdown con preview
 * - DetailsModal: visualizzazione info complete tool
 */

(function() {
    'use strict';

    const ToolUtils = window.ToolUtils;
    const MarkdownUtils = window.MarkdownUtils;
    const DOMUtils = window.DOMUtils;

    const TRANSITION_DURATION = 280;

    // ========================================================================
    // NOTES MODAL
    // ========================================================================

    /**
     * Modale per editing note in Markdown
     * Supporta preview live e salvataggio con export
     */
    class NotesModal {
        /**
         * @param {Function} onSave - Callback chiamata al salvataggio: (toolId, noteText) => void
         */
        constructor(onSave) {
            this.onSave = onSave;
            this.currentTool = null;
            this.isEditing = false;
            this.modal = null;
            this.previousFocus = null;

            this._createModal();
            this._attachEventListeners();
        }

        /**
         * Mostra modale per un tool specifico
         * @param {Object} tool - Oggetto tool
         */
        show(tool) {
            if (!this.modal || !tool) return;

            this.currentTool = tool;
            this.isEditing = false;

            this._applyPhaseColor(tool);
            this._resetToPreviewMode();
            this._updatePreview();
            this._openModal();
        }

        /**
         * Nasconde modale con animazione
         */
        hide() {
            if (!this.modal) return;

            this.modal.classList.remove('open');
            this.modal.classList.add('closing');

            const handleEnd = () => this._closeModal();

            this.modal.addEventListener('transitionend', function handler(e) {
                if (e.target?.classList?.contains('modal-content')) {
                    e.currentTarget.removeEventListener('transitionend', handler);
                    handleEnd();
                }
            });

            setTimeout(handleEnd, TRANSITION_DURATION);
        }

        // --------------------------------------------------------------------
        // PRIVATE METHODS
        // --------------------------------------------------------------------

        /**
         * Crea struttura HTML modale
         * @private
         */
        _createModal() {
            const html = `
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

            document.body.insertAdjacentHTML('beforeend', html);
            this.modal = document.getElementById('notesModal');
        }

        /**
         * Apre modale
         * @private
         */
        _openModal() {
            this.previousFocus = document.activeElement;
            this.modal.style.display = 'flex';
            this.modal.classList.remove('closing');
            void this.modal.offsetWidth; // Force reflow
            this.modal.classList.add('open');
            this.modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            this._focusFirst();
        }

        /**
         * Chiude modale e cleanup
         * @private
         */
        _closeModal() {
            this.modal.style.display = 'none';
            this.modal.classList.remove('closing');
            this.modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';

            // Ripristina focus precedente
            if (this.previousFocus?.focus) {
                this.previousFocus.focus();
            }

            this.previousFocus = null;
            this.currentTool = null;
        }

        /**
         * Reset a modalità preview
         * @private
         */
        _resetToPreviewMode() {
            const els = this._getElements();

            if (els.textarea) {
                els.textarea.value = this.currentTool?.notes || '';
                els.textarea.style.display = 'none';
            }

            if (els.preview) els.preview.style.display = 'block';
            if (els.editBtn) els.editBtn.style.display = 'inline-flex';
            if (els.saveBtn) els.saveBtn.style.display = 'none';
            if (els.backBtn) els.backBtn.style.display = 'none';
        }

        /**
         * Applica colore fase al modale
         * @private
         */
        _applyPhaseColor(tool) {
            const content = this.modal?.querySelector('.modal-content');
            if (!content) return;

            const phase = ToolUtils.getPrimaryPhase(tool);
            const color = tool?.phaseColor || ToolUtils.getPhaseColor(phase);

            if (color) {
                content.style.setProperty('--phase', color);
            } else {
                content.style.removeProperty('--phase');
            }
        }

        /**
         * Toggle modalità edit/preview
         * @private
         */
        _toggleEdit(editing) {
            this.isEditing = !!editing;
            const els = this._getElements();

            if (this.isEditing) {
                if (els.textarea) {
                    els.textarea.style.display = 'block';
                    els.textarea.focus();
                }
                if (els.preview) els.preview.style.display = 'none';
                if (els.editBtn) els.editBtn.style.display = 'none';
                if (els.saveBtn) els.saveBtn.style.display = 'inline-flex';
                if (els.backBtn) els.backBtn.style.display = 'inline-flex';
            } else {
                if (els.textarea) els.textarea.style.display = 'none';
                if (els.preview) els.preview.style.display = 'block';
                if (els.editBtn) els.editBtn.style.display = 'inline-flex';
                if (els.saveBtn) els.saveBtn.style.display = 'none';
                if (els.backBtn) els.backBtn.style.display = 'none';
            }

            this._updatePreview();
        }

        /**
         * Aggiorna preview e titolo
         * @private
         */
        _updatePreview() {
            const els = this._getElements();
            this._updateTitle(els.title);
            this._updatePreviewContent(els);
        }

        /**
         * Aggiorna titolo modale
         * @private
         */
        _updateTitle(titleEl) {
            if (!titleEl) return;

            const phase = ToolUtils.getPrimaryPhase(this.currentTool);
            const phaseLabel = DOMUtils.formatLabel(phase);
            const baseName = ToolUtils.getName(this.currentTool);

            titleEl.textContent = phaseLabel
                ? `Notes: ${baseName} — ${phaseLabel}`
                : `Notes: ${baseName}`;
        }

        /**
         * Aggiorna contenuto preview (renderizza Markdown)
         * @private
         */
        _updatePreviewContent(els) {
            if (!els.preview) return;

            const markdown = els.textarea?.value || '*No notes yet*';
            els.preview.innerHTML = MarkdownUtils.render(markdown);
            els.preview.style.display = this.isEditing ? 'none' : 'block';
        }

        /**
         * Salva note e chiama callback
         * @private
         */
        _save() {
            const els = this._getElements();
            const note = els.textarea?.value || '';

            if (this.currentTool && typeof this.onSave === 'function') {
                this.onSave(this.currentTool.id, note);
            }

            this._toggleEdit(false);
        }

        /**
         * Attacca tutti gli event listeners
         * @private
         */
        _attachEventListeners() {
            if (!this.modal) return;

            const els = this._getElements();

            // Button actions
            els.closeBtn?.addEventListener('click', () => this.hide());
            els.editBtn?.addEventListener('click', () => this._toggleEdit(true));
            els.saveBtn?.addEventListener('click', () => this._save());
            els.backBtn?.addEventListener('click', () => this._toggleEdit(false));

            // Click fuori modale per chiudere
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.hide();
            });

            // Live preview durante editing
            els.textarea?.addEventListener('input', () => this._updatePreview());

            // Shortcuts tastiera
            document.addEventListener('keydown', (e) => {
                if (this.modal.style.display !== 'flex') return;

                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.hide();
                } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
                    e.preventDefault();
                    this._toggleEdit(!this.isEditing);
                } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                    e.preventDefault();
                    this._save();
                } else if (e.key === 'Tab') {
                    this._trapTab(e);
                }
            });

            // Reset su evento globale
            window.addEventListener('tm:reset', () => {
                if (this.modal.style.display === 'flex') this.hide();
            });
        }

        /**
         * Trap focus dentro modale (accessibilità)
         * @private
         */
        _trapTab(e) {
            const focusables = this._getFocusables();
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

        /**
         * Focus primo elemento focusabile
         * @private
         */
        _focusFirst() {
            const focusables = this._getFocusables();
            const first = focusables[0] || this.modal?.querySelector('.modal-close');
            first?.focus();
        }

        /**
         * Ottiene tutti elementi focusabili nel modale
         * @private
         */
        _getFocusables() {
            const content = this.modal?.querySelector('.modal-content');
            if (!content) return [];

            const selector = 'button, [href], input, textarea, select, details, [tabindex]:not([tabindex="-1"])';
            return Array.from(content.querySelectorAll(selector)).filter(
                el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden')
            );
        }

        /**
         * Ottiene riferimenti a tutti gli elementi DOM del modale
         * @private
         */
        _getElements() {
            return {
                textarea: this.modal?.querySelector('.notes-textarea'),
                preview: this.modal?.querySelector('.notes-preview'),
                editBtn: this.modal?.querySelector('.edit-btn'),
                saveBtn: this.modal?.querySelector('.save-btn'),
                backBtn: this.modal?.querySelector('.back-btn'),
                closeBtn: this.modal?.querySelector('.modal-close'),
                title: this.modal?.querySelector('.modal-title')
            };
        }
    }

    // ========================================================================
    // DETAILS MODAL
    // ========================================================================

    /**
     * Modale per visualizzazione dettagli completi tool
     * Mostra descrizione lunga, metadata, link repository
     */
    class DetailsModal {
        constructor() {
            this.modal = null;
            this._createModal();
        }

        /**
         * Mostra modale per un tool specifico
         * @param {Object} tool - Oggetto tool
         */
        show(tool) {
            if (!this.modal || !tool) return;

            this._setTitle(tool);
            this._setContent(tool);
            this._applyPhaseColor(tool);
            this._openModal();
        }

        /**
         * Nasconde modale con animazione
         */
        hide() {
            if (!this.modal) return;

            this.modal.classList.remove('open');
            this.modal.classList.add('closing');

            const handleEnd = () => {
                this.modal.style.display = 'none';
                this.modal.classList.remove('closing');
                document.body.style.overflow = '';
            };

            this.modal.addEventListener('transitionend', function handler(e) {
                if (e.target?.classList?.contains('modal-overlay')) {
                    e.currentTarget.removeEventListener('transitionend', handler);
                    handleEnd();
                }
            });

            setTimeout(handleEnd, TRANSITION_DURATION);
        }

        // --------------------------------------------------------------------
        // PRIVATE METHODS
        // --------------------------------------------------------------------

        /**
         * Crea struttura HTML modale
         * @private
         */
        _createModal() {
            const html = `
                <div class="modal-overlay" id="detailsModal" style="display:none;">
                    <div class="modal-content" style="max-width:750px;">
                        <div class="modal-header">
                            <h2 class="modal-title"></h2>
                            <button class="modal-close" title="Close">&times;</button>
                        </div>
                        <div class="modal-body"></div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', html);
            this.modal = document.getElementById('detailsModal');
            this._attachEventListeners();
        }

        /**
         * Apre modale
         * @private
         */
        _openModal() {
            this.modal.style.display = 'flex';
            this.modal.classList.remove('closing');
            void this.modal.offsetWidth; // Force reflow
            this.modal.classList.add('open');
            document.body.style.overflow = 'hidden';
        }

        /**
         * Imposta titolo modale
         * @private
         */
        _setTitle(tool) {
            const title = this.modal?.querySelector('.modal-title');
            if (!title) return;

            const name = ToolUtils.getName(tool);
            const version = tool?.version
                ? ` <span style="background: hsl(var(--muted));" class="version-chip">v${DOMUtils.escapeHtml(tool.version)}</span>`
                : '';

            title.innerHTML = DOMUtils.escapeHtml(name) + version;
        }

        /**
         * Imposta contenuto modale
         * @private
         */
        _setContent(tool) {
            const content = this.modal?.querySelector('.modal-body');
            if (!content) return;

            content.innerHTML = this._buildContentHTML(tool);
            this._attachCopyPathHandler();
        }

        /**
         * Genera HTML contenuto completo
         * @private
         */
        _buildContentHTML(tool) {
            const description = tool.desc_long || tool.desc || tool.description || 'No description available';
            const phases = this._getPhasesHTML(tool);
            const categoryPath = this._getCategoryPathHTML(tool);

            return `
                <div class="tool-details">
                    ${tool.icon ? `
                        <div class="tool-icon" style="background-image:url('${DOMUtils.escapeAttr(tool.icon)}');
                             background-size:contain;background-position:center;background-repeat:no-repeat;
                             width:80px;height:80px;margin:0 auto 20px;"></div>
                    ` : ''}

                    <div class="detail-section">
                        <h3>Description</h3>
                        <div class="rt">${description}</div>
                    </div>
                    
                    <div class="metadata-row">
                        ${phases}
                        ${tool.installation ? this._getInstallationHTML(tool.installation) : ''}
                        ${categoryPath}
                        ${tool.repo ? this._getRepoHTML(tool.repo) : ''}
                    </div>
                </div>
            `;
        }

        /**
         * Genera HTML badge fase
         * @private
         */
        _getPhasesHTML(tool) {
            const phase = ToolUtils.getPrimaryPhase(tool);
            if (!phase) return '';

            const color = ToolUtils.getPhaseColor(phase);
            return `
                <div class="detail-section">
                    <h3>Phase</h3>
                    <div class="phase-tags">
                        <span class="phase-tag" style="border:1px solid;--phase:${color};
                              background:color-mix(in srgb, ${color} 12%, hsl(var(--card)));
                              color:${color};padding:6px 12px;border-radius:8px;
                              font-size:13px;font-weight:600;display:inline-block;margin: 4px 4px 4px 0;">
                            ${DOMUtils.escapeHtml(DOMUtils.formatLabel(phase))}
                        </span>
                    </div>
                </div>
            `;
        }

        /**
         * Genera HTML tipo installazione
         * @private
         */
        _getInstallationHTML(installation) {
            return `
                <div class="detail-section">
                    <h3>Installation</h3>
                    <div class="kind-tag" style="display:inline-block;background:hsl(var(--muted));
                         border:1px solid var(--border);padding:6px 12px;border-radius:8px;
                         font-size:13px;color:var(--muted);">
                        ${DOMUtils.escapeHtml(installation)}
                    </div>
                </div>
            `;
        }

        /**
         * Genera HTML link repository
         * @private
         */
        _getRepoHTML(repo) {
            return `
                <div class="detail-section">
                    <h3>Repository</h3>
                    <a href="${DOMUtils.escapeAttr(repo)}" target="_blank" rel="noopener noreferrer" 
                       class="repo-link" style="color:var(--accent-2);text-decoration:none;word-break:break-all;">
                        ${DOMUtils.escapeHtml(repo)}
                    </a>
                </div>
            `;
        }

        /**
         * Genera HTML category path con button copia
         * @private
         */
        _getCategoryPathHTML(tool) {
            const catPath = ToolUtils.getCategoryPath(tool);
            if (!catPath.length) return '';

            const pathSegments = catPath.map(p => DOMUtils.escapeHtml(DOMUtils.formatLabel(p))).join(' / ');

            return `
                <div class="detail-section">
                    <h3>Path</h3>
                    <div class="category-path-row">
                        <button class="icon-btn copy-catpath" title="Copy category path" aria-label="Copy category path">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2z">
                                </path>
                            </svg>
                            <span class="sr-only">Copy category path</span>
                        </button>
                        <p class="category-path" data-raw="${catPath.join('/')}" 
                           style="color:var(--muted);font-size:14px;">
                            ${pathSegments}
                        </p>
                    </div>
                </div>
            `;
        }

        /**
         * Attacca handler copia path
         * @private
         */
        _attachCopyPathHandler() {
            const copyBtn = this.modal?.querySelector('.copy-catpath');
            const pathEl = this.modal?.querySelector('.category-path');

            if (!copyBtn || !pathEl) return;

            copyBtn.addEventListener('click', () => {
                const text = pathEl.dataset.raw || pathEl.textContent.trim();
                if (!text) return;

                navigator.clipboard.writeText(text).then(() => {
                    this._showCopySuccess(copyBtn);
                }).catch(error => {
                    if (window.MessageModal) {
                        MessageModal.danger('Errore Copia', 'Impossibile copiare il percorso negli appunti.');
                    }
                });
            });
        }

        /**
         * Mostra feedback copia riuscita (cambia icona temporaneamente)
         * @private
         */
        _showCopySuccess(btn) {
            const svg = btn.querySelector('svg');
            if (!svg) return;

            const original = svg.outerHTML;
            svg.outerHTML = `
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
            `;

            setTimeout(() => {
                const current = btn.querySelector('svg');
                if (current) current.outerHTML = original;
            }, 1200);
        }

        /**
         * Applica colore fase al modale
         * @private
         */
        _applyPhaseColor(tool) {
            const phase = ToolUtils.getPrimaryPhase(tool);
            const color = tool?.phaseColor || ToolUtils.getPhaseColor(phase);

            const content = this.modal?.querySelector('.modal-content');
            if (content && color) {
                content.style.setProperty('--phase', color);
            }
        }

        /**
         * Attacca event listeners
         * @private
         */
        _attachEventListeners() {
            const closeBtn = this.modal?.querySelector('.modal-close');
            closeBtn?.addEventListener('click', () => this.hide());

            // Click fuori modale per chiudere
            this.modal?.addEventListener('click', (e) => {
                if (e.target === this.modal) this.hide();
            });

            // ESC per chiudere
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal?.style.display === 'flex') {
                    this.hide();
                }
            });
        }
    }

    // ========================================================================
    // EXPORT
    // ========================================================================

    window.NotesModal = NotesModal;
    window.DetailsModal = DetailsModal;
})();