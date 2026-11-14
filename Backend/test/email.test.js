import assert from "node:assert/strict";
import test from "node:test";
import { getEmailConfiguration, sendEmail } from "../src/services/email.js";
import {
  membershipEndingEmail,
  passwordChangedEmail,
  passwordResetEmail,
  signInAlertEmail,
  welcomeEmail,
} from "../src/services/emailTemplates.js";
import { sendMembershipEndingReminders } from "../src/services/membershipReminders.js";
import { frontendUrl } from "../src/utils/frontendUrl.js";

const smtp = { SMTP_HOST: "smtp.gmail.com", SMTP_USER: "gym@example.com", SMTP_PASSWORD: "app-password", EMAIL_FROM: "FitConsole <gym@example.com>" };

test("email configuration needs host, user, password and sender; port 465 uses TLS", () => {
  assert.equal(getEmailConfiguration({}), null);
  assert.equal(getEmailConfiguration({ ...smtp, SMTP_PASSWORD: "" }), null);
  assert.equal(getEmailConfiguration(smtp).secure, true);
  assert.equal(getEmailConfiguration({ ...smtp, SMTP_PORT: "587" }).secure, false);
});

test("sendEmail uses the configured sender and the given transport", async (t) => {
  t.mock.property(process, "env", { ...process.env, ...smtp });
  const sent = [];
  await sendEmail("member@example.com", { subject: "s", text: "t", html: "h" }, { transport: { sendMail: async (message) => sent.push(message) } });
  assert.deepEqual(sent, [{ from: smtp.EMAIL_FROM, to: "member@example.com", subject: "s", text: "t", html: "h" }]);
});

test("templates escape member names and include their links in text and html", () => {
  const name = "<script>x</script> Rao";
  const messages = [
    welcomeEmail({ fullName: name, loginUrl: "https://gym.test/login" }),
    signInAlertEmail({ fullName: name, signedInAt: new Date("2026-11-04T05:30:00Z"), resetUrl: "https://gym.test/forgot-password" }),
    passwordResetEmail({ resetUrl: "https://gym.test/reset-password?token=abc" }),
    passwordChangedEmail({ fullName: name, resetUrl: "https://gym.test/forgot-password" }),
    membershipEndingEmail({ fullName: name, courseName: "MMA <b>", endDate: "2026-11-11", daysLeft: 7, renewUrl: "https://gym.test/?section=Membership" }),
  ];
  for (const message of messages) {
    assert.ok(message.subject && message.text && message.html);
    assert.ok(!message.html.includes("<script>"), message.subject);
    assert.match(message.text, /https:\/\/gym\.test\//);
  }
  assert.match(messages[1].text, /11:00 am/i);
  assert.equal(messages[4].subject, "Your MMA <b> membership ends in 7 days");
  assert.ok(messages[4].html.includes("MMA &lt;b&gt;"));
});

test("frontend links are absolute and only for http(s)", () => {
  assert.equal(frontendUrl("/", { section: "Membership" }, { FRONTEND_PUBLIC_URL: "http://localhost:5173" }), "http://localhost:5173/?section=Membership");
  assert.equal(frontendUrl("/login", {}, {}), null);
  assert.throws(() => frontendUrl("/", {}, { FRONTEND_PUBLIC_URL: "ftp://x" }), /HTTP or HTTPS/);
  assert.throws(() => frontendUrl("/", {}, { FRONTEND_PUBLIC_URL: "http://x", NODE_ENV: "production" }), /HTTPS in production/);
});

test("membership reminders go out once per membership and are retried after a failed send", async () => {
  const claimed = new Map();
  const LogModel = {
    findOrCreate: async ({ where, defaults }) => {
      const key = `${where.kind}:${where.referenceId}`;
      if (claimed.has(key)) return [claimed.get(key), false];
      const log = { ...defaults, destroy: async () => claimed.delete(key) };
      claimed.set(key, log);
      return [log, true];
    },
  };
  const member = (id) => ({ id, Member: { User: { id: `u-${id}`, fullName: "Asha Rao", email: `${id}@example.com` } }, Course: { name: "MMA" } });
  const queried = [];
  const MembershipModel = { findAll: async ({ where }) => { queried.push(where.endDate); return where.endDate === "2026-11-11" ? [member("a"), member("b")] : []; } };
  let failNext = "b@example.com";
  const sent = [];
  const send = async (to, message) => {
    if (to === failNext) { failNext = null; throw new Error("smtp down"); }
    sent.push([to, message.subject]);
  };
  const options = { today: "2026-11-04", MembershipModel, LogModel, send, configured: true, renewUrl: "https://gym.test/" };

  assert.deepEqual(await sendMembershipEndingReminders(options), { sent: 1, skipped: 0, failed: 1 });
  assert.deepEqual(queried, ["2026-11-11", "2026-11-05"]);
  assert.deepEqual(await sendMembershipEndingReminders(options), { sent: 1, skipped: 1, failed: 0 });
  assert.deepEqual(sent.map(([to]) => to), ["a@example.com", "b@example.com"]);
  assert.deepEqual(await sendMembershipEndingReminders({ ...options, configured: false }), { sent: 0, skipped: 0, failed: 0 });
});
