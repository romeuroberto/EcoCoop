# 01 — PRD v0.1 — EcoFluxo

## 1. Resumo executivo

O EcoFluxo é um sistema web para gestão integral de cooperativas de reciclagem. Ele deverá controlar o fluxo completo da operação: planejamento e execução de rotas de coleta, entrada de material bruto, triagem, formação de estoque pronto, venda para compradores, fluxo de caixa, contas a pagar e receber, rateio dos ganhos, controle de EPIs, gestão de veículos, presença dos cooperados e relatórios de inteligência.

O sistema será implantado em instâncias dedicadas por cooperativa, com uma VM própria para cada cliente.

## 2. Objetivos

- Controlar o ciclo completo do material reciclável.
- Separar claramente material bruto, material em triagem e material pronto.
- Registrar entradas, movimentações, perdas, rejeitos, vendas e destinação final.
- Controlar rotas de coleta com mapas, pontos, veículos, cooperados e custos.
- Permitir análise de lucratividade por rota, material, comprador e período.
- Controlar fluxo de caixa completo.
- Controlar contas a pagar, contas a receber, centros de custo e conciliação futura.
- Calcular rateio dos ganhos por regras configuráveis.
- Controlar entrega e renovação de EPIs.
- Controlar veículos, abastecimentos, manutenção, documentação e custos.
- Gerar documentos operacionais e administrativos.
- Fornecer portal para compradores.
- Criar relatórios gerenciais úteis para decisões da cooperativa.

## 3. Escopo do MVP

O MVP deverá entregar uma primeira versão operacional, sem tentar resolver integrações complexas logo no início.

### Incluído no MVP

- Cadastro da cooperativa.
- Cadastro de usuários e perfis de acesso.
- Login de cooperados conforme permissão.
- Cadastro de cooperados.
- Cadastro de compradores.
- Portal inicial de compradores.
- Cadastro de materiais, categorias e subcategorias.
- Cadastro de unidades de medida flexíveis.
- Cadastro de veículos.
- Gestão de rotas com mapas.
- Pontos de coleta.
- Registro manual de coletas.
- Registro manual de entrada de material bruto.
- Estoque de material bruto.
- Registro de triagem.
- Estoque de material pronto.
- Registro de rejeitos e perdas.
- Saída/venda de material para compradores.
- Fluxo de caixa completo.
- Contas a pagar.
- Contas a receber.
- Centros de custo.
- Rateio configurável.
- Controle de presença opcional.
- Controle de entrega de EPIs.
- Termo de entrega de EPI.
- Recibos.
- Romaneios.
- Comprovantes de entrega.
- Relatórios para prefeitura ou parceiros.
- Dashboard inicial de inteligência.

### Fora do MVP, mas documentado para evolução

- Integração com balança digital.
- Emissão de nota fiscal.
- Integração bancária automática.
- Aplicativo mobile nativo.
- Roteirização automática avançada.
- Inteligência artificial preditiva.
- Integração com órgãos ambientais.
- Portal público de transparência.

## 4. Perfis de acesso iniciais

### Administrador do sistema

Acesso total à instância, configurações, usuários, permissões, backups, auditoria e parâmetros gerais.

### Gestor da cooperativa

Acesso gerencial aos módulos operacionais, financeiros, relatórios, rateio, estoque, veículos, EPIs e compradores.

### Financeiro

Acesso ao fluxo de caixa, contas a pagar, contas a receber, centros de custo, receitas, despesas, conciliação, relatórios financeiros e rateios, conforme permissão.

### Operacional/coleta

Acesso a rotas, pontos de coleta, registros de coleta, veículos associados, pesagens manuais e informações operacionais.

### Triagem/estoque

Acesso a entrada de material, triagem, estoque bruto, estoque pronto, perdas, rejeitos e movimentações internas.

### Cooperado

Acesso às próprias informações, presença, EPIs recebidos, participação, rateios, lançamentos permitidos e histórico autorizado.

### Comprador

Acesso ao portal de compradores, com funcionalidades autorizadas: consultar materiais disponíveis, visualizar histórico, registrar interesse, acompanhar pedidos, baixar documentos permitidos e consultar compras.

## 5. Requisitos funcionais

### RF01 — Autenticação e permissões

O sistema deve permitir login com perfis e permissões configuráveis.

### RF02 — Gestão da cooperativa

O sistema deve manter cadastro da cooperativa, dados institucionais, configurações operacionais e parâmetros financeiros.

### RF03 — Gestão de cooperados

O sistema deve cadastrar cooperados, status, funções, documentos básicos, permissões, presença opcional, EPIs e participação no rateio.

### RF04 — Gestão de compradores

O sistema deve cadastrar compradores e permitir portal externo com acesso restrito.

### RF05 — Materiais, categorias e subcategorias

O sistema deve permitir cadastrar tipos de materiais, categorias, subcategorias, qualidade, unidades de medida, preço de referência e regras de estoque.

### RF06 — Unidades flexíveis de estoque

O sistema deve permitir controle por peso, fardo, bag, saco, unidade, volume ou outra unidade configurada.

### RF07 — Gestão de rotas com mapas

O sistema deve permitir criar rotas com pontos de coleta, visualização em mapa, veículo, equipe, custos e registros de execução.

### RF08 — Registro de coleta

O sistema deve registrar coletas realizadas, origem, ponto, rota, material estimado, quantidade, unidade, veículo, responsável e data.

### RF09 — Entrada de material bruto

O sistema deve registrar a entrada do material bruto na cooperativa, inicialmente por lançamento manual.

### RF10 — Estoque de material bruto

O sistema deve controlar material não triado, com origem, data, rota, lote, unidade e quantidade.

### RF11 — Triagem

O sistema deve registrar triagem de material bruto em materiais classificados, com rendimento, perdas, rejeitos e responsáveis.

### RF12 — Estoque de material pronto

O sistema deve controlar materiais prontos para venda por tipo, categoria, subcategoria, qualidade, quantidade, unidade, lote e localização.

### RF13 — Venda e saída de material

O sistema deve registrar vendas para compradores, preço, quantidade, documentos, forma de pagamento, status financeiro e baixa de estoque.

### RF14 — Fluxo de caixa completo

O sistema deve controlar receitas, despesas, contas a pagar, contas a receber, centros de custo, categorias financeiras e saldo por período.

### RF15 — Rateio configurável

O sistema deve calcular rateio por regras configuráveis, permitindo considerar critérios como presença, produção, função, período, descontos, adiantamentos e ajustes.

### RF16 — Presença opcional

O sistema deve permitir controle de presença, mas esse módulo poderá ser ativado ou não conforme decisão dos gestores.

### RF17 — Gestão de EPIs

O sistema deve controlar entrega de EPIs, validade, substituição, responsável, termo de entrega e histórico por cooperado.

### RF18 — Gestão de veículos

O sistema deve controlar veículos, documentos, abastecimentos, manutenções, custos, uso em rotas e disponibilidade.

### RF19 — Documentos operacionais

O sistema deve emitir recibos, romaneios, comprovantes de entrega, termos de EPI e relatórios para prefeitura/parceiros.

### RF20 — Relatórios e inteligência

O sistema deve gerar indicadores sobre rotas, materiais, compradores, estoque, fluxo financeiro, veículos, EPIs, presença, rateio e desempenho operacional.

## 6. Requisitos não funcionais

### RNF01 — Instância dedicada

Cada cooperativa deve ter ambiente próprio, banco próprio e isolamento operacional.

### RNF02 — Segurança

O sistema deve validar permissões em backend, registrar ações importantes e impedir acesso indevido a dados financeiros, rateios e informações pessoais.

### RNF03 — Auditoria

Movimentações críticas devem gerar trilha de auditoria: estoque, caixa, rateio, venda, ajustes, EPIs, usuários e permissões.

### RNF04 — Usabilidade

A interface deve ser simples, responsiva e adequada a usuários com diferentes níveis de familiaridade com tecnologia.

### RNF05 — Integridade de estoque

O sistema não deve permitir baixa, venda ou transformação de estoque sem registro de movimentação correspondente.

### RNF06 — Integridade financeira

Toda venda deve poder gerar movimentação financeira ou conta a receber. Toda despesa deve ser categorizada.

### RNF07 — Exportação

Relatórios principais devem permitir exportação para PDF e planilha.

### RNF08 — Backup

O ambiente deverá prever rotina de backup do banco e arquivos/documentos.

### RNF09 — Evolução futura

O projeto deve ser preparado para integração futura com balança digital, emissão fiscal e integrações externas.

## 7. Indicadores iniciais

- Total coletado por período.
- Total triado por período.
- Total vendido por período.
- Receita por período.
- Despesa por período.
- Resultado líquido.
- Valor disponível para rateio.
- Valor rateado por cooperado.
- Estoque bruto atual.
- Estoque pronto atual.
- Estoque por material, categoria e subcategoria.
- Rendimento da triagem.
- Percentual de rejeito.
- Rota mais lucrativa.
- Custo por rota.
- Receita por rota.
- Margem por rota.
- Material mais rentável.
- Comprador com melhor preço médio.
- Veículos com maior custo.
- EPIs vencidos ou próximos do vencimento.
- Presença por cooperado, quando o módulo estiver ativo.

## 8. Critérios de sucesso do MVP

O MVP será considerado bem-sucedido se permitir:

- Registrar a coleta e entrada de material bruto.
- Transformar material bruto em estoque pronto via triagem.
- Registrar venda para comprador e baixa de estoque.
- Refletir vendas e despesas no financeiro.
- Calcular rateio com regra configurável.
- Controlar EPIs entregues.
- Controlar veículos e custos básicos.
- Emitir documentos operacionais básicos.
- Exibir relatórios que ajudem a identificar rotas e materiais mais lucrativos.

## 9. Decisões já tomadas

- O sistema não será multi-tenant no MVP.
- Cada cliente terá uma instância/VM própria.
- Compradores terão portal.
- Lançamento de pesagem será manual inicialmente.
- Integração com balança ficará documentada para fase futura.
- Rateio será configurável.
- O MVP terá mapas para rotas.
- Cooperados terão login conforme nível de acesso.
- Presença será opcional/configurável.
- O sistema emitirá documentos, exceto NF no MVP.
- Estoque será flexível, com múltiplas unidades.
- Materiais terão categorias e subcategorias.
- Fluxo de caixa começará completo.
- Stack inicial: NestJS, React, TypeScript, Vite e PostgreSQL.
