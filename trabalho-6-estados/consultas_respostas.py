# -*- coding: utf-8 -*-
"""Executa as 12 consultas do trabalho no banco eleicoes_g6.duckdb e exporta CSVs.
Mesma semantica de consultas_questoes.sql (MySQL), com adaptacoes de dialeto:
GROUP_CONCAT -> string_agg, IF -> CASE WHEN, agregacao de boolean com CASE.
"""
import json
from pathlib import Path

import duckdb
import pandas as pd

OUT = Path(__file__).resolve().parent
CSV = OUT / "csv"
CSV.mkdir(exist_ok=True)
con = duckdb.connect(str(OUT / "eleicoes_g6.duckdb"), read_only=True)

resultados = {}

def rodar(nome, sql):
    df = con.execute(sql).fetchdf()
    df.to_csv(CSV / f"{nome}.csv", index=False, encoding="utf-8-sig")
    resultados[nome] = len(df)
    print(f"{nome}: {len(df)} linhas -> csv/{nome}.csv", flush=True)
    return df

# ---------------------------------------------------------------- Q1
q1 = rodar("q1_custo_por_cadeira", """
SELECT nr_ano_eleicao, ds_cargo, sg_partido,
       ROUND(SUM(vr_despesa_total), 2) AS vr_gasto_total,
       SUM(CASE WHEN fl_eleito THEN 1 ELSE 0 END) AS qt_cadeiras,
       ROUND(SUM(vr_despesa_total) / NULLIF(SUM(CASE WHEN fl_eleito THEN 1 ELSE 0 END), 0), 2)
            AS vr_custo_por_cadeira
FROM vw_candidatura_resumo
WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024)
GROUP BY nr_ano_eleicao, ds_cargo, sg_partido
HAVING SUM(CASE WHEN fl_eleito THEN 1 ELSE 0 END) > 0
ORDER BY nr_ano_eleicao, ds_cargo, vr_custo_por_cadeira DESC
""")

# ---------------------------------------------------------------- Q2
q2 = rodar("q2_sucesso_por_quintil", """
WITH base AS (
    SELECT nr_ano_eleicao, ds_cargo, CASE WHEN fl_eleito THEN 1 ELSE 0 END AS fl_eleito,
           vr_receita_total,
           NTILE(5) OVER (PARTITION BY nr_ano_eleicao, ds_cargo
                          ORDER BY vr_receita_total) AS nr_quintil
    FROM vw_candidatura_resumo
    WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024)
)
SELECT nr_ano_eleicao, ds_cargo, nr_quintil,
       COUNT(*) AS qt_candidatos,
       ROUND(AVG(vr_receita_total), 2) AS vr_receita_media,
       ROUND(100 * AVG(fl_eleito), 2) AS pc_taxa_sucesso
FROM base
GROUP BY nr_ano_eleicao, ds_cargo, nr_quintil
ORDER BY nr_ano_eleicao, ds_cargo, nr_quintil
""")

# agregado por quintil (todos os cargos) para leitura rápida
q2g = rodar("q2_sucesso_por_quintil_geral", """
WITH base AS (
    SELECT nr_ano_eleicao, CASE WHEN fl_eleito THEN 1 ELSE 0 END AS fl_eleito, vr_receita_total,
           NTILE(5) OVER (PARTITION BY nr_ano_eleicao ORDER BY vr_receita_total) AS nr_quintil
    FROM vw_candidatura_resumo
    WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024)
)
SELECT nr_ano_eleicao, nr_quintil, COUNT(*) AS qt_candidatos,
       ROUND(AVG(vr_receita_total), 2) AS vr_receita_media,
       ROUND(100 * AVG(fl_eleito), 2) AS pc_taxa_sucesso
FROM base GROUP BY nr_ano_eleicao, nr_quintil
ORDER BY nr_ano_eleicao, nr_quintil
""")

# ---------------------------------------------------------------- Q3
q3 = rodar("q3_perfil_municipio_partido_abstencao", """
WITH ind AS (
    SELECT cd_municipio_tse, sg_uf, qt_populacao, vr_pib_per_capita, vr_idhm,
           CASE WHEN qt_populacao < 20000 THEN 'PEQUENO'
                WHEN qt_populacao < 100000 THEN 'MEDIO' ELSE 'GRANDE' END AS ds_porte,
           CASE NTILE(3) OVER (ORDER BY vr_pib_per_capita)
                WHEN 1 THEN 'POBRE' WHEN 2 THEN 'INTERMEDIARIO' ELSE 'RICO' END AS ds_renda
    FROM vw_indicador_atual
),
abst AS (
    SELECT cp.cd_municipio_tse, e.nr_ano_eleicao,
           SUM(cp.qt_abstencoes)::DOUBLE / SUM(cp.qt_aptos) AS tx_abstencao
    FROM comparecimento cp
    JOIN eleicao e ON e.id_eleicao = cp.id_eleicao
    JOIN cargo cg ON cg.cd_cargo = cp.cd_cargo
    WHERE cp.nr_turno = 1 AND cg.ds_cargo IN ('PREFEITO', 'GOVERNADOR')
    GROUP BY cp.cd_municipio_tse, e.nr_ano_eleicao
),
mais_votado AS (
    SELECT * FROM (
        SELECT vc.cd_municipio_tse, e.nr_ano_eleicao, p.sg_partido,
               ROW_NUMBER() OVER (PARTITION BY vc.cd_municipio_tse, e.nr_ano_eleicao
                                  ORDER BY SUM(vc.qt_votos_nominais) DESC) AS rk
        FROM votacao_candidato vc
        JOIN candidatura c ON c.sq_candidato = vc.sq_candidato
        JOIN eleicao e ON e.id_eleicao = c.id_eleicao
        JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
        JOIN partido p ON p.id_partido = c.id_partido
        WHERE vc.nr_turno = 1
          AND ((e.nr_ano_eleicao = 2024 AND cg.ds_cargo = 'PREFEITO')
            OR (e.nr_ano_eleicao = 2022 AND cg.ds_cargo = 'GOVERNADOR'))
        GROUP BY vc.cd_municipio_tse, e.nr_ano_eleicao, p.sg_partido
    ) x WHERE rk = 1
)
SELECT mv.nr_ano_eleicao, i.ds_porte, i.ds_renda, mv.sg_partido,
       COUNT(*) AS qt_municipios,
       ROUND(AVG(i.vr_idhm), 3) AS vr_idhm_medio,
       ROUND(100 * AVG(a.tx_abstencao), 2) AS pc_abstencao_media
FROM mais_votado mv
JOIN ind i ON i.cd_municipio_tse = mv.cd_municipio_tse
JOIN abst a ON a.cd_municipio_tse = mv.cd_municipio_tse AND a.nr_ano_eleicao = mv.nr_ano_eleicao
GROUP BY mv.nr_ano_eleicao, i.ds_porte, i.ds_renda, mv.sg_partido
ORDER BY mv.nr_ano_eleicao, i.ds_porte, i.ds_renda, qt_municipios DESC
""")

# ---------------------------------------------------------------- Q4
q4 = rodar("q4_instrucao_x_porte_2024", """
WITH cand24 AS (
    SELECT c.sq_candidato, c.cd_municipio_tse, c.cd_grau_instrucao,
           CASE WHEN st.fl_eleito THEN 1 ELSE 0 END AS fl_eleito
    FROM candidatura c
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    LEFT JOIN situacao_totalizacao st ON st.cd_sit_tot_turno = c.cd_sit_tot_turno
    WHERE e.nr_ano_eleicao = 2024
)
SELECT CASE WHEN ia.qt_populacao < 20000 THEN 'PEQUENO'
            WHEN ia.qt_populacao < 100000 THEN 'MEDIO' ELSE 'GRANDE' END AS ds_porte,
       gi.ds_grau_instrucao, gi.nr_ordem,
       COUNT(*) AS qt_candidatos,
       SUM(fl_eleito) AS qt_eleitos,
       ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY
             CASE WHEN ia.qt_populacao < 20000 THEN 'PEQUENO'
                  WHEN ia.qt_populacao < 100000 THEN 'MEDIO' ELSE 'GRANDE' END), 2) AS pc_no_porte
FROM cand24 c
JOIN grau_instrucao gi ON gi.cd_grau_instrucao = c.cd_grau_instrucao
JOIN vw_indicador_atual ia ON ia.cd_municipio_tse = c.cd_municipio_tse
GROUP BY ds_porte, gi.ds_grau_instrucao, gi.nr_ordem
ORDER BY ds_porte, gi.nr_ordem
""")

# ---------------------------------------------------------------- Q5
q5 = rodar("q5_votos_legenda_partido", """
SELECT e.nr_ano_eleicao, cg.ds_cargo, p.sg_partido,
       SUM(vp.qt_votos_legenda) AS qt_votos_legenda,
       SUM(vp.qt_votos_nominais) AS qt_votos_nominais,
       ROUND(100 * SUM(vp.qt_votos_legenda) /
             NULLIF(SUM(vp.qt_votos_legenda + vp.qt_votos_nominais), 0), 2) AS pc_legenda
FROM votacao_partido vp
JOIN eleicao e ON e.id_eleicao = vp.id_eleicao
JOIN cargo cg ON cg.cd_cargo = vp.cd_cargo
JOIN partido p ON p.id_partido = vp.id_partido
WHERE vp.nr_turno = 1 AND e.nr_ano_eleicao IN (2018, 2020, 2022, 2024)
GROUP BY e.nr_ano_eleicao, cg.ds_cargo, p.sg_partido
ORDER BY e.nr_ano_eleicao, cg.ds_cargo, pc_legenda DESC
""")
q5g = rodar("q5_legenda_por_ano_cargo", """
SELECT e.nr_ano_eleicao, cg.ds_cargo,
       SUM(vp.qt_votos_legenda) AS qt_votos_legenda,
       SUM(vp.qt_votos_nominais + vp.qt_votos_legenda) AS qt_total,
       ROUND(100 * SUM(vp.qt_votos_legenda) /
             NULLIF(SUM(vp.qt_votos_legenda + vp.qt_votos_nominais), 0), 2) AS pc_legenda
FROM votacao_partido vp
JOIN eleicao e ON e.id_eleicao = vp.id_eleicao
JOIN cargo cg ON cg.cd_cargo = vp.cd_cargo
WHERE vp.nr_turno = 1 AND e.nr_ano_eleicao IN (2018, 2020, 2022, 2024)
GROUP BY e.nr_ano_eleicao, cg.ds_cargo
ORDER BY e.nr_ano_eleicao, cg.ds_cargo
""")

# ---------------------------------------------------------------- Q6 (propostas)
q6 = con.execute("SELECT COUNT(*) FROM proposta_governo").fetchone()[0]
resultados["q6_propostas_registros"] = q6
print(f"q6: proposta_governo tem {q6} registros (dataset nao publicado pelo TSE em CSV)", flush=True)

# ---------------------------------------------------------------- Q7
q7 = rodar("q7_jovem_espectro_porte", """
SELECT r.nr_ano_eleicao,
       CASE WHEN r.nr_idade_posse <= 29 THEN 'JOVEM' ELSE 'NAO JOVEM' END AS ds_faixa,
       COALESCE(r.ds_espectro, 'NAO CLASSIFICADO') AS ds_espectro,
       CASE WHEN ia.qt_populacao IS NULL THEN 'ESTADUAL/FEDERAL'
            WHEN ia.qt_populacao < 20000 THEN 'PEQUENO'
            WHEN ia.qt_populacao < 100000 THEN 'MEDIO' ELSE 'GRANDE' END AS ds_porte,
       COUNT(*) AS qt_candidatos,
       SUM(CASE WHEN r.fl_eleito THEN 1 ELSE 0 END) AS qt_eleitos,
       ROUND(100 * AVG(CASE WHEN r.fl_eleito THEN 1.0 ELSE 0 END), 2) AS pc_sucesso
FROM vw_candidatura_resumo r
LEFT JOIN vw_indicador_atual ia ON ia.cd_municipio_tse = r.cd_municipio_tse
WHERE r.nr_ano_eleicao IN (2018, 2020, 2022, 2024)
GROUP BY r.nr_ano_eleicao, ds_faixa, ds_espectro, ds_porte
ORDER BY r.nr_ano_eleicao, ds_faixa, ds_espectro
""")
q7g = rodar("q7_jovem_geral", """
SELECT r.nr_ano_eleicao,
       CASE WHEN r.nr_idade_posse <= 29 THEN 'JOVEM' ELSE 'NAO JOVEM' END AS ds_faixa,
       COUNT(*) AS qt_candidatos,
       SUM(CASE WHEN r.fl_eleito THEN 1 ELSE 0 END) AS qt_eleitos,
       ROUND(100 * AVG(CASE WHEN r.fl_eleito THEN 1.0 ELSE 0 END), 2) AS pc_sucesso
FROM vw_candidatura_resumo r
WHERE r.nr_ano_eleicao IN (2018, 2020, 2022, 2024)
GROUP BY r.nr_ano_eleicao, ds_faixa
ORDER BY r.nr_ano_eleicao, ds_faixa
""")

# ---------------------------------------------------------------- Q8
q8 = rodar("q8_doacao_pj_espectro", """
SELECT e.nr_ano_eleicao, COALESCE(p.ds_espectro, 'NAO CLASSIFICADO') AS ds_espectro,
       ROUND(SUM(CASE WHEN rc.tp_doador = 'PJ' THEN rc.vr_receita ELSE 0 END), 2) AS vr_doacao_pj,
       ROUND(SUM(rc.vr_receita), 2) AS vr_receita_total,
       ROUND(100 * SUM(CASE WHEN rc.tp_doador = 'PJ' THEN rc.vr_receita ELSE 0 END)
             / NULLIF(SUM(rc.vr_receita), 0), 2) AS pc_pj
FROM receita rc
JOIN candidatura c ON c.sq_candidato = rc.sq_candidato
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
JOIN partido p ON p.id_partido = c.id_partido
WHERE e.nr_ano_eleicao <= 2016
GROUP BY e.nr_ano_eleicao, ds_espectro
ORDER BY e.nr_ano_eleicao, vr_doacao_pj DESC
""")
q8g = rodar("q8_doacao_pj_por_ano", """
SELECT e.nr_ano_eleicao,
       ROUND(SUM(CASE WHEN rc.tp_doador = 'PJ' THEN rc.vr_receita ELSE 0 END), 2) AS vr_doacao_pj,
       ROUND(SUM(CASE WHEN rc.tp_doador = 'PF' THEN rc.vr_receita ELSE 0 END), 2) AS vr_doacao_pf,
       ROUND(SUM(rc.vr_receita), 2) AS vr_receita_total,
       ROUND(100 * SUM(CASE WHEN rc.tp_doador = 'PJ' THEN rc.vr_receita ELSE 0 END)
             / NULLIF(SUM(rc.vr_receita), 0), 2) AS pc_pj
FROM receita rc
JOIN candidatura c ON c.sq_candidato = rc.sq_candidato
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
WHERE e.nr_ano_eleicao <= 2016
GROUP BY e.nr_ano_eleicao
ORDER BY e.nr_ano_eleicao
""")
q8setor = rodar("q8_top_setores_pj", """
SELECT e.nr_ano_eleicao, rc.nm_doador,
       ROUND(SUM(rc.vr_receita), 2) AS vr_total
FROM receita rc
JOIN candidatura c ON c.sq_candidato = rc.sq_candidato
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
WHERE e.nr_ano_eleicao <= 2016 AND rc.tp_doador = 'PJ'
GROUP BY e.nr_ano_eleicao, rc.nm_doador
ORDER BY e.nr_ano_eleicao, vr_total DESC
""")

# ---------------------------------------------------------------- Q9
q9 = rodar("q9_espectro_municipio_tempo", """
WITH votos AS (
    SELECT vc.cd_municipio_tse, e.nr_ano_eleicao,
           COALESCE(p.ds_espectro, 'NAO CLASSIFICADO') AS ds_espectro,
           SUM(vc.qt_votos_nominais) AS qt_votos
    FROM votacao_candidato vc
    JOIN candidatura c ON c.sq_candidato = vc.sq_candidato
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
    JOIN partido p ON p.id_partido = c.id_partido
    WHERE vc.nr_turno = 1
      AND ((e.tp_abrangencia = 'MUNICIPAL' AND cg.ds_cargo = 'PREFEITO')
        OR (e.tp_abrangencia = 'GERAL' AND cg.ds_cargo = 'PRESIDENTE'))
    GROUP BY vc.cd_municipio_tse, e.nr_ano_eleicao, ds_espectro
)
SELECT m.sg_uf, m.nm_municipio, v.nr_ano_eleicao, v.ds_espectro, v.qt_votos,
       ROUND(100 * v.qt_votos / SUM(v.qt_votos) OVER
             (PARTITION BY v.cd_municipio_tse, v.nr_ano_eleicao), 2) AS pc_votos
FROM votos v
JOIN municipio m ON m.cd_municipio_tse = v.cd_municipio_tse
ORDER BY m.sg_uf, m.nm_municipio, v.nr_ano_eleicao, pc_votos DESC
""")
q9g = rodar("q9_espectro_uf_ano", """
SELECT m.sg_uf, v.nr_ano_eleicao, v.ds_espectro,
       SUM(v.qt_votos) AS qt_votos,
       ROUND(100 * SUM(v.qt_votos) / SUM(SUM(v.qt_votos)) OVER
             (PARTITION BY m.sg_uf, v.nr_ano_eleicao), 2) AS pc_votos
FROM (
    SELECT vc.cd_municipio_tse, e.nr_ano_eleicao,
           COALESCE(p.ds_espectro, 'NAO CLASSIFICADO') AS ds_espectro,
           SUM(vc.qt_votos_nominais) AS qt_votos
    FROM votacao_candidato vc
    JOIN candidatura c ON c.sq_candidato = vc.sq_candidato
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
    JOIN partido p ON p.id_partido = c.id_partido
    WHERE vc.nr_turno = 1
      AND ((e.tp_abrangencia = 'MUNICIPAL' AND cg.ds_cargo = 'PREFEITO')
        OR (e.tp_abrangencia = 'GERAL' AND cg.ds_cargo = 'PRESIDENTE'))
    GROUP BY vc.cd_municipio_tse, e.nr_ano_eleicao, ds_espectro
) v
JOIN municipio m ON m.cd_municipio_tse = v.cd_municipio_tse
GROUP BY m.sg_uf, v.nr_ano_eleicao, v.ds_espectro
ORDER BY m.sg_uf, v.nr_ano_eleicao, pc_votos DESC
""")

# ---------------------------------------------------------------- Q10
q10 = rodar("q10_publico_privado_resultado", """
SELECT nr_ano_eleicao, ds_cargo,
       CASE WHEN fl_eleito THEN 'ELEITO' ELSE 'NAO ELEITO' END AS ds_resultado,
       COUNT(*) AS qt_candidatos,
       ROUND(AVG(vr_receita_publica), 2) AS vr_publico_medio,
       ROUND(AVG(vr_receita_privada), 2) AS vr_privado_medio,
       ROUND(100 * SUM(vr_receita_publica) / NULLIF(SUM(vr_receita_total), 0), 2) AS pc_publico
FROM vw_candidatura_resumo
WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024)
GROUP BY nr_ano_eleicao, ds_cargo, ds_resultado
ORDER BY nr_ano_eleicao, ds_cargo, ds_resultado
""")
q10g = rodar("q10_publico_privado_ano", """
SELECT nr_ano_eleicao,
       CASE WHEN fl_eleito THEN 'ELEITO' ELSE 'NAO ELEITO' END AS ds_resultado,
       COUNT(*) AS qt_candidatos,
       ROUND(AVG(vr_receita_publica), 2) AS vr_publico_medio,
       ROUND(AVG(vr_receita_privada), 2) AS vr_privado_medio,
       ROUND(100 * SUM(vr_receita_publica) / NULLIF(SUM(vr_receita_total), 0), 2) AS pc_publico
FROM vw_candidatura_resumo
WHERE nr_ano_eleicao IN (2018, 2020, 2022, 2024)
GROUP BY nr_ano_eleicao, ds_resultado
ORDER BY nr_ano_eleicao, ds_resultado
""")

# ---------------------------------------------------------------- Q11
q11 = rodar("q11_categorias_despesa", """
SELECT e.nr_ano_eleicao, d.ds_origem_despesa,
       COUNT(*) AS qt_lancamentos,
       ROUND(SUM(d.vr_despesa), 2) AS vr_total,
       ROUND(100 * SUM(d.vr_despesa) / SUM(SUM(d.vr_despesa)) OVER
             (PARTITION BY e.nr_ano_eleicao), 2) AS pc_ano
FROM despesa d
JOIN candidatura c ON c.sq_candidato = d.sq_candidato
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
WHERE e.nr_ano_eleicao IN (2018, 2020, 2022, 2024)
GROUP BY e.nr_ano_eleicao, d.ds_origem_despesa
ORDER BY e.nr_ano_eleicao, vr_total DESC
""")

# ---------------------------------------------------------------- Q12a
q12a = rodar("q12a_trajetorias", """
SELECT ps.id_pessoa, ps.nm_pessoa,
       MIN(e.nr_ano_eleicao) AS nr_primeira_eleicao,
       MAX(e.nr_ano_eleicao) AS nr_ultima_eleicao,
       COUNT(*) AS qt_candidaturas,
       SUM(CASE WHEN st.fl_eleito THEN 1 ELSE 0 END) AS qt_vitorias,
       string_agg(e.nr_ano_eleicao || ' ' || cg.ds_cargo || ' (' || pt.sg_partido || ') ' ||
                  CASE WHEN st.fl_eleito THEN 'ELEITO' ELSE 'NAO ELEITO' END,
                  ' -> ' ORDER BY e.nr_ano_eleicao) AS ds_trajetoria
FROM pessoa ps
JOIN candidatura c ON c.id_pessoa = ps.id_pessoa
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
JOIN partido pt ON pt.id_partido = c.id_partido
LEFT JOIN situacao_totalizacao st ON st.cd_sit_tot_turno = c.cd_sit_tot_turno
GROUP BY ps.id_pessoa, ps.nm_pessoa
HAVING COUNT(*) > 1
ORDER BY qt_vitorias DESC, qt_candidaturas DESC
""")

# ---------------------------------------------------------------- Q12b
q12b = rodar("q12b_sobrevivencia", """
WITH eleitos AS (
    SELECT DISTINCT c.id_pessoa, e.nr_ano_eleicao AS nr_ano
    FROM candidatura c
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN situacao_totalizacao st ON st.cd_sit_tot_turno = c.cd_sit_tot_turno
    WHERE st.fl_eleito
)
SELECT a.nr_ano,
       COUNT(*) AS qt_eleitos,
       SUM(CASE WHEN b.id_pessoa IS NOT NULL THEN 1 ELSE 0 END) AS qt_reeleitos_4_anos,
       ROUND(100 * AVG(CASE WHEN b.id_pessoa IS NOT NULL THEN 1.0 ELSE 0 END), 2)
            AS pc_sobrevivencia
FROM eleitos a
LEFT JOIN eleitos b ON b.id_pessoa = a.id_pessoa AND b.nr_ano = a.nr_ano + 4
GROUP BY a.nr_ano
ORDER BY a.nr_ano
""")
q12b24 = rodar("q12b_sobrevivencia_ate_2024", """
WITH eleitos AS (
    SELECT DISTINCT c.id_pessoa, e.nr_ano_eleicao AS nr_ano
    FROM candidatura c
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao
    JOIN situacao_totalizacao st ON st.cd_sit_tot_turno = c.cd_sit_tot_turno
    WHERE st.fl_eleito AND e.nr_ano_eleicao <= 2024
)
SELECT a.nr_ano,
       COUNT(*) AS qt_eleitos,
       SUM(CASE WHEN b.id_pessoa IS NOT NULL THEN 1 ELSE 0 END) AS qt_reeleitos_4_anos,
       ROUND(100 * AVG(CASE WHEN b.id_pessoa IS NOT NULL THEN 1.0 ELSE 0 END), 2)
            AS pc_sobrevivencia
FROM eleitos a
LEFT JOIN eleitos b ON b.id_pessoa = a.id_pessoa AND b.nr_ano = a.nr_ano + 4
GROUP BY a.nr_ano
ORDER BY a.nr_ano
""")

# ---------------------------------------------------------------- contexto p/ o documento
ctx = {}
ctx["eleitores_aptos_por_ano"] = con.execute("""
    SELECT e.nr_ano_eleicao, SUM(cp.qt_aptos) AS qt_aptos
    FROM comparecimento cp JOIN eleicao e ON e.id_eleicao = cp.id_eleicao
    WHERE cp.nr_turno = 1 GROUP BY 1 ORDER BY 1
""").fetchdf().to_dict("records")
ctx["candidaturas_por_ano"] = con.execute("""
    SELECT nr_ano_eleicao, COUNT(*) AS qt FROM candidatura c
    JOIN eleicao e ON e.id_eleicao = c.id_eleicao GROUP BY 1 ORDER BY 1
""").fetchdf().to_dict("records")
ctx["municipios"] = con.execute("SELECT COUNT(*) FROM municipio").fetchone()[0]
ctx["pessoas"] = con.execute("SELECT COUNT(*) FROM pessoa").fetchone()[0]
ctx["idhm_null"] = con.execute("""
    SELECT COUNT(*) FROM vw_indicador_atual WHERE vr_idhm IS NULL
""").fetchone()[0]

with open(OUT / "contexto.json", "w", encoding="utf-8") as f:
    json.dump(ctx, f, ensure_ascii=False, indent=1, default=str)

con.close()
print("CONCLUIDO", flush=True)
