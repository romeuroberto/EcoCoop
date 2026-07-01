# Implementation Plan: Identidade Visual e Design System Base

**Branch**: `004-visual-identity-design-system` | **Date**: 2026-07-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-visual-identity-design-system/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command.

## Summary

Evoluir a interface existente do EcoCoop de um admin template genérico para um produto visual dedicado à operação de cooperativas de reciclagem. A abordagem é **incrementar sobre Tailwind CSS 3.4 já presente**, criar uma biblioteca de componentes reutilizáveis (`src/components/ui/`) e aplicar o novo design nas 4 telas-modelo (Login, Dashboard, Pontos de Coleta, Rotas de Coleta), incluindo o redesenho do Dashboard de módulos como refinamento visual/navegação. O Dashboard deve liberar visualmente apenas módulos já implementados e manter módulos futuros como "Em breve", sem tocar em backend, schema, permissões ou regras de negócio.

## Technical Context

**Language/Version**: TypeScript 5.1 / React 18.2

**Primary Dependencies**: React 18 + Vite 5 + Tailwind CSS 3.4 + react-router-dom 6 + @tanstack/react-query 5 + zustand 4

**Storage**: N/A (feature é puramente frontend; nenhum dado novo persistido)

**Testing**: Build pass (`npm run build` no workspace `@ecocoop/frontend`); validação visual manual nas 4 telas-modelo nos 3 breakpoints definidos

**Target Platform**: Browser — desktop (≥1280px), tablet (768–1279px), mobile (<768px)

**Project Type**: Web application — frontend only

**Performance Goals**: Build sem erros; First Contentful Paint não deve regredir em relação ao estado atual

**Constraints**:
- Nenhuma dependência nova salvo justificativa (Tailwind já cobre tudo necessário)
- Nenhuma alteração em `apps/backend/`, schema Prisma, migrations, seeds, permissões ou contratos REST
- Compatibilidade retroativa com telas fora do primeiro recorte — classes Tailwind existentes devem continuar funcionando durante a transição

**Scale/Scope**: 4 telas-modelo na fase 1; Dashboard com cards de módulos agrupados por áreas operacionais; ~15 telas existentes preservadas sem quebra; ~8 componentes base criados

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Justificativa |
|-----------|--------|---------------|
| I. Spec-Driven | ✅ PASS | Spec aprovada existe em `specs/004-visual-identity-design-system/spec.md` |
| II. Fluxo Operacional | ✅ N/A | Feature é UI pura; nenhum modelo de domínio alterado |
| III. Rastreabilidade/Auditoria | ✅ N/A | Nenhum evento de negócio criado ou alterado |
| IV. Imutabilidade do Estoque | ✅ N/A | Nenhum dado de estoque tocado |
| V. Separação de Estados de Material | ✅ N/A | Estados de material não alterados |
| VI. Financeiro Auditável | ✅ N/A | Sem módulo financeiro nesta feature |
| VII. Rateio Transparente | ✅ N/A | Sem rateio nesta feature |
| VIII. Instância Dedicada | ✅ N/A | Arquitetura de deploy não alterada |
| IX. Portal do Comprador | ✅ N/A | Portal fora do escopo das telas-modelo |
| X. Login Individual | ✅ N/A | Auth intacta; só a UI de login é restyled |
| XI. Permissões no Backend | ✅ PASS | Backend completamente inalterado; nenhuma lógica de permissão tocada |
| XII–XIX. Funcionalidades Operacionais | ✅ N/A | Nenhuma funcionalidade operacional nova ou alterada |
| XX. Interface Simples e Responsiva | ✅ DRIVE | Esta feature é a implementação direta deste princípio |
| XXI. Stack Tecnológica | ✅ PASS | React + TypeScript + Vite + Tailwind — stack definida, sem adições |
| XXII. ADR | ⚠️ REQUIRED | Decisão de paleta institucional deve ser registrada em `docs/adr/004-design-tokens.md` |
| XXIII. Testes em Áreas Críticas | ✅ N/A | Feature não toca auth, permissões, estoque, financeiro ou rateio |
| XXIV. Consistência e Segurança | ✅ PASS | Frontend-only; nenhuma entrada não-sanitizada introduzida |

**Violação**: Nenhuma. ADR obrigatório (XXII) é gerado como parte do plano.

## Project Structure

### Documentation (this feature)

```text
specs/004-visual-identity-design-system/
├── plan.md              ← este arquivo
├── research.md          ← Phase 0 (gerado)
├── data-model.md        ← Phase 1 (gerado)
├── quickstart.md        ← Phase 1 (gerado)
├── contracts/
│   └── ui-components.md ← Phase 1 (gerado)
└── tasks.md             ← Phase 2 (/speckit-tasks — não gerado aqui)
```

### Source Code (repository root)

```text
apps/frontend/
├── tailwind.config.js                      # ALTERAR — nova paleta de tokens
├── src/
│   ├── index.css                           # ALTERAR — custom properties CSS se necessário
│   ├── layouts/
│   │   ├── AdminLayout.tsx                 # ALTERAR — integrar Sidebar + Topbar novos
│   │   ├── Sidebar.tsx                     # CRIAR — sidebar responsiva com active state
│   │   └── Topbar.tsx                      # CRIAR — topbar com usuário + breadcrumb context
│   ├── components/
│   │   ├── ui/                             # CRIAR — biblioteca de componentes base
│   │   │   ├── Badge.tsx                   # status badges semânticos
│   │   │   ├── Button.tsx                  # hierarquia primário/secundário/terciário
│   │   │   ├── PageHeader.tsx              # título + subtítulo + área de ações
│   │   │   ├── Breadcrumbs.tsx             # breadcrumbs via react-router useLocation
│   │   │   ├── EmptyState.tsx              # estado vazio padronizado
│   │   │   ├── LoadingState.tsx            # skeleton/spinner padronizado
│   │   │   ├── Pagination.tsx              # paginação standalone (refatorar PaginatedList)
│   │   │   └── FilterBar.tsx              # barra de filtros genérica
│   │   └── map/                            # PRESERVAR — sem alterações
│   │       ├── MapMarker.tsx
│   │       └── MapView.tsx
│   └── pages/
│       ├── auth/
│       │   └── LoginPage.tsx               # ALTERAR — tela-modelo 1
│       ├── dashboard/
│       │   └── DashboardPage.tsx           # ALTERAR — tela-modelo 2; cards de módulos por área operacional
│       ├── collection-points/
│       │   └── CollectionPointsPage.tsx    # ALTERAR — tela-modelo 3
│       └── collection-routes/
│           └── CollectionRoutesPage.tsx    # ALTERAR — tela-modelo 4
│           [demais telas — SEM ALTERAÇÃO nesta fase]

docs/
└── adr/
    └── 004-design-tokens.md                # CRIAR — ADR paleta institucional (req. Princípio XXII)
```

**Structure Decision**: Monorepo Turborepo com workspaces `apps/*` e `packages/*`. Esta feature altera apenas `apps/frontend/`. Nenhum pacote compartilhado (`packages/`) é criado — os componentes UI são locais ao frontend nesta fase.

## Design Decisions

### 1. Nova Paleta Institucional

Substituir o verde genérico atual (`brand-500: #22c55e`) por paleta autoral:

| Token | Hex | Uso |
|-------|-----|-----|
| `brand-grafite-*` | zinc/slate scale | texto principal, sidebar BG, fundos neutros |
| `brand-petroleo-*` | #1e4a6e family | cor primária de interação, links ativos, botão primário |
| `brand-teal-*` | #0f7b76 family | cor de acento, highlights, hover states |
| `brand-warm-*` | warm neutral scale | fundos de cards, áreas de conteúdo |
| `semantic-success` | green-600 | único uso de verde — estado "positivo" |
| `semantic-warning` | amber-600 | estado "atenção" |
| `semantic-danger` | red-600 | estado "erro/cancelado" |
| `semantic-info` | sky-600 | estado "em andamento/informação" |
| `semantic-neutral` | zinc-500 | estado "inativo/pendente" |

Estratégia de migração: manter `brand-500/600/700` (verde atual) até as telas-modelo serem migradas; as demais telas usam verde durante a transição sem quebrar.

### 2. Tokens de Tipografia e Espaçamento

Definidos via `tailwind.config.js` `theme.extend` — sem criar CSS custom properties separadas, para aproveitar o sistema de purge/JIT do Tailwind.

### 3. Responsividade da Sidebar

| Breakpoint | Comportamento |
|-----------|---------------|
| `≥1280px` (desktop) | Sidebar expandida fixa (w-64), sempre visível |
| `768–1279px` (tablet) | Sidebar colapsável (ícones apenas ou overlay), toggle via botão |
| `<768px` (mobile) | Sidebar oculta, menu hamburger na topbar, overlay ao abrir |

Implementado com `useState` para controle de estado aberto/fechado e classes Tailwind (`translate-x-0 / -translate-x-full`, `lg:relative lg:translate-x-0`). Sem library externa.

### 4. Breadcrumbs

Implementado via `useLocation()` do react-router-dom + mapa estático de segmento → label. Sem biblioteca externa. Exibido na `Topbar` acima do conteúdo ou no topo do `<main>`.

### 5. Badges de Status

Componente `Badge` com prop `variant` cobrindo os 7 estados obrigatórios:

| Variant | Label | Cor semântica |
|---------|-------|---------------|
| `active` | Ativo | green |
| `inactive` | Inativo | zinc |
| `planned` | Planejada | sky |
| `in_progress` | Em andamento | amber |
| `completed` | Concluída | teal/green |
| `cancelled` | Cancelada | red |
| `pending` | Pendente | amber/orange |

As pages existentes que usam `STATUS_COLORS` inline (ex.: `CollectionRoutesPage`) migrarão para `<Badge>` na aplicação às telas-modelo.

### 6. Componentes Não Criados Nesta Fase

- DataTable genérica com coluna configurável — as tabelas das 4 telas-modelo serão estilizadas diretamente; abstração genérica fica para fases posteriores
- Modal/Dialog
- Form inputs padronizados (fora do escopo)
- Toasts/notificações

### 7. Dashboard de Módulos

O Dashboard será redesenhado como uma navegação operacional agrupada por áreas, sem criar funcionalidades novas de domínio. Cards ativos devem apontar exclusivamente para rotas já existentes no frontend; cards futuros permanecem visualmente bloqueados com badge "Em breve" e sem ação principal ativa.

| Área | Cards ativos permitidos | Rotas existentes |
|------|--------------------------|------------------|
| Cadastros | Cooperados, Funções, Categorias, Subcategorias, Unidades, Compradores, Veículos, Tipos de EPI, Centros de Custo | `/members`, `/member-roles`, `/material-categories`, `/material-subcategories`, `/units`, `/buyers`, `/vehicles`, `/epi-types`, `/cost-centers` |
| Coleta | Pontos de Coleta, Rotas de Coleta, Execução de Rotas | `/collection-points`, `/collection-routes`, `/collection-routes` ou detalhe existente `/collection-routes/:id` quando acessado a partir de uma rota real |
| Material Bruto / Estoque Bruto | Entrada de Material Bruto, Saldo Bruto | Entrada via rota existente `/collection-routes/:id/material-entries`; Saldo via `/raw-material-balance` |

Cards futuros obrigatórios: Triagem, Estoque pronto, Rejeito, Vendas operacionais, Financeiro, Rateio e Relatórios avançados. Esses cards não podem ter navegação ativa enquanto não houver implementação real e rota correspondente.

## Complexity Tracking

Nenhuma violação de Constituição detectada. Esta seção não é aplicável.

---

## Phase 0: Research

Ver [research.md](./research.md)

## Phase 1: Design

Ver [data-model.md](./data-model.md), [contracts/ui-components.md](./contracts/ui-components.md), [quickstart.md](./quickstart.md)
