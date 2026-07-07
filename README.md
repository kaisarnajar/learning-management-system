# Academy LMS

A modern, full-stack Learning Management System (LMS) built for online education and academies. The platform allows students to enroll in courses, read books, browse digital library items, and submit Q&A (Fatwa). It provides a comprehensive admin and teacher dashboard for managing enrollments, grading, attendance, and revenue.

Built entirely as a **White-Label** solution, you can spin up a production-ready academy by simply updating the centralized branding configurations and environment variables.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4, Lucide React (Icons)
- **Database:** PostgreSQL (Neon) with Prisma ORM
- **Authentication:** NextAuth.js (Auth.js v5)
- **Storage:** Cloudflare R2 / AWS S3
- **Emails:** Nodemailer (with custom React/HTML templates)
- **PDF Generation:** Puppeteer (Server-side rendered HTML-to-PDF)
- **Validation:** Zod
- **Components:** Radix UI Primitives

## White-Label Configuration

To deploy this application for your own academy, you **do not** need to edit the UI components or business logic. All configuration is centralized:

1. **Brand Settings**: Edit `config/brand.ts` to set your academy's name, website URL, SEO templates, support emails, and social links.
2. **Assets**: Edit `config/assets.ts` to map your specific logos, favicons, and default cover images.
3. **Business Rules**: Edit the files in `config/constants/` (e.g., `payments.ts`, `file.ts`, `business.ts`) to configure your supported currencies, max upload limits, and status mappings.

## Setup & Local Development

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in your database, NextAuth, SMTP, and S3/R2 credentials.
   ```bash
   cp .env.example .env
   ```

3. **Initialize Database:**
   Push the Prisma schema to your database.
   ```bash
   npx prisma db push
   ```

4. **Seed the Database:**
   Populate the database with necessary setup data (e.g., super admin accounts, initial payment settings).
   ```bash
   npm run db:seed
   ```
   *(Optional)* To populate the database with extensive demo content (dummy courses, students, and payments), ensure `ALLOW_DEMO_SEED="true"` is set in your `.env` and run:
   ```bash
   npm run db:seed:demo
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Architecture Overview

- `/app`: Next.js App Router structure with distinct sub-applications for `(public)`, `(auth)`, `admin`, `teacher`, and `profile` (student).
- `/components`: A strictly decoupled, centralized UI component library (`/ui`) leveraging Tailwind CSS. 
- `/config`: The single source of truth for all white-label variables (brand, assets, constants).
- `/services`: Core business logic decoupled from the UI layer (e.g., `email/`, `auth.ts`, `payments.ts`).
- `/utils`: Helper functions, validation schemas, and formatting utilities.
- `/prisma`: Database schemas and initialization seeding tools.

## Production Deployment

This application is designed to be easily deployed to **Vercel**:
1. Connect your GitHub repository to Vercel.
2. Ensure the Build Command is `prisma generate && next build`.
3. Map all environment variables from your `.env` to Vercel's environment variables.
4. Deploy!

## License
MIT License.
