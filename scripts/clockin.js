// ============================================
// Cedar3 — Clock-In Terminal
// ============================================

window.ClockIn = (function () {
    var mySession = null;
    var availableJobs = [];
    var tickHandle = null;
    var pollHandle = null;
    var started = false;

    var HOURLY_RATES = {
        reception: 5000 / 221,
        talent:    6000 / 221,
        simba:     4500 / 221
    };

    // ----------------------------------------
    // Panel rendering
    // ----------------------------------------
    function renderPanel() {
        var user = API.getUser();
        if (!user) return;

        var badge     = document.getElementById('clock-status-badge');
        var btnIn     = document.getElementById('btn-clock-in');
        var btnOut    = document.getElementById('btn-clock-out');
        var timerEl   = document.getElementById('session-timer');
        var earnedEl  = document.getElementById('session-earnings');
        var techSelect= document.getElementById('tech-select');
        var jobSelect = document.getElementById('job-select');
        var notesEl   = document.getElementById('task-notes');
        var greet     = document.getElementById('clock-greeting');
        var sinceEl   = document.getElementById('session-since');

        var earningsCard = document.getElementById('session-earnings-card');
        if (earningsCard) {
            if (user.role === 'admin') earningsCard.classList.remove('hidden');
            else earningsCard.classList.add('hidden');
        }

        if (greet) greet.textContent = user.displayName || user.username;

        // Populate staff select — locked to logged-in user
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

        // Populate job select]
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
                notesEl.placeholder = 'Describe what you did during this shift before clocking out...';
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

        if (sinceEl) {
            sinceEl.textContent = mySession
                ? 'Clocked in at ' + Utils.formatTime(mySession.clockInTime)
                : 'Not currently on shift';
        }
    }

    // ----------------------------------------
    // Quick jobs list (optional panel)
    // ----------------------------------------
    function renderJobsQuickList() {
        var container = document.getElementById('quick-jobs-container');
        if (!container) return;

        if (!availableJobs.length) {
            container.innerHTML = '<p class="text-xs text-slate-400 italic col-span-3 text-center py-6">No active jobs assigned. New intake tickets will appear here.</p>';
            return;
        }

        var html = '';
        var limit = Math.min(availableJobs.length, 9);
        for (var i = 0; i < limit; i++) {
            var j = availableJobs[i];
            html += '<div class="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">'
                + '<div class="min-w-0">'
                + '<span class="font-mono font-bold text-emerald-600">' + Utils.esc(j.id) + '</span>'
                + '<p class="font-bold text-slate-800 dark:text-slate-200 truncate">' + Utils.esc(j.device || '') + '</p>'
                + '<p class="text-[10px] text-slate-500 truncate">' + Utils.esc(j.customer || '') + '</p>'
                + '</div>'
                + '<span class="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap ml-2">'
                + Utils.esc(j.status || '') + '</span>'
                + '</div>';
        }
        container.innerHTML = html;
    }

    // ----------------------------------------
    // Live timer
    // ----------------------------------------
    function updateTimer() {
        if (!mySession) return;
        var timerEl = document.getElementById('session-timer');
        var earnedEl = document.getElementById('session-earnings');
        if (!timerEl) return;

        var secs = Utils.secondsSince(mySession.clockInTime);
        timerEl.textContent = Utils.formatDuration(secs);

        if (earnedEl) {
            var user = API.getUser();
            var rate = HOURLY_RATES[user.username] || 0;
            earnedEl.textContent = Utils.formatZAR((secs / 3600) * rate);
        }
    }

    // ----------------------------------------
    // Refresh from API
    // ----------------------------------------
    function refresh() {
        var user = API.getUser();
        if (!user) return;

        API.getSessions().then(function (sessRes) {
            if (sessRes.ok && sessRes.data) {
                mySession = sessRes.data[user.username] || null;
            } else {
                mySession = null;
            }
        }).then(function () {
            return API.getJobs();
        }).then(function (jobsRes) {
            if (jobsRes.ok && jobsRes.data) {
                availableJobs = jobsRes.data.filter(function (j) { return j.status !== 'Completed'; });
            } else {
                availableJobs = [];
            }

            renderPanel();
            renderJobsQuickList();
            if (mySession) updateTimer();
        });
    }

    // ----------------------------------------
    // Actions
    // ----------------------------------------
    function clockIn() {
        var jobSelect = document.getElementById('job-select');
        var jobId = jobSelect ? jobSelect.value : 'GENERAL';

        API.clockIn(jobId).then(function (res) {
            if (res.ok) {
                Utils.toast('Shift started successfully', 'success');
                refresh();
            } else {
                Utils.toast(res.error || 'Clock-in failed', 'error');
            }
        });
    }

    function clockOut() {
        var notesEl = document.getElementById('task-notes');
        var tasks = (notesEl ? notesEl.value : '').trim();

        if (!tasks) {
            Utils.toast('Please describe what you did before clocking out', 'warn');
            if (notesEl) notesEl.focus();
            return;
        }

        API.clockOut(tasks).then(function (res) {
            if (res.ok) {
                var log = res.data && res.data.log;
                var hours = log ? Number(log.hoursWorked).toFixed(2) : '?';
                Utils.toast('Shift logged: ' + hours + ' hrs', 'success');
                if (notesEl) notesEl.value = '';
                refresh();
            } else {
                Utils.toast(res.error || 'Clock-out failed', 'error');
            }
        });
    }

    // ----------------------------------------
    // Start the terminal
    // ----------------------------------------
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
        start: start,
        updateTimer: updateTimer,
        renderPanel: renderPanel
    };
})();