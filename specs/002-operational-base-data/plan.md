# Implementation Plan: Fase 2 — Cadastros Base Operacionais

**Branch**: `002-operational-base-data` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-operational-base-data/spec.md`

---

## Summary

A Fase 2 expande a fundação da Fase 1 adicionando os **cadastros mestres** que todas as fases operacionais futuras irão consumir: funções de cooperado (MemberRole), cooperados (Member), materiais (categoria + subcategoria), unidades de medida (UnitOfMeasure), compradores (Buyer), veículos (Vehicle), tipos de EPI (EpiType) e centros de custo (CostCenter). Nenhuma operação transacional é implementada — apenas CRUD com RBAC diferenciado por perfil, audit log e frontend responsivo com busca por texto e filtro de status. A stack, os padrões de código e a estratégia de testes são idênticos à Fase 1.

---

## Technical Context

**Language/Version**:
- Backend: Node.js 20 LTS + TypeScript 5.x + NestJS 10.x (igual Fase 1)
- Frontend: TypeScript 5.x + React 18 + Vite 5 (igual Fase 1)

**Primary Dependencies**: mesmas da Fase 1; sem novas dependências de produção nesta fase

**Storage**: PostgreSQL 16 — schema estendido via Prisma migrations incrementais

**Testing**: Jest + Supertest (backend integration) — mesmo padrão da Fase 1

**Target Platform**: Linux VM, Docker Compose, acesso via navegador web

**Project Type**: Web application (NestJS backend + React frontend)

**Performance Goals**: API responses < 500ms para CRUD; listagens com busca < 200ms

**Constraints**:
- Nenhuma operação transacional nesta fase (estoque, coleta, triagem)
- RBAC via `RequirePermission` + `PermissionsGuard` já existentes
- AuditInterceptor por controller, padrão da Fase 1
- Paginação simples server-side com parâmetros `page`, `limit`, `search` e `status` (default: `status=active`); sem filtros avançados, relatórios ou exportação
- Inativação lógica exclusiva — deleção física proibida
- Buyer.userId (FK opcional para User) cadastrável via endpoint `/link-user`; `buyerId` no JWT/token e `CurrentUserDto` permanecem fora do escopo desta fase — portal completo do comprador fica para fase futura
- CPF (Member) e número de documento (Buyer) validados com dígito verificador via `class-validator` customizado; sem consulta à Receita Federal; testes obrigatórios

**Fora do Escopo desta Fase**:
- Rotas de coleta e mapas
- Estoque e movimentações de material
- Triagem e registro de pesagem
- Vendas e notas fiscais
- Financeiro completo e rateio
- Entrega e controle de EPI (apenas cadastro de tipos)
- Presença de cooperados
- Portal completo do comprador (apenas stub/placeholder da Fase 1)
- `buyerId` no JWT payload ou em `CurrentUserDto`
- Documentos PDF
- Relatórios avançados e dashboard avançado
- Filtros avançados por data, múltiplos campos ou exportação de dados

**Scale/Scope**: 9 novos módulos backend, 9 novas telas frontend, ~30 endpoints REST (3 por módulo simples + 5 por módulo com detalhe e vinculação de usuário), 1 migration Prisma incremental

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Evidência |
|-----------|--------|-----------|
| I. Spec-Driven Development | ✅ | spec.md completo + 5 sessões de clarificação |
| II. Fluxo Operacional como Domínio | ✅ | Módulos nomeados com vocabulário da cooperativa |
| III. Rastreabilidade e Auditoria | ✅ | AuditInterceptor em todos os controllers mutáveis (FR-034) |
| IV. Imutabilidade do Estoque por Evento | ✅ | Nenhum StockEvent nesta fase; sem tocar em saldo |
| V. Separação de Estados do Material | ✅ | `acceptsStock` e `isSellable` em MaterialSubcategory — sem criar estados de estoque |
| VI–VII. (Financeiro, Rateio) | N/A | Fora do escopo desta fase |
| VIII. Instância Dedicada | ✅ | Sem multi-tenancy |
| IX. Portal do Comprador | ✅ | Buyer tem FK opcional para User BUYER; portal placeholder mantido |
| X. Cooperados com Login Individual | ✅ | Member tem FK opcional para User; regra de exclusividade preservada |
| XI. Permissões no Backend | ✅ | FR-033a/FR-033b: ADMIN = CRUD total; MANAGER = CRUD operacional + READ estrutural |
| XII–XV. (Coleta, Presença, Docs, Pesagem) | N/A | Fora do escopo desta fase |
| XVI. Estoque Flexível | ✅ | UnitOfMeasure com `baseUnitId` + `conversionFactor` opcionais |
| XVII. Materiais por Categorias | ✅ | MaterialCategory → MaterialSubcategory hierárquica |
| XVIII–XIX. (Financeiro, Relatórios) | N/A | Fora do escopo desta fase |
| XX. Interface Responsiva | ✅ | Telas CRUD responsivas (FR-036); busca case-insensitive (FR-042) |
| XXI. Stack Definida | ✅ | Zero novas dependências de produção |
| XXII. ADR | ✅ | research.md documenta decisões de modelagem |
| XXIII. Testes Obrigatórios | ✅ | 100% permissões cobertas (SC-003); testes de inativação obrigatórios |
| XXIV. Consistência/Segurança | ✅ | Inativação lógica; FK preservadas; validação CPF/CNPJ com dígito verificador |

**Resultado**: Todas as verificações passaram. Nenhuma violação identificada.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-operational-base-data/
├── plan.md              ← Este arquivo
├── research.md          ← Decisões de modelagem e padrões desta fase
├── data-model.md        ← Entidades, campos e relacionamentos
├── quickstart.md        ← Guia de validação end-to-end
├── contracts/
│   └── rest-api.md      ← Contratos REST dos novos endpoints
└── tasks.md             ← (criado por /speckit-tasks)
```

### Source Code (repository root)

```text
apps/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma                  ← +9 novos models, +2 enums
│   │   ├── migrations/                    ← nova migration incremental
│   │   └── seeds/seed.ts                  ← funções padrão MemberRole + módulos RBAC
│   └── src/
│       └── modules/
│           ├── member-roles/              ← CRUD de funções de cooperado
│           │   ├── member-roles.controller.ts
│           │   ├── member-roles.service.ts
│           │   ├── member-roles.module.ts
│           │   └── dto/
│           ├── members/                   ← CRUD de cooperados
│           │   ├── members.controller.ts
│           │   ├── members.service.ts
│           │   ├── members.module.ts
│           │   └── dto/
│           ├── material-categories/       ← CRUD de categorias
│           ├── material-subcategories/    ← CRUD de subcategorias
│           ├── units/                     ← CRUD de unidades de medida
│           ├── buyers/                    ← CRUD de compradores
│           ├── vehicles/                  ← CRUD de veículos
│           ├── epi-types/                 ← CRUD de tipos de EPI
│           └── cost-centers/              ← CRUD de centros de custo
└── frontend/
    └── src/
        ├── pages/
        │   ├── member-roles/              ← Lista + form
        │   ├── members/                   ← Lista + form + vinculação de usuário
        │   ├── material-categories/       ← Lista + form + subcategorias aninhadas
        │   ├── units/                     ← Lista + form
        │   ├── buyers/                    ← Lista + form
        │   ├── vehicles/                  ← Lista + form
        │   ├── epi-types/                 ← Lista + form
        │   └── cost-centers/              ← Lista + form
        ├── services/                      ← API clients para cada módulo
        └── router/index.tsx               ← Rotas adicionadas para cada módulo
```

**Structure Decision**: Web application — mantém exatamente a estrutura monorepo da Fase 1 (`apps/backend` + `apps/frontend`). Cada novo domínio recebe seu próprio módulo NestJS isolado com controller, service, module e DTOs. Frontend segue o padrão de `pages/` com sub-pastas por entidade e `services/` com cliente de API React Query.
