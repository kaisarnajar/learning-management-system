# Code review and implementation plan (2026-11-25)

An independent review of the whole application at `f74daf9a` (`dev`). Earlier review documents under `docs/history/`
were deliberately not consulted. Every finding below was traced end to end through the code; areas that were checked
and found sound are listed at the end so the next review does not repeat them.

## Baseline

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx eslint .` | 0 errors, 5 warnings (L-10) |
| `npm test` with `DATABASE_URL_TEST` (unit, integration, api, security) | 93 files, 2202 passed, 2 skipped |
| `npm audit --omit=dev` | 0 vulnerabilities in 637 production dependencies |

## Overall health

The architecture is consistent and well enforced: routes and actions authorize and validate, `services/` hold the
rules, ESLint keeps Prisma out of pages and components, and money flows are guarded by status-checked `updateMany`
claims, row locks and partial unique indexes. No Critical issue was found. The issues are concentrated in
less-travelled paths: an account-squatting gap in e-mail verification, a few multi-write operations that are not
atomic or not guarded against the row's current state, personal data that survives account deletion, and two
mobile-API paths that diverged from their web counterparts.

## Findings

Severity: **High** = security or data-integrity issue reachable by a normal user; **Medium** = wrong result or lost
work in a realistic flow; **Low** = edge case, cosmetic, maintainability.

### High

| ID | Where | Issue | Fix |
|---|---|---|---|
| H-1 | `app/verify-email/actions.ts:14-46`, `app/verify-email/page.tsx` | **Pre-registration account takeover.** Anyone can register a victim's address (including an `ADMIN_EMAIL` address or a teacher's address with no `User` row yet) with a password they choose. When the owner clicks the verification link, `confirmEmailVerification` marks the address verified but keeps the attacker's password, so the attacker signs in, and `resolveUserRole` grants TEACHER/ADMIN from the address alone. | Verification of a password account requires that account's password (checked with `verifyPassword`, rate-limited). An owner who did not set the password uses "Forgot password", which already proves the mailbox, sets their own password and verifies the address. |

### Medium

| ID | Where | Issue | Fix |
|---|---|---|---|
| M-1 | `app/api/v1/auth/me/route.ts:112-124`, `services/account-deletion.ts:45-48` | `DELETE /api/v1/auth/me` checks the password with no rate limit: a stolen access token allows unlimited password guessing. | Apply `RATE_LIMITS.CHANGE_PASSWORD` keyed by user id before the check. |
| M-2 | `services/account-deletion.ts:74-117` | Account deletion keeps the student's name and e-mail on their fatwa questions (shown publicly as "Asked by …") and their contact inquiries. | Anonymise `FatwaQuestion.askerName/askerEmail` and `ContactInquiry.name/email/phone` in the same transaction. |
| M-3 | `app/api/v1/fatwa/route.ts:53-58` | Questions from the mobile app are stored `approvalStatus: "PENDING"`, which `isFatwaAnswerLocked` treats as "answer awaiting review": nobody can answer them. The route also ignores the signed-in user. | One `createFatwaQuestion` service used by the web action and the API; no PENDING status; the API attaches a signed-in student like the web form. |
| M-4 | `app/admin/courses/actions.ts:143-152` | Course status change and enrolment sync are separate writes. If the sync fails the course is COMPLETED with ACTIVE enrolments, and re-saving does not repair it (`statusChanged` is now false). | Run both in one transaction. |
| M-5 | `app/admin/enrollments/actions.ts:190-199` (also `/api/v1/admin/enrollments`) | Admin "enrol user" upserts the roster status over any existing row, turning a COMPLETED (even certified) enrolment back into ACTIVE. | Only create, or update a row that is REJECTED / PENDING_APPROVAL / AWAITING_ENROLLMENT_FEE, with a status-guarded update; otherwise answer "already enrolled". |
| M-6 | `services/grades.ts:142-145` | A grade card's `maxMarks` can be lowered below marks already stored (e.g. completed students are not in the form), giving > 100 % and "A+" on grade cards. | After saving, refuse if any stored mark exceeds `maxMarks` (transaction rolls back). |
| M-7 | `services/book-orders.ts:191-241`, `services/utr.ts:23-30` | If the screenshot upload fails after the order transaction, the order is soft-deleted but keeps its UTR, and the cart has already been cleared. Retrying with the same genuine UTR is refused as "already used". | Store the screenshot before the transaction (as fee payments do) and delete it if the transaction fails. |
| M-8 | `services/roll-numbers.ts:31-36`, `services/enrollments.ts:78`, `app/admin/enrollments/actions.ts:227-249` | Roll numbers are `MAX+1`, so removing the highest enrolment, or a re-application that clears it, re-issues a number that was already given out. | Allocate from a per-course monotonic counter (`DocumentSequence`, kind `roll`), seeded from the current maximum. |
| M-9 | `app/admin/courses/actions.ts:181-225` | Deleting a course does not count `PaymentRecord`s; the FK is `SetNull`, so manual income records silently lose their course. | Block the delete while payment records reference the course. |
| M-10 | `app/admin/teachers/actions.ts:128-145`, `app/admin/finance/actions.ts:31` | Deleting a teacher silently unlinks their salary expenses (`SetNull`); deleting an expense writes no audit row. | Block teacher delete while expenses reference them; audit the expense delete in a transaction. |
| M-11 | `services/audit.ts:88-95` | `getAuditEntities` uses `distinct`, which Prisma 7 performs in memory: every audit-log page view reads the whole append-only table. | `groupBy({ by: ["entity"] })`. |
| M-12 | `components/attendance/AttendanceForm.tsx:139`, `components/grades/GradeForm.tsx:167`, `AttendanceView.tsx`, `StudentAttendanceReport.tsx`, `StudentGradeReport.tsx`, `app/profile/courses/[courseId]/attendance/page.tsx` | Tables are wrapped in `overflow-hidden`; on a phone the status/marks column is cut off and unreachable. | `overflow-x-auto`. |

### Low

| ID | Where | Issue | Fix |
|---|---|---|---|
| L-1 | `utils/grade-card-html.ts:233-242`, `services/api-course-tools.ts:440-444` | Overall letter grade is taken from a rounded percentage (89.5 % → A+, 39.5 % → pass), and float sums print as `27.299999999999997`. | Grade from the unrounded ratio; round totals to 2 decimals. |
| L-2 | `services/teacher-portal.ts:45-49` | Paginated teacher course list counts pending and rejected applicants as students. | Count approved statuses only, as the other teacher queries do. |
| L-3 | `services/account-deletion.ts:84-87`, `app/actions/certificates.ts` | A deleted student with an ACTIVE enrolment can still be issued a numbered certificate by a direct call. | `generateCertificate` refuses a deleted user. |
| L-4 | `services/profile-update.ts:34` | Registration-number year uses the server's (UTC) year, not the academy's timezone. | Year in `BUSINESS_TIMEZONE`. |
| L-5 | `services/payments.ts:166-177` | Monthly payments are accepted for a course whose monthly fee is 0, creating unlimited 0-paise "waiver" records. | Refuse when the fee is 0, as the enrolment-fee path does. |
| L-6 | `app/blog/[id]/BlogEngagement.tsx:85-150` | Failed like rolls back to the wrong count; a rejected comment submit leaves the button disabled; a failed delete does not restore the total. | Restore previous values; `try/finally`. |
| L-7 | Client tables listed in the review (`PaymentApprovalsTable`, `BookOrdersTable`, …) | Dates formatted in the browser's timezone differ from the server's render → hydration mismatch around midnight IST. | Format in `BUSINESS_TIMEZONE`. |
| L-8 | `services/pdf-generator.ts:83` | PDF queue waits up to 45 s inside a 60 s function, leaving 15 s for a cold Chromium launch and render. | Queue timeout 20 s. |
| L-9 | `config/constants/file.ts` | Unused upload constants that contradict the real rules (no GIF); wrong comment on the photo route. | Remove; correct the comment. |
| L-10 | `app/api/v1/daily-inspiration/route.ts`, `app/api/v1/payment-settings/route.ts`, `BlogEngagement.tsx`, `CourseEnrollButton.tsx` | ESLint warnings: unused parameters, `window.location.href` for internal navigation. | Remove the parameters; `router.push`. |

### Operational (need production access; documented, not changed in code)

| ID | Issue | Recommendation |
|---|---|---|
| O-1 | `DATABASE_URL` uses `connection_limit=1` (`docs/OPERATIONS.md`); with Fluid compute, concurrent requests on an instance queue behind interactive transactions. | Raise to 5 on the Neon pooler URL in Vercel. |
| O-2 | `/api/cron/email-outbox` runs daily (`vercel.json`); a large announcement's e-mail backlog drains once a day. | Run it every 10-15 minutes if the Vercel plan allows sub-daily crons. |
| O-3 | Unique-index migrations `20261103000300`, `20261103002000`, `20261124000200` downgrade a duplicate violation to a warning, so the index may be missing in production. | Run the index check in `docs/OPERATIONS.md` against production once. |
| O-4 | Student list endpoints in `/api/v1` (payment history, enrolments, attendance, grades) are unpaginated. They are per-student and bounded in practice; adding pagination changes the response shape for installed apps. | Add opt-in pagination when the mobile app is ready for it. |

## Implementation plan

Each line is one commit on `dev`, with tests where behaviour changes. Order: security, data integrity, correctness,
performance, UI, housekeeping.

1. `fix(auth)`: verification requires the account password (H-1).
2. `fix(auth)`: rate-limit the password check on account deletion (M-1).
3. `fix(privacy)`: account deletion anonymises fatwa questions and contact inquiries; refuse certificates for deleted users (M-2, L-3).
4. `fix(fatwa)`: one question service for web and API; mobile questions are answerable (M-3).
5. `fix(courses)`: status change and enrolment sync in one transaction (M-4).
6. `fix(enrollments)`: admin enrol never downgrades an active or completed enrolment (M-5).
7. `fix(grades)`: `maxMarks` cannot drop below stored marks; letter grade from the unrounded ratio; rounded totals (M-6, L-1).
8. `fix(bookstore)`: store the screenshot before the order transaction (M-7).
9. `fix(roll-numbers)`: per-course monotonic counter (M-8).
10. `fix(admin)`: course and teacher deletes keep financial links; audited expense delete (M-9, M-10).
11. `fix(payments)`: refuse monthly payments for a zero monthly fee (L-5).
12. `fix`: teacher course counts (L-2), registration year timezone (L-4).
13. `perf(audit)`: entity list via `groupBy` (M-11); `perf(pdf)`: shorter queue timeout (L-8).
14. `fix(ui)`: scrollable tables (M-12); blog engagement state (L-6); business-timezone dates (L-7); lint warnings (L-10).
15. `chore`: remove unused constants (L-9); operational notes (O-1 … O-4) in `docs/OPERATIONS.md`.

## Checked and found sound

- **Auth:** proxy and layout guards; every server action and `/api/v1` route has the right guard; JWT claims re-read
  with session versioning; Bearer tokens on a separate salt, hashed rotating refresh tokens with reuse detection;
  constant-time secret comparison; reset/verification tokens hashed and expiring; no open redirects; rate limits on
  sign-in, reset, registration.
- **Files:** `/api/files` authorizes by exact DB path, uniform 404; uploads sniff content, no SVG, signed
  Content-Type/Length, server-chosen keys.
- **XSS:** rich text sanitized on read; JSON-LD escaped; every PDF and e-mail template escapes interpolated values;
  no unsafe raw SQL.
- **Money:** server-side amounts, guarded approve/decline/void, coupon row locks, partial unique indexes on periods
  and UTRs, gap-free document numbers, correct inclusive GST split, timezone-correct finance ranges.
- **Academic:** grade and attendance writes are transactional and course-scoped; certificate issue is admin-only and
  transactional; course delete refuses courses with history.
- **Database:** FKs match the delete flows (other than M-9, M-10); the unique constraints the code relies on exist;
  indexes cover the hot queries.
