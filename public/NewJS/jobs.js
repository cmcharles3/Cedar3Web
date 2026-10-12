const Jobs = {
    init() {
        this.render();
    },

    getJobs() {
        return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.JOBS)) || [];
    },

    saveJobs(jobs) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.JOBS, JSON.stringify(jobs));
        this.render();
    },

    render() {
        const jobs = this.getJobs();
        const cols = { pending: [], 'in-progress': [], 'on-hold': [], completed: [] };

        jobs.forEach(j => {
            const statusKey = (j.status || 'pending').toLowerCase().replace(' ', '-');
            if (cols[statusKey]) cols[statusKey].push(j);
            else cols.pending.push(j);
        });

        for (let key in cols) {
            const el = document.getElementById(`kanban-${key}`);
            const countEl = document.getElementById(`count-${key}`);
            if (countEl) countEl.innerText = cols[key].length;

            if (el) {
                if (!cols[key].length) {
                    el.innerHTML = `<p class="text-xs text-slate-400 italic text-center py-4">No jobs</p>`;
                } else {
                    el.innerHTML = cols[key].map(j => `
                        <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 shadow-sm space-y-2">
                            <div class="flex justify-between items-start">
                                <span class="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">${j.id}</span>
                                <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">${j.tech || 'Unassigned'}</span>
                            </div>
                            <h5 class="font-bold text-xs text-slate-900 dark:text-white">${j.device || j.model || 'Unknown Device'}</h5>
                            <p class="text-[11px] text-slate-500">${j.customer || j.clientName || 'Client'} (${j.phone || j.clientPhone || 'No Phone'})</p>
                            <p class="text-[11px] text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded">SN: ${j.sn || 'N/A'}</p>
                            <div class="pt-1 flex gap-1.5">
                                <button onclick="Jobs.advanceStatus('${j.id}')" class="text-[10px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-1 rounded font-bold">Move &rarr;</button>
                                <button onclick="Jobs.openInvoice('${j.id}')" class="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 px-2 py-1 rounded font-bold">Invoice</button>
                            </div>
                        </div>
                    `).join('');
                }
            }
        }
    },

    openCreate() {
        document.getElementById('modal-job').classList.remove('hidden');
    },

    closeJobModal() {
        document.getElementById('modal-job').classList.add('hidden');
    },

    saveJob(e) {
        e.preventDefault();
        const jobs = this.getJobs();
        const newJob = {
            id: 'JOB-' + Math.floor(100 + Math.random() * 900),
            customer: document.getElementById('job-customer').value,
            phone: document.getElementById('job-phone').value,
            address: document.getElementById('job-address').value,
            device: document.getElementById('job-device').value,
            sn: document.getElementById('job-sn').value,
            cables: document.getElementById('job-cables').value,
            faults: document.getElementById('job-faults').value,
            tech: document.getElementById('job-assigned-tech').value,
            status: document.getElementById('job-status').value,
            cost: document.getElementById('job-cost').value || '0.00'
        };

        jobs.push(newJob);
        this.saveJobs(jobs);
        this.closeJobModal();
        document.getElementById('job-form').reset();
        Utils.showToast("New Job Ticket Saved");
    },

    advanceStatus(id) {
        const jobs = this.getJobs();
        const job = jobs.find(j => j.id === id);
        if (job) {
            const stages = ['Pending', 'In Progress', 'On Hold', 'Completed'];
            let nextIndex = (stages.indexOf(job.status) + 1) % stages.length;
            job.status = stages[nextIndex];
            this.saveJobs(jobs);
            Utils.showToast(`${id} moved to ${job.status}`);
        }
    },

    openSNLookup() {
        document.getElementById('modal-sn-history').classList.remove('hidden');
    },

    doSNLookup() {
        const query = document.getElementById('sn-search-query').value.toLowerCase();
        const resultsBox = document.getElementById('sn-history-results');
        const jobs = this.getJobs();

        const matched = jobs.filter(j => 
            (j.sn && j.sn.toLowerCase().includes(query)) ||
            (j.customer && j.customer.toLowerCase().includes(query)) ||
            (j.phone && j.phone.includes(query))
        );

        if (!matched.length) {
            resultsBox.innerHTML = `<p class="text-xs text-slate-400 italic">No records found matching search query.</p>`;
            return;
        }

        resultsBox.innerHTML = matched.map(j => `
            <div class="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
                <div class="flex justify-between font-bold">
                    <span class="text-emerald-600">${j.id} - ${j.device}</span>
                    <span>${j.status}</span>
                </div>
                <p>Client: ${j.customer} (${j.phone})</p>
                <p class="font-mono text-slate-500">SN: ${j.sn}</p>
                <p>Faults: ${j.faults || 'None recorded'}</p>
            </div>
        `).join('');
    },

    openInvoice(id) {
        const job = this.getJobs().find(j => j.id === id);
        if (!job) return;

        document.getElementById('inv-client-name').innerText = job.customer || '—';
        document.getElementById('inv-client-phone').innerText = `Phone: ${job.phone || '—'}`;
        document.getElementById('inv-device-model').innerText = job.device || '—';
        document.getElementById('inv-sn').innerText = `S/N: ${job.sn || '—'}`;
        document.getElementById('inv-bank-ref').innerText = job.id;
        document.getElementById('invoice-doc-num').innerText = `INV-${job.id}`;
        document.getElementById('inv-total-amount').innerText = Utils.formatCurrency(job.cost);

        document.getElementById('modal-invoice').classList.remove('hidden');
    }
};