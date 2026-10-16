// ============================================
// Cedar3 - Shared Utilities
// ============================================

window.Utils = (function () {

    function formatDuration(totalSeconds) {
        totalSeconds = Math.max(0, Math.floor(totalSeconds || 0));
        var h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        var m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        var s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
        return h + ':' + m + ':' + s;
    }

    function secondsSince(isoString) {
        if (!isoString) return 0;
        return Math.max(Math.floor((Date.now() - new Date(isoString).getTime()) / 1000), 0);
    }

    function formatZAR(amount) {
        return 'R' + (Number(amount) || 0).toFixed(2);
    }

    function formatTime(isoString) {
        if (!isoString) return '-';
        var d = new Date(isoString);
        return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDateTime(isoString) {
        if (!isoString) return '-';
        var d = new Date(isoString);
        return d.toLocaleString('en-ZA', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function formatDate(isoString) {
        if (!isoString) return '-';
        var d = new Date(isoString);
        return d.toLocaleDateString('en-ZA', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    function esc(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toast(message, type, duration) {
        type = type || 'info';
        duration = duration || 3500;

        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none';
            document.body.appendChild(container);
        }

        var colors = {
            info:    'bg-slate-900 text-white',
            success: 'bg-emerald-600 text-white',
            error:   'bg-rose-600 text-white',
            warn:    'bg-amber-600 text-white'
        };
        var icons = {
            info:    'fa-circle-info',
            success: 'fa-circle-check',
            error:   'fa-circle-exclamation',
            warn:    'fa-triangle-exclamation'
        };

        var el = document.createElement('div');
        el.className = (colors[type] || colors.info) + ' px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center space-x-2 pointer-events-auto';
        el.style.transition = 'opacity 0.3s ease';
        el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><span>' + esc(message) + '</span>';
        container.appendChild(el);

        setTimeout(function () {
            el.style.opacity = '0';
            setTimeout(function () { el.remove(); }, 300);
        }, duration);
    }

    function exportToCSV(filename, rows) {
        if (!rows || !rows.length) return;
        var headers = Object.keys(rows[0]);
        var lines = [headers.join(',')];
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var line = headers.map(function (h) {
                var v = r[h] == null ? '' : String(r[h]);
                return '"' + v.replace(/"/g, '""') + '"';
            }).join(',');
            lines.push(line);
        }
        var csv = lines.join('\n');

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    return {
        formatDuration: formatDuration,
        secondsSince: secondsSince,
        formatZAR: formatZAR,
        formatTime: formatTime,
        formatDateTime: formatDateTime,
        formatDate: formatDate,
        esc: esc,
        toast: toast,
        showToast: toast,
        exportToCSV: exportToCSV
    };
})();