// ============================================
// Cedar3 Web — API Client
// All server calls go through here.
// ============================================

window.API = (function () {
    const BASE = window.CONFIG.API_BASE;

    function getToken() {
        return localStorage.getItem(window.CONFIG.TOKEN_KEY);
    }

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem(window.CONFIG.USER_KEY) || 'null');
        } catch (e) { return null; }
    }

    function setSession(token, user) {
        localStorage.setItem(window.CONFIG.TOKEN_KEY, token);
        localStorage.setItem(window.CONFIG.USER_KEY, JSON.stringify(user));
    }

    function clearSession() {
        localStorage.removeItem(window.CONFIG.TOKEN_KEY);
        localStorage.removeItem(window.CONFIG.USER_KEY);
    }

    function isLoggedIn() {
        return !!getToken() && !!getUser();
    }

    async function request(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = getToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;

        let response;
        try {
            response = await fetch(BASE + path, {
                ...options,
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined
            });
        } catch (networkErr) {
            // Network failure — could be offline
            return { ok: false, offline: true, error: 'Network error' };
        }

        let data = null;
        try { data = await response.json(); } catch (e) { /* no body */ }

        if (response.status === 401) {
            // Token expired or invalid → force re-login
            clearSession();
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = window.CONFIG.LOGIN_PAGE;
            }
            return { ok: false, unauthorized: true, error: 'Session expired' };
        }

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    }

    // ---------- Auth endpoints ----------
    return {
        isLoggedIn,
        getUser,
        getToken,
        setSession,
        clearSession,

        // Login as admin
        async loginAdmin(username, password) {
            const res = await request('/api/auth/admin', {
                method: 'POST',
                body: { username, password }
            });
            if (res.ok && res.data) {
                setSession(res.data.token, res.data.user);
            }
            return res;
        },

        // Login as technician
        async loginTech(username, pin) {
            const res = await request('/api/auth/tech', {
                method: 'POST',
                body: { username, pin }
            });
            if (res.ok && res.data) {
                setSession(res.data.token, res.data.user);
            }
            return res;
        },

        // Logout (client-side only — JWT is stateless)
        logout() {
            clearSession();
            window.location.href = window.CONFIG.LOGIN_PAGE;
        },

        // ---------- Data endpoints ----------

        async getSessions(all = false) {
            return request('/api/sessions' + (all ? '?all=1' : ''));
        },

        async clockIn(jobId) {
            return request('/api/sessions/clock-in', {
                method: 'POST',
                body: { jobId }
            });
        },

        async clockOut(tasks) {
            return request('/api/sessions/clock-out', {
                method: 'POST',
                body: { tasks }
            });
        },

        async forceClockOut(username) {
            return request('/api/sessions/force-out/' + username, { method: 'POST' });
        },

        async getJobs(all = false) {
            return request('/api/jobs' + (all ? '?all=1' : ''));
        },
		
		async lookupJobs(query) {
			return request('/api/jobs/lookup?q=' + encodeURIComponent(query));
		},

        async createJob(job) {
            return request('/api/jobs', { method: 'POST', body: job });
        },

        async updateJob(id, patch) {
            return request('/api/jobs/' + id, { method: 'PATCH', body: patch });
        },

        async getLogs(all = false) {
            return request('/api/logs' + (all ? '?all=1' : ''));
        },

        async getAudit(limit = 200) {
            return request('/api/audit?limit=' + limit);
        },

        async getHealth() {
            return request('/api/health');
        }
    };
})();