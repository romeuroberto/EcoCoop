# Data Model: Rotas Recorrentes

## New Enum

```prisma
enum TemplateStatus {
  ATIVO
  INATIVO
}
```

---

## New Entity: RouteTemplate

Representa o padrão recorrente de uma rota. Gera `CollectionRoute` (ocorrências) automaticamente.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | @id @default(uuid()) | PK |
| name | String | required | Nome do modelo |
| recurrenceDays | Int[] | required, min 1 item, values 0–6 | Dias da semana (0=Dom, 1=Seg … 6=Sáb) |
| startDate | DateTime @db.Date | required | Início de vigência |
| endDate | DateTime? @db.Date | optional | Fim de vigência (null = indefinido) |
| driverId | String | FK → User | Motorista padrão |
| driver | User | relation | |
| vehicleId | String | FK → Vehicle | Veículo padrão |
| vehicle | Vehicle | relation | |
| status | TemplateStatus | @default(ATIVO) | ATIVO / INATIVO |
| notes | String? | optional | Observações gerais |
| version | Int | @default(0) | Controle de concorrência otimista |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |
| templatePoints | RouteTemplatePoint[] | relation | Pontos de coleta ordenados |
| occurrences | CollectionRoute[] | relation | Ocorrências geradas |

**Validations**:
- `recurrenceDays`: array não vazio, valores únicos, cada valor em [0, 6]
- `startDate`: >= hoje (na criação)
- `endDate`: se presente, >= startDate

**State Transitions**:
```
ATIVO ─── deactivate() ──→ INATIVO
           (cancels all PLANEJADA occurrences)

INATIVO ─── activate(newStartDate) ──→ ATIVO
            (resumes generation from newStartDate)
```

---

## New Entity: RouteTemplatePoint

Pontos de coleta associados a um modelo de rota, em ordem de visitação.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | @id @default(uuid()) | PK |
| templateId | String | FK → RouteTemplate, onDelete: Cascade | |
| template | RouteTemplate | relation | |
| collectionPointId | String | FK → CollectionPoint | |
| collectionPoint | CollectionPoint | relation | |
| sequence | Int | required | Posição na rota (1-based) |
| notes | String? | optional | |
| createdAt | DateTime | @default(now()) | |
| updatedAt | DateTime | @updatedAt | |

**Constraints**:
- `@@unique([templateId, collectionPointId])` — mesmo ponto não pode aparecer duas vezes no modelo
- `@@unique([templateId, sequence])` — sequências únicas por modelo
- `@@index([templateId, sequence])` — listagem ordenada eficiente

---

## Modified Entity: CollectionRoute

Adições ao modelo existente para suporte a ocorrências de modelo.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| templateId | String? | FK → RouteTemplate, optional | Null = rota avulsa |
| template | RouteTemplate? | relation | |
| isException | Boolean | @default(false) | True se editada individualmente |

**Additional constraint**:
```sql
-- Impede duplicação de ocorrência por modelo+data
-- NULLs são tratados como distintos no PostgreSQL (rotas avulsas não conflitam)
@@unique([templateId, plannedDate])
```

**isException lifecycle**:
- `false` → `true`: quando qualquer campo estrutural (driverId, vehicleId, RoutePoints) é editado em uma ocorrência com templateId não nulo
- `true` → `false`: apenas quando o gestor confirma propagação com `overwriteExceptions: true`

**Status lifecycle** (preservado do modelo existente):
```
PLANEJADA ──→ EM_ANDAMENTO ──→ CONCLUIDA
     │               │
     └───────────────┴──→ CANCELADA
```

**Constraint de edição por status**:
| Status | Campos estruturais (driverId, vehicleId, points) | Campos operacionais (notes, cancelReason) |
|--------|---------------------------------------------------|-------------------------------------------|
| PLANEJADA | ✅ Permitido | ✅ Permitido |
| EM_ANDAMENTO | ❌ Bloqueado | ✅ Permitido |
| CONCLUIDA | ❌ Bloqueado | ❌ Bloqueado |
| CANCELADA | ❌ Bloqueado | ❌ Bloqueado |

---

## Modified Entity: CooperativeSettings

Adição do horizonte de geração de ocorrências.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| occurrenceHorizonWeeks | Int | @default(4), min: 1, max: 12 | Semanas à frente para geração |

**Fallback**: `CooperativeSettings` pode não existir (registro não criado). O `OccurrenceGeneratorService` deve usar `cooperativeSettings?.occurrenceHorizonWeeks ?? 4` — o valor padrão de 4 semanas se aplica quando nenhuma configuração foi definida para a cooperativa.

---

## Relationships Overview

```
RouteTemplate
├── driverId → User
├── vehicleId → Vehicle
├── templatePoints[] → RouteTemplatePoint
│   └── collectionPointId → CollectionPoint
└── occurrences[] → CollectionRoute (templateId)
    ├── vehicleId → Vehicle
    ├── driverId → User
    └── routePoints[] → RoutePoint → CollectionPoint

CooperativeSettings
└── occurrenceHorizonWeeks: Int
```

---

## Generation Logic Summary

**Trigger events**:
1. `POST /route-templates` (creation) → gera ocorrências imediatamente
2. `POST /route-templates/:id/activate` (reativação) → gera a partir de newStartDate
3. `PATCH /route-templates/:id` com alteração de recurrenceDays → gera para novos dias
4. Cron diário (02h00) → para cada template ATIVO, preenche o horizonte

**Algorithm** (per template):
```
horizonEnd = today + occurrenceHorizonWeeks weeks
for each day in [today .. horizonEnd]:
  if dayOfWeek(day) in template.recurrenceDays
    and day >= template.startDate
    and (template.endDate is null OR day <= template.endDate):
      upsert CollectionRoute(templateId, plannedDate=day)
        using template defaults for driverId, vehicleId, notes
        and cloning RouteTemplatePoints → RoutePoints
```

**Deduplication**: `@@unique([templateId, plannedDate])` on `CollectionRoute` makes re-runs idempotent — a duplicate insert throws a Prisma `P2002` error caught and ignored.

---

## Schema Migrations Required

1. **New enum**: `TemplateStatus` (ATIVO, INATIVO)
2. **New table**: `RouteTemplate`
3. **New table**: `RouteTemplatePoint`
4. **Alter table** `RouteTemplate`: add `version` (Int default 0, for optimistic concurrency control)
5. **Alter table** `CollectionRoute`: add `templateId`, `isException`
6. **Alter table** `CollectionRoute`: add `@@unique([templateId, plannedDate])`
7. **Alter table** `CooperativeSettings`: add `occurrenceHorizonWeeks`
8. **Add relation** `CollectionRoute` ↔ `RouteTemplate`
9. **Add relation** `Vehicle` ↔ `RouteTemplate`
10. **Add relation** `User` ↔ `RouteTemplate` (driver)
