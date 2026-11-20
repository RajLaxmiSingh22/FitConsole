-- Owner-editable gym contact details shown on the public website. One row (id = 1); until the owner saves
-- it, the website falls back to placeholder text from the frontend constants. Values are not seeded.
CREATE TABLE IF NOT EXISTS "gym_settings" (
  "id" SMALLINT PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "phone" VARCHAR(40),
  "email" VARCHAR(254),
  "address" VARCHAR(300),
  "map_url" VARCHAR(500),
  "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "updated_by" UUID REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
