-- Additive: free-text name for an expense whose category is "other".
-- Categories themselves are now a fixed list validated in code.
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "note" TEXT;
