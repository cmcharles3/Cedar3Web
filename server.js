require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Simple request logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        if (req.path.startsWith('/api/')) {
            console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
        }
    });
    next();
});

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/jobs', require('./src/routes/jobs.routes'));
app.use('/api/logs', require('./src/routes/logs.routes'));
app.use('/api/sessions', require('./src/routes/sessions.routes'));
app.use('/api/audit', require('./src/routes/audit.routes'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('  Cedar3 Technology - Web Server');
    console.log('========================================');
    console.log(`  Port: ${PORT}`);
    console.log('');
    console.log('  Access URLs:');
    const nets = os.networkInterfaces();
    console.log(`    Local:   http://localhost:${PORT}`);
    Object.keys(nets).forEach(name => {
        nets[name].forEach(net => {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`    LAN:     http://${net.address}:${PORT}   (${name})`);
            }
        });
    });
    console.log('');
    console.log('  Press Ctrl+C to stop.');
    console.log('========================================');
    console.log('');
});