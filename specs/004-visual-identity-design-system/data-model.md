# Data Model: Identidade Visual e Design System Base

**Feature**: 004-visual-identity-design-system  
**Date**: 2026-07-01

> Esta feature é puramente frontend. Não há entidades de banco de dados, migrations ou modelos de domínio. O "modelo de dados" aqui descreve as **interfaces TypeScript dos componentes UI** — os contratos de props que cada componente expõe.

---

## Entidades de UI

### 1. Token Visual

Não é um componente — é o arquivo `tailwind.config.js` estendido. Os tokens são classes Tailwind geradas pelo JIT.

**Grupos de tokens**:

| Grupo | Tokens | Usado em |
|-------|--------|----------|
| Cor primária | `petroleo-{50..900}` | botões primários, links ativos, sidebar ativa |
| Cor de acento | `ecocoop-{50..900}` | badges positivos, highlights, hover secundário |
| Cor neutra | `grafite-{50..900}` | textos, fundos de card, bordas |
| Semântico | `green-*`, `amber-*`, `red-*`, `sky-*` | estados de status via Badge |
| Tipografia | `text-{xs,sm,base,lg,xl,2xl}` + `font-{normal,medium,semibold,bold}` | padrão Tailwind, sem extensão |
| Espaçamento | `p-{2,3,4,6}`, `gap-{2,3,4}`, `mb-{4,6}` | padrão Tailwind, sem extensão |
| Borda | `rounded-{lg,xl,full}`, `border-grafite-200` | padrão Tailwind |
| Sombra | `shadow-sm`, `shadow-md` | cards, sidebar, topbar |

---

### 2. Badge

```typescript
type BadgeVariant =
  | 'active'      // Ativo — green
  | 'inactive'    // Inativo — zinc/grafite
  | 'planned'     // Planejada — sky
  | 'in_progress' // Em andamento — amber
  | 'completed'   // Concluída — teal/green
  | 'cancelled'   // Cancelada — red
  | 'pending';    // Pendente — orange

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;   // sobrescreve o label padrão do variant
  size?: 'sm' | 'md';  // default: 'sm'
}
```

**Estado**: Stateless. Apenas presentacional.

**Saída visual**: `<span>` com classes Tailwind de cor de fundo, texto e borda baseadas no `variant`.

---

### 3. Button

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;   // default: 'primary'
  size?: ButtonSize;         // default: 'md'
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}
```

**Estado**: Stateless. `isLoading` mostra spinner inline e desabilita o botão.

**Hierarquia visual**:
- `primary`: `bg-petroleo-600 text-white hover:bg-petroleo-700`
- `secondary`: `border border-petroleo-600 text-petroleo-600 hover:bg-petroleo-50`
- `ghost`: `text-grafite-700 hover:bg-grafite-100`
- `danger`: `bg-red-600 text-white hover:bg-red-700`

---

### 4. PageHeader

```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;  // botões/ações renderizados à direita
}
```

**Estado**: Stateless.

**Layout**: `flex items-start justify-between` com título + subtítulo à esquerda, `actions` à direita. Margin bottom padronizada.

---

### 5. Breadcrumbs

```typescript
interface BreadcrumbItem {
  label: string;
  href?: string;  // se ausente, item é não-clicável (item atual)
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}
```

**Estado**: Stateless. O componente `Topbar` ou cada página pode alimentar os itens.

**Geração automática**: Um hook `useBreadcrumbs()` (interno ao componente ou separado) usa `useLocation()` e um mapa de segmentos para gerar os `BreadcrumbItem[]` automaticamente, com opção de override via props.

```typescript
// Mapa de segmento → label
const SEGMENT_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'collection-points': 'Pontos de Coleta',
  'collection-routes': 'Rotas de Coleta',
  'members': 'Cooperados',
  'material-categories': 'Categorias',
  'material-subcategories': 'Subcategorias',
  'units': 'Unidades',
  'buyers': 'Compradores',
  'vehicles': 'Veículos',
  'epi-types': 'Tipos de EPI',
  'cost-centers': 'Centros de Custo',
  'member-roles': 'Funções',
  'new': 'Novo',
  // IDs dinâmicos: omitidos ou resolvidos via query cache
};
```

---

### 6. EmptyState

```typescript
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;  // botão de ação sugerida
  icon?: React.ReactNode;    // ícone ou ilustração (default: ícone genérico)
}
```

**Estado**: Stateless.

**Layout**: Centralizado vertical e horizontalmente dentro do contêiner pai, com ícone + título + descrição + ação.

---

### 7. LoadingState

```typescript
interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';  // default: 'spinner'
  rows?: number;                      // usado quando variant='skeleton'
  message?: string;                   // acessível para screen readers
}
```

**Estado**: Stateless.

**Spinner**: SVG animado com `animate-spin`, cor `petroleo-600`.

**Skeleton**: Divs com `animate-pulse` emulando linhas de tabela ou cards.

---

### 8. Pagination

```typescript
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;  // exibe "X de Y" (default: true)
}
```

**Estado**: Stateless (controlado pelo pai).

---

### 9. FilterBar (genérico)

```typescript
interface FilterBarProps {
  children: React.ReactNode;  // inputs, selects renderizados como slots
  className?: string;
}
```

**Estado**: Stateless. O `FilterBar` apenas provê o wrapper visual (background, padding, shadow, gap). A lógica de cada filtro fica nos componentes filhos.

---

### 10. Sidebar (layout)

```typescript
interface SidebarProps {
  isOpen: boolean;       // controlado pelo AdminLayout
  onClose: () => void;   // callback para fechar em mobile
}
```

**Estado**: Controlado pelo `AdminLayout` via `useState<boolean>`.

**Active link**: Detectado via `useLocation().pathname` — link cujo `to` faz match com o início do pathname recebe estilo de item ativo (`bg-petroleo-700 text-white`).

**Estrutura interna**:
```
aside
├── header (logo)
├── nav (links)
│   └── NavLink × N
└── footer (versão ou info secundária, opcional)
```

---

### 11. Topbar (layout)

```typescript
interface TopbarProps {
  onMenuClick: () => void;   // abre sidebar em mobile
}
```

**Estado**: Stateless. Lê `user` do `useAuthStore`.

**Conteúdo**:
- Esquerda: botão hamburger (visível apenas em mobile/tablet) + `<Breadcrumbs />`
- Direita: nome/email do usuário + badge de perfil + botão Sair

---

## Transições de Estado

Os componentes de UI são stateless ou controlados pelo pai. Não há máquina de estados complexa. As únicas transições relevantes:

| Componente | Estado | Gatilho |
|-----------|--------|---------|
| Sidebar | closed → open | clique no hamburger (mobile/tablet) |
| Sidebar | open → closed | clique em overlay, link de navegação, ESC |
| Button | normal → loading | `isLoading=true` |
| Button | normal → disabled | `disabled=true` (HTML nativo) |
| LoadingState | visível → oculto | dados carregados (controlado pelo pai) |

---

## Validações

Todos os componentes UI desta feature são **puramente presentacionais**. Não há validações de negócio. As únicas invariantes são:

1. `Badge.variant` deve ser um dos 7 valores definidos (TypeScript enum garante em tempo de compilação).
2. `Pagination.page` deve ser `≥ 1` e `≤ totalPages` (responsabilidade do pai).
3. `BreadcrumbItem.label` não pode ser vazio (validação em runtime opcional via prop default).
