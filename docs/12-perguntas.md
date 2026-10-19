# As 12 perguntas

As perguntas de pesquisa do trabalho, respondidas com as eleições de todo o Brasil. As consultas estão em `scripts/consultas_brasil.sql`, em dialeto DuckDB. Cada bloco começa com `-- @id | descrição`, e `scripts/rodar_consultas.py` roda todos e grava o SQL, as colunas e as linhas em `data/br/perguntas.json`.

No site (`#/perguntas/q1` … `q12`), cada pergunta tem:

- a resposta em uma frase;
- um gráfico com a opção Gráfico | Tabela;
- os recortes (cargo, ano);
- em "De onde vêm esses números": o método, as tabelas do banco usadas e cada consulta SQL com o resultado.

Os números abaixo são os da última rodada das consultas. Os títulos do site são montados a partir do resultado, então mudam sozinhos se o banco for atualizado.

Mudanças em relação ao MySQL da versão dos 6 estados: `COUNT_IF` e `CAST(... AS INT)` no lugar de somar booleano, `string_agg` no lugar de `GROUP_CONCAT`, e `strip_accents` no lugar da collation sem acento.

| | Pergunta | Consultas | Resposta |
|---|---|---|---|
| Q1 | Quanto custa uma cadeira? | q1, q1b | Em 2022, cada cadeira de deputado federal custou R$ 6,2 milhões em despesas de campanha, 2,5 vezes o custo de 2018. Vereador em 2024: R$ 45 mil; prefeito: R$ 682 mil. |
| Q2 | Quem tem mais dinheiro se elege mais? | q2 | Entre os candidatos a deputado federal de 2022 com mais dinheiro (o quinto mais rico), 23% se elegeram. Entre os 6.378 com menos dinheiro, 3. |
| Q3 | A cidade rica vota diferente da cidade pobre? | q3 | Em 2022, a esquerda ficou em 1º para governador em 59% das cidades pequenas e pobres e em 14% das pequenas e ricas. A renda separa mais que o tamanho. |
| Q4 | Cidade grande elege quem estudou mais? | q4 | Nas cidades com mais de 100 mil habitantes, 59% dos eleitos em 2024 tinham curso superior; nas com até 20 mil, 31%. Nas grandes, 39% dos candidatos tinham diploma, mas 59% dos eleitos. |
| Q5 | Quem ainda vota só no número do partido? | q5, q5b | O voto de legenda para deputado federal caiu de 9,9% (2002) para 3,0% (2026). Para vereador, de 12,8% (2000) para 4,1% (2024). |
| Q6 | Do que falam os planos de governo? | q6, q6b | 92% dos planos da esquerda para presidente falam de racismo ou igualdade racial; na direita, 15%. Reforma agrária: 83% contra 10%. |
| Q7 | Jovem tem chance de se eleger? | q7, q7b | Em 2024, 11,5% dos candidatos com até 29 anos se elegeram prefeito ou vereador, contra 14,4% dos mais velhos. Em todos os campos políticos, os jovens são de 4,7% a 5,1% dos eleitos. |
| Q8 | Para quem as empresas doavam? | q8, q8b | Para todos os lados: em 2014, as empresas pagavam de 23% a 31% das campanhas de cada campo. Depois da proibição de 2015, eram 0,4% em 2018. |
| Q9 | Para que lado a sua cidade foi? | q9 | Desde 2014, a disputa para presidente é esquerda contra direita. Em 2026, no 1º turno, 50% a 45%. Para prefeito, a direita está na frente em mais cidades desde 2012. |
| Q10 | Quem vive de dinheiro público? | q10 | Em 2022, um deputado federal eleito recebeu em média R$ 1,6 milhão de dinheiro público; quem perdeu, R$ 199 mil, 8 vezes menos. |
| Q11 | Onde vai o dinheiro da campanha? | q11 | Em 2024, 20% do gasto das campanhas foi com material impresso (R$ 1,3 bilhão). O impulsionamento nas redes foi de 2,3% (2018) para 5,0% (2024). |
| Q12 | Quanto dura uma carreira política? | q12, q12b, q12c | De cada 100 deputados, senadores e governadores eleitos em 2018, 57 se elegeram de novo em 2022 e 40 em 2026. De 1994 a 2026, 254.121 pessoas venceram alguma eleição; 57% venceram uma só. |

## Limites de cada resposta

- **Q1, Q2, Q10, Q11:** valores da época, sem correção pela inflação. São as despesas e receitas declaradas pelos candidatos na prestação de contas final.
- **Q2:** dinheiro e voto andam juntos nos dois sentidos, porque quem tem chance de ganhar atrai mais doação e mais fundo do partido. A tabela mostra associação, não causa.
- **Q3, Q6, Q7, Q8, Q9:** o lado político usa a nota do partido na época de cada eleição (view `vw_partido_ano`, ver [regua-dos-partidos.md](regua-dos-partidos.md)). O PSDB fica perto da fronteira entre centro e centro-direita (+0,25) e muda de faixa em alguns anos.
- **Q5:** 1998 fica de fora, porque o arquivo do TSE daquele ano não separa o voto de legenda.
- **Q6:** a busca é por palavras, sem acento e sem maiúscula. Citar um tema não diz se o plano é a favor ou contra: a esquerda cita "privatização" mais vezes, muitas vezes para criticar.
- **Q8:** em 2010, 2012 e 2014, dinheiro de empresa repassado pelo partido aparece como receita do partido. A parte das empresas é, então, no mínimo a mostrada.
- **Q12:** 1996 fica de fora, porque os arquivos daquele ano não trazem o título de eleitor. Senador tem mandato de oito anos, o que puxa para baixo a volta de 4 anos nas eleições gerais.

## A primeira versão (6 estados)

A pasta `trabalho-6-estados/` guarda a versão original do trabalho, com Ceará, Espírito Santo, Mato Grosso, Paraná, Santa Catarina e Tocantins:

- o modelo relacional (`modelo_votacao_grupo6.sql`);
- as consultas em MySQL (`consultas_questoes.sql`);
- os scripts de carga e de respostas;
- as respostas (`RESPOSTAS_Q1_a_Q12.md`) e os resultados em CSV.
