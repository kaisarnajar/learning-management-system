-- AlterTable
ALTER TABLE "BookOrder" ADD COLUMN     "courierServiceName" TEXT,
ADD COLUMN     "trackingId" TEXT;

-- AlterTable
ALTER TABLE "SocialLinksSettings" ALTER COLUMN "whatsappNumber" SET DEFAULT '919622966911';
