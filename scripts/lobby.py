"""Camadas do "Mapa das perguntas" (js/lobby.js): um valor por cidade, por eleição, para cada pergunta.

Uso: python scripts/lobby.py BANCO.duckdb
Grava data/br/lobby/<camada>.js, cada um com {anos: {var: [anos]}, v: {var: {ano: [valor das 5.570 cidades]}}},
na mesma ordem das cidades de data/br/geo_proj.js (o desenho do mapa), para não precisar de índice.
Só leitura no banco.
"""
import json, os, re, sys
import duckdb

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, '..')
SAIDA = os.path.join(RAIZ, 'data', 'br', 'lobby')

geo = open(os.path.join(RAIZ, 'data', 'br', 'geo_proj.js'), encoding='utf-8').read()
geo = json.loads(geo[geo.index(']=') + 2:].rstrip().rstrip(';'))
ORDEM = [m[0] for m in geo['m']]          # códigos IBGE na ordem do desenho
POS = {c: i for i, c in enumerate(ORDEM)}

con = duckdb.connect(sys.argv[1], read_only=True)

# eleitores aptos de cada cidade em cada eleição (1º turno, o maior entre os cargos daquele ano)
APTOS = """
aptos AS (
  SELECT a, m, max(q) AS aptos FROM (
    SELECT e.nr_ano_eleicao a, cp.cd_municipio_tse m, cp.cd_cargo, sum(cp.qt_aptos) q
    FROM comparecimento cp JOIN eleicao e USING (id_eleicao) WHERE cp.nr_turno = 1 GROUP BY 1, 2, 3) GROUP BY 1, 2)
"""
LINHAGEM = """CASE WHEN COALESCE(l.cd_linhagem, p.sg_partido) IN ('DEM', 'PSL', 'UNIAO') THEN 'UNIAO'
                WHEN COALESCE(l.cd_linhagem, p.sg_partido) IN ('PTB', 'PATRIOTA', 'PRP', 'PRD') THEN 'PRD'
                WHEN COALESCE(l.cd_linhagem, p.sg_partido) IN ('PSC', 'PHS', 'PODE') THEN 'PODE'
                WHEN COALESCE(l.cd_linhagem, p.sg_partido) IN ('PROS', 'SD') THEN 'SD'
                WHEN COALESCE(l.cd_linhagem, p.sg_partido) IN ('PPL', 'PCDOB') THEN 'PCDOB'
                ELSE COALESCE(l.cd_linhagem, p.sg_partido) END"""
RELIG = "('PASTOR','PASTORA','IRMÃO','IRMÃ','IRMAO','IRMA','BISPO','BISPA','MISSIONÁRIO','MISSIONÁRIA','MISSIONARIO','MISSIONARIA','PR','PRA','PR.','PRA.','PADRE','APÓSTOLO','APOSTOLO','PRESBÍTERO','PRESBITERO','DIÁCONO','DIACONO','EVANGELISTA')"
FARDA = "('DELEGADO','DELEGADA','CAPITÃO','CAPITAO','CAPITÃ','SARGENTO','SGT','SGT.','CABO','CORONEL','CEL','CEL.','SOLDADO','SD','POLICIAL','TENENTE','TEN','TEN.','MAJOR','GENERAL','COMANDANTE','SUBTENENTE','INVESTIGADOR','INSPETOR','PM','GUARDA')"

# cada camada: (id, {variante: SQL que devolve a (ano), m (código TSE), v (valor)})
CAMADAS = {
  'mulheres': {'VEREADOR': """
    SELECT e.nr_ano_eleicao a, c.cd_municipio_tse m, 100 * avg((p.ds_genero = 'FEMININO')::INT) v
    FROM candidatura c JOIN eleicao e USING (id_eleicao) JOIN pessoa p USING (id_pessoa) JOIN situacao_totalizacao st USING (id_situacao)
    WHERE c.cd_cargo = 13 AND st.fl_eleito AND p.ds_genero IN ('MASCULINO', 'FEMININO') AND e.nr_ano_eleicao >= 2000 GROUP BY 1, 2""",
    'CANDIDATAS A VEREADOR': """
    SELECT e.nr_ano_eleicao a, c.cd_municipio_tse m, 100 * avg((p.ds_genero = 'FEMININO')::INT) v
    FROM candidatura c JOIN eleicao e USING (id_eleicao) JOIN pessoa p USING (id_pessoa)
    WHERE c.cd_cargo = 13 AND p.ds_genero IN ('MASCULINO', 'FEMININO') AND e.nr_ano_eleicao >= 2000 GROUP BY 1, 2"""},
  'ninguem': {cg: f"""
    SELECT e.nr_ano_eleicao a, cp.cd_municipio_tse m,
           100 * sum(cp.qt_abstencoes + cp.qt_votos_brancos + cp.qt_votos_nulos) / nullif(sum(cp.qt_aptos), 0) v
    FROM comparecimento cp JOIN eleicao e USING (id_eleicao) WHERE cp.nr_turno = 1 AND cp.cd_cargo = {cd} GROUP BY 1, 2"""
    for cg, cd in [('PRESIDENTE', 1), ('PREFEITO', 11)]},
  'lado': {cg: f"""
    WITH v AS (SELECT e.nr_ano_eleicao a, vc.cd_municipio_tse m, c.id_partido, sum(vc.qt_votos_nominais) q
               FROM votacao_candidato vc JOIN candidatura c USING (id_candidatura) JOIN eleicao e USING (id_eleicao)
               WHERE c.cd_cargo = {cd} AND vc.nr_turno = 1 GROUP BY 1, 2, 3),
         g AS (SELECT * FROM v QUALIFY row_number() OVER (PARTITION BY a, m ORDER BY q DESC) = 1)
    SELECT g.a, g.m, pa.vr_nota v FROM g LEFT JOIN vw_partido_ano pa ON pa.id_partido = g.id_partido AND pa.nr_ano_eleicao = g.a"""
    for cg, cd in [('PRESIDENTE', 1), ('PREFEITO', 11)]},
  'bf': {'BENEFÍCIOS': f"""
    WITH {APTOS}
    SELECT b.nr_ano a, b.cd_municipio_tse m, 100.0 * b.qt_beneficios / nullif(ap.aptos, 0) v
    FROM bolsa_familia_municipio b JOIN aptos ap ON ap.a = b.nr_ano AND ap.m = b.cd_municipio_tse"""},
  'legenda': {cg: f"""
    SELECT e.nr_ano_eleicao a, vp.cd_municipio_tse m, 100 * sum(vp.qt_votos_legenda) / nullif(sum(vp.qt_votos_legenda + vp.qt_votos_nominais), 0) v
    FROM votacao_partido vp JOIN eleicao e USING (id_eleicao) WHERE vp.nr_turno = 1 AND vp.cd_cargo = {cd} GROUP BY 1, 2"""
    for cg, cd in [('VEREADOR', 13), ('DEPUTADO FEDERAL', 6)]},
  'gasto': {'CAMPANHA MUNICIPAL': f"""
    WITH {APTOS}
    SELECT r.nr_ano_eleicao a, r.cd_municipio_tse m, sum(r.vr_despesa_total) / nullif(max(ap.aptos), 0) v
    FROM vw_candidatura_resumo r JOIN aptos ap ON ap.a = r.nr_ano_eleicao AND ap.m = r.cd_municipio_tse
    WHERE r.cd_cargo IN (11, 13) AND r.nr_ano_eleicao >= 2008 GROUP BY 1, 2"""},
  'publico': {'CAMPANHA MUNICIPAL': """
    SELECT r.nr_ano_eleicao a, r.cd_municipio_tse m, 100 * sum(r.vr_receita_publica) / nullif(sum(r.vr_receita_total), 0) v
    FROM vw_candidatura_resumo r WHERE r.cd_cargo IN (11, 13) AND r.nr_ano_eleicao >= 2008 GROUP BY 1, 2 HAVING sum(r.vr_receita_total) > 0"""},
  'fundo': {'CAMPANHA MUNICIPAL': f"""
    WITH {APTOS}
    SELECT r.nr_ano_eleicao a, r.cd_municipio_tse m, sum(r.vr_receita_publica) / nullif(max(ap.aptos), 0) v
    FROM vw_candidatura_resumo r JOIN aptos ap ON ap.a = r.nr_ano_eleicao AND ap.m = r.cd_municipio_tse
    WHERE r.cd_cargo IN (11, 13) AND r.nr_ano_eleicao >= 2008 GROUP BY 1, 2"""},
  'cadeira': {'VEREADOR': f"""
    WITH {APTOS}, el AS (SELECT e.nr_ano_eleicao a, c.cd_municipio_tse m, count(*) n FROM candidatura c JOIN eleicao e USING (id_eleicao)
                JOIN situacao_totalizacao st USING (id_situacao) WHERE c.cd_cargo = 13 AND st.fl_eleito GROUP BY 1, 2)
    SELECT el.a, el.m, ap.aptos / el.n v FROM el JOIN aptos ap USING (a, m)"""},
  'barradas': {'VEREADOR E PREFEITO': """
    SELECT e.nr_ano_eleicao a, c.cd_municipio_tse m, 100 * avg((r.ds_situacao_candidatura LIKE 'INAPTO%')::INT) v
    FROM candidatura c JOIN eleicao e USING (id_eleicao) JOIN situacao_registro r USING (id_candidatura)
    WHERE c.cd_cargo IN (11, 13) AND e.nr_ano_eleicao >= 2008 AND r.ds_situacao_candidatura IS NOT NULL GROUP BY 1, 2"""},
  'troca': {'VEREADOR': f"""
    WITH c AS (SELECT c.id_pessoa, e.nr_ano_eleicao ano, c.cd_municipio_tse m, {LINHAGEM} lin, COALESCE(st.fl_eleito, false) el
               FROM candidatura c JOIN eleicao e USING (id_eleicao) JOIN partido p ON p.id_partido = c.id_partido JOIN pessoa ps USING (id_pessoa)
               LEFT JOIN partido_linhagem l ON l.id_partido = c.id_partido AND l.nr_ano_eleicao = e.nr_ano_eleicao
               LEFT JOIN situacao_totalizacao st USING (id_situacao)
               WHERE c.cd_cargo = 13 AND ps.nr_titulo_eleitoral NOT LIKE 'SQ%')
    SELECT b.ano a, b.m, 100 * avg((a.lin <> b.lin)::INT) v
    FROM c a JOIN c b ON b.id_pessoa = a.id_pessoa AND b.m = a.m AND b.ano = a.ano + 4 WHERE a.el GROUP BY 1, 2"""},
  'alternancia': {'PREFEITO': f"""
    WITH c AS (SELECT e.nr_ano_eleicao ano, c.cd_municipio_tse m, c.id_pessoa, {LINHAGEM} lin
               FROM candidatura c JOIN eleicao e USING (id_eleicao) JOIN partido p ON p.id_partido = c.id_partido
               LEFT JOIN partido_linhagem l ON l.id_partido = c.id_partido AND l.nr_ano_eleicao = e.nr_ano_eleicao
               JOIN situacao_totalizacao st USING (id_situacao) WHERE c.cd_cargo = 11 AND st.fl_eleito
               QUALIFY row_number() OVER (PARTITION BY e.nr_ano_eleicao, c.cd_municipio_tse ORDER BY c.id_candidatura) = 1)
    SELECT b.ano a, b.m, CASE WHEN a.id_pessoa = b.id_pessoa THEN 0 WHEN a.lin = b.lin THEN 1 ELSE 2 END v
    FROM c a JOIN c b ON b.m = a.m AND b.ano = a.ano + 4"""},
  'religioso': {cg: f"""
    WITH t AS (SELECT e.nr_ano_eleicao a, c.cd_municipio_tse m, split_part(upper(trim(c.nm_urna)), ' ', 1) w
               FROM candidatura c JOIN eleicao e USING (id_eleicao) WHERE c.cd_cargo = 13 AND e.nr_ano_eleicao >= 2000)
    SELECT a, m, 100 * avg((w IN {lista})::INT) v FROM t GROUP BY 1, 2"""
    for cg, lista in [('TÍTULO RELIGIOSO', RELIG), ('TÍTULO DE FARDA', FARDA)]},
  'laranja': {'CANDIDATAS A VEREADORA': """
    WITH v AS (SELECT id_candidatura, sum(qt_votos_nominais) q FROM votacao_candidato WHERE nr_turno = 1 GROUP BY 1)
    SELECT e.nr_ano_eleicao a, c.cd_municipio_tse m, 100 * avg((COALESCE(v.q, 0) <= 10)::INT) v
    FROM candidatura c JOIN eleicao e USING (id_eleicao) JOIN pessoa p USING (id_pessoa) LEFT JOIN v USING (id_candidatura)
    LEFT JOIN situacao_registro r USING (id_candidatura)
    WHERE c.cd_cargo = 13 AND p.ds_genero = 'FEMININO' AND e.nr_ano_eleicao >= 2012
      AND COALESCE(r.ds_situacao_candidatura, '') NOT LIKE 'INAPTO%'
      AND COALESCE(r.ds_detalhe_situacao, '') NOT SIMILAR TO '.*(INDEFERIDO|RENÚNCIA|CANCELADO|CASSADO|FALECI).*'
    GROUP BY 1, 2 HAVING count(*) >= 3"""},
  'acerta': {'PRESIDENTE': """
    WITH v AS (SELECT e.nr_ano_eleicao a, vc.nr_turno t, vc.cd_municipio_tse m, c.id_pessoa, COALESCE(st.fl_eleito, false) el, sum(vc.qt_votos_nominais) q
               FROM votacao_candidato vc JOIN candidatura c USING (id_candidatura) JOIN eleicao e USING (id_eleicao)
               LEFT JOIN situacao_totalizacao st USING (id_situacao) WHERE c.cd_cargo = 1 GROUP BY 1, 2, 3, 4, 5),
         ult AS (SELECT a, max(t) t FROM v GROUP BY 1),
         esc AS (SELECT v.* FROM v JOIN ult USING (a, t) QUALIFY row_number() OVER (PARTITION BY v.a, v.m ORDER BY v.q DESC) = 1),
         ven AS (SELECT DISTINCT a, id_pessoa FROM v WHERE el)
    SELECT 2026 a, esc.m, sum((ven.id_pessoa IS NOT NULL)::INT) v FROM esc LEFT JOIN ven USING (a, id_pessoa) GROUP BY 2"""},
  'superior': {'ELEITORES': """
    SELECT nr_ano_eleicao a, cd_municipio_tse m, pc_superior v FROM vw_eleitorado_municipio WHERE pc_superior IS NOT NULL"""},
  'jovens': {'ELEITORES': """
    SELECT nr_ano_eleicao a, cd_municipio_tse m, pc_ate_29 v FROM vw_eleitorado_municipio WHERE pc_ate_29 IS NOT NULL"""},
  'idh': {'IDHM': """
    SELECT 2010 a, cd_municipio_tse m, vr_idhm v FROM indicador_atlas WHERE vr_idhm IS NOT NULL
    QUALIFY row_number() OVER (PARTITION BY cd_municipio_tse ORDER BY nr_ano_referencia DESC) = 1"""},
}

tse_ibge = dict(con.execute("SELECT cd_municipio_tse, cd_municipio_ibge FROM municipio").fetchall())
os.makedirs(SAIDA, exist_ok=True)
so = sys.argv[2:]
for cid, variantes in CAMADAS.items():
    if so and cid not in so:
        continue
    out = {'anos': {}, 'v': {}}
    for var, sql in variantes.items():
        linhas = con.execute(sql).fetchall()
        por = {}
        for a, m, v in linhas:
            i = POS.get(str(tse_ibge.get(m)))
            if i is None or v is None:
                continue
            arr = por.setdefault(int(a), [None] * len(ORDEM))
            arr[i] = round(float(v), 3 if cid in ('lado', 'idh') else 1)
        anos = sorted(a for a, arr in por.items() if sum(x is not None for x in arr) >= 100)
        out['anos'][var] = anos
        out['v'][var] = {str(a): por[a] for a in anos}
        print(cid, var, anos, sum(x is not None for x in por[anos[-1]]) if anos else 0, flush=True)
    txt = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(SAIDA, cid + '.js'), 'w', encoding='utf-8').write(f'(window.__D=window.__D||{{}})["br/lobby/{cid}"]={txt};\n')
print('ok')
