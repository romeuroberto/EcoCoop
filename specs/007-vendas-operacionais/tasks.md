# Tasks: Vendas Operacionais (007)

**Input**: Design documents from `specs/007-vendas-operacionais/`

**Prerequisites**: [plan.md](plan.md) · [spec.md](spec.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/api.md](contracts/api.md) · [quickstart.md](quickstart.md)

**Tests**: Incluídos — spec solicita explicitamente "backend, frontend, RBAC, auditoria, testes e validação manual".

**Organization**: Tasks grouped by user story. Each story is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralelizável (arquivos diferentes, sem dependência de task incompleta)
- **[Story]**: Historia de usuário correspondente (US1–US5)
- Caminhos de arquivo incluídos em cada descrição

---

## Phase 1: Setup (Schema e Módulos NestJS)

**Purpose**: Criar todos os modelos Prisma, gerar migração, e criar esqueletos dos módulos NestJS. Bloqueia tudo.

- [x] T001 Extender enum `ReadyStockEventType` com `VENDA` e `ESTORNO_VENDA` em `apps/backend/prisma/schema.prisma`
- [x] T002 Adicionar enum `SaleStatus` (PENDENTE_ENTREGA, ENTREGUE, CANCELADA) em `apps/backend/prisma/schema.prisma`
- [x] T003 Adicionar enum `AccountReceivableStatus` (A_RECEBER, CANCELADA) em `apps/backend/prisma/schema.prisma`
- [x] T004 Adicionar model `Sale` (conforme data-model.md) em `apps/backend/prisma/schema.prisma`
- [x] T005 Adicionar model `SaleItem` (conforme data-model.md) em `apps/backend/prisma/schema.prisma`
- [x] T006 Adicionar model `AccountReceivable` (conforme data-model.md) em `apps/backend/prisma/schema.prisma`
- [x] T007 Adicionar campos `saleId` e `saleItemId` (nullable FKs) ao model `ReadyStockEvent` e relação `saleReadyEvents` ao model `Sale` em `apps/backend/prisma/schema.prisma`
- [x] T008 [P] Adicionar relações de `Sale`/`SaleItem`/`AccountReceivable` nos models `User`, `Buyer`, `MaterialSubcategory` e `UnitOfMeasure` em `apps/backend/prisma/schema.prisma`
- [x] T009 Gerar e aplicar migração Prisma: `cd apps/backend && npx prisma migrate dev --name add-sales`
- [x] T010 Criar esqueleto do módulo NestJS `sales`: arquivos `apps/backend/src/modules/sales/sales.module.ts`, `sales.service.ts` e `sales.controller.ts` (stubs vazios com classes e decorators)
- [x] T011 [P] Criar esqueleto do módulo NestJS `accounts-receivable`: arquivos `apps/backend/src/modules/accounts-receivable/accounts-receivable.module.ts`, `accounts-receivable.service.ts` e `accounts-receivable.controller.ts` (stubs vazios)
- [x] T012 Registrar `SalesModule` e `AccountsReceivableModule` no `apps/backend/src/app.module.ts`

**Checkpoint**: `npx prisma studio` mostra os novos models; `npm run build` no backend compila sem erros.

---

## Phase 2: Foundational (Permissions, DTOs e Setup de Frontend)

**Purpose**: Pré-requisitos que desbloqueiam todas as histórias. Nenhuma implementação de endpoint/UI pode começar antes daqui.

**⚠️ CRÍTICO**: Esta fase deve ser concluída antes de qualquer história de usuário.

- [x] T013 Adicionar permissões `SALES` (CREATE, READ, DELIVER, CANCEL) e `ACCOUNTS_RECEIVABLE` (READ) para os perfis ADMIN e MANAGER; adicionar somente `SALES` (READ) para SORTER e DRIVER em `apps/backend/prisma/seeds/seed.ts`; executar `cd apps/backend && npx prisma db seed`
- [x] T014 [P] Criar `CreateSaleDto` com validações class-validator (`buyerId` UUID, `items` array não-vazio, `quantity` > 0, `unitPrice` >= 0, `dueDate` ISO date opcional) em `apps/backend/src/modules/sales/dto/create-sale.dto.ts`
- [x] T015 [P] Criar `DeliverSaleDto` com campo opcional `deliveredAt` (ISO datetime) em `apps/backend/src/modules/sales/dto/deliver-sale.dto.ts`
- [x] T016 [P] Criar `CancelSaleDto` com campo `cancelReason` (string, requerido) em `apps/backend/src/modules/sales/dto/cancel-sale.dto.ts`
- [x] T017 [P] Criar `apps/frontend/src/services/sales.service.ts` com funções tipadas: `createSale`, `listSales`, `getSale`, `deliverSale`, `cancelSale` usando o cliente Axios existente
- [x] T018 [P] Criar `apps/frontend/src/services/accountsReceivable.service.ts` com função `listAccountsReceivable` usando o cliente Axios existente
- [x] T019 Adicionar rota `/vendas` no router do frontend (`apps/frontend/src/router/`) e entrada "Vendas" na barra de navegação lateral

**Checkpoint**: Build do frontend sem erros de TypeScript; seed executado com sucesso; rota `/vendas` acessível (mesmo que mostre página vazia).

---

## Phase 3: US1 — Registrar Venda de Material Pronto (Priority: P1) 🎯 MVP

**Goal**: Gestor registra venda multi-item; saldo pronto é debitado atomicamente via evento VENDA; AccountReceivable é criado junto.

**Independent Test**: Registrar venda de 50 kg PET via `POST /api/v1/sales`; verificar saldo reduzido, evento VENDA no ready stock, e AR criado com status A_RECEBER.

### Testes — US1

> **Escrever e confirmar falha ANTES da implementação**

- [x] T020 Criar `apps/backend/test/integration/sales.spec.ts` com `beforeAll` (setup de app NestJS, prisma, login de usuários: admin, manager, sorter), seed de buyer ativo, subcategoria, unidade e saldo pronto (via SortingOperation direta no prisma); escrever casos: sucesso 1 item, sucesso múltiplos itens (verificar totalAmount = soma subtotais)
- [x] T023 Adicionar casos de erro ao `apps/backend/test/integration/sales.spec.ts` (ainda sem implementação — devem falhar): buyer inexistente → 404, buyer inativo → 409 `BUYER_INACTIVE`, saldo insuficiente 1 item → 409 `INSUFFICIENT_READY_STOCK`, saldo insuficiente em 1 de 2 itens → 409 (nenhum saldo alterado)

### Implementação — US1

- [x] T021 Implementar `SalesService.create()` em `apps/backend/src/modules/sales/sales.service.ts`: dentro de `$transaction` — verificar buyer ativo, verificar saldo de estoque pronto por item (via aggregate), criar `Sale` + `SaleItem[]` + `ReadyStockEvent(VENDA, qty negativa)` por item + `AccountReceivable`; calcular subtotal e totalAmount server-side; retornar Sale completa com buyer, items e accountReceivable
- [x] T022 Implementar `SalesController.create()` em `apps/backend/src/modules/sales/sales.controller.ts`: `@Post()`, `@RequirePermission('SALES', 'CREATE')`, `@AuditEntity('sale')`, `@UseInterceptors(AuditInterceptor)`, receber `@Body() CreateSaleDto` e `@CurrentUser() user`
- [x] T024 Implementar `apps/frontend/src/pages/sales/SaleFormModal.tsx`: seletor de comprador (autocomplete sobre lista de buyers ativos), linhas dinâmicas de item (subcategoria, unidade, quantidade, preço unitário, subtotal calculado), valor total calculado, botão Confirmar e Cancelar; exibir aviso visual (não bloqueante) quando `unitPrice` de qualquer item for 0; chamar `salesService.createSale`; invalidar query `['sales']` ao fechar com sucesso
- [x] T025 Implementar `apps/frontend/src/pages/sales/SalesPage.tsx`: estado vazio com mensagem, botão "Nova Venda" (visível apenas com permissão `SALES/CREATE`), lista básica local pós-criação com colunas comprador, data, valor total e status badge; abrir `SaleFormModal` ao clicar

**Checkpoint**: `POST /api/v1/sales` cria a venda, debita saldo e gera AR. Testes T020 e T023 passam. Frontend exibe modal e lista a venda criada.

---

## Phase 4: US2 — Confirmar Saída Física / Entrega (Priority: P1)

**Goal**: Responsável confirma entrega, status passa para ENTREGUE com data e autor registrados.

**Independent Test**: PATCH /api/v1/sales/:id/deliver em venda PENDENTE_ENTREGA → 200 com status ENTREGUE e deliveredAt preenchido.

### Testes — US2

- [x] T026 Adicionar casos de entrega ao `apps/backend/test/integration/sales.spec.ts`: sucesso (status → ENTREGUE, deliveredAt salvo, deliveredBy definido); tentar entregar venda já ENTREGUE → 409 `SALE_NOT_DELIVERABLE`; tentar entregar venda CANCELADA → 409

### Implementação — US2

- [x] T027 Implementar `SalesService.deliver()` em `apps/backend/src/modules/sales/sales.service.ts`: buscar venda por id (404 se não encontrada), checar status = PENDENTE_ENTREGA (409 se não), atualizar `status = ENTREGUE`, `deliveredAt`, `deliveredById`; retornar id, status, deliveredAt, deliveredBy
- [x] T028 Implementar `SalesController.deliver()` em `apps/backend/src/modules/sales/sales.controller.ts`: `@Patch(':id/deliver')`, `@RequirePermission('SALES', 'DELIVER')`, receber `@Param('id')` e `@Body() DeliverSaleDto` e `@CurrentUser()`
- [x] T029 Implementar ação de entrega no frontend da US2: botão "Confirmar Entrega" visível apenas quando status=PENDENTE_ENTREGA e usuário tem permissão DELIVER; ao confirmar, chamar `salesService.deliverSale`, invalidar queries e atualizar estado local sem refresh manual

**Checkpoint**: Confirmação de entrega funciona via API e via botão na página de detalhe. Testes T026 passam.

---

## Phase 5: US3 — Cancelar Venda com Estorno de Estoque (Priority: P2)

**Goal**: Cancelamento de venda restaura saldo pronto via ESTORNO_VENDA e marca AR como CANCELADA.

**Independent Test**: DELETE /api/v1/sales/:id com cancelReason → saldo pronto restaurado, AR cancelado, status CANCELADA.

### Testes — US3

- [x] T030 Adicionar casos de cancelamento ao `apps/backend/test/integration/sales.spec.ts`: sucesso — verificar saldo restaurado (aggregate ReadyStockEvent), eventos ESTORNO_VENDA criados por item, AR com status CANCELADA; cancelReason ausente ou em branco → 422 `CANCEL_REASON_REQUIRED`; venda ENTREGUE → 409 `SALE_NOT_CANCELLABLE`; venda já CANCELADA → 409

### Implementação — US3

- [x] T031 Implementar `SalesService.cancel()` em `apps/backend/src/modules/sales/sales.service.ts`: dentro de `$transaction` — buscar venda com items (404 se não encontrada), checar status = PENDENTE_ENTREGA (409 se não), checar cancelReason não vazio (422 se não), criar `ReadyStockEvent(ESTORNO_VENDA, qty positiva)` por item, atualizar `AccountReceivable.status = CANCELADA`, atualizar `Sale.status = CANCELADA` com cancelReason, cancelledAt, cancelledById; retornar resumo
- [x] T032 Implementar `SalesController.cancel()` em `apps/backend/src/modules/sales/sales.controller.ts`: `@Delete(':id')`, `@RequirePermission('SALES', 'CANCEL')`, receber `@Param('id')`, `@Body() CancelSaleDto` e `@CurrentUser()`
- [x] T033 Adicionar ação de cancelamento no frontend da US3: visível apenas quando status=PENDENTE_ENTREGA e usuário tem permissão CANCEL; ao clicar, solicitar confirmação e motivo obrigatório; ao confirmar, chamar `salesService.cancelSale`, invalidar queries e atualizar estado local sem refresh manual

**Checkpoint**: Cancelamento restaura estoque e cancela AR. Testes T030 passam. Botão de cancelamento funciona na UI.

---

## Phase 6: US4 — Consultar Histórico de Vendas (Priority: P2)

**Goal**: Lista de vendas com filtros (comprador, status, período, material) e detalhe completo.

**Independent Test**: GET /api/v1/sales retorna lista paginada; GET /api/v1/sales/:id retorna todos os campos incluindo items e AR.

### Testes — US4

- [x] T034 Adicionar casos de listagem/detalhe ao `apps/backend/test/integration/sales.spec.ts`: GET /sales sem filtro → lista paginada com campos corretos; filtro por buyerId → somente vendas daquele comprador; filtro por status → apenas o status solicitado; filtro por from/to → só vendas no período; GET /sales/:id → detalhe completo (buyer, items, AR, timeline com evento CREATED preenchido e DELIVERED/CANCELLED nulos); GET /sales/:id com id inválido → 404

### Implementação — US4

- [x] T035 Implementar `SalesService.findAll()` em `apps/backend/src/modules/sales/sales.service.ts`: filtros opcionais (buyerId, status, subcategoryId via items, from/to em createdAt); paginação (page, limit); retornar `{ data, total, page, limit }` com campos: id, buyer, status, totalAmount, itemsCount, createdAt, user
- [x] T036 Implementar `SalesService.findOne()` em `apps/backend/src/modules/sales/sales.service.ts`: buscar com include completo (buyer, items com subcategory e unit, user, deliveredBy, cancelledBy, accountReceivable); construir campo `timeline` derivado dos campos de status/data da Sale (CREATED sempre; DELIVERED quando `deliveredAt != null`; CANCELLED quando `cancelledAt != null`) conforme contrato de `GET /sales/:id`; 404 se não encontrada
- [x] T037 Implementar `SalesController.findAll()` `@Get()` e `SalesController.findOne()` `@Get(':id')` em `apps/backend/src/modules/sales/sales.controller.ts` com `@RequirePermission('SALES', 'READ')`; mapear query params (buyerId, status, subcategoryId, from, to, page, limit) para o service
- [x] T038 Completar `apps/frontend/src/pages/sales/SalesPage.tsx`: controles de filtro (seletor de comprador, seletor de status, campos de data de/até); paginação; link de cada linha para `SaleDetailPage` com id da venda; exibir itemsCount na linha

**Checkpoint**: Lista com filtros e detalhe funcionam via API e UI. Testes T034 passam.

---

## Phase 7: US5 — Vínculo com Conta a Receber (Priority: P3)

**Goal**: AccountReceivable criada automaticamente na venda (já implementado no US1); expor endpoint de listagem e visibilidade no frontend.

**Independent Test**: GET /api/v1/accounts-receivable lista AR criadas; AR de venda cancelada aparece com status CANCELADA.

### Testes — US5

- [x] T039 Adicionar casos de AR ao `apps/backend/test/integration/sales.spec.ts`: GET /accounts-receivable sem filtro → lista com amount, dueDate, status, buyer, sale (id, createdAt, deliveredAt); filtro por buyerId → somente AR daquele comprador; filtro por status A_RECEBER → somente pendentes; venda cancelada → AR com status CANCELADA; após entrega confirmada → sale.deliveredAt preenchido na resposta da AR; dueDate padrão = createdAt + 30 dias

### Implementação — US5

- [x] T040 Implementar `AccountsReceivableService.findAll()` em `apps/backend/src/modules/accounts-receivable/accounts-receivable.service.ts`: filtros (buyerId, status, dueDate from/to); paginação; retornar `{ data, total, page, limit }` com campos: id, sale (id, createdAt, deliveredAt), buyer, amount, dueDate, status — incluir `sale.deliveredAt` conforme contrato `GET /accounts-receivable`
- [x] T041 Implementar `AccountsReceivableController.findAll()` `@Get()` em `apps/backend/src/modules/accounts-receivable/accounts-receivable.controller.ts` com `@RequirePermission('ACCOUNTS_RECEIVABLE', 'READ')`; mapear query params para o service
- [x] T042 [P] Adicionar seção "Conta a Receber" ao `apps/frontend/src/pages/sales/SaleDetailPage.tsx`: exibir `dueDate`, `amount` formatado em R$, badge de status (A_RECEBER | CANCELADA); usar dados já incluídos no endpoint `GET /sales/:id`

**Checkpoint**: AR visível no detalhe da venda e listável via endpoint. Testes T039 passam.

---

## Phase 8: Polish e Validação Cruzada

**Purpose**: RBAC, auditoria, testes finais e validação manual.

- [x] T043 Adicionar bloco de testes RBAC ao `apps/backend/test/integration/sales.spec.ts`: SORTER pode `GET /sales` e `GET /sales/:id` (200); SORTER recebe 403 em `POST /sales`, `PATCH /sales/:id/deliver`, `DELETE /sales/:id`; DRIVER mesmo comportamento que SORTER; MANAGER pode todas as ações
- [x] T044 [P] Verificar que `AuditLog` registra eventos para criação de venda (action CREATE), confirmação de entrega (STATE_CHANGE) e cancelamento (STATE_CHANGE): adicionar asserções nos testes existentes ou em describe block separado em `apps/backend/test/integration/sales.spec.ts`
- [x] T045 Executar suíte completa de testes de integração de vendas: `cd apps/backend && npm test -- --testPathPattern=sales`; corrigir eventuais falhas antes de prosseguir
- [x] T046 Executar validação manual dos 6 cenários do `specs/007-vendas-operacionais/quickstart.md` contra o servidor local; registrar resultado (pass/fail) como comentário no final do arquivo quickstart.md

**Checkpoint**: Todos os testes passam; RBAC validado; audit logs presentes; validação manual completa.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sem dependências — iniciar imediatamente
- **Phase 2 (Foundational)**: Depende de Phase 1 (migração aplicada) — **bloqueia todas as histórias**
- **Phase 3 (US1)**: Depende de Phase 2 — MVP entregável
- **Phase 4 (US2)**: Depende de Phase 2; usa `Sale` já existente do US1
- **Phase 5 (US3)**: Depende de Phase 2; usa `Sale` + `AccountReceivable` do US1
- **Phase 6 (US4)**: Depende de Phase 2; lê dados criados pelos US1–US3
- **Phase 7 (US5)**: Depende de Phase 2; AR já criada no US1, apenas expõe o endpoint de listagem
- **Phase 8 (Polish)**: Depende de todas as fases anteriores desejadas

### User Story Dependencies

- **US1 (P1)**: Inicia após Phase 2 — nenhuma dependência de outra US
- **US2 (P1)**: Inicia após Phase 2 — testável com uma venda criada pelo US1
- **US3 (P2)**: Inicia após Phase 2 — testável independentemente (cria e cancela)
- **US4 (P2)**: Inicia após Phase 2 — lê dados de qualquer venda já existente
- **US5 (P3)**: Inicia após Phase 2 — AR já criada no US1; apenas adiciona endpoint de listagem

### Within Each Story

- Testes PRIMEIRO → implementar service → implementar controller → implementar UI
- Service antes do controller; controller antes da UI
- Confirmar que testes falham antes de implementar

### Parallel Opportunities

- T001, T002, T003 (enums) sequenciais — mesmo arquivo schema.prisma
- T008 (relações nos models existentes) pode ser feito no mesmo bloco de edição que T004–T007
- T010 e T011 (módulos NestJS) paralelos entre si
- T014, T015, T016 (DTOs) paralelos entre si
- T017 e T018 (services de frontend) paralelos entre si
- US2, US3, US4 podem ser trabalhadas em paralelo por membros diferentes da equipe após Phase 2

---

## Parallel Example: Phase 1

```bash
# T001, T002, T003 editam o mesmo arquivo (schema.prisma) — executar em sequência:
Task T001: "Extender enum ReadyStockEventType com VENDA e ESTORNO_VENDA"
Task T002: "Adicionar enum SaleStatus"
Task T003: "Adicionar enum AccountReceivableStatus"

# Após T001–T003, T004–T008 em sequência (dependência de declaração no schema):
Task T004 → T005 → T006 → T007
Task T008: relações nos models existentes (pode ser feito junto com T004–T007 no mesmo bloco de edição)
```

## Parallel Example: Phase 2

```bash
# DTOs todos paralelos (arquivos independentes):
Task T014: "CreateSaleDto"
Task T015: "DeliverSaleDto"
Task T016: "CancelSaleDto"

# Services de frontend paralelos entre si e com DTOs:
Task T017: "sales.service.ts"
Task T018: "accountsReceivable.service.ts"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO)
3. Completar Phase 3: US1 (registro de venda + consumo de estoque + AR)
4. **PARAR E VALIDAR**: testar via quickstart.md Cenários 1 e 2
5. Demonstrar: venda registrada, saldo reduzido, AR criada

### Incremental Delivery

1. Setup + Foundational → base pronta
2. US1 → venda registrada com consumo de estoque (MVP)
3. US2 → confirmação de entrega
4. US3 → cancelamento com estorno
5. US4 → consulta e filtros
6. US5 → listagem de contas a receber
7. Polish → RBAC, auditoria, validação manual

---

## Notes

- `[P]` = arquivos diferentes, sem dependência de task incompleta da mesma fase
- `[US?]` = mapeia para a história de usuário em spec.md
- Todas as operações de escrita no backend devem rodar dentro de `$transaction` Prisma para garantir atomicidade
- `ReadyStockEvent.quantity` é **negativa** para VENDA e **positiva** para ESTORNO_VENDA — mesma convenção dos tipos existentes
- A suíte de testes usa o banco real (sem mocks) — padrão do projeto conforme política de testes
- Commitar após cada phase ou checkpoint para facilitar rollback se necessário
