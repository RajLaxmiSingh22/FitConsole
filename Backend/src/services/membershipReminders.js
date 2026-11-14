import { Course, EmailLog, Member, Membership, User } from "../models/index.js";
import { addDaysToDateString } from "../utils/dates.js";
import { frontendUrl } from "../utils/frontendUrl.js";
import { isEmailConfigured, sendEmail } from "./email.js";
import { membershipEndingEmail } from "./emailTemplates.js";

// Members are emailed 7 days and 1 day before their active membership ends.
export const REMINDER_DAYS = [7, 1];

// Sends each "membership ending" email at most once, using email_log as the record of what was sent.
export async function sendMembershipEndingReminders({
  today,
  MembershipModel = Membership,
  LogModel = EmailLog,
  send = sendEmail,
  configured = isEmailConfigured(),
  renewUrl = frontendUrl("/", { section: "Membership" }),
} = {}) {
  const summary = { sent: 0, skipped: 0, failed: 0 };
  if (!configured || !renewUrl) return summary;

  for (const daysLeft of REMINDER_DAYS) {
    const endDate = addDaysToDateString(today, daysLeft);
    const memberships = await MembershipModel.findAll({
      where: { status: "active", endDate },
      include: [
        { model: Member, required: true, include: [{ model: User, required: true, attributes: ["id", "fullName", "email"] }] },
        { model: Course, attributes: ["name"] },
      ],
    });
    for (const membership of memberships) {
      const user = membership.Member.User;
      const kind = `membership_ending_${daysLeft}d`;
      // Claim the reminder first so a second job run cannot send it again.
      const [log, created] = await LogModel.findOrCreate({
        where: { kind, referenceId: membership.id },
        defaults: { kind, referenceId: membership.id, userId: user.id },
      });
      if (!created) {
        summary.skipped += 1;
        continue;
      }
      try {
        await send(user.email, membershipEndingEmail({
          fullName: user.fullName,
          courseName: membership.Course?.name ?? "gym",
          endDate,
          daysLeft,
          renewUrl,
        }));
        summary.sent += 1;
      } catch (error) {
        // Release the claim so the next daily run retries this reminder.
        await log.destroy();
        summary.failed += 1;
        console.error("Membership reminder email was not delivered:", error.message);
      }
    }
  }
  return summary;
}
