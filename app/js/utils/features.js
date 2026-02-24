/**
 * Gestione starred tools, installed tools e export registry JSON
 * - Stars: salva preferiti in localStorage
 * - Installed: salva stato installazione in localStorage
 * - JSONExporter: esporta registry aggiornato con note, stars e installed
 */

(function() {
    'use strict';

    const STORAGE_KEYS = window.TOOLMAP_CONSTANTS?.STORAGE_KEYS || {};
    const ToolUtils = window.ToolUtils;

    // ========================================================================
    // STARRED MANAGER
    // ========================================================================

    /**
     * Gestisce i tool "starred" (preferiti) in localStorage
     */
    const Stars = {
        /**
         * Carica mappa stars da localStorage
         * @returns {Object} Map {toolId: boolean}
         */
        load() {
            try {
                const json = localStorage.getItem(STORAGE_KEYS.stars);
                return JSON.parse(json || 'null') || {};
            } catch (error) {
                console.warn('[features] Errore caricamento stars:', error);
                return {};
            }
        },

        /**
         * Salva mappa stars in localStorage
         * @param {Object} map - Map {toolId: boolean}
         */
        save(map) {
            if (!map || typeof map !== 'object') {
                console.warn('[features] Map stars non valida');
                return;
            }

            try {
                localStorage.setItem(STORAGE_KEYS.stars, JSON.stringify(map));
            } catch (error) {
                console.error('[features] Errore salvataggio stars:', error);
            }
        },

        /**
         * Toggle star per un tool
         * @param {string} toolId - ID del tool
         * @param {boolean} value - Stato desiderato (true=starred)
         * @returns {Object} Mappa aggiornata
         */
        toggle(toolId, value) {
            if (!toolId) {
                console.warn('[features] toolId mancante per toggle star');
                return {};
            }

            const map = this.load();
            map[toolId] = !!value;
            this.save(map);

            return map;
        }
    };

    // ========================================================================
    // INSTALLED MANAGER
    // ========================================================================

    /**
     * Gestisce lo stato "installed" dei tool in localStorage
     */
    const Installed = {
        /**
         * Carica mappa installed da localStorage
         * @returns {Object} Map {toolId: boolean}
         */
        load() {
            try {
                const json = localStorage.getItem(STORAGE_KEYS.installed);
                return JSON.parse(json || 'null') || {};
            } catch (error) {
                console.warn('[features] Errore caricamento installed:', error);
                return {};
            }
        },

        /**
         * Salva mappa installed in localStorage
         * @param {Object} map - Map {toolId: boolean}
         */
        save(map) {
            if (!map || typeof map !== 'object') {
                console.warn('[features] Map installed non valida');
                return;
            }

            try {
                localStorage.setItem(STORAGE_KEYS.installed, JSON.stringify(map));
            } catch (error) {
                console.error('[features] Errore salvataggio installed:', error);
            }
        },

        /**
         * Toggle installed per un tool
         * @param {string} toolId - ID del tool
         * @param {boolean} value - Stato desiderato (true=installed)
         * @returns {Object} Mappa aggiornata
         */
        toggle(toolId, value) {
            if (!toolId) {
                console.warn('[features] toolId mancante per toggle installed');
                return {};
            }

            const map = this.load();
            map[toolId] = !!value;
            this.save(map);

            return map;
        }
    };

    // ========================================================================
    // JSON EXPORTER
    // ========================================================================

    /**
     * Esporta registry aggiornato con modifiche utente (note, stars, installed)
     */
    const JSONExporter = {
        /**
         * Serializza registry in JSON
         * Include note aggiornate, stars e installed locali
         * @returns {string} JSON string del registry aggiornato
         */
        serialize() {
            const tm = window.Toolmap || {};
            const stars = Stars.load();
            const installedMap = Installed.load();
            const registry = tm.registry ? structuredClone(tm.registry) : null;

            if (!registry) {
                console.warn('[features] Registry non disponibile per export');
                return '';
            }

            // Aggiorna note, stars e installed nei record
            this._updateRegistryRecords(registry, stars, installedMap, tm);

            return JSON.stringify(registry, null, 2);
        },

        /**
         * Aggiorna record registry con dati in memoria
         * @private
         */
        _updateRegistryRecords(registry, stars, installedMap, tm) {
            for (const item of registry) {
                const id = item?.id;
                if (!id) continue;

                // Aggiorna NOTE (da toolsById in memoria)
                const tool = tm.toolsById?.[id];
                if (tool) {
                    item.notes = tool.notes || '';
                }

                // Aggiorna BEST_IN (da stars localStorage)
                const localStar = Object.prototype.hasOwnProperty.call(stars, id)
                    ? !!stars[id]
                    : undefined;

                const registryStar = ToolUtils.readBestInFlag(item);
                const starred = localStar !== undefined ? localStar : registryStar;

                // Rimuovi varianti legacy
                delete item['bestIn'];
                delete item['best-in'];
                delete item['best'];

                // Imposta solo best_in (snake_case standard)
                item['best_in'] = !!starred;

                // Aggiorna INSTALLED (da installed localStorage)
                const localInstalled = Object.prototype.hasOwnProperty.call(installedMap, id)
                    ? !!installedMap[id]
                    : undefined;

                const registryInstalled = ToolUtils.readInstalledFlag(item);
                item['installed'] = localInstalled !== undefined ? localInstalled : registryInstalled;
            }
        },

        /**
         * Scarica registry come file JSON
         * Salva anche in sessionStorage per backup
         */
        download() {
            const json = this.serialize();

            if (!json) {
                console.warn('[features] Nessun dato da scaricare');
                return;
            }

            // Salva in session per backup
            this._saveToSession(json);

            // Scarica file
            this._downloadFile('registry.json', json);
        },

        /**
         * Salva JSON in sessionStorage
         * @private
         */
        _saveToSession(json) {
            try {
                sessionStorage.setItem(STORAGE_KEYS.registryJSON, json);
            } catch (error) {
                console.warn('[features] Errore salvataggio session:', error);
            }
        },

        /**
         * Crea e scarica file JSON
         * @private
         */
        _downloadFile(filename, content) {
            const blob = new Blob([content], {
                type: 'application/json;charset=utf-8'
            });

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');

            anchor.href = url;
            anchor.download = filename;

            // Trigger download
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            // Cleanup
            URL.revokeObjectURL(url);
        }
    };

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Gestisce evento toggle star
     */
    function handleToggleStar(event) {
        const { id, value } = event.detail || {};

        if (!id) {
            console.warn('[features] ID mancante in evento toggleStar');
            return;
        }

        // Salva in localStorage
        Stars.toggle(id, !!value);

        const tm = window.Toolmap || {};

        // Aggiorna toolsById in memoria
        if (tm.toolsById?.[id]) {
            tm.toolsById[id]._starred = !!value;
        }

        // Aggiorna registry in memoria
        const record = tm.registry?.find(x => x?.id === id);
        if (record) {
            record.best_in = !!value;
        }

        // Salva snapshot in sessionStorage
        const json = JSONExporter.serialize();
        if (json) {
            sessionStorage.setItem(STORAGE_KEYS.registryJSON, json);
        }

        // Notifica aggiornamento (trigger re-render)
        window.dispatchEvent(new CustomEvent('tm:stars:updated', {
            detail: { id, value }
        }));
    }

    /**
     * Gestisce evento toggle installed
     */
    function handleToggleInstalled(event) {
        const { id, value } = event.detail || {};

        if (!id) {
            console.warn('[features] ID mancante in evento toggleInstalled');
            return;
        }

        // Salva in localStorage
        Installed.toggle(id, !!value);

        const tm = window.Toolmap || {};

        // Aggiorna toolsById in memoria
        if (tm.toolsById?.[id]) {
            tm.toolsById[id]._installed = !!value;
        }

        // Aggiorna registry in memoria
        const record = tm.registry?.find(x => x?.id === id);
        if (record) {
            record.installed = !!value;
        }

        // Salva snapshot in sessionStorage
        const json = JSONExporter.serialize();
        if (json) {
            sessionStorage.setItem(STORAGE_KEYS.registryJSON, json);
        }

        // Notifica aggiornamento (trigger re-render)
        window.dispatchEvent(new CustomEvent('tm:installed:updated', {
            detail: { id, value }
        }));
    }

    /**
     * Gestisce evento download registry
     */
    function handleDownload() {
        JSONExporter.download();
    }

    // ========================================================================
    // INIT
    // ========================================================================

    function initialize() {
        // Registra event listeners
        window.addEventListener('tm:tool:toggleStar', handleToggleStar);
        window.addEventListener('tm:tool:toggleInstalled', handleToggleInstalled);
        window.addEventListener('tm:registry:download', handleDownload);
    }

    // Avvia inizializzazione
    initialize();

    // ========================================================================
    // EXPORT
    // ========================================================================

    window.StarsManager = Stars;
    window.InstalledManager = Installed;
    window.JSONExporter = JSONExporter;

})();