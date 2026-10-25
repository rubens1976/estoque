# Estoque por unidade

A tela **Unidades** mostra os saldos da sede de Fortaleza e das oito filiais
do cenário acadêmico. Clique em **Ver estoque** no cartão de uma loja para
consultar seus produtos, inclusive os que estão zerados, ou use o seletor de
unidade junto da busca. O resumo da rede soma os saldos das nove localidades.
O valor exibido é calculado pelo preço de venda cadastrado, não pelo custo.

## Uso da interface

1. Abra **Unidades** e escolha a loja.
2. Clique em **Movimentar estoque** ou em **Movimentar** ao lado de um produto.
3. Escolha entrada, saída ou transferência, produto e unidades envolvidas.
4. Informe a quantidade inteira e um motivo de 3 a 200 caracteres.
5. Confirme a operação e confira o saldo e o histórico.

Uma entrada representa recebimento ou ajuste positivo. Uma saída representa
venda, perda ou ajuste negativo, sempre explicado no motivo. Uma transferência
debita a origem e credita o destino sem alterar o total da empresa. Ela é
imediata neste projeto; não há etapa de mercadoria em trânsito ou recebimento
pendente. A origem e o destino devem ser diferentes e a origem precisa ter
saldo suficiente. O formulário informa o saldo disponível, e o banco volta a
validá-lo ao gravar, inclusive em requisições simultâneas.

## Migração e integridade

Para um banco já existente, pare a API e execute:

```bat
npm.cmd run migrar:unidades
node app.js
```

A migração faz uma cópia do banco em `backups/` e aplica a distribuição inicial
apenas aos produtos ainda sem saldos. Pode ser repetida sem refazer o rateio.
Para instalações novas, `node criar-tabelas.js` prepara também essas tabelas.
Um produto novo recebe seu estoque inicial na sede; a redistribuição posterior
é feita por transferências.

`estoque_unidades` possui uma chave única por produto e unidade, com saldo
inteiro não negativo. `produtos.quantidade` passa a ser um total sincronizado
por gatilhos SQLite, sempre igual à soma das lojas. O banco bloqueia a edição
direta desse total para que os ajustes tenham registro. Os demais dados do
produto continuam editáveis.

A movimentação é inserida em uma única instrução SQLite. Os gatilhos validam
os dados e executam débito e crédito dentro da mesma operação atômica: se
qualquer parte falhar, os saldos e o histórico são revertidos juntos. A API
não oferece edição ou exclusão do histórico; correções são novas movimentações
com motivo. Quando um produto é excluído pelo cadastro, seus saldos e vínculos
com fornecedores são removidos, mas o histórico preserva nome e código do
produto e passa a ter `produto_id: null`.

## API

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/unidades` | Unidades com endereço, quantidade, valor e número de produtos com saldo |
| GET | `/unidades/:id/estoque` | Objeto com `unidade` e lista `produtos`, com quantidade local |
| GET | `/estoque/movimentacoes` | Últimos 100 movimentos da rede, do mais recente para o mais antigo |
| POST | `/estoque/movimentacoes` | Movimento criado com `201` |

Exemplo de transferência (confira IDs e saldo antes de enviar):

```json
{
  "tipo": "transferencia",
  "produto_id": 1,
  "origem_id": 1,
  "destino_id": 2,
  "quantidade": 1,
  "motivo": "Reposição da filial de São Luís"
}
```

Para `entrada`, envie `origem_id: null` e informe `destino_id`. Para `saida`,
informe `origem_id` e envie `destino_id: null`. IDs e quantidade devem ser
números inteiros seguros positivos. Respostas: `400` para campos inválidos,
`404` para produto/unidade inexistente, `409` para saldo insuficiente ou limite
numérico excedido e `500` para falha interna, sem detalhes SQL na resposta.

## Verificação

Os testes usam SQLite em memória e cobrem migração repetida, preservação dos
totais, entradas, saídas, falta de saldo, transferências concorrentes,
reversão quando o crédito falha, limites numéricos e preservação do histórico
após excluir um produto. Na validação da interface foram registradas uma
transferência de teste Fortaleza → São Luís e sua devolução, identificadas
no motivo; os saldos iniciais foram restaurados e o total permaneceu em 532.
