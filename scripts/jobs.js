
// ============================================
// Cedar3 — Jobs Kanban Board
// Full featured: create, edit, checklist, invoice, WhatsApp, S/N lookup
// ============================================

const Jobs = {
    init() {
        this.render();
    },

    getJobs() {
    try {
        return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.JOBS)) || [];
    } catch { return []; }
},

    saveJobs(jobs) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.JOBS, JSON.stringify(jobs));
        this.render();
    },

    // OPEN NEW JOB MODAL (Handles both function names)
    openCreate() {
        const modal = document.getElementById('modal-job');
        if (modal) {
            modal.classList.remove('hidden');
        } else {
            console.error("Modal element '#modal-job' not found in DOM.");
        }
    },

    openJobModal() {
        this.openCreate();
    },

    // CLOSE NEW JOB MODAL
    closeJobModal() {
        const modal = document.getElementById('modal-job');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // SAVE JOB TICKET FORM
    saveJob(e) {
        if (e) e.preventDefault();
        
        const customerEl = document.getElementById('job-customer');
        const phoneEl = document.getElementById('job-phone');
        const deviceEl = document.getElementById('job-device');
        const snEl = document.getElementById('job-sn');
        const cablesEl = document.getElementById('job-cables');
        const faultsEl = document.getElementById('job-faults');
        const techEl = document.getElementById('job-assigned-tech');
        const statusEl = document.getElementById('job-status');
        const costEl = document.getElementById('job-cost');

        const newJob = {
            id: 'JOB-' + Math.floor(100 + Math.random() * 900),
            customer: customerEl ? customerEl.value : '',
            phone: phoneEl ? phoneEl.value : '',
            device: deviceEl ? deviceEl.value : '',
            sn: snEl ? snEl.value : '',
            cables: cablesEl ? cablesEl.value : '',
            faults: faultsEl ? faultsEl.value : '',
            tech: techEl ? techEl.value : 'Receptionist',
            status: statusEl ? statusEl.value : 'Pending',
            cost: costEl ? costEl.value : '0.00'
        };

        const jobs = this.getJobs();
        jobs.push(newJob);
        this.saveJobs(jobs);

        this.closeJobModal();
        
        const form = document.getElementById('job-form');
        if (form) form.reset();

        if (window.Utils) Utils.showToast("New Job Ticket Created!");
    },

    // S/N LOOKUP MODALS
    openSNLookup() {
        const modal = document.getElementById('modal-sn-history');
        if (modal) modal.classList.remove('hidden');
    },

    doSNLookup() {
        const queryEl = document.getElementById('sn-search-query');
        const resultsBox = document.getElementById('sn-history-results');
        if (!queryEl || !resultsBox) return;

        const query = queryEl.value.toLowerCase().trim();
        const jobs = this.getJobs();

        if (!query) {
            resultsBox.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">Enter a query above to search past repairs.</p>`;
            return;
        }

        const matched = jobs.filter(j => 
            (j.sn && j.sn.toLowerCase().includes(query)) ||
            (j.customer && j.customer.toLowerCase().includes(query)) ||
            (j.device && j.device.toLowerCase().includes(query)) ||
            (j.phone && j.phone.includes(query))
        );

        if (!matched.length) {
            resultsBox.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">No records found matching "${query}".</p>`;
            return;
        }

        resultsBox.innerHTML = matched.map(j => `
            <div class="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
                <div class="flex justify-between font-bold">
                    <span class="text-emerald-600 dark:text-emerald-400">${j.id} - ${j.device}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700">${j.status}</span>
                </div>
                <p><strong>Client:</strong> ${j.customer} (${j.phone || 'No phone'})</p>
                <p class="font-mono text-slate-500"><strong>S/N:</strong> ${j.sn}</p>
                <p><strong>Fault:</strong> ${j.faults || 'None recorded'}</p>
            </div>
        `).join('');
    },

    render() {
        // Kanban Rendering Logic
        const jobs = this.getJobs();
        const searchInput = document.getElementById('job-search-input');
        const filterTech = document.getElementById('job-tech-filter');
        
        const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const selectedTech = filterTech ? filterTech.value : 'ALL';

        const filtered = jobs.filter(j => {
            const matchesQuery = !q || 
                (j.id && j.id.toLowerCase().includes(q)) ||
                (j.customer && j.customer.toLowerCase().includes(q)) ||
                (j.device && j.device.toLowerCase().includes(q)) ||
                (j.sn && j.sn.toLowerCase().includes(q));

            const matchesTech = selectedTech === 'ALL' || j.tech === selectedTech;

            return matchesQuery && matchesTech;
        });

        const cols = { Pending: [], 'In Progress': [], 'On Hold': [], Completed: [] };
        filtered.forEach(j => {
            if (cols[j.status]) cols[j.status].push(j);
            else cols.Pending.push(j);
        });

        const mapping = { 'Pending': 'pending', 'In Progress': 'in-progress', 'On Hold': 'on-hold', 'Completed': 'completed' };

        for (let stage in cols) {
            const key = mapping[stage];
            const colEl = document.getElementById(`kanban-${key}`);
            const countEl = document.getElementById(`count-${key}`);

            if (countEl) countEl.innerText = cols[stage].length;

            if (colEl) {
                if (!cols[stage].length) {
                    colEl.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">No jobs</p>`;
                } else {
                    colEl.innerHTML = cols[stage].map(j => `
                        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 shadow-sm space-y-2">
                            <div class="flex justify-between items-start">
                                <span class="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">${j.id}</span>
                                <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">${j.tech}</span>
                            </div>
                            <h5 class="font-bold text-xs text-slate-900 dark:text-white">${j.device}</h5>
                            <p class="text-[11px] text-slate-500">${j.customer} (${j.phone || 'N/A'})</p>
                            <p class="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded">S/N: ${j.sn || 'N/A'}</p>
                            <div class="pt-1 flex gap-1.5">
                                <button onclick="Jobs.advanceStatus('${j.id}')" class="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-1 rounded font-bold">Move &rarr;</button>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    },

    advanceStatus(id) {
        const jobs = this.getJobs();
        const job = jobs.find(j => j.id === id);
        if (job) {
            const stages = ['Pending', 'In Progress', 'On Hold', 'Completed'];
            let idx = (stages.indexOf(job.status) + 1) % stages.length;
            job.status = stages[idx];
            this.saveJobs(jobs);
        }
    },

    refresh() {
        this.render();
    }
};

// Global fallback mapping
window.openCreate = function() { Jobs.openCreate(); };