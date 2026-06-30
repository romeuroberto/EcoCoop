# Relatório de Análise — Fase 2C: Tipos de EPI, Centros de Custo e Polish Final

**Feature**: `002-operational-base-data` | **Data**: 2026-06-30 | **Remediações aplicadas**: 2026-06-30
**Escopo**: US6 — Tipos de EPI | US7 — Centros de Custo | Phase 10 — Polish Final
**Artefatos analisados**:
- `.specify/memory/constitution.md` (v1.0.0)
- `specs/002-operational-base-data/spec.md`
- `specs/002-operational-base-data/plan.md`
- `specs/002-operational-base-data/tasks.md`
- `specs/002-operational-base-data/data-model.md`
- `specs/002-operational-base-data/contracts/rest-api.md`

---

## Checklist de Verificação Obrigatória

| # | Verificação | Status | Evidência |
|---|---|---|---|
| 1 | Tasks restantes correspondem apenas a Tipos de EPI, Centros de Custo e Polish | ✅ | T051–T057 (US6), T058–T064 (US7), T065–T070 (Polish). Nenhuma task fora desse escopo está pendente. |
| 2 | EpiType é apenas cadastro de tipo, sem entrega de EPI | ✅ | data-model.md: `{id, name, defaultValidityDays?, isActive}` sem campos de entrega. Plan.md exclui explicitamente "Entrega e controle de EPI". Contracts §8: apenas GET list + POST + PATCH. |
| 3 | CostCenter é apenas cadastro básico, sem lançamentos financeiros | ✅ | data-model.md: `{id, name, code?, description?, isActive}` sem campos financeiros. Plan.md exclui "Financeiro completo e rateio". Tasks T059 goal: "Nenhum lançamento financeiro implementado". |
| 4 | ADMIN tem CRUD completo em EpiTypes e CostCenters | ✅ | contracts/rest-api.md tabela de permissões: ADMIN = MANAGE para EPI_TYPES e COST_CENTERS. FR-033a confirma. T054: "ADMIN create returns 201". T061: "ADMIN create returns 201". |
| 5 | MANAGER tem apenas READ em Tipos de EPI e Centros de Custo | ✅ | contracts/rest-api.md: MANAGER = READ para EPI_TYPES e COST_CENTERS. FR-033b confirma. T054: "MANAGER create returns 403". T061: "MANAGER create returns 403". |
| 6 | Usuários sem permissão recebem 403 | ✅ | FR-033: "tentativas sem permissão DEVEM retornar 403". SC-003: "100% dos endpoints mutáveis". T054 e T061 testam explicitamente. |
| 7 | Listagens têm page, limit, search e status | ⚠️ | Previsto em plan.md, tasks.md (T052, T059) e no cabeçalho global de rest-api.md. Porém as tabelas de query em §8 (EPI Types) e §9 (Cost Centers) são abreviadas e omitem `page` e `limit`. (ver F1) |
| 8 | Inativação lógica está prevista | ✅ | FR-035, data-model.md campo `isActive`, DTOs T051/T058 com `isActive?`, testes T054/T061 verificam ausência do registro inativado em `?status=active`. |
| 9 | Duplicidades são bloqueadas | ✅ | EpiType: T052 → 409 EPI_TYPE_NAME_CONFLICT. CostCenter: T059 → 409 COST_CENTER_NAME_CONFLICT e 409 COST_CENTER_CODE_CONFLICT (case-insensitive). Contracts §8/§9 confirmam. |
| 10 | Updates geram AuditLog com previousState e newState | ✅ | T053: `@AuditEntity('epiType'), @UseInterceptors(AuditInterceptor)`. T060: `@AuditEntity('costCenter'), @UseInterceptors(AuditInterceptor)`. T054/T061: "previousState non-null on PATCH". |
| 11 | Frontend cria telas CRUD simples e responsivas | ✅ | FR-036. T056: EpiTypeListPage + EpiTypeFormPage. T063: CostCenterListPage + CostCenterFormPage. Constitution XX: "interface DEVE ser simples, responsiva". |
| 12 | Não há violação da constitution | ✅ | Ver seção "Alinhamento com a Constitution" abaixo. Nenhuma violação identificada. |
| 13 | Não há dependência obrigatória de fases futuras | ✅ | data-model.md: EpiType e CostCenter marcados como "(standalone)". Tabela de dependências tasks.md: US6 e US7 dependem apenas da "Phase 2 (Foundational)" — nenhuma dependência de fase futura. |
| 14 | Polish final não adiciona funcionalidades fora da Fase 2 | ✅ | T065: componente PaginatedList compartilhado (infraestrutura UI). T066: auditoria do sidebar (permissões). T067: interceptor 403 (UX). T068–T070: execução de testes e validação do quickstart. |

---

## Tabela de Achados

| ID | Categoria | Severidade | Localização | Resumo | Recomendação |
|----|-----------|------------|-------------|--------|--------------|
| F1 | Inconsistência | HIGH | spec.md:L326–327 vs plan.md (Constraints) | spec.md Assumptions afirma "Não haverá paginação do lado do servidor nesta fase". plan.md Constraints diz explicitamente o oposto: "Paginação simples server-side com parâmetros `page`, `limit`, `search` e `status`". Todas as tasks (T052, T059, etc.) implementam paginação server-side. A assumption do spec está desatualizada. | Remover ou corrigir a frase na seção Assumptions do spec.md para refletir a decisão tomada no plan.md. A implementação com paginação server-side está correta — a documentação é que está inconsistente. |
| F2 | Underspecificação | MEDIUM | contracts/rest-api.md §8, §9 | As tabelas de query parameters nos endpoints GET de EPI Types (§8) e Cost Centers (§9) omitem `page` e `limit`. Os demais módulos (§1–§7) apresentam tabelas completas com todos os 4 parâmetros. A omissão cria ambiguidade no contrato. | Adicionar linhas `page` e `limit` nas tabelas de query de §8 e §9 para consistência com os demais módulos. |
| F3 | Gap de Cobertura | LOW | contracts/rest-api.md §8, §9 | Nenhum endpoint `GET /epi-types/:id` ou `GET /cost-centers/:id` está definido nos contratos, ao contrário de Members (§2), Buyers (§6) e Vehicles (§7) que têm GET /:id explícito. O frontend de edição normalmente requer GET /:id para pré-popular o formulário. | Ou (a) adicionar GET /:id em §8 e §9, ou (b) documentar explicitamente que os formulários de edição usam dados pré-carregados do cache da listagem. Tasks T056 e T063 não mencionam como o form de edição é pré-preenchido. |
| F4 | Gap de Cobertura de Teste | LOW | tasks.md T054, T061 | Os testes de integração confirmam que MANAGER recebe 403 ao criar (mutação bloqueada), mas nenhum caso de teste verifica explicitamente que MANAGER consegue LISTAR (GET retorna 200) EpiTypes e CostCenters. A permissão READ para MANAGER deve ser confirmada por teste. | Adicionar a T054: "MANAGER list returns 200 with data array". Adicionar a T061: "MANAGER list returns 200 with data array". |

---

## Cobertura de Requisitos (Fase 2C)

| Requisito | Task(s) | Status |
|---|---|---|
| FR-027 (criar EpiType com nome e validade) | T051, T052, T053 | ✅ Coberto |
| FR-028 (unicidade nome EpiType) | T052, T054 | ✅ Coberto |
| FR-029 (inativar EpiType) | T052, T054, T056 | ✅ Coberto |
| FR-030 (criar CostCenter com nome, código, descrição) | T058, T059, T060 | ✅ Coberto |
| FR-031 (unicidade código CostCenter) | T059, T061 | ✅ Coberto |
| FR-032 (inativar CostCenter) | T059, T061, T063 | ✅ Coberto |
| FR-033 (403 para sem permissão) | T054, T061 | ✅ Coberto |
| FR-033a (ADMIN CRUD completo) | T053, T054, T060, T061 | ✅ Coberto |
| FR-033b (MANAGER READ em EPI_TYPES e COST_CENTERS) | T054, T061 | ⚠️ Parcial (403 testado, 200 não) |
| FR-034 (AuditInterceptor + previousState) | T053, T054, T060, T061 | ✅ Coberto |
| FR-035 (sem deleção física) | T052, T059 (isActive update) | ✅ Coberto |
| FR-036 (telas CRUD responsivas) | T056, T063 | ✅ Coberto |
| FR-037 (menus por permissão) | T057, T064, T066 | ✅ Coberto |
| FR-038 (mensagens de erro claras) | T056, T063, T067 | ✅ Coberto |
| FR-039/40/41/42/43 (busca, filtro, status, case-insensitive) | T052, T059, T056, T063, T065 | ✅ Coberto |
| SC-003 (100% 403 em endpoints mutáveis) | T054, T061 | ⚠️ Parcial — ver F4 |
| SC-004 (previousState não-nulo em 100% dos updates) | T054, T061 | ✅ Coberto |
| US6 Cenário 1 (criar tipo com validade padrão) | T051, T052, T056 | ✅ Coberto |
| US6 Cenário 2 (nome duplicado → rejeita 409) | T052, T054 | ✅ Coberto |
| US6 Cenário 3 (inativar → ausente da listagem ativa) | T052, T054, T056 | ✅ Coberto |
| US7 Cenário 1 (criar centro de custo) | T058, T059, T063 | ✅ Coberto |
| US7 Cenário 2 (código duplicado → rejeita 409) | T059, T061 | ✅ Coberto |
| US7 Cenário 3 (inativar → ausente da listagem) | T059, T061, T063 | ✅ Coberto |

**Métricas de Cobertura**:
- Requisitos funcionais Fase 2C com ≥1 task: **23/25 (92%)**
- Requisitos parcialmente cobertos: **2** (FR-033b e SC-003 — mesmo achado F4)
- Requisitos sem cobertura: **0**
- Issues críticos: **0**
- Issues HIGH: **1** (F1 — inconsistência de documentação, não funcional)
- Issues MEDIUM: **1** (F2 — tabelas de contrato abreviadas)
- Issues LOW: **2** (F3, F4 — gaps de contrato e teste)

---

## Alinhamento com a Constitution

| Princípio | Verificação Fase 2C | Status |
|---|---|---|
| I. Spec-Driven | spec.md com US6/US7 aprovados, plan.md e tasks.md completos | ✅ |
| II. Fluxo Operacional | EpiType e CostCenter são entidades de cadastro operacional do domínio da cooperativa | ✅ |
| III. Auditoria Imutável | AuditInterceptor em T053/T060; previousState não-nulo testado em T054/T061 | ✅ |
| IV. Imutabilidade Estoque | Nenhum StockEvent nesta fase | N/A |
| VI. Financeiro Auditável | CostCenter é apenas cadastro de referência; sem lançamentos financeiros nesta fase | ✅ |
| VIII. Instância Dedicada | Sem multi-tenancy | ✅ |
| XI. Permissões no Backend | RBAC guards em todos os controllers (T053, T060); 403 testado | ✅ |
| XV. Emissão de Documentos | EpiType prevê campo `defaultValidityDays` que suporta futuros termos de EPI | ✅ |
| XVIII. Fluxo de Caixa Completo | CostCenter é prerequisito do módulo financeiro futuro; não substitui o fluxo completo | ✅ |
| XX. Interface Simples e Responsiva | Telas CRUD simples (T056/T063), componente shared (T065), mensagens de erro claras | ✅ |
| XXI. Stack Definida | NestJS + TypeScript + React — sem novas dependências de produção | ✅ |
| XXIII. Testes Obrigatórios | Permissões e audit log cobertos por testes de integração (T054, T061) | ✅ |
| XXIV. Consistência/Segurança | Inativação lógica; sem deleção física; validações no backend | ✅ |

**Resultado Constitution Check**: Nenhuma violação identificada.

---

## Análise do Polish Final (Phase 10)

| Task | Descrição | Avaliação |
|---|---|---|
| T065 | Componente `PaginatedList.tsx` compartilhado | ✅ Infraestrutura UI, não é nova funcionalidade |
| T066 | Auditoria do sidebar (permissões MANAGER vs ADMIN) | ✅ Correto — verifica comportamento existente |
| T067 | Interceptor HTTP 403 com toast "Sem permissão" | ✅ UX/polimento, não é nova funcionalidade |
| T068 | Execução de todos os testes backend (`jest --runInBand`) | ✅ Validação, não implementação |
| T069 | Frontend typecheck (`tsc --noEmit`) | ✅ Validação, não implementação |
| T070 | Execução dos cenários do quickstart.md | ✅ Validação end-to-end, não implementação |

Polish final é **estritamente dentro do escopo**: infraestrutura de UI compartilhada, verificação de permissões e validação por testes. Nenhuma funcionalidade nova fora da Fase 2 é adicionada.

---

## Tasks Sem Mapeamento de Requisito

Nenhuma task das Fases 8, 9 e 10 está sem mapeamento de requisito. Todas as tasks pendentes têm rastreabilidade clara para FR-027 a FR-044 e SC-003/SC-004.

---

## Próximas Ações

1. **(HIGH — antes de implementar)**: Corrigir a contradição em spec.md Assumptions (L326–327): substituir "Não haverá paginação do lado do servidor nesta fase" pela decisão real do plan.md (paginação server-side com page/limit/search/status). Esta inconsistência não bloqueia a implementação mas pode confundir quem ler o spec isoladamente.

2. **(MEDIUM — recomendado antes de finalizar)**: Expandir as tabelas de query parameters em §8 e §9 de rest-api.md para incluir `page` e `limit` explicitamente, tornando-as consistentes com §1–§7.

3. **(LOW — opcional)**: Decidir e documentar se os formulários de edição de EpiType e CostCenter usarão GET /:id (necessitando novo endpoint) ou dados do cache da listagem. Se usar cache, documentar explicitamente.

4. **(LOW — recomendado)**: Acrescentar ao T054 e T061 o caso de teste: "MANAGER GET /epi-types returns 200" e "MANAGER GET /cost-centers returns 200", para garantir cobertura completa de SC-003 (não apenas o 403, mas também o 200 para READ autorizado).

---

## Remediações Aplicadas (2026-06-30)

| ID | Status | Arquivo(s) alterado(s) | Resumo da correção |
|---|---|---|---|
| F1 | ✅ Resolvido | `spec.md` Assumptions (L326) | Substituída a premissa incorreta ("sem paginação server-side") pela regra correta: todas as listagens usam paginação server-side com envelope `{data, total, page, limit}` e parâmetros `page`, `limit`, `search`, `status`. |
| F2 | ✅ Resolvido | `contracts/rest-api.md` §8, §9 | Tabelas de query de GET /epi-types e GET /cost-centers expandidas para incluir `page` e `limit` explicitamente, no mesmo formato dos módulos §1–§7. Respostas com envelope JSON adicionadas. |
| F3 | ✅ Resolvido | `contracts/rest-api.md` §8, §9; `tasks.md` T052, T053, T059, T060 | Adicionados endpoints `GET /api/v1/epi-types/:id` e `GET /api/v1/cost-centers/:id` nos contratos (com Response 200 e 404). Services T052/T059 atualizados com `findOne`. Controllers T053/T060 atualizados para expor `GET /:id` com permissão READ. |
| F4 | ✅ Resolvido | `tasks.md` T054, T061 | Adicionados casos de teste: MANAGER GET /epi-types returns 200; MANAGER GET /epi-types/:id returns 200; MANAGER PATCH returns 403; ADMIN GET /:id returns 200; GET /:id com ID inexistente returns 404. Idem para cost-centers. |

---

## Veredicto

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║             APROVADO                                                 ║
║                                                                      ║
║  Todos os 4 achados foram remediados. A Fase 2C está pronta         ║
║  para implementação via /speckit-implement.                          ║
║                                                                      ║
║  EpiType e CostCenter são exclusivamente cadastros básicos, sem      ║
║  entrega de EPI ou lançamentos financeiros. RBAC, audit log,         ║
║  inativação lógica, paginação e duplicidades estão corretamente      ║
║  especificados e cobertos por testes. Nenhuma violação da            ║
║  constitution foi identificada.                                      ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```
