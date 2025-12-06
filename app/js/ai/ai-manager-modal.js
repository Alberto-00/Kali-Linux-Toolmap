/**
 * AI Manager Modal - Con sezioni collassabili e loading states
 * Gestisce configurazione, usage, limits, cache status via API
 */

(function () {
    'use strict';

    // ========================================================================
    // STATE
    // ========================================================================

    let modal = null;
    let isOpen = false;
    let isLoading = false;

    // ========================================================================
    // MODAL CREATION
    // ========================================================================

    function createModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'aiManagerModal';
        overlay.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h2 class="modal-title">AI Search Manager</h2>
                    <button class="modal-close" aria-label="Close">×</button>
                </div>

                <div class="modal-body">
                    <!-- Status Section -->
                    <div class="ai-modal-section">
                        <div class="ai-section-header">
                            <h3 class="ai-section-title">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="ai-section-icon">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                API Status
                            </h3>
                            <button class="ai-section-toggle" aria-label="Toggle">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="ai-section-content">
                            <div class="ai-status-grid">
                                <div class="ai-status-item">
                                    <span class="ai-status-label">API Key</span>
                                    <span class="ai-status-value" id="status-api-key">
                                        <span class="status-icon">⏳</span> Loading...
                                    </span>
                                </div>
                                <div class="ai-status-item">
                                    <span class="ai-status-label">Model</span>
                                    <span class="ai-status-value" id="status-model">-</span>
                                </div>
                            </div>
                            <button class="ai-action-btn-small" id="refresh-status-btn" style="margin-top: 1rem;">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="refresh-icon">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                </svg>
                                <span class="btn-text">Refresh Status</span>
                            </button>
                        </div>
                    </div>

                    <!-- Configuration Section -->
                    <div class="ai-modal-section">
                        <div class="ai-section-header">
                            <h3 class="ai-section-title">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="ai-section-icon">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                Configuration
                            </h3>
                            <button class="ai-section-toggle" aria-label="Toggle">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="ai-section-content">
                            <div class="ai-setting-item">
                                <label for="model-select" class="ai-setting-label">
                                    Model
                                    <span class="ai-setting-desc">AI model to use for search</span>
                                </label>
                                <div class="ai-model-row">
                                    <select id="model-select" class="ai-setting-select">
                                        <option value="gpt-4.1-mini-2025-04-14">gpt-4.1-mini-2025-04-14 (Recommended) ⭐</option>
                                        <option value="gpt-4o-mini">gpt-4o-mini</option>
                                        <option value="gpt-4o">gpt-4o</option>
                                        <option value="gpt-4-turbo">gpt-4-turbo</option>
                                    </select>
                                    <button class="ai-action-btn-small" id="fetch-models-btn">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                        </svg>
                                        <span class="btn-text">Fetch Models</span>
                                    </button>
                                </div>
                            </div>

                            <div class="ai-setting-item">
                                <label for="temperature-slider" class="ai-setting-label">
                                    Temperature: <span id="temperature-value">0</span>
                                    <span class="ai-setting-desc">0 = Precise, 1 = Creative</span>
                                </label>
                                <input type="range" id="temperature-slider" class="ai-setting-slider"
                                       min="0" max="1" step="0.1" value="0">
                            </div>

                            <div class="ai-params-row">
                                <div class="ai-setting-item-inline">
                                    <label for="max-results-input" class="ai-setting-label">
                                        Max Results
                                        <span class="ai-setting-desc">Tools to return (5-50)</span>
                                    </label>
                                    <input type="number" id="max-results-input" class="ai-setting-input"
                                           min="5" max="50" value="20">
                                </div>

                                <div class="ai-setting-item-inline">
                                    <label for="max-tokens-input" class="ai-setting-label">
                                        Max Tokens
                                        <span class="ai-setting-desc">Response tokens (500-4000)</span>
                                    </label>
                                    <input type="number" id="max-tokens-input" class="ai-setting-input"
                                           min="500" max="4000" step="100" value="1000">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Cache Status Section -->
                    <div class="ai-modal-section">
                        <div class="ai-section-header">
                            <h3 class="ai-section-title">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="ai-section-icon">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                </svg>
                                Cache Status
                            </h3>
                            <button class="ai-section-toggle" aria-label="Toggle">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="ai-section-content">
                            <div class="ai-cache-grid">
                                <div class="ai-cache-card">
                                    <div class="ai-cache-icon">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                  d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                        </svg>
                                    </div>
                                    <div class="ai-cache-label">Cache Hit Rate</div>
                                    <div class="ai-cache-value" id="cache-hit-rate">-</div>
                                </div>
                                <div class="ai-cache-card">
                                    <div class="ai-cache-icon">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/>
                                        </svg>
                                    </div>
                                    <div class="ai-cache-label">Cached Tokens</div>
                                    <div class="ai-cache-value" id="cached-tokens">-</div>
                                </div>
                                <div class="ai-cache-card">
                                    <div class="ai-cache-icon">
                                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                        </svg>
                                    </div>
                                    <div class="ai-cache-label">Total Tokens</div>
                                    <div class="ai-cache-value" id="total-tokens">-</div>
                                </div>
                            </div>
                            <div class="ai-info-row" style="margin-top: 1rem;">
                                <span class="ai-info-label">Last Query:</span>
                                <span class="ai-info-value" id="cache-last-query">No queries yet</span>
                            </div>
                            <div class="ai-info-notice">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                <span>Cache expires after 5-10 min of inactivity. 50% cost savings on cached tokens!</span>
                            </div>
                        </div>
                    </div>

                    <!-- System Prompt Section -->
                    <div class="ai-modal-section">
                        <div class="ai-section-header">
                            <h3 class="ai-section-title">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="ai-section-icon">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                System Prompt
                            </h3>
                            <button class="ai-section-toggle" aria-label="Toggle">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="ai-section-content">
                            <div class="ai-info-row">
                                <span class="ai-info-label">Source:</span>
                                <span class="ai-info-value">data/system-prompt.txt</span>
                            </div>
                            <div class="ai-info-row">
                                <span class="ai-info-label">Size:</span>
                                <span class="ai-info-value" id="prompt-size">Loading...</span>
                            </div>
                            <button class="ai-action-btn-small" id="view-prompt-btn" style="margin-top: 0.75rem;">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                <span class="btn-text">View Full Prompt</span>
                            </button>
                        </div>
                    </div>

                    <!-- How It Works Section -->
                    <div class="ai-modal-section collapsed">
                        <div class="ai-section-header">
                            <h3 class="ai-section-title">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="ai-section-icon">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Come Funziona
                            </h3>
                            <button class="ai-section-toggle" aria-label="Toggle">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M19 9l-7 7-7-7" stroke-width="2" stroke-linecap="round"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="ai-section-content">
                            <div class="ai-info-item">
                                <strong>API Key OpenAI</strong>
                                <p>Per utilizzare l'AI Search devi avere una chiave API di OpenAI. Inseriscila nel campo "API Key" sopra. La chiave viene salvata in locale nel file secret.env e non viene mai condivisa online.</p>
                            </div>
                            <div class="ai-info-item">
                                <strong>Modello AI</strong>
                                <p>Seleziona il modello GPT da utilizzare (es. gpt-4o-mini è economico e veloce, gpt-4o è più potente ma costoso). Puoi cliccare "Fetch Models" per vedere tutti i modelli disponibili sul tuo account OpenAI.</p>
                            </div>
                            <div class="ai-info-item">
                                <strong>Max Results e Max Tokens</strong>
                                <p><strong>Max Results:</strong> Numero massimo di tool da mostrare nei risultati (default: 5).<br><strong>Max Tokens:</strong> Lunghezza massima della risposta AI (più alto = risposte più dettagliate ma costi maggiori).</p>
                            </div>
                            <div class="ai-info-item">
                                <strong>System Prompt</strong>
                                <p>Il prompt di sistema definisce come l'AI deve comportarsi e rispondere. Include automaticamente tutto il registry dei tool per permettere ricerche accurate. Puoi visualizzarlo cliccando "View Full Prompt".</p>
                            </div>
                            <div class="ai-info-item">
                                <strong>Come Salvare le Impostazioni</strong>
                                <p>1. Modifica i valori desiderati<br>2. Clicca "Save & Download" per scaricare il file secret.env aggiornato<br>3. Sostituisci il file in app/data/ con quello scaricato<br>4. Ricarica la pagina (F5) per applicare le modifiche</p>
                            </div>
                            <div class="ai-info-item">
                                <strong>Caching Automatico</strong>
                                <p>L'AI usa il caching intelligente: il prompt di sistema e il registry vengono memorizzati per 5-10 minuti. Questo riduce i costi fino al 90% sulle query successive, mantenendo le risposte veloci e accurate.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="ai-action-btn-primary" id="save-settings-btn">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                        </svg>
                        Save & Download
                    </button>
                    <button class="ai-action-btn" id="reset-settings-btn">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Reset to Default
                    </button>
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
        loadAllData();
    }

    function closeModal() {
        if (!modal) return;

        modal.classList.add('closing');
        modal.classList.remove('open');

        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
            isOpen = false;
        }, 240);
    }

    // ========================================================================
    // COLLAPSIBLE SECTIONS
    // ========================================================================

    function setupCollapsibleSections() {
        const sections = modal.querySelectorAll('.ai-modal-section');

        sections.forEach(section => {
            const header = section.querySelector('.ai-section-header');
            const toggle = section.querySelector('.ai-section-toggle');

            if (header && toggle) {
                header.addEventListener('click', () => {
                    section.classList.toggle('collapsed');
                });
            }
        });
    }

    // ========================================================================
    // DATA LOADING
    // ========================================================================

    async function loadAllData(showSuccessToast = false) {
        setLoading(true);
        setRefreshButtonLoading(true);

        try {
            await updateStatus();
            loadSettings();
            updateCacheStatus();
            await loadSystemPromptInfo();

            // Show success message only if explicitly requested (refresh button)
            if (showSuccessToast && window.MessageModal) {
                MessageModal.success('Status Updated', 'API status refreshed successfully!');
            }
        } catch (error) {
            console.error('Error loading data:', error);
            if (window.MessageModal) {
                MessageModal.danger('Error', 'Failed to refresh status.');
            }
        } finally {
            setLoading(false);
            setRefreshButtonLoading(false);
        }
    }

    function setLoading(loading) {
        isLoading = loading;
    }

    function setRefreshButtonLoading(loading) {
        const refreshBtn = document.getElementById('refresh-status-btn');
        if (!refreshBtn) return;

        const icon = refreshBtn.querySelector('.refresh-icon');
        const text = refreshBtn.querySelector('.btn-text');

        if (loading) {
            refreshBtn.disabled = true;
            refreshBtn.classList.add('loading');
            if (icon) icon.classList.add('spinning');
            if (text) text.textContent = 'Refreshing...';
        } else {
            refreshBtn.disabled = false;
            refreshBtn.classList.remove('loading');
            if (icon) icon.classList.remove('spinning');
            if (text) text.textContent = 'Refresh Status';
        }
    }

    function setStatusItemLoading(elementId, loading) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (loading) {
            element.innerHTML = '<span class="ai-status-text status-loading">Loading...</span>';
            element.classList.add('loading');
        } else {
            element.classList.remove('loading');
        }
    }

    // ========================================================================
    // STATUS UPDATE
    // ========================================================================

    async function updateStatus() {
        // Show loading state
        setStatusItemLoading('status-api-key', true);
        setStatusItemLoading('status-model', true);

        const config = window.Config?.getAll();

        const apiKeyEl = document.getElementById('status-api-key');
        if (config?.OPENAI_API_KEY && config.OPENAI_API_KEY !== 'your_api_key_here') {
            const maskedKey = config.OPENAI_API_KEY.substring(0, 7) + '...' +
                config.OPENAI_API_KEY.substring(config.OPENAI_API_KEY.length - 4);
            apiKeyEl.innerHTML = `<span class="ai-status-text status-configured">${maskedKey}</span>`;
        } else {
            apiKeyEl.innerHTML = '<span class="ai-status-text status-error">Not configured</span>';
        }
        apiKeyEl.classList.remove('loading');

        const modelEl = document.getElementById('status-model');
        if (modelEl && config?.OPENAI_MODEL) {
            modelEl.innerHTML = `<span class="ai-status-text status-configured">${config.OPENAI_MODEL}</span>`;
            modelEl.classList.remove('loading');
        }
    }


    function updateCacheStatus() {
        const cacheStatus = window.Config?.getCacheStatus();

        if (!cacheStatus) return;

        const lastQueryEl = document.getElementById('cache-last-query');
        if (lastQueryEl) {
            lastQueryEl.textContent = cacheStatus.lastQuery || 'No queries yet';
        }

        const hitRateEl = document.getElementById('cache-hit-rate');
        if (hitRateEl) {
            if (cacheStatus.cacheHitRate > 0) {
                hitRateEl.innerHTML = `<span class="ai-status-text status-configured">${cacheStatus.cacheHitRate}%</span>`;
            } else {
                hitRateEl.textContent = '-';
            }
        }

        const cachedTokensEl = document.getElementById('cached-tokens');
        if (cachedTokensEl) {
            cachedTokensEl.textContent = cacheStatus.cachedTokens > 0
                ? cacheStatus.cachedTokens.toLocaleString()
                : '-';
        }

        const totalTokensEl = document.getElementById('total-tokens');
        if (totalTokensEl) {
            totalTokensEl.textContent = cacheStatus.totalTokens > 0
                ? cacheStatus.totalTokens.toLocaleString()
                : '-';
        }
    }

    // ========================================================================
    // SETTINGS MANAGEMENT
    // ========================================================================

    function loadSettings() {
        const config = window.Config?.getAll();
        if (!config) return;

        const modelSelect = document.getElementById('model-select');
        const tempSlider = document.getElementById('temperature-slider');
        const tempValue = document.getElementById('temperature-value');
        const maxResults = document.getElementById('max-results-input');
        const maxTokens = document.getElementById('max-tokens-input');

        if (modelSelect) modelSelect.value = config.OPENAI_MODEL;
        if (tempSlider && tempValue) {
            tempSlider.value = config.OPENAI_TEMPERATURE;
            tempValue.textContent = config.OPENAI_TEMPERATURE;
            updateSliderBackground(tempSlider);
        }
        if (maxResults) maxResults.value = config.OPENAI_MAX_RESULTS;
        if (maxTokens) maxTokens.value = config.OPENAI_MAX_TOKENS;
    }

    async function saveSettings() {
        const modelSelect = document.getElementById('model-select');
        const tempSlider = document.getElementById('temperature-slider');
        const maxResults = document.getElementById('max-results-input');
        const maxTokens = document.getElementById('max-tokens-input');

        const newConfig = {
            OPENAI_MODEL: modelSelect?.value,
            OPENAI_TEMPERATURE: parseFloat(tempSlider?.value || 0),
            OPENAI_MAX_RESULTS: parseInt(maxResults?.value || 20),
            OPENAI_MAX_TOKENS: parseInt(maxTokens?.value || 1000)
        };

        await window.Config?.save(newConfig);

        if (window.MessageModal) {
            MessageModal.success('Impostazioni Salvate', 'Il file secret.env è stato scaricato. Sostituiscilo in app/data/ e ricarica la pagina (F5).');
        }
    }

    async function resetSettings() {
        if (window.MessageModal) {
            MessageModal.show({
                type: 'warning',
                title: 'Reset Impostazioni',
                message: 'Sei sicuro di voler ripristinare tutte le impostazioni ai valori predefiniti?',
                confirmText: 'Reset',
                cancelText: 'Annulla',
                onConfirm: async () => {
                    await window.Config?.reset();
                    loadSettings();
                    MessageModal.success('Reset Completato', 'Le impostazioni sono state ripristinate ai valori predefiniti.');
                }
            });
        }
    }

    // ========================================================================
    // MODELS FETCHING
    // ========================================================================

    async function fetchAndUpdateModels() {
        const btn = document.getElementById('fetch-models-btn');
        const modelSelect = document.getElementById('model-select');

        if (!btn || !modelSelect) return;

        const icon = btn.querySelector('svg');
        const text = btn.querySelector('.btn-text');

        btn.disabled = true;
        btn.classList.add('loading');
        if (icon) icon.classList.add('spinning');
        if (text) text.textContent = 'Fetching...';

        try {
            const models = await window.Config?.fetchModels();

            if (models && models.length > 0) {
                modelSelect.innerHTML = '';

                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.id;
                    modelSelect.appendChild(option);
                });

                if (window.MessageModal) {
                    MessageModal.success(
                        'Models Updated',
                        `Found ${models.length} available models.`
                    );
                }
            }

        } catch (error) {
            if (window.MessageModal) {
                MessageModal.danger('Error', 'Failed to fetch models from OpenAI API.');
            }
        } finally {
            btn.disabled = false;
            btn.classList.remove('loading');
            if (icon) icon.classList.remove('spinning');
            if (text) text.textContent = 'Fetch Available Models';
        }
    }

    // ========================================================================
    // SYSTEM PROMPT INFO
    // ========================================================================

    async function loadSystemPromptInfo() {
        try {
            const response = await fetch('data/system-prompt.txt');
            if (response.ok) {
                const text = await response.text();
                const sizeEl = document.getElementById('prompt-size');
                if (sizeEl) {
                    const chars = text.length;
                    const tokens = Math.ceil(chars / 4);
                    sizeEl.textContent = `${chars.toLocaleString()} chars (~${tokens.toLocaleString()} tokens)`;
                }
            }
        } catch (error) {
            console.error('Failed to load system prompt info:', error);
        }
    }

    function viewSystemPrompt() {
        fetch('data/system-prompt.txt')
            .then(res => res.text())
            .then(text => {
                if (window.MessageModal) {
                    MessageModal.show({
                        type: 'info',
                        title: 'System Prompt',
                        message: `<pre style="max-height: 400px; overflow-y: auto; background: var(--bg-secondary); padding: 16px; border-radius: 8px; font-family: monospace; font-size: 0.85em; white-space: pre-wrap; color: var(--text-primary); text-align: left;">${text}</pre>`,
                        showCancel: false,
                        confirmText: 'Close'
                    });
                }
            })
            .catch(() => {
                if (window.MessageModal) {
                    MessageModal.danger('Error', 'Failed to load system prompt.');
                }
            });
    }

    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================

    function attachEventListeners() {
        const closeBtn = modal.querySelector('.modal-close');
        const closeBtnFooter = modal.querySelector('#close-modal-btn');
        const saveBtn = modal.querySelector('#save-settings-btn');
        const resetBtn = modal.querySelector('#reset-settings-btn');
        const refreshBtn = modal.querySelector('#refresh-status-btn');
        const viewPromptBtn = modal.querySelector('#view-prompt-btn');
        const fetchModelsBtn = modal.querySelector('#fetch-models-btn');
        const tempSlider = modal.querySelector('#temperature-slider');
        const tempValue = modal.querySelector('#temperature-value');

        closeBtn?.addEventListener('click', closeModal);
        closeBtnFooter?.addEventListener('click', closeModal);
        saveBtn?.addEventListener('click', saveSettings);
        resetBtn?.addEventListener('click', resetSettings);
        refreshBtn?.addEventListener('click', () => loadAllData(true));
        viewPromptBtn?.addEventListener('click', viewSystemPrompt);
        fetchModelsBtn?.addEventListener('click', fetchAndUpdateModels);

        tempSlider?.addEventListener('input', (e) => {
            if (tempValue) {
                tempValue.textContent = e.target.value;
            }
            updateSliderBackground(tempSlider);
        });

        // Initialize slider background on load
        if (tempSlider) {
            updateSliderBackground(tempSlider);
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        document.addEventListener('keydown', handleEscapeKey);

        window.addEventListener('tm:ai:cache:updated', () => {
            if (isOpen) {
                updateCacheStatus();
            }
        });

        // Setup collapsible sections
        setupCollapsibleSections();
    }

    function handleEscapeKey(e) {
        if (e.key === 'Escape' && isOpen) {
            closeModal();
        }
    }

    // ========================================================================
    // SLIDER BACKGROUND UPDATE
    // ========================================================================

    function updateSliderBackground(slider) {
        if (!slider) return;

        const value = slider.value;
        const min = slider.min || 0;
        const max = slider.max || 1;
        const percentage = ((value - min) / (max - min)) * 100;

        // Gradient from blue (cold/precise) to red (hot/creative)
        const colorStart = 'rgb(59, 130, 246)'; // blue
        const colorEnd = 'rgb(239, 68, 68)'; // red

        slider.style.background = `linear-gradient(to right, ${colorStart} 0%, ${colorEnd} ${percentage}%, var(--border) ${percentage}%, var(--border) 100%)`;
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    window.AIManagerModal = {
        open: openModal,
        close: closeModal
    };
})();