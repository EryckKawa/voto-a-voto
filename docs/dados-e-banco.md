# Dados e banco

## De onde vêm os dados

| Fonte | Arquivos | Usado em |
|---|---|---|
| TSE, Portal de Dados Abertos | `votacao_candidato_munzona` (votos por candidato, município e zona), 1994 a 2026 | mapa, histórico das cidades, achados, banco |
| TSE | `detalhe_votacao_munzona` (aptos, comparecimento, abstenção, brancos, nulos) | Ninguém, quem faltou, banco |
| TSE | `consulta_cand` (candidaturas: cargo, partido, idade, escolaridade, situação) | banco |
| TSE | `votacao_partido_munzona` (votos nominais e de legenda) | banco (Q5) |
| TSE | prestação de contas de candidatos (receitas e despesas contratadas), 2010 a 2026 | banco (Q1, Q2, Q8, Q10, Q11) |
| TSE | propostas de governo (PDF): presidente e governador (2018, 2022 e 2026) e prefeito (2020 e 2024) | banco (Q6, nuvens de palavras, ficha do político) |
| TSE | `perfil_comparecimento_abstencao` | Ninguém (idade e escolaridade de quem falta) |
| TSE | `perfil_eleitorado` (eleitores aptos por cidade, faixa de idade, escolaridade e gênero), 2018 a 2024 | banco (Q4, Q7) |
| TSE | `bem_candidato` (bens declarados no registro da candidatura), 2006 a 2026 | banco (Q2) |
| TSE | fotos dos candidatos (`foto_cand<ano>_<UF>_div.zip`): presidente, governador e senador de 2010 a 2026 e prefeitos de 2024 | painel da cidade no mapa, página inicial |
| Atlas do Desenvolvimento Humano no Brasil (PNUD, Ipea e FJP), pela API do IpeaData | IDHM e seus três componentes, parte dos adultos com fundamental, médio e superior, renda por habitante; Censos 1991, 2000 e 2010, por município | banco (Q3, Q4) |
| IBGE | malha municipal, Censo 2022 (população), PIB dos municípios 2021 | mapa, Q3, Q4 |
| Câmara dos Deputados | votações e orientações de bancada no Plenário, 2019 a 2026 | régua pelo voto, banco (Q12) |
| Câmara dos Deputados | ementas de projetos com seus autores e coautores; transcrições de discursos, 2019 a 2026 | nuvem individual do político |
| Senado Federal | projetos de autoria/coautoria e resumos oficiais de pronunciamentos, 2019 a 2026 | nuvem individual do político |
| Câmara dos Deputados | voto de cada deputado em cada votação nominal (`votacoesVotos`) e a lista de deputados, 2019 a 2026 | banco (Q12), ficha do político |
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
montar_banco.py               monta o banco nacional do zero (junta as partes dos zips e roda processa_munzona.py e banco_brasil.py)
banco_brasil.py               banco nacional em DuckDB (abaixo)
fotos_politicos.py            miniaturas por pessoa e índice data/br/pol/fotos (2014 a 2026, eleições gerais)
textos_parlamentares.py       projetos e discursos oficiais por pessoa → data/br/pol/textos
ficha_politico.py             ficha de cada político, palavras dos planos, votos na Câmara e índice da busca → data/br/pol
baixar_votos_propostas.ps1    baixa os votos de cada deputado (Câmara) e os planos de governador e prefeito (TSE), no Windows
rodar_consultas.py            roda consultas_brasil.sql → data/br/perguntas
vies_cidades.py               nota média dos votos de cada cidade, cargo a cargo (Q9) → data/br/vies/{UF}
baixar_extras.ps1             baixa os bens dos candidatos (TSE) e o IDHM das cidades (IpeaData), no Windows
lista_fotos.py lista          quais fotos o site mostra → fotos_lista.csv
baixar_fotos_site.ps1         baixa os pacotes de fotos do TSE e grava miniaturas 90×120 em img/fotos/<ano>/<sequencial>.jpg (Windows)
lista_fotos.py indice         quais candidatos têm foto → data/br/fotos/<ano>
empacotar.py                  .json → .js (para o site abrir sem servidor)
```

Cuidados que a carga trata:

- **Codificação e aspas:** os CSV do TSE vêm em latin-1 e com aspas irregulares. Eles são convertidos para UTF-8 na extração e lidos com tolerância a linhas quebradas.
- **Número do candidato:** de 1998 a 2010, o número sequencial do candidato só é único dentro do estado e do cargo. Por isso a chave usa abrangência + cargo + sequencial.
- **Presidente em 1998:** os votos só existem no arquivo nacional.
- **Resultado de presidente em 2006:** o cadastro do TSE deixa Lula e Alckmin sem situação final. A etapa `situacoes` recupera eleito/não eleito pela soma nacional dos votos de segundo turno, preservando os campos que já têm resultado. Lula teve 58.295.042 votos e Alckmin, 37.543.178.
- **Brancos e nulos antigos:** em anos antigos, o campo de total de nulos vem zerado, e o valor certo está em `QT_VOTOS_NULOS`.
- **Cruzamento TSE × IBGE:** os códigos de município do TSE e do IBGE são cruzados por uma tabela de correspondência.
- **Cidades que faltam no arquivo do TSE:** o arquivo de votação por município não traz algumas cidades em alguns anos, embora o arquivo de comparecimento traga. São 98 cidades para prefeito em 1996 (quase todas no Maranhão e no Pará), 3 no Pará em 1994 e até 8 nas eleições para prefeito de 2000 a 2024 (8 em 2024, entre elas Nossa Senhora do Socorro/SE e Iporá/GO). Em Pacujá/CE, em 2020, a eleição foi anulada e refeita depois. O site não inventa esses resultados: as cidades aparecem como "sem resultado oficial".

Os scripts foram rodados num ambiente com as pastas fixas que aparecem no topo de cada um (`/tmp/claude-0/...`). Para rodar em outro computador, ajuste essas constantes. O `banco_brasil.py` aceita as pastas por variável de ambiente (o `montar_banco.py` já as preenche): `BANCO` (o arquivo .duckdb), `WEB` (a pasta `data/br`), `IBGE` (a pasta com `pib_2021.json`) e `TMPBR` (arquivos temporários).

## O banco nacional (DuckDB)

As 12 perguntas são respondidas por consultas SQL num banco DuckDB com **o mesmo modelo relacional do trabalho** (`trabalho-6-estados/modelo_votacao_grupo6.sql`), agora para os 27 estados. O banco é montado por `scripts/banco_brasil.py` e tem cerca de 4,4 GB. Ele não está no repositório, porque passa do limite de tamanho do GitHub e guarda CPF e CNPJ de doadores e o título de eleitor dos candidatos.

### Tabelas

| Tabela | Linhas | O que guarda |
|---|---:|---|
| `uf` | 27 | estados e regiões |
| `municipio` | 5.570 | código TSE e IBGE, nome, estado, capital |
| `indicador_municipio` | 27.832 | população (Censo 2022), PIB (2021) e IDHM (1991, 2000 e 2010) por município |
| `indicador_atlas` | 16.692 | Atlas do Desenvolvimento Humano por município e censo: IDHM e componentes, escolaridade dos adultos, renda por habitante |
| `eleicao` | 17 | eleições de 1994 a 2026 (geral ou municipal) |
| `cargo`, `grau_instrucao`, `situacao_totalizacao` | 13, 11, 17 | tabelas de domínio |
| `partido` | 91 | siglas do TSE |
| `partido_linhagem` | 535 | a "família" de cada sigla em cada ano (PFL → DEM, PPB → PP, PR → PL…) |
| `partido_nota` | 1.437 | nota ideológica de cada linhagem em cada eleição, por fonte e combinada |
| `pessoa` | 2.397.854 | cada candidato, ligado entre eleições pelo título de eleitor |
| `candidatura` | 3.697.353 | uma linha por candidato em cada eleição |
| `votacao_candidato` | 38.416.421 | votos de cada candidatura em cada município e turno |
| `votacao_partido` | 4.512.323 | votos nominais e de legenda por partido e município |
| `comparecimento` | 392.517 | aptos, comparecimento, abstenção, brancos e nulos |
| `receita` | 10.781.448 | receitas de campanha (2010 a 2026) |
| `despesa` | 22.950.765 | despesas contratadas (2010 a 2026) |
| `proposta_governo` | 30.346 | texto dos planos de governo de presidente, governador e prefeito |
| `bem_candidato` | 5.083.935 | bens declarados por candidatura (2006 a 2026) |
| `eleitorado_perfil` | 5.858.639 | eleitores aptos por cidade, faixa de idade, escolaridade e gênero (2018 a 2024) |
| `proposta_palavra` | 2.095.170 | até 80 palavras mais usadas em cada plano de governo (sem acento e com a grafia mais usada) |
| `votacao_camara` | 3.871 | votações do Plenário da Câmara com voto nominal, 2019 a 2026: data, proposição, ementa, resultado e se é de mérito |
| `voto_deputado` | 1.273.413 | o voto de cada deputado em cada votação (Sim, Não, Obstrução, Abstenção, Art. 17) |
| `orientacao_bancada` | 68.509 | a orientação de cada bancada, do governo, da maioria e da oposição em cada votação |
| `deputado_camara` | 916 | deputados da Câmara, ligados à `pessoa` do TSE pelo nome civil e pela data de nascimento |

O banco tem 2.397.854 registros em `pessoa`; 19 ficaram sem candidatura associada na carga. O site exporta as 2.397.835 pessoas com candidatura, cobrindo as 3.697.353 candidaturas. A conferência compara a quantidade de candidaturas de cada ficha com o banco.

### Views

- `vw_candidatura_resumo`: candidatura + cargo + partido + espectro do partido **naquela eleição** + eleito ou não + idade + receita (total, pública, privada) + despesa total. É a base de Q1, Q2, Q7 e Q10.
- `vw_indicador_atual`: população de 2022, PIB por habitante de 2021 e, do Atlas (Censo 2010), IDHM, IDHM Educação, Renda e Longevidade, adultos com superior e médio e renda por habitante de cada município. É a base de Q3 e Q4.
- `vw_patrimonio_candidato`: soma dos bens declarados de cada candidatura (zero para quem não declarou nada). É a base de Q2.
- `vw_eleitorado_municipio`: eleitorado de cada cidade em cada eleição: total, idade média (pelo meio de cada faixa), parte com até 29 e com 60 anos ou mais, parte com superior completo. É a base de Q4 e Q7.
- `vw_partido_ano`: a nota e a faixa (esquerda, centro-esquerda, centro, centro-direita, direita) de cada partido em cada eleição, com o aviso de classificação incerta.
- `vw_despesa_tipo`: cada despesa com o tipo, juntando as categorias do TSE em onze grupos (material impresso, internet e redes, rádio, TV e vídeo, militância, adesivos e carro de som, comícios e eventos, jornais e revistas, que são propaganda, e pessoal, veículos, repasses e outras). É a base de Q11 e do gasto na ficha do político.

### Decisões do modelo

- **Votos por município:** os votos ficam no nível do município (`nr_zona = 0`). Por zona eleitoral seriam centenas de milhões de linhas, e nenhuma pergunta usa a zona.
- **Chave da candidatura:** a candidatura é única por eleição, abrangência e número sequencial. A abrangência é o município nas eleições municipais, o estado nos cargos estaduais e o Brasil para presidente.
- **Turnos:** entram só as eleições ordinárias. Para cada candidato vale a situação do último turno que ele disputou.
- **Quem conta como eleito:** "eleito por média" conta como eleito.
- **Mesma pessoa em anos diferentes:** a pessoa é seguida pelo título de eleitor. Em 1996 os arquivos não trazem o título, e esse ano fica fora da Q12.

### Como montar

No Windows, com a pasta `BDR_Votacao` em Downloads (como deixam os scripts `baixar_*.ps1`), um comando monta tudo:

```
python scripts/montar_banco.py
python scripts/rodar_consultas.py %USERPROFILE%/Downloads/BDR_Votacao/banco/eleicoes_brasil.duckdb
python scripts/vies_cidades.py %USERPROFILE%/Downloads/BDR_Votacao/banco/eleicoes_brasil.duckdb
python scripts/ficha_politico.py %USERPROFILE%/Downloads/BDR_Votacao/banco/eleicoes_brasil.duckdb
python scripts/empacotar.py
```

`montar_banco.py` junta as partes dos zips, gera os votos por município (`processa_munzona.py`) e roda as etapas de `banco_brasil.py`; cada etapa pode ser rodada à parte:

```
python scripts/banco_brasil.py PASTA_DOS_ZIPS base cand votos partido_votos comp
python scripts/banco_brasil.py PASTA_DOS_ZIPS contas 2010 2012 2014 2016 2018 2020 2022 2024 2026
python scripts/banco_brasil.py PASTA_DOS_ZIPS propostas camara idhm bens eleitorado notas views
```

As fotos por pessoa são geradas por `fotos_politicos.py`: 81.214 miniaturas em `img/pol`, de 81.296 pessoas nas eleições gerais de 2014 a 2026. Foram processados os 112 pacotes; 82 pessoas não tinham foto aproveitável no pacote. A ficha usa esse índice quando não há uma foto dos pacotes já usados pelo mapa. Rode novamente depois da exportação das fichas com `--indice` para atualizar apenas `data/br/pol/fotos.js`, sem repetir downloads.

A etapa `propostas` guarda quais zips já leu (tabela `proposta_carga`): rodada de novo, ela só lê os zips que chegaram depois. A etapa `camara` lê a pasta `camara` ao lado de `brasil` (`baixar_votos_propostas.ps1`). No Windows, rode com `PYTHONUTF8=1` (o `montar_banco.py` já faz isso).

Para rodar só algumas consultas, guardando as outras como estavam: `python scripts/rodar_consultas.py caminho/eleicoes_brasil.duckdb q2b,q3b`.

Os arquivos grandes vêm cortados em partes de 300 MB (`.zip.001`, `.zip.002`…); o script junta as partes antes de abrir. A etapa `idhm` lê os arquivos `ipea_ADH_*.json.001` que o `baixar_extras.ps1` grava na mesma pasta.

## Privacidade

O site não mostra CPF, CNPJ, título de eleitor nem e-mail. Ementas e descrições da Câmara têm CPF/CNPJ substituídos por `[documento omitido]` antes de serem exportadas. As consultas usam o título só para ligar a mesma pessoa entre eleições (`nr_titulo_eleitoral NOT LIKE 'SQ%'`), e ele não aparece em nenhum resultado. Nomes de candidatos e de empresas doadoras são públicos no TSE.

### Exportação conferida em 27/10/2026

Todas as 3.697.353 candidaturas foram conferidas por pessoa contra o banco, em 2.397.835 fichas. Os 24.569 prefixos do manifesto de busca têm arquivo correspondente. Há 30.346 planos com texto e 81.214 miniaturas por pessoa. Os dados das fichas usam gzip dentro dos `.js`: passaram de 934.294.662 para 343.532.581 bytes, com conferência de igualdade após descompactar cada arquivo. A pasta completa do site ficou em cerca de **771 MB**, abaixo de 1 GB. Esta é uma validação local; a versão pública não foi atualizada nesta execução.

### Nuvens individuais de atividade parlamentar

`python scripts/textos_parlamentares.py` lê o banco nacional em Downloads/BDR_Votacao, cruza nome civil e data de nascimento (incluindo candidaturas de suplentes de senador) e busca os textos oficiais de 2019 a 2026. A mesma pessoa pode ter plano de governo e atividade na Câmara ou no Senado; a ficha permite escolher a fonte, sem misturar suas frequências.

- **Planos:** PDF individual do TSE, já extraído por `banco_brasil.py`.
- **Câmara, projetos:** ementas de projetos de autoria/coautoria, cruzadas pelo identificador oficial do autor. Proposições em que a pessoa apenas votou não alimentam sua nuvem.
- **Câmara, discursos:** transcrições retornadas por `/deputados/{id}/discursos`, seguindo todas as páginas. As consultas são divididas em períodos de até quatro anos.
- **Senado, projetos:** ementas obtidas por `/processo?codigoParlamentarAutor=...`, com filtro do período.
- **Senado, discursos:** resumos oficiais dos pronunciamentos, consultados ano a ano. São identificados como resumos, e não como transcrições.

Os arquivos de projetos abrangem PL, PLP, PEC, PDL/PDC, PRC e PFC, além de PLS/PLC quando usados na identificação e PRS, PDS e PLN no Senado. Requerimentos e procedimentos administrativos ficam fora. A contagem ignora palavras comuns, datas, fórmulas de protocolo, URLs, emails e números de documentos. Acentos são preservados na grafia mais frequente; palavras que só diferem pelo acento têm suas contagens somadas.

Os arquivos brutos e o cache de consultas ficam em `Downloads/BDR_Votacao/textos`, fora do site. O público recebe apenas as quarenta palavras mais frequentes de cada fonte, suas contagens, número de documentos, período, identificação da fonte e link oficial. Reexecutar o coletor reaproveita os arquivos concluídos. Rode-o depois de reconstruir o banco, para refazer os vínculos das pessoas.

Textos de assembleias estaduais e câmaras municipais ainda não são coletados. Para candidatos sem plano nem texto parlamentar vinculado, a ficha explica a ausência; ela não atribui à pessoa uma nuvem do partido ou de outro candidato. Falha de coleta é identificada separadamente de ausência de textos.

Referências das APIs: [Câmara](https://dadosabertos.camara.leg.br/swagger/api.html) e [Senado](https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html).

Coleta de 27/10/2026: **974 pessoas com palavras parlamentares**, em 988 cadastros vinculados, sem falhas de coleta. Câmara: 73.600 ementas de projetos e 111.560 transcrições de discursos. Senado: 17.548 ementas de projetos e 25.678 resumos de pronunciamentos. Os demais cadastros ficam com a nuvem do plano, quando houver, ou com o aviso de ausência.
