# Feature Specification: Rotas Recorrentes

**Feature Branch**: `005-rotas-recorrentes`

**Created**: 2026-07-01

**Status**: Draft

**Input**: Modelos de rota recorrente, geração de ocorrências, duplicação assistida, regras de edição e cancelamento.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Criar modelo de rota recorrente e visualizar ocorrências geradas (Priority: P1)

O gestor da cooperativa precisa que determinadas rotas de coleta aconteçam toda semana nos mesmos dias, com o mesmo motorista, veículo e pontos. Hoje ele recria a mesma rota manualmente toda semana. Com modelos de rota, ele cadastra o padrão uma única vez e o sistema gera automaticamente as ocorrências para as próximas semanas.

**Why this priority**: Elimina o principal trabalho manual repetitivo do módulo de coleta. Sem isso, toda a funcionalidade de recorrência não existe.

**Independent Test**: Acessar "Modelos de Rota", criar um modelo com recorrência semanal (terças e quintas), motorista e 3 pontos de coleta. Confirmar que ocorrências para as próximas 4 semanas aparecem na listagem de Rotas de Coleta com status PLANEJADA e com a configuração correta.

**Acceptance Scenarios**:

1. **Given** nenhum modelo existe, **When** gestor preenche nome, padrão de recorrência (dias da semana), data de início, data de fim (opcional), motorista padrão, veículo padrão e pontos de coleta padrão e salva, **Then** o modelo é criado e ocorrências são geradas automaticamente até o horizonte configurado (padrão: 4 semanas à frente).
2. **Given** um modelo ativo existe, **When** o dia de geração chega (a cada 7 dias), **Then** novas ocorrências são geradas para manter o horizonte de 4 semanas abastecido.
3. **Given** um modelo com data de fim definida, **When** o sistema gera ocorrências, **Then** nenhuma ocorrência é criada após a data de fim do modelo.
4. **Given** a lista de Rotas de Coleta, **When** o gestor filtra por modelo, **Then** apenas as ocorrências daquele modelo são exibidas com indicação visual de que pertencem a um modelo recorrente.

---

### User Story 2 — Editar uma ocorrência individual sem afetar o modelo (Priority: P2)

Em uma semana específica, o motorista habitual está de férias. O gestor precisa substituí-lo apenas naquela ocorrência sem alterar o padrão do modelo nem as outras ocorrências.

**Why this priority**: A exceção à regra é o caso de uso mais frequente após a criação. Sem isso, o gestor seria forçado a cancelar e recriar manualmente qualquer desvio.

**Independent Test**: Abrir uma ocorrência futura gerada pelo modelo, alterar o motorista e salvar. Confirmar que a ocorrência mostra o motorista diferente, que o modelo permanece inalterado e que outras ocorrências futuras ainda têm o motorista original.

**Acceptance Scenarios**:

1. **Given** uma ocorrência com status PLANEJADA, **When** gestor altera motorista, veículo ou pontos e salva como "apenas esta ocorrência", **Then** apenas essa ocorrência reflete a alteração; o modelo e todas as outras ocorrências permanecem iguais.
2. **Given** uma ocorrência com status EM_ANDAMENTO, **When** gestor tenta editar campos estruturais (motorista, pontos), **Then** o sistema recusa a edição e exibe mensagem explicativa; campos operacionais (observações) ainda podem ser atualizados.
3. **Given** uma ocorrência com status CONCLUIDA ou CANCELADA, **When** gestor tenta editar qualquer campo, **Then** a edição é bloqueada completamente.

---

### User Story 3 — Editar o modelo e propagar para ocorrências futuras (Priority: P2)

O gestor muda o veículo padrão da rota (novo veículo adquirido). Ele quer que todas as ocorrências futuras ainda não iniciadas passem a usar o novo veículo, sem precisar editar uma a uma.

**Why this priority**: Sem propagação, a gestão do modelo perde valor — o gestor teria que editar cada ocorrência individualmente de qualquer forma.

**Independent Test**: Editar o veículo padrão de um modelo existente, confirmar que ocorrências com status PLANEJADA são atualizadas para o novo veículo, e que ocorrências CONCLUIDAS ou EM_ANDAMENTO permanecem com o veículo anterior.

**Acceptance Scenarios**:

1. **Given** um modelo com ocorrências futuras PLANEJADAS, **When** gestor altera motorista, veículo ou pontos no modelo e confirma propagação, **Then** todas as ocorrências com status PLANEJADA cuja data planejada seja igual ou posterior à data atual são atualizadas; o corte é automático (data atual), sem seleção manual; ocorrências EM_ANDAMENTO, CONCLUIDA ou CANCELADA não são alteradas.
2. **Given** uma ocorrência que foi editada individualmente em qualquer campo (exceção), **When** o modelo é propagado, **Then** a ocorrência inteira permanece inalterada por padrão — nenhum campo é atualizado; o sistema exibe quantas ocorrências com exceção foram ignoradas e oferece ao gestor a opção de sobrescrevê-las explicitamente.
3. **Given** gestor edita o padrão de recorrência do modelo (ex: acrescenta sexta-feira), **When** confirma a alteração, **Then** novas ocorrências são geradas para os novos dias; ocorrências já existentes nos dias anteriores não são removidas.

---

### User Story 4 — Duplicar uma rota ou modelo como ponto de partida (Priority: P3)

O gestor quer criar uma nova rota esporádica muito parecida com uma existente (mesmos pontos, mesmo motorista), mudando apenas a data e o veículo. Ou quer criar um novo modelo baseado em um já existente para uma cooperativa filial com pontos diferentes.

**Why this priority**: Reduz trabalho de preenchimento manual para casos de uso comuns mas não recorrentes o suficiente para virar modelo. Valor incremental sobre as histórias anteriores.

**Independent Test**: Clicar em "Duplicar" em uma rota existente ou em um modelo, confirmar que um formulário abre pré-preenchido com os dados do original, alterar data e veículo, salvar. Confirmar que a nova rota ou modelo existe sem alterar o original.

**Acceptance Scenarios**:

1. **Given** qualquer rota de coleta (avulsa ou ocorrência de modelo), **When** gestor clica em "Duplicar", **Then** abre formulário de nova rota pré-preenchido com os mesmos motorista, veículo e pontos; data é limpa e deve ser preenchida; o campo de recorrência fica desativado (rota avulsa por padrão).
2. **Given** qualquer modelo de rota, **When** gestor clica em "Duplicar modelo", **Then** abre formulário de novo modelo pré-preenchido com todos os dados do original; nome recebe sufixo " (cópia)"; datas de vigência são limpas.
3. **Given** formulário de duplicação aberto, **When** gestor salva sem alterar nenhum campo obrigatório, **Then** o sistema salva normalmente; o original não é alterado.

---

### User Story 5 — Cancelar ocorrência individual ou modelo inteiro (Priority: P3)

A rota de terça não vai acontecer esta semana por feriado municipal. Ou o modelo inteiro precisa ser desativado porque a cooperativa mudou sua área de atuação.

**Why this priority**: O ciclo de vida do modelo precisa ser gerenciável. Sem cancelamento, modelos obsoletos continuam gerando ocorrências indefinidamente.

**Independent Test**: Cancelar uma ocorrência individual e confirmar que o modelo e demais ocorrências permanecem intactos. Cancelar um modelo e confirmar que todas as ocorrências PLANEJADAS ficam com status CANCELADA e nenhuma nova é gerada.

**Acceptance Scenarios**:

1. **Given** uma ocorrência com status PLANEJADA, **When** gestor cancela com motivo, **Then** apenas essa ocorrência fica CANCELADA; o modelo permanece ativo e continuará gerando novas ocorrências nos ciclos seguintes.
2. **Given** um modelo ativo, **When** gestor desativa o modelo, **Then** todas as ocorrências com status PLANEJADA são canceladas; ocorrências EM_ANDAMENTO, CONCLUIDA ou CANCELADA não são alteradas; nenhuma nova ocorrência é gerada.
3. **Given** uma ocorrência com status EM_ANDAMENTO, **When** gestor tenta cancelar, **Then** o sistema exige confirmação explícita e registra motivo; o cancelamento é permitido mas gera registro de auditoria.
4. **Given** um modelo desativado, **When** gestor reativa o modelo com nova data de início, **Then** o sistema volta a gerar ocorrências a partir da nova data; ocorrências canceladas pelo desligamento anterior permanecem canceladas.

---

### Edge Cases

- O que acontece quando motorista ou veículo padrão do modelo é desativado no cadastro? O modelo deve continuar gerando ocorrências, mas com alerta de que o recurso está indisponível.
- O que acontece se duas ocorrências do mesmo modelo são geradas para a mesma data (bug)? O sistema deve detectar e evitar duplicação por unicidade de (modelo + data planejada).
- O que acontece se o horizonte de geração é estendido manualmente? O sistema deve preencher as semanas faltantes sem recriar as já existentes.
- Como tratar feriados? Fora do escopo desta fase — o gestor cancela manualmente as ocorrências de feriados.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir criar um Modelo de Rota com: nome, padrão de recorrência (dias da semana), data de início de vigência, data de fim de vigência (opcional), motorista padrão, veículo padrão e lista ordenada de pontos de coleta padrão.
- **FR-002**: O sistema DEVE gerar automaticamente ocorrências de rota a partir de um modelo ativo, respeitando o padrão de recorrência e o horizonte configurado (padrão 4 semanas à frente da data atual).
- **FR-003**: O sistema DEVE renovar o horizonte de geração de forma contínua, garantindo que sempre existam ocorrências planejadas dentro do horizonte para cada modelo ativo.
- **FR-004**: Ocorrências geradas por modelo DEVEM ser visualmente identificadas como pertencentes ao modelo na listagem de Rotas de Coleta.
- **FR-005**: O gestor DEVE poder editar uma ocorrência individual (motorista, veículo, pontos, data) com escopo "apenas esta ocorrência", sem alterar o modelo ou outras ocorrências.
- **FR-006**: O gestor DEVE poder editar o modelo e escolher propagar as alterações para todas as ocorrências com status PLANEJADA a partir da data atual (corte automático = hoje); nenhuma seleção manual de data de corte é necessária.
- **FR-007**: Ocorrências com status EM_ANDAMENTO, CONCLUIDA ou CANCELADA NUNCA DEVEM ser alteradas por propagação de modelo.
- **FR-008**: Ocorrências com qualquer campo editado individualmente (exceção) DEVEM ser preservadas por inteiro na propagação do modelo — nenhum campo é atualizado, independentemente de qual campo foi alterado no modelo; o gestor pode optar explicitamente por sobrescrever a ocorrência inteira ao confirmar a propagação.
- **FR-009**: O sistema DEVE permitir duplicar qualquer rota de coleta (avulsa ou gerada por modelo), abrindo formulário pré-preenchido para uma nova rota avulsa.
- **FR-010**: O sistema DEVE permitir duplicar qualquer modelo de rota, abrindo formulário pré-preenchido para um novo modelo.
- **FR-011**: O gestor DEVE poder cancelar uma ocorrência individual fornecendo motivo; o modelo deve permanecer ativo.
- **FR-012**: O gestor DEVE poder desativar um modelo; todas as ocorrências PLANEJADAS do modelo devem ser automaticamente canceladas.
- **FR-013**: O gestor DEVE poder reativar um modelo desativado, informando nova data de início de vigência.
- **FR-014**: O sistema DEVE impedir a criação de ocorrências duplicadas para o mesmo modelo na mesma data planejada.
- **FR-015**: Toda alteração a modelo ou ocorrência DEVE gerar registro de auditoria com: ator, ação, data/hora, campo alterado, valor anterior e valor novo.
- **FR-016**: Ocorrências com status EM_ANDAMENTO DEVEM poder ser canceladas com confirmação explícita e registro de motivo.
- **FR-017**: O perfil ADMIN DEVE poder configurar o horizonte de geração de ocorrências por cooperativa, com valor mínimo de 1 semana e máximo de 12 semanas; o padrão é 4 semanas.

### Key Entities

- **Modelo de Rota (RouteTemplate)**: define o padrão recorrente — nome, regra de recorrência (dias da semana, frequência), data de início, data de fim opcional, motorista padrão, veículo padrão, pontos de coleta padrão ordenados, status (ATIVO / INATIVO).
- **Ocorrência de Rota**: instância concreta gerada a partir de um modelo — herda os dados do modelo no momento da geração mas é independente após criação; referência ao modelo de origem; marcada como "exceção" quando editada individualmente; segue o ciclo de status existente (PLANEJADA → EM_ANDAMENTO → CONCLUIDA / CANCELADA).
- **Rota Avulsa (CollectionRoute)**: rota sem vínculo a modelo, criada manualmente ou via duplicação; comportamento atual preservado.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Gestor consegue criar um modelo de rota recorrente e ver as primeiras ocorrências geradas em menos de 2 minutos.
- **SC-002**: Ocorrências são geradas automaticamente sem ação manual do gestor para o horizonte configurado (4 semanas), verificado semanalmente.
- **SC-003**: Editar uma ocorrência individual ou propagar alteração do modelo leva menos de 1 minuto, sem necessidade de editar outras rotas individualmente.
- **SC-004**: Cancelar uma ocorrência ou desativar um modelo cancela todas as ocorrências PLANEJADAS afetadas em menos de 5 segundos, sem ação manual por ocorrência.
- **SC-005**: Nenhuma ocorrência duplicada (mesmo modelo + mesma data) existe no sistema após qualquer operação.
- **SC-006**: 100% das alterações a modelos e ocorrências são rastreáveis via auditoria, com ator e data identificados.

---

## Assumptions

- O padrão de recorrência desta fase suporta: dias fixos da semana (ex: toda terça e quinta). Padrões mais complexos (quinzenal, mensal por nth weekday) ficam para fases futuras.
- O horizonte de geração padrão é 4 semanas à frente da data atual; é configurável por cooperativa (apenas perfil ADMIN), com máximo de 12 semanas; o padrão de 4 semanas se aplica quando nenhuma configuração foi definida.
- Feriados não são gerenciados automaticamente pelo sistema nesta fase; o gestor cancela manualmente as ocorrências de dias feriados.
- Ocorrências geradas por modelo usam o mesmo modelo de dados de `CollectionRoute` já existente, com campos adicionais de vínculo ao modelo e flag de exceção.
- A geração de ocorrências é disparada por processo automático agendado pelo sistema e não requer ação do gestor além de criar o modelo.
- Conflitos de recurso (motorista em duas rotas no mesmo dia) são exibidos como alerta mas não bloqueiam a criação — a decisão é do gestor.
- Permissões: criação e edição de modelos é restrita a perfis com acesso a Rotas de Coleta (MANAGER, ADMIN); operadores com acesso à execução podem editar observações de ocorrências mas não campos estruturais.
- Rotas avulsas existentes não são afetadas por esta feature.

---

## Clarifications

### Session 2026-07-01

- Q: Quando o gestor edita o modelo e confirma propagação, qual é o escopo temporal das ocorrências atualizadas? → A: Todas as PLANEJADAS a partir de hoje — corte automático na data atual, sem seleção manual de data de corte.
- Q: Ocorrências com exceções individuais e propagação — granularidade de preservação? → A: Por ocorrência inteira — se qualquer campo foi customizado, a ocorrência inteira não recebe nenhuma atualização; o gestor pode sobrescrever explicitamente.
- Q: Horizonte de geração de ocorrências — fixo ou configurável? → A: Configurável por cooperativa (ADMIN), padrão 4 semanas, máximo 12 semanas.
