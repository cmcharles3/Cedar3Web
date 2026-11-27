(function () {
  function injectPayslipUI() {
    if (document.getElementById('cedar3-payslip-bar')) return;

    const target =
      document.querySelector('#logs-section, #logs, [data-tab="logs"], #dashboard-section, #dashboard, main') ||
      document.body;

    const bar = document.createElement('div');
    bar.id = 'cedar3-payslip-bar';
    bar.style.cssText =
      'display:flex; flex-wrap:wrap; gap:10px; align-items:center; background:#f1f5f9; padding:12px 15px; border-radius:6px; margin:12px 0; border:1px solid #cbd5e1; font-family:inherit; color:#1e293b;';

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    bar.innerHTML = `
      <strong style="color:#1b365d;">Technician Payslip:</strong>
      <select id="c3-ps-tech" style="padding:6px 10px; border-radius:4px; border:1px solid #94a3b8; background:#fff;">
        <option value="talent">Talent</option>
        <option value="simba">Simba</option>
        <option value="reception">Receptionist</option>
      </select>
      <label style="font-size:13px;">From:
        <input type="date" id="c3-ps-start" value="${yyyy}-${mm}-01" style="padding:5px; border-radius:4px; border:1px solid #94a3b8;">
      </label>
      <label style="font-size:13px;">To:
        <input type="date" id="c3-ps-end" value="${yyyy}-${mm}-${dd}" style="padding:5px; border-radius:4px; border:1px solid #94a3b8;">
      </label>
      <label style="font-size:13px; cursor:pointer;">
        <input type="checkbox" id="c3-ps-sat"> Include Saturdays
      </label>
      <button type="button" id="c3-ps-btn" style="background:#1b365d; color:#fff; border:none; padding:7px 14px; border-radius:4px; cursor:pointer; font-weight:600;">
        Print Payslip
      </button>
    `;

    target.prepend(bar);
    document.getElementById('c3-ps-btn').addEventListener('click', generatePayslipPopup);
  }

  async function fetchWorkshopDB() {
    if (window.db && window.db.employees && window.db.jobs) return window.db;
    if (window.state && window.state.employees && window.state.jobs) return window.state;

    const endpoints = ['/api/db', '/api/data', '/api/state', '/data/workshop-db.json'];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.employees && data.jobs) return data;
        }
      } catch (_) {}
    }
    throw new Error('Could not load workshop-db.json');
  }

  function toSASTDate(isoStr) {
    if (!isoStr) return null;
    const d = new Date(new Date(isoStr).getTime() + 2 * 60 * 60 * 1000);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  function formatTiming(createdStr, updatedStr) {
    if (!createdStr || !updatedStr) return 'Same-day';
    const diffMs = new Date(updatedStr) - new Date(createdStr);
    if (isNaN(diffMs) || diffMs <= 0) return 'Same-day';
    const mins = Math.floor(diffMs / 60000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m} mins`;
  }

  async function generatePayslipPopup() {
    const empKey = document.getElementById('c3-ps-tech').value;
    const startDate = document.getElementById('c3-ps-start').value;
    const endDate = document.getElementById('c3-ps-end').value;
    const includeSat = document.getElementById('c3-ps-sat').checked;

    if (!startDate || !endDate) {
      alert('Please select both Start and End dates.');
      return;
    }

    let db;
    try {
      db = await fetchWorkshopDB();
    } catch (err) {
      alert('Unable to load database. Ensure you are logged into the workshop system.');
      return;
    }

    const emp = (db.employees || {})[empKey];
    if (!emp) {
      alert(`Technician "${empKey}" not found.`);
      return;
    }

    const displayName = emp.displayName || empKey;
    const monthlyRate = Number(emp.monthlyRate || 0);

    const expectedDays = [];
    let curr = new Date(`${startDate}T00:00:00Z`);
    const endObj = new Date(`${endDate}T00:00:00Z`);
    const maxDow = includeSat ? 6 : 5;

    while (curr <= endObj) {
      const dow = curr.getUTCDay();
      if (dow >= 1 && dow <= maxDow) expectedDays.push(curr.toISOString().slice(0, 10));
      curr.setUTCDate(curr.getUTCDate() + 1);
    }

    const dailyRate = Number((monthlyRate / (expectedDays.length || 22)).toFixed(2));

    const dailyHours = {};
    (db.logs || []).forEach((log) => {
      if ((log.employee || '').toLowerCase() !== empKey) return;
      const dStr = toSASTDate(log.clockIn);
      if (dStr && dStr >= startDate && dStr <= endDate) {
        dailyHours[dStr] = (dailyHours[dStr] || 0) + Number(log.hoursWorked || 0);
      }
    });

    const activeSess = (db.sessions || {})[empKey];
    if (activeSess && activeSess.clockInTime) {
      const sDate = toSASTDate(activeSess.clockInTime);
      if (sDate && sDate >= startDate && sDate <= endDate && !(sDate in dailyHours)) {
        dailyHours[sDate] = 0;
      }
    }

    const presentDates = Object.keys(dailyHours).sort();
    const absentDates = expectedDays.filter((d) => !presentDates.includes(d));
    const totalHours = Object.values(dailyHours).reduce((a, b) => a + b, 0);

    const daysPresent = presentDates.length;
    const daysAbsent = absentDates.length;
    const deduction = Number((daysAbsent * dailyRate).toFixed(2));
    const netPay = Math.max(0, Number((monthlyRate - deduction).toFixed(2)));

    const completedJobs = (db.jobs || [])
      .filter((j) => {
        if ((j.assignedTech || '').toLowerCase() !== displayName.toLowerCase()) return false;
        if ((j.status || '').toLowerCase() !== 'completed') return false;
        const jDate = toSASTDate(j.updatedAt || j.createdAt);
        return jDate && jDate >= startDate && jDate <= endDate;
      })
      .map((j) => ({
        id: j.id || '-',
        date: toSASTDate(j.updatedAt || j.createdAt),
        device: j.device || '-',
        sn: j.sn || 'N/A',
        customer: j.customer || '-',
        faults: (j.faults || '-').replace(/\n/g, '; '),
        timing: formatTiming(j.createdAt, j.updatedAt),
        cost: Math.max(0, Number(j.cost || 0)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalValue = completedJobs.reduce((s, j) => s + j.cost, 0);
    const fmt = (n) => n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const jobRows = completedJobs.length
      ? completedJobs
          .map(
            (j, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${j.date}</td>
            <td><strong>${j.id}</strong></td>
            <td>${j.device}<br><small style="color:#555;">S/N: ${j.sn}</small></td>
            <td>${j.customer}</td>
            <td>${j.faults}</td>
            <td>${j.timing}</td>
            <td style="text-align:right;">R ${fmt(j.cost)}</td>
          </tr>`
          )
          .join('')
      : `<tr><td colspan="8" style="text-align:center;">No completed printers recorded in this period.</td></tr>`;

    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Payslip - ${displayName} (${startDate} to ${endDate})</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.4; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1b365d; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 20px; font-weight: bold; color: #1b365d; }
  .doc-title { text-align: right; }
  .doc-title h2 { margin: 0; font-size: 15px; color: #1b365d; text-transform: uppercase; }
  .grid { display: flex; gap: 14px; margin-bottom: 14px; }
  .card { flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px; background: #f8fafc; }
  .card h3 { margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; color: #1b365d; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #1b365d; color: #fff; font-size: 11px; text-transform: uppercase; }
  tr:nth-child(even) { background-color: #f8fafc; }
  .summary-wrap { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-top: 10px; }
  .absent-box { flex: 1; border: 1px solid #fca5a5; background: #fef2f2; padding: 8px 10px; border-radius: 4px; }
  .pay-table { width: 46%; margin-bottom: 0; }
  .net-row { background: #e2e8f0 !important; font-weight: bold; font-size: 13px; }
  .red { color: #b91c1c; font-weight: bold; }
  .sigs { display: flex; justify-content: space-between; margin-top: 35px; }
  .sig { width: 42%; border-top: 1px solid #333; padding-top: 4px; font-size: 11px; }
</style>
</head>
<body onload="window.print()">
  <div class="header">
    <div>
      <div class="brand">Cedar3 Technology (Pty) Ltd</div>
      <div>25 Birmingham Road, Benoni South, Gauteng</div>
      <div>info@cedar3tech.co.za</div>
    </div>
    <div class="doc-title">
      <h2>Technician Payslip &amp;<br>Workshop Job Report</h2>
      <div>Period: <strong>${startDate}</strong> to <strong>${endDate}</strong></div>
      <div>Generated: ${new Date().toLocaleDateString('en-ZA')}</div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Technician Details</h3>
      <div><strong>Name:</strong> ${displayName}</div>
      <div><strong>Role:</strong> ${(emp.role || 'Technician').toUpperCase()}</div>
      <div><strong>Printers Completed:</strong> ${completedJobs.length} units</div>
      <div><strong>Total Job Value:</strong> R ${fmt(totalValue)}</div>
    </div>
    <div class="card">
      <h3>Attendance &amp; Deductions</h3>
      <div><strong>Working Days in Period:</strong> ${expectedDays.length} days</div>
      <div><strong>Days Present:</strong> ${daysPresent} days (${totalHours.toFixed(1)} hrs)</div>
      <div><strong>Days Absent:</strong> <span class="red">${daysAbsent} days</span></div>
      <div><strong>Daily Rate:</strong> R ${fmt(dailyRate)} / day</div>
    </div>
  </div>

  <h3 style="margin:0 0 6px 0; color:#1b365d; font-size:13px;">Completed Printers &amp; Turnaround Timing</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>Job ID</th>
        <th>Printer &amp; Serial</th>
        <th>Client</th>
        <th>Work / Faults</th>
        <th>Timing</th>
        <th style="text-align:right;">Job Value</th>
      </tr>
    </thead>
    <tbody>${jobRows}</tbody>
  </table>

  <div class="summary-wrap">
    <div class="absent-box">
      <strong style="color:#991b1b;">Absent Dates Deducted (${daysAbsent}):</strong><br>
      <span>${absentDates.length ? absentDates.join(', ') : 'None (100% Attendance)'}</span>
    </div>

    <table class="pay-table">
      <tr>
        <td>Basic Monthly Salary</td>
        <td style="text-align:right;">R ${fmt(monthlyRate)}</td>
      </tr>
      <tr>
        <td>Less: Absent Days (${daysAbsent} &times; R ${fmt(dailyRate)})</td>
        <td class="red" style="text-align:right;">- R ${fmt(deduction)}</td>
      </tr>
      <tr class="net-row">
        <td>NET PAYABLE</td>
        <td style="text-align:right;">R ${fmt(netPay)}</td>
      </tr>
    </table>
  </div>

  <div class="sigs">
    <div class="sig">Approved By (Manager Signature &amp; Date)</div>
    <div class="sig">Received By (${displayName} Signature &amp; Date)</div>
  </div>
</body>
</html>`);
    win.document.close();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPayslipUI);
  } else {
    injectPayslipUI();
  }
})();
