# Revamp visual: referências e plano

## 0. Onde estamos e aonde queremos chegar

**O que o site tem hoje de problema** (avaliação do grupo, novembro de 2026):

1. **Números chapados.** A resposta aparece como "35%", "R$ 6,2 milhões", "42,6 milhões". Falta a noção do tamanho daquilo: é muito? É pouco? Quanto é isso na minha vida?
2. **Tabela, gráfico de barra e "os números em detalhe"** são difíceis para o leitor médio. Quem não está acostumado com gráfico desiste.
3. **As perguntas não são polêmicas.** Respondem ao enunciado, mas não despertam a vontade de saber. Ninguém compartilha "custo por cadeira por cargo".
4. **Falta diferencial.** O site é bem feito, mas não tem "aquele algo" que faz a turma e o professor lembrarem dele.
5. **Os outros grupos** costumam responder às perguntas com o **mapa do Brasil**, com classificadores (faixas de cor), filtros e as mudanças aparecendo dentro do mapa. É o que o leitor espera ver numa análise eleitoral, e hoje o nosso mapa fica numa página separada das perguntas.

**Aonde queremos chegar:** entender em segundos, ter vontade de explorar e sair lembrando de alguma coisa. Fácil, com estilo e diferente.

As seções 1 a 5 são as ideias. As 6 a 9 são as referências que as sustentam. A seção 10 é o plano em fases.

---

## 1. A ideia central: um "lobby" do mapa

Uma página central (a "sala do mapa") em que **cada pergunta do trabalho vira uma camada do mapa do Brasil**:

- **No centro, o mapa** das 5.570 cidades (ou dos 27 estados, conforme a pergunta).
- **Ao lado, as perguntas** por bloco (Dinheiro, Perfil, Território, Voto, Partidos). Escolher uma pergunta pinta o mapa com a resposta dela e mostra a frase-resposta em cima.
- **Classificadores** à escolha: faixas fixas (0–10%, 10–20%…), cinco grupos do mesmo tamanho, acima ou abaixo da média do Brasil. Cada um com uma frase dizendo o que ele mostra.
- **Filtros da pergunta**: cargo, eleição, região, porte da cidade, e os próprios da pergunta (gênero na de mulheres, lado político na de doações).
- **O tempo dentro do mapa**: botão de "passar os anos" de 1994 a 2026, e uma visão de **mudança** (setas ou cor de "mudou de lado", como a camada Virada que já existe).
- **Clicar numa cidade** abre o cartão da cidade com a resposta daquela pergunta ali ("Em Teresina, 22% dos vereadores eleitos são mulheres; no Brasil, 18%").
- **"Ver a resposta completa"** leva à página da pergunta, que já existe.

**Duas formas de fazer:**

| Opção | Como fica | A favor | Contra |
|---|---|---|---|
| A. O lobby **substitui** o índice das perguntas | Entrou em Perguntas, caiu no mapa | Uma porta só, mais impacto | Perguntas que não são de lugar (carreira de um político, propostas no tempo) ficam forçadas |
| B. **Manter** as páginas como estão e **somar** o lobby como porta de entrada (recomendado) | Menu: "Mapa das perguntas" + "Todas as perguntas" | Não perde nada do que foi entregue; cada pergunta ganha a versão mapa e a versão explicada | Duas portas para a mesma coisa |

**Cada pergunta no mapa** (o que pinta, como classifica, o que muda no tempo):

| Pergunta | O mapa mostra | Classificador | Filtros | Mudança no tempo |
|---|---|---|---|---|
| Custos de campanha | Gasto por eleitor em cada cidade (vereador e prefeito) ou estado (deputado) | 5 grupos iguais | Cargo, ano | Antes e depois da proibição de empresas (2012 → 2016) |
| Taxa de sucesso e patrimônio | Onde o eleito é mais rico que o candidato típico | Acima / abaixo da média | Cargo | — |
| Doações e Bolsa Família | Benefícios por 100 eleitores, com a doação de empresas | Faixas fixas | Ano | Animação 2004 → 2024 |
| Doações por lado político | Lado que mais recebeu de empresas no estado | Cor do lado | Cargo, ano | 2010 → 2014 |
| Dinheiro público | Parte das campanhas paga pelo fundo | Faixas fixas | Cargo | 2016 → 2026 |
| Onde vai o dinheiro (propaganda) | A despesa campeã em cada estado (impresso, rua, internet) | Categoria | Cargo | 2018 → 2024 (a internet crescendo) |
| Escolaridade | Eleitos com curso superior × eleitores com curso superior | Diferença em pontos | Cargo | — |
| Idade e alternância | Cidades que trocaram de prefeito, e a idade de quem entrou | Trocou / manteve | Ano | Animação |
| Histórico do político | Onde estão os "sobreviventes" (eleitos 3 vezes ou mais) | Contagem | Cargo | — |
| Mulheres na política | Mulheres entre os vereadores eleitos | Faixas fixas | Cargo, ano | 2000 → 2024 |
| Índices municipais | O voto pelo IDH da cidade | Dois eixos (IDH × lado) | Cargo, ano | — |
| Sobrenome e família | Cidades onde o mesmo sobrenome já governou | Sim / não | — | — |
| Viés regional | Lado que venceu (já existe) | Cor do lado | Cargo, ano | Setas de mudança |
| Viés no tempo | Cidades que nunca mudaram de lado × as que vivem mudando | Número de trocas | Cargo | — |
| Bolsa Família e o voto | Benefícios por eleitor × lado do vencedor | Mapa de duas cores | Cargo, ano | 2006 → 2022 |
| Brancos, nulos e abstenção | "Ninguém" (já existe) | Faixas fixas | Ano | Animação |
| Voto de legenda | Onde se vota mais só no partido | Faixas fixas | Cargo, ano | — |
| Vereadores e votos | Eleitores por cadeira de vereador | Faixas fixas | — | — |
| Propostas | A palavra que mais aparece nos planos de cada estado | A palavra escrita no mapa | Cargo, ano | 2018 → 2026 |
| Processos e partidos | Candidaturas barradas por cidade | Faixas fixas | Ano | — |
| Troca de partido | Onde os vereadores mais trocam de partido para tentar de novo | Faixas fixas | Ano | — |

Duas cautelas de mapa:
- O mapa por área faz o Norte vazio parecer enorme e o Sudeste lotado parecer pequeno. Ter também um **mapa de pontos** (cada ponto = 1.000 eleitores, como fizeram a Economist e outros em 2024) ou de **hexágonos** por estado.
- Toda camada tem a frase "como ler este mapa", com o significado de cada cor.

## 2. Dar tamanho aos números

Pesquisa mostra que reescrever um número difícil em termos conhecidos ajuda a entender e a estimar o próximo número (seção 6: Chevalier et al. 2013; Hullman et al. 2018). Técnicas, com exemplos do nosso banco:

| Técnica | Exemplo |
|---|---|
| **Por pessoa** | O dinheiro público nas campanhas passou de R$ 2,26 bilhões (2018) para R$ 5,66 bilhões (2026). Dividido pelos eleitores: "cada eleitor pagou cerca de R$ X pela campanha de 2026" (calcular com o eleitorado do ano). |
| **Em gente** ("se fossem 100") | "De cada 100 vereadores eleitos, 18 são mulheres", desenhado com 100 bonequinhos. |
| **Em lugar conhecido** | "Os 42,6 milhões que não escolheram ninguém lotariam o Maracanã X vezes" ou "são mais que a população de X estados juntos". |
| **Na sua cidade** | Toda resposta com a linha "e na sua cidade:", escolhida uma vez e lembrada em todas as páginas. |
| **Em coisas do dia a dia** | Custo da cadeira em salários mínimos ou em anos de salário do próprio cargo. |
| **Comparação de dois** | Lado a lado: "a cidade que mais gasta por eleitor × a que menos gasta". |
| **Escala física** | A pilha de santinhos de uma eleição (material impresso é 20% do gasto) comparada a um prédio. |

Regra: toda página tem pelo menos um número "com tamanho" ao lado do número exato.

## 3. Formas de ver que brincam com o digital

Tabela e gráfico de barra continuam existindo, mas recolhidos ("os números em detalhe"). Na frente vem uma destas:

| Forma | Como funciona | Onde usar | Base |
|---|---|---|---|
| **Você chuta, o dado responde** | Antes de ver a resposta, a pessoa arrasta uma barra ou desenha a linha do que acha. Depois aparece o real, e a diferença. | Mulheres eleitas, voto de legenda, dinheiro público, abstenção | "You Draw It" do New York Times (2015); prever antes melhora a lembrança e a compreensão (Kim, Reinecke e Hullman, CHI 2017) |
| **Quiz e jogo** | "Quem ganhou nesta cidade?", "Este político trocou de partido?", com placar e sequência de acertos | Lobby do mapa, modo apresentação (a turma joga junto) | — |
| **Bonequinhos (gráfico de unidades)** | Cada pessoa ou cadeira é um ícone; eles se reorganizam ao trocar o filtro | Mulheres, Câmara, abstenção ("Se o Brasil fosse 100 eleitores") | Park et al., Atom (2018) |
| **Rolar e a história acontecer** | O gráfico muda conforme a pessoa rola a frase | A abertura (Ninguém) e uma "história do voto de 1994 a 2026" | Prende mais a atenção; a compreensão fica parecida com a versão parada (estudos de 2026). Usar na abertura, não em tudo. |
| **E se…? (simulador)** | "E se ninguém faltasse?", "E se não houvesse voto de legenda, quem perderia a cadeira?" | Voto de legenda, abstenção, troca de partido | — |
| **Duelo** | Escolher duas cidades, dois partidos ou dois políticos e ver lado a lado | Lobby do mapa, Políticos | — |
| **Mapa vivo** | Play de 1994 a 2026, setas de "mudou de lado" | Lobby do mapa | Mapas de "deslocamento" do NYT em 2024 |
| **Cartão para compartilhar** | Botão que gera uma imagem com a frase-resposta e o número da sua cidade, no tamanho do WhatsApp e do Instagram | Toda pergunta | — |
| **Visões que já temos** | Brasil em 3D, Multidão, Corrida do patrimônio, urna | Integrar ao lobby como "outras formas de ver" | — |

## 4. Perguntas novas que despertam curiosidade

Critérios: o leigo quer saber; dá para responder com dados públicos e sem acusar ninguém; o título leva o número e não leva adjetivo (seção 6: Kong et al.). Cada uma diz se o dado já está no banco.

| Pergunta | Por que desperta interesse | Dado | Prévia do banco |
|---|---|---|---|
| **Quanto o fundão eleitoral custa para você?** | Todo mundo paga; ninguém sabe quanto | Já temos (receita pública) | R$ 2,26 bi em 2018 → R$ 5,66 bi em 2026 |
| **"Pastor", "Delegado", "Sargento": o título no nome de urna elege?** | Bancada evangélica e da bala estão sempre no noticiário | Já temos (nome de urna) | Candidatos a vereador com título religioso: 4.114 em 2004 → 7.494 em 2024; se elegeram 6,3%, contra 13,6% dos demais. Com título de farda: 2.050 → 2.849, 11,8% eleitos. |
| **Candidatas laranja?** Mulheres com quase nenhum voto que receberam dinheiro do fundo | Escândalo recorrente, ligado à cota de 30% | Já temos (votos + receita) | Em 2016, 31% das candidatas a vereadora tiveram até 10 votos (homens: 5%) |
| **Quem mudou de cor entre uma eleição e outra?** | Reportagem da Folha: cerca de 1 em cada 4 candidatos que disputaram 2020 e 2024 mudou a autodeclaração | **Falta carregar**: hoje o banco guarda uma cor por pessoa; os arquivos do TSE têm a cor de cada candidatura | — |
| **As cidades que sempre acertam o presidente** | Curiosidade pura: "a sua cidade adivinha o Brasil?" | Já temos (votos por cidade) | — |
| **Clãs: as famílias que mandam em cada estado** | Personaliza o poder | Já temos (sobrenome, tema 5) | 16% das cidades já tiveram o mesmo sobrenome com pessoas diferentes |
| **Quem enriqueceu na política?** | Patrimônio que dispara entre uma eleição e outra | Já temos (bens) | Corrida do patrimônio já existe |
| **O seu deputado votou como prometeu, ou como o governo mandou?** | Liga eleição e Congresso | Já temos (votos na Câmara, orientação de bancada) | — |
| **As empresas que mais recebem dinheiro de campanha** | "Para onde vai o dinheiro" com nome de quem recebe | Já temos (fornecedor, CNPJ) | — |
| **Quanto custa um voto?** Por partido e por candidato eleito | Compara o "preço" de cada vitória | Já temos | — |
| **Cidades com mais eleitores que moradores** | Suspeita clássica | Verificar: precisa da população do IBGE por cidade no ano | — |
| **Se quem faltou votasse, o resultado mudaria?** | Liga a Ninguém à disputa | Já temos (abstenção + resultado) | 215 cidades viraram do 1º para o 2º turno em 2026 |

Escolher 3 a 5 para fazer primeiro: as que já têm dado, mais impacto e combinam com o mapa (fundão, nome de urna, laranjas, cidades que acertam o presidente).

## 5. Os diferenciais (o "algo excepcional")

O que nenhum outro grupo deve ter ao mesmo tempo:

1. **O lobby do mapa** com todas as perguntas, filtros e o tempo passando dentro do mapa.
2. **O Brasil inteiro, de 1994 a 2026, os 7 cargos**, enquanto o recorte da disciplina era de 6 estados.
3. **Você chuta antes de ver**: o site testa o leitor.
4. **A sua cidade em tudo**: escolhe uma vez e toda resposta mostra ela.
5. **Números com tamanho**: nenhum número sozinho.
6. **A ficha de cada um dos 2,4 milhões de candidatos.**
7. **Perguntas que dão vontade de clicar** (seção 4), tratadas com cuidado.
8. **Cartão para compartilhar** cada resposta.
9. **Modo apresentação e jogo para a turma**: a apresentação vira quiz.
10. **Acessível e offline**: descrição em texto de cada gráfico; abre do disco, sem internet.

---

## 6. O que a pesquisa mostra (artigos)

| Artigo | O que mostra | O que muda no site |
|---|---|---|
| Cleveland e McGill, *Graphical Perception*, JASA, 1984 ([resumo em aula da U. Washington](https://courses.cs.washington.edu/courses/cse442/25au/lectures/CSE442-Perception.pdf)); Heer e Bostock, *Crowdsourcing Graphical Perception*, CHI 2010 ([PDF](https://homes.cs.washington.edu/~jheer/files/jheer-crowdflower.pdf)) | Comparamos melhor posição e comprimento; ângulo e área são lidos com mais erro. | Barras e pontos como padrão; nada de pizza; bolha só como destaque. |
| Chevalier, Vuillemot e Gali, *Using Concrete Scales*, IEEE TVCG 2013 ([página](https://aviz.fr/concretescale)) | Números enormes ou de unidade estranha ficam compreensíveis quando reescritos em medidas conhecidas; o artigo organiza como fazer isso. | Seção 2: números com tamanho. |
| Hullman, Kim, Nguyen, Speers e Agrawala, *Improving Comprehension of Measurements Using Concrete Re-expression Strategies*, CHI 2018 ([projeto](https://mucollective.northwestern.edu/project/concrete-reexpression)) | Contexto familiar, troca de unidade e analogia proporcional deixaram as notícias mais úteis e melhoraram a estimativa de números novos. | Seção 2. |
| Kim, Reinecke e Hullman, *Explaining the Gap: Visualizing One's Predictions Improves Recall and Comprehension of Data*, CHI 2017 ([ferramenta They Draw It](https://mucollective.northwestern.edu/theydrawit)); o "You Draw It" do NYT ([FlowingData](https://flowingdata.com/2019/07/12/make-charts-that-ask-readers-to-predict-the-line)) | Pedir que o leitor preveja antes de ver melhora a lembrança e a compreensão. | Seção 3: "você chuta, o dado responde". |
| Stokes, Cogley, Satyanarayan e Hearst, *Striking a Balance*, IEEE VIS 2022 ([página](https://www.tableau.com/research/publications/striking-balance-reader-takeaways-and-preferences-when-integrating-text-and)) | Leitores preferem gráficos com bastante anotação; o lugar do texto depende do conteúdo. | Anotar o gráfico e o mapa junto do ponto que importa. |
| Kong, Liu e Karahalios, *Frames and Slants in Titles of Visualizations on Controversial Topics*, CHI 2018 ([PDF](https://mail.zcliu.cs.umd.edu/vistitles/CHI18-VisTitles.pdf)); *Title-Visualization Misalignment*, CHI 2019 ([PDF](https://mail.zcliu.cs.umd.edu/vistitles/degree-of-misalignment-CHI19.pdf)) | O título muda o que a pessoa lembra, e ela segue achando o gráfico neutro. | Pergunta polêmica, título com número e sem adjetivo. |
| Borkin et al., *What Makes a Visualization Memorable?*, 2013 ([página](https://vcg.seas.harvard.edu/publications/20130101-what-makes-a-visualization-memorable)); *Beyond Memorability*, 2016 ([página](https://vcg.seas.harvard.edu/publications/20150101-beyond-memorability-visualization-recognition-and-recall)) | Cor, elemento reconhecível e título claro fazem lembrar; o memorável costuma ser também o eficaz. | Um elemento visual próprio por página (urna, mapa, bonequinhos). |
| Park, Drucker, Fernandez e Elmqvist, *Atom: A Grammar for Unit Visualizations*, IEEE TVCG 2018 ([página](https://www.microsoft.com/en-us/research/publication/atom-a-grammar-for-unit-visualizations/)) | Como montar gráficos em que cada pessoa é um ponto e eles se reorganizam. | Seção 3: bonequinhos. |
| Lundgard e Satyanarayan, *A Four-Level Model of Semantic Content*, IEEE TVCG 2022 ([arXiv](https://arxiv.org/abs/2110.04406)) | Leitores preferem descrições com número e tendência. | Frases-resposta e texto alternativo nesses níveis. |
| Crameri, Shephard e Heron, *The misuse of colour in science communication*, Nature Communications, 2020 ([artigo](https://www.nature.com/articles/s41467-020-19160-7)) | Arco-íris e vermelho-verde distorcem e somem para daltônicos. | Paletas do mapa testadas em daltonismo. |
| Segel e Heer, *Narrative Visualization*, IEEE InfoVis 2010 ([PDF](https://homes.cs.washington.edu/~jheer/files/narrative.pdf)) | "Taça de martini": o autor conduz, depois o leitor explora. | Lobby: a frase-resposta primeiro, depois os filtros. |
| Estudos sobre rolagem narrativa (scrollytelling), por exemplo [comparação de 2026](https://arxiv.org/pdf/2607.03023) e [geração automática com unidades](https://pure.psu.edu/en/publications/automatic-generation-of-unit-visualization-based-scrollytelling-f/) | Aumenta o engajamento; a compreensão fica parecida. | Usar na abertura, não em tudo. |

## 7. Livros

| Livro | O que tirar |
|---|---|
| Edward Tufte, *The Visual Display of Quantitative Information* (Graphics Press, 2ª ed. 2001) | Tirar o que não é dado; "pequenos múltiplos" para comparar estados e anos. |
| Alberto Cairo, *The Truthful Art* (2016) e *How Charts Lie* (2019) | Como o gráfico engana sem querer; como ganhar a confiança do leigo. |
| Cole Nussbaumer Knaflic, *Storytelling with Data* (Wiley, 2015) | Cinza para tudo e uma cor para o que importa; título que diz a conclusão. |
| Claus O. Wilke, *Fundamentals of Data Visualization* (O'Reilly, 2019), [grátis online](https://clauswilke.com/dataviz/) | Cor, proporção, exemplos de "ruim / bom". |
| Jonathan Schwabish, *Better Data Visualizations* (Columbia University Press, 2021) ([PolicyViz](https://policyviz.com/pv_books/better-data-visualizations-a-guide-for-scholars-researchers-and-wonks/)) | Alternativas à barra e à linha: unidades, waffle, slope, pequenos múltiplos. |
| Andy Kirk, *Data Visualisation: A Handbook for Data Driven Design* (SAGE, 3ª ed. 2024) | Anotação, interação, cor e composição como decisões editoriais. |
| Tamara Munzner, *Visualization Analysis and Design* (CRC Press, 2014) | Base acadêmica para o relatório. |
| Ellen Lupton, *Pensar com tipos*; Matthew Butterick, [*Practical Typography*](https://practicaltypography.com/) | Tipografia é metade do "estiloso". |

## 8. Quem faz bem hoje (referências visuais)

| Referência | O que olhar | O que levar |
|---|---|---|
| **Os outros grupos da disciplina** | Respondem às perguntas no mapa do Brasil, com classificadores, filtros e a mudança dentro do mapa | O mapa como resposta (seção 1). Juntar prints dos trabalhos que forem apresentados. |
| **O Povo+, eleições de 2026** ([mapa da virada no 2º turno](https://mais.opovo.com.br/reportagens-especiais/resultado-presidente-eleicoes-2026/2026/10/25/mapa-da-virada-215-municipios-mudaram-de-vencedor-no-2-turno-da-eleicao-presidencial.html); [mapa da abstenção](https://mais.opovo.com.br/reportagens-especiais/pauta-eleicoes-2026/2026/10/18/quem-sao-e-onde-estao-os-ausentes-o-que-revela-o-mapa-de-abstencao-dos-municipios-brasileiros.html); [compare por município](https://mais.opovo.com.br/reportagens-especiais/resultado-presidente-eleicoes-2026/2026/10/26/eleicoes-2026-compare-o-desempenho-dos-candidatos-por-municipio.html)) | Jornal brasileiro respondendo perguntas com mapa municipal e busca da cidade | Como eles escrevem a pergunta e o título do mapa |
| **New York Times e Reuters, eleições de 2024** ([mapas de 2024, FlowingData](https://flowingdata.com/2024/11/12/dot-density-map-for-election-results/); [acessibilidade da Reuters](https://lists.w3.org/Archives/Public/w3c-wai-ig/2024OctDec/0022.html)) | Setas de deslocamento, mapa de pontos, tabelas de resultado tipo placar | Mudança dentro do mapa; mapa de pontos |
| **NYT "You Draw It"** ([exemplos](https://flowingdata.com/2019/07/12/make-charts-that-ask-readers-to-predict-the-line)) | O leitor desenha antes de ver | "Você chuta" |
| **The Pudding** ([sobre](https://pudding.cool/about)) | Ensaio visual, pouca palavra, cada peça com identidade própria | Rolagem narrativa na abertura |
| **Financial Times, [Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md)** | Gráfico escolhido pela mensagem | Revisar o gráfico de cada parte |
| **The Economist** ([guia de 2017](https://d30jyndnpz0ndz.cloudfront.net/documents/CHARTstyleguide_20170505.pdf)) | Assinatura fixa: fio de cor, título, subtítulo, fonte | Uma assinatura própria em todo gráfico |
| **Our World in Data** ([redesenho](https://ourworldindata.org/redesigning-our-interactive-data-visualizations)) | Gráfico, mapa e tabela na mesma moldura | Já usamos; levar o rótulo no fim da linha |
| **Nexo Jornal** ([eleições, Sigma Awards](https://sigmaawards.org/tag/brazil)) | Explicação em português simples | Tom e vocabulário |
| **Datawrapper** ([cores](https://www.datawrapper.de/blog/colors), [daltonismo](https://www.datawrapper.de/blog/colorblindness-part2)) e **IBM Carbon** ([paletas](https://carbondesignsystem.com/data-visualization/color-palettes/)) | Cor com significado e testada | Paletas do mapa |

## 9. Fontes tipográficas

Hoje: Atkinson Hyperlegible (texto) e Barlow Condensed (títulos e números). Candidatas, todas livres; conferir os algarismos tabulares ([comparação](https://madegooddesigns.com/best-fonts-for-dashboards/)):

| Par | Cara | A favor | Contra |
|---|---|---|---|
| A. Atkinson + Barlow Condensed (atual) | Sóbrio | Pronto; ótima leitura | Pouca personalidade |
| B. Inter + Inter Tight | Produto digital | Números alinhados, ótima em tela pequena | Muito usada |
| C. IBM Plex Sans + Condensed + Mono | Técnico | Distingue 0/O e 1/l | Frio |
| D. Source Serif 4 + Source Sans 3 | Jornal | Cara de reportagem | Serifa pede tamanho grande no projetor |

Testar D contra A, na página do lobby.

---

## 10. O plano

O site no ar é o que foi entregue em 19/11. O revamp acontece num ramo separado e só vai para o ar quando aprovado.

| Fase | O que sai | Ordem |
|---|---|---|
| **0. Decidir** | Respostas às perguntas do fim deste documento | Primeiro |
| **1. Painel de referências** | Página com 15 a 20 prints: os mapas dos outros grupos, O Povo+, NYT, Reuters, Pudding, Economist; em cada um, o que vem primeiro, como é o título, as cores, onde ficam os filtros | 1 dia |
| **2. Protótipo do lobby do mapa** | O lobby funcionando com 4 perguntas (Mulheres, Bolsa Família e o voto, Brancos e nulos, Viés regional), com classificadores, filtros, o tempo passando e o cartão da cidade. Ao lado, as 3 direções visuais aplicadas a ele: **Jornal** (Economist, FT, Nexo), **Relatório** (OWID, Power BI) e **Ensaio** (Pudding) | 2 a 3 dias |
| **3. Números com tamanho e uma forma lúdica** | Em 2 perguntas: o número "por pessoa / em gente / na sua cidade" e o "você chuta" | Junto da fase 2 |
| **4. Perguntas novas** | SQL e páginas de 3 a 5 perguntas da seção 4 (fundão, nome de urna, laranjas, cidades que acertam o presidente) | Depois da escolha |
| **5. Sistema visual** | Fontes, paleta testada, grade, componentes (cartão do gráfico com assinatura, número com tamanho, bonequinhos, filtro, legenda direta, cartão para compartilhar) | Depois da fase 2 |
| **6. Página por página** | Lobby → Perguntas → Ninguém → Mapa → Revela → Partidos → Políticos → Explorar → Formulários e Testes | — |
| **7. Conferir** | Os testes e a varredura de quebras; prints em 390 e 1280 px; contraste e daltonismo; **teste do leitor médio**: 3 pessoas de fora tentam responder 3 perguntas usando só o site, e um teste de 5 segundos ("o que essa página dizia?") | Antes de publicar |

### O que decidir antes da fase 2
1. **Lobby:** opção A (substitui o índice) ou B (soma ao que existe, recomendado)?
2. **Escopo:** o site todo, ou o lobby + as páginas que aparecem na apresentação?
3. **Perguntas novas:** quais da seção 4 entram, e se vale carregar a cor de cada candidatura para a de "quem mudou de cor"?
4. **Fonte:** pode trocar a Atkinson?
5. **Prazo:** até quando precisa estar pronto para a apresentação?
