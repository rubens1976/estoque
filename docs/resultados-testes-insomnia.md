# Resultados dos testes da API — ConectaByte

Data: **25/10/2026**. Responsável pelo projeto: **Rubens Melo**.
Aplicativo utilizado: **Insomnia 13.3.1**.
Coleção: **ConectaByte - Demonstração completa**, importada no projeto local
**ConectaByte - Testes corrigidos**. API: `http://localhost:3000`.

## Ambiente e evidências

O roteiro foi executado pelo aluno, com capturas de tela apresentadas durante
a sessão. As requisições atingiram o **banco de trabalho existente**, e não
o arquivo separado `exemplos/estoque.db`. Os IDs visíveis e a consulta final
confirmam essa diferença. Portanto, este relatório não caracteriza o ensaio
como instalação nova ou execução sobre o banco de demonstração.

Foram utilizados os registros temporários criados pelo roteiro: produto
**22**, Mouse USB de teste Insomnia, e fornecedor **42**, Distribuidora Beta
Teste. O fornecedor consultado na etapa 04 foi a **Distribuidora Teste, ID 2**,
existente nesse banco. A URL dessa etapa foi ajustada de `/fornecedores/1`
para `/fornecedores/2` no Insomnia.

As capturas originais estão anexadas ao histórico da conversa; não foram
copiadas para o repositório. As confirmações diretas na API são identificadas
abaixo e não representam resultados exibidos pela interface do Insomnia.

## Resultados por etapa

| Etapa | Operação | Resultado observado |
| --- | --- | --- |
| 01 | Listar produtos | 200; Tests 1/1 verde após correção do script |
| 02 | Consultar produto 1 | 200; Tests 1/1; retornou Teclado USB |
| 03 | Listar fornecedores | 200; Tests 1/1; retornou os fornecedores do banco de trabalho |
| 04 | Consultar fornecedor 2 | 200; Tests 1/1; retornou Distribuidora Teste |
| 05 | Cadastrar produto de teste | 201; Tests 1/1; criou ID 22, preço 39,90 e 15 peças |
| 06 | Editar produto 22 | 200; Tests 1/1; nome atualizado, preço 44,90 e quantidade mantida em 15 |
| 07 | Cadastrar fornecedor de teste | 201; Tests 1/1; criou ID 42 com nome, CNPJ, telefone, e-mail e endereço |
| 08 | Editar fornecedor 42 | 200; Tests 1/1; retornou Distribuidora Beta Atualizada e contatos revisados |
| 09 | Vincular produto 22 ao fornecedor 42 | 201; Tests 1/1; retornou o par de IDs |
| 10 | Consultar fornecedores do produto 22 | 200; Tests 1/1; retornou fornecedor 42 |
| 11 | Consultar produtos do fornecedor 42 | 200; Tests 1/1; retornou produto 22 atualizado |
| 12 | Listar unidades | 200; Tests 1/1; retornou dados e totais das unidades |
| 13 | Consultar estoque de Fortaleza | 200; Tests 1/1; retornou unidade e saldos de produtos |
| 14 | Transferir duas peças do produto 22 de Fortaleza para São Luís | 201; Tests 1/1; movimentação ID 169, origem 1, destino 2, quantidade 2 |
| 15 | Consultar histórico | 200; Tests 1/1; transferência 169 e entrada inicial de 15 peças apareceram no histórico |
| 16 | Remover vínculo 22/42 | No Insomnia, capturas mostraram 404 e Tests 0/1; a operação foi confirmada diretamente na API com 204 após recriar o vínculo com 201 |
| 17 | Excluir produto 22 | Captura final mostrou bloqueio do pré-script por ID zerado/ausente; consulta direta posterior retornou 404 para o produto |
| 18 | Excluir fornecedor 42 | Captura final mostrou bloqueio do pré-script por ID zerado/ausente; consulta direta posterior retornou 404 para o fornecedor |

As etapas 16–18 não têm, nas capturas fornecidas, comprovação de resposta
204 com teste verde no Insomnia. Para 16, a resposta 204 foi observada no
teste direto da API. Para 17 e 18, confirmou-se o estado final de exclusão,
sem afirmar que o primeiro envio dessas etapas foi registrado nas imagens.

## Ocorrências e correções

**Campo de status do script.** A API retornava 200 corretamente, mas o teste
comparava `insomnia.response.status`, texto como `OK`, com o número 200.
A coleção foi corrigida para usar **`insomnia.response.code`**, inclusive
nas condições de captura e limpeza dos IDs. O teste automatizado passou a
simular separadamente o código numérico e a mensagem textual da resposta.
Uma nova importação confirmou Tests 1/1 no aplicativo.

**Duplicação durante importação.** Importar na coleção existente acrescentou
requisições duplicadas. A versão corrigida foi importada em um novo projeto
local, com uma coleção de 18 requisições sem duplicações, conforme a captura
apresentada. Os nomes com acentos também passaram a aparecer corretamente.

**Diferença dos IDs.** O banco de trabalho não possui o mesmo histórico de
IDs do banco novo. A etapa 04 foi ajustada ao fornecedor existente, ID 2.
Os cadastros de teste usaram captura automática e funcionaram com IDs 22 e
42, sem depender dos valores previstos para uma instalação nova.

**Remoção de vínculo ausente.** O 404 significa que o par solicitado não
existia no momento da requisição. A causa exata de cada envio que produziu
404 não foi determinada. O diagnóstico confirmou o produto e o fornecedor
existentes e a lista de vínculos vazia. Em seguida foi realizado diretamente
na API: POST do par 22/42 → 201; DELETE do mesmo par → 204; GET dos
fornecedores do produto → 200 com `[]`.

**Bloqueios das exclusões.** Os pré-scripts recusam enviar DELETE quando a
variável do ID não contém inteiro positivo. A coleção zera essa variável
depois de resposta 204. As capturas finais mostraram esse bloqueio; as
consultas diretas confirmaram que produto 22 e fornecedor 42 já não existiam.
Não foi necessário cadastrar novamente nem excluir outros registros.

## Conferência final e regressão

Após a limpeza dos registros de teste, uma consulta SQLite em modo somente
leitura confirmou:

| Indicador | Banco de trabalho ao final |
| --- | ---: |
| Produtos | 20 |
| Fornecedores | 15 |
| Vínculos entre produtos e fornecedores | 40 |
| Unidades | 9 |
| Saldos de produtos por unidade | 180 |
| Quantidade total em produtos | 532 |
| Soma das quantidades nas unidades | 532 |

Esses totais correspondem aos registrados antes dos testes. A igualdade das
somas confirma a conciliação global do estoque; isoladamente, não comprova
que todos os campos de todos os registros sejam idênticos ao estado anterior.
O histórico de movimentações mantém os registros de teste mesmo depois da
exclusão do produto, conforme o comportamento implementado.

Foi executado novamente **`npm.cmd test`**: **61 testes aprovados, zero falhas**.
Entre eles, o teste da própria coleção executa duas rodadas de 18 requisições
(36 chamadas HTTP) em SQLite separado em memória, com os quatro controladores
reais. Verifica IDs novos a cada rodada, saldos 13/2 após a transferência e
preservação dos cadastros, vínculos e saldos iniciais ao concluir a limpeza.
Esse teste simula as APIs de scripts do Insomnia; as capturas do aplicativo
complementam a evidência, sem serem substituídas pela simulação.

## Limites e próximos itens da entrega

O roteiro confirmou operações de produtos, fornecedores, associações e
estoque por unidade. Este registro não equivale à aprovação pelo professor,
a um teste completo das telas React ou a uma instalação limpa a partir do
GitHub. Permanecem a revisão da documentação do frontend, o ensaio da entrega
em instalação nova e o commit das alterações quando autorizado.
