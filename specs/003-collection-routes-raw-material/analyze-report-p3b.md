# Specification Analysis Report — Fase 3B (T015–T025 / US2: Planejamento de Rota)

**Date**: 2026-06-30  
**Scope**: T015–T025 — US2 Planejar Rota de Coleta com Múltiplos Pontos  
**Artifacts analyzed**:
- `.specify/memory/constitution.md` v1.0.0
- `specs/003-collection-routes-raw-material/spec.md`
- `specs/003-collection-routes-raw-material/plan.md`
- `specs/003-collection-routes-raw-material/tasks.md` (Phase 4, T015–T025)
- `specs/003-collection-routes-raw-material/data-model.md`
- `specs/003-collection-routes-raw-material/contracts/rest-api.md`
- Código implementado da Fase 3A (`apps/backend/src/modules/collection-points/`, `apps/backend/prisma/schema.prisma`)

---

## Findings Table

| ID | Categoria | Severidade | Local(is) | Resumo | Recomendação |
|----|-----------|------------|-----------|--------|--------------|
| M1 | Underspecification | MEDIUM | spec.md US1-S4, tasks.md T016/T018, contracts L311-L332 | `spec.md` US1-S4 afirma que pontos inativos "deixam de aparecer na seleção de rotas novas", mas nem T016, nem T018, nem o contrato definem um erro `422 COLLECTION_POINT_INACTIVE` para a tentativa de adicionar ponto inativo a uma rota | Adicionar validação explícita em T016 (`pointIds`) e T018 (`POST .../points`): verificar `collectionPoint.isActive === true` antes de criar `RoutePoint`; adicionar `422 COLLECTION_POINT_INACTIVE` na tabela de erros do contrato |
| M2 | Underspecification | MEDIUM | tasks.md T016, contracts L280-L283 | T016 valida que o veículo está ativo (`422 VEHICLE_INACTIVE`) mas não valida que o usuário `driverId` está ativo. Se o perfil for DRIVER mas o usuário estiver desativado, o sistema aceitaria a rota | Adicionar em T016: "validar que usuário driverId está ativo" e incluir `422 DRIVER_INACTIVE` na tabela de erros do contrato |
| M3 | Underspecification | MEDIUM | tasks.md T018, T020 | T016 e T017 mencionam explicitamente "aplicar `AuditInterceptor`". T018 (add/delete/reorder pontos) e T020 (add/delete equipe) não mencionam. Se o interceptor for class-level no scaffold T015/T016, o comportamento é herdado — mas não está declarado, criando ambiguidade na implementação | Esclarecer em T015 ou T016 que `@AuditEntity('collectionRoute')` + `@UseInterceptors(AuditInterceptor)` são aplicados ao nível de classe; ou declarar explicitamente em T018 e T020 |
| M4 | Coverage Gap | MEDIUM | tasks.md T025 | T025 testa "DRIVER criando rota → 403" mas não inclui cenário "SORTER criando rota → 403". `spec.md` FR-013 menciona explicitamente DRIVER e SORTER | Adicionar a T025: "SORTER criando rota → 403" |
| L1 | Inconsistency | LOW | spec.md FR-014, L267; data-model.md L11; contracts L437 | Drift terminológico: `spec.md` FR-014 usa `CONCLUÍDA` (com acento) no texto narrativo; schema.prisma, tasks.md e contracts usam `CONCLUIDA` (sem acento). O enum implementado é `CONCLUIDA`. Não afeta execução — apenas leitura | Padronizar para `CONCLUIDA` sem acento em todo o spec.md (FR-014 e referências) para evitar confusão futura |
| L2 | Underspecification | LOW | tasks.md T019 | T019 implementa `POST /api/v1/collection-routes/:id/suggest-sequence` mas não declara qual permissão RBAC aplica. O contrato define `COLLECTION_ROUTES:MANAGE`, mas a task não cita | Adicionar à descrição de T019: "exigir `COLLECTION_ROUTES:MANAGE`; DRIVER → 403" |
| L3 | Underspecification | LOW | tasks.md T018, data-model.md RoutePoint.notes | T018 descreve "adiciona ponto com `sequence = max(sequence)+1`" mas não menciona persistir o campo `notes` do `RoutePoint`. O contrato define `notes` no body do `POST .../points` | Adicionar à descrição de T018: "salvar `notes` opcional do body em `RoutePoint.notes`" |
| L4 | Ordering | LOW | tasks.md T020, T025 | T020 permite gerenciar equipe em status `EM_ANDAMENTO`. Esse estado só é atingível via T026 (US3). T025 não pode testar o cenário "add equipe em EM_ANDAMENTO" de forma integrada sem T026 | Aceitar como gap de teste neste recorte; documentar em T025 que o cenário EM_ANDAMENTO ficará coberto em T029 (US3) |

---

## Coverage Summary

### US2 Acceptance Scenarios vs. Tasks

| Cenário | Cobertura | Tasks |
|---------|-----------|-------|
| S1: Rota salva com `status=PLANEJADA`, veículo, motorista | ✓ | T016 |
| S2: Sugestão de sequência por proximidade geográfica | ✓ | T019 |
| S3: Reordenação manual persistida | ✓ | T018 |
| S4: Adicionar membros da equipe | ✓ (parcial — EM_ANDAMENTO limitado até T026) | T020 |
| S5: Veículo e motorista obrigatórios | ✓ | T016 |
| S6: DRIVER → 403 em criação de rota | ✓ | T025 |

### Requirements Coverage (T015–T025 scope)

| Requisito | Coberto? | Tasks |
|-----------|----------|-------|
| FR-007: campos obrigatórios da rota | ✓ | T016 |
| FR-008: múltiplos pontos com sequência | ✓ | T016, T018 |
| FR-009: sugestão nearest neighbor + excluir sem coords | ✓ | T019 |
| FR-010: reordenação manual | ✓ | T018 |
| FR-011: pontos no mapa numerados | ✓ | T024 |
| FR-012: veículo e motorista obrigatórios | ✓ | T016 |
| FR-013: DRIVER e SORTER → 403 em planejamento | Parcial (SORTER não testado) | T016, T025 |
| FR-039: paginação, busca, filtros | ✓ | T021, T023 |
| FR-040: mapa via provider abstrato (MapView) | ✓ | T024 (reutiliza Fase 3A) |
| SC-002: rota criada em < 5 min | N/A (UX) | — |
| SC-003: sugestão < 3s para 20 pontos | ✓ (algoritmo O(n²) em memória) | T019 |
| SC-006: 403 sem vazar dados | Parcial (SORTER não testado) | T025 |
| SC-007: 100% ops mutáveis com auditoria | Parcial (T018/T020 sem declaração explícita) | M3 |

**Total Requirements (US2-specific)**: 13  
**Covered**: 11 completo, 2 parcial  
**Coverage %**: 85%

---

## Constitution Alignment

| Princípio | Status | Observação |
|-----------|--------|------------|
| I. Spec-Driven | ✅ | spec.md, plan.md, tasks.md existem e são coerentes |
| II. Fluxo Operacional | ✅ | `collection-routes` está no centro do fluxo |
| III. Rastreabilidade e Auditoria | ⚠️ | T018/T020 sem declaração explícita de `AuditInterceptor` (M3) |
| IV. Imutabilidade do Estoque | N/A | Não é escopo de T015–T025 |
| V. Separação de estados | ✅ | Entrada de material e estoque fora do escopo |
| XI. Permissões no Backend | ✅ | Todas as verificações são server-side |
| XIII. Mapas para Rotas | ✅ | T024 inclui `MapView` com pontos numerados |
| XXIII. Testes Obrigatórios | ⚠️ | T025 cobre permissões e transições; SORTER não testado (M4) |
| XXIV. Consistência, Segurança | ✅ | Reordenação atômica em transação Prisma (T018); validação de entrada (T016) |

**Violações CRÍTICAS de Constituição**: Nenhuma.

---

## Unmapped Tasks

Nenhuma task T015–T025 ficou sem mapeamento para um requisito ou história de usuário.

---

## Metrics

- **Total Requirements (US2 scope)**: 13
- **Total Tasks (T015–T025)**: 11
- **Coverage %**: 85% (2 requisitos com cobertura parcial)
- **Findings**: 8 (0 CRITICAL, 0 HIGH, 4 MEDIUM, 4 LOW)
- **Ambiguidade Count**: 2 (M3, L2)
- **Duplication Count**: 0
- **Critical Issues**: 0

---

## Checklist das 14 Verificações Solicitadas

| # | Pergunta | Resultado |
|---|----------|-----------|
| 1 | T015–T025 suficientes para planejamento de rotas independentemente? | ✅ Sim. Todos os 6 cenários de US2 têm cobertura. |
| 2 | CollectionRoute pode ser criada em PLANEJADA sem depender de execução? | ✅ Sim. Schema `@default(PLANEJADA)`; execução é US3 (T026+). |
| 3 | RoutePoint corretamente ligado a CollectionRoute e CollectionPoint? | ✅ Sim. FK dupla com `@@unique([routeId, collectionPointId])` e `@@unique([routeId, sequence])`. |
| 4 | Sequência obrigatória e sem duplicidade? | ✅ Sim. Unique constraints no schema; reordenação atômica em T018. |
| 5 | Pontos inativos não podem ser adicionados a novas rotas? | ⚠️ Spec implica, mas validação não está no contrato nem em T016/T018. Ressalva M1. |
| 6 | Pontos sem coords podem entrar na rota, mas sugestão deve ignorar/avisar? | ✅ Sim. FR-003a + T019 exclui `locationPending=true` com lista `excludedPoints`. |
| 7 | Algoritmo de sugestão bem definido? | ✅ Sim. Nearest neighbor O(n²); contrato define resposta com `suggestedOrder` e `excludedPoints`. |
| 8 | Veículo e motorista precisam estar ativos? | ⚠️ Veículo validado (`422 VEHICLE_INACTIVE`). Driver validado apenas por perfil, não por status ativo. Ressalva M2. |
| 9 | ADMIN e MANAGER têm permissão correta? | ✅ Sim. `COLLECTION_ROUTES:MANAGE` para ambos. Contrato e tasks consistentes. |
| 10 | DRIVER/SORTER recebem 403 em criação/edição de planejamento? | ⚠️ DRIVER testado em T025. SORTER não incluído nos testes. Ressalva M4. |
| 11 | AuditInterceptor aplicado nos endpoints mutáveis? | ⚠️ Explícito em T016 e T017. T018 e T020 não mencionam. Ressalva M3. |
| 12 | Listagem retorna envelope paginado { data, total, page, limit }? | ✅ Sim. T021 + contrato GET /collection-routes definem o envelope. |
| 13 | Não há violação da constitution? | ✅ Sem violações CRÍTICAS. Dois alertas (M3/M4) sobre cobertura parcial de Princípio III e XXIII. |
| 14 | Recorte não invade execução de rota nem estoque bruto? | ✅ Sim. T020 inclui lógica de EM_ANDAMENTO para gestão de equipe (correto), mas início/conclusão são T026+. Sem entrada de material nem estoque. |

---

## Next Actions

As ressalvas M1, M2, M3 e M4 são corrigíveis diretamente em `tasks.md` antes da implementação, sem necessidade de alterar `spec.md` ou `plan.md`:

1. **M1** — Adicionar validação de ponto ativo em T016 e T018; inserir `422 COLLECTION_POINT_INACTIVE` no contrato.
2. **M2** — Adicionar validação de usuário ativo em T016; inserir `422 DRIVER_INACTIVE` no contrato.
3. **M3** — Declarar em T015 (scaffold) que o `CollectionRoutesController` será decorado com `@AuditEntity('collectionRoute')` e `@UseInterceptors(AuditInterceptor)` a nível de classe.
4. **M4** — Adicionar cenário "SORTER criando rota → 403" em T025.

Nenhuma dessas ressalvas bloqueia a implementação, mas M1 e M3 têm risco de causar bugs silenciosos (ponto inativo aceito em rota; operação de ponto sem auditoria).

**Recomendação**: Corrigir as ressalvas M1–M4 em `tasks.md` antes de `/speckit-implement T015–T025`, ou prosseguir com a implementação já corrigindo os pontos diretamente no código.

---

## Conclusão

> **APROVADO COM RESSALVAS**

0 issues CRITICAL · 0 HIGH · 4 MEDIUM · 4 LOW

Os artefatos de T015–T025 são internamente consistentes e cobrem com fidelidade os requisitos de US2. Não há violação da Constituição. As 4 ressalvas MEDIUM são gaps de especificação menores que precisam de ajuste em `tasks.md` (ou tratamento direto na implementação), sem impacto na arquitetura ou no contrato principal.
