# FACULDADE GRAN

https://faculdade.grancursosonline.com.br/

Projeto Disciplina Projeto Integrador

## Sistema de Controle de Estoque

Autor: Rubens Melo

Projeto para cadastro de produtos, fornecedores e associação entre eles.

## Como executar

Instale o Node.js, abra um terminal na pasta do projeto e execute:

```bat
npm.cmd install
node criar-tabelas.js
node app.js
```

`criar-tabelas.js` cria apenas as tabelas que ainda não existem. O banco
`estoque.db` permanece na pasta do projeto; guarde uma cópia dele antes de
qualquer limpeza manual. A API fica em `http://localhost:3000/`.
Para parar o servidor, pressione `Ctrl + C` no terminal. Depois de alterar
`app.js`, inicie o servidor novamente.

## Rotas da API

As rotas ficam em três controladores: `controllers/produtos.js` cuida do
cadastro de produtos, `controllers/fornecedores.js` cuida dos fornecedores e
`controllers/associacoes.js` cuida dos vínculos entre ambos. `app.js` prepara
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

## Coleção do Insomnia

O arquivo [conectabyte-insomnia](conectabyte-insomnia) é a coleção exportada
no formato Insomnia v5, com as 14 requisições acima. Importe-o pelo menu de coleção
do Insomnia, usando **Import > From File**. O arquivo guarda exemplos com IDs
usados durante os testes; após cadastrar ou excluir registros, confira os IDs
atuais antes de reenviar POST, PUT ou DELETE. A coleção não inclui o banco
`estoque.db` nem as respostas anteriores.

## Página de produtos em React

A primeira página do frontend está em `frontend/`. Com o backend iniciado em
um terminal (`node app.js`), abra outro terminal na pasta do projeto:

```bat
npm.cmd install --prefix frontend
npm.cmd run dev --prefix frontend
```

Abra o endereço mostrado pelo Vite (normalmente `http://127.0.0.1:5173/`).
A página lista, busca, cadastra, edita e exclui produtos usando as rotas reais
da API. O servidor de desenvolvimento encaminha as chamadas `/api` para a
API em `http://localhost:3000`; por isso, ambos devem estar iniciados.

Para conferir se o frontend compila, execute `npm.cmd run build --prefix frontend`.
As páginas de fornecedores e associações serão adicionadas depois.

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

Execute `npm.cmd test` no PowerShell ou `npm test` no Prompt de Comando.
Os testes usam exclusivamente SQLite em memória e uma porta HTTP temporária;
não abrem nem alteram `estoque.db`.
