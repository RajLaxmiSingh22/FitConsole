import ExcelJS from "exceljs";
import { Client, Payment, PaymentDetails, User, UserStatus } from "../models/index.js";

async function sendWorkbook(res, filename, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  sheet.columns = columns;
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  return res.end();
}

export async function exportPayments(_req, res) {
  try {
    const payments = await Payment.findAll({
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
      { header: "Amount", key: "amount", width: 14 },
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
