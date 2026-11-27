(function () {
  function injectPayslipUI() {
    if (document.getElementById('cedar3-payslip-widget')) return;

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const wrapper = document.createElement('div');
    wrapper.id = 'cedar3-payslip-widget';
    wrapper.style.cssText =
      'position:fixed; bottom:20px; right:20px; z-index:99999; font-family:Segoe UI, Arial, sans-serif;';

    wrapper.innerHTML = `
      <div id="c3-ps-panel" style="display:none; background:#ffffff; border:2px solid #1b365d; border-radius:8px; padding:14px; box-shadow:0 8px 24px rgba(0,0,0,0.22); margin-bottom:10px; width:275px; color:#1e293b;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
          <strong style="color:#1b365d; font-size:14px;">Technician Payslip</strong>
          <button type="button" id="c3-ps-close" style="background:none; border:none; font-size:16px; cursor:pointer; color:#64748b;">&times;</button>
        </div>

        <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">Select Staff Member:</label>
        <select id="c3-ps-tech" style="width:100%; padding:7px; border-radius:4px; border:1px solid #94a3b8; margin-bottom:10px; background:#fff;">
          <option value="talent">Talent (R 6,000.00)</option>
          <option value="simba">Simba (R 4,500.00)</option>
          <option value="reception">Receptionist (R 3,500.00)</option>
        </select>

        <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">From Date:</label>
        <input type="date" id="c3-ps-start" value="${yyyy}-${mm}-01" style="width:100%; box-sizing:border-box; padding:6px; border-radius:4px; border:1px solid #94a3b8; margin-bottom:10px;">

        <label style="display:block; font-size:12px; font-weight:600; margin-bottom:4px;">To Date:</label>
        <input type="date" id="c3-ps-end" value="${yyyy}-${mm}-${dd}" style="width:100%; box-sizing:border-box; padding:6px; border-radius:4px; border:1px solid #94a3b8; margin-bottom:10px;">

        <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer; margin-bottom:12px;">
          <input type="checkbox" id="c3-ps-sat"> Include Saturdays as workdays
        </label>

        <button type="button" id="c3-ps-btn" style="width:100%; background:#1b365d; color:#fff; border:none; padding:9px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:13px;">
          Generate &amp; Print Payslip
        </button>
      </div>

      <button type="button" id="c3-ps-toggle" style="float:right; background:#1b365d; color:#fff; border:2px solid #fff; padding:10px 18px; border-radius:30px; cursor:pointer; font-weight:bold; font-size:13px; box-shadow:0 4px 12px rgba(0,0,0,0.28);">
        Print Payslip
      </button>
    `;

    document.body.appendChild(wrapper);

    const panel = document.getElementById('c3-ps-panel');
    document.getElementById('c3-ps-toggle').addEventListener('click', () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
    document.getElementById('c3-ps-close').addEventListener('click', () => {
      panel.style.display = 'none';
    });
    document.getElementById('c3-ps-btn').addEventListener('click', generatePayslipPopup);
  }

  function getAuthHeaders() {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('cedar3_token') ||
      sessionStorage.getItem('token') ||
      '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function apiGet(url) {
    const res = await fetch(url, { headers: getAuthHeaders(), cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  }

  async function fetchWorkshopData() {
    // 1. Try direct static file first if served
    const directDb = await apiGet('/data/workshop-db.json');
    if (directDb && directDb.employees && directDb.jobs) return directDb;

    // 2. Otherwise combine your Express API endpoints (/api/jobs, /api/logs, /api/sessions)
    const [jobsRes, logsRes, sessRes, empRes] = await Promise.all([
      apiGet('/api/jobs'),
      apiGet('/api/logs'),
      apiGet('/api/sessions'),
      apiGet('/api/admin/employees')
    ]);

    const jobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes && jobsRes.jobs) || [];
    const logs = Array.isArray(logsRes) ? logsRes : (logsRes && logsRes.logs) || [];
    const sessions = (sessRes && sessRes.sessions) || sessRes || {};

    const defaultEmployees = {
      talent: { displayName: 'Talent', role: 'tech', monthlyRate: 6000 },
      simba: { displayName: 'Simba', role: 'tech', monthlyRate: 4500 },
      reception: { displayName: 'Receptionist', role: 'reception', monthlyRate: 3500 }
    };
    const employees = (empRes && (empRes.employees || empRes)) || defaultEmployees;

    return { employees, jobs, logs, sessions };
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
      alert('Please select both From and To dates.');
      return;
    }

    const db = await fetchWorkshopData();
    const emp = (db.employees || {})[empKey];
    if (!emp) {
      alert(`Staff member "${empKey}" not found.`);
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