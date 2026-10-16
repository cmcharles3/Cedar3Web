// ============================================
// Cedar3 — Jobs Kanban Board
// Full featured: create, edit, delete, S/N lookup
// ============================================

window.Jobs = (function () {

    function getJobs() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.JOBS)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveJobs(jobs) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.JOBS, JSON.stringify(jobs));
        render();
    }

    // ----------------------------------------
    // New Job modal
    // ----------------------------------------
    function openCreate() {
        var modal = document.getElementById('modal-job');
        if (modal) {
            modal.classList.remove('hidden');
        } else {
            console.error("Modal element '#modal-job' not found in DOM.");
        }
    }

    function openJobModal() {
        openCreate();
    }

    function closeJobModal() {
        var modal = document.getElementById('modal-job');
        if (modal) modal.classList.add('hidden');
    }

    // ----------------------------------------
    // Save new job ticket
    // ----------------------------------------
    function saveJob(e) {
        if (e) e.preventDefault();

        var customerEl = document.getElementById('job-customer');
        var phoneEl    = document.getElementById('job-phone');
        var deviceEl   = document.getElementById('job-device');
        var snEl       = document.getElementById('job-sn');
        var cablesEl   = document.getElementById('job-cables');
        var faultsEl   = document.getElementById('job-faults');
        var techEl     = document.getElementById('job-assigned-tech');
        var statusEl   = document.getElementById('job-status');
        var costEl     = document.getElementById('job-cost');

        var newJob = {
            id:       'JOB-' + Math.floor(100 + Math.random() * 900),
            customer: customerEl ? customerEl.value : '',
            phone:    phoneEl    ? phoneEl.value    : '',
            device:   deviceEl   ? deviceEl.value   : '',
            sn:       snEl       ? snEl.value       : '',
            cables:   cablesEl   ? cablesEl.value   : '',
            faults:   faultsEl   ? faultsEl.value   : '',
            tech:     techEl     ? techEl.value     : 'Receptionist',
            status:   statusEl   ? statusEl.value   : 'Pending',
            cost:     costEl     ? costEl.value     : '0.00'
        };

        var jobs = getJobs();
        jobs.push(newJob);
        saveJobs(jobs);

        closeJobModal();

        var form = document.getElementById('job-form');
        if (form) form.reset();

        if (window.Utils && Utils.toast) Utils.toast('New job ticket ' + newJob.id + ' created', 'success');
    }

    // ----------------------------------------
    // S/N lookup
    // ----------------------------------------
    function openSNLookup() {
        var modal = document.getElementById('modal-sn-history');
        if (modal) modal.classList.remove('hidden');
    }

    function doSNLookup() {
        var queryEl    = document.getElementById('sn-search-query');
        var resultsBox = document.getElementById('sn-history-results');
        if (!queryEl || !resultsBox) return;

        var query = queryEl.value.toLowerCase().trim();
        var jobs  = getJobs();

        if (!query) {
            resultsBox.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-4">Enter a query above to search past repairs.</p>';
            return;
        }

        var matched = jobs.filter(function (j) {
            return (j.sn       && j.sn.toLowerCase().indexOf(query)       !== -1) ||
                   (j.customer && j.customer.toLowerCase().indexOf(query) !== -1) ||
                   (j.device   && j.device.toLowerCase().indexOf(query)   !== -1) ||
                   (j.phone    && j.phone.indexOf(query)                  !== -1);
        });

        if (!matched.length) {
            resultsBox.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-4">No records found.</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < matched.length; i++) {
            var j = matched[i];
            html += '<div class="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">'
                +     '<div class="flex justify-between font-bold">'
                +       '<span class="text-emerald-600 dark:text-emerald-400">' + Utils.esc(j.id) + ' — ' + Utils.esc(j.device) + '</span>'
                +       '<span class="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700">' + Utils.esc(j.status) + '</span>'
                +     '</div>'
                +     '<p><strong>Client:</strong> ' + Utils.esc(j.customer) + ' (' + Utils.esc(j.phone || 'No phone') + ')</p>'
                +     '<p class="font-mono text-slate-500"><strong>S/N:</strong> ' + Utils.esc(j.sn) + '</p>'
                +     '<p><strong>Fault:</strong> ' + Utils.esc(j.faults || 'None recorded') + '</p>'
                + '</div>';
        }
        resultsBox.innerHTML = html;
    }

    // ----------------------------------------
    // Kanban render
    // ----------------------------------------
    function render() {
        var jobs         = getJobs();
        var searchInput  = document.getElementById('job-search-input');
        var filterTech   = document.getElementById('job-tech-filter');

        var q = searchInput ? searchInput.value.toLowerCase().trim() : '';
        var selectedTech = filterTech ? filterTech.value : 'ALL';

        var filtered = jobs.filter(function (j) {
            var matchesQuery = !q ||
                (j.id       && j.id.toLowerCase().indexOf(q)       !== -1) ||
                (j.customer && j.customer.toLowerCase().indexOf(q) !== -1) ||
                (j.device   && j.device.toLowerCase().indexOf(q)   !== -1) ||
                (j.sn       && j.sn.toLowerCase().indexOf(q)       !== -1);

            var matchesTech = selectedTech === 'ALL' || j.tech === selectedTech;
            return matchesQuery && matchesTech;
        });

        var cols = { Pending: [], 'In Progress': [], 'On Hold': [], Completed: [] };
        filtered.forEach(function (j) {
            if (cols[j.status]) cols[j.status].push(j);
            else cols.Pending.push(j);
        });

        var mapping = {
            'Pending':     'pending',
            'In Progress': 'in-progress',
            'On Hold':     'on-hold',
            'Completed':   'completed'
        };

        Object.keys(cols).forEach(function (stage) {
            var key     = mapping[stage];
            var colEl   = document.getElementById('kanban-' + key);
            var countEl = document.getElementById('count-' + key);

            if (countEl) countEl.innerText = cols[stage].length;
            if (!colEl) return;

            if (!cols[stage].length) {
                colEl.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-4">No jobs</p>';
                return;
            }

            var html = '';
            cols[stage].forEach(function (j) {
                html += '<div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 shadow-sm space-y-2">'
                    +   '<div class="flex justify-between items-start">'
                    +     '<span class="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">' + Utils.esc(j.id) + '</span>'
                    +     '<span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">' + Utils.esc(j.tech) + '</span>'
                    +   '</div>'
                    +   '<h5 class="font-bold text-xs text-slate-900 dark:text-white">' + Utils.esc(j.device) + '</h5>'
                    +   '<p class="text-[11px] text-slate-500">' + Utils.esc(j.customer) + ' (' + Utils.esc(j.phone || 'N/A') + ')</p>'
                    +   '<p class="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded">S/N: ' + Utils.esc(j.sn || 'N/A') + '</p>'
                    +   '<div class="pt-1 flex gap-1.5">'
                    +     '<button onclick="Jobs.advanceStatus(\'' + j.id + '\')" class="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-1 rounded font-bold">Move &rarr;</button>'
                    +     '<button onclick="Jobs.deleteJob(\'' + j.id + '\')" title="Delete this job ticket" class="text-[10px] bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 px-2 py-1 rounded font-bold flex items-center gap-1">'
                    +       '<i class="fa-solid fa-trash"></i>'
                    +     '</button>'
                    +   '</div>'
                    + '</div>';
            });

            colEl.innerHTML = html;
        });
    }

    // ----------------------------------------
    // Stage progression
    // ----------------------------------------
    function advanceStatus(id) {
        var jobs = getJobs();
        var job = jobs.find(function (j) { return j.id === id; });
        if (!job) return;

        var stages = ['Pending', 'In Progress', 'On Hold', 'Completed'];
        var idx = (stages.indexOf(job.status) + 1) % stages.length;
        job.status = stages[idx];
        saveJobs(jobs);
    }

    // ----------------------------------------
    // Delete job
    // ----------------------------------------
    function deleteJob(id) {
        var jobs = getJobs();
        var job = jobs.find(function (j) { return j.id === id; });
        if (!job) {
            if (window.Utils && Utils.toast) Utils.toast('Job not found', 'error');
            return;
        }

        var confirmed = confirm(
            'Delete job ticket ' + job.id + '?\n\n' +
            'Client: ' + (job.customer || '—') + '\n' +
            'Device: ' + (job.device || '—') + '\n\n' +
            'This cannot be undone.'
        );
        if (!confirmed) return;

        var filtered = jobs.filter(function (j) { return j.id !== id; });
        saveJobs(filtered);

        if (window.Utils && Utils.toast) Utils.toast('Job ticket ' + id + ' deleted', 'success');
    }

    // ----------------------------------------
    // Public API
    // ----------------------------------------
    return {
        init:            render,
        render:          render,
        refresh:         render,
        getJobs:         getJobs,
        saveJobs:        saveJobs,
        openCreate:      openCreate,
        openJobModal:    openCreate,
        closeJobModal:   closeJobModal,
        saveJob:         saveJob,
        openSNLookup:    openSNLookup,
        doSNLookup:      doSNLookup,
        advanceStatus:   advanceStatus,
        deleteJob:       deleteJob
    };
})();

// Global fallbacks for inline onclick in HTML
window.openCreate = function () { Jobs.openCreate(); };