const express = require('express');
const router = express.Router();
const { db, save, audit } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// ============== ITEMS ==============

// GET /api/inventory — list all items
router.get('/', requireAuth, (req, res) => {
    res.json(db.inventory);
});

// GET /api/inventory/low — items below threshold (for header badge)
router.get('/low', requireAuth, (req, res) => {
    const low = db.inventory.filter(it => it.qty <= it.minQty);
    res.json({ count: low.length, items: low });
});

// POST /api/inventory — create new item
router.post('/', requireAuth, requireAdmin, (req, res) => {
    const item = req.body;
    if (!item || !item.sku || !item.name) {
        return res.status(400).json({ error: 'SKU and name required' });
    }
    if (db.inventory.find(i => i.sku === item.sku)) {
        return res.status(409).json({ error: 'SKU already exists' });
    }
    const newItem = {
        id: 'INV-' + Date.now(),
        sku: item.sku,
        name: item.name,
        category: item.category || 'Other',
        unit: item.unit || 'each',
        qty: Number(item.qty) || 0,
        minQty: Number(item.minQty) || 3,
        costPrice: Number(item.costPrice) || 0,
        sellPrice: Number(item.sellPrice) || 0,
        supplier: item.supplier || '',
        location: item.location || '',
        notes: item.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    db.inventory.push(newItem);
    save();
    audit(req.user.sub, 'INVENTORY_ITEM_CREATED', { sku: newItem.sku, name: newItem.name });
    res.json({ ok: true, item: newItem });
});

// PATCH /api/inventory/:id — edit item
router.patch('/:id', requireAuth, requireAdmin, (req, res) => {
    const item = db.inventory.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    ['sku', 'name', 'category', 'unit', 'minQty', 'costPrice', 'sellPrice', 'supplier', 'location', 'notes'].forEach(k => {
        if (req.body[k] !== undefined) item[k] = req.body[k];
    });
    item.updatedAt = new Date().toISOString();
    save();
    audit(req.user.sub, 'INVENTORY_ITEM_UPDATED', { sku: item.sku });
    res.json({ ok: true, item });
});

// DELETE /api/inventory/:id — delete item (admin only, warns about history)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
    const idx = db.inventory.findIndex(i => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Item not found' });
    const item = db.inventory[idx];
    const historyCount = db.inventorySales.filter(s => s.itemId === item.id).length
                      + db.inventoryPurchases.filter(p => p.itemId === item.id).length;
    if (historyCount > 0 && req.query.force !== '1') {
        return res.status(409).json({ error: 'Item has transaction history. Pass ?force=1 to delete anyway.' });
    }
    db.inventory.splice(idx, 1);
    save();
    audit(req.user.sub, 'INVENTORY_ITEM_DELETED', { sku: item.sku, hadHistory: historyCount > 0 });
    res.json({ ok: true });
});

// ============== RESTOCK (PURCHASES) ==============

// POST /api/inventory/:id/restock
router.post('/:id/restock', requireAuth, requireAdmin, (req, res) => {
    const item = db.inventory.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const qty = Number(req.body.qty);
    if (!qty || qty <= 0) return res.status(400).json({ error: 'Qty must be positive' });
    const unitCost = Number(req.body.unitCost) || item.costPrice;
    const purchase = {
        id: 'PO-' + Date.now(),
        itemId: item.id,
        sku: item.sku,
        qty: qty,
        unitCost: unitCost,
        total: qty * unitCost,
        supplier: req.body.supplier || item.supplier,
        invoice: req.body.invoice || '',
        purchasedBy: req.user.sub,
        ts: new Date().toISOString()
    };
    db.inventoryPurchases.push(purchase);
    item.qty += qty;
    item.lastRestock = purchase.ts;
    item.updatedAt = purchase.ts;
    // If this restock changes cost price (new supplier rate), update item's costPrice
    if (req.body.unitCost && Number(req.body.unitCost) !== item.costPrice) {
        item.costPrice = Number(req.body.unitCost);
    }
    save();
    audit(req.user.sub, 'INVENTORY_RESTOCK', { sku: item.sku, qty: qty, cost: unitCost });
    res.json({ ok: true, item, purchase });
});

// ============== SALES / USAGE ==============

// POST /api/inventory/:id/sell — deduct stock for a sale OR repair use
// Body: { qty, unitPrice?, client?, jobId?, type? }
// type: 'sale' (default) or 'repair-use'
router.post('/:id/sell', requireAuth, (req, res) => {
    const item = db.inventory.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const qty = Number(req.body.qty);
    if (!qty || qty <= 0) return res.status(400).json({ error: 'Qty must be positive' });
    if (qty > item.qty) return res.status(400).json({ error: 'Insufficient stock. Available: ' + item.qty });

    const type = req.body.type === 'repair-use' ? 'repair-use' : 'sale';
    const unitPrice = type === 'repair-use'
        ? (Number(req.body.unitPrice) || item.costPrice)  // charge internal cost for repair-use
        : (Number(req.body.unitPrice) || item.sellPrice);

    const sale = {
        id: 'SALE-' + Date.now(),
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        qty: qty,
        unitPrice: unitPrice,
        total: qty * unitPrice,
        unitCost: item.costPrice,
        profit: qty * (unitPrice - item.costPrice),
        client: req.body.client || (type === 'repair-use' ? 'Internal' : 'Walk-in'),
        jobId: req.body.jobId || null,
        type: type,
        soldBy: req.user.sub,
        ts: new Date().toISOString()
    };
    db.inventorySales.push(sale);
    item.qty -= qty;
    item.updatedAt = sale.ts;
    save();
    audit(req.user.sub, 'INVENTORY_SOLD', { sku: item.sku, qty: qty, type: type, jobId: req.body.jobId });
    res.json({ ok: true, item, sale });
});

// ============== HISTORY & REPORTS ==============

// GET /api/inventory/history/sales — all sales and repair uses
router.get('/history/sales', requireAuth, (req, res) => {
    // newest first
    const sorted = db.inventorySales.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
    res.json(sorted);
});

// GET /api/inventory/history/purchases — all restocks
router.get('/history/purchases', requireAuth, (req, res) => {
    const sorted = db.inventoryPurchases.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
    res.json(sorted);
});

// GET /api/inventory/reports/summary — revenue, profit, month-to-date
router.get('/reports/summary', requireAuth, requireAdmin, (req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalSoldUnits = 0;
    let repairUnits = 0;
    let salesUnits = 0;
    let monthRevenue = 0;
    let monthProfit = 0;

    db.inventorySales.forEach(s => {
        totalRevenue += s.total || 0;
        totalProfit += s.profit || 0;
        totalSoldUnits += s.qty || 0;
        if (s.type === 'repair-use') repairUnits += s.qty || 0;
        else salesUnits += s.qty || 0;

        if (new Date(s.ts) >= startOfMonth) {
            monthRevenue += s.total || 0;
            monthProfit += s.profit || 0;
        }
    });

    let purchaseCost = 0;
    db.inventoryPurchases.forEach(p => { purchaseCost += p.total || 0; });

    const lowStock = db.inventory.filter(i => i.qty <= i.minQty).length;
    const outOfStock = db.inventory.filter(i => i.qty === 0).length;
    const totalItems = db.inventory.length;
    const totalUnits = db.inventory.reduce((sum, i) => sum + (i.qty || 0), 0);
    const stockValue = db.inventory.reduce((sum, i) => sum + (i.qty || 0) * (i.costPrice || 0), 0);

    res.json({
        totalItems: totalItems,
        totalUnits: totalUnits,
        lowStock: lowStock,
        outOfStock: outOfStock,
        stockValueAtCost: stockValue,
        totalRevenue: totalRevenue,
        totalProfit: totalProfit,
        totalSoldUnits: totalSoldUnits,
        salesUnits: salesUnits,
        repairUnits: repairUnits,
        monthRevenue: monthRevenue,
        monthProfit: monthProfit,
        purchaseCost: purchaseCost
    });
});

// ============== RECONCILIATION ==============

// POST /api/inventory/:id/reconcile — record a physical count
// Body: { countedQty, note? }
router.post('/:id/reconcile', requireAuth, requireAdmin, (req, res) => {
    const item = db.inventory.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const counted = Number(req.body.countedQty);
    if (isNaN(counted) || counted < 0) return res.status(400).json({ error: 'Invalid count' });
    const variance = counted - item.qty;
    const rec = {
        id: 'REC-' + Date.now(),
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        systemQty: item.qty,
        countedQty: counted,
        variance: variance,
        note: req.body.note || '',
        reconciledBy: req.user.sub,
        ts: new Date().toISOString()
    };
    db.inventoryReconciliations.push(rec);
    item.qty = counted;
    item.updatedAt = rec.ts;
    save();
    audit(req.user.sub, 'INVENTORY_RECONCILED', { sku: item.sku, variance: variance });
    res.json({ ok: true, item, reconciliation: rec });
});

// GET /api/inventory/history/reconciliations
router.get('/history/reconciliations', requireAuth, requireAdmin, (req, res) => {
    const sorted = db.inventoryReconciliations.slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
    res.json(sorted);
});

module.exports = router;
