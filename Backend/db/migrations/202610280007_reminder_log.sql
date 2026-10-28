CREATE TABLE IF NOT EXISTS "reminder_log" (
  "id" UUID PRIMARY KEY,
  "payment_id" UUID NOT NULL REFERENCES "payments" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "client_id" UUID NOT NULL REFERENCES "clients" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "sent_by_id" UUID REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "channel" VARCHAR(16) NOT NULL DEFAULT 'whatsapp',
  "amount_due" DECIMAL(10, 2) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "reminder_log_client_created_at_idx"
  ON "reminder_log" ("client_id", "created_at");
