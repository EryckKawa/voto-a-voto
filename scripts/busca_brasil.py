"""Índice da busca para o Brasil inteiro: candidatos a presidente, governador e senador (todos) e prefeitos
eleitos, de 1994 a 2026. Cada linha leva ao mapa daquela eleição (no estado ou na cidade).
Saída: data/br/busca.json = [[nome, partido, cargo, ano, uf, ibge, votos, eleito], ...]
Usa só arquivos que o site já tem (resumo, venc, ufx, cidades). Roda depois de nacional_venc.py."""
import glob, json, os
D = os.path.join(os.path.dirname(__file__), '..', 'data', 'br')
ler = lambda p: json.load(open(p, encoding='utf-8'))
porTse = {r[0]: r for r in ler(os.path.join(D, 'cidades.json'))}
porIbge = {r[1]: r for r in porTse.values()}
linhas = []
for f in sorted(glob.glob(os.path.join(D, 'resumo', '*.json'))):
    k = os.path.basename(f)[:-5]; cg, ano = k[:-4], int(k[-4:])
    if cg == 'PREF': continue
    R = ler(f)
    for sq, (nome, partido, nr, sit) in R['c'].items():
        sq = int(sq)
        # votos no 1º turno; o estado do candidato é onde ele teve votos (presidente: o Brasil inteiro)
        if cg == 'PRES':
            uf, v = '', next((x[1] for x in R['BR'].get('t1', []) if x[0] == sq), 0)
        else:
            uf, v = max(((u, next((x[1] for x in t.get('t1', []) if x[0] == sq), 0)) for u, t in R['UF'].items()), key=lambda x: x[1])
        if v <= 0: continue
        linhas.append([nome, partido, cg, ano, uf, '', v, 1 if str(sit).startswith('ELEITO') else 0])
for f in sorted(glob.glob(os.path.join(D, 'venc', 'PREF*.json'))):
    ano = int(os.path.basename(f)[4:8]); W = ler(f)
    U = ler(os.path.join(D, 'ufx', f'PREF{ano}.json'))
    for ib, w in W.items():
        if not w[9] or ib not in porIbge: continue
        c = porIbge[ib]; r = U.get(c[3], {}).get('r', {}).get(str(c[0]), {})
        t = r.get('t2') or r.get('t1') or []
        v = next((x[1] for x in t if x[0] == w[0]), 0)
        linhas.append([w[1], w[2], 'PREF', ano, c[3], ib, v, 1])
json.dump(linhas, open(os.path.join(D, 'busca.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(len(linhas), 'linhas', dict(Counter(l[2] for l in linhas)), round(os.path.getsize(os.path.join(D, 'busca.json')) / 1e6, 2), 'MB')
