import { useState } from "react";
import DownloadButton from "../../components/DownloadButton.jsx";
import { Card, Field, PageHeader } from "../../components/ui/index.js";
import { apiCalls } from "../../services/api.js";

export default function Reports() {
  const [range, setRange] = useState(() => {
    const to = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    return { from: `${to.slice(0, 8)}01`, to };
  });
  const report = (name) => () => apiCalls.exports.report(name, range);
  return <>
    <PageHeader eyebrow="Business exports" title="Reports" description="Download spreadsheets generated from the live FitConsole records." />
    <Card title="Report period" eyebrow="Gym local dates · up to 366 days">
      <div className="analytics-filters">
        <Field label="From"><input type="date" required value={range.from} max={range.to} onChange={(event) => setRange({ ...range, from: event.target.value })} /></Field>
        <Field label="To"><input type="date" required value={range.to} min={range.from} onChange={(event) => setRange({ ...range, to: event.target.value })} /></Field>
      </div>
    </Card>
    <div className="report-grid">
      <Card title="Course revenue" eyebrow="For the period"><p className="muted">Payments and revenue per course, excluding voided payments.</p><DownloadButton label="Download course-revenue.xlsx" download={report("course-revenue")} /></Card>
      <Card title="GST report" eyebrow="For the period"><p className="muted">Invoice number, taxable value, CGST, and SGST for each payment, treating amounts as GST-inclusive.</p><DownloadButton label="Download gst.xlsx" download={report("gst")} /></Card>
      <Card title="Renewals & dues" eyebrow="For the period"><p className="muted">Members with an outstanding balance on memberships active during the period.</p><DownloadButton label="Download dues.xlsx" download={report("dues")} /></Card>
      <Card title="Attendance" eyebrow="For the period"><p className="muted">Check-ins per course for each day.</p><DownloadButton label="Download attendance.xlsx" download={report("attendance")} /></Card>
      <Card title="Client directory" eyebrow="Member data"><p className="muted">Names, contact details, assigned trainer, goal, and join date.</p><DownloadButton label="Download clients.xlsx" download={apiCalls.exports.clients} /></Card>
      <Card title="Payment ledger" eyebrow="Collections"><p className="muted">Recorded payment dates, amounts, methods, and membership references.</p><DownloadButton label="Download payments.xlsx" download={apiCalls.exports.payments} /></Card>
    </div>
  </>;
}
