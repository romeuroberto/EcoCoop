# API Contracts: Route Templates

Base path: `/route-templates`

Permission module: `ROUTE_TEMPLATES`

---

## GET /route-templates

List all route templates with optional filtering.

**Permissions**: ROUTE_TEMPLATES:READ (MANAGER, ADMIN)

**Query params**:
| Param | Type | Description |
|-------|------|-------------|
| status | `ATIVO` \| `INATIVO` | Filter by template status |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Rota Terças e Quintas",
      "recurrenceDays": [2, 4],
      "startDate": "2026-07-01",
      "endDate": null,
      "status": "ATIVO",
      "driver": { "id": "uuid", "email": "motorista@email.com" },
      "vehicle": { "id": "uuid", "plate": "ABC-1234", "type": "TRUCK", "model": "VW Delivery" },
      "templatePoints": [
        { "id": "uuid", "sequence": 1, "collectionPoint": { "id": "uuid", "name": "Ponto A", "address": "..." } }
      ],
      "occurrenceCount": 8,
      "createdAt": "2026-07-01T00:00:00Z",
      "updatedAt": "2026-07-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

## GET /route-templates/:id

Get a single template with its occurrence list.

**Permissions**: ROUTE_TEMPLATES:READ

**Query params for occurrences**:
| Param | Type | Description |
|-------|------|-------------|
| occurrencePage | number | Page for occurrence list (default: 1) |
| occurrenceLimit | number | Items per page (default: 20) |
| occurrenceStatus | RouteStatus | Filter occurrences by status |

**Response 200**:
```json
{
  "id": "uuid",
  "name": "Rota Terças e Quintas",
  "recurrenceDays": [2, 4],
  "startDate": "2026-07-01",
  "endDate": null,
  "status": "ATIVO",
  "notes": null,
  "driver": { "id": "uuid", "email": "motorista@email.com" },
  "vehicle": { "id": "uuid", "plate": "ABC-1234", "type": "TRUCK", "model": "VW Delivery" },
  "templatePoints": [...],
  "occurrences": {
    "data": [
      {
        "id": "uuid",
        "plannedDate": "2026-07-08",
        "status": "PLANEJADA",
        "isException": false,
        "driver": { "id": "uuid", "email": "motorista@email.com" },
        "vehicle": { "id": "uuid", "plate": "ABC-1234" }
      }
    ],
    "total": 8,
    "page": 1,
    "limit": 20
  }
}
```

**Response 404**: Template not found.

---

## POST /route-templates

Create a new route template. Triggers occurrence generation asynchronously on backend (returns after generation completes synchronously for the initial horizon).

**Permissions**: ROUTE_TEMPLATES:MANAGE (MANAGER, ADMIN)

**Request body**:
```json
{
  "name": "Rota Terças e Quintas",
  "recurrenceDays": [2, 4],
  "startDate": "2026-07-01",
  "endDate": null,
  "driverId": "uuid",
  "vehicleId": "uuid",
  "points": [
    { "collectionPointId": "uuid", "sequence": 1, "notes": null },
    { "collectionPointId": "uuid", "sequence": 2, "notes": null }
  ],
  "notes": null
}
```

**Validations**:
- `name`: non-empty string
- `recurrenceDays`: non-empty array, values in [0..6], unique values
- `startDate`: valid ISO date string
- `endDate`: if present, must be >= startDate
- `driverId`: existing user id
- `vehicleId`: existing vehicle id (isActive = true)
- `points`: non-empty array; each collectionPointId must exist; sequences must be unique and sequential starting at 1

**Response 201**:
```json
{
  "template": { ...full template object... },
  "generatedOccurrences": 8
}
```

---

## PATCH /route-templates/:id

Update a route template. Optionally propagate structural changes to future PLANEJADA occurrences.

**Permissions**: ROUTE_TEMPLATES:MANAGE

**Request body** (all fields optional except propagation flags):
```json
{
  "name": "Rota Terças, Quintas e Sextas",
  "recurrenceDays": [2, 4, 5],
  "startDate": "2026-07-01",
  "endDate": "2026-12-31",
  "driverId": "uuid",
  "vehicleId": "uuid",
  "points": [
    { "collectionPointId": "uuid", "sequence": 1 },
    { "collectionPointId": "uuid", "sequence": 2 }
  ],
  "notes": "Atualizado para incluir sextas",
  "propagate": true,
  "overwriteExceptions": false
}
```

**Propagation behavior** (when `propagate: true`):
- Structural fields (driverId, vehicleId, points) are updated on all PLANEJADA occurrences where `isException = false` AND `plannedDate >= today`
- If `overwriteExceptions: true`, exceptions are also overwritten and their `isException` flag is cleared
- If recurrenceDays was changed (new days added), new occurrences are generated for the new days within the horizon
- Route date transitions (existing occurrences outside new recurrenceDays) are NOT removed

**Response 200**:
```json
{
  "template": { ...full template object... },
  "propagation": {
    "updated": 5,
    "exceptionsSkipped": 2,
    "exceptionsOverwritten": 0,
    "newOccurrencesGenerated": 3
  }
}
```

Note: `propagation` is null when `propagate` is false or omitted.

**Response 404**: Template not found.
**Response 409**: Concurrent modification detected (template version conflict).

---

## POST /route-templates/:id/deactivate

Deactivate a template. Cancels all PLANEJADA occurrences. No new occurrences will be generated.

**Permissions**: ROUTE_TEMPLATES:MANAGE

**Request body**: none

**Response 200**:
```json
{
  "template": { ...template with status: "INATIVO"... },
  "cancelledOccurrences": 8
}
```

**Response 404**: Template not found.
**Response 409**: Template already INATIVO.

---

## POST /route-templates/:id/activate

Reactivate an INATIVO template with a new start date. Resumes occurrence generation from that date.

**Permissions**: ROUTE_TEMPLATES:MANAGE

**Request body**:
```json
{
  "startDate": "2026-08-01"
}
```

**Validations**:
- `startDate`: valid ISO date, >= today

**Response 200**:
```json
{
  "template": { ...template with status: "ATIVO"... },
  "generatedOccurrences": 8
}
```

**Response 404**: Template not found.
**Response 409**: Template already ATIVO.

---

## POST /route-templates/:id/duplicate

Duplicate a template as a new template. New template has `name + " (cópia)"`, `startDate` and `endDate` are cleared (must be set before saving), status is ATIVO pending user confirmation.

**Permissions**: ROUTE_TEMPLATES:MANAGE

**Request body**: none

**Response 200**: Returns a draft of the new template (not yet persisted). The client opens the "create template" form pre-filled with this data.

```json
{
  "draft": {
    "name": "Rota Terças e Quintas (cópia)",
    "recurrenceDays": [2, 4],
    "startDate": null,
    "endDate": null,
    "driverId": "uuid",
    "vehicleId": "uuid",
    "points": [
      { "collectionPointId": "uuid", "sequence": 1 }
    ],
    "notes": "..."
  }
}
```

---

## POST /route-templates/:id/generate

Manually trigger occurrence generation for a single template (fills up to configured horizon). Idempotent — does not create duplicates.

**Permissions**: ROUTE_TEMPLATES:MANAGE (ADMIN only for manual trigger)

**Response 200**:
```json
{
  "generatedOccurrences": 3
}
```
