# FitConsole project overview

FitConsole is a web application for gym owners, trainers, and clients. The owner workspace manages clients, trainers, courses, course pricing, memberships, payments, attendance, dashboard metrics, and spreadsheet exports. Trainer and client workspaces provide the corresponding roster, check-in, diet-plan, membership, profile, and messaging workflows.

## Implemented workflows

- **Accounts and access:** Client registration and login, JWT-protected APIs, role checks, and owner-configured trainer accounts.
- **Courses and memberships:** Owners manage courses, trainer assignments, and 1-, 3-, 6-, and 12-month prices. Clients can choose a published offer and begin membership checkout.
- **Payments:** Owners can record manual payments. Cashfree orders are created by the backend, verified through the provider's payment-fetch API, and recorded after a successful result.
- **Attendance and progress:** Owner/trainer check-ins, client attendance history, and client diet/progress entries.
- **Diet plans:** Gemini can draft a plan when configured. Trainers can review and approve drafts before clients see them.
- **Waivers and communication:** Clients can accept the configured waiver; users can message within conversations they participate in.
- **Reporting:** Owner and trainer dashboards expose API-backed metrics; owners can export supported data to XLSX.

## Architecture

- **Frontend:** React and Vite role-based web application.
- **Backend:** Node.js and Express API with Joi validation and JWT/Argon2 authentication.
- **Database:** PostgreSQL through Sequelize.
- **Optional integrations:** Cashfree Payments, Google Gemini, and ExcelJS.

See the root [README](./README.md) for setup, environment variables, API route groups, tests, and operational notes.

## Scope and limitations

- The Cashfree return flow fetches and verifies order payments on the server. Payment webhooks are not implemented.
- File upload and secure document storage are not implemented; ID-proof and document fields store references only.
- Waiver acceptance records the configured version and acceptance time, not an immutable snapshot or hash of the exact text. Configure reviewed, non-empty waiver wording before use.
- Payment reminders are follow-up records, not automatically delivered notifications; messaging is refreshed on demand.
- AI diet-plan generation requires a configured Gemini API key and trainer review.
- Backend startup synchronizes models and applies a payment-schema compatibility alteration. No migration workflow is provided, and `npm start` currently runs `nodemon`; production deployment needs a deliberate process and schema-migration strategy.
- Backend tests cover selected helpers/configuration/validation but not comprehensive HTTP, database, authorization, or payment-provider integration. The frontend has no test or lint script.
- Public trainer routes include phone fields; review that disclosure before deployment. Login/register throttling is not implemented, and browser bearer tokens use `localStorage`.
