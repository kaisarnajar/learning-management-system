# Testing

| Command | What it runs | Needs |
|---|---|---|
| `npm test` | every Vitest project (unit + the DB-backed ones that are enabled) | nothing; DB suites skip themselves |
| `npm run test:unit` | pure unit tests in `tests/unit` | nothing |
| `npm run test:api` | every `/api/v1` route handler called directly, plus the API middleware (CORS, cross-site guard) | `DATABASE_URL_TEST` (the middleware tests run without) |
| `npm run test:security` | XSS corpus through rich text, JSON-LD, PDF and e-mail templates; teacher IDOR (GRD-1/2); open-redirect vectors; CSP and security headers; rate limiting | `DATABASE_URL_TEST` for the access-control and rate-limit parts |
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

## Content-Security-Policy rollout (`CSP_ENFORCE`)

The nonce-based CSP is sent as `Content-Security-Policy-Report-Only` by default and as the enforcing
`Content-Security-Policy` header when `CSP_ENFORCE=true` (read once at start-up by `middleware.ts`; policy built in
`services/security-headers.ts`). Nothing in the code hard-codes enforcement:

1. CI runs the e2e journeys with `CSP_ENFORCE=true`, so a page that needs an inline script or an
   un-allow-listed origin fails the pipeline.
2. When the suite has stayed green, set `CSP_ENFORCE=true` in the Vercel project environment. Roll back by
   setting it to `false` and redeploying; no code change is involved.

`tests/security/web-hardening.test.ts` pins both modes (report-only by default, enforcing only for the exact
value `true`), a fresh nonce per request, and the absence of `unsafe-inline`/`unsafe-eval` for scripts in
production.
