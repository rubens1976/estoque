# ConectaByte Informática — Frontend

**Faculdade Gran — Disciplina Projeto Integrador**

**Autor: Rubens Melo**

Interface React do sistema de controle de estoque. Consome a API Express e
SQLite localizada na raiz do projeto. As telas de Produtos, Fornecedores e
Associações atendem às três partes centrais da interface descritas no material
de apoio. A tela Unidades acrescenta o controle de estoque da sede e das filiais.

## Requisitos

- Node.js compatível com o Vite 7: `^20.19.0 || >=22.12.0`.
- npm, incluído na instalação do Node.js.
- Projeto completo, incluindo backend, scripts de preparação e arquivos de dados.

O ambiente de desenvolvimento foi conferido com Node.js **24.13.1** e npm
**11.8.0**. As dependências e suas versões resolvidas estão em
`package.json` e `package-lock.json` desta pasta.

## Iniciar o sistema no Windows

Os exemplos usam PowerShell e o caminho `C:\estoque`. Adapte o caminho se
salvou o projeto em outra pasta. São necessários **dois terminais abertos**.
No Prompt de Comando os mesmos comandos funcionam; em outros sistemas use
`npm` no lugar de `npm.cmd` e adapte os caminhos.

### Terminal 1 — API e banco

Na primeira instalação, com a pasta do projeto ainda sem `estoque.db`:

```powershell
cd C:\estoque
npm.cmd ci
npm.cmd run preparar:exemplo
node app.js
```

A preparação cria o banco completo com 20 produtos, 14 fornecedores fictícios,
40 vínculos e 532 peças distribuídas entre nove unidades. Ela recusa
sobrescrever um banco existente. Veja as opções de preparação no
[README principal](../README.md#preparação-completa-dos-dados-de-demonstração).

Se o banco já está preparado, basta executar `node app.js` na raiz; não
repita a carga nem apague o banco. Para um banco antigo ainda sem estoque por
unidade, consulte as instruções de migração no README principal.

A API fica em `http://localhost:3000`. Para confirmar que está funcionando,
abra `http://localhost:3000/produtos`: a resposta deve ser uma lista JSON.
Mantenha esse terminal aberto.

### Terminal 2 — interface

Na primeira instalação:

```powershell
cd C:\estoque
npm.cmd ci --prefix frontend
npm.cmd run dev --prefix frontend
```

Nas próximas execuções, use apenas o último comando. Abra no navegador o
endereço exibido pelo Vite, normalmente **http://127.0.0.1:5173/**.
Se a porta estiver ocupada, o Vite pode escolher outra; confira o terminal.
Mantenha os dois servidores ativos durante o uso. Para encerrar cada um,
pressione `Ctrl+C` no respectivo terminal.

Se já estiver dentro de `C:\estoque\frontend`, execute `npm.cmd ci` e
`npm.cmd run dev`, sem `--prefix frontend`.

## Telas e roteiro de avaliação

Use o menu lateral para alternar entre as telas. A navegação é controlada
pelo estado React: o endereço permanece na raiz, sem rotas como `/produtos`.

| Tela | Operações disponíveis |
| --- | --- |
| Produtos | Listar, pesquisar, cadastrar, editar e excluir; consultar preço e quantidade total |
| Fornecedores | Listar, pesquisar, cadastrar, editar e excluir; informar nome, CNPJ, telefone, e-mail e endereço |
| Associações | Vincular fornecedor a produto, remover vínculo e consultar a relação nos dois sentidos |
| Unidades | Consultar as nove unidades e seus saldos; registrar entrada, saída e transferência; consultar histórico |

Para uma demonstração manual em uma cópia do projeto com dados de exemplo:

1. Em Produtos, cadastre um produto temporário com código único e quantidade inicial.
2. Edite seu nome, descrição ou preço. A quantidade fica bloqueada na edição:
   mudanças de saldo devem ser registradas em Unidades.
3. Em Fornecedores, cadastre um fornecedor temporário com CNPJ válido e único
   e edite seus contatos. Use dados fictícios, como os exemplos da coleção.
4. Em Associações, selecione os dois registros, crie o vínculo e confira as
   consultas por produto e por fornecedor.
5. Em Unidades, confira o estoque inicial do produto na sede de Fortaleza.
   Transfira uma quantidade disponível para outra unidade e confira os saldos
   e o histórico. A transferência conserva o total do produto.
6. Remova o vínculo em Associações e exclua os cadastros temporários nas telas
   correspondentes. As movimentações permanecem no histórico após a exclusão.

As exclusões pedem confirmação. Mensagens de validação, conflito ou saldo
insuficiente devem ser resolvidas antes de repetir uma operação. Detalhes
das regras estão em [Estoque por unidade](../docs/estoque-por-unidade.md).
O [roteiro do Insomnia](../docs/roteiro-insomnia.md) testa a API; os
[resultados registrados](../docs/resultados-testes-insomnia.md) não substituem
um ensaio completo destas telas.

## Comunicação com a API

O frontend usa `fetch()` com caminhos iniciados por `/api`. Durante
`npm.cmd run dev`, o proxy de `vite.config.js` encaminha essas chamadas
para `http://localhost:3000`, removendo o prefixo `/api`.
Exemplo: `/api/produtos` chega ao Express como `/produtos`.
Não há variável de ambiente obrigatória nem chave de API para a execução local.
O SQLite é acessado pelo backend; o navegador não abre diretamente o banco.

## Por que Vite

O projeto usa **React 19 com Vite 7** para o servidor de desenvolvimento e
a compilação da interface. Essa configuração oferece os comandos já adotados
no projeto e mantém componentes React consumindo a API.

O material do professor exemplifica `create-react-app` e `npm start`.
Aqui foi utilizada uma ferramenta de preparação diferente: o comando é
**`npm.cmd run dev`**, não `npm start`. Essa diferença está declarada para
a avaliação; a aceitação do procedimento equivalente cabe ao professor.

## Compilar e conferir a versão gerada

Na raiz do projeto:

```powershell
npm.cmd run build --prefix frontend
npm.cmd run preview --prefix frontend
```

O build produz `frontend/dist`. O preview permite inspecionar o resultado
localmente; abra o endereço informado no terminal e mantenha a API ativa
para as funcionalidades de dados. O preview não substitui hospedagem de
produção. Ao publicar os arquivos estáticos, configure também o encaminhamento
de `/api` para o backend; copiar apenas `dist` não entrega o sistema completo.

## Solução de problemas

| Sintoma | O que conferir |
| --- | --- |
| `ERR_CONNECTION_REFUSED` na página | Inicie `npm.cmd run dev --prefix frontend`, confira o endereço e recarregue |
| Interface abre, mas os dados não carregam | Confirme que `node app.js` está ativo e que `/produtos` responde na porta 3000 |
| `Missing script: start` | Use `npm.cmd run dev` dentro de `frontend`, ou acrescente `--prefix frontend` estando na raiz |
| PowerShell bloqueia `npm.ps1` | Use `npm.cmd`, como nos exemplos |
| Banco existente ao preparar exemplos | Preserve-o; use o banco atual ou uma cópia separada do projeto para a demonstração |
| Porta 3000 ocupada | Confira se a API já está em execução antes de iniciar outra instância |
| Fonte visual diferente sem internet | As fontes externas têm alternativas locais no CSS; verifique a conexão para carregar Google Fonts |

## Estrutura e verificação

`src/App.jsx` contém a estrutura principal, a tela de Produtos e o acesso à
API. `src/Fornecedores.jsx`, `src/Associacoes.jsx` e `src/Unidades.jsx` contêm
as demais telas; `src/styles.css` define a apresentação.

A compilação é conferida com `npm.cmd run build --prefix frontend`.
Os testes de API e preparação são executados na raiz com `npm.cmd test`.
Eles não são testes automatizados da interface React. A instalação em uma
cópia nova e o roteiro visual acima continuam sendo verificações separadas
da compilação.

Em **25/10/2026**, a compilação foi concluída com sucesso usando React e
React DOM **19.3.1**, Vite **7.3.7** e plugin React **5.2.0**, com as
dependências já instaladas. Os links locais desta documentação também foram
conferidos. Essa validação não incluiu reinstalar dependências em uma cópia nova.

Posteriormente, no mesmo dia, foi concluído o
[ensaio de instalação em cópia separada](../docs/ensaio-instalacao.md), com
instalação pelos lockfiles, banco novo, 61 testes, build e carregamento das
quatro telas. Consulte o relatório para os limites e o ajuste de portas.
