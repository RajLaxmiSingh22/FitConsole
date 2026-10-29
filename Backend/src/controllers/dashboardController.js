import { Op } from "sequelize";
import { Attendance, Client, Member, Membership, Payment, Trainer, User } from "../models/index.js";
import { addDaysToDateString, startOfMonthInGymTz, todayInGymTz } from "../utils/dates.js";
import { remainingMembershipBalance } from "../utils/membershipPayments.js";

export async function getOwnerDashboard(_req, res) {
  try {
    const today = todayInGymTz();
    const monthStart = startOfMonthInGymTz();
    const expiringBy = addDaysToDateString(today, 15);
    const [activeMembers, awaitingPayment, revenueThisMonth, expiringSoon, memberships] = await Promise.all([
      Membership.count({
        distinct: true,
        col: "clientId",
        where: { status: "active", startDate: { [Op.lte]: today }, endDate: { [Op.gte]: today } },
      }),
      Membership.count({
        distinct: true,
        col: "clientId",
        where: { status: "pending_payment" },
      }),
      Payment.sum("amount", {
        where: { dateTime: { [Op.gte]: monthStart }, voidedAt: null },
      }),
      Membership.findAll({
        where: { status: "active", endDate: { [Op.between]: [today, expiringBy] } },
        include: [{ model: Member, include: [{ model: User, attributes: ["id", "fullName", "email"] }] }],
        order: [["endDate", "ASC"]],
      }),
      Membership.findAll({
        where: { status: { [Op.in]: ["active", "pending_payment"] } },
        include: [{
          model: Payment,
          attributes: ["amount"],
          where: { voidedAt: null },
          required: false,
        }],
      }),
    ]);
    const dues = memberships.reduce((total, membership) => {
      return total + remainingMembershipBalance(membership.totalAmount, membership.Payments);
    }, 0);
    return res.json({
      status: "success",
      data: {
        activeMembers,
        awaitingPayment,
        revenueThisMonth: Number(revenueThisMonth ?? 0),
        expiringSoon,
        outstandingDues: Number(dues.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Owner dashboard failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve dashboard data." });
  }
}

export async function getTrainerDashboard(req, res) {
  try {
    const today = todayInGymTz();
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
