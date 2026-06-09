// settings.js

import { db } from './dataclient.js';

// ===== AUTHENTICATION CHECK =====
let authChecked = false;

async function checkAuthentication() {
    try {
        const { data: { session }, error } = await db.auth.getSession();
        
        if (error || !session) {
            window.location.href = '/signin.html';
            return false;
        }
        
        authChecked = true;
        return true;
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/signin.html';
        return false;
    }
}

// Set up auth state listener FIRST (before any DOM access)
db.auth.onAuthStateChange((event, session) => {
    if (!session && authChecked) {
        window.location.href = '/signin.html';
    }
});

// Initialize when DOM is ready with proper auth check
async function initializeSettings() {
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return;
    }
    
    // Wait for DOM to be fully ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupSettings);
    } else {
        setupSettings();
    }
}

function setupSettings() {
    // Initialize currentSettings before loading
    currentSettings = getDefaultSettings();
    loadSettings();
    setupEventListeners();
}

// Settings state
let currentSettings;
const SETTINGS_ID = 'default-user';

/**
 * Get default settings
 */
function getDefaultSettings() {
    return {
        preferences: {
            carbonGoal: 50,
            unitPreference: 'metric',
            theme: 'light'
        },
        notifications: {
            dailyReminder: true,
            goalAlerts: true,
            weeklySummary: true
        },
        privacy: {
            publicProfile: false,
            dataRetention: 90
        }
    };
}

/**
 * Load settings from storage (with localStorage fallback)
 */
async function loadSettings() {
    try {
        // Try loading from storage first
        const { data, error } = await db
            .from('user_settings')
            .select('*')
            .eq('id', SETTINGS_ID)
            .maybeSingle();

        if (error) {
            console.warn("Settings fetch error (using local storage fallback):", error);
            loadSettingsFromLocal();
        } else if (data) {
            // Convert database format to app format
            currentSettings = {
                preferences: {
                    carbonGoal: data.carbon_goal || 50,
                    unitPreference: data.unit_preference || 'metric',
                    theme: data.theme || 'light'
                },
                notifications: {
                    dailyReminder: data.daily_reminder !== false,
                    goalAlerts: data.goal_alerts !== false,
                    weeklySummary: data.weekly_summary !== false
                },
                privacy: {
                    publicProfile: data.public_profile || false,
                    dataRetention: data.data_retention || 90
                }
            };
            localStorage.setItem('ecotrack_settings', JSON.stringify(currentSettings));
        } else {
            // No settings in database, try localStorage
            loadSettingsFromLocal();
            // Save defaults to storage
            await saveSettingsToStorage(currentSettings);
        }
    } catch (err) {
        console.error("Settings load system error:", err);
        loadSettingsFromLocal();
    }

    renderSettingsToDOM();
}

/**
 * Load settings from localStorage
 */
function loadSettingsFromLocal() {
    const local = localStorage.getItem('ecotrack_settings');
    if (local) {
        try {
            currentSettings = JSON.parse(local);
        } catch (e) {
            currentSettings = getDefaultSettings();
        }
    } else {
        currentSettings = getDefaultSettings();
    }
}

/**
 * Render settings to DOM
 */
function renderSettingsToDOM() {
    // Load Preferences
    const carbonGoal = document.getElementById('carbon-goal');
    if (carbonGoal) carbonGoal.value = currentSettings.preferences.carbonGoal;

    const unitPref = document.getElementById('unit-preference');
    if (unitPref) unitPref.value = currentSettings.preferences.unitPreference;

    const themeBtns = document.querySelectorAll('.toggle-btn');
    themeBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === currentSettings.preferences.theme) {
            btn.classList.add('active');
        }
    });

    // Load Notifications
    const dailyReminder = document.getElementById('daily-reminder');
    if (dailyReminder) dailyReminder.checked = currentSettings.notifications.dailyReminder;

    const goalAlerts = document.getElementById('goal-alerts');
    if (goalAlerts) goalAlerts.checked = currentSettings.notifications.goalAlerts;

    const weeklySummary = document.getElementById('weekly-summary');
    if (weeklySummary) weeklySummary.checked = currentSettings.notifications.weeklySummary;

    // Load Privacy
    const publicProfile = document.getElementById('public-profile');
    if (publicProfile) publicProfile.checked = currentSettings.privacy.publicProfile;

    const dataRetention = document.getElementById('data-retention');
    if (dataRetention) dataRetention.value = currentSettings.privacy.dataRetention;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Theme toggle buttons
    const themeBtns = document.querySelectorAll('.toggle-btn');
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

/**
 * Collect current settings from form
 */
function getCurrentSettings() {
    const activeThemeBtn = document.querySelector('.toggle-btn.active');

    return {
        preferences: {
            carbonGoal: parseFloat(document.getElementById('carbon-goal').value) || 50,
            unitPreference: document.getElementById('unit-preference').value,
            theme: activeThemeBtn?.dataset.theme || 'light'
        },
        notifications: {
            dailyReminder: document.getElementById('daily-reminder').checked,
            goalAlerts: document.getElementById('goal-alerts').checked,
            weeklySummary: document.getElementById('weekly-summary').checked
        },
        privacy: {
            publicProfile: document.getElementById('public-profile').checked,
            dataRetention: parseInt(document.getElementById('data-retention').value)
        }
    };
}

/**
 * Handle saving settings
 */
async function handleSaveSettings() {
    const settings = getCurrentSettings();
    currentSettings = settings;

    // Save to localStorage immediately
    localStorage.setItem('ecotrack_settings', JSON.stringify(settings));

    // Show loading feedback
    showNotification('Saving settings...', 'info');

    // Persist to storage
    await saveSettingsToStorage(settings);
}

/**
 * Save settings to storage
 */
async function saveSettingsToStorage(settings) {
    try {
        const { error } = await db
            .from('user_settings')
            .upsert({
                id: SETTINGS_ID,
                carbon_goal: settings.preferences.carbonGoal,
                unit_preference: settings.preferences.unitPreference,
                theme: settings.preferences.theme,
                daily_reminder: settings.notifications.dailyReminder,
                goal_alerts: settings.notifications.goalAlerts,
                weekly_summary: settings.notifications.weeklySummary,
                public_profile: settings.privacy.publicProfile,
                data_retention: settings.privacy.dataRetention,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Settings save error:", error);
            showNotification('Failed to save settings', 'error');
        } else {
            showNotification('Settings saved successfully!', 'success');
            applyTheme(settings.preferences.theme);
        }
    } catch (err) {
        console.error("Failed to persist settings to database:", err);
        showNotification('Error saving settings', 'error');
    }
}

/**
 * Apply theme to document
 */
function applyTheme(theme) {
    const html = document.documentElement;

    if (theme === 'dark') {
        html.style.colorScheme = 'dark';
        document.body.style.backgroundColor = '#1b1c19';
    } else if (theme === 'light') {
        html.style.colorScheme = 'light';
        document.body.style.backgroundColor = 'var(--surface)';
    } else if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.style.colorScheme = prefersDark ? 'dark' : 'light';
        document.body.style.backgroundColor = prefersDark ? '#1b1c19' : 'var(--surface)';
    }
}

/**
 * Handle logout
 */
window.handleLogout = async function() {
    try {
        await db.auth.signOut();
    } catch(e) {
        console.error("Signout error:", e);
    }
    // Clear session and redirect to signin
    localStorage.removeItem('userSession');
    localStorage.removeItem('ecotrack_profile');
    localStorage.removeItem('ecotrack_settings');

    showNotification('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '/signin.html';
    }, 1000);
}

/**
 * Handle delete all data
 */
async function handleDeleteData() {
    const confirmed = confirm(
        'Are you sure? This will permanently delete all your activity data. This action cannot be undone.'
    );

    if (confirmed) {
        const secondConfirm = confirm(
            'This is your final warning. All data will be deleted. Continue?'
        );

        if (secondConfirm) {
            try {
                showNotification('Deleting all data...', 'info');

                // Delete all logs from storage
                const { error: logsError } = await db
                    .from('logs')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

                if (logsError) {
                    console.error("Error deleting logs:", logsError);
                }

                // Clear local storage
                localStorage.removeItem('ecotrackActivities');
                localStorage.removeItem('ecotrack_profile');

                showNotification('All data has been deleted', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1500);
            } catch (err) {
                console.error("Error during data deletion:", err);
                showNotification('Error deleting data', 'error');
            }
        }
    }
}

/**
 * Show notification feedback
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    let bgColor = 'var(--primary)';
    if (type === 'error') bgColor = 'var(--error)';
    else if (type === 'info') bgColor = 'var(--secondary)';

    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${bgColor};
        color: white;
        border-radius: 0.75rem;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Start initialization with proper auth check
initializeSettings();
