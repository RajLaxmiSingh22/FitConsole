CREATE INDEX IF NOT EXISTS "payments_paid_at_active_idx"
  ON "payments" ("paid_at")
  WHERE "voided_at" IS NULL;
CREATE INDEX IF NOT EXISTS "attendance_attended_at_idx"
  ON "attendance" ("attended_at");
CREATE INDEX IF NOT EXISTS "attendance_member_attended_at_idx"
  ON "attendance" ("member_id", "attended_at");
CREATE INDEX IF NOT EXISTS "attendance_trainer_attended_at_idx"
  ON "attendance" ("trainer_id", "attended_at");
CREATE INDEX IF NOT EXISTS "memberships_status_end_date_idx"
  ON "memberships" ("status", "end_date");
