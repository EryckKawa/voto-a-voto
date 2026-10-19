"""O candidato Ninguém: quem não foi votar + brancos + nulos, no 1º turno, comparado ao mais votado de cada cidade.
Saída data/br/ninguem/{CARGO}{ANO}.json: {ibge: [aptos, abstencoes, brancos, nulos, votos_do_1o, nome_do_1o, partido_do_1o]}"""
import json, glob
W = '/tmp/claude-0/web/data/br'
cids = json.load(open(f'{W}/cidades.json')); ib2tse = {c[1]: str(c[0]) for c in cids}
for cg, ano in [('PREF', 2024), ('PRES', 2022), ('PRES', 2018)]:
    comp = json.load(open(f'{W}/comp/{ano}.json')); U = {}; C = {}
    for f in glob.glob(f'{W}/uf/*_{cg}{ano}.json'):
        d = json.load(open(f)); U.update({str(k): v for k, v in d['r'].items()}); C.update(d['c'])
    out = {}
    for ib, o in comp.items():
        t = o.get('t1'); r = U.get(ib2tse.get(ib))
        if not t or not r or 't1' not in r: continue
        sq, v = r['t1'][0]; k = C[str(sq)]
        out[ib] = [t[0], t[2], t[3], t[4], v, k[0], k[1], int(sq)]
    json.dump(out, open(f'{W}/ninguem/{cg}{ano}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    n = sum(1 for x in out.values() if x[1] + x[2] + x[3] > x[4]); tot = sum(x[1] + x[2] + x[3] for x in out.values())
    print(cg, ano, len(out), 'cidades; Ninguém vence em', n, '; Ninguém no país %.1f mi' % (tot / 1e6))

# resumo nacional: o Ninguém por partes e os votos de cada partido no 1º turno (para comparar)
res = {}
for cg, ano in [('PREF', 2024), ('PRES', 2022), ('PRES', 2018)]:
    comp = json.load(open(f'{W}/comp/{ano}.json'))
    s = [0] * 6
    for o in comp.values():
        if o.get('t1'): s = [a + b for a, b in zip(s, o['t1'])]
    part = {}
    for f in glob.glob(f'{W}/uf/*_{cg}{ano}.json'):
        d = json.load(open(f))
        for r in d['r'].values():
            for sq, v in r.get('t1', []):
                p = d['c'][str(sq)][1]; part[p] = part.get(p, 0) + v
    res[f'{cg}{ano}'] = {'aptos': s[0], 'comparecimento': s[1], 'abst': s[2], 'brancos': s[3], 'nulos': s[4], 'validos': s[5],
                         'partidos': sorted([[p, v] for p, v in part.items()], key=lambda x: -x[1])}
json.dump(res, open(f'{W}/ninguem/resumo.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for k, v in res.items(): print(k, 'Ninguém', v['abst'] + v['brancos'] + v['nulos'], 'partidos top3', v['partidos'][:3])
