// ============================================
// Cedar3 — Time Logs & Payroll
// ============================================

window.Logs = (function () {

    // Hourly rates (monthly salary / 221 working hours)
    var HOURLY_RATES = {
        reception: 5000 / 221,
        talent:    6000 / 221,
        simba:     4500 / 221
    };

    function getRate(username) {
        return HOURLY_RATES[username] || 0;
    }

    function getLogs() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIME_LOGS)) || [];
        } catch (e) {
            return [];
        }
    }

    function render() {
        var container = document.getElementById('logs-table-body');
        if (!container) return;

        var user = API.getUser();
        var isAdmin = user && user.role === 'admin';

        var logs = getLogs();
        if (!logs.length) {
            container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-4">No shift logs found.</p>';
            return;
        }

        var rowsHtml = '';
        for (var i = 0; i < logs.length; i++) {
            var l = logs[i];
            var emp = Utils.esc(l.emp || l.staff || '—');
            var start = Utils.esc(Utils.formatDateTime(l.startTime || l.clockIn) || '—');
            var end = Utils.esc(Utils.formatDateTime(l.endTime || l.clockOut) || '—');

            // Duration
            var hours = Number(l.duration || l.hoursWorked || 0);
            var seconds = Math.round(hours * 3600);
            var durationText = Utils.formatDuration(seconds);   // HH:MM:SS

            var notes = Utils.esc(l.notes || l.tasks || '—');

            // Value = hours * rate (computed here, not read from storage)
            var rate = getRate(l.emp || l.staff || '');
            var value = hours * rate;
            var valueText = 'R' + value.toFixed(2);

            rowsHtml += '<tr class="border-b border-slate-200 dark:border-slate-700 text-xs">'
                + '<td class="p-2.5 font-bold text-slate-900 dark:text-white">' + emp + '</td>'
                + '<td class="p-2.5">' + start + '</td>'
                + '<td class="p-2.5">' + end + '</td>'
                + '<td class="p-2.5 font-mono">' + durationText + '</td>'
                + '<td class="p-2.5 max-w-xs truncate">' + notes + '</td>';

            if (isAdmin) {
                rowsHtml += '<td class="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">' + valueText + '</td>';
            }

            rowsHtml += '</tr>';
        }

        var exportBtn = isAdmin
            ? '<div class="flex justify-end mb-3">'
            +   '<button onclick="Logs.exportCSV()" class="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-emerald-100 transition">'
            +     '<i class="fa-solid fa-file-csv"></i> Export CSV'
            +   '</button>'
            + '</div>'
            : '';

        var valueHeader = isAdmin ? '<th class="p-2.5 text-right">Value (ZAR)</th>' : '';

        container.innerHTML = exportBtn
            + '<div class="overflow-x-auto">'
            +   '<table class="w-full text-left text-xs border-collapse">'
            +     '<thead>'
            +       '<tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 font-bold text-slate-600 dark:text-slate-400">'
            +         '<th class="p-2.5">Staff</th>'
            +         '<th class="p-2.5">Clock In</th>'
            +         '<th class="p-2.5">Clock Out</th>'
            +         '<th class="p-2.5">Duration</th>'
            +         '<th class="p-2.5">Work Notes</th>'
            +         valueHeader
            +       '</tr>'
            +     '</thead>'
            +     '<tbody>' + rowsHtml + '</tbody>'
            +   '</table>'
            + '</div>';
    }

    function exportCSV() {
        var logs = getLogs();
        if (!logs.length) {
            Utils.toast('No time logs to export', 'error');
            return;
        }

        // Build enriched rows for export
        var rows = logs.map(function (l) {
            var hours = Number(l.duration || l.hoursWorked || 0);
            var rate = getRate(l.emp || l.staff || '');
            return {
                Staff:    l.emp || l.staff || '',
                ClockIn:  l.startTime || l.clockIn || '',
                ClockOut: l.endTime   || l.clockOut || '',
                Duration: Utils.formatDuration(Math.round(hours * 3600)),
                Notes:    l.notes     || l.tasks || '',
                ValueZAR: (hours * rate).toFixed(2)
            };
        });

        if (typeof Utils.exportToCSV === 'function') {
            Utils.exportToCSV('Cedar3_TimeLogs_' + new Date().toISOString().slice(0, 10) + '.csv', rows);
        } else {
            Utils.toast('CSV export not available', 'error');
        }
    }

    function init() {
        render();
    }

    return {
        init: init,
        getLogs: getLogs,
        render: render,
        refresh: render,
        exportCSV: exportCSV
    };
})();