# ADR-007: Vendas Operacionais

**Status**: Accepted  
**Date**: 2026-07-03  
**Feature**: `007-vendas-operacionais`  
**Spec**: `specs/007-vendas-operacionais/spec.md`

---

## Context

The cooperative needs to record sales of ready material to buyers, consuming ready-stock
inventory, confirming physical delivery, and cancelling sales with stock reversal. A minimal
financial stub (AccountReceivable) must be created automatically alongside each sale to
bridge the operational and financial modules.

---

## Decisions

### 1. Separate `sales` and `accounts-receivable` NestJS modules

**Decision**: Two distinct NestJS modules — `SalesModule` and `AccountsReceivableModule` — each with
its own controller, service, and permission scope.

**Alternatives considered**:
- Single module combining sales and AR logic: rejected because AR will eventually grow into a
  full financial module; keeping it separate now prevents future forced refactoring.

**Consequences**:
- Clear separation of concerns from day one.
- `ACCOUNTS_RECEIVABLE/READ` is a distinct permission from `SALES/READ`, allowing future
  independent access control for finance staff without exposing all sales data.

---

### 2. `AccountReceivable` as a minimal financial stub

**Decision**: `AccountReceivable` stores `amount`, `dueDate`, `status` (A_RECEBER | CANCELADA),
and a FK to `Sale`. Payment, reconciliation, and bank entries belong to a future financial module.

**Alternatives considered**:
- Full financial flow in this feature: rejected, out of scope per spec.

**Consequences**:
- AR is created atomically with the sale in the same Prisma `$transaction`.
- AR status transitions are driven by sale events only: created → A_RECEBER on sale registration;
  CANCELADA on sale cancellation. Delivery does not change the AR status.
- A future financial module can extend AR with payment and reconciliation without modifying
  the sales domain.

---

### 3. Timeline derived from Sale fields — no dedicated event table

**Decision**: `GET /sales/:id` returns a `timeline` array constructed from existing `Sale` fields
(`createdAt/user`, `deliveredAt/deliveredBy`, `cancelledAt/cancelledBy`). No new `SaleEvent`
table is introduced.

**Alternatives considered**:
- Separate `SaleEvent` table: would add a join and extra writes for every state change. Given
  only three state transitions exist (create, deliver, cancel), the overhead is unwarranted.

**Consequences**:
- Timeline is deterministic and does not require additional storage.
- Adding a fourth state transition in the future will require either adding more nullable fields
  to `Sale` or introducing a proper event table at that point.

---

### 4. Stock consumed via `ReadyStockEvent(VENDA)` — never direct balance mutation

**Decision**: Stock debit on sale creation uses `ReadyStockEvent { type: VENDA, quantity: negative }`.
Stock credit on cancellation uses `ReadyStockEvent { type: ESTORNO_VENDA, quantity: positive }`.
Both within the same Prisma `$transaction` as the sale/cancellation mutation.

**Rationale**: Aligns with Constitution Principle IV (Imutabilidade do Estoque por Evento).
Enables full stock history reconstruction at any point in time.

**Consequences**:
- Balance is computed via `aggregate(_sum: { quantity })` on `ReadyStockEvent` per
  `(subcategoryId, unitId)`.
- Stock check (balance ≥ requested) is performed inside the transaction to prevent race conditions.

---

### 5. Cancel endpoint: `PATCH /sales/:id/cancel` (not DELETE)

**Decision**: Cancellation is a logical state change — the `Sale` record persists with
`status = CANCELADA`. The HTTP verb used is `PATCH /sales/:id/cancel`.

**Alternatives considered**:
- `DELETE /sales/:id`: semantically incorrect — REST DELETE implies resource removal. Clients
  may skip reading the body on DELETE, causing loss of the cancellation response.

**Consequences**:
- Cancellation is idempotency-unsafe by design (a CANCELADA sale cannot be cancelled again).
- The `cancelReason` is required and validated server-side (422 if blank).

---

### 6. `unitId` must match `MaterialSubcategory.defaultUnitId`

**Decision**: `SalesService.create()` validates that each `SaleItem.unitId` matches the
`defaultUnitId` of the referenced `MaterialSubcategory`. A mismatch returns 422 `UNIT_MISMATCH`.

**Rationale**: The spec assumption explicitly states that unit conversion is out of scope.
Accepting an incompatible unit silently would produce incorrect stock aggregations.

**Consequences**:
- The API rejects sales with mismatched units with an explicit error including `subcategoryId`
  and `expectedUnitId`.
- Future unit conversion support can be introduced without removing this guard — just relaxing
  or extending the validation rule.

---

### 7. Zero-price items allowed with `ZERO_PRICE_ITEM` warning

**Decision**: `unitPrice = 0` is valid (donation/zero-cost transfer). The service returns
`warnings: ['ZERO_PRICE_ITEM']` in the `POST /sales` response when any item has `unitPrice = 0`.

**Rationale**: The cooperative may transfer material at no cost. Blocking zero prices would
prevent legitimate operations. The warning informs the UI to surface a non-blocking alert.

**Consequences**:
- `warnings` is always present in the create-sale response (empty array when no warnings).
- Blocking zero-price sales must be implemented as a separate configuration option if required.
