# Feature Specification: Vendas Operacionais

**Feature Branch**: `007-vendas-operacionais`

**Created**: 2026-07-03

**Status**: Draft

**Input**: Registrar vendas de material pronto a compradores, consumindo saldo de estoque pronto por evento imutável, com confirmação de entrega e vínculo com conta a receber.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Registrar venda de material pronto a um comprador (Priority: P1)

O gestor da cooperativa negocia a venda de material pronto com um comprador cadastrado. Ele registra a venda informando o comprador, os materiais vendidos (um ou mais), quantidades, unidades e preço unitário. O sistema verifica o saldo disponível, bloqueia a venda se for insuficiente e, ao confirmar, consome o estoque pronto via evento de saída imutável.

**Why this priority**: É o núcleo do módulo. Sem registro de venda com consumo de estoque, nenhuma outra história tem sentido. Toda a rastreabilidade financeira e logística depende deste passo.

**Independent Test**: Acessar "Nova Venda", selecionar comprador "Recicla SP", adicionar item PET (50 kg a R$ 2,50/kg), confirmar. Verificar que o saldo pronto de PET diminuiu 50 kg, que existe movimentação de estoque pronto com tipo VENDA referenciando a venda, e que a venda aparece no histórico com status PENDENTE_ENTREGA.

**Acceptance Scenarios**:

1. **Given** saldo pronto de PET é 200 kg, **When** gestor registra venda de 50 kg de PET a R$ 2,50/kg para comprador "Recicla SP", **Then** o sistema cria a venda com status PENDENTE_ENTREGA, debita 50 kg do estoque pronto via evento VENDA, e persiste todos os campos: comprador, item, quantidade, unidade, preço unitário, valor total calculado (R$ 125,00), responsável e timestamp.
2. **Given** saldo pronto de PET é 30 kg, **When** gestor tenta registrar venda de 50 kg de PET, **Then** o sistema rejeita a operação com mensagem clara de saldo insuficiente para PET; nenhum saldo é alterado e nenhuma venda é criada.
3. **Given** gestor adiciona múltiplos itens (PET 50 kg + Papelão 80 kg), **When** há saldo suficiente para ambos, **Then** o sistema registra a venda com dois itens, gera dois eventos de movimentação de estoque pronto (um por material), e o valor total da venda corresponde à soma dos itens.
4. **Given** gestor adiciona múltiplos itens e há saldo suficiente para um mas não para outro, **When** tenta confirmar, **Then** o sistema rejeita indicando qual item não tem saldo suficiente; nenhum saldo é alterado.
5. **Given** venda registrada com sucesso, **When** qualquer usuário consulta o histórico de movimentações do estoque pronto do material, **Then** a movimentação do tipo VENDA aparece com referência à venda, quantidade, responsável e data.

---

### User Story 2 — Confirmar saída física / entrega ao comprador (Priority: P1)

Após a venda ser registrada, o material precisa ser fisicamente retirado ou entregue ao comprador. O responsável pela expedição confirma a saída registrando data e hora real da entrega, finalizando operacionalmente a venda.

**Why this priority**: A confirmação de entrega é requisito para encerrar o ciclo operacional da venda e para acionar o vínculo com a conta a receber. Sem ela, o sistema não distingue venda registrada de venda entregue — informação crítica para gestão logística e financeira.

**Independent Test**: Abrir uma venda com status PENDENTE_ENTREGA, clicar em "Confirmar Entrega", informar data/hora da entrega e salvar. Verificar que o status muda para ENTREGUE, que a data de entrega fica registrada e que a conta a receber vinculada (se existente) reflete a entrega.

**Acceptance Scenarios**:

1. **Given** venda com status PENDENTE_ENTREGA, **When** responsável confirma entrega com data e hora, **Then** o status muda para ENTREGUE, data de entrega é persistida, e o evento é auditado com quem confirmou e quando.
2. **Given** venda com status ENTREGUE, **When** qualquer usuário tenta confirmar entrega novamente, **Then** o sistema bloqueia a operação com mensagem de que a entrega já foi confirmada.
3. **Given** venda com status CANCELADA, **When** usuário tenta confirmar entrega, **Then** o sistema bloqueia — venda cancelada não pode ter entrega confirmada.

---

### User Story 3 — Cancelar venda com estorno de estoque (Priority: P2)

Uma venda registrada não será mais realizada (comprador desistiu, erro de dados). O gestor cancela a venda, o sistema estorna as saídas de estoque pronto via evento de estorno imutável, e registra o motivo de cancelamento.

**Why this priority**: Necessário para correção de erros operacionais e situações de desistência. Sem cancelamento com estorno, o saldo pronto fica incorreto e a rastreabilidade é comprometida. Menos frequente que registro e entrega.

**Independent Test**: Abrir venda com status PENDENTE_ENTREGA, clicar em "Cancelar Venda", informar motivo, confirmar. Verificar que o saldo pronto de cada material da venda foi restituído, que existem movimentações de tipo ESTORNO_VENDA no histórico, e que a venda aparece com status CANCELADA.

**Acceptance Scenarios**:

1. **Given** venda PENDENTE_ENTREGA com 50 kg de PET, **When** gestor cancela com motivo, **Then** 50 kg são restituídos ao saldo pronto via evento ESTORNO_VENDA, a venda fica com status CANCELADA, e o motivo, responsável e timestamp do cancelamento são registrados.
2. **Given** venda ENTREGUE, **When** gestor tenta cancelar, **Then** o sistema bloqueia — venda já entregue não pode ser cancelada diretamente; deve-se registrar ajuste de estoque manual separadamente.
3. **Given** venda cancelada com sucesso, **When** usuário consulta histórico de movimentações do material, **Then** os eventos ESTORNO_VENDA aparecem vinculados à venda com referência cruzada.

---

### User Story 4 — Consultar histórico de vendas e filtrar por período/comprador (Priority: P2)

O gestor precisa visualizar todas as vendas realizadas, filtrar por comprador, período, material e status, e acessar o detalhe de cada venda para verificar itens, valores e status de entrega.

**Why this priority**: Visibilidade do histórico de vendas é necessária para gestão, conciliação e geração de relatórios. Sem essa consulta o sistema não entrega inteligência gerencial.

**Independent Test**: Acessar "Vendas", aplicar filtro por comprador "Recicla SP" e período "últimos 30 dias". Verificar lista com as vendas correspondentes, selecionando uma para ver todos os itens, valores, status e histórico de eventos da venda.

**Acceptance Scenarios**:

1. **Given** existem vendas registradas, **When** gestor acessa a lista de vendas, **Then** vê todas as vendas com comprador, data, valor total e status; pode filtrar por comprador, período e status.
2. **Given** gestor abre detalhe de uma venda, **Then** vê todos os itens (material, quantidade, unidade, preço unitário, subtotal), valor total, comprador, responsável pelo registro, data do registro, status e, se aplicável, data de entrega.
3. **Given** filtro aplicado que não retorna resultados, **Then** o sistema exibe estado vazio com mensagem clara.

---

### User Story 5 — Vínculo com conta a receber (Priority: P3)

Ao registrar ou confirmar uma venda, o sistema gera automaticamente um registro de conta a receber vinculado à venda, com valor, comprador, vencimento estimado e status de recebimento pendente. O módulo financeiro completo (conciliação, baixa, etc.) fica fora do escopo desta feature.

**Why this priority**: O vínculo é o ponto de integração entre o operacional e o financeiro. Sem ele, o gestor precisa lançar manualmente cada venda no controle financeiro. A implementação é mínima: criar o registro e expô-lo, sem fluxo financeiro completo.

**Independent Test**: Registrar uma venda e verificar que um registro de conta a receber foi criado automaticamente com comprador, valor total, data de vencimento estimada (data de entrega + prazo padrão configurável) e status A_RECEBER. Confirmar que o registro está acessível na listagem de contas a receber.

**Acceptance Scenarios**:

1. **Given** venda registrada com sucesso, **When** sistema processa o registro, **Then** uma conta a receber é criada automaticamente com: comprador, valor total da venda, data estimada de vencimento, referência à venda e status A_RECEBER.
2. **Given** venda confirmada como ENTREGUE, **When** status muda, **Then** a conta a receber associada reflete a entrega (data de entrega preenchida) sem alterar o valor ou o status de recebimento (baixa é responsabilidade do módulo financeiro).
3. **Given** venda cancelada, **When** estorno é processado, **Then** a conta a receber vinculada é marcada como CANCELADA automaticamente.

---

### Edge Cases

- O que acontece se o comprador não estiver ativo no cadastro? O sistema deve impedir o registro de venda para compradores inativos com mensagem explicativa.
- O que acontece se o preço unitário informado for zero? O sistema deve alertar (não bloquear), pois pode ser uma doação ou destinação sem ônus.
- O que acontece se dois usuários tentam vender o mesmo lote simultaneamente? A operação é transacional; a segunda venda falha com mensagem de saldo insuficiente se o primeiro commit consumiu o estoque.
- O que acontece se a venda tem múltiplos itens e apenas um deles não tem saldo? O sistema rejeita a venda inteira, apontando qual item falhou; nenhum saldo é alterado.
- O que acontece se o prazo de vencimento da conta a receber não for configurado? O sistema usa um prazo padrão de 30 dias; o campo pode ser ajustado pelo gestor antes de salvar.
- O que acontece com a conta a receber se a venda for cancelada antes da entrega? A conta é marcada CANCELADA automaticamente junto com o cancelamento da venda.
- O que acontece com vendas no histórico após mudança de preço de mercado do material? Os valores ficam congelados no momento do registro; não há reavaliação retroativa.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir registrar uma venda selecionando um comprador ativo e adicionando um ou mais itens, cada item com: material pronto, quantidade, unidade e preço unitário.
- **FR-002**: O sistema DEVE calcular automaticamente o subtotal de cada item (quantidade × preço unitário) e o valor total da venda (soma dos subtotais).
- **FR-003**: O sistema DEVE verificar saldo disponível de estoque pronto para cada item antes de confirmar a venda; se qualquer item tiver saldo insuficiente, a operação inteira DEVE ser rejeitada sem alterar nenhum saldo.
- **FR-004**: Ao confirmar uma venda, o sistema DEVE debitar o saldo de estoque pronto de cada item via evento imutável de movimentação do tipo VENDA, em operação transacional atômica.
- **FR-005**: O sistema DEVE registrar automaticamente: usuário responsável pelo registro, timestamp de criação, e status inicial PENDENTE_ENTREGA.
- **FR-006**: O sistema DEVE impedir o registro de venda para compradores com cadastro inativo.
- **FR-007**: O sistema DEVE permitir confirmar a saída física informando data e hora de entrega, alterando o status da venda para ENTREGUE.
- **FR-008**: O sistema DEVE impedir confirmação de entrega em vendas com status diferente de PENDENTE_ENTREGA.
- **FR-009**: O sistema DEVE permitir cancelar vendas com status PENDENTE_ENTREGA, exigindo motivo de cancelamento, e estornar automaticamente o saldo de estoque pronto via eventos imutáveis de tipo ESTORNO_VENDA.
- **FR-010**: O sistema DEVE impedir cancelamento de vendas com status ENTREGUE.
- **FR-011**: O sistema DEVE criar automaticamente um registro de conta a receber vinculado a cada venda registrada, contendo: comprador, valor total, data estimada de vencimento e status A_RECEBER.
- **FR-012**: O sistema DEVE marcar a conta a receber como CANCELADA quando a venda vinculada for cancelada.
- **FR-013**: O sistema DEVE fornecer listagem de vendas com filtros por comprador, período, status e material.
- **FR-014**: O sistema DEVE exibir o detalhe completo de cada venda: comprador, itens, valores, status, datas e histórico de eventos.
- **FR-015**: O sistema DEVE registrar todos os eventos de venda (criação, entrega, cancelamento, estorno) em log de auditoria com usuário e timestamp.
- **FR-016**: Todas as permissões de criação, confirmação de entrega e cancelamento de venda DEVEM ser verificadas no backend.
- **FR-017**: O sistema NÃO DEVE bloquear a criação de venda quando o preço unitário de um item for zero, porém DEVE retornar o aviso `ZERO_PRICE_ITEM` no campo `warnings` da resposta, permitindo que a interface exiba alerta não bloqueante ao operador.

### Key Entities

- **Venda**: Representa a operação comercial entre a cooperativa e um comprador; possui status (PENDENTE_ENTREGA, ENTREGUE, CANCELADA), data de registro, data de entrega e referência ao responsável.
- **Item de Venda**: Linha individual de material dentro de uma venda; contém material, quantidade, unidade, preço unitário e subtotal calculado.
- **Movimentação de Estoque Pronto**: Evento imutável gerado pela venda (tipo VENDA) ou pelo cancelamento (tipo ESTORNO_VENDA); vinculado à venda de origem.
- **Conta a Receber**: Registro financeiro mínimo criado automaticamente ao registrar a venda; contém comprador, valor, vencimento estimado e status (A_RECEBER, CANCELADA); baixa e conciliação pertencem ao módulo financeiro futuro.
- **Comprador**: Entidade já existente no sistema; utilizada como referência na venda.
- **Material Pronto**: Entidade já existente; define o item negociado e a unidade de medida.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O gestor consegue registrar uma venda com múltiplos itens em menos de 3 minutos a partir do acesso à tela.
- **SC-002**: 100% das tentativas de venda com saldo insuficiente são bloqueadas; nenhum saldo é alterado em caso de rejeição.
- **SC-003**: Cada venda gera exatamente um evento de movimentação de estoque pronto por item, e cada cancelamento gera exatamente um evento de estorno por item.
- **SC-004**: O histórico de vendas retorna resultados para filtros de comprador e período em menos de 2 segundos para bases com até 10.000 registros.
- **SC-005**: 100% das vendas registradas resultam em uma conta a receber criada automaticamente e vinculada corretamente.
- **SC-006**: Toda ação de criação, entrega e cancelamento é auditável: quem fez, quando e qual foi o estado anterior e posterior.
- **SC-007**: Não é possível criar, alterar ou cancelar uma venda sem a permissão correspondente — verificada no backend.

---

## Assumptions

- Compradores, materiais, unidades e estoque pronto já estão implementados e disponíveis via APIs internas (specs 002, 006).
- A unidade de medida da venda deve corresponder à unidade cadastrada no material pronto; conversão entre unidades fica fora do escopo desta feature.
- O prazo padrão para vencimento de conta a receber é 30 dias após o registro da venda; o gestor pode ajustar esse valor por venda antes de salvar.
- A baixa de conta a receber (marcar como paga) e a conciliação bancária são responsabilidade do módulo financeiro futuro e estão fora do escopo desta feature.
- O preço unitário é informado manualmente pelo gestor no momento da venda; não há tabela de preços automática nesta fase.
- Nota fiscal eletrônica está fora do escopo desta feature (alinhado com a Constituição, Princípio XV).
- Rastreabilidade de lote específico de estoque pronto está fora do escopo; o saldo é consumido por material/unidade sem distinção de lote.
- Um comprador inativo no cadastro não pode ter vendas registradas; o sistema deve impedir isso com mensagem clara.
- Permissões de venda seguem o modelo RBAC existente: gestor pode registrar, confirmar e cancelar; triador pode apenas consultar.
- O portal do comprador (Princípio IX da Constituição) pode no futuro expor o histórico de vendas ao próprio comprador, mas essa visibilidade não faz parte do escopo desta feature.
