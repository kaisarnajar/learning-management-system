-- safety: allow the constraint is re-added straight away with ON DELETE RESTRICT
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_userId_fkey";
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
