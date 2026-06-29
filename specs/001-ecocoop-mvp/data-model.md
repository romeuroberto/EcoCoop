# Data Model: EcoCoop MVP

**Feature**: `001-ecocoop-mvp` | **Date**: 2026-06-29

## Entity Relationship Overview

```
Cooperative ──── CooperativeSettings
    │
    ├── User (all users: internal + buyers)
    │     ├── Member (cooperado interno)
    │     │     ├── EpiDelivery
    │     │     ├── AttendanceRecord
    │     │     └── ProfitSharingResult
    │     └── Buyer (comprador)
    │
    ├── Profile ──── ProfilePermission
    │
    ├── MaterialCategory ──── MaterialSubcategory
    ├── MeasureUnit
    ├── Vehicle ──── VehicleRefueling
    │               └── VehicleMaintenance
    │
    ├── CollectionRoute ──── CollectionPoint ──── CollectionEntry
    │
    ├── StockEvent (append-only)
    ├── StockBalance (projection, per subcategory+unit)
    │
    ├── SortingSession ──── SortingSessionItem
    │
    ├── RejectStockItem
    │
    ├── Sale ──── SaleItem
    │
    ├── FinancialLedger (append-only)
    ├── AccountPayable
    ├── AccountReceivable
    ├── CostCenter
    │
    ├── ProfitSharingRule
    ├── ProfitSharingPeriod ──── ProfitSharingResult
    │
    └── AuditLog
```

---

## Entities

### Cooperative

Singleton por instância. Dados institucionais da cooperativa.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | Razão social |
| cnpj | string | unique |
| address | string | |
| phone | string | |
| email | string | |
| logoUrl | string? | |
| createdAt | datetime | |

---

### CooperativeSettings

Configurações operacionais da instância.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| cooperativeId | uuid | FK Cooperative |
| attendanceEnabled | boolean | default false |
| rejectAlertDaysWithoutStatus | int | default 30 — alerta rejeito sem destinação |
| defaultProfitSharingBase | enum | NET_RESULT \| GROSS_REVENUE \| MANUAL; default NET_RESULT |
| vehicleCostCenterId | uuid? | FK CostCenter — centro de custo padrão para veículos |
| updatedAt | datetime | |

---

### User

Entidade base de autenticação para todos os tipos de usuário.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| email | string | unique, login credential |
| passwordHash | string | bcrypt |
| profileId | uuid | FK Profile |
| isActive | boolean | default true |
| memberId | uuid? | FK Member — null para compradores |
| buyerId | uuid? | FK Buyer — null para internos |
| lastLoginAt | datetime? | |
| createdAt | datetime | |
| updatedAt | datetime | |

**State transitions**: active ↔ inactive (soft delete via isActive)

**Business rules**:
- `memberId` e `buyerId` são mutuamente exclusivos
- Ao fazer login, sistema lê `profile.type` para decidir redirecionamento
- Desativar usuário não apaga registros históricos (FK preservada)

---

### Profile

Perfis de acesso com permissões por módulo.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | Ex: Administrador, Gestor, Triador, Motorista, Cooperado, Comprador |
| type | enum | ADMIN \| MANAGER \| SORTER \| DRIVER \| MEMBER \| BUYER |
| isCustom | boolean | false = padrão do sistema, true = criado pela cooperativa |
| createdAt | datetime | |

### ProfilePermission

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| profileId | uuid | FK Profile |
| module | string | Ex: STOCK, FINANCE, PROFIT_SHARING, ROUTES |
| action | string | READ \| CREATE \| UPDATE \| DELETE \| MANAGE |

---

### Member

Cooperado interno da cooperativa.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | |
| cpf | string | unique |
| phone | string? | |
| role | string? | Função operacional (triador, motorista, etc.) |
| admittedAt | date | Data de ingresso |
| isActive | boolean | |
| createdAt | datetime | |

---

### Buyer

Comprador externo com acesso ao portal.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| legalName | string | Razão social |
| documentNumber | string | CNPJ ou CPF, unique |
| documentType | enum | CNPJ \| CPF |
| phone | string? | |
| email | string? | |
| address | string? | |
| isActive | boolean | |
| createdAt | datetime | |

---

### MaterialCategory / MaterialSubcategory

Hierarquia de materiais configurável.

**MaterialCategory**:

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | Ex: Papel, Plástico, Metal |
| description | string? | |

**MaterialSubcategory**:

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| categoryId | uuid | FK MaterialCategory |
| name | string | Ex: Papelão, PET, Alumínio |
| description | string? | |
| isActive | boolean | default true |

---

### MeasureUnit

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | Ex: Quilograma, Fardo |
| symbol | string | Ex: kg, fardo |
| kgConversionFactor | decimal? | null = sem conversão definida |
| isActive | boolean | |

---

### Vehicle

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| licensePlate | string | unique |
| model | string | |
| year | int? | |
| capacityKg | decimal? | Capacidade em kg |
| defaultDriverMemberId | uuid? | FK Member |
| isActive | boolean | |

### VehicleRefueling

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vehicleId | uuid | FK Vehicle |
| liters | decimal | |
| totalValue | decimal | |
| station | string? | |
| driverId | uuid | FK Member |
| date | date | |
| financialLedgerEntryId | uuid? | FK FinancialLedger (auto-criado) |
| createdBy | uuid | FK User |
| createdAt | datetime | |

### VehicleMaintenance

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| vehicleId | uuid | FK Vehicle |
| maintenanceType | string | Ex: preventiva, corretiva |
| description | string | |
| value | decimal | |
| supplier | string? | |
| date | date | |
| financialLedgerEntryId | uuid? | FK FinancialLedger (auto-criado) |
| createdBy | uuid | FK User |
| createdAt | datetime | |

---

### CollectionRoute

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | |
| plannedDate | date | |
| vehicleId | uuid? | FK Vehicle |
| driverMemberId | uuid? | FK Member |
| estimatedDistanceKm | decimal? | Calculado ao confirmar rota |
| estimatedCost | decimal? | |
| status | enum | PLANNED \| IN_PROGRESS \| COMPLETED |
| startedAt | datetime? | |
| completedAt | datetime? | |
| createdBy | uuid | FK User |
| createdAt | datetime | |

**State machine**: PLANNED → IN_PROGRESS → COMPLETED

### CollectionPoint

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| routeId | uuid | FK CollectionRoute |
| order | int | Sequência na rota (1-based, reordenável) |
| address | string | |
| reference | string? | Ponto de referência textual |
| latitude | decimal? | null = aguardando geocoding |
| longitude | decimal? | null = aguardando geocoding |
| geocodingStatus | enum | PENDING \| SUCCESS \| FAILED |
| status | enum | PENDING \| COLLECTED \| NOT_COLLECTED |
| notCollectedReason | string? | Obrigatório quando NOT_COLLECTED |
| collectedAt | datetime? | |

### CollectionEntry

Material coletado em um ponto de coleta.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| collectionPointId | uuid | FK CollectionPoint |
| materialSubcategoryId | uuid | FK MaterialSubcategory |
| quantity | decimal | |
| measureUnitId | uuid | FK MeasureUnit |
| notes | string? | |
| stockEventId | uuid? | FK StockEvent (criado ao encerrar rota) |

---

## Stock System

### StockEvent (append-only — NUNCA deletar ou editar)

Fonte da verdade para todos os movimentos de estoque.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| eventType | enum | Ver tipos abaixo |
| materialSubcategoryId | uuid | FK MaterialSubcategory |
| measureUnitId | uuid | FK MeasureUnit |
| quantity | decimal | Sempre positivo; sinal determinado pelo tipo |
| referenceType | enum | COLLECTION_ROUTE \| SORTING_SESSION \| SALE \| MANUAL_ADJUSTMENT |
| referenceId | uuid | ID da entidade de origem |
| notes | string? | |
| createdBy | uuid | FK User |
| createdAt | datetime | Imutável |

**Event types**:

```
RAW_ENTRY             — entrada no estoque bruto (coleta ou manual)
RAW_RESERVE           — reserva para sessão de triagem
RAW_RESERVE_CANCEL    — cancelamento de reserva (sessão cancelada)
RAW_EXIT_SORTING      — baixa definitiva do bruto ao encerrar triagem

READY_ENTRY           — entrada no estoque pronto (output de triagem)
READY_SALE_RESERVE    — reserva para venda (futuro: se venda reservar antes de confirmar)
READY_EXIT_SALE       — baixa do estoque pronto por venda confirmada
READY_ADJUST          — ajuste manual de estoque pronto (com justificativa)

REJECT_ENTRY          — entrada no estoque de rejeito (output de triagem)
REJECT_EXIT_SALE      — saída por venda de rejeito
REJECT_DISCARD        — saída por descarte de rejeito

LOSS                  — perda registrada em sessão de triagem (baixa imediata)
```

### StockBalance (projeção materializada)

Saldo atual por material + unidade. Atualizado na mesma transação que insere StockEvent.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| materialSubcategoryId | uuid | FK MaterialSubcategory, unique index com measureUnitId |
| measureUnitId | uuid | FK MeasureUnit |
| stockType | enum | RAW \| READY \| REJECT |
| totalQuantity | decimal | Soma de todas as entradas |
| reservedQuantity | decimal | Reservado por sessões abertas |
| availableQuantity | decimal | = totalQuantity − reservedQuantity (computed in app) |
| lastEventAt | datetime | Data do último evento |

---

### SortingSession

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| materialSubcategoryId | uuid | FK MaterialSubcategory — material sendo triado |
| measureUnitId | uuid | FK MeasureUnit |
| reservedQuantity | decimal | Quantidade reservada ao abrir |
| sorterId | uuid | FK Member |
| status | enum | OPEN \| CLOSED \| CANCELLED |
| openedAt | datetime | |
| closedAt | datetime? | |
| cancelledAt | datetime? | |
| cancelReason | string? | Obrigatório ao cancelar |
| cancelledBy | uuid? | FK User |
| notes | string? | |

### SortingSessionSourceEntry

Liga sessão de triagem aos eventos de entrada FIFO selecionados.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| sortingSessionId | uuid | FK SortingSession |
| stockEventId | uuid | FK StockEvent (tipo RAW_ENTRY) |
| quantityUsed | decimal | Parte do evento usada nesta sessão |
| isManualOverride | boolean | true = gestor ajustou a origem |
| manualOverrideReason | string? | Obrigatório quando isManualOverride = true |
| manualOverrideBy | uuid? | FK User |

### SortingSessionItem

Itens resultantes da triagem.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| sortingSessionId | uuid | FK SortingSession |
| outputType | enum | READY \| REJECT \| LOSS |
| materialSubcategoryId | uuid | FK MaterialSubcategory (pode ser diferente do input) |
| quantity | decimal | |
| measureUnitId | uuid | FK MeasureUnit |
| lossJustification | string? | Obrigatório quando outputType = LOSS |
| stockEventId | uuid? | FK StockEvent (criado ao fechar sessão) |

---

### RejectStockItem

Item de rejeito com ciclo de vida próprio.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| sortingSessionItemId | uuid | FK SortingSessionItem |
| materialSubcategoryId | uuid | FK MaterialSubcategory |
| quantity | decimal | |
| measureUnitId | uuid | FK MeasureUnit |
| status | enum | GENERATED \| AVAILABLE \| RESERVED_FOR_SALE \| SOLD \| FOR_DISCARD \| DISCARDED |
| generatedAt | datetime | |
| availableAt | datetime? | |
| soldAt | datetime? | |
| discardedAt | datetime? | |
| buyerId | uuid? | FK Buyer (quando vendido) |
| saleId | uuid? | FK Sale |
| discardNotes | string? | |
| discardCost | decimal? | Custo do descarte, se houver |
| discardFinancialLedgerEntryId | uuid? | FK FinancialLedger |

**State machine**: GENERATED → AVAILABLE → RESERVED_FOR_SALE → SOLD
                                    ↘ FOR_DISCARD → DISCARDED

---

### Sale

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| buyerId | uuid | FK Buyer |
| status | enum | REGISTERED \| DELIVERED \| PAID |
| totalValue | decimal | Soma de todos os itens |
| notes | string? | |
| registeredBy | uuid | FK User |
| registeredAt | datetime | |
| deliveredAt | datetime? | |
| confirmedByBuyerAt | datetime? | Confirmação pelo portal do comprador |
| paidAt | datetime? | |
| accountReceivableId | uuid? | FK AccountReceivable (auto-criado) |

**State machine**: REGISTERED → DELIVERED → PAID

### SaleItem

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| saleId | uuid | FK Sale |
| materialSubcategoryId | uuid | FK MaterialSubcategory |
| quantity | decimal | |
| measureUnitId | uuid | FK MeasureUnit |
| unitPrice | decimal | Preço por unidade |
| totalPrice | decimal | = quantity × unitPrice |
| stockType | enum | READY \| REJECT — de qual estoque veio |
| stockEventId | uuid? | FK StockEvent (criado ao confirmar venda) |

---

## Financial System

### FinancialLedger (append-only)

Registro contábil de todos os lançamentos, previsto e realizado.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| entryType | enum | CREDIT \| DEBIT |
| amount | decimal | Sempre positivo |
| category | enum | SALE_REVENUE \| AP_PAYMENT \| AR_RECEIPT \| VEHICLE_FUEL \| VEHICLE_MAINTENANCE \| REJECT_DISCARD_COST \| MANUAL_INCOME \| MANUAL_EXPENSE |
| costCenterId | uuid? | FK CostCenter |
| isProjected | boolean | true = previsto, false = realizado |
| dueDate | date? | Para lançamentos previstos |
| settledAt | datetime? | Quando previsto vira realizado |
| description | string | |
| notes | string? | |
| referenceType | enum? | SALE \| ACCOUNT_PAYABLE \| ACCOUNT_RECEIVABLE \| VEHICLE_REFUELING \| VEHICLE_MAINTENANCE \| MANUAL |
| referenceId | uuid? | ID da entidade de origem |
| createdBy | uuid | FK User |
| createdAt | datetime | |

### AccountPayable

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| description | string | |
| value | decimal | |
| dueDate | date | |
| costCenterId | uuid? | FK CostCenter |
| status | enum | PENDING \| OVERDUE \| PAID |
| paidAt | datetime? | |
| paymentProofUrl | string? | |
| financialLedgerEntryId | uuid | FK FinancialLedger (entrada prevista) |
| settlementLedgerEntryId | uuid? | FK FinancialLedger (entrada realizada ao pagar) |
| createdBy | uuid | FK User |
| createdAt | datetime | |

### AccountReceivable

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| description | string | |
| value | decimal | |
| dueDate | date? | |
| buyerId | uuid? | FK Buyer |
| saleId | uuid? | FK Sale (se originado de venda) |
| status | enum | PENDING \| OVERDUE \| RECEIVED |
| receivedAt | datetime? | |
| financialLedgerEntryId | uuid | FK FinancialLedger (entrada prevista) |
| settlementLedgerEntryId | uuid? | FK FinancialLedger (entrada realizada ao receber) |
| createdBy | uuid | FK User |
| createdAt | datetime | |

### CostCenter

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | Ex: Logística, Operação, Administração |
| description | string? | |
| isActive | boolean | |

---

## Profit Sharing System

### ProfitSharingRule

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| version | int | Incrementa a cada nova versão |
| baseType | enum | NET_RESULT \| GROSS_REVENUE \| MANUAL |
| criteria | json | Array de {type, percentage}: type = EQUAL \| BY_WEIGHT \| BY_ATTENDANCE |
| isActive | boolean | Somente uma ativa por vez |
| activatedAt | datetime? | |
| deactivatedAt | datetime? | null = ativa |
| createdBy | uuid | FK User |
| createdAt | datetime | |

**Business rule**: `SUM(criteria[].percentage) MUST = 100`

### ProfitSharingPeriod

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| startDate | date | |
| endDate | date | |
| ruleId | uuid | FK ProfitSharingRule (snapshot da regra vigente) |
| status | enum | OPEN \| CLOSED |
| baseTypeUsed | enum | NET_RESULT \| GROSS_REVENUE \| MANUAL |
| totalRevenue | decimal? | Snapshot receita bruta do período |
| totalCosts | decimal? | Snapshot custos do período (se base NET_RESULT) |
| totalAmount | decimal | Valor total a distribuir |
| manualJustification | string? | Obrigatório se baseType = MANUAL |
| snapshotData | json | Freeze completo dos inputs do cálculo |
| closedAt | datetime? | |
| closedBy | uuid? | FK User |
| createdBy | uuid | FK User |
| createdAt | datetime | |

**Business rule**: Período CLOSED é imutável. nenhuma coluna pode ser alterada após fechamento.

### ProfitSharingResult

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| periodId | uuid | FK ProfitSharingPeriod |
| memberId | uuid | FK Member |
| amount | decimal | Valor calculado para o cooperado |
| calculationDetail | json | Detalhamento: {criteria_breakdown: [{criterion, percentage, base_value, portion}], total_weight_sorted?, total_attendance?} |

---

## Members, EPIs & Attendance

### EpiType

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | Ex: Luva de raspa, Bota de borracha |
| description | string? | |
| isActive | boolean | |

### EpiDelivery

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| memberId | uuid | FK Member |
| epiTypeId | uuid | FK EpiType |
| quantity | int | |
| deliveredAt | date | |
| deliveredBy | uuid | FK User |
| notes | string? | |
| documentUrl | string? | URL do termo gerado |

### AttendanceRecord

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| memberId | uuid | FK Member |
| date | date | |
| shift | enum | MORNING \| AFTERNOON \| FULL_DAY |
| status | enum | PRESENT \| ABSENT \| JUSTIFIED |
| justification | string? | Obrigatório quando JUSTIFIED |
| registeredBy | uuid | FK User |
| createdAt | datetime | |

---

## Audit

### AuditLog

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| entityType | string | Nome da entidade: 'Sale', 'User', 'ProfitSharingPeriod', etc. |
| entityId | uuid | |
| action | enum | CREATE \| UPDATE \| DELETE \| STATE_CHANGE |
| previousState | json? | Estado antes da ação |
| newState | json? | Estado após a ação |
| userId | uuid | FK User |
| ipAddress | string? | |
| userAgent | string? | |
| createdAt | datetime | Imutável |

---

## State Machines Summary

```
CollectionRoute:   PLANNED → IN_PROGRESS → COMPLETED

SortingSession:    OPEN → CLOSED
                        ↘ CANCELLED

Sale:              REGISTERED → DELIVERED → PAID

RejectStockItem:   GENERATED → AVAILABLE → RESERVED_FOR_SALE → SOLD
                                   ↘ FOR_DISCARD → DISCARDED

AccountPayable:    PENDING → OVERDUE → PAID

AccountReceivable: PENDING → OVERDUE → RECEIVED

ProfitSharingPeriod: OPEN → CLOSED (imutável após fechar)

User:              active ↔ inactive
```

---

## Key Indexes

```sql
-- Stock performance
CREATE INDEX idx_stock_event_subcategory ON StockEvent(materialSubcategoryId, eventType, createdAt);
CREATE INDEX idx_stock_balance_lookup ON StockBalance(materialSubcategoryId, measureUnitId, stockType);

-- Financial queries
CREATE INDEX idx_ledger_date_category ON FinancialLedger(createdAt, category, isProjected);
CREATE INDEX idx_ledger_cost_center ON FinancialLedger(costCenterId, createdAt);
CREATE INDEX idx_ap_status_due ON AccountPayable(status, dueDate);
CREATE INDEX idx_ar_status ON AccountReceivable(status, dueDate);

-- Audit
CREATE INDEX idx_audit_entity ON AuditLog(entityType, entityId, createdAt);

-- Sorting
CREATE INDEX idx_sorting_status ON SortingSession(status, materialSubcategoryId);
```
