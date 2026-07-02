-- CreateEnum
CREATE TYPE "SortingOperationStatus" AS ENUM ('CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "SortingRejectType" AS ENUM ('REJEITO', 'PERDA', 'PERDA_INERENTE');

-- CreateEnum
CREATE TYPE "ReadyStockEventType" AS ENUM ('TRIAGEM_OUTPUT', 'AJUSTE', 'ESTORNO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RawMaterialStockEventType" ADD VALUE 'SAIDA_TRIAGEM';
ALTER TYPE "RawMaterialStockEventType" ADD VALUE 'ESTORNO_TRIAGEM';

-- AlterTable
ALTER TABLE "RawMaterialStockEvent" ADD COLUMN     "sortingOperationId" TEXT;

-- CreateTable
CREATE TABLE "SortingOperation" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "processedQuantity" DECIMAL(12,3) NOT NULL,
    "status" "SortingOperationStatus" NOT NULL DEFAULT 'CONCLUIDA',
    "cancelReason" TEXT,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SortingOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SortingOutput" (
    "id" TEXT NOT NULL,
    "sortingOperationId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SortingOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SortingReject" (
    "id" TEXT NOT NULL,
    "sortingOperationId" TEXT NOT NULL,
    "type" "SortingRejectType" NOT NULL,
    "subcategoryId" TEXT,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "description" TEXT,

    CONSTRAINT "SortingReject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadyStockEvent" (
    "id" TEXT NOT NULL,
    "type" "ReadyStockEventType" NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "sortingOperationId" TEXT,
    "sortingOutputId" TEXT,
    "adjustmentId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadyStockEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadyStockAdjustment" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "justification" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadyStockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SortingOperation_subcategoryId_unitId_idx" ON "SortingOperation"("subcategoryId", "unitId");

-- CreateIndex
CREATE INDEX "SortingOperation_status_idx" ON "SortingOperation"("status");

-- CreateIndex
CREATE INDEX "SortingOperation_userId_idx" ON "SortingOperation"("userId");

-- CreateIndex
CREATE INDEX "SortingOperation_createdAt_idx" ON "SortingOperation"("createdAt");

-- CreateIndex
CREATE INDEX "SortingOutput_sortingOperationId_idx" ON "SortingOutput"("sortingOperationId");

-- CreateIndex
CREATE INDEX "SortingOutput_subcategoryId_unitId_idx" ON "SortingOutput"("subcategoryId", "unitId");

-- CreateIndex
CREATE INDEX "SortingReject_sortingOperationId_idx" ON "SortingReject"("sortingOperationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadyStockEvent_sortingOutputId_key" ON "ReadyStockEvent"("sortingOutputId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadyStockEvent_adjustmentId_key" ON "ReadyStockEvent"("adjustmentId");

-- CreateIndex
CREATE INDEX "ReadyStockEvent_subcategoryId_unitId_idx" ON "ReadyStockEvent"("subcategoryId", "unitId");

-- CreateIndex
CREATE INDEX "ReadyStockEvent_type_idx" ON "ReadyStockEvent"("type");

-- CreateIndex
CREATE INDEX "ReadyStockEvent_sortingOperationId_idx" ON "ReadyStockEvent"("sortingOperationId");

-- CreateIndex
CREATE INDEX "ReadyStockEvent_createdAt_idx" ON "ReadyStockEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ReadyStockAdjustment_subcategoryId_unitId_idx" ON "ReadyStockAdjustment"("subcategoryId", "unitId");

-- CreateIndex
CREATE INDEX "ReadyStockAdjustment_userId_idx" ON "ReadyStockAdjustment"("userId");

-- CreateIndex
CREATE INDEX "ReadyStockAdjustment_createdAt_idx" ON "ReadyStockAdjustment"("createdAt");

-- CreateIndex
CREATE INDEX "RawMaterialStockEvent_sortingOperationId_idx" ON "RawMaterialStockEvent"("sortingOperationId");

-- AddForeignKey
ALTER TABLE "RawMaterialStockEvent" ADD CONSTRAINT "RawMaterialStockEvent_sortingOperationId_fkey" FOREIGN KEY ("sortingOperationId") REFERENCES "SortingOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingOperation" ADD CONSTRAINT "SortingOperation_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MaterialSubcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingOperation" ADD CONSTRAINT "SortingOperation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingOperation" ADD CONSTRAINT "SortingOperation_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingOperation" ADD CONSTRAINT "SortingOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingOutput" ADD CONSTRAINT "SortingOutput_sortingOperationId_fkey" FOREIGN KEY ("sortingOperationId") REFERENCES "SortingOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingOutput" ADD CONSTRAINT "SortingOutput_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MaterialSubcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingOutput" ADD CONSTRAINT "SortingOutput_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingReject" ADD CONSTRAINT "SortingReject_sortingOperationId_fkey" FOREIGN KEY ("sortingOperationId") REFERENCES "SortingOperation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingReject" ADD CONSTRAINT "SortingReject_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MaterialSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SortingReject" ADD CONSTRAINT "SortingReject_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockEvent" ADD CONSTRAINT "ReadyStockEvent_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MaterialSubcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockEvent" ADD CONSTRAINT "ReadyStockEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockEvent" ADD CONSTRAINT "ReadyStockEvent_sortingOperationId_fkey" FOREIGN KEY ("sortingOperationId") REFERENCES "SortingOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockEvent" ADD CONSTRAINT "ReadyStockEvent_sortingOutputId_fkey" FOREIGN KEY ("sortingOutputId") REFERENCES "SortingOutput"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockEvent" ADD CONSTRAINT "ReadyStockEvent_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "ReadyStockAdjustment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockEvent" ADD CONSTRAINT "ReadyStockEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockAdjustment" ADD CONSTRAINT "ReadyStockAdjustment_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MaterialSubcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockAdjustment" ADD CONSTRAINT "ReadyStockAdjustment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockAdjustment" ADD CONSTRAINT "ReadyStockAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
