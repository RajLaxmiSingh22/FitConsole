# FitConsole project overview

FitConsole is a web application for gym owners, trainers, and clients. The public website provides catalog-backed program/trainer pages, a free-trial request form, and consent-aware first-party analytics. The owner workspace manages clients, trainers, courses, course pricing, memberships, payments, attendance, website leads and analytics, dashboard metrics, and spreadsheet exports. Trainer and client workspaces provide the corresponding roster, check-in, diet-plan, membership, profile, and messaging workflows.

## Implemented workflows

- **Accounts and access:** Client registration and login, JWT-protected APIs, role checks, and optional first-run owner/trainer bootstrap accounts that do not overwrite existing credentials.
- **Courses and memberships:** Owners manage courses, trainer assignments, and 1-, 3-, 6-, and 12-month prices. Clients can choose a published offer and begin membership checkout.
- **Payments:** Owners can record manual payments. Cashfree orders are created by the backend, verified through the provider's payment-fetch API, and recorded after a successful result.
- **Attendance and progress:** Owner/trainer check-ins, client attendance history, and client diet/progress entries.
- **Diet plans:** Gemini can draft a plan when configured. Trainers can review and approve drafts before clients see them.
- **Waivers and communication:** Clients can accept the configured waiver; users can message within conversations they participate in.
- **Reporting:** Owner and trainer dashboards expose API-backed metrics; owners can export supported data to XLSX.
- **Website leads:** Public free-trial requests are validated, de-duplicated by phone over a configured rolling window, stored as unconfirmed requests, and visible to owners with activity/status history and active-course assignment.
- **Conversion:** Owners can convert an attended-trial lead only when it matches an existing member account and a valid course duration. Membership creation and lead linking are transactional; no payment is fabricated.
- **Website analytics:** Anonymous event ingestion requires visitor consent and stores no IP or device fingerprint. Owner summaries use persisted events and lead records.
- **Password reset:** Optional Resend delivery provides one-time, hashed, expiring reset tokens; email provider configuration is required.

## Architecture

- **Frontend:** React and Vite role-based web application.
- **Backend:** Node.js and Express API with Joi validation and JWT/Argon2 authentication.
- **Database:** PostgreSQL through Sequelize.
- **Optional integrations:** Cashfree Payments, Google Gemini, and ExcelJS.
- **Optional email:** Resend for password-reset delivery.

See the root [README](./README.md) for setup, environment variables, API route groups, tests, and operational notes.

## Scope and limitations

- The Cashfree return flow fetches and verifies order payments on the server. A signed Cashfree webhook and a daily reconciliation job also record payments.
- File upload and secure document storage are not implemented; ID-proof and document fields store references only.
- Waiver acceptance records the configured version and acceptance time, not an immutable snapshot or hash of the exact text. Configure reviewed, non-empty waiver wording before use.
- Payment reminders are follow-up records, not automatically delivered notifications; messaging is refreshed on demand.
- AI diet-plan generation requires a configured Gemini API key and trainer review.
- Backend still synchronizes legacy models at startup, then executes versioned additive SQL migrations; a migration-only baseline and production rollout process still need review.
- Lead conversion links existing member records only; first-time account invitation, automated booking confirmation, branches, and class scheduling are not implemented.
- Sensitive public and AI-generation endpoints use process-local rate limits and need a shared store for multiple replicas.
- Password reset needs Resend credentials, a verified sender, and an HTTPS public frontend URL in production.
- Backend tests now include lead validation/workflow and rate limiting but still lack database-backed HTTP, authorization, migration, transaction rollback, and provider integration tests. The frontend has no repository-managed test or lint script.
- Public trainer routes no longer disclose phone numbers; authenticated owners and the profile owner can access them. Sessions use httpOnly access/refresh cookies with CSRF double-submit protection.
