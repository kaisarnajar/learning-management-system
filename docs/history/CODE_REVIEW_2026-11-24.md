# Academy LMS — Comprehensive Code Review

**Date:** 2026-11-24 · **Commit:** `master` @ `af70413` · **Scope:** whole repository (~75k lines TS/TSX, 183 route handlers, ~129 server actions, 21 migrations, 34 test files)
**Mode:** review only — no files in the repository were modified.

**Method.** Six parallel review passes (auth/identity, authorization/IDOR, payments & commerce, content/XSS/files/PDF, data/performance/config, architecture/quality/tests), each reading the code paths end to end. Every Critical and High finding below was then re-checked by hand against the source. Findings are **Confirmed** (observed in code) unless marked **Potential** (depends on deployment configuration not visible in the repo). The previous review (`docs/history/LMS_CODE_REVIEW_AND_IMPLEMENTATION_PLAN.md`, 2026-11-02) was treated as remediated; nothing here repeats an item that is already fixed.

**Tooling notes.** `node_modules` is not installed in this checkout, so `tsc`, `eslint`, `vitest` and `next build` could not be run without modifying the working tree. `npm audit` (lockfile-based) and `madge` (no circular imports across 730 files) were run.

---

## 1. Overall health and architecture

**Verdict: good foundations, a handful of serious gaps.** This is a disciplined, well-documented codebase that has clearly absorbed a prior hardening pass. The previous review's headline problems (destructive seed endpoint, unverified Google tokens, stored XSS, SSRF in PDFs, migration history drift, no tests/CI) are fixed. What remains is a smaller set of concentrated issues:

1. **An identity gap in the mobile API** that lets an unverified sign-up inherit a staff role (Critical).
2. **Session lifecycle**: password reset and account take-back don't end existing sessions.
3. **Payment state-machine races and rule bypasses** in the fee approval and enrollment-fee paths — the book-order and enrollment flows got guarded `updateMany` treatment; fee submissions did not.
4. **Operational foot-guns**: the bootstrap seed reactivates public 100% coupons; preview builds run migrations.
5. **Architecture drift** from the documented layering, which is already causing duplicated, diverging rules.

**Architecture.** Next.js 16 App Router on Vercel, PostgreSQL (Neon) via Prisma 6, Auth.js v5 (JWT web sessions + separate Bearer access/refresh tokens for the mobile `/api/v1`), Cloudflare R2 (public + private buckets), Puppeteer/`@sparticuz/chromium-min` PDFs, Nodemailer, Firebase push. Documented layering is `app → services → utils/prisma`, with `config/` as the white-label surface.

In practice the mobile staff API (`/api/v1/admin/**`, `/api/v1/teacher/**`) is implemented by *calling the website's `"use server"` actions* inside an AsyncLocalStorage actor context and translating their redirects into HTTP codes (`services/api-staff.ts:16-25`). Consequently 65 files in `app/api` and `services` import from `@/app/...`, and the business state machines for payments, coupons, enrollments and book orders live in `app/**/actions.ts`, not `services/`.

**Strengths (verified)**
- Money as integer paise; GST inclusive split correct (18/118); server-computed amounts with `expectedAmountPaise` 409 guard.
- Roll/registration/invoice/certificate numbers allocated inside the transaction that stores them, under row locks.
- Book orders: guarded status transitions, `FOR UPDATE` stock locking, voiding not deleting. Enrollment approve/reject guarded.
- Mobile auth: Bearer-only, separate JWT salt, hashed rotating refresh tokens with race-safe rotation (tested), per-request session-row check; Google ID token verified (aud/iss/email_verified).
- Three independent authorization layers; every one of ~129 exported server actions and all `/api/v1/admin|teacher` routes carry a guard; teacher grade/attendance writes are course-scoped.
- Rich-text sanitizer is tight (no svg/iframe/style/img, http(s)/mailto only), applied on write and read; JSON-LD escaped; all PDF/email interpolations escaped; Puppeteer runs JS-disabled with all network blocked.
- Upload validation by magic bytes + MIME + allow-list, server-generated keys; files route has strict key regex and per-type authorization.
- No `$queryRawUnsafe`; no circular imports; 1 `as any`; 0 `@ts-ignore`; ESLint suppressions tracked; CI runs drift/safety/page-auth/env checks plus four Vitest projects; integration tests assert real outcomes against Postgres.

---

## 2. Findings by severity

Counts: **Critical 1 · High 13 · Medium 30 · Low 24**

### CRITICAL

#### C1. Unverified mobile sign-up inherits ADMIN / DEVELOPER / TEACHER role from the e-mail address
- **Files:** `app/api/v1/auth/register/route.ts:64-69` (issues a session immediately); `services/api-auth.ts:183` (`resolveUserRole(dbUser.email)` — no `emailVerified` check); `services/teacher-auth.ts:21-26` (role derived purely from e-mail: `ADMIN_EMAIL`, `DEVELOPER_EMAIL`, or a `Teacher.email` row); `services/api-staff.ts:49` (only checks role).
- **Issue:** The website requires a verified e-mail before password sign-in; the mobile register endpoint hands out an access + refresh token to an unverified account, and every API request re-derives the role from the address alone.
- **Scenario:** An admin creates a Teacher profile for `newteacher@gmail.com` before that teacher has signed up (the normal order). An attacker calls `POST /api/v1/auth/register` with that address and any password; the returned token passes `requireStaffApiAuth(…, TEACHER)` and the attacker reads that teacher's course rosters (student names, e-mails), posts announcements, writes grades/attendance and fatwa answers. The same applies to any `ADMIN_EMAIL`/`DEVELOPER_EMAIL` address that has no `User` row yet, giving full admin API access.
- **Impact:** Privilege escalation to staff without owning the mailbox.
- **Fix:** In `authenticateApiRequest`, return role `USER` whenever `emailVerified` is null; additionally refuse in `requireStaffApiAuth` if not verified. Consider not issuing a session at all from register (or a restricted unverified session). Add an API test for each staff role.

### HIGH

#### H1. Fee approval/decline is not race-safe → duplicate income or contradictory state
- **Files:** `app/admin/payments/actions.ts:61-67` (status check outside the transaction), `:86-104` (unconditional `paymentRecord.create` then `update({where:{id}})`), `:159-177` (decline, same pattern).
- **Scenario:** A double-click on Approve, or web + mobile admin at once: both read `PENDING_VERIFICATION`, both create a `PaymentRecord` for ₹499; the second overwrites `paymentRecordId`, orphaning the first, which then shows as a "manual" payment and is counted in income (`services/finance-income.ts`). Approve racing Decline can leave the submission DECLINED with a live record and an ACTIVE enrollment.
- **Fix:** Inside the transaction, claim first: `updateMany({where:{id, statusEnum:'PENDING_VERIFICATION', deletedAt:null}, data:APPROVED})`, abort on `count===0`, then create and link the record. Same for decline. Move the roll-number assignment (`:118-127`) into the same transaction. Add a concurrent-approval integration test (the existing one at `tests/integration/payments.test.ts:79` is sequential).

#### H2. Password reset/change does not end existing sessions
- **Files:** `app/api/auth/reset-password/route.ts:27-30` (updates password only); `services/api-auth.ts:133` `revokeAllApiSessions` has no callers; `services/auth.ts:117-180` JWT callback has no password-version check. (Change-password does revoke API tokens inline at `app/api/v1/auth/change-password/route.ts:39`, but not web JWTs.)
- **Scenario:** After a compromise the victim resets their password; the attacker's web cookie (renewed on every visit, 7-day rolling) and mobile refresh token (30 days) keep working.
- **Fix:** Add `User.sessionVersion` (or `passwordChangedAt`), put it in the JWT at sign-in, compare in the `jwt` callback (which already re-reads the DB each minute); bump on reset/change. Call `revokeAllApiSessions(userId)` on reset. Also set `emailVerified` on reset (it proves mailbox control).

#### H3. Account take-back leaves the squatter's API session alive
- **Files:** `services/auth.ts:102-113` (web Google sign-in scrubs the password of an unverified row), `app/api/v1/auth/google/route.ts:103-112`, `app/verify-email/actions.ts:23-36`, `app/api/auth/reset-password/route.ts:25-30`.
- **Scenario:** Attacker registers `victim@x` via `/api/v1/auth/register` (gets a refresh token). The real owner later signs in with Google; the row is marked verified and the attacker's password removed — but the attacker's `ApiRefreshToken` survives, now attached to a verified account with the victim's enrolments, payments and personal data. Because the account has no password, `DELETE /api/v1/auth/me` with `{confirm:"DELETE"}` lets the attacker delete it.
- **Fix:** Call `revokeAllApiSessions(userId)` on every unverified-row take-over path and on e-mail verification and password reset.

#### H4. Any user can delete (or impersonate) another user's profile photo
- **Files:** `utils/validations.ts:281-294` (`isAllowedProfileImageUrl` checks only the host), `:314` (API accepts it); `app/api/v1/auth/me/route.ts:88` stores it; `services/storage.ts:214-224` (`r2KeyFromUrl` only checks the `uploads/profiles/` prefix). Deletes happen at `app/api/v1/auth/me/photo/route.ts:55,72`, `app/profile/actions.ts:48-52,97-99`, `services/account-deletion.ts:118-119`.
- **Scenario:** Victim photo URLs are public via blog comments (`services/blog-engagement.ts:19`) and blog authors (`services/blogs.ts:122`). Attacker sends `PUT /api/v1/auth/me {"image":"https://<r2>/uploads/profiles/<victimId>-x.jpg"}`, then `POST /api/v1/auth/me/photo` with any image — the handler deletes the "previous" image, i.e. the victim's object. Repeatable against every commenter, teacher and admin. Step 1 alone shows the victim's photo on the attacker's ID card.
- **Fix:** Reject client-supplied `image` values other than the two `/assets/` avatars and Google avatars (uploads only via `/me/photo`). Before any delete, require the key to match `^uploads/profiles/${userId}-[A-Za-z0-9-]+\.(jpg|png|webp|gif)$`; reject `..` and `%`.

#### H5. Enrollment-fee submission bypasses every enrollment rule
- **Files:** `services/payments.ts:246-322` — only checks `isApprovedEnrollment` (`:265`), then `enrollment.upsert` (`:318`) moves *any* non-approved row (including REJECTED) to `AWAITING_ENROLLMENT_FEE`, or creates one. Reachable from `submitEnrollmentPayment` and `POST /api/v1/payments/submit`.
- **Scenario:** A rejected applicant submits a UTR directly and is back in the queue; an admin approving the fee makes them ACTIVE. With `autoApproveFullWaivers` on and a global 100% DEFAULT coupon, a student self-enrolls straight to ACTIVE (with a roll number) in a DRAFT / ON_HOLD / COMING_SOON course — or COMPLETED for a completed course. Course-open and profile-complete checks are skipped entirely.
- **Fix:** Require an existing `AWAITING_ENROLLMENT_FEE` row created by `startEnrollment` (no upsert-create), and re-check course open + profile complete inside this service.

#### H6. Single-use coupon can be redeemed by concurrent submissions
- **Files:** `services/coupons.ts:121-123` (availability checked outside the transaction), `:131-147` (`couponUsage.upsert(…, update:{})` can't fail; SPECIAL deactivation is an unconditional `update`); callers `services/payments.ts:150,214`.
- **Scenario:** January and February monthly fees submitted concurrently with the same 100% coupon — different labels pass the label index, both upserts succeed, two months are waived. *(Assumes Prisma emits a native `ON CONFLICT` upsert for the compound unique, which Prisma 6 does for this shape.)*
- **Fix:** `couponUsage.create` inside the transaction (let P2002 reject), deactivate with `updateMany({where:{id,isActive:true}})` and check `count`.

#### H7. A period paid with a coupon can be paid again
- **Files:** `services/payments.ts:159-172`; unique index in migration `20261103002000` is on the full label, which embeds the coupon text (`"Monthly fee — January 2026 (30% Fee Waiver)"`).
- **Scenario:** January approved with a coupon; student submits January again without one → different label, passes the pre-check and the index; two approved records for one month.
- **Fix:** Add a `periodKey` column (`MONTHLY:2026-01`, `ONE_TIME`) with a partial unique index on `(userId, courseId, periodKey)`. Stop-gap: match labels with `startsWith(baseLabel)`.

#### H8. Certificates can be issued for enrollments that never completed
- **Files:** `app/actions/certificates.ts:23-46` (no status check); `services/certificates-admin.ts:102-113` (candidate list returns every enrollment incl. rejected/pending/awaiting-fee and deleted users, unpaginated).
- **Impact:** A numbered "Certificate of Completion" can be issued to a rejected applicant, consuming a sequence number.
- **Fix:** Require `COMPLETED` for completion certificates (`ACTIVE|COMPLETED` for appreciation); filter the candidate list by status and `user.deletedAt: null`, and paginate it.

#### H9. Voiding an enrollment fee leaves the enrollment ACTIVE (and the coupon burned)
- **Files:** `app/admin/payments/actions.ts:202-231`.
- **Scenario:** A bounced ₹1,000 enrollment fee is voided; the student keeps full course access and cannot re-pay ("already enrolled and approved", `services/payments.ts:265`).
- **Fix:** In the same transaction, for ENROLLMENT payments revert the enrollment to `AWAITING_ENROLLMENT_FEE` (status-guarded) and decide/document coupon restoration.

#### H10. `npm run db:seed` overwrites production data and reactivates public 100% coupons
- **Files:** `prisma/seed-bootstrap.ts:184-227` (`coupon.upsert(..., update: c)` for `WELCOME50`, `EARLYBIRD20`, `SCHOLARSHIP100` — DEFAULT type, valid to end-2027, `isActive:true`); `:55-86` course/teacher/library upserts reset titles, prices, status and `featuredOnHomepage`. README step 4 and OPERATIONS describe it as idempotent/non-destructive.
- **Scenario:** An operator follows the README against production: every student is automatically offered 50% and 100% waivers (`services/coupons.ts:56-85` lists DEFAULT coupons to all), and admin edits to seeded courses are reverted.
- **Fix:** `update: {}` everywhere; move coupons and testimonials into the demo seed; add the demo seed's host guard.

#### H11. Every Vercel build, including previews, runs `prisma migrate deploy` — *Potential*
- **Files:** `package.json:8` (`vercel-build`), `vercel.json` (uses it for all environments); no `VERCEL_ENV` check anywhere. `vercel-build:staging` (`:9`) is unused.
- **Scenario:** If the Preview environment has the production `DATABASE_URL`/`DIRECT_URL` (Vercel's default for new env vars is "all environments"), pushing a branch applies its unreviewed migration to production. Even in production, a migration that succeeds followed by a failed `next build` leaves new schema under old code.
- **Fix:** Gate migrations on `VERCEL_ENV === "production"`; give Preview its own Neon branch; ideally run migrations as a separate release step.

#### H12. Upload limits exceed Vercel's 4.5 MB request-body cap — *Potential*
- **Files:** `next.config.ts:22` (`bodySizeLimit` 50 MB), `config/constants/file.ts` (5 MB images, 10 MB PDFs, 15 MB attachments); uploads go through server actions, no presigned PUTs.
- **Impact:** On Vercel, a 6 MB attachment or two 3 MB blog images fail with a platform 413 instead of a validation message.
- **Fix:** Presigned direct-to-R2 uploads, or cap per-request totals below 4.5 MB. Lower the global server-action limit back toward 1 MB so public forms aren't accepting 50 MB bodies.

#### H13. Staff API and the files route have no tests
- **Files:** No test touches `/api/v1/admin/**`, `/api/v1/teacher/**` (~92 routes), `staffAction`, `runAsApiActor`, or `app/api/files/[...key]/route.ts`.
- **Impact:** The AsyncLocalStorage actor bridge (`services/auth.ts:212-218`), role checks, redirect→HTTP mapping, teacher course scoping and the only gate in front of private payment screenshots are all unverified by CI — C1 is exactly the class of bug this would catch.
- **Fix:** `tests/api/staff.test.ts` (role refusal, unverified user, cross-teacher course id, redirect→400 mapping, one write per area) and `tests/security/files.test.ts` (owner, other student, admin, other-course teacher, private message to another student, malformed key).

### MEDIUM

**Auth & sessions**

| # | Finding | Location | Fix |
|---|---|---|---|
| M1 | Refresh-token reuse isn't detected: a replayed token just returns null, so an attacker who rotates first keeps the chain and logs the user out. | `services/api-auth.ts:101-108` | Add `familyId`; on reuse of a revoked token revoke the family (or all user sessions). |
| M2 | Web Google `signIn` never checks `profile.email_verified`, yet links accounts, scrubs passwords and grants roles by e-mail (`allowDangerousEmailAccountLinking`). *Potential* — depends on Auth.js provider defaults; the mobile route does check it. | `services/auth.ts:88-116`, `services/auth.config.ts:36` | `if (account.provider==="google" && profile?.email_verified!==true) return false`. |
| M3 | Verification-token lookup matches `IN [sha256(raw), raw]` permanently, so a DB-read stored hash is itself a valid token. | `services/tokens.ts:44-47` | Drop the raw-value branch (legacy tokens are long expired). |
| M4 | JWT callback re-reads the user by `token.email`, not `token.id`; a deleted account's cookie keeps renewing at the edge and revives if the address is re-registered, carrying the deleted user's id. | `services/auth.ts:147-153` | Look up by `token.id` and require `dbUser.email === token.email`. |
| M5 | Rate limiter fails open: an Upstash error allows the request instead of falling back to Postgres. Client IP is the first `x-forwarded-for` entry (safe on Vercel; spoofable behind any other proxy — *Potential*). | `services/rate-limit.ts:53-60,116-126` | Fall back to Postgres on Upstash error; fail closed for `auth:*`; prefer `x-vercel-forwarded-for`. |
| M6 | Push device tokens survive logout, and re-registration on another account is refused (409): a shared phone keeps receiving the previous user's notifications (private messages, payments). | `app/api/v1/auth/logout/route.ts:14-31`, `app/api/v1/notifications/device-token/route.ts:33-39` | Delete the device token on logout (client sends it) and on revoke-all; allow token hand-over to the new user. |
| M7 | If `R2_PRIVATE_BUCKET_NAME` is unset, private files (payment screenshots, receipts, certificates with predictable keys `private/documents/receipts/<id>.pdf`) go to the **public** bucket. *Potential.* | `utils/s3.ts:11,48`, `services/documents.ts:20-28` | Require it in production and fail if equal to the public bucket; add a random suffix to document keys. |

**Payments, receipts, coupons, commerce**

| # | Finding | Location | Fix |
|---|---|---|---|
| M8 | Voided payments: web receipt route serves them (mobile route refuses); admin can generate a fresh invoice number and e-mail it. | `app/api/receipt/[paymentRecordId]/route.ts:26-37`; `app/actions/receipts.ts:28-42,147-157` | Treat `voidedAt` as not found / refuse. |
| M9 | Deleting a receipt nulls an issued invoice number (GST series gap) with no audit; deleting a certificate and `removeEnrollmentFromCourse` (hard delete cascading to certificate, grades, attendance, private messages) are also unaudited. | `app/actions/receipts.ts:102-136`, `app/actions/certificates.ts:~86-116`, `app/admin/enrollments/actions.ts:216-226` | Mark cancelled + keep the number, `recordAudit` every one; refuse removing enrollments with certificates/payments. |
| M10 | Coupon usage is recorded at **submission**, so a declined submission permanently burns the coupon (and deactivates SPECIAL ones); a "BOTH fees" waiver is a single SPECIAL coupon consumed by its first use. | `services/payments.ts:214`, `services/coupons.ts:34-53,141-146`, `app/admin/coupons/actions.ts:259-284` | Record usage on approval (or release on decline); track usage per fee type. |
| M11 | "One-time" fee label includes the year, so it can be paid again every year (or twice via `paymentYear`). | `services/monthly-payments.ts:173-174`, `app/api/v1/payments/submit/route.ts:96` | Constant period key for ONE_TIME (see H7). |
| M12 | Admin receipt list stuck on page 1: `clampPage(page, pageSize, totalCount)` but signature is `(page, totalCount, pageSize)`. | `services/receipts-admin.ts:60` vs `utils/pagination.ts:26` | Swap arguments; add a unit test. |
| M13 | "Void manual record" voids any record (fee or book order), leaving its submission APPROVED or its order APPROVED without income. | `app/admin/payments/actions.ts:253-263` | Refuse records that have a submission or `bookOrderId`. |
| M14 | Paid fee submissions accepted with no UTR and no screenshot. | `utils/validations.ts:185-191`, `services/payments.ts:184,204` | Require UTR or screenshot when amount > 0. |
| M15 | Refunding a SHIPPED order makes its stock available again although the books are with the customer → oversell. | `services/inventory.ts:7-15`, `app/admin/bookstore/orders/actions.ts:230` | Negative stock movement unless admin confirms a return. |
| M16 | Coupon dates: stored as UTC days with a +24 h "timezone buffer"; the edit dialog renders in browser-local time, so each open/save pushes `validUntil` forward a day; a Dec 1–31 coupon works 05:30 IST Nov 30 → 05:29 IST Jan 1. | `app/admin/coupons/actions.ts:35-43`, `services/coupons.ts:31,59`, `components/admin/EditCouponDialog.tsx:55-62`, `utils/validations.ts:594-597` | Use `businessDayStart/End/formatBusinessDate` from `services/business-time.ts`; drop the buffer. |
| M17 | Invoice date printed in server-local (UTC) time while the financial year in the number is IST → a receipt from 02:00 IST on 1 April is numbered `/2026-27/` but dated 31 March. | `services/payment-receipt.ts:143`, `services/document-numbers.ts:17-22` | Format with `timeZone: BUSINESS_TIMEZONE`. |
| M18 | `scripts/recompute-receipt-gst.ts --apply` corrects the GST split but leaves `receiptPdfKey`, so the stale PDF keeps being served; it doesn't exclude voided records. | `scripts/recompute-receipt-gst.ts:81-86`, `services/documents.ts:80-81` | Null the key and delete the stored PDF; filter `voidedAt: null`. |

**Notifications, data & performance**

| # | Finding | Location | Fix |
|---|---|---|---|
| M19 | Course announcements notify rejected, awaiting-fee and soft-deleted users (`status: { not: pending_approval }`). | `services/notifications.ts:259-268` | `status in [active, completed]`, `user.deletedAt: null`. |
| M20 | Bulk announcement e-mail does one DB query per recipient, 5 at a time with 100 ms sleeps, inside `after()` — times out partway for large audiences. | `services/notifications.ts:82-88,404-430,493-510` | One `findMany` for recipients; move bulk sends to a queue/cron. |
| M21 | Each PDF launches its own Chromium with no per-instance concurrency limit (Fluid compute shares instances) → OOM under bursts. *Potential.* Full `puppeteer` is a prod dependency (downloads Chrome on every build) and statically imported. | `services/pdf-generator.ts:1,89`; `package.json:52-53` | Module-level semaphore or shared browser; move `puppeteer` to devDependencies with dynamic import. |
| M22 | `RateLimitBucket` rows (incl. raw e-mails) are never pruned when Upstash isn't configured. | `services/rate-limit.ts:84-103` | Probabilistic `DELETE … WHERE windowStart < now()-1d` or a cron; hash identifiers. |
| M23 | Unbounded admin lists / JS aggregation: certificate candidates, `getStudentUsers` (full `User` rows incl. password hash fetched just for a dropdown — mapped before leaving the server, so no leak), waiver requests, bookstore finance summary, waiver finance, the xlsx export. | `services/certificates-admin.ts:102`, `services/students.ts:70-76`, `services/coupons-admin.ts:42`, `services/finance-bookstore.ts:61-84`, `services/waiver-finance.ts:117`, `app/api/admin/finance/export/route.ts:44-107` | `select` + `take`/search; `aggregate`/`groupBy`; cap or stream exports. |

**Build, CI, dependencies**

| # | Finding | Location | Fix |
|---|---|---|---|
| M24 | `check-migration-safety.sh` misses `UPDATE`/`DELETE … WHERE true`, unquoted `ALTER COLUMN x TYPE`, `RENAME`, `SET NOT NULL`, `DROP CONSTRAINT/TYPE/SCHEMA`. | `scripts/check-migration-safety.sh:22,27` | Broaden patterns or adopt a SQL linter (e.g. squawk). |
| M25 | CI: `npm audit` is `continue-on-error`; `next build` only runs in the post-merge e2e job; e2e never runs on PRs (CONTRIBUTING says PRs go to master = production); no coverage measurement. | `.github/workflows/ci.yml:91,109,149`; `vitest.config.mts` | Add `next build` to `verify`; run e2e on PRs to master; `npm audit --omit=dev` with an allow-list; v8 coverage with thresholds on `services/`. |
| M26 | Dependency advisories: 13 high / 13 moderate. Actionable: **nodemailer 8.0.11** (direct; 9 advisories incl. address-parser recipient injection and pre-auth DoS, fixed after 10.1.3), **prisma 6.19** (fix in 7.x), `next-auth` beta via `@auth/core` → nodemailer. `xlsx` advisories are parser-side and not reachable (write-only use) but keep the audit muted. | `package.json`; `npm audit` | Upgrade nodemailer (check the `next-auth` peer range), plan Prisma 7; replace `xlsx` with `exceljs`; `npm audit fix` for transitive ones. |

**Architecture & code quality**

| # | Finding | Location | Fix |
|---|---|---|---|
| M27 | Documented layering not followed: the mobile staff API executes web `"use server"` actions; `services/api-course-tools.ts:4-20` imports `@/app/actions/*` (upward dependency); payment/coupon/enrollment/book-order state machines live in `app/`; 40 non-API `app/` files (8 pages) import Prisma. | `services/api-staff.ts:16-25`, `services/api-course-tools.ts:4-20`, `app/admin/bookstore/orders/actions.ts:53-303` | Move rules into `services/*` returning typed results; actions/routes become thin adapters; enforce with ESLint `no-restricted-imports`. |
| M28 | Duplicated flows that have already drifted: enrollment start (`app/actions/checkout.ts:14-108` vs `app/api/v1/enrollments/route.ts:44-123`), credential login, registration (web returns 500 after creating the user if e-mail fails; v1 ignores it), and the teacher-course check implemented four times (`services/course-authorization.ts:7`, `services/course-announcement-actions.ts:33-48`, `services/api-course-tools.ts:80`, `app/api/files/[...key]/route.ts:22-24` — the last without e-mail normalisation). | as listed | One service per rule: `requestEnrollment`, `authenticateCredentials`, `registerUser`, `assertCourseAccess`. |
| M29 | 16 imports of Next.js internals (`next/dist/client/components/redirect-error`, `http-access-fallback`) — the staff API's redirect translation depends on them and can break on any Next upgrade. | e.g. `services/api-staff.ts:3-8`, `utils/action-utils.ts:1`, `components/shared/ActionButton.tsx:5` | `unstable_rethrow` from `next/navigation`, or one adapter module. |
| M30 | No `error.tsx`, `not-found.tsx` or `global-error.tsx` anywhere in `app/` (80 `notFound()` calls hit the default unbranded page). Client components import Prisma-backed service modules (e.g. `components/payment/EnrollmentPaymentForm.tsx:10` → `services/coupons`) with no `server-only` guard — bundle safety relies on tree-shaking and isn't verified on PRs. | `app/`; `utils/prisma.ts` | Add the error pages (root + admin/teacher/profile); move pure helpers/constants to `utils/`/`config/`; `import "server-only"` in `utils/prisma.ts`. |

### LOW

| # | Finding | Location |
|---|---|---|
| L1 | Per-e-mail login limit counts successes and failures and is shared with change-password → anyone can lock a user out (5/15 min). | `services/rate-limit.ts:32`; `services/auth.ts:59`; `app/api/v1/auth/change-password/route.ts:18` |
| L2 | Unsubscribe shares the forgot-password IP bucket. | `app/api/email/unsubscribe/route.ts:48` |
| L3 | User enumeration: no dummy bcrypt for unknown users (timing); register says "account already exists" (web + v1). | `services/auth.ts:68`; `app/api/auth/register/route.ts:27`; `app/api/v1/auth/register/route.ts:31` |
| L4 | CSP report-only by default, no `report-uri/report-to`, `upgrade-insecure-requests` never added (middleware doesn't pass `{enforce}`). | `services/security-headers.ts:25-42`; `middleware.ts:73-85` |
| L5 | Password max length inconsistent: reset/login unbounded; bcrypt silently truncates at 72 bytes while 128 chars are allowed. | `utils/validations.ts:138` |
| L6 | Reset token read-then-delete is not atomic → two concurrent resets can both succeed. | `services/password-reset.ts:64-73` |
| L7 | Reset/verification links (live tokens) logged when SMTP is unset. | `services/email/core.ts:147-153` |
| L8 | `Content-Disposition` built from raw student name → 500 for non-Latin names, broken header with `"`. | `app/api/v1/admin/students/[id]/id-card/route.ts:19-21` (also hand-built filenames in receipt/certificate routes) |
| L9 | Commenter e-mail exposed to blog author in notifications when name is empty. | `services/blog-engagement.ts:81,87` |
| L10 | Teacher can overwrite their own approved/pending fatwa answer via action/API despite `canEdit:false`, unpublishing it. | `app/teacher/(portal)/fatwa/actions.ts:32-46` |
| L11 | Teachers can read/mark enrollments that aren't approved (no status filter). | `services/api-course-tools.ts:325-329`; `services/enrollments.ts:295`; `services/grades.ts:83-97`; `services/attendance.ts:90-99` |
| L12 | An announcement's author keeps attachment access after leaving the course. | `app/api/files/[...key]/route.ts:42` |
| L13 | `check-page-auth.sh` matches the guard name anywhere (comment/unused import passes). | `scripts/check-page-auth.sh` |
| L14 | Same UTR can back a fee and a book order; case-sensitive. | migration `20261103000300` |
| L15 | Duplicate `bookId` lines bypass the 20-copy limit. | `utils/validations.ts:530-538`; `services/book-orders.ts:129` |
| L16 | No expected-total check on book orders (price change between quote and submit). | `services/book-orders.ts:160-170` |
| L17 | Reports use current fees/costs for historic rows (waiver finance, receipt discount, bookstore profit). | `services/waiver-finance.ts:56-60,133-141`; `services/payment-receipt.ts:111-123`; `services/finance-bookstore.ts:91,121` |
| L18 | Reopening a course reverts all COMPLETED enrollments (incl. certified) to ACTIVE; manual payment `amountInr` unbounded (Int overflow → DB error). | `services/completion.ts:23-26`; `utils/validations.ts:393` |
| L19 | `revalidateTag(tag,"max")` serves stale content once after unpublish; featured reviews don't filter deleted users. | `services/public-cache.ts:58`; `services/student-reviews.ts:88-96` |
| L20 | `BookOrderItem.book` `onDelete: Cascade` (financial history guarded only by a non-atomic app check). | `prisma/schema.prisma:777` |
| L21 | Sitemap lists only `PUBLISHED` courses, omitting ONGOING/COMPLETED/COMING_SOON that are publicly visible. | `app/sitemap.ts` |
| L22 | Dead/unmounted code: `PwaRegister` and `GoogleAnalytics` are never rendered (service worker and GA silently off despite `NEXT_PUBLIC_GA_MEASUREMENT_ID`); 26 unused exports (knip); orphaned `app/(public)/courses/loading.tsx`. | `components/site/PwaRegister.tsx`; `components/site/GoogleAnalytics.tsx` |
| L23 | 12 routes call `request.json()` directly → 500 on malformed JSON instead of 400; 29 v1 routes hand-roll error envelopes; `/api/auth/*` uses `{error}` without `success`. | e.g. `app/api/v1/auth/login/route.ts:10` |
| L24 | Misc: swallowed DB errors (`app/admin/fatwa/actions.ts:62,147`); duplicated `runLookup` in two admin forms without out-of-order guard; seven near-identical `*-upload.ts` wrappers with a shared `"announcements"` prefix; half-finished text→enum status migration (`services/status-compat.ts`, 24 files); `middleware.ts` uses the deprecated name (Next 16 `proxy.ts`); placeholder `cdn.your-academy.com` image host fallback; declined screenshots not deleted from R2. | as listed |

---

## 3. Prioritised implementation plan

Each step ships with its regression test(s). Estimates are engineer-days for one developer familiar with the code.

### Phase 0 — Stop the bleeding (≈2–3 days, do first)
1. **C1** Role requires verified e-mail in `authenticateApiRequest` + `requireStaffApiAuth`; API test per staff role with an unverified account. *(0.5d)*
2. **H3 + H2 (API part)** Call `revokeAllApiSessions` on reset, verification, and both Google take-over paths; mark `emailVerified` on reset. *(0.5d)*
3. **H4** Lock `image` to avatars/Google in the API schema; ownership check in `r2KeyFromUrl`/delete paths. *(0.5d)*
4. **H1** Status-guarded claim in fee approve/decline; roll number inside the transaction; concurrent test. *(0.5d)*
5. **H5** `processEnrollmentPayment` requires an existing awaiting-fee row and re-checks course/profile. *(0.5d)*
6. **H10** Seed `update: {}`; move coupons/testimonials to the demo seed. **Operational check now:** in production, confirm `WELCOME50`/`EARLYBIRD20`/`SCHOLARSHIP100` are inactive or absent. *(0.25d)*
7. **H11** Gate `migrate deploy` on `VERCEL_ENV`; **operational check now:** confirm Preview env vars don't point at the production DB. *(0.25d)*

### Phase 1 — Money integrity (≈4–5 days)
8. **H7 + M11** `periodKey` column (additive migration + backfill) with partial unique index; then switch dedupe to it.
9. **H6 + M10** Coupon redemption via `create` in-transaction; record on approval / release on decline; per-fee-type usage for BOTH waivers.
10. **H9, M13** Void flows revert enrollment state; restrict void-manual to manual records.
11. **H8** Certificate status rules + filtered, paginated candidate list.
12. **M8, M9** Voided receipts refused everywhere; receipts/certificates cancelled-not-deleted with audit; guard enrollment removal.
13. **M12** `clampPage` argument fix (trivial; can go in Phase 0).
14. **M14, M15, M16, M17, M18** Proof required on paid submissions; shipped-refund stock; IST date handling for coupons and receipts; fix the GST script.

### Phase 2 — Auth hardening (≈3 days)
15. **H2 (web part)** `sessionVersion` in JWT; bump on reset/change.
16. **M1** Refresh-token families with reuse detection.
17. **M2, M3, M4** `email_verified` in web Google sign-in; drop raw token fallback; JWT lookup by id.
18. **M5, L1, L2, L3** Rate-limiter fallback/fail-closed for auth, failure-only counting, separate buckets, dummy bcrypt.
19. **M6, M7** Device-token cleanup on logout; require private bucket in production.
20. **L4** Enforce CSP in production with a report endpoint.

### Phase 3 — Platform, performance, CI (≈4–5 days)
21. **H12** Presigned direct-to-R2 uploads; lower global server-action body limit.
22. **H13** Staff-API and files-route test suites; add tests for password reset, unsubscribe, coupon request approve/reject.
23. **M25, M26** `next build` and e2e on PRs; coverage thresholds; blocking audit with allow-list; upgrade nodemailer, replace xlsx, plan Prisma 7.
24. **M19, M20** Announcement recipient filter; batched recipient query and queued bulk e-mail.
25. **M21, M22, M23** PDF concurrency limit, `puppeteer` to devDeps; rate-limit pruning; bounded admin lists and SQL aggregates.
26. **M24** Stronger migration safety check.

### Phase 4 — Architecture and quality (ongoing, ≈1–2 weeks spread)
27. **M27, M28** Extract payment, coupon, enrollment and book-order state machines into `services/` with typed results; unify enrollment start, login, registration, and `assertCourseAccess`; add `no-restricted-imports` rules (services ↛ app, pages ↛ prisma).
28. **M29** Replace Next internals with `unstable_rethrow` / one adapter.
29. **M30** Error pages; `server-only` on Prisma; move pure helpers out of service modules.
30. **Lows** L5–L24 as touched; mount or delete `PwaRegister`/`GoogleAnalytics`; add knip to CI.

**Suggested order of PRs:** Phase 0 items as 3–4 small PRs (auth identity; sessions; photo; payments) so they can deploy within days → Phase 1 behind the additive `periodKey` migration → Phases 2–3 in parallel by different people → Phase 4 incrementally alongside feature work.
