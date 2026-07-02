# Tasks: Rotas Recorrentes

**Spec**: `005-rotas-recorrentes` | **Branch**: `005-rotas-recorrentes` | **Date**: 2026-07-01

**Input**: Design documents from `specs/005-rotas-recorrentes/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Organization**: Tasks organized by user story. Each story phase is independently testable and deliverable.

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no cross-task dependency)
- **[USx]**: User story this task belongs to
- File paths are relative to monorepo root (`apps/backend/`, `apps/frontend/`)

---

## Phase 1: Setup (Dependência e Scaffold)

**Purpose**: Install new dependency and scaffold new module directory. No business logic yet.

- [X] T001 Install `@nestjs/schedule` by running `cd apps/backend && npm install @nestjs/schedule` and commit updated `apps/backend/package.json` and `apps/backend/package-lock.json`
- [X] T002 Import `ScheduleModule.forRoot()` in the `imports` array of `apps/backend/src/app.module.ts`
- [X] T003 [P] Create empty scaffold for `apps/backend/src/modules/route-templates/`: files `route-templates.module.ts`, `route-templates.controller.ts`, `route-templates.service.ts`, `occurrence-generator.service.ts`, `occurrence-generator.scheduler.ts`; subdirectory `dto/` with empty `index.ts`

**Checkpoint**: `cd apps/backend && npx tsc --noEmit` compiles without errors after T001–T003.

---

## Phase 2: Foundational — Schema e Migration

**Purpose**: Database schema for all new entities and fields. Blocks every user story.

⚠️ **CRITICAL**: No user story implementation can begin until T009 (migration) is successfully applied.

- [X] T004 Add `TemplateStatus` enum (`ATIVO`, `INATIVO`) to `apps/backend/prisma/schema.prisma`
- [X] T005 Add `RouteTemplate` model to `apps/backend/prisma/schema.prisma`: fields `id String @id @default(uuid())`, `name String`, `recurrenceDays Int[]`, `startDate DateTime @db.Date`, `endDate DateTime? @db.Date`, `driverId String`, `driver User @relation(...)`, `vehicleId String`, `vehicle Vehicle @relation(...)`, `status TemplateStatus @default(ATIVO)`, `notes String?`, `version Int @default(0)`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, `templatePoints RouteTemplatePoint[]`, `occurrences CollectionRoute[]`
- [X] T006 Add `RouteTemplatePoint` model to `apps/backend/prisma/schema.prisma`: fields `id`, `templateId FK→RouteTemplate onDelete:Cascade`, `collectionPointId FK→CollectionPoint`, `sequence Int`, `notes String?`, `createdAt`, `updatedAt`; constraints `@@unique([templateId, collectionPointId])`, `@@unique([templateId, sequence])`, `@@index([templateId, sequence])`
- [X] T007 Add to `CollectionRoute` model in `apps/backend/prisma/schema.prisma`: field `templateId String?` (FK→RouteTemplate optional), field `isException Boolean @default(false)`, constraint `@@unique([templateId, plannedDate])`; add back-relation `template RouteTemplate? @relation(...)`
- [X] T008 Add field `occurrenceHorizonWeeks Int @default(4)` to `CooperativeSettings` model in `apps/backend/prisma/schema.prisma`
- [X] T009 Run `cd apps/backend && npx prisma migrate dev --name add_route_templates` to generate and apply migration in `apps/backend/prisma/migrations/`
- [X] T010 Run `cd apps/backend && npx prisma generate` to update Prisma client types

**Checkpoint**: Migration applied. `npx prisma studio` shows `RouteTemplate`, `RouteTemplatePoint`, extended `CollectionRoute` (templateId, isException), extended `CooperativeSettings` (occurrenceHorizonWeeks). `npx tsc --noEmit` still compiles.

---

## Phase 3: US1 — Criar modelo de rota recorrente e visualizar ocorrências geradas (P1) 🎯 MVP

**Goal**: Manager creates a route template with weekly recurrence pattern, driver, vehicle and points. System generates PLANEJADA `CollectionRoute` occurrences for the configured horizon (default 4 weeks via `cooperativeSettings?.occurrenceHorizonWeeks ?? 4`). Occurrences appear in collection routes list with template badge and `templateId` filter.

**Independent Test**: `POST /route-templates` with `recurrenceDays=[2,4]` asserts `generatedOccurrences >= 4`. `GET /collection-routes?templateId=<id>` returns PLANEJADA occurrences on Tuesdays and Thursdays only, all `isException=false`. See Quickstart Scenarios 1, 2, 11, 12.

### Tests for US1 (required — Constitution §XXIII / plan.md)

- [X] T011 [P] [US1] Write failing integration test for `OccurrenceGeneratorService`: verify generation algorithm (correct weekdays generated, horizon boundary respected, endDate cutoff, idempotency on re-run returns 0, `generatedOccurrences` count) in `apps/backend/test/integration/route-templates/occurrence-generator.spec.ts`
- [X] T012 [P] [US1] Write failing integration test for `POST /route-templates` (201 + generatedOccurrences), `GET /route-templates` (paginated list), `GET /route-templates/:id` (detail + occurrences), `POST /route-templates/:id/generate` (idempotent refill), `GET /collection-routes?templateId=` (filtered occurrences) in `apps/backend/test/integration/route-templates/route-template-lifecycle.spec.ts`

### Backend Implementation — US1

- [X] T013 [P] [US1] Create `CreateRouteTemplateDto` with class-validator decorators (`name: @IsString`, `recurrenceDays: @IsArray @IsInt each, @Min(0) @Max(6) each`, `startDate: @IsISO8601`, `endDate?: @IsISO8601`, `driverId: @IsUUID`, `vehicleId: @IsUUID`, `points: @ValidateNested array of {collectionPointId, sequence, notes?}`, `notes?: @IsString`) in `apps/backend/src/modules/route-templates/dto/create-route-template.dto.ts`
- [X] T014 [P] [US1] Implement `RouteTemplatesModule` (imports: `PrismaModule`, `ScheduleModule`; providers: `RouteTemplatesService`, `OccurrenceGeneratorService`, `OccurrenceGeneratorScheduler`; controllers: `RouteTemplatesController`) in `apps/backend/src/modules/route-templates/route-templates.module.ts`
- [X] T015 [US1] Implement `OccurrenceGeneratorService.generateForTemplate(templateId, prismaClient?)`: fetch `CooperativeSettings` and use `settings?.occurrenceHorizonWeeks ?? 4` as horizon; iterate dates from `today` to `today + horizonWeeks`; for each date where `dayOfWeek in template.recurrenceDays` and `date >= template.startDate` and `(template.endDate == null || date <= template.endDate)`: create `CollectionRoute` with template driverId/vehicleId/notes and clone `RouteTemplatePoint[]` → `RoutePoint[]`; catch Prisma `P2002` and skip (dedup); return count of created rows in `apps/backend/src/modules/route-templates/occurrence-generator.service.ts`
- [X] T016 [US1] Implement `OccurrenceGeneratorScheduler` with `@Cron('0 2 * * *')` method: fetch all `RouteTemplate` where `status=ATIVO`, call `OccurrenceGeneratorService.generateForTemplate` for each in `apps/backend/src/modules/route-templates/occurrence-generator.scheduler.ts`
- [X] T017 [US1] Implement `RouteTemplatesService.create(dto)`: save `RouteTemplate` with nested `RouteTemplatePoint[]` in `prisma.$transaction`; then call `OccurrenceGeneratorService.generateForTemplate`; return `{template, generatedOccurrences}` in `apps/backend/src/modules/route-templates/route-templates.service.ts`
- [X] T018 [US1] Implement `RouteTemplatesService.findAll(query: {status?, page?, limit?})`: paginated list including `driver`, `vehicle`, `templatePoints`, and `_count.occurrences` as `occurrenceCount`; return `{data, total, page, limit}` in `apps/backend/src/modules/route-templates/route-templates.service.ts`
- [X] T019 [US1] Implement `RouteTemplatesService.findOne(id, query: {occurrencePage?, occurrenceLimit?, occurrenceStatus?})`: return full template with paginated occurrences (`{data, total, page, limit}`); throw `NotFoundException` if not found in `apps/backend/src/modules/route-templates/route-templates.service.ts`
- [X] T020 [US1] Implement `RouteTemplatesService.generate(id)`: call `OccurrenceGeneratorService.generateForTemplate(id)`; throw `NotFoundException` if template not found; return `{generatedOccurrences}` in `apps/backend/src/modules/route-templates/route-templates.service.ts`
- [X] T021 [US1] Implement `RouteTemplatesController` with `@Get()` → `findAll`, `@Post()` → `create` (HTTP 201), `@Get(':id')` → `findOne`, `@Post(':id/generate')` → `generate` (HTTP 200); apply `@RequirePermission('ROUTE_TEMPLATES:READ')` to GETs and `@RequirePermission('ROUTE_TEMPLATES:MANAGE')` to POST/PATCH in `apps/backend/src/modules/route-templates/route-templates.controller.ts`
- [X] T022 [US1] Add `RouteTemplatesModule` to `imports` array of `apps/backend/src/app.module.ts`
- [X] T023 [US1] Extend `CollectionRoutesService.findAll` to accept optional query params `templateId?: string`, `isException?: boolean`, `hasTemplate?: boolean` and add corresponding `where` clauses; include `template: {select: {id, name}}` in Prisma query `select` so response items carry template badge data in `apps/backend/src/modules/collection-routes/collection-routes.service.ts`
- [X] T024 [US1] Extend `CollectionRoutesController.findAll` query params DTO (or inline `@Query` decorators) to accept `templateId`, `isException`, `hasTemplate` and pass them to the service in `apps/backend/src/modules/collection-routes/collection-routes.controller.ts`
- [X] T025 [US1] Run US1 integration tests and fix until green: `cd apps/backend && npm run test:integration -- --testPathPattern="route-templates/(occurrence-generator|route-template-lifecycle)"`

### Frontend Implementation — US1

- [X] T026 [P] [US1] Create `apps/frontend/src/services/routeTemplates.ts` with typed functions `getTemplates(query)`, `getTemplate(id, query)`, `createTemplate(dto)`, `generateOccurrences(id)` using existing axios/fetch client and React Query keys
- [X] T027 [P] [US1] Create `RouteTemplatesPage` (list with status filter chip, card grid or table showing name / recurrenceDays / occurrenceCount / status badge; "Novo Modelo" button navigates to `/route-templates/new`) in `apps/frontend/src/pages/route-templates/RouteTemplatesPage.tsx`
- [X] T028 [US1] Create `RouteTemplateFormPage` (create mode: name input, recurrenceDays checkboxes for each day of week, startDate datepicker, endDate optional datepicker, driverId select, vehicleId select, ordered points list with collectionPointId select + sequence; React Hook Form + Zod; on submit calls `createTemplate`, then navigates to template detail) in `apps/frontend/src/pages/route-templates/RouteTemplateFormPage.tsx`
- [X] T029 [US1] Create `RouteTemplateDetailPage` (template info header with name/status/recurrenceDays; paginated occurrence table with columns: plannedDate, status badge, isException chip, driver email, vehicle plate; occurrenceStatus filter tab) in `apps/frontend/src/pages/route-templates/RouteTemplateDetailPage.tsx`
- [X] T030 [US1] Add routes to `apps/frontend/src/router/index.tsx`: `/route-templates` → `RouteTemplatesPage`, `/route-templates/new` → `RouteTemplateFormPage`, `/route-templates/:id` → `RouteTemplateDetailPage`
- [X] T031 [US1] Extend `apps/frontend/src/pages/collection-routes/CollectionRoutesPage.tsx`: add "Modelo" filter dropdown (populated from `getTemplates({status:'ATIVO'})`); when `templateId` filter active, show template name badge chip on each occurrence row; pass `templateId`, `hasTemplate` to list query

**Checkpoint US1**: `POST /route-templates` → 201 with `generatedOccurrences >= 4`. `GET /collection-routes?templateId=<id>` filters correctly. Frontend list, create form, and detail page functional end-to-end. Build check: `cd apps/backend && npx tsc --noEmit`. Validate Quickstart Scenarios 1, 2, 11, 12.

---

## Phase 4: US2 — Editar ocorrência individual sem afetar o modelo (P2)

**Goal**: Manager edits a single PLANEJADA occurrence (driverId, vehicleId, or points). Backend automatically sets `isException=true` on that occurrence. Template and all other occurrences remain unchanged. Structural edits on EM_ANDAMENTO return 422. Any edit on CONCLUIDA or CANCELADA returns 422.

**Independent Test**: `PATCH /collection-routes/<occurrence.id>` with new driverId → `isException=true`; template.driverId and sibling occurrences unchanged. EM_ANDAMENTO occurrence returns 422 on structural edit but 200 on notes update. Validate Quickstart Scenarios 3, 4.

### Tests for US2 (required — Constitution §XXIII / plan.md)

- [X] T032 [P] [US2] Write failing integration test for: (a) PATCH with structural field on PLANEJADA template occurrence sets `isException=true`; (b) template.driverId unchanged after; (c) PATCH structural field on EM_ANDAMENTO → 422; (d) PATCH notes on EM_ANDAMENTO → 200; (e) any PATCH on CONCLUIDA → 422 in `apps/backend/test/integration/route-templates/occurrence-exception.spec.ts`

### Backend Implementation — US2

- [X] T033 [US2] Extend `CollectionRoutesService.update(id, dto)`: when `route.templateId` is not null AND any of `driverId`, `vehicleId`, or `points` is present in `dto`, include `isException: true` in the Prisma `update` call in `apps/backend/src/modules/collection-routes/collection-routes.service.ts`
- [X] T034 [US2] Add status-based edit restriction in `CollectionRoutesService.update`: before applying changes, if `route.status === 'EM_ANDAMENTO'` and any structural field (`driverId`, `vehicleId`, points) is being modified, throw `UnprocessableEntityException('Edição de campos estruturais não permitida em rota em andamento')`; if `route.status` is `CONCLUIDA` or `CANCELADA`, throw `UnprocessableEntityException` for any modification in `apps/backend/src/modules/collection-routes/collection-routes.service.ts`
- [X] T035 [US2] Run US2 integration tests and fix until green: `cd apps/backend && npm run test:integration -- --testPathPattern="occurrence-exception"`

### Frontend Implementation — US2

- [X] T036 [P] [US2] Add `isException` indicator chip ("Exceção") to the occurrence row in `apps/frontend/src/pages/route-templates/RouteTemplateDetailPage.tsx` and to the route header in `apps/frontend/src/pages/collection-routes/CollectionRouteDetailPage.tsx`
- [X] T037 [US2] In `apps/frontend/src/pages/collection-routes/CollectionRouteFormPage.tsx`: when editing an occurrence where `status === 'EM_ANDAMENTO'`, disable driverId, vehicleId, and points fields with explanatory message ("Campos estruturais não podem ser alterados em rota em andamento"); when `status` is `CONCLUIDA` or `CANCELADA`, disable all form fields

**Checkpoint US2**: Structural edit on PLANEJADA occurrence sets `isException=true`; template unchanged; sibling occurrences unchanged. EM_ANDAMENTO structural edit → 422; notes → 200. CONCLUIDA → 422 for any edit. Validate Quickstart Scenarios 3 and 4.

---

## Phase 5: US3 — Editar modelo e propagar para ocorrências futuras (P2)

**Goal**: Manager updates template fields and optionally propagates to all future PLANEJADA occurrences (`plannedDate >= today`), skipping exceptions unless `overwriteExceptions=true`. Optimistic concurrency via `version` field — stale version returns 409. Adding new recurrenceDays generates new occurrences for those days.

**Independent Test**: `PATCH /route-templates/<id>` with new vehicleId + `propagate:true, overwriteExceptions:false` → non-exception occurrences updated, exception occurrence unchanged. Repeat with `overwriteExceptions:true` → exception overwritten, `isException` cleared. Concurrent PATCH with stale version → 409. Validate Quickstart Scenarios 5, 6.

### Tests for US3 (required — Constitution §XXIII / plan.md)

- [X] T038 [P] [US3] Write failing integration test for `PATCH /route-templates/:id`: (a) `propagate:true` updates PLANEJADA non-exception occurrences; (b) exception occurrence skipped by default; (c) `overwriteExceptions:true` overwrites exception and clears `isException`; (d) EM_ANDAMENTO/CONCLUIDA occurrences never touched; (e) new recurrenceDays trigger generation of new occurrences; (f) stale `version` returns 409 in `apps/backend/test/integration/route-templates/route-template-propagation.spec.ts`

### Backend Implementation — US3

- [X] T039 [P] [US3] Create `UpdateRouteTemplateDto` (all fields optional: `name?`, `recurrenceDays?`, `startDate?`, `endDate?`, `driverId?`, `vehicleId?`, `points?`, `notes?`, `propagate?: boolean`, `overwriteExceptions?: boolean`, `version: number @IsInt`) in `apps/backend/src/modules/route-templates/dto/update-route-template.dto.ts`
- [X] T040 [US3] Implement `RouteTemplatesService.update(id, dto)` base: load template; if `dto.version !== template.version`, throw `ConflictException({code:'CONCURRENT_MODIFICATION'})`; update template scalar fields and `version + 1`; save; if `propagate:true`, call propagation logic; return `{template, propagation}` in `apps/backend/src/modules/route-templates/route-templates.service.ts`
- [X] T041 [US3] Implement propagation logic inside `RouteTemplatesService.update` using `prisma.$transaction`: run `updateMany` on `CollectionRoute` where `templateId=id`, `status=PLANEJADA`, `plannedDate >= today`, and (`isException=false` OR `overwriteExceptions=true`) — update scalar fields (`driverId`, `vehicleId`); for each affected occurrence with changed `points`, delete existing `RoutePoint[]` and recreate from template's `RouteTemplatePoint[]`; if `overwriteExceptions=true`, also `updateMany` `isException=false` on overwritten rows; count and return `{updated, exceptionsSkipped, exceptionsOverwritten, newOccurrencesGenerated}` in `apps/backend/src/modules/route-templates/route-templates.service.ts`
- [X] T042 [US3] Extend `OccurrenceGeneratorService` to accept an optional `onlyDays?: number[]` parameter: when provided, only generate for dates where `dayOfWeek in onlyDays`; call this from `RouteTemplatesService.update` passing the diff between old and new `recurrenceDays` to generate only newly added days in `apps/backend/src/modules/route-templates/occurrence-generator.service.ts`
- [X] T043 [US3] Add `@Patch(':id')` to `RouteTemplatesController`: call `RouteTemplatesService.update`; catch `ConflictException` and return HTTP 409 with `{code:'CONCURRENT_MODIFICATION'}`; return HTTP 200 `{template, propagation}` on success in `apps/backend/src/modules/route-templates/route-templates.controller.ts`
- [X] T044 [US3] Run US3 integration tests and fix until green: `cd apps/backend && npm run test:integration -- --testPathPattern="route-template-propagation"`

### Frontend Implementation — US3

- [X] T045 [US3] Extend `apps/frontend/src/services/routeTemplates.ts` with `updateTemplate(id, dto)` function (includes `version` field in payload)
- [X] T046 [US3] Add edit mode to `RouteTemplateFormPage`: when editing, show `propagate` toggle; when `propagate=true`, show `overwriteExceptions` checkbox; submit calls `updateTemplate` with current `template.version`; on 409, show "Conflito de edição simultânea — recarregue e tente novamente" alert in `apps/frontend/src/pages/route-templates/RouteTemplateFormPage.tsx`
- [X] T047 [US3] In `RouteTemplateDetailPage`, after successful PATCH, show propagation result summary notification: "X ocorrências atualizadas, Y exceções ignoradas, Z novas ocorrências geradas" in `apps/frontend/src/pages/route-templates/RouteTemplateDetailPage.tsx`

**Checkpoint US3**: PATCH propagates correctly; exceptions preserved unless overwritten; new weekdays generate new occurrences; 409 on version mismatch. Build check: `cd apps/backend && npx tsc --noEmit && cd ../apps/frontend && npx tsc --noEmit`. Validate Quickstart Scenarios 5 and 6.

---

## Phase 6: US4 — Duplicar uma rota ou modelo como ponto de partida (P3)

**Goal**: Manager duplicates any collection route as an ad-hoc draft (plannedDate=null, no templateId). Manager duplicates any template as a template draft (name+" (cópia)", startDate=null, endDate=null). Both return HTTP **200** with `{draft}` object; nothing is persisted to the database.

**Independent Test**: `POST /route-templates/<id>/duplicate` → 200, `draft.name = original+" (cópia)"`, `draft.startDate = null`. `POST /collection-routes/<id>/duplicate` → 200, `draft.plannedDate = null`, no templateId. Save drafts → new entities created; originals unchanged. Validate Quickstart Scenarios 9, 10.

### Backend Implementation — US4

- [X] T048 [P] [US4] Add `CollectionRoutesService.duplicate(id)`: load route with `routePoints.collectionPoint`; return plain draft object `{name, plannedDate:null, driverId, vehicleId, notes, points:[{collectionPointId, sequence}]}` — do NOT call `prisma.collectionRoute.create`; throw `NotFoundException` if not found in `apps/backend/src/modules/collection-routes/collection-routes.service.ts`
- [X] T049 [P] [US4] Add `@Post(':id/duplicate')` to `CollectionRoutesController` returning `@HttpCode(200)` `{draft}` in `apps/backend/src/modules/collection-routes/collection-routes.controller.ts`
- [X] T050 [P] [US4] Add `RouteTemplatesService.duplicate(id)`: load template with `templatePoints`; return draft object `{name: template.name+" (cópia)", recurrenceDays, startDate:null, endDate:null, driverId, vehicleId, notes, points:[{collectionPointId, sequence, notes?}]}` — do NOT persist; throw `NotFoundException` if not found in `apps/backend/src/modules/route-templates/route-templates.service.ts`
- [X] T051 [P] [US4] Add `@Post(':id/duplicate')` to `RouteTemplatesController` returning `@HttpCode(200)` `{draft}` with `@RequirePermission('ROUTE_TEMPLATES:MANAGE')` in `apps/backend/src/modules/route-templates/route-templates.controller.ts`

### Frontend Implementation — US4

- [X] T052 [P] [US4] Extend `apps/frontend/src/services/routeTemplates.ts` with `duplicateTemplate(id)` function; add `duplicateCollectionRoute(id)` to the collection routes API service file
- [X] T053 [P] [US4] Add "Duplicar" action button to `CollectionRoutesPage` row menu and to `CollectionRouteDetailPage` action bar: on click, call `duplicateCollectionRoute(id)`, then `navigate('/collection-routes/new', {state: {draft}})` in `apps/frontend/src/pages/collection-routes/`
- [X] T054 [US4] Extend `CollectionRouteFormPage` to detect `location.state?.draft` on mount and pre-fill all form fields from it (leave plannedDate empty); no recurrence option shown (always ad-hoc) in `apps/frontend/src/pages/collection-routes/CollectionRouteFormPage.tsx`
- [X] T055 [US4] Add "Duplicar modelo" button to `RouteTemplateDetailPage` action bar: on click, call `duplicateTemplate(id)`, then `navigate('/route-templates/new', {state: {draft}})`; extend `RouteTemplateFormPage` to detect `location.state?.draft` and pre-fill fields (leave startDate/endDate empty) in `apps/frontend/src/pages/route-templates/`

**Checkpoint US4**: Both duplicate endpoints return HTTP 200 with populated draft — zero DB writes. Frontend opens pre-filled forms with dates cleared. Saving draft creates new entity; original unchanged. Validate Quickstart Scenarios 9 and 10.

---

## Phase 7: US5 — Cancelar ocorrência individual ou modelo inteiro (P3)

**Goal**: Manager cancels a single occurrence (template stays ATIVO, continues generating). Manager deactivates template (bulk cancel all PLANEJADA occurrences atomically in one transaction, template→INATIVO). Manager reactivates with new startDate (generates fresh occurrences). Cancelling EM_ANDAMENTO occurrence requires `confirmInProgress:true` in body or returns 422.

**Independent Test**: Deactivate template with 8 PLANEJADA → `cancelledOccurrences=8`, template.status=INATIVO, `GET /collection-routes?templateId=<id>&status=PLANEJADA` returns 0. Activate → new PLANEJADA generated. Cancel EM_ANDAMENTO without `confirmInProgress` → 422. Validate Quickstart Scenarios 7, 8.

### Tests for US5 (required — Constitution §XXIII / plan.md)

- [X] T056 [P] [US5] Extend `apps/backend/test/integration/route-templates/route-template-lifecycle.spec.ts` with failing tests for: (a) deactivate cancels all PLANEJADA in single transaction, returns `cancelledOccurrences`; (b) deactivate of already-INATIVO template → 409; (c) activate generates new occurrences from new startDate; (d) activate of already-ATIVO template → 409; (e) `POST /collection-routes/:id/cancel` without `confirmInProgress` on EM_ANDAMENTO → 422; (f) with `confirmInProgress:true` → 200

### Backend Implementation — US5

- [X] T057 [US5] Implement `RouteTemplatesService.deactivate(id)` inside `prisma.$transaction`: (1) load template, throw 409 `ConflictException` if already `INATIVO`; (2) `updateMany` all `CollectionRoute` where `templateId=id AND status=PLANEJADA` to `status=CANCELADA`; (3) update template `status=INATIVO`; return `{template, cancelledOccurrences: count}` in `apps/backend/src/modules/route-templates/route-templates.service.ts`
- [X] T058 [US5] Create `ActivateRouteTemplateDto` (`startDate: @IsISO8601, must be >= today`) in `apps/backend/src/modules/route-templates/dto/activate-route-template.dto.ts`
- [X] T059 [US5] Implement `RouteTemplatesService.activate(id, dto)`: throw 409 if already ATIVO; update template `status=ATIVO, startDate=dto.startDate`; call `OccurrenceGeneratorService.generateForTemplate(id)`; return `{template, generatedOccurrences}` in `apps/backend/src/modules/route-templates/route-templates.service.ts`
- [X] T060 [US5] Add `@Post(':id/deactivate')` and `@Post(':id/activate')` endpoints to `RouteTemplatesController` with `@RequirePermission('ROUTE_TEMPLATES:MANAGE')`; map `ConflictException` → 409 in `apps/backend/src/modules/route-templates/route-templates.controller.ts`
- [X] T061 [US5] Extend `CollectionRoutesService.cancel(id, dto)`: when `route.status === 'EM_ANDAMENTO'` and `dto.confirmInProgress` is absent or `false`, throw `UnprocessableEntityException('Confirmação explícita necessária para cancelar rota em andamento')`; when `dto.confirmInProgress === true`, proceed with cancellation and write audit log entry via existing `AuditInterceptor` or inline `prisma.auditLog.create` in `apps/backend/src/modules/collection-routes/collection-routes.service.ts`
- [X] T062 [US5] Run US5 integration tests and fix until green: `cd apps/backend && npm run test:integration -- --testPathPattern="route-template-lifecycle"`

### Frontend Implementation — US5

- [X] T063 [P] [US5] Extend `apps/frontend/src/services/routeTemplates.ts` with `deactivateTemplate(id)` and `activateTemplate(id, dto: {startDate})` functions
- [X] T064 [US5] Add "Desativar" and "Reativar" action buttons to `RouteTemplateDetailPage`: "Desativar" shows confirmation dialog with count of PLANEJADA occurrences to cancel, calls `deactivateTemplate`, displays `cancelledOccurrences` in success toast; "Reativar" shows date input modal, calls `activateTemplate`, displays `generatedOccurrences` in `apps/frontend/src/pages/route-templates/RouteTemplateDetailPage.tsx`
- [X] T065 [US5] Extend cancel occurrence flow in `CollectionRouteDetailPage`: when `occurrence.status === 'EM_ANDAMENTO'`, show extra confirmation step ("Esta rota está em andamento. Confirmar cancelamento?") before submitting; include `confirmInProgress: true` in cancel request body; handle 422 response with explanatory message in `apps/frontend/src/pages/collection-routes/CollectionRouteDetailPage.tsx`

**Checkpoint US5**: Deactivate cancels all PLANEJADA atomically (SC-004: < 5s for up to 24 occurrences). Activate generates fresh occurrences from new startDate. Cancel EM_ANDAMENTO without confirmInProgress → 422; with `confirmInProgress:true` → 200. Validate Quickstart Scenarios 7 and 8.

---

## Phase 8: Polish & Validação Completa

**Purpose**: Cross-cutting auditability, horizon config validation, full test run, build verification, and end-to-end quickstart validation of all 12 scenarios.

- [X] T066 [P] Extend the `CooperativeSettings` DTO in `apps/backend/src/modules/cooperative/dto/` to add `occurrenceHorizonWeeks?: @IsInt @Min(1) @Max(12)` validation; verify `PATCH /cooperative/settings` handler persists the field; return 400 for values outside [1, 12] (covers Quickstart Scenario 12)
- [X] T067 [P] Audit `apps/backend/src/modules/route-templates/route-templates.controller.ts` and `apps/backend/src/modules/collection-routes/collection-routes.controller.ts`: confirm `AuditInterceptor` (or equivalent audit mechanism) is applied to all mutating endpoints (`POST`, `PATCH`) in both modules to satisfy FR-015 and Constitution §III; add interceptor if missing
- [X] T068 Run full backend integration test suite: `npm -w apps/backend test -- --runInBand --forceExit` — result on 2026-07-02: 23 suites passed, 1 suite failed only in known `permissions.spec.ts` cases unrelated to spec 005 (4 failed, 235 passed)
- [X] T069 [P] Backend TypeScript build check: `cd apps/backend && npx tsc --noEmit` — must complete with zero errors
- [X] T070 [P] Frontend TypeScript build check: `cd apps/frontend && npx tsc --noEmit` — must complete with zero errors
- [X] T071 Manually validate all 12 scenarios in `specs/005-rotas-recorrentes/quickstart.md` against the running app (backend at `http://localhost:3000`, frontend at `http://localhost:5173`); automated backend integration coverage passed for route-template scenarios, and manual browser validation was executed successfully in this pass

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup: T001–T003)
    └── Phase 2 (Schema + Migration: T004–T010) ← BLOCKS ALL BELOW
            ├── Phase 3 (US1 P1: T011–T031) ← MVP gate
            │       ├── Phase 4 (US2 P2: T032–T037) ← needs collection-routes service from T023–T024
            │       │       └── Phase 5 (US3 P2: T038–T047) ← needs isException from T033–T034
            │       ├── Phase 6 (US4 P3: T048–T055) ← parallel to Phase 4/5, needs T017–T022
            │       └── Phase 7 (US5 P3: T056–T065) ← needs T061 extends cancel from T034
            └── Phase 8 (Polish: T066–T071) ← depends on all user story phases complete
```

### User Story Dependencies

| Story | Can Start After | Notes |
|-------|----------------|-------|
| US1 (Phase 3) | T010 (migration applied) | Backbone — highest priority |
| US2 (Phase 4) | T024 (collection-routes controller extended) | Extends same service file |
| US3 (Phase 5) | T035 (US2 tests green — isException established) | Propagation depends on isException behavior |
| US4 (Phase 6) | T022 (RouteTemplatesModule registered) | Independent — can run parallel to US2/US3 |
| US5 (Phase 7) | T022 + T034 (cancel extension depends on US2) | Deactivate is independent; cancel EM_ANDAMENTO depends on T034 |
| Polish (Phase 8) | T065 (all user stories complete) | |

### Parallel Opportunities Within Phases

**Phase 3 — US1**:
```
T011, T012, T013, T014 ── all parallel (different files)
T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024 → T025  (sequential, service grows per task)
T026, T027 ── parallel (after T022 backend ready)
T028 → T029 → T030 → T031  (sequential, shared pages)
```

**Phase 4 — US2**:
```
T032 (test file) ── parallel with T033–T034 (same service — sequential between T033 and T034)
T036 ── parallel with T033 (different file)
T037 → after T033/T034 backend done
```

**Phase 5 — US3**:
```
T038 (test), T039 (DTO) ── parallel
T040 → T041 → T042 → T043  (same service file — sequential)
T045, T046 ── parallel after T044
```

**Phase 6 — US4**:
```
T048, T049, T050, T051, T052 ── all parallel (different files)
T053 → after T048+T049; T054 → after T053; T055 → after T050+T051
```

**Phase 7 — US5**:
```
T056 (test) ── parallel with T057–T060 (different files)
T057 → T058 → T059 → T060  (service/dto/controller — sequential within service)
T063 ── parallel with T057–T060
T064, T065 ── parallel (different page files)
```

**Phase 8**:
```
T066, T067, T069, T070 ── all parallel
T068 → after T067
T071 → after T068–T070
```

---

## Parallel Example: US1 Backend

```bash
# Launch in parallel (no shared files):
T011: occurrence-generator.spec.ts  (new file)
T012: route-template-lifecycle.spec.ts  (new file)
T013: create-route-template.dto.ts  (new file)
T014: route-templates.module.ts  (new file)

# Then sequentially as service grows:
T015 (OccurrenceGeneratorService) → T016 (Scheduler) → T017 (create) →
T018 (findAll) → T019 (findOne) → T020 (generate) → T021 (Controller) →
T022 (AppModule) → T023 (extend CR service) → T024 (extend CR controller) →
T025 (run + fix tests)

# Frontend after T022+T024:
T026 (service) ─┐ parallel
T027 (list page)─┘
T028 (form) → T029 (detail) → T030 (router) → T031 (extend CR page)
```

---

## Implementation Strategy

### MVP First (US1 Only — Phases 1–3)

1. Phase 1: Install `@nestjs/schedule` + scaffold
2. Phase 2: Apply schema migration (CRITICAL gate — blocks everything)
3. Phase 3: US1 backend + frontend — template creation, occurrence generation, list/filter
4. **STOP and VALIDATE**: Quickstart Scenarios 1, 2, 11, 12
5. **Ship MVP** — eliminates the main manual recurring work in the collection module

### Incremental Delivery

| Step | Phases | Delivers |
|------|--------|---------|
| 1 | 1–3 | Template creation + automatic occurrences → **MVP** |
| 2 | 4 | Individual occurrence edits + isException flag → **Exception handling** |
| 3 | 5 | Template propagation + concurrency control → **Full template management** |
| 4 | 6–7 | Duplication + lifecycle (deactivate/activate/cancel) → **Complete feature** |
| 5 | 8 | Audit, build, full quickstart validation → **Ship-ready** |

---

## Notes

- `[P]` = safe to run in parallel; different files, no dependency on incomplete task in same batch
- `[USx]` maps each task to its spec user story for traceability and independent delivery
- **Phase 2 is the hardest gate** — no user story task can be demonstrated without a live migration
- `prisma.$transaction` is **required** for propagation (T041) and deactivation (T057) — Constitution §XXIV
- `cooperativeSettings?.occurrenceHorizonWeeks ?? 4` fallback **must** be in `OccurrenceGeneratorService` (T015) — documented in data-model.md
- `version` field (T005, T040) enables 409 detection — do not skip even in "simple" update path
- `@@unique([templateId, plannedDate])` (T007) makes generation idempotent via P2002 catch in T015 — no extra dedup logic needed
- `POST /route-templates/:id/duplicate` and `POST /collection-routes/:id/duplicate` return HTTP **200** not 201 — nothing is persisted (T049, T051)
- `confirmInProgress:false` or absent on EM_ANDAMENTO cancel **must return 422**, not 400 (T061) — contract requirement
- Frontend tests not required per plan.md and Constitution §XXIII (Jest backend integration tests cover all critical paths); manual validation via T071 covers frontend correctness
- All 4 integration test files must pass before Phase 8: `occurrence-generator.spec.ts`, `route-template-lifecycle.spec.ts`, `occurrence-exception.spec.ts`, `route-template-propagation.spec.ts`
