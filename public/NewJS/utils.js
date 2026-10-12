const Utils = {
    formatCurrency(amount) {
        return `R${parseFloat(amount || 0).toFixed(2)}`;
    },

    formatDate(dateStr) {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-ZA', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        const bg = type === 'success' ? 'bg-emerald-600' : 'bg-rose-600';
        toast.className = `${bg} text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold transition-all duration-300 pointer-events-auto flex items-center gap-2`;
        toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'}"></i><span>${message}</span>`;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    exportToCSV(filename, rows) {
        if (!rows || !rows.length) return;
        const separator = ',';
        const keys = Object.keys(rows[0]);
        const csvContent =
            keys.join(separator) +
            '\n' +
            rows.map(row => {
                return keys.map(k => {
                    let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                    cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
                    if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
                    return cell;
                }).join(separator);
            }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};