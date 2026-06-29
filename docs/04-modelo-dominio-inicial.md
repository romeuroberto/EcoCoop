# 04 — Modelo de Domínio Inicial

## Entidades principais

### Cooperativa

Representa a instância cliente do sistema.

Campos iniciais:

- id
- nome
- CNPJ
- endereço
- telefone
- email
- configurações operacionais
- configurações financeiras

### Usuário

Pessoa com acesso ao sistema.

- id
- nome
- email/login
- senha hash
- status
- perfil
- cooperado vinculado, quando aplicável

### Cooperado

Membro da cooperativa.

- id
- nome
- documento
- contato
- função
- status
- data de entrada
- dados para rateio

### Comprador

Pessoa ou empresa que compra material reciclável.

- id
- nome/razão social
- documento
- contato
- endereço
- usuário de portal, quando aplicável

### Material

Tipo de material reciclável.

- id
- nome
- categoria
- subcategoria
- unidade padrão
- preço referência
- status

### Unidade de medida

Permite flexibilidade de estoque.

- id
- nome
- sigla
- tipo: peso, volume, unidade, pacote, fardo, bag, saco, outro
- fator de conversão opcional

### Veículo

Veículo usado pela cooperativa.

- id
- placa
- tipo
- capacidade
- status
- documentos
- custos

### Rota

Plano de coleta com mapa e pontos.

- id
- nome
- descrição
- pontos
- veículo padrão
- equipe padrão
- distância estimada
- custo estimado
- status

### Ponto de coleta

Local de coleta dentro de uma rota.

- id
- nome
- endereço
- coordenadas
- contato
- observações

### Coleta

Execução ou registro de material coletado.

- id
- rota
- ponto
- veículo
- responsáveis
- data
- materiais estimados/coletados
- custos
- observações

### Entrada de material

Registro da chegada do material à cooperativa.

- id
- origem
- coleta/rota vinculada
- data
- responsável
- itens
- status

### Lote de material bruto

Material ainda não triado.

- id
- origem
- material presumido
- quantidade
- unidade
- data de entrada
- status

### Triagem

Processo de separação/classificação.

- id
- lote bruto origem
- responsáveis
- data
- itens gerados
- rejeitos
- perdas

### Lote de material pronto

Material triado disponível para venda.

- id
- material
- categoria/subcategoria
- qualidade
- quantidade
- unidade
- localização
- status

### Venda

Saída de material para comprador.

- id
- comprador
- data
- itens vendidos
- valor total
- documentos
- status financeiro

### Movimento financeiro

Lançamento financeiro.

- id
- tipo: receita/despesa
- categoria
- centro de custo
- valor
- vencimento
- pagamento
- status
- vínculo operacional

### Rateio

Processamento de distribuição de ganhos.

- id
- período
- regra usada
- valor base
- descontos
- ajustes
- itens por cooperado
- status

### EPI

Item de proteção controlado.

- id
- tipo
- descrição
- validade padrão
- estoque opcional

### Entrega de EPI

Registro da entrega ao cooperado.

- id
- cooperado
- EPI
- data
- validade
- responsável
- termo/documento

### Presença

Controle opcional de presença.

- id
- cooperado
- data
- status
- observação

### Documento

Documento emitido ou anexado.

- id
- tipo
- entidade vinculada
- arquivo
- número
- data
- status

### Auditoria

Registro de eventos críticos.

- id
- usuário
- ação
- entidade
- entidade_id
- dados anteriores
- dados novos
- data/hora
