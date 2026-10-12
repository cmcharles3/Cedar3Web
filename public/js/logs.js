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
            container.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">No shift logs found.</p>`;
            return;
        }

        container.innerHTML = `
            <div class="flex justify-end mb-3">
                <button onclick="Logs.exportCSV()" class="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-emerald-100 transition">
                    <i class="fa-solid fa-file-csv"></i> Export CSV
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 font-bold text-slate-600 dark:text-slate-400">
                            <th class="p-2.5">Staff</th>
                            <th class="p-2.5">Clock In</th>
                            <th class="p-2.5">Clock Out</th>
                            <th class="p-2.5">Duration</th>
                            <th class="p-2.5">Work Notes</th>
                            <th class="p-2.5 text-right">Value (ZAR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(l => `
                            <tr class="border-b border-slate-200 dark:border-slate-700 text-xs">
                                <td class="p-2.5 font-bold text-slate-900 dark:text-white">${l.emp || l.staff || '—'}</td>
                                <td class="p-2.5">${window.Utils ? Utils.formatDate(l.startTime || l.clockIn) : (l.startTime || l.clockIn)}</td>
                                <td class="p-2.5">${window.Utils ? Utils.formatDate(l.endTime || l.clockOut) : (l.endTime || l.clockOut)}</td>
                                <td class="p-2.5 font-mono">${parseFloat(l.duration || l.hoursWorked || 0).toFixed(2)} hrs</td>
                                <td class="p-2.5 max-w-xs truncate">${l.notes || l.tasks || '—'}</td>
                                <td class="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">R${parseFloat(l.value || l.earnedAmount || 0).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    exportCSV() {
        const logs = this.getLogs();
        if (!logs.length) {
            if (window.Utils) Utils.showToast("No time logs to export", "error");
            else alert("No time logs to export.");
            return;
        }

        if (window.Utils && typeof Utils.exportToCSV === 'function') {
            Utils.exportToCSV(`Cedar3_TimeLogs_${new Date().toISOString().slice(0, 10)}.csv`, logs);
        } else {
            // Standalone CSV export fallback
            const headers = ["Staff", "Clock In", "Clock Out", "Duration (hrs)", "Notes", "Value (ZAR)"];
            const rows = logs.map(l => [
                `"${l.emp || l.staff || ''}"`,
                `"${l.startTime || l.clockIn || ''}"`,
                `"${l.endTime || l.clockOut || ''}"`,
                `"${l.duration || l.hoursWorked || 0}"`,
                `"${(l.notes || l.tasks || '').replace(/"/g, '""')}"`,
                `"${l.value || l.earnedAmount || 0}"`
            ]);

            const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Cedar3_TimeLogs_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
    }
};

// Global alias window mapping to prevent 'exportCSV is not defined' error
window.exportCSV = function() {
    Logs.exportCSV();
};