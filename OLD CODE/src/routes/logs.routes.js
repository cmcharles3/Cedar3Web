const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, filterOwnership } = require('../middleware/authMiddleware');

router.get('/', requireAuth, (req, res) => {
    const visible = filterOwnership(req, db.logs, 'employee');
    if (req.user.role !== 'admin') {
        return res.json(visible.map(l => {
            const c = Object.assign({}, l);
            delete c.earnedAmount;
            return c;
        }));
    }
    res.json(visible);
});

module.exports = router;