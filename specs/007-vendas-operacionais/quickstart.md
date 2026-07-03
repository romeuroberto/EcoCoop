# Quickstart Validation: Vendas Operacionais (007)

This guide describes runnable scenarios to validate the feature end-to-end.
See [data-model.md](data-model.md) for schema details and [contracts/api.md](contracts/api.md) for full request/response shapes.

## Prerequisites

- Backend running locally (or test DB spun up via `npm run test` in `apps/backend`)
- At least one active Buyer in the DB
- At least one active MaterialSubcategory + UnitOfMeasure in the DB
- Ready stock balance > 0 for at least one subcategory/unit pair (run a SortingOperation first)
- A user with MANAGER or ADMIN profile (token available)

---

## Scenario 1: Register a sale successfully

**Goal**: Confirm that a sale consumes ready stock and creates an AccountReceivable.

1. Check current ready stock balance for PET:
   ```
   GET /api/v1/ready-stock/balance
   ```
   Note the balance for the PET subcategory (e.g. 200 kg).

2. Register the sale:
   ```
   POST /api/v1/sales
   Body: { buyerId, items: [{ subcategoryId, unitId, quantity: 50, unitPrice: 2.50 }] }
   ```
   **Expect**: 201 with `status: "PENDENTE_ENTREGA"`, `totalAmount: "125.00"`, `accountReceivable.status: "A_RECEBER"`.

3. Verify ready stock decreased:
   ```
   GET /api/v1/ready-stock/balance
   ```
   **Expect**: PET balance is now 150 kg (200 − 50).

4. Verify movement appears in ready stock history with type `VENDA`:
   ```
   GET /api/v1/ready-stock/movements?type=VENDA
   ```
   **Expect**: one entry referencing the sale.

---

## Scenario 2: Block sale with insufficient stock

**Goal**: Confirm that a sale above available balance is rejected atomically.

1. Attempt to sell more than the available balance:
   ```
   POST /api/v1/sales
   Body: { buyerId, items: [{ subcategoryId, unitId, quantity: 9999, unitPrice: 1 }] }
   ```
   **Expect**: 409 with code `INSUFFICIENT_READY_STOCK`. Ready stock balance unchanged.

---

## Scenario 3: Confirm delivery

**Goal**: Transition sale to ENTREGUE.

1. Use the sale `id` from Scenario 1:
   ```
   PATCH /api/v1/sales/:id/deliver
   Body: {} (or { deliveredAt: "2026-07-04T14:00:00Z" })
   ```
   **Expect**: 200 with `status: "ENTREGUE"`, `deliveredAt` set.

2. Attempt to deliver again:
   ```
   PATCH /api/v1/sales/:id/deliver
   ```
   **Expect**: 409 `SALE_NOT_DELIVERABLE`.

---

## Scenario 4: Cancel sale and verify stock reversal

**Goal**: Confirm that cancellation restores ready stock.

1. Register a new sale (same buyer, same material, quantity 30):
   ```
   POST /api/v1/sales  →  note sale id
   ```

2. Cancel it:
   ```
   DELETE /api/v1/sales/:id
   Body: { cancelReason: "Teste de cancelamento" }
   ```
   **Expect**: 200 with `status: "CANCELADA"`, `cancelReason` set.
   Account receivable status must be `CANCELADA`.

3. Verify ready stock restored:
   ```
   GET /api/v1/ready-stock/balance
   ```
   **Expect**: balance is back to what it was before the sale (net effect = 0).

4. Attempt to cancel the already-cancelled sale:
   ```
   DELETE /api/v1/sales/:id
   Body: { cancelReason: "Twice" }
   ```
   **Expect**: 409 `SALE_NOT_CANCELLABLE`.

---

## Scenario 5: RBAC — sorter cannot create or cancel

**Goal**: Confirm that SORTER profile is blocked from write actions.

1. Login as a user with SORTER profile → get token.

2. Attempt to create a sale:
   ```
   POST /api/v1/sales  (with sorter token)
   ```
   **Expect**: 403.

3. Attempt to cancel a sale:
   ```
   DELETE /api/v1/sales/:id  (with sorter token)
   ```
   **Expect**: 403.

4. List sales as sorter:
   ```
   GET /api/v1/sales  (with sorter token)
   ```
   **Expect**: 200 (READ is allowed).

---

## Scenario 6: Inactive buyer blocked

**Goal**: Confirm that a sale cannot be registered for an inactive buyer.

1. Mark a buyer as inactive (directly in DB or via buyers endpoint).

2. Attempt to register a sale for that buyer:
   ```
   POST /api/v1/sales
   Body: { buyerId: <inactive>, items: [...] }
   ```
   **Expect**: 409 `BUYER_INACTIVE`.

---

## Integration Test Command

```bash
cd apps/backend && npm test -- --testPathPattern=sales
```

Tests live at: `apps/backend/test/integration/sales.spec.ts`

---

## Frontend Validation

1. Start dev server: `npm run dev` from repo root.
2. Login as MANAGER.
3. Navigate to Vendas → verify empty state.
4. Click "Nova Venda" → select buyer, add item (PET, 50 kg, R$ 2,50/kg) → confirm.
5. Verify sale appears in list with status "Pendente de Entrega".
6. Open sale detail → click "Confirmar Entrega" → verify status changes to "Entregue".
7. Create another sale → click "Cancelar" with reason → verify status "Cancelada" and stock restored.
8. Login as SORTER → verify no "Nova Venda" button visible and create action returns 403.

---

## Validation Result — 2026-07-03

Backend local validado em `http://127.0.0.1:3002/api/v1` após build da aplicação.

- Scenario 1: PASS — venda registrada, estoque reduzido e AccountReceivable criada com status A_RECEBER.
- Scenario 2: PASS — venda acima do saldo bloqueada com 409 INSUFFICIENT_READY_STOCK e saldo preservado.
- Scenario 3: PASS — entrega confirmada com status ENTREGUE; segunda confirmação bloqueada com 409 SALE_NOT_DELIVERABLE.
- Scenario 4: PASS — cancelamento marcou venda como CANCELADA, estornou estoque, cancelou AccountReceivable e bloqueou segundo cancelamento com 409 SALE_NOT_CANCELLABLE.
- Scenario 5: PASS — SORTER conseguiu listar vendas e recebeu 403 em criação/cancelamento.
- Scenario 6: PASS — comprador inativo bloqueado com 409 BUYER_INACTIVE.
