// ============================================
// Cedar3 — Jobs Kanban Board (Clean)
// ============================================

window.Jobs = (function () {
    var STATUSES = ['Pending', 'In Progress', 'On Hold', 'Completed'];
    var COLUMN_IDS = {
        'Pending': 'kanban-pending',
        'In Progress': 'kanban-in-progress',
        'On Hold': 'kanban-on-hold',
        'Completed': 'kanban-completed'
    };
    var COUNT_IDS = {
        'Pending': 'count-pending',
        'In Progress': 'count-in-progress',
        'On Hold': 'count-on-hold',
        'Completed': 'count-completed'
    };

    var allJobs = [];
    var editingJobId = null;
    var pendingPhotos = [];

    function findJob(id) {
        for (var i = 0; i < allJobs.length; i++) {
            if (allJobs[i].id === id) return allJobs[i];
        }
        return null;
    }

    function priorityBadge(p) {
        if (p === 'High') return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">HIGH</span>';
        if (p === 'Urgent') return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">URGENT</span>';
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">NORMAL</span>';
    }

    function cardHTML(job) {
        var doneCount = 0;
        var totalCount = 0;
        if (job.checklist && job.checklist.length) {
            totalCount = job.checklist.length;
            for (var i = 0; i < job.checklist.length; i++) {
                if (job.checklist[i].done) doneCount++;
            }
        }
        var pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

        // --- Job Age Counter ---
        var ageText = "";
        if (job.status !== 'Completed') {
            var createdDate = job.createdAt ? new Date(job.createdAt) : new Date();
            if (!isNaN(createdDate.getTime())) {
                var diffTime = Math.abs(new Date() - createdDate);
                var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                var ageColor = diffDays <= 1 ? 'text-emerald-700 bg-emerald-100' : (diffDays <= 3 ? 'text-amber-700 bg-amber-100' : 'text-rose-700 bg-rose-100');
                ageText = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ' + ageColor + '"><i class="fa-solid fa-hourglass-half mr-1"></i>' + diffDays + 'd</span>';
            }
        }

        var statusOptions = '';
        for (var s = 0; s < STATUSES.length; s++) {
            statusOptions += '<option value="' + STATUSES[s] + '"' + (job.status === STATUSES[s] ? ' selected' : '') + '>' + STATUSES[s] + '</option>';
        }

        var photoRow = '';
        if (job.photos && job.photos.length > 0) {
            photoRow = '<div class="flex gap-1 pt-1">';
            for (var p = 0; p < job.photos.length && p < 3; p++) {
                photoRow += '<img src="' + Utils.esc(job.photos[p].path) + '" class="w-10 h-10 object-cover rounded border cursor-pointer" onclick="Jobs.viewPhoto(\'' + Utils.esc(job.photos[p].path) + '\')">';
            }
            if (job.photos.length > 3) photoRow += '<span class="text-[10px] text-slate-400 self-center">+' + (job.photos.length - 3) + '</span>';
            photoRow += '</div>';
        }

        var user = API.getUser();
        var isAdmin = user && user.role === 'admin';
        var delBtn = isAdmin ? '<button onclick="Jobs.deleteJob(\'' + job.id + '\')" class="bg-rose-100 hover:bg-rose-200 text-rose-700 text-[11px] font-semibold py-1.5 px-2 rounded" title="Delete job"><i class="fa-solid fa-trash"></i></button>' : '';

        return '<div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">'
            + '<div class="flex justify-between items-start gap-2">'
            +   '<span class="font-mono font-bold text-xs text-emerald-600">' + Utils.esc(job.id) + '</span>'
            +   '<div class="flex items-center gap-1 flex-wrap justify-end">'
            +     ageText
            +     priorityBadge(job.priority)
            +   '</div>'
            + '</div>'
            + '<div>'
            +   '<h5 class="font-bold text-xs text-slate-900 dark:text-white">' + Utils.esc(job.device || '') + '</h5>'
            +   '<p class="text-[11px] text-slate-500">' + Utils.esc(job.customer || '') + '</p>'
            +   (job.phone ? '<p class="text-[10px] text-emerald-600 mt-0.5"><i class="fa-solid fa-phone mr-1"></i>' + Utils.esc(job.phone) + '</p>' : '')
            +   (job.sn ? '<p class="text-[10px] text-slate-400 mt-0.5"><i class="fa-solid fa-barcode mr-1"></i>' + Utils.esc(job.sn) + '</p>' : '')
            + '</div>'
            + photoRow
            + '<div class="space-y-1">'
            +   '<div class="flex justify-between items-center text-[10px] text-slate-500"><span>Checklist</span><span>' + pct + '% (' + doneCount + '/' + totalCount + ')</span></div>'
            +   '<div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden"><div class="bg-emerald-500 h-full rounded-full" style="width:' + pct + '%"></div></div>'
            + '</div>'
            + '<div class="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs gap-2">'
            +   '<span class="font-semibold text-slate-600"><i class="fa-solid fa-user-gear mr-1"></i>' + Utils.esc(job.assignedTech || '—') + '</span>'
            +   '<select onchange="Jobs.changeStatus(\'' + job.id + '\', this.value)" class="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] rounded px-1.5 py-1">' + statusOptions + '</select>'
            + '</div>'
            + '<div class="flex gap-1 pt-1">'
            +   '<button onclick="Jobs.viewJob(\'' + job.id + '\')" class="flex-1 bg-slate-100 text-slate-700 text-[11px] font-semibold py-1.5 rounded">View</button>'
            +   '<button onclick="Jobs.invoice(\'' + job.id + '\')" class="flex-1 bg-blue-50 text-blue-700 text-[11px] font-semibold py-1.5 rounded">Invoice</button>'
            +   '<button onclick="Jobs.openEdit(\'' + job.id + '\')" class="flex-1 bg-amber-50 text-amber-700 text-[11px] font-semibold py-1.5 rounded">Edit</button>'
            +   '<button onclick="Jobs.showWhatsAppMenu(event, \'' + job.id + '\')" class="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-semibold py-1.5 px-2 rounded"><i class="fa-brands fa-whatsapp"></i></button>'
            +   delBtn
            + '</div>'
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
            if (matchSearch && matchTech && buckets[j.status]) buckets[j.status].push(j);
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

    async function refresh() {
        var res = await API.getJobs(true);
        if (!res.ok) { Utils.toast('Failed to load jobs', 'error'); return; }
        allJobs = res.data || [];
        render();
    }

    async function changeStatus(jobId, newStatus) {
        var res = await API.updateJob(jobId, { status: newStatus });
        if (res.ok) { Utils.toast('Moved to ' + newStatus, 'success'); await refresh(); }
        else Utils.toast('Update failed', 'error');
    }

    async function deleteJob(jobId) {
        var job = findJob(jobId);
        if (!job) return;
        if (!confirm('Delete job ' + job.id + '?\n\nThis cannot be undone.')) return;
        var res = await API.deleteJob(jobId);
        if (res.ok) { Utils.toast('Job deleted', 'success'); await refresh(); }
        else Utils.toast('Delete failed', 'error');
    }

    function viewJob(jobId) {
        var job = findJob(jobId);
        if (!job) return;
        var user = API.getUser();
        var isAdmin = user && user.role === 'admin';
        var costLine = isAdmin ? '\nCost: R' + Number(job.cost || 0).toFixed(2) : '';
        alert('JOB ' + job.id + '\n\nCustomer: ' + (job.customer || '—') + '\nPhone: ' + (job.phone || '—') + '\nDevice: ' + (job.device || '—') + '\nS/N: ' + (job.sn || '—') + '\nFaults: ' + (job.faults || '—') + '\nAssigned: ' + (job.assignedTech || '—') + '\nStatus: ' + (job.status || '—') + costLine);
    }

    function invoice(jobId) {
        var job = findJob(jobId);
        if (!job) return;
        var text = 'Cedar3 Technology — Invoice\n---\nJob: ' + job.id + '\nClient: ' + (job.customer || '—') + '\nPhone: ' + (job.phone || '—') + '\nDevice: ' + (job.device || '—') + '\nS/N: ' + (job.sn || '—') + '\nFaults: ' + (job.faults || '—') + '\nRepair: ' + (job.techReport || '—') + '\nParts: ' + (job.partsNeeded || '—') + '\nTotal: R' + Number(job.cost || 0).toFixed(2) + '\n\nBank: FNB Cheque\nAcc: 62891042981\nBranch: 250655\nRef: ' + job.id;
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { Utils.toast('Invoice copied', 'success'); });
        else alert(text);
    }

    function sendWhatsApp(jobId, template) {
        var job = findJob(jobId);
        if (!job || !job.phone) { Utils.toast('No phone number on file', 'warn'); return; }
        var phone = String(job.phone).replace(/\D/g, '');
        if (phone.charAt(0) === '0') phone = '27' + phone.slice(1);
        var msg = '';
        if (template === 'intake') msg = 'Hi ' + job.customer + ',\n\nWe have received your ' + (job.device || 'device') + ' at Cedar3 Technology. Ref: ' + job.id + '\n\nWe will contact you with an update.';
        else if (template === 'in-progress') msg = 'Hi ' + job.customer + ',\n\nUpdate on ' + (job.device || 'device') + ' (Ref: ' + job.id + '): our technician is working on it.';
        else if (template === 'on-hold') msg = 'Hi ' + job.customer + ',\n\nWe need to pause repairs on ' + (job.device || 'device') + ' (Ref: ' + job.id + '). Please contact us.';
        else if (template === 'completed') msg = 'Hi ' + job.customer + ',\n\nGood news! ' + (job.device || 'device') + ' (Ref: ' + job.id + ') is ready for collection.\nAmount due: R' + Number(job.cost || 0).toFixed(2);
        else msg = 'Hi ' + job.customer + ',\n\nRegarding ' + job.id + ':\n\n[Message]';
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
        Utils.toast('WhatsApp opened', 'success');
    }

    function showWhatsAppMenu(event, jobId) {
        event.stopPropagation();
        var job = findJob(jobId);
        if (!job) return;
        var existing = document.getElementById('wa-menu');
        if (existing) existing.remove();
        var options = [
            { label: 'Confirm intake', template: 'intake' },
            { label: 'In progress update', template: 'in-progress' },
            { label: 'On hold / waiting parts', template: 'on-hold' },
            { label: 'Ready for pickup', template: 'completed' },
            { label: 'Custom message', template: 'custom' }
        ];
        var html = '<div id="wa-menu" class="fixed z-[100] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 min-w-[220px]" style="top:' + (event.clientY + 5) + 'px; left:' + Math.max(10, event.clientX - 200) + 'px;">';
        html += '<p class="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase border-b pb-2 mb-1">Send WhatsApp - ' + Utils.esc(job.customer) + '</p>';
        for (var i = 0; i < options.length; i++) {
            html += '<button onclick="Jobs.sendWhatsApp(\'' + jobId + '\', \'' + options[i].template + '\'); document.getElementById(\'wa-menu\').remove()" class="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 flex items-center gap-2"><i class="fa-brands fa-whatsapp text-emerald-600 w-4"></i>' + options[i].label + '</button>';
        }
        html += '</div>';
        var div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstChild);
        setTimeout(function () {
            document.addEventListener('click', function closeMenu(e) {
                var m = document.getElementById('wa-menu');
                if (m && !m.contains(e.target)) { m.remove(); document.removeEventListener('click', closeMenu); }
            });
        }, 10);
    }

    function renderPhotoPreview() {
        var grid = document.getElementById('photo-preview-grid');
        if (!grid) return;
        if (pendingPhotos.length === 0) { grid.innerHTML = '<p class="col-span-3 text-[11px] text-slate-400 italic">No photos yet.</p>'; return; }
        var html = '';
        for (var i = 0; i < pendingPhotos.length; i++) {
            html += '<div class="relative"><img src="' + pendingPhotos[i].path + '" class="w-full h-20 object-cover rounded-lg border"><button type="button" onclick="Jobs.removePhoto(' + i + ')" class="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"><i class="fa-solid fa-xmark"></i></button></div>';
        }
        grid.innerHTML = html;
    }

    async function handlePhotoUpload(event) {
        var files = event.target.files;
        if (!files || !files.length) return;
        var status = document.getElementById('photo-upload-status');
        if (status) status.textContent = 'Uploading...';
        for (var i = 0; i < files.length; i++) {
            var res = await API.uploadPhoto(files[i]);
            if (res.ok && res.data && res.data.path) { pendingPhotos.push({ path: res.data.path }); Utils.toast('Photo uploaded', 'success'); }
            else { Utils.toast('Upload failed', 'error'); }
        }
        if (status) status.textContent = '';
        event.target.value = '';
        renderPhotoPreview();
    }

    function removePhoto(i) { pendingPhotos.splice(i, 1); renderPhotoPreview(); }
    function viewPhoto(path) { window.open(path, '_blank'); }

    function openCreate() {
        editingJobId = null;
        document.getElementById('job-modal-title').innerHTML = '<i class="fa-solid fa-file-invoice text-emerald-600"></i> New Job Ticket';
        document.getElementById('job-form').reset();
        document.getElementById('job-id').value = '';
        pendingPhotos = [];
        renderPhotoPreview();
        document.getElementById('modal-job').classList.remove('hidden');
    }

    function openEdit(jobId) {
        var job = findJob(jobId);
        if (!job) return;
        editingJobId = jobId;
        document.getElementById('job-modal-title').innerHTML = '<i class="fa-solid fa-pen text-emerald-600"></i> Edit Job ' + job.id;
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
        pendingPhotos = (job.photos || []).slice();
        renderPhotoPreview();
        document.getElementById('modal-job').classList.remove('hidden');
    }

    function closeJobModal() {
        document.getElementById('modal-job').classList.add('hidden');
        editingJobId = null;
    }

    async function saveJob(e) {
        e.preventDefault();
        var jobId = document.getElementById('job-id').value.trim() || ('JOB-' + (100 + Math.floor(Math.random() * 900)));
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
            photos: pendingPhotos.slice()
        };
        if (!job.customer || !job.device) { Utils.toast('Customer and Device required', 'warn'); return; }
        var res = editingJobId ? await API.updateJob(editingJobId, job) : await API.createJob(job);
        if (res.ok) { Utils.toast(editingJobId ? 'Job updated' : 'Job created', 'success'); closeJobModal(); await refresh(); }
        else Utils.toast((res.data && res.data.error) || 'Save failed', 'error');
    }

    function openSNLookup() {
        document.getElementById('sn-search-query').value = '';
        document.getElementById('sn-history-results').innerHTML = '<p class="text-xs text-slate-400 italic text-center py-6">Enter a serial number, phone, or client name and press Lookup.</p>';
        document.getElementById('modal-sn-history').classList.remove('hidden');
    }

    async function doSNLookup() {
        var q = (document.getElementById('sn-search-query').value || '').trim();
        var container = document.getElementById('sn-history-results');
        if (!q) return;
        container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-6">Searching...</p>';
        var res = await API.lookupJobs(q);
        if (!res.ok) { container.innerHTML = '<p class="text-xs text-rose-500 text-center py-6">Lookup failed.</p>'; return; }
        var results = res.data || [];
        if (results.length === 0) { container.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-6">No matching records.</p>'; return; }
        var html = '';
        for (var i = 0; i < results.length; i++) {
            var j = results[i];
            html += '<div class="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">'
                + '<div class="flex justify-between items-start"><div><span class="font-mono font-bold text-emerald-600">' + Utils.esc(j.id) + '</span> <span class="ml-2 font-bold">' + Utils.esc(j.device) + '</span></div><span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200">' + Utils.esc(j.status) + '</span></div>'
                + '<div class="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono"><p><strong>Client:</strong> ' + Utils.esc(j.customer) + ' (' + Utils.esc(j.phone || 'N/A') + ')</p><p><strong>S/N:</strong> ' + Utils.esc(j.sn || 'N/A') + '</p></div>'
                + '</div>';
        }
        container.innerHTML = html;
    }

    return {
        refresh: refresh,
        render: render,
        changeStatus: changeStatus,
        viewJob: viewJob,
        invoice: invoice,
        openCreate: openCreate,
        openEdit: openEdit,
        closeJobModal: closeJobModal,
        saveJob: saveJob,
        openSNLookup: openSNLookup,
        doSNLookup: doSNLookup,
        sendWhatsApp: sendWhatsApp,
        showWhatsAppMenu: showWhatsAppMenu,
        deleteJob: deleteJob,
        handlePhotoUpload: handlePhotoUpload,
        removePhoto: removePhoto,
        renderPhotoPreview: renderPhotoPreview,
        viewPhoto: viewPhoto
    };
})();
