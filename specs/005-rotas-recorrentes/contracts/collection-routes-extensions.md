# API Contracts: Collection Routes Extensions

Extensions to the existing `/collection-routes` API to support template occurrences and duplication.

---

## PATCH /collection-routes/:id (enhanced)

Existing endpoint, enhanced behavior when the route belongs to a template.

**New behavior when `templateId` is not null and structural fields change**:
- Structural fields: `driverId`, `vehicleId`, `points` (via separate points endpoints)
- On structural change: sets `isException = true` automatically
- Blocked fields by status (see data-model.md constraint table)

**No new request/response fields** — the backend handles `isException` internally.

---

## POST /collection-routes/:id/duplicate

Duplicate any collection route (ad-hoc or template occurrence) as a new ad-hoc route. Opens pre-fill data; the client shows the creation form. The new route has no `templateId` (always ad-hoc).

**Permissions**: COLLECTION_ROUTES:MANAGE

**Request body**: none

**Response 200** — returns a draft (not persisted):
```json
{
  "draft": {
    "name": "Rota Terças e Quintas - cópia",
    "plannedDate": null,
    "driverId": "uuid",
    "vehicleId": "uuid",
    "notes": "...",
    "points": [
      { "collectionPointId": "uuid", "sequence": 1 }
    ]
  }
}
```

Client behavior:
- Opens `CollectionRouteFormPage` pre-filled with draft
- `plannedDate` field is empty and required
- No recurrence option (ad-hoc only)
- Original route is not modified

**Response 404**: Route not found.

---

## GET /collection-routes (enhanced query params)

Extended filtering to support template-based queries.

**New query params**:
| Param | Type | Description |
|-------|------|-------------|
| templateId | uuid | Filter occurrences by template |
| isException | boolean | Filter exception occurrences |
| hasTemplate | boolean | `true` = only template occurrences; `false` = only ad-hoc routes |

**Response 200** (existing structure, enhanced items):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "...",
      "plannedDate": "2026-07-08",
      "status": "PLANEJADA",
      "templateId": "uuid",
      "isException": false,
      "template": {
        "id": "uuid",
        "name": "Rota Terças e Quintas"
      },
      "vehicle": {...},
      "driver": {...},
      "routePoints": [...]
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

`template` field is `null` for ad-hoc routes.

---

## POST /collection-routes/:id/cancel (enhanced)

Existing endpoint. When cancelling a PLANEJADA occurrence with a templateId:
- Only that occurrence is cancelled
- Template remains ATIVO and continues generating future occurrences

When cancelling an EM_ANDAMENTO occurrence (any route):
- Requires explicit confirmation in request body
- Generates audit log entry with reason

**Request body** (enhanced):
```json
{
  "reason": "Feriado municipal - sem coleta",
  "confirmInProgress": true
}
```

`confirmInProgress` is required when status is `EM_ANDAMENTO`:
- If absent or `false` when status is `EM_ANDAMENTO` → **422 Unprocessable Entity** with message "Confirmação explícita necessária para cancelar rota em andamento"
- If `true` when status is `EM_ANDAMENTO` → cancellation proceeds with audit log
- Ignored (any value accepted) when status is `PLANEJADA`

**Response 200**: Returns updated CollectionRoute (unchanged from existing).

---

## PATCH /collection-routes/:id/points/reorder (existing, no change)

No changes needed. When points are reordered on a template occurrence, the backend sets `isException = true` (since reorder is a structural change).

---

## Cooperative Settings Extension

**PATCH /cooperative/settings** (existing endpoint, enhanced):

New field in request body:
```json
{
  "occurrenceHorizonWeeks": 6
}
```

**Validations**:
- `occurrenceHorizonWeeks`: integer, min 1, max 12

**Access**: ADMIN only.
