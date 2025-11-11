// ============================================================================
// features.js
// ============================================================================
// Descrizione: Gestisce starred tools (best_in) e export registry JSON
// Dipendenze: constants.js, utils.js

(() => {
    'use strict';

    const STORAGE_KEYS = window.TOOLMAP_CONSTANTS?.STORAGE_KEYS || {};
    const ToolUtils = window.ToolUtils;

    // ============================================================================
    // STARRED MANAGER
    // ============================================================================

    const Stars = {
        load() {
            try {
                const json = localStorage.getItem(STORAGE_KEYS.stars);
                return JSON.parse(json || 'null') || {};
            } catch {
                return {};
            }
        },

        save(map) {
            try {
                localStorage.setItem(STORAGE_KEYS.stars, JSON.stringify(map || {}));
            } catch {}
        },

        toggle(toolId, value) {
            const map = this.load();
            map[toolId] = !!value;
            this.save(map);
            return map;
        }
    };

    // ============================================================================
    // JSON EXPORTER
    // ============================================================================

    const JSONExporter = {
        serialize() {
            const tm = window.Toolmap || {};
            const stars = Stars.load();
            const registry = tm.registry ? structuredClone(tm.registry) : null;

            if (!registry) return '';

            this._updateRegistryRecords(registry, stars, tm);
            return JSON.stringify(registry, null, 2);
        },

        _updateRegistryRecords(registry, stars, tm) {
            for (const item of registry) {
                const id = item?.id;
                if (!id) continue;

                // ============================================================
                // UPDATE NOTES - Usa i dati da toolsById (in memoria)
                // ============================================================
                const tool = tm.toolsById?.[id];
                if (tool) {
                    item.notes = tool.notes || '';
                }

                // ============================================================
                // UPDATE BEST_IN (Stars)
                // ============================================================
                const localStar = Object.prototype.hasOwnProperty.call(stars, id)
                    ? !!stars[id]
                    : undefined;
                const registryStar = ToolUtils.readBestInFlag(item);
                const starred = localStar !== undefined ? localStar : registryStar;

                // Rimuovi tutte le varianti
                delete item['bestIn'];
                delete item['best-in'];
                delete item['best'];

                // Imposta solo best_in
                item['best_in'] = !!starred;
            }
        },

        download() {
            const json = this.serialize();
            if (!json) {
                console.warn('[features] Cannot download: no JSON data');
                return;
            }

            this._saveToSession(json);
            this._downloadFile('registry.json', json);
        },

        _saveToSession(json) {
            try {
                sessionStorage.setItem(STORAGE_KEYS.registryJSON, json);
            } catch {}
        },

        _downloadFile(filename, content) {
            const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        }
    };

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================

    function handleToggleStar(event) {
        const { id, value } = event.detail || {};
        if (!id) return;

        Stars.toggle(id, !!value);
        const tm = window.Toolmap || {};

        // Update toolsById
        if (tm.toolsById?.[id]) {
            tm.toolsById[id]._starred = !!value;
        }

        // Update registry
        const record = tm.registry?.find(x => x?.id === id);
        if (record) {
            record.best_in = !!value;
        }

        // Save to session
        const json = JSONExporter.serialize();
        if (json) {
            sessionStorage.setItem(STORAGE_KEYS.registryJSON, json);
        }

        // Trigger re-render
        window.dispatchEvent(new CustomEvent('tm:stars:updated', { detail: { id, value } }));
    }

    function handleDownload() {
        JSONExporter.download();
    }

    // ============================================================================
    // INIT
    // ============================================================================

    function initialize() {
        window.addEventListener('tm:tool:toggleStar', handleToggleStar);
        window.addEventListener('tm:registry:download', handleDownload);
    }

    initialize();

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.StarsManager = Stars;
    window.JSONExporter = JSONExporter;
})();