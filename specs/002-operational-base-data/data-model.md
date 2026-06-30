# Data Model: Fase 2 — Cadastros Base Operacionais

**Feature**: `002-operational-base-data` | **Date**: 2026-06-29

## Entity Relationship Overview

```
User (Fase 1)
  ├── Member ──── MemberRole
  └── Buyer

MaterialCategory ──── MaterialSubcategory ──── UnitOfMeasure
                                                   │
Vehicle ──────────────────────────────────── (capacityUnitId FK)

EpiType
CostCenter
AuditLog (Fase 1 — sem alterações)
```

---

## Novos Models desta Fase

### MemberRole

Função operacional do cooperado (triador, motorista, etc.). Gerenciada pelo ADMIN.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | unique; ex.: "Triador", "Motorista" |
| isDefault | boolean | true = função padrão do sistema, não removível |
| isActive | boolean | default true |
| createdAt | datetime | |
| updatedAt | datetime | |

**Funções padrão do seed** (isDefault: true): Triador, Motorista, Cooperado Geral, Coordenador, Outro

**Business rules**:
- Nome único entre todas as funções
- Funções inativas não podem ser selecionadas em novos cadastros de Member
- Funções padrão (isDefault: true) não podem ser excluídas nem renomeadas — apenas ativadas/inativadas
- Member.roleId preserva FK para função inativa (histórico intocável)

**State transitions**: `isActive: true` ↔ `isActive: false`

---

### Member

Cooperado interno da cooperativa.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | nome completo |
| cpf | string | unique; formato "000.000.000-00"; validado com dígito verificador |
| phone | string | |
| email | string? | opcional |
| admittedAt | date | data de ingresso |
| roleId | uuid | FK MemberRole — DEVE ser função ativa no momento do cadastro |
| isActive | boolean | default true |
| notes | string? | observações livres |
| userId | uuid? | FK User — opcional; vinculação separada do cadastro |
| createdAt | datetime | |
| updatedAt | datetime | |

**Business rules**:
- CPF único entre Members
- `roleId` deve referenciar MemberRole ativa no momento de CREATE ou UPDATE
- `userId` quando informado deve referenciar User ativo; o mesmo User não pode estar vinculado a mais de um Member
- `userId` e User.buyerId são mutuamente exclusivos (User não pode ser Member e Buyer ao mesmo tempo)
- Inativar Member NÃO inativa o User vinculado
- Member inativo deve ser excluído de seletores operacionais (coleta, presença, EPI)

**State transitions**: `isActive: true` ↔ `isActive: false`

---

### MaterialCategory

Categoria de material reciclável (nível 1 da hierarquia).

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | unique |
| description | string? | |
| isActive | boolean | default true |
| createdAt | datetime | |
| updatedAt | datetime | |

**Business rules**:
- Nome único entre categorias
- Inativação bloqueada se houver MaterialSubcategory com `isActive: true` vinculada
- Subcategorias inativas permanecem vinculadas (preservação histórica)

**State transitions**: `isActive: true` ↔ `isActive: false` (bloqueada se tem subcategorias ativas)

---

### MaterialSubcategory

Subcategoria de material (nível 2 da hierarquia).

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| categoryId | uuid | FK MaterialCategory |
| name | string | único dentro da mesma categoria |
| defaultUnitId | uuid | FK UnitOfMeasure — unidade padrão de pesagem |
| isSellable | boolean | indica se pode ser vendido |
| acceptsStock | boolean | indica se entra no controle de estoque futuro |
| notes | string? | |
| isActive | boolean | default true |
| createdAt | datetime | |
| updatedAt | datetime | |

**Business rules**:
- Nome único dentro da mesma `categoryId` (não global)
- `defaultUnitId` deve referenciar UnitOfMeasure ativa
- Subcategoria inativa excluída de seletores operacionais

**State transitions**: `isActive: true` ↔ `isActive: false`

---

### UnitOfMeasure

Unidade de medida flexível com conversão opcional.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | unique; ex.: "Quilograma", "Tonelada" |
| symbol | string | unique; ex.: "kg", "t" |
| baseUnitId | uuid? | FK UnitOfMeasure (auto-referência); null = unidade base |
| conversionFactor | decimal? | fator de conversão para a unidade base; obrigatório se baseUnitId informado |
| isActive | boolean | default true |
| createdAt | datetime | |
| updatedAt | datetime | |

**Business rules**:
- Nome e símbolo únicos globalmente
- `baseUnitId` e `conversionFactor` devem ser preenchidos juntos ou ambos nulos
- Uma unidade não pode referenciar a si mesma como `baseUnitId`
- Unidade inativa pode ser mantida como `baseUnitId` de outras (preservação histórica)
- Unidade inativa não pode ser selecionada em novos cadastros de MaterialSubcategory ou Vehicle

**State transitions**: `isActive: true` ↔ `isActive: false`

---

### Buyer

Comprador externo (pessoa física ou jurídica).

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| legalName | string | razão social ou nome |
| documentType | enum | CPF \| CNPJ |
| documentNumber | string | unique; validado com dígito verificador |
| phone | string? | |
| email | string? | |
| addressStreet | string? | logradouro |
| addressNumber | string? | número |
| addressComplement | string? | complemento |
| addressCity | string? | cidade |
| addressState | string? | UF |
| addressZip | string? | CEP; formato "00000-000" |
| notes | string? | |
| isActive | boolean | default true |
| userId | uuid? | FK User com perfil BUYER; opcional |
| createdAt | datetime | |
| updatedAt | datetime | |

**Business rules**:
- `documentNumber` único entre compradores (independente do tipo)
- `userId` quando informado deve ter perfil BUYER; o mesmo User não pode estar vinculado a mais de um Buyer
- Buyer inativo excluído de seletores de venda
- Inativar Buyer NÃO inativa o User vinculado

**State transitions**: `isActive: true` ↔ `isActive: false`

---

### Vehicle

Veículo da cooperativa para coleta e transporte.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| plate | string | unique; formato brasileiro (AAA-0000 ou AAA-0A00) |
| type | enum | TRUCK \| VAN \| PICKUP \| MOTORCYCLE \| OTHER |
| model | string | ex.: "VW Delivery 9.170" |
| capacityValue | decimal? | valor numérico da capacidade estimada |
| capacityUnitId | uuid? | FK UnitOfMeasure; obrigatório se capacityValue informado |
| capacityNotes | string? | observação livre sobre capacidade |
| isActive | boolean | default true |
| notes | string? | |
| createdAt | datetime | |
| updatedAt | datetime | |

**Business rules**:
- Placa única entre veículos
- Se `capacityValue` informado, `capacityUnitId` é obrigatório (e vice-versa)
- `capacityUnitId` deve referenciar UnitOfMeasure ativa em novos cadastros; veículos existentes preservam FK mesmo se unidade for inativada
- Veículo inativo excluído de seletores de coleta/rota

**State transitions**: `isActive: true` ↔ `isActive: false`

---

### EpiType

Tipo de Equipamento de Proteção Individual.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | unique; ex.: "Luva de raspa", "Bota PVC" |
| defaultValidityDays | int? | validade padrão em dias; null = sem prazo definido |
| isActive | boolean | default true |
| createdAt | datetime | |
| updatedAt | datetime | |

**Business rules**:
- Nome único entre tipos de EPI
- `defaultValidityDays` quando informado deve ser > 0

**State transitions**: `isActive: true` ↔ `isActive: false`

---

### CostCenter

Centro de custo para classificação de lançamentos financeiros futuros.

| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | string | unique |
| code | string? | unique quando informado; ex.: "LOG-001" |
| description | string? | |
| isActive | boolean | default true |
| createdAt | datetime | |
| updatedAt | datetime | |

**Business rules**:
- Nome único entre centros de custo
- Código único quando informado; ignorar maiúsculas/minúsculas na verificação de unicidade
- Centro de custo inativo excluído de seletores financeiros futuros

**State transitions**: `isActive: true` ↔ `isActive: false`

---

## Alterações em Models Existentes (Fase 1)

### User (sem alterações de schema)

O campo `memberId` já previsto na Fase 1 continuará sendo preenchido quando um Member for vinculado. Nenhuma coluna nova em User.

### CooperativeSettings (sem alterações nesta fase)

O campo `vehicleCostCenterId` previsto na Fase 1 para CostCenter será preenchível quando CostCenter for cadastrado. Nenhuma coluna nova.

---

## Novos Enums Prisma

```prisma
enum VehicleType {
  TRUCK
  VAN
  PICKUP
  MOTORCYCLE
  OTHER
}

enum DocumentType {
  CPF
  CNPJ
}
```

---

## Índices Recomendados

| Tabela | Campos | Tipo | Motivo |
|---|---|---|---|
| Member | cpf | unique | busca e unicidade |
| Member | isActive | btree | filtro padrão de listagem |
| Member | roleId | btree | FK + filtro por função |
| MaterialSubcategory | categoryId, isActive | btree | listagem por categoria |
| UnitOfMeasure | symbol | unique | unicidade |
| Buyer | documentNumber | unique | unicidade |
| Buyer | isActive | btree | filtro padrão |
| Vehicle | plate | unique | unicidade |
| CostCenter | code | unique (partial, when not null) | unicidade de código |

---

## Diagrama de Relacionamentos (resumo)

```
MemberRole (1) ←── Member (N)
                    └── User? (1)

MaterialCategory (1) ←── MaterialSubcategory (N)
                              └── UnitOfMeasure (1) ──── Vehicle.capacityUnit?

User? (1) ←── Buyer (N)

EpiType   (standalone)
CostCenter (standalone)
```
