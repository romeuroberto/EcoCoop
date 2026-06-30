# REST API Contracts: Fase 2 — Cadastros Base Operacionais

**Feature**: `002-operational-base-data` | **Date**: 2026-06-29

> Base path: `/api/v1` — idêntico à Fase 1.
> Autenticação: `Authorization: Bearer <accessToken>` em todos os endpoints, exceto onde indicado como público.
> Respostas de erro seguem o padrão da Fase 1: `{ statusCode, message, code? }`.
>
> **Paginação padrão** (todos os endpoints de listagem): parâmetros `page` (int, default 1), `limit` (int, default 20, max 100), `search` (string), `status` (`active` | `inactive` | `all`, default `active`). Resposta inclui metadados de paginação: `{ data: [...], total, page, limit }`.
>
> **Fora do escopo desta fase**: `buyerId` no JWT/token, portal completo do comprador, filtros avançados, relatórios, exportação de dados.

---

## Permissões por Módulo

| Módulo | ADMIN | MANAGER | Outros |
|---|---|---|---|
| `MEMBER_ROLES` | MANAGE | READ | — |
| `MEMBERS` | MANAGE | MANAGE | — |
| `MATERIALS` | MANAGE | READ | — |
| `UNITS` | MANAGE | READ | — |
| `BUYERS` | MANAGE | MANAGE | — |
| `VEHICLES` | MANAGE | MANAGE | — |
| `EPI_TYPES` | MANAGE | READ | — |
| `COST_CENTERS` | MANAGE | READ | — |

---

## 1. Member Roles — `/api/v1/member-roles`

### GET /api/v1/member-roles

Lista funções de cooperado. Parâmetros de query opcionais (padrão de todos os endpoints de listagem):

| Query | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int | `1` | Página atual |
| `limit` | int | `20` | Registros por página (máx 100) |
| `status` | `active` \| `inactive` \| `all` | `active` | Filtro de status |
| `search` | string | — | Busca por nome (case-insensitive) |

**Permissão**: `MEMBER_ROLES:READ`

**Response 200** (envelope paginado — padrão de todos os endpoints de listagem):
```json
{
  "data": [
    { "id": "uuid", "name": "Triador", "isDefault": true, "isActive": true }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

### POST /api/v1/member-roles

Cria nova função de cooperado.

**Permissão**: `MEMBER_ROLES:MANAGE`

**Request body**:
```json
{ "name": "Administrativo" }
```

**Response 201**: objeto MemberRole criado.

**Errors**: `409 MEMBER_ROLE_NAME_CONFLICT` — nome já existente.

---

### PATCH /api/v1/member-roles/:id

Atualiza nome ou status de uma função.

**Permissão**: `MEMBER_ROLES:MANAGE`

**Request body** (todos opcionais):
```json
{ "name": "Administrativo", "isActive": false }
```

**Errors**:
- `404 MEMBER_ROLE_NOT_FOUND`
- `409 MEMBER_ROLE_NAME_CONFLICT`
- `422 CANNOT_DEACTIVATE_DEFAULT_WITH_MEMBERS` — função padrão com members ativos vinculados

---

## 2. Members — `/api/v1/members`

### GET /api/v1/members

| Query | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int | `1` | Página atual |
| `limit` | int | `20` | Registros por página (máx 100) |
| `status` | `active` \| `inactive` \| `all` | `active` | Filtro de status |
| `search` | string | — | Busca por nome, CPF, telefone ou e-mail |

**Permissão**: `MEMBERS:READ`

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "João Silva",
      "cpf": "123.456.789-09",
      "phone": "(11) 91234-5678",
      "email": null,
      "admittedAt": "2024-01-15",
      "role": { "id": "uuid", "name": "Triador" },
      "isActive": true,
      "userId": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### POST /api/v1/members

**Permissão**: `MEMBERS:MANAGE`

**Request body**:
```json
{
  "name": "João Silva",
  "cpf": "123.456.789-09",
  "phone": "(11) 91234-5678",
  "email": "joao@example.com",
  "admittedAt": "2024-01-15",
  "roleId": "uuid",
  "notes": "Cooperado desde a fundação"
}
```

**Response 201**: objeto Member completo com role aninhada.

**Errors**:
- `409 MEMBER_CPF_CONFLICT` — CPF já cadastrado
- `400 MEMBER_ROLE_INACTIVE` — roleId referencia função inativa
- `404 MEMBER_ROLE_NOT_FOUND`

---

### GET /api/v1/members/:id

**Permissão**: `MEMBERS:READ`

**Response 200**: Member completo com role e userId.

---

### PATCH /api/v1/members/:id

**Permissão**: `MEMBERS:MANAGE`

**Request body** (todos opcionais):
```json
{ "name": "...", "phone": "...", "email": "...", "roleId": "uuid", "isActive": false, "notes": "..." }
```

**Errors**: `404 MEMBER_NOT_FOUND`, `409 MEMBER_CPF_CONFLICT`, `400 MEMBER_ROLE_INACTIVE`

---

### PATCH /api/v1/members/:id/link-user

Vincula ou desvincula um usuário de acesso ao cooperado.

**Permissão**: `MEMBERS:MANAGE`

**Request body**:
```json
{ "userId": "uuid" }
```

Para desvincular: `{ "userId": null }`

**Errors**:
- `404 MEMBER_NOT_FOUND`, `404 USER_NOT_FOUND`
- `409 USER_ALREADY_LINKED` — usuário já vinculado a outro member ou buyer
- `422 USER_NOT_MEMBER_PROFILE` — usuário tem perfil incompatível

---

## 3. Material Categories — `/api/v1/material-categories`

### GET /api/v1/material-categories

| Query | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int | `1` | Página atual |
| `limit` | int | `20` | Registros por página (máx 100) |
| `status` | `active` \| `inactive` \| `all` | `active` | |
| `search` | string | — | Busca por nome |
| `includeSubcategories` | boolean | `false` | Inclui subcategorias aninhadas |

**Permissão**: `MATERIALS:READ`

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Plástico",
      "description": "Materiais plásticos recicláveis",
      "isActive": true
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### POST /api/v1/material-categories

**Permissão**: `MATERIALS:MANAGE`

**Request body**: `{ "name": "Plástico", "description": "..." }`

**Response 201**: categoria criada.

**Errors**: `409 CATEGORY_NAME_CONFLICT`

---

### PATCH /api/v1/material-categories/:id

**Permissão**: `MATERIALS:MANAGE`

**Errors**: `409 CANNOT_DEACTIVATE_CATEGORY_WITH_ACTIVE_SUBCATEGORIES` — com lista de subcategorias ativas no campo `details`.

---

## 4. Material Subcategories — `/api/v1/material-subcategories`

### GET /api/v1/material-subcategories

| Query | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int | `1` | Página atual |
| `limit` | int | `20` | Registros por página (máx 100) |
| `categoryId` | uuid | — | Filtra por categoria |
| `status` | `active` \| `inactive` \| `all` | `active` | |
| `search` | string | — | Busca por nome |

**Permissão**: `MATERIALS:READ`

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "categoryId": "uuid",
      "name": "PET",
      "defaultUnit": { "id": "uuid", "name": "Quilograma", "symbol": "kg" },
      "isSellable": true,
      "acceptsStock": true,
      "notes": null,
      "isActive": true
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### POST /api/v1/material-subcategories

**Permissão**: `MATERIALS:MANAGE`

**Request body**:
```json
{
  "categoryId": "uuid",
  "name": "PET",
  "defaultUnitId": "uuid",
  "isSellable": true,
  "acceptsStock": true,
  "notes": ""
}
```

**Errors**: `409 SUBCATEGORY_NAME_CONFLICT_IN_CATEGORY`, `400 UNIT_INACTIVE`

---

### PATCH /api/v1/material-subcategories/:id

**Permissão**: `MATERIALS:MANAGE`

**Request body** (todos opcionais): `name`, `defaultUnitId`, `isSellable`, `acceptsStock`, `notes`, `isActive`

---

## 5. Units of Measure — `/api/v1/units`

### GET /api/v1/units

| Query | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int | `1` | Página atual |
| `limit` | int | `20` | Registros por página (máx 100) |
| `status` | `active` \| `inactive` \| `all` | `active` | |
| `search` | string | — | Busca por nome, símbolo |

**Permissão**: `UNITS:READ`

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid", "name": "Quilograma", "symbol": "kg",
      "baseUnit": null, "conversionFactor": null, "isActive": true
    },
    {
      "id": "uuid", "name": "Tonelada", "symbol": "t",
      "baseUnit": { "id": "uuid", "name": "Quilograma", "symbol": "kg" },
      "conversionFactor": 1000, "isActive": true
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 20
}
```

---

### POST /api/v1/units

**Permissão**: `UNITS:MANAGE`

**Request body**:
```json
{ "name": "Tonelada", "symbol": "t", "baseUnitId": "uuid", "conversionFactor": 1000 }
```

**Errors**: `409 UNIT_NAME_CONFLICT`, `409 UNIT_SYMBOL_CONFLICT`, `400 UNIT_SELF_REFERENCE`, `404 BASE_UNIT_NOT_FOUND`

---

### PATCH /api/v1/units/:id

**Permissão**: `UNITS:MANAGE`

---

## 6. Buyers — `/api/v1/buyers`

### GET /api/v1/buyers

| Query | Default | Descrição |
|---|---|---|
| `status` | `active` | `active` \| `inactive` \| `all` |
| `search` | — | Busca por razão social/nome, CPF/CNPJ, telefone, e-mail |

**Permissão**: `BUYERS:READ`

---

### POST /api/v1/buyers

**Permissão**: `BUYERS:MANAGE`

**Request body**:
```json
{
  "legalName": "Recicla Mais Ltda",
  "documentType": "CNPJ",
  "documentNumber": "12.345.678/0001-90",
  "phone": "(11) 3456-7890",
  "email": "compras@reciclamais.com",
  "addressStreet": "Rua das Indústrias",
  "addressNumber": "100",
  "addressComplement": "Galpão A",
  "addressCity": "São Paulo",
  "addressState": "SP",
  "addressZip": "01310-100",
  "notes": ""
}
```

**Response 201**: Buyer criado.

**Errors**: `409 BUYER_DOCUMENT_CONFLICT`

---

### GET /api/v1/buyers/:id

**Permissão**: `BUYERS:READ`

---

### PATCH /api/v1/buyers/:id

**Permissão**: `BUYERS:MANAGE`

---

### PATCH /api/v1/buyers/:id/link-user

Vincula/desvincula usuário BUYER ao comprador.

**Permissão**: `BUYERS:MANAGE`

**Request body**: `{ "userId": "uuid" }` ou `{ "userId": null }`

**Errors**: `409 USER_ALREADY_LINKED`, `422 USER_NOT_BUYER_PROFILE`

---

## 7. Vehicles — `/api/v1/vehicles`

### GET /api/v1/vehicles

| Query | Default | Descrição |
|---|---|---|
| `status` | `active` | `active` \| `inactive` \| `all` |
| `search` | — | Busca por placa, modelo, tipo |

**Permissão**: `VEHICLES:READ`

**Response 200**:
```json
[
  {
    "id": "uuid", "plate": "ABC-1234", "type": "TRUCK", "model": "VW Delivery 9.170",
    "capacityValue": 9000, "capacityUnit": { "id": "uuid", "symbol": "kg" },
    "capacityNotes": null, "isActive": true
  }
]
```

---

### POST /api/v1/vehicles

**Permissão**: `VEHICLES:MANAGE`

**Request body**:
```json
{
  "plate": "ABC-1234",
  "type": "TRUCK",
  "model": "VW Delivery 9.170",
  "capacityValue": 9000,
  "capacityUnitId": "uuid",
  "capacityNotes": null,
  "notes": ""
}
```

**Errors**: `409 VEHICLE_PLATE_CONFLICT`, `400 CAPACITY_UNIT_REQUIRED_WITH_VALUE`, `400 UNIT_INACTIVE`

---

### PATCH /api/v1/vehicles/:id

**Permissão**: `VEHICLES:MANAGE`

---

## 8. EPI Types — `/api/v1/epi-types`

### GET /api/v1/epi-types

| Query | Default | Descrição |
|---|---|---|
| `status` | `active` | `active` \| `inactive` \| `all` |
| `search` | — | Busca por nome |

**Permissão**: `EPI_TYPES:READ`

---

### POST /api/v1/epi-types

**Permissão**: `EPI_TYPES:MANAGE`

**Request body**: `{ "name": "Luva de raspa", "defaultValidityDays": 180 }`

**Errors**: `409 EPI_TYPE_NAME_CONFLICT`

---

### PATCH /api/v1/epi-types/:id

**Permissão**: `EPI_TYPES:MANAGE`

---

## 9. Cost Centers — `/api/v1/cost-centers`

### GET /api/v1/cost-centers

| Query | Default | Descrição |
|---|---|---|
| `status` | `active` | `active` \| `inactive` \| `all` |
| `search` | — | Busca por nome, código |

**Permissão**: `COST_CENTERS:READ`

---

### POST /api/v1/cost-centers

**Permissão**: `COST_CENTERS:MANAGE`

**Request body**: `{ "name": "Logística", "code": "LOG-001", "description": "..." }`

**Errors**: `409 COST_CENTER_NAME_CONFLICT`, `409 COST_CENTER_CODE_CONFLICT`

---

### PATCH /api/v1/cost-centers/:id

**Permissão**: `COST_CENTERS:MANAGE`

---

## Padrão de Resposta de Erro

```json
{
  "statusCode": 422,
  "message": "Não é possível inativar esta categoria: existem 2 subcategorias ativas vinculadas.",
  "code": "CANNOT_DEACTIVATE_CATEGORY_WITH_ACTIVE_SUBCATEGORIES",
  "details": ["PET", "PEAD"]
}
```

O campo `details` é opcional e usado quando o erro requer listagem de itens relacionados.
