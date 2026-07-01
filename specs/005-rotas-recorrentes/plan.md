# Implementation Plan: Rotas Recorrentes

**Branch**: `005-rotas-recorrentes` | **Date**: 2026-07-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-rotas-recorrentes/spec.md`

## Summary

Implementar modelos de rota recorrente (RouteTemplate) que geram automaticamente ocorrências de `CollectionRoute` com base em padrões semanais, com suporte a edição individual de ocorrências, propagação de alterações do modelo para ocorrências futuras, duplicação assistida de rotas e modelos, e cancelamento granular. A geração de ocorrências é executada por job agendado diário (`@nestjs/schedule`) e disparada sincronamente na criação/reativação do modelo.

## Technical Context

**Language/Version**: TypeScript 5.1 — NestJS 10 (backend) + React 18 + Vite 5 (frontend)

**Primary Dependencies**:
- Backend: NestJS 10, Prisma 5, `@nestjs/schedule` (NEW — not yet installed), class-validator, Passport/JWT
- Frontend: React Query 5, React Hook Form + Zod, Tailwind CSS 3, React Router 6, Zustand

**Storage**: PostgreSQL via Prisma 5. New migration adds `RouteTemplate`, `RouteTemplatePoint` tables and extends `CollectionRoute` + `CooperativeSettings`.

**Testing**: Jest (backend) — integration tests at `apps/backend/test/integration/`. New coverage required for: occurrence generation engine, propagation logic, status-based edit restrictions, and deactivation cascades (Constitution §XXIII).

**Target Platform**: Web application — Turborepo monorepo (`apps/backend` NestJS + `apps/frontend` React/Vite).

**Project Type**: Full-stack web application (backend API + frontend SPA).

**Performance Goals**:
- Route list with template metadata: < 200ms p95
- Bulk cancel PLANEJADA on deactivation: < 5s (SC-004; max ~24 occurrences per template at 12-week horizon)
- Occurrence generation on template create: < 2s (SC-001)

**Constraints**:
- `@@unique([templateId, plannedDate])` on `CollectionRoute` — deduplication enforced at DB level
- Propagation and deactivation must be atomic (`prisma.$transaction`)
- Occurrences in EM_ANDAMENTO, CONCLUIDA, CANCELADA are immutable to propagation
- No multi-tenancy: single cooperative instance per deployment

**Scale/Scope**: ~10 active templates per cooperative; max ~120 PLANEJADA occurrences (10 templates × 12 weeks × 1 day/week). Well within single-transaction range.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. Spec-Driven | spec.md exists and is complete with clarifications | ✅ PASS |
| II. Fluxo Operacional | RouteTemplate está no estágio "coleta" do fluxo; nomenclatura em português do domínio | ✅ PASS |
| III. Auditoria | FR-015 exige audit log em todas as alterações; AuditLog + AuditInterceptor existentes podem ser reutilizados | ✅ PASS |
| IV. Imutabilidade de Estoque | Feature não altera estoque diretamente | N/A |
| XI. Permissões no Backend | Toda validação via `@RequirePermission` decorators; nenhuma confiança no frontend | ✅ PASS |
| XIII. Mapas para Rotas | Feature estende CollectionRoute existente (Leaflet já integrado); visualização de mapa mantida | ✅ PASS |
| XXI. Stack Definida | NestJS + TypeScript + PostgreSQL + React; `@nestjs/schedule` é adição dentro do ecossistema NestJS | ✅ PASS |
| XXIII. Testes Obrigatórios | Lógica de geração, propagação e transições de estado são críticas → cobertura obrigatória | ✅ PLANNED |

**Post-design re-check**: Nenhuma violação introduzida pelo design. Propagação atômica via `$transaction` preserva Princípio XXIV (consistência de dados).

## Project Structure

### Documentation (this feature)

```text
specs/005-rotas-recorrentes/
├── plan.md              ✅ This file
├── spec.md              ✅ Feature specification
├── research.md          ✅ Phase 0 output
├── data-model.md        ✅ Phase 1 output
├── quickstart.md        ✅ Phase 1 output
├── contracts/
│   ├── route-templates.md              ✅ Phase 1 output
│   └── collection-routes-extensions.md ✅ Phase 1 output
└── tasks.md             ⏳ Phase 2 output (/speckit-tasks command)
```

### Source Code

```text
apps/backend/
├── prisma/
│   ├── schema.prisma                         # Add RouteTemplate, RouteTemplatePoint, TemplateStatus
│   └── migrations/
│       └── YYYYMMDD_add_route_templates/     # New migration
├── src/
│   └── modules/
│       ├── collection-routes/                # Extend existing module
│       │   ├── collection-routes.controller.ts   # Add: duplicate, enhanced list filters
│       │   ├── collection-routes.service.ts      # Add: duplicate, isException flag, enhanced cancel
│       │   └── dto/
│       │       ├── duplicate-collection-route.dto.ts  # New
│       │       └── (extend existing DTOs)
│       └── route-templates/                  # New module
│           ├── route-templates.module.ts
│           ├── route-templates.controller.ts
│           ├── route-templates.service.ts
│           ├── occurrence-generator.service.ts   # Core generation engine
│           ├── occurrence-generator.scheduler.ts # @Cron daily job
│           └── dto/
│               ├── create-route-template.dto.ts
│               ├── update-route-template.dto.ts
│               ├── activate-route-template.dto.ts
│               └── propagate-route-template.dto.ts

apps/backend/test/integration/
└── route-templates/                          # New integration tests (required by §XXIII)
    ├── occurrence-generator.spec.ts
    ├── route-template-propagation.spec.ts
    └── route-template-lifecycle.spec.ts

apps/frontend/
└── src/
    ├── pages/
    │   ├── collection-routes/
    │   │   ├── CollectionRoutesPage.tsx        # Extend: templateId filter, template badge, duplicate action
    │   │   ├── CollectionRouteDetailPage.tsx   # Extend: edit scope guard, exception indicator
    │   │   └── CollectionRouteFormPage.tsx     # Extend: pre-fill from duplicate draft
    │   └── route-templates/                    # New page group
    │       ├── RouteTemplatesPage.tsx          # List templates
    │       ├── RouteTemplateDetailPage.tsx     # Template + occurrence list
    │       └── RouteTemplateFormPage.tsx       # Create/edit template form
    ├── services/
    │   └── routeTemplates.ts                  # New API service layer
    └── router/
        └── index.tsx                          # Add /route-templates routes
```

**Structure Decision**: Option 2 (full-stack monorepo) with new `route-templates` module alongside the existing `collection-routes`. The existing module is extended minimally to add `duplicate` and the `isException` flag logic.

## Complexity Tracking

> No constitution violations — section not required.

---

## Phase 0 Artifacts

All NEEDS CLARIFICATION resolved in [research.md](research.md):

| Unknown | Decision |
|---------|----------|
| Scheduling mechanism | `@nestjs/schedule` + `@Cron` (new dependency) |
| Duplicate prevention | `@@unique([templateId, plannedDate])` on CollectionRoute (PostgreSQL NULL semantics handle ad-hoc routes) |
| Exception tracking granularity | Boolean `isException` per occurrence (spec requires whole-occurrence preservation, not field-level) |
| Bulk update pattern | `prisma.$transaction` with `updateMany` for scalars + loop for RoutePoints |
| Horizon configuration | Add `occurrenceHorizonWeeks` to existing `CooperativeSettings` model |

---

## Phase 1 Artifacts

- [data-model.md](data-model.md) — Entity definitions, constraints, state transitions, migration list
- [contracts/route-templates.md](contracts/route-templates.md) — Full REST API for RouteTemplate CRUD, propagation, lifecycle
- [contracts/collection-routes-extensions.md](contracts/collection-routes-extensions.md) — Extensions to existing CollectionRoute API (duplicate, isException, enhanced filters)
- [quickstart.md](quickstart.md) — 12 end-to-end validation scenarios covering all user stories and edge cases
