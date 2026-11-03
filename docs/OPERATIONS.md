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
   baseline and runs in CI.
3. **Expand / contract for type changes.** Add a new nullable column, backfill
   it with a dry-run script, switch the code to read the new column with a
   fallback, and drop the old column only in a later release.
4. **Foreign keys are added `NOT VALID` and validated separately**; indexes are
   created `CONCURRENTLY`.
5. **Data scripts are dry-run by default** (`scripts/*.ts` print a report and
   exit unless `--apply` is passed) and snapshot the rows they touch.
6. **Rehearse on a Neon branch of production** before any release that contains
   a migration or a data script.
7. **Never run against production:** `prisma db push`, `prisma migrate reset`,
   `prisma migrate dev`, `npm run db:seed:demo`, any script without a prior
   dry run.

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
   npx prisma migrate diff --from-url "$BRANCH_DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
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
5. **Rehearse** on the branch: `DATABASE_URL=$BRANCH_DATABASE_URL npx prisma migrate deploy`.
   It must apply only `20261103000100_rate_limit_bucket` and
   `20261103000200_sync_schema_baseline`. Re-run the drift diff from step 3;
   it must now be empty. Run the application against the branch and smoke
   test coupons, cart, blog likes/comments and payment settings.
6. **Production:** repeat step 4 (resolve any missing historical rows), then
   deploy. The Vercel build runs `prisma migrate deploy`, which applies the
   same two additive migrations.
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
| `scripts/backfill-book-order-links.ts` | link legacy book-purchase payment records to their order via `PaymentRecord.bookOrderId`; ambiguous matches are listed, never guessed | yes |
| `scripts/recompute-receipt-gst.ts` | report receipts whose stored fee/GST split used the old "18% of total" formula; `--apply` (optionally `--ids=`) rewrites them. Recommendation: leave issued invoices untouched and use credit notes; apply only on the finance owner's written instruction | yes |

## 5. Seeding

- `npm run db:seed` (added in a later commit) runs the non-destructive
  bootstrap only.
- `npm run db:seed:demo` **deletes every row**. It refuses to run unless
  `ALLOW_DEMO_SEED=true` and the database host is listed in
  `SEED_ALLOWED_DB_HOSTS`. Never list the production host.
