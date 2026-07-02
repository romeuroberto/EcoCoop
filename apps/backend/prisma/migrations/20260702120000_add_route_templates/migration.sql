-- CreateEnum
CREATE TYPE "TemplateStatus" AS ENUM ('ATIVO', 'INATIVO');

-- AlterTable
ALTER TABLE "CooperativeSettings" ADD COLUMN "occurrenceHorizonWeeks" INTEGER NOT NULL DEFAULT 4;

-- AlterTable
ALTER TABLE "CollectionRoute" ADD COLUMN "templateId" TEXT,
ADD COLUMN "isException" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RouteTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recurrenceDays" INTEGER[],
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" "TemplateStatus" NOT NULL DEFAULT 'ATIVO',
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteTemplatePoint" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "collectionPointId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouteTemplatePoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouteTemplate_status_idx" ON "RouteTemplate"("status");

-- CreateIndex
CREATE INDEX "RouteTemplatePoint_templateId_sequence_idx" ON "RouteTemplatePoint"("templateId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "RouteTemplatePoint_templateId_collectionPointId_key" ON "RouteTemplatePoint"("templateId", "collectionPointId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteTemplatePoint_templateId_sequence_key" ON "RouteTemplatePoint"("templateId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRoute_templateId_plannedDate_key" ON "CollectionRoute"("templateId", "plannedDate");

-- CreateIndex
CREATE INDEX "CollectionRoute_templateId_idx" ON "CollectionRoute"("templateId");

-- AddForeignKey
ALTER TABLE "RouteTemplate" ADD CONSTRAINT "RouteTemplate_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTemplate" ADD CONSTRAINT "RouteTemplate_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTemplatePoint" ADD CONSTRAINT "RouteTemplatePoint_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RouteTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTemplatePoint" ADD CONSTRAINT "RouteTemplatePoint_collectionPointId_fkey" FOREIGN KEY ("collectionPointId") REFERENCES "CollectionPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRoute" ADD CONSTRAINT "CollectionRoute_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "RouteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
