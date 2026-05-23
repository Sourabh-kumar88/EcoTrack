// settings.js

import { supabase } from './supabaseClient.js';

// ─── Auth guard ────────────────────────────────────────────────
let authChecked = false;

async function checkAuthentication() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = '/signin.html';
            return false;
        }
        authChecked = true;
        return true;
    } catch (err) {
        window.location.href = '/signin.html';
        return false;
    }
}

supabase.auth.onAuthStateChange((event, session) => {
    if (!session && authChecked) {
        window.location.href = '/signin.html';
    }
});

// ─── State ─────────────────────────────────────────────────────
let currentSettings;
let savedSettings;       // deep copy of last-saved state to detect changes
let hasUnsavedChanges = false;
const SETTINGS_ID = 'default-user';

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
            dataRetention: '90'
        }
    };
}

// ─── Theme ─────────────────────────────────────────────────────
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || 'light');
    localStorage.setItem('ecotrack_theme', theme || 'light');
}

// Apply stored theme immediately on load (before content renders)
(function applyStoredTheme() {
    const stored = localStorage.getItem('ecotrack_theme') || 'light';
    document.documentElement.setAttribute('data-theme', stored);
})();

// ─── Load settings ─────────────────────────────────────────────
async function loadSettings() {
    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('id', SETTINGS_ID)
            .maybeSingle();

        if (!error && data) {
            currentSettings = {
                preferences: {
                    carbonGoal: data.carbon_goal ?? 50,
                    unitPreference: data.unit_preference ?? 'metric',
                    theme: data.theme ?? 'light'
                },
                notifications: {
                    dailyReminder: data.daily_reminder !== false,
                    goalAlerts: data.goal_alerts !== false,
                    weeklySummary: data.weekly_summary !== false
                },
                privacy: {
                    publicProfile: data.public_profile ?? false,
                    dataRetention: String(data.data_retention ?? 90)
                }
            };
            localStorage.setItem('ecotrack_settings', JSON.stringify(currentSettings));
        } else {
            loadSettingsFromLocal();
            // Seed defaults into storage for future loads
            await saveSettingsToStorage(currentSettings, false);
        }
    } catch (err) {
        loadSettingsFromLocal();
    }

    savedSettings = JSON.stringify(currentSettings);
    renderSettingsToDOM();
    applyTheme(currentSettings.preferences.theme);
}

function loadSettingsFromLocal() {
    try {
        const local = localStorage.getItem('ecotrack_settings');
        currentSettings = local ? JSON.parse(local) : getDefaultSettings();
    } catch {
        currentSettings = getDefaultSettings();
    }
}

// ─── Render ────────────────────────────────────────────────────
function renderSettingsToDOM() {
    const p = currentSettings.preferences;
    const n = currentSettings.notifications;
    const priv = currentSettings.privacy;

    setVal('carbon-goal', p.carbonGoal);
    setVal('unit-preference', p.unitPreference);

    // Theme buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === p.theme);
    });

    setChecked('daily-reminder',  n.dailyReminder);
    setChecked('goal-alerts',     n.goalAlerts);
    setChecked('weekly-summary',  n.weeklySummary);
    setChecked('public-profile',  priv.publicProfile);
    setVal('data-retention', String(priv.dataRetention));
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function setChecked(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
}

// ─── Collect current form state ────────────────────────────────
function collectSettings() {
    const activeThemeBtn = document.querySelector('.toggle-btn.active');
    return {
        preferences: {
            carbonGoal: parseFloat(document.getElementById('carbon-goal')?.value) || 50,
            unitPreference: document.getElementById('unit-preference')?.value || 'metric',
            theme: activeThemeBtn?.dataset.theme || 'light'
        },
        notifications: {
            dailyReminder: document.getElementById('daily-reminder')?.checked ?? true,
            goalAlerts:    document.getElementById('goal-alerts')?.checked    ?? true,
            weeklySummary: document.getElementById('weekly-summary')?.checked ?? true
        },
        privacy: {
            publicProfile:  document.getElementById('public-profile')?.checked ?? false,
            dataRetention:  document.getElementById('data-retention')?.value   || '90'
        }
    };
}

// ─── Unsaved changes tracking ──────────────────────────────────
function markChanged() {
    hasUnsavedChanges = true;
    const indicator = document.getElementById('unsaved-indicator');
    if (indicator) {
        indicator.style.display = 'flex';
        // Subtle pulse animation
        indicator.style.animation = 'none';
        requestAnimationFrame(() => {
            indicator.style.animation = 'pulseIndicator 0.4s ease';
        });
    }
}

function clearChanged() {
    hasUnsavedChanges = false;
    const indicator = document.getElementById('unsaved-indicator');
    if (indicator) indicator.style.display = 'none';
}

// ─── Event listeners ───────────────────────────────────────────
function setupEventListeners() {
    // Theme toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Live preview theme
            applyTheme(btn.dataset.theme);
            markChanged();
        });
    });

    // All inputs / selects / checkboxes trigger unsaved state
    const watchIds = [
        'carbon-goal', 'unit-preference',
        'daily-reminder', 'goal-alerts', 'weekly-summary',
        'public-profile', 'data-retention'
    ];
    watchIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', markChanged);
            el.addEventListener('input', markChanged);
        }
    });

    // Warn on navigation if unsaved
    window.addEventListener('beforeunload', e => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// ─── Save ──────────────────────────────────────────────────────
async function saveSettingsToStorage(settings, showToast = true) {
    try {
        const { error } = await supabase
            .from('user_settings')
            .upsert({
                id: SETTINGS_ID,
                carbon_goal:      settings.preferences.carbonGoal,
                unit_preference:  settings.preferences.unitPreference,
                theme:            settings.preferences.theme,
                daily_reminder:   settings.notifications.dailyReminder,
                goal_alerts:      settings.notifications.goalAlerts,
                weekly_summary:   settings.notifications.weeklySummary,
                public_profile:   settings.privacy.publicProfile,
                data_retention:   parseInt(settings.privacy.dataRetention, 10),
                updated_at:       new Date().toISOString()
            });

        localStorage.setItem('ecotrack_settings', JSON.stringify(settings));

        if (showToast) {
            if (error) {
                showNotification('Could not sync to cloud — saved locally', 'warning');
            } else {
                showNotification('Settings saved!', 'success');
            }
        }
    } catch (err) {
        localStorage.setItem('ecotrack_settings', JSON.stringify(settings));
        if (showToast) showNotification('Saved locally', 'warning');
    }
}

window.handleSaveSettings = async function () {
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Saving…';
    }

    const settings = collectSettings();
    currentSettings = settings;
    savedSettings = JSON.stringify(settings);
    await saveSettingsToStorage(settings, true);
    applyTheme(settings.preferences.theme);
    clearChanged();

    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span class="material-symbols-outlined">check_circle</span> Saved!';
        setTimeout(() => {
            saveBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Save Changes';
        }, 2000);
    }
};

// ─── Delete All Data ───────────────────────────────────────────
window.handleDeleteData = async function () {
    showDeleteModal();
};

function showDeleteModal() {
    const existing = document.getElementById('delete-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'delete-modal';
    overlay.innerHTML = `
        <div class="modal-backdrop" id="modal-backdrop"></div>
        <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-icon">
                <span class="material-symbols-outlined">delete_forever</span>
            </div>
            <h3 class="modal-title" id="modal-title">Delete All Data</h3>
            <p class="modal-body">
                This will permanently erase <strong>all your activity logs, profile data, and settings</strong>.
                This action <em>cannot</em> be undone.
            </p>
            <p class="modal-confirm-label">Type <strong>DELETE</strong> to confirm:</p>
            <input type="text" id="delete-confirm-input" class="modal-input" placeholder="DELETE" autocomplete="off" />
            <div class="modal-actions">
                <button class="btn-modal-cancel" id="modal-cancel-btn">Cancel</button>
                <button class="btn-modal-danger" id="modal-confirm-btn" disabled>Delete Everything</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('modal-visible'));

    const input      = document.getElementById('delete-confirm-input');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const cancelBtn  = document.getElementById('modal-cancel-btn');
    const backdrop   = document.getElementById('modal-backdrop');

    input.addEventListener('input', () => {
        confirmBtn.disabled = input.value.trim() !== 'DELETE';
    });

    function closeModal() {
        overlay.classList.remove('modal-visible');
        setTimeout(() => overlay.remove(), 300);
    }

    cancelBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    confirmBtn.addEventListener('click', async () => {
        if (input.value.trim() !== 'DELETE') return;
        closeModal();
        await deleteAllData();
    });

    // Focus input for UX
    setTimeout(() => input.focus(), 300);
}

async function deleteAllData() {
    showNotification('Deleting all data…', 'info');

    try {
        // Delete from mock/Supabase
        await supabase.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('user_settings').delete().eq('id', SETTINGS_ID);

        // Clear ALL ecotrack localStorage keys
        const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith('ecotrack'));
        keysToRemove.forEach(k => localStorage.removeItem(k));

        // Also clear legacy key names used in other pages
        ['ecotrackActivities', 'userSession'].forEach(k => localStorage.removeItem(k));

        showNotification('All data deleted. Redirecting…', 'success');
        setTimeout(() => { window.location.href = '/signin.html'; }, 1800);
    } catch (err) {
        showNotification('Error while deleting data', 'error');
    }
}

// ─── Logout ────────────────────────────────────────────────────
window.handleLogout = async function () {
    try { await supabase.auth.signOut(); } catch (e) { /* Signout failed silently */ }
    ['userSession', 'ecotrack_session', 'ecotrack_profile', 'ecotrack_settings']
        .forEach(k => localStorage.removeItem(k));
    showNotification('Signed out successfully', 'success');
    setTimeout(() => { window.location.href = '/signin.html'; }, 1000);
};

// ─── Toast notifications ────────────────────────────────────────
function showNotification(message, type = 'info') {
    const colors = {
        success: 'var(--primary)',
        error:   'var(--error)',
        warning: '#d97706',
        info:    'var(--secondary)'
    };
    const icons = {
        success: 'check_circle',
        error:   'error',
        warning: 'warning',
        info:    'info'
    };

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        top: 5.5rem;
        right: 2rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1.25rem;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 0.875rem;
        z-index: 9999;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        animation: toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        max-width: 340px;
    `;
    toast.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:18px;font-variation-settings:'FILL' 1;">${icons[type] || 'info'}</span>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// ─── Inject CSS (animations, modal, unsaved indicator) ──────────
const dynamicStyles = document.createElement('style');
dynamicStyles.textContent = `
    @keyframes toastIn {
        from { transform: translateX(120%) scale(0.8); opacity: 0; }
        to   { transform: translateX(0)   scale(1);   opacity: 1; }
    }
    @keyframes toastOut {
        from { transform: translateX(0); opacity: 1; }
        to   { transform: translateX(120%); opacity: 0; }
    }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }
    @keyframes pulseIndicator {
        0%   { transform: scale(1); }
        50%  { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    .spin { display: inline-block; animation: spin 0.8s linear infinite; }

    /* Unsaved indicator */
    #unsaved-indicator {
        display: none;
        align-items: center;
        gap: 0.5rem;
        font-size: 13px;
        font-weight: 600;
        color: #d97706;
        background: #fef3c7;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid #fcd34d;
    }

    /* Delete modal */
    #delete-modal {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    #delete-modal.modal-visible { opacity: 1; }

    .modal-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(4px);
    }
    .modal-box {
        position: relative;
        background: var(--surface-container);
        border: 1px solid var(--error-container);
        border-radius: 1.5rem;
        padding: 2.5rem;
        max-width: 440px;
        width: 90%;
        text-align: center;
        transform: scale(0.9);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 24px 64px rgba(0,0,0,0.25);
    }
    #delete-modal.modal-visible .modal-box { transform: scale(1); }

    .modal-icon {
        width: 72px;
        height: 72px;
        background: var(--error-container);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
    }
    .modal-icon .material-symbols-outlined {
        font-size: 36px;
        color: var(--error);
        font-variation-settings: 'FILL' 1;
    }
    .modal-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--error);
        margin-bottom: 0.75rem;
    }
    .modal-body {
        font-size: 14px;
        color: var(--on-surface-variant);
        line-height: 1.6;
        margin-bottom: 1.5rem;
    }
    .modal-confirm-label {
        font-size: 13px;
        color: var(--on-surface-variant);
        margin-bottom: 0.5rem;
        text-align: left;
    }
    .modal-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 2px solid var(--outline-variant);
        border-radius: 0.75rem;
        background: var(--surface-container-lowest);
        color: var(--on-surface);
        font-size: 15px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-align: center;
        margin-bottom: 1.5rem;
        box-sizing: border-box;
        transition: border-color 0.2s;
        font-family: var(--font-body);
    }
    .modal-input:focus {
        outline: none;
        border-color: var(--error);
        box-shadow: 0 0 0 3px rgba(176,0,32,0.12);
    }
    .modal-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
    }
    .btn-modal-cancel {
        flex: 1;
        padding: 0.75rem;
        background: var(--surface-container-high);
        color: var(--on-surface);
        border: 1px solid var(--outline-variant);
        border-radius: 0.75rem;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-family: var(--font-body);
    }
    .btn-modal-cancel:hover { background: var(--surface-container-highest); }
    .btn-modal-danger {
        flex: 1;
        padding: 0.75rem;
        background: var(--error);
        color: white;
        border: none;
        border-radius: 0.75rem;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-family: var(--font-body);
    }
    .btn-modal-danger:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .btn-modal-danger:not(:disabled):hover {
        background: #9b0000;
        box-shadow: 0 4px 12px rgba(176,0,32,0.3);
    }
`;
document.head.appendChild(dynamicStyles);

// ─── Bootstrap ─────────────────────────────────────────────────
async function initializeSettings() {
    const ok = await checkAuthentication();
    if (!ok) return;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
}

function setup() {
    currentSettings = getDefaultSettings();
    loadSettings();          // async, fills DOM when ready
    setupEventListeners();
    injectUnsavedIndicator();
}

function injectUnsavedIndicator() {
    const footer = document.querySelector('.settings-footer');
    if (!footer) return;

    const indicator = document.createElement('div');
    indicator.id = 'unsaved-indicator';
    indicator.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:16px;">edit_note</span>
        Unsaved changes
    `;
    footer.insertBefore(indicator, footer.firstChild);
}

initializeSettings();
