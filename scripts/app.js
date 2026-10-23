// ============================================
// Cedar3 — Main App Controller
// ============================================

window.App = (function () {
    var currentTab = 'dashboard';
    var healthTimer = null;
    var dataTimer = null;
    var initialized = false;

    function init() {
        if (initialized) return;
        initialized = true;

        if (!API.isLoggedIn()) {
            window.location.href = CONFIG.LOGIN_PAGE;
            return;
        }

        var user = API.getUser();
        if (!user) {
            window.location.href = CONFIG.LOGIN_PAGE;
            return;
        }

        if (localStorage.getItem('cedar3_dark') === 'true') {
            document.documentElement.classList.add('dark');
        }

        var nameEl = document.getElementById('user-chip-name');
        var roleEl = document.getElementById('user-chip-role');
        var iconEl = document.getElementById('user-chip-icon');
        if (nameEl) nameEl.textContent = user.displayName || user.username;
        if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrator' : 'Technician';
        if (iconEl) {
            iconEl.className = user.role === 'admin' ? 'fa-solid fa-user-shield text-amber-500' : 'fa-solid fa-user-gear text-emerald-500';
        }

        checkHealth();
        healthTimer = setInterval(checkHealth, 10000);

        if (window.Dashboard) {
            Dashboard.refresh();
            Dashboard.startTicker();
            dataTimer = setInterval(function () {
                if (currentTab === 'dashboard') Dashboard.refresh();
            }, CONFIG.POLL_INTERVAL);
        }

        if (window.ClockIn && ClockIn.start) {
            ClockIn.start();
        }

        if (window.Inventory && Inventory.refresh) {
            Inventory.refresh();
        }

        if (window.Schedule && Schedule.startReminderEngine) {
            Schedule.startReminderEngine();
        }

        if (user.role === 'technician') {
            setTimeout(function () { switchTab('clockin'); }, 100);
        }
    }

    async function checkHealth() {
        var dot = document.getElementById('conn-dot');
        var text = document.getElementById('conn-text');
        var badge = document.getElementById('conn-badge');
        if (!dot || !text || !badge) return;

        try {
            var res = await API.getHealth();
            if (res && res.ok) {
                dot.className = 'w-1.5 h-1.5 rounded-full conn-online';
                text.textContent = 'Live Sync Active';
                badge.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200';
            } else {
                dot.className = 'w-1.5 h-1.5 rounded-full conn-offline';
                text.textContent = 'Offline';
                badge.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200';
            }
        } catch (err) {
            dot.className = 'w-1.5 h-1.5 rounded-full conn-offline';
            text.textContent = 'Offline';
            badge.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200';
        }
    }

    function switchTab(tabId) {
        currentTab = tabId;

        document.querySelectorAll('.tab-content').forEach(function (el) { el.classList.add('hidden'); });
        var target = document.getElementById('tab-' + tabId);
        if (target) target.classList.remove('hidden');

        document.querySelectorAll('.nav-btn').forEach(function (btn) {
            btn.className = 'nav-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
        });
        var activeNav = document.querySelector('.nav-btn[data-tab="' + tabId + '"]');
        if (activeNav) {
            activeNav.className = 'nav-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center space-x-2 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm';
        }

        document.querySelectorAll('.mobile-nav-btn').forEach(function (btn) {
            btn.className = 'mobile-nav-btn flex-1 py-2 text-xs font-semibold text-center rounded-md text-slate-600 dark:text-slate-400';
        });
        var activeMobile = document.querySelector('.mobile-nav-btn[data-tab="' + tabId + '"]');
        if (activeMobile) {
            activeMobile.className = 'mobile-nav-btn flex-1 py-2 text-xs font-semibold text-center rounded-md bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm';
        }

        if (tabId === 'dashboard' && window.Dashboard && typeof Dashboard.refresh === 'function') Dashboard.refresh();
        if (tabId === 'clockin' && window.ClockIn && typeof ClockIn.refresh === 'function') ClockIn.refresh();
        if (tabId === 'jobs' && window.Jobs && typeof Jobs.refresh === 'function') Jobs.refresh();
        if (tabId === 'logs' && window.Logs && typeof Logs.refresh === 'function') Logs.refresh();
        if (tabId === 'inventory' && window.Inventory && typeof Inventory.refresh === 'function') Inventory.refresh();
        if (tabId === 'schedule' && window.Schedule && typeof Schedule.refresh === 'function') Schedule.refresh();
        if (tabId === 'inventory-reports' && window.InventoryReports && typeof InventoryReports.refresh === 'function') InventoryReports.refresh();
    }

    function toggleDarkMode() {
        var isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('cedar3_dark', isDark ? 'true' : 'false');
    }

    function logout() {
        if (!confirm('Sign out of Cedar3?')) return;
        if (healthTimer) clearInterval(healthTimer);
        if (dataTimer) clearInterval(dataTimer);
        API.logout();
    }

    function boot() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
    boot();

    return { switchTab: switchTab, toggleDarkMode: toggleDarkMode, logout: logout, init: init };
})();

