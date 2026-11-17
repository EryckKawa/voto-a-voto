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
- B · Grade 4 + 2 desigual: passar para 3 + 3 e separar "Ver" (3D, máquina do tempo, multidão, patrimônio) de "Usar" (formulários). A carta do político saiu em 18/11.
- B · A dica das setas do modo apresentação vai para dentro do próprio modo.

### Em todas
- Cabeçalho de página igual: título que diz o achado, uma frase, e a linha de números-chave quando houver.
- Conferir depois de cada página: captura em 1280 e 390 px, a suíte de testes e a comparação com as referências.

## Sistema de design (18/11/2026)

O plano completo (fundamentos, componentes, página por página e fases) foi feito como o de um designer de produto. Esta seção é a referência do que já está no código.

### Tokens (`:root` em `css/estilo.css`)
- **Texto:** `--t-display`, `--t-h1`, `--t-h2` (Barlow Condensed), `--t-h3` (Atkinson, 20 px), `--t-corpo` 18 px, `--t-meta` 15 px, `--t-min` 14 px (só legendas, eixos e rótulos de controles); números `--t-num-xl` 48 px e `--t-num` 30 px.
- **Espaço:** `--e-1` a `--e-8` (4, 8, 12, 16, 24, 32, 48 e 64 px). Mais espaço acima de um título do que abaixo.
- **Raio:** `--r-s` 4, `--r-m` 8, `--r-l` 14, `--r-pill` 999. **Leitura:** `--leitura` 68ch.

### Componentes
| Componente | Classe | Regra |
|---|---|---|
| Números-chave | `.kpis` | cada número com o seu rótulo inteiro; nunca "23% × 0,4%" com um rótulo só |
| Barra de filtros | `.filtros` | tudo o que muda o que se vê, junto e acima do que filtra |
| Recolhível | `details.mais` | o rótulo diz o que há dentro |
| Estado vazio que ensina | `.vazio-guia` | o que fazer e um primeiro passo clicável |
| Painel de dados | `.pq-painel` | título-achado e descrição em cima; fonte e "Baixar dados (CSV)" embaixo |

### O que mudou nesta rodada (fases 1 e 2 do plano)
- **16 perguntas:** índice pelos cinco assuntos (Dinheiro, Perfil, Território, Voto, Partidos), com a numeração do enunciado; cada tema com a resposta ao lado dos números-chave e um seletor "Ir para o tema". As regras repetidas de `.pq-lista` (6 blocos) viraram uma só.
- **Mapa:** camadas, cargo e ano numa barra de filtros acima do mapa (no celular, antes do mapa; o ano escolhido aparece no meio da fila); ranking com cabeçalho (Partido · Cidades · Nota); a régua dos partidos recolhida, com link para a página Partidos.
- **Políticos:** a busca abre com 18 sugestões com foto em três trilhas (os mais votados de 2022, prefeitos eleitos nas capitais em 2024, quem mais venceu desde 1994), feitas por `scripts/sugestoes_politicos.py`; os resultados da busca mostram a foto quando o site tem.

### Fase 4 (18/11): as páginas de leitura longa
- **Ninguém:** números-chave no cabeçalho (42,6 milhões; 2,8 vezes o PL; 205 cidades); "E na sua cidade?" logo depois da urna (no celular, antes dela); sumário em duas colunas com seis capítulos; uma barra presa abaixo do menu diz o capítulo que se está lendo; 6 capitais à vista e as outras recolhidas; "Para continuar" no fim.
- **O que o voto revela:** índice numerado com o assunto de cada achado; cada cartão com "Baixar dados (CSV)" (a tabela sai do mesmo dado do gráfico) e a fonte numa linha; "Para continuar" no fim.
- **Partidos:** números-chave no cabeçalho; o ano num controle deslizante com setas e o ano grande, no lugar de 17 botões; à direita do gráfico, só o aviso "incerto" (a faixa já está no alto do gráfico e na cor); dispersão e tabela lado a lado a partir de 1.100 px.
- **Comum:** `V.baixarCSV` em `js/base.js` serve os temas e o Revela; o componente `.proximos` fecha as páginas; `V.dados` pede o arquivo de novo se ele não chegar em 12 s (um pedido pendurado travava a página inicial de vez em quando nos testes).
- As páginas não ficaram mais curtas: os números-chave e os próximos passos somam altura. O ganho é a ordem de leitura, não o tamanho.

### Fase 5 (18/11): acabamento
- **Fichas:** a candidatura sem resultado diz o motivo (Registro negado, Cassado, Registro cancelado, Candidatura inapta, Renunciou, Faleceu antes da eleição), com selo vermelho-escuro para as barradas. Exige as fichas exportadas de novo por `scripts/ficha_politico.py`.
- **Explorar:** os cartões mostram capturas reais de cada visualização (`img/explorar/*.webp`, 640 × 360, feitas por `testes/miniaturas_explorar.js` e `scripts/miniaturas_explorar.py`) no lugar dos gradientes; a apresentação virou um cartão de destaque; os cartões se dividem em "Para ver" e "Para usar".
- **Títulos de gráfico que dizem o achado** nos temas 1, 2, 8, 10 e 15 (por exemplo, "Deputado federal 2022: o voto mais caro foi o do …"); o botão do recorte continua com o rótulo curto.
- **Menu:** "Perguntas" no lugar de "16 perguntas"; os nomes nunca quebram ao meio; de 721 a 1279 px a busca sobe para o lado da marca e o menu fica com a linha de baixo inteira (antes ele chegava a 7 linhas a 768 px); "O que o voto revela" por extenso e o lema só a partir de 1.700 px.
- **Varredura de quebras** (`testes/auditar_quebras.js`, 16 páginas × 7 larguras): corrigidos o número da Ninguém em duas linhas, as camadas do Mapa no celular (agora 2 × 2), os cartões do Revela vazando a 360 px e o cabeçalho da tabela de Partidos.
- **CSS:** 36 classes que nenhum JS escreve saíram (60 seletores e regras, entre eles os do SQL antigo e os gradientes do Explorar), conferidas por busca no código.

### O que ainda fica (fase 6 e depois)
Reduzir os 12 pontos de quebra a três e devolver os blocos de conserto do fim do CSS às regras de origem (sem mudança visual, por isso depois da entrega); o ensaio da apresentação no projetor.

## Afirmações para leigos e o gráfico certo (18/11/2026)

**Pedido:** respostas simples e diretas, que passem a informação principal para quem não é da área; a melhor forma de ver cada dado; tirar a carta do político.

**Regras de escrita** (valem para as 16 perguntas e para "O que o voto revela"):
1. Uma afirmação por parte: sujeito, verbo e número, numa frase. Exemplo: "Uma vaga de deputado federal custou R$ 6,2 milhões em 2022; uma de vereador, R$ 45 mil em 2024."
2. Sem jargão: no lugar de "correlação", o efeito ("quem gasta mais quase sempre tem mais votos"); "IDHM" vira "cidade mais ou menos desenvolvida"; "quintil" vira "os 20% que mais…"; "voto de legenda" vem explicado ("só no número do partido").
3. Número redondo; zero vira palavra ("nenhum bem").
4. A pergunta fica pequena, a afirmação grande, logo depois o gráfico; os números completos ficam em "Os números em detalhe", recolhido.

**Onde está no código:** cada tema em `montarTemas` (`js/perguntas.js`) tem `partes: [{ q, a, p, v }]`. `a` é a afirmação, montada com os mesmos valores dos pontos, para continuar certa quando os dados mudam; `p` diz quais pontos detalham; `v`, quais gráficos (no máximo 3). No topo de cada tema fica a frase curta do índice (`curta`). Um teste confere que as 48 partes têm afirmação de até 140 letras, sem jargão nem número faltando.

**O que o voto revela:** os 8 títulos viraram afirmações curtas ("O PT ganhou o Nordeste e perdeu o Sul", "Quase ninguém anula mais o voto, mas cada vez mais gente falta"), com o número no subtítulo.

**Carta do político:** removida (o arquivo `js/carta.js`, o botão da ficha, o passo da apresentação, o cartão do Explorar e o estilo).

