const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', requireAuth, requireAdmin, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    res.json(db.auditLog.slice(0, limit));
});

module.exports = router;