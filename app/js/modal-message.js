/**
 * MODAL MESSAGE SYSTEM
 * Sistema di modal riutilizzabile per messaggi, conferme e avvisi
 *
 * Uso:
 * MessageModal.show({
 *     type: 'danger',           // danger, warning, success, info
 *     title: 'Conferma Eliminazione',
 *     message: 'Sei sicuro di voler eliminare questo cliente?',
 *     confirmText: 'Elimina',
 *     cancelText: 'Annulla',
 *     onConfirm: () => { ... },
 *     onCancel: () => { ... }
 * });
 */

let MessageModal = {
    // Elementi del DOM
    overlay: null,
    container: null,
    icon: null,
    title: null,
    text: null,
    confirmBtn: null,
    cancelBtn: null,

    // Configurazione corrente
    currentConfig: null,

    // Icone SVG per ogni tipo
    icons: {
        danger: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        warning: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        success: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `,
        info: `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `
    },

    /**
     * Inizializza il modal
     */
    init() {
        // Crea HTML del modal
        this.createModal();

        // Ottieni elementi del DOM
        this.overlay = document.getElementById('messageModalOverlay');
        this.container = document.getElementById('messageModalContainer');
        this.icon = document.getElementById('messageModalIcon');
        this.title = document.getElementById('messageModalTitle');
        this.text = document.getElementById('messageModalText');
        this.confirmBtn = document.getElementById('messageModalConfirm');
        this.cancelBtn = document.getElementById('messageModalCancel');

        if (!this.overlay) {
            console.error('MessageModal: Failed to create modal elements');
            return;
        }

        // Event listeners
        this.cancelBtn.addEventListener('click', () => this.handleCancel());
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());

        // Chiudi con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.overlay.classList.contains('show')) {
                this.handleCancel();
            }
        });

        // Chiudi cliccando sull'overlay (opzionale)
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay && this.currentConfig?.closeOnOverlayClick !== false) {
                this.handleCancel();
            }
        });
    },

    /**
     * Crea HTML del modal e lo aggiunge al body
     */
    createModal() {
        const html = `
            <div class="modal-message-overlay" id="messageModalOverlay" aria-hidden="true">
                <div class="modal-message-container" id="messageModalContainer">
                    <div class="modal-message-icon" id="messageModalIcon">
                        <!-- L'icona verrà inserita dinamicamente -->
                    </div>
                    <div class="modal-message-content">
                        <h3 class="modal-message-title" id="messageModalTitle">Titolo</h3>
                        <p class="modal-message-text" id="messageModalText">Messaggio</p>
                    </div>
                    <div class="modal-message-actions">
                        <button class="btn btn-secondary modal-message-btn-cancel" id="messageModalCancel">
                            Annulla
                        </button>
                        <button class="btn btn-primary modal-message-btn-confirm" id="messageModalConfirm">
                            Conferma
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    },

    /**
     * Mostra il modal con la configurazione specificata
     */
    show(config = {}) {
        // Salva configurazione
        this.currentConfig = {
            type: config.type || 'info',
            title: config.title || 'Attenzione',
            message: config.message || '',
            confirmText: config.confirmText || 'Conferma',
            cancelText: config.cancelText || 'Annulla',
            onConfirm: config.onConfirm || null,
            onCancel: config.onCancel || null,
            showCancel: config.showCancel !== false,
            showConfirm: config.showConfirm !== false,
            closeOnOverlayClick: config.closeOnOverlayClick !== false
        };

        // Imposta contenuto
        this.setIcon(this.currentConfig.type);
        this.title.textContent = this.currentConfig.title;
        // Usa innerHTML per supportare HTML nel messaggio
        this.text.innerHTML = this.currentConfig.message;
        this.confirmBtn.textContent = this.currentConfig.confirmText;
        this.cancelBtn.textContent = this.currentConfig.cancelText;

        // Imposta stile bottone conferma
        this.setConfirmButtonStyle(this.currentConfig.type);

        // Mostra/nascondi bottone annulla
        if (this.currentConfig.showCancel) {
            this.cancelBtn.style.display = 'block';
        } else {
            this.cancelBtn.style.display = 'none';
        }

        // Mostra/nascondi bottone conferma
        if (this.currentConfig.showConfirm) {
            this.confirmBtn.style.display = 'block';
        } else {
            this.confirmBtn.style.display = 'none';
        }

        // Mostra modal
        this.overlay.classList.remove('hiding');
        this.overlay.classList.add('show');
        this.overlay.setAttribute('aria-hidden', 'false');

        // Focus sul bottone di default
        setTimeout(() => {
            if (this.currentConfig.type === 'danger' || this.currentConfig.type === 'warning') {
                this.cancelBtn.focus();
            } else {
                this.confirmBtn.focus();
            }
        }, 100);

        // Previeni scroll del body
        document.body.style.overflow = 'hidden';
    },

    /**
     * Imposta l'icona in base al tipo
     */
    setIcon(type) {
        // Rimuovi tutte le classi di tipo
        this.icon.className = 'modal-message-icon';

        // Aggiungi classe specifica
        this.icon.classList.add(`modal-message-icon-${type}`);

        // Imposta SVG
        this.icon.innerHTML = this.icons[type] || this.icons.info;
    },

    /**
     * Imposta lo stile del bottone conferma in base al tipo
     */
    setConfirmButtonStyle(type) {
        // Rimuovi tutte le classi di tipo
        this.confirmBtn.classList.remove('btn-danger', 'btn-warning', 'btn-success', 'btn-info', 'btn-primary');

        // Aggiungi classe specifica
        switch (type) {
            case 'danger':
                this.confirmBtn.classList.add('btn-danger');
                break;
            case 'warning':
                this.confirmBtn.classList.add('btn-warning');
                break;
            case 'success':
                this.confirmBtn.classList.add('btn-success');
                break;
            case 'info':
            default:
                this.confirmBtn.classList.add('btn-primary');
                break;
        }
    },

    /**
     * Gestisce la conferma
     */
    handleConfirm() {
        if (this.currentConfig?.onConfirm) {
            this.currentConfig.onConfirm();
        }
        this.hide();
    },

    /**
     * Gestisce l'annullamento
     */
    handleCancel() {
        if (this.currentConfig?.onCancel) {
            this.currentConfig.onCancel();
        }
        this.hide();
    },

    /**
     * Nasconde il modal con animazione
     */
    hide() {
        this.overlay.classList.add('hiding');
        this.overlay.classList.remove('show');

        setTimeout(() => {
            this.overlay.classList.remove('hiding');
            this.overlay.setAttribute('aria-hidden', 'true');
            this.currentConfig = null;

            // Ripristina scroll del body
            document.body.style.overflow = '';
        }, 300);
    },

    /**
     * Shortcuts per tipi comuni
     */

    /**
     * Mostra modal di conferma eliminazione
     */
    confirmDelete(itemName, onConfirm) {
        this.show({
            type: 'danger',
            title: 'Conferma Eliminazione',
            message: `Sei sicuro di voler eliminare "<strong>${itemName}</strong>"? Questa azione non può essere annullata.`,
            confirmText: 'Elimina',
            cancelText: 'Annulla',
            onConfirm: onConfirm
        });
    },

    /**
     * Mostra modal di pericolo
     */
    danger(title, message, onConfirm) {
        this.show({
            type: 'danger',
            title: title,
            message: message,
            confirmText: 'Ok',
            showCancel: false,
            onConfirm: onConfirm
        });
    },

    /**
     * Mostra modal di avviso
     */
    warning(title, message, onConfirm) {
        this.show({
            type: 'warning',
            title: title,
            message: message,
            confirmText: 'Ok',
            showCancel: false,
            onConfirm: onConfirm
        });
    },

    /**
     * Mostra modal di successo
     */
    success(title, message, onConfirm) {
        this.show({
            type: 'success',
            title: title,
            message: message,
            confirmText: 'Ok',
            showCancel: false,
            onConfirm: onConfirm
        });
    },

    /**
     * Mostra modal informativo
     */
    info(title, message, onConfirm) {
        this.show({
            type: 'info',
            title: title,
            message: message,
            confirmText: 'Ok',
            showCancel: false,
            onConfirm: onConfirm
        });
    }
};

// Export to global namespace
window.MessageModal = MessageModal;

// Inizializza quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MessageModal.init());
} else {
    MessageModal.init();
}