/**
 * AI Search con Chat Completions API + Prompt Caching
 * Ottimizzato per ricerca locale nel registry (NO web search)
 * Utilizza gpt-4.1-mini-2025-04-14 con caching automatico
 */

(function () {
    'use strict';

    const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

    let apiKey = null;
    let systemPrompt = null;
    let isLoading = false;
    let configReady = false;

    // Settings (loaded from Config - fallback values)
    let settings = {
        model: 'gpt-4.1-mini-2025-04-14',
        temperature: 0,
        maxResults: 20,
        maxTokens: 1000
    };

    // ========================================================================
    // INIT
    // ========================================================================

    /**
     * Inizializza modulo - ATTENDE il caricamento della config
     */
    async function initialize() {
        try {
            const config = await window.Config.waitForConfig();

            apiKey = config.OPENAI_API_KEY;
            settings = {
                model: config.OPENAI_MODEL,
                temperature: config.OPENAI_TEMPERATURE,
                maxResults: config.OPENAI_MAX_RESULTS,
                maxTokens: config.OPENAI_MAX_TOKENS
            };

            configReady = true;

            window.dispatchEvent(new CustomEvent('tm:ai:search:ready', {
                detail: {apiKey: apiKey ? '***' : null}
            }));
        } catch (error) {
            if (window.MessageModal) {
                MessageModal.warning(
                    'AI Not Ready',
                    'Failed to initialize AI Search.'
                );
            }
        }

        // Listen for config updates
        window.addEventListener('tm:ai:config:updated', (e) => {
            if (e.detail) {
                apiKey = e.detail.OPENAI_API_KEY;
                settings = {
                    model: e.detail.OPENAI_MODEL,
                    temperature: e.detail.OPENAI_TEMPERATURE,
                    maxResults: e.detail.OPENAI_MAX_RESULTS,
                    maxTokens: e.detail.OPENAI_MAX_TOKENS
                };
                configReady = true;
            }
        });
    }

    // ========================================================================
    // SYSTEM PROMPT LOADING
    // ========================================================================

    /**
     * Carica system prompt da file data/system-prompt.txt
     */
    async function loadSystemPrompt() {
        if (systemPrompt) {
            return systemPrompt;
        }

        try {
            const response = await fetch('data/system-prompt.txt');

            if (!response.ok) {
                throw new Error(`Failed to load system prompt: ${response.status}`);
            }

            systemPrompt = await response.text();
            return systemPrompt;

        } catch (error) {
            throw new Error('Failed to load system prompt');
        }
    }

    // ========================================================================
    // REGISTRY FILTERING
    // ========================================================================

    /**
     * Carica registry e filtra solo campi necessari per AI
     */
    async function loadMinimalRegistry() {
        const tm = window.Toolmap || {};
        const registry = tm.registry;

        if (!registry || !Array.isArray(registry)) {
            throw new Error('Registry not available');
        }

        return registry.map(tool => ({
            id: tool.id,
            name: tool.name || '',
            desc: tool.desc || '',
            category_path: tool.category_path || [],
            best_in: !!tool.best_in,
            notes: tool.notes || null
        }));
    }

    // ========================================================================
    // SEARCH
    // ========================================================================

    /**
     * Esegue ricerca AI con prompt caching automatico
     * Ottimizzato per Chat Completions API
     */
    async function search(query) {
        // Verifica che config sia pronta
        if (!configReady) {
            if (window.MessageModal) {
                MessageModal.warning(
                    'AI Not Ready',
                    'AI Search is still initializing. Please wait a moment and try again.'
                );
            }
            return [];
        }

        // Validazione API Key
        if (!apiKey || apiKey === 'your_api_key_here') {
            if (window.MessageModal) {
                MessageModal.danger(
                    'API Key Missing',
                    `<div style="text-align: left; line-height: 1.6;">
                        <p style="margin-bottom: 12px;"><strong>OpenAI API key is not configured.</strong></p>
                        <p style="margin-bottom: 12px;">To enable AI Search, you need to:</p>
                        <ol style="margin-left: 20px; margin-bottom: 12px;">
                            <li>Get an API key from <a href="https://platform.openai.com/api-keys" target="_blank" style="color: var(--accent);">OpenAI Platform</a></li>
                            <li>Open the AI Manager (⚙️ button in breadcrumb)</li>
                            <li>Enter your API key in the configuration</li>
                            <li>Save and download the <code>secret.env</code> file</li>
                            <li>Replace the file in <code>app/data/</code> folder</li>
                            <li>Reload the page (F5)</li>
                        </ol>
                        <p style="font-size: 0.9em; color: var(--muted); margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);">
                            💡 <strong>Tip:</strong> You can still use fuzzy search by clicking the search mode toggle button.
                        </p>
                    </div>`
                );
            }
            return [];
        }

        const words = query.trim().split(/\s+/).filter(w => w.length > 0);
        if (!query || words.length < 3) {
            if (window.MessageModal) {
                MessageModal.warning(
                    'Query Too Short',
                    'Please enter at least 3 words for the search query.'
                );
            }
            return [];
        }

        if (isLoading) {
            if (window.MessageModal) {
                MessageModal.warning(
                    'Search In Progress',
                    'A search is already in progress. Please wait for it to complete.'
                );
            }
            return [];
        }

        isLoading = true;

        try {
            const prompt = await loadSystemPrompt();
            const registry = await loadMinimalRegistry();

            // Costruisci system prompt con registry embeddata
            const fullSystemPrompt = `${prompt}

            ## CRITICAL INSTRUCTIONS
            - You MUST ONLY search in the provided REGISTRY DATABASE below
            - NEVER suggest or invent tools not present in the registry
            - If no relevant tools are found, return an empty array: {"tool_ids": []}
            - Focus on semantic matching between user query and tool descriptions
            - Prioritize tools marked as "best_in" when applicable
            - Return results sorted by relevance (most relevant first)
            
            ## REGISTRY DATABASE
            ${JSON.stringify(registry, null, 2)}
            
            ## OUTPUT FORMAT
            You MUST respond ONLY with valid JSON in this exact format:
            {
              "tool_ids": ["id1", "id2", "id3"],
              "reasoning": "Brief explanation of why these tools match the query"
            }`;

            const requestBody = {
                model: settings.model,
                messages: [
                    {
                        role: 'system',
                        content: fullSystemPrompt
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ],
                temperature: settings.temperature,
                max_tokens: settings.maxTokens,
                response_format: {type: 'json_object'}
            };

            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `API request failed: ${response.status}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();

            // Update cache status (tracking per performance monitoring)
            if (window.Config && window.Config.updateCacheStatus) {
                window.Config.updateCacheStatus(query, data);
            }

            const message = data.choices[0].message;
            const content = message.content;

            if (!content) {
                throw new Error('Empty response from API');
            }

            const result = JSON.parse(content);

            if (!result.tool_ids || !Array.isArray(result.tool_ids)) {
                throw new Error('Invalid response format: missing tool_ids array');
            }

            // Limita risultati al maxResults configurato
            const limitedResults = result.tool_ids.slice(0, settings.maxResults);

            // Feedback utente se nessun risultato
            if (limitedResults.length === 0) {
                if (window.MessageModal) {
                    MessageModal.info(
                        'No Results Found',
                        `<div style="text-align: left; line-height: 1.6;">
                            <p style="margin-bottom: 12px;">No tools match your search query in the local registry.</p>
                            <p style="margin-bottom: 12px;"><strong>Suggestions:</strong></p>
                            <ul style="margin-left: 20px; margin-bottom: 12px;">
                                <li>Try rephrasing your search with different keywords</li>
                                <li>Use broader terms (e.g., "analytics" instead of "predictive analytics")</li>
                                <li>Switch to fuzzy search mode for text-based matching</li>
                                <li>Browse categories to explore available tools</li>
                            </ul>
                            ${result.reasoning ? `<p style="font-size: 0.9em; color: var(--muted); margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);"><strong>AI Note:</strong> ${result.reasoning}</p>` : ''}
                        </div>`
                    );
                }
            }

            return limitedResults;

        } catch (error) {
            if (window.MessageModal) {
                MessageModal.danger(
                    'Search Failed',
                    error.message || 'An error occurred during AI search. Please try again.'
                );
            }

            return [];

        } finally {
            isLoading = false;
        }
    }

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    function isAvailable() {
        return configReady && !!apiKey && apiKey !== 'your_api_key_here';
    }

    function getIsLoading() {
        return isLoading;
    }

    // ========================================================================
    // EXPORT
    // ========================================================================

    initialize();

    window.AISearch = {
        search,
        isAvailable,
        isLoading: getIsLoading
    };

})();