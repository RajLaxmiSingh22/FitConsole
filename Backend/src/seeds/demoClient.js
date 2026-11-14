// Seeds the public demo client "Alex Morgan" with ~2 months of history: `npm run seed:demo`.
// Idempotent: each run removes only the demo account's own history and rebuilds it relative to today,
// so dates stay current and nothing is duplicated. All records are marked as DEMO where a text field exists.
import argon2 from "argon2";
import dotenv from "dotenv";
import { Op } from "sequelize";

dotenv.config();
const { sequelize } = await import("../database.js");
const {
  Attendance, CashfreeOrder, Client, Conversation, ConversationParticipant, Course, CoursePlan, DietPlan,
  DietPlanReview, DietTracker, DietTrackerAuthor, EmailLog, Member, Membership, Message, Payment, PaymentAudit,
  PaymentDetails, ProgressEntry, ReminderLog, Trainer, TrainerDetails, TrainerNote, User, UserStatus, WaiverAcceptance, WaiverAudit, WellnessCheckin,
} = await import("../models/index.js");
const { runMigrations } = await import("../runMigrations.js");
const { clearHistory, istInstant, isoWeekday } = await import("./demoShared.js");
const { getDemoConfig } = await import("../utils/demo.js");
const { getCurrentWaiver } = await import("../utils/waiver.js");
const { addDaysToDateString, todayInGymTz } = await import("../utils/dates.js");
const { addMembershipMonths } = await import("../utils/membershipDates.js");
const { dietPlanSchema } = await import("../validation/index.js");

const DEMO_TAG = "DEMO";
const MEMBERSHIP_MONTHS = 3;
const HISTORY_DAYS = 60;


async function chooseCourseAndTrainer(transaction) {
  const courses = await Course.findAll({ where: { active: true }, include: [CoursePlan, { model: Trainer, include: [{ model: User, attributes: ["id", "fullName", "email"] }] }], transaction });
  let course = courses.find((item) => /strength/i.test(item.name)) ?? courses[0];
  if (!course) {
    course = await Course.create({ name: "Strength & Conditioning", category: "strength", description: "Progressive strength and conditioning training.", price: 1000 }, { transaction });
    await CoursePlan.bulkCreate([1, 3, 6, 12].map((months) => ({ courseId: course.id, durationMonths: months, price: [1000, 2940, 5700, 10800][[1, 3, 6, 12].indexOf(months)] })), { transaction });
    course = await Course.findByPk(course.id, { include: [CoursePlan, { model: Trainer, include: [User] }], transaction });
  }
  // Prefer the demo gym's coach for this course, so the public demo never shows a real coach.
  let trainer = course.Trainers?.find((item) => item.User?.email?.endsWith("@demo.fitconsole.example.com")) ?? course.Trainers?.[0] ?? await Trainer.findOne({ include: [User], transaction });
  if (!trainer) {
    // Fresh database: a dedicated demo coach without a usable login.
    const coach = await User.create({ fullName: "Demo Coach", email: "demo.coach@fitconsole.example.com", passwordHash: await argon2.hash(crypto.randomUUID()), role: "trainer" }, { transaction });
    trainer = await Trainer.create({ userId: coach.id, certification: "NSCA-CSCS" }, { transaction });
    await TrainerDetails.create({ userId: coach.id, experienceYears: 7, details: {} }, { transaction });
    await UserStatus.create({ userId: coach.id, active: true }, { transaction });
    trainer = await Trainer.findByPk(coach.id, { include: [User], transaction });
  }
  if (!course.Trainers?.some((item) => item.userId === trainer.userId)) await course.addTrainer(trainer, { transaction });
  const plan = course.CoursePlans.find((item) => Number(item.durationMonths) === MEMBERSHIP_MONTHS) ?? course.CoursePlans[0];
  return { course, trainer, plan };
}

async function upsertDemoUser(demo, transaction) {
  const passwordHash = await argon2.hash(demo.password);
  let user = await User.findOne({ where: { email: demo.email }, transaction });
  if (user && user.role !== "client") throw new Error(`${demo.email} belongs to a ${user.role} account; choose another DEMO_CLIENT_EMAIL.`);
  if (user) await user.update({ fullName: "Alex Morgan", passwordHash }, { transaction });
  else user = await User.create({ fullName: "Alex Morgan", email: demo.email, passwordHash, role: "client" }, { transaction });
  await UserStatus.upsert({ userId: user.id, active: true }, { transaction });
  return user;
}

function dietPlanBody() {
  const meals = [
    { name: "Breakfast", time: "7:30 AM", items: [
      { food: "Oats cooked in milk with banana", quantity: "70 g oats, 250 ml milk, 1 banana", calories: 520, proteinG: 22 },
      { food: "Boiled eggs", quantity: "3 eggs", calories: 210, proteinG: 18 },
    ] },
    { name: "Lunch", time: "1:30 PM", items: [
      { food: "Grilled chicken breast", quantity: "180 g", calories: 300, proteinG: 55 },
      { food: "Brown rice", quantity: "1.5 cups cooked", calories: 330, proteinG: 7 },
      { food: "Dal and mixed vegetable sabzi", quantity: "1 bowl each", calories: 290, proteinG: 13 },
    ] },
    { name: "Evening snack", time: "5:00 PM", items: [
      { food: "Greek yogurt with almonds", quantity: "200 g yogurt, 15 almonds", calories: 280, proteinG: 22 },
      { food: "Whey protein shake (post-workout)", quantity: "1 scoop in water", calories: 120, proteinG: 24 },
    ] },
    { name: "Dinner", time: "8:30 PM", items: [
      { food: "Paneer bhurji", quantity: "150 g paneer", calories: 410, proteinG: 28 },
      { food: "Whole-wheat roti", quantity: "3 rotis", calories: 300, proteinG: 9 },
      { food: "Cucumber and tomato salad", quantity: "1 bowl", calories: 60, proteinG: 2 },
    ] },
  ];
  const plan = {
    title: `${DEMO_TAG} · Lean muscle gain plan`,
    dailyCalories: 2820,
    macros: { proteinG: 200, carbsG: 300, fatG: 85 },
    meals,
    hydrationLitres: 3.5,
    notes: ["Eat within 60 minutes after training.", "Keep salt moderate and drink water through the day.", "Sample plan for the FitConsole live demo."],
  };
  const { value, error } = dietPlanSchema.validate(plan);
  if (error) throw new Error(`Demo diet plan is invalid: ${error.message}`);
  return value;
}

async function seed() {
  const demo = getDemoConfig({ ...process.env, DEMO_MODE_ENABLED: "true" });
  if (!demo.email || !demo.password) throw new Error("Set DEMO_CLIENT_EMAIL and DEMO_CLIENT_PASSWORD in Backend/.env first.");
  if (demo.password.length < 12) throw new Error("DEMO_CLIENT_PASSWORD must be at least 12 characters.");
  await runMigrations(sequelize);

  const today = todayInGymTz();
  const joined = addDaysToDateString(today, -HISTORY_DAYS);
  const dateOfBirth = addDaysToDateString(today, -Math.round(25.4 * 365.25));
  const waiver = await getCurrentWaiver();

  const summary = await sequelize.transaction(async (transaction) => {
    const user = await upsertDemoUser(demo, transaction);
    const { course, trainer, plan } = await chooseCourseAndTrainer(transaction);
    const [client] = await Client.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id }, transaction });
    await clearHistory(user, client, transaction);

    // Profile: 25-year-old male, 175 cm, started at 75 kg aiming for lean muscle gain.
    await client.update({
      trainerId: trainer.id, phone: "0000000000", gender: "male", dateOfBirth, heightCm: 175, weightKg: 76.4,
      goal: "Build lean muscle and get stronger on the big lifts.", goalCategory: "muscle_gain",
      dietPreference: "non_veg", allergies: [], bloodGroup: "B+", joinedAt: joined, trainingDays: [1, 3, 5, 6],
      healthIssues: null, injuries: null, address: null,
    }, { transaction });
    await Member.upsert({ userId: user.id, phone: "0000000000", dateOfBirth, joinedAt: joined }, { transaction });

    // Agreement accepted on joining.
    const acceptance = await WaiverAcceptance.create({ clientId: client.id, agreementVersion: waiver.version, acceptedAt: istInstant(joined, "09:00"), documentReference: `${DEMO_TAG} seed` }, { transaction });
    await WaiverAudit.create({ waiverAcceptanceId: acceptance.id, ipAddress: null }, { transaction });

    // Active 3-month membership, paid in two instalments (no Cashfree call is made).
    const total = Number(plan.price);
    const membership = await Membership.create({
      clientId: user.id, courseId: course.id, startDate: joined, endDate: addMembershipMonths(joined, Number(plan.durationMonths)), totalAmount: total, status: "active",
    }, { transaction });
    const firstInstalment = Math.round(total / 2);
    const payments = [
      [joined, "10:15", firstInstalment, "upi", `${DEMO_TAG}-UPI-7F3K2Q`],
      [addDaysToDateString(joined, 30), "18:40", total - firstInstalment, "card", `${DEMO_TAG}-CARD-4421`],
    ];
    for (const [date, time, amount, paymentMethod, reference] of payments) {
      const payment = await Payment.create({ membershipId: membership.id, amount, paymentMethod, reference, dateTime: istInstant(date, time) }, { transaction });
      await PaymentDetails.create({ paymentId: payment.id, clientId: client.id }, { transaction });
    }

    // Attendance: Mon/Wed/Fri evenings plus most Saturdays, with a few realistic missed sessions.
    const attendance = [];
    for (let offset = HISTORY_DAYS; offset >= 1; offset -= 1) {
      const day = addDaysToDateString(today, -offset);
      const weekday = isoWeekday(day);
      const planned = [1, 3, 5].includes(weekday) || (weekday === 6 && offset % 3 !== 0);
      if (!planned || offset % 11 === 0) continue;
      const time = weekday === 6 ? `10:${String(5 + (offset % 20)).padStart(2, "0")}` : `18:${String(5 + (offset % 40)).padStart(2, "0")}`;
      attendance.push({ clientId: user.id, courseId: course.id, trainerId: trainer.userId, attendedOn: day, attendedAt: istInstant(day, time), checkedOutAt: new Date(istInstant(day, time).getTime() + (65 + (offset % 4) * 10) * 60_000) });
    }
    await Attendance.bulkCreate(attendance, { transaction });

    // Weekly progress: weight trending up, stamina improving.
    const progress = [];
    for (let week = 0; week <= 8; week += 1) {
      const day = addDaysToDateString(joined, week * 7);
      progress.push({
        clientId: client.id,
        weightKg: Number((75 + week * 0.18).toFixed(1)),
        stamina: Math.min(9, 5 + Math.floor(week / 2)),
        waistCm: week % 2 === 0 ? Number((84 - week * 0.15).toFixed(1)) : null,
        chestCm: week % 2 === 0 ? Number((98 + week * 0.25).toFixed(1)) : null,
        armCm: week % 2 === 0 ? Number((33 + week * 0.12).toFixed(1)) : null,
        hipsCm: week % 2 === 0 ? 96 : null,
        staminaNotes: ["Settling into the routine.", "Squat up to 70 kg for 5.", "Bench 55 kg for 6.", "Deadlift 100 kg for 5.", "Felt strong all week.", "Pull-ups: 6 strict reps.", "Squat 82.5 kg for 5.", "Deadlift 115 kg for 3.", "Bench 62.5 kg for 5."][week],
        recordedAt: istInstant(day, "20:30"),
      });
    }
    await ProgressEntry.bulkCreate(progress, { transaction });

    // Daily diet check-ins for the last two weeks.
    for (let offset = 14; offset >= 1; offset -= 1) {
      const day = addDaysToDateString(today, -offset);
      const calories = 2650 + ((offset * 37) % 300);
      const tracker = await DietTracker.create({
        clientId: client.id, recordedOn: day, weightKg: Number((76.6 - offset * 0.02).toFixed(2)),
        sleepDurationHours: 7 + (offset % 3) * 0.5, hunger: ["Low", "Normal", "High"][offset % 3], mood: ["Good", "Energetic", "Tired"][offset % 3],
        calories, macronutrients: { proteinG: 180 + (offset % 4) * 6, carbsG: 290 + (offset % 5) * 8, fatG: 78 + (offset % 3) * 4 },
        fiberGrams: 28 + (offset % 4), waterLiters: 3 + (offset % 2) * 0.5,
      }, { transaction });
      await DietTrackerAuthor.create({ dietTrackerId: tracker.id, userId: user.id }, { transaction });
    }

    // Wellness check-ins every 2–3 days; energy follows sleep, with one sore-shoulder report.
    const wellness = [];
    for (let offset = 58; offset >= 1; offset -= offset % 3 === 0 ? 3 : 2) {
      const sleep = [7.5, 6, 8, 7, 5.5, 8.5, 7][offset % 7];
      const energy = sleep >= 7.5 ? 5 : sleep >= 7 ? 4 : sleep >= 6 ? 3 : 2;
      const pain = offset === 17;
      wellness.push({ clientId: client.id, recordedOn: addDaysToDateString(today, -offset), mood: energy >= 4 ? "happy" : energy <= 2 ? "low" : "neutral", energy, stress: 6 - energy, motivation: Math.min(5, energy + 1), soreness: [2, 3, 2, 4, 2][offset % 5], sleepHours: sleep, pain, problem: pain ? "Sore right shoulder after overhead press (demo)" : null, notes: null });
    }
    await WellnessCheckin.bulkCreate(wellness, { transaction });
    await TrainerNote.bulkCreate([
      { clientId: client.id, authorId: trainer.userId, kind: "recommendation", body: "Add a fourth session on Saturdays and keep protein around 200 g a day.", createdAt: istInstant(addDaysToDateString(today, -12), "19:40") },
      { clientId: client.id, authorId: trainer.userId, kind: "note", body: "Reported shoulder soreness after overhead press; swapped to landmine press for two weeks.", createdAt: istInstant(addDaysToDateString(today, -16), "18:10") },
      { clientId: client.id, authorId: trainer.userId, kind: "recommendation", body: "Great consistency. Next block: deadlift 120 kg for 3.", createdAt: istInstant(addDaysToDateString(today, -3), "20:05") },
    ], { transaction });

    // Approved diet plan from the coach.
    const dietPlan = await DietPlan.create({
      clientId: user.id, trainerId: trainer.userId, courseId: course.id, plan: dietPlanBody(), status: "approved", reviewedAt: istInstant(addDaysToDateString(joined, 2), "12:00"),
    }, { transaction });
    await DietPlanReview.create({ dietPlanId: dietPlan.id, reviewedBy: trainer.userId }, { transaction });

    // Conversation with the coach.
    const conversation = await Conversation.create({}, { transaction });
    await ConversationParticipant.bulkCreate([{ conversationId: conversation.id, userId: user.id }, { conversationId: conversation.id, userId: trainer.userId }], { transaction });
    const coachName = trainer.User?.fullName?.split(/\s+/)[0] ?? "Coach";
    const thread = [
      [trainer.userId, 59, "09:30", "Welcome to FitConsole, Alex! I've set up your strength block: Mon/Wed/Fri plus an optional Saturday session."],
      [user.id, 59, "10:02", `Thanks ${coachName}! Should I train fasted in the evening?`],
      [trainer.userId, 59, "10:20", "No, have the 5 PM snack from your plan so you have energy for the session."],
      [trainer.userId, 30, "19:45", "Great month. Your squat went from 70 to 80 kg. Next block we add a fourth day."],
      [user.id, 3, "21:10", "Hit 115 kg on deadlift today!"],
      [trainer.userId, 2, "08:15", "Huge! Keep protein around 200 g and get 7+ hours of sleep before Friday."],
    ];
    await Message.bulkCreate(thread.map(([senderId, daysAgo, time, body]) => ({
      conversationId: conversation.id, senderId, body, createdAt: istInstant(addDaysToDateString(today, -daysAgo), time),
      readAt: istInstant(addDaysToDateString(today, -daysAgo), time),
    })), { transaction });

    return { user, course, trainer, membership, attendance: attendance.length, progress: progress.length, payments: payments.length, messages: thread.length };
  });

  console.log(`Demo client ready: ${summary.user.fullName} <${summary.user.email}>`);
  console.log(`  ${summary.course.name} · coach ${summary.trainer.User?.fullName} · membership ${summary.membership.startDate} → ${summary.membership.endDate}`);
  console.log(`  ${summary.payments} payments · ${summary.attendance} check-ins · ${summary.progress} progress entries · 14 diet check-ins · 1 approved diet plan · ${summary.messages} messages`);
}

try {
  await seed();
} catch (error) {
  console.error("Demo seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
