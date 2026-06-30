# Research: Fase 2 — Cadastros Base Operacionais

**Feature**: `002-operational-base-data` | **Date**: 2026-06-29

> Todas as decisões de stack e infraestrutura foram herdadas da Fase 1 (ver `specs/001-ecocoop-mvp/research.md`). Este documento registra apenas as decisões de modelagem e padrões específicos desta fase.

---

## Decision 1: Relação Member ↔ User — FK opcional em Member

**Decision**: A entidade `Member` (cooperado) possui campo `userId` opcional (FK para `User`). A criação de um cooperado não implica criação de usuário de acesso. A vinculação é feita separadamente, com permissão explícita.

**Rationale**: Nem todo cooperado precisa de acesso digital ao sistema. Exigir usuário tornaria o cadastro mais burocrático e criaria usuários desnecessários. A relação inversa (User → Member) já existe na Fase 1 com o campo `memberId` em `User`. Esta fase mantém a direção da FK em `Member.userId` para que a entidade cooperado possa existir independentemente de um usuário.

**Alternatives considered**:
- FK obrigatória (descartado: impede cooperados sem acesso digital)
- Relação em User.memberId sem campo em Member (descartado: duplica a relação já existente de forma diferente, gerando confusão)

---

## Decision 2: Relação Buyer ↔ User — mantém padrão User.buyerId

**Decision**: A Fase 1 já define `User.buyerId` (FK opcional para Buyer). A Fase 2 cria a entidade `Buyer` respeitando essa convenção. O cadastro de comprador pode opcionalmente associar um `userId` existente com perfil BUYER.

**Rationale**: Consistência com o modelo da Fase 1. `User.buyerId` já estava previsto no schema original para o caso de uso do portal do comprador. Inverter a FK para `Buyer.userId` geraria inconsistência com Member.

**Alternatives considered**: FK em Buyer.userId (descartado: inconsistente com o modelo User já existente que tem memberId/buyerId)

---

## Decision 3: MemberRole — entidade própria, não enum

**Decision**: As funções de cooperado são armazenadas como entidade `MemberRole` (id, name, isDefault, isActive) referenciada por FK em `Member.roleId`. O sistema inicia com 5 funções padrão marcadas com `isDefault: true`.

**Rationale**: Enum no banco seria rígido — a cooperativa não poderia criar novas funções sem deploy. Texto livre geraria inconsistências em agrupamentos (triador vs Triador vs TRIADOR). Uma entidade própria permite que o ADMIN gerencie funções sem intervenção técnica, garante unicidade por nome e preserva histórico (FK preservada em Members quando função é inativada).

**Alternatives considered**:
- Enum Prisma fixo (descartado: requer deploy para qualquer mudança)
- Texto livre em Member.role (descartado: inconsistências quebram relatórios futuros por função)

---

## Decision 4: UnitOfMeasure — auto-referência opcional para conversão

**Decision**: `UnitOfMeasure` tem campos opcionais `baseUnitId` (auto-referência FK) e `conversionFactor` (decimal). Ambos são preenchidos juntos ou ambos nulos. Não há obrigatoriedade de conversão para kg. O sistema não impede ciclos de mais de 2 níveis nesta fase.

**Rationale**: A Fase 1 previa `kgConversionFactor` como campo simples. A Fase 2 generaliza para conversão para qualquer unidade base, o que cobre casos como: Tonelada → kg (fator 1000), Fardo → kg (fator variável), Saco (sem conversão definida). Não forçar kg como única unidade base atende a materiais volumétricos (m³) e unitários (bag, peça).

**Alternatives considered**:
- Campo `kgConversionFactor` simples (descartado: não cobre m³, litro, peça)
- Tabela separada de conversões (descartado: complexidade desnecessária; auto-referência cobre o caso de Fase 2)

---

## Decision 5: Vehicle.capacityUnit — FK para UnitOfMeasure

**Decision**: A capacidade do veículo usa `capacityValue` (decimal opcional) + `capacityUnitId` (FK para UnitOfMeasure, obrigatório se capacityValue informado) + `capacityNotes` (texto livre opcional). Nenhum cálculo de carga é realizado nesta fase.

**Rationale**: Usar FK estruturada desde o início evita inconsistências (kg vs KG vs quilo) e prepara o modelo para cálculos de capacidade em rotas futuras sem migration de dados. Custo zero em Fase 2 (campo apenas lido na UI), benefício alto em Fase 3+ (cálculo de ocupação de rota).

**Alternatives considered**: Texto livre com unidade (descartado: inconsistências e migration futura custosa)

---

## Decision 6: Bloqueio de inativação de Categoria com subcategorias ativas

**Decision**: A inativação de `MaterialCategory` é bloqueada pela aplicação (não por constraint de banco) quando existem `MaterialSubcategory` ativas vinculadas. O serviço verifica e retorna erro com lista de subcategorias ativas antes de persistir.

**Rationale**: Constraint de banco (trigger ou check) seria opaca para o usuário. Validação no serviço permite retornar mensagem clara com a lista de subcategorias que impedem a ação. Cascata automática foi explicitamente rejeitada (Q3 da clarificação).

**Alternatives considered**:
- Cascata automática (descartado: perda acidental de subcategorias)
- Constraint de banco (descartado: mensagem de erro genérica ao usuário)

---

## Decision 7: CPF/CNPJ — validação de dígito verificador no backend

**Decision**: CPF e CNPJ são validados por formato e algoritmo de dígito verificador via `class-validator` com validador customizado (`@IsCPF()` / `@IsCNPJ()`). Sem consulta à Receita Federal.

**Rationale**: Validação de formato + dígito verificador elimina a maioria dos erros de digitação sem dependência de serviço externo. Consulta online à RF adiciona latência, custo e ponto de falha desnecessário para um MVP de cooperativa.

**Alternatives considered**: Apenas validação de formato (descartado: aceita documentos inválidos), Consulta online à RF (descartado: latência e dependência externa)

---

## Decision 8: Padrões de módulo NestJS — repetição consciente da Fase 1

**Decision**: Cada novo domínio segue exatamente o padrão da Fase 1: `module.ts` + `controller.ts` com `@AuditEntity` + `@UseInterceptors(AuditInterceptor)` + `service.ts` com Prisma + `dto/` com class-validator. Sem abstrações de repositório ou base classes.

**Rationale**: Consistência > DRY para código de infraestrutura em NestJS. Abstrações de `BaseCrudService<T>` parecem atraentes mas tornam debugging mais difícil e raramente salvam código real. Cada módulo sendo independente facilita leitura, teste e modificação futura.

**Alternatives considered**: BaseCrudController/BaseCrudService genérico (descartado: complexidade de generics TypeScript + Prisma sem ganho proporcional)

---

## Decision 9: RBAC — novos módulos no seed

**Decision**: Os novos módulos RBAC são adicionados ao seed como strings de módulo: `MEMBER_ROLES`, `MEMBERS`, `MATERIALS`, `UNITS`, `BUYERS`, `VEHICLES`, `EPI_TYPES`, `COST_CENTERS`. Perfil ADMIN recebe `MANAGE` em todos. Perfil MANAGER recebe `MANAGE` em `MEMBERS`, `BUYERS`, `VEHICLES` e `READ` nos demais.

**Rationale**: Segue exatamente o padrão da Fase 1. Os nomes de módulo são strings constantes verificadas pelo `PermissionsGuard` existente. Nenhuma alteração no guard é necessária.

**Alternatives considered**: Enum Prisma para módulos (descartado: exigiria migration cada vez que um novo módulo é adicionado)
