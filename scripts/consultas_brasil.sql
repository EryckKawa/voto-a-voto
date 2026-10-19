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

-- @q5 | Voto de legenda (só no número do partido) nos cargos proporcionais, 2000 a 2026
SELECT e.nr_ano_eleicao, cg.ds_cargo, SUM(vp.qt_votos_legenda) AS qt_votos_legenda, SUM(vp.qt_votos_nominais) AS qt_votos_nominais,
       ROUND(100 * SUM(vp.qt_votos_legenda) / NULLIF(SUM(vp.qt_votos_legenda + vp.qt_votos_nominais), 0), 2) AS pc_legenda
FROM votacao_partido vp JOIN eleicao e ON e.id_eleicao = vp.id_eleicao JOIN cargo cg ON cg.cd_cargo = vp.cd_cargo
WHERE vp.nr_turno = 1 AND vp.cd_cargo IN (6, 7, 13) AND vp.qt_votos_legenda IS NOT NULL
GROUP BY e.nr_ano_eleicao, cg.ds_cargo ORDER BY cg.ds_cargo, e.nr_ano_eleicao;

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

-- @q10 | Eleito x não eleito: dinheiro público (fundos) e privado, média por candidato
SELECT nr_ano_eleicao, ds_cargo, CASE WHEN fl_eleito THEN 'eleito' ELSE 'não eleito' END AS ds_resultado, COUNT(*) AS qt_candidatos,
       ROUND(AVG(vr_receita_publica), 2) AS vr_publico_medio, ROUND(AVG(vr_receita_privada), 2) AS vr_privado_medio,
       ROUND(100 * SUM(vr_receita_publica) / NULLIF(SUM(vr_receita_total), 0), 2) AS pc_publico
FROM vw_candidatura_resumo
WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND cd_cargo IN (6, 7, 11, 13)
GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;

-- @q11 | Onde o candidato gasta: categorias de despesa contratada, por ano
SELECT e.nr_ano_eleicao, d.ds_origem_despesa, COUNT(*) AS qt_lancamentos, ROUND(SUM(d.vr_despesa), 0) AS vr_total,
       ROUND(100 * SUM(d.vr_despesa) / SUM(SUM(d.vr_despesa)) OVER (PARTITION BY e.nr_ano_eleicao), 2) AS pc_ano
FROM despesa d JOIN candidatura c ON c.id_candidatura = d.id_candidatura JOIN eleicao e ON e.id_eleicao = c.id_eleicao
WHERE e.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND c.cd_cargo <> 1
GROUP BY 1, 2 QUALIFY ROW_NUMBER() OVER (PARTITION BY e.nr_ano_eleicao ORDER BY SUM(d.vr_despesa) DESC) <= 12
ORDER BY 1, vr_total DESC;

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
