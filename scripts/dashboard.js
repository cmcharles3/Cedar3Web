// ============================================
// Cedar3 — Dashboard Tab (Admin Remote Monitoring)
// ============================================

window.Dashboard = (function () {
    var TECH_ORDER = ['reception', 'talent', 'simba'];
    var TECH_META = {
        reception: { display: 'Receptionist', sub: 'Intake, Client Calls & Printer Tech', color: 'purple', initial: 'R' },
        talent:    { display: 'Talent',       sub: 'Senior Systems Technician',            color: 'emerald', initial: 'T' },
        simba:     { display: 'Simba',        sub: 'Hardware Repair Specialist',           color: 'blue',    initial: 'S' }
    };
    var HOURLY_RATES = { reception: 5000 / 221, talent: 6000 / 221, simba: 4500 / 221 };

    var lastAuditTopTs = null;
    var tickHandle = null;

    function getHourlyRate(t) { return HOURLY_RATES[t] || 0; }

    function techCardHTML(username, meta, session) {
        var isActive = !!session;
        var statusText = isActive ? 'CLOCKED IN' : 'OFFLINE / IDLE';
        var statusClass = isActive
            ? 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 animate-pulse'
            : 'px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
        var jobLabel = isActive
            ? (session.jobId === 'GENERAL' ? 'Front Desk & General Duty' : session.jobId)
            : 'General Duty';

        return ''
            + '<div class="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm" data-tech="' + username + '">'
            +   '<div class="flex justify-between items-start mb-4">'
            +     '<div class="flex items-center space-x-3">'
            +       '<div class="w-10 h-10 rounded-xl bg-' + meta.color + '-100 dark:bg-' + meta.color + '-900/50 text-' + meta.color + '-600 dark:text-' + meta.color + '-400 font-bold flex items-center justify-center text-lg">'
            +         meta.initial
            +       '</div>'
            +       '<div>'
            +         '<h3 class="font-bold text-slate-900 dark:text-white">' + meta.display + '</h3>'
            +         '<p class="text-xs text-slate-500">' + meta.sub + '</p>'
            +       '</div>'
            +     '</div>'
            +     '<span class="' + statusClass + '" data-role="status">' + statusText + '</span>'
            +   '</div>'
            +   '<div class="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">'
            +     '<div class="flex justify-between items-center text-xs gap-3">'
            +       '<span class="text-slate-500 shrink-0">Active Shift Timer:</span>'
            +       '<span id="dash-timer-' + username + '" class="font-mono font-bold text-base text-slate-800 dark:text-slate-200">00:00:00</span>'
            +     '</div>'
            +     '<div class="flex justify-between items-center text-xs gap-3">'
            +       '<span class="text-slate-500 shrink-0">Assigned Job:</span>'
            +       '<span id="dash-job-' + username + '" class="font-medium text-slate-700 dark:text-slate-300 text-right">' + jobLabel + '</span>'
            +     '</div>'
            +     '<div class="flex justify-between items-center text-xs gap-3">'
            +       '<span class="text-slate-500 shrink-0">Session Value:</span>'
            +       '<span id="dash-earned-' + username + '" class="font-bold text-emerald-600 dark:text-emerald-400">R0.00</span>'
            +     '</div>'
            +   '</div>'
            +   '<div class="mt-4 flex justify-between items-center">'
            +     '<span class="text-[11px] text-slate-400">'
            +       '<i class="fa-solid fa-wifi ' + (isActive ? 'text-emerald-500' : 'text-slate-400') + ' mr-1"></i>'
            +       (isActive ? 'Active' : 'Standby')
            +     '</span>'
            +     '<button onclick="Dashboard.forceClockOut(\'' + username + '\')" data-role="force-btn" class="' + (isActive ? '' : 'hidden') + ' text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold px-3 py-1.5 rounded-lg transition">'
            +       'Remote Clock Out'
            +     '</button>'
            +   '</div>'
            + '</div>';
    }

    async function refresh() {
        var user = API.getUser();

        // Technicians get a friendly message instead of the multi-tech view
        if (!user || user.role !== 'admin') {
            var container0 = document.getElementById('dashboard-cards');
            if (container0) {
                container0.innerHTML = ''
                    + '<div class="lg:col-span-3 bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center">'
                    +   '<i class="fa-solid fa-user-gear text-4xl text-emerald-500 mb-3"></i>'
                    +   '<h3 class="font-bold text-lg text-slate-900 dark:text-white">Technician Mode</h3>'
                    +   '<p class="text-sm text-slate-500 mt-1">Remote monitoring is admin-only. Use the <strong>Tech Clock-In</strong> tab for your shift.</p>'
                    +   '<button onclick="App.switchTab(\'clockin\')" class="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg">Go to Clock-In</button>'
                    + '</div>';
            }
            refreshActivity();
            return;
        }

        var res = await API.getSessions(true);
        if (!res.ok) {
            console.warn('Failed to load sessions:', res);
            return;
        }

        var sessions = res.data || {};

        // Always render cards (cheap - 3 divs). Avoids stale-detection bugs.
        var container = document.getElementById('dashboard-cards');
        if (container) {
            var html = '';
            for (var i = 0; i < TECH_ORDER.length; i++) {
                var t = TECH_ORDER[i];
                html += techCardHTML(t, TECH_META[t], sessions[t]);
            }
            container.innerHTML = html;
        }

        // Update live timer values
        for (var j = 0; j < TECH_ORDER.length; j++) {
            var tech = TECH_ORDER[j];
            var s = sessions[tech];
            var timerEl = document.getElementById('dash-timer-' + tech);
            var earnedEl = document.getElementById('dash-earned-' + tech);
            var jobEl = document.getElementById('dash-job-' + tech);
            if (!timerEl) continue;

            if (s) {
                var secs = Utils.secondsSince(s.clockInTime);
                timerEl.textContent = Utils.formatDuration(secs);
                if (earnedEl) earnedEl.textContent = Utils.formatZAR((secs / 3600) * getHourlyRate(tech));
                if (jobEl) jobEl.textContent = (s.jobId === 'GENERAL') ? 'Front Desk & General Duty' : s.jobId;
            } else {
                timerEl.textContent = '00:00:00';
                if (earnedEl) earnedEl.textContent = 'R0.00';
                if (jobEl) jobEl.textContent = 'General Duty';
            }
        }

        var refreshEl = document.getElementById('dashboard-last-refresh');
        if (refreshEl) refreshEl.textContent = 'Updated ' + Utils.formatTime(new Date().toISOString());

        refreshActivity();
    }

    async function refreshActivity() {
        var user = API.getUser();

        // Audit feed is admin-only
        if (!user || user.role !== 'admin') {
            var feed0 = document.getElementById('dash-activity-feed');
            var countEl0 = document.getElementById('activity-count');
            if (countEl0) countEl0.textContent = 'admin only';
            if (feed0) {
                feed0.innerHTML = '<p class="text-slate-400 italic"><i class="fa-solid fa-lock mr-1"></i>Activity stream is visible to administrators only.</p>';
            }
            return;
        }

        var res = await API.getAudit(50);
        if (!res.ok) {
            console.warn('Failed to load audit log:', res);
            return;
        }

        var entries = res.data || [];
        var feed = document.getElementById('dash-activity-feed');
        var countEl = document.getElementById('activity-count');
        if (!feed) return;
        if (countEl) countEl.textContent = entries.length + ' recent events';

        if (entries.length === 0) {
            feed.innerHTML = '<p class="text-slate-400 italic">No recent activity.</p>';
            return;
        }

        var topTs = entries[0] && entries[0].ts;
        if (topTs === lastAuditTopTs) return;
        lastAuditTopTs = topTs;

        var html = '';
        for (var i = 0; i < entries.length; i++) {
            var e = entries[i];
            var icon = auditIcon(e.action);
            var color = auditColor(e.action);
            var actor = Utils.esc(e.actor);
            var action = Utils.esc(e.action);
            var detail = auditDetail(e);
            html += ''
                + '<div class="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">'
                +   '<i class="fa-solid ' + icon + ' ' + color + ' mt-0.5"></i>'
                +   '<div class="flex-1 min-w-0">'
                +     '<p class="font-semibold text-slate-800 dark:text-slate-200">'
                +       '<span class="font-mono text-emerald-600 dark:text-emerald-400">' + actor + '</span>'
                +       '<span class="mx-1">·</span>'
                +       '<span>' + action + '</span>'
                +     '</p>'
                +     (detail ? '<p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono truncate">' + detail + '</p>' : '')
                +   '</div>'
                +   '<span class="text-[10px] font-mono text-slate-400 whitespace-nowrap">' + Utils.formatTime(e.ts) + '</span>'
                + '</div>';
        }
        feed.innerHTML = html;
    }

    function auditIcon(action) {
        var map = {
            LOGIN: 'fa-right-to-bracket',
            LOGIN_FAILED: 'fa-triangle-exclamation',
            LOGOUT: 'fa-right-from-bracket',
            CLOCK_IN: 'fa-play',
            CLOCK_OUT: 'fa-stop',
            JOB_CREATED: 'fa-plus-circle',
            JOB_UPDATED: 'fa-pen-to-square',
            LOG_CREATED: 'fa-file-lines',
            ADMIN_FORCE_ACTION: 'fa-user-shield'
        };
        return map[action] || 'fa-circle-dot';
    }

    function auditColor(action) {
        if (action.indexOf('FAILED') !== -1) return 'text-rose-500';
        if (action === 'CLOCK_IN') return 'text-emerald-500';
        if (action === 'CLOCK_OUT') return 'text-slate-500';
        if (action.indexOf('ADMIN') === 0) return 'text-amber-500';
        if (action.indexOf('JOB') === 0) return 'text-blue-500';
        if (action === 'LOGIN') return 'text-emerald-500';
        return 'text-slate-400';
    }

    function auditDetail(e) {
        var d = e.details || {};
        var parts = [];
        if (d.jobId) parts.push('job: ' + d.jobId);
        if (d.hours) parts.push('hours: ' + Number(d.hours).toFixed(2));
        if (d.target) parts.push('target: ' + d.target);
        if (d.customer) parts.push('client: ' + d.customer);
        if (d.reason) parts.push('reason: ' + d.reason);
        return parts.length ? Utils.esc(parts.join(' · ')) : '';
    }

    async function forceClockOut(tech) {
        var meta = TECH_META[tech];
        if (!confirm('Force-clock-out ' + (meta ? meta.display : tech) + '?')) return;

        var res = await API.forceClockOut(tech);
        if (res.ok) {
            Utils.toast('Remote clock-out complete for ' + (meta ? meta.display : tech), 'success');
            refresh();
        } else {
            Utils.toast(res.error || 'Force clock-out failed', 'error');
        }
    }

    function startTicker() {
        if (tickHandle) return;
        tickHandle = setInterval(async function () {
            var user = API.getUser();
            if (!user || user.role !== 'admin') return;
            var res = await API.getSessions(true);
            if (!res.ok) return;
            var sessions = res.data || {};
            for (var i = 0; i < TECH_ORDER.length; i++) {
                var t = TECH_ORDER[i];
                var s = sessions[t];
                if (!s) continue;
                var timerEl = document.getElementById('dash-timer-' + t);
                var earnedEl = document.getElementById('dash-earned-' + t);
                if (timerEl) {
                    var secs = Utils.secondsSince(s.clockInTime);
                    timerEl.textContent = Utils.formatDuration(secs);
                    if (earnedEl) earnedEl.textContent = Utils.formatZAR((secs / 3600) * getHourlyRate(t));
                }
            }
        }, 1000);
    }

    return {
        refresh: refresh,
        refreshActivity: refreshActivity,
        forceClockOut: forceClockOut,
        startTicker: startTicker,
        TECH_ORDER: TECH_ORDER
    };
})();