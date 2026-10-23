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

module.exports = router;