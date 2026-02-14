-- CreateTable
CREATE TABLE "ReferrerMobileLoginToken" (
    "id" TEXT NOT NULL,
    "irref" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferrerMobileLoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferrerMobileSession" (
    "id" TEXT NOT NULL,
    "irref" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "sessionExpiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ReferrerMobileSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferrerMobileLoginToken_tokenHash_key" ON "ReferrerMobileLoginToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ReferrerMobileLoginToken_irref_idx" ON "ReferrerMobileLoginToken"("irref");

-- CreateIndex
CREATE INDEX "ReferrerMobileLoginToken_expiresAt_idx" ON "ReferrerMobileLoginToken"("expiresAt");

-- CreateIndex
CREATE INDEX "ReferrerMobileLoginToken_consumedAt_idx" ON "ReferrerMobileLoginToken"("consumedAt");

-- CreateIndex
CREATE INDEX "ReferrerMobileSession_irref_idx" ON "ReferrerMobileSession"("irref");

-- CreateIndex
CREATE INDEX "ReferrerMobileSession_refreshTokenExpiresAt_idx" ON "ReferrerMobileSession"("refreshTokenExpiresAt");

-- CreateIndex
CREATE INDEX "ReferrerMobileSession_sessionExpiresAt_idx" ON "ReferrerMobileSession"("sessionExpiresAt");

-- CreateIndex
CREATE INDEX "ReferrerMobileSession_revokedAt_idx" ON "ReferrerMobileSession"("revokedAt");
