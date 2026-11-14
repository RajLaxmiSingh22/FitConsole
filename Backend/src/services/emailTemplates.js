// FitConsole transactional emails. Each template returns { subject, text, html }; html uses inline styles for email clients.

const colors = { background: "#0b0b0d", panel: "#16161a", border: "#2a2a30", text: "#f2f2f2", muted: "#a0a0aa", red: "#e63946" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function firstName(fullName) {
  return String(fullName ?? "").trim().split(/\s+/)[0] || "there";
}

function button(label, url) {
  return `<p style="margin:28px 0"><a href="${escapeHtml(url)}" style="background:${colors.red};color:#fff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:6px;display:inline-block;letter-spacing:.04em">${escapeHtml(label)}</a></p>`;
}

function layout({ eyebrow, heading, body }) {
  return `<!doctype html>
<html><body style="margin:0;background:${colors.background};font-family:Arial,Helvetica,sans-serif;color:${colors.text}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.background};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${colors.panel};border:1px solid ${colors.border};border-radius:10px">
        <tr><td style="padding:24px 28px;border-bottom:1px solid ${colors.border}">
          <span style="display:inline-block;background:${colors.red};color:#fff;font-weight:800;width:28px;height:28px;line-height:28px;text-align:center;border-radius:4px">F</span>
          <span style="font-weight:800;letter-spacing:.12em;margin-left:8px;vertical-align:middle">FITCONSOLE</span>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 8px;color:${colors.red};font-size:12px;font-weight:700;letter-spacing:.14em">${escapeHtml(eyebrow)}</p>
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2">${escapeHtml(heading)}</h1>
          <div style="font-size:15px;line-height:1.6;color:${colors.text}">${body}</div>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid ${colors.border};color:${colors.muted};font-size:12px;line-height:1.5">
          TRAIN HARD. EAT SMART. GROW FASTER.<br>You received this email because of activity on your FitConsole account.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const paragraph = (text) => `<p style="margin:0 0 14px">${text}</p>`;
const muted = (text) => `<p style="margin:0 0 14px;color:${colors.muted};font-size:13px">${text}</p>`;

export function welcomeEmail({ fullName, loginUrl }) {
  const name = firstName(fullName);
  return {
    subject: "Welcome to FitConsole",
    text: `Hi ${name},\n\nYour FitConsole member account is ready. Sign in any time to see your training, meal plan, check-ins and membership:\n${loginUrl}\n\nIf you didn't create this account, reply to this email or contact the gym.\n\nTrain hard. Eat smart. Grow faster.`,
    html: layout({
      eyebrow: "YOUR FIRST ROUND",
      heading: `Welcome, ${name}.`,
      body: paragraph("Your FitConsole member account is ready. Sign in any time to see your training, meal plan, check-ins and membership.")
        + button("Sign in to FitConsole", loginUrl)
        + muted("If you didn't create this account, reply to this email or contact the gym."),
    }),
  };
}

export function signInAlertEmail({ fullName, signedInAt, resetUrl }) {
  const name = firstName(fullName);
  const when = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(signedInAt);
  return {
    subject: "New sign-in to your FitConsole account",
    text: `Hi ${name},\n\nYour FitConsole account was signed in on ${when} (IST).\n\nIf this was you, there's nothing to do. If it wasn't you, reset your password now:\n${resetUrl}`,
    html: layout({
      eyebrow: "SECURITY",
      heading: "New sign-in to your account",
      body: paragraph(`Hi ${escapeHtml(name)}, your FitConsole account was signed in on <b>${escapeHtml(when)} (IST)</b>.`)
        + paragraph("If this was you, there's nothing to do.")
        + muted("If it wasn't you, reset your password now. This signs you out everywhere.")
        + button("Reset my password", resetUrl),
    }),
  };
}

export function passwordResetEmail({ resetUrl, expiresInMinutes = 30 }) {
  return {
    subject: "Reset your FitConsole password",
    text: `A password reset was requested for this email address. If it is linked to a FitConsole account, use this one-time link within ${expiresInMinutes} minutes to choose a new password:\n${resetUrl}\n\nIf you did not request this, you can ignore this email; your password will not change.`,
    html: layout({
      eyebrow: "PASSWORD RESET",
      heading: "Choose a new password",
      body: paragraph(`We received a request to reset the password for this email address. Use the button below within <b>${expiresInMinutes} minutes</b> to choose a new one. The link works once.`)
        + button("Change my password", resetUrl)
        + muted("If you didn't request this, you can ignore this email. Your password will not change."),
    }),
  };
}

export function passwordChangedEmail({ fullName, resetUrl }) {
  const name = firstName(fullName);
  return {
    subject: "Your FitConsole password was changed",
    text: `Hi ${name},\n\nThe password for your FitConsole account was just changed, and you were signed out on all devices.\n\nIf you didn't do this, reset your password now and contact the gym:\n${resetUrl}`,
    html: layout({
      eyebrow: "SECURITY",
      heading: "Your password was changed",
      body: paragraph(`Hi ${escapeHtml(name)}, the password for your FitConsole account was just changed, and you were signed out on all devices.`)
        + muted("If you didn't do this, reset your password now and contact the gym.")
        + button("Reset my password", resetUrl),
    }),
  };
}

export function membershipEndingEmail({ fullName, courseName, endDate, daysLeft, renewUrl }) {
  const name = firstName(fullName);
  const ends = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${endDate}T00:00:00Z`));
  const when = daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
  return {
    subject: `Your ${courseName} membership ends ${when}`,
    text: `Hi ${name},\n\nYour ${courseName} membership ends ${when} (${ends}). Renew now to keep training without a break:\n${renewUrl}\n\nIf you've already renewed, you can ignore this email.`,
    html: layout({
      eyebrow: "MEMBERSHIP",
      heading: `Your membership ends ${when}`,
      body: paragraph(`Hi ${escapeHtml(name)}, your <b>${escapeHtml(courseName)}</b> membership ends on <b>${escapeHtml(ends)}</b>.`)
        + paragraph("Renew now to keep training without a break.")
        + button("Renew my membership", renewUrl)
        + muted("If you've already renewed, you can ignore this email."),
    }),
  };
}
