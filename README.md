# Academy LMS

A modern, full-stack Learning Management System (LMS) built for online education and academies. The platform allows students to enroll in courses, read books, browse digital library items, and submit Q&A (Fatwa). It provides a comprehensive admin and teacher dashboard for managing enrollments, grading, attendance, and revenue.

Built entirely as a **White-Label** solution, you can spin up a production-ready academy by simply updating the centralized branding configurations and environment variables.

## Tech Stack
- **Framework:** Next.js 16 (App Router) with React 19
- **Styling:** Tailwind CSS v4, Lucide React (icons); the app's own components, no component library
- **Database:** PostgreSQL (Neon) with Prisma ORM
- **Authentication:** Auth.js v5 (`next-auth`), JWT sessions; Google sign-in is optional
- **Storage:** Cloudflare R2 (S3-compatible)
- **Emails:** Nodemailer with HTML templates (`services/email/`)
- **PDF Generation:** Puppeteer, using `@sparticuz/chromium-min` on Vercel (server-rendered HTML-to-PDF)
- **Validation:** Zod
- **Tests:** Vitest (unit, integration, API, security) and Playwright (end-to-end)

How the pieces fit together, and the authorization model, are described in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## White-Label Configuration

To deploy this application for your own academy, you **do not** need to edit the UI components or business logic. All customization is centralized in a few configuration files:

### 1. Brand Profile (`config/brand.ts`)
This is the single source of truth for your academy's identity. Update this file to change:
- `name`: Your Academy Name (e.g. "My Online Academy")
- `shortName`: Used for mobile layouts and tiny spaces
- `websiteUrl`: The primary domain for canonical links and emails
- `contact`: Your support emails and phone numbers
- `socialLinks`: URLs to your YouTube, Facebook, and Instagram
- `seo`: Default metadata templates for search engines

### 2. Digital Assets (`config/assets.ts`)
Replace the standard asset URLs in this file to match your academy's files:
- `logoUrl` / `faviconUrl`: Your primary branding images
- `defaultCoverImage`: The placeholder image used for courses without covers
- `pdfAssets`: The URLs for your **Seal/Stamp**, **CEO Signature**, and **Custom Fonts** used when generating Certificates, ID Cards, and Receipts.

### 3. Business Rules (`config/constants/`)
Configure the core operational logic of the platform by editing the files in this directory:
- `payments.ts`: Payment types, statuses and methods (amounts are stored as integer paise).
- `file.ts`: Update max upload sizes and supported PDF/Image extensions.
- `business.ts`: Set rules like minimum grade requirements, grace periods, or attendance policies.

### 4. UI Design System (`app/globals.css` & `services/pdf-generator.ts`)
To rebrand the colors and visual layout of the application:
1. **Web App:** Open `app/globals.css` and update the `--color-brand-primary` and `--color-brand-gold` hex values under the `@theme inline` block.
2. **PDF Documents:** Open `tailwind.pdf.config.js` and update the same hex colors. `npm run build:pdf-css` compiles it (with `styles/pdf.css`) into `generated/pdf.css`, which `services/pdf-generator.ts` inlines into every generated PDF; `dev`, `build` and `vercel-build` run it for you.

### 5. Database Seed (`prisma/seed-demo.ts`)
If you intend to use the demo seed script (`npm run db:seed:demo`) to populate the database with a full catalog of test data, you can optionally edit this file to generate dummy data specific to your own syllabus.

## Setup & Local Development

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in your database, Auth.js, SMTP, and R2 credentials. `.env.example` lists every variable the code reads; CI (`scripts/check-env-example.sh`) keeps it that way.
   ```bash
   cp .env.example .env
   ```

3. **Initialize Database:**
   Apply the committed migrations. Use `migrate deploy`, not `db push` (and not `migrate dev`) against any database you care about; see `docs/OPERATIONS.md`.
   ```bash
   npx prisma migrate deploy
   ```

4. **Seed the Database:**
   Populate the database with the idempotent bootstrap data (teachers, courses, library items, payment-settings row). Admin access is granted by listing addresses in `ADMIN_EMAIL`; admins sign in with Google or register normally.
   ```bash
   npm run db:seed
   ```
   *(Optional)* To populate a **disposable** database with extensive demo content (dummy courses, students, and payments), set `ALLOW_DEMO_SEED="true"` and list that database's host in `SEED_ALLOWED_DB_HOSTS` in your `.env`, then run:
   ```bash
   npm run db:seed:demo
   ```
   The demo seed deletes every row first. It is never run from a build or deploy step; preview/staging environments are seeded manually from a developer machine against their own database.

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`. `npm run dev` builds the PDF stylesheet and generates the Prisma client first.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | PDF stylesheet, `prisma generate`, then the dev server |
| `npm run build` | `prisma generate` and `next build` (the `prebuild` hook builds the PDF stylesheet) |
| `npm run vercel-build` | What Vercel runs: PDF stylesheet, `prisma generate`, `prisma migrate deploy`, `next build` |
| `npm start` | `next start` on a production build |
| `npm run lint` / `npm run knip` | ESLint / unused files and dependencies |
| `npm run build:pdf-css` | Compiles the Tailwind stylesheet embedded in generated PDFs into `generated/pdf.css` |
| `npm run db:drift` | Fails if `prisma/migrations` and `prisma/schema.prisma` describe different databases (set `SHADOW_DATABASE_URL` for the authoritative check) |
| `npm run db:safety` | Fails if a migration contains destructive SQL (`DROP`, `TRUNCATE`, column type changes, ...) |
| `npm run db:migrate` | `prisma migrate dev`: **disposable local databases only** |
| `npm run db:seed` / `db:seed:demo` | Idempotent bootstrap data / the demo seed, which wipes the database (see above) |
| `npm test` | Every Vitest project; the database-backed ones skip themselves without `DATABASE_URL_TEST` |
| `npm run test:unit` / `test:integration` / `test:api` / `test:security` | One Vitest project each |
| `npm run test:e2e` | Playwright journeys against `next start` (build first; needs `DATABASE_URL_TEST`) |

`npm run db:push` exists for scratch databases only and must never be pointed at a shared one. Test setup, the disposable-database rules and the CSP rollout are in [`docs/TESTING.md`](docs/TESTING.md); contribution rules are in [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md).

## Architecture Overview

- `/app`: Next.js App Router. Public pages at the top level (`courses`, `blog`, `fatwa`, `library`, `bookstore`, ...), plus the `admin`, `teacher`, `profile` (student) and `developer` areas, `api/` (including the mobile REST API under `api/v1`) and shared server actions in `actions/`.
- `/components`: React components, grouped by feature, with generic building blocks in `ui/` and `shared/`.
- `/config`: The single source of truth for white-label values (brand, assets, constants).
- `/services`: Business logic and data access, independent of the UI (e.g. `payments.ts`, `enrollments.ts`, `email/`, `auth.ts`).
- `/utils`: Helpers, validation schemas, HTML builders for PDFs, formatting.
- `/prisma`: Schema, migrations and seed scripts.
- `/scripts`: CI checks and one-off data scripts (dry-run by default).
- `/tests`: Vitest suites (`unit`, `integration`, `api`, `security`) and Playwright journeys (`e2e`).

## Recommended Production Deployment Stack

This application is architected to run on a modern, serverless edge stack. We recommend the following infrastructure for the best performance and easiest setup:

### 1. Frontend & Backend: Vercel
Vercel provides seamless hosting for Next.js App Router applications.
- **Setup:** Connect your GitHub repository to Vercel.
- **Build Command:** `npm run vercel-build` (already set in `vercel.json`). It builds the PDF stylesheet, generates the Prisma client, applies pending migrations with `prisma migrate deploy` (additive migrations only; it never runs `db push`) and then runs `next build`.
- **Environment:** Copy all variables from your `.env` into Vercel's Environment Variables settings (Vercel's own system variables are set for you).
- **Branches:** pull requests go into `master`, which Vercel deploys; see `docs/CONTRIBUTING.md`.

### 2. Database: Neon DB (Serverless PostgreSQL)
Neon provides a scalable, serverless Postgres database that works perfectly with Vercel and Prisma.
- **Setup:** Create a free project on [Neon.tech](https://neon.tech/).
- **Connections:** Use the pooled connection string for `DATABASE_URL` and the direct connection string for `DIRECT_URL`.

### 3. File Storage & Uploads: Cloudflare R2
Cloudflare R2 provides an AWS S3-compatible object storage with zero egress fees, perfect for storing student avatars, PDF certificates, and course assets.
- **Setup:** Create a bucket in Cloudflare R2.
- **Credentials:** Generate an R2 API Token and fill in the `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` in your `.env`.

### 4. Domain Name Registration: SolarSquare
To put your academy on a custom domain (e.g. `youracademy.com`):
- **Setup:** Purchase your desired domain name from SolarSquare (or any preferred registrar like Squarespace, GoDaddy, or Namecheap).
- **DNS:** Once purchased, follow Vercel's domain settings to update your DNS records and point the domain to your Vercel deployment.

## License
MIT License.
