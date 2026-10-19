"""Vencedores e resultados por cidade para uma eleição nacional (a partir dos parquet do processa_munzona)."""
import sys, json, csv, pandas as pd, numpy as np
sys.path.insert(0, '/tmp/claude-0/web/scripts'); from ideologia import nota, faixa, BOL
D = '/tmp/claude-0/web/data/br'; PQ = '/tmp/claude-0/br/pq'
CG = {1: 'PRES', 3: 'GOV', 5: 'SEN', 11: 'PREF'}
def dump(p, o): json.dump(o, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
# cidades
x = list(csv.DictReader(open('/tmp/claude-0/br/ref/tse_ibge.csv')))
I = '/mnt/user-data/uploads/BDR_Votacao/dados/ibge/'
pop = {r['D1C']: int(r['V']) for r in json.load(open(I + 'pop_censo2022.json'))[1:] if r['V'].isdigit()}
pib = {r['D1C']: int(r['V']) * 1000 for r in json.load(open(I + 'pib_2021.json'))[1:] if r['V'].isdigit()}
nomes = {str(m['id']): m['nome'] for m in json.load(open(I + 'municipios.json'))}
cid = [[int(r['codigo_tse']), r['codigo_ibge'], nomes.get(r['codigo_ibge'], r['nome_municipio'].title()), r['uf'], int(r['capital']),
        pop.get(r['codigo_ibge']), pib.get(r['codigo_ibge'])] for r in x]
dump(f'{D}/cidades.json', cid)
tse2ibge = {c[0]: c[1] for c in cid}
def gera(ano, cargo):
    V = pd.read_parquet(f'{PQ}/votos_{ano}.parquet'); C = pd.read_parquet(f'{PQ}/cand_{ano}.parquet').set_index('sq')
    V = V[V.cargo == cargo]; k = CG[cargo] + str(ano)
    venc = {}; porUF = {}
    for (cd, uf), g in V.groupby(['cd_mun', 'uf']):
        tmax = g.turno.max(); gt = g[g.turno == tmax].sort_values('votos', ascending=False)
        tot = int(gt.votos.sum()); sqs = gt.sq.tolist()
        # para prefeito, quem venceu é quem o TSE marca como ELEITO; para os demais cargos, o mais votado na cidade
        if cargo == 11:
            el = [s for s in sqs if str(C.situacao.get(s, '')).startswith('ELEITO')]
            w = el[0] if el else sqs[0]; definido = bool(el)
        else: w = sqs[0]; definido = True
        outros = [s for s in sqs if s != w]; s2 = outros[0] if outros else None
        vw = int(gt.set_index('sq').votos[w]); v2 = int(gt.set_index('sq').votos[s2]) if s2 else 0
        n, est, _ = nota(C.partido[w], ano, BOL)
        ib = tse2ibge.get(int(cd))
        if not ib: continue
        venc[ib] = [int(w), C.nome[w], C.partido[w], round(100 * vw / tot, 1) if tot else 0, round(100 * (vw - v2) / tot, 1) if tot else 0,
                    vw - v2, int(s2) if s2 else None, C.partido[s2] if s2 else None, None if n is None else round(n, 3), 1 if definido else 0]
        # resultado completo da cidade (todos os turnos)
        r = {}
        for t, gg in g.groupby('turno'):
            gg = gg.sort_values('votos', ascending=False)
            r['t' + str(t)] = [[int(s), int(v)] for s, v in zip(gg.sq, gg.votos)]
        porUF.setdefault(uf, {})[int(cd)] = r
    dump(f'{D}/venc/{k}.json', venc)
    for uf, m in porUF.items():
        sqs = {s for r in m.values() for t in r.values() for s, _ in t}
        cands = {int(s): [C.nome[s], C.partido[s], str(C.nr[s]), C.situacao[s]] for s in sqs}
        dump(f'{D}/uf/{uf}_{k}.json', {'r': m, 'c': cands})
    # totais de votos por candidato (Brasil e cada estado), por turno, para os textos e o placar
    res = {'c': {}, 'BR': {}, 'UF': {}}
    for t, gt in V.groupby('turno'):
        tb = gt.groupby('sq').votos.sum().sort_values(ascending=False)
        res['BR']['t' + str(t)] = [[int(a), int(b)] for a, b in tb.items()]
        for uf, gu in gt.groupby('uf'):
            tu = gu.groupby('sq').votos.sum().sort_values(ascending=False)
            res['UF'].setdefault(uf, {})['t' + str(t)] = [[int(a), int(b)] for a, b in tu.items()]
    if cargo != 11:
        for sq in V.sq.unique(): res['c'][int(sq)] = [C.nome[sq], C.partido[sq], str(C.nr[sq]), C.situacao[sq]]
    else: res = {'c': {}, 'BR': {}, 'UF': {}}  # prefeito: os totais por estado não fazem sentido somados
    import os; os.makedirs(f'{D}/resumo', exist_ok=True); dump(f'{D}/resumo/{k}.json', res)
    # resumo para o título
    fx = pd.Series([faixa(v[8]) for v in venc.values() if v[9]]).value_counts().to_dict()
    popf = {}
    for ib, v in venc.items():
        if not v[9]: continue
        popf[faixa(v[8])] = popf.get(faixa(v[8]), 0) + (pop.get(ib) or 0)
    print(k, len(venc), 'cidades', fx, {a: round(100 * b / sum(popf.values()), 1) for a, b in popf.items()})
    part = pd.Series([v[2] for v in venc.values() if v[9]]).value_counts().head(12).to_dict(); print(part)
if __name__ == '__main__':
    gera(int(sys.argv[1]), int(sys.argv[2]))
