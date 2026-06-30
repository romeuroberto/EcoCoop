# REST API Contracts: Fase 3 — Coleta, Rotas e Entrada de Material Bruto

**Feature**: `003-collection-routes-raw-material` | **Date**: 2026-06-30

> Base path: `/api/v1` — idêntico às fases anteriores.
> Autenticação: `Authorization: Bearer <accessToken>` em todos os endpoints.
> Erros seguem o padrão: `{ statusCode, message, code? }`.
>
> **Paginação padrão** (endpoints de listagem): `page` (int, default 1), `limit` (int, default 20, máx 100), `search` (string), `status` (`active` | `inactive` | `all`, default `active`). Resposta: `{ data: [...], total, page, limit }`.
>
> **Fora do escopo desta fase**: geocoding manual retroativo em lote, triagem, portal do comprador, relatórios avançados.

---

## Permissões por Módulo

| Módulo | ADMIN | MANAGER | DRIVER | SORTER |
|---|---|---|---|---|
| `COLLECTION_POINTS` | MANAGE | MANAGE | — (sem acesso) | — |
| `COLLECTION_ROUTES` | MANAGE | MANAGE | READ (próprias) + EXECUTE | — |
| `RAW_MATERIAL_ENTRIES` | MANAGE | MANAGE | CREATE (rotas próprias) | READ (se permitido) |
| `RAW_MATERIAL_BALANCE` | READ | READ | — | READ (se permitido) |

> **MANAGE** = CREATE + READ + UPDATE + MANAGE_TEAM + EXECUTE + REVERSAL conforme o módulo.
> **EXECUTE** = iniciar / concluir execução de rota.
> **Ownership check** (DRIVER): além da permissão de perfil, o guard valida que o DRIVER é o `driverId` ou está em `routeTeamMembers` da rota.

---

## 1. Collection Points — `/api/v1/collection-points`

### GET /api/v1/collection-points

Lista pontos de coleta.

**Permissão**: `COLLECTION_POINTS:READ` (ADMIN, MANAGER)

| Query | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int | `1` | Página |
| `limit` | int | `20` | Registros por página (máx 100) |
| `status` | `active` \| `inactive` \| `all` | `active` | Filtro de status |
| `search` | string | — | Busca por nome ou endereço (case-insensitive) |
| `locationPending` | boolean | — | Filtrar somente pendentes de geocoding |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Ponto Centro",
      "address": "Rua das Flores, 100, Centro",
      "latitude": -23.5505,
      "longitude": -46.6333,
      "locationPending": false,
      "reference": "Próximo ao mercado",
      "isActive": true,
      "createdAt": "2026-06-30T10:00:00Z",
      "updatedAt": "2026-06-30T10:00:00Z"
    }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/v1/collection-points/:id

Retorna um ponto de coleta pelo ID.

**Permissão**: `COLLECTION_POINTS:READ`

**Response 200**: objeto CollectionPoint completo (mesmo schema acima).

**Errors**: `404 COLLECTION_POINT_NOT_FOUND`

---

### POST /api/v1/collection-points

Cria novo ponto de coleta. O sistema tenta geocodificar o endereço de forma assíncrona após o salvamento.

**Permissão**: `COLLECTION_POINTS:MANAGE`

**Request body**:
```json
{
  "name": "Ponto Centro",
  "address": "Rua das Flores, 100, Centro, São Paulo, SP",
  "reference": "Próximo ao mercado",
  "latitude": null,
  "longitude": null
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | sim | Nome do ponto |
| `address` | string | sim | Endereço completo para geocoding |
| `reference` | string | não | Observação de referência |
| `latitude` | number | não | Latitude manual (−90 a 90) |
| `longitude` | number | não | Longitude manual (−180 a 180) |

**Geocoding behavior**: Se `latitude`/`longitude` forem fornecidos → `locationPending=false`. Caso contrário → geocoding assíncrono; se falhar → `locationPending=true`.

**Response 201**:
```json
{
  "id": "uuid",
  "name": "Ponto Centro",
  "address": "Rua das Flores, 100, Centro, São Paulo, SP",
  "latitude": null,
  "longitude": null,
  "locationPending": true,
  "reference": "Próximo ao mercado",
  "isActive": true,
  "createdAt": "2026-06-30T10:00:00Z",
  "updatedAt": "2026-06-30T10:00:00Z"
}
```

**Errors**: `422 COLLECTION_POINT_ADDRESS_REQUIRED` — endereço em branco.

---

### PATCH /api/v1/collection-points/:id

Atualiza dados de um ponto de coleta. Todos os campos são opcionais.

**Permissão**: `COLLECTION_POINTS:MANAGE`

**Request body** (todos opcionais):
```json
{
  "name": "Ponto Centro Atualizado",
  "address": "Rua das Flores, 100, Centro",
  "reference": "Ao lado da padaria",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "isActive": false
}
```

**Behavior**: Se `latitude` e `longitude` válidos forem fornecidos → `locationPending=false` + auditoria com `previousState`/`newState`. Se `address` for alterado sem coordenadas → nova tentativa de geocoding assíncrona.

**Errors**:
- `404 COLLECTION_POINT_NOT_FOUND`
- `422 COLLECTION_POINT_ADDRESS_REQUIRED` — tentativa de remover endereço

---

## 2. Collection Routes — `/api/v1/collection-routes`

### GET /api/v1/collection-routes

Lista rotas de coleta.

**Permissão**: `COLLECTION_ROUTES:READ`
- ADMIN/MANAGER: todas as rotas
- DRIVER: apenas rotas em que é `driverId` ou está em `teamMembers`

| Query | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int | `1` | Página |
| `limit` | int | `20` | Registros por página (máx 100) |
| `search` | string | — | Busca por nome (case-insensitive) |
| `status` | `PLANEJADA` \| `EM_ANDAMENTO` \| `CONCLUIDA` \| `CANCELADA` \| `all` | `all` | Filtro de status |
| `driverId` | string | — | Filtrar por motorista |
| `dateFrom` | date | — | Data planejada a partir de (ISO 8601) |
| `dateTo` | date | — | Data planejada até (ISO 8601) |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Rota Norte - Segunda-feira",
      "plannedDate": "2026-07-01",
      "status": "PLANEJADA",
      "startedAt": null,
      "completedAt": null,
      "vehicle": { "id": "uuid", "plate": "ABC-1234", "model": "VW Delivery" },
      "driver": { "id": "uuid", "name": "João Silva" },
      "teamMembers": [{ "userId": "uuid", "name": "Maria Souza" }],
      "pointsCount": 5,
      "createdAt": "2026-06-30T10:00:00Z",
      "updatedAt": "2026-06-30T10:00:00Z"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

---

### GET /api/v1/collection-routes/:id

Retorna rota completa com pontos ordenados por sequência.

**Permissão**: `COLLECTION_ROUTES:READ` + ownership check para DRIVER

**Response 200**:
```json
{
  "id": "uuid",
  "name": "Rota Norte - Segunda-feira",
  "plannedDate": "2026-07-01",
  "status": "PLANEJADA",
  "startedAt": null,
  "completedAt": null,
  "notes": null,
  "vehicle": { "id": "uuid", "plate": "ABC-1234", "type": "VAN", "model": "VW Delivery" },
  "driver": { "id": "uuid", "name": "João Silva", "email": "joao@eco.coop" },
  "teamMembers": [
    { "userId": "uuid", "name": "Maria Souza", "addedAt": "2026-06-30T10:00:00Z" }
  ],
  "routePoints": [
    {
      "id": "uuid",
      "sequence": 1,
      "collectionPoint": {
        "id": "uuid",
        "name": "Ponto Centro",
        "address": "Rua das Flores, 100",
        "latitude": -23.5505,
        "longitude": -46.6333,
        "locationPending": false,
        "isActive": true
      },
      "notes": null
    }
  ],
  "version": 0,
  "createdAt": "2026-06-30T10:00:00Z",
  "updatedAt": "2026-06-30T10:00:00Z"
}
```

**Errors**: `404 COLLECTION_ROUTE_NOT_FOUND`

---

### POST /api/v1/collection-routes

Cria nova rota de coleta com status `PLANEJADA`.

**Permissão**: `COLLECTION_ROUTES:MANAGE`

**Request body**:
```json
{
  "name": "Rota Norte - Segunda-feira",
  "plannedDate": "2026-07-01",
  "vehicleId": "uuid",
  "driverId": "uuid",
  "notes": "Levar nota de coleta",
  "pointIds": ["uuid1", "uuid2"]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | sim | Nome da rota |
| `plannedDate` | date (ISO 8601) | sim | Data prevista da execução |
| `vehicleId` | string (UUID) | sim | Veículo associado |
| `driverId` | string (UUID) | sim | Motorista responsável (deve ter perfil DRIVER) |
| `notes` | string | não | Observações gerais |
| `pointIds` | string[] | não | IDs dos pontos de coleta (sequência inicial por ordem do array) |

**Response 201**: objeto completo da rota (mesmo schema de GET /:id).

**Errors**:
- `404 VEHICLE_NOT_FOUND` ou `404 USER_NOT_FOUND` (driverId inválido)
- `422 DRIVER_PROFILE_REQUIRED` — usuário informado não tem perfil DRIVER
- `422 VEHICLE_INACTIVE` — veículo inativo
- `422 COLLECTION_ROUTE_REQUIRES_VEHICLE_AND_DRIVER`

---

### PATCH /api/v1/collection-routes/:id

Atualiza campos de planejamento de uma rota `PLANEJADA`.

**Permissão**: `COLLECTION_ROUTES:MANAGE`

**Request body** (todos opcionais):
```json
{
  "name": "Rota Norte Atualizada",
  "plannedDate": "2026-07-02",
  "vehicleId": "uuid",
  "driverId": "uuid",
  "notes": "Observação atualizada"
}
```

**Errors**:
- `404 COLLECTION_ROUTE_NOT_FOUND`
- `409 ROUTE_NOT_EDITABLE` — rota não está em status `PLANEJADA`
- `422 VEHICLE_INACTIVE` ou `422 DRIVER_PROFILE_REQUIRED`

---

### POST /api/v1/collection-routes/:id/points

Adiciona um ponto de coleta à rota. Só permitido para rotas `PLANEJADA`.

**Permissão**: `COLLECTION_ROUTES:MANAGE`

**Request body**:
```json
{
  "collectionPointId": "uuid",
  "notes": "Preferir entrada lateral"
}
```

**Response 200**: rota completa atualizada com `routePoints`.

**Errors**:
- `404 COLLECTION_ROUTE_NOT_FOUND` / `404 COLLECTION_POINT_NOT_FOUND`
- `409 ROUTE_NOT_EDITABLE` — rota não em `PLANEJADA`
- `409 POINT_ALREADY_IN_ROUTE`

---

### DELETE /api/v1/collection-routes/:id/points/:pointId

Remove um ponto de coleta da rota. Só permitido para rotas `PLANEJADA`.

**Permissão**: `COLLECTION_ROUTES:MANAGE`

**Response 200**: rota completa atualizada.

**Errors**:
- `404 COLLECTION_ROUTE_NOT_FOUND` / `404 ROUTE_POINT_NOT_FOUND`
- `409 ROUTE_NOT_EDITABLE`

---

### PATCH /api/v1/collection-routes/:id/points/reorder

Reordena os pontos da rota. Substitui atomicamente todos os valores de `sequence`. Só para rotas `PLANEJADA`.

**Permissão**: `COLLECTION_ROUTES:MANAGE`

**Request body**:
```json
{
  "orderedPointIds": ["uuid3", "uuid1", "uuid2"]
}
```

Todos os IDs existentes na rota devem estar presentes no array (sem omitir nem adicionar).

**Response 200**: rota completa atualizada com nova sequência.

**Errors**:
- `409 ROUTE_NOT_EDITABLE`
- `422 INVALID_POINT_ORDER` — IDs não correspondem exatamente aos pontos da rota

---

### POST /api/v1/collection-routes/:id/suggest-sequence

Sugere sequência otimizada (nearest neighbor) para os pontos da rota.

**Permissão**: `COLLECTION_ROUTES:MANAGE`

**Response 200**:
```json
{
  "suggestedOrder": ["uuid2", "uuid1", "uuid3"],
  "excludedPoints": [
    { "id": "uuid4", "name": "Ponto Sem Coords", "reason": "locationPending" }
  ],
  "warning": "2 pontos sem coordenadas foram excluídos da sugestão."
}
```

---

### POST /api/v1/collection-routes/:id/team

Adiciona membros à equipe de coleta da rota.

**Permissão**: `COLLECTION_ROUTES:MANAGE`

Permitido em `PLANEJADA` e `EM_ANDAMENTO`.

**Request body**:
```json
{
  "userIds": ["uuid1", "uuid2"]
}
```

**Response 200**: rota atualizada com `teamMembers`.

**Errors**:
- `404 COLLECTION_ROUTE_NOT_FOUND`
- `409 ROUTE_NOT_EDITABLE` — rota em `CONCLUIDA` ou `CANCELADA`
- `422 USER_NOT_FOUND` para qualquer ID inválido

---

### DELETE /api/v1/collection-routes/:id/team/:userId

Remove membro da equipe de coleta.

**Permissão**: `COLLECTION_ROUTES:MANAGE`

Permitido em `PLANEJADA` e `EM_ANDAMENTO`.

**Response 200**: rota atualizada com `teamMembers`.

**Errors**:
- `404 TEAM_MEMBER_NOT_FOUND`
- `409 ROUTE_NOT_EDITABLE`

---

### POST /api/v1/collection-routes/:id/start

Inicia a execução da rota (`PLANEJADA → EM_ANDAMENTO`). Registra `startedAt`.

**Permissão**: `COLLECTION_ROUTES:EXECUTE` + ownership check (DRIVER deve ser o `driverId` ou estar na equipe). ADMIN/MANAGER também podem iniciar.

**Request body**: vazio `{}`

**Response 200**: rota atualizada com `status: "EM_ANDAMENTO"` e `startedAt` preenchido.

**Errors**:
- `404 COLLECTION_ROUTE_NOT_FOUND`
- `409 INVALID_ROUTE_TRANSITION` — rota não está `PLANEJADA`
- `409 ROUTE_CONCURRENT_MODIFICATION` — optimistic locking failure (dois usuários simultâneos)

---

### POST /api/v1/collection-routes/:id/complete

Conclui a execução da rota (`EM_ANDAMENTO → CONCLUIDA`). Registra `completedAt`.

**Permissão**: `COLLECTION_ROUTES:EXECUTE` + ownership check.

**Request body**: vazio `{}`

**Response 200**: rota atualizada com `status: "CONCLUIDA"` e `completedAt` preenchido.

**Errors**:
- `409 INVALID_ROUTE_TRANSITION` — rota não está `EM_ANDAMENTO`
- `409 ROUTE_CONCURRENT_MODIFICATION`

---

### POST /api/v1/collection-routes/:id/cancel

Cancela a rota (`PLANEJADA | EM_ANDAMENTO → CANCELADA`).

**Permissão**: `COLLECTION_ROUTES:MANAGE` (apenas ADMIN/MANAGER)

**Request body**:
```json
{
  "reason": "Veículo avariado — será reagendada"
}
```

| Campo | Tipo | Obrigatório |
|---|---|---|
| `reason` | string | sim |

**Response 200**: rota atualizada com `status: "CANCELADA"`.

**Errors**:
- `409 INVALID_ROUTE_TRANSITION` — rota já `CONCLUIDA` ou `CANCELADA`
- `422 CANCELLATION_REASON_REQUIRED`

---

## 3. Raw Material Entries — `/api/v1/collection-routes/:routeId/material-entries`

### GET /api/v1/collection-routes/:routeId/material-entries

Lista entradas de material bruto de uma rota.

**Permissão**: `RAW_MATERIAL_ENTRIES:READ` (ADMIN, MANAGER); SORTER com permissão específica; DRIVER com ownership.

| Query | Tipo | Default | Descrição |
|---|---|---|---|
| `page` | int | `1` | Página |
| `limit` | int | `20` | Registros por página |

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "routeId": "uuid",
      "subcategory": { "id": "uuid", "name": "PET", "category": { "id": "uuid", "name": "Plástico" } },
      "quantity": "150.500",
      "unit": { "id": "uuid", "name": "Quilograma", "symbol": "kg" },
      "notes": null,
      "user": { "id": "uuid", "name": "João Silva" },
      "createdAt": "2026-06-30T15:00:00Z",
      "stockEventId": "uuid"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 20
}
```

---

### POST /api/v1/collection-routes/:routeId/material-entries

Registra entrada de material bruto. Gera `RawMaterialStockEvent` do tipo `ENTRADA_BRUTO` na mesma transação.

**Permissão**: `RAW_MATERIAL_ENTRIES:CREATE` + regras de DRIVER (apenas nas próprias rotas em `EM_ANDAMENTO` ou `CONCLUIDA`)

**Request body**:
```json
{
  "subcategoryId": "uuid",
  "quantity": 150.5,
  "unitId": "uuid",
  "notes": "Material coletado no ponto Centro"
}
```

| Campo | Tipo | Obrigatório | Regra |
|---|---|---|---|
| `subcategoryId` | string (UUID) | sim | Deve existir e estar ativa |
| `quantity` | number | sim | > 0 |
| `unitId` | string (UUID) | sim | Deve existir e estar ativa |
| `notes` | string | não | Observações livres |

**Response 201**:
```json
{
  "id": "uuid",
  "routeId": "uuid",
  "subcategory": { "id": "uuid", "name": "PET" },
  "quantity": "150.500",
  "unit": { "id": "uuid", "symbol": "kg" },
  "notes": "Material coletado no ponto Centro",
  "user": { "id": "uuid", "name": "João Silva" },
  "createdAt": "2026-06-30T15:00:00Z",
  "stockEventId": "uuid"
}
```

**Errors**:
- `404 COLLECTION_ROUTE_NOT_FOUND`
- `404 MATERIAL_SUBCATEGORY_NOT_FOUND` ou `404 UNIT_NOT_FOUND`
- `422 SUBCATEGORY_INACTIVE` ou `422 UNIT_INACTIVE`
- `422 QUANTITY_MUST_BE_POSITIVE`
- `409 ROUTE_STATUS_INVALID` — rota não está `EM_ANDAMENTO` nem `CONCLUIDA`

---

### GET /api/v1/collection-routes/:routeId/material-entries/:id

Retorna entrada de material bruto pelo ID, incluindo stock event associado.

**Permissão**: `RAW_MATERIAL_ENTRIES:READ` + ownership check para DRIVER

**Response 200**:
```json
{
  "id": "uuid",
  "routeId": "uuid",
  "subcategory": { "id": "uuid", "name": "PET", "category": { "id": "uuid", "name": "Plástico" } },
  "quantity": "150.500",
  "unit": { "id": "uuid", "name": "Quilograma", "symbol": "kg" },
  "notes": null,
  "user": { "id": "uuid", "name": "João Silva" },
  "createdAt": "2026-06-30T15:00:00Z",
  "stockEvent": {
    "id": "uuid",
    "type": "ENTRADA_BRUTO",
    "quantity": "150.500",
    "createdAt": "2026-06-30T15:00:00Z"
  }
}
```

**Errors**: `404 RAW_MATERIAL_ENTRY_NOT_FOUND`

---

### POST /api/v1/collection-routes/:routeId/material-entries/:id/reversal

Cria evento de estorno (`ESTORNO_BRUTO`) para corrigir uma entrada de material bruto. O evento original é imutável.

**Permissão**: `RAW_MATERIAL_ENTRIES:MANAGE` (apenas ADMIN e MANAGER)

**Request body**:
```json
{
  "justification": "Quantidade digitada errada — era 50 kg, não 150 kg"
}
```

| Campo | Tipo | Obrigatório |
|---|---|---|
| `justification` | string | sim |

**Response 201**:
```json
{
  "id": "uuid",
  "type": "ESTORNO_BRUTO",
  "subcategoryId": "uuid",
  "unitId": "uuid",
  "quantity": "-150.500",
  "referencedEventId": "uuid",
  "justification": "Quantidade digitada errada — era 50 kg, não 150 kg",
  "userId": "uuid",
  "createdAt": "2026-06-30T16:00:00Z"
}
```

**Errors**:
- `404 RAW_MATERIAL_ENTRY_NOT_FOUND`
- `422 JUSTIFICATION_REQUIRED`
- `409 REVERSAL_WOULD_CAUSE_NEGATIVE_BALANCE` — saldo resultante seria negativo (FR-047)
- `409 ENTRY_ALREADY_REVERSED` — já existe estorno para esta entrada

---

## 4. Raw Material Balance — `/api/v1/raw-material-balance`

### GET /api/v1/raw-material-balance

Consulta saldo bruto atual por subcategoria e unidade de medida.

**Permissão**: `RAW_MATERIAL_BALANCE:READ` (ADMIN, MANAGER; SORTER/DRIVER com permissão específica)

| Query | Tipo | Default | Descrição |
|---|---|---|---|
| `subcategoryId` | string (UUID) | — | Filtrar por subcategoria específica |
| `unitId` | string (UUID) | — | Filtrar por unidade específica |
| `includeInactive` | boolean | `false` | Incluir subcategorias/unidades inativas no resultado |

**Response 200**:
```json
{
  "data": [
    {
      "subcategory": {
        "id": "uuid",
        "name": "PET",
        "isActive": true,
        "category": { "id": "uuid", "name": "Plástico" }
      },
      "unit": { "id": "uuid", "name": "Quilograma", "symbol": "kg" },
      "balance": "450.000",
      "eventCount": 5
    }
  ],
  "calculatedAt": "2026-06-30T16:00:00Z"
}
```

> `balance` é sempre ≥ 0 (a validação de saldo negativo é feita no momento do estorno).
> Subcategorias sem nenhum evento não aparecem na listagem (a menos que `includeInactive=true` e explicitamente buscadas por `subcategoryId`).

---

## Códigos de Erro (Resumo)

| Código | HTTP | Descrição |
|---|---|---|
| `COLLECTION_POINT_NOT_FOUND` | 404 | Ponto de coleta não encontrado |
| `COLLECTION_POINT_ADDRESS_REQUIRED` | 422 | Endereço obrigatório |
| `COLLECTION_ROUTE_NOT_FOUND` | 404 | Rota não encontrada |
| `COLLECTION_ROUTE_REQUIRES_VEHICLE_AND_DRIVER` | 422 | Veículo e motorista obrigatórios |
| `DRIVER_PROFILE_REQUIRED` | 422 | Usuário não tem perfil DRIVER |
| `VEHICLE_INACTIVE` | 422 | Veículo inativo |
| `ROUTE_NOT_EDITABLE` | 409 | Rota não pode ser editada no estado atual |
| `INVALID_ROUTE_TRANSITION` | 409 | Transição de estado inválida |
| `ROUTE_CONCURRENT_MODIFICATION` | 409 | Conflito de versão (optimistic locking) |
| `CANCELLATION_REASON_REQUIRED` | 422 | Motivo de cancelamento obrigatório |
| `POINT_ALREADY_IN_ROUTE` | 409 | Ponto já associado à rota |
| `ROUTE_POINT_NOT_FOUND` | 404 | Ponto de rota não encontrado |
| `INVALID_POINT_ORDER` | 422 | IDs de reordenação não correspondem aos pontos da rota |
| `TEAM_MEMBER_NOT_FOUND` | 404 | Membro da equipe não encontrado |
| `RAW_MATERIAL_ENTRY_NOT_FOUND` | 404 | Entrada de material não encontrada |
| `MATERIAL_SUBCATEGORY_NOT_FOUND` | 404 | Subcategoria não encontrada |
| `UNIT_NOT_FOUND` | 404 | Unidade de medida não encontrada |
| `SUBCATEGORY_INACTIVE` | 422 | Subcategoria inativa |
| `UNIT_INACTIVE` | 422 | Unidade de medida inativa |
| `QUANTITY_MUST_BE_POSITIVE` | 422 | Quantidade deve ser maior que zero |
| `ROUTE_STATUS_INVALID` | 409 | Status da rota não permite esta ação |
| `JUSTIFICATION_REQUIRED` | 422 | Justificativa obrigatória para estorno |
| `REVERSAL_WOULD_CAUSE_NEGATIVE_BALANCE` | 409 | Estorno resultaria em saldo negativo |
| `ENTRY_ALREADY_REVERSED` | 409 | Entrada já possui estorno registrado |
