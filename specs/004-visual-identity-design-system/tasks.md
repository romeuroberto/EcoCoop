# Tasks: Identidade Visual e Design System Base

**Feature**: `004-visual-identity-design-system`
**Branch**: `004-visual-identity-design-system`
**Input**: Design documents from `/specs/004-visual-identity-design-system/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/ui-components.md ✅ · quickstart.md ✅

**Scope**: Frontend only — `apps/frontend/`. Sem alterações em backend, schema Prisma, migrations, seeds, permissões ou contratos REST.

**Validação econômica** (executar ao final de cada fase):

```bash
npx -w apps/frontend tsc --noEmit
npx -w apps/frontend vite build
```

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências incompletas)
- **[USn]**: User story a que a tarefa pertence (rastreabilidade com spec.md)
- Caminhos de arquivo exatos incluídos em cada descrição

---

## Phase 1: Setup

**Purpose**: Documentação de decisão arquitetural obrigatória (Princípio XXII da Constituição)

- [x] T001 Create docs/adr/004-design-tokens.md documenting paleta institucional decision (petroleo/ecocoop/grafite), component library strategy (src/components/ui/ as internal library, no external UI lib), and backward compat approach (brand-* preserved during transition). Create directory first if absent with `mkdir -p docs/adr/`

---

## Phase 2: Foundational — Tokens Visuais e Componentes Base

**Purpose**: Infraestrutura visual compartilhada que DEVE ser concluída antes de qualquer user story

**⚠️ CRÍTICO**: Nenhuma tela pode ser implementada antes desta fase. As classes Tailwind novas (`petroleo-*`, `ecocoop-*`, `grafite-*`) e todos os 8 componentes base precisam existir primeiro.

- [x] T002 Update apps/frontend/tailwind.config.js extending theme.extend.colors with: petroleo scale (50–900, primary #1e4a6e at 600), ecocoop scale (50–900, accent #0d7a7a at 600), grafite scale (50–900, neutral #343a40 at 800); preserve existing brand-50/500/600/700 (green) untouched for backward compat with telas fora do recorte
- [x] T003 [P] Create apps/frontend/src/components/ui/Badge.tsx: export BadgeVariant (active | inactive | planned | in_progress | completed | cancelled | pending) and BadgeProps (variant, label?, size?: 'sm'|'md', className?); render span role="status" aria-label={label}; color map per contracts/ui-components.md (active=green-50/700/200, inactive=grafite-100/600/200, planned=sky-50/700/200, in_progress=amber-50/700/200, completed=ecocoop-50/700/200, cancelled=red-50/700/200, pending=orange-50/700/200)
- [x] T004 [P] Create apps/frontend/src/components/ui/Button.tsx: export ButtonVariant (primary | secondary | ghost | danger), ButtonSize (sm | md | lg), ButtonProps extending React.ButtonHTMLAttributes<HTMLButtonElement> (variant?, size?, isLoading?, leftIcon?); implement variants (primary: bg-petroleo-600 text-white hover:bg-petroleo-700; secondary: border border-petroleo-300 text-petroleo-600 hover:bg-petroleo-50; ghost: text-grafite-700 hover:bg-grafite-100; danger: bg-red-600 text-white hover:bg-red-700); sizes (sm: px-3 py-1.5 text-xs; md: px-4 py-2 text-sm; lg: px-5 py-2.5 text-base); isLoading: aria-busy="true" aria-disabled="true" + inline SVG spinner animate-spin aria-hidden; focus-visible:ring-2 focus-visible:ring-petroleo-500 focus-visible:ring-offset-2
- [x] T005 [P] Create apps/frontend/src/components/ui/PageHeader.tsx: export PageHeaderProps (title: string, subtitle?: string, actions?: React.ReactNode, className?: string); layout flex items-start justify-between mb-6; title text-2xl font-bold text-grafite-900; subtitle text-sm text-grafite-500 mt-1
- [x] T006 [P] Create apps/frontend/src/components/ui/EmptyState.tsx: export EmptyStateProps (title: string, description?: string, action?: React.ReactNode, icon?: React.ReactNode, className?: string); layout flex flex-col items-center justify-center py-12 text-center gap-3; icon wrapper w-12 h-12 text-grafite-300; title text-grafite-700 font-medium; description text-grafite-500 text-sm
- [x] T007 [P] Create apps/frontend/src/components/ui/LoadingState.tsx: export LoadingStateProps (variant?: 'spinner'|'skeleton', rows?: number, message?: string, className?); wrapper role="status" aria-label={message ?? 'Carregando...'}; spinner: centered SVG w-8 h-8 animate-spin text-petroleo-600; skeleton: {rows ?? 5} div rows h-4 bg-grafite-200 animate-pulse rounded with alternating widths (full, 3/4, 5/6)
- [x] T008 [P] Create apps/frontend/src/components/ui/Pagination.tsx: export PaginationProps (page: number, totalPages: number, onPageChange: (page: number) => void, showInfo?: boolean, className?: string); layout flex items-center justify-center gap-2 mt-4; "← Anterior" button disabled when page===1; "Próxima →" button disabled when page===totalPages; disabled:opacity-40 disabled:cursor-not-allowed; showInfo (default true): span "Página {page} de {totalPages}" text-sm text-grafite-600
- [x] T009 [P] Create apps/frontend/src/components/ui/FilterBar.tsx: export FilterBarProps (children: React.ReactNode, className?: string); wrapper div bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-3 mb-6
- [x] T010 [P] Create apps/frontend/src/components/ui/Breadcrumbs.tsx: export BreadcrumbItem (label: string, href?: string) and BreadcrumbsProps (items?: BreadcrumbItem[], className?); when items omitted auto-generate via useLocation().pathname split + SEGMENT_LABELS Record<string,string> map covering every real authenticated route segment currently present in apps/frontend/src/router/index.tsx so no authenticated segment appears as raw URL text in breadcrumbs. Include at minimum: dashboard→'Dashboard', cooperative→'Cooperativa', users→'Usuários', profiles→'Perfis', members→'Cooperados', member-roles→'Funções', materials→'Materiais' when present, material-categories→'Categorias', material-subcategories→'Subcategorias', units→'Unidades', units-of-measure→'Unidades de Medida' when present, buyers→'Compradores', vehicles→'Veículos', epi-types→'Tipos de EPI', cost-centers→'Centros de Custo', collection-points→'Pontos de Coleta', collection-routes→'Rotas de Coleta', raw-material-balance→'Saldo Bruto', material-entries→'Entrada de Material Bruto', new→'Novo', edit→'Editar', plus any demais segmentos existentes no router real. For UUID/dynamic id segments, use a non-raw label such as 'Detalhe' or omit the segment from visible breadcrumb; render nav aria-label="Breadcrumb" > ol > li list; separator '/' between items; last item: span aria-current="page" text-grafite-900 font-medium; previous items: Link text-petroleo-600 hover:underline
- [x] T011 Create apps/frontend/src/components/ui/index.ts barrel export: export { Badge } from './Badge'; export { Button } from './Button'; export { PageHeader } from './PageHeader'; export { EmptyState } from './EmptyState'; export { LoadingState } from './LoadingState'; export { Pagination } from './Pagination'; export { FilterBar } from './FilterBar'; export { Breadcrumbs } from './Breadcrumbs'; export type { BadgeVariant, BadgeProps } from './Badge'; export type { ButtonVariant, ButtonSize, ButtonProps } from './Button' — NOTE: Breadcrumbs omitido do barrel no recorte 004A; Card.tsx adicionado como componente extra (user request)
- [x] T012 Run npx -w apps/frontend tsc --noEmit — zero errors required before any user story begins

**Checkpoint**: Todos os tokens e componentes base disponíveis — user stories US1 e US2 podem começar em paralelo

---

## Phase 3: User Story 1 — Percepção de Produto Profissional ao Fazer Login (Priority: P1) 🎯 MVP

**Goal**: LoginPage com identidade visual institucional — primeiro ponto de contato do operador transforma a percepção de "admin template genérico" para produto dedicado.

**Independent Test**: Acessar `/login` sem autenticação e verificar: fundo bg-grafite-50 (não cinza genérico), card centralizado max-w-md shadow-md, "EcoCoop" text-petroleo-600, subtítulo "Gestão de cooperativas de reciclagem", inputs com focus ring petroleo-500 (azul, não verde), botão "Entrar" bg-petroleo-600. Redimensionar para 375px: formulário utilizável sem scroll horizontal. Funcionalidade preservada: erro exibido com credenciais inválidas, sucesso redireciona para dashboard.

- [ ] T013 [US1] Restyle apps/frontend/src/pages/auth/LoginPage.tsx: page wrapper min-h-screen bg-grafite-50 flex items-center justify-center p-4; card div max-w-md w-full mx-auto bg-white rounded-2xl shadow-md p-8; brand section: h1 "EcoCoop" text-2xl font-bold text-petroleo-600, p "Gestão de cooperativas de reciclagem" text-sm text-grafite-500 mt-1 mb-8; input fields: border-grafite-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-petroleo-500 focus:border-petroleo-500; replace any green submit button with Button variant="primary" type="submit" w-full; error message div text-red-600 text-sm; preserve all existing auth logic (form state, API call, redirect)
- [ ] T014 [US1] Run npx -w apps/frontend tsc --noEmit && npx -w apps/frontend vite build (checkpoint US1)

**Checkpoint**: US1 completo e testável independentemente. Login funcional com nova identidade visual petroleo.

---

## Phase 4: User Story 2 — Navegação Principal Clara com Contexto de Localização (Priority: P1)

**Goal**: Layout global com Sidebar responsiva, Topbar com breadcrumbs automáticos e Dashboard reestilizado — o gestor sabe sempre onde está na hierarquia do sistema e quais módulos já estão realmente disponíveis.

**Independent Test**: Acessar `/dashboard` após login e verificar: sidebar bg-petroleo-800 à esquerda com link "Dashboard" em destaque (bg-petroleo-700 text-white); topbar bg-white border-b mostra breadcrumbs "Dashboard" + email do usuário + botão Sair; Dashboard exibe cards agrupados por áreas operacionais; cards ativos apontam apenas para rotas existentes; Triagem, Estoque pronto, Rejeito, Vendas operacionais, Financeiro, Rateio e Relatórios avançados aparecem com badge "Em breve" e sem ação principal ativa; redimensionar 375px: hamburger visível, clicar abre sidebar como overlay fixo; clicar overlay fecha sidebar; tecla ESC fecha sidebar.

- [x] T015 [US2] Create apps/frontend/src/layouts/Sidebar.tsx: export NavLink (to: string, label: string, module: string, icon?: React.ReactNode) and SidebarProps (isOpen: boolean, onClose: () => void, navLinks: NavLink[], hasAccess: (module: string) => boolean); bg-petroleo-800 text-white w-64; header with "EcoCoop" logo/wordmark; nav links: active detection via useLocation().pathname.startsWith(link.to) → bg-petroleo-700 rounded-lg px-3 py-2; inactive: text-grafite-200 hover:bg-petroleo-700/50 px-3 py-2 rounded-lg; responsive: lg:relative lg:flex lg:translate-x-0 fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out -translate-x-full when !isOpen; overlay: div fixed inset-0 bg-black/30 z-30 lg:hidden onClick={onClose} visible when isOpen; hasAccess(module) gates each link
- [x] T016 [US2] Create apps/frontend/src/layouts/Topbar.tsx: export TopbarProps (onMenuClick: () => void); bg-white border-b border-grafite-200 h-14 px-4 flex items-center justify-between shadow-sm; left: button hamburger lg:hidden onClick={onMenuClick} p-2 rounded text-grafite-700 hover:bg-grafite-100 focus-visible:ring-2 focus-visible:ring-petroleo-500, then Breadcrumbs auto-generated; right: user email text-sm text-grafite-700, Badge with user profileType as variant label, Button variant="ghost" size="sm" onClick={logout} "Sair"; read user from useAuthStore (existing store)
- [x] T017 [US2] Update apps/frontend/src/layouts/AdminLayout.tsx: add const [isSidebarOpen, setIsSidebarOpen] = useState(false); define navLinks array from existing navigation items (preserve same routes and hasAccess calls); replace existing sidebar/nav with <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} navLinks={navLinks} hasAccess={hasAccess} />; add <Topbar onMenuClick={() => setIsSidebarOpen(true)} /> above main; main content: flex-1 overflow-auto bg-grafite-50 p-6; outer wrapper: flex h-screen overflow-hidden
- [x] T018 [P] [US2] Update apps/frontend/src/pages/dashboard/DashboardPage.tsx: replace h1 header with PageHeader title="Dashboard"; replace hardcoded gray-* and green-* classes with grafite-* and petroleo-* tokens; redesign module cards as grouped operational navigation without adding domain functionality. Groups and active cards: Cadastros (Cooperados→/members, Funções→/member-roles, Categorias→/material-categories, Subcategorias→/material-subcategories, Unidades→/units, Compradores→/buyers, Veículos→/vehicles, Tipos de EPI→/epi-types, Centros de Custo→/cost-centers), Coleta (Pontos de Coleta→/collection-points, Rotas de Coleta→/collection-routes with text for gestão/listagem das rotas, Execução de Rotas→/collection-routes with text for acesso operacional ao fluxo de execução), Material Bruto / Estoque Bruto (Entrada de Material Bruto→/collection-routes with exact helper text "Acesse via Rotas de Coleta > Detalhe da Rota"; this card does not create a new route or feature, it only guides the user to the existing route detail/material entry flow, Saldo Bruto→/raw-material-balance). Future cards must remain disabled/no primary action with Badge label "Em breve": Triagem, Estoque pronto, Rejeito, Vendas operacionais, Financeiro, Rateio, Relatórios avançados. Preserve all existing data fetching and cooperative info display; do not unlock cards without existing frontend route; do not alter backend, permissions, schema or business rules.
- [x] T019 [US2] Run npx -w apps/frontend tsc --noEmit && npx -w apps/frontend vite build (checkpoint US2)

**Checkpoint**: US2 completo. Layout global funciona nos 3 breakpoints. Sidebar responsiva, breadcrumbs automáticos, Dashboard com nova identidade.

---

## Phase 5: User Stories 3+4 — Telas-Modelo: Pontos de Coleta e Rotas de Coleta (Priority: P2)

**Goal**: CollectionPointsPage e CollectionRoutesPage com design system completo — badges semânticos de status, page headers padronizados, FilterBar, LoadingState, EmptyState e Pagination substituindo todas as implementações inline.

**Independent Test (US3 — status)**: Tabela de pontos de coleta exibe Badge correto: ativo→verde, inativo→grafite, pendente→laranja, geocodificado→teal. Busca sem resultado → EmptyState com mensagem contextual. Carregando → LoadingState no lugar da tabela.

**Independent Test (US4 — headers)**: Ambas as telas exibem PageHeader com título, subtítulo e Button primary à direita. FilterBar estilizado (bg-white shadow-sm rounded-xl). Paginação visível apenas quando totalPages > 1. Botões de ação usam variantes primary/secondary/ghost consistentes.

- [ ] T020 [P] [US3] Restyle apps/frontend/src/pages/collection-points/CollectionPointsPage.tsx: replace heading + action row → PageHeader (title="Pontos de Coleta", subtitle="Gerencie os pontos de coleta da cooperativa", actions=<Button onClick={()=>navigate('/collection-points/new')}>Novo ponto</Button>); wrap filter inputs in FilterBar; replace all inline STATUS_COLORS and bg-green-*/bg-gray-* badge divs → Badge (active/inactive/pending/completed variants per status value); replace loading text/div → LoadingState variant="skeleton" rows={8}; replace empty text/div → EmptyState (title contextual on search vs no-data); replace inline prev/next pagination → Pagination component; preserve all existing API calls, hooks, navigation and table columns, especially the existing actions column and its current actions per FR-006
- [ ] T021 [P] [US3] Restyle apps/frontend/src/pages/collection-routes/CollectionRoutesPage.tsx: replace heading + action row → PageHeader (title="Rotas de Coleta", actions=<Button onClick={()=>navigate('/collection-routes/new')}>Nova rota</Button>); wrap status filter in FilterBar; replace all inline STATUS_COLORS and colored spans → Badge (planned/in_progress/completed/cancelled variants per RouteStatus enum); replace loading div → LoadingState variant="skeleton" rows={8}; replace empty div → EmptyState; replace inline pagination → Pagination; preserve "Ver" action link to CollectionRouteDetailPage and all existing table columns, route status filter logic, and the existing actions column per FR-006
- [ ] T022 [US3] Run npx -w apps/frontend tsc --noEmit && npx -w apps/frontend vite build (checkpoint US3/US4)

**Checkpoint**: US3+US4 completos. As 4 telas-modelo (Login, Dashboard, Pontos de Coleta, Rotas de Coleta) entregam design system completo.

---

## Phase 6: User Story 5 — Responsividade, Acessibilidade e Polish (Priority: P3)

**Purpose**: Cross-cutting polish nos 3 breakpoints (375px / 768px / 1440px) e conformidade WCAG 2.1 AA. Validação final de não-regressão.

**Independent Test**: Cada tela-modelo em 375px: zero scroll horizontal, sidebar como overlay, form/tabela utilizáveis. Tab navigation em cada tela: foco visível em todos os elementos interativos na ordem lógica.

- [ ] T023 [P] [US5] Audit and fix mobile (375px) layout in apps/frontend/src/pages/auth/LoginPage.tsx (card w-full px-4), apps/frontend/src/pages/collection-points/CollectionPointsPage.tsx and apps/frontend/src/pages/collection-routes/CollectionRoutesPage.tsx: wrap table in div overflow-x-auto w-full; ensure Button components have min touch target (min-h-[44px]); verify FilterBar children (inputs, selects) use min-w-0 flex-1 to prevent overflow
- [ ] T024 [P] [US5] Audit and fix keyboard accessibility: in apps/frontend/src/layouts/Sidebar.tsx add aria-hidden="true" to nav when closed on mobile (or tabIndex={-1} on all links) to prevent focus leak under overlay; in apps/frontend/src/layouts/Topbar.tsx ensure hamburger button has visible focus-visible:ring-2; audit apps/frontend/src/pages/auth/LoginPage.tsx tab order (email → password → submit → forgot link if any); confirm all interactive elements across the 4 model screens use focus-visible:ring-2 focus-visible:ring-petroleo-500
- [ ] T025 [P] [US5] Verify WCAG AA contrast in apps/frontend/src/components/ui/Badge.tsx (all 7 variants ≥4.5:1 text-on-bg ratio — reference research.md R-005 verified ratios); verify apps/frontend/src/components/ui/Button.tsx (primary white-on-petroleo-600 ≥4.5:1, danger white-on-red-600 ≥4.5:1); adjust any failing inline color classes
- [ ] T026 Verify telas fora do recorte remain unaffected: grep -r "from '@/components/ui'" apps/frontend/src/pages/{members,material-categories,vehicles,buyers,units,epi-types,cost-centers,member-roles} to confirm no accidental imports; then run npx -w apps/frontend tsc --noEmit
- [ ] T027 Run final validation: npx -w apps/frontend tsc --noEmit && npx -w apps/frontend vite build (checkpoint final — feature completa)

**Checkpoint**: Feature completa. Todas as 5 user stories implementadas, 4 telas-modelo com design system, build limpo, acessibilidade básica WCAG AA.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Pode começar imediatamente — sem dependências
- **Foundational (Phase 2)**: Depende de Phase 1 (convenção) — **BLOQUEIA** todas as user stories
- **US1 (Phase 3)**: Depende de Phase 2 (T012 passed) — independente de US2
- **US2 (Phase 4)**: Depende de Phase 2 (T012 passed) — pode rodar em paralelo com US1
- **US3+US4 (Phase 5)**: Depende de US2 (T019 passed) para layout global estar pronto; US1 completo (T014) também recomendado
- **Polish (Phase 6)**: Depende de US1+US2+US3/US4 completos (T014+T019+T022)

### User Story Dependencies

- **US1 (P1)**: Independente após Phase 2 — apenas LoginPage, sem dependência de layout
- **US2 (P1)**: Independente após Phase 2 — Sidebar, Topbar, AdminLayout, Dashboard
- **US3+US4 (P2)**: Depende de US2 completo (layout disponível) para telas serem visíveis no contexto correto
- **US5 (P3)**: Depende de US1+US2+US3+US4 completos

### Within Each Phase

- T003–T010: paralelos entre si, mas todos após T002 (tailwind config deve existir primeiro)
- T011: após T003–T010 (barrel export requer todos os arquivos existentes)
- T015–T017: executar nesta sequência (Sidebar → Topbar → AdminLayout integra ambos)
- T018: paralelo com T015+T016 (DashboardPage é arquivo independente)
- T020 e T021: paralelos entre si (arquivos independentes)
- T023, T024, T025: paralelos entre si (auditam arquivos diferentes)

### Parallel Execution Examples

```bash
# Phase 2 — 8 componentes em paralelo (após T002)
Task: T003 Create Badge.tsx
Task: T004 Create Button.tsx
Task: T005 Create PageHeader.tsx
Task: T006 Create EmptyState.tsx
Task: T007 Create LoadingState.tsx
Task: T008 Create Pagination.tsx
Task: T009 Create FilterBar.tsx
Task: T010 Create Breadcrumbs.tsx

# Phase 4 — Dashboard em paralelo com Sidebar+Topbar
Task: T015 Create Sidebar.tsx
Task: T016 Create Topbar.tsx
Task: T018 Update DashboardPage.tsx   # arquivo independente — não espera T015/T016

# Phase 5 — Duas telas-modelo em paralelo
Task: T020 Restyle CollectionPointsPage.tsx
Task: T021 Restyle CollectionRoutesPage.tsx

# Phase 6 — Auditorias em paralelo
Task: T023 Mobile responsiveness audit
Task: T024 Keyboard accessibility audit
Task: T025 WCAG contrast verification
```

---

## Implementation Strategy

### MVP (User Story 1 apenas — Login com nova identidade)

1. Completar Phase 1 (ADR)
2. Completar Phase 2 (tokens + 8 componentes) — CRÍTICO, não pular
3. Completar Phase 3 (LoginPage reestilizada)
4. **VALIDAR**: `tsc --noEmit` + `vite build` passam, login visualmente diferenciado
5. Demo / aprovação

### Entrega Incremental

1. Phase 1 + Phase 2 → Foundation ready
2. Phase 3 → US1 (Login) → Validar → **Demo MVP**
3. Phase 4 → US2 (Layout + Dashboard) → Validar → Demo
4. Phase 5 → US3+US4 (Pontos de Coleta + Rotas) → Validar → Demo
5. Phase 6 → US5 (Polish responsivo + a11y) → Validar → **Entrega final**

### Retrocompatibilidade Durante a Transição

Durante toda a implementação:
- Classes `brand-*` (verde original) preservadas em `tailwind.config.js` — telas fora do recorte continuam funcionando
- `PaginatedList.tsx` **não alterado** — `Pagination` e `FilterBar` são novos componentes separados
- `map/MapMarker.tsx` e `map/MapView.tsx` **não alterados**
- Telas fora do recorte (`/members`, `/vehicles`, `/buyers`, etc.) **não tocadas**

---

## Notes

- `[P]` = arquivos diferentes, sem dependências incompletas — rodar em paralelo para velocidade
- `[USn]` = rastreabilidade com user stories em spec.md (US1–US5)
- Sem testes automatizados — feature é puramente visual/frontend; backend inalterado; build pass é a validação econômica
- Nenhuma dependência nova instalada — Tailwind CSS 3.4 já cobre todos os requisitos
- Acessibilidade WCAG AA implementada inline nos componentes via Tailwind (sem Radix, HeadlessUI ou axe-core nesta fase)
