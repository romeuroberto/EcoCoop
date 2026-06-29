# Quickstart: Validação do EcoCoop MVP

**Feature**: `001-ecocoop-mvp` | **Date**: 2026-06-29

Este guia descreve como validar os fluxos principais do EcoCoop MVP após implementação.

## Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 20+ instalado (para desenvolvimento)
- Repositório clonado e dependências instaladas (`npm install` na raiz)

## Inicialização do Ambiente

```bash
# Subir ambiente de desenvolvimento
docker compose -f infra/docker/docker-compose.dev.yml up -d

# Rodar migrations do banco
npm run --workspace=apps/backend prisma:migrate

# Rodar seeds iniciais (cooperativa + admin)
npm run --workspace=apps/backend prisma:seed

# Iniciar backend (desenvolvimento)
npm run --workspace=apps/backend start:dev

# Iniciar frontend (em outro terminal)
npm run --workspace=apps/frontend dev
```

**Acesso**: Frontend em `http://localhost:5173`, API em `http://localhost:3000/api/v1`

**Credenciais do seed**:
- Admin: `admin@ecocoop.local` / `admin123`
- Gestor: `gestor@ecocoop.local` / `gestor123`

---

## Fluxo 1: Autenticação e Permissões

**Objetivo**: Verificar login, redirecionamento por perfil e bloqueio de acesso não autorizado.

```bash
# 1. Login como admin → deve redirecionar para /dashboard
POST /api/v1/auth/login { "email": "admin@ecocoop.local", "password": "admin123" }
# Esperado: { profile: "ADMIN", redirectTo: "/dashboard" }

# 2. Criar um cooperado com perfil "SORTER"
POST /api/v1/users { email: "triador@ecocoop.local", ..., profileId: <sorter-profile-id> }

# 3. Login como triador → não deve ver módulo de financeiro
GET /api/v1/finance/cashflow (com token do triador)
# Esperado: 403 Forbidden
```

✅ **Validado quando**: Triador não consegue acessar `/finance/*` mesmo com token válido.

---

## Fluxo 2: Cadastros Base

**Objetivo**: Verificar criação de materiais, unidades, compradores e veículos.

```bash
# Criar categoria + subcategoria
POST /api/v1/materials/categories { name: "Plástico" }
POST /api/v1/materials/categories/:id/subcategories { name: "PET" }

# Criar unidade de medida
POST /api/v1/materials/units { name: "Quilograma", symbol: "kg" }

# Criar comprador
POST /api/v1/buyers { legalName: "Recicla Mais", documentNumber: "12.345.678/0001-00", ... }

# Criar veículo
POST /api/v1/vehicles { licensePlate: "ABC-1234", model: "VW Delivery", capacityKg: 3000 }
```

✅ **Validado quando**: Todos os cadastros aparecem nas listagens e ficam disponíveis para seleção nos módulos operacionais.

---

## Fluxo 3: Rota de Coleta com Mapa

**Objetivo**: Criar rota, geocodificar pontos, sugerir sequência, executar e encerrar.

```bash
# 1. Criar rota
POST /api/v1/routes { name: "Rota Centro", plannedDate: "2026-07-01", vehicleId: "...", driverMemberId: "..." }

# 2. Adicionar pontos de coleta
POST /api/v1/routes/:routeId/points { address: "Rua XV de Novembro, 500, Centro", reference: "Supermercado BomPreço" }
POST /api/v1/routes/:routeId/points { address: "Av. Brasil, 200, Jardim", reference: "Escola Municipal" }
POST /api/v1/routes/:routeId/points { address: "Praça da República, 10", reference: "Feira livre" }
# Cada ponto deve retornar com latitude/longitude preenchidos via geocoding

# 3. Solicitar sugestão de sequência
POST /api/v1/routes/:routeId/suggest-order
# Esperado: array de ordens sugeridas baseado em nearest-neighbor

# 4. Iniciar execução
POST /api/v1/routes/:routeId/start

# 5. Registrar coleta no ponto 1
POST /api/v1/routes/:routeId/points/:pointId/collect
{ "entries": [{ "materialSubcategoryId": "<PET-id>", "quantity": 30, "measureUnitId": "<kg-id>" }] }

# 6. Encerrar rota
POST /api/v1/routes/:routeId/complete
```

✅ **Validado quando**: Após encerrar rota, `GET /api/v1/stock/raw` mostra 30 kg de PET com `availableQuantity > 0`.

---

## Fluxo 4: Entrada Manual e Triagem

**Objetivo**: Registrar entrada manual, abrir triagem com reserva FIFO, encerrar triagem.

```bash
# 1. Entrada manual de material bruto
POST /api/v1/stock/raw/entry
{ "materialSubcategoryId": "<papelao-id>", "quantity": 100, "measureUnitId": "<kg-id>",
  "origin": "DONATION", "notes": "Doação empresa XYZ" }

# 2. Verificar três saldos
GET /api/v1/stock/raw
# Esperado: { totalQuantity: 100, reservedQuantity: 0, availableQuantity: 100 }

# 3. Abrir sessão de triagem (reserva 100 kg)
POST /api/v1/sorting
{ "materialSubcategoryId": "<papelao-id>", "measureUnitId": "<kg-id>", "quantity": 100, "sorterId": "<id>" }
# Esperado: stoque bruto { reservedQuantity: 100, availableQuantity: 0 }

# 4. Registrar items da triagem
POST /api/v1/sorting/:sessionId/items
{
  "items": [
    { "outputType": "READY", "materialSubcategoryId": "<papelao-id>", "quantity": 70, "measureUnitId": "<kg-id>" },
    { "outputType": "REJECT", "materialSubcategoryId": "<papelao-id>", "quantity": 15, "measureUnitId": "<kg-id>" },
    { "outputType": "LOSS", "materialSubcategoryId": "<papelao-id>", "quantity": 15, "measureUnitId": "<kg-id>",
      "lossJustification": "Material úmido inaproveitável" }
  ]
}

# 5. Encerrar sessão
POST /api/v1/sorting/:sessionId/close
```

✅ **Validado quando**:
- Estoque bruto: `totalQuantity = 0, reservedQuantity = 0`
- Estoque pronto: `totalQuantity = 70` para papelão
- Estoque rejeito: 15 kg com status `GENERATED`

---

## Fluxo 5: Venda e Portal do Comprador

**Objetivo**: Registrar venda, confirmar entrega, acessar portal do comprador.

```bash
# 1. Registrar venda
POST /api/v1/sales
{ "buyerId": "<recicla-mais-id>",
  "items": [{ "materialSubcategoryId": "<papelao-id>", "quantity": 70, "measureUnitId": "<kg-id>", "unitPrice": 0.80 }] }
# Esperado: sale criada com status REGISTERED + accountReceivable de R$56,00 criada automaticamente

# 2. Confirmar entrega
POST /api/v1/sales/:saleId/confirm-delivery
# Esperado: status → DELIVERED, estoque pronto de papelão = 0

# 3. Emitir romaneio
GET /api/v1/sales/:saleId/documents/romaneio
# Esperado: PDF com dados da cooperativa, comprador, materiais, quantidades

# 4. Login como comprador no portal
POST /api/v1/auth/login { "email": "comprador@reciclamais.com", "password": "..." }
# Esperado: { redirectTo: "/portal" }

# 5. Comprador confirma recebimento
POST /api/v1/portal/sales/:saleId/confirm-receipt

# 6. Registrar pagamento
POST /api/v1/sales/:saleId/confirm-payment { "amount": 56.00 }
# Esperado: sale status → PAID, AR baixada, lançamento no fluxo de caixa
```

✅ **Validado quando**: Comprador não consegue acessar `/api/v1/sales` (painel admin) com seu token.

---

## Fluxo 6: Financeiro e Rateio

**Objetivo**: Lançar CP, fechar caixa e calcular rateio.

```bash
# 1. Lançar conta a pagar
POST /api/v1/finance/accounts-payable
{ "description": "Aluguel galpão", "value": 1500.00, "dueDate": "2026-07-10", "costCenterId": "<operacao-id>" }

# 2. Registrar pagamento
POST /api/v1/finance/accounts-payable/:apId/pay

# 3. Verificar fluxo de caixa
GET /api/v1/finance/cashflow?startDate=2026-07-01&endDate=2026-07-31
# Esperado: crédito de R$56 (venda), débito de R$1500 (aluguel)

# 4. Configurar regra de rateio
POST /api/v1/profit-sharing/rules
{
  "baseType": "NET_RESULT",
  "criteria": [
    { "type": "EQUAL", "percentage": 30 },
    { "type": "BY_WEIGHT", "percentage": 70 }
  ]
}

# 5. Criar e fechar período de rateio
POST /api/v1/profit-sharing/periods { "startDate": "2026-07-01", "endDate": "2026-07-31", "ruleId": "<id>" }
GET /api/v1/profit-sharing/periods/:id/preview   # Pré-visualizar sem fechar
POST /api/v1/profit-sharing/periods/:id/close    # Fechar e congelar

# 6. Verificar imutabilidade
POST /api/v1/profit-sharing/rules (nova regra)
PUT /api/v1/profit-sharing/rules/:newRuleId/activate
# Re-tentativa de fechar período já fechado deve retornar 400 com code PERIOD_ALREADY_CLOSED
```

✅ **Validado quando**: Cada cooperado vê seu resultado com o detalhamento do cálculo; período não pode ser reaberto.

---

## Fluxo 7: Documentos PDF

**Objetivo**: Verificar geração de todos os documentos obrigatórios.

```bash
GET /api/v1/sales/:id/documents/romaneio          # Romaneio de venda
GET /api/v1/sales/:id/documents/delivery-receipt  # Comprovante de entrega
POST /api/v1/members/:id/epi-deliveries { ... }
GET /api/v1/members/:id/epi-deliveries/:deliveryId/document  # Termo de EPI
GET /api/v1/profit-sharing/periods/:id/documents/:memberId   # Comprovante de rateio
GET /api/v1/reports/result/pdf?startDate=...&endDate=...     # Relatório de resultado
```

✅ **Validado quando**: Todos os endpoints retornam `Content-Type: application/pdf` com arquivo válido em < 10 segundos.

---

## Testes Automatizados

```bash
# Rodar suite completa de testes
npm run test --workspaces

# Apenas críticos (auth, stock, finance, profit-sharing)
npm run --workspace=apps/backend test:critical

# Coverage para áreas críticas
npm run --workspace=apps/backend test:coverage
```

**Critérios de aprovação**:
- Áreas críticas (auth, stock, sorting, finance, sales, profit-sharing, documents): ≥ 80% cobertura
- Zero falhas em testes de integração
- Zero falhas em testes de permissão (matriz perfil × endpoint)
