-- CreateTable
CREATE TABLE "Sheet" (
    "name" TEXT NOT NULL,
    "headers" JSONB NOT NULL,
    "keyHeader" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sheet_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "SheetRow" (
    "sheetName" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "rowIndex" INTEGER,
    "values" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SheetRow_pkey" PRIMARY KEY ("sheetName","key")
);

-- CreateIndex
CREATE INDEX "SheetRow_sheetName_idx" ON "SheetRow"("sheetName");

-- CreateIndex
CREATE INDEX "SheetRow_sheetName_rowIndex_idx" ON "SheetRow"("sheetName", "rowIndex");

-- AddForeignKey
ALTER TABLE "SheetRow" ADD CONSTRAINT "SheetRow_sheetName_fkey" FOREIGN KEY ("sheetName") REFERENCES "Sheet"("name") ON DELETE CASCADE ON UPDATE CASCADE;
