# Publicação da API para avaliação

Autor: Rubens Melo. Projeto ConectaByte Informática — Gran Faculdade.

## Situação

Preparação local para Render concluída. Ainda não há URL pública verificada.
É necessário entrar na conta de hospedagem e concluir a criação do serviço.
Endereços `localhost` e `127.0.0.1` não permitem avaliação externa.

O teste de inicialização executa a API em um processo separado, com porta e
banco temporários, confere as três listas e verifica a preservação de uma
alteração após reiniciar com o mesmo arquivo. `npm test` seleciona somente
`tests/*.test.js`, evitando executar novamente testes presentes em backups.

## Configuração preparada

- Serviço web Node.js, plano **Free**.
- Repositório: https://github.com/rubens1976/estoque, branch `main`.
- Diretório raiz: vazio (raiz do repositório).
- Build: `npm ci`.
- Inicialização: `npm run start:demo`.
- Node.js: `24.13.1`, definido em `render.yaml`.
- Verificação de saúde: `/produtos`.
- A porta é recebida de `PORT`; o padrão local continua sendo `3000`.
- `DB_PATH` permite indicar outro arquivo SQLite; por padrão usa `estoque.db`.

O comando de demonstração prepara um banco novo apenas quando o arquivo não
existe. A preparação termina antes de abrir a API. Um banco existente é
preservado, sem repovoamento nem redistribuição do estoque.

## Criar no Render

1. Entrar em https://dashboard.render.com.
2. Selecionar **New → Web Service** e informar o repositório público acima.
3. Usar os comandos e versão Node indicados acima; selecionar explicitamente
   **Free**, sem disco pago ou banco adicional. Como alternativa, importar
   `render.yaml` pela opção **Blueprint**.
4. Criar o serviço e acompanhar o log até a publicação estar ativa.
5. Copiar a URL HTTPS atribuída pelo provedor. Não presumir o endereço com base
   apenas no nome do serviço: ele pode receber um sufixo.

## Três chamadas para o documento de entrega

Usar a URL efetivamente atribuída, seguida de:

| Método | Caminho | Retorno esperado no banco inicial |
| --- | --- | --- |
| GET | `/produtos` | HTTP 200, lista JSON com 20 produtos |
| GET | `/fornecedores` | HTTP 200, lista JSON com 14 fornecedores |
| GET | `/unidades` | HTTP 200, lista JSON com 9 unidades |

Sem autenticação, sem corpo e sem cabeçalhos especiais. No Insomnia, substituir
`base_url` pela URL pública HTTPS, sem barra final. Registrar URL completa,
data/hora, status HTTP e conteúdo observado de cada uma das três respostas.
As quantidades podem mudar após operações de cadastro ou exclusão.

Somente após esses testes, gerar o PDF nas cores do projeto, com autor,
repositório, explicação da demonstração e os três endereços completos. O campo
da Gran aceita PDF de até 5 MB. Não entregar URLs fictícias ou somente locais.

## Limites da demonstração gratuita

O Render informa que o serviço gratuito suspende após 15 minutos sem tráfego;
a primeira consulta após a suspensão pode levar cerca de um minuto.
O sistema de arquivos é temporário: reinícios, novas publicações ou suspensão
podem apagar o SQLite. Nesse caso a próxima inicialização recria os dados de
exemplo (20 produtos, 14 fornecedores, 40 vínculos, 532 peças, 9 unidades).
Os registros e movimentos feitos durante uma sessão não têm persistência
garantida entre reinícios. Este serviço é uma demonstração acadêmica com
cadastros fictícios e rotas de escrita abertas, conforme a atividade sem login.

Persistência permanente exige outra configuração de armazenamento; não há
disco ou serviço pago contratado nesta preparação.

Referências oficiais: [Node/Express no Render](https://render.com/docs/deploy-node-express-app),
[limites do plano gratuito](https://render.com/docs/free) e
[configuração Blueprint](https://render.com/docs/blueprint-spec).
