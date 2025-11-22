/**
 * AI-powered search service using OpenAI Assistants API
 * Uses vector store for efficient RAG-based tool discovery
 *
 * IMPORTANT: Requires Assistant ID from OpenAI Platform
 * Create at: https://platform.openai.com/assistants
 */

(function () {
    'use strict';

    // ========================================================================
    // STATE
    // ========================================================================

    let toolsRegistry = null;
    let isLoading = false;
    let vectorStoreId = null;
    let isVectorStoreReady = false;

    // ========================================================================
    // REGISTRY LOADING & FILTERING
    // ========================================================================

    /**
     * Load and filter tools registry
     * Only includes fields: name, id, repo, desc, best_in, category_path, notes
     */
    async function loadAndFilterRegistry() {
        if (toolsRegistry) {
            return toolsRegistry;
        }

        try {
            const response = await fetch('../../app/data/registry.json');
            if (!response.ok) {
                throw new Error('Failed to load registry.json');
            }

            const fullRegistry = await response.json();

            // Filter to only required fields
            toolsRegistry = fullRegistry.map(tool => ({
                id: tool.id || '',
                name: tool.name || '',
                repo: tool.repo || '',
                desc: tool.desc || '',
                best_in: tool.best_in || false,
                category_path: tool.category_path || [],
                notes: tool.notes || ''
            }));

            console.log(`[ai-search] Loaded ${toolsRegistry.length} tools from registry`);
            return toolsRegistry;

        } catch (error) {
            console.error('[ai-search] Error loading registry:', error);
            throw error;
        }
    }

    // ========================================================================
    // VECTOR STORE MANAGEMENT
    // ========================================================================

    /**
     * Create or retrieve vector store (manual mode - no auto-upload)
     */
    async function ensureVectorStore(autoUpload = false) {
        const apiKey = window.Config.get('OPENAI_API_KEY');
        const assistantId = window.Config.get('OPENAI_ASSISTANT_ID');
        let storedVectorStoreId = window.Config.get('OPENAI_VECTOR_STORE_ID');

        if (!apiKey || !assistantId) {
            throw new Error('OpenAI API key or Assistant ID not configured');
        }

        // Check if we already have a vector store
        if (storedVectorStoreId && storedVectorStoreId.length > 0) {
            vectorStoreId = storedVectorStoreId;
            isVectorStoreReady = true;
            console.log('[ai-search] Using existing vector store:', vectorStoreId);
            return vectorStoreId;
        }

        // Only create if auto-upload is enabled
        if (!autoUpload) {
            throw new Error('Vector store not configured. Please upload the registry first.');
        }

        // Create new vector store
        console.log('[ai-search] Creating new vector store...');

        try {
            const response = await fetch('https://api.openai.com/v1/vector_stores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    name: 'Kali Toolmap Registry'
                    // No expires_after - vector store persists indefinitely
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Vector store creation failed: ${errorData.error?.message || response.statusText}`);
            }

            const vectorStore = await response.json();
            vectorStoreId = vectorStore.id;

            // Save to config (runtime only)
            window.Config.set('OPENAI_VECTOR_STORE_ID', vectorStoreId);

            console.log('[ai-search] Vector store created:', vectorStoreId);
            console.log('[ai-search] ⚠️  Add this to secret.env: OPENAI_VECTOR_STORE_ID=' + vectorStoreId);

            // Upload registry to vector store
            await uploadRegistryToVectorStore();

            // Dispatch event for UI update
            window.dispatchEvent(new CustomEvent('tm:ai:vector-store-created', {
                detail: { vectorStoreId }
            }));

            return vectorStoreId;

        } catch (error) {
            console.error('[ai-search] Vector store creation failed:', error);
            throw error;
        }
    }

    /**
     * Upload filtered registry to vector store
     */
    async function uploadRegistryToVectorStore() {
        const apiKey = window.Config.get('OPENAI_API_KEY');
        const tools = await loadAndFilterRegistry();

        console.log('[ai-search] Uploading registry to vector store...');

        // Create JSON file blob
        const jsonBlob = new Blob([JSON.stringify(tools, null, 2)], { type: 'application/json' });
        const formData = new FormData();
        formData.append('file', jsonBlob, 'kali-tools-registry.json');
        formData.append('purpose', 'assistants');

        try {
            // Step 1: Upload file
            const uploadResponse = await fetch('https://api.openai.com/v1/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                body: formData
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(`File upload failed: ${errorData.error?.message || uploadResponse.statusText}`);
            }

            const uploadedFile = await uploadResponse.json();
            console.log('[ai-search] File uploaded:', uploadedFile.id);

            // Step 2: Add file to vector store
            const addFileResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    file_id: uploadedFile.id
                })
            });

            if (!addFileResponse.ok) {
                const errorData = await addFileResponse.json();
                throw new Error(`Adding file to vector store failed: ${errorData.error?.message || addFileResponse.statusText}`);
            }

            console.log('[ai-search] Registry uploaded successfully to vector store');
            isVectorStoreReady = true;

        } catch (error) {
            console.error('[ai-search] Registry upload failed:', error);
            throw error;
        }
    }

    // ========================================================================
    // ASSISTANTS API - SEARCH
    // ========================================================================

    /**
     * Perform search using Assistants API
     */
    async function performAssistantSearch(query) {
        const apiKey = window.Config.get('OPENAI_API_KEY');
        const assistantId = window.Config.get('OPENAI_ASSISTANT_ID');

        try {
            // Step 1: Create a thread
            const threadResponse = await fetch('https://api.openai.com/v1/threads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    tool_resources: {
                        file_search: {
                            vector_store_ids: [vectorStoreId]
                        }
                    }
                })
            });

            if (!threadResponse.ok) {
                const errorData = await threadResponse.json();
                throw new Error(`Thread creation failed: ${errorData.error?.message || threadResponse.statusText}`);
            }

            const thread = await threadResponse.json();
            const threadId = thread.id;

            // Step 2: Add message to thread
            const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    role: 'user',
                    content: query
                })
            });

            if (!messageResponse.ok) {
                const errorData = await messageResponse.json();
                throw new Error(`Message creation failed: ${errorData.error?.message || messageResponse.statusText}`);
            }

            // Step 3: Run the assistant
            const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                },
                body: JSON.stringify({
                    assistant_id: assistantId
                })
            });

            if (!runResponse.ok) {
                const errorData = await runResponse.json();
                throw new Error(`Run creation failed: ${errorData.error?.message || runResponse.statusText}`);
            }

            const run = await runResponse.json();
            const runId = run.id;

            // Step 4: Poll for completion
            const result = await pollRunCompletion(threadId, runId, apiKey);

            // Step 5: Get messages
            const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            });

            if (!messagesResponse.ok) {
                throw new Error('Failed to retrieve messages');
            }

            const messages = await messagesResponse.json();
            const assistantMessage = messages.data.find(msg => msg.role === 'assistant');

            if (!assistantMessage || !assistantMessage.content || assistantMessage.content.length === 0) {
                throw new Error('No response from assistant');
            }

            const content = assistantMessage.content[0].text.value;

            // Parse JSON response
            return parseAssistantResponse(content);

        } catch (error) {
            console.error('[ai-search] Assistant search failed:', error);
            throw error;
        }
    }

    /**
     * Poll run until completion
     */
    async function pollRunCompletion(threadId, runId, apiKey, maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'assistants=v2'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to poll run status');
            }

            const run = await response.json();

            if (run.status === 'completed') {
                return run;
            }

            if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
                throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
            }
        }

        throw new Error('Run timeout - exceeded maximum polling attempts');
    }

    /**
     * Parse assistant response
     * With structured output (strict: true), the response is guaranteed to be valid
     */
    function parseAssistantResponse(content) {
        try {
            // With structured output, content should already be valid JSON
            // But we still handle potential edge cases
            let jsonStr = content.trim();

            // Remove markdown code blocks if present (shouldn't happen with structured output)
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            } else if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/```\n?/g, '');
            }

            const parsed = JSON.parse(jsonStr);
            const toolIds = parsed.tool_ids || [];

            console.log('[ai-search] Found', toolIds.length, 'tools:', toolIds);
            return toolIds;

        } catch (error) {
            console.error('[ai-search] Failed to parse response:', content);
            console.error('[ai-search] Parse error:', error);
            throw new Error('Failed to parse AI response');
        }
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Perform AI-powered search
     */
    async function search(query) {
        if (isLoading) {
            throw new Error('Search already in progress');
        }

        if (!query || !query.trim()) {
            return [];
        }

        isLoading = true;

        try {
            // Check if vector store exists (no auto-creation)
            if (!isVectorStoreReady) {
                await ensureVectorStore(false); // Will throw if not configured
            }

            // Perform search
            const toolIds = await performAssistantSearch(query);

            return toolIds;

        } catch (error) {
            console.error('[ai-search] Search failed:', error);
            throw error;

        } finally {
            isLoading = false;
        }
    }

    /**
     * Check if AI search is available
     */
    function isAvailable() {
        return window.Config && window.Config.isConfigured();
    }

    /**
     * Check if vector store is ready
     */
    function isReady() {
        const storedVectorStoreId = window.Config.get('OPENAI_VECTOR_STORE_ID');
        return storedVectorStoreId && storedVectorStoreId.length > 0;
    }

    /**
     * Get current vector store ID
     */
    function getVectorStoreId() {
        return window.Config.get('OPENAI_VECTOR_STORE_ID') || null;
    }

    /**
     * Manual registry upload/update
     * Call this when you want to update the vector store with new registry data
     */
    async function uploadRegistry() {
        if (isLoading) {
            throw new Error('Operation already in progress');
        }

        isLoading = true;

        try {
            // Create vector store and upload registry
            const vsId = await ensureVectorStore(true);

            return {
                success: true,
                vectorStoreId: vsId,
                message: 'Registry uploaded successfully. Add this to secret.env: OPENAI_VECTOR_STORE_ID=' + vsId
            };

        } catch (error) {
            console.error('[ai-search] Registry upload failed:', error);
            throw error;

        } finally {
            isLoading = false;
        }
    }

    /**
     * Force re-upload of registry (creates new vector store)
     */
    async function forceUpdateRegistry() {
        // Clear current vector store ID to force re-creation
        window.Config.set('OPENAI_VECTOR_STORE_ID', '');
        vectorStoreId = null;
        isVectorStoreReady = false;

        return await uploadRegistry();
    }

    // ========================================================================
    // EXPORT
    // ========================================================================

    window.AISearch = {
        search: search,
        isAvailable: isAvailable,
        isReady: isReady,
        isLoading: () => isLoading,
        getVectorStoreId: getVectorStoreId,
        uploadRegistry: uploadRegistry,
        forceUpdateRegistry: forceUpdateRegistry
    };

})();