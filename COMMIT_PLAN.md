# Incremental Commit Plan — remediation of `LMS_CODE_REVIEW_AND_IMPLEMENTATION_PLAN.md`

**Branch:** all commits land directly on `dev` (currently identical to `master` @ `402ba9c`). No PR, no merge into `master` until the whole plan is reviewed.
**Status:** EXECUTED on `dev` (2026-11-03) except C74 (Playwright journeys, three of four passing, uncommitted in the batch-2 session), C75 (CI pipeline), C86 (env/README regeneration) and C87 (brand strings), which remain open. See "Execution notes and deviations" below for where the landed code differs from an entry.

## How to read this plan

- Commits are numbered `C01…C92` in the order they must be applied. Each commit is independently buildable (`npm run build` passes) and, from C67 onward, test-covered.
- **Issues** lists every register ID from the review that the commit closes (or partially closes, marked *part*). Appendix B at the end is the full ID → commit coverage matrix; every ID in the review's register appears there. Appendix A lists the destructive "contract" steps this plan deliberately defers.
- **Depends on** names earlier commits that must exist first. Commits without a dependency inside their phase can be reordered within the phase if convenient.
- **Verify** is the manual or automated check to run before committing.
- Commit messages use Conventional Commits. Bodies reference the review IDs so the git log cross-links to the report.
- Schema changes always ship as **Prisma migrations** (never `db push`), starting from the corrected baseline in C23.

Phase sizes: Phase 0 = 25 commits (security hotfixes), Phase 1 = 28 (data/finance integrity), Phase 2 = 16 (authorization, API parity, robustness), Phase 3 = 6 (tests & CI), Phase 4 = 17 (performance, dedupe, product gaps).

## Production database safety protocol (applies to every commit)

The application is **live in production**. The production database is never disturbed by this plan: no row is deleted, no column or table is dropped, no column type is changed in place, and no script rewrites existing rows without an explicit, reviewed `--apply`. Concretely:

| Rule | How the commits honour it |
|---|---|
| **P1. Additive, idempotent migrations only.** Every `migration.sql` uses `IF NOT EXISTS` / `DO $$ … EXCEPTION WHEN duplicate_object` guards and adds defaults to any `NOT NULL` column. | C21, C26, C30, C31, C34, C35, C36, C40, C42, C45, C48, C50, C51, C53, C58, C60, C64, C79, C80, C87 |
| **P2. No destructive DDL.** No `DROP TABLE/COLUMN`, `TRUNCATE`, `ALTER COLUMN … TYPE`, `db push`, `--accept-data-loss`. Obsolete columns stay in place and are tracked in Appendix A ("contract later"). CI check `scripts/check-migration-safety.sh` (C75) rejects such statements. | C51, C53 rewritten as expand/contract; C27 removes `db push` from all build scripts |
| **P3. Expand / contract for type changes.** New nullable column → batched backfill → code reads new with fallback to old → old column removed in a future release outside this plan. | C51, C52, C53 |
| **P4. Foreign keys added as `NOT VALID`, then `VALIDATE CONSTRAINT`.** No table-scanning lock while the FK is created; orphans are reported and resolved by the academy first. | C40, C45, C53 |
| **P5. Indexes created `CONCURRENTLY`.** Statement placed outside the migration transaction. | C21, C53 |
| **P6. Data scripts are dry-run by default.** `scripts/*.ts` print a before/after report and exit unless `--apply` is given; the report goes to the finance owner; the script snapshots affected rows to `scripts/out/<ts>.json` before writing. | C32, C33, C40, C45, C48, C51, C53 |
| **P7. Rehearse on a Neon branch of production** before each Phase 1 release: `migrate deploy`, scripts with `--apply`, integration suite, row-count and finance-total diff. | Execution notes, release points |
| **P8. Point-in-time restore verified** with a restore drill before C26 is deployed. | Execution notes |
| **P9. Dual-shape tolerance.** For one release the code tolerates old and new column/value shapes so an app rollback never requires a schema rollback. Mobile API keeps old field names as aliases. | C52, C58, C34, C51 |
| **P10. Phase 0 is data-free.** Only C21 adds a table (additive). Phase 0 can ship without DB rehearsal. | C01–C25 |
| **P11. Issued financial documents are never renumbered or silently altered.** New invoice sequences start after the highest existing number; GST corrections on issued receipts happen only on the finance owner's instruction. | C33, C34 |

Commits whose text originally implied in-place changes have been rewritten below (C26, C27, C33, C34, C36, C40, C45, C48, C51, C52, C53, C64, C87) — look for the **Prod-safety** line in each.

---

## Phase 0 — Security hotfixes (C01–C25)

Goal: remove every unauthenticated destruction/takeover vector and the XSS/SSRF class before anything else. Each commit is small and revertible. Phase 0 is intended to be deployed as one release as soon as it is reviewed.

### C01 `chore(seed): remove HTTP seed endpoint and dev-branch bypass; require DB host allowlist`
- **Description:** Delete `app/api/dev/seed/route.ts`. In `prisma/seed-demo.ts` remove the `VERCEL_GIT_COMMIT_REF === "dev"` bypass; replace `assertDemoSeedAllowed()` with a check that the `DATABASE_URL` host matches `SEED_ALLOWED_DB_HOSTS` (comma list) **and** `ALLOW_DEMO_SEED=true`. `runSeedDemo` becomes unexported (CLI only). Document the new env var in `.env.example`.
- **Issues:** AUTH-1, INF-3 *(part)*
- **Files:** `app/api/dev/seed/route.ts` (delete), `prisma/seed-demo.ts`, `.env.example`
- **Verify:** `GET /api/dev/seed?secret=seed123` → 404; `npm run db:seed:demo` refuses without allowlist.

### C02 `build: stop seeding and pushing schema from the staging build`
- **Description:** Replace `vercel-build:staging` with `prisma generate && prisma migrate deploy && next build`. Remove `--accept-data-loss` usage. Seeding of preview environments becomes a documented manual step (`npm run db:seed:demo` from a developer machine against the preview DB).
- **Issues:** INF-3
- **Files:** `package.json`, `README.md` (staging section)
- **Verify:** script no longer references `seed-demo` or `db push`.

### C03 `fix(auth): verify Google ID token audience, issuer and email_verified in mobile login`
- **Description:** Add `google-auth-library`; in `app/api/v1/auth/google/route.ts` replace the `tokeninfo` fetch with `OAuth2Client.verifyIdToken({ idToken, audience: AUTH_GOOGLE_ID })`; reject when `email_verified !== true`, when `iss` is not Google, or when `AUTH_GOOGLE_ID` is unset (503).
- **Issues:** AUTH-2
- **Files:** `app/api/v1/auth/google/route.ts`, `package.json`
- **Verify:** token minted for a different client id → 401; valid token → 200.

### C04 `fix(auth): fail fast when AUTH_SECRET is missing`
- **Description:** Remove the hardcoded fallback in `services/api-auth.ts`; export a `getAuthSecret()` that throws at module load in production and warns in development. Use it in `auth.config.ts` too.
- **Issues:** AUTH-3
- **Files:** `services/api-auth.ts`, `services/auth.config.ts`
- **Verify:** start without `AUTH_SECRET` in `NODE_ENV=production` → process exits with a clear message.

### C05 `fix(auth): never expose password-reset links in API responses`
- **Description:** In `app/api/auth/forgot-password/route.ts` only set `debugLink` when `NODE_ENV !== "production"`; return the generic 200 message even when SMTP send fails (log server-side); in production treat unconfigured SMTP as a 503 with a generic message. Remove the "Development Mode" link rendering from `ForgotPasswordForm.tsx` unless `debugLink` is present.
- **Issues:** AUTH-4, AUTH-18
- **Files:** `app/api/auth/forgot-password/route.ts`, `components/auth/ForgotPasswordForm.tsx`
- **Verify:** production build with SMTP unset → response body has no `debugLink`; unknown email and known email return identical bodies/status.

### C06 `feat(utils): add escapeHtml helper`
- **Description:** New `utils/html-escape.ts` exporting `escapeHtml(value: unknown): string` (escapes `& < > " '`, stringifies null/undefined to ""). Re-export from `services/email/layout.ts` so the email layer uses the same implementation. No call-site changes yet.
- **Issues:** DOC-1 *(prep)*, DOC-4 *(prep)*
- **Files:** `utils/html-escape.ts`, `services/email/layout.ts`
- **Verify:** quick node check of the five characters.

### C07 `fix(pdf): escape every interpolated value in the document HTML templates`
- **Description:** Apply `escapeHtml()` to all `${…}` of user- or DB-sourced strings in `utils/receipt-html.ts`, `certificate-html.ts`, `id-card-html.ts`, `grade-card-html.ts`, `attendance-card-html.ts` (names, addresses, phones, emails, course titles, labels, descriptions, terms). Server-built data URLs and numbers stay raw. Introduce a `SafeHtml` branded type for pre-rendered fragments to make the distinction explicit.
- **Issues:** DOC-1
- **Files:** the five `utils/*-html.ts`
- **Verify:** set a student address to `<img src=x onerror=alert(1)>`, generate a receipt → literal text in the PDF.

### C08 `fix(pdf): sandbox the Chromium page and restrict profile-image sources`
- **Description:** In `services/pdf-generator.ts`: `page.setJavaScriptEnabled(false)` after `setContent` is no longer possible with the Tailwind CDN, so instead enable `setRequestInterception(true)` and abort every request not matching an allow-list (`data:`, `cdn.tailwindcss.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, the R2 public host) until C77 inlines the CSS; in the image loader accept `http(s)` only from the R2 public host or `*.googleusercontent.com`, add `AbortSignal.timeout(5000)` and a 5 MB cap, derive MIME from magic bytes, and resolve local paths with `path.resolve` + prefix check against `public/`.
- **Issues:** DOC-1 *(network)*, DOC-2
- **Files:** `services/pdf-generator.ts`
- **Verify:** `user.image = "http://169.254.169.254/"` → blocked, PDF still renders; `"/../.env"` → rejected.

### C09 `fix(email): escape user-supplied content in all email templates`
- **Description:** Wrap every interpolated dynamic value in `services/email/templates/{communication,finance,enrollment,academic,bookstore,auth}.ts` with `escapeHtml`; multi-line bodies escape then convert `\n` → `<br>`. Add an ESLint `no-restricted-syntax` rule for raw `${` inside `services/email/templates/**` template literals that are not wrapped.
- **Issues:** DOC-4 (= CNT-4 email part)
- **Files:** `services/email/templates/*.ts`, `eslint.config.mjs`
- **Verify:** submit a fatwa with `<a href=x>` in the title → admin email shows literal text.

### C10 `fix(api): validate mobile profile updates with the shared profile schema`
- **Description:** `/api/v1/auth/me` PUT parses the body with `profileUpdateSchema.partial()` plus an `image` rule (`z.string().url()` restricted to the R2 public host or googleusercontent, or `null`); reject unknown keys; map Zod errors to 400.
- **Issues:** API-2
- **Files:** `app/api/v1/auth/me/route.ts`, `utils/validations.ts` (export `profileImageUrlSchema`)
- **Verify:** PUT `{ "image": "/../.env" }` → 400; `{ "occupation": "X" }` → 400.

### C11 `feat(security): add rich-text sanitiser and apply it on write`
- **Description:** Add `sanitize-html`; new `services/rich-text.ts` exporting `sanitizeRichText(html)` with an allow-list (p, h1–h3, ul, ol, li, blockquote, strong, b, em, i, u, a[href http(s)/mailto], br, span[dir], div[dir]; `style` limited to `color`; strip `on*`, script, style, iframe, svg). Apply in `parseBlogForm`, `parseTeacherBlogForm` (`services/blog-mutations.ts`) and in `fatwaAnswerSchema` via `.transform`.
- **Issues:** CNT-1 *(write path)*
- **Files:** `package.json`, `services/rich-text.ts`, `services/blog-mutations.ts`, `utils/validations.ts`
- **Verify:** save a blog body with `<script>` → stored without it.

### C12 `fix(xss): sanitise rich text on read and inside the editor`
- **Description:** Apply `sanitizeRichText` at the three `dangerouslySetInnerHTML` sinks (`app/blog/[id]/page.tsx`, `app/admin/blog-approvals/[id]/page.tsx`, `app/fatwa/[id]/page.tsx`) so legacy rows are safe; in `RichTextEditor.tsx` sanitise `value` before assigning `innerHTML` (client build of sanitize-html) and validate `createLink` input with `/^(https?:\/\/|mailto:)/i`.
- **Issues:** CNT-1 *(read path)*
- **Files:** three pages, `components/shared/RichTextEditor.tsx`
- **Verify:** existing row containing `<img onerror>` renders inert.

### C13 `fix(seo): escape JSON-LD output and strip HTML from structured answers`
- **Description:** `JsonLd.tsx` serialises with `JSON.stringify(data).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026")`; `services/seo-schema.ts` passes `stripHtml(fatwa.answer)` and truncates question/answer text.
- **Issues:** CNT-2
- **Files:** `components/site/JsonLd.tsx`, `services/seo-schema.ts`
- **Verify:** fatwa title `</script><script>alert(1)</script>` renders escaped in page source.

### C14 `fix(api): bearer-only authentication, origin check and restricted CORS for /api/v1`
- **Description:** `authenticateApiRequest` no longer falls back to `getToken` (cookies); `middleware.ts` reads allowed origins from `API_ALLOWED_ORIGINS` (default: none → no CORS headers) and rejects state-changing requests whose `Origin`/`Sec-Fetch-Site` indicates a cross-site browser request. Document the env var.
- **Issues:** AUTH-5
- **Files:** `services/api-auth.ts`, `middleware.ts`, `.env.example`
- **Verify:** cross-origin form POST with cookies → 401; Bearer flow unchanged.

### C15 `feat(security): add HTTP security headers and report-only CSP`
- **Description:** `next.config.ts` `headers()` with `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy`, and `Content-Security-Policy-Report-Only` (`default-src 'self'`, `img-src` incl. R2/Google, `script-src 'self' 'nonce-…'` via middleware nonce for `GoogleAnalytics`/`JsonLd`). Promote to enforcing in C73 after ISR work confirms no inline-script regressions.
- **Issues:** INF-7
- **Files:** `next.config.ts`, `middleware.ts`, `components/site/GoogleAnalytics.tsx`, `components/site/JsonLd.tsx`
- **Verify:** `curl -I` shows headers; browser console shows no CSP report violations on home/admin.

### C16 `fix(grades): scope grade cards to their course and validate enrollment ids on save`
- **Description:** `services/grades.ts`: `getGradeRecordsForGradeIdFromDb(courseId, gradeId)` uses `findFirst({ id, courseId })`; update/delete use `updateMany/deleteMany({ id, courseId })` and throw `NotFoundError` on `count === 0`. Both `saveCourseGradeToDb` and `saveCourseAttendanceToDb` pre-load `enrollment.findMany({ where: { courseId, id: { in } } })` and reject unknown ids. Update callers in `app/actions/grades.ts`, `app/actions/attendance.ts` and the grade edit pages.
- **Issues:** GRD-1, GRD-2
- **Files:** `services/grades.ts`, `services/attendance.ts`, `app/actions/grades.ts`, `app/actions/attendance.ts`, `app/{admin,teacher}/courses/[id]/grades/[gradeId]/edit/page.tsx`
- **Verify:** teacher A calling `getGradeRecordsForGradeId(courseA, gradeOfB)` → not found.

### C17 `fix(privacy): stop leaking emails through public blog payloads and fatwa search`
- **Description:** `services/blogs.ts` public queries select `id, name, image` only for author and commenters; `BlogEngagement` avatar fallback uses `name`; `addComment` returns the projected user. `services/fatwa.ts` gets `publicFatwaSearchWhere` (title/question/category) used by the public list; teacher fatwa page passes a projected object without `askerEmail` to the client form.
- **Issues:** CNT-3, CNT-5
- **Files:** `services/blogs.ts`, `app/blog/[id]/page.tsx`, `app/blog/[id]/BlogEngagement.tsx`, `app/blog/[id]/actions.ts`, `services/fatwa.ts`, `app/teacher/(portal)/fatwa/[id]/page.tsx`
- **Verify:** view-source of a blog post contains no `@` addresses; `/fatwa?q=someone@x.com` returns nothing.

### C18 `fix(api): require an active enrollment to read course announcements`
- **Description:** `/api/v1/courses/[id]` returns `announcements: []` for anonymous callers; when a Bearer user is present and has an `active`/`completed` enrollment, return course-wide announcements (reuse `getAnnouncementsVisibleToStudentPaginated` logic).
- **Issues:** API-1
- **Files:** `app/api/v1/courses/[id]/route.ts`
- **Verify:** anonymous → empty list; enrolled → list.

### C19 `chore(deps): upgrade packages with critical/high advisories`
- **Description:** `next@16.4.x`, `next-auth@5.0.0-beta.32`, `@auth/prisma-adapter@2.11.3`, `zod@4.6.7`, `puppeteer`/`puppeteer-core@25.16`, `eslint-config-next` to match; regenerate lockfile; run `npm audit` and record remaining items (nodemailer, xlsx, prisma via deepmerge-ts) in the commit body for later commits (C84, C90).
- **Issues:** INF-6
- **Files:** `package.json`, `package-lock.json`
- **Verify:** `npm run build` and `npm run lint` pass; `npm audit --audit-level=critical` clean.

### C20 `fix(auth): reject protocol-relative callback URLs`
- **Description:** `services/auth-redirect.ts` exports `isSafeInternalPath(p)` (`startsWith("/") && !startsWith("//") && !startsWith("/\\")`, no `\r\n`); use it in `getPostLoginPath`, `authContinueUrl`, `app/auth/continue/page.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`.
- **Issues:** AUTH-10
- **Files:** as listed
- **Verify:** `/login?callbackUrl=//evil.com` lands on `/` after login.

### C21 `feat(security): add rate limiting to auth routes, public forms and document downloads`
- **Description:** New `services/rate-limit.ts` (Upstash Ratelimit when `UPSTASH_REDIS_REST_URL` is set; otherwise a Postgres-backed sliding window table `RateLimitBucket` — migration included). Apply: credentials `authorize()` (5/15 min per email+IP), `/api/auth/{register,forgot-password,resend-verification}`, `/api/v1/auth/{login,register,google}`, `app/contact/actions.ts`, `app/fatwa/actions.ts`, `/api/v1/fatwa` POST, blog `addComment`, the five document routes (10/min per user). Return 429 / `{error}` with a friendly message.
- **Issues:** AUTH-6, CNT-4 *(rate-limit part)*, DOC-8 *(rate-limit part)*
- **Files:** `services/rate-limit.ts`, `prisma/migrations/<ts>_rate_limit_bucket`, `prisma/schema.prisma`, the routes/actions above, `.env.example`
- **Verify:** 6th login attempt in 15 min → 429.

### C22 `fix(admin): validate returnTo redirects, decode search params once, fix certificate type literal`
- **Description:** `deleteManualPaymentRecord` uses `paymentReturnUrl(returnTo, "deleted")`; remove `decodeURIComponent` on `searchParams` in `app/admin/bookstore/[bookId]/page.tsx`, `app/admin/finance/page.tsx`, `app/admin/transactions/page.tsx`; `AdminCertificatesTable.tsx` compares against `"APPRECIATION"`.
- **Issues:** PAY-9, BKS-12, DOC-7
- **Files:** `app/admin/payments/actions.ts`, three pages, `components/admin/certificates/AdminCertificatesTable.tsx`
- **Verify:** `?error=50%` renders; appreciation certificates labelled correctly.

### C23 `fix(pdf): authenticate before querying and sanitise download filenames`
- **Description:** `/api/receipt/[id]` calls `auth()` first and returns 404 for both missing and unauthorised; `id-card`, `grade-card`, `attendance-card` routes build filenames with the existing slug helper and emit `filename*=UTF-8''…`; remove `details: err.message` from certificate/receipt route error responses.
- **Issues:** DOC-8 *(ordering)*, DOC-9, DOC-12 *(error leak)*
- **Files:** the five `app/api/*card*/receipt/certificate` routes
- **Verify:** Arabic student name downloads without 500; error bodies generic.

### C24 `fix(teacher): hide pending applicants and their PII from the teacher portal`
- **Description:** `services/teacher-portal.ts` filters `status in ("active","completed")` in `getTeacherCourseStudentsPaginated`, `getTeacherEnrollmentInCourse`, `getCoursesForTeacher` counts and dashboard stats; `requireTeacherEnrollment` in `course-announcement-actions.ts` rejects non-active enrollments.
- **Issues:** CRS-2
- **Files:** `services/teacher-portal.ts`, `services/course-announcement-actions.ts`
- **Verify:** pending applicant no longer listed; direct URL to their enrollment → 404.

### C25 `fix(bookstore): pass the image path to deleteBookImage and guard book deletion`
- **Description:** `updateBook` calls `deleteBookImage(existing.imagePath)` on removal **and** before replacement; `deleteBook` refuses when any `BookOrderItem` references the book (message suggests unpublishing).
- **Issues:** BKS-6, BKS-8
- **Files:** `app/admin/bookstore/actions.ts`
- **Verify:** replacing an image removes the old R2 object; deleting a sold book → error.

---

## Phase 1 — Migrations, data integrity and financial correctness (C26–C53)

Goal: make the migration history authoritative, then fix every money/data-integrity defect on top of it. **C26 and C27 must land first**; every later schema change in this plan is a normal migration.

### C26 `chore(prisma): add corrective migration to bring migration history in sync with schema`
- **Description:** **Pre-flight first:** from a Neon branch of production run `prisma migrate diff --from-url <branch-url> --to-schema-datamodel prisma/schema.prisma --script` and record the output in `docs/OPERATIONS.md`; this shows the *real* gap between production and the schema (and whether `DeviceToken`/`UserCartItem` already exist there). Then generate `prisma/migrations/<ts>_sync_schema_baseline/migration.sql` from `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` (expected: `Gender`, `CouponType`, `CouponRequestStatus` enums; `BLOG_COMMENT_ADDED` value; `User.gender/policiesAccepted*`; `PaymentSettings.includeGstByDefault/feeWaiverEnabled`; `CoursePaymentSubmission.couponId` + index + FK; tables `BlogLike`, `BlogComment`, `Coupon`, `CouponRequest`, `CouponUsage`, `DeviceToken`, `UserCartItem`). Hand-edit every statement to be guarded (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DO $$ … duplicate_object`, `ALTER TYPE … ADD VALUE IF NOT EXISTS`) so the migration is a **no-op on production** and a complete build on an empty database. Add `scripts/check-migration-drift.sh` (`prisma migrate diff … --exit-code`) and `scripts/check-migration-safety.sh` (fails on `DROP TABLE|DROP COLUMN|TRUNCATE|ALTER COLUMN .* TYPE`).
- **Prod-safety:** P1, P7. Rehearsed on the Neon branch: `migrate deploy` must report the migration applied with zero schema effect (`prisma migrate diff --from-url <branch> --to-schema-datamodel … --exit-code` → 0 afterwards).
- **Issues:** INF-1, INF-4 *(documents the rule "never edit applied migrations")*
- **Files:** new migration, `scripts/check-migration-drift.sh`, `scripts/check-migration-safety.sh`, `package.json` (`db:drift`, `db:safety` scripts), `docs/OPERATIONS.md`
- **Verify:** `npm run db:drift` exits 0 on the branch and on a fresh DB; fresh DB `migrate deploy` + `npm run build` + smoke test of coupons/cart/comments.

### C27 `build: remove migration auto-repair script and run migrate deploy for real`
- **Description:** Delete `prisma/fix-migration-lock.ts`; `vercel-build` = `prisma generate && prisma migrate deploy && next build`. `docs/OPERATIONS.md` gains the production cut-over procedure: (1) confirm Neon PITR and perform a restore drill on a branch; (2) on the production branch, `SELECT migration_name, checksum, finished_at FROM "_prisma_migrations"` — the repair script has most likely already recorded all seven historical migrations with checksums computed from the current files, so `migrate deploy` will treat them as applied; (3) for any historical migration **not** recorded, run `prisma migrate resolve --applied <name>` (this only writes a bookkeeping row, it executes no SQL); (4) deploy; `migrate deploy` then applies only C21's and C26's additive migrations. Rule recorded: migrations are append-only and never edited after merge.
- **Prod-safety:** P7, P8. The cut-over is rehearsed end-to-end on a Neon branch and the exact commands are copied into the ticket.
- **Issues:** INF-2, INF-4
- **Files:** `prisma/fix-migration-lock.ts` (delete), `package.json`, `docs/OPERATIONS.md`
- **Verify:** on the Neon branch, deploy log shows `migrate deploy` applying only the new migrations; `_prisma_migrations` unchanged otherwise.

### C28 `chore(prisma): non-destructive default seed, no bank details, random demo passwords`
- **Description:** New `prisma/seed.ts` that runs only `seedBootstrap` (idempotent upserts) and never deletes; `prisma.seed` points at it; `db:seed` script added; `seed-bootstrap.ts` stops writing `PaymentSettings` bank/UPI values; `seedDemoAdmins/Teachers/Students` generate random passwords with `crypto.randomBytes` and write them to `.seed-credentials.local.json` (gitignored) instead of logging; demo admins are created only for addresses in `DEMO_ADMIN_EMAILS`, never `ADMIN_EMAIL`. README setup section rewritten from `package.json`.
- **Issues:** INF-13, INF-14, INF-3 *(remaining part)*, INF-22 *(setup section)*, CRS-12 *(demo passwords)*
- **Files:** `prisma/seed.ts`, `prisma/seed-bootstrap.ts`, `prisma/seed-demo-data.ts`, `content/demo-students.ts`, `content/teachers.ts`, `package.json`, `.gitignore`, `README.md`
- **Verify:** `prisma migrate reset` no longer wipes beyond its own reset; `npm run db:seed` idempotent.

### C29 `fix(payments): never auto-apply a coupon; forms always send an explicit couponId`
- **Description:** `getSelectedCoupon` returns `null` unless `couponId` matches a selectable coupon (no "highest coupon" default); `MonthlyPaymentForm`, `EnrollmentPaymentForm` and the mobile route always send `couponId` (`"none"` when none); server rejects a coupon the client did not display (amount mismatch guard: client posts the expected `amountInrPaise`, server compares).
- **Issues:** PAY-1, API-6
- **Files:** `services/coupons.ts`, `components/payment/MonthlyPaymentForm.tsx`, `components/payment/EnrollmentPaymentForm.tsx`, `app/api/v1/payments/submit/route.ts`, `services/payments.ts`
- **Verify:** choose "no coupon" with an applicable coupon → submission amount = full fee, no `CouponUsage` row.

### C30 `fix(payments): make fee submissions transactional and enforce uniqueness in the database`
- **Description:** Migration: partial unique index on `CoursePaymentSubmission(upiTransactionId)` where not null and `≠ 'FEE-WAIVER'`; unique index on `(userId, courseId, label)` where `status <> 'declined'`; same partial unique on `BookOrder(upiTransactionId)`. `processMonthlyPayment` / `processEnrollmentPayment` run duplicate checks, create, coupon usage and screenshot path update inside one `$transaction`; screenshot uploaded **before** the transaction and deleted on rollback; P2002 mapped to the existing user messages.
- **Issues:** PAY-2 *(transaction + TOCTOU)*, INF-10
- **Files:** migration, `prisma/schema.prisma`, `services/payments.ts`, `services/payment-submission.ts`
- **Verify:** two concurrent submits for the same month → one succeeds, one gets "already awaiting verification".

### C31 `fix(payments): route 100% fee waivers through admin approval`
- **Description:** Remove the auto-approve branches (`isFree` → `MONTHLY_PAYMENT_APPROVED`, auto `PaymentRecord`, auto enrollment activation, roll-number assignment) from `services/payments.ts`; free submissions are created as `pending_verification` with `paymentMethod = "waiver"`; add `PaymentSettings.autoApproveFullWaivers Boolean @default(false)` (migration) honoured by the existing admin confirm path so academies that want the old behaviour can opt in.
- **Issues:** PAY-2 *(approval bypass)*
- **Files:** `services/payments.ts`, migration, `prisma/schema.prisma`, `components/admin/PaymentSettingsForm.tsx`, `app/admin/payment-settings/actions.ts`, `utils/validations.ts`
- **Verify:** 100% coupon submission appears in the admin pending queue.

### C32 `fix(payments): remove write-on-read backfill from approved payment lists`
- **Description:** Delete `ensurePaymentRecordsForItems` from `services/monthly-payments.ts`; add `scripts/backfill-payment-records.ts` (idempotent, run once per environment, documented in `docs/OPERATIONS.md`); list rows without a record show a "No payment record" badge.
- **Issues:** PAY-3
- **Files:** `services/monthly-payments.ts`, `scripts/backfill-payment-records.ts`, `components/admin/PaymentApprovalsTable.tsx`, `docs/OPERATIONS.md`
- **Verify:** loading `/admin/completed-payments` twice concurrently creates no rows.

### C33 `fix(receipts): compute inclusive GST as total × 18/118 and correct issued receipts`
- **Description:** `generateReceipt` uses `gst = Math.round(itemTotal * GST / (100 + GST))` for **newly generated** receipts; `services/payment-receipt.ts` mirrors it; receipt rows reconcile (discount → base → GST memo line → total). `scripts/recompute-receipt-gst.ts` lists every already-issued receipt with `receiptIncludesGst = true` showing stored vs corrected fee/GST split and **does not write** unless run with `--apply`; the finance owner decides, per Indian GST practice, whether issued invoices may be corrected in place or must be left untouched and handled by credit notes. Default recommendation in the script's README: leave issued invoices as they are.
- **Prod-safety:** P6, P11. Existing rows are untouched by the deploy.
- **Issues:** PAY-4, DOC-12 *(row reconciliation)*
- **Files:** `app/actions/receipts.ts`, `services/payment-receipt.ts`, `utils/receipt-html.ts`, `scripts/recompute-receipt-gst.ts`
- **Verify:** ₹100 receipt → GST ₹15.25, fee ₹84.75; rows sum to total.

### C34 `feat(receipts): sequential invoice numbers per financial year with atomic generation`
- **Description:** Migration: `InvoiceSequence { financialYear String @id, next Int }` and `CertificateSequence`. `generateReceipt` runs in a transaction: `updateMany({ id, receiptGeneratedAt: null })` guard (abort if 0 rows), `SELECT … FOR UPDATE` on the sequence row, format `${BRAND.invoicePrefix}/${FY}/${n.padStart(5)}`. The sequence row for the current FY is seeded at `COUNT(existing invoices in FY) + 1` by the migration so new numbers continue after what exists. **Existing invoice and certificate numbers are never rewritten.**
- **Prod-safety:** P1, P11.
- **Issues:** PAY-7, UI-5 *(DQA-INV/DQA-CERT prefixes move to config)*
- **Files:** migration, `prisma/schema.prisma`, `app/actions/receipts.ts`, `app/actions/certificates.ts`, `config/brand.ts`
- **Verify:** two concurrent generate clicks → one invoice; numbers consecutive.

### C35 `feat(db): add AuditLog model and audit helper`
- **Description:** Migration: `AuditLog { id, actorId, actorEmail, action, entity, entityId, before Json?, after Json?, createdAt }` with indexes on `(entity, entityId)` and `(actorId, createdAt)`. `services/audit.ts` exports `recordAudit(tx, {...})`. Admin read-only page `/admin/audit-log` (paginated, filter by entity).
- **Issues:** INF-9 *(audit part)*, PAY-6 *(audit part)*
- **Files:** migration, `prisma/schema.prisma`, `services/audit.ts`, `app/admin/audit-log/page.tsx`, `services/admin-nav.ts`
- **Verify:** page lists entries once C36 lands.

### C36 `feat(db): soft-delete and void columns for financial and user records`
- **Description:** Migration adds **nullable** columns `PaymentRecord.voidedAt/voidReason/voidedById`, `CoursePaymentSubmission.deletedAt`, `BookOrder.deletedAt`, `User.deletedAt`, `Enrollment.rejectedAt` (used in C49) — no existing row changes. Changes `onDelete` to `Restrict` for `PaymentRecord.user`, `CoursePaymentSubmission.user`, `BookOrder.user`, `CouponUsage.*`, `CourseAttendance.course`, `CourseGrade.course`, `Coupon.course/user` by dropping and re-adding each FK constraint (`NOT VALID` + `VALIDATE CONSTRAINT`; the data already satisfies them, so validation is a read-only scan). All read queries gain `voidedAt: null` / `deletedAt: null` filters via small helpers in the relevant services.
- **Prod-safety:** P1, P4. Rehearsed on a Neon branch; finance totals before/after must be identical.
- **Issues:** INF-9, PAY-6 *(schema part)*
- **Files:** migration, `prisma/schema.prisma`, `services/{payments,monthly-payments,finance-income,finance-bookstore,bookstore,students,...}.ts`
- **Verify:** `migrate deploy` succeeds; finance totals unchanged for a DB with no voids.

### C37 `refactor(admin): replace hard deletes with void/soft-delete plus audit entries`
- **Description:** `deleteApprovedPayment`, `deleteManualPaymentRecord` → `voidPaymentRecord(reason)`; `deleteCouponRequest` only detaches (`couponId: null`) and refuses when usages/submissions exist; `deleteCoupon` → deactivate when history exists; `deleteBookOrder` restricted to DECLINED/REFUNDED and soft-deletes; `BookOrdersTable` "Delete payment" renamed to "Void payment" and wired accordingly; every path writes an `AuditLog` row. Confirmation modals ask for a reason.
- **Issues:** PAY-5, PAY-6, PAY-8 *(deletion guard part)*
- **Files:** `app/admin/payments/actions.ts`, `app/admin/coupons/actions.ts`, `app/admin/bookstore/orders/actions.ts`, `components/admin/{PaymentApprovalsTable,ManualTransactionsTable,AdminCouponRequestsTable,AdminCouponsTable,BookOrdersTable}.tsx`, `components/shared/ConfirmationModal.tsx` (reason field)
- **Verify:** voided record excluded from finance totals; audit row present; no `prisma.paymentRecord.delete` remains (grep).

### C38 `fix(students): soft-delete students, block deletion with history, exclude teachers from the student list`
- **Description:** `deleteStudentUser` sets `User.deletedAt` (and anonymises email to `deleted+<id>@invalid`) instead of `prisma.user.delete`; refuses when active enrollments, pending submissions or unvoided payment records exist; refuses when a `Teacher` row with that email exists; protects `isDeveloperEmail` too; `updateStudentUserForm` bails when `getStudentUserById` returns null. `services/students.ts` excludes teacher emails and deleted users; credentials `authorize()` and `authenticateApiRequest` reject deleted users.
- **Issues:** CRS-1, AUTH-20
- **Files:** `app/admin/students/actions.ts`, `services/students.ts`, `services/auth.ts`, `services/api-auth.ts`
- **Verify:** delete a student with invoices → error; teacher not in student list.

### C39 `fix(bookstore): make order approval atomic`
- **Description:** `approveBookOrder` runs `updateMany({ where: { id, status: "PENDING_VERIFICATION" }, data: { status: "APPROVED" } })` inside the transaction and aborts with "already processed" when `count === 0` before creating the `PaymentRecord`. Same guard pattern for decline/ship/refund.
- **Issues:** BKS-2
- **Files:** `app/admin/bookstore/orders/actions.ts`
- **Verify:** double-click approve → one `PaymentRecord`.

### C40 `feat(db): link payment records to book orders by foreign key`
- **Description:** Migration: nullable `PaymentRecord.bookOrderId String? @unique` + FK (`SetNull`, added `NOT VALID` then validated) and nullable `receiptShippingAmountPaise`; `scripts/backfill-book-order-links.ts` resolves the legacy `Book order #XXXXXX` descriptions (dry-run report of matched / ambiguous / unmatched records; ambiguous ones are listed for manual resolution, never guessed); approval writes `bookOrderId`; `services/bookstore.ts`, `app/actions/receipts.ts`, `services/payment-receipt.ts`, `orders/actions.ts` read the FK **with fallback to the description match** for rows not yet backfilled; the regex code is removed only in the contract backlog once the backfill reports zero unmatched rows.
- **Prod-safety:** P1, P4, P6, P9.
- **Issues:** BKS-7, DOC-10, DOC-12 *(`BOOK_ORDER` constant fixed to `"book_purchase"` and used)*
- **Files:** migration, `prisma/schema.prisma`, the four services/actions, `scripts/backfill-book-order-links.ts`, `config/constants/payments.ts`
- **Verify:** receipt for a book order shows stored shipping; grep finds no `Book order #` regex.

### C41 `fix(bookstore): refunds void income and restore stock; allow refunding shipped orders`
- **Description:** `markBookOrderRefunded` voids the linked `PaymentRecord` (reason "refund"), records a `BookStockMovement` (added in C42, so this commit first lands the status/void part and C42 adds the stock part), permits `SHIPPED → REFUNDED`, and `getApprovedBookPaymentsPaginated`/exports exclude REFUNDED/DECLINED; a separate "Refunds" tab lists them.
- **Issues:** BKS-1, BKS-13 *(shipped refund)*
- **Files:** `app/admin/bookstore/orders/actions.ts`, `services/bookstore.ts`, `app/api/admin/finance/export/route.ts`, `app/admin/completed-payments/page.tsx`
- **Verify:** refunded order disappears from payments, appears under Refunds; finance income drops.

### C42 `feat(bookstore): enforce inventory at order and approval`
- **Description:** Migration: `BookStockMovement { bookId, orderId?, delta, reason, createdAt }`; `availableStock(bookId) = inventoryPurchased + Σ delta − Σ(APPROVED/SHIPPED item qty)`; `createBookOrder` (C43) and `approveBookOrder` check availability inside the transaction (`SELECT … FOR UPDATE` on the book rows); refund/decline restore; `finance-bookstore.ts` computes "current inventory" without the date filter and flags negatives.
- **Issues:** BKS-3
- **Files:** migration, `prisma/schema.prisma`, `services/bookstore.ts`, `app/admin/bookstore/orders/actions.ts`, `services/finance-bookstore.ts`, `components/admin/BookstoreSalesTable.tsx`
- **Verify:** ordering more than available → error; summary inventory unchanged by date filter.

### C43 `refactor(bookstore): single createBookOrder service shared by web and mobile`
- **Description:** New `services/book-orders.ts` with `computeShippingCharge(totalWeight, slabs)` (gap → next higher slab; above max → highest; validate contiguity) and `createBookOrder(userId, input, screenshot)` (validation, availability, totals, upload-after-create, cart clear, UTR uniqueness from C30). `app/actions/bookstore.ts`, `/api/v1/bookstore/orders` and `app/profile/cart/checkout/page.tsx` call it; `shipping-charges/actions.ts` validates contiguity on create/delete.
- **Issues:** BKS-4, BKS-10
- **Files:** `services/book-orders.ts`, `app/actions/bookstore.ts`, `app/api/v1/bookstore/orders/route.ts`, `app/profile/cart/checkout/page.tsx`, `app/admin/shipping-charges/actions.ts`
- **Verify:** weight in a gap gets the next slab; web checkout clears the cart; three copies of the slab loop are gone (grep).

### C44 `fix(bookstore): validate checkout payload and cap quantities`
- **Description:** `bookstoreCheckoutSchema.items[].quantity` gains `.max(MAX_ORDER_QTY)` (constant 20); checkout page parses `?books=` with the same schema and redirects to the cart on failure; cart API and `CartProvider.updateQuantity` enforce the cap; tracking/courier strings `max(100)`.
- **Issues:** BKS-5, BKS-13 *(tracking length)*
- **Files:** `utils/validations.ts`, `config/constants/business.ts`, `app/profile/cart/checkout/page.tsx`, `app/api/v1/bookstore/cart/route.ts`, `components/bookstore/CartProvider.tsx`, `app/admin/bookstore/orders/actions.ts`
- **Verify:** `?books=[{"bookId":"x","quantity":-1}]` → redirect to cart.

### C45 `feat(db): add Course relations to Enrollment and CoursePaymentSubmission`
- **Description:** `scripts/report-orphan-course-refs.ts` (read-only) lists `Enrollment`/`CoursePaymentSubmission` rows whose `courseId` has no `Course`; the academy decides for each (re-point to the right course or mark the row with the soft-delete column from C36) **before** this commit is deployed. Migration adds `course Course @relation(... onDelete: Restrict)` on both models as `NOT VALID` constraints followed by `VALIDATE CONSTRAINT` (fails loudly, not silently, if an orphan still exists); back-relations on `Course`; replace manual `getCoursesByIds` joins with `include: { course }` in `services/{enrollments,monthly-payments,waiver-finance,teacher-portal,certificates-admin,receipts-admin,payments}.ts` and `/api/v1/enrollments`.
- **Prod-safety:** P4, P6, P7. Deployed only after the orphan report is empty on the production branch.
- **Issues:** INF-5, API-8 *(enrollments over-fetch)*
- **Files:** migration, `prisma/schema.prisma`, `scripts/report-orphan-course-refs.ts`, the services above, `app/api/v1/enrollments/route.ts`
- **Verify:** `npm run db:drift` clean; admin pages render identically.

### C46 `fix(courses): transactional course deletion with attachment cleanup, and guarded teacher deletion`
- **Description:** `deleteCourse` refuses while active/completed enrollments or pending submissions exist, deletes R2 attachments of announcements first, then deletes in one `$transaction`; `deleteTeacher` refuses when courses are assigned (UI offers reassignment); `DeleteActionButton` receives the real name.
- **Issues:** CRS-3, CRS-4
- **Files:** `app/admin/courses/actions.ts`, `app/admin/teachers/actions.ts`, `app/admin/teachers/[id]/page.tsx`, `app/admin/teachers/[id]/edit/page.tsx`, `services/announcement-upload.ts`
- **Verify:** deleting a course with announcements removes their R2 objects.

### C47 `fix(coupons): validate admin coupon actions and harden code generation`
- **Description:** Zod schemas for `approveCouponRequest` (`percentage int 1–100`, `validUntil ≥ today`), `createDefaultCoupon`/`updateCoupon` (`.int()`, `validFrom <= validUntil`, future `validFrom` allowed); codes via `crypto.randomInt` with P2002 retry (3 attempts); `rejectCouponRequest` requires PENDING; `updateCoupon` restricts editable fields by type (SPECIAL: dates/percentage/active only); `EditCouponDialog` typed.
- **Issues:** PAY-8, PAY-16 *(`coupon: any`)*
- **Files:** `app/admin/coupons/actions.ts`, `components/admin/{EditCouponDialog,CreateCouponDialog,AdminCouponRequestsTable}.tsx`, `utils/validations.ts`
- **Verify:** approve with `percentage=150` → validation error; scheduling a coupon for next month works.

### C48 `feat(waiver): store fee type as a column and validate waiver requests`
- **Description:** Migration: nullable `CouponRequest.feeType WaiverFeeType?` (`ENROLLMENT`, `COURSE`, `BOTH`); `scripts/backfill-waiver-fee-type.ts` (dry-run default) derives the value from the legacy `[Fee Type: …]` suffix and leaves `reason` untouched; readers use `feeType ?? parseLegacyFeeType(reason)`; web action, API route and `WaiverRequestModal` send `feeType`; `reason` `min(10).max(1000)`; `courseId` must exist and be enrollable.
- **Prod-safety:** P1, P6, P9.
- **Issues:** PAY-12, API-3 *(waiver part)*
- **Files:** migration, `prisma/schema.prisma`, `app/actions/waiver.ts`, `app/api/v1/waiver-requests/route.ts`, `components/profile/{WaiverRequestModal,WaiverRequestsView}.tsx`, `app/admin/coupons/actions.ts`, `utils/validations.ts`
- **Verify:** unknown `courseId` → 400 not 500; legacy rows show the right fee type.

### C49 `fix(enrollment): lock-safe roll numbers, rejection as a status, notify after commit`
- **Description:** `assignRollNumber` locks the course row (`SELECT id FROM "Course" WHERE id = $1 FOR UPDATE`) inside the transaction and retries once on P2002; `rejectEnrollmentRequest` sets `status = "rejected"`, `rejectedAt` (column from C36) instead of deleting, and sends the notification after the update; `submitCheckout` lets a rejected student re-apply (new row allowed when previous is rejected → unique becomes `(userId, courseId)` + partial, handled by resetting the same row).
- **Issues:** CRS-7, CRS-8
- **Files:** `services/roll-numbers.ts`, `app/admin/enrollments/actions.ts`, `app/actions/checkout.ts`, `services/enrollments.ts` (status labels)
- **Verify:** 10 concurrent approvals → roll numbers 1..10 without errors.

### C50 `fix(finance): timezone-safe date filters, correct bookstore report maths, misc finance fixes`
- **Description:** `finance-filters.ts` parses/serialises dates with `date-fns-tz` in `BUSINESS_TIMEZONE` (`Asia/Kolkata`, config) and uses local parts; presets computed in that zone; record-payment/expense `paidAt` stored as the zone's midnight; `getBookSalesPaginated/All` accept the date filter; bookstore revenue/profit split shipping (revenue excl. shipping, shipping shown separately); `recordStudentPayment` uses the lookup's `userId`; expense categories become a fixed enum list plus "Other" with free-text note (`Expense.note` column migration).
- **Issues:** PAY-10, PAY-11, PAY-13, BKS-9, BKS-13 *(createdAt vs paidAt: reports now filter on `paidAt` for records)*
- **Files:** `services/finance-filters.ts`, `services/finance-bookstore.ts`, `app/admin/finance/bookstore/page.tsx`, `app/api/admin/finance/export/route.ts`, `app/admin/record-payment/actions.ts`, `app/admin/record-expense/actions.ts`, `components/admin/{FinanceDateFilter,FinanceExpenseFilters,FinanceIncomeFilters,RecordExpenseForm}.tsx`, `config/constants/business.ts`, migration, `package.json` (`date-fns-tz`)
- **Verify:** paginating a custom range keeps the same dates; "this month" matches IST calendar month.

### C51 `feat(db): add enum columns alongside free-text status and type columns (expand step)`
- **Description:** Migration creates enum types `EnrollmentStatus { PENDING_APPROVAL, AWAITING_ENROLLMENT_FEE, ACTIVE, COMPLETED, REJECTED }`, `PaymentSubmissionStatus { PENDING_VERIFICATION, APPROVED, DECLINED }`, `PaymentType { MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY, ONE_TIME, ENROLLMENT, MANUAL, BOOK_PURCHASE }`, `PaymentMethod { UPI, BANK, WAIVER, CASH }`, `CertificateType { APPRECIATION, COMPLETION }`, `DevicePlatform { ANDROID, IOS, WEB }` and adds **new nullable columns** next to the existing text columns: `Enrollment.statusEnum`, `CoursePaymentSubmission.statusEnum/paymentTypeEnum/paymentMethodEnum`, `PaymentRecord.paymentTypeEnum`, `Enrollment.certificateTypeEnum`, `DeviceToken.platformEnum`, `Coupon.genderEnum Gender?`. The existing text columns are **not altered or dropped**. `scripts/backfill-status-enums.ts` (dry-run default, batched 1,000 rows, idempotent) maps text → enum and reports any value that has no mapping (those rows are listed, not guessed); `'FEE-WAIVER'` UTR rows map to `paymentMethodEnum = WAIVER` while `upiTransactionId` is left as is.
- **Prod-safety:** P1, P2, P3, P6. Zero lock-time risk: `ADD COLUMN … NULL` is metadata-only in Postgres.
- **Issues:** INF-8 *(schema)*, CRS-11 *(statuses)*, DOC-6 *(certificateType enum)*
- **Files:** migration, `prisma/schema.prisma`, `scripts/backfill-status-enums.ts`
- **Verify:** on the Neon branch, backfill report shows 100 % mapped; counts per enum value equal counts per text value.

### C52 `refactor: read and write the enum columns with fallback to the text columns`
- **Description:** Replace the ~60 string-literal comparisons and the constants in `config/constants/{payments,business}.ts`, `services/{enrollment-status,monthly-payment-status,fee-frequency}.ts` with the generated enums; every write sets **both** the enum column and the legacy text column; every read uses `statusEnum ?? fromLegacy(status)` through small accessor helpers (`services/status-compat.ts`) so rows not yet backfilled behave correctly; delete the unused `ROLES` constant; `certificateType` casts removed; `DeviceToken.platform` validated against the enum in the API; mobile API responses keep the old lowercase string fields and add the enum fields (P9). Dropping the text columns and the compat layer is recorded in Appendix A for a later release.
- **Prod-safety:** P3, P9.
- **Issues:** INF-8 *(code)*, API-7 *(platform enum)*
- **Files:** ~24 files touched by `grep status === "`; `config/constants/*`, `services/status-compat.ts`, `app/api/v1/notifications/device-token/route.ts`
- **Verify:** `tsc --noEmit` passes; integration suite green against a branch where the backfill has **not** been run (fallback path) and one where it has.

### C53 `feat(db): indexes, decimal marks, integer certificate grade rule, Teacher→User link`
- **Description:** Migration (statements written with `CREATE INDEX CONCURRENTLY IF NOT EXISTS`, which Prisma runs outside a transaction when the migration file contains only such statements — split into its own migration folder): `Enrollment(userId,statusEnum)`, `Enrollment(statusEnum)`, `Enrollment(courseId,statusEnum)` plus the same on the legacy `status` column while the compat layer is live, `CoursePaymentSubmission(userId,courseId,label,status)`, `CourseAnnouncement(teacherId)`, `CourseGrade(courseId,date)`, `FatwaQuestion(approvalStatus)`, `BlogPost(createdById)`, `PasswordResetToken(expiresAt)`, `VerificationToken(expires)`, `Expense(paidAt,category)`; drop the redundant `Coupon(code)`, `DeviceToken(token)` secondary indexes (non-destructive; uniques remain). Expand/contract for marks: add nullable `CourseGradeRecord.marksObtainedDecimal Decimal(6,2)`, backfill script (dry-run default), code writes both and reads decimal with fallback; `Teacher.userId String? @unique` FK (`NOT VALID` + validate) with a dry-run backfill by email; `generateCertificate` enforces `Number.isInteger` and the form uses `step="1"`.
- **Prod-safety:** P1, P3, P4, P5, P6.
- **Issues:** INF-11, INF-12, DOC-6
- **Files:** migration, `prisma/schema.prisma`, `scripts/backfill-teacher-user-links.ts`, `app/actions/certificates.ts`, `components/admin/certificates/GenerateCertificateForm.tsx`, `services/teacher-auth.ts` (prefer `userId` link)
- **Verify:** `EXPLAIN` on the pending-approval queue uses the new index; 9.5 grade rejected with a message.

---

## Phase 2 — Authorization hardening, API parity, robustness (C54–C69)

### C54 `fix(auth): add explicit auth checks to every protected page`
- **Description:** Insert `await requireAdmin()` / `requireTeacher()` / `requireUser()` as the first statement in the 48 admin pages, `app/teacher/(portal)/blogs/new/page.tsx`, `app/profile/cart/checkout/page.tsx`, `app/developer/page.tsx` (Appendix A of the review).
- **Issues:** AUTH-8 *(pages)*
- **Files:** 51 page files
- **Verify:** `scripts/check-page-auth.sh` (grep-based) reports zero unprotected pages; add it to CI in C72.

### C55 `refactor(auth): move require* helpers out of "use server" and run Auth.js in middleware`
- **Description:** `services/auth-actions.ts` loses `"use server"` (helpers are plain server functions; callers are server components/actions); `middleware.ts` exports `auth(…)` from `services/auth.config.ts` (edge-safe) combined with the existing CORS/rate-limit logic so the `authorized()` callback is live for `/admin`, `/teacher`, `/profile`, `/developer`; matcher extended accordingly.
- **Issues:** AUTH-12, AUTH-15, AUTH-8 *(middleware)*
- **Files:** `services/auth-actions.ts`, `middleware.ts`, `services/auth.config.ts`
- **Verify:** unauthenticated `/admin/courses` → redirect at the edge; `/api/v1` behaviour unchanged.

### C56 `fix(auth): refresh role and email verification state in the session`
- **Description:** `jwt` callback re-resolves `role`/`teacherId` on every invocation (cheap env check + one indexed query, with a 60 s in-token cache stamp) and re-reads `emailVerified` when it is null; `session.maxAge` = 7 days, `updateAge` = 1 hour; `verify-email` page triggers `update()` via a small client component.
- **Issues:** AUTH-9, AUTH-14
- **Files:** `services/auth.ts`, `services/auth.config.ts`, `app/verify-email/page.tsx`, `components/auth/SessionRefresh.tsx`
- **Verify:** remove an email from `ADMIN_EMAIL` → next request is denied; verifying email clears the banner without re-login.

### C57 `fix(auth): disable dangerous account linking and require verified email for password login`
- **Description:** `allowDangerousEmailAccountLinking: false`; `signIn` callback: when provider is Google and a credentials user with that email has `emailVerified = null`, null the stored password and mark verified before linking (or refuse with a message, configurable); credentials `authorize()` returns null when `emailVerified` is null (UI shows "verify your email first" with a resend link).
- **Issues:** AUTH-7
- **Files:** `services/auth.config.ts`, `services/auth.ts`, `components/auth/LoginForm.tsx`
- **Verify:** register with password, do not verify, sign in with Google → password login no longer works for the attacker row.

### C58 `feat(auth): dedicated API token issuer with refresh tokens and revocation`
- **Description:** Migration: `ApiRefreshToken { id, userId, tokenHash, expiresAt, revokedAt, createdAt }`. `services/api-auth.ts` signs access tokens with a distinct salt (`api-access`) and 1-hour lifetime; `/api/v1/auth/refresh` rotates refresh tokens (30 days); `/api/v1/auth/logout` revokes; `authenticateApiRequest` rejects tokens whose `jti` is revoked. Login/register/google routes return `{ accessToken, refreshToken }` (keep `token` alias for one release).
- **Issues:** AUTH-11
- **Files:** migration, `prisma/schema.prisma`, `services/api-auth.ts`, `app/api/v1/auth/{login,register,google,refresh,logout}/route.ts`, `docs/API.md`
- **Verify:** session cookie value no longer accepted as Bearer; refresh flow works.

### C59 `fix(auth): server-side validation for registration, canonical base URL for links, hashed verification tokens`
- **Description:** Zod schema for both register routes (`email().max(254)`, `name.max(100)`, `password.min(8).max(128)`, `acceptPolicies: literal(true)`); verification/reset links built from `getAppBaseUrl()`; `VerificationToken.token` stored as SHA-256 (lookup by hash); `verify-email` becomes a page with a "Confirm" button posting to a server action (no write on GET).
- **Issues:** AUTH-13, AUTH-19, AUTH-17
- **Files:** `app/api/auth/register/route.ts`, `app/api/v1/auth/register/route.ts`, `app/api/auth/resend-verification/route.ts`, `services/tokens.ts`, `app/verify-email/page.tsx`, `utils/validations.ts`
- **Verify:** `"email":"notanemail"` → 400; prefetching the verify link does not consume it.

### C60 `fix(profile): race-safe registration numbers`
- **Description:** Migration: `RegistrationSequence { year Int @id, next Int }`; `generateNextRegistrationNumber` increments under row lock inside the profile-update transaction; prefix from `BRAND_CONFIG.registrationPrefix`.
- **Issues:** AUTH-16, UI-5 *(DQA prefix)*
- **Files:** migration, `prisma/schema.prisma`, `services/registration.ts`, `app/profile/actions.ts`, `config/brand.ts`
- **Verify:** 20 concurrent profile completions → 20 distinct numbers, no failures.

### C61 `fix(api): share validation schemas with the web, clamp pagination, add DTOs`
- **Description:** `/api/v1/reviews` POST uses `studentReviewSchema`; `/api/v1/fatwa` POST uses `fatwaQuestionSchema`; `/api/v1/payments/submit` uses `monthlyPaymentSubmitSchema`/`enrollmentPaymentSubmitSchema`; new `utils/api-pagination.ts` (`parseApiPagination` clamps page ≥ 1, pageSize 1–50, NaN → defaults) used by every list route; `services/api-dto.ts` for cart/enrollment/payment projections (removes duplicate mapping).
- **Issues:** API-3, API-4, API-5, API-8
- **Files:** the v1 routes, `utils/api-pagination.ts`, `services/api-dto.ts`
- **Verify:** `?pageSize=100000` → 50 items; invalid review → 400.

### C62 `fix(teacher): move attendance and grade routes into the portal layout and 404 unowned courses`
- **Description:** `git mv app/teacher/courses app/teacher/(portal)/courses/…` merging the nine attendance/grade pages under the existing `(portal)/courses/[id]` layout (URLs unchanged); each page resolves `getTeacherCourseForPortal` and calls `notFound()`; the action-level `authorize*` checks stay as defence in depth.
- **Issues:** GRD-4, GRD-5
- **Files:** nine page files (moved), `components/teacher/TeacherCourseNav.tsx`
- **Verify:** teacher attendance page shows sidebar + course header; unowned course → 404 page.

### C63 `feat(teacher): allow deleting private student messages`
- **Description:** Add `deleteStudentCourseAnnouncement(courseId, enrollmentId, announcementId)` in `services/course-announcement-actions.ts` using `requireTeacherEnrollment` and `getCourseAnnouncementRecord(id, courseId, enrollmentId)`; `TeacherCourseAnnouncementCard` binds it when `enrollmentId` is set; the student-messages page handles `?deleted=1`.
- **Issues:** ANN-1
- **Files:** `services/course-announcement-actions.ts`, `components/teacher/TeacherCourseAnnouncementCard.tsx`, `app/teacher/(portal)/courses/[id]/students/[enrollmentId]/announcements/page.tsx`
- **Verify:** deleting a private message works and redirects to the student messages page.

### C64 `fix(grades): validate grade input, support ungraded students, format dates in UTC`
- **Description:** Zod schema for `saveCourseGrade` (`title 1–200`, `maxMarks int ≥ 1`, `marksObtained number 0..maxMarks | null`); "not graded" is represented by **omitting the `CourseGradeRecord` row** (no column type change needed; existing `0` rows stay as they are and are flagged in the UI as "recorded as 0"); `GradeForm` sends `null` for blanks and the save deletes the row for that enrollment; `StudentGradeReport`/`GradeList` show "—" and use `toFixed(2)`; all `@db.Date` formatting passes `timeZone: "UTC"`; default dates built from local parts; rename route param `[studentId]` → `[enrollmentId]` under grades (admin + teacher).
- **Prod-safety:** P1 (no schema change in this commit).
- **Issues:** GRD-3, GRD-6, GRD-7
- **Files:** `app/actions/grades.ts`, `services/grades.ts`, `components/grades/*`, `components/attendance/*`, `app/profile/courses/[courseId]/attendance/page.tsx`, grade student pages (renamed)
- **Verify:** marks > max → error; blank mark shows "—".

### C65 `fix(admin): stronger student editing, protected accounts, admin access to unpublished announcements, status-change-only sync`
- **Description:** `adminStudentSchema` replaced by `profileUpdateSchema.omit({country})` + `z.nativeEnum`; `updateStudentUserForm` requires an explicit "Replace photo with female avatar" confirmation before deleting an upload; `app/admin/announcements/actions.ts` uses `getSiteAnnouncementForAdmin`; `updateCourse` calls `syncEnrollmentsWithCourseStatus` only when status changed and refuses `COMPLETED → other` while certificates exist (explicit override flag).
- **Issues:** CRS-5, ANN-2, CRS-6
- **Files:** `utils/validations.ts`, `app/admin/students/actions.ts`, `components/admin/StudentForm.tsx`, `app/admin/announcements/actions.ts`, `app/admin/courses/actions.ts`
- **Verify:** editing an unpublished site announcement saves; editing a completed course's title does not reactivate enrollments.

### C66 `refactor(errors): typed database errors, one server-action wrapper, surfaced modal errors`
- **Description:** `withDbErrorHandling` rethrows `DbError` with `code` (`UNIQUE`, `NOT_FOUND`, `FK`) and user messages; `executeServerAction` returns `{ error: { code, message } }` or redirects with an opaque `?err=<code>` resolved to copy by a `flash` helper; `app/admin/library/actions.ts` stops throwing on invalid input; teacher blog actions use the wrapper; `ConfirmationModal` re-throws/toasts errors; `uniqueSlug` retries on `UNIQUE`; course actions surface Zod messages.
- **Issues:** INF-15, CRS-9, CRS-10, CNT-10 *(modal)*
- **Files:** `utils/db-error.ts`, `utils/action-utils.ts`, `utils/flash.ts`, admin `actions.ts` files, `components/shared/ConfirmationModal.tsx`, `utils/slug.ts`
- **Verify:** duplicate course title → "A course with this name already exists"; URLs contain no raw error text.

### C67 `fix(uploads): atomic image handling, old-object cleanup and MIME sniffing`
- **Description:** New `services/storage.ts` (`uploadToR2(prefix, file, allowed)`, `deleteFromR2(prefix, url)`, `sniffImageMime(buffer)` via `file-type`) replacing the five near-identical upload modules; blog/library/site-announcement/course-announcement mutations validate all files → upload → write rows in a transaction, delete old objects only after success, and delete uploaded objects on rollback; profile and payment uploads sniff bytes.
- **Issues:** CNT-9, ANN-5, AUTH-16 *(profile MIME)*, UI-2 *(upload dedupe)*
- **Files:** `services/storage.ts`, `services/{blog,library,bookstore,announcement,site-announcement,profile,payment}-upload.ts` (thin wrappers or deleted), `services/blog-mutations.ts`, `services/course-announcement-mutations.ts`, `app/admin/library/actions.ts`, `package.json` (`file-type`)
- **Verify:** uploading 3 images where the 2nd is invalid leaves no R2 objects and no rows.

### C68 `feat(uploads): serve private announcement attachments through signed URLs`
- **Description:** Course-announcement attachments and payment screenshots are stored under a private prefix; new route `/api/files/[...key]` checks ownership (enrolled student / course teacher / admin) and redirects to a 5-minute presigned R2 URL; `AnnouncementAttachment` links to the route. Public assets (books, blogs, avatars) unchanged.
- **Issues:** ANN-4
- **Files:** `app/api/files/[...key]/route.ts`, `services/storage.ts`, `components/announcements/AnnouncementAttachment.tsx`, `services/announcement-upload.ts`, `services/payment-upload.ts`
- **Verify:** forwarded attachment link without session → 401.

### C69 `fix(content): approved-post lock, single answer email, background emails, engagement guards`
- **Description:** `canTeacherEditBlogPost` returns `locked` for APPROVED posts (page already handles `?error=locked`); admin fatwa answer emails the asker only on first approval; fatwa/contact/declined-payment/waiver emails move into `after()`; `toggleLike`/`addComment` require `BLOG_PUBLIC_WHERE`; like toggle uses `deleteMany` count then `create` with P2002 catch; comment `content.max(2000)`; comment anchor rendered; `editComment` same cap.
- **Issues:** CNT-7, CNT-8, CNT-10 *(engagement)*, NTF-3
- **Files:** `services/blog-approval.ts`, `app/admin/fatwa/actions.ts`, `app/teacher/(portal)/fatwa/actions.ts`, `app/admin/contact-inquiries/actions.ts`, `app/admin/payments/actions.ts`, `app/admin/coupons/actions.ts`, `app/blog/[id]/actions.ts`, `app/blog/[id]/BlogEngagement.tsx`
- **Verify:** editing an approved teacher post → "locked" message; editing an answer sends no email.

---

## Phase 3 — Tests and CI (C70–C75)

Phase 3 can start in parallel with Phase 1 once C26/C27 exist; tests for a behaviour should land in the same PR-sized group as the fix where practical, but are listed here as separate commits so the suite can be reviewed on its own.

### C70 `test: add Vitest with unit tests for money, coupons, shipping, filters, helpers and schemas`
- **Description:** `vitest.config.ts`, `npm test`; unit tests for `calculateDiscountedAmount`, `getSelectedCoupon` (null → no coupon), `computeShippingCharge` (gaps, bounds), receipt GST maths (18/118), `finance-filters` (IST boundaries), `buildMonthlyFeeLabel`, status helpers, `isSafeInternalPath`, `escapeHtml`, `sanitizeRichText` allow-list, `JsonLd` escaping, every exported Zod schema (valid + invalid cases), `parseApiPagination`.
- **Issues:** section 4.5 of the review
- **Files:** `vitest.config.ts`, `tests/unit/**`, `package.json`
- **Verify:** `npm test` green.

### C71 `test: integration tests against a disposable Postgres`
- **Description:** `tests/integration/**` using Testcontainers (or `DATABASE_URL_TEST`) with `migrate deploy` + bootstrap seed per run: payment submit → approve → receipt; enrollment lifecycle incl. rejection and re-apply; 10 concurrent roll-number assignments; book order state machine incl. inventory and refund voiding; notification fan-out dedupe; delete guards (student/course/teacher/book); audit rows written; void excludes from finance totals.
- **Files:** `tests/integration/**`, `tests/helpers/db.ts`, `package.json`
- **Verify:** `npm run test:integration` green locally.

### C72 `test: API tests for every /api/v1 route`
- **Description:** Supertest-style tests via Next's route handlers: auth required, Bearer accepted, cookie rejected, cross-origin POST rejected, validation errors, pagination clamps, IDOR attempts (other user's notification/enrollment), refresh/revocation flow, announcement visibility.
- **Files:** `tests/api/**`
- **Verify:** green.

### C73 `test: security regression tests`
- **Description:** XSS payload corpus through blog body, fatwa answer, JSON-LD, each PDF template and each email template (assert escaped); GRD-1 cross-course access; open-redirect vectors; `/api/dev/seed` returns 404; rate limiter returns 429; CSP header present. Also promote CSP from report-only to enforcing in `next.config.ts` once this suite passes.
- **Issues:** INF-7 *(enforce)*
- **Files:** `tests/security/**`, `next.config.ts`
- **Verify:** green; browser console clean on home/admin/blog.

### C74 `test: Playwright end-to-end journeys`
- **Description:** register → verify → complete profile → enrol → pay → admin approve → receipt download; teacher attendance + grades; bookstore checkout → approve → ship → refund; admin void with audit entry.
- **Files:** `playwright.config.ts`, `tests/e2e/**`, `package.json`
- **Verify:** `npm run test:e2e` green against `next start`.

### C75 `ci: GitHub Actions pipeline and repository hygiene`
- **Description:** `.github/workflows/ci.yml`: install, `prisma generate`, `tsc --noEmit`, `eslint`, `knip`, `npm run db:drift`, `scripts/check-page-auth.sh`, `npm audit --audit-level=high`, unit + integration + API + security tests (Postgres service), e2e on `dev`/`master`; `.github/CODEOWNERS`; `docs/CONTRIBUTING.md` with the branch rule (PRs into `master` only); delete `.agents/AGENTS.md` auto-push rule; add Husky pre-commit (`lint-staged`: eslint + tsc on changed files).
- **Issues:** INF-19 *(AGENTS.md)*, section 4.5
- **Files:** `.github/**`, `.husky/**`, `package.json`, `.agents/AGENTS.md` (delete), `docs/CONTRIBUTING.md`
- **Verify:** workflow green on `dev`.

---

## Phase 4 — Performance, maintainability, product completeness (C76–C92)

### C76 `perf(cache): remove site-wide force-dynamic and add ISR to public pages`
- **Description:** Delete `dynamic = "force-dynamic"` from `app/layout.tsx`; `revalidate = 300` on home, courses, blog, fatwa, library, bookstore, teachers, announcements; sitemap `revalidate = 3600` without the non-existent `/library/{id}` block; `robots.ts` allows `/announcements`; actions call `revalidateTag` for the affected public tags; `StudentTestimonials` session-dependent part moves to a client component; `Header` auth state via `SessionProvider` only.
- **Issues:** UI-1, CNT-6
- **Files:** `app/layout.tsx`, public pages, `app/sitemap.ts`, `app/robots.ts`, services with `unstable_cache`/tags, `components/home/StudentTestimonials.tsx`
- **Verify:** `x-nextjs-cache: HIT` on `/`; homepage DB queries ≤ 3 per revalidation.

### C77 `perf(db): cut over-fetching and write amplification`
- **Description:** Blog detail: `_count` for likes/comments + `likes: { where: { userId } }`, comments paginated (20 + "load more" action); `getPublishedBlogPostById`/`getAnsweredFatwaById` wrapped in `cache()`; waiver finance filters in SQL (`couponId != null OR paymentMethod = WAIVER`) with DB pagination; inactive tab counts via `count()`; `getPaymentSettings` memoised per request (`cache()`); coupons page paginated; finance page student dropdown becomes a searchable async select; teacher page uses per-teacher counts; `createStudentNotificationsForUsers` uses `createMany({ skipDuplicates })` + one `updateMany`; one `revalidatePath` per notification batch; `/api/v1/student/{attendance,grades}` single query with `include`.
- **Issues:** CNT-4 *(perf part)*, PAY-14, PAY-15, NTF-1, ANN-3, API-8 *(remaining)*
- **Files:** `services/{blogs,fatwa,waiver-finance,notifications,payment-settings,coupons}.ts`, `app/blog/[id]/*`, `app/admin/{coupons,payments,bookstore/orders,review-approvals,finance}/page.tsx`, `app/admin/teachers/[id]/page.tsx`, `app/api/v1/student/*`
- **Verify:** Prisma query log for a blog page shows ≤ 3 queries; site announcement to 1,000 users completes in one `createMany`.

### C78 `perf(pdf): build-time stylesheet, self-hosted fonts, pinned Chromium, function timeouts`
- **Description:** `scripts/build-pdf-css.ts` compiles `styles/pdf.css` with Tailwind CLI during `prebuild` and `wrapHtmlForPdf` inlines it (no CDN script); Cinzel/Cormorant/Scheherazade fonts added to `public/fonts` and inlined as base64 like IndoPak; `utils/chromium.ts` points at a pack matching the installed `@sparticuz/chromium-min` major, hosted in the project's own R2 bucket (`CHROMIUM_PACK_URL`); `export const maxDuration = 60` on the five document routes; `outputFileTracingIncludes` for `public/assets/**` and `public/fonts/**`; request interception allow-list from C08 tightened to `data:` only; `page.setJavaScriptEnabled(false)`.
- **Issues:** DOC-3, DOC-5, DOC-12 *(tracing, fonts)*, DOC-1 *(final hardening)*
- **Files:** `scripts/build-pdf-css.ts`, `styles/pdf.css`, `services/pdf-generator.ts`, `utils/chromium.ts`, the five routes, `next.config.ts`, `public/fonts/*`, `.env.example`
- **Verify:** PDF renders with network disabled; cold start < 10 s on Vercel preview.

### C79 `feat(pdf): generate documents once and serve them from storage`
- **Description:** On receipt/certificate generation (admin action) render the PDF and store it under the private prefix (`receipts/<id>.pdf`, `certificates/<id>.pdf`), saving the key on the record; download routes and email actions reuse the stored file and regenerate only when missing or when the record is voided/re-issued; grade/attendance/ID cards keep on-demand rendering behind the rate limiter.
- **Issues:** DOC-8 *(Chromium per hit)*, DOC-3 *(latency)*
- **Files:** migration (`PaymentRecord.receiptPdfKey`, `Enrollment.certificatePdfKey`), `app/actions/{receipts,certificates}.ts`, `app/api/{receipt,certificate}/**`, `services/storage.ts`
- **Verify:** second download of a receipt does not launch Chromium (log).

### C80 `fix(email): pooled SMTP transport with retry, real unsubscribe handling`
- **Description:** Module-level `nodemailer` transport with `pool: true`, 2 retries with backoff on transient errors; `services/email/core.ts` `getSenderEmail`/`getFromAddress` merged; remove `List-Unsubscribe`/`One-Click` headers from announcement emails **or** implement `/api/email/unsubscribe?token=` backed by `User.announcementEmailsOptOut` (migration) and honour it in `notifyAllStudentsOfSiteAnnouncement` — the plan implements the latter; upgrade `nodemailer` to v10 (advisory from C19).
- **Issues:** DOC-12 *(email items)*, INF-6 *(nodemailer)*
- **Files:** `services/email/core.ts`, `services/email/templates/communication.ts`, `app/api/email/unsubscribe/route.ts`, migration, `services/notifications.ts`, `package.json`
- **Verify:** one-click unsubscribe POST opts the user out; subsequent announcement skips them.

### C81 `refactor(teaching): share attendance and grade page bodies between admin and teacher portals`
- **Description:** Extract `components/teaching/{AttendancePages,GradePages}` server components parameterised by `{ role, basePath, courseId }`; the 18 admin/teacher pages become thin wrappers; single `authorizeCourseManagement(courseId)` in `services/course-authorization.ts` used by both action files; `sendStudentCardEmail(kind, enrollmentId)` replaces the two near-identical senders; one `StudentCardPreview({ kind })` and one `/api/student-card/[kind]` route (old routes redirect).
- **Issues:** GRD-8
- **Files:** `components/teaching/**`, `services/course-authorization.ts`, `app/actions/{attendance,grades}.ts`, the 18 pages, `app/api/{grade-card,attendance-card}/route.ts` → `app/api/student-card/[kind]/route.ts`
- **Verify:** e2e teacher/admin attendance and grades journeys still green; LOC drop reported in the commit body.

### C82 `refactor(announcements): one announcement card and one mutation runner`
- **Description:** `components/announcements/AnnouncementCard` gains an `actions` slot and replaces `AdminCourseAnnouncementCard`/`TeacherCourseAnnouncementCard`; `services/course-announcement-actions.ts` create/update/delete ×3 collapse into `runAnnouncementMutation({ authorize, scope, redirectBase })`; teacher and admin new/edit pages share a body component.
- **Issues:** ANN-6
- **Files:** `components/announcements/*`, `components/{admin,teacher}/*AnnouncementCard.tsx` (delete), `services/course-announcement-actions.ts`, the four new/edit pages
- **Verify:** announcement tests green.

### C83 `refactor(ui): shared primitives for price formatting, list pages, tabs, dialogs, hero, skeletons, sidebars`
- **Description:** Single `formatPrice` export (`utils/money.ts`) replacing the ten copies; `AdminListPage` shell (Suspense + skeleton + search + pagination) adopted by courses/teachers/students/announcements/blogs/library/daily-inspiration/fatwa lists; `TabPills` component (6 call sites); `useDialog` hook (4 dialogs); `PageHero` component (7 pages); `TableSkeleton` shared; `AdminSidebar({ title, showDeveloperItems })` replaces `DeveloperSidebar`; payment-method/UTR/screenshot block extracted to `PaymentProofFields` used by the two fee forms and `BookCheckoutClient`; `returnUrl`/`revalidate*` helpers de-duplicated into `utils/admin-redirects.ts`.
- **Issues:** PAY-16 *(remaining)*, UI-2
- **Files:** `utils/money.ts`, `components/shared/{AdminListPage,TabPills,PageHero,TableSkeleton,PaymentProofFields}.tsx`, `components/shared/useDialog.ts`, `utils/admin-redirects.ts`, call sites
- **Verify:** `grep -rn "function formatPrice"` → one hit; visual check of admin lists.

### C84 `refactor(admin): generic CRUD action factory for content modules`
- **Description:** `services/admin-crud.ts` exports `createAdminCrudActions({ model, schema, paths, hooks })` producing create/update/delete with auth, parse, not-found, revalidate, redirect; adopted by `blogs`, `library`, `daily-inspiration`, `announcements` (site), `fatwa` (delete/reject), `contact-inquiries`, `review-approvals`; hook points for uploads and featured-slot logic; removes the duplicated `revalidateBlogPaths`, fatwa revalidate blocks and `returnUrl` copies not already handled in C83.
- **Issues:** section 4.4 duplication (seven CRUD `actions.ts`), UI-2
- **Files:** `services/admin-crud.ts`, the seven `actions.ts`
- **Verify:** admin e2e + integration tests green; net LOC reduction reported.

### C85 `chore: remove dead code and tidy dependencies`
- **Description:** Delete `components/ui/{Badge,Card,Spinner,data/EmptyState,data/Table,forms/Input,Label,Select,Textarea}.tsx`, `scratch/`, `receipt.html`, `receipt.pdf`, `services/review-rating.ts` (inline constant), unused `getStudentReviewsForUser`, `startDelayMs`, `DOCUMENT_TYPES`, `FILE_CONFIG.FOLDERS.RECEIPTS` (now used by C79 — keep if referenced), `authorized()` dead remnants, `content/testimonials.ts` (move into seed), `PwaRegister`/`utils/prisma.ts` `console.log`; `puppeteer` → devDependencies with dynamic import; remove `@vercel/analytics`/`@vercel/speed-insights` **or** wire `<Analytics/>`/`<SpeedInsights/>` into `app/layout.tsx` (plan: wire them, since the repo has Vercel branches for exactly this); move `pdf-lib` to dependencies only if seeds run in any build (they no longer do → stays dev); replace `xlsx` with `exceljs` in the finance export; add `"engines": { "node": ">=20.9" }`; `.gitignore` additions; `knip` config updated and clean.
- **Issues:** DOC-11, DOC-12 *(dead items)*, INF-19, INF-21, UI-3, INF-6 *(xlsx)*
- **Files:** as listed, `package.json`, `.gitignore`, `knip.json`, `app/layout.tsx`, `app/api/admin/finance/export/route.ts`
- **Verify:** `npm run knip` reports nothing; `npm audit` clean at high.

### C86 `docs: regenerate .env.example and README from the code`
- **Description:** `.env.example` lists every variable read by the code (incl. new `SEED_ALLOWED_DB_HOSTS`, `API_ALLOWED_ORIGINS`, `UPSTASH_*`, `CHROMIUM_PACK_URL`, `BUSINESS_TIMEZONE`), drops `NEXTAUTH_URL` and the two unused verification vars, and documents Vercel system variables; README corrected (Next 16, no Radix, scripts, migrate not push, build command); `docs/ARCHITECTURE.md` summarising the layering and auth model.
- **Issues:** INF-20, INF-22
- **Files:** `.env.example`, `README.md`, `docs/ARCHITECTURE.md`
- **Verify:** `scripts/check-env-example.sh` (grep `process.env.` vs example) added to CI.

### C87 `refactor(brand): centralise remaining hardcoded academy strings`
- **Description:** Route `public/sw.js` names (generated from config at build), `utils/receipt-html.ts` academy block, `services/academy-{contact,location}.ts`, `HomeAbout`, about/privacy/terms copy variables, `CartProvider` storage key, `package.json` name through `BRAND_CONFIG`; the brand-specific **column defaults** on `PaymentSettings` are changed with `ALTER COLUMN … SET DEFAULT` only (affects future inserts; the existing production row is untouched); developer credits move to `config/credits.ts` driven by env (`SHOW_DEVELOPER_CREDITS`) and are omitted when unset.
- **Prod-safety:** P1 (default change only, no data change).
- **Issues:** UI-5
- **Files:** as listed, `config/brand.ts`, `config/credits.ts`, migration
- **Verify:** `grep -rni "darse" --include=*.ts --include=*.tsx` hits only `config/`.

### C88 `feat(notifications): send push notifications to registered devices`
- **Description:** Add `firebase-admin`; `services/push.ts` sends FCM messages for every `createStudentNotification*` call (title/body/href data payload) in `after()`, batched 500/request, pruning tokens that return `registration-token-not-registered`; `DeviceToken` upsert no longer reassigns another user's token (409 instead); env `FIREBASE_SERVICE_ACCOUNT_JSON` documented.
- **Issues:** NTF-2, API-7 *(token reassignment)*
- **Files:** `services/push.ts`, `services/notifications.ts`, `app/api/v1/notifications/device-token/route.ts`, `package.json`, `.env.example`
- **Verify:** test device receives a push on payment approval.

### C89 `feat(admin): order detail page, library item pages, notification labels, copy fixes`
- **Description:** `app/admin/bookstore/orders/[id]/page.tsx` (items, payment proof, timeline from audit log); `app/library/[id]/page.tsx` (detail + download) so the sitemap entry is valid again and the "future update" copy is removed; `notificationTypeLabel/Class` and `NotificationCard` cover `BOOK_ORDER_SHIPPED/REFUNDED`, `BLOG_COMMENT_ADDED`; `relatedPageLabel` handles `/blog/`; copy fixes ("Course Announcements" hero → "Courses", "six reviews" → config max, "public course page" → "homepage", duplicate teacher photo, duplicated course header); `alert()/confirm()` replaced by toast/modal; `manifest` theme colour from brand; canonical/OG on legal pages; library `pdfUrl` restricted to `https?`.
- **Issues:** BKS-11, CNT-10 *(remaining)*, DOC-12 *(certificate copy)*, UI-2 *(copy)*, CNT-6 *(library sitemap)*
- **Files:** new pages, `services/notifications.ts`, `components/profile/NotificationCard.tsx`, `app/profile/notifications/[id]/page.tsx`, `app/courses/page.tsx`, `components/profile/StudentReviewForm.tsx`, `components/admin/{ReviewTable,ReviewDetailActions}.tsx`, `app/admin/teachers/[id]/page.tsx`, `app/admin/courses/[id]/students/page.tsx`, `app/blog/[id]/BlogEngagement.tsx`, `components/courses/CourseShareButton.tsx`, `app/manifest.ts`, legal pages, `utils/certificate-html.ts`, `utils/validations.ts`
- **Verify:** sitemap URLs all 200; no `alert(` in `components/` or `app/`.

### C90 `fix(a11y): labels, names and live regions`
- **Description:** `aria-label` for comment textarea and kebab menu with `aria-expanded/haspopup`; toast container `role="status" aria-live="polite"` and named close button; `BlogPostCard` link gets an accessible name; `LibraryForm` file inputs associated with labels; fix dangling `aria-labelledby` in `HomeDailyInspiration`; `ConfirmationModal` trigger no longer wrapped in a clickable `div`.
- **Issues:** UI-4
- **Files:** `app/blog/[id]/BlogEngagement.tsx`, `components/shared/{ToastProvider,ConfirmationModal}.tsx`, `components/blog/BlogPostCard.tsx`, `components/admin/LibraryForm.tsx`, `components/home/HomeDailyInspiration.tsx`
- **Verify:** axe DevTools shows no critical issues on home, blog post, admin library form.

### C91 `chore(infra): standard Prisma client, serverless connection settings, fail-fast storage config, sane action body limit`
- **Description:** `utils/prisma.ts` → `globalThis.prisma ??= new PrismaClient({ adapter: new PrismaNeon(pool) })` (or documented `?connection_limit=1&pool_timeout=10` on the pooler URL), remove the cache-key/dmmf hack and query logger `console.log` (use `log` option); `utils/s3.ts` validates `R2_*` at first use and throws a `ConfigError` in production; `next.config.ts` `bodySizeLimit` back to default and blog/library/book images uploaded through presigned R2 PUT URLs from a small `/api/uploads/presign` route (auth + MIME/size policy), with the server actions receiving keys instead of files; `next.config.ts` `images.remotePatterns` fails the build when `R2_PUBLIC_URL` is missing in production.
- **Issues:** INF-16, INF-17, INF-18, UI-3 *(console.log)*
- **Files:** `utils/prisma.ts`, `utils/s3.ts`, `next.config.ts`, `app/api/uploads/presign/route.ts`, `services/storage.ts`, `components/admin/{BlogPostForm,LibraryForm,BookForm,SiteAnnouncementForm}.tsx`, `package.json` (`@prisma/adapter-neon`, `@neondatabase/serverless`)
- **Verify:** 10 MB blog image uploads on Vercel; missing `R2_BUCKET_NAME` → clear startup error.

### C92 `fix(bookstore): debounced cart sync, stale-item notices, seed content alignment`
- **Description:** `CartProvider` waits for the server GET before pushing local items, merges by `bookId`, and debounces POSTs (500 ms); checkout and cart pages show a notice and purge unavailable/unpublished items; `content/courses.ts`/`content/teachers.ts` use slug ids and categories from `COURSE_CATEGORIES`; remaining `as unknown as` casts in `services/enrollments.ts` replaced with typed `paginateQuery<T>` generics.
- **Issues:** BKS-13 *(cart sync, stale items)*, CRS-12 *(content)*, section 4.4 type-safety gaps
- **Files:** `components/bookstore/{CartProvider,CartPageClient}.tsx`, `app/profile/cart/checkout/page.tsx`, `content/courses.ts`, `content/teachers.ts`, `services/enrollments.ts`, `utils/prisma-utils.ts`
- **Verify:** adding items offline then online keeps both carts; `grep "as unknown as" services/` → none.

---

## Execution notes

1. **Start:** `git checkout -b dev origin/dev` (already equal to `master`), commit the two review documents first as `docs: add code review report and commit plan` (C00), then proceed C01→C92.
2. **Release points:** after C25 (Phase 0) and after C53 (Phase 1) — each is a coherent, deployable state. Phase 0 is code-only (plus one additive table) and should go to production as soon as reviewed. **Phase 1 is released only after the full rehearsal on a Neon branch of production** (P7): PITR restore drill (P8), `migrate deploy` on the branch, every script run with `--apply` on the branch, integration suite green against the branch, and a diff of row counts per table and of finance totals (income, expenses, waivers, bookstore) between the branch before and after — attached to the release ticket. The production deploy then runs the same `migrate deploy` (additive, idempotent) followed by the scripts, each first in dry-run against production, then `--apply` only for the ones the finance owner approved.
3. **Rollback:** application rollback is a Vercel redeploy of the previous commit; schema rollback is never required because every migration is additive and the code tolerates both shapes (P9). Data-script rollback uses the snapshot each script writes to `scripts/out/` before `--apply`.
4. **Never run against production:** `prisma db push`, `prisma migrate reset`, `prisma migrate dev`, `npm run db:seed:demo`, any `scripts/*.ts` without a prior dry-run. `docs/OPERATIONS.md` (C27) lists these explicitly and the CI safety check (C26/C75) rejects destructive SQL.
5. **Parallelism:** Phase 3 commits can be interleaved from C28 onward (C70 after C33/C43, C71 after C53, C72 after C61, C73 after C25, C74 after C69). Within Phase 4, C76–C80 are independent of C81–C92.
6. **Each commit:** `npm run lint && npx tsc --noEmit && npm run build && npm run db:safety` (and `npm test` once C70 exists) must pass before committing. Commit bodies end with the review IDs and the attribution line required by this repository.
7. **Out of scope for this plan:** nothing from the register is deferred except the "contract" half of the expand/contract changes (Appendix A), which is intentionally a later release; the only items left to operator judgement are flagged inside commits (CSP enforcement timing in C73, waiver auto-approval setting in C31, GST correction of issued receipts in C33, unsubscribe implementation choice in C80, analytics wiring in C85).

## Execution notes and deviations

Every commit landed with the subject in its entry; where the landed change differs from the entry's text, the commit body says so and this list repeats it:

- **Extra commit after C30:** `fix(db): partial unique index must exclude rejected submissions, not 'declined'` — the one-open-submission-per-label index predicate used `'declined'` while declined submissions are stored as `"rejected"`. The migration had not been applied anywhere, so it was corrected in place.
- **C53:** indexes are plain `CREATE INDEX IF NOT EXISTS`, not `CONCURRENTLY`. Prisma applies a migration file as one implicit transaction, where `CONCURRENTLY` is refused; the tables are academy-sized, and the Neon-branch rehearsal records the lock time. Rule P5 is therefore satisfied by rehearsal, not by the statement form.
- **C55 (follow-up fix):** Auth.js's `auth(handler)` form does not act on a falsy `authorized` result by itself; `middleware.ts` enforces the decision explicitly (redirect to `/login` with `callbackUrl` for pages, 401 for API paths) and the security suite tests it.
- **C57:** `allowDangerousEmailAccountLinking` stays on. The takeover is closed by the credentials provider refusing unverified accounts and by the `signIn` callback nulling the password of an unverified row before Google is linked (`AUTH_GOOGLE_LINK_UNVERIFIED=refuse` turns that into a refusal).
- **C76:** no page became ISR and the root `force-dynamic` stays. The nonce CSP needs per-request HTML and prerendering content pages made `next build` depend on the production database; instead the homepage queries are cached for five minutes (`services/public-cache.ts`, invalidated by `revalidatePublicContent()` from every content action). A follow-up fix moved the cached readers into `services/home-content.ts` because the domain services are also imported by client components.
- **C78:** the PDF stylesheet is compiled with the Tailwind v3 engine (`tailwindcss-v3` alias) to match the Play CDN the templates were written for; fonts are self-hosted under `public/fonts` (OFL); the white-background removal uses `sharp` server side so the page runs without JavaScript.
- **C80:** nodemailer is on the 8.x line, the newest within next-auth's peer range, so a clean install resolves; the plan said v10.
- **C91:** the server-action body limit was not lowered; the presigned direct-to-R2 upload flow it needs is listed in Appendix A as follow-up work.
- **C71–C73:** the DB-backed suites skip when `DATABASE_URL_TEST` is absent; the batch-2 session ran them against a Postgres installed outside the repo (no Docker on the machine). The Vitest config is `vitest.config.mts`.

## Appendix A — "Contract later" backlog (not executed in this plan)

Destructive follow-ups deferred to a separate release after at least one billing cycle on the new columns, a verified backup, and a zero-row fallback report:

| Object left in place by this plan | Superseded by | Commit that introduced the replacement |
|---|---|---|
| `Enrollment.status`, `CoursePaymentSubmission.status/paymentType/paymentMethod`, `PaymentRecord.paymentType`, `Enrollment.certificateType`, `DeviceToken.platform`, `Coupon.gender` (text) | `*Enum` columns + `services/status-compat.ts` | C51, C52 |
| `CourseGradeRecord.marksObtained` (Float) | `marksObtainedDecimal` | C53 |
| `'FEE-WAIVER'` values in `upiTransactionId` | `paymentMethodEnum = WAIVER` | C51 |
| `PaymentRecord.description` "Book order #…" lookup fallback | `bookOrderId` | C40 |
| `CouponRequest.reason` "[Fee Type: …]" suffix parser | `feeType` | C48 |
| `token` alias in mobile auth responses; lowercase status strings in mobile API payloads | `accessToken/refreshToken`; enum fields | C58, C52 |
| Legacy random `DQA-INV-*` / `DQA-CERT-*` numbers | sequential numbers (new documents only) | C34 — legacy numbers are **kept forever**, never renumbered |
| Server-action `bodySizeLimit` at the blog upload allowance | presigned direct-to-R2 uploads (`/api/uploads/presign`, bucket CORS, four form changes) | C91 (deferred) |
| Per-request rendering of public pages (root `force-dynamic`) | page caching once the CSP moves from a per-request nonce to a hash-based policy | C76 (deferred) |
| Attachments and screenshots uploaded before C68 at public URLs | private storage + `/api/files` (new uploads only) | C68 — a move script can migrate old objects later |

---

## Appendix B — Coverage matrix (review ID → commit)

| ID | Commit(s) | | ID | Commit(s) | | ID | Commit(s) |
|---|---|---|---|---|---|---|---|
| AUTH-1 | C01 | | CRS-1 | C38 | | DOC-1 | C06, C07, C08, C78 |
| AUTH-2 | C03 | | CRS-2 | C24 | | DOC-2 | C08, C10 |
| AUTH-3 | C04 | | CRS-3 | C46 | | DOC-3 | C78, C79 |
| AUTH-4 | C05 | | CRS-4 | C46 | | DOC-4 | C06, C09 |
| AUTH-5 | C14 | | CRS-5 | C65 | | DOC-5 | C78 |
| AUTH-6 | C21 | | CRS-6 | C65 | | DOC-6 | C51, C53 |
| AUTH-7 | C57 | | CRS-7 | C49 | | DOC-7 | C22 |
| AUTH-8 | C54, C55 | | CRS-8 | C49 | | DOC-8 | C21, C23, C79 |
| AUTH-9 | C56 | | CRS-9 | C66 | | DOC-9 | C23 |
| AUTH-10 | C20 | | CRS-10 | C66 | | DOC-10 | C40 |
| AUTH-11 | C58 | | CRS-11 | C51, C52 | | DOC-11 | C85 |
| AUTH-12 | C55 | | CRS-12 | C28, C92 | | DOC-12 | C23, C33, C40, C78, C80, C85, C89 |
| AUTH-13 | C59 | | GRD-1 | C16 | | CNT-1 | C11, C12 |
| AUTH-14 | C56 | | GRD-2 | C16 | | CNT-2 | C13 |
| AUTH-15 | C55 | | GRD-3 | C64 | | CNT-3 | C17 |
| AUTH-16 | C60 | | GRD-4 | C62 | | CNT-4 | C09, C21, C77 |
| AUTH-17 | C59 | | GRD-5 | C62 | | CNT-5 | C17 |
| AUTH-18 | C05 | | GRD-6 | C64 | | CNT-6 | C76, C89 |
| AUTH-19 | C59 | | GRD-7 | C64 | | CNT-7 | C69 |
| AUTH-20 | C38 | | GRD-8 | C81 | | CNT-8 | C69 |
| API-1 | C18 | | ANN-1 | C63 | | CNT-9 | C67 |
| API-2 | C10 | | ANN-2 | C65 | | CNT-10 | C66, C69, C89 |
| API-3 | C48, C61 | | ANN-3 | C77 | | NTF-1 | C77 |
| API-4 | C61 | | ANN-4 | C68 | | NTF-2 | C88 |
| API-5 | C61 | | ANN-5 | C67 | | NTF-3 | C69 |
| API-6 | C29 | | ANN-6 | C82 | | UI-1 | C76 |
| API-7 | C52, C88 | | PAY-1 | C29 | | UI-2 | C67, C83, C84, C89 |
| API-8 | C45, C61, C77 | | PAY-2 | C30, C31 | | UI-3 | C85, C91 |
| BKS-1 | C41 | | PAY-3 | C32 | | UI-4 | C90 |
| BKS-2 | C39 | | PAY-4 | C33 | | UI-5 | C34, C60, C87 |
| BKS-3 | C42 | | PAY-5 | C37 | | INF-1 | C26 |
| BKS-4 | C43 | | PAY-6 | C35, C36, C37 | | INF-2 | C27 |
| BKS-5 | C44 | | PAY-7 | C34 | | INF-3 | C01, C02, C28 |
| BKS-6 | C25 | | PAY-8 | C37, C47 | | INF-4 | C26, C27 |
| BKS-7 | C40 | | PAY-9 | C22 | | INF-5 | C45 |
| BKS-8 | C25 | | PAY-10 | C50 | | INF-6 | C19, C80, C85 |
| BKS-9 | C50 | | PAY-11 | C50 | | INF-7 | C15, C73 |
| BKS-10 | C43 | | PAY-12 | C48 | | INF-8 | C51, C52 |
| BKS-11 | C89 | | PAY-13 | C50 | | INF-9 | C35, C36 |
| BKS-12 | C22 | | PAY-14 | C77 | | INF-10 | C30 |
| BKS-13 | C41, C44, C50, C92 | | PAY-15 | C77 | | INF-11 | C53 |
| | | | PAY-16 | C47, C83 | | INF-12 | C53 |
| | | | | | | INF-13 | C28 |
| | | | | | | INF-14 | C28 |
| | | | | | | INF-15 | C66 |
| | | | | | | INF-16 | C91 |
| | | | | | | INF-17 | C91 |
| | | | | | | INF-18 | C91 |
| | | | | | | INF-19 | C75, C85 |
| | | | | | | INF-20 | C86 |
| | | | | | | INF-21 | C85 |
| | | | | | | INF-22 | C28, C86 |
| Testing (4.5) | C70–C75 | | Duplication (4.4) | C43, C67, C81–C84 | | Missing features (§5) | C31, C41, C42, C63, C65, C80, C88, C89 |

All 99 register rows and every sub-item of the grouped Low row are mapped.
