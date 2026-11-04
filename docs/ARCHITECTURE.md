# Architecture

A Next.js 16 (App Router) application on Vercel, with PostgreSQL (Neon) through Prisma, Cloudflare R2 for files and
Auth.js for sign-in. One deployable serves the public site, the student area, the teacher and admin consoles, and a
REST API for the mobile app.

## Layering

```
app/ (routes, server actions)  ->  services/ (business rules, data access)  ->  utils/prisma.ts  ->  PostgreSQL
components/ (UI)                    utils/ (helpers, validators, HTML builders)
config/ (brand, assets, constants)
```

- **`app/`** holds routes only. A page loads data from a service and renders components; a `route.ts` or server action
  validates input, authorizes, calls a service and shapes the response. Public pages are server components; client
  components appear only where interaction needs them.
- **`services/`** is where rules live: pricing and GST, enrolment status, payment approval and voiding, roll and
  registration numbers, notifications, e-mail, PDF generation. Services import Prisma; components and pages do not.
  A rule needed by both a web action and an API route lives in one service and is called from both.
- **`utils/`** has no business rules: Zod schemas (`validations.ts`), money and date helpers, pagination, the
  Prisma client, the R2 client, and the HTML builders for receipts, certificates and cards.
- **`config/`** is the white-label surface: `brand.ts`, `assets.ts`, `constants/`. Academy-specific strings belong here,
  not in components.
- **Server actions** are wrapped with `utils/action-utils.ts`: an `ActionError` carries a user-facing message back with
  the redirect, a database error becomes a flash code, and anything else is logged and reported as a generic failure so
  internals never reach a URL.

## Authentication and authorization

**Identity.** Auth.js v5 with JWT sessions (a week, refreshed hourly). Credentials sign-in (bcrypt) requires a verified
e-mail; Google sign-in is optional. The edge-safe configuration is `services/auth.config.ts` (no Prisma); the
database-backed callbacks are in `services/auth.ts`. `AUTH_SECRET` is required in production and has no fallback.

**Roles.** `USER` (student), `TEACHER`, `ADMIN`, `DEVELOPER`, carried in the session token. Addresses listed in
`ADMIN_EMAIL` become admins; the developer address comes from `DEVELOPER_EMAIL`. A teacher also needs a `Teacher`
profile linked to the user.

**Enforcement happens in three layers, and each one stands on its own:**

1. `middleware.ts` runs Auth.js's `authorized` decision for every matched request and enforces it: pages redirect to
   `/login?callbackUrl=...`, API paths receive 401. It also sets the per-request CSP nonce and, for `/api/v1`, the CORS
   allow-list (`API_ALLOWED_ORIGINS`) and the cross-site request guard.
2. Route-group layouts (`app/admin`, `app/teacher`, ...) call the matching guard.
3. Every protected page and server action calls an explicit guard from `services/auth-actions.ts` (`requireAdmin`,
   `requireTeacher`, `requireDeveloper`, `requireUser`). The guards are plain helpers, not a `"use server"` module,
   so they cannot be invoked as endpoints. `scripts/check-page-auth.sh` fails CI when a protected page lacks one.
   Teacher actions additionally check that the teacher is assigned to the course (`services/course-authorization.ts`).

**Mobile API (`/api/v1`).** Bearer tokens issued by `services/api-auth.ts`: a one-hour access JWT signed with its own
salt (a browser cookie cannot be replayed as a Bearer token) that carries a session id, and a rotating refresh token
whose hash is stored in `ApiRefreshToken`. Each request checks the session row, so logout is immediate. Native clients
send no `Origin` header and need no CORS entry.

**Other controls.** A nonce-based Content-Security-Policy (report-only until `CSP_ENFORCE=true`, built in
`services/security-headers.ts`); rate limiting (`services/rate-limit.ts`, Upstash Redis when configured, otherwise a
Postgres table, failing open if the backend is down); `sanitize-html` for rich text; HTML escaping in e-mail and PDF
templates; private files served through `/api/files` after an authorization check.

## Data

Prisma schema in `prisma/schema.prisma`, migrations in `prisma/migrations`. Money is stored as integer paise.
Payments are recorded as `PaymentRecord` rows; voiding sets `voidedAt` and writes an `AuditLog` entry rather than
deleting. Sequences that must never repeat (roll numbers, registration numbers, receipt and invoice numbers) are
allocated inside the transaction that stores them (`RegistrationSequence`, `DocumentSequence`).

The production database is live, so migrations are additive and guarded, and nothing destructive runs from a build or
a script without an explicit flag. The rules, the baseline and the rehearsal procedure are in `OPERATIONS.md`;
`npm run db:safety` and `npm run db:drift` enforce them in CI.

## Documents, files and messages

- **PDFs** (receipts, certificates, ID, attendance and grade cards) are built as HTML by `utils/*-html.ts` and rendered
  by Puppeteer in `services/pdf-generator.ts`. Their Tailwind stylesheet is compiled ahead of time by
  `npm run build:pdf-css` into `generated/pdf.css`; on Vercel the browser comes from `@sparticuz/chromium-min`
  (`CHROMIUM_PACK_URL`). Issued PDFs are stored in R2.
- **Files** go to Cloudflare R2 through `utils/s3.ts`. Public assets use `R2_PUBLIC_URL`; payment screenshots and
  course attachments use the private bucket.
- **E-mail** is sent with Nodemailer through `services/email/`; without SMTP settings it logs instead of sending.
  Slow work (e-mail, push notifications) runs after the response with Next.js `after()`.
- **Notifications** are created in `services/notifications.ts` (in-app, e-mail) and delivered to the mobile app through
  Firebase when `FIREBASE_SERVICE_ACCOUNT_JSON` is set (`services/push.ts`).

## Testing and delivery

Vitest runs four projects (`unit`, `integration`, `api`, `security`); the database-backed ones use a disposable
Postgres in `DATABASE_URL_TEST`. Playwright runs the end-to-end journeys against `next start` with the CSP enforced.
`.github/workflows/ci.yml` runs type-check, lint, drift and safety checks, the page-auth and `.env.example` checks and
all suites on every pull request, and the journeys on `dev` and `master`. Details: `TESTING.md`, `CONTRIBUTING.md`.
