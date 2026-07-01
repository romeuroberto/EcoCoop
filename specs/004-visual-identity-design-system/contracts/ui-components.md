# Contratos de Componentes UI — Design System Base

**Feature**: 004-visual-identity-design-system  
**Date**: 2026-07-01

> Estes contratos definem a API pública de cada componente da biblioteca `src/components/ui/`. São as interfaces que as páginas do sistema consomem. Alterações nos contratos devem ser refletidas em todos os usos.

---

## Convenções

- Todos os componentes exportam um tipo nomeado e um componente nomeado (não `default`).
- Props que estendem elementos HTML nativos usam `React.*HTMLAttributes<HTMLElement>` e passam `...rest` para o elemento raiz.
- Classes adicionais são aceitas via `className?: string` e mescladas com `clsx` ou template literal.
- Nenhum componente usa estado interno global (zustand, context) — apenas props e estado local quando necessário.

---

## Badge

**Arquivo**: `src/components/ui/Badge.tsx`

### Props

```typescript
export type BadgeVariant =
  | 'active'
  | 'inactive'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'pending';

export interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}
```

### Contrato visual

| variant | label padrão | bg | text | border |
|---------|-------------|-----|------|--------|
| `active` | Ativo | green-50 | green-700 | green-200 |
| `inactive` | Inativo | grafite-100 | grafite-600 | grafite-200 |
| `planned` | Planejada | sky-50 | sky-700 | sky-200 |
| `in_progress` | Em andamento | amber-50 | amber-700 | amber-200 |
| `completed` | Concluída | ecocoop-50 | ecocoop-700 | ecocoop-200 |
| `cancelled` | Cancelada | red-50 | red-700 | red-200 |
| `pending` | Pendente | orange-50 | orange-700 | orange-200 |

### Uso

```tsx
<Badge variant="in_progress" />
<Badge variant="completed" label="Finalizada" />
<Badge variant="active" size="md" />
```

### Acessibilidade

- Elemento: `<span role="status" aria-label={label}>` para screen readers.

---

## Button

**Arquivo**: `src/components/ui/Button.tsx`

### Props

```typescript
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;   // default: 'primary'
  size?: ButtonSize;         // default: 'md'
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}
```

### Contrato visual

| variant | bg | text | border | hover |
|---------|-----|------|--------|-------|
| `primary` | petroleo-600 | white | — | petroleo-700 |
| `secondary` | white | petroleo-600 | petroleo-300 | petroleo-50 |
| `ghost` | transparent | grafite-700 | — | grafite-100 |
| `danger` | red-600 | white | — | red-700 |

| size | padding | text-size |
|------|---------|-----------|
| `sm` | px-3 py-1.5 | text-xs |
| `md` | px-4 py-2 | text-sm |
| `lg` | px-5 py-2.5 | text-base |

### Uso

```tsx
<Button onClick={handleNew}>Nova rota</Button>
<Button variant="secondary" onClick={handleCancel}>Cancelar</Button>
<Button variant="danger" isLoading={isDeleting}>Excluir</Button>
<Button variant="ghost" leftIcon={<FilterIcon />}>Filtros</Button>
```

### Acessibilidade

- Quando `isLoading=true`: `aria-busy="true"` + `aria-disabled="true"` + spinner SVG com `aria-hidden="true"`.
- Focus ring: `focus-visible:ring-2 focus-visible:ring-petroleo-500 focus-visible:ring-offset-2`.

---

## PageHeader

**Arquivo**: `src/components/ui/PageHeader.tsx`

### Props

```typescript
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}
```

### Contrato visual

```
┌─────────────────────────────────────────────────────┐
│ title (text-2xl font-bold text-grafite-900)         │
│ subtitle (text-sm text-grafite-500)      [actions]  │
└─────────────────────────────────────────────────────┘
```

Layout: `flex items-start justify-between mb-6`

### Uso

```tsx
<PageHeader
  title="Pontos de Coleta"
  subtitle="Gerencie os pontos de coleta da cooperativa"
  actions={<Button onClick={() => navigate('/collection-points/new')}>Novo ponto</Button>}
/>
```

---

## Breadcrumbs

**Arquivo**: `src/components/ui/Breadcrumbs.tsx`

### Props

```typescript
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];   // se omitido, usa geração automática via useLocation
  className?: string;
}
```

### Contrato visual

```
Home > Rotas de Coleta > Nova Rota
```

- Separador: `/` (caractere, não ícone SVG)
- Item atual (último): `text-grafite-900 font-medium`, não é link
- Itens anteriores: `text-petroleo-600 hover:underline`, são links via `<Link>`

### Uso

```tsx
// Geração automática (padrão)
<Breadcrumbs />

// Manual (para labels dinâmicos)
<Breadcrumbs items={[
  { label: 'Rotas de Coleta', href: '/collection-routes' },
  { label: route.name },
]} />
```

### Acessibilidade

- Wrapper: `<nav aria-label="Breadcrumb">` + `<ol>` com itens `<li>`.
- Item atual: `aria-current="page"`.

---

## EmptyState

**Arquivo**: `src/components/ui/EmptyState.tsx`

### Props

```typescript
export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}
```

### Contrato visual

```
         [icon — 48px, grafite-300]
     Nenhum resultado encontrado
  Tente ajustar os filtros ou criar um
         novo item.
         [Novo item]
```

Layout: `flex flex-col items-center justify-center py-12 text-center gap-3`

### Uso

```tsx
// Estado vazio sem filtros
<EmptyState
  title="Nenhum ponto de coleta"
  description="Cadastre o primeiro ponto de coleta para começar."
  action={<Button onClick={() => navigate('/collection-points/new')}>Novo ponto</Button>}
/>

// Estado vazio com filtros ativos
<EmptyState
  title="Nenhum resultado"
  description="Nenhum item corresponde aos filtros aplicados."
/>
```

---

## LoadingState

**Arquivo**: `src/components/ui/LoadingState.tsx`

### Props

```typescript
export interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';   // default: 'spinner'
  rows?: number;                       // default: 5 (para variant='skeleton')
  message?: string;                    // default: 'Carregando...' (acessível)
  className?: string;
}
```

### Contrato visual — spinner

```
   ⟳  Carregando...
```

Centro do contêiner pai. Spinner SVG `w-8 h-8 animate-spin text-petroleo-600`.

### Contrato visual — skeleton

Linhas de altura `h-4` com `bg-grafite-200 animate-pulse rounded` em larguras variadas simulando conteúdo de tabela.

### Uso

```tsx
{isLoading ? (
  <LoadingState />
) : data.length === 0 ? (
  <EmptyState title="Sem rotas" />
) : (
  <Table ... />
)}

// Skeleton para tabelas
<LoadingState variant="skeleton" rows={10} />
```

### Acessibilidade

- `role="status"` + `aria-label={message}` no wrapper.

---

## Pagination

**Arquivo**: `src/components/ui/Pagination.tsx`

### Props

```typescript
export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;   // default: true — exibe "Página X de Y"
  className?: string;
}
```

### Contrato visual

```
[← Anterior]   Página 2 de 7   [Próxima →]
```

Layout: `flex items-center justify-center gap-2 mt-4`

Botões desabilitados quando no limite (`disabled:opacity-40 disabled:cursor-not-allowed`).

### Uso

```tsx
{totalPages > 1 && (
  <Pagination
    page={page}
    totalPages={totalPages}
    onPageChange={setPage}
  />
)}
```

---

## FilterBar

**Arquivo**: `src/components/ui/FilterBar.tsx`

### Props

```typescript
export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}
```

### Contrato visual

```
┌─────────────────────────────────────────┐
│ bg-white rounded-xl shadow-sm p-4       │
│ flex flex-wrap items-center gap-3       │
│  [children: inputs, selects, badges]    │
└─────────────────────────────────────────┘
```

### Uso

```tsx
<FilterBar>
  <input
    className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
    placeholder="Buscar por nome..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
  <select
    className="border rounded-lg px-3 py-2 text-sm"
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
  >
    <option value="all">Todos os status</option>
    ...
  </select>
</FilterBar>
```

---

## Sidebar (layout)

**Arquivo**: `src/layouts/Sidebar.tsx`

### Props

```typescript
export interface NavLink {
  to: string;
  label: string;
  module: string;
  icon?: React.ReactNode;  // opcional, para fase futura
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: NavLink[];
  hasAccess: (module: string) => boolean;
}
```

### Contrato visual

```
┌──────────────────┐
│ [logo EcoCoop]   │
├──────────────────┤
│ Dashboard        │  ← link ativo: bg-petroleo-700 text-white rounded-lg
│ Cooperados       │  ← link inativo: text-grafite-700 hover:bg-petroleo-50
│ Pontos de Coleta │
│ Rotas de Coleta  │
│ ...              │
└──────────────────┘
```

Largura: `w-64` fixo no desktop.

Responsividade:
- `lg:relative lg:flex lg:translate-x-0`
- `fixed inset-y-0 left-0 z-40 w-64` em mobile/tablet
- `transform transition-transform duration-300 ease-in-out`
- `-translate-x-full` quando `isOpen=false` em mobile

Overlay: `<div class="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose}>` visível quando `isOpen=true`.

---

## Topbar (layout)

**Arquivo**: `src/layouts/Topbar.tsx`

### Props

```typescript
export interface TopbarProps {
  onMenuClick: () => void;
}
```

### Contrato visual

```
┌──────────────────────────────────────────────────────────────────┐
│ [☰ menu]  Dashboard > Rotas de Coleta    email — PERFIL  [Sair] │
└──────────────────────────────────────────────────────────────────┘
```

- Botão hamburger (`☰`): visível apenas em `< lg` via `lg:hidden`
- Breadcrumbs: `<Breadcrumbs />` automático
- Usuário: `user.email` + `<Badge>` com `user.profileType`
- Botão Sair: `<Button variant="ghost">` pequeno

---

## Convenções de Migração

Para as telas-modelo, as classes inline existentes são substituídas pelos componentes acima:

| Padrão existente | Substituto |
|------------------|-----------|
| `<h1 className="text-2xl font-bold text-gray-800">` | `<PageHeader title="..." />` |
| `<div className="flex items-center justify-between mb-6">` + `<h1>` + `<button>` | `<PageHeader title="..." actions={<Button>}>` |
| `bg-green-100 text-green-700` / `bg-gray-100 text-gray-500` | `<Badge variant="active|inactive">` |
| `<div className="p-8 text-center text-gray-400 text-sm">Nenhuma rota...</div>` | `<EmptyState title="..." />` |
| `<div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>` | `<LoadingState />` |
| Paginação inline (Anterior/Próxima) | `<Pagination page={...} totalPages={...} onPageChange={...} />` |
| Container de filtros com `bg-white rounded-xl shadow-sm p-4` | `<FilterBar>` |
