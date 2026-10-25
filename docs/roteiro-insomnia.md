# Demonstração da API no Insomnia

A coleção `conectabyte-insomnia` contém 18 requisições numeradas, incluindo
as quatro rotas de unidades e movimentações. O formato é Insomnia v5, YAML,
com objetos JSON em fluxo. Importe pelo comando **Import / From File**, escolha
o arquivo `conectabyte-insomnia` da raiz e confirme a importação. Se o seletor
filtrar extensões, selecione todos os arquivos. Abra a coleção
**ConectaByte - Demonstração completa** e ordene pelo nome para seguir 01 a 18.

## Preparar a execução

Use uma cópia do projeto para demonstração. Nessa cópia, após instalar as
dependências, execute `npm.cmd run preparar:exemplo` se ainda não houver
`estoque.db`, ou copie o arquivo pronto `exemplos/estoque.db` como `estoque.db`
na raiz dessa outra cópia. Inicie `node app.js`. Se o servidor de desenvolvimento
já estiver usando a porta 3000, encerre-o antes de iniciar o da demonstração.

No **Base Environment** da coleção estão estas variáveis:

```json
{
  "base_url": "http://localhost:3000",
  "produto_teste_id": 0,
  "fornecedor_teste_id": 0
}
```

Mantenha os IDs em zero antes da primeira execução. As requisições 05 e 07
capturam automaticamente os IDs retornados pelo servidor. Não é preciso
digitar 21 ou 15 nem usar IDs de uma sessão anterior. A criação de teste usa
um código de produto e um CNPJ próprios, separados dos registros da carga.
Os scripts usam o Base Environment; não crie variáveis com os mesmos nomes
em subambientes ou ambientes globais.

A captura usa `insomnia.response.json()` e `insomnia.baseEnvironment.set()`,
conforme a [documentação oficial de scripts](https://developer.konghq.com/insomnia/scripts/).
O arquivo preserva a estrutura v5 descrita na
[referência de importação do Insomnia](https://developer.konghq.com/insomnia/import-export/).

## Executar em ordem

Abra cada requisição e clique em **Send**. Confira o status e a aba **Tests**:
cada resposta tem uma verificação automática de status.

| Ordem | Requisição | Status esperado |
| --- | --- | --- |
| 01 | Listar os 20 produtos iniciais | 200 |
| 02 | Consultar o produto de exemplo, ID 1 | 200 |
| 03 | Listar os 14 fornecedores iniciais | 200 |
| 04 | Consultar o fornecedor de exemplo, ID 1 | 200 |
| 05 | Cadastrar mouse de teste com 15 peças e capturar seu ID | 201 |
| 06 | Editar nome, descrição e preço do mouse | 200 |
| 07 | Cadastrar fornecedor de teste e capturar seu ID | 201 |
| 08 | Editar o fornecedor de teste | 200 |
| 09 | Vincular os dois registros criados | 201 |
| 10 | Consultar fornecedores do produto de teste | 200 |
| 11 | Consultar produtos do fornecedor de teste | 200 |
| 12 | Listar as nove unidades | 200 |
| 13 | Consultar estoque de Fortaleza | 200 |
| 14 | Transferir duas peças do mouse de Fortaleza para São Luís | 201 |
| 15 | Consultar histórico de movimentações | 200 |
| 16 | Remover apenas o vínculo de teste | 204 |
| 17 | Excluir o produto de teste | 204 |
| 18 | Excluir o fornecedor de teste | 204 |

GET e DELETE não enviam corpo JSON. O JSON exibido à direita é a resposta da
API. POST e PUT já têm o corpo configurado à esquerda na aba **Body**.

Na requisição 06, `quantidade` permanece em **15**: a edição do cadastro
preserva o estoque. Na requisição 14, a transferência deixa **13 peças em
Fortaleza e duas em São Luís**, mantendo o total em 15. Os campos numéricos
com variáveis, como `fornecedor_id`, ficam sem aspas no corpo JSON.

## Concluir ou repetir

Depois de 18, as variáveis de teste voltam a zero. O catálogo original, seus
40 vínculos e seus saldos ficam preservados. O histórico mantém os registros
da demonstração, mesmo após excluir o mouse; os próximos IDs podem aumentar.
É possível executar novamente de 01 a 18, pois os novos IDs serão capturados.

Se parar no meio, retome a próxima requisição pendente. O cadastro é bloqueado
quando já há ID de teste salvo, evitando criar registros órfãos por repetição.
Edição, associação e exclusão são bloqueadas enquanto seus IDs estiverem em
zero. Não altere essas variáveis para apontar a produtos ou fornecedores da carga.
Se aparecer um erro de status, confira a resposta antes de prosseguir.

## Validação realizada

O teste automatizado lê as requisições e scripts deste próprio arquivo,
prepara um SQLite separado em memória com a carga de demonstração e registra
os quatro controladores reais. Executa o roteiro duas vezes (**36 chamadas
HTTP**), verifica os IDs crescentes, os saldos 13/2, a integridade e a
preservação de todos os cadastros, vínculos e saldos iniciais. A execução dos
scripts usa uma simulação das APIs de ambiente e testes do Insomnia; a
importação pela interface do aplicativo ainda deve ser conferida ao abrir
o arquivo no computador do avaliador.
