-- CreateTable
CREATE TABLE "SheetSyncIssue" (
    "id" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "action" JSONB NOT NULL,
    "error" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'failed',
    "dedupeKey" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SheetSyncIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SheetSyncIssue_sheetName_idx" ON "SheetSyncIssue"("sheetName");

-- CreateIndex
CREATE INDEX "SheetSyncIssue_status_idx" ON "SheetSyncIssue"("status");

-- CreateIndex
CREATE INDEX "SheetSyncIssue_dedupeKey_idx" ON "SheetSyncIssue"("dedupeKey");
