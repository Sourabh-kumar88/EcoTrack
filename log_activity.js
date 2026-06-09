// log_activity.js

import './style.css';
import './log_activity.css';
import { db } from './dataclient.js';

// Form Data Definitions and Emission Factors
const categories = {
    transport: {
        icon: 'directions_car',
        title: 'Vehicle Details',
        optionsLabel: 'Transport Type',
        options: [
            { id: 'petrol_car', label: 'Petrol car', factor: 0.192 }, 
            { id: 'diesel_car', label: 'Diesel car', factor: 0.171 },
            { id: 'ev', label: 'Electric car', factor: 0.05 },
            { id: 'tw', label: 'Two-wheeler', factor: 0.08 },
            { id: 'bus', label: 'Bus', factor: 0.10 }
        ],
        inputLabel: 'Distance',
        units: ['km', 'miles']
    },
    electricity: {
        icon: 'bolt',
        title: 'Electricity Usage',
        optionsLabel: 'Energy Source',
        options: [
            { id: 'grid', label: 'Grid', factor: 0.4 },
            { id: 'solar', label: 'Solar', factor: 0.04 },
            { id: 'lpg', label: 'LPG', factor: 0.22 }
        ],
        inputLabel: 'Units',
        units: ['kWh', 'hours (approx)']
    },
    food: {
        icon: 'restaurant',
        title: 'Food Consumption',
        optionsLabel: 'Meal Type',
        options: [
            { id: 'meat', label: 'High Meat', factor: 3.3 },
            { id: 'avg', label: 'Average', factor: 2.0 },
            { id: 'veg', label: 'Vegetarian', factor: 1.4 },
            { id: 'vegan', label: 'Vegan', factor: 0.9 }
        ],
        inputLabel: 'Quantity',
        units: ['meals', 'servings']
    },
    shopping: {
        icon: 'shopping_bag',
        title: 'Shopping & Goods',
        optionsLabel: 'Item Category',
        options: [
            { id: 'clothes', label: 'Clothes', factor: 15.0 },
            { id: 'electronics', label: 'Electronics', factor: 50.0 },
            { id: 'groceries', label: 'Groceries', factor: 2.5 }
        ],
        inputLabel: 'Amount',
        units: ['items', 'bags']
    }
};

let currentCategory = 'transport';
let selectedOption = categories['transport'].options[0];
let currentCalculatedCO2 = 0;

// DOM Elements
const categoryCards = document.querySelectorAll('.category-card');
const formTitleIcon = document.getElementById('form-icon');
const formTitleText = document.getElementById('form-title-text');
const subOptionsContainer = document.getElementById('sub-options');
const subOptionsLabel = document.querySelector('#sub-options-container label');
const primaryInput = document.getElementById('primary-input');
const primaryUnit = document.getElementById('primary-unit');
const inputLabel = document.getElementById('input-label');
const notesInput = document.getElementById('notes-input');
const estimatedCo2Text = document.getElementById('estimated-co2');
const logForm = document.getElementById('log-form');

const sidebarTotal = document.getElementById('sidebar-total');
const sidebarGauge = document.getElementById('sidebar-gauge');
const loggedEntriesList = document.getElementById('logged-entries-list');

const breakdowns = {
    transport: document.getElementById('breakdown-transport'),
    electricity: document.getElementById('breakdown-electricity'),
    food: document.getElementById('breakdown-food'),
    shopping: document.getElementById('breakdown-shopping')
};

// Initialize sidebar from storage
async function updateSidebar() {
    const { data, error } = await db
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    let totals = {
        transport: 0,
        electricity: 0,
        food: 0,
        shopping: 0
    };

    let overallTotal = 0;

    loggedEntriesList.innerHTML = '';

    if (data) {
        let logCount = 0;
        data.forEach(log => {
            const cat = log.category.toLowerCase();
            
            // Only sum up if it's one of the 4 main categories (ignoring 'Journal')
            if (cat === 'vehicle') totals.transport += log.amount;
            else if (cat === 'electricity') totals.electricity += log.amount;
            else if (cat === 'food') totals.food += log.amount;
            else if (cat === 'shopping') totals.shopping += log.amount;

            overallTotal += log.amount;

            // Update Logged Entries List (Max 5)
            if (cat !== 'journal' && logCount < 5) {
                const time = new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const li = document.createElement('li');
                li.className = 'logged-item';
                li.innerHTML = `
                    <div style="flex-grow: 1;">
                        <p class="body-md text-on-surface" style="font-size: 14px; margin: 0;">${log.details}</p>
                        <p class="label-sm text-on-surface-variant" style="font-size: 10px; margin: 0; text-transform: none;">${log.category} • ${time}</p>
                    </div>
                    <span class="body-md text-primary" style="font-weight: 500; font-size: 14px;">${log.amount.toFixed(1)} kg</span>
                `;
                loggedEntriesList.appendChild(li);
                logCount++;
            }
        });
    }

    // Update Breakdown DOM
    breakdowns.transport.textContent = `${totals.transport.toFixed(1)} kg`;
    breakdowns.electricity.textContent = `${totals.electricity.toFixed(1)} kg`;
    breakdowns.food.textContent = `${totals.food.toFixed(1)} kg`;
    breakdowns.shopping.textContent = `${totals.shopping.toFixed(1)} kg`;

    // Update Total and Gauge
    sidebarTotal.textContent = overallTotal.toFixed(1);

    const MAX_EXPECTED = 20;
    let rotation = -45; // Start
    if (overallTotal > 0) {
        let percent = Math.min(overallTotal / MAX_EXPECTED, 1);
        rotation = -45 + (percent * 180);
    }
    sidebarGauge.style.transform = `rotate(${rotation}deg)`;
}

// Render Form for Category
function renderForm(categoryId) {
    currentCategory = categoryId;
    const data = categories[categoryId];
    selectedOption = data.options[0]; // Reset option to first

    formTitleIcon.textContent = data.icon;
    formTitleText.textContent = data.title;
    subOptionsLabel.textContent = data.optionsLabel;
    inputLabel.textContent = data.inputLabel;

    // Render units
    primaryUnit.innerHTML = '';
    data.units.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u;
        primaryUnit.appendChild(opt);
    });

    // Render Sub Options
    renderSubOptions(data.options);
    
    // Reset values
    primaryInput.value = (categoryId === 'transport' || categoryId === 'electricity') ? 15 : 1;
    notesInput.value = '';
    calculateCO2();
}

function renderSubOptions(options) {
    subOptionsContainer.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `type-btn ${selectedOption.id === opt.id ? 'active' : ''}`;
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
            selectedOption = opt;
            renderSubOptions(options); 
            calculateCO2();
        });
        subOptionsContainer.appendChild(btn);
    });
}

// Calculate logic
function calculateCO2() {
    let val = parseFloat(primaryInput.value) || 0;
    const unit = primaryUnit.value;

    if (unit === 'miles') val = val * 1.60934;

    currentCalculatedCO2 = val * selectedOption.factor;
    estimatedCo2Text.textContent = `${currentCalculatedCO2.toFixed(2)} kg CO2e`;
}

// Event Listeners
categoryCards.forEach(card => {
    card.addEventListener('click', () => {
        categoryCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        renderForm(card.dataset.category);
    });
});

primaryInput.addEventListener('input', calculateCO2);
primaryUnit.addEventListener('change', calculateCO2);

logForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentCalculatedCO2 <= 0) return;

    let notes = notesInput.value.trim();
    if (!notes) {
        notes = `${selectedOption.label} (${primaryInput.value} ${primaryUnit.value})`;
    }

    const categoryString = categories[currentCategory].title.split(' ')[0]; // "Vehicle", "Electricity", etc.

    // Save to storage
    const { error } = await db.from('logs').insert([{
        category: categoryString,
        amount: currentCalculatedCO2,
        details: notes
    }]);

    if (error) {
        console.error("Error inserting log:", error);
        alert("Failed to save log. See console.");
        return;
    }

    // Reset Form
    primaryInput.value = '';
    notesInput.value = '';
    calculateCO2();

    // Reload sidebar data
    await updateSidebar();

    // Flash success
    const btn = logForm.querySelector('button[type="submit"]');
    const ogText = btn.textContent;
    btn.textContent = "Saved to Cloud!";
    setTimeout(() => { btn.textContent = ogText; }, 2000);
});

// Init
window.addEventListener('DOMContentLoaded', () => {
    renderForm('transport');
    updateSidebar();
});
