# 02 — Constitution Base para GitHub Spec Kit

Este arquivo deve orientar o comando `/speckit.constitution`.

## Princípios obrigatórios

### 1. Spec antes de implementação

Nenhuma funcionalidade relevante pode ser implementada sem especificação aprovada. A especificação deve explicar o que será construído, por que é necessário, quem usa e quais critérios validam a entrega.

### 2. Código guiado por domínio real

O sistema deve refletir o fluxo real da cooperativa de reciclagem: coleta, entrada, material bruto, triagem, material pronto, venda, financeiro, rateio e destinação final.

### 3. Rastreabilidade de ponta a ponta

Toda movimentação importante deve possuir histórico: estoque, triagem, venda, caixa, rateio, EPIs, veículos, presença e permissões.

### 4. Integridade de estoque

O estoque não pode ser alterado diretamente sem evento de movimentação. Toda entrada, transformação, ajuste, rejeito, venda ou saída precisa gerar registro rastreável.

### 5. Integridade financeira

Operações financeiras devem ser rastreáveis, categorizadas e auditáveis. Vendas, receitas, despesas, contas a pagar, contas a receber e rateios não podem ser lançamentos soltos sem vínculo lógico quando houver origem operacional.

### 6. Segurança e permissões no backend

A interface pode ocultar ações, mas a autorização real deve estar no backend. Todo endpoint sensível deve validar permissões.

### 7. Usabilidade operacional

A aplicação deve ser simples para uso diário por cooperados, gestores e equipe operacional. Telas de lançamento frequente devem ter o menor atrito possível.

### 8. Instância dedicada por cooperativa

O projeto não deve assumir multi-tenancy lógico no MVP. Cada cooperativa terá instância, banco e ambiente próprios.

### 9. Evolução preparada, sem antecipar complexidade desnecessária

O sistema deve documentar integrações futuras, como balança digital, nota fiscal e integrações bancárias, mas não deve implementar complexidade fora do MVP sem spec própria.

### 10. Testes proporcionais ao risco

Funcionalidades críticas devem ter testes antes ou junto da implementação: estoque, financeiro, rateio, autenticação, permissões e vendas.

### 11. ADR para decisões estruturais

Mudanças arquiteturais, escolha de biblioteca crítica, modelo de banco, mecanismo de autorização, estratégia de deploy e integrações externas devem gerar ADR.

### 12. Relatórios como inteligência, não apenas listagens

Relatórios devem ajudar a cooperativa a decidir melhor, especialmente sobre rotas lucrativas, materiais rentáveis, compradores, custos, estoque e produtividade.
