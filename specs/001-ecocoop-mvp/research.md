# Research: EcoCoop MVP

**Feature**: `001-ecocoop-mvp` | **Date**: 2026-06-29

## Technology Decisions

### Decision 1: ORM — Prisma 5

**Decision**: Prisma 5 com PostgreSQL 16.

**Rationale**: Prisma oferece type-safety nativa com TypeScript, schema-first migrations, client gerado automaticamente e excelente integração com NestJS via `@nestjs/prisma`. A geração automática de tipos elimina divergências entre schema e código, crítico para um domínio complexo como estoque por eventos. Alternativa considerada: TypeORM — mais maduro e suporta Active Record, mas o sistema de types é menos robusto e migrations manuais são mais propensas a erros. MikroORM — excelente mas menos adotado, curva maior.

**Alternatives considered**: TypeORM (descartado: types menos seguros), MikroORM (descartado: ecossistema menor).

---

### Decision 2: Autenticação — Passport.js + JWT + Refresh Token

**Decision**: `@nestjs/passport` + `passport-jwt` + JWT de curta duração (15 min) + refresh token de longa duração (7 dias) armazenado em httpOnly cookie.

**Rationale**: JWT stateless é compatível com arquitetura de instância dedicada. Refresh token em httpOnly cookie elimina risco de XSS. RBAC via custom NestJS Guards comparando perfil do usuário com decorators de permissão no endpoint. Um único sistema de auth serve todos os perfis (internos + compradores) — o redirecionamento pós-login é feito no backend baseado no campo `profile` do JWT payload.

**Alternatives considered**: Session-based auth (descartado: mais complexo para escalar e desnecessário para instância única), Auth0/Keycloak (descartado: dependência externa desnecessária para MVP com instância dedicada).

---

### Decision 3: Estratégia de Estoque — Event Sourcing + Projection Table

**Decision**: Tabela `StockEvent` append-only como fonte da verdade + tabela `StockBalance` como projeção materializada, ambas atualizadas na mesma transação de banco.

**Rationale**: Event sourcing puro (computar saldo do zero a cada consulta) seria correto mas inviável para performance com histórico crescente. A projeção materializada em `StockBalance` mantém o saldo sempre atualizado dentro da mesma transação que insere o evento — garantindo consistência sem polling. O saldo pode ser recalculado auditoriamente a qualquer momento relendo os eventos. Os três saldos (total, reservado, disponível) são campos na `StockBalance`.

**Alternatives considered**: Apenas tabela de saldo sem eventos (descartado: viola Princípio IV da Constituição), CQRS com event store separado (descartado: complexidade excessiva para MVP de instância única).

---

### Decision 4: Geração de PDF — Puppeteer com templates HTML/CSS

**Decision**: `puppeteer-core` + `@sparticuz/chromium` (versão compacta do Chrome para Lambda/containers) com templates HTML usando Handlebars.

**Rationale**: Gera PDFs de alta qualidade com CSS completo (logo, tabelas, formatação profissional), sem limitações de bibliotecas puramente programáticas como PDFKit. Handlebars para templates é simples e separado do código TypeScript. A imagem Docker usa `@sparticuz/chromium` que pesa ~50MB ao invés dos ~400MB do Chromium completo.

**Alternatives considered**: PDFKit (descartado: controle de layout muito manual, difícil manter consistência visual), @react-pdf/renderer (descartado: ambiente Node.js sem React bundler complica o setup de servidor).

---

### Decision 5: Mapas — Leaflet + Nominatim com provider abstrato

**Decision**: `leaflet` + `react-leaflet` no frontend com tiles OpenStreetMap. Geocoding via Nominatim (API pública gratuita). Sugestão de ordem de pontos via algoritmo nearest-neighbor implementado no backend. Provider de mapa abstraído por interface para permitir migração futura (ex.: Mapbox, Google Maps).

**Rationale**: Leaflet é a biblioteca de mapas open-source mais madura e funciona perfeitamente em ambiente web responsivo sem API key. Nominatim (OSM Geocoding) é gratuito e sem limites para uso razoável. Nearest-neighbor é suficiente para rotas com ≤ 30 pontos (complexidade O(n²)), cobrindo 99% dos casos do MVP. Não requer serviço externo de roteamento (OSRM) no MVP.

**Alternatives considered**: Google Maps (descartado: custo por uso e API key por instância), Mapbox (descartado: custo), OSRM (deferido: útil quando rotas > 30 pontos, integração futura).

**Rate limiting consideration**: Nominatim tem política de máximo 1 req/s. Implementar cache de geocoding (endereço → coordenadas) em banco para evitar re-geocoding do mesmo endereço.

---

### Decision 6: Relatórios — Consultas SQL agregadas no PostgreSQL

**Decision**: Relatórios gerados via queries SQL agregadas com Prisma raw queries ou QueryBuilder customizado. Sem BI externo (Metabase, Redash) no MVP.

**Rationale**: Para o volume esperado (cooperativa com até 200 cooperados, poucos anos de dados), SQL agregado é suficiente e mantém a stack simples. Índices adequados (data, material, centro de custo) garantem performance. Relatórios são gerados sob demanda e podem ser exportados via PDF (Puppeteer) ou futuramente via XLSX.

**Alternatives considered**: Metabase (descartado: dependência externa, complexidade de deploy), TimescaleDB (descartado: desnecessário para volume do MVP).

---

### Decision 7: Monorepo — npm workspaces + Turborepo

**Decision**: `npm workspaces` (ou `pnpm workspaces`) + Turborepo para orchestration de builds/tests.

**Rationale**: Permite compartilhar tipos TypeScript entre backend e frontend via `packages/shared` sem duplicação. Turborepo cacheia builds incrementais (importante para CI). Sem necessidade de Nx (mais complexo) para um monorepo de 2 aplicações.

**Alternatives considered**: Nx (descartado: overhead desnecessário para 2 apps), repos separados (descartado: dificulta compartilhamento de tipos e coordenação de deploy).

---

### Decision 8: Concorrência em Reserva de Triagem — SELECT FOR UPDATE

**Decision**: Usar `SELECT ... FOR UPDATE` (via `prisma.$queryRaw`) na linha de `StockBalance` ao abrir uma sessão de triagem para prevenir race conditions.

**Rationale**: Múltiplos triadores abrindo sessões simultâneas para o mesmo material podem criar over-reservation se acessarem `available_quantity` sem lock. `SELECT FOR UPDATE` bloqueia a linha durante a transação de abertura, garantindo leitura+escrita atômica. Para volumes de usuários esperados (< 20 operadores simultâneos), não há risco de contenção significativa.

**Alternatives considered**: Optimistic locking (descartado: gera retries que confundem o usuário com mensagens de erro), Application-level mutex (descartado: não funciona entre instâncias/processos).

---

### Decision 9: Feature Flag de Presença — Configuração em `CooperativeSettings`

**Decision**: Módulo de presença habilitado/desabilitado via campo `attendanceEnabled: boolean` na tabela `CooperativeSettings`. Guards NestJS checam este campo antes de permitir acesso às rotas de presença.

**Rationale**: Simples, sem necessidade de feature flag service externo. A configuração é per-cooperativa (já garantido por instância dedicada) e persiste no banco. Desativar o módulo não apaga dados históricos.

---

### Decision 10: Deploy — Docker Compose com PostgreSQL

**Decision**: `docker-compose.yml` com serviços: `backend` (NestJS), `frontend` (Nginx servindo build Vite), `postgres` (PostgreSQL 16), `redis` (cache para sessions/geocoding).

**Rationale**: Docker Compose é suficiente para uma VM dedicada por cooperativa. Sem Kubernetes (desnecessário para escala de instância única). Redis usado para: cache de geocoding Nominatim (evitar re-calls) e possivelmente blacklist de refresh tokens revogados. Nginx serve o frontend estático e faz proxy reverso para o backend.

**Backup strategy**: Script cron `pg_dump` diário com retenção de 30 dias em volume local + possibilidade de sincronizar com storage externo (S3-compatible). Documentado em `infra/scripts/backup.sh`.
