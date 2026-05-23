import { supabase } from './supabaseClient.js';
import './theme.js'; // Apply stored theme immediately


const WEEKLY_BUDGET = 38.5; // Indian norm: ~5.5kg per day * 7 days
const DAILY_BUDGET = 5.5;

document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/signin.html';
        return;
    }

    await loadHistoryData();
});

async function loadHistoryData() {
    try {
        const { data: logs, error } = await supabase
            .from('logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get last 7 days range
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const recentLogs = logs.filter(log => {
            const date = new Date(log.created_at);
            return date >= sevenDaysAgo && date <= today;
        });

        // Group by day
        const dailyData = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyData[dateStr] = {
                date: d,
                totalCO2: 0,
                activities: []
            };
        }

        recentLogs.forEach(log => {
            const dateStr = log.created_at.split('T')[0];
            if (dailyData[dateStr]) {
                dailyData[dateStr].totalCO2 += parseFloat(log.amount || 0);
                dailyData[dateStr].activities.push(log);
            }
        });

        const sortedDays = Object.keys(dailyData).sort();

        renderChart(sortedDays.map(dateStr => dailyData[dateStr]));
        renderSummary(dailyData);
        renderLogList(sortedDays.reverse().map(dateStr => dailyData[dateStr]));

    } catch (error) {
        // Error loading history handled silently
    }
}

function renderChart(daysData) {
    const chartContainer = document.getElementById('emissions-chart');
    const template = document.getElementById('chart-bar-template');

    // Clear existing bars except the budget line
    const bars = chartContainer.querySelectorAll('.graph-bar-wrapper');
    bars.forEach(bar => bar.remove());

    const maxBarValue = Math.max(DAILY_BUDGET * 2, ...daysData.map(d => d.totalCO2)); // Ensure budget line is in middle

    // Position budget line
    const budgetLine = document.getElementById('budget-line');
    const budgetPercentage = Math.min((DAILY_BUDGET / maxBarValue) * 100, 100);
    budgetLine.style.bottom = `${budgetPercentage}%`;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    daysData.forEach((day, index) => {
        const clone = template.content.cloneNode(true);
        const bar = clone.querySelector('.graph-bar');
        const label = clone.querySelector('.graph-day');
        
        const isToday = index === daysData.length - 1;
        
        // Calculate height
        const heightPercentage = Math.min((day.totalCO2 / maxBarValue) * 100, 100);
        
        // Delay animation slightly
        setTimeout(() => {
            bar.style.height = `${heightPercentage}%`;
        }, 100 + (index * 100));

        if (day.totalCO2 > DAILY_BUDGET) {
            bar.classList.add('over-budget');
        }

        if (isToday) {
            bar.classList.add('today');
            label.classList.add('today');
            label.textContent = 'Today';
        } else {
            label.textContent = dayNames[day.date.getDay()];
        }

        chartContainer.appendChild(clone);
    });
}

function renderSummary(dailyData) {
    let weeklyTotal = 0;
    Object.values(dailyData).forEach(day => {
        weeklyTotal += day.totalCO2;
    });

    document.getElementById('weekly-total-value').textContent = weeklyTotal.toFixed(1);

    const statusTitle = document.getElementById('budget-status-title');
    const statusDetail = document.getElementById('budget-status-detail');

    if (weeklyTotal <= WEEKLY_BUDGET) {
        const saved = WEEKLY_BUDGET - weeklyTotal;
        statusTitle.textContent = "Net Negative Achievement";
        statusTitle.style.color = "var(--on-primary)";
        statusDetail.textContent = `${saved.toFixed(1)}kg saved this week`;
    } else {
        const over = weeklyTotal - WEEKLY_BUDGET;
        statusTitle.textContent = "Budget Exceeded";
        statusTitle.style.color = "var(--error-container)";
        statusDetail.textContent = `${over.toFixed(1)}kg over budget`;
    }
}

const CATEGORY_ICONS = {
    'Transport': 'directions_car',
    'Food': 'restaurant',
    'Energy': 'bolt',
    'Shopping': 'shopping_bag',
    'Home': 'home',
    'Nature Positive': 'potted_plant',
    'Offset': 'eco'
};

function renderLogList(daysData) {
    const listContainer = document.getElementById('daily-logs-list');
    const template = document.getElementById('log-row-template');
    listContainer.innerHTML = ''; // clear

    const todayStr = new Date().toISOString().split('T')[0];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    daysData.forEach((day) => {
        const dateStr = day.date.toISOString().split('T')[0];
        const clone = template.content.cloneNode(true);
        
        // Date col
        const dateText = `${dayNames[day.date.getDay()]}, ${monthNames[day.date.getMonth()]} ${day.date.getDate()}`;
        clone.querySelector('.log-day-number').textContent = day.date.getDate().toString().padStart(2, '0');
        clone.querySelector('.log-date-text').textContent = dateText;
        
        if (dateStr === todayStr) {
            clone.querySelector('.log-status-text').textContent = 'Current Period';
            clone.querySelector('.log-status-text').style.color = 'var(--primary)';
        } else {
            clone.querySelector('.log-status-text').textContent = 'Historical';
        }

        // Icons col
        const iconsStack = clone.querySelector('.log-icons-stack');
        if (day.activities.length === 0) {
            clone.querySelector('.log-icons-col').innerHTML = `<div class="italic opacity-60 text-sm">No significant data logged</div>`;
        } else {
            // Get unique categories up to 3
            const categories = [...new Set(day.activities.map(a => a.category))].slice(0, 3);
            categories.forEach(cat => {
                const iconName = CATEGORY_ICONS[cat] || 'eco';
                const isNature = cat === 'Nature Positive' || cat === 'Offset';
                
                const circle = document.createElement('div');
                circle.className = `log-icon-circle ${isNature ? 'nature' : ''}`;
                circle.title = cat;
                circle.innerHTML = `<span class="material-symbols-outlined">${iconName}</span>`;
                iconsStack.appendChild(circle);
            });
            
            clone.querySelector('.log-activities-count').textContent = `${day.activities.length} activit${day.activities.length > 1 ? 'ies' : 'y'}`;
        }

        // Amount col
        const amountText = clone.querySelector('.log-amount-text');
        const budgetText = clone.querySelector('.log-budget-text');
        
        if (day.totalCO2 === 0) {
            amountText.textContent = '--';
            amountText.style.opacity = '0.4';
            budgetText.textContent = '';
        } else {
            amountText.textContent = `${day.totalCO2.toFixed(1)} kg`;
            
            if (day.totalCO2 > DAILY_BUDGET) {
                const percentOver = Math.round(((day.totalCO2 - DAILY_BUDGET) / DAILY_BUDGET) * 100);
                budgetText.textContent = `+${percentOver}% over budget`;
                budgetText.classList.add('text-error');
            } else {
                const percentUnder = Math.round(((DAILY_BUDGET - day.totalCO2) / DAILY_BUDGET) * 100);
                budgetText.textContent = `${percentUnder}% under budget`;
                budgetText.classList.add('text-secondary');
            }
        }

        listContainer.appendChild(clone);
    });
}
