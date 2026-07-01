# Quickstart — Validação do Design System

**Feature**: 004-visual-identity-design-system  
**Date**: 2026-07-01

Este guia descreve como verificar que a implementação está correta. Não inclui código de implementação — apenas os cenários de validação end-to-end.

---

## Pré-requisitos

```bash
# Instalar dependências (se necessário)
npm install

# Subir o backend em modo dev (necessário para login funcionar)
npm run dev --workspace=apps/backend

# Subir o frontend em modo dev
npm run dev --workspace=apps/frontend
# → Acesse http://localhost:5173
```

Credenciais de teste padrão: `admin@ecocoop.local` / `password123` (ou conforme seed do projeto).

---

## SC-001 — Build sem erros

**Contexto**: Nenhuma alteração deve quebrar o build de TypeScript.

```bash
npm run build --workspace=apps/frontend
```

**Esperado**: Saída sem erros. `dist/` gerado. Zero warnings de TypeScript relevantes.

---

## SC-002 — Paleta de tokens aplicada corretamente

**Contexto**: As novas classes Tailwind (`petroleo-*`, `ecocoop-*`, `grafite-*`) devem estar disponíveis.

**Validação**:
1. Abrir qualquer tela-modelo no browser.
2. Inspecionar o elemento do botão primário (ex.: "Nova rota" em Rotas de Coleta).
3. Verificar que a cor de fundo é `petroleo-600` (#1e4a6e ou equivalente) — **não verde** (#22c55e).
4. Inspecionar a sidebar — fundo `grafite-800` ou `petroleo-800` (não branco genérico).
5. Verificar que links ativos na sidebar usam destaque visual diferenciado (`bg-petroleo-700` ou similar).

---

## SC-003 — Tela de Login (tela-modelo 1)

**Contexto**: FR-001, FR-002, FR-015, US1.

**Validação**:
1. Acessar `http://localhost:5173/login` sem estar autenticado.
2. Verificar:
   - Fundo da página: **não** `gray-50` genérico — tom neutro quente ou grafite claro.
   - Card de login centralizado com sombra e bordas.
   - Logo do EcoCoop visível acima do formulário.
   - Subtítulo "Gestão de cooperativas de reciclagem" com tipografia padronizada.
   - Campo de email e senha com `focus:ring-petroleo-500` (anel azul-petróleo, não verde).
   - Botão "Entrar": `petroleo-600` (azul-petróleo).
3. Redimensionar para 375px: formulário utilizável, sem scroll horizontal.
4. Navegar por teclado (Tab): foco visível em todos os campos e botão.
5. Tentar login com credenciais erradas: mensagem de erro exibida no card.
6. Fazer login com sucesso: redirecionamento para dashboard.

---

## SC-004 — Dashboard (tela-modelo 2)

**Contexto**: FR-004, FR-005, US2, US4.

**Validação**:
1. Após login, verificar `http://localhost:5173/dashboard`.
2. Verificar:
   - Sidebar visível à esquerda com logo e links de navegação.
   - Link "Dashboard" destacado como ativo (cor diferenciada).
   - Topbar com breadcrumbs mostrando "Dashboard".
   - Topbar com email do usuário + badge de perfil.
   - Botão "Sair" funcional (redireciona para /login).
   - PageHeader com título "Dashboard".
   - Cards de módulos "Em breve" com visual consistente.
3. Redimensionar para 768px: sidebar colapsa ou muda comportamento.
4. Redimensionar para 375px: hamburger visível na topbar. Clicar abre sidebar como overlay.

---

## SC-005 — Pontos de Coleta (tela-modelo 3)

**Contexto**: FR-003, FR-006, FR-007, FR-008, US3, US4.

**Validação**:
1. Acessar `http://localhost:5173/collection-points`.
2. Verificar breadcrumbs: "Dashboard > Pontos de Coleta" (ou só "Pontos de Coleta" se hierarquia for de 1 nível).
3. Verificar PageHeader com título, subtítulo opcional e botão "Novo ponto" à direita usando `Button variant="primary"`.
4. Verificar FilterBar com input de busca e select de status dentro de container padronizado.
5. Verificar badges de status na tabela:
   - Ponto ativo → `<Badge variant="active">` (verde semântico).
   - Ponto inativo → `<Badge variant="inactive">` (grafite).
   - "Localização pendente" → `<Badge variant="pending">` (laranja).
   - "Geocodificado" → `<Badge variant="completed">` (teal/verde).
6. Buscar por um nome inexistente: `<EmptyState>` exibido com mensagem contextual.
7. Aguardar dados carregando (simular lentidão via DevTools Network): `<LoadingState>` exibido no lugar da tabela.
8. Paginação: visível apenas quando `total > limit`; botões "Anterior"/"Próxima" com estado correto.
9. Redimensionar para 375px: tabela scrollável horizontalmente ou adaptada; sem overflow.

---

## SC-006 — Rotas de Coleta (tela-modelo 4)

**Contexto**: FR-003, FR-006, FR-007, FR-008, US3, US4.

**Validação**:
1. Acessar `http://localhost:5173/collection-routes`.
2. Verificar PageHeader com "Rotas de Coleta" e botão "Nova rota".
3. Verificar badges de status para todos os 4 estados de rota:
   - PLANEJADA → `<Badge variant="planned">` (sky/azul).
   - EM_ANDAMENTO → `<Badge variant="in_progress">` (âmbar).
   - CONCLUIDA → `<Badge variant="completed">` (teal/verde).
   - CANCELADA → `<Badge variant="cancelled">` (vermelho).
4. Aplicar filtro por status "Em andamento": apenas rotas com esse status exibidas.
5. Remover filtro: todas as rotas exibidas novamente.
6. Paginação funcionando corretamente.
7. Clicar em "Ver" em uma rota: navegação para `CollectionRouteDetailPage` funciona (página pode não ter novo design ainda — OK nesta fase).

---

## SC-007 — Regressão Funcional

**Contexto**: FR-014. Nenhuma funcionalidade existente deve quebrar.

**Checklist**:

- [ ] Login funciona normalmente
- [ ] Dashboard carrega dados da cooperativa
- [ ] Pontos de Coleta: CRUD completo (criar, editar, ativar/inativar)
- [ ] Rotas de Coleta: criar, visualizar detalhes, executar rota
- [ ] Mapa de pontos de coleta renderiza em CollectionPointsPage
- [ ] Telas fora do recorte (Members, Vehicles, etc.) ainda funcionam com visual anterior
- [ ] Portal do comprador (`/portal`) funciona normalmente

**Como testar regressão nas telas fora do recorte**:

Acessar qualquer uma das telas abaixo e verificar que carregam sem erro JS no console:
- `/members`
- `/material-categories`
- `/units`
- `/buyers`
- `/vehicles`

---

## SC-008 — Responsividade nos 3 Breakpoints

**Testar cada tela-modelo em**:

| Breakpoint | Largura | Ferramenta |
|-----------|---------|------------|
| Mobile | 375px | DevTools device emulation |
| Tablet | 768px | DevTools device emulation |
| Desktop | 1440px | Janela normal |

**Checklist por breakpoint**:

- [ ] Sem scroll horizontal em nenhum breakpoint
- [ ] Sidebar: expandida em desktop, colapsável em tablet, hamburger em mobile
- [ ] Topbar: elementos principais visíveis em todos os breakpoints
- [ ] Tabelas: scrolláveis horizontalmente em mobile se necessário
- [ ] Botões: clicáveis com touch (mínimo 44×44px)
- [ ] Textos: legíveis sem zoom

---

## SC-009 — Acessibilidade por Teclado

**Em cada tela-modelo**:

1. Recarregar a página.
2. Pressionar Tab repetidamente.
3. Verificar:
   - Foco visível em todos os elementos interativos (inputs, botões, links).
   - Ordem de tabulação é lógica (top-to-bottom, left-to-right).
   - Sidebar fechada em mobile: links da sidebar não recebem foco quando oculta.
   - Sidebar aberta em mobile: foco fica dentro da sidebar (ou pelo menos não "vaza" para o conteúdo sob o overlay).

---

## SC-010 — Contraste WCAG AA

**Verificação manual com DevTools**:

1. Selecionar texto de label em qualquer `<Badge>`.
2. No painel Elements → Computed → Color, verificar ratio de contraste.
3. Verificar ratio ≥ 4.5:1 para texto normal e ≥ 3:1 para texto grande.

**Verificação automática** (opcional):

```bash
# Instalar axe-core CLI globalmente ou usar extensão axe DevTools no Chrome
# Executar audit em cada tela-modelo
```

---

## Validação de Não-Regressão de Backend

```bash
# Rodar suite de testes do backend para garantir que nada foi tocado
npm run test --workspace=apps/backend
```

**Esperado**: Todos os testes passam, mesmos que antes da feature.
