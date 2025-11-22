/**
 * Configuration manager for environment variables
 * Loads .env file for local development
 */

(function () {
    'use strict';

    // Configuration object
    const config = {
        OPENAI_API_KEY: '',
        OPENAI_ASSISTANT_ID: '',
        OPENAI_VECTOR_STORE_ID: '',
        OPENAI_MODEL: 'gpt-4o-mini'
        // OPENAI_MAX_TOKENS: 500
    };

    /**
     * Load environment variables from .env file
     */
    async function loadEnv() {
        try {
            const response = await fetch('../../app/data/secret.env');
            if (!response.ok) {
                console.warn('[config] .env file not found. Please create one from secret.env');
                return;
            }

            const text = await response.text();
            const lines = text.split('\n');

            lines.forEach(line => {
                line = line.trim();

                // Skip empty lines and comments
                if (!line || line.startsWith('#')) {
                    return;
                }

                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=').trim();

                if (key && value && config.hasOwnProperty(key)) {
                    config[key] = value;
                }
            });

            // Validate required fields
            if (!config.OPENAI_API_KEY || config.OPENAI_API_KEY === 'your_api_key_here') {
                console.error('[config] OPENAI_API_KEY not configured in secret.env file');
            }

            if (!config.OPENAI_ASSISTANT_ID) {
                console.warn('[config] OPENAI_ASSISTANT_ID not configured. AI search will not work until you create an Assistant on OpenAI Platform.');
            }

        } catch (error) {
            console.error('[config] Error loading .env file:', error);
        }
    }

    /**
     * Get configuration value
     */
    function get(key) {
        return config[key];
    }

    /**
     * Check if API is configured
     */
    function isConfigured() {
        return config.OPENAI_API_KEY &&
               config.OPENAI_API_KEY !== 'your_api_key_here' &&
               config.OPENAI_ASSISTANT_ID &&
               config.OPENAI_ASSISTANT_ID.length > 0;
    }

    /**
     * Set configuration value (for updating VECTOR_STORE_ID)
     */
    function set(key, value) {
        if (config.hasOwnProperty(key)) {
            config[key] = value;
        }
    }

    // Export to global namespace
    window.Config = {
        load: loadEnv,
        get: get,
        set: set,
        isConfigured: isConfigured
    };

})();
