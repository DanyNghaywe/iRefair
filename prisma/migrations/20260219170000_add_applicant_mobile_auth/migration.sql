-- CreateTable
CREATE TABLE "ApplicantMobileSession" (
    "id" TEXT NOT NULL,
    "irain" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "refreshTokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "sessionExpiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApplicantMobileSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicantMobileSession_irain_idx" ON "ApplicantMobileSession"("irain");

-- CreateIndex
CREATE INDEX "ApplicantMobileSession_refreshTokenExpiresAt_idx" ON "ApplicantMobileSession"("refreshTokenExpiresAt");

-- CreateIndex
CREATE INDEX "ApplicantMobileSession_sessionExpiresAt_idx" ON "ApplicantMobileSession"("sessionExpiresAt");

-- CreateIndex
CREATE INDEX "ApplicantMobileSession_revokedAt_idx" ON "ApplicantMobileSession"("revokedAt");
