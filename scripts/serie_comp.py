"""Série nacional do 1º turno (presidente nos anos de eleição geral, prefeito nos municipais), de data/br/comp/*.json.
Saída data/br/serie_comp.json: [[ano, cargo, aptos, comparecimento, abstencoes, brancos, nulos, validos], ...]"""
import json, glob, re
D = '/tmp/claude-0/web/data/br'
out = []
for f in sorted(glob.glob(f'{D}/comp/*.json')):
    ano = int(re.search(r'(\d{4})\.json$', f).group(1))
    t = [0] * 6
    for o in json.load(open(f)).values():
        if o.get('t1'):
            for i, v in enumerate(o['t1']): t[i] += v
    out.append([ano, 'PRES' if ano % 4 == 2 else 'PREF'] + t)
    print(ano, 'abst %.1f%%' % (100 * t[2] / t[0]), 'branco %.1f%% nulo %.1f%%' % (100 * t[3] / t[1], 100 * t[4] / t[1]))
json.dump(out, open(f'{D}/serie_comp.json', 'w'), separators=(',', ':'))
