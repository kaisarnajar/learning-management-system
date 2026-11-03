-- Additive: API sessions for the mobile app. One row per sign-in; the
-- refresh token is stored only as a SHA-256 hash and each use rotates it.
CREATE TABLE IF NOT EXISTS "ApiRefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ApiRefreshToken_tokenHash_key" ON "ApiRefreshToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "ApiRefreshToken_userId_idx" ON "ApiRefreshToken"("userId");
CREATE INDEX IF NOT EXISTS "ApiRefreshToken_expiresAt_idx" ON "ApiRefreshToken"("expiresAt");

DO $$ BEGIN
    ALTER TABLE "ApiRefreshToken" ADD CONSTRAINT "ApiRefreshToken_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
