"""Junta os resultados por estado (data/br/uf/{UF}_{ELEICAO}.json) num arquivo por eleição: data/br/ufx/{ELEICAO}.json = {UF: {...}}.
Menos arquivos para copiar e um só arquivo para abrir por eleição."""
import json, glob, os, re
D = '/tmp/claude-0/web/data/br'
os.makedirs(f'{D}/ufx', exist_ok=True)
por = {}
for f in glob.glob(f'{D}/uf/*.json'):
    uf, el = re.search(r'([A-Z]{2})_([A-Z]+\d{4})\.json$', f).groups()
    por.setdefault(el, {})[uf] = json.load(open(f))
for el, m in por.items():
    json.dump(m, open(f'{D}/ufx/{el}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(por), 'eleições')
