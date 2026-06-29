# Spec Draft — 001 MVP Core

## Nome da feature

MVP Core do EcoFluxo

## Objetivo

Criar a primeira versão funcional do sistema EcoFluxo, permitindo que uma cooperativa registre sua operação principal: cadastros, rotas, coletas, entrada de material bruto, triagem, estoque pronto, vendas, financeiro, rateio, EPIs, veículos, presença opcional e relatórios iniciais.

## Usuários envolvidos

- Administrador do sistema
- Gestor da cooperativa
- Financeiro
- Operacional/coleta
- Triagem/estoque
- Cooperado
- Comprador

## User stories principais

### US01 — Acessar o sistema com permissão adequada

Como usuário do sistema, quero fazer login e acessar apenas as funcionalidades permitidas ao meu perfil.

### US02 — Cadastrar cooperados

Como gestor, quero cadastrar cooperados e suas informações para controlar participação, EPIs, presença e rateio.

### US03 — Cadastrar materiais flexíveis

Como gestor, quero cadastrar materiais, categorias, subcategorias e unidades para controlar diferentes tipos de recicláveis.

### US04 — Planejar e registrar rotas de coleta

Como responsável operacional, quero criar rotas com mapa, pontos de coleta, veículo e equipe para registrar coletas realizadas.

### US05 — Registrar entrada de material bruto

Como equipe operacional, quero registrar manualmente a entrada de material bruto para gerar estoque não triado.

### US06 — Realizar triagem

Como equipe de triagem, quero transformar material bruto em materiais prontos, registrando perdas e rejeitos.

### US07 — Vender material para comprador

Como gestor ou financeiro, quero registrar venda de material pronto para comprador, baixar estoque e gerar receita/conta a receber.

### US08 — Controlar financeiro completo

Como financeiro, quero controlar fluxo de caixa, contas a pagar, contas a receber e centros de custo.

### US09 — Calcular rateio

Como gestor, quero configurar regras de rateio e processar valores para os cooperados.

### US10 — Controlar EPIs

Como gestor, quero registrar entrega de EPIs aos cooperados e emitir termo de entrega.

### US11 — Acompanhar indicadores

Como gestor, quero visualizar relatórios sobre rotas, materiais, compradores, estoque, financeiro e produtividade.

## Critérios de aceite iniciais

- O sistema deve impedir acesso sem autenticação.
- Cada usuário deve ver apenas menus e ações permitidos.
- O estoque bruto deve aumentar ao registrar entrada de material.
- A triagem deve reduzir estoque bruto e aumentar estoque pronto.
- A venda deve reduzir estoque pronto e gerar registro financeiro.
- Ajustes de estoque devem ser auditados.
- Rateios devem manter memória da regra usada.
- Entregas de EPI devem gerar histórico por cooperado.
- Relatórios principais devem permitir filtro por período.
- Comprador deve acessar apenas o portal e seus próprios dados/documentos.
