UPDATE "memberships" AS membership
SET "status" = 'pending_payment'
WHERE membership."status" = 'active'
  AND COALESCE((
    SELECT SUM(payment."amount")
    FROM "payments" AS payment
    WHERE payment."membership_id" = membership."id"
      AND payment."voided_at" IS NULL
  ), 0) < membership."total_amount";
