# Quickstart & Validation Guide: Triagem e Estoque Pronto

**Feature**: 006 — Triagem e Estoque Pronto
**Date**: 2026-07-02

---

## Pré-requisitos

- Backend rodando (`npm run start:dev` em `apps/backend`)
- Frontend rodando (`npm run dev` em `apps/frontend`)
- Banco populado com seed: ao menos 1 `MaterialSubcategory` com `acceptsStock=true`, 1 `UnitOfMeasure`, 1 usuário SORTER, 1 usuário MANAGER
- Saldo bruto disponível: ao menos 100 kg de PET (via registro de entrada bruta existente)

---

## Cenário 1 — Triagem válida (US-1)

**Objetivo**: Confirmar que triagem reduz saldo bruto e aumenta saldo pronto.

1. Autenticar como SORTER
2. `GET /raw-material-balance?subcategoryId=<PET>` → anotar saldo bruto inicial (ex: 100 kg)
3. `GET /ready-stock?subcategoryId=<PET Cristal>` → anotar saldo pronto inicial (ex: 0 kg)
4. `POST /sorting-operations` com:
   - `subcategoryId`: PET bruto
   - `processedQuantity`: 90
   - `outputs`: [{ PET Cristal, 80 kg }]
   - `rejects`: [{ REJEITO, 5 kg }]
5. **Validar**: resposta 201, `status: "CONCLUIDA"`, perda inerente de 5 kg auto-criada
6. `GET /raw-material-balance?subcategoryId=<PET>` → saldo deve ser inicial - 90 = 10 kg
7. `GET /ready-stock?subcategoryId=<PET Cristal>` → saldo deve ser 80 kg
8. `GET /ready-stock/movements?subcategoryId=<PET Cristal>` → ver 1 evento `TRIAGEM_OUTPUT`, 80 kg

**Critério de aceite**: Saldo bruto diminuiu 90 kg; saldo pronto aumentou 80 kg; perda inerente 5 kg registrada.

---

## Cenário 2 — Triagem rejeitada por saldo insuficiente (US-1)

**Objetivo**: Confirmar que a validação de saldo bloqueia a operação sem alterar saldos.

1. Autenticar como SORTER
2. Saldo bruto atual = 10 kg (após Cenário 1)
3. `POST /sorting-operations` com `processedQuantity: 50` (excede saldo)
4. **Validar**: resposta 409 com `code: "INSUFFICIENT_RAW_STOCK"`
5. `GET /raw-material-balance` → saldo bruto permanece 10 kg (não foi alterado)

---

## Cenário 3 — Triagem rejeitada por soma inconsistente (US-1)

**Objetivo**: Confirmar validação de consistência interna.

1. `POST /sorting-operations` com:
   - `processedQuantity`: 50
   - `outputs`: [{ 40 kg }]
   - `rejects`: [{ 20 kg }]  (40+20 = 60 > 50)
2. **Validar**: resposta 422 com `code: "OUTPUTS_SUM_EXCEEDS_PROCESSED"`
3. Nenhum saldo alterado

---

## Cenário 4 — Consultar estoque pronto (US-2)

**Objetivo**: Confirmar visibilidade do estoque e histórico.

1. Autenticar como MANAGER
2. `GET /ready-stock` → ver saldo de PET Cristal = 80 kg
3. `GET /ready-stock/movements?from=2026-07-01&to=2026-07-31` → ver evento TRIAGEM_OUTPUT
4. Filtrar por `type=AJUSTE` → lista vazia (nenhum ajuste ainda)

---

## Cenário 5 — Ajuste auditado (US-3)

**Objetivo**: Confirmar que ajuste requer justificativa e valida saldo negativo.

1. Autenticar como MANAGER
2. `POST /ready-stock-adjustments` **sem justificativa** → 422 `JUSTIFICATION_REQUIRED`
3. `POST /ready-stock-adjustments` com `quantity: -100` (excede saldo de 80 kg) → 409 `ADJUSTMENT_WOULD_CAUSE_NEGATIVE_BALANCE`
4. `POST /ready-stock-adjustments` com `quantity: -5, justification: "Material danificado"` → 201 Created
5. `GET /ready-stock?subcategoryId=<PET Cristal>` → saldo deve ser 75 kg
6. `GET /ready-stock/movements` → ver evento AJUSTE, -5 kg, com o gestor como responsável

---

## Cenário 6 — Cancelamento de triagem (US-4)

**Objetivo**: Confirmar estorno integral e validação de saldo.

1. Autenticar como MANAGER
2. `GET /sorting-operations/:id` → confirmar `status: "CONCLUIDA"` para a triagem do Cenário 1
3. `DELETE /sorting-operations/:id` com `cancelReason: "Erro de pesagem"` → 200 OK
4. `GET /ready-stock?subcategoryId=<PET Cristal>` → saldo deve ser 75 - 80 = negativo → **BLOQUEADO** (saldo já foi ajustado para 75, estorno de 80 não é possível)
5. **Validar**: resposta 409 `CANCELLATION_WOULD_CAUSE_NEGATIVE_READY_STOCK`

*Para validar cancelamento bem-sucedido: usar triagem com material que não teve ajustes.*

---

## Cenário 7 — Permissões (FR-017)

**Objetivo**: Confirmar que SORTER não pode cancelar nem ajustar.

1. Autenticar como SORTER
2. `DELETE /sorting-operations/:id` → 403 Forbidden
3. `POST /ready-stock-adjustments` → 403 Forbidden
4. `GET /ready-stock` → 200 OK (leitura é permitida)

---

## Testes de integração obrigatórios

Arquivo: `apps/backend/test/integration/sorting-operations.spec.ts`

- `POST /sorting-operations` com saldo suficiente → 201, saldos corretos
- `POST /sorting-operations` com saldo insuficiente → 409
- `POST /sorting-operations` com soma inconsistente → 422
- Auto-criação de `PERDA_INERENTE` quando soma < processedQuantity
- `DELETE /sorting-operations/:id` bem-sucedido → saldos estornados
- `DELETE /sorting-operations/:id` bloqueado por saldo pronto negativo → 409
- `POST /ready-stock-adjustments` sem justificativa → 422
- `POST /ready-stock-adjustments` que causaria saldo negativo → 409
- SORTER não pode cancelar nem ajustar → 403

Build check: `npm run build` em `apps/backend` e `apps/frontend` devem passar sem erros.
