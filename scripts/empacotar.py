"""Converte data/**/*.json em data/**/*.js (window.__D[chave] = ...) para o site abrir direto do disco (file://)."""
import os, sys, json
base = os.path.join(os.path.dirname(__file__), '..', 'data')
for root, _, files in os.walk(base):
    for f in files:
        if not f.endswith('.json'): continue
        p = os.path.join(root, f); key = os.path.relpath(p, base)[:-5].replace(os.sep, '/')
        with open(p, encoding='utf-8') as fh: txt = fh.read()
        with open(p[:-5] + '.js', 'w', encoding='utf-8') as fh:
            fh.write('(window.__D=window.__D||{})[' + json.dumps(key) + ']=' + txt + ';\n')
print('ok')
