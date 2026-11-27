// ============================================
// Cedar3 — Inventory Reports Tab
// ============================================

window.InventoryReports = (function () {
    var cachedSales = [];
    var cachedPurchases = [];
    var cachedRecons = [];

    async function refresh() {
        var sumRes = await API.getInventorySummary();
        if (sumRes.ok && sumRes.data) renderSummaryCards(sumRes.data);

        var salesRes = await API.getInventorySales();
        if (salesRes.ok) { cachedSales = salesRes.data || []; renderSalesLog(cachedSales); }

        var purRes = await API.getInventoryPurchases();
        if (purRes.ok) { cachedPurchases = purRes.data || []; renderPurchasesLog(cachedPurchases); }

        var recRes = await API.getReconciliations();
        if (recRes.ok) { cachedRecons = recRes.data || []; renderReconsLog(cachedRecons); }
    }

    function renderSummaryCards(s) {
        var el = document.getElementById('inv-summary-cards');
        el.innerHTML = ''
            + '<div class="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-4 rounded-xl"><p class="text-[10px] uppercase font-bold opacity-80">Revenue (all-time)</p><p class="text-2xl font-bold">' + Utils.formatZAR(s.totalRevenue) + '</p></div>'
            + '<div class="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-4 rounded-xl"><p class="text-[10px] uppercase font-bold opacity-80">Profit (all-time)</p><p class="text-2xl font-bold">' + Utils.formatZAR(s.totalProfit) + '</p></div>'
            + '<div class="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-4 rounded-xl"><p class="text-[10px] uppercase font-bold opacity-80">This Month Revenue</p><p class="text-2xl font-bold">' + Utils.formatZAR(s.monthRevenue) + '</p></div>'
            + '<div class="bg-gradient-to-br from-slate-500 to-slate-700 text-white p-4 rounded-xl"><p class="text-[10px] uppercase font-bold opacity-80">Stock Value (at cost)</p><p class="text-2xl font-bold">' + Utils.formatZAR(s.stockValueAtCost) + '</p></div>'
            + '<div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700"><p class="text-[10px] uppercase text-slate-500 font-bold">Total SKUs</p><p class="text-2xl font-bold text-slate-900 dark:text-white">' + s.totalItems + '</p></div>'
            + '<div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700"><p class="text-[10px] uppercase text-slate-500 font-bold">Units in Stock</p><p class="text-2xl font-bold text-slate-900 dark:text-white">' + s.totalUnits + '</p></div>'
            + '<div class="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800"><p class="text-[10px] uppercase text-amber-700 font-bold">Low Stock</p><p class="text-2xl font-bold text-amber-600">' + s.lowStock + '</p></div>'
            + '<div class="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-xl border border-rose-200 dark:border-rose-800"><p class="text-[10px] uppercase text-rose-700 font-bold">Out of Stock</p><p class="text-2xl font-bold text-rose-600">' + s.outOfStock + '</p></div>';
    }

    function renderSalesLog(sales) {
        var tbody = document.getElementById('inv-sales-tbody');
        if (!sales.length) {
            tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-400 italic">No sales or repair usage recorded yet.</td></tr>';
            return;
        }
        var html = '';
        for (var i = 0; i < sales.length; i++) {
            var s = sales[i];
            var typeLabel = s.type === 'repair-use' ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">REPAIR</span>' : '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">SALE</span>';
            html += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">'
                + '<td class="p-3 text-slate-500 font-mono text-[10px]">' + Utils.formatDateTime(s.ts) + '</td>'
                + '<td class="p-3"><p class="font-bold text-slate-800 dark:text-slate-200">' + Utils.esc(s.itemName || s.sku) + '</p><p class="text-[10px] text-slate-400 font-mono">' + Utils.esc(s.sku) + '</p></td>'
                + '<td class="p-3">' + typeLabel + '</td>'
                + '<td class="p-3 text-right font-mono font-bold">' + s.qty + '</td>'
                + '<td class="p-3 text-right font-mono">' + Utils.formatZAR(s.unitPrice) + '</td>'
                + '<td class="p-3 text-right font-mono font-bold text-emerald-600">' + Utils.formatZAR(s.total) + '</td>'
                + '<td class="p-3 text-right font-mono ' + (s.profit >= 0 ? 'text-emerald-600' : 'text-rose-600') + '">' + Utils.formatZAR(s.profit) + '</td>'
                + '<td class="p-3 text-slate-600 text-[11px]">' + Utils.esc(s.client || '—') + (s.jobId ? ' <span class="text-[10px] font-mono text-slate-400">(' + Utils.esc(s.jobId) + ')</span>' : '') + '</td>'
                + '<td class="p-3 text-slate-500 text-[11px]">' + Utils.esc(s.soldBy) + '</td>'
                + '</tr>';
        }
        tbody.innerHTML = html;
    }

    function renderPurchasesLog(purchases) {
        var tbody = document.getElementById('inv-purchases-tbody');
        if (!purchases.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400 italic">No restocks recorded yet.</td></tr>';
            return;
        }
        var html = '';
        for (var i = 0; i < purchases.length; i++) {
            var p = purchases[i];
            html += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">'
                + '<td class="p-3 text-slate-500 font-mono text-[10px]">' + Utils.formatDateTime(p.ts) + '</td>'
                + '<td class="p-3 font-mono text-[11px] font-bold">' + Utils.esc(p.sku) + '</td>'
                + '<td class="p-3 text-right font-mono font-bold text-blue-600">+' + p.qty + '</td>'
                + '<td class="p-3 text-right font-mono">' + Utils.formatZAR(p.unitCost) + '</td>'
                + '<td class="p-3 text-right font-mono font-bold">' + Utils.formatZAR(p.total) + '</td>'
                + '<td class="p-3 text-slate-600 text-[11px]">' + Utils.esc(p.supplier || '—') + '</td>'
                + '<td class="p-3 text-slate-500 font-mono text-[10px]">' + Utils.esc(p.invoice || '—') + '</td>'
                + '<td class="p-3 text-slate-500 text-[11px]">' + Utils.esc(p.purchasedBy) + '</td>'
                + '</tr>';
        }
        tbody.innerHTML = html;
    }

    function renderReconsLog(recs) {
        var tbody = document.getElementById('inv-recons-tbody');
        if (!recs.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-slate-400 italic">No reconciliations recorded yet.</td></tr>';
            return;
        }
        var html = '';
        for (var i = 0; i < recs.length; i++) {
            var r = recs[i];
            var varClass = r.variance === 0 ? 'text-emerald-600' : (r.variance > 0 ? 'text-blue-600' : 'text-rose-600');
            var varLabel = r.variance === 0 ? '0' : (r.variance > 0 ? '+' + r.variance : '' + r.variance);
            html += '<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">'
                + '<td class="p-3 text-slate-500 font-mono text-[10px]">' + Utils.formatDateTime(r.ts) + '</td>'
                + '<td class="p-3 font-mono text-[11px] font-bold">' + Utils.esc(r.sku) + '</td>'
                + '<td class="p-3 text-slate-700 text-[11px]">' + Utils.esc(r.itemName) + '</td>'
                + '<td class="p-3 text-right font-mono">' + r.systemQty + '</td>'
                + '<td class="p-3 text-right font-mono font-bold">' + r.countedQty + '</td>'
                + '<td class="p-3 text-right font-mono font-bold ' + varClass + '">' + varLabel + '</td>'
                + '<td class="p-3 text-slate-600 text-[11px]">' + Utils.esc(r.note || '—') + '</td>'
                + '<td class="p-3 text-slate-500 text-[11px]">' + Utils.esc(r.reconciledBy) + '</td>'
                + '</tr>';
        }
        tbody.innerHTML = html;
    }

    function exportSalesCSV() {
        if (!cachedSales.length) { Utils.toast('No sales to export', 'warn'); return; }
        var headers = ['Date', 'SKU', 'Item', 'Type', 'Qty', 'Unit Price', 'Total', 'Profit', 'Client', 'Job', 'Sold By'];
        var rows = [headers.join(',')];
        for (var i = 0; i < cachedSales.length; i++) {
            var s = cachedSales[i];
            rows.push([
                '"' + s.ts + '"',
                '"' + (s.sku || '') + '"',
                '"' + (s.itemName || '').replace(/"/g, '""') + '"',
                '"' + (s.type || '') + '"',
                s.qty,
                Number(s.unitPrice || 0).toFixed(2),
                Number(s.total || 0).toFixed(2),
                Number(s.profit || 0).toFixed(2),
                '"' + (s.client || '').replace(/"/g, '""') + '"',
                '"' + (s.jobId || '') + '"',
                '"' + (s.soldBy || '') + '"'
            ].join(','));
        }
        var blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'Cedar3_Inventory_Sales_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Utils.toast('Sales CSV exported', 'success');
    }

    return { refresh: refresh, exportSalesCSV: exportSalesCSV };
})();
