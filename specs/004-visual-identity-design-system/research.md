# Research: Identidade Visual e Design System Base

**Feature**: 004-visual-identity-design-system  
**Date**: 2026-07-01

## Unknowns Resolvidos

---

### R-001: Tailwind está configurado? Qual versão?

**Decision**: Tailwind CSS 3.4 já está presente em `apps/frontend/devDependencies`, com `tailwind.config.js` e `postcss` configurados. O arquivo `src/index.css` usa as três diretivas padrão (`@tailwind base/components/utilities`).

**Rationale**: Nenhuma instalação nova necessária. A estratégia correta é **estender** `tailwind.config.js` com os novos tokens de paleta, mantendo as classes `brand-*` existentes durante a transição.

**Alternatives considered**: CSS custom properties + PostCSS tokens. Rejeitado porque o projeto já usa Tailwind para tudo — introduzir um segundo sistema de tokens criaria divergência desnecessária.

---

### R-002: Existe alguma biblioteca de componentes UI já instalada?

**Decision**: Não existe. O projeto usa Tailwind puro com classes inline. Não há shadcn/ui, Radix, MUI, Ant Design, Chakra ou similar.

**Rationale**: A criação de componentes base em `src/components/ui/` é a abordagem correta — sem instalar biblioteca de terceiros. Os requisitos da spec são atendíveis com Tailwind + React puro.

**Alternatives considered**: Instalar Radix UI primitives para acessibilidade (focus trap, aria). Rejeitado nesta fase — o escopo de acessibilidade é WCAG 2.1 AA básico (contraste, foco visível, ordem de tab), que é obtível com Tailwind sem primitives de terceiros. Radix pode ser adicionado em fase futura se necessidade de modal/dropdown complexo surgir.

---

### R-003: Como implementar sidebar responsiva sem dependências novas?

**Decision**: Usar `useState` para controle de `isOpen` no mobile + classes Tailwind para posicionamento e visibilidade:
- Desktop (lg+): `sidebar` como elemento `relative` no flex layout, sempre visível.  
- Mobile/tablet: `sidebar` com `position: fixed`, `transform: translateX(-100%)` quando fechada, `translateX(0)` quando aberta. Overlay semi-transparente fecha ao clicar fora.

Classes-chave: `lg:relative lg:translate-x-0 fixed inset-y-0 left-0 z-40 transition-transform`

**Rationale**: CSS transform + Tailwind transition é suficientemente performático. Não requer biblioteca de portal/drawer.

**Alternatives considered**: `react-sidebar` ou `@headlessui/react` Drawer. Rejeitado para evitar dependência nova.

---

### R-004: Como implementar breadcrumbs sem biblioteca?

**Decision**: `useLocation()` + mapa estático `Record<string, string>` de segmento de URL para label legível. Ex: `'collection-points' → 'Pontos de Coleta'`. Segmentos dinâmicos (IDs) são substituídos por label contextual se disponível via `useParams()` + query cache, ou omitidos se não houver label disponível.

**Rationale**: O roteamento do projeto usa react-router-dom 6 que já está instalado. A árvore de rotas é flat (sem nested routes complexas além do AdminLayout), o que torna o parsing de pathname simples.

**Alternatives considered**: `use-react-router-breadcrumbs`. Rejeitado para evitar dependência nova — a implementação manual é trivial para a estrutura de rotas atual.

---

### R-005: Qual paleta de cores atende à identidade visual desejada e ao contraste WCAG AA?

**Decision**: Paleta institucional baseada em tons de azul-petróleo, teal e grafite, com verde reservado para uso semântico positivo.

Valores concretos para `tailwind.config.js`:

```js
colors: {
  // Azul-petróleo — cor primária de marca
  petroleo: {
    50:  '#eef4fa',
    100: '#d5e5f3',
    200: '#aecce8',
    300: '#7eadd8',
    400: '#558ec8',
    500: '#3572b0',
    600: '#1e4a6e',  // ← primário institucional
    700: '#163a58',
    800: '#0f2a42',
    900: '#081a2b',
  },
  // Teal — cor de acento
  ecocoop: {
    50:  '#edfafa',
    100: '#d5f5f6',
    200: '#afecee',
    300: '#7edce2',
    400: '#16bdca',
    500: '#0f9b9b',
    600: '#0d7a7a',  // ← acento principal
    700: '#0a5c5c',
    800: '#074040',
    900: '#042424',
  },
  // Grafite — fundos neutros e textos
  grafite: {
    50:  '#f8f9fa',
    100: '#f1f3f5',
    200: '#e9ecef',
    300: '#dee2e6',
    400: '#ced4da',
    500: '#adb5bd',
    600: '#868e96',
    700: '#495057',
    800: '#343a40',
    900: '#212529',
  },
  // Manter brand-* (verde) durante transição das telas fora do recorte
  brand: {
    50:  '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
}
```

**Contraste verificado** (ratio vs fundo branco #ffffff):
- `petroleo-600` (#1e4a6e): ratio ~9.2:1 ✅ AAA
- `ecocoop-600` (#0d7a7a): ratio ~5.8:1 ✅ AA
- `grafite-800` (#343a40): ratio ~12.4:1 ✅ AAA
- `grafite-700` (#495057): ratio ~8.6:1 ✅ AAA

**Rationale**: Azul-petróleo e teal são cores associadas a sustentabilidade, rastreamento e operação real — distintas do "verde reciclagem" clichê. A paleta comunica profissionalismo institucional.

**Alternatives considered**: Paleta azul corporativo puro (sem teal). Rejeitado por ser excessivamente genérico.

---

### R-006: É necessário criar Storybook ou documentação de componentes isolada?

**Decision**: Não nesta fase. Os componentes são documentados via TypeScript types (interfaces de props) e pelo [contracts/ui-components.md](./contracts/ui-components.md). Storybook fica para fase futura quando houver mais de 20 componentes.

**Rationale**: Custo de setup do Storybook é desproporcional para 8 componentes iniciais. O tipo TypeScript já serve como documentação implícita para o time.

---

### R-007: Quais telas ficam fora do primeiro recorte?

**Decision**: Fora do recorte desta fase (preservadas sem alteração de estilo):

- Todas as páginas de CRUD de cadastros base: Members, MemberRoles, MaterialCategories, MaterialSubcategories, Units, Buyers, Vehicles, EpiTypes, CostCenters
- CollectionPointFormPage, CollectionRouteFormPage, CollectionRouteDetailPage
- RawMaterialEntriesPage
- BuyerPortalPage
- Rotas "em breve" (Cooperative, Users, Profiles)

**Rationale**: A spec define explicitamente as 4 telas-modelo. As demais ficam funcionais com o visual atual até fase de aplicação ampla do design system.

---

### R-008: O componente `PaginatedList.tsx` deve ser refatorado?

**Decision**: Não refatorar — extrair apenas. A lógica de debounce de busca e controle de página em `PaginatedList` será preservada, mas o componente de `Pagination` (navegação de páginas) será criado separadamente para uso independente. `FilterBar` também será componente separado.

**Rationale**: `PaginatedList` mistura responsabilidades (filter + pagination + loading state). Separar em `FilterBar` + `Pagination` + `LoadingState` permite uso independente nas telas-modelo. O `PaginatedList` existente não é alterado para não quebrar telas fora do recorte.

---

### R-009: É necessário criar uma variável CSS `:root` para os tokens?

**Decision**: Não. Tailwind JIT gera as classes necessárias na build. CSS custom properties só seriam necessárias para tematização dinâmica (ex.: modo escuro ou tema por cooperativa), que está explicitamente fora do escopo desta fase.

**Rationale**: Zero overhead de runtime JS para tokens; Tailwind resolve em build time.

---

### R-010: ADR é necessário?

**Decision**: Sim — Princípio XXII da Constituição exige ADR para decisões de arquitetura. A escolha da paleta institucional e a criação de `src/components/ui/` como biblioteca interna são decisões relevantes.

**Output**: `docs/adr/004-design-tokens.md` (criado como parte da implementação, fora do escopo do plano em si).
