"""Exporta do MySQL (eleicoes_g6) os dados do site web/ em JSON compacto.
Uso: python exportar_web.py  (precisa do banco carregado e do cliente mariadb/mysql no PATH)"""
import subprocess, io, json, os, sys
import pandas as pd
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'data')
def q(sql):
    r = subprocess.run(['mariadb', '--default-character-set=utf8mb4', '-B', 'eleicoes_g6'], input=sql, capture_output=True, text=True)
    if r.returncode: raise SystemExit(r.stderr)
    return pd.read_csv(io.StringIO(r.stdout), sep='\t', na_values=['NULL'], keep_default_na=False, dtype={'cd_municipio_ibge': str})
def dump(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f: json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    print(path, os.path.getsize(path) // 1024, 'KB')
CARGO = {1: 'PRES', 3: 'GOV', 5: 'SEN', 6: 'DF', 7: 'DE', 11: 'PREF', 13: 'VER'}
UFS = ['CE', 'ES', 'MT', 'PR', 'SC', 'TO']
TOPN = {'DF': 10, 'DE': 10, 'VER': 12}

mun = q("""SELECT m.cd_municipio_tse t, m.cd_municipio_ibge, m.nm_municipio n, m.sg_uf uf, m.fl_capital cap,
  i.qt_populacao pop, i.vr_pib_per_capita pib FROM municipio m LEFT JOIN vw_indicador_atual i ON i.cd_municipio_tse=m.cd_municipio_tse""")
part = q("SELECT id_partido, sg_partido, nm_partido, ds_espectro FROM partido")
votos = q("""SELECT e.nr_ano_eleicao ano, c.cd_cargo, vc.nr_turno tu, vc.cd_municipio_tse t, c.id_candidatura id, SUM(vc.qt_votos_nominais) v
  FROM votacao_candidato vc JOIN candidatura c ON c.id_candidatura=vc.id_candidatura JOIN eleicao e ON e.id_eleicao=c.id_eleicao
  WHERE c.cd_cargo IN (1,3,5,6,7,11,13) AND e.nr_ano_eleicao>=2018 GROUP BY 1,2,3,4,5""")
cand = q("""SELECT c.id_candidatura id, c.sq_candidato sq, c.id_pessoa pe, e.nr_ano_eleicao ano, c.cd_cargo, c.sg_uf uf, c.cd_municipio_tse t,
  c.nr_candidato nr, c.nm_urna nm, p.sg_partido pa, COALESCE(st.fl_eleito,0) el, st.ds_sit_tot_turno sit, ps.ds_genero g, c.nr_idade_posse idade
  FROM candidatura c JOIN eleicao e ON e.id_eleicao=c.id_eleicao JOIN partido p ON p.id_partido=c.id_partido
  LEFT JOIN situacao_totalizacao st ON st.id_situacao=c.id_situacao LEFT JOIN pessoa ps ON ps.id_pessoa=c.id_pessoa
  WHERE c.id_candidatura IN (SELECT DISTINCT id_candidatura FROM votacao_candidato) AND e.nr_ano_eleicao>=2018 AND c.cd_cargo IN (1,3,5,6,7,11,13)""")
comp = q("""SELECT e.nr_ano_eleicao ano, cp.cd_cargo, cp.nr_turno tu, cp.cd_municipio_tse t, SUM(qt_aptos) ap, SUM(qt_comparecimento) co,
  SUM(qt_abstencoes) ab, SUM(qt_votos_brancos) br, SUM(qt_votos_nulos) nu FROM comparecimento cp JOIN eleicao e ON e.id_eleicao=cp.id_eleicao GROUP BY 1,2,3,4""")
votos['cg'] = votos.cd_cargo.map(CARGO); cand['cg'] = cand.cd_cargo.map(CARGO); comp['cg'] = comp.cd_cargo.map(CARGO)
tot_cand = votos.groupby('id').v.sum()
cand['vt'] = cand.id.map(tot_cand).fillna(0).astype(int)
muf = dict(zip(mun.t, mun.uf))
cand['ufr'] = cand.apply(lambda r: r.uf if r.uf in UFS else muf.get(r.t), axis=1)

# índice de cidades + partidos
dump(f'{OUT}/cidades.json', [[int(r.t), r.cd_municipio_ibge, r.n, r.uf, int(r.cap), None if pd.isna(r.pop) else int(r.pop), None if pd.isna(r.pib) else round(float(r.pib))] for r in mun.itertuples()])
dump(f'{OUT}/partidos.json', {r.sg_partido: [r.nm_partido.title() if isinstance(r.nm_partido, str) else r.sg_partido, r.ds_espectro] for r in part.itertuples()})

keep_ids = set()
for uf in UFS:
    tset = set(mun[mun.uf == uf].t)
    V = votos[votos.t.isin(tset)]
    M = {}
    for (ano, cg, tu, t), g in V.groupby(['ano', 'cg', 'tu', 't']):
        g = g.sort_values('v', ascending=False)
        n = TOPN.get(cg)
        rows = [[int(i), int(v)] for i, v in zip(g.id, g.v)]
        tot = int(g.v.sum())
        if n and len(rows) > n: rows = rows[:n]
        keep_ids.update(i for i, _ in rows)
        M.setdefault(str(t), {}).setdefault(str(ano), {}).setdefault(cg, {})['t%d' % tu] = {'c': rows, 'n': tot}
    C = comp[comp.t.isin(tset)]
    for r in C.itertuples():
        d = M.setdefault(str(r.t), {}).setdefault(str(r.ano), {}).setdefault(r.cg, {})
        d.setdefault('t%d' % r.tu, {'c': [], 'n': 0})['p'] = [int(r.ap), int(r.co), int(r.ab), int(r.br), int(r.nu)]
    ids = {i for t in M.values() for a in t.values() for c in a.values() for tt in c.values() for i, _ in tt['c']}
    K = cand[cand.id.isin(ids)]
    cands = {int(r.id): [r.nm, r.pa, int(r.nr), int(r.el), r.cg, int(r.ano), int(r.pe), str(r.sq), int(r.vt), r.sit if isinstance(r.sit, str) else '', r.g if isinstance(r.g, str) else '', None if pd.isna(r.idade) else int(r.idade)] for r in K.itertuples()}
    dump(f'{OUT}/uf/{uf}.json', {'cand': cands, 'mun': M})

# votos de cada candidato em todos os municípios (cargos estaduais e presidente)
for (uf, ano, cg), K in cand[cand.cg.isin(['PRES', 'GOV', 'SEN', 'DF', 'DE'])].groupby(['ufr', 'ano', 'cg']):
    if uf not in UFS: continue
    tset = set(mun[mun.uf == uf].t)
    if cg in ('DF', 'DE'): K = pd.concat([K[K.el == 1], K.sort_values('vt', ascending=False).head(40)]).drop_duplicates('id')
    V = votos[votos.id.isin(set(K.id)) & votos.t.isin(tset) & (votos.tu == 1)]
    out = {int(i): [[int(t), int(v)] for t, v in zip(g.t, g.v)] for i, g in V.groupby('id')}
    tot = {int(t): int(v) for t, v in votos[votos.t.isin(tset) & (votos.cg == cg) & (votos.ano == ano) & (votos.tu == 1)].groupby('t').v.sum().items()}
    dump(f'{OUT}/cand/{uf}_{ano}_{cg}.json', {'v': out, 'tot': tot})

# trajetórias 2002-2026 das pessoas exportadas
pes = set(cand[cand.id.isin(keep_ids) | cand.cg.isin(['PRES', 'GOV', 'SEN']) | (cand.el == 1)].pe)
T = q("""SELECT c.id_pessoa pe, e.nr_ano_eleicao ano, c.cd_cargo, p.sg_partido pa, c.sg_ue ue, c.sg_uf uf, c.cd_municipio_tse t, COALESCE(st.fl_eleito,0) el
  FROM candidatura c JOIN eleicao e ON e.id_eleicao=c.id_eleicao JOIN partido p ON p.id_partido=c.id_partido
  LEFT JOIN situacao_totalizacao st ON st.id_situacao=c.id_situacao WHERE c.cd_cargo IN (1,3,5,6,7,11,13)""")
T = T[T.pe.isin(pes)]; T['cg'] = T.cd_cargo.map(CARGO)
nm = dict(zip(mun.t, mun.n))
traj = {}
for pe, g in T.sort_values('ano').groupby('pe'):
    traj[int(pe)] = [[int(r.ano), r.cg, r.pa, (nm.get(r.t) if not pd.isna(r.t) else r.uf) or r.uf, int(r.el)] for r in g.itertuples()]
dump(f'{OUT}/trajetorias.json', traj)

# vencedores por cidade (mapa inicial e disputas apertadas)
esp = dict(zip(part.sg_partido, part.ds_espectro))
ibge = dict(zip(mun.t.astype(str), mun.cd_municipio_ibge))
W = {}
for uf in UFS:
    d = json.load(open(f'{OUT}/uf/{uf}.json', encoding='utf-8'))
    C = d['cand']
    for t, anos in d['mun'].items():
        for ano, cgs in anos.items():
            for cg, tus in cgs.items():
                if cg not in ('PRES', 'GOV', 'SEN', 'PREF'): continue
                tt = tus.get('t1')
                if not tt or not tt['c'] or not tt['n']: continue
                c1 = tt['c'][0]; c2 = tt['c'][1] if len(tt['c']) > 1 else None
                k = C[str(c1[0])]
                W.setdefault(ibge[t], {})[cg + ano] = [c1[0], k[0], k[1], round(100 * c1[1] / tt['n'], 1),
                    round(100 * (c1[1] - (c2[1] if c2 else 0)) / tt['n'], 2), c1[1] - (c2[1] if c2 else 0), c2[0] if c2 else None]
dump(f'{OUT}/vencedores.json', W)

# índice de busca de candidatos (majoritários e eleitos)
B = {}
for uf in UFS:
    d = json.load(open(f'{OUT}/uf/{uf}.json', encoding='utf-8'))
    for i, k in d['cand'].items():
        nm_, pa, nr, el, cg, ano, pe, sq, vt = k[:9]
        if cg == 'VER' and not el: continue
        if cg in ('DF', 'DE') and not el: continue
        if cg == 'PRES' and uf != 'PR': continue
        B[i] = [int(i), nm_, pa, cg, ano, uf, vt]
dump(f'{OUT}/busca.json', list(B.values()))
