---

description: "Fase 1 — Fundação: Cooperativa, Usuários e Perfis de Acesso"
scope: "First Implementation Scope (plan.md § First Implementation Scope)"
---

# Tasks: EcoCoop MVP — Fase 1 — Fundação

**Input**: Design documents from `specs/001-ecocoop-mvp/`

**Scope**: Somente a Fase 1 — Fundação conforme definido em `plan.md § First Implementation Scope`.
Fases 2–9 do MVP completo estão documentadas no plan.md mas NÃO estão cobertas aqui.

**User Story coberta**: US1 — Cooperativa, Usuários e Perfis de Acesso (P1 — spec.md)

**Prerequisites**: plan.md ✅ | spec.md ✅ | data-model.md ✅ | contracts/rest-api.md ✅ | research.md ✅

**Tests**: Incluídos — obrigatórios por especificação (spec.md US1 + plan.md "Required Tests")

---

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[US1]**: User Story 1 — Fundação (única story nesta implementação)
- Caminhos relativos à raiz do repositório

---

## Phase 1: Setup (Monorepo & Infrastructure)

**Purpose**: Scaffolding do monorepo, apps e ambiente Docker. Nenhuma task de US1 pode começar antes desta fase.

- [ ] T001 Initialize npm workspaces monorepo root with Turborepo: create `package.json` (workspaces: ["apps/*","packages/*"]), `turbo.json` (pipeline: build, test, lint), `.npmrc`, `.gitignore`, `tsconfig.base.json`
- [ ] T002 Scaffold NestJS 10 backend app with TypeScript in `apps/backend/`: `nest new apps/backend`, add `@nestjs/config`, `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/jwt`, `bcrypt`, `class-validator`, `class-transformer`, `@types/*`
- [ ] T003 [P] Scaffold Vite + React 18 + TypeScript frontend app in `apps/frontend/`: `npm create vite@latest apps/frontend -- --template react-ts`, add `react-router-dom@6`, `@tanstack/react-query`, `zustand`, `axios`, `react-hook-form`, `zod`, `tailwindcss`
- [ ] T004 [P] Initialize shared types package in `packages/shared/`: create `package.json` (name: @ecocoop/shared), `tsconfig.json`, `src/index.ts` entrypoint — package will hold ProfileType enum and auth DTOs shared between backend and frontend
- [ ] T005 Create Docker Compose dev environment for PostgreSQL 16 in `infra/docker/docker-compose.dev.yml`: services postgres (image: postgres:16, volume, healthcheck), backend (build: apps/backend, depends_on postgres), frontend (build: apps/frontend, dev server); create `infra/docker/.env.example`
- [ ] T006 [P] Configure ESLint + Prettier uniformly across all workspaces: root `.eslintrc.js` (extends NestJS + React + TypeScript rules), `.prettierrc`, add lint/format scripts to root `package.json` and each workspace

**Checkpoint**: `npm install` na raiz instala todas as dependências. `docker compose -f infra/docker/docker-compose.dev.yml up -d` sobe PostgreSQL sem erros.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de banco, ORM e bootstrap das aplicações. CRÍTICO: nenhuma tarefa de US1 pode começar antes desta fase.

**⚠️ CRITICAL**: Nenhuma implementação de módulo pode começar antes desta fase estar completa.

- [ ] T007 Configure Prisma 5 in `apps/backend/`: `npx prisma init`, set `provider = "postgresql"`, configure `DATABASE_URL` via `apps/backend/.env`, add `prisma` and `@prisma/client` as deps, add `prisma:migrate`, `prisma:generate` and `prisma:seed` scripts to `apps/backend/package.json`
- [ ] T008 Define Prisma schema v1 with Phase 1 entities in `apps/backend/prisma/schema.prisma`: models `Cooperative`, `CooperativeSettings`, `User`, `Profile`, `ProfilePermission`, `AuditLog` with all fields, enums (`ProfileType: ADMIN MANAGER SORTER DRIVER MEMBER BUYER`, `AuditAction: CREATE UPDATE DELETE STATE_CHANGE`), relations, and unique constraints exactly as specified in `data-model.md`
- [ ] T009 Run first Prisma migration and generate Prisma client: `npx prisma migrate dev --name init` producing `apps/backend/prisma/migrations/`, verify generated client compiles with `npx prisma generate`
- [ ] T010 Bootstrap NestJS AppModule in `apps/backend/src/app.module.ts`: import `ConfigModule.forRoot({ isGlobal: true })`, create `apps/backend/src/common/prisma.service.ts` (extends PrismaClient, implements OnModuleInit/OnModuleDestroy), create `apps/backend/src/common/filters/global-exception.filter.ts` (formats errors to contracts/rest-api.md error format), register filter globally
- [ ] T011 Define shared ProfileType enum and Phase 1 auth DTOs in `packages/shared/src/types/index.ts`: export `ProfileType`, `LoginResponseDto` (`{ accessToken, profile: ProfileType, redirectTo: string }`), `CurrentUserDto` — reference these in both backend and frontend
- [ ] T012 [P] Configure frontend API layer in `apps/frontend/src/`: create `services/api.client.ts` (Axios instance with baseURL `/api/v1`, request interceptor attaches Bearer token, response interceptor refreshes token on 401); create `main.tsx` wrapping App with `QueryClientProvider`; configure `vite.config.ts` proxy (`/api` → `http://localhost:3000`)

**Checkpoint**: `npm run --workspace=apps/backend start:dev` inicia NestJS sem erros. `npm run --workspace=apps/frontend dev` inicia Vite. Prisma conecta ao banco.

---

## Phase 3: User Story 1 — Fundação: Cooperativa, Usuários e Perfis de Acesso (Priority: P1) 🎯 MVP

**Goal**: Sistema funcionando com autenticação JWT, RBAC configurado, CRUD básico de usuários e perfis, endpoint de setup da cooperativa, AuditInterceptor, seed de perfis padrão e frontend com login, layout autenticado e redirecionamento por perfil. Usuário com perfil SORTER não pode acessar rotas de financeiro mesmo com token válido.

**Independent Test**: Criar cooperativa via POST /api/v1/cooperative/setup → criar usuário triador via POST /api/v1/users → login como triador → GET /api/v1/finance/cashflow retorna 403. Login como comprador retorna `redirectTo: "/portal"`.

---

### Tests for User Story 1 (obrigatórios por spec.md e plan.md)

> **Write these tests FIRST — they MUST fail before implementation begins**

- [ ] T013 [P] [US1] Write auth integration tests in `apps/backend/test/integration/auth.spec.ts`: (1) login com credenciais corretas retorna accessToken + profile + redirectTo, (2) login com senha errada retorna 401, (3) acesso com token expirado retorna 401, (4) POST /auth/refresh com cookie válido retorna novo accessToken, (5) POST /auth/refresh com cookie inválido retorna 401, (6) login com usuário inativo retorna 401 com code ACCOUNT_DISABLED, (7) GET /auth/me retorna dados do usuário autenticado
- [ ] T014 [P] [US1] Write RBAC permissions integration tests in `apps/backend/test/integration/permissions.spec.ts`: matrix of all 6 ProfileTypes (ADMIN, MANAGER, SORTER, DRIVER, MEMBER, BUYER) vs critical Phase 1 endpoints — verify ADMIN can access all /users/* and /profiles/*, SORTER receives 403 on /users POST, BUYER receives 403 on all non-/portal/* routes, unauthenticated request returns 401

---

### Cooperative Module

- [ ] T015 [P] [US1] Create `CooperativeModule` with `CooperativeService` in `apps/backend/src/modules/cooperative/`: service methods `setup(dto)` (singleton, errors if already created), `findOne()`, `update(dto)`, `getSettings()`, `updateSettings(dto)`; register module in AppModule
- [ ] T016 [US1] Implement `CooperativeController` in `apps/backend/src/modules/cooperative/cooperative.controller.ts`: routes GET `/cooperative` (requires ADMIN or MANAGER), PUT `/cooperative` (requires ADMIN), GET `/cooperative/settings` (requires ADMIN or MANAGER), PUT `/cooperative/settings` (requires ADMIN); add @Roles() decorators; this controller serves as the first example of the RBAC pattern

---

### Auth Module

- [ ] T017 [US1] Create `AuthModule` in `apps/backend/src/modules/auth/auth.module.ts`: import `JwtModule.register({ secret: configService.get('JWT_SECRET'), signOptions: { expiresIn: '15m' } })`, `PassportModule`, register `JwtStrategy`; add `JWT_SECRET` and `JWT_REFRESH_SECRET` to env validation
- [ ] T018 [US1] Implement `AuthService` in `apps/backend/src/modules/auth/auth.service.ts`: `login(email, password)` — fetch user by email, `bcrypt.compare(password, user.passwordHash)`, throw 401 if wrong/inactive, build JWT payload `{ sub: userId, profileType, buyerId? }`, issue accessToken (15min) + refreshToken (7 days signed with JWT_REFRESH_SECRET), return `LoginResponseDto` with `redirectTo` based on profileType (BUYER → "/portal", others → "/dashboard")
- [ ] T019 [US1] Implement `JwtStrategy` in `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`: extends `PassportStrategy(Strategy)`, extracts Bearer token from header, validates payload `{ sub, profileType }`, returns `CurrentUserDto` (id, profileType, buyerId); implement `RefreshTokenStrategy` in same directory for httpOnly cookie validation
- [ ] T020 [US1] Implement `AuthController` in `apps/backend/src/modules/auth/auth.controller.ts`: `POST /auth/login` (@Public(), calls AuthService.login, sets refreshToken as httpOnly Secure cookie with SameSite=Strict), `POST /auth/refresh` (@Public(), reads cookie, validates refresh JWT, issues new accessToken), `POST /auth/logout` (@Public(), clears cookie), `GET /auth/me` (returns CurrentUser from @CurrentUser() decorator)
- [ ] T021 [US1] Create NestJS decorators in `apps/backend/src/common/decorators/`: `@Public()` (sets metadata IS_PUBLIC_KEY=true, used by JwtAuthGuard to skip), `@CurrentUser()` (parameter decorator extracting `request.user`), `@RequirePermission(module, action)` (sets metadata for RolesGuard)
- [ ] T022 [US1] Implement `JwtAuthGuard` in `apps/backend/src/common/guards/jwt-auth.guard.ts`: extends `AuthGuard('jwt')`, overrides `canActivate` to skip if IS_PUBLIC_KEY metadata is true; this is registered as global APP_GUARD in app.module.ts
- [ ] T023 [US1] Implement `RolesGuard` in `apps/backend/src/common/guards/roles.guard.ts`: implements `CanActivate`, reads `@RequirePermission(module, action)` metadata from handler, fetches `ProfilePermission` rows for `request.user.profileId`, returns true if matching record exists — throw `ForbiddenException` with code `UNAUTHORIZED_PROFILE` if not; skip if no permission metadata on handler
- [ ] T024 [US1] Register global guards and complete AppModule wiring in `apps/backend/src/app.module.ts`: register `{ provide: APP_GUARD, useClass: JwtAuthGuard }` and `{ provide: APP_GUARD, useClass: RolesGuard }` as providers; register `GlobalExceptionFilter` as APP_FILTER; import `AuthModule`, `CooperativeModule`, `UserModule`, `ProfileModule`

---

### Profile Module

- [ ] T025 [P] [US1] Create `ProfileModule` with `ProfileService` in `apps/backend/src/modules/profiles/`: methods `findAll()`, `create(dto)` (isCustom=true), `updatePermissions(profileId, permissions[])` — replaces all ProfilePermission rows for that profile atomically; register in AppModule
- [ ] T026 [US1] Implement `ProfileController` in `apps/backend/src/modules/profiles/profile.controller.ts`: `GET /profiles` (@RequirePermission('USERS','READ')), `POST /profiles` (@RequirePermission('USERS','MANAGE')), `PATCH /profiles/:id/permissions` (@RequirePermission('USERS','MANAGE')); validate that system default profiles (isCustom=false) cannot be deleted

---

### Users Module

- [ ] T027 [P] [US1] Create `UserModule` with `UserService` in `apps/backend/src/modules/users/`: methods `create(dto)` (hash password with `bcrypt.hash(password, 10)`, create User), `findAll()`, `findOne(id)`, `update(id, dto)`, `setActive(id, isActive)` (soft activate/deactivate — never delete); register in AppModule
- [ ] T028 [US1] Implement `UserController` in `apps/backend/src/modules/users/user.controller.ts`: `GET /users` (@RequirePermission('USERS','READ')), `POST /users` (@RequirePermission('USERS','CREATE'), validate email unique, profileId exists), `GET /users/:id` (@RequirePermission('USERS','READ')), `PATCH /users/:id` (@RequirePermission('USERS','UPDATE')), `PATCH /users/:id/activate` (@RequirePermission('USERS','MANAGE')); never expose `passwordHash` in responses

---

### Audit Interceptor

- [ ] T029 [US1] Implement `AuditInterceptor` in `apps/backend/src/common/interceptors/audit.interceptor.ts`: `NestInterceptor`, runs on POST/PUT/PATCH/DELETE, records `AuditLog { entityType (from controller metadata), action (POST→CREATE, PATCH→UPDATE, DELETE→DELETE), userId from JWT, ipAddress from request, newState from response body, createdAt }`; add `@SetMetadata('auditEntity', entityName)` decorator to facilitate entity name tagging in controllers
- [ ] T030 [US1] Register `AuditInterceptor` as a scoped interceptor on CooperativeController, UserController, and ProfileController in `apps/backend/src/app.module.ts` (or directly on each controller class with `@UseInterceptors(AuditInterceptor)`) — global registration via `APP_INTERCEPTOR` is acceptable if performance is not a concern for Phase 1

---

### Seed

- [ ] T031 [US1] Create Prisma seed script in `apps/backend/prisma/seeds/seed.ts`: create Cooperative placeholder (name: "EcoCoop", cnpj: required), create 6 default Profiles with standard permissions matrix (ADMIN: all modules MANAGE; MANAGER: STOCK+SORTING+SALES+USERS READ/CREATE/UPDATE; SORTER: STOCK+SORTING READ/CREATE; DRIVER: ROUTES READ/UPDATE; MEMBER: self-read only; BUYER: PORTAL READ), create default admin user (`admin@ecocoop.local` / `admin123`) and gestor user (`gestor@ecocoop.local` / `gestor123`); configure `prisma.seed` in `apps/backend/package.json`

---

### Frontend

- [ ] T032 [P] [US1] Implement Zustand auth store in `apps/frontend/src/store/auth.store.ts`: state `{ user: CurrentUserDto | null, accessToken: string | null }`, actions `login(credentials)` (calls POST /auth/login, stores accessToken in memory, NOT localStorage), `logout()` (calls POST /auth/logout, clears state), `refresh()` (calls POST /auth/refresh, updates accessToken); configure Axios interceptor to call `refresh()` on 401 before retrying once
- [ ] T033 [P] [US1] Create `LoginPage` in `apps/frontend/src/pages/auth/LoginPage.tsx`: form with email + password fields using `react-hook-form` + `zod` schema validation, calls `authStore.login()`, on success redirects to `loginResponse.redirectTo` using `useNavigate`; show error message on 401; styled with Tailwind (mobile-responsive centered card)
- [ ] T034 [US1] Create `AdminLayout` in `apps/frontend/src/layouts/AdminLayout.tsx`: sidebar with navigation links (Dashboard, Cooperativa, Usuários, Perfis), top bar with logged user name and logout button, `<Outlet/>` for child routes; sidebar links render only if user profile has access (read from auth store)
- [ ] T035 [US1] Implement `ProtectedRoute` component in `apps/frontend/src/router/ProtectedRoute.tsx`: reads auth store, if no user redirects to `/login`; if profileType === 'BUYER' redirects to `/portal`; otherwise renders `<Outlet/>`; also export `BuyerRoute` that requires profileType === 'BUYER'
- [ ] T036 [US1] Configure React Router v6 in `apps/frontend/src/router/index.tsx`: public route `/login → LoginPage`; protected routes wrapped in `ProtectedRoute → AdminLayout`: `/dashboard`, `/cooperative`, `/users`, `/profiles`; placeholder `/portal` route (renders stub BuyerPortalPage for now); wrap entire router in `<Suspense>` with lazy loading
- [ ] T037 [US1] Implement `DashboardPage` in `apps/frontend/src/pages/dashboard/DashboardPage.tsx`: authenticated landing screen showing cooperative name (fetched from GET /cooperative), logged user name and profile, and placeholder cards for future modules (grayed out with "Em breve" label for stock, sorting, sales, finance, reports); page title and basic Tailwind layout

**Checkpoint**: Fluxo 1 do quickstart.md executável: login como admin → criar triador → login como triador → GET /finance/cashflow retorna 403. Login como comprador retorna redirectTo: "/portal".

---

## Phase 4: Polish & Validation

**Purpose**: Validação end-to-end do Fluxo 1 do quickstart, tipagem estrita e configurações de produção do ambiente dev.

- [ ] T038 Execute quickstart.md Fluxo 1 validation end-to-end: run `docker compose -f infra/docker/docker-compose.dev.yml up -d`, `npm run --workspace=apps/backend prisma:migrate`, `npm run --workspace=apps/backend prisma:seed`, verify admin login, create SORTER user, verify SORTER gets 403 on protected routes, verify BUYER login returns `redirectTo: "/portal"`
- [ ] T039 [P] Configure environment validation with class-validator in `apps/backend/src/config/env.validation.ts`: validate `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`; fail fast on startup if variables missing; create `apps/backend/.env.example` with all required keys
- [ ] T040 [P] Add Docker Compose health checks and startup order: postgres healthcheck `pg_isready`, backend `depends_on: { postgres: { condition: service_healthy } }`; verify `npm run test --workspace=apps/backend` runs auth and permissions integration tests from T013/T014

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1, T001–T006)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2, T007–T012)**: Depende da conclusão do Setup — BLOQUEIA todas as tasks de US1
- **User Story 1 (Phase 3, T013–T037)**: Depende da conclusão da Foundational
  - Tests (T013, T014): escrever primeiro, devem **falhar** antes da implementação
  - Implementação: seguir sub-grupos internos abaixo
- **Polish (Phase 4, T038–T040)**: Depende da conclusão de US1

### Dentro de US1 — Ordem de Implementação

1. Tests T013, T014 (escrita; devem falhar — sem implementação ainda)
2. Auth infrastructure: T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024
3. Em paralelo após T024: Cooperative (T015→T016), Profile (T025→T026), Users (T027→T028)
4. AuditInterceptor: T029 → T030 (após CooperativeController, UserController, ProfileController existirem)
5. Seed: T031 (após todas as entidades do schema existirem no banco)
6. Frontend: T032 → T033 (paralelo) → T034 → T035 → T036 → T037

### Parallel Opportunities

- **Setup**: T003, T004, T006 podem rodar em paralelo com T002
- **Foundational**: T012 pode rodar em paralelo com T007–T011
- **US1 Tests**: T013 e T014 podem ser escritos em paralelo
- **Cooperative + Profile + Users modules**: T015 e T025 e T027 podem começar em paralelo após T024
- **Frontend T032 e T033** podem ser implementados em paralelo

---

## Parallel Example: User Story 1 — Auth Module

```bash
# Escrever testes em paralelo (devem falhar inicialmente):
Task T013: "Auth integration tests in apps/backend/test/integration/auth.spec.ts"
Task T014: "Permissions integration tests in apps/backend/test/integration/permissions.spec.ts"

# Após T021–T024 (guards e decorators prontos), iniciar em paralelo:
Task T015: "CooperativeModule + CooperativeService in apps/backend/src/modules/cooperative/"
Task T025: "ProfileModule + ProfileService in apps/backend/src/modules/profiles/"
Task T027: "UserModule + UserService in apps/backend/src/modules/users/"

# Frontend (após backend pronto):
Task T032: "Zustand auth store in apps/frontend/src/store/auth.store.ts"
Task T033: "LoginPage in apps/frontend/src/pages/auth/LoginPage.tsx"
```

---

## Implementation Strategy

### MVP (Fase 1 completa em ~3–4 semanas)

1. **Semana 1**: Setup (T001–T006) + Foundational (T007–T012)
2. **Semana 2**: Auth module completo (T013–T024) — testes escritos primeiro
3. **Semana 3**: Cooperative + Users + Profiles + Audit + Seed (T015–T031)
4. **Semana 4**: Frontend completo (T032–T037) + Polish (T038–T040)

### Definition of Done para a Fase 1

- [ ] `npm run test --workspace=apps/backend` passa com 0 falhas nos testes de auth e permissões
- [ ] Fluxo 1 do quickstart.md executa completamente sem erros manuais
- [ ] Login como admin funciona no navegador; login como BUYER redireciona para /portal
- [ ] Usuário SORTER recebe 403 ao tentar acessar qualquer rota de outros módulos
- [ ] `npm run build --workspaces` compila sem erros de TypeScript

---

## Notes

- [P] = arquivos diferentes, sem dependência de task incompleta — pode rodar em paralelo
- [US1] = pertence à User Story 1 (única story nesta implementação)
- Testes T013 e T014 DEVEM ser escritos antes da implementação e confirmados como falhando
- Refresh token usa httpOnly cookie (SameSite=Strict, Secure) — nunca armazenar no localStorage
- Sem Redis na Fase 1: revogação de refresh token por logout deleta o cookie (sem blacklist)
- O `packages/shared` deve ser referenciado nos workspaces com `"@ecocoop/shared": "*"` no package.json de cada app
- Frontend guarda accessToken apenas em memória (Zustand store) — sem localStorage para mitigar XSS
- `/portal` é um placeholder na Fase 1 — rota existe e redireciona BUYER, mas conteúdo é mínimo
- Commit após cada checkpoint de fase para rastreabilidade
