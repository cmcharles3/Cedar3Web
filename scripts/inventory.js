// ============================================
// Cedar3 — Inventory Tab (Expandable List View)
// ============================================

window.Inventory = (function () {
    var allItems = [];
    var editingItemId = null;
    var expandedItemId = null;

    function findItem(id) {
        for (var i = 0; i < allItems.length; i++) if (allItems[i].id === id) return allItems[i];
        return null;
    }

    function categoryIcon(cat) {
        var map = { 'Ink': 'fa-tint', 'Parts': 'fa-cogs', 'Components': 'fa-memory', 'Cables': 'fa-plug', 'Devices': 'fa-print', 'Consumables': 'fa-scroll', 'Other': 'fa-box' };
        return map[cat] || 'fa-box';
    }

    function statusOf(item) {
        if (item.qty === 0) return { label: 'OUT OF STOCK', color: 'rose', icon: 'fa-exclamation-circle' };
        if (item.qty <= item.minQty) return { label: 'LOW STOCK', color: 'amber', icon: 'fa-triangle-exclamation' };
        return { label: 'HEALTHY', color: 'emerald', icon: 'fa-check-circle' };
    }

    function toggleExpand(id) {
        expandedItemId = (expandedItemId === id) ? null : id;
        render();
    }

    function itemRowHTML(item) {
        var status = statusOf(item);
        var isExpanded = expandedItemId === item.id;
        var barColor = status.color === 'rose' ? 'bg-rose-500' : (status.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500');
        var stockBar = Math.min(100, Math.round((item.qty / Math.max(item.minQty * 2, 1)) * 100));

        var expandedHTML = '';
        if (isExpanded) {
            expandedHTML = ''
                + '<div class="px-4 pb-4 pt-3 bg-slate-50/90 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 space-y-3">'
                +   '<div class="flex flex-wrap items-center justify-between gap-2 text-xs">'
                +     '<div class="flex items-baseline gap-2">'
                +       '<span class="text-xl font-bold text-' + status.color + '-600">' + item.qty + '</span>'
                +       '<span class="text-slate-500">' + Utils.esc(item.unit || 'each') + ' in stock (min: ' + item.minQty + ')</span>'
                +     '</div>'
                +     '<div class="flex flex-wrap gap-4 text-[11px] text-slate-600 dark:text-slate-300 font-mono">'
                +       '<span><strong>Cost:</strong> ' + Utils.formatZAR(item.costPrice) + '</span>'
                +       '<span><strong>Sell:</strong> ' + Utils.formatZAR(item.sellPrice) + '</span>'
                +       (item.supplier ? '<span><strong>Supplier:</strong> ' + Utils.esc(item.supplier) + '</span>' : '')
                +       (item.location ? '<span><strong>Location:</strong> ' + Utils.esc(item.location) + '</span>' : '')
                +     '</div>'
                +   '</div>'
                +   '<div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden"><div class="' + barColor + ' h-full rounded-full transition-all" style="width:' + stockBar + '%"></div></div>'
                +   (item.notes ? '<p class="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">' + Utils.esc(item.notes) + '</p>' : '')
                +   '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">'
                +     '<button onclick="event.stopPropagation(); Inventory.openRestock(\'' + item.id + '\')" class="bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 text-xs font-semibold py-2 rounded-lg transition"><i class="fa-solid fa-plus mr-1.5"></i>Restock</button>'
                +     '<button onclick="event.stopPropagation(); Inventory.openSell(\'' + item.id + '\')" class="bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 text-xs font-semibold py-2 rounded-lg transition"><i class="fa-solid fa-cart-shopping mr-1.5"></i>Sell / Use</button>'
                +     '<button onclick="event.stopPropagation(); Inventory.openReconcile(\'' + item.id + '\')" class="bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 text-xs font-semibold py-2 rounded-lg transition"><i class="fa-solid fa-clipboard-check mr-1.5"></i>Count</button>'
                +     '<button onclick="event.stopPropagation(); Inventory.openEditItem(\'' + item.id + '\')" class="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-semibold py-2 rounded-lg transition"><i class="fa-solid fa-pen mr-1.5"></i>Edit</button>'
                +   '</div>'
                + '</div>';
        }

        return '<div class="bg-white dark:bg-slate-800 rounded-xl border ' + (isExpanded ? 'border-emerald-500 ring-1 ring-emerald-500/30 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600') + ' overflow-hidden transition-all">'
            + '<div onclick="Inventory.toggleExpand(\'' + item.id + '\')" class="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40 select-none">'
            +   '<div class="flex items-center gap-3 min-w-0 flex-1">'
            +     '<div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/70 flex items-center justify-center text-slate-500 dark:text-slate-300 flex-shrink-0">'
            +       '<i class="fa-solid ' + categoryIcon(item.category) + ' text-xs"></i>'
            +     '</div>'
            +     '<div class="min-w-0 flex-1">'
            +       '<div class="flex items-center gap-2">'
            +         '<span class="font-bold text-sm text-slate-900 dark:text-white truncate">' + Utils.esc(item.name) + '</span>'
            +         '<span class="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">' + Utils.esc(item.sku) + '</span>'
            +       '</div>'
            +       '<div class="flex items-center gap-2 text-[11px] text-slate-400">'
            +         '<span>' + Utils.esc(item.category || 'Other') + '</span>'
            +         (item.location ? '<span>• ' + Utils.esc(item.location) + '</span>' : '')
            +       '</div>'
            +     '</div>'
            +   '</div>'
            +   '<div class="flex items-center gap-3 sm:gap-5 flex-shrink-0">'
            +     '<div class="text-right hidden md:block">'
            +       '<span class="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">' + Utils.formatZAR(item.sellPrice) + '</span>'
            +       '<span class="block text-[10px] text-slate-400">Sell</span>'
            +     '</div>'
            +     '<div class="text-right min-w-[60px]">'
            +       '<span class="text-sm font-bold text-' + status.color + '-600">' + item.qty + '</span>'
            +       '<span class="text-[10px] text-slate-400 ml-0.5">' + Utils.esc(item.unit || 'ea') + '</span>'
            +     '</div>'
            +     '<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-' + status.color + '-100 text-' + status.color + '-800 whitespace-nowrap hidden sm:inline-flex items-center">'
            +       '<i class="fa-solid ' + status.icon + ' mr-1"></i>' + status.label
            +     '</span>'
            +     '<i class="fa-solid fa-chevron-' + (isExpanded ? 'up text-emerald-600' : 'down text-slate-400') + ' text-xs w-4 text-center"></i>'
            +   '</div>'
            + '</div>'
            + expandedHTML
            + '</div>';
    }

    function render() {
        var searchEl = document.getElementById('inv-search-input');
        var catEl = document.getElementById('inv-category-filter');
        var statEl = document.getElementById('inv-status-filter');
        var search = (searchEl ? searchEl.value : '').toLowerCase();
        var cat = catEl ? catEl.value : 'ALL';
        var stat = statEl ? statEl.value : 'ALL';

        var filtered = [];
        for (var i = 0; i < allItems.length; i++) {
            var it = allItems[i];
            var matchSearch = !search
                || (it.name || '').toLowerCase().indexOf(search) !== -1
                || (it.sku || '').toLowerCase().indexOf(search) !== -1
                || (it.supplier || '').toLowerCase().indexOf(search) !== -1
                || (it.location || '').toLowerCase().indexOf(search) !== -1;
            var matchCat = cat === 'ALL' || it.category === cat;
            var matchStat = stat === 'ALL'
                || (stat === 'LOW' && it.qty <= it.minQty && it.qty > 0)
                || (stat === 'OUT' && it.qty === 0)
                || (stat === 'HEALTHY' && it.qty > it.minQty);
            if (matchSearch && matchCat && matchStat) filtered.push(it);
        }

        var grid = document.getElementById('inv-items-grid');
        if (filtered.length === 0) {
            grid.innerHTML = '<p class="text-xs text-slate-400 italic text-center py-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">No items match your filters. <button onclick="Inventory.openAddItem()" class="text-emerald-600 font-bold underline">Add the first one</button></p>';
        } else {
            var html = '';
            for (var f = 0; f < filtered.length; f++) html += itemRowHTML(filtered[f]);
            grid.innerHTML = html;
        }

        var lowCount = 0, outCount = 0, totalUnits = 0, stockValue = 0;
        for (var s = 0; s < allItems.length; s++) {
            var it2 = allItems[s];
            if (it2.qty === 0) outCount++;
            else if (it2.qty <= it2.minQty) lowCount++;
            totalUnits += it2.qty || 0;
            stockValue += (it2.qty || 0) * (it2.costPrice || 0);
        }

        var statsBar = document.getElementById('inv-stats-bar');
        statsBar.innerHTML = ''
            + '<div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700"><p class="text-[10px] uppercase text-slate-500 font-bold">Total SKUs</p><p class="text-2xl font-bold text-slate-900 dark:text-white">' + allItems.length + '</p></div>'
            + '<div class="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700"><p class="text-[10px] uppercase text-slate-500 font-bold">Total Units</p><p class="text-2xl font-bold text-slate-900 dark:text-white">' + totalUnits + '</p></div>'
            + '<div class="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800"><p class="text-[10px] uppercase text-amber-700 font-bold">Low Stock</p><p class="text-2xl font-bold text-amber-600">' + lowCount + '</p></div>'
            + '<div class="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800"><p class="text-[10px] uppercase text-rose-700 font-bold">Out of Stock</p><p class="text-2xl font-bold text-rose-600">' + outCount + '</p></div>';

        var badge = document.getElementById('low-stock-badge');
        if (badge) {
            var totalAlerts = lowCount + outCount;
            if (totalAlerts > 0) {
                badge.textContent = totalAlerts;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    async function refresh() {
        var res = await API.getInventory();
        if (!res.ok) { Utils.toast('Failed to load inventory', 'error'); return; }
        allItems = res.data || [];
        render();
    }

    function openAddItem() {
        editingItemId = null;
        document.getElementById('inv-item-modal-title').innerHTML = '<i class="fa-solid fa-boxes-stacked text-emerald-600"></i> New Inventory Item';
        document.getElementById('inv-item-form').reset();
        document.getElementById('inv-item-id').value = '';
        document.getElementById('inv-item-qty').value = 0;
        document.getElementById('inv-item-minqty').value = 3;
        document.getElementById('inv-item-cost').value = 0;
        document.getElementById('inv-item-sell').value = 0;
        document.getElementById('inv-item-unit').value = 'each';
        document.getElementById('modal-inv-item').classList.remove('hidden');
    }

    function openEditItem(id) {
        var item = findItem(id);
        if (!item) return;
        editingItemId = id;
        document.getElementById('inv-item-modal-title').innerHTML = '<i class="fa-solid fa-pen text-emerald-600"></i> Edit Item';
        document.getElementById('inv-item-id').value = item.id;
        document.getElementById('inv-item-sku').value = item.sku || '';
        document.getElementById('inv-item-name').value = item.name || '';
        document.getElementById('inv-item-category').value = item.category || 'Other';
        document.getElementById('inv-item-qty').value = item.qty || 0;
        document.getElementById('inv-item-minqty').value = item.minQty || 3;
        document.getElementById('inv-item-unit').value = item.unit || 'each';
        document.getElementById('inv-item-cost').value = item.costPrice || 0;
        document.getElementById('inv-item-sell').value = item.sellPrice || 0;
        document.getElementById('inv-item-supplier').value = item.supplier || '';
        document.getElementById('inv-item-location').value = item.location || '';
        document.getElementById('inv-item-notes').value = item.notes || '';
        document.getElementById('modal-inv-item').classList.remove('hidden');
    }

    async function saveItem(e) {
        e.preventDefault();
        var id = document.getElementById('inv-item-id').value;
        var body = {
            sku: document.getElementById('inv-item-sku').value.trim(),
            name: document.getElementById('inv-item-name').value.trim(),
            category: document.getElementById('inv-item-category').value,
            qty: parseInt(document.getElementById('inv-item-qty').value) || 0,
            minQty: parseInt(document.getElementById('inv-item-minqty').value) || 0,
            unit: document.getElementById('inv-item-unit').value.trim() || 'each',
            costPrice: parseFloat(document.getElementById('inv-item-cost').value) || 0,
            sellPrice: parseFloat(document.getElementById('inv-item-sell').value) || 0,
            supplier: document.getElementById('inv-item-supplier').value.trim(),
            location: document.getElementById('inv-item-location').value.trim(),
            notes: document.getElementById('inv-item-notes').value.trim()
        };
        if (!body.sku || !body.name) { Utils.toast('SKU and name are required', 'warn'); return; }

        var res = id ? await API.updateInventoryItem(id, body) : await API.createInventoryItem(body);
        if (res.ok) {
            Utils.toast(id ? 'Item updated' : 'Item created', 'success');
            document.getElementById('modal-inv-item').classList.add('hidden');
            await refresh();
        } else {
            Utils.toast((res.data && res.data.error) || 'Save failed', 'error');
        }
    }

    function openRestock(id) {
        var item = findItem(id);
        if (!item) return;
        document.getElementById('inv-restock-id').value = item.id;
        document.getElementById('inv-restock-item-name').textContent = item.name + ' (currently ' + item.qty + ' ' + (item.unit || 'each') + ')';
        document.getElementById('inv-restock-qty').value = 1;
        document.getElementById('inv-restock-cost').value = item.costPrice || 0;
        document.getElementById('inv-restock-supplier').value = item.supplier || '';
        document.getElementById('inv-restock-invoice').value = '';
        document.getElementById('modal-inv-restock').classList.remove('hidden');
    }

    async function submitRestock(e) {
        e.preventDefault();
        var id = document.getElementById('inv-restock-id').value;
        var body = {
            qty: parseInt(document.getElementById('inv-restock-qty').value),
            unitCost: parseFloat(document.getElementById('inv-restock-cost').value) || undefined,
            supplier: document.getElementById('inv-restock-supplier').value.trim(),
            invoice: document.getElementById('inv-restock-invoice').value.trim()
        };
        var res = await API.restockItem(id, body);
        if (res.ok) {
            Utils.toast('Restock recorded', 'success');
            document.getElementById('modal-inv-restock').classList.add('hidden');
            await refresh();
        } else {
            Utils.toast((res.data && res.data.error) || 'Restock failed', 'error');
        }
    }

    function openSell(id) {
        var item = findItem(id);
        if (!item) return;
        document.getElementById('inv-sell-id').value = item.id;
        document.getElementById('inv-sell-item-name').textContent = item.name + ' (in stock: ' + item.qty + ')';
        document.getElementById('inv-sell-type').value = 'sale';
        document.getElementById('inv-sell-qty').value = 1;
        document.getElementById('inv-sell-price').value = item.sellPrice || 0;
        document.getElementById('inv-sell-client').value = '';
        document.getElementById('inv-sell-job').value = '';
        document.getElementById('inv-sell-client-row').classList.remove('hidden');
        document.getElementById('modal-inv-sell').classList.remove('hidden');
    }

    function onSellTypeChange() {
        var t = document.getElementById('inv-sell-type').value;
        var row = document.getElementById('inv-sell-client-row');
        if (t === 'repair-use') row.classList.add('hidden');
        else row.classList.remove('hidden');
    }

    async function submitSell(e) {
        e.preventDefault();
        var id = document.getElementById('inv-sell-id').value;
        var body = {
            qty: parseInt(document.getElementById('inv-sell-qty').value),
            unitPrice: parseFloat(document.getElementById('inv-sell-price').value) || undefined,
            client: document.getElementById('inv-sell-client').value.trim(),
            jobId: document.getElementById('inv-sell-job').value.trim() || null,
            type: document.getElementById('inv-sell-type').value
        };
        var res = await API.sellItem(id, body);
        if (res.ok) {
            Utils.toast(body.type === 'repair-use' ? 'Repair use recorded' : 'Sale recorded', 'success');
            document.getElementById('modal-inv-sell').classList.add('hidden');
            await refresh();
        } else {
            Utils.toast((res.data && res.data.error) || 'Failed', 'error');
        }
    }

    function openReconcile(id) {
        var item = findItem(id);
        if (!item) return;
        document.getElementById('inv-reconcile-id').value = item.id;
        document.getElementById('inv-reconcile-item-name').textContent = item.name;
        document.getElementById('inv-reconcile-count').value = item.qty;
        document.getElementById('inv-reconcile-hint').textContent = 'System currently shows ' + item.qty + ' ' + (item.unit || 'each');
        document.getElementById('inv-reconcile-note').value = '';
        document.getElementById('modal-inv-reconcile').classList.remove('hidden');
    }

    async function submitReconcile(e) {
        e.preventDefault();
        var id = document.getElementById('inv-reconcile-id').value;
        var body = {
            countedQty: parseInt(document.getElementById('inv-reconcile-count').value),
            note: document.getElementById('inv-reconcile-note').value.trim()
        };
        var res = await API.reconcileItem(id, body);
        if (res.ok) {
            var rec = res.data.reconciliation;
            var msg = rec.variance === 0 ? 'No variance - perfect' : 'Recorded ' + rec.variance + ' variance';
            Utils.toast(msg, 'success');
            document.getElementById('modal-inv-reconcile').classList.add('hidden');
            await refresh();
        } else {
            Utils.toast((res.data && res.data.error) || 'Failed', 'error');
        }
    }

    return {
        refresh: refresh,
        render: render,
        toggleExpand: toggleExpand,
        openAddItem: openAddItem,
        openEditItem: openEditItem,
        saveItem: saveItem,
        openRestock: openRestock,
        submitRestock: submitRestock,
        openSell: openSell,
        onSellTypeChange: onSellTypeChange,
        submitSell: submitSell,
        openReconcile: openReconcile,
        submitReconcile: submitReconcile
    };
})();