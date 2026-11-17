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
