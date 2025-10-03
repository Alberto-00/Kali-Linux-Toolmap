// ============================================================================
// TOOLS RENDERER - Render tool cards in the grid
// ============================================================================

class ToolsRenderer {
    constructor(gridId, onNotesClick) {
        this.grid = document.getElementById(gridId);
        this.onNotesClick = onNotesClick;
    }

    render(tools) {
        if (!this.grid) return;

        if (!tools || tools.length === 0) {
            this._renderEmpty();
            return;
        }

        const cardsHTML = tools.map(tool => this._createCardHTML(tool)).join('');
        this.grid.innerHTML = cardsHTML;

        // Add event listeners
        this.grid.querySelectorAll('.card').forEach((card, index) => {
            const tool = tools[index];
            
            // Notes button
            const notesBtn = card.querySelector('.notes-btn');
            if (notesBtn && this.onNotesClick) {
                notesBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.onNotesClick(tool);
                });
            }

            // Repo link
            const repoLink = card.querySelector('.repo-link');
            if (repoLink) {
                repoLink.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        });
    }

    _createCardHTML(tool) {
        const phaseColor = this._getPhaseColor(tool.phases?.[0] || '');
        const formatLabel = (text) => String(text).replace(/_/g, ' ').replace(/^\d+_/, '');
        
        return `
            <div class="card" data-tool-id="${tool.id}">
                <div class="img" style="background: linear-gradient(135deg, ${phaseColor}22, ${phaseColor}11);"></div>
                <span>${tool.name || 'Unknown Tool'}</span>
                <p class="info">${tool.desc || 'No description available'}</p>
                <div class="card-footer">
                    <span class="phase-badge" style="background: ${phaseColor}22; color: ${phaseColor};">
                        ${formatLabel(tool.phases?.[0] || 'General')}
                    </span>
                    <div class="card-actions">
                        ${tool.repo ? `
                            <a href="${tool.repo}" target="_blank" rel="noopener noreferrer" 
                               class="repo-link icon-btn" title="View Repository">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                </svg>
                            </a>
                        ` : ''}
                        <button class="notes-btn icon-btn" title="View/Edit Notes">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    _getPhaseColor(phase) {
        if (phase.includes('Common')) return '#8b5cf6';
        if (phase.includes('Information')) return '#3b82f6';
        if (phase.includes('Exploitation')) return '#ef4444';
        if (phase.includes('Post')) return '#f59e0b';
        return '#10b981';
    }

    _renderEmpty() {
        this.grid.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <h3>No tools found</h3>
                <p>Try selecting a different category or adjusting your search</p>
            </div>
        `;
    }
}

window.ToolsRenderer = ToolsRenderer;
