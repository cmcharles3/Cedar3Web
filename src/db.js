const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'workshop-db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- Default database ----------
function defaultDB() {
    return {
        version: 1,
        createdAt: new Date().toISOString(),
        employees: {
            reception: {
                username: 'reception',
                displayName: 'Receptionist',
                role: 'technician',
                pin: null,
                hourlyRate: 5000 / 221,
                monthlyRate: 5000
            },
            talent: {
                username: 'talent',
                displayName: 'Talent',
                role: 'technician',
                pin: null,
                hourlyRate: 6000 / 221,
                monthlyRate: 6000
            },
            simba: {
                username: 'simba',
                displayName: 'Simba',
                role: 'technician',
                pin: null,
                hourlyRate: 4500 / 221,
                monthlyRate: 4500
            }
        },
        admins: {
            charles: {
                username: 'charles',
                displayName: 'Charles',
                role: 'admin',
                passwordHash: null
            }
        },
        jobs: [],
        logs: [],
        sessions: {},
        auditLog: []
    };
}

// ---------- Load or create ----------
let db;
if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        console.log('✓ Loaded database');
    } catch (e) {
        console.error('✗ Corrupt DB, backing up and starting fresh');
        fs.renameSync(DB_FILE, DB_FILE + '.broken.' + Date.now());
        db = defaultDB();
    }
} else {
    db = defaultDB();
    console.log('✓ Created new database');
}

// ---------- First-boot secrets ----------
if (db.admins.charles.passwordHash === null) {
    const pw = process.env.ADMIN_PASSWORD || 'change-me-later';
    db.admins.charles.passwordHash = bcrypt.hashSync(pw, 10);
    console.log('✓ Admin password set from .env');
}

const TECH_PINS = { reception: '1243', talent: '1234', simba: '1212' };
for (const [user, pin] of Object.entries(TECH_PINS)) {
    if (db.employees[user] && db.employees[user].pin === null) {
        db.employees[user].pin = bcrypt.hashSync(pin, 10);
        console.log(`✓ PIN set for ${user}`);
    }
}

// ---------- Persistence (debounced writes) ----------
let saveTimer = null;
function save() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        try {
            const tmp = DB_FILE + '.tmp';
            fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
            fs.renameSync(tmp, DB_FILE);
        } catch (e) {
            console.error('✗ DB save failed:', e.message);
        } finally {
            saveTimer = null;
        }
    }, 200);
}

function saveNow() {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
}

// ---------- Audit log ----------
function audit(actor, action, details = {}) {
    const entry = {
        ts: new Date().toISOString(),
        actor: actor || 'system',
        action,
        details
    };
    db.auditLog.unshift(entry);
    if (db.auditLog.length > 5000) db.auditLog.length = 5000;
    save();

    try {
        fs.appendFileSync(path.join(DATA_DIR, 'audit.log'), JSON.stringify(entry) + '\n');
    } catch (e) { /* silent */ }

    return entry;
}

module.exports = { db, save, saveNow, audit, DB_FILE, DATA_DIR };