const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { audit } = require('../db');

const DB_FILE = path.join(__dirname, '..', '..', 'data', 'workshop-db.json');

// GET /api/admin/backup — Downloads the database file
router.get('/backup', requireAuth, requireAdmin, (req, res) => {
    try {
        const filename = 'cedar3_backup_' + new Date().toISOString().slice(0, 10) + '.json';
        audit(req.user.sub, 'ADMIN_BACKUP', { filename });
        res.download(DB_FILE, filename);
    } catch (err) {
        res.status(500).json({ error: 'Backup failed: ' + err.message });
    }
});

// POST /api/admin/restore — Uploads a database file to replace the current one
router.post('/restore', requireAuth, requireAdmin, express.json({ limit: '50mb' }), (req, res) => {
    try {
        const newDb = req.body;
        
        // Basic validation to make sure it's a Cedar3 database
        if (!newDb || !newDb.version || !newDb.employees || !newDb.admins) {
            return res.status(400).json({ error: 'Invalid database file format.' });
        }

        // 1. Write the new file
        fs.writeFileSync(DB_FILE, JSON.stringify(newDb, null, 2));

        // 2. Force the server to crash and restart (PM2 will revive it instantly)
        // This is the safest way to reload the in-memory database without complex code.
        audit(req.user.sub, 'ADMIN_RESTORE', { note: 'Database overwritten. Restarting server.' });
        res.json({ ok: true, message: 'Database restored. Server is restarting...' });
        
        setTimeout(() => {
            process.exit(1); // PM2 will catch this and restart the server
        }, 500);
        
    } catch (err) {
        res.status(500).json({ error: 'Restore failed: ' + err.message });
    }
});

module.exports = router;