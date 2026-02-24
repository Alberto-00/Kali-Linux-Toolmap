/**
 * Utilities per manipolazione tool, rendering markdown, helper DOM
 */

(function() {
    'use strict';

    const PHASE_COLORS = window.TOOLMAP_CONSTANTS?.PHASE_COLORS || {};

    // ========================================================================
    // TOOL UTILITIES
    // ========================================================================

    window.ToolUtils = {

        /**
         * Normalizza ID rimuovendo caratteri speciali
         */
        normalizeId(str) {
            return String(str || '')
                .trim()
                .toLowerCase()
                .replace(/[^\w\- ]+/g, '')
                .replace(/\s+/g, '-')
                .replace(/\-+/g, '-');
        },

        /**
         * Ottiene il nome del tool
         */
        getName(tool) {
            return (tool?.title || tool?.name || tool?.id || '').toString();
        },

        /**
         * Estrae category_path gestendo varianti snake_case/camelCase
         */
        getCategoryPath(tool) {
            if (!tool) return [];
            return Array.isArray(tool.category_path) ? tool.category_path
                : Array.isArray(tool.categoryPath) ? tool.categoryPath
                    : [];
        },

        /**
         * Ottiene la fase primaria (primo elemento di category_path)
         */
        getPrimaryPhase(tool) {
            const path = this.getCategoryPath(tool);
            return path.length > 0 ? path[0] : '';
        },

        /**
         * Estrae chiave di gruppo fase per ordinamento
         * Ritorna { num, str } per sort stabile
         */
        getPhaseGroupKey(tool) {
            const phase = this.getPrimaryPhase(tool) || '';
            const match = /^(\d{2,})\D/.exec(phase);
            return match
                ? { num: parseInt(match[1], 10), str: '' }
                : { num: 9998, str: phase.toLowerCase() };
        },

        /**
         * Ottiene colore fase da PHASE_COLORS
         */
        getPhaseColor(phase) {
            return PHASE_COLORS[phase] || 'hsl(var(--accent))';
        },

        /**
         * Legge flag best_in gestendo varianti di naming
         */
        readBestInFlag(tool) {
            if (!tool || typeof tool !== 'object') return false;
            return !!(tool['best_in'] ?? tool['bestIn'] ?? tool['best-in'] ?? tool['best']);
        },

        /**
         * Legge flag installed dal tool
         */
        readInstalledFlag(tool) {
            if (!tool || typeof tool !== 'object') return false;
            return !!tool['installed'];
        },

        /**
         * Compara due tool per nome (case-insensitive)
         */
        compareByName(a, b) {
            return this.getName(a).localeCompare(
                this.getName(b),
                undefined,
                { sensitivity: 'base' }
            );
        },

        /**
         * Crea path key da array di segmenti
         * Es: ['Root', '00_Common', 'Scripts'] → 'Root>00_Common>Scripts'
         */
        createPathKey(segments) {
            return segments.join('>');
        }
    };

    // ========================================================================
    // MARKDOWN UTILITIES
    // ========================================================================

    window.MarkdownUtils = {

        /**
         * Renderizza markdown con supporto base
         * (code blocks, headers, bold, italic, links, lists)
         */
        render(text) {
            let html = this._escape(text);
            html = this._codeBlocks(html);
            html = this._headers(html);
            html = this._inline(html);
            html = this._links(html);
            html = this._lists(html);
            html = this._paragraphs(html);
            return html;
        },

        // Escape HTML per sicurezza
        _escape(str) {
            return String(str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        },

        // Code blocks con syntax highlight placeholder
        _codeBlocks(html) {
            return html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang = '', code = '') => {
                return `<pre style="background:hsl(var(--muted));border:1px solid hsl(var(--border));border-radius:8px;padding:14px;overflow-x:auto;margin:10px 0;"><code class="language-${lang.trim()}" style="font-family:'JetBrains Mono',Consolas,monospace;font-size:0.92em;color:hsl(var(--foreground));">${code}</code></pre>`;
            });
        },

        // Headers (#, ##, ###)
        _headers(html) {
            return html
                .replace(/^### (.*)$/gim, '<h3>$1</h3>')
                .replace(/^## (.*)$/gim, '<h2>$1</h2>')
                .replace(/^# (.*)$/gim, '<h1>$1</h1>');
        },

        // Bold, italic, inline code
        _inline(html) {
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
            html = html.replace(/`([^`]+?)`/g, '<code>$1</code>');
            return html;
        },

        // Links [text](url)
        _links(html) {
            return html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
                '<a href="$2" target="_blank" rel="noopener">$1</a>'
            );
        },

        // Liste non ordinate (- item)
        _lists(html) {
            const lines = html.split('\n');
            let inList = false;
            const output = [];

            for (const line of lines) {
                if (/^\s*-\s+/.test(line)) {
                    if (!inList) {
                        output.push('<ul>');
                        inList = true;
                    }
                    output.push('<li>' + line.replace(/^\s*-\s+/, '') + '</li>');
                } else {
                    if (inList) {
                        output.push('</ul>');
                        inList = false;
                    }
                    output.push(line);
                }
            }

            if (inList) output.push('</ul>');
            return output.join('\n');
        },

        // Paragrafi (doppio newline)
        _paragraphs(html) {
            html = html.replace(/\n{2,}/g, '</p><p>');
            if (!/^<([a-z]+)/.test(html)) {
                html = '<p>' + html + '</p>';
            }
            return html;
        }
    };

    // ========================================================================
    // DOM UTILITIES
    // ========================================================================

    window.DOMUtils = {

        /**
         * Escape HTML (previene XSS)
         */
        escapeHtml(str) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return String(str || '').replace(/[&<>"']/g, m => map[m]);
        },

        /**
         * Escape per attributi HTML
         */
        escapeAttr(str) {
            return this.escapeHtml(str).replace(/"/g, '&quot;');
        },

        /**
         * Formatta label rimuovendo prefissi numerici e underscore
         * Es: "01_Information_Gathering" → "Information Gathering"
         */
        formatLabel(str) {
            return String(str || '')
                .replace(/^\d+[_-]*/, '')
                .replace(/_/g, ' ')
                .trim();
        },

        /**
         * Esegue callback quando DOM è pronto
         */
        ready(callback) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback, { once: true });
            } else {
                (window.queueMicrotask || setTimeout)(callback, 0);
            }
        }
    };

})();