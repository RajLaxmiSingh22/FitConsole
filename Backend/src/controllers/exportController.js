import ExcelJS from "exceljs";
import { QueryTypes } from "sequelize";
import { sequelize } from "../database.js";
import { Client, Payment, PaymentDetails, User, UserStatus } from "../models/index.js";
import { formatInvoiceNumber, getGstRate, splitGstInclusive } from "../utils/gst.js";
import { resolveReportRange } from "../utils/reportRange.js";

const RUPEE_FORMAT = '"₹" #,##0.00';

// Columns marked `currency: true` get rupee formatting; the header row stays frozen while scrolling.
export function buildWorkbook(columns, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map(({ currency, ...column }) => (
    currency ? { ...column, style: { numFmt: RUPEE_FORMAT } } : column
  ));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  return workbook;
}

async function sendWorkbook(res, filename, columns, rows) {
  const workbook = buildWorkbook(columns, rows);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  return res.end();
}

export async function exportPayments(_req, res) {
  try {
    const payments = await Payment.findAll({
      where: { voidedAt: null },
      include: [{
        model: PaymentDetails,
        include: [{ model: Client, include: [{ model: User, attributes: ["fullName", "email"] }] }],
      }],
      order: [["dateTime", "DESC"]],
    });
    const rows = payments.map((payment) => ({
      dateTime: payment.dateTime,
      client: payment.PaymentDetail?.Client?.User?.fullName ?? "",
      email: payment.PaymentDetail?.Client?.User?.email ?? "",
      amount: Number(payment.amount),
      method: payment.paymentMethod,
      reference: payment.reference ?? "",
      membershipId: payment.membershipId ?? "",
    }));
    return await sendWorkbook(res, "payments.xlsx", [
      { header: "Date", key: "dateTime", width: 24 },
      { header: "Client", key: "client", width: 30 },
      { header: "Email", key: "email", width: 32 },
      { header: "Amount", key: "amount", width: 14, currency: true },
      { header: "Method", key: "method", width: 14 },
      { header: "Reference", key: "reference", width: 24 },
      { header: "Membership ID", key: "membershipId", width: 38 },
    ], rows);
  } catch (error) {
    console.error("Payment export failed:", error);
    if (!res.headersSent) return res.status(500).json({ status: "error", message: "Unable to export payments." });
    return res.end();
  }
}

export async function exportClients(_req, res) {
  try {
    const clients = await Client.findAll({
      include: [{ model: User, attributes: ["id", "fullName", "email"] }],
      order: [["createdAt", "DESC"]],
    });
    const statuses = await UserStatus.findAll({
      where: { userId: clients.map((client) => client.userId), active: false },
      attributes: ["userId"],
    });
    const inactiveIds = new Set(statuses.map((status) => status.userId));
    const rows = clients.map((client) => ({
      name: client.User?.fullName ?? "",
      email: client.User?.email ?? "",
      phone: client.phone ?? "",
      trainerId: client.trainerId ?? "",
      goal: client.goal ?? "",
      joinedAt: client.joinedAt,
      active: inactiveIds.has(client.userId) ? "no" : "yes",
    }));
    return await sendWorkbook(res, "clients.xlsx", [
      { header: "Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 32 },
      { header: "Phone", key: "phone", width: 20 },
      { header: "Trainer ID", key: "trainerId", width: 38 },
      { header: "Goal", key: "goal", width: 36 },
      { header: "Joined", key: "joinedAt", width: 16 },
      { header: "Active", key: "active", width: 12 },
    ], rows);
  } catch (error) {
    console.error("Client export failed:", error);
    if (!res.headersSent) return res.status(500).json({ status: "error", message: "Unable to export clients." });
    return res.end();
  }
}

const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

function rangedExport(filename, label, build) {
  return async (req, res) => {
    const range = resolveReportRange(req.validated.query);
    if (range.error) return res.status(400).json({ status: "error", message: range.error });
    try {
      const { columns, rows } = await build({ start: range.start, end: range.end, from: range.from, to: range.to, tz: range.timeZone });
      return await sendWorkbook(res, filename.replace(".xlsx", `_${range.from}_${range.to}.xlsx`), columns, rows);
    } catch (error) {
      console.error(`${label} export failed:`, error);
      if (!res.headersSent) return res.status(500).json({ status: "error", message: `Unable to export ${label.toLowerCase()}.` });
      return res.end();
    }
  };
}

export const exportCourseRevenue = rangedExport("course-revenue.xlsx", "Course revenue", async (range) => ({
  columns: [
    { header: "Course", key: "course", width: 32 },
    { header: "Payments", key: "payments", width: 12 },
    { header: "Revenue", key: "total", width: 16, currency: true },
  ],
  rows: await select(`SELECT COALESCE(c.name, 'Not linked to a course') AS course,
                             COUNT(p.id)::int AS payments, SUM(p.amount)::float AS total
                      FROM payments p
                      LEFT JOIN memberships m ON m.id = p.membership_id
                      LEFT JOIN courses c ON c.id = m.course_id
                      WHERE p.voided_at IS NULL AND p.paid_at >= :start AND p.paid_at < :end
                      GROUP BY c.name ORDER BY total DESC`, range),
}));

export const exportGst = rangedExport("gst.xlsx", "GST report", async (range) => {
  const rate = getGstRate();
  const payments = await select(`SELECT p.invoice_number AS "invoiceNumber",
                                        to_char(p.paid_at AT TIME ZONE :tz, 'YYYY-MM-DD') AS date,
                                        u.full_name AS member, co.name AS course, p.amount::float AS amount
                                 FROM payments p
                                 LEFT JOIN payment_details d ON d.payment_id = p.id
                                 LEFT JOIN clients c ON c.id = d.client_id
                                 LEFT JOIN users u ON u.id = c.user_id
                                 LEFT JOIN memberships m ON m.id = p.membership_id
                                 LEFT JOIN courses co ON co.id = m.course_id
                                 WHERE p.voided_at IS NULL AND p.paid_at >= :start AND p.paid_at < :end
                                 ORDER BY p.invoice_number`, range);
  const half = rate / 2;
  return {
    columns: [
      { header: "Invoice no", key: "invoice", width: 14 },
      { header: "Date", key: "date", width: 12 },
      { header: "Member", key: "member", width: 28 },
      { header: "Course", key: "course", width: 26 },
      { header: `Taxable value (GST ${rate}% incl.)`, key: "taxable", width: 22, currency: true },
      { header: `CGST ${half}%`, key: "cgst", width: 14, currency: true },
      { header: `SGST ${half}%`, key: "sgst", width: 14, currency: true },
      { header: "Total", key: "total", width: 14, currency: true },
    ],
    rows: payments.map((payment) => ({
      invoice: formatInvoiceNumber(payment.invoiceNumber),
      date: payment.date,
      member: payment.member ?? "",
      course: payment.course ?? "",
      ...splitGstInclusive(payment.amount, rate),
    })),
  };
});

export const exportDues = rangedExport("dues.xlsx", "Dues", async (range) => ({
  columns: [
    { header: "Member", key: "member", width: 28 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Course", key: "course", width: 26 },
    { header: "End date", key: "endDate", width: 12 },
    { header: "Total", key: "total", width: 14, currency: true },
    { header: "Paid", key: "paid", width: 14, currency: true },
    { header: "Balance", key: "balance", width: 14, currency: true },
  ],
  // Memberships overlapping the range that still carry a balance.
  rows: await select(`SELECT u.full_name AS member, c.phone, co.name AS course, m.end_date::text AS "endDate",
                             m.total_amount::float AS total,
                             COALESCE(SUM(p.amount) FILTER (WHERE p.voided_at IS NULL), 0)::float AS paid,
                             (m.total_amount - COALESCE(SUM(p.amount) FILTER (WHERE p.voided_at IS NULL), 0))::float AS balance
                      FROM memberships m
                      JOIN users u ON u.id = m.member_id
                      JOIN clients c ON c.user_id = m.member_id
                      JOIN courses co ON co.id = m.course_id
                      LEFT JOIN payments p ON p.membership_id = m.id
                      WHERE m.status IN ('active', 'pending_payment')
                        AND m.start_date <= :to AND m.end_date >= :from
                      GROUP BY m.id, u.full_name, c.phone, co.name
                      HAVING m.total_amount > COALESCE(SUM(p.amount) FILTER (WHERE p.voided_at IS NULL), 0)
                      ORDER BY balance DESC`, range),
}));

export const exportAttendance = rangedExport("attendance.xlsx", "Attendance", async (range) => ({
  columns: [
    { header: "Date", key: "date", width: 12 },
    { header: "Course", key: "course", width: 30 },
    { header: "Check-ins", key: "checkIns", width: 12 },
  ],
  rows: await select(`SELECT to_char(a.attended_at AT TIME ZONE :tz, 'YYYY-MM-DD') AS date,
                             co.name AS course, COUNT(*)::int AS "checkIns"
                      FROM attendance a
                      JOIN courses co ON co.id = a.course_id
                      WHERE a.attended_at >= :start AND a.attended_at < :end
                      GROUP BY 1, co.name ORDER BY 1, co.name`, range),
}));
