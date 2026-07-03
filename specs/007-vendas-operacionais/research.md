# Research: Vendas Operacionais (007)

## Tech Stack (confirmed from codebase)

- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + TypeScript + Vite + TanStack Query (`@tanstack/react-query`)
- **Testing**: Jest + Supertest integration tests against a real test DB (no mocking)
- **Auth/RBAC**: Cookie-based JWT, `@RequirePermission(module, action)` decorator, `AuditInterceptor` + `@AuditEntity(entityType)`

---

## Decision: Stock event model extension

**Decision**: Extend `ReadyStockEventType` enum with two new values: `VENDA` (negative quantity, debit) and `ESTORNO_VENDA` (positive quantity, credit on cancellation).

**Rationale**: The existing event-sourced pattern (signed `quantity` on `ReadyStockEvent`) is authoritative. Adding these two types keeps the model consistent with TRIAGEM_OUTPUT, AJUSTE, ESTORNO. No new stock table is needed.

**Alternatives considered**:
- Separate `SaleStockEvent` table — rejected: duplicates the event model, breaks the unified balance aggregate query.
- Direct balance field on Sale — rejected: violates the immutability principle (Constitution IV).

---

## Decision: Sale entity design

**Decision**: Two new tables — `Sale` (header: comprador, status, datas, totals) and `SaleItem` (lines: subcategory, unit, quantity, unitPrice, subtotal). Balance check and stock events are created inside a single Prisma `$transaction`.

**Rationale**: Mirrors the SortingOperation / SortingOutput pattern already in the codebase. The header-items split is the natural relational model for a multi-item sale.

**Alternatives considered**:
- Single flat JSON field for items — rejected: not queryable, breaks index on subcategory.

---

## Decision: Accounts Receivable — minimal stub

**Decision**: New table `AccountReceivable` with fields: `saleId` (unique FK), `buyerId`, `totalAmount`, `dueDate`, `status` (A_RECEBER | CANCELADA). Created automatically inside the sale creation transaction. No payment/reconciliation logic.

**Rationale**: Spec requires the link to exist for future financial module without implementing full financials. A minimal stub created atomically with the sale is the cleanest approach.

**Alternatives considered**:
- Create receivable as a separate async job — rejected: eventual consistency risk; if the job fails, the sale exists without a receivable.
- Embed receivable data on the Sale model — rejected: muddies the domain boundary between operational and financial.

---

## Decision: SaleStatus placement

**Decision**: New enum `SaleStatus` (PENDENTE_ENTREGA, ENTREGUE, CANCELADA) added to Prisma schema. Delivery confirmation via `PATCH /sales/:id/deliver` endpoint; cancellation via `DELETE /sales/:id`.

**Rationale**: Consistent with existing patterns: SortingOperationStatus is also an enum with CONCLUIDA/CANCELADA. PATCH for status transition is semantically cleaner than PUT.

---

## Decision: RBAC permissions

**Decision**: New RBAC module `SALES` with actions: `CREATE`, `READ`, `DELIVER`, `CANCEL`. Default permission assignments:
- ADMIN: all
- MANAGER: all
- SORTER: READ only
- DRIVER: READ only
- BUYER: (portal, out of scope for this feature)

**Rationale**: Consistent with existing ProfilePermission model. The seed must register these permissions on the default profiles.

---

## Decision: Frontend page structure

**Decision**: New page `SalesPage` with two tabs (Lista, Nova Venda). "Nova Venda" is a modal or sub-page with a buyer selector, dynamic item rows (material, quantity, unit, unit price), and a confirm button. Sale detail shows all items and a "Confirmar Entrega" / "Cancelar" action button based on status and permission.

**Rationale**: Mirrors the ReadyStock page + modal pattern. TanStack Query for data fetching, `useMutation` for write operations with optimistic invalidation.

---

## Decision: Default due date for AccountReceivable

**Decision**: 30 days from `Sale.createdAt`, hardcoded in the service for now. Future enhancement: make it configurable in CooperativeSettings.

**Rationale**: Spec says "30 days default"; CooperativeSettings extension is out of scope.

---

## Dependency map (existing entities reused)

| Entity | Where used |
|--------|-----------|
| `Buyer` | Sale.buyerId FK |
| `MaterialSubcategory` | SaleItem.subcategoryId FK |
| `UnitOfMeasure` | SaleItem.unitId FK |
| `ReadyStockEvent` | VENDA / ESTORNO_VENDA events |
| `User` | Sale.userId, Sale.deliveredById, Sale.cancelledById |
| `AuditLog` | via AuditInterceptor on controller |
