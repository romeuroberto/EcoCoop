# Specification Analysis Report — Fase 4: Identidade Visual e Design System Base

**Feature**: `004-visual-identity-design-system`
**Analisado em**: 2026-07-01
**Artefatos analisados**: constitution.md · spec.md · plan.md · tasks.md · código frontend atual
**Foco**: Fase 4 apenas — tokens visuais, componentes base, layout global, sidebar, topbar, breadcrumbs, dashboard, cards, PageHeader, StatusBadge, DataTable, EmptyState, LoadingState, responsividade, acessibilidade, telas-modelo

---

## Resumo Executivo

Os três artefatos (spec.md, plan.md, tasks.md) estão **substantialmente alinhados** entre si e com a Constituição. Não há violações constitucionais, não há alteração de backend/schema/permissões, e o ciclo de validação econômica está corretamente especificado. As ressalvas identificadas são de **severidade MÉDIA** e **podem ser resolvidas durante a implementação**, sem necessidade de revisão estrutural dos artefatos.

---

## Findings

| ID | Categoria | Severidade | Localização | Resumo | Recomendação |
|----|-----------|------------|-------------|--------|--------------|
| I1 | Inconsistência | MEDIUM | spec.md Key Entities vs plan.md §6 vs tasks.md | `DataTable` é listado como Key Entity em spec.md mas o plan.md **explicitamente a adia**: "abstração genérica fica para fases posteriores". Nenhuma task cria DataTable. FR-006 é atendido via estilização direta em T020/T021. | Adicionar nota em spec.md Assumptions que DataTable como componente genérico está adiado. Sem bloqueio de implementação. |
| I2 | Inconsistência | MEDIUM | tasks.md T018 · plan.md §7 Coleta | "Entrada de Material Bruto" como card ativo aponta para `/collection-routes` com "helper text". A rota real é `/collection-routes/:id/material-entries` (parâmetrica). T018 não especifica o texto exato do helper nem como o usuário descobre que precisa acessar a rota e depois o detalhe. | Definir explicitamente no helper text da card: ex. "Selecione uma rota para registrar entradas". O card pode ser rotulado "via Execução de Rota" abaixo do título. Risco baixo se o implementador deixar isso claro. |
| I3 | Inconsistência | LOW | tasks.md T018 · plan.md §7 Coleta | "Execução de Rotas" e "Rotas de Coleta" apontam para a mesma rota `/collection-routes`. Dois cards no Dashboard navegam ao mesmo destino. A diferença semântica entre listagem e execução fica perdida. | Mesclar "Execução de Rotas" com "Rotas de Coleta" em um único card intitulado "Rotas de Coleta" com subtítulo "Planear e executar" — ou manter separados com tooltip explicativo. Decisão de implementador; não bloqueia. |
| A1 | Ambiguidade | MEDIUM | tasks.md T010 (Breadcrumbs) · T017 (AdminLayout) | `SEGMENT_LABELS` em T010 cobre apenas 9 segmentos: `dashboard, collection-points, collection-routes, members, material-categories, units, buyers, vehicles, new`. Como o Topbar (com Breadcrumbs) é integrado ao `AdminLayout` em T017, ele aparece em **todas** as rotas autenticadas — não apenas nas 4 telas-modelo. Segmentos ausentes: `material-subcategories, member-roles, epi-types, cost-centers, raw-material-balance, cooperative, users, profiles`. Segmentos UUID (`:id`) aparecerão literalmente. | Expandir `SEGMENT_LABELS` para cobrir todos os segmentos presentes no router — ou adicionar fallback que humanize segmentos desconhecidos (ex.: substituir hifens por espaços + capitalizar). Sem isso, rotas como `/material-subcategories` mostram breadcrumb cru. |
| A2 | Ambiguidade | LOW | spec.md Key Entities vs plan.md §3 vs T004 | `Button.tsx` é criado em T004 e referenciado em T005 (PageHeader.actions), T013 (login submit), T020/T021 (ações de página), mas **não consta nos Key Entities** de spec.md. Spec lista: Badge, PageHeader, DataTable, EmptyState, LoadingState, Sidebar, Topbar, Breadcrumb. | Acrescentar `Button` aos Key Entities de spec.md. Sem impacto na implementação — o plan.md está correto. |
| C1 | Cobertura | LOW | tasks.md T001 · código atual | `docs/adr/` **não existe** no repositório. T001 cria `docs/adr/004-design-tokens.md` mas o diretório não existe. Task precisará fazer `mkdir -p docs/adr/` antes de criar o arquivo. | Acrescentar no T001: "Create directory docs/adr/ if absent". Sem impacto funcional — apenas operacional. |
| C2 | Cobertura | LOW | spec.md FR-006 vs plan.md §6 | FR-006 especifica "coluna de ações" nas tabelas. T020 (`CollectionPointsPage`) preserva a coluna de toggle/ação; T021 (`CollectionRoutesPage`) preserva o link "Ver". O requisito é atendido mas não há garantia explícita no task de que a coluna não será suprimida durante o restyle. | Verificação in-code ao implementar: confirmar que T020 e T021 mantêm a coluna de ações (toggle, "Ver") sem remover funcionalidade. |

---

## Análise das Perguntas Específicas

### 1. Alinhamento spec.md ↔ plan.md ↔ tasks.md

**Status: ✅ ALINHADO** (com ressalva I1 sobre DataTable)

Todos os 17 FRs e 8 SCs são cobertos por pelo menos uma task:

| Requirement | Tasks | Status |
|-------------|-------|--------|
| FR-001 (paleta cores) | T002 | ✅ |
| FR-002 (tokens visuais) | T002 + T003–T010 | ✅ |
| FR-003 (badge 7 estados) | T003 | ✅ |
| FR-004 (breadcrumbs) | T010 | ✅ |
| FR-005 (PageHeader) | T005 | ✅ |
| FR-006 (tabelas padronizadas) | T020, T021 (direto, sem DataTable genérica) | ⚠️ parcial |
| FR-007 (EmptyState) | T006 | ✅ |
| FR-008 (LoadingState) | T007 | ✅ |
| FR-009 (Sidebar responsiva) | T015 | ✅ |
| FR-010 (4 telas-modelo) | T013, T018, T020, T021 | ✅ |
| FR-011 (foco visível a11y) | T024 | ✅ |
| FR-012 (contraste WCAG AA) | T025 | ✅ |
| FR-013 (responsividade 3 breakpoints) | T023 | ✅ |
| FR-014 (não quebrar funcionalidade) | T026 | ✅ |
| FR-015 (build sem erros) | T012, T014, T019, T022, T027 | ✅ |
| FR-016 (cards agrupados por área) | T018 | ✅ |
| FR-017 (sem alteração de backend) | Constraint no header de tasks.md + T018 | ✅ |
| SC-001 (percepção de produto) | T013 (subjetivo — sem buildable task obrigatória) | ⚪ pós-lançamento |
| SC-002 (leitura de status <3s) | T020, T021 via Badge | ✅ |
| SC-003 (ação primária <10s) | T005 (PageHeader), T020, T021 | ✅ |
| SC-004 (não regressão) | T026 + checkpoints | ✅ |
| SC-005 (build limpo) | T014, T019, T022, T027 | ✅ |
| SC-006 (375px mobile) | T023 | ✅ |
| SC-007 (foco visível telas-modelo) | T024 | ✅ |
| SC-008 (7 estados de badge distintos) | T003 | ✅ |

**Cobertura de requisitos com tasks**: 24/24 requisitos buildáveis cobertos (96% excluindo SC-001 como métrica pós-lançamento).

### 2. T018 cobre corretamente o redesenho do Dashboard

**Status: ✅ SIM, com observações**

T018 é tecnicamente correto e completo no escopo. O DashboardPage atual é **quase vazio** (apenas 7 cards futuros com emojis, zero cards ativos). T018 transforma isso em uma navegação operacional completa com 14 cards ativos + 7 futuros, agrupados em 3 áreas. O nível de mudança é substancial mas circunscrito a um único arquivo (`DashboardPage.tsx`), o que é adequado.

**Ressalva operacional**: T018 é marcado `[P]` (paralelo com T015/T016), o que é correto para o arquivo em si — mas T017 (que integra Sidebar+Topbar no AdminLayout) depende de T015 e T016 estarem concluídos. T018 pode ser implementado independentemente mas não testado visualmente até T017 estar completo, pois o layout global (sidebar + topbar) não existe ainda. Isso é sequenciado corretamente nos `Dependencies`, mas merece atenção durante a execução.

### 3. Cards ativos apontam apenas para rotas já existentes

**Status: ✅ CONFIRMADO**

Verificado no `apps/frontend/src/router/index.tsx`. Todas as rotas referenciadas em T018 existem:

| Card ativo | Rota em T018 | Existe no router? |
|------------|--------------|-------------------|
| Cooperados | `/members` | ✅ |
| Funções | `/member-roles` | ✅ |
| Categorias | `/material-categories` | ✅ |
| Subcategorias | `/material-subcategories` | ✅ |
| Unidades | `/units` | ✅ |
| Compradores | `/buyers` | ✅ |
| Veículos | `/vehicles` | ✅ |
| Tipos de EPI | `/epi-types` | ✅ |
| Centros de Custo | `/cost-centers` | ✅ |
| Pontos de Coleta | `/collection-points` | ✅ |
| Rotas de Coleta | `/collection-routes` | ✅ |
| Execução de Rotas | `/collection-routes` (mesmo destino) | ✅ (ver I3) |
| Entrada de Material Bruto | `/collection-routes` + helper text | ✅ (ver I2) |
| Saldo Bruto | `/raw-material-balance` | ✅ |

Nenhum card ativo aponta para rota inexistente ou stub.

### 4. Cards "Em breve" não criam funcionalidade falsa

**Status: ✅ CONFIRMADO**

Os 7 cards futuros (Triagem, Estoque pronto, Rejeito, Vendas operacionais, Financeiro, Rateio, Relatórios avançados) são definidos em T018 como `disabled/no primary action with Badge label "Em breve"`. O DashboardPage atual já implementa esse padrão com `opacity-40 cursor-not-allowed`. Nenhum desses cards tem rota correspondente no router. FR-017 reforça explicitamente essa restrição.

### 5. Fase 4 não altera backend, banco, permissões, seed ou contratos

**Status: ✅ CONFIRMADO**

Verificado em três camadas:
- `tasks.md` header scope: "Sem alterações em backend, schema Prisma, migrations, seeds, permissões ou contratos REST."
- `plan.md` Constraints: "Nenhuma alteração em `apps/backend/`, schema Prisma, migrations, seeds, permissões ou contratos REST"
- Nenhuma task referencia arquivos fora de `apps/frontend/`, `docs/adr/`, ou `specs/`
- T018 nota explícita: "do not alter backend, permissions, schema or business rules"

### 6. Tasks bem divididas para implementação incremental

**Status: ✅ BEM DIVIDIDAS**

27 tasks em 6 fases com 5 checkpoints de build (T012, T014, T019, T022, T027):
- Fase 1: 1 task (ADR)
- Fase 2: 10 tasks (tokens + 8 componentes + barrel + tsc)
- Fase 3: 2 tasks (login + checkpoint)
- Fase 4: 5 tasks (sidebar + topbar + adminlayout + dashboard + checkpoint)
- Fase 5: 3 tasks (2 pages + checkpoint)
- Fase 6: 5 tasks (mobile + a11y + contraste + regressão + build final)

Entrega incremental demonstrável após cada fase. Paralelismo bem marcado com `[P]`. Dependências explícitas e corretas na seção `Dependencies & Execution Order`.

### 7. Risco de refatoração visual grande demais em um único recorte

**Status: ✅ RISCO GERENCIADO**

O recorte é amplo em número de arquivos mas **todos dentro de `apps/frontend/`**, sem alterações de backend ou dados. As telas fora do escopo (`/members`, `/vehicles`, etc.) são **explicitamente preservadas** (T026 verifica regressão). A estratégia de manter `brand-*` (verde original) no `tailwind.config.js` durante a transição é correta.

O único risco real é T018 (DashboardPage): a transformação de 7 cards futuros genéricos para 14 cards ativos + 7 futuros é significativa. Porém circunscrita a um arquivo e sem dependências externas.

Recomendação operacional: implementar T015→T016→T017 **antes** de testar T018 visualmente, mesmo que T018 possa ser codificado em paralelo.

### 8. Componentes base são suficientes

**Status: ✅ SUFICIENTES para o escopo das 4 telas-modelo**

Os 8 componentes (Badge, Button, PageHeader, EmptyState, LoadingState, Pagination, FilterBar, Breadcrumbs) cobrem todos os requisitos das 4 telas-modelo. A **omissão de DataTable genérica** é uma decisão deliberada documentada no plan.md §6 — as tabelas das 4 telas-modelo serão estilizadas diretamente. Esta decisão é pragmática e aceita, mas gera a inconsistência I1 com spec.md.

### 9. Telas-modelo estão claras

**Status: ✅ CLARAS E COMPLETAS**

As 4 telas-modelo (Login, Dashboard, Pontos de Coleta, Rotas de Coleta) são especificadas em:
- spec.md: FR-010, FR-016, US1–US5, SC-001/003/004/006/007/008
- plan.md: Project Structure com caminhos exatos
- tasks.md: T013 (Login), T018 (Dashboard), T020 (CollectionPoints), T021 (CollectionRoutes)

Cada tela tem Independent Test descrito em tasks.md. Caminhos de arquivo são exatos e correspondem ao código existente. ✅

### 10. Validação econômica adequada

**Status: ✅ ADEQUADA**

```bash
npx -w apps/frontend tsc --noEmit
npx -w apps/frontend vite build
```

Declarados no header de tasks.md e executados em 5 checkpoints: T012 (base), T014 (US1), T019 (US2), T022 (US3+US4), T027 (final). A escolha de `npx -w apps/frontend` é correta para o monorepo Turborepo. O build (`vite build`) é mais robusto que só TypeScript pois valida também imports, aliases e bundles.

### 11. Violação da Constituição

**Status: ✅ SEM VIOLAÇÕES**

| Princípio | Resultado |
|-----------|-----------|
| I. Spec-Driven | ✅ PASS — spec aprovada existe |
| II. Fluxo Operacional | ✅ N/A — feature é UI pura |
| III. Rastreabilidade/Auditoria | ✅ N/A — nenhum evento de negócio |
| IV. Imutabilidade do Estoque | ✅ N/A — nenhum dado de estoque |
| V–XIX | ✅ N/A — funcionalidades operacionais não tocadas |
| XX. Interface Simples e Responsiva | ✅ DRIVE — esta feature implementa este princípio |
| XXI. Stack Tecnológica | ✅ PASS — React + TypeScript + Vite + Tailwind sem adições |
| XXII. ADR | ✅ PASS — T001 cria `docs/adr/004-design-tokens.md` |
| XXIII. Testes em Áreas Críticas | ✅ N/A — feature não toca auth, estoque, financeiro ou rateio |
| XXIV. Consistência e Segurança | ✅ PASS — frontend-only, sem entradas não sanitizadas |

O ADR obrigatório para Princípio XXII está coberto por T001. Nota: o diretório `docs/adr/` não existe ainda (ver C1).

---

## Tabela de Cobertura de Requisitos

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|-----------|----------|-------|
| FR-001 | ✅ | T002 | |
| FR-002 | ✅ | T002, T003–T010 | |
| FR-003 | ✅ | T003 | 7 variantes cobertas |
| FR-004 | ✅ | T010 | Ver ressalva A1: SEGMENT_LABELS incompleto |
| FR-005 | ✅ | T005 | |
| FR-006 | ⚠️ | T020, T021 | Sem DataTable genérica — estilização direta (ver I1) |
| FR-007 | ✅ | T006 | |
| FR-008 | ✅ | T007 | |
| FR-009 | ✅ | T015 | |
| FR-010 | ✅ | T013, T018, T020, T021 | |
| FR-011 | ✅ | T024 | |
| FR-012 | ✅ | T025 | |
| FR-013 | ✅ | T023 | |
| FR-014 | ✅ | T026 | |
| FR-015 | ✅ | T012, T014, T019, T022, T027 | |
| FR-016 | ✅ | T018 | Ver I2, I3 |
| FR-017 | ✅ | Constraint header + T018 | |
| SC-001 | ⚪ | — | Métrica pós-lançamento, sem task buildável obrigatória |
| SC-002 | ✅ | T020, T021 | |
| SC-003 | ✅ | T005, T020, T021 | |
| SC-004 | ✅ | T026 | |
| SC-005 | ✅ | T014, T019, T022, T027 | |
| SC-006 | ✅ | T023 | |
| SC-007 | ✅ | T024 | |
| SC-008 | ✅ | T003 | |

---

## Tasks Não Mapeadas

Todas as 27 tasks mapeiam para pelo menos um FR ou SC. Nenhuma task sem requisito correspondente.

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Total de Requisitos (FR + SC) | 25 |
| Total de Tasks | 27 |
| Requisitos com ≥1 task | 24/24 buildáveis (96%) |
| SC-001 excluída (métrica pós-lançamento) | 1 |
| Ambiguidades detectadas | 2 (A1, A2) |
| Inconsistências detectadas | 3 (I1, I2, I3) |
| Gaps de cobertura | 2 (C1, C2) |
| Issues CRITICAL | 0 |
| Issues HIGH | 0 |
| Issues MEDIUM | 3 (I1, I2, A1) |
| Issues LOW | 4 (I3, A2, C1, C2) |

---

## Próximas Ações

1. **Antes de iniciar**: Não há issues CRITICAL ou HIGH que bloqueiem `/speckit-implement`. O plano pode avançar.

2. **Ação recomendada para I1 (DataTable)**: Adicionar em spec.md Assumptions: "DataTable como componente genérico reutilizável está adiado para fase posterior; FR-006 será atendido por estilização direta nas 4 telas-modelo." Alternativamente, remover DataTable de Key Entities.

3. **Ação recomendada para A1 (SEGMENT_LABELS)**: Ao implementar T010, expandir `SEGMENT_LABELS` com todos os segmentos do router: `material-subcategories → 'Subcategorias'`, `member-roles → 'Funções'`, `epi-types → 'Tipos de EPI'`, `cost-centers → 'Centros de Custo'`, `raw-material-balance → 'Saldo Bruto'`, `material-entries → 'Entradas'`. Adicionar fallback para segmentos numéricos/UUID: ocultar ou usar reticências.

4. **Ação recomendada para I2 (Entrada MB)**: Ao implementar T018, usar `<Link to="/collection-routes">` com helper text visual claro no card: "Acesse via Rotas de Coleta > Detalhe da Rota". Ou simplificar o card para apontar ao tooltip/popover que explica o fluxo.

5. **Ação recomendada para C1 (ADR dir)**: Em T001, começar com `mkdir -p docs/adr/` antes de criar o arquivo.

6. **Sequenciamento na fase 4**: Embora T018 seja marcado `[P]`, garantir que T015+T016 estejam **testáveis** antes de integrar T017 (AdminLayout). T018 pode ser codificado em paralelo mas validado após T017.

---

## Oferta de Remediação

Deseja que eu sugira edições concretas para os 3 issues MEDIUM (I1, I2, A1)? Posso sugerir o texto exato para as modificações em spec.md e o conteúdo expandido de SEGMENT_LABELS para T010 — sem aplicar nada automaticamente.

---

## Veredicto Final

## ✅ APROVADO COM RESSALVAS

**Justificativa**: Os três artefatos estão alinhados entre si e com a Constituição. Não há violações constitucionais, não há alteração de backend ou contratos, as telas-modelo estão claras, a validação econômica é adequada e a divisão incremental de tasks é bem estruturada. Os 7 issues identificados são de severidade MÉDIO ou BAIXO, não bloqueiam a implementação, e podem ser tratados com ajustes pontuais durante a execução — especialmente a expansão do mapa `SEGMENT_LABELS` (A1) e a clareza do helper text do card "Entrada de Material Bruto" (I2).

**Pré-condição para `/speckit-implement`**: Nenhuma obrigatória. As ressalvas podem ser incorporadas como orientações ao implementador.
