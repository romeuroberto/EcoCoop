-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TRUCK', 'VAN', 'PICKUP', 'MOTORCYCLE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CPF', 'CNPJ');

-- CreateTable
CREATE TABLE "MemberRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "admittedAt" TIMESTAMP(3) NOT NULL,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultUnitId" TEXT NOT NULL,
    "isSellable" BOOLEAN NOT NULL DEFAULT false,
    "acceptsStock" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "baseUnitId" TEXT,
    "conversionFactor" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "addressStreet" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressZip" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "type" "VehicleType" NOT NULL,
    "model" TEXT NOT NULL,
    "capacityValue" DECIMAL(65,30),
    "capacityUnitId" TEXT,
    "capacityNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpiType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultValidityDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpiType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberRole_name_key" ON "MemberRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Member_cpf_key" ON "Member"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE INDEX "Member_isActive_idx" ON "Member"("isActive");

-- CreateIndex
CREATE INDEX "Member_roleId_idx" ON "Member"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCategory_name_key" ON "MaterialCategory"("name");

-- CreateIndex
CREATE INDEX "MaterialSubcategory_categoryId_isActive_idx" ON "MaterialSubcategory"("categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialSubcategory_categoryId_name_key" ON "MaterialSubcategory"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_name_key" ON "UnitOfMeasure"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UnitOfMeasure_symbol_key" ON "UnitOfMeasure"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_documentNumber_key" ON "Buyer"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_userId_key" ON "Buyer"("userId");

-- CreateIndex
CREATE INDEX "Buyer_isActive_idx" ON "Buyer"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE UNIQUE INDEX "EpiType_name_key" ON "EpiType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_name_key" ON "CostCenter"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_code_key" ON "CostCenter"("code");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "MemberRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSubcategory" ADD CONSTRAINT "MaterialSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialSubcategory" ADD CONSTRAINT "MaterialSubcategory_defaultUnitId_fkey" FOREIGN KEY ("defaultUnitId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "UnitOfMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Buyer" ADD CONSTRAINT "Buyer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_capacityUnitId_fkey" FOREIGN KEY ("capacityUnitId") REFERENCES "UnitOfMeasure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
