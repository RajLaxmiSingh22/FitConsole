import { Op } from "sequelize";
import { Attendance, Client, Member, Membership, Payment, Trainer, User } from "../models/index.js";

export async function getOwnerDashboard(_req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const expiringBy = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
    const [activeMembers, revenueThisMonth, expiringSoon, memberships] = await Promise.all([
      Membership.count({ where: { status: "active", endDate: { [Op.gte]: today } } }),
      Payment.sum("amount", { where: { dateTime: { [Op.gte]: monthStart } } }),
      Membership.findAll({
        where: { status: "active", endDate: { [Op.between]: [today, expiringBy] } },
        include: [{ model: Member, include: [{ model: User, attributes: ["id", "fullName", "email"] }] }],
        order: [["endDate", "ASC"]],
      }),
      Membership.findAll({
        where: { status: "active" },
        include: [{ model: Payment, attributes: ["amount"] }],
      }),
    ]);
    const dues = memberships.reduce((total, membership) => {
      const paid = membership.Payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      return total + Math.max(0, Number(membership.totalAmount) - paid);
    }, 0);
    return res.json({
      status: "success",
      data: { activeMembers, revenueThisMonth: Number(revenueThisMonth ?? 0), expiringSoon, outstandingDues: Number(dues.toFixed(2)) },
    });
  } catch (error) {
    console.error("Owner dashboard failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve dashboard data." });
  }
}

export async function getTrainerDashboard(req, res) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 7 * 86400000);
    const trainer = await Trainer.findByPk(req.user.id, { attributes: ["id"] });
    if (!trainer) return res.status(404).json({ status: "error", message: "Trainer profile not found." });
    const [clients, activeMembers, attendanceThisWeek] = await Promise.all([
      Client.count({ where: { trainerId: trainer.id } }),
      Membership.count({
        where: {
          status: "active",
          endDate: { [Op.gte]: today },
          clientId: {
            [Op.in]: await Client.findAll({
              where: { trainerId: trainer.id },
              attributes: ["userId"],
              raw: true,
            }).then((rows) => rows.map((row) => row.userId)),
          },
        },
      }),
      Attendance.count({
        where: { trainerId: req.user.id, attendedAt: { [Op.gte]: since } },
      }),
    ]);
    return res.json({ status: "success", data: { clients, activeMembers, attendanceThisWeek } });
  } catch (error) {
    console.error("Trainer dashboard failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve dashboard data." });
  }
}
