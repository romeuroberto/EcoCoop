# Quickstart Validation Guide: Rotas Recorrentes

This guide documents runnable validation scenarios that prove the feature works end-to-end. See [data-model.md](data-model.md) for entity details and [contracts/](contracts/) for full API specs.

## Prerequisites

- Backend running at `http://localhost:3000`
- Frontend running at `http://localhost:5173`
- Database seeded with at least: 1 cooperative, 1 MANAGER user, 1 driver (user with DRIVER profile), 1 active vehicle, 3 active collection points
- Auth token for MANAGER user in `TOKEN` env var

---

## Scenario 1 — Criar modelo e ver ocorrências geradas (US-1, P1)

**Setup**: no templates exist

**Steps**:
1. `POST /route-templates` with recurrenceDays=[2,4] (Tue+Thu), startDate=next Monday, driverId, vehicleId, 3 points
2. Assert response: `generatedOccurrences >= 4` (at least 4 weeks × 2 days)
3. `GET /collection-routes?templateId=<id>` → assert data has PLANEJADA occurrences on Tuesdays and Thursdays only
4. `GET /route-templates/<id>` → assert occurrences list matches

**Expected**: 8 occurrences (4 weeks × 2 days) in PLANEJADA status, all with isException=false.

**UI validation**: Navigate to "Modelos de Rota" page → open template → see occurrence table. Navigate to "Rotas de Coleta" → filter by template → occurrences are marked with template badge.

---

## Scenario 2 — Renovação automática do horizonte (US-1, SC-002)

**Setup**: Template created in Scenario 1

**Steps**:
1. Manually trigger `POST /route-templates/<id>/generate`
2. Assert response: `generatedOccurrences = 0` (horizon already full)
3. Delete (or simulate expiry of) the last 2 PLANEJADA occurrences in DB
4. Trigger `POST /route-templates/<id>/generate` again
5. Assert response: `generatedOccurrences = 2` (refilled missing)

**Expected**: Generator is idempotent (safe to run multiple times) and fills gaps.

---

## Scenario 3 — Editar ocorrência individual sem afetar o modelo (US-2, P2)

**Setup**: Template from Scenario 1, at least 3 future occurrences

**Steps**:
1. Pick occurrence O1 (first future PLANEJADA)
2. `PATCH /collection-routes/<O1.id>` with a different driverId
3. Assert O1: `isException = true`, new driverId applied
4. `GET /route-templates/<templateId>` → assert template.driverId unchanged
5. `GET /collection-routes/<O2.id>` (another occurrence) → assert O2.driverId = original

**Expected**: Only O1 is changed; template and other occurrences untouched.

---

## Scenario 4 — Bloqueio de edição por status (US-2, acceptance scenario 2-3)

**Steps**:
1. Start an occurrence: `POST /collection-routes/<id>/start` → status = EM_ANDAMENTO
2. `PATCH /collection-routes/<id>` with new driverId → assert **422** or **409** with explanation
3. `PATCH /collection-routes/<id>` with notes update → assert **200** (operational fields allowed)
4. Complete the occurrence: `POST /collection-routes/<id>/complete` → status = CONCLUIDA
5. `PATCH /collection-routes/<id>` with any field → assert **422**

**Expected**: Structural edits blocked on EM_ANDAMENTO and terminal states.

---

## Scenario 5 — Propagar alteração do modelo para ocorrências futuras (US-3, P2)

**Setup**: Template from Scenario 1 with 8 PLANEJADA occurrences; edit O1 individually (isException=true)

**Steps**:
1. `PATCH /route-templates/<id>` with new vehicleId, `propagate: true`, `overwriteExceptions: false`
2. Assert response: `propagation.updated = 7`, `propagation.exceptionsSkipped = 1` (O1)
3. `GET /collection-routes/<O1.id>` → assert O1.vehicleId = OLD (exception preserved)
4. `GET /collection-routes/<O2.id>` → assert O2.vehicleId = NEW (propagated)
5. Repeat with `overwriteExceptions: true` → assert O1.vehicleId = NEW, O1.isException = false

**Expected**: Propagation respects exception flag; explicit overwrite resets it.

---

## Scenario 6 — Alteração de dias de recorrência gera novas ocorrências (US-3, acceptance scenario 3)

**Setup**: Template with recurrenceDays=[2,4] (Tue+Thu)

**Steps**:
1. `PATCH /route-templates/<id>` with recurrenceDays=[2,4,5], `propagate: true`
2. Assert response: `propagation.newOccurrencesGenerated >= 4` (4 Fridays in horizon)
3. `GET /collection-routes?templateId=<id>` → assert Friday occurrences exist
4. Assert existing Tuesday and Thursday occurrences are NOT removed

**Expected**: New days generate new occurrences; existing ones preserved.

---

## Scenario 7 — Cancelar ocorrência individual (US-5, P3)

**Setup**: Template with multiple PLANEJADA occurrences

**Steps**:
1. `POST /collection-routes/<occurrence.id>/cancel` with reason "Feriado"
2. Assert occurrence status = CANCELADA
3. `GET /route-templates/<id>` → assert template status = ATIVO
4. Trigger `POST /route-templates/<id>/generate` → assert new occurrence generated for that date slot next cycle (if within horizon)

**Expected**: Only the single occurrence is cancelled; model continues generating.

---

## Scenario 8 — Desativar modelo e reativar (US-5, P3)

**Setup**: Template with 8 PLANEJADA occurrences

**Steps**:
1. `POST /route-templates/<id>/deactivate`
2. Assert response: `cancelledOccurrences = 8`; template.status = INATIVO
3. `GET /collection-routes?templateId=<id>&status=PLANEJADA` → assert count = 0
4. `POST /route-templates/<id>/activate` with new startDate (next Monday)
5. Assert template.status = ATIVO
6. `GET /collection-routes?templateId=<id>&status=PLANEJADA` → assert new occurrences generated

**Expected**: All PLANEJADA cancelled on deactivate; reactivation generates fresh occurrences from new startDate. Previously cancelled occurrences remain CANCELADA.

---

## Scenario 9 — Duplicar rota avulsa ou ocorrência (US-4, P3)

**Steps**:
1. `POST /collection-routes/<any-route.id>/duplicate`
2. Assert draft has driverId, vehicleId, points from original; plannedDate = null
3. Use draft to `POST /collection-routes` with new plannedDate → assert new ad-hoc route (templateId = null)
4. `GET /collection-routes/<original.id>` → assert original unchanged

**Expected**: Duplicate creates an ad-hoc route; original unmodified.

---

## Scenario 10 — Duplicar modelo (US-4, P3)

**Steps**:
1. `POST /route-templates/<id>/duplicate`
2. Assert draft name = original.name + " (cópia)"; startDate = null; endDate = null
3. Use draft to `POST /route-templates` with new startDate → new template created
4. `GET /route-templates/<original.id>` → assert original unchanged

**Expected**: Duplicate creates a new template draft; original unmodified.

---

## Scenario 11 — Prevenção de duplicação (edge case)

**Steps**:
1. Manually attempt `POST /collection-routes` with templateId and plannedDate of an existing occurrence
2. Assert **409 Conflict** with code matching the unique constraint

**Expected**: Database constraint prevents duplicate occurrence per template+date.

---

## Scenario 12 — Configurar horizonte de geração (FR-017)

**Prerequisites**: Admin user token

**Steps**:
1. `PATCH /cooperative/settings` with `occurrenceHorizonWeeks: 2`
2. Create a new template
3. `GET /collection-routes?templateId=<newId>` → assert occurrences span only 2 weeks
4. `PATCH /cooperative/settings` with `occurrenceHorizonWeeks: 13` → assert **400** (max 12)

**Expected**: Horizon is configurable per cooperative; validated within [1, 12].
