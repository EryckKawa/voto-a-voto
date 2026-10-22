"""Viés político de cada cidade na linha do tempo (pergunta 9): a nota média dos votos, cargo a cargo, de 1994 a 2026.

Nota da cidade = Σ (votos do partido × nota do partido naquela eleição) ÷ Σ votos dos partidos com nota,
no 1º turno, com os votos nominais e de legenda de cada partido (votacao_partido) e a nota de vw_partido_ano
(régua "todas as medidas": três estudos acadêmicos e o voto na Câmara). Vai de −1 (esquerda) a +1 (direita).
É a mesma conta da consulta q9b de consultas_brasil.sql, cidade a cidade.

Uso: python scripts/vies_cidades.py [caminho/eleicoes_brasil.duckdb]
Saída: data/br/vies/{UF}.json  {código IBGE: {"PRES": [[ano, nota], ...], "GOV": ..., "VER": ...}}
"""
import json, os, sys
import duckdb

AQUI = os.path.dirname(os.path.abspath(__file__))
BANCO = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/br/db/eleicoes_brasil.duckdb'
SAIDA = os.path.join(AQUI, '..', 'data', 'br', 'vies')
CARGO = {1: 'PRES', 3: 'GOV', 5: 'SEN', 6: 'DF', 7: 'DE', 11: 'PREF', 13: 'VER'}

SQL = """
WITH votos AS (
    SELECT vp.cd_municipio_tse, e.nr_ano_eleicao, CASE WHEN vp.cd_cargo = 8 THEN 7 ELSE vp.cd_cargo END AS cd_cargo, pa.vr_nota,
           SUM(vp.qt_votos_nominais + COALESCE(vp.qt_votos_legenda, 0)) AS qt_votos
    FROM votacao_partido vp
    JOIN eleicao e ON e.id_eleicao = vp.id_eleicao
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = vp.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
    WHERE vp.nr_turno = 1 AND vp.cd_cargo IN (1, 3, 5, 6, 7, 8, 11, 13)
    GROUP BY 1, 2, 3, 4
)
SELECT m.sg_uf, m.cd_municipio_ibge, v.cd_cargo, v.nr_ano_eleicao,
       SUM(v.qt_votos * v.vr_nota) / NULLIF(SUM(CASE WHEN v.vr_nota IS NOT NULL THEN v.qt_votos END), 0) AS vr_nota,
       SUM(CASE WHEN v.vr_nota IS NOT NULL THEN v.qt_votos END) / SUM(v.qt_votos) AS pc_com_nota
FROM votos v JOIN municipio m ON m.cd_municipio_tse = v.cd_municipio_tse
GROUP BY 1, 2, 3, 4
HAVING SUM(v.qt_votos) > 0 AND SUM(CASE WHEN v.vr_nota IS NOT NULL THEN v.qt_votos END) >= 0.8 * SUM(v.qt_votos)   -- pelo menos 80% dos votos em partidos com nota
ORDER BY 1, 2, 3, 4
"""

con = duckdb.connect(BANCO, read_only=True)
por_uf = {}
for uf, ibge, cg, ano, nota, _ in con.execute(SQL).fetchall():
    por_uf.setdefault(uf, {}).setdefault(str(ibge), {}).setdefault(CARGO[cg], []).append([ano, round(nota, 3)])
os.makedirs(SAIDA, exist_ok=True)
for uf, d in sorted(por_uf.items()):
    json.dump(d, open(os.path.join(SAIDA, f'{uf}.json'), 'w', encoding='utf-8'), separators=(',', ':'))
print(len(por_uf), 'estados,', sum(len(d) for d in por_uf.values()), 'cidades,',
      sum(os.path.getsize(os.path.join(SAIDA, f)) for f in os.listdir(SAIDA)) // 1024, 'KB')
