import { Op } from "sequelize";
import { Attendance, Client, Course, Member, Membership, Payment, PaymentDetails, Trainer, User } from "../models/index.js";
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
    const [totalClients, totalTrainers, expiredMemberships, todaysAttendance, recentPayments, recentAttendance] = await Promise.all([
      Client.count(),
      Trainer.count(),
      Membership.count({ distinct: true, col: "clientId", where: { status: "expired" } }),
      Attendance.count({ where: { attendedOn: today } }),
      Payment.findAll({
        where: { voidedAt: null },
        attributes: ["id", "amount", "paymentMethod", "reference", "dateTime"],
        include: [{ model: PaymentDetails, attributes: ["clientId"], include: [{ model: Client, attributes: ["id"], include: [{ model: User, attributes: ["fullName"] }] }] }, { model: Membership, attributes: ["id"], include: [{ model: Course, attributes: ["name"] }] }],
        order: [["dateTime", "DESC"]],
        limit: 8,
      }),
      Attendance.findAll({
        attributes: ["id", "attendedAt", "checkedOutAt", "override"],
        include: [{ model: Member, attributes: ["userId"], include: [{ model: User, attributes: ["fullName"] }] }, { model: Course, attributes: ["name"] }],
        order: [["attendedAt", "DESC"]],
        limit: 8,
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
        totalClients,
        totalTrainers,
        expiredMemberships,
        todaysAttendance,
        recentPayments: recentPayments.map((payment) => ({
          id: payment.id, amount: Number(payment.amount), method: payment.paymentMethod, reference: payment.reference, paidAt: payment.dateTime,
          member: payment.PaymentDetail?.Client?.User?.fullName ?? "Member", clientId: payment.PaymentDetail?.Client?.id ?? null, course: payment.Membership?.Course?.name ?? null,
        })),
        recentAttendance: recentAttendance.map((visit) => ({
          id: visit.id, at: visit.attendedAt, checkedOutAt: visit.checkedOutAt, override: visit.override,
          member: visit.Member?.User?.fullName ?? "Member", course: visit.Course?.name ?? null,
        })),
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
