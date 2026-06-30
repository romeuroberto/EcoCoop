# Specification Quality Checklist: Fase 3 — Coleta, Rotas e Entrada de Material Bruto

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Spec validated on 2026-06-30 (initial). Re-validated on 2026-06-30 after clarification session (5/5 questions). All 16 items pass.
- Clarification session resolveu: modelo de estorno (`ESTORNO_BRUTO`), obrigatoriedade de `routeId` (NOT NULL), edição parcial em `EM_ANDAMENTO`, geocoding + coordenadas manuais (`locationPending`), permissões de DRIVER em rotas `CONCLUÍDAS`.
- FR-040 mentions Leaflet/OpenStreetMap as "implementação inicial" — this is an assumption documented in Assumptions, not a requirement that locks the implementation.
- SC-003 (sugestão de sequência em < 3 segundos para até 20 pontos) é verificável por teste de integração com dados de fixture.
- A entidade `SaldoBruto` foi explicitamente marcada como projeção (não persistida) para reforçar o Princípio IV da Constituição.
- `EventoEstoqueBruto` agora tem dois tipos na Fase 3: `ENTRADA_BRUTO` (positivo) e `ESTORNO_BRUTO` (negativo, referência obrigatória + justificativa).
