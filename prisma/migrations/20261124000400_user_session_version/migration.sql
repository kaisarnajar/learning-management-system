-- Additive: a counter that ends every web session of a user when it moves.
--
-- Web sessions are stateless JWTs. The jwt callback compares the version in
-- the token with this column and drops the session on a mismatch; a password
-- reset, a password change and an account take-over increment it. Existing
-- rows start at 0, which is also how a token issued before the claim existed
-- is read, so no session ends at deploy.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
