const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const EXPIRY = process.env.TOKEN_EXPIRY || '12h';

function signToken(payload) {
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRY });
}

function verifyToken(token) {
    try { return jwt.verify(token, SECRET); } catch (e) { return null; }
}

function loginAdmin(username, password) {
    const admin = db.admins[username];
    if (!admin) return { ok: false, reason: 'Unknown admin' };
    if (!bcrypt.compareSync(password, admin.passwordHash)) return { ok: false, reason: 'Wrong password' };
    const token = signToken({ sub: username, role: 'admin', name: admin.displayName });
    return { ok: true, token, user: { username, role: 'admin', displayName: admin.displayName } };
}

function loginTechnician(username, pin) {
    const emp = db.employees[username];
    if (!emp) return { ok: false, reason: 'Unknown technician' };
    if (!bcrypt.compareSync(String(pin), emp.pin)) return { ok: false, reason: 'Wrong PIN' };
    const token = signToken({ sub: username, role: 'technician', name: emp.displayName });
    return { ok: true, token, user: { username, role: 'technician', displayName: emp.displayName } };
}

module.exports = { signToken, verifyToken, loginAdmin, loginTechnician };