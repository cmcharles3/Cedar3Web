const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve all static files from project root
app.use(express.static(__dirname));

// Default route → login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('========================================');
    console.log('  Cedar3 Technology - Web Server');
    console.log('========================================');
    console.log(`  Local:  http://localhost:${PORT}`);
    console.log(`  Login:  http://localhost:${PORT}/login.html`);
    console.log('  Press Ctrl+C to stop.');
    console.log('========================================');
});