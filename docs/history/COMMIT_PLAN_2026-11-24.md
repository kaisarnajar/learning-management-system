# Commit Plan — Remediation of the 2026-11-24 Code Review

**Source:** [`CODE_REVIEW_2026-11-24.md`](CODE_REVIEW_2026-11-24.md) (1 Critical, 13 High, 30 Medium, 24 Low) plus 7 supplementary observations (X1–X7) that the review passes reported but the report folded into other items.
**Target branch:** `dev` (local `dev` tracking `origin/dev`; today `origin/dev` = `origin/master` = `af70413`). `dev` is later merged into `master` through a PR, per `docs/CONTRIBUTING.md`.
**Total:** 108 commits in 8 phases (0–7). Every review ID appears in at least one commit. The traceability matrix (§5) maps each ID to its commit(s).

---

## 1. Conventions every commit follows

- **Subject:** `type(scope): summary` in the imperative. This is the repo convention (`docs/CONTRIBUTING.md`).
- **Body:** explains *why*. The last lines are `Review: 2026-11-24 <IDs>` and the attribution line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **One concern per commit:**
  - Schema changes get their own commit, always *expand first*: an additive migration in one commit, then the code that uses it. They never share a commit with a behaviour change.
  - Migrations follow `docs/OPERATIONS.md`: additive only, `IF NOT EXISTS` guards, every new `NOT NULL` column has a default.
  - `npm run db:drift` and `npm run db:safety` must pass.
- **Tests:** every behaviour change ships with the test that would have caught the issue, in the same commit.
- **API contract:** any change to an `/api/v1` request or response updates `docs/openapi.yaml` in the same commit. `tests/unit/openapi-coverage.test.ts` keeps them in sync.
- **Standard validation gate**, run before every commit; this is what "Std" means in each validation line below:
  ```
  npx prisma generate && npx tsc --noEmit && npx eslint . --ignore-pattern ".claude/**"
  npm run test:unit
  DATABASE_URL_TEST=… npm run test:integration && npm run test:api && npm run test:security
  bash scripts/check-page-auth.sh && bash scripts/check-env-example.sh
  ```
  Migration commits also run `npm run db:drift && npm run db:safety`. Commits that touch pages or bundling also run `npx next build`.
- **Precondition, done once:** `npm ci` (`node_modules` is not installed yet) and a disposable local Postgres for `DATABASE_URL_TEST`.
- **Mobile app impact:** commits that change `/api/v1` behaviour are marked 📱. They need a matching mobile release, or must stay backward-compatible as described in the commit.

---

## 2. Decisions needed before the affected commits

These are product choices, not engineering ones. **Resolved 2026-11-24: the owner approved the defaults below.**

| # | Decision | Default in this plan | Affects |
|---|---|---|---|
| D1 | What a "both fees" waiver means for course fees: one course-fee payment, or every course-fee period? | Issue two SPECIAL coupons, one for the enrollment fee and one for a single course-fee payment, so the e-mail matches what is granted. | 2.6 |
| D2 | Does voiding a payment give the student their coupon back? | Yes. Voiding releases the `CouponUsage` row and reactivates a SPECIAL coupon. | 2.7 |
| D3 | Registration with an existing e-mail: keep "account already exists" (friendlier) or answer generically (no enumeration)? | Generic answer, and the existing owner gets a "someone tried to register" e-mail. | 4.9 |
| D4 | PWA and Google Analytics components are never mounted: mount them (GA needs a consent banner and CSP entries) or delete them? | Mount `PwaRegister`; delete `GoogleAnalytics` and its env var until consent is designed. | 7.12 |
| D5 | Large uploads: presigned direct-to-R2 uploads (needs an R2 CORS rule), or cap files below 4.5 MB? | Presigned uploads. | 5.8–5.10 |
| D6 | Prisma 7 upgrade: in this programme or scheduled separately? | Separate, last commit of Phase 6, after everything else is stable. | 6.6 |

## 3. Operational steps (not commits; done by you on the live systems)

| When | Step |
|---|---|
| **Now, before any code** | In production, check that coupons `WELCOME50`, `EARLYBIRD20` and `SCHOLARSHIP100` are inactive or absent (H10). |
| **Now** | In Vercel → Settings → Environment Variables, confirm that `DATABASE_URL` and `DIRECT_URL` for **Preview** do not point at the production database (H11). |
| **Now** | Confirm `R2_PRIVATE_BUCKET_NAME` is set in production and differs from `R2_BUCKET_NAME` (M7). Commit 4.12 turns this into a hard failure. |
| After 2.2 is deployed | Run `scripts/backfill-period-key.ts` (dry run, then `--apply`) and resolve any duplicate periods it reports. (2.4 does not wait for this; see 2.4.) |
| After 4.13 is deployed | Watch CSP reports for a week, then set `CSP_ENFORCE=true` (L4). |
| Before or after 5.24 is deployed | Add the R2 CORS rule for presigned PUT from the site origin (D5), e.g. with `scripts/configure-r2-cors.ts`. Until then, uploads under 4 MB fall back to the form path. |

---

## 4. The commits, in order

The "Depends on" line lists hard dependencies. Commits without one can be reordered within their phase.

### Phase 0 — Critical security and data safety (10 commits)

These are deployable on their own. Merge `dev` → `master` as soon as this phase is green.

#### 0.0 `docs: add the 2026-11-24 code review and remediation plan`
- **Covers:** none (traceability).
- **Files:** `docs/history/CODE_REVIEW_2026-11-24.md`, `docs/history/COMMIT_PLAN_2026-11-24.md`
- **Change:** commit the review report and this plan, so every later `Review:` line points at a document in the repo.
- **Tests / validation:** none; documentation only.

#### 0.1 `fix(auth): staff API access requires a verified e-mail` 📱
- **Covers:** C1
- **Files:**
  - `services/api-auth.ts`: in `authenticateApiRequest` (line 183) and `rotateApiSession` (line 112), set the role to `USER` when `emailVerified` is null.
  - `services/api-staff.ts`: `requireStaffApiAuth` refuses an unverified user with 403.
  - `app/api/v1/auth/register/route.ts`: unchanged behaviour (still issues a USER session); add a comment that the role is only granted after verification.
  - `docs/openapi.yaml`
- **Change:** a staff role is granted only after e-mail verification. Access is still derived from the e-mail address, as before.
- **Tests:** in `tests/api/auth.test.ts`, register through the API with:
  - an address that has a `Teacher` row, then call `GET /api/v1/teacher/courses`: expect 403;
  - an `ADMIN_EMAIL` address, then call `GET /api/v1/admin/dashboard`: expect 403;
  - each of the two, verified: expect 200.
- **Validation:** Std.

#### 0.2 `fix(auth): end API sessions when an account is reclaimed or its password reset`
- **Covers:** H3, and the API half of H2.
- **Files:**
  - `services/auth.ts` (signIn take-over branch, lines ~102–113)
  - `app/api/v1/auth/google/route.ts` (lines 103–112)
  - `app/verify-email/actions.ts` (lines 23–36)
  - `app/api/auth/reset-password/route.ts`
  - `services/api-auth.ts`: `revokeAllApiSessions` now has callers.
- **Change:** call `revokeAllApiSessions(userId)` wherever an unverified row is taken over, on e-mail verification, and on password reset.
- **Tests:**
  - `tests/api/auth.test.ts`: register → hold a refresh token → reset the password → refresh is refused. Same for verify-email, and for mobile Google sign-in on an unverified row.
  - `tests/integration` (or a new unit test on the signIn callback with a mocked adapter): web Google take-over revokes the tokens.
- **Validation:** Std.

#### 0.3 `fix(auth): a password reset is single-use and verifies the e-mail`
- **Covers:** L6, L16
- **Depends on:** 0.2 (same route).
- **Files:**
  - `services/password-reset.ts` (lines 64–73): consume with `deleteMany({ where: { tokenHash, expiresAt: { gt: now } } })` and require `count === 1`.
  - `app/api/auth/reset-password/route.ts`: set `emailVerified` if it is null.
- **Tests:**
  - Two concurrent resets with the same token: exactly one succeeds.
  - Resetting an unverified account lets it sign in with credentials.
- **Validation:** Std.

#### 0.4 `fix(profile): only the owner's own upload can be replaced or deleted` 📱
- **Covers:** H4
- **Files:**
  - `utils/validations.ts`: `apiProfileUpdateSchema.image` accepts only the two `/assets/` avatars and `*.googleusercontent.com`. Arbitrary R2 URLs are rejected, so uploads only arrive through `/me/photo`.
  - `services/storage.ts`: new `ownedProfileImageKey(userId, url)` matches `^uploads/profiles/<userId>-[A-Za-z0-9-]+\.(jpg|png|webp|gif)$` and rejects `..` and `%`.
  - `services/profile-upload.ts`: `deleteProfileImage(userId, url)` deletes only owned keys.
  - Callers: `app/api/v1/auth/me/photo/route.ts` (lines 55, 72), `app/profile/actions.ts` (lines 48–52, 97–99), `services/account-deletion.ts` (lines 118–119), `app/admin/students/actions.ts:152` (owner = the student).
  - `docs/openapi.yaml`
- **Tests:**
  - `tests/security/access-control.test.ts`: user A sets `image` to B's upload URL → 400.
  - With a foreign URL forced into the database, every delete path leaves the object alone (mock the R2 client and assert no `DeleteObject`).
  - Unit tests for `ownedProfileImageKey`, including traversal strings.
- **Validation:** Std, plus a manual check: upload a photo, replace it, remove it.

#### 0.5 `fix(payments): claim a fee submission before approving or declining it`
- **Covers:** H1, and the roll-number part of review Payments #22.
- **Files:** `app/admin/payments/actions.ts`
  - `confirmMonthlyPayment` (lines 43–140): inside the transaction, `updateMany({ where: { id, statusEnum: PENDING_VERIFICATION, deletedAt: null }, data: APPROVED })`, then abort if `count === 0` with `AlreadyProcessed`. Only then create the `PaymentRecord` and link it. Assign the roll number with `assignRollNumberTx(tx, …)` in the same transaction.
  - `declineMonthlyPayment` (lines 144–200): the same guarded claim.
- **Tests:** `tests/integration/payments.test.ts`
  - `Promise.all([approve, approve])` → exactly one `PaymentRecord`.
  - `Promise.all([approve, decline])` → either APPROVED with a record, or DECLINED with none, never a mix.
  - An approved enrollment fee has a roll number.
- **Validation:** Std, plus an e2e run of `student-enrollment-payment.spec.ts`.

#### 0.6 `fix(payments): an enrollment fee needs an enrollment that is awaiting it` 📱
- **Covers:** H5
- **Files:**
  - `services/payments.ts`, `processEnrollmentPayment` (lines 246–322): require an existing row in `AWAITING_ENROLLMENT_FEE` (no upsert-create). Re-check `isCourseEnrollmentOpen` and profile completeness. Replace the upsert with a status-guarded `updateMany`.
  - Callers: `app/actions/payments.ts`, `app/api/v1/payments/submit/route.ts` (error mapping).
- **Tests:** in `tests/integration/enrollments.test.ts` and `payments.test.ts`:
  - rejected enrollment → 400, status unchanged;
  - no enrollment row → 400;
  - DRAFT or ON_HOLD course with a 100% coupon and auto-approve on → refused;
  - the happy path still activates.
- **Validation:** Std.

#### 0.7 `fix(seed): the bootstrap seed only creates, never overwrites`
- **Covers:** H10
- **Files:**
  - `prisma/seed-bootstrap.ts`: `update: {}` on every upsert (courses, teachers, library, coupons). Move the three DEFAULT coupons and the testimonial users and reviews into the demo seed (`prisma/seed-demo-content.ts`).
  - `README.md` step 4 and `docs/OPERATIONS.md`: state exactly what the bootstrap seed creates.
- **Tests:** a new `tests/integration/seed-bootstrap.test.ts`:
  - run the seed, edit a course title and price, run it again → the edits survive;
  - no `Coupon` rows exist after the bootstrap seed.
- **Validation:** Std, plus running `npm run db:seed` twice against a disposable database.

#### 0.8 `build(vercel): run migrations only for production builds`
- **Covers:** H11
- **Files:**
  - New `scripts/vercel-build.sh`: `prisma migrate deploy` runs only when `VERCEL_ENV=production` (or when an explicit `RUN_MIGRATIONS=true` is set for a staging project).
  - `package.json`: `vercel-build` calls the script; remove the unused `vercel-build:staging`.
  - `docs/OPERATIONS.md`
- **Tests / validation:**
  - `VERCEL_ENV=preview bash scripts/vercel-build.sh --dry-run` prints "skipping migrations".
  - `VERCEL_ENV=production … --dry-run` prints the migrate step.
  - Std.
  - ⚠ The first production deploy after this commit must show "Applying migrations" in the build log.

#### 0.9 `fix(receipts): the admin receipt list pages past page one`
- **Covers:** M12
- **Files:** `services/receipts-admin.ts:60`: call `clampPage(page, totalCount, pageSize)`.
- **Tests:** an integration test with 45 receipts and page size 20: page 3 returns 5 rows. Also `GET /api/v1/admin/receipts?page=2`.
- **Validation:** Std.

---

### Phase 1 — Test safety net (3 commits)

These come before the larger behaviour changes and refactors, so later commits have coverage.

#### 1.1 `test(api): cover the staff API's roles, actor bridge and error mapping`
- **Covers:** H13 (staff API part)
- **Files:** new `tests/api/staff.test.ts`; helpers in `tests/helpers/api.ts` (`bearerFor(user, role)`).
- **Cases:**
  - USER calling an admin route, or a teacher calling an admin route → 403.
  - An unverified staff e-mail → 403 (pins 0.1).
  - A teacher passing another teacher's `courseId` → 404.
  - A server-action redirect with a flash error maps to 400; `notFound()` maps to 404.
  - One write per area (payments approve, enrollment approve, announcement create, grade save) returns the documented envelope.
- **Validation:** Std.

#### 1.2 `test(security): cover private file authorization`
- **Covers:** H13 (files route part)
- **Files:** new `tests/security/files-route.test.ts`
- **Cases:**
  - Payment screenshot: owner → 302 to a presigned URL; another student → 404; admin → 302.
  - Announcement attachment: teacher of the course → 302; teacher of another course → 404; a private message to student B, read by student A → 404.
  - A malformed key or a `..` key → 404.
- **Validation:** Std.

#### 1.3 `test: cover password reset, unsubscribe, waiver requests and PDF rendering`
- **Covers:** H13 (remaining untested flows: review Architecture #14)
- **Files:** `tests/api/password-reset.test.ts`, `tests/api/unsubscribe.test.ts`, `tests/integration/waiver-requests.test.ts`, `tests/integration/pdf-smoke.test.ts`.
  - The PDF smoke test runs only when Chromium is available, behind a `PDF_SMOKE=1` flag set in CI.
- **Cases:**
  - Reset: token expiry, reuse, unknown token.
  - Unsubscribe: the HMAC is checked; GET is idempotent.
  - Waiver requests: approve or reject is guarded against double processing.
  - PDF: a receipt renders, has the `%PDF` header, and the stored-PDF fallback works.
- **Validation:** Std. The CI workflow sets `PDF_SMOKE=1` in the verify job, after installing Chromium through Puppeteer.

---

### Phase 2 — Money integrity (21 commits)

#### 2.1 `fix(payments): deleting a declined submission's screenshot from storage`
- **Covers:** L24 (declined screenshots left in R2)
- **Depends on:** 0.5
- **Files:** `app/admin/payments/actions.ts` (decline: call `deletePaymentScreenshot` after the commit).
- **Tests:** in the integration test with a mocked R2 client, decline → `DeleteObject` is called for the screenshot key.

#### 2.2 `feat(db): add a billing period key to fee submissions`
- **Covers:** H7, M11 (expand step)
- **Files:**
  - `prisma/schema.prisma`: `CoursePaymentSubmission.periodKey String?` plus a non-unique `@@index([userId, courseId, periodKey])`.
  - Migration `2026112400xx_payment_period_key` with `IF NOT EXISTS` guards.
  - New `scripts/backfill-period-key.ts`: dry run by default. It derives the key from `paymentType` and the label (`MONTHLY:2026-01`, `QUARTERLY:2026-Q1`, `ONE_TIME`, `ENROLLMENT`), writes a snapshot to `scripts/out/`, and reports any live duplicates.
- **Tests:** a unit test for the label → key parser, covering every label format in `services/monthly-payments.ts`, including coupon-suffixed labels.
- **Validation:** Std, `db:drift`, `db:safety`, and the script's dry run on a seeded database.

#### 2.3 `fix(payments): one submission per billing period, whatever the coupon` 📱
- **Covers:** H7, M11
- **Depends on:** 2.2
- **Files:**
  - `services/monthly-payments.ts` (lines 173–174): a ONE_TIME period key that is not tied to a year.
  - `services/payments.ts` (lines 159–172): write `periodKey`. The duplicate check is by `periodKey`, with a fallback of label `startsWith(baseLabel)` for legacy rows where it is null.
  - `app/api/v1/payments/submit/route.ts`: `paymentYear` no longer splits the one-time fee.
  - `docs/openapi.yaml`
- **Tests:**
  - January approved with a coupon, then January submitted without one → 409.
  - A one-time fee in 2026, then again in 2027 → 409.
  - Through the API with `paymentYear=2027` → 409.
- **Validation:** Std.

#### 2.4 `feat(db): enforce one live submission per billing period`
- **Covers:** H7, M11 (contract step)
- **Depends on:** 2.3, plus the operational backfill (§3).
- **Files:** a migration adding a partial unique index `ON "CoursePaymentSubmission"("userId","courseId","periodKey") WHERE "deletedAt" IS NULL AND "periodKey" IS NOT NULL AND status NOT IN ('declined','rejected')`. It is excluded from drift the same way the existing partial indexes are (`scripts/check-migration-drift.sh`).
- **Tests:** an integration test inserting a duplicate directly → P2002.
- **Validation:** Std, `db:drift`, `db:safety`.
- **Safe to ship before the backfill:** the index only covers rows with a `periodKey`, and every row written since 2.3 is already deduplicated by the application. The backfill extends the protection to historic rows; it is not a precondition for the migration.

#### 2.5 `fix(coupons): redeem a coupon atomically`
- **Covers:** H6
- **Files:** `services/coupons.ts` (lines 121–147): `recordCouponUsageTx` uses `couponUsage.create`. A P2002 becomes `CouponAlreadyUsedError`, which the submit paths map to 409. SPECIAL deactivation becomes `updateMany({ where: { id, isActive: true } })` with a count check.
- **Tests:** two concurrent submissions (different periods) with the same coupon → one succeeds, the other gets 409, and there is one usage row.
- **Validation:** Std.

#### 2.6 `fix(coupons): a coupon is spent when its payment is approved`
- **Covers:** M10 (first part)
- **Depends on:** 0.5, 2.5
- **Files:**
  - `services/payments.ts` (line 214): at submission, only *reserve* the coupon (it stays visible through the pending submission's `couponId`).
  - `app/admin/payments/actions.ts`: approval writes `CouponUsage` and deactivates a SPECIAL coupon in the claim transaction; decline writes nothing.
  - The auto-approve path writes usage immediately.
  - `services/coupons.ts` (lines 34–53): "used" means a usage row exists *or* a pending submission holds the coupon.
- **Tests:**
  - Submit with a coupon, decline, resubmit with the same coupon → accepted.
  - Two pending submissions cannot hold the same coupon.
- **Validation:** Std.
- **Data:** optional `scripts/release-declined-coupon-usage.ts` (dry run by default) to give back coupons that past declines burned.

#### 2.7 `fix(payments): voiding an enrollment fee reopens it and returns the coupon`
- **Covers:** H9 (and D2)
- **Depends on:** 2.6
- **Files:** `app/admin/payments/actions.ts`, `voidApprovedPayment` (lines 202–231). For ENROLLMENT payments, move the enrollment to `AWAITING_ENROLLMENT_FEE`, guarded on ACTIVE or COMPLETED. The roll number is kept, because sequences never repeat. Delete the `CouponUsage` row and reactivate a SPECIAL coupon.
- **Tests:**
  - After the void, the student can pay again.
  - The course page shows "awaiting fee".
  - The coupon can be applied again.
  - An audit row is written.
- **Validation:** Std, plus e2e `admin-void-audit.spec.ts`.

#### 2.8 `fix(coupons): a both-fees waiver covers both fees`
- **Covers:** M10 (second part, D1)
- **Files:** `app/admin/coupons/actions.ts` (lines 259–284): approving a BOTH request creates two SPECIAL coupons, one for the enrollment fee and one for the course fee. The notification e-mail lists both.
- **Tests:** approve a BOTH request, then use one coupon for the enrollment fee → the course-fee coupon is still available.
- **Validation:** Std.

#### 2.9 `fix(payments): "void manual record" only voids manual records`
- **Covers:** M13
- **Files:** `app/admin/payments/actions.ts`, `voidManualPaymentRecord` (line 242): refuse records that have a submission or a `bookOrderId`, with a message pointing to the right flow.
- **Tests:** voiding a fee record through this path → refused, nothing changes. A manual record → voided.

#### 2.10 `fix(receipts): voided payments have no receipt`
- **Covers:** M8
- **Files:**
  - `app/api/receipt/[paymentRecordId]/route.ts` (lines 26–37): a voided record returns 404.
  - `app/actions/receipts.ts`: `generateReceipt` (lines 28–42) and `sendReceiptToEmailAction` (lines 147–157) refuse voided records.
- **Tests:** the route returns 404 for the owner of a voided record; both actions refuse; no invoice number is allocated.

#### 2.11 `fix(receipts): removing a receipt or certificate keeps its number and is audited`
- **Covers:** M9 (receipts and certificates)
- **Files:**
  - `app/actions/receipts.ts` (lines 102–136): `deleteReceipt` clears the stored PDF and `receiptGeneratedAt`, *keeps* `invoiceNumber`, clears `receiptShippingAmountPaise`, and calls `recordAudit`. `generateReceipt` reuses an existing number.
  - `app/actions/certificates.ts` (lines ~86–116): the same for `certificateNumber`.
- **Tests:** delete then regenerate → the same invoice number, and two audit rows. The same for certificates.

#### 2.12 `fix(enrollments): removing an enrollment is audited and refused once it has history`
- **Covers:** M9 (enrollments)
- **Files:** `app/admin/enrollments/actions.ts` (lines 216–226): refuse when the enrollment has a certificate, payment records, grades or attendance. Otherwise delete and call `recordAudit`.
- **Tests:** `tests/integration/delete-guards.test.ts`: refused with history; allowed and audited without.

#### 2.13 `fix(certificates): only completed enrollments can be certified`
- **Covers:** H8, and the certificate part of M23.
- **Files:**
  - `app/actions/certificates.ts` (lines 23–46): COMPLETION requires `COMPLETED`; APPRECIATION requires `ACTIVE` or `COMPLETED`.
  - `services/certificates-admin.ts` (lines 102–113): the candidate list is filtered by status and `user.deletedAt: null`, and paginated with search.
  - Pages and `app/api/v1/admin/certificates/eligible/route.ts`.
- **Tests:** rejected or pending enrollment → refused, and no number is consumed. The candidate list excludes them.

#### 2.14 `fix(payments): a paid fee needs a UTR or a screenshot` 📱
- **Covers:** M14
- **Files:**
  - `utils/validations.ts` (lines 185–191): `superRefine` so that when the amount is above 0, a UTR or a screenshot is required.
  - `services/payments.ts` (lines 184, 204): server-side check after the amount is computed.
  - Web pay forms show the error.
  - `docs/openapi.yaml`
- **Tests:** paid without proof → 400; free (100% waiver) without proof → accepted.

#### 2.15 `fix(bookstore): refunding a shipped order returns stock only if the books came back`
- **Covers:** M15
- **Files:**
  - `app/admin/bookstore/orders/actions.ts` (line 230): a new `booksReturned` form field.
  - `services/inventory.ts`: when the books were not returned, write a negative `BookStockMovement`.
  - The admin refund dialog component.
  - The API route body field, in `docs/openapi.yaml`.
- **Tests:** refund a shipped order without a return → available stock unchanged; with a return → restored.

#### 2.16 `fix(bookstore): repeated books in one order count against the per-book limit` 📱
- **Covers:** L15
- **Files:** `utils/validations.ts` (lines 530–538), `services/book-orders.ts` (line 129): merge duplicate `bookId` lines, then apply the 20-copy limit.
- **Tests:** `[{b,20},{b,20}]` → 400; `[{b,5},{b,5}]` → one line with 10.

#### 2.17 `fix(bookstore): refuse an order whose total changed since the quote` 📱
- **Covers:** L16
- **Files:** `services/book-orders.ts` (lines 160–170): optional `expectedTotalPaise`, with 409 on mismatch. The web checkout and the v1 orders route send it. `docs/openapi.yaml`.
- **Tests:** a price change between quote and submit → 409; no expected total → accepted (old app versions).

#### 2.18 `fix(payments): one UTR backs one payment, ignoring case` 📱
- **Covers:** L14
- **Files:** `services/payments.ts` (`assertUtrNotReused`), `services/book-orders.ts`: upper-case and trim on write; check both tables inside the submit transaction.
- **Tests:** the same UTR for a fee and then a book order → 409; `abc123` versus `ABC123` → 409.

#### 2.19 `fix(payments): bound manual payment amounts`
- **Covers:** L18 (amount part)
- **Files:** `utils/validations.ts:393`, `utils/form.ts:16`: minimum ₹1, maximum ₹10,00,000 (configurable in `config/constants/payments.ts`), rounded to whole paise.
- **Tests:** unit tests for 0.001, a negative amount, 1e12, and 499.995.

#### 2.20 `fix(courses): reopening a course keeps certified students completed`
- **Covers:** L18 (completion part)
- **Files:** `services/completion.ts` (lines 23–26): when a course goes from COMPLETED back to ONGOING, revert only enrollments without a certificate.
- **Tests:** an integration test where reopening keeps the certified enrollment COMPLETED.

#### 2.21 `fix(coupons): coupon dates follow the academy's calendar`
- **Covers:** M16
- **Files:**
  - `app/admin/coupons/actions.ts` (lines 35–43): `businessDayStart` and `businessDayEnd`.
  - `services/coupons.ts` (lines 31, 59): drop the 24-hour buffer.
  - `components/admin/EditCouponDialog.tsx` (lines 55–62): `formatBusinessDate`.
  - `utils/validations.ts` (lines 594–597): "today" in IST.
  - Remove the two `react-hooks/purity` entries this fixes from `eslint-suppressions.json`.
  - New `scripts/normalise-coupon-dates.ts` (dry run by default) re-expresses the existing UTC-day bounds as IST days.
- **Tests:** unit tests with fake timers: a Dec 1–31 coupon is invalid at 23:59 IST on Nov 30, valid at 00:00 IST on Dec 1, and invalid at 00:00 IST on Jan 1. Opening and saving the edit dialog does not move the date (component test or unit test on the formatter).

---

### Phase 3 — Documents and finance accuracy (5 commits)

#### 3.1 `fix(receipts): print document dates in the academy's time zone`
- **Covers:** M17
- **Files:** `services/payment-receipt.ts:143`, plus every `toLocaleDateString` in `utils/*-html.ts` (found with grep), all using `timeZone: BUSINESS_TIMEZONE`.
- **Tests:** a unit test where a receipt at 02:00 IST on 1 April is dated 1 April and numbered `/2026-27/`.

#### 3.2 `fix(scripts): the GST recompute refreshes stored PDFs and skips voided records`
- **Covers:** M18
- **Files:** `scripts/recompute-receipt-gst.ts` (lines 81–86): filter `voidedAt: null`; null `receiptPdfKey` and call `deleteStoredReceiptPdf` for each corrected row.
- **Tests / validation:** a dry run on a seeded database lists no voided rows; `--apply` on a disposable database leaves the corrected rows with `receiptPdfKey = null`.

#### 3.3 `feat(db): snapshot base fee and unit cost at purchase time`
- **Covers:** L17 (expand step)
- **Files:** `schema.prisma` plus a migration adding `CoursePaymentSubmission.baseFeePaise Int?` and `BookOrderItem.unitCostPaise Int?`. Writes start in `services/payments.ts` and `services/book-orders.ts`.
- **Tests:** a new submission or order stores the snapshot.
- **Validation:** Std, `db:drift`, `db:safety`.

#### 3.4 `fix(finance): historic reports use the price at the time of sale`
- **Covers:** L17
- **Depends on:** 3.3
- **Files:** `services/waiver-finance.ts` (lines 56–60, 133–141; also filter by `createdAt` instead of `updatedAt`), `services/payment-receipt.ts` (lines 111–123), `services/finance-bookstore.ts` (lines 91, 121). Each prefers the snapshot and falls back to the current value.
- **Tests:** change a course fee after a payment → the waiver report and receipt discount are unchanged.

#### 3.5 `perf(finance): compute totals in SQL and cap exports`
- **Covers:** M23 (finance part)
- **Files:**
  - `services/finance-bookstore.ts` (lines 61–84) and `services/waiver-finance.ts:117`: `aggregate` and `groupBy`.
  - `app/api/admin/finance/export/route.ts` (lines 44–107): require a date range, and cap at 50,000 rows with a clear error.
- **Tests:** the totals match the old JS computation on a seeded dataset (fixture comparison); an export without a range → 400.

---

### Phase 4 — Authentication hardening (16 commits)

#### 4.1 `feat(db): add a session version to users`
- **Covers:** H2 (expand step)
- **Files:** `schema.prisma` plus a migration adding `User.sessionVersion Int NOT NULL DEFAULT 0`.
- **Validation:** Std, `db:drift`, `db:safety`.

#### 4.2 `fix(auth): a password change or reset signs out every web session`
- **Covers:** H2 (web part)
- **Depends on:** 4.1, 0.2
- **Files:**
  - `services/auth.ts`, `jwt` callback (lines 117–180): put `sessionVersion` in the token at sign-in and compare it on refresh. A mismatch returns null.
  - Bump the version in `app/api/auth/reset-password/route.ts`, `app/api/v1/auth/change-password/route.ts`, and the take-over paths from 0.2.
- **Tests:** a unit test on the `jwt` callback (old version → null); an integration test where a reset bumps the version.

#### 4.3 `fix(auth): web sessions are looked up by user id`
- **Covers:** M4
- **Depends on:** 4.2 (same callback)
- **Files:** `services/auth.ts` (lines 147–153): `findUnique({ where: { id: token.id } })` and require `dbUser.email === token.email`.
- **Tests:** delete an account, re-register the address, present the old token → null.

#### 4.4 `feat(db): group refresh tokens into families`
- **Covers:** M1 (expand step)
- **Files:** `schema.prisma` plus a migration adding `ApiRefreshToken.familyId String?` and `@@index([familyId])`.
- **Validation:** Std, `db:drift`, `db:safety`.

#### 4.5 `fix(auth): a reused refresh token revokes its whole family` 📱
- **Covers:** M1
- **Depends on:** 4.4
- **Files:** `services/api-auth.ts` (lines 95–130). New sessions start a family; rotation carries the `familyId`. Presenting a revoked token revokes every live token in the family (legacy null-family rows fall back to all of the user's sessions).
- **Tests:** `tests/api/auth.test.ts`: rotate, then replay the old token → 401, and the new token is also dead. The existing concurrent-rotation race test still passes (the loser does not trigger the reuse path, because the grace check uses the same `updateMany`).

#### 4.6 `fix(auth): web Google sign-in requires a Google-verified e-mail`
- **Covers:** M2
- **Files:** `services/auth.ts`, `signIn` (lines 88–116): `if (account?.provider === "google" && profile?.email_verified !== true) return false`.
- **Tests:** a unit test on the callback with `email_verified: false` → false.

#### 4.7 `fix(auth): verification tokens match by hash only`
- **Covers:** M3
- **Files:** `services/tokens.ts` (lines 44–47): remove the raw-value branch.
- **Tests:** submitting the stored hash as the token → invalid.

#### 4.8 `fix(rate-limit): fall back to Postgres and fail closed for sign-in`
- **Covers:** M5
- **Files:** `services/rate-limit.ts`:
  - lines 116–126: an Upstash error falls back to Postgres; if both fail, rules with the `auth:` prefix deny and the others allow.
  - lines 53–60: prefer `x-vercel-forwarded-for`, then `x-real-ip`, then the first `x-forwarded-for` entry.
- **Tests:** `tests/security`: mock Upstash to throw → the Postgres counter is used; mock both to throw → login 429 and a public read allowed; the header precedence is covered by a unit test.

#### 4.9 `fix(auth): don't reveal which e-mails have accounts` 📱
- **Covers:** L3 (D3)
- **Files:**
  - `services/auth.ts:68` and `app/api/v1/auth/login/route.ts` (lines 40–45): compare against a dummy bcrypt hash when the user is unknown.
  - `app/api/auth/forgot-password/route.ts` (lines 47–65): send the e-mail inside `after()`.
  - Both register routes: a generic "check your e-mail" response, plus an "account already exists" e-mail to the owner.
  - `docs/openapi.yaml`
- **Tests:** register with an existing e-mail → the same status and body as a new one; the owner gets a notice e-mail (mocked sender).

#### 4.10 `fix(auth): consistent password length limits`
- **Covers:** L5
- **Files:** `utils/validations.ts:138` and the login credentials schema: maximum 72 **bytes** (a UTF-8 length refinement) on register, reset, change and login.
- **Tests:** unit tests at 72 bytes (accepted) and 73 bytes (rejected), with multi-byte characters.

#### 4.11 `fix(push): signing out removes the device's push token` 📱
- **Covers:** M6
- **Files:**
  - `app/api/v1/auth/logout/route.ts`: optional `deviceToken` in the body, deleted where `userId` and token match.
  - `app/api/v1/notifications/device-token/route.ts` (lines 33–39): a token registered by a different, authenticated user moves to that user.
  - Places that revoke all sessions (0.2, 4.2) delete all of the user's device tokens.
  - `docs/openapi.yaml`
- **Tests:** logout with a token → the row is gone; another user registers the same token → it is reassigned, not 409.

#### 4.12 `fix(storage): private files need a private bucket; unguessable document keys`
- **Covers:** M7
- **Files:**
  - `utils/s3.ts` (lines 11, 48): in production, throw at first use if `R2_PRIVATE_BUCKET_NAME` is missing or equals `R2_BUCKET_NAME`.
  - `services/documents.ts` (lines 20–28): append a random suffix to new receipt and certificate keys. Existing keys keep working, because they are read from the stored column.
  - `.env.example` wording.
- **Tests:** unit tests for the env check (production plus a missing variable → throws) and that a new key matches `/<id>-[a-z0-9]{16}\.pdf$/`.

#### 4.13 `feat(security): report CSP violations and upgrade insecure requests`
- **Covers:** L4
- **Files:**
  - New `app/api/csp-report/route.ts`: rate-limited, logs a summary, no storage.
  - `services/security-headers.ts`: `report-uri` and `report-to` plus a `Reporting-Endpoints` header.
  - `middleware.ts` (lines 73–85): pass `{ enforce: CSP_ENFORCE }` so `upgrade-insecure-requests` is applied.
- **Tests:** `tests/security/web-hardening.test.ts`: the report directive is present in both modes; `upgrade-insecure-requests` only in enforce mode; the report route accepts `application/csp-report` and returns 204.

#### 4.14 `fix(email): never log live sign-in links`
- **Covers:** L7
- **Files:** `services/email/core.ts` (lines 147–153): in production, log only the subject and recipient domain; outside production, redact the `token=` query value.
- **Tests:** a unit test where the console spy never sees the token.

#### 4.15 `fix(auth): stop keeping unused Google OAuth tokens; revoke on admin student delete`
- **Covers:** X6 (review Auth #18)
- **Files:**
  - `services/auth.ts`: an adapter wrapper `linkAccount` that drops `access_token`, `refresh_token` and `id_token` (the app never calls Google APIs on the user's behalf).
  - `app/admin/students/actions.ts` (lines 77–85): revoke API sessions and delete verification and reset tokens.
  - A data script `scripts/clear-oauth-tokens.ts` (dry run by default) nulls the existing values. This is an UPDATE; it is not a migration.
- **Tests:** Google linking stores an `Account` row with null tokens; admin delete leaves no live refresh token.

#### 4.16 `fix(rate-limit): count failed sign-ins only; separate buckets for change-password and unsubscribe`
- **Covers:** L1, L2
- **Depends on:** 4.8
- **Files:**
  - `services/rate-limit.ts:32`: new `LOGIN_FAILURE` keyed on e-mail plus IP, `CHANGE_PASSWORD` and `UNSUBSCRIBE_IP` rules.
  - `services/auth.ts:59` and `app/api/v1/auth/login/route.ts:22`: record only failures.
  - `app/api/v1/auth/change-password/route.ts:18` and `app/api/email/unsubscribe/route.ts:48`.
- **Tests:**
  - Five successful logins → not limited.
  - Failures from IP A do not lock IP B.
  - Ten unsubscribes do not block forgot-password.

---

### Phase 5 — Authorization, notifications, platform and CI (28 commits)

#### 5.1 `fix(teacher): teachers only see and mark approved enrollments`
- **Covers:** L11
- **Files:**
  - `services/enrollments.ts:295` (`isEnrollmentInCourse`, with a status option).
  - `services/api-course-tools.ts` (lines 325–329).
  - `services/grades.ts` (lines 83–97) and `services/attendance.ts` (lines 90–99): writes require ACTIVE; reads allow ACTIVE or COMPLETED.
- **Tests:** `tests/security/access-control.test.ts`: a teacher saving a grade for a pending enrollment → refused.

#### 5.2 `fix(files): only the current course teacher opens announcement attachments`
- **Covers:** L12
- **Files:** `app/api/files/[...key]/route.ts:42`: require the viewer to be the course's current teacher (the author check alone is not enough); normalise the e-mail in the teacher lookup (lines 22–24).
- **Tests:** in `tests/security/files-route.test.ts` (from 1.2), reassign the course to another teacher → the original author gets 404.

#### 5.3 `fix(fatwa): teachers can't edit an answer under review or published`
- **Covers:** L10
- **Files:** `app/teacher/(portal)/fatwa/actions.ts` (lines 32–46): refuse when `approvalStatus` is PENDING, or APPROVED with an answer, matching `canEdit` in `app/api/v1/teacher/fatwa/[id]/route.ts:18`.
- **Tests:** answering an approved fatwa through the action and through the API → 400; the answer is unchanged.

#### 5.4 `fix(blog): never show a commenter's e-mail`
- **Covers:** L9
- **Files:** `services/blog-engagement.ts` (lines 81, 87): fall back to "A reader".
- **Tests:** a commenter with no name → the notification body has no "@".

#### 5.5 `fix(documents): safe download filenames and consistent checks on every PDF route`
- **Covers:** L8, and review Architecture #10.
- **Files:**
  - New `utils/pdf-response.ts`: `pdfResponse(buffer, displayName, { inline })` using `contentDisposition()` from `utils/filename.ts`.
  - Use it in `app/api/v1/admin/students/[id]/id-card/route.ts` (lines 19–21), `app/api/receipt/...:48`, `app/api/certificate/...:58`, and the other v1 PDF routes.
  - `app/api/id-card/route.ts`: add the profile-complete check and a try/catch.
- **Tests:** unit tests for an Urdu name and a name with `"`; an API test where the ID card for an Arabic-named student returns 200 with an RFC 5987 `filename*`.

#### 5.6 `ci(auth): the page-auth check requires a guard call, not a mention`
- **Covers:** L13
- **Files:** `scripts/check-page-auth.sh`: strip comments and import lines, then require a call (`requireAdmin(`, and so on) in the default-exported component or `generateMetadata`.
- **Tests / validation:** a fixture directory under `scripts/__fixtures__` with a page that only mentions the guard in a comment → the script fails; the real tree passes.

#### 5.7 `fix(notifications): course announcements reach only enrolled students`
- **Covers:** M19
- **Files:** `services/notifications.ts` (lines 259–268): `status in [active, completed]` and `user: { deletedAt: null }`.
- **Tests:** `tests/integration/notifications.test.ts`: rejected, awaiting-fee and deleted users get no notification.

#### 5.8 `perf(notifications): load announcement recipients in one query`
- **Covers:** M20 (query part)
- **Files:** `services/notifications.ts` (lines 82–88, 404–430, 493–510): a single `findMany` selecting e-mail, name and opt-out; remove the per-user `getUserEmailData` calls.
- **Tests:** an integration test with 50 recipients asserts a bounded query count (Prisma `$on('query')` counter) and the same set of e-mails as before.

#### 5.9 `feat(notifications): send bulk e-mail from a queue`
- **Covers:** M20 (queue part)
- **Depends on:** 5.8
- **Files:**
  - Migration plus `EmailOutbox` model: id, to, subject, html, attempts, `sentAt`, `lastError`.
  - `services/notifications.ts` enqueues instead of sending in `after()`.
  - New `app/api/cron/email-outbox/route.ts`, protected by `CRON_SECRET`; sends batches of 50 with retries.
  - `vercel.json` cron entry; `.env.example` lists `CRON_SECRET`.
- **Tests:** enqueue 120, run the cron handler twice → 100 sent, 20 left; a failed send increments `attempts`; a wrong secret → 401.
- **Validation:** Std, `db:drift`, `db:safety`.

#### 5.10 `perf(pdf): one Chromium render at a time per instance`
- **Covers:** M21 (concurrency part)
- **Files:** `services/pdf-generator.ts:89`: a module-level async semaphore (size 1, configurable), with a queue timeout that returns a clear "busy" error.
- **Tests:** a unit test with the launcher mocked: three concurrent renders → at most one launch active at a time.

#### 5.11 `build(deps): full Puppeteer only for local development`
- **Covers:** M21 (dependency part)
- **Files:**
  - `package.json`: move `puppeteer` to devDependencies.
  - `services/pdf-generator.ts:1`: `await import("puppeteer")` only in the non-Vercel branch.
  - `next.config.ts`: add `puppeteer` to `serverExternalPackages`.
- **Validation:** Std, `npx next build`; `npm ci --omit=dev` succeeds and the Vercel branch still resolves `puppeteer-core`.

#### 5.12 `fix(rate-limit): prune old buckets and expired tokens; hash identifiers`
- **Covers:** M22, X3
- **Files:**
  - `services/rate-limit.ts` (lines 84–103): store `sha256(key)`, and delete windows older than one day on about 1% of hits.
  - New `app/api/cron/housekeeping/route.ts`, guarded by `CRON_SECRET` from 5.9 (so it depends on 5.9): it also deletes expired `VerificationToken` and `PasswordResetToken` rows.
  - `vercel.json` cron entry.
- **Tests:** a unit test that the key is hashed; an integration test where old rows and expired tokens are deleted by the handler.

#### 5.13 `perf(admin): bounded student pickers and waiver request lists`
- **Covers:** M23 (lists part)
- **Files:**
  - `services/students.ts` (lines 70–76): `getStudentUsers` → `searchStudentOptions(query, take 20)` with `select { id, name, email }`. The finance and coupon pages use a search combobox.
  - `/api/v1/admin/finance/options?students=all` returns the top 50 plus a `q` parameter.
  - `services/coupons-admin.ts:42` and `app/admin/coupons/page.tsx:62` use the paginated variant.
  - `docs/openapi.yaml`
- **Tests:** API tests for the `q` search and the page size; the finance page renders.

#### 5.14 `ci(db): catch more destructive SQL in migrations`
- **Covers:** M24
- **Depends on:** must be merged **after** 6.11 (which uses `DROP CONSTRAINT` legitimately) or include an explicit allow-list comment marker.
- **Files:** `scripts/check-migration-safety.sh` (lines 22, 27):
  - Strip `--` and `/* */` comments before matching.
  - Flag `UPDATE`/`DELETE` without `WHERE` or with `WHERE true`, unquoted `ALTER COLUMN … TYPE`, `RENAME`, `SET NOT NULL`, and `DROP CONSTRAINT|TYPE|SCHEMA|INDEX` (unless `CONCURRENTLY`-free and the index is recreated).
  - Allow a per-statement `-- safety: allow <reason>` marker.
- **Tests / validation:** fixture `.sql` files under `scripts/__fixtures__/migrations`, one per pattern, each expected to fail; all existing migrations still pass.

#### 5.15 `ci: build the app on every pull request`
- **Covers:** M25 (build part)
- **Files:** `.github/workflows/ci.yml`: a `npx next build` step in `verify`.
- **Validation:** the workflow passes on the PR.

#### 5.16 `ci: run the end-to-end journeys on pull requests into master`
- **Covers:** M25 (e2e part)
- **Files:** `.github/workflows/ci.yml:109`: the `if:` also allows `pull_request` with base `master`.
- **Validation:** the workflow passes on the PR.

#### 5.17 `test: measure coverage and set thresholds for services`
- **Covers:** M25 (coverage part)
- **Files:**
  - `package.json`: `@vitest/coverage-v8` in devDependencies.
  - `vitest.config.mts`: a coverage block with thresholds set at the measured baseline (ratchet, never lower) for `services/**`.
  - `ci.yml` uploads the report.
- **Validation:** `npm test -- --coverage` passes locally and in CI.

#### 5.18 `build(deps): upgrade Nodemailer and patched transitive packages`
- **Covers:** M26 (nodemailer and transitive)
- **Files:** `package.json` and `package-lock.json`: nodemailer to the first release above 10.1.3 that is compatible with the `next-auth` peer range (or an `overrides` entry if `@auth/core` pins it); `npm audit fix` for brace-expansion, js-yaml, smol-toml, browserslist, glob/minimatch/rimraf and gaxios.
- **Tests:** the e-mail unit tests, plus a manual send through a local SMTP sink (for example Mailpit).
- **Validation:** Std; `npm audit --omit=dev` shows no high-severity nodemailer advisory.

#### 5.19 `build(deps): write spreadsheets with ExcelJS instead of the unmaintained xlsx`
- **Covers:** M26 (xlsx)
- **Files:** `app/api/admin/finance/export/route.ts` (lines 11, 102–107); `package.json`.
- **Tests:** an API test that the export returns a valid workbook (zip magic bytes) and the header row matches.

#### 5.20 `ci: fail the build on high-severity production advisories`
- **Covers:** M25 (audit part)
- **Depends on:** 5.18, 5.19
- **Files:** `.github/workflows/ci.yml:91`: `npm audit --omit=dev --audit-level=high` without `continue-on-error`, plus a small allow-list script for advisories with no fix that have been reviewed.
- **Validation:** the CI step passes.

#### 5.21 `fix(seo): the sitemap lists every public course`
- **Covers:** L21, X5
- **Files:** `app/sitemap.ts`: use `isCoursePubliclyVisible` (every status except DRAFT); on a database error, throw instead of caching a static-only sitemap.
- **Tests:** a unit or integration test where ONGOING, COMPLETED and COMING_SOON courses appear and DRAFT does not.

#### 5.22 `fix(cache): unpublishing takes effect at once; deleted users leave the homepage`
- **Covers:** L19
- **Files:**
  - `services/public-cache.ts:58`: `updateTag` in server actions (`revalidateTag(tag, { expire: 0 })` in route handlers).
  - `services/student-reviews.ts` (lines 88–96): filter `user.deletedAt: null`.
  - `services/account-deletion.ts` and admin student delete call `revalidatePublicContent`.
- **Tests:** the featured-reviews query excludes deleted users; the action calls `updateTag` (mocked `next/cache`).

#### 5.23 `fix(uploads): presigned direct-to-R2 upload service`
- **Covers:** H12 (part 1, D5)
- **Files:**
  - New `services/direct-upload.ts`: `createUploadUrl(kind, ownerId)` returns a presigned PUT URL with a content-length range, plus a server-generated key. `finalizeUpload(key)` reads the first bytes with a ranged GET, checks magic bytes and size against the kind's rules, and deletes on failure.
  - New `app/api/uploads/route.ts`: authorized per kind.
- **Tests:**
  - Unit tests with a mocked S3 client: the wrong type is deleted and rejected; an oversize file is rejected.
  - An API test checking the authorization per kind.

#### 5.24 `fix(uploads): announcements, library and blog upload straight to R2`
- **Covers:** H12 (part 2)
- **Depends on:** 5.23 and the R2 CORS step (§3).
- **Files:**
  - Client upload components (announcements, library, blog editor, bookstore cover): upload directly, then submit the keys.
  - Server actions accept keys and call `finalizeUpload` instead of reading `File`s.
- **Fallback:** if the presigned PUT fails (for example because the R2 CORS rule is not yet in place) and the file is under 4 MB, the client falls back to the existing form upload, so deploying this before the CORS rule degrades gracefully. `scripts/configure-r2-cors.ts` (dry run by default) prints or applies the required rule.
- **Tests:** the existing integration tests for these actions, adapted to keys; e2e upload of a 6 MB PDF in a teacher announcement.

#### 5.25 `fix(uploads): keep request bodies small`
- **Covers:** H12 (part 3), and review Content #8.
- **Depends on:** 5.24
- **Files:**
  - `next.config.ts:22`: `bodySizeLimit` back to `2mb`.
  - `app/api/v1/auth/me/photo/route.ts:35`: reject when `Content-Length` exceeds the limit before `formData()`.
- **Tests:** an API test where an oversize `Content-Length` → 413 without reading the body.

#### 5.26 `feat(db): book order history can't be deleted with a book`
- **Covers:** L20
- **Files:** `schema.prisma:777` plus a migration that swaps the `BookOrderItem.book` FK to `ON DELETE RESTRICT`, using the same dynamic guarded swap pattern as migration `20261103000700`. The same applies to `CouponRequest.course`/`.user`, and to attendance and grade records via Enrollment (those become RESTRICT, which 2.12 already enforces in the app).
- **Tests:** deleting a book that has order items → P2003. `delete-guards.test.ts` still passes.
- **Validation:** Std, `db:drift`, `db:safety` (merge before 5.14, or mark with `-- safety: allow`).

#### 5.27 `docs(db): NOT VALID constraints validated in a later migration`
- **Covers:** X1 (review Data #16)
- **Files:** `docs/OPERATIONS.md` rule 4: explain that Prisma wraps each migration in a transaction, so `NOT VALID` plus `VALIDATE` must be in separate migrations to reduce locking. No change to past migrations.
- **Validation:** none.

#### 5.28 `chore(env): list the end-to-end variables and scan the Playwright config`
- **Covers:** X2
- **Files:** `scripts/check-env-example.sh` (also scans `playwright.config.ts`); `.env.example` adds `E2E_PORT`, `E2E_BASE_URL` and `DIRECT_URL_TEST`, commented out.
- **Validation:** the script passes.

---

### Phase 6 — Architecture: move rules into services (11 commits)

Each commit is a pure move and keeps behaviour. The tests from Phases 0–2 and 1.1 are the safety net; no test expectation changes.

#### 6.1 `refactor(payments): fee approval, decline and void live in a service`
- **Covers:** M27
- **Files:** new `services/payment-approval.ts` (typed results: `{ ok } | { error, status }`); `app/admin/payments/actions.ts` becomes a thin adapter (session → service → redirect/flash).

#### 6.2 `refactor(coupons): the coupon and waiver lifecycle lives in a service`
- **Covers:** M27
- **Files:** new `services/coupon-admin-actions.ts`; `app/admin/coupons/actions.ts` becomes a thin adapter.

#### 6.3 `refactor(bookstore): the order state machine lives in a service`
- **Covers:** M27
- **Files:** new `services/book-order-transitions.ts`; `app/admin/bookstore/orders/actions.ts` (lines 53–303) becomes a thin adapter.

#### 6.4 `refactor(api): staff API calls services, not website actions`
- **Covers:** M27, M29 (most uses)
- **Depends on:** 6.1–6.3
- **Files:** `services/api-course-tools.ts` (lines 4–20); `/api/v1/admin/**` routes for payments, coupons and orders call the services directly. Shrink `services/api-staff.ts`'s redirect-translation to the remaining actions.
- **Tests:** the 1.1 suite passes unchanged.

#### 6.5 `refactor: rethrow Next.js control-flow errors with unstable_rethrow`
- **Covers:** M29
- **Files:** the 16 files that import `next/dist/client/components/*` (for example `utils/action-utils.ts:1`, `components/shared/ActionButton.tsx:5`, `services/api-staff.ts` lines 3–8). Replace them with `unstable_rethrow` from `next/navigation`, or with `utils/next-control-flow.ts` as the single adapter where the error *kind* must be inspected.
- **Validation:** Std; `grep -r "next/dist" app services utils components` returns nothing outside the adapter.

#### 6.6 `build(deps): upgrade Prisma to 7`
- **Covers:** M26 (prisma, D6)
- **Files:** `package.json`, `prisma/schema.prisma` generator and config changes, `utils/prisma.ts`, the seed and test helpers.
- **Validation:** Std, `db:drift`, the full e2e suite, and a rehearsal of `migrate deploy` against a production snapshot branch (`docs/OPERATIONS.md`).

#### 6.7 `refactor(enrollments): one requestEnrollment service for web and API`
- **Covers:** M28 (enrollment start)
- **Files:** `services/enrollments.ts` gains `requestEnrollment(userId, courseId)` with a discriminated result; `app/actions/checkout.ts` (lines 14–108) and `app/api/v1/enrollments/route.ts` (lines 44–123) become adapters. The check order and outcomes are unified; any API response change is documented in openapi.
- **Tests:** a table-driven integration test over (course status × existing row × profile complete) → the same outcome through both entry points.

#### 6.8 `refactor(auth): shared credential check and registration`
- **Covers:** M28 (login and registration)
- **Files:**
  - New `services/credentials.ts` with `authenticateCredentials` and `registerUser`.
  - Used by `services/auth.ts` (lines 51–75), `app/api/v1/auth/login/route.ts`, and both register routes.
  - Fixes the web register returning 500 after creating the user when the e-mail fails.
- **Tests:** a register test with a failing e-mail sender → 201 and a "resend verification" hint, on both routes.

#### 6.9 `refactor(teachers): one course-access check`
- **Covers:** M28 (teacher-course check)
- **Files:** `services/course-authorization.ts` exports `assertCourseAccess(actor, courseId, { write })`. It replaces the copies in `services/course-announcement-actions.ts` (lines 33–48), `services/api-course-tools.ts:80` and `app/api/files/[...key]/route.ts` (lines 22–24).
- **Tests:** `access-control.test.ts` plus the 1.2 and 5.2 suites pass.

#### 6.10 `refactor: keep Prisma out of client bundles`
- **Covers:** M30 (bundle part)
- **Files:**
  - `utils/prisma.ts`: `import "server-only"`.
  - Move the pure helpers and constants imported by `"use client"` files into `utils/` or `config/` (for example `calculateDiscountedAmount` and the labels from `services/coupons`, `services/bookstore`, `services/courses`, `services/profile`).
  - Update `components/payment/EnrollmentPaymentForm.tsx:10`, `components/bookstore/BookStatusBadge.tsx:3`, `components/admin/CourseForm.tsx:13` and `components/profile/ProfileForm.tsx:18`.
- **Validation:** Std plus `npx next build`. A unit test for `server-only` can't import the client; the build is the proof.

#### 6.11 `chore(lint): enforce the layering`
- **Covers:** M27 (enforcement)
- **Depends on:** 6.1–6.4, 6.10
- **Files:** `eslint.config.mjs` adds `no-restricted-imports`:
  - `services/**` may not import `@/app/*`.
  - `app/**/page.tsx` and `components/**` may not import `@/utils/prisma`.
  - The remaining page-level Prisma imports (about 40 files) go into `eslint-suppressions.json` as a tracked baseline to burn down.
  - `docs/ARCHITECTURE.md` describes the baseline.
- **Validation:** Std.

---

### Phase 7 — Quality and cleanup (14 commits)

#### 7.1 `feat(ui): branded error and not-found pages`
- **Covers:** M30 (error-pages part)
- **Files:** `app/global-error.tsx`, `app/not-found.tsx`, `app/error.tsx`, and `error.tsx` in `app/admin`, `app/teacher` and `app/profile`.
- **Tests:** e2e: `/does-not-exist` shows the branded 404; a forced render error in a test-only route shows the error page (guarded by `NODE_ENV=test`).

#### 7.2 `fix(api): a malformed JSON body is a 400`
- **Covers:** L23 (JSON part)
- **Files:** replace `request.json()` with the existing `readJson` in the 12 routes (`app/api/v1/auth/login/route.ts:10`, `enrollments`, `fatwa`, `auth/google`, `auth/register`, `notifications`, `notifications/device-token` lines 11 and 71, `reviews`, and the 3 under `app/api/auth/*`).
- **Tests:** a parameterised API test posting `{bad` to each route → 400.

#### 7.3 `refactor(api): one error envelope for every route`
- **Covers:** L23 (envelope part)
- **Files:** the 29 v1 routes that build `{ success: false }` by hand, and `/api/auth/*`, use `apiError` and `apiServerError`. The web `/api/auth/*` keeps `error` and adds `success` (additive, so the web client is unaffected).
- **Tests:** the existing API tests; add a test that the envelope always has `success`.

#### 7.4 `fix: log instead of swallowing database errors`
- **Covers:** L24 (swallowed errors)
- **Files:** `app/admin/fatwa/actions.ts` (lines 62, 147) and `services/teacher-auth.ts:57`: `.catch(err => { console.error(...); return null; })`.
- **Tests:** a unit test where the logger spy is called on a rejected lookup.

#### 7.5 `refactor(admin): one student lookup hook that ignores stale responses`
- **Covers:** L24 (duplicated `runLookup`)
- **Files:** new `components/admin/useStudentLookup.ts`, used by `components/admin/AdminEnrollUserForm.tsx` (lines 26–51) and `components/admin/RecordPaymentForm.tsx` (lines 27–52); responses carry a request id.
- **Tests:** a hook unit test where an out-of-order resolution keeps the latest result.

#### 7.6 `refactor(uploads): one table of upload kinds; separate public and private announcement prefixes`
- **Covers:** L24 (upload wrappers and shared prefix)
- **Files:**
  - New `services/upload-kinds.ts` replacing the seven `services/*-upload.ts` wrappers.
  - Site announcements use `uploads/site-announcements/`.
  - The `/api/files` key regex and `r2KeyFromUrl` accept both old and new prefixes.
- **Tests:** the existing upload tests; an old-prefix key is still served and deletable.

#### 7.7 `refactor(status): filter on the typed status columns`
- **Covers:** L24 (half-finished enum migration, read side)
- **Files:** the 24 users of `services/status-compat.ts` filter on the `*Enum` columns; the backfill-completeness check is a script `scripts/check-status-backfill.ts` (counts rows where the enum is null).
- **Tests:** `status-compat.test.ts` plus the integration suites.

#### 7.8 `feat(db): keep text and typed status columns in agreement`
- **Covers:** L24 (enum migration, write side)
- **Depends on:** 7.7 and the backfill check reporting 0.
- **Files:** a migration adding `CHECK` constraints (`NOT VALID`; `VALIDATE` in a separate follow-up migration per 5.27) linking each text status to its enum twin.
- **Validation:** Std, `db:drift`, `db:safety`.

#### 7.9 `refactor: rename middleware to proxy (Next 16)`
- **Covers:** L24 (deprecated name)
- **Files:** `git mv middleware.ts proxy.ts`; update `tests/api/middleware.test.ts` imports and the docs references.
- **Validation:** Std, `npx next build`, and the middleware tests.

#### 7.10 `fix(config): no placeholder image host`
- **Covers:** L24 (placeholder `cdn.your-academy.com`)
- **Files:** `next.config.ts`: when `R2_PUBLIC_URL` is unset, `remotePatterns` is empty (and the build warns).
- **Validation:** `npx next build` with and without the variable.

#### 7.11 `build: ship PDF assets only with the routes that render PDFs`
- **Covers:** X4
- **Files:** `next.config.ts`: `outputFileTracingIncludes` keyed to the PDF route globs (`/api/receipt/**`, `/api/certificate/**`, the card routes, `/api/v1/**/receipt`, …) instead of `/**/*`.
- **Validation:** `npx next build`; inspect `.next/server/**/*.nft.json` for a non-PDF route (no fonts); the PDF smoke test from 1.3.

#### 7.12 `fix(site): register the service worker; remove the unused analytics component`
- **Covers:** L22 (unmounted components, D4)
- **Files:**
  - `app/layout.tsx` mounts `PwaRegister`.
  - Delete `components/site/GoogleAnalytics.tsx` and remove `NEXT_PUBLIC_GA_MEASUREMENT_ID` from `.env.example`. If D4 is "mount", add a consent gate plus CSP entries instead.
- **Tests:** e2e where `navigator.serviceWorker.getRegistration()` resolves on `/`.

#### 7.13 `chore: remove dead exports and an orphaned loading page; run knip in CI`
- **Covers:** L22 (unused exports and `loading.tsx`)
- **Depends on:** after Phase 6 (the refactors change what is unused).
- **Files:** the exports knip reports (`recordCouponUsage`, `isPrivateFilePath`, `getUserEnrollments`, `getEnrollmentsForCoursePaginated`, `safeHtml`, the nine `*_UI` constants in `config/constants/business.ts` lines 31–105, and the rest); delete `app/(public)/courses/loading.tsx`; `ci.yml` runs `npm run knip`. (`revokeAllApiSessions` gained callers in 0.2.)
- **Validation:** Std, `npm run knip`.

#### 7.14 `perf(auth): persist refreshed role claims instead of re-reading every request`
- **Covers:** X7 (review Auth #17)
- **Files:** `services/auth.ts` (lines 144–178): cache the refreshed claims per request (React `cache()`), so one request resolves the role once. Document that the middleware's stale role is advisory (the page guards re-check).
- **Tests:** a unit test where three `auth()` calls in one request → one database read.

---

## 5. Traceability matrix

| ID | Commit(s) | ID | Commit(s) | ID | Commit(s) |
|---|---|---|---|---|---|
| C1 | 0.1 | M8 | 2.10 | M27 | 6.1–6.4, 6.11 |
| H1 | 0.5 | M9 | 2.11, 2.12 | M28 | 6.7, 6.8, 6.9 |
| H2 | 0.2, 4.1, 4.2 | M10 | 2.6, 2.8 | M29 | 6.4, 6.5 |
| H3 | 0.2 | M11 | 2.2–2.4 | M30 | 6.10, 7.1 |
| H4 | 0.4 | M12 | 0.9 | L1, L2 | 4.16 |
| H5 | 0.6 | M13 | 2.9 | L3 | 4.9 |
| H6 | 2.5 | M14 | 2.14 | L4 | 4.13 |
| H7 | 2.2–2.4 | M15 | 2.15 | L5 | 4.10 |
| H8 | 2.13 | M16 | 2.21 | L6 | 0.3 |
| H9 | 2.7 | M17 | 3.1 | L7 | 4.14 |
| H10 | 0.7 | M18 | 3.2 | L8 | 5.5 |
| H11 | 0.8 | M19 | 5.7 | L9 | 5.4 |
| H12 | 5.23–5.25 | M20 | 5.8, 5.9 | L10 | 5.3 |
| H13 | 1.1, 1.2, 1.3 | M21 | 5.10, 5.11 | L11 | 5.1 |
| M1 | 4.4, 4.5 | M22 | 5.12 | L12 | 5.2 |
| M2 | 4.6 | M23 | 2.13, 3.5, 5.13 | L13 | 5.6 |
| M3 | 4.7 | M24 | 5.14 | L14 | 2.18 |
| M4 | 4.3 | M25 | 5.15, 5.16, 5.17, 5.20 | L15 | 2.16 |
| M5 | 4.8 | M26 | 5.18, 5.19, 6.6 | L16 | 0.3 (reset) · 2.17 (order total) |
| M6 | 4.11 | | | L17 | 3.3, 3.4 |
| M7 | 4.12 | | | L18 | 2.19, 2.20 |
| L19 | 5.22 | L20 | 5.26 | L21 | 5.21 |
| L22 | 7.12, 7.13 | L23 | 7.2, 7.3 | L24 | 2.1, 7.4–7.10 |
| X1 | 5.27 | X2 | 5.28 | X3 | 5.12 |
| X4 | 7.11 | X5 | 5.21 | X6 | 4.15 |
| X7 | 7.14 | | | | |

> **Numbering note.** The review report labels two different issues "L16": "a password reset does not mark the e-mail verified" (auth list), and "no expected-total check on book orders" (in the report's Low table). Both are covered: 0.3 and 2.17.

## 6. Dependency graph (hard dependencies only)

```
0.2 ─► 0.3
0.2 ─► 4.2 ◄─ 4.1 ;  4.2 ─► 4.3
0.5 ─► 2.1
0.5 ─► 2.6 ◄─ 2.5 ;  2.6 ─► 2.7
2.2 ─► 2.3 ─► 2.4   (prod backfill afterwards)
3.3 ─► 3.4
4.4 ─► 4.5
4.8 ─► 4.16
5.8 ─► 5.9 ─► 5.12
5.23 ─► 5.24 ─► 5.25   (R2 CORS rule, with fallback until then)
5.18, 5.19 ─► 5.20
5.26 ─► 5.14   (or allow-list marker)
6.1, 6.2, 6.3 ─► 6.4
6.1–6.4, 6.10 ─► 6.11
7.7 ─► [backfill check = 0] ─► 7.8
Phase 6 ─► 7.13
1.1 ─► 6.x  (safety net before refactors)
1.2 ─► 5.2, 6.9
```

## 7. Merge checkpoints (`dev` → `master`)

| After | Why it is a good release point |
|---|---|
| Phase 0 | Closes the critical and high-impact security and data-safety holes; no schema changes. |
| 2.3 | Ships the period key column and writes; then run the backfill (§3). |
| End of Phase 2 + 3 | Money integrity complete (2.4 included only once the backfill is clean). |
| End of Phase 4 | Auth hardening; coordinate with the mobile release (📱 items 4.5, 4.9, 4.11). |
| 5.22 | Platform and CI; before uploads (5.23–5.25), which need the R2 CORS rule. |
| End of Phase 5 | — |
| End of Phase 6 | Refactors; behaviour-neutral, verified by the full suite and e2e. |
| End of Phase 7 | — |

Each checkpoint: CI is green on `dev` (including e2e), a manual smoke test on the Vercel preview (sign-in, enroll and pay, admin approve, receipt download, teacher grade), then a PR `dev` → `master`.
