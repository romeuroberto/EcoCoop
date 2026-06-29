# Analyze Report: EcoCoop MVP — Fase 1 — Fundação

**Gerado em**: 2026-06-29  
**Correções aplicadas em**: 2026-06-29 (issues C1, C2, H1, H2, H3, H4 + bônus M1 resolvidos em tasks.md)  
**Artefatos analisados**: constitution.md · spec.md · plan.md · tasks.md · data-model.md · contracts/rest-api.md  
**User Story coberta**: US1 — Cooperativa, Usuários e Perfis de Acesso (P1)  
**Total de tasks**: 41 (T001–T041)

---

## 1. Resultado Geral

> **✅ APROVADO COM RESSALVAS MENORES**

A estrutura, o escopo e a cobertura da Fase 1 estão corretos. Todas as 41 tasks mapeiam para requisitos legítimos da Fase 1. Nenhum item proibido foi incluído. Os **2 issues CRITICAL, 4 issues HIGH e 1 issue MEDIUM (M1)** foram resolvidos em `tasks.md` em 2026-06-29 — veja seção "Correções Aplicadas" abaixo. Os issues MEDIUM restantes (M2–M5) e LOW (L1–L4) não bloqueiam a implementação.

---

## 2. As Tasks Cobrem Apenas a Fase 1 — Fundação?

**Sim. Confirmado.**

| Fase do MVP | Presente nas tasks? |
|-------------|---------------------|
| Fase 1 — Fundação | ✅ Coberta integralmente |
| Fases 2–9 (MVP completo) | ✅ Ausentes nas tasks |

As tasks estão explicitamente delimitadas pelo cabeçalho `scope: "First Implementation Scope (plan.md § First Implementation Scope)"` e pelo header da US1. Nenhuma das 40 tasks referencia implementação de módulos das fases 2–9.

---

## 3. Inconsistências Encontradas

### CRITICAL

| ID | Local | Inconsistência | Correção Necessária |
|----|-------|----------------|---------------------|
| C1 | `tasks.md T008` × `data-model.md` | T008 instrui implementar User "exactly as specified in data-model.md", mas `User.memberId FK Member` e `User.buyerId FK Buyer` referenciam entidades ausentes do schema Phase 1. O Prisma rejeita FK para modelo inexistente — a migration **não roda**. | Anotar em T008 que `memberId`/`buyerId` devem ser omitidos do schema v1, OU incluir `Member` e `Buyer` como stub models mínimos (campos: `id`, `name`). Definir explicitamente na task qual das duas abordagens adotar. |
| C2 | `tasks.md T031` × `tasks.md T023/T026/T028` | T031 (seed) cria permissões para módulos `STOCK`, `SORTING`, `ROUTES`, `SALES` — todos fora da Fase 1, sem controllers. Falta permissão para o módulo `COOPERATIVE`, que T016 usa com `@RequirePermission`. Se ADMIN não tiver permissão `COOPERATIVE/READ` no banco, `GET /cooperative` retorna 403 para o admin — quebrando o cenário de teste da US1. | Reescrever T031 para criar permissões apenas dos módulos da Fase 1: `USERS`, `PROFILES`, `COOPERATIVE`. Remover STOCK, SORTING, ROUTES, SALES do seed da Phase 1. |

### HIGH

| ID | Local | Inconsistência | Correção Necessária |
|----|-------|----------------|---------------------|
| H1 | `tasks.md T008` × `data-model.md CooperativeSettings` | `CooperativeSettings.vehicleCostCenterId FK CostCenter` — CostCenter é entidade de Phase 5. T008 diz "exactly as specified in data-model.md", tornando esta FK impossível. | Anotar em T008 que `vehicleCostCenterId` deve ser **omitido do schema v1** e adicionado em migration futura. |
| H2 | `tasks.md T039` (Phase 4) × `tasks.md T010` (Phase 2) | Validação de `JWT_SECRET` e `JWT_REFRESH_SECRET` está em T039 (Polish), mas esses valores são consumidos em T017 (Phase 3). Se ausentes, NestJS sobe sem erro e assina JWTs com `undefined` como secret — **bug silencioso crítico**. | Mover instrução de env validation para T010 (Phase 2, junto ao ConfigModule). T039 mantém apenas o `.env.example`. |
| H3 | `tasks.md T029` × `constitution.md Princípio III` | T029 registra apenas `newState from response body`. O Princípio III da Constituição exige **"estado anterior/posterior"** como MUST. O `previousState` está ausente na especificação do interceptor. | Adicionar a T029: "para PATCH/DELETE, buscar estado da entidade antes da mutação e armazenar em `previousState`; para POST, `previousState = null`". |
| H4 | `tasks.md Phase 2` (todos) | Nenhuma task configura **CORS** no NestJS. Frontend roda em `:5173`, backend em `:3000`. Sem `app.enableCors()`, todas as chamadas de browser falham com erro CORS — inviabilizando qualquer teste manual do frontend. | Adicionar ao T010 (ou `main.ts`): `app.enableCors({ origin: process.env.FRONTEND_URL, credentials: true })`. Incluir `FRONTEND_URL` na validação de env. |

---

## 4. Lacunas da Fase 1

### MEDIUM

| ID | Local | Lacuna | Recomendação |
|----|-------|--------|--------------|
| M1 | `tasks.md T010` | `ValidationPipe` global não mencionado. Sem `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`, os DTOs com `class-validator` não validam entradas — payloads malformados são aceitos silenciosamente. | Adicionar `ValidationPipe` global ao `main.ts` em T010. |
| M2 | `tasks.md T015–T016` × `contracts/rest-api.md` | T015 cria `setup(dto)` (singleton com guard) mas T016 expõe apenas `GET/PUT /cooperative`. Contracts não têm `POST /cooperative/setup`. Spec US1-S1 diz que "administrador preenche dados e confirma → cooperativa é criada". Fluxo de primeira execução via UI não está definido. | Decidir explicitamente: (a) seed cria registro vazio e `PUT /cooperative` cobre a configuração inicial, ou (b) adicionar `POST /cooperative/setup` com guard "erro se já configurada". Documentar a decisão em T016. |
| M3 | `tasks.md T030` | T030 oferece duas abordagens mutuamente excludentes ("global `APP_INTERCEPTOR`" OU "`@UseInterceptors` no controller") sem decidir. `APP_INTERCEPTOR` global auditará endpoints públicos (/auth/login), o que é indesejável. | Decidir na task: usar `@UseInterceptors(AuditInterceptor)` nos controllers específicos (Cooperative, User, Profile). |
| M4 | `tasks.md T013` × `contracts/rest-api.md` | T013 espera `401 with code ACCOUNT_DISABLED` para usuário inativo, mas `ACCOUNT_DISABLED` não está nos Standard Error Codes do contracts/rest-api.md. | Adicionar `ACCOUNT_DISABLED` em contracts/rest-api.md, ou definir o código exato em T018 e referenciar em T013. |
| M5 | `tasks.md T032` × `tasks.md T036` | T032 armazena `accessToken` apenas em memória. Ao recarregar a página, Zustand reseta e o usuário é deslogado, mesmo com httpOnly cookie válido. Nenhuma task descreve chamar `refresh()` no bootstrap. | Adicionar em T036 ou T032: ao montar o App, chamar silenciosamente `POST /auth/refresh` para restaurar sessão a partir do cookie. |

### LOW

| ID | Local | Lacuna | Recomendação |
|----|-------|--------|--------------|
| L1 | `tasks.md T031` | T031 cria senhas padrão mas não menciona que o seed deve usar `bcrypt.hash()`. Se o seed salvar plain text, `bcrypt.compare()` sempre retornará false. | Adicionar em T031: "hashes calculados com `bcrypt.hash(password, 10)` na execução do seed, nunca plain text". |
| L2 | `tasks.md T001` | `turbo.json` criado em T001 mas sem dependência explícita de `packages/shared`. Em CI, `apps/backend` e `apps/frontend` podem buildar antes de `@ecocoop/shared` estar compilado. | T001 deve incluir `"dependsOn": ["^build"]` no pipeline do turbo.json. |
| L3 | `plan.md` × `data-model.md` × `tasks.md T008` | plan.md Phase 1 entities lista "Permission" (singular). data-model.md e tasks.md usam "ProfilePermission" consistentemente. Drift terminológico apenas em plan.md. | Corrigir "Permission" → "ProfilePermission" em plan.md § Phase 1 entities list. |
| L4 | `constitution.md XXII` × `tasks.md` | Nenhuma task cria `docs/adr/` com ADRs formalizados. Constitution exige ADRs para decisões arquiteturais. research.md documenta 10 decisões sem arquivo ADR correspondente. | Aceitável para Phase 1 — plan.md defere para Phase 9. Adicionar nota em T001 ou README. |

---

## 5. Confirmação de Escopo Excluído

Verificação de que **nenhuma task implementa** os domínios excluídos da Fase 1:

| Domínio excluído | Status nas tasks |
|------------------|-----------------|
| Materiais (categorias, subcategorias, unidades de medida) | ✅ **Ausente** |
| Compradores — CRUD completo | ✅ **Ausente** |
| Portal do comprador completo | ✅ **Ausente** — apenas rota placeholder `/portal` em T036 |
| Veículos | ✅ **Ausente** |
| Rotas de coleta | ✅ **Ausente** |
| Mapas (Leaflet, Nominatim) | ✅ **Ausente** |
| Estoque (StockEvent, StockBalance) | ✅ **Ausente** |
| Triagem (SortingSession) | ✅ **Ausente** |
| Vendas (Sale, SaleItem) | ✅ **Ausente** |
| Financeiro completo (Ledger, CP, CR, CostCenter) | ✅ **Ausente** — aparece apenas como rota-alvo no teste 403 de T014 |
| Rateio (ProfitSharing) | ✅ **Ausente** |
| EPIs e Presença | ✅ **Ausente** |
| Documentos PDF (Puppeteer) | ✅ **Ausente** |
| Dashboard avançado | ✅ **Ausente** — T037 é tela de boas-vindas com cards placeholder |
| Relatórios | ✅ **Ausente** |

**Veredicto de escopo: LIMPO. Nenhum item proibido foi incluído.**

---

## 6. Verificação de Aderência à Constituição

| Princípio | Aplicável à Fase 1 | Status | Detalhe |
|-----------|-------------------|--------|---------|
| I. Spec-Driven Development | ✅ | ✅ OK | tasks.md gerado de spec.md + plan.md aprovados |
| II. Fluxo Operacional como Domínio | Parcial | ✅ OK | Fase 1 é fundação; flow completo coberto nas fases 2–6 |
| III. Rastreabilidade e Auditoria | ✅ | ⚠️ **PARCIAL** | AuditLog + AuditInterceptor estão no escopo (T029), mas `previousState` está ausente (H3) |
| IV. Imutabilidade do Estoque | ❌ N/A | — | Estoque não implementado na Fase 1 |
| V. Separação de Estados do Material | ❌ N/A | — | Material não implementado na Fase 1 |
| VI. Financeiro Auditável | ❌ N/A | — | Financeiro não implementado na Fase 1 |
| VII. Rateio Transparente | ❌ N/A | — | Rateio não implementado na Fase 1 |
| VIII. Instância Dedicada | ✅ | ✅ OK | Docker Compose por cooperativa (T005); sem multi-tenancy |
| IX. Portal Restrito do Comprador | ✅ | ✅ OK | Redirect para /portal implementado (T035–T036); portal completo deferido para Phase 4 |
| X. Cooperados com Login Individual | ✅ | ✅ OK | User + Profile + autenticação individual (T017–T028) |
| XI. Permissões no Backend (NÃO NEGOCIÁVEL) | ✅ | ✅ OK | JwtAuthGuard + RolesGuard globais (T022–T024); validação no backend |
| XII. Pesagem Manual + Extensibilidade | ❌ N/A | — | Pesagem não implementada na Fase 1 |
| XIII. Mapas para Rotas | ❌ N/A | — | Rotas não implementadas na Fase 1 |
| XIV. Presença Configurável | ❌ N/A | — | Presença não implementada na Fase 1 |
| XV. Emissão de Documentos | ❌ N/A | — | PDFs não implementados na Fase 1 |
| XVI. Estoque com Unidades Configuráveis | ❌ N/A | — | Estoque não implementado na Fase 1 |
| XVII. Materiais por Categorias | ❌ N/A | — | Materiais não implementados na Fase 1 |
| XVIII. Fluxo de Caixa Completo | ❌ N/A | — | Financeiro não implementado na Fase 1 |
| XIX. Relatórios Estratégicos | ❌ N/A | — | Relatórios não implementados na Fase 1 |
| XX. Interface Responsiva | ✅ | ✅ OK | Tailwind CSS mobile-first em T033, T034, T037 |
| XXI. Stack Tecnológica Definida | ✅ | ✅ OK | NestJS + React + PostgreSQL (T002, T003, T005) |
| XXII. ADRs Obrigatórios | ✅ | ⚠️ Deferido | research.md tem 10 decisões; ADRs formais em Phase 9 (L4) |
| XXIII. Testes Obrigatórios (NÃO NEGOCIÁVEL) | ✅ | ✅ OK | T013 (auth) + T014 (permissions) — obrigatórios e incluídos |
| XXIV. Consistência, Segurança, Backup | ✅ | ⚠️ **PARCIAL** | bcrypt ✅; CORS ausente (H4); env validation em fase errada (H2) |

**Violações ativas de Constituição**: 1 violação parcial (Princípio III — `previousState` ausente em T029).

---

## 7. Decisão Final

> ### ✅ PODE AVANÇAR PARA `/speckit-implement`
>
> Todos os issues bloqueantes foram corrigidos em `tasks.md`. Os issues MEDIUM e LOW restantes não impedem a implementação.

### Correções Aplicadas (2026-06-29)

| Issue | Task(s) Alterada(s) | Correção |
|-------|---------------------|---------|
| C1 — FK User→Member/Buyer inexistentes | T008 | Exclusões explícitas de `memberId`, `buyerId`, `vehicleCostCenterId` do schema v1 |
| C2 — Seed com módulos fora da Fase 1 | T031 | Reescrito com apenas COOPERATIVE, USERS, PROFILES, PERMISSIONS, AUDIT, DASHBOARD |
| H1 — FK CooperativeSettings→CostCenter | T008 | `vehicleCostCenterId` explicitamente omitido do schema v1 |
| H2 — Env validation em Phase 4 | T010, T039, T017, T018, T027 | Validação movida para T010 (Phase 2 bootstrap); T039 reduzido a .env.example; variável renomeada para `JWT_ACCESS_SECRET`; `BCRYPT_ROUNDS` parametrizado |
| H3 — AuditInterceptor sem previousState | T029 | `previousState` (pré-mutação), `entityId`, `userAgent` adicionados à especificação |
| H4 — CORS ausente | T041 (novo) | Task explícita criada: CORS + ValidationPipe + porta por env no `main.ts` |
| M1 (bônus) — ValidationPipe ausente | T041 (novo) | Incluído na mesma task de bootstrap |

### Issues Residuais (não bloqueantes)

| Issue | Tipo | Recomendação |
|-------|------|--------------|
| M2 — Fluxo de setup da cooperativa ambíguo | MEDIUM | Decidir em T016: seed + PUT /cooperative cobre first-run, ou adicionar POST /cooperative/setup |
| M3 — AuditInterceptor: abordagem de registro ambígua | MEDIUM | Decidir em T030: usar @UseInterceptors por controller (recomendado) |
| M4 — Código ACCOUNT_DISABLED não em contracts | MEDIUM | Adicionar em contracts/rest-api.md; T018 já define o código |
| M5 — Page refresh perde accessToken | MEDIUM | Adicionar silent refresh no App.tsx bootstrap (T032 ou T036) |
| L1–L4 | LOW | Ver seção anterior; podem ser resolvidos durante a implementação |

---

## Métricas do Relatório

| Métrica | Valor |
|---------|-------|
| Requisitos Phase 1 analisados (FRs + US1 scenarios) | 12 |
| Total de tasks (após correções) | 41 |
| Cobertura de requisitos | 100% |
| Issues CRITICAL resolvidos | 2/2 ✅ |
| Issues HIGH resolvidos | 4/4 ✅ |
| Issues MEDIUM resolvidos | 1/5 (M1 resolvido via T041) |
| Issues MEDIUM residuais | 4 (não bloqueantes) |
| Issues LOW residuais | 4 (não bloqueantes) |
| Violações ativas da Constituição | 0 ✅ |
| Itens proibidos detectados nas tasks | 0 ✅ |
| Resultado | ✅ Aprovado — pode avançar para /speckit-implement |
