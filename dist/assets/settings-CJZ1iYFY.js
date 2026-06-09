import{d as a}from"./dataclient-Cqehk7y_.js";let g=!1;async function S(){try{const{data:{session:e},error:t}=await a.auth.getSession();return t||!e?(window.location.href="/signin.html",!1):(g=!0,!0)}catch(e){return console.error("Auth check error:",e),window.location.href="/signin.html",!1}}a.auth.onAuthStateChange((e,t)=>{!t&&g&&(window.location.href="/signin.html")});async function v(){await S()&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",y):y())}function y(){r=l(),b(),w()}let r;const h="default-user";function l(){return{preferences:{carbonGoal:50,unitPreference:"metric",theme:"light"},notifications:{dailyReminder:!0,goalAlerts:!0,weeklySummary:!0},privacy:{publicProfile:!1,dataRetention:90}}}async function b(){try{const{data:e,error:t}=await a.from("user_settings").select("*").eq("id",h).maybeSingle();t?(console.warn("Settings fetch error (using local storage fallback):",t),s()):e?(r={preferences:{carbonGoal:e.carbon_goal||50,unitPreference:e.unit_preference||"metric",theme:e.theme||"light"},notifications:{dailyReminder:e.daily_reminder!==!1,goalAlerts:e.goal_alerts!==!1,weeklySummary:e.weekly_summary!==!1},privacy:{publicProfile:e.public_profile||!1,dataRetention:e.data_retention||90}},localStorage.setItem("ecotrack_settings",JSON.stringify(r))):(s(),await _(r))}catch(e){console.error("Settings load system error:",e),s()}k()}function s(){const e=localStorage.getItem("ecotrack_settings");if(e)try{r=JSON.parse(e)}catch{r=l()}else r=l()}function k(){const e=document.getElementById("carbon-goal");e&&(e.value=r.preferences.carbonGoal);const t=document.getElementById("unit-preference");t&&(t.value=r.preferences.unitPreference),document.querySelectorAll(".toggle-btn").forEach(c=>{c.classList.remove("active"),c.dataset.theme===r.preferences.theme&&c.classList.add("active")});const n=document.getElementById("daily-reminder");n&&(n.checked=r.notifications.dailyReminder);const d=document.getElementById("goal-alerts");d&&(d.checked=r.notifications.goalAlerts);const u=document.getElementById("weekly-summary");u&&(u.checked=r.notifications.weeklySummary);const m=document.getElementById("public-profile");m&&(m.checked=r.privacy.publicProfile);const f=document.getElementById("data-retention");f&&(f.value=r.privacy.dataRetention)}function w(){const e=document.querySelectorAll(".toggle-btn");e.forEach(t=>{t.addEventListener("click",()=>{e.forEach(o=>o.classList.remove("active")),t.classList.add("active")})})}async function _(e){try{const{error:t}=await a.from("user_settings").upsert({id:h,carbon_goal:e.preferences.carbonGoal,unit_preference:e.preferences.unitPreference,theme:e.preferences.theme,daily_reminder:e.notifications.dailyReminder,goal_alerts:e.notifications.goalAlerts,weekly_summary:e.notifications.weeklySummary,public_profile:e.privacy.publicProfile,data_retention:e.privacy.dataRetention,updated_at:new Date().toISOString()});t?(console.error("Settings save error:",t),i("Failed to save settings","error")):(i("Settings saved successfully!","success"),E(e.preferences.theme))}catch(t){console.error("Failed to persist settings to database:",t),i("Error saving settings","error")}}function E(e){const t=document.documentElement;if(e==="dark")t.style.colorScheme="dark",document.body.style.backgroundColor="#1b1c19";else if(e==="light")t.style.colorScheme="light",document.body.style.backgroundColor="var(--surface)";else if(e==="auto"){const o=window.matchMedia("(prefers-color-scheme: dark)").matches;t.style.colorScheme=o?"dark":"light",document.body.style.backgroundColor=o?"#1b1c19":"var(--surface)"}}window.handleLogout=async function(){try{await a.auth.signOut()}catch(e){console.error("Signout error:",e)}localStorage.removeItem("userSession"),localStorage.removeItem("ecotrack_profile"),localStorage.removeItem("ecotrack_settings"),i("Logged out successfully","success"),setTimeout(()=>{window.location.href="/signin.html"},1e3)};function i(e,t="info"){const o=document.createElement("div");let n="var(--primary)";t==="error"?n="var(--error)":t==="info"&&(n="var(--secondary)"),o.style.cssText=`
        position: fixed;
        top: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${n};
        color: white;
        border-radius: 0.75rem;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `,o.textContent=e,document.body.appendChild(o),setTimeout(()=>{o.style.animation="slideOut 0.3s ease",setTimeout(()=>o.remove(),300)},3e3)}const p=document.createElement("style");p.textContent=`
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
`;document.head.appendChild(p);v();
