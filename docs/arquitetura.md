# Arquitetura do site

O site é uma página só (`index.html`) com JavaScript puro, sem framework e sem etapa de build. As bibliotecas estão em `vendor/`: D3 7.9.0 para escalas e desenho de mapa, e topojson-client 3.1.0. Por isso ele abre igual em três situações:

- no ar, pelo GitHub Pages;
- servido na rede de casa (`rede/servidor_rede.ps1`);
- aberto direto do disco (`file://`).

## Rotas

`js/base.js` cria o objeto global `window.V`, com as utilidades e um roteador por *hash*. Cada página registra suas rotas com `V.rota(expressão, função)`. Quando o endereço muda, o roteador:

1. encontra a primeira rota que casa com o endereço;
2. limpa o `<main>` e chama a função da rota;
3. dispara o evento `vav:pronto`, que os testes usam para saber que a página terminou de montar.

Se a rota falha, o roteador marca `main.dataset.erro` e mostra a mensagem de erro.

| Arquivo | Rotas | Página |
|---|---|---|
| `js/ninguem.js` | `#/` | O candidato Ninguém |
| `js/brasil.js` | `#/mapa`, `#/mapa/e/PREF2024`, `#/mapa/v/abst`, `#/mapa/br/SP`, `#/mapa/br/SP/c/3550308` | Mapa do Brasil, estado e cidade |
| `js/revela.js` | `#/revela` | O que o voto revela |
| `js/perguntas.js` | `#/perguntas`, `#/perguntas/q1` … `q12` | As 12 perguntas |
| `js/partidos.js` | `#/partidos` | Posição dos partidos |
| `js/testes.js` | `#/testes`, `#/testes/auto` | Testes no navegador |
| `js/cidade.js`, `js/candidato.js`, `js/mapa.js` | `#/cidade/…`, `#/candidato/…`, `#/seis` | Páginas da primeira versão (6 estados) |
| `js/app.js` | endereços antigos | Redireciona e liga a busca |

O mapa usa a opção `{ mantem: true }`: ao trocar de ano ou de estado, o desenho continua na tela e só as cores mudam.

## Dados

Os dados ficam em `data/`, já calculados pelos scripts. Cada arquivo existe em duas formas:

- `arquivo.json`: a origem, gerada pelos scripts;
- `arquivo.js`: o mesmo conteúdo dentro de `(window.__D=window.__D||{})["chave"]=…;`, feito por `scripts/empacotar.py`.

O site carrega a versão `.js` com uma tag `<script>`, por meio de `V.dados("br/venc/PREF2024")`. Isso funciona até em `file://`, onde o navegador bloqueia `fetch` de arquivos locais. Cada arquivo é baixado uma vez só e fica guardado em `window.__D`.

Principais pastas de `data/br/`:

| Pasta ou arquivo | Conteúdo |
|---|---|
| `venc/{CARGO}{ANO}` | Quem venceu em cada cidade, com partido, porcentagem, vantagem e nota do partido (70 eleições) |
| `ufx/{CARGO}{ANO}` | Resultado completo por cidade, um arquivo por eleição com todos os estados |
| `resumo/{CARGO}{ANO}` | Votos por candidato no Brasil e por estado (cargos majoritários) |
| `comp/{ANO}` | Aptos, comparecimento, abstenção, brancos e nulos por cidade |
| `hist/{UF}` | Histórico de cada cidade em todas as eleições |
| `geo_proj` | Desenho das cidades e dos estados, já projetado (carregado só quando há mapa na tela) |
| `ideologia`, `ideologia_voto`, `ideologia_consenso` | As três réguas de esquerda e direita, por ano |
| `partidos_notas` | Notas de cada partido em cada eleição, medida por medida, para a página Partidos |
| `perguntas` | O SQL, as colunas e as linhas de cada consulta das 12 perguntas |
| `achados` | Números já calculados da página "O que o voto revela" |

## As três réguas no mapa

As cores do mapa vêm da nota do partido vencedor, de −1 (esquerda) a +1 (direita). A pessoa escolhe a régua em "Onde fica cada partido":

- **Todas as medidas** (padrão): `ideologia_consenso`;
- **Pesquisa de Harvard**: a nota original de cada resultado;
- **Voto na Câmara**: `ideologia_voto`.

A função `aplicarRegua()`, em `js/brasil.js`, reescreve a nota de cada resultado já carregado. A nota original fica guardada para poder voltar. A escolha da régua fica salva no navegador (`localStorage`, chave `vav-regua2`). A explicação de cada régua está em [regua-dos-partidos.md](regua-dos-partidos.md).

## Desempenho

O mapa tem 5.570 cidades. Para ele abrir e mexer rápido:

- **Desenho pré-projetado:** as cidades já vêm projetadas por `scripts/geo_proj.js` (Mercator, simplificação de 50% no mapshaper). O navegador não calcula a projeção.
- **Um ouvinte só:** um único ouvinte de mouse para todas as cidades, e não um por cidade.
- **Zoom sem contorno:** durante o zoom, o contorno das cidades some (classe `.movendo`) e só volta quando o movimento termina.
- **Cálculo guardado:** os resumos por estado ficam guardados por régua (`resumo()` em memória).
- **Partes fora da tela:** seções abaixo da dobra usam `content-visibility: auto`, e os gráficos pesados só desenham quando chegam perto da tela (`IntersectionObserver`).
- **Largura sem medir a página:** `V.largura()` usa `innerWidth`, sem ler o tamanho de elementos, o que evita recálculo de layout.

Na máquina de teste, uma tela por vez, o mapa abre em cerca de 0,25 s e o zoom fica entre 40 e 58 quadros por segundo.

## Visual e acessibilidade

- Tema claro, texto grande e contraste alto. As fontes são Atkinson Hyperlegible (texto) e Barlow Condensed (números e títulos).
- As cores do espectro são fixas em todo o site: vermelho para a esquerda, bege para o centro e azul para a direita.
- Todo gráfico tem descrição para leitor de tela (`role="img"` com `aria-label`). As páginas de dados têm a opção Gráfico | Tabela.
- Áreas de clique de pelo menos 24 × 24 px (44 px no celular). Atalho "Pular para o conteúdo" e foco visível.
- Os testes de acessibilidade usam o axe-core em todas as páginas (ver [testes.md](testes.md)).
