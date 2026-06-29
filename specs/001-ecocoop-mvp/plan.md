# Implementation Plan: EcoCoop MVP

**Branch**: `001-ecocoop-mvp` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-ecocoop-mvp/spec.md`

---

## Summary

EcoCoop é um sistema de gestão completo para cooperativas de reciclagem com instância dedicada por cooperativa. O MVP implementa o fluxo operacional completo: coleta com mapas → entrada de material bruto → triagem com reserva FIFO → estoque de material pronto e rejeito → venda para compradores → financeiro completo (CP/CR/CC) → rateio configurável com fechamento auditável. Stack: NestJS + Prisma + PostgreSQL no backend, React + Vite no frontend, monorepo com Docker Compose.

---

## Technical Context

**Language/Version**:
- Backend: Node.js 20 LTS + TypeScript 5.x + NestJS 10.x
- Frontend: TypeScript 5.x + React 18 + Vite 5

**Primary Dependencies**:
- Backend: `@nestjs/*`, `prisma@5`, `passport-jwt`, `bcrypt`, `puppeteer-core`, `@sparticuz/chromium`, `handlebars`, `class-validator`, `class-transformer`
- Frontend: `react`, `react-router-dom@6`, `@tanstack/react-query`, `zustand`, `leaflet`, `react-leaflet`, `tailwindcss`, `react-hook-form`, `zod`

**Storage**: PostgreSQL 16 (volume persistente no Docker Compose)

**Testing**:
- Backend: Jest + Supertest (unit + integration + e2e)
- Frontend: Vitest + React Testing Library

**Target Platform**: Linux VM, Docker Compose, acesso via navegador web

**Performance Goals**:
- API responses: < 500ms para operações comuns
- Dashboard load: < 3s
- Geração de PDF: < 10s
- Cálculo de rateio (20 cooperados): < 30s

**Constraints**:
- Instância dedicada por cooperativa — zero multi-tenancy
- Estoque somente por eventos (StockEvent append-only)
- Concorrência em triagem via `SELECT FOR UPDATE` em StockBalance
- Internet requerida para mapas (Nominatim + OpenStreetMap tiles)

**Scale/Scope**: 20–100 cooperados por cooperativa, 5–20 usuários internos, 1 instância por cooperativa

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Evidência |
|-----------|--------|-----------|
| I. Spec-Driven Development | ✅ | spec.md com 5 sessões de clarificação |
| II. Fluxo Operacional como Domínio | ✅ | Módulos seguem coleta→triagem→venda→financeiro→rateio |
| III. Rastreabilidade e Auditoria | ✅ | StockEvent append-only + AuditLog + FinancialLedger |
| IV. Imutabilidade do Estoque por Evento | ✅ | Nenhum endpoint altera saldo direto — apenas via StockEvent |
| V. Separação de Estados do Material | ✅ | StockBalance.stockType: RAW \| READY \| REJECT |
| VI. Financeiro Auditável | ✅ | FinancialLedger append-only, lançamentos vinculados a operações |
| VII. Rateio Transparente | ✅ | ProfitSharingPeriod.snapshotData congela inputs; detalhamento por cooperado |
| VIII. Instância Dedicada | ✅ | Docker Compose por cooperativa, sem multi-tenancy |
| IX. Portal do Comprador | ✅ | Perfil BUYER com redirecionamento automático + endpoints /portal/* |
| X. Cooperados com Login Individual | ✅ | User entity para todos, memberId/buyerId mutuamente exclusivos |
| XI. Permissões no Backend | ✅ | NestJS Guards + ProfilePermission verificados em todos os endpoints |
| XII. Pesagem Manual + Extensibilidade | ✅ | Interface `WeighingProvider` abstrata; MVP usa input manual |
| XIII. Mapas para Rotas | ✅ | Leaflet + Nominatim + nearest-neighbor, provider abstrato |
| XIV. Presença Configurável | ✅ | CooperativeSettings.attendanceEnabled, Guards checam flag |
| XV. Emissão de Documentos | ✅ | Puppeteer/Handlebars para todos os documentos listados |
| XVI. Estoque Flexível | ✅ | MeasureUnit com kgConversionFactor configurável |
| XVII. Materiais por Categorias | ✅ | MaterialCategory → MaterialSubcategory hierárquica |
| XVIII. Fluxo de Caixa Completo | ✅ | CP, CR, CC, ledger previsto/realizado |
| XIX. Relatórios Estratégicos | ✅ | SQL agregado no PostgreSQL, endpoints /reports/* |
| XX. Interface Responsiva | ✅ | Tailwind CSS mobile-first |
| XXI. Stack Definida | ✅ | NestJS + React + PostgreSQL exatamente como especificado |
| XXII. ADR | ✅ | docs/adr/ planejado; research.md documenta decisões iniciais |
| XXIII. Testes Obrigatórios | ✅ | Jest + Supertest para auth, stock, sorting, finance, sales, rateio, docs |
| XXIV. Consistência/Segurança | ✅ | Prisma transactions atômicas, bcrypt, HTTPS via Nginx |

**Resultado**: Todas as verificações passaram. Nenhuma violação identificada.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-ecocoop-mvp/
├── plan.md              ← Este arquivo
├── research.md          ← Decisões tecnológicas
├── data-model.md        ← Entidades e relacionamentos
├── quickstart.md        ← Guia de validação end-to-end
├── contracts/
│   └── rest-api.md      ← Contratos dos endpoints REST
└── tasks.md             ← (criado por /speckit-tasks)
```

### Source Code (repository root)

```text
ecocoop/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/
│   │   │   │   ├── decorators/        # @Roles(), @CurrentUser(), @Public()
│   │   │   │   ├── filters/           # GlobalExceptionFilter
│   │   │   │   ├── guards/            # JwtAuthGuard, RolesGuard, FeatureFlagGuard
│   │   │   │   └── interceptors/      # AuditInterceptor
│   │   │   ├── config/                # env validation, ConfigModule
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       ├── cooperative/
│   │   │       ├── users/
│   │   │       ├── materials/
│   │   │       ├── buyers/
│   │   │       ├── vehicles/
│   │   │       ├── routes/            # CollectionRoute + CollectionPoint
│   │   │       ├── stock/
│   │   │       │   ├── events/        # StockEvent service + StockBalance projection
│   │   │       │   ├── raw/           # Entradas manuais, ajustes
│   │   │       │   ├── sorting/       # SortingSession + FIFO reservation
│   │   │       │   ├── ready/         # Estoque pronto
│   │   │       │   └── reject/        # RejectStockItem lifecycle
│   │   │       ├── sales/
│   │   │       ├── finance/           # Ledger, CP, CR, CostCenter
│   │   │       ├── profit-sharing/    # Rules, Periods, Calculator
│   │   │       ├── members/           # Member, EPI, Attendance
│   │   │       ├── documents/         # PDF templates + generator
│   │   │       ├── reports/           # SQL aggregations
│   │   │       ├── dashboard/
│   │   │       └── maps/              # MapProvider interface + Nominatim impl
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   └── test/
│   │       ├── unit/
│   │       ├── integration/
│   │       └── e2e/
│   └── frontend/
│       ├── src/
│       │   ├── router/
│       │   ├── layouts/
│       │   │   ├── AdminLayout.tsx
│       │   │   └── BuyerPortalLayout.tsx
│       │   ├── pages/
│       │   │   ├── auth/
│       │   │   ├── dashboard/
│       │   │   ├── cooperative/
│       │   │   ├── users/
│       │   │   ├── materials/
│       │   │   ├── buyers/
│       │   │   ├── vehicles/
│       │   │   ├── routes/            # + MapView component (Leaflet)
│       │   │   ├── stock/
│       │   │   ├── sorting/
│       │   │   ├── sales/
│       │   │   ├── finance/
│       │   │   ├── profit-sharing/
│       │   │   ├── members/
│       │   │   ├── reports/
│       │   │   └── portal/            # Buyer portal pages
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── services/              # Axios API client + React Query
│       │   └── store/                 # Zustand (auth state, global UI)
│       └── public/
├── packages/
│   └── shared/
│       └── src/
│           └── types/                 # DTOs e enums compartilhados
├── docs/
│   └── adr/                           # Architecture Decision Records
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml         # Produção
│   │   ├── docker-compose.dev.yml     # Desenvolvimento
│   │   ├── Dockerfile.backend
│   │   └── Dockerfile.frontend
│   └── scripts/
│       ├── backup.sh                  # pg_dump cron
│       └── restore.sh
├── specs/
├── .specify/
├── package.json                       # npm workspaces root
└── turbo.json                         # Turborepo
```

**Structure Decision**: Monorepo com `apps/backend` (NestJS), `apps/frontend` (React/Vite) e `packages/shared` (tipos TypeScript). Docker Compose orquestra PostgreSQL 16, Redis (cache geocoding + refresh token blacklist), backend NestJS e frontend via Nginx.

---

## Strategy: Stock by Movement Events

### Event Sourcing + Materialized Projection

```
StockEvent (append-only, fonte da verdade)
    ↓ (mesma transação)
StockBalance (projeção, 3 campos: total / reserved / available)
```

**Regra**: Nenhum serviço altera `StockBalance` diretamente. Toda mutação passa por `StockEventService.createEvent()` que, em uma transação Prisma, insere o evento E atualiza `StockBalance` de acordo.

**Reconstrução de auditoria**: `StockEventService.rebuildBalance(subcategoryId)` recomputa o saldo do zero a partir de todos os eventos — disponível para verificação forense.

**Concorrência em triagem**: Ao abrir `SortingSession`, o serviço executa:
```sql
SELECT * FROM StockBalance
WHERE materialSubcategoryId = ? AND stockType = 'RAW'
FOR UPDATE NOWAIT
```
Se outra transação tiver o lock, retorna erro `DUPLICATE_SORTING_LOCK`. A quantidade reservada é verificada (`available >= requested`) e então `reserved += requested`, `available -= requested` — tudo dentro da transação.

---

## Strategy: Material States (Bruto → Triagem → Pronto → Rejeito)

```
RAW stock (StockBalance.stockType = RAW)
  ├── totalQuantity     — todas as entradas (via ENTRY events)
  ├── reservedQuantity  — em sessões de triagem abertas
  └── availableQuantity — total − reserved

  → SortingSession opens:
      RAW_RESERVE event → reserved += X, available -= X

  → SortingSession closes:
      RAW_EXIT_SORTING event → total -= X, reserved -= X
      READY_ENTRY event(s) → READY stock += Y (material pronto)
      REJECT_ENTRY event(s) → REJECT stock += Z (rejeito)
      LOSS recorded → no stock (just audit event)

  → SortingSession cancels:
      RAW_RESERVE_CANCEL event → reserved -= X, available += X

READY stock (StockBalance.stockType = READY)
  ├── totalQuantity  — disponível para venda
  └── Saídas: READY_EXIT_SALE (venda), READY_ADJUST (ajuste manual)

REJECT stock (RejectStockItem com lifecycle próprio)
  States: GENERATED → AVAILABLE → RESERVED_FOR_SALE → SOLD
                          ↘ FOR_DISCARD → DISCARDED
  Saídas:
    - Venda: REJECT_EXIT_SALE event → receita no financeiro
    - Descarte: REJECT_DISCARD event → custo opcional no financeiro
```

---

## Strategy: Financial (Caixa, CP, CR, CC)

### Append-Only Ledger

```
FinancialLedger (imutável após criação):
  CREDIT entries: receitas (vendas pagas, AR recebido, receita de rejeito)
  DEBIT  entries: despesas (CP pagas, custo de descarte, veículos)

  isProjected = true  → saldo previsto (AP pendente, AR pendente)
  isProjected = false → saldo realizado (pagamentos confirmados)
```

### Fluxo de Conciliação (manual no MVP):

```
1. Lançar AP: cria FinancialLedger(DEBIT, isProjected=true) + AccountPayable(PENDING)
2. Pagar AP: cria FinancialLedger(DEBIT, isProjected=false, settledAt=now)
             atualiza AccountPayable(PAID)
3. Caixa previsto = SUM(CREDIT isProjected) - SUM(DEBIT isProjected)
   Caixa realizado = SUM(CREDIT !isProjected) - SUM(DEBIT !isProjected)
```

### Auto-lançamentos vinculados:

| Evento | Lançamento automático |
|--------|----------------------|
| Venda registrada | AR (isProjected=true) criada |
| Venda paga | FinancialLedger(CREDIT, isProjected=false) + AR baixada |
| Abastecimento veículo | FinancialLedger(DEBIT, isProjected=false) no CC de Logística |
| Manutenção veículo | idem |
| Rejeito descartado com custo | FinancialLedger(DEBIT) + exige CC |

---

## Strategy: Configurable Profit Sharing with Auditable Close

### Cálculo em 3 etapas:

**1. Determinar valor total a distribuir** (base configurável):
```
NET_RESULT:    total = SUM(CREDIT realizado) - SUM(DEBIT realizado) no período
GROSS_REVENUE: total = SUM(CREDIT isProjected=false, category=SALE_REVENUE) no período
MANUAL:        total = valor inserido pelo gestor (com justificativa obrigatória)
```

**2. Aplicar critérios ponderados:**
```
Para cada critério na regra:
  EQUAL:       porção_i = total × percentage/100 ÷ n_cooperados
  BY_WEIGHT:   porção_i = total × percentage/100 × (peso_i / peso_total)
  BY_ATTENDANCE: porção_i = total × percentage/100 × (presença_i / presença_total)

resultado_cooperado_i = SUM(porção_i para cada critério)
```

**3. Fechar período (snapshot + freeze):**
```
ProfitSharingPeriod.status = CLOSED
ProfitSharingPeriod.snapshotData = {
  rule: <regra completa no momento do fechamento>,
  totalRevenue, totalCosts, totalAmount,
  memberData: [{ memberId, weightSorted, attendanceCount, result }]
}
ProfitSharingResult criado para cada cooperado com calculationDetail
```

Período CLOSED: nenhuma coluna pode ser alterada. Guard no endpoint verifica status antes de qualquer operação.

---

## Strategy: Buyer Portal (Single Auth System)

```
1. POST /auth/login → valida email+senha → gera JWT
2. JWT payload inclui: { sub: userId, profileType: 'BUYER', buyerId }
3. Response inclui: { redirectTo: '/portal' }
4. Frontend redireciona baseado em redirectTo
5. Rotas /portal/* protegidas por Guard que exige profileType = BUYER
6. Rotas /api/* (admin) rejeitam profileType = BUYER com 403
7. Dentro do portal: todas as queries filtram por buyerId do JWT
```

Guard `BuyerPortalGuard` verifica: `request.user.profileType === 'BUYER'`
Guard `AdminGuard` verifica: `request.user.profileType !== 'BUYER'`

---

## Strategy: Maps & Routes (MVP)

```
Backend (maps module):
  interface MapProvider {
    geocode(address): Promise<{lat, lng}>
    suggestOrder(points: {lat,lng}[]): Promise<number[]>
  }

  class NominatimProvider implements MapProvider {
    geocode() → calls Nominatim API (rate: 1 req/s, cache em DB)
    suggestOrder() → nearest-neighbor algorithm (O(n²), ok para ≤30 pontos)
  }

  GeocodingCache table: { address_hash, lat, lng, geocoded_at }
  — cache de 90 dias para evitar re-geocoding do mesmo endereço

Frontend (react-leaflet):
  <MapContainer> com tiles OpenStreetMap
  Marcadores para cada CollectionPoint
  Polyline conectando pontos na ordem definida
  Drag-and-drop na lista lateral para reordenar (não arrastar no mapa no MVP)
```

---

## Strategy: PDF Documents

```
Backend (documents module):
  class DocumentGenerator {
    generate(templateName: string, data: object): Promise<Buffer>
  }

  Internamente:
  1. Carrega template Handlebars de templates/pdf/<nome>.hbs
  2. Renderiza HTML com os dados
  3. Lança Puppeteer (headless Chrome via @sparticuz/chromium)
  4. Retorna Buffer do PDF

Templates:
  templates/pdf/
  ├── romaneio.hbs
  ├── delivery-receipt.hbs
  ├── purchase-receipt.hbs
  ├── epi-term.hbs
  ├── profit-sharing-receipt.hbs
  └── reports/
      ├── result-report.hbs
      └── stock-report.hbs
```

---

## Strategy: Audit & History

**Três camadas de auditoria**:

1. **StockEvent** — imutável, contém toda a história de movimentação de estoque. Reconstrução de saldo via replay.

2. **FinancialLedger** — append-only, toda a história financeira. Conciliação por reconstrução do razão.

3. **AuditLog** — eventos gerais de CRUD e state changes em outras entidades. Gerado automaticamente por `AuditInterceptor` do NestJS para todos os endpoints mutáveis autenticados.

**AuditInterceptor** registra:
- entity_type (inferido do controller)
- entity_id (do parâmetro de rota ou response body)
- action (derivado do HTTP method: POST→CREATE, PUT/PATCH→UPDATE, DELETE→DELETE)
- previous_state (fetch before mutation quando necessário)
- new_state (response body após mutação)
- user_id, ip_address, user_agent

---

## Strategy: Required Tests

| Módulo | Tipo | O que testar |
|--------|------|-------------|
| Auth | Unit + Integration | Login correto/errado, JWT expirado, refresh token, bloqueio de conta desativada |
| Permissions | Integration | Matriz perfil × endpoint (todos os 6 perfis × rotas críticas) |
| Stock Events | Unit | createEvent atualiza StockBalance atomicamente; rebuildBalance idempotente |
| Sorting FIFO | Unit + Integration | FIFO selection order; SELECT FOR UPDATE previne over-reservation; cancelamento libera reserva |
| Sorting Close | Integration | Reconciliação obrigatória; READY/REJECT/LOSS events criados atomicamente |
| Finance | Unit + Integration | Ledger saldo calculado corretamente; AP pay→ledger; AR receive→ledger |
| Sales | Integration | Stock deduction no READY_EXIT_SALE; AR criada automaticamente; blocking if insufficient |
| Profit Sharing | Unit | Cálculo EQUAL, BY_WEIGHT, BY_ATTENDANCE correto; snapshot congela dados; período fechado é imutável |
| Documents | Integration | Todos os templates geram PDF sem erro; conteúdo contém campos obrigatórios |
| Buyer Portal | Integration | Comprador acessa apenas próprias vendas; não acessa rotas admin; confirma entrega |

---

## Technical Risks & Pending Decisions

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Nominatim rate limit (1 req/s) | Médio — lentidão ao geocodificar muitos pontos | Cache obrigatório em DB (GeocodingCache table, TTL 90 dias) |
| Puppeteer image size (~50MB comprimido) | Baixo — tamanho do container Docker | Usar `@sparticuz/chromium` (versão compacta para Lambda/containers) |
| SELECT FOR UPDATE em alta concorrência | Baixo — esperado < 20 operadores simultâneos | Monitorar tempos de lock; se necessário, fila de triagem |
| Cálculo de rateio com dados históricos volumosos | Médio se cooperativa crescer | Agregar dados em ProfitSharingPeriod.snapshotData ao fechar; não recalcular do zero ao visualizar |
| AuditLog crescimento | Baixo-médio no MVP | Planejar particionamento por mês após go-live (PostgreSQL declarative partitioning) |
| Nearest-neighbor para rotas > 30 pontos | Baixo — improvável no MVP | Documentar limite; integração OSRM como evolução futura |

**Decisões Pendentes (ADR necessário)**:
- ADR-001: Prisma vs TypeORM — decidido (Prisma); documentar motivação
- ADR-002: Puppeteer vs PDFKit para geração de PDF
- ADR-003: Leaflet vs Mapbox para mapas
- ADR-004: npm workspaces vs pnpm workspaces no monorepo
- ADR-005: Redis para blacklist de refresh tokens vs rotação de chave JWT

---

## First Implementation Scope

> **Instrução para `/speckit-tasks`**: gere tarefas **somente para a Fase 1 — Fundação**. As fases 2 a 9 estão documentadas abaixo como referência do MVP completo, mas não devem entrar na geração de tasks nesta execução.

### O que entra na primeira implementação

| # | Entregável |
|---|-----------|
| 1 | Estrutura do monorepo |
| 2 | Configuração de workspaces (npm workspaces + Turborepo) |
| 3 | Backend NestJS com TypeScript |
| 4 | Frontend React + TypeScript + Vite |
| 5 | PostgreSQL com Docker Compose de desenvolvimento |
| 6 | Prisma configurado com schema inicial |
| 7 | Módulo de autenticação |
| 8 | Login com JWT e refresh token |
| 9 | Hash de senha com bcrypt |
| 10 | RBAC básico com perfis e permissões |
| 11 | Guards de autenticação e autorização no backend |
| 12 | Entidades iniciais: `User`, `Profile`, `Permission`, `Cooperative`, `CooperativeSettings`, `AuditLog` |
| 13 | CRUD básico de usuários |
| 14 | CRUD básico de perfis/permissões (mínimo necessário para RBAC) |
| 15 | Endpoint de configuração inicial da cooperativa |
| 16 | `AuditInterceptor` básico para endpoints mutáveis autenticados |
| 17 | Seed inicial com perfis padrão |
| 18 | Frontend com login, layout autenticado, controle de sessão e tela inicial |
| 19 | Redirecionamento por perfil preparado (inclui perfil BUYER, sem portal completo) |
| 20 | Testes obrigatórios: auth, refresh token, permissões e bloqueio de acesso |

### O que NÃO entra na primeira implementação

Esses domínios estão documentados nas fases 2–9 e serão implementados em ciclos posteriores:

- Materiais (categorias, subcategorias, unidades de medida)
- Compradores e portal do comprador
- Veículos
- Rotas de coleta e mapas
- Estoque (bruto, pronto, rejeito)
- Triagem
- Vendas
- Financeiro (CP, CR, fluxo de caixa, centros de custo)
- Rateio
- EPIs
- Presença
- Documentos PDF
- Dashboard avançado
- Relatórios

---

## Implementation Phases

### Fase 1 — Fundação (3–4 semanas)

Objetivo: Sistema funcionando com auth, RBAC, dados mestres mínimos e frontend autenticado.

- Monorepo setup (npm workspaces + Turborepo)
- Docker Compose dev environment (PostgreSQL, backend, frontend)
- Prisma schema v1 — entidades: `User`, `Profile`, `Permission`, `Cooperative`, `CooperativeSettings`, `AuditLog`
- Auth module: login, JWT, refresh token, hash bcrypt, RBAC guards
- `AuditInterceptor` básico para endpoints mutáveis autenticados
- Cooperative setup endpoint (configuração inicial da cooperativa)
- User management — CRUD básico (criar, listar, ativar/desativar)
- Profile/Permission CRUD básico (somente o necessário para RBAC inicial)
- Seed com perfis padrão (ADMIN, MANAGER, OPERATOR, MEMBER, BUYER)
- Frontend: tela de login, layout autenticado, controle de sessão, tela inicial
- Redirecionamento por perfil preparado (incluindo rota `/portal` para BUYER, sem implementar portal completo)
- Testes obrigatórios: auth (login, JWT, refresh token), permissões, bloqueio de acesso não autorizado

**Fora do escopo da Fase 1**: materiais, compradores, veículos, rotas, mapas, estoque, triagem, vendas, financeiro, rateio, EPIs, presença, documentos PDF, dashboard avançado, relatórios.

### Fase 2 — Coleta e Estoque Bruto (3–4 semanas)

Objetivo: Rota de coleta com mapa funcionando + entrada de material bruto.

- Maps module (MapProvider interface + NominatimProvider + GeocodingCache)
- CollectionRoute CRUD + CollectionPoint + reordenação
- Frontend: Leaflet MapView com pontos e polyline
- Sugestão de sequência (nearest-neighbor)
- Execução de rota (IN_PROGRESS → COMPLETED)
- StockEvent + StockBalance infrastructure
- StockEventService com transações atômicas
- Entrada manual de material bruto (RAW_ENTRY)
- Ajuste de estoque bruto
- Integração: conclusão de rota → RAW_ENTRY events automáticos
- Testes: stock events, balance projection, route execution

### Fase 3 — Triagem, Material Pronto e Rejeito (3–4 semanas)

Objetivo: Fluxo completo de triagem com FIFO e ciclo de vida do rejeito.

- SortingSession module (open/close/cancel)
- FIFO reservation com SELECT FOR UPDATE
- SortingSessionItem (READY, REJECT, LOSS)
- Reconciliação obrigatória no encerramento
- RejectStockItem lifecycle (estados + transitions)
- Venda de rejeito (fluxo simplificado via Sales module)
- Descarte de rejeito (custo opcional no financeiro)
- Testes: FIFO, concorrência, reconciliação, atomic events

### Fase 4 — Vendas e Portal do Comprador (2–3 semanas)

Objetivo: Venda de material pronto, portal do comprador, documentos de venda.

- Sales module (Sale + SaleItem)
- Stock deduction automática (READY_EXIT_SALE)
- AccountReceivable criada automaticamente
- Buyer portal (redirecionamento por perfil, rotas /portal/*)
- Comprador confirma recebimento via portal
- Documentos PDF: romaneio, comprovante de entrega
- Testes: sales flow, AR creation, buyer isolation

### Fase 5 — Financeiro Completo (3–4 semanas)

Objetivo: Fluxo de caixa, CP, CR, CC e lançamentos vinculados a operações.

- FinancialLedger completo (append-only + isProjected)
- AccountPayable CRUD + pagamento + baixa no ledger
- AccountReceivable manual + recebimento + baixa
- CostCenter filter em todos os lançamentos
- Auto-lançamento: abastecimento veículo → ledger
- Auto-lançamento: manutenção veículo → ledger
- Dashboard: saldo previsto/realizado, contas a vencer
- Testes: ledger atomicidade, balance calculation

### Fase 6 — Rateio Configurável (2–3 semanas)

Objetivo: Regras de rateio, cálculo, snapshot e comprovantes.

- ProfitSharingRule (configuração de critérios + validação 100%)
- ProfitSharingCalculator (EQUAL, BY_WEIGHT, BY_ATTENDANCE)
- ProfitSharingPeriod (preview + close + snapshot)
- Imutabilidade após fechamento
- Comprovante PDF de rateio individual
- Cooperado vê próprio resultado no painel
- Testes: cálculo correto, snapshot imutável, period close

### Fase 7 — Cooperados, EPIs e Presença (1–2 semanas)

Objetivo: Gestão completa de cooperados, EPIs e presença opcional.

- Member management CRUD
- EPI delivery + histórico + termo PDF
- AttendanceRecord (com feature flag CooperativeSettings.attendanceEnabled)
- FeatureFlagGuard para rotas de presença
- Integração presença → critério BY_ATTENDANCE no rateio
- Testes: EPI delivery, attendance feature flag

### Fase 8 — Relatórios e Dashboard (2–3 semanas)

Objetivo: Inteligência estratégica e indicadores operacionais.

- Relatório de resultado do período (PDF)
- Relatório de posição de estoque (PDF)
- Relatório de eficiência de triagem (% aproveitado, rejeito, perda)
- Rentabilidade por rota de coleta
- Receita por material e por comprador
- Custo por veículo
- Dashboard por perfil (gestor vs cooperado)
- Alertas: contas a vencer, rejeito sem destinação
- Testes: relatórios retornam dados corretos, PDFs gerados

### Fase 9 — Go-Live Prep (2–3 semanas)

Objetivo: Qualidade, segurança e operação em produção.

- Cobertura de testes ≥ 80% nas áreas críticas
- Security review (OWASP top 10, injection, XSS, CORS)
- Docker Compose produção (Nginx, HTTPS, env vars)
- Backup strategy (`pg_dump` cron, retenção 30 dias)
- Seed de dados iniciais (perfis padrão, unidades básicas, categorias comuns)
- Documentação de operação (`docs/operations.md`)
- ADRs formalizados para todas as decisões do research.md

**Total estimado**: 22–30 semanas para MVP completo

---

## Complexity Tracking

> Nenhuma violação da Constituição identificada. Seção não aplicável.
