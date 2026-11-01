
// ============================================
// Cedar3 — API Client (server-backed)
// ============================================

window.API = (function () {
    var BASE = window.CONFIG.API_BASE;

    function getToken() { return localStorage.getItem(window.CONFIG.TOKEN_KEY); }
    function getUser() {
        try { return JSON.parse(localStorage.getItem(window.CONFIG.USER_KEY) || 'null'); } catch (e) { return null; }
    }
    function setSession(token, user) {
        localStorage.setItem(window.CONFIG.TOKEN_KEY, token);
        localStorage.setItem(window.CONFIG.USER_KEY, JSON.stringify(user));
    }
    function clearSession() {
        localStorage.removeItem(window.CONFIG.TOKEN_KEY);
        localStorage.removeItem(window.CONFIG.USER_KEY);
    }
    function isLoggedIn() { return !!getToken() && !!getUser(); }

    async function request(path, options) {
        options = options || {};
        var headers = { 'Content-Type': 'application/json' };
        var token = getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;

        var response;
        try {
            response = await fetch(BASE + path, {
                method: options.method || 'GET',
                headers: headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
        } catch (networkErr) {
            return { ok: false, offline: true, error: 'Network error: ' + networkErr.message };
        }

        var data = null;
        try { data = await response.json(); } catch (e) {}

        if (response.status === 401) {
            clearSession();
            if (window.location.pathname.indexOf('login.html') === -1) {
                window.location.href = window.CONFIG.LOGIN_PAGE;
            }
            return { ok: false, unauthorized: true, error: 'Session expired' };
        }

        return { ok: response.ok, status: response.status, data: data };
    }

    return {
        isLoggedIn: isLoggedIn,
        getUser: getUser,
        getToken: getToken,
        setSession: setSession,
        clearSession: clearSession,

        async loginAdmin(username, password) {
            var res = await request('/api/auth/admin', { method: 'POST', body: { username: username, password: password } });
            if (res.ok && res.data) setSession(res.data.token, res.data.user);
            return res;
        },

        async loginTech(username, pin) {
            var res = await request('/api/auth/tech', { method: 'POST', body: { username: username, pin: pin } });
            if (res.ok && res.data) setSession(res.data.token, res.data.user);
            return res;
        },

        logout: function () {
            clearSession();
            window.location.href = window.CONFIG.LOGIN_PAGE;
        },

        async getHealth() { return request('/api/health'); },

        async getSessions(all) { return request('/api/sessions' + (all ? '?all=1' : '')); },
        async clockIn(jobId) { return request('/api/sessions/clock-in', { method: 'POST', body: { jobId: jobId } }); },
        async clockOut(tasks) { return request('/api/sessions/clock-out', { method: 'POST', body: { tasks: tasks } }); },
        async forceClockOut(username) { return request('/api/sessions/force-out/' + username, { method: 'POST' }); },

        async getJobs(all) { return request('/api/jobs' + (all ? '?all=1' : '')); },
        async lookupJobs(query) { return request('/api/jobs/lookup?q=' + encodeURIComponent(query)); },
        async createJob(job) { return request('/api/jobs', { method: 'POST', body: job }); },
        async updateJob(id, patch) { return request('/api/jobs/' + encodeURIComponent(id), { method: 'PATCH', body: patch }); },
        async deleteJob(id) { return request('/api/jobs/' + encodeURIComponent(id), { method: 'DELETE' }); },

        async getLogs(all) { return request('/api/logs' + (all ? '?all=1' : '')); },
        async getAudit(limit) { return request('/api/audit?limit=' + (limit || 200)); },

        async backupDB() {
            var token = getToken();
            var response = await fetch(BASE + '/api/admin/backup', { headers: { 'Authorization': 'Bearer ' + token } });
            if (!response.ok) throw new Error('Backup failed');
            return response.blob();
        },

        async restoreDB(dbData) { return request('/api/admin/restore', { method: 'POST', body: dbData }); },

        async uploadPhoto(file) {
            var formData = new FormData();
            formData.append('photo', file);
            var token = getToken();
            var response = await fetch(BASE + '/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token }, body: formData });
            var data = null;
            try { data = await response.json(); } catch (e) {}
            return { ok: response.ok, status: response.status, data: data };
        },

        // ========== INVENTORY ==========
        async getInventory() { return request('/api/inventory'); },
        async getLowStock() { return request('/api/inventory/low'); },
        async createInventoryItem(item) { return request('/api/inventory', { method: 'POST', body: item }); },
        async updateInventoryItem(id, patch) { return request('/api/inventory/' + encodeURIComponent(id), { method: 'PATCH', body: patch }); },
        async deleteInventoryItem(id, force) { return request('/api/inventory/' + encodeURIComponent(id) + (force ? '?force=1' : ''), { method: 'DELETE' }); },
        async restockItem(id, data) { return request('/api/inventory/' + encodeURIComponent(id) + '/restock', { method: 'POST', body: data }); },
        async sellItem(id, data) { return request('/api/inventory/' + encodeURIComponent(id) + '/sell', { method: 'POST', body: data }); },
        async getInventorySales() { return request('/api/inventory/history/sales'); },
        async getInventoryPurchases() { return request('/api/inventory/history/purchases'); },
        async getInventorySummary() { return request('/api/inventory/reports/summary'); },
        async reconcileItem(id, data) { return request('/api/inventory/' + encodeURIComponent(id) + '/reconcile', { method: 'POST', body: data }); },
        async getReconciliations() { return request('/api/inventory/history/reconciliations'); },
                // ========== SCHEDULE ==========
        async getSchedule() { return request('/api/schedule'); },
        async getDueItems() { return request('/api/schedule/due'); },
        async getTodayItems() { return request('/api/schedule/today'); },
        async createScheduleItem(item) { return request('/api/schedule', { method: 'POST', body: item }); },
        async updateScheduleItem(id, patch) { return request('/api/schedule/' + encodeURIComponent(id), { method: 'PATCH', body: patch }); },
        async completeScheduleItem(id) { return request('/api/schedule/' + encodeURIComponent(id) + '/complete', { method: 'POST' }); },
        async reopenScheduleItem(id) { return request('/api/schedule/' + encodeURIComponent(id) + '/reopen', { method: 'POST' }); },
        async deleteScheduleItem(id) { return request('/api/schedule/' + encodeURIComponent(id), { method: 'DELETE' }); },
        async generateDailySummary() { return request('/api/schedule/summary/generate'); },
        async getDailySummaryText() { return request('/api/schedule/summary/text'); }
    };
})();
