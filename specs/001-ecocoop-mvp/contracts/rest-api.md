# REST API Contracts: EcoCoop MVP

**Base URL**: `/api/v1`
**Auth**: Bearer JWT (header `Authorization: Bearer <token>`)
**Portal do Comprador**: mesma base URL, perfil "BUYER" — redireciona para rotas `/portal/*`

---

## Auth

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| POST | `/auth/login` | Login com email+senha → {accessToken, refreshToken} | ALL |
| POST | `/auth/refresh` | Renova accessToken via refreshToken (httpOnly cookie) | ALL |
| POST | `/auth/logout` | Revoga refresh token | ALL |
| GET | `/auth/me` | Dados do usuário autenticado + perfil | ALL |

**POST `/auth/login` request**:
```json
{ "email": "string", "password": "string" }
```
**Response**:
```json
{
  "accessToken": "string",
  "profile": "ADMIN | MANAGER | SORTER | DRIVER | MEMBER | BUYER",
  "redirectTo": "/dashboard | /portal"
}
```

---

## Cooperative

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/cooperative` | Dados da cooperativa | ADMIN, MANAGER |
| PUT | `/cooperative` | Atualiza dados institucionais — também funciona como **configuração inicial (upsert)**: o seed cria um registro em estado não configurado e o ADMIN preenche via este endpoint no primeiro login; não existe `POST /cooperative/setup` na Fase 1 | ADMIN |
| GET | `/cooperative/settings` | Configurações operacionais | ADMIN, MANAGER |
| PUT | `/cooperative/settings` | Atualiza configurações operacionais | ADMIN |

---

## Users

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/users` | Lista todos os usuários | ADMIN |
| POST | `/users` | Cria usuário | ADMIN |
| GET | `/users/:id` | Detalhes do usuário | ADMIN |
| PATCH | `/users/:id` | Atualiza usuário | ADMIN |
| PATCH | `/users/:id/activate` | Ativa/desativa usuário | ADMIN |
| GET | `/profiles` | Lista perfis disponíveis | ADMIN |
| POST | `/profiles` | Cria perfil customizado | ADMIN |
| PATCH | `/profiles/:id/permissions` | Atualiza permissões do perfil | ADMIN |

---

## Materials

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/materials/categories` | Lista categorias + subcategorias | ADMIN, MANAGER |
| POST | `/materials/categories` | Cria categoria | ADMIN, MANAGER |
| POST | `/materials/categories/:id/subcategories` | Cria subcategoria | ADMIN, MANAGER |
| GET | `/materials/units` | Lista unidades de medida | ALL (internos) |
| POST | `/materials/units` | Cria unidade | ADMIN, MANAGER |

---

## Buyers

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/buyers` | Lista compradores ativos | ADMIN, MANAGER |
| POST | `/buyers` | Cadastra comprador | ADMIN, MANAGER |
| GET | `/buyers/:id` | Detalhes do comprador | ADMIN, MANAGER |
| PATCH | `/buyers/:id` | Atualiza comprador | ADMIN, MANAGER |
| POST | `/buyers/:id/portal-access` | Cria/redefine acesso ao portal | ADMIN |

---

## Vehicles

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/vehicles` | Lista veículos | ADMIN, MANAGER |
| POST | `/vehicles` | Cadastra veículo | ADMIN, MANAGER |
| GET | `/vehicles/:id` | Detalhes + histórico de custos | ADMIN, MANAGER |
| POST | `/vehicles/:id/refuelings` | Registra abastecimento | MANAGER, DRIVER |
| POST | `/vehicles/:id/maintenances` | Registra manutenção | ADMIN, MANAGER |
| GET | `/vehicles/:id/cost-summary` | Resumo de custos por período | ADMIN, MANAGER |

---

## Collection Routes

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/routes` | Lista rotas | ADMIN, MANAGER, DRIVER |
| POST | `/routes` | Cria nova rota | ADMIN, MANAGER |
| GET | `/routes/:id` | Detalhes da rota + pontos + mapa | ADMIN, MANAGER, DRIVER |
| PATCH | `/routes/:id` | Atualiza rota (somente PLANNED) | ADMIN, MANAGER |
| POST | `/routes/:id/points` | Adiciona ponto de coleta | ADMIN, MANAGER |
| PATCH | `/routes/:id/points/reorder` | Reordena pontos | ADMIN, MANAGER |
| POST | `/routes/:id/suggest-order` | Solicita sugestão de sequência | ADMIN, MANAGER |
| POST | `/routes/:id/start` | Inicia execução da rota | DRIVER, MANAGER |
| POST | `/routes/:id/points/:pointId/collect` | Registra coleta em ponto | DRIVER, MANAGER |
| POST | `/routes/:id/points/:pointId/skip` | Marca ponto não coletado | DRIVER, MANAGER |
| POST | `/routes/:id/complete` | Encerra rota + cria eventos de estoque | DRIVER, MANAGER |

**POST `/routes/:id/points/:pointId/collect` request**:
```json
{
  "entries": [
    { "materialSubcategoryId": "uuid", "quantity": 50.0, "measureUnitId": "uuid" }
  ]
}
```

---

## Stock

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/stock/raw` | Saldo estoque bruto (total/reservado/disponível) | ADMIN, MANAGER, SORTER |
| GET | `/stock/raw/events` | Histórico de eventos brutos | ADMIN, MANAGER |
| POST | `/stock/raw/entry` | Entrada manual de material bruto | ADMIN, MANAGER, SORTER |
| POST | `/stock/raw/adjust` | Ajuste de estoque bruto (com justificativa) | ADMIN, MANAGER |
| GET | `/stock/ready` | Saldo estoque pronto | ADMIN, MANAGER, SORTER |
| GET | `/stock/ready/events` | Histórico eventos estoque pronto | ADMIN, MANAGER |
| POST | `/stock/ready/adjust` | Ajuste estoque pronto (com justificativa) | ADMIN, MANAGER |
| GET | `/stock/reject` | Lista itens de rejeito com status | ADMIN, MANAGER |
| PATCH | `/stock/reject/:id/status` | Atualiza status do rejeito | ADMIN, MANAGER |

---

## Sorting (Triagem)

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/sorting` | Lista sessões de triagem | ADMIN, MANAGER, SORTER |
| POST | `/sorting` | Abre nova sessão (reserva estoque FIFO) | ADMIN, MANAGER, SORTER |
| GET | `/sorting/:id` | Detalhes da sessão + itens + origem | ADMIN, MANAGER, SORTER |
| POST | `/sorting/:id/items` | Adiciona/atualiza items da triagem | SORTER, MANAGER |
| PATCH | `/sorting/:id/source` | Ajusta origem dos lotes (override FIFO) | ADMIN, MANAGER |
| POST | `/sorting/:id/close` | Encerra sessão (cria eventos definitivos) | SORTER, MANAGER |
| POST | `/sorting/:id/cancel` | Cancela sessão (libera reserva) | ADMIN, MANAGER |

**POST `/sorting` request**:
```json
{
  "materialSubcategoryId": "uuid",
  "measureUnitId": "uuid",
  "quantity": 100.0,
  "sorterId": "uuid"
}
```

---

## Sales

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/sales` | Lista vendas | ADMIN, MANAGER |
| POST | `/sales` | Registra venda (deduz estoque) | ADMIN, MANAGER |
| GET | `/sales/:id` | Detalhes da venda | ADMIN, MANAGER |
| POST | `/sales/:id/confirm-delivery` | Confirma saída física | ADMIN, MANAGER |
| POST | `/sales/:id/confirm-payment` | Registra pagamento + baixa AR | ADMIN, MANAGER |
| GET | `/sales/:id/documents/romaneio` | Gera romaneio em PDF | ADMIN, MANAGER |
| GET | `/sales/:id/documents/delivery-receipt` | Gera comprovante de entrega PDF | ADMIN, MANAGER |

---

## Finance

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/finance/cashflow` | Fluxo de caixa (previsto + realizado, com filtros) | ADMIN, MANAGER |
| GET | `/finance/balance` | Saldo realizado atual | ADMIN, MANAGER |
| GET | `/finance/accounts-payable` | Lista AP com filtros | ADMIN, MANAGER |
| POST | `/finance/accounts-payable` | Lança conta a pagar | ADMIN, MANAGER |
| POST | `/finance/accounts-payable/:id/pay` | Registra pagamento | ADMIN, MANAGER |
| GET | `/finance/accounts-receivable` | Lista AR com filtros | ADMIN, MANAGER |
| POST | `/finance/accounts-receivable` | Lança AR manual | ADMIN, MANAGER |
| POST | `/finance/accounts-receivable/:id/receive` | Registra recebimento | ADMIN, MANAGER |
| GET | `/finance/cost-centers` | Lista centros de custo | ADMIN, MANAGER |
| POST | `/finance/cost-centers` | Cria centro de custo | ADMIN |
| GET | `/finance/ledger` | Extrato do razão geral | ADMIN, MANAGER |

---

## Profit Sharing (Rateio)

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/profit-sharing/rules` | Lista regras de rateio | ADMIN, MANAGER |
| POST | `/profit-sharing/rules` | Cria nova regra | ADMIN, MANAGER |
| PUT | `/profit-sharing/rules/:id/activate` | Ativa regra (desativa atual) | ADMIN, MANAGER |
| GET | `/profit-sharing/periods` | Lista períodos | ADMIN, MANAGER, MEMBER |
| POST | `/profit-sharing/periods` | Cria período aberto | ADMIN, MANAGER |
| GET | `/profit-sharing/periods/:id/preview` | Pré-visualiza cálculo sem fechar | ADMIN, MANAGER |
| POST | `/profit-sharing/periods/:id/close` | Fecha período + snapshot | ADMIN, MANAGER |
| GET | `/profit-sharing/periods/:id/results` | Resultados por cooperado | ADMIN, MANAGER |
| GET | `/profit-sharing/periods/:id/results/:memberId` | Resultado individual | ADMIN, MANAGER, MEMBER (próprio) |
| GET | `/profit-sharing/periods/:id/documents/:memberId` | Comprovante PDF | ADMIN, MANAGER |

---

## Members

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/members` | Lista cooperados | ADMIN, MANAGER |
| POST | `/members` | Cadastra cooperado | ADMIN, MANAGER |
| GET | `/members/:id` | Detalhes do cooperado | ADMIN, MANAGER, MEMBER (próprio) |
| GET | `/members/:id/epi-deliveries` | Histórico de EPIs | ADMIN, MANAGER, MEMBER (próprio) |
| POST | `/members/:id/epi-deliveries` | Registra entrega de EPI | ADMIN, MANAGER |
| GET | `/members/:id/epi-deliveries/:deliveryId/document` | Gera termo de EPI PDF | ADMIN, MANAGER |
| GET | `/members/:id/attendance` | Histórico de presença | ADMIN, MANAGER, MEMBER (próprio) |
| POST | `/attendance` | Registra presença em lote | ADMIN, MANAGER |

---

## Reports

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/reports/result` | Resultado do período (receita, custos, líquido) | ADMIN, MANAGER |
| GET | `/reports/stock-position` | Posição do estoque por material | ADMIN, MANAGER |
| GET | `/reports/sorting-efficiency` | Eficiência por material (% aproveitado, rejeito, perda) | ADMIN, MANAGER |
| GET | `/reports/route-profitability` | Rentabilidade por rota | ADMIN, MANAGER |
| GET | `/reports/material-revenue` | Receita por material e período | ADMIN, MANAGER |
| GET | `/reports/buyer-summary` | Resumo por comprador | ADMIN, MANAGER |
| GET | `/reports/vehicle-costs` | Custos por veículo e período | ADMIN, MANAGER |
| GET | `/reports/result/pdf` | Relatório de resultado em PDF | ADMIN, MANAGER |
| GET | `/reports/stock-position/pdf` | Relatório de estoque em PDF | ADMIN, MANAGER |

---

## Dashboard

| Method | Path | Description | Profile |
|--------|------|-------------|---------|
| GET | `/dashboard` | Indicadores por perfil (conteúdo varia por perfil) | ALL (internos) |

---

## Portal do Comprador

Todas as rotas abaixo exigem perfil `BUYER`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/portal/dashboard` | Dashboard do comprador |
| GET | `/portal/sales` | Histórico de compras do comprador |
| GET | `/portal/sales/:id` | Detalhes de uma compra |
| POST | `/portal/sales/:id/confirm-receipt` | Confirma recebimento da entrega |
| GET | `/portal/sales/:id/romaneio` | Download do romaneio PDF |
| GET | `/portal/sales/:id/delivery-receipt` | Download do comprovante de entrega PDF |

---

## Error Format

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Mensagem descritiva em português",
  "code": "STOCK_INSUFFICIENT | SORTING_UNBALANCED | PERIOD_ALREADY_CLOSED | ..."
}
```

**Standard error codes**:

_Fase 1 — Fundação (auth e autorização):_
- `ACCOUNT_DISABLED` — usuário existe mas está desativado (`isActive = false`); retornado por `POST /auth/login` e `POST /auth/refresh` com HTTP 401
- `INVALID_CREDENTIALS` — email ou senha incorretos; retornado por `POST /auth/login` com HTTP 401 (mesmo código para ambos os casos — não revelar qual campo falhou)
- `UNAUTHORIZED_PROFILE` — perfil sem permissão para a operação solicitada; retornado por qualquer endpoint protegido com HTTP 403

_Fases 2–9 (módulos operacionais):_
- `STOCK_INSUFFICIENT` — saldo disponível menor que solicitado
- `SORTING_UNBALANCED` — soma de saídas ≠ quantidade reservada
- `PERIOD_ALREADY_CLOSED` — tentativa de alterar período de rateio fechado
- `RULE_PERCENTAGES_INVALID` — critérios de rateio não somam 100%
- `MATERIAL_HAS_DEPENDENCIES` — exclusão bloqueada por movimentações existentes
- `DUPLICATE_SORTING_LOCK` — material já reservado em sessão aberta
