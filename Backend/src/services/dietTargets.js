// Calorie and macro targets are computed here, not by the AI model.

const CATEGORY_PROFILES = {
  combat: { activity: 1.725, split: { carbs: 50, protein: 25, fat: 25 } },
  strength: { activity: 1.55, split: { carbs: 40, protein: 30, fat: 30 } },
  cardio: { activity: 1.55, split: { carbs: 35, protein: 35, fat: 30 } },
  yoga: { activity: 1.375, split: { carbs: 45, protein: 25, fat: 30 } },
};
const FAT_LOSS_SPLIT = { carbs: 35, protein: 35, fat: 30 };
const GOAL_ADJUSTMENT = { fat_loss: -0.15, muscle_gain: 0.10, maintain: 0 };

const CATEGORY_KEYWORDS = [
  ["combat", /mma|box|kick|muay|bjj|jiu|jitsu|wrestl|judo|karate|taekwondo|combat|fight|hiit/],
  ["yoga", /yoga|rehab|mobility|pilates|stretch|physio/],
  ["cardio", /cardio|zumba|aerobic|spin|cycl|run|dance|fat.?loss/],
  ["strength", /strength|weight|power|lift|bodybuild|crossfit|gym/],
];

export function courseCategoryFor(course) {
  const text = `${course?.category ?? ""} ${course?.name ?? ""}`.toLowerCase();
  return CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? "strength";
}

export function ageOn(dateOfBirth, today) {
  const [birthYear, birthMonth, birthDay] = String(dateOfBirth).slice(0, 10).split("-").map(Number);
  const [year, month, day] = today.split("-").map(Number);
  return year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
}

function genderOffset(gender) {
  const value = String(gender ?? "").trim().toLowerCase();
  if (["male", "m", "man"].includes(value)) return 5;
  if (["female", "f", "woman"].includes(value)) return -161;
  return -78; // Midpoint when gender is not recorded as male or female.
}

export class IncompleteProfileError extends Error {
  constructor(missing) {
    super(`Client profile is missing: ${missing.join(", ")}.`);
    this.missing = missing;
  }
}

export function computeDietTargets({ dateOfBirth, gender, heightCm, weightKg, goalCategory, course, today }) {
  const missing = [];
  if (!dateOfBirth) missing.push("dateOfBirth");
  if (!(Number(heightCm) > 0)) missing.push("heightCm");
  if (!(Number(weightKg) > 0)) missing.push("weightKg");
  if (!Object.hasOwn(GOAL_ADJUSTMENT, goalCategory ?? "")) missing.push("goalCategory");
  if (missing.length) throw new IncompleteProfileError(missing);

  const age = ageOn(dateOfBirth, today);
  const height = Number(heightCm);
  const weight = Number(weightKg);
  const category = courseCategoryFor(course);
  const profile = CATEGORY_PROFILES[category];
  const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset(gender);
  const calories = Math.round((bmr * profile.activity * (1 + GOAL_ADJUSTMENT[goalCategory])) / 10) * 10;
  // Combat athletes keep their carb-heavy split even when cutting.
  const split = goalCategory === "fat_loss" && category !== "combat" ? FAT_LOSS_SPLIT : profile.split;
  return {
    age,
    category,
    bmr: Math.round(bmr),
    activityMultiplier: profile.activity,
    dailyCalories: calories,
    split,
    macros: {
      proteinG: Math.round((calories * split.protein) / 100 / 4),
      carbsG: Math.round((calories * split.carbs) / 100 / 4),
      fatG: Math.round((calories * split.fat) / 100 / 9),
    },
  };
}
