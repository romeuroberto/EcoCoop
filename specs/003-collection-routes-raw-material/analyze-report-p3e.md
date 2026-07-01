# Specification Analysis Report — Fase 3E: US5 Saldo Bruto (T037–T039)

**Data**: 2026-06-30
**Escopo**: T037, T038, T039 / US5 — Consultar Saldo Básico de Material Bruto
**Artefatos analisados**:
- `.specify/memory/constitution.md` v1.0.0
- `specs/003-collection-routes-raw-material/spec.md`
- `specs/003-collection-routes-raw-material/plan.md`
- `specs/003-collection-routes-raw-material/data-model.md`
- `specs/003-collection-routes-raw-material/contracts/rest-api.md`
- `specs/003-collection-routes-raw-material/tasks.md` (T037–T039)
- `apps/backend/src/modules/raw-material-entries/raw-material-entries.service.ts` (Fase 3D — implementado)
- `apps/backend/prisma/seeds/seed.ts` (permissões Phase 3)

---

## Estado dos Artefatos

| Tarefa | Arquivo-alvo | Estado |
|--------|-------------|--------|
| T037 | `raw-material-balance/` (módulo backend) | **NÃO IMPLEMENTADO** |
| T038 | `RawMaterialBalancePage.tsx` (frontend) | **NÃO IMPLEMENTADO** |
| T039 | `raw-material-balance.spec.ts` (testes e2e) | **NÃO IMPLEMENTADO** |

---

## Findings

| ID | Categoria | Severidade | Localização | Resumo | Recomendação |
|----|-----------|-----------|------------|--------|-------------|
| A1 | Inconsistência | **MEDIUM** | spec.md FR-029 vs. contracts/rest-api.md + tasks.md T039 | FR-029 exige "retornar saldo zero" para subcategorias sem eventos; contrato diz "não aparecem na listagem"; T039 alinha com contrato ("não aparece na listagem"). Comportamentos mutuamente excludentes. | Resolver antes de implementar T037. Ver seção detalhe abaixo. |
| B1 | Subespeficação | **LOW** | tasks.md T037 | O task descreve `groupBy` mas não menciona o equivalente da cláusula `HAVING SUM(quantity) >= 0` presente no data-model.md. Sem isso, se um bypass em T032 ocorrer, o endpoint pode exibir saldo negativo. | Adicionar nota em T037: implementar `having: { quantity: { _sum: { gte: 0 } } }` no Prisma ou validação pós-query. |
| C1 | Subespeficação | **LOW** | contracts/rest-api.md (campo `eventCount`) | Campo `"eventCount": 5` aparece no response do contrato mas não consta em FR-027, em T037 nem em T038 (frontend). Tela de saldo não especifica que deve exibir contagem de eventos. | Confirmar se `eventCount` é obrigatório na resposta ou opcional; se desejado, adicionar explicitamente em FR-027 ou T037/T038. |
| D1 | Subespeficação | **LOW** | tasks.md T037 vs. contracts/rest-api.md | Campo `"calculatedAt"` (timestamp da consulta) está no contrato mas não é mencionado em T037. Implementador pode omiti-lo. | Adicionar `calculatedAt: new Date().toISOString()` explicitamente em T037. |

---

## Checklist de Verificação Específica

### 1. Saldo bruto não é persistido como tabela própria

**PASSOU ✅**

- `data-model.md` (linha ~163): *"SaldoBruto **não é persistida** — é uma projeção calculada por query SQL"*
- `spec.md` Key Entities: *"SaldoBruto (projeção): Não é uma entidade persistida."*
- `plan.md`: *"Saldo bruto calculado em tempo de consulta — sem tabela persistida de saldo (Princípio IV)"*
- T037 usa `groupBy` em `RawMaterialStockEvent` — sem CREATE TABLE.
- Nenhum modelo Prisma chamado `SaldoBruto` ou equivalente existe no `data-model.md`.

---

### 2. Saldo calculado exclusivamente a partir dos eventos

**PASSOU ✅**

- `spec.md` FR-023: *"O sistema NÃO DEVE permitir alterar saldo de estoque diretamente — o saldo DEVE ser calculado como projeção dos eventos."*
- FR-027: *"calculado a partir da soma algébrica dos eventos"*
- T037: query Prisma `groupBy(['subcategoryId', 'unitId'], _sum: { quantity: true })` sobre `RawMaterialStockEvent`.
- Código T032 (`raw-material-entries.service.ts`, linhas 135–145): usa `prisma.rawMaterialStockEvent.aggregate(...)` para verificação de saldo — mesma fonte de verdade.
- Nenhum campo de saldo cached/persistido existe em nenhum modelo.

---

### 3. ENTRADA_BRUTO soma positivo

**PASSOU ✅**

- `data-model.md`: *"`ENTRADA_BRUTO` → `quantity` positiva"*; *"`quantity`: positiva para `ENTRADA_BRUTO`"*
- Código implementado (`raw-material-entries.service.ts`, linha 98–100): `quantity: dto.quantity` — valor positivo validado via `dto.quantity > 0` (FR-025).
- FR-027: *"entradas positivas (`ENTRADA_BRUTO`)"*
- SC-008: *"soma algébrica dos eventos válidos (`ENTRADA_BRUTO` positivos e `ESTORNO_BRUTO` negativos)"*

---

### 4. ESTORNO_BRUTO reduz o saldo

**PASSOU ✅**

- `data-model.md`: *"`ESTORNO_BRUTO` → `quantity` negativa (armazenada assim no banco)"*
- FR-044: *"O evento `ESTORNO_BRUTO` DEVE ter efeito negativo no saldo (quantidade com sinal negativo)."*
- Código implementado (`raw-material-entries.service.ts`, linha 158): `quantity: new Prisma.Decimal(reversalQty).neg()` — armazena valor negativo.
- Portanto `SUM(quantity)` naturalmente reduz o saldo sem nenhuma lógica especial na query de saldo.

---

### 5. Eventos estornados continuam no histórico

**PASSOU ✅**

- FR-022a: *"Eventos de estoque NUNCA DEVEM ser editados ou excluídos fisicamente após registrados."*
- `data-model.md`: *"Nenhum campo é atualizável após criação — sem UPDATE/DELETE routes no repositório"*
- Código T032: o estorno cria um novo registro `ESTORNO_BRUTO` com `referencedEventId` apontando para o evento original. O evento `ENTRADA_BRUTO` original **não é deletado nem alterado**.
- `RawMaterialStockEvent.@@unique([referencedEventId])` garante no banco que um evento original tem no máximo um estorno.
- Ambos (ENTRADA original + ESTORNO) aparecem no `groupBy`, e o SUM reflete os dois.

---

### 6. Endpoint retorna zero para combinações sem eventos

**INCONSISTÊNCIA ENCONTRADA ⚠️** → Ver Finding A1

**Situação atual nos artefatos:**

| Artefato | Comportamento especificado |
|----------|--------------------------|
| `spec.md` FR-029 | *"O sistema DEVE retornar saldo zero para subcategorias sem eventos"* |
| `spec.md` US5 SC2 | *"o saldo retornado é zero (ou a subcategoria não aparece na listagem)"* — uso ambíguo de "ou" |
| `contracts/rest-api.md` | *"Subcategorias sem nenhum evento não aparecem na listagem"* |
| `tasks.md` T039 | *"saldo zero para subcategoria sem eventos (não aparece na listagem)"* |

**Por que importa**: A query `groupBy` natural do Prisma/SQL **não retorna linhas** para combinações sem eventos — há zero rows para fazer GROUP BY. Para "retornar saldo zero", seria necessário um LEFT JOIN com `MaterialSubcategory`, o que muda a implementação significativamente. O contrato, T039 e a query em `data-model.md` apontam para o comportamento "não aparece". FR-029 diz o contrário.

**Impacto em T037**: Se implementar seguindo FR-029 (retornar zero), o contrato fica violado. Se seguir o contrato/T039 (não aparecer), FR-029 fica violado.

---

### 7. Filtros estão claros

**PASSOU COM OBSERVAÇÃO ✅/⚠️** (Low — ver Finding C1 e D1)

Filtros definidos no contrato:

| Filtro | Tipo | Padrão | Definição |
|--------|------|--------|-----------|
| `subcategoryId` | UUID | — | Filtra por subcategoria específica |
| `unitId` | UUID | — | Filtra por unidade específica |
| `includeInactive` | boolean | `false` | Inclui subcategorias/unidades inativas no resultado |

Semântica de `includeInactive` documentada em T037: *"só subcategorias/unidades ativas na listagem, mas histórico sempre incluído nos cálculos"*. Isso significa que mesmo com `includeInactive=false`, os eventos de uma subcategoria antes de ser inativada continuam somando — mas o resultado só aparece na listagem se a subcategoria estiver ativa. T039 confirma: "subcategoria inativa com histórico aparece com `includeInactive=true`".

Sem paginação — correto para endpoint de agregação.

---

### 8. ADMIN/MANAGER têm acesso correto

**PASSOU ✅**

- Seed (`seed.ts`): `ADMIN` → `MANAGE` em `RAW_MATERIAL_BALANCE`; `MANAGER` → `READ` em `RAW_MATERIAL_BALANCE`.
- Contrato: `RAW_MATERIAL_BALANCE:READ` para ADMIN e MANAGER.
- spec.md FR-033: *"ADMIN DEVE ter acesso completo a todas as operações da Fase 3"*
- spec.md FR-034: *"MANAGER DEVE poder: ... visualizar saldo bruto"*
- US5: *"Como gestor, quero consultar o saldo atual"* — gestor = MANAGER.

> ADMIN recebe MANAGE (superset de READ) — portanto acessa o endpoint de READ sem problema.

---

### 9. DRIVER/SORTER não acessam sem permissão específica

**PASSOU ✅**

- Seed: DRIVER **não tem** `RAW_MATERIAL_BALANCE` em nenhuma action. Permissões DRIVER: `COLLECTION_ROUTES:READ`, `COLLECTION_ROUTES:EXECUTE`, `RAW_MATERIAL_ENTRIES:CREATE`.
- Seed: SORTER **não tem** `RAW_MATERIAL_BALANCE`. Permissões SORTER: apenas `DASHBOARD:READ`.
- spec.md US5 SC4: *"DRIVER autenticado, When ele tenta consultar saldo bruto sem permissão específica, Then recebe HTTP 403."*
- Contrato: *"SORTER/DRIVER com permissão específica"* — acesso apenas se a gestão conceder manualmente.
- T039: *"DRIVER sem permissão explícita → 403; SORTER sem permissão explícita → 403"*

Comportamento padrão bloqueado, granularidade por permissão específica preservada.

---

### 10. Sem violação da Constituição

**PASSOU ✅**

| Princípio | Status | Evidência |
|-----------|--------|----------|
| IV. Imutabilidade do Estoque por Evento | ✅ | Saldo = projeção de eventos; sem UPDATE/DELETE; sem tabela de saldo |
| III. Rastreabilidade e Auditoria | ✅ | Eventos imutáveis; estorno cria novo registro referenciado |
| V. Separação Clara de Estados do Material | ✅ | Apenas `ENTRADA_BRUTO` e `ESTORNO_BRUTO`; triagem, estoque pronto, rejeito fora do escopo |
| XI. Permissões Validadas no Backend | ✅ | `RAW_MATERIAL_BALANCE:READ` validado server-side; seed correto |
| XXIII. Testes Obrigatórios em Áreas Críticas | ✅ | T039 cobre estoque (obrigatório por Princípio XXIII); cobre permissões (403 para DRIVER/SORTER) |

---

## Coverage Summary

| Requisito | Tem tarefa? | Tarefas | Observação |
|-----------|------------|---------|------------|
| FR-027 (endpoint saldo bruto) | ✅ | T037, T039 | Backend + testes |
| FR-028 (apenas eventos Fase 3) | ✅ | T037 | Implícito — `RawMaterialStockEvent` só tem tipos Phase 3 |
| FR-029 (zero para sem eventos) | ⚠️ | T037, T039 | Inconsistência vs. contrato — ver A1 |
| US5-SC1 (total acumulado) | ✅ | T037, T039 | groupBy + SUM |
| US5-SC2 (zero/ausência) | ⚠️ | T037, T039 | Ambíguo — ver A1 |
| US5-SC3 (imutabilidade) | ✅ | T037 | Saldo é projeção |
| US5-SC4 (DRIVER → 403) | ✅ | T039 | Coberto no teste |
| SC-008 (saldo algébrico) | ✅ | T037, T039 | Alinhado com groupBy; ver B1 para HAVING |
| ADMIN access | ✅ | seed + T039 | MANAGE inclui READ |
| MANAGER access | ✅ | seed + T039 | READ direto |
| DRIVER blocked | ✅ | seed + T039 | Sem permissão default |
| SORTER blocked | ✅ | seed + T039 | Sem permissão default |

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Requisitos funcionais no escopo | 3 (FR-027, FR-028, FR-029) + 1 US (US5) |
| Tarefas analisadas | 3 (T037, T038, T039) |
| Cobertura (requisitos com tarefa) | 100% |
| Issues CRITICAL | 0 |
| Issues HIGH | 0 |
| Issues MEDIUM | 1 (A1) |
| Issues LOW | 3 (B1, C1, D1) |
| Violações da Constituição | 0 |

---

## Detalhe da Inconsistência A1 — FR-029 vs. Contrato/T039

**O problema:**

FR-029 diz: *"O sistema DEVE retornar saldo zero para subcategorias sem eventos de entrada registrados."*

O contrato (`rest-api.md`) diz: *"Subcategorias sem nenhum evento não aparecem na listagem (a menos que `includeInactive=true` e explicitamente buscadas por `subcategoryId`)."*

T039 valida: *"saldo zero para subcategoria sem eventos (não aparece na listagem)"*.

A query SQL em `data-model.md` usa `GROUP BY` sem `LEFT JOIN` — portanto naturalmente **não retorna** linhas sem eventos.

**As duas interpretações:**

| Interpretação | Comportamento | Implementação necessária |
|---------------|---------------|------------------------|
| FR-029 literal | Retorna `{ balance: "0.000" }` para subcategoria sem eventos | LEFT JOIN + WHERE subcategoryId |
| Contrato/T039 | Subcategoria sem eventos simplesmente **não aparece** no resultado | groupBy natural (mais simples) |

**Impacto real**: O contrato inclui o filtro `?subcategoryId=uuid` — se aplicado para uma subcategoria sem eventos, com a interpretação "não aparece", o resultado seria `{ data: [], calculatedAt: "..." }`. Com a interpretação "retorna zero", seria `{ data: [{ balance: "0.000", ... }], ... }`.

**Recomendação**: Adotar a interpretação do contrato/T039 ("não aparece") e corrigir FR-029 para: *"O sistema DEVE retornar resultado vazio (`data: []`) para subcategorias sem eventos"*. Isso é consistente com o comportamento `groupBy`, mais simples de implementar e alinhado com o que o frontend (`T038`) precisará tratar de qualquer forma.

---

## Próximas Ações

### Antes de implementar T037

1. **[Ação obrigatória]** Resolver a inconsistência A1: decidir o comportamento de "subcategoria sem eventos" e atualizar FR-029 (ou o contrato) para refletir a decisão. Recomendação: adotar "não aparece", atualizar FR-029.

2. **[Ação recomendada]** Confirmar se `eventCount` (Finding C1) é campo obrigatório na resposta ou pode ser omitido. Se obrigatório, adicionar em T037 e T038.

### Em T037

3. **[Ação recomendada]** Adicionar `calculatedAt: new Date().toISOString()` explicitamente na implementação (Finding D1).

4. **[Ação recomendada]** Adicionar HAVING/guard pós-query para garantir `balance >= 0` (Finding B1): `having: { quantity: { _sum: { gte: 0 } } }` no Prisma groupBy, como salvaguarda adicional à validação em T032.

### Para T038

5. Confirmar se o frontend deve exibir `eventCount` ou apenas `balance`.

### Para T039

6. O cenário *"saldo zero para subcategoria sem eventos"* deve ser adaptado conforme a decisão de A1 (resultado `{ data: [] }` ou `{ data: [{ balance: "0.000" }] }`).

---

## Remediações Opcionais

Gostaria de sugestões de edições concretas para os artefatos afetados (FR-029 em spec.md, e confirmação de C1/D1 em tasks.md)?

---

## Veredicto

### **APROVADO COM RESSALVAS**

> **Ressalva obrigatória antes de implementar T037:** resolver a inconsistência A1 (FR-029 vs. contrato/T039) para evitar ambiguidade sobre o comportamento de "subcategoria sem eventos". Todos os demais pontos de verificação estão consistentes e alinhados com a Constituição. Nenhuma violação de princípio constitucional foi encontrada.
