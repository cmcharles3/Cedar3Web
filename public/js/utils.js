// ============================================
// Cedar3 — Shared Utilities
// ============================================

window.Utils = (function () {

    // Format seconds as HH:MM:SS
    function formatDuration(totalSeconds) {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    // Seconds elapsed since ISO timestamp
    function secondsSince(isoString) {
        return Math.max(Math.floor((Date.now() - new Date(isoString).getTime()) / 1000), 0);
    }

    // Format ZAR currency
    function formatZAR(amount) {
        return 'R' + (Number(amount) || 0).toFixed(2);
    }

    // Format ISO date as local time (HH:MM)
    function formatTime(isoString) {
        if (!isoString) return '—';
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    }

    // Format ISO date as local date+time
    function formatDateTime(isoString) {
        if (!isoString) return '—';
        const d = new Date(isoString);
        return d.toLocaleString('en-ZA', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // Escape HTML (avoid injection when rendering user-supplied strings)
    function esc(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Toast notifications
    function toast(message, type = 'info', duration = 3500) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none';
            document.body.appendChild(container);
        }

        const colors = {
            info: 'bg-slate-900 text-white',
            success: 'bg-emerald-600 text-white',
            error: 'bg-rose-600 text-white',
            warn: 'bg-amber-600 text-white'
        };
        const icons = {
            info: 'fa-circle-info',
            success: 'fa-circle-check',
            error: 'fa-circle-exclamation',
            warn: 'fa-triangle-exclamation'
        };

        const el = document.createElement('div');
        el.className = `${colors[type] || colors.info} px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center space-x-2 pointer-events-auto toast-enter`;
        el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${esc(message)}</span>`;
        container.appendChild(el);

        setTimeout(() => {
            el.classList.remove('toast-enter');
            el.classList.add('toast-exit');
            setTimeout(() => el.remove(), 300);
        }, duration);
    }

    return { formatDuration, secondsSince, formatZAR, formatTime, formatDateTime, esc, toast };
})();