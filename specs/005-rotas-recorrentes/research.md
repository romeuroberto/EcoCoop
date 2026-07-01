# Research: Rotas Recorrentes

## 1. NestJS Scheduling — Geração Automática de Ocorrências

**Decision**: Usar `@nestjs/schedule` com `@Cron` decorator para execução diária da geração de ocorrências.

**Rationale**: O pacote é o padrão do ecossistema NestJS, integra-se ao container de DI e permite testar o serviço de geração independentemente do agendador. A alternativa (cron externo via SO) exigiria infraestrutura adicional e tira o controle do código da aplicação.

**Alternatives considered**:
- Cron externo (systemd, heroku scheduler): rejeitado — fora do controle do app, dificulta testes e deploy.
- Bull/BullMQ queue: rejeitado — overkill para uma tarefa única diária; introduz dependência Redis que não existe na stack atual.

**Implementation note**: Instalar `@nestjs/schedule` no backend. Job roda diariamente (e.g. `@Cron('0 2 * * *')` às 02h00). Para testes, o serviço `OccurrenceGeneratorService` deve ser testável sem o agendador.

---

## 2. Unicidade de Ocorrências — Constraint PostgreSQL com NULL

**Decision**: Criar índice único parcial no PostgreSQL: `UNIQUE (templateId, plannedDate) WHERE templateId IS NOT NULL`. Em Prisma, usar `@@index` com anotação raw migration se necessário, ou `@@unique([templateId, plannedDate])` aproveitando o comportamento de NULL no PostgreSQL (NULLs são distintos em unique constraints).

**Rationale**: `@@unique([templateId, plannedDate])` no Prisma gera um UNIQUE constraint no PostgreSQL. Como PostgreSQL trata NULL como distinto de qualquer outro NULL, múltiplas rotas avulsas (templateId=null) na mesma data são permitidas. Rotas com o mesmo templateId+plannedDate são bloqueadas. Esse comportamento nativo elimina a necessidade de lógica de deduplicação na aplicação.

**Alternatives considered**:
- Índice parcial via `@@index` + validação na camada de serviço: rejeitado — duplicação de lógica, não atomicamente seguro.
- Campo dedicado `occurrenceKey: String @unique` (concatenação de templateId+date): rejeitado — desnecessário quando o comportamento natural de NULL já resolve.

---

## 3. Exception Tracking — Granularidade de Preservação

**Decision**: Campo booleano simples `isException: Boolean @default(false)` na `CollectionRoute`. Qualquer edição estrutural (driverId, vehicleId, RoutePoints) em uma ocorrência com templateId define `isException = true`.

**Rationale**: FR-008 especifica preservação por ocorrência inteira (não por campo). Um booleano é suficiente e mantém o schema simples. Alternativas de rastrear campos específicos adicionariam complexidade sem benefício funcional nesta fase.

**Alternatives considered**:
- `modifiedFields: String[]` (array de nomes dos campos alterados): rejeitado — complexidade desnecessária; spec não exige granularidade por campo.
- Tabela `RouteOccurrenceException` separada: rejeitado — overhead para uma flag simples.

**Reset behavior**: `isException` é limpo apenas quando o gestor escolhe explicitamente sobrescrever a ocorrência durante uma propagação (`overwriteExceptions: true`).

---

## 4. Propagação em Massa — Padrões Prisma

**Decision**: Usar `prisma.$transaction` com `updateMany` para campos simples (driverId, vehicleId) e loop transacional para RoutePoints (delete + recreate per occurrence).

**Rationale**: `updateMany` é atômico e eficiente para campos escalares. RoutePoints exigem delete/recreate porque são entidades filho com sequence ordering — `updateMany` não suporta substituição de relações filho. O loop transacional garante consistência: ou todas as ocorrências são atualizadas ou nenhuma.

**Implementation**: A propagação é realizada em uma única `$transaction` com `prisma.$transaction(async (tx) => { ... })`. Para cooperativas com horizonte de 12 semanas, o máximo de ocorrências afetadas por template seria ~24 (2 dias/semana × 12 semanas) — volume manejável em uma transação.

**Alternatives considered**:
- Múltiplas transações separadas por ocorrência: rejeitado — não atômico; falha parcial deixa estado inconsistente.
- Raw SQL UPSERT para RoutePoints: rejeitado — viola abstração Prisma sem ganho real no volume esperado.

---

## 5. Configuração do Horizonte por Cooperativa

**Decision**: Adicionar `occurrenceHorizonWeeks: Int @default(4)` a `CooperativeSettings`. O gerador de ocorrências consulta esse campo antes de cada execução.

**Rationale**: `CooperativeSettings` já é o modelo singleton de configuração por cooperativa. Adicionar o campo ali é consistente com o padrão existente (`attendanceEnabled`, etc.). FR-017 especifica mínimo 1 semana, máximo 12 semanas — validado via class-validator no DTO do admin.

**Alternatives considered**:
- Variável de ambiente global: rejeitado — spec exige configurável por cooperativa.
- Tabela separada `GenerationConfig`: rejeitado — `CooperativeSettings` já existe para esse propósito.
