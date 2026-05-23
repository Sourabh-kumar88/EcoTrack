// dashboard.js

import { supabase } from './supabaseClient.js';
import './theme.js'; // Apply stored theme immediately


// ===== AUTHENTICATION CHECK =====
// Protect the dashboard - redirect unauthenticated users
let authChecked = false;
let currentSession = null;

async function checkAuthentication() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            // No valid session, redirect to signin
            window.location.href = '/signin.html';
            return false;
        }
        
        currentSession = session;
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
        // User logged out, redirect to signin
        window.location.href = '/signin.html';
    } else if (session) {
        currentSession = session;
    }
});

// Initialize dashboard with proper authentication and DOM checks
async function initializeDashboard() {
    // First check authentication
    const isAuthenticated = await checkAuthentication();
    if (!isAuthenticated) {
        return;
    }
    
    // Wait for DOM to be fully ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupDashboardDOM);
    } else {
        setupDashboardDOM();
    }
}

function setupDashboardDOM() {
    // DOM Elements - safely get them with null checks
    const scoreRing = document.getElementById('score-ring');
    const scoreValue = document.getElementById('score-value');
    const metricTransport = document.getElementById('metric-transport');
    const metricFood = document.getElementById('metric-food');
    const metricEnergy = document.getElementById('metric-energy');

    const journalForm = document.getElementById('journal-form');
    const journalInput = document.getElementById('journal-input');
    const journalFeed = document.getElementById('journal-feed');

    // New elements for dynamic features
    const greetingText = document.getElementById('greeting-text');
    const fieldNotesTitle = document.getElementById('field-notes-title');
    const fieldNotesText = document.getElementById('field-notes-text');
    const graphTrendLine = document.getElementById('graph-trend-line');
    
    // Verify critical elements exist
    if (!scoreRing || !scoreValue || !journalForm || !journalFeed) {
        return;
    }
    
    // Field notes library - different messages for different patterns
    const fieldNotesLibrary = {
        neutral: [
            { title: 'The Forest Whispers', text: 'Your carbon footprint is perfectly balanced today. Nature thanks you.' },
            { title: 'Green Harmony', text: 'Another low-impact day in your journey. Every step counts.' },
            { title: 'Quiet Growth', text: 'Your actions are aligned with the forest. Keep nurturing this balance.' }
        ],
        transport_high: [
            { title: 'Roads Less Travelled', text: 'Consider exploring alternative commutes. Even small shifts create ripples.' },
            { title: 'The Journey Within', text: 'Your transport emissions are calling for change. Walking or transit could transform your impact.' },
            { title: 'Paths Forward', text: 'Motor-powered days are visible in your data. Imagine the forest if you shifted one trip tomorrow.' }
        ],
        food_high: [
            { title: 'Feast Mindfully', text: 'Your dietary choices weigh heavy today. Plant-based meals could lighten this load.' },
            { title: 'The Green Plate', text: 'Meat consumption spikes your carbon. Explore one vegetarian meal tomorrow.' },
            { title: 'Growing Change', text: 'Your food emissions bloom large. Local, plant-based options await you.' }
        ],
        energy_high: [
            { title: 'Powered by Nature', text: 'Your electricity use is elevated. Can you power down and power up naturally?' },
            { title: 'The Brightness Within', text: 'Energy consumption peaks. Let sunlight and efficiency guide you.' },
            { title: 'The Spark Within', text: 'Electrical footprint rises. Small habits—unplugged devices, LED lights—shift everything.' }
        ],
        low_score: [
            { title: 'The Canopy Effect', text: 'Small adjustments in your daily choices are stacking up. Notice the clearing air.' },
            { title: 'Seeds of Change', text: 'Your commitment to low carbon is visible. The forest feels it.' },
            { title: 'Gentle Impact', text: 'Living lightly leaves room for regeneration. You are doing well.' }
        ],
        excellent_score: [
            { title: 'Guardian of Green', text: 'Your excellent score reflects true dedication. The canopy breathes easier.' },
            { title: 'Harmony Achieved', text: 'Exceptional low-impact living. You are a beacon of sustainable choices.' },
            { title: 'Forest\'s Friend', text: 'Outstanding. Your actions whisper kindness to the earth.' }
        ]
    };

    /**
     * Get dynamic greeting based on time of day
     */
    function getTimeBasedGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) {
            return 'Good morning, Explorer.';
        } else if (hour < 18) {
            return 'Good afternoon, Explorer.';
        } else {
            return 'Good evening, Explorer.';
        }
    }

    /**
     * Select a daily field note based on emissions pattern
     */
    function selectFieldNote(transport, food, energy, score) {
        const totalEmissions = transport + food + energy;
        let category;

        if (totalEmissions === 0) {
            category = 'neutral';
        } else if (score >= 85) {
            category = 'excellent_score';
        } else if (score <= 30) {
            category = 'low_score';
        } else {
            // Find the highest contributor
            if (transport >= food && transport >= energy) {
                category = 'transport_high';
            } else if (food >= energy) {
                category = 'food_high';
            } else {
                category = 'energy_high';
            }
        }

        const notes = fieldNotesLibrary[category];
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        return randomNote;
    }

    /**
     * Generate weekly emissions graph from real-time data
     */
    function renderWeeklyGraph(logs) {
        if (!graphTrendLine) return;

        const today = new Date();
        const currentDayOfWeek = today.getDay();
        const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - distanceToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        // Filter logs in current week (excluding journals)
        const weekLogs = logs.filter(log => {
            const logDate = new Date(log.created_at);
            return logDate >= monday && logDate <= sunday && log.category.toLowerCase() !== 'journal';
        });

        // Sum daily emissions
        const dailyEmissions = [0, 0, 0, 0, 0, 0, 0]; // Mon - Sun
        weekLogs.forEach(log => {
            const logDate = new Date(log.created_at);
            let dayIdx = logDate.getDay() - 1; // Mon = 0, Tue = 1...
            if (dayIdx === -1) dayIdx = 6; // Sun = 6
            dailyEmissions[dayIdx] += parseFloat(log.amount) || 0;
        });

        // Build SVG path
        const points = dailyEmissions.map((emissions, idx) => {
            const x = (idx / 6) * 100;
            const maxVal = Math.max(10, ...dailyEmissions);
            const y = 90 - (emissions / maxVal) * 70;
            return { x, y };
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

        graphTrendLine.setAttribute('d', d);
    }

    /**
     * Check if daily reset is needed (at 12:00 AM)
     */
    function checkDailyReset() {
        const lastResetDate = localStorage.getItem('ecotrack_last_reset_date');
        const today = new Date().toLocaleDateString('en-CA');

        if (lastResetDate !== today) {
            // Reset day has changed - update timestamp
            localStorage.setItem('ecotrack_last_reset_date', today);
            return true;
        }
        return false;
    }

    /**
     * Add journal entry to DOM
     */
    function addJournalEntryDOM(text, meta) {
        if (!journalFeed) return;
        const entry = document.createElement('div');
        entry.className = 'journal-entry active';
        entry.innerHTML = `
            <p class="body-md text-on-surface-variant mb-2">${text}</p>
            <span class="label-sm text-secondary" style="text-transform: none;">${meta}</span>
        `;
        journalFeed.appendChild(entry);
    }

    // Load Data from Supabase
    async function loadData() {
        try {
            // Check if daily reset is needed
            checkDailyReset();

            // Update greeting dynamically
            if (greetingText) {
                greetingText.textContent = getTimeBasedGreeting();
            }

            const { data, error } = await supabase
                .from('logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                return;
            }

            let transport = 0;
            let food = 0;
            let energy = 0;

            // Reset Journal Feed
            if (journalFeed) {
                journalFeed.innerHTML = '';
            }

            if (!data || data.length === 0) {
                addJournalEntryDOM("Welcome to the forest. Your journey begins today.", "System • Just now");
            } else {
                // Calculate totals and populate feed
                data.forEach(log => {
                    // Calculate totals (only non-journal entries)
                    const cat = log.category.toLowerCase();
                    if (cat === 'vehicle' || cat === 'transport') transport += log.amount;
                    if (cat === 'food') food += log.amount;
                    if (cat === 'electricity') energy += log.amount;

                    // Populate feed
                    const time = new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    if (log.details.startsWith('"')) {
                         addJournalEntryDOM(log.details, `Explorer • ${time}`);
                    } else {
                         addJournalEntryDOM(`Logged ${log.amount.toFixed(1)} kg CO2e for ${log.details}`, `${log.category} • ${time}`);
                    }
                });
            }

            // Update DOM Metrics
            if (metricTransport) metricTransport.textContent = transport.toFixed(1);
            if (metricFood) metricFood.textContent = food.toFixed(1);
            if (metricEnergy) metricEnergy.textContent = energy.toFixed(1);

            // Calculate score
            const totalEmissions = transport + food + energy;
            let newScore = Math.max(0, 100 - (totalEmissions * 2));
            if (totalEmissions === 0) newScore = 0;
            const score = Math.round(newScore);

            // Update Score Circle
            if (scoreValue) scoreValue.textContent = score;
            if (scoreRing) {
                const circumference = 282.7;
                const offset = circumference - ((score / 100) * circumference);
                scoreRing.style.strokeDashoffset = offset;
            }

            // Update field notes based on emissions
            const fieldNote = selectFieldNote(transport, food, energy, score);
            if (fieldNotesTitle) fieldNotesTitle.textContent = fieldNote.title;
            if (fieldNotesText) fieldNotesText.textContent = fieldNote.text;

            // Render real-time weekly graph
            renderWeeklyGraph(data);

        } catch (err) {
            // Error loading data handled silently
        }
    }

    // Set up journal form submission
    if (journalForm) {
        journalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = journalInput ? journalInput.value.trim() : '';
            if (text) {
                // Optimistic UI update
                addJournalEntryDOM(`"${text}"`, "Explorer • Just now");
                if (journalInput) journalInput.value = '';

                // Save to Supabase
                await supabase.from('logs').insert([{
                    category: 'Journal',
                    amount: 0,
                    details: `"${text}"`
                }]);
                
                // Reload data from source of truth
                loadData();
            }
        });
    }

    // Initial Render and Auto-Refresh
    loadData();
    
    // Refresh data every 10 seconds for real-time updates
    setInterval(() => {
        loadData();
    }, 10000);

    // Check for daily reset every minute
    setInterval(() => {
        if (checkDailyReset()) {
            loadData(); // Reload if reset happened
        }
    }, 60000);
}

// Start the initialization
initializeDashboard();
