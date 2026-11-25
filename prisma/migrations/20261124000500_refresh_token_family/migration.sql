-- Additive: group the refresh tokens of one sign-in into a family.
--
-- A new API session starts a family and every rotation carries its id, so
-- when a token that was already rotated is presented again (a replay), the
-- whole family can be revoked. The column is nullable: rows issued before
-- this migration stay null, and reuse of one of those falls back to revoking
-- every session of the user. No existing session ends at deploy.
ALTER TABLE "ApiRefreshToken" ADD COLUMN IF NOT EXISTS "familyId" TEXT;

CREATE INDEX IF NOT EXISTS "ApiRefreshToken_familyId_idx" ON "ApiRefreshToken"("familyId");
