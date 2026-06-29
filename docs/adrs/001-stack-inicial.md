# ADR 001 — Stack inicial do EcoFluxo

## Status

Proposto

## Contexto

O projeto precisa de uma stack moderna, bem suportada, produtiva para desenvolvimento com agentes de IA e adequada a um sistema web administrativo com API, autenticação, permissões, dashboards, relatórios e integrações futuras.

## Decisão

Adotar inicialmente:

- Backend: NestJS + TypeScript
- Frontend: React + TypeScript + Vite
- Banco: PostgreSQL
- Deploy: VM dedicada por cooperativa, com Docker Compose
- API: REST inicialmente
- Autenticação: JWT
- Autorização: RBAC com permissões granulares

## Consequências positivas

- Stack madura e amplamente conhecida.
- Boa compatibilidade com Codex e ferramentas de IA.
- Separação clara entre backend e frontend.
- PostgreSQL atende bem a estoque, financeiro, auditoria e relatórios.
- Vite melhora a experiência de desenvolvimento frontend.
- Docker Compose facilita implantação em VM dedicada.

## Consequências negativas/riscos

- Será necessário definir cuidadosamente o modelo de permissões.
- Relatórios avançados podem exigir otimização de consultas.
- Integrações futuras com balança e nota fiscal devem ser isoladas em módulos próprios.

## Alternativas consideradas

- Next.js fullstack: descartado inicialmente para manter separação clara entre API e frontend.
- Monolito backend renderizando frontend: descartado por menor flexibilidade.
- Multi-tenant lógico: descartado no MVP porque o modelo comercial será instância dedicada por cooperativa.
