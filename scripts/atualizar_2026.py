"""Atualiza no banco nacional só as linhas de 2026, com os arquivos que o TSE republicou depois do 2º turno (16/11/2026).

Por que não remontar o banco: as etapas de banco_brasil.py recriam as tabelas de todos os anos e renumeram as candidaturas
e as pessoas; os códigos das pessoas estão nos endereços das fichas (#/politico/<id>) e nos nomes das fotos (img/pol).
Aqui as candidaturas de 2026 continuam com o mesmo código; muda o que o TSE atualizou:
  - a situação final de cada candidatura (eleito, não eleito, 2º turno) e a situação do registro;
  - os votos (agora com o 2º turno de presidente e governador), o comparecimento e os votos por partido;
  - os bens declarados;
  - as contas (receitas e despesas): roda a etapa contas de banco_brasil.py só para 2026.

Uso: python scripts/atualizar_2026.py PASTA_DOS_ZIPS_NOVOS [BANCO]
     A pasta tem os zips com o nome que banco_brasil.py espera: consulta_cand_2026.zip.001, votacao_candidato_munzona_2026.zip.001,
     detalhe_votacao_munzona_2026.zip.001, votacao_partido_munzona_2026.zip.001, bem_candidato_2026.zip.001, contas_2026.zip.001.
Antes: faça uma cópia do banco. Os votos por município saem de processa_munzona.py (o script chama)."""
import os, sys, re, shutil, tempfile, subprocess
import duckdb

AQUI = os.path.dirname(os.path.abspath(__file__))
P = sys.argv[1]
BANCO = sys.argv[2] if len(sys.argv) > 2 else os.environ.get('BANCO', os.path.join(os.path.expanduser('~'), 'Downloads', 'BDR_Votacao', 'banco', 'eleicoes_brasil.duckdb'))
TMP = os.environ.get('TMPBR', os.path.join(os.path.dirname(BANCO), 'tmp'))
PQ = os.path.join(TMP, 'pq')
ANO = 2026
log = lambda *a: print(*a, flush=True)
env = dict(os.environ, TMPBR=TMP, BANCO=BANCO, PYTHONIOENCODING='utf-8', PYTHONUTF8='1')

# as funções de leitura do banco_brasil.py (extrai: zip → CSV em UTF-8; le: read_csv tolerante)
sys.argv = [sys.argv[0], P]   # banco_brasil.py lê a pasta e as etapas da linha de comando: sem etapas, só define as funções
os.environ['BANCO'] = os.path.join(TMP, '_vazio.duckdb')
import importlib.util
spec = importlib.util.spec_from_file_location('bb', os.path.join(AQUI, 'banco_brasil.py')); bb = importlib.util.module_from_spec(spec); spec.loader.exec_module(bb)
bb.con.close()
extrai, le = bb.extrai, bb.le

# 1. votos por município, do arquivo novo (guarda os parquets antigos)
for n in ('votos', 'cand'):
    a = os.path.join(PQ, f'{n}_{ANO}.parquet')
    if os.path.exists(a) and not os.path.exists(a + '.antes_2t'): shutil.copy2(a, a + '.antes_2t')
log('processa_munzona', ANO)
subprocess.run([sys.executable, os.path.join(AQUI, 'processa_munzona.py'), str(ANO), os.path.join(P, f'votacao_candidato_munzona_{ANO}.zip.001')], env=env, check=True)

con = duckdb.connect(BANCO)
con.execute("SET memory_limit = '12GB'; SET threads = 4; SET preserve_insertion_order = false")
eid = con.execute(f"SELECT id_eleicao FROM eleicao WHERE nr_ano_eleicao = {ANO}").fetchone()[0]
tmp = tempfile.mkdtemp(dir=TMP)
ALC = "CASE WHEN s.CD_CARGO IN ('11','12','13') THEN s.SG_UE WHEN s.CD_CARGO = '1' THEN 'BR' ELSE s.SG_UF END"
antes = dict(con.execute(f"""SELECT st.ds_sit_tot_turno, COUNT(*) FROM candidatura c LEFT JOIN situacao_totalizacao st USING (id_situacao)
                             WHERE c.id_eleicao = {eid} GROUP BY 1""").fetchall())

# 2. candidatos: situação final e situação do registro
arqs = extrai(os.path.join(P, f'consulta_cand_{ANO}.zip.001'), r'consulta_cand_\d{4}_(?!BRASIL)', tmp)
cols = set(open(arqs[0], encoding='utf-8').readline().replace('"', '').strip().split(';'))
det = 'DS_DETALHE_SITUACAO_CAND' if 'DS_DETALHE_SITUACAO_CAND' in cols else 'NULL'
con.execute(f"""CREATE OR REPLACE TEMP TABLE s AS
    SELECT *, ROW_NUMBER() OVER (PARTITION BY {ALC.replace('s.', '')}, CD_CARGO, SQ_CANDIDATO ORDER BY TRY_CAST(NR_TURNO AS INT) DESC) rk
    FROM {le(arqs)} WHERE CD_TIPO_ELEICAO = '2' OR NM_TIPO_ELEICAO ILIKE 'ORDIN%'""")
for a in arqs: os.remove(a)
# descrições de situação que ainda não existiam (por exemplo, a do 2º turno) entram no domínio
con.execute("""INSERT INTO situacao_totalizacao
    SELECT (SELECT MAX(id_situacao) FROM situacao_totalizacao) + ROW_NUMBER() OVER (ORDER BY ds), ds, (ds LIKE 'ELEITO%' OR ds = 'MÉDIA')
    FROM (SELECT DISTINCT DS_SIT_TOT_TURNO ds FROM s WHERE rk = 1 AND DS_SIT_TOT_TURNO IS NOT NULL) x
    WHERE NOT EXISTS (SELECT 1 FROM situacao_totalizacao t WHERE t.ds_sit_tot_turno = x.ds)""")
con.execute(f"""UPDATE candidatura c SET id_situacao = st.id_situacao
    FROM s, situacao_totalizacao st
    WHERE s.rk = 1 AND c.id_eleicao = {eid} AND c.cd_cargo = TRY_CAST(s.CD_CARGO AS SMALLINT) AND c.sq_candidato = TRY_CAST(s.SQ_CANDIDATO AS BIGINT)
      AND c.sg_ue = {ALC} AND st.ds_sit_tot_turno = s.DS_SIT_TOT_TURNO""")
novas = con.execute(f"""SELECT COUNT(*) FROM s WHERE rk = 1 AND NOT EXISTS (SELECT 1 FROM candidatura c WHERE c.id_eleicao = {eid}
    AND c.cd_cargo = TRY_CAST(s.CD_CARGO AS SMALLINT) AND c.sq_candidato = TRY_CAST(s.SQ_CANDIDATO AS BIGINT) AND c.sg_ue = {ALC})""").fetchone()[0]
log('candidaturas no arquivo novo que o banco não tem (ficam de fora, para não renumerar):', novas)
con.execute(f"""UPDATE situacao_registro r SET ds_situacao_candidatura = NULLIF(s.DS_SITUACAO_CANDIDATURA, '#NULO#'), ds_detalhe_situacao = NULLIF({det}, '#NULO#')
    FROM s, candidatura c
    WHERE s.rk = 1 AND r.id_candidatura = c.id_candidatura AND c.id_eleicao = {eid} AND c.cd_cargo = TRY_CAST(s.CD_CARGO AS SMALLINT)
      AND c.sq_candidato = TRY_CAST(s.SQ_CANDIDATO AS BIGINT) AND c.sg_ue = {ALC}""")
depois = dict(con.execute(f"""SELECT st.ds_sit_tot_turno, COUNT(*) FROM candidatura c LEFT JOIN situacao_totalizacao st USING (id_situacao)
                              WHERE c.id_eleicao = {eid} GROUP BY 1""").fetchall())
log('situação final 2026, antes:', antes); log('depois:', depois)

# 3. votos por candidatura (mesma ligação da etapa votos de banco_brasil.py)
con.execute(f"DELETE FROM votacao_candidato WHERE id_candidatura IN (SELECT id_candidatura FROM candidatura WHERE id_eleicao = {eid})")
con.execute(f"""
INSERT INTO votacao_candidato
WITH k AS (SELECT sq, cargo, nr, nome, CASE WHEN cargo IN (11, 12, 13) THEN ue WHEN cargo = 1 THEN 'BR' ELSE uf END alcance
           FROM read_parquet('{PQ}/cand_{ANO}.parquet') WHERE cargo IN (1, 3, 5, 6, 7, 8, 11, 13)),
liga AS (
  SELECT k.sq, k.cargo, k.alcance, ca.id_candidatura,
         ROW_NUMBER() OVER (PARTITION BY k.sq, k.cargo, k.alcance ORDER BY (ca.sq_candidato = k.sq) DESC, (ca.nm_urna = k.nome) DESC, st.fl_eleito DESC NULLS LAST, ca.id_candidatura) rk
  FROM k JOIN candidatura ca ON ca.id_eleicao = {eid} AND ca.cd_cargo = k.cargo AND ca.sg_ue = k.alcance
       AND (ca.sq_candidato = k.sq OR ca.nr_candidato = TRY_CAST(k.nr AS INTEGER))
  LEFT JOIN situacao_totalizacao st ON st.id_situacao = ca.id_situacao)
SELECT l.id_candidatura, v.turno, v.cd_mun, 0, SUM(v.votos)
FROM read_parquet('{PQ}/votos_{ANO}.parquet') v JOIN liga l ON l.sq = v.sq AND l.cargo = v.cargo AND l.rk = 1
     AND l.alcance = CASE WHEN v.cargo IN (11, 12, 13) THEN l.alcance WHEN v.cargo = 1 THEN 'BR' ELSE v.uf END
     AND (v.cargo NOT IN (11, 12, 13) OR TRY_CAST(l.alcance AS INTEGER) = v.cd_mun)
GROUP BY 1, 2, 3""")
for t in (1, 2):
    tot = con.execute(f"SELECT SUM(votos) FROM read_parquet('{PQ}/votos_{ANO}.parquet') WHERE turno = {t} AND cargo IN (1,3,5,6,7,8,11,13)").fetchone()[0] or 0
    ok = con.execute(f"""SELECT SUM(qt_votos_nominais) FROM votacao_candidato v JOIN candidatura c USING (id_candidatura)
                         WHERE c.id_eleicao = {eid} AND v.nr_turno = {t}""").fetchone()[0] or 0
    log(f'votos {ANO}, {t}º turno: {ok:,} de {tot:,} ligados a uma candidatura' + (f' ({100 * ok / tot:.2f}%)' if tot else ''))

# presidente sem situação: o 2º turno nacional diz quem venceu (igual à etapa situacoes)
con.execute(f"""
WITH finais AS (
  SELECT ca.id_candidatura, ROW_NUMBER() OVER (ORDER BY SUM(v.qt_votos_nominais) DESC) pos
  FROM candidatura ca JOIN votacao_candidato v USING (id_candidatura)
  WHERE ca.cd_cargo = 1 AND ca.id_eleicao = {eid} AND v.nr_turno = 2 GROUP BY 1 HAVING SUM(v.qt_votos_nominais) > 0)
UPDATE candidatura ca SET id_situacao = st.id_situacao
FROM finais f, situacao_totalizacao st, situacao_totalizacao antiga
WHERE ca.id_candidatura = f.id_candidatura AND antiga.id_situacao = ca.id_situacao AND antiga.ds_sit_tot_turno LIKE '#NULO%'
  AND st.ds_sit_tot_turno = CASE WHEN f.pos = 1 THEN 'ELEITO' ELSE 'NÃO ELEITO' END""")

# 4. comparecimento por município
con.execute(f"DELETE FROM comparecimento WHERE id_eleicao = {eid}")
arqs = extrai(os.path.join(P, f'detalhe_votacao_munzona_{ANO}.zip.001'), r'detalhe_votacao_munzona_\d{4}_(?!BRASIL)', tmp)
cols = set(open(arqs[0], encoding='utf-8').readline().replace('"', '').strip().split(';'))
nul = "GREATEST(COALESCE(TRY_CAST(QT_TOTAL_VOTOS_NULOS AS BIGINT), 0), COALESCE(TRY_CAST(QT_VOTOS_NULOS AS BIGINT), 0))" if 'QT_VOTOS_NULOS' in cols else "TRY_CAST(QT_TOTAL_VOTOS_NULOS AS BIGINT)"
tipo = "(CD_TIPO_ELEICAO = '2' OR NM_TIPO_ELEICAO ILIKE 'ORDIN%')" if 'NM_TIPO_ELEICAO' in cols else "true"
con.execute(f"""INSERT INTO comparecimento
    SELECT {eid}, TRY_CAST(NR_TURNO AS TINYINT), TRY_CAST(CD_CARGO AS SMALLINT), TRY_CAST(CD_MUNICIPIO AS INTEGER), 0,
           SUM(TRY_CAST(QT_APTOS AS BIGINT)), SUM(TRY_CAST(QT_COMPARECIMENTO AS BIGINT)), SUM(TRY_CAST(QT_ABSTENCOES AS BIGINT)),
           SUM(TRY_CAST(QT_VOTOS_BRANCOS AS BIGINT)), SUM({nul})
    FROM {le(arqs)} WHERE {tipo} GROUP BY 1, 2, 3, 4""")
for a in arqs: os.remove(a)
log('comparecimento', ANO, con.execute(f"""SELECT nr_turno, COUNT(*), ROUND(100 * SUM(qt_abstencoes) / SUM(qt_aptos), 1) FROM comparecimento
                                          WHERE id_eleicao = {eid} AND cd_cargo IN (1, 3) GROUP BY 1 ORDER BY 1""").fetchall())

# 5. votos por partido (nominais e de legenda)
con.execute(f"DELETE FROM votacao_partido WHERE id_eleicao = {eid}")
arqs = extrai(os.path.join(P, f'votacao_partido_munzona_{ANO}.zip.001'), r'votacao_partido_munzona_\d{4}_(?!BRASIL)', tmp)
cols = set(open(arqs[0], encoding='utf-8').readline().replace('"', '').strip().split(';'))
nom = 'QT_VOTOS_NOMINAIS_VALIDOS' if 'QT_VOTOS_NOMINAIS_VALIDOS' in cols else 'QT_VOTOS_NOMINAIS'
leg = 'QT_VOTOS_LEGENDA_VALIDOS' if 'QT_VOTOS_LEGENDA_VALIDOS' in cols else 'QT_VOTOS_LEGENDA'
tipo = "(CD_TIPO_ELEICAO = '2' OR NM_TIPO_ELEICAO ILIKE 'ORDIN%')" if 'NM_TIPO_ELEICAO' in cols else "true"
con.execute(f"CREATE OR REPLACE TEMP TABLE vp AS SELECT * FROM {le(arqs)} WHERE {tipo}")
con.execute("""INSERT INTO partido SELECT (SELECT MAX(id_partido) FROM partido) + ROW_NUMBER() OVER (), nr, sg, nm, NULL, NULL, NULL
               FROM (SELECT DISTINCT TRY_CAST(NR_PARTIDO AS INTEGER) nr, SG_PARTIDO sg, NM_PARTIDO nm FROM vp) x
               WHERE NOT EXISTS (SELECT 1 FROM partido p WHERE p.sg_partido = x.sg AND p.nr_partido IS NOT DISTINCT FROM x.nr)""")
con.execute(f"""INSERT INTO votacao_partido
    SELECT {eid}, TRY_CAST(NR_TURNO AS TINYINT), TRY_CAST(CD_CARGO AS SMALLINT), p.id_partido, TRY_CAST(CD_MUNICIPIO AS INTEGER), 0,
           SUM(GREATEST(TRY_CAST({nom} AS BIGINT), 0)), CASE WHEN MIN(TRY_CAST({leg} AS BIGINT)) < 0 THEN NULL ELSE SUM(TRY_CAST({leg} AS BIGINT)) END
    FROM vp JOIN partido p ON p.sg_partido = vp.SG_PARTIDO AND p.nr_partido IS NOT DISTINCT FROM TRY_CAST(vp.NR_PARTIDO AS INTEGER)
    GROUP BY 1, 2, 3, 4, 5""")
for a in arqs: os.remove(a)
log('votos por partido', ANO, con.execute(f"SELECT nr_turno, COUNT(*) FROM votacao_partido WHERE id_eleicao = {eid} GROUP BY 1 ORDER BY 1").fetchall())

# 6. bens declarados
con.execute(f"DELETE FROM bem_candidato WHERE nr_ano_eleicao = {ANO}")
arqs = extrai(os.path.join(P, f'bem_candidato_{ANO}.zip.001'), r'bem_candidato_\d{4}_(?!BRASIL)', tmp)
cols = set(open(arqs[0], encoding='utf-8').readline().replace('"', '').strip().split(';'))
tipo = "(CD_TIPO_ELEICAO = '2' OR NM_TIPO_ELEICAO ILIKE 'ORDIN%')" if 'NM_TIPO_ELEICAO' in cols else "true"
ordem = 'NR_ORDEM_BEM_CANDIDATO' if 'NR_ORDEM_BEM_CANDIDATO' in cols else 'NR_ORDEM_CANDIDATO'
reais = lambda c: f"TRY_CAST(REPLACE(REPLACE({c}, '.', ''), ',', '.') AS DECIMAL(16,2))"
con.execute(f"""INSERT INTO bem_candidato
    SELECT c.id_candidatura, TRY_CAST(b.{ordem} AS SMALLINT), TRY_CAST(b.CD_TIPO_BEM_CANDIDATO AS SMALLINT), b.DS_TIPO_BEM_CANDIDATO,
           b.DS_BEM_CANDIDATO, {reais('b.VR_BEM_CANDIDATO')}, {ANO}
    FROM (SELECT * FROM {le(arqs)} WHERE {tipo}) b
    JOIN candidatura c ON c.id_eleicao = {eid} AND c.sq_candidato = TRY_CAST(b.SQ_CANDIDATO AS BIGINT) AND c.sg_ue IN (b.SG_UE, b.SG_UF)""")
for a in arqs: os.remove(a)
log('bens', ANO, con.execute(f"SELECT COUNT(*), COUNT(DISTINCT id_candidatura), ROUND(SUM(vr_bem) / 1e9, 1) FROM bem_candidato WHERE nr_ano_eleicao = {ANO}").fetchone())
shutil.rmtree(tmp, ignore_errors=True)
con.close()

# 7. contas de 2026: a etapa contas de banco_brasil.py apaga e regrava só o ano pedido; depois, a limpeza das receitas impossíveis
subprocess.run([sys.executable, os.path.join(AQUI, 'banco_brasil.py'), P, 'contas', str(ANO)], env=env, check=True)
con = duckdb.connect(BANCO)
regra = """r.vr_receita > 100000 AND ((c.vr_despesa_max > 0 AND r.vr_receita > 10 * c.vr_despesa_max) OR (c.cd_cargo = 13 AND r.vr_receita > 5000000))"""
con.execute(f"DELETE FROM receita_descartada WHERE nr_ano_eleicao = {ANO}")
con.execute(f"""INSERT INTO receita_descartada SELECT r.*, 'acima do teto ou de R$ 5 milhões para vereador'
                FROM receita r JOIN candidatura c ON c.id_candidatura = r.id_candidatura WHERE r.nr_ano_eleicao = {ANO} AND {regra}""")
con.execute(f"UPDATE receita r SET vr_receita = NULL FROM candidatura c WHERE c.id_candidatura = r.id_candidatura AND r.nr_ano_eleicao = {ANO} AND {regra}")
log('limpeza 2026:', con.execute(f"SELECT COUNT(*), SUM(vr_receita) FROM receita_descartada WHERE nr_ano_eleicao = {ANO}").fetchone())
con.close()
log('pronto')
