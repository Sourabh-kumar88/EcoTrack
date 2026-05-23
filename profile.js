// profile.js - CLEAN VERSION WITH LAZY DOM INITIALIZATION

import { supabase } from './supabaseClient.js';
import './theme.js'; // Apply stored theme immediately

// ===== AUTHENTICATION CHECK =====
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
    } catch (error) {
        window.location.href = '/signin.html';
        return false;
    }
}

// Set up auth state listener FIRST (before any DOM access)
supabase.auth.onAuthStateChange((event, session) => {
    if (!session && authChecked) {
        window.location.href = '/signin.html';
    }
});

// Initialize when DOM is ready with proper auth check
async function initializeProfile() {
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return;
    }
    
    // Wait for DOM to be fully ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupProfile);
    } else {
        setupProfile();
    }
}

function setupProfile() {
    initializeDOMElements();
    setupModal();
    loadProfile();
    loadLogsData();
}

// Predefined Avatars List
const avatarsList = [
    {
        id: 'avatar-original',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-a64pITLCtwy1KtFVsaGVoIBAxSvrQNLYW8eLilZX7ZCnOBYAvITSk94zTCeBx4f5I_f8-rZaqjY7paI67QIQJ7dPAv8DLeadb9yFumU1kxAvxUGrIIxlycoUAV0HcR3M6zSu1c2bBXqfFgMHMu2prCkpf03up_5ZUZjaDhbpQpBSH783dzAkc6k-dA3go8TNkAr0xweNYmcIoYYYdsJB-pX9m-qpmnLrVuP8zFFqNOaiG1R47sF00GHENBoGzoLy6GUcEuTtO-K4',
        label: 'Julian'
    },
    {
        id: 'avatar-foliage',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB4CP1AUjppJYrnlUH0_4xEWYdk5eG3sWWLzf0YaSxeelpjdy32aB7nbMYm4Jo-5B0rGZ4SDqVcin0XEMbkHXuT9tWsRVYbZA0yRp5iEcnNPvDrXjUtkhjmos2NoZI0FQWwnPIlELIJPkzfxKnlYHaOvbnm7TgcFrJV_EotqQAxvDT8YL0ky297VwXfAio9Lv4Pbt7McJ3RKVUZJ9joRoZb4HrdHkBl1kQUZjsdqbrZNwWdX1ggq9RtNSbY9tFFX1c2ufkyPUZdk7CY',
        label: 'Foliage'
    },
    {
        id: 'avatar-forest',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDr5QKBf1an7KCW_vQbr1kJZW8dLdPMshoY1tEFCVR-0zd5peRPhPOO7HEfeo4ScubtPAyb01kPm9cpOAyWUw5Yn752BfXwFv-GZmKbIa7tyQGwaEpQEAkz0XUZ_vNmZwVCofHwrF-eJLDPnnb49ttCvEJWoo5pT35GTLaeD7tN6UY8YzZhQHB_N5tt7sroQRwyTmNsxdXLPO_8I7IyAefjiq6EXptxQ9nRycpAQjqT_Yh9dMsMKGLbqA0wgiFRpSwHMSgZKeJbnCpN',
        label: 'Canopy'
    },
    {
        id: 'avatar-runner',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCu_FuM9bIOMHdwGOAhx2wY7v8af7EVCQXSMPnXU2qoChihQjxDLZEMS-nDibhBmiDy0SscAm4foehvdoF-6iAW9q_df98pzzf4bDZyclmTWqOFnTwpK0Py3dKjqGuqUvmm-c27fCrH2JRFxqpX1R7cc214QbtYOg1kGQH_rYt-Evt5koET6ChCeERG26p5ClrGXEP4JVuFeRk6Hp7ufmDCnPNMckpMazgJEr5GBzqqJQBr8QZ7CjGa1ncex99gZVYdU6QZUNN6_NdP',
        label: 'Flow'
    },
    {
        id: 'avatar-plant',
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_E6HP9Ob4EEg_cH3kuETylnLcFJD2xmTiCWeAkVeHxgft9G9Z2sYBF9KBemfzuxtvbTPPGf89hzV6xde-PcPXLx8FSuPjX9Ys8mcIgTyNHmAvxVt6KELsrHl4Wt2ZwXWeXYKkvQc4ggUwAgbPmKEl9qD8Shx4ssGZaqGWp8pkjecme_9goJrgKwk041vaRAP1FVqCwsOUxYoQhgCdJFEX9LJB0ktZIleIkprK-TV38EtGan6SPVPqhj2B8QzHps2qdSv9HVEAOoeW',
        label: 'Seedling'
    }
];

const DEFAULT_PROFILE = {
    name: "Julian Arbor",
    role: "Mindful Explorer",
    bio: "Small actions quietly shape a better future.",
    avatar_url: avatarsList[0].url
};

const PROFILE_ID = 'default-explorer';

// State
let currentProfile = { ...DEFAULT_PROFILE };
let selectedAvatarUrl = DEFAULT_PROFILE.avatar_url;

// DOM Elements - Lazy loaded after DOMContentLoaded
let profileAvatar, displayName, displayRole, displayBio, heroStreakCount;
let editModal, editTrigger, editClose, editForm, editNameInput, editRoleInput, editBioInput, avatarPickerContainer;
let impactMetricCO2, impactMetricWater, impactMetricTrees, impactMetricStreak, impactScoreValue, impactScoreRing;
let graphTrendPath, graphPointsGroup, fieldNotesContent, weeklyTrendBadge;

/**
 * INITIALIZATION - Call this right after DOMContentLoaded to populate all DOM refs
 */
function initializeDOMElements() {
    profileAvatar = document.getElementById('profile-avatar');
    displayName = document.getElementById('profile-display-name');
    displayRole = document.getElementById('profile-display-role');
    displayBio = document.getElementById('profile-display-bio');
    heroStreakCount = document.getElementById('hero-streak-count');

    editModal = document.getElementById('edit-profile-modal');
    editTrigger = document.getElementById('edit-profile-trigger');
    editClose = document.getElementById('edit-profile-close');
    editForm = document.getElementById('edit-profile-form');
    editNameInput = document.getElementById('edit-name');
    editRoleInput = document.getElementById('edit-role');
    editBioInput = document.getElementById('edit-bio');
    avatarPickerContainer = document.getElementById('avatar-picker-container');

    impactMetricCO2 = document.getElementById('impact-metric-co2');
    impactMetricWater = document.getElementById('impact-metric-water');
    impactMetricTrees = document.getElementById('impact-metric-trees');
    impactMetricStreak = document.getElementById('impact-metric-streak');
    impactScoreValue = document.getElementById('impact-score-value');
    impactScoreRing = document.getElementById('impact-score-ring');

    graphTrendPath = document.getElementById('graph-trend-path');
    graphPointsGroup = document.getElementById('graph-points-group');
    fieldNotesContent = document.getElementById('field-notes-content');
    weeklyTrendBadge = document.getElementById('weekly-trend-badge');
}

// ============ PROFILE CRUD ============

async function loadProfile() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', PROFILE_ID)
            .maybeSingle();

        if (error) {
            loadProfileFromLocal();
        } else if (data) {
            currentProfile = {
                name: data.name || DEFAULT_PROFILE.name,
                role: data.role || DEFAULT_PROFILE.role,
                bio: data.bio || DEFAULT_PROFILE.bio,
                avatar_url: data.avatar_url || DEFAULT_PROFILE.avatar_url
            };
            localStorage.setItem('ecotrack_profile', JSON.stringify(currentProfile));
        } else {
            loadProfileFromLocal();
            await saveProfileToSupabase(currentProfile);
        }
    } catch (err) {
        loadProfileFromLocal();
    }
    renderProfileDOM();
}

function loadProfileFromLocal() {
    const local = localStorage.getItem('ecotrack_profile');
    currentProfile = local ? JSON.parse(local) : { ...DEFAULT_PROFILE };
}

async function saveProfile(updated) {
    currentProfile = { ...updated };
    localStorage.setItem('ecotrack_profile', JSON.stringify(currentProfile));
    renderProfileDOM();
    showNotification('Saving profile...', 'info');
    await saveProfileToSupabase(currentProfile);
}

async function saveProfileToSupabase(profile) {
    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: PROFILE_ID,
                name: profile.name,
                role: profile.role,
                bio: profile.bio,
                avatar_url: profile.avatar_url,
                updated_at: new Date().toISOString()
            });

        if (error) {
            showNotification('Error saving profile', 'error');
        } else {
            showNotification('Profile saved!', 'success');
        }
    } catch (err) {
        showNotification('Error saving profile', 'error');
    }
}

function renderProfileDOM() {
    if (profileAvatar) profileAvatar.src = currentProfile.avatar_url;
    if (displayName) displayName.textContent = currentProfile.name;
    if (displayRole) displayRole.textContent = currentProfile.role;
    if (displayBio) displayBio.textContent = `"${currentProfile.bio}"`;
}

// ============ LOGS & METRICS ============

async function loadLogsData() {
    try {
        const { data: logs, error } = await supabase
            .from('logs')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            renderDefaultMetrics();
            return;
        }

        if (!logs || logs.length === 0) {
            renderDefaultMetrics();
            return;
        }

        const streak = calculateStreak(logs);
        if (heroStreakCount) heroStreakCount.textContent = streak;
        if (impactMetricStreak) impactMetricStreak.textContent = streak;

        const activityLogs = logs.filter(l => l.category.toLowerCase() !== 'journal');
        let totalCO2Logged = 0;

        activityLogs.forEach(log => {
            totalCO2Logged += parseFloat(log.amount) || 0;
        });

        const uniqueLoggedDays = getUniqueDaysCount(logs);
        const baselineEmissions = uniqueLoggedDays * 15.0;
        const co2Saved = Math.max(0, baselineEmissions - totalCO2Logged);
        const waterConserved = Math.round(co2Saved * 35);
        const treesEquivalent = co2Saved / 1.5;

        if (impactMetricCO2) impactMetricCO2.textContent = totalCO2Logged.toFixed(1);
        if (impactMetricWater) impactMetricWater.textContent = waterConserved.toLocaleString();
        if (impactMetricTrees) impactMetricTrees.textContent = treesEquivalent.toFixed(1);

        let newScore = Math.max(0, 100 - (totalCO2Logged * 1.5));
        if (totalCO2Logged === 0) newScore = 0;
        const finalScore = Math.round(newScore);

        if (impactScoreValue) impactScoreValue.textContent = finalScore.toFixed(1);
        if (impactScoreRing) {
            const circumference = 276.46;
            const offset = circumference - ((finalScore / 100) * circumference);
            impactScoreRing.style.strokeDashoffset = offset;
        }

        renderWeeklyGraph(activityLogs);
        generateFieldNotes(activityLogs, finalScore);

    } catch (err) {
        renderDefaultMetrics();
    }
}

function renderDefaultMetrics() {
    if (heroStreakCount) heroStreakCount.textContent = '0';
    if (impactMetricStreak) impactMetricStreak.textContent = '0';
    if (impactMetricCO2) impactMetricCO2.textContent = '0.0';
    if (impactMetricWater) impactMetricWater.textContent = '0';
    if (impactMetricTrees) impactMetricTrees.textContent = '0.0';
    if (impactScoreValue) impactScoreValue.textContent = '0.0';
    if (impactScoreRing) impactScoreRing.style.strokeDashoffset = 276.46;
    if (graphTrendPath) graphTrendPath.setAttribute('d', 'M 0,90 C 20,90 40,90 50,90 C 60,90 80,90 100,90');
    if (graphPointsGroup) graphPointsGroup.innerHTML = '';
    if (fieldNotesContent) fieldNotesContent.textContent = '"Your journey is in its initial phases. Log activities to generate your first environmental analysis entry."';
    if (weeklyTrendBadge) weeklyTrendBadge.textContent = 'Observing';
}

function getUniqueDaysCount(logs) {
    const dates = new Set();
    logs.forEach(l => dates.add(new Date(l.created_at).toLocaleDateString('en-CA')));
    return Math.max(1, dates.size);
}

function calculateStreak(logs) {
    if (!logs || logs.length === 0) return 0;

    const loggedDates = new Set();
    logs.forEach(log => {
        const dateStr = new Date(log.created_at).toLocaleDateString('en-CA');
        loggedDates.add(dateStr);
    });

    let streak = 0;
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA');

    let checkDate = loggedDates.has(todayStr) ? new Date(today) :
                    loggedDates.has(yesterdayStr) ? new Date(yesterday) : null;

    if (!checkDate) return 0;

    while (true) {
        const checkStr = checkDate.toLocaleDateString('en-CA');
        if (loggedDates.has(checkStr)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

function renderWeeklyGraph(logs) {
    if (!graphTrendPath || !graphPointsGroup) return;

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekLogs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= monday && logDate <= sunday;
    });

    const dailyEmissions = [0, 0, 0, 0, 0, 0, 0];
    weekLogs.forEach(log => {
        const logDate = new Date(log.created_at);
        let dayIdx = logDate.getDay() - 1;
        if (dayIdx === -1) dayIdx = 6;
        dailyEmissions[dayIdx] += parseFloat(log.amount) || 0;
    });

    const points = dailyEmissions.map((emissions, idx) => {
        const x = (idx / 6) * 100;
        const maxVal = Math.max(10, ...dailyEmissions);
        const y = 90 - (emissions / maxVal) * 70;
        return { x, y, val: emissions };
    });

    let d = "";
    points.forEach((pt, idx) => {
        if (idx === 0) {
            d += `M ${pt.x},${pt.y}`;
        } else {
            const prevPt = points[idx - 1];
            const cp1x = prevPt.x + (pt.x - prevPt.x) / 2;
            const cp1y = prevPt.y;
            const cp2x = prevPt.x + (pt.x - prevPt.x) / 2;
            const cp2y = pt.y;
            d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${pt.x},${pt.y}`;
        }
    });

    graphTrendPath.setAttribute('d', d);

    graphPointsGroup.innerHTML = '';
    points.forEach((pt) => {
        if (pt.val > 0) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pt.x.toString());
            circle.setAttribute('cy', pt.y.toString());
            circle.setAttribute('r', '4');
            circle.setAttribute('fill', '#17341c');
            circle.setAttribute('stroke', '#fbf9f4');
            circle.setAttribute('stroke-width', '2');
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = `${pt.val.toFixed(1)} kg CO2e`;
            circle.appendChild(title);
            graphPointsGroup.appendChild(circle);
        }
    });

    const totalWeekly = dailyEmissions.reduce((a, b) => a + b, 0);
    if (weeklyTrendBadge) {
        weeklyTrendBadge.textContent = totalWeekly > 0 ? `${totalWeekly.toFixed(1)} kg This Week` : 'Quiet Week';
    }
}

function generateFieldNotes(logs, score) {
    if (!fieldNotesContent) return;

    if (logs.length === 0) {
        fieldNotesContent.textContent = '"Your journey is in its initial phases. Log activities to generate your first environmental analysis entry."';
        return;
    }

    const totals = { Vehicle: 0, Electricity: 0, Food: 0, Shopping: 0 };
    logs.forEach(l => {
        if (totals.hasOwnProperty(l.category)) {
            totals[l.category] += parseFloat(l.amount) || 0;
        }
    });

    let maxCat = 'Vehicle';
    let maxVal = -1;
    for (const [cat, val] of Object.entries(totals)) {
        if (val > maxVal) {
            maxVal = val;
            maxCat = cat;
        }
    }

    if (maxVal === 0) {
        fieldNotesContent.textContent = '"Your logged footprint is neutral. The quiet steps you take have left a zero-carbon trace. Continue this observational path."';
        return;
    }

    let noteText = "";
    if (score >= 85) {
        noteText = '"Excellent work. Your mindful decisions have created a resonant, low-impact pattern this week. The simple act of choosing sustainable paths is echoing clearly in your data. The canopy breathes easier."';
    } else {
        switch (maxCat) {
            case 'Vehicle':
                noteText = '"Your transport footprint represents your primary ecological output. Transitioning even small commutes to walking or transit lines will help ease this tension."';
                break;
            case 'Electricity':
                noteText = '"Electricity consumption stands out as the core component of your footprint. Reducing idle device loads will noticeably clear your impact."';
                break;
            case 'Food':
                noteText = '"Dietary carbon weights represent your primary signature. Choosing plant-based alternatives will significantly decrease this metric."';
                break;
            case 'Shopping':
                noteText = '"Acquisition emissions are creating a prominent wave in your data. Opting for circular-use products helps safeguard environmental balance."';
                break;
            default:
                noteText = '"Small, consistent reflections and logs shape a better future. Review your recent weekly rhythm."';
        }
    }
    fieldNotesContent.textContent = noteText;
}

// ============ MODAL SETUP ============

function setupModal() {
    if (!editTrigger || !editModal) return;

    const fileInput = document.getElementById('avatar-file-input');
    const fileUploadStatus = document.getElementById('file-upload-status');

    if (avatarPickerContainer) {
        avatarPickerContainer.innerHTML = '';
        avatarsList.forEach(avatar => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `avatar-option-btn ${currentProfile.avatar_url === avatar.url ? 'selected' : ''}`;
            btn.dataset.url = avatar.url;
            btn.innerHTML = `<img src="${avatar.url}" alt="${avatar.label}">`;

            btn.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedAvatarUrl = avatar.url;
                if (fileUploadStatus) fileUploadStatus.textContent = "No file chosen";
                if (fileInput) fileInput.value = '';
            });

            avatarPickerContainer.appendChild(btn);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                showNotification("Image size should be less than 2MB.", 'error');
                fileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                selectedAvatarUrl = event.target.result;
                if (fileUploadStatus) fileUploadStatus.textContent = file.name;
                document.querySelectorAll('.avatar-option-btn').forEach(b => b.classList.remove('selected'));
            };
            reader.readAsDataURL(file);
        });
    }

    editTrigger.addEventListener('click', () => {
        if (editNameInput) editNameInput.value = currentProfile.name;
        if (editRoleInput) editRoleInput.value = currentProfile.role;
        if (editBioInput) editBioInput.value = currentProfile.bio;
        selectedAvatarUrl = currentProfile.avatar_url;
        if (fileInput) fileInput.value = '';

        let matched = false;
        document.querySelectorAll('.avatar-option-btn').forEach(btn => {
            if (btn.dataset.url === selectedAvatarUrl) {
                btn.classList.add('selected');
                matched = true;
            } else {
                btn.classList.remove('selected');
            }
        });

        if (!matched && selectedAvatarUrl.startsWith('data:image/')) {
            if (fileUploadStatus) fileUploadStatus.textContent = "Custom picture selected";
        } else {
            if (fileUploadStatus) fileUploadStatus.textContent = "No file chosen";
        }

        editModal.classList.add('active');
    });

    const closeModal = () => {
        editModal.classList.remove('active');
    };

    if (editClose) {
        editClose.addEventListener('click', closeModal);
    }

    window.addEventListener('click', (e) => {
        if (e.target === editModal) closeModal();
    });

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const updated = {
                name: editNameInput.value.trim() || DEFAULT_PROFILE.name,
                role: editRoleInput.value.trim() || DEFAULT_PROFILE.role,
                bio: editBioInput.value.trim() || DEFAULT_PROFILE.bio,
                avatar_url: selectedAvatarUrl
            };

            await saveProfile(updated);
            closeModal();
        });
    }
}

// ============ NOTIFICATIONS ============

function showNotification(message, type = 'info') {
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

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification styles
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

// ============ PAGE INITIALIZATION ============

// Start initialization with proper auth check
initializeProfile();

