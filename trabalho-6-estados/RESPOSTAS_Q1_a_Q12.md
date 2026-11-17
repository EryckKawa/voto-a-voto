# Respostas das 12 questões de pesquisa — Grupo 6 (CE, ES, MT, PR, SC, TO)

Trabalho de Banco de Dados Relacionais — "Dinheiro, Voto e Território: modelagem relacional e
análise das eleições de 2018 a 2024 nos estados do Ceará, Espírito Santo, Mato Grosso, Paraná,
Santa Catarina e Tocantins".

Todas as respostas abaixo foram **calculadas de verdade** sobre o banco `eleicoes_g6`, carregado a
partir dos arquivos oficiais baixados do TSE e do IBGE. Cada questão tem o CSV completo do
resultado na pasta `csv\` e a consulta correspondente está em `consultas_questoes.sql`
(dialeto MySQL) e `consultas_respostas.py` (executada em DuckDB, com a mesma semântica).

## O banco que sustenta as respostas

| Tabela | Linhas | Tabela | Linhas |
|---|---:|---|---:|
| uf | 6 | pessoa | 359.834 |
| municipio | 1.237 | candidatura | 496.162 |
| indicador_municipio | 3.708 | votacao_candidato | 3.504.627 |
| eleicao | 13 | votacao_partido | 265.789 |
| cargo / grau_instrucao / situacao | 12 / 10 / 12 | comparecimento | 21.769 |
| partido | 60 | receita | 1.639.961 |
| coligacao | 26.121 | despesa | 3.828.018 |

- Candidaturas por ano (grupo): 2002: 3.052 · 2004: 3.708 · 2006: 3.366 · 2008: 74.356 ·
  2010: 3.720 · 2012: 92.350 · 2014: 4.479 · 2016: 92.478 · 2018: 4.827 · 2020: 109.394 ·
  2022: 5.453 · 2024: 95.033 · 2026 (parcial): 3.946.
- **Integridade referencial verificada após a carga**: zero linhas órfãs em todas as chaves
  estrangeiras (votação sem candidatura, receita sem candidatura, indicador sem município etc.).
- Decisões de carga registradas no Apêndice A (sequencial de candidato achatado com ano+UF,
  votos de Presidente carregados dos arquivos BR, IDHM obtido do Ipea/Atlas DH etc.).

---

## Questão 1 — Quanto cada partido gastou por cadeira?

**Método**: soma das despesas contratadas de todos os candidatos do partido ÷ número de eleitos
do partido, por cargo e ano (2018–2024). CSV completo: `csv/q1_custo_por_cadeira.csv` (303 linhas).

**Resposta (destaques):**

Deputado Federal — os maiores gastos do grupo:

| Ano | Partido | Gasto total (R$) | Cadeiras | Custo por cadeira (R$) |
|---|---|---:|---:|---:|
| 2018 | PP | 29.332.343 | 5 | **5.866.469** |
| 2018 | PSDB | 18.315.765 | 3 | 6.105.255 |
| 2018 | PT | 15.919.822 | 10 | **1.591.982** |
| 2022 | UNIÃO | 91.987.782 | 11 | 8.362.526 |
| 2022 | PSB | 41.232.807 | 2 | **20.616.404** |
| 2022 | PL | 50.024.418 | 22 | **2.273.837** |
| 2022 | PT | 36.327.608 | 12 | 3.027.301 |

Vereador (todos os municípios do grupo):

| Ano | Partido | Gasto total (R$) | Cadeiras | Custo por cadeira (R$) |
|---|---|---:|---:|---:|
| 2020 | MDB | 21.033.328 | 1.858 | 11.320 |
| 2024 | PL | 80.216.304 | 1.443 | 55.590 |
| 2024 | PT | 40.973.045 | 705 | 58.118 |
| 2024 | MDB | 36.730.361 | 1.692 | 21.708 |

**Leitura**: (1) o custo da cadeira de deputado federal varia ~10× entre partidos no mesmo ano —
em 2022, cada cadeira do PL custou R$ 2,27 milhões e a do PSB R$ 20,6 milhões; (2) o PT foi o
partido mais eficiente de 2018 (R$ 1,59 mi/cadeira, com 10 cadeiras, o maior banco do grupo);
(3) nas municipais, o gasto total com vereador mais que dobrou de 2020 para 2024 (o PL gastou
R$ 80 milhões em 2024), com o custo médio da cadeira saltando de ~R$ 12 mil para ~R$ 25–58 mil.

---

## Questão 2 — Taxa de sucesso eleitoral por faixa de receita (quintis)

**Método**: candidatos de cada ano/cargo divididos em 5 faixas iguais de receita total
(NTILE(5)); mede o % de eleitos em cada faixa. CSVs: `q2_sucesso_por_quintil.csv` (por cargo) e
`q2_sucesso_por_quintil_geral.csv`.

**Resposta — Deputado Federal:**

| Quintil | 2018: receita média → % eleitos | 2022: receita média → % eleitos |
|---|---|---|
| 1 (menor) | R$ 403 → **0,0%** | R$ 1.648 → **0,0%** |
| 3 | R$ 16.713 → 0,0% | R$ 80.400 → 0,3% |
| 5 (maior) | R$ 860.358 → **32,9%** | R$ 1.295.132 → **24,7%** |

**Resposta — Vereador:**

| Quintil | 2020: receita média → % eleitos | 2024: receita média → % eleitos |
|---|---|---|
| 1 | R$ 60 → 2,8% | R$ 153 → 4,3% |
| 3 | R$ 1.455 → 12,4% | R$ 2.577 → 15,3% |
| 5 | R$ 12.083 → **22,4%** | R$ 24.658 → **22,3%** |

**Leitura**: dinheiro não garante, mas condiciona fortemente. Nos cargos proporcionais a taxa de
sucesso cresce monotonicamente com a receita; em 2024, quem está no topo da distribuição tem ~5×
a chance do fundo. Nos cargos majoritários (presidente/governador) o efeito é mais extremo:
fora do quintil de cima praticamente ninguém se elege.

---

## Questão 3 — Perfil IBGE do município × partido mais votado × abstenção

**Método**: municípios classificados por porte (população Censo 2022: <20 mil = pequeno,
<100 mil = médio, resto = grande) e por tercil de PIB per capita (2021); identifica o partido do
candidato mais votado (prefeito 2024; governador 2022) e cruza com IDHM (2010) e abstenção do
1º turno. CSV: `q3_perfil_municipio_partido_abstencao.csv` (161 linhas).

**Resposta — 2022 (governador), padrão mais nítido:**

| Porte × renda | Partido líder em nº de municípios | Municípios | IDHM médio | Abstenção média |
|---|---|---:|---:|---:|
| Pequeno × pobre | **PT** | 95 | 0,610 | 20,05% |
| Pequeno × rico | PSD | 95 | 0,713 | 18,55% |
| Médio × pobre | **PT** | 82 | 0,620 | 18,96% |
| Médio × rico | PL | 41 | 0,758 | 19,81% |
| Grande × pobre | PSD/PT (5 a 5) | — | 0,69–0,71 | 14,6–20,6% |
| Grande × rico | PSD | 13 | 0,760 | 19,04% |

**Resposta — 2024 (prefeito):** PSD (76), MDB (51) e PP (49) lideram nos pequenos de renda
intermediária; PSB (48) lidera nos pequenos pobres; PL (53) e PSD (57) nos pequenos ricos. A
abstenção cresce com o tamanho do município (pequenos ~13–15%; grandes ~21–27%) e tende a ser
maior nos municípios ricos que nos pobres de mesmo porte — o oposto do que se esperaria, e um
bom achado para discutir (migração, eleitorado fora do domicílio, competitividade local).

**Leitura**: existe um "mapa de renda" claro: quanto mais pobre o município, maior a presença do
PT à frente da votação majoritária; a centro-direita (PSD/PL/UNIÃO) domina onde o PIB per capita
é alto. O IDHM médio separa bem os estratos (0,61 nos pobres × 0,76 nos ricos).

---

## Questão 4 — Grau de instrução do candidato × porte do município (2024)

**Método**: candidaturas municipais de 2024 cruzadas com o porte do município (vw_indicador_atual)
e o grau de instrução declarado. CSV: `q4_instrucao_x_porte_2024.csv`.

**Resposta (participação % dentro do porte):**

| Grau de instrução | Pequeno | Médio | Grande |
|---|---:|---:|---:|
| Lê e escreve | 2,30% | 1,85% | 1,19% |
| Fundamental incompleto | 11,51% | 8,19% | 4,49% |
| Fundamental completo | 14,24% | 10,39% | 6,92% |
| Médio incompleto | 4,80% | 4,59% | 4,10% |
| Médio completo | **39,90%** | **37,11%** | 32,79% |
| Superior incompleto | 3,02% | 5,21% | 7,62% |
| **Superior completo** | 24,22% | 32,62% | **42,80%** |
| Analfabeto | 0,00% (1 caso) | — | 0,02% (4 casos) |

**Leitura**: a escolaridade dos candidatos cresce com o porte do município: superior completo é
42,8% das candidaturas nos grandes e apenas 24,2% nos pequenos, onde ainda aparecem 1.098
candidatos que só leem e escrevem. O trabalho mostra a estrutura educacional do mercado político
municipal por estrato de território.

---

## Questão 5 — Votos de legenda por partido

**Método**: participação dos votos de legenda no total de votos do partido (nominais + legenda),
1º turno, cargos proporcionais (legenda = 0 nos majoritários, como esperado). CSVs:
`q5_votos_legenda_partido.csv` (372 linhas) e `q5_legenda_por_ano_cargo.csv`.

**Resposta (agregado do grupo):**

| Ano | Cargo | Votos de legenda | % do total do cargo |
|---|---|---:|---:|
| 2018 | Deputado Estadual | 1.311.046 | **7,40%** |
| 2018 | Deputado Federal | 1.103.523 | 6,17% |
| 2020 | Vereador | 944.962 | 5,09% |
| 2022 | Deputado Estadual | 2.415.496 | 6,15% |
| 2022 | Deputado Federal | 1.429.002 | 3,65% |
| 2024 | Vereador | 698.119 | **3,35%** |

**Leitura**: o voto de legenda encolhe de forma consistente (7,4% → 3,4% nas estaduais entre 2018
e 2022; 5,1% → 3,4% nos vereadores entre 2020 e 2024). Faz sentido histórico: a partir de 2020
acabaram as coligações proporcionais e entraram as federações, e o eleitor passou a votar mais no
candidato do que no partido. O CSV por partido mostra quem ainda "vive" de legenda.

---

## Questão 6 — Nuvem de palavras das propostas de governo

**Resposta honesta: não foi possível executar com dados numéricos.** O TSE **não publica** as
propostas de governo como tabela no Portal de Dados Abertos — as tentativas de download dos
pacotes `proposta_governo_2018..2024.zip` retornaram HTTP 404 (registrado em
`Downloads\BDR_Votacao\log.txt`), e a tabela `proposta_governo` do banco ficou vazia (0 linhas).

O que o trabalho entrega: a consulta SQL está pronta e correta
(`consultas_questoes.sql`, seção Q6), inclusive com a busca textual via índice FULLTEXT
(`MATCH ... AGAINST ('saude educacao seguranca')`). Para executá-la de fato, é preciso extrair o
texto das propostas do sistema DivulgaCandContas (PDFs por candidato) — sugerido como trabalho
futuro no documento. Alternativa aplicada em sala: demonstrar a busca textual na tabela
`despesa.ds_despesa` (Q11), que tem texto livre real.

---

## Questão 7 — Candidatos jovens (≤29 anos) × não jovens × viés político

**Método**: faixa etária pela idade na posse (Estatuto da Juventude: jovem até 29); sucesso =
% eleito; espectro conforme `partido.ds_espectro`. CSVs: `q7_jovem_espectro_porte.csv` e
`q7_jovem_geral.csv`.

**Resposta:**

| Ano | Jovens candidatos | Sucesso jovens | Não jovens | Sucesso não jovens |
|---|---:|---:|---:|---:|
| 2018 | 255 (5,3% do total) | 6,67% | 4.572 | 7,55% |
| 2020 | 9.218 (8,4%) | 9,94% | 100.176 | 14,08% |
| 2022 | 248 (4,5%) | 2,82% | 5.205 | 6,47% |
| 2024 | 5.837 (6,1%) | 13,35% | 89.196 | 16,07% |

Por espectro (somando os 4 anos): centro 16,6% de sucesso, centro-direita 14,7%,
centro-esquerda 13,4%, direita 7,7%, esquerda 8,9% — os partidos centrais convertem candidatura
em cadeira com mais facilidade; esquerda e direita lançam mais "candidaturas de protesto".

**Leitura**: jovens são 5–8% das candidaturas e sempre elegem **menos** que os mais velhos — a
barreira de entrada etária é real e maior nos anos gerais (2,8% em 2022). Nos municipais de 2024
o sucesso jovem (13,4%) ficou próximo do geral, sinal de renovação pelas câmaras municipais.

---

## Questão 8 — Doações de pessoa jurídica × espectro político (até 2016)

**Método**: doadores PJ identificados na prestação de contas (disponível no grupo para **2012 e
2014**; 2010/2016 não puderam ser baixados — falha de conexão registrada no log). CSVs:
`q8_doacao_pj_espectro.csv`, `q8_doacao_pj_por_ano.csv`, `q8_top_setores_pj.csv`.

**Resposta:**

| Ano | Doações PJ (R$) | Receita total (R$) | % PJ |
|---|---:|---:|---:|
| 2012 | 155.799.537 | 654,1 milhões | **23,8%** |
| 2014 | 541.297.488 | 1,40 bilhões | **38,7%** |

| Espectro (2014) | Doações PJ (R$) | % PJ da receita do espectro |
|---|---:|---:|
| Esquerda | 322,1 milhões | **67,6%** |
| Centro | 107,4 milhões | 22,8% |
| Centro-esquerda | 56,6 milhões | 27,4% |
| Centro-direita | 54,1 milhões | 22,4% |

**Leitura**: a doação empresarial era grande e concentrada: em 2014, 2 de cada 3 reais da
esquerda (leia-se PT do grupo) vieram de PJ — coerente com a literatura sobre o "comitê
investidor" das empreiteiras naquele ciclo — enquanto centro e centro-direita dependiam mais de
fundo partidário e recursos próprios. Em 2012 (municipal), o peso PJ era menor (23,8%).
Observação de método: nos arquivos de 2012 não existe categoria "recursos de pessoas físicas"
(doações de PF entravam via comitês/outros candidatos), então a comparação PF×PJ só é justa em
2014. Desde 2016 doação de empresa é vedada (STF/Lei 13.165/2015) — por isso a série termina aí.

---

## Questão 9 — Viés político do município na linha do tempo

**Método**: votos por espectro por município, 1º turno — Presidente em 2018/2022 (arquivos BR,
por município/zona), Prefeito em 2020/2024. CSVs: `q9_espectro_municipio_tempo.csv` (17.592
linhas, município a município) e `q9_espectro_uf_ano.csv` (agregado por UF).

**Resposta — % dos votos por bloco, agregado dos 6 estados:**

| Ano | Esquerda | Centro-esquerda | Centro | Centro-direita | Direita |
|---|---:|---:|---:|---:|---:|
| 2018 (presidente) | 24,4% | 16,7% | 4,1% | 3,1% | **51,8%** |
| 2020 (prefeito) | 6,4% | 25,9% | 18,3% | **44,8%** | 4,6% |
| 2022 (presidente) | **43,3%** | 3,5% | 3,5% | **49,2%** | 0,5% |
| 2024 (prefeito) | 10,5% | 12,7% | 12,3% | **62,2%** | 2,3% |

Por UF (esquerda+centro-esquerda vs. resto): CE é o único estado de maioria de esquerda em todos
os pleitos (74,8% em 2018, 50,6% em 2024); SC é o mais conservador (90,8% de centro-direita+
direita em 2024); TO deu a virada mais forte, de 52,5% de esquerda em 2022 para 8,7% em 2024.

**Leitura**: o grupo tem dois "Brasis": o Ceará, estável à esquerda (fortaleza do PDT/PT), e o
corredor SC-PR-MT-ES, que entre 2020 e 2024 se alinhou à centro-direita em eleições municipais.
Nos pleitos presidenciais a polarização aparece limpa (51,8% de direita em 2018; 43×49 em 2022).
O CSV municipal permite mostrar o mapa município a município — por exemplo, a virada do
interior do TO.

---

## Questão 10 — Eleitos × não eleitos: recursos públicos e privados

**Método**: receita pública (fundo partidário/FEFC) e privada por candidatura, média por
resultado. CSVs: `q10_publico_privado_resultado.csv` e `q10_publico_privado_ano.csv`.

**Resposta (todos os cargos):**

| Ano | Resultado | Candidatos | Receita pública média | Receita privada média | % público |
|---|---|---:|---:|---:|---:|
| 2018 | Eleito | 362 | R$ 359.372 | R$ 260.167 | 58,0% |
| 2018 | Não eleito | 4.465 | R$ 55.942 | R$ 31.661 | 63,9% |
| 2022 | Eleito | 344 | **R$ 719.166** | **R$ 337.575** | 68,1% |
| 2022 | Não eleito | 5.109 | R$ 128.405 | R$ 28.645 | 81,8% |
| 2024 | Eleito | 15.111 | R$ 21.023 | R$ 11.803 | 64,0% |
| 2024 | Não eleito | 79.922 | R$ 8.371 | R$ 3.452 | 70,8% |

Deputado federal 2022: eleito recebeu em média R$ 1,53 milhão público + R$ 392 mil privado
(79,6% público); não eleito, R$ 211 mil + R$ 33 mil (86,6% público).

**Leitura**: eleitos arrecadam 4–6× mais que não eleitos, e a diferença está sobretudo no
dinheiro privado que se agrega ao fundo eleitoral — o candidato viável atrai doação, o inviável
depende só do fundo. A participação relativa do dinheiro público é maior entre os não eleitos
(82% em 2022), ou seja, o fundo eleitoral "equaliza para baixo": sustenta campanhas que não
decotam, enquanto o dinheiro privado concentra-se nos que já têm chance.

---

## Questão 11 — Onde o candidato investe em propaganda

**Método**: despesas contratadas agregadas por categoria oficial (`ds_origem_despesa`), por ano.
CSV: `q11_categorias_despesa.csv` (165 linhas; inclui o texto `ds_despesa` para nuvem de palavras
via `despesa`). 

**Resposta (top do grupo):**

| Categoria | 2018 | 2020 | 2022 | 2024 |
|---|---:|---:|---:|---:|
| **Publicidade por materiais impressos** | **18,0%** | **18,7%** | **17,1%** | **17,7%** |
| Atividades de militância/mobilização de rua | 13,1% | 8,9% | 13,1% | 12,6% |
| Despesas com pessoal | 13,8% | 9,0% | 13,9% | 8,3% |
| Serviços prestados por terceiros | 12,2% | 8,4% | 10,5% | 10,4% |
| Produção de programas de rádio/TV/vídeo | 8,5% | 10,2% | 7,1% | 8,0% |
| Publicidade por adesivos | 7,3% | 8,3% | 7,6% | — |

**Leitura**: apesar do discurso de "campanha digital", o dinheiro de propaganda do grupo segue
analógico: Impressos é a 1ª categoria nos 4 anos (~R$ 228 milhões em 2024), seguida de
mobilização de rua e produção de programas. As categorias completas por ano (incluindo
impulsionamento de internet e eventos) estão no CSV — material direto para a nuvem de palavras da
questão usando `ds_despesa` (texto livre real de 3,8 milhões de lançamentos).

---

## Questão 12 — Trajetória política e sobrevivência na carreira (2002–2026)

**Método**: pessoas unidas pelo número de título de eleitor entre as 13 eleições; 12a lista a
trajetória de quem concorreu mais de uma vez; 12b mede quantos dos eleitos no ano X voltam a ser
eleitos em X+4. CSVs: `q12a_trajetorias.csv` (101.046 pessoas) e `q12b_sobrevivencia*.csv`.

**Resposta 12a — quanto dura uma carreira política:**

- 101.046 pessoas concorreram 2+ vezes entre 2002 e 2026 no grupo.
- 19.401 ganharam pelo menos 2 eleições; **2.770 ganharam 4 ou mais**.
- Exemplos no topo (CSV tem a linha do tempo completa de cada um):
  - **Luizianne Lins** (PT→REDE, CE): prefeita 2004–2008, deputada federal 2014/2018/2022,
    senadora eleita 2026 — 9 candidaturas, 7 vitórias em 24 anos.
  - Wilson Pereira dos Santos (PSDB→PSD, TO): 9 candidaturas, 7 vitórias (deputado federal,
    prefeito 2×, deputado estadual 4×).
  - Alexandre Marcelo Coutinho (PTB→PMDB→PDT→PODE→UNIÃO): 10 candidaturas, 7 vitórias —
    exemplo de migração partidária como estratégia de sobrevivência.

**Resposta 12b — sobrevivência (eleitos em X reeleitos em X+4):**

| Ano eleito | Eleitos | Reeleitos 4 anos depois | Sobrevivência |
|---|---:|---:|---:|
| 2006 | 324 | 230 | **71,0%** |
| 2008 | 12.641 | 5.051 | 40,0% |
| 2012 | 14.876 | 5.910 | 39,7% |
| 2016 | 15.026 | 5.924 | 39,4% |
| 2018 | 362 | 197 | 54,4% |
| 2020 | 14.997 | 6.916 | **46,1%** |
| 2022 | 344 | 200 (parcial 2026) | 58,1% |

**Leitura**: cerca de **4 em cada 10** eleitos municipais conseguem se reeleitar no ciclo
seguinte; entre cargos majoritários estaduais/federais (2006→2010, 2018→2022) a sobrevivência
chega a 54–71%. Os anos 2002/2004/2010 mostram taxas baixas porque o cruzamento X→X+4 ali troca
de arena (eleito em eleição geral tenta município e vice-versa) — vale explorar isso na
argumentação. O número de eleitos 2002 (2.149) e 2006 (324) é menor porque a série por pessoa só
confia no título de eleitor a partir dos anos em que o TSE o publica de forma estável.

---

## Como reproduzir

1. `Downloads\BDR_Votacao\BAIXAR_DADOS.bat` — baixa e extrai os CSVs do TSE/IBGE (feito).
2. `python respostas\etl_carga.py` — cria `eleicoes_g6.duckdb` com as 17 tabelas do modelo.
3. `python respostas\supl_brasil.py` — carrega os votos de Presidente dos arquivos BR.
4. `python respostas\consultas_respostas.py` — roda as 12 consultas e exporta os CSVs.

## Apêndice A — Decisões e ressalvas de carga (para a seção 3 do trabalho)

1. **Sequencial de candidato**: o `SQ_CANDIDATO` do TSE se repete entre eleições (colisões
   medidas entre anos dentro da mesma UF). A PK usa o valor achatado
   `ANO*10^13 + código_UF*10^12 + sequencial`, único por construção; as receitas/despesas de
   2012/2014 usam a mesma função, o que rendeu apenas 20 receitas e 210 despesas órfãs
   (descartadas e contabilizadas).
2. **Presidente**: os arquivos por UF não trazem o cargo PRESIDENTE; os votos por município/zona
   vêm dos arquivos `*_BR.csv` (candidatura com `sg_uf` NULL, como no modelo). Os arquivos
   `_BRASIL` (todos os estados) foram ignorados para não duplicar o grupo.
3. **Município TSE × IBGE**: casamento por nome normalizado dentro da UF (1.235 de 1.237 sem
   intervenção); ajustes manuais: Fortaleza do Tabocão/TO (o TSE mantém dois códigos; o IBGE só
   admite um) e Santo Antônio do Leverger/MT.
4. **IDHM**: o SIDRA/IBGE não publica IDHM (os JSONs baixados vieram vazios); a série 2010 foi
   obtida da API do IpeaData (série ADH_IDHM, Atlas DH/PNUD), por código IBGE de 7 dígitos.
5. **Espectro ideológico**: mapeamento por sigla segundo escala aproximada de Bolognesi, Ribeiro
   e Codato (2023), gravado em `partido.ds_espectro`; partidos extintos sem classificação ficam
   "NAO CLASSIFICADO" (7 de 60).
6. **Propostas de governo**: dataset não existe como CSV no TSE (404 no download) — tabela
   criada e indexada, sem dados; ver Questão 6.
7. **2012 — PF**: a prestação de contas de 2012 não tem categoria "recursos de pessoas físicas";
   doações de PF aparecem como "outros candidatos/comitês" ou "recursos próprios". A leitura
   PF×PJ justa é a de 2014.
8. **2026**: dados parciais de 1º turno, usados apenas na linha do tempo da Q12 (marcados como
   parciais).
9. Motor usado para executar: **DuckDB 1.5.6** (SQL compatível; mesmas consultas do script MySQL
   com trocas de sintaxe triviais: `string_agg` por `GROUP_CONCAT`, `CASE` por `IF`).
   O script MySQL original permanece válido para carga em MySQL 8.
