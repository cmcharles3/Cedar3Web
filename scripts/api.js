// ============================================
// Cedar3 — API Module (localStorage-backed)
// ============================================

window.API = (function () {

    const USERS = [
        { username: 'charles',   password: 'celine', pin: '2143', role: 'admin',      displayName: 'Charles' },
        { username: 'reception', password: '123',    pin: '1243', role: 'technician', displayName: 'Lean' },
        { username: 'talent',    password: '123',    pin: '1234', role: 'technician', displayName: 'Talent' },
        { username: 'simba',     password: '123',    pin: '1212', role: 'technician', displayName: 'Simba' }
    ];

    // ---------- Storage helpers ----------
    function read(key, fallback) {
        try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
        catch { return fallback; }
    }
    function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

    function pushAudit(action, actor, details) {
        const log = read('cedar3_audit', []);
        log.unshift({ ts: new Date().toISOString(), action, actor: actor || 'system', details: details || {} });
        write('cedar3_audit', log.slice(0, 200));
    }

    // ---------- AUTH ----------
    function loginAdmin(username, password) {
        const clean = (username || '').trim().toLowerCase();
        const saved = localStorage.getItem('cedar3_admin_pass') || 'celine';
        const valid = (clean === 'charles' || clean === 'admin') &&
                      (password === saved || password === 'celine');
        if (!valid) {
            pushAudit('LOGIN_FAILED', clean, { reason: 'bad admin credentials' });
            return { ok: false, error: 'Invalid admin username or password.' };
        }
        const session = { username: clean, role: 'admin', displayName: 'Charles' };
        write('cedar3_user', session);
        pushAudit('LOGIN', clean, { role: 'admin' });
        return { ok: true, user: session };
    }

    function loginTech(techUsername, pin) {
        const u = (techUsername || '').toLowerCase();
        const found = USERS.find(x => x.username === u && x.role === 'technician');
        if (!found) {
            pushAudit('LOGIN_FAILED', u, { reason: 'unknown tech' });
            return { ok: false, error: 'Unknown technician.' };
        }
        if (found.pin !== pin) {
            pushAudit('LOGIN_FAILED', u, { reason: 'bad PIN' });
            return { ok: false, error: 'Wrong PIN.' };
        }
        const session = { username: found.username, role: found.role, displayName: found.displayName };
        write('cedar3_user', session);
        pushAudit('LOGIN', u, { role: 'technician' });
        return { ok: true, user: session };
    }

    function isLoggedIn() { return !!localStorage.getItem('cedar3_user'); }
    function getUser() {
        try { return JSON.parse(localStorage.getItem('cedar3_user')); }
        catch { return null; }
    }
    function logout() {
        const u = getUser();
        if (u) pushAudit('LOGOUT', u.username);
        localStorage.removeItem('cedar3_user');
        window.location.href = 'login.html';
    }
    function getHealth() { return Promise.resolve({ ok: true }); }

    // ---------- SESSIONS (clock-in/out) ----------
    function getSessions() {
        return Promise.resolve({ ok: true, data: read(CONFIG.STORAGE_KEYS.SESSIONS, {}) });
    }

    function clockIn(jobId) {
        const u = getUser();
        if (!u) return Promise.resolve({ ok: false, error: 'Not logged in' });
        const sessions = read(CONFIG.STORAGE_KEYS.SESSIONS, {});
        if (sessions[u.username]) return Promise.resolve({ ok: false, error: 'Already clocked in' });
        sessions[u.username] = {
            clockInTime: new Date().toISOString(),
            jobId: jobId || 'GENERAL'
        };
        write(CONFIG.STORAGE_KEYS.SESSIONS, sessions);
        pushAudit('CLOCK_IN', u.username, { jobId });
        return Promise.resolve({ ok: true });
    }

    function clockOut(tasks) {
        const u = getUser();
        if (!u) return Promise.resolve({ ok: false, error: 'Not logged in' });
        const sessions = read(CONFIG.STORAGE_KEYS.SESSIONS, {});
        const s = sessions[u.username];
        if (!s) return Promise.resolve({ ok: false, error: 'Not clocked in' });

        const endTime = new Date();
        const hours = (endTime - new Date(s.clockInTime)) / 3600000;
        const log = {
            emp: u.username,
            startTime: s.clockInTime,
            endTime: endTime.toISOString(),
            hoursWorked: hours,
            notes: tasks || '',
            value: 0
        };
        const logs = read(CONFIG.STORAGE_KEYS.TIME_LOGS, []);
        logs.unshift(log);
        write(CONFIG.STORAGE_KEYS.TIME_LOGS, logs);

        delete sessions[u.username];
        write(CONFIG.STORAGE_KEYS.SESSIONS, sessions);
        pushAudit('CLOCK_OUT', u.username, { hours: hours.toFixed(2) });
        return Promise.resolve({ ok: true, data: { log } });
    }

    function forceClockOut(username) {
        const sessions = read(CONFIG.STORAGE_KEYS.SESSIONS, {});
        if (!sessions[username]) return Promise.resolve({ ok: false, error: 'No active session' });
        delete sessions[username];
        write(CONFIG.STORAGE_KEYS.SESSIONS, sessions);
        const u = getUser();
        pushAudit('ADMIN_FORCE_ACTION', u ? u.username : 'admin', { target: username, reason: 'remote clock-out' });
        return Promise.resolve({ ok: true });
    }

    // ---------- JOBS ----------
    function getJobs() {
        return Promise.resolve({ ok: true, data: read(CONFIG.STORAGE_KEYS.JOBS, []) });
    }

    // ---------- AUDIT ----------
    function getAudit(limit) {
        const log = read('cedar3_audit', []);
        return Promise.resolve({ ok: true, data: log.slice(0, limit || 50) });
    }

    return {
        loginAdmin, loginTech, isLoggedIn, getUser, logout, getHealth,
        getSessions, clockIn, clockOut, forceClockOut,
        getJobs, getAudit
    };
})();