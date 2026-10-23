// ============================================
// Cedar3 — Schedule & Reminders
// ============================================

window.Schedule = (function () {
    var allItems = [];
    var dueItems = [];
    var editingId = null;
    var reminderCheckInterval = null;
    var shownToastIds = {};  // Don't show the same toast twice

    function findItem(id) {
        for (var i = 0; i < allItems.length; i++) if (allItems[i].id === id) return allItems[i];
        return null;
    }

    function priorityBadge(p) {
        if (p === 'critical') return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">CRITICAL</span>';
        if (p === 'high') return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">HIGH</span>';
        if (p === 'low') return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">LOW</span>';
        return '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">NORMAL</span>';
    }

    function typeIcon(t) {
        var map = { appointment: 'fa-calendar', task: 'fa-list-check', reminder: 'fa-bell', callback: 'fa-phone' };
        return map[t] || 'fa-circle';
    }

    function itemHTML(item) {
        var isDue = !item.completed && new Date(item.date + 'T' + item.time) <= new Date();
        var isCompleted = item.completed;
        var borderClass = isCompleted ? 'border-slate-200 dark:border-slate-700 opacity-60' : (isDue ? 'border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/20' : 'border-slate-200 dark:border-slate-700');

        return '<div class="p-3 bg-white dark:bg-slate-800 rounded-xl border ' + borderClass + ' space-y-2">'
            + '<div class="flex justify-between items-start gap-2">'
            +   '<div class="flex items-start gap-2 flex-1 min-w-0">'
            +     '<input type="checkbox" ' + (isCompleted ? 'checked' : '') + ' onchange="Schedule.toggleComplete(\'' + item.id + '\')" class="mt-1 w-4 h-4 accent-emerald-600 cursor-pointer">'
            +     '<div class="min-w-0 flex-1">'
            +       '<div class="flex items-center gap-2 mb-1 flex-wrap">'
            +         '<span class="font-mono text-[10px] text-slate-500">' + item.date + ' @ ' + item.time + '</span>'
            +         priorityBadge(item.priority)
            +         (item.jobId ? '<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">' + Utils.esc(item.jobId) + '</span>' : '')
            +         (item.notifyCharles ? '<i class="fa-brands fa-whatsapp text-emerald-500 text-sm" title="Will notify Charles"></i>' : '')
            +       '</div>'
            +       '<p class="font-bold text-sm ' + (isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white') + '">' + Utils.esc(item.title) + '</p>'
            +       (item.notes ? '<p class="text-[11px] text-slate-500 mt-1">' + Utils.esc(item.notes) + '</p>' : '')
            +       '<p class="text-[10px] text-slate-400 mt-1"><i class="fa-solid ' + typeIcon(item.type) + ' mr-1"></i>' + Utils.esc(item.type) + ' · ' + Utils.esc(item.assignedTo) + '</p>'
            +     '</div>'
            +   '</div>'
            +   '<div class="flex flex-col gap-1">'
            +     (item.notifyCharles && !isCompleted ? '<button onclick="Schedule.notifyCharles(\'' + item.id + '\')" class="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-1 rounded font-semibold whitespace-nowrap"><i class="fa-brands fa-whatsapp"></i> Charles</button>' : '')
            +     '<button onclick="Schedule.openEdit(\'' + item.id + '\')" class="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded font-semibold">Edit</button>'
            +     '<button onclick="Schedule.deleteItem(\'' + item.id + '\')" class="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded font-semibold">Del</button>'
            +   '</div>'
            + '</div>'
            + '</div>';
    }

    function render() {
        var viewEl = document.getElementById('schedule-view');
        var view = viewEl ? viewEl.value : 'today';
        var today = new Date().toISOString().slice(0, 10);
        var weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

        // Filter
        var filtered = allItems.filter(function (it) {
            if (view === 'today') return it.date === today;
            if (view === 'week') return it.date >= today && it.date <= weekFromNow;
            return true;
        });
        filtered.sort(function (a, b) {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return (a.date + a.time).localeCompare(b.date + b.time);
        });

        var list = document.getElementById('schedule-items-list');
        if (filtered.length === 0) {
            list.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-6">Nothing scheduled. <button onclick="Schedule.openAdd()" class="text-emerald-600 font-bold underline">Add the first item</button></p>';
        } else {
            var html = '';
            for (var i = 0; i < filtered.length; i++) html += itemHTML(filtered[i]);
            list.innerHTML = html;
        }

        // Stats
        var todayItems = allItems.filter(function (s) { return s.date === today; });
        var completed = todayItems.filter(function (s) { return s.completed; }).length;
        var pending = todayItems.length - completed;
        var critical = todayItems.filter(function (s) { return !s.completed && s.priority === 'critical'; }).length;
        var overdue = allItems.filter(function (s) { return !s.completed && new Date(s.date + 'T' + s.time) <= new Date(); }).length;

        var statsEl = document.getElementById('schedule-stats');
        statsEl.innerHTML = ''
            + '<div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700"><p class="text-[10px] uppercase text-slate-500 font-bold">Today Total</p><p class="text-2xl font-bold text-slate-900 dark:text-white">' + todayItems.length + '</p></div>'
            + '<div class="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800"><p class="text-[10px] uppercase text-emerald-700 font-bold">Completed</p><p class="text-2xl font-bold text-emerald-600">' + completed + '</p></div>'
            + '<div class="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800"><p class="text-[10px] uppercase text-amber-700 font-bold">Pending</p><p class="text-2xl font-bold text-amber-600">' + pending + '</p></div>'
            + '<div class="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800"><p class="text-[10px] uppercase text-rose-700 font-bold">Overdue</p><p class="text-2xl font-bold text-rose-600">' + overdue + '</p></div>';

        // Header badge
        var badge = document.getElementById('schedule-badge');
        if (badge) {
            if (overdue > 0) {
                badge.textContent = overdue;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // Due Now panel
        renderDuePanel();
    }

    async function renderDuePanel() {
        var res = await API.getDueItems();
        if (!res.ok) return;
        dueItems = res.data || [];

        var panel = document.getElementById('schedule-due-panel');
        var list = document.getElementById('schedule-due-list');
        var count = document.getElementById('schedule-due-count');

        if (dueItems.length === 0) {
            panel.classList.add('hidden');
            return;
        }

        panel.classList.remove('hidden');
        count.textContent = dueItems.length + ' item(s) overdue or due now';

        var html = '';
        for (var i = 0; i < dueItems.length; i++) {
            var it = dueItems[i];
            html += '<div class="flex justify-between items-center bg-white dark:bg-slate-900 rounded-lg p-2">'
                + '<div><p class="font-bold text-xs text-slate-900 dark:text-white">' + Utils.esc(it.title) + '</p>'
                + '<p class="text-[10px] text-rose-600">Due ' + it.date + ' @ ' + it.time + ' · ' + it.priority.toUpperCase() + '</p></div>'
                + '<button onclick="Schedule.toggleComplete(\'' + it.id + '\')" class="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded font-bold">Done</button>'
                + '</div>';
        }
        list.innerHTML = html;
    }

    async function refresh() {
        var res = await API.getSchedule();
        if (!res.ok) { Utils.toast('Failed to load schedule', 'error'); return; }
        allItems = res.data || [];
        render();
        checkReminders();
    }

    function openAdd() {
        editingId = null;
        document.getElementById('schedule-modal-title').innerHTML = '<i class="fa-solid fa-calendar-plus text-emerald-600"></i> New Schedule Item';
        document.getElementById('schedule-form').reset();
        document.getElementById('sched-id').value = '';
        var now = new Date();
        var dateStr = now.toISOString().slice(0, 10);
        var nextHour = (now.getHours() + 1).toString().padStart(2, '0') + ':00';
        document.getElementById('sched-date').value = dateStr;
        document.getElementById('sched-time').value = nextHour;
        document.getElementById('sched-type').value = 'task';
        document.getElementById('sched-priority').value = 'normal';
        var user = API.getUser();
        if (user) document.getElementById('sched-assigned').value = user.username;
        document.getElementById('modal-schedule').classList.remove('hidden');
    }

    function openEdit(id) {
        var item = findItem(id);
        if (!item) return;
        editingId = id;
        document.getElementById('schedule-modal-title').innerHTML = '<i class="fa-solid fa-pen text-emerald-600"></i> Edit Schedule Item';
        document.getElementById('sched-id').value = item.id;
        document.getElementById('sched-title').value = item.title;
        document.getElementById('sched-date').value = item.date;
        document.getElementById('sched-time').value = item.time;
        document.getElementById('sched-type').value = item.type;
        document.getElementById('sched-priority').value = item.priority;
        document.getElementById('sched-assigned').value = item.assignedTo;
        document.getElementById('sched-job').value = item.jobId || '';
        document.getElementById('sched-notes').value = item.notes || '';
        document.getElementById('sched-notify').checked = !!item.notifyCharles;
        document.getElementById('modal-schedule').classList.remove('hidden');
    }

    async function save(e) {
        e.preventDefault();
        var body = {
            title: document.getElementById('sched-title').value.trim(),
            date: document.getElementById('sched-date').value,
            time: document.getElementById('sched-time').value,
            type: document.getElementById('sched-type').value,
            priority: document.getElementById('sched-priority').value,
            assignedTo: document.getElementById('sched-assigned').value,
            jobId: document.getElementById('sched-job').value.trim() || null,
            notes: document.getElementById('sched-notes').value.trim(),
            notifyCharles: document.getElementById('sched-notify').checked
        };
        if (!body.title) { Utils.toast('Title is required', 'warn'); return; }
        var res = editingId ? await API.updateScheduleItem(editingId, body) : await API.createScheduleItem(body);
        if (res.ok) {
            Utils.toast(editingId ? 'Item updated' : 'Item added', 'success');
            document.getElementById('modal-schedule').classList.add('hidden');
            await refresh();
        } else {
            Utils.toast((res.data && res.data.error) || 'Save failed', 'error');
        }
    }

    async function toggleComplete(id) {
        var item = findItem(id);
        if (!item) return;
        var res = item.completed ? await API.reopenScheduleItem(id) : await API.completeScheduleItem(id);
        if (res.ok) {
            Utils.toast(item.completed ? 'Reopened' : 'Marked complete', 'success');
            await refresh();
        }
    }

    async function deleteItem(id) {
        if (!confirm('Delete this item?')) return;
        var res = await API.deleteScheduleItem(id);
        if (res.ok) { Utils.toast('Deleted', 'success'); await refresh(); }
        else Utils.toast('Delete failed', 'error');
    }

    // ---- WhatsApp Notify Charles ----
    function notifyCharles(id) {
        var item = findItem(id);
        if (!item) return;
        var phone = window.CONFIG.CHARLES_WHATSAPP;
        var msg = '🔔 Cedar3 Alert\n\n'
            + 'Item: ' + item.title + '\n'
            + 'Priority: ' + item.priority.toUpperCase() + '\n'
            + 'Due: ' + item.date + ' @ ' + item.time + '\n'
            + (item.jobId ? 'Job: ' + item.jobId + '\n' : '')
            + (item.notes ? '\nNotes: ' + item.notes + '\n' : '')
            + '\nAssigned to: ' + item.assignedTo;
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
        Utils.toast('WhatsApp opened for Charles', 'success');
    }

    // ---- Daily Summary ----
    async function generateSummary() {
        var res = await API.generateDailySummary();
        if (!res.ok) { Utils.toast('Failed', 'error'); return; }
        var textRes = await API.getDailySummaryText();
        if (textRes.ok && textRes.data) {
            document.getElementById('schedule-summary-preview').textContent = textRes.data.text;
            Utils.toast('Summary generated', 'success');
        }
    }

    async function sendSummaryWhatsApp() {
        var res = await API.getDailySummaryText();
        if (!res.ok || !res.data) { Utils.toast('Failed to load summary', 'error'); return; }
        var phone = window.CONFIG.CHARLES_WHATSAPP;
        window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(res.data.text), '_blank');
        Utils.toast('WhatsApp opened with summary', 'success');
    }

    // ---- Reminder Engine ----
    async function checkReminders() {
        var res = await API.getDueItems();
        if (!res.ok) return;
        var items = res.data || [];
        var user = API.getUser();
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            if (shownToastIds[it.id]) continue;
            shownToastIds[it.id] = true;

            // Toast
            Utils.toast('⏰ Due: ' + it.title + ' (' + it.priority + ')', 'warn', 8000);

            // Browser notification
            if (it.notifyCharles && user && user.role === 'admin' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Cedar3: ' + it.title, {
                    body: it.priority.toUpperCase() + ' · Due ' + it.time + (it.jobId ? ' · ' + it.jobId : ''),
                    icon: '/favicon.ico'
                });
            }
        }
    }

    function startReminderEngine() {
        if (reminderCheckInterval) return;
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        reminderCheckInterval = setInterval(checkReminders, 60000);
        checkReminders();
    }

    return {
        refresh: refresh,
        render: render,
        openAdd: openAdd,
        openEdit: openEdit,
        save: save,
        toggleComplete: toggleComplete,
        deleteItem: deleteItem,
        notifyCharles: notifyCharles,
        generateSummary: generateSummary,
        sendSummaryWhatsApp: sendSummaryWhatsApp,
        startReminderEngine: startReminderEngine
    };
})();
