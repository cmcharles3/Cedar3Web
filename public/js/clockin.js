// ============================================
// Cedar3 — Clock-In Terminal
// ============================================

window.ClockIn = (function () {
    var mySession = null;
    var availableJobs = [];
    var tickHandle = null;
    var pollHandle = null;
    var started = false;

    var HOURLY_RATES = { reception: 5000 / 221, talent: 6000 / 221, simba: 4500 / 221 };

    function renderPanel() {
        var user = API.getUser();
        if (!user) return;

        var badge = document.getElementById('clock-status-badge');
        var btnIn = document.getElementById('btn-clock-in');
        var btnOut = document.getElementById('btn-clock-out');
        var timerEl = document.getElementById('session-timer');
        var earnedEl = document.getElementById('session-earnings');
        var techSelect = document.getElementById('tech-select');
        var jobSelect = document.getElementById('job-select');
        var notesEl = document.getElementById('task-notes');
        var greet = document.getElementById('clock-greeting');

        // Hide earnings card entirely for technicians
        var earningsCard = document.getElementById('session-earnings-card');
        if (earningsCard) {
            if (user.role === 'admin') {
                earningsCard.classList.remove('hidden');
            } else {
                earningsCard.classList.add('hidden');
            }
}

        // Greeting
        if (greet) greet.textContent = user.displayName || user.username;

        // Staff select — locked to logged-in user
        if (techSelect) {
            techSelect.innerHTML = '';
            var opt = document.createElement('option');
            opt.value = user.username;
            opt.textContent = (user.displayName || user.username)
                + (user.role === 'admin' ? ' (Admin view)' : ' (Technician)');
            opt.selected = true;
            techSelect.appendChild(opt);
            techSelect.disabled = true;
        }

        // Job select
        if (jobSelect) {
            var prevVal = jobSelect.value;
            jobSelect.innerHTML = '<option value="GENERAL">-- General Workshop Duty --</option>';
            for (var i = 0; i < availableJobs.length; i++) {
                var j = availableJobs[i];
                var o = document.createElement('option');
                o.value = j.id;
                o.textContent = '[' + j.id + '] ' + (j.device || 'Untitled');
                jobSelect.appendChild(o);
            }
            if (prevVal && jobSelect.querySelector('option[value="' + prevVal + '"]')) {
                jobSelect.value = prevVal;
            }
        }

        // Buttons + status
        if (mySession) {
            if (badge) {
                badge.textContent = 'CLOCKED IN';
                badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 animate-pulse';
            }
            if (btnIn) {
                btnIn.disabled = true;
                btnIn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            if (btnOut) {
                btnOut.disabled = false;
                btnOut.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            if (jobSelect) {
                jobSelect.disabled = true;
                jobSelect.value = mySession.jobId;
            }
            if (notesEl) {
                notesEl.disabled = false;
                notesEl.placeholder = 'Describe what you did during this shift before clocking out...\n- e.g. Cleared paper jam on Epson L3150\n- Called Mr. Khumalo re: PSU approval';
            }
        } else {
            if (badge) {
                badge.textContent = 'READY TO CLOCK IN';
                badge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
            }
            if (btnIn) {
                btnIn.disabled = false;
                btnIn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            if (btnOut) {
                btnOut.disabled = true;
                btnOut.classList.add('opacity-50', 'cursor-not-allowed');
            }
            if (jobSelect) jobSelect.disabled = false;
            if (notesEl) {
                notesEl.disabled = true;
                notesEl.placeholder = 'Notes are enabled once you clock in.';
                notesEl.value = '';
            }
            if (timerEl) timerEl.textContent = '00:00:00';
            if (earnedEl) earnedEl.textContent = 'R0.00';
        }

        // "Session since" line
        var sinceEl = document.getElementById('session-since');
        if (sinceEl) {
            sinceEl.textContent = mySession
                ? 'Clocked in at ' + Utils.formatTime(mySession.clockInTime)
                : 'Not currently on shift';
        }
    }

    function renderJobsQuickList() {
        var container = document.getElementById('quick-jobs-container');
        if (!container) return;

        if (availableJobs.length === 0) {
            container.innerHTML = '<p class="text-xs text-slate-400 italic col-span-3 text-center py-6">No active jobs assigned to you. New intake tickets will appear here.</p>';
            return;
        }

        var html = '';
        var limit = Math.min(availableJobs.length, 9);
        for (var i = 0; i < limit; i++) {
            var j = availableJobs[i];
            html += ''
                + '<div class="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">'
                +   '<div class="min-w-0">'
                +     '<span class="font-mono font-bold text-emerald-600">' + Utils.esc(j.id) + '</span>'
                +     '<p class="font-bold text-slate-800 dark:text-slate-200 truncate">' + Utils.esc(j.device || '') + '</p>'
                +     '<p class="text-[10px] text-slate-500 truncate">' + Utils.esc(j.customer || '') + '</p>'
                +   '</div>'
                +   '<span class="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap ml-2">'
                +     Utils.esc(j.status || '')
                +   '</span>'
                + '</div>';
        }
        container.innerHTML = html;
    }

    function updateTimer() {
        if (!mySession) return;
        var timerEl = document.getElementById('session-timer');
        var earnedEl = document.getElementById('session-earnings');
        if (!timerEl || !earnedEl) return;

        var secs = Utils.secondsSince(mySession.clockInTime);
        timerEl.textContent = Utils.formatDuration(secs);

        var user = API.getUser();
        var rate = HOURLY_RATES[user.username] || 0;
        earnedEl.textContent = Utils.formatZAR((secs / 3600) * rate);
    }

    async function refresh() {
        var user = API.getUser();
        if (!user) {
            console.warn('[ClockIn] No user in session');
            return;
        }

        // Fetch my session (server filters automatically for techs;
        // admins get everything, so slice to my own)
        var sessRes = await API.getSessions(false);
        if (sessRes.ok && sessRes.data) {
            if (user.role === 'admin') {
                // Admin sees all sessions — grab own if present
                mySession = sessRes.data[user.username] || null;
            } else {
                mySession = sessRes.data[user.username] || null;
            }
        } else {
            mySession = null;
        }

        // Fetch my jobs
        var jobsRes = await API.getJobs(false);
        if (jobsRes.ok && jobsRes.data) {
            var filtered = [];
            for (var i = 0; i < jobsRes.data.length; i++) {
                if (jobsRes.data[i].status !== 'Completed') filtered.push(jobsRes.data[i]);
            }
            availableJobs = filtered;
        } else {
            availableJobs = [];
        }

        // Always render — cheap and eliminates state-sync bugs
        renderPanel();
        renderJobsQuickList();

        if (mySession) updateTimer();
    }

    async function clockIn() {
        var jobSelect = document.getElementById('job-select');
        var jobId = jobSelect ? jobSelect.value : 'GENERAL';

        var res = await API.clockIn(jobId);
        if (res.ok) {
            Utils.toast('Shift started successfully', 'success');
            await refresh();
        } else {
            var msg = (res.data && res.data.error) || res.error || 'Clock-in failed';
            Utils.toast(msg, 'error');
        }
    }

    async function clockOut() {
        var notesEl = document.getElementById('task-notes');
        var tasks = (notesEl ? notesEl.value : '').trim();

        if (!tasks) {
            Utils.toast('Please describe what you did before clocking out', 'warn');
            if (notesEl) notesEl.focus();
            return;
        }

        var res = await API.clockOut(tasks);
        if (res.ok) {
            var log = res.data && res.data.log;
            var hours = log ? Number(log.hoursWorked).toFixed(2) : '?';
            Utils.toast('Shift logged: ' + hours + ' hrs', 'success');
            if (notesEl) notesEl.value = '';
            await refresh();
        } else {
            var msg = (res.data && res.data.error) || res.error || 'Clock-out failed';
            Utils.toast(msg, 'error');
        }
    }

    function start() {
        if (started) return;
        started = true;

        refresh();

        if (tickHandle) clearInterval(tickHandle);
        tickHandle = setInterval(updateTimer, 1000);

        if (pollHandle) clearInterval(pollHandle);
        pollHandle = setInterval(refresh, 5000);
    }

    return {
        refresh: refresh,
        clockIn: clockIn,
        clockOut: clockOut,
        start: start
    };
})();