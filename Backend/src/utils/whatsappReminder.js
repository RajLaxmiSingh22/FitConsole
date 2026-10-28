// Normalizes an Indian mobile number to its 10-digit form, or returns null when it is not one.
export function normalizeIndianMobile(phone) {
  const digits = String(phone ?? "").replace(/\D/g, "").replace(/^(?:0|91)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function buildReminderMessage({ name, amountDue, course, dueDate, payUrl }) {
  const amount = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amountDue);
  const due = new Date(`${dueDate}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `Hi ${name}, a friendly reminder from FitConsole: ${amount} is due for your ${course} membership (due ${due}). `
    + `Sign in to pay securely online: ${payUrl}`;
}

export function buildWhatsAppLink(mobile, message) {
  return `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`;
}
