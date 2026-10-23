const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'workshop-db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function defaultDB() {
    return {
        version: 1,
        createdAt: new Date().toISOString(),
        employees: {
            reception: { username: 'reception', displayName: 'Receptionist', role: 'technician', pin: null, hourlyRate: 3500/221, monthlyRate: 3500 },
            talent: { username: 'talent', displayName: 'Talent', role: 'technician', pin: null, hourlyRate: 6000/221, monthlyRate: 6000 },
            simba: { username: 'simba', displayName: 'Simba', role: 'technician', pin: null, hourlyRate: 4500/221, monthlyRate: 4500 }
        },
        admins: {
            charles: { username: 'charles', displayName: 'Charles', role: 'admin', passwordHash: null }
        },
        jobs: [],
        logs: [],
        sessions: {},
        inventory: [],
        inventorySales: [],
        inventoryPurchases: [],
        inventoryReconciliations: [],
        schedule: [],
        dailySummaries: [],
        auditLog: []
    };
}

let db;
if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        console.error('DB corrupt, starting fresh');
        db = defaultDB();
    }
} else {
    db = defaultDB();
    console.log('✓ Created new database');
}

// Init secrets if not set
if (db.admins.charles.passwordHash === null) {
    const pw = process.env.ADMIN_PASSWORD || 'celine';
    db.admins.charles.passwordHash = bcrypt.hashSync(pw, 10);
    console.log('✓ Admin password initialized from .env');
}

const TECH_PINS = { reception: '1243', talent: '1234', simba: '1212' };
for (const [user, pin] of Object.entries(TECH_PINS)) {
    if (db.employees[user] && db.employees[user].pin === null) {
        db.employees[user].pin = bcrypt.hashSync(pin, 10);
        console.log(`✓ PIN initialized for ${user}`);
    }
}

let saveTimer = null;
function save() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        try {
            fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db, null, 2));
            fs.renameSync(DB_FILE + '.tmp', DB_FILE);
        } catch (e) {
            console.error('DB save failed:', e);
        } finally {
            saveTimer = null;
        }
    }, 200);
}

function audit(actor, action, details) {
    const entry = { ts: new Date().toISOString(), actor: actor || 'system', action, details: details || {} };
    db.auditLog.unshift(entry);
    if (db.auditLog.length > 5000) db.auditLog.length = 5000;
    save();
    try {
        fs.appendFileSync(path.join(DATA_DIR, 'audit.log'), JSON.stringify(entry) + '\n');
    } catch (e) { /* silent */ }
    return entry;
}

module.exports = { db, save, audit };