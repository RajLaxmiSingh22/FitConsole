ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "voided_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "void_reason" TEXT;

CREATE TABLE IF NOT EXISTS "payment_audit" (
  "id" UUID PRIMARY KEY,
  "payment_id" UUID NOT NULL REFERENCES "payments" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "action" VARCHAR(32) NOT NULL,
  "old_values" JSONB,
  "new_values" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "payment_audit_payment_created_at_idx"
  ON "payment_audit" ("payment_id", "created_at");

CREATE INDEX IF NOT EXISTS "payments_membership_voided_at_idx"
  ON "payments" ("membership_id", "voided_at");
