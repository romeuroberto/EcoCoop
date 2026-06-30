# Validation Guide: Fase 3 — Coleta, Rotas e Entrada de Material Bruto

**Feature**: `003-collection-routes-raw-material` | **Date**: 2026-06-30

---

## Pré-requisitos

1. Backend rodando: `pnpm --filter backend dev` (porta 3000)
2. Frontend rodando: `pnpm --filter frontend dev` (porta 5173)
3. Banco de dados migrado: `pnpm --filter backend prisma:migrate:dev`
4. Seed executado: `pnpm --filter backend prisma:seed` (inclui dados base da Fase 2)
5. Tokens JWT disponíveis para:
   - `ADMIN` — via `POST /api/v1/auth/login` com admin@eco.coop
   - `MANAGER` — com manager@eco.coop
   - `DRIVER` — com driver@eco.coop (usuário vinculado a Member com perfil DRIVER)
   - `SORTER` — com sorter@eco.coop

> Consulte [contracts/rest-api.md](contracts/rest-api.md) para schemas completos.  
> Consulte [data-model.md](data-model.md) para o modelo de dados.

---

## Cenário 1 — Ponto de Coleta: CRUD e Geocoding

**Objetivo**: Verificar criação, geocoding assíncrono, edição de coordenadas e inativação.

### Passos

```bash
# 1. Criar ponto (sem coordenadas manuais → geocoding tentado)
POST /api/v1/collection-points
Authorization: Bearer <MANAGER_TOKEN>
{
  "name": "Ponto Centro",
  "address": "Rua das Flores, 100, Centro, São Paulo, SP"
}
# Expected: 201 com locationPending: true (geocoding assíncrono)

# 2. Aguardar ~2s e buscar o ponto
GET /api/v1/collection-points/<id>
# Expected: locationPending: false COM latitude/longitude preenchidos
# (se Nominatim respondeu) OU locationPending: true (falha de geocoding)

# 3. Corrigir coordenadas manualmente (se pendente)
PATCH /api/v1/collection-points/<id>
{ "latitude": -23.5505, "longitude": -46.6333 }
# Expected: 200 com locationPending: false

# 4. Verificar auditoria (passo 3 deve gerar registro)
GET /api/v1/audit-logs?entityType=CollectionPoint&entityId=<id>
# Expected: registro com previousState.locationPending=true e newState.locationPending=false

# 5. Inativar ponto
PATCH /api/v1/collection-points/<id>
{ "isActive": false }
# Expected: 200 com isActive: false

# 6. Tentar criar ponto como DRIVER
POST /api/v1/collection-points
Authorization: Bearer <DRIVER_TOKEN>
{ "name": "Ponto X", "address": "Rua Y" }
# Expected: 403
```

**Verificação no Frontend**:
- Ponto com coordenadas aparece no mapa (marcador)
- Ponto com `locationPending=true` aparece na lista com badge "Localização pendente" mas não no mapa
- Ponto inativo não aparece no seletor de pontos ao criar nova rota

---

## Cenário 2 — Planejamento de Rota

**Objetivo**: Verificar criação de rota, adição de pontos, sugestão de sequência e reordenação.

### Passos

```bash
# Pré: criar 3 pontos com coordenadas válidas (IDs: pointA, pointB, pointC)

# 1. Criar rota
POST /api/v1/collection-routes
Authorization: Bearer <MANAGER_TOKEN>
{
  "name": "Rota Norte - Teste",
  "plannedDate": "2026-07-01",
  "vehicleId": "<vehicleId>",
  "driverId": "<driverUserId>",
  "pointIds": ["<pointA>", "<pointB>"]
}
# Expected: 201 com status: "PLANEJADA" e 2 routePoints

# 2. Adicionar terceiro ponto
POST /api/v1/collection-routes/<routeId>/points
{ "collectionPointId": "<pointC>" }
# Expected: 200 com 3 routePoints (pointC com sequence=3)

# 3. Solicitar sugestão de sequência
POST /api/v1/collection-routes/<routeId>/suggest-sequence
# Expected: { suggestedOrder: ["uuid...", "uuid...", "uuid..."], excludedPoints: [] }

# 4. Reordenar manualmente (aplicar sugestão ou ordem diferente)
PATCH /api/v1/collection-routes/<routeId>/points/reorder
{ "orderedPointIds": ["<pointC>", "<pointA>", "<pointB>"] }
# Expected: 200 com routePoints reordenados (sequence: C=1, A=2, B=3)

# 5. Adicionar membro à equipe
POST /api/v1/collection-routes/<routeId>/team
{ "userIds": ["<sorterUserId>"] }
# Expected: 200 com teamMembers atualizado

# 6. Tentar criar rota como DRIVER
POST /api/v1/collection-routes
Authorization: Bearer <DRIVER_TOKEN>
{ ... }
# Expected: 403
```

---

## Cenário 3 — Execução da Rota (State Machine)

**Objetivo**: Verificar transições PLANEJADA → EM_ANDAMENTO → CONCLUÍDA e bloqueios.

### Passos

```bash
# Pré: rota <routeId> com status PLANEJADA, driver: <driverUserId>

# 1. DRIVER inicia rota
POST /api/v1/collection-routes/<routeId>/start
Authorization: Bearer <DRIVER_TOKEN>
# Expected: 200 com status: "EM_ANDAMENTO" e startedAt preenchido

# 2. Tentar editar campo estrutural durante execução
PATCH /api/v1/collection-routes/<routeId>
Authorization: Bearer <MANAGER_TOKEN>
{ "vehicleId": "<outroVehicleId>" }
# Expected: 409 ROUTE_NOT_EDITABLE

# 3. Editar campo permitido durante execução (equipe auxiliar)
POST /api/v1/collection-routes/<routeId>/team
Authorization: Bearer <MANAGER_TOKEN>
{ "userIds": ["<anotherUserId>"] }
# Expected: 200 (permitido)

# 4. DRIVER não atribuído tenta concluir rota
POST /api/v1/collection-routes/<routeId>/complete
Authorization: Bearer <ANOTHER_DRIVER_TOKEN>
# Expected: 403

# 5. DRIVER atribuído conclui rota
POST /api/v1/collection-routes/<routeId>/complete
Authorization: Bearer <DRIVER_TOKEN>
# Expected: 200 com status: "CONCLUIDA" e completedAt preenchido

# 6. Tentar alterar qualquer campo em rota concluída
PATCH /api/v1/collection-routes/<routeId>
{ "notes": "tentativa" }
# Expected: 409 ROUTE_NOT_EDITABLE

# 7. Verificar auditoria da transição de estado
# Expected: 2 entradas de auditoria (PLANEJADA→EM_ANDAMENTO, EM_ANDAMENTO→CONCLUIDA)

# 8. Testar cancelamento: nova rota PLANEJADA → cancelar
POST /api/v1/collection-routes
{ ... }                # cria rota2
POST /api/v1/collection-routes/<rota2Id>/cancel
{ "reason": "Veículo avariado" }
# Expected: 200 com status: "CANCELADA"

# 9. Tentar concluir rota cancelada
POST /api/v1/collection-routes/<rota2Id>/complete
# Expected: 409 INVALID_ROUTE_TRANSITION
```

---

## Cenário 4 — Entrada de Material Bruto

**Objetivo**: Verificar registro de entrada, geração de evento de estoque e saldo.

### Passos

```bash
# Pré: rota <routeId> com status CONCLUIDA

# 1. Registrar entrada de material bruto
POST /api/v1/collection-routes/<routeId>/material-entries
Authorization: Bearer <MANAGER_TOKEN>
{
  "subcategoryId": "<petSubcategoryId>",
  "quantity": 150.5,
  "unitId": "<kgUnitId>",
  "notes": "PET coletado no centro"
}
# Expected: 201 com stockEventId preenchido

# 2. Verificar evento de estoque criado
GET /api/v1/collection-routes/<routeId>/material-entries/<entryId>
# Expected: stockEvent.type: "ENTRADA_BRUTO", stockEvent.quantity: "150.500"

# 3. Consultar saldo bruto
GET /api/v1/raw-material-balance?subcategoryId=<petSubcategoryId>&unitId=<kgUnitId>
# Expected: balance: "150.500"

# 4. Registrar segunda entrada (mesma subcategoria)
POST /api/v1/collection-routes/<routeId>/material-entries
{ "subcategoryId": "<petSubcategoryId>", "quantity": 50.0, "unitId": "<kgUnitId>" }
# Expected: 201

# 5. Saldo deve ser 200.500
GET /api/v1/raw-material-balance?subcategoryId=<petSubcategoryId>&unitId=<kgUnitId>
# Expected: balance: "200.500"

# 6. Tentar registrar em rota PLANEJADA
POST /api/v1/collection-routes/<rotaPlanejadaId>/material-entries
{ "subcategoryId": "<petSubcategoryId>", "quantity": 10, "unitId": "<kgUnitId>" }
# Expected: 409 ROUTE_STATUS_INVALID

# 7. Tentar registrar quantidade zero
POST /api/v1/collection-routes/<routeId>/material-entries
{ "subcategoryId": "<petSubcategoryId>", "quantity": 0, "unitId": "<kgUnitId>" }
# Expected: 422 QUANTITY_MUST_BE_POSITIVE

# 8. DRIVER registra entrada em rota própria (CONCLUIDA)
POST /api/v1/collection-routes/<routeId>/material-entries
Authorization: Bearer <DRIVER_TOKEN>
{ "subcategoryId": "<petSubcategoryId>", "quantity": 25.0, "unitId": "<kgUnitId>" }
# Expected: 201 (DRIVER é driverId da rota)

# 9. DRIVER tenta registrar em rota de outro motorista
POST /api/v1/collection-routes/<outraRotaId>/material-entries
Authorization: Bearer <DRIVER_TOKEN>
{ "subcategoryId": "<petSubcategoryId>", "quantity": 10, "unitId": "<kgUnitId>" }
# Expected: 403
```

---

## Cenário 5 — Estorno de Entrada de Material Bruto

**Objetivo**: Verificar evento compensatório, bloqueio de saldo negativo e permissões.

### Passos

```bash
# Pré: saldo atual de PET/kg = 200.500 (soma dos cenário 4 sem o passo 8)

# 1. Criar estorno da primeira entrada (150.500 kg)
POST /api/v1/collection-routes/<routeId>/material-entries/<entry1Id>/reversal
Authorization: Bearer <MANAGER_TOKEN>
{ "justification": "Quantidade registrada errada" }
# Expected: 201 com type: "ESTORNO_BRUTO", quantity: "-150.500"

# 2. Saldo deve ser 50.000
GET /api/v1/raw-material-balance?subcategoryId=<petSubcategoryId>&unitId=<kgUnitId>
# Expected: balance: "50.000"

# 3. Tentar criar estorno que resultaria em saldo negativo
POST /api/v1/collection-routes/<routeId>/material-entries/<entry2Id>/reversal
Authorization: Bearer <MANAGER_TOKEN>
{ "justification": "Teste saldo negativo" }
# entry2 = 50kg → saldo resultante = 0, OK
# Expected: 201 (saldo vai a zero, não negativo → válido)

# 4. Verificar que saldo = 0 (subcategoria não aparece ou aparece com zero)
GET /api/v1/raw-material-balance
# Expected: PET/kg não aparece OU balance: "0.000"

# 5. DRIVER tenta criar estorno
POST /api/v1/collection-routes/<routeId>/material-entries/<entryId>/reversal
Authorization: Bearer <DRIVER_TOKEN>
{ "justification": "Tentativa de estorno" }
# Expected: 403

# 6. Tentar criar estorno duplicado (entrada já estornada)
POST /api/v1/collection-routes/<routeId>/material-entries/<entry1Id>/reversal
Authorization: Bearer <MANAGER_TOKEN>
{ "justification": "Segundo estorno" }
# Expected: 409 ENTRY_ALREADY_REVERSED

# 7. Verificar auditoria do estorno
# Expected: registro de auditoria com type: ESTORNO_BRUTO, referencedEventId preenchido
```

---

## Cenário 6 — Permissões RBAC

**Objetivo**: Verificar que todas as restrições de acesso são impostas no backend.

| Ação | ADMIN | MANAGER | DRIVER (próprio) | DRIVER (outro) | SORTER |
|---|---|---|---|---|---|
| Criar ponto de coleta | ✅ | ✅ | 403 | 403 | 403 |
| Criar rota | ✅ | ✅ | 403 | 403 | 403 |
| Iniciar rota | ✅ | ✅ | ✅ | 403 | 403 |
| Concluir rota | ✅ | ✅ | ✅ | 403 | 403 |
| Cancelar rota | ✅ | ✅ | 403 | 403 | 403 |
| Registrar entrada | ✅ | ✅ | ✅ | 403 | 403 |
| Criar estorno | ✅ | ✅ | 403 | 403 | 403 |
| Consultar saldo | ✅ | ✅ | 403* | 403* | 403* |

> *DRIVER e SORTER podem consultar saldo somente se tiverem permissão específica `RAW_MATERIAL_BALANCE:READ` atribuída individualmente.

---

## Cenário 7 — Auditoria (Princípio III)

**Objetivo**: Verificar que toda operação mutável gera registro de auditoria com previousState e newState.

```bash
# Verificar via endpoint de audit logs (existente da Fase 1)
GET /api/v1/audit-logs?entityType=CollectionPoint
GET /api/v1/audit-logs?entityType=CollectionRoute
GET /api/v1/audit-logs?entityType=RawMaterialEntry

# Para cada operação nos cenários anteriores, deve existir um AuditLog com:
# - userId: ID do usuário que executou a ação
# - action: CREATE | UPDATE | STATE_CHANGE
# - previousState: objeto JSON com estado anterior
# - newState: objeto JSON com estado novo
# - createdAt: timestamp da ação
```

**Verificações específicas**:
- Criação de ponto: previousState=null, newState=objeto do ponto
- Atualização de coordenadas: previousState contém locationPending/lat/lng anteriores
- Transição de status de rota: previousState.status anterior, newState.status novo
- Criação de entrada de material: previousState=null, newState=objeto da entrada

---

## Verificações de Integridade Pós-Implementação

```bash
# 1. Saldo = soma algébrica dos eventos
SELECT subcategoryId, unitId, SUM(quantity) as balance
FROM RawMaterialStockEvent
GROUP BY subcategoryId, unitId;
# Expected: nenhum saldo negativo, valores batem com API /raw-material-balance

# 2. Eventos imutáveis — nenhum registro foi atualizado ou deletado
SELECT COUNT(*) FROM RawMaterialStockEvent WHERE updatedAt IS NOT NULL;
# (coluna updatedAt não existe — modelo imutável, sem updatedAt)

# 3. Toda entrada tem exatamente um stock event ENTRADA_BRUTO
SELECT COUNT(*) FROM RawMaterialEntry rme
LEFT JOIN RawMaterialStockEvent rse ON rse.rawMaterialEntryId = rme.id
WHERE rse.id IS NULL;
# Expected: 0 (toda entrada tem evento)
```
