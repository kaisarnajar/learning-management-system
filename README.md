# Darse Quran Academy

A modern, full-stack Learning Management System (LMS) built for Islamic education. Darse Quran Academy allows students to enroll in courses, read books, browse digital library items, and submit fatwa questions. It provides a comprehensive admin and teacher dashboard for managing enrollments, grading, attendance, and revenue.

## Features

- **Course Management:** Publish courses with multiple pricing tiers, durations, and levels.
- **Student Dashboard:** Track enrollments, view course announcements, attendance, and grades.
- **Fatwa System:** Students can ask questions; teachers can provide verified fatwa answers.
- **E-Commerce / Bookstore:** Manage and sell physical books with shipping & tracking.
- **Library (Digital):** Provide digital resources (PDFs, Audio, Video) directly to students.
- **Blog & Inspirations:** Daily Qur'an and Hadith inspirations, along with a full blogging engine.
- **Role-Based Access Control:** Distinct roles for Students, Teachers, and Administrators.
- **Automated Certificates:** Generate and email PDF certificates to students upon course completion.
- **Payment Verification:** Manual UPI/Bank transfer uploads with admin approval workflows.

## Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, React 19)
- **Database:** [PostgreSQL](https://www.postgresql.org/) hosted on [Neon](https://neon.tech/)
- **ORM:** [Prisma ORM](https://www.prisma.io/)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/) v5 (Beta)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **File Storage:** [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)
- **Email:** Nodemailer (SMTP)
- **PDF Generation:** Puppeteer + PDF-lib

## Prerequisites

- Node.js (v20+)
- PostgreSQL database
- Cloudflare R2 Account (for file uploads)
- SMTP Email Provider (Gmail or custom domain)

## Local Development Setup

### 1. Installation

Clone the repository and install dependencies:

\`\`\`bash
git clone https://github.com/kaisarnajar/darse-quran-academy.git
cd darse-quran-academy
npm install
\`\`\`

### 2. Environment Variable Configuration

Copy the example environment file and fill in your details:

\`\`\`bash
cp .env.example .env
\`\`\`

See \`.env.example\` for detailed explanations of each required variable. You must configure:
- `AUTH_URL`, `NEXTAUTH_URL`, and `AUTH_SECRET`
- `DATABASE_URL` and `DIRECT_URL` (Connection strings)
- `SMTP_*` for email sending
- `R2_*` for image and document uploads

### 3. Database Setup & Prisma Migrations

Initialize the database schema using Prisma:

\`\`\`bash
npm run db:push
# or for explicit migrations:
npm run db:migrate
\`\`\`

### 4. Prisma Seed Script

To populate the database with demo data (Admin user, Teachers, Students, Courses, Books, etc.), run the seed script:

\`\`\`bash
npm run db:seed:demo
\`\`\`

> **Note:** The default admin credentials will be printed in your console (usually `deputy@youracademy.org` / `Admin@2026`).

### 5. Running the Application

Start the Next.js development server:

\`\`\`bash
npm run dev
\`\`\`

Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Build Process

To build the application for production locally:

\`\`\`bash
npm run build
npm start
\`\`\`

## Production Deployment

### 1. Neon Database Setup

1. Create a project on [Neon](https://neon.tech/).
2. Retrieve the connection string. Neon provides a pooled connection string and a direct connection string.
3. Add the pooled connection string to your Vercel environment variables as `DATABASE_URL`.
4. Add the direct connection string to your Vercel environment variables as `DIRECT_URL`.
5. **Important:** Prisma requires `?pgbouncer=true` if using the pooled connection string natively, but Prisma Accelerate or modern drivers handle this automatically. Follow Neon's specific Prisma instructions.

### 2. Cloudflare Setup (Storage & DNS)

**DNS & Domain:**
1. Add your custom domain to Cloudflare.
2. In the DNS tab, create a `CNAME` record pointing your domain to Vercel (e.g., `cname.vercel-dns.com`). Ensure the proxy status is set correctly depending on Vercel's requirements (usually "DNS Only" for Vercel).
3. Ensure SSL/TLS is set to "Full" or "Strict".

**R2 Storage:**
1. Navigate to **R2 Object Storage** in your Cloudflare dashboard.
2. Create a new Bucket (e.g., `darse-quran-assets`).
3. Under the bucket settings, enable **Public Access** (either via a custom domain or a `.r2.dev` dev URL).
4. Go to **Manage R2 API Tokens** and create a token with `Object Read & Write` permissions.
5. Copy the Account ID, Access Key ID, and Secret Access Key into your `.env` (or Vercel Env Vars).

### 3. Email Provider Configuration

To ensure emails (certificates, password resets) are delivered correctly:
1. Provide a reliable SMTP host (e.g., Resend, SendGrid, or Google Workspace).
2. If using a custom domain, ensure you configure **SPF**, **DKIM**, and **DMARC** records in your Cloudflare DNS settings. This prevents your system emails from landing in spam.
3. Set the `SMTP_*` and `EMAIL_FROM` environment variables.

### 4. Vercel Deployment

1. Import your GitHub repository into [Vercel](https://vercel.com/).
2. In the **Build and Output Settings**, Vercel will automatically detect Next.js.
3. Add all production environment variables from your `.env` file to the Vercel **Environment Variables** tab.
4. **Custom Build Command:** Go to Project Settings -> General -> Build & Development Settings and override the Build Command to:
   \`\`\`bash
   npm run vercel-build
   \`\`\`
   *(This ensures `prisma generate` and `prisma db push` run sequentially before the Next.js build).*
5. Deploy.

## Folder Structure

- `/app`: Next.js App Router pages and API routes.
- `/components`: Reusable React components (UI, Forms, Site layout).
- `/lib`: Utility functions, Prisma client instance, auth configuration, and helpers.
- `/prisma`: Prisma schema (`schema.prisma`), migrations, and seed scripts.
- `/public`: Static assets like icons and optimized logos.
- `/types`: TypeScript type definitions and Zod schemas.

## Common Commands

- `npm run dev`: Start development server.
- `npm run lint`: Run ESLint.
- `npm run knip`: Find unused files, dependencies, and exports.
- `npm run db:push`: Push schema changes directly to the database.
- `npm run db:migrate`: Create a migration file and apply it.

## Troubleshooting

- **Prisma Client not found:** Run `npm run postinstall` or `npx prisma generate`.
- **Database Connection Errors:** Verify that your IP is allowlisted on your database provider (Neon allows all by default) and check that `DIRECT_URL` is set if running migrations.
- **Foreign Key Constraint Errors during Seed:** Ensure you start with a completely fresh database by running `npx prisma migrate reset --force` before running the demo seed script.

## Backup and Restore

Neon provides point-in-time recovery automatically. However, for manual logical backups, use `pg_dump`:
\`\`\`bash
pg_dump "postgresql://user:pass@host/db" > backup.sql
\`\`\`
