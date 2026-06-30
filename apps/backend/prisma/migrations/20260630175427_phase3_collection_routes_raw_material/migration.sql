-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "RawMaterialStockEventType" AS ENUM ('ENTRADA_BRUTO', 'ESTORNO_BRUTO');

-- CreateTable
CREATE TABLE "CollectionPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationPending" BOOLEAN NOT NULL DEFAULT true,
    "reference" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRoute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plannedDate" DATE NOT NULL,
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANEJADA',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutePoint" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "collectionPointId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoutePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteTeamMember" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RouteTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMaterialEntry" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitId" TEXT NOT NULL,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawMaterialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawMaterialStockEvent" (
    "id" TEXT NOT NULL,
    "type" "RawMaterialStockEventType" NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "rawMaterialEntryId" TEXT,
    "referencedEventId" TEXT,
    "justification" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawMaterialStockEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionPoint_isActive_idx" ON "CollectionPoint"("isActive");

-- CreateIndex
CREATE INDEX "CollectionPoint_name_idx" ON "CollectionPoint"("name");

-- CreateIndex
CREATE INDEX "CollectionRoute_status_idx" ON "CollectionRoute"("status");

-- CreateIndex
CREATE INDEX "CollectionRoute_driverId_idx" ON "CollectionRoute"("driverId");

-- CreateIndex
CREATE INDEX "CollectionRoute_plannedDate_idx" ON "CollectionRoute"("plannedDate");

-- CreateIndex
CREATE INDEX "RoutePoint_routeId_sequence_idx" ON "RoutePoint"("routeId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "RoutePoint_routeId_collectionPointId_key" ON "RoutePoint"("routeId", "collectionPointId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutePoint_routeId_sequence_key" ON "RoutePoint"("routeId", "sequence");

-- CreateIndex
CREATE INDEX "RouteTeamMember_routeId_idx" ON "RouteTeamMember"("routeId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteTeamMember_routeId_userId_key" ON "RouteTeamMember"("routeId", "userId");

-- CreateIndex
CREATE INDEX "RawMaterialEntry_routeId_idx" ON "RawMaterialEntry"("routeId");

-- CreateIndex
CREATE INDEX "RawMaterialEntry_subcategoryId_unitId_idx" ON "RawMaterialEntry"("subcategoryId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "RawMaterialStockEvent_rawMaterialEntryId_key" ON "RawMaterialStockEvent"("rawMaterialEntryId");

-- CreateIndex
CREATE INDEX "RawMaterialStockEvent_subcategoryId_unitId_idx" ON "RawMaterialStockEvent"("subcategoryId", "unitId");

-- CreateIndex
CREATE INDEX "RawMaterialStockEvent_type_idx" ON "RawMaterialStockEvent"("type");

-- CreateIndex
CREATE INDEX "RawMaterialStockEvent_rawMaterialEntryId_idx" ON "RawMaterialStockEvent"("rawMaterialEntryId");

-- AddForeignKey
ALTER TABLE "CollectionRoute" ADD CONSTRAINT "CollectionRoute_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRoute" ADD CONSTRAINT "CollectionRoute_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePoint" ADD CONSTRAINT "RoutePoint_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "CollectionRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutePoint" ADD CONSTRAINT "RoutePoint_collectionPointId_fkey" FOREIGN KEY ("collectionPointId") REFERENCES "CollectionPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTeamMember" ADD CONSTRAINT "RouteTeamMember_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "CollectionRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteTeamMember" ADD CONSTRAINT "RouteTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialEntry" ADD CONSTRAINT "RawMaterialEntry_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "CollectionRoute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialEntry" ADD CONSTRAINT "RawMaterialEntry_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MaterialSubcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialEntry" ADD CONSTRAINT "RawMaterialEntry_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialEntry" ADD CONSTRAINT "RawMaterialEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialStockEvent" ADD CONSTRAINT "RawMaterialStockEvent_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "MaterialSubcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialStockEvent" ADD CONSTRAINT "RawMaterialStockEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialStockEvent" ADD CONSTRAINT "RawMaterialStockEvent_rawMaterialEntryId_fkey" FOREIGN KEY ("rawMaterialEntryId") REFERENCES "RawMaterialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialStockEvent" ADD CONSTRAINT "RawMaterialStockEvent_referencedEventId_fkey" FOREIGN KEY ("referencedEventId") REFERENCES "RawMaterialStockEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawMaterialStockEvent" ADD CONSTRAINT "RawMaterialStockEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
