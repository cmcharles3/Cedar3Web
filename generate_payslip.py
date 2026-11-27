import json
import os
import webbrowser
from datetime import datetime, timedelta, timezone

DB_PATH = r"C:\Cedar3Web\data\workshop-db.json"
SAST = timezone(timedelta(hours=2))  # South Africa Standard Time (UTC+2)

def parse_iso_sast(iso_str):
    if not iso_str:
        return None
    dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
    return dt.astimezone(SAST)

def get_working_days(start_date_str, end_date_str, include_saturdays=False, holidays=None):
    """Returns expected working dates (YYYY-MM-DD) within the period."""
    holiday_set = set(holidays or [])
    start = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    end = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    max_weekday = 5 if include_saturdays else 4  # 0=Mon..4=Fri, 5=Sat

    days = []
    curr = start
    while curr <= end:
        d_str = curr.strftime("%Y-%m-%d")
        if curr.weekday() <= max_weekday and d_str not in holiday_set:
            days.append(d_str)
        curr += timedelta(days=1)
    return days

def format_timing(created_str, updated_str):
    """Calculates turnaround duration between job creation and completion."""
    t1 = parse_iso_sast(created_str)
    t2 = parse_iso_sast(updated_str)
    if not t1 or not t2 or t2 <= t1:
        return "Same-day / Quick"
    total_mins = int((t2 - t1).total_seconds() // 60)
    days = total_mins // (60 * 24)
    hours = (total_mins % (60 * 24)) // 60
    mins = total_mins % 60
    if days > 0:
        return f"{days}d {hours}h {mins}m"
    if hours > 0:
        return f"{hours}h {mins}m"
    return f"{mins} mins"

def generate_technician_payslip(
    emp_key,
    start_date,
    end_date,
    include_saturdays=False,
    holidays=None,
    db_path=DB_PATH
):
    with open(db_path, "r", encoding="utf-8") as f:
        db = json.load(f)

    # 1. Load employee details
    employees = db.get("employees", {})
    emp = employees.get(emp_key.lower())
    if not emp:
        raise ValueError(f"Employee '{emp_key}' not found in database.")

    display_name = emp.get("displayName", emp_key.capitalize())
    monthly_rate = float(emp.get("monthlyRate", 0.0))

    # 2. Calculate expected working days & daily deduction rate
    expected_days = get_working_days(start_date, end_date, include_saturdays, holidays)
    working_day_count = len(expected_days) if expected_days else 22
    daily_rate = round(monthly_rate / working_day_count, 2)

    # 3. Process Attendance from 'logs' (grouping multiple clock-ins per day)
    daily_logs = {}
    for log in db.get("logs", []):
        if log.get("employee", "").lower() != emp_key.lower():
            continue
        dt_in = parse_iso_sast(log.get("clockIn"))
        if not dt_in:
            continue
        date_str = dt_in.strftime("%Y-%m-%d")
        if start_date <= date_str <= end_date:
            hours = float(log.get("hoursWorked", 0.0))
            if date_str not in daily_logs:
                daily_logs[date_str] = {"hours": 0.0, "first_in": dt_in.strftime("%H:%M")}
            daily_logs[date_str]["hours"] += hours

    # Include active session if technician is currently clocked in during this range
    active_session = db.get("sessions", {}).get(emp_key.lower())
    if active_session and active_session.get("clockInTime"):
        dt_sess = parse_iso_sast(active_session["clockInTime"])
        if dt_sess:
            s_date = dt_sess.strftime("%Y-%m-%d")
            if start_date <= s_date <= end_date and s_date not in daily_logs:
                daily_logs[s_date] = {"hours": 0.0, "first_in": dt_sess.strftime("%H:%M")}

    present_dates = sorted(daily_logs.keys())
    absent_dates = sorted(list(set(expected_days) - set(present_dates)))

    days_present = len(present_dates)
    days_absent = len(absent_dates)
    total_hours = sum(v["hours"] for v in daily_logs.values())
    absence_deduction = round(days_absent * daily_rate, 2)
    net_salary = max(0.0, round(monthly_rate - absence_deduction, 2))

    # 4. Filter Completed Printers from 'jobs'
    completed_jobs = []
    for job in db.get("jobs", []):
        if (
            job.get("assignedTech", "").lower() == display_name.lower()
            and job.get("status", "").lower() == "completed"
        ):
            # Use updatedAt if available, otherwise createdAt
            ref_iso = job.get("updatedAt") or job.get("createdAt")
            dt_job = parse_iso_sast(ref_iso)
            if not dt_job:
                continue
            job_date = dt_job.strftime("%Y-%m-%d")
            if start_date <= job_date <= end_date:
                completed_jobs.append({
                    "id": job.get("id", "-"),
                    "date": job_date,
                    "customer": job.get("customer", "-"),
                    "device": job.get("device", "-"),
                    "sn": job.get("sn", "N/A"),
                    "faults": job.get("faults", "-").replace("\n", "; "),
                    "timing": format_timing(job.get("createdAt"), job.get("updatedAt")),
                    "cost": max(0.0, float(job.get("cost", 0.0))),
                })

    completed_jobs.sort(key=lambda x: x["date"])
    total_job_revenue = sum(j["cost"] for j in completed_jobs)

    # 5. Build HTML Table Rows
    job_rows_html = ""
    for idx, j in enumerate(completed_jobs, 1):
        job_rows_html += f"""
        <tr>
            <td>{idx}</td>
            <td>{j['date']}</td>
            <td><strong>{j['id']}</strong></td>
            <td>{j['device']}<br><small style="color:#555;">S/N: {j['sn']}</small></td>
            <td>{j['customer']}</td>
            <td>{j['faults']}</td>
            <td>{j['timing']}</td>
            <td style="text-align:right;">R {j['cost']:,.2f}</td>
        </tr>
        """
    if not job_rows_html:
        job_rows_html = '<tr><td colspan="8" style="text-align:center;">No completed printers in this period.</td></tr>'

    absent_list_html = ", ".join(absent_dates) if absent_dates else "None (100% Attendance)"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Payslip &amp; Performance Report - {display_name}</title>
<style>
    @page {{ size: A4; margin: 12mm; }}
    body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.4; }}
    .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1b365d; padding-bottom: 10px; margin-bottom: 14px; }}
    .company {{ font-size: 20px; font-weight: bold; color: #1b365d; }}
    .doc-title {{ text-align: right; }}
    .doc-title h2 {{ margin: 0; font-size: 15px; color: #1b365d; text-transform: uppercase; }}
    .grid {{ display: flex; gap: 14px; margin-bottom: 14px; }}
    .card {{ flex: 1; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px; background: #f8fafc; }}
    .card h3 {{ margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; color: #1b365d; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }}
    .card div {{ margin-bottom: 3px; }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 14px; }}
    th, td {{ border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }}
    th {{ background: #1b365d; color: #ffffff; font-size: 11px; text-transform: uppercase; }}
    tr:nth-child(even) {{ background-color: #f8fafc; }}
    .summary-wrap {{ display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-top: 10px; }}
    .absent-box {{ flex: 1; border: 1px solid #fca5a5; background: #fef2f2; padding: 8px 10px; border-radius: 4px; }}
    .pay-table {{ width: 46%; margin-bottom: 0; }}
    .pay-table td {{ font-size: 12px; padding: 6px 8px; }}
    .net-row {{ background: #e2e8f0 !important; font-weight: bold; font-size: 13px; }}
    .red {{ color: #b91c1c; font-weight: bold; }}
    .signatures {{ display: flex; justify-content: space-between; margin-top: 35px; }}
    .sig {{ width: 42%; border-top: 1px solid #333; padding-top: 4px; font-size: 11px; }}
    @media print {{ .no-print {{ display: none; }} }}
</style>
</head>
<body onload="window.print()">
    <div class="no-print" style="background:#fef3c7; border:1px solid #f59e0b; padding:8px; margin-bottom:10px;">
        <strong>Ready to Print:</strong> Press <b>Ctrl + P</b> if the print window does not open automatically.
    </div>

    <div class="header">
        <div>
            <div class="company">Cedar3 Technology (Pty) Ltd</div>
            <div>25 Birmingham Road, Benoni South, Gauteng</div>
            <div>info@cedar3tech.co.za</div>
        </div>
        <div class="doc-title">
            <h2>Technician Payslip &amp;<br>Workshop Job Report</h2>
            <div>Period: <strong>{start_date}</strong> to <strong>{end_date}</strong></div>
            <div>Printed: {datetime.now(SAST).strftime("%Y-%m-%d %H:%M")}</div>
        </div>
    </div>

    <div class="grid">
        <div class="card">
            <h3>Technician Information</h3>
            <div><strong>Name:</strong> {display_name} ({emp_key})</div>
            <div><strong>Role:</strong> {emp.get('role', 'Technician').capitalize()}</div>
            <div><strong>Total Printers Completed:</strong> {len(completed_jobs)} units</div>
            <div><strong>Total Job Value Billed:</strong> R {total_job_revenue:,.2f}</div>
        </div>
        <div class="card">
            <h3>Attendance Summary</h3>
            <div><strong>Scheduled Working Days:</strong> {len(expected_days)} days</div>
            <div><strong>Days Attended:</strong> {days_present} days ({total_hours:.1f} hrs logged)</div>
            <div><strong>Days Absent:</strong> <span class="red">{days_absent} days</span></div>
            <div><strong>Daily Deduction Rate:</strong> R {daily_rate:,.2f} / day</div>
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
        <tbody>
            {job_rows_html}
        </tbody>
    </table>

    <div class="summary-wrap">
        <div class="absent-box">
            <strong style="color:#991b1b;">Absent Dates Deducted ({days_absent}):</strong><br>
            <span>{absent_list_html}</span>
        </div>

        <table class="pay-table">
            <tr>
                <td>Basic Monthly Salary</td>
                <td style="text-align:right;">R {monthly_rate:,.2f}</td>
            </tr>
            <tr>
                <td>Less: Absent Days ({days_absent} &times; R {daily_rate:,.2f})</td>
                <td class="red" style="text-align:right;">- R {absence_deduction:,.2f}</td>
            </tr>
            <tr class="net-row">
                <td>NET PAYABLE</td>
                <td style="text-align:right;">R {net_salary:,.2f}</td>
            </tr>
        </table>
    </div>

    <div class="signatures">
        <div class="sig">Approved By (Manager Signature &amp; Date)</div>
        <div class="sig">Received By ({display_name} Signature &amp; Date)</div>
    </div>
</body>
</html>
"""

    reports_dir = r"C:\Cedar3Web\reports"
    os.makedirs(reports_dir, exist_ok=True)
    out_path = os.path.join(reports_dir, f"Payslip_{display_name}_{start_date}_to_{end_date}.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    webbrowser.open(f"file:///{out_path.replace(os.sep, '/')}")
    print(f"Generated: {out_path}")

if __name__ == "__main__":
    # Change emp_key to "talent", "simba", or "reception"
    generate_technician_payslip(
        emp_key="talent",
        start_date="2026-11-01",
        end_date="2026-11-26",
        include_saturdays=False  # Set True if Saturdays count as regular working days
    )