"""Histórico de cada cidade em todas as eleições do mapa, um arquivo por estado (data/br/hist/{UF}.json):
{ibge: {"PREF": [[ano, nome, partido, pct], ...], "PRES": [...], "GOV": [...], "SEN": [...], "abst": [[ano, pct], ...]}}
Lê data/br/venc/*.json, data/br/comp/*.json e data/br/cidades.json."""
import json, glob, os, re
D = '/tmp/claude-0/web/data/br'
uf = {c[1]: c[3] for c in json.load(open(f'{D}/cidades.json'))}
H = {}
for f in sorted(glob.glob(f'{D}/venc/*.json')):
    cg, ano = re.search(r'([A-Z]+)(\d{4})\.json$', f).groups()
    for ib, w in json.load(open(f)).items():
        H.setdefault(ib, {}).setdefault(cg, []).append([int(ano), w[1], w[2], w[3]] + ([] if w[9] else [0]))
for f in sorted(glob.glob(f'{D}/comp/*.json')):
    ano = int(re.search(r'(\d{4})\.json$', f).group(1))
    for ib, o in json.load(open(f)).items():
        if o.get('t1') and o['t1'][0]:
            H.setdefault(ib, {}).setdefault('abst', []).append([ano, round(100 * o['t1'][2] / o['t1'][0], 1)])
os.makedirs(f'{D}/hist', exist_ok=True)
por = {}
for ib, h in H.items():
    if ib in uf:
        for v in h.values(): v.sort()
        por.setdefault(uf[ib], {})[ib] = h
for u, m in por.items():
    json.dump(m, open(f'{D}/hist/{u}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(por), 'estados,', sum(len(m) for m in por.values()), 'cidades')
