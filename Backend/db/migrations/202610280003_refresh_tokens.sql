CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users" ("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "token_hash" VARCHAR(64) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "replaced_by_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "refresh_tokens_user_active_idx"
  ON "refresh_tokens" ("user_id")
  WHERE "revoked_at" IS NULL;
