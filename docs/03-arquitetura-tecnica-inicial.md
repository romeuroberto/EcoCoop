# 03 — Arquitetura Técnica Inicial

## Stack

- Backend: NestJS + TypeScript
- Frontend: React + TypeScript + Vite
- Banco: PostgreSQL
- Containerização: Docker Compose
- Deploy: VM dedicada por cooperativa
- API: REST inicialmente
- Autenticação: JWT
- Autorização: RBAC com permissões granulares
- Mapas: provedor a definir no plano técnico
- Relatórios: PDF e planilhas

## Estrutura sugerida do repositório

```text
apps/
  api/
  web/
packages/
  shared/
  config/
docs/
  adrs/
  specs/
infra/
  docker/
  nginx/
```

## Backend — módulos iniciais

- AuthModule
- UsersModule
- RolesPermissionsModule
- CooperativeModule
- CooperatorsModule
- BuyersModule
- MaterialsModule
- UnitsModule
- RoutesModule
- CollectionModule
- StockModule
- SortingModule
- SalesModule
- FinanceModule
- ProfitSharingModule
- EpiModule
- VehiclesModule
- DocumentsModule
- ReportsModule
- AuditModule

## Frontend — áreas iniciais

- Login
- Dashboard
- Cooperados
- Compradores
- Materiais
- Rotas e mapas
- Coletas
- Estoque bruto
- Triagem
- Estoque pronto
- Vendas
- Financeiro
- Rateio
- EPIs
- Veículos
- Relatórios
- Configurações
- Portal do comprador

## Decisões técnicas pendentes

- Prisma ou TypeORM.
- Biblioteca de UI.
- Provedor de mapas.
- Estratégia de geração de PDF.
- Estratégia de exportação para planilha.
- Estratégia de auditoria.
- Estratégia de anexos/documentos.
- Estratégia de backup.
