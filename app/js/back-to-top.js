// ============================================================================
// BACK TO TOP - Floating button to scroll grid to top
// ============================================================================

class BackToTop {
    constructor(scrollContainerId) {
        this.scrollContainer = document.getElementById(scrollContainerId);
        this._createButton();
        this._init();
    }

    _createButton() {
        const buttonHTML = `
            <button class="back-to-top" id="backToTopBtn" title="Back to top">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                </svg>
            </button>
        `;
        
        document.body.insertAdjacentHTML('beforeend', buttonHTML);
        this.button = document.getElementById('backToTopBtn');
    }

    _init() {
        if (!this.scrollContainer || !this.button) return;

        // Show/hide button based on scroll position
        this.scrollContainer.addEventListener('scroll', () => {
            if (this.scrollContainer.scrollTop > 300) {
                this.button.classList.add('visible');
            } else {
                this.button.classList.remove('visible');
            }
        });

        // Scroll to top on click
        this.button.addEventListener('click', () => {
            this.scrollContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

window.BackToTop = BackToTop;
