# Data Model: Fase 3 — Coleta, Rotas e Entrada de Material Bruto

**Feature**: `003-collection-routes-raw-material` | **Date**: 2026-06-30

---

## Novos Enums (Prisma)

```prisma
enum RouteStatus {
  PLANEJADA
  EM_ANDAMENTO
  CONCLUIDA
  CANCELADA
}

enum RawMaterialStockEventType {
  ENTRADA_BRUTO
  ESTORNO_BRUTO
}
```

---

## Novos Modelos (Prisma)

```prisma
// ─── Phase 3: Collection Routes & Raw Material ───────────────────────────────

model CollectionPoint {
  id              String       @id @default(uuid())
  name            String
  address         String
  latitude        Decimal?     @db.Decimal(10, 7)
  longitude       Decimal?     @db.Decimal(10, 7)
  locationPending Boolean      @default(true)
  reference       String?
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  routePoints     RoutePoint[]

  @@index([isActive])
  @@index([name])
}

model CollectionRoute {
  id          String      @id @default(uuid())
  name        String
  plannedDate DateTime    @db.Date
  status      RouteStatus @default(PLANEJADA)
  startedAt   DateTime?
  completedAt DateTime?
  cancelReason String?
  vehicleId   String
  vehicle     Vehicle     @relation(fields: [vehicleId], references: [id])
  driverId    String
  driver      User        @relation("RouteDriver", fields: [driverId], references: [id])
  notes       String?
  version     Int         @default(0)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  routePoints     RoutePoint[]
  teamMembers     RouteTeamMember[]
  materialEntries RawMaterialEntry[]

  @@index([status])
  @@index([driverId])
  @@index([plannedDate])
}

model RoutePoint {
  id                String          @id @default(uuid())
  routeId           String
  route             CollectionRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)
  collectionPointId String
  collectionPoint   CollectionPoint @relation(fields: [collectionPointId], references: [id])
  sequence          Int
  notes             String?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  @@unique([routeId, collectionPointId])
  @@unique([routeId, sequence])
  @@index([routeId, sequence])
}

model RouteTeamMember {
  id      String          @id @default(uuid())
  routeId String
  route   CollectionRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)
  userId  String
  user    User            @relation("RouteTeamMember", fields: [userId], references: [id])
  addedAt DateTime        @default(now())

  @@unique([routeId, userId])
  @@index([routeId])
}

model RawMaterialEntry {
  id            String              @id @default(uuid())
  routeId       String
  route         CollectionRoute     @relation(fields: [routeId], references: [id])
  subcategoryId String
  subcategory   MaterialSubcategory @relation("RawMaterialEntrySubcategory", fields: [subcategoryId], references: [id])
  quantity      Decimal             @db.Decimal(12, 3)
  unitId        String
  unit          UnitOfMeasure       @relation("RawMaterialEntryUnit", fields: [unitId], references: [id])
  notes         String?
  userId        String
  user          User                @relation("RawMaterialEntryUser", fields: [userId], references: [id])
  createdAt     DateTime            @default(now())

  stockEvent RawMaterialStockEvent?

  @@index([routeId])
  @@index([subcategoryId, unitId])
}

model RawMaterialStockEvent {
  id                 String                    @id @default(uuid())
  type               RawMaterialStockEventType
  subcategoryId      String
  subcategory        MaterialSubcategory       @relation("StockEventSubcategory", fields: [subcategoryId], references: [id])
  unitId             String
  unit               UnitOfMeasure             @relation("StockEventUnit", fields: [unitId], references: [id])
  quantity           Decimal                   @db.Decimal(12, 3)
  rawMaterialEntryId String?                   @unique
  rawMaterialEntry   RawMaterialEntry?         @relation(fields: [rawMaterialEntryId], references: [id])
  referencedEventId  String?
  referencedEvent    RawMaterialStockEvent?    @relation("EventReversal", fields: [referencedEventId], references: [id])
  reversals          RawMaterialStockEvent[]   @relation("EventReversal")
  justification      String?
  userId             String
  user               User                      @relation("StockEventUser", fields: [userId], references: [id])
  createdAt          DateTime                  @default(now())

  @@index([subcategoryId, unitId])
  @@index([type])
  @@index([rawMaterialEntryId])
}
```

---

## Relacionamentos com Modelos Existentes

| Modelo existente | Relacionamento novo |
|---|---|
| `Vehicle` | `CollectionRoute.vehicle` (1:N — um veículo em N rotas) |
| `User` | `CollectionRoute.driver` (motorista responsável), `RouteTeamMember.user` (equipe), `RawMaterialEntry.user` (quem registrou), `RawMaterialStockEvent.user` (quem gerou) |
| `MaterialSubcategory` | `RawMaterialEntry.subcategory`, `RawMaterialStockEvent.subcategory` |
| `UnitOfMeasure` | `RawMaterialEntry.unit`, `RawMaterialStockEvent.unit` |

> Os modelos `User`, `Vehicle`, `MaterialSubcategory` e `UnitOfMeasure` precisam de back-relations explícitas no schema.

---

## Entidade Calculada: SaldoBruto

`SaldoBruto` **não é persistida** — é uma projeção calculada por query SQL:

```sql
SELECT
  subcategoryId,
  unitId,
  SUM(quantity) AS balance
FROM "RawMaterialStockEvent"
GROUP BY subcategoryId, unitId
HAVING SUM(quantity) >= 0
```

- `ENTRADA_BRUTO` → `quantity` positiva
- `ESTORNO_BRUTO` → `quantity` negativa (armazenada assim no banco)
- Consulta inclui subcategorias inativas (histórico preservado)

---

## Regras de Integridade

### CollectionPoint
- `name` não tem unicidade global (pontos em ruas diferentes podem ter nome similar); unicidade não é imposta no banco
- `locationPending = true` quando `latitude IS NULL OR longitude IS NULL`
- Ao receber coordenadas válidas → `locationPending = false` + auditoria

### CollectionRoute
- `driverId`: referencia `User` com perfil DRIVER
- `vehicleId`: referencia `Vehicle` ativo
- `version`: incrementado atomicamente a cada transição de estado (optimistic locking)
- `cancelReason`: nullable no banco; preenchido obrigatoriamente ao cancelar uma rota
- Transições permitidas:
  - `PLANEJADA → EM_ANDAMENTO` (apenas driverId ou admin/manager)
  - `EM_ANDAMENTO → CONCLUIDA` (apenas driverId ou admin/manager)
  - `PLANEJADA → CANCELADA` (admin/manager; exige `cancelReason`)
  - `EM_ANDAMENTO → CANCELADA` (admin/manager; exige `cancelReason`)
  - Nenhuma outra transição é válida

### RoutePoint
- `sequence` único por rota → reordenação substitui todos os valores de sequência atomicamente
- Ponto inativado após associação à rota: permanece na rota com indicação visual (campo `collectionPoint.isActive` consultado no join)
- Não há `onDelete` em cascata para `CollectionPoint` (ponto não é deletado ao remover da rota)

### RawMaterialEntry
- `quantity > 0` validado na camada de serviço antes de persistir
- `routeId` NOT NULL — sem entrada avulsa
- Rota deve estar `EM_ANDAMENTO` ou `CONCLUIDA` no momento do registro
- Sempre cria um `RawMaterialStockEvent` do tipo `ENTRADA_BRUTO` na mesma transação

### RawMaterialStockEvent
- `quantity`: positiva para `ENTRADA_BRUTO`, **negativa** para `ESTORNO_BRUTO`
- `rawMaterialEntryId` NOT NULL para `ENTRADA_BRUTO`, NULL para `ESTORNO_BRUTO`
- `referencedEventId` NOT NULL para `ESTORNO_BRUTO`, NULL para `ENTRADA_BRUTO`
- `justification` NOT NULL para `ESTORNO_BRUTO`
- Nenhum campo é atualizável após criação — sem UPDATE/DELETE routes no repositório
- Antes de criar `ESTORNO_BRUTO`: verificar que saldo resultante ≥ 0 (dentro de transação)

---

## Migration Strategy

Uma migration Prisma incremental (`Phase3_CollectionRoutesRawMaterial`):
1. Adiciona enums: `RouteStatus`, `RawMaterialStockEventType`
2. Adiciona tabelas: `CollectionPoint`, `CollectionRoute`, `RoutePoint`, `RouteTeamMember`, `RawMaterialEntry`, `RawMaterialStockEvent`
3. Adiciona back-relations nos modelos existentes (`Vehicle`, `User`, `MaterialSubcategory`, `UnitOfMeasure`)
4. Nenhuma alteração destrutiva em tabelas ou dados existentes
