# Quickstart: Fase 2 — Cadastros Base Operacionais

**Feature**: `002-operational-base-data` | **Date**: 2026-06-29

> Guia de validação end-to-end dos cadastros base operacionais. Assume que a Fase 1 está implementada e o ambiente de desenvolvimento está rodando (backend na porta 3000, frontend na porta 5173).

---

## Pré-requisitos

```bash
# Backend rodando
npx -w apps/backend nest start --watch

# Banco de dados acessível (PostgreSQL na porta 5433)
# Migration da Fase 2 aplicada
npx -w apps/backend prisma migrate dev

# Seed executado (inclui funções padrão de cooperado e módulos RBAC)
npx -w apps/backend prisma db seed
```

---

## Cenários de Validação

### 1. Funções de Cooperado (MemberRole)

**Objetivo**: verificar que funções padrão foram criadas e que ADMIN pode gerenciar, MANAGER apenas visualiza.

```bash
# Login como admin
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ecocoop.local","password":"admin123"}' \
  | jq '.accessToken'
# Copie o token para ADMIN_TOKEN

# Listar funções (deve retornar 5 funções padrão — resposta paginada)
curl -s "http://localhost:3000/api/v1/member-roles?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[].name'
# Esperado: "Triador", "Motorista", "Cooperado Geral", "Coordenador", "Outro"
# .total deve ser 5

# Criar nova função
curl -s -X POST http://localhost:3000/api/v1/member-roles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Administrativo"}' | jq '.id'
# Esperado: 201 com id da nova função

# Verificar que MANAGER não pode criar
curl -s -X POST http://localhost:3000/api/v1/member-roles \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste"}' | jq '.statusCode'
# Esperado: 403
```

---

### 2. Cooperados (Member)

**Objetivo**: verificar CRUD, unicidade de CPF, vinculação de usuário e filtro por status.

```bash
# Buscar id de uma função ativa
ROLE_ID=$(curl -s "http://localhost:3000/api/v1/member-roles?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')

# Criar cooperado
MEMBER=$(curl -s -X POST http://localhost:3000/api/v1/members \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Maria Santos\",
    \"cpf\": \"529.982.247-25\",
    \"phone\": \"(11) 91234-5678\",
    \"admittedAt\": \"2024-01-15\",
    \"roleId\": \"$ROLE_ID\"
  }")
echo $MEMBER | jq '.id'
# Esperado: 201 com id

# Verificar duplicidade de CPF
curl -s -X POST http://localhost:3000/api/v1/members \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Outro\",\"cpf\":\"529.982.247-25\",\"phone\":\"x\",\"admittedAt\":\"2024-01-15\",\"roleId\":\"$ROLE_ID\"}" \
  | jq '.code'
# Esperado: "MEMBER_CPF_CONFLICT"

# Inativar cooperado
MEMBER_ID=$(echo $MEMBER | jq -r '.id')
curl -s -X PATCH http://localhost:3000/api/v1/members/$MEMBER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}' | jq '.isActive'
# Esperado: false

# Verificar que cooperado inativo não aparece na listagem padrão (status=active por default)
curl -s "http://localhost:3000/api/v1/members" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '[.data[].id] | contains(["'$MEMBER_ID'"])'
# Esperado: false
```

---

### 3. Hierarquia de Materiais

**Objetivo**: verificar categoria + subcategoria + bloqueio de inativação com subcategorias ativas.

```bash
# Criar categoria
CATEGORY=$(curl -s -X POST http://localhost:3000/api/v1/material-categories \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Plástico","description":"Materiais plásticos em geral"}')
CAT_ID=$(echo $CATEGORY | jq -r '.id')

# Buscar id de uma unidade ativa
UNIT_ID=$(curl -s "http://localhost:3000/api/v1/units?limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')

# Criar subcategoria
curl -s -X POST http://localhost:3000/api/v1/material-subcategories \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"categoryId\":\"$CAT_ID\",\"name\":\"PET\",\"defaultUnitId\":\"$UNIT_ID\",\"isSellable\":true,\"acceptsStock\":true}" \
  | jq '.id'
# Esperado: 201

# Tentar inativar categoria com subcategoria ativa (deve falhar)
curl -s -X PATCH http://localhost:3000/api/v1/material-categories/$CAT_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}' | jq '.code'
# Esperado: "CANNOT_DEACTIVATE_CATEGORY_WITH_ACTIVE_SUBCATEGORIES"
```

---

### 4. Unidades de Medida

**Objetivo**: verificar criação com e sem conversão, unicidade de símbolo, auto-referência bloqueada.

```bash
# Criar unidade base (kg — pode já existir no seed)
KG=$(curl -s -X POST http://localhost:3000/api/v1/units \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Quilograma","symbol":"kg"}')
KG_ID=$(echo $KG | jq -r '.id // empty')
# Se já existe, buscar pelo símbolo
[ -z "$KG_ID" ] && KG_ID=$(curl -s "http://localhost:3000/api/v1/units?search=kg&limit=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')

# Criar tonelada com conversão para kg
curl -s -X POST http://localhost:3000/api/v1/units \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Tonelada\",\"symbol\":\"t\",\"baseUnitId\":\"$KG_ID\",\"conversionFactor\":1000}" \
  | jq '{name,conversionFactor}'
# Esperado: {name: "Tonelada", conversionFactor: 1000}

# Criar unidade sem conversão (saco)
curl -s -X POST http://localhost:3000/api/v1/units \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Saco","symbol":"sc"}' | jq '.conversionFactor'
# Esperado: null (sem conversão)
```

---

### 5. Compradores

**Objetivo**: verificar CRUD, unicidade de documento, vinculação de usuário BUYER.

```bash
# Criar comprador
BUYER=$(curl -s -X POST http://localhost:3000/api/v1/buyers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "legalName": "Recicla Mais Ltda",
    "documentType": "CNPJ",
    "documentNumber": "11.222.333/0001-81",
    "phone": "(11) 3456-7890",
    "email": "compras@reciclamais.com"
  }')
echo $BUYER | jq '.id'
# Esperado: 201

# Verificar login de comprador redireciona para /portal
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"comprador@ecocoop.local","password":"comprador123"}' \
  | jq '.redirectTo'
# Esperado: "/portal"
```

---

### 6. Veículos

**Objetivo**: verificar CRUD, unicidade de placa, capacidade estruturada com FK para UnitOfMeasure.

```bash
# Criar veículo com capacidade
curl -s -X POST http://localhost:3000/api/v1/vehicles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"plate\": \"ABC-1234\",
    \"type\": \"TRUCK\",
    \"model\": \"VW Delivery 9.170\",
    \"capacityValue\": 9000,
    \"capacityUnitId\": \"$KG_ID\"
  }" | jq '{plate, type, capacityValue}'
# Esperado: {plate: "ABC-1234", type: "TRUCK", capacityValue: 9000}

# Tentar criar veículo com capacityValue sem unidade (deve falhar)
curl -s -X POST http://localhost:3000/api/v1/vehicles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plate":"XYZ-9999","type":"VAN","model":"Sprinter","capacityValue":5000}' \
  | jq '.code'
# Esperado: "CAPACITY_UNIT_REQUIRED_WITH_VALUE"
```

---

### 7. Tipos de EPI e Centros de Custo

```bash
# EPI Type
curl -s -X POST http://localhost:3000/api/v1/epi-types \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Luva de raspa","defaultValidityDays":180}' | jq '{name, defaultValidityDays}'
# Esperado: {name: "Luva de raspa", defaultValidityDays: 180}

# Cost Center
curl -s -X POST http://localhost:3000/api/v1/cost-centers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Logística","code":"LOG-001","description":"Custos de transporte e coleta"}' \
  | jq '{name, code}'
# Esperado: {name: "Logística", code: "LOG-001"}

# MANAGER não pode criar centro de custo
curl -s -X POST http://localhost:3000/api/v1/cost-centers \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste"}' | jq '.statusCode'
# Esperado: 403
```

---

### 8. Audit Log — verificar previousState em updates

```bash
# Após PATCH em qualquer entidade, verificar o audit log
# (via Prisma Studio ou query direta ao banco)

# Conectar no banco:
# psql postgresql://ecocoop:ecocoop@localhost:5433/ecocoop -c \
#   "SELECT entity_type, action, previous_state IS NOT NULL as has_prev, new_state IS NOT NULL as has_new \
#    FROM audit_logs ORDER BY created_at DESC LIMIT 10;"

# Para cada UPDATE/PATCH: has_prev deve ser true
# Para cada CREATE (POST): has_prev deve ser false, has_new deve ser true
```

---

## Frontend — Validação Visual

1. Acesse `http://localhost:5173` e faça login como `admin@ecocoop.local`
2. Verifique que o menu lateral exibe todos os novos módulos
3. Em cada módulo, confirme:
   - Listagem carrega apenas registros ativos por padrão
   - Filtro de status funciona (ativo / inativo / todos)
   - Busca por texto funciona case-insensitive
   - Formulário de criação valida campos obrigatórios inline
   - Mensagem de erro específica ao tentar inativar categoria com subcategorias ativas
4. Faça login como `gestor@ecocoop.local` e verifique:
   - Módulos estruturais (materiais, unidades, EPI, centros de custo) exibem apenas listagem — sem botões de criar/editar/inativar
   - Módulos operacionais (cooperados, compradores, veículos) exibem CRUD completo

---

## Referências

- [Data Model](../data-model.md)
- [REST API Contracts](../contracts/rest-api.md)
- [Spec](../spec.md)
