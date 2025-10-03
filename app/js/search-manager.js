// ============================================================================
// SEARCH MANAGER - Handle sidebar search functionality
// ============================================================================

class SearchManager {
    constructor(inputId, toolsLoader, onSearchResults) {
        this.input = document.getElementById(inputId);
        this.toolsLoader = toolsLoader;
        this.onSearchResults = onSearchResults;
        this.debounceTimer = null;
        
        this._init();
    }

    _init() {
        if (!this.input) return;

        this.input.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this._search(e.target.value);
            }, 300);
        });
    }

    _search(query) {
        if (!query || query.trim() === '') {
            if (this.onSearchResults) {
                this.onSearchResults(null);
            }
            return;
        }

        const results = this.toolsLoader.searchTools(query);
        
        if (this.onSearchResults) {
            this.onSearchResults(results);
        }
    }

    clear() {
        if (this.input) {
            this.input.value = '';
        }
    }
}

window.SearchManager = SearchManager;
