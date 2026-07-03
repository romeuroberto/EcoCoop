# Implementation Plan: Vendas Operacionais

**Branch**: `007-vendas-operacionais` | **Date**: 2026-07-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-vendas-operacionais/spec.md`

## Summary

Implement the full sales cycle for ready material: register a multi-item sale that atomically debits ready stock via immutable events (VENDA type), confirm physical delivery, cancel with stock reversal (ESTORNO_VENDA), and auto-create a minimal AccountReceivable stub. Backend (NestJS + Prisma), frontend (React + TanStack Query), RBAC, audit, and integration tests.

## Technical Context

**Language/Version**: TypeScript 5.x (Node 20)

**Primary Dependencies**: NestJS, Prisma (PostgreSQL), class-validator / class-transformer, @tanstack/react-query, React 18

**Storage**: PostgreSQL via Prisma — new models `Sale`, `SaleItem`, `AccountReceivable`; enum extensions `ReadyStockEventType` (VENDA, ESTORNO_VENDA) and new `SaleStatus`, `AccountReceivableStatus`

**Testing**: Jest + Supertest integration tests against real test DB (`apps/backend/test/integration/sales.spec.ts`)

**Target Platform**: Linux server (backend) + browser (frontend, Vite dev server / build)

**Project Type**: Web application — NestJS API + React SPA (monorepo, Turborepo)

**Performance Goals**: List endpoint < 2s for up to 10,000 records (indexed queries)

**Constraints**: Stock debit must be atomic (single Prisma transaction); balance check inside transaction to prevent race conditions

**Scale/Scope**: Single cooperative instance (MVP); no multi-tenancy

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Spec-Driven Development | ✅ | Spec 007 approved before this plan |
| II. Fluxo Operacional como Domínio | ✅ | `Sale`, `SaleItem`, `AccountReceivable` mirror the operational domain vocabulary |
| III. Rastreabilidade e Auditoria | ✅ | AuditInterceptor on controller; every state change logged |
| IV. Imutabilidade do Estoque por Evento | ✅ | Stock consumed via `ReadyStockEvent(VENDA)` and restored via `ReadyStockEvent(ESTORNO_VENDA)` — never direct balance mutation |
| V. Separação Clara de Estados do Material | ✅ | Feature only touches `readyStock`; raw stock untouched |
| VI. Financeiro Vinculado às Operações | ✅ | `AccountReceivable` created atomically with the sale; linked via `saleId` FK |
| XI. Permissões Validadas no Backend | ✅ | `@RequirePermission` on every endpoint |
| XXIII. Testes Obrigatórios | ✅ | Integration tests required for sales, delivery, cancellation, and RBAC |

No violations. No complexity justification needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-vendas-operacionais/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions and rationale
├── data-model.md        # Phase 1 — Prisma schema additions
├── contracts/
│   └── api.md           # Phase 1 — REST API contracts
├── quickstart.md        # Phase 1 — validation scenarios
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/backend/
├── prisma/
│   ├── schema.prisma                          # extend enums + new models
│   └── migrations/                            # new migration
├── src/
│   └── modules/
│       ├── sales/                             # NEW module
│       │   ├── dto/
│       │   │   ├── create-sale.dto.ts
│       │   │   ├── deliver-sale.dto.ts
│       │   │   └── cancel-sale.dto.ts
│       │   ├── sales.controller.ts
│       │   ├── sales.service.ts
│       │   └── sales.module.ts
│       └── accounts-receivable/               # NEW module
│           ├── accounts-receivable.controller.ts
│           ├── accounts-receivable.service.ts
│           └── accounts-receivable.module.ts
└── test/integration/
    └── sales.spec.ts                          # NEW integration test

apps/frontend/
└── src/
    ├── services/
    │   ├── sales.service.ts                   # NEW
    │   └── accountsReceivable.service.ts      # NEW
    └── pages/
        └── sales/                             # NEW page
            ├── SalesPage.tsx
            ├── SaleFormModal.tsx
            └── SaleDetailPage.tsx
```

**Structure Decision**: Web application (Option 2). Backend module pattern mirrors `sorting-operations`; frontend page pattern mirrors `ready-stock`.
