import { openingHoursSentence } from "./openingHours.js";

export const publicLinks = [
  ["About", "/about"], ["Trainers", "/trainers"], ["Programs", "/programs"],
  ["Schedule", "/schedule"], ["Gallery", "/gallery"], ["Pricing", "/memberships"],
  ["Contact", "/contact"], ["FAQ", "/faq"],
];

// Grouped FAQ: [group, [[question, answer], ...]]
export const faqGroups = [
  ["Getting started", [
    ["How do I try a class?", "Send a trial request with your preferred program, day and time. The front desk contacts you to confirm your spot."],
    ["I'm a complete beginner. Is that okay?", "Yes. Look for Beginner and All levels classes on the timetable; coaches start with technique and scale every drill to you."],
    ["What should I bring?", "Comfortable training clothes, a water bottle and a towel. For MMA classes bring a mouthguard, and gloves and hand wraps if you have them; ask the front desk if you don't."],
    ["What are the opening hours?", openingHoursSentence],
  ]],
  ["Membership & payments", [
    ["How much does membership cost?", "See the Pricing page for every program and duration. Longer memberships cost less per month, and the 12-month plan is the best value."],
    ["How do I pay?", "Pay online from the member app by UPI, debit or credit card through Cashfree, or pay at the front desk. Your membership starts as soon as the payment is confirmed."],
    ["Will my membership renew automatically?", "No. You get an email reminder 7 days and 1 day before it ends, and you renew with one tap in the app."],
    ["Can I pause my membership?", "Speak to the front desk; pauses for medical reasons can be discussed."],
  ]],
  ["Classes & coaching", [
    ["Can I choose my trainer?", "Each class on the timetable lists its coach. Your assigned trainer also plans your meals and reviews your weekly progress in the app."],
    ["Do you have kids or women-only classes?", "Yes. Kids classes run on weekday evenings and Saturday mornings, and women-only classes run on weekday mornings and Saturday afternoon. Check the timetable for exact times."],
    ["Is sparring compulsory?", "No. Sparring is optional and only in Intermediate and Advanced MMA classes, always supervised and with protective gear."],
  ]],
  ["The member app", [
    ["What do I get in the app?", "Your meal plan, daily check-ins, weekly progress, membership and receipts, and direct messages with your trainer."],
    ["Who makes my meal plan?", "A draft is generated from your goal, diet preference and allergies, and your trainer reviews and approves it before you see it."],
    ["I forgot my password.", "Use Forgot password on the sign-in page. We email you a one-time link that works for 30 minutes."],
  ]],
];

const pageTitles = {
  "/about": "Training with purpose.", "/trainers": "Meet your corner.",
  "/programs": "Find your next round.", "/schedule": "Make time to train.",
  "/gallery": "Inside the gym.", "/memberships": "Memberships & pricing.",
  "/contact": "Start a conversation.", "/trial": "Your first round.",
  "/faq": "Good questions.", "/privacy": "Privacy notice.", "/terms": "Terms of use.", "/agreement": "Gym agreement.",
  "/forgot-password": "Reset your password.", "/reset-password": "Choose a new password.",
};

export function pageTitle(path) {
  return pageTitles[path.startsWith("/reset-password/") ? "/reset-password" : path] ?? "Earn your next round.";
}

// Visitor's preferred trial time. These are preferences only; the gym confirms the actual slot.
export const trialTimeSlots = [
  ["Early morning (6–9 AM)", "Early morning · 6–9 AM"],
  ["Late morning (9 AM–12 PM)", "Late morning · 9 AM–12 PM"],
  ["Afternoon (12–4 PM)", "Afternoon · 12–4 PM"],
  ["Evening (4–7 PM)", "Evening · 4–7 PM"],
  ["Late evening (7–11 PM)", "Late evening · 7–11 PM (Mon–Sat)"],
  ["Flexible / not sure yet", "Not sure yet · any time works"],
];
