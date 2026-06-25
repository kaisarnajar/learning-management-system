-- CreateTable
CREATE TABLE "SiteAnnouncementImage" (
    "id" TEXT NOT NULL,
    "siteAnnouncementId" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteAnnouncementImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteAnnouncementImage_siteAnnouncementId_sortOrder_idx" ON "SiteAnnouncementImage"("siteAnnouncementId", "sortOrder");

-- AddForeignKey
ALTER TABLE "SiteAnnouncementImage" ADD CONSTRAINT "SiteAnnouncementImage_siteAnnouncementId_fkey" FOREIGN KEY ("siteAnnouncementId") REFERENCES "SiteAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
