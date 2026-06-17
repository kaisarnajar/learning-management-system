-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BookOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totalAmountInrPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "paymentMethod" TEXT,
    "upiTransactionId" TEXT,
    "paymentScreenshotPath" TEXT,
    "notes" TEXT,
    "deliveryAddress" TEXT NOT NULL DEFAULT 'No address provided',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BookOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BookOrder" ("createdAt", "id", "notes", "paymentMethod", "paymentScreenshotPath", "status", "totalAmountInrPaise", "updatedAt", "upiTransactionId", "userId") SELECT "createdAt", "id", "notes", "paymentMethod", "paymentScreenshotPath", "status", "totalAmountInrPaise", "updatedAt", "upiTransactionId", "userId" FROM "BookOrder";
DROP TABLE "BookOrder";
ALTER TABLE "new_BookOrder" RENAME TO "BookOrder";
CREATE INDEX "BookOrder_userId_idx" ON "BookOrder"("userId");
CREATE INDEX "BookOrder_status_idx" ON "BookOrder"("status");
CREATE INDEX "BookOrder_createdAt_idx" ON "BookOrder"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
