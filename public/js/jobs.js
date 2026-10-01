// ============================================
// Cedar3 — Jobs Kanban Board
// Full featured: create, edit, checklist, invoice, WhatsApp, S/N lookup
// ============================================

window.Jobs = (function () {
    var STATUSES = ['Pending', 'In Progress', 'On Hold', 'Completed'];
    var COLUMN_IDS = {
        'Pending':     'kanban-pending',
        'In Progress': 'kanban-in-progress',
        'On Hold':     'kanban-on-hold',
        'Completed':   'kanban-completed'
    };
    var COUNT_IDS = {
        'Pending':     'count-pending',
        'In Progress': 'count-in-progress',
        'On Hold':     'count-on-hold',
        'Completed':   'count-completed'
    };

    var allJobs = [];
    var editingJobId = null;   // null = create mode, string = edit mode

    // ---------- Helpers ----------

    function findJob(id) {
        for (var i = 0; i < allJobs.length; i++) {
            if (allJobs[i].id === id) return allJobs[i];
        }
        return null;
    }

    function priorityBadge(p) {
        if (p === 'High')   return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">HIGH</span>';
        if (p === 'Urgent') return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">URGENT</span>';
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">NORMAL</span>';
    }

    function checklistProgress(job) {
        var done = 0, total = 0;
        if (job.checklist && job.checklist.length) {
            total = job.checklist.length;
            for (var i = 0; i < job.checklist.length; i++) {
                if (job.checklist[i].done) done++;
            }
        }
        return { done: done, total: total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
    }

    // ---------- Render ----------

    function cardHTML(job) {
        var prog = checklistProgress(job);

        var statusOptions = '';
        for (var s = 0; s < STATUSES.length; s++) {
            var st = STATUSES[s];
            statusOptions += '<option value="' + st + '"' + (job.status === st ? ' selected' : '') + '>' + st + '</option>';
        }

        return ''
            + '<div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">'
            +   '<div class="flex justify-between items-start gap-2">'
            +     '<span class="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">' + Utils.esc(job.id) + '</span>'
            +     '<div class="flex items-center gap-1">'
            +       '<button onclick="Jobs.whatsApp(\'' + job.id + '\')" title="WhatsApp client" class="p-1 rounded bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 text-emerald-600 text-[11px]"><i class="fa-brands fa-whatsapp font-bold"></i></button>'
            +       '<button onclick="Jobs.openInvoice(\'' + job.id + '\')" title="Invoice / Quote" class="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-[11px]"><i class="fa-solid fa-file-invoice-dollar"></i></button>'
            +       '<button onclick="Jobs.openEdit(\'' + job.id + '\')" title="Edit job" class="p-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 text-slate-600 dark:text-slate-300 hover:text-emerald-600 text-[11px]"><i class="fa-solid fa-pen"></i></button>'
            +     '</div>'
            +   '</div>'
            +   '<div>'
            +     '<h5 class="font-bold text-xs text-slate-900 dark:text-white leading-snug">' + Utils.esc(job.device || 'Unnamed device') + '</h5>'
            +     '<p class="text-[11px] text-slate-500 font-medium">' + Utils.esc(job.customer || '') + '</p>'
            +     (job.phone ? '<p class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5"><i class="fa-solid fa-phone mr-1"></i>' + Utils.esc(job.phone) + '</p>' : '')
            +     (job.sn ? '<p class="text-[10px] text-slate-400 mt-0.5"><i class="fa-solid fa-barcode mr-1"></i>' + Utils.esc(job.sn) + '</p>' : '')
            +   '</div>'
            +   '<div class="space-y-1">'
            +     '<div class="flex justify-between items-center text-[10px] text-slate-500">'
            +       '<span>Checklist</span>'
            +       '<span>' + prog.pct + '% (' + prog.done + '/' + prog.total + ')</span>'
            +     '</div>'
            +     '<div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">'
            +       '<div class="bg-emerald-500 h-full rounded-full transition-all duration-300" style="width: ' + prog.pct + '%"></div>'
            +     '</div>'
            +   '</div>'
            +   '<div class="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs gap-2">'
            +     '<span class="font-semibold text-slate-600 dark:text-slate-400 truncate"><i class="fa-solid fa-user-gear mr-1"></i>' + Utils.esc(job.assignedTech || '—') + '</span>'
            +     '<select onchange="Jobs.changeStatus(\'' + job.id + '\', this.value)" class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] rounded px-1.5 py-1 outline-none">'
            +       statusOptions
            +     '</select>'
            +   '</div>'
            + '</div>';
    }

    function render() {
        var searchEl = document.getElementById('job-search-input');
        var filterEl = document.getElementById('job-tech-filter');
        var search = (searchEl ? searchEl.value : '').toLowerCase();
        var techFilter = filterEl ? filterEl.value : 'ALL';

        var buckets = { 'Pending': [], 'In Progress': [], 'On Hold': [], 'Completed': [] };
        for (var i = 0; i < allJobs.length; i++) {
            var j = allJobs[i];
            var matchSearch = !search
                || (j.customer || '').toLowerCase().indexOf(search) !== -1
                || (j.device || '').toLowerCase().indexOf(search) !== -1
                || (j.id || '').toLowerCase().indexOf(search) !== -1
                || (j.phone || '').toLowerCase().indexOf(search) !== -1
                || (j.sn || '').toLowerCase().indexOf(search) !== -1;
            var matchTech = techFilter === 'ALL' || j.assignedTech === techFilter;
            if (matchSearch && matchTech && buckets[j.status]) {
                buckets[j.status].push(j);
            }
        }

        for (var k = 0; k < STATUSES.length; k++) {
            var status = STATUSES[k];
            var col = document.getElementById(COLUMN_IDS[status]);
            var count = document.getElementById(COUNT_IDS[status]);
            if (count) count.textContent = String(buckets[status].length);
            if (!col) continue;

            if (buckets[status].length === 0) {
                col.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-6">No jobs here.</p>';
                continue;
            }

            var html = '';
            for (var b = 0; b < buckets[status].length; b++) {
                html += cardHTML(buckets[status][b]);
            }
            col.innerHTML = html;
        }
    }

    // ---------- Data sync ----------

    async function refresh() {
        var res = await API.getJobs(true);
        if (!res.ok) {
            Utils.toast('Failed to load jobs', 'error');
            return;
        }
        allJobs = res.data || [];
        render();
    }

    async function changeStatus(jobId, newStatus) {
        var res = await API.updateJob(jobId, { status: newStatus });
        if (res.ok) {
            Utils.toast('Moved ' + jobId + ' to ' + newStatus, 'success');
            await refresh();
        } else {
            Utils.toast((res.data && res.data.error) || 'Update failed', 'error');
        }
    }

    // ---------- Create / Edit Modal ----------

    function openCreate() {
        editingJobId = null;
        document.getElementById('job-modal-title').innerHTML =
            '<i class="fa-solid fa-file-invoice text-emerald-600"></i> New Job Ticket / Intake';
        document.getElementById('job-form').reset();
        document.getElementById('job-id').value = '';
        renderChecklistEditor([]);
        document.getElementById('modal-job').classList.remove('hidden');
    }

    function openEdit(jobId) {
        var job = findJob(jobId);
        if (!job) return;

        editingJobId = jobId;
        document.getElementById('job-modal-title').innerHTML =
            '<i class="fa-solid fa-pen text-emerald-600"></i> Edit Job ' + Utils.esc(jobId);
        document.getElementById('job-id').value = job.id;
        document.getElementById('job-customer').value = job.customer || '';
        document.getElementById('job-phone').value = job.phone || '';
        document.getElementById('job-address').value = job.address || '';
        document.getElementById('job-device').value = job.device || '';
        document.getElementById('job-sn').value = job.sn || '';
        document.getElementById('job-cables').value = job.cables || '';
        document.getElementById('job-faults').value = job.faults || '';
        document.getElementById('job-assigned-tech').value = job.assignedTech || 'Receptionist';
        document.getElementById('job-priority').value = job.priority || 'Normal';
        document.getElementById('job-status').value = job.status || 'Pending';
        document.getElementById('job-followup').value = job.followup || 'Client Notified';
        document.getElementById('job-tech-report').value = job.techReport || '';
        document.getElementById('job-parts-needed').value = job.partsNeeded || '';
        document.getElementById('job-cost').value = job.cost || 0;

        renderChecklistEditor(job.checklist || []);
        document.getElementById('modal-job').classList.remove('hidden');
    }

    function closeJobModal() {
        document.getElementById('modal-job').classList.add('hidden');
        editingJobId = null;
    }

    async function saveJob(e) {
        e.preventDefault();

        // Build job object from form
        var jobIdInput = document.getElementById('job-id').value.trim();
        var jobId = jobIdInput || ('JOB-' + (100 + Math.floor(Math.random() * 900)));

        // Read checklist from DOM
        var checklist = [];
        var clItems = document.querySelectorAll('#checklist-editor [data-check-index]');
        for (var i = 0; i < clItems.length; i++) {
            var cb = clItems[i].querySelector('input[type="checkbox"]');
            var txt = clItems[i].querySelector('input[type="text"]');
            if (txt && txt.value.trim()) {
                checklist.push({ task: txt.value.trim(), done: cb ? cb.checked : false });
            }
        }

        var job = {
            id: jobId,
            customer: document.getElementById('job-customer').value.trim(),
            phone: document.getElementById('job-phone').value.trim(),
            address: document.getElementById('job-address').value.trim(),
            device: document.getElementById('job-device').value.trim(),
            sn: document.getElementById('job-sn').value.trim(),
            cables: document.getElementById('job-cables').value.trim(),
            faults: document.getElementById('job-faults').value.trim(),
            assignedTech: document.getElementById('job-assigned-tech').value,
            priority: document.getElementById('job-priority').value,
            status: document.getElementById('job-status').value,
            followup: document.getElementById('job-followup').value,
            techReport: document.getElementById('job-tech-report').value.trim(),
            partsNeeded: document.getElementById('job-parts-needed').value.trim(),
            cost: parseFloat(document.getElementById('job-cost').value) || 0,
            checklist: checklist
        };

        if (!job.customer || !job.device) {
            Utils.toast('Customer and Device are required', 'warn');
            return;
        }

        var res;
        if (editingJobId) {
            res = await API.updateJob(editingJobId, job);
        } else {
            res = await API.createJob(job);
        }

        if (res.ok) {
            Utils.toast(editingJobId ? 'Job updated' : 'Job ticket created', 'success');
            closeJobModal();
            await refresh();
        } else {
            Utils.toast((res.data && res.data.error) || 'Save failed', 'error');
        }
    }

    // ---------- Checklist editor (inside modal) ----------

    function renderChecklistEditor(items) {
        var container = document.getElementById('checklist-editor');
        if (!container) return;
        container.innerHTML = '';
        for (var i = 0; i < items.length; i++) {
            container.appendChild(checklistRow(items[i].task, items[i].done));
        }
    }

    function checklistRow(task, done) {
        var row = document.createElement('div');
        row.className = 'flex items-center gap-2 text-xs';
        row.setAttribute('data-check-index', '1');
        row.innerHTML = ''
            + '<input type="checkbox" ' + (done ? 'checked' : '') + ' class="rounded">'
            + '<input type="text" value="' + Utils.esc(task || '') + '" placeholder="Describe a step..." class="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-emerald-500">'
            + '<button type="button" class="text-rose-500 hover:text-rose-700 px-2" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>';
        return row;
    }

    function addChecklistItem() {
        var container = document.getElementById('checklist-editor');
        if (container) container.appendChild(checklistRow('', false));
    }

    // ---------- S/N Lookup ----------

    function openSNLookup() {
        document.getElementById('sn-search-query').value = '';
        document.getElementById('sn-history-results').innerHTML =
            '<p class="text-xs text-slate-400 italic text-center py-6">Enter a serial number, phone, or client name above and press Lookup.</p>';
        document.getElementById('modal-sn-history').classList.remove('hidden');
        setTimeout(function () {
            document.getElementById('sn-search-query').focus();
        }, 100);
    }

    async function doSNLookup() {
        var q = (document.getElementById('sn-search-query').value || '').trim();
        var container = document.getElementById('sn-history-results');
        if (!container) return;

        if (!q) {
            container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-6">Please enter something to search.</p>';
            return;
        }

        container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-6">Searching…</p>';

        var res = await API.lookupJobs(q);
        if (!res.ok) {
            container.innerHTML = '<p class="text-xs text-rose-500 text-center py-6">Lookup failed. Try again.</p>';
            return;
        }

        var results = res.data || [];
        if (results.length === 0) {
            container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-6">No matching repair records found.</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < results.length; i++) {
            var j = results[i];
            html += ''
                + '<div class="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">'
                +   '<div class="flex justify-between items-start">'
                +     '<div>'
                +       '<span class="font-mono font-bold text-emerald-600">' + Utils.esc(j.id) + '</span>'
                +       '<span class="ml-2 font-bold text-slate-800 dark:text-slate-200">' + Utils.esc(j.device || '') + '</span>'
                +     '</div>'
                +     '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700">' + Utils.esc(j.status || '') + '</span>'
                +   '</div>'
                +   '<div class="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono">'
                +     '<p><strong>Client:</strong> ' + Utils.esc(j.customer || '') + ' (' + Utils.esc(j.phone || 'N/A') + ')</p>'
                +     '<p><strong>S/N:</strong> ' + Utils.esc(j.sn || 'N/A') + '</p>'
                +     '<p><strong>Assigned:</strong> ' + Utils.esc(j.assignedTech || '') + '</p>'
                +     '<p><strong>Cost:</strong> ' + Utils.formatZAR(j.cost || 0) + '</p>'
                +   '</div>'
                +   '<div class="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px]">'
                +     '<p><strong>Faults:</strong> ' + Utils.esc(j.faults || 'N/A') + '</p>'
                +     '<p class="mt-1 text-emerald-700 dark:text-emerald-400"><strong>Repair:</strong> ' + Utils.esc(j.techReport || 'In Progress') + '</p>'
                +   '</div>'
                + '</div>';
        }
        container.innerHTML = html;
    }

    // ---------- Invoice Modal ----------

    var activeInvoiceJobId = null;
    var activeInvoiceMode = 'INVOICE';

    function openInvoice(jobId) {
        var job = findJob(jobId);
        if (!job) return;

        activeInvoiceJobId = jobId;
        activeInvoiceMode = 'INVOICE';

        document.getElementById('inv-client-name').textContent = job.customer || 'N/A';
        document.getElementById('inv-client-phone').textContent = 'Phone: ' + (job.phone || 'N/A');
        document.getElementById('inv-client-address').textContent = 'Address: ' + (job.address || 'N/A');
        document.getElementById('inv-device-model').textContent = job.device || 'N/A';
        document.getElementById('inv-sn').textContent = 'S/N: ' + (job.sn || 'N/A');
        document.getElementById('inv-assigned-tech').textContent = 'Tech: ' + (job.assignedTech || '');
        document.getElementById('inv-line-tech-notes').textContent = job.techReport || job.faults || 'Standard Diagnostic & Repair Service';
        document.getElementById('inv-line-parts').textContent = job.partsNeeded || 'None specified / Replacement components';
        document.getElementById('inv-labor-cost').textContent = Utils.formatZAR(job.cost || 0);
        document.getElementById('inv-total-amount').textContent = Utils.formatZAR(job.cost || 0);
        document.getElementById('inv-doc-num').textContent = 'INV-' + job.id;
        document.getElementById('inv-doc-date').textContent = 'Date: ' + new Date().toISOString().slice(0, 10);
        document.getElementById('inv-bank-ref').textContent = job.id + ' / ' + (job.customer || '').split(' ')[0];

        setInvoiceMode('INVOICE');
        document.getElementById('modal-invoice').classList.remove('hidden');
    }

    function setInvoiceMode(mode) {
        activeInvoiceMode = mode;
        var badge = document.getElementById('invoice-type-badge');
        var btnInv = document.getElementById('btn-toggle-invoice');
        var btnQuote = document.getElementById('btn-toggle-quote');
        if (!badge || !btnInv || !btnQuote) return;

        if (mode === 'QUOTE') {
            badge.textContent = 'OFFICIAL QUOTATION';
            badge.className = 'inline-block px-3 py-1 bg-blue-700 text-white font-mono font-bold text-sm rounded uppercase';
            btnQuote.className = 'px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold';
            btnInv.className = 'px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-bold';
        } else {
            badge.textContent = 'TAX INVOICE';
            badge.className = 'inline-block px-3 py-1 bg-emerald-700 text-white font-mono font-bold text-sm rounded uppercase';
            btnInv.className = 'px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold';
            btnQuote.className = 'px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-xs font-bold';
        }
    }

    function sendInvoiceWhatsApp() {
        if (!activeInvoiceJobId) return;
        var job = findJob(activeInvoiceJobId);
        if (!job) return;
        if (!job.phone) {
            Utils.toast('No phone number on file for this client', 'warn');
            return;
        }

        var phone = String(job.phone).replace(/\D/g, '');
        if (phone.charAt(0) === '0') phone = '27' + phone.slice(1);

        var label = activeInvoiceMode === 'QUOTE' ? 'Quotation' : 'Tax Invoice';
        var msg = 'Hi ' + (job.customer || 'there') + ', here is your Cedar3 Technology ' + label
            + ' for ' + (job.device || 'your repair')
            + ' (Ref: ' + job.id + ').\n\n'
            + 'Total Due: ' + Utils.formatZAR(job.cost || 0) + '\n'
            + 'Bank: FNB Cheque Account\n'
            + 'Acc No: 62891042981\n'
            + 'Branch: 250655\n'
            + 'Reference: ' + job.id + '\n\n'
            + 'Thank you for choosing Cedar3 Technology!';

        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    }

    function copyInvoiceText() {
        if (!activeInvoiceJobId) return;
        var job = findJob(activeInvoiceJobId);
        if (!job) return;

        var text = 'CUSTOMER: ' + (job.customer || '')
            + '\nPHONE: ' + (job.phone || 'N/A')
            + '\nADDRESS: ' + (job.address || 'N/A')
            + '\nITEM: ' + (job.device || '') + ' (S/N: ' + (job.sn || 'N/A') + ')'
            + '\nDESCRIPTION: ' + (job.techReport || job.faults || '')
            + '\nAMOUNT: ' + Utils.formatZAR(job.cost || 0);

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function () {
                Utils.toast('Copied to clipboard', 'success');
            });
        } else {
            alert(text);
        }
    }

    // ---------- WhatsApp direct (from card) ----------

    function whatsApp(jobId) {
        var job = findJob(jobId);
        if (!job) return;
        if (!job.phone) {
            Utils.toast('No client phone recorded for this ticket', 'error');
            return;
        }

        var phone = String(job.phone).replace(/\D/g, '');
        if (phone.charAt(0) === '0') phone = '27' + phone.slice(1);

        var msg;
        if (job.status === 'Completed') {
            msg = 'Hi ' + job.customer + ', your ' + job.device
                + ' repair (Ref: ' + job.id + ') is COMPLETE & READY FOR PICKUP at Cedar3 Technology! Total Due: '
                + Utils.formatZAR(job.cost || 0) + '.';
        } else if (job.status === 'On Hold') {
            msg = 'Hi ' + job.customer + ', update on your ' + job.device
                + ' (Ref: ' + job.id + '): Our technician (' + job.assignedTech
                + ') is waiting for parts/approval. Please call us back!';
        } else {
            msg = 'Hi ' + job.customer + ', your ' + job.device
                + ' repair ticket ' + job.id + ' is IN PROGRESS at Cedar3 Technology under '
                + job.assignedTech + '. We will notify you when testing is complete!';
        }

        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
        Utils.toast('Opening WhatsApp for ' + job.customer, 'success');
    }

    // ---------- Export ----------

    function exportAllCSV() {
        if (allJobs.length === 0) {
            Utils.toast('No jobs to export', 'warn');
            return;
        }
        var headers = ['InvoiceNumber', 'CustomerName', 'CustomerPhone', 'CustomerAddress', 'ItemName', 'ItemDescription', 'UnitPrice', 'Quantity'];
        var rows = [headers.join(',')];
        for (var i = 0; i < allJobs.length; i++) {
            var j = allJobs[i];
            rows.push([
                '"' + (j.id || '') + '"',
                '"' + (j.customer || '') + '"',
                '"' + (j.phone || '') + '"',
                '"' + (j.address || '') + '"',
                '"' + (j.device || '') + '"',
                '"' + (j.techReport || j.faults || '').replace(/"/g, '""') + '"',
                Number(j.cost || 0).toFixed(2),
                1
            ].join(','));
        }
        var blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Cedar3_All_Jobs_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Utils.toast('Exported all jobs', 'success');
    }

    return {
        refresh: refresh,
        render: render,
        changeStatus: changeStatus,
        openCreate: openCreate,
        openEdit: openEdit,
        closeJobModal: closeJobModal,
        saveJob: saveJob,
        addChecklistItem: addChecklistItem,
        openSNLookup: openSNLookup,
        doSNLookup: doSNLookup,
        openInvoice: openInvoice,
        setInvoiceMode: setInvoiceMode,
        sendInvoiceWhatsApp: sendInvoiceWhatsApp,
        copyInvoiceText: copyInvoiceText,
        whatsApp: whatsApp,
        exportAllCSV: exportAllCSV
    };
})();