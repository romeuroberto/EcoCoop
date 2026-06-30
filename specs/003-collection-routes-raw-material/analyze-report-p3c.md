# Relatório de Análise — Fase 3C: Execução de Rota (T026–T029 / US3)

**Gerado em**: 2026-06-30  
**Escopo**: T026–T029, US3 — Iniciar e Concluir Execução da Rota  
**Artefatos analisados**: constitution.md, spec.md, plan.md, tasks.md, data-model.md, contracts/rest-api.md, código Fase 3A/3B  
**Status geral**: **APROVADO COM RESSALVAS**

---

## 1. Tabela de Findings

| ID | Categoria | Severidade | Localização | Resumo | Recomendação |
|----|-----------|------------|-------------|--------|--------------|
| H1 | Inconsistência | HIGH | tasks.md T002 × tasks.md T027 × contracts/rest-api.md | T002 semeia DRIVER com apenas `READ` em `COLLECTION_ROUTES`; T027 e contrato exigem permissão `EXECUTE` para `/start` e `/complete`. DRIVER receberia 403 da `RequirePermission` antes de chegar ao `RouteOwnershipGuard`. | Incluir `EXECUTE` na semente de DRIVER para `COLLECTION_ROUTES` em T002, ou rever T027 para usar `READ + RouteOwnershipGuard` em vez de `EXECUTE`. |
| H2 | Inconsistência | HIGH | audit.interceptor.ts:L90 × tasks.md T026 × spec.md SC-007 | `AuditInterceptor` mapeia HTTP POST → `AuditAction.CREATE`, que retorna `previousState=null` sem buscar o estado anterior. Endpoints de transição de estado (`start`, `complete`, `cancel`) são POST mas mutam entidade existente; audit logs terão `previousState=null`, violando SC-007. | T026 deve: (a) chamar o `AuditService` diretamente para registrar `previousState` antes da transição + `newState` após; OU (b) estender `AuditInterceptor` para aceitar anotação `@AuditAction('UPDATE')` que sobrescreva o mapeamento baseado em método HTTP. |
| M1 | Underspecification | MEDIUM | data-model.md:CollectionRoute × contracts/rest-api.md:POST /cancel | Endpoint `cancel` exige `{ reason: string }` (campo obrigatório no contrato), mas o modelo `CollectionRoute` não tem campo `cancelReason` ou similar. O motivo ficaria apenas implícito no corpo do `AuditLog`, sem persistência explícita nem consultável na entidade. | Adicionar campo `cancelReason String?` ao modelo `CollectionRoute` em data-model.md, ou documentar explicitamente na spec que o motivo é armazenado exclusivamente no AuditLog. Atualizar T001 se o campo for adicionado ao schema. |
| M2 | Coverage gap | MEDIUM | tasks.md T029 × spec.md US3 cenário 5 | T029 lista "cancelamento de CONCLUIDA → 409" mas **não lista** "tentativa de concluir rota CANCELADA → 409" (inverso). O cenário 5 de US3 no spec cobre este caso. | Adicionar cenário a T029: `POST /complete` em rota `CANCELADA` → 409 `INVALID_ROUTE_TRANSITION`. |
| M3 | Coverage gap | MEDIUM | tasks.md T029 × contracts/rest-api.md permissões | T029 não testa que SORTER recebe 403 em `/start`, `/complete` e `/cancel`. Este cenário é delegado a T044 (Phase 9), fora do recorte US3. Dentro do recorte, SORTER fica sem cobertura de teste de autorização. | Adicionar ao T029: `POST /start` como SORTER → 403 (independe de ownership, SORTER não tem permissão no módulo). |
| L1 | Inconsistência | LOW | spec.md US3 cenário 4 × contracts/rest-api.md | Spec diz "recebe HTTP 403 (ou erro indicando que rota concluída não é editável...)" para edição estrutural em `CONCLUIDA`. Contrato usa `409 ROUTE_NOT_EDITABLE`. São semanticamente diferentes (permissão vs. estado). | Padronizar para 409 (conflito de estado, não violação de permissão). Atualizar spec.md cenário 4 para indicar que a resposta é 409, não 403. |
| L2 | Underspecification | LOW | tasks.md T028 | T028 descreve `CollectionRouteDetailPage.tsx` mas não delimita explicitamente que a UI de entrada de material bruto (US4) **não** faz parte desta página. Implementadores podem tentar incluir o formulário de material no detail page. | Acrescentar nota em T028: "Não incluir UI de entrada de material bruto — esta é responsabilidade de T035 (`RawMaterialEntriesPage`)." |

---

## 2. Tabela de Cobertura de Requisitos (escopo T026–T029)

| Requisito | Tarefa(s) | Coberto? | Observação |
|-----------|-----------|----------|------------|
| FR-014: estados PLANEJADA/EM_ANDAMENTO/CONCLUIDA/CANCELADA | T026 | ✅ | Máquina de estados explícita no service |
| FR-015: timestamp `startedAt` ao iniciar | T026 | ✅ | Especificado em `startRoute` |
| FR-016: timestamp `completedAt` ao concluir | T026 | ✅ | Especificado em `completeRoute` |
| FR-017: CANCELADA → nenhuma outra transição | T026 | ✅ | `cancelRoute` verifica IN [PLANEJADA, EM_ANDAMENTO] |
| FR-018: sem edição estrutural em CONCLUIDA | T029 (teste) | ✅ | "qualquer edição em CONCLUIDA → 409" |
| FR-019: DRIVER registra início/conclusão | T027 + T005 | ✅ | RouteOwnershipGuard já implementado |
| FR-019a: DRIVER não edita campos estruturais | T028 (frontend) | ✅ | "campos estruturais read-only em EM_ANDAMENTO" |
| FR-020: DRIVER não atribuído → 403 | T027 + T029 | ✅ | RouteOwnershipGuard + teste em T029 |
| FR-030/031/032: auditoria em transições | T026 (via interceptor) | ⚠️ | **Problema H2** — `previousState` não é capturado |
| SC-007: 100% ops mutáveis com previousState/newState | T026 | ⚠️ | **Problema H2** |
| Optimistic locking via `version` | T026 + data-model.md | ✅ | `updateMany + WHERE version = currentVersion` |
| DRIVER de outra rota → 403 | T027 + RouteOwnershipGuard | ✅ | Guard já implementado (Fase 3B) |
| ADMIN/MANAGER cancelam sem ownership | T027 | ✅ | Guard ADMIN/MANAGER bypass |
| CONCLUIDA → CANCELADA bloqueado | T026 | ✅ | `status IN [PLANEJADA, EM_ANDAMENTO]` |
| Não invade RawMaterialEntry/StockEvent | T026/T027/T028/T029 | ✅ | Nenhuma referência a material em T026–T028 |

---

## 3. Verificação dos 12 Pontos do Escopo

| # | Ponto | Resultado | Detalhe |
|---|-------|-----------|---------|
| 1 | T026–T029 suficientes para execução independente | ✅ Sim | Cobrem service (T026), endpoints (T027), frontend (T028) e testes (T029). Dependência de US2 já completa (T015–T025 marcados ✅). |
| 2 | Máquina de estados clara: PLANEJADA→EM_ANDAMENTO→CONCLUIDA + cancel | ✅ Sim | data-model.md define transições permitidas. T026 descreve assertiva por estado. Contrato tem erro codes específicos por transição. |
| 3 | Duplo start retorna 409 | ✅ Sim | Optimistic locking `updateMany + WHERE version` → count=0 → 409 `ROUTE_CONCURRENT_MODIFICATION`. T029 cobre implicitamente. |
| 4 | Concluir rota não EM_ANDAMENTO → 409 | ✅ Sim | T026: `completeRoute` verifica `status=EM_ANDAMENTO`. Contrato: `409 INVALID_ROUTE_TRANSITION`. |
| 5 | Cancelar em estado inválido → 409 | ✅ Sim | T026: `cancelRoute` verifica `IN [PLANEJADA, EM_ANDAMENTO]`. Mas T029 não testa CANCELADA→complete. **(M2)** |
| 6 | DRIVER só inicia/conclui rota própria | ✅ Sim | T027: RouteOwnershipGuard em start/complete. Guard verifica `driverId` ou `teamMembers`. |
| 7 | DRIVER de outra rota → 403 | ✅ Sim | RouteOwnershipGuard lança ForbiddenException se não for owner/membro. T029: "DRIVER de outra rota → 403". |
| 8 | SORTER não pode executar rota | ⚠️ Parcial | SORTER não tem `EXECUTE` no contrato, mas T029 não testa explicitamente SORTER→403. T044 (fora do recorte) cobre. **(M3)** |
| 9 | Optimistic locking via `version` especificado | ✅ Sim | T026 detalha `updateMany + WHERE version = currentVersion`. data-model.md: `version Int @default(0)`. Contrato: `409 ROUTE_CONCURRENT_MODIFICATION`. |
| 10 | AuditInterceptor cobre start, complete, cancel | ⚠️ Parcial | Interceptor aplicado class-level (todos os endpoints cobertos), MAS mapeamento POST→CREATE omite `previousState`. Violação de SC-007. **(H2)** |
| 11 | Não invade entrada de material bruto / estoque | ✅ Sim | T026–T029 sem referência a `RawMaterialEntry`, `RawMaterialStockEvent` ou saldo. Boundary com US4 limpa. |
| 12 | Sem violação da Constitution | ✅ Sim (com ressalva) | Princípio III (Auditoria): risco por H2. Princípio XI (Permissões no Backend): RouteOwnershipGuard é server-side ✅. Princípio XXIII (Testes em áreas críticas): T029 cobre permissões e estado ✅. |

---

## 4. Análise da Constitution

| Princípio | Status | Evidência |
|-----------|--------|-----------|
| I. Spec-Driven | ✅ | spec.md US3 + tasks T026–T029 com spec de referência |
| II. Fluxo Operacional | ✅ | `startRoute`/`completeRoute`/`cancelRoute` espelham operação real de campo |
| III. Rastreabilidade e Auditoria | ⚠️ | AuditInterceptor aplicado mas `previousState` não capturado para POSTs de transição (H2) |
| IV. Imutabilidade do Estoque | ✅ N/A | US3 não toca estoque |
| XI. Permissões no Backend | ✅ | RouteOwnershipGuard server-side; ADMIN/MANAGER bypass; DRIVER ownership verificado |
| XXIII. Testes em Áreas Críticas | ✅ | T029: permissões, estado, timestamps, ownership — todos cobertos |

---

## 5. Métricas

| Métrica | Valor |
|---------|-------|
| Requisitos mapeados (escopo US3) | 14 |
| Tarefas no recorte | 4 (T026, T027, T028, T029) |
| Cobertura requisitos com ≥1 tarefa | 100% |
| Issues CRITICAL | 0 |
| Issues HIGH | 2 |
| Issues MEDIUM | 3 |
| Issues LOW | 2 |
| Violações da Constitution | 0 diretas (1 risco por H2) |

---

## 6. Tarefas sem Cobertura de Requisito

Nenhuma tarefa dentro de T026–T029 está sem requisito mapeado.

---

## 7. Próximas Ações

### Antes de iniciar T026

> Resolver H1 e H2 antes de implementar qualquer endpoint de execução.

**H1 — Permissão EXECUTE para DRIVER** (bloqueante):
- Opção A (recomendada): Atualizar T002 para incluir `EXECUTE` no seed de DRIVER para `COLLECTION_ROUTES`. Verificar se o sistema de permissões já suporta o nível `EXECUTE`, ou se é necessário adicioná-lo ao enum/seed.
- Opção B: Rever T027 para usar `@RequirePermission('COLLECTION_ROUTES', 'READ')` + `RouteOwnershipGuard` no lugar de `EXECUTE`, simplificando o modelo de permissões para DRIVER.

**H2 — AuditInterceptor e previousState** (bloqueante para compliance com SC-007):
- Opção A (recomendada): Em T026, para cada método de transição (`startRoute`, `completeRoute`, `cancelRoute`), chamar o `AuditService` diretamente — buscar estado atual antes da mutação, executar mutação, registrar `AuditLog` com `action=UPDATE`, `previousState`, `newState`.
- Opção B: Estender `AuditInterceptor` com decorador `@AuditAsUpdate()` que force `AuditAction.UPDATE` e busque `previousState` antes de executar POST handlers de transição.

### Antes de encerrar T029

- Adicionar cenário de teste ausente (M2): `POST /complete` em rota `CANCELADA` → 409 `INVALID_ROUTE_TRANSITION`.
- Adicionar cenário de teste (M3): SORTER em `POST /start` → 403.

### Melhorias opcionais (LOW)

- Alinhar spec.md US3 cenário 4 para usar 409 em vez de 403 (L1).
- Adicionar nota de delimitação em T028 sobre material entry (L2).
- Definir onde `cancelReason` é persistido — entity ou AuditLog (M1).

---

## Veredicto

**APROVADO COM RESSALVAS**

Os artefatos (spec, plan, tasks, data-model, contrato) são internamente consistentes e suficientes para implementar execução de rota de forma independente. A máquina de estados está corretamente especificada. O optimistic locking está modelado. O `RouteOwnershipGuard` está implementado e correto. A fronteira com US4 (material bruto) está limpa.

As **ressalvas obrigatórias** antes de iniciar T026 são:

1. **(H1)** Resolver o gap de permissão DRIVER (`READ` vs. `EXECUTE`) — sem isso, o DRIVER receberá 403 em start/complete independente do ownership guard.
2. **(H2)** Definir a estratégia de auditoria para POSTs de transição de estado — sem isso, `previousState` será `null` nos audit logs de start/complete/cancel, violando SC-007 e o Princípio III da Constitution.
