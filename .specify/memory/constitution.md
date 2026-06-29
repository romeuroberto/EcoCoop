<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0
Bump type: MINOR (initial population — all principles added from scratch)

Modified principles: N/A (first real version)

Added sections:
  - Core Principles (I–VII): Domain, auditability, stock immutability
  - Arquitetura e Acesso (VIII–XI): Tenancy, portals, permissions
  - Funcionalidades e Operação (XII–XX): Operational features
  - Stack e Qualidade Técnica (XXI–XXIV): Technology, testing, ADR
  - Governance

Templates reviewed:
  - .specify/templates/plan-template.md       ✅ no changes needed (Constitution Check section is feature-driven)
  - .specify/templates/spec-template.md       ✅ no changes needed (generic, fills per feature)
  - .specify/templates/tasks-template.md      ✅ no changes needed (generic structure applies)
  - .specify/templates/constitution-template.md ✅ source template unchanged (only memory copy updated)

Deferred TODOs: none
-->

# EcoCoop Constitution

## Core Principles

### I. Spec-Driven Development (NÃO NEGOCIÁVEL)

Nenhuma funcionalidade relevante DEVE ser implementada sem uma especificação
aprovada. O ciclo obrigatório é: especificar → planejar → implementar. PRs sem
spec de referência DEVEM ser rejeitados.

**Rationale**: Reduz retrabalho, garante alinhamento com o domínio da cooperativa
e cria rastreabilidade entre requisitos e código.

### II. Fluxo Operacional como Domínio

O domínio do sistema DEVE espelhar o fluxo real da cooperativa:
**coleta → entrada → material bruto → triagem → material pronto →
venda/destinação → financeiro → rateio**.

Modelos, serviços e APIs DEVEM ser nomeados e organizados em torno desses
estágios. Nenhuma abstração técnica DEVE obscurecer a semântica operacional.

**Rationale**: O vocabulário do código precisa ser o vocabulário da cooperativa.
Isso reduz erros de interpretação e facilita a manutenção por qualquer
desenvolvedor que entenda o negócio.

### III. Rastreabilidade, Histórico e Auditoria

Toda movimentação relevante DEVE gerar um registro auditável imutável:
quem fez, o quê, quando, e o estado anterior/posterior. Registros de auditoria
NUNCA DEVEM ser deletados ou editados diretamente.

**Rationale**: A cooperativa lida com dinheiro, material e direitos de cooperados.
A capacidade de reconstituir qualquer estado histórico é requisito legal e
operacional.

### IV. Imutabilidade do Estoque por Evento (NÃO NEGOCIÁVEL)

O estoque NUNCA DEVE ser alterado diretamente. Toda alteração DEVE nascer de um
evento de movimentação explícito: `entrada`, `triagem`, `ajuste`, `venda`,
`perda`, `rejeito` ou `descarte`. Eventos DEVEM ser registrados antes de o
saldo ser recalculado.

**Rationale**: Alterações diretas tornam impossível auditar a origem de qualquer
saldo. O modelo de eventos garante consistência, rastreabilidade e permite
reconstituição do estoque em qualquer ponto no tempo.

### V. Separação Clara de Estados do Material

O sistema DEVE distinguir e tratar separadamente:
- **Material bruto**: recebido, não triado
- **Material em triagem**: em processamento
- **Material pronto**: triado, pesado, disponível para venda

Nenhum módulo DEVE confundir esses estados. Transições entre estados DEVEM ser
explícitas e registradas (ver Princípio IV).

**Rationale**: Misturar estados gera inconsistência de estoque, erros de
precificação e dificuldade na apuração do resultado por material.

### VI. Financeiro Auditável e Vinculado às Operações

O módulo financeiro DEVE, sempre que possível, estar vinculado às operações
reais (venda, coleta, destinação, folha). Lançamentos manuais DEVEM ser
marcados como tal e justificados. Nenhum saldo financeiro DEVE ser alterado
sem rastreio.

O fluxo de caixa DEVE nascer completo: contas a pagar, contas a receber,
centro de custo e conciliação prevista.

**Rationale**: Cooperativas são fiscalizadas. Um financeiro desvinculado das
operações torna-se não confiável rapidamente e impede a apuração correta do
resultado para o rateio.

### VII. Rateio Transparente, Auditável e Configurável

O rateio dos ganhos DEVE ser calculado com base em regras explicitamente
configuradas pela gestão. O cálculo DEVE ser auditável, com registros do
período, das regras aplicadas e do resultado por cooperado. Alterações nas
regras DEVEM ser versionadas.

**Rationale**: O rateio é o coração da relação entre a cooperativa e seus
cooperados. Qualquer opacidade nesse processo gera conflito e perda de
confiança.

## Arquitetura e Acesso

### VIII. Instância Dedicada por Cooperativa

O MVP DEVE operar com uma instância dedicada por cooperativa. Multi-tenancy
lógico (dados de múltiplas cooperativas no mesmo banco sob um mesmo schema)
NÃO DEVE ser implementado no MVP.

**Rationale**: Simplifica segurança, backups, customização por cooperativa e
reduz o risco de vazamento de dados entre organizações.

### IX. Portal Restrito do Comprador

Compradores DEVEM ter acesso a um portal próprio, com visibilidade restrita
às informações explicitamente permitidas pela gestão. Compradores NÃO DEVEM
ter acesso a dados financeiros internos, dados de cooperados ou estoque bruto.

**Rationale**: Compradores precisam de visibilidade sobre pedidos, romaneios e
histórico de compras sem acesso ao interior operacional da cooperativa.

### X. Cooperados com Login Individual e Perfis de Acesso

Cada cooperado DEVE ter login individual. Permissões DEVEM ser definidas por
perfil (ex.: triador, motorista, gestor, administrador). O nível de acesso
DEVE ser atribuível individualmente dentro do perfil.

**Rationale**: Garante responsabilidade individual por ações no sistema e
permite que a gestão conceda apenas o acesso necessário para cada função.

### XI. Permissões Validadas no Backend (NÃO NEGOCIÁVEL)

Toda verificação de permissão DEVE ser realizada no backend. A interface PODE
ocultar elementos inacessíveis por UX, mas isso NUNCA substitui a validação
server-side. Qualquer endpoint que retorne dados ou execute ação DEVE checar
permissão explicitamente.

**Rationale**: Validação apenas no frontend é trivialmente bypassável.
Segurança real reside no servidor.

## Funcionalidades e Operação

### XII. Pesagem Manual com Extensibilidade para Balança Digital

O MVP DEVE suportar lançamento manual de pesagens. A arquitetura DEVE
deixar um ponto de extensão claro (ex.: interface/contrato) para futura
integração com balança digital, sem exigir refatoração do domínio.

**Rationale**: A maioria das cooperativas no MVP não terá balança digital
conectada, mas a adoção tende a crescer. Preparar o ponto de extensão agora
evita quebra futura.

### XIII. Mapas para Rotas de Coleta

O sistema DEVE incluir visualização de mapas para planejamento e acompanhamento
de rotas de coleta. A integração de mapas DEVE ser tratada como funcionalidade
de primeira classe, não como add-on.

**Rationale**: Rotas de coleta são o ponto de entrada de todo o fluxo da
cooperativa. Otimizá-las tem impacto direto no custo operacional e nos
relatórios de rentabilidade por rota.

### XIV. Controle de Presença Configurável

O controle de presença DEVE ser parte do escopo, mas implementado como
recurso opcional e configurável pela gestão de cada cooperativa. Cooperativas
que não utilizarem o módulo NÃO DEVEM ser impactadas.

**Rationale**: Nem todas as cooperativas utilizam controle formal de presença.
Torná-lo obrigatório criaria fricção desnecessária para adoção do sistema.

### XV. Emissão de Documentos Institucionais

O sistema DEVE emitir documentos como: recibos, romaneios, comprovantes de
entrega, termos de EPI e relatórios institucionais. Nota fiscal eletrônica
fica FORA do escopo do MVP e DEVE ser tratada como integração futura.

**Rationale**: Documentos físicos/digitais são necessários para operação
diária, rastreabilidade de entrega e conformidade legal básica.

### XVI. Estoque com Unidades Configuráveis

O sistema DEVE suportar controle de estoque em múltiplas unidades configuráveis:
peso (kg, ton), fardo, bag, saco, unidade, volume e outras unidades definidas
pela gestão. Conversões entre unidades DEVEM ser explícitas e rastreáveis.

**Rationale**: Diferentes materiais e compradores utilizam unidades distintas.
Forçar uma unidade única geraria erros operacionais e resistência dos usuários.

### XVII. Materiais por Categorias e Subcategorias

Materiais DEVEM ser cadastrados em estrutura hierárquica de categorias e
subcategorias (ex.: Plástico > PET, Papel > Papelão, Metal > Alumínio).
A hierarquia DEVE ser configurável pela gestão sem necessidade de deploy.

**Rationale**: Categorização correta é base para relatórios de rentabilidade
por material, precificação e rastreamento do fluxo por tipo de resíduo.

### XVIII. Fluxo de Caixa Completo

O módulo financeiro DEVE incluir desde o MVP: contas a pagar, contas a
receber, centro de custo, e estrutura para conciliação. Lançamentos DEVEM
ser vinculados a operações reais sempre que possível (ver Princípio VI).

**Rationale**: Um fluxo de caixa parcial gera trabalho manual paralelo em
planilhas, que é exatamente o que o sistema deve eliminar.

### XIX. Relatórios como Inteligência Estratégica

Os relatórios DEVEM fornecer inteligência operacional e estratégica:
rotas mais lucrativas, materiais mais rentáveis, compradores mais
vantajosos, evolução de custos, produtividade por cooperado, posição
de estoque e resultado financeiro por período.

**Rationale**: Dados operacionais sem relatórios são ruído. A cooperativa
precisa de visibilidade para tomar decisões de gestão baseadas em evidência.

### XX. Interface Simples, Responsiva e Acessível

A interface DEVE ser simples, responsiva (desktop e mobile) e adequada para
usuários com diferentes níveis de familiaridade tecnológica. Jargão técnico
NÃO DEVE aparecer na UI. Fluxos críticos DEVEM ser completáveis em no máximo
3 passos.

**Rationale**: Cooperados e operadores não são usuários técnicos. Uma
interface complexa gera resistência à adoção e erros operacionais.

## Stack e Qualidade Técnica

### XXI. Stack Tecnológica Definida

A stack inicial DEVE ser:
- **Backend**: NestJS + TypeScript
- **Frontend**: React + TypeScript + Vite
- **Banco de dados**: PostgreSQL

Mudanças de stack DEVEM ser tratadas como decisão de arquitetura e
registradas em ADR (ver Princípio XXII). Bibliotecas adicionais DEVEM
ser avaliadas quanto a manutenibilidade, licença e alinhamento com a stack.

**Rationale**: Uma stack definida reduz a carga cognitiva, facilita
onboarding e garante consistência entre módulos desenvolvidos em momentos
diferentes.

### XXII. Decisões Estruturais Registradas em ADR

Toda decisão de arquitetura relevante (escolha de biblioteca, padrão de
design, mudança de stack, estratégia de integração) DEVE ser documentada
como Architecture Decision Record (ADR) em `docs/adr/`. ADRs DEVEM
incluir contexto, opções consideradas, decisão tomada e consequências.

**Rationale**: Sem registro, decisões de arquitetura se perdem no tempo
e são refeitas com custo. ADRs criam memória institucional do projeto.

### XXIII. Testes Obrigatórios em Áreas Críticas

Testes automatizados são OBRIGATÓRIOS para:
autenticação, permissões, estoque, triagem, financeiro, vendas, rateio
e geração de documentos. Essas áreas NÃO DEVEM ter código de produção
sem cobertura de testes. Pull requests que reduzam cobertura nessas áreas
DEVEM ser rejeitados.

**Rationale**: São as áreas de maior risco operacional e legal para a
cooperativa. Bugs aqui têm impacto direto em dinheiro e direitos dos
cooperados.

### XXIV. Consistência, Segurança, Backup e Manutenibilidade

O sistema DEVE priorizar, nesta ordem:
1. **Consistência dos dados**: transações atômicas, sem estados parciais visíveis
2. **Segurança**: autenticação, autorização, sanitização de entrada, HTTPS
3. **Backup**: estratégia de backup definida antes do go-live, testada regularmente
4. **Manutenibilidade**: código claro, dependências atualizadas, dívida técnica
   gerenciada explicitamente

**Rationale**: Um sistema com dados inconsistentes ou sem backup é pior do
que nenhum sistema. Segurança e manutenibilidade garantem longevidade.

## Governance

Esta Constituição é o documento de autoridade máxima do projeto EcoCoop.
Em caso de conflito entre esta Constituição e qualquer outra documentação,
a Constituição prevalece.

**Processo de Emenda**:
- Qualquer princípio pode ser alterado via Pull Request com justificativa
  documentada e referência ao princípio afetado.
- Remoção ou redefinição de princípio DEVE incrementar a versão MAJOR.
- Adição de princípio ou seção DEVE incrementar a versão MINOR.
- Clarificações e correções de texto DEVEM incrementar a versão PATCH.
- Após emenda, o campo `Last Amended` DEVE ser atualizado com a data ISO.

**Compliance em PRs**:
- Todo PR DEVE referenciar a spec aprovada (Princípio I).
- PRs que violem os princípios não negociáveis (I, IV, XI, XXIII) DEVEM
  ser bloqueados pelo revisor.
- O Constitution Check no `plan-template.md` DEVE ser preenchido antes
  da implementação de qualquer feature.

**Revisão Periódica**:
- A Constituição DEVE ser revisada a cada ciclo de release maior ou
  quando o domínio da cooperativa mudar significativamente.

**Version**: 1.0.0 | **Ratified**: 2026-06-29 | **Last Amended**: 2026-06-29
