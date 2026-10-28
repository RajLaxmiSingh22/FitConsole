ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "needs_review" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "cashfree_orders"
  ADD COLUMN IF NOT EXISTS "payment_session_id" TEXT;

CREATE INDEX IF NOT EXISTS "cashfree_orders_membership_status_expiry_idx"
  ON "cashfree_orders" ("membership_id", "status", "expires_at");
