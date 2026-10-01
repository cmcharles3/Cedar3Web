const express = require('express');
const router = express.Router();
const { loginAdmin, loginTechnician } = require('../auth');
const audit = require('../audit');

// Admin login
router.post('/admin', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const result = loginAdmin(username, password);
    if (!result.ok) {
        audit.loginFailed(`admin:${username}`, { reason: result.reason, ip: req.ip });
        return res.status(401).json({ error: result.reason });
    }

    audit.login(`admin:${username}`, { ip: req.ip });
    res.json({ token: result.token, user: result.user });
});

// Technician login (PIN only — no device ID needed)
router.post('/tech', (req, res) => {
    const { username, pin } = req.body || {};
    if (!username || !pin) return res.status(400).json({ error: 'Missing username or pin' });

    const result = loginTechnician(username, pin);
    if (!result.ok) {
        audit.loginFailed(`tech:${username}`, { reason: result.reason, ip: req.ip });
        return res.status(401).json({ error: result.reason });
    }

    audit.login(`tech:${username}`, { ip: req.ip });
    res.json({ token: result.token, user: result.user });
});

module.exports = router;