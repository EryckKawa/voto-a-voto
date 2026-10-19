"""Banco nacional das eleições (DuckDB), no mesmo modelo relacional do trabalho (modelo_votacao_grupo6.sql),
agora para as 27 unidades da federação. As consultas das 12 questões rodam sobre ele (consultas_brasil.sql).

Uso:  python banco_brasil.py PASTA_ZIPS ETAPA [ETAPA ...]
Etapas: base (uf, município, indicadores, eleição, cargo...), cand (pessoa e candidatura, 1994-2026),
        votos (votacao_candidato por município), partido_votos (votacao_partido), comp (comparecimento),
        contas ANO (receita e despesa), propostas (texto dos planos de governo),
        notas (posição ideológica de cada partido em cada eleição), views.
Decisões (as mesmas do trabalho dos 6 estados, com o que muda no Brasil inteiro):
- Os fatos de votação ficam no nível do município (nr_zona = 0): no Brasil inteiro, por zona, seriam centenas
  de milhões de linhas, e nenhuma das 12 questões usa a zona.
- A candidatura é única por (eleição, alcance, sequencial): alcance é o município nas eleições municipais,
  a UF nos cargos estaduais e 'BR' para presidente. É assim que o sequencial do TSE fica único em todos os anos.
- Só eleições ordinárias (CD_TIPO_ELEICAO = 2). Para cada candidato, vale a linha do último turno disputado."""
import sys, os, glob, json, csv, re, zipfile, shutil, tempfile
import duckdb

P, ETAPAS = sys.argv[1], sys.argv[2:]
DB = '/tmp/claude-0/br/db/eleicoes_brasil.duckdb'
D = '/tmp/claude-0/web/data/br'
os.makedirs(os.path.dirname(DB), exist_ok=True)
con = duckdb.connect(DB)
con.execute("SET preserve_insertion_order = false; SET memory_limit = '6GB'; SET threads = 4")
log = lambda *a: print(*a, flush=True)

UFS = {'RO': (11, 'Rondônia', 'Norte'), 'AC': (12, 'Acre', 'Norte'), 'AM': (13, 'Amazonas', 'Norte'), 'RR': (14, 'Roraima', 'Norte'), 'PA': (15, 'Pará', 'Norte'),
       'AP': (16, 'Amapá', 'Norte'), 'TO': (17, 'Tocantins', 'Norte'), 'MA': (21, 'Maranhão', 'Nordeste'), 'PI': (22, 'Piauí', 'Nordeste'), 'CE': (23, 'Ceará', 'Nordeste'),
       'RN': (24, 'Rio Grande do Norte', 'Nordeste'), 'PB': (25, 'Paraíba', 'Nordeste'), 'PE': (26, 'Pernambuco', 'Nordeste'), 'AL': (27, 'Alagoas', 'Nordeste'),
       'SE': (28, 'Sergipe', 'Nordeste'), 'BA': (29, 'Bahia', 'Nordeste'), 'MG': (31, 'Minas Gerais', 'Sudeste'), 'ES': (32, 'Espírito Santo', 'Sudeste'),
       'RJ': (33, 'Rio de Janeiro', 'Sudeste'), 'SP': (35, 'São Paulo', 'Sudeste'), 'PR': (41, 'Paraná', 'Sul'), 'SC': (42, 'Santa Catarina', 'Sul'),
       'RS': (43, 'Rio Grande do Sul', 'Sul'), 'MS': (50, 'Mato Grosso do Sul', 'Centro-Oeste'), 'MT': (51, 'Mato Grosso', 'Centro-Oeste'),
       'GO': (52, 'Goiás', 'Centro-Oeste'), 'DF': (53, 'Distrito Federal', 'Centro-Oeste')}
ANOS = list(range(1994, 2027, 2))


def extrai(zipp, padrao, destino):
    """tira de um zip só os CSV que interessam (padrão no nome) e devolve a lista"""
    out = []
    with zipfile.ZipFile(zipp) as z:
        for n in z.namelist():
            if n.lower().endswith(('.csv', '.txt')) and re.search(padrao, n, re.I):
                alvo = os.path.join(destino, re.sub(r'[^\w.]', '_', n))
                # o TSE grava em latin-1; aqui vira UTF-8 (caractere inválido vira '?', em vez de travar a leitura)
                with z.open(n) as a, open(alvo, 'w', encoding='utf-8', newline='') as b:
                    while True:
                        bloco = a.read(1 << 22)
                        if not bloco: break
                        b.write(bloco.decode('latin-1', errors='replace'))
                out.append(alvo)
    return out


def le(arqs, extra=''):
    lista = "[" + ",".join("'" + a + "'" for a in arqs) + "]"
    return f"read_csv({lista}, delim=';', quote='\"', header=true, all_varchar=true, union_by_name=true, ignore_errors=true, null_padding=true, strict_mode=false, max_line_size=4000000, parallel=false{extra})"


# ------------------------------------------------------------------ base: dimensões
if 'base' in ETAPAS:
    con.execute("""
    CREATE OR REPLACE TABLE uf (sg_uf VARCHAR PRIMARY KEY, cd_uf_ibge TINYINT, nm_uf VARCHAR, nm_regiao VARCHAR);
    CREATE OR REPLACE TABLE municipio (cd_municipio_tse INTEGER PRIMARY KEY, cd_municipio_ibge INTEGER, nm_municipio VARCHAR, sg_uf VARCHAR, fl_capital BOOLEAN);
    CREATE OR REPLACE TABLE indicador_municipio (cd_municipio_tse INTEGER, nr_ano_referencia SMALLINT, qt_populacao INTEGER, vr_pib_mil_reais DECIMAL(16,2), vr_idhm DECIMAL(4,3), PRIMARY KEY (cd_municipio_tse, nr_ano_referencia));
    CREATE OR REPLACE TABLE eleicao (id_eleicao SMALLINT PRIMARY KEY, nr_ano_eleicao SMALLINT, tp_abrangencia VARCHAR, ds_eleicao VARCHAR);
    """)
    con.executemany("INSERT INTO uf VALUES (?,?,?,?)", [(k, *v) for k, v in UFS.items()])
    cid = json.load(open(f'{D}/cidades.json'))
    con.executemany("INSERT INTO municipio VALUES (?,?,?,?,?)", [(c[0], int(c[1]), c[2], c[3], bool(c[4])) for c in cid])
    con.executemany("INSERT INTO indicador_municipio VALUES (?,?,?,?,NULL)", [(c[0], 2022, c[5], None) for c in cid if c[5]])
    I = '/mnt/user-data/uploads/BDR_Votacao/dados/ibge/'
    pib = {r['D1C']: float(r['V']) for r in json.load(open(I + 'pib_2021.json'))[1:] if r['V'].replace('.', '').isdigit()}
    con.executemany("INSERT INTO indicador_municipio VALUES (?,2021,NULL,?,NULL)", [(c[0], pib[c[1]]) for c in cid if c[1] in pib])
    con.executemany("INSERT INTO eleicao VALUES (?,?,?,?)", [(i + 1, a, 'GERAL' if a % 4 == 2 else 'MUNICIPAL', f"Eleições {'Gerais' if a % 4 == 2 else 'Municipais'} {a}") for i, a in enumerate(ANOS)])
    log('base:', con.execute("select count(*) from municipio").fetchone()[0], 'municípios')

# ------------------------------------------------------------------ cand: pessoa e candidatura
if 'cand' in ETAPAS and not ('cand2' in ETAPAS):
    tmp = tempfile.mkdtemp(dir='/tmp/claude-0/br')
    con.execute("CREATE OR REPLACE TABLE stg_cand AS SELECT * FROM (SELECT NULL::VARCHAR x) WHERE false")
    first = True
    for ano in ANOS:
        z = f'{P}/consulta_cand_{ano}.zip.001'
        if not os.path.exists(z): continue
        arqs = [a for a in extrai(z, r'consulta_cand_\d{4}_(?!BRASIL)', tmp)]
        cols = set(open(arqs[0], encoding='utf-8').readline().replace('"', '').strip().split(';'))
        COLS = ['ANO_ELEICAO', 'CD_TIPO_ELEICAO', 'NR_TURNO', 'SG_UF', 'SG_UE', 'CD_CARGO', 'DS_CARGO', 'SQ_CANDIDATO', 'NR_CANDIDATO', 'NM_CANDIDATO', 'NM_URNA_CANDIDATO',
                'NR_PARTIDO', 'SG_PARTIDO', 'NM_PARTIDO', 'DT_NASCIMENTO', 'NR_TITULO_ELEITORAL_CANDIDATO', 'DS_GENERO', 'CD_GRAU_INSTRUCAO', 'DS_GRAU_INSTRUCAO', 'DS_COR_RACA',
                'CD_SIT_TOT_TURNO', 'DS_SIT_TOT_TURNO', 'NR_IDADE_DATA_POSSE', 'ST_REELEICAO', 'VR_DESPESA_MAX_CAMPANHA']
        sel = "SELECT " + ", ".join((c if c in cols else "NULL::VARCHAR AS " + c) for c in COLS) +  f" FROM {le(arqs)} WHERE CD_TIPO_ELEICAO = '2' OR NM_TIPO_ELEICAO ILIKE 'ORDIN%'"
        if first: con.execute(f"CREATE OR REPLACE TABLE stg_cand AS {sel}"); first = False
        else: con.execute(f"INSERT INTO stg_cand {sel}")
        for a in arqs: os.remove(a)
        log('cand', ano, con.execute(f"select count(*) from stg_cand where ANO_ELEICAO='{ano}'").fetchone()[0])
    shutil.rmtree(tmp, ignore_errors=True)
if 'cand' in ETAPAS or 'cand2' in ETAPAS:
    con.execute("""
    CREATE OR REPLACE TABLE cargo AS SELECT CAST(CD_CARGO AS SMALLINT) cd_cargo, ANY_VALUE(DS_CARGO) ds_cargo FROM stg_cand GROUP BY 1;
    CREATE OR REPLACE TABLE grau_instrucao AS
      SELECT CAST(CD_GRAU_INSTRUCAO AS TINYINT) cd_grau_instrucao,
             CASE CAST(CD_GRAU_INSTRUCAO AS TINYINT) WHEN 1 THEN 'ANALFABETO' WHEN 2 THEN 'LÊ E ESCREVE' WHEN 3 THEN 'ENSINO FUNDAMENTAL INCOMPLETO'
                  WHEN 4 THEN 'ENSINO FUNDAMENTAL COMPLETO' WHEN 5 THEN 'ENSINO MÉDIO INCOMPLETO' WHEN 6 THEN 'ENSINO MÉDIO COMPLETO'
                  WHEN 7 THEN 'SUPERIOR INCOMPLETO' WHEN 8 THEN 'SUPERIOR COMPLETO' ELSE ANY_VALUE(DS_GRAU_INSTRUCAO) END ds_grau_instrucao,
             -- o código do TSE já é a ordem (1 analfabeto ... 8 superior completo); anos antigos usam "1º GRAU" no texto
             CASE WHEN CAST(CD_GRAU_INSTRUCAO AS TINYINT) BETWEEN 1 AND 8 THEN CAST(CD_GRAU_INSTRUCAO AS TINYINT) ELSE 0 END nr_ordem
      FROM stg_cand WHERE TRY_CAST(CD_GRAU_INSTRUCAO AS TINYINT) IS NOT NULL GROUP BY 1;
    CREATE OR REPLACE TABLE situacao_totalizacao AS
      SELECT ROW_NUMBER() OVER (ORDER BY ds)::SMALLINT id_situacao, ds ds_sit_tot_turno, (ds LIKE 'ELEITO%' OR ds = 'MÉDIA') fl_eleito
      FROM (SELECT DISTINCT DS_SIT_TOT_TURNO ds FROM stg_cand WHERE DS_SIT_TOT_TURNO IS NOT NULL);
    CREATE OR REPLACE TABLE partido AS
      SELECT ROW_NUMBER() OVER (ORDER BY sg)::SMALLINT id_partido, nr::TINYINT nr_partido, sg sg_partido, nm nm_partido,
             NULL::VARCHAR ds_espectro, NULL::DOUBLE vr_nota_harvard, NULL::DOUBLE vr_nota_voto
      FROM (SELECT TRY_CAST(NR_PARTIDO AS INTEGER) nr, SG_PARTIDO sg, ANY_VALUE(NM_PARTIDO) nm FROM stg_cand GROUP BY 1, 2);
    CREATE OR REPLACE TABLE pessoa AS
      SELECT ROW_NUMBER() OVER (ORDER BY tit)::INTEGER id_pessoa, tit nr_titulo_eleitoral, ANY_VALUE(NM_CANDIDATO) nm_pessoa,
             MAX(TRY_STRPTIME(DT_NASCIMENTO, '%d/%m/%Y'))::DATE dt_nascimento, ANY_VALUE(DS_GENERO) ds_genero, ANY_VALUE(DS_COR_RACA) ds_cor_raca
      FROM (SELECT *, CASE WHEN regexp_matches(NR_TITULO_ELEITORAL_CANDIDATO, '^[0-9]{8,}$') AND NR_TITULO_ELEITORAL_CANDIDATO NOT LIKE '000000%'
                           THEN NR_TITULO_ELEITORAL_CANDIDATO ELSE 'SQ' || ANO_ELEICAO || SG_UE || SQ_CANDIDATO END tit FROM stg_cand) GROUP BY tit;
    """)
    con.execute("""
    CREATE OR REPLACE TABLE candidatura AS
    WITH s AS (
      SELECT *, CASE WHEN regexp_matches(NR_TITULO_ELEITORAL_CANDIDATO, '^[0-9]{8,}$') AND NR_TITULO_ELEITORAL_CANDIDATO NOT LIKE '000000%'
                     THEN NR_TITULO_ELEITORAL_CANDIDATO ELSE 'SQ' || ANO_ELEICAO || SG_UE || SQ_CANDIDATO END tit,
             CASE WHEN CD_CARGO IN ('11','12','13') THEN SG_UE WHEN CD_CARGO = '1' THEN 'BR' ELSE SG_UF END alcance,
             ROW_NUMBER() OVER (PARTITION BY ANO_ELEICAO, CASE WHEN CD_CARGO IN ('11','12','13') THEN SG_UE WHEN CD_CARGO = '1' THEN 'BR' ELSE SG_UF END, CD_CARGO, SQ_CANDIDATO
                                ORDER BY TRY_CAST(NR_TURNO AS INT) DESC) rk
      FROM stg_cand)
    SELECT ROW_NUMBER() OVER ()::INTEGER id_candidatura, TRY_CAST(s.SQ_CANDIDATO AS BIGINT) sq_candidato, pe.id_pessoa, e.id_eleicao,
           CAST(s.CD_CARGO AS SMALLINT) cd_cargo, pa.id_partido, NULLIF(s.SG_UF, 'BR') sg_uf, s.alcance sg_ue,
           CASE WHEN s.CD_CARGO IN ('11','12','13') THEN TRY_CAST(s.SG_UE AS INTEGER) END cd_municipio_tse,
           TRY_CAST(s.NR_CANDIDATO AS INTEGER) nr_candidato, s.NM_URNA_CANDIDATO nm_urna,
           (SELECT CASE WHEN i BETWEEN 16 AND 105 THEN i::TINYINT END FROM (SELECT COALESCE(TRY_CAST(s.NR_IDADE_DATA_POSSE AS INT),
                    date_diff('year', TRY_STRPTIME(s.DT_NASCIMENTO, '%d/%m/%Y'), make_date(CAST(s.ANO_ELEICAO AS INT) + 1, 1, 1))) i)) nr_idade_posse,
           TRY_CAST(s.CD_GRAU_INSTRUCAO AS TINYINT) cd_grau_instrucao, st.id_situacao,
           CASE s.ST_REELEICAO WHEN 'S' THEN true WHEN 'N' THEN false END st_reeleicao, TRY_CAST(REPLACE(s.VR_DESPESA_MAX_CAMPANHA, ',', '.') AS DECIMAL(14,2)) vr_despesa_max
    FROM s
    JOIN eleicao e ON e.nr_ano_eleicao = CAST(s.ANO_ELEICAO AS INT)
    JOIN pessoa pe ON pe.nr_titulo_eleitoral = s.tit
    JOIN partido pa ON pa.sg_partido = s.SG_PARTIDO AND pa.nr_partido IS NOT DISTINCT FROM TRY_CAST(s.NR_PARTIDO AS INTEGER)
    LEFT JOIN situacao_totalizacao st ON st.ds_sit_tot_turno = s.DS_SIT_TOT_TURNO
    WHERE s.rk = 1;
    DROP TABLE stg_cand;
    """)
    log('candidaturas', con.execute("select count(*) from candidatura").fetchone()[0], 'pessoas', con.execute("select count(*) from pessoa").fetchone()[0])

# ------------------------------------------------------------------ espectro dos partidos (as duas réguas do site)
if 'espectro' in ETAPAS:
    H = json.load(open(f'{D}/ideologia.json'))['anos']; Vt = json.load(open(f'{D}/ideologia_voto.json'))['anos']
    def ultimo(I, sg):
        for a in sorted(I, reverse=True):
            if sg in I[a] and I[a][sg][0] is not None: return I[a][sg][0]
    faixa = lambda n: None if n is None else 'ESQUERDA' if n < -0.5 else 'CENTRO-ESQUERDA' if n < -0.25 else 'CENTRO' if n <= 0.25 else 'CENTRO-DIREITA' if n <= 0.5 else 'DIREITA'
    rows = []
    for (idp, sg) in con.execute("select id_partido, sg_partido from partido").fetchall():
        h, v = ultimo(H, sg), ultimo(Vt, sg)
        rows.append((h, v, faixa(v if v is not None else h), idp))
    con.executemany("UPDATE partido SET vr_nota_harvard = ?, vr_nota_voto = ?, ds_espectro = ? WHERE id_partido = ?", rows)
    log('espectro:', con.execute("select ds_espectro, count(*) from partido group by 1 order by 1").fetchall())

# ------------------------------------------------------------------ votos: votacao_candidato no nível do município
# Vem dos parquets do processa_munzona.py (votos somados por município). O candidato é achado por
# (eleição, alcance, cargo, número), que é único em todos os anos, mesmo quando o sequencial do TSE se repete.
if 'votos' in ETAPAS:
    PQ = '/tmp/claude-0/br/pq'
    con.execute("CREATE OR REPLACE TABLE votacao_candidato (id_candidatura INTEGER, nr_turno TINYINT, cd_municipio_tse INTEGER, nr_zona SMALLINT, qt_votos_nominais INTEGER)")
    for ano in ANOS:
        if not os.path.exists(f'{PQ}/votos_{ano}.parquet'): continue
        # liga cada candidato do arquivo de votos a UMA candidatura: pelo sequencial quando ele é o do TSE;
        # nos anos em que foi recodificado (1998-2010), pelo número, preferindo a candidatura de mesmo nome na urna
        con.execute(f"""
        INSERT INTO votacao_candidato
        WITH k AS (SELECT sq, cargo, nr, nome, CASE WHEN cargo IN (11, 12, 13) THEN ue WHEN cargo = 1 THEN 'BR' ELSE uf END alcance
                   FROM read_parquet('{PQ}/cand_{ano}.parquet') WHERE cargo IN (1, 3, 5, 6, 7, 8, 11, 13)),
        liga AS (
          SELECT k.sq, ca.id_candidatura,
                 ROW_NUMBER() OVER (PARTITION BY k.sq ORDER BY (ca.sq_candidato = k.sq) DESC, (ca.nm_urna = k.nome) DESC, st.fl_eleito DESC NULLS LAST, ca.id_candidatura) rk
          FROM k JOIN eleicao e ON e.nr_ano_eleicao = {ano}
          JOIN candidatura ca ON ca.id_eleicao = e.id_eleicao AND ca.cd_cargo = k.cargo AND ca.sg_ue = k.alcance
               AND (ca.sq_candidato = k.sq OR ca.nr_candidato = TRY_CAST(k.nr AS INTEGER))
          LEFT JOIN situacao_totalizacao st ON st.id_situacao = ca.id_situacao)
        SELECT l.id_candidatura, v.turno, v.cd_mun, 0, SUM(v.votos)
        FROM read_parquet('{PQ}/votos_{ano}.parquet') v JOIN liga l ON l.sq = v.sq AND l.rk = 1
        GROUP BY 1, 2, 3""")
        tot = con.execute(f"select sum(votos) from read_parquet('{PQ}/votos_{ano}.parquet') where cargo in (1,3,5,6,7,8,11,13)").fetchone()[0]
        ok = con.execute(f"select sum(qt_votos_nominais) from votacao_candidato vc join candidatura c using(id_candidatura) join eleicao e using(id_eleicao) where e.nr_ano_eleicao={ano}").fetchone()[0]
        log('votos', ano, f'{ok:,} de {tot:,} votos ligados a uma candidatura ({100*ok/tot:.2f}%)')

# ------------------------------------------------------------------ partido_votos: votacao_partido (votos nominais e de legenda)
if 'partido_votos' in ETAPAS:
    tmp = tempfile.mkdtemp(dir='/tmp/claude-0/br')
    con.execute("CREATE OR REPLACE TABLE votacao_partido (id_eleicao SMALLINT, nr_turno TINYINT, cd_cargo SMALLINT, id_partido SMALLINT, cd_municipio_tse INTEGER, nr_zona SMALLINT, qt_votos_nominais BIGINT, qt_votos_legenda BIGINT)")
    for ano in ANOS:
        z = f'{P}/votacao_partido_munzona_{ano}.zip.001'
        if not os.path.exists(z): continue
        arqs = extrai(z, r'votacao_partido_munzona_\d{4}_(?!BRASIL)', tmp)
        cols = set(open(arqs[0], encoding='utf-8').readline().replace('"', '').strip().split(';'))
        nom = 'QT_VOTOS_NOMINAIS_VALIDOS' if 'QT_VOTOS_NOMINAIS_VALIDOS' in cols else 'QT_VOTOS_NOMINAIS'
        leg = 'QT_VOTOS_LEGENDA_VALIDOS' if 'QT_VOTOS_LEGENDA_VALIDOS' in cols else 'QT_VOTOS_LEGENDA'
        tipo = "(CD_TIPO_ELEICAO = '2' OR NM_TIPO_ELEICAO ILIKE 'ORDIN%')" if 'NM_TIPO_ELEICAO' in cols else "true"
        con.execute(f"CREATE OR REPLACE TEMP TABLE vp AS SELECT * FROM {le(arqs)} WHERE {tipo}")
        # partidos que só aparecem aqui entram no domínio
        con.execute("""INSERT INTO partido SELECT (SELECT MAX(id_partido) FROM partido) + ROW_NUMBER() OVER (), nr, sg, nm, NULL, NULL, NULL
                       FROM (SELECT DISTINCT TRY_CAST(NR_PARTIDO AS INTEGER) nr, SG_PARTIDO sg, NM_PARTIDO nm FROM vp) x
                       WHERE NOT EXISTS (SELECT 1 FROM partido p WHERE p.sg_partido = x.sg AND p.nr_partido IS NOT DISTINCT FROM x.nr)""")
        con.execute(f"""INSERT INTO votacao_partido
            SELECT e.id_eleicao, TRY_CAST(NR_TURNO AS TINYINT), TRY_CAST(CD_CARGO AS SMALLINT), p.id_partido, TRY_CAST(CD_MUNICIPIO AS INTEGER), 0,
                   SUM(GREATEST(TRY_CAST({nom} AS BIGINT), 0)), CASE WHEN MIN(TRY_CAST({leg} AS BIGINT)) < 0 THEN NULL ELSE SUM(TRY_CAST({leg} AS BIGINT)) END  -- 1998: o TSE marca a legenda como -3 (sem dado)
            FROM vp JOIN eleicao e ON e.nr_ano_eleicao = {ano}
            JOIN partido p ON p.sg_partido = vp.SG_PARTIDO AND p.nr_partido IS NOT DISTINCT FROM TRY_CAST(vp.NR_PARTIDO AS INTEGER)
            GROUP BY 1, 2, 3, 4, 5""")
        for a in arqs: os.remove(a)
        log('legenda', ano, con.execute(f"select sum(qt_votos_legenda), sum(qt_votos_nominais) from votacao_partido join eleicao using(id_eleicao) where nr_ano_eleicao={ano} and cd_cargo in (6,7,13)").fetchone())
    shutil.rmtree(tmp, ignore_errors=True)

# ------------------------------------------------------------------ comp: comparecimento por município, todos os cargos
if 'comp' in ETAPAS:
    tmp = tempfile.mkdtemp(dir='/tmp/claude-0/br')
    con.execute("CREATE OR REPLACE TABLE comparecimento (id_eleicao SMALLINT, nr_turno TINYINT, cd_cargo SMALLINT, cd_municipio_tse INTEGER, nr_zona SMALLINT, qt_aptos BIGINT, qt_comparecimento BIGINT, qt_abstencoes BIGINT, qt_votos_brancos BIGINT, qt_votos_nulos BIGINT)")
    for ano in ANOS:
        z = f'{P}/detalhe_votacao_munzona_{ano}.zip.001'
        if not os.path.exists(z): continue
        arqs = extrai(z, r'detalhe_votacao_munzona_\d{4}_(?!BRASIL)', tmp)
        cols = set(open(arqs[0], encoding='utf-8').readline().replace('"', '').strip().split(';'))
        nul = "GREATEST(COALESCE(TRY_CAST(QT_TOTAL_VOTOS_NULOS AS BIGINT), 0), COALESCE(TRY_CAST(QT_VOTOS_NULOS AS BIGINT), 0))" if 'QT_VOTOS_NULOS' in cols else "TRY_CAST(QT_TOTAL_VOTOS_NULOS AS BIGINT)"
        tipo = "(CD_TIPO_ELEICAO = '2' OR NM_TIPO_ELEICAO ILIKE 'ORDIN%')" if 'NM_TIPO_ELEICAO' in cols else "true"
        con.execute(f"""INSERT INTO comparecimento
            SELECT e.id_eleicao, TRY_CAST(NR_TURNO AS TINYINT), TRY_CAST(CD_CARGO AS SMALLINT), TRY_CAST(CD_MUNICIPIO AS INTEGER), 0,
                   SUM(TRY_CAST(QT_APTOS AS BIGINT)), SUM(TRY_CAST(QT_COMPARECIMENTO AS BIGINT)), SUM(TRY_CAST(QT_ABSTENCOES AS BIGINT)),
                   SUM(TRY_CAST(QT_VOTOS_BRANCOS AS BIGINT)), SUM({nul})
            FROM {le(arqs)} JOIN eleicao e ON e.nr_ano_eleicao = {ano} WHERE {tipo} GROUP BY 1, 2, 3, 4""")
        for a in arqs: os.remove(a)
        log('comp', ano, con.execute(f"select round(100*sum(qt_abstencoes)/sum(qt_aptos),1) from comparecimento join eleicao using(id_eleicao) where nr_ano_eleicao={ano} and nr_turno=1 and cd_cargo in (1,11)").fetchone())
    shutil.rmtree(tmp, ignore_errors=True)

# ------------------------------------------------------------------ contas: receita e despesa dos candidatos
# 2018 em diante: receitas_candidatos e despesas_contratadas_candidatos (sequencial único no ano).
# 2010 a 2014: arquivos .txt antigos, com cabeçalho por extenso; o sequencial é único dentro da UF.
def tipo_doador_sql(origem, doc):
    return f"""CASE WHEN upper({origem}) LIKE '%JUR_DICAS%' THEN 'PJ' WHEN upper({origem}) LIKE '%F_SICAS%' THEN 'PF'
               WHEN upper({origem}) LIKE '%PR_PRIOS%' THEN 'CANDIDATO' WHEN upper({origem}) LIKE '%PARTIDO%' OR upper({origem}) LIKE '%FUNDO%' OR upper({origem}) LIKE '%FEFC%' THEN 'PARTIDO'
               WHEN upper({origem}) LIKE '%OUTROS CANDIDATOS%' THEN 'CANDIDATO' WHEN upper({origem}) LIKE '%COMIT%' THEN 'OUTROS'
               WHEN length(regexp_replace(coalesce({doc}, ''), '[^0-9]', '', 'g')) = 14 THEN 'PJ'
               WHEN length(regexp_replace(coalesce({doc}, ''), '[^0-9]', '', 'g')) = 11 THEN 'PF' ELSE 'OUTROS' END"""
publico_sql = lambda fonte, origem: f"(upper(coalesce({fonte}, '') || ' ' || coalesce({origem}, '')) SIMILAR TO '.*(FUNDO|FEFC|ESPECIAL DE FINANCIAMENTO).*')"
num = lambda c: f"TRY_CAST(REPLACE(REPLACE({c}, '.', ''), ',', '.') AS DECIMAL(16,2))"
data = lambda c: f"COALESCE(TRY_STRPTIME({c}, '%d/%m/%Y'), TRY_STRPTIME(left({c}, 10), '%d/%m/%Y'), TRY_STRPTIME(left({c}, 10), '%Y-%m-%d'))::DATE"

ANOS_CONTAS = [int(a) for a in ETAPAS if a.isdigit()]
if 'contas' in ETAPAS:
    con.execute("""CREATE TABLE IF NOT EXISTS receita (id_receita BIGINT, id_candidatura INTEGER, ds_fonte_receita VARCHAR, ds_origem_receita VARCHAR, tp_doador VARCHAR,
                   nr_cpf_cnpj_doador VARCHAR, nm_doador VARCHAR, cd_cnae_doador VARCHAR, fl_recurso_publico BOOLEAN, vr_receita DECIMAL(16,2), dt_receita DATE, nr_ano_eleicao SMALLINT)""")
    con.execute("""CREATE TABLE IF NOT EXISTS despesa (id_despesa BIGINT, id_candidatura INTEGER, ds_origem_despesa VARCHAR, ds_despesa VARCHAR,
                   nr_cpf_cnpj_fornecedor VARCHAR, nm_fornecedor VARCHAR, vr_despesa DECIMAL(16,2), dt_despesa DATE, nr_ano_eleicao SMALLINT)""")
    for ano in ANOS_CONTAS:
        z = f'{P}/contas_{ano}.zip'
        if not os.path.exists(z): log('sem', z); continue
        con.execute(f"DELETE FROM receita WHERE nr_ano_eleicao = {ano}; DELETE FROM despesa WHERE nr_ano_eleicao = {ano}")
        tmp = tempfile.mkdtemp(dir='/tmp/claude-0/br')
        # liga o lançamento à candidatura: pelo sequencial no ano (e pela UF quando o sequencial só é único na UF)
        cand = f"""(SELECT ca.id_candidatura, ca.sq_candidato, COALESCE(ca.sg_uf, 'BR') sg_uf FROM candidatura ca JOIN eleicao e USING (id_eleicao) WHERE e.nr_ano_eleicao = {ano})"""
        por_uf = ano < 2012 or ano == 2014 and False
        chave = "c.sq_candidato = TRY_CAST(r.SQ AS BIGINT)" + (" AND c.sg_uf = r.UF" if por_uf else "")
        if ano >= 2016:
            rec = extrai(z, rf'^receitas_candidatos_{ano}_[A-Z]{{2}}\.csv$', tmp)
            con.execute(f"""INSERT INTO receita
                SELECT NULL, c.id_candidatura, DS_FONTE_RECEITA, DS_ORIGEM_RECEITA, {tipo_doador_sql('DS_ORIGEM_RECEITA', 'NR_CPF_CNPJ_DOADOR')},
                       regexp_replace(NR_CPF_CNPJ_DOADOR, '[^0-9]', '', 'g'), NM_DOADOR, CD_CNAE_DOADOR, {publico_sql('DS_FONTE_RECEITA', 'DS_ORIGEM_RECEITA')},
                       {num('VR_RECEITA')}, {data('DT_RECEITA')}, {ano}
                FROM (SELECT *, SQ_CANDIDATO SQ, SG_UF UF FROM {le(rec)}) r JOIN {cand} c ON {chave}""")
            for a in rec: os.remove(a)
            des = extrai(z, rf'^despesas_contratadas_candidatos_{ano}_[A-Z]{{2}}\.csv$', tmp)
            con.execute(f"""INSERT INTO despesa
                SELECT NULL, c.id_candidatura, DS_ORIGEM_DESPESA, DS_DESPESA, regexp_replace(NR_CPF_CNPJ_FORNECEDOR, '[^0-9]', '', 'g'), NM_FORNECEDOR,
                       {num('VR_DESPESA_CONTRATADA')}, {data('DT_DESPESA')}, {ano}
                FROM (SELECT *, SQ_CANDIDATO SQ, SG_UF UF FROM {le(des)}) r JOIN {cand} c ON {chave}""")
            for a in des: os.remove(a)
        else:
            # formato antigo (.txt): cabeçalho por extenso; normaliza os nomes das colunas
            rec = extrai(z, r'^(?!.*brasil)(.*/)?receitas_?candidatos', tmp)
            des = extrai(z, r'^(?!.*brasil)(.*/)?despesas_?candidatos', tmp)
            def colmap(arq):
                cab = open(arq, encoding='utf-8').readline().replace('"', '').strip().split(';')
                n = lambda t: re.sub(r'[^a-z]', '', __import__('unicodedata').normalize('NFD', t.strip().lower()).encode('ascii', 'ignore').decode())
                return {n(c): c for c in cab}
            def pega(m, *alvos):
                for a_ in alvos:
                    for k_, v_ in m.items():
                        if k_ == a_: return f'"{v_}"'
                return 'NULL'
            for arq in rec:
                m = colmap(arq)
                seq, uf_, doc, nome, cnae, dt, vr, tipo, fonte = (pega(m, 'sequencialcandidato'), pega(m, 'uf'), pega(m, 'cpfcnpjdodoador'), pega(m, 'nomedodoador'),
                    pega(m, 'codsetoreconomicododoador'), pega(m, 'datadareceita'), pega(m, 'valorreceita'), pega(m, 'tiporeceita'), pega(m, 'fonterecurso'))
                if seq == 'NULL': continue
                con.execute(f"""INSERT INTO receita
                    SELECT NULL, c.id_candidatura, COALESCE({fonte}, 'NÃO INFORMADO'), {tipo}, {tipo_doador_sql(tipo, doc)}, regexp_replace({doc}, '[^0-9]', '', 'g'),
                           {nome}, {cnae}, {publico_sql(fonte, tipo)}, {num(vr)}, {data(dt)}, {ano}
                    FROM (SELECT *, {seq} SQ, {uf_} UF FROM {le([arq])}) r JOIN {cand} c ON {chave}""")
            for arq in des:
                m = colmap(arq)
                seq, uf_, doc, nome, dt, vr, tipo, descr = (pega(m, 'sequencialcandidato'), pega(m, 'uf'), pega(m, 'cpfcnpjdofornecedor'), pega(m, 'nomedofornecedor'),
                    pega(m, 'datadadespesa'), pega(m, 'valordespesa'), pega(m, 'tipodespesa'), pega(m, 'descricaodadespesa', 'descricaodespesa'))
                if seq == 'NULL': continue
                con.execute(f"""INSERT INTO despesa
                    SELECT NULL, c.id_candidatura, {tipo}, {descr}, regexp_replace({doc}, '[^0-9]', '', 'g'), {nome}, {num(vr)}, {data(dt)}, {ano}
                    FROM (SELECT *, {seq} SQ, {uf_} UF FROM {le([arq])}) r JOIN {cand} c ON {chave}""")
            for a in rec + des: os.remove(a)
        shutil.rmtree(tmp, ignore_errors=True)
        log('contas', ano, con.execute(f"select count(*), round(sum(vr_receita)/1e9, 2) from receita where nr_ano_eleicao={ano}").fetchone(),
            con.execute(f"select count(*), round(sum(vr_despesa)/1e9, 2) from despesa where nr_ano_eleicao={ano}").fetchone())

# ------------------------------------------------------------------ propostas: texto dos planos de governo (presidente)
# O TSE publica os planos como PDF, um por candidato; o nome do arquivo traz o sequencial. Texto extraído com pdftotext.
if 'propostas' in ETAPAS:
    import subprocess
    con.execute("CREATE TABLE IF NOT EXISTS proposta_governo (id_candidatura INTEGER PRIMARY KEY, tx_proposta VARCHAR)")
    for ano in (2018, 2022, 2026):
        z = f'{P}/../../propostas/proposta_governo_{ano}_BR.zip'
        if not os.path.exists(z): log('sem', z); continue
        tmp = tempfile.mkdtemp(dir='/tmp/claude-0/br')
        with zipfile.ZipFile(z) as zz:
            for n in zz.namelist():
                m = re.search(r'(\d{4})BR(\d+)(_\d+)?\.pdf$', n)
                if not m: continue
                pdf = os.path.join(tmp, 'p.pdf')
                with zz.open(n) as a_, open(pdf, 'wb') as b_: shutil.copyfileobj(a_, b_)
                txt = subprocess.run(['pdftotext', '-q', '-enc', 'UTF-8', pdf, '-'], capture_output=True).stdout.decode('utf-8', 'ignore')
                idc = con.execute(f"select id_candidatura from candidatura join eleicao using(id_eleicao) where nr_ano_eleicao={ano} and cd_cargo=1 and sq_candidato={int(m.group(2))}").fetchone()
                if idc and len(txt.strip()) > 200:
                    con.execute("INSERT OR REPLACE INTO proposta_governo VALUES (?, ?)", [idc[0], txt])
        shutil.rmtree(tmp, ignore_errors=True)
        log('propostas', ano, con.execute(f"select count(*), sum(length(tx_proposta)) from proposta_governo join candidatura using(id_candidatura) join eleicao using(id_eleicao) where nr_ano_eleicao={ano}").fetchone())

# ------------------------------------------------------------------ views: as mesmas do modelo do trabalho
# ------------------------------------------------------------------ notas: posição ideológica do partido em cada eleição
# Vem de scripts/notas_estudos.py (média de Zucco e Power 2024, Bolognesi, Ribeiro e Codato 2023 e V-Party 2022).
# A sigla do TSE vira uma "linhagem" (PFL -> DEM, PPB -> PP, PR -> PL...), que é a unidade medida pelos estudos.
if 'notas' in ETAPAS:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from notas_estudos import linhagem
    con.execute("""CREATE OR REPLACE TABLE partido_nota AS SELECT cd_linhagem, CAST(nr_ano_eleicao AS SMALLINT) nr_ano_eleicao, cd_fonte,
                   CAST(vr_nota AS DOUBLE) vr_nota, CAST(vr_erro AS DOUBLE) vr_erro, CAST(nr_ano_medida AS SMALLINT) nr_ano_medida, fl_aviso = '1' fl_aviso
                   FROM read_csv(?, all_varchar = true, header = true)""", [os.path.join(os.path.dirname(os.path.abspath(__file__)), 'partido_nota.csv')])
    pares = con.execute("""SELECT DISTINCT c.id_partido, p.sg_partido, e.nr_ano_eleicao FROM candidatura c JOIN partido p ON p.id_partido = c.id_partido
                           JOIN eleicao e ON e.id_eleicao = c.id_eleicao""").fetchall()
    con.execute("CREATE OR REPLACE TABLE partido_linhagem (id_partido INTEGER, nr_ano_eleicao SMALLINT, cd_linhagem VARCHAR)")
    con.executemany("INSERT INTO partido_linhagem VALUES (?, ?, ?)", [(i, a, linhagem(sg, a)) for i, sg, a in pares])
    con.execute("""CREATE OR REPLACE VIEW vw_partido_ano AS
      SELECT pl.id_partido, pl.nr_ano_eleicao, pl.cd_linhagem, n.vr_nota, n.fl_aviso AS fl_incerto,
             CASE WHEN n.vr_nota IS NULL THEN NULL WHEN n.vr_nota < -0.5 THEN 'ESQUERDA' WHEN n.vr_nota < -0.25 THEN 'CENTRO-ESQUERDA'
                  WHEN n.vr_nota <= 0.25 THEN 'CENTRO' WHEN n.vr_nota <= 0.5 THEN 'CENTRO-DIREITA' ELSE 'DIREITA' END AS ds_espectro
      FROM partido_linhagem pl LEFT JOIN partido_nota n ON n.cd_linhagem = pl.cd_linhagem AND n.nr_ano_eleicao = pl.nr_ano_eleicao AND n.cd_fonte = 'CONSENSO'""")
    log('notas:', con.execute("SELECT nr_ano_eleicao, COUNT(*), COUNT(vr_nota) FROM vw_partido_ano GROUP BY 1 ORDER BY 1").fetchall())

if 'views' in ETAPAS:
    con.execute("""
    CREATE OR REPLACE VIEW vw_candidatura_resumo AS
    SELECT c.id_candidatura, c.sq_candidato, e.nr_ano_eleicao, cg.ds_cargo, c.cd_cargo, p.sg_partido, pa.ds_espectro,
           c.sg_uf, c.cd_municipio_tse, COALESCE(st.fl_eleito, false) AS fl_eleito, c.nr_idade_posse,
           COALESCE(r.vr_total, 0) AS vr_receita_total, COALESCE(r.vr_publico, 0) AS vr_receita_publica,
           COALESCE(r.vr_privado, 0) AS vr_receita_privada, COALESCE(d.vr_total, 0) AS vr_despesa_total
    FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
    JOIN partido p ON p.id_partido = c.id_partido LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
    LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao   -- espectro do partido naquela eleição
    LEFT JOIN (SELECT id_candidatura, SUM(vr_receita) vr_total, SUM(CASE WHEN fl_recurso_publico THEN vr_receita ELSE 0 END) vr_publico,
                      SUM(CASE WHEN fl_recurso_publico THEN 0 ELSE vr_receita END) vr_privado FROM receita GROUP BY id_candidatura) r ON r.id_candidatura = c.id_candidatura
    LEFT JOIN (SELECT id_candidatura, SUM(vr_despesa) vr_total FROM despesa GROUP BY id_candidatura) d ON d.id_candidatura = c.id_candidatura;
    CREATE OR REPLACE VIEW vw_indicador_atual AS
    SELECT m.cd_municipio_tse, m.nm_municipio, m.sg_uf, pop.qt_populacao, pib.vr_pib_mil_reais,
           ROUND(pib.vr_pib_mil_reais * 1000 / NULLIF(pop.qt_populacao, 0), 2) AS vr_pib_per_capita, idh.vr_idhm
    FROM municipio m
    LEFT JOIN indicador_municipio pop ON pop.cd_municipio_tse = m.cd_municipio_tse AND pop.nr_ano_referencia = 2022
    LEFT JOIN indicador_municipio pib ON pib.cd_municipio_tse = m.cd_municipio_tse AND pib.nr_ano_referencia = 2021
    LEFT JOIN indicador_municipio idh ON idh.cd_municipio_tse = m.cd_municipio_tse AND idh.nr_ano_referencia = 2010
    WHERE pop.qt_populacao IS NOT NULL;
    """)

con.close()
