require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Serve static files from project root
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'data', 'uploads')));

// API Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/jobs', require('./src/routes/jobs.routes'));
app.use('/api/sessions', require('./src/routes/sessions.routes'));
app.use('/api/logs', require('./src/routes/logs.routes'));
app.use('/api/audit', require('./src/routes/audit.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));
app.use('/api/upload', require('./src/routes/upload.routes'));
app.use('/api/inventory', require('./src/routes/inventory.routes'));
app.use('/api/schedule', require('./src/routes/schedule.routes'));


app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// SPA Fallback
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('  Cedar3 Technology - Web Server');
    console.log('========================================');
    console.log(`  Port: ${PORT}`);
    console.log(`  Login: http://localhost:${PORT}/login.html`);
    console.log('========================================');
});