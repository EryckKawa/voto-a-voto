# A régua dos partidos

O mapa pinta cada cidade pelo lado político do partido que venceu. Para isso, cada partido precisa de uma nota de −1 (esquerda) a +1 (direita) **em cada eleição**, porque partidos mudam de posição com o tempo. O PSDB, por exemplo, sai do centro em 1994 e se aproxima da centro-direita a partir dos anos 2000.

A nota sai de quatro medidas independentes, combinadas por `scripts/notas_estudos.py`.

## As quatro medidas

| Código | Medida | Quem avalia | Período |
|---|---|---|---|
| ZP | Zucco e Power (2024), Brazilian Legislative Surveys | deputados federais avaliam os partidos | 9 pesquisas, de 1990 a 2021 |
| BRC | Bolognesi, Ribeiro e Codato (2023) | 519 cientistas políticos da ABCP avaliam 35 partidos | julho de 2018 |
| VP | V-Party, V-Dem (2022), variável `v2pariglef` | especialistas, em cada eleição, os partidos com mais de 5% dos votos (só a dimensão econômica) | de 1990 a 2018 |
| CAM | Voto na Câmara (`scripts/regua_voto.py`) | orientação de cada bancada em 1.854 votações de mérito no Plenário | de 2019 a 2026 |

A medida CAM é a única que já pega os partidos depois de 2021, como o PL com Bolsonaro e o União Brasil. Ela é feita assim:

- **Concordância entre bancadas:** em cada votação, conta-se quantas vezes cada par de partidos orientou igual.
- **Uma linha por governo:** os partidos são postos numa linha por escalonamento multidimensional, separadamente nos governos Bolsonaro e Lula.
- **Média dos dois governos:** a nota final é a média dos dois. Um partido que só acompanha o governo da vez muda de lado e cai no meio (Zucco, 2009).
- **Quem entra:** só partidos que votaram nos dois governos.

## Mesma escala

A escala comum é a de Zucco e Power. As outras notas foram convertidas por uma reta de mínimos quadrados, ajustada nos partidos medidos pelas duas fontes em datas próximas:

| Fonte | Conversão | Pares | Correlação (Pearson) | Correlação de ordem (Spearman) |
|---|---|---:|---:|---:|
| BRC (0 a 10) | nota × 0,213 − 1,212 | 20 | 0,96 | 0,94 |
| VP | nota × 0,341 − 0,046 | 70 | 0,96 | 0,95 |
| CAM | ajustada a Harvard em `regua_voto.py` | 15 | 0,95 | |

Toda nota convertida fica entre −1 e +1.

## As medidas concordam?

Partidos medidos por duas fontes com até 2 anos de diferença (até 5 anos quando entra o voto na Câmara), cada par contado uma vez:

| Comparação | Correlação | Mesmo lado |
|---|---:|---:|
| Deputados × cientistas políticos | 0,96 | 17 de 20 |
| Deputados × V-Party | 0,96 | 59 de 70 |
| Cientistas políticos × V-Party | 0,97 | 10 de 11 |
| Deputados × voto na Câmara | 0,95 | 13 de 15 |
| Cientistas políticos × voto na Câmara | 0,90 | 11 de 18 |
| V-Party × voto na Câmara | 0,93 | 7 de 9 |

"Mesmo lado" usa três faixas: esquerda abaixo de −0,25, centro, direita acima de +0,25. As discordâncias mais comuns são duas:

- **PSDB:** centro para os deputados, direita para o V-Party, que mede só a economia.
- **Centrão (União Brasil, Republicanos, PP, Podemos):** à direita para os especialistas, perto do centro no voto, porque acompanha o governo da vez.

## Como sai a nota de cada eleição

1. **Quais medidas entram:** cada medida entra se foi feita até 4 anos antes ou depois da eleição. Depois da última medida de um estudo, ela vale por até 8 anos.
2. **Peso pela data:** cada medida pesa `1 / (1 + anos de distância / 2)`. A medida do ano da eleição pesa 1; a de 4 anos antes, 1/3.
3. **Combinação:** com três medidas ou mais, a nota é a **mediana ponderada**, para que um ponto fora da curva não puxe a nota. Com uma ou duas medidas, a média ponderada.
4. **Partido sem medida perto:** quando nenhuma medida pega o partido perto da eleição (partidos pequenos antes de 2014), vale a mais próxima a até 12 anos, com aviso de "distante".
5. **Fusões:** União Brasil (DEM + PSL) e PRD (PTB + Patriota) recebem a média dos partidos de origem quando a medida não pega o partido novo.
6. **Faixas:**

   | Faixa | Nota |
   |---|---|
   | esquerda | abaixo de −0,5 |
   | centro-esquerda | de −0,5 até −0,25 |
   | centro | de −0,25 a +0,25 (o corte de Zucco e Power) |
   | centro-direita | acima de +0,25 até +0,5 |
   | direita | acima de +0,5 |

7. **Incerto:** a classificação é marcada como incerta quando menos de 2/3 do peso das medidas fica do mesmo lado da nota.
8. **Sem nota:** o PSD de 1987 a 2003 e o PSL de antes de 2018 eram outros partidos e ficam sem nota.

Exemplos (nota combinada):

| Partido | 1994 | 2002 | 2014 | 2022 | 2026 |
|---|---:|---:|---:|---:|---:|
| PT | −0,90 | −0,64 | −0,54 | −0,67 | −0,65 |
| PSDB | −0,04 | +0,22 | +0,39 | +0,21 | +0,21 |
| MDB | −0,02 | +0,15 | +0,18 | +0,18 | +0,18 |
| PL | +0,61 | +0,45 | +0,50 | +0,52 | +0,55 |
| PP | +0,75 | +0,75 | +0,67 | +0,51 | +0,51 |
| União Brasil | | | | +0,59 | +0,57 |
| Novo | | | +0,52 | +0,71 | +0,71 |

Saídas:

- `data/br/partidos_notas.json`, para a página Partidos;
- `data/br/ideologia_consenso.json`, a régua do mapa;
- `scripts/partido_nota.csv`, carregado no banco como `partido_nota`, com `partido_linhagem` e a view `vw_partido_ano`.

## O que eles pregam: testado e deixado de fora

Também testamos medir o que os partidos "pregam", pelo texto dos planos de governo para presidente de 2018, 2022 e 2026 (`scripts/wordscores_planos.py`). O método foi o Wordscores (Laver, Benoit e Garry, 2003), com os 13 planos de 2018 como referência e a nota dos cientistas políticos.

A medida não passou na validação. Tirando um plano de cada vez das referências e calculando a nota dele pelos outros 12, a correlação com a nota certa foi de −0,25. A análise de correspondência dos textos também só separou a esquerda revolucionária (PSTU, PCO, PCB, UP) do resto. Por isso o texto dos planos não entra na nota. O teste fica no repositório e é descrito no site.

## Limites

- **Dimensão econômica:** o V-Party mede só a economia.
- **Um ano só:** o estudo de Bolognesi e colegas é de 2018.
- **Medidas antigas para os anos recentes:** os três estudos são de 2018 a 2021. Para 2022 em diante, só o voto na Câmara mede os partidos como eles são hoje.
- **Voto do líder:** o voto na Câmara usa a orientação do líder, não o voto de cada deputado. Uma versão com o voto nominal de cada deputado e um modelo de ponto ideal (Zucco e Lauderdale, 2011) fica como próximo passo.

## Referências

- BOLOGNESI, Bruno; RIBEIRO, Ednaldo; CODATO, Adriano. Uma nova classificação ideológica dos partidos políticos brasileiros. *Dados*, Rio de Janeiro, v. 66, n. 2, e20210164, 2023. doi:10.1590/dados.2023.66.2.303.
- CÂMARA DOS DEPUTADOS. *Dados Abertos*: votações e orientações de bancada no Plenário, 2019-2026. Disponível em: https://dadosabertos.camara.leg.br.
- LAVER, Michael; BENOIT, Kenneth; GARRY, John. Extracting policy positions from political texts using words as data. *American Political Science Review*, v. 97, n. 2, p. 311-331, 2003.
- LINDBERG, Staffan I. et al. *Varieties of Party Identity and Organization (V-Party) Dataset V2*. Gotemburgo: V-Dem Project, 2022. doi:10.23696/vpartydsv2.
- ZUCCO, Cesar. Ideology or what? Legislative behavior in multiparty presidential settings. *The Journal of Politics*, v. 71, n. 3, p. 1076-1092, 2009.
- ZUCCO, Cesar; LAUDERDALE, Benjamin E. Distinguishing between influences on Brazilian legislative behavior. *Legislative Studies Quarterly*, v. 36, n. 3, p. 363-396, 2011.
- ZUCCO, Cesar; POWER, Timothy J. The ideology of Brazilian parties and presidents: a research note on coalitional presidentialism under stress. *Latin American Politics and Society*, v. 66, n. 1, p. 178-188, 2024. Dados: Harvard Dataverse, doi:10.7910/DVN/6KVTUV.
