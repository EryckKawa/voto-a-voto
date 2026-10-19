"""Deputado federal, deputado estadual (distrital no DF) e vereador no mapa: em cada cidade, o partido mais votado.

Voto do partido na cidade = votos nominais dos seus candidatos (parquet do processa_munzona) + votos de legenda
(tabela votacao_partido do banco nacional; o TSE só separa a legenda de 2000 em diante).
Saídas, em data/br/:
  venc/{DF|DE|VER}{ANO}.json  mesmo formato dos outros cargos: [sq do candidato mais votado, nome dele, partido mais
                              votado, % do partido, vantagem em pontos, vantagem em votos, None, 2º partido, nota, 1]
  prop/{CARGO}{ANO}.json      {UF: {cód. TSE da cidade: [[partido, votos], ...]}} (8 maiores e "outros") e totais
  hist/{UF}.json              acrescenta as linhas DF, DE e VER ao histórico de cada cidade
Uso: python nacional_proporcional.py [caminho do banco .duckdb]"""
import sys, os, json, glob, duckdb, pandas as pd
sys.path.insert(0, os.path.dirname(__file__)); from ideologia import nota, BOL
D = os.path.join(os.path.dirname(__file__), '..', 'data', 'br'); PQ = '/tmp/claude-0/br/pq'
DB = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/br/db/eleicoes_brasil.duckdb'
dump = lambda p, o: json.dump(o, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
cid = json.load(open(f'{D}/cidades.json', encoding='utf-8')); tse2 = {r[0]: r for r in cid}
db = duckdb.connect(DB, read_only=True)
CG = {'DF': [6], 'DE': [7, 8], 'VER': [13]}
ANOS = {'DF': [1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026], 'DE': [1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026],
        'VER': [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024]}
hist = {}   # uf -> ibge -> cargo -> [[ano, nome, sg, pct, 1]]
os.makedirs(f'{D}/prop', exist_ok=True)
for cg, anos in CG.items():
    for ano in ANOS[cg]:
        V = pd.read_parquet(f'{PQ}/votos_{ano}.parquet'); C = pd.read_parquet(f'{PQ}/cand_{ano}.parquet').set_index('sq')
        V = V[V.cargo.isin(anos) & (V.turno == 1)].copy()
        V['partido'] = V.sq.map(C.partido)
        nom = V.groupby(['cd_mun', 'partido']).votos.sum()
        leg = db.sql(f"""select v.cd_municipio_tse cd_mun, p.sg_partido partido, sum(coalesce(v.qt_votos_legenda,0)) votos
            from votacao_partido v join eleicao e using(id_eleicao) join partido p using(id_partido)
            where e.nr_ano_eleicao={ano} and v.cd_cargo in ({','.join(map(str, anos))}) and v.nr_turno=1 group by all""").df()
        P = nom.add(leg.set_index(['cd_mun', 'partido']).votos, fill_value=0) if len(leg) else nom
        P = P.astype('int64').reset_index(); P.columns = ['cd_mun', 'partido', 'votos']
        top = V.sort_values('votos', ascending=False).drop_duplicates('cd_mun').set_index('cd_mun')
        venc, prop, tot = {}, {}, {}
        for cd, g in P.groupby('cd_mun'):
            c = tse2.get(int(cd))
            if not c: continue
            g = g.sort_values('votos', ascending=False); t = int(g.votos.sum())
            if t <= 0: continue
            sg1, v1 = g.iloc[0].partido, int(g.iloc[0].votos); sg2, v2 = (g.iloc[1].partido, int(g.iloc[1].votos)) if len(g) > 1 else (None, 0)
            n, _, _ = nota(sg1, ano, BOL)
            k = top.loc[cd] if cd in top.index else None
            venc[c[1]] = [int(k.sq) if k is not None else 0, C.nome.get(k.sq, '') if k is not None else '', sg1, round(100 * v1 / t, 1),
                          round(100 * (v1 - v2) / t, 1), v1 - v2, None, sg2, None if n is None else round(n, 3), 1]
            lst = [[s, int(v)] for s, v in zip(g.partido, g.votos)]
            prop.setdefault(c[3], {})[str(c[0])] = lst[:8] + ([['outros', sum(v for _, v in lst[8:])]] if len(lst) > 8 else [])
            for s, v in lst:
                for ch in ('BR', c[3]): tot.setdefault(ch, {}); tot[ch][s] = tot[ch].get(s, 0) + v
            hist.setdefault(c[3], {}).setdefault(c[1], {}).setdefault(cg, []).append([ano, venc[c[1]][1], sg1, round(100 * v1 / t, 1), 1])
            # candidato mais votado da cidade, para o painel
            if k is not None: prop[c[3]].setdefault('_c', {})[str(c[0])] = [C.nome.get(k.sq, ''), C.partido.get(k.sq, ''), int(k.votos)]
        prop['_tot'] = {ch: sorted(([s, v] for s, v in d.items()), key=lambda x: -x[1]) for ch, d in tot.items()}
        dump(f'{D}/venc/{cg}{ano}.json', venc); dump(f'{D}/prop/{cg}{ano}.json', prop)
        print(cg, ano, len(venc), 'cidades', 'legenda' if len(leg) else 'sem legenda', round(os.path.getsize(f'{D}/prop/{cg}{ano}.json') / 1e6, 2), 'MB')
# histórico de cada cidade: acrescenta os três cargos
for f in glob.glob(f'{D}/hist/*.json'):
    uf = os.path.basename(f)[:-5]; H = json.load(open(f, encoding='utf-8'))
    for ib, cgs in hist.get(uf, {}).items():
        for cg, linhas in cgs.items(): H.setdefault(ib, {})[cg] = sorted(linhas)
    dump(f, H)
print('histórico atualizado')
