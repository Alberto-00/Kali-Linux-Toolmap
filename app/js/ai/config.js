/**
 * Configuration manager for OpenAI API
 * Gestisce secret.env con tutte le configurazioni e API calls
 * OTTIMIZZATO per Chat Completions (no web search)
 */

(function () {
    'use strict';

    // Configuration object (sync con secret.env)
    const config = {
        OPENAI_API_KEY: '',
        OPENAI_MODEL: 'gpt-4.1-mini-2025-04-14',
        OPENAI_TEMPERATURE: 0,
        OPENAI_MAX_RESULTS: 20,
        OPENAI_MAX_TOKENS: 1000
    };

    // Backup configuration (per reset)
    let backupConfig = {};

    // API Usage data (reserved for future use)
    let usageData = {
        currentCost: 0,
        monthlyLimit: 0,
        requestsToday: 0,
        tokensToday: 0,
        lastUpdated: null,
        tier: 'unknown'
    };

    // Cache status (tracked from responses)
    let cacheStatus = {
        lastQuery: null,
        lastQueryTime: null,
        cacheHitRate: 0,
        cachedTokens: 0,
        totalTokens: 0
    };

    // CRITICAL: Promise per tracciare il caricamento
    let configLoadedPromise = null;
    let configLoadedResolve = null;

    // ========================================================================
    // LOAD CONFIGURATIONS
    // ========================================================================

    /**
     * Load environment variables from secret.env
     */
    async function loadEnv() {
        try {
            const response = await fetch('../../app/data/secret.env');
            if (!response.ok) {
                showError(
                    'Configuration File Not Found',
                    '<code>secret.env</code> file not found.<br>Please create one from <code>secret_backup.env</code> template.'
                );
                return false;
            }

            const text = await response.text();
            parseEnvFile(text);

            // Validate required fields
            if (!config.OPENAI_API_KEY || config.OPENAI_API_KEY === 'your_api_key_here') {
                showError(
                    'API Key Not Configured',
                    'OPENAI_API_KEY is not configured in secret.env file.'
                );
                return false;
            }

            // Load backup config (per reset)
            await loadBackupConfig();

            // Dispatch event when config is loaded
            window.dispatchEvent(new CustomEvent('tm:ai:config:loaded', {
                detail: config
            }));

            // Resolve promise per sbloccare altri moduli
            if (configLoadedResolve) {
                configLoadedResolve(config);
            }

            return true;
        } catch (error) {
            showError('Configuration Error', `Error loading secret.env: ${error.message}`);
            return false;
        }
    }

    /**
     * Parse .env file content
     */
    function parseEnvFile(text) {
        const lines = text.split('\n');

        lines.forEach(line => {
            line = line.trim();

            // Skip empty lines and comments
            if (!line || line.startsWith('#')) {
                return;
            }

            const [key, ...valueParts] = line.split('=');
            let value = valueParts.join('=').trim();

            if (!key || !value) return;

            // Parse boolean values
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            // Parse numbers
            else if (!isNaN(value) && value !== '') {
                value = parseFloat(value);
            }

            if (config.hasOwnProperty(key)) {
                config[key] = value;
            }
        });
    }

    /**
     * Load backup configuration
     */
    async function loadBackupConfig() {
        try {
            const response = await fetch('../../app/data/secret_backup.env');
            if (response.ok) {
                const text = await response.text();
                const lines = text.split('\n');

                lines.forEach(line => {
                    line = line.trim();
                    if (!line || line.startsWith('#')) return;

                    const [key, ...valueParts] = line.split('=');
                    let value = valueParts.join('=').trim();

                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    else if (!isNaN(value) && value !== '') {
                        value = parseFloat(value);
                    }

                    if (config.hasOwnProperty(key)) {
                        backupConfig[key] = value;
                    }
                });
            }
        } catch (error) {
            if (window.MessageModal) {
                MessageModal.danger(
                    'Failed to load backup config',
                    error.message
                );
            }
        }
    }

    // ========================================================================
    // SAVE CONFIGURATION
    // ========================================================================

    /**
     * Save configuration to secret.env
     * @param {Object} newConfig - New configuration values
     */
    async function saveConfig(newConfig) {
        // Merge with existing config
        Object.assign(config, newConfig);

        // Generate .env file content
        const envContent = generateEnvContent();

        // Download file
        downloadConfigFile(envContent);

        // Dispatch event
        window.dispatchEvent(new CustomEvent('tm:ai:config:updated', {
            detail: config
        }));

        // AVVISO CRITICO: File deve essere sostituito
        if (window.MessageModal) {
            MessageModal.show({
                type: 'warning',
                title: 'Attenzione',
                message: `
                    <div style="text-align: left; line-height: 1.6;">
                        <p style="margin-bottom: 12px;"><strong>The configuration file has been downloaded.</strong></p>
                        <p style="margin-bottom: 12px; color: var(--color-post);">
                            <strong>⚠️ IMPORTANT:</strong> You must <strong>immediately replace</strong> the existing 
                            <code>secret.env</code> file in <code>app/data/</code> folder with the downloaded file.
                        </p>
                        <p style="margin-bottom: 12px;">Changes will <strong>NOT take effect</strong> until you:</p>
                        <ol style="margin-left: 20px; margin-bottom: 12px;">
                            <li>Replace the file in <code>app/data/secret.env</code></li>
                            <li>Reload the page (F5 or Ctrl+R)</li>
                        </ol>
                        <p style="font-size: 0.9em; color: var(--muted); margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);">
                            💡 <strong>Tip:</strong> The browser cannot directly write files to your disk for security reasons. 
                            This is why manual replacement is required.
                        </p>
                    </div>
                `,
                confirmText: 'I Understand',
                icon: '⚠️'
            });
        }
    }

    /**
     * Generate .env file content
     */
    function generateEnvContent() {
        return `# OpenAI API Configuration
                # Get your API key from: https://platform.openai.com/api-keys
                
                # API Key (required)
                OPENAI_API_KEY=${config.OPENAI_API_KEY}
                
                # Model Configuration
                OPENAI_MODEL=${config.OPENAI_MODEL}
                OPENAI_TEMPERATURE=${config.OPENAI_TEMPERATURE}
                OPENAI_MAX_RESULTS=${config.OPENAI_MAX_RESULTS}
                OPENAI_MAX_TOKENS=${config.OPENAI_MAX_TOKENS}
                `;
    }

    /**
     * Download config file
     */
    function downloadConfigFile(content) {
        const blob = new Blob([content], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'secret.env';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Reset to backup configuration
     */
    async function resetConfig() {
        if (!backupConfig || Object.keys(backupConfig).length === 0) {
            await loadBackupConfig();
        }

        if (!backupConfig || Object.keys(backupConfig).length === 0) {
            showError('Reset Failed', 'Backup configuration not available.');
            return;
        }

        Object.assign(config, backupConfig);

        window.dispatchEvent(new CustomEvent('tm:ai:config:reset', {
            detail: config
        }));

        return saveConfig(config);
    }

    // ========================================================================
    // OPENAI API CALLS
    // ========================================================================

    /**
     * Get models list from OpenAI
     */
    async function fetchAvailableModels() {
        if (!config.OPENAI_API_KEY) {
            return [];
        }

        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${config.OPENAI_API_KEY}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch models');
            }

            const data = await response.json();

            return data.data
                .filter(model => model.id.includes('gpt'))
                .map(model => ({
                    id: model.id,
                    created: model.created,
                    owned_by: model.owned_by
                }))
                .sort((a, b) => b.created - a.created);

        } catch (error) {
            if (window.MessageModal) {
                MessageModal.danger('Failed to fetch models', error.message);
            }
            return [];
        }
    }

    // ========================================================================
    // CACHE STATUS TRACKING
    // ========================================================================

    /**
     * Update cache status from API response
     */
    function updateCacheStatus(query, apiResponse) {
        const usage = apiResponse?.usage || {};

        cacheStatus.lastQuery = query;
        cacheStatus.lastQueryTime = new Date();
        cacheStatus.cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;
        cacheStatus.totalTokens = usage.prompt_tokens || 0;

        if (cacheStatus.totalTokens > 0) {
            cacheStatus.cacheHitRate = Math.round(
                (cacheStatus.cachedTokens / cacheStatus.totalTokens) * 100
            );
        }

        window.dispatchEvent(new CustomEvent('tm:ai:cache:updated', {
            detail: cacheStatus
        }));
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    function get(key) {
        return config[key];
    }

    function getAll() {
        return {...config};
    }

    function set(key, value) {
        if (config.hasOwnProperty(key)) {
            config[key] = value;

            window.dispatchEvent(new CustomEvent('tm:ai:config:changed', {
                detail: {key, value}
            }));
        }
    }

    function getCacheStatus() {
        return {...cacheStatus};
    }

    /**
     * CRITICAL: Wait for config to be loaded
     * @returns {Promise<Object>} Configuration object
     */
    function waitForConfig() {
        if (configLoadedPromise) {
            return configLoadedPromise;
        }

        configLoadedPromise = new Promise((resolve) => {
            configLoadedResolve = resolve;

            // If already loaded, resolve immediately
            if (config.OPENAI_API_KEY && config.OPENAI_API_KEY !== 'your_api_key_here') {
                resolve(config);
            }
        });

        return configLoadedPromise;
    }

    function showError(title, message) {
        if (window.MessageModal) {
            MessageModal.danger(title, message);
        }
    }

    // Export to global namespace
    window.Config = {
        // Core
        load: loadEnv,
        get: get,
        getAll: getAll,
        set: set,
        waitForConfig: waitForConfig,

        // Save/Reset
        save: saveConfig,
        reset: resetConfig,

        // API Data
        fetchModels: fetchAvailableModels,

        // Cache
        updateCacheStatus: updateCacheStatus,
        getCacheStatus: getCacheStatus
    };

})();