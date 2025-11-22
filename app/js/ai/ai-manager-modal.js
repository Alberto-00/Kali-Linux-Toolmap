/**
 * AI Manager Modal
 * Gestione upload e configurazione Vector Store per ricerca AI
 * Con protezione contro interruzioni durante upload
 */

(function () {
    'use strict';

    // ========================================================================
    // STATE
    // ========================================================================

    let modal = null;
    let isOpen = false;
    let isUploading = false;
    let beforeUnloadHandler = null;

    // ========================================================================
    // MODAL CREATION
    // ========================================================================

    function createModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'aiManagerModal';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2 class="modal-title">AI Search Manager</h2>
                    <button class="modal-close" aria-label="Close">×</button>
                </div>

                <div class="modal-body">
                    <div class="ai-status-section">
                        <h3 class="section-title-ai">Configuration Status</h3>
                        <div class="status-grid">
                            <div class="status-item">
                                <span class="status-label">API Key</span>
                                <span class="status-value" id="status-api-key">
                                    <span class="status-icon">⏳</span> Checking...
                                </span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Assistant ID</span>
                                <span class="status-value" id="status-assistant">
                                    <span class="status-icon">⏳</span> Checking...
                                </span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Vector Store</span>
                                <span class="status-value" id="status-vector-store">
                                    <span class="status-icon">⏳</span> Checking...
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="ai-actions-section">
                        <h3 class="section-title-ai">Registry Management</h3>
                        <div class="action-buttons">
                            <button class="action-btn" id="upload-registry-btn" disabled>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                                </svg>
                                <div class="btn-content">
                                    <span class="btn-title">Upload Registry</span>
                                    <span class="btn-desc">Create vector store and upload tool data</span>
                                </div>
                            </button>

                            <button class="action-btn" id="update-registry-btn" disabled>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                                <div class="btn-content">
                                    <span class="btn-title">Force Update</span>
                                    <span class="btn-desc">Re-upload registry (use when tools are updated)</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div class="ai-info-section" id="vector-store-info" style="display: none;">
                        <h3 class="section-title-ai">Vector Store Details</h3>
                        <div class="info-card">
                            <div class="info-row">
                                <span class="info-label">Vector Store ID:</span>
                                <code class="info-value" id="vector-store-id">-</code>
                            </div>
                            <div class="info-notice">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span>Vector store persists indefinitely (no expiration)</span>
                            </div>
                        </div>
                    </div>

                    <!-- Upload progress indicator -->
                    <div class="ai-upload-progress" id="upload-progress" style="display: none;">
                        <div class="progress-spinner"></div>
                        <span class="progress-text">Uploading registry, please wait...</span>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="back-btn" id="close-modal-btn">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        return overlay;
    }

    // ========================================================================
    // UPLOAD PROTECTION
    // ========================================================================

    /**
     * Enable upload protection (prevent page close/reload)
     */
    function enableUploadProtection() {
        isUploading = true;

        // Prevent page close/reload
        beforeUnloadHandler = (e) => {
            e.preventDefault();
            e.returnValue = 'Upload in progress. Are you sure you want to leave?';
            return e.returnValue;
        };
        window.addEventListener('beforeunload', beforeUnloadHandler);

        // Disable close buttons
        const closeBtn = modal.querySelector('.modal-close');
        const closeBtnFooter = modal.querySelector('#close-modal-btn');
        if (closeBtn) closeBtn.disabled = true;
        if (closeBtnFooter) closeBtnFooter.disabled = true;

        // Show progress indicator
        const progressEl = document.getElementById('upload-progress');
        if (progressEl) progressEl.style.display = 'flex';
    }

    /**
     * Disable upload protection
     */
    function disableUploadProtection() {
        isUploading = false;

        // Remove beforeunload listener
        if (beforeUnloadHandler) {
            window.removeEventListener('beforeunload', beforeUnloadHandler);
            beforeUnloadHandler = null;
        }

        // Enable close buttons
        const closeBtn = modal.querySelector('.modal-close');
        const closeBtnFooter = modal.querySelector('#close-modal-btn');
        if (closeBtn) closeBtn.disabled = false;
        if (closeBtnFooter) closeBtnFooter.disabled = false;

        // Hide progress indicator
        const progressEl = document.getElementById('upload-progress');
        if (progressEl) progressEl.style.display = 'none';
    }

    // ========================================================================
    // MODAL CONTROLS
    // ========================================================================

    function openModal() {
        if (!modal) {
            modal = createModal();
            attachEventListeners();
        }

        modal.style.display = 'flex';
        requestAnimationFrame(() => {
            modal.classList.add('open');
        });

        isOpen = true;
        updateStatus();
    }

    function closeModal() {
        if (!modal) return;

        // Prevent closing if upload in progress
        if (isUploading) {
            if (window.MessageModal) {
                MessageModal.warning(
                    'Upload in Progress',
                    'Cannot close while uploading registry. Please wait for the operation to complete.'
                );
            }
            return;
        }

        modal.classList.add('closing');
        modal.classList.remove('open');

        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
            isOpen = false;
        }, 240);
    }

    // ========================================================================
    // STATUS UPDATE
    // ========================================================================

    function updateStatus() {
        const apiKey = window.Config?.get('OPENAI_API_KEY');
        const assistantId = window.Config?.get('OPENAI_ASSISTANT_ID');
        const vectorStoreId = window.AISearch?.getVectorStoreId();

        // API Key status
        const apiKeyEl = document.getElementById('status-api-key');
        if (apiKey && apiKey !== 'your_api_key_here') {
            apiKeyEl.innerHTML = '<span class="status-icon">✅</span> Configured';
        } else {
            apiKeyEl.innerHTML = '<span class="status-icon">❌</span> Not configured';
        }

        // Assistant ID status
        const assistantEl = document.getElementById('status-assistant');
        if (assistantId && assistantId.length > 0) {
            assistantEl.innerHTML = `<span class="status-icon">✅</span> ${assistantId}`;
        } else {
            assistantEl.innerHTML = '<span class="status-icon">❌</span> Not configured';
        }

        // Vector Store status
        const vectorStoreEl = document.getElementById('status-vector-store');
        const vectorStoreInfo = document.getElementById('vector-store-info');
        const vectorStoreIdEl = document.getElementById('vector-store-id');

        if (vectorStoreId && vectorStoreId.length > 0) {
            vectorStoreEl.innerHTML = '<span class="status-icon">✅</span> Ready';
            vectorStoreInfo.style.display = 'block';
            vectorStoreIdEl.textContent = vectorStoreId;
        } else {
            vectorStoreEl.innerHTML = '<span class="status-icon">⚠️</span> Not uploaded';
            vectorStoreInfo.style.display = 'none';
        }

        // Update buttons state
        const uploadBtn = document.getElementById('upload-registry-btn');
        const updateBtn = document.getElementById('update-registry-btn');

        const isConfigured = window.AISearch?.isAvailable();
        const hasVectorStore = window.AISearch?.isReady();

        if (isConfigured && !isUploading) {
            if (!hasVectorStore) {
                uploadBtn.disabled = false;
                updateBtn.disabled = true;
            } else {
                uploadBtn.disabled = true;
                updateBtn.disabled = false;
            }
        } else {
            uploadBtn.disabled = true;
            updateBtn.disabled = true;
        }
    }

    // ========================================================================
    // UPLOAD HANDLERS
    // ========================================================================

    async function handleUploadRegistry() {
        if (isUploading) return;

        if (!window.MessageModal) {
            alert('MessageModal not available');
            return;
        }

        enableUploadProtection();
        updateStatus();

        try {
            const result = await window.AISearch.uploadRegistry();

            disableUploadProtection();

            // Show success with vector store ID
            MessageModal.success(
                'Upload Successful',
                `Registry uploaded successfully!<br><br>
                <strong>Vector Store ID:</strong><br>
                <code style="background: var(--bg); padding: 8px; border-radius: 4px; display: block; margin-top: 8px; word-break: break-all;">${result.vectorStoreId}</code><br>
                <strong style="color: #f59e0b;">⚠️ Important:</strong> Add this to <code>secret.env</code>:<br>
                <code style="background: var(--bg); padding: 8px; border-radius: 4px; display: block; margin-top: 8px;">OPENAI_VECTOR_STORE_ID=${result.vectorStoreId}</code>`,
                () => {
                    updateStatus();
                }
            );

        } catch (error) {
            disableUploadProtection();

            MessageModal.danger(
                'Upload Failed',
                `An error occurred during upload:<br><br><strong>${error.message}</strong><br><br>Please check your configuration and try again.`
            );

            updateStatus();
        }
    }

    async function handleUpdateRegistry() {
        if (isUploading) return;

        if (!window.MessageModal) {
            alert('MessageModal not available');
            return;
        }

        // Confirm before updating
        MessageModal.show({
            type: 'warning',
            title: 'Confirm Registry Update',
            message: 'This will create a new vector store and re-upload the entire registry.<br><br>The old vector store ID will be replaced.<br><br><strong>Continue?</strong>',
            confirmText: 'Update',
            cancelText: 'Cancel',
            onConfirm: async () => {
                enableUploadProtection();
                updateStatus();

                try {
                    const result = await window.AISearch.forceUpdateRegistry();

                    disableUploadProtection();

                    // Show success with new vector store ID
                    MessageModal.success(
                        'Update Successful',
                        `Registry updated successfully!<br><br>
                        <strong>New Vector Store ID:</strong><br>
                        <code style="background: var(--bg); padding: 8px; border-radius: 4px; display: block; margin-top: 8px; word-break: break-all;">${result.vectorStoreId}</code><br>
                        <strong style="color: #f59e0b;">⚠️ Important:</strong> Update <code>secret.env</code> with:<br>
                        <code style="background: var(--bg); padding: 8px; border-radius: 4px; display: block; margin-top: 8px;">OPENAI_VECTOR_STORE_ID=${result.vectorStoreId}</code>`,
                        () => {
                            updateStatus();
                        }
                    );

                } catch (error) {
                    disableUploadProtection();

                    MessageModal.danger(
                        'Update Failed',
                        `An error occurred during update:<br><br><strong>${error.message}</strong><br><br>Please check your configuration and try again.`
                    );

                    updateStatus();
                }
            }
        });
    }

    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================

    function attachEventListeners() {
        const closeBtn = modal.querySelector('.modal-close');
        const closeBtnFooter = modal.querySelector('#close-modal-btn');
        const uploadBtn = modal.querySelector('#upload-registry-btn');
        const updateBtn = modal.querySelector('#update-registry-btn');

        closeBtn?.addEventListener('click', closeModal);
        closeBtnFooter?.addEventListener('click', closeModal);
        uploadBtn?.addEventListener('click', handleUploadRegistry);
        updateBtn?.addEventListener('click', handleUpdateRegistry);

        // Close on overlay click (only if not uploading)
        modal.addEventListener('click', (e) => {
            if (e.target === modal && !isUploading) {
                closeModal();
            }
        });

        // Block ESC during upload
        document.addEventListener('keydown', handleEscapeKey);
    }

    function handleEscapeKey(e) {
        if (e.key === 'Escape' && isOpen) {
            if (isUploading) {
                // Prevent ESC during upload
                e.preventDefault();
                e.stopPropagation();
                if (window.MessageModal) {
                    MessageModal.warning(
                        'Upload in Progress',
                        'Cannot close while uploading registry. Please wait for the operation to complete.'
                    );
                }
            } else {
                closeModal();
            }
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    window.AIManagerModal = {
        open: openModal,
        close: closeModal
    };

})();