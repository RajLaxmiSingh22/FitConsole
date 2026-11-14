# FitConsole project instructions

## Verified architecture

- `Frontend/` and `Backend/` are independent npm projects with separate lockfiles; there is no root npm workspace.
- The frontend is a React 19 application built with Vite. `Frontend/src/App.jsx` restores a JWT-backed session and selects owner, trainer, or client workspace components. Navigation is local component state rather than a router.
- `Frontend/src/services/api.js` is the Axios API client. Requests use the configured `VITE_API_URL` or `http://localhost:9000/api`; sessions use httpOnly `SameSite=Strict` access/refresh cookies (`withCredentials`), and state-changing requests send the in-memory CSRF token as `X-CSRF-Token`.
- The backend is an Express 5 API using Sequelize 6 with PostgreSQL, Joi validation, JWT authentication, and Argon2 password hashing. API routes are mounted under `/api` from `Backend/src/app.js`.
- Sequelize models and relationships are registered in `Backend/src/models/index.js`. Startup authenticates to PostgreSQL, applies versioned SQL migrations from `Backend/db/migrations/` (starting with the full-schema `000_baseline.sql`, generated from the real schema and proven identical to the older files it replaced; `LEGACY_MIGRATIONS`/`INTERIM_BASELINES` in `src/runMigrations.js` let databases built from those files record it without re-running it), and provisions configured owner and trainer accounts. `sequelize.sync()` is not used; every schema change must be a new, later-dated migration file kept in step with the models.
- Optional integrations include Cashfree payments, Gemini diet-plan generation, and SMTP email (`services/email.js`, templates in `services/emailTemplates.js`) for password reset, welcome, sign-in alerts and membership-ending reminders. ExcelJS supports owner exports. Cloudinary (`services/cloudinary.js`, signed REST uploads, `CLOUDINARY_*` env) stores profile photos and gallery media under `<root>/users/avatars/<role>/<userId>/` and `<root>/gallery/{images,videos}/`.
- Backend responses use `{ status: "success", data: ... }` or `{ status: "error", message: ... }`. The only exception is the health check `GET /api/health`, which returns `{ status: "ok", service, database }` for uptime monitors and the API-status light; keep it that way.

## Existing implementation conventions

- Preserve the current MVC split: route modules, controllers, Sequelize models, validation schemas, middleware, and shared utilities.
- Use `requireAuthentication`, `requireRole`, and `validateRequest` for protected API work. Role checks do not replace object-level access checks; reuse `canAccessClient` and conversation-participant checks where applicable.
- Keep authorization and business rules on the server. Preserve the existing response envelope and API contracts unless an approved phase requires a documented extension.
- Use database transactions for related writes. Do not call `sequelize.sync()`; change the schema only through new migration files.
- Continue using the existing request schemas and structured error responses. Do not silently hide failed API calls or return fabricated success data.
- Frontend layering: `services/` (API client and other data access), `hooks/` (data loading and state), `pages/<area>/` (one screen or section per file), `layouts/`, `components/ui/` (shared controls, imported via `components/ui/index.js`), `constants/`, and `utils/` (formatters such as `currency`, `dateLabel`). API wrappers and `responseData` live in `Frontend/src/services/api.js`.
- Account settings are under `/api/profile` (name, photo, owner coaching toggle). Photos live in `user_avatars` (JPEG/PNG/WebP checked by file signature, 200 KB max) — in Cloudinary (row keeps `url`/`public_id`) when configured, otherwise as bytes — and are served from `/api/profile/avatar/:id` (a redirect for Cloudinary copies), publicly only for coaches. An owner who also coaches gets a `trainers` row; turning it off is refused while anything references it, because deleting a trainer cascades.
- Gallery: owner-only `/api/gallery` (raw image ≤10 MB or MP4/MOV/WebM video ≤100 MB, title/caption in the query; edit, show/hide, reorder via `PUT /order`, delete) backed by `gallery_items`; the public page reads published items from `GET /api/public/gallery` and falls back to placeholder tiles when empty.
- Owner client import: `GET /api/clients/import/template.xlsx` and `POST /api/clients/import` (raw .xlsx/.csv, 2 MB, 500 rows; `?commit=true` to save). Parsing and row checks live in `services/clientImport.js`; ready rows are created in one transaction, duplicates and invalid rows are skipped, and imported members get no usable password (they use Forgot password).
- Public lead and analytics endpoints are under `/api/public`; owner-only lead management (including active-course assignment and enrollment) is under `/api/leads`; owner website analytics is under `/api/analytics/summary`.
- Trial conversion links a pre-existing client/member account only. Opening hours (owner-provided) live in `Frontend/src/constants/openingHours.js`; the class timetable is owner-managed (`/api/schedule`, Attendance → Class schedule). There is no branch, address or gym-contact configuration, so do not invent those details.

## Design conventions

- The active application stylesheet is `Frontend/src/styles.css`, loaded by `Frontend/src/main.jsx`. It defines the current dark FitConsole palette and CSS variables, using Barlow Condensed, DM Sans, and DM Mono.
- `Frontend/src/styles.css` is the only stylesheet; the unused `assests/theme.css` and `assests/Icons.jsx` were removed, so add new tokens to `styles.css`.
- Preserve the FitConsole “Fight Night” visual identity, use shared CSS variables for tokens, and keep status information understandable without relying on color alone.
- Use the supplied ZIP screenshots in `design/references/` (git-ignored, local only) as design references, not as permission to copy third-party logos, photographs, or other copyrighted assets.
- Keep layouts responsive to 360px and provide explicit loading, empty, success, and error states for data-driven screens.

## Security and privacy

- Member analytics (streaks, attendance %, calendar, progress, wellness, latest records) live in `services/memberAnalytics.js` on top of `utils/attendanceStats.js`; client, trainer and owner views all use them through `canAccessClient`. Scheduled sessions are each member's `trainingDays` (default Mon/Wed/Fri) inside a membership period.
- Demo data: `npm run seed:demo-gym` (25 members, 5 coaches, `@demo.fitconsole.example.com`) and `npm run seed:demo` (Alex Morgan) are idempotent and only touch demo accounts.
- The one-click demo client (`DEMO_*` backend env, `POST /api/auth/demo-login`, `npm run seed:demo`) is read-only: `requireAuthentication` refuses its state-changing requests via `utils/demo.js`. Keep new write endpoints behind `requireAuthentication` so the guard applies, and never send demo credentials to the frontend.

- Never put credentials, private member data, JWTs, or server-only API keys in frontend code, logs, documentation, or commits.
- Keep local `.env` files private. Edit `.env.example` only for reviewed, non-secret configuration placeholders.
- Enforce role and object-level authorization on the backend. Do not expose private client, trainer, lead, payment, or analytics records through public endpoints.
- Validate and constrain public inputs, apply appropriate abuse controls to sensitive public operations, and minimize stored personal data.
- Analytics events are persisted only after visitor consent; never add IP addresses or device fingerprints to normal analytics records. Current throttling is in-memory per process and is not sufficient for a multi-replica deployment.
- Treat provider payment confirmation as authoritative; never mark an unpaid or pending transaction successful based on browser state.
- Do not run destructive database operations, reset data, or overwrite remote Git history without explicit approval.

## Commands

Run commands from the corresponding package directory:

```sh
cd Backend && npm test   # no .env needed; set TEST_DATABASE_URL (a disposable Postgres) to also run the database tests
cd Backend && npm run migrate
cd Backend && npm run audit:routes   # every route × role × CSRF on a throwaway database
cd Backend && npm run docs:generate  # rebuild the /docs endpoint directory from the routes
cd Frontend && npm run build
```

Development commands are `npm run dev` in each package. The backend requires PostgreSQL and configured values from `Backend/.env`; `Backend/.env.example` lists the expected settings. Password reset additionally needs SMTP settings and an HTTPS frontend URL in production. The frontend uses `Frontend/.env.example` for public Vite configuration. There is no frontend test or lint script in the inspected package manifest.

## Documentation rule

After ANY change to routes, roles, auth, database schema, env variables, payments, the demo account or admin features: run npm run docs:generate, update the matching section of the /docs page, and add an entry to docs/CHANGELOG.md written for a gym owner. A task is not done until npm run docs:check passes.

- `Backend/scripts/generate-api-docs.js` reads every route from the Express app (shared route listing in `Backend/scripts/lib/routes.mjs`) and writes `Frontend/src/docs/endpoints.json`; never edit that file by hand.
- Each route needs a one-line, plain-English description in `Backend/src/routes/routeDescriptions.js`; generation fails for missing or stale entries.
- `npm test` runs `docs:check`. CHANGELOG entries use `## YYYY-MM-DD · Title`, then **What changed** and **What you need to do** lists (newest first, no code).

## Phase workflow

1. Audit actual implementations, route authorization, data relationships, and supplied references before making application changes.
2. Implement only the currently approved phase, using migrations for schema changes and tests for changed behavior.
3. Preserve existing behavior and contracts; add focused tests for new validation, permissions, and transactional flows.
4. Run relevant backend tests and the frontend production build. Report actual commands, results, blockers, and remaining work.
5. Summarize changed files, migrations, endpoints, and manual setup, then stop for review before beginning the next phase.
6. Commits and PRs are authored only by RajLaxmiSingh22 <230652337+RajLaxmiSingh22@users.noreply.github.com> (set in this repo's git config). Never add "Co-authored-by", "Generated with", "Claude-Session" or any other AI attribution to commit messages or PR descriptions.
7. Before any commit or push, inspect the diff and staged files, keep private/generated artifacts out, and wait for approval before pushing.
