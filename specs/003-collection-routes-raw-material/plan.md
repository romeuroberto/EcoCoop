# Implementation Plan: Fase 3 — Coleta, Rotas e Entrada de Material Bruto

**Branch**: `003-collection-routes-raw-material` | **Date**: 2026-06-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-collection-routes-raw-material/spec.md`

---

## Summary

A Fase 3 implementa o fluxo operacional de campo da cooperativa: **pontos de coleta → rotas de coleta → execução em campo → entrada de material bruto → saldo bruto**. Novos módulos backend (`collection-points`, `collection-routes`, `raw-material-entries`, `raw-material-balance`) + novas telas frontend. O modelo de estoque segue event-sourcing (Princípio IV): eventos imutáveis `ENTRADA_BRUTO` e `ESTORNO_BRUTO` substituem qualquer atualização direta de saldo. Geocoding via Nominatim por interface abstrata; mapas via `react-leaflet` com fachada `MapView`; sugestão de sequência por nearest neighbor (O(n²)). RBAC estendido com módulos novos e `RouteOwnershipGuard` para DRIVER.

---

## Technical Context

**Language/Version**:
- Backend: Node.js 20 LTS + TypeScript 5.x + NestJS 10.x (igual Fases 1 e 2)
- Frontend: TypeScript 5.x + React 18 + Vite 5 (igual Fases 1 e 2)

**Primary Dependencies**:
- Backend: `leaflet` não necessário no backend; HTTP fetch nativo (Node 20) para Nominatim
- Frontend: `leaflet` + `react-leaflet` (map rendering); sem novas dependências de estado

**Storage**: PostgreSQL 16 — 1 migration Prisma incremental com 6 novos modelos e 2 novos enums

**Testing**: Jest + Supertest (backend integration) — mesmo padrão das Fases 1 e 2

**Target Platform**: Linux VM, Docker Compose, acesso via navegador web

**Project Type**: Web application (NestJS backend + React frontend) — monorepo com Turborepo

**Performance Goals**:
- Sugestão de sequência < 3s para até 20 pontos (SC-003) — nearest neighbor é O(n²) em memória, atende com margem
- API responses < 500ms para CRUD; saldo bruto < 200ms (query de agregação em PostgreSQL)

**Constraints**:
- Geocoding assíncrono e não bloqueante — falha salva ponto com `locationPending=true`
- Saldo bruto calculado em tempo de consulta — sem tabela persistida de saldo (Princípio IV)
- Optimistic locking para transições de estado de rota (campo `version`)
- RBAC duplo para DRIVER: perfil + ownership da rota
- `routeId` NOT NULL em entradas de material (sem entrada avulsa)
- Eventos de estoque sem `updatedAt` — imutabilidade garantida pela ausência de rotas de mutação

**Fora do Escopo desta Fase**:
- Triagem de material, estoque de material pronto
- GPS em tempo real
- Entradas avulsas (sem rota)
- Portal do comprador, financeiro, rateio
- Controle de presença

**Scale/Scope**: 4 novos módulos backend, ~25 endpoints REST, 6 novos modelos Prisma, 6+ telas frontend, 1 migration incremental

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Evidência |
|-----------|--------|-----------|
| I. Spec-Driven Development | ✅ | spec.md completo com clarificações em 2026-06-30 |
| II. Fluxo Operacional como Domínio | ✅ | Módulos nomeados: `collection-points`, `collection-routes`, `raw-material-entries` — vocabulário da cooperativa |
| III. Rastreabilidade e Auditoria | ✅ | AuditInterceptor em todos os controllers mutáveis; FR-030/031/032 cobertos; SC-007: 100% das operações mutáveis geram auditoria |
| IV. Imutabilidade do Estoque por Evento | ✅ | `RawMaterialStockEvent` sem `updatedAt`; sem rotas de DELETE/UPDATE; saldo = projeção de eventos; estorno cria evento compensatório, não edita o original |
| V. Separação de Estados do Material | ✅ | `ENTRADA_BRUTO` / `ESTORNO_BRUTO` exclusivos de material bruto; triagem fica para Fase 4 |
| VI–VII. (Financeiro, Rateio) | N/A | Fora do escopo desta fase |
| VIII. Instância Dedicada | ✅ | Sem multi-tenancy |
| IX. Portal do Comprador | N/A | Fora do escopo desta fase |
| X. Cooperados com Login Individual | ✅ | DRIVER = User com perfil DRIVER; RouteOwnershipGuard por `userId` |
| XI. Permissões no Backend | ✅ | FR-037: todas as verificações no backend; `RouteOwnershipGuard` server-side |
| XII. Pesagem Manual com Extensibilidade | ✅ | `RawMaterialEntry` aceita quantidade manual; `GeocodingProvider` é interface abstrata (princípio similar de extensibilidade) |
| XIII. Mapas para Rotas de Coleta | ✅ | FR-011/FR-040: `MapView` como fachada sobre Leaflet/OSM; ponto de troca de provider sem refatoração de domínio |
| XIV–XV. (Presença, Docs) | N/A | Fora do escopo desta fase |
| XVI. Estoque Flexível | ✅ | `unitId` em `RawMaterialEntry` e `RawMaterialStockEvent`; unidades vindas do cadastro da Fase 2 |
| XVII. Materiais por Categorias | ✅ | `subcategoryId` em `RawMaterialEntry`; hierarquia `MaterialCategory → MaterialSubcategory` da Fase 2 |
| XVIII–XIX. (Financeiro, Relatórios) | N/A | Fora do escopo desta fase |
| XX. Interface Responsiva | ✅ | FR-038/039: telas responsivas; SC-009: 320px mobile; SC-010: fluxos em ≤ 3 passos |
| XXI. Stack Tecnológica Definida | ✅ | NestJS + TypeScript + React + Vite + PostgreSQL — sem desvio |
| XXII. ADR para Decisões Estruturais | ✅ | `research.md` registra decisões de geocoding, algoritmo de sequência, event-sourcing, optimistic locking |
| XXIII. Testes Obrigatórios em Áreas Críticas | ✅ | Permissões, estoque (event-sourcing), transições de estado — todas áreas com testes de integração obrigatórios |
| XXIV. Consistência, Segurança, Backup | ✅ | Criação de entrada + evento em transação atômica; validação anti-saldo-negativo no service; sem estados parciais |

**Constitution Check pós-design**: Todos os princípios verificados. Nenhuma violação.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-collection-routes-raw-material/
├── plan.md              # Este arquivo
├── spec.md              # Especificação da feature
├── research.md          # Decisões de pesquisa (Phase 0)
├── data-model.md        # Modelo de dados Prisma (Phase 1)
├── quickstart.md        # Guia de validação (Phase 1)
├── contracts/
│   └── rest-api.md      # Contratos de API REST (Phase 1)
└── tasks.md             # Tarefas de implementação (Phase 2 — gerado por /speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma                    # + Phase 3 models (migration incremental)
│   └── src/
│       ├── common/
│       │   ├── guards/
│       │   │   └── route-ownership.guard.ts  # NOVO: verifica driverId ou teamMember
│       │   └── providers/
│       │       └── geocoding/
│       │           ├── geocoding.provider.ts        # NOVO: interface abstrata
│       │           └── nominatim.geocoding.provider.ts  # NOVO: implementação
│       └── modules/
│           ├── collection-points/            # NOVO: FR-001–006
│           │   ├── collection-points.controller.ts
│           │   ├── collection-points.service.ts
│           │   ├── collection-points.module.ts
│           │   └── dto/
│           ├── collection-routes/            # NOVO: FR-007–020
│           │   ├── collection-routes.controller.ts
│           │   ├── collection-routes.service.ts
│           │   ├── collection-routes.module.ts
│           │   ├── route-sequence-suggester.service.ts  # nearest neighbor
│           │   └── dto/
│           ├── raw-material-entries/         # NOVO: FR-021–029, FR-042–049
│           │   ├── raw-material-entries.controller.ts
│           │   ├── raw-material-entries.service.ts
│           │   ├── raw-material-entries.module.ts
│           │   └── dto/
│           └── raw-material-balance/         # NOVO: FR-027–029
│               ├── raw-material-balance.controller.ts
│               ├── raw-material-balance.service.ts
│               └── raw-material-balance.module.ts
└── frontend/
    └── src/
        ├── components/
        │   └── map/
        │       ├── MapView.tsx               # NOVO: fachada sobre react-leaflet
        │       └── MapMarker.tsx             # NOVO: marcador numerado
        ├── pages/
        │   ├── collection-points/            # NOVO: listagem + formulário
        │   │   ├── CollectionPointsPage.tsx
        │   │   └── CollectionPointFormPage.tsx
        │   ├── collection-routes/            # NOVO: listagem + planejamento + execução
        │   │   ├── CollectionRoutesPage.tsx
        │   │   ├── CollectionRouteFormPage.tsx
        │   │   └── CollectionRouteDetailPage.tsx
        │   └── raw-material/                 # NOVO: entradas + saldo
        │       ├── RawMaterialEntriesPage.tsx
        │       └── RawMaterialBalancePage.tsx
        ├── services/
        │   ├── collectionPointsService.ts    # NOVO
        │   ├── collectionRoutesService.ts    # NOVO
        │   └── rawMaterialService.ts         # NOVO
        └── store/
            ├── collectionPointsStore.ts      # NOVO
            ├── collectionRoutesStore.ts      # NOVO
            └── rawMaterialStore.ts           # NOVO
```

**Structure Decision**: Monorepo `apps/backend` + `apps/frontend` (padrão das Fases 1 e 2). Um módulo NestJS por agregado de domínio. `MapView` isolado em `components/map/` como fachada sobre `react-leaflet`, seguindo o mesmo padrão de isolamento do `GeocodingProvider` no backend.

---

## Complexity Tracking

> Nenhuma violação da Constituição identificada. Seção não aplicável.
