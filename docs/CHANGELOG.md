# Changelog

## 2026-11-14

### Database
- All migrations are squashed into one baseline, `Backend/db/migrations/000_baseline.sql`, generated with `pg_dump --schema-only` from a database built by the old files. Its schema dump is identical to the old chain's (empty diff).
- Databases that already ran the old migrations (or the interim `202611140003_schema_baseline.sql`) record `000_baseline.sql` without running it. A partly migrated database stops with a message naming the first missing file.
- New tables and columns folded into the baseline: `gallery_items`; Cloudinary `url`/`public_id` on `user_avatars`; course cover fields on `courses`.

### Media (Cloudinary)
- Profile photos, gallery photos/videos, course covers and site assets are stored in Cloudinary under `fitconsole/` (`users/avatars/<role>/<userId>/`, `gallery/{images,videos}/`, `courses/<courseId>/`, `site/`).
- Owner Gallery manager (upload, caption, show/hide, reorder, delete) and a public gallery that shows the owner's selection.
- Course covers: upload/change/remove, four built-in default covers, alt text; shown on owner course cards and public program cards.

### Website
- New landing hero (Cloudinary background video), glass navbar with scroll progress and section highlighting, scroll reveals, programs marquee, "Pick your fight" program cards and a back-to-top button. All motion respects reduced-motion settings.
- Removed the "Sample details" demo notice from About, Contact and legal pages.

### Demo account
- "DEMO" pill in the top bar. Pressing Pay opens a modal with "Create my account" or "Maybe later" instead of an error.
- The demo account stays fully read-only on the server. The short-lived sandbox test-payment endpoint (`/api/demo-payments`, `CASHFREE_SANDBOX_*`) was removed.

### Fixes
- CSRF: the client refreshes its token once and retries when a request is rejected for a missing or stale token.
- Course prices must be above 0, and longer plans may not cost less than shorter ones (checked in the form and on the server).
- ₹ renders in every font (Noto Sans fallback for the rupee glyph).
- Profile photos from Cloudinary display across origins (`Cross-Origin-Resource-Policy`).

### Tooling
- `npm run audit:routes` calls every route as each role, with and without CSRF, on a throwaway database.
- The owner, trainer, client and docs workspaces load on demand; main bundle 557 kB → 352 kB.
- `/api/health` keeps its `{ status: "ok", service, database }` shape as the documented exception to the response envelope.
- `nodemon` moved to devDependencies; unused `assests/` files removed.
