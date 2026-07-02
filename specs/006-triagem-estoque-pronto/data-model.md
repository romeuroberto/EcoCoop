# Data Model: Triagem e Estoque Pronto

**Feature**: 006 — Triagem e Estoque Pronto
**Date**: 2026-07-02

---

## Alterações no schema.prisma existente

### 1. Enum `RawMaterialStockEventType` — adicionar 2 valores

```prisma
enum RawMaterialStockEventType {
  ENTRADA_BRUTO      // existente: entrada via RawMaterialEntry
  ESTORNO_BRUTO      // existente: reversão de ENTRADA_BRUTO
  SAIDA_TRIAGEM      // NOVO: desbite quando triagem é criada (quantidade negativa)
  ESTORNO_TRIAGEM    // NOVO: recrédito quando triagem é cancelada (quantidade positiva)
}
```

### 2. Relação bidirecional em `RawMaterialStockEvent`

Adicionar campo de referência à `SortingOperation` (FK nullable):

```prisma
model RawMaterialStockEvent {
  // ... campos existentes ...
  sortingOperationId  String?
  sortingOperation    SortingOperation? @relation("BrutoSortingEvents", fields: [sortingOperationId], references: [id])
}
```

---

## Novos enums

```prisma
enum SortingOperationStatus {
  CONCLUIDA
  CANCELADA
}

enum SortingRejectType {
  REJEITO          // material rejeitado por contaminação ou incompatibilidade
  PERDA            // perda operacional declarada pelo triador
  PERDA_INERENTE   // diferença automática: processedQuantity - SUM(outputs + rejects)
}

enum ReadyStockEventType {
  TRIAGEM_OUTPUT   // crédito gerado por SortingOutput
  AJUSTE           // débito ou crédito por ReadyStockAdjustment (quantidade assinada)
  ESTORNO          // débito gerado por cancelamento de SortingOperation
}
```

---

## Novos models

### SortingOperation (Triagem)

```prisma
model SortingOperation {
  id                String                 @id @default(uuid())
  subcategoryId     String                 // material bruto consumido
  subcategory       MaterialSubcategory    @relation("SortingOpSubcategory", fields: [subcategoryId], references: [id])
  unitId            String
  unit              UnitOfMeasure          @relation("SortingOpUnit", fields: [unitId], references: [id])
  processedQuantity Decimal                @db.Decimal(12, 3)
  status            SortingOperationStatus @default(CONCLUIDA)
  cancelReason      String?
  cancelledById     String?
  cancelledBy       User?                  @relation("SortingCancelledBy", fields: [cancelledById], references: [id])
  cancelledAt       DateTime?
  userId            String
  user              User                   @relation("SortingOperationUser", fields: [userId], references: [id])
  createdAt         DateTime               @default(now())

  outputs           SortingOutput[]
  rejects           SortingReject[]
  rawStockEvents    RawMaterialStockEvent[] @relation("BrutoSortingEvents")
  readyStockEvents  ReadyStockEvent[]       @relation("SortingOpReadyEvents")

  @@index([subcategoryId, unitId])
  @@index([status])
  @@index([userId])
  @@index([createdAt])
}
```

**Validações de negócio:**
- `processedQuantity > 0`
- `processedQuantity <= saldo_bruto_disponível` (validado dentro do `$transaction`)
- `SUM(outputs.quantity) + SUM(rejects.quantity) <= processedQuantity`
- Diferença `processedQuantity - SUM(...)` → auto-registro de `SortingReject` tipo `PERDA_INERENTE`

**Transições de status:**
```
[criação] → CONCLUIDA
CONCLUIDA → CANCELADA  (com cancelReason obrigatório; se estorno não resultar em saldo negativo)
```

---

### SortingOutput (Material Pronto Gerado)

```prisma
model SortingOutput {
  id                  String             @id @default(uuid())
  sortingOperationId  String
  sortingOperation    SortingOperation   @relation(fields: [sortingOperationId], references: [id], onDelete: Cascade)
  subcategoryId       String             // material pronto produzido
  subcategory         MaterialSubcategory @relation("SortingOutputSubcategory", fields: [subcategoryId], references: [id])
  unitId              String
  unit                UnitOfMeasure      @relation("SortingOutputUnit", fields: [unitId], references: [id])
  quantity            Decimal            @db.Decimal(12, 3)
  createdAt           DateTime           @default(now())

  readyStockEvent     ReadyStockEvent?   @relation("OutputReadyEvent")

  @@index([sortingOperationId])
  @@index([subcategoryId, unitId])
}
```

**Validações:**
- `quantity > 0`
- Unidade deve ser a mesma do material bruto de origem (mesma `subcategory.defaultUnitId`)

---

### SortingReject (Rejeito / Perda)

```prisma
model SortingReject {
  id                  String             @id @default(uuid())
  sortingOperationId  String
  sortingOperation    SortingOperation   @relation(fields: [sortingOperationId], references: [id], onDelete: Cascade)
  type                SortingRejectType
  subcategoryId       String?            // FK opcional — null quando rejeito não tem subcategoria correspondente
  subcategory         MaterialSubcategory? @relation("SortingRejectSubcategory", fields: [subcategoryId], references: [id])
  unitId              String
  unit                UnitOfMeasure      @relation("SortingRejectUnit", fields: [unitId], references: [id])
  quantity            Decimal            @db.Decimal(12, 3)
  description         String?            // obrigatório quando subcategoryId é null; opcional quando tem FK

  @@index([sortingOperationId])
}
```

**Validações:**
- `quantity > 0`
- `description` obrigatório quando `subcategoryId` é null
- `type = PERDA_INERENTE` somente criado automaticamente pelo sistema (nunca pelo usuário diretamente)

---

### ReadyStockEvent (Movimentação de Estoque Pronto)

```prisma
model ReadyStockEvent {
  id                  String             @id @default(uuid())
  type                ReadyStockEventType
  subcategoryId       String
  subcategory         MaterialSubcategory @relation("ReadyStockEventSubcategory", fields: [subcategoryId], references: [id])
  unitId              String
  unit                UnitOfMeasure      @relation("ReadyStockEventUnit", fields: [unitId], references: [id])
  quantity            Decimal            @db.Decimal(12, 3)  // positivo = crédito; negativo = débito
  sortingOperationId  String?
  sortingOperation    SortingOperation?  @relation("SortingOpReadyEvents", fields: [sortingOperationId], references: [id])
  sortingOutputId     String?            @unique
  sortingOutput       SortingOutput?     @relation("OutputReadyEvent", fields: [sortingOutputId], references: [id])
  adjustmentId        String?            @unique
  adjustment          ReadyStockAdjustment? @relation(fields: [adjustmentId], references: [id])
  userId              String
  user                User               @relation("ReadyStockEventUser", fields: [userId], references: [id])
  createdAt           DateTime           @default(now())

  @@index([subcategoryId, unitId])
  @@index([type])
  @@index([sortingOperationId])
  @@index([createdAt])
}
```

**Invariantes:**
- Eventos são imutáveis — nenhum UPDATE ou DELETE permitido
- Para cada `SortingOutput` criado → 1 evento `TRIAGEM_OUTPUT` com `quantity = +SortingOutput.quantity`
- Para cada `ReadyStockAdjustment` → 1 evento `AJUSTE` com a quantidade assinada
- Para cada cancelamento de `SortingOperation` → N eventos `ESTORNO` (um por `SortingOutput`), cada um com `quantity = -SortingOutput.quantity`

**Cálculo de saldo:**
```sql
SELECT subcategoryId, unitId, SUM(quantity) AS balance
FROM ReadyStockEvent
GROUP BY subcategoryId, unitId
HAVING SUM(quantity) >= 0
```

---

### ReadyStockAdjustment (Ajuste Auditado de Estoque Pronto)

```prisma
model ReadyStockAdjustment {
  id            String          @id @default(uuid())
  subcategoryId String
  subcategory   MaterialSubcategory @relation("ReadyStockAdjustmentSubcategory", fields: [subcategoryId], references: [id])
  unitId        String
  unit          UnitOfMeasure   @relation("ReadyStockAdjustmentUnit", fields: [unitId], references: [id])
  quantity      Decimal         @db.Decimal(12, 3)   // positivo = entrada; negativo = saída
  justification String                                // obrigatório, não pode ser vazio
  userId        String
  user          User            @relation("ReadyStockAdjustmentUser", fields: [userId], references: [id])
  createdAt     DateTime        @default(now())

  stockEvent    ReadyStockEvent?  @relation()

  @@index([subcategoryId, unitId])
  @@index([userId])
  @@index([createdAt])
}
```

**Validações:**
- `quantity != 0`
- `justification` obrigatório e não vazio (`@IsNotEmpty()`)
- Se `quantity < 0`: `saldo_atual + quantity >= 0` (sem saldo negativo)

---

## Diagrama de relacionamentos

```
RawMaterialStockEvent ←── SAIDA_TRIAGEM ──┐
                                           │
MaterialSubcategory ─────────────────── SortingOperation ──── SortingOutput ──── ReadyStockEvent (TRIAGEM_OUTPUT)
         │                                     │                    │
         │                               SortingReject         ReadyStockEvent (ESTORNO, no cancel)
         │
         └── ReadyStockAdjustment ──── ReadyStockEvent (AJUSTE)
```

---

## Módulos de permissão RBAC

Novos módulos a registrar via seed/migration:

| Módulo | Actions | Perfis (via seed) |
|--------|---------|-------------------|
| `SORTING` | `READ`, `CREATE`, `CANCEL` | READ: SORTER, MANAGER, ADMIN / CREATE: SORTER, MANAGER, ADMIN / CANCEL: MANAGER, ADMIN |
| `READY_STOCK` | `READ`, `CREATE_ADJUSTMENT` | READ: SORTER, MANAGER, ADMIN / CREATE_ADJUSTMENT: MANAGER, ADMIN |
