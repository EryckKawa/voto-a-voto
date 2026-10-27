"""Corrida do patrimônio: os maiores bens declarados ao TSE em cada eleição geral (2006 a 2026),
dos eleitos para presidente, governador, senador e deputado federal. Lê as fichas já prontas (data/br/pol/f/*.js,
feitas por ficha_politico.py) e grava data/br/patrimonio.js.

Uso:  python scripts/corrida_patrimonio.py
Os valores são os declarados, em reais da época, sem correção pela inflação. O TSE publica o que o
candidato digitou, com erros de digitação de até bilhões entre os não eleitos (em 2018, três candidatos a deputado
federal declararam cerca de R$ 1 bilhão cada); por isso a corrida fica só com os eleitos, cujas declarações são as
mais conferidas. Valores acima de LIMITE ainda ficam de fora e são listados no fim."""
import base64, glob, gzip, json, os, re

D = os.path.join(os.path.dirname(__file__), '..', 'data', 'br')
ANOS = [2006, 2010, 2014, 2018, 2022, 2026]
CARGOS = {1: 'Presidente', 3: 'Governador', 5: 'Senador', 6: 'Deputado federal'}
TOPO = 15
# acima disso é quase sempre erro de digitação (centavos lançados como reais etc.); conferido caso a caso no relatório
LIMITE = 5e9


def le(arq):
    s = open(arq, encoding='utf-8').read()
    m = re.search(r'V\.descompactar\("([^"]+)"\)', s)
    if m:
        return json.loads(gzip.decompress(base64.b64decode(m.group(1))).decode('utf-8'))
    return json.loads(s[s.index(']=') + 2:].rstrip().rstrip(';'))


por_ano = {a: [] for a in ANOS}
fora = []
for arq in glob.glob(os.path.join(D, 'pol', 'f', '*.js')):
    for idp, p in le(arq).items():
        nome, urnas, cands = p[0], p[5], p[6]
        for c in cands:
            ano, cg, lugar, sg, patr = c[0], c[1], c[2], c[3], c[13]
            if ano not in por_ano or cg not in CARGOS or not patr or c[9] != 'E':
                continue
            urna = urnas[c[6]] if c[6] is not None and 0 <= c[6] < len(urnas) and not str(urnas[c[6]]).startswith('#') else ''
            item = [int(idp), urna or nome, sg, cg, lugar if isinstance(lugar, str) else '', round(patr), c[9]]
            (fora if patr > LIMITE else por_ano[ano]).append(item)

saida = {str(a): sorted(xs, key=lambda x: -x[5])[:TOPO] for a, xs in por_ano.items()}
with open(os.path.join(D, 'patrimonio.js'), 'w', encoding='utf-8') as f:
    f.write('(window.__D=window.__D||{})["br/patrimonio"]=' + json.dumps({'cargos': CARGOS, 'anos': saida, 'limite': LIMITE}, ensure_ascii=False, separators=(',', ':')) + ';\n')

for a in ANOS:
    print(a, [(x[1], x[2], CARGOS[x[3]], x[4], f'{x[5]/1e6:,.1f} mi') for x in saida[str(a)][:6]])
print('fora do limite:', [(x[1], x[3], x[5]) for x in sorted(fora, key=lambda x: -x[5])[:10]])
