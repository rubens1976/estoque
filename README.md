# FACULDADE GRAN

https://faculdade.grancursosonline.com.br/

Projeto Disciplina Projeto Integrador

## Sistema de Controle de Estoque

Autor: Rubens Melo

Projeto para cadastro de produtos, fornecedores e associação entre eles.

## Unidades da empresa

No cenário do projeto, a sede da ConectaByte Informática fica em Fortaleza
e as oito filiais planejadas ficam nas demais capitais nordestinas. Veja os
[shoppings, endereços verificados e números de loja fictícios](docs/unidades-conectabyte.md).
Essas unidades da empresa são distintas dos fornecedores cadastrados na API.
Elas também aparecem na opção **Unidades** do frontend, identificadas como
parte do cenário acadêmico.
Essa tela também permite consultar saldos por loja e registrar entradas,
saídas e transferências com histórico. Veja [estoque por unidade](docs/estoque-por-unidade.md).

## Como executar

Para iniciar também a interface React, siga o
[guia completo do frontend](frontend/README.md), com os dois terminais,
preparação dos dados de exemplo, telas disponíveis e solução de problemas.

Instale o Node.js, abra um terminal na pasta do projeto e execute:

```bat
npm.cmd install
node criar-tabelas.js
node app.js
```

`criar-tabelas.js` cria as tabelas, cadastra as nove unidades e prepara o estoque
por loja. Para atualizar um banco antigo com cópia de segurança automática,
execute `npm.cmd run migrar:unidades` antes de iniciar a API. A migração pode ser
repetida sem redistribuir os saldos existentes. O banco
`estoque.db` permanece na pasta do projeto; guarde uma cópia dele antes de
qualquer limpeza manual. A API fica em `http://localhost:3000/`.
Para parar o servidor, pressione `Ctrl + C` no terminal. Depois de alterar
`app.js`, inicie o servidor novamente.

## Rotas da API

As rotas ficam em quatro controladores: `controllers/produtos.js` cuida do
cadastro de produtos, `controllers/fornecedores.js` cuida dos fornecedores e
`controllers/associacoes.js` cuida dos vínculos e `controllers/estoque.js`
cuida das unidades e movimentações. `app.js` prepara
o servidor e registra esses controladores.

| Método | Endereço | Função |
| --- | --- | --- |
| GET | `/produtos` | Listar produtos |
| GET | `/produtos/:id` | Consultar produto |
| POST | `/produtos` | Cadastrar produto |
| PUT | `/produtos/:id` | Editar produto |
| DELETE | `/produtos/:id` | Excluir produto |
| GET | `/fornecedores` | Listar fornecedores |
| GET | `/fornecedores/:id` | Consultar fornecedor |
| POST | `/fornecedores` | Cadastrar fornecedor |
| PUT | `/fornecedores/:id` | Editar fornecedor |
| DELETE | `/fornecedores/:id` | Excluir fornecedor |
| POST | `/produtos/:id/fornecedores` | Vincular fornecedor ao produto |
| GET | `/produtos/:id/fornecedores` | Listar fornecedores do produto |
| GET | `/fornecedores/:id/produtos` | Listar produtos do fornecedor |
| DELETE | `/produtos/:id/fornecedores/:fornecedorId` | Remover vínculo |
| GET | `/unidades` | Resumo dos saldos das nove unidades |
| GET | `/unidades/:id/estoque` | Produtos e saldos de uma unidade |
| GET | `/estoque/movimentacoes` | Últimos 100 registros de estoque |
| POST | `/estoque/movimentacoes` | Registrar entrada, saída ou transferência |

Substitua `:id` e `:fornecedorId` pelos números retornados ao cadastrar os
registros. Consultas GET e exclusões DELETE não precisam de JSON no corpo.
Cadastros POST e edições PUT precisam de `Content-Type: application/json`.
Respostas comuns: `200` em consultas e edições, `201` em cadastros e vínculos,
`204` sem corpo em exclusões, `400` para dados inválidos, `404` para registros
ausentes e `409` para valores ou vínculos duplicados.

## Cadastro de produto

Envie `POST /produtos` com JSON como este:

```json
{
  "nome": "Teclado USB",
  "descricao": "Teclado para computador",
  "codigo_barras": "7891234567890",
  "preco": 89.9,
  "quantidade": 10
}
```

`nome` e `codigo_barras` são textos obrigatórios; o código deve ser único.
`preco` é um número maior ou igual a zero. `quantidade` é um inteiro maior
ou igual a zero e assume zero quando omitida. `descricao` é opcional no
cadastro e assume texto vazio. Em `PUT /produtos/:id`, envie os cinco campos.
Após preparar o estoque por unidade, o saldo inicial de um produto novo entra
na sede. Em edições, mantenha a quantidade total atual; alterações de saldo
são feitas por movimentações. Alterar o total diretamente retorna `409`.

## Produtos do CSV de demonstração

O arquivo `estoque_loja_informatica.csv`, preparado para este projeto, contém
19 produtos. Para conferir quantos ainda faltam no banco, execute
`npm.cmd run importar:produtos`. Para importar, execute
`npm.cmd run importar:produtos -- --aplicar`. O importador faz uma cópia de
segurança de `estoque.db` em `backups/` antes de gravar; essa pasta fica fora
do Git. Produtos já cadastrados com o mesmo nome são preservados, sem
sobrescrever preço ou quantidade.

O CSV não traz `codigo_barras`, obrigatório no cadastro. Por isso, a carga usa
identificadores internos estáveis com prefixo `DEMO-CB-` nesse campo. **Eles
são fictícios e não são códigos de barras reais.** Preços, descrições e
quantidades vêm do CSV; não representam uma verificação de preços atuais,
disponibilidade ou especificações dos fabricantes.

Após a importação, a revisão dos 19 preços e descrições pode ser conferida com
`npm.cmd run revisar:catalogo` e aplicada com
`npm.cmd run revisar:catalogo -- --aplicar`. Essa operação faz backup do banco,
atualiza só preço e descrição e preserva quantidades e vínculos. A metodologia
e as referências estão em [revisao-catalogo-e-distribuicao.md](docs/revisao-catalogo-e-distribuicao.md).
O CSV original está preservado localmente em `backups/`.

Para gerar o plano inicial de quantidades para a sede e as oito filiais,
execute `npm.cmd run planejar:distribuicao`. O relatório resultante fica em
[distribuicao-inicial.csv](docs/distribuicao-inicial.csv). O rateio soma o total
de cada produto. O arquivo é uma referência de planejamento: os saldos
operacionais passam a ser consultados na tela **Unidades** ou na API.

## Coleção do Insomnia

O arquivo [conectabyte-insomnia](conectabyte-insomnia) é a coleção exportada
no formato Insomnia v5, com as 14 requisições originais de produtos, fornecedores
e vínculos. As quatro novas rotas de estoque estão documentadas em
[estoque-por-unidade.md](docs/estoque-por-unidade.md). Importe a coleção pelo menu
do Insomnia, usando **Import > From File**. O arquivo guarda exemplos com IDs
usados durante os testes; após cadastrar ou excluir registros, confira os IDs
atuais antes de reenviar POST, PUT ou DELETE. A coleção não inclui o banco
`estoque.db` nem as respostas anteriores.

## Interface em React

A interface está em `frontend/`. Com o backend iniciado em
um terminal (`node app.js`), abra outro terminal na pasta do projeto:

```bat
npm.cmd install --prefix frontend
npm.cmd run dev --prefix frontend
```

Abra o endereço mostrado pelo Vite (normalmente `http://127.0.0.1:5173/`).
As páginas listam, buscam, cadastram, editam e excluem produtos e fornecedores
usando as rotas reais da API. O servidor de desenvolvimento encaminha `/api` para a
API em `http://localhost:3000`; por isso, ambos devem estar iniciados.

Para conferir se o frontend compila, execute `npm.cmd run build --prefix frontend`.
Na opção **Associações**, selecione um produto para ver seus fornecedores,
vincular outro ou remover apenas o vínculo. A segunda consulta mostra os
produtos de um fornecedor selecionado. Essas ações usam as rotas da API e
preservam os cadastros de produtos e fornecedores.

## Fornecedores de exemplo

Para preencher a lista com dados fictícios de demonstração, depois de criar as
tabelas execute `npm.cmd run exemplo:fornecedores`. A carga acrescenta quatorze
fornecedores com CNPJ válido, telefone, e-mail e endereço, incluindo um em cada
estado do Nordeste, e completa os campos
vazios da `Distribuidora Teste` se ela existir. Executar novamente não cria
duplicatas nem substitui os dados já preenchidos. Os contatos e endereços são
fictícios; os e-mails usam `example.com`. Os CNPJs são números de exemplo com
dígitos verificadores válidos, não dados de empresas reais. O banco local `estoque.db` continua
fora do Git.

## Vínculos de exemplo

Depois de importar os produtos do CSV e cadastrar os fornecedores de exemplo,
execute `npm.cmd run exemplo:vinculos` para conferir a prévia. Para gravar,
execute `npm.cmd run exemplo:vinculos -- --aplicar`. A carga cria dois vínculos
por produto (40 ao todo), usando nomes de produtos e CNPJs fictícios para
localizar os registros, sem depender dos IDs do banco. Ela não altera os
cadastros nem duplica vínculos ao ser executada novamente. Antes de gravar,
faz uma cópia de `estoque.db` em `backups/`, fora do Git.

Essas associações são **apenas ilustrativas para a avaliação acadêmica**.
Não foram verificadas relações comerciais entre as marcas dos produtos e os
fornecedores fictícios.

## Cadastro de fornecedores

Envie `POST /fornecedores` com `Content-Type: application/json`.
Nome e CNPJ são obrigatórios. Telefone, e-mail e endereço são opcionais;
quando omitidos, são gravados como texto vazio.

```json
{
  "nome": "Distribuidora de Informática Teste",
  "cnpj": "11.222.333/0001-81",
  "telefone": "(11) 99999-1234",
  "email": "contato@example.com",
  "endereco": "Rua de Teste, 10"
}
```

Exemplo para testes; não representa um fornecedor verificado.
O CNPJ deve ser texto e pode ser numérico ou alfanumérico, com ou sem
pontuação. Seus dígitos verificadores são conferidos e ele é salvo sem
pontuação, em maiúsculas. Isso não consulta existência ou situação cadastral
na Receita Federal. A regra segue o
[manual oficial de cálculo](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/cnpj/manual-dv-cnpj.pdf).
Telefone preenchido deve ter 8 a 15 dígitos; aceita espaços, parênteses,
pontos, hífens e `+` no início. E-mail preenchido deve ter formato básico válido.
Os campos de texto têm espaços nas extremidades removidos.

Respostas: `201` com ID e dados cadastrados; `400` para dados inválidos;
`409` para CNPJ duplicado; `500` para falha interna.
Consulte os registros com `GET /fornecedores`.

## Consulta de fornecedor por ID

Envie `GET /fornecedores/:id`, substituindo `:id` pelo identificador.
Exemplo: `http://localhost:3000/fornecedores/1`.
Retorna `200` com um objeto contendo os dados do fornecedor, `400` se o ID
não for um inteiro seguro positivo, `404` se o fornecedor não existir e `500`
em caso de falha interna. A consulta não altera os dados do banco.

## Edição de fornecedor

Envie `PUT /fornecedores/:id` com `Content-Type: application/json`.
A edição é completa: envie `nome`, `cnpj`, `telefone`, `email` e `endereco`.
Telefone, e-mail e endereço podem ser `""` para limpar o campo, mas não podem
ser omitidos. Nome e CNPJ devem estar preenchidos. As regras de validação
e normalização são as mesmas do cadastro.

```json
{
  "nome": "Distribuidora Teste Atualizada",
  "cnpj": "11.222.333/0001-81",
  "telefone": "(11) 99999-1234",
  "email": "contato@example.com",
  "endereco": "Rua de Teste, 10"
}
```

Retorna `200` com ID e dados atualizados, `400` para ID ou dados inválidos,
`404` para fornecedor inexistente, `409` para CNPJ já usado por outro fornecedor
e `500` para falha interna. Manter o próprio CNPJ é permitido.

## Exclusão de fornecedor

Envie `DELETE /fornecedores/:id`, substituindo `:id` pelo identificador.
Não é necessário enviar um corpo. A operação remove o fornecedor e seus
vínculos em `produtos_fornecedores`, preservando os produtos e os demais
fornecedores. As chaves estrangeiras são ativadas pela conexão em `database.js`.

Retorna `204` sem corpo em caso de sucesso, `400` para ID inválido,
`404` para fornecedor inexistente (inclusive se já foi excluído) e `500`
para falha interna. Após a exclusão, a consulta por ID retorna `404`.

## Vínculo entre produto e fornecedor

Envie `POST /produtos/:id/fornecedores` com `Content-Type: application/json`.
O ID do produto vai no endereço, e o ID do fornecedor deve ser um número
inteiro positivo no corpo:

```json
{
  "fornecedor_id": 2
}
```

Use IDs de registros existentes. Exemplo de endereço:
`http://localhost:3000/produtos/1/fornecedores`.
A operação grava somente o par de IDs na tabela `produtos_fornecedores`;
não altera nome, preço, quantidade ou dados do fornecedor. Permite vários
fornecedores para um produto e vários produtos para um fornecedor.

Retorna `201` com `produto_id` e `fornecedor_id`, `400` para IDs inválidos,
`404` quando produto ou fornecedor não existir, `409` para vínculo duplicado
e `500` para falha interna. Se ambos não existirem, informa primeiro o produto.

## Consulta dos fornecedores de um produto

Envie `GET /produtos/:id/fornecedores`. Exemplo:
`http://localhost:3000/produtos/1/fornecedores`.

Retorna `200` com uma lista contendo os dados completos dos fornecedores
vinculados, em ordem de ID. Produto existente sem vínculos retorna `[]`.
Retorna `400` para ID inválido, `404` para produto inexistente e `500` para
falha interna. A consulta não altera produtos, fornecedores ou vínculos.

## Consulta dos produtos de um fornecedor

Envie `GET /fornecedores/:id/produtos`. Exemplo:
`http://localhost:3000/fornecedores/2/produtos`.

Retorna `200` com uma lista contendo os dados completos dos produtos
vinculados, em ordem de ID. Fornecedor existente sem vínculos retorna `[]`.
Retorna `400` para ID inválido, `404` para fornecedor inexistente e `500`
para falha interna. A consulta não altera produtos, fornecedores ou vínculos.

## Remoção do vínculo entre produto e fornecedor

Envie `DELETE /produtos/:id/fornecedores/:fornecedorId`, sem corpo.
Exemplo: `http://localhost:3000/produtos/1/fornecedores/2`.
A operação remove somente esse par na tabela `produtos_fornecedores`.
Produto, fornecedor e os demais vínculos são preservados.

Retorna `204` sem corpo em caso de sucesso, `400` para IDs inválidos,
`404` com `Vínculo não encontrado.` se o par não existir e `500` para falha
interna. O `404` também se aplica à repetição da remoção ou à ausência de
uma das entidades. Após remover o último vínculo, as consultas da relação
retornam `200` com `[]`, enquanto os cadastros continuam acessíveis por ID.
O vínculo pode ser criado novamente usando a rota POST.

## Testes

O [ensaio de instalação em uma cópia separada](docs/ensaio-instalacao.md)
concluiu a instalação pelos lockfiles, a preparação de um banco novo, os
61 testes e a compilação do frontend. As quatro telas carregaram os dados
da API isolada. O relatório descreve o ambiente, os ajustes de portas e os
limites da conferência.

Os [resultados da sessão de testes no Insomnia de 25/10/2026](docs/resultados-testes-insomnia.md)
registram as respostas observadas, as correções, as confirmações diretas na
API e a conferência final do estoque. A regressão automatizada passou com
61 testes.

A coleção atualizada do Insomnia está em `conectabyte-insomnia`. Siga o
[roteiro numerado de demonstração](docs/roteiro-insomnia.md): os IDs dos
registros criados são capturados automaticamente, e o teste não modifica
os cadastros da carga inicial. Inclui CRUD, associações e estoque por unidade.

Execute `npm.cmd test` no PowerShell ou `npm test` no Prompt de Comando.
Os testes usam exclusivamente SQLite em memória e uma porta HTTP temporária;
não abrem nem alteram `estoque.db`.

## Preparação completa dos dados de demonstração

Em uma instalação nova, após `npm install`, execute na raiz:

```powershell
npm.cmd run preparar:exemplo
node app.js
```

O primeiro comando cria `estoque.db` com o esquema completo, 20 produtos
(19 do CSV e o Teclado USB), 14 fornecedores fictícios com todos os campos,
40 vínculos, nove unidades e 532 peças distribuídas em 180 saldos. Também
registra as alocações iniciais no histórico de estoque. Os códigos `DEMO-CB`
são identificadores de demonstração; preços e vínculos são exemplos acadêmicos.

Essa preparação substitui a execução em sequência dos scripts avulsos para
montar uma demonstração do zero. O catálogo é inserido antes da distribuição,
evitando concentrar todo o saldo na sede. Os IDs são gerados no banco novo;
os vínculos são resolvidos por nome do produto e CNPJ, sem depender dos IDs
do banco usado durante o desenvolvimento.

Se o arquivo de destino já existir, o comando encerra com erro e o preserva.
Não apague seu banco de trabalho para executar a demonstração. Para gerar uma
cópia separada, use um caminho ainda inexistente:

```powershell
npm.cmd run preparar:exemplo -- --banco exemplos/estoque.db
```

O banco separado não é usado automaticamente pelo servidor. Para avaliá-lo,
copie-o como `estoque.db` na raiz de **outra cópia do projeto**, antes de iniciar
`node app.js`. Não execute `criar-tabelas.js` antes de `preparar:exemplo`: o
comando completo já cria todas as tabelas. A carga trabalha em arquivo
temporário, verifica a integridade e publica apenas após fechar o SQLite.

O rateio conserva cada quantidade; empates usam os IDs do banco novo, portanto
alguns saldos por cidade podem diferir do banco antigo de desenvolvimento.
Os testes conferem a reprodução do rateio, a integridade, a soma dos saldos e
a proteção contra sobrescrita. O arquivo `exemplos/estoque.db` é ignorado pelo
Git pela regra atual; sua inclusão será decidida na entrega final.

## Pendência para a entrega final

- [x] Preparar banco SQLite separado com dados fictícios: `exemplos/estoque.db`.
- [ ] Decidir se o banco de exemplo será incluído no GitHub para a avaliação.
