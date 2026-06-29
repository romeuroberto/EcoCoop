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

- [X] T001 Initialize npm workspaces monorepo root with Turborepo: create `package.json` (workspaces: ["apps/*","packages/*"]), `turbo.json` (pipeline: build, test, lint), `.npmrc`, `.gitignore`, `tsconfig.base.json`
- [X] T002 Scaffold NestJS 10 backend app with TypeScript in `apps/backend/`: `nest new apps/backend`, add `@nestjs/config`, `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/jwt`, `bcrypt`, `class-validator`, `class-transformer`, `@types/*`
- [X] T003 [P] Scaffold Vite + React 18 + TypeScript frontend app in `apps/frontend/`: `npm create vite@latest apps/frontend -- --template react-ts`, add `react-router-dom@6`, `@tanstack/react-query`, `zustand`, `axios`, `react-hook-form`, `zod`, `tailwindcss`
- [X] T004 [P] Initialize shared types package in `packages/shared/`: create `package.json` (name: @ecocoop/shared), `tsconfig.json`, `src/index.ts` entrypoint — package will hold ProfileType enum and auth DTOs shared between backend and frontend
- [X] T005 Create Docker Compose dev environment for PostgreSQL 16 in `infra/docker/docker-compose.dev.yml`: services postgres (image: postgres:16, volume, healthcheck), backend (build: apps/backend, depends_on postgres), frontend (build: apps/frontend, dev server); create `infra/docker/.env.example`
- [X] T006 [P] Configure ESLint + Prettier uniformly across all workspaces: root `.eslintrc.js` (extends NestJS + React + TypeScript rules), `.prettierrc`, add lint/format scripts to root `package.json` and each workspace

**Checkpoint**: `npm install` na raiz instala todas as dependências. `docker compose -f infra/docker/docker-compose.dev.yml up -d` sobe PostgreSQL sem erros.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de banco, ORM e bootstrap das aplicações. CRÍTICO: nenhuma tarefa de US1 pode começar antes desta fase.

**⚠️ CRITICAL**: Nenhuma implementação de módulo pode começar antes desta fase estar completa.

- [X] T007 Configure Prisma 5 in `apps/backend/`: `npx prisma init`, set `provider = "postgresql"`, configure `DATABASE_URL` via `apps/backend/.env`, add `prisma` and `@prisma/client` as deps, add `prisma:migrate`, `prisma:generate` and `prisma:seed` scripts to `apps/backend/package.json`
- [X] T008 Define Prisma schema v1 with Phase 1 entities in `apps/backend/prisma/schema.prisma`: models `Cooperative`, `CooperativeSettings`, `User`, `Profile`, `ProfilePermission`, `AuditLog`; enums `ProfileType: ADMIN MANAGER SORTER DRIVER MEMBER BUYER`, `AuditAction: CREATE UPDATE DELETE STATE_CHANGE`; **Phase 1 schema exclusions (MUST apply explicitly)**: (a) `User` — omit `memberId` and `buyerId` fields; FK relations to `Member` and `Buyer` are Phase 2+ entities; profile-based redirect uses `Profile.type` only; (b) `CooperativeSettings` — omit `vehicleCostCenterId` field; FK to `CostCenter` is Phase 5; add via migration when financial module is implemented; (c) do NOT define `Member`, `Buyer`, or `CostCenter` models in this migration — their absence is intentional
- [X] T009 Run first Prisma migration and generate Prisma client: `npx prisma migrate dev --name init` producing `apps/backend/prisma/migrations/`, verify generated client compiles with `npx prisma generate`
- [X] T010 Bootstrap NestJS AppModule in `apps/backend/src/app.module.ts`: (1) create `apps/backend/src/config/env.validation.ts` with class-validator schema validating `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BCRYPT_ROUNDS`, `API_PORT`, `CORS_ORIGIN` — application MUST fail on startup with a clear error message if any variable is missing or invalid; (2) import `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })` to enable fail-fast validation before any module initializes; (3) create `apps/backend/src/common/prisma.service.ts` (extends PrismaClient, implements OnModuleInit/OnModuleDestroy); (4) create `apps/backend/src/common/filters/global-exception.filter.ts` (formats errors per contracts/rest-api.md with `statusCode`, `error`, `message`, `code` fields), register filter globally
- [X] T011 Define shared ProfileType enum and Phase 1 auth DTOs in `packages/shared/src/types/index.ts`: export `ProfileType`, `LoginResponseDto` (`{ accessToken, profile: ProfileType, redirectTo: string }`), `CurrentUserDto` — **Phase 1 shape**: `{ id: string, email: string, profileId: string, profileType: ProfileType, permissions: Array<{ module: string, action: string }> }` — note: `buyerId` is intentionally absent in Phase 1; it will be added in Phase 4 (buyer portal); reference these types in both backend and frontend
- [X] T012 [P] Configure frontend API layer in `apps/frontend/src/`: create `services/api.client.ts` (Axios instance with baseURL `/api/v1`, request interceptor attaches Bearer token, response interceptor refreshes token on 401); create `main.tsx` wrapping App with `QueryClientProvider`; configure `vite.config.ts` proxy (`/api` → `http://localhost:3000`)

- [X] T041 Configure `apps/backend/src/main.ts` bootstrap: (1) enable CORS via `app.enableCors({ origin: configService.get('CORS_ORIGIN'), credentials: true })` — allows the frontend Vite dev server (`:5173`) to call the API without browser CORS errors; (2) register `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }))` — enforces DTO validation on all incoming requests using class-validator decorators; (3) listen on `configService.get<number>('API_PORT') ?? 3000`; verify by confirming frontend can call `GET /api/v1` without CORS error in browser DevTools

**Checkpoint**: `npm run --workspace=apps/backend start:dev` inicia NestJS sem erros. `npm run --workspace=apps/frontend dev` inicia Vite. Prisma conecta ao banco. Frontend consegue chamar `GET /api/v1` sem erro CORS no browser.

---

## Phase 3: User Story 1 — Fundação: Cooperativa, Usuários e Perfis de Acesso (Priority: P1) 🎯 MVP

**Goal**: Sistema funcionando com autenticação JWT, RBAC configurado, CRUD básico de usuários e perfis, endpoint de setup da cooperativa, AuditInterceptor, seed de perfis padrão e frontend com login, layout autenticado e redirecionamento por perfil. Usuário com perfil SORTER não pode acessar rotas de financeiro mesmo com token válido.

**Independent Test**: Criar cooperativa via POST /api/v1/cooperative/setup → criar usuário triador via POST /api/v1/users → login como triador → GET /api/v1/finance/cashflow retorna 403. Login como comprador retorna `redirectTo: "/portal"`.

---

### Tests for User Story 1 (obrigatórios por spec.md e plan.md)

> **Write these tests FIRST — they MUST fail before implementation begins**

- [X] T013 [P] [US1] Write auth integration tests in `apps/backend/test/integration/auth.spec.ts`: (1) login com credenciais corretas retorna accessToken + profile + redirectTo, (2) login com senha errada retorna 401, (3) acesso com token expirado retorna 401, (4) POST /auth/refresh com cookie válido retorna novo accessToken, (5) POST /auth/refresh com cookie inválido retorna 401, (6) login com usuário inativo retorna 401 com code ACCOUNT_DISABLED, (7) GET /auth/me retorna dados do usuário autenticado
- [X] T014 [P] [US1] Write RBAC permissions integration tests in `apps/backend/test/integration/permissions.spec.ts`: matrix of all 6 ProfileTypes (ADMIN, MANAGER, SORTER, DRIVER, MEMBER, BUYER) vs critical Phase 1 endpoints — verify ADMIN can access all /users/* and /profiles/*, SORTER receives 403 on /users POST, BUYER receives 403 on all non-/portal/* routes, unauthenticated request returns 401

---

### Cooperative Module

- [X] T015 [P] [US1] Create `CooperativeModule` with `CooperativeService` in `apps/backend/src/modules/cooperative/`: service methods `findOne()`, `update(dto)` (upsert on the singleton record created by seed — covers both first-run configuration when admin fills initial institutional data and subsequent updates; no separate `setup()` method exists), `getSettings()`, `updateSettings(dto)`; register module in AppModule
- [X] T016 [US1] Implement `CooperativeController` in `apps/backend/src/modules/cooperative/cooperative.controller.ts`: routes GET `/cooperative` (@RequirePermission('COOPERATIVE','READ')), PUT `/cooperative` (@RequirePermission('COOPERATIVE','MANAGE') — **upsert/first-run**: seed creates an unconfigured Cooperative record; admin fills institutional data via this endpoint on first login and uses it for subsequent updates; there is no public `POST /cooperative/setup` endpoint in Phase 1), GET `/cooperative/settings` (@RequirePermission('COOPERATIVE','READ')), PUT `/cooperative/settings` (@RequirePermission('COOPERATIVE','MANAGE')); add `@AuditEntity('cooperative')` and `@UseInterceptors(AuditInterceptor)` decorators (see T029, T030); this controller is the first example of the RBAC + Audit pattern

---

### Auth Module

- [X] T017 [US1] Create `AuthModule` in `apps/backend/src/modules/auth/auth.module.ts`: import `JwtModule.registerAsync({ useFactory: (config: ConfigService) => ({ secret: config.get('JWT_ACCESS_SECRET'), signOptions: { expiresIn: '15m' } }), inject: [ConfigService] })`, `PassportModule`, register `JwtStrategy`; env variables `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are validated at startup by T010 — do not re-validate here
- [X] T018 [US1] Implement `AuthService` in `apps/backend/src/modules/auth/auth.service.ts`: `login(email, password)` — fetch user by email, `bcrypt.compare(password, user.passwordHash)`, throw 401 with code `ACCOUNT_DISABLED` if user is inactive, throw 401 with code `INVALID_CREDENTIALS` if password wrong, build JWT payload `{ sub: userId, profileType }` (no buyerId — Phase 1 User has no FK to Buyer), issue accessToken (15min signed with `JWT_ACCESS_SECRET`) + refreshToken (7 days signed with `JWT_REFRESH_SECRET`), return `LoginResponseDto` with `redirectTo` based on profileType (BUYER → "/portal", others → "/dashboard")
- [X] T019 [US1] Implement `JwtStrategy` in `apps/backend/src/modules/auth/strategies/jwt.strategy.ts`: extends `PassportStrategy(Strategy)`, extracts Bearer token from header, validates payload `{ sub, profileType }`, returns `CurrentUserDto` — **Phase 1 shape**: `{ id: string, email: string, profileId: string, profileType: ProfileType, permissions: Array<{ module: string, action: string }> }` (note: `buyerId` is intentionally absent in Phase 1; it will be added in Phase 4 when the buyer portal module is implemented); implement `RefreshTokenStrategy` in same directory for httpOnly cookie validation
- [X] T020 [US1] Implement `AuthController` in `apps/backend/src/modules/auth/auth.controller.ts`: `POST /auth/login` (@Public(), calls AuthService.login, sets refreshToken as httpOnly Secure cookie with SameSite=Strict), `POST /auth/refresh` (@Public(), reads cookie, validates refresh JWT, issues new accessToken), `POST /auth/logout` (@Public(), clears cookie), `GET /auth/me` (returns CurrentUser from @CurrentUser() decorator)
- [X] T021 [US1] Create NestJS decorators in `apps/backend/src/common/decorators/`: `@Public()` (sets metadata IS_PUBLIC_KEY=true, used by JwtAuthGuard to skip), `@CurrentUser()` (parameter decorator extracting `request.user`), `@RequirePermission(module, action)` (sets metadata for RolesGuard)
- [X] T022 [US1] Implement `JwtAuthGuard` in `apps/backend/src/common/guards/jwt-auth.guard.ts`: extends `AuthGuard('jwt')`, overrides `canActivate` to skip if IS_PUBLIC_KEY metadata is true; this is registered as global APP_GUARD in app.module.ts
- [X] T023 [US1] Implement `RolesGuard` in `apps/backend/src/common/guards/roles.guard.ts`: implements `CanActivate`, reads `@RequirePermission(module, action)` metadata from handler, fetches `ProfilePermission` rows for `request.user.profileId`, returns true if matching record exists — throw `ForbiddenException` with code `UNAUTHORIZED_PROFILE` if not; skip if no permission metadata on handler
- [X] T024 [US1] Register global guards and complete AppModule wiring in `apps/backend/src/app.module.ts`: register `{ provide: APP_GUARD, useClass: JwtAuthGuard }` and `{ provide: APP_GUARD, useClass: RolesGuard }` as providers; register `GlobalExceptionFilter` as APP_FILTER; import `AuthModule`, `CooperativeModule`, `UserModule`, `ProfileModule`

---

### Profile Module

- [X] T025 [P] [US1] Create `ProfileModule` with `ProfileService` in `apps/backend/src/modules/profiles/`: methods `findAll()`, `create(dto)` (isCustom=true), `updatePermissions(profileId, permissions[])` — replaces all ProfilePermission rows for that profile atomically; register in AppModule
- [X] T026 [US1] Implement `ProfileController` in `apps/backend/src/modules/profiles/profile.controller.ts`: `GET /profiles` (@RequirePermission('USERS','READ')), `POST /profiles` (@RequirePermission('USERS','MANAGE')), `PATCH /profiles/:id/permissions` (@RequirePermission('USERS','MANAGE')); validate that system default profiles (isCustom=false) cannot be deleted

---

### Users Module

- [X] T027 [P] [US1] Create `UserModule` with `UserService` in `apps/backend/src/modules/users/`: methods `create(dto)` (hash password with `bcrypt.hash(password, configService.get<number>('BCRYPT_ROUNDS') ?? 10)`, create User), `findAll()`, `findOne(id)`, `update(id, dto)`, `setActive(id, isActive)` (soft activate/deactivate — never delete); register in AppModule
- [X] T028 [US1] Implement `UserController` in `apps/backend/src/modules/users/user.controller.ts`: `GET /users` (@RequirePermission('USERS','READ')), `POST /users` (@RequirePermission('USERS','CREATE'), validate email unique, profileId exists), `GET /users/:id` (@RequirePermission('USERS','READ')), `PATCH /users/:id` (@RequirePermission('USERS','UPDATE')), `PATCH /users/:id/activate` (@RequirePermission('USERS','MANAGE')); never expose `passwordHash` in responses

---

### Audit Interceptor

- [X] T029 [US1] Implement `AuditInterceptor` in `apps/backend/src/common/interceptors/audit.interceptor.ts`: `NestInterceptor` that runs on POST/PUT/PATCH/DELETE; for each mutating request record `AuditLog` with: `entityType` (from `@AuditEntity()` decorator on controller), `entityId` (from route param `:id` or response body `.id`), `action` (POST→CREATE, PUT/PATCH→UPDATE, DELETE→DELETE), `previousState` (for UPDATE and DELETE: fetch entity from DB **before** the mutation executes and store as JSON — MUST be `null` for CREATE), `newState` (response body serialized as JSON after mutation — MUST be `null` for DELETE), `userId` (from `request.user.id` via JWT), `ipAddress` (from `request.ip`), `userAgent` (from `request.headers['user-agent']`), `createdAt` (immutable, set at insert time); add `@AuditEntity(entityName: string)` decorator in `apps/backend/src/common/decorators/audit-entity.decorator.ts` to tag entity name on each audited controller
- [X] T030 [US1] Register `AuditInterceptor` using `@UseInterceptors(AuditInterceptor)` directly on `CooperativeController`, `UserController`, and `ProfileController` class declarations — do **NOT** use global `APP_INTERCEPTOR`, which would also audit public endpoints (`/auth/login`, `/auth/refresh`) where `request.user` is `undefined`, generating `AuditLog` rows with `userId = null`

---

### Seed

- [X] T031 [US1] Create Prisma seed script in `apps/backend/prisma/seeds/seed.ts`: (1) create Cooperative placeholder (name: "EcoCoop", cnpj: "00.000.000/0001-00"); (2) create 6 default Profiles with **Phase 1 permissions matrix** — permitted modules are `COOPERATIVE`, `USERS`, `PROFILES`, `PERMISSIONS`, `AUDIT`, `DASHBOARD` only — do NOT create permissions for STOCK, SORTING, ROUTES, SALES, FINANCE, RATEIO, EPI, ATTENDANCE, REPORTS, or MATERIALS: `ADMIN` → all 6 modules with action `MANAGE`; `MANAGER` → `COOPERATIVE:READ`, `USERS:READ`, `DASHBOARD:READ`; `SORTER` → `DASHBOARD:READ`; `DRIVER` → `DASHBOARD:READ`; `MEMBER` → `DASHBOARD:READ`; `BUYER` → `DASHBOARD:READ` (portal redirect is driven by `profileType`, not by permission entries); (3) create default users with **bcrypt-hashed passwords** (use `bcrypt.hash(password, 10)` — never store plain text): admin `admin@ecocoop.local` / `admin123`, gestor `gestor@ecocoop.local` / `gestor123`; (4) configure `prisma.seed` in `apps/backend/package.json`

---

### Frontend

- [X] T032 [P] [US1] Implement Zustand auth store in `apps/frontend/src/store/auth.store.ts`: state `{ user: CurrentUserDto | null, accessToken: string | null, isInitializing: boolean }`, actions: `login(credentials)` (calls POST /auth/login, stores accessToken in memory, NOT localStorage), `logout()` (calls POST /auth/logout, clears state), `refresh()` (calls POST /auth/refresh, updates accessToken — returns `true` on success, `false` on 401), `initializeSession()` (called once at app bootstrap: sets `isInitializing = true`, calls `refresh()`, if 200 → calls GET /auth/me and stores user in state; if 401 → clears user; always sets `isInitializing = false` when done); configure Axios interceptor to call `refresh()` on 401 before retrying once; in `apps/frontend/src/App.tsx` call `authStore.initializeSession()` on mount via `useEffect([])` and while `isInitializing === true` render a loading spinner instead of the router — prevents flash-to-/login on page reload
- [X] T033 [P] [US1] Create `LoginPage` in `apps/frontend/src/pages/auth/LoginPage.tsx`: form with email + password fields using `react-hook-form` + `zod` schema validation, calls `authStore.login()`, on success redirects to `loginResponse.redirectTo` using `useNavigate`; show error message on 401; styled with Tailwind (mobile-responsive centered card)
- [X] T034 [US1] Create `AdminLayout` in `apps/frontend/src/layouts/AdminLayout.tsx`: sidebar with navigation links (Dashboard, Cooperativa, Usuários, Perfis), top bar with logged user name and logout button, `<Outlet/>` for child routes; sidebar links render only if user profile has access (read from auth store)
- [X] T035 [US1] Implement `ProtectedRoute` component in `apps/frontend/src/router/ProtectedRoute.tsx`: reads auth store, if no user redirects to `/login`; if profileType === 'BUYER' redirects to `/portal`; otherwise renders `<Outlet/>`; also export `BuyerRoute` that requires profileType === 'BUYER'
- [X] T036 [US1] Configure React Router v6 in `apps/frontend/src/router/index.tsx`: public route `/login → LoginPage`; protected routes wrapped in `ProtectedRoute → AdminLayout`: `/dashboard`, `/cooperative`, `/users`, `/profiles`; placeholder `/portal` route (renders stub BuyerPortalPage for now); wrap entire router in `<Suspense>` with lazy loading
- [X] T037 [US1] Implement `DashboardPage` in `apps/frontend/src/pages/dashboard/DashboardPage.tsx`: authenticated landing screen showing cooperative name (fetched from GET /cooperative), logged user name and profile, and placeholder cards for future modules (grayed out with "Em breve" label for stock, sorting, sales, finance, reports); page title and basic Tailwind layout

**Checkpoint**: Fluxo 1 do quickstart.md executável: login como admin → criar triador → login como triador → GET /finance/cashflow retorna 403. Login como comprador retorna redirectTo: "/portal".

---

## Phase 4: Polish & Validation

**Purpose**: Validação end-to-end do Fluxo 1 do quickstart, tipagem estrita e configurações de produção do ambiente dev.

- [X] T038 Execute quickstart.md Fluxo 1 validation end-to-end: run `docker compose -f infra/docker/docker-compose.dev.yml up -d`, `npm run --workspace=apps/backend prisma:migrate`, `npm run --workspace=apps/backend prisma:seed`, verify admin login, create SORTER user, verify SORTER gets 403 on protected routes, verify BUYER login returns `redirectTo: "/portal"`
- [X] T039 [P] Create environment example files for developer onboarding: `apps/backend/.env.example` and `infra/docker/.env.example`, both documenting all required variables with descriptions: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `BCRYPT_ROUNDS` (default: 10), `API_PORT` (default: 3000), `CORS_ORIGIN` (default: http://localhost:5173); environment validation logic is implemented in T010 (Phase 2) — this task only creates reference files, not code
- [X] T040 [P] Add Docker Compose health checks and startup order: postgres healthcheck `pg_isready`, backend `depends_on: { postgres: { condition: service_healthy } }`; verify `npm run test --workspace=apps/backend` runs auth and permissions integration tests from T013/T014

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1, T001–T006)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2, T007–T012, T041)**: Depende da conclusão do Setup — BLOQUEIA todas as tasks de US1
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
- **Foundational**: T012 pode rodar em paralelo com T007–T011; T041 depende de T010 (precisa de `CORS_ORIGIN` do ConfigModule) mas pode ser feito em paralelo com T011 e T012
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

1. **Semana 1**: Setup (T001–T006) + Foundational (T007–T012, T041)
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
- Env vars usam `JWT_ACCESS_SECRET` (não `JWT_SECRET`) — validadas no bootstrap por T010 antes de qualquer módulo
- CORS configurado em T041 com `CORS_ORIGIN` do ambiente; ValidationPipe global também em T041
- Seed (T031) cria permissões apenas para módulos da Fase 1: COOPERATIVE, USERS, PROFILES, PERMISSIONS, AUDIT, DASHBOARD
- O `packages/shared` deve ser referenciado nos workspaces com `"@ecocoop/shared": "*"` no package.json de cada app
- Frontend guarda accessToken apenas em memória (Zustand store) — sem localStorage para mitigar XSS
- `/portal` é um placeholder na Fase 1 — rota existe e redireciona BUYER, mas conteúdo é mínimo
- Commit após cada checkpoint de fase para rastreabilidade
