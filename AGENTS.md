# AGENTS.md — EcoCoop

## Objetivo deste arquivo

Este arquivo orienta agentes de IA que atuem neste repositório. O objetivo é manter o desenvolvimento previsível, seguro e alinhado ao fluxo Spec-Driven Development usado no EcoCoop.

O agente deve priorizar precisão, mudanças pequenas, rastreabilidade, testes focados e respeito ao escopo da fase em andamento.

---

## Contexto do projeto

EcoCoop é um sistema de gestão para cooperativas de reciclagem.

O sistema cobre, por fases, cadastros operacionais, rotas de coleta, entrada de material bruto, triagem, estoque pronto, rejeito, vendas, financeiro, rateio, EPIs, veículos e relatórios.

Cada cooperativa terá uma instância própria em VM dedicada. O MVP não usa multi-tenancy lógico.

---

## Stack oficial

- Backend: NestJS + TypeScript
- ORM: Prisma
- Banco: PostgreSQL
- Frontend: React + TypeScript + Vite
- Monorepo com workspaces
- Ambiente local com Docker Compose

Não introduza tecnologias novas sem justificativa explícita e alinhamento com a spec/plan da fase.

---

## Idioma e convenções

- Documentação do projeto: português.
- Comentários técnicos: português quando forem necessários.
- Mensagens de commit: inglês, usando Conventional Commits.
- Código: nomes em inglês, seguindo o padrão já existente no repositório.
- Não misture português e inglês em nomes de entidades, DTOs, services, stores ou componentes.

Exemplos de commits:

```bash
feat(collection-points): implement collection point management
feat(collection-routes): implement route planning
fix(auth): prevent refresh loop without session
docs(tasks): refine collection route planning coverage
style(forms): add masks to common input fields
```

---

## Fluxo com GitHub Spec Kit

Use Spec Kit para mudanças que alterem produto, regra de negócio, arquitetura, modelo de dados, permissões, fluxos operacionais ou contratos de API.

Fluxo preferencial:

```text
/speckit-constitution
/speckit-specify
/speckit-clarify
/speckit-plan
/speckit-agent-context-update
/speckit-tasks
/speckit-analyze
/speckit-implement
```

Não pule `/speckit-clarify` em funcionalidades com ambiguidade operacional, permissões, estoque, rotas, financeiro, auditoria ou modelo de dados.

Antes de implementar um recorte, rode `/speckit-analyze` focado apenas nas tasks daquele recorte.

---

## Fonte de verdade

Ordem de precedência:

1. Código atual, migrations e testes existentes.
2. `.specify/memory/constitution.md`.
3. Spec ativa da fase em `specs/<feature>/spec.md`.
4. Plano da fase em `specs/<feature>/plan.md`.
5. Modelo de dados em `specs/<feature>/data-model.md`.
6. Contratos em `specs/<feature>/contracts/`.
7. Tasks em `specs/<feature>/tasks.md`.
8. Documentação histórica apenas como contexto.

Se houver conflito entre spec, contrato, tasks e código, pare e reporte a inconsistência antes de implementar.

---

## Controle de escopo

Implemente apenas o recorte solicitado.

Não avance para próxima story, fase ou módulo sem autorização explícita.

Exemplo: se o recorte for Fase 3B — T015–T025, não implemente execução de rota, entrada de material bruto, eventos de estoque ou saldo bruto.

Ao concluir, informe:

1. tasks concluídas;
2. tasks pendentes;
3. arquivos criados ou alterados;
4. comandos executados;
5. resultado real dos testes;
6. falhas resumidas, se houver;
7. pendências reais;
8. próximos passos sugeridos.

Não afirme que testes passaram se eles não foram executados.

---

## Mudanças fora do Spec Kit

Mudanças pequenas, visuais ou técnicas podem ser feitas fora do Spec Kit, desde que não alterem regras de negócio nem arquitetura.

Permitido fora do Spec Kit:

- adicionar logo estática;
- trocar favicon;
- corrigir textos;
- ajustar máscara visual de campos;
- corrigir layout pequeno;
- refatorar componente sem mudar comportamento;
- corrigir typo;
- ajustar labels.

Deve passar pelo Spec Kit:

- upload de logo pelo sistema;
- branding configurável por cooperativa;
- alteração de fluxo operacional;
- nova permissão;
- novo modelo de banco;
- novo contrato de API;
- alteração em auditoria;
- alteração em estoque, financeiro, rateio ou rotas;
- alteração estrutural de autenticação.

Mudanças fora do Spec Kit devem entrar em commits próprios e nunca misturadas com implementação de fase.

---

## Política econômica de testes

Não rode a suíte completa por padrão.

Durante implementação de um recorte, rode apenas os testes afetados:

```bash
npx -w apps/backend tsc --noEmit
npx -w apps/backend jest --runInBand test/integration/<arquivo-do-recorte>.spec.ts
```

Se houver mudança no frontend, rode também:

```bash
npx -w apps/frontend tsc --noEmit
npx -w apps/frontend vite build
```

Rode a suíte completa somente quando houver alteração global, como:

- autenticação;
- RBAC;
- AuditInterceptor;
- GlobalExceptionFilter;
- Prisma schema ou migration com impacto amplo;
- seed de permissões;
- configuração global da aplicação;
- fechamento de uma fase inteira;
- antes de merge/push importante.

Para suíte completa de integração:

```bash
npx -w apps/backend jest --runInBand --forceExit test/integration/
```

No relatório, não cole logs completos. Informe apenas comando, PASS/FAIL, quantidade de testes e falhas resumidas.

---

## Backend

Siga os padrões existentes de módulos NestJS.

Para novos módulos:

- criar DTOs com validação explícita;
- aplicar guards de permissão no backend;
- aplicar `AuditInterceptor` em endpoints mutáveis quando a entidade exigir auditoria;
- retornar erros consistentes com códigos documentados no contrato;
- validar regras de negócio no service;
- não confiar em validação do frontend;
- manter paginação no formato `{ data, total, page, limit }` quando houver listagem.

Não use delete físico para entidades operacionais. Use inativação lógica, salvo decisão explícita em spec.

---

## Frontend

Siga os padrões já existentes do projeto.

Para novas telas:

- manter UX simples e funcional;
- respeitar permissões vindas do backend;
- não esconder regra crítica apenas no frontend;
- manter formulários tipados;
- normalizar dados antes de enviar quando aplicável;
- manter listagens com busca, status e paginação quando o contrato exigir;
- usar componentes compartilhados quando já existirem.

Máscaras visuais não substituem validação de backend.

---

## Auditoria e rastreabilidade

Operações mutáveis em entidades de domínio devem gerar auditoria com `previousState` e `newState`, quando aplicável.

Não remova, edite ou ignore auditoria para simplificar implementação.

Eventos de estoque são imutáveis. Correções devem ser feitas por evento compensatório, nunca por edição direta do evento original.

---

## Estoque por eventos

O saldo de estoque deve ser projeção calculada a partir de eventos.

Não persistir saldo como fonte de verdade, salvo decisão explícita em spec futura.

Eventos já registrados não devem ser alterados ou excluídos fisicamente.

---

## RBAC e segurança

Permissões devem ser validadas no backend.

Não implemente regra de permissão apenas escondendo botões no frontend.

Ao criar novas operações, verificar:

- ADMIN;
- MANAGER;
- DRIVER;
- SORTER;
- BUYER, quando aplicável;
- usuários sem permissão.

Quando houver dúvida, negar por padrão e pedir esclarecimento.

---

## Git e commits

Antes de iniciar qualquer mudança:

```bash
git status --short
```

Não misture assuntos diferentes no mesmo commit.

Não misture docs/spec/tasks com implementação, exceto quando a alteração documental for parte direta e pequena do mesmo bugfix.

Preferência:

- um commit para ajuste de spec/tasks;
- um commit para implementação do recorte;
- um commit separado para ajustes visuais ou técnicos transversais.

---

## Gerenciador de pacotes

Antes de instalar dependências, verifique o lockfile existente.

Não misture `package-lock.json`, `yarn.lock` e `pnpm-lock.yaml`.

Se o projeto usa npm, não introduza yarn. Se o projeto usa yarn, não introduza npm.

---

## Proibições

Não faça:

- implementação fora do recorte autorizado;
- alteração de schema sem migration correspondente;
- criação de permissões sem seed/teste;
- alteração global sem explicar impacto;
- remoção de testes para fazer passar;
- silenciar erro sem corrigir causa;
- rodar suíte completa sem necessidade;
- colar logs longos no relatório;
- declarar sucesso sem executar validação.

---

## Quando parar e perguntar

Pare e peça decisão quando houver:

- conflito entre spec e código;
- ambiguidade de regra de negócio;
- necessidade de alterar contrato de API;
- mudança de banco não prevista;
- alteração de permissão não prevista;
- risco de quebrar fluxo já implementado;
- necessidade de nova dependência relevante;
- teste exigindo mudança fora do escopo.
