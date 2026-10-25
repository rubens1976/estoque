# Ensaio de instalação em cópia separada

**Data:** 25/10/2026. **Projeto:** ConectaByte Informática.

## Escopo

Foi criada uma pasta sem banco de dados e sem dependências instaladas:
`backups/ensaio-instalacao-final-20261025/`. Foram copiados 50 arquivos do
projeto, considerando os versionados e as correções ainda não commitadas.
Não foram copiados `node_modules`, `estoque.db` nem o histórico `.git`.

O ensaio valida a cópia de trabalho atual em uma pasta nova no mesmo Windows,
com Node.js 24.13.1 e npm 11.8.0. Não representa um clone da versão atualmente
publicada no GitHub, nem um teste em outro sistema operacional.

## Instalação e comandos executados

Na pasta separada:

```powershell
npm.cmd ci --cache C:/estoque/backups/npm-cache-ensaio --no-audit --no-fund --fetch-retries=0
npm.cmd ci --prefix frontend --cache C:/estoque/backups/npm-cache-ensaio --no-audit --no-fund --fetch-retries=0
npm.cmd run preparar:exemplo
npm.cmd test
npm.cmd run build --prefix frontend
```

As primeiras tentativas de instalação foram bloqueadas pelo acesso à rede
restrito do ambiente. A repetição com permissão de rede concluiu normalmente:
120 pacotes no backend e 65 no frontend. O npm emitiu aviso de descontinuação
de `prebuild-install@7.1.3`, dependência transitiva; não houve falha de
instalação. Como foi usado `--no-audit`, este ensaio não inclui auditoria de
vulnerabilidades de dependências.

O cache do ensaio começou separado do cache habitual. Não foram reutilizadas
as pastas `node_modules` do projeto original nem substituídos os arquivos de
lock. Os logs locais de instalação ficam em `backups/npm-cache-ensaio/_logs/`;
essas pastas são ignoradas pelo Git.

## Resultados

| Verificação | Resultado |
| --- | --- |
| Dependências do backend via lockfile | Instalação concluída |
| Dependências do frontend via lockfile | Instalação concluída |
| Preparação do banco do zero | Concluída com 20 produtos, 14 fornecedores, 40 vínculos e nove unidades |
| Saldos de estoque | 180 registros, totalizando 532 peças |
| Chaves estrangeiras do banco novo | `PRAGMA foreign_key_check` sem violações |
| Suíte automatizada na cópia nova | 61 testes aprovados, zero falhas |
| Compilação React/Vite | Concluída: 32 módulos transformados e arquivos gerados em `frontend/dist` |
| Inicialização do Express | Servidor iniciado e conexão SQLite confirmada |
| Inicialização do Vite | Servidor de desenvolvimento iniciado |

## Conferência no navegador

Para manter a sessão original nas portas 3000 e 5173, somente a cópia do
ensaio recebeu dois ajustes: porta do Express de 3000 para **3100**, e destino
do proxy Vite para `http://localhost:3100`. O Vite foi iniciado com:

```powershell
npm.cmd run dev --prefix frontend -- --port 5174 --strictPort
```

A interface isolada foi aberta em `http://127.0.0.1:5174/`. As telas foram
selecionadas pelo menu e seus conteúdos carregados foram conferidos:

| Tela | Conteúdo observado |
| --- | --- |
| Produtos | 20 produtos; 532 unidades em estoque; catálogo com descrições e preços |
| Fornecedores | 14 cadastros, todos com telefone e e-mail |
| Associações | 20 produtos e 14 fornecedores; Teclado USB selecionado com dois vínculos, Aurora Periféricos e Núcleo Periféricos João Pessoa |
| Unidades | Nove unidades; 532 peças na rede; cartões de sede e filiais com os saldos |

Essa navegação confirmou o carregamento das quatro telas e a comunicação
com a API da cópia separada. Não foram realizados cadastros, edições,
exclusões ou transferências pela interface nesta rodada. Essas operações
da API foram verificadas pela suíte automatizada; o ensaio visual não é
apresentado como teste completo de todos os formulários React.

O rateio do banco novo pode diferir por cidade em relação ao banco antigo,
porque os IDs gerados são diferentes; a quantidade total permanece 532,
conforme explicado no README. O banco de trabalho original foi preservado.
Os servidores e a aba temporários do ensaio foram encerrados ao concluir.

## Estado da entrega

A instalação dos arquivos atuais em uma pasta nova foi concluída. Os
arquivos do ensaio são locais e ignorados pelo Git. Antes de disponibilizar
a versão final, ainda é necessário revisar e commitar as alterações,
enviá-las ao GitHub quando autorizado e confirmar o formato de submissão
solicitado na disciplina. Uma reprodução por clone do GitHub só poderá
verificar essas correções depois que estiverem publicadas.
