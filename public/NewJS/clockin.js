const ClockIn = {
    timerInterval: null,

    init() {
        const techSelect = document.getElementById('tech-select');
        if (techSelect) {
            techSelect.innerHTML = `
                <option value="Talent">Talent (Technician)</option>
                <option value="Simba">Simba (Technician)</option>
                <option value="Receptionist">Lean (Receptionist)</option>
            `;
        }
        this.updateSessionUI();
    },

    clockIn() {
        const tech = document.getElementById('tech-select').value;
        const job = document.getElementById('job-select').value;
        const sessions = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_SESSIONS)) || {};

        sessions[tech] = {
            startTime: new Date().toISOString(),
            job: job
        };

        localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(sessions));
        Utils.showToast(`${tech} clocked in successfully.`);
        this.updateSessionUI();
        Dashboard.refresh();
    },

    clockOut() {
        const tech = document.getElementById('tech-select').value;
        const notes = document.getElementById('task-notes').value;
        const sessions = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_SESSIONS)) || {};

        if (!sessions[tech]) {
            Utils.showToast(`No active session found for ${tech}`, 'error');
            return;
        }

        const session = sessions[tech];
        const endTime = new Date().toISOString();
        const durationHours = ((new Date(endTime) - new Date(session.startTime)) / 3600000).toFixed(2);
        
        const log = {
            emp: tech,
            startTime: session.startTime,
            endTime: endTime,
            duration: durationHours,
            notes: notes || 'General maintenance completed',
            value: (durationHours * (CONFIG.HOURLY_RATES[tech] || 100)).toFixed(2)
        };

        let logs = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIME_LOGS)) || [];
        logs.push(log);
        localStorage.setItem(CONFIG.STORAGE_KEYS.TIME_LOGS, JSON.stringify(logs));

        delete sessions[tech];
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_SESSIONS, JSON.stringify(sessions));

        document.getElementById('task-notes').value = '';
        Utils.showToast(`${tech} clocked out successfully.`);
        this.updateSessionUI();
        Dashboard.refresh();
    },

    updateSessionUI() {
        const tech = document.getElementById('tech-select')?.value;
        const sessions = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_SESSIONS)) || {};
        const active = tech && sessions[tech];

        const btnIn = document.getElementById('btn-clock-in');
        const btnOut = document.getElementById('btn-clock-out');
        const notes = document.getElementById('task-notes');
        const statusBadge = document.getElementById('clock-status-badge');

        if (btnIn) btnIn.disabled = !!active;
        if (btnOut) btnOut.disabled = !active;
        if (notes) notes.disabled = !active;

        if (statusBadge) {
            statusBadge.innerText = active ? "SHIFT ACTIVE" : "READY TO CLOCK IN";
            statusBadge.className = active 
                ? "px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800" 
                : "px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600";
        }
    }
};