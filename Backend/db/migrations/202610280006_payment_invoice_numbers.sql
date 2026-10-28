CREATE SEQUENCE IF NOT EXISTS "payment_invoice_number_seq";

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "invoice_number" BIGINT;

-- Backfill existing payments in the order they were received.
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "paid_at", "id") AS row_number
  FROM "payments"
  WHERE "invoice_number" IS NULL
)
UPDATE "payments" AS payments
SET "invoice_number" = numbered.row_number + COALESCE((SELECT MAX("invoice_number") FROM "payments"), 0)
FROM numbered
WHERE payments."id" = numbered."id";

SELECT setval(
  'payment_invoice_number_seq',
  GREATEST(COALESCE((SELECT MAX("invoice_number") FROM "payments"), 0), 1),
  COALESCE((SELECT MAX("invoice_number") FROM "payments"), 0) > 0
);

ALTER TABLE "payments"
  ALTER COLUMN "invoice_number" SET DEFAULT nextval('payment_invoice_number_seq');
ALTER TABLE "payments"
  ALTER COLUMN "invoice_number" SET NOT NULL;
ALTER SEQUENCE "payment_invoice_number_seq" OWNED BY "payments"."invoice_number";

CREATE UNIQUE INDEX IF NOT EXISTS "payments_invoice_number_idx" ON "payments" ("invoice_number");
