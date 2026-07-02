# Feature Specification: Triagem e Estoque Pronto

**Feature Branch**: `006-triagem-estoque-pronto`

**Created**: 2026-07-02

**Status**: Draft

**Input**: Fluxo de triagem de material bruto, geração de material pronto, controle de rejeitos/perdas, estoque pronto e ajustes auditados.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Registrar triagem de material bruto e gerar material pronto (Priority: P1)

O triador da cooperativa recebe um lote de material bruto já registrado no sistema. Ele precisa registrar o processo de triagem: quanto foi processado, o que gerou de material pronto (por tipo) e o que foi descartado como rejeito ou perda. O sistema deve debitar o saldo bruto e creditar o saldo pronto automaticamente.

**Why this priority**: É o coração do fluxo operacional desta fase. Sem triagem, não existe material pronto, e todo o restante do módulo (estoque, ajustes, histórico) não tem sentido. Nenhuma outra história é independentemente útil sem esta.

**Independent Test**: Acessar "Nova Triagem", selecionar material bruto disponível (ex: 100 kg de PET bruto), informar 90 kg processados, 80 kg de PET pronto gerado e 10 kg de rejeito. Confirmar que o saldo bruto de PET diminuiu 90 kg, o saldo pronto de PET aumentou 80 kg, e a triagem aparece no histórico com autor e timestamp.

**Acceptance Scenarios**:

1. **Given** existe saldo bruto suficiente (ex: 100 kg de PET), **When** triador registra triagem de 80 kg processados com 70 kg de pronto e 10 kg de rejeito, **Then** o sistema debita 80 kg do saldo bruto, credita 70 kg no estoque pronto, registra 10 kg de rejeito, e persiste a triagem com autor, data e hora.
2. **Given** saldo bruto disponível é 50 kg, **When** triador tenta registrar triagem de 60 kg processados, **Then** o sistema rejeita a operação com mensagem clara de saldo insuficiente; nenhum saldo é alterado.
3. **Given** triador informa 80 kg processados, 70 kg de pronto e 20 kg de rejeito (soma excede processado), **When** tenta salvar, **Then** o sistema rejeita com mensagem de inconsistência; nenhum saldo é alterado.
4. **Given** triagem registrada com sucesso, **When** gestor consulta a triagem, **Then** é possível ver: material origem, quantidade processada, cada saída (material pronto por tipo + quantidade), cada rejeito (tipo + quantidade), responsável e timestamp.

---

### User Story 2 — Consultar estoque pronto por material e período (Priority: P1)

O gestor precisa saber quanto de material pronto existe disponível por tipo de material, em que unidade, e como esse saldo evoluiu ao longo do tempo. Essa visão é necessária para negociação com compradores e planejamento de coleta.

**Why this priority**: Empata com P1 porque sem visibilidade do estoque pronto o sistema não entrega valor de gestão. O módulo de triagem sem consulta de estoque é uma caixa preta.

**Independent Test**: Acessar "Estoque Pronto", filtrar por material (PET), período (últimos 30 dias) e verificar o saldo atual, as movimentações do período (entradas via triagem, saídas via ajuste) e o histórico de cada movimento com data, tipo e responsável.

**Acceptance Scenarios**:

1. **Given** existem triagens registradas, **When** gestor acessa a página de Estoque Pronto, **Then** vê saldo atual por material e unidade, com possibilidade de filtrar por material, unidade e período.
2. **Given** filtro aplicado por material e período, **When** gestor expande o detalhe, **Then** vê cada movimentação (entrada por triagem, saída por ajuste), com data, quantidade, tipo de movimento e responsável.
3. **Given** nenhuma triagem foi registrada para um material, **When** gestor acessa estoque pronto, **Then** o material não aparece ou aparece com saldo zero — estado vazio exibido claramente.

---

### User Story 3 — Registrar ajuste auditado de estoque pronto (Priority: P2)

O gestor identificou uma divergência entre o estoque físico e o saldo do sistema (ex: material danificado, erro de pesagem anterior). Ele precisa registrar um ajuste manual com justificativa para corrigir o saldo sem perder rastreabilidade.

**Why this priority**: Operação crítica de contingência, mas menos frequente que triagem e consulta. Garante a integridade do estoque no longo prazo; sem ajuste auditado, divergências ficam sem correção possível.

**Independent Test**: Acessar "Ajuste de Estoque Pronto", selecionar material (PET), informar quantidade de ajuste (-5 kg), preencher justificativa obrigatória e salvar. Confirmar que o saldo é atualizado, que o ajuste aparece no histórico de movimentações com tipo "AJUSTE", justificativa e responsável, e que o saldo não fica negativo.

**Acceptance Scenarios**:

1. **Given** saldo pronto de PET é 100 kg, **When** gestor registra ajuste de -5 kg com justificativa, **Then** saldo passa para 95 kg, movimentação de ajuste é registrada com tipo AJUSTE, justificativa, responsável e timestamp.
2. **Given** saldo pronto de PET é 10 kg, **When** gestor tenta registrar ajuste de -15 kg, **Then** o sistema rejeita com mensagem de que o ajuste resultaria em saldo negativo; saldo não é alterado.
3. **Given** gestor tenta salvar ajuste sem justificativa, **When** clica em salvar, **Then** o sistema bloqueia e exige preenchimento da justificativa.
4. **Given** ajuste registrado, **When** qualquer usuário consulta o histórico de movimentações do material, **Then** o ajuste aparece com todos os campos: data, tipo AJUSTE, quantidade (positiva ou negativa), justificativa e autor.

---

### User Story 4 — Cancelar triagem registrada (Priority: P3)

O triador percebeu após o registro que informou dados incorretos (erro de pesagem, material trocado). O gestor precisa cancelar a triagem para estornar os saldos e registrar novo lançamento correto.

**Why this priority**: Necessário para correção de erros operacionais, mas menos crítico que o fluxo principal. O cancelamento é menos frequente e pode ter uma UX mais elaborada sem impactar a adoção.

**Independent Test**: Abrir uma triagem com status CONCLUÍDA, clicar em "Cancelar", informar motivo, confirmar. Verificar que o saldo bruto voltou ao valor anterior ao registro e que o saldo pronto diminuiu conforme o que havia sido creditado. Verificar que a triagem aparece com status CANCELADA no histórico.

**Acceptance Scenarios**:

1. **Given** uma triagem com status CONCLUÍDA, **When** gestor cancela com motivo, **Then** o sistema estorna: restitui quantidade processada ao saldo bruto, debita o material pronto gerado do estoque pronto, e registra movimentações de estorno com referência à triagem cancelada.
2. **Given** estorno resultaria em saldo pronto negativo (material já vendido/ajustado), **When** gestor tenta cancelar, **Then** o sistema alerta que o estorno não é possível sem tornar saldo negativo e bloqueia o cancelamento.
3. **Given** triagem cancelada, **When** qualquer usuário consulta a triagem, **Then** vê status CANCELADA, motivo de cancelamento, quem cancelou e quando, além do histórico completo da operação original.

---

### Edge Cases

- O que acontece se o material bruto tem saldo exato e a triagem consome exatamente tudo? O saldo vai para zero, sem erro.
- O que acontece se a unidade de medida do material bruto difere da unidade padrão do material pronto? O sistema deve exigir que ambos estejam na mesma unidade no cadastro de material; conversão entre unidades fica fora do escopo desta fase.
- O que acontece se uma triagem gera múltiplos tipos de material pronto (ex: PET + PEAD do mesmo lote bruto)? O formulário deve permitir adicionar múltiplos outputs de material pronto na mesma triagem.
- O que acontece se o saldo bruto está disponível mas o material está em outra localização/lote? Rastreabilidade de lote específico fica fora do escopo desta fase; o saldo é por material/unidade.
- O que acontece com o saldo quando uma triagem é registrada e outra triagem concorrente consome o mesmo saldo? A operação deve ser transacional; a segunda triagem falha se o saldo já foi consumido.
- O que acontece se a soma dos outputs (pronto + rejeitos + perdas declarados) for menor que a quantidade processada? O sistema registra automaticamente a diferença como perda inerente (tipo PERDA) no mesmo registro da triagem; nenhum campo adicional precisa ser preenchido pelo triador.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir registrar uma triagem selecionando material bruto disponível, informando quantidade processada, materiais prontos gerados (um ou mais, com tipo e quantidade cada) e rejeitos/perdas (tipo e quantidade cada).
- **FR-002**: O sistema DEVE debitar a quantidade processada do saldo bruto e creditar os materiais prontos gerados no estoque pronto em uma única operação transacional atômica.
- **FR-003**: O sistema DEVE rejeitar triagens cuja quantidade processada exceda o saldo bruto disponível do material selecionado, sem alterar nenhum saldo.
- **FR-004**: O sistema DEVE rejeitar triagens em que a soma de (material pronto gerado + rejeitos + perdas) exceda a quantidade processada, sem alterar nenhum saldo. Quando a soma for menor que a quantidade processada, o sistema registra automaticamente a diferença como perda inerente (tipo PERDA), garantindo que o total processado sempre feche contabilmente.
- **FR-005**: O sistema DEVE registrar automaticamente o usuário responsável e o timestamp de cada triagem.
- **FR-006**: O sistema DEVE registrar rejeitos e perdas com tipo identificável (REJEITO ou PERDA), descrição textual livre e referência opcional à MaterialSubcategory existente (quando o material rejeitado for identificável no cadastro), preservando rastreabilidade.
- **FR-007**: O sistema DEVE manter estoque pronto separado do estoque bruto, com saldos independentes por material e unidade.
- **FR-008**: O sistema DEVE permitir consultar estoque pronto com filtros por material, unidade, status da subcategoria (parâmetro `includeInactive: boolean` — quando `true` inclui subcategorias inativas; padrão `false`) e período.
- **FR-009**: O sistema DEVE exibir histórico de movimentações do estoque pronto, com cada entrada e saída identificada por tipo (`TRIAGEM_OUTPUT`, `AJUSTE`, `ESTORNO`), quantidade, responsável e timestamp. A UI pode exibir o label amigável "Triagem" para `TRIAGEM_OUTPUT`, mas o valor técnico do enum e da API deve ser `TRIAGEM_OUTPUT`.
- **FR-010**: O sistema DEVE permitir registrar ajuste manual de estoque pronto (positivo ou negativo) com justificativa obrigatória.
- **FR-011**: O sistema DEVE rejeitar ajustes que resultem em saldo pronto negativo.
- **FR-012**: O sistema DEVE registrar ajustes manuais com tipo AJUSTE, justificativa, responsável e timestamp no histórico de movimentações.
- **FR-013**: O sistema DEVE permitir cancelar uma triagem com status CONCLUÍDA a qualquer momento, sem restrição de janela temporal, estornando os saldos afetados e registrando o motivo e o responsável pelo cancelamento. A única restrição ao cancelamento é a validação de saldo negativo (FR-014).
- **FR-014**: O sistema DEVE rejeitar cancelamento de triagem que resultaria em saldo pronto negativo (ex: material já consumido por outro ajuste).
- **FR-015**: O sistema DEVE preservar rastreabilidade bidirecional entre entrada bruta, triagem e material pronto gerado.
- **FR-016**: Toda triagem, ajuste e cancelamento DEVE gerar registro de auditoria imutável com: ator, ação, data/hora e estado dos saldos antes/depois.
- **FR-017**: O sistema DEVE proteger todos os endpoints de triagem e estoque pronto com autenticação e controle de acesso por perfil.
- **FR-018**: O sistema DEVE exibir estados de carregamento, erro e lista vazia em todas as páginas do módulo.

### Key Entities

- **Triagem (SortingOperation)**: operação que consome saldo bruto e gera material pronto — vincula material bruto de origem, quantidade processada, outputs e rejeitos, responsável, timestamp e status (CONCLUÍDA / CANCELADA).
- **Material Pronto Gerado (SortingOutput)**: output de uma triagem — tipo de material pronto, quantidade, unidade; pertence a uma Triagem.
- **Rejeito/Perda (SortingReject)**: descarte de uma triagem — tipo (REJEITO ou PERDA), referência opcional à MaterialSubcategory (quando o material rejeitado é identificável), descrição textual livre, quantidade; pertence a uma Triagem.
- **Estoque Pronto (ReadyStock)**: saldo atual de material pronto por material e unidade — derivado das movimentações; nunca alterado diretamente.
- **Movimentação de Estoque Pronto (ReadyStockMovement)**: registro imutável de cada entrada/saída no estoque pronto — tipo (TRIAGEM, AJUSTE, ESTORNO), quantidade, referência à operação de origem, responsável e timestamp.
- **Ajuste de Estoque Pronto (ReadyStockAdjustment)**: ajuste manual auditado — material, quantidade (pode ser negativa), justificativa obrigatória, responsável e timestamp; gera uma ReadyStockMovement do tipo AJUSTE.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Triador consegue registrar uma triagem completa (material, quantidades, outputs, rejeitos) em menos de 3 minutos.
- **SC-002**: Após salvar uma triagem válida, os saldos bruto e pronto são refletidos na UI sem exigir refresh manual da página. "Imediatamente" significa que, ao retornar para a tela de detalhe ou listagem após envio bem-sucedido do formulário, os dados já devem estar atualizados — satisfeito por navegação pós-submit ou invalidação de query no cliente. Não requer polling nem WebSocket nesta fase.
- **SC-003**: Qualquer tentativa de triagem inválida (saldo insuficiente ou soma inconsistente) é rejeitada antes de alterar qualquer saldo.
- **SC-004**: Gestor consegue visualizar o saldo de estoque pronto por material e o histórico de movimentações em menos de 1 minuto de navegação.
- **SC-005**: Ajuste manual de estoque pronto sem justificativa é impedido 100% das vezes pelo sistema.
- **SC-006**: 100% das operações de triagem, ajuste e cancelamento são rastreáveis com autor e timestamp no histórico de movimentações.
- **SC-007**: Nenhuma operação resulta em saldo negativo — nem bruto nem pronto.
- **SC-008**: O cancelamento de uma triagem estorna integralmente os saldos afetados em uma única operação atômica.

---

## Assumptions

- O saldo de material bruto disponível é o mesmo já gerenciado pelo módulo existente de entrada de material bruto; esta fase apenas consome esse saldo via triagem — não altera o modelo de entrada bruta.
- Nesta fase, uma triagem consome um único tipo de material bruto por operação, mas pode gerar múltiplos tipos de material pronto (ex: PET bruto → PET cristal + PET colorido + rejeito).
- Unidades de medida são as já cadastradas no sistema; conversão entre unidades diferentes fica fora do escopo desta fase — material bruto e pronto operam na mesma unidade configurada no cadastro do material.
- Rastreabilidade de lote específico (qual entrada bruta exata foi triada) fica fora do escopo desta fase; o vínculo é por material/unidade com referência à data de registro.
- O perfil que pode registrar triagens é TRIADOR ou superior (MANAGER, ADMIN); ajustes de estoque pronto são restritos a MANAGER e ADMIN.
- Não existe fluxo de aprovação para triagem nesta fase — o registro é direto após validação.
- O audit log existente no projeto será reutilizado se houver padrão estabelecido; caso contrário, as movimentações de estoque pronto funcionam como o próprio registro imutável de auditoria.
- Materiais e unidades de medida já existem no sistema e não precisam ser recriados nesta fase.
- O design system estabelecido na Fase 4 é utilizado em todos os componentes de UI desta fase.

---

## Clarifications

### Session 2026-07-02

- Q: Quando a soma de (material pronto + rejeitos + perdas) é menor que a quantidade processada, como o sistema trata a diferença? → A: O sistema registra automaticamente a diferença como perda inerente (tipo PERDA), garantindo que o total sempre feche contabilmente sem exigir preenchimento adicional do triador.
- Q: Rejeitos/perdas devem referenciar MaterialSubcategory (FK) ou basta texto livre? → A: FK opcional + descrição textual livre — o triador pode vincular a uma subcategoria quando o material é identificável, ou registrar apenas descrição quando o rejeito não corresponde ao catálogo.
- Q: O cancelamento de triagem tem janela temporal ou pode ocorrer a qualquer momento? → A: Sem janela temporal — qualquer triagem CONCLUÍDA pode ser cancelada a qualquer momento; a única restrição é que o estorno não resulte em saldo pronto negativo.

---

## Out of Scope

- Vendas de material pronto.
- Portal do comprador.
- Contas a receber / financeiro.
- Rateio entre cooperados.
- EPIs e controle de presença.
- Custos de veículos.
- Conversão entre unidades de medida.
- Rastreabilidade de lote específico de entrada bruta.
- Nota fiscal eletrônica.
- Fluxo de aprovação de triagem.
- Qualquer alteração nas regras de rotas de coleta ou rotas recorrentes, exceto integração mínima de leitura do saldo bruto.
