ALTER TABLE "payment_details"
  ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "payment_details_open_reminders_idx"
  ON "payment_details" ("reminder_date")
  WHERE "resolved_at" IS NULL;
