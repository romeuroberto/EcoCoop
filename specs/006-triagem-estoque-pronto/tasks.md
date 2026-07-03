# Tasks: Triagem e Estoque Pronto

**Input**: Design documents from `specs/006-triagem-estoque-pronto/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅

**Tests**: Integração obrigatória conforme Constitution check XXIII e quickstart.md — incluída em todas as fases.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in all descriptions

## Path Conventions

- Backend: `apps/backend/src/modules/`, `apps/backend/prisma/`, `apps/backend/test/integration/`
- Frontend: `apps/frontend/src/pages/`, `apps/frontend/src/services/`

---

## Phase 1: Setup (Prisma Schema & RBAC)

**Purpose**: Schema changes that block all user story implementation. All tasks are sequential — same file.

- [x] T001 Add SAIDA_TRIAGEM and ESTORNO_TRIAGEM values to RawMaterialStockEventType enum in apps/backend/prisma/schema.prisma
- [x] T002 Add new enums SortingOperationStatus, SortingRejectType, ReadyStockEventType in apps/backend/prisma/schema.prisma
- [x] T003 Add sortingOperationId nullable FK field and @relation("BrutoSortingEvents") to RawMaterialStockEvent model in apps/backend/prisma/schema.prisma
- [x] T004 Add SortingOperation model with all fields (subcategoryId, unitId, processedQuantity, status, cancelReason, cancelledById, cancelledAt, userId, createdAt), relations (outputs, rejects, rawStockEvents, readyStockEvents), and indexes in apps/backend/prisma/schema.prisma
- [x] T005 Add SortingOutput model (sortingOperationId, subcategoryId, unitId, quantity, createdAt, readyStockEvent relation) and SortingReject model (sortingOperationId, type, subcategoryId nullable, unitId, quantity, description nullable) with all indexes in apps/backend/prisma/schema.prisma
- [x] T006 Add ReadyStockEvent model (type, subcategoryId, unitId, quantity, sortingOperationId, sortingOutputId unique, adjustmentId unique, userId, createdAt) and ReadyStockAdjustment model (subcategoryId, unitId, quantity, justification, userId, createdAt, stockEvent relation) with all indexes in apps/backend/prisma/schema.prisma
- [x] T007 Run Prisma migration: `cd apps/backend && npx prisma migrate dev --name triagem-estoque-pronto` and verify generated migration SQL covers all 6 new models and 2 enum additions
- [x] T008 Add RBAC permissions seed for SORTING (READ: SORTER+MANAGER+ADMIN, CREATE: SORTER+MANAGER+ADMIN, CANCEL: MANAGER+ADMIN) and READY_STOCK (READ: SORTER+MANAGER+ADMIN, CREATE_ADJUSTMENT: MANAGER+ADMIN) modules in apps/backend/prisma/seed.ts

**Checkpoint**: Schema migrated, RBAC seeded — user story implementation can now begin

---

## Phase 2: Foundational (Module Scaffolding)

**Purpose**: NestJS module skeletons and frontend router setup that block all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Create apps/backend/src/modules/sorting-operations/ with sorting-operations.module.ts (NestJS @Module decorator, PrismaModule import), sorting-operations.service.ts (empty @Injectable class), sorting-operations.controller.ts (empty @Controller('sorting-operations') class)
- [x] T010 [P] Create apps/backend/src/modules/ready-stock/ with ready-stock.module.ts, ready-stock.service.ts, ready-stock.controller.ts stubs following same pattern as T009
- [x] T011 [P] Create apps/backend/src/modules/ready-stock-adjustments/ with ready-stock-adjustments.module.ts, ready-stock-adjustments.service.ts (dto/ subfolder), ready-stock-adjustments.controller.ts stubs
- [x] T012 Register SortingOperationsModule, ReadyStockModule, ReadyStockAdjustmentsModule in imports array of apps/backend/src/app.module.ts
- [x] T013 Add React Router routes for /sorting (SortingListPage), /sorting/new (SortingFormPage), /sorting/:id (SortingDetailPage), /ready-stock (ReadyStockPage) in apps/frontend/src/App.tsx (or equivalent router config file — check existing routing pattern)

**Checkpoint**: All modules registered, router configured — stories can proceed in parallel

---

## Phase 3: User Story 1 — Registrar Triagem (Priority: P1) 🎯 MVP

**Goal**: Triador registers a sorting operation consuming raw stock and generating ready stock — the core operational flow.

**Independent Test**: POST /sorting-operations with 90 kg PET input, 80 kg PET Cristal output, 5 kg rejeito → 201, saldo bruto -90 kg, saldo pronto +80 kg, PERDA_INERENTE 5 kg auto-created.

### Integration Tests for US1

> Write these tests FIRST. They will fail until implementation is complete.

- [x] T014 Write integration test file apps/backend/test/integration/sorting-operations.spec.ts covering: POST with sufficient stock → 201 + correct balances; POST with insufficient stock → 409 INSUFFICIENT_RAW_STOCK; POST with sum exceeding processedQuantity → 422 OUTPUTS_SUM_EXCEEDS_PROCESSED; POST where sum < processedQuantity → PERDA_INERENTE auto-created; GET /sorting-operations with pagination and filters; GET /sorting-operations/:id with full output/reject detail

### Implementation for US1

- [x] T015 [P] Create apps/backend/src/modules/sorting-operations/dto/create-sorting-operation.dto.ts with @IsUUID, @IsPositive, @ValidateNested, @Type decorators for subcategoryId, unitId, processedQuantity; outputs[]: @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) — ao menos 1 output obrigatório per contract; rejects[]: @IsOptional() @IsArray() @ValidateNested({ each: true }) — lista opcional, pode ser vazia; nested DTOs: CreateSortingOutputDto, CreateSortingRejectDto com @IsNotEmpty() em description quando subcategoryId ausente
- [x] T016 Implement SortingOperationsService in apps/backend/src/modules/sorting-operations/sorting-operations.service.ts: create() using prisma.$transaction — read raw balance within tx, throw 409 if insufficient, validate sum ≤ processedQuantity, create SortingOperation + SortingOutputs + SortingRejects + PERDA_INERENTE if gap exists + RawMaterialStockEvent(SAIDA_TRIAGEM, negative qty) + ReadyStockEvent(TRIAGEM_OUTPUT) per output; also implement findAll() with pagination/filters and findOne() with full includes
- [x] T017 Implement SortingOperationsController in apps/backend/src/modules/sorting-operations/sorting-operations.controller.ts: POST /, GET /, GET /:id with @RequirePermission(SORTING, CREATE/READ), @AuditEntity('sortingOperation'), JWT guard, and response serialization matching contract in contracts/sorting-operations.md
- [x] T018 [P] Create apps/frontend/src/pages/sorting/SortingListPage.tsx: table/list of sorting operations with filters (subcategory, status, date range), pagination, loading skeleton, empty state, link to detail page
- [x] T019 [P] Create apps/frontend/src/pages/sorting/SortingDetailPage.tsx: display SortingOperation detail — subcategory, processedQuantity, outputs[] table, rejects[] table (showing PERDA_INERENTE distinctly), user, timestamp, status badge; loading and not-found states
- [x] T020 Create apps/frontend/src/pages/sorting/SortingFormPage.tsx: form with material bruto selector (autocomplete/select), processedQuantity field, dynamic outputs[] array (add/remove rows: subcategory + quantity), optional rejects[] array (add/remove rows: type + subcategory optional + quantity + description), form validation, submit calls sortingService.createSortingOperation(); on success navigate to SortingDetailPage (or list) with the newly created id — dados já atualizados via navegação, sem polling/WebSocket (SC-002)
- [x] T021 Create apps/frontend/src/services/sorting.service.ts implementing createSortingOperation(dto), listSortingOperations(filters), getSortingOperation(id) with API calls to /sorting-operations endpoints
- [x] T022 Run US1 integration tests checkpoint: `npx -w apps/backend jest --runInBand test/integration/sorting-operations.spec.ts` — all create and read scenarios must pass

**Checkpoint**: US1 fully functional — triagem creates, debits raw stock, credits ready stock, PERDA_INERENTE auto-created

---

## Phase 4: User Story 2 — Consultar Estoque Pronto (Priority: P1)

**Goal**: Manager views current ready stock balances by material and movement history with filters.

**Independent Test**: GET /ready-stock → balance per subcategory with SUM(quantity); GET /ready-stock/movements?type=TRIAGEM_OUTPUT → list with user, timestamp, quantity; empty state when no events.

### Integration Tests for US2

> Write these tests FIRST. They will fail until implementation is complete.

- [x] T023 Write integration test file apps/backend/test/integration/ready-stock.spec.ts covering: GET /ready-stock returns aggregated balances after sorting operation; GET /ready-stock/movements returns paginated events with type/subcategory/date filters; empty state when no events registered; SORTER can read (200), unauthenticated gets 401

### Implementation for US2

- [x] T024 Implement ReadyStockService in apps/backend/src/modules/ready-stock/ready-stock.service.ts: getBalance() using prisma.readyStockEvent.groupBy(['subcategoryId','unitId'], _sum:{quantity:true}) with subcategory/unit includes and optional filters; getMovements() with pagination, type/subcategory/unit/date filters and user include
- [x] T025 Implement ReadyStockController in apps/backend/src/modules/ready-stock/ready-stock.controller.ts: GET /ready-stock and GET /ready-stock/movements with @RequirePermission(READY_STOCK, READ), query param parsing, response matching contract in contracts/ready-stock.md
- [x] T026 [P] Create apps/frontend/src/pages/ready-stock/ReadyStockPage.tsx: balance table (subcategory, unit, balance, eventCount) with subcategory/unit filters, collapsible/tabbed movements history section with type/date filters, type badges (TRIAGEM_OUTPUT/AJUSTE/ESTORNO), loading and empty states, button to open ReadyStockAdjustmentModal (to be implemented in US3)
- [x] T027 [P] Add getReadyStockBalance(filters), getReadyStockMovements(filters) to apps/frontend/src/services/readyStock.service.ts
- [x] T028 Run US2 integration tests checkpoint: `npx -w apps/backend jest --runInBand test/integration/ready-stock.spec.ts`

**Checkpoint**: US2 fully functional — manager can view stock balances and movement history independently

---

## Phase 5: User Story 3 — Ajuste Auditado de Estoque Pronto (Priority: P2)

**Goal**: Manager registers a manual audited adjustment to ready stock balance with mandatory justification.

**Independent Test**: POST /ready-stock-adjustments with quantity=-5 and justification → 201, balance updated, AJUSTE event in history. POST without justification → 422. POST causing negative balance → 409.

### Integration Tests for US3

> Write these tests FIRST. They will fail until implementation is complete.

- [x] T029 Write integration test file apps/backend/test/integration/ready-stock-adjustments.spec.ts covering: POST without justification → 422 JUSTIFICATION_REQUIRED; POST with quantity=0 → 422 QUANTITY_CANNOT_BE_ZERO; POST where balance would go negative → 409 ADJUSTMENT_WOULD_CAUSE_NEGATIVE_BALANCE; valid negative adjustment → 201, balance updated, ReadyStockEvent(AJUSTE) created; valid positive adjustment → 201; SORTER role → 403; GET /ready-stock-adjustments → paginated list

### Implementation for US3

- [x] T030 [P] Create apps/backend/src/modules/ready-stock-adjustments/dto/create-ready-stock-adjustment.dto.ts with @IsUUID (subcategoryId, unitId), @IsNotEmpty (justification), @IsNumber + custom validator for quantity≠0
- [x] T031 Implement ReadyStockAdjustmentsService in apps/backend/src/modules/ready-stock-adjustments/ready-stock-adjustments.service.ts: create() using prisma.$transaction — read current balance, throw 409 if quantity<0 and balance+quantity<0, create ReadyStockAdjustment + ReadyStockEvent(AJUSTE, signed quantity); findAll() with pagination/filters
- [x] T032 Implement ReadyStockAdjustmentsController in apps/backend/src/modules/ready-stock-adjustments/ready-stock-adjustments.controller.ts: POST /ready-stock-adjustments and GET /ready-stock-adjustments with @RequirePermission(READY_STOCK, CREATE_ADJUSTMENT / READ), @AuditEntity('readyStockAdjustment'), response matching contract in contracts/ready-stock.md
- [x] T033 [P] Create apps/frontend/src/pages/ready-stock/ReadyStockAdjustmentModal.tsx: modal form with subcategory selector, unit display, quantity input (signed — negative for deductions), required justification textarea, validation (no empty justification, no zero quantity), submit calls readyStockService.createAdjustment(), closes modal and refreshes balance on success
- [x] T034 [P] Add createAdjustment(dto), listAdjustments(filters) to apps/frontend/src/services/readyStock.service.ts; wire ReadyStockAdjustmentModal into ReadyStockPage button (from US2)
- [x] T035 Run US3 integration tests checkpoint: `npx -w apps/backend jest --runInBand test/integration/ready-stock-adjustments.spec.ts`

**Checkpoint**: US3 fully functional — audited adjustments update balance and appear in movement history

---

## Phase 6: User Story 4 — Cancelar Triagem (Priority: P3)

**Goal**: Manager cancels a CONCLUIDA sorting operation, fully reversing all stock impacts atomically.

**Independent Test**: DELETE /sorting-operations/:id with cancelReason → 200, status CANCELADA, raw stock restored, ready stock decremented. Blocked if reversal would cause negative ready stock.

### Integration Tests for US4

> Write these tests FIRST, appended to existing spec file. They will fail until implementation is complete.

- [x] T036 Add cancel scenarios to apps/backend/test/integration/sorting-operations.spec.ts: DELETE /:id with valid cancelReason → 200, status CANCELADA, raw stock event ESTORNO_TRIAGEM created, ready stock ESTORNO events created; DELETE /:id when reversal causes negative ready stock → 409 CANCELLATION_WOULD_CAUSE_NEGATIVE_READY_STOCK; DELETE /:id on already-cancelled operation → 409 SORTING_ALREADY_CANCELLED; SORTER role on DELETE → 403; cancelledBy/cancelledAt/cancelReason present in GET /:id after cancel

### Implementation for US4

- [x] T037 [P] Create apps/backend/src/modules/sorting-operations/dto/cancel-sorting-operation.dto.ts with cancelReason field: @IsString(), @IsNotEmpty()
- [x] T038 Implement SortingOperationsService.cancel() in apps/backend/src/modules/sorting-operations/sorting-operations.service.ts: prisma.$transaction — load operation with outputs, throw 409 if status≠CONCLUIDA or SORTING_ALREADY_CANCELLED, for each SortingOutput compute current ready balance and throw 409 if balance-output.quantity<0, create ReadyStockEvent(ESTORNO, -output.quantity) per output, create RawMaterialStockEvent(ESTORNO_TRIAGEM, +processedQuantity), update SortingOperation status to CANCELADA with cancelReason, cancelledById (from JWT user), cancelledAt=now()
- [x] T039 Add DELETE /sorting-operations/:id endpoint to SortingOperationsController in apps/backend/src/modules/sorting-operations/sorting-operations.controller.ts with @RequirePermission(SORTING, CANCEL) and @Body() cancelDto, response matching cancel contract in contracts/sorting-operations.md
- [x] T040 Add cancel flow to apps/frontend/src/pages/sorting/SortingDetailPage.tsx: show "Cancelar Triagem" button only when status=CONCLUIDA and user has SORTING:CANCEL permission (MANAGER/ADMIN); confirmation dialog with required cancelReason textarea; on confirm calls sortingService.cancelSortingOperation(); on success redirect to list or refresh showing CANCELADA status with cancelReason/cancelledBy/cancelledAt
- [x] T041 Add cancelSortingOperation(id, cancelReason) to apps/frontend/src/services/sorting.service.ts calling DELETE /sorting-operations/:id
- [x] T042 Run US4 integration tests checkpoint: `npx -w apps/backend jest --runInBand test/integration/sorting-operations.spec.ts`

**Checkpoint**: All 4 user stories independently functional and testable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Type safety validation, UX completeness, and end-to-end verification

- [x] T043 [P] Run type checks across both apps: `npx -w apps/backend tsc --noEmit` and `npx -w apps/frontend tsc --noEmit` — zero errors required
- [x] T044 [P] Audit all 5 frontend pages/components (SortingListPage, SortingFormPage, SortingDetailPage, ReadyStockPage, ReadyStockAdjustmentModal) for: loading skeleton/spinner on async operations, error boundary or error message on API failure, explicit empty state when list is empty (FR-018)
- [x] T045 Run full integration suite for the feature: `npx -w apps/backend jest --runInBand test/integration/sorting-operations.spec.ts test/integration/ready-stock.spec.ts test/integration/ready-stock-adjustments.spec.ts`
- [x] T046 Execute all 7 quickstart.md validation scenarios from specs/006-triagem-estoque-pronto/quickstart.md end-to-end with running backend and frontend

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — no dependency on other stories
- **US2 (Phase 4)**: Depends on Phase 2 — no code dependency on US1 (reads ReadyStockEvent table directly); can proceed in parallel with US1
- **US3 (Phase 5)**: Depends on Phase 2 — no code dependency on US1/US2; can proceed in parallel; ReadyStockAdjustmentModal integrates into ReadyStockPage (soft US2 dependency)
- **US4 (Phase 6)**: Depends on US1 completion (cancel method extends the same service); logically requires existing SortingOperations
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational → start; no story prerequisite
- **US2 (P1)**: Foundational → start; independent of US1 code (reads shared ReadyStockEvent table)
- **US3 (P2)**: Foundational → start; independent of US1/US2 code
- **US4 (P3)**: US1 complete → start (cancel extends sorting-operations service/controller)

### Within Each User Story

1. Write integration test file (tests will fail)
2. Create DTO(s) (can be parallel with test writing)
3. Implement service methods (depends on schema + DTO)
4. Implement controller (depends on service)
5. Create frontend service + pages/components (can be parallel with backend controller)
6. Run integration tests to verify

### Parallel Opportunities

- Phase 2: T010, T011 can run in parallel with T009 (different module directories)
- US1: T015 (DTO) parallel with T014 (write tests); T018 and T019 (two frontend pages) parallel with each other
- US2: T026 (frontend page) parallel with T027 (frontend service methods)
- US3: T030 (DTO) parallel with T029 (write tests); T033 (modal) parallel with T034 (service methods)
- US4: T037 (cancel DTO) parallel with T036 (write tests)
- Phase 7: T043 and T044 fully parallel

---

## Parallel Example: User Story 1

```bash
# Write tests + DTO simultaneously:
Task T014: Write apps/backend/test/integration/sorting-operations.spec.ts
Task T015: Create apps/backend/src/modules/sorting-operations/dto/create-sorting-operation.dto.ts

# After service is done — frontend pages simultaneously:
Task T018: Create apps/frontend/src/pages/sorting/SortingListPage.tsx
Task T019: Create apps/frontend/src/pages/sorting/SortingDetailPage.tsx
```

## Parallel Example: User Story 2 + 3 (after US1 complete)

```bash
# US2 backend + US3 backend simultaneously (different modules):
Task T024: Implement ReadyStockService
Task T031: Implement ReadyStockAdjustmentsService

# US2 frontend + US3 frontend simultaneously:
Task T026: Create ReadyStockPage.tsx
Task T033: Create ReadyStockAdjustmentModal.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Schema setup (T001–T008)
2. Complete Phase 2: Module scaffolding (T009–T013)
3. Complete Phase 3: US1 — core sorting flow (T014–T022)
4. **STOP and VALIDATE**: Run T022, confirm saldos via quickstart Cenários 1–3
5. Deploy/demo MVP: triador can register sorting operations

### Incremental Delivery

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 (US1) → MVP: sorting operations work end-to-end
3. Phase 4 (US2) → Manager visibility: ready stock dashboard
4. Phase 5 (US3) → Operations: audited adjustments
5. Phase 6 (US4) → Corrections: cancel with full reversal
6. Phase 7 → Polish and final validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Phase 1 + Phase 2 together
2. Once Phase 2 is done:
   - Developer A: US1 (sorting operations — core flow)
   - Developer B: US2 (ready stock queries)
   - Developer C: US3 (adjustments)
3. Developer A continues with US4 (cancel) after US1 complete
4. Team converges on Phase 7 polish

---

## Notes

- All tests use `npx -w apps/backend jest --runInBand <spec-file>` per test policy (never full suite unless global change)
- [P] tasks = different files, no shared dependencies — safe to run in parallel
- [Story] label maps each task to a specific user story for traceability
- The AuditInterceptor pattern: apply `@AuditEntity('entityName')` at controller method level (see research.md §9)
- The RawMaterialBalanceService pattern: read raw balance inside `$transaction` to avoid race conditions (see research.md §10)
- `PERDA_INERENTE` is auto-created by the system only — never accepted from request body (see research.md §4)
- Commit after each task or checkpoint phase to maintain reversibility
