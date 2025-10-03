// ============================================================================
// BREADCRUMB MANAGER - Manage breadcrumb navigation
// ============================================================================

class BreadcrumbManager {
    constructor(containerId, onSegmentClick) {
        this.container = document.getElementById(containerId);
        this.onSegmentClick = onSegmentClick;
        this.currentPath = [];
    }

    update(pathArray) {
        this.currentPath = pathArray || [];
        this._render();
    }

    clear() {
        this.currentPath = [];
        this._render();
    }

    _render() {
        if (!this.container) return;

        if (this.currentPath.length === 0) {
            this.container.innerHTML = '<span class="breadcrumb-item">Select a category</span>';
            return;
        }

        const formatLabel = (text) => String(text).replace(/_/g, ' ').replace(/^\d+_/, '');
        
        const segments = this.currentPath.map((segment, index) => {
            const path = this.currentPath.slice(0, index + 1);
            const isLast = index === this.currentPath.length - 1;
            
            return `
                <span class="breadcrumb-item ${isLast ? 'active' : ''}" 
                      data-path="${path.join('/')}"
                      style="cursor: pointer;">
                    ${formatLabel(segment)}
                </span>
            `;
        });

        this.container.innerHTML = segments.join('<span class="breadcrumb-separator">/</span>');

        // Add click handlers
        this.container.querySelectorAll('.breadcrumb-item[data-path]').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.dataset.path.split('/');
                if (this.onSegmentClick) {
                    this.onSegmentClick(path);
                }
            });
        });
    }
}

window.BreadcrumbManager = BreadcrumbManager;
