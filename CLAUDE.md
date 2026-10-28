# FitConsole project instructions

## Verified architecture

- `Frontend/` and `Backend/` are independent npm projects with separate lockfiles; there is no root npm workspace.
- The frontend is a React 19 application built with Vite. `Frontend/src/App.jsx` restores a JWT-backed session and selects owner, trainer, or client workspace components. Navigation is local component state rather than a router.
- `Frontend/src/api.js` is the Axios API client. Requests use the configured `VITE_API_URL` or `http://localhost:9000/api`; sessions use httpOnly `SameSite=Strict` access/refresh cookies (`withCredentials`), and state-changing requests send the in-memory CSRF token as `X-CSRF-Token`.
- The backend is an Express 5 API using Sequelize 6 with PostgreSQL, Joi validation, JWT authentication, and Argon2 password hashing. API routes are mounted under `/api` from `Backend/src/app.js`.
- Sequelize models and relationships are registered in `Backend/src/models/index.js`. Startup authenticates to PostgreSQL, calls `sequelize.sync()` for the legacy schema, applies versioned SQL migrations from `Backend/db/migrations/`, and provisions configured owner and trainer accounts. This is additive migration support, not a fully migration-only baseline.
- Optional integrations include Cashfree payments, Gemini diet-plan generation, and Resend password-reset email. ExcelJS supports owner exports. Cloudinary is not configured in the inspected source.
- Backend responses use `{ status: "success", data: ... }` or `{ status: "error", message: ... }`.

## Existing implementation conventions

- Preserve the current MVC split: route modules, controllers, Sequelize models, validation schemas, middleware, and shared utilities.
- Use `requireAuthentication`, `requireRole`, and `validateRequest` for protected API work. Role checks do not replace object-level access checks; reuse `canAccessClient` and conversation-participant checks where applicable.
- Keep authorization and business rules on the server. Preserve the existing response envelope and API contracts unless an approved phase requires a documented extension.
- Use database transactions for related writes. Do not rely on `sequelize.sync()` as a production schema migration strategy.
- Continue using the existing request schemas and structured error responses. Do not silently hide failed API calls or return fabricated success data.
- Frontend shared controls and state helpers live in `Frontend/src/components/ui.jsx`; API wrappers live in `Frontend/src/api.js`.
- Public lead and analytics endpoints are under `/api/public`; owner-only lead management (including active-course assignment and enrollment) is under `/api/leads`; owner website analytics is under `/api/analytics/summary`.
- Trial conversion links a pre-existing client/member account only. The public website has no branch, schedule, or gym-contact configuration to support invented details.

## Design conventions

- The active application stylesheet is `Frontend/src/styles.css`, loaded by `Frontend/src/main.jsx`. It defines the current dark FitConsole palette and CSS variables, using Barlow Condensed, DM Sans, and DM Mono.
- `Frontend/src/assests/theme.css` and `Frontend/src/assests/Icons.jsx` exist. The theme stylesheet is not currently imported by the application, and its tokens differ from `styles.css`; inspect and reconcile the existing tokens before adopting or duplicating them.
- Preserve the FitConsole “Fight Night” visual identity, use shared CSS variables for tokens, and keep status information understandable without relying on color alone.
- Use the supplied ZIP screenshots as design references, not as permission to copy third-party logos, photographs, or other copyrighted assets.
- Keep layouts responsive to 360px and provide explicit loading, empty, success, and error states for data-driven screens.

## Security and privacy

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
cd Backend && npm test
cd Backend && npm run migrate
cd Frontend && npm run build
```

Development commands are `npm run dev` in each package. The backend requires PostgreSQL and configured values from `Backend/.env`; `Backend/.env.example` lists the expected settings. Password reset additionally needs a verified Resend sender and HTTPS frontend URL in production. The frontend uses `Frontend/.env.example` for public Vite configuration. There is no frontend test or lint script in the inspected package manifest.

## Phase workflow

1. Audit actual implementations, route authorization, data relationships, and supplied references before making application changes.
2. Implement only the currently approved phase, using migrations for schema changes and tests for changed behavior.
3. Preserve existing behavior and contracts; add focused tests for new validation, permissions, and transactional flows.
4. Run relevant backend tests and the frontend production build. Report actual commands, results, blockers, and remaining work.
5. Summarize changed files, migrations, endpoints, and manual setup, then stop for review before beginning the next phase.
6. Before any commit or push, inspect the diff and staged files, keep private/generated artifacts out, and wait for approval before pushing.
