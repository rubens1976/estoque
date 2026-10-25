# Conferência das orientações do professor

Data: 25/10/2026. Versão analisada: `c323b67`.

**Complemento de 25/10/2026, após acesso ao enunciado da plataforma:** a Etapa 1
pede o link do GitHub. A Etapa 2 exige serviços REST executando na nuvem e um
documento com três chamadas funcionais para avaliação pelo Insomnia. O campo
de envio aceita PDF de até 5 MB. Essas exigências não constavam do material
de apoio usado na auditoria original abaixo e prevalecem sobre suas conclusões
sobre hospedagem e formato de entrega. Consulte o
[roteiro de publicação](publicacao-api.md). O enunciado específico da Etapa 3
ainda precisa ser conferido.

Atualização posterior à auditoria: a preparação dos dados e a coleção foram
corrigidas na cópia de trabalho. Os [resultados da execução no Insomnia](resultados-testes-insomnia.md)
documentam a importação no aplicativo, as operações verificadas, as limitações
das capturas de exclusão e a nova regressão com 61 testes aprovados. Essa
atualização ainda não corresponde a um novo commit.

**Conclusão:** o projeto contém as funcionalidades centrais descritas no
material: CRUD de produtos, CRUD de fornecedores e associação muitos para
muitos, no backend e em três páginas React que consomem a API. As pendências
encontradas estão principalmente na reprodução dos dados de demonstração e
na preparação da entrega. Há diferenças de procedimento que devem ficar
explicadas, especialmente o uso de Vite.

## Base e limites da conferência

A fonte foi o arquivo `Texto colado.txt` enviado pelo aluno, intitulado
“TEXTO DE APOIO”, com as Etapas 1, 2 e 3. Ele não contém pesos de nota, prazo,
formato de submissão ou rubrica final de avaliação. Portanto, este relatório
verifica esse material e não presume exigências que não foram fornecidas.

Foram inspecionados o código versionado, o README, os scripts, os testes e a
coleção do Insomnia. A última validação do mesmo commit teve **58 testes
aprovados** e compilação do frontend concluída. Nesta conferência foram feitas
**24 chamadas HTTP adicionais** em SQLite em memória, cobrindo as 14 rotas
centrais e verificando CRUD, edição persistida, consultas nos dois sentidos,
desassociação e preservação das entidades relacionadas após exclusões.

Também foi criada uma cópia isolada dos arquivos necessários, com banco vazio,
para executar os scripts de preparação. Foram reutilizadas as dependências
locais instaladas: isso verifica a preparação do banco, mas não substitui um
teste completo de instalação por outra pessoa a partir do GitHub. O banco de
trabalho não foi alterado pela auditoria.

## Correspondência com o material

| Orientação | Situação | Evidência |
| --- | --- | --- |
| Etapa 1: Node.js, npm e servidor HTTP na porta 3000 | Atendido no projeto | `package.json`, `app.js`; Node local v24.13.1 e npm 11.8.0 |
| Etapa 1: README com identificação da Faculdade Gran e da disciplina | Atendido na raiz | `README.md` contém ambas as identificações e o autor |
| Etapa 1: commits e integração com GitHub | Atendido | Histórico Git e commit `c323b67` enviado ao repositório `rubens1976/estoque` |
| Etapa 2: controlador de Produto com CRUD e nome, descrição, preço e código de barras | Atendido | `controllers/produtos.js`; cinco rotas e conferência HTTP de criação, consulta, edição e exclusão |
| Etapa 2: controlador de Fornecedor com CRUD, nome, CNPJ, endereço e contato | Atendido | `controllers/fornecedores.js`; endereço, telefone e e-mail; testes e conferência HTTP |
| Etapa 2: associação, desassociação e consultas em ambos os sentidos | Atendido | `controllers/associacoes.js`; quatro rotas; conferência com dois produtos e dois fornecedores |
| Etapa 2: relação muitos para muitos e SQLite | Atendido | `criar-tabelas.js`, `database.js`; tabela intermediária com chave composta e chaves estrangeiras |
| Etapa 2: testar com Insomnia ou Postman | Há evidências de uso; coleção precisa de atualização | Coleção `conectabyte-insomnia` com 14 requisições e resultados apresentados pelo aluno; ver pendência 2 |
| Etapa 3: página React de Produto consumindo o backend | Implementada; integração identificada no código | `frontend/src/App.jsx`: consulta, cadastro, edição e exclusão por `solicitar()`/`fetch()` |
| Etapa 3: página React de Fornecedor consumindo o backend | Implementada; integração identificada no código | `frontend/src/Fornecedores.jsx`: lista, formulários de cadastro/edição e confirmação de exclusão |
| Etapa 3: página React de Associação consumindo o backend | Implementada; integração identificada no código | `frontend/src/Associacoes.jsx`: cria/remove vínculo, consulta fornecedores do produto e produtos do fornecedor |
| Etapa 3: atenção à usabilidade | Elementos presentes; recomendada demonstração final | Busca, carregamento, estados vazios, mensagens de erro e confirmações de exclusão; layout responsivo em CSS |
| Etapa 3: inicialização com create-react-app e `npm start` | Procedimento diferente do roteiro | O frontend usa React com Vite e `npm run dev`; ver pendência 3 |
| Etapa 3: README no projeto React | Atendido pelo README geral, mas arquivo local ausente | Não existe `frontend/README.md`; o roteiro pede criar/alterar README dentro do projeto React |

O quarto controlador e a tela de estoque por unidade são acréscimos ao escopo
central. Não substituem nenhuma das três partes exigidas.

## Pendências em ordem de prioridade

### 1. Tornar os dados de demonstração reproduzíveis

**Correção verificada em 25/10/2026:** o novo comando `npm run preparar:exemplo`
cria um banco completo do zero, incluindo o Teclado USB ausente no CSV. A
execução isolada e os testes confirmaram 20 produtos, 14 fornecedores completos,
40 vínculos, nove unidades, 180 saldos e 532 peças distribuídas. A carga recusa
sobrescrever bancos existentes. Foi gerado `exemplos/estoque.db`, separado do
banco de trabalho. A suíte passou com 60 testes. O procedimento atualizado está
no README. Esta pendência foi resolvida; o diagnóstico original abaixo registra
a falha da sequência antiga de scripts, que não é mais o procedimento recomendado.

Na cópia isolada foram executados, nesta ordem:

```text
node criar-tabelas.js
node scripts/popular-fornecedores-exemplo.js
node scripts/importar-produtos-csv.js --aplicar
node scripts/vincular-produtos-fornecedores-exemplo.js --aplicar
```

Os três primeiros comandos terminaram com sucesso. O último retornou:

```text
Carga de vínculos cancelada: Produto não encontrado: Teclado USB. Importe o CSV antes desta carga.
```

O script de vínculos espera 20 produtos, incluindo `Teclado USB`, mas o CSV
contém apenas os outros 19. Esse produto existe no banco local por ter sido
cadastrado anteriormente, mas não é criado pela preparação automática.

A cópia ficou com **19 produtos, 522 peças, 14 fornecedores e zero vínculos**.
Além disso, como o estoque por unidade é preparado antes da importação, os
produtos novos entram na sede: todas as 522 peças ficaram em Fortaleza. As
filiais zeradas estão coerentes com a regra de cadastro, mas não reproduzem a
demonstração atual de 532 peças distribuídas.

**Ação recomendada:** criar uma preparação única e repetível que gere o
catálogo completo, os fornecedores, os vínculos e a distribuição inicial em
um banco novo. Preparar também o SQLite de exemplo separado, já solicitado
pelo aluno. Incluir esse arquivo na entrega é uma decisão de apresentação;
o texto do professor exige SQLite, mas não exige enviar um `.db` pronto.

### 2. Atualizar a coleção do Insomnia e o roteiro de demonstração

**Correção verificada em 25/10/2026:** coleção substituída por roteiro de
18 requisições numeradas, com captura automática dos IDs de teste, edição
preservando a quantidade, transferência pela rota de estoque e limpeza dos
registros criados. Foram incluídas as quatro rotas adicionais de unidades e
movimentações. O teste executa as próprias requisições e scripts da coleção
duas vezes em um banco separado em memória, totalizando 36 chamadas HTTP,
e confirma a preservação da carga original. Procedimento em
`docs/roteiro-insomnia.md`. Pendência resolvida no arquivo; a importação pela
interface do Insomnia continua sendo uma conferência manual na entrega.
O diagnóstico anterior está preservado abaixo como histórico.

Os exemplos usam IDs fixos de uma sessão anterior. No banco atual, os IDs
`produtos/2` e `fornecedores/3` já não existem. O README avisa para ajustar os
IDs, porém isso exige cuidado de quem avalia.

O exemplo `método PUT` também envia `quantidade: 20`. Depois do estoque por
unidade, alterar esse total diretamente retorna `409`, conforme a regra
documentada. Esse conflito foi reproduzido na conferência HTTP. A edição de
nome, descrição, código e preço funciona quando a quantidade atual é mantida.

**Ação recomendada:** ajustar nomes e exemplos das requisições, orientar a
captura dos IDs criados e separar edição do cadastro de movimentação do
estoque. Acrescentar as quatro rotas de unidades/estoque à coleção e produzir
um roteiro curto para demonstrar os requisitos centrais sem alterar dados
importantes. As quatro rotas extras não são exigência do professor.

### 3. Completar a documentação de execução e explicar o Vite

**Documentação concluída em 25/10/2026:** criado `frontend/README.md` com a
identificação acadêmica, requisitos, inicialização em dois terminais, carga
de exemplo, proxy `/api`, quatro telas, roteiro manual, comandos de build e
preview e solução de problemas. O uso de Vite e a diferença de comando em
relação a create-react-app estão declarados. A aceitação dessa escolha pelo
professor e o ensaio de instalação limpa permanecem fora desta conclusão.
O diagnóstico original está preservado abaixo.

O projeto usa React, conforme solicitado, mas não foi criado com
`create-react-app`; usa Vite e não possui script `npm start` no frontend.
O comando funcional está documentado na raiz: `npm.cmd run dev --prefix frontend`.

**Ação recomendada:** criar `frontend/README.md` com a identificação acadêmica,
os comandos e a dependência do backend. Explicar a escolha de Vite e registrar
as versões testadas. O pacote Vite instalado declara Node
`^20.19.0 || >=22.12.0`; o ambiente conferido usa Node v24.13.1. A aceitação de
uma ferramenta equivalente depende do critério do professor; o material
disponível não declara que Vite é proibido nem que essa substituição será aceita.
Não há motivo técnico identificado para reconstruir as páginas nesta auditoria.

### 4. Validar o pacote final em um ambiente limpo

**Ensaio local concluído em 25/10/2026:** os arquivos atuais foram copiados
para uma pasta inicialmente sem banco e sem dependências. Foram concluídos
`npm ci` nas duas partes, preparação dos dados, 61 testes, build e navegação
pelas quatro telas com API isolada. O [relatório do ensaio](ensaio-instalacao.md)
explica as portas adaptadas e os limites: mesma máquina, cópia de trabalho
ainda sem commit e conferência visual de carregamento, sem executar todos
os formulários pelo navegador. A reprodução a partir do GitHub depende da
publicação das correções. A recomendação completa original segue abaixo.

Depois de corrigir a preparação dos dados, baixar o repositório em outra pasta,
instalar as dependências do backend e do frontend, preparar o banco e executar
as três páginas. Registrar cadastro, edição, exclusão, vínculo e consultas nos
dois sentidos. Esse ensaio evita depender de arquivos existentes apenas nesta
máquina.

## Melhorias e informações que não são exigências explícitas

- Banco pronto para download, capturas de tela e roteiro de apresentação ajudam
  a avaliação, mas não são pedidos expressamente no texto de apoio.
- A suíte de testes já cobre várias operações de produtos por meio dos testes
  de estoque e associações. Uma suíte dedicada à validação completa do CRUD de
  produtos e testes automatizados da interface seriam melhorias; não são
  exigidos pelo material.
- Nest.js e Next.js são opcionais. As extensões de VS Code são dicas.
  CI/CD é apresentado como assunto futuro. Não foram exigidos login,
  pagamentos, scraping ou imagens de produtos. A hospedagem pública da API foi
  confirmada posteriormente pelo enunciado da Etapa 2 e é necessária.
- O texto de apoio não informava o formato de entrega. A plataforma confirmou
  posteriormente GitHub na Etapa 1 e PDF com três chamadas públicas na Etapa 2.

## Próxima ação sugerida

Com os dados, a coleção e a documentação atualizados e o ensaio local de
instalação concluído, revisar os arquivos para commit e envio quando autorizado.
Depois de publicar, conferir a reprodução por clone do GitHub. Não foi
identificada ausência de uma das três páginas ou de um dos três controladores
centrais.
