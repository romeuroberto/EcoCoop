# Feature Specification: Identidade Visual e Design System Base

**Feature Branch**: `004-visual-identity-design-system`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "Criar uma nova fase para o EcoCoop chamada 'Identidade Visual e Design System Base'. Evoluir a interface atual do EcoCoop, que está funcional porém genérica, para uma identidade visual mais profissional, autoral e adequada a um sistema operacional de cooperativa de reciclagem."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Percepção de Produto Profissional ao Fazer Login (Priority: P1)

Um operador acessa o EcoCoop pela primeira vez após a atualização e percebe imediatamente que está usando um sistema dedicado, institucional e confiável — não um admin template genérico. A tela de login transmite a identidade visual da cooperativa com cores, tipografia e composição próprias.

**Why this priority**: A tela de login é o primeiro ponto de contato com o sistema. Uma identidade visual fraca aqui projeta amadorismo e reduz a confiança antes mesmo de o usuário interagir com qualquer funcionalidade.

**Independent Test**: Pode ser testado isoladamente exibindo a tela de login para um usuário novo e perguntando se ele percebe o sistema como produto dedicado ou como template genérico.

**Acceptance Scenarios**:

1. **Given** o usuário acessa a URL do sistema, **When** a tela de login é exibida, **Then** a identidade visual usa paleta de cores definida (grafite, azul-petróleo, teal e tons claros quentes) sem predominância de verde clichê.
2. **Given** a tela de login está aberta, **When** o usuário observa o conjunto (logotipo, cores, tipografia, layout), **Then** a composição transmite organização, rastreabilidade e operação real — não aparência genérica de admin template.
3. **Given** o usuário está em um dispositivo móvel, **When** acessa a tela de login, **Then** o formulário é totalmente utilizável sem zoom ou scroll horizontal.

---

### User Story 2 - Navegação Principal Clara com Contexto de Localização (Priority: P1)

Um gestor acessa diferentes módulos do sistema ao longo do dia. Em cada tela, ele sabe instantaneamente onde está na estrutura do sistema, como voltar, e o que a seção atual faz — sem precisar memorizar a hierarquia de navegação.

**Why this priority**: A clareza da navegação impacta diretamente a eficiência operacional diária. Erros de navegação causam retrabalho e frustração.

**Independent Test**: Pode ser testado abrindo qualquer tela do sistema e perguntando ao usuário onde ele está sem ver a URL, se consegue identificar rapidamente o caminho percorrido.

**Acceptance Scenarios**:

1. **Given** o usuário está em qualquer tela interna, **When** olha para a área de navegação, **Then** a sidebar exibe claramente a seção ativa com destaque visual diferenciado.
2. **Given** o usuário está em uma tela de detalhe ou sub-página, **When** olha para o topo da área de conteúdo, **Then** breadcrumbs ou indicador de localização mostram o caminho atual (ex.: Rotas de Coleta > Executar Rota).
3. **Given** o usuário está em desktop, tablet ou mobile, **When** acessa a navegação principal, **Then** a sidebar adapta seu comportamento de forma adequada a cada tamanho de tela.
4. **Given** o usuário acessa o Dashboard, **When** observa os cards de módulos, **Then** os módulos já implementados aparecem como ativos e navegáveis, agrupados por área operacional, enquanto módulos não implementados permanecem com badge "Em breve" e sem ação principal ativa.

---

### User Story 3 - Leitura Rápida de Status em Tabelas e Listagens (Priority: P2)

Um operador varre rapidamente uma tabela de rotas de coleta para identificar rotas pendentes, em andamento e concluídas. A distinção entre estados é imediata, usando cor, forma e rótulo de forma padronizada — sem precisar ler cada linha com atenção.

**Why this priority**: Tabelas são o principal mecanismo de operação do sistema. Leitura rápida de status reduz tempo de operação e erros de tomada de decisão.

**Independent Test**: Pode ser testado exibindo uma tabela com múltiplos status e medindo em quantos segundos o operador identifica todos os itens "em andamento".

**Acceptance Scenarios**:

1. **Given** uma tabela exibe itens com diferentes status, **When** o usuário olha para a coluna de status, **Then** cada estado (ativo, inativo, planejada, em andamento, concluída, cancelada, pendente) usa badge com cor semântica e rótulo textual consistentes em todas as telas.
2. **Given** o usuário aplica um filtro em uma tabela, **When** os resultados são exibidos, **Then** o filtro ativo é visualmente indicado e pode ser removido individualmente.
3. **Given** uma tabela não tem itens para exibir, **When** o estado vazio é exibido, **Then** uma mensagem clara e ilustração consistente explicam o motivo (sem dados, filtro ativo, etc.).

---

### User Story 4 - Cabeçalho e Ações de Página Padronizados (Priority: P2)

Um usuário navega entre as telas de Pontos de Coleta e Rotas de Coleta e percebe imediatamente que as ações primárias (criar novo, exportar, filtrar) estão sempre no mesmo lugar, com o mesmo padrão visual. Não há surpresa sobre onde clicar.

**Why this priority**: Consistência de padrões de interação reduz a curva de aprendizado e o suporte necessário para usuários novos.

**Independent Test**: Pode ser testado pedindo para um usuário novo realizar uma ação CRUD em uma tela que nunca usou antes, medindo o tempo até encontrar o botão de ação primária.

**Acceptance Scenarios**:

1. **Given** o usuário está em qualquer tela principal do sistema, **When** olha para o topo da área de conteúdo, **Then** o cabeçalho exibe título da seção, subtítulo opcional e ações primárias sempre na mesma posição relativa.
2. **Given** o usuário precisa criar um novo item, **When** olha para o cabeçalho da página, **Then** o botão de ação primária usa estilo visual consistente com hierarquia clara (primário > secundário > terciário).
3. **Given** o usuário está carregando dados em uma tabela, **When** os dados ainda não chegaram, **Then** um indicador de loading consistente é exibido no lugar do conteúdo, sem quebrar o layout.

---

### User Story 5 - Experiência Responsiva em Tablet e Mobile (Priority: P3)

Um motorista usa o sistema em um tablet durante a execução de uma rota de coleta. A interface se adapta ao dispositivo, mantendo os elementos essenciais acessíveis e usáveis sem precisar dar zoom ou rolar horizontalmente.

**Why this priority**: Cooperativas têm operadores de campo que precisam usar o sistema em dispositivos móveis. Responsividade inadequada bloqueia adoção.

**Independent Test**: Pode ser testado abrindo as telas modelo (Login, Dashboard, Pontos de Coleta, Rotas de Coleta) em um tablet e em um celular e verificando usabilidade sem ajustes manuais de zoom.

**Acceptance Scenarios**:

1. **Given** o usuário acessa o sistema em um dispositivo com tela entre 768px e 1024px (tablet), **When** navega pelas telas modelo, **Then** todos os elementos essenciais são visíveis e interagíveis sem scroll horizontal.
2. **Given** o usuário acessa o sistema em dispositivo com tela abaixo de 768px (mobile), **When** tenta completar uma tarefa básica, **Then** a sidebar colapsa ou vira menu hamburger e o conteúdo principal ocupa a tela inteira.
3. **Given** o usuário navega por teclado, **When** pressiona Tab para mover o foco, **Then** o indicador de foco é visível em todos os elementos interativos, seguindo a ordem lógica de leitura.

---

### Edge Cases

- O que acontece se o logo/nome da cooperativa for muito longo para caber na sidebar?
- Como a topbar se comporta quando o usuário tem um nome muito longo?
- Como a tabela se comporta com textos muito longos em células (truncamento ou quebra de linha)?
- O que é exibido quando uma seção está em construção ou desabilitada por permissão?
- Como os badges de status se comportam em células com espaço muito reduzido em mobile?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE aplicar uma paleta de cores primária composta por grafite, azul-petróleo, teal e tons claros quentes, usando verde apenas como cor semântica positiva.
- **FR-002**: O sistema DEVE definir um conjunto de tokens visuais (cores, tipografia, espaçamentos, bordas, sombras) documentados e aplicados consistentemente em todos os componentes.
- **FR-003**: O sistema DEVE disponibilizar componentes reutilizáveis de badge de status que cubram os estados: ativo, inativo, planejada, em andamento, concluída, cancelada e pendente.
- **FR-004**: O sistema DEVE exibir breadcrumbs ou indicador de contexto de navegação em todas as telas internas, mostrando o caminho atual na hierarquia do sistema.
- **FR-005**: O sistema DEVE padronizar o cabeçalho de página com título, subtítulo opcional e área de ações primárias em posição consistente.
- **FR-006**: O sistema DEVE padronizar a estrutura de tabelas com: cabeçalho fixo com rótulos, linha de filtros, coluna de ações, paginação e estado vazio.
- **FR-007**: O sistema DEVE exibir um componente de estado vazio padronizado quando não houver dados para listar, com mensagem contextual e ação sugerida quando aplicável.
- **FR-008**: O sistema DEVE exibir indicador de loading padronizado durante o carregamento de dados em tabelas, formulários e ações assíncronas.
- **FR-009**: A sidebar de navegação DEVE identificar visualmente a seção ativa e adaptar seu comportamento para desktop (expandida), tablet (colapsável) e mobile (menu hamburger).
- **FR-010**: O sistema DEVE aplicar o novo design system nas telas-modelo: Login, Dashboard, Pontos de Coleta e Rotas de Coleta.
- **FR-011**: Todos os elementos interativos DEVEM ter indicador de foco visível e ordem de tabulação lógica para acessibilidade por teclado.
- **FR-012**: O contraste de texto em relação ao fundo DEVE atender ao mínimo de 4.5:1 para texto normal e 3:1 para texto grande, conforme WCAG 2.1 AA.
- **FR-013**: O layout DEVE ser responsivo para três breakpoints: desktop (≥1280px), tablet (768px–1279px) e mobile (<768px).
- **FR-014**: O sistema NÃO DEVE quebrar nenhuma funcionalidade existente durante a aplicação do novo design system.
- **FR-015**: O build do frontend DEVE continuar passando sem erros após todas as alterações de design.
- **FR-016**: O Dashboard DEVE exibir cards de módulos agrupados por áreas operacionais, liberando visualmente apenas módulos com frontend já implementado e rota existente. Cards futuros DEVEM manter badge "Em breve" e não DEVEM exibir ação principal ativa.
- **FR-017**: A Fase 4 NÃO DEVE criar funcionalidades novas de domínio, desbloquear módulos sem implementação real, alterar backend, schema, permissões ou regras de negócio; o redesenho do Dashboard é apenas refinamento visual e de navegação.

### Key Entities *(include if feature involves data)*

- **Token Visual**: Valor nomeado e reutilizável que representa uma decisão de design (cor, espaçamento, tipografia, borda). Base de consistência do sistema.
- **Componente de Interface**: Elemento de UI reutilizável construído sobre tokens visuais (Badge, Button, PageHeader, DataTable, EmptyState, LoadingState, Sidebar, Topbar, Breadcrumb).
- **Badge de Status**: Componente visual que comunica o estado de uma entidade operacional usando cor semântica + rótulo textual padronizado.
- **Button**: Componente base de ação usado em telas, cards, formulários e estados interativos, com variantes visuais padronizadas pelo design system para ações primárias, secundárias, discretas e destrutivas.
- **Tela-Modelo**: Tela que recebe a aplicação completa do novo design system na primeira fase, servindo como referência para as demais telas do sistema.
- **Card de Módulo**: Elemento visual do Dashboard que representa um módulo do sistema. Pode estar ativo, apontando para rota existente, ou futuro, exibindo "Em breve" sem ação principal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário novo, ao ver as quatro telas-modelo (Login, Dashboard, Pontos de Coleta, Rotas de Coleta), não identifica o sistema como "admin template genérico" em pesquisa de percepção informal.
- **SC-002**: Um operador identifica o status correto de qualquer item em uma tabela em menos de 3 segundos, sem precisar ler texto auxiliar além do badge.
- **SC-003**: Um usuário novo consegue localizar e clicar na ação primária (ex.: "Nova Rota") de qualquer tela-modelo em menos de 10 segundos, sem instrução prévia.
- **SC-004**: Nenhuma das funcionalidades existentes (login, CRUD de pontos de coleta, CRUD de rotas, execução de rota) deixa de funcionar após a aplicação do design system.
- **SC-005**: O build do frontend é concluído sem erros após todas as alterações.
- **SC-006**: Todas as telas-modelo são utilizáveis em dispositivos com tela de 375px de largura (mobile) sem scroll horizontal ou elementos cortados.
- **SC-007**: Todos os elementos interativos nas telas-modelo têm indicador de foco visível quando navegados por teclado.
- **SC-008**: Os sete estados de status (ativo, inativo, planejada, em andamento, concluída, cancelada, pendente) usam badges visualmente distintos e consistentes em todas as telas onde aparecem.

## Assumptions

- Os usuários principais do sistema são operadores, gestores e motoristas de cooperativas de reciclagem, com níveis variados de familiaridade tecnológica.
- A stack de frontend já utiliza React + TypeScript + Vite; o design system será implementado com as ferramentas e bibliotecas de estilo já presentes no projeto.
- Não há sistema de design externo (Figma, Storybook) obrigatório; a especificação de tokens e componentes será feita diretamente no código.
- O logotipo e nome da cooperativa já existem no sistema atual e serão mantidos; este escopo não inclui redesign de marca, apenas aplicação de identidade visual consistente.
- A aplicação do design system nas quatro telas-modelo serve como prova de conceito; as demais telas do sistema serão atualizadas em fases subsequentes.
- DataTable é uma entidade reconhecida do design system, mas a implementação reutilizável de uma abstração global de DataTable está adiada para fase posterior. Nesta Fase 4, as tabelas existentes podem receber apenas ajustes visuais mínimos, preservando colunas, ações e comportamentos atuais.
- A acessibilidade básica (contraste WCAG AA, foco visível, navegação por teclado) é suficiente para esta fase; certificação formal de acessibilidade fica fora do escopo.
- Modo escuro, temas configuráveis por cooperativa e upload de logo pelo administrador estão explicitamente fora do escopo desta fase.
- Alterações de backend, banco de dados, schema, endpoints, regras de negócio e permissões estão fora do escopo.
- O Dashboard pode expor visualmente como ativos somente módulos já existentes no frontend: Cooperados, Funções, Categorias, Subcategorias, Unidades, Compradores, Veículos, Tipos de EPI, Centros de Custo, Pontos de Coleta, Rotas de Coleta, Execução de Rotas, Entrada de Material Bruto e Saldo Bruto.
- "Rotas de Coleta" e "Execução de Rotas" podem apontar inicialmente para `/collection-routes`, desde que tenham textos diferenciados e não criem funcionalidade nova: "Rotas de Coleta" representa gestão/listagem das rotas, enquanto "Execução de Rotas" representa acesso operacional ao fluxo de execução.
- Triagem, Estoque pronto, Rejeito, Vendas operacionais, Financeiro, Rateio e Relatórios avançados permanecem como módulos futuros com badge "Em breve".
