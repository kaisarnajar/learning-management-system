-- Enrollment.courseId and CoursePaymentSubmission.courseId were plain text
-- columns with no foreign key, so a deleted course left orphaned enrollments
-- and fee submissions behind. Both get a real relation to Course with
-- ON DELETE RESTRICT (a course with history can no longer be deleted).
--
-- Each constraint is added NOT VALID (no table scan while the lock is held)
-- and then validated. VALIDATE fails if an orphan row still exists; the whole
-- migration then rolls back and `prisma migrate deploy` reports it. Run
-- `npx tsx scripts/report-orphan-course-refs.ts` against the target database
-- BEFORE deploying, fix every row it lists, and only then deploy. If the
-- deploy did fail: fix the rows, then
--   npx prisma migrate resolve --rolled-back 20261103001000_course_relations
-- and deploy again.

DO $$ BEGIN
    ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TABLE "Enrollment" VALIDATE CONSTRAINT "Enrollment_courseId_fkey";

DO $$ BEGIN
    ALTER TABLE "CoursePaymentSubmission" ADD CONSTRAINT "CoursePaymentSubmission_courseId_fkey"
        FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TABLE "CoursePaymentSubmission" VALIDATE CONSTRAINT "CoursePaymentSubmission_courseId_fkey";
