/**
 * @fileoverview Global constants and configuration for Toolmap application
 * @module constants
 * @version 1.0.0
 *
 * Defines:
 * - Phase colors (used by sidebar, cards, breadcrumb)
 * - Common DOM selectors
 * - Animation timing configuration
 * - Quick filter presets
 *
 * @dependencies None (pure configuration)
 * @usedBy registry.js, renderer.js, sidebar.js, app.js
 */

/**
 * Phase color mapping using HSL color space
 * Each phase has a distinct color used throughout the UI
 * @constant {Object.<string, string>}
 * @readonly
 */
const PHASE_COLORS = Object.freeze({
    '00_Common': 'hsl(270 91% 65%)',              // Purple
    '01_Information_Gathering': 'hsl(210 100% 62%)', // Blue
    '02_Exploitation': 'hsl(4 85% 62%)',          // Red
    '03_Post_Exploitation': 'hsl(32 98% 55%)',    // Orange
    '04_Miscellaneous': 'hsl(158 64% 52%)'        // Green
});

/**
 * Common DOM element selectors
 * Centralized to avoid selector string duplication
 * @constant {Object.<string, string>}
 * @readonly
 */
const COMMON_SELECTORS = Object.freeze({
    toolsGrid: '#toolsGrid',
    noResultsMsg: '#noResultsMsg',
    resetButton: '#resetFiltersBtn',
    contextSummary: '#contextSummary'
});

/**
 * Animation timing configuration (in milliseconds)
 * @constant {Object.<string, number>}
 * @readonly
 */
const ANIMATION_CONFIG = Object.freeze({
    cardDelay: 30,      // Delay between successive card animations
    staggerMax: 600     // Maximum cumulative delay for stagger effect
});

/**
 * Predefined filter configurations for quick filtering
 * Keys match tool object properties from registry JSON
 * @constant {Object.<string, Object>}
 * @readonly
 */
const QUICK_FILTERS = Object.freeze({
    starred: Object.freeze({ best_in: true }),
    github: Object.freeze({ installation: 'GitHub' }),
    pip: Object.freeze({ installation: 'pip' })
});

/**
 * Get phase color by phase key
 * @param {string} phaseKey - Phase identifier (e.g., "00_Common")
 * @returns {string} HSL color string or fallback accent color
 */
function getPhaseColor(phaseKey) {
    return PHASE_COLORS[phaseKey] || 'hsl(var(--accent))';
}

/**
 * Validate if a phase key exists
 * @param {string} phaseKey - Phase identifier to validate
 * @returns {boolean} True if phase exists
 */
function isValidPhase(phaseKey) {
    return Object.prototype.hasOwnProperty.call(PHASE_COLORS, phaseKey);
}

// Export to global scope for legacy compatibility
// Using bracket notation to avoid IDE readonly warnings
if (typeof window !== 'undefined') {
    window['PHASE_COLORS'] = PHASE_COLORS;
    window['COMMON_SELECTORS'] = COMMON_SELECTORS;
    window['ANIMATION_CONFIG'] = ANIMATION_CONFIG;
    window['QUICK_FILTERS'] = QUICK_FILTERS;
    window['getPhaseColor'] = getPhaseColor;
    window['isValidPhase'] = isValidPhase;
}