# Analyze Report — Fase 3A: Setup + Foundational + US1 (T001–T014)

**Feature**: `003-collection-routes-raw-material`
**Escopo analisado**: T001–T014 (Phase 1: Setup, Phase 2: Foundational, Phase 3: US1 — Pontos de Coleta)
**Data**: 2026-06-30
**Artefatos analisados**: constitution.md, spec.md, plan.md, tasks.md, data-model.md, contracts/rest-api.md

---

## Specification Analysis Report

| ID | Categoria | Severidade | Localização | Resumo | Recomendação |
|----|-----------|------------|-------------|--------|--------------|
| M1 | Cobertura | MEDIUM | tasks.md T014 | T014 não testa explicitamente inativação + auditoria: o cenário PATCH `isActive=false` não aparece nos cenários listados em T014. O test gap para "ponto inativado gera audit com previousState.isActive=true" só é coberto em T041 (Phase 8, fora do escopo 3A). | Adicionar explicitamente ao T014 o cenário: `PATCH isActive=false → 200 + auditoria gerada com previousState.isActive=true / newState.isActive=false`. |
| M2 | Cobertura | MEDIUM | tasks.md T014 | T014 não testa geocoding falho (mock do provider retornando null). O cenário "endereço inválido → geocoding retorna null → ponto salvo com locationPending=true" está alocado em T045 (Phase 9). Para Phase 3A ser auto-suficiente, T014 deveria cobrir esse edge case essencial da US1. | Mover o cenário de mock de falha de geocoding de T045 para T014, garantindo que Phase 3A valide o comportamento end-to-end sem depender de Phase 9. |
| L1 | Inconsistência | LOW | spec.md (narrativa) vs data-model.md + rest-api.md | "CONCLUÍDA" (com acento) é usada na narrativa do spec.md, enquanto o enum Prisma e os exemplos JSON usam "CONCLUIDA" (sem acento). | Não representa risco de implementação (enums Prisma não aceitam acento), mas pode causar confusão ao copiar do spec. Adicionar nota em spec.md: "O valor do enum é `CONCLUIDA` (sem acento, conforme padrão Prisma)." |
| L2 | Underspecificação | LOW | tasks.md T008 | T008 diz "de forma não bloqueante após salvar" mas não especifica o mecanismo de assincronismo (Promise.then sem await, EventEmitter, queue, etc.). | Aceitável para implementação; o implementador pode decidir. Sugestão: adicionar `Promise.then().catch()` como mecanismo padrão na descrição de T008 para evitar ambiguidade. |
| L3 | Cobertura | LOW | tasks.md T014 | T014 cobre "GET lista com search e status filtros" mas não menciona explicitamente o filtro `locationPending=true` para listagem de pendentes. O parâmetro está definido em T010 e rest-api.md, mas os testes de T014 não o referenciam. | Adicionar cenário: `GET ?locationPending=true → retorna somente pontos com locationPending=true`. |

---

## Respostas às Verificações Específicas

### 1. T001–T014 são suficientes para implementar pontos de coleta de forma independente?

**CONFIRMADO.** Os tasks cobrem todos os artefatos necessários:

| Task | Entregável |
|------|-----------|
| T001 | Migration com modelo `CollectionPoint` (+ outros modelos fora do escopo 3A, por design) |
| T002 | Seed de permissões `COLLECTION_POINTS` para ADMIN/MANAGER |
| T003 | Dependências `leaflet` + `react-leaflet` para MapView |
| T004 | Interface `GeocodingProvider` + implementação `NominatimGeocodingProvider` |
| T005 | `RouteOwnershipGuard` (foundational; usado em US3, não em US1, mas listado como bloqueante) |
| T006 | `MapView.tsx` + `MapMarker.tsx` |
| T007 | Scaffold do módulo NestJS `collection-points` |
| T008 | POST /collection-points (create + geocoding assíncrono) |
| T009 | PATCH /collection-points/:id (update + geocoding + auditoria) |
| T010 | GET /collection-points + GET /collection-points/:id |
| T011 | `collectionPointsService.ts` + `collectionPointsStore.ts` (frontend) |
| T012 | `CollectionPointsPage.tsx` com tabela, mapa e badges |
| T013 | `CollectionPointFormPage.tsx` com campos manuais de coordenadas |
| T014 | Testes de integração e2e |

**Observação**: T001 cria todos os 6 modelos da Fase 3 em uma única migration (incluindo `CollectionRoute`, `RoutePoint`, etc., que são fora do escopo 3A). Isso é **por design** (uma migration incremental para toda a Fase 3) e não constitui defeito, mas significa que a execução do banco em Phase 3A criará tabelas que não serão utilizadas até fases posteriores.

---

### 2. CollectionPoint não depende obrigatoriamente de rotas?

**CONFIRMADO.** O modelo Prisma em `data-model.md`:

```prisma
model CollectionPoint {
  // ...
  routePoints RoutePoint[]   // back-relation (array), NÃO é FK
}
```

`CollectionPoint` não possui nenhum campo `NOT NULL` apontando para `CollectionRoute` ou `RoutePoint`. A relação é inversa: `RoutePoint.collectionPointId` referencia `CollectionPoint`. Um `CollectionPoint` pode existir sem nenhum `RoutePoint` associado.

US1 é marcada no spec.md como: *"Pode ser testado independentemente criando um ponto de coleta via API/UI"* ✅

---

### 3. Latitude/longitude são opcionais?

**CONFIRMADO.** Evidências convergentes em todos os artefatos:

- **data-model.md**: `latitude Decimal? @db.Decimal(10,7)` e `longitude Decimal? @db.Decimal(10,7)` (nullable) ✅
- **spec.md FR-001**: *"Latitude e longitude são opcionais no modelo de dados."* ✅
- **spec.md Clarificações**: *"Coordenadas de ponto de coleta são obrigatórias? → A: Opcionais."* ✅
- **rest-api.md POST body**: `latitude: number | não` e `longitude: number | não` ✅
- **tasks.md T013**: *"campos opcionais de coordenadas com label 'Informar coordenadas manualmente'"* ✅

---

### 4. locationPending está bem definido?

**CONFIRMADO.** Definição consistente e coerente em todos os artefatos:

| Artefato | Definição |
|----------|-----------|
| spec.md FR-002a | Geocoding falho → `locationPending=true`; falha não impede cadastro |
| spec.md FR-002c | Coordenadas válidas (manual ou geocoding) → `locationPending=false` + auditoria |
| spec.md FR-003 | `locationPending=true` → não aparece no mapa, aparece na listagem com indicação |
| spec.md Edge Case | Geocoding falho → gestor vê mensagem + pode inserir coords manualmente |
| data-model.md | `locationPending Boolean @default(true)` + regra: *"true quando lat IS NULL OR lng IS NULL"* |
| rest-api.md | Filtro `locationPending` na listagem; campo no response; behavior documentado no POST e PATCH |
| tasks.md T008 | Salva com `locationPending=true` → geocoding assíncrono; coords manuais → `locationPending=false` |
| tasks.md T009 | PATCH com coords → `locationPending=false`; address sem coords → nova tentativa async |
| tasks.md T012 | Badge "Localização pendente" para `locationPending=true` |

---

### 5. Geocoding falho não bloqueia cadastro?

**CONFIRMADO.** Quatro evidências independentes:

- **spec.md FR-002a**: *"A falha no geocoding NÃO DEVE impedir o cadastro do ponto."* ✅
- **spec.md Assumptions**: *"O sistema deve salvar o ponto mesmo se o geocoding falhar, marcando as coordenadas como pendentes."* ✅
- **plan.md Constraints**: *"Geocoding assíncrono e não bloqueante — falha salva ponto com `locationPending=true`"* ✅
- **tasks.md T008**: *"salvar ponto com `locationPending=true` → chamar `GeocodingProvider.geocode()` de forma não bloqueante após salvar"* ✅

**Ressalva (ver M2)**: O teste que valida esse comportamento está em T045 (Phase 9), não em T014. Para Phase 3A ser totalmente auto-suficiente, este edge case deveria estar em T014.

---

### 6. Usuário pode informar coordenadas manualmente?

**CONFIRMADO.** Fluxo completo definido:

- **spec.md FR-002b**: *"O gestor (ADMIN ou MANAGER) DEVE poder informar ou corrigir latitude e longitude manualmente no formulário de cadastro/edição do ponto."* ✅
- **rest-api.md POST**: campos `latitude` e `longitude` opcionais no body ✅
- **rest-api.md PATCH**: campos `latitude` e `longitude` opcionais no body de update ✅
- **tasks.md T013**: *"campos opcionais de coordenadas com label 'Informar coordenadas manualmente', preview de mapa com pin quando coords preenchidas manualmente"* ✅
- **rest-api.md POST Geocoding behavior**: *"Se `latitude`/`longitude` forem fornecidos → `locationPending=false`."* ✅

---

### 7. Pontos sem coordenadas não aparecem no mapa mas podem ser salvos?

**CONFIRMADO.** Definição clara e consistente:

- **spec.md FR-003**: *"O sistema DEVE exibir no mapa apenas pontos de coleta com latitude e longitude válidas. Pontos com `locationPending=true` não aparecem no mapa, mas ficam visíveis na listagem com indicação de 'localização pendente'."* ✅
- **tasks.md T012**: *"seção de mapa usando `MapView` exibindo pontos com `locationPending=false`; badge 'Localização pendente' em pontos com `locationPending=true`"* ✅
- **tasks.md T014**: *"criar ponto sem coords → `locationPending=true`"* (ponto é salvo normalmente) ✅

---

### 8. DRIVER recebe 403 nos endpoints de criação/edição/inativação?

**CONFIRMADO.** Múltiplas evidências convergentes:

- **spec.md FR-006**: *"O sistema DEVE impedir que DRIVER, SORTER e usuários sem permissão criem ou editem pontos de coleta (HTTP 403)."* ✅
- **spec.md US1 cenário 5**: *"Given DRIVER autenticado, When tenta criar ou editar ponto, Then recebe HTTP 403."* ✅
- **spec.md US1 cenário 6**: *"Given SORTER autenticado, When tenta acessar pontos de coleta, Then recebe HTTP 403."* ✅
- **rest-api.md tabela de permissões**: DRIVER em `COLLECTION_POINTS` → "— (sem acesso)" ✅
- **tasks.md T002**: DRIVER recebe apenas `READ em COLLECTION_ROUTES`; sem permissão em `COLLECTION_POINTS` ✅
- **tasks.md T014**: *"403 para DRIVER e SORTER em POST e PATCH"* ✅

**Inativação** (PATCH com `isActive=false`) requer `COLLECTION_POINTS:MANAGE` → DRIVER não tem → 403 ✅

---

### 9. ADMIN e MANAGER têm permissões corretas?

**CONFIRMADO.**

| Perfil | Permissão | Origem |
|--------|-----------|--------|
| ADMIN | `COLLECTION_POINTS:MANAGE` | T002 seed + rest-api.md |
| MANAGER | `COLLECTION_POINTS:MANAGE` | T002 seed + rest-api.md |

- **spec.md FR-033**: *"ADMIN DEVE ter acesso completo a todas as operações da Fase 3"* ✅
- **spec.md FR-034**: *"MANAGER DEVE poder: criar e editar pontos de coleta"* ✅
- **rest-api.md**: GET exige `COLLECTION_POINTS:READ`; POST/PATCH exigem `COLLECTION_POINTS:MANAGE` — ambos concedidos a ADMIN e MANAGER ✅

---

### 10. AuditInterceptor será aplicado nos endpoints mutáveis?

**CONFIRMADO.** O `AuditInterceptor` **já existe** no codebase em:

```
apps/backend/src/common/interceptors/audit.interceptor.ts
```

Está em uso em múltiplos controllers das fases anteriores (buyers, cooperative, material-categories, etc.), confirmando que não precisa ser criado na Fase 3A.

- **tasks.md T008**: *"retornar 201 com objeto criado; aplicar `AuditInterceptor`"* ✅
- **tasks.md T009**: *"aplicar `AuditInterceptor` com `previousState`/`newState`"* ✅
- **tasks.md T014**: *"PATCH com coords → `locationPending=false` + auditoria gerada"* (teste que valida o audit) ✅

**Endpoints mutáveis de Collection Points cobertos**:
- `POST /collection-points` → T008 aplica `AuditInterceptor` (`previousState=null`, `newState=ponto criado`)
- `PATCH /collection-points/:id` → T009 aplica `AuditInterceptor` (`previousState`, `newState`)

---

### 11. Listagem retorna envelope paginado { data, total, page, limit }?

**CONFIRMADO.** O contrato está explicitamente definido:

- **rest-api.md cabeçalho**: *"Resposta: `{ data: [...], total, page, limit }`"* ✅
- **rest-api.md GET /collection-points Response 200** (exemplo):
  ```json
  { "data": [...], "total": 12, "page": 1, "limit": 20 }
  ```
  ✅
- **tasks.md T010**: filtros `page`, `limit`, `search`, `status`, `locationPending` ✅

---

### 12. Não há violação da constitution?

**CONFIRMADO. Nenhuma violação encontrada.**

| Princípio | Status para Phase 3A | Evidência |
|-----------|---------------------|-----------|
| I. Spec-Driven Development | ✅ | spec.md completo com clarificações datadas 2026-06-30 |
| II. Fluxo Operacional como Domínio | ✅ | Módulo `collection-points` usa vocabulário da cooperativa |
| III. Rastreabilidade e Auditoria | ✅ | `AuditInterceptor` aplicado em T008/T009; já existe no codebase |
| IV. Imutabilidade do Estoque por Evento | N/A | Phase 3A não toca estoque |
| VIII. Instância Dedicada | ✅ | Sem multi-tenancy |
| X. Cooperados com Login Individual | ✅ | Perfis ADMIN/MANAGER/DRIVER validados por RBAC |
| XI. Permissões Validadas no Backend | ✅ | FR-006, FR-037; T002 seed; guards no backend |
| XIII. Mapas para Rotas de Coleta | ✅ | T003/T006 instalam e criam MapView; T012 exibe pontos no mapa — mapa tratado como funcionalidade de primeira classe |
| XX. Interface Responsiva | ✅ | T012/T013 criam telas responsivas; SC-009 (320px) |
| XXI. Stack Tecnológica Definida | ✅ | NestJS + TypeScript + React + Vite + PostgreSQL; `leaflet` adicionado via T003 |
| XXIII. Testes Obrigatórios em Áreas Críticas | ✅ | T014 cobre permissões (403 DRIVER/SORTER); área de permissões é crítica per Princípio XXIII |

---

## Coverage Summary Table

| Requisito | Coberto? | Task IDs | Observações |
|-----------|----------|----------|-------------|
| FR-001 (cadastro, campos, status) | ✅ | T001, T008, T013 | Todos os campos mapeados |
| FR-002 (geocoding automático) | ✅ | T004, T008 | GeocodingProvider abstrato |
| FR-002a (geocoding falho → locationPending=true) | ✅ | T008 | Teste em T045 (ver M2) |
| FR-002b (coords manuais) | ✅ | T008, T009, T013 | Formulário + PATCH |
| FR-002c (coords → locationPending=false + audit) | ✅ | T009, T014 | Validado em T014 |
| FR-003 (mapa só com coords válidas) | ✅ | T012 | MapView filtra locationPending |
| FR-003a (ponto sem coords em rota com aviso) | N/A | — | Escopo US2, fora de Phase 3A |
| FR-004 (busca, filtro, paginação) | ✅ | T010, T012, T014 | |
| FR-005 (inativação lógica) | ✅ | T009 (isActive) | Ver M1: teste de audit de inativação |
| FR-006 (DRIVER/SORTER → 403) | ✅ | T002, T008, T009, T014 | |
| SC-001 (criar ponto < 2min) | Parcial | T008–T013 | Sem performance test em Phase 3A |
| SC-006 (403 sem vazar info) | ✅ | T014 | |
| SC-007 (100% mutáveis com audit) | Parcial | T008, T009, T014 | Inativação não testada em T014 (ver M1) |
| SC-009 (responsivo 320px) | ✅ | T012, T013 | |
| SC-010 (fluxos ≤ 3 passos) | ✅ | T013 | Design do formulário |

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Requisitos analisados (scope 3A) | 10 FRs + 5 SCs |
| Tasks analisadas | 14 (T001–T014) |
| Cobertura de requisitos com ≥ 1 task | 100% |
| Violações da Constituição | 0 |
| Findings CRITICAL | 0 |
| Findings HIGH | 0 |
| Findings MEDIUM | 2 (M1, M2) |
| Findings LOW | 3 (L1, L2, L3) |

---

## Respostas Consolidadas às 12 Verificações

| # | Verificação | Resultado |
|---|-------------|-----------|
| 1 | T001–T014 suficientes para implementar pontos de coleta independentemente? | ✅ SIM |
| 2 | CollectionPoint não depende obrigatoriamente de rotas? | ✅ CONFIRMADO |
| 3 | Latitude/longitude são opcionais? | ✅ CONFIRMADO |
| 4 | locationPending está bem definido? | ✅ CONFIRMADO |
| 5 | Geocoding falho não bloqueia cadastro? | ✅ CONFIRMADO |
| 6 | Usuário pode informar coordenadas manualmente? | ✅ CONFIRMADO |
| 7 | Pontos sem coordenadas não aparecem no mapa mas podem ser salvos? | ✅ CONFIRMADO |
| 8 | DRIVER recebe 403 em criação/edição/inativação? | ✅ CONFIRMADO |
| 9 | ADMIN e MANAGER têm permissões corretas? | ✅ CONFIRMADO |
| 10 | AuditInterceptor aplicado nos endpoints mutáveis? | ✅ CONFIRMADO (já existe no codebase) |
| 11 | Listagem retorna `{ data, total, page, limit }`? | ✅ CONFIRMADO |
| 12 | Não há violação da constitution? | ✅ CONFIRMADO — nenhuma violação |

---

## Próximas Ações

**Antes de executar `/speckit-implement`:**

1. **[M1] Adicionar ao T014**: cenário de inativação + audit — `PATCH { isActive: false } → 200 + AuditLog com previousState.isActive=true / newState.isActive=false`.

2. **[M2] Adicionar ao T014**: cenário de geocoding falho com mock — mock de `GeocodingProvider.geocode()` retornando `null` → ponto salvo com `locationPending=true`. Não esperar T045.

3. **[L3] Adicionar ao T014**: cenário de filtro `?locationPending=true` → retorna apenas pontos com locationPending=true.

4. **[L1] Observação de implementação**: O enum Prisma usa `CONCLUIDA` (sem acento). Ao ler spec.md, não usar "CONCLUÍDA" no código.

**Pode prosseguir para implementação** com as ressalvas M1 e M2 incorporadas ao T014 antes de iniciar (ou resolvidas durante a execução de T014).

---

## Veredicto Final

> ## APROVADO COM RESSALVAS
>
> A Fase 3A (T001–T014) está internamente consistente, os artefatos estão alinhados entre si e com a Constituição, e os 14 tasks são suficientes para implementar CollectionPoint de forma independente. Nenhuma violação de princípio constitucional foi identificada. As ressalvas são de baixa/média criticidade e podem ser incorporadas durante a execução de T014 sem bloquear o início da implementação.
>
> **Ressalvas obrigatórias antes do merge:**
> - M1: Adicionar teste de inativação + audit em T014
> - M2: Adicionar teste de geocoding falho (mock) em T014
