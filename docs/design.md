# Design do site: referências e regras (17/11/2026)

Revisão de UI e UX feita a partir de referências reais de comportamento de leitura, de texto em gráficos e de produtos de dados. Cada regra abaixo diz de onde veio.

## As referências

| Referência | O que tiramos dela |
|---|---|
| Nielsen Norman Group, [Layer-cake pattern of scanning](https://www.nngroup.com/articles/layer-cake-pattern-scanning/) | As pessoas varrem a página pelos títulos e subtítulos. Subtítulos descritivos, com as palavras importantes primeiro, sempre com o mesmo estilo e destacados sem exagero. Sem paredes de texto. |
| Nielsen Norman Group, [Inverted pyramid](https://www.nngroup.com/articles/inverted-pyramid/) | A conclusão vem primeiro; o detalhe depois, do mais geral ao mais específico. A primeira frase de cada parágrafo é a mais importante. Parágrafos curtos e listas. |
| Nielsen Norman Group, [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Na primeira camada, só o que quase todo mundo precisa; o resto fica a um clique, com rótulo claro. No máximo duas camadas. |
| Datawrapper, [Text in data visualizations](https://www.datawrapper.de/blog/text-in-data-visualizations) | O título do gráfico diz o achado, em palavras comuns; a precisão vai para a descrição, menor e cinza. Rótulo direto no lugar de legenda. Só dois níveis de texto dentro do gráfico. Texto alinhado à esquerda. Não encolher texto para caber. Sem casas decimais desnecessárias. |
| Our World in Data, [Redesigning our interactive data visualizations](https://ourworldindata.org/redesigning-our-interactive-data-visualizations) | O mesmo dado em gráfico ou tabela, com a troca no canto superior esquerdo do bloco; as opções do recorte ao lado; a fonte sempre visível; "saiba mais" num painel à parte; baixar os dados no canto inferior direito. |
| GOV.UK Design System, [Type scale](https://design-system.service.gov.uk/styles/type-scale/) e [Paragraphs](https://design-system.service.gov.uk/styles/paragraphs/); U.S. Web Design System, [Typography](https://designsystem.digital.gov/components/typography/) | Corpo de texto de 19 px (GOV.UK), nunca abaixo de 16 px; linhas de 45 a 90 caracteres. |
| Microsoft Learn, [Design the analytical report layout](https://learn.microsoft.com/en-us/training/modules/power-bi-effective-reports/2-design-layout) | Posição, equilíbrio, contraste, proximidade e repetição. Números-chave em cartões repetidos, onde o olho chega primeiro. Cartões brancos sobre fundo claro. |

## As regras que o site segue

1. **Pirâmide invertida em toda página:** título que diz o achado → resposta em uma frase → pontos principais → gráfico → cuidados → de onde vêm os números (recolhido).
2. **Escala de texto com 4 tamanhos:** título da página (Barlow Condensed, 44–56 px), título de seção (Barlow Condensed, 28 px), título de bloco (Atkinson, 20 px, negrito), corpo (Atkinson, 18 px). Texto secundário: 15 px cinza-escuro. Nada de leitura abaixo de 14 px.
3. **Linha de 45 a 75 caracteres** em todo texto corrido (`max-width: 68ch`).
4. **Cada gráfico tem título e descrição em cima**, como no Datawrapper: o título é o nome do recorte; a descrição explica a medida. Embaixo, só a fonte e o botão de baixar os dados.
5. **Gráfico | Tabela no canto superior esquerdo do bloco** e os recortes logo abaixo, como no Our World in Data. A tabela é a mesma informação do gráfico, e o CSV baixado é essa tabela.
6. **Duas camadas no máximo:** o que é método, fonte detalhada e "mais números" fica recolhido, com rótulo que diz o que há dentro.
7. **Sem enfeite:** sem rótulo pequeno em maiúsculas acima de título, sem borda grossa lateral, sem gradiente, sem caractere no lugar de ícone. Cores só com significado (lados políticos, séries).

## Plano de revamp por página (17/11/2026)

Cada item diz o problema visto nas capturas (1280 px e 390 px) e a regra que resolve. Prioridade: A (muda a experiência), B (polimento).

### Ninguém (início)
- A · Página de 7.000 px com 7 capítulos em sequência. Trocar o índice de 7 cartões grandes por uma lista compacta em 2 colunas e um sumário fixo de capítulos ao rolar (camadas, NN/g).
- A · "E na sua cidade?" está no fim. Subir a busca da cidade para logo depois da urna: a pergunta pessoal prende a leitura (pirâmide invertida).
- B · Notas sob os gráficos (14 px, 2 linhas) viram uma linha só de fonte; o resto vai para "Como chegamos nesse número".
- B · A dica "Experimente: digite…" vira um texto dentro da tela da urna, onde a pessoa já está olhando.

### Mapa
- A · No computador, a coluna esquerda empilha 4 grupos de controles (o que mostra, cargo, anos, passar os anos) antes do ranking. Juntar tudo numa barra de filtros em cima do mapa, como um relatório (Microsoft Learn): [O que mostra] [Cargo] [Ano].
- A · No celular, os botões de cargo e ano ficam depois do mapa e os anos rolam cortados. Pôr a barra de filtros logo acima do mapa e trocar os anos por um seletor.
- B · Ranking de partidos: a nota (+0,30) aparece solta; dar cabeçalho às colunas (cidades, nota).
- B · "Onde fica cada partido em 2024" repete a página Partidos: recolher num "Ver a régua dos partidos".

### O que o voto revela
- B · Já segue o padrão do Datawrapper (título é o achado). Unificar com os temas: fonte e "Baixar dados (CSV)" no pé de cada gráfico.
- B · Links e fonte no rodapé dos cartões em 12 px: subir para 15 px.
- B · Os 8 botões de atalho no topo viram um índice numerado em 2 colunas (reconhecer em vez de lembrar).

### 16 perguntas
- A · Índice: agrupar os 16 temas pelos 5 assuntos (dinheiro, perfil, território, voto, partidos), com subtítulos, mantendo a numeração do enunciado (camadas, NN/g).
- A · Tema: um cartão com o número principal ao lado da resposta (cartões de números-chave, Microsoft Learn), com rótulo completo, sem a conta "23% × 0,4%".
- B · Títulos dos recortes dizem o achado, e não só o nome ("Para presidente, o voto mais caro é o do União", no lugar de "Gasto por voto · Deputado federal 2022") (Datawrapper).
- B · Navegação entre temas: anterior e próximo sempre dos dois lados, e um seletor "Ir para o tema".

### Partidos
- A · O gráfico de 2022 repete "esquerda", "centro-esquerda" ao lado de cada um dos 31 partidos; a cor já diz isso. Mostrar só os casos "(incerto)" e uma legenda única (rótulo direto, Datawrapper).
- A · 17 botões de ano em duas linhas: trocar por um controle deslizante com o ano grande.
- B · O gráfico de dispersão ocupa meia largura com o resto vazio; pôr a tabela de comparação ao lado no computador.
- B · Abertura em dois parágrafos longos: a primeira frase diz o achado; o método vai para "Como as notas foram feitas".

### Políticos
- A · A busca abre vazia (só a caixa e uma frase). Mostrar sugestões com foto: os eleitos de 2024 e 2026 mais votados e quem mais venceu eleições (estado vazio que ensina, NN/g).
- A · Na ficha, "Sem resultado" em 2018 (Lula, registro negado) confunde. Usar a nova tabela `situacao_registro` para dizer "Registro negado" ou "Cassado" (exige regerar as fichas).
- B · Gráfico "Lado político" com faixa vazia embaixo: diminuir a altura quando há poucos rótulos.
- B · Abertura da busca em 4 linhas: cortar para uma frase.

### Explorar
- A · As artes dos cartões são gradientes e desenhos genéricos que não mostram o que há dentro. Trocar por miniaturas reais de cada visual (cheiro de informação, NN/g).
- B · Grade 4 + 2 desigual: passar para 3 + 3 e separar "Ver" (3D, máquina do tempo, multidão, patrimônio) de "Usar" (formulários, carta).
- B · A dica das setas do modo apresentação vai para dentro do próprio modo.

### Em todas
- Cabeçalho de página igual: título que diz o achado, uma frase, e a linha de números-chave quando houver.
- Conferir depois de cada página: captura em 1280 e 390 px, a suíte de testes e a comparação com as referências.
