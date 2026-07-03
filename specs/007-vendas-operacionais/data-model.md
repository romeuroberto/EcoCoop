# Data Model: Vendas Operacionais (007)

## New Prisma Enums

```prisma
enum SaleStatus {
  PENDENTE_ENTREGA
  ENTREGUE
  CANCELADA
}

enum AccountReceivableStatus {
  A_RECEBER
  CANCELADA
}
```

## Extended Enum

`ReadyStockEventType` gains two new values:

```prisma
enum ReadyStockEventType {
  TRIAGEM_OUTPUT   // existing
  AJUSTE           // existing
  ESTORNO          // existing
  VENDA            // NEW — negative quantity, debits stock on sale creation
  ESTORNO_VENDA    // NEW — positive quantity, credits stock on sale cancellation
}
```

---

## New Models

### Sale

Header of a sale transaction.

```prisma
model Sale {
  id              String      @id @default(uuid())
  buyerId         String
  buyer           Buyer       @relation(fields: [buyerId], references: [id])
  status          SaleStatus  @default(PENDENTE_ENTREGA)
  totalAmount     Decimal     @db.Decimal(14, 2)
  notes           String?
  deliveredAt     DateTime?
  deliveredById   String?
  deliveredBy     User?       @relation("SaleDeliveredBy", fields: [deliveredById], references: [id])
  cancelReason    String?
  cancelledAt     DateTime?
  cancelledById   String?
  cancelledBy     User?       @relation("SaleCancelledBy", fields: [cancelledById], references: [id])
  userId          String
  user            User        @relation("SaleCreatedBy", fields: [userId], references: [id])
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  items              SaleItem[]
  readyStockEvents   ReadyStockEvent[]    @relation("SaleReadyEvents")
  accountReceivable  AccountReceivable?

  @@index([buyerId])
  @@index([status])
  @@index([createdAt])
  @@index([userId])
}
```

### SaleItem

One line per material in the sale.

```prisma
model SaleItem {
  id            String              @id @default(uuid())
  saleId        String
  sale          Sale                @relation(fields: [saleId], references: [id], onDelete: Cascade)
  subcategoryId String
  subcategory   MaterialSubcategory @relation("SaleItemSubcategory", fields: [subcategoryId], references: [id])
  unitId        String
  unit          UnitOfMeasure       @relation("SaleItemUnit", fields: [unitId], references: [id])
  quantity      Decimal             @db.Decimal(12, 3)
  unitPrice     Decimal             @db.Decimal(14, 4)
  subtotal      Decimal             @db.Decimal(14, 2)
  createdAt     DateTime            @default(now())

  readyStockEvent ReadyStockEvent?  @relation("SaleItemReadyEvent")

  @@index([saleId])
  @@index([subcategoryId, unitId])
}
```

### AccountReceivable

Minimal financial stub linked to a sale.

```prisma
model AccountReceivable {
  id        String                  @id @default(uuid())
  saleId    String                  @unique
  sale      Sale                    @relation(fields: [saleId], references: [id])
  buyerId   String
  buyer     Buyer                   @relation("BuyerReceivables", fields: [buyerId], references: [id])
  amount    Decimal                 @db.Decimal(14, 2)
  dueDate   DateTime                @db.Date
  status    AccountReceivableStatus @default(A_RECEBER)
  createdAt DateTime                @default(now())
  updatedAt DateTime                @updatedAt

  @@index([buyerId])
  @@index([status])
  @@index([dueDate])
}
```

---

## ReadyStockEvent — new FK

Add `saleItemId` and `saleId` to `ReadyStockEvent` (optional FKs, nullable):

```prisma
// Added to existing ReadyStockEvent model:
saleId     String?
sale       Sale?       @relation("SaleReadyEvents", fields: [saleId], references: [id])
saleItemId String?     @unique
saleItem   SaleItem?   @relation("SaleItemReadyEvent", fields: [saleItemId], references: [id])
```

---

## User model — new relations

```prisma
// Added to User model:
salesCreated    Sale[]  @relation("SaleCreatedBy")
salesDelivered  Sale[]  @relation("SaleDeliveredBy")
salesCancelled  Sale[]  @relation("SaleCancelledBy")
```

---

## Buyer model — new relations

```prisma
// Added to Buyer model:
sales             Sale[]
accountsReceivable AccountReceivable[] @relation("BuyerReceivables")
```

---

## MaterialSubcategory model — new relation

```prisma
// Added to MaterialSubcategory model:
saleItems SaleItem[] @relation("SaleItemSubcategory")
```

---

## UnitOfMeasure model — new relation

```prisma
// Added to UnitOfMeasure model:
saleItems SaleItem[] @relation("SaleItemUnit")
```

---

## State Transitions

```
SaleStatus:
  PENDENTE_ENTREGA ──[confirm delivery]──► ENTREGUE
  PENDENTE_ENTREGA ──[cancel]─────────────► CANCELADA
  ENTREGUE         ──(terminal, no transitions)
  CANCELADA        ──(terminal, no transitions)

AccountReceivableStatus:
  A_RECEBER ──[sale cancelled]──► CANCELADA
  A_RECEBER ──[payment received]──► (future financial module)
```

---

## Balance Calculation

Ready stock balance for a given (subcategoryId, unitId):

```
SUM(readyStockEvents.quantity WHERE subcategoryId = X AND unitId = Y)
```

VENDA events carry **negative** quantity; ESTORNO_VENDA carry **positive** quantity.
The same aggregate query used by the existing ReadyStock service remains authoritative.

---

## Key Validation Rules

- `SaleItem.quantity` must be > 0
- `SaleItem.unitPrice` must be ≥ 0 (zero allowed for donations)
- `SaleItem.subtotal` = `quantity × unitPrice` (computed server-side)
- `Sale.totalAmount` = `SUM(items.subtotal)` (computed server-side)
- Ready stock balance check per item must pass inside a single transaction before any event is created
- Sale can only be delivered when status = PENDENTE_ENTREGA
- Sale can only be cancelled when status = PENDENTE_ENTREGA
- Buyer must be active (`isActive = true`)
