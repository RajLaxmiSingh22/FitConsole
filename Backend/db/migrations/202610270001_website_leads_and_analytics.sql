CREATE TABLE IF NOT EXISTS "website_leads" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(24) NOT NULL,
  "normalized_phone" VARCHAR(10) NOT NULL,
  "email" VARCHAR(320),
  "course_id" UUID REFERENCES "courses" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "preferred_date" DATE,
  "preferred_slot" VARCHAR(120),
  "message" TEXT,
  "consent" BOOLEAN NOT NULL,
  "source" VARCHAR(80) NOT NULL DEFAULT 'website',
  "landing_page" VARCHAR(512),
  "utm_source" VARCHAR(120),
  "utm_medium" VARCHAR(120),
  "utm_campaign" VARCHAR(160),
  "status" VARCHAR(32) NOT NULL DEFAULT 'new',
  "trial_attended_at" TIMESTAMPTZ,
  "client_id" UUID REFERENCES "clients" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "website_leads_status_check" CHECK (
    "status" IN ('new', 'contacted', 'trial_scheduled', 'trial_confirmed', 'trial_attended', 'no_show', 'enrolled', 'lost')
  )
);

CREATE INDEX IF NOT EXISTS "website_leads_phone_created_at_idx"
  ON "website_leads" ("normalized_phone", "created_at");
CREATE INDEX IF NOT EXISTS "website_leads_status_created_at_idx"
  ON "website_leads" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "website_leads_course_created_at_idx"
  ON "website_leads" ("course_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'website_leads_status_check') THEN
    ALTER TABLE "website_leads" ADD CONSTRAINT "website_leads_status_check"
      CHECK ("status" IN ('new', 'contacted', 'trial_scheduled', 'trial_confirmed', 'trial_attended', 'no_show', 'enrolled', 'lost'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "lead_activities" (
  "id" UUID PRIMARY KEY,
  "lead_id" UUID NOT NULL REFERENCES "website_leads" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "user_id" UUID REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "type" VARCHAR(32) NOT NULL CHECK ("type" IN ('note', 'status_change', 'trial_attendance', 'enrollment')),
  "description" TEXT NOT NULL,
  "previous_status" VARCHAR(32),
  "new_status" VARCHAR(32),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "lead_activities_lead_created_at_idx"
  ON "lead_activities" ("lead_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lead_activities_type_check') THEN
    ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_type_check"
      CHECK ("type" IN ('note', 'status_change', 'trial_attendance', 'enrollment'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" UUID PRIMARY KEY,
  "event_id" UUID NOT NULL UNIQUE,
  "visitor_id" UUID,
  "session_id" UUID,
  "type" VARCHAR(32) NOT NULL CHECK (
    "type" IN ('page_view', 'form_start', 'form_submit', 'trial_booking', 'trial_attendance', 'enrollment')
  ),
  "page" VARCHAR(512) NOT NULL,
  "source" VARCHAR(80),
  "utm_source" VARCHAR(120),
  "utm_medium" VARCHAR(120),
  "utm_campaign" VARCHAR(160),
  "lead_id" UUID REFERENCES "website_leads" ("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "analytics_events_type_created_at_idx"
  ON "analytics_events" ("type", "created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_visitor_created_at_idx"
  ON "analytics_events" ("visitor_id", "created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_session_created_at_idx"
  ON "analytics_events" ("session_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_events_type_check') THEN
    ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_type_check"
      CHECK ("type" IN ('page_view', 'form_start', 'form_submit', 'trial_booking', 'trial_attendance', 'enrollment'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "token_hash" VARCHAR(64) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_expires_idx"
  ON "password_reset_tokens" ("user_id", "expires_at");

ALTER TABLE "payments" ALTER COLUMN "membership_id" DROP NOT NULL;
