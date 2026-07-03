-- AlterEnum
ALTER TYPE "ReadyStockEventType" ADD VALUE 'VENDA';
ALTER TYPE "ReadyStockEventType" ADD VALUE 'ESTORNO_VENDA';

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PENDENTE_ENTREGA', 'ENTREGUE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "AccountReceivableStatus" AS ENUM ('A_RECEBER', 'CANCELADA');

-- AlterTable
ALTER TABLE "ReadyStockEvent" ADD COLUMN "saleId" TEXT;
ALTER TABLE "ReadyStockEvent" ADD COLUMN "saleItemId" TEXT;

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'PENDENTE_ENTREGA',
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "deliveredById" TEXT,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountReceivable" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "AccountReceivableStatus" NOT NULL DEFAULT 'A_RECEBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountReceivable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_buyerId_idx" ON "Sale"("buyerId");

-- CreateIndex
CREATE INDEX "Sale_status_idx" ON "Sale"("status");

-- CreateIndex
CREATE INDEX "Sale_createdAt_idx" ON "Sale"("createdAt");

-- CreateIndex
CREATE INDEX "Sale_userId_idx" ON "Sale"("userId");

-- CreateIndex
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleItem_subcategoryId_unitId_idx" ON "SaleItem"("subcategoryId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountReceivable_saleId_key" ON "AccountReceivable"("saleId");

-- CreateIndex
CREATE INDEX "AccountReceivable_buyerId_idx" ON "AccountReceivable"("buyerId");

-- CreateIndex
CREATE INDEX "AccountReceivable_status_idx" ON "AccountReceivable"("status");

-- CreateIndex
CREATE INDEX "AccountReceivable_dueDate_idx" ON "AccountReceivable"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReadyStockEvent_saleItemId_key" ON "ReadyStockEvent"("saleItemId");

-- CreateIndex
CREATE INDEX "ReadyStockEvent_saleId_idx" ON "ReadyStockEvent"("saleId");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MaterialSubcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountReceivable" ADD CONSTRAINT "AccountReceivable_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockEvent" ADD CONSTRAINT "ReadyStockEvent_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadyStockEvent" ADD CONSTRAINT "ReadyStockEvent_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
