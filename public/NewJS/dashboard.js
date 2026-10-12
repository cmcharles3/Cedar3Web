const Dashboard = {
    async refresh() {
        const lastRefreshEl = document.getElementById('dashboard-last-refresh');
        if (lastRefreshEl) lastRefreshEl.innerText = `Updated: ${new Date().toLocaleTimeString()}`;
        
        this.renderStaffCards();
        this.renderActivityStream();
    },

    renderStaffCards() {
        const container = document.getElementById('dashboard-cards');
        if (!container) return;

        const staff = [
            { name: 'Lean', role: 'Receptionist / Printer Specialist', avatar: 'R', color: 'purple' },
            { name: 'Talent', role: 'Senior Systems Technician', avatar: 'T', color: 'emerald' },
            { name: 'Simba', role: 'Hardware Repair Specialist', avatar: 'S', color: 'sky' }
        ];

        const activeSessions = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_SESSIONS)) || {};

        container.innerHTML = staff.map(s => {
            const session = activeSessions[s.name];
            const isOnline = !!session;

            return `
                <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-${s.color}-100 dark:bg-${s.color}-950 text-${s.color}-600 dark:text-${s.color}-300 flex items-center justify-center font-extrabold text-base">
                                ${s.avatar}
                            </div>
                            <div>
                                <h3 class="font-bold text-slate-900 dark:text-white text-sm">${s.name}</h3>
                                <p class="text-[11px] text-slate-500">${s.role}</p>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${isOnline ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}">
                            ${isOnline ? 'ON SHIFT' : 'OFFLINE / IDLE'}
                        </span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl space-y-2 text-xs">
                        <div class="flex justify-between text-slate-500">
                            <span>Assigned Job:</span>
                            <span class="font-semibold text-slate-800 dark:text-slate-200">${session ? session.job : 'General Duty'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderActivityStream() {
        const stream = document.getElementById('dash-activity-feed');
        if (!stream) return;
        const jobs = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.JOBS)) || [];
        
        if (!jobs.length) {
            stream.innerHTML = `<p class="text-slate-400 italic">No activity logged today.</p>`;
            return;
        }

        stream.innerHTML = jobs.slice(-5).reverse().map(j => `
            <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                    <span class="font-bold text-emerald-600 dark:text-emerald-400">[${j.id}]</span>
                    <span class="font-medium text-slate-800 dark:text-slate-200">${j.device || j.model || 'Device'} - ${j.customer || j.clientName || 'Client'}</span>
                </div>
                <span class="text-[10px] text-slate-400">${j.status || 'Pending'}</span>
            </div>
        `).join('');
    }
};