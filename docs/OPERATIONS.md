# Operations runbook

This document covers database migrations and the production safety rules that
every change to this repository must follow. Read it before touching
`prisma/schema.prisma`, `prisma/migrations/` or any script under `scripts/`.

## 1. Rules for the production database

The application is live. The production database is never disturbed by a
deploy:

1. **Additive, idempotent migrations only.** Every `migration.sql` uses
   `IF NOT EXISTS` / `DO $$ … EXCEPTION WHEN duplicate_object` guards and gives
   every new `NOT NULL` column a default.
2. **No destructive DDL.** No `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`,
   `ALTER COLUMN … TYPE`, `prisma db push`, `--accept-data-loss`.
   `npm run db:safety` rejects such statements in any migration newer than the
   baseline and runs in CI. It also rejects `DROP CONSTRAINT/TYPE/SCHEMA`,
   `DROP INDEX` (unless the migration recreates that index), `RENAME`,
   `SET NOT NULL`, and `UPDATE`/`DELETE` without a real `WHERE`, including SQL
   built for `EXECUTE` inside `DO` blocks. A statement that is safe in context
   (e.g. a constraint swapped for a stricter one) carries
   `-- safety: allow <reason>` on the line before it.
3. **Expand / contract for type changes.** Add a new nullable column, backfill
   it with a dry-run script, switch the code to read the new column with a
   fallback, and drop the old column only in a later release.
4. **Foreign keys and `CHECK` constraints are added `NOT VALID`, and the
   `VALIDATE CONSTRAINT` goes in a separate, later migration.** Prisma sends
   each `migration.sql` to Postgres as one multi-statement command, which runs
   as a single (implicit) transaction. A `VALIDATE` in the same file as its
   `ADD CONSTRAINT … NOT VALID` therefore keeps the `ADD`'s lock (`SHARE ROW
   EXCLUSIVE` on both tables of a foreign key, `ACCESS EXCLUSIVE` for a
   `CHECK`) for the whole validation scan, which is exactly what `NOT VALID`
   is meant to avoid. In its own migration, `VALIDATE` takes only `SHARE
   UPDATE EXCLUSIVE`, so reads and writes carry on while it scans. If the
   validation fails (an orphan or a bad row), only that migration fails; fix
   the data and deploy again. Earlier migrations that validate in the same
   file (e.g. `20261103001000_course_relations`) are already applied and stay
   as they are. For the same reason `CREATE INDEX CONCURRENTLY` cannot run
   inside a migration with other statements; at this database's size plain
   `CREATE INDEX` is used, rehearsed on a Neon branch first (rule 6).
5. **Data scripts are dry-run by default** (`scripts/*.ts` print a report and
   exit unless `--apply` is passed) and snapshot the rows they touch.
6. **Rehearse on a Neon branch of production** before any release that contains
   a migration or a data script.
7. **Never run against production:** `prisma db push`, `prisma migrate reset`,
   `prisma migrate dev`, `npm run db:seed:demo`, any script without a prior
   dry run.
8. **Connection settings live on the URL.** `DATABASE_URL` is the Neon pooler
   URL with `connection_limit=5&pool_timeout=10` (a small pool per function
   instance: Fluid compute sends concurrent requests to one instance, and with a
   single connection they all queue behind any open transaction; the pooler
   makes a few connections per instance cheap); `DIRECT_URL` is the direct URL used only by `prisma migrate`
   (`prisma.config.ts`: `DIRECT_URL`, else `DATABASE_URL`). The app connects
   through the `pg` driver adapter; `utils/prisma-client.ts` turns
   `connection_limit`, `pool_timeout`, `connect_timeout` and `schema` into pg
   pool settings, so the Prisma client itself has no pool configuration.
   Because Prisma CLI commands use `DIRECT_URL` first, point **both**
   variables at the target when running one by hand (see §3).

### When migrations run on Vercel

`vercel.json` builds with `npm run vercel-build`, i.e. `scripts/vercel-build.sh`.
It runs `prisma migrate deploy` only when:

- `VERCEL_ENV=production` (deployments of `master`), or
- `RUN_MIGRATIONS=true` is set explicitly, for a staging project whose
  `DATABASE_URL`/`DIRECT_URL` point at its own database.

Preview deployments (every other branch) build without migrating, so a
branch's unreviewed migration can never reach the database a Preview
environment is configured with. Check what a build would do with
`VERCEL_ENV=preview bash scripts/vercel-build.sh --dry-run`. After a change
to this script, confirm the next production build log shows
"Applying migrations".

Keep Preview's `DATABASE_URL` and `DIRECT_URL` pointed at a Neon branch, never
at production: Vercel applies new variables to every environment by default.

## 2. Migration history and the baseline

Until 2026-07-25 production was synchronised with `prisma db push`; after that
the build ran `prisma/fix-migration-lock.ts`, which stamped every migration as
applied, so `prisma migrate deploy` never executed SQL in production. Seven
tables, three enums, eight columns and two enum values therefore existed only
in `schema.prisma`.

Migration `20261103000200_sync_schema_baseline` records those objects. It is
fully guarded: a **no-op** on production (the objects already exist) and a
complete build on an empty database.

### Drift checks

```bash
npm run db:drift        # static comparison (no database needed)
SHADOW_DATABASE_URL=postgresql://… npm run db:drift   # authoritative prisma migrate diff
npm run db:safety       # rejects destructive SQL in post-baseline migrations
```

Both run in CI. Migrations are append-only: never edit a migration after it
has been merged.

## 3. Production cut-over for the baseline (one time)

Perform these steps in order. Steps 1–4 are read-only.

1. **Confirm point-in-time restore** is enabled on the Neon project and perform
   a restore drill on a branch (restore to a timestamp, open the branch, run a
   `SELECT count(*)` on `"PaymentRecord"`).
2. **Create a Neon branch** of production (`prod-rehearsal-<date>`).
3. **Pre-flight introspection** on the branch — this shows the real gap between
   production and the schema and confirms whether `DeviceToken` and
   `UserCartItem` exist:
   ```bash
   DIRECT_URL="$BRANCH_DATABASE_URL" npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
   ```
   Expected output: empty, or only the objects listed in the baseline
   migration. Anything else must be understood before continuing.
4. **Inspect the migration table** on the branch:
   ```sql
   SELECT migration_name, finished_at, applied_steps_count FROM "_prisma_migrations" ORDER BY migration_name;
   ```
   The repair script normally recorded all seven historical migrations. For
   any historical migration that is **missing**, run
   `prisma migrate resolve --applied <migration_name>` against the branch —
   this only writes a bookkeeping row and executes no SQL.
5. **Rehearse** on the branch: `DATABASE_URL=$BRANCH_DATABASE_URL DIRECT_URL=$BRANCH_DATABASE_URL npx prisma migrate deploy`.
   Before it, run the read-only reports `npx tsx scripts/report-orphan-course-refs.ts`
   (any row listed makes `20261103001000_course_relations` fail) and
   `npx tsx scripts/report-duplicate-payment-keys.ts` against the branch.
   It must apply exactly the twenty migrations `20261103000100_rate_limit_bucket`
   through `20261103002000_payment_label_index_ignores_voided`, nothing older.
   Re-run the drift diff from step 3;
   it must now be empty. Run the application against the branch and smoke
   test coupons, cart, blog likes/comments and payment settings.
6. **Production:** repeat step 4 (resolve any missing historical rows), then
   deploy. The production Vercel build runs `prisma migrate deploy`, which
   applies the same twenty migrations.
7. Record the outcome (timestamp, migrations applied, row counts of
   `PaymentRecord`, `Enrollment`, `User` before and after) in the release
   ticket.

## 4. Data-correction scripts

All scripts under `scripts/` that modify rows follow the same contract: they
print a full report and exit unless `--apply` is passed, and in apply mode they
first snapshot the affected rows to `scripts/out/` (git-ignored). Run every
script in dry-run mode against production first, attach the report to the
release ticket, and apply only after the finance owner has reviewed it.

| Script | Purpose | Idempotent |
|---|---|---|
| `scripts/report-duplicate-payment-keys.ts` | read-only: rows that block the partial unique indexes | yes |
| `scripts/report-orphan-course-refs.ts` | read-only: enrollments and fee submissions whose `courseId` matches no course. Must report zero before migration `20261103001000_course_relations` is deployed; that migration validates the new foreign keys and rolls back otherwise | yes |
| `scripts/backfill-payment-records.ts` | create the missing `PaymentRecord` for approved fee submissions (the admin page no longer does this while rendering) | yes |
| `scripts/backfill-status-enums.ts` | fill the typed enum twins (`statusEnum`, `paymentTypeEnum`, `paymentMethodEnum`, `certificateTypeEnum`, `platformEnum`, `genderEnum`) from the legacy text columns, in batches of 1,000; text values with no mapping are listed and left NULL (exit code 1) | yes |
| `scripts/backfill-grade-marks-decimal.ts` | fill `CourseGradeRecord.marksObtainedDecimal` from the Float column (rounded to 2 dp), batched; out-of-range values are listed and left NULL | yes |
| `scripts/backfill-teacher-user-links.ts` | link each `Teacher` to the one non-deleted `User` with the same email via `Teacher.userId`; ambiguous or missing accounts are listed, never guessed | yes |
| `scripts/backfill-waiver-fee-type.ts` | fill `CouponRequest.feeType` from the legacy `[Fee Type: …]` prefix in `reason` (the text is left as is); readers fall back to the prefix until this has run | yes |
| `scripts/backfill-book-order-links.ts` | link legacy book-purchase payment records to their order via `PaymentRecord.bookOrderId`; ambiguous matches are listed, never guessed | yes |
| `scripts/recompute-receipt-gst.ts` | report receipts whose stored fee/GST split used the old "18% of total" formula; `--apply` (optionally `--ids=`) rewrites them. Recommendation: leave issued invoices untouched and use credit notes; apply only on the finance owner's written instruction | yes |

## 5. Seeding

- `npm run db:seed` runs the bootstrap seed only (`prisma/seed-bootstrap.ts`).
  It creates, when missing, the teachers, courses and library items from
  `content/`, the payment-settings row (empty bank and UPI details) and the
  shipping-charge slabs. Every write is an upsert with `update: {}`: an
  existing row is never changed, so admin edits survive a re-run, and nothing
  is deleted. It creates no coupons, users, reviews or payments.
- Coupons (including the DEFAULT `WELCOME50`, `EARLYBIRD20` and
  `SCHOLARSHIP100`, which every student would be offered) and the homepage
  testimonials come only from the demo seed.
- `npm run db:seed:demo` **deletes every row**. It refuses to run unless
  `ALLOW_DEMO_SEED=true` and the database host is listed in
  `SEED_ALLOWED_DB_HOSTS`. Never list the production host.

## 6. Direct uploads to R2

Announcement attachments, blog and site-announcement images, and library and
book covers are uploaded by the browser straight to R2 with a presigned PUT
(`/api/uploads`, `services/direct-upload.ts`), so they never pass through a
Vercel function (4.5 MB body cap). The file lands under `staging/` in the
private bucket and is checked and moved when the form is submitted.

- **CORS rule (one time, per bucket).** The browser can only PUT once the
  private bucket allows the site's origin:
  `npx tsx scripts/configure-r2-cors.ts` prints the rule (dry run);
  `--apply` sets it, replacing the bucket's existing CORS rules (saved to
  `scripts/out/` first). Until then, forms fall back to the old form upload
  for files up to 4 MB in total, and larger files show an error.
- **Lifecycle rule (recommended).** Files that were uploaded but never
  submitted stay under `staging/`. In the Cloudflare dashboard, add an object
  lifecycle rule on the private bucket that deletes the `staging/` prefix
  after 1 day.

## 7. Production checks (review of 2026-11-25)

These need the production environment and were not changed from the repository
(`docs/CODE_REVIEW_2026-11-25.md`, O-1 to O-4).

1. **Connection pool (O-1).** If the Vercel `DATABASE_URL` still carries
   `connection_limit=1`, change it to `connection_limit=5` (see §1.8) and redeploy.
2. **E-mail outbox cadence (O-2).** `vercel.json` drains the outbox once a day
   (`0 3 * * *`); a large announcement's mails that did not fit in the 20 s
   `after()` drain wait for it. On a plan with sub-daily crons, schedule
   `/api/cron/email-outbox` every 10-15 minutes (`*/15 * * * *`).
3. **Unique indexes that may be missing (O-3).** Three migrations create partial
   unique indexes inside a block that turns a duplicate-row failure into a
   warning, so `migrate deploy` succeeds without the index. Run once against
   production (read-only) and expect five rows:

   ```sql
   SELECT indexname FROM pg_indexes WHERE indexname IN (
     'CoursePaymentSubmission_upiTransactionId_partial_key',
     'CoursePaymentSubmission_userId_courseId_label_partial_key',
     'CoursePaymentSubmission_userId_courseId_periodKey_partial_key',
     'BookOrder_upiTransactionId_partial_key');
   ```

   Four names are listed because one index is created by two migrations. If any is
   missing, find the duplicates with the matching `GROUP BY ... HAVING count(*) > 1`
   query from that migration, resolve them with a dry-run data script (§4), and
   re-run the index statement on a Neon branch first.
4. **Student list pagination (O-4).** Payment history, enrolments, attendance and
   grades in `/api/v1` return a student's whole list. Adding `page`/`pageSize`
   changes the response for installed apps, so it waits for a mobile release that
   reads paginated responses.

