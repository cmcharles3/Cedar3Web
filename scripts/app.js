// ============================================
// Cedar3 — Main App Controller
// ============================================

window.App = (function () {
    let currentTab = 'dashboard';
    let healthTimer = null;
    let dataTimer = null;
    let initialized = false;

    function init() {
        if (initialized) return;
        initialized = true;

        // Auth guard
        if (!API.isLoggedIn()) {
            window.location.href = CONFIG.LOGIN_PAGE;
            return;
        }

        const user = API.getUser();
        if (!user) {
            window.location.href = CONFIG.LOGIN_PAGE;
            return;
        }

        console.log('[App] init for', user.username, '(' + user.role + ')');

        // Dark mode
        if (localStorage.getItem('cedar3_dark') === 'true') {
            document.documentElement.classList.add('dark');
        }

        // Populate user chip
        const nameEl = document.getElementById('user-chip-name');
        const roleEl = document.getElementById('user-chip-role');
        const iconEl = document.getElementById('user-chip-icon');
        if (nameEl) nameEl.textContent = user.displayName || user.username;
        if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrator' : 'Technician';
        if (iconEl) {
            iconEl.className = user.role === 'admin'
                ? 'fa-solid fa-user-shield text-amber-500'
                : 'fa-solid fa-user-gear text-emerald-500';
        }

        // Sanity check: is the DOM actually there?
        const cardsContainer = document.getElementById('dashboard-cards');
        console.log('[App] dashboard-cards container:', cardsContainer ? 'FOUND' : 'MISSING');

        // Start health check
        checkHealth();
        healthTimer = setInterval(checkHealth, 10000);

        // Start dashboard
        if (window.Dashboard) {
            console.log('[App] starting Dashboard');
            Dashboard.refresh();
            Dashboard.startTicker();
            dataTimer = setInterval(() => {
                if (currentTab === 'dashboard') Dashboard.refresh();
            }, CONFIG.POLL_INTERVAL);
        } else {
            console.error('[App] Dashboard module not loaded!');
        }

        // Start clock-in terminal
        if (window.ClockIn && ClockIn.start) {
            ClockIn.start();
        }

        if (window.ClockIn && ClockIn.start) {
            ClockIn.start();
        }

        // Pre-render so tab contents show instantly on first switch
        if (window.Jobs && typeof Jobs.render === 'function') Jobs.render();
        if (window.Logs && typeof Logs.render === 'function') Logs.render();

        if (user.role === 'technician') {
            setTimeout(() => switchTab('clockin'), 100);
        }

        // Route technicians to clock-in AFTER rendering starts
        if (user.role === 'technician') {
            setTimeout(() => switchTab('clockin'), 100);
        }
    }

    async function checkHealth() {
        const dot = document.getElementById('conn-dot');
        const text = document.getElementById('conn-text');
        const badge = document.getElementById('conn-badge');
        if (!dot || !text || !badge) return;

        try {
            const res = await API.getHealth();
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
            console.warn('Health check failed:', err);
        }
    }

    function switchTab(tabId) {
        currentTab = tabId;

        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById('tab-' + tabId);
        if (target) target.classList.remove('hidden');

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.className = 'nav-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
        });
        const activeNav = document.querySelector('.nav-btn[data-tab="' + tabId + '"]');
        if (activeNav) {
            activeNav.className = 'nav-btn px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center space-x-2 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm';
        }

        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.className = 'mobile-nav-btn flex-1 py-2 text-xs font-semibold text-center rounded-md text-slate-600 dark:text-slate-400';
        });
        const activeMobile = document.querySelector('.mobile-nav-btn[data-tab="' + tabId + '"]');
        if (activeMobile) {
            activeMobile.className = 'mobile-nav-btn flex-1 py-2 text-xs font-semibold text-center rounded-md bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm';
        }

        if (tabId === 'dashboard' && window.Dashboard && typeof Dashboard.refresh === 'function') {
            Dashboard.refresh();
            }
            if (tabId === 'clockin' && window.ClockIn) {
                if (typeof ClockIn.refresh === 'function') ClockIn.refresh();
                if (typeof ClockIn.start === 'function') ClockIn.start();
            }
            if (tabId === 'jobs' && window.Jobs) {
                if (typeof Jobs.render === 'function') Jobs.render();
                else if (typeof Jobs.refresh === 'function') Jobs.refresh();
            }
            if (tabId === 'logs' && window.Logs) {
                if (typeof Logs.render === 'function') Logs.render();
                else if (typeof Logs.refresh === 'function') Logs.refresh();
            }
        }

    function toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('cedar3_dark', isDark ? 'true' : 'false');
    }

    function logout() {
        if (!confirm('Sign out of Cedar3?')) return;
        if (healthTimer) clearInterval(healthTimer);
        if (dataTimer) clearInterval(dataTimer);
        API.logout();
    }

    // Boot
    function boot() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
    boot();

    return { switchTab, toggleDarkMode, logout, init };
})();