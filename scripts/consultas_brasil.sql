-- =====================================================================
-- As 12 questões, agora para o Brasil inteiro (27 UFs, 5.570 municípios)
-- Banco: eleicoes_brasil.duckdb, montado por scripts/banco_brasil.py no mesmo modelo
-- do trabalho (modelo_votacao_grupo6.sql). Dialeto: DuckDB (igual ao usado na versão
-- dos 6 estados; troca do MySQL: COUNT_IF/CAST no lugar de SUM(booleano), string_agg
-- no lugar de GROUP_CONCAT, strip_accents no lugar da collation sem acento).
-- Cada bloco começa com "-- @id | descrição"; o site mostra o SQL e o resultado de cada um.
-- Espectro dos partidos: vw_partido_ano.ds_espectro, a posição do partido NAQUELA eleição. Combina três estudos
-- acadêmicos (Zucco e Power 2024; Bolognesi, Ribeiro e Codato 2023; V-Party/V-Dem 2022) e o voto das bancadas na Câmara
-- (2019-2026), pesando mais a medida mais próxima da eleição (mediana ponderada), na escala −1 a +1, feita por
-- scripts/notas_estudos.py, em cinco faixas: até −0,5 esquerda, até −0,25 centro-esquerda, até +0,25 centro, até +0,5
-- centro-direita, acima disso direita. Partido que nenhuma medida alcança fica sem espectro (NULL).
-- =====================================================================

-- @q1 | Custo por cadeira: despesa contratada do partido dividida pelas cadeiras que ele ganhou
SELECT nr_ano_eleicao, ds_cargo, sg_partido,
       ROUND(SUM(vr_despesa_total), 2)                                          AS vr_gasto_total,
       COUNT_IF(fl_eleito)                                                      AS qt_cadeiras,
       ROUND(SUM(vr_despesa_total) / NULLIF(COUNT_IF(fl_eleito), 0), 2)          AS vr_custo_por_cadeira
FROM vw_candidatura_resumo
WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND cd_cargo IN (6, 11, 13)
GROUP BY nr_ano_eleicao, ds_cargo, sg_partido
HAVING COUNT_IF(fl_eleito) >= 5
ORDER BY nr_ano_eleicao, ds_cargo, vr_custo_por_cadeira DESC;

-- @q1b | Custo médio de uma cadeira, por cargo e ano (todos os partidos juntos)
SELECT nr_ano_eleicao, ds_cargo, ROUND(SUM(vr_despesa_total), 0) AS vr_gasto_total, COUNT_IF(fl_eleito) AS qt_cadeiras,
       ROUND(SUM(vr_despesa_total) / COUNT_IF(fl_eleito), 0) AS vr_custo_por_cadeira
FROM vw_candidatura_resumo
WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND cd_cargo IN (3, 5, 6, 7, 11, 13)
GROUP BY nr_ano_eleicao, ds_cargo ORDER BY ds_cargo, nr_ano_eleicao;

-- @q1c | Gasto médio por candidato (Σ gastos ÷ nº de candidatos do cargo), custo por cadeira (Σ gastos ÷ eleitos) e custo por mês de mandato
SELECT nr_ano_eleicao, ds_cargo, cd_cargo, COUNT(*) AS qt_candidatos, COUNT_IF(vr_despesa_total > 0) AS qt_com_despesa, COUNT_IF(fl_eleito) AS qt_eleitos,
       ROUND(SUM(vr_despesa_total), 0)                                                    AS vr_gasto_total,
       ROUND(SUM(vr_despesa_total) / COUNT(*), 0)                                         AS vr_gasto_medio_candidato,
       ROUND(SUM(vr_despesa_total) / NULLIF(COUNT_IF(fl_eleito), 0), 0)                   AS vr_custo_por_cadeira,
       ROUND(SUM(vr_despesa_total) / NULLIF(COUNT_IF(fl_eleito), 0) / (CASE WHEN cd_cargo = 5 THEN 8 ELSE 4 END * 12), 0) AS vr_custo_por_mes_mandato  -- senador: 8 anos
FROM vw_candidatura_resumo
WHERE nr_ano_eleicao >= 2010 AND cd_cargo IN (1, 3, 5, 6, 7, 11, 13)
GROUP BY nr_ano_eleicao, ds_cargo, cd_cargo HAVING SUM(vr_despesa_total) > 0
ORDER BY cd_cargo, nr_ano_eleicao;

-- @q2 | Taxa de sucesso x dinheiro: candidatos em cinco grupos de receita (1 = menos dinheiro)
WITH base AS (
    SELECT nr_ano_eleicao, ds_cargo, fl_eleito, vr_receita_total,
           NTILE(5) OVER (PARTITION BY nr_ano_eleicao, ds_cargo ORDER BY vr_receita_total) AS nr_quintil
    FROM vw_candidatura_resumo
    WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND cd_cargo IN (6, 7, 11, 13)
)
SELECT nr_ano_eleicao, ds_cargo, nr_quintil, COUNT(*) AS qt_candidatos,
       ROUND(AVG(vr_receita_total), 2) AS vr_receita_media, ROUND(100 * AVG(CAST(fl_eleito AS INT)), 2) AS pc_taxa_sucesso
FROM base GROUP BY nr_ano_eleicao, ds_cargo, nr_quintil ORDER BY nr_ano_eleicao, ds_cargo, nr_quintil;

-- @q2b | Taxa de sucesso x patrimônio declarado: candidatos em seis faixas pela soma dos bens que declararam ao TSE
WITH base AS (
    SELECT e.nr_ano_eleicao, cg.ds_cargo, COALESCE(st.fl_eleito, false) AS fl_eleito, pt.vr_patrimonio
    FROM candidatura c
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN cargo cg  ON cg.cd_cargo = c.cd_cargo
    JOIN vw_patrimonio_candidato pt ON pt.id_candidatura = c.id_candidatura
    LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE e.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND c.cd_cargo IN (3, 5, 6, 7, 11, 13)
)
SELECT nr_ano_eleicao, ds_cargo,
       CASE WHEN vr_patrimonio = 0 THEN 1 WHEN vr_patrimonio < 100000 THEN 2 WHEN vr_patrimonio < 500000 THEN 3
            WHEN vr_patrimonio < 1000000 THEN 4 WHEN vr_patrimonio < 5000000 THEN 5 ELSE 6 END AS nr_faixa,
       CASE WHEN vr_patrimonio = 0 THEN 'nenhum bem declarado' WHEN vr_patrimonio < 100000 THEN 'até R$ 100 mil'
            WHEN vr_patrimonio < 500000 THEN 'R$ 100 mil a 500 mil' WHEN vr_patrimonio < 1000000 THEN 'R$ 500 mil a 1 milhão'
            WHEN vr_patrimonio < 5000000 THEN 'R$ 1 a 5 milhões' ELSE 'mais de R$ 5 milhões' END AS ds_faixa,
       COUNT(*) AS qt_candidatos, COUNT_IF(fl_eleito) AS qt_eleitos,
       ROUND(100 * AVG(CAST(fl_eleito AS INT)), 2) AS pc_taxa_sucesso, ROUND(MEDIAN(vr_patrimonio), 0) AS vr_patrimonio_mediano
FROM base GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3;

-- @q2c | Patrimônio dos eleitos x dos não eleitos: mediana, média e parte que não declarou nenhum bem
SELECT e.nr_ano_eleicao, cg.ds_cargo, CASE WHEN COALESCE(st.fl_eleito, false) THEN 'eleito' ELSE 'não eleito' END AS ds_resultado,
       COUNT(*) AS qt_candidatos, ROUND(MEDIAN(pt.vr_patrimonio), 0) AS vr_patrimonio_mediano, ROUND(AVG(pt.vr_patrimonio), 0) AS vr_patrimonio_medio,
       ROUND(100 * AVG(CAST(pt.qt_bens = 0 AS INT)), 1) AS pc_sem_bens, ROUND(100 * AVG(CAST(pt.vr_patrimonio >= 1000000 AS INT)), 1) AS pc_milionarios
FROM candidatura c
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
JOIN cargo cg  ON cg.cd_cargo = c.cd_cargo
JOIN vw_patrimonio_candidato pt ON pt.id_candidatura = c.id_candidatura
LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
WHERE e.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND c.cd_cargo IN (3, 5, 6, 7, 11, 13)
GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- @q3 | Perfil do município (porte e riqueza, IBGE) x lado do mais votado x abstenção
WITH ind AS (
    SELECT cd_municipio_tse, qt_populacao, vr_pib_per_capita,
           CASE WHEN qt_populacao < 20000 THEN '1 pequeno (até 20 mil hab.)' WHEN qt_populacao < 100000 THEN '2 médio (20 a 100 mil)' ELSE '3 grande (mais de 100 mil)' END AS ds_porte,
           CASE NTILE(3) OVER (ORDER BY vr_pib_per_capita) WHEN 1 THEN '1 pobre' WHEN 2 THEN '2 intermediário' ELSE '3 rico' END AS ds_renda
    FROM vw_indicador_atual WHERE vr_pib_per_capita IS NOT NULL
),
abst AS (
    SELECT cp.cd_municipio_tse, e.nr_ano_eleicao, SUM(cp.qt_abstencoes) / SUM(cp.qt_aptos) AS tx_abstencao
    FROM comparecimento cp JOIN eleicao e ON e.id_eleicao = cp.id_eleicao
    WHERE cp.nr_turno = 1 AND ((e.nr_ano_eleicao = 2024 AND cp.cd_cargo = 11) OR (e.nr_ano_eleicao = 2022 AND cp.cd_cargo = 3))
    GROUP BY 1, 2
),
mais_votado AS (
    SELECT * FROM (
        SELECT vc.cd_municipio_tse, e.nr_ano_eleicao, p.sg_partido, pa.ds_espectro,
               ROW_NUMBER() OVER (PARTITION BY vc.cd_municipio_tse, e.nr_ano_eleicao ORDER BY SUM(vc.qt_votos_nominais) DESC, p.sg_partido) AS rk
        FROM votacao_candidato vc
        JOIN candidatura c ON c.id_candidatura = vc.id_candidatura
        JOIN eleicao e     ON e.id_eleicao     = c.id_eleicao
        JOIN partido p     ON p.id_partido     = c.id_partido
        LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
        WHERE vc.nr_turno = 1 AND ((e.nr_ano_eleicao = 2024 AND c.cd_cargo = 11) OR (e.nr_ano_eleicao = 2022 AND c.cd_cargo = 3))
        GROUP BY vc.cd_municipio_tse, e.nr_ano_eleicao, p.sg_partido, pa.ds_espectro
    ) x WHERE rk = 1
)
SELECT mv.nr_ano_eleicao, i.ds_porte, i.ds_renda, COUNT(*) AS qt_municipios,
       ROUND(AVG(i.vr_pib_per_capita), 0) AS vr_pib_pc_medio, ROUND(100 * AVG(a.tx_abstencao), 2) AS pc_abstencao_media,
       ROUND(100 * AVG(CAST(mv.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') AS INT)), 1) AS pc_mun_direita,
       ROUND(100 * AVG(CAST(mv.ds_espectro = 'CENTRO' AS INT)), 1) AS pc_mun_centro,
       ROUND(100 * AVG(CAST(mv.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') AS INT)), 1) AS pc_mun_esquerda
FROM mais_votado mv
JOIN ind  i ON i.cd_municipio_tse = mv.cd_municipio_tse
JOIN abst a ON a.cd_municipio_tse = mv.cd_municipio_tse AND a.nr_ano_eleicao = mv.nr_ano_eleicao
GROUP BY mv.nr_ano_eleicao, i.ds_porte, i.ds_renda ORDER BY mv.nr_ano_eleicao, i.ds_porte, i.ds_renda;

-- @q3b | IDHM do município (Atlas, Censo 2010) x campo político: nota média dos votos (−1 esquerda, +1 direita) e lado do mais votado
WITH ind AS (
    SELECT cd_municipio_tse, vr_idhm, vr_renda_per_capita,
           -- faixas do PNUD; "muito baixo" (abaixo de 0,500) tem só 32 cidades e entra junto com "baixo"
           CASE WHEN vr_idhm < 0.6 THEN '1 baixo ou muito baixo (abaixo de 0,600)' WHEN vr_idhm < 0.7 THEN '2 médio (0,600 a 0,699)'
                WHEN vr_idhm < 0.8 THEN '3 alto (0,700 a 0,799)' ELSE '4 muito alto (0,800 ou mais)' END AS ds_faixa_idhm
    FROM vw_indicador_atual WHERE vr_idhm IS NOT NULL
),
votos AS (
    -- votos de cada partido em cada cidade (nominais + legenda), 1º turno, com a nota do partido naquela eleição
    SELECT vp.cd_municipio_tse, e.nr_ano_eleicao, vp.cd_cargo, vp.id_partido, pa.vr_nota, pa.ds_espectro,
           SUM(vp.qt_votos_nominais + COALESCE(vp.qt_votos_legenda, 0)) AS qt_votos
    FROM votacao_partido vp
    JOIN eleicao e ON e.id_eleicao = vp.id_eleicao
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = vp.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    WHERE vp.nr_turno = 1 AND ((e.nr_ano_eleicao = 2022 AND vp.cd_cargo IN (1, 3)) OR (e.nr_ano_eleicao = 2024 AND vp.cd_cargo = 11))
    GROUP BY 1, 2, 3, 4, 5, 6
),
mun AS (   -- nota média da cidade: Σ (votos do partido × nota do partido) ÷ Σ votos dos partidos com nota
    SELECT cd_municipio_tse, nr_ano_eleicao, cd_cargo,
           SUM(qt_votos * vr_nota) / NULLIF(SUM(CASE WHEN vr_nota IS NOT NULL THEN qt_votos END), 0) AS vr_nota_cidade,
           ARG_MAX(ds_espectro, qt_votos) AS ds_espectro_1o
    FROM votos GROUP BY 1, 2, 3
)
SELECT m.nr_ano_eleicao, cg.ds_cargo, i.ds_faixa_idhm, COUNT(*) AS qt_municipios, ROUND(AVG(i.vr_idhm), 3) AS vr_idhm_medio,
       ROUND(AVG(i.vr_renda_per_capita), 0) AS vr_renda_pc_media, ROUND(AVG(m.vr_nota_cidade), 3) AS vr_nota_media,
       ROUND(100 * AVG(CAST(m.ds_espectro_1o IN ('ESQUERDA', 'CENTRO-ESQUERDA') AS INT)), 1) AS pc_mun_esquerda,
       ROUND(100 * AVG(CAST(m.ds_espectro_1o = 'CENTRO' AS INT)), 1) AS pc_mun_centro,
       ROUND(100 * AVG(CAST(m.ds_espectro_1o IN ('DIREITA', 'CENTRO-DIREITA') AS INT)), 1) AS pc_mun_direita
FROM mun m JOIN ind i ON i.cd_municipio_tse = m.cd_municipio_tse JOIN cargo cg ON cg.cd_cargo = m.cd_cargo
GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- @q3c | O que separa mais o voto: correlação entre a nota média da cidade e o IDHM, a renda (Atlas 2010) e o PIB por habitante (IBGE 2021)
WITH votos AS (
    -- votos de cada partido em cada cidade (nominais + legenda), 1º turno, com a nota do partido naquela eleição
    SELECT vp.cd_municipio_tse, e.nr_ano_eleicao, vp.cd_cargo, vp.id_partido, pa.vr_nota, pa.ds_espectro,
           SUM(vp.qt_votos_nominais + COALESCE(vp.qt_votos_legenda, 0)) AS qt_votos
    FROM votacao_partido vp
    JOIN eleicao e ON e.id_eleicao = vp.id_eleicao
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = vp.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    WHERE vp.nr_turno = 1 AND ((e.nr_ano_eleicao IN (2018, 2022) AND vp.cd_cargo IN (1, 3)) OR (e.nr_ano_eleicao IN (2020, 2024) AND vp.cd_cargo = 11))
    GROUP BY 1, 2, 3, 4, 5, 6
),
mun AS (
    SELECT cd_municipio_tse, nr_ano_eleicao, cd_cargo,
           SUM(qt_votos * vr_nota) / NULLIF(SUM(CASE WHEN vr_nota IS NOT NULL THEN qt_votos END), 0) AS vr_nota_cidade
    FROM votos GROUP BY 1, 2, 3
)
SELECT m.nr_ano_eleicao, cg.ds_cargo, COUNT(*) AS qt_municipios,
       ROUND(CORR(m.vr_nota_cidade, i.vr_idhm), 3) AS r_idhm,
       ROUND(CORR(m.vr_nota_cidade, i.vr_idhm_educacao), 3) AS r_idhm_educacao,
       ROUND(CORR(m.vr_nota_cidade, LN(i.vr_renda_per_capita)), 3) AS r_renda_per_capita,
       ROUND(CORR(m.vr_nota_cidade, LN(i.vr_pib_per_capita)), 3) AS r_pib_per_capita,
       ROUND(CORR(m.vr_nota_cidade, LN(i.qt_populacao)), 3) AS r_populacao
FROM mun m JOIN vw_indicador_atual i ON i.cd_municipio_tse = m.cd_municipio_tse JOIN cargo cg ON cg.cd_cargo = m.cd_cargo
WHERE i.vr_idhm IS NOT NULL AND i.vr_pib_per_capita > 0 AND m.vr_nota_cidade IS NOT NULL
GROUP BY 1, 2 ORDER BY 2, 1;

-- @q4 | Grau de instrução do candidato x tamanho do município (2024, prefeito e vereador)
SELECT CASE WHEN ia.qt_populacao < 20000 THEN '1 pequeno (até 20 mil hab.)' WHEN ia.qt_populacao < 100000 THEN '2 médio (20 a 100 mil)' ELSE '3 grande (mais de 100 mil)' END AS ds_porte,
       gi.nr_ordem, gi.ds_grau_instrucao, COUNT(*) AS qt_candidatos, COUNT_IF(st.fl_eleito) AS qt_eleitos,
       ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY ds_porte), 2) AS pc_candidatos_no_porte,
       ROUND(100 * COUNT_IF(st.fl_eleito) / SUM(COUNT_IF(st.fl_eleito)) OVER (PARTITION BY ds_porte), 2) AS pc_eleitos_no_porte
FROM candidatura c
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
JOIN grau_instrucao gi ON gi.cd_grau_instrucao = c.cd_grau_instrucao
JOIN vw_indicador_atual ia ON ia.cd_municipio_tse = c.cd_municipio_tse
LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
WHERE e.nr_ano_eleicao = 2024 AND c.cd_cargo IN (11, 13) AND gi.nr_ordem > 0
GROUP BY ds_porte, gi.nr_ordem, gi.ds_grau_instrucao ORDER BY ds_porte, gi.nr_ordem;

-- @q4b | Escolaridade da cidade x escolaridade dos eleitos (2024): cidades em cinco grupos pelo IDHM Educação (Atlas, Censo 2010)
WITH cid AS (
    SELECT a.cd_municipio_tse, a.vr_idhm_educacao, a.pc_superior_25m, el.pc_superior AS pc_eleitores_superior,
           NTILE(5) OVER (ORDER BY a.vr_idhm_educacao) AS nr_quintil
    FROM vw_indicador_atual a
    JOIN vw_eleitorado_municipio el ON el.cd_municipio_tse = a.cd_municipio_tse AND el.nr_ano_eleicao = 2024
    WHERE a.vr_idhm_educacao IS NOT NULL
),
cand AS (   -- por cidade e cargo: candidatos e eleitos, e quantos de cada com curso superior completo
    SELECT c.cd_municipio_tse, cg.ds_cargo, COUNT(*) AS qt_candidatos, COUNT_IF(c.cd_grau_instrucao = 8) AS qt_candidatos_superior,
           COUNT_IF(st.fl_eleito) AS qt_eleitos, COUNT_IF(st.fl_eleito AND c.cd_grau_instrucao = 8) AS qt_eleitos_superior
    FROM candidatura c
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN cargo cg  ON cg.cd_cargo = c.cd_cargo
    LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE e.nr_ano_eleicao = 2024 AND c.cd_cargo IN (11, 13) AND c.cd_grau_instrucao BETWEEN 1 AND 8
    GROUP BY 1, 2
)
SELECT ca.ds_cargo, ci.nr_quintil, COUNT(*) AS qt_municipios,
       ROUND(MIN(ci.vr_idhm_educacao), 3) AS vr_idhm_e_min, ROUND(MAX(ci.vr_idhm_educacao), 3) AS vr_idhm_e_max,
       ROUND(AVG(ci.pc_superior_25m), 1) AS pc_adultos_superior_2010, ROUND(AVG(ci.pc_eleitores_superior), 1) AS pc_eleitores_superior_2024,
       ROUND(100 * SUM(ca.qt_candidatos_superior) / SUM(ca.qt_candidatos), 1) AS pc_candidatos_superior,
       ROUND(100 * SUM(ca.qt_eleitos_superior) / NULLIF(SUM(ca.qt_eleitos), 0), 1) AS pc_eleitos_superior
FROM cid ci JOIN cand ca ON ca.cd_municipio_tse = ci.cd_municipio_tse
GROUP BY 1, 2 ORDER BY 1, 2;

-- @q4c | Correlação, cidade a cidade, entre a escolaridade da população e a dos vereadores eleitos (2024)
WITH ver AS (
    SELECT c.cd_municipio_tse, 100.0 * COUNT_IF(c.cd_grau_instrucao = 8) / COUNT(*) AS pc_eleitos_superior
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE e.nr_ano_eleicao = 2024 AND c.cd_cargo = 13 AND st.fl_eleito AND c.cd_grau_instrucao BETWEEN 1 AND 8
    GROUP BY 1
)
SELECT COUNT(*) AS qt_municipios,
       ROUND(CORR(v.pc_eleitos_superior, a.vr_idhm_educacao), 3) AS r_idhm_educacao,
       ROUND(CORR(v.pc_eleitos_superior, a.pc_superior_25m), 3) AS r_adultos_superior_2010,
       ROUND(CORR(v.pc_eleitos_superior, el.pc_superior), 3) AS r_eleitores_superior_2024,
       ROUND(CORR(v.pc_eleitos_superior, a.vr_idhm), 3) AS r_idhm,
       ROUND(CORR(v.pc_eleitos_superior, LN(a.qt_populacao)), 3) AS r_populacao
FROM ver v
JOIN vw_indicador_atual a ON a.cd_municipio_tse = v.cd_municipio_tse
JOIN vw_eleitorado_municipio el ON el.cd_municipio_tse = v.cd_municipio_tse AND el.nr_ano_eleicao = 2024
WHERE a.vr_idhm_educacao IS NOT NULL;

-- @q5 | Voto de legenda (só no número do partido) nos cargos proporcionais, 2000 a 2026
SELECT e.nr_ano_eleicao, cg.ds_cargo, SUM(vp.qt_votos_legenda) AS qt_votos_legenda, SUM(vp.qt_votos_nominais) AS qt_votos_nominais,
       ROUND(100 * SUM(vp.qt_votos_legenda) / NULLIF(SUM(vp.qt_votos_legenda + vp.qt_votos_nominais), 0), 2) AS pc_legenda
FROM votacao_partido vp JOIN eleicao e ON e.id_eleicao = vp.id_eleicao JOIN cargo cg ON cg.cd_cargo = vp.cd_cargo
WHERE vp.nr_turno = 1 AND vp.cd_cargo IN (6, 7, 13) AND vp.qt_votos_legenda IS NOT NULL
GROUP BY e.nr_ano_eleicao, cg.ds_cargo
HAVING SUM(vp.qt_votos_legenda) > 0   -- antes de 2000 o TSE não separa a legenda (vem zerada)
ORDER BY cg.ds_cargo, e.nr_ano_eleicao;

-- @q5b | Quem ainda vive de legenda: deputado federal 2022, partidos com mais de 500 mil votos
SELECT p.sg_partido, pa.ds_espectro, SUM(vp.qt_votos_legenda) AS qt_votos_legenda, SUM(vp.qt_votos_legenda + vp.qt_votos_nominais) AS qt_votos_total,
       ROUND(100 * SUM(vp.qt_votos_legenda) / SUM(vp.qt_votos_legenda + vp.qt_votos_nominais), 2) AS pc_legenda
FROM votacao_partido vp JOIN eleicao e ON e.id_eleicao = vp.id_eleicao JOIN partido p ON p.id_partido = vp.id_partido
LEFT JOIN vw_partido_ano pa ON pa.id_partido = vp.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
WHERE e.nr_ano_eleicao = 2022 AND vp.nr_turno = 1 AND vp.cd_cargo = 6
GROUP BY p.sg_partido, pa.ds_espectro HAVING SUM(vp.qt_votos_legenda + vp.qt_votos_nominais) > 500000
ORDER BY pc_legenda DESC;

-- @q6 | Planos de governo para presidente (2018, 2022, 2026): parte dos planos que cita cada tema, por bloco
WITH pl AS (
    SELECT e.nr_ano_eleicao, c.nm_urna, p.sg_partido,
           CASE WHEN pa.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') THEN 'esquerda' WHEN pa.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') THEN 'direita' ELSE 'centro' END AS ds_bloco,
           lower(strip_accents(pg.tx_proposta)) AS tx
    FROM proposta_governo pg JOIN candidatura c ON c.id_candidatura = pg.id_candidatura
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN partido p ON p.id_partido = c.id_partido
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    WHERE c.cd_cargo = 1
)
SELECT ds_bloco, COUNT(*) AS qt_planos,
       ROUND(100 * AVG(CAST(tx LIKE '%seguranca publica%' AS INT)), 0) AS pc_seguranca,
       ROUND(100 * AVG(CAST(tx LIKE '%desigualdade%' AS INT)), 0)       AS pc_desigualdade,
       ROUND(100 * AVG(CAST(tx LIKE '%privatiza%' AS INT)), 0)          AS pc_privatizacao,
       ROUND(100 * AVG(CAST(tx LIKE '%reforma agraria%' AS INT)), 0)    AS pc_reforma_agraria,
       ROUND(100 * AVG(CAST(tx LIKE '%agronegocio%' AS INT)), 0)        AS pc_agronegocio,
       ROUND(100 * AVG(CAST(tx LIKE '%familia%' AS INT)), 0)            AS pc_familia,
       ROUND(100 * AVG(CAST(tx LIKE '%meio ambiente%' AS INT)), 0)      AS pc_meio_ambiente,
       ROUND(100 * AVG(CAST(tx LIKE '%racismo%' OR tx LIKE '%igualdade racial%' AS INT)), 0) AS pc_racial,
       ROUND(100 * AVG(CAST(tx LIKE '%armas%' OR tx LIKE '%armamento%' AS INT)), 0) AS pc_armas,
       ROUND(100 * AVG(CAST(tx LIKE '%imposto%' OR tx LIKE '%tribut%' AS INT)), 0)  AS pc_impostos
FROM pl GROUP BY ds_bloco ORDER BY ds_bloco;

-- @q6b | As palavras mais usadas em cada bloco (sem palavras curtas e comuns)
WITH pl AS (
    SELECT CASE WHEN pa.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') THEN 'esquerda' WHEN pa.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') THEN 'direita' ELSE 'centro' END AS ds_bloco,
           lower(strip_accents(pg.tx_proposta)) AS tx
    FROM proposta_governo pg JOIN candidatura c ON c.id_candidatura = pg.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    WHERE c.cd_cargo = 1
),
palavras AS (SELECT ds_bloco, unnest(regexp_extract_all(tx, '[a-z]{6,}')) AS palavra FROM pl),
cont AS (
    SELECT ds_bloco, palavra, COUNT(*) AS qt FROM palavras
    WHERE palavra NOT IN ('governo','brasil','brasileiro','brasileira','brasileiros','tambem','programa','politica','politicas','publica','publicas','publico','publicos',
                          'nacional','sistema','desenvolvimento','proposta','propostas','diretrizes','plano','partir','atraves','sociedade','federal','estado','estados',
                          'quando','contra','sobre','outros','outras','grande','grandes','mesmo','maior','forma','acoes','medidas','processo','pessoas','paises','sempre',
                          'dentro','apenas','enquanto','pagina','capitulo','objetivo','objetivos','criacao','garantir','promover','ampliar','fortalecer','implementar')
    GROUP BY 1, 2
)
SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY ds_bloco ORDER BY qt DESC) AS rk FROM cont) WHERE rk <= 25 ORDER BY ds_bloco, rk;

-- @q6c | Nuvem de palavras de cada partido: as palavras mais usadas nos planos de governo dos seus candidatos a presidente, governador e prefeito (2018 a 2026)
WITH pp AS (
    SELECT p.sg_partido, w.palavra, mode(w.ds_palavra) AS ds_palavra, SUM(w.qt) AS qt, COUNT(DISTINCT w.id_candidatura) AS qt_planos_com_palavra
    FROM proposta_palavra w JOIN candidatura c ON c.id_candidatura = w.id_candidatura JOIN partido p ON p.id_partido = c.id_partido
    GROUP BY 1, 2
),
tot AS (SELECT p.sg_partido, COUNT(DISTINCT w.id_candidatura) AS qt_planos, SUM(w.qt) AS qt_palavras
        FROM proposta_palavra w JOIN candidatura c ON c.id_candidatura = w.id_candidatura JOIN partido p ON p.id_partido = c.id_partido GROUP BY 1),
geral AS (SELECT palavra, SUM(qt) AS qt FROM proposta_palavra GROUP BY 1)
SELECT pp.sg_partido, t.qt_planos, pp.palavra, pp.ds_palavra, pp.qt, pp.qt_planos_com_palavra,
       -- destaque: quantas vezes a palavra é mais usada pelo partido do que por todos os partidos juntos (1 = igual)
       ROUND((pp.qt / t.qt_palavras) / (g.qt / (SELECT SUM(qt) FROM proposta_palavra)), 2) AS vr_destaque,
       (SELECT pa.vr_nota FROM vw_partido_ano pa JOIN partido p2 ON p2.id_partido = pa.id_partido WHERE p2.sg_partido = pp.sg_partido AND pa.vr_nota IS NOT NULL
        ORDER BY pa.nr_ano_eleicao DESC LIMIT 1) AS vr_nota_partido   -- a nota mais recente do partido, para a cor da nuvem
FROM pp JOIN tot t ON t.sg_partido = pp.sg_partido JOIN geral g ON g.palavra = pp.palavra
WHERE t.qt_planos >= 30
QUALIFY ROW_NUMBER() OVER (PARTITION BY pp.sg_partido ORDER BY pp.qt DESC) <= 40
ORDER BY t.qt_planos DESC, pp.sg_partido, pp.qt DESC;

-- @q6d | As palavras de cada campo político, cargo a cargo: esquerda, centro e direita (planos de presidente, governador e prefeito)
WITH b AS (
    SELECT cg.ds_cargo, CASE WHEN pa.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') THEN 'esquerda' WHEN pa.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') THEN 'direita'
                             WHEN pa.ds_espectro = 'CENTRO' THEN 'centro' END AS ds_bloco, w.id_candidatura, w.palavra, w.ds_palavra, w.qt
    FROM proposta_palavra w JOIN candidatura c ON c.id_candidatura = w.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
    JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
),
pb AS (SELECT ds_cargo, ds_bloco, palavra, mode(ds_palavra) AS ds_palavra, SUM(qt) AS qt, COUNT(DISTINCT id_candidatura) AS qt_planos_com_palavra FROM b WHERE ds_bloco IS NOT NULL GROUP BY 1, 2, 3),
tb AS (SELECT ds_cargo, ds_bloco, COUNT(DISTINCT id_candidatura) AS qt_planos, SUM(qt) AS qt_palavras FROM b WHERE ds_bloco IS NOT NULL GROUP BY 1, 2),
tc AS (SELECT ds_cargo, palavra, SUM(qt) AS qt FROM b WHERE ds_bloco IS NOT NULL GROUP BY 1, 2),
tcc AS (SELECT ds_cargo, SUM(qt) AS qt FROM b WHERE ds_bloco IS NOT NULL GROUP BY 1)
SELECT pb.ds_cargo, pb.ds_bloco, tb.qt_planos, pb.palavra, pb.ds_palavra, pb.qt, pb.qt_planos_com_palavra,
       ROUND((pb.qt / tb.qt_palavras) / (tc.qt / tcc.qt), 2) AS vr_destaque
FROM pb JOIN tb USING (ds_cargo, ds_bloco) JOIN tc USING (ds_cargo, palavra) JOIN tcc USING (ds_cargo)
QUALIFY ROW_NUMBER() OVER (PARTITION BY pb.ds_cargo, pb.ds_bloco ORDER BY pb.qt DESC) <= 40
ORDER BY pb.ds_cargo, pb.ds_bloco, pb.qt DESC;

-- @q6e | As palavras típicas de cada campo político, cargo a cargo: as que ele usa bem mais que a média do cargo (presentes em pelo menos 3% dos seus planos)
WITH b AS (
    SELECT cg.ds_cargo, CASE WHEN pa.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') THEN 'esquerda' WHEN pa.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') THEN 'direita'
                             WHEN pa.ds_espectro = 'CENTRO' THEN 'centro' END AS ds_bloco, w.id_candidatura, w.palavra, w.ds_palavra, w.qt
    FROM proposta_palavra w JOIN candidatura c ON c.id_candidatura = w.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
    JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
),
pb AS (SELECT ds_cargo, ds_bloco, palavra, mode(ds_palavra) AS ds_palavra, SUM(qt) AS qt, COUNT(DISTINCT id_candidatura) AS qt_planos_com_palavra FROM b WHERE ds_bloco IS NOT NULL GROUP BY 1, 2, 3),
tb AS (SELECT ds_cargo, ds_bloco, COUNT(DISTINCT id_candidatura) AS qt_planos, SUM(qt) AS qt_palavras FROM b WHERE ds_bloco IS NOT NULL GROUP BY 1, 2),
tc AS (SELECT ds_cargo, palavra, SUM(qt) AS qt FROM b WHERE ds_bloco IS NOT NULL GROUP BY 1, 2),
tcc AS (SELECT ds_cargo, SUM(qt) AS qt FROM b WHERE ds_bloco IS NOT NULL GROUP BY 1)
SELECT pb.ds_cargo, pb.ds_bloco, tb.qt_planos, pb.palavra, pb.ds_palavra, pb.qt, pb.qt_planos_com_palavra,
       ROUND((pb.qt / tb.qt_palavras) / (tc.qt / tcc.qt), 2) AS vr_destaque
FROM pb JOIN tb USING (ds_cargo, ds_bloco) JOIN tc USING (ds_cargo, palavra) JOIN tcc USING (ds_cargo)
WHERE pb.qt_planos_com_palavra >= 0.03 * tb.qt_planos
QUALIFY ROW_NUMBER() OVER (PARTITION BY pb.ds_cargo, pb.ds_bloco ORDER BY (pb.qt / tb.qt_palavras) / (tc.qt / tcc.qt) DESC) <= 30
ORDER BY pb.ds_cargo, pb.ds_bloco, vr_destaque DESC;

-- @q7 | Jovens (até 29 anos na posse) x mais velhos: taxa de sucesso por ano
SELECT r.nr_ano_eleicao, CASE WHEN r.nr_idade_posse <= 29 THEN 'jovem' ELSE 'não jovem' END AS ds_faixa,
       COUNT(*) AS qt_candidatos, COUNT_IF(r.fl_eleito) AS qt_eleitos, ROUND(100 * AVG(CAST(r.fl_eleito AS INT)), 2) AS pc_sucesso
FROM vw_candidatura_resumo r
WHERE r.nr_ano_eleicao BETWEEN 2002 AND 2024 AND r.nr_idade_posse IS NOT NULL AND r.cd_cargo IN (6, 7, 11, 13)
GROUP BY r.nr_ano_eleicao, ds_faixa ORDER BY r.nr_ano_eleicao, ds_faixa;

-- @q7b | Jovens por espectro do partido (2018 a 2024, somados)
SELECT COALESCE(r.ds_espectro, 'NÃO CLASSIFICADO') AS ds_espectro, COUNT(*) AS qt_candidatos,
       ROUND(100 * AVG(CAST(r.nr_idade_posse <= 29 AS INT)), 2) AS pc_jovens_candidatos,
       ROUND(100 * COUNT_IF(r.nr_idade_posse <= 29 AND r.fl_eleito) / NULLIF(COUNT_IF(r.fl_eleito), 0), 2) AS pc_jovens_eleitos
FROM vw_candidatura_resumo r
WHERE r.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND r.nr_idade_posse IS NOT NULL AND r.cd_cargo IN (6, 7, 11, 13)
GROUP BY 1 ORDER BY 1;

-- @q7c | Jovem vota em jovem? Cidades em cinco grupos pela parte do eleitorado com até 29 anos x idade dos vereadores eleitos (2020 e 2024)
WITH el AS (
    SELECT nr_ano_eleicao, cd_municipio_tse, pc_ate_29, vr_idade_media,
           NTILE(5) OVER (PARTITION BY nr_ano_eleicao ORDER BY pc_ate_29) AS nr_quintil
    FROM vw_eleitorado_municipio WHERE nr_ano_eleicao IN (2020, 2024) AND pc_ate_29 IS NOT NULL
),
ver AS (
    SELECT e.nr_ano_eleicao, c.cd_municipio_tse, COUNT(*) AS qt_candidatos, COUNT_IF(c.nr_idade_posse <= 29) AS qt_candidatos_jovens,
           COUNT_IF(st.fl_eleito) AS qt_eleitos, COUNT_IF(st.fl_eleito AND c.nr_idade_posse <= 29) AS qt_eleitos_jovens,
           SUM(CASE WHEN st.fl_eleito THEN c.nr_idade_posse END) AS soma_idade_eleitos
    FROM candidatura c
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE e.nr_ano_eleicao IN (2020, 2024) AND c.cd_cargo = 13 AND c.nr_idade_posse IS NOT NULL
    GROUP BY 1, 2
)
SELECT el.nr_ano_eleicao, el.nr_quintil, COUNT(*) AS qt_municipios,
       ROUND(MIN(el.pc_ate_29), 1) AS pc_ate_29_min, ROUND(MAX(el.pc_ate_29), 1) AS pc_ate_29_max,
       ROUND(AVG(el.pc_ate_29), 1) AS pc_eleitorado_ate_29, ROUND(AVG(el.vr_idade_media), 1) AS vr_idade_media_eleitorado,
       ROUND(100 * SUM(v.qt_candidatos_jovens) / SUM(v.qt_candidatos), 1) AS pc_candidatos_ate_29,
       ROUND(100 * SUM(v.qt_eleitos_jovens) / SUM(v.qt_eleitos), 1) AS pc_eleitos_ate_29,
       ROUND(SUM(v.soma_idade_eleitos) / SUM(v.qt_eleitos), 1) AS vr_idade_media_eleitos,
       ROUND(100 * SUM(v.qt_eleitos_jovens) / SUM(v.qt_candidatos_jovens), 1) AS pc_sucesso_jovens
FROM el JOIN ver v ON v.cd_municipio_tse = el.cd_municipio_tse AND v.nr_ano_eleicao = el.nr_ano_eleicao
GROUP BY 1, 2 ORDER BY 1, 2;

-- @q7d | Idade de quem vota x idade de quem é eleito, no Brasil, por cargo (2018 a 2024)
WITH el AS (
    SELECT ep.nr_ano_eleicao, SUM(ep.qt_eleitores * (ep.nr_idade_min + ep.nr_idade_max) / 2.0) / SUM(ep.qt_eleitores) AS vr_idade_media,
           100.0 * SUM(CASE WHEN ep.nr_idade_max <= 29 THEN ep.qt_eleitores ELSE 0 END) / SUM(ep.qt_eleitores) AS pc_ate_29,
           100.0 * SUM(CASE WHEN ep.nr_idade_min >= 60 THEN ep.qt_eleitores ELSE 0 END) / SUM(ep.qt_eleitores) AS pc_60_mais
    FROM eleitorado_perfil ep JOIN municipio m ON m.cd_municipio_tse = ep.cd_municipio_tse   -- só quem vota no Brasil
    WHERE ep.nr_idade_min IS NOT NULL GROUP BY 1
)
SELECT e.nr_ano_eleicao, cg.ds_cargo, COUNT_IF(st.fl_eleito) AS qt_eleitos,
       ROUND(el.vr_idade_media, 1) AS vr_idade_media_eleitorado, ROUND(AVG(c.nr_idade_posse), 1) AS vr_idade_media_candidatos,
       ROUND(AVG(CASE WHEN st.fl_eleito THEN c.nr_idade_posse END), 1) AS vr_idade_media_eleitos,
       ROUND(el.pc_ate_29, 1) AS pc_eleitorado_ate_29, ROUND(100 * COUNT_IF(st.fl_eleito AND c.nr_idade_posse <= 29) / COUNT_IF(st.fl_eleito), 1) AS pc_eleitos_ate_29,
       ROUND(el.pc_60_mais, 1) AS pc_eleitorado_60_mais, ROUND(100 * COUNT_IF(st.fl_eleito AND c.nr_idade_posse >= 60) / COUNT_IF(st.fl_eleito), 1) AS pc_eleitos_60_mais
FROM candidatura c
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
JOIN cargo cg  ON cg.cd_cargo = c.cd_cargo
JOIN el ON el.nr_ano_eleicao = e.nr_ano_eleicao
LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
WHERE e.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND c.cd_cargo IN (3, 5, 6, 7, 11, 13) AND c.nr_idade_posse IS NOT NULL
GROUP BY 1, 2, el.vr_idade_media, el.pc_ate_29, el.pc_60_mais ORDER BY 2, 1;

-- @q8 | Dinheiro de empresas (pessoa jurídica) na receita dos candidatos, antes e depois da proibição (2015)
SELECT e.nr_ano_eleicao, ROUND(SUM(CASE WHEN rc.tp_doador = 'PJ' THEN rc.vr_receita ELSE 0 END), 0) AS vr_doacao_pj,
       ROUND(SUM(rc.vr_receita), 0) AS vr_receita_total,
       ROUND(100 * SUM(CASE WHEN rc.tp_doador = 'PJ' THEN rc.vr_receita ELSE 0 END) / SUM(rc.vr_receita), 2) AS pc_pj
FROM receita rc JOIN candidatura c ON c.id_candidatura = rc.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
WHERE c.cd_cargo <> 1
GROUP BY e.nr_ano_eleicao ORDER BY e.nr_ano_eleicao;

-- @q8b | Doação de empresas por espectro do partido (2010, 2012 e 2014)
SELECT e.nr_ano_eleicao, COALESCE(pa.ds_espectro, 'NÃO CLASSIFICADO') AS ds_espectro,
       ROUND(SUM(CASE WHEN rc.tp_doador = 'PJ' THEN rc.vr_receita ELSE 0 END), 0) AS vr_doacao_pj, ROUND(SUM(rc.vr_receita), 0) AS vr_receita_total,
       ROUND(100 * SUM(CASE WHEN rc.tp_doador = 'PJ' THEN rc.vr_receita ELSE 0 END) / NULLIF(SUM(rc.vr_receita), 0), 2) AS pc_pj
FROM receita rc JOIN candidatura c ON c.id_candidatura = rc.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
WHERE e.nr_ano_eleicao <= 2014 AND c.cd_cargo <> 1
GROUP BY 1, 2 ORDER BY 1, vr_doacao_pj DESC;

-- @q9 | Viés político na linha do tempo: votos e municípios por lado (esquerda, centro, direita; 1º turno; presidente nas gerais, prefeito nas municipais)
WITH votos AS (
    SELECT vc.cd_municipio_tse, e.nr_ano_eleicao, e.tp_abrangencia,
           SUM(CASE WHEN pa.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') THEN vc.qt_votos_nominais ELSE 0 END) AS v_dir,
           SUM(CASE WHEN pa.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') THEN vc.qt_votos_nominais ELSE 0 END) AS v_esq,
           SUM(CASE WHEN pa.ds_espectro = 'CENTRO' THEN vc.qt_votos_nominais ELSE 0 END) AS v_cen,
           SUM(vc.qt_votos_nominais) AS v_tot
    FROM votacao_candidato vc
    JOIN candidatura c ON c.id_candidatura = vc.id_candidatura
    JOIN eleicao e     ON e.id_eleicao     = c.id_eleicao
    JOIN partido p     ON p.id_partido     = c.id_partido
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    JOIN municipio m   ON m.cd_municipio_tse = vc.cd_municipio_tse   -- só as cidades do Brasil (fora o voto no exterior)
    WHERE vc.nr_turno = 1 AND ((e.tp_abrangencia = 'MUNICIPAL' AND c.cd_cargo = 11) OR (e.tp_abrangencia = 'GERAL' AND c.cd_cargo = 1))
    GROUP BY 1, 2, 3
)
SELECT nr_ano_eleicao, tp_abrangencia, ROUND(100 * SUM(v_esq) / SUM(v_tot), 1) AS pc_votos_esquerda, ROUND(100 * SUM(v_cen) / SUM(v_tot), 1) AS pc_votos_centro,
       ROUND(100 * SUM(v_dir) / SUM(v_tot), 1) AS pc_votos_direita,
       COUNT_IF(v_esq > v_cen AND v_esq > v_dir) AS qt_mun_esquerda_na_frente, COUNT_IF(v_cen >= v_esq AND v_cen >= v_dir AND v_cen > 0) AS qt_mun_centro_na_frente,
       COUNT_IF(v_dir > v_esq AND v_dir > v_cen) AS qt_mun_direita_na_frente, COUNT(*) AS qt_municipios
FROM votos GROUP BY 1, 2 ORDER BY 1;

-- @q9b | Viés político na linha do tempo, cargo a cargo: nota média dos votos (Σ votos do partido × nota do partido ÷ Σ votos), 1º turno, 1994 a 2026
WITH votos AS (
    -- votos de cada partido em cada cidade (nominais + legenda), 1º turno, com a nota do partido naquela eleição
    SELECT vp.cd_municipio_tse, e.nr_ano_eleicao, CASE WHEN vp.cd_cargo = 8 THEN 7 ELSE vp.cd_cargo END AS cd_cargo, vp.id_partido, pa.vr_nota, pa.ds_espectro,
           SUM(vp.qt_votos_nominais + COALESCE(vp.qt_votos_legenda, 0)) AS qt_votos
    FROM votacao_partido vp
    JOIN eleicao e ON e.id_eleicao = vp.id_eleicao
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = vp.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    JOIN municipio m ON m.cd_municipio_tse = vp.cd_municipio_tse   -- só as cidades do Brasil (fora o voto no exterior)
    WHERE vp.nr_turno = 1 AND vp.cd_cargo IN (1, 3, 5, 6, 7, 8, 11, 13)
    GROUP BY 1, 2, 3, 4, 5, 6
),
mun AS (   -- a nota de cada cidade em cada eleição e cargo
    SELECT nr_ano_eleicao, cd_cargo, cd_municipio_tse, SUM(qt_votos) AS qt_votos,
           SUM(CASE WHEN vr_nota IS NOT NULL THEN qt_votos END) AS qt_votos_com_nota,
           SUM(qt_votos * vr_nota) / NULLIF(SUM(CASE WHEN vr_nota IS NOT NULL THEN qt_votos END), 0) AS vr_nota_cidade
    FROM votos GROUP BY 1, 2, 3
)
SELECT m.nr_ano_eleicao, cg.ds_cargo, m.cd_cargo,
       ROUND(SUM(m.vr_nota_cidade * m.qt_votos_com_nota) / SUM(m.qt_votos_com_nota), 3) AS vr_nota_brasil,
       ROUND(MEDIAN(m.vr_nota_cidade), 3) AS vr_nota_cidade_mediana,
       ROUND(100 * SUM(m.qt_votos_com_nota) / SUM(m.qt_votos), 1) AS pc_votos_com_nota,
       COUNT_IF(m.vr_nota_cidade < -0.25) AS qt_mun_esquerda, COUNT_IF(m.vr_nota_cidade BETWEEN -0.25 AND 0.25) AS qt_mun_centro,
       COUNT_IF(m.vr_nota_cidade > 0.25) AS qt_mun_direita, COUNT(*) AS qt_municipios
FROM mun m JOIN cargo cg ON cg.cd_cargo = m.cd_cargo
WHERE m.vr_nota_cidade IS NOT NULL
GROUP BY 1, 2, 3 ORDER BY 3, 1;

-- @q10 | Eleito x não eleito: dinheiro público (fundos) e privado, média por candidato
SELECT nr_ano_eleicao, ds_cargo, CASE WHEN fl_eleito THEN 'eleito' ELSE 'não eleito' END AS ds_resultado, COUNT(*) AS qt_candidatos,
       ROUND(AVG(vr_receita_publica), 2) AS vr_publico_medio, ROUND(AVG(vr_receita_privada), 2) AS vr_privado_medio,
       ROUND(100 * SUM(vr_receita_publica) / NULLIF(SUM(vr_receita_total), 0), 2) AS pc_publico
FROM vw_candidatura_resumo
WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND cd_cargo IN (6, 7, 11, 13)
GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- @q10b | Recursos públicos x sucesso eleitoral: taxa de sucesso pela faixa de dinheiro público recebido (fundos eleitoral e partidário)
WITH base AS (
    SELECT nr_ano_eleicao, ds_cargo, fl_eleito, vr_receita_publica,
           CASE WHEN vr_receita_publica = 0 THEN 0
                ELSE NTILE(5) OVER (PARTITION BY nr_ano_eleicao, cd_cargo, vr_receita_publica > 0 ORDER BY vr_receita_publica) END AS nr_faixa
    FROM vw_candidatura_resumo
    WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND cd_cargo IN (6, 7, 11, 13)
)
SELECT nr_ano_eleicao, ds_cargo, nr_faixa,
       CASE nr_faixa WHEN 0 THEN 'nenhum dinheiro público' WHEN 1 THEN '20% que receberam menos' WHEN 5 THEN '20% que receberam mais' ELSE nr_faixa || 'º grupo' END AS ds_faixa,
       COUNT(*) AS qt_candidatos, COUNT_IF(fl_eleito) AS qt_eleitos, ROUND(100 * AVG(CAST(fl_eleito AS INT)), 2) AS pc_taxa_sucesso,
       ROUND(AVG(vr_receita_publica), 0) AS vr_publico_medio
FROM base GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3;

-- @q11 | Onde o candidato gasta: categorias de despesa contratada, por ano
SELECT e.nr_ano_eleicao, d.ds_origem_despesa, COUNT(*) AS qt_lancamentos, ROUND(SUM(d.vr_despesa), 0) AS vr_total,
       ROUND(100 * SUM(d.vr_despesa) / SUM(SUM(d.vr_despesa)) OVER (PARTITION BY e.nr_ano_eleicao), 2) AS pc_ano
FROM despesa d JOIN candidatura c ON c.id_candidatura = d.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
WHERE e.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND c.cd_cargo <> 1
GROUP BY 1, 2 QUALIFY ROW_NUMBER() OVER (PARTITION BY e.nr_ano_eleicao ORDER BY SUM(d.vr_despesa) DESC) <= 12
ORDER BY 1, vr_total DESC;

-- @q11b | Onde cada cargo investe em propaganda: parte do gasto de campanha por tipo de despesa (view vw_despesa_tipo), 2018 a 2024
SELECT e.nr_ano_eleicao, cg.ds_cargo, t.nr_tipo, t.ds_tipo, t.fl_propaganda, ROUND(SUM(t.vr_despesa), 0) AS vr_total,
       ROUND(100 * SUM(t.vr_despesa) / SUM(SUM(t.vr_despesa)) OVER (PARTITION BY e.nr_ano_eleicao, cg.ds_cargo), 2) AS pc_cargo
FROM vw_despesa_tipo t JOIN candidatura c ON c.id_candidatura = t.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
WHERE e.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND c.cd_cargo IN (1, 3, 5, 6, 7, 11, 13)
GROUP BY 1, 2, 3, 4, 5 ORDER BY 1, 2, 3;

-- @q11c | Onde cada campo político investe em propaganda: parte do gasto de propaganda por tipo, esquerda, centro e direita (2018 a 2024)
WITH t AS (
    SELECT e.nr_ano_eleicao, CASE WHEN pa.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') THEN 'esquerda' WHEN pa.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') THEN 'direita'
                                  WHEN pa.ds_espectro = 'CENTRO' THEN 'centro' END AS ds_bloco, t.nr_tipo, t.ds_tipo, t.vr_despesa
    FROM vw_despesa_tipo t JOIN candidatura c ON c.id_candidatura = t.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    WHERE t.fl_propaganda AND e.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND c.cd_cargo IN (1, 3, 5, 6, 7, 11, 13)
)
SELECT nr_ano_eleicao, ds_bloco, nr_tipo, ds_tipo, ROUND(SUM(vr_despesa), 0) AS vr_total,
       ROUND(100 * SUM(vr_despesa) / SUM(SUM(vr_despesa)) OVER (PARTITION BY nr_ano_eleicao, ds_bloco), 2) AS pc_propaganda
FROM t WHERE ds_bloco IS NOT NULL GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3;

-- @q12 | Sobrevivência na carreira: dos eleitos no ano X, quantos se elegem de novo (qualquer cargo) 4 e 8 anos depois
WITH eleitos AS (
    SELECT DISTINCT c.id_pessoa, e.nr_ano_eleicao AS nr_ano, e.tp_abrangencia
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    JOIN pessoa ps ON ps.id_pessoa = c.id_pessoa
    WHERE st.fl_eleito AND c.cd_cargo IN (3, 5, 6, 7, 11, 13) AND ps.nr_titulo_eleitoral NOT LIKE 'SQ%'
)
SELECT a.nr_ano, a.tp_abrangencia, COUNT(*) AS qt_eleitos,
       ROUND(100 * AVG(CAST(b.id_pessoa IS NOT NULL AS INT)), 2) AS pc_eleito_de_novo_4_anos,
       CASE WHEN a.nr_ano + 8 <= 2026 THEN ROUND(100 * AVG(CAST(b8.id_pessoa IS NOT NULL AS INT)), 2) END AS pc_eleito_de_novo_8_anos  -- 2028 e 2030 ainda não aconteceram
FROM eleitos a
LEFT JOIN eleitos b  ON b.id_pessoa  = a.id_pessoa AND b.nr_ano  = a.nr_ano + 4
LEFT JOIN eleitos b8 ON b8.id_pessoa = a.id_pessoa AND b8.nr_ano = a.nr_ano + 8
WHERE a.nr_ano BETWEEN 1996 AND 2022
GROUP BY 1, 2 ORDER BY 1;

-- @q12b | Quantas eleições cada político ganhou entre 1994 e 2026 (pessoas ligadas pelo título de eleitor)
WITH p AS (
    SELECT c.id_pessoa, COUNT(*) AS qt_candidaturas, COUNT_IF(st.fl_eleito) AS qt_vitorias
    FROM candidatura c LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao JOIN pessoa ps ON ps.id_pessoa = c.id_pessoa
    WHERE c.cd_cargo IN (1, 3, 5, 6, 7, 11, 13) AND ps.nr_titulo_eleitoral NOT LIKE 'SQ%'
    GROUP BY 1
)
SELECT LEAST(qt_vitorias, 8) AS qt_vitorias, COUNT(*) AS qt_pessoas FROM p WHERE qt_vitorias > 0 GROUP BY 1 ORDER BY 1;

-- @q12c | Os políticos que mais venceram eleições (1994 a 2026)
SELECT ps.nm_pessoa, MIN(e.nr_ano_eleicao) AS nr_primeira_eleicao, MAX(e.nr_ano_eleicao) AS nr_ultima_eleicao, COUNT(*) AS qt_candidaturas,
       COUNT_IF(st.fl_eleito) AS qt_vitorias,
       string_agg(e.nr_ano_eleicao || ' ' || lower(cg.ds_cargo) || ' (' || pt.sg_partido || ')' || CASE WHEN st.fl_eleito THEN '' ELSE ' não eleito' END, ' → ' ORDER BY e.nr_ano_eleicao) AS ds_trajetoria
FROM pessoa ps JOIN candidatura c ON c.id_pessoa = ps.id_pessoa JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
JOIN partido pt ON pt.id_partido = c.id_partido LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
WHERE c.cd_cargo IN (1, 3, 5, 6, 7, 11, 13) AND ps.nr_titulo_eleitoral NOT LIKE 'SQ%'
GROUP BY ps.id_pessoa, ps.nm_pessoa ORDER BY qt_vitorias DESC, qt_candidaturas ASC LIMIT 10;

-- @q12d | Histórico eleitoral de um político (a consulta da ficha de cada um; exemplo: quem mais venceu eleições de 1994 a 2026)
WITH alvo AS (
    SELECT c.id_pessoa FROM candidatura c JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao JOIN pessoa ps ON ps.id_pessoa = c.id_pessoa
    WHERE st.fl_eleito AND c.cd_cargo IN (1, 3, 5, 6, 7, 11, 13) AND ps.nr_titulo_eleitoral NOT LIKE 'SQ%'
    GROUP BY 1 ORDER BY COUNT(*) DESC, MIN(c.id_candidatura) LIMIT 1
)
SELECT ps.nm_pessoa, e.nr_ano_eleicao, cg.ds_cargo, COALESCE(m.nm_municipio || '/' || m.sg_uf, c.sg_uf, 'Brasil') AS ds_lugar, c.nm_urna, pt.sg_partido,
       pa.vr_nota AS vr_nota_partido, pa.ds_espectro, st.ds_sit_tot_turno,
       (SELECT SUM(v.qt_votos_nominais) FROM votacao_candidato v WHERE v.id_candidatura = c.id_candidatura AND v.nr_turno = 1) AS qt_votos_1t,
       r.vr_receita_total, r.vr_receita_publica, r.vr_despesa_total, pt2.vr_patrimonio
FROM alvo JOIN pessoa ps ON ps.id_pessoa = alvo.id_pessoa
JOIN candidatura c ON c.id_pessoa = ps.id_pessoa JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
JOIN partido pt ON pt.id_partido = c.id_partido LEFT JOIN municipio m ON m.cd_municipio_tse = c.cd_municipio_tse
LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
LEFT JOIN vw_candidatura_resumo r ON r.id_candidatura = c.id_candidatura
LEFT JOIN vw_patrimonio_candidato pt2 ON pt2.id_candidatura = c.id_candidatura
ORDER BY e.nr_ano_eleicao, c.cd_cargo;

-- @q12e | Como os deputados federais votam: quanto cada bancada segue a orientação do próprio partido e a do governo (Plenário, votações de mérito, 2019 a 2026)
WITH v AS (
    SELECT vd.id_votacao, vd.id_deputado, vd.sg_partido, vd.ds_voto,
           CASE WHEN vc.dt_votacao < DATE '2023-01-01' THEN 'Bolsonaro (2019-2022)' ELSE 'Lula (2023-2026)' END AS ds_governo
    FROM voto_deputado vd JOIN votacao_camara vc ON vc.id_votacao = vd.id_votacao
    WHERE vc.fl_merito AND vc.sg_orgao = 'PLEN' AND vd.ds_voto IN ('Sim', 'Não', 'Obstrução')   -- obstrução conta como não
),
op AS (SELECT id_votacao, upper(strip_accents(sg_bancada)) AS sg, ANY_VALUE(ds_orientacao) AS o FROM orientacao_bancada
       WHERE ds_orientacao IN ('Sim', 'Não', 'Obstrução') GROUP BY 1, 2),
gov AS (SELECT id_votacao, ANY_VALUE(ds_orientacao) AS o FROM orientacao_bancada
        WHERE sg_bancada IN ('Governo', 'GOV.') AND ds_orientacao IN ('Sim', 'Não', 'Obstrução') GROUP BY 1)
SELECT v.ds_governo, v.sg_partido, COUNT(DISTINCT v.id_deputado) AS qt_deputados, COUNT(*) AS qt_votos,
       ROUND(100 * AVG(CASE WHEN op.o IS NOT NULL THEN CAST((v.ds_voto = 'Sim') = (op.o = 'Sim') AS INT) END), 1) AS pc_segue_partido,
       ROUND(100 * AVG(CASE WHEN gov.o IS NOT NULL THEN CAST((v.ds_voto = 'Sim') = (gov.o = 'Sim') AS INT) END), 1) AS pc_segue_governo
FROM v LEFT JOIN op ON op.id_votacao = v.id_votacao AND op.sg = upper(strip_accents(v.sg_partido))
LEFT JOIN gov ON gov.id_votacao = v.id_votacao
GROUP BY 1, 2 HAVING COUNT(DISTINCT v.id_deputado) >= 5
ORDER BY 1, pc_segue_governo DESC;

-- =====================================================================
-- Os 16 temas do enunciado (questoes_analise_dados_eleitorais): consultas acrescentadas em 16/11/2026
-- para os temas e as partes de tema que ainda não tinham resposta. Os ids começam com o número do tema (t1a = tema 1).
-- =====================================================================

-- @t1a | Tema 1: gasto de campanha por voto recebido, partido a partido, com a nota do partido (−1 esquerda, +1 direita)
WITH v AS (SELECT id_candidatura, SUM(qt_votos_nominais) AS qt_votos FROM votacao_candidato WHERE nr_turno = 1 GROUP BY 1),
b AS (
    SELECT r.nr_ano_eleicao, r.ds_cargo, r.sg_partido, pa.vr_nota, pa.ds_espectro, r.vr_despesa_total, COALESCE(v.qt_votos, 0) AS qt_votos, r.fl_eleito
    FROM vw_candidatura_resumo r JOIN candidatura c ON c.id_candidatura = r.id_candidatura
    LEFT JOIN v ON v.id_candidatura = r.id_candidatura
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = r.nr_ano_eleicao
    WHERE r.nr_ano_eleicao IN (2022, 2024) AND r.cd_cargo IN (6, 11, 13)
)
SELECT nr_ano_eleicao, ds_cargo, sg_partido, ROUND(ANY_VALUE(vr_nota), 2) AS vr_nota, ANY_VALUE(ds_espectro) AS ds_espectro,
       SUM(qt_votos) AS qt_votos, COUNT_IF(fl_eleito) AS qt_eleitos, ROUND(SUM(vr_despesa_total), 0) AS vr_gasto,
       ROUND(SUM(vr_despesa_total) / NULLIF(SUM(qt_votos), 0), 2) AS vr_gasto_por_voto
FROM b
WHERE (nr_ano_eleicao = 2022 AND ds_cargo = 'DEPUTADO FEDERAL') OR (nr_ano_eleicao = 2024 AND ds_cargo IN ('PREFEITO', 'VEREADOR'))
GROUP BY 1, 2, 3 HAVING COUNT_IF(fl_eleito) >= 5
ORDER BY 1, 2, vr_gasto_por_voto DESC;

-- @t1b | Tema 1: quanto o gasto acompanha os votos (correlação, candidato a candidato, em logaritmo) e o gasto por voto de eleitos e não eleitos, por campo político
WITH v AS (SELECT id_candidatura, SUM(qt_votos_nominais) AS qt_votos FROM votacao_candidato WHERE nr_turno = 1 GROUP BY 1),
b AS (
    SELECT r.nr_ano_eleicao, r.ds_cargo, r.cd_cargo,
           CASE WHEN r.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') THEN 'esquerda' WHEN r.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') THEN 'direita'
                WHEN r.ds_espectro = 'CENTRO' THEN 'centro' ELSE 'sem nota' END AS ds_bloco,
           r.vr_despesa_total, COALESCE(v.qt_votos, 0) AS qt_votos, r.fl_eleito
    FROM vw_candidatura_resumo r LEFT JOIN v ON v.id_candidatura = r.id_candidatura
    WHERE r.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND r.cd_cargo IN (3, 5, 6, 7, 11, 13)
)
SELECT nr_ano_eleicao, ds_cargo, cd_cargo, CASE WHEN GROUPING(ds_bloco) = 1 THEN 'todos' ELSE ds_bloco END AS ds_bloco, COUNT(*) AS qt_candidatos,
       ROUND(CORR(LN(1 + vr_despesa_total), LN(1 + qt_votos)), 2) AS r_gasto_votos,
       ROUND(SUM(vr_despesa_total) / NULLIF(SUM(qt_votos), 0), 2) AS vr_gasto_por_voto,
       ROUND(MEDIAN(CASE WHEN fl_eleito AND qt_votos > 0 THEN vr_despesa_total / qt_votos END), 2) AS vr_por_voto_eleito_mediano,
       ROUND(MEDIAN(CASE WHEN NOT fl_eleito AND qt_votos > 0 THEN vr_despesa_total / qt_votos END), 2) AS vr_por_voto_nao_eleito_mediano
FROM b GROUP BY GROUPING SETS ((nr_ano_eleicao, ds_cargo, cd_cargo, ds_bloco), (nr_ano_eleicao, ds_cargo, cd_cargo))
ORDER BY 1, 3, 4;

-- @t1c | Temas 1 e 4: escolaridade do candidato x chance de se eleger, gasto médio, gasto por voto e patrimônio (deputados 2022, prefeito e vereador 2024)
WITH v AS (SELECT id_candidatura, SUM(qt_votos_nominais) AS qt_votos FROM votacao_candidato WHERE nr_turno = 1 GROUP BY 1)
SELECT r.nr_ano_eleicao, r.ds_cargo, gi.nr_ordem, gi.ds_grau_instrucao, COUNT(*) AS qt_candidatos, COUNT_IF(r.fl_eleito) AS qt_eleitos,
       ROUND(100 * AVG(CAST(r.fl_eleito AS INT)), 2) AS pc_taxa_sucesso, ROUND(AVG(r.vr_despesa_total), 0) AS vr_gasto_medio,
       ROUND(SUM(r.vr_despesa_total) / NULLIF(SUM(v.qt_votos), 0), 2) AS vr_gasto_por_voto, ROUND(MEDIAN(pt.vr_patrimonio), 0) AS vr_patrimonio_mediano
FROM vw_candidatura_resumo r
JOIN candidatura c ON c.id_candidatura = r.id_candidatura
JOIN grau_instrucao gi ON gi.cd_grau_instrucao = c.cd_grau_instrucao
LEFT JOIN v ON v.id_candidatura = r.id_candidatura
LEFT JOIN vw_patrimonio_candidato pt ON pt.id_candidatura = r.id_candidatura
WHERE gi.nr_ordem > 0 AND r.nr_ano_eleicao IN (2022, 2024) AND r.cd_cargo IN (6, 7, 11, 13)
  AND (r.nr_ano_eleicao = 2022) = (r.cd_cargo IN (6, 7))
GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3;

-- @t4a | Tema 4: escolaridade do eleitorado x dos candidatos x dos eleitos, no Brasil (2022 e 2024)
WITH el AS (
    SELECT nr_ano_eleicao, SUM(qt_eleitores) FILTER (WHERE cd_grau_escolaridade BETWEEN 1 AND 8) AS tot,
           SUM(qt_eleitores) FILTER (WHERE cd_grau_escolaridade = 8) AS sup,
           SUM(qt_eleitores) FILTER (WHERE cd_grau_escolaridade BETWEEN 5 AND 7) AS med,
           SUM(qt_eleitores) FILTER (WHERE cd_grau_escolaridade BETWEEN 1 AND 4) AS fund
    FROM eleitorado_perfil WHERE nr_ano_eleicao IN (2022, 2024) GROUP BY 1
),
ca AS (
    SELECT e.nr_ano_eleicao, cg.ds_cargo, c.cd_cargo, COALESCE(st.fl_eleito, false) AS fl_eleito, c.cd_grau_instrucao AS g
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
    LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE e.nr_ano_eleicao IN (2022, 2024) AND c.cd_cargo IN (3, 5, 6, 7, 11, 13) AND c.cd_grau_instrucao BETWEEN 1 AND 8
),
grupos AS (SELECT nr_ano_eleicao, ds_cargo, cd_cargo, 'candidatos' AS ds_grupo, g FROM ca
           UNION ALL SELECT nr_ano_eleicao, ds_cargo, cd_cargo, 'eleitos', g FROM ca WHERE fl_eleito)
SELECT nr_ano_eleicao, 'ELEITORADO' AS ds_cargo, 0 AS cd_cargo, 'eleitores' AS ds_grupo,
       ROUND(100.0 * sup / tot, 1) AS pc_superior, ROUND(100.0 * med / tot, 1) AS pc_medio, ROUND(100.0 * fund / tot, 1) AS pc_ate_fundamental
FROM el
UNION ALL
SELECT nr_ano_eleicao, ds_cargo, cd_cargo, ds_grupo, ROUND(100 * AVG(CAST(g = 8 AS INT)), 1), ROUND(100 * AVG(CAST(g BETWEEN 5 AND 7 AS INT)), 1),
       ROUND(100 * AVG(CAST(g <= 4 AS INT)), 1)
FROM grupos GROUP BY 1, 2, 3, 4
ORDER BY 1, 3, 4;

-- @t5a | Tema 5: cidades em que duas ou mais pessoas com o mesmo sobrenome já foram eleitas prefeito (2000 a 2024), por região
-- Sobrenome: a última palavra do nome civil, sem JUNIOR, FILHO, NETO, SOBRINHO... Ficam de fora os 50 sobrenomes mais comuns
-- entre os candidatos (SILVA, SANTOS, OLIVEIRA...), que se repetem por acaso. 1996 fica de fora: sem o título de eleitor.
WITH nomes AS (
    SELECT id_pessoa, nr_titulo_eleitoral,
           regexp_extract(regexp_replace(upper(strip_accents(trim(nm_pessoa))), '\s+(JUNIOR|JR|FILHO|NETO|SOBRINHO|SEGUNDO|II|III)\.?$', ''), '(\S+)$', 1) AS sn
    FROM pessoa
),
comuns AS (SELECT sn FROM nomes GROUP BY sn ORDER BY COUNT(*) DESC LIMIT 50),
pref AS (
    SELECT c.cd_municipio_tse, e.nr_ano_eleicao, c.id_pessoa, n.sn
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    JOIN nomes n ON n.id_pessoa = c.id_pessoa
    WHERE c.cd_cargo = 11 AND st.fl_eleito AND e.nr_ano_eleicao >= 2000 AND n.nr_titulo_eleitoral NOT LIKE 'SQ%' AND n.sn NOT IN (SELECT sn FROM comuns)
),
fam AS (SELECT cd_municipio_tse, sn, COUNT(DISTINCT nr_ano_eleicao) AS qt_mandatos FROM pref GROUP BY 1, 2 HAVING COUNT(DISTINCT id_pessoa) >= 2),
mun AS (SELECT m.cd_municipio_tse, u.nm_regiao, COALESCE(MAX(f.qt_mandatos), 0) AS qt_mandatos_familia
        FROM municipio m JOIN uf u ON u.sg_uf = m.sg_uf LEFT JOIN fam f ON f.cd_municipio_tse = m.cd_municipio_tse GROUP BY 1, 2)
SELECT COALESCE(nm_regiao, 'Brasil') AS nm_regiao, COUNT(*) AS qt_municipios,
       COUNT_IF(qt_mandatos_familia >= 2) AS qt_com_familia, ROUND(100 * AVG(CAST(qt_mandatos_familia >= 2 AS INT)), 1) AS pc_com_familia,
       COUNT_IF(qt_mandatos_familia >= 3) AS qt_familia_3_mandatos, ROUND(100 * AVG(CAST(qt_mandatos_familia >= 3 AS INT)), 1) AS pc_familia_3_mandatos
FROM mun GROUP BY ROLLUP (nm_regiao) ORDER BY nm_regiao NULLS FIRST;

-- @t5b | Tema 5: as cidades em que o mesmo sobrenome mais vezes ganhou a prefeitura, com pessoas diferentes (2000 a 2024)
WITH nomes AS (
    SELECT id_pessoa, nr_titulo_eleitoral, nm_pessoa,
           regexp_extract(regexp_replace(upper(strip_accents(trim(nm_pessoa))), '\s+(JUNIOR|JR|FILHO|NETO|SOBRINHO|SEGUNDO|II|III)\.?$', ''), '(\S+)$', 1) AS sn
    FROM pessoa
),
comuns AS (SELECT sn FROM nomes GROUP BY sn ORDER BY COUNT(*) DESC LIMIT 50),
pref AS (
    SELECT c.cd_municipio_tse, e.nr_ano_eleicao, c.id_pessoa, n.nm_pessoa, n.sn
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    JOIN nomes n ON n.id_pessoa = c.id_pessoa
    WHERE c.cd_cargo = 11 AND st.fl_eleito AND e.nr_ano_eleicao >= 2000 AND n.nr_titulo_eleitoral NOT LIKE 'SQ%' AND n.sn NOT IN (SELECT sn FROM comuns)
)
SELECT m.nm_municipio, m.sg_uf, p.sn AS ds_sobrenome, COUNT(DISTINCT p.nr_ano_eleicao) AS qt_mandatos, COUNT(DISTINCT p.id_pessoa) AS qt_pessoas,
       string_agg(p.nr_ano_eleicao || ' ' || p.nm_pessoa, '; ' ORDER BY p.nr_ano_eleicao) AS ds_prefeitos
FROM pref p JOIN municipio m ON m.cd_municipio_tse = p.cd_municipio_tse
GROUP BY 1, 2, 3 HAVING COUNT(DISTINCT p.id_pessoa) >= 2
ORDER BY qt_mandatos DESC, qt_pessoas DESC, m.nm_municipio LIMIT 15;

-- @t5c | Tema 5: concentração dos votos dos deputados (parte que veio da cidade onde tiveram mais votos) e sobrenome de ex-prefeito dessa cidade (2018 e 2022)
WITH nomes AS (
    SELECT id_pessoa, regexp_extract(regexp_replace(upper(strip_accents(trim(nm_pessoa))), '\s+(JUNIOR|JR|FILHO|NETO|SOBRINHO|SEGUNDO|II|III)\.?$', ''), '(\S+)$', 1) AS sn
    FROM pessoa
),
comuns AS (SELECT sn FROM nomes GROUP BY sn ORDER BY COUNT(*) DESC LIMIT 50),
v AS (
    SELECT vc.id_candidatura, vc.cd_municipio_tse, SUM(vc.qt_votos_nominais) AS qt
    FROM votacao_candidato vc JOIN candidatura c ON c.id_candidatura = vc.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    WHERE vc.nr_turno = 1 AND e.nr_ano_eleicao IN (2018, 2022) AND c.cd_cargo IN (6, 7) GROUP BY 1, 2
),
t AS (SELECT id_candidatura, SUM(qt) AS qt_total, ARG_MAX(cd_municipio_tse, qt) AS cd_reduto, MAX(qt) AS qt_reduto FROM v GROUP BY 1),
pref AS (   -- sobrenomes de quem já foi eleito prefeito em cada cidade, de 2000 a 2020
    SELECT DISTINCT c.cd_municipio_tse, n.sn, e.nr_ano_eleicao
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    JOIN nomes n ON n.id_pessoa = c.id_pessoa
    WHERE c.cd_cargo = 11 AND st.fl_eleito AND e.nr_ano_eleicao BETWEEN 2000 AND 2020 AND n.sn NOT IN (SELECT sn FROM comuns)
),
b AS (
    SELECT e.nr_ano_eleicao, cg.ds_cargo, COALESCE(st.fl_eleito, false) AS fl_eleito, 100.0 * t.qt_reduto / t.qt_total AS pc_reduto,
           EXISTS (SELECT 1 FROM pref WHERE pref.cd_municipio_tse = t.cd_reduto AND pref.sn = n.sn AND pref.nr_ano_eleicao < e.nr_ano_eleicao) AS fl_sobrenome_prefeito
    FROM t JOIN candidatura c ON c.id_candidatura = t.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
    JOIN nomes n ON n.id_pessoa = c.id_pessoa LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE t.qt_total >= 1000   -- só quem teve pelo menos mil votos
)
SELECT nr_ano_eleicao, ds_cargo, fl_sobrenome_prefeito, COUNT(*) AS qt_candidatos, COUNT_IF(fl_eleito) AS qt_eleitos,
       ROUND(100 * AVG(CAST(fl_eleito AS INT)), 1) AS pc_sucesso,
       ROUND(MEDIAN(pc_reduto) FILTER (WHERE fl_eleito), 1) AS pc_reduto_mediano_eleitos,
       ROUND(100 * AVG(CAST(pc_reduto >= 50 AS INT)) FILTER (WHERE fl_eleito), 1) AS pc_eleitos_metade_numa_cidade
FROM b GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- @t6a | Tema 6: as cidades com mais e com menos "Ninguém" (abstenção + brancos + nulos) — prefeito 2024 e presidente 2022, 1º turno
WITH cand AS (
    SELECT c.id_candidatura, c.cd_cargo, e.nr_ano_eleicao FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    WHERE (e.nr_ano_eleicao = 2024 AND c.cd_cargo = 11) OR (e.nr_ano_eleicao = 2022 AND c.cd_cargo = 1)
),
vc AS (   -- votos do 1º colocado em cada cidade
    SELECT cand.nr_ano_eleicao, cand.cd_cargo, v.cd_municipio_tse, MAX(v.qt) AS qt_1o
    FROM cand JOIN (SELECT id_candidatura, cd_municipio_tse, SUM(qt_votos_nominais) AS qt FROM votacao_candidato WHERE nr_turno = 1 GROUP BY 1, 2) v
         ON v.id_candidatura = cand.id_candidatura
    GROUP BY 1, 2, 3
),
cp AS (
    SELECT e.nr_ano_eleicao, cp.cd_cargo, cp.cd_municipio_tse, SUM(qt_aptos) AS aptos, SUM(qt_abstencoes) AS abst, SUM(qt_votos_brancos) AS br, SUM(qt_votos_nulos) AS nu
    FROM comparecimento cp JOIN eleicao e ON e.id_eleicao = cp.id_eleicao
    WHERE cp.nr_turno = 1 AND ((e.nr_ano_eleicao = 2024 AND cp.cd_cargo = 11) OR (e.nr_ano_eleicao = 2022 AND cp.cd_cargo = 1)) GROUP BY 1, 2, 3
),
x AS (
    SELECT cp.nr_ano_eleicao, cp.cd_cargo, m.nm_municipio, m.sg_uf, cp.aptos AS qt_aptos,
           ROUND(100.0 * (abst + br + nu) / aptos, 1) AS pc_ninguem, ROUND(100.0 * abst / aptos, 1) AS pc_abstencao,
           ROUND(100.0 * (br + nu) / aptos, 1) AS pc_branco_nulo, ROUND(100.0 * qt_1o / aptos, 1) AS pc_1o_colocado,
           (abst + br + nu) > qt_1o AS fl_ninguem_passou_o_1o
    FROM cp JOIN vc ON vc.nr_ano_eleicao = cp.nr_ano_eleicao AND vc.cd_cargo = cp.cd_cargo AND vc.cd_municipio_tse = cp.cd_municipio_tse
    JOIN municipio m ON m.cd_municipio_tse = cp.cd_municipio_tse
)
SELECT *, CASE WHEN ROW_NUMBER() OVER (PARTITION BY nr_ano_eleicao ORDER BY pc_ninguem DESC) <= 10 THEN 'mais' ELSE 'menos' END AS ds_lista
FROM x
QUALIFY ROW_NUMBER() OVER (PARTITION BY nr_ano_eleicao ORDER BY pc_ninguem DESC) <= 10 OR ROW_NUMBER() OVER (PARTITION BY nr_ano_eleicao ORDER BY pc_ninguem) <= 5
ORDER BY nr_ano_eleicao, pc_ninguem DESC;

-- @t6b | Tema 6: o "Ninguém" e o resultado — cidades em cinco grupos pela parte do eleitorado que não escolheu ninguém para prefeito (1º turno)
WITH cand AS (SELECT c.id_candidatura, e.nr_ano_eleicao FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao WHERE c.cd_cargo = 11 AND e.nr_ano_eleicao >= 2008),
vc AS (
    SELECT cand.nr_ano_eleicao, v.cd_municipio_tse, MAX(v.qt) AS qt_1o, COUNT(*) AS qt_cand
    FROM cand JOIN (SELECT id_candidatura, cd_municipio_tse, SUM(qt_votos_nominais) AS qt FROM votacao_candidato WHERE nr_turno = 1 GROUP BY 1, 2) v
         ON v.id_candidatura = cand.id_candidatura
    GROUP BY 1, 2
),
cp AS (
    SELECT e.nr_ano_eleicao, cp.cd_municipio_tse, SUM(qt_aptos) AS aptos, SUM(qt_abstencoes) AS abst, SUM(qt_votos_brancos) AS br, SUM(qt_votos_nulos) AS nu
    FROM comparecimento cp JOIN eleicao e ON e.id_eleicao = cp.id_eleicao WHERE cp.nr_turno = 1 AND cp.cd_cargo = 11 AND e.nr_ano_eleicao >= 2008 GROUP BY 1, 2
),
b AS (
    SELECT cp.*, vc.qt_1o, vc.qt_cand, 100.0 * (abst + br + nu) / aptos AS pc_ning,
           NTILE(5) OVER (PARTITION BY cp.nr_ano_eleicao ORDER BY (abst + br + nu) / aptos) AS nr_quintil
    FROM cp JOIN vc ON vc.nr_ano_eleicao = cp.nr_ano_eleicao AND vc.cd_municipio_tse = cp.cd_municipio_tse WHERE aptos > 0
)
SELECT nr_ano_eleicao, nr_quintil, COUNT(*) AS qt_municipios, ROUND(MIN(pc_ning), 1) AS pc_ninguem_min, ROUND(MAX(pc_ning), 1) AS pc_ninguem_max,
       ROUND(AVG(100.0 * qt_1o / aptos), 1) AS pc_eleitores_do_1o, ROUND(100 * AVG(CAST(qt_cand = 1 AS INT)), 1) AS pc_candidato_unico,
       ROUND(100 * AVG(CAST((abst + br + nu) > qt_1o AS INT)), 1) AS pc_ninguem_passou_o_1o, ROUND(MEDIAN(aptos), 0) AS qt_eleitores_mediano
FROM b GROUP BY 1, 2 ORDER BY 1, 2;

-- @t6c | Tema 6: abstenção, brancos e nulos no Brasil, eleição a eleição (presidente nas gerais, prefeito nas municipais; 1º turno)
SELECT e.nr_ano_eleicao, cp.cd_cargo, SUM(qt_aptos) AS qt_aptos,
       ROUND(100.0 * SUM(qt_abstencoes) / SUM(qt_aptos), 1) AS pc_abstencao, ROUND(100.0 * SUM(qt_votos_brancos) / SUM(qt_aptos), 1) AS pc_branco,
       ROUND(100.0 * SUM(qt_votos_nulos) / SUM(qt_aptos), 1) AS pc_nulo,
       ROUND(100.0 * SUM(qt_abstencoes + qt_votos_brancos + qt_votos_nulos) / SUM(qt_aptos), 1) AS pc_ninguem,
       SUM(qt_abstencoes + qt_votos_brancos + qt_votos_nulos) AS qt_ninguem
FROM comparecimento cp JOIN eleicao e ON e.id_eleicao = cp.id_eleicao
WHERE cp.nr_turno = 1 AND cp.cd_cargo IN (1, 11) GROUP BY 1, 2 ORDER BY 1;

-- @t7a | Tema 7: quantas cadeiras vieram do voto de legenda e quantos eleitos tiveram, sozinhos, os votos de uma cadeira (quociente eleitoral)
-- Cadeiras da legenda: em cada partido e circunscrição, eleitos × (votos de legenda ÷ votos do partido). Quociente eleitoral:
-- votos válidos da circunscrição (nominais + legenda) ÷ cadeiras. Circunscrição: o estado para deputado, a cidade para vereador.
WITH circ AS (
    SELECT e.nr_ano_eleicao, CASE WHEN vp.cd_cargo = 8 THEN 7 ELSE vp.cd_cargo END AS cd_cargo,
           CASE WHEN vp.cd_cargo = 13 THEN vp.cd_municipio_tse::VARCHAR ELSE m.sg_uf END AS ds_circ, vp.id_partido,
           SUM(vp.qt_votos_nominais) AS qt_nom, SUM(COALESCE(vp.qt_votos_legenda, 0)) AS qt_leg
    FROM votacao_partido vp JOIN eleicao e ON e.id_eleicao = vp.id_eleicao JOIN municipio m ON m.cd_municipio_tse = vp.cd_municipio_tse
    WHERE vp.nr_turno = 1 AND vp.cd_cargo IN (6, 7, 8, 13) AND e.nr_ano_eleicao >= 2000 GROUP BY 1, 2, 3, 4
),
vt AS (SELECT id_candidatura, SUM(qt_votos_nominais) AS qt FROM votacao_candidato WHERE nr_turno = 1 GROUP BY 1),
el AS (
    SELECT e.nr_ano_eleicao, CASE WHEN c.cd_cargo = 8 THEN 7 ELSE c.cd_cargo END AS cd_cargo,
           CASE WHEN c.cd_cargo = 13 THEN c.cd_municipio_tse::VARCHAR ELSE c.sg_uf END AS ds_circ, c.id_partido, COALESCE(vt.qt, 0) AS qt_votos
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    LEFT JOIN vt ON vt.id_candidatura = c.id_candidatura
    WHERE st.fl_eleito AND c.cd_cargo IN (6, 7, 8, 13) AND e.nr_ano_eleicao >= 2000
),
cad AS (SELECT nr_ano_eleicao, cd_cargo, ds_circ, COUNT(*) AS qt_cadeiras FROM el GROUP BY 1, 2, 3),
qe AS (
    SELECT c.nr_ano_eleicao, c.cd_cargo, c.ds_circ, SUM(c.qt_nom + c.qt_leg) / ANY_VALUE(cad.qt_cadeiras) AS vr_qe
    FROM circ c JOIN cad ON cad.nr_ano_eleicao = c.nr_ano_eleicao AND cad.cd_cargo = c.cd_cargo AND cad.ds_circ = c.ds_circ GROUP BY 1, 2, 3
),
pe AS (SELECT nr_ano_eleicao, cd_cargo, ds_circ, id_partido, COUNT(*) AS qt_eleitos FROM el GROUP BY 1, 2, 3, 4),
leg AS (
    SELECT c.nr_ano_eleicao, c.cd_cargo, SUM(c.qt_leg) AS qt_legenda, SUM(c.qt_nom + c.qt_leg) AS qt_validos,
           SUM(COALESCE(pe.qt_eleitos, 0) * c.qt_leg / NULLIF(c.qt_nom + c.qt_leg, 0)) AS qt_cadeiras_legenda
    FROM circ c LEFT JOIN pe ON pe.nr_ano_eleicao = c.nr_ano_eleicao AND pe.cd_cargo = c.cd_cargo AND pe.ds_circ = c.ds_circ AND pe.id_partido = c.id_partido
    GROUP BY 1, 2
),
proprios AS (
    SELECT el.nr_ano_eleicao, el.cd_cargo, COUNT(*) AS qt_eleitos, COUNT_IF(el.qt_votos >= qe.vr_qe) AS qt_com_votos_proprios
    FROM el JOIN qe ON qe.nr_ano_eleicao = el.nr_ano_eleicao AND qe.cd_cargo = el.cd_cargo AND qe.ds_circ = el.ds_circ GROUP BY 1, 2
)
SELECT l.nr_ano_eleicao, cg.ds_cargo, l.cd_cargo, a.qt_eleitos, l.qt_legenda, ROUND(100.0 * l.qt_legenda / l.qt_validos, 2) AS pc_legenda,
       ROUND(l.qt_cadeiras_legenda, 0) AS qt_cadeiras_da_legenda, ROUND(100.0 * l.qt_cadeiras_legenda / a.qt_eleitos, 1) AS pc_cadeiras_da_legenda,
       a.qt_com_votos_proprios, ROUND(100.0 * a.qt_com_votos_proprios / a.qt_eleitos, 1) AS pc_com_votos_proprios
FROM leg l JOIN proprios a ON a.nr_ano_eleicao = l.nr_ano_eleicao AND a.cd_cargo = l.cd_cargo JOIN cargo cg ON cg.cd_cargo = l.cd_cargo
WHERE l.qt_legenda > 0 ORDER BY l.cd_cargo, l.nr_ano_eleicao;

-- @t8a | Tema 8: número de vereadores e de votos, pelo tamanho da cidade (2024)
WITH cand AS (
    SELECT c.id_candidatura, c.cd_municipio_tse, COALESCE(st.fl_eleito, false) AS fl_eleito
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE c.cd_cargo = 13 AND e.nr_ano_eleicao = 2024
),
vt AS (SELECT id_candidatura, SUM(qt_votos_nominais) AS qt FROM votacao_candidato WHERE nr_turno = 1 GROUP BY 1),
mun AS (
    SELECT cand.cd_municipio_tse, COUNT_IF(fl_eleito) AS qt_cadeiras, COUNT(*) AS qt_candidatos,
           MEDIAN(CASE WHEN fl_eleito THEN COALESCE(vt.qt, 0) END) AS qt_votos_eleito_mediano
    FROM cand LEFT JOIN vt ON vt.id_candidatura = cand.id_candidatura GROUP BY 1
),
val AS (SELECT vp.cd_municipio_tse, SUM(qt_votos_nominais + COALESCE(qt_votos_legenda, 0)) AS qt_validos FROM votacao_partido vp JOIN eleicao e ON e.id_eleicao = vp.id_eleicao
        WHERE e.nr_ano_eleicao = 2024 AND vp.cd_cargo = 13 AND vp.nr_turno = 1 GROUP BY 1),
apt AS (SELECT cp.cd_municipio_tse, SUM(qt_aptos) AS qt_aptos FROM comparecimento cp JOIN eleicao e ON e.id_eleicao = cp.id_eleicao
        WHERE e.nr_ano_eleicao = 2024 AND cp.cd_cargo = 13 AND cp.nr_turno = 1 GROUP BY 1),
b AS (
    SELECT mun.*, val.qt_validos, apt.qt_aptos,
           CASE WHEN i.qt_populacao < 5000 THEN 1 WHEN i.qt_populacao < 10000 THEN 2 WHEN i.qt_populacao < 20000 THEN 3 WHEN i.qt_populacao < 50000 THEN 4
                WHEN i.qt_populacao < 100000 THEN 5 WHEN i.qt_populacao < 500000 THEN 6 WHEN i.qt_populacao < 1000000 THEN 7 ELSE 8 END AS nr_faixa
    FROM mun JOIN val ON val.cd_municipio_tse = mun.cd_municipio_tse JOIN apt ON apt.cd_municipio_tse = mun.cd_municipio_tse
    JOIN vw_indicador_atual i ON i.cd_municipio_tse = mun.cd_municipio_tse WHERE mun.qt_cadeiras > 0
)
SELECT nr_faixa, ['até 5 mil habitantes', '5 a 10 mil', '10 a 20 mil', '20 a 50 mil', '50 a 100 mil', '100 a 500 mil', '500 mil a 1 milhão', 'mais de 1 milhão'][nr_faixa] AS ds_faixa,
       COUNT(*) AS qt_municipios, SUM(qt_cadeiras) AS qt_cadeiras, ROUND(AVG(qt_cadeiras), 1) AS qt_cadeiras_media,
       ROUND(SUM(qt_aptos) / SUM(qt_cadeiras), 0) AS qt_eleitores_por_cadeira, ROUND(SUM(qt_validos) / SUM(qt_cadeiras), 0) AS qt_votos_por_cadeira,
       ROUND(MEDIAN(qt_votos_eleito_mediano), 0) AS qt_votos_eleito_mediano, ROUND(SUM(qt_candidatos) / SUM(qt_cadeiras), 1) AS qt_candidatos_por_cadeira
FROM b GROUP BY 1, 2 ORDER BY 1;

-- @t8b | Tema 8: onde uma cadeira de vereador representa mais e menos eleitores (2024), e a correlação entre o tamanho do eleitorado e o número de cadeiras
WITH mun AS (
    SELECT c.cd_municipio_tse, COUNT(*) AS qt_cadeiras
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE c.cd_cargo = 13 AND e.nr_ano_eleicao = 2024 AND st.fl_eleito GROUP BY 1
),
apt AS (SELECT cp.cd_municipio_tse, SUM(qt_aptos) AS qt_aptos FROM comparecimento cp JOIN eleicao e ON e.id_eleicao = cp.id_eleicao
        WHERE e.nr_ano_eleicao = 2024 AND cp.cd_cargo = 13 AND cp.nr_turno = 1 GROUP BY 1),
b AS (SELECT m.nm_municipio, m.sg_uf, mun.qt_cadeiras, apt.qt_aptos, apt.qt_aptos / mun.qt_cadeiras AS qt_por_cadeira
      FROM mun JOIN apt ON apt.cd_municipio_tse = mun.cd_municipio_tse JOIN municipio m ON m.cd_municipio_tse = mun.cd_municipio_tse)
SELECT * FROM (
    SELECT 'correlação' AS ds_tipo, NULL AS nm_municipio, NULL AS sg_uf, NULL AS qt_cadeiras, NULL AS qt_aptos, NULL AS qt_eleitores_por_cadeira,
           ROUND(CORR(LN(qt_aptos), qt_cadeiras), 2) AS r_eleitores_cadeiras, 0 AS nr_ordem
    FROM b
    UNION ALL
    SELECT 'mais eleitores por cadeira', nm_municipio, sg_uf, qt_cadeiras, qt_aptos, ROUND(qt_por_cadeira, 0), NULL, ROW_NUMBER() OVER (ORDER BY qt_por_cadeira DESC) FROM b
    UNION ALL
    SELECT 'menos eleitores por cadeira', nm_municipio, sg_uf, qt_cadeiras, qt_aptos, ROUND(qt_por_cadeira, 0), NULL, ROW_NUMBER() OVER (ORDER BY qt_por_cadeira) FROM b
) WHERE nr_ordem <= 5 ORDER BY ds_tipo, nr_ordem;

-- @t9a | Tema 9: os assuntos dos planos de governo ao longo do tempo — parte dos planos que cita cada assunto, eleição a eleição
WITH pl AS (
    SELECT e.nr_ano_eleicao, CASE WHEN c.cd_cargo = 11 THEN 'PREFEITO' ELSE 'GOVERNADOR E PRESIDENTE' END AS ds_grupo, lower(strip_accents(pg.tx_proposta)) AS tx
    FROM proposta_governo pg JOIN candidatura c ON c.id_candidatura = pg.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    WHERE c.cd_cargo IN (1, 3, 11) AND length(pg.tx_proposta) > 500   -- plano escaneado como imagem não tem texto
)
SELECT nr_ano_eleicao, ds_grupo, COUNT(*) AS qt_planos,
       ROUND(100 * AVG(CAST(regexp_matches(tx, 'pandemia|covid|coronavirus') AS INT)), 1) AS pc_pandemia,
       ROUND(100 * AVG(CAST(regexp_matches(tx, 'inteligencia artificial') AS INT)), 1) AS pc_inteligencia_artificial,
       ROUND(100 * AVG(CAST(regexp_matches(tx, 'saude mental|autis') AS INT)), 1) AS pc_saude_mental_autismo,
       ROUND(100 * AVG(CAST(regexp_matches(tx, 'clima|climatic|sustentab') AS INT)), 1) AS pc_clima,
       ROUND(100 * AVG(CAST(regexp_matches(tx, 'animal|animais|castracao') AS INT)), 1) AS pc_causa_animal,
       ROUND(100 * AVG(CAST(regexp_matches(tx, 'mulher|feminicidio|violencia domestica') AS INT)), 1) AS pc_mulheres,
       ROUND(100 * AVG(CAST(regexp_matches(tx, 'transparencia|corrupcao|controle social') AS INT)), 1) AS pc_transparencia,
       ROUND(100 * AVG(CAST(regexp_matches(tx, 'digital|internet|wi-?fi|conectividade') AS INT)), 1) AS pc_digital,
       ROUND(100 * AVG(CAST(regexp_matches(tx, 'seguranca publica|guarda municipal|videomonitoramento|policia') AS INT)), 1) AS pc_seguranca
FROM pl GROUP BY 1, 2 ORDER BY 2, 1;

-- @t9b | Tema 9: o mesmo político de uma eleição para a outra — quanto o plano novo repete as palavras do anterior
-- Semelhança: palavras em comum ÷ palavras dos dois planos (índice de Jaccard), usando as 80 palavras mais usadas de cada plano
-- (tabela proposta_palavra). A mesma pessoa é seguida pelo título de eleitor.
WITH pl AS (
    SELECT c.id_pessoa, c.id_candidatura, e.nr_ano_eleicao, c.cd_cargo
    FROM proposta_governo pg JOIN candidatura c ON c.id_candidatura = pg.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN pessoa ps ON ps.id_pessoa = c.id_pessoa
    WHERE ps.nr_titulo_eleitoral NOT LIKE 'SQ%' AND EXISTS (SELECT 1 FROM proposta_palavra x WHERE x.id_candidatura = c.id_candidatura)
),
par AS (   -- cada plano com o plano seguinte da mesma pessoa
    SELECT a.id_pessoa, a.id_candidatura AS ida, b.id_candidatura AS idb, a.cd_cargo = b.cd_cargo AS fl_mesmo_cargo
    FROM pl a JOIN pl b ON b.id_pessoa = a.id_pessoa AND b.nr_ano_eleicao > a.nr_ano_eleicao
    WHERE NOT EXISTS (SELECT 1 FROM pl m WHERE m.id_pessoa = a.id_pessoa AND m.nr_ano_eleicao > a.nr_ano_eleicao AND m.nr_ano_eleicao < b.nr_ano_eleicao)
),
com AS (SELECT par.ida, par.idb, COUNT(*) AS qt_comum FROM par JOIN proposta_palavra x ON x.id_candidatura = par.ida
        JOIN proposta_palavra y ON y.id_candidatura = par.idb AND y.palavra = x.palavra GROUP BY 1, 2),
uni AS (SELECT par.ida, par.idb, COUNT(DISTINCT p.palavra) AS qt_uniao FROM par JOIN proposta_palavra p ON p.id_candidatura IN (par.ida, par.idb) GROUP BY 1, 2),
sim AS (SELECT par.*, COALESCE(com.qt_comum, 0) / uni.qt_uniao AS vr_sim FROM par JOIN uni ON uni.ida = par.ida AND uni.idb = par.idb
        LEFT JOIN com ON com.ida = par.ida AND com.idb = par.idb)
SELECT COALESCE(CASE WHEN fl_mesmo_cargo THEN 'mesmo cargo' ELSE 'outro cargo' END, 'todos') AS ds_tipo, COUNT(*) AS qt_pares_de_planos,
       ROUND(100 * AVG(vr_sim), 1) AS pc_semelhanca_media, ROUND(100 * AVG(CAST(vr_sim >= 0.8 AS INT)), 1) AS pc_quase_igual,
       ROUND(100 * AVG(CAST(vr_sim < 0.3 AS INT)), 1) AS pc_muito_diferente
FROM sim GROUP BY ROLLUP (fl_mesmo_cargo) ORDER BY qt_pares_de_planos DESC;

-- @t10a | Tema 10: prefeitos que tentaram a reeleição — quantos conseguiram, pela idade (2004 a 2024)
WITH pf AS (
    SELECT c.id_pessoa, c.cd_municipio_tse, e.nr_ano_eleicao, c.nr_idade_posse, COALESCE(st.fl_eleito, false) AS fl_eleito
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN pessoa ps ON ps.id_pessoa = c.id_pessoa
    LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE c.cd_cargo = 11 AND ps.nr_titulo_eleitoral NOT LIKE 'SQ%' AND e.nr_ano_eleicao >= 2000
),
inc AS (SELECT b.*, CASE WHEN b.nr_idade_posse < 40 THEN 1 WHEN b.nr_idade_posse < 50 THEN 2 WHEN b.nr_idade_posse < 60 THEN 3 WHEN b.nr_idade_posse < 70 THEN 4 ELSE 5 END AS nr_faixa
        FROM pf b JOIN pf a ON a.id_pessoa = b.id_pessoa AND a.cd_municipio_tse = b.cd_municipio_tse AND a.nr_ano_eleicao = b.nr_ano_eleicao - 4 AND a.fl_eleito
        WHERE b.nr_idade_posse BETWEEN 18 AND 100)
SELECT nr_faixa, ['até 39 anos', '40 a 49', '50 a 59', '60 a 69', '70 ou mais'][nr_faixa] AS ds_idade,
       COUNT(*) AS qt_tentaram, COUNT_IF(fl_eleito) AS qt_reeleitos, ROUND(100 * AVG(CAST(fl_eleito AS INT)), 1) AS pc_reeleitos
FROM inc GROUP BY 1, 2 ORDER BY 1;

-- @t10b | Tema 10: alternância de poder nas prefeituras, eleição a eleição — mesmo prefeito, mesmo partido ou troca — e a idade de cada grupo
-- Partido pela "linhagem" (PFL, DEM e União contam como o mesmo; PR e PL também), para mudança de nome não parecer troca.
WITH pf AS (
    SELECT c.id_pessoa, c.cd_municipio_tse, e.nr_ano_eleicao, c.nr_idade_posse, COALESCE(pa.cd_linhagem, c.id_partido::VARCHAR) AS cd_partido
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN pessoa ps ON ps.id_pessoa = c.id_pessoa
    JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    WHERE c.cd_cargo = 11 AND st.fl_eleito AND ps.nr_titulo_eleitoral NOT LIKE 'SQ%' AND e.nr_ano_eleicao >= 2000
),
b AS (SELECT n.*, a.id_pessoa AS id_anterior, a.cd_partido AS partido_anterior, a.nr_idade_posse AS idade_anterior
      FROM pf n JOIN pf a ON a.cd_municipio_tse = n.cd_municipio_tse AND a.nr_ano_eleicao = n.nr_ano_eleicao - 4)
SELECT nr_ano_eleicao, COUNT(*) AS qt_municipios,
       ROUND(100 * AVG(CAST(id_pessoa = id_anterior AS INT)), 1) AS pc_mesmo_prefeito,
       ROUND(100 * AVG(CAST(id_pessoa <> id_anterior AND cd_partido = partido_anterior AS INT)), 1) AS pc_outro_do_mesmo_partido,
       ROUND(100 * AVG(CAST(id_pessoa <> id_anterior AND cd_partido <> partido_anterior AS INT)), 1) AS pc_troca_de_partido,
       ROUND(AVG(nr_idade_posse) FILTER (WHERE id_pessoa = id_anterior), 1) AS vr_idade_reeleito,
       ROUND(AVG(nr_idade_posse) FILTER (WHERE id_pessoa <> id_anterior AND cd_partido <> partido_anterior), 1) AS vr_idade_quem_entrou,
       ROUND(AVG(idade_anterior) FILTER (WHERE id_pessoa <> id_anterior AND cd_partido <> partido_anterior), 1) AS vr_idade_quem_saiu
FROM b GROUP BY 1 ORDER BY 1;

-- @t10c | Tema 10: renovação na Câmara dos Deputados — parte dos eleitos que não estava lá antes, e a idade de novatos e reeleitos
WITH d AS (
    SELECT c.id_pessoa, e.nr_ano_eleicao, c.nr_idade_posse
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN pessoa ps ON ps.id_pessoa = c.id_pessoa
    JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE c.cd_cargo = 6 AND st.fl_eleito AND ps.nr_titulo_eleitoral NOT LIKE 'SQ%'
)
SELECT n.nr_ano_eleicao, COUNT(*) AS qt_eleitos, ROUND(100 * AVG(CAST(a.id_pessoa IS NULL AS INT)), 1) AS pc_novatos,
       ROUND(AVG(n.nr_idade_posse) FILTER (WHERE a.id_pessoa IS NULL), 1) AS vr_idade_novatos,
       ROUND(AVG(n.nr_idade_posse) FILTER (WHERE a.id_pessoa IS NOT NULL), 1) AS vr_idade_reeleitos
FROM d n LEFT JOIN d a ON a.id_pessoa = n.id_pessoa AND a.nr_ano_eleicao = n.nr_ano_eleicao - 4
WHERE n.nr_ano_eleicao >= 2002   -- 1998 compara com 1994, ano em que muitos títulos de eleitor faltam
GROUP BY 1 ORDER BY 1;

-- @t11a | Tema 11: Bolsa Família e dinheiro de empresas nas campanhas, ano a ano (benefícios e valor pago em dezembro; doações com CNPJ)
WITH bf AS (SELECT nr_ano, SUM(qt_beneficios) AS qt_beneficios, SUM(vr_dezembro_mil_reais) * 1000 AS vr_dezembro FROM bolsa_familia_municipio GROUP BY 1),
pj AS (SELECT nr_ano_eleicao AS nr_ano, SUM(vr_receita) FILTER (WHERE tp_doador = 'PJ') AS vr_pj, SUM(vr_receita) AS vr_total FROM receita GROUP BY 1)
SELECT bf.nr_ano, bf.qt_beneficios, ROUND(bf.vr_dezembro, 0) AS vr_bolsa_dezembro, ROUND(pj.vr_pj, 0) AS vr_doacao_empresas,
       ROUND(100 * pj.vr_pj / pj.vr_total, 1) AS pc_doacao_empresas
FROM bf LEFT JOIN pj ON pj.nr_ano = bf.nr_ano ORDER BY 1;

-- @t11b | Tema 11: cidades em cinco grupos pelo alcance do Bolsa Família (benefícios ÷ eleitores) x dinheiro de empresas e lado do prefeito eleito
WITH apt AS (
    SELECT e.nr_ano_eleicao AS nr_ano, cp.cd_municipio_tse, SUM(qt_aptos) AS qt_aptos FROM comparecimento cp JOIN eleicao e ON e.id_eleicao = cp.id_eleicao
    WHERE cp.cd_cargo = 11 AND cp.nr_turno = 1 AND e.nr_ano_eleicao IN (2012, 2016, 2020, 2024) GROUP BY 1, 2
),
cob AS (SELECT b.nr_ano, b.cd_municipio_tse, b.qt_beneficios / NULLIF(a.qt_aptos, 0) AS vr_alcance
        FROM bolsa_familia_municipio b JOIN apt a ON a.cd_municipio_tse = b.cd_municipio_tse AND a.nr_ano = b.nr_ano),
q AS (SELECT *, NTILE(5) OVER (PARTITION BY nr_ano ORDER BY vr_alcance) AS nr_quintil FROM cob WHERE vr_alcance IS NOT NULL),
rc AS (
    SELECT r.nr_ano_eleicao, c.cd_municipio_tse, SUM(r.vr_receita) FILTER (WHERE r.tp_doador = 'PJ') AS vr_pj, SUM(r.vr_receita) AS vr_total,
           SUM(r.vr_receita) FILTER (WHERE r.fl_recurso_publico) AS vr_publico
    FROM receita r JOIN candidatura c ON c.id_candidatura = r.id_candidatura
    WHERE c.cd_cargo IN (11, 13) AND r.nr_ano_eleicao IN (2012, 2016, 2020, 2024) GROUP BY 1, 2
),
pf AS (
    SELECT e.nr_ano_eleicao, c.cd_municipio_tse, ANY_VALUE(pa.ds_espectro) AS ds_espectro
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    WHERE c.cd_cargo = 11 AND st.fl_eleito GROUP BY 1, 2
)
SELECT q.nr_ano, q.nr_quintil, COUNT(*) AS qt_municipios, ROUND(100 * MIN(q.vr_alcance), 1) AS pc_alcance_min, ROUND(100 * MAX(q.vr_alcance), 1) AS pc_alcance_max,
       ROUND(SUM(rc.vr_pj), 0) AS vr_doacao_empresas, ROUND(100 * SUM(rc.vr_pj) / NULLIF(SUM(rc.vr_total), 0), 1) AS pc_doacao_empresas,
       ROUND(100 * SUM(rc.vr_publico) / NULLIF(SUM(rc.vr_total), 0), 1) AS pc_dinheiro_publico,
       ROUND(100 * AVG(CAST(pf.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') AS INT)), 1) AS pc_prefeito_esquerda,
       ROUND(100 * AVG(CAST(pf.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') AS INT)), 1) AS pc_prefeito_direita
FROM q LEFT JOIN rc ON rc.nr_ano_eleicao = q.nr_ano AND rc.cd_municipio_tse = q.cd_municipio_tse
LEFT JOIN pf ON pf.nr_ano_eleicao = q.nr_ano AND pf.cd_municipio_tse = q.cd_municipio_tse
GROUP BY 1, 2 ORDER BY 1, 2;

-- @t13a | Tema 13: mapa de calor — parte dos votos para presidente que foi para a esquerda, o centro e a direita, por estado e região (1º turno, 1994 a 2026)
WITH v AS (
    SELECT e.nr_ano_eleicao, m.sg_uf,
           CASE WHEN pa.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') THEN 'e' WHEN pa.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') THEN 'd' ELSE 'c' END AS lado,
           SUM(vc.qt_votos_nominais) AS qt
    FROM votacao_candidato vc JOIN candidatura c ON c.id_candidatura = vc.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN municipio m ON m.cd_municipio_tse = vc.cd_municipio_tse
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    WHERE c.cd_cargo = 1 AND vc.nr_turno = 1 GROUP BY 1, 2, 3
)
SELECT v.nr_ano_eleicao, COALESCE(u.nm_regiao, 'Brasil') AS nm_regiao, COALESCE(v.sg_uf, '') AS sg_uf,
       ROUND(100.0 * SUM(qt) FILTER (WHERE lado = 'e') / SUM(qt), 1) AS pc_esquerda, ROUND(100.0 * SUM(qt) FILTER (WHERE lado = 'c') / SUM(qt), 1) AS pc_centro,
       ROUND(100.0 * SUM(qt) FILTER (WHERE lado = 'd') / SUM(qt), 1) AS pc_direita
FROM v JOIN uf u ON u.sg_uf = v.sg_uf
GROUP BY GROUPING SETS ((v.nr_ano_eleicao, u.nm_regiao, v.sg_uf), (v.nr_ano_eleicao, u.nm_regiao), (v.nr_ano_eleicao))
ORDER BY 1, 2, 3;

-- @t14a | Tema 14: quantas vezes cada cidade trocou de lado — o campo político do 1º colocado para presidente (1º turno) e do prefeito eleito
WITH pres AS (
    SELECT e.nr_ano_eleicao, vc.cd_municipio_tse, c.id_partido, SUM(vc.qt_votos_nominais) AS qt
    FROM votacao_candidato vc JOIN candidatura c ON c.id_candidatura = vc.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    WHERE c.cd_cargo = 1 AND vc.nr_turno = 1 GROUP BY 1, 2, 3
),
p1 AS (SELECT 'PRESIDENTE' AS ds_cargo, nr_ano_eleicao, cd_municipio_tse, ARG_MAX(id_partido, qt) AS id_partido FROM pres GROUP BY 1, 2, 3),
pf AS (SELECT 'PREFEITO' AS ds_cargo, e.nr_ano_eleicao, c.cd_municipio_tse, ANY_VALUE(c.id_partido) AS id_partido
       FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
       WHERE c.cd_cargo = 11 AND st.fl_eleito GROUP BY 1, 2, 3),
lado AS (
    SELECT x.*, CASE WHEN pa.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') THEN 'esquerda' WHEN pa.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') THEN 'direita'
                     WHEN pa.ds_espectro = 'CENTRO' THEN 'centro' END AS ds_lado
    FROM (SELECT * FROM p1 UNION ALL SELECT * FROM pf) x JOIN municipio m ON m.cd_municipio_tse = x.cd_municipio_tse
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = x.id_partido AND pa.nr_ano_eleicao = x.nr_ano_eleicao
),
seq AS (SELECT *, LAG(ds_lado) OVER (PARTITION BY ds_cargo, cd_municipio_tse ORDER BY nr_ano_eleicao) AS ds_lado_anterior FROM lado WHERE ds_lado IS NOT NULL),
mun AS (SELECT ds_cargo, cd_municipio_tse, COUNT(*) AS qt_eleicoes, COUNT_IF(ds_lado_anterior IS NOT NULL AND ds_lado_anterior <> ds_lado) AS qt_trocas FROM seq GROUP BY 1, 2)
SELECT ds_cargo, LEAST(qt_trocas, 6) AS qt_trocas, COUNT(*) AS qt_municipios,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY ds_cargo), 1) AS pc_municipios
FROM mun WHERE qt_eleicoes >= 6 GROUP BY 1, 2 ORDER BY 1, 2;

-- @t14b | Tema 14: em cada eleição, a parte das cidades que repetiu o lado da eleição anterior, e quantas viraram de um lado para o outro
WITH pres AS (
    SELECT e.nr_ano_eleicao, vc.cd_municipio_tse, c.id_partido, SUM(vc.qt_votos_nominais) AS qt
    FROM votacao_candidato vc JOIN candidatura c ON c.id_candidatura = vc.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    WHERE c.cd_cargo = 1 AND vc.nr_turno = 1 GROUP BY 1, 2, 3
),
p1 AS (SELECT 'PRESIDENTE' AS ds_cargo, nr_ano_eleicao, cd_municipio_tse, ARG_MAX(id_partido, qt) AS id_partido FROM pres GROUP BY 1, 2, 3),
pf AS (SELECT 'PREFEITO' AS ds_cargo, e.nr_ano_eleicao, c.cd_municipio_tse, ANY_VALUE(c.id_partido) AS id_partido
       FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
       WHERE c.cd_cargo = 11 AND st.fl_eleito GROUP BY 1, 2, 3),
lado AS (
    SELECT x.*, CASE WHEN pa.ds_espectro IN ('ESQUERDA', 'CENTRO-ESQUERDA') THEN 'esquerda' WHEN pa.ds_espectro IN ('DIREITA', 'CENTRO-DIREITA') THEN 'direita'
                     WHEN pa.ds_espectro = 'CENTRO' THEN 'centro' END AS ds_lado
    FROM (SELECT * FROM p1 UNION ALL SELECT * FROM pf) x JOIN municipio m ON m.cd_municipio_tse = x.cd_municipio_tse
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = x.id_partido AND pa.nr_ano_eleicao = x.nr_ano_eleicao
),
seq AS (SELECT *, LAG(ds_lado) OVER (PARTITION BY ds_cargo, cd_municipio_tse ORDER BY nr_ano_eleicao) AS ds_lado_anterior FROM lado WHERE ds_lado IS NOT NULL)
SELECT ds_cargo, nr_ano_eleicao, COUNT(*) AS qt_municipios, ROUND(100 * AVG(CAST(ds_lado = ds_lado_anterior AS INT)), 1) AS pc_mesmo_lado,
       COUNT_IF(ds_lado_anterior = 'esquerda' AND ds_lado = 'direita') AS qt_esquerda_para_direita,
       COUNT_IF(ds_lado_anterior = 'direita' AND ds_lado = 'esquerda') AS qt_direita_para_esquerda
FROM seq WHERE ds_lado_anterior IS NOT NULL GROUP BY 1, 2 ORDER BY 1, 2;

-- @t15a | Tema 15: candidatos pela parte da receita que veio de dinheiro público (fundos) — chance de se eleger, votos e gasto por voto
WITH v AS (SELECT id_candidatura, SUM(qt_votos_nominais) AS qt FROM votacao_candidato WHERE nr_turno = 1 GROUP BY 1),
b AS (
    SELECT r.nr_ano_eleicao, r.ds_cargo, r.cd_cargo, r.fl_eleito, r.vr_receita_total, COALESCE(v.qt, 0) AS qt_votos, r.vr_despesa_total,
           CASE WHEN r.vr_receita_total <= 0 THEN 0 WHEN r.vr_receita_publica = 0 THEN 1 WHEN r.vr_receita_publica < 0.5 * r.vr_receita_total THEN 2
                WHEN r.vr_receita_publica < 0.9 * r.vr_receita_total THEN 3 ELSE 4 END AS nr_faixa
    FROM vw_candidatura_resumo r LEFT JOIN v ON v.id_candidatura = r.id_candidatura
    WHERE r.nr_ano_eleicao IN (2022, 2024) AND r.cd_cargo IN (6, 7, 11, 13) AND (r.nr_ano_eleicao = 2022) = (r.cd_cargo IN (6, 7))
)
SELECT nr_ano_eleicao, ds_cargo, nr_faixa,
       ['sem receita declarada', 'só dinheiro privado', 'menos da metade pública', 'de metade a 90% pública', '90% ou mais pública'][nr_faixa + 1] AS ds_faixa,
       COUNT(*) AS qt_candidatos, COUNT_IF(fl_eleito) AS qt_eleitos, ROUND(100 * AVG(CAST(fl_eleito AS INT)), 2) AS pc_taxa_sucesso,
       ROUND(MEDIAN(vr_receita_total), 0) AS vr_receita_mediana, ROUND(MEDIAN(qt_votos), 0) AS qt_votos_mediano,
       ROUND(SUM(vr_despesa_total) / NULLIF(SUM(qt_votos), 0), 2) AS vr_gasto_por_voto
FROM b GROUP BY 1, 2, 3, 4 ORDER BY 1, 2, 3;

-- @t16a | Tema 16: os processos de registro das candidaturas, eleição a eleição — candidaturas inaptas (registro negado, cassado, cancelado ou renúncia), 1998 a 2022
-- É o que a Justiça Eleitoral julga para cada candidatura e o TSE publica por candidato (tabela situacao_registro). Até 2016 o TSE
-- traz o detalhe (indeferido, cassado, inelegível, renúncia...); de 2014 a 2022, só se a candidatura ficou apta ou inapta.
-- Processos criminais, de improbidade ou de contas não estão nos dados abertos do TSE. Em 2024 e 2026 o campo veio vazio.
WITH b AS (
    SELECT e.nr_ano_eleicao, e.tp_abrangencia, sr.ds_situacao_candidatura AS sit, sr.ds_detalhe_situacao AS det
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_registro sr ON sr.id_candidatura = c.id_candidatura
    WHERE c.cd_cargo IN (1, 3, 5, 6, 7, 8, 11, 13) AND e.nr_ano_eleicao BETWEEN 1998 AND 2022
)
SELECT nr_ano_eleicao, tp_abrangencia, COUNT(*) AS qt_candidaturas,
       SUM(CASE WHEN sit = 'INAPTO' OR det LIKE 'INDEFERIDO%' OR det LIKE 'CASSADO%' OR det IN ('INELEGÍVEL', 'CANCELADO', 'CANCELADO COM RECURSO', 'NÃO CONHECIMENTO DO PEDIDO')
                     OR det LIKE 'REN%NCIA' OR det LIKE 'FALECI%' OR sit LIKE 'INDEFERIDO%' OR sit LIKE 'CASSA%' OR sit LIKE '%REN%NCIA%' THEN 1 ELSE 0 END) AS qt_inaptas,
       SUM(CASE WHEN det LIKE 'INDEFERIDO%' OR det = 'INELEGÍVEL' OR sit LIKE 'INDEFERIDO%' THEN 1 ELSE 0 END) AS qt_indeferidas,
       SUM(CASE WHEN det LIKE 'CASSADO%' OR sit LIKE 'CASSA%' THEN 1 ELSE 0 END) AS qt_cassadas,
       SUM(CASE WHEN det LIKE 'REN%NCIA' OR sit LIKE '%REN%NCIA%' THEN 1 ELSE 0 END) AS qt_renuncias,
       COUNT(det) > 0 AS fl_tem_detalhe
FROM b GROUP BY 1, 2 ORDER BY 1;

-- @t16b | Tema 16: partido a partido — parte das candidaturas inaptas (registro negado, cassado, cancelado ou renúncia), 2020 e 2022 somadas, partidos com 2 mil candidaturas ou mais
WITH b AS (
    SELECT p.sg_partido, pa.ds_espectro, sr.ds_situacao_candidatura = 'INAPTO' AS fl_inapta
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_registro sr ON sr.id_candidatura = c.id_candidatura
    JOIN partido p ON p.id_partido = c.id_partido LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    WHERE e.nr_ano_eleicao IN (2020, 2022) AND c.cd_cargo IN (1, 3, 5, 6, 7, 8, 11, 13)
)
SELECT sg_partido, MODE(ds_espectro) AS ds_espectro, COUNT(*) AS qt_candidaturas, SUM(CAST(fl_inapta AS INT)) AS qt_inaptas,
       ROUND(100 * AVG(CAST(fl_inapta AS INT)), 2) AS pc_inaptas
FROM b GROUP BY 1 HAVING COUNT(*) >= 2000 ORDER BY pc_inaptas DESC;

-- @t16c | Tema 16: o tipo de processo (indeferimento, cassação, inelegibilidade, renúncia) e o voto em quem foi barrado, 2008, 2012 e 2016 (anos com o detalhe)
SELECT CASE WHEN c.cd_cargo IN (11, 13) THEN 'prefeito e vereador' ELSE 'cargos estaduais e federais' END AS ds_grupo,
       sr.ds_detalhe_situacao, COUNT(*) AS qt_candidaturas, SUM(CASE WHEN vt.qt > 0 THEN 1 ELSE 0 END) AS qt_com_votos_na_urna,
       SUM(COALESCE(vt.qt, 0)) AS qt_votos_recebidos
FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN situacao_registro sr ON sr.id_candidatura = c.id_candidatura
LEFT JOIN (SELECT id_candidatura, SUM(qt_votos_nominais) AS qt FROM votacao_candidato WHERE nr_turno = 1 GROUP BY 1) vt ON vt.id_candidatura = c.id_candidatura
WHERE e.nr_ano_eleicao IN (2008, 2012, 2016) AND c.cd_cargo IN (1, 3, 5, 6, 7, 8, 11, 13)
  AND (sr.ds_detalhe_situacao LIKE 'INDEFERIDO%' OR sr.ds_detalhe_situacao LIKE 'CASSADO%' OR sr.ds_detalhe_situacao = 'INELEGÍVEL' OR sr.ds_detalhe_situacao LIKE 'REN%NCIA')
GROUP BY 1, 2 ORDER BY 1, 3 DESC;
