# FitConsole

FitConsole is a full-stack gym management application for owners, trainers, and clients. It brings course and membership administration, attendance, payments, trainer-reviewed diet plans, and member communication into one web application.

The repository contains two independent JavaScript projects: an Express API and a React web client. They have separate dependency manifests and lockfiles; there is no root npm workspace or Docker setup.

## Features

- Role-based owner, trainer, and client accounts with JWT authentication.
- Client and trainer profiles, trainer assignment, configurable courses, and 1-, 3-, 6-, and 12-month course plans.
- Membership enrollment and renewal, manual payment records, and Cashfree checkout with server-side payment verification before recording a successful payment.
- Attendance check-ins and client attendance history.
- Client diet and progress tracking; optional Gemini-generated diet-plan drafts that trainers can review and approve.
- Waiver display and acceptance records, participant-limited messaging, owner/trainer dashboards, and owner XLSX exports.
- Owner, trainer, and client workspaces in the React application.

## Architecture and technology

| Area | Technologies |
| --- | --- |
| Frontend | React, Vite, Cashfree browser SDK |
| Backend | Node.js, Express, Joi, JWT, Argon2 |
| Persistence | PostgreSQL, Sequelize |
| Optional integrations | Cashfree Payments, Google Gemini, ExcelJS |

The API owns authorization, validation, membership pricing, payment order creation, and payment verification. The frontend does not receive Cashfree's server secret. Cashfree verification currently uses a return-to-app/status-fetch flow; a webhook integration is not implemented.

## Requirements

- Node.js 20 or newer and npm.
- PostgreSQL 14 or newer, running locally or reachable from the backend.

## Local setup

### 1. Create a PostgreSQL database

For example, connect to PostgreSQL as an administrator and create a dedicated local user and database:

```sql
CREATE USER fitconsole WITH PASSWORD 'replace_with_a_local_password';
CREATE DATABASE fitconsole OWNER fitconsole;
```

### 2. Configure and start the backend

```sh
cd Backend
npm ci
cp .env.example .env
```

Edit `Backend/.env` before starting. Set `DB_NAME`, `DB_USER`, and `DB_PASSWORD` for the database above; set `JWT_SECRET` to a private random value of at least 32 characters; and configure the owner plus all three trainer bootstrap accounts. Bootstrap passwords must be 12–128 characters. The example deliberately contains placeholders and is not ready to run unchanged.

The server defaults to port `9000` and CORS origin `http://localhost:5173`.

```sh
npm run dev
```

The API health endpoint is <http://localhost:9000/api/health>.

### 3. Configure and start the frontend

In another terminal:

```sh
cd Frontend
npm ci
cp .env.example .env
npm run dev
```

Open <http://localhost:5173>. `VITE_API_URL` should point to the backend API base URL, including `/api`; the local default is `http://localhost:9000/api`. Keep the frontend Cashfree mode aligned with the backend environment.

## Environment variables

`Backend/.env.example` lists the backend settings. Replace all `REPLACE_...` placeholders and keep the resulting `.env` file private.

| Variable | Purpose |
| --- | --- |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Required PostgreSQL database and credentials. |
| `DB_HOST`, `DB_PORT` | PostgreSQL address; defaults are `localhost` and `5432`. |
| `JWT_SECRET` | Required private signing secret, at least 32 characters. |
| `OWNER_EMAIL`, `OWNER_PASSWORD` | Required owner bootstrap account; `OWNER_NAME` is optional. |
| `TRAINER_1_*`, `TRAINER_2_*`, `TRAINER_3_*` | Required trainer bootstrap names, unique emails, and passwords. |
| `PORT`, `CORS_ORIGIN` | API port and allowed frontend origin; defaults are `9000` and `http://localhost:5173`. |
| `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` | Optional Cashfree credentials; the secret belongs only in the backend environment. |
| `CASHFREE_ENVIRONMENT`, `CASHFREE_RETURN_URL` | Cashfree mode (`sandbox` or `production`) and frontend return URL. |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional Gemini credentials/model for diet-plan generation. |
| `WAIVER_VERSION`, `WAIVER_TEXT` | Waiver version and text. Supply reviewed, non-empty text before collecting acceptance. |

The frontend template contains `VITE_API_URL` and `VITE_CASHFREE_MODE`. Only use public configuration in `VITE_` variables; frontend build variables are visible to browser users.

Owner and trainer bootstrap settings are reapplied when the backend starts, including their configured passwords. Protect these values and update them deliberately when rotating account credentials.

## API overview

All routes are prefixed with `/api`. Authenticate protected routes with `Authorization: Bearer YOUR_JWT_TOKEN`.

| Area | Representative routes |
| --- | --- |
| Authentication | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PATCH /auth/password` |
| Users | Owner: `POST /users/trainers`, `GET /users?role=...`, `PATCH /users/:id/status` |
| Clients | `GET/PATCH /clients/me`, owner: `GET/POST /clients`, `GET/PATCH /clients/:id`, `PATCH /clients/:id/trainer`, `PUT /clients/:id/id-proof` |
| Trainers | `GET /trainers`, `GET /trainers/:id`, `PATCH /trainers/me`, owner: `PATCH /trainers/:id`, `GET /trainers/me/clients` |
| Courses | `GET /courses`, `GET /courses/:id`; owner can create, update, delete, set prices, and assign trainers. |
| Memberships | Owner: `GET/POST /memberships`; client: `POST /memberships/checkout`; renew with `PATCH /memberships/:id/renew`, cancel with `PATCH /memberships/:id/cancel`; history at `/clients/:id/memberships`. |
| Payments | Owner: `GET/POST /payments`, `GET /payments/reminders`, `PATCH /payments/:id`; Cashfree order creation at `POST /payments/cashfree/orders` and verification at `GET /payments/cashfree/orders/:orderId`. |
| Waivers and attendance | `GET /waivers/current`, client `POST /waivers/accept`, owner/trainer check-in and attendance-list routes, and client attendance history. |
| Diet | Diet entries and summaries under `/clients/:id/diet-entries`; trainer plan generation and approval routes. |
| Messaging | `GET/POST /conversations` and `GET/POST /conversations/:id/messages`. |
| Dashboards and reports | `GET /dashboard/owner`, `GET /dashboard/trainer`, and owner XLSX exports. |

The backend validates request bodies, query parameters, and route IDs using Joi schemas. Public registration creates client accounts; owner and trainer accounts are provisioned from backend configuration. ID-proof and signed-document values are file references only; upload and secure file storage are not implemented.

For full request validation schemas and route definitions, see `Backend/src/validation/` and `Backend/src/routes/`.

## Tests and production build

Backend unit tests:

```sh
cd Backend
npm test
```

Frontend production build:

```sh
cd Frontend
npm run build
```

The frontend currently has no test or lint script. Backend tests cover selected helpers, configuration, and validation; they do not provide comprehensive HTTP, database, authorization, or payment-provider integration coverage.

## Current limitations and release considerations

- Backend startup synchronizes Sequelize models and applies a payment-schema compatibility alteration. There is no controlled migration workflow; do not treat this startup path as production-safe for schema changes.
- `npm start` currently runs the development watcher (`nodemon`). Use a production process command and migration strategy before deployment.
- The Vite development server binds to `0.0.0.0`; keep it on a trusted development network and do not use it as the production web server.
- Cashfree checkout is configured for sandbox by default. Production credentials and deployment settings require separate secure configuration and live-mode verification.
- Waiver acceptance records the configured version and acceptance time, but the application does not store a snapshot or hash of the exact displayed waiver text. Configure and review the waiver before use.
- Public trainer listing/detail routes currently include trainer phone fields; review whether that disclosure is intended for a deployment.
- Login/register throttling is not implemented. The browser stores bearer tokens in `localStorage`; consider an HttpOnly-cookie session and XSS protections for a production deployment.
- Payment reminders are records for follow-up, not automated notifications. Messaging refreshes on demand rather than using live delivery.
- Owner-only documentation visibility is enforced in the frontend UI; do not treat UI gating as server-side confidentiality.
- Diet generation requires a valid Gemini API key. User-uploaded files, automated waiver-document storage, webhook-based payment notifications, and route-level integration tests are not included.

## Repository layout

```text
Backend/
  src/
    config/           Bootstrap account configuration
    controllers/      API request handlers
    middleware/       Authentication, authorization, and validation
    models/           Sequelize models and associations
    routes/           Express route definitions
    services/         External service integrations
    validation/       Joi schemas
  test/               Node.js test-runner tests
Frontend/
  src/
    workspaces/       Owner, trainer, and client interfaces
    components/       Shared UI components
PROJECT_OVERVIEW.md   Current product scope and limitations
```

## Security

Never commit `.env` files, API keys, database credentials, tokens, private keys, database backups, private PDFs, or generated test artifacts. Use the reviewed `.env.example` templates as a starting point and rotate any credential that has been exposed.

The current backend dependency audit still reports three moderate findings associated with transitive `uuid@8.3.2` use by Sequelize and ExcelJS. The available `npm audit fix --force` recommendation downgrades those packages across major versions; that breaking change was not applied without compatibility verification.
