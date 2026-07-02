# Research: Triagem e Estoque Pronto

**Feature**: 006 — Triagem e Estoque Pronto
**Date**: 2026-07-02

---

## 1. Padrão event-sourced do estoque bruto — aplicar ao estoque pronto

**Decision**: `ReadyStockEvent` segue exatamente o padrão de `RawMaterialStockEvent`.
- Saldo calculado em tempo de consulta via `groupBy(subcategoryId, unitId) + SUM(quantity)`.
- Nenhum campo de saldo persistido — o agregado é a fonte de verdade.
- Eventos são imutáveis (apenas INSERT, nunca UPDATE/DELETE).

**Rationale**: O padrão já está provado no projeto, auditável, e permite reconstituição do saldo em qualquer ponto no tempo sem campos extras. Consistente com o Princípio IV da Constituição.

**Alternatives considered**:
- Saldo materializado numa tabela `ReadyStock`: rejeitado por risco de inconsistência entre a tabela de saldo e os eventos; requer locking adicional.

---

## 2. Desbite do estoque bruto na triagem

**Decision**: Adicionar dois novos valores ao enum `RawMaterialStockEventType`: `SAIDA_TRIAGEM` (negativo, debitado quando triagem é criada) e `ESTORNO_TRIAGEM` (positivo, creditado quando triagem é cancelada).

**Rationale**: O serviço `RawMaterialBalanceService` já computa o saldo bruto via `SUM(quantity)` de todos os eventos, sem filtro por tipo. Adicionar os novos tipos ao mesmo enum e tabela garante que o saldo bruto reflete automaticamente as saídas por triagem, sem alterar a query de saldo existente.

**Alternatives considered**:
- Criar uma tabela separada para eventos de saída de bruto: rejeitado por duplicar a lógica de cálculo de saldo e quebrar a query existente.
- Reutilizar `ESTORNO_BRUTO` para debitar na triagem: rejeitado porque `ESTORNO_BRUTO` tem semântica específica de reversão de `ENTRADA_BRUTO`.

---

## 3. Enum de tipos para ReadyStockEvent

**Decision**: 
```
enum ReadyStockEventType {
  TRIAGEM_OUTPUT    // creditado por SortingOutput (um evento por output)
  AJUSTE            // creditado/debitado por ReadyStockAdjustment (quantidade pode ser negativa)
  ESTORNO           // debitado quando SortingOperation é cancelada (um evento por output)
}
```

**Rationale**: Três tipos cobrem todos os fluxos desta fase. O tipo `AJUSTE` com quantidade assinada (positiva ou negativa) evita a necessidade de tipos `AJUSTE_ENTRADA` e `AJUSTE_SAIDA` separados, mantendo o mesmo padrão da query de saldo (SUM de quantidades com sinal).

---

## 4. Perda inerente — auto-registro

**Decision**: Quando `SUM(outputs) + SUM(rejects_declared) < processedQuantity`, o sistema cria automaticamente um `SortingReject` com `type = PERDA_INERENTE` e `quantity = processedQuantity - SUM_declared`. Esse registro é criado no mesmo `$transaction` da triagem.

**Rationale**: Garante que o total processado sempre fecha contabilmente (Princípio IV: toda alteração nasce de evento explícito). O tipo `PERDA_INERENTE` é diferenciado de `REJEITO` e `PERDA` para permitir filtros de relatório futuros.

---

## 5. Estrutura de SortingOutput → ReadyStockEvent

**Decision**: Para cada `SortingOutput`, é criado um `ReadyStockEvent` de tipo `TRIAGEM_OUTPUT` na mesma transação. Relacionamento 1:1 via `sortingOutputId` no `ReadyStockEvent`.

**Rationale**: Garante rastreabilidade bidirecional entre o output de triagem e a movimentação de estoque pronto, conforme FR-015 da spec.

---

## 6. Rejeitos — FK opcional para MaterialSubcategory

**Decision**: `SortingReject.subcategoryId` é nullable. O campo `description` (texto livre) é obrigatório quando `subcategoryId` é nulo.

**Rationale**: Rejeitos nem sempre correspondem a uma subcategoria do catálogo (ex: "resíduo misto contaminado"). A FK opcional mantém estrutura quando possível sem bloquear o operador. Decisão tomada na sessão de clarificações (2026-07-02).

---

## 7. Cancelamento de triagem — janela temporal

**Decision**: Sem janela temporal. Qualquer `SortingOperation` com status `CONCLUIDA` pode ser cancelada enquanto o estorno não resultar em saldo negativo.

**Rationale**: A proteção real é a validação de saldo — cancelamento de triagem antiga só é bloqueado se o material pronto gerado já foi consumido por ajustes. Janela artificial criaria fricção operacional sem ganho de integridade. Decisão tomada na sessão de clarificações (2026-07-02).

---

## 8. Permissões RBAC para os novos módulos

| Módulo | Action | Perfis autorizados |
|--------|--------|--------------------|
| SORTING | READ | SORTER, MANAGER, ADMIN |
| SORTING | CREATE | SORTER, MANAGER, ADMIN |
| SORTING | CANCEL | MANAGER, ADMIN |
| READY_STOCK | READ | SORTER, MANAGER, ADMIN |
| READY_STOCK | CREATE_ADJUSTMENT | MANAGER, ADMIN |

**Rationale**: SORTER (triador) pode criar e consultar triagens, mas não cancelar nem ajustar estoque — operações de correção são restritas a gestão. Segue o mesmo padrão de separação de responsabilidades do módulo de rotas.

---

## 9. Auditoria — reutilizar AuditLog existente

**Decision**: Aplicar `@AuditEntity('sortingOperation')`, `@AuditEntity('readyStockAdjustment')` nos controllers novos. O interceptor `AuditInterceptor` captura `previousState`/`newState` automaticamente.

**Rationale**: O padrão já existe e é confiável. Para cancelamento, o `previousState` captura o status `CONCLUIDA` e o `newState` mostra `CANCELADA` com motivo — rastreabilidade completa.

---

## 10. Integração com saldo bruto existente

**Decision**: O módulo `sorting-operations` lê o saldo bruto disponível diretamente via query de `RawMaterialStockEvent` (mesma lógica do `RawMaterialBalanceService`), sem depender do serviço público de saldo — para garantir consistência transacional.

**Rationale**: Ler o saldo dentro da mesma transação que debita evita race conditions. O serviço de saldo público pode ser chamado para exibição na UI, mas a validação de saldo disponível antes do desbite é feita dentro do `$transaction`.
