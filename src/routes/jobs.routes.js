const express = require('express');
const router = express.Router();
const { db, save } = require('../db');
const audit = require('../audit');
const { requireAuth, filterOwnership } = require('../middleware/authMiddleware');

// GET /api/jobs/lookup?q=xxx  — MUST come before /:id style routes
router.get('/lookup', requireAuth, (req, res) => {
    const q = String(req.query.q || '').toLowerCase().trim();
    if (!q) return res.json([]);

    const visible = filterOwnership(req, db.jobs, 'assignedTech');
    const results = visible.filter(function (j) {
        return (j.sn && j.sn.toLowerCase().indexOf(q) !== -1)
            || (j.phone && j.phone.toLowerCase().indexOf(q) !== -1)
            || (j.customer && j.customer.toLowerCase().indexOf(q) !== -1)
            || (j.device && j.device.toLowerCase().indexOf(q) !== -1)
            || (j.id && j.id.toLowerCase().indexOf(q) !== -1);
    });
    res.json(results);
});

// GET /api/jobs — list
router.get('/', requireAuth, (req, res) => {
    const visible = filterOwnership(req, db.jobs, 'assignedTech');
    res.json(visible);
});

// POST /api/jobs — create
router.post('/', requireAuth, (req, res) => {
    const job = req.body;
    if (!job || !job.id) return res.status(400).json({ error: 'Missing job id' });

    job.createdAt = new Date().toISOString();
    job.createdBy = req.user.sub;
    db.jobs.push(job);
    save();

    audit.jobCreated(req.user.sub, { jobId: job.id, customer: job.customer });
    res.json({ ok: true, job });
});

// PATCH /api/jobs/:id — update
router.patch('/:id', requireAuth, (req, res) => {
    const job = db.jobs.find(function (j) { return j.id === req.params.id; });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    Object.assign(job, req.body, {
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.sub
    });
    save();

    audit.jobUpdated(req.user.sub, { jobId: job.id, changes: Object.keys(req.body) });
    res.json({ ok: true, job });
});

module.exports = router;