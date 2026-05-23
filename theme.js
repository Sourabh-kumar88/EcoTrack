// theme.js — Shared theme utility
// Import this module in every page's JS to persist theme across navigation.

/**
 * Apply a theme by setting data-theme on <html>.
 * @param {'light'|'dark'|'auto'} theme
 */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || 'light');
    localStorage.setItem('ecotrack_theme', theme || 'light');
}

/**
 * Read stored theme and apply it immediately (call as early as possible).
 */
export function applyStoredTheme() {
    const stored = localStorage.getItem('ecotrack_theme') || 'light';
    document.documentElement.setAttribute('data-theme', stored);
}

/**
 * Read the user's carbon goal from saved settings.
 * @returns {number}
 */
export function getCarbonGoal() {
    try {
        const s = JSON.parse(localStorage.getItem('ecotrack_settings') || '{}');
        return s?.preferences?.carbonGoal ?? 50;
    } catch {
        return 50;
    }
}

/**
 * Read unit preference (metric / imperial).
 * @returns {'metric'|'imperial'}
 */
export function getUnitPreference() {
    try {
        const s = JSON.parse(localStorage.getItem('ecotrack_settings') || '{}');
        return s?.preferences?.unitPreference ?? 'metric';
    } catch {
        return 'metric';
    }
}

// Apply immediately on module load
applyStoredTheme();
