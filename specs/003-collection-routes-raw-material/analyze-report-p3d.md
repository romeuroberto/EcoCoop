# Relatório de Análise — Fase 3D: Entrada de Material Bruto (T030–T036 / US4)

**Gerado em**: 2026-06-30  
**Escopo**: T030–T036, US4 — Registrar Entrada Manual de Material Bruto  
**Artefatos analisados**: constitution.md, spec.md, plan.md, tasks.md, data-model.md, contracts/rest-api.md, código Fases 3A/3B/3C  
**Status geral**: **APROVADO COM RESSALVAS**

---

## 0. Estado da Fase 3C (contexto pré-análise)

Antes de analisar US4, verificou-se que a **Fase 3C está integralmente implementada** e todas as ressalvas do relatório anterior foram resolvidas:

| Ressalva (analyze-report-p3c) | Resolução encontrada |
|-------------------------------|----------------------|
| H1 — DRIVER sem permissão `EXECUTE` | `@RequirePermission('COLLECTION_ROUTES', 'EXECUTE')` nos endpoints start/complete; seed upserts `EXECUTE` in `beforeAll` do teste |
| H2 — AuditInterceptor POST→CREATE sem previousState | Decorador `@AuditAsUpdate()` criado em `audit-entity.decorator.ts`; interceptor usa `reflector.getAllAndOverride(AUDIT_ACTION_KEY, [handler, class])` antes do fallback por método HTTP; start/complete/cancel decorados com `@AuditAsUpdate()` |
| M1 — cancelReason sem campo no modelo | `cancelReason` persistido via `$executeRaw`; campo verificado em teste com query raw; retornado na resposta |
| M2 — CANCELADA→complete não testado | Teste "complete em rota CANCELADA → 409 INVALID_ROUTE_TRANSITION" presente em `collection-route-execution.spec.ts` |
| M3 — SORTER não testado em T029 | Teste "SORTER tentando start/complete/cancel → 403" presente |

---

## 1. Tabela de Findings

| ID | Categoria | Severidade | Localização | Resumo | Recomendação |
|----|-----------|------------|-------------|--------|--------------|
| H1 | Inconsistência | HIGH | tasks.md T033 × tasks.md T035 × contracts/rest-api.md | O GET de listagem de entradas retorna apenas `stockEventId` (ID simples) e o GET de detalhe retorna `stockEvent: { id, type, quantity, createdAt }` — nenhum inclui status de reversal. T035 exige exibir badge "Estornado" por linha, mas o frontend não tem como saber se a entrada foi estornada sem campo `isReversed` / `reversalEvent` na resposta. | Atualizar T033 para incluir, na resposta do GET (lista e detalhe), o campo `isReversed: boolean` (ou `reversalStockEventId: string | null`), calculado com `include: { stockEvent: { include: { reversals: { select: { id: true } } } } }`. Atualizar contrato rest-api.md para refletir o campo. |
| H2 | Inconsistência | HIGH | tasks.md T031 × common/guards/route-ownership.guard.ts × tasks.md T036 | T031 descreve "validar...+ ownership DRIVER" no service, mas não especifica se deve usar `RouteOwnershipGuard` (já disponível e testado) ou lógica inline duplicada. O guard já lê `request.params?.routeId` para o controlador de material-entries; se não for aplicado, T036 testará a path sem guard ativo, e o ownership passará a ser responsabilidade exclusiva do service — diferente do padrão arquitetural das Fases 3A/3B/3C. | Especificar explicitamente em T031 que o controller `RawMaterialEntriesController` DEVE aplicar `@UseGuards(RouteOwnershipGuard)` em todos os endpoints mutáveis (POST entry, POST reversal). O service valida o status da rota; o guard valida ownership. Detalhar em T033 que GETs também aplicam o guard para DRIVER. |
| M1 | Coverage gap | MEDIUM | tasks.md T036 | T036 não testa o cenário de DRIVER criando entrada em rota **CONCLUIDA** própria. Testa "DRIVER em rota própria EM_ANDAMENTO → 201" mas não "DRIVER em rota própria CONCLUIDA → 201", embora FR-035b garanta explicitamente esse direito e o spec.md tenha clarificado esse ponto como escopo obrigatório. | Adicionar cenário em T036: `POST /material-entries` com DRIVER autenticado, rota `CONCLUIDA` da qual é o `driverId` → 201. |
| M2 | Underspecification | MEDIUM | tasks.md T032 × data-model.md RawMaterialStockEvent | T032 verifica "não tem estorno ainda" com check service-level (sem locking adicional). Duas requisições simultâneas de reversal para a mesma entrada podem ambas passar a verificação, criar dois `ESTORNO_BRUTO` e deixar saldo negativo. O data-model não tem `UNIQUE` constraint em `referencedEventId` (campo nullable). T036 testa "estorno duplicado → 409" mas não testa concorrência. | Opção A (recomendada): Adicionar `@@unique([referencedEventId])` em `RawMaterialStockEvent` no data-model para impor unicidade a nível de banco (resolvendo a race sem locking explícito). Verificar impacto em estornos com `referencedEventId = NULL` (PostgreSQL trata NULL como distinto em UNIQUE). Opção B: Envolver a verificação de "não tem estorno + criar evento" em `$transaction` com `isolationLevel: Serializable`. |
| M3 | Inconsistência | MEDIUM | audit.interceptor.ts × tasks.md T031/T032 | Para o endpoint `POST .../:id/reversal`, o `AuditInterceptor` com `@AuditEntity('rawMaterialEntry')` class-level registra: `entityType='rawMaterialEntry'`, `entityId=entryId`, `action=CREATE`, `previousState=null` (POST→CREATE ignora fetch), `newState=<ESTORNO_BRUTO event>`. Resultado: previousState e newState são de tipos distintos. SC-007 exige `previousState` e `newState` para operações mutáveis. | T032 deve adicionar `@AuditAsUpdate()` ao handler do reversal (mesmo padrão de `cancelRoute`) E o endpoint deve retornar o `RawMaterialEntry` atualizado (com `isReversed=true`/`reversalStockEvent`) em vez do stock event bruto. Assim: `previousState` = entry antes da reversão (imutável, mas captura snapshot), `newState` = entry com reversão associada, `action` = UPDATE. Alternativamente, documentar que o ESTORNO_BRUTO event em si é o registro de auditoria primário (imutável, com justificativa, userId, timestamp, referencedEventId) e aceitar `previousState=null` como compliant para "criação de evento compensatório". |
| L1 | Underspecification | LOW | tasks.md T032 | T032 realiza balance check inline (`SUM(quantity) FROM RawMaterialStockEvent WHERE subcategoryId + unitId`) para validar que o estorno não deixa saldo negativo. A mesma query será reimplementada em T037 (US5 — RawMaterialBalanceService). Não há nota sobre reuso ou extração de utilidade compartilhada. | Adicionar nota em T032 (e T037) documentando a duplicação intencional: T032 usa query inline para garantir atomicidade dentro da transação Prisma; T037 encapsula a mesma lógica como serviço consultável. Quando T037 estiver pronto, T032 PODE ser refatorado para delegar ao balance service dentro da mesma transação. Sem urgência imediata. |
| L2 | Coverage gap | LOW | tasks.md T036 | T036 não testa SORTER com permissão específica de READ acessando `GET /material-entries`. Spec FR-036 e contrato mencionam "SORTER com permissão específica" como caso válido para leitura. | Opcional: adicionar cenário em T036 — SORTER sem permissão específica → 403 em GET; SORTER com permissão explícita atribuída → 200. Pode ser delegado a T044 (RBAC phase 9). |

---

## 2. Verificação dos 16 Pontos do Escopo

| # | Ponto | Resultado | Detalhe |
|---|-------|-----------|---------|
| 1 | T030–T036 suficientes para US4 independente | ✅ Com ressalvas | Cobrem scaffold (T030), entry+stock event (T031), reversal (T032), GETs (T033), frontend (T034/T035), testes (T036). H1 e H2 devem ser resolvidos antes de T033/T035. |
| 2 | Entrada exige routeId obrigatório | ✅ Sim | URL `/collection-routes/:routeId/material-entries` torna `routeId` obrigatório; data-model.md: `routeId String NOT NULL`; T031 valida rota existe. |
| 3 | Rota precisa estar EM_ANDAMENTO ou CONCLUIDA | ✅ Sim | T031 valida status da rota; contrato: `409 ROUTE_STATUS_INVALID`; T036 testa PLANEJADA→409 e CANCELADA→409. |
| 4 | DRIVER só registra entrada em rota própria | ✅ Sim (mecanismo a ser clarificado) | `RouteOwnershipGuard` já implementado e lê `routeId` param. T031 valida ownership. H2 pede clarificação sobre guard vs service. |
| 5 | DRIVER não registra em rota de outro | ✅ Sim | T036: "DRIVER em rota de outro → 403". `RouteOwnershipGuard` lança `ForbiddenException` se não é owner/membro. |
| 6 | DRIVER não pode realizar estorno | ✅ Sim | T032: "apenas ADMIN/MANAGER (403 para DRIVER/SORTER)". `@RequirePermission('RAW_MATERIAL_ENTRIES', 'MANAGE')`; T036: "DRIVER tentando estorno → 403". |
| 7 | ADMIN/MANAGER realizam estorno com justificativa | ✅ Sim | T032: `justification` required; contrato: `422 JUSTIFICATION_REQUIRED`; FR-042/045 cobertos. |
| 8 | Toda entrada cria ENTRADA_BRUTO event | ✅ Sim | T031: "em transação Prisma: criar `RawMaterialEntry` + criar `RawMaterialStockEvent` (`type=ENTRADA_BRUTO`)". Transação garante atomicidade. |
| 9 | Todo estorno cria ESTORNO_BRUTO event | ✅ Sim | T032: "em transação Prisma: criar `RawMaterialStockEvent` (`type=ESTORNO_BRUTO`, `quantity=-valor`)". |
| 10 | Eventos de estoque são imutáveis | ✅ Sim | data-model.md: `RawMaterialStockEvent` sem `updatedAt`; plan.md: "sem rotas de DELETE/UPDATE"; T032 cria evento compensatório em vez de editar. |
| 11 | Sem edição direta de quantidade em evento registrado | ✅ Sim | Não há endpoint `PATCH/PUT /stock-events/:id` no contrato. Princípio IV Constitution é honrado. |
| 12 | Estorno referencia obrigatoriamente entrada/evento original | ✅ Sim | T032: `referencedEventId=stockEvent.id` (NOT NULL para ESTORNO); data-model.md: `referencedEventId String?` com verificação no service; FR-043. |
| 13 | Estorno não pode deixar saldo bruto negativo | ✅ Sim | T032: "calcular saldo atual + verificar `saldo - quantity >= 0`"; contrato: `409 REVERSAL_WOULD_CAUSE_NEGATIVE_BALANCE`; T036 testa ambos os casos. Race condition não protegida (M2). |
| 14 | AuditInterceptor registra previousState/newState corretamente | ⚠️ Parcial | Para `POST entry` (criação): `previousState=null`, `newState=entry` → correto. Para `POST reversal`: `previousState=null`, `newState=ESTORNO event` → previousState deveria capturar estado da entry (M3). |
| 15 | Recorte não invade triagem/vendas/financeiro/rateio | ✅ Sim | T030–T036 sem referência a `MaterialTriage`, vendas, financeiro, rateio. Boundary com US5 clara (T037 não está incluído). |
| 16 | Sem violação da Constitution | ✅ Sim (com risco em P.III) | Princípio IV (imutabilidade do estoque por evento): honorado por design. Princípio III (auditoria): risco em M3. Princípio XI (permissões no backend): `RouteOwnershipGuard` server-side. Princípio XXIII (testes em áreas críticas): T036 cobre permissões e imutabilidade. |

---

## 3. Tabela de Cobertura de Requisitos (escopo US4)

| Requisito | Coberto? | Tarefa(s) | Observação |
|-----------|----------|-----------|------------|
| FR-021: entrada vinculada a rota (routeId NOT NULL) | ✅ | T031 | URL path + constraint DB |
| FR-021a: sem entrada avulsa | ✅ | T031 | Implícito pela URL path obrigatória |
| FR-021b: rota com múltiplas entradas | ✅ | T031 | Sem restrição de unicidade por rota/subcategoria |
| FR-022: gerar ENTRADA_BRUTO na mesma transação | ✅ | T031 | Explicitamente especificado |
| FR-022a: eventos imutáveis | ✅ | T031 (implícito) | Sem rotas UPDATE/DELETE no contrato |
| FR-023: saldo = projeção de eventos (sem UPDATE direto) | ✅ | T032 + data-model | Validation em T032; sem endpoint de saldo mutation |
| FR-024: bloqueio para PLANEJADA/CANCELADA | ✅ | T031 + T036 | Status check + 409; testes cobrem ambos |
| FR-025: quantidade > 0 | ✅ | T031 + T036 | `422 QUANTITY_MUST_BE_POSITIVE`; T036 testa 0→422 |
| FR-026: subcategoria e unidade ativas | ✅ | T031 | Validação explícita; T036 testa subcategoria inativa→422 |
| FR-035: DRIVER registra em rota própria | ✅ (H2) | T031 | Mecanismo (guard vs service) a clarificar |
| FR-035a: DRIVER bloqueado em rota alheia | ✅ | T036 | DRIVER em rota de outro → 403 |
| FR-035b: DRIVER em rota CONCLUIDA | ⚠️ | T031 (spec) / T036 (gap) | Spec cobre; T036 não testa DRIVER+CONCLUIDA (M1) |
| FR-036: SORTER somente leitura | ⚠️ | T036 (parcial) | Testa criação/estorno; GET com SORTER não testado (L2) |
| FR-042: ESTORNO_BRUTO compensatório | ✅ | T032 | |
| FR-043: estorno referencia evento original | ✅ | T032 | `referencedEventId` NOT NULL |
| FR-044: quantidade negativa em estorno | ✅ | T032 | `quantity = -valor` |
| FR-045: justificativa obrigatória | ✅ | T032 + T036 | |
| FR-046: auditoria do estorno | ⚠️ | T032 (gap M3) | AuditLog criado mas semanticamente impreciso |
| FR-047: sem saldo negativo após estorno | ✅ | T032 + T036 | Validação inline + testes |
| FR-048: bloquear estorno se consumido por triagem | ✅ | T032 | Implícito (triagem inexiste na Fase 3) |
| FR-049: apenas ADMIN/MANAGER fazem estorno | ✅ | T032 + T036 | MANAGE permission + teste |
| FR-030/031/032: auditoria geral | ⚠️ | T031 (correto) / T032 (M3) | Entry criação: correto; reversal: semanticamente impreciso |

---

## 4. Constitution Alignment

| Princípio | Status | Evidência |
|-----------|--------|-----------|
| I. Spec-Driven | ✅ | spec.md US4 + clarificações + tasks T030–T036 com rastreabilidade |
| II. Fluxo Operacional | ✅ | Módulo `raw-material-entries`; naming `RawMaterialEntry`, `RawMaterialStockEvent`, `ENTRADA_BRUTO`, `ESTORNO_BRUTO` espelha vocabulário da cooperativa |
| III. Rastreabilidade e Auditoria | ⚠️ | Entry: AuditLog correto. Reversal: `previousState=null` pode violar SC-007. ESTORNO_BRUTO event é imutável e age como audit trail primário. |
| IV. Imutabilidade do Estoque por Evento (NÃO NEGOCIÁVEL) | ✅ | Sem UPDATE/DELETE em stock events; estorno cria evento compensatório; saldo = projeção; data-model.md sem `updatedAt` em `RawMaterialStockEvent` |
| V. Separação de Estados do Material | ✅ | `ENTRADA_BRUTO`/`ESTORNO_BRUTO` exclusivos de material bruto; triagem fora do escopo |
| XI. Permissões no Backend (NÃO NEGOCIÁVEL) | ✅ | `RequirePermission` + `RouteOwnershipGuard` server-side; DRIVER nunca chega ao service sem ownership |
| XXIII. Testes Obrigatórios (NÃO NEGOCIÁVEL) | ✅ | T036 cobre permissões (403 DRIVER reversal, 403 DRIVER outra rota) e estoque (imutabilidade, saldo negativo) |

---

## 5. Métricas

| Métrica | Valor |
|---------|-------|
| Requisitos mapeados (escopo US4) | 22 |
| Tarefas no recorte | 7 (T030–T036) |
| Cobertura requisitos com ≥1 tarefa | 100% |
| Issues CRITICAL | 0 |
| Issues HIGH | 2 |
| Issues MEDIUM | 3 |
| Issues LOW | 2 |
| Violações Constitution | 0 diretas (1 risco em Princípio III por M3) |

---

## 6. Próximas Ações

### Antes de iniciar T033 e T035 (HIGH — bloqueantes para frontend)

**H1 — `isReversed` ausente na resposta GET**:
- Atualizar T033 para incluir `isReversed: boolean` (ou `reversalStockEventId: string | null`) na resposta GET (lista e detalhe).
- Implementação sugerida no service: `include: { stockEvent: { include: { reversals: { select: { id: true } } } } }`, calcular `isReversed = stockEvent.reversals.length > 0`.
- Atualizar contrato `rest-api.md` para documentar o campo.

**H2 — Mecanismo de ownership para material entries**:
- Atualizar T031 e T033 para especificar `@UseGuards(RouteOwnershipGuard)` nos endpoints do `RawMaterialEntriesController` (POST entry, POST reversal, GET list, GET detail).
- O guard já lê `request.params?.routeId` — sem modificação necessária.

### Antes de iniciar T032 (MEDIUM — risco de race condition)

**M2 — Race condition em reversal duplo**:
- Opção A (preferida): Adicionar `@@unique([referencedEventId])` ao model `RawMaterialStockEvent` e atualizar T001 (migration). PostgreSQL trata NULLs como distintos em UNIQUE, então entradas sem reversal não colidem.
- Opção B: Envolver o check + creation em `prisma.$transaction([...], { isolationLevel: 'Serializable' })`.

### Melhorias antes de T032 (MEDIUM — audit do reversal)

**M3 — Audit do reversal semanticamente impreciso**:
- Adicionar `@AuditAsUpdate()` ao handler do reversal.
- Atualizar T032 para retornar o `RawMaterialEntry` (com `isReversed: true`) em vez do stock event bruto — assim `previousState` e `newState` são do mesmo tipo.
- OU documentar formalmente que o `ESTORNO_BRUTO` event imutável (com `referencedEventId`, `justification`, `userId`, `createdAt`) é o registro de auditoria primário, e aceitar `previousState=null` para reversals.

### Melhorias opcionais (MEDIUM/LOW)

- M1: Adicionar em T036 o cenário "DRIVER em rota CONCLUIDA própria → 201".
- L1: Explicitar em T033 que `@UseGuards(RouteOwnershipGuard)` se aplica a GETs.
- L2: Adicionar em T036 (ou delegar a T044) o cenário "SORTER sem permissão → 403 em GET entries".

---

## Veredicto

**APROVADO COM RESSALVAS**

O recorte US4 (T030–T036) é bem especificado, não invade os escopos proibidos, respeita os Princípios IV e XI da Constitution (imutabilidade de estoque e permissões no backend) e cobre todos os 22 requisitos mapeados. As regras de negócio críticas (routeId obrigatório, status EM_ANDAMENTO/CONCLUIDA, DRIVER ownership, ESTORNO_BRUTO compensatório, validação de saldo negativo) estão corretamente especificadas.

As **ressalvas obrigatórias** antes de iniciar T033/T035 são:

1. **(H1)** O campo `isReversed` (ou equivalente) precisa ser adicionado à resposta GET de material-entries antes de implementar o badge "Estornado" no frontend (T035). Sem isso, a UI não tem como exibir o badge.
2. **(H2)** O mecanismo de ownership para `RawMaterialEntriesController` deve ser explicitado em T031 — uso do `RouteOwnershipGuard` existente é o caminho recomendado para consistência arquitetural.

**M2** (race condition em reversal duplo) é fortemente recomendada antes de T032 para evitar inconsistência de saldo em produção.
