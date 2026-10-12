const App = {
    init() {
        this.bindEvents();
        this.switchTab('dashboard');
        
        ClockIn.init();
        Jobs.init();
        Logs.init();
        Dashboard.refresh();

        this.checkConnection();
    },

    bindEvents() {
        const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        }
    },

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        const activeTab = document.getElementById(`tab-${tabName}`);
        if (activeTab) activeTab.classList.remove('hidden');

        document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('bg-white', 'dark:bg-slate-800', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm');
            } else {
                btn.classList.remove('bg-white', 'dark:bg-slate-800', 'text-emerald-600', 'dark:text-emerald-400', 'shadow-sm');
            }
        });
    },

    toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    },

    checkConnection() {
        const dot = document.getElementById('conn-dot');
        const text = document.getElementById('conn-text');
        
        if (navigator.onLine) {
            if (dot) dot.className = 'w-1.5 h-1.5 rounded-full conn-online';
            if (text) text.innerText = 'Online / Active';
        } else {
            if (dot) dot.className = 'w-1.5 h-1.5 rounded-full conn-offline';
            if (text) text.innerText = 'Offline Mode';
        }
    },

    logout() {
        const pin = prompt("Enter Admin PIN (1234) to sign out:");
        if (pin === CONFIG.DEFAULT_ADMIN_PIN) {
            Utils.showToast("Signed out successfully.");
        } else {
            Utils.showToast("Incorrect Admin PIN.", "error");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());