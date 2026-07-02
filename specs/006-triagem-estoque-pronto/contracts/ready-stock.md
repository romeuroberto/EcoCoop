# API Contract: Ready Stock (Estoque Pronto)

**Auth**: JWT Bearer (todos os endpoints)

---

## GET /ready-stock

Retorna saldo atual de estoque pronto por subcategoria e unidade.

**Permission**: `READY_STOCK:READ` (SORTER, MANAGER, ADMIN)

### Query params

| Param | Tipo | Descrição |
|-------|------|-----------|
| `subcategoryId` | uuid | Filtrar por material |
| `unitId` | uuid | Filtrar por unidade |
| `includeInactive` | boolean | Incluir subcategorias inativas (default: false) |

### Response 200

```json
{
  "data": [
    {
      "subcategory": {
        "id": "uuid",
        "name": "PET Cristal",
        "category": { "id": "uuid", "name": "Plástico" }
      },
      "unit": { "id": "uuid", "name": "Quilograma", "symbol": "kg" },
      "balance": "235.500",
      "eventCount": 12
    }
  ],
  "calculatedAt": "2026-07-02T10:00:00.000Z"
}
```

---

## GET /ready-stock/movements

Lista o histórico de movimentações do estoque pronto com paginação.

**Permission**: `READY_STOCK:READ`

### Query params

| Param | Tipo | Descrição |
|-------|------|-----------|
| `subcategoryId` | uuid | Filtrar por material |
| `unitId` | uuid | Filtrar por unidade |
| `type` | `TRIAGEM_OUTPUT\|AJUSTE\|ESTORNO` | Filtrar por tipo |
| `from` | ISO date | Data a partir de |
| `to` | ISO date | Data até |
| `page` | int (default: 1) | Página |
| `limit` | int (default: 20, max: 100) | Itens por página |

### Response 200

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "TRIAGEM_OUTPUT",
      "subcategory": { "id": "uuid", "name": "PET Cristal" },
      "unit": { "id": "uuid", "symbol": "kg" },
      "quantity": "80.000",
      "sortingOperationId": "uuid",
      "adjustmentId": null,
      "user": { "id": "uuid", "email": "triador@coop.com" },
      "createdAt": "2026-07-02T10:00:00.000Z"
    },
    {
      "id": "uuid",
      "type": "AJUSTE",
      "subcategory": { "id": "uuid", "name": "PET Cristal" },
      "unit": { "id": "uuid", "symbol": "kg" },
      "quantity": "-5.000",
      "sortingOperationId": null,
      "adjustmentId": "uuid",
      "user": { "id": "uuid", "email": "gestor@coop.com" },
      "createdAt": "2026-07-02T11:00:00.000Z"
    }
  ],
  "total": 58,
  "page": 1,
  "limit": 20
}
```

---

## POST /ready-stock-adjustments

Registra um ajuste manual auditado de estoque pronto.

**Permission**: `READY_STOCK:CREATE_ADJUSTMENT` (MANAGER, ADMIN)

### Request Body

```json
{
  "subcategoryId": "uuid",
  "unitId": "uuid",
  "quantity": -5.000,           // positivo = entrada; negativo = saída
  "justification": "Material danificado durante armazenamento — confirmado por inspeção física"
}
```

**Validation rules:**
- `quantity != 0`
- `justification` não vazio
- Se `quantity < 0`: `saldo_atual + quantity >= 0`

### Response 201 Created

```json
{
  "id": "uuid",
  "subcategory": { "id": "uuid", "name": "PET Cristal" },
  "unit": { "id": "uuid", "symbol": "kg" },
  "quantity": "-5.000",
  "justification": "Material danificado durante armazenamento — confirmado por inspeção física",
  "user": { "id": "uuid", "email": "gestor@coop.com" },
  "createdAt": "2026-07-02T11:00:00.000Z",
  "stockEventId": "uuid"
}
```

### Error responses

| Code | `code` | Condição |
|------|--------|----------|
| 422 | `QUANTITY_CANNOT_BE_ZERO` | quantity = 0 |
| 422 | `JUSTIFICATION_REQUIRED` | justification vazio |
| 409 | `ADJUSTMENT_WOULD_CAUSE_NEGATIVE_BALANCE` | saldo pronto ficaria negativo |
| 404 | `MATERIAL_SUBCATEGORY_NOT_FOUND` | subcategoryId inválido |
| 404 | `UNIT_NOT_FOUND` | unitId inválido |

---

## GET /ready-stock-adjustments

Lista ajustes com paginação.

**Permission**: `READY_STOCK:READ`

### Query params

| Param | Tipo |
|-------|------|
| `subcategoryId` | uuid |
| `userId` | uuid |
| `from` | ISO date |
| `to` | ISO date |
| `page` | int |
| `limit` | int |

### Response 200

```json
{
  "data": [
    {
      "id": "uuid",
      "subcategory": { "id": "uuid", "name": "PET Cristal" },
      "unit": { "id": "uuid", "symbol": "kg" },
      "quantity": "-5.000",
      "justification": "Material danificado...",
      "user": { "id": "uuid", "email": "gestor@coop.com" },
      "createdAt": "2026-07-02T11:00:00.000Z"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```
