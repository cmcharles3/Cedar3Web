const express = require('express');
const router = express.Router();
const { db, save, audit } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', requireAuth, (req, res) => {
    if (req.user.role === 'admin' || req.query.all === '1') return res.json(db.sessions);
    const own = db.sessions[req.user.sub];
    res.json(own ? { [req.user.sub]: own } : {});
});

router.post('/clock-in', requireAuth, (req, res) => {
    const username = req.user.sub;
    if (db.sessions[username]) return res.status(409).json({ error: 'Already clocked in' });
    db.sessions[username] = { clockInTime: new Date().toISOString(), jobId: req.body.jobId || 'GENERAL' };
    save();
    audit(username, 'CLOCK_IN', { jobId: req.body.jobId });
    res.json({ ok: true, session: db.sessions[username] });
});

router.post('/clock-out', requireAuth, (req, res) => {
    const username = req.user.sub;
    const session = db.sessions[username];
    if (!session) return res.status(409).json({ error: 'Not clocked in' });
    const end = new Date();
    const hours = Math.max((end - new Date(session.clockInTime)) / 3600000, 0.001);
    const emp = db.employees[username];
    const earned = hours * (emp ? emp.hourlyRate : 0);
    const log = { id: 'LOG-'+Date.now(), employee: username, clockIn: session.clockInTime, clockOut: end.toISOString(), hoursWorked: hours, earnedAmount: earned, tasks: req.body.tasks || '' };
    db.logs.unshift(log);
    delete db.sessions[username];
    save();
    audit(username, 'CLOCK_OUT', { hours });
    res.json({ ok: true, log });
});

router.post('/force-out/:username', requireAuth, requireAdmin, (req, res) => {
    delete db.sessions[req.params.username];
    save();
    audit(req.user.sub, 'ADMIN_FORCE_ACTION', { target: req.params.username });
    res.json({ ok: true });
});

// ==============================================
// AUTO CLOCK-OUT at 17:05 (17:00 recorded)
// ==============================================

const SHIFT_START_HOUR = 8;
const SHIFT_END_HOUR = 17;
const GRACE_MINUTES = 5;

function autoClockOutStaleSessions() {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Only run between 17:05 and 23:59 to prevent accidental early firing
    if (now.getHours() < SHIFT_END_HOUR || (now.getHours() === SHIFT_END_HOUR && now.getMinutes() < GRACE_MINUTES)) {
        return { processed: 0 };
    }

    const cutoffTime = new Date(now);
    cutoffTime.setHours(SHIFT_END_HOUR, 0, 0, 0); // 17:00:00 exactly

    let processed = 0;

    Object.keys(db.sessions).forEach(function (username) {
        const session = db.sessions[username];
        if (!session || !session.clockInTime) return;

        const clockInDate = new Date(session.clockInTime);

        // Only auto-clock-out sessions started today
        if (clockInDate.toISOString().slice(0, 10) !== todayStr) return;

        // Only auto-clock-out if they clocked in BEFORE 17:00 (a normal shift)
        if (clockInDate >= cutoffTime) return;

        // Calculate hours worked from clock-in to 17:00 (NOT 17:05 â€” the grace period is discarded)
        const hoursWorked = Math.max((cutoffTime - clockInDate) / 3600000, 0.001);
        const emp = db.employees[username];
        const earned = hoursWorked * (emp ? emp.hourlyRate : 0);

        const log = {
            id: 'LOG-' + Date.now() + '-' + username,
            employee: username,
            clockIn: session.clockInTime,
            clockOut: cutoffTime.toISOString(),  // â† 17:00, not 17:05
            hoursWorked: hoursWorked,
            earnedAmount: earned,
            tasks: session.jobId === 'GENERAL' ? 'Auto clock-out: end of shift' : 'Auto clock-out at end of shift for job ' + session.jobId,
            autoClockOut: true
        };
        db.logs.unshift(log);
        delete db.sessions[username];
        save();
        audit('system', 'AUTO_CLOCK_OUT', {
            employee: username,
            hours: hoursWorked,
            recordedClockOut: cutoffTime.toISOString(),
            note: 'Auto clock-out â€” exceeded 17:00 shift end'
        });
        processed++;
    });

    if (processed > 0) {
        console.log('âœ“ Auto clocked out ' + processed + ' session(s) at 17:00');
    }

    return { processed: processed };
}

// Run the check every 60 seconds
setInterval(autoClockOutStaleSessions, 60000);

// Also expose an endpoint so the client can trigger it (in case PM2 restarts during the day)
router.post('/auto-check', (req, res) => {
    const result = autoClockOutStaleSessions();
    res.json({ ok: true, processed: result.processed });
});



module.exports = router;

