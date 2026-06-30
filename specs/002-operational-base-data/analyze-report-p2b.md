# Relatório de Análise — Fase 2B: Compradores e Veículos

**Feature**: `002-operational-base-data` | **Gerado em**: 2026-06-30
**Escopo**: US4 (Compradores) + US5 (Veículos) — exclusivamente Fase 2B
**Artefatos analisados**:
- `.specify/memory/constitution.md` (v1.0.0)
- `specs/002-operational-base-data/spec.md`
- `specs/002-operational-base-data/plan.md`
- `specs/002-operational-base-data/tasks.md`
- `specs/002-operational-base-data/data-model.md`
- `specs/002-operational-base-data/contracts/rest-api.md`

---

## Tabela de Achados

| ID | Categoria | Severidade | Localização | Resumo | Status |
|----|-----------|------------|-------------|--------|--------|
| I1 | Inconsistência | **HIGH** | `contracts/rest-api.md` §7 Vehicles (GET response) | GET /vehicles devolvia array bare `[...]` em vez do envelope paginado `{data, total, page, limit}` definido no preâmbulo e usado por todos os outros endpoints. | ✅ **CORRIGIDO** — resposta ajustada para envelope `{data, total, page, limit}` em contracts/rest-api.md §7. |
| C1 | Gap de Cobertura | **MEDIUM** | `tasks.md` T040 (buyers integration test) | T040 não especificava o cenário "usuário sem permissão BUYERS recebe 403". T047 (vehicles) incluía. Inconsistência entre módulos. | ✅ **CORRIGIDO** — cenário "user without BUYERS permission returns 403" adicionado ao T040. |
| U1 | Subespecificação | **MEDIUM** | `contracts/rest-api.md` §6 GET /buyers, §7 GET /vehicles | Tabelas de query params omitiam `page` e `limit`. Dependência exclusiva no preâmbulo criava risco de implementação incompleta. | ✅ **CORRIGIDO** — `page` e `limit` adicionados explicitamente às tabelas de GET /buyers e GET /vehicles. |
| A1 | Ambiguidade | **MEDIUM** | `tasks.md` T038; `contracts/rest-api.md` §6 PATCH /buyers/:id/link-user | `422 USER_NOT_BUYER_PROFILE` acumulava dois casos distintos: perfil errado E usuário já vinculado a Member. | ✅ **CORRIGIDO** — criado `409 USER_ALREADY_LINKED_TO_MEMBER` para "já é Member"; `422 USER_NOT_BUYER_PROFILE` reservado exclusivamente para perfil incompatível. Atualizado em T038, T040 e contrato. |
| U2 | Subespecificação | **LOW** | `contracts/rest-api.md` §7 Vehicles; `tasks.md` T045, T046, T048 | Sem endpoint GET /vehicles/:id documentado; comportamento do formulário de edição era implícito. | ✅ **CORRIGIDO** — GET /vehicles/:id adicionado ao contrato (VEHICLES:READ, 404 VEHICLE_NOT_FOUND); T045 inclui `findOne`; T046 expõe a rota; T048 inclui `getById` no serviço frontend. |

---

## Verificações Especiais (Pontos 1–13)

### 1. Tasks de compradores e veículos suficientes e independentes da Fase 2C

**APROVADO.** US4 (T037–T043) e US5 (T044–T050) são completos e autocontidos. As únicas dependências declaradas são:

- US4: nenhuma dependência backend ou frontend
- US5 backend: nenhuma dependência
- US5 frontend: US3 (Unidades de Medida — Fase 2A) para o seletor de `capacityUnit`

Nenhuma task referencia EPI types, centros de custo, rotas, estoque, triagem, vendas, financeiro, rateio, presença, entrega de EPI ou dashboard avançado.

---

### 2. Buyer.userId opcional sem reintroduzir buyerId em User, JWT ou CurrentUserDto

**APROVADO.** Verificado em todos os artefatos:

- **data-model.md**: `Buyer.userId (uuid?)` é FK em Buyer, não em User. A seção "Alterações em Models Existentes" confirma: "User — sem alterações de schema". Nenhuma coluna `buyerId` em User.
- **plan.md** (Constraints): "`buyerId` no JWT/token e `CurrentUserDto` permanecem fora do escopo desta fase — portal completo do comprador fica para fase futura."
- **contracts/rest-api.md** (intro): "Fora do escopo desta fase: `buyerId` no JWT/token, portal completo do comprador."
- **tasks.md**: T038 e T039 não referenciam `buyerId` em User, JWT ou CurrentUserDto.

---

### 3. Login BUYER continua apenas com redirect/stub sem portal completo

**APROVADO.** Confirmado em:

- **spec.md** (Assumptions): "O portal do comprador (rota `/portal`) continua exibindo o placeholder já existente; nenhuma tela adicional do portal é entregue nesta fase."
- **plan.md** (Fora do Escopo): "Portal completo do comprador (apenas stub/placeholder da Fase 1)."
- **tasks.md**: Nenhuma task de US4 implementa tela de portal. T042 cobre apenas BuyerListPage e BuyerFormPage (gestão interna).

---

### 4. Vehicle usa capacityValue + capacityUnitId opcional com FK para UnitOfMeasure

**APROVADO.** Consistente em todos os artefatos:

- **spec.md** FR-023a: "capacidade do veículo DEVE ser armazenada em três campos opcionais: `capacityValue`, `capacityUnitId` (FK para UnitOfMeasure ativa) e `capacityNotes`."
- **data-model.md**: `capacityValue decimal?` e `capacityUnitId uuid? FK UnitOfMeasure; obrigatório se capacityValue informado`.
- **tasks.md** T044: DTO com `capacityValue?: number`, `capacityUnitId?: UUID`, `capacityNotes?: string` + cross-field validation.
- **contracts/rest-api.md** §7 POST body: campos `capacityValue`, `capacityUnitId`, `capacityNotes` opcionais.

---

### 5. capacityValue informado sem capacityUnitId retorna erro de validação

**APROVADO.** Coberto em três camadas:

- **spec.md** FR-023b: "Se `capacityValue` for informado, `capacityUnitId` DEVE ser obrigatório; o inverso também vale."
- **tasks.md** T044: "cross-field: capacityValue and capacityUnitId both present or both absent." T045: "capacity pair validation (400 CAPACITY_UNIT_REQUIRED_WITH_VALUE)." T047: "capacityValue without capacityUnitId returns 400."
- **contracts/rest-api.md** §7 POST errors: `400 CAPACITY_UNIT_REQUIRED_WITH_VALUE`.

---

### 6. Apenas unidades ativas podem ser usadas em novos veículos

**APROVADO.** Coberto explicitamente:

- **spec.md** FR-023c: "Apenas unidades de medida ativas DEVEM estar disponíveis para seleção na capacidade do veículo."
- **data-model.md**: "Unidade inativa não pode ser selecionada em novos cadastros de Vehicle."
- **tasks.md** T045: "active unit check on capacityUnitId (400 UNIT_INACTIVE)." T047: "inactive unit as capacityUnitId on new vehicle returns 400."
- **contracts/rest-api.md** §7 POST errors: `400 UNIT_INACTIVE`.
- **tasks.md** T049: "unit dropdown populated from units API ?status=active" no frontend.

Preservação histórica também coberta: T045 "existing vehicles preserve FK if unit later inactivated."

---

### 7. MANAGER tem CRUD em compradores e veículos

**APROVADO.**

- **spec.md** FR-033b: "O perfil MANAGER DEVE ter permissão CRUD (criar, editar, listar, inativar) nos módulos operacionais: cooperados, compradores e veículos."
- **contracts/rest-api.md** tabela de permissões: BUYERS — MANAGER: MANAGE; VEHICLES — MANAGER: MANAGE.
- **tasks.md** T040: "MANAGER creates buyer (201)." T047: "MANAGER creates vehicle (201)."

---

### 8. ADMIN tem CRUD completo

**APROVADO.**

- **spec.md** FR-033a: "O perfil ADMIN DEVE ter permissão CRUD completa em todos os módulos da Fase 2."
- **contracts/rest-api.md** tabela de permissões: BUYERS — ADMIN: MANAGE; VEHICLES — ADMIN: MANAGE.
- Não há restrições ao ADMIN em nenhum artefato.

---

### 9. Usuários sem permissão recebem 403

**PARCIALMENTE APROVADO** (ver achado C1).

- **spec.md** FR-033: "tentativas sem permissão DEVEM retornar 403."
- **contracts/rest-api.md** §7 context: implícito por RBAC.
- **tasks.md** T047: "user without permission returns 403" ✅ (vehicles).
- **tasks.md** T040: **não especifica explicitamente** o cenário 403 para buyers (achado C1). T040 apenas testa MANAGER (201), que é permissão suficiente. Falta cenário negativo explícito.

---

### 10. Listagens têm page, limit, search e status

**APROVADO COM RESSALVA** (ver achado U1).

- **plan.md** (Constraints): "Paginação simples server-side com parâmetros `page`, `limit`, `search` e `status` (default: `status=active`)."
- **contracts/rest-api.md** preâmbulo: define explicitamente os quatro parâmetros com defaults.
- **tasks.md** T038: "list with page/limit/search (legalName, documentNumber, phone, email)/status." T045: "list with page/limit/search (plate, model, type)/status."
- **Ressalva**: as tabelas de query params de GET /buyers e GET /vehicles não listam `page` e `limit` explicitamente (achado U1).

---

### 11. Inativação lógica prevista

**APROVADO.**

- **spec.md** FR-021, FR-025, FR-035: inativação lógica; deleção física proibida.
- **data-model.md**: campo `isActive boolean default true` em Buyer e Vehicle; State transitions documentadas.
- **tasks.md** nota: "Nunca usar deleção física — todo service.remove() deve usar `update({ isActive: false })`." T040: "inactivation removes from ?status=active list." T047: "inactivated vehicle hidden from ?status=active list."

---

### 12. AuditInterceptor será aplicado nos controllers mutáveis

**APROVADO.**

- **spec.md** FR-034: "O AuditInterceptor DEVE ser aplicado por controller em todos os módulos mutáveis da fase."
- **tasks.md** T039: "`@AuditEntity('buyer'), @UseInterceptors(AuditInterceptor)`" em buyers.controller.ts.
- **tasks.md** T046: "`@AuditEntity('vehicle'), @UseInterceptors(AuditInterceptor)`" em vehicles.controller.ts.
- **tasks.md** T040: "previousState non-null on PATCH" (buyers). T047: "previousState non-null on PATCH" (vehicles).

---

### 13. Sem violação da Constitution

**APROVADO.**

Verificação dos princípios relevantes à Fase 2B:

| Princípio | Status P2B | Evidência |
|-----------|------------|-----------|
| I. Spec-Driven | ✅ | Spec aprovada; tarefas rastreadas por FR e US |
| II. Fluxo Operacional | ✅ | Nomeação em vocabulário da cooperativa (Buyer, Vehicle) |
| III. Rastreabilidade e Auditoria | ✅ | AuditInterceptor em T039 e T046; previousState testado |
| IX. Portal Restrito do Comprador | ✅ | Buyer.userId opcional implementado; portal completo adiado explicitamente |
| XI. Permissões no Backend (NÃO NEGOCIÁVEL) | ✅ | RBAC via RequirePermission em ambos os controllers; FR-033 |
| XXIII. Testes Obrigatórios (NÃO NEGOCIÁVEL) | ✅ | T040 e T047 com testes de integração; gap menor em T040 (C1) não configura violação |
| XXIV. Consistência e Segurança | ✅ | Inativação lógica; validação CPF/CNPJ; FK preservadas |

---

## Tabela de Cobertura de Requisitos (Fase 2B)

| Requisito | Tem Task? | Task IDs | Notas |
|-----------|-----------|----------|-------|
| FR-018 (criar Buyer) | ✅ | T037, T038, T039 | |
| FR-019 (unicidade documento Buyer) | ✅ | T038, T040 | 409 BUYER_DOCUMENT_CONFLICT |
| FR-020 (userId opcional em Buyer) | ✅ | T037, T038, T039, T042 | link-user endpoint |
| FR-021 (inativar Buyer) | ✅ | T038, T040, T042 | |
| FR-022 (Buyer inativo fora de seletores) | ✅ | T038, T040 | ?status=active |
| FR-023 (criar Vehicle) | ✅ | T044, T045, T046 | |
| FR-023a (capacityValue + capacityUnitId + capacityNotes) | ✅ | T044 | |
| FR-023b (par obrigatório ou ambos ausentes) | ✅ | T044, T045, T047 | |
| FR-023c (apenas unidades ativas; preservação histórica) | ✅ | T045, T047, T049 | |
| FR-023d (capacidade apenas informativa) | ✅ | plano + T045 | sem cálculos |
| FR-024 (unicidade placa) | ✅ | T045, T047 | 409 VEHICLE_PLATE_CONFLICT |
| FR-025 (inativar Vehicle) | ✅ | T045, T047, T049 | |
| FR-026 (Vehicle inativo fora de seletores) | ✅ | T047 | ?status=active |
| FR-033 (403 sem permissão) | ⚠️ | T047 (OK); T040 (gap) | Ver achado C1 |
| FR-033a (ADMIN CRUD completo) | ✅ | T039, T046 | |
| FR-033b (MANAGER CRUD buyers+vehicles) | ✅ | T040, T047 | |
| FR-034 (AuditInterceptor) | ✅ | T039, T040, T046, T047 | |
| FR-035 (sem deleção física) | ✅ | tasks.md nota global | |
| FR-036–FR-044 (frontend listings/search/status) | ✅ | T041–T043, T048–T050 | |

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Requisitos cobertos (FR-018 a FR-026 + transversais de P2B) | 17 de 17 requisitos P2B |
| Cobertura funcional | ~100% (1 gap menor de teste) |
| Tasks P2B (US4 + US5) | 14 tasks (T037–T050) |
| Achados CRITICAL | 0 |
| Achados HIGH | 1 (I1) |
| Achados MEDIUM | 3 (C1, U1, A1) |
| Achados LOW | 1 (U2) |
| Violações de Constitution | 0 |

---

## Próximas Ações

### Antes de `/speckit-implement` para Fase 2B:

1. **[REQUERIDO — HIGH]** Corrigir o contrato de GET /api/v1/vehicles para retornar envelope `{data, total, page, limit}` em vez de array bare. Ajustar o exemplo de resposta no contracts/rest-api.md §7.

2. **[RECOMENDADO — MEDIUM]** Adicionar cenário "user without BUYERS permission returns 403" na especificação de T040 (buyers integration test) para paridade com T047.

3. **[RECOMENDADO — MEDIUM]** Completar as tabelas de query params de GET /buyers e GET /vehicles com `page` e `limit` no contracts/rest-api.md.

4. **[OPCIONAL — MEDIUM]** Separar o erro de T038/contrato link-user de buyers em dois códigos distintos: `422 USER_NOT_BUYER_PROFILE` (perfil errado) e `409 USER_ALREADY_MEMBER` (já vinculado como cooperado).

5. **[OPCIONAL — LOW]** Documentar em T049 ou no contrato que o frontend de edição de veículos carrega dados da listagem (sem GET /:id).

---

## Veredicto Final

> **APROVADO** *(todos os achados corrigidos em 2026-06-30)*

A especificação da Fase 2B está sólida, consistente e pronta para implementação:

- Buyer.userId opcional **não** reintroduz buyerId em User, JWT ou CurrentUserDto ✅
- Login BUYER mantém redirect/stub sem portal completo ✅
- Vehicle usa capacityValue + capacityUnitId com validação cruzada ✅
- Apenas unidades ativas em novos veículos ✅
- MANAGER tem CRUD em compradores e veículos ✅
- ADMIN tem CRUD completo ✅
- AuditInterceptor em ambos os controllers ✅
- Inativação lógica exclusiva ✅
- Nenhuma violação da Constitution ✅
- Tasks independentes de Fase 2C ✅
- GET /vehicles usa envelope `{data, total, page, limit}` ✅ *(I1 corrigido)*
- GET /buyers e GET /vehicles documentam page, limit, search e status ✅ *(U1 corrigido)*
- T040 cobre 403 sem permissão BUYERS ✅ *(C1 corrigido)*
- Códigos de erro de link-user de buyers são distintos e sem ambiguidade ✅ *(A1 corrigido)*
- GET /vehicles/:id documentado no contrato e coberto em T045/T046/T048 ✅ *(U2 corrigido)*
