import { QueryTypes } from "sequelize";
import { sequelize } from "../database.js";
import { addDaysToDateString, todayInGymTz } from "../utils/dates.js";
import { resolveReportRange } from "../utils/reportRange.js";

const select = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

export async function getOwnerAnalytics(req, res) {
  const range = resolveReportRange(req.validated.query);
  if (range.error) return res.status(400).json({ status: "error", message: range.error });
  try {
    const today = todayInGymTz();
    const replacements = {
      start: range.start,
      end: range.end,
      tz: range.timeZone,
      today,
      in7: addDaysToDateString(today, 7),
      in15: addDaysToDateString(today, 15),
      riskCutoff: addDaysToDateString(today, -7),
      since30: new Date(Date.now() - 30 * 86400000),
    };
    const [revenueByMonth, revenueByCourse, revenueByMethod, attendanceHeatmap, atRiskMembers, trainerWorkload, expiring] = await Promise.all([
      select(`SELECT to_char(date_trunc('month', p.paid_at AT TIME ZONE :tz), 'YYYY-MM') AS month,
                     SUM(p.amount)::float AS total
              FROM payments p
              WHERE p.voided_at IS NULL AND p.paid_at >= :start AND p.paid_at < :end
              GROUP BY 1 ORDER BY 1`, replacements),
      select(`SELECT c.id AS "courseId", COALESCE(c.name, 'Not linked to a course') AS name,
                     SUM(p.amount)::float AS total
              FROM payments p
              LEFT JOIN memberships m ON m.id = p.membership_id
              LEFT JOIN courses c ON c.id = m.course_id
              WHERE p.voided_at IS NULL AND p.paid_at >= :start AND p.paid_at < :end
              GROUP BY c.id, c.name ORDER BY total DESC`, replacements),
      select(`SELECT p.payment_method AS method, SUM(p.amount)::float AS total
              FROM payments p
              WHERE p.voided_at IS NULL AND p.paid_at >= :start AND p.paid_at < :end
              GROUP BY p.payment_method ORDER BY total DESC`, replacements),
      select(`SELECT EXTRACT(DOW FROM a.attended_at AT TIME ZONE :tz)::int AS weekday,
                     EXTRACT(HOUR FROM a.attended_at AT TIME ZONE :tz)::int AS hour,
                     COUNT(*)::int AS count
              FROM attendance a
              WHERE a.attended_at >= :start AND a.attended_at < :end
              GROUP BY 1, 2 ORDER BY 1, 2`, replacements),
      select(`SELECT c.id AS "clientId", u.full_name AS name, c.phone, MAX(a.attended_at) AS "lastSeen"
              FROM memberships m
              JOIN users u ON u.id = m.member_id
              JOIN clients c ON c.user_id = m.member_id
              LEFT JOIN attendance a ON a.member_id = m.member_id
              WHERE m.status = 'active' AND m.start_date <= :today AND m.end_date >= :today
              GROUP BY c.id, u.full_name, c.phone
              HAVING MAX(a.attended_at) IS NULL OR (MAX(a.attended_at) AT TIME ZONE :tz)::date < :riskCutoff
              ORDER BY "lastSeen" ASC NULLS FIRST
              LIMIT 100`, replacements),
      select(`SELECT t.id AS "trainerId", u.full_name AS name,
                     (SELECT COUNT(DISTINCT c.id) FROM clients c
                        JOIN memberships m ON m.member_id = c.user_id
                       WHERE c.trainer_id = t.id AND m.status = 'active'
                         AND m.start_date <= :today AND m.end_date >= :today)::int AS "activeClients",
                     (SELECT COUNT(*) FROM attendance a
                       WHERE a.trainer_id = t.user_id AND a.attended_at >= :since30)::int AS "checkInsLast30d",
                     COALESCE((SELECT json_agg(json_build_object('id', co.id, 'name', co.name) ORDER BY co.name)
                                 FROM trainer_courses tc JOIN courses co ON co.id = tc.course_id
                                WHERE tc.trainer_id = t.user_id), '[]'::json) AS courses
              FROM trainers t
              JOIN users u ON u.id = t.user_id
              LEFT JOIN user_statuses s ON s.user_id = t.user_id
              WHERE COALESCE(s.active, TRUE)
              ORDER BY u.full_name`, replacements),
      select(`SELECT m.id AS "membershipId", c.id AS "clientId", u.full_name AS name, c.phone,
                     co.name AS course, m.end_date::text AS "endDate", (m.end_date <= :in7) AS "within7"
              FROM memberships m
              JOIN users u ON u.id = m.member_id
              JOIN clients c ON c.user_id = m.member_id
              JOIN courses co ON co.id = m.course_id
              WHERE m.status = 'active' AND m.end_date BETWEEN :today AND :in15
              ORDER BY m.end_date ASC`, replacements),
    ]);
    return res.json({
      status: "success",
      data: {
        range: { from: range.from, to: range.to, timeZone: range.timeZone },
        revenueByMonth,
        revenueByCourse,
        revenueByMethod,
        attendanceHeatmap,
        atRiskMembers,
        trainerWorkload,
        expiring: {
          in7: expiring.filter((row) => row.within7),
          in15: expiring,
        },
      },
    });
  } catch (error) {
    console.error("Owner analytics failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve analytics." });
  }
}
