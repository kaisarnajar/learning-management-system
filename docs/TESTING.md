# Testing

| Command | What it runs | Needs |
|---|---|---|
| `npm test` | every Vitest project (unit + the DB-backed ones that are enabled) | nothing; DB suites skip themselves |
| `npm run test:unit` | pure unit tests in `tests/unit` | nothing |
| `npm run test:integration` | `tests/integration`: payments, enrollments, roll numbers, book orders, notifications, delete guards, audit and voiding | `DATABASE_URL_TEST` |

## Database-backed suites

The suites that touch Postgres run only when `DATABASE_URL_TEST` is set; without it they are reported as
skipped, never failed. CI starts a Postgres service and sets the variable.

```bash
# any disposable database; the suites TRUNCATE every table in it
export DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/lms_test"
npm run test:integration
```

On start-up (`tests/helpers/global-setup.ts`) the committed migrations are applied with `prisma migrate deploy`
(never `db push`). The runner refuses a database whose host is not local and whose name does not contain `test`,
so a mistyped variable cannot point the suites at production. Each test starts from empty tables
(`resetDb()` in `tests/helpers/db.ts`).

The server actions under test run against the real database. `next/cache`, `after()`, Auth.js and the e-mail
senders are replaced in `tests/helpers/db-setup.ts`; a test signs in as someone with
`vi.mocked(auth).mockResolvedValue(sessionFor(user, "ADMIN"))`.
