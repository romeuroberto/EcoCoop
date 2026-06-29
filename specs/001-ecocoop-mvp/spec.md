# Feature Specification: EcoCoop MVP

**Feature Branch**: `001-ecocoop-mvp`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Sistema completo de gestão para cooperativa de reciclagem — fluxo de coleta, entrada de material bruto, triagem, estoque, venda, financeiro, rateio, cooperados, veículos e documentos.

---

## Clarifications

### Session 2026-06-29

- Q: Qual é o valor total a ser rateado entre cooperados em um período? → A: Configurável, com resultado líquido como padrão. Bases permitidas: (1) resultado líquido do período (receita de vendas − custos/despesas operacionais do mesmo período) — padrão; (2) receita bruta de vendas do período; (3) valor manual definido pelo gestor, com justificativa obrigatória e registro de auditoria. O fechamento do rateio deve congelar os valores usados no cálculo para garantir rastreabilidade imutável.
- Q: Como o comprador se autentica — sistema único ou separado? → A: Mesmo sistema de autenticação. Compradores existem na mesma tabela de usuários, vinculados à entidade Comprador, com perfil "Comprador" e permissões restritas. Ao fazer login, o sistema identifica o perfil e redireciona automaticamente: internos/cooperados → área administrativa/operacional; compradores → portal do comprador. Isolamento garantido no backend por permissões. Magic link/login sem senha pode ser avaliado futuramente, fora do escopo MVP.
- Q: Quando uma sessão de triagem é aberta, o material deve ser reservado imediatamente ou apenas validado no encerramento? → A: Reservar/bloquear no ato de abertura, vinculado a eventos de entrada por critério FIFO (gestor/operador autorizado pode ajustar manualmente a origem). O estoque bruto deve exibir três saldos: total bruto, reservado/em triagem, disponível. Cancelamento libera a reserva com auditoria obrigatória. Encerramento converte a reserva em movimentações definitivas (baixa bruta, entrada de material pronto, rejeito, perda/descarte). Encerramento com resultado inconsistente é bloqueado, salvo com permissão de ajuste justificado com auditoria.
- Q: Qual o nível de funcionalidade dos mapas no MVP? → A: Visualização de pontos + cálculo de rota sugerida (Opção B). MVP inclui: cadastro de ponto com endereço/referência/coordenadas, geocoding de endereço para marcador no mapa, exibição dos pontos, criação de rota com múltiplos pontos, sugestão de sequência otimizada, exibição visual do trajeto no mapa, reordenação manual dos pontos pelo gestor, registro de distância estimada, registro de veículo/motorista/cooperados envolvidos e custos estimados, histórico da rota planejada vs. executada. Rastreamento GPS em tempo real fica documentado como integração futura (depende de app mobile ou dispositivo de rastreamento).
- Q: O rejeito de triagem é apenas baixa contábil ou gera estoque próprio? → A: Rejeito gera estoque próprio (estoque de rejeito) separado do estoque bruto e pronto. Fluxo: triagem → material pronto + rejeito + perda. Rejeito segue dois caminhos: (1) venda para comprador específico, gerando receita vinculada à operação; (2) descarte/destinação final, podendo gerar custo. Estoque de rejeito tem estados: gerado → disponível → reservado para venda → vendido / destinado para descarte → descartado. Perda é tratada separadamente: material sem aproveitamento possível, gera baixa imediata com justificativa e auditoria — NÃO entra no estoque de rejeito.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Fundação: Cooperativa, Usuários e Perfis de Acesso (Priority: P1)

O administrador configura a cooperativa no sistema, cria os primeiros usuários e define os perfis de acesso (cooperado, triador, motorista, gestor, administrador). Cada usuário acessa o sistema com login individual e visualiza apenas o que seu perfil permite.

**Why this priority**: Sem a fundação de autenticação e permissões nada mais pode ser testado ou utilizado. É o pré-requisito absoluto de todos os demais fluxos.

**Independent Test**: É possível criar uma cooperativa, criar um usuário administrador, fazer login, criar outros usuários com perfis diferentes e verificar que cada perfil só acessa o que lhe é permitido.

**Acceptance Scenarios**:

1. **Given** o sistema recém-instalado, **When** o administrador preenche os dados da cooperativa e confirma, **Then** a cooperativa é criada e o administrador consegue fazer login.
2. **Given** a cooperativa cadastrada, **When** o administrador cria um usuário com perfil "triador", **Then** o usuário consegue fazer login e não vê módulos de financeiro ou rateio.
3. **Given** um cooperado logado, **When** tenta acessar um recurso restrito ao gestor, **Then** o sistema nega o acesso com mensagem clara, independentemente da interface.
4. **Given** um usuário ativo, **When** o administrador desativa a conta, **Then** o login é bloqueado imediatamente.

---

### User Story 2 — Cadastros Base: Compradores, Materiais, Unidades e Veículos (Priority: P2)

O gestor cadastra compradores, materiais por categoria e subcategoria, unidades de medida flexíveis e veículos da cooperativa. Esses cadastros são a base para todos os fluxos operacionais.

**Why this priority**: Sem materiais cadastrados não é possível registrar entradas, triagem ou vendas. Sem compradores não há venda. Sem veículos não há rotas. São os dados mestres do sistema.

**Independent Test**: É possível cadastrar um comprador, criar uma categoria "Plástico" com subcategoria "PET", definir unidade "kg" e cadastrar um veículo, sem depender de nenhum outro módulo operacional.

**Acceptance Scenarios**:

1. **Given** o gestor logado, **When** cria a categoria "Papel" com subcategoria "Papelão", **Then** a subcategoria aparece vinculada à categoria e pode ser usada em entradas.
2. **Given** o gestor, **When** cadastra o comprador "Recicla Mais" com CNPJ, contato e endereço, **Then** o comprador fica disponível para seleção no módulo de vendas.
3. **Given** o gestor, **When** cadastra a unidade "fardo" com fator de conversão para kg opcional, **Then** a unidade está disponível para controle de estoque.
4. **Given** o gestor, **When** cadastra o veículo com placa, modelo, capacidade e motorista responsável, **Then** o veículo fica disponível para atribuição em rotas.
5. **Given** um material cadastrado, **When** o gestor tenta excluí-lo com movimentações de estoque vinculadas, **Then** o sistema bloqueia a exclusão e exibe a dependência.

---

### User Story 3 — Rotas de Coleta com Mapas (Priority: P3)

O gestor cadastra rotas de coleta com pontos de parada georreferenciados visualizados no mapa. O motorista executa a rota, registra a coleta em cada ponto e encerra a rota. A conclusão da rota alimenta automaticamente o estoque bruto.

**Why this priority**: A coleta é o ponto de entrada do fluxo principal da cooperativa. Sem coleta não há material; sem mapas, a operação de planejamento de rota perde o principal valor da funcionalidade.

**Independent Test**: É possível cadastrar uma rota com 3 pontos no mapa, simular a execução com registro de coleta em cada ponto, encerrar a rota e verificar que o estoque bruto foi atualizado com os materiais coletados.

**Acceptance Scenarios**:

1. **Given** o gestor, **When** cria uma rota e adiciona um ponto de coleta com endereço, **Then** o ponto é exibido no mapa com marcador na posição correta.
2. **Given** uma rota planejada, **When** o motorista inicia a execução, **Then** a rota muda para estado "em execução" e os pontos aparecem com status "pendente".
3. **Given** o motorista em execução, **When** registra a coleta em um ponto com material, peso e unidade, **Then** o ponto muda para "coletado" e o registro fica associado à rota.
4. **Given** todos os pontos coletados, **When** o motorista encerra a rota, **Then** o sistema cria automaticamente entradas no estoque bruto para cada material coletado.
5. **Given** uma rota encerrada, **When** o gestor acessa o histórico, **Then** vê a rota completa com pontos, materiais coletados, responsável e data/hora.

---

### User Story 4 — Entrada Manual de Material Bruto e Estoque Bruto (Priority: P4)

O operador registra manualmente a entrada de material bruto (doação, compra avulsa ou coleta direta no galpão). O estoque bruto é atualizado por evento de movimentação, nunca por alteração direta.

**Why this priority**: Nem todo material entra via rota de coleta. Entrada manual é indispensável para o dia a dia da cooperativa, especialmente no início de operação do sistema.

**Independent Test**: É possível registrar uma entrada manual de 50 kg de papelão, verificar que o estoque bruto aumentou e que há um evento de movimentação rastreável com data, responsável e origem.

**Acceptance Scenarios**:

1. **Given** o operador logado, **When** registra entrada de 30 kg de PET com origem "doação" e responsável, **Then** o estoque bruto de PET aumenta 30 kg e um evento de entrada é registrado.
2. **Given** uma entrada registrada, **When** o gestor acessa o histórico do estoque, **Then** vê o evento com data, hora, material, quantidade, unidade, origem e responsável.
3. **Given** o operador, **When** tenta lançar entrada com material não cadastrado, **Then** o sistema bloqueia e indica que o material precisa ser cadastrado primeiro.
4. **Given** estoque com 100 kg de alumínio, **When** é registrado ajuste de -10 kg com justificativa "pesagem incorreta", **Then** o estoque vai a 90 kg e o ajuste fica auditável.

---

### User Story 5 — Triagem: Transformação de Material Bruto em Material Pronto (Priority: P5)

O triador registra a triagem de um lote de material bruto: separa por subcategoria, pesa, registra perdas e rejeitos. O material bruto é baixado do estoque e o material pronto é creditado, tudo por evento de movimentação.

**Why this priority**: A triagem é o núcleo operacional da cooperativa — sem ela não existe material pronto para venda, que é a principal fonte de receita.

**Independent Test**: É possível abrir uma sessão de triagem, registrar separação de um lote de papelão em "papelão pronto" (80 kg) com rejeito (10 kg) e perda (5 kg), e verificar que o estoque bruto diminuiu 95 kg e o estoque pronto aumentou 80 kg.

**Acceptance Scenarios**:

1. **Given** estoque bruto com 100 kg de papel misto, **When** triador registra triagem: 70 kg de papelão pronto, 15 kg de rejeito e 15 kg de perda, **Then** estoque bruto diminui 100 kg, estoque pronto de papelão aumenta 70 kg, estoque de rejeito recebe 15 kg com status "gerado", e a perda de 15 kg é baixada imediatamente com justificativa obrigatória.
2. **Given** uma sessão de triagem aberta, **When** é encerrada, **Then** a sessão é imutável e não pode mais ser editada.
3. **Given** triagem encerrada, **When** gestor acessa relatório de triagem, **Then** vê rendimento por material (% aproveitado, rejeito, perda) no período.
4. **Given** o triador, **When** tenta encerrar triagem sem lançar destino de todos os kg de entrada, **Then** o sistema bloqueia com aviso de saldo não reconciliado.

---

### User Story 6 — Registro de Venda e Saída para Comprador (Priority: P6)

O gestor registra uma venda de material pronto para um comprador. A venda gera saída do estoque, romaneio e lançamento financeiro (conta a receber). A venda encerra somente quando o material sai fisicamente.

**Why this priority**: A venda é o momento de receita da cooperativa — base para o financeiro e para o rateio dos ganhos.

**Independent Test**: É possível registrar uma venda de 500 kg de papelão para o comprador "Recicla Mais" a R$ 0,80/kg, confirmar a saída, e verificar que o estoque pronto diminuiu, a conta a receber foi criada e o romaneio pode ser emitido.

**Acceptance Scenarios**:

1. **Given** estoque pronto com 500 kg de papelão, **When** gestor registra venda de 500 kg para comprador a R$ 0,80/kg, **Then** estoque pronto diminui 500 kg e conta a receber de R$ 400,00 é criada.
2. **Given** venda registrada, **When** gestor confirma saída física do material, **Then** o status muda para "entregue" e o romaneio pode ser emitido.
3. **Given** venda em aberto, **When** o comprador efetua o pagamento, **Then** a conta a receber é baixada e o lançamento aparece no fluxo de caixa.
4. **Given** uma venda, **When** gestor tenta vender mais kg do que o disponível em estoque, **Then** o sistema bloqueia a operação com indicação do saldo disponível.

---

### User Story 7 — Portal do Comprador (Priority: P7)

O comprador acessa um portal próprio com login individual. Visualiza seus pedidos, romaneios emitidos, histórico de compras e pode confirmar recebimento de entregas. Não tem acesso a dados internos da cooperativa.

**Why this priority**: Formaliza a relação com o comprador, reduz comunicação manual e agrega valor ao produto para compradores que precisam de documentação.

**Independent Test**: É possível criar um acesso de comprador, fazer login no portal, visualizar as vendas vinculadas ao comprador e baixar um romaneio, sem que o comprador veja dados de outros compradores ou financeiro interno.

**Acceptance Scenarios**:

1. **Given** o comprador com acesso criado, **When** faz login no portal, **Then** vê somente suas vendas, sem acesso ao painel administrativo.
2. **Given** uma venda entregue, **When** o comprador acessa o portal e confirma o recebimento, **Then** o status da entrega é atualizado no sistema administrativo.
3. **Given** o comprador no portal, **When** tenta acessar dados de outro comprador via URL direta, **Then** o sistema nega o acesso.

---

### User Story 8 — Fluxo de Caixa, Contas a Pagar e Receber, Centro de Custo (Priority: P8)

O gestor visualiza o fluxo de caixa da cooperativa em tempo real. Lança contas a pagar (aluguel, combustível, salários) e contas a receber. Categoriza lançamentos por centro de custo. Cada lançamento tem origem rastreável.

**Why this priority**: O fluxo de caixa é o instrumento de gestão financeira diária. Sem ele não é possível calcular o resultado líquido para o rateio.

**Independent Test**: É possível lançar uma conta a pagar de R$ 500,00 de combustível no centro de custo "Logística", registrar seu pagamento, e verificar que o saldo do fluxo de caixa é impactado corretamente.

**Acceptance Scenarios**:

1. **Given** o gestor, **When** lança conta a pagar de R$ 500,00 de aluguel com vencimento em 7 dias, **Then** a conta aparece no fluxo de caixa previsto e no relatório de contas a vencer.
2. **Given** uma conta a pagar lançada, **When** o gestor registra o pagamento com comprovante, **Then** o saldo real do caixa é atualizado e a conta muda para "paga".
3. **Given** lançamentos com centros de custo, **When** gestor filtra por centro de custo "Operação", **Then** vê somente os lançamentos desse centro com total consolidado.
4. **Given** venda confirmada, **When** o pagamento do comprador entra, **Then** a conta a receber é baixada automaticamente e o lançamento fica vinculado à venda original.

---

### User Story 9 — Rateio Configurável dos Ganhos (Priority: P9)

O gestor configura as regras de rateio (ex.: base por peso triado, participação igualitária, combinação de critérios). Ao fechar um período, o sistema calcula o rateio de forma transparente, mostra o cálculo por cooperado e gera os comprovantes.

**Why this priority**: O rateio é a razão de existência da cooperativa do ponto de vista dos cooperados. Deve ser transparente, auditável e calculado por regras explícitas.

**Independent Test**: É possível configurar uma regra de rateio "70% por peso triado + 30% igualitário", executar o cálculo para um período fechado com 5 cooperados e verificar o valor individual de cada um com o detalhamento do cálculo.

**Acceptance Scenarios**:

1. **Given** as regras de rateio configuradas, **When** o gestor fecha o período e executa o rateio, **Then** cada cooperado recebe um valor calculado conforme as regras vigentes.
2. **Given** o rateio calculado, **When** um cooperado acessa o sistema, **Then** vê seu valor de rateio do período e o detalhamento do cálculo (critérios, base de cálculo, valor).
3. **Given** o rateio de um período fechado, **When** o gestor tenta alterar retroativamente as regras, **Then** o sistema alerta que períodos fechados são imutáveis.
4. **Given** o rateio calculado, **When** o gestor gera o comprovante de rateio para um cooperado, **Then** o documento mostra o período, regras aplicadas, valor individual e valor total da cooperativa no período.

---

### User Story 10 — Controle de EPIs e Presença Opcional (Priority: P10)

O gestor registra a entrega de EPIs para cooperados, com tipo, data e assinatura de recebimento. O controle de presença pode ser ativado opcionalmente pela gestão; quando ativado, registra presença diária dos cooperados por turno.

**Why this priority**: EPIs são requisito legal e operacional para a cooperativa. Presença é opcional mas importante para cooperativas que vinculam presença ao rateio ou a benefícios.

**Independent Test**: É possível registrar entrega de 1 par de luvas e 1 par de botas para um cooperado, gerar o termo de EPI, e ativar o controle de presença para que o operador registre a presença diária.

**Acceptance Scenarios**:

1. **Given** o gestor, **When** registra entrega de EPI para um cooperado com tipo e data, **Then** o registro fica vinculado ao cooperado e o termo de EPI pode ser emitido.
2. **Given** controle de presença desativado, **When** o gestor ativa o módulo nas configurações, **Then** o módulo de presença aparece no menu e operadores podem registrar presença.
3. **Given** presença habilitada, **When** o operador registra a presença de 10 cooperados em um turno, **Then** os registros ficam disponíveis para relatório e, se configurado, para o cálculo de rateio.
4. **Given** cooperativa sem interesse em presença, **When** o módulo está desativado, **Then** a presença não aparece em nenhum menu e não impacta nenhum fluxo.

---

### User Story 11 — Gestão de Veículos (Priority: P11)

O gestor cadastra veículos e registra abastecimentos, manutenções e custos operacionais. Os custos de veículo são lançados automaticamente no financeiro no centro de custo "Logística".

**Why this priority**: Veículos representam custo operacional relevante para a cooperativa. Sem rastreamento, o custo real da coleta fica invisível.

**Independent Test**: É possível registrar um abastecimento de R$ 150,00 para o veículo "ABC-1234", verificar que o lançamento financeiro foi criado no centro de custo correto e que o histórico do veículo mostra o abastecimento.

**Acceptance Scenarios**:

1. **Given** o veículo cadastrado, **When** o motorista registra abastecimento com litros, valor e posto, **Then** o custo é lançado no financeiro e vinculado ao veículo.
2. **Given** uma manutenção preventiva registrada, **When** o gestor acessa o histórico do veículo, **Then** vê todos os custos de manutenção com data, tipo e valor.
3. **Given** vários veículos, **When** o gestor acessa o relatório de custo por veículo no período, **Then** vê o custo total de cada veículo separado por abastecimento e manutenção.

---

### User Story 12 — Documentos Operacionais e Relatórios (Priority: P12)

O sistema emite documentos operacionais: recibo de compra de material, romaneio de entrega para comprador, comprovante de entrega, termo de recebimento de EPI e relatórios gerenciais. Todos os documentos devem estar disponíveis para impressão e download em PDF.

**Why this priority**: Documentos são necessários para operação diária, rastreabilidade e conformidade. Relatórios transformam os dados em inteligência para a gestão.

**Independent Test**: É possível emitir um romaneio de uma venda, um termo de EPI de um cooperado e um relatório de resultado mensal, todos em PDF, sem erros.

**Acceptance Scenarios**:

1. **Given** uma venda confirmada, **When** o gestor clica em "emitir romaneio", **Then** o documento é gerado em PDF com dados da cooperativa, comprador, materiais, quantidades e data.
2. **Given** entrega de EPI registrada, **When** o gestor emite o termo, **Then** o documento mostra cooperado, tipo de EPI, data de entrega e campo de assinatura.
3. **Given** período fechado, **When** o gestor gera relatório de resultado, **Then** o relatório mostra receita de vendas, custos operacionais, resultado líquido e rateio por cooperado.
4. **Given** o gestor no módulo de relatórios, **When** filtra por rota de coleta no período, **Then** vê a rentabilidade por rota (custo vs. receita dos materiais coletados).

---

### User Story 13 — Dashboard com Indicadores Estratégicos (Priority: P13)

Ao fazer login, o gestor vê um dashboard com os principais indicadores da cooperativa: estoque atual por material, vendas do período, receita, custos, próximas contas a vencer e alertas operacionais.

**Why this priority**: O dashboard é a porta de entrada para a gestão diária. Indicadores visíveis reduzem tempo de navegação e aumentam a capacidade de reação a problemas.

**Independent Test**: É possível fazer login como gestor, visualizar o dashboard com saldo de estoque de pelo menos 3 materiais, total de vendas do mês corrente e contas a vencer nos próximos 7 dias, todos atualizados em tempo real.

**Acceptance Scenarios**:

1. **Given** o gestor logado, **When** acessa o dashboard, **Then** vê o estoque atual de material pronto por categoria, receita do mês e resultado parcial.
2. **Given** uma conta a pagar com vencimento em 3 dias, **When** o gestor acessa o dashboard, **Then** um alerta de "contas a vencer" aparece em destaque.
3. **Given** perfil de cooperado (não gestor) logado, **When** acessa o dashboard, **Then** vê somente indicadores permitidos para seu perfil (ex.: seu próprio rateio, EPI pendente, presença do mês).

---

### Edge Cases

- O que acontece quando uma rota é encerrada sem que todos os pontos sejam coletados? O sistema deve registrar os pontos não visitados como "não coletado" com justificativa obrigatória.
- O que acontece quando o material de uma triagem é maior que o material bruto disponível em estoque? O sistema DEVE bloquear o registro e indicar o saldo real.
- O que acontece quando uma conta a pagar já vencida não é paga? O sistema deve mantê-la visível com status "vencida" e destacá-la nos relatórios.
- O que acontece quando as regras de rateio somam percentuais que não totalizam 100%? O sistema DEVE bloquear a ativação das regras com validação clara.
- O que acontece se um cooperado for desativado com rateio pendente de períodos anteriores? O sistema DEVE manter o histórico de rateio vinculado ao cooperado inativo.
- O que acontece quando dois operadores tentam registrar triagem do mesmo lote simultaneamente? Como a reserva ocorre no ato de abertura, o segundo operador receberá saldo disponível já reduzido pela primeira reserva. Se o saldo disponível for zero para o material solicitado, a abertura é bloqueada com indicação do saldo atual e do motivo (em triagem).
- O que acontece quando uma sessão de triagem aberta fica sem responsável (triador sai sem encerrar)? A sessão permanece aberta e o material permanece reservado. O gestor deve poder cancelar sessões abertas há mais de X horas (configurável), com auditoria.
- O que acontece quando o gestor ajusta manualmente a origem dos lotes em uma triagem aberta? O ajuste deve gerar registro de auditoria com o lote original selecionado por FIFO e o lote escolhido manualmente, com justificativa.
- O que acontece quando rejeito está "disponível" e a cooperativa decide que não tem mais valor comercial? O gestor pode transitar o item diretamente para "destinado para descarte", com registro de decisão e responsável.
- O que acontece com rejeito "gerado" que nunca é movido para "disponível"? O dashboard deve alertar itens de rejeito sem destinação definida após X dias (configurável).
- O que acontece se o descarte de rejeito gerar custo mas não houver centro de custo vinculado? O sistema deve exigir centro de custo no lançamento do custo de descarte (campo obrigatório).

---

## Requirements *(mandatory)*

### Functional Requirements

**Fundação e Autenticação**

- **FR-001**: O sistema DEVE permitir o cadastro inicial de uma cooperativa com dados institucionais (nome, CNPJ, endereço, contato, logotipo).
- **FR-002**: O sistema DEVE permitir login individual com e-mail e senha. Senhas DEVEM ser armazenadas com hash seguro.
- **FR-003**: O sistema DEVE implementar um único sistema de autenticação para todos os tipos de usuário. Perfis configuráveis: Administrador, Gestor, Triador, Motorista, Cooperado, Comprador. Cada perfil tem conjunto de permissões padrão editável. Compradores existem na mesma tabela de usuários, vinculados à entidade Comprador.
- **FR-004**: Toda verificação de permissão DEVE ocorrer no backend. O frontend pode ocultar elementos não autorizados, mas isso NÃO substitui validação server-side.
- **FR-005**: O sistema DEVE permitir ativar e desativar usuários sem excluir seus registros históricos.

**Cadastros Base (Dados Mestres)**

- **FR-006**: O sistema DEVE permitir cadastrar compradores com CNPJ/CPF, razão social, contato e endereço, com criação de acesso ao portal do comprador opcional.
- **FR-007**: O sistema DEVE permitir cadastrar categorias e subcategorias de materiais de forma hierárquica e configurável pela gestão.
- **FR-008**: O sistema DEVE permitir cadastrar unidades de medida (kg, ton, fardo, bag, saco, unidade, m³ e outras configuráveis), com fator de conversão para kg quando aplicável.
- **FR-009**: O sistema DEVE bloquear exclusão de materiais, categorias, compradores ou unidades com movimentações ou registros vinculados.
- **FR-010**: O sistema DEVE permitir cadastrar veículos com placa, modelo, ano, capacidade e motorista responsável.

**Rotas de Coleta**

- **FR-011**: O sistema DEVE permitir cadastrar rotas de coleta com nome, data prevista, veículo, motorista, cooperados envolvidos, custo estimado e pontos de parada. Cada ponto de parada DEVE ter: endereço, referência textual e coordenadas geográficas (informadas manualmente ou obtidas via geocoding do endereço).
- **FR-011a**: Ao montar uma rota com múltiplos pontos, o sistema DEVE sugerir uma sequência otimizada dos pontos (baseada em distância/proximidade). O gestor DEVE poder reordenar os pontos manualmente antes de confirmar a rota. O sistema DEVE registrar a distância total estimada do trajeto.
- **FR-011b**: O sistema DEVE manter histórico comparativo por rota: sequência planejada vs. sequência executada, pontos coletados vs. não coletados, materiais previstos vs. materiais efetivamente coletados.
- **FR-012**: O sistema DEVE exibir as rotas e seus pontos de coleta em mapa interativo, com: (1) marcadores de cada ponto posicionados por coordenadas ou geocoding de endereço, (2) linha visual do trajeto sugerido conectando os pontos na ordem definida, (3) distinção visual entre pontos pendentes, coletados e não coletados durante a execução.
- **FR-013**: O sistema DEVE permitir iniciar a execução de uma rota, registrar coleta em cada ponto (material, quantidade, unidade) e encerrar a rota.
- **FR-014**: Ao encerrar uma rota, o sistema DEVE criar automaticamente eventos de entrada no estoque bruto para cada material coletado, vinculados à rota e ao ponto de origem.
- **FR-015**: Pontos não visitados ao encerrar a rota DEVEM ser marcados como "não coletado" com campo de justificativa obrigatório.

**Estoque de Material Bruto**

- **FR-016**: O sistema DEVE registrar toda alteração de estoque bruto por meio de evento explícito: entrada (coleta, doação, compra), ajuste, descarte ou transferência para triagem.
- **FR-017**: Cada evento de movimentação DEVE registrar: data/hora, responsável, tipo de evento, material, quantidade, unidade e origem.
- **FR-018**: O sistema DEVE impedir qualquer alteração direta de saldo. O saldo é sempre calculado a partir dos eventos.

**Triagem**

- **FR-019**: O sistema DEVE permitir abrir uma sessão de triagem informando material e quantidade. No ato de abertura, o sistema DEVE reservar/bloquear imediatamente a quantidade informada no estoque bruto, impedindo uso concorrente desse saldo por outra triagem.
- **FR-019a**: A reserva DEVE ser vinculada a eventos de entrada específicos. O sistema DEVE selecionar automaticamente as entradas de origem usando critério **FIFO** (entradas mais antigas consumidas primeiro). Um gestor ou operador autorizado PODE ajustar manualmente a origem, com registro de auditoria do ajuste.
- **FR-019b**: O estoque bruto DEVE exibir três saldos por material: (1) **saldo total bruto** (todos os eventos de entrada), (2) **saldo reservado/em triagem** (bloqueado por sessões abertas), (3) **saldo disponível** (total − reservado), que é o único saldo elegível para nova triagem ou venda.
- **FR-019c**: Uma sessão de triagem PODE ser **cancelada** antes do encerramento. O cancelamento DEVE liberar a reserva e retornar o saldo ao disponível, gerando registro de auditoria com data, hora, responsável e motivo obrigatório.
- **FR-020**: O triador DEVE registrar para cada material da sessão: quantidade reservada (entrada), quantidade separada por subcategoria (saída como material pronto), quantidade de rejeito e quantidade de perda. **Rejeito** e **perda** são estados distintos: rejeito tem potencial de reaproveitamento (comercial ou destinação) e vai para o estoque de rejeito; perda é material sem aproveitamento possível e gera baixa imediata com justificativa obrigatória. A soma de saídas (material pronto + rejeito + perda) DEVE reconciliar com a quantidade reservada.
- **FR-021**: O sistema DEVE bloquear o encerramento da triagem se a soma de saídas (material pronto + rejeito + perda/descarte) for diferente da quantidade reservada. Somente um operador com permissão explícita de "ajuste de triagem" pode encerrar com divergência, mediante justificativa obrigatória e registro de auditoria imutável.
- **FR-022**: Ao encerrar a triagem, o sistema DEVE, em operação atômica: (1) converter a reserva em baixa definitiva do estoque bruto, (2) criar eventos de entrada no estoque de material pronto para cada subcategoria aprovada, (3) criar eventos de entrada no estoque de rejeito para a quantidade de rejeito declarada (status inicial: "gerado"), (4) registrar baixa imediata para a quantidade de perda com justificativa.
- **FR-022a**: O estoque de rejeito DEVE registrar por item: material ou tipo de rejeito, quantidade, unidade, origem (sessão de triagem), data de geração, responsável, status atual, comprador (quando vendido) e destino final (quando descartado), com observação de destinação quando aplicável.
- **FR-022b**: O sistema DEVE permitir os seguintes estados para itens de rejeito e as transições correspondentes: **gerado** → **disponível** → **reservado para venda** → **vendido**; ou **disponível** → **destinado para descarte** → **descartado**. O gestor pode mover itens entre estados com registro de responsável e data.
- **FR-022c**: A venda de rejeito DEVE seguir o mesmo fluxo de venda de material pronto (FR-026 a FR-030), gerando conta a receber e lançamento financeiro vinculados à operação. O descarte de rejeito PODE gerar custo (quando há despesa de transporte, taxa ou serviço), que DEVE ser lançado no financeiro com vinculação ao evento de descarte.
- **FR-023**: Uma sessão de triagem encerrada DEVE ser imutável (somente leitura). Somente sessões com status "aberta" podem ser canceladas ou modificadas.

**Estoque de Material Pronto**

- **FR-024**: O estoque de material pronto DEVE seguir as mesmas regras de imutabilidade por evento do estoque bruto (FR-016 a FR-018).
- **FR-025**: O sistema DEVE exibir o saldo atual de material pronto por subcategoria com data da última movimentação.

**Venda e Saída**

- **FR-026**: O sistema DEVE permitir registrar uma venda com: comprador, materiais, quantidades, unidades, preço unitário e data.
- **FR-027**: O sistema DEVE bloquear venda com quantidade superior ao saldo disponível no estoque de material pronto.
- **FR-028**: Ao registrar uma venda, o sistema DEVE criar automaticamente uma conta a receber vinculada à venda.
- **FR-029**: O sistema DEVE permitir confirmar a saída física do material, alterando o status da venda para "entregue".
- **FR-030**: O sistema DEVE permitir registrar o pagamento do comprador, baixando a conta a receber e registrando o lançamento no fluxo de caixa.

**Portal do Comprador**

- **FR-031**: O comprador DEVE ter acesso a um portal próprio com login individual. Após autenticação, o sistema DEVE identificar o perfil do usuário e redirecionar automaticamente: perfil "Comprador" → portal do comprador; demais perfis → área administrativa/operacional. O portal exibe apenas as vendas, romaneios e documentos vinculados ao comprador autenticado.
- **FR-032**: O comprador DEVE poder confirmar o recebimento de uma entrega pelo portal.
- **FR-033**: O comprador NÃO DEVE ter acesso a dados de outros compradores, ao financeiro interno, ao estoque ou a dados de cooperados.

**Financeiro**

- **FR-034**: O sistema DEVE manter um fluxo de caixa com lançamentos de entrada e saída, saldo previsto e realizado.
- **FR-035**: O sistema DEVE permitir lançar contas a pagar com: descrição, valor, vencimento, centro de custo e comprovante opcional.
- **FR-036**: O sistema DEVE permitir lançar contas a receber manualmente ou vinculadas a vendas.
- **FR-037**: O sistema DEVE suportar centros de custo configuráveis para categorizar lançamentos financeiros.
- **FR-038**: Todo lançamento DEVE registrar: data, valor, tipo (entrada/saída), centro de custo, responsável e origem (manual ou vinculado a operação).
- **FR-039**: O sistema DEVE alertar contas a pagar vencidas e a vencer nos próximos 7 dias no dashboard.

**Rateio**

- **FR-040**: O sistema DEVE permitir configurar regras de rateio com critérios ponderáveis: participação igualitária, proporção por peso triado, por presença (se módulo ativo) e combinações percentuais.
- **FR-040a**: A base do valor total a ser rateado DEVE ser configurável pela gestão com três opções: (1) **resultado líquido do período** (receita de vendas − custos/despesas operacionais vinculados ao mesmo período) — opção padrão; (2) **receita bruta de vendas do período**; (3) **valor manual** definido pelo gestor. A configuração padrão de uma nova instância DEVE ser resultado líquido.
- **FR-040b**: Quando a base for **valor manual**, o sistema DEVE exigir justificativa textual obrigatória, registrar a decisão com data, hora e responsável, e manter histórico imutável da decisão para auditoria.
- **FR-041**: A soma dos percentuais de critérios de uma regra de rateio DEVE sempre totalizar 100%. O sistema DEVE bloquear ativação de regras inválidas.
- **FR-042**: O sistema DEVE calcular o rateio por período fechado, com detalhamento por cooperado e por critério aplicado.
- **FR-042a**: Ao fechar um período de rateio, o sistema DEVE congelar (snapshot imutável) os seguintes valores: base de cálculo utilizada, valor total do período, receita de vendas, custos deduzidos (se base líquida), regras vigentes e resultado individual por cooperado.
- **FR-043**: Períodos de rateio fechados DEVEM ser imutáveis. Mudanças de regra ou de base de cálculo só valem para períodos futuros.
- **FR-044**: O sistema DEVE gerar comprovante de rateio individual por cooperado com detalhamento completo do cálculo, incluindo: período, base utilizada, valor total, critérios aplicados, participação individual e valor resultante.

**EPIs e Presença**

- **FR-045**: O sistema DEVE permitir registrar entrega de EPI por cooperado com: tipo de EPI, data, quantidade e responsável pelo registro.
- **FR-046**: O sistema DEVE gerar termo de recebimento de EPI para impressão/assinatura.
- **FR-047**: O módulo de presença DEVE ser configurável pela gestão: pode ser ativado ou desativado sem impactar outros módulos.
- **FR-048**: Quando ativo, o módulo de presença DEVE permitir registrar presença/ausência diária por cooperado e turno.

**Veículos**

- **FR-049**: O sistema DEVE permitir registrar abastecimentos de veículos com data, litros, valor total, posto e motorista.
- **FR-050**: O sistema DEVE permitir registrar manutenções com data, tipo, descrição, valor e fornecedor.
- **FR-051**: Todo custo de veículo DEVE gerar automaticamente um lançamento financeiro no centro de custo "Logística" (ou centro de custo configurado para veículos).

**Documentos**

- **FR-052**: O sistema DEVE gerar recibo de compra/entrada de material em PDF.
- **FR-053**: O sistema DEVE gerar romaneio de entrega em PDF com dados do comprador, materiais e quantidades.
- **FR-054**: O sistema DEVE gerar comprovante de entrega em PDF para assinatura do comprador.
- **FR-055**: O sistema DEVE gerar termo de recebimento de EPI em PDF para assinatura do cooperado.
- **FR-056**: O sistema DEVE gerar relatório de resultado do período com receita, custos, resultado líquido e rateio por cooperado.
- **FR-057**: O sistema DEVE gerar relatório de estoque atual com saldo por material e movimentações do período.

**Dashboard**

- **FR-058**: O dashboard DEVE exibir, para o perfil gestor: saldo de estoque de material pronto por categoria, receita do mês, resultado parcial, próximas contas a vencer e alertas operacionais.
- **FR-059**: O conteúdo do dashboard DEVE ser filtrado pelo perfil do usuário — cooperados veem apenas informações próprias (rateio, EPI, presença).

### Key Entities

- **Cooperativa**: Dados institucionais, configurações globais, logotipo.
- **Usuário**: Entidade base de autenticação compartilhada por todos os tipos (internos, cooperados, compradores). Dados: e-mail, senha (hash), perfil, status (ativo/inativo), vínculo com Cooperado ou Comprador quando aplicável.
- **Perfil de Acesso**: Nome do perfil, conjunto de permissões por módulo. O perfil determina o redirecionamento pós-login (área operacional ou portal do comprador).
- **Comprador**: Dados cadastrais (CNPJ/CPF, razão social, contato, endereço), vínculo com Usuário para acesso ao portal, histórico de compras.
- **Categoria de Material**: Hierarquia categoria → subcategoria, descrição.
- **Unidade de Medida**: Nome, símbolo, fator de conversão para kg (opcional).
- **Veículo**: Placa, modelo, ano, capacidade, motorista responsável, histórico de custos.
- **Rota de Coleta**: Nome, data prevista, veículo, motorista, cooperados envolvidos, custo estimado, distância estimada, sequência de pontos (planejada e executada), status (planejada, em execução, encerrada).
- **Ponto de Coleta**: Endereço, referência textual, coordenadas (informadas ou obtidas por geocoding), ordem na rota, status de execução (pendente, coletado, não coletado), justificativa quando não coletado, registros de coleta por material.
- **Evento de Movimentação de Estoque**: Tipo (entrada, reserva-triagem, cancelamento-triagem, baixa-triagem, venda, ajuste, perda, rejeito, descarte), material, quantidade, unidade, data/hora, responsável, origem, referência à sessão de triagem ou venda quando aplicável.
- **Estoque Bruto**: Saldo calculado a partir dos eventos. Expõe três visões por material: saldo total, saldo reservado (bloqueado por sessões abertas), saldo disponível (total − reservado). Não editável diretamente.
- **Estoque Pronto**: Saldo calculado a partir dos eventos de entrada pós-triagem e saídas de venda. Não editável diretamente.
- **Estoque de Rejeito**: Estoque separado gerado pelas sessões de triagem. Cada item rastreia: material/tipo, quantidade, unidade, sessão de origem, data, responsável, status (gerado → disponível → reservado para venda → vendido / destinado para descarte → descartado), comprador (quando vendido), destino final e observação (quando descartado). Não editável diretamente — movimentado por eventos de status.
- **Sessão de Triagem**: Material, quantidade reservada, lotes de origem (eventos de entrada selecionados por FIFO ou ajuste manual), itens triados (material pronto por subcategoria, rejeito, perda/descarte), triador, data/hora de abertura e encerramento, status (aberta, encerrada, cancelada).
- **Venda**: Comprador, itens (material, quantidade, preço), status (registrada, entregue, paga).
- **Lançamento Financeiro**: Tipo (entrada/saída), valor, data, centro de custo, origem (manual/operação), responsável.
- **Conta a Pagar / Conta a Receber**: Descrição, valor, vencimento, status, comprovante, vinculação a operação.
- **Centro de Custo**: Nome, descrição, tipo.
- **Regra de Rateio**: Critérios ponderados, base de cálculo configurável (resultado líquido / receita bruta / valor manual), versão, vigência.
- **Período de Rateio**: Datas de competência, regras aplicadas, base utilizada, snapshot imutável dos valores (receita, custos, total distribuído), valor por cooperado, status (aberto, fechado), justificativa (obrigatória quando base = valor manual).
- **Entrega de EPI**: Cooperado, tipo de EPI, quantidade, data, responsável.
- **Registro de Presença**: Cooperado, data, turno, status (presente, ausente, justificado).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um operador sem treinamento técnico consegue registrar uma entrada de material bruto e iniciar uma sessão de triagem em menos de 3 minutos na primeira tentativa.
- **SC-002**: O gestor consegue gerar o cálculo de rateio de um período fechado com 20 cooperados em menos de 30 segundos.
- **SC-003**: Todos os documentos operacionais (romaneio, recibo, comprovante de entrega, termo de EPI) são gerados e disponibilizados para download em menos de 10 segundos após a solicitação.
- **SC-004**: O saldo de estoque exibido na tela corresponde ao estado real em 100% dos casos — zero discrepâncias entre saldo calculado e eventos registrados.
- **SC-005**: O fluxo de caixa previsto e realizado é acessível pelo gestor com dados do mês corrente em menos de 5 segundos após login.
- **SC-006**: O portal do comprador carrega o histórico de compras em menos de 5 segundos, sem expor dados de outros compradores.
- **SC-007**: Qualquer tentativa de acesso não autorizado a dados protegidos (dados de outro comprador, financeiro interno, rateio) é bloqueada com 100% de confiabilidade, independente do canal de acesso.
- **SC-008**: O relatório de rentabilidade por rota de coleta e por material está disponível para o gestor sem necessidade de exportar dados para planilhas.

---

## Assumptions

- Usuários acessam o sistema via navegador web (desktop e mobile responsivo). Aplicativo mobile nativo é integração futura.
- Cada instalação do sistema serve uma única cooperativa. Multi-tenancy está fora do escopo do MVP.
- O lançamento de pesagens é manual no MVP. Integração com balança digital será preparada via ponto de extensão, mas não implementada.
- Nota fiscal eletrônica está fora do escopo do MVP. Integração futura.
- Integração bancária automática para conciliação está fora do escopo do MVP. Conciliação é manual no MVP.
- Inteligência artificial preditiva (demanda, rotas ótimas) está fora do escopo do MVP.
- A cooperativa possui acesso à internet para uso do sistema e exibição de mapas.
- O rateio padrão configura-se no nível de cooperado ativo na cooperativa. Cooperados de outras cooperativas ficam fora do escopo.
- Relatórios são exportáveis em PDF. Exportação em formatos de planilha (XLSX/CSV) é desejável mas não bloqueante para o MVP.
- Todos os dados financeiros são em Reais (BRL). Multi-moeda está fora do escopo.
- O controle de presença, quando ativado, vincula-se ao rateio apenas se explicitamente configurado nas regras de rateio da cooperativa.

---

## Integrações Futuras (Fora do Escopo do MVP)

As seguintes integrações são documentadas para guiar decisões de arquitetura no MVP, mas NÃO DEVEM ser implementadas:

- **Balança digital**: Integração por porta serial ou rede local para lançamento automático de pesagens. O MVP deve expor ponto de extensão (interface de lançamento de pesagem) para facilitar a futura integração.
- **Nota fiscal eletrônica (NF-e)**: Emissão de documentos fiscais via SEFAZ. O MVP deve manter estrutura de venda que permita futura inclusão de campos fiscais.
- **Integração bancária automática**: Importação de extratos e conciliação automática de contas a pagar/receber.
- **Inteligência artificial preditiva**: Previsão de volume de coleta, sugestão de rotas ótimas, alerta de anomalias financeiras.
- **Aplicativo mobile nativo**: App iOS/Android para motoristas e triadores em campo.
- **Rastreamento GPS em tempo real**: Acompanhamento da posição do motorista durante a execução da rota. Depende de app mobile nativo ou dispositivo de rastreamento dedicado. O MVP registra a rota planejada e o resultado executado, mas não rastreia posição em tempo real.
