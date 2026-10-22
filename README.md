# Voto a voto: o que o voto revela sobre o Brasil

Site sobre as eleições brasileiras de 1994 a 2026, nas 5.570 cidades, feito para o trabalho de **Banco de Dados Relacional (BDR 2026.2) da UFPI, Grupo 5**. O tema é o ato de votar e o que ele revela sobre o país: quem vota, quem falta, para que lado cada cidade foi e quanto custa uma eleição.

**Site no ar:** https://eryckkawa.github.io/voto-a-voto/

O site é estático (HTML, CSS e JavaScript, sem servidor e sem banco no navegador). Funciona no ar, na rede de casa ou aberto direto do disco, com dois cliques no `index.html`.

## O que tem no site

| Página | Endereço | O que mostra |
|---|---|---|
| Ninguém | `#/` | O "candidato Ninguém": quem faltou, votou em branco ou anulou. Em 2024, foram 42,6 milhões de eleitores no 1º turno. |
| Mapa | `#/mapa` | As 5.570 cidades, eleição por eleição, em sete cargos (presidente, governador, senador, deputado federal, deputado estadual, prefeito e vereador, de 1994 a 2026), pintadas pelo lado político de quem venceu. Para deputado e vereador, vale o partido mais votado na cidade. Também mostra quem faltou, branco e nulo, e a virada de 2018 para 2022. |
| O que o voto revela | `#/revela` | Oito achados de trinta anos de eleições, cada um com o título que já diz o dado. |
| 12 perguntas | `#/perguntas` | As 12 perguntas de pesquisa do trabalho, respondidas com o Brasil inteiro. Cada resposta traz o gráfico, a tabela e a consulta SQL que a produziu. |
| Partidos | `#/partidos` | Onde fica cada partido entre esquerda e direita em cada eleição, segundo três estudos acadêmicos e o voto na Câmara. |
| Testes | `#/testes` | Testes de velocidade, funcionamento, acessibilidade e conferência dos dados com os números oficiais do TSE. |

## Como abrir

- **No ar:** pelo endereço acima.
- **No computador:** dois cliques em `index.html`. Não precisa de internet nem de instalar nada. Depois de atualizar arquivos, aperte Ctrl + F5.
- **Na rede de casa (Windows):** dois cliques em `LIGAR_SITE_NA_REDE.bat` (detalhes em `LEIA-ME.txt`).

## Como o projeto está organizado

```
index.html          página única; as seções são trocadas pelo endereço (#/mapa, #/perguntas...)
css/estilo.css      todo o visual (tema claro, fontes Atkinson Hyperlegible e Barlow Condensed)
js/                 código do site, um arquivo por página (detalhes em docs/arquitetura.md)
data/               dados já prontos, em .json (origem) e .js (para abrir sem servidor)
img/fotos/          fotos oficiais dos candidatos (TSE), em miniatura
scripts/            como os dados foram feitos, a partir dos arquivos do TSE, IBGE e Câmara
testes/             robô que roda os testes do site no computador e no celular (Playwright)
vendor/             D3 7.9.0, topojson-client 3.1.0, axe-core 4.10.2
fonts/              fontes com licença OFL
rede/               servidor para a rede de casa (PowerShell)
trabalho-6-estados/ a primeira versão do trabalho: modelo relacional, consultas MySQL e respostas dos 6 estados
docs/               documentação
```

## Documentação

1. [Arquitetura do site](docs/arquitetura.md): rotas, carregamento dos dados, páginas e desempenho.
2. [Dados e banco](docs/dados-e-banco.md): de onde vêm os dados, como viram arquivos do site, e o banco nacional em DuckDB no modelo relacional do trabalho.
3. [As 12 perguntas](docs/12-perguntas.md): o que cada consulta faz, o que ela responde e os limites de cada resposta.
4. [A régua dos partidos](docs/regua-dos-partidos.md): como cada partido é posto entre esquerda e direita, com as referências.
5. [Testes](docs/testes.md): o que é testado e como rodar.

## Fontes dos dados

- **Tribunal Superior Eleitoral (TSE), Portal de Dados Abertos:** candidatos, bens declarados, perfil do eleitorado, votação por município e zona, comparecimento, prestação de contas (receitas e despesas) e propostas de governo, de 1994 a 2026.
- **IBGE:** municípios, Censo 2022 (população) e PIB dos municípios (2021).
- **Atlas do Desenvolvimento Humano no Brasil (PNUD, Ipea e Fundação João Pinheiro),** pela API do IpeaData: IDHM, escolaridade dos adultos e renda por habitante de cada município (Censos 1991, 2000 e 2010).
- **Câmara dos Deputados, dados abertos:** orientação das bancadas nas votações do Plenário, de 2019 a 2026.
- **Estudos acadêmicos sobre a posição dos partidos:**
  - Zucco e Power (2024), *Latin American Politics and Society*; dados no Harvard Dataverse, doi:10.7910/DVN/6KVTUV.
  - Bolognesi, Ribeiro e Codato (2023), revista *Dados*.
  - V-Party, do projeto V-Dem (2022), doi:10.23696/vpartydsv2.

O site não mostra CPF, título de eleitor nem e-mail de ninguém. Os nomes de candidatos e doadores são públicos e vêm do TSE.

## Licenças

O código do site é do Grupo 5. As fontes Atkinson Hyperlegible e Barlow Condensed estão sob a licença SIL Open Font License (`fonts/LICENSE-*.txt`). D3, topojson-client e axe-core mantêm as licenças dos seus autores.
