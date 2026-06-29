
# Convenção de Commits — EcoCoop

Este projeto usa uma convenção baseada em **Conventional Commits**, adaptada ao fluxo de **Spec-Driven Development** com GitHub Spec Kit.

O objetivo é manter o histórico do Git claro, rastreável e útil para auditoria do desenvolvimento.


## Idioma padrão dos commits

A documentação do EcoCoop deve ser escrita em **português**.

As mensagens de commit, porém, devem ser escritas em **inglês**, seguindo o padrão Conventional Commits.

Formato obrigatório:

```text
type(scope): description in English
```

Regras:

* O `type` deve seguir Conventional Commits: `docs`, `feat`, `fix`, `test`, `build`, `chore`, `refactor`, `ci`, `style`, `perf`, `revert`.
* O `scope` deve ser escrito em inglês, em minúsculas, sem acentos e separado por hífen quando necessário.
* A descrição do commit deve ser sempre em inglês.
* Não misturar português e inglês na mensagem do commit.
* A descrição deve ser curta, objetiva e escrita no presente.
* Não usar ponto final no fim da mensagem.

Exemplos corretos:

```text
docs(spec): define initial MVP scope
docs(plan): add MVP technical planning
docs(tasks): define foundation phase tasks
docs(spec): add foundation phase analysis
docs(commits): define commit convention
build(infra): configure initial monorepo
build(database): configure Prisma and PostgreSQL
feat(auth): implement JWT login
feat(rbac): add backend permission guards
feat(users): add user CRUD
test(auth): cover login and refresh token
fix(rbac): block buyer access to admin routes
```

Exemplos incorretos:

```text
docs(plano): adiciona planejamento técnico
feat(autenticacao): implementa login com JWT
fix(users): corrige validação de e-mail
update
ajustes
wip
```

---

## Formato padrão

```text
tipo(escopo): descrição curta
```

Exemplos:

```text
docs(spec): define MVP inicial do EcoCoop
docs(plan): adiciona plano técnico da fase de fundação
feat(auth): implementa login com JWT
fix(users): corrige validação de e-mail duplicado
test(auth): adiciona testes de refresh token
refactor(rbac): simplifica verificação de permissões
```

---

## Tipos permitidos

| Tipo       | Quando usar                                                     |
| ---------- | --------------------------------------------------------------- |
| `docs`     | Documentação, specs, planos, ADRs, README, arquivos do Spec Kit |
| `feat`     | Nova funcionalidade                                             |
| `fix`      | Correção de bug                                                 |
| `refactor` | Refatoração sem alterar comportamento esperado                  |
| `test`     | Criação ou ajuste de testes                                     |
| `chore`    | Tarefas auxiliares sem impacto direto no produto                |
| `build`    | Dependências, empacotamento, Docker, build                      |
| `ci`       | GitHub Actions, pipelines e automações                          |
| `perf`     | Melhorias de performance                                        |
| `style`    | Formatação, lint, organização visual sem mudança funcional      |
| `revert`   | Reversão de commit anterior                                     |

---

## Escopos recomendados

Use escopos curtos, em inglês ou português padronizado. Para este projeto, preferimos os seguintes:

| Escopo           | Uso                               |
| ---------------- | --------------------------------- |
| `spec`           | Especificações do GitHub Spec Kit |
| `plan`           | Plano técnico                     |
| `tasks`          | Lista de tarefas                  |
| `constitution`   | Constituição do projeto           |
| `docs`           | Documentação geral                |
| `adr`            | Architecture Decision Records     |
| `backend`        | Backend em geral                  |
| `frontend`       | Frontend em geral                 |
| `infra`          | Docker, scripts, deploy, ambiente |
| `auth`           | Autenticação                      |
| `rbac`           | Perfis e permissões               |
| `users`          | Usuários                          |
| `profiles`       | Perfis                            |
| `cooperative`    | Cooperativa e configurações       |
| `audit`          | Auditoria                         |
| `database`       | Banco, migrations, Prisma         |
| `seed`           | Seeds iniciais                    |
| `api`            | Contratos e endpoints             |
| `ui`             | Interface e componentes visuais   |
| `stock`          | Estoque                           |
| `sorting`        | Triagem                           |
| `finance`        | Financeiro                        |
| `sales`          | Vendas                            |
| `routes`         | Rotas de coleta                   |
| `maps`           | Mapas                             |
| `documents`      | PDFs e documentos                 |
| `reports`        | Relatórios                        |
| `profit-sharing` | Rateio                            |
| `buyer-portal`   | Portal do comprador               |

---

## Regras obrigatórias

1. Todo commit deve começar com um tipo válido.
2. Todo commit deve ter escopo quando possível.
3. A descrição deve ser curta, objetiva e no presente.
4. Não usar ponto final na descrição.
5. Não misturar assuntos diferentes no mesmo commit.
6. Commits de implementação devem estar relacionados a uma task ou spec.
7. Mudanças estruturais devem ter ADR antes ou no mesmo conjunto de commits.
8. Arquivos gerados por agentes devem ser revisados antes do commit.
9. Não commitar arquivos `.env`, credenciais, tokens, dumps ou arquivos locais de agente.
10. Commits de documentação do Spec Kit devem usar preferencialmente `docs`.

---

## Exemplos para a fase atual

### Documentação inicial

```text
docs(spec): define MVP inicial do EcoCoop
docs(plan): adiciona plano técnico da fase de fundação
docs(tasks): define tarefas da fase de fundação
docs(constitution): consolida princípios do projeto
```

### Fundação técnica

```text
build(infra): configura monorepo com workspaces
build(backend): inicializa aplicação NestJS
build(frontend): inicializa aplicação React com Vite
build(database): configura Prisma e PostgreSQL
```

### Autenticação e permissões

```text
feat(auth): implementa login com JWT
feat(auth): adiciona refresh token
feat(rbac): implementa guards de permissão
feat(users): adiciona CRUD de usuários
feat(profiles): adiciona CRUD de perfis
```

### Testes

```text
test(auth): cobre login e refresh token
test(rbac): valida bloqueio por perfil
test(users): cobre criação e desativação de usuários
```

### Correções

```text
fix(auth): corrige expiração do refresh token
fix(rbac): bloqueia acesso de comprador a rotas administrativas
fix(database): corrige relacionamento entre usuário e perfil
```

---

## Commits recomendados no fluxo Spec Kit

### Após criar ou alterar a constitution

```text
docs(constitution): define princípios do projeto
```

### Após criar ou ajustar spec

```text
docs(spec): define escopo do MVP
```

### Após clarify

```text
docs(spec): incorpora clarificações do MVP
```

### Após plan

```text
docs(plan): adiciona plano técnico do MVP
```

### Após recortar a primeira implementação

```text
docs(plan): define escopo da fase de fundação
```

### Após tasks

```text
docs(tasks): define tarefas da fase de fundação
```

### Após analyze

```text
docs(spec): registra análise de consistência da fase de fundação
```

---

## Commits que devem ser evitados

Evite mensagens genéricas como:

```text
update
ajustes
corrige
alterações
wip
teste
subindo arquivos
novo commit
```

Substitua por mensagens específicas:

```text
docs(tasks): adiciona tarefas da fundação
fix(auth): corrige validação de credenciais inválidas
feat(users): adiciona desativação de usuário
test(rbac): cobre permissões de comprador
```

---

## Convenção para commits grandes

Se uma alteração ficar grande demais, divida em commits menores.

Exemplo ruim:

```text
feat(core): implementa sistema inicial
```

Exemplo melhor:

```text
build(infra): configura monorepo
build(database): adiciona schema inicial do Prisma
feat(auth): implementa login com JWT
feat(rbac): adiciona perfis e permissões
test(auth): adiciona testes de autenticação
```

---

## Relação com branches

Para branches, use nomes curtos e descritivos:

```text
001-ecocoop-mvp
feature/foundation-auth
feature/rbac
docs/spec-mvp
fix/auth-refresh-token
```

Quando a branch estiver vinculada a uma spec do Spec Kit, prefira manter o número da spec:

```text
001-ecocoop-mvp
001-foundation-auth
001-foundation-rbac
```

---

## Checklist antes de commitar

Antes de cada commit, rode:

```bash
git status --short
git diff --stat
```

Quando houver código implementado, rodar também:

```bash
npm test
npm run lint
npm run typecheck
```

Se algum comando ainda não existir no projeto, registre a pendência e não invente validação falsa.

---

## Exemplo de sequência da fase atual

```bash
git add .specify specs docs README.md CLAUDE.md spec-kit-prompts .gitignore
git commit -m "docs(spec): define MVP inicial do EcoCoop"

git add specs/001-ecocoop-mvp/plan.md specs/001-ecocoop-mvp/research.md specs/001-ecocoop-mvp/data-model.md specs/001-ecocoop-mvp/contracts specs/001-ecocoop-mvp/quickstart.md
git commit -m "docs(plan): adiciona planejamento técnico do MVP"

git add specs/001-ecocoop-mvp/tasks.md
git commit -m "docs(tasks): define tarefas da fase de fundação"
```

