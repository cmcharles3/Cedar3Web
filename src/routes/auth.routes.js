const express = require('express');
const router = express.Router();
const { loginAdmin, loginTechnician } = require('../auth');
const { audit } = require('../db');

router.post('/admin', (req, res) => {
    const { username, password } = req.body || {};
    const result = loginAdmin(username, password);
    if (!result.ok) { audit('admin:'+username, 'LOGIN_FAILED', { reason: result.reason }); return res.status(401).json({ error: result.reason }); }
    audit('admin:'+username, 'LOGIN');
    res.json({ token: result.token, user: result.user });
});

router.post('/tech', (req, res) => {
    const { username, pin } = req.body || {};
    const result = loginTechnician(username, pin);
    if (!result.ok) { audit('tech:'+username, 'LOGIN_FAILED', { reason: result.reason }); return res.status(401).json({ error: result.reason }); }
    audit('tech:'+username, 'LOGIN');
    res.json({ token: result.token, user: result.user });
});

module.exports = router;