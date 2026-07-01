# Tasks: Fase 3 — Coleta, Rotas e Entrada de Material Bruto

**Input**: Design documents from `specs/003-collection-routes-raw-material/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [data-model.md](data-model.md), [contracts/rest-api.md](contracts/rest-api.md), [research.md](research.md), [quickstart.md](quickstart.md)

**Tests**: Backend integration tests incluídos (obrigatórios: permissões + estoque per Princípio XXIII). Testes de componente frontend excluídos (desejáveis mas não obrigatórios per spec.md Assumptions).

**Organization**: Tarefas agrupadas por user story para implementação e validação independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos distintos, sem dependência de tarefa incompleta)
- **[Story]**: User story a que a tarefa pertence (US1–US6)
- Todos os paths são relativos à raiz do repositório

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extensão do schema Prisma, seed de permissões e dependências de frontend para a Fase 3.

- [X] T001 Adicionar enums `RouteStatus`, `RawMaterialStockEventType` e modelos `CollectionPoint`, `CollectionRoute`, `RoutePoint`, `RouteTeamMember`, `RawMaterialEntry`, `RawMaterialStockEvent` ao `apps/backend/prisma/schema.prisma` (conforme `data-model.md`); adicionar back-relations em `User`, `Vehicle`, `MaterialSubcategory`, `UnitOfMeasure`; gerar e aplicar migration `Phase3_CollectionRoutesRawMaterial` em `apps/backend/prisma/migrations/`
- [X] T002 Atualizar `apps/backend/prisma/seed.ts`: adicionar permissões Phase 3 — ADMIN recebe MANAGE em `COLLECTION_POINTS`, `COLLECTION_ROUTES`, `RAW_MATERIAL_ENTRIES`, `RAW_MATERIAL_BALANCE`; MANAGER recebe MANAGE em `COLLECTION_POINTS`, `COLLECTION_ROUTES`, `RAW_MATERIAL_ENTRIES` e READ em `RAW_MATERIAL_BALANCE`; DRIVER recebe READ e EXECUTE em `COLLECTION_ROUTES` (EXECUTE permite apenas start/complete em rota própria e sempre combinado com `RouteOwnershipGuard`; DRIVER não pode criar, editar, cancelar ou planejar rotas); SORTER sem permissão default; re-executar seed
- [X] T003 [P] Adicionar `leaflet` e `react-leaflet` como dependências em `apps/frontend/package.json`; adicionar tipos `@types/leaflet` como devDependency; rodar `pnpm install` na raiz

**Checkpoint**: Schema migrado, seed executado, `leaflet` disponível no frontend.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura transversal usada por todos os módulos da Fase 3.

**⚠️ CRÍTICO**: Nenhuma user story pode ser implementada antes desta fase estar completa.

- [X] T004 Criar interface `GeocodingProvider` em `apps/backend/src/common/providers/geocoding/geocoding.provider.ts` com método `geocode(address: string): Promise<{ lat: number; lng: number } | null>`; criar `NominatimGeocodingProvider` em `apps/backend/src/common/providers/geocoding/nominatim.geocoding.provider.ts` usando `fetch` nativo do Node 20 com URL `https://nominatim.openstreetmap.org/search`; registrar como injectable com token `GEOCODING_PROVIDER` em `apps/backend/src/common/providers/geocoding/geocoding.module.ts`
- [X] T005 [P] Criar `RouteOwnershipGuard` em `apps/backend/src/common/guards/route-ownership.guard.ts`: extrai `routeId` dos params, busca rota no banco, verifica se `currentUser.id === route.driverId` ou `currentUser.id` está em `route.teamMembers[].userId`; perfis ADMIN e MANAGER passam sem verificação de ownership; retorna 403 se falhar
- [X] T006 [P] Criar componentes de mapa: `apps/frontend/src/components/map/MapView.tsx` (aceita `points: Array<{ lat: number; lng: number; label?: string; pending?: boolean; sequenceNumber?: number }>` e `polyline?: boolean`; usa `MapContainer`, `TileLayer` do `react-leaflet` com tiles OSM); criar `apps/frontend/src/components/map/MapMarker.tsx` com `L.divIcon` exibindo número de sequência sobreposto ao marcador

**Checkpoint**: Foundation ready — módulos da Fase 3 podem ser implementados.

---

## Phase 3: US1 — Cadastrar e Visualizar Pontos de Coleta no Mapa (P1) 🎯 MVP

**Goal**: ADMIN/MANAGER podem cadastrar pontos de coleta com endereço, receber geocoding automático e visualizá-los em mapa. DRIVER/SORTER recebem 403.

**Independent Test**: `POST /api/v1/collection-points` com endereço válido → 201; GET lista → ponto aparece; ponto com coordenadas aparece no mapa na UI. DRIVER → 403.

### Implementation for US1

- [X] T007 [P] [US1] Criar scaffold do módulo NestJS: `apps/backend/src/modules/collection-points/collection-points.module.ts`, `collection-points.controller.ts` (vazio), `collection-points.service.ts` (vazio); importar `GeocodingModule` no módulo; registrar em `apps/backend/src/app.module.ts`
- [X] T008 [US1] Criar `apps/backend/src/modules/collection-points/dto/create-collection-point.dto.ts` com campos `name` (string, required), `address` (string, required), `reference` (string, optional), `latitude` (number, optional, −90..90), `longitude` (number, optional, −180..180); implementar `POST /api/v1/collection-points` em `CollectionPointsController` e `CollectionPointsService`: salvar ponto com `locationPending=true` → chamar `GeocodingProvider.geocode()` de forma não bloqueante após salvar; se coordenadas manuais fornecidas → `locationPending=false` imediatamente; retornar 201 com objeto criado; aplicar `AuditInterceptor`
- [X] T009 [US1] Criar `apps/backend/src/modules/collection-points/dto/update-collection-point.dto.ts`; implementar `PATCH /api/v1/collection-points/:id`: se `latitude` e `longitude` válidos recebidos → `locationPending=false`; se `address` alterado sem coords → disparar nova tentativa de geocoding assíncrona; retornar 404 se não encontrado; aplicar `AuditInterceptor` com `previousState`/`newState`
- [X] T010 [US1] Implementar `GET /api/v1/collection-points` com filtros `page`, `limit`, `search` (busca por `name` e `address`, case-insensitive), `status` (`active`|`inactive`|`all`, default `active`), `locationPending` (boolean); implementar `GET /api/v1/collection-points/:id` retornando 404 se não encontrado
- [X] T011 [P] [US1] Criar `apps/frontend/src/services/collectionPointsService.ts` (funções: `list(params)`, `getById(id)`, `create(dto)`, `update(id, dto)`); criar `apps/frontend/src/store/collectionPointsStore.ts`
- [X] T012 [US1] Criar `apps/frontend/src/pages/collection-points/CollectionPointsPage.tsx`: tabela paginada com busca por texto e filtro de status; seção de mapa usando `MapView` exibindo pontos com `locationPending=false`; badge "Localização pendente" em pontos com `locationPending=true`; botão "Novo ponto" e ações de editar/inativar por linha
- [X] T013 [US1] Criar `apps/frontend/src/pages/collection-points/CollectionPointFormPage.tsx`: formulário de criação/edição com campos `name`, `address`, `reference`, `latitude`, `longitude` (campos opcionais de coordenadas com label "Informar coordenadas manualmente"), toggle de status; mensagens de erro por campo; preview de mapa com pin quando coords preenchidas manualmente
- [X] T014 [US1] Escrever `apps/backend/test/collection-points.e2e-spec.ts`: cenários — criar ponto sem coords → `locationPending=true`; criar ponto com coords → `locationPending=false`; PATCH com coords → `locationPending=false` + auditoria gerada; GET lista com `search` e `status` filtros; 403 para DRIVER e SORTER em POST e PATCH; 404 em GET /:id inexistente; PATCH `{ isActive: false }` → 200 + AuditLog com `previousState.isActive=true` e `newState.isActive=false`; mock de `GeocodingProvider.geocode()` retornando `null` → POST salva normalmente com `locationPending=true` e `latitude`/`longitude` nulas; GET `?locationPending=true` → retorna somente pontos com `locationPending=true`

**Checkpoint**: Pontos de coleta completamente funcionais e testáveis.

---

## Phase 4: US2 — Planejar Rota de Coleta com Múltiplos Pontos (P1)

**Goal**: MANAGER/ADMIN criam rota com veículo, motorista, pontos ordenados e equipe. Sistema sugere sequência por nearest neighbor. DRIVER recebe 403 em criação/edição.

**Independent Test**: `POST /api/v1/collection-routes` com veículo + motorista + 2 pontos → 201 com `status: "PLANEJADA"` e pontos com sequence. `POST .../suggest-sequence` → `suggestedOrder` retornado.

### Implementation for US2

- [X] T015 [P] [US2] Criar scaffold: `apps/backend/src/modules/collection-routes/collection-routes.module.ts`, `collection-routes.controller.ts`, `collection-routes.service.ts`; registrar em `apps/backend/src/app.module.ts`; decorar `CollectionRoutesController` com `@AuditEntity('CollectionRoute')` e `@UseInterceptors(AuditInterceptor)` em nível de classe, cobrindo automaticamente todos os endpoints mutáveis (incluindo os de T018 e T020)
- [X] T016 [US2] Criar `apps/backend/src/modules/collection-routes/dto/create-collection-route.dto.ts` (campos: `name`, `plannedDate`, `vehicleId`, `driverId`, `notes?`, `pointIds?: string[]`); implementar `POST /api/v1/collection-routes`: validar veículo ativo + usuário `driverId` com perfil DRIVER **e ativo** (`user.isActive === true`, retornar 422 `DRIVER_INACTIVE` se inativo) + validar que cada ponto em `pointIds` possui `collectionPoint.isActive === true` (retornar 422 `COLLECTION_POINT_INACTIVE` se algum inativo) + criar rota com `status=PLANEJADA` + criar `RoutePoint`s em sequência de `pointIds`; aplicar `AuditInterceptor`
- [X] T017 [US2] Criar `apps/backend/src/modules/collection-routes/dto/update-collection-route.dto.ts`; implementar `PATCH /api/v1/collection-routes/:id`: apenas para rotas `PLANEJADA`; bloquear com `409 ROUTE_NOT_EDITABLE` em outros status; applicar `AuditInterceptor`
- [X] T018 [US2] Implementar gerenciamento de pontos: `POST /api/v1/collection-routes/:id/points` (adiciona ponto com `sequence = max(sequence)+1`; validar que `collectionPoint.isActive === true` — retornar 422 `COLLECTION_POINT_INACTIVE` se inativo), `DELETE /api/v1/collection-routes/:id/points/:pointId`, `PATCH /api/v1/collection-routes/:id/points/reorder` (recebe `orderedPointIds[]`, valida que todos os IDs pertencem à rota, substitui atomicamente os valores de `sequence` em transação Prisma); todos apenas para rota `PLANEJADA`
- [X] T019 [US2] Criar `apps/backend/src/modules/collection-routes/route-sequence-suggester.service.ts`: implementar algoritmo nearest neighbor — recebe array de `{ id, lat, lng }`, exclui pontos com `locationPending=true` (lista em `excludedPoints`), retorna `suggestedOrder: string[]`; implementar `POST /api/v1/collection-routes/:id/suggest-sequence` que carrega os pontos com coords e chama o service
- [X] T020 [US2] Implementar gerenciamento de equipe: `POST /api/v1/collection-routes/:id/team` (adiciona `userIds[]` como `RouteTeamMember`), `DELETE /api/v1/collection-routes/:id/team/:userId`; permitido em `PLANEJADA` e `EM_ANDAMENTO`; bloqueado em `CONCLUIDA`/`CANCELADA`
- [X] T021 [US2] Implementar `GET /api/v1/collection-routes` (filtros: `page`, `limit`, `search`, `status`, `driverId`, `dateFrom`, `dateTo`; DRIVER vê apenas rotas próprias) e `GET /api/v1/collection-routes/:id` (com `routePoints` ordenados por `sequence`, `teamMembers`, `vehicle`, `driver`)
- [X] T022 [P] [US2] Criar `apps/frontend/src/services/collectionRoutesService.ts` e `apps/frontend/src/store/collectionRoutesStore.ts`
- [X] T023 [US2] Criar `apps/frontend/src/pages/collection-routes/CollectionRoutesPage.tsx`: tabela paginada com filtros de status e busca; badge colorido por status
- [X] T024 [US2] Criar `apps/frontend/src/pages/collection-routes/CollectionRouteFormPage.tsx`: formulário de planejamento com seleção de veículo, motorista, data; seção de pontos (select + adicionar, reordenar via drag-and-drop ou setas, remover); botão "Sugerir sequência" que chama `suggest-sequence` e reordena a lista (com alerta se há pontos excluídos); seção de equipe (adicionar/remover membros); `MapView` mostrando pontos numerados conforme sequência
- [X] T025 [US2] Escrever `apps/backend/test/collection-routes-planning.e2e-spec.ts`: criar rota → 201 `PLANEJADA`; adicionar/remover pontos; reordenar (sequência persiste); suggest-sequence com ponto sem coords → `excludedPoints` preenchido; add/remove equipe; `PATCH` de rota em `EM_ANDAMENTO` → 409; DRIVER criando rota → 403; SORTER criando rota → 403

**Checkpoint**: Planejamento de rotas completamente funcional.

---

## Phase 5: US3 — Iniciar e Concluir Execução da Rota (P1)

**Goal**: DRIVER atribuído pode transitar rota de `PLANEJADA → EM_ANDAMENTO → CONCLUIDA`. ADMIN/MANAGER podem cancelar. Optimistic locking previne dupla transição.

**Independent Test**: DRIVER inicia rota → `status: "EM_ANDAMENTO"` + `startedAt`; DRIVER conclui → `status: "CONCLUIDA"` + `completedAt`; DRIVER não atribuído → 403; duplo start simultâneo → segundo retorna 409.

### Implementation for US3

- [X] T026 [US3] Implementar transições de estado em `CollectionRoutesService`: `startRoute(routeId, userId)` — verifica `status=PLANEJADA`, incrementa `version` atomicamente com `updateMany` + `WHERE version = currentVersion` (retorna 409 se count=0), seta `status=EM_ANDAMENTO` e `startedAt`; `completeRoute(routeId, userId)` — verifica `status=EM_ANDAMENTO` + version; `cancelRoute(routeId, userId, reason)` — verifica `status IN [PLANEJADA, EM_ANDAMENTO]`, exige `reason` e persiste em `cancelReason`; DRIVER só pode executar start/complete com permissão `COLLECTION_ROUTES:EXECUTE` em rota própria, sempre combinado com `RouteOwnershipGuard`; DRIVER não pode criar, editar, cancelar ou planejar rotas; ADMIN/MANAGER mantêm acesso completo conforme permissões de gestão. Endpoints POST de transição (`start`, `complete`, `cancel`) devem ser auditados como UPDATE, não CREATE: criar mecanismo de override no `AuditInterceptor` (ex.: `@AuditAsUpdate` ou equivalente) para buscar `previousState` antes da mutação e `newState` após a mutação, evitando auditoria duplicada.
- [X] T027 [US3] Implementar endpoints: `POST /api/v1/collection-routes/:id/start`, `POST /api/v1/collection-routes/:id/complete` com `COLLECTION_ROUTES:EXECUTE` + `RouteOwnershipGuard` para DRIVER e acesso de gestão para ADMIN/MANAGER; `POST /api/v1/collection-routes/:id/cancel` com body `{ reason: string }` obrigatório, requer `COLLECTION_ROUTES:MANAGE`, sem ownership guard, e salva `reason` em `cancelReason`. Aplicar o override de auditoria como UPDATE (ex.: `@AuditAsUpdate`) em `start`, `complete` e `cancel`, garantindo `previousState`/`newState` corretos e sem gerar AuditLog duplicado.
- [X] T028 [US3] Criar `apps/frontend/src/pages/collection-routes/CollectionRouteDetailPage.tsx`: exibe status da rota com badge colorido; `MapView` com pontos numerados; para DRIVER → botão "Iniciar rota" (se PLANEJADA) ou "Concluir rota" (se EM_ANDAMENTO); para MANAGER/ADMIN → botão "Cancelar" com modal de justificativa; campos estruturais (veículo, motorista, pontos, data) read-only em EM_ANDAMENTO; campos de equipe editáveis em EM_ANDAMENTO; tudo read-only em CONCLUIDA/CANCELADA; não incluir UI de entrada de material bruto nesta página — entrada de material bruto pertence à US4/T035.
- [X] T029 [US3] Escrever `apps/backend/test/collection-routes-execution.e2e-spec.ts`: PLANEJADA→EM_ANDAMENTO→CONCLUIDA com timestamps; cancelamento de PLANEJADA; cancelamento de EM_ANDAMENTO; cancelamento de CONCLUIDA → 409; `POST /collection-routes/:id/complete` em rota CANCELADA → 409 `INVALID_ROUTE_TRANSITION`; DRIVER não atribuído em start/complete → 403; DRIVER de outra rota → 403; SORTER tentando start → 403; SORTER tentando complete → 403; SORTER tentando cancel → 403; edição de veículo em EM_ANDAMENTO → 409; edição de equipe em EM_ANDAMENTO → 200; qualquer edição estrutural em CONCLUIDA → 409 `ROUTE_NOT_EDITABLE`

**Checkpoint**: Execução de rotas totalmente funcional com estado seguro.

---

## Phase 6: US4 — Registrar Entrada Manual de Material Bruto (P1)

**Goal**: MANAGER/DRIVER (rota própria, status EM_ANDAMENTO ou CONCLUIDA) registram entrada de material. Cada entrada gera evento imutável `ENTRADA_BRUTO`. ADMIN/MANAGER podem criar estorno `ESTORNO_BRUTO` com justificativa, sem deixar saldo negativo.

**Independent Test**: `POST /material-entries` → 201 + `stockEventId` preenchido; balance aumenta; `POST .../reversal` → evento negativo criado; `POST .../reversal` que zeraria saldo → 200; `POST .../reversal` que tornaria negativo → 409.

### Implementation for US4

- [X] T030 [P] [US4] Criar scaffold: `apps/backend/src/modules/raw-material-entries/raw-material-entries.module.ts`, `raw-material-entries.controller.ts`, `raw-material-entries.service.ts`; registrar em `apps/backend/src/app.module.ts`
- [X] T031 [US4] Criar `apps/backend/src/modules/raw-material-entries/dto/create-raw-material-entry.dto.ts` (campos: `subcategoryId`, `quantity` (> 0), `unitId`, `notes?`); implementar `POST /api/v1/collection-routes/:routeId/material-entries`: aplicar `@UseGuards(RouteOwnershipGuard)` no controller (DRIVER é validado por ownership; ADMIN/MANAGER passam automaticamente — padrão das Fases 3A/3B/3C); validar rota existe + status EM_ANDAMENTO ou CONCLUIDA; validar subcategoria e unidade ativas + quantidade > 0; em transação Prisma: criar `RawMaterialEntry` + criar `RawMaterialStockEvent` (`type=ENTRADA_BRUTO`, `quantity=+valor`, `rawMaterialEntryId`); retornar 201 com `stockEventId`; aplicar `AuditInterceptor`
- [X] T032 [US4] Criar `apps/backend/src/modules/raw-material-entries/dto/create-reversal.dto.ts` (campo: `justification`, required); implementar `POST /api/v1/collection-routes/:routeId/material-entries/:id/reversal`: aplicar `@UseGuards(RouteOwnershipGuard)` e `@AuditAsUpdate()` no handler; apenas ADMIN/MANAGER (403 para DRIVER/SORTER); verificar que entrada existe + não tem estorno ainda (409 `ENTRY_ALREADY_REVERSED` — a constraint `@@unique([referencedEventId])` no banco também protege contra race condition de estornos duplos simultâneos); calcular saldo atual de `subcategoryId`+`unitId` com `SUM(quantity)` inline e verificar que `saldo - quantity >= 0` (409 `REVERSAL_WOULD_CAUSE_NEGATIVE_BALANCE`) — nota: esta query será reimplementada em T037 como serviço consultável; duplicação intencional para garantir atomicidade transacional (L1); em transação Prisma: criar `RawMaterialStockEvent` (`type=ESTORNO_BRUTO`, `quantity=-valor`, `referencedEventId=stockEvent.id`, `justification`); retornar 201 com o `RawMaterialEntry` atualizado (incluindo `isReversed: true` e `stockEvent` aninhado) — assim `previousState` e `newState` da auditoria são do mesmo tipo (`RawMaterialEntry`), satisfazendo SC-007
- [X] T033 [US4] Implementar `GET /api/v1/collection-routes/:routeId/material-entries` (paginado) e `GET /api/v1/collection-routes/:routeId/material-entries/:id` (com `stockEvent` aninhado); aplicar `@UseGuards(RouteOwnershipGuard)` em ambos os GETs (DRIVER só acessa entradas de rota própria); incluir `isReversed: boolean` em ambas as respostas — calculado como `stockEvent.reversals.length > 0` via `include: { stockEvent: { include: { reversals: { select: { id: true } } } } }` — campo necessário para o badge "Estornado" do frontend (T035)
- [X] T034 [P] [US4] Criar `apps/frontend/src/services/rawMaterialService.ts` (funções: `listEntries(routeId, params)`, `createEntry(routeId, dto)`, `getEntry(routeId, id)`, `createReversal(routeId, entryId, dto)`); criar `apps/frontend/src/store/rawMaterialStore.ts`
- [X] T035 [US4] Criar `apps/frontend/src/pages/raw-material/RawMaterialEntriesPage.tsx`: listagem de entradas de uma rota (tabela com subcategoria, quantidade + unidade, usuário, timestamp); formulário inline ou modal "Nova entrada" com select de subcategoria, campo numérico de quantidade, select de unidade; para ADMIN/MANAGER → botão "Estornar" por linha com modal solicitando justificativa; exibir badge "Estornado" em entradas com reversal associado
- [X] T036 [US4] Escrever `apps/backend/test/raw-material-entries.e2e-spec.ts`: criar entrada em rota EM_ANDAMENTO → 201 + stockEvent; criar entrada em rota CONCLUIDA → 201; criar entrada em rota PLANEJADA → 409; criar entrada em rota CANCELADA → 409; quantidade = 0 → 422; subcategoria inativa → 422; DRIVER em rota própria EM_ANDAMENTO → 201; DRIVER em rota própria CONCLUIDA → 201 (FR-035b); DRIVER em rota de outro → 403; estorno → response com `RawMaterialEntry` + `isReversed: true`; estorno que zeraria saldo → 200; estorno que tornaria negativo → 409; estorno duplicado → 409; DRIVER tentando estorno → 403; SORTER tentando GET /material-entries → 403

**Checkpoint**: Entrada de material bruto e estorno completamente funcionais.

---

## Phase 7: US5 — Consultar Saldo Básico de Material Bruto (P2)

**Goal**: ADMIN/MANAGER consultam saldo bruto por subcategoria/unidade. Saldo = soma algébrica de todos os eventos. Nunca negativo.

**Independent Test**: `GET /api/v1/raw-material-balance` após duas entradas de 100 kg PET → `balance: "200.000"`; após estorno de 50 kg → `balance: "150.000"`.

### Implementation for US5

- [ ] T037 [P] [US5] Criar `apps/backend/src/modules/raw-material-balance/raw-material-balance.module.ts`, `raw-material-balance.controller.ts`, `raw-material-balance.service.ts`; registrar em `apps/backend/src/app.module.ts`; implementar `GET /api/v1/raw-material-balance` com query Prisma: `groupBy(['subcategoryId', 'unitId'], _sum: { quantity: true })`; incluir dados de `subcategory` (com `category`) e `unit` no response; filtros opcionais `subcategoryId`, `unitId`, `includeInactive` (default: só subcategorias/unidades ativas na listagem, mas histórico sempre incluído nos cálculos); nota: a mesma lógica de `SUM(quantity) WHERE subcategoryId + unitId` existe inline em T032 para check de saldo negativo — duplicação intencional nessa fase para garantir atomicidade transacional em T032; quando T037 estiver estável, T032 PODE ser refatorado para delegar ao balance service dentro da mesma transação Prisma
- [ ] T038 [US5] Criar `apps/frontend/src/pages/raw-material/RawMaterialBalancePage.tsx`: tabela com colunas categoria, subcategoria, unidade, saldo; filtro por subcategoria; campo `calculatedAt` no topo
- [ ] T039 [US5] Escrever `apps/backend/test/raw-material-balance.e2e-spec.ts`: saldo após múltiplas entradas = soma; saldo após estorno = soma − estorno; saldo zero para subcategoria sem eventos (não aparece na listagem); subcategoria inativa com histórico aparece com `includeInactive=true`; DRIVER sem permissão explícita → 403; SORTER sem permissão explícita → 403

**Checkpoint**: Consulta de saldo funcional e validada.

---

## Phase 8: US6 — Auditoria de Operações Mutáveis (P2)

**Goal**: Toda criação, edição e transição de estado gera `AuditLog` imutável com `previousState` e `newState`, `userId` e `createdAt`.

**Independent Test**: Editar ponto de coleta → `GET /api/v1/audit-logs?entityType=CollectionPoint&entityId=<id>` retorna registro com `previousState` e `newState` corretos.

### Implementation for US6

- [X] T040 [US6] Verificar que `AuditInterceptor` está aplicado em todos os controllers da Fase 3: `CollectionPointsController` (POST, PATCH), `CollectionRoutesController` (POST, PATCH, start, complete, cancel, reorder, addPoint, removePoint, addTeam, removeTeam), `RawMaterialEntriesController` (POST entry, POST reversal); confirmar que `previousState` e `newState` são populados corretamente com os campos relevantes de cada entidade (não JSON completo do objeto — apenas campos alterados)
- [ ] T041 [US6] Escrever `apps/backend/test/audit-phase3.e2e-spec.ts`: ponto criado → AuditLog com `previousState=null`, `newState` com todos os campos; coordenadas atualizadas → AuditLog com `previousState.locationPending=true`, `newState.locationPending=false`; rota transitada `PLANEJADA→EM_ANDAMENTO` → AuditLog com `previousState.status=PLANEJADA`, `newState.status=EM_ANDAMENTO` e `startedAt`; entrada de material criada → AuditLog com `previousState=null`, `newState` com entrada; AuditLogs não podem ser editados (sem rota PUT/DELETE em `/api/v1/audit-logs`)

**Checkpoint**: Auditoria completa para todos os módulos da Fase 3.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Integração de rotas frontend, testes de permissão e edge cases transversais.

- [ ] T042 [P] Registrar rotas React Router para todas as páginas da Fase 3 em `apps/frontend/src/router/index.tsx` (ou equivalente): `/collection-points`, `/collection-points/new`, `/collection-points/:id/edit`, `/collection-routes`, `/collection-routes/new`, `/collection-routes/:id`, `/collection-routes/:id/edit`, `/collection-routes/:id/material-entries`, `/raw-material-balance`
- [ ] T043 [P] Adicionar itens de navegação da Fase 3 no menu lateral em `apps/frontend/src/layouts/` (ou equivalente): "Pontos de Coleta", "Rotas de Coleta", "Saldo Bruto"
- [ ] T044 [P] Escrever `apps/backend/test/rbac-phase3.e2e-spec.ts` cobrindo todos os cenários 403 da tabela de permissões em `contracts/rest-api.md`: DRIVER em POST `/collection-points`, POST `/collection-routes`, cancel route; SORTER em todos os endpoints exceto GET se tiver permissão explícita; DRIVER sem ownership em start/complete de rota de outro; DRIVER em POST reversal; resposta 403 não vaza informações do recurso (FR-006, SC-006)
- [ ] T045 Escrever `apps/backend/test/edge-cases-phase3.e2e-spec.ts` cobrindo: geocoding falha → ponto salvo com `locationPending=true` (mock do provider); dois usuários iniciam mesma rota simultaneamente → segundo recebe 409 `ROUTE_CONCURRENT_MODIFICATION`; quantidade 0 e negativa em material entry → 422; estorno que tornaria saldo negativo → 409; ponto de coleta inativado após estar em rota existente → ponto permanece na rota com `collectionPoint.isActive=false`; saldo consultado para subcategoria inativa com histórico → histórico preservado
- [ ] T046 Executar todos os cenários de `quickstart.md` manualmente (ou via script) contra ambiente local; registrar resultado de cada cenário e corrigir divergências encontradas

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sem dependências — pode iniciar imediatamente
- **Phase 2 (Foundational)**: Depende do Phase 1 — **bloqueia** todas as user stories
- **Phase 3–8 (User Stories)**: Dependem do Phase 2; podem rodar em prioridade P1→P2 (sequencial) ou em paralelo se houver múltiplos implementadores
- **Phase 9 (Polish)**: Depende de todas as user stories desejadas estarem completas

### User Story Dependencies

- **US1 (P1)** — CollectionPoints: pode iniciar após Phase 2; sem dependência de outras stories
- **US2 (P1)** — Route Planning: pode iniciar após Phase 2; referencia `CollectionPoint` mas não depende de US1 estar completa (modelo já existe após T001)
- **US3 (P1)** — Route Execution: depende de US2 estar completa (mesmos endpoints de rota)
- **US4 (P1)** — Raw Material Entry: pode iniciar após Phase 2; depende de `CollectionRoute` existir (T001); independente de US1/US2 estar completa
- **US5 (P2)** — Raw Material Balance: depende de US4 estar completa (lê `RawMaterialStockEvent`)
- **US6 (P2)** — Audit: transversal; validação final após US1–US4 completas

### Within Each User Story

- Scaffold/Module (T00x) → DTOs + Service → Controller → Frontend service/store → Frontend pages → Integration tests
- Testes podem ser escritos antes ou em paralelo com implementação
- Todos os `[P]` dentro de uma story podem rodar em paralelo

### Parallel Opportunities

| Story | Tarefas paralelizáveis |
|---|---|
| US1 | T007 (scaffold backend) + T011 (service/store frontend) |
| US2 | T015 (scaffold backend) + T022 (service/store frontend) |
| US3 | T026 (service transitions) pode ser desenvolvido em paralelo a T028 (frontend page) |
| US4 | T030 (scaffold backend) + T034 (service/store frontend) |
| US5 | T037 (backend) pode rodar em paralelo a T038 (frontend) |
| US6 | T040 (interceptors check) + T041 (tests) |
| Polish | T042, T043, T044 em paralelo |

---

## Parallel Example: US4 — Raw Material Entry

```bash
# Depois de T030 (scaffold) concluído, rodar em paralelo:
Task T031: "POST /material-entries (create entry + stock event in transaction)"
Task T034: "rawMaterialService.ts + rawMaterialStore.ts"

# Depois de T031 e T032 concluídos:
Task T033: "GET endpoints (list + detail)"
Task T035: "RawMaterialEntriesPage.tsx"
Task T036: "e2e tests"
```

---

## Implementation Strategy

### MVP First (US1 → US2 → US3 → US4)

1. Completar Phase 1 + Phase 2 (Setup + Foundational)
2. Completar Phase 3 (US1: Pontos de Coleta) → Validar
3. Completar Phase 4 (US2: Planejamento) → Validar
4. Completar Phase 5 (US3: Execução) → Validar
5. Completar Phase 6 (US4: Entrada de Material) → Validar
6. **STOP e VALIDAR**: executar `quickstart.md` Cenários 1–4
7. Fazer demo com o gestor antes de avançar para US5/US6

### Incremental Delivery

- Setup + Foundation → Infra pronta
- +US1 → Gestores podem cadastrar pontos e ver no mapa
- +US2 → Gestores podem planejar rotas
- +US3 → Motoristas podem executar rotas
- +US4 → Material bruto entra no sistema
- +US5 → Gestores consultam saldo
- +US6 → Auditoria validada

### Nota sobre Testes

- Princípio XXIII: testes de **permissões** (T044) e **estoque** (T036, T039) são obrigatórios
- Testes de integração de estado de rota (T029) são obrigatórios por criticidade do negócio
- Edge cases (T045) devem ser executados antes do go-live

---

## Notes

- `[P]` = arquivos distintos, sem dependência de tarefa incompleta no mesmo contexto
- Cada user story é independentemente completável e testável
- Path base backend: `apps/backend/src/modules/<module>/`
- Path base frontend: `apps/frontend/src/`
- Commitar após cada tarefa ou grupo lógico concluído
- Parar em cada checkpoint para validar a story de forma independente
- Geocoding Nominatim: mockar no ambiente de testes para não depender de rede externa
