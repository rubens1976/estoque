# Revisão do catálogo e planejamento de distribuição

Em 25/10/2026 foram revisados os 19 produtos do CSV fornecido para o projeto.
Os nomes, códigos internos e as quantidades originais foram preservados para
manter os vínculos e o histórico do banco. As descrições passaram a usar
português com acentos, capacidade, formato e características principais.
Afirmações dependentes de variante ou sem confirmação suficiente foram removidas.

## Critério para os preços

Os preços do CSV revisado são **valores de venda ilustrativos** para um cenário
acadêmico, em reais e com duas casas decimais terminadas em `,90`. São valores
coerentes entre produtos de entrada, intermediários e premium; **não são
cotações, ofertas garantidas ou preços atuais em todas as lojas**. Os anúncios
usados como referência podem variar por forma de pagamento, frete, marketplace,
variante e disponibilidade. A revisão não altera o custo de aquisição, pois o
projeto ainda não guarda esse campo.

Exemplos que motivaram a revisão:

| Produto | CSV original | Valor ilustrativo revisado | Referência consultada |
| --- | ---: | ---: | --- |
| TEAMGROUP T-Force Delta RGB 16 GB (2 x 8 GB) | R$ 3.276,76 | R$ 499,90 | [Pichau, mesmo modelo](https://www.pichau.com.br/memoria-team-group-t-force-delta-rgb-16gb-2x8-ddr4-3000mhz-preta-tf3d416g3000hc16cdc01) |
| Kingston ValueRAM 8 GB DDR4 | R$ 390,92 | R$ 169,90 | [Pichau, KVR32N22S8/8](https://www.pichau.com.br/memoria-kingston-8gb-1x8gb-ddr4-3200mhz-c22-kvr32n22s8-8) |
| AMD Ryzen 5 5600G | R$ 1.696,49 | R$ 1.099,90 | [Pichau, 100-100000252BOX](https://www.pichau.com.br/processador-amd-ryzen-5-5600g-6-core-12-threads-3-9ghz-4-4ghz-turbo-cache-19mb-am4-100-100000252box) |
| Galax RTX 4060 Ti 8 GB | R$ 3.999,99 | R$ 3.099,90 | [Pichau, modelo comparável](https://www.pichau.com.br/placa-de-video-galax-geforce-rtx-4060-ti-ex-1-click-oc-8gb-gddr6-128-bit-46isl8md8aex) |
| Kingston NV3 1 TB | R$ 998,17 | R$ 1.299,90 | [Pichau, SNV3S/1000G](https://www.pichau.com.br/ssd-kingston-nv3-1tb-m-2-2280-pcie-nvme-leitura-6000mb-s-gravacao-4000mb-s-snv3s-1000g) |
| Logitech MK295 | R$ 172,14 | R$ 249,90 | [Pichau, 920-009793](https://www.pichau.com.br/kit-teclado-e-mouse-logitech-mk295-usb-silent-wireless-preto-920-009793) |

Algumas características foram conferidas em fontes dos fabricantes:
[Samsung 990 PRO](https://www.samsung.com/us/memory-storage/nvme-ssd/990-pro-w-heatsink-pcie-4-0-nvme-ssd-1tb-sku-mz-v9p1t0cw/),
[Kingston NV3](https://www.kingston.com/datasheets/snv3s_latam.pdf),
[TEAMGROUP Delta RGB](https://images.teamgroupinc.com/products/memory/u-dimm/ddr4/delta-rgb/spec-sheet/delta-rgb-en.pdf) e
[Intel Core i5-10400F](https://www.intel.com/content/www/us/en/products/sku/199278/intel-core-i510400f-processor-12m-cache-up-to-4-30-ghz/specifications.html).

O arquivo original, antes da revisão, foi preservado localmente em
`backups/estoque_loja_informatica-original.csv`. O banco foi copiado em
`backups/` antes de atualizar apenas `preco` e `descricao`; `quantidade` e
as associações com fornecedores não foram modificadas.

## Distribuição inicial proposta

O campo `produtos.quantidade` ainda representa o **total da empresa**, não o
estoque de uma loja. O relatório [distribuicao-inicial.csv](distribuicao-inicial.csv)
é um planejamento inicial para as nove unidades descritas em
[unidades-conectabyte.md](unidades-conectabyte.md). Inclui uma linha para cada
par produto–unidade, inclusive quantidade zero, para que faltas fiquem visíveis.

| Unidade | Peso de planejamento | Quantidade proposta |
| --- | ---: | ---: |
| Fortaleza/CE (sede) | 24% | 128 |
| São Luís/MA | 8% | 47 |
| Teresina/PI | 8% | 41 |
| Natal/RN | 8% | 41 |
| João Pessoa/PB | 8% | 41 |
| Recife/PE | 14% | 75 |
| Maceió/AL | 8% | 42 |
| Aracaju/SE | 8% | 43 |
| Salvador/BA | 14% | 74 |
| **Total** | **100%** | **532** |

Os pesos são uma **hipótese operacional de demonstração**, com maior reserva na
sede e nas filiais de Recife e Salvador. Não representam vendas observadas,
demanda medida, importância econômica ou avaliação das cidades. O algoritmo usa
quotas inteiras e distribui as sobras pelos maiores restos, alternando empates
entre produtos; a soma por produto sempre coincide com `produtos.quantidade`.
Produtos com poucas unidades podem ficar zerados em algumas lojas.

O relatório registra o planejamento inicial. O comando
`npm.cmd run planejar:distribuicao` gera uma nova simulação com os totais atuais;
ele não consulta nem altera as transferências já feitas.

O controle operacional foi implementado em `unidades`, `estoque_unidades` e
`movimentacoes_estoque`. A migração inicial aplicou esse rateio às 532 peças.
Depois da migração, os saldos são mantidos por movimentações, sem novo rateio
automático. O total de cada produto é sincronizado pela soma das lojas, e cada
entrada, saída ou transferência registra data, quantidade, motivo e unidades.
Veja [estoque-por-unidade.md](estoque-por-unidade.md).
