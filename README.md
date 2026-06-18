# Darse Quran Academy.

Online Islamic learning platform built with **Next.js 16**, **React 19**, **Prisma 6**, **Tailwind CSS 4**, **Auth.js (next-auth v5)**, and **TypeScript 5**.

Students browse courses, complete a registration profile, enroll, pay enrollment and monthly fees via UPI, download receipts and completion certificates, receive in-app notifications, submit reviews, and ask fatwa questions. Admins manage content, approvals, enrollments, finance, and payments. Teachers manage assigned courses, post announcements, and submit blogs for approval.

## Features

### Public site

- **Home** — featured courses, verse/hadith of the day, announcements, blogs, library picks, fatwa highlights, and approved student reviews (testimonials)
- **Courses** — browse, filter, and request enrollment (profile must be complete)
- **Announcements**, **Blog**, **Teachers**, **Resources** (digital library), **Fatwa** (browse and ask), **Contact**, **About**

### Student profile (`/profile`)

- **Profile** — summary card (avatar initials, name, email, member since, complete/incomplete badge) and a structured registration form (full name, father's name, date of birth, occupation, address, country, WhatsApp, read-only email). Enrollment and checkout require a complete profile.
- **Notifications** — in-app updates for payment approved, enrollment approved/rejected, course announcements, personal messages, and site announcements; unread badge on nav, all/unread filter, mark all as read
- **My Courses** — enrollment status, course announcements, UPI payment for enrollment and monthly fees, certificate download when uploaded
- **Payments** — payment history and receipt download
- **My reviews** — submit multiple reviews (pending admin approval)

### Teacher portal (`/teacher`)

- Dashboard of assigned courses
- Per-course **students** roster and **announcements** (class-wide or private to one student)
- **My blogs** — draft, submit for approval, edit, and view status

### Admin panel (`/admin`)

- **Dashboard** — content and people counts, pending approval highlights, quick links to tools
- **Announcements** — site-wide notices and homepage events
- **Blogs** — admin-authored posts with images
- **Verse & Hadith** — daily inspiration for the homepage
- **Courses** — CRUD, status (draft/published/ongoing/completed/on hold), fees, featured homepage, students, certificates, course announcements
- **Enrollments** — approve or decline enrollment requests
- **Payment details** — UPI and bank account info shown to students
- **Finance** — income vs expenses dashboard with date presets, search, filters, and net summary
- **Record expense** — log academy costs (teacher salary, hosting, marketing, software, office, other)
- **Social links** — contact email, WhatsApp, Facebook, Instagram, YouTube
- **Students** — roster, enrollments, manual payment records
- **Teachers** — profiles and course assignments
- **Digital Library** — PDF resources
- **Fatwa** — answer and feature questions on the homepage
- **Contact inquiries** — read and reply
- **Blog approvals**, **Review approvals**, **Payment approvals** — approve teacher blogs, student reviews, and UPI payment submissions

Auth: email/password (register, forgot/reset password), optional Google OAuth. After sign-in, `/auth/continue` routes users by role (admin → `/admin`, teacher → `/teacher`, student → `/profile`).

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | GET, POST | Auth.js session handlers |
| `/api/auth/register` | POST | Student registration |
| `/api/auth/forgot-password` | POST | Password reset email |
| `/api/auth/reset-password` | POST | Set new password |
| `/api/checkout` | POST | Course enrollment request (auth + profile-complete check) |
| `/api/enrollment-payment/confirm` | POST | Submit enrollment UPI payment + screenshot |
| `/api/monthly-payment/confirm` | POST | Submit monthly UPI payment + screenshot |
| `/api/receipt/[paymentRecordId]` | GET | Download PDF receipt |
| `/api/certificate/[enrollmentId]` | GET | Download uploaded completion certificate |

## Quick start

**Prerequisites:** Node.js 20+ and npm.

```bash
git clone https://github.com/kaisarnajar/darse-quran-academy.git
cd darse-quran-academy
npm install
cp .env.example .env   # edit values — see table below
npm run db:migrate
npm run db:seed:demo
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`db:seed:demo` loads local QA data only: courses (published, ongoing, completed, on hold, draft), teachers, library, approved student reviews, logins, enrollments, payments (including pending submissions with screenshots), finance income and expenses, contact inquiries, announcements, blogs with images (published, draft, pending/rejected), verse/hadith, fatwa, course announcements, student notifications, password-reset tokens, and a demo completion certificate. Blocked when `NODE_ENV=production` unless `ALLOW_DEMO_SEED=true`. Production starts empty — add real content in `/admin`.

`npm run db:seed:demo` is also registered as the Prisma seed (`npx prisma db seed`).

### Demo login accounts

After `npm run db:seed:demo`, use these accounts for local QA (passwords are shared per role):

| Role | Email | Password |
|------|-------|----------|
| **Admin** | Any address listed in `ADMIN_EMAIL` in `.env` | `Admin@2026` |
| **Teacher** | `ibrahim.khan@teachers.darsequranacademy.org` … `bilal.wani@teachers.darsequranacademy.org` (all 12 seeded teachers) | `Teacher@2026` |
| **Student** | `demo-student-01@seed.local` … `demo-student-50@seed.local` | `Demo@2026` |

1. Add your email(s) to `ADMIN_EMAIL` in `.env` before seeding so admin accounts are created.
2. Sign in at [http://localhost:3000/login](http://localhost:3000/login).
3. Admins → [http://localhost:3000/admin](http://localhost:3000/admin); teachers → `/teacher`; students → `/profile`.

**Demo highlights:**

- **Student 06** — pending February monthly fee with payment screenshot; 4 unread notifications at `/profile/notifications`
- **Student 19** — completed `qiraat-advanced` enrollment with an uploaded certificate
- **Student 03** — declined enrollment (notification demo)
- **Student 11** — 2 unread notifications (sisters batch scenario)
- **Admin → Finance** — sample income records, one manual payment, and six demo expenses

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_URL` | Yes | Public site URL (NextAuth, OAuth callbacks, email links). |
| `AUTH_SECRET` | Yes | Session secret. Generate: `openssl rand -base64 32` |
| `DATABASE_URL` | Yes | SQLite database path. Local: `"file:./dev.db"`. Production on a persistent server: `"file:/absolute/path/to/prod.db"` or `"file:./prod.db"` relative to the Prisma directory. |
| `ADMIN_EMAIL` | Yes | Comma-separated admin emails for `/admin`. |
| `AUTH_GOOGLE_ID` | No | Google OAuth client ID. |
| `AUTH_GOOGLE_SECRET` | No | Google OAuth client secret. |
| `SMTP_HOST` | No | SMTP host (e.g. `smtp.gmail.com`). |
| `SMTP_PORT` | No | SMTP port (default `587`). |
| `SMTP_USER` | No | SMTP login. |
| `SMTP_PASS` | No | SMTP password or app password. |
| `EMAIL_FROM` | No | From header; falls back to `SMTP_USER`. |
| `ALLOW_DEMO_SEED` | No | Set to `true` to run `db:seed:demo` with `NODE_ENV=production` (staging only). |

UPI, bank details, contact email, and social links are configured in **Admin → Payment details** and **Social links** (not in `.env`).

If SMTP is not set, transactional emails are logged to the server console for local testing. See `.env.example` for a local template.

**Never commit `.env` or real secrets.**

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Prisma generate + development server |
| `npm run build` | Prisma generate + production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run knip` | Dead code and unused dependency check |
| `npm run db:migrate` | Apply Prisma migrations only (`migrate dev --skip-seed`; no demo data) |
| `npm run db:push` | Push schema to DB without migrations (prototyping) |
| `npm run db:seed:demo` | Local QA dataset (see seed guards above) |
| `npm run vercel-build` | Vercel build (`prisma generate`, `migrate deploy`, `next build`) |
| `npm run generate:countries` | Regenerate country list for profile forms |
| `npm run optimize-logo` | Optimize logo assets |

`postinstall` runs `prisma generate` automatically after `npm install`.

## Project structure

```
app/          Next.js App Router — public pages, profile, admin, teacher, API routes
components/   UI (site, home, admin, teacher, profile, auth)
content/      Seed data and static copy (courses, teachers, demo students)
lib/          Auth, Prisma, email, payments, receipts, certificates, notifications, validations
prisma/       Schema, migrations, demo seed scripts
public/       Static assets; uploads/ for certificates, receipts, blogs, payments
scripts/      Build and maintenance scripts
```

## Deployment

This project requires **PostgreSQL** and uses **local file uploads** (`/public/uploads/...`) for courses, books, libraries, and user content.

Because of the local file upload dependency, **serverless platforms like Vercel or Netlify are not suitable** unless you rewrite the upload functionality to use a Cloud Storage provider (e.g., AWS S3). If you deploy to Vercel, uploaded files will be instantly deleted because serverless containers are ephemeral.

### Recommended Hosting: Railway, Render, or VPS

We strongly recommend deploying to a Platform as a Service (PaaS) like **Railway**, **Render**, or a traditional **VPS** (e.g., DigitalOcean). These platforms support **Persistent Disk Volumes**, which guarantees your file uploads are saved permanently without needing to rewrite any code.

### Deployment Steps (Example using Railway)

1. **Create a PostgreSQL Database:** Provision a managed PostgreSQL instance on your platform and copy the connection string.
2. **Set Environment Variables:** 
   ```bash
   DATABASE_URL="postgresql://user:password@host:port/database"
   AUTH_URL="https://your-domain.com"
   AUTH_SECRET="your-32-char-secret"
   ADMIN_EMAIL="admin@youracademy.org"
   ```
3. **Mount a Persistent Volume:** In your hosting dashboard, mount a persistent volume specifically to the `/public/uploads` directory to ensure files survive deployments.
4. **Deploy the Code:** Push your code. Ensure the build command is `npm run build` (which runs `prisma generate` and builds the Next.js app).
5. **Run Migrations:** Run the following command against your production database to create the tables:
   ```bash
   npx prisma migrate deploy
   ```
6. **Start the Server:** The start command should be `npm run start`.
7. **First Login:** Sign in using the email you provided in `ADMIN_EMAIL`. You can now manage Payment Details, Social Links, Courses, and more at `/admin`.

### Database Migrations

The project is configured for PostgreSQL (`provider = "postgresql"` in `prisma/schema.prisma`).
If you need to make future schema changes during development:
1. Ensure your local `DATABASE_URL` is pointing to a local PostgreSQL instance.
2. Run `npx prisma migrate dev --name <migration_name>`
3. This will generate a new migration file inside `prisma/migrations` which you must commit to Git.

### Backup Recommendations
- Use managed PostgreSQL backups provided by your hosting platform.
- Periodically back up the contents of the `/public/uploads` volume to an external storage service (like AWS S3 or a local NAS).

## License

Private project — see repository owner for usage terms.
