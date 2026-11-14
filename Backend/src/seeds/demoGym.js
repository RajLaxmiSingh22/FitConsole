// Seeds a complete DEMO gym: 5 coaches, Boxing + Kids Martial Arts courses, and 25 members (5 under 13)
// with memberships, cash payments, ~3 months of attendance, progress, wellness and trainer notes.
// Run: `npm run seed:demo-gym`. Idempotent: demo accounts are matched by their @demo.fitconsole.example.com
// email and their history is rebuilt relative to today. Real accounts and their data are never touched.
import argon2 from "argon2";
import dotenv from "dotenv";

dotenv.config();
const { sequelize } = await import("../database.js");
const {
  ClassSession, Client, Course, CoursePlan, Member, Membership, Payment, PaymentAudit, PaymentDetails, ProgressEntry,
  Attendance, Trainer, TrainerDetails, TrainerNote, User, UserStatus, WaiverAcceptance, WaiverAudit, WellnessCheckin,
} = await import("../models/index.js");
const { runMigrations } = await import("../runMigrations.js");
const { getCurrentWaiver } = await import("../utils/waiver.js");
const { addDaysToDateString, todayInGymTz } = await import("../utils/dates.js");
const { addMembershipMonths } = await import("../utils/membershipDates.js");
const { clearHistory, istInstant, isoWeekday, seededRandom } = await import("./demoShared.js");

export const DEMO_DOMAIN = "demo.fitconsole.example.com";
const TAG = "DEMO";
const PRICES = { 1: 1000, 2: 1960, 3: 2940, 6: 5700, 12: 10800 };
const KIDS_PRICES = { 1: 900, 2: 1750, 3: 2550, 6: 4900, 12: 9200 };

// Five coaches; phone numbers are fictional and never dialled by the app.
const TRAINERS = [
  { key: "boxing", name: "Vikram Singh", certification: "AIBA Level 2 Boxing Coach", years: 11, specialties: ["Boxing", "Footwork", "Pad work"], bio: "Former state-level amateur boxer who builds sharp fundamentals: stance, footwork and clean combinations, with supervised sparring for experienced members.", achievements: ["Gold, State Amateur Boxing Championship", "Coached the district junior boxing squad", "10+ years of beginner boxing classes"] },
  { key: "mma", name: "Aditya Rana", certification: "IMMAF Certified MMA Coach", years: 9, specialties: ["MMA", "Muay Thai", "Grappling"], bio: "Competed in national-level amateur MMA and now coaches striking-to-grappling transitions with a strong focus on safety and conditioning.", achievements: ["National amateur MMA championship quarter-finalist", "Brown belt in Brazilian jiu-jitsu", "Corner coach for 30+ amateur bouts"] },
  { key: "strength", name: "Neha Kulkarni", certification: "NSCA-CSCS", years: 8, specialties: ["Strength", "Powerlifting", "Mobility"], bio: "Strength coach who programmes progressive, injury-safe lifting blocks for beginners and athletes alike.", achievements: ["State powerlifting championship finalist", "Strength coach for a college athletics team", "Specialist in returning to lifting after injury"] },
  { key: "fitness", name: "Priya Nair", certification: "ACE Certified Personal Trainer", years: 7, specialties: ["Weight management", "HIIT", "Nutrition coaching"], bio: "Helps members lose fat and build fitness with sustainable conditioning sessions and simple, realistic nutrition habits.", achievements: ["Helped 100+ members reach weight goals", "Certified nutrition coach", "Runs the gym's 12-week transformation programme"] },
  { key: "kids", name: "Sameer Khan", certification: "Kids Martial Arts & Youth Fitness Coach", years: 6, specialties: ["Kids martial arts", "Coordination", "Confidence building"], bio: "Teaches children discipline, coordination and confidence through playful, age-appropriate martial arts and fitness drills.", achievements: ["Black belt in karate", "Child safeguarding certified", "Coaches 60+ children every week"] },
];

const NEW_COURSES = [
  { name: "Boxing Fundamentals", category: "combat", description: "Beginner-friendly boxing training covering stance, footwork, punches, defence, conditioning, and supervised practice.", minAge: 8, maxAge: null, level: "beginner", prices: PRICES, trainer: "boxing",
    sessions: [[[1, 3, 5], "07:00", "08:00", "All levels"], [[1, 3, 5], "19:00", "20:00", "Beginner"], [[2, 4], "18:00", "19:00", "Intermediate"], [[6], "10:00", "11:30", "All levels"]] },
  { name: "Kids Martial Arts", category: "kids", description: "Playful, age-appropriate martial arts and fitness for children aged 6 to 12: coordination, discipline and confidence.", minAge: 6, maxAge: 12, level: "beginner", prices: KIDS_PRICES, trainer: "kids",
    sessions: [[[2, 4], "17:00", "18:00", "Kids"], [[6], "09:00", "10:00", "Kids"], [[7], "10:00", "11:00", "Kids"]] },
];

// Coaching on existing courses (by name); the age limits are only set if the course has none yet.
const EXISTING_COURSES = [
  { name: "MMA Fundamentals", trainer: "mma", minAge: 8, sessions: [[[2, 4], "07:00", "08:00", "All levels"], [[1, 3], "20:00", "21:30", "Advanced"]] },
  { name: "Strength & Conditioning", trainer: "strength", minAge: 15, sessions: [[[1, 3, 5], "06:00", "07:00", "All levels"], [[2, 4, 6], "17:30", "18:30", "Beginner"]] },
  { name: "Fitness Conditioning", trainer: "fitness", minAge: 13, sessions: [[[1, 3, 5], "09:00", "10:00", "Women only"], [[2, 4], "13:00", "14:00", "All levels"], [[6], "08:00", "09:00", "All levels"]] },
];

// 25 members: [name, gender, ageYears, courseName, coachKey, planMonths, startDaysAgo, pattern, slot, trainingDays, goal, extra]
// startDaysAgo is when the current membership began; "renewed" members also have an earlier, expired membership.
const MEMBERS = [
  ["Rahul Sharma", "male", 27, "Boxing Fundamentals", "boxing", 6, 75, "consistent", "evening", [1, 3, 5], "muscle_gain"],
  ["Ananya Iyer", "female", 24, "Fitness Conditioning", "fitness", 1, 12, "average", "morning", [1, 3, 5], "fat_loss", { renewed: true }],
  ["Karan Mehta", "male", 31, "Strength & Conditioning", "strength", 12, 88, "consistent", "morning", [1, 2, 4, 5], "muscle_gain"],
  ["Sneha Patel", "female", 29, "Fitness Conditioning", "fitness", 2, 40, "occasional", "afternoon", [2, 4, 6], "fat_loss"],
  ["Arjun Reddy", "male", 22, "MMA Fundamentals", "mma", 6, 60, "average", "evening", [1, 3, 6], "maintain"],
  ["Pooja Desai", "female", 35, "Fitness Conditioning", "fitness", 6, 82, "declining", "morning", [1, 3, 5], "fat_loss"],
  ["Rohit Verma", "male", 40, "Strength & Conditioning", "strength", 1, 50, "occasional", "evening", [2, 4], "maintain", { lapsed: true }],
  ["Divya Menon", "female", 26, "Boxing Fundamentals", "boxing", 12, 70, "consistent", "evening", [1, 3, 5, 6], "fat_loss"],
  ["Aman Gupta", "male", 33, "MMA Fundamentals", "mma", 2, 9, "recent", "evening", [1, 3, 5], "fat_loss"],
  ["Kavita Joshi", "female", 45, "Fitness Conditioning", "fitness", 12, 85, "average", "afternoon", [2, 4], "maintain"],
  ["Nikhil Bansal", "male", 28, "Strength & Conditioning", "strength", 6, 45, "consistent", "evening", [1, 3, 5, 6], "muscle_gain"],
  ["Meghna Rao", "female", 30, "Boxing Fundamentals", "boxing", 1, 20, "average", "morning", [1, 3, 5], "fat_loss", { renewed: true }],
  ["Siddharth Nair", "male", 25, "MMA Fundamentals", "mma", 12, 80, "consistent", "evening", [1, 2, 4, 6], "muscle_gain"],
  ["Ritika Chawla", "female", 21, "Fitness Conditioning", "fitness", 2, 55, "declining", "evening", [1, 3, 5], "fat_loss", { partial: true }],
  ["Varun Kapoor", "male", 37, "Boxing Fundamentals", "boxing", 2, 30, "occasional", "afternoon", [2, 4, 6], "maintain"],
  ["Ishita Saxena", "female", 32, "Strength & Conditioning", "strength", 6, 65, "average", "morning", [1, 3, 5], "muscle_gain"],
  ["Harsh Vardhan", "male", 19, "MMA Fundamentals", "mma", 1, 6, "recent", "evening", [1, 3, 5], "muscle_gain"],
  ["Tanvi Kulkarni", "female", 27, "Fitness Conditioning", "fitness", 12, 60, "consistent", "morning", [1, 2, 4, 5], "fat_loss"],
  ["Manish Tiwari", "male", 42, "Strength & Conditioning", "strength", 2, 58, "declining", "morning", [2, 4], "maintain", { partial: true }],
  ["Shreya Ghosh", "female", 23, "Boxing Fundamentals", "boxing", 6, 25, "average", "evening", [1, 3, 5], "fat_loss"],
  // Five children under 13, each with a guardian.
  ["Aarav Malhotra", "male", 10, "Kids Martial Arts", "kids", 6, 70, "consistent", "kids", [2, 4, 6], "maintain", { guardian: "Rakesh Malhotra" }],
  ["Myra Kapoor", "female", 8, "Kids Martial Arts", "kids", 2, 35, "average", "kids", [2, 4, 7], "maintain", { guardian: "Sonia Kapoor" }],
  ["Vihaan Sharma", "male", 11, "Boxing Fundamentals", "boxing", 1, 15, "average", "kids", [2, 4, 6], "maintain", { guardian: "Deepak Sharma", renewed: true }],
  ["Anika Reddy", "female", 9, "Kids Martial Arts", "kids", 12, 85, "consistent", "kids", [2, 4, 6], "maintain", { guardian: "Lakshmi Reddy" }],
  ["Kabir Joshi", "male", 12, "MMA Fundamentals", "mma", 6, 40, "occasional", "kids", [2, 4, 6], "maintain", { guardian: "Nitin Joshi" }],
];

const SLOTS = { morning: [6, 9], afternoon: [12, 15], evening: [17, 20], kids: [16, 18] };
const ATTEND_RATE = { consistent: 0.93, average: 0.78, occasional: 0.6, declining: 0.9, recent: 0.85 };

const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
const emailFor = (name) => `${slug(name)}@${DEMO_DOMAIN}`;
const phoneFor = (index) => `+91 98${String(10000000 + index * 7919).slice(0, 3)} ${String(10000 + index * 37).slice(-5)}`;

async function upsertUser({ name, role, passwordHash }, transaction) {
  const email = emailFor(name);
  let user = await User.findOne({ where: { email }, transaction });
  if (user && user.role !== role) throw new Error(`${email} already exists with role ${user.role}.`);
  if (user) await user.update({ fullName: name, passwordHash }, { transaction });
  else user = await User.create({ fullName: name, email, passwordHash, role }, { transaction });
  await UserStatus.upsert({ userId: user.id, active: true }, { transaction });
  return user;
}

async function upsertPlans(course, prices, transaction) {
  for (const [months, price] of Object.entries(prices)) {
    const [plan, created] = await CoursePlan.findOrCreate({ where: { courseId: course.id, durationMonths: Number(months) }, defaults: { courseId: course.id, durationMonths: Number(months), price }, transaction });
    if (!created && Number(months) === 2) await plan.update({ price }, { transaction });
  }
}

async function replaceSessions(courseId, trainerUserId, sessions, transaction) {
  await ClassSession.destroy({ where: { courseId, trainerId: trainerUserId }, transaction });
  for (const [weekdays, startTime, endTime, level] of sessions) {
    for (const weekday of weekdays) await ClassSession.create({ courseId, trainerId: trainerUserId, weekday, startTime, endTime, level, active: true }, { transaction });
  }
}

function attendanceDays({ start, end, today, trainingDays, pattern, random }) {
  const days = [];
  const last = end < today ? end : today;
  for (let date = start; date <= last; date = addDaysToDateString(date, 1)) {
    const planned = trainingDays.includes(isoWeekday(date));
    const extra = !planned && random() < 0.06;
    if (!planned && !extra) continue;
    let rate = ATTEND_RATE[pattern];
    if (pattern === "declining") {
      const daysLeft = Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
      rate = daysLeft < 28 ? 0.35 : 0.9;
    }
    if (extra || random() < rate) days.push(date);
  }
  return days;
}

function visitTimes(slot, random, nowMinutes, isToday) {
  const [fromHour, toHour] = SLOTS[slot];
  const startMinutes = fromHour * 60 + Math.floor(random() * ((toHour - fromHour) * 60));
  const minutes = Math.round(startMinutes / 5) * 5;
  if (isToday && minutes + 15 > nowMinutes) return null;
  const duration = 55 + Math.floor(random() * 40);
  const outMinutes = minutes + duration;
  const pad = (value) => String(value).padStart(2, "0");
  const fmt = (value) => `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
  return { checkIn: fmt(minutes), checkOut: isToday && outMinutes > nowMinutes ? null : fmt(outMinutes) };
}

const WORKOUTS = {
  "Boxing Fundamentals": ["Jab-cross drills, 6 rounds on the bag", "Footwork ladder + slip line", "Pad work: 1-2-3 combinations", "Defence: parries and rolls", "Conditioning circuit, 8 rounds", "Technical sparring, 3 rounds"],
  "MMA Fundamentals": ["Striking basics + sprawl drills", "Takedown entries and guard passing", "Clinch work and knees", "Ground-and-pound positional drills", "Light flow sparring", "Submission defence"],
  "Strength & Conditioning": ["Squat 5x5, Romanian deadlift 3x8", "Bench press 5x5, rows 4x10", "Deadlift 5x3, lunges", "Overhead press, pull-ups", "Sled pushes and carries", "Front squat, core circuit"],
  "Fitness Conditioning": ["HIIT intervals, 30 min", "Kettlebell circuit", "Rowing intervals + core", "Full-body bootcamp", "Mobility and steady cardio", "Step and bodyweight circuit"],
  "Kids Martial Arts": ["Balance games and basic stances", "Kicks and blocks", "Partner drills and teamwork", "Agility ladder and relays", "Forms practice", "Confidence and self-control games"],
};

async function seedMember(spec, index, ctx, transaction) {
  const [name, gender, ageYears, courseName, coachKey, planMonths, startDaysAgo, pattern, slot, trainingDays, goalCategory, extra = {}] = spec;
  const { today, nowMinutes, passwordHash, owner, coaches, courses, waiver } = ctx;
  const random = seededRandom(1000 + index);
  const course = courses.get(courseName);
  const coach = coaches.get(coachKey);
  const user = await upsertUser({ name, role: "client", passwordHash }, transaction);
  const [client] = await Client.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id }, transaction });
  await clearHistory(user, client, transaction);

  const isChild = ageYears < 13;
  const dateOfBirth = addDaysToDateString(today, -Math.round((ageYears + 0.3 + random() * 0.6) * 365.25));
  const height = isChild ? 125 + (ageYears - 8) * 6 + Math.round(random() * 6) : gender === "male" ? 168 + Math.round(random() * 14) : 155 + Math.round(random() * 12);
  const startWeight = isChild ? 24 + (ageYears - 8) * 4 + Math.round(random() * 4) : Math.round((height - 100) * (goalCategory === "fat_loss" ? 1.08 : 0.92) + random() * 6);
  const start = addDaysToDateString(today, -startDaysAgo);
  const memberships = [];
  if (extra.renewed || extra.lapsed) {
    const previousStart = addDaysToDateString(start, -31);
    memberships.push({ start: previousStart, end: addDaysToDateString(start, -1), months: 1, status: "expired", paid: "full" });
  }
  const end = addDaysToDateString(addMembershipMonths(start, planMonths), -1);
  memberships.push({ start, end, months: planMonths, status: end < today ? "expired" : "active", paid: extra.partial ? "half" : "full" });
  const joined = memberships[0].start;

  await client.update({
    trainerId: coach.trainer.id, phone: phoneFor(index + 1), gender, dateOfBirth, heightCm: height, weightKg: startWeight,
    goalCategory, goal: { fat_loss: "Lose body fat and build stamina.", muscle_gain: "Build muscle and get stronger.", maintain: isChild ? "Have fun, build confidence and stay active." : "Stay fit and consistent." }[goalCategory],
    dietPreference: random() < 0.45 ? "veg" : random() < 0.5 ? "eggetarian" : "non_veg", allergies: random() < 0.15 ? ["lactose"] : [],
    trainingDays, joinedAt: joined, guardianName: extra.guardian ?? null,
    emergencyContactPhone: extra.guardian ? phoneFor(100 + index) : null, bloodGroup: ["A+", "B+", "O+", "AB+", "O-"][index % 5],
  }, { transaction });
  await Member.upsert({ userId: user.id, phone: phoneFor(index + 1), dateOfBirth, joinedAt: joined }, { transaction });

  // Agreement accepted on joining (by the guardian for children).
  const acceptance = await WaiverAcceptance.create({ clientId: client.id, agreementVersion: waiver.version, acceptedAt: istInstant(joined, "09:30"), documentReference: `${TAG} seed${extra.guardian ? ` · accepted by guardian ${extra.guardian}` : ""}` }, { transaction });
  await WaiverAudit.create({ waiverAcceptanceId: acceptance.id, ipAddress: null }, { transaction });

  const prices = courseName === "Kids Martial Arts" ? KIDS_PRICES : PRICES;
  let payments = 0;
  let attendance = 0;
  for (const period of memberships) {
    const total = prices[period.months];
    const membership = await Membership.create({ clientId: user.id, courseId: course.id, startDate: period.start, endDate: period.end, totalAmount: total, status: period.status }, { transaction });
    const instalments = period.paid === "half" ? [Math.round(total / 2)] : [total];
    for (const [paymentIndex, amount] of instalments.entries()) {
      const paidAt = istInstant(period.start, `${10 + paymentIndex}:${String(10 + (index % 40)).padStart(2, "0")}`);
      const payment = await Payment.create({ membershipId: membership.id, amount, paymentMethod: "cash", reference: `${TAG}-CASH-${String(index + 1).padStart(2, "0")}${period.status === "expired" ? "A" : "B"}`, dateTime: paidAt }, { transaction });
      await PaymentDetails.create({ paymentId: payment.id, clientId: client.id, reminderDate: period.paid === "half" ? addDaysToDateString(today, 3) : null }, { transaction });
      await PaymentAudit.create({ paymentId: payment.id, userId: owner.id, action: "create", newValues: { amount, paymentMethod: "cash", demo: true } }, { transaction });
      payments += 1;
    }

    const days = attendanceDays({ start: period.start, end: period.end, today, trainingDays, pattern, random });
    const visits = [];
    for (const day of days) {
      const times = visitTimes(slot, random, nowMinutes, day === today);
      if (!times) continue;
      visits.push({ clientId: user.id, courseId: course.id, trainerId: coach.user.id, attendedOn: day, attendedAt: istInstant(day, times.checkIn), checkedOutAt: times.checkOut ? istInstant(day, times.checkOut) : null });
    }
    await Attendance.bulkCreate(visits, { transaction });
    attendance += visits.length;
  }

  // Weekly progress with measurements every second week.
  const progress = [];
  const weeks = Math.max(1, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${joined}T00:00:00Z`)) / (7 * 86_400_000)));
  const weeklyChange = isChild ? 0.08 : goalCategory === "fat_loss" ? -0.35 : goalCategory === "muscle_gain" ? 0.2 : 0;
  const workouts = WORKOUTS[courseName];
  for (let week = 0; week <= weeks; week += 1) {
    const recordedOn = addDaysToDateString(joined, week * 7 + 1);
    if (recordedOn > today) break;
    const weight = Number((startWeight + weeklyChange * week + (random() - 0.5) * 0.4).toFixed(1));
    const measured = !isChild && week % 2 === 0;
    progress.push({
      clientId: client.id, weightKg: weight, stamina: Math.min(10, 4 + Math.floor(week / 2) + (pattern === "consistent" ? 1 : 0)),
      staminaNotes: workouts[week % workouts.length], recordedAt: istInstant(recordedOn, "20:15"),
      waistCm: measured ? Number(((gender === "male" ? 86 : 78) + weeklyChange * week * 1.6 + random()).toFixed(1)) : null,
      chestCm: measured ? Number(((gender === "male" ? 98 : 88) + (goalCategory === "muscle_gain" ? 0.25 * week : 0)).toFixed(1)) : null,
      armCm: measured ? Number(((gender === "male" ? 33 : 28) + (goalCategory === "muscle_gain" ? 0.12 * week : 0)).toFixed(1)) : null,
      hipsCm: measured ? Number(((gender === "male" ? 95 : 98) + weeklyChange * week).toFixed(1)) : null,
    });
  }
  await ProgressEntry.bulkCreate(progress, { transaction });
  if (progress.length) await client.update({ weightKg: progress.at(-1).weightKg }, { transaction });

  // Wellness check-ins every few days (not for children, whose guardians talk to the coach).
  const wellness = [];
  if (!isChild) {
    for (let offset = Math.min(60, startDaysAgo); offset >= 1; offset -= 3 + Math.floor(random() * 2)) {
      const sleep = Number((5.5 + random() * 3).toFixed(1));
      const energy = Math.max(1, Math.min(5, Math.round(1.5 + (sleep - 5.5) * 0.9 + random())));
      const pain = random() < 0.05;
      wellness.push({
        clientId: client.id, recordedOn: addDaysToDateString(today, -offset), mood: energy >= 4 ? "happy" : energy <= 2 ? "low" : "neutral",
        energy, stress: Math.max(1, Math.min(5, 6 - energy + Math.round(random() - 0.5))), motivation: Math.max(1, Math.min(5, energy + (pattern === "declining" && offset < 28 ? -1 : 0))),
        soreness: 1 + Math.floor(random() * 4), sleepHours: sleep, pain, problem: pain ? ["Tight lower back after deadlifts", "Sore left shoulder", "Mild knee discomfort on lunges"][index % 3] : null, notes: null,
      });
    }
    await WellnessCheckin.bulkCreate(wellness, { transaction });
  }

  const notes = [
    { kind: "recommendation", body: { fat_loss: "Keep 3 sessions a week and add a 20-minute walk on rest days.", muscle_gain: "Increase protein to about 1.8 g per kg and add one more lower-body session.", maintain: isChild ? "Great focus in class. Practise the balance drill at home for 5 minutes." : "Good consistency. Try one new class this month to keep it fresh." }[goalCategory] },
    { kind: "note", body: pattern === "declining" ? "Attendance has dropped in the last few weeks. Check in about schedule or motivation." : pattern === "recent" ? "New member: focus on technique and recovery for the first month." : "Progressing well; review the plan at the next renewal." },
  ];
  for (const [noteIndex, note] of notes.entries()) {
    await TrainerNote.create({ clientId: client.id, authorId: coach.user.id, ...note, createdAt: istInstant(addDaysToDateString(today, -(5 + noteIndex * 9)), "19:30") }, { transaction });
  }
  return { isChild, planMonths, payments, attendance, progress: progress.length, wellness: wellness.length, memberships: memberships.length };
}

async function seed() {
  const password = process.env.DEMO_GYM_PASSWORD;
  if (!password || password.length < 12) throw new Error("Set DEMO_GYM_PASSWORD (12+ characters) in Backend/.env first.");
  await runMigrations(sequelize);
  const owner = await User.findOne({ where: { role: "owner", email: process.env.OWNER_EMAIL?.trim().toLowerCase() } });
  if (!owner) throw new Error("The configured owner account was not found. Start the backend once to create it.");
  const today = todayInGymTz();
  const nowParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const nowMinutes = Number(nowParts.find((part) => part.type === "hour").value) * 60 + Number(nowParts.find((part) => part.type === "minute").value);
  const passwordHash = await argon2.hash(password);
  const waiver = await getCurrentWaiver();

  const summary = await sequelize.transaction(async (transaction) => {
    const coaches = new Map();
    for (const [index, spec] of TRAINERS.entries()) {
      const user = await upsertUser({ name: spec.name, role: "trainer", passwordHash }, transaction);
      const [trainer] = await Trainer.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id }, transaction });
      await trainer.update({ certification: spec.certification, phone: phoneFor(200 + index) }, { transaction });
      const existing = await TrainerDetails.findByPk(user.id, { transaction });
      await TrainerDetails.upsert({ userId: user.id, details: existing?.details ?? {}, experienceYears: spec.years, bio: `${spec.bio}`, achievements: spec.achievements, specialties: spec.specialties }, { transaction });
      coaches.set(spec.key, { user, trainer });
    }

    const courses = new Map();
    for (const spec of NEW_COURSES) {
      const [course] = await Course.findOrCreate({ where: { name: spec.name }, defaults: { name: spec.name, category: spec.category, description: spec.description, price: spec.prices[1], active: true }, transaction });
      await course.update({ category: spec.category, description: spec.description, minAge: spec.minAge, maxAge: spec.maxAge, level: spec.level, active: true }, { transaction });
      await upsertPlans(course, spec.prices, transaction);
      courses.set(spec.name, course);
    }
    for (const spec of EXISTING_COURSES) {
      const [course] = await Course.findOrCreate({ where: { name: spec.name }, defaults: { name: spec.name, category: spec.trainer, description: `${spec.name} training.`, price: PRICES[1], active: true }, transaction });
      if (course.minAge == null) await course.update({ minAge: spec.minAge }, { transaction });
      await upsertPlans(course, PRICES, transaction);
      courses.set(spec.name, course);
    }
    for (const spec of [...NEW_COURSES, ...EXISTING_COURSES]) {
      const course = courses.get(spec.name);
      const coach = coaches.get(spec.trainer);
      const assigned = await course.getTrainers({ where: { userId: coach.user.id }, transaction });
      if (!assigned.length) await course.addTrainer(coach.trainer, { transaction });
      await replaceSessions(course.id, coach.user.id, spec.sessions, transaction);
    }

    const totals = { clients: 0, children: 0, payments: 0, attendance: 0, progress: 0, wellness: 0, memberships: 0, plans: {} };
    for (const [index, spec] of MEMBERS.entries()) {
      const result = await seedMember(spec, index, { today, nowMinutes, passwordHash, owner, coaches, courses, waiver }, transaction);
      totals.clients += 1;
      totals.children += result.isChild ? 1 : 0;
      totals.payments += result.payments;
      totals.attendance += result.attendance;
      totals.progress += result.progress;
      totals.wellness += result.wellness;
      totals.memberships += result.memberships;
      totals.plans[result.planMonths] = (totals.plans[result.planMonths] ?? 0) + 1;
    }
    return totals;
  });

  console.log(`Demo gym ready (accounts @${DEMO_DOMAIN}):`);
  console.log(`  ${TRAINERS.length} coaches · ${summary.clients} members (${summary.children} under 13) · ${NEW_COURSES.length} new courses`);
  console.log(`  current plans by months: ${Object.entries(summary.plans).map(([months, count]) => `${months}m×${count}`).join(", ")}`);
  console.log(`  ${summary.memberships} memberships · ${summary.payments} cash payments · ${summary.attendance} check-ins · ${summary.progress} progress entries · ${summary.wellness} wellness check-ins`);
}

try {
  await seed();
} catch (error) {
  console.error("Demo gym seed failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
