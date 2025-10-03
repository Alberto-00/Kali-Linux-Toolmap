// ============================================================================
// TOOLS MANAGER - Main orchestrator
// ============================================================================

class ToolsManager {
    constructor() {
        this.loader = new ToolsLoader();
        this.currentPath = [];
        this.searchActive = false;
        
        this.breadcrumb = new BreadcrumbManager('breadcrumb', (path) => this.selectPath(path));
        this.renderer = new ToolsRenderer('toolsGrid', (tool) => this.notesModal.show(tool));
        this.notesModal = new NotesModal((toolId, note) => this.saveNote(toolId, note));
        this.search = new SearchManager('searchInput', this.loader, (results) => this.handleSearchResults(results));
        this.backToTop = new BackToTop('toolsGrid');
        
        this._init();
    }

    async _init() {
        await this.loader.load();
        
        // Setup reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }

        // Listen to sidebar selection
        window.addEventListener('sidebarPathSelected', (e) => {
            this.selectPath(e.detail.path);
        });

        // Initial render
        this.reset();
    }

    selectPath(pathArray) {
        this.currentPath = pathArray || [];
        this.searchActive = false;
        this.search.clear();
        
        this.breadcrumb.update(this.currentPath);
        
        const tools = this.loader.getToolsByPath(this.currentPath);
        this.renderer.render(tools);
    }

    handleSearchResults(results) {
        if (results === null) {
            // Search cleared, restore current path
            this.selectPath(this.currentPath);
            return;
        }

        this.searchActive = true;
        this.breadcrumb.update(['Search Results']);
        this.renderer.render(results);
    }

    reset() {
        this.currentPath = [];
        this.searchActive = false;
        this.search.clear();
        this.breadcrumb.clear();
        this.renderer.render([]);
    }

    saveNote(toolId, note) {
        if (this.loader.updateToolNote(toolId, note)) {
            // Export updated registry
            const yaml = this.loader.exportRegistry();
            this._downloadFile('registry.yml', yaml);
            console.log('Note saved for tool:', toolId);
        }
    }

    _downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.toolsManager = new ToolsManager();
});
