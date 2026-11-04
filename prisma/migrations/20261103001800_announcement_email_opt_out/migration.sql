-- Additive: a student may stop announcement emails (in-app notifications continue).
-- Set through the signed one-click link in the List-Unsubscribe header.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "announcementEmailsOptOut" BOOLEAN NOT NULL DEFAULT false;
