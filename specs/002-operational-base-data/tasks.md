# Tasks: Fase 2 — Cadastros Base Operacionais

**Branch**: `002-operational-base-data` | **Created**: 2026-06-29

**Input**: Design documents from `specs/002-operational-base-data/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/rest-api.md ✅ | quickstart.md ✅

**Tests**: Incluídos — exigidos por SC-003 ("100% dos endpoints mutáveis retornam 403") e SC-004 ("audit log registra previousState não-nulo em 100% das atualizações"), ambos verificáveis por testes de integração.

**Organization**: Tarefas agrupadas por user story. US1–US3 (P1) formam o MVP core. US4–US5 (P2) e US6–US7 (P3) estendem o cadastro.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[Story]**: User story à qual a tarefa pertence (US1–US7)
- Todos os caminhos de arquivo são relativos à raiz do repositório

---

## Phase 1: Schema & Migration

**Purpose**: Extender o schema Prisma com todas as entidades da Fase 2 e aplicar a migration. DEVE ser concluída antes de qualquer trabalho em módulo backend.

- [X] T00Add 9 new models (MemberRole, Member, MaterialCategory, MaterialSubcategory, UnitOfMeasure, Buyer, Vehicle, EpiType, CostCenter) and 2 enums (VehicleType, DocumentType) to apps/backend/prisma/schema.prisma following specs/002-operational-base-data/data-model.md
- [X] T00Run `npx -w apps/backend prisma migrate dev --name phase2-operational-base-data` and verify migration applies cleanly against the dev database

**Checkpoint**: `npx -w apps/backend prisma studio` must show all 9 new tables with correct columns and FK relationships.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Validadores compartilhados e dados de seed que múltiplas user stories dependem.

**⚠️ CRÍTICO**: Concluir antes de iniciar qualquer módulo. Nenhuma user story pode começar sem esta fase.

- [X] T00[P] Create @IsCPF() custom class-validator decorator in apps/backend/src/common/validators/cpf.validator.ts implementing CPF format check ("000.000.000-00") and modulo-11 check digit algorithm
- [X] T00[P] Create @IsCNPJ() custom class-validator decorator in apps/backend/src/common/validators/cnpj.validator.ts implementing CNPJ format check ("00.000.000/0000-00") and check digit algorithm
- [X] T00Update apps/backend/prisma/seeds/seed.ts: (a) add 5 default MemberRoles (Triador, Motorista, Cooperado Geral, Coordenador, Outro) with isDefault:true; (b) add RBAC Permission entries for ADMIN profile (MANAGE on MEMBER_ROLES, MEMBERS, MATERIALS, UNITS, BUYERS, VEHICLES, EPI_TYPES, COST_CENTERS) and MANAGER profile (MANAGE on MEMBERS, BUYERS, VEHICLES; READ on MEMBER_ROLES, MATERIALS, UNITS, EPI_TYPES, COST_CENTERS)

**Checkpoint**: `npx -w apps/backend prisma db seed` completes without errors. DB shows 5 MemberRoles with isDefault:true and correct Permission entries per profile.

---

## Phase 3: US1 — Cooperados + Funções de Cooperado (Priority: P1) 🎯 MVP

**Goal**: ADMIN e MANAGER podem gerenciar funções de cooperado e cooperados com validação de CPF, controle de status e vinculação opcional de usuário de acesso.

**Independent Test**: Criar função "Triador", criar cooperada "Maria Santos" com CPF válido e função, inativar a cooperada, verificar que ela não aparece em listagens com `?status=active`. Fluxo completo sem qualquer outro módulo da Fase 2.

### Backend — Member Roles

- [X] T00[P] [US1] Create apps/backend/src/modules/member-roles/dto/create-member-role.dto.ts (name: string, required, @IsNotEmpty) and apps/backend/src/modules/member-roles/dto/update-member-role.dto.ts (name?: string, isActive?: boolean)
- [X] T00[P] [US1] Create apps/backend/src/modules/member-roles/member-roles.service.ts: list with page/limit/search (by name)/status params; create enforces name uniqueness (throw 409 MEMBER_ROLE_NAME_CONFLICT); patch enforces name uniqueness and blocks rename of isDefault roles (throw 422 if isDefault and name is changing)
- [X] T00[US1] Create apps/backend/src/modules/member-roles/member-roles.controller.ts with @AuditEntity('memberRole'), @UseInterceptors(AuditInterceptor), @RequirePermission('MEMBER_ROLES', Action.READ/MANAGE) on each route; create apps/backend/src/modules/member-roles/member-roles.module.ts and add MemberRolesModule to imports in apps/backend/src/app.module.ts

### Backend — Members

- [X] T00[P] [US1] Create apps/backend/src/modules/members/dto/create-member.dto.ts (name: string, cpf: string @IsCPF(), phone: string, email?: string, admittedAt: string @IsDateString(), roleId: string @IsUUID(), notes?: string) and apps/backend/src/modules/members/dto/update-member.dto.ts (all fields optional via PartialType) and apps/backend/src/modules/members/dto/link-user.dto.ts (userId: string | null)
- [X] T010 [P] [US1] Create apps/backend/src/modules/members/members.service.ts: list with page/limit/search (name, cpf, phone, email)/status; create enforces CPF uniqueness (409 MEMBER_CPF_CONFLICT) and active roleId (400 MEMBER_ROLE_INACTIVE); patch same validations; linkUser validates user exists, has no memberId conflict and no buyerId conflict (User must not be linked to another Member or Buyer)
- [X] T011 [US1] Create apps/backend/src/modules/members/members.controller.ts with @AuditEntity('member'), @UseInterceptors(AuditInterceptor), RBAC MEMBERS; PATCH /:id/link-user as separate route; create apps/backend/src/modules/members/members.module.ts and add MembersModule to apps/backend/src/app.module.ts

### Integration Tests — US1

- [X] T012 [P] [US1] Create apps/backend/test/integration/member-roles.spec.ts: ADMIN creates role (201); MANAGER create returns 403; isDefault role: patch name returns 422; inactive role used in new member returns 400; list returns paginated envelope {data, total, page, limit}
- [X] T013 [P] [US1] Create apps/backend/test/integration/members.spec.ts: ADMIN creates member (201); duplicate CPF returns 409; invalid CPF check digit returns 400; MANAGER creates member (201); user without permission returns 403; PATCH sets previousState non-null in AuditLog (SC-004); inactivated member hidden from ?status=active list (SC-002); link-user already linked to another member returns 409

### Frontend — US1

- [X] T014 [P] [US1] Create apps/frontend/src/services/memberRoles.service.ts and apps/frontend/src/services/members.service.ts (API clients: list with pagination params, getById, create, update, linkUser using React Query or fetch wrapper consistent with Fase 1 pattern)
- [X] T015 [P] [US1] Create apps/frontend/src/pages/member-roles/MemberRoleListPage.tsx (paginated table, search input, status filter active/inactive/all, toggle activate/deactivate with permission guard) and apps/frontend/src/pages/member-roles/MemberRoleFormPage.tsx (create/edit form, disable rename for isDefault roles)
- [X] T016 [P] [US1] Create apps/frontend/src/pages/members/MemberListPage.tsx (paginated, search, status filter) and apps/frontend/src/pages/members/MemberFormPage.tsx (CPF masked input, role selector showing only active MemberRoles, admittedAt date input) and apps/frontend/src/pages/members/LinkUserModal.tsx (search user by email, show current link, allow unlink)
- [X] T017 [US1] Register routes /member-roles and /members in apps/frontend/src/router/index.tsx; add sidebar entries with visibility controlled by MEMBER_ROLES and MEMBERS permissions

**Checkpoint**: ADMIN pode completar ciclo completo: criar função → criar cooperado → inativar cooperado → verificar ocultação na listagem ativa. MANAGER vê member roles mas não consegue criar; MANAGER pode criar/inativar membros.

---

## Phase 4: US2 — Materiais: Categorias e Subcategorias (Priority: P1)

**Goal**: ADMIN pode gerenciar a hierarquia de materiais recicláveis. MANAGER tem apenas leitura. Inativação de categoria com subcategorias ativas é bloqueada com mensagem clara listando os itens impedidores.

**Independent Test**: Criar categoria "Plástico", criar subcategoria "PET" vinculada, tentar inativar "Plástico" (deve falhar com lista de subcategorias), inativar "PET" primeiro, inativar "Plástico" (deve funcionar).

**Note**: Frontend de MaterialSubcategory (campo defaultUnit) renderiza melhor após US3 (Units) estar disponível — mas backend pode ser implementado em paralelo.

### Backend — Material Categories

- [X] T018 [P] [US2] Create apps/backend/src/modules/material-categories/dto/create-material-category.dto.ts (name: string, description?: string) and apps/backend/src/modules/material-categories/dto/update-material-category.dto.ts (all optional, isActive?: boolean)
- [X] T019 [P] [US2] Create apps/backend/src/modules/material-categories/material-categories.service.ts: list with page/limit/search/status and optional includeSubcategories query; create enforces name uniqueness (409 CATEGORY_NAME_CONFLICT); patch: on isActive:false, count active subcategories and throw 422 CANNOT_DEACTIVATE_CATEGORY_WITH_ACTIVE_SUBCATEGORIES with details:[subcategoryNames] array if any exist
- [X] T020 [US2] Create apps/backend/src/modules/material-categories/material-categories.controller.ts with @AuditEntity('materialCategory'), @UseInterceptors(AuditInterceptor), RBAC MATERIALS; create material-categories.module.ts and add MaterialCategoriesModule to apps/backend/src/app.module.ts

### Backend — Material Subcategories

- [X] T021 [P] [US2] Create apps/backend/src/modules/material-subcategories/dto/create-material-subcategory.dto.ts (categoryId: UUID, name: string, defaultUnitId: UUID, isSellable: boolean, acceptsStock: boolean, notes?: string) and apps/backend/src/modules/material-subcategories/dto/update-material-subcategory.dto.ts (all optional)
- [X] T022 [P] [US2] Create apps/backend/src/modules/material-subcategories/material-subcategories.service.ts: list with page/limit/categoryId filter/search/status; create enforces name uniqueness within same categoryId (409 SUBCATEGORY_NAME_CONFLICT_IN_CATEGORY) and validates defaultUnitId references an active UnitOfMeasure (400 UNIT_INACTIVE); patch same validations
- [X] T023 [US2] Create apps/backend/src/modules/material-subcategories/material-subcategories.controller.ts with @AuditEntity('materialSubcategory'), @UseInterceptors(AuditInterceptor), RBAC MATERIALS; create material-subcategories.module.ts and add MaterialSubcategoriesModule to apps/backend/src/app.module.ts

### Integration Tests — US2

- [X] T024 [P] [US2] Create apps/backend/test/integration/material-categories.spec.ts: MANAGER create returns 403; deactivating category with active subcategory returns 422 with subcategory names in details array; deactivating after subcategories inactivated succeeds; duplicate name returns 409; previousState non-null on PATCH
- [X] T025 [P] [US2] Create apps/backend/test/integration/material-subcategories.spec.ts: same name allowed in different category; same name in same category returns 409; inactive defaultUnitId returns 400; inactive subcategory absent from ?status=active list; MANAGER create returns 403

### Frontend — US2

- [X] T026 [P] [US2] Create apps/frontend/src/services/materialCategories.service.ts and apps/frontend/src/services/materialSubcategories.service.ts (list, create, update; materialCategories supports includeSubcategories param)
- [X] T027 [P] [US2] Create apps/frontend/src/pages/material-categories/MaterialCategoryListPage.tsx (paginated list, expandable rows showing subcategories when includeSubcategories=true, search, status filter) and apps/frontend/src/pages/material-categories/MaterialCategoryFormPage.tsx (create/edit; display 422 error with subcategory names when blocking deactivation)
- [X] T028 [P] [US2] Create apps/frontend/src/pages/material-subcategories/MaterialSubcategoryListPage.tsx and apps/frontend/src/pages/material-subcategories/MaterialSubcategoryFormPage.tsx (category selector, defaultUnit selector showing only active units from units API, isSellable/acceptsStock toggles)
- [X] T029 [US2] Register routes /material-categories and /material-subcategories in apps/frontend/src/router/index.tsx; add sidebar entries with MATERIALS permission visibility

**Checkpoint**: ADMIN pode criar hierarquia completa (categoria → subcategoria) e verificar bloqueio na inativação de categoria com filhos ativos.

---

## Phase 5: US3 — Unidades de Medida (Priority: P1)

**Goal**: ADMIN pode gerenciar unidades com conversão opcional. MANAGER somente leitura. Auto-referência bloqueada. Par baseUnitId + conversionFactor obrigatório ou ambos ausentes.

**Independent Test**: Criar "Quilograma" (sem conversão), criar "Tonelada" com baseUnit=kg e factor=1000, criar "Saco" (sem conversão). Verificar auto-referência bloqueada.

**Note**: US2 frontend (defaultUnit selector) e US5 frontend (capacityUnit selector) dependem desta fase para estar completa.

### Backend — Units of Measure

- [X] T030 [P] [US3] Create apps/backend/src/modules/units/dto/create-unit.dto.ts (name: string, symbol: string, baseUnitId?: UUID, conversionFactor?: number) and apps/backend/src/modules/units/dto/update-unit.dto.ts (all optional); add cross-field @ValidateIf / custom @ValidateTogether decorator ensuring baseUnitId and conversionFactor are both present or both absent
- [X] T031 [P] [US3] Create apps/backend/src/modules/units/units.service.ts: list with page/limit/search (name, symbol)/status; create enforces name uniqueness (409 UNIT_NAME_CONFLICT), symbol uniqueness (409 UNIT_SYMBOL_CONFLICT), self-reference check (400 UNIT_SELF_REFERENCE), conversion pair validation (400 if only one of the pair provided); patch same
- [X] T032 [US3] Create apps/backend/src/modules/units/units.controller.ts with @AuditEntity('unitOfMeasure'), @UseInterceptors(AuditInterceptor), RBAC UNITS; create units.module.ts and add UnitsModule to apps/backend/src/app.module.ts

### Integration Tests — US3

- [X] T033 [P] [US3] Create apps/backend/test/integration/units.spec.ts: self-reference returns 400; conversionFactor without baseUnitId returns 400; baseUnitId without conversionFactor returns 400; duplicate name returns 409; duplicate symbol returns 409; MANAGER create returns 403; unit without conversion created (201) with null conversionFactor; baseUnit nested in list response

### Frontend — US3

- [X] T034 [P] [US3] Create apps/frontend/src/services/units.service.ts (list with pagination, create, update)
- [X] T035 [P] [US3] Create apps/frontend/src/pages/units/UnitListPage.tsx (paginated list showing name, symbol, baseUnit.symbol, conversionFactor, status) and apps/frontend/src/pages/units/UnitFormPage.tsx (conditional conversion section: show conversionFactor input only when baseUnit is selected; clear both fields when baseUnit cleared)
- [X] T036 [US3] Register route /units in apps/frontend/src/router/index.tsx; add sidebar entry with UNITS permission visibility

**Checkpoint**: Todas as três variações de unidade (base, derivada, autônoma) podem ser criadas e listadas. Auto-referência rejeitada na UI com mensagem clara.

---

## Phase 6: US4 — Compradores (Priority: P2)

**Goal**: ADMIN e MANAGER podem gerenciar compradores (PF e PJ) com validação de CPF/CNPJ e vinculação opcional de usuário com perfil BUYER.

**Independent Test**: Criar comprador com CNPJ, tentar CNPJ duplicado (deve falhar), inativar comprador, verificar ausência na listagem ativa. Sem dependência de outras user stories.

### Backend — Buyers

- [X] T037 [P] [US4] Create apps/backend/src/modules/buyers/dto/create-buyer.dto.ts (legalName, documentType: DocumentType enum, documentNumber: string with @IsCPF() or @IsCNPJ() conditional on documentType, phone?, email?, addressStreet?, addressNumber?, addressComplement?, addressCity?, addressState?, addressZip?, notes?) and apps/backend/src/modules/buyers/dto/update-buyer.dto.ts (all optional) and apps/backend/src/modules/buyers/dto/link-user.dto.ts (userId: string | null)
- [X] T038 [P] [US4] Create apps/backend/src/modules/buyers/buyers.service.ts: list with page/limit/search (legalName, documentNumber, phone, email)/status; create enforces documentNumber uniqueness across all buyers (409 BUYER_DOCUMENT_CONFLICT) and validates document format matches documentType; linkUser validates user exists, has BUYER profile (422 USER_NOT_BUYER_PROFILE if profile is not BUYER), is not already linked to another Buyer (409 USER_ALREADY_LINKED), and is not already linked to a Member (409 USER_ALREADY_LINKED_TO_MEMBER)
- [X] T039 [US4] Create apps/backend/src/modules/buyers/buyers.controller.ts with @AuditEntity('buyer'), @UseInterceptors(AuditInterceptor), RBAC BUYERS; add PATCH /:id/link-user route; create buyers.module.ts and add BuyersModule to apps/backend/src/app.module.ts

### Integration Tests — US4

- [X] T040 [P] [US4] Create apps/backend/test/integration/buyers.spec.ts: duplicate documentNumber returns 409; invalid CNPJ check digit returns 400; invalid CPF check digit returns 400; link-user with non-BUYER profile returns 422 USER_NOT_BUYER_PROFILE; link-user already linked to another Buyer returns 409 USER_ALREADY_LINKED; link-user already linked to a Member returns 409 USER_ALREADY_LINKED_TO_MEMBER; user without BUYERS permission returns 403; MANAGER creates buyer (201); inactivation removes from ?status=active list; previousState non-null on PATCH

### Frontend — US4

- [X] T041 [P] [US4] Create apps/frontend/src/services/buyers.service.ts (list, getById, create, update, linkUser)
- [X] T042 [P] [US4] Create apps/frontend/src/pages/buyers/BuyerListPage.tsx (paginated, search, status filter) and apps/frontend/src/pages/buyers/BuyerFormPage.tsx (documentType radio CPF/CNPJ with conditional mask on documentNumber field, address fields in collapsible section, link-user modal showing user search by email)
- [X] T043 [US4] Register route /buyers in apps/frontend/src/router/index.tsx; add sidebar entry with BUYERS permission visibility

**Checkpoint**: Ciclo completo (criar comprador com CNPJ → vincular usuário BUYER → inativar → verificar ocultação) funciona end-to-end.

---

## Phase 7: US5 — Veículos (Priority: P2)

**Goal**: ADMIN e MANAGER podem cadastrar veículos com capacidade estruturada (valor + FK para UnitOfMeasure). Par capacityValue + capacityUnitId obrigatório ou ambos ausentes.

**Independent Test**: Criar caminhão "ABC-1234" com capacidade 9000 kg, tentar placa duplicada (fail), tentar capacityValue sem capacityUnitId (fail 400), inativar veículo, verificar ausência na listagem ativa.

**Dependency**: Frontend de veículo requer lista de unidades ativas (US3) para o seletor de capacityUnit.

### Backend — Vehicles

- [X] T044 [P] [US5] Create apps/backend/src/modules/vehicles/dto/create-vehicle.dto.ts (plate: string @Matches(/^[A-Z]{3}-[0-9]{4}$|^[A-Z]{3}-[0-9][A-Z][0-9]{2}$/), type: VehicleType enum, model: string, capacityValue?: number, capacityUnitId?: UUID, capacityNotes?: string, notes?) and apps/backend/src/modules/vehicles/dto/update-vehicle.dto.ts; cross-field: capacityValue and capacityUnitId both present or both absent
- [X] T045 [P] [US5] Create apps/backend/src/modules/vehicles/vehicles.service.ts: list with page/limit/search (plate, model, type)/status; findOne (throws 404 VEHICLE_NOT_FOUND if absent); create enforces plate uniqueness (409 VEHICLE_PLATE_CONFLICT), capacity pair validation (400 CAPACITY_UNIT_REQUIRED_WITH_VALUE), active unit check on capacityUnitId (400 UNIT_INACTIVE); patch same validations (existing vehicles preserve FK if unit later inactivated)
- [X] T046 [US5] Create apps/backend/src/modules/vehicles/vehicles.controller.ts with @AuditEntity('vehicle'), @UseInterceptors(AuditInterceptor), RBAC VEHICLES; expose GET /:id (VEHICLES:READ) calling findOne with 404 on miss; create vehicles.module.ts and add VehiclesModule to apps/backend/src/app.module.ts

### Integration Tests — US5

- [X] T047 [P] [US5] Create apps/backend/test/integration/vehicles.spec.ts: duplicate plate returns 409; capacityValue without capacityUnitId returns 400; inactive unit as capacityUnitId on new vehicle returns 400; MANAGER creates vehicle (201); user without permission returns 403; inactivated vehicle hidden from ?status=active list; previousState non-null on PATCH

### Frontend — US5

- [X] T048 [P] [US5] Create apps/frontend/src/services/vehicles.service.ts (list, getById, create, update)
- [X] T049 [P] [US5] Create apps/frontend/src/pages/vehicles/VehicleListPage.tsx (paginated, search by plate/model/type, status filter, show capacity column as "9000 kg" when set) and apps/frontend/src/pages/vehicles/VehicleFormPage.tsx (vehicle type enum select, optional capacity section with value input + unit dropdown populated from units API ?status=active)
- [X] T050 [US5] Register route /vehicles in apps/frontend/src/router/index.tsx; add sidebar entry with VEHICLES permission visibility

**Checkpoint**: Veículo com e sem capacidade pode ser criado. Seletor de unidade usa lista ativa da Fase 5 (US3).

---

## Phase 8: US6 — Tipos de EPI (Priority: P3)

**Goal**: ADMIN pode cadastrar tipos de EPI com validade padrão opcional. MANAGER somente leitura. Nenhuma entrega de EPI implementada.

**Independent Test**: Criar "Luva de raspa" com 180 dias de validade, tentar nome duplicado (fail), inativar, verificar ausência na listagem ativa.

### Backend — EPI Types

- [ ] T051 [P] [US6] Create apps/backend/src/modules/epi-types/dto/create-epi-type.dto.ts (name: string, defaultValidityDays?: number @Min(1)) and apps/backend/src/modules/epi-types/dto/update-epi-type.dto.ts (name?, defaultValidityDays?, isActive?)
- [ ] T052 [P] [US6] Create apps/backend/src/modules/epi-types/epi-types.service.ts: list with page/limit/search (name)/status; findOne (throws 404 EPI_TYPE_NOT_FOUND if absent); create enforces name uniqueness (409 EPI_TYPE_NAME_CONFLICT); patch same
- [ ] T053 [US6] Create apps/backend/src/modules/epi-types/epi-types.controller.ts with @AuditEntity('epiType'), @UseInterceptors(AuditInterceptor), RBAC EPI_TYPES; expose GET /:id (EPI_TYPES:READ) calling findOne with 404 on miss; create epi-types.module.ts and add EpiTypesModule to apps/backend/src/app.module.ts

### Integration Tests — US6

- [ ] T054 [P] [US6] Create apps/backend/test/integration/epi-types.spec.ts: duplicate name returns 409; defaultValidityDays of 0 returns 400; MANAGER GET /epi-types returns 200 with paginated envelope {data, total, page, limit}; MANAGER GET /epi-types/:id returns 200; MANAGER create (POST) returns 403; MANAGER patch (PATCH) returns 403; ADMIN create returns 201; ADMIN GET /epi-types/:id returns 200; GET /epi-types/:id with unknown id returns 404 EPI_TYPE_NOT_FOUND; inactivated type absent from ?status=active list; previousState non-null on PATCH

### Frontend — US6

- [ ] T055 [P] [US6] Create apps/frontend/src/services/epiTypes.service.ts (list, create, update)
- [ ] T056 [P] [US6] Create apps/frontend/src/pages/epi-types/EpiTypeListPage.tsx (paginated, search, status filter, show defaultValidityDays as "180 dias" or "sem validade padrão") and apps/frontend/src/pages/epi-types/EpiTypeFormPage.tsx (optional validity field with min:1 hint)
- [ ] T057 [US6] Register route /epi-types in apps/frontend/src/router/index.tsx; add sidebar entry with EPI_TYPES permission visibility

**Checkpoint**: ADMIN cria tipo de EPI com e sem validade. MANAGER vê listagem mas recebe 403 ao tentar criar.

---

## Phase 9: US7 — Centros de Custo (Priority: P3)

**Goal**: ADMIN pode cadastrar centros de custo com código único opcional. MANAGER somente leitura. Nenhum lançamento financeiro implementado.

**Independent Test**: Criar "Logística" com código "LOG-001", tentar "log-001" (case-insensitive, deve falhar), inativar, verificar ausência na listagem ativa.

### Backend — Cost Centers

- [ ] T058 [P] [US7] Create apps/backend/src/modules/cost-centers/dto/create-cost-center.dto.ts (name: string, code?: string, description?: string) and apps/backend/src/modules/cost-centers/dto/update-cost-center.dto.ts (all optional, isActive?)
- [ ] T059 [P] [US7] Create apps/backend/src/modules/cost-centers/cost-centers.service.ts: list with page/limit/search (name, code)/status; findOne (throws 404 COST_CENTER_NOT_FOUND if absent); create enforces name uniqueness (409 COST_CENTER_NAME_CONFLICT) and code uniqueness case-insensitive when provided (409 COST_CENTER_CODE_CONFLICT); patch same
- [ ] T060 [US7] Create apps/backend/src/modules/cost-centers/cost-centers.controller.ts with @AuditEntity('costCenter'), @UseInterceptors(AuditInterceptor), RBAC COST_CENTERS; expose GET /:id (COST_CENTERS:READ) calling findOne with 404 on miss; create cost-centers.module.ts and add CostCentersModule to apps/backend/src/app.module.ts

### Integration Tests — US7

- [ ] T061 [P] [US7] Create apps/backend/test/integration/cost-centers.spec.ts: duplicate code case-insensitive returns 409; duplicate name returns 409; MANAGER GET /cost-centers returns 200 with paginated envelope {data, total, page, limit}; MANAGER GET /cost-centers/:id returns 200; MANAGER create (POST) returns 403; MANAGER patch (PATCH) returns 403; ADMIN create returns 201; ADMIN GET /cost-centers/:id returns 200; GET /cost-centers/:id with unknown id returns 404 COST_CENTER_NOT_FOUND; inactivated center absent from ?status=active list; previousState non-null on PATCH

### Frontend — US7

- [ ] T062 [P] [US7] Create apps/frontend/src/services/costCenters.service.ts (list, create, update)
- [ ] T063 [P] [US7] Create apps/frontend/src/pages/cost-centers/CostCenterListPage.tsx (paginated, search by name/code, status filter) and apps/frontend/src/pages/cost-centers/CostCenterFormPage.tsx (optional code field with uppercase hint)
- [ ] T064 [US7] Register route /cost-centers in apps/frontend/src/router/index.tsx; add sidebar entry with COST_CENTERS permission visibility

**Checkpoint**: ADMIN completa ciclo completo de centro de custo. MANAGER vê listagem mas não pode criar ou editar.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Infraestrutura de UI compartilhada e validação dos comportamentos transversais entre todas as user stories.

- [ ] T065 [P] Create shared apps/frontend/src/components/PaginatedList.tsx wrapper with built-in page/limit controls (prev/next buttons, page info), debounced search input (300ms delay), and status filter (active/inactive/all tabs or select) — to be used by all 9 listing pages replacing any ad-hoc implementations
- [ ] T066 [P] Audit sidebar navigation (apps/frontend/src/components/Sidebar.tsx or equivalent layout component): verify MANAGER sees structural modules (MEMBER_ROLES, MATERIALS, UNITS, EPI_TYPES, COST_CENTERS) in read-only mode (list link visible, no create button) and MANAGER sees operational modules (MEMBERS, BUYERS, VEHICLES) with full CRUD buttons
- [ ] T067 [P] Add HTTP 403 interceptor in apps/frontend/src/services/api.ts (or axios interceptor) showing a user-friendly "Sem permissão" toast/banner rather than blank page or raw JSON error
- [ ] T068 Run all backend integration tests: `npx -w apps/backend jest --runInBand --forceExit` and confirm 0 failures across all 9 new spec files
- [ ] T069 Run frontend typecheck: `npx -w apps/frontend tsc --noEmit` and confirm 0 type errors
- [ ] T070 Execute all scenarios from specs/002-operational-base-data/quickstart.md end-to-end and confirm each expected result matches

**Checkpoint**: Zero failing tests. Zero type errors. All quickstart.md scenarios pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Schema)**: Nenhuma dependência — pode começar imediatamente
- **Phase 2 (Foundational)**: Depende da Phase 1 — **BLOQUEIA** todas as user stories
- **Phase 3–9 (User Stories)**: Todas dependem da Phase 2; podem ser trabalhadas em paralelo entre si após Phase 2
- **Phase 10 (Polish)**: Após todas as user stories desejadas estarem completas

### User Story Dependencies

| Story | Dependência Backend | Dependência Frontend |
|---|---|---|
| US1 (Cooperados) | Nenhuma (após Phase 2) | Nenhuma |
| US2 (Materiais) | Nenhuma (após Phase 2) | US3 units list (seletor de unidade padrão em subcategoria) |
| US3 (Unidades) | Nenhuma (após Phase 2) | Nenhuma |
| US4 (Compradores) | Nenhuma (após Phase 2) | Nenhuma |
| US5 (Veículos) | Nenhuma (após Phase 2) | US3 units list (seletor de capacityUnit) |
| US6 (Tipos EPI) | Nenhuma (após Phase 2) | Nenhuma |
| US7 (Centros de Custo) | Nenhuma (após Phase 2) | Nenhuma |

### Dentro de Cada User Story

1. DTOs (marcados [P]) podem começar em paralelo com testes de integração
2. Service depende de DTOs e schema (ambos prontos na Phase 2)
3. Controller + Module + registro em app.module.ts — task final do backend, depende do service
4. Frontend service pode ser desenvolvido em paralelo com DTOs do backend
5. Frontend pages dependem do backend estar disponível para testes manuais
6. Registro de rotas — última tarefa por story

---

## Parallel Opportunities

### Após Phase 2 — todas as P1 stories em simultâneo

```
Desenvolvimento simultâneo possível após T005:

US1: T006–T017 (Cooperados + Funções)
US3: T030–T036 (Unidades de Medida)   ← convém concluir antes de US2 frontend e US5 frontend
US2: T018–T029 (Materiais)
```

### Dentro de US1 (exemplo de paralelismo interno)

```
Paralelo em DTOs + testes:
  T006 (member-role DTOs)   |   T009 (member DTOs)   |   T012 (MR tests)   |   T013 (M tests)
  T007 (MR service)         |   T010 (M service)     |   T014 (frontend services)

Sequencial:
  T008 (MR controller+module) → T011 (M controller+module) → T017 (routes)
```

---

## Implementation Strategy

### MVP Scope (P1 apenas — US1 + US2 + US3)

**Ordem recomendada para MVP**:

1. Phase 1 (Schema) + Phase 2 (Foundational) — **bloqueia tudo**
2. US3 (Unidades) — sem dependências, habilita seletores de US2 e US5
3. US1 (Cooperados) — entidade central de toda a operação
4. US2 (Materiais) — vocabulário comum das operações futuras
5. **PARAR E VALIDAR** — todos os P1 cadastros funcionais
6. Avançar para US4 + US5 (P2) em paralelo
7. Avançar para US6 + US7 (P3) em paralelo
8. Phase 10 (Polish)

### Incremental Delivery

```
Phase 1+2 → Foundation ready
   → US3 → US1 → US2 → VALIDATE P1 (MVP!)
   → US4 + US5 (paralelo) → VALIDATE P2
   → US6 + US7 (paralelo) → VALIDATE P3
   → Phase 10 (Polish) → DONE
```

---

## Notes

- **[P]** = tarefas em arquivos diferentes, sem dependências incompletas — podem rodar em paralelo
- **[Story]** = rastreabilidade da tarefa para a user story do spec.md
- Cada user story tem checkpoint independente e verificável sem as demais
- `@AuditEntity('entityName')` — entityName deve corresponder ao nome do model Prisma em camelCase
- **Nunca usar deleção física** — todo service.remove() deve usar `update({ isActive: false })`
- **Paginação**: todos os endpoints de listagem retornam `{ data, total, page, limit }`; frontend deve consumir `.data` não o array raiz
- Commit recomendado após cada checkpoint (T002, T005, fim de cada phase)
- Antes de implementar qualquer controller, verifique se o model está presente no `PrismaService` via `npx prisma studio` ou query direta
