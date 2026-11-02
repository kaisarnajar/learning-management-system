# LMS Code Review & Implementation Plan

**Project:** Darse Quran Academy LMS (`darse-quran-academy`, white-label academy platform)
**Review date:** 2026-11-02
**Branch / commit:** `master` @ `402ba9c`
**Scope:** Entire repository (600 tracked files, ~61k lines excluding `public/` and the lockfile): `app/`, `components/`, `services/`, `utils/`, `config/`, `content/`, `prisma/`, `types/`, root config, build scripts.
**Method:** Every source file was read. Findings are grouped by module, then consolidated into a single prioritised register. Each finding carries a severity, a **Confirmed** (observed in code) or **Potential** (depends on environment or runtime conditions not verifiable from source) status, file/line evidence, impact and a specific fix. Nothing in the repository was modified by this review.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Architecture & technology overview](#2-architecture--technology-overview)
3. [Module-wise review findings](#3-module-wise-review-findings)
   - 3.1 Authentication, sessions & RBAC
   - 3.2 Mobile REST API (`/api/v1`)
   - 3.3 Courses, enrollment & roll numbers
   - 3.4 Attendance & grades
   - 3.5 Course and site announcements
   - 3.6 Payments, fee waivers (coupons) & finance
   - 3.7 Bookstore & orders
   - 3.8 Documents (PDF), receipts, certificates & email
   - 3.9 Blog, fatwa, library, daily inspiration, reviews & contact
   - 3.10 Notifications & push
   - 3.11 Admin, teacher & student portals (UI layer)
   - 3.12 Infrastructure, build, database migrations, seeds & dependencies
4. [Cross-cutting assessments](#4-cross-cutting-assessments)
   - 4.1 Security
   - 4.2 Performance & scalability
   - 4.3 Database
   - 4.4 Code quality & maintainability
   - 4.5 Testing
5. [Missing or incomplete functionality](#5-missing-or-incomplete-functionality)
6. [Prioritised issue register](#6-prioritised-issue-register)
7. [Phase-wise implementation plan](#7-phase-wise-implementation-plan)
8. [Production-readiness checklist](#8-production-readiness-checklist)
9. [Appendices](#9-appendices)

---

## 1. Executive summary

The codebase is a feature-rich, reasonably well-organised Next.js 16 App Router application with a clear `app → services → prisma` layering, consistent server-action patterns, centralised Zod validation and a white-label configuration layer. Most admin and student mutations correctly check authentication and ownership, money is stored as integer paise, and uploads are keyed safely. The team has clearly invested in UX polish (pending states, toasts, pagination, PDF documents, email templates).

However, **the application is not production-ready in its current state.** The review found 8 Critical and 29 High issues. The most urgent are:

| # | Finding | Why it matters |
|---|---|---|
| 1 | `GET /api/dev/seed?secret=seed123` wipes and reseeds the **entire production database** (all users, payments, enrollments) with a hardcoded secret. | Unauthenticated, irreversible data destruction. |
| 2 | Mobile Google sign-in (`/api/v1/auth/google`) never checks the ID-token audience, issuer or `email_verified`. | Any Google ID token for a victim's email (minted by any attacker-controlled OAuth app) logs in as that user, including admin accounts. |
| 3 | Stored XSS: rich-text blog bodies and fatwa answers are saved as raw `contenteditable` HTML and rendered with `dangerouslySetInnerHTML`; JSON-LD is injected without `</script>` escaping. | A teacher (or anonymous fatwa asker) gets JavaScript execution in admin and public browsers; admin server actions are then callable from that session. |
| 4 | Server-rendered PDF HTML interpolates student-editable profile fields unescaped into Chromium; the ID-card generator fetches any URL / local path stored in `user.image` (settable without validation via the mobile API). | SSRF and local-file read from the PDF worker; the student can retrieve their own receipt PDF as an exfiltration channel. |
| 5 | The Prisma migration history is **not the source of truth**: 7 tables, 3 enums and 8 columns used by the running code exist only in `schema.prisma` and were pushed with `db push`. The build pipeline (`fix-migration-lock.ts`) stamps every migration as applied before `migrate deploy`, so migrations can never run in production. The staging build and demo seed wipe whichever database they point at. | A fresh deploy fails at runtime; schema changes have no reliable path to production; a misconfigured branch can erase production. |
| 6 | No rate limiting, no CSRF protection on cookie-authenticated `/api/v1` POST routes, no security headers (CSP, HSTS, frame-ancestors), hardcoded fallback JWT secret, forgot-password endpoint returns the reset link whenever SMTP is unconfigured. | Credential brute force, account takeover, clickjacking of the admin panel. |
| 7 | Financial integrity gaps: payment submissions are non-transactional with check-then-insert duplicate guards; list pages create `PaymentRecord` rows during render; refunds keep income records; admin "delete" actions hard-delete invoices, submissions and whole book orders; GST on receipts is computed as 18% of the gross while labelled "inclusive"; choosing "no coupon" silently applies the best coupon. | Wrong books, wrong receipts, unrecoverable deletions, students over-charged or coupons burned. |
| 8 | A teacher who owns one course can read, overwrite or delete grade cards of any other course (`gradeId` never scoped to `courseId`), and can write attendance/grade rows for enrollments in other courses. | Cross-course data tampering by a semi-trusted role. |
| 9 | Zero automated tests, no CI, no lint gate; 39 open npm advisories (4 critical, including the installed `next` and `next-auth` versions). | Regressions are undetectable; known RCE advisories unpatched. |

The remediation plan in Section 7 is sequenced so that **Phase 0 (≈1 week)** removes the destructive and takeover vectors, **Phase 1 (≈2–3 weeks)** fixes financial correctness and authorization gaps, and **Phases 2–4** address data model, performance, code quality and test coverage. Estimated total effort is 10–14 engineer-weeks; nothing requires a rewrite or new infrastructure beyond a rate-limit store and a CI runner.

---

## 2. Architecture & technology overview

### 2.1 Stack (verified from `package.json` and config)

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js **16.2.6** (App Router, Turbopack, React 19.2.4) | README says "Next.js 15" and "Radix UI" — both wrong; no `@radix-ui/*` dependency exists. |
| Auth | Auth.js v5 (`next-auth@5.0.0-beta.31`), JWT sessions, Prisma adapter, Credentials + Google providers | Roles derived from env (`ADMIN_EMAIL`, `DEVELOPER_EMAIL`) and `Teacher.email` match; no role column. |
| Database | PostgreSQL (Neon) via Prisma 6.19.3; 36 models, 844-line schema | Pooled + direct URLs. Migrations are out of sync with the schema (see 3.12). |
| Storage | Cloudflare R2 via `@aws-sdk/client-s3` | Public bucket; all uploads returned as public URLs. |
| Email | Nodemailer SMTP, hand-built HTML templates in `services/email/` | New transport per message. |
| PDF | Puppeteer (local) / `puppeteer-core` + `@sparticuz/chromium-min` (Vercel), HTML templates in `utils/*-html.ts`, Tailwind Play CDN at render time | Chromium pack downloaded from GitHub at cold start. |
| Validation | Zod 4 (`utils/validations.ts`, 435 lines) | Applied consistently on web server actions; largely absent on `/api/v1`. |
| Styling | Tailwind CSS v4, Lucide icons | `components/ui/*` primitives mostly unused. |
| Mobile | REST API under `app/api/v1/**` for an Android app (JWT bearer, FCM device tokens stored) | Push sending not implemented. |
| Hosting | Vercel (`vercel.json` → `npm run vercel-build`) | Custom migration "repair" script runs in the build. |
| Tooling | ESLint (next core-web-vitals + TS), knip, tsx | **No test runner, no CI, no git hooks, no Dockerfile.** |

### 2.2 Code organisation

```
app/                     Route handlers, pages, layouts, server actions (co-located actions.ts)
  (public)/, courses/, blog/, fatwa/, library/, bookstore/, about/ …   public site
  admin/**               admin portal (layout-protected)         ~50 pages, 20 actions.ts
  teacher/(portal)/**    teacher portal (layout-protected)       + app/teacher/courses/** OUTSIDE the group
  profile/**             student portal (layout-protected)
  developer/**           developer role (redirects to /admin)
  actions/*.ts           shared server actions (payments, checkout, grades, attendance, documents)
  api/auth/*, api/v1/**, api/{certificate,receipt,id-card,grade-card,attendance-card}, api/dev/seed, api/admin/finance/export
components/              UI: admin/, teacher/, profile/, payment/, bookstore/, shared/, site/, home/, ui/
services/                Business logic & data access (≈90 modules, Prisma calls inline)
utils/                   Prisma client, validation schemas, pagination, text search, PDF HTML templates, S3 client
config/                  Brand, assets, credits, constants (payments/file/business/policies)
content/                 Static seed content incl. demo passwords
prisma/                  schema.prisma, 7 migrations, seed-* scripts, fix-migration-lock.ts
```

### 2.3 Request flow and trust boundaries

- **Web**: Server Components fetch via `services/*`; mutations are Server Actions (`"use server"`) that call `requireAdmin/requireTeacher/requireUser` (`services/auth-actions.ts`) then Prisma. Route protection for pages is implemented in **layouts** (`app/admin/layout.tsx`, `app/teacher/(portal)/layout.tsx`, `app/profile/layout.tsx`); `middleware.ts` only adds CORS to `/api/v1` and does **not** run Auth.js, so the `authorized()` callback in `services/auth.config.ts` is dead code.
- **Mobile**: `/api/v1/auth/{login,register,google}` mint a JWT with `next-auth/jwt.encode` using the **same secret and cookie salt** as the web session; `services/api-auth.ts` accepts either a Bearer token or the web session cookie. Role is re-resolved per request from email.
- **Documents**: Admin actions set `receiptGeneratedAt`/`certificateGeneratedAt`; route handlers render HTML → Chromium → PDF on every download; emails attach freshly generated PDFs.
- **Background work**: `services/notifications.ts` uses `after()` for email fan-out; several other actions `await` SMTP inline.

### 2.4 Strengths worth preserving

- Clean separation of UI vs. services; co-located `actions.ts` per admin module.
- Every server action checks auth first; `returnTo` redirects are validated against `/admin` in all but one action.
- Money handled in integer paise with `Math.round` conversions; totals recomputed server-side; `priceAtPurchaseInrPaise` snapshotted.
- Password reset tokens hashed at rest, single-use, 1-hour TTL; bcrypt cost 12.
- Public listings exclude drafts; student pages bind data to `(userId, courseId)`; per-student announcements isolated.
- Upload keys generated server-side from allow-listed MIME → extension maps; delete paths prefix-checked.
- Pagination clamped and search capped at 100 chars everywhere.

---

## 3. Module-wise review findings

Severity scale: **Critical** = unauthenticated or trivially exploitable data loss / takeover; **High** = privilege escalation, financial incorrectness, data corruption or exposure reachable by an authenticated low-privilege user; **Medium** = correctness/robustness defect, admin-only risk, or exploitable only under specific config; **Low** = quality, UX, hygiene.

### 3.1 Authentication, sessions & RBAC

Files: `services/auth.ts`, `auth.config.ts`, `auth-actions.ts`, `auth-redirect.ts`, `api-auth.ts`, `teacher-auth.ts`, `admin.ts`, `developer.ts`, `tokens.ts`, `password-reset.ts`, `registration.ts`; `app/api/auth/**`; `app/{login,register,forgot-password,reset-password,verify-email,auth/continue}`; `components/auth/*`; `middleware.ts`.

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| AUTH-1 | **Critical** | Confirmed | `app/api/dev/seed/route.ts:12-14` — `isAllowed = ALLOW_DEMO_SEED==="true" \|\| secret === "seed123" \|\| VERCEL_GIT_COMMIT_REF==="dev"`; handler calls `runSeedDemo`, whose `clearDatabase()` (`prisma/seed-demo.ts:71-112`) runs `deleteMany()` on all 36 models including `user` and `paymentRecord`. | Anyone can erase production with one GET. | Delete the route. Seeding must be a CLI-only operation gated on an explicit DB-host allowlist. |
| AUTH-2 | **Critical** | Confirmed | `app/api/v1/auth/google/route.ts:20-30` verifies via `oauth2.googleapis.com/tokeninfo` but never checks `aud === AUTH_GOOGLE_ID`, `iss`, or `email_verified`; then finds/creates the user by email and issues an API token with the resolved role (admin if email ∈ `ADMIN_EMAIL`). | Any Google ID token issued to *any* OAuth client for the victim's address authenticates as the victim. Attacker builds a trivial "Sign in with Google" app, gets the victim to sign in once, replays the token here. Admin takeover. | Verify with `google-auth-library` `verifyIdToken({ audience: AUTH_GOOGLE_ID })`, require `email_verified === true`, reject tokens older than a few minutes. |
| AUTH-3 | **High** | Confirmed | `services/api-auth.ts:6` — `AUTH_SECRET \|\| NEXTAUTH_SECRET \|\| "default_development_secret_key_darse_quran"`. | If the env var is ever missing, every API token is forgeable with a public string. | Throw at module load when the secret is absent. |
| AUTH-4 | **High** | Confirmed (conditional) | `app/api/auth/forgot-password/route.ts:29-37,54` returns `debugLink` (the full reset URL) whenever `NODE_ENV==="development" \|\| !isEmailConfigured`; `components/auth/ForgotPasswordForm.tsx:69-75` renders it as a link. `services/email/core.ts` returns `{skipped:true}` on unconfigured SMTP so the flow succeeds. | In production with any SMTP var missing, anyone obtains a reset link for any account including `ADMIN_EMAIL`. | Only emit `debugLink` when `NODE_ENV !== "production"`; fail closed in production when SMTP is unconfigured. |
| AUTH-5 | **High** | Confirmed | `middleware.ts:12-24` sets `Access-Control-Allow-Origin: *`; `services/api-auth.ts:70-74` falls back to the **web session cookie** (`getToken`); route handlers have no Origin/CSRF check; `/api/v1/payments/submit` and `/api/v1/bookstore/orders` accept `multipart/form-data`, others call `request.json()` without content-type enforcement. | Cross-site form POST with the victim's cookies can submit payments, enroll, create waiver requests, overwrite the cart, register device tokens, post reviews (text/plain JSON trick or multipart form). | Do not accept session cookies on `/api/v1` (Bearer only), or enforce `Origin`/`Sec-Fetch-Site` checks and a CSRF token; restrict CORS to known origins. |
| AUTH-6 | **High** | Confirmed | No rate limiting anywhere (`grep -ri ratelimit` → none). Affected: Credentials `authorize()` (`services/auth.ts:34-51`), `/api/v1/auth/login`, `/api/auth/register`, `/api/v1/auth/register`, `/api/auth/forgot-password`, `/api/auth/resend-verification`, public fatwa/contact forms. | Credential stuffing, account enumeration, email bombing, SMTP reputation damage. | IP+identifier token bucket (Upstash Ratelimit / Vercel KV) on all auth routes and public forms; lockout after N failures. |
| AUTH-7 | **High** | Potential | `services/auth.config.ts:18` `allowDangerousEmailAccountLinking: true`; `authorize()` never checks `emailVerified`; jwt callback (`services/auth.ts:60-76`) auto-verifies on OAuth sign-in. | Pre-account takeover: attacker registers victim's email with a password; victim later signs in with Google → linked to attacker's row, marked verified; attacker retains password access (profile PII, payments). Teacher emails yield teacher access. | Set linking to `false`, or in a `signIn` callback refuse/null-out the password when an unverified credentials user exists for the Google email. Require `emailVerified` for credentials login. |
| AUTH-8 | **High** | Confirmed | 48 of ~70 admin pages, `app/teacher/(portal)/blogs/new/page.tsx`, `app/profile/cart/checkout/page.tsx` have **no auth call of their own**; they rely solely on the enclosing layout (`app/admin/layout.tsx:14`). Full table in Appendix A. `middleware.ts` does not run Auth.js. | Next.js layouts do not re-render on soft navigation and RSC requests can target the page segment alone; layout-only auth is an officially discouraged pattern. Read-only PII (students, payments, inquiries) is the exposure; all mutations re-check. | Add `await requireAdmin()` (etc.) as the first statement of every page or inside the data loaders; additionally wire Auth.js into `middleware.ts` so `authorized()` is live. |
| AUTH-9 | **High** | Confirmed | `services/auth.ts:80` `if ((user \|\| !token.role) && token.email)` — role resolved once and cached in the JWT (default 30-day lifetime). | Removing an email from `ADMIN_EMAIL` or deleting a Teacher row does not revoke the web session until re-login (`requireTeacher` re-queries, but `requireAdmin` trusts the token). | Re-resolve role on every `jwt` callback (cheap: env check + one indexed query) or short-lived sessions with refresh. |
| AUTH-10 | Medium | Confirmed | `app/auth/continue/page.tsx:15`, `services/auth-redirect.ts:8,30`, `components/auth/LoginForm.tsx:67-70`, `RegisterForm.tsx:96` — safety check is `callbackUrl.startsWith("/")`. | `//evil.com` and `/\evil.com` pass → open redirect after a successful login (phishing). | Shared `isSafeInternalPath()` rejecting `//` and `/\`, or compare `new URL(p, origin).origin`. |
| AUTH-11 | Medium | Confirmed | `services/api-auth.ts:7,22-30` — API tokens encoded with the session-cookie salt; `getToken` fallback. No refresh, no revocation list, 30-day default. | A leaked mobile bearer token is a valid web session cookie value and vice versa; cannot be revoked. | Separate salt/issuer for API tokens, short access + refresh tokens, store token ids for revocation. |
| AUTH-12 | Medium | Confirmed | `services/auth-actions.ts` is `"use server"`; `requireAdmin/requireTeacher/requireUser/requireDeveloper` are therefore exported as public server-action endpoints. | Auth helpers callable as POST endpoints (low direct risk, wrong abstraction). | Move helpers to a plain module; keep `"use server"` only on files that export actions. |
| AUTH-13 | Medium | Confirmed | `app/api/auth/register/route.ts:12-18` — no server-side email format validation, no name/password max; `/api/v1/auth/register` same. Distinct "already exists" message. | Garbage emails stored; verification mail sent to arbitrary strings; enumeration. | Zod: `email().max(254)`, `name.max(100)`, `password.min(8).max(128)`. |
| AUTH-14 | Medium | Confirmed | `services/auth.ts:80-86` — `emailVerified` copied into the JWT only at sign-in. | After `/verify-email` succeeds, the banner persists and payments/enrollment stay blocked (403) until re-login. | Refresh `emailVerified` in the jwt callback when null, or `useSession().update()` after verification. |
| AUTH-15 | Medium | Confirmed | `services/auth.config.ts:9-10` — comment says "Used by proxy.ts", `authorized()` callback defined; no `proxy.ts` exists and middleware never calls `auth`. | Misleading dead code; false sense of route protection. | Remove or wire into middleware (see AUTH-8). |
| AUTH-16 | Low | Confirmed | `services/registration.ts:8-33` — `findFirst` max + 1, no transaction; `registrationNumber @unique`; assigned only in `app/profile/actions.ts:106-109`. | Concurrent profile completions → P2002 → "Database operation failed", profile not saved. | Counter table or serializable transaction with P2002 retry. |
| AUTH-17 | Low | Confirmed | `app/verify-email/page.tsx:36-48` — DB writes on GET; `VerificationToken.token` stored plaintext (reset tokens are hashed). | Mail scanners consume the link (benign outcome); DB read exposes live tokens. | Hash at rest; confirm via POST/button. |
| AUTH-18 | Low | Confirmed | `app/api/auth/forgot-password/route.ts:41-50` — 500 only for existing accounts when SMTP fails. | Account enumeration. | Always return the generic 200. |
| AUTH-19 | Low | Confirmed | `app/api/auth/register/route.ts:53-54`, `resend-verification/route.ts:28-29` build links from `new URL(request.url).origin` with `trustHost: true`. | Host-header poisoning of verification links behind a proxy. | Use `getAppBaseUrl()`. |
| AUTH-20 | Low | Confirmed | `app/admin/students/actions.ts:31` protects only `isAdminEmail` on delete; update has no protection. | An ADMIN can delete the DEVELOPER account or edit role-bearing profiles. | Also check `isDeveloperEmail`; refuse edits to role-bearing accounts. |

**Verified correct:** reset-token lifecycle; verification single-use + expiry; bcrypt 12; email immutable via profile; every exported server action checks auth; `returnTo` guarded in all actions except `deleteManualPaymentRecord` (PAY-9).

### 3.2 Mobile REST API (`/api/v1`)

Files: `app/api/v1/**/route.ts`, `services/api-auth.ts`, `middleware.ts`.

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| API-1 | **High** | Confirmed | `app/api/v1/courses/[id]/route.ts:658-663` returns all course-wide `CourseAnnouncement` rows (title, body, `attachmentPath`) to **unauthenticated** callers. Web requires a non-pending enrollment (`services/student-announcements.ts:9-11`). | Exam schedules, study material links and attachments for paid courses leak publicly. | Require auth + active enrollment before including announcements. |
| API-2 | **High** | Confirmed | `app/api/v1/auth/me/route.ts:58-75` (PUT) — no schema; `image`, `occupation`, `gender`, `whatsapp`, `address` written as received. | Arbitrary `image` string feeds the ID-card SSRF/path traversal (DOC-2); invalid enum → Prisma 500; multi-MB strings stored. | Reuse `profileUpdateSchema`; validate `image` as an R2/Google URL only. |
| API-3 | Medium | Confirmed | `/api/v1/reviews` POST (no validation), `/api/v1/fatwa` POST (unauthenticated, unbounded, no rate limit), `/api/v1/waiver-requests` POST (`courseId` unvalidated → FK error 500, `reason` unbounded). | Spam, 500s, DB bloat. | Reuse `studentReviewSchema`, `fatwaQuestionSchema`; validate course exists. |
| API-4 | Medium | Confirmed | All list routes: `pageSize = parseInt(searchParams.get("pageSize") \|\| "20")` unclamped; `parseInt("abc")` → NaN → `clampPage(NaN)` → Prisma validation error. | `?pageSize=1000000` DoS; NaN → 500. | Clamp to `[1, 50]`, default on NaN. |
| API-5 | Medium | Confirmed | `/api/v1/payments/submit` passes raw strings to `processMonthlyPayment` (month/year not validated by `monthlyPaymentSubmitSchema` as on web; `paymentMethod` free text). | Inconsistent validation between channels; label built from arbitrary month. | Share the Zod schemas with the web actions. |
| API-6 | Medium | Confirmed | `/api/v1/payments/submit` and web forms pass `couponId=null` when none chosen → `getSelectedCoupon` auto-applies the best coupon (see FIN-1). | Unintended discount + coupon burn. | Never auto-apply; require explicit coupon id. |
| API-7 | Low | Confirmed | `/api/v1/notifications/device-token` upsert reassigns an existing token to the calling user; `platform` free text; tokens never consumed (no FCM sender in repo). | Dead feature; token hijack of a known value. | Implement the sender or document as reserved; enum platform. |
| API-8 | Low | Confirmed | `/api/v1/enrollments` GET includes `user` on every row; `/api/v1/payments/history` returns raw submission rows; `/api/v1/bookstore/cart` builds the same projection twice. | Over-fetching, duplicated mapping. | DTO helpers. |

### 3.3 Courses, enrollment & roll numbers

Files: `services/courses.ts`, `course-status.ts`, `enrollments.ts`, `enrollment-status.ts`, `roll-numbers.ts`, `completion.ts`, `course-pricing.ts`, `fee-frequency.ts`, `student-admin.ts`, `teacher-admin.ts`, `teacher-portal.ts`; `app/admin/{courses,enrollments,students,teachers}/**`; `app/actions/checkout.ts`.

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| CRS-1 | **High** | Confirmed | `app/admin/students/actions.ts:42` `prisma.user.delete`; schema cascades `PaymentRecord` (:503), `CoursePaymentSubmission` (:569), `Enrollment` (:434, carries `certificateNumber`), `BookOrder` (:645). Only guard: `isAdminEmail`. Teachers appear in the Students list (`services/students.ts:40-45`) and are deletable. | One click destroys a student's invoices, payment history, certificates and book orders; deleting a teacher's login leaves an orphan `Teacher` row. | Block deletion when financial/academic rows exist; soft-delete/anonymise instead; exclude teacher emails from the student list. |
| CRS-2 | Medium | Confirmed | `services/teacher-portal.ts:75` roster uses `getEnrollmentsForCoursePaginated` (all statuses); `:87-104` returns `fatherName, dateOfBirth, address, whatsapp` for any enrollment incl. `pending_approval`. Teacher can "Message" an applicant → email link that `student-announcements.ts:11` denies. | Unapproved applicants' PII exposed to teachers; dead links; dashboard counts inflated. | Filter `status in ("active","completed")` in all teacher-portal queries. |
| CRS-3 | Medium | Confirmed | `app/admin/courses/actions.ts:165-169` — `enrollment.deleteMany` then `course.delete` outside a transaction; R2 attachments never deleted; `CoursePaymentSubmission.courseId` has no FK → pending submissions remain in admin queues with dangling ids. | Orphans, lost attachments, half-applied deletes. | `$transaction`, delete objects first, refuse while pending submissions exist, add FK (INF-5). |
| CRS-4 | Medium | Confirmed | `app/admin/teachers/actions.ts:121-138` deletes with no guard; `Course.teacherId SetNull`, `Expense.teacherId SetNull`, `CourseAnnouncement.teacherId SetNull`. | Courses silently become "Instructor to be announced"; salary expenses lose attribution; announcements become uneditable. | Block when courses assigned; require reassignment. |
| CRS-5 | Medium | Confirmed | `utils/validations.ts:424-434` `adminStudentSchema` far weaker than `profileUpdateSchema`; `app/admin/students/actions.ts:103-107` unchecked `as Occupation`/`as Gender`, `new Date()` of unvalidated string; `:84-96` update proceeds even when `getStudentUserById` returns null (admin accounts); FEMALE edit silently deletes the uploaded photo. | Prisma errors, admin profile editable via crafted call, surprising data loss. | Reuse the strong schema with `z.nativeEnum`; bail on null; confirm the photo side effect. |
| CRS-6 | Medium | Confirmed | `app/admin/courses/actions.ts:130` runs `syncEnrollmentsWithCourseStatus` on **every** save; `services/completion.ts:21-24` flips `completed` → `active` and nulls `completedAt` when a COMPLETED course is edited to any other status, while certificates remain. | Accidental un-completion of a whole cohort. | Run only on status change; guard COMPLETED→other when certificates exist. |
| CRS-7 | Medium | Confirmed | `services/roll-numbers.ts:21-45` — interactive transaction with `aggregate max + 1` (no row lock); `@@unique([courseId, rollNumber])`. | Concurrent approvals → unique violation → one approval fails after notification was sent. | `SELECT … FOR UPDATE` on the course row or a per-course counter; retry on P2002. |
| CRS-8 | Medium | Confirmed | `app/admin/enrollments/actions.ts:1531-1537` — `notifyEnrollmentRejected` (email) **before** `enrollment.delete`; rejection hard-deletes. | Email sent even if delete fails; no history of rejected requests. | Status `rejected` instead of delete; notify after commit. |
| CRS-9 | Low | Confirmed | `utils/slug.ts:20-23` check-then-insert; `app/admin/courses/actions.ts:82-89`; `executeServerAction` (`utils/action-utils.ts:22-24`) puts raw `error.message` into `?saveError=`. | Rare P2002; Prisma text leaked in URLs. | Catch P2002 and retry; opaque error codes. |
| CRS-10 | Low | Confirmed | `app/admin/courses/actions.ts:66,104` `throw new Error("Invalid course data")` discarding Zod messages. | Unhelpful errors. | Surface `issues[0].message`. |
| CRS-11 | Low | Confirmed | `Course.startDate String` (schema:211), `SiteAnnouncement.eventDate String?` stored as "5 March 2026" (`utils/form-date.ts:111-115`); `Enrollment.status`, submission `status/paymentType/paymentMethod`, `certificateType` free strings (60 literal comparisons across 24 files). | No sorting/range queries; typo states invisible. | Enums + real date columns (INF-8, INF-12). |
| CRS-12 | Low | Confirmed | `content/courses.ts`/`content/teachers.ts` use numeric teacher ids and a "Qiraat" category absent from `COURSE_CATEGORIES`; `DEMO_TEACHER_PASSWORD="Teacher@2026"`. | Seed inconsistencies. | Align with constants. |

**Verified correct:** teacher course ownership enforced in portal layout and all announcement actions; public listings exclude DRAFT; featured-slot limits enforced server-side; admin roster shows active/completed only; `AdminCoursesTable` delete warning matches server guard.

### 3.4 Attendance & grades

Files: `services/attendance.ts`, `grades.ts`; `app/actions/attendance.ts`, `grades.ts`; `app/{admin,teacher}/courses/[id]/{attendance,grades}/**`; `components/attendance/*`, `components/grades/*`.

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| GRD-1 | **High** | Confirmed | `services/grades.ts:54-60` `findUnique({id: gradeId})`, `:90-94` `update({where:{id: gradeId}})`, `:146-156` `delete({where:{id: gradeId}})` — never scoped to `courseId`; callers in `app/actions/grades.ts` authorise on `courseId` only. Page `app/teacher/courses/[id]/grades/[gradeId]/edit/page.tsx:16` same. | A teacher owning course A reads, overwrites (title/date/maxMarks + marks) or deletes any grade card of course B by passing A's `courseId` with B's `gradeId`. | `findFirst/updateMany/deleteMany` with `{ id: gradeId, courseId }`; throw/404 on 0 rows. |
| GRD-2 | **High** | Confirmed | `services/grades.ts:102-119`, `services/attendance.ts:104-121` upsert `records[].enrollmentId` without verifying the enrollment belongs to `courseId`. | Teacher writes marks/attendance for enrollments of other courses. | Pre-load `enrollment.findMany({ where: { courseId, id: { in } } })` and reject unknown ids. |
| GRD-3 | Medium | Confirmed | `app/actions/grades.ts:57-68` no validation of `title`, `maxMarks`, `marksObtained` (negative, > max, NaN); `GradeForm.tsx:91-94` blank → `0`; `step="0.01"` but `CourseGrade.maxMarks Int` → Prisma error on decimals; `StudentGradeReport.tsx:41-46` sums floats raw. | Invalid or misleading grades; "absent" recorded as 0/N. | Zod in the action; nullable marks for "not graded"; `toFixed`. |
| GRD-4 | Medium | Confirmed | `app/teacher/courses/**` (9 pages) sit **outside** `(portal)`: no sidebar, course header, tab nav, `force-dynamic` or `noindex`; `TeacherCourseNav.tsx:16-17` links there. | Teachers land on bare pages with no way back; routes may be cached/indexed. | Move the folders under `app/teacher/(portal)/courses/[id]/` (URLs unchanged). |
| GRD-5 | Medium | Confirmed | Unowned course → actions `throw new Error("Forbidden")` (`app/actions/attendance.ts:39`, `grades.ts:39`) with no `notFound()` in those pages. | Next error boundary instead of 404. | Resolve `getTeacherCourseForPortal` first and `notFound()`. |
| GRD-6 | Low | Confirmed | `@db.Date` values formatted in the browser zone without `timeZone:"UTC"` (`AttendanceList.tsx:65`, `AttendanceView.tsx:36`, `StudentAttendanceReport.tsx:115`, `GradeList.tsx:52`, `StudentGradeReport.tsx:129`, profile attendance page:82, teacher edit page:45); default date = UTC today (`AttendanceForm.tsx:34-38`, `GradeForm.tsx:49-53`). | Off-by-one dates for users west of UTC; IST users 00:00–05:30 see yesterday. | `timeZone: "UTC"` for date-only values; local-part defaults. |
| GRD-7 | Low | Confirmed | Route `grades/student/[studentId]` receives an enrollment id (`app/admin/courses/[id]/grades/student/[studentId]/page.tsx:13`); attendance uses `[enrollmentId]`. | Naming confusion. | Rename param. |
| GRD-8 | Low | Confirmed | Admin vs teacher attendance/grade pages are 90–95% identical (9 pairs); `services/attendance.ts` ↔ `grades.ts` and the two actions files ~80%; card previews / API routes 95%+. | ~2,000 lines of near-duplicate code; fixes must be applied twice (GRD-1 is an example of drift risk). | Shared page bodies parameterised by `{ role, basePath }`; one `authorizeCourseManagement`. |

**Verified correct:** attendance save is upsert-based and idempotent; UTC-midnight normalisation consistent; `@@unique([courseId,date])`; student reads bound to own enrollment; admin card routes admin-only.

### 3.5 Course and site announcements

Files: `services/announcements.ts`, `course-announcement-actions.ts`, `course-announcement-mutations.ts`, `announcement-upload.ts`, `site-announcements.ts`, `site-announcement-mutations.ts`, `site-announcement-upload.ts`, `student-announcements.ts`; `app/admin/announcements/**`; `components/announcements/*`, `components/teacher/*`.

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| ANN-1 | **High** (functional) | Confirmed | No `deleteStudentCourseAnnouncement` action exists; `TeacherCourseAnnouncementCard.tsx:66-69` binds the course-wide `deleteCourseAnnouncement`, which looks up `getCourseAnnouncementRecord(id, courseId, null)` (`course-announcement-mutations.ts:164-172`) → never matches a private message → "could not be found". | Teachers cannot delete private messages to students; wrong redirect. | Add the action using `requireTeacherEnrollment` + `enrollmentId` scoping; bind it when `enrollmentId` is set. |
| ANN-2 | Medium | Confirmed | `app/admin/announcements/actions.ts:127,222` use `getSiteAnnouncementById`, which filters `published: true` (`site-announcements.ts:115-123`). | Admin cannot update or delete an unpublished site announcement (edit form loads, save fails with "notfound"). | Use `getSiteAnnouncementForAdmin`. |
| ANN-3 | Medium | Confirmed | `services/notifications.ts:375-377` `revalidatePath` per enrolled user + `Promise.all` upsert per user (`:218-230`). | N× revalidation and N concurrent upserts per announcement (site-wide = every user). | `createMany({skipDuplicates})` + single revalidate (NTF-1). |
| ANN-4 | Low-Medium | Confirmed | `services/announcement-upload.ts:68` returns public R2 URLs for private per-student attachments; MIME trusted from client (`:30`). | Forwarded links are unauthenticated; polyglot uploads. | Signed URLs via an authenticated route; sniff bytes. |
| ANN-5 | Low | Confirmed | `course-announcement-mutations.ts:109-128` row created then uploaded; `:83-89` old object deleted before new upload succeeds. | Rows without files; dangling `attachmentPath`. | Upload first, then write; delete old after success. |
| ANN-6 | Low | Confirmed | Three announcement card components and three create/update/delete action triplets are 70–85% duplicates. | Maintenance cost. | One card with an `actions` slot; `runAnnouncementMutation({authorize, scope, redirectBase})`. |

**Verified correct:** per-student announcements isolated by `enrollmentId`; teachers can only manage their own posts (`canTeacherManageCourseAnnouncement`); students with pending enrollment denied.

### 3.6 Payments, fee waivers (coupons) & finance

Files: `services/payments.ts`, `monthly-payments.ts`, `payment-submission.ts`, `payment-upload.ts`, `coupons.ts`, `waiver-finance.ts`, `finance-*.ts`, `payment-settings.ts`, `upi.ts`; `app/actions/{payments,waiver,receipts}.ts`; `app/admin/{payments,completed-payments,coupons,finance,record-payment,record-expense,transactions,payment-settings}/**`; `components/payment/*`, `components/admin/{Finance*,Coupon*,Payment*}`.

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| PAY-1 | **High** | Confirmed | `components/payment/MonthlyPaymentForm.tsx:102-104`, `EnrollmentPaymentForm.tsx:66-68` omit `couponId` when "none" is selected; `services/coupons.ts:116-126` only honours the literal `"none"`/`""` and otherwise `return selectableCoupons[0]`. | Student sees and pays the full fee; system records the discounted amount, calls `recordCouponUsage`, and deactivates a SPECIAL coupon. Money mismatch on every "no coupon" payment while a coupon is applicable. | Always send `couponId` ("none" explicitly); server treats `null/undefined` as no coupon; never auto-apply. |
| PAY-2 | **High** | Confirmed | `services/payments.ts:80-96` duplicate-label check, `:106` create; `:189-231` enrollment path: `recordCouponUsage` after the transaction; `:103-142` 100%-coupon path auto-approves submission and creates `PaymentRecord`; `:204-227` auto-activates the enrollment with no admin review. No unique constraint on `(userId, courseId, label, status)` or `upiTransactionId`. | Double submissions under concurrency; coupon burned even if later steps fail; 100% waivers bypass admin approval entirely. | Wrap in one `$transaction`; partial unique index on `upiTransactionId`; unique on `(userId, courseId, label)` for non-declined rows; require admin approval even for waivers (or make it an explicit setting). |
| PAY-3 | **High** | Confirmed | `services/monthly-payments.ts:484-512` `ensurePaymentRecordsForItems` **creates** `PaymentRecord` rows inside `getApprovedMonthlyPaymentsPaginated`/`getApprovedEnrollmentFeePaymentsPaginated` (read functions called during page render, `noStore()`). | Writes on GET; two admins loading the page concurrently create duplicate income records. | Move backfill to a one-off script; reads must be side-effect free. |
| PAY-4 | **High** | Confirmed | `app/actions/receipts.ts:71-72` `gstAmount = Math.round(itemTotal * 0.18); base = total − gst` while the receipt row reads "GST (18% inclusive)" (`utils/receipt-html.ts:131`). Values persisted in `receiptFeeAmountPaise/receiptGstAmountPaise`. | Every GST receipt overstates tax (₹18 instead of ₹15.25 on ₹100); lines do not reconcile; legal exposure. | `gst = round(total × 18 / 118)`; correct already-issued rows with a data fix; unit test. |
| PAY-5 | **High** | Confirmed | `app/admin/coupons/actions.ts:293-341` `deleteCouponRequest` deletes linked `PaymentRecord`s, `CoursePaymentSubmission`s, usages and the coupon; delete button shown for APPROVED requests (`AdminCouponRequestsTable.tsx:146-150`). | Income records and student payment history vanish with no audit trail. | Forbid deletion when linked rows exist; detach instead; never delete `PaymentRecord`. |
| PAY-6 | **High** | Confirmed | `app/admin/payments/actions.ts` `deleteApprovedPayment` (deletes `PaymentRecord` + submission), `deleteManualPaymentRecord`; `coupons/actions.ts:131-142` `deleteCoupon` (cascades usages, nulls `couponId` on submissions); `BookOrdersTable.tsx:207-213` "Delete payment" calls `deleteBookOrder` (whole order + items + record). No audit log anywhere. | Irreversible loss of financial history by routine admin clicks. | Void/soft-delete with reason + `AuditLog`; restrict hard delete. |
| PAY-7 | Medium | Confirmed | `app/actions/receipts.ts:40-87` — `if (receiptGeneratedAt) throw` then `update` (not atomic); invoice number `DQA-INV-` + 3 random bytes (16.7M space, non-sequential); P2002 on collision unhandled. Indian GST invoices require consecutive numbering. | Double generation under race; eventual collision; compliance. | Sequence per financial year (counter table) inside a transaction; `updateMany` guard. |
| PAY-8 | Medium | Confirmed | `app/admin/coupons/actions.ts:144-163` `approveCouponRequest` takes `percentage`/`validUntil` raw from the client (no Zod; 12.5 → Prisma Int error), code `WAIVER-${name?.slice(0,3)}-${4 random digits}` (null name → `WAIVER-undefined-1234`, collision → P2002 no retry); `rejectCouponRequest` (:239-253) has no status guard (APPROVED → REJECTED while coupon stays active; contradictory emails); `createDefaultCoupon` clamps a future `validFrom` to now silently, lacks `validFrom <= validUntil`, `percentage` not `.int()`; `updateCoupon` can edit a SPECIAL coupon's code/course/gender. | Broken coupons, wrong emails, admin confusion. | Zod schemas; `crypto.randomInt`; P2002 retry; status guard; type-specific editable fields. |
| PAY-9 | Medium | Confirmed | `app/admin/payments/actions.ts` `deleteManualPaymentRecord`: `redirect(returnTo ?? …)` unvalidated (every sibling uses `startsWith("/admin")`). | Admin open redirect. | Reuse `paymentReturnUrl`. |
| PAY-10 | Medium | Potential (TZ) | `services/finance-filters.ts:70-74` parses `from` as UTC midnight then `startOfDay` (server-local); re-serialised via `toISOString().slice(0,10)` in 6 places; presets use UTC month. `record-payment/actions.ts:64`, `record-expense/actions.ts:40` store UTC midnight. | On an IST host each filter round-trip shifts a day; "this month" boundaries wrong for 00:00–05:30 IST. | Serialise with local parts (`format(d,"yyyy-MM-dd")`); pin business timezone Asia/Kolkata. |
| PAY-11 | Medium | Confirmed | `app/admin/record-payment/actions.ts:42-48` validates via normalised email but queries `findUnique({ email: email.trim() })` un-normalised. | "Student not found" for mixed-case input. | Use the lookup's `userId`. |
| PAY-12 | Medium | Confirmed | `app/actions/waiver.ts:11-16` and API twin: `courseId` existence unchecked (FK error → unhandled 500), `reason` unbounded; fee type encoded as `[Fee Type: Enrollment Fee]` substring inside `reason` (parsed in `coupons/actions.ts:159-160`, `WaiverRequestsView.tsx:88-92`). | 500s; string protocol instead of a column. | Validate; add `feeType` column. |
| PAY-13 | Medium | Confirmed | Custom expense categories (`RecordExpenseForm.tsx:42,62`) accepted by `expenseSchema` but `parseFinanceFilters` only accepts the fixed enum. | Unfilterable expenses. | Enum or free-text filter. |
| PAY-14 | Low | Confirmed | `app/admin/coupons/page.tsx:49-63` all coupons + all requests unpaginated; `finance/page.tsx:43-63` 9 parallel queries incl. all students for a dropdown; `pay`/`enrollment-pay` pages call `getPaymentSettings()` twice; `payments/page.tsx`, `orders/page.tsx` run full paginated queries for inactive tabs for counts. | Latency growth with data. | Paginate; `count()`; memoise settings per request. |
| PAY-15 | Low | Confirmed | `services/waiver-finance.ts:74-81` loads **all** approved submissions then filters/paginates in JS. | O(n) per page view. | Filter `couponId != null OR paymentMethod = 'waiver'` in SQL. |
| PAY-16 | Low | Confirmed | `MonthlyPaymentForm.tsx:101` appends `paymentType` the schema ignores; `pay/page.tsx:4` unused import; `EditCouponDialog.tsx:19` `coupon: any`; `catch (error: any)` ×2; payment-method/UTR/screenshot form block copied 3×; tab pills 6×; `formatPrice` reimplemented 10×. | Quality. | Consolidate. |

**Verified correct:** paise conversions always `Math.round(x*100)`; client discount preview matches server; `to` date inclusive end-of-day; income totals exclude `book_purchase` (no double count with bookstore finance); every finance action calls `requireAdmin`; XLSX export writes strings as text (no formula injection); teacher-salary expenses verify the teacher.

### 3.7 Bookstore & orders

Files: `services/bookstore.ts`, `bookstore-upload.ts`, `finance-bookstore.ts`; `app/actions/bookstore.ts`; `app/api/v1/bookstore/**`; `app/admin/bookstore/**`, `app/admin/shipping-charges/**`; `app/bookstore/**`, `app/profile/cart/**`; `components/bookstore/*`, `components/admin/Book*`.

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| BKS-1 | **High** | Confirmed | `app/admin/bookstore/orders/actions.ts:164-192` `markBookOrderRefunded` only sets `status`; the `PaymentRecord` created at approval (`:70-78`) remains; `services/bookstore.ts:257` includes REFUNDED in "Book Order Payments" with receipt buttons; export lists REFUNDED/DECLINED with full totals. | Refunds still counted as income; receipts issuable for refunded orders. | Void the record (or offsetting entry) on refund; exclude REFUNDED from payment lists; show refunds separately. |
| BKS-2 | **High** | Confirmed | `orders/actions.ts:48-78` `approveBookOrder` reads status then `update` + `paymentRecord.create` unconditionally. | Double-approve (two admins / double click) → duplicate income records. | `updateMany({ where: { id, status: "PENDING_VERIFICATION" } })` inside the tx; abort on `count === 0`. |
| BKS-3 | **High** | Confirmed | No code compares `inventoryPurchased` to quantity sold — not at order (`app/actions/bookstore.ts`), approval, or ship; `finance-bookstore.ts:159,271` compute `purchased − sold` (can go negative); summary applies the date filter to orders but not books (`:49-110`). | Overselling; wrong "current inventory". | Enforce `available = purchased − sum(APPROVED/SHIPPED qty)` at order + approval (in tx); compute inventory without date filter. |
| BKS-4 | Medium | Confirmed | Shipping slab resolution copy-pasted in `app/profile/cart/checkout/page.tsx:88-110`, `app/actions/bookstore.ts:70-90`, `app/api/v1/bookstore/orders/route.ts:129-149`; weight between slabs → ₹0; `createShippingSlab` prevents overlaps but not gaps; `deleteShippingSlab` can open gaps; books default `weightInGrams 0`. | Free shipping by accident; three places to patch. | Single `computeShippingCharge()`; next-higher-slab for gaps; contiguity validation. |
| BKS-5 | Medium | Confirmed | `checkout/page.tsx:25-32` `JSON.parse(?books=)` unvalidated (quantity 0/negative/1e9 drives displayed totals and the QR amount); no quantity max in `bookstoreCheckoutSchema` (`validations.ts:404`) or cart route. | Misleading totals; abuse. | Zod with `int().min(1).max(N)` everywhere. |
| BKS-6 | Medium | Confirmed | `app/admin/bookstore/actions.ts:145` `deleteBookImage(bookId)` passes the id, not `imagePath`; `bookstore-upload.ts:62-64` returns early → nothing deleted; replace path never deletes the old object. | R2 orphans on every image change/removal. | `deleteBookImage(existing.imagePath)` in both branches. |
| BKS-7 | Medium | Confirmed | `PaymentRecord` ↔ `BookOrder` linked only by `description: "Book order #" + id.slice(-6)` (`orders/actions.ts:76`), deleted by description match (`:212-218`), looked up by `endsWith` + amount in `services/bookstore.ts:204-221, 278-293`, `app/actions/receipts.ts:50-65`, `services/payment-receipt.ts:57-76`. | Cross-linking/mis-deletion on suffix collisions; fragile. | `PaymentRecord.bookOrderId String? @unique`. |
| BKS-8 | Medium | Confirmed | `app/admin/bookstore/actions.ts:184-189` `deleteBook` only blocks on PENDING/APPROVED items; `BookOrderItem.book onDelete: Cascade` (schema:664) removes lines of SHIPPED/REFUNDED/DECLINED orders. | Historical sales lose items and profit. | Block when any item exists; unpublish instead; `Restrict`. |
| BKS-9 | Medium | Confirmed | `finance-bookstore.ts:98` revenue includes shipping, profit (`:101-106,222-228,326-332`) is items-only; shipping cost never an expense; "Completed" = SHIPPED only; Book Sales report ignores the date filter displayed (`finance/bookstore/page.tsx:68` vs `getBookSalesPaginated` taking only `q`). | Revenue − cost ≠ profit; filters that do nothing. | Track shipping separately; apply filters; document status semantics. |
| BKS-10 | Medium | Confirmed | Web `submitBookOrder` (`app/actions/bookstore.ts:101-122`) neither clears the cart nor checks UTR duplicates; screenshot uploaded before `create` (orphan on failure); API twin clears the cart. Whole pipeline duplicated between action and API route. | Inconsistent channels; orphan uploads. | One `createBookOrder()` service used by both. |
| BKS-11 | Low | Confirmed | `components/admin/BookstoreOrdersTable.tsx:37` links to `/admin/bookstore/orders/${id}` — route does not exist. | 404. | Remove or add detail page. |
| BKS-12 | Low | Confirmed | `decodeURIComponent` on already-decoded `searchParams` (`app/admin/bookstore/[bookId]/page.tsx:52`, `finance/page.tsx:89`, `transactions/page.tsx:46`). | `?error=50%` → URIError 500. | Render raw. |
| BKS-13 | Low | Confirmed/Potential | `CartProvider.tsx:59-100` local cart POSTed before the server GET resolves (race), POST on every keystroke; checkout silently drops unavailable books; SHIPPED orders cannot be refunded (`:176`); tracking/courier strings unbounded (`:130`); order `createdAt` vs record `paidAt` mismatch across reports. | UX/data consistency. | Debounce + ordered sync; notices; allow SHIPPED→REFUNDED; `max(100)`. |

**Book order state machine as implemented:** PENDING_VERIFICATION → APPROVED (creates `PaymentRecord`, notification, email) / DECLINED (notification, email); APPROVED → SHIPPED (requires courier+tracking) / REFUNDED (status only). DECLINED/SHIPPED/REFUNDED are terminal; `deleteBookOrder` allowed from any non-pending state. Inventory untouched in every transition.

**Verified correct:** server recomputes totals from DB prices; `priceAtPurchaseInrPaise` snapshotted; illegal transitions rejected; `orderReturnUrl` validated; image uploads validated; `deleteBook` guard for active orders.

### 3.8 Documents (PDF), receipts, certificates & email

Files: `services/pdf-generator.ts`, `utils/chromium.ts`, `utils/{receipt,certificate,id-card,grade-card,attendance-card}-html.ts`, `services/certificate*.ts`, `receipts-admin.ts`, `payment-receipt.ts`; `app/api/{certificate,receipt,id-card,grade-card,attendance-card}/**`, `app/api/admin/finance/export`; `services/email/**`.

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| DOC-1 | **Critical** | Confirmed | No escape helper exists in `utils/*-html.ts`; student-editable fields are interpolated raw: `utils/receipt-html.ts:59-61` (`${student.name}`, `${student.address}`, `${student.phone}`), `certificate-html.ts:93,100`, `id-card-html.ts:34,124-160` (name, father's name, residence, email, phone), `grade-card-html.ts:97-128`, `attendance-card-html.ts:119-121`. Rendered by server-side Chromium (`pdf-generator.ts:85-96`, `--no-sandbox` locally) with outbound network (it loads cdn.tailwindcss.com). `/api/receipt/[id]` is downloadable by the record owner. | A student puts `<script>fetch('http://169.254.169.254/…')…</script>` (or `<img src>` beacons) in their address; when an admin generates any document the script runs inside the PDF worker (SSRF to metadata/internal services); the student retrieves the rendered receipt themselves. | `escapeHtml()` on every `${…}` that is not server-built; `page.setRequestInterception` allow-list (data:, self-hosted assets only); disable JavaScript in the PDF page (`page.setJavaScriptEnabled(false)` after inlining CSS). |
| DOC-2 | **High** | Confirmed | `services/pdf-generator.ts:179-203` fetches `user.image` if it starts with `http` (no allow-list, timeout or size cap; `content-type` interpolated into `src`) or reads `path.join(process.cwd(), "public", image)` for `/`-prefixed values. `user.image` is settable to any string via `/api/v1/auth/me` PUT (API-2). | SSRF from the server; `/../.env` style local-file read into the HTML (exfil bounded by DOC-1). | Accept only the configured R2 host / googleusercontent; `AbortSignal.timeout`; byte cap; resolve and verify the path stays under `public/`. |
| DOC-3 | **High** | Potential | `utils/chromium.ts:11` downloads `chromium-v133.0.0-pack.tar` from GitHub at cold start; `package.json` pins `@sparticuz/chromium-min ^149`, `puppeteer-core ^25`; no `maxDuration` on any document route; `ETXTBSY` retry loop (`pdf-generator.ts:33-64`) already papers over concurrency. | Cold-start PDFs depend on github.com + two CDNs and may exceed the function timeout; unsupported Chrome 133 / puppeteer 25 pairing. | Match the pack version to the installed major, host the tarball yourself, `export const maxDuration = 60`, or generate PDFs once and store in R2 (`FILE_CONFIG.FOLDERS.RECEIPTS` exists unused). |
| DOC-4 | **High** | Confirmed | Email templates interpolate user strings unescaped despite `escapeHtml` existing in `services/email/layout.ts:3`: `services/email/templates/communication.ts:33,70,112,157,194,241,277`; `finance.ts:28,69,114,187,237`; `enrollment.ts:29,61`; `academic.ts:46-47,172,233`. `questionTitle` (anonymous asker) lands in the **admin** inbox (`sendFatwaSubmissionAdminEmail`). | HTML/link injection into branded admin/teacher emails (phishing). | Escape at the template layer; lint rule forbidding raw `${}` in templates. |
| DOC-5 | Medium | Confirmed | `pdf-generator.ts:227` `<script src="https://cdn.tailwindcss.com">` (Play CDN, "not for production"), `certificate-html.ts:22` Google Fonts; `waitForNetworkIdle(…).catch(() => {})` swallows timeouts. | Unstyled or tofu-font PDFs on slow/blocked CDN with no error. | Build the PDF stylesheet with Tailwind CLI at build time; self-host fonts as base64 (already done for IndoPak). |
| DOC-6 | Medium | Confirmed | `GenerateCertificateForm.tsx:158-166` `step="0.1"` vs `Enrollment.certificateGrade Int` (schema:429); server only checks 0–10. | 9.5 passes validation then fails in Prisma. | `Number.isInteger` or `Decimal(3,1)`. |
| DOC-7 | Medium | Confirmed | `AdminCertificatesTable.tsx:60` compares to `"appreciation"` (lowercase) while stored `"APPRECIATION"`. | Every certificate listed as "Completion". | Fix the literal; make `certificateType` an enum. |
| DOC-8 | Medium | Confirmed | `app/api/receipt/[paymentRecordId]/route.ts:17-29` queries the DB before `auth()`; every request to any of the five document routes launches Chromium; no rate limit. | Existence oracle; cheap DoS by the record owner. | Auth first; cache generated PDFs; per-user rate limit. |
| DOC-9 | Medium | Potential | `app/api/id-card/route.ts:36-42`, `grade-card`, `attendance-card` put raw `user.name` into `Content-Disposition`. | `"` breaks the header; non-Latin-1 (Arabic/Urdu names) → undici throws → 500. | Slugify + `filename*=UTF-8''`. |
| DOC-10 | Medium | Confirmed | Receipt shipping looked up again at render time via description regex in two places (`app/actions/receipts.ts:50-65`, `services/payment-receipt.ts:57-76`; `findFirst` no `orderBy`). | Rows may not sum to the stored base; nondeterministic. | Store `bookOrderId` and `receiptShippingAmountPaise` at generation. |
| DOC-11 | Medium | Confirmed | `package.json` ships full `puppeteer` (Chrome download at install) as a prod dependency, statically imported (`pdf-generator.ts:1`); only `chromium-min`/`puppeteer-core` are externalised in `next.config.ts:12`. | Slow installs; bundled dead code on Vercel. | devDependency + dynamic import in the local branch. |
| DOC-12 | Low | Confirmed | `utils/receipt-html.ts:105-144` discount + inclusive-GST rows don't reconcile; appreciation certificate text says "successful completion" (`certificate-html.ts:106-112`); `List-Unsubscribe`/`One-Click` headers point at the announcement page (`communication.ts:198,206,281,289`); `details: err.message` returned to clients (`certificate route:80`, `receipt route:61`); `startDelayMs` never used; `PAYMENTS.TYPES.BOOK_ORDER="book_order"` while code uses literal `"book_purchase"` in 6 files; header/signature block copy-pasted 5×; new SMTP transport per message, no pool/retry; `outputFileTracingIncludes` absent for `public/assets` & fonts (Potential); `config/brand.ts:77-79` social links are `facebook.com` etc.; `config/credits.ts` personal emails/phones rendered in the footer. | Correctness/hygiene. | Per item. |

**Verified correct:** document routes admin-gated (receipt: owner-or-admin), cuid ids; `browser.close()` in `finally`; chromium download de-duplicated; email components (`EmailInfoCard`, `EmailAlert`, …) escape; SMTP timeouts set; XLSX export admin-only.

### 3.9 Blog, fatwa, library, daily inspiration, reviews & contact

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| CNT-1 | **Critical** | Confirmed | `components/shared/RichTextEditor.tsx:40-47` saves raw `innerHTML`; `createLink` (`:65-68`) accepts `javascript:`; `blogPostSchema.body`/`fatwaAnswerSchema.answer` are length-only (`utils/validations.ts:235-242, 87-89`); no sanitizer dependency. Sinks: `app/blog/[id]/page.tsx:111` (public), `app/admin/blog-approvals/[id]/page.tsx:65` (admin, **pre-approval**), `app/fatwa/[id]/page.tsx:108` (public), `RichTextEditor.tsx:39` `innerHTML = value` when an admin opens a teacher post/answer. | Teacher → admin JavaScript execution before approval (`<img onerror>`), then public XSS once approved. Admin session can approve payments, mint teachers, delete students. | Server-side allow-list sanitiser (`sanitize-html`/`isomorphic-dompurify`) on write **and** read; sanitise before `innerHTML` in the editor; validate link schemes; CSP. |
| CNT-2 | **High** | Confirmed | `components/site/JsonLd.tsx:11` `JSON.stringify(data)` without `<` escaping; fed by `services/seo-schema.ts:115-116, 203-209` with blog title/excerpt and **anonymous** fatwa title/question/answer. | `</script><script>…` in a fatwa question executes on the public page once answered; admin preview shows it as harmless text. | Escape `<`, `>`, `&` as `<` etc.; strip HTML from `acceptedAnswer.text`. |
| CNT-3 | **High** | Confirmed | `services/blogs.ts:107,113` select `email` for author and every commenter; `app/blog/[id]/page.tsx:149` passes comments to the client `BlogEngagement` (uses only `email.charAt(0)`). | Every commenter's email in the RSC payload of a public page. | Select `id, name, image` only. |
| CNT-4 | Medium | Confirmed | `app/blog/[id]/actions.ts:50-52,132` comment content non-empty only; all comments and likes loaded unpaginated (`blogs.ts:108-114`); `generateMetadata` + page double-fetch (no `cache()`), same for fatwa; `app/contact/actions.ts` no rate limit/honeypot, `create` unwrapped; `app/fatwa/actions.ts` anonymous `revalidatePath("/admin/fatwa")`. | Abuse and O(n) page cost. | `max(2000)`, pagination, `cache()`, rate limits. |
| CNT-5 | Medium | Confirmed | `services/fatwa.ts:9-12` public search matches `askerEmail`; teacher form receives the full row incl. `askerEmail`. | Email oracle on `/fatwa?q=`. | Public search on title/question/category only; project fields. |
| CNT-6 | Medium | Confirmed | `app/sitemap.ts:84-94` emits `/library/{id}` — no such route exists; `force-dynamic` with 5 unbounded `findMany`; `robots.ts:20` disallows `/announcements/` which Header/Footer link publicly. | 404s in the sitemap; crawl inconsistency. | Drop the block; `revalidate = 3600`; align robots. |
| CNT-7 | Medium | Confirmed | `app/teacher/(portal)/blogs/actions.ts:89-99` any edit of an APPROVED+published post resets it to `published:false, PENDING, featuredOnHomepage:false`; `canTeacherEditBlogPost` ignores status; `?error=locked` branch dead. | Live homepage article vanishes without admin involvement. | Lock approved posts or confirm the consequence. |
| CNT-8 | Medium | Confirmed | `app/admin/fatwa/actions.ts:70-90` emails the asker on **every** save (edits included) and awaits SMTP inline; teacher fatwa and contact reply also await inline. | Duplicate emails; slow actions. | Send only on first answer; use `after()`. |
| CNT-9 | Medium | Confirmed | `services/blog-mutations.ts:46-61` uploads then inserts per file; failure on file N leaves 1..N-1 in R2 and the post deleted; `updateBlogPost` removes images before validating new ones; library image replace never deletes the old object. | Orphans, lost images. | Validate all → upload → write in a transaction. |
| CNT-10 | Low | Confirmed | Like/comment allowed on unpublished posts (`blog/[id]/actions.ts:15-35,57-60`); like toggle find-then-create race; comment anchor never rendered; `library pdfUrl` `.url()` accepts any scheme; library page copy says downloads "future update" while required; notification labels missing for `BOOK_ORDER_SHIPPED/REFUNDED/BLOG_COMMENT_ADDED`; `ConfirmationModal` `catch {}` swallows errors; `alert()/confirm()` ×6; copy mismatches ("six reviews" vs max 4; "public course page" vs homepage); manifest theme colour off-brand; legal pages lack canonical. | UX/hygiene. | Per item. |

**Verified correct:** comment delete owner-or-admin, edit owner; teacher blogs scoped by `createdById`; teacher fatwa answers go to PENDING, admin approves; admin review edit does not alter student text; notification ownership filtered; upload keys safe; `MarkdownText` (react-markdown without rehype-raw) safe.

### 3.10 Notifications & push

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| NTF-1 | Medium | Confirmed | `services/notifications.ts:218-230` `Promise.all(uniqueUserIds.map(upsert))` — one concurrent upsert per recipient (site announcement = every non-teacher user); `:375-377` per-user `revalidatePath`. | Pool exhaustion on serverless; revalidation storm. | `createMany({skipDuplicates})` + one `updateMany`; single revalidate. |
| NTF-2 | Medium | Confirmed | `DeviceToken` stored (`/api/v1/notifications/device-token`) but no FCM/firebase sender anywhere. | Android push notifications do not exist despite the API. | Implement `firebase-admin` sender in `createStudentNotification*` or document as reserved. |
| NTF-3 | Low | Confirmed | `after()` used for notifications but inline `await` for fatwa/contact/declined-payment emails; `processEmailBatch` throttling exists only in notifications. | Inconsistent latency. | One `enqueueEmail()` path. |

### 3.11 Admin, teacher & student portals (UI layer)

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| UI-1 | Medium | Confirmed | `app/layout.tsx:12` `export const dynamic = "force-dynamic"` for the whole site; no `revalidate`/ISR anywhere; homepage issues 8 Prisma queries + `auth()` per request (`StudentTestimonials.tsx:51`). | No static/edge caching for public pages; every visitor hits the DB 8+ times. | Remove global force-dynamic; ISR for public pages; move session-dependent bits to client. |
| UI-2 | Low | Confirmed | `app/courses/page.tsx:144` public hero titled "Course Announcements"; teacher photo rendered twice (`app/admin/teachers/[id]/page.tsx:43-51,104-116`); duplicated header in `admin/courses/[id]/students/page.tsx:47-61`; `DeleteActionButton itemName="teacher"` literal; `TableSkeleton` ×4, hero section ×7, tab pills ×6, dialog boilerplate ×4, `AdminSidebar` ≈ `DeveloperSidebar` 95%. | Polish/duplication. | Shared primitives. |
| UI-3 | Low | Confirmed | `components/ui/{Badge,Card,Spinner,data/EmptyState,data/Table,forms/Input,Label,Select,Textarea}.tsx` never imported; `content/testimonials.ts` seed-only; `services/review-rating.ts` one-line module; `getStudentReviewsForUser` used only as a type. | Dead code. | Delete or adopt. |
| UI-4 | Low | Confirmed | Accessibility: unlabeled comment textarea and kebab button (`BlogEngagement.tsx:195-201,255-260`), toast close button without name and no `aria-live` (`ToastProvider.tsx:75-82`), cover links with empty alt (`BlogPostCard.tsx:19-27`), dangling `aria-labelledby` (`HomeDailyInspiration.tsx:33`), unassociated file labels (`LibraryForm.tsx:96,119`). | WCAG basics. | Fix labels/roles. |
| UI-5 | Low | Confirmed | Hardcoded brand strings outside `config/`: `public/sw.js`, `utils/receipt-html.ts:80`, `services/registration.ts:4` (`DQA` prefix), `DQA-INV-`/`DQA-CERT-`, `CartProvider.tsx:35`, `services/academy-{contact,location}.ts`, `HomeAbout.tsx`, about/privacy/terms pages, `schema.prisma:539-540` defaults, `package.json` name. | White-label claim not met. | Route through `BRAND_CONFIG`. |

### 3.12 Infrastructure, build, database migrations, seeds & dependencies

| ID | Sev | Status | Evidence | Impact | Fix |
|---|---|---|---|---|---|
| INF-1 | **Critical** | Confirmed | Objects present in `prisma/schema.prisma` but in **no** migration (grep across `prisma/migrations/`): tables `Coupon`, `CouponRequest`, `CouponUsage`, `DeviceToken`, `UserCartItem`, `BlogLike`, `BlogComment`; enums `Gender`, `CouponType`, `CouponRequestStatus`; columns `User.gender/policiesAcceptedAt/policiesAcceptedVersion`, `PaymentSettings.includeGstByDefault/feeWaiverEnabled`, `CoursePaymentSubmission.couponId` (+index, FK); enum value `StudentNotificationType.BLOG_COMMENT_ADDED`. 10 schema commits after the last migration (2026-07-06 … 2026-09-09). | `prisma migrate deploy` on a fresh DB yields a schema missing 7 tables; coupons, cart, device tokens, blog engagement, gender, policy acceptance, GST and waiver settings all throw P2021/P2022. Migration history is not the source of truth. | Generate one corrective migration with `prisma migrate diff --from-migrations … --to-schema-datamodel … --script`; add a CI drift check (`--exit-code`). |
| INF-2 | **Critical** | Confirmed | `prisma/fix-migration-lock.ts:12-14,37-45` marks unfinished migrations finished and **inserts every migration folder as applied** before `migrate deploy` (`package.json:8` `vercel-build`); errors swallowed (`catch → console.warn`). Git: `41d5ff1` (2026-07-25) shows the previous pipeline was `db push --accept-data-loss`. | `migrate deploy` is permanently a no-op in production; failed migrations are hidden; on a fresh DB the script no-ops and INF-1 bites. Schema changes after 2026-07-25 (`DeviceToken`, `UserCartItem`) have no in-repo path to production. | Delete the script; baseline once with `prisma migrate resolve --applied`; `vercel-build = prisma generate && prisma migrate deploy && next build`. |
| INF-3 | **Critical** | Confirmed | `package.json:9` `vercel-build:staging` = `db push --accept-data-loss && tsx prisma/seed-demo.ts`; `seed-demo.ts:16-26` allows when `VERCEL_GIT_COMMIT_REF === "dev"` or `ALLOW_DEMO_SEED`; `clearDatabase()` wipes 36 models; `seed-demo-data.ts:300-323` creates a **User for every `ADMIN_EMAIL` address with password `Admin@2026`** (`content/demo-students.ts:8`) and prints credentials to the build log. | Any build of the `dev` branch erases whichever DB it points at and installs a public admin password on the real admin emails. | Never seed in builds; DB-host allowlist; random generated passwords written to a local file only. |
| INF-4 | **High** | Confirmed | `prisma/migrations/20260705102500_sync_recent_feature_removals/migration.sql:17-19` `DROP TABLE IF EXISTS "AcademySettings"/"AnalyticsEvent"/"SocialLinksSettings"`; migration rewritten after application (`981ea77` "make migration idempotent"). | Unrecoverable data loss; checksum mismatch that the repair script masks. | Never edit applied migrations; corrective migrations only; export before drop. |
| INF-5 | **High** | Confirmed | `Enrollment.courseId` (schema:423) and `CoursePaymentSubmission.courseId` (:555) have **no relation** to `Course` (init migration has no FK). Code performs manual joins in ≥7 services. | Orphans on course delete; no referential integrity for the two most important academic/financial tables. | Add `@relation(… onDelete: Restrict)` with an orphan report first. |
| INF-6 | **High** | Confirmed | `npm audit --package-lock-only`: 4 critical / 17 high / 16 moderate / 2 low. Direct: `next@16.2.6` (image-optimisation & `use cache` RCE advisories, fix 16.4.4), `next-auth@5.0.0-beta.31` + `@auth/core` (fail-open on config error, homoglyph email bypass, `getToken()` crash on malformed Bearer — directly exercised by `services/api-auth.ts`), `@auth/prisma-adapter`, `nodemailer@7` (CRLF, ReDoS), `zod <4.6.6`, `xlsx@0.18.5` (no fix on npm), `puppeteer*` via chromium-bidi. | Known RCE/bypass advisories in production. | Upgrade `next`, `next-auth`, adapter, `zod`, `puppeteer*`; evaluate nodemailer 10; replace `xlsx` with `exceljs`. |
| INF-7 | **High** | Confirmed | No `headers()` in `next.config.ts`, no CSP/HSTS/`X-Frame-Options`/`Referrer-Policy`/`nosniff` anywhere; middleware matcher is `/api/v1/*` only. | Admin panel frameable (clickjacking); XSS findings have no mitigating CSP. | `headers()` with HSTS, nosniff, Referrer-Policy, `frame-ancestors 'none'`, nonce CSP via middleware. |
| INF-8 | **High** | Confirmed | Free-text status/type columns: `Enrollment.status` (:424), `CoursePaymentSubmission.paymentType/status/paymentMethod` (:557-561), `PaymentRecord.paymentType` (:493), `Enrollment.certificateType` (:428), `DeviceToken.platform` (:820), `Coupon.gender String?` (:764) compared with the `Gender` enum (`services/coupons.ts:79`); `"FEE-WAIVER"` sentinel in `upiTransactionId`. | No DB validation; invisible states; enum/string mismatch. | Enums + data migration. |
| INF-9 | **High** | Confirmed | `onDelete: Cascade` from `User` to `PaymentRecord` (:503), `BookOrder` (:645), `CoursePaymentSubmission` (:569), `CouponUsage`; from `Course` to attendance/grades; from `Coupon` to usages. No `deletedAt`, no `AuditLog`. | Financial/academic history destroyed by routine deletes; no forensic trail. | `Restrict` on money/grade relations; soft delete; `AuditLog` model for admin mutations. |
| INF-10 | Medium | Confirmed | `upiTransactionId` has no unique index (schema:562); duplicate check is app-level `findFirst` outside the transaction; `BookOrder.upiTransactionId` never checked. | Reused UTRs under concurrency / in bookstore. | Partial unique index excluding `FEE-WAIVER`; catch P2002. |
| INF-11 | Medium | Confirmed | Missing indexes: `Enrollment(userId,status)`, `Enrollment(status)`, `Enrollment(courseId,status)`, `CoursePaymentSubmission(userId,courseId,label,status)`, `CourseAnnouncement(teacherId)`, `CourseGrade(courseId,date)`, `FatwaQuestion(approvalStatus)`, `BlogPost(createdById)`, `PasswordResetToken(expiresAt)`, `VerificationToken(expires)`, `Expense(paidAt,category)`. Redundant: `Coupon.code @unique` + `@@index([code])`, `DeviceToken.token` same. | Sequential scans on hot admin queues as data grows. | Add/remove as listed. |
| INF-12 | Medium | Confirmed | `CourseGradeRecord.marksObtained Float` vs `maxMarks Int`; `Teacher` ↔ `User` linked only by `Teacher.email @unique` (no FK, breaks when either email changes); `PaymentSettings` single-row by convention only; `StudentNotification` lacks `updatedAt` despite `readAt` edits. | Precision artefacts; fragile role linkage. | `Decimal(6,2)`; `Teacher.userId @unique` FK; CHECK on settings id. |
| INF-13 | Medium | Confirmed | `package.json:18-20` `prisma.seed` → **destructive demo seed**; README's `npm run db:seed` does not exist; README says `db push`. | `prisma migrate reset`/`db seed`/`migrate dev` wipe and reseed by default. | Non-destructive `prisma/seed.ts` (bootstrap upserts only); fix README. |
| INF-14 | Medium | Confirmed | `prisma/seed-bootstrap.ts:166-186` writes a fake bank account (`123456789012` / `SBIN0001234`) into `PaymentSettings`, which the public payment page renders. | Students could pay into a fake account on a seeded environment. | Never seed bank data outside local dev. |
| INF-15 | Medium | Confirmed | `utils/db-error.ts:13-15` maps every error to `"Database operation failed"` (≥40 sites), discarding P2002/P2025/P2003; `utils/action-utils.ts:22-24` puts the raw message in `?saveError=`. | Unactionable errors; message leakage in URLs/logs. | Map known codes; opaque error codes + flash message. |
| INF-16 | Medium | Confirmed | `utils/prisma.ts:4,11-16,49-70` hand-bumped `PRISMA_CLIENT_CACHE_KEY`, `Prisma.dmmf` reflection on every access, no pooling/driver-adapter config. | Fragile hack; relies on `DATABASE_URL` being the pooler. | Standard `globalThis.prisma ??= new PrismaClient()`; Neon adapter or `connection_limit=1`. |
| INF-17 | Medium | Confirmed | `utils/s3.ts:3-15` builds the client with empty credentials/endpoint `https://.r2.cloudflarestorage.com` when env is missing; `next.config.ts:4-6` silently falls back to `cdn.your-academy.com`. | Opaque failures instead of config errors. | Fail fast when `R2_*` missing in production. |
| INF-18 | Medium | Confirmed | `next.config.ts:13-17` `bodySizeLimit = 10 × 5 MiB = 50 MiB` for **all** server actions. | DoS amplification (self-hosted); Vercel caps at 4.5 MB anyway so blog uploads > 4.5 MB fail there. | Default 1 MB; presigned R2 PUT for images. |
| INF-19 | Low | Confirmed | `receipt.html`, `receipt.pdf`, `scratch/test.ts` committed at the repo root (`.gitignore` lacks entries); `.agents/AGENTS.md` instructs agents to `git push` without confirmation. | Hygiene; risky automation policy on a repo whose build can wipe databases. | `git rm`; ignore; delete the rule. |
| INF-20 | Low | Confirmed | `.env.example`: `NEXTAUTH_URL`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION` unused; `NEXTAUTH_SECRET`, Vercel system vars undocumented; `NEXT_PUBLIC_APP_URL` used in one place. | Config drift. | Regenerate from code (Appendix C). |
| INF-21 | Low | Confirmed | `@vercel/analytics`, `@vercel/speed-insights` never imported; `pdf-lib` in devDependencies but executed by the staging build; `puppeteer` + `puppeteer-core` both in deps; no `engines`; `@types/node ^20`; `knip` not run (would flag the above). | Bloat. | Clean up; run knip in CI. |
| INF-22 | Low | Confirmed | README: "Next.js 15", "Radix UI", `npm run db:seed`, `npx prisma db push`, build command conflicting with `vercel.json`. | Onboarding errors. | Regenerate Setup from `package.json`. |

---

## 4. Cross-cutting assessments

### 4.1 Security

**Authentication & session (see 3.1).** Credentials + Google via Auth.js with JWT sessions. Weaknesses: unverified Google audience on the mobile path (AUTH-2), dangerous account linking + unverified credentials login (AUTH-7), role cached for the token lifetime (AUTH-9), hardcoded fallback secret (AUTH-3), reset link leakage when SMTP is unconfigured (AUTH-4), open redirect via protocol-relative `callbackUrl` (AUTH-10), no brute-force protection (AUTH-6).

**Authorization / RBAC.** Role model is email-based (`ADMIN_EMAIL`, `DEVELOPER_EMAIL`, `Teacher.email`), with no role column, no permission granularity and no audit. Every server action checks role; pages mostly rely on layouts (AUTH-8). Object-level authorization is good for students and admins; the teacher role has two real IDOR gaps (GRD-1, GRD-2) and over-broad roster access (CRS-2).

**Injection.** No raw SQL in request paths (only in the build script). No SQL injection found. **Stored XSS** is the dominant risk: unsanitised rich text (CNT-1), JSON-LD breakout (CNT-2), PDF HTML (DOC-1), email HTML (DOC-4). No CSP to contain it (INF-7).

**Input validation.** Web server actions use Zod consistently; the mobile API largely does not (API-2…5); some admin actions accept raw numbers/dates (PAY-8, CRS-5, GRD-3).

**Data exposure.** Course announcements public via API (API-1); commenter emails (CNT-3); fatwa asker emails searchable (CNT-5); applicant PII to teachers (CRS-2); internal error messages to clients (DOC-12); private attachments on public R2 URLs (ANN-4).

**CSRF.** Server Actions are protected by Next.js origin checks; `/api/v1` route handlers that accept the session cookie are not (AUTH-5).

**Destructive endpoints & pipeline.** `/api/dev/seed` (AUTH-1), staging build seed (INF-3), migration repair script (INF-2).

**Dependencies.** 39 advisories incl. critical in `next` and `next-auth` (INF-6).

**Secrets.** No credentials committed; `.env*` ignored. Demo passwords (`Admin@2026`, `Teacher@2026`, `Demo@2026`) are in source and applied to real admin emails by the demo seed.

### 4.2 Performance & scalability

- **Caching:** `force-dynamic` at the root layout disables static rendering for the whole site; no ISR. Homepage = 8 queries + `auth()` per visit (UI-1). Sitemap is dynamic with 5 unbounded queries (CNT-6).
- **N+1 / over-fetching:** blog detail loads all likes/comments (CNT-4); waiver finance loads all approved submissions (PAY-15); bookstore finance summary loads all orders+items (BKS-9 context); `getEnrollmentCountsByCourse` for all courses on a single teacher page; inactive-tab counts via full queries (PAY-14); `getStudentUsers()` for a dropdown; `getPaymentSettings()` called twice per payment page; `/api/v1/student/{attendance,grades}` run one query per enrollment.
- **Write amplification:** per-recipient upserts and revalidations on announcements (NTF-1, ANN-3); `revalidatePath` of 9+ paths with both `layout` and `page` on every payment/enrollment action.
- **Indexes:** several hot filters unindexed (INF-11); search uses `contains`/`insensitive` on 50 KB bodies with no trigram index.
- **PDF path:** cold-start Chromium download + CDN fetches per document, no caching of generated PDFs, no `maxDuration` (DOC-3, DOC-8).
- **Serverless DB:** no driver adapter / connection limit (INF-16).
- **Server actions:** 50 MiB body limit (INF-18).

### 4.3 Database

- **Schema vs migrations:** 7 tables, 3 enums, 8 columns, 1 enum value exist only in `schema.prisma` (INF-1); repair script hides this (INF-2). See Appendix B.
- **Relationships:** `Enrollment` and `CoursePaymentSubmission` lack a `Course` FK (INF-5); `Teacher` not linked to `User` (INF-12); `PaymentRecord` ↔ `BookOrder` by description string (BKS-7).
- **Constraints:** statuses as strings (INF-8); no unique on `upiTransactionId` (INF-10); `marksObtained` Float; dates as strings (CRS-11); `certificateGrade Int` vs decimal UI (DOC-6).
- **Deletion semantics:** cascades destroy financial history (INF-9, CRS-1); no soft delete/audit.
- **Indexes:** see INF-11.
- **Operational:** `prisma.seed` is destructive (INF-13); fake bank details seeded (INF-14); generic error wrapping hides constraint violations (INF-15).

### 4.4 Code quality & maintainability

- **Strengths:** consistent module layout; TypeScript `strict`; only 9 `as any` and 13 `eslint-disable`; Zod schemas centralised; small focused services.
- **Duplication (quantified):** admin↔teacher attendance/grade pages (9 pairs, 90–95%); attendance↔grades services/actions (80%); card previews/API routes (95%+); shipping calculation ×3; order pipeline ×2; `formatPrice` ×10; payment form blocks ×3; announcement cards/actions ×3; upload services ×2; sidebars ×2; `returnUrl`, `revalidate*` helpers ×2–4; `TableSkeleton` ×4; hero sections ×7; tab pills ×6; seven admin CRUD `actions.ts` with the same 7-step shape (~1,000 lines).
- **Error handling:** three competing patterns (throw → error boundary; `redirect(?error=)`; return `{error}`), `executeServerAction` leaks messages into URLs, `withDbErrorHandling` erases Prisma codes, `ConfirmationModal` swallows errors, teacher blog actions skip the wrapper.
- **Type safety gaps:** `as unknown as` in `services/enrollments.ts` (4×), `baseWhere: any`, `coupon: any`, `catch (e: any)`, unchecked enum casts in student admin.
- **Dead code:** `authorized()` callback, `components/ui/*` (9 files), `startDelayMs`, `DOCUMENT_TYPES`, `FOLDERS.RECEIPTS`, `PAYMENTS.TYPES.BOOK_ORDER`, `ROLES` constant with mismatched values, `content/testimonials.ts`, `scratch/test.ts`, `receipt.html/pdf`, `@vercel/*` packages.
- **Leftovers:** `console.log` in `PwaRegister.tsx`, `utils/prisma.ts`; `alert()/confirm()` ×6; placeholder social links; personal contact details in `config/credits.ts`.
- **Docs:** README stale (INF-22); `.env.example` drift (INF-20).

### 4.5 Testing

- **Current state:** zero test files, no test runner, no CI, no git hooks (Glob for `*.test.*`, `*.spec.*`, `__tests__`, `vitest.config*`, `jest.config*`, `playwright*`, `.github/`, `.husky/` → none). `scratch/test.ts` is a manual script.
- **Consequence:** findings such as PAY-1 (coupon omission), PAY-4 (GST math), DOC-7 (lowercase literal), BKS-6 (wrong argument), ANN-1 (missing action) are exactly the class that unit/integration tests catch.
- **Required coverage (see Phase 3):** unit tests for money math, coupon selection, shipping slabs, finance filters, status transitions, validation schemas; integration tests (Prisma against a test Postgres) for payment submission/approval, enrollment lifecycle, roll numbers under concurrency, book order state machine, notification fan-out; API tests for every `/api/v1` route (auth, validation, negative cases); e2e (Playwright) for register → verify → enrol → pay → approve → receipt, and teacher attendance/grades; security regression tests for XSS sanitisation, IDOR (GRD-1), open redirect, CSRF on `/api/v1`.

---

## 5. Missing or incomplete functionality

| Area | Gap | Evidence |
|---|---|---|
| Push notifications | FCM tokens stored, never sent. | No `firebase`/`fcm` in repo (NTF-2). |
| Private message deletion | No `deleteStudentCourseAnnouncement`; UI binds the wrong action. | ANN-1. |
| Refund accounting | Refund does not reverse income or restore stock. | BKS-1, BKS-3. |
| Inventory | `inventoryPurchased` never enforced. | BKS-3. |
| Unpublished site announcements | Cannot be edited/deleted by admin. | ANN-2. |
| Order detail page | Linked but not implemented. | BKS-11. |
| Library item pages | Sitemap links `/library/{id}` which does not exist; page copy says downloads "coming". | CNT-6, CNT-10. |
| Waiver approval | 100% coupons auto-approve payments/enrollment with no admin step. | PAY-2. |
| Rate limiting / abuse controls | None on auth, contact, fatwa, comments. | AUTH-6, CNT-4. |
| Audit trail | No record of who approved/deleted/edited financial or academic data. | INF-9. |
| Email verification UX | Session not refreshed after verification. | AUTH-14. |
| Refund of shipped orders | Not possible. | BKS-13. |
| Scheduled coupons | Future `validFrom` silently clamped to now. | PAY-8. |
| Grade semantics | No "not graded" state; blank = 0. | GRD-3. |
| Analytics | `@vercel/analytics`/`speed-insights` installed, not wired. | INF-21. |
| One-click unsubscribe | Header advertised, endpoint absent. | DOC-12. |
| Tests / CI | None. | 4.5. |

---

## 6. Prioritised issue register

Status: **C** = Confirmed in code, **P** = Potential (environment/runtime dependent). Effort: S (<½ day), M (½–2 days), L (2–5 days), XL (>1 week).

| # | ID | Sev | St | Module | Location | Summary | Effort |
|---|---|---|---|---|---|---|---|
| 1 | AUTH-1 | Critical | C | Infra/API | `app/api/dev/seed/route.ts:12-14` | Hardcoded `seed123` lets anyone wipe & reseed production DB | S |
| 2 | AUTH-2 | Critical | C | Auth/API | `app/api/v1/auth/google/route.ts:20-30` | Google ID token audience/issuer/email_verified not checked → account takeover | S |
| 3 | CNT-1 | Critical | C | Content | `RichTextEditor.tsx:40-47`; `app/blog/[id]/page.tsx:111`; `blog-approvals/[id]/page.tsx:65`; `fatwa/[id]/page.tsx:108` | Stored XSS in blog body / fatwa answer; executes in admin browser pre-approval | M |
| 4 | DOC-1 | Critical | C | Documents | `utils/*-html.ts` (receipt:59-61 etc.) | Unescaped student fields rendered in server Chromium → SSRF/exfil | M |
| 5 | INF-1 | Critical | C | Database | `prisma/schema.prisma` vs `prisma/migrations/` | 7 tables/3 enums/8 columns exist only in schema; fresh deploy broken | M |
| 6 | INF-2 | Critical | C | Build | `prisma/fix-migration-lock.ts`; `package.json:8` | Build stamps all migrations applied → `migrate deploy` never runs | S |
| 7 | INF-3 | Critical | C | Build/Seeds | `package.json:9`; `prisma/seed-demo.ts:16-26`; `seed-demo-data.ts:300-323` | Staging build wipes DB and sets `Admin@2026` on real admin emails | S |
| 8 | PAY-1 | High | C | Payments | `MonthlyPaymentForm.tsx:102-104`; `services/coupons.ts:116-126` | "No coupon" silently applies best coupon; amount mismatch, coupon burned | S |
| 9 | GRD-1 | High | C | Grades | `services/grades.ts:54-60,90-94,146-156` | `gradeId` not scoped to course → cross-course read/write/delete by teachers | S |
| 10 | GRD-2 | High | C | Attendance/Grades | `services/grades.ts:102-119`; `attendance.ts:104-121` | `enrollmentId` not verified against course | S |
| 11 | CNT-2 | High | C | Content/SEO | `components/site/JsonLd.tsx:11` | JSON-LD `</script>` breakout from anonymous fatwa text | S |
| 12 | DOC-2 | High | C | Documents/API | `pdf-generator.ts:179-203`; `api/v1/auth/me` PUT | Arbitrary `user.image` URL/path fetched by PDF worker (SSRF/LFI) | S |
| 13 | AUTH-4 | High | C | Auth | `api/auth/forgot-password/route.ts:29-37` | Reset link returned in JSON when SMTP unconfigured | S |
| 14 | AUTH-5 | High | C | API | `middleware.ts`; `services/api-auth.ts:70-74` | CSRF: `/api/v1` accepts session cookie, CORS `*`, no origin check | M |
| 15 | AUTH-3 | High | C | Auth | `services/api-auth.ts:6` | Hardcoded fallback JWT secret | S |
| 16 | AUTH-6 | High | C | Auth | all auth routes & public forms | No rate limiting / lockout | M |
| 17 | AUTH-7 | High | P | Auth | `auth.config.ts:18`; `auth.ts:34-51` | Dangerous email linking + unverified credentials login → pre-account takeover | S |
| 18 | AUTH-8 | High | C | Auth | 48 admin pages (Appendix A) | Layout-only page protection; middleware auth dead | M |
| 19 | AUTH-9 | High | C | Auth | `services/auth.ts:80` | Role cached in JWT for session lifetime | S |
| 20 | API-1 | High | C | API | `api/v1/courses/[id]/route.ts:658-663` | Course announcements + attachments public | S |
| 21 | API-2 | High | C | API | `api/v1/auth/me/route.ts:58-75` | Profile PUT unvalidated (`image` arbitrary) | S |
| 22 | PAY-2 | High | C | Payments | `services/payments.ts:55-275` | Non-transactional submission; TOCTOU duplicates; 100% waiver auto-approves | M |
| 23 | PAY-3 | High | C | Payments | `services/monthly-payments.ts:484-512` | Writes (`PaymentRecord.create`) during list reads | S |
| 24 | PAY-4 | High | C | Receipts | `app/actions/receipts.ts:71-72` | GST computed as 18% of gross, labelled inclusive; persisted | S + data fix |
| 25 | PAY-5 | High | C | Coupons | `app/admin/coupons/actions.ts:293-341` | Deleting a waiver request deletes payment records | S |
| 26 | PAY-6 | High | C | Finance | payments/coupons/orders actions | Hard deletes of invoices/orders; no audit log | M |
| 27 | BKS-1 | High | C | Bookstore | `orders/actions.ts:164-192` | Refund keeps income record & receipts | S |
| 28 | BKS-2 | High | C | Bookstore | `orders/actions.ts:48-78` | Non-atomic approval → duplicate PaymentRecords | S |
| 29 | BKS-3 | High | C | Bookstore | all order paths; `finance-bookstore.ts` | Inventory never enforced; summary wrong | M |
| 30 | CRS-1 | High | C | Students | `app/admin/students/actions.ts:42` | Student delete cascades all financial history; teachers deletable | S |
| 31 | ANN-1 | High | C | Announcements | `TeacherCourseAnnouncementCard.tsx:66-69` | Private messages cannot be deleted | S |
| 32 | CNT-3 | High | C | Blog | `services/blogs.ts:107,113` | Commenter emails leaked to public | S |
| 33 | DOC-3 | High | P | Documents | `utils/chromium.ts:11`; routes | Runtime Chromium download, version mismatch, no `maxDuration` | M |
| 34 | DOC-4 | High | C | Email | `services/email/templates/*.ts` | Unescaped user content in emails | S |
| 35 | INF-4 | High | C | Database | migration `20260705…:17-19` | Tables dropped without export; migration edited post-apply | S |
| 36 | INF-5 | High | C | Database | `schema.prisma:423,555` | `Enrollment`/`CoursePaymentSubmission` have no Course FK | M |
| 37 | INF-6 | High | C | Deps | `package.json` | 39 advisories incl. critical `next`/`next-auth` | M |
| 38 | INF-7 | High | C | Infra | `next.config.ts` | No security headers / CSP | S |
| 39 | INF-8 | High | C | Database | schema status columns | Free-text statuses, enum/string mismatch | L |
| 40 | INF-9 | High | C | Database | schema cascades | Cascades destroy financial history; no soft delete/audit | L |
| 41 | AUTH-10 | Medium | C | Auth | 4 files | Open redirect via `//` callbackUrl | S |
| 42 | AUTH-11 | Medium | C | Auth | `api-auth.ts` | API token = session cookie; no revocation | M |
| 43 | AUTH-12 | Medium | C | Auth | `auth-actions.ts` | Auth helpers exported as server actions | S |
| 44 | AUTH-13 | Medium | C | Auth | register routes | No server email validation / caps | S |
| 45 | AUTH-14 | Medium | C | Auth | `auth.ts:80-86` | Stale `emailVerified` in session | S |
| 46 | AUTH-15 | Medium | C | Auth | `auth.config.ts` | Dead `authorized()` callback | S |
| 47 | API-3 | Medium | C | API | reviews/fatwa/waiver routes | No validation; unauthenticated spam | S |
| 48 | API-4 | Medium | C | API | all list routes | `pageSize` unclamped; NaN → 500 | S |
| 49 | API-5/6 | Medium | C | API | `payments/submit` | Validation inconsistent with web; coupon auto-apply | S |
| 50 | CRS-2 | Medium | C | Teacher portal | `teacher-portal.ts:75,87-104` | Pending applicants' PII shown; dead message links | S |
| 51 | CRS-3 | Medium | C | Courses | `courses/actions.ts:165-169` | Course delete non-transactional; orphans; R2 leak | M |
| 52 | CRS-4 | Medium | C | Teachers | `teachers/actions.ts:121-138` | Teacher delete unguarded | S |
| 53 | CRS-5 | Medium | C | Students | `students/actions.ts`; `validations.ts:424` | Weak admin student schema; unchecked casts | S |
| 54 | CRS-6 | Medium | C | Courses | `courses/actions.ts:130` | Status sync on every save; un-completes cohorts | S |
| 55 | CRS-7 | Medium | C | Enrollment | `roll-numbers.ts:21-45` | Roll number race | S |
| 56 | CRS-8 | Medium | C | Enrollment | `enrollments/actions.ts` | Notify before delete; hard-delete rejections | S |
| 57 | GRD-3 | Medium | C | Grades | `actions/grades.ts:57-68`; `GradeForm.tsx` | No validation of marks/maxMarks; blank = 0 | S |
| 58 | GRD-4 | Medium | C | Teacher | `app/teacher/courses/**` | 9 pages outside portal layout | S |
| 59 | GRD-5 | Medium | C | Teacher | same pages | Forbidden → error boundary | S |
| 60 | ANN-2 | Medium | C | Announcements | `announcements/actions.ts:127,222` | Cannot edit/delete unpublished | S |
| 61 | NTF-1 / ANN-3 | Medium | C | Notifications | `notifications.ts:218-230,375-377` | Per-user upserts & revalidations | S |
| 62 | NTF-2 | Medium | C | Notifications | device-token route | Push never sent | L |
| 63 | PAY-7 | Medium | C | Receipts | `receipts.ts:40-87` | Non-atomic receipt generation; random invoice numbers | M |
| 64 | PAY-8 | Medium | C | Coupons | `coupons/actions.ts` | Unvalidated approve; weak codes; no status guard; silent clamp | M |
| 65 | PAY-9 | Medium | C | Payments | `payments/actions.ts` | Unvalidated `returnTo` redirect | S |
| 66 | PAY-10 | Medium | P | Finance | `finance-filters.ts:70-74` | Date filter TZ drift | S |
| 67 | PAY-11 | Medium | C | Finance | `record-payment/actions.ts:42-48` | Email normalisation mismatch | S |
| 68 | PAY-12 | Medium | C | Waiver | `actions/waiver.ts` | Unvalidated course; fee type in reason string | S |
| 69 | PAY-13 | Medium | C | Finance | expense category | Custom categories unfilterable | S |
| 70 | BKS-4 | Medium | C | Bookstore | 3 files | Shipping slab gaps → ₹0; duplicated ×3 | S |
| 71 | BKS-5 | Medium | C | Bookstore | checkout page; schemas | Unvalidated `?books=`; no quantity max | S |
| 72 | BKS-6 | Medium | C | Bookstore | `bookstore/actions.ts:145` | Wrong arg to `deleteBookImage` | S |
| 73 | BKS-7 | Medium | C | Bookstore | 4 files | PaymentRecord↔order by description string | M |
| 74 | BKS-8 | Medium | C | Bookstore | `deleteBook` | Cascades historical order lines | S |
| 75 | BKS-9 | Medium | C | Finance | `finance-bookstore.ts` | Revenue/profit inconsistency; ignored filters | M |
| 76 | BKS-10 | Medium | C | Bookstore | action vs API | Pipeline duplicated; cart not cleared; orphan screenshot | M |
| 77 | DOC-5 | Medium | C | Documents | `pdf-generator.ts:227` | Tailwind CDN / Google Fonts at render | M |
| 78 | DOC-6/7 | Medium | C | Certificates | form + table | Decimal grade vs Int; lowercase literal | S |
| 79 | DOC-8 | Medium | C | Documents | receipt route | DB before auth; Chromium per hit | S |
| 80 | DOC-9 | Medium | P | Documents | 3 routes | Raw name in Content-Disposition | S |
| 81 | DOC-10 | Medium | C | Receipts | 2 files | Shipping recomputed at render | S |
| 82 | DOC-11 | Medium | C | Deps | `package.json` | Full puppeteer in prod deps | S |
| 83 | CNT-4 | Medium | C | Blog/Contact | several | Unbounded comments; no rate limit; double fetch | M |
| 84 | CNT-5 | Medium | C | Fatwa | `fatwa.ts:9-12` | Email oracle via search | S |
| 85 | CNT-6 | Medium | C | SEO | `sitemap.ts`; `robots.ts` | 404 library URLs; dynamic sitemap; robots mismatch | S |
| 86 | CNT-7 | Medium | C | Blog | teacher actions | Editing approved post unpublishes it silently | S |
| 87 | CNT-8 | Medium | C | Fatwa | admin actions | Re-email on every edit; inline SMTP | S |
| 88 | CNT-9 | Medium | C | Uploads | blog/library mutations | Non-transactional image handling | M |
| 89 | UI-1 | Medium | C | Caching | `app/layout.tsx:12` | Site-wide `force-dynamic` | M |
| 90 | INF-10 | Medium | C | Database | schema | No unique on UTR | S |
| 91 | INF-11 | Medium | C | Database | schema | Missing/redundant indexes | S |
| 92 | INF-12 | Medium | C | Database | schema | Float marks; Teacher↔User by email | M |
| 93 | INF-13 | Medium | C | Seeds | `package.json:18-20` | `prisma.seed` destructive; README wrong | S |
| 94 | INF-14 | Medium | C | Seeds | `seed-bootstrap.ts:166-186` | Fake bank details seeded | S |
| 95 | INF-15 | Medium | C | Errors | `db-error.ts`; `action-utils.ts` | Generic errors; message in URL | M |
| 96 | INF-16 | Medium | C | Prisma | `utils/prisma.ts` | Cache-key hack; no pooling config | S |
| 97 | INF-17 | Medium | C | Config | `utils/s3.ts` | Silent empty credentials | S |
| 98 | INF-18 | Medium | C | Config | `next.config.ts:13-17` | 50 MiB action body limit | S |
| 99 | AUTH-16…20, API-7/8, CRS-9…12, GRD-6…8, ANN-4…6, PAY-14…16, BKS-11…13, DOC-12, CNT-10, NTF-3, UI-2…5, INF-19…22 | Low | C/P | various | see Section 3 | Quality, hygiene, UX, a11y, duplication, dead code, docs | S–L |

---

## 7. Phase-wise implementation plan

Principles: smallest safe change first; no new frameworks beyond a rate-limit store, a sanitiser and a test runner; each task names its dependencies so work can be parallelised. Complexity: S/M/L/XL as above.

### 7.0 Production database safety constraints (binding for every task below)

The system is **live in production** with real students, payments and invoices. Every task in this plan is therefore constrained as follows; a task that cannot meet these rules is split or deferred, never forced.

1. **No destructive DDL in this plan.** No `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `db push --accept-data-loss` against production. Columns and tables that become obsolete are left in place and listed in a "contract later" backlog (Appendix E) to be removed in a separate release after at least one full billing cycle of verification.
2. **Expand / contract for every type change.** Converting a column's type (status strings → enums, `Float` → `Decimal`, string dates → dates) is done by adding a **new nullable column**, backfilling it in batches, switching the code to read the new column with a fallback to the old one, and only later (outside this plan) dropping the old column. No `ALTER COLUMN … TYPE … USING` on populated tables.
3. **Additive, idempotent migrations only.** Every migration uses `IF NOT EXISTS` / `DO $$ … EXCEPTION WHEN duplicate_object` guards so it is a no-op on a database that was previously synchronised with `db push`. New `NOT NULL` columns always carry a default. New foreign keys are added as `NOT VALID` and validated in a separate statement so they do not lock the table while scanning.
4. **Data-correction scripts are dry-run by default.** Every script that rewrites existing rows (`recompute-receipt-gst`, `backfill-payment-records`, `backfill-book-order-links`, coupon-request fee-type backfill, status backfills) prints a full before/after report and exits unless `--apply` is passed; the report is attached to the change ticket and reviewed by the academy's finance owner before `--apply`.
5. **Rehearse on a Neon branch of production** before any Phase 1 release: branch the production database, run `migrate deploy` plus every script with `--apply` against the branch, run the integration suite against it, and diff row counts and finance totals. Only then deploy to production.
6. **Backups and rollback.** Confirm Neon point-in-time restore is enabled and perform a restore drill before task 1.1. Every migration has a documented rollback (for additive migrations, "leave in place"; for data scripts, the before-snapshot the script writes to `scripts/out/`).
7. **Pre-flight introspection.** Before writing the corrective migration (task 1.1) run `prisma migrate diff --from-url <production-pooler-url> --to-schema-datamodel prisma/schema.prisma --script` from a read-only session against a Neon branch. That output, not an assumption, decides what the corrective migration contains, and confirms whether `DeviceToken` and `UserCartItem` currently exist in production (the review could not verify this from source).
8. **Deploy windows.** Any migration that takes an exclusive lock on `Enrollment`, `CoursePaymentSubmission`, `PaymentRecord` or `User` (adding indexes with `CREATE INDEX CONCURRENTLY` avoids this; FK validation and backfills are batched) is deployed during the academy's announced low-traffic window.
9. **Application compatibility during rollout.** Code must tolerate both the old and the new column/value shape for one release (fallback reads), so a deploy can be rolled back without a schema rollback. Mobile API responses keep old field names as aliases for one release.
10. **Phase 0 touches no data.** All Phase 0 tasks are code-only except the rate-limit bucket table (additive) — Phase 0 can be deployed without any database rehearsal.

### Phase 0 — Stop the bleeding (security hotfixes; ~1 week; deploy as one release)

| Task | Fixes | Depends on | Cx |
|---|---|---|---|
| 0.1 Delete `app/api/dev/seed/route.ts`; remove `VERCEL_GIT_COMMIT_REF==="dev"` bypass from `seed-demo.ts`; require an explicit `SEED_DB_HOST_ALLOWLIST` match. | AUTH-1, INF-3 | — | S |
| 0.2 Replace `vercel-build:staging`'s seed step with nothing (seed manually); keep `db push` only for preview envs with their own DB. | INF-3 | 0.1 | S |
| 0.3 Verify Google ID tokens with `google-auth-library` (`audience`, `issuer`, `email_verified`, expiry) in `/api/v1/auth/google`. | AUTH-2 | — | S |
| 0.4 Throw on missing `AUTH_SECRET`; remove the fallback string. | AUTH-3 | — | S |
| 0.5 Forgot-password: emit `debugLink` only when `NODE_ENV!=="production"`; always generic 200. | AUTH-4, AUTH-18 | — | S |
| 0.6 Add `escapeHtml` (`utils/html-escape.ts`) and apply to every interpolation in `utils/*-html.ts` and `services/email/templates/*.ts`; disable JS in the PDF page (`setJavaScriptEnabled(false)`) and add request interception allow-list. | DOC-1, DOC-4 | — | M |
| 0.7 Restrict `user.image` to R2/googleusercontent URLs in `pdf-generator.ts` and in `/api/v1/auth/me` (reuse `profileUpdateSchema` + image rule); path-join guard. | DOC-2, API-2 | — | S |
| 0.8 Add server-side sanitiser (`sanitize-html`, allow-list) in `parseBlogForm`, `parseTeacherBlogForm`, `fatwaAnswerSchema` transform, and on read in the three `dangerouslySetInnerHTML` sinks; sanitise before `innerHTML` in `RichTextEditor`; validate `createLink` scheme. | CNT-1 | — | M |
| 0.9 Escape `<`,`>`,`&` in `JsonLd`; strip HTML for `acceptedAnswer.text`. | CNT-2 | — | S |
| 0.10 `/api/v1`: stop accepting the session cookie (Bearer only) **or** enforce `Origin`/`Sec-Fetch-Site`; restrict CORS origins. | AUTH-5 | — | S |
| 0.11 Security headers in `next.config.ts` (`HSTS`, `nosniff`, `Referrer-Policy`, `frame-ancestors 'none'`); basic CSP (report-only first). | INF-7 | 0.8 (inline scripts) | S |
| 0.12 Scope grades to course (`findFirst/updateMany/deleteMany` with `courseId`); validate `records[].enrollmentId ∈ course`. | GRD-1, GRD-2 | — | S |
| 0.13 Remove `email` from public blog selects; restrict public fatwa search fields. | CNT-3, CNT-5 | — | S |
| 0.14 Require active enrollment for announcements in `/api/v1/courses/[id]`. | API-1 | — | S |
| 0.15 Upgrade `next`, `next-auth`, `@auth/prisma-adapter`, `zod`, `puppeteer*`; run `npm audit`. | INF-6 | — | M |
| 0.16 `isSafeInternalPath()` for all `callbackUrl` handling. | AUTH-10 | — | S |
| 0.17 Rate limiting middleware (Upstash Ratelimit or DB counter) on auth routes, contact, fatwa ask, comments, document downloads. | AUTH-6, CNT-4, DOC-8 | — | M |

### Phase 1 — Data integrity, migrations and financial correctness (~2–3 weeks)

| Task | Fixes | Depends on | Cx |
|---|---|---|---|
| 1.1 **Migration baseline (prod-safe):** pre-flight introspection of production per 7.0(7); generate the corrective migration from that diff with every statement guarded (`IF NOT EXISTS`) so it is a **no-op on production** and a full build on a fresh DB; delete `fix-migration-lock.ts`; `vercel-build = prisma generate && prisma migrate deploy && next build`; verify `_prisma_migrations` on production already lists the 7 historical migrations with matching checksums (the repair script inserted them) and use `migrate resolve --applied` only for any that are missing; add CI drift check. Rehearse on a Neon branch first. | INF-1, INF-2, INF-4 | Phase 0 deployed; PITR drill done | M |
| 1.2 Non-destructive `prisma/seed.ts` (bootstrap upserts only); point `prisma.seed` at it; remove bank-detail seeding; random demo passwords; fix README. | INF-13, INF-14, INF-22 | 1.1 | S |
| 1.3 Coupon selection: never auto-apply; forms always send `couponId`; API same. | PAY-1, API-6 | — | S |
| 1.4 Payment submission in one `$transaction` (duplicate check, create, coupon usage, screenshot path); partial unique index on `upiTransactionId`; unique `(userId, courseId, label)` where status ≠ declined; make 100%-waiver approval an explicit admin step or setting. | PAY-2, INF-10 | 1.1 | M |
| 1.5 Remove `ensurePaymentRecordsForItems` from reads; one-off backfill script. | PAY-3 | 1.1 | S |
| 1.6 GST = total × 18/118 for **new** receipts; dry-run script reports every already-issued GST receipt with current vs corrected split (no write without `--apply`, and only after the finance owner decides whether issued invoices may be corrected or must be re-issued as credit notes); sequential invoice numbers per FY via counter table inside the transaction, **starting after the highest existing number and never renumbering issued invoices**; `updateMany` guard on generation. | PAY-4, PAY-7 | 1.1 | M |
| 1.7 Replace hard deletes with void/soft-delete: add nullable `PaymentRecord.voidedAt/voidReason`, `CoursePaymentSubmission.deletedAt`, `BookOrder.deletedAt`, `User.deletedAt` (additive columns only; existing rows untouched); change `onDelete: Cascade` → `Restrict` on money/grade relations (constraint swap only, no data change, rehearsed on a branch); add `AuditLog { actorId, action, entity, entityId, before, after, at }` written by every admin mutation. | PAY-5, PAY-6, CRS-1, INF-9 | 1.1 | L |
| 1.8 Bookstore: atomic approval (`updateMany` guard), refund voids the record and restores stock, inventory enforcement at order + approval, `PaymentRecord.bookOrderId` FK, shared `computeShippingCharge()`, single `createBookOrder()` service for web+API, quantity caps, fix `deleteBookImage` argument, allow SHIPPED→REFUNDED. | BKS-1…10, BKS-13 | 1.7 | L |
| 1.9 Add `Course` relations (`Restrict`) on `Enrollment` and `CoursePaymentSubmission`: orphan report first (dry-run); orphans are resolved by the academy (re-point or archive) **before** the FK is added as `NOT VALID` and then `VALIDATE CONSTRAINT` separately; course/teacher delete guards and transactions; R2 cleanup on delete. | INF-5, CRS-3, CRS-4 | 1.1 | M |
| 1.10 Coupon admin actions: Zod on approve/create/update, `crypto.randomInt` codes with P2002 retry, status guards, allow future `validFrom`, type-specific editable fields; `feeType` column replacing the reason-string protocol. | PAY-8, PAY-12 | 1.1 | M |
| 1.11 Roll-number assignment with row lock/counter + retry; enrollment rejection as status not delete; notify after commit. | CRS-7, CRS-8 | 1.7 | S |
| 1.12 Finance date handling: local-part serialisation, pinned `Asia/Kolkata`; apply filters to book sales; separate shipping revenue/cost; fix record-payment email lookup; expense category enum. | PAY-10, PAY-11, PAY-13, BKS-9 | — | M |
| 1.13 Status enums via **expand/contract**: create enum types; add new nullable columns (`Enrollment.statusEnum`, `CoursePaymentSubmission.statusEnum/paymentTypeEnum/paymentMethodEnum`, `PaymentRecord.paymentTypeEnum`, `Enrollment.certificateTypeEnum`, `DeviceToken.platformEnum`, `Coupon.genderEnum`); batched backfill script (dry-run default); application code writes both and reads the enum column with fallback to the string; old text columns and the `"FEE-WAIVER"` sentinel are retired in the contract backlog (Appendix E), not in this plan. | INF-8, CRS-11, DOC-7 | 1.1 | L |
| 1.14 Indexes from INF-11 created with `CREATE INDEX CONCURRENTLY` (Prisma migration with the statement outside a transaction); redundant indexes dropped (index drops are safe); `marksObtainedDecimal Decimal(6,2)` added alongside `marksObtained` (expand/contract); `certificateGrade` integer rule in code; `Teacher.userId` nullable FK backfilled by email. | INF-11, INF-12, DOC-6 | 1.1 | S |

### Phase 2 — Authorization hardening, API parity and robustness (~2 weeks)

| Task | Fixes | Depends on | Cx |
|---|---|---|---|
| 2.1 Per-page auth: `requireAdmin()`/`requireTeacher()`/`requireUser()` first line of every page (or in loaders); wire Auth.js into `middleware.ts` so `authorized()` is live; move `requireX` helpers out of `"use server"`. | AUTH-8, AUTH-12, AUTH-15 | — | M |
| 2.2 Role freshness: re-resolve role in the `jwt` callback; refresh `emailVerified`; shorter session max age. | AUTH-9, AUTH-14 | — | S |
| 2.3 Google linking: `allowDangerousEmailAccountLinking=false` + `signIn` callback handling unverified credentials rows; require `emailVerified` for credentials login. | AUTH-7 | — | S |
| 2.4 Separate API token issuer/salt, access+refresh tokens, revocation table; register/login Zod schemas; remove cookie fallback (if not done in 0.10). | AUTH-11, AUTH-13 | 2.2 | M |
| 2.5 `/api/v1` validation parity: share Zod schemas with web actions (profile, reviews, fatwa, waiver, payments); clamp `page/pageSize`; DTO helpers. | API-3, API-4, API-5, API-8 | — | M |
| 2.6 Teacher portal: filter rosters/detail to active+completed; move `app/teacher/courses/**` under `(portal)`; `notFound()` on unowned course; add `deleteStudentCourseAnnouncement`. | CRS-2, GRD-4, GRD-5, ANN-1 | — | M |
| 2.7 Grade/attendance validation (Zod in actions, nullable marks for "not graded", `timeZone:"UTC"` formatting, local default date). | GRD-3, GRD-6 | 1.14 | M |
| 2.8 Admin student edit: reuse `profileUpdateSchema`, native enums, bail on null, protect developer/admin rows, confirm photo deletion; site-announcement admin getters. | CRS-5, AUTH-20, ANN-2 | — | S |
| 2.9 Course status sync only on change with COMPLETED guard. | CRS-6 | — | S |
| 2.10 Error handling: `withDbErrorHandling` maps P2002/P2025/P2003 to typed errors; one `executeServerAction` returning `{error}` or redirecting with opaque codes; `ConfirmationModal` surfaces errors; teacher blog actions use the wrapper. | INF-15, CRS-9, CRS-10, CNT-10 | — | M |
| 2.11 Uploads: validate-all → upload → write in transaction for blog/library/announcements; delete old objects after success; signed URLs for private attachments; MIME sniffing. | CNT-9, ANN-4, ANN-5, AUTH-16 | — | M |
| 2.12 Content workflow: lock approved teacher posts (or confirm unpublish); email asker only on first answer; emails via `after()` everywhere; block like/comment on unpublished posts; comment length cap. | CNT-7, CNT-8, CNT-10, NTF-3 | 0.17 | S |

### Phase 3 — Testing and CI (~2 weeks, can start in parallel with Phase 1)

| Task | Depends on | Cx |
|---|---|---|
| 3.1 Add Vitest; unit tests for `calculateDiscountedAmount`, `getSelectedCoupon`, shipping slab resolution, GST/receipt math, `finance-filters`, `buildMonthlyFeeLabel`, status helpers, `isSafeInternalPath`, sanitiser allow-list, all Zod schemas (positive/negative). | 1.3, 1.6, 1.8 | M |
| 3.2 Integration tests against a disposable Postgres (Testcontainers or Neon branch): payment submit→approve→receipt, enrollment lifecycle, roll numbers under 10 concurrent approvals, book order state machine incl. refund/inventory, notification fan-out dedupe, course/teacher/student delete guards. | 1.x | L |
| 3.3 API tests for every `/api/v1` route: auth required, Bearer vs cookie, validation errors, pagination clamps, IDOR attempts, CSRF (cross-origin cookie POST rejected). | 2.4, 2.5 | M |
| 3.4 Security regression tests: XSS payloads through blog/fatwa/JSON-LD/PDF/email templates; GRD-1 cross-course access; open redirect vectors; `/api/dev/seed` absent. | Phase 0 | S |
| 3.5 Playwright e2e: register → verify → complete profile → enrol → pay → admin approve → receipt download; teacher attendance + grades; bookstore checkout → approve → ship. | 3.2 | L |
| 3.6 GitHub Actions: `tsc --noEmit`, `eslint`, `knip`, `prisma migrate diff --exit-code`, `npm audit --audit-level=high`, unit+integration tests on PR; branch protection; remove `.agents/AGENTS.md` auto-push rule. | 3.1 | S |

### Phase 4 — Performance, maintainability and product completeness (~3 weeks)

| Task | Fixes | Depends on | Cx |
|---|---|---|---|
| 4.1 Remove root `force-dynamic`; ISR (`revalidate`) for home, courses, blog, fatwa, library, sitemap; tag-based revalidation from actions; move session-dependent testimonial logic client-side. | UI-1, CNT-6 | 2.1 | M |
| 4.2 Query fixes: `_count` for likes/comments + paginated comments; `cache()` getters; SQL-side waiver filtering; `count()` for inactive tabs; memoised settings; per-course counts on teacher page; `createMany` notification fan-out; single revalidate. | CNT-4, PAY-14, PAY-15, NTF-1 | — | M |
| 4.3 PDF pipeline: precompiled Tailwind CSS + self-hosted fonts inlined; pin chromium pack to installed major (self-hosted tarball); `maxDuration`; generate once → store in R2 → serve cached; auth before DB; safe `Content-Disposition`; pooled SMTP with retry. | DOC-3, DOC-5, DOC-8, DOC-9, DOC-10, DOC-12 | — | L |
| 4.4 Dedupe: shared attendance/grade page bodies; one `authorizeCourseManagement`; one announcement card/action runner; `formatPrice` single export; `AdminListPage` shell; CRUD action factory for the seven admin modules; upload helper; sidebar component. | GRD-8, ANN-6, PAY-16, UI-2 | 2.x | L |
| 4.5 Dead code & deps: remove `components/ui/*` unused files, `scratch/`, `receipt.*`, `authorized()`, `startDelayMs`, `BOOK_ORDER` constant, `ROLES`; move `puppeteer` to dev + dynamic import; drop `@vercel/*` or wire them; `engines`; knip in CI; `.env.example` regenerated. | DOC-11, INF-19…21, UI-3 | 3.6 | S |
| 4.6 White-label: route all brand strings (`DQA` prefixes, sw.js, receipts, legal pages, schema defaults) through `BRAND_CONFIG`; move developer credits to config/env. | UI-5 | — | M |
| 4.7 Product gaps: FCM sender (`firebase-admin`) hooked into `createStudentNotification*`; order detail page; library item page or remove links; real unsubscribe endpoint; notification labels for missing types; a11y fixes; copy fixes. | NTF-2, BKS-11, CNT-10, UI-4 | — | L |
| 4.8 Prisma client: standard global singleton; Neon driver adapter or `connection_limit`; fail-fast R2 config; default action body limit + presigned uploads. | INF-16, INF-17, INF-18 | — | S |

### Recommended execution order and parallelism

1. **Week 1:** Phase 0 entirely (two engineers: one on 0.1–0.5/0.10/0.11/0.15–0.17, one on 0.6–0.9/0.12–0.14). Release.
2. **Weeks 2–4:** Phase 1 (1.1 first — everything else in Phase 1 lands as migrations on top of the new baseline), with Phase 3.1/3.6 started in parallel so new logic ships with tests.
3. **Weeks 5–6:** Phase 2 and Phase 3.2–3.4.
4. **Weeks 7–9:** Phase 4 and Phase 3.5.

Critical path: 0.x → 1.1 → 1.7 → 1.8 → 3.2 → 3.5.

---

## 8. Production-readiness checklist

**Blocking (must be green before any public launch)**
- [ ] `app/api/dev/seed` removed; no code path can truncate tables from HTTP or from a build (AUTH-1, INF-3).
- [ ] Migration history regenerated and verified with `prisma migrate diff --exit-code`; `fix-migration-lock.ts` deleted; `migrate deploy` observed applying a migration in staging (INF-1, INF-2).
- [ ] Google ID-token audience/issuer/email_verified verified (AUTH-2).
- [ ] Rich-text sanitised on write and read; JSON-LD escaped; CSP deployed (CNT-1, CNT-2, INF-7).
- [ ] All PDF and email templates escape user input; PDF page JS disabled and network allow-listed; `user.image` restricted (DOC-1, DOC-2, DOC-4).
- [ ] No hardcoded secrets; app fails to start without `AUTH_SECRET`, `DATABASE_URL`, `R2_*`, SMTP in production (AUTH-3, INF-17).
- [ ] Reset/verification links never returned to the client in production (AUTH-4).
- [ ] `/api/v1` immune to cookie CSRF; CORS restricted (AUTH-5).
- [ ] Rate limiting on auth and public forms (AUTH-6).
- [ ] Grade/attendance writes scoped to course (GRD-1, GRD-2).
- [ ] Coupon never auto-applied; payment submission transactional; GST math fixed and historical receipts corrected (PAY-1, PAY-2, PAY-4).
- [ ] No read path writes to the database (PAY-3).
- [ ] Refund reverses income; approval atomic; inventory enforced (BKS-1…3).
- [ ] Financial records cannot be hard-deleted; audit log present (PAY-5, PAY-6, INF-9).
- [ ] Dependencies with critical/high advisories upgraded (INF-6).
- [ ] Demo seed cannot run against production; no demo passwords on real admin emails; no fake bank details (INF-3, INF-13, INF-14).

**Strongly recommended before launch**
- [ ] Per-page auth checks + middleware auth (AUTH-8); role re-resolution (AUTH-9); safe redirects (AUTH-10).
- [ ] `Enrollment`/`CoursePaymentSubmission` → `Course` FKs; status enums; indexes (INF-5, INF-8, INF-11).
- [ ] Teacher portal roster filtered; teacher pages inside the portal layout; private-message delete works (CRS-2, GRD-4, ANN-1).
- [ ] Unit + integration + API test suites running in CI; drift and audit checks in CI (Phase 3).
- [ ] Security headers verified with an external scanner; `npm audit` clean at high.
- [ ] Error handling unified; no raw error text in URLs (INF-15).
- [ ] PDF generation does not depend on github.com / Tailwind CDN at runtime; `maxDuration` set (DOC-3, DOC-5).
- [ ] Public pages cached (ISR); homepage ≤ 3 queries (UI-1).
- [ ] Monitoring: error tracking (e.g. Sentry) and structured logs for payment/enrollment actions; alert on failed emails.
- [ ] Backups: Neon PITR enabled and a restore drill performed before the migration baseline (1.1).
- [ ] Every Phase 1 release rehearsed on a Neon branch of production with row-count and finance-total diffs attached (7.0 rule 5).
- [ ] No migration in the release contains `DROP TABLE`, `DROP COLUMN`, `TRUNCATE` or `ALTER COLUMN … TYPE` on a populated table (7.0 rules 1–2); confirmed by `scripts/check-migration-safety.sh` in CI.
- [ ] All data-correction scripts were run in dry-run mode, reports reviewed by the finance owner, and only then applied (7.0 rule 4).

**Nice to have**
- [ ] Push notifications implemented or endpoint documented as reserved (NTF-2).
- [ ] Duplicate code consolidated (Phase 4.4); dead code removed (4.5).
- [ ] White-label strings centralised (4.6); README and `.env.example` accurate.
- [ ] Accessibility pass (UI-4).

---

## 9. Appendices

### Appendix A — Pages relying solely on layout authorization (AUTH-8)

Admin (no `requireAdmin()` in the page): `announcements/{page,new,[id]/edit}`, `blog-approvals/{page,[id]}`, `blogs/{page,new,[id]/edit}`, `bookstore/{page,new,orders,[bookId],[bookId]/edit}`, `certificates/page`, `completed-payments`, `contact-inquiries/{page,[id],[id]/reply}`, `coupons/finance`, `courses/{page,new,[id]/edit,[id]/students}`, `daily-inspiration/{page,new,[id],[id]/edit}`, `enrollments/page`, `fatwa/{page,[id]}`, `finance/{page,bookstore}`, `library/{page,new,[id],[id]/edit}`, `payments/page`, `receipts/page`, `review-approvals/{page,[id],[id]/edit}`, `students/{page,[id],[id]/edit}`, `teachers/{page,new,[id],[id]/edit}`, `transactions/page` (48 pages). Also `app/teacher/(portal)/blogs/new/page.tsx`, `app/profile/cart/checkout/page.tsx`, `app/developer/page.tsx`.

Pages that **do** self-protect: `admin/page`, `admin/certificates/{new,[enrollmentId]}`, `admin/coupons/page`, all `admin/courses/[id]/{announcements,attendance,grades}/**`, `admin/payment-settings`, `admin/receipts/[id]`, `admin/shipping-charges`, `admin/students/[id]/id-card`, every `app/profile/**` page except checkout, every `app/teacher/**` page except `blogs/new` (the 9 `app/teacher/courses/**` pages self-protect and verify ownership through the action helpers).

### Appendix B — Schema ↔ migration drift (INF-1)

| Object in `schema.prisma` | Created by any migration? |
|---|---|
| enum `Gender`, `CouponType`, `CouponRequestStatus` | **No** |
| enum value `StudentNotificationType.BLOG_COMMENT_ADDED` | **No** |
| `User.gender`, `User.policiesAcceptedAt`, `User.policiesAcceptedVersion` | **No** |
| `PaymentSettings.includeGstByDefault`, `PaymentSettings.feeWaiverEnabled` | **No** |
| `CoursePaymentSubmission.couponId` (+ index + FK → Coupon) | **No** |
| tables `BlogLike`, `BlogComment` | **No** |
| tables `Coupon`, `CouponRequest`, `CouponUsage` | **No** |
| tables `DeviceToken`, `UserCartItem` | **No** |
| `CourseStatus.COMING_SOON`, `FeeFrequency`, `FatwaApprovalStatus`, certificate/receipt fields, `registrationNumber`, `rollNumber`, shipping/tracking fields, `Book.mrp/purchasePrice/weight/inventory`, attendance/grade tables | Yes |
| `AcademySettings`, `AnalyticsEvent`, `SocialLinksSettings` | Created then dropped (data lost, INF-4) |

Timeline: last migration 2026-07-05 (edited 2026-07-25); schema commits after it: 2026-07-06 (blog like/comment), 07-18 (gender/profile), 07-20 (policies, payment settings), 07-21…07-23 (coupons), 09-01 (device tokens), 09-09 (cart). Pipeline switched from `db push --accept-data-loss` to `fix-migration-lock + migrate deploy` on 2026-07-25.

### Appendix C — Environment variables

| Variable | Used in | In `.env.example` |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | `prisma/schema.prisma` | yes |
| `AUTH_SECRET` | `services/auth.config.ts`, `services/api-auth.ts` | yes |
| `NEXTAUTH_SECRET` | `services/api-auth.ts` (fallback) | **no** |
| `AUTH_URL` | `services/password-reset.ts` | yes |
| `NEXTAUTH_URL` | — (unused) | yes |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | `auth.config.ts`, login/register pages | yes |
| `ADMIN_EMAIL`, `DEVELOPER_EMAIL` | `services/admin.ts`, `developer.ts`, email templates | yes |
| `SMTP_HOST/USER/PASS/PORT`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | `services/email/core.ts`, forgot-password route | yes |
| `R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET_NAME/PUBLIC_URL` | `utils/s3.ts`, `next.config.ts` | yes |
| `ALLOW_DEMO_SEED`, `PRISMA_LOG_QUERIES`, `NEXT_PUBLIC_APP_URL` | seeds, `utils/prisma.ts`, teacher fatwa action | commented |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `GoogleAnalytics.tsx` | yes |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION` | — (unused) | yes |
| `VERCEL`, `VERCEL_ENV`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `NEXT_PUBLIC_VERCEL_*` | pdf-generator, layout/manifest, seeds, password-reset | **no** (system vars; `VERCEL_GIT_COMMIT_REF` is used as a security gate) |

### Appendix D — Dependency notes

| Package | Status |
|---|---|
| `puppeteer` | Used only off-Vercel; in prod deps; statically imported → devDependency + dynamic import. |
| `puppeteer-core`, `@sparticuz/chromium-min` | Used; pack URL pinned to v133 vs `^149` installed. |
| `pdf-lib` | devDependency but executed by the staging build seed. |
| `xlsx@0.18.5` | Used by finance export; unmaintained on npm with open advisories → `exceljs`. |
| `@vercel/analytics`, `@vercel/speed-insights` | Installed, never imported. |
| `qrcode`, `react-markdown`, `date-fns`, `clsx`, `tailwind-merge`, `bcryptjs`, `nodemailer`, `zod` | Used. `nodemailer` 7 has open advisories (fix in v10). |
| `next-auth@5.0.0-beta.31` | Beta in production; advisories fixed in beta.32. |
| Missing | `engines` field; test runner; sanitiser; rate limiter; error tracking. |

### Appendix E — "Contract later" backlog (deferred destructive changes)

These are the only schema removals implied by the plan. None is executed in this plan; each is scheduled for a separate release after one full billing cycle on the new columns and a verified backup.

| Object | Replaced by | Earliest removal |
|---|---|---|
| `Enrollment.status` (text) | `Enrollment.statusEnum` | After 1.13 has run for one billing cycle |
| `CoursePaymentSubmission.status/paymentType/paymentMethod` (text) | `*Enum` columns | same |
| `PaymentRecord.paymentType` (text) | `paymentTypeEnum` | same |
| `Enrollment.certificateType` (text) | `certificateTypeEnum` | same |
| `DeviceToken.platform` (text) | `platformEnum` | same |
| `Coupon.gender` (text) | `genderEnum` | same |
| `CourseGradeRecord.marksObtained` (Float) | `marksObtainedDecimal` | same |
| `upiTransactionId = 'FEE-WAIVER'` sentinel rows | `paymentMethodEnum = WAIVER` | after backfill verified |
| `PaymentRecord.description` "Book order #…" convention | `bookOrderId` FK | after backfill verified |
| `CouponRequest.reason` "[Fee Type: …]" suffix | `feeType` column | after backfill verified |
| Redundant indexes `Coupon(code)`, `DeviceToken(token)` | existing `@unique` | any time (index drop is non-destructive) |

### Appendix F — Verified-correct behaviours (no action needed)

Password reset token hygiene; email verification single-use/expiry; bcrypt cost; every server action checks auth; `returnTo` validation (except PAY-9); teacher ownership in portal/announcements; student data binding; per-student announcement isolation; public listings exclude drafts; featured-slot limits; paise rounding; server-side price recomputation; order state guards; XLSX string cells; upload key generation and delete prefix checks; `MarkdownText` safe; `browser.close()` in `finally`; document routes admin/owner gated; notification ownership filters; pagination clamping; search length cap; `.env` never committed; no raw SQL in request paths.

---

*End of report.*
