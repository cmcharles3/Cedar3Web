const express = require('express');
const router = express.Router();
const { db, save, audit } = require('../db');
const { requireAuth, filterOwnership } = require('../middleware/authMiddleware');

router.get('/lookup', requireAuth, (req, res) => {
    const q = String(req.query.q || '').toLowerCase().trim();
    if (!q) return res.json([]);
    const visible = filterOwnership(req, db.jobs, 'assignedTech');
    res.json(visible.filter(j =>
        (j.sn && j.sn.toLowerCase().includes(q)) ||
        (j.phone && j.phone.toLowerCase().includes(q)) ||
        (j.customer && j.customer.toLowerCase().includes(q)) ||
        (j.device && j.device.toLowerCase().includes(q)) ||
        (j.id && j.id.toLowerCase().includes(q))
    ));
});

router.get('/', requireAuth, (req, res) => {
    const userRole = req.user.role;
    const username = req.user.sub.toLowerCase();

    // 1. Admin and Receptionist see ALL jobs
    if (userRole === 'admin' || username === 'reception') {
        return res.json(db.jobs);
    }

    // 2. Technicians (Talent, Simba) only see their own jobs
    const myJobs = db.jobs.filter(j => {
        return j.assignedTech && j.assignedTech.toLowerCase() === username;
    });
    
    res.json(myJobs);
});

router.post('/', requireAuth, (req, res) => {
    const job = req.body;
    if (!job || !job.id) return res.status(400).json({ error: 'Missing job id' });
    job.createdAt = new Date().toISOString();
    job.createdBy = req.user.sub;
    db.jobs.push(job);
    save();
    audit(req.user.sub, 'JOB_CREATED', { jobId: job.id });
    res.json({ ok: true, job });
});

router.patch('/:id', requireAuth, (req, res) => {
    const job = db.jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    Object.assign(job, req.body, { updatedAt: new Date().toISOString(), updatedBy: req.user.sub });
    save();
    audit(req.user.sub, 'JOB_UPDATED', { jobId: job.id });
    res.json({ ok: true, job });
});

module.exports = router;