const express = require('express');
const router = express.Router();
const { db, save } = require('../db');
const audit = require('../audit');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/sessions — admin sees all; tech sees own (or ?all=1 for all)
router.get('/', requireAuth, (req, res) => {
    if (req.user.role === 'admin' || req.query.all === '1') {
        return res.json(db.sessions);
    }
    const own = db.sessions[req.user.sub];
    res.json(own ? { [req.user.sub]: own } : {});
});

// POST /api/sessions/clock-in
router.post('/clock-in', requireAuth, (req, res) => {
    const username = req.user.sub;
    if (db.sessions[username]) {
        return res.status(409).json({ error: 'Already clocked in' });
    }
    db.sessions[username] = {
        clockInTime: new Date().toISOString(),
        jobId: req.body.jobId || 'GENERAL'
    };
    save();
    audit.clockIn(username, { jobId: req.body.jobId });
    res.json({ ok: true, session: db.sessions[username] });
});

// POST /api/sessions/clock-out
router.post('/clock-out', requireAuth, (req, res) => {
    const username = req.user.sub;
    const session = db.sessions[username];
    if (!session) return res.status(409).json({ error: 'Not clocked in' });

    const clockInDate = new Date(session.clockInTime);
    const clockOutDate = new Date();
    const hoursWorked = Math.max((clockOutDate - clockInDate) / 3600000, 0.001);
    const emp = db.employees[username];
    const earned = hoursWorked * (emp?.hourlyRate || 0);

    const logEntry = {
        id: 'LOG-' + Date.now(),
        employee: username,
        clockIn: clockInDate.toISOString(),
        clockOut: clockOutDate.toISOString(),
        hoursWorked,
        earnedAmount: earned,
        tasks: req.body.tasks || ''
    };
    db.logs.unshift(logEntry);
    delete db.sessions[username];
    save();

    audit.clockOut(username, { hours: hoursWorked, earned });
    res.json({ ok: true, log: logEntry });
});

// POST /api/sessions/force-out/:username — admin remote clock-out
router.post('/force-out/:username', requireAuth, requireAdmin, (req, res) => {
    const target = req.params.username;
    if (!db.sessions[target]) return res.status(404).json({ error: 'Not clocked in' });
    delete db.sessions[target];
    save();
    audit.adminForced(req.user.sub, { action: 'force_clock_out', target });
    res.json({ ok: true });
});

module.exports = router;