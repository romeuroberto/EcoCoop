-- AddUniqueConstraint
ALTER TABLE "RawMaterialStockEvent" ADD CONSTRAINT "RawMaterialStockEvent_referencedEventId_key" UNIQUE ("referencedEventId");
