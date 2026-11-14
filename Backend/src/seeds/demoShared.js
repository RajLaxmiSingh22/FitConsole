// Shared helpers for the demo seeds. They only ever touch the demo accounts passed to them.
import { Op } from "sequelize";
import {
  Attendance, CashfreeOrder, Conversation, ConversationParticipant, DietPlan, DietPlanReview, DietTracker, DietTrackerAuthor,
  EmailLog, Membership, Message, Payment, PaymentAudit, PaymentDetails, ProgressEntry, ReminderLog, TrainerNote, WaiverAcceptance,
  WaiverAudit, WellnessCheckin,
} from "../models/index.js";

// IST date + "HH:MM" → UTC instant.
export const istInstant = (date, time) => new Date(`${date}T${time}:00+05:30`);
export const isoWeekday = (date) => ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;

// Small deterministic random generator so every run produces the same shape of data.
export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Removes only this demo client's own history, children first.
export async function clearHistory(user, client, transaction) {
  const memberships = await Membership.findAll({ where: { clientId: user.id }, attributes: ["id"], transaction });
  const membershipIds = memberships.map((row) => row.id);
  const details = await PaymentDetails.findAll({ where: { clientId: client.id }, attributes: ["paymentId"], transaction });
  const paymentIds = [...new Set([
    ...details.map((row) => row.paymentId),
    ...(await Payment.findAll({ where: { membershipId: membershipIds }, attributes: ["id"], transaction })).map((row) => row.id),
  ])];
  await ReminderLog.destroy({ where: { [Op.or]: [{ clientId: client.id }, { paymentId: paymentIds }] }, transaction });
  await PaymentAudit.destroy({ where: { paymentId: paymentIds }, transaction });
  await CashfreeOrder.destroy({ where: { [Op.or]: [{ clientId: client.id }, { membershipId: membershipIds }, { paymentId: paymentIds }] }, transaction });
  await PaymentDetails.destroy({ where: { paymentId: paymentIds }, transaction });
  await Payment.destroy({ where: { id: paymentIds }, transaction });
  await Attendance.destroy({ where: { clientId: user.id }, transaction });
  await Membership.destroy({ where: { id: membershipIds }, transaction });
  await ProgressEntry.destroy({ where: { clientId: client.id }, transaction });
  const trackers = await DietTracker.findAll({ where: { clientId: client.id }, attributes: ["id"], transaction });
  await DietTrackerAuthor.destroy({ where: { dietTrackerId: trackers.map((row) => row.id) }, transaction });
  await DietTracker.destroy({ where: { clientId: client.id }, transaction });
  const plans = await DietPlan.findAll({ where: { clientId: user.id }, attributes: ["id"], transaction });
  await DietPlanReview.destroy({ where: { dietPlanId: plans.map((row) => row.id) }, transaction });
  await DietPlan.destroy({ where: { clientId: user.id }, transaction });
  const acceptances = await WaiverAcceptance.findAll({ where: { clientId: client.id }, attributes: ["id"], transaction });
  await WaiverAudit.destroy({ where: { waiverAcceptanceId: acceptances.map((row) => row.id) }, transaction });
  await WaiverAcceptance.destroy({ where: { clientId: client.id }, transaction });
  const conversations = await ConversationParticipant.findAll({ where: { userId: user.id }, attributes: ["conversationId"], transaction });
  const conversationIds = conversations.map((row) => row.conversationId);
  await Message.destroy({ where: { conversationId: conversationIds }, transaction });
  await ConversationParticipant.destroy({ where: { conversationId: conversationIds }, transaction });
  await Conversation.destroy({ where: { id: conversationIds }, transaction });
  await EmailLog.destroy({ where: { userId: user.id }, transaction });
  await WellnessCheckin.destroy({ where: { clientId: client.id }, transaction });
  await TrainerNote.destroy({ where: { clientId: client.id }, transaction });
}

