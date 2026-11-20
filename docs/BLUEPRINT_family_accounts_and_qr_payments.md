# Blueprint: Family accounts, teen logins, minor diet plans and UPI QR payments

Status: **proposal, not approved**. Nothing here is implemented yet.
Date: 2026-10-29 · Branch base: `audit-fixes` (`f71f485`)

## 1. Goals

1. A parent can manage one or more children from a single account and see each child's progress.
2. Children **12 and older** who have a phone can get their own login and can pay and use the app themselves. The parent stays linked and can see everything.
3. Children **under 12** have no login. The parent does everything for them.
4. Members, including minors, can get AI diet plans. **A minor's plan must be checked and approved by their assigned trainer** before anyone sees it.
5. Any payment can be made by **scanning a UPI QR code** that is created for that exact payment and confirmed automatically.

## 2. What exists today (facts from the code)

| Area | Current state | Impact |
|---|---|---|
| Users | `users.email` and `users.password_hash` are `NOT NULL`; roles are `owner`, `trainer`, `client` | A child without a login needs these to become nullable |
| Login | Email + password only (`/auth/login`) | Phone login is new work |
| Member profile | `clients` has one row per user (`user_id` unique), with `date_of_birth` and `phone` | Age can be worked out from `date_of_birth`; each child needs their own user and client row |
| Member data keys | Memberships, attendance and diet plans are keyed by the member's **user id** | Each child needs a user row, even without a login |
| Access | `canAccessClient`: owner = all, client = self, trainer = assigned clients | Must add: guardian = linked children |
| Diet plans | AI plan → `draft`; members only see `approved`; `diet_plan_reviews` records who reviewed it | The draft-then-approve flow already exists; minors need stricter rules |
| Diet targets | `services/dietTargets.js` uses adult formulas | Must not be used for under-18s |
| Waivers | `waiver_acceptances` per client, no "accepted by" field | Need to record the guardian who accepted |
| Payments | Cashfree checkout redirect (`payment_methods: "cc,dc,upi"`), orders expire after 20 min, webhook plus verify set the result | The QR can reuse the order, webhook and verify flow |

## 3. Age rules

`age` is worked out from `clients.date_of_birth` in gym time (IST) whenever it's needed, never stored.

| Group | Rule | Login | Pays | Waiver | Messages |
|---|---|---|---|---|---|
| Child | age < 12 | none | parent | parent | parent ↔ trainer only |
| Teen | 12 ≤ age < 18 | optional, by phone + password | teen or parent | **parent must accept** | teen ↔ trainer (parent can view) and parent ↔ trainer |
| Adult | age ≥ 18 | normal | self | self | as today |

- `MIN_SELF_LOGIN_AGE = 12` lives in one config constant so it's easy to change.
- A minor's profile **must** have a date of birth and at least one linked guardian.
- When a teen turns 18, they automatically become an adult member. The guardian link stays visible to the owner but stops giving the parent access. (Needs your confirmation, see §11.)

## 4. Data model (new migration after the baseline)

### 4.1 Changes to existing tables

```sql
-- Children without a login have no email or password.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN phone VARCHAR(10) UNIQUE;          -- normalized Indian mobile, login identifier
ALTER TABLE users ADD COLUMN login_enabled BOOLEAN NOT NULL DEFAULT TRUE;
-- A user with login enabled must have a password, plus an email or phone.
ALTER TABLE users ADD CONSTRAINT users_login_identity_check
  CHECK (NOT login_enabled OR (password_hash IS NOT NULL AND (email IS NOT NULL OR phone IS NOT NULL)));

ALTER TABLE waiver_acceptances ADD COLUMN accepted_by UUID REFERENCES users(id);  -- guardian or self

ALTER TABLE diet_plans ADD COLUMN for_minor BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE diet_plan_reviews ADD COLUMN checklist JSONB;        -- trainer's confirmations for minor plans
```

### 4.2 New tables

```sql
CREATE TABLE guardian_links (
  id UUID PRIMARY KEY,
  guardian_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  relationship VARCHAR(16) NOT NULL CHECK (relationship IN ('mother','father','guardian')),
  consent_at TIMESTAMPTZ NOT NULL,          -- DPDP verifiable parental consent
  consent_version VARCHAR(32) NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (guardian_user_id, child_client_id)
);

CREATE TABLE account_invites (               -- teen login setup
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(10) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,    -- store only the hash, like refresh/reset tokens
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`cashfree_orders` gets `channel VARCHAR(16) NOT NULL DEFAULT 'checkout'` (`checkout` | `upi_qr`) so reports and the daily job can tell QR orders apart.

## 5. Access control

`canAccessClient(user, clientId)` gets one new rule:

- **Client role:** allowed if `client.userId === user.id` **or** an active `guardian_links` row links `user.id` to `clientId`, and the child is under 18.

Checks every endpoint must make:
- A guardian can only act for **linked, active** children. Revoked links and other families' children return 404, the same as today.
- A login for a user with `login_enabled = false` always fails, with the same message as a wrong password.
- A teen cannot add or remove guardian links, or change the date of birth.
- Trainers see a child only if the child is assigned to them, as today. A trainer cannot see the parent's other children.
- The owner sees everything and can link or unlink guardians.

## 6. API

All under `/api`, using the existing `{ status, data }` response format, Joi schemas in `src/validation/`, and the shared auth/role/validation middleware.

### 6.1 Family

| Method & path | Who | Purpose |
|---|---|---|
| `GET /family/children` | client | List my linked children: profile summary, age group, membership status |
| `POST /family/children` | client | Create a child profile: name, DOB, gender, health notes, relationship, consent=true. Creates a user (no login), client and guardian link in **one transaction** |
| `PATCH /family/children/:clientId` | guardian | Update the child's profile (not DOB after the first membership starts) |
| `POST /family/children/:clientId/invite` | guardian (child must be 12+) | Send a login invite to the teen's phone; returns a link for WhatsApp or SMS |
| `POST /auth/invite/accept` | public (rate-limited) | The teen sets a password using the invite token; turns on login |
| `POST /owner/guardian-links` / `DELETE /owner/guardian-links/:id` | owner | Fix links manually (revoke sets `revoked_at`) |

Existing per-client endpoints (`/clients/:id/progress`, `/memberships`, `/payments`, `/attendance`, `/diet-plans`, `/waivers`) work for guardians automatically through the new `canAccessClient` rule.

### 6.2 Login by phone

- `POST /auth/login` accepts `{ identifier, password }`, where `identifier` is an email or a 10-digit mobile number. `{ email, password }` keeps working for backward compatibility.
- The same account lockout and rate limits apply to both.

### 6.3 Waiver for minors

- `POST /waivers/accept` gets an optional `clientId`. A guardian can accept for a linked child, and `accepted_by` = guardian.
- For a minor, the membership checks require a waiver accepted **by a guardian**. A waiver the teen accepted alone doesn't count.

### 6.4 Diet plans for minors

- Generating a plan for a client under 18 sets `for_minor = true` and uses the **minor prompt** (§8). Adult calorie targets are skipped.
- `POST /diet-plans/:id/approve` for a `for_minor` plan:
  - only the **assigned trainer** may approve (not the owner, not anyone automatically);
  - the body must contain a `checklist` with every item `true` (§8.2), otherwise 400;
  - the checklist is stored in `diet_plan_reviews`.
- Clients, teens and guardians see only `approved` plans, the same as today.

### 6.5 UPI QR payments

| Method & path | Who | Purpose |
|---|---|---|
| `POST /payments/upi-qr` | owner, client, guardian | Create a Cashfree order for a membership balance (body like the existing checkout order) and return `{ orderId, qr (image/data or UPI URL), amount, expiresAt }` |
| `GET /payments/cashfree/orders/:orderId` | same | **Existing** status check, reused for polling |
| `POST /payments/cashfree/webhook` | Cashfree | **Existing**, unchanged: the only thing that marks a payment as successful |

Rules:
- The amount always comes from the server (the membership balance), never from the browser.
- Only one open QR order per membership at a time. Requesting a new one fails the old one, using the same advisory lock pattern as checkout.
- The QR is valid for the order lifetime (20 minutes). After that the status is `failed`/expired and the UI offers "Generate new QR".
- **To check before building:** the exact Cashfree request for a UPI QR (Order Pay API with a `upi` QR channel, or the JS SDK QR component), and whether this Cashfree account has it enabled. Confirm in sandbox first.

## 7. Frontend

New and changed screens, following the current structure (`pages/<area>/`, `hooks/`, `services/api.js`, `components/ui/`):

| Screen | Path | Notes |
|---|---|---|
| Profile switcher | `layouts/AppShell.jsx` | "Me · Child A · Child B" in the top bar, only for guardians; switches the member being viewed |
| Family home | `pages/family/FamilyHome.jsx` | Card per child: age group, membership status, last visit, dues, "Pay" button |
| Add child | `pages/family/AddChildForm.jsx` | Name, DOB, gender, health notes, relationship, consent checkbox with the consent text |
| Invite teen | `pages/family/InviteTeen.jsx` | Shown only for children 12+; phone input; a WhatsApp share link |
| Accept invite | `pages/auth/AcceptInvite.jsx` | Public `/invite?token=`: set password, then sign in |
| Login | `pages/auth/AuthScreen.jsx` | Field label becomes "Email or mobile number" |
| Child views | existing `pages/client/*` | Reused, driven by the selected member id instead of always "me" |
| QR payment panel | `components/UpiQrPanel.jsx` | QR, amount, countdown, live status (Waiting → Paid ✓ / Expired), "Pay another way" link to the normal checkout |
| Owner front desk | `pages/owner/PaymentLedger.jsx`, `MembershipDesk.jsx` | "Show QR" button per membership balance |
| Owner roster | `pages/owner/ClientRoster.jsx` | Columns for age group and guardian name; filter "Minors" |
| Trainer review | `pages/trainer/TrainerPlanReview.jsx` | "MINOR – check carefully" banner; checklist; Approve disabled until all items are ticked |

Every new screen needs loading, empty, error and success states, must work at 360px wide, and must show status as text as well as color.

## 8. AI diet plans for minors

### 8.1 Generation
- No adult calorie-deficit or surplus formula for under-18s.
- The prompt says: growing child or teen; balanced, age-appropriate portions; **no weight-loss, fasting, restriction or supplements**; respect allergies and diet preference; Indian home foods.
- Validation keeps the existing JSON schema but adds age-band calorie limits from a reviewed reference table. The table values must be confirmed by a qualified person before release.
- Free-text from the parent or teen goes through the existing `sanitizeFreeText`.

### 8.2 Trainer checklist (all required to approve)
1. Portions are appropriate for the child's age.
2. Allergies and intolerances are checked against the profile.
3. No restrictive dieting, fasting or supplements.
4. Total calories are within the age-band range shown on screen.
5. I am the assigned trainer and have reviewed the full plan.

## 9. Privacy, safety and legal

- **DPDP Act (India):** everyone under 18 is a child. Record the parent's consent (`consent_at`, `consent_version`) before storing a child's data. No tracking, behavioral monitoring or targeted ads for children: children's sessions are excluded from website analytics.
- **Payments by teens:** a minor can't enter a binding contract under Indian law. The guardian is recorded as the consenting party on every minor's membership, and the receipt and invoice go to the guardian as well.
- **Messages:** the guardian can read every message between a teen and a trainer. Trainers cannot start a chat with an under-12 child.
- **Data minimization:** no email is required for children; the phone is stored only for teens who log in.
- **Logs:** never log a child's health notes or phone number.

## 10. Delivery phases

Each phase: migration plus tests, backend tests and frontend build, then a review stop, per the project workflow in `CLAUDE.md`.

| Phase | Scope | Depends on | Size |
|---|---|---|---|
| **1. UPI QR payments** | §6.5, `UpiQrPanel`, owner "Show QR", `cashfree_orders.channel` | Cashfree sandbox check | S–M |
| **2. Family accounts** | §4 (guardian links, nullable email/password, `login_enabled`), §5, family API, Family home, Add child, profile switcher, guardian waiver | — | L |
| **3. Teen logins** | `users.phone`, phone login, invites, Accept invite, age 12+ rules | Phase 2 | M |
| **4. Minor diet plans** | §8, `for_minor`, checklist approval, trainer UI | Phase 2 | M |
| **5. Owner and reporting polish** | roster columns and filters, receipts to the guardian, birthday turning 18, exports | 2–4 | S |

Phase 1 is independent of the others and can ship first.

## 11. Tests (minimum)

- **Access:** a guardian can see their own child, not another family's child (404); a revoked link loses access; a teen can't edit guardians or DOB; a trainer only sees assigned children; a user with login disabled can't log in.
- **Transactions:** a failure while creating a child leaves no partial user or client rows.
- **Invites:** single use, expire, rate-limited, token stored only as a hash.
- **Phone login:** works with email or phone; lockout shared across both.
- **Waivers:** a minor's membership is blocked until a guardian accepts.
- **Diet:** a minor plan never uses the adult formula; approval is refused without the full checklist or by a non-assigned trainer; clients never see drafts.
- **QR:** server-side amount; one open QR per membership; expiry; webhook before or after a status check; a payment that arrives twice is recorded once.

## 12. Decisions needed from you

1. Is the self-login age **12 and up** (12 included), or **13 and up**?
2. At 18: does the parent lose access automatically, or does the owner decide?
3. Can a teen pay without the parent being notified, or should the parent always get the receipt? (Recommended: always.)
4. Who checks the age-band calorie table for children: a nutritionist, or the gym's lead trainer?
5. QR: show the QR only inside the app, or also allow a printable QR at the counter that the owner generates per payment?
6. Can two parents both be linked to the same child, each with full access?
