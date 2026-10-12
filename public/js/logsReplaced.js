// ============================================
// Cedar3 — Time Logs & Payroll
// ============================================

window.Logs = (function () {
    var allLogs = [];

    function rowHTML(log, isAdmin) {
        var valueDisplay = isAdmin
            ? Utils.formatZAR(log.earnedAmount || 0)
            : '••••••';

        return ''
            + '<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">'
            +   '<td class="p-3 font-bold text-slate-800 dark:text-slate-200">' + Utils.esc(log.employee || '—') + '</td>'
            +   '<td class="p-3 text-slate-500 font-mono text-[11px]">' + Utils.formatDateTime(log.clockIn) + '</td>'
            +   '<td class="p-3 text-slate-500 font-mono text-[11px]">' + Utils.formatDateTime(log.clockOut) + '</td>'
            +   '<td class="p-3 font-mono font-bold text-emerald-600">' + Number(log.hoursWorked || 0).toFixed(2) + ' hrs</td>'
            +   '<td class="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px] max-w-md truncate" title="' + Utils.esc(log.tasks || '') + '">' + Utils.esc(log.tasks || '') + '</td>'
            +   '<td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">' + valueDisplay + '</td>'
            + '</tr>';
    }

    function render() {
        var user = API.getUser();
        var isAdmin = user && user.role === 'admin';

        var searchEl = document.getElementById('log-search');
        var filterEl = document.getElementById('log-tech-filter');
        var search = (searchEl ? searchEl.value : '').toLowerCase();
        var filterTech = filterEl ? filterEl.value : 'ALL';

        var filtered = [];
        for (var i = 0; i < allLogs.length; i++) {
            var log = allLogs[i];
            var matchSearch = !search
                || (log.employee || '').toLowerCase().indexOf(search) !== -1
                || (log.tasks || '').toLowerCase().indexOf(search) !== -1;
            var matchTech = filterTech === 'ALL' || log.employee === filterTech;
            if (matchSearch && matchTech) filtered.push(log);
        }

        var tbody = document.getElementById('logs-table-body');
        var totalEl = document.getElementById('logs-total-value');
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400 italic">No shift time logs recorded yet.</td></tr>';
            if (totalEl) totalEl.textContent = isAdmin ? 'R0.00' : '••••••';
            return;
        }

        var total = 0;
        var html = '';
        for (var j = 0; j < filtered.length; j++) {
            total += Number(filtered[j].earnedAmount || 0);
            html += rowHTML(filtered[j], isAdmin);
        }
        tbody.innerHTML = html;

        if (totalEl) totalEl.textContent = isAdmin ? Utils.formatZAR(total) : '••••••';
    }

    async function refresh() {
    var user = API.getUser();
    var isAdmin = user && user.role === 'admin';

    // Hide export button for techs
    var exportBtn = document.getElementById('btn-export-logs');
    if (exportBtn) {
        if (isAdmin) exportBtn.classList.remove('hidden');
        else exportBtn.classList.add('hidden');
    }

    // Hide "Clear History" button for techs (if you have one)
    var clearBtn = document.getElementById('btn-clear-logs');
    if (clearBtn) {
        if (isAdmin) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    var res = await API.getLogs(true);
    if (!res.ok) {
        Utils.toast('Failed to load logs', 'error');
        return;
    }

    async function refresh() {
        var res = await API.getLogs(true);
        if (!res.ok) {
            Utils.toast('Failed to load logs', 'error');
            return;
        }
        allLogs = res.data || [];
        render();
    }

        function exportCSV() {
        var user = API.getUser();
        if (!user || user.role !== 'admin') {
            Utils.toast('Only admins can export payroll', 'error');
            return;
        }
    
    }
        var user = API.getUser();
        var isAdmin = user && user.role === 'admin';

        var headers = ['ID', 'Employee', 'Clock In', 'Clock Out', 'Hours Worked', 'Tasks', 'Earned (ZAR)'];
        var rows = [headers.join(',')];

        for (var i = 0; i < allLogs.length; i++) {
            var l = allLogs[i];
            var tasks = (l.tasks || '').replace(/"/g, '""').replace(/\n/g, ' ');
            rows.push([
                l.id || '',
                '"' + (l.employee || '') + '"',
                '"' + (l.clockIn || '') + '"',
                '"' + (l.clockOut || '') + '"',
                Number(l.hoursWorked || 0).toFixed(2),
                '"' + tasks + '"',
                isAdmin ? Number(l.earnedAmount || 0).toFixed(2) : ''
            ].join(','));
        }

        var blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Cedar3_Time_Logs_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Utils.toast('CSV exported', 'success');
    }

    return { refresh: refresh, render: render, exportCSV: exportCSV };
})();