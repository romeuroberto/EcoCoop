# API Contract: Sorting Operations (Triagem)

**Base path**: `/sorting-operations`
**Auth**: JWT Bearer (todos os endpoints)
**Permission module**: `SORTING`

---

## POST /sorting-operations

Registra uma nova triagem. Consome saldo bruto e gera material pronto atomicamente.

**Permission**: `SORTING:CREATE` (SORTER, MANAGER, ADMIN)

### Request Body

```json
{
  "subcategoryId": "uuid",          // material bruto a ser triado
  "unitId": "uuid",                 // unidade de medida
  "processedQuantity": 90.000,      // quantidade processada (> 0)
  "outputs": [
    {
      "subcategoryId": "uuid",      // material pronto gerado
      "unitId": "uuid",
      "quantity": 80.000            // > 0
    }
  ],
  "rejects": [                      // opcional — pode ser array vazio
    {
      "type": "REJEITO",            // "REJEITO" | "PERDA"  (PERDA_INERENTE é auto)
      "subcategoryId": "uuid",      // opcional
      "unitId": "uuid",
      "quantity": 5.000,            // > 0
      "description": "PET contaminado"  // obrigatório se subcategoryId ausente
    }
  ]
}
```

**Validation rules:**
- `processedQuantity > 0`
- `outputs` deve ter ao menos 1 item
- `SUM(outputs.quantity) + SUM(rejects.quantity) <= processedQuantity`
- Se `SUM < processedQuantity` → sistema auto-cria `SortingReject` tipo `PERDA_INERENTE`
- `processedQuantity <= saldo_bruto_disponível`

### Response 201 Created

```json
{
  "id": "uuid",
  "status": "CONCLUIDA",
  "subcategory": { "id": "uuid", "name": "PET" },
  "unit": { "id": "uuid", "name": "Quilograma", "symbol": "kg" },
  "processedQuantity": "90.000",
  "outputs": [
    {
      "id": "uuid",
      "subcategory": { "id": "uuid", "name": "PET Cristal" },
      "unit": { "id": "uuid", "symbol": "kg" },
      "quantity": "80.000"
    }
  ],
  "rejects": [
    {
      "id": "uuid",
      "type": "REJEITO",
      "subcategory": { "id": "uuid", "name": "PET Colorido" },
      "quantity": "5.000",
      "description": null
    },
    {
      "id": "uuid",
      "type": "PERDA_INERENTE",
      "subcategory": null,
      "quantity": "5.000",
      "description": "Perda inerente ao processo"
    }
  ],
  "user": { "id": "uuid", "email": "triador@coop.com" },
  "createdAt": "2026-07-02T10:00:00.000Z"
}
```

### Error responses

| Code | `code` | Condição |
|------|--------|----------|
| 422 | `PROCESSED_QUANTITY_MUST_BE_POSITIVE` | processedQuantity ≤ 0 |
| 422 | `OUTPUTS_SUM_EXCEEDS_PROCESSED` | soma outputs+rejects > processedQuantity |
| 409 | `INSUFFICIENT_RAW_STOCK` | processedQuantity > saldo bruto disponível |
| 404 | `MATERIAL_SUBCATEGORY_NOT_FOUND` | subcategoryId inválido |
| 422 | `REJECT_MISSING_DESCRIPTION` | rejeito sem subcategoryId e sem description |

---

## GET /sorting-operations

Lista triagens com paginação e filtros.

**Permission**: `SORTING:READ` (SORTER, MANAGER, ADMIN)

### Query params

| Param | Tipo | Descrição |
|-------|------|-----------|
| `subcategoryId` | uuid | Filtrar por material bruto |
| `status` | `CONCLUIDA\|CANCELADA` | Filtrar por status |
| `userId` | uuid | Filtrar por responsável |
| `from` | ISO date | Data de criação a partir de |
| `to` | ISO date | Data de criação até |
| `page` | int (default: 1) | Página |
| `limit` | int (default: 20, max: 100) | Itens por página |

### Response 200

```json
{
  "data": [
    {
      "id": "uuid",
      "status": "CONCLUIDA",
      "subcategory": { "id": "uuid", "name": "PET" },
      "unit": { "id": "uuid", "symbol": "kg" },
      "processedQuantity": "90.000",
      "outputsCount": 1,
      "rejectsCount": 2,
      "user": { "id": "uuid", "email": "triador@coop.com" },
      "createdAt": "2026-07-02T10:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

## GET /sorting-operations/:id

Retorna detalhes completos de uma triagem.

**Permission**: `SORTING:READ`

### Response 200

Mesmo formato do POST 201, incluindo `cancelReason`, `cancelledBy`, `cancelledAt` quando status `CANCELADA`.

### Error responses

| Code | `code` | Condição |
|------|--------|----------|
| 404 | `SORTING_OPERATION_NOT_FOUND` | id inválido |

---

## DELETE /sorting-operations/:id

Cancela uma triagem com status `CONCLUIDA`. Estorna saldos bruto e pronto atomicamente.

**Permission**: `SORTING:CANCEL` (MANAGER, ADMIN)

### Request Body

```json
{
  "cancelReason": "Erro de pesagem — material trocado"  // obrigatório, não vazio
}
```

**Validation rules:**
- Triagem deve ter status `CONCLUIDA`
- Para cada `SortingOutput`: `saldo_pronto_atual - output.quantity >= 0`

### Response 200

```json
{
  "id": "uuid",
  "status": "CANCELADA",
  "cancelReason": "Erro de pesagem — material trocado",
  "cancelledBy": { "id": "uuid", "email": "gestor@coop.com" },
  "cancelledAt": "2026-07-02T14:30:00.000Z"
}
```

### Error responses

| Code | `code` | Condição |
|------|--------|----------|
| 404 | `SORTING_OPERATION_NOT_FOUND` | id inválido |
| 409 | `SORTING_ALREADY_CANCELLED` | status já é CANCELADA |
| 409 | `CANCELLATION_WOULD_CAUSE_NEGATIVE_READY_STOCK` | estorno resultaria em saldo pronto negativo |
| 422 | `CANCEL_REASON_REQUIRED` | cancelReason vazio |
