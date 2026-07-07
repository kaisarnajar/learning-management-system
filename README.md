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
- `payments.ts`: Update currency (`INR`, `USD`), payment types, and Stripe configurations.
- `file.ts`: Update max upload sizes and supported PDF/Image extensions.
- `business.ts`: Set rules like minimum grade requirements, grace periods, or attendance policies.

### 4. UI Design System (`app/globals.css` & `services/pdf-generator.ts`)
To rebrand the colors and visual layout of the application:
1. **Web App:** Open `app/globals.css` and update the `--color-brand-primary` and `--color-brand-gold` hex values under the `@theme inline` block.
2. **PDF Documents:** Open `services/pdf-generator.ts`. Inside the `wrapHtmlForPdf` function, update the `tailwind.config` JavaScript object to ensure generated PDFs use your custom hex colors.

### 5. Database Seed (`prisma/seed-demo.ts`)
If you intend to use the demo seed script (`npm run db:seed:demo`) to populate the database with a full catalog of test data, you can optionally edit this file to generate dummy data specific to your own syllabus.

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
