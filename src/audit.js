const { audit } = require('./db');

module.exports = {
    login: (actor, meta = {}) => audit(actor, 'LOGIN', meta),
    loginFailed: (actor, meta = {}) => audit(actor, 'LOGIN_FAILED', meta),
    logout: (actor) => audit(actor, 'LOGOUT'),
    clockIn: (actor, meta = {}) => audit(actor, 'CLOCK_IN', meta),
    clockOut: (actor, meta = {}) => audit(actor, 'CLOCK_OUT', meta),
    jobCreated: (actor, meta = {}) => audit(actor, 'JOB_CREATED', meta),
    jobUpdated: (actor, meta = {}) => audit(actor, 'JOB_UPDATED', meta),
    logCreated: (actor, meta = {}) => audit(actor, 'LOG_CREATED', meta),
    adminForced: (actor, meta = {}) => audit(actor, 'ADMIN_FORCE_ACTION', meta),
    general: (actor, action, meta = {}) => audit(actor, action, meta)
};