"""Monta data/br/ideologia.json: para cada ano com eleição no mapa, a nota de Harvard de cada partido que aparece
(vencedores e candidatos). Lê data/br/venc/*.json e data/br/resumo/*.json."""
import json, glob, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ideologia import nota, BOL, AJUSTE, R, N, NOTAS
D = '/tmp/claude-0/web/data/br'
old = json.load(open(f'{D}/ideologia.json'))
siglas = {}
for f in glob.glob(f'{D}/venc/*.json'):
    ano = re.search(r'(\d{4})', f).group(1)
    for w in json.load(open(f)).values():
        siglas.setdefault(ano, set()).update([w[2], w[7]])
for f in glob.glob(f'{D}/resumo/*.json'):
    ano = re.search(r'(\d{4})', f).group(1)
    for k in json.load(open(f)).get('c', {}).values():
        siglas.setdefault(ano, set()).add(k[1])
anos = {}
for ano, ss in sorted(siglas.items()):
    anos[ano] = {s: [None if n is None else round(n, 3), bool(e), fonte] for s in sorted(x for x in ss if x) for n, e, fonte in [nota(s, int(ano), BOL)]}
old['anos'] = anos
old['ajuste'] = {'a': AJUSTE[0], 'b': AJUSTE[1], 'r': R, 'n': N}
json.dump(old, open(f'{D}/ideologia.json', 'w'), ensure_ascii=False, separators=(',', ':'))
for a, m in anos.items():
    sem = [s for s, v in m.items() if v[0] is None]
    print(a, len(m), 'partidos; sem nota:', sem)
