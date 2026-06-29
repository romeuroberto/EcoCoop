# 00 — Definição Inicial do Produto

## Nome provisório

EcoFluxo

## Descrição curta

Software de gestão operacional, financeira e estratégica para cooperativas de reciclagem, cobrindo rotas de coleta, entrada de material, triagem, estoque, venda para compradores, fluxo de caixa, rateio dos ganhos, controle de EPIs, veículos, presença e relatórios de inteligência.

## Visão

Criar uma plataforma que permita à cooperativa controlar todo o ciclo do material reciclável, desde a coleta até a destinação final, mantendo rastreabilidade, controle financeiro e indicadores capazes de orientar decisões operacionais e estratégicas.

## Problema

Cooperativas de reciclagem normalmente operam com controles manuais ou fragmentados. Isso dificulta saber:

- Quanto foi coletado.
- Quanto ainda está bruto e não triado.
- Quanto já está pronto para venda.
- Quais rotas dão lucro ou prejuízo.
- Quais materiais geram melhor margem.
- Quanto cada cooperado deve receber.
- Quais compradores são mais vantajosos.
- Quais veículos geram mais custos.
- Quais EPIs foram entregues e precisam de renovação.

## Objetivo do sistema

Centralizar e organizar as informações da cooperativa, criando rastreabilidade operacional e financeira de ponta a ponta, permitindo controle diário e análise gerencial.

## Modelo de implantação

O sistema será vendido por instância dedicada. Cada cooperativa terá uma VM própria, banco próprio e ambiente próprio. Não haverá multi-tenancy lógico no MVP.

## Usuários principais

- Administrador do sistema
- Gestor da cooperativa
- Financeiro
- Operacional/coleta
- Triagem/estoque
- Cooperado
- Motorista
- Comprador externo

## Usuários externos

Os compradores terão portal próprio para acesso a informações permitidas, como disponibilidade de materiais, histórico de compras, pedidos, propostas, documentos e comprovantes.
