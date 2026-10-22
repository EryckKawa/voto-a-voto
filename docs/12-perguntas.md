# As 12 perguntas

As perguntas de pesquisa do trabalho, respondidas com as eleições de todo o Brasil. As consultas estão em `scripts/consultas_brasil.sql`, em dialeto DuckDB. Cada bloco começa com `-- @id | descrição`, e `scripts/rodar_consultas.py` roda todos e grava o SQL, as colunas e as linhas em `data/br/perguntas.json`.

No site (`#/perguntas/q1` … `q12`), cada pergunta tem:

- a resposta em uma frase;
- um gráfico com a opção Gráfico | Tabela;
- os recortes (cargo, ano);
- em "De onde vêm esses números": o método, as tabelas do banco usadas e cada consulta SQL com o resultado.

Os números abaixo são os da última rodada das consultas. Os títulos do site são montados a partir do resultado, então mudam sozinhos se o banco for atualizado.

As consultas q2b, q2c, q3b, q3c, q4b, q4c, q7c, q7d e q9b (bens declarados, IDHM, escolaridade das cidades, idade do eleitorado e nota média por cargo) foram acrescentadas em 22/10/2026, a partir das anotações do grupo. Elas rodaram num banco montado com as etapas `base`, `cand` (2018 a 2024), `partido_votos`, `idhm`, `bens`, `eleitorado`, `notas` e `views` de `banco_brasil.py`; as outras consultas são as da última rodada completa.

Mudanças em relação ao MySQL da versão dos 6 estados: `COUNT_IF` e `CAST(... AS INT)` no lugar de somar booleano, `string_agg` no lugar de `GROUP_CONCAT`, e `strip_accents` no lugar da collation sem acento.

| | Pergunta | Consultas | Resposta |
|---|---|---|---|
| Q1 | Quanto custa uma cadeira? | q1, q1b | Em 2022, cada cadeira de deputado federal custou R$ 6,2 milhões em despesas de campanha, 2,5 vezes o custo de 2018. Vereador em 2024: R$ 45 mil; prefeito: R$ 682 mil. |
| Q2 | Quem tem mais dinheiro se elege mais? | q2b, q2c, q2 | Entre os candidatos a deputado federal de 2022 que declararam mais de R$ 5 milhões em bens, 23% se elegeram; entre os que não declararam bem nenhum, 0,4%. Metade dos eleitos tinha mais de R$ 1 milhão em bens; metade dos que perderam, menos de R$ 46 mil. Pelo dinheiro de campanha, o quinto com mais receita elegeu 23%; os 6.378 com menos, 3. |
| Q3 | A cidade rica vota diferente da cidade pobre? | q3b, q3c, q3 | Em 2022, a esquerda ficou em 1º para presidente em 97% das cidades de IDHM baixo ou muito baixo e em 14% das de IDHM muito alto (faixas do PNUD). Cidade a cidade, a correlação entre o IDHM e a nota média dos votos para presidente foi de 0,77 (renda por habitante: 0,82; tamanho: 0,07). Para prefeito, 0,24. Para governador, a esquerda ficou em 1º em 59% das cidades pequenas e pobres e em 14% das pequenas e ricas. |
| Q4 | Cidade mais estudada elege quem estudou mais? | q4b, q4c, q4 | Nas cidades com o IDHM Educação mais alto, 48% dos vereadores eleitos em 2024 tinham curso superior; nas com o mais baixo, 28% (onde só 3% dos adultos têm diploma). A correlação, cidade a cidade, é de 0,44 com a parte dos adultos com diploma e de 0,46 com o tamanho da cidade. Nas cidades com mais de 100 mil habitantes, 59% dos eleitos tinham diploma; nas com até 20 mil, 31%. |
| Q5 | Quem ainda vota só no número do partido? | q5, q5b | O voto de legenda para deputado federal caiu de 9,9% (2002) para 3,0% (2026). Para vereador, de 12,8% (2000) para 4,1% (2024). |
| Q6 | Do que falam os planos de governo? | q6, q6b | 92% dos planos da esquerda para presidente falam de racismo ou igualdade racial; na direita, 15%. Reforma agrária: 83% contra 10%. |
| Q7 | Jovem vota em jovem? | q7c, q7d, q7, q7b | Não. Nas cidades com o eleitorado mais jovem, 31% dos eleitores têm até 29 anos, mas só 5,1% dos vereadores eleitos em 2024; nas de eleitorado mais velho, 4,4%. O eleitor tinha 44,9 anos em média; o vereador eleito, 46,8; o senador de 2022, 58,1. Em 2024, 11,5% dos candidatos com até 29 anos se elegeram, contra 14,4% dos mais velhos. |
| Q8 | Para quem as empresas doavam? | q8, q8b | Para todos os lados: em 2014, as empresas pagavam de 23% a 31% das campanhas de cada campo. Depois da proibição de 2015, eram 0,4% em 2018. |
| Q9 | Para que lado a sua cidade foi? | q9b, q9 | Desde 2014, a disputa para presidente é esquerda contra direita. Em 2026, no 1º turno, 50% a 45%. Somando os votos de cada partido pela nota dele (Σ votos × nota ÷ Σ votos), o país vota mais à direita para deputado e vereador do que para presidente: em 2022, +0,15 para deputado federal e −0,10 para presidente; para vereador, de +0,07 (2008) a +0,18 (2024). A página mostra a linha de cada cidade, cargo a cargo. |
| Q10 | Quem vive de dinheiro público? | q10 | Em 2022, um deputado federal eleito recebeu em média R$ 1,6 milhão de dinheiro público; quem perdeu, R$ 199 mil, 8 vezes menos. |
| Q11 | Onde vai o dinheiro da campanha? | q11 | Em 2024, 20% do gasto das campanhas foi com material impresso (R$ 1,3 bilhão). O impulsionamento nas redes foi de 2,3% (2018) para 5,0% (2024). |
| Q12 | Quanto dura uma carreira política? | q12, q12b, q12c | De cada 100 deputados, senadores e governadores eleitos em 2018, 57 se elegeram de novo em 2022 e 40 em 2026. De 1994 a 2026, 254.121 pessoas venceram alguma eleição; 57% venceram uma só. |

## Limites de cada resposta

- **Q1, Q2, Q10, Q11:** valores da época, sem correção pela inflação. São as despesas e receitas declaradas pelos candidatos na prestação de contas final.
- **Q1:** o custo é o gasto de todos os candidatos do partido dividido pelas cadeiras que ele ganhou (custo por cadeira). O gasto médio por candidato seria outra conta: ele mede quanto custa disputar, não quanto custa vencer.
- **Q2 (bens):** o patrimônio é o que o candidato declarou ao TSE, pelo valor que ele mesmo informou (muitas vezes o de compra). Quem não declarou nada conta como zero; não declarar não quer dizer não ter.
- **Q2:** dinheiro e voto andam juntos nos dois sentidos, porque quem tem chance de ganhar atrai mais doação e mais fundo do partido. A tabela mostra associação, não causa.
- **Q3, Q4 (IDHM):** o IDHM das cidades é o do Atlas do Desenvolvimento Humano com o Censo 2010, o último calculado por município. Seis cidades criadas depois de 2010 ficam de fora.
- **Q3, Q6, Q7, Q8, Q9:** o lado político usa a nota do partido na época de cada eleição (view `vw_partido_ano`, ver [regua-dos-partidos.md](regua-dos-partidos.md)). O PSDB fica perto da fronteira entre centro e centro-direita (+0,25) e muda de faixa em alguns anos.
- **Q5:** 1998 fica de fora, porque o arquivo do TSE daquele ano não separa o voto de legenda.
- **Q6:** a busca é por palavras, sem acento e sem maiúscula. Citar um tema não diz se o plano é a favor ou contra: a esquerda cita "privatização" mais vezes, muitas vezes para criticar.
- **Q7 (idade do eleitorado):** o voto é secreto, então a pergunta "jovem vota em jovem?" é respondida cidade a cidade (as cidades com mais eleitores jovens elegem mais jovens?), não eleitor a eleitor. O perfil do eleitorado do TSE vem ano a ano, por isso não foi preciso projetar a população por idade entre os censos.
- **Q8:** em 2010, 2012 e 2014, dinheiro de empresa repassado pelo partido aparece como receita do partido. A parte das empresas é, então, no mínimo a mostrada.
- **Q9 (nota média):** usa os votos por partido (nominais e de legenda) do arquivo `votacao_partido_munzona`, que não traz presidente, governador e senador em 1994, nem presidente em 1998; nesses anos vale a série por campo político (q9), que usa os votos por candidato. Na linha de cada cidade só entram as eleições em que pelo menos 80% dos votos foram para partidos com nota.
- **Q12:** 1996 fica de fora, porque os arquivos daquele ano não trazem o título de eleitor. Senador tem mandato de oito anos, o que puxa para baixo a volta de 4 anos nas eleições gerais.

## A primeira versão (6 estados)

A pasta `trabalho-6-estados/` guarda a versão original do trabalho, com Ceará, Espírito Santo, Mato Grosso, Paraná, Santa Catarina e Tocantins:

- o modelo relacional (`modelo_votacao_grupo6.sql`);
- as consultas em MySQL (`consultas_questoes.sql`);
- os scripts de carga e de respostas;
- as respostas (`RESPOSTAS_Q1_a_Q12.md`) e os resultados em CSV.
