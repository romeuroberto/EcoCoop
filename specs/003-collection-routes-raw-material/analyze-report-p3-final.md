# Relatório de Análise — Fase 3: Fechamento (T041–T046)

**Feature**: `003-collection-routes-raw-material`
**Data**: 2026-07-01
**Escopo**: Fechamento da Fase 3 — T041–T046, auditoria consolidada, rotas/sidebar, testes RBAC/edge cases, quickstart

---

## Findings

| ID | Categoria | Severidade | Local | Resumo | Recomendação |
|----|-----------|-----------|-------|--------|--------------|
| C1 | Coverage Gap | HIGH | `apps/frontend/src/router/index.tsx` | Rota `/collection-routes/:id/material-entries` está **ausente** do router. `RawMaterialEntriesPage.tsx` existe e está implementada, mas é inacessível via navegação do frontend. T042 não pode ser marcada como concluída. | Adicionar `{ path: 'collection-routes/:id/material-entries', element: S(RawMaterialEntriesPage) }` ao router. Importar o componente no bloco Phase 3. |
| C2 | Coverage Gap | HIGH | `apps/backend/test/` | `audit-phase3.e2e-spec.ts` (T041) não existe. Cobertura parcial existe dispersa em outros specs (`collection-points.spec.ts`, `collection-route-execution.spec.ts`), mas faltam: (a) CREATE de `CollectionPoint` com `previousState=null`, `newState` completo; (b) CREATE de `CollectionRoute`; (c) CREATE de `RawMaterialEntry`; (d) verificação que `/api/v1/audit-logs` não expõe rotas PUT/DELETE (imutabilidade do log, T041 + SC-007). | Criar `audit-phase3.e2e-spec.ts` com os 4 cenários faltantes. Reutilizar fixtures dos outros spec files. |
| C3 | Inconsistency | MEDIUM | `apps/frontend/src/router/index.tsx:175` | A rota `/collection-points/:id/edit` prevista em T042 está registrada como `/collection-points/:id` (sem o segmento `/edit`). Funcional, mas diverge da convenção utilizada em `/collection-routes/:id/edit`. | Padronizar: registrar `collection-points/:id/edit` com o mesmo `CollectionPointFormPage`, ou documentar explicitamente que a edição de pontos usa `:id` sem sufixo `/edit`. |
| C4 | Coverage Gap | MEDIUM | `apps/backend/test/` | `rbac-phase3.e2e-spec.ts` (T044) não existe. A cobertura de 403 está distribuída nos 5 spec files existentes, cobrindo os cenários principais. O que está **ausente**: verificação explícita de que respostas 403 não vazam dados do recurso (FR-006, SC-006) — nenhum spec verifica o corpo da resposta 403. | Criar `rbac-phase3.e2e-spec.ts` focado exclusivamente no gap de SC-006. Demais cenários 403 já existem — o arquivo consolidado pode referenciá-los por cobertura. Alternativamente, adicionar as assertions de `body` nas verificações 403 existentes. |
| C5 | Coverage Gap | MEDIUM | `apps/backend/test/` | `edge-cases-phase3.e2e-spec.ts` (T045) não existe. Casos cobertos em outros specs: geocoding failure ✅, concurrent start ✅, quantity zero/negativa ✅, estorno que zeraria saldo ✅, subcategoria inativa com histórico ✅. **Ausente**: o cenário "ponto de coleta inativado após estar em rota existente → ponto permanece na rota com `collectionPoint.isActive=false`" — nenhum spec testa esse comportamento explicitamente. | Criar `edge-cases-phase3.e2e-spec.ts` com apenas o cenário faltante (ponto inativado pós-inclusão em rota). Os demais casos cobertos nos specs existentes podem ser documentados como "cobertos". |
| C6 | Stale Checkbox | LOW | `specs/.../tasks.md` | T043 (sidebar) está marcada como `[ ]` (não concluída), mas **está completamente implementada**: `AdminLayout.tsx` contém os 3 itens exigidos — "Pontos de Coleta" → `/collection-points`, "Rotas de Coleta" → `/collection-routes`, "Saldo Bruto" → `/raw-material-balance`. | Marcar T043 como `[X]` em `tasks.md`. Zero código pendente. |
| C7 | Stale Checkbox | LOW | `specs/.../tasks.md` | T042 está marcada como `[ ]`. A maioria das rotas foi implementada (7 de 9). O checkbox não deve ser marcado até que C1 (rota faltante) e C3 (discrepância de path) sejam resolvidos. | Resolver C1 e C3 primeiro, depois marcar T042 como `[X]`. |
| C8 | Ambiguity | LOW | `specs/.../quickstart.md` | T046 (validação manual do quickstart) não foi executada contra o ambiente local. O conteúdo do quickstart.md é coerente com a implementação real: paths de API corretos, status enums sem acento (`CONCLUIDA`, `EM_ANDAMENTO`), cenários de saldo matematicamente corretos. Nenhuma divergência detectada na análise estática. | Executar os 7 cenários do quickstart.md contra o ambiente local. Registrar resultado. Nenhuma atualização de conteúdo parece necessária, mas apenas execução confirma. |

---

## Verificações Especiais

### 1. Rotas Frontend Previstas (T042)

| Rota Prevista | Status | Observação |
|---|---|---|
| `/collection-points` | ✅ Presente | `router/index.tsx:174` |
| `/collection-points/new` | ✅ Presente | `router/index.tsx:175` |
| `/collection-points/:id/edit` | ⚠️ Divergente | Registrada como `/collection-points/:id` (sem `/edit`) — ver C3 |
| `/collection-routes` | ✅ Presente | `router/index.tsx:178` |
| `/collection-routes/new` | ✅ Presente | `router/index.tsx:179` |
| `/collection-routes/:id` | ✅ Presente | `router/index.tsx:180` |
| `/collection-routes/:id/edit` | ✅ Presente | `router/index.tsx:181` |
| `/collection-routes/:id/material-entries` | ❌ AUSENTE | Bloqueia acesso à `RawMaterialEntriesPage` — ver C1 |
| `/raw-material-balance` | ✅ Presente | `router/index.tsx:185` |

### 2. Itens da Sidebar (T043)

| Item Previsto | Status | Path |
|---|---|---|
| "Pontos de Coleta" | ✅ Presente | `/collection-points` — `AdminLayout.tsx:18` |
| "Rotas de Coleta" | ✅ Presente | `/collection-routes` — `AdminLayout.tsx:19` |
| "Saldo Bruto" | ✅ Presente | `/raw-material-balance` — `AdminLayout.tsx:20` |

### 3. RawMaterialEntriesPage Roteada Corretamente

❌ **NÃO**. O componente `RawMaterialEntriesPage.tsx` existe em `apps/frontend/src/pages/raw-material/` e está implementado (recebe `routeId` via `useParams`), mas a rota `/collection-routes/:id/material-entries` está ausente do router. A página é inacessível via navegação. Ver C1.

### 4. Auditoria com previousState/newState em Endpoints Mutáveis

| Entidade | CREATE previousState=null | UPDATE previousState | Transição estado |
|---|---|---|---|
| `CollectionPoint` | ❌ Não testado explicitamente | ✅ `collection-points.spec.ts:205,228` | N/A |
| `CollectionRoute` | ❌ Não testado explicitamente | ✅ (parcial — via PATCH em planning) | ✅ `collection-route-execution.spec.ts:190` |
| `RawMaterialEntry` | ❌ Não testado explicitamente | ✅ (via reversal — `isReversed: true`) | N/A |
| `RawMaterialStockEvent` | ✅ Verificado como imutável no schema | N/A | N/A |

O `AuditInterceptor` está aplicado em todos os controllers relevantes (verificado em T040 ✅), mas os testes unitários de criação com `previousState=null` são os cenários faltantes de T041.

### 5. Imutabilidade de Eventos de Estoque (Princípio IV)

✅ **Preservada**. `RawMaterialStockEvent` não possui `updatedAt` (confirmado pelo design do data-model.md e pelo fato de que `teardown` dos specs faz `deleteMany` diretamente no banco via Prisma, não via API). Nenhuma rota PUT/DELETE existe para `RawMaterialStockEvent` nos módulos implementados. Estornos criam novos eventos compensatórios — não editam o original. O Princípio IV da Constituição está respeitado.

### 6. RBAC Validado no Backend (ADMIN, MANAGER, DRIVER, SORTER)

| Permissão | Cobertura existente | Arquivo |
|---|---|---|
| DRIVER 403 em POST /collection-points | ✅ | `collection-points.spec.ts:114` |
| SORTER 403 em POST/PATCH /collection-points | ✅ | `collection-points.spec.ts:123,258` |
| DRIVER 403 em POST /collection-routes | ✅ | `collection-routes.spec.ts:183` |
| SORTER 403 em POST /collection-routes | ✅ | `collection-routes.spec.ts:192` |
| DRIVER (próprio) start/complete rota → 200 | ✅ | `collection-route-execution.spec.ts:166` |
| DRIVER (outro) start/complete → 403 | ✅ | `collection-route-execution.spec.ts:271` |
| DRIVER cancel → 403 | ✅ | `collection-route-execution.spec.ts:288` |
| SORTER start/complete/cancel → 403 | ✅ | `collection-route-execution.spec.ts:299` |
| DRIVER rota própria EM_ANDAMENTO → 201 (entrada) | ✅ | `raw-material-entries.spec.ts:259` |
| DRIVER rota própria CONCLUIDA → 201 (FR-035b) | ✅ | `raw-material-entries.spec.ts:269` |
| DRIVER rota de outro → 403 (entrada) | ✅ | `raw-material-entries.spec.ts:279` |
| SORTER GET /material-entries → 403 | ✅ | `raw-material-entries.spec.ts:291` |
| DRIVER estorno → 403 | ✅ | `raw-material-entries.spec.ts:569` |
| DRIVER GET /raw-material-balance → 403 | ✅ | `raw-material-balance.spec.ts:288` |
| SORTER GET /raw-material-balance → 403 | ✅ | `raw-material-balance.spec.ts:296` |
| 403 não vaza dados do recurso (SC-006) | ❌ | Não testado explicitamente em nenhum spec |

### 7. Edge Cases Críticos com Teste Consolidado

| Edge Case | Cobertura | Arquivo |
|---|---|---|
| Geocoding falha → `locationPending=true` | ✅ | `collection-points.spec.ts:75,279` |
| Dois start simultâneos → 409 | ✅ (parcial — aceita CONCURRENT ou INVALID_TRANSITION) | `collection-route-execution.spec.ts:353` |
| Quantidade 0 → 422 | ✅ | `raw-material-entries.spec.ts` |
| Estorno que negativaria saldo → 409 | ✅ | `raw-material-entries.spec.ts` |
| Ponto inativado após inclusão em rota | ❌ Não testado | — |
| Saldo subcategoria inativa com histórico | ✅ | `raw-material-balance.spec.ts` |

### 8. quickstart.md Reflete o Fluxo Real

✅ **Sim, com ressalva de execução**. Análise estática confirma:
- Paths de API corretos (ex.: `/api/v1/collection-routes/:id/material-entries`)
- Status enums sem acento (`CONCLUIDA`, `EM_ANDAMENTO`, `PLANEJADA`, `CANCELADA`) — consistente com o contrato da API
- Cálculo de saldo matematicamente correto nos cenários 4 e 5
- Cenário 6 de RBAC alinhado com `contracts/rest-api.md`
- Cenário 7 de auditoria alinhado com SC-007

A única ressalva é que o Cenário 5, passo 4 comenta: "subcategoria não aparece ou aparece com zero" — o comportamento real, conforme FR-029 e T037, é que subcategoria com saldo = 0 não aparece na listagem (apenas `data: []`). O quickstart cobre essa ambiguidade com "OU" mas poderia ser mais preciso.

### 9. tasks.md — Código Pendente vs. Checkbox Desatualizado

| Tarefa | tasks.md | Realidade | Ação Necessária |
|---|---|---|---|
| T041 | [ ] | Código pendente: tests CREATE audit, imutabilidade de /audit-logs | Implementar + marcar |
| T042 | [ ] | Código pendente: rota `/collection-routes/:id/material-entries` faltando; path `/collection-points/:id/edit` divergente | Corrigir código + marcar |
| T043 | [ ] | Completamente implementado | Apenas atualizar checkbox |
| T044 | [ ] | Parcialmente coberto em outros specs; gap: SC-006 não leak | Criar spec focada no gap |
| T045 | [ ] | Parcialmente coberto; gap: ponto inativado em rota | Criar spec com gap restante |
| T046 | [ ] | Não executado | Executar cenários localmente |

### 10. Conformidade com a Constituição

| Princípio | Status | Evidência |
|---|---|---|
| I. Spec-Driven Development | ✅ | spec.md → plan.md → tasks.md → implementação rastreável |
| II. Fluxo Operacional como Domínio | ✅ | Módulos: `collection-points`, `collection-routes`, `raw-material-entries`, `raw-material-balance` |
| III. Rastreabilidade e Auditoria | ✅ (com ressalva) | AuditInterceptor aplicado em todos os controllers mutáveis; testes CREATE são os únicos gaps (C2) |
| IV. Imutabilidade do Estoque | ✅ | `RawMaterialStockEvent` sem updatedAt; sem rotas de mutação; estorno por evento compensatório |
| V. Separação de Estados | ✅ | `ENTRADA_BRUTO` / `ESTORNO_BRUTO` explícitos; triagem fora do escopo |
| XI. Permissões no Backend | ✅ | `RouteOwnershipGuard` + permissões verificadas no backend; gap SC-006 é de cobertura de teste, não de implementação |
| XXIII. Testes Obrigatórios | ⚠️ | Permissões ✅; estoque ✅; estado de rota ✅; **audit (T041) parcialmente coberto — CREATE audit não testado explicitamente** |
| XXIV. Consistência e Segurança | ✅ | Transações atômicas, saldo anti-negativo, optimistic locking |

**Violação da Constituição**: Nenhuma violação direta. A lacuna de T041 (CREATE audit não testado) é um gap de cobertura de testes, não uma ausência de implementação — o `AuditInterceptor` está aplicado. O Princípio XXIII, no entanto, exige cobertura em áreas críticas, então T041 deve ser completado antes do fechamento formal.

---

## Sumário de Cobertura

| Métrica | Valor |
|---|---|
| Rotas frontend previstas | 9 |
| Rotas implementadas (corretas) | 7 (78%) |
| Rotas com problema | 2 (C1: faltando, C3: path divergente) |
| Itens de sidebar previstos | 3 |
| Itens de sidebar implementados | 3 (100%) |
| Edge cases previstos em T045 | 6 |
| Edge cases cobertos (em outros specs) | 5 (83%) |
| Cenários RBAC previstos em T044 | ~16 |
| Cenários RBAC cobertos (em outros specs) | 15 (94%) |
| Scenarios audit previstos em T041 | 5 |
| Cenários audit cobertos (em outros specs) | 2 (40%) |
| Tarefas T041–T046 | 6 |
| Tarefas concluídas (código) | 1 (T043) |
| Tarefas com código pendente | 2 (T041, T042) |
| Tarefas apenas com gap de test spec | 2 (T044, T045) |
| Tarefas não iniciadas | 1 (T046) |

---

## Próximas Ações

### Crítico — bloqueia fechamento da Fase 3

1. **[C1] Adicionar rota `/collection-routes/:id/material-entries`** ao `apps/frontend/src/router/index.tsx` e importar `RawMaterialEntriesPage`. Sem isso, a feature de entrada de material bruto não é acessível no frontend.

### Alto — deve ser resolvido antes do merge

2. **[C2] Criar `audit-phase3.e2e-spec.ts`** com cenários: CREATE de CollectionPoint (previousState=null), CREATE de CollectionRoute, CREATE de RawMaterialEntry, e verificação de que `/api/v1/audit-logs` não aceita PUT/DELETE.

### Médio — recomendado antes do release

3. **[C3] Padronizar path de edição de pontos de coleta** — registrar `collection-points/:id/edit` consistente com `collection-routes/:id/edit`, ou documentar a divergência intencionalmente.
4. **[C4] Criar `rbac-phase3.e2e-spec.ts`** com foco em SC-006 (verificar que 403 não vaza dados do recurso no body).
5. **[C5] Criar `edge-cases-phase3.e2e-spec.ts`** com o único caso não coberto: ponto de coleta inativado após estar em rota existente.

### Baixo — limpeza de housekeeping

6. **[C6] Marcar T043 como `[X]`** em `tasks.md` — sidebar completamente implementada.
7. **[C7] Resolver C1 e C3, depois marcar T042 como `[X]`**.
8. **[C8] Executar T046** — rodar os 7 cenários do quickstart.md contra ambiente local e registrar resultado. Nenhuma atualização de conteúdo antecipada.

---

## Veredicto

### **APROVADO COM RESSALVAS**

**Justificativa:**

A Fase 3 está substancialmente completa. Os módulos backend (US1–US6) estão implementados e testados. O RBAC backend está coberto em 94% dos cenários. A imutabilidade do estoque (Princípio IV) está garantida. A auditoria está implementada no código (T040 ✅).

**Ressalvas que impedem APROVADO pleno:**

1. **C1 (HIGH)**: `RawMaterialEntriesPage` existe mas é inacessível — rota `/collection-routes/:id/material-entries` faltando no router. Isso é um gap funcional visível pelo usuário.
2. **C2 (HIGH)**: T041 não tem cobertura de teste para CREATE audit (previousState=null) em nenhuma das 3 entidades. Princípio XXIII requer testes em áreas críticas — auditoria é área crítica.
3. **T046 não executado**: A validação manual do quickstart é obrigatória por definição da tarefa.

**O que NÃO impede o fechamento** (já coberto):
- Funcionalidade core (US1–US6): ✅
- Sidebar com 3 itens: ✅  
- RBAC backend para ADMIN, MANAGER, DRIVER, SORTER: ✅
- Imutabilidade de eventos de estoque: ✅
- 5 de 6 edge cases cobertos: ✅
- quickstart.md coerente com implementação: ✅ (estático)
- Zero violações da Constituição: ✅

---

*Gerado por `/speckit-analyze` em 2026-07-01 — escopo: fechamento Fase 3 (T041–T046)*
