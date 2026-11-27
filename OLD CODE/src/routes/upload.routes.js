const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/authMiddleware');
const { audit } = require('../db');

// Ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Configure multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const unique = 'photo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + ext;
        cb(null, unique);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.indexOf(ext) === -1) {
            return cb(new Error('Only image files are allowed (jpg, png, webp, gif)'));
        }
        cb(null, true);
    }
});

// POST /api/upload — single file upload
router.post('/', requireAuth, upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const relativePath = '/uploads/' + req.file.filename;
    audit(req.user.sub, 'PHOTO_UPLOADED', { filename: req.file.filename });
    res.json({ ok: true, path: relativePath, filename: req.file.filename });
});

// DELETE /api/upload/:filename
router.delete('/:filename', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    try {
        fs.unlinkSync(filePath);
        audit(req.user.sub, 'PHOTO_DELETED', { filename: req.params.filename });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Delete failed: ' + err.message });
    }
});

module.exports = router;