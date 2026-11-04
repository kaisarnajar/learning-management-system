# Contributing

## Branches

- **`master` is production.** Vercel deploys it, and its build runs `prisma migrate deploy` against the live database.
- **`dev` is the integration branch.** Work lands here first and the full CI pipeline (including the e2e journeys) runs on it.
- **Pull requests go into `master` only.** Do not open a PR against any other branch, and do not push to `master` directly.
  Work on a feature branch (`feat/…`, `fix/…`, `docs/…`), keep it up to date with `master`, and open the PR from there.
- Nobody, human or automated tool, pushes without being asked to. Push when you mean to publish.

## Commits

- Subject: `type(scope): summary` in the imperative (`fix(payments): …`, `docs: …`, `test: …`). One concern per commit.
- The body explains why, not what. Reference the review issue IDs on a last line, e.g. `Review: PAY-4, PAY-7`.

## Database changes

The production database is live, so migrations are additive and guarded (see `docs/OPERATIONS.md`):

- Use `IF NOT EXISTS` / duplicate-object guards; give every new `NOT NULL` column a default.
- No `DROP TABLE/COLUMN`, `TRUNCATE`, `ALTER COLUMN … TYPE`, `prisma db push` or `--accept-data-loss`.
  `npm run db:safety` rejects these in CI.
- Never run `prisma migrate dev`, `migrate reset`, `db push` or the demo seed against anything but a disposable local database.
- `npm run db:drift` must report no drift between `prisma/migrations` and `prisma/schema.prisma`.

## Before you push

The Husky pre-commit hook runs ESLint and a type-check on the staged files. The full set CI runs:

```bash
npx prisma generate
npx tsc --noEmit
npx eslint . --ignore-pattern ".claude/**"
npm run db:drift
npm run db:safety
bash scripts/check-page-auth.sh
npm run test:unit
```

The database-backed suites (`test:integration`, `test:api`, `test:security`) and the e2e journeys need a disposable
Postgres in `DATABASE_URL_TEST`; see `docs/TESTING.md`.

ESLint carries a baseline of known violations in `eslint-suppressions.json`. New violations fail the build; fixing a
baseline one is welcome, then run `npx eslint . --ignore-pattern ".claude/**" --prune-suppressions` to drop its entry.

## Review

`.github/CODEOWNERS` requests the owner's review on every PR. A PR is ready when CI is green, the description says
what changed and why, and any migration is called out with how it behaves on existing rows.
