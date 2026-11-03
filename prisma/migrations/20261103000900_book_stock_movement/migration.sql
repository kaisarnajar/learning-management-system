-- Additive: manual stock adjustments per book (inventory = purchased + adjustments - committed order quantities).
CREATE TABLE IF NOT EXISTS "BookStockMovement" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "orderId" TEXT,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BookStockMovement_bookId_idx" ON "BookStockMovement"("bookId");
CREATE INDEX IF NOT EXISTS "BookStockMovement_orderId_idx" ON "BookStockMovement"("orderId");

DO $$ BEGIN
    ALTER TABLE "BookStockMovement" ADD CONSTRAINT "BookStockMovement_bookId_fkey"
        FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "BookStockMovement" ADD CONSTRAINT "BookStockMovement_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "BookOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
