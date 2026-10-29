export const publicLinks = [
  ["About", "/about"], ["Trainers", "/trainers"], ["Programs", "/programs"],
  ["Schedule", "/schedule"], ["Gallery", "/gallery"], ["Pricing", "/memberships"],
  ["Contact", "/contact"], ["FAQ", "/faq"],
];

export const legalCopy = {
  "/privacy": ["Privacy notice", "Gym-specific privacy information is not configured yet. With your permission, this site stores first-party visitor and session identifiers to count public page visits. It does not send analytics events before you accept, and does not store IP addresses or device fingerprints in analytics records. Contact the gym for its approved privacy policy."],
  "/terms": ["Terms of use", "Terms of use have not been configured by this gym yet. Please request the current terms from the gym before joining."],
  "/waiver": ["Training waiver", "The gym's waiver information is not configured for this public website. Any required waiver will be presented through the member workflow."],
};

export const faqs = [
  ["How do I try a session?", "Send a trial request and the gym will contact you to confirm availability."],
  ["What are the opening hours?", "Opening hours are not configured on this website yet."],
  ["How much does membership cost?", "Prices shown on the Programs page come from active configured plans. If no plans are listed, pricing is not configured."],
  ["Where is the gym?", "The gym address is not configured on this website yet."],
  ["Can I choose a trainer or program?", "You can select a configured program in your trial request. Trainer availability is confirmed by the gym."],
];

const pageTitles = {
  "/about": "Training with purpose.", "/trainers": "Meet your corner.",
  "/programs": "Find your next round.", "/schedule": "Make time to train.",
  "/gallery": "Inside the gym.", "/memberships": "Memberships & pricing.",
  "/contact": "Start a conversation.", "/trial": "Your first round.",
  "/faq": "Good questions.", ...Object.fromEntries(Object.entries(legalCopy).map(([url, [heading]]) => [url, heading])),
  "/forgot-password": "Reset your password.", "/reset-password": "Choose a new password.",
};

export function pageTitle(path) {
  return pageTitles[path.startsWith("/reset-password/") ? "/reset-password" : path] ?? "Earn your next round.";
}
