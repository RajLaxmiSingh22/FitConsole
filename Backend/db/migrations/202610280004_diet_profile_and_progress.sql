ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "goal_category" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "diet_preference" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "allergies" VARCHAR(32)[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_goal_category_check') THEN
    ALTER TABLE "clients" ADD CONSTRAINT "clients_goal_category_check"
      CHECK ("goal_category" IS NULL OR "goal_category" IN ('fat_loss', 'muscle_gain', 'maintain'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_diet_preference_check') THEN
    ALTER TABLE "clients" ADD CONSTRAINT "clients_diet_preference_check"
      CHECK ("diet_preference" IS NULL OR "diet_preference" IN ('veg', 'non_veg', 'eggetarian', 'vegan'));
  END IF;
END
$$;

ALTER TABLE "progress_entries"
  ADD COLUMN IF NOT EXISTS "stamina" SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'progress_entries_stamina_check') THEN
    ALTER TABLE "progress_entries" ADD CONSTRAINT "progress_entries_stamina_check"
      CHECK ("stamina" IS NULL OR "stamina" BETWEEN 1 AND 10);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "progress_entries_client_recorded_idx"
  ON "progress_entries" ("client_id", "recorded_at");
