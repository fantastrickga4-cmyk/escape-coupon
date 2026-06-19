-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN "benefitOverride" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "excludeTheme" TEXT;
ALTER TABLE "Coupon" ADD COLUMN "redeemedPeople" INTEGER;
ALTER TABLE "Coupon" ADD COLUMN "redeemedTheme" TEXT;

-- CreateTable
CREATE TABLE "Theme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "referrerPhone" TEXT NOT NULL,
    "refereeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Referral_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "storeId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'normal',
    "expiresAt" DATETIME,
    "validDays" TEXT,
    "validFromHour" INTEGER,
    "validToHour" INTEGER,
    "minPeople" INTEGER NOT NULL DEFAULT 1,
    "reviewUrl" TEXT,
    "referrerReward" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Campaign" ("benefit", "createdAt", "expiresAt", "id", "name") SELECT "benefit", "createdAt", "expiresAt", "id", "name" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Theme_name_key" ON "Theme"("name");
