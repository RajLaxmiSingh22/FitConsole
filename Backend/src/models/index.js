import Attendance from "./Attendance.js";
import AnalyticsEvent from "./AnalyticsEvent.js";
import CashfreeOrder from "./CashfreeOrder.js";
import Client from "./Client.js";
import Course from "./Course.js";
import CoursePlan from "./CoursePlan.js";
import Conversation from "./Conversation.js";
import ConversationParticipant from "./ConversationParticipant.js";
import DietPlan from "./DietPlan.js";
import DietPlanReview from "./DietPlanReview.js";
import DietTracker from "./DietTracker.js";
import DietTrackerAuthor from "./DietTrackerAuthor.js";
import Member from "./Member.js";
import Membership from "./Membership.js";
import LeadActivity from "./LeadActivity.js";
import Message from "./Message.js";
import Payment from "./Payment.js";
import PaymentAudit from "./PaymentAudit.js";
import PasswordResetToken from "./PasswordResetToken.js";
import RefreshToken from "./RefreshToken.js";
import ReminderLog from "./ReminderLog.js";
import PaymentDetails from "./PaymentDetails.js";
import ProgressEntry from "./ProgressEntry.js";
import Trainer from "./Trainer.js";
import TrainerDetails from "./TrainerDetails.js";
import User from "./User.js";
import UserStatus from "./UserStatus.js";
import WebsiteLead from "./WebsiteLead.js";
import WaiverAcceptance from "./WaiverAcceptance.js";
import WaiverAudit from "./WaiverAudit.js";

User.hasOne(Trainer, { foreignKey: "userId", onDelete: "CASCADE" });
Trainer.belongsTo(User, { foreignKey: "userId" });
Trainer.hasOne(TrainerDetails, { foreignKey: "userId", onDelete: "CASCADE" });
TrainerDetails.belongsTo(Trainer, { foreignKey: "userId" });
User.hasOne(Member, { foreignKey: "userId", onDelete: "CASCADE" });
Member.belongsTo(User, { foreignKey: "userId" });
User.hasOne(Client, { foreignKey: "userId", onDelete: "CASCADE" });
Client.belongsTo(User, { foreignKey: "userId" });
Trainer.belongsToMany(Course, { through: "trainer_courses", foreignKey: "trainerId" });
Course.belongsToMany(Trainer, { through: "trainer_courses", foreignKey: "courseId" });
Course.hasMany(CoursePlan, { foreignKey: "courseId", onDelete: "CASCADE" });
CoursePlan.belongsTo(Course, { foreignKey: "courseId" });
Trainer.hasMany(Client, { foreignKey: "trainerId", sourceKey: "id" });
Client.belongsTo(Trainer, { foreignKey: "trainerId", targetKey: "id" });
Member.hasMany(Membership, { foreignKey: { name: "clientId", allowNull: false }, sourceKey: "userId" });
Membership.belongsTo(Member, { foreignKey: { name: "clientId", allowNull: false }, targetKey: "userId" });
Course.hasMany(Membership, { foreignKey: { name: "courseId", allowNull: false } });
Membership.belongsTo(Course, { foreignKey: { name: "courseId", allowNull: false } });
Membership.hasMany(Payment, { foreignKey: "membershipId" });
Payment.belongsTo(Membership, { foreignKey: "membershipId" });
Payment.hasOne(PaymentDetails, { foreignKey: "paymentId", onDelete: "CASCADE" });
PaymentDetails.belongsTo(Payment, { foreignKey: "paymentId" });
Payment.hasMany(PaymentAudit, { foreignKey: "paymentId", onDelete: "CASCADE" });
PaymentAudit.belongsTo(Payment, { foreignKey: "paymentId" });
Client.hasMany(PaymentDetails, { foreignKey: "clientId" });
PaymentDetails.belongsTo(Client, { foreignKey: "clientId" });
Member.hasMany(Attendance, { foreignKey: { name: "clientId", allowNull: false }, sourceKey: "userId" });
Attendance.belongsTo(Member, { foreignKey: { name: "clientId", allowNull: false }, targetKey: "userId" });
Course.hasMany(Attendance, { foreignKey: { name: "courseId", allowNull: false } });
Attendance.belongsTo(Course, { foreignKey: { name: "courseId", allowNull: false } });
Trainer.hasMany(Attendance, { foreignKey: "trainerId" });
Attendance.belongsTo(Trainer, { foreignKey: "trainerId" });
Member.hasMany(DietPlan, { foreignKey: { name: "clientId", allowNull: false }, sourceKey: "userId" });
DietPlan.belongsTo(Member, { foreignKey: { name: "clientId", allowNull: false }, targetKey: "userId" });
Trainer.hasMany(DietPlan, { foreignKey: { name: "trainerId", allowNull: false } });
DietPlan.belongsTo(Trainer, { foreignKey: { name: "trainerId", allowNull: false } });
Course.hasMany(DietPlan, { foreignKey: "courseId" });
DietPlan.belongsTo(Course, { foreignKey: "courseId" });
Client.hasMany(DietTracker, { foreignKey: { name: "clientId", allowNull: false } });
DietTracker.belongsTo(Client, { foreignKey: { name: "clientId", allowNull: false } });
DietTracker.hasOne(DietTrackerAuthor, { foreignKey: "dietTrackerId", onDelete: "CASCADE" });
DietTrackerAuthor.belongsTo(DietTracker, { foreignKey: "dietTrackerId" });
User.hasMany(DietTrackerAuthor, { foreignKey: "userId" });
DietTrackerAuthor.belongsTo(User, { foreignKey: "userId" });
DietPlan.hasOne(DietPlanReview, { foreignKey: "dietPlanId", onDelete: "CASCADE" });
DietPlanReview.belongsTo(DietPlan, { foreignKey: "dietPlanId" });
Client.hasMany(WaiverAcceptance, { foreignKey: { name: "clientId", allowNull: false } });
WaiverAcceptance.belongsTo(Client, { foreignKey: { name: "clientId", allowNull: false } });
WaiverAcceptance.hasOne(WaiverAudit, { foreignKey: "waiverAcceptanceId", onDelete: "CASCADE" });
WaiverAudit.belongsTo(WaiverAcceptance, { foreignKey: "waiverAcceptanceId" });
Client.hasMany(ProgressEntry, { foreignKey: { name: "clientId", allowNull: false } });
ProgressEntry.belongsTo(Client, { foreignKey: { name: "clientId", allowNull: false } });
Conversation.hasMany(Message, { foreignKey: "conversationId", onDelete: "CASCADE" });
Message.belongsTo(Conversation, { foreignKey: "conversationId" });
Conversation.belongsToMany(User, {
  through: ConversationParticipant,
  foreignKey: "conversationId",
  otherKey: "userId",
});
User.belongsToMany(Conversation, {
  through: ConversationParticipant,
  foreignKey: "userId",
  otherKey: "conversationId",
});
User.hasOne(UserStatus, { foreignKey: "userId", onDelete: "CASCADE" });
UserStatus.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Message, { foreignKey: "senderId" });
Message.belongsTo(User, { foreignKey: "senderId" });
User.hasMany(PasswordResetToken, { foreignKey: "userId", onDelete: "CASCADE" });
PasswordResetToken.belongsTo(User, { foreignKey: "userId" });
User.hasMany(RefreshToken, { foreignKey: "userId", onDelete: "CASCADE" });
RefreshToken.belongsTo(User, { foreignKey: "userId" });
Course.hasMany(WebsiteLead, { foreignKey: "courseId" });
WebsiteLead.belongsTo(Course, { foreignKey: "courseId" });
Client.hasMany(WebsiteLead, { foreignKey: "clientId" });
WebsiteLead.belongsTo(Client, { foreignKey: "clientId" });
WebsiteLead.hasMany(LeadActivity, { foreignKey: "leadId", onDelete: "CASCADE" });
LeadActivity.belongsTo(WebsiteLead, { foreignKey: "leadId" });
User.hasMany(LeadActivity, { foreignKey: "userId" });
LeadActivity.belongsTo(User, { foreignKey: "userId" });
WebsiteLead.hasMany(AnalyticsEvent, { foreignKey: "leadId" });
AnalyticsEvent.belongsTo(WebsiteLead, { foreignKey: "leadId" });

export {
  Attendance,
  AnalyticsEvent,
  CashfreeOrder,
  Client,
  Course,
  CoursePlan,
  Conversation,
  ConversationParticipant,
  DietPlan,
  DietPlanReview,
  DietTracker,
  DietTrackerAuthor,
  Member,
  Membership,
  LeadActivity,
  Message,
  Payment,
  PaymentAudit,
  PasswordResetToken,
  RefreshToken,
  ReminderLog,
  PaymentDetails,
  ProgressEntry,
  Trainer,
  TrainerDetails,
  User,
  UserStatus,
  WebsiteLead,
  WaiverAcceptance,
  WaiverAudit,
};
