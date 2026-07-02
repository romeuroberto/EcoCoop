# Implementation Plan: Triagem e Estoque Pronto

**Branch**: `006-triagem-estoque-pronto` | **Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-triagem-estoque-pronto/spec.md`

## Summary

Implementar o fluxo de triagem de material bruto no EcoCoop: o triador registra uma triagem que consome saldo bruto (via evento negativo em `RawMaterialStockEvent`) e gera material pronto (via eventos positivos em `ReadyStockEvent`). Rejeitos e perdas são registrados como filhos da triagem. O estoque pronto segue o mesmo padrão event-sourced do estoque bruto. Ajustes manuais auditados e cancelamento de triagem com estorno de saldos completam o escopo.

## Technical Context

**Language/Version**: TypeScript 5.x (backend NestJS 10, frontend React 18 + Vite)

**Primary Dependencies**: NestJS, Prisma ORM, PostgreSQL, React Router v6, class-validator, class-transformer

**Storage**: PostgreSQL via Prisma (event-sourced: saldo calculado por GROUP BY + SUM dos eventos)

**Testing**: Jest + Supertest (backend integration tests), padrão estabelecido em `apps/backend/test/integration/`

**Target Platform**: Web — servidor Linux (backend), browser (frontend)

**Project Type**: Web application (monorepo: `apps/backend` + `apps/frontend`)

**Performance Goals**: Respostas de leitura de saldo < 300ms p95; criação de triagem < 500ms p95

**Constraints**: Sem saldo negativo (bruto ou pronto); operações de triagem e cancelamento são atômicas (`$transaction`); sem janela temporal para cancelamento — única restrição é saldo suficiente

**Scale/Scope**: Instância única por cooperativa; volume esperado: dezenas de triagens/dia, centenas de movimentações/mês

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Observação |
|-----------|--------|------------|
| I. Spec-Driven | ✅ PASS | Spec + clarificações aprovadas antes do plano |
| II. Fluxo Operacional como Domínio | ✅ PASS | Módulos nomeados em torno do fluxo: `sorting-operations`, `ready-stock`, `ready-stock-adjustments` |
| III. Rastreabilidade e Auditoria | ✅ PASS | `AuditLog` reutilizado via `@AuditEntity`; `ReadyStockEvent` imutável com userId + timestamp |
| IV. Imutabilidade do Estoque por Evento | ✅ PASS | Nenhum saldo alterado diretamente; toda alteração nasce de evento (`RawMaterialStockEvent` / `ReadyStockEvent`) |
| V. Separação de Estados do Material | ✅ PASS | `RawMaterialStockEvent` para bruto; `ReadyStockEvent` para pronto — tabelas separadas, enums separados |
| X. Permissões por Perfil | ✅ PASS | `@RequirePermission` aplicado em todos os endpoints; validação no backend |
| XI. Permissões Validadas no Backend | ✅ PASS | Guard `RolesGuard` reutilizado |
| XXIII. Testes em Áreas Críticas | ✅ PASS | Testes de integração obrigatórios para triagem, estoque pronto e ajustes |
| XXIV. Consistência de Dados | ✅ PASS | `$transaction` para todas as operações multi-tabela |

**Re-check after Phase 1**: Ver data-model.md — nenhuma violação identificada no design.

## Project Structure

### Documentation (this feature)

```text
specs/006-triagem-estoque-pronto/
├── plan.md              # Este arquivo
├── research.md          # Decisões arquiteturais e padrões
├── data-model.md        # Schema Prisma e entidades
├── quickstart.md        # Guia de validação end-to-end
├── contracts/
│   ├── sorting-operations.md   # REST endpoints de triagem
│   └── ready-stock.md          # REST endpoints de estoque pronto
└── tasks.md             # Gerado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/backend/
├── prisma/
│   └── schema.prisma                          # +6 novos models, +2 enums adicionados
├── src/
│   └── modules/
│       ├── sorting-operations/                # Módulo de triagem
│       │   ├── dto/
│       │   │   ├── create-sorting-operation.dto.ts
│       │   │   └── cancel-sorting-operation.dto.ts
│       │   ├── sorting-operations.controller.ts
│       │   ├── sorting-operations.service.ts
│       │   └── sorting-operations.module.ts
│       ├── ready-stock/                       # Saldo e movimentações de estoque pronto
│       │   ├── ready-stock.controller.ts
│       │   ├── ready-stock.service.ts
│       │   └── ready-stock.module.ts
│       └── ready-stock-adjustments/           # Ajustes manuais auditados
│           ├── dto/
│           │   └── create-ready-stock-adjustment.dto.ts
│           ├── ready-stock-adjustments.controller.ts
│           ├── ready-stock-adjustments.service.ts
│           └── ready-stock-adjustments.module.ts
└── test/integration/
    ├── sorting-operations.spec.ts
    ├── ready-stock.spec.ts
    └── ready-stock-adjustments.spec.ts

apps/frontend/
└── src/
    ├── pages/
    │   ├── sorting/
    │   │   ├── SortingListPage.tsx            # Listagem de triagens
    │   │   ├── SortingFormPage.tsx            # Novo formulário de triagem
    │   │   └── SortingDetailPage.tsx          # Detalhe + cancelamento
    │   └── ready-stock/
    │       ├── ReadyStockPage.tsx             # Saldo + histórico + ajuste
    │       └── ReadyStockAdjustmentModal.tsx  # Modal de ajuste auditado
    └── services/
        ├── sorting.service.ts
        └── readyStock.service.ts
```

**Structure Decision**: Web application (Option 2). Backend segue o padrão de módulos NestJS existente (`apps/backend/src/modules/`). Frontend segue o padrão de páginas por feature (`apps/frontend/src/pages/`). Três módulos de backend separados por bounded context (operações, saldo/histórico, ajustes).
