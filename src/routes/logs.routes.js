const express = require('express');
const router = express.Router();
const { db, save } = require('../db');
const audit = require('../audit');
const { requireAuth, filterOwnership } = require('../middleware/authMiddleware');

// GET /api/logs — techs see own by default; ?all=1 for all
router.get('/', requireAuth, (req, res) => {
    const visible = filterOwnership(req, db.logs, 'employee');
    res.json(visible);
});

// POST /api/logs
router.post('/', requireAuth, (req, res) => {
    const log = req.body;
    if (!log || !log.employee) return res.status(400).json({ error: 'Missing employee' });

    log.createdAt = new Date().toISOString();
    db.logs.unshift(log);
    save();

    audit.logCreated(req.user.sub, { logId: log.id, hours: log.hoursWorked });
    res.json({ ok: true, log });
});

module.exports = router;