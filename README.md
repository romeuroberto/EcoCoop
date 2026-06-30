# EcoCoop — Documentação Inicial para GitHub Spec Kit

Projeto de software para gestão completa de cooperativa de reciclagem, usando Spec-Driven Development com GitHub Spec Kit.

## Objetivo

Centralizar o fluxo operacional e financeiro de uma cooperativa de reciclagem, desde as rotas de coleta até a triagem, estoque, venda para compradores, fluxo de caixa, rateio dos ganhos, EPIs, veículos e relatórios estratégicos.

## Stack inicial sugerida

- Backend: NestJS + TypeScript
- Frontend: React + TypeScript + Vite
- Banco de dados: PostgreSQL
- ORM: Prisma ou TypeORM, a decidir na fase de plano técnico
- Autenticação: JWT com RBAC
- Deploy: instância dedicada por cooperativa, preferencialmente VM + Docker Compose
- Mapas: integração com provedor de mapas a definir no plano técnico

## Estratégia de implantação

Cada cooperativa terá sua própria instância do sistema. O projeto não nascerá multi-tenant no banco ou aplicação. Para cada nova cooperativa atendida, será provisionada uma nova VM/instância isolada.

## Como usar este pacote

1. Crie o repositório do projeto.
2. Inicialize o GitHub Spec Kit.
3. Use o arquivo `spec-kit-prompts/01-constitution.md` para gerar a constitution.
4. Use o arquivo `spec-kit-prompts/02-specify-mvp.md` para gerar a primeira especificação.
5. Use o arquivo `spec-kit-prompts/03-plan-mvp.md` para gerar o plano técnico.
6. Só depois gere tasks e implemente.

## Ordem recomendada

```bash
uvx --from git+https://github.com/github/spec-kit.git specify init .
```

Depois, no Codex/GitHub Copilot/agent compatível:

```text
/speckit.constitution <conteúdo do prompt 01>
/speckit.specify <conteúdo do prompt 02>
/speckit.clarify
/speckit.plan <conteúdo do prompt 03>
/speckit.checklist
/speckit.tasks
/speckit.analyze
/speckit.implement
```
