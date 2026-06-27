-- CreateEnum
CREATE TYPE "FatwaApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "FatwaQuestion" ADD COLUMN     "approvalStatus" "FatwaApprovalStatus" NOT NULL DEFAULT 'APPROVED';
