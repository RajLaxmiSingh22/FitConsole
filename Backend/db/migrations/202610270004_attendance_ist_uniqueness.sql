ALTER TABLE "attendance"
  ADD COLUMN IF NOT EXISTS "attended_on" DATE,
  ADD COLUMN IF NOT EXISTS "override" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "override_reason" TEXT;

WITH ranked_attendance AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "member_id", "course_id", ("attended_at" AT TIME ZONE 'Asia/Kolkata')::DATE
           ORDER BY "attended_at", "id"
         ) AS row_number,
         ("attended_at" AT TIME ZONE 'Asia/Kolkata')::DATE AS attended_on
  FROM "attendance"
)
UPDATE "attendance" AS attendance
SET "attended_on" = CASE WHEN ranked.row_number = 1 THEN ranked.attended_on ELSE NULL END
FROM ranked_attendance AS ranked
WHERE attendance."id" = ranked."id";

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_member_course_day_unique_idx"
  ON "attendance" ("member_id", "course_id", "attended_on")
  WHERE "attended_on" IS NOT NULL;
