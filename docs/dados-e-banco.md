# Dados e banco

## De onde vêm os dados

| Fonte | Arquivos | Usado em |
|---|---|---|
| TSE, Portal de Dados Abertos | `votacao_candidato_munzona` (votos por candidato, município e zona), 1994 a 2026 | mapa, histórico das cidades, achados, banco |
| TSE | `detalhe_votacao_munzona` (aptos, comparecimento, abstenção, brancos, nulos) | Ninguém, quem faltou, banco |
| TSE | `consulta_cand` (candidaturas: cargo, partido, idade, escolaridade, situação) | banco |
| TSE | `votacao_partido_munzona` (votos nominais e de legenda) | banco (Q5) |
| TSE | prestação de contas de candidatos (receitas e despesas contratadas), 2010 a 2024 | banco (Q1, Q2, Q8, Q10, Q11) |
| TSE | propostas de governo dos candidatos a presidente (PDF), 2018, 2022 e 2026 | banco (Q6) |
| TSE | `perfil_comparecimento_abstencao` | Ninguém (idade e escolaridade de quem falta) |
| IBGE | malha municipal, Censo 2022 (população), PIB dos municípios 2021 | mapa, Q3, Q4 |
| Câmara dos Deputados | votações e orientações de bancada no Plenário, 2019 a 2026 | régua pelo voto |
| Harvard Dataverse, V-Dem, revista *Dados* | notas dos partidos (ver [regua-dos-partidos.md](regua-dos-partidos.md)) | régua dos partidos |

Os arquivos originais do TSE têm vários gigabytes e não estão no repositório. Os scripts em `scripts/` mostram como cada arquivo do site foi feito a partir deles.

## Do arquivo do TSE ao site

```
arquivos do TSE (zip, CSV em latin-1)
  └─ processa_munzona.py      votos somados por cidade → parquet (um por ano)
       ├─ nacional_venc.py    quem venceu em cada cidade → data/br/venc, uf, resumo
       ├─ historico.py        roda munzona → venc → comparecimento para cada ano antigo
       ├─ juntar_uf.py        junta os estados num arquivo por eleição → data/br/ufx
       ├─ historia.py         histórico de cada cidade → data/br/hist/{UF}
       ├─ nacional_comparecimento.py, serie_comp.py, ninguem.py, perfil_falta.py
       └─ achados.py          números da página "O que o voto revela"
geo_proj.js                   desenho do mapa já projetado → data/br/geo_proj
regua_voto.py                 régua pelo voto na Câmara → data/br/ideologia_voto
ideologia.py, ideologia_anos.py  régua de Harvard por ano → data/br/ideologia
notas_estudos.py              nota de cada partido em cada eleição → partidos_notas, ideologia_consenso, partido_nota.csv
nacional_proporcional.py      deputados e vereador: partido mais votado em cada cidade → data/br/venc, prop e hist
primeira_eleicao.py           ano da primeira eleição de cada cidade → coluna nova em cidades (roda depois de nacional_venc.py)
busca_brasil.py               índice da busca do Brasil inteiro → data/br/busca
banco_brasil.py               banco nacional em DuckDB (abaixo)
rodar_consultas.py            roda consultas_brasil.sql → data/br/perguntas
empacotar.py                  .json → .js (para o site abrir sem servidor)
```

Cuidados que a carga trata:

- **Codificação e aspas:** os CSV do TSE vêm em latin-1 e com aspas irregulares. Eles são convertidos para UTF-8 na extração e lidos com tolerância a linhas quebradas.
- **Número do candidato:** de 1998 a 2010, o número sequencial do candidato só é único dentro do estado e do cargo. Por isso a chave usa abrangência + cargo + sequencial.
- **Presidente em 1998:** os votos só existem no arquivo nacional.
- **Brancos e nulos antigos:** em anos antigos, o campo de total de nulos vem zerado, e o valor certo está em `QT_VOTOS_NULOS`.
- **Cruzamento TSE × IBGE:** os códigos de município do TSE e do IBGE são cruzados por uma tabela de correspondência.
- **Cidades que faltam no arquivo do TSE:** o arquivo de votação por município não traz algumas cidades em alguns anos, embora o arquivo de comparecimento traga. São 98 cidades para prefeito em 1996 (quase todas no Maranhão e no Pará), 3 no Pará em 1994 e até 8 nas eleições para prefeito de 2000 a 2024 (8 em 2024, entre elas Nossa Senhora do Socorro/SE e Iporá/GO). Em Pacujá/CE, em 2020, a eleição foi anulada e refeita depois. O site não inventa esses resultados: as cidades aparecem como "sem resultado oficial".

Os scripts foram rodados num ambiente com as pastas fixas que aparecem no topo de cada um (`/tmp/claude-0/...`). Para rodar em outro computador, ajuste essas constantes.

## O banco nacional (DuckDB)

As 12 perguntas são respondidas por consultas SQL num banco DuckDB com **o mesmo modelo relacional do trabalho** (`trabalho-6-estados/modelo_votacao_grupo6.sql`), agora para os 27 estados. O banco é montado por `scripts/banco_brasil.py` e tem cerca de 1,8 GB. Ele não está no repositório, porque passa do limite de tamanho do GitHub e guarda CPF e CNPJ de doadores e o título de eleitor dos candidatos.

### Tabelas

| Tabela | Linhas | O que guarda |
|---|---:|---|
| `uf` | 27 | estados e regiões |
| `municipio` | 5.570 | código TSE e IBGE, nome, estado, capital |
| `indicador_municipio` | 11.140 | população (Censo 2022) e PIB (2021) por município |
| `eleicao` | 17 | eleições de 1994 a 2026 (geral ou municipal) |
| `cargo`, `grau_instrucao`, `situacao_totalizacao` | 13, 11, 17 | tabelas de domínio |
| `partido` | 85 | siglas do TSE |
| `partido_linhagem` | 507 | a "família" de cada sigla em cada ano (PFL → DEM, PPB → PP, PR → PL…) |
| `partido_nota` | 1.437 | nota ideológica de cada linhagem em cada eleição, por fonte e combinada |
| `pessoa` | 2.397.844 | cada candidato, ligado entre eleições pelo título de eleitor |
| `candidatura` | 3.697.372 | uma linha por candidato em cada eleição |
| `votacao_candidato` | 38.409.067 | votos de cada candidatura em cada município e turno |
| `votacao_partido` | 3.890.878 | votos nominais e de legenda por partido e município |
| `comparecimento` | 392.517 | aptos, comparecimento, abstenção, brancos e nulos |
| `receita` | 7.602.704 | receitas de campanha (2010 a 2024) |
| `despesa` | 18.554.457 | despesas contratadas (2010 a 2024) |
| `proposta_governo` | 39 | texto dos planos de governo para presidente |

### Views

- `vw_candidatura_resumo`: candidatura + cargo + partido + espectro do partido **naquela eleição** + eleito ou não + idade + receita (total, pública, privada) + despesa total. É a base de Q1, Q2, Q7 e Q10.
- `vw_indicador_atual`: população de 2022 e PIB por habitante de 2021 de cada município. É a base de Q3 e Q4.
- `vw_partido_ano`: a nota e a faixa (esquerda, centro-esquerda, centro, centro-direita, direita) de cada partido em cada eleição, com o aviso de classificação incerta.

### Decisões do modelo

- **Votos por município:** os votos ficam no nível do município (`nr_zona = 0`). Por zona eleitoral seriam centenas de milhões de linhas, e nenhuma pergunta usa a zona.
- **Chave da candidatura:** a candidatura é única por eleição, abrangência e número sequencial. A abrangência é o município nas eleições municipais, o estado nos cargos estaduais e o Brasil para presidente.
- **Turnos:** entram só as eleições ordinárias. Para cada candidato vale a situação do último turno que ele disputou.
- **Quem conta como eleito:** "eleito por média" conta como eleito.
- **Mesma pessoa em anos diferentes:** a pessoa é seguida pelo título de eleitor. Em 1996 os arquivos não trazem o título, e esse ano fica fora da Q12.

### Como montar

```
python scripts/banco_brasil.py PASTA_DOS_ZIPS base cand votos partido_votos comp
python scripts/banco_brasil.py PASTA_DOS_ZIPS contas 2010 2012 2014 2018 2020 2022 2024
python scripts/banco_brasil.py PASTA_DOS_ZIPS propostas notas views
python scripts/rodar_consultas.py caminho/eleicoes_brasil.duckdb
python scripts/empacotar.py
```

## Privacidade

O site não mostra CPF, CNPJ, título de eleitor nem e-mail. As consultas usam o título só para ligar a mesma pessoa entre eleições (`nr_titulo_eleitoral NOT LIKE 'SQ%'`), e ele não aparece em nenhum resultado. Nomes de candidatos e de empresas doadoras são públicos no TSE.
