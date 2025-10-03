// ============================================================================
// NOTES MODAL - Markdown notes editor with preview
// ============================================================================

class NotesModal {
    constructor(onSave) {
        this.onSave = onSave;
        this.currentTool = null;
        this.isEditing = false;
        this._createModal();
    }

    show(tool) {
        this.currentTool = tool;
        this.isEditing = false;
        
        const textarea = this.modal.querySelector('.notes-textarea');
        const preview = this.modal.querySelector('.notes-preview');
        const editBtn = this.modal.querySelector('.edit-btn');
        const saveBtn = this.modal.querySelector('.save-btn');
        
        textarea.value = tool.notes || '';
        textarea.style.display = 'none';
        editBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
        
        this._updatePreview();
        this.modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hide() {
        this.modal.style.display = 'none';
        document.body.style.overflow = '';
        this.currentTool = null;
    }

    _createModal() {
        const modalHTML = `
            <div class="modal-overlay" id="notesModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title"></h2>
                        <button class="modal-close" title="Close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <textarea class="notes-textarea" placeholder="Write your notes in Markdown..."></textarea>
                        <div class="notes-preview"></div>
                    </div>
                    <div class="modal-footer">
                        <button class="edit-btn">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            Edit
                        </button>
                        <button class="save-btn" style="display: none;">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M5 13l4 4L19 7"/>
                            </svg>
                            Save & Export
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('notesModal');

        // Event listeners
        this.modal.querySelector('.modal-close').addEventListener('click', () => this.hide());
        this.modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        const editBtn = this.modal.querySelector('.edit-btn');
        const saveBtn = this.modal.querySelector('.save-btn');
        const textarea = this.modal.querySelector('.notes-textarea');

        editBtn.addEventListener('click', () => this._toggleEdit(true));
        saveBtn.addEventListener('click', () => this._save());
        textarea.addEventListener('input', () => this._updatePreview());
    }

    _toggleEdit(editing) {
        this.isEditing = editing;
        const textarea = this.modal.querySelector('.notes-textarea');
        const editBtn = this.modal.querySelector('.edit-btn');
        const saveBtn = this.modal.querySelector('.save-btn');

        if (editing) {
            textarea.style.display = 'block';
            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline-flex';
            textarea.focus();
        } else {
            textarea.style.display = 'none';
            editBtn.style.display = 'inline-flex';
            saveBtn.style.display = 'none';
        }
        
        this._updatePreview();
    }

    _updatePreview() {
        const textarea = this.modal.querySelector('.notes-textarea');
        const preview = this.modal.querySelector('.notes-preview');
        const title = this.modal.querySelector('.modal-title');
        
        if (this.currentTool) {
            title.textContent = `Notes: ${this.currentTool.name}`;
        }

        const markdown = textarea.value || '*No notes yet*';
        preview.innerHTML = this._renderMarkdown(markdown);
        
        preview.style.display = this.isEditing ? 'none' : 'block';
    }

    _renderMarkdown(text) {
        if (!text) return '<p><em>No notes yet</em></p>';
        
        // Simple markdown parser
        let html = text
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code inline
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        
        // Code blocks
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
        
        // Lists
        html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        return `<p>${html}</p>`;
    }

    _save() {
        const textarea = this.modal.querySelector('.notes-textarea');
        const newNote = textarea.value;
        
        if (this.currentTool && this.onSave) {
            this.onSave(this.currentTool.id, newNote);
        }
        
        this._toggleEdit(false);
    }
}

window.NotesModal = NotesModal;
