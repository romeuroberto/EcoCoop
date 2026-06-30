# Specification Analysis Report — Fase 2, Implementação P1 (T001–T036)

**Data**: 2026-06-30  
**Escopo analisado**: T001–T036 (US1 + US2 + US3)  
**Artefatos**: constitution.md · spec.md · plan.md · tasks.md · data-model.md · contracts/rest-api.md

---

## 1. Suficiência de T001–T036 para US1, US2 e US3

### Cobertura completa por user story

| User Story | Tasks backend | Tasks testes | Tasks frontend | Status |
|---|---|---|---|---|
| US1 — Cooperados + Funções | T006–T011 | T012–T013 | T014–T017 | ✅ COBERTA |
| US2 — Materiais (Categoria + Subcategoria) | T018–T023 | T024–T025 | T026–T029 | ✅ COBERTA |
| US3 — Unidades de Medida | T030–T032 | T033 | T034–T036 | ✅ COBERTA |
| Fundação + Seed (Phase 1 e 2) | T001–T005 | — | — | ✅ PRESENTE |

**Conclusão**: T001–T036 são **suficientes** para implementar US1, US2 e US3.

---

## 2. Findings

### Tabela Completa

| ID | Categoria | Severidade | Localização | Resumo | Recomendação |
|---|---|---|---|---|---|
| H1 | Inconsistência | HIGH | spec.md:326–327 vs plan.md:37, tasks.md, rest-api.md intro | Spec.md Assumptions afirma "Não haverá paginação do lado do servidor nesta fase"; plan.md, tasks.md e REST API definem explicitamente page/limit/total | Remover a assunção obsoleta de spec.md ou atualizar para refletir a decisão do plan.md |
| H2 | Inconsistência | ~~HIGH~~ **RESOLVIDO** | rest-api.md | Exemplos de GET /members e GET /units corrigidos para envelope `{data, total, page, limit}`; GET /material-categories e GET /material-subcategories receberam exemplos de resposta e parâmetros page/limit (2026-06-30) | ✅ Corrigido em contracts/rest-api.md |
| M1 | Escopo | MEDIUM | tasks.md:T001 | T001 cria 9 modelos e 2 enums — inclui Buyer, Vehicle, EpiType, CostCenter, VehicleType, DocumentType, fora do escopo da implementação P1 | Aceitar conscientemente: tabelas extras são inertes sem módulo backend; documentar decisão |
| M2 | Escopo | MEDIUM | tasks.md:T005 | Seed adiciona permissões RBAC para BUYERS, VEHICLES, EPI_TYPES, COST_CENTERS (módulos não implementados em T001–T036) | Aceitar conscientemente: permissões extras são registros inertes; não cria inconsistência |
| M3 | Dependência implícita | MEDIUM | tasks.md:T025 | Testes de integração de MaterialSubcategory (T025) precisam de UnitOfMeasure no banco para validar `defaultUnitId` — dependência cruzada com US3 não documentada | Adicionar nota em T025: "Requer semente de UnitOfMeasure ativa no DB de teste antes de rodar" |
| M4 | Inconsistência de código de erro | MEDIUM | rest-api.md:221 vs tasks.md:T019 | Bloqueio de inativação de categoria com subcategorias ativas retorna **409** no contrato REST e **422** em T019 | Alinhar para 422 (Unprocessable Entity); semanticamente correto para violação de regra de negócio |
| M5 | Gap de documentação | MEDIUM | rest-api.md:87–91, tasks.md:T007, T012 | Contrato REST não define código de erro para bloqueio de **renomeação** de MemberRole isDefault; tasks.md (T007/T012) exige 422 mas sem código nomeado | Adicionar ao contrato: `422 MEMBER_ROLE_DEFAULT_RENAME_BLOCKED` para PATCH /member-roles/:id quando name é alterado em isDefault=true |
| M6 | Regra não especificada | MEDIUM | rest-api.md:91 vs spec.md, data-model.md | Contrato REST define `422 CANNOT_DEACTIVATE_DEFAULT_WITH_MEMBERS` (bloqueia inativação de isDefault se há Members ativos), mas nem spec.md nem data-model.md definem essa regra | Avaliar intenção: data-model.md permite ativar/inativar isDefault. Se a regra for mantida, adicionar ao data-model.md e spec.md; se não, remover do contrato |
| L1 | Drift terminológico | LOW | spec.md:290 vs data-model.md:112, tasks.md:T021-T022, rest-api.md:248 | Spec.md Key Entities descreve o campo como `unitId` (FK unidade padrão) em MaterialSubcategory; todos os outros artefatos usam `defaultUnitId` | Atualizar spec.md Key Entities para `defaultUnitId` |
| L2 | Documentação incompleta | LOW | rest-api.md:98–105, 194–201, 228–235, 267–271 | Tabelas de query parameters de GET /members, GET /material-categories, GET /material-subcategories, GET /units, GET /buyers, GET /vehicles, GET /epi-types, GET /cost-centers omitem `page` e `limit` explicitamente (apenas member-roles documenta todos os 4) | Adicionar `page` e `limit` nas tabelas de query de todos os endpoints de listagem |

---

## 3. Dependências Ocultas em US4–US7

Para a implementação restrita a T001–T036:

| Dependência | Risco | Avaliação |
|---|---|---|
| T022 (MaterialSubcategory.service) valida `defaultUnitId` contra UnitOfMeasure ativa | Requer tabela UnitOfMeasure no DB | ✅ COBERTO — T001 cria o modelo; T031 implementa o módulo (US3) |
| T028 (MaterialSubcategoryFormPage) precisa de Units API para seletor `defaultUnit` | Requer US3 frontend disponível | ✅ COBERTO — US3 está em escopo (T030–T036) |
| T025 testa `defaultUnitId` inativo (400 UNIT_INACTIVE) | Requer UnitOfMeasure no banco de teste | ⚠️ IMPLÍCITO — ver M3 |
| Buyer, Vehicle, EpiType, CostCenter | Não implementados em T001–T036 | ✅ SEM IMPACTO — nenhum módulo US1-US3 depende deles |

**Conclusão**: Não há dependências ocultas bloqueantes de US4–US7. A única dependência relevante (UnitOfMeasure para MaterialSubcategory) está dentro do escopo P1.

---

## 4. Migrations e Campos com Dependências Futuras Obrigatórias

T001 cria os seguintes modelos além do escopo mínimo P1:

| Modelo | Campo FK | Obrigatório? | Avaliação |
|---|---|---|---|
| Buyer | userId (→ User) | NÃO (nullable) | ✅ SEGURO |
| Vehicle | capacityUnitId (→ UnitOfMeasure) | NÃO (nullable) | ✅ SEGURO |
| EpiType | (standalone) | N/A | ✅ SEGURO |
| CostCenter | (standalone) | N/A | ✅ SEGURO |

**Nenhum campo obrigatório depende de entidade de fase futura.** A migration é segura para P1.

---

## 5. Coerência das Entidades Centrais

### MemberRole

| Atributo | Spec | Data-model | REST API | Tasks | Status |
|---|---|---|---|---|---|
| id, name | ✅ | ✅ | ✅ | ✅ | ✅ |
| isDefault | ✅ | ✅ | ✅ | ✅ | ✅ |
| status (isActive) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Renomeação bloqueada para isDefault | ✅ (data-model) | ✅ | ❌ (sem código de erro) | ✅ (T007/T012) | ⚠️ M5 |
| ADMIN=MANAGE, MANAGER=READ | ✅ (FR-000b/c) | — | ✅ | ✅ (T005/T008) | ✅ |

### Member (Cooperado)

| Atributo | Spec | Data-model | REST API | Tasks | Status |
|---|---|---|---|---|---|
| id, name, cpf, phone, email?, admittedAt, roleId, isActive, notes?, userId? | ✅ | ✅ | ✅ | ✅ | ✅ |
| CPF único + dígito verificador | ✅ (FR-002) | ✅ | ✅ (409) | ✅ (T003/T013) | ✅ |
| roleId ativa no cadastro | ✅ (FR-001) | ✅ | ✅ (400) | ✅ (T010/T013) | ✅ |
| link-user: User não pode ser Member e Buyer | ✅ (FR-003) | ✅ | ✅ (409) | ✅ (T010/T013) | ✅ |
| Inativação sem excluir | ✅ (FR-004) | ✅ | ✅ | ✅ (T013) | ✅ |
| ADMIN=MANAGE, MANAGER=MANAGE | ✅ (FR-033b) | — | ✅ | ✅ (T005) | ✅ |

### MaterialCategory

| Atributo | Spec | Data-model | REST API | Tasks | Status |
|---|---|---|---|---|---|
| id, name, description?, isActive | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bloqueio de inativação com subcategorias ativas | ✅ (FR-012) | ✅ | ✅ (erroneamente 409) | ✅ (T019, 422) | ⚠️ M4 |
| ADMIN=MANAGE, MANAGER=READ | ✅ (FR-033b) | — | ✅ | ✅ (T005) | ✅ |

### MaterialSubcategory

| Atributo | Spec | Data-model | REST API | Tasks | Status |
|---|---|---|---|---|---|
| id, categoryId, name, defaultUnitId, isSellable, acceptsStock, notes?, isActive | ✅* | ✅ | ✅ | ✅ | ⚠️ L1 (unitId vs defaultUnitId na spec) |
| Nome único dentro da categoria | ✅ (FR-009) | ✅ | ✅ (409) | ✅ (T022) | ✅ |
| defaultUnitId ativa | ✅ (FR-008) | ✅ | ✅ (400) | ✅ (T022) | ✅ |

### UnitOfMeasure

| Atributo | Spec | Data-model | REST API | Tasks | Status |
|---|---|---|---|---|---|
| id, name, symbol, baseUnitId?, conversionFactor?, isActive | ✅ | ✅ | ✅ | ✅ | ✅ |
| baseUnitId + conversionFactor: ambos ou nenhum | ✅ (FR-014) | ✅ | ✅ (400) | ✅ (T031/T033) | ✅ |
| Auto-referência bloqueada | ✅ (FR-016) | ✅ | ✅ (400) | ✅ (T031/T033) | ✅ |
| ADMIN=MANAGE, MANAGER=READ | ✅ (FR-033b) | — | ✅ | ✅ (T005) | ✅ |

---

## 6. RBAC — ADMIN e MANAGER

| Módulo | ADMIN (spec) | ADMIN (tasks T005) | ADMIN (REST API) | MANAGER (spec) | MANAGER (tasks T005) | MANAGER (REST API) |
|---|---|---|---|---|---|---|
| MEMBER_ROLES | MANAGE | MANAGE | ✅ | READ | READ | ✅ |
| MEMBERS | MANAGE | MANAGE | ✅ | MANAGE | MANAGE | ✅ |
| MATERIALS | MANAGE | MANAGE | ✅ | READ | READ | ✅ |
| UNITS | MANAGE | MANAGE | ✅ | READ | READ | ✅ |

**Conclusão**: RBAC coerente para os módulos US1–US3 em todos os artefatos ✅

---

## 7. AuditInterceptor nos Controllers Mutáveis

| Controller | Task | Decoradores declarados | Status |
|---|---|---|---|
| member-roles.controller.ts | T008 | `@AuditEntity('memberRole')` + `@UseInterceptors(AuditInterceptor)` | ✅ |
| members.controller.ts | T011 | `@AuditEntity('member')` + `@UseInterceptors(AuditInterceptor)` | ✅ |
| material-categories.controller.ts | T020 | `@AuditEntity('materialCategory')` + `@UseInterceptors(AuditInterceptor)` | ✅ |
| material-subcategories.controller.ts | T023 | `@AuditEntity('materialSubcategory')` + `@UseInterceptors(AuditInterceptor)` | ✅ |
| units.controller.ts | T032 | `@AuditEntity('unitOfMeasure')` + `@UseInterceptors(AuditInterceptor)` | ✅ |

Testes verificam `previousState` não-nulo em T013, T024, T025, T033 — alinhados com SC-004 ✅

---

## 8. Listagens com page, limit, search e status

| Módulo | Service (tasks) | REST API table | Response envelope | Status |
|---|---|---|---|---|
| MemberRoles | T007: page/limit/search/status ✅ | ✅ explícito | ✅ `{data,total,page,limit}` | ✅ |
| Members | T010: page/limit/search/status ✅ | ✅ page/limit adicionados (2026-06-30) | ✅ envelope `{data,total,page,limit}` (2026-06-30) | ✅ |
| MaterialCategories | T019: page/limit/search/status ✅ | ✅ page/limit adicionados (2026-06-30) | ✅ exemplo adicionado (2026-06-30) | ✅ |
| MaterialSubcategories | T022: page/limit/search/status ✅ | ✅ page/limit adicionados (2026-06-30) | ✅ exemplo adicionado (2026-06-30) | ✅ |
| Units | T031: page/limit/search/status ✅ | ✅ page/limit adicionados (2026-06-30) | ✅ envelope `{data,total,page,limit}` (2026-06-30) | ✅ |

**H2 resolvido (2026-06-30)**: todos os endpoints de listagem usam o envelope paginado padrão `{data, total, page, limit}`.

---

## 9. Inativação Lógica

| Verificação | Evidência | Status |
|---|---|---|
| Todos os modelos têm `isActive: boolean` | data-model.md — todos os 9 modelos | ✅ |
| FR-035: deleção física proibida | Especificado em spec.md + reiterado em tasks.md nota final | ✅ |
| Services usam `update({isActive: false})` | T007, T010, T019, T022, T031 implícitos no padrão | ✅ |
| Edge Cases documentados | spec.md:179–190 — inativo ausente de seletores | ✅ |
| Testes verificam ocultação em ?status=active | T013, T024/T025, T033 | ✅ |
| Cascata automática proibida (FR-012c) | Especificado; apenas bloqueio com mensagem | ✅ |

---

## 10. Verificação da Constitution

| Princípio | Status | Evidência |
|---|---|---|
| I. Spec-Driven (NÃO NEGOCIÁVEL) | ✅ | spec.md completo; plan → tasks antes de implementar |
| II. Fluxo Operacional como Domínio | ✅ | Módulos nomeados com vocabulário da cooperativa |
| III. Rastreabilidade e Auditoria | ✅ | AuditInterceptor em todos os controllers; SC-004 testado |
| IV. Imutabilidade do Estoque (NÃO NEGOCIÁVEL) | ✅ | Nenhum StockEvent; sem tocar em saldo |
| V. Separação de Estados do Material | ✅ | `acceptsStock` e `isSellable` em MaterialSubcategory — sem criar estados de estoque |
| VI–VII. Financeiro / Rateio | N/A | Fora do escopo desta fase |
| VIII. Instância Dedicada | ✅ | Sem multi-tenancy |
| IX. Portal do Comprador | ✅ | Buyer com FK opcional para User; portal placeholder mantido |
| X. Cooperados com Login Individual | ✅ | Member com FK opcional para User; exclusividade preservada |
| XI. Permissões no Backend (NÃO NEGOCIÁVEL) | ✅ | RBAC em todos os endpoints; 403 testado em T012/T013/T024/T025/T033 |
| XII–XV. Coleta / Presença / Docs / Pesagem | N/A | Fora do escopo |
| XVI. Estoque com Unidades Configuráveis | ✅ | UnitOfMeasure com baseUnitId + conversionFactor opcionais |
| XVII. Materiais por Categorias | ✅ | MaterialCategory → MaterialSubcategory hierárquico |
| XVIII–XIX. Financeiro / Relatórios | N/A | Fora do escopo |
| XX. Interface Responsiva e Simples | ✅ | FR-036/FR-042; fluxos em ≤3 passos |
| XXI. Stack Definida | ✅ | Zero novas dependências de produção |
| XXII. ADR | ✅ | research.md documenta decisões de modelagem |
| XXIII. Testes Obrigatórios (NÃO NEGOCIÁVEL) | ✅ | Permissões (SC-003) e auditoria (SC-004) cobertas; T012/T013/T024/T025/T033 |
| XXIV. Consistência / Segurança | ✅ | Inativação lógica; FK preservadas; CPF/CNPJ com dígito verificador |

**Nenhuma violação da Constitution detectada.**

---

## Coverage Summary

| Requirement Key | Has Task(s)? | Task IDs | Notes |
|---|---|---|---|
| FR-000 a FR-000e (MemberRole) | ✅ | T005-T008, T012 | Completo |
| FR-001 a FR-006 (Member) | ✅ | T003, T009-T011, T013 | Completo |
| FR-007 a FR-012c (MaterialCategory/Subcategory) | ✅ | T018-T025 | Completo |
| FR-013 a FR-017 (UnitOfMeasure) | ✅ | T030-T033 | Completo |
| FR-018 a FR-022 (Buyer) | ➡️ T037+ | Fora de P1 | Por design |
| FR-023 a FR-026 (Vehicle) | ➡️ T044+ | Fora de P1 | Por design |
| FR-027 a FR-029 (EpiType) | ➡️ T051+ | Fora de P1 | Por design |
| FR-030 a FR-032 (CostCenter) | ➡️ T058+ | Fora de P1 | Por design |
| FR-033 a FR-035 (Segurança/Auditoria) | ✅ | T003-T005, T008, T011, T020, T023, T032 | Completo para P1 |
| FR-036 a FR-044 (Frontend) | ✅ | T014-T017, T026-T029, T034-T036 | Completo para P1 |
| SC-001 | Parcial | — | Só US1-US3; SC-001 inclui todos os 8 módulos |
| SC-002 | ✅ | T013, T025, T033 | Verificado por teste |
| SC-003 | ✅ | T012, T013, T024, T025, T033 | 403 verificado |
| SC-004 | ✅ | T013, T024, T025, T033 | previousState verificado |
| SC-005 | N/A | — | Métrica de usabilidade, não testável por código |
| SC-006 | ✅ | T015, T016, T027, T028, T035 | Formulários com validação por campo |
| SC-007 | ✅ | T003, T004, T013 | CPF/CNPJ com dígito verificador |

---

## Metrics

| Métrica | Valor |
|---|---|
| Total de Functional Requirements (todos os FRs) | 44 (FR-000 a FR-044) |
| FRs cobertos por T001–T036 | 30 (todos US1-US3 + segurança + frontend) |
| FRs fora de P1 por design | 14 (US4–US7) |
| Coverage % de FRs em escopo P1 | 100% |
| Total de tasks P1 (T001–T036) | 36 |
| Tasks com dependência implícita não documentada | 1 (T025) |
| Issues HIGH | 2 |
| Issues MEDIUM | 6 |
| Issues LOW | 2 |
| Violações de Constitution | 0 |

---

## Próximas Ações

### Antes de iniciar implementação (resolver H2 prioritariamente)

1. **[H2 — BLOQUEANTE PARA IMPLEMENTAÇÃO]** Corrigir os exemplos de resposta de GET /members e GET /units em `rest-api.md` para usar o envelope paginado `{data, total, page, limit}` — igual ao exemplo de GET /member-roles. Sem essa correção, implementadores de T010-T011 e T031-T032 podem produzir respostas incompatíveis com T012 (teste) e T065 (PaginatedList).

2. **[H1 — ESCLARECIMENTO]** Remover ou atualizar a assunção de spec.md (linha 326) que contradiz a decisão de paginação do plan. Sugestão: substituir por "Paginação server-side simples (page/limit) implementada — volume atual não exige cursor pagination."

3. **[M4 — SIMPLES]** Alinhar código de erro de bloqueio de categoria: alterar rest-api.md linha 221 de `409` para `422`.

4. **[M5 — SIMPLES]** Adicionar ao contrato REST (PATCH /member-roles/:id) o erro `422 MEMBER_ROLE_DEFAULT_RENAME_BLOCKED` para bloqueio de renomeação de isDefault.

5. **[M6 — DECISÃO NECESSÁRIA]** Definir explicitamente no spec/data-model se isDefault MemberRoles podem ser inativadas quando têm Members ativos. Se sim, remover `CANNOT_DEACTIVATE_DEFAULT_WITH_MEMBERS` do contrato. Se não, documentar a regra nos artefatos de especificação.

6. **[M3 — SIMPLES]** Adicionar nota em T025: "Requer semente de UnitOfMeasure ativa no DB de teste antes de executar os testes de validação de defaultUnitId."

7. **[L1 — SIMPLES]** Atualizar spec.md Key Entities: substituir `unitId (FK unidade padrão)` por `defaultUnitId (FK unidade padrão)` em MaterialSubcategory.

### Pode iniciar sem bloqueio

- T001, T002 (schema + migration) — sem ambiguidades
- T003, T004, T005 (validators + seed) — sem ambiguidades
- T006–T009, T018, T021, T030 (DTOs) — sem ambiguidades
- Resolução dos issues acima pode ocorrer em paralelo com os DTOs

---

## Veredicto

**APROVADO COM RESSALVAS**

T001–T036 cobrem 100% dos requisitos de US1, US2 e US3. Não há violações da Constitution. Nenhum campo de migration cria dependência obrigatória para fases futuras. RBAC, AuditInterceptor, inativação lógica e parâmetros de listagem estão especificados de forma consistente no conjunto plan + tasks.

As ressalvas não bloqueiam a migration (T001-T002) nem os validators/seed (T003-T005), mas o **finding H2 deve ser resolvido antes de implementar os services/controllers** (T010-T011, T019-T023, T031-T032) para evitar divergência no formato de resposta das listagens.

---

*Relatório gerado em 2026-06-30 — análise de artefatos em estado Draft.*
