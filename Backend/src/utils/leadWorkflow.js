export const leadStatuses = [
  "new",
  "contacted",
  "trial_scheduled",
  "trial_confirmed",
  "trial_attended",
  "no_show",
  "enrolled",
  "lost",
];

const transitions = {
  new: ["contacted", "lost"],
  contacted: ["trial_scheduled", "lost"],
  trial_scheduled: ["trial_confirmed", "no_show", "lost"],
  trial_confirmed: ["trial_attended", "no_show", "lost"],
  trial_attended: ["enrolled", "lost"],
  no_show: ["contacted", "trial_scheduled", "lost"],
  enrolled: [],
  lost: ["contacted"],
};

export function normalizeIndianMobile(value) {
  const input = String(value ?? "").trim();
  if (!/^[+\d()\s.-]+$/.test(input)) return null;
  const digits = input.replace(/\D/g, "");
  const number = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(number) ? number : null;
}

export function canTransitionLead(from, to) {
  return transitions[from]?.includes(to) ?? false;
}

export function isLeadStatus(value) {
  return leadStatuses.includes(value);
}
