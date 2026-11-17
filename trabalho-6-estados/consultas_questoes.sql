-- =====================================================================
-- Consultas das 12 questões - Grupo 6 (CE, ES, MT, PR, SC, TO)
-- Banco: eleicoes_g6 (MySQL 8.0+ / MariaDB 10.6+)
-- Cargos com campanha própria: 3 Governador, 5 Senador, 6 Dep. Federal,
-- 7 Dep. Estadual, 11 Prefeito, 13 Vereador. Presidente (1) fica fora das
-- análises financeiras porque sua campanha é nacional e não pertence ao recorte.
-- =====================================================================
USE eleicoes_g6;

-- Q1. Custo por cadeira: despesa total do partido dividida pelas cadeiras conquistadas
SELECT nr_ano_eleicao, ds_cargo, sg_partido,
       ROUND(SUM(vr_despesa_total), 2)                              AS vr_gasto_total,
       SUM(fl_eleito)                                               AS qt_cadeiras,
       ROUND(SUM(vr_despesa_total) / NULLIF(SUM(fl_eleito), 0), 2)   AS vr_custo_por_cadeira
FROM vw_candidatura_resumo
WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024)
  AND ds_cargo IN ('GOVERNADOR','SENADOR','DEPUTADO FEDERAL','DEPUTADO ESTADUAL','PREFEITO','VEREADOR')
GROUP BY nr_ano_eleicao, ds_cargo, sg_partido
HAVING SUM(fl_eleito) > 0
ORDER BY nr_ano_eleicao, ds_cargo, vr_custo_por_cadeira DESC;

-- Q2. Taxa de sucesso x dinheiro: candidatos em quintis de receita (1 = menos dinheiro)
WITH base AS (
    SELECT nr_ano_eleicao, ds_cargo, fl_eleito, vr_receita_total,
           NTILE(5) OVER (PARTITION BY nr_ano_eleicao, ds_cargo ORDER BY vr_receita_total) AS nr_quintil
    FROM vw_candidatura_resumo
    WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024)
      AND ds_cargo IN ('DEPUTADO FEDERAL','DEPUTADO ESTADUAL','PREFEITO','VEREADOR')
)
SELECT nr_ano_eleicao, ds_cargo, nr_quintil,
       COUNT(*)                          AS qt_candidatos,
       ROUND(AVG(vr_receita_total), 2)   AS vr_receita_media,
       ROUND(100 * AVG(fl_eleito), 2)    AS pc_taxa_sucesso
FROM base
GROUP BY nr_ano_eleicao, ds_cargo, nr_quintil
ORDER BY nr_ano_eleicao, ds_cargo, nr_quintil;

-- Q3. Perfil do município (IBGE) x partido mais votado x abstenção (2022 governador, 2024 prefeito)
WITH ind AS (
    SELECT cd_municipio_tse, qt_populacao, vr_pib_per_capita,
           CASE WHEN qt_populacao < 20000  THEN '1 PEQUENO (<20 mil)'
                WHEN qt_populacao < 100000 THEN '2 MEDIO (20-100 mil)'
                ELSE '3 GRANDE (>100 mil)' END                          AS ds_porte,
           CASE NTILE(3) OVER (ORDER BY vr_pib_per_capita)
                WHEN 1 THEN '1 POBRE' WHEN 2 THEN '2 INTERMEDIARIO' ELSE '3 RICO' END AS ds_renda
    FROM vw_indicador_atual
),
abst AS (
    SELECT cp.cd_municipio_tse, e.nr_ano_eleicao,
           SUM(cp.qt_abstencoes) / SUM(cp.qt_aptos) AS tx_abstencao, SUM(cp.qt_aptos) AS qt_eleitores
    FROM comparecimento cp
    JOIN eleicao e ON e.id_eleicao = cp.id_eleicao
    WHERE cp.nr_turno = 1 AND cp.cd_cargo IN (3, 11)
    GROUP BY cp.cd_municipio_tse, e.nr_ano_eleicao
),
mais_votado AS (
    SELECT * FROM (
        SELECT vc.cd_municipio_tse, e.nr_ano_eleicao, p.sg_partido, p.ds_espectro,
               ROW_NUMBER() OVER (PARTITION BY vc.cd_municipio_tse, e.nr_ano_eleicao
                                  ORDER BY SUM(vc.qt_votos_nominais) DESC, p.sg_partido) AS rk  -- desempate fixo (correção 15/10)
        FROM votacao_candidato vc
        JOIN candidatura c ON c.id_candidatura = vc.id_candidatura
        JOIN eleicao e     ON e.id_eleicao     = c.id_eleicao
        JOIN partido p     ON p.id_partido     = c.id_partido
        WHERE vc.nr_turno = 1
          AND ((e.nr_ano_eleicao = 2024 AND c.cd_cargo = 11) OR (e.nr_ano_eleicao = 2022 AND c.cd_cargo = 3))
        GROUP BY vc.cd_municipio_tse, e.nr_ano_eleicao, p.sg_partido, p.ds_espectro
    ) x WHERE rk = 1
)
SELECT mv.nr_ano_eleicao, i.ds_porte, i.ds_renda,
       COUNT(*)                                  AS qt_municipios,
       ROUND(AVG(i.vr_pib_per_capita), 0)        AS vr_pib_pc_medio,
       ROUND(100 * AVG(a.tx_abstencao), 2)       AS pc_abstencao_media,
       ROUND(100 * AVG(mv.ds_espectro IN ('DIREITA','CENTRO-DIREITA')), 1) AS pc_mun_direita,
       ROUND(100 * AVG(mv.ds_espectro IN ('ESQUERDA','CENTRO-ESQUERDA')), 1) AS pc_mun_esquerda
FROM mais_votado mv
JOIN ind  i ON i.cd_municipio_tse = mv.cd_municipio_tse
JOIN abst a ON a.cd_municipio_tse = mv.cd_municipio_tse AND a.nr_ano_eleicao = mv.nr_ano_eleicao
GROUP BY mv.nr_ano_eleicao, i.ds_porte, i.ds_renda
ORDER BY mv.nr_ano_eleicao, i.ds_porte, i.ds_renda;

-- Q3b. Partido mais votado para prefeito em 2024, por porte do município
WITH ind AS (
    SELECT cd_municipio_tse,
           CASE WHEN qt_populacao < 20000 THEN '1 PEQUENO' WHEN qt_populacao < 100000 THEN '2 MEDIO' ELSE '3 GRANDE' END AS ds_porte
    FROM vw_indicador_atual
), mv AS (
    SELECT * FROM (
        SELECT vc.cd_municipio_tse, p.sg_partido,
               ROW_NUMBER() OVER (PARTITION BY vc.cd_municipio_tse ORDER BY SUM(vc.qt_votos_nominais) DESC, p.sg_partido) rk  -- desempate fixo (correção 15/10)
        FROM votacao_candidato vc
        JOIN candidatura c ON c.id_candidatura = vc.id_candidatura
        JOIN eleicao e ON e.id_eleicao = c.id_eleicao
        JOIN partido p ON p.id_partido = c.id_partido
        WHERE e.nr_ano_eleicao = 2024 AND c.cd_cargo = 11 AND vc.nr_turno = 1
        GROUP BY vc.cd_municipio_tse, p.sg_partido) x WHERE rk = 1
)
SELECT i.ds_porte, mv.sg_partido, COUNT(*) AS qt_municipios
FROM mv JOIN ind i ON i.cd_municipio_tse = mv.cd_municipio_tse
GROUP BY i.ds_porte, mv.sg_partido
ORDER BY i.ds_porte, qt_municipios DESC;

-- Q4. Grau de instrução do candidato x população do município (2024 - prefeito e vereador)
SELECT CASE WHEN ia.qt_populacao < 20000  THEN '1 PEQUENO (<20 mil)'
            WHEN ia.qt_populacao < 100000 THEN '2 MEDIO (20-100 mil)' ELSE '3 GRANDE (>100 mil)' END AS ds_porte,
       gi.nr_ordem, gi.ds_grau_instrucao,
       COUNT(*)                         AS qt_candidatos,
       SUM(st.fl_eleito)                AS qt_eleitos
FROM candidatura c
JOIN eleicao e         ON e.id_eleicao = c.id_eleicao
JOIN grau_instrucao gi ON gi.cd_grau_instrucao = c.cd_grau_instrucao
JOIN vw_indicador_atual ia ON ia.cd_municipio_tse = c.cd_municipio_tse
LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
WHERE e.nr_ano_eleicao = 2024 AND c.cd_cargo IN (11, 13)
GROUP BY ds_porte, gi.nr_ordem, gi.ds_grau_instrucao
ORDER BY ds_porte, gi.nr_ordem;

-- Q4b. Grau de instrução dos candidatos a deputado em 2022, por UF
SELECT c.sg_uf, ROUND(100 * AVG(gi.nr_ordem = 8), 1) AS pc_superior_candidatos,
       ROUND(100 * SUM(gi.nr_ordem = 8 AND st.fl_eleito) / NULLIF(SUM(st.fl_eleito), 0), 1) AS pc_superior_eleitos
FROM candidatura c
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
JOIN grau_instrucao gi ON gi.cd_grau_instrucao = c.cd_grau_instrucao
LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
WHERE e.nr_ano_eleicao = 2022 AND c.cd_cargo IN (6, 7)
GROUP BY c.sg_uf ORDER BY c.sg_uf;

-- Q5. Votos para legenda x partido (cargos proporcionais)
SELECT e.nr_ano_eleicao, cg.ds_cargo, p.sg_partido,
       SUM(vp.qt_votos_legenda)                       AS qt_votos_legenda,
       SUM(vp.qt_votos_nominais)                      AS qt_votos_nominais,
       ROUND(100 * SUM(vp.qt_votos_legenda) /
             NULLIF(SUM(vp.qt_votos_legenda + vp.qt_votos_nominais), 0), 2) AS pc_legenda
FROM votacao_partido vp
JOIN eleicao e  ON e.id_eleicao = vp.id_eleicao
JOIN cargo cg   ON cg.cd_cargo  = vp.cd_cargo
JOIN partido p  ON p.id_partido = vp.id_partido
WHERE vp.nr_turno = 1 AND vp.cd_cargo IN (6, 7, 13)
GROUP BY e.nr_ano_eleicao, cg.ds_cargo, p.sg_partido
HAVING SUM(vp.qt_votos_legenda + vp.qt_votos_nominais) > 0
ORDER BY e.nr_ano_eleicao, cg.ds_cargo, pc_legenda DESC;

-- Q6. Propostas (Prefeito, Governador, Presidente) -> texto para nuvem de palavras
--     (tabela proposta_governo: texto extraído dos PDFs publicados pelo TSE)
SELECT e.nr_ano_eleicao, cg.ds_cargo, c.sg_uf, c.nm_urna, p.sg_partido, p.ds_espectro, pg.tx_proposta
FROM proposta_governo pg
JOIN candidatura c ON c.id_candidatura = pg.id_candidatura
JOIN eleicao e     ON e.id_eleicao     = c.id_eleicao
JOIN cargo cg      ON cg.cd_cargo      = c.cd_cargo
JOIN partido p     ON p.id_partido     = c.id_partido
WHERE c.cd_cargo IN (1, 3, 11);

-- Q6b. Temas das propostas: % das propostas que citam cada tema, por cargo e bloco ideológico
--      (a collation utf8mb4 ignora acento e maiúscula: '%saude%' encontra 'Saúde')
SELECT cg.ds_cargo,
       CASE WHEN p.ds_espectro IN ('ESQUERDA','CENTRO-ESQUERDA') THEN 'ESQUERDA + C.-ESQ.'
            WHEN p.ds_espectro IN ('DIREITA','CENTRO-DIREITA') THEN 'DIREITA + C.-DIR.'
            ELSE 'CENTRO' END                                                   AS ds_bloco,
       COUNT(*)                                                                AS qt_propostas,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%seguranca publica%'), 1)          AS pc_seguranca,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%emprego%'), 1)                    AS pc_emprego,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%meio ambiente%'), 1)              AS pc_meio_ambiente,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%agronegocio%'), 1)                AS pc_agronegocio,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%turismo%'), 1)                    AS pc_turismo,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%habitacao%' OR pg.tx_proposta LIKE '%moradia%'), 1) AS pc_moradia,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%saneamento%'), 1)                 AS pc_saneamento,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%mulher%'), 1)                     AS pc_mulheres,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%igualdade racial%' OR pg.tx_proposta LIKE '%racismo%'), 1) AS pc_racial,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%participacao popular%' OR pg.tx_proposta LIKE '%orcamento participativo%'), 1) AS pc_participacao,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%familia%'), 1)                    AS pc_familia,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%empreendedor%'), 1)               AS pc_empreendedorismo,
       ROUND(100 * AVG(pg.tx_proposta LIKE '%tecnologia%' OR pg.tx_proposta LIKE '%digital%'), 1) AS pc_tecnologia
FROM proposta_governo pg
JOIN candidatura c ON c.id_candidatura = pg.id_candidatura
JOIN cargo cg      ON cg.cd_cargo      = c.cd_cargo
JOIN partido p     ON p.id_partido     = c.id_partido
WHERE c.cd_cargo IN (3, 11)
GROUP BY cg.ds_cargo, ds_bloco
ORDER BY cg.ds_cargo, ds_bloco;

-- Q7. Jovens (até 29 anos na posse - Estatuto da Juventude) x não jovens x espectro político
SELECT r.nr_ano_eleicao,
       CASE WHEN r.nr_idade_posse <= 29 THEN 'JOVEM' ELSE 'NAO JOVEM' END AS ds_faixa,
       COALESCE(r.ds_espectro, 'NAO CLASSIFICADO')                        AS ds_espectro,
       COUNT(*)                          AS qt_candidatos,
       SUM(r.fl_eleito)                  AS qt_eleitos,
       ROUND(100 * AVG(r.fl_eleito), 2)  AS pc_sucesso
FROM vw_candidatura_resumo r
WHERE r.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND r.nr_idade_posse IS NOT NULL
  AND r.ds_cargo IN ('DEPUTADO FEDERAL','DEPUTADO ESTADUAL','PREFEITO','VEREADOR')
GROUP BY r.nr_ano_eleicao, ds_faixa, ds_espectro
ORDER BY r.nr_ano_eleicao, ds_faixa, ds_espectro;

-- Q7b. Jovens x porte do município (2024, vereador)
SELECT CASE WHEN ia.qt_populacao < 20000 THEN '1 PEQUENO' WHEN ia.qt_populacao < 100000 THEN '2 MEDIO' ELSE '3 GRANDE' END AS ds_porte,
       ROUND(100 * AVG(c.nr_idade_posse <= 29), 2) AS pc_jovens_candidatos,
       ROUND(100 * SUM(c.nr_idade_posse <= 29 AND st.fl_eleito) / NULLIF(SUM(st.fl_eleito), 0), 2) AS pc_jovens_eleitos
FROM candidatura c
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
JOIN vw_indicador_atual ia ON ia.cd_municipio_tse = c.cd_municipio_tse
LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
WHERE e.nr_ano_eleicao = 2024 AND c.cd_cargo = 13 AND c.nr_idade_posse IS NOT NULL
GROUP BY ds_porte ORDER BY ds_porte;

-- Q8. Doações de pessoa jurídica x espectro político (2012 e 2014; vedadas a partir de 2016)
SELECT e.nr_ano_eleicao, COALESCE(p.ds_espectro, 'NAO CLASSIFICADO') AS ds_espectro,
       ROUND(SUM(CASE WHEN rc.tp_doador = 'PJ' THEN rc.vr_receita ELSE 0 END), 2) AS vr_doacao_pj,
       ROUND(SUM(rc.vr_receita), 2)                                              AS vr_receita_total,
       ROUND(100 * SUM(CASE WHEN rc.tp_doador = 'PJ' THEN rc.vr_receita ELSE 0 END)
             / NULLIF(SUM(rc.vr_receita), 0), 2)                                AS pc_pj
FROM receita rc
JOIN candidatura c ON c.id_candidatura = rc.id_candidatura
JOIN eleicao e     ON e.id_eleicao     = c.id_eleicao
JOIN partido p     ON p.id_partido     = c.id_partido
WHERE e.nr_ano_eleicao <= 2016 AND c.cd_cargo <> 1
GROUP BY e.nr_ano_eleicao, ds_espectro
ORDER BY e.nr_ano_eleicao, vr_doacao_pj DESC;

-- Q9. Viés político do município na linha do tempo (1º turno: Presidente nas gerais, Prefeito nas municipais)
WITH votos AS (
    SELECT vc.cd_municipio_tse, e.nr_ano_eleicao,
           SUM(CASE WHEN p.ds_espectro IN ('DIREITA','CENTRO-DIREITA') THEN vc.qt_votos_nominais ELSE 0 END) AS v_dir,
           SUM(CASE WHEN p.ds_espectro IN ('ESQUERDA','CENTRO-ESQUERDA') THEN vc.qt_votos_nominais ELSE 0 END) AS v_esq,
           SUM(vc.qt_votos_nominais) AS v_tot
    FROM votacao_candidato vc
    JOIN candidatura c ON c.id_candidatura = vc.id_candidatura
    JOIN eleicao e     ON e.id_eleicao     = c.id_eleicao
    JOIN partido p     ON p.id_partido     = c.id_partido
    WHERE vc.nr_turno = 1
      AND ((e.tp_abrangencia = 'MUNICIPAL' AND c.cd_cargo = 11) OR (e.tp_abrangencia = 'GERAL' AND c.cd_cargo = 1))
    GROUP BY vc.cd_municipio_tse, e.nr_ano_eleicao
)
SELECT m.sg_uf, v.nr_ano_eleicao,
       ROUND(100 * SUM(v.v_dir) / SUM(v.v_tot), 1) AS pc_votos_direita,
       ROUND(100 * SUM(v.v_esq) / SUM(v.v_tot), 1) AS pc_votos_esquerda,
       SUM(v.v_dir > v.v_esq)                      AS qt_mun_maioria_direita,
       SUM(v.v_esq > v.v_dir)                      AS qt_mun_maioria_esquerda
FROM votos v
JOIN municipio m ON m.cd_municipio_tse = v.cd_municipio_tse
GROUP BY m.sg_uf, v.nr_ano_eleicao
ORDER BY m.sg_uf, v.nr_ano_eleicao;

-- Q10. Eleito / não eleito x recursos públicos x recursos privados
SELECT nr_ano_eleicao, ds_cargo,
       CASE WHEN fl_eleito THEN 'ELEITO' ELSE 'NAO ELEITO' END AS ds_resultado,
       COUNT(*)                              AS qt_candidatos,
       ROUND(AVG(vr_receita_publica), 2)     AS vr_publico_medio,
       ROUND(AVG(vr_receita_privada), 2)     AS vr_privado_medio,
       ROUND(100 * SUM(vr_receita_publica) / NULLIF(SUM(vr_receita_total), 0), 2) AS pc_publico
FROM vw_candidatura_resumo
WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024)
  AND ds_cargo IN ('DEPUTADO FEDERAL','DEPUTADO ESTADUAL','PREFEITO','VEREADOR')
GROUP BY nr_ano_eleicao, ds_cargo, ds_resultado
ORDER BY nr_ano_eleicao, ds_cargo, ds_resultado;

-- Q11. Onde o candidato investe em propaganda (categorias; o texto livre alimenta a nuvem de palavras)
SELECT e.nr_ano_eleicao, d.ds_origem_despesa,
       COUNT(*)                AS qt_lancamentos,
       ROUND(SUM(d.vr_despesa), 2) AS vr_total,
       ROUND(100 * SUM(d.vr_despesa) / SUM(SUM(d.vr_despesa)) OVER (PARTITION BY e.nr_ano_eleicao), 2) AS pc_ano
FROM despesa d
JOIN candidatura c ON c.id_candidatura = d.id_candidatura
JOIN eleicao e     ON e.id_eleicao     = c.id_eleicao
WHERE e.nr_ano_eleicao IN (2018, 2020, 2022, 2024) AND c.cd_cargo <> 1
GROUP BY e.nr_ano_eleicao, d.ds_origem_despesa
ORDER BY e.nr_ano_eleicao, vr_total DESC;

-- Q12a. Trajetória de cada político (2002 a 2026)
SELECT ps.id_pessoa, ps.nm_pessoa,
       MIN(e.nr_ano_eleicao)  AS nr_primeira_eleicao,
       MAX(e.nr_ano_eleicao)  AS nr_ultima_eleicao,
       COUNT(*)               AS qt_candidaturas,
       SUM(st.fl_eleito)      AS qt_vitorias,
       GROUP_CONCAT(CONCAT(e.nr_ano_eleicao, ' ', cg.ds_cargo, ' (', pt.sg_partido, ') ',
                           IF(st.fl_eleito, 'ELEITO', 'NAO ELEITO'))
                    ORDER BY e.nr_ano_eleicao SEPARATOR ' -> ') AS ds_trajetoria
FROM pessoa ps
JOIN candidatura c ON c.id_pessoa  = ps.id_pessoa
JOIN eleicao e     ON e.id_eleicao = c.id_eleicao
JOIN cargo cg      ON cg.cd_cargo  = c.cd_cargo
JOIN partido pt    ON pt.id_partido = c.id_partido
LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
WHERE c.cd_cargo IN (1, 3, 5, 6, 7, 11, 13)
GROUP BY ps.id_pessoa, ps.nm_pessoa
HAVING qt_candidaturas > 1
ORDER BY qt_vitorias DESC, qt_candidaturas DESC
LIMIT 50;

-- Q12b. Sobrevivência na carreira: dos eleitos no ano X, quantos se elegem de novo (qualquer cargo) em X+4 e X+8
WITH eleitos AS (
    SELECT DISTINCT c.id_pessoa, e.nr_ano_eleicao AS nr_ano, e.tp_abrangencia
    FROM candidatura c
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    WHERE st.fl_eleito AND c.cd_cargo IN (3, 5, 6, 7, 11, 13)
)
SELECT a.nr_ano, a.tp_abrangencia,
       COUNT(*)                                     AS qt_eleitos,
       ROUND(100 * AVG(b.id_pessoa IS NOT NULL), 2) AS pc_eleito_de_novo_4_anos,
       ROUND(100 * AVG(b8.id_pessoa IS NOT NULL), 2) AS pc_eleito_de_novo_8_anos
FROM eleitos a
LEFT JOIN eleitos b  ON b.id_pessoa  = a.id_pessoa AND b.nr_ano  = a.nr_ano + 4
LEFT JOIN eleitos b8 ON b8.id_pessoa = a.id_pessoa AND b8.nr_ano = a.nr_ano + 8
WHERE a.nr_ano <= 2022
GROUP BY a.nr_ano, a.tp_abrangencia
ORDER BY a.nr_ano;
