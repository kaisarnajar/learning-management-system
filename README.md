# Darse Quran Academy

An advanced, fully-featured online Islamic learning platform and bookstore built with modern web technologies. 

## Project Overview

Darse Quran Academy is a comprehensive educational platform designed to manage courses, students, teachers, finances, and a digital/physical bookstore. It serves as a complete ecosystem for an online academy, bridging the gap between administrators, educators, and learners.

## Features

### User Authentication & Authorization
- **Role-based Access:** Distinct portals automatically routed for Admins (`/admin`), Teachers (`/teacher`), and Students (`/profile`).
- **Secure Auth:** Powered by NextAuth v5 with email/password authentication, password reset flows, and optional Google OAuth.

### Student & Profile Management
- **Detailed User Profiles:** Structured registration capturing necessary demographics (occupation, DOB, address). Checkout and enrollment strictly require a completed profile.
- **Notification Center:** In-app notifications with unread badges for enrollment approvals, payment receipts, course announcements, and book order updates.

### Course Management & Enrollment
- **Course Lifecycle:** Admins can draft, publish, hold, and complete courses.
- **Enrollment Flow:** Students request enrollment and await admin approval.
- **Course Announcements:** Teachers can post class-wide notices (assignments, schedules, study materials) or send private messages to specific enrolled students.

### Finance & Fee Management
- **Fee Management:** Processing for one-time enrollment fees and recurring monthly fees via UPI with manual screenshot verification.
- **Receipts & Certificates:** Automated PDF receipt generation for approved payments and downloadable course completion certificates.
- **Finance Dashboard:** Comprehensive admin dashboard tracking income vs. operational expenses (including teacher salaries, marketing, hosting). Date presets, net summary, and categorization.

### Content & Community
- **Fatwa Section:** Students and guests can ask questions; designated scholars provide answers which can be featured on the homepage.
- **Blog System:** Teachers submit drafts for admin approval; approved posts are published to the public blog.
- **Digital Library:** Curated PDF resources available for students to browse and download.
- **Daily Inspirations:** Verse of the day and Hadith highlights.
- **Student Reviews:** Testimonial submission by students, subject to admin approval and homepage featuring.

### Book Store
- **Book Management:** Admins maintain physical book inventory, pricing, and availability statuses (Available, Out of Stock, Coming Soon).
- **Cart & Checkout:** Seamless student flow to browse books, manage cart, and checkout using UPI payments.
- **Order Approval Workflow:** Admins review pending orders, approve payments, and update fulfillment statuses (Shipped, Refunded).
- **Featured Books:** Highlight specific books directly on the homepage.
- **Integrated Finance:** Book store revenues are tracked alongside course fees.

### Admin Tools & UX
- **Admin Dashboard:** Centralized control for content moderation, user management, and approvals.
- **Search & Filtering:** Robust pagination and case-insensitive search across all data tables.
- **Design:** Modern UI with native **Dark/Light Theme Support** and fully **Mobile-Responsive** layouts.

---

## Technology Stack

- **Framework:** Next.js 16 (App Router)
- **UI/Styling:** React 19, Tailwind CSS 4
- **Database:** PostgreSQL
- **ORM:** Prisma 6
- **Authentication:** Auth.js (NextAuth v5)
- **Language:** TypeScript 5
- **Utilities:** PDF-lib (Receipts/Certificates), Zod (Validation), Nodemailer (Emails)

---

## Local Development Setup

**Prerequisites:** Node.js 20+, npm, and a running **PostgreSQL** database.

### 1. Clone & Install
```bash
git clone https://github.com/kaisarnajar/darse-quran-academy.git
cd darse-quran-academy
npm install
```

### 2. Environment Variables
Copy the example environment file and configure your database connection:
```bash
cp .env.example .env
```
Open `.env` and set `DATABASE_URL` to point to your PostgreSQL instance:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/darsequran"
AUTH_SECRET="generate-a-random-32-char-string"
AUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@yourdomain.com"
```

### 3. Database Migration & Seeding
Push the schema to your PostgreSQL database and load the massive demo dataset:
```bash
npx prisma migrate dev --name init
npm run db:seed:demo
```
*Note: The demo seeder loads massive bulk datasets (books, courses, orders, expenses, blogs) for UI and pagination testing.*

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## Demo Login Accounts

After running the seed script, use these accounts for local QA testing:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | Any address listed in `ADMIN_EMAIL` in `.env` | `Admin@2026` |
| **Teacher** | `ibrahim.khan@teachers.darsequranacademy.org` (or any of the 12 seeded teachers) | `Teacher@2026` |
| **Student** | `demo-student-01@seed.local` (up to student 50) | `Demo@2026` |

---

## Deployment

This project requires **PostgreSQL** and heavily utilizes **local file uploads** (`/public/uploads/...`) for storing payment screenshots, certificates, and blog images.

> **⚠️ CRITICAL:** Because of the local file upload dependency, serverless platforms like Vercel or Netlify are **NOT suitable**. Serverless containers are ephemeral, meaning uploaded files will be instantly deleted after upload.

### Recommended Hosting: Railway, Render, or VPS
Deploy to a Platform as a Service (PaaS) like **Railway**, **Render**, or a traditional **VPS** (e.g., DigitalOcean). These platforms support **Persistent Disk Volumes**, guaranteeing your file uploads survive deployments.

### Deployment Steps (Example using Railway)

1. **Create a PostgreSQL Database:** Provision a managed PostgreSQL instance and copy the connection string.
2. **Set Environment Variables:** Add `DATABASE_URL`, `AUTH_URL`, `AUTH_SECRET`, and `ADMIN_EMAIL` to your production environment variables.
3. **Mount a Persistent Volume:** In your hosting dashboard, mount a persistent volume specifically to the `/public/uploads` directory.
4. **Deploy the Code:** Push your code. The build command `npm run build` will automatically run `prisma generate`.
5. **Run Migrations:** Execute the following against your production database to create tables:
   ```bash
   npx prisma migrate deploy
   ```
6. **Start the Server:** Ensure the start command is `npm run start`.
7. **First Login:** Sign in using the email provided in `ADMIN_EMAIL`. You can now manage Payment Details, Social Links, and content at `/admin`.

---

## Project Structure

```
app/          Next.js App Router — public pages, profile, admin, teacher, API routes
components/   UI components (site, home, admin, teacher, profile, auth)
content/      Seed data and static copy
lib/          Core business logic (Auth, Prisma, emails, payments, receipts, validations)
prisma/       PostgreSQL Schema, migrations, and demo seed scripts
public/       Static assets; uploads/ directory for user-generated files
scripts/      Build and maintenance utility scripts
```

## License

Private project — see repository owner for usage terms.
