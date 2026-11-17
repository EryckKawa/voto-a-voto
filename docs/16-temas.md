# Os 16 temas do enunciado

As perguntas do trabalho são os 16 temas de `questoes_analise_dados_eleitorais` (o enunciado da disciplina), respondidos com as eleições de todo o Brasil, de 1994 a 2026. No site, cada tema é uma página (`#/perguntas/t1` … `t16`), com:

- o que o enunciado pede, com as palavras dele;
- a **resposta** em uma frase;
- **o que os dados mostram**: de 3 a 5 pontos, cada um com um número;
- os gráficos, com recortes e a opção Gráfico | Tabela;
- **cuidado ao ler**: os limites da resposta;
- **de onde vêm esses números**: método, fonte, tabelas do banco e os identificadores das consultas.

O código SQL fica em `scripts/consultas_brasil.sql` (dialeto DuckDB), não na página: cada bloco começa com `-- @id | descrição`, e `scripts/rodar_consultas.py` roda todos e grava as colunas e linhas em `data/br/perguntas.json` (sem o texto do SQL). Os textos do site são montados a partir das linhas, então mudam sozinhos se o banco for atualizado. Os ids `q1` … `q12e` são as consultas da versão anterior (12 perguntas); os `t1a` … `t16c` foram acrescentados em 16/11/2026 para os temas e partes de tema que faltavam.

Os endereços antigos `#/perguntas/q1` … `q12` continuam funcionando e levam ao tema que responde a mesma pergunta: q1→t1, q2→t2, q3→t3, q4→t4, q5→t7, q6→t9, q7→t10, q8→t12, q9→t14, q10→t15, q11→e1, q12→e2.

## Do vereador ao presidente (17/11/2026)

Várias partes olhavam um cargo só (quase sempre deputado federal 2022, prefeito 2024 ou presidente). Agora cada parte de cada tema responde cargo a cargo, na ordem **vereador, prefeito, deputado estadual, deputado federal, senador, governador e presidente**:

- **Página das perguntas (versão de 17/11, noite)**: cada parte tem a pergunta, a resposta e um cartão de gráfico com abas (o que ver), uma barra de filtros (cargo em botões, do vereador ao presidente, e eleição numa lista; no celular, as duas são listas de seleção) e o botão Gráfico | Tabela. No topo do tema, um índice leva a cada parte. Saíram os blocos de resumo: a lista por cargo embaixo de cada resposta, a aba "Mais números, ano a ano e cargo a cargo" e as caixas "Em resumo" das páginas Ninguém e O que o voto revela.
- **Botões de cargo nos gráficos**: os recortes que eram de um cargo só ganharam uma fila de botões, do vereador ao presidente (`porCargo` em `js/perguntas.js`); o primeiro aberto é o cargo citado no texto. Alguns gráficos comparam os sete cargos lado a lado (custo por cadeira, milionários, escolaridade, "Ninguém", eleitores por cadeira, despesas, volta ao poder).
- **Consultas**: 21 consultas passaram a cobrir todos os cargos com as mesmas colunas (`q1`, `q1b`, `q2`, `q2b`, `q2c`, `q3b`, `q3c`, `q7d`, `q10`, `q10b`, `t1a`, `t1b`, `t1c`, `t4a`, `t5c`, `t6a`, `t6c`, `t14a`, `t14b`, `t15a`, `t16c`) e entraram 14 novas, cargo a cargo: `q5c`, `q6f`, `q7e`, `q8c`, `q12f`, `t8c`, `t9c`, `t10d`, `t10e`, `t10f`, `t11c`, `t12a`, `t13b`, `t16d`.
- **Mudança de regra no tema 5**: o "sobrenome de ex-prefeito" agora exige que o ex-prefeito seja **outra pessoa** (antes, um deputado que tinha sido prefeito contava a si mesmo). Sem isso, o candidato a prefeito que tenta a reeleição apareceria como "família". Por isso o número do deputado estadual mudou de 39% contra 14% (2,7 vezes) para 45% contra 15% (3 vezes).
- Lado do voto por cidade: para prefeito, senador, governador e presidente, o partido do 1º colocado (o do eleito, para prefeito no tema 14); para vereador e deputado, o partido mais votado na cidade, contando a legenda.
- **Filtro de ano**: abaixo dos botões de cargo há uma fila "Eleição" com todos os anos que têm dados para aquele cargo (dinheiro de campanha: 2010 a 2026; bens, escolaridade, idade e votos: 1994 a 2026; perfil do eleitorado: 2018 a 2024; Bolsa Família: 2004 a 2024). O ano escolhido vale para o recorte inteiro: ao trocar de cargo, cada um usa a sua eleição até aquele ano. Nos gráficos que comparam os sete cargos lado a lado, a fila escolhe a eleição: vereador e prefeito na municipal até o ano escolhido, os demais na geral. Os rankings (cidades com mais "Ninguém", partidos por gasto por voto, por legenda, eleitores por cadeira estado a estado) ficam assim classificáveis em qualquer eleição. Para isso, 21 consultas deixaram de ter ano fixo (`q1`, `q1b`, `q2`, `q2b`, `q2c`, `q3b`, `q3c`, `q5c`, `q7e`, `q10`, `q10b`, `t1a`, `t1b`, `t1c`, `t4a`, `t5c`, `t6a`, `t8c`, `t11c`, `t15a`, `t16d`). As listas "Do vereador ao presidente" continuam na eleição mais recente de cada cargo.
- Grupos pequenos: presidente (11 a 14 candidatos), governador e senador (cerca de 200) aparecem com o número de candidatos ao lado da porcentagem.

## Onde está cada tema

| Tema | Página | Consultas |
|---|---|---|
| 1. Custos de campanha e eleição | `#/perguntas/t1` | `q1`, `q1b`, `q1c`, `q2`, `t1a`, `t1b`, `t1c` |
| 2. Taxa de sucesso e patrimônio | `#/perguntas/t2` | `q2b`, `q2c` |
| 3. Índices municipais e comportamento eleitoral | `#/perguntas/t3` | `q3b`, `q3c`, `q3` |
| 4. Escolaridade, capacidade eleitoral e patrimônio | `#/perguntas/t4` | `t4a`, `t1c`, `q4b`, `q4c`, `q4` |
| 5. Sobrenome, cidade e concentração eleitoral | `#/perguntas/t5` | `t5a`, `t5b`, `t5c` |
| 6. Votos brancos, nulos e abstenção | `#/perguntas/t6` | `t6c`, `t6a`, `t6b` |
| 7. Votos por legenda | `#/perguntas/t7` | `q5`, `q5b`, `q5c`, `t7a` |
| 8. Quantidade de vereadores e número de votos | `#/perguntas/t8` | `t8a`, `t8b`, `t8c` |
| 9. Propostas dos candidatos ao longo do tempo | `#/perguntas/t9` | `t9a`, `t9c`, `t9b`, `q6`, `q6f`, `q6b`, `q6c`, `q6d`, `q6e` |
| 10. Idade e alternância de poder | `#/perguntas/t10` | `t10a`, `t10d`, `t10b`, `t10f`, `t10c`, `t10e`, `q7c`, `q7d`, `q7e`, `q7` |
| 11. Doações de campanha e Bolsa Família | `#/perguntas/t11` | `t11a`, `t11b`, `t11c`, `q8c` |
| 12. Doações de pessoas jurídicas e viés político | `#/perguntas/t12` | `q8`, `q8b`, `q8c`, `t12a` |
| 13. Viés político regional | `#/perguntas/t13` | `t13a`, `t13b` |
| 14. Manutenção do viés político ao longo do tempo | `#/perguntas/t14` | `t14a`, `t14b`, `q9`, `q9b` |
| 15. Dependência de repasses públicos e financiamento | `#/perguntas/t15` | `t15a`, `q10`, `q10b` |
| 16. Candidatos, partidos e processos | `#/perguntas/t16` | `t16a`, `t16b`, `t16c`, `t16d` |
| +1. Onde vai o dinheiro da campanha? | `#/perguntas/e1` | `q11`, `q11b`, `q11c` |
| +2. Qual é o histórico de cada político? | `#/perguntas/e2` | `q12`, `q12f`, `q12b`, `q12c`, `q12d`, `q12e` |

## As respostas

Os números abaixo são os da última rodada das consultas (17/11/2026), copiados das páginas.

### Tema 1. Custos de campanha e eleição

**O enunciado pede:** Quanto custa, em média, uma cadeira eletiva? Analisar o gasto de campanha dos candidatos. Avaliar a relação entre o gasto de campanha e o resultado eleitoral (eleito ou não eleito). Calcular o coeficiente entre gasto de campanha e número de votos e elaborar um ranking, inclusive considerando o viés ideológico. Relacionar escolaridade e custo médio da eleição.

**Resposta:** Uma cadeira de deputado federal custou R$ 6,2 milhões em 2022, 2,5 vezes o custo de 2018. Uma de vereador, R$ 45 mil em 2024.

- Custo por cadeira é tudo o que os candidatos gastaram ÷ número de eleitos. Prefeito em 2024: R$ 682 mil. Pela outra conta, o gasto médio de cada candidato a deputado federal foi de R$ 298 mil.
- Gasto e resultado andam juntos. Entre os candidatos a deputado federal com mais dinheiro (os 20% do topo), 23% se elegeram; entre os 20% com menos, praticamente nenhum.
- Coeficiente gasto × votos: a correlação, candidato a candidato, foi de 0,73 para deputado federal em 2022 (1 seria relação perfeita). E quem perde paga mais caro por voto: o eleito típico gastou R$ 18,12 por voto; o não eleito, R$ 46,03.
- Ranking por partido: o voto mais caro para deputado federal foi o do União Brasil (R$ 51,11); o mais barato, o do PL (R$ 12,81). Por campo político: esquerda R$ 24,70, centro R$ 36,63, direita R$ 30,68 por voto.
- Escolaridade e custo: o candidato a deputado federal com curso superior gastou em média R$ 400 mil; o com ensino médio, R$ 140 mil. O de curso superior também se elegeu mais: 6,9% contra 1,1%.

**Cuidado:** Valores da época, sem correção pela inflação, e só o que os candidatos declararam ao TSE. Dinheiro e voto andam juntos nos dois sentidos: quem já tem chance de ganhar atrai mais doação e mais fundo do partido. É associação, não prova de que o gasto elege. A prestação de contas de 2026 ainda está chegando ao TSE.

### Tema 2. Taxa de sucesso e patrimônio

**O enunciado pede:** Qual é a taxa de sucesso eleitoral por faixa de patrimônio declarado?

**Resposta:** Quanto mais patrimônio, maior a chance: dos candidatos a deputado federal de 2022 com mais de R$ 5 milhões em bens, 23% se elegeram; dos que não declararam bem nenhum, 0,4%.

- A chance sobe a cada faixa de patrimônio, para todos os cargos. Para prefeito em 2024, foi de 19% (sem bens) a 45% (mais de R$ 5 milhões).
- O eleito é mais rico que o derrotado. Metade dos deputados federais eleitos em 2022 declarou mais de R$ 1 milhão; metade dos que perderam, menos de R$ 46 mil.
- Também na cidade: o vereador eleito típico de 2024 declarou R$ 92 mil; o não eleito, R$ 11 mil.
- 51% dos deputados federais eleitos em 2022 declararam R$ 1 milhão ou mais em bens; entre os que perderam, 12%.

**Cuidado:** O patrimônio é o que o candidato declarou, pelo valor que ele mesmo informou (muitas vezes o de compra). Não declarar não quer dizer não ter. É associação, não causa: quem tem patrimônio costuma ter mais tempo, contatos e apoio do partido.

### Tema 3. Índices municipais e comportamento eleitoral

**O enunciado pede:** Como os índices do município se relacionam com o voto de cada candidato? Há relação com o viés ideológico?

**Resposta:** Sim, e muito para presidente: em 2022, a esquerda ficou em 1º em 97% das cidades de IDHM baixo e em 14% das de IDHM muito alto.

- Quanto mais desenvolvida a cidade, mais à direita ela vota para presidente. Cidade a cidade, a correlação entre o IDHM e o lado do voto foi de 0,77 em 2022; a renda por habitante separa ainda um pouco mais (0,82).
- O tamanho da cidade quase não importa (correlação de 0,07).
- Na eleição local o efeito encolhe: 0,33 para governador e 0,24 para prefeito. Para governador, a esquerda ficou em 1º em 59% das cidades pequenas e pobres e em 14% das pequenas e ricas.
- Índices e abstenção: em 2024, faltaram 25% dos eleitores nas cidades grandes e ricas e 15% nas pequenas e pobres.

**Cuidado:** O IDHM é o do Censo 2010, o último calculado para as cidades; seis cidades criadas depois ficam de fora. Correlação entre cidades não diz como cada eleitor votou.

### Tema 4. Escolaridade, capacidade eleitoral e patrimônio

**O enunciado pede:** Existe relação entre escolaridade e capacidade de ser eleito? Comparar a escolaridade média do eleitorado com a escolaridade dos candidatos. Avaliar a relação entre escolaridade do eleitorado, escolaridade dos candidatos e patrimônio declarado.

**Resposta:** Sim: o eleito é bem mais estudado que o eleitor. Em 2024, 11% dos eleitores tinham curso superior; entre os vereadores eleitos, 35%; entre os deputados federais eleitos em 2022, 83%.

- Diploma aumenta a chance de se eleger nos cargos de deputado e vereador: 6,9% dos candidatos a deputado federal com superior completo se elegeram, contra 1,1% dos com ensino médio. Para vereador, 17,9% contra 12,9%.
- Para prefeito, não: 36,0% dos candidatos com diploma e 36,1% dos com ensino médio se elegeram.
- O eleitor escolhe quem estudou mais que ele: entre os candidatos a vereador de 2024, 27% tinham diploma; entre os eleitos, 35%.
- Escolaridade anda com patrimônio: o candidato a deputado federal com diploma declarou, tipicamente, R$ 199 mil em bens; o com ensino médio, R$ 0.
- Cidade mais estudada elege mais diplomados: nas cidades com o IDHM Educação mais alto, 48% dos vereadores eleitos tinham diploma; nas com o mais baixo, 28%.

**Cuidado:** A escolaridade é a que cada um declarou ao TSE (o eleitor, no cadastro; o candidato, no registro). Mediana do patrimônio: metade declarou mais, metade menos. Quem não declarou bens conta como zero.

### Tema 5. Sobrenome, cidade e concentração eleitoral

**O enunciado pede:** Existe relação entre sobrenome e cidade de origem/atuação e a concentração de votos, caracterizando um possível “curral eleitoral”?

**Resposta:** Há sinais fortes: em 16% das cidades, duas ou mais pessoas com o mesmo sobrenome já foram eleitas prefeito desde 2000. E o deputado estadual que tem o sobrenome de um ex-prefeito da cidade onde mais recebe votos se elegeu 3 vezes mais (45% contra 15%, em 2022).

- Famílias no poder local: 870 cidades tiveram dois ou mais prefeitos com o mesmo sobrenome; em 635, esse sobrenome governou em 3 ou mais mandatos. A região com mais casos é o Nordeste (22% das cidades).
- Exemplo extremo: em Joca Marques (PI), o sobrenome Marques ganhou 7 das 7 eleições, com 6 pessoas diferentes.
- O sobrenome ajuda o deputado: para deputado federal em 2022, 15% dos que tinham o sobrenome de um ex-prefeito da sua cidade-reduto se elegeram, contra 10% dos demais. Para vereador em 2024, 34% contra 14%.
- Votos concentrados: o deputado estadual eleito típico tirou 33% dos seus votos de uma só cidade; 27% deles tiraram mais da metade de uma cidade só.

**Cuidado:** Sobrenome igual não prova parentesco. Para reduzir coincidências, ficam de fora os 50 sobrenomes mais comuns (Silva, Santos, Oliveira...) e só contam pessoas diferentes. Mulheres que adotam o sobrenome do marido entram como da mesma família, o que costuma ser verdade na política local. 1996 fica de fora porque não há título de eleitor para separar as pessoas.

### Tema 6. Votos brancos, nulos e abstenção

**O enunciado pede:** Analisar a soma de votos brancos e nulos em conjunto com a abstenção e sua relação com o resultado eleitoral. Construir uma listagem/ranking dos municípios ou eleições com maior concentração desses indicadores.

**Resposta:** Em 2024, 42,6 milhões de eleitores (27,3%) não escolheram ninguém para prefeito. Onde esse "Ninguém" é maior, muitas vezes não havia escolha: 18% dessas cidades tinham um só candidato.

- Somando abstenção, brancos e nulos, o "Ninguém" foi de 33,2% (presidente, 1994) a 24,4% (presidente, 2022). Hoje, o maior pedaço é a abstenção: 21,7% em 2024.
- Relação com o resultado: no grupo de cidades com mais "Ninguém" em 2024, ele teve mais votos que o 1º colocado em 17% das cidades; no grupo com menos, em 0%.
- Quem lidera o ranking: Porto Real (RJ), onde 60,4% do eleitorado não escolheu ninguém para prefeito (43,9% votaram em branco ou nulo). No outro extremo, Entre Rios (SC), com 5,3%.
- Cidade grande falta mais: no grupo com mais "Ninguém", a cidade típica tem 23.731 eleitores; no grupo com menos, 4.208.

**Cuidado:** Parte da abstenção é de quem mudou de cidade ou morreu e continua no cadastro. Com um candidato só, branco e nulo são a única forma de não votar nele.

### Tema 7. Votos por legenda

**O enunciado pede:** Quantos votos são obtidos por legenda e quantos candidatos são eleitos por esse meio?

**Resposta:** Cada vez menos: em 2026, 3,0% dos votos para deputado federal foram só no número do partido (3.431.700 votos), o que valeu cerca de 14 das 513 cadeiras. Em 2002, eram 44.

- O voto de legenda caiu de 9,9% (2002) para 3,0% (2026) para deputado federal, e de 12,8% (2000) para 4,1% (2024) para vereador.
- Vereadores eleitos pela legenda: cerca de 1.795 das 58.144 cadeiras de 2024 (eram 5.950 em 2000).
- Quase ninguém se elege sozinho: só 6,6% dos deputados federais de 2026 tiveram votos próprios para uma cadeira inteira; os outros dependeram dos votos do partido.
- Quem ainda vive de legenda: em 2022, Novo (10% dos seus votos), PT (10% dos seus votos) e PDT (8% dos seus votos).

**Cuidado:** 1998 fica de fora: o arquivo do TSE daquele ano não separa o voto de legenda. “Cadeiras da legenda” é uma estimativa proporcional: o sistema distribui as cadeiras pelo total do partido, sem dizer qual voto elegeu quem.

### Tema 8. Quantidade de vereadores e número de votos

**O enunciado pede:** Qual é a relação entre a quantidade de vereadores eleitos e o número de votos obtidos?

**Resposta:** Cidade maior tem mais vereadores, mas bem menos que o tamanho dela: em São Paulo (SP), cada um dos 55 vereadores representa 169.499 eleitores; em Borá (SP), cada um dos 9 representa 122.

- O número de vereadores cresce devagar: as cidades com até 5 mil habitantes têm 9 vereadores em média; as com mais de 1 milhão, 39,6. A Constituição fixa de 9 a 55 cadeiras pela população.
- Por isso o voto vale mais na cidade pequena: 383 eleitores por vereador nas menores, 54.008 nas maiores.
- Votos para se eleger: o vereador eleito típico teve 168 votos nas cidades de até 5 mil habitantes e 8.362 nas de mais de 1 milhão.
- Mais disputa na cidade grande: 18,4 candidatos por vaga nas maiores, 3,8 nas menores. Cidade a cidade, a correlação entre o tamanho do eleitorado (em logaritmo) e o número de cadeiras é de 0,82.

**Cuidado:** Eleitores aptos são os do cadastro do TSE em 2024, não a população. Votos de legenda contam nos votos válidos por cadeira, mas não nos votos de nenhum candidato.

### Tema 9. Propostas dos candidatos ao longo do tempo

**O enunciado pede:** Como as propostas apresentadas por cada candidato evoluem ao longo da linha do tempo?

**Resposta:** As propostas seguem o assunto do momento: a pandemia estava em 73% dos planos de governador e presidente em 2022 e caiu para 21% em 2026; a inteligência artificial foi de 12% (2018) para 55% (2026).

- Assuntos novos: saúde mental e autismo apareciam em 27% dos planos de prefeito em 2020 e em 52% em 2024; a causa animal, de 51% para 60%.
- Cada candidato reescreve o plano: quando a mesma pessoa se candidata de novo, só — das palavras principais se repetem, em média. Mesmo no mesmo cargo, 5% dos planos são quase iguais ao anterior.
- Esquerda e direita falam de coisas diferentes: 92% dos planos da esquerda para presidente falam de racismo ou igualdade racial; na direita, 15%.
- Saúde, educação e emprego estão em quase todos (emprego aparece em mais de 90% dos planos de prefeito), por isso não aparecem como diferença.

**Cuidado:** A busca é por palavras: citar um assunto não diz se o plano é a favor ou contra. Plano escaneado como imagem não tem texto e fica de fora. Os planos só são publicados pelo TSE a partir de 2018 (presidente e governador) e 2020 (prefeito).

### Tema 10. Idade e alternância de poder

**O enunciado pede:** Existe relação entre a idade dos candidatos e a alternância de poder ao longo do tempo?

**Resposta:** Sim: quanto mais velho o prefeito, menor a chance de continuar. De 2004 a 2024, 71% dos prefeitos com até 39 anos que tentaram a reeleição conseguiram; com 70 anos ou mais, 49%.

- Quando o poder troca de mãos, entra alguém mais novo: em 2024, o prefeito que saiu tinha 52,5 anos em média; o que entrou, 49,9 anos.
- A alternância diminuiu: em 2016, 70% das prefeituras trocaram de partido; em 2024, 45%, e 43% reelegeram o mesmo prefeito.
- Na Câmara dos Deputados, o novato é mais jovem: em 2022, 44% dos deputados federais eram novatos, com 47,2 anos em média; os reeleitos tinham 53,5 anos.
- Mas jovem não vota em jovem: nas cidades com o eleitorado mais jovem, 31% dos eleitores têm até 29 anos, e só 5,1% dos vereadores eleitos em 2024.

**Cuidado:** A pessoa é seguida pelo título de eleitor; 1996 fica de fora por não ter o título. Partido pela linhagem: PFL, DEM e União contam como o mesmo, e PR e PL também, para mudança de nome não parecer troca. É associação: o prefeito mais velho pode, por exemplo, estar no segundo mandato e não poder concorrer a um terceiro.

### Tema 11. Doações de campanha e Bolsa Família

**O enunciado pede:** Como as doações de campanha de pessoas jurídicas (PJ) se comportam ao longo da linha do tempo em relação ao Bolsa Família?

**Resposta:** As duas linhas seguem caminhos separados: o Bolsa Família cresceu de 6,6 milhões de benefícios (2004) para 14,1 milhões (2014) enquanto as empresas pagavam de 24% a 35% das campanhas. Depois da proibição de 2015, a doação de empresas caiu a 0,6%, e o programa continuou.

- Antes da proibição, as empresas doavam igual em todo lugar: em 2012, pagavam 24% das campanhas municipais nas cidades onde o Bolsa Família alcança menos gente e 25% onde alcança mais.
- O alcance do programa separa o voto, não o dinheiro: em 2024, a esquerda elegeu o prefeito em 21% das cidades com mais benefícios por eleitor e em 6% das com menos; a direita, em 50% e 69%.
- Depois de 2015, o dinheiro público ocupou o lugar das empresas: em 2024, ele foi 69% a 73% da receita das campanhas municipais, em todos os grupos de cidades.
- O programa ficou maior em 2022: 21 milhões de benefícios em dezembro (como Auxílio Brasil), e 20,4 milhões em 2024.

**Cuidado:** O Bolsa Família é medido pelos benefícios pagos em dezembro; entre 2021 e 2023 o programa se chamou Auxílio Brasil. Em 2010, 2012 e 2014 parte do dinheiro de empresas passava pelo partido antes de chegar ao candidato, então a parte das empresas é no mínimo a mostrada. Comparar as duas séries mostra o que aconteceu ao mesmo tempo, não que uma causou a outra.

### Tema 12. Doações de pessoas jurídicas e viés político

**O enunciado pede:** Qual é a relação entre doações de pessoas jurídicas (PJ) e o viés político?

**Resposta:** As empresas doavam para todos os lados: em 2014, pagavam de 23% (direita) a 31% (centro-direita) das campanhas de cada campo político.

- Todos dependiam das empresas: em 2010, 38% de todo o dinheiro dos candidatos vinha de empresas (R$ 1,1 bilhão); em 2014, R$ 805,5 milhões.
- A proibição acabou com isso: o Supremo proibiu a doação de empresas em 2015; em 2018 ela era 0,4% da receita.
- Quem ocupou o lugar foi o dinheiro público (tema 15).

**Cuidado:** Em 2010, 2012 e 2014, o dinheiro de empresa que passava pelo partido aparece como receita do partido: a parte das empresas é no mínimo a mostrada. O campo político é o do partido do candidato naquela eleição.

### Tema 13. Viés político regional

**O enunciado pede:** Qual é o viés político predominante em determinada região? Representar os resultados por meio de um mapa de calor.

**Resposta:** O Nordeste é o mais à esquerda: em 2022, 70% dos votos para presidente foram para a esquerda. O Centro-Oeste e o Sul são os mais à direita: 55% e 56% para a direita.

- A divisão regional é recente: em 2002, todas as regiões deram pelo menos 72% dos votos para a esquerda; a separação entre Nordeste e Sul cresce a partir de 2006.
- Em 2014, a esquerda teve 83% no Nordeste e 51% no Sul.
- Os extremos em 2022: PI (esquerda com 77%) e RR (direita com 70%).
- Cidade a cidade, o mapa do site mostra o lado de quem venceu em cada uma das 5.570, em sete cargos.

**Cuidado:** O lado é o do partido do candidato naquela eleição (três estudos acadêmicos e o voto na Câmara). O PSDB fica na fronteira entre centro e direita e muda de faixa em alguns anos. É o voto para presidente; para prefeito e deputado o mapa regional é outro (veja o mapa).

### Tema 14. Manutenção do viés político ao longo do tempo

**O enunciado pede:** Na linha do tempo, o município mantém o mesmo viés político?

**Resposta:** Para prefeito, quase nunca: só 2% das cidades elegeram prefeitos do mesmo campo político em todas as eleições desde 1996. Para presidente, as cidades ficaram mais fiéis: 87% repetiram o lado de 2018 em 2022.

- Prefeito troca muito: a cidade típica mudou de lado umas 3,3 vezes em 8 eleições. Em 2012, só 46% repetiram o lado do prefeito anterior; em 2024, 61%.
- Presidente: 40% das cidades trocaram de lado uma vez só, e 1% nunca trocaram de 1994 a 2026. A polarização deixou o voto mais estável: 87% repetiram em 2026 o lado de 2022.
- Quando viram, viram juntas: de 2022 para 2026, 713 cidades passaram da esquerda para a direita para presidente, e 0 no sentido contrário.
- Abaixo, a linha da sua cidade, cargo a cargo, de 1994 a 2026.

**Cuidado:** O PSDB fica na fronteira entre centro e centro-direita e muda de faixa em alguns anos; isso conta como troca nas eleições de 1998 a 2014. Para presidente, o lado é o do 1º colocado na cidade no 1º turno; para prefeito, o do eleito.

### Tema 15. Dependência de repasses públicos e financiamento

**O enunciado pede:** Como se comportam os candidatos que dependem mais de repasses públicos em comparação com aqueles financiados por outras fontes?

**Resposta:** Quem depende só do fundo público perde mais: dos candidatos a deputado federal de 2022 com 90% ou mais de dinheiro público, 3,7% se elegeram; dos que misturavam dinheiro público e privado, 13%.

- O fundo vai para todos, mas em quantidades bem diferentes: o deputado federal eleito em 2022 recebeu, em média, R$ 1,6 milhão de dinheiro público; o não eleito, R$ 199 mil.
- Dinheiro só público costuma ser pouco: o candidato a deputado federal que viveu de 90% ou mais de fundo teve receita típica de R$ 80 mil e 903 votos; quem tinha menos da metade pública, R$ 108 mil e 3.713 votos.
- E o voto sai mais caro: R$ 36,85 por voto para quem depende do fundo, contra R$ 14,74 para quem tem menos da metade pública.
- Só dinheiro privado também não basta: 1,6% dos candidatos a deputado federal sem nenhum dinheiro público se elegeram. Para vereador, a diferença se repete: 9,8% (quase só fundo) contra 24,5% (menos da metade).

**Cuidado:** O partido manda mais dinheiro para quem já tem chance, então a relação entre fundo e vitória vale nos dois sentidos. “Dinheiro público” é o Fundo Especial de Financiamento de Campanha e o Fundo Partidário, como declarados pelo candidato.

### Tema 16. Candidatos, partidos e processos

**O enunciado pede:** Qual é o perfil dos processos em que cada candidato ou partido está envolvido?

**Resposta:** Os processos que aparecem nos dados abertos são os de registro de candidatura: em 2020, 30.013 candidaturas (5,6%) ficaram inaptas, e em 2022, 9,6%. O tipo mais comum é o registro negado (indeferido).

- Perfil dos processos: nas eleições municipais de 2008, 2012 e 2016, das 90.136 candidaturas barradas, 64% tiveram o registro negado (por falta de documento, de filiação ou por inelegibilidade, como na Lei da Ficha Limpa), 36% foram renúncias e 0,7% cassações.
- Partidos pequenos têm mais candidaturas barradas: em 2020 e 2022, 15,3% das candidaturas do PMB ficaram inaptas; no PP, 4,5%.
- Barrado também recebe voto: 213 dessas candidaturas ainda estavam na urna enquanto recorriam e receberam 779.629 votos, que não valeram.
- Ao longo do tempo: 8,1% das candidaturas ficaram inaptas em 2012 e 6,0% em 2016, depois da Lei da Ficha Limpa (2010).

**Cuidado:** Processos criminais, de improbidade ou de contas não estão nos dados abertos do TSE; aqui entram só os julgamentos do registro da candidatura. De 2014 a 2022 o TSE publica só “apto” ou “inapto”, sem o motivo; em 2024 e 2026 o campo veio vazio. Por isso o tipo de processo é mostrado de 2008 a 2016. Indeferido não quer dizer condenado: muitos registros são negados por falha de documentação.

### Pergunta a mais 1. Onde vai o dinheiro da campanha?

**O enunciado pede:** Pergunta a mais do grupo: onde o candidato investe em propaganda?

**Resposta:** Em papel: em 2024, 20% do dinheiro das campanhas foi para material impresso (R$ 1,3 bilhão), a maior despesa em todas as eleições desde 2018.

- A internet cresce devagar: o impulsionamento nas redes foi de 2,3% do gasto em 2018 para 5,0% em 2024.
- Cada cargo gasta de um jeito: em 2024, o vereador pôs 24% em material impresso e 18% em militância de rua; o prefeito, 10% em rádio, TV e vídeo.

**Cuidado:** As categorias são as que o próprio candidato escolhe na prestação de contas.

### Pergunta a mais 2. Qual é o histórico de cada político?

**O enunciado pede:** Pergunta a mais do grupo: o político e sua linha do tempo — sobrevivência na carreira.

**Resposta:** A carreira é curta para a maioria: de 1994 a 2026, 254.121 pessoas venceram alguma eleição, e 57% delas venceram uma só. Dos deputados, senadores e governadores eleitos em 2018, 57 em cada 100 voltaram em 2022.

- A ficha de cada um dos 2,4 milhões de candidatos está na página Políticos: cada eleição, partido, votos, dinheiro, bens e, para deputado federal, como votou na Câmara.

**Cuidado:** A mesma pessoa é seguida pelo título de eleitor; 1996 fica de fora. Senador tem mandato de oito anos, o que puxa para baixo a volta de 4 anos.

## As consultas

| Id | O que faz |
|---|---|
| `q1` | Custo por cadeira: despesa contratada do partido dividida pelas cadeiras que ele ganhou |
| `q1b` | Custo médio de uma cadeira, por cargo e ano (todos os partidos juntos) |
| `q1c` | Gasto médio por candidato (Σ gastos ÷ nº de candidatos do cargo), custo por cadeira (Σ gastos ÷ eleitos) e custo por mês de mandato |
| `q2` | Taxa de sucesso x dinheiro: candidatos em cinco grupos de receita (1 = menos dinheiro) |
| `q2b` | Taxa de sucesso x patrimônio declarado: candidatos em seis faixas pela soma dos bens que declararam ao TSE |
| `q2c` | Patrimônio dos eleitos x dos não eleitos: mediana, média e parte que não declarou nenhum bem |
| `q3` | Perfil do município (porte e riqueza, IBGE) x lado do mais votado x abstenção |
| `q3b` | IDHM do município (Atlas, Censo 2010) x campo político: nota média dos votos (−1 esquerda, +1 direita) e lado do mais votado |
| `q3c` | O que separa mais o voto: correlação entre a nota média da cidade e o IDHM, a renda (Atlas 2010) e o PIB por habitante (IBGE 2021) |
| `q4` | Grau de instrução do candidato x tamanho do município (2024, prefeito e vereador) |
| `q4b` | Escolaridade da cidade x escolaridade dos eleitos (2024): cidades em cinco grupos pelo IDHM Educação (Atlas, Censo 2010) |
| `q4c` | Correlação, cidade a cidade, entre a escolaridade da população e a dos vereadores eleitos (2024) |
| `q5` | Voto de legenda (só no número do partido) nos cargos proporcionais, 2000 a 2026 |
| `q5b` | Quem ainda vive de legenda: deputado federal 2022, partidos com mais de 500 mil votos |
| `q6` | Planos de governo para presidente (2018, 2022, 2026): parte dos planos que cita cada tema, por bloco |
| `q6b` | As palavras mais usadas em cada bloco (sem palavras curtas e comuns) |
| `q6c` | Nuvem de palavras de cada partido: as palavras mais usadas nos planos de governo dos seus candidatos a presidente, governador e prefeito (2018 a 2026) |
| `q6d` | As palavras de cada campo político, cargo a cargo: esquerda, centro e direita (planos de presidente, governador e prefeito) |
| `q6e` | As palavras típicas de cada campo político, cargo a cargo: as que ele usa bem mais que a média do cargo (presentes em pelo menos 3% dos seus planos) |
| `q7` | Jovens (até 29 anos na posse) x mais velhos: taxa de sucesso por ano |
| `q7b` | Jovens por espectro do partido (2018 a 2024, somados) |
| `q7c` | Jovem vota em jovem? Cidades em cinco grupos pela parte do eleitorado com até 29 anos x idade dos vereadores eleitos (2020 e 2024) |
| `q7d` | Idade de quem vota x idade de quem é eleito, no Brasil, por cargo (2018 a 2024) |
| `q8` | Dinheiro de empresas (pessoa jurídica) na receita dos candidatos, antes e depois da proibição (2015) |
| `q8b` | Doação de empresas por espectro do partido (2010, 2012 e 2014) |
| `q9` | Viés político na linha do tempo: votos e municípios por lado (esquerda, centro, direita; 1º turno; presidente nas gerais, prefeito nas municipais) |
| `q9b` | Viés político na linha do tempo, cargo a cargo: nota média dos votos (Σ votos do partido × nota do partido ÷ Σ votos), 1º turno, 1994 a 2026 |
| `q10` | Eleito x não eleito: dinheiro público (fundos) e privado, média por candidato |
| `q10b` | Recursos públicos x sucesso eleitoral: taxa de sucesso pela faixa de dinheiro público recebido (fundos eleitoral e partidário) |
| `q11` | Onde o candidato gasta: categorias de despesa contratada, por ano |
| `q11b` | Onde cada cargo investe em propaganda: parte do gasto de campanha por tipo de despesa (view vw_despesa_tipo), 2018 a 2024 |
| `q11c` | Onde cada campo político investe em propaganda: parte do gasto de propaganda por tipo, esquerda, centro e direita (2018 a 2024) |
| `q12` | Sobrevivência na carreira: dos eleitos no ano X, quantos se elegem de novo (qualquer cargo) 4 e 8 anos depois |
| `q12b` | Quantas eleições cada político ganhou entre 1994 e 2026 (pessoas ligadas pelo título de eleitor) |
| `q12c` | Os políticos que mais venceram eleições (1994 a 2026) |
| `q12d` | Histórico eleitoral de um político (a consulta da ficha de cada um; exemplo: quem mais venceu eleições de 1994 a 2026) |
| `q12e` | Como os deputados federais votam: quanto cada bancada segue a orientação do próprio partido e a do governo (Plenário, votações de mérito, 2019 a 2026) |
| `t1a` | Tema 1: gasto de campanha por voto recebido, partido a partido, com a nota do partido (−1 esquerda, +1 direita) |
| `t1b` | Tema 1: quanto o gasto acompanha os votos (correlação, candidato a candidato, em logaritmo) e o gasto por voto de eleitos e não eleitos, por campo político |
| `t1c` | Temas 1 e 4: escolaridade do candidato x chance de se eleger, gasto médio, gasto por voto e patrimônio (deputados 2022, prefeito e vereador 2024) |
| `t4a` | Tema 4: escolaridade do eleitorado x dos candidatos x dos eleitos, no Brasil (2022 e 2024) |
| `t5a` | Tema 5: cidades em que duas ou mais pessoas com o mesmo sobrenome já foram eleitas prefeito (2000 a 2024), por região |
| `t5b` | Tema 5: as cidades em que o mesmo sobrenome mais vezes ganhou a prefeitura, com pessoas diferentes (2000 a 2024) |
| `t5c` | Tema 5: concentração dos votos dos deputados (parte que veio da cidade onde tiveram mais votos) e sobrenome de ex-prefeito dessa cidade (2018 e 2022) |
| `t6a` | Tema 6: as cidades com mais e com menos "Ninguém" (abstenção + brancos + nulos) — prefeito 2024 e presidente 2022, 1º turno |
| `t6b` | Tema 6: o "Ninguém" e o resultado — cidades em cinco grupos pela parte do eleitorado que não escolheu ninguém para prefeito (1º turno) |
| `t6c` | Tema 6: abstenção, brancos e nulos no Brasil, eleição a eleição (presidente nas gerais, prefeito nas municipais; 1º turno) |
| `t7a` | Tema 7: quantas cadeiras vieram do voto de legenda e quantos eleitos tiveram, sozinhos, os votos de uma cadeira (quociente eleitoral) |
| `t8a` | Tema 8: número de vereadores e de votos, pelo tamanho da cidade (2024) |
| `t8b` | Tema 8: onde uma cadeira de vereador representa mais e menos eleitores (2024), e a correlação entre o tamanho do eleitorado e o número de cadeiras |
| `t9a` | Tema 9: os assuntos dos planos de governo ao longo do tempo — parte dos planos que cita cada assunto, eleição a eleição |
| `t9b` | Tema 9: o mesmo político de uma eleição para a outra — quanto o plano novo repete as palavras do anterior |
| `t10a` | Tema 10: prefeitos que tentaram a reeleição — quantos conseguiram, pela idade (2004 a 2024) |
| `t10b` | Tema 10: alternância de poder nas prefeituras, eleição a eleição — mesmo prefeito, mesmo partido ou troca — e a idade de cada grupo |
| `t10c` | Tema 10: renovação na Câmara dos Deputados — parte dos eleitos que não estava lá antes, e a idade de novatos e reeleitos |
| `t11a` | Tema 11: Bolsa Família e dinheiro de empresas nas campanhas, ano a ano (benefícios e valor pago em dezembro; doações com CNPJ) |
| `t11b` | Tema 11: cidades em cinco grupos pelo alcance do Bolsa Família (benefícios ÷ eleitores) x dinheiro de empresas e lado do prefeito eleito |
| `t13a` | Tema 13: mapa de calor — parte dos votos para presidente que foi para a esquerda, o centro e a direita, por estado e região (1º turno, 1994 a 2026) |
| `t14a` | Tema 14: quantas vezes cada cidade trocou de lado — o campo político do 1º colocado para presidente (1º turno) e do prefeito eleito |
| `t14b` | Tema 14: em cada eleição, a parte das cidades que repetiu o lado da eleição anterior, e quantas viraram de um lado para o outro |
| `t15a` | Tema 15: candidatos pela parte da receita que veio de dinheiro público (fundos) — chance de se eleger, votos e gasto por voto |
| `t16a` | Tema 16: os processos de registro das candidaturas, eleição a eleição — candidaturas inaptas (registro negado, cassado, cancelado ou renúncia), 1998 a 2022 |
| `t16b` | Tema 16: partido a partido — parte das candidaturas inaptas (registro negado, cassado, cancelado ou renúncia), 2020 e 2022 somadas, partidos com 2 mil candidaturas ou mais |
| `q5c` | Tema 7: quem ainda vive de legenda, cargo a cargo (vereador 2024, deputados 2022) |
| `q6f` | Tema 9: os temas dos planos de esquerda, centro e direita, cargo a cargo (prefeito, governador, presidente) |
| `q7e` | Tema 10: chance de se eleger de jovens e mais velhos, cargo a cargo |
| `q8c` | Temas 11 e 12: dinheiro de empresas na receita, cargo a cargo e ano a ano (com presidente) |
| `q12f` | +2: dos eleitos em cada cargo, quantos se elegem de novo 4 anos depois e quantos voltam ao mesmo cargo |
| `t8c` | Tema 8: eleitores por cadeira e votos do eleito típico, do vereador ao presidente, e estado a estado |
| `t9c` | Tema 9: os assuntos dos planos, cargo a cargo |
| `t10d` | Tema 10: quem tentou continuar no mesmo cargo e lugar, pela idade, cargo a cargo |
| `t10e` | Tema 10: renovação (novatos e reeleitos), cargo a cargo |
| `t10f` | Tema 10: alternância de poder na prefeitura, no governo do estado e na presidência |
| `t11c` | Tema 11: Bolsa Família e o lado de quem ficou em 1º, cargo a cargo (2022 e 2024) |
| `t12a` | Tema 12: doação de empresas por campo político, cargo a cargo (2010 a 2014) |
| `t13b` | Tema 13: mapa de calor cargo a cargo (presidente fica em `t13a`) |
| `t16d` | Tema 16: candidaturas barradas, cargo a cargo, 2008 a 2022 |
| `t16c` | Tema 16: o tipo de processo (indeferimento, cassação, inelegibilidade, renúncia) e o voto em quem foi barrado, 2008, 2012 e 2016 (anos com o detalhe) |
