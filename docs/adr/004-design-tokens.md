# ADR 004 — Paleta Institucional e Estratégia de Design Tokens

**Status**: Accepted  
**Date**: 2026-07-01  
**Feature**: 004-visual-identity-design-system  
**Deciders**: Development team

---

## Contexto

O EcoCoop utilizava a paleta padrão do Tailwind CSS (`brand-*: green`) herdada do bootstrap inicial. A identidade visual era indistinguível de um admin template genérico, sem personalidade institucional. A Fase 4 introduz uma identidade visual autoral adequada a um sistema operacional de cooperativa de reciclagem.

---

## Decisão

### 1. Nova Paleta Institucional (três escalas customizadas)

Substituir `brand-500: #22c55e` (verde genérico) por três escalas com propósito semântico distinto:

| Escala | Cor base | Hex | Papel |
|--------|----------|-----|-------|
| `petroleo` | Azul-petróleo | `#1e4a6e` (600) | Cor primária de interação — sidebar, botões primários, links ativos, focus rings |
| `ecocoop` | Teal | `#0d7a7a` (600) | Cor de acento — badges "concluída", highlights, hover states |
| `grafite` | Carvão | `#343a40` (800) | Cor neutra — texto principal, fundos suaves, bordas, estados desabilitados |

Verde permanece no sistema apenas como cor **semântica positiva** (estado "ativo", sucesso) via `green-*` do Tailwind padrão — sem uso como cor de marca.

### 2. Estratégia de Componentes UI

Biblioteca de componentes locais em `apps/frontend/src/components/ui/` (sem dependência de lib externa como shadcn/ui, MUI ou Chakra):
- **Motivo**: Tailwind CSS 3.4 já cobre todos os requisitos visuais; uma lib externa adicionaria bundle, lock-in e customização adicional desnecessária para o MVP.
- Componentes: Badge, Button, Card, PageHeader, EmptyState, LoadingState, Pagination, FilterBar.
- Breadcrumbs são implementados em fase posterior junto ao layout global.

### 3. Retrocompatibilidade durante a transição

A escala `brand-*` (verde original) é **preservada** em `tailwind.config.js` durante a transição. Telas fora do recorte das 4 telas-modelo continuam usando `brand-*` sem quebra. A remoção do `brand-*` fica para uma fase posterior de migração completa.

---

## Opções Consideradas

| Opção | Prós | Contras | Decisão |
|-------|------|---------|---------|
| Manter `brand-*` verde | Sem esforço | Aparência genérica, sem identidade | ❌ Rejeitado |
| Adotar lib UI externa (shadcn, MUI) | Componentes prontos | Bundle, customização difícil, lock-in | ❌ Rejeitado |
| Paleta customizada + Tailwind | Identidade autoral, sem deps extras, tree-shaking | Esforço de design inicial | ✅ Escolhido |
| CSS Modules / CSS Variables puras | Sem Tailwind overhead | Perde JIT/purge, consistência com base existente | ❌ Rejeitado |

---

## Consequências

- **Positivo**: Identidade visual diferenciada, componentes reutilizáveis, sem dependência nova.
- **Positivo**: Qualquer desenvolvedor familiarizado com Tailwind entende e mantém.
- **Negativo**: A escala `brand-*` (verde) cria duplicidade temporária; requer limpeza futura.
- **Neutro**: Telas fora das 4 telas-modelo continuam com aparência anterior durante a transição.

---

## Referências

- Spec: `specs/004-visual-identity-design-system/spec.md`
- Princípio XXI da Constituição (Stack Tecnológica Definida)
- Princípio XXII da Constituição (Decisões Estruturais em ADR)
