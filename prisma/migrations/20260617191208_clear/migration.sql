-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceInrPaise" INTEGER NOT NULL,
    "purchasePriceInrPaise" INTEGER NOT NULL DEFAULT 0,
    "inventoryPurchased" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "imagePath" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "featuredOnHomepage" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Book" ("author", "createdAt", "description", "id", "imagePath", "inventoryPurchased", "priceInrPaise", "published", "purchasePriceInrPaise", "status", "title", "updatedAt") SELECT "author", "createdAt", "description", "id", "imagePath", "inventoryPurchased", "priceInrPaise", "published", "purchasePriceInrPaise", "status", "title", "updatedAt" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE INDEX "Book_status_idx" ON "Book"("status");
CREATE INDEX "Book_published_status_idx" ON "Book"("published", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
