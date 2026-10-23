const express = require('express');
const router = express.Router();
const { db, save, audit } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// GET /api/schedule — all schedule items
// Admin sees all; others see their own + job-linked ones
router.get('/', requireAuth, (req, res) => {
    if (req.user.role === 'admin') return res.json(db.schedule);
    const mine = db.schedule.filter(s =>
        s.assignedTo === req.user.sub || s.jobId
    );
    res.json(mine);
});

// GET /api/schedule/due — items due now or overdue (for badge + toast)
router.get('/due', requireAuth, (req, res) => {
    const now = new Date();
    const items = db.schedule.filter(s => {
        if (s.completed) return false;
        if (req.user.role !== 'admin' && s.assignedTo !== req.user.sub && !s.jobId) return false;
        const dueAt = new Date(s.date + 'T' + s.time);
        return dueAt <= now;
    });
    res.json(items);
});

// GET /api/schedule/today — items for today
router.get('/today', requireAuth, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const items = db.schedule.filter(s => {
        if (s.date !== today) return false;
        if (req.user.role !== 'admin' && s.assignedTo !== req.user.sub && !s.jobId) return false;
        return true;
    });
    items.sort((a, b) => a.time.localeCompare(b.time));
    res.json(items);
});

// POST /api/schedule — create new item
router.post('/', requireAuth, (req, res) => {
    const item = req.body;
    if (!item || !item.title || !item.date || !item.time) {
        return res.status(400).json({ error: 'Title, date, and time are required' });
    }
    const newItem = {
        id: 'SCH-' + Date.now(),
        title: item.title,
        type: item.type || 'task',
        date: item.date,
        time: item.time,
        priority: item.priority || 'normal',
        notifyCharles: !!item.notifyCharles,
        jobId: item.jobId || null,
        notes: item.notes || '',
        assignedTo: item.assignedTo || req.user.sub,
        createdBy: req.user.sub,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString()
    };
    db.schedule.push(newItem);
    save();
    audit(req.user.sub, 'SCHEDULE_CREATED', { id: newItem.id, title: newItem.title, priority: newItem.priority });
    res.json({ ok: true, item: newItem });
});

// PATCH /api/schedule/:id — update
router.patch('/:id', requireAuth, (req, res) => {
    const item = db.schedule.find(s => s.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    ['title', 'type', 'date', 'time', 'priority', 'notifyCharles', 'jobId', 'notes', 'assignedTo'].forEach(k => {
        if (req.body[k] !== undefined) item[k] = req.body[k];
    });
    item.updatedAt = new Date().toISOString();
    save();
    audit(req.user.sub, 'SCHEDULE_UPDATED', { id: item.id });
    res.json({ ok: true, item });
});

// POST /api/schedule/:id/complete
router.post('/:id/complete', requireAuth, (req, res) => {
    const item = db.schedule.find(s => s.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    item.completed = true;
    item.completedAt = new Date().toISOString();
    item.completedBy = req.user.sub;
    save();
    audit(req.user.sub, 'SCHEDULE_COMPLETED', { id: item.id, title: item.title });
    res.json({ ok: true, item });
});

// POST /api/schedule/:id/reopen
router.post('/:id/reopen', requireAuth, (req, res) => {
    const item = db.schedule.find(s => s.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    item.completed = false;
    item.completedAt = null;
    save();
    res.json({ ok: true, item });
});

// DELETE /api/schedule/:id
router.delete('/:id', requireAuth, (req, res) => {
    const idx = db.schedule.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Item not found' });
    const item = db.schedule[idx];
    if (item.createdBy !== req.user.sub && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only creator or admin can delete' });
    }
    db.schedule.splice(idx, 1);
    save();
    audit(req.user.sub, 'SCHEDULE_DELETED', { id: item.id, title: item.title });
    res.json({ ok: true });
});

// ============== DAILY SUMMARY ==============

// GET /api/schedule/summary/generate — generate today's summary (called at 5 PM or manually)
router.get('/summary/generate', requireAuth, requireAdmin, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const todayStart = new Date(today + 'T00:00:00Z');

    // Jobs created today
    const jobsToday = db.jobs.filter(j => j.createdAt && j.createdAt.slice(0, 10) === today).length;
    // Jobs updated today
    const jobsUpdated = db.jobs.filter(j => j.updatedAt && j.updatedAt.slice(0, 10) === today).length;
    // Jobs completed today
    const jobsCompleted = db.jobs.filter(j => j.status === 'Completed' && j.updatedAt && j.updatedAt.slice(0, 10) === today).length;

    // Schedule items
    const todayItems = db.schedule.filter(s => s.date === today);
    const completedItems = todayItems.filter(s => s.completed).length;
    const pendingItems = todayItems.filter(s => !s.completed).length;

    // Time logs today
    const todayLogs = db.logs.filter(l => l.clockIn && l.clockIn.slice(0, 10) === today);
    const totalHours = todayLogs.reduce((sum, l) => sum + (l.hoursWorked || 0), 0);

    // Inventory alerts
    const lowStock = db.inventory.filter(i => i.qty > 0 && i.qty <= i.minQty).length;
    const outOfStock = db.inventory.filter(i => i.qty === 0).length;

    // Inventory sales today
    const salesToday = db.inventorySales.filter(s => s.ts && s.ts.slice(0, 10) === today);
    const revenueToday = salesToday.reduce((sum, s) => sum + (s.total || 0), 0);

    // Critical schedule items still pending
    const criticalPending = todayItems.filter(s => !s.completed && s.priority === 'critical').length;

    const summary = {
        id: 'SUM-' + Date.now(),
        date: today,
        jobsCreated: jobsToday,
        jobsUpdated: jobsUpdated,
        jobsCompleted: jobsCompleted,
        scheduleTotal: todayItems.length,
        scheduleCompleted: completedItems,
        schedulePending: pendingItems,
        scheduleCriticalPending: criticalPending,
        technicianHours: Math.round(totalHours * 100) / 100,
        lowStockAlerts: lowStock,
        outOfStockAlerts: outOfStock,
        inventoryRevenue: revenueToday,
        generatedAt: new Date().toISOString(),
        generatedBy: req.user.sub
    };

    // Save it
    db.dailySummaries.unshift(summary);
    save();
    audit(req.user.sub, 'DAILY_SUMMARY_GENERATED', { date: today });
    res.json(summary);
});

// GET /api/schedule/summary/text — returns formatted text for WhatsApp
router.get('/summary/text', requireAuth, requireAdmin, (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const todayItems = db.schedule.filter(s => s.date === today);
    const jobsToday = db.jobs.filter(j => j.createdAt && j.createdAt.slice(0, 10) === today).length;
    const jobsCompleted = db.jobs.filter(j => j.status === 'Completed' && j.updatedAt && j.updatedAt.slice(0, 10) === today).length;
    const completedItems = todayItems.filter(s => s.completed).length;
    const pendingItems = todayItems.filter(s => !s.completed).length;
    const criticalPending = todayItems.filter(s => !s.completed && s.priority === 'critical').length;
    const todayLogs = db.logs.filter(l => l.clockIn && l.clockIn.slice(0, 10) === today);
    const totalHours = todayLogs.reduce((sum, l) => sum + (l.hoursWorked || 0), 0);
    const lowStock = db.inventory.filter(i => i.qty > 0 && i.qty <= i.minQty).length;
    const outOfStock = db.inventory.filter(i => i.qty === 0).length;

    const text = '📊 Cedar3 Daily Summary — ' + today + '\n'
        + '\n🔧 JOBS\n'
        + '• Created: ' + jobsToday + '\n'
        + '• Completed: ' + jobsCompleted + '\n'
        + '\n📅 SCHEDULE\n'
        + '• Completed: ' + completedItems + '\n'
        + '• Pending: ' + pendingItems + '\n'
        + (criticalPending > 0 ? '• ⚠ CRITICAL PENDING: ' + criticalPending + '\n' : '')
        + '\n⏱ TECHNICIANS\n'
        + '• Hours logged: ' + totalHours.toFixed(2) + '\n'
        + '\n📦 INVENTORY\n'
        + '• Low stock: ' + lowStock + '\n'
        + '• Out of stock: ' + outOfStock + '\n'
        + '\n— Cedar3 Workshop System';

    res.json({ text: text });
});

module.exports = router;
