const { verifyToken } = require('../auth');

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });

    req.user = payload;
    next();
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
    }
    next();
}

/**
 * Soft isolation: techs see their own items by default.
 * Admin sees everything. Techs CAN still see all if they pass ?all=1
 * (kept simple — no hard lockout since you said privacy isn't strict).
 */
function filterOwnership(req, items, ownerField = 'employee') {
    if (req.user.role === 'admin') return items;
    if (req.query.all === '1') return items;
    return items.filter(item => item[ownerField] === req.user.sub);
}

module.exports = { requireAuth, requireAdmin, filterOwnership };