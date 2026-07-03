# API Contracts: Vendas Operacionais (007)

Base prefix: `/api/v1`

All endpoints require a valid session cookie (existing auth middleware).
Permissions are enforced server-side via `@RequirePermission` decorator.

---

## POST /sales

**Permission**: `SALES` / `CREATE`

Register a new sale and immediately consume ready stock.

### Request Body

```json
{
  "buyerId": "uuid",
  "notes": "optional string",
  "dueDate": "2026-08-02",          // optional ISO date; defaults to createdAt + 30 days
  "items": [
    {
      "subcategoryId": "uuid",
      "unitId": "uuid",
      "quantity": 50.000,
      "unitPrice": 2.5000
    }
  ]
}
```

### Validation

- `buyerId`: required, must reference an active Buyer
- `items`: required, min 1 item
- `items[].quantity`: required, > 0
- `items[].unitPrice`: required, ≥ 0
- `items[].subcategoryId` + `items[].unitId`: must have sufficient ready stock balance

### Response `201 Created`

```json
{
  "id": "uuid",
  "buyer": { "id": "uuid", "legalName": "Recicla SP" },
  "status": "PENDENTE_ENTREGA",
  "totalAmount": "125.00",
  "notes": null,
  "createdAt": "2026-07-03T10:00:00Z",
  "user": { "id": "uuid", "email": "gestor@ecocoop.local" },
  "items": [
    {
      "id": "uuid",
      "subcategory": { "id": "uuid", "name": "PET" },
      "unit": { "id": "uuid", "symbol": "kg" },
      "quantity": "50.000",
      "unitPrice": "2.5000",
      "subtotal": "125.00"
    }
  ],
  "accountReceivable": {
    "id": "uuid",
    "amount": "125.00",
    "dueDate": "2026-08-02",
    "status": "A_RECEBER"
  },
  "warnings": []
}
```

> **`warnings`** is an array of string codes. Present when `unitPrice = 0` for any item: `["ZERO_PRICE_ITEM"]`. Empty array when no warnings.

### Error Responses

| Status | Code | Scenario |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | Missing/invalid fields |
| 404 | `BUYER_NOT_FOUND` | buyerId doesn't exist |
| 409 | `BUYER_INACTIVE` | Buyer is not active |
| 409 | `INSUFFICIENT_READY_STOCK` | Balance < requested quantity for an item (includes which subcategoryId) |
| 422 | `UNIT_MISMATCH` | unitId does not match the material's defaultUnitId (includes subcategoryId, expectedUnitId) |

---

## GET /sales

**Permission**: `SALES` / `READ`

List sales with filters and pagination.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `buyerId` | uuid | Filter by buyer |
| `status` | string | PENDENTE_ENTREGA \| ENTREGUE \| CANCELADA |
| `subcategoryId` | uuid | Filter by material (any item) |
| `from` | ISO date | createdAt >= from |
| `to` | ISO date | createdAt <= to |
| `page` | int | default 1 |
| `limit` | int | default 20, max 100 |

### Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "buyer": { "id": "uuid", "legalName": "Recicla SP" },
      "status": "PENDENTE_ENTREGA",
      "totalAmount": "125.00",
      "itemsCount": 1,
      "createdAt": "2026-07-03T10:00:00Z",
      "user": { "id": "uuid", "email": "gestor@ecocoop.local" }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

## GET /sales/:id

**Permission**: `SALES` / `READ`

Get full sale detail including all items, account receivable, and event timeline.

### Response `200 OK`

```json
{
  "id": "uuid",
  "buyer": { "id": "uuid", "legalName": "Recicla SP", "documentNumber": "12.345.678/0001-99" },
  "status": "PENDENTE_ENTREGA",
  "totalAmount": "125.00",
  "notes": null,
  "createdAt": "2026-07-03T10:00:00Z",
  "deliveredAt": null,
  "deliveredBy": null,
  "cancelReason": null,
  "cancelledAt": null,
  "cancelledBy": null,
  "user": { "id": "uuid", "email": "gestor@ecocoop.local" },
  "items": [
    {
      "id": "uuid",
      "subcategory": { "id": "uuid", "name": "PET" },
      "unit": { "id": "uuid", "symbol": "kg" },
      "quantity": "50.000",
      "unitPrice": "2.5000",
      "subtotal": "125.00"
    }
  ],
  "accountReceivable": {
    "id": "uuid",
    "amount": "125.00",
    "dueDate": "2026-08-02",
    "status": "A_RECEBER"
  },
  "timeline": [
    { "event": "CREATED",   "at": "2026-07-03T10:00:00Z", "by": { "id": "uuid", "email": "gestor@ecocoop.local" } },
    { "event": "DELIVERED", "at": null,                   "by": null },
    { "event": "CANCELLED", "at": null,                   "by": null }
  ]
}
```

> **Timeline derivation** (no new table): the service constructs `timeline` from existing `Sale` fields:
>
> | Event | Condition | `at` | `by` |
> |-------|-----------|------|------|
> | `CREATED` | always | `createdAt` | `user` |
> | `DELIVERED` | `deliveredAt != null` | `deliveredAt` | `deliveredBy` |
> | `CANCELLED` | `cancelledAt != null` | `cancelledAt` | `cancelledBy` |
>
> Only events that have already occurred are non-null. The list always includes all three objects so consumers can render a fixed-position timeline; null `at`/`by` means the event has not yet occurred.
```

### Error Responses

| Status | Code | Scenario |
|--------|------|----------|
| 404 | `SALE_NOT_FOUND` | id doesn't exist |

---

## PATCH /sales/:id/deliver

**Permission**: `SALES` / `DELIVER`

Confirm physical delivery of the sale.

### Request Body

```json
{
  "deliveredAt": "2026-07-04T14:30:00Z"   // optional; defaults to server now()
}
```

### Response `200 OK`

```json
{
  "id": "uuid",
  "status": "ENTREGUE",
  "deliveredAt": "2026-07-04T14:30:00Z",
  "deliveredBy": { "id": "uuid", "email": "gestor@ecocoop.local" }
}
```

### Error Responses

| Status | Code | Scenario |
|--------|------|----------|
| 404 | `SALE_NOT_FOUND` | id doesn't exist |
| 409 | `SALE_NOT_DELIVERABLE` | status ≠ PENDENTE_ENTREGA |

---

## PATCH /sales/:id/cancel

**Permission**: `SALES` / `CANCEL`

Cancel a sale and reverse all ready stock events.

### Request Body

```json
{
  "cancelReason": "Comprador desistiu da compra"
}
```

### Response `200 OK`

```json
{
  "id": "uuid",
  "status": "CANCELADA",
  "cancelReason": "Comprador desistiu da compra",
  "cancelledAt": "2026-07-03T11:00:00Z",
  "cancelledBy": { "id": "uuid", "email": "gestor@ecocoop.local" }
}
```

### Error Responses

| Status | Code | Scenario |
|--------|------|----------|
| 404 | `SALE_NOT_FOUND` | id doesn't exist |
| 409 | `SALE_NOT_CANCELLABLE` | status ≠ PENDENTE_ENTREGA |
| 422 | `CANCEL_REASON_REQUIRED` | cancelReason missing or blank |

---

## GET /accounts-receivable

**Permission**: `ACCOUNTS_RECEIVABLE` / `READ`

List accounts receivable with filters.

### Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `buyerId` | uuid | Filter by buyer |
| `status` | string | A_RECEBER \| CANCELADA |
| `from` | ISO date | dueDate >= from |
| `to` | ISO date | dueDate <= to |
| `page` | int | default 1 |
| `limit` | int | default 20, max 100 |

### Response `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "sale": { "id": "uuid", "createdAt": "2026-07-03T10:00:00Z", "deliveredAt": null },
      "buyer": { "id": "uuid", "legalName": "Recicla SP" },
      "amount": "125.00",
      "dueDate": "2026-08-02",
      "status": "A_RECEBER"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```
