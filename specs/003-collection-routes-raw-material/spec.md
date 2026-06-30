# Feature Specification: Fase 3 — Coleta, Rotas e Entrada de Material Bruto

**Feature Branch**: `003-collection-routes-raw-material`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Fase 3 do EcoCoop: planejamento de coletas, rotas de coleta, pontos de coleta, execução da rota e entrada manual de material bruto."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cadastrar e visualizar pontos de coleta no mapa (Priority: P1)

Como gestor (MANAGER ou ADMIN), quero cadastrar pontos de coleta com endereço e visualizá-los em um mapa, para poder organizar rotas eficientes.

**Why this priority**: Os pontos de coleta são a base de todo o fluxo operacional da Fase 3. Sem eles não há como criar rotas, planejar execução ou registrar coleta.

**Independent Test**: Pode ser testado independentemente criando um ponto de coleta via API/UI e confirmando que o endereço é geocodificado e o ponto aparece no mapa na listagem.

**Acceptance Scenarios**:

1. **Given** um gestor autenticado, **When** ele acessa a listagem de pontos de coleta, **Then** vê a lista com paginação, busca por nome/endereço e filtro de status (ativo/inativo).
2. **Given** um gestor autenticado, **When** ele cria um ponto de coleta com nome e endereço válidos, **Then** o ponto é salvo, recebe coordenadas geográficas e aparece no mapa.
3. **Given** um gestor autenticado, **When** ele cria um ponto com nome duplicado ou endereço em branco, **Then** recebe mensagem de erro clara e o ponto não é salvo.
4. **Given** um gestor autenticado, **When** ele inativa um ponto de coleta, **Then** o ponto deixa de aparecer na seleção de rotas novas, mas permanece visível no histórico de rotas existentes.
5. **Given** um usuário DRIVER autenticado, **When** ele tenta criar ou editar um ponto de coleta, **Then** recebe HTTP 403.
6. **Given** um usuário SORTER autenticado, **When** ele tenta acessar pontos de coleta, **Then** recebe HTTP 403.

---

### User Story 2 — Planejar rota de coleta com múltiplos pontos (Priority: P1)

Como gestor, quero criar uma rota de coleta associando múltiplos pontos de coleta, definir a sequência, atribuir veículo, motorista e equipe, para garantir que a operação de campo seja executada de forma organizada.

**Why this priority**: A rota é o objeto central da Fase 3. É ela que conecta pontos de coleta, equipe, veículo e a execução operacional.

**Independent Test**: Pode ser testado criando uma rota com pelo menos dois pontos e verificando que a rota é salva com status "planejada", equipe atribuída e sequência definida.

**Acceptance Scenarios**:

1. **Given** um gestor autenticado com pontos de coleta cadastrados, **When** ele cria uma rota com nome, data prevista, veículo, motorista e ao menos um ponto de coleta, **Then** a rota é salva com status `PLANEJADA`.
2. **Given** uma rota em criação, **When** o gestor adiciona múltiplos pontos e solicita sugestão de sequência, **Then** o sistema sugere uma ordem baseada na proximidade geográfica dos pontos.
3. **Given** uma rota `PLANEJADA`, **When** o gestor reordena os pontos manualmente, **Then** a nova sequência é persistida e refletida no mapa.
4. **Given** uma rota `PLANEJADA`, **When** o gestor adiciona membros da equipe de coleta além do motorista, **Then** a equipe fica registrada na rota.
5. **Given** um gestor tentando criar rota sem veículo ou sem motorista, **Then** a rota não é salva e o campo obrigatório ausente é indicado na resposta.
6. **Given** um usuário DRIVER autenticado, **When** ele tenta criar uma rota, **Then** recebe HTTP 403.

---

### User Story 3 — Iniciar e concluir execução da rota (Priority: P1)

Como motorista (DRIVER) atribuído à rota, quero registrar o início e a conclusão da rota, para que a gestão saiba o status real da operação em campo.

**Why this priority**: Sem o controle de estado da rota, não há como disparar a entrada de material bruto nem auditar o que foi executado.

**Independent Test**: Pode ser testado transitando uma rota de `PLANEJADA` → `EM_ANDAMENTO` → `CONCLUÍDA` e verificando que os estados e timestamps são registrados corretamente.

**Acceptance Scenarios**:

1. **Given** uma rota `PLANEJADA` com motorista X, **When** o motorista X registra início da rota, **Then** o status muda para `EM_ANDAMENTO` e o timestamp de início é registrado.
2. **Given** uma rota `EM_ANDAMENTO`, **When** o motorista registra a conclusão, **Then** o status muda para `CONCLUÍDA` e o timestamp de conclusão é registrado.
3. **Given** uma rota `EM_ANDAMENTO`, **When** o gestor cancela a rota, **Then** o status muda para `CANCELADA` e não permite mais alterações de execução.
4. **Given** uma rota `CONCLUÍDA`, **When** qualquer usuário tenta alterar veículo, equipe ou sequência de pontos, **Then** recebe HTTP 403 (ou erro indicando que rota concluída não é editável sem permissão especial).
5. **Given** uma rota `CANCELADA`, **When** qualquer usuário tenta concluí-la, **Then** recebe erro indicando que rota cancelada não pode ser concluída.
6. **Given** um DRIVER não atribuído à rota, **When** ele tenta registrar início ou conclusão de uma rota que não é sua, **Then** recebe HTTP 403.

---

### User Story 4 — Registrar entrada manual de material bruto (Priority: P1)

Como gestor ou motorista com permissão, quero registrar manualmente o material bruto coletado ao concluir uma rota ou ao registrar coleta em um ponto, para que o estoque de material bruto reflita o que foi trazido do campo.

**Why this priority**: A entrada de material bruto é a razão de existir da coleta. Sem isso, a cooperativa não tem visibilidade do que foi recolhido.

**Independent Test**: Pode ser testado registrando entrada de material bruto em uma rota concluída e verificando que um evento de estoque foi gerado e o saldo bruto foi atualizado.

**Acceptance Scenarios**:

1. **Given** uma rota `CONCLUÍDA` (ou `EM_ANDAMENTO` com ponto concluído), **When** o usuário registra entrada de material bruto com subcategoria, quantidade e unidade de medida, **Then** um evento de estoque do tipo `ENTRADA` é criado e o saldo bruto é recalculado.
2. **Given** uma entrada de material registrada, **When** o sistema processa, **Then** o saldo bruto da subcategoria informada aumenta pela quantidade registrada na unidade correta.
3. **Given** dois registros de entrada para a mesma subcategoria, **When** o usuário consulta saldo bruto, **Then** o saldo é a soma dos eventos, sem alteração direta no saldo.
4. **Given** um usuário tentando registrar entrada de material em uma rota `CANCELADA`, **Then** recebe erro indicando que não é possível registrar entrada em rota cancelada.
5. **Given** uma entrada registrada sem subcategoria ou quantidade, **Then** a entrada não é salva e a validação indica o campo ausente.
6. **Given** um SORTER autenticado com permissão específica de visualização de entradas, **When** ele consulta entradas de material, **Then** visualiza os registros mas não pode criar ou editar.

---

### User Story 5 — Consultar saldo básico de material bruto (Priority: P2)

Como gestor, quero consultar o saldo atual de material bruto por subcategoria e unidade de medida, para ter visibilidade do que está disponível antes da triagem.

**Why this priority**: A consulta de saldo fecha o ciclo de visibilidade da Fase 3 sem exigir triagem, que fica para a Fase 4.

**Independent Test**: Pode ser testado consultando o endpoint de saldo bruto e verificando que o valor retornado corresponde à soma dos eventos de entrada sem eventos de saída.

**Acceptance Scenarios**:

1. **Given** eventos de entrada registrados para subcategoria "PET" em "kg", **When** o gestor consulta o saldo bruto, **Then** vê o total acumulado de kg de PET.
2. **Given** nenhum evento de entrada registrado para uma subcategoria, **When** o gestor consulta o saldo, **Then** o saldo retornado é zero (ou a subcategoria não aparece na listagem).
3. **Given** o saldo calculado, **When** não há novos eventos, **Then** o saldo não muda (imutabilidade — saldo é projeção dos eventos).
4. **Given** um usuário DRIVER autenticado, **When** ele tenta consultar saldo bruto sem permissão específica, **Then** recebe HTTP 403.

---

### User Story 6 — Auditoria de operações mutáveis (Priority: P2)

Como administrador, quero que todas as operações de criação, edição e transição de estado em rotas, pontos de coleta e entradas de material bruto sejam registradas com estado anterior e posterior, para poder auditar qualquer alteração.

**Why this priority**: A auditabilidade é um princípio não negociável da Constituição do EcoCoop (Princípio III).

**Independent Test**: Pode ser testado editando um ponto de coleta e verificando que o registro de auditoria contém `previousState` e `newState` com os valores corretos.

**Acceptance Scenarios**:

1. **Given** um gestor que edita o nome de um ponto de coleta, **When** a edição é salva, **Then** o sistema gera um registro de auditoria com `previousState` contendo o nome antigo e `newState` contendo o nome novo.
2. **Given** uma rota que transita de `PLANEJADA` para `EM_ANDAMENTO`, **When** a transição ocorre, **Then** o registro de auditoria captura o estado anterior e o novo estado com o usuário e timestamp da ação.
3. **Given** uma entrada de material bruto registrada, **When** o sistema persiste, **Then** o evento de estoque é imutável e não pode ser editado ou deletado diretamente.
4. **Given** um administrador consultando o log de auditoria, **When** ele filtra por entidade e período, **Then** vê todos os registros com quem fez, o quê, quando e o estado antes/depois.

---

### Edge Cases

- O que acontece quando o geocoding falha para um endereço informado? O ponto deve ser salvo sem coordenadas, com flag indicando que a localização precisa ser revisada, e o gestor deve ser notificado com mensagem clara.
- O que acontece quando se tenta iniciar uma rota sem veículo ou motorista disponíveis? A rota deve permanecer `PLANEJADA` e a transição deve ser bloqueada com mensagem clara.
- O que acontece quando dois usuários tentam transitar a rota para `EM_ANDAMENTO` simultaneamente? O sistema deve garantir que apenas uma transição seja aceita (idempotência no estado).
- O que acontece quando se registra entrada de material bruto com quantidade zero ou negativa? A validação deve rejeitar com mensagem de erro clara.
- O que acontece quando uma rota planejada tem pontos de coleta inativados após o planejamento? Os pontos inativados devem permanecer na rota existente, mas com indicação visual de inativo.
- O que acontece quando o saldo bruto é consultado para uma subcategoria excluída ou inativada? O saldo histórico deve ser mantido e exibido mesmo para subcategorias inativas.

---

## Requirements *(mandatory)*

### Functional Requirements

**Pontos de Coleta**

- **FR-001**: O sistema DEVE permitir cadastrar pontos de coleta com nome, endereço completo, referência/observação e status (ativo/inativo).
- **FR-002**: O sistema DEVE geocodificar endereços de pontos de coleta através de um provider abstrato, retornando latitude e longitude.
- **FR-003**: O sistema DEVE exibir pontos de coleta em mapa interativo usando Leaflet/OpenStreetMap como implementação inicial.
- **FR-004**: O sistema DEVE permitir busca por nome ou endereço, filtro por status e paginação na listagem de pontos de coleta.
- **FR-005**: O sistema DEVE permitir inativar logicamente pontos de coleta sem deletar registros históricos.
- **FR-006**: O sistema DEVE impedir que DRIVER, SORTER e usuários sem permissão criem ou editem pontos de coleta (HTTP 403).

**Rotas de Coleta**

- **FR-007**: O sistema DEVE permitir cadastrar rotas de coleta com nome, data prevista, veículo, motorista responsável e equipe de coleta.
- **FR-008**: O sistema DEVE permitir associar múltiplos pontos de coleta a uma rota e definir a sequência de visita.
- **FR-009**: O sistema DEVE sugerir uma sequência de pontos baseada na proximidade geográfica entre eles (algoritmo de vizinho mais próximo ou equivalente simples).
- **FR-010**: O sistema DEVE permitir que o gestor reordene manualmente os pontos da rota, persistindo a nova sequência.
- **FR-011**: O sistema DEVE exibir os pontos da rota no mapa com a sequência numerada.
- **FR-012**: O sistema DEVE exigir veículo e motorista para salvar uma rota.
- **FR-013**: O sistema DEVE impedir que DRIVER e SORTER criem ou editem planejamento de rotas (HTTP 403).

**Estados e Execução da Rota**

- **FR-014**: O sistema DEVE gerenciar os estados da rota: `PLANEJADA`, `EM_ANDAMENTO`, `CONCLUÍDA`, `CANCELADA`.
- **FR-015**: O sistema DEVE registrar timestamp de início ao transitar para `EM_ANDAMENTO`.
- **FR-016**: O sistema DEVE registrar timestamp de conclusão ao transitar para `CONCLUÍDA`.
- **FR-017**: O sistema NÃO DEVE permitir transitar uma rota `CANCELADA` para qualquer outro estado.
- **FR-018**: O sistema NÃO DEVE permitir alterar veículo, equipe ou pontos de uma rota `CONCLUÍDA` sem permissão especial de ADMIN.
- **FR-019**: O sistema DEVE permitir que o DRIVER atribuído à rota registre início e conclusão da execução.
- **FR-020**: O sistema DEVE impedir que um DRIVER não atribuído à rota execute ações de execução nela (HTTP 403).

**Entrada de Material Bruto**

- **FR-021**: O sistema DEVE permitir registrar entrada manual de material bruto vinculada a uma rota (`EM_ANDAMENTO` ou `CONCLUÍDA`), informando subcategoria de material, quantidade e unidade de medida.
- **FR-022**: Cada entrada de material bruto DEVE gerar um evento de estoque imutável do tipo `ENTRADA_BRUTO`.
- **FR-023**: O sistema NÃO DEVE permitir alterar saldo de estoque diretamente — o saldo DEVE ser calculado como projeção dos eventos.
- **FR-024**: O sistema DEVE impedir registro de entrada de material bruto em rotas `CANCELADAS`.
- **FR-025**: O sistema DEVE validar que quantidade informada é maior que zero.
- **FR-026**: O sistema DEVE validar que subcategoria e unidade de medida existem e estão ativas no cadastro base.

**Saldo Bruto**

- **FR-027**: O sistema DEVE disponibilizar consulta de saldo bruto por subcategoria e unidade de medida, calculado a partir da soma dos eventos de entrada.
- **FR-028**: O saldo bruto DEVE refletir apenas eventos da Fase 3 (entrada bruta); eventos de triagem e saída ficam para fases futuras.
- **FR-029**: O sistema DEVE retornar saldo zero para subcategorias sem eventos de entrada registrados.

**Auditoria**

- **FR-030**: O sistema DEVE registrar auditoria com `previousState` e `newState` para toda criação, edição ou transição de estado em pontos de coleta, rotas e entradas de material bruto.
- **FR-031**: Registros de auditoria DEVEM ser imutáveis — não podem ser editados ou deletados.
- **FR-032**: O sistema DEVE registrar no audit log o ID do usuário responsável pela ação e o timestamp.

**Permissões (RBAC)**

- **FR-033**: ADMIN DEVE ter acesso completo a todas as operações da Fase 3.
- **FR-034**: MANAGER DEVE poder criar, editar, planejar, cancelar e concluir rotas; criar e editar pontos de coleta; visualizar saldo bruto.
- **FR-035**: DRIVER DEVE poder visualizar rotas atribuídas a si, registrar início e conclusão de execução, e registrar entrada de material bruto quando a rota está `EM_ANDAMENTO` ou `CONCLUÍDA`.
- **FR-036**: SORTER NÃO DEVE ter permissão para criar/editar rotas ou pontos de coleta; PODE visualizar entradas de material bruto se tiver permissão específica atribuída.
- **FR-037**: Todas as verificações de permissão DEVEM ser realizadas no backend, independentemente do frontend.

**Frontend**

- **FR-038**: O sistema DEVE exibir telas responsivas para listagem e cadastro de pontos de coleta, listagem e planejamento de rotas, execução de rota e entrada de material bruto.
- **FR-039**: Listagens DEVEM suportar paginação (`page`, `limit`), busca por texto (`search`) e filtro de status quando aplicável.
- **FR-040**: O mapa DEVE usar uma interface de provider abstrata, com implementação inicial em Leaflet/OpenStreetMap, permitindo troca futura de provider sem refatoração de domínio.
- **FR-041**: Mensagens de erro DEVEM ser claras, orientadas ao usuário e exibidas próximas ao campo ou ação que as originou.

### Key Entities *(include if feature involves data)*

- **PontoDeColeta**: Representa um local de coleta. Atributos: nome, endereço, coordenadas (lat/lng), referência/observação, status (ativo/inativo). Pertence à cooperativa. Aparece em rotas.
- **RotaDeColeta**: Representa o planejamento de uma operação de coleta. Atributos: nome, data prevista, status, timestamps de início/conclusão, veículo, motorista responsável, equipe. Contém uma lista ordenada de pontos.
- **PontoDeRota**: Associação entre rota e ponto de coleta. Atributos: sequência (ordem), observações específicas para aquele ponto naquela rota.
- **EntradaMaterialBruto**: Registro manual de material coletado vinculado a uma rota. Atributos: subcategoria de material, quantidade, unidade de medida, observações, timestamp.
- **EventoEstoqueBruto**: Evento imutável de movimentação de estoque bruto. Atributos: tipo (`ENTRADA_BRUTO`), subcategoria, quantidade, unidade, referência à entrada, timestamp, usuário.
- **SaldoBruto** *(projeção)*: Não é uma entidade persistida. É calculada em tempo de consulta a partir da soma dos eventos de estoque por subcategoria e unidade de medida.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Gestores conseguem criar um ponto de coleta com endereço e visualizá-lo no mapa em menos de 2 minutos.
- **SC-002**: Gestores conseguem criar uma rota com múltiplos pontos, veículo e equipe em menos de 5 minutos.
- **SC-003**: A sugestão automática de sequência de pontos é gerada em menos de 3 segundos para rotas com até 20 pontos.
- **SC-004**: Motoristas conseguem registrar início, execução e conclusão de rota em menos de 3 passos por ação.
- **SC-005**: A entrada de material bruto é registrada e o saldo é atualizado em menos de 2 segundos após confirmação.
- **SC-006**: Toda tentativa de acesso não autorizado resulta em HTTP 403 sem vazar informações do recurso acessado.
- **SC-007**: 100% das operações mutáveis (criação, edição, transição de estado) geram registro de auditoria com `previousState` e `newState`.
- **SC-008**: O saldo bruto consultado após múltiplas entradas é sempre igual à soma dos eventos de entrada — sem exceções.
- **SC-009**: A interface é utilizável em telas de 320px de largura (mobile) e 1280px (desktop) sem elementos sobrepostos ou inacessíveis.
- **SC-010**: Fluxos críticos (criar rota, registrar execução, registrar entrada de material) completáveis em no máximo 3 passos de interação.

---

## Assumptions

- Os dados de cooperados, veículos, subcategorias de material e unidades de medida já existem no banco (cadastrados na Fase 2) e estão disponíveis para seleção na Fase 3.
- A autenticação e o RBAC base (roles ADMIN, MANAGER, DRIVER, SORTER) já existem da Fase 1 e serão estendidos com as novas permissões específicas da Fase 3.
- Geocoding será abstraído por uma interface de provider no backend; a implementação inicial usará um serviço de geocoding de código aberto ou gratuito (ex.: Nominatim/OpenStreetMap). O sistema deve salvar o ponto mesmo se o geocoding falhar, marcando as coordenadas como pendentes.
- A sugestão de sequência de rota usará um algoritmo simples de vizinho mais próximo (nearest neighbor) como implementação inicial — não um solver de rota ótima (TSP). A eficiência da sugestão pode ser melhorada em fase futura.
- A execução da rota não inclui rastreamento GPS em tempo real — registra-se apenas os timestamps de início e conclusão.
- O saldo bruto é calculado sob demanda (ou com cache simples) a partir dos eventos; não há tabela de saldo persistida. Fases futuras podem adicionar materialização de saldo se necessário por performance.
- Entradas de material bruto podem ser registradas tanto durante a execução (`EM_ANDAMENTO`) quanto ao concluir a rota (`CONCLUÍDA`), permitindo flexibilidade operacional.
- A equipe de coleta é registrada como membros associados à rota, mas o controle de presença/frequência é fora do escopo desta fase.
- Não há integração com aplicativo mobile nativo; o frontend responsivo em navegador é suficiente para esta fase.
- Os testes de integração cobrirão backend (API) ponta a ponta; testes de componente frontend são desejáveis mas não obrigatórios nesta fase.

---

## Out of Scope

As seguintes funcionalidades foram explicitamente excluídas desta fase:

- Triagem de material
- Estoque de material pronto
- Estoque de rejeito
- Venda de material
- Módulo financeiro completo
- Rateio de ganhos
- Emissão de documentos PDF
- Relatórios avançados e inteligência estratégica
- GPS em tempo real ou rastreamento de frota
- Aplicativo mobile nativo
- Integração com balança digital
- Controle de presença/frequência de cooperados
- Portal do comprador
