// Member analytics shared by the client, trainer and owner views. Every number comes from stored records.
import { Op } from "sequelize";
import { Attendance, Course, DietTracker, Membership, Payment, PaymentDetails, ProgressEntry, Trainer, TrainerNote, User, WellnessCheckin } from "../models/index.js";
import { buildSchedule, computeAttendanceStats, isoWeekday, monthCalendar, weekStrip } from "../utils/attendanceStats.js";
import { addDaysToDateString, todayInGymTz } from "../utils/dates.js";

// Default personal plan when a member has no training days set: Monday, Wednesday, Friday.
export const DEFAULT_TRAINING_WEEKDAYS = [1, 3, 5];

export function trainingDaysFor(client) {
  return client?.trainingDays?.length ? [...client.trainingDays].map(Number).sort() : DEFAULT_TRAINING_WEEKDAYS;
}
const COUNTED_MEMBERSHIP_STATUSES = ["active", "expired"];

const istDate = (instant) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(instant));

// Loads attendance and memberships for many members in two queries. A day is scheduled when a counted
// membership covers it and it is one of the member's personal training days.
export async function loadAttendanceContext(members, { models = { Attendance, Membership } } = {}) {
  if (!members.length) return new Map();
  const memberUserIds = members.map((member) => member.userId);
  const [visits, memberships] = await Promise.all([
    models.Attendance.findAll({ where: { clientId: memberUserIds }, attributes: ["id", "clientId", "courseId", "trainerId", "attendedOn", "attendedAt", "checkedOutAt", "override"], order: [["attendedAt", "DESC"]] }),
    models.Membership.findAll({ where: { clientId: memberUserIds, status: COUNTED_MEMBERSHIP_STATUSES }, attributes: ["clientId", "courseId", "startDate", "endDate", "status"] }),
  ]);
  const context = new Map(members.map((member) => [member.userId, { visits: [], memberships: [], trainingDays: trainingDaysFor(member), hasPersonalPlan: Boolean(member.trainingDays?.length) }]));
  for (const visit of visits) context.get(visit.clientId)?.visits.push(visit);
  for (const membership of memberships) context.get(membership.clientId)?.memberships.push(membership);
  for (const entry of context.values()) {
    entry.isScheduled = buildSchedule({
      periods: entry.memberships.map((membership) => ({ start: membership.startDate, end: membership.endDate })),
      weekdays: new Set(entry.trainingDays),
    });
    entry.attendedDates = [...new Set(entry.visits.map((visit) => visit.attendedOn))];
  }
  return context;
}

export function attendanceSummary(entry, { today = todayInGymTz(), rangeDays } = {}) {
  const from = rangeDays ? addDaysToDateString(today, -(rangeDays - 1)) : undefined;
  const allTime = computeAttendanceStats({ attendedDates: entry.attendedDates, isScheduled: entry.isScheduled, today });
  const range = rangeDays ? computeAttendanceStats({ attendedDates: entry.attendedDates, isScheduled: entry.isScheduled, today, from }) : allTime;
  return {
    ...range,
    currentStreak: allTime.currentStreak,
    longestStreak: allTime.longestStreak,
    allTimeVisits: allTime.totalVisits,
    firstVisit: allTime.firstVisit,
    lastVisit: allTime.lastVisit,
  };
}

// Visits per ISO week (Monday start) and per calendar month inside the range.
export function attendanceSeries(entry, { today = todayInGymTz(), rangeDays = 90 } = {}) {
  const from = addDaysToDateString(today, -(rangeDays - 1));
  const weekly = new Map();
  const monthly = new Map();
  for (let date = addDaysToDateString(from, 1 - isoWeekday(from)); date <= today; date = addDaysToDateString(date, 7)) weekly.set(date, { week: date, visits: 0, scheduled: 0 });
  for (let date = from; date <= today; date = addDaysToDateString(date, 1)) {
    const week = weekly.get(addDaysToDateString(date, 1 - isoWeekday(date)));
    const month = date.slice(0, 7);
    if (!monthly.has(month)) monthly.set(month, { month, visits: 0, scheduled: 0 });
    const attended = entry.attendedDates.includes(date);
    const scheduled = entry.isScheduled(date) && date <= today;
    if (attended) { week.visits += 1; monthly.get(month).visits += 1; }
    if (scheduled) { week.scheduled += 1; monthly.get(month).scheduled += 1; }
  }
  const withRate = (row) => ({ ...row, rate: row.scheduled ? Math.round((Math.min(row.visits, row.scheduled) / row.scheduled) * 100) : null });
  return { weekly: [...weekly.values()].map(withRate), monthly: [...monthly.values()].map(withRate) };
}

// Visits per course, all time and inside the reporting window.
function countByCourse(visits, names, from) {
  const counts = new Map();
  for (const visit of visits) {
    const name = names.get(visit.courseId) ?? "Other";
    const row = counts.get(name) ?? { course: name, allTime: 0, inRange: 0 };
    row.allTime += 1;
    if (visit.attendedOn >= from) row.inRange += 1;
    counts.set(name, row);
  }
  return [...counts.values()].sort((left, right) => right.allTime - left.allTime);
}

const round1 = (value) => (value == null ? null : Number(Number(value).toFixed(1)));
const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

// Observations backed by recorded data only; each rule needs a minimum amount of data.
export function buildInsights({ summary, visits, previousMonthVisits, thisMonthVisits, wellness, weights }) {
  const insights = [];
  if (summary.scheduledSessions >= 4) {
    insights.push(`You attended ${summary.attendedScheduled} of ${summary.scheduledSessions} scheduled sessions in this period.`);
  }
  if (visits.length >= 6) {
    const weekend = visits.filter((date) => isoWeekday(date) >= 6).length;
    const weekday = visits.length - weekend;
    const weekdayShare = weekday / 5;
    const weekendShare = weekend / 2;
    if (weekdayShare > weekendShare * 1.3) insights.push("Your attendance is strongest on weekdays.");
    else if (weekendShare > weekdayShare * 1.3) insights.push("Your attendance is strongest at weekends.");
  }
  // Equal-length windows, so a month that has just started is never compared with a full one.
  if (previousMonthVisits >= 3 && thisMonthVisits != null) {
    if (thisMonthVisits >= previousMonthVisits + 2) insights.push(`You visited ${thisMonthVisits} times in the last 30 days, up from ${previousMonthVisits} in the 30 days before.`);
    if (thisMonthVisits + 2 <= previousMonthVisits) insights.push(`You visited ${thisMonthVisits} times in the last 30 days, down from ${previousMonthVisits} in the 30 days before.`);
  }
  const withSleep = wellness.filter((entry) => entry.sleepHours != null);
  const rested = withSleep.filter((entry) => Number(entry.sleepHours) >= 7).map((entry) => entry.energy);
  const short = withSleep.filter((entry) => Number(entry.sleepHours) < 7).map((entry) => entry.energy);
  if (rested.length >= 3 && short.length >= 3 && average(rested) - average(short) >= 0.5) {
    insights.push(`Your energy was higher on days after 7+ hours of sleep (${round1(average(rested))} vs ${round1(average(short))} out of 5).`);
  }
  if (weights.length >= 2) {
    const change = round1(weights.at(-1).value - weights[0].value);
    if (Math.abs(change) >= 0.3) insights.push(`Your recorded weight changed by ${change > 0 ? "+" : ""}${change} kg over this period.`);
  }
  return insights;
}

// Newest first; each record names its type, time, values and who recorded it.
export function latestRecords({ visits, progress, wellness, notes, dietEntries }) {
  const records = [];
  const lastVisit = visits[0];
  if (lastVisit) {
    records.push({ type: "Check-in", at: lastVisit.attendedAt, detail: lastVisit.Course?.name ?? "Gym visit", source: lastVisit.trainerId ? "trainer" : "system" });
    if (lastVisit.checkedOutAt) records.push({ type: "Check-out", at: lastVisit.checkedOutAt, detail: lastVisit.Course?.name ?? "Gym visit", source: "trainer" });
  }
  const workout = progress.find((entry) => entry.staminaNotes || entry.stamina);
  if (workout) records.push({ type: "Workout", at: workout.recordedAt, detail: [workout.staminaNotes, workout.stamina ? `stamina ${workout.stamina}/10` : null].filter(Boolean).join(" · "), source: "client" });
  const weight = progress.find((entry) => entry.weightKg != null) ?? null;
  if (weight) records.push({ type: "Weight", at: weight.recordedAt, detail: `${round1(weight.weightKg)} kg`, source: "client" });
  const measurement = progress.find((entry) => entry.waistCm || entry.chestCm || entry.armCm || entry.hipsCm);
  if (measurement) records.push({ type: "Measurements", at: measurement.recordedAt, detail: [["Waist", measurement.waistCm], ["Chest", measurement.chestCm], ["Arm", measurement.armCm], ["Hips", measurement.hipsCm]].filter(([, value]) => value).map(([label, value]) => `${label} ${round1(value)} cm`).join(" · "), source: "client" });
  const meal = dietEntries[0];
  if (meal) records.push({ type: "Diet check-in", at: meal.createdAt, detail: [meal.calories ? `${meal.calories} kcal` : null, meal.weightKg ? `${round1(meal.weightKg)} kg` : null].filter(Boolean).join(" · ") || "Logged", source: "client" });
  const check = wellness.at(-1);
  if (check) records.push({ type: "Wellness", at: check.updatedAt, detail: `Mood ${check.mood} · energy ${check.energy}/5${check.pain ? " · pain reported" : ""}`, source: "client" });
  const note = notes[0];
  if (note) records.push({ type: note.kind === "recommendation" ? "Recommendation" : "Trainer note", at: note.createdAt, detail: note.body, source: "trainer" });
  return records.filter((record) => record.at).sort((left, right) => new Date(right.at) - new Date(left.at));
}

// Full analytics for one member. `viewer` decides which trainer notes are included.
export async function memberAnalytics(client, { viewer, rangeDays = 30, today = todayInGymTz() }) {
  const staff = viewer.role === "owner" || viewer.role === "trainer";
  const from = addDaysToDateString(today, -(rangeDays - 1));
  const [context, progress, wellness, notes, dietEntries, membership] = await Promise.all([
    loadAttendanceContext([client]),
    ProgressEntry.findAll({ where: { clientId: client.id }, order: [["recordedAt", "DESC"]], limit: 120 }),
    WellnessCheckin.findAll({ where: { clientId: client.id, recordedOn: { [Op.gte]: addDaysToDateString(today, -89) } }, order: [["recordedOn", "ASC"]] }),
    TrainerNote.findAll({
      where: { clientId: client.id, ...(staff ? {} : { kind: "recommendation" }) },
      include: [{ model: User, as: "author", attributes: ["id", "fullName"] }],
      order: [["createdAt", "DESC"]],
      limit: 50,
    }),
    DietTracker.findAll({ where: { clientId: client.id }, attributes: ["calories", "weightKg", "createdAt", "recordedOn"], order: [["createdAt", "DESC"]], limit: 1 }),
    Membership.findOne({ where: { clientId: client.userId, status: ["active", "pending_payment"] }, include: [{ model: Course, attributes: ["id", "name"] }], order: [["endDate", "DESC"]] }),
  ]);
  const [memberships, payments, trainer] = await Promise.all([
    Membership.findAll({ where: { clientId: client.userId }, include: [{ model: Course, attributes: ["id", "name", "category"] }], order: [["startDate", "DESC"]] }),
    Payment.findAll({ include: [{ model: PaymentDetails, where: { clientId: client.id }, required: true, attributes: [] }], attributes: ["id", "amount", "paymentMethod", "reference", "dateTime", "voidedAt", "invoiceNumber", "membershipId"], order: [["dateTime", "DESC"]], limit: 50 }),
    client.trainerId ? Trainer.findOne({ where: { id: client.trainerId }, attributes: ["userId", "certification"], include: [{ model: User, attributes: ["fullName"] }] }) : null,
  ]);
  const entry = context.get(client.userId);
  const courses = await Course.findAll({ where: { id: [...new Set(entry.visits.map((visit) => visit.courseId))] }, attributes: ["id", "name"] });
  const visitCourseNames = new Map(courses.map((course) => [course.id, course.name]));
  const visitsWithCourse = await Attendance.findAll({
    where: { clientId: client.userId }, include: [{ model: Course, attributes: ["name"] }], order: [["attendedAt", "DESC"]], limit: 1,
  });
  const summary = attendanceSummary(entry, { today, rangeDays });
  const last30 = addDaysToDateString(today, -29);
  const previous30 = addDaysToDateString(today, -59);
  const weights = [...progress].reverse().filter((row) => row.weightKg != null && istDate(row.recordedAt) >= from).map((row) => ({ date: istDate(row.recordedAt), value: Number(row.weightKg) }));
  const windowWellness = wellness.filter((row) => row.recordedOn >= from);

  return {
    range: { days: rangeDays, from, to: today },
    trainingDays: entry.trainingDays,
    usesDefaultTrainingDays: !entry.hasPersonalPlan,
    trainer: trainer ? { id: trainer.userId, name: trainer.User?.fullName ?? "Coach", certification: trainer.certification } : null,
    memberships: memberships.map((row) => ({ id: row.id, course: row.Course?.name ?? "Course", courseId: row.courseId, status: row.status, startDate: row.startDate, endDate: row.endDate, totalAmount: Number(row.totalAmount) })),
    payments: payments.map((row) => ({ id: row.id, amount: Number(row.amount), method: row.paymentMethod, reference: row.reference, paidAt: row.dateTime, voided: Boolean(row.voidedAt), invoiceNumber: row.invoiceNumber, membershipId: row.membershipId })),
    membership: membership ? { status: membership.status, course: membership.Course?.name ?? null, startDate: membership.startDate, endDate: membership.endDate } : null,
    attendance: summary,
    week: weekStrip({ attendedDates: entry.attendedDates, isScheduled: entry.isScheduled, today }),
    series: attendanceSeries(entry, { today, rangeDays: Math.max(rangeDays, 90) }),
    recentVisits: entry.visits.slice(0, 20).map((visit) => ({ id: visit.id, date: visit.attendedOn, checkedInAt: visit.attendedAt, checkedOutAt: visit.checkedOutAt, override: visit.override })),
    // Self-reported health notes and plans; served only to the member, their trainer and the owner.
    profile: {
      healthIssues: client.healthIssues || null,
      injuries: client.injuries || null,
      targetWeightKg: round1(client.targetWeightKg),
      dietRestrictions: client.dietRestrictions ?? null,
      workoutProfile: client.workoutProfile ?? null,
      allergies: client.allergies ?? [],
    },
    sessionsByCourse: countByCourse(entry.visits, visitCourseNames, from),
    progress: {
      heightCm: round1(client.heightCm),
      currentWeightKg: round1(progress.find((row) => row.weightKg != null)?.weightKg ?? client.weightKg),
      goalCategory: client.goalCategory,
      entries: [...progress].reverse().map((row) => ({
        date: istDate(row.recordedAt), weightKg: round1(row.weightKg), stamina: row.stamina, note: row.staminaNotes,
        approximate: row.approximateDate, context: row.context,
        waistCm: round1(row.waistCm), chestCm: round1(row.chestCm), armCm: round1(row.armCm), hipsCm: round1(row.hipsCm),
      })),
    },
    wellness: wellness.map((row) => ({
      id: row.id, date: row.recordedOn, mood: row.mood, energy: row.energy, stress: row.stress, motivation: row.motivation,
      soreness: row.soreness, digestion: row.digestion, sleepHours: round1(row.sleepHours), pain: row.pain, problem: row.problem, notes: row.notes,
    })),
    notes: notes.map((note) => ({ id: note.id, kind: note.kind, body: note.body, author: note.author?.fullName ?? "Coach", createdAt: note.createdAt })),
    insights: buildInsights({
      summary,
      visits: entry.attendedDates.filter((date) => date >= from),
      thisMonthVisits: entry.attendedDates.filter((date) => date >= last30 && date <= today).length,
      previousMonthVisits: entry.attendedDates.filter((date) => date >= previous30 && date < last30).length,
      wellness: windowWellness,
      weights,
    }),
    latest: latestRecords({ visits: visitsWithCourse.length ? [{ ...visitsWithCourse[0].toJSON(), Course: visitsWithCourse[0].Course }] : [], progress, wellness, notes, dietEntries }),
  };
}

export async function memberCalendar(client, { month, today = todayInGymTz() }) {
  const entry = (await loadAttendanceContext([client])).get(client.userId);
  const visitsByDay = new Map();
  for (const visit of entry.visits) {
    if (!visit.attendedOn.startsWith(month)) continue;
    if (!visitsByDay.has(visit.attendedOn)) visitsByDay.set(visit.attendedOn, []);
    visitsByDay.get(visit.attendedOn).push({ checkedInAt: visit.attendedAt, checkedOutAt: visit.checkedOutAt });
  }
  return {
    month,
    days: monthCalendar({ month, attendedDates: entry.attendedDates, isScheduled: entry.isScheduled, today }).map((day) => ({ ...day, visits: visitsByDay.get(day.date) ?? [] })),
  };
}

// Compact per-member rows for the trainer and owner tables (batched).
export async function memberSummaries(clients, { today = todayInGymTz() } = {}) {
  const context = await loadAttendanceContext(clients);
  const clientIds = clients.map((client) => client.id);
  const [weights, wellness] = clientIds.length ? await Promise.all([
    ProgressEntry.findAll({ where: { clientId: clientIds, weightKg: { [Op.ne]: null } }, attributes: ["clientId", "weightKg", "recordedAt"], order: [["recordedAt", "DESC"]] }),
    WellnessCheckin.findAll({ where: { clientId: clientIds }, attributes: ["clientId", "mood", "energy", "pain", "recordedOn"], order: [["recordedOn", "DESC"]] }),
  ]) : [[], []];
  const latestWeight = new Map();
  for (const row of weights) if (!latestWeight.has(row.clientId)) latestWeight.set(row.clientId, round1(row.weightKg));
  const latestWellness = new Map();
  for (const row of wellness) if (!latestWellness.has(row.clientId)) latestWellness.set(row.clientId, { mood: row.mood, energy: row.energy, pain: row.pain, date: row.recordedOn });
  return new Map(clients.map((client) => {
    const entry = context.get(client.userId);
    const stats = attendanceSummary(entry, { today, rangeDays: 30 });
    const membership = entry.memberships.find((row) => row.status === "active" && row.startDate <= today && row.endDate >= today);
    const last30 = addDaysToDateString(today, -29);
    const prev30 = addDaysToDateString(today, -59);
    return [client.id, {
      visitsLast30: entry.attendedDates.filter((date) => date >= last30 && date <= today).length,
      visitsPrev30: entry.attendedDates.filter((date) => date >= prev30 && date < last30).length,
      currentStreak: stats.currentStreak, longestStreak: stats.longestStreak, totalVisits: stats.allTimeVisits,
      attendancePercentage: stats.attendancePercentage, missedSessions: stats.missedSessions, lastVisit: stats.lastVisit,
      membershipActive: Boolean(membership), membershipEndsOn: membership?.endDate ?? null,
      latestWeightKg: latestWeight.get(client.id) ?? round1(client.weightKg), latestWellness: latestWellness.get(client.id) ?? null,
    }];
  }));
}

const DAY_MS = 86_400_000;
const daysSince = (date, today) => Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / DAY_MS);

// Rows for the trainer/owner member tables, with a needs-attention flag derived from the same stats.
export async function memberTable(clients, { today = todayInGymTz() } = {}) {
  const summaries = await memberSummaries(clients, { today });
  return clients.map((client) => {
    const summary = summaries.get(client.id);
    const absentDays = summary.lastVisit ? daysSince(summary.lastVisit, today) : null;
    const declining = summary.visitsPrev30 >= 4 && summary.visitsLast30 <= summary.visitsPrev30 * 0.6;
    const pct = summary.attendancePercentage;
    const flags = {
      lowAttendance: pct != null && pct < 60,
      strongAttendance: pct != null && pct >= 85,
      missedSessions: summary.missedSessions > 0,
      declining,
      absent7: summary.membershipActive && (absentDays == null || absentDays >= 7),
      painReported: Boolean(summary.latestWellness?.pain),
    };
    flags.needsAttention = flags.lowAttendance || flags.declining || flags.absent7 || flags.painReported;
    return {
      id: client.id, userId: client.userId, name: client.User?.fullName ?? "Member", trainerId: client.trainerId,
      trainerName: client.Trainer?.User?.fullName ?? null, absentDays, ...summary, flags,
    };
  });
}

// Gym-wide attendance overview from the same per-member stats plus raw check-ins.
export async function gymOverview(clients, { today = todayInGymTz(), from, to } = {}) {
  const rows = await memberTable(clients, { today });
  const active = rows.filter((row) => row.membershipActive);
  const rangeFrom = from ?? addDaysToDateString(today, -29);
  const rangeTo = to ?? today;
  const visits = await Attendance.findAll({
    where: { attendedOn: { [Op.between]: [rangeFrom, rangeTo] } },
    attributes: ["attendedOn", "trainerId", "courseId"],
    include: [{ model: Course, attributes: ["name"] }, { model: Trainer, attributes: ["userId"], include: [{ model: User, attributes: ["fullName"] }] }],
  });
  const daily = new Map();
  for (let date = rangeFrom; date <= rangeTo; date = addDaysToDateString(date, 1)) daily.set(date, 0);
  const byTrainer = new Map();
  const byCourse = new Map();
  for (const visit of visits) {
    daily.set(visit.attendedOn, (daily.get(visit.attendedOn) ?? 0) + 1);
    const trainer = visit.Trainer?.User?.fullName ?? "Not recorded";
    byTrainer.set(trainer, (byTrainer.get(trainer) ?? 0) + 1);
    const course = visit.Course?.name ?? "Other";
    byCourse.set(course, (byCourse.get(course) ?? 0) + 1);
  }
  const weekly = new Map();
  const monthly = new Map();
  for (const [date, count] of daily) {
    const week = addDaysToDateString(date, 1 - isoWeekday(date));
    weekly.set(week, (weekly.get(week) ?? 0) + count);
    monthly.set(date.slice(0, 7), (monthly.get(date.slice(0, 7)) ?? 0) + count);
  }
  const rates = active.map((row) => row.attendancePercentage).filter((value) => value != null);
  const buckets = [["0–24%", 0, 25], ["25–49%", 25, 50], ["50–74%", 50, 75], ["75–100%", 75, 101]];
  const sorted = (map) => [...map].map(([label, count]) => ({ label, count })).sort((left, right) => right.count - left.count);
  return {
    range: { from: rangeFrom, to: rangeTo },
    totals: {
      activeMembers: active.length,
      todaysAttendance: daily.get(today) ?? (await Attendance.count({ where: { attendedOn: today } })),
      averageAttendanceRate: rates.length ? Math.round(rates.reduce((sum, value) => sum + value, 0) / rates.length) : null,
      averageVisitsPerMember: active.length ? Number((active.reduce((sum, row) => sum + row.visitsLast30, 0) / active.length).toFixed(1)) : 0,
      activeStreaks: active.filter((row) => row.currentStreak > 0).length,
      declining: active.filter((row) => row.flags.declining).length,
      absent7: active.filter((row) => row.absentDays == null || row.absentDays >= 7).length,
      absent14: active.filter((row) => row.absentDays == null || row.absentDays >= 14).length,
      expiringSoon: active.filter((row) => row.membershipEndsOn && daysSince(today, row.membershipEndsOn) <= 15).length,
    },
    daily: [...daily].map(([date, count]) => ({ date, count })),
    weekly: [...weekly].map(([week, count]) => ({ week, count })),
    monthly: [...monthly].map(([month, count]) => ({ month, count })),
    consistency: buckets.map(([label, min, max]) => ({ label, count: rates.filter((value) => value >= min && value < max).length })),
    byTrainer: sorted(byTrainer),
    byCourse: sorted(byCourse),
  };
}
