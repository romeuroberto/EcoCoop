# Feature Specification: Fase 2 — Cadastros Base Operacionais

**Feature Branch**: `002-operational-base-data`

**Created**: 2026-06-29

**Status**: Draft

---

## Contexto

A Fase 1 (Fundação) está implementada e validada. Ela entregou: monorepo, backend NestJS, frontend React/Vite, PostgreSQL, Prisma, autenticação JWT com refresh token, RBAC, usuários, perfis, permissões, cooperativa, configurações, audit log, seed inicial, login e dashboard básico.

A Fase 2 implementa os **cadastros mestres** necessários para preparar o sistema para as fases futuras de coleta, estoque, triagem, vendas, financeiro e rateio. Nenhuma operação transacional é implementada nesta fase — apenas os registros de referência que as operações futuras irão consumir.

---

## Clarifications

### Session 2026-06-29

- Q: Qual é o nível de acesso do MANAGER nos novos módulos da Fase 2? → A: MANAGER tem CRUD (criar, editar, listar, inativar) em cooperados, compradores e veículos; apenas READ em materiais, unidades de medida, tipos de EPI e centros de custo. ADMIN tem CRUD completo em todos os módulos da Fase 2. Justificativa: materiais, unidades, tipos de EPI e centros de custo são cadastros estruturais que afetam estoque, financeiro, rateio e relatórios futuros — somente ADMIN deve alterá-los para reduzir risco de inconsistência.
- Q: As telas de listagem devem ter busca por texto e filtro por status? → A: Sim. Por padrão as listagens exibem apenas registros ativos. O usuário pode alternar o filtro para ativos, inativos ou todos. Busca case-insensitive por campos principais de cada entidade (cooperados: nome/CPF/telefone/e-mail; compradores: razão social/CPF-CNPJ/telefone/e-mail; veículos: placa/modelo/tipo; materiais: nome/categoria; unidades: nome/símbolo; funções: nome; EPI: nome; centros de custo: nome/código). Sem resultados → mensagem clara. Sem filtros avançados, exportação ou relatórios nesta fase.
- Q: Como a capacidade do veículo deve ser armazenada? → A: Estruturada com três campos opcionais: `capacityValue` (número), `capacityUnitId` (FK para UnitOfMeasure ativa) e `capacityNotes` (texto livre opcional). Se `capacityValue` for informado, `capacityUnitId` também é obrigatório. Apenas unidades ativas podem ser usadas em novos cadastros. Veículos já cadastrados preservam referência a unidades inativadas posteriormente. Nesta fase, a capacidade é apenas informativa — sem cálculos de carga, conversões ou validações operacionais.
- Q: Quando uma categoria de material é inativada, o que ocorre com suas subcategorias ativas? → A: O sistema bloqueia a inativação da categoria se ela tiver subcategorias ativas. O usuário recebe mensagem clara indicando quais subcategorias precisam ser inativadas primeiro. Categoria sem subcategorias ativas pode ser inativada livremente. Nenhuma inativação em cascata automática ocorre na Fase 2. Subcategorias inativas permanecem vinculadas à categoria para preservação histórica.
- Q: Como a função do cooperado deve ser armazenada e validada? → A: Entidade própria `MemberRole` (funções de cooperado), gerenciada pelo ADMIN (CRUD); MANAGER tem apenas READ. O sistema inicia com funções padrão: triador, motorista, cooperado geral, coordenador, outro. Cada cooperado deve estar vinculado a uma função ativa. Funções inativas não podem ser usadas em novos cadastros, mas permanecem preservadas no histórico dos cooperados já cadastrados. Justificativa: consistência para relatórios de produtividade, presença, rateio e operação por função.

---

## Escopo desta Fase

**Incluído:**
- Cadastro e gestão de funções de cooperado (MemberRole)
- Cadastro e gestão de cooperados
- Cadastro hierárquico de materiais (categorias e subcategorias)
- Cadastro de unidades de medida flexíveis
- Cadastro de compradores
- Cadastro de veículos
- Cadastro de tipos de EPI
- Cadastro de centros de custo básicos

**Explicitamente excluído:**
- Rotas de coleta e mapas
- Movimentação de estoque
- Triagem de material
- Vendas e negociações
- Lançamentos financeiros e rateio
- Entrega de EPI (apenas o tipo é cadastrado)
- Portal completo do comprador (placeholder já existente é mantido)
- Documentos PDF e relatórios avançados

---

## User Scenarios & Testing

### User Story 1 — Cadastrar e Gerenciar Cooperados (Priority: P1)

Um gestor ou administrador precisa manter o cadastro dos cooperados da organização: quem está ativo, qual sua função, como contatá-lo e se ele tem acesso ao sistema.

**Why this priority**: Cooperados são a entidade central da cooperativa. Fases de coleta, presença, EPIs e rateio dependem desse cadastro.

**Independent Test**: Um administrador pode acessar a tela de cooperados, criar um cooperado com CPF e função, inativá-lo e verificar que ele não aparece em listagens operacionais ativas — isso constitui um fluxo completo e verificável sem qualquer outra fase.

**Acceptance Scenarios**:

1. **Given** que o usuário tem permissão de criar cooperados, **When** ele preenche nome, CPF, telefone, função e data de entrada e confirma, **Then** o cooperado é criado com status ativo e aparece na listagem.
2. **Given** um cooperado ativo cadastrado, **When** o usuário inativa o cooperado, **Then** o cooperado não aparece em listagens filtradas por ativos e o sistema impede seu uso em operações futuras.
3. **Given** um cooperado existente, **When** o usuário vincula um usuário de acesso existente a ele, **Then** a relação é registrada sem alterar o status do usuário vinculado.
4. **Given** que o usuário não tem permissão de criar cooperados, **When** ele tenta criar um, **Then** o sistema retorna erro 403 e nenhum cooperado é criado.
5. **Given** um CPF já cadastrado em outro cooperado, **When** um segundo cooperado tenta ser criado com o mesmo CPF, **Then** o sistema rejeita com mensagem de duplicidade.

---

### User Story 2 — Cadastrar Categorias e Subcategorias de Material (Priority: P1)

A gestão precisa definir a hierarquia de materiais recicláveis que será usada em toda a operação de coleta, estoque e venda.

**Why this priority**: A hierarquia de materiais é o vocabulário comum de toda a operação. Sem ela, não é possível registrar entradas, realizar triagem ou precificar.

**Independent Test**: Um administrador pode criar a categoria "Plástico", adicionar a subcategoria "PET" com unidade padrão "kg" marcada como vendável, e listar a hierarquia completa — fluxo verificável de forma independente.

**Acceptance Scenarios**:

1. **Given** que o usuário tem permissão de gerenciar materiais, **When** ele cria uma categoria com nome, **Then** a categoria aparece ativa na listagem de categorias.
2. **Given** uma categoria existente, **When** o usuário cria uma subcategoria informando nome, unidade padrão, se é vendável e se aceita estoque, **Then** a subcategoria aparece vinculada à categoria correta.
3. **Given** uma subcategoria existente, **When** o usuário inativa a subcategoria, **Then** ela não aparece nas listagens operacionais de materiais ativos.
4. **Given** uma subcategoria com nome já existente dentro da mesma categoria, **When** o usuário tenta criar outra com o mesmo nome, **Then** o sistema rejeita com mensagem de duplicidade.
5. **Given** que o usuário sem permissão tenta criar ou editar materiais, **Then** o sistema retorna 403.

---

### User Story 3 — Cadastrar Unidades de Medida (Priority: P1)

A gestão precisa definir as unidades aceitas pelo sistema (kg, tonelada, saco, bag, fardo, litro, etc.) e quando aplicável informar a unidade base e fator de conversão.

**Why this priority**: Unidades de medida são referenciadas por subcategorias de material, e elas serão usadas em pesagem, estoque e vendas.

**Independent Test**: Um administrador pode criar a unidade "Tonelada" com fator de conversão para "kg" igual a 1000, e criar a unidade "Saco" sem fator de conversão — ambos os fluxos são verificáveis de forma independente.

**Acceptance Scenarios**:

1. **Given** permissão adequada, **When** o usuário cria uma unidade com nome e símbolo, **Then** a unidade aparece na listagem ativa.
2. **Given** uma unidade existente como unidade base, **When** o usuário cria outra unidade informando unidade base e fator de conversão, **Then** a relação de conversão fica registrada.
3. **Given** que nem toda unidade tem conversão, **When** o usuário cria uma unidade sem informar fator de conversão, **Then** o sistema aceita sem erro.
4. **Given** nome de unidade já existente, **When** o usuário tenta criar outra com mesmo nome, **Then** o sistema rejeita com mensagem de duplicidade.

---

### User Story 4 — Cadastrar e Gerenciar Compradores (Priority: P2)

A gestão precisa manter o cadastro dos compradores (pessoas físicas ou jurídicas) que adquirem materiais da cooperativa.

**Why this priority**: Compradores são necessários para registrar vendas nas fases futuras. O cadastro agora previne lacunas ao iniciar as operações de venda.

**Independent Test**: Um administrador pode criar um comprador com CNPJ, razão social, telefone, e-mail e endereço, e depois inativá-lo — fluxo verificável sem dependência de venda.

**Acceptance Scenarios**:

1. **Given** permissão adequada, **When** o usuário cria um comprador com razão social e CPF ou CNPJ, **Then** o comprador aparece ativo na listagem.
2. **Given** um comprador ativo, **When** o usuário inativa o comprador, **Then** o comprador não aparece em listagens de compradores ativos.
3. **Given** um CPF ou CNPJ já cadastrado, **When** o usuário tenta criar um segundo comprador com o mesmo documento, **Then** o sistema rejeita com mensagem de duplicidade.
4. **Given** um comprador existente, **When** o usuário opcionalmente associa um usuário de acesso com perfil BUYER, **Then** a associação é registrada e o usuário pode fazer login (redirecionando para o placeholder do portal).
5. **Given** que o usuário não tem permissão, **Then** o sistema retorna 403 na tentativa de criação ou edição.

---

### User Story 5 — Cadastrar e Gerenciar Veículos (Priority: P2)

A gestão precisa manter o cadastro dos veículos disponíveis para coleta e transporte de materiais.

**Why this priority**: Veículos serão associados a rotas de coleta nas fases seguintes. O cadastro antecipado evita bloqueios no início da fase de coleta.

**Independent Test**: Um administrador pode criar um veículo com placa, tipo, modelo e capacidade, marcá-lo como inativo e verificar que não aparece em listagens de veículos disponíveis.

**Acceptance Scenarios**:

1. **Given** permissão adequada, **When** o usuário cadastra um veículo com placa, tipo e modelo, **Then** o veículo aparece ativo na listagem.
2. **Given** uma placa já cadastrada, **When** o usuário tenta cadastrar outro veículo com a mesma placa, **Then** o sistema rejeita com mensagem de duplicidade.
3. **Given** um veículo ativo, **When** o usuário inativa o veículo, **Then** ele não aparece em listagens de veículos disponíveis.
4. **Given** que o usuário não tem permissão, **Then** o sistema retorna 403.

---

### User Story 6 — Cadastrar Tipos de EPI (Priority: P3)

A gestão precisa definir os tipos de Equipamentos de Proteção Individual usados pela cooperativa para futuro controle de entrega.

**Why this priority**: Necessário antes da fase de entregas de EPI, mas não bloqueia nenhuma fase intermediária.

**Independent Test**: Um administrador pode criar o tipo "Luva de raspa" com validade padrão de 180 dias e listá-lo — fluxo completo e independente.

**Acceptance Scenarios**:

1. **Given** permissão adequada, **When** o usuário cria um tipo de EPI com nome e validade padrão opcional em dias, **Then** o tipo aparece na listagem ativa.
2. **Given** um tipo de EPI com nome já existente, **When** o usuário tenta criar outro com mesmo nome, **Then** o sistema rejeita com mensagem de duplicidade.
3. **Given** permissão adequada, **When** o usuário inativa um tipo de EPI, **Then** ele não aparece nas listagens ativas.

---

### User Story 7 — Cadastrar Centros de Custo (Priority: P3)

A gestão precisa definir os centros de custo que serão usados para categorizar lançamentos financeiros nas fases futuras.

**Why this priority**: Necessário antes do módulo financeiro, mas sem impacto operacional imediato.

**Independent Test**: Um administrador pode criar um centro de custo "Logística" com código "LOG-001" e listá-lo ativo — fluxo verificável de forma independente.

**Acceptance Scenarios**:

1. **Given** permissão adequada, **When** o usuário cria um centro de custo com nome e código opcional, **Then** ele aparece na listagem ativa.
2. **Given** um código já utilizado, **When** o usuário tenta criar outro com o mesmo código, **Then** o sistema rejeita com mensagem de duplicidade.
3. **Given** um centro de custo ativo, **When** o usuário o inativa, **Then** ele não aparece nas listagens operacionais.

---

### Edge Cases

- Cooperado inativo não deve aparecer em seletores operacionais de outras telas (coleta, presença, EPI).
- Subcategoria inativa não deve aparecer em seletores de material de nenhuma operação.
- Comprador inativo não deve aparecer em seletores de venda.
- Veículo inativo não deve aparecer em seletores de rota/coleta.
- CPF e CNPJ devem ter formato válido; duplicidade de documento por tipo de entidade deve ser rejeitada.
- Unidade de medida não pode ter a si mesma como unidade base (ciclo de conversão).
- Deleção física de qualquer registro desta fase é proibida; apenas inativação lógica é permitida.
- Tentativa de vincular um usuário já vinculado a outro cooperado ou comprador deve ser rejeitada.
- Tentativa de inativar uma categoria com subcategorias ativas deve ser rejeitada com mensagem listando as subcategorias ativas que impedem a ação.
- Tentativa de cadastrar cooperado com função inativa deve ser rejeitada com mensagem orientando o usuário a selecionar uma função ativa.

---

## Requirements

### Functional Requirements

#### Funções de Cooperado (MemberRole)

- **FR-000**: O sistema DEVE manter um cadastro de funções de cooperado (MemberRole) com nome e status (ativo/inativo).
- **FR-000a**: O sistema DEVE inicializar com as funções padrão: triador, motorista, cooperado geral, coordenador, outro.
- **FR-000b**: O ADMIN DEVE poder criar, editar, ativar e inativar funções de cooperado.
- **FR-000c**: O MANAGER DEVE poder apenas visualizar a lista de funções de cooperado.
- **FR-000d**: Funções inativas NÃO DEVEM estar disponíveis para seleção em novos cadastros de cooperados.
- **FR-000e**: Cooperados já cadastrados DEVEM preservar a referência à função mesmo que ela seja inativada posteriormente — o histórico não é alterado.

#### Cooperados

- **FR-001**: O sistema DEVE permitir criar um cooperado com nome completo, CPF (formato válido), telefone, e-mail (opcional), data de entrada, função (referência a uma MemberRole ativa) e observações.
- **FR-002**: O sistema DEVE garantir unicidade de CPF entre cooperados.
- **FR-003**: O sistema DEVE permitir vincular um cooperado a um usuário de acesso existente, ou criar um novo usuário de acesso no mesmo fluxo (respeitando permissões RBAC).
- **FR-004**: O sistema DEVE permitir inativar um cooperado sem excluí-lo.
- **FR-005**: Cooperado inativo DEVE ser excluído das listagens operacionais filtradas por ativos.
- **FR-006**: Inativar um cooperado NÃO DEVE inativar automaticamente o usuário de acesso vinculado — essa ação é separada e requer permissão explícita.

#### Materiais — Categorias e Subcategorias

- **FR-007**: O sistema DEVE permitir criar categorias de material com nome e descrição opcional.
- **FR-008**: O sistema DEVE permitir criar subcategorias vinculadas a uma categoria, informando: nome, unidade de medida padrão, se é vendável (boolean), se aceita estoque (boolean) e observações opcionais.
- **FR-009**: O sistema DEVE garantir unicidade de nome de subcategoria dentro da mesma categoria.
- **FR-010**: O sistema DEVE permitir inativar categorias e subcategorias individualmente.
- **FR-011**: Subcategoria inativa DEVE ser excluída das listagens de materiais disponíveis para operação.
- **FR-012**: O sistema DEVE bloquear a inativação de uma categoria que possua subcategorias ativas, retornando mensagem clara indicando que as subcategorias ativas devem ser inativadas individualmente antes da categoria pai.
- **FR-012a**: Categoria sem subcategorias ativas DEVE poder ser inativada sem restrição.
- **FR-012b**: Subcategorias inativas DEVEM permanecer vinculadas à categoria inativada para preservação histórica — nenhum registro é apagado.
- **FR-012c**: Nenhuma inativação em cascata automática (categoria → subcategorias) DEVE ocorrer nesta fase.

#### Unidades de Medida

- **FR-013**: O sistema DEVE permitir criar unidades de medida com nome e símbolo.
- **FR-014**: O sistema DEVE permitir, opcionalmente, vincular uma unidade a uma unidade base com fator de conversão numérico.
- **FR-015**: O sistema NÃO DEVE obrigar que toda unidade tenha conversão definida.
- **FR-016**: O sistema DEVE impedir que uma unidade referencie a si mesma como unidade base.
- **FR-017**: O sistema DEVE garantir unicidade de nome e símbolo entre unidades de medida.

#### Compradores

- **FR-018**: O sistema DEVE permitir criar um comprador com razão social ou nome, CPF ou CNPJ (formato válido), telefone, e-mail, endereço e observações.
- **FR-019**: O sistema DEVE garantir unicidade de CPF/CNPJ entre compradores.
- **FR-020**: O sistema DEVE permitir opcionalmente associar um usuário com perfil BUYER ao comprador.
- **FR-021**: O sistema DEVE permitir inativar compradores.
- **FR-022**: Comprador inativo DEVE ser excluído de seletores operacionais de venda.

#### Veículos

- **FR-023**: O sistema DEVE permitir criar um veículo com placa, tipo, modelo, capacidade estimada (opcional) e observações.
- **FR-023a**: A capacidade do veículo DEVE ser armazenada em três campos opcionais: `capacityValue` (numérico), `capacityUnitId` (FK para UnitOfMeasure ativa) e `capacityNotes` (texto livre opcional).
- **FR-023b**: Se `capacityValue` for informado, `capacityUnitId` DEVE ser obrigatório; o inverso também vale — os dois campos devem ser preenchidos ou omitidos juntos.
- **FR-023c**: Apenas unidades de medida ativas DEVEM estar disponíveis para seleção na capacidade do veículo. Veículos já cadastrados DEVEM preservar a referência à unidade mesmo que ela seja inativada posteriormente.
- **FR-023d**: Nesta fase, a capacidade do veículo é exclusivamente informativa — o sistema NÃO DEVE realizar cálculos de carga, conversões automáticas, validações de limite de rota ou integração com estoque.
- **FR-024**: O sistema DEVE garantir unicidade de placa entre veículos.
- **FR-025**: O sistema DEVE permitir inativar veículos.
- **FR-026**: Veículo inativo DEVE ser excluído de seletores de coleta/rota.

#### Tipos de EPI

- **FR-027**: O sistema DEVE permitir criar tipos de EPI com nome e validade padrão em dias (opcional).
- **FR-028**: O sistema DEVE garantir unicidade de nome entre tipos de EPI.
- **FR-029**: O sistema DEVE permitir inativar tipos de EPI.

#### Centros de Custo

- **FR-030**: O sistema DEVE permitir criar centros de custo com nome, código opcional e descrição opcional.
- **FR-031**: O sistema DEVE garantir unicidade de código quando informado.
- **FR-032**: O sistema DEVE permitir inativar centros de custo.

#### Segurança e Auditoria

- **FR-033**: Todos os endpoints mutáveis DEVEM exigir autenticação e permissão RBAC adequada; tentativas sem permissão DEVEM retornar 403.
- **FR-033a**: O perfil ADMIN DEVE ter permissão CRUD completa (criar, editar, listar, inativar) em todos os módulos da Fase 2: funções de cooperado, cooperados, materiais (categorias e subcategorias), unidades de medida, compradores, veículos, tipos de EPI e centros de custo.
- **FR-033b**: O perfil MANAGER DEVE ter permissão CRUD (criar, editar, listar, inativar) nos módulos operacionais: cooperados, compradores e veículos. Para funções de cooperado, materiais (categorias e subcategorias), unidades de medida, tipos de EPI e centros de custo, MANAGER DEVE ter apenas permissão de leitura (READ).
- **FR-034**: O AuditInterceptor DEVE ser aplicado por controller em todos os módulos mutáveis da fase, registrando previousState e newState conforme o padrão da Fase 1.
- **FR-035**: Nenhum registro desta fase DEVE ser excluído fisicamente; apenas inativação lógica é permitida.

#### Frontend

- **FR-036**: O frontend DEVE exibir telas CRUD responsivas para cada cadastro da fase.
- **FR-037**: Menus e ações DEVEM ser exibidos conforme as permissões do usuário autenticado.
- **FR-038**: O frontend DEVE exibir mensagens de erro claras para falhas de validação (campo inválido) e de permissão (403).
- **FR-039**: Seletores e campos de busca que referenciam registros desta fase DEVEM filtrar apenas registros ativos por padrão.
- **FR-040**: Todas as telas de listagem DEVEM exibir por padrão apenas registros ativos, com controle de filtro de status que permita alternar entre: apenas ativos, apenas inativos, todos.
- **FR-041**: Todas as telas de listagem DEVEM incluir campo de busca por texto nos campos principais de cada entidade: cooperados (nome, CPF, telefone, e-mail); funções de cooperado (nome); categorias (nome); subcategorias (nome, categoria); unidades de medida (nome, símbolo); compradores (razão social/nome, CPF/CNPJ, telefone, e-mail); veículos (placa, modelo, tipo); tipos de EPI (nome); centros de custo (nome, código).
- **FR-042**: A busca por texto DEVE ser case-insensitive e ignorar espaços extras no início e fim da entrada.
- **FR-043**: Quando a busca não retornar resultados, a interface DEVE exibir mensagem clara e orientativa.
- **FR-044**: Nesta fase, NÃO DEVEM ser implementados filtros avançados por múltiplos campos combinados, filtros por data, exportação de dados ou relatórios nas telas de listagem.

---

### Key Entities

- **MemberRole**: Função de cooperado (triador, motorista, cooperado geral, coordenador, outro e customizadas). Atributos: id, nome, isDefault (boolean), status (ativo/inativo).
- **Cooperado**: Pessoa física cooperada. Atributos: id, nome, CPF, telefone, e-mail (opcional), data de entrada, roleId (FK para MemberRole — deve ser ativa no momento do cadastro), status (ativo/inativo), observações, userId (opcional, FK para User).
- **MaterialCategory**: Categoria de material reciclável. Atributos: id, nome, descrição (opcional), status.
- **MaterialSubcategory**: Subcategoria vinculada a uma categoria. Atributos: id, nome, categoryId (FK), unitId (FK unidade padrão), isSellable, acceptsStock, observações, status.
- **UnitOfMeasure**: Unidade de medida. Atributos: id, nome, símbolo, baseUnitId (FK opcional, auto-referência), conversionFactor (opcional), status.
- **Buyer**: Comprador. Atributos: id, razão social/nome, tipo de documento (CPF/CNPJ), documento, telefone, e-mail, endereço (logradouro, número, complemento, cidade, estado, CEP), status, observações, userId (opcional, FK para User).
- **Vehicle**: Veículo. Atributos: id, placa (única), tipo (enum: truck, van, pickup, motorcycle, other), modelo, capacityValue (numérico, opcional), capacityUnitId (FK para UnitOfMeasure, obrigatório se capacityValue informado), capacityNotes (texto livre, opcional), status, observações.
- **EpiType**: Tipo de EPI. Atributos: id, nome, validade padrão em dias (opcional), status.
- **CostCenter**: Centro de custo. Atributos: id, nome, código (opcional, único), descrição (opcional), status.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Todos os oito módulos de cadastro (cooperados, categorias, subcategorias, unidades, compradores, veículos, tipos de EPI, centros de custo) devem ser operáveis por um administrador sem auxílio técnico.
- **SC-002**: Registros inativos não devem aparecer em nenhum seletor operacional em outras partes do sistema — verificável por testes automatizados.
- **SC-003**: 100% dos endpoints mutáveis da fase devem retornar 403 para usuários sem permissão — verificável por testes de integração.
- **SC-004**: O audit log deve registrar previousState não-nulo em 100% das operações de atualização e inativação — verificável por testes de integração.
- **SC-005**: Um gestor treinado deve ser capaz de completar o cadastro completo de um cooperado (incluindo vinculação de usuário) em menos de 3 minutos.
- **SC-006**: Formulários de cadastro devem exibir mensagens de erro específicas por campo sem recarregar a página.
- **SC-007**: O sistema deve rejeitar documentos com formato inválido (CPF/CNPJ) antes de persistir qualquer dado.

---

## Assumptions

- CPF e CNPJ serão validados por formato e dígitos verificadores; a validade perante a Receita Federal não é verificada online nesta fase.
- Endereço de compradores é armazenado como campos individuais (logradouro, número, complemento, cidade, estado, CEP); integração com API de CEP é desejável mas não obrigatória nesta fase.
- Inativar um cooperado não inativa automaticamente o usuário de acesso vinculado; essa é uma ação administrativa separada.
- A vinculação de usuário a um cooperado ou comprador é opcional; cooperados e compradores sem usuário de acesso são válidos.
- Um usuário de acesso não pode ser vinculado simultaneamente a mais de um cooperado ou mais de um comprador.
- Os tipos de veículo são um conjunto fixo e pequeno (caminhão, van, picape, moto, outro); se o domínio precisar de tipos customizáveis, isso será tratado em fase posterior.
- Não haverá upload de fotos, documentos ou anexos nesta fase.
- O portal do comprador (rota `/portal`) continua exibindo o placeholder já existente; nenhuma tela adicional do portal é entregue nesta fase.
- As permissões RBAC necessárias para cada novo módulo (ex.: `MEMBERS`, `MATERIALS`, `BUYERS`, `VEHICLES`, `EPI_TYPES`, `COST_CENTERS`) serão adicionadas ao seed e configuradas nos perfis ADMIN e MANAGER como parte da implementação.
- Todas as listagens de cadastro desta fase usam paginação server-side com envelope `{ data, total, page, limit }`. Parâmetros padrão: `page` (int, default 1), `limit` (int, default 20, máx 100), `search` (string, case-insensitive), `status` (`active` | `inactive` | `all`, default `active`). Isso se aplica a todos os módulos da Fase 2: cooperados, funções de cooperado, materiais (categorias e subcategorias), unidades de medida, compradores, veículos, tipos de EPI e centros de custo.
