// ============================================================================
// TOOLS LOADER - Load and parse registry.yml
// ============================================================================

class ToolsLoader {
    constructor() {
        this.tools = [];
        this.toolsByPath = new Map();
    }

    async load() {
        try {
            const response = await fetch('registry.yml');
            const yamlText = await response.text();
            const parsed = jsyaml.load(yamlText);
            
            this.tools = Array.isArray(parsed) ? parsed : [];
            this._indexToolsByPath();
            
            console.log(`Loaded ${this.tools.length} tools`);
            return this.tools;
        } catch (error) {
            console.error('Error loading registry:', error);
            return [];
        }
    }

    _indexToolsByPath() {
        this.toolsByPath.clear();
        
        for (const tool of this.tools) {
            if (tool.category_path && Array.isArray(tool.category_path)) {
                const path = tool.category_path.join('/');
                
                if (!this.toolsByPath.has(path)) {
                    this.toolsByPath.set(path, []);
                }
                this.toolsByPath.get(path).push(tool);
            }
        }
    }

    getToolsByPath(pathArray) {
        if (!pathArray || pathArray.length === 0) {
            return this.tools;
        }
        
        const path = pathArray.join('/');
        return this.toolsByPath.get(path) || [];
    }

    searchTools(query) {
        if (!query || query.trim() === '') {
            return this.tools;
        }
        
        const lowerQuery = query.toLowerCase();
        
        return this.tools.filter(tool => {
            return (
                tool.name?.toLowerCase().includes(lowerQuery) ||
                tool.desc?.toLowerCase().includes(lowerQuery) ||
                tool.kind?.toLowerCase().includes(lowerQuery) ||
                tool.caps?.some(cap => cap.toLowerCase().includes(lowerQuery)) ||
                tool.phases?.some(phase => phase.toLowerCase().includes(lowerQuery))
            );
        });
    }

    updateToolNote(toolId, newNote) {
        const tool = this.tools.find(t => t.id === toolId);
        if (tool) {
            tool.notes = newNote;
            return true;
        }
        return false;
    }

    exportRegistry() {
        return jsyaml.dump(this.tools);
    }
}

window.ToolsLoader = ToolsLoader;
