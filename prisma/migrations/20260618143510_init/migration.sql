-- CreateTable
CREATE TABLE "Store" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "benefit" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "expiresAt" DATETIME,
    "redeemedAt" DATETIME,
    "storeId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Coupon_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Coupon_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Coupon_campaignId_idx" ON "Coupon"("campaignId");

-- CreateIndex
CREATE INDEX "Coupon_status_idx" ON "Coupon"("status");
