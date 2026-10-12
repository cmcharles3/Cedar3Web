const Logs = {
    init() {
        this.render();
    },

    getLogs() {
        return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIME_LOGS)) || [];
    },

    render() {
        const container = document.getElementById('logs-table-body');
        if (!container) return;

        const logs = this.getLogs();
        if (!logs.length) {
            container.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400 italic">No shift logs found.</td></tr>`;
            return;
        }

        container.innerHTML = logs.map(l => `
            <tr class="border-b border-slate-200 dark:border-slate-700 text-xs">
                <td class="p-3 font-bold">${l.emp}</td>
                <td class="p-3">${Utils.formatDate(l.startTime)}</td>
                <td class="p-3">${Utils.formatDate(l.endTime)}</td>
                <td class="p-3 font-mono">${l.duration} hrs</td>
                <td class="p-3 max-w-xs truncate">${l.notes}</td>
                <td class="p-3 text-right font-bold text-emerald-600">${Utils.formatCurrency(l.value)}</td>
            </tr>
        `).join('');
    },

    exportCSV() {
        const logs = this.getLogs();
        if (!logs.length) {
            Utils.showToast("No time logs to export", "error");
            return;
        }
        Utils.exportToCSV(`Cedar3_TimeLogs_${new Date().toISOString().slice(0,10)}.csv`, logs);
    }
};