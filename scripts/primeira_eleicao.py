"""Acrescenta a cada cidade de data/br/cidades.json o ano da primeira eleição em que ela aparece (coluna 8).

O mapa usa o desenho atual das 5.570 cidades. Uma cidade criada depois de 1994 não tem resultado próprio nos
anos anteriores à sua primeira eleição: os eleitores dela ainda votavam na cidade de origem. Com o ano da
primeira eleição, o mapa separa "ainda não era município" de "o TSE não traz o resultado".

Roda depois de nacional_venc.py (que regrava cidades.json) e antes de empacotar.py.
"""
import glob, json, os
D = os.path.join(os.path.dirname(__file__), '..', 'data', 'br')
prim = {}
def marca(ib, ano):
    if ano < prim.get(ib, 9999): prim[ib] = ano
for f in glob.glob(os.path.join(D, 'venc', '*.json')):
    ano = int(os.path.basename(f)[-9:-5])
    for ib in json.load(open(f, encoding='utf-8')): marca(ib, ano)
for f in glob.glob(os.path.join(D, 'comp', '*.json')):
    ano = int(os.path.basename(f)[:4])
    for ib, o in json.load(open(f, encoding='utf-8')).items():
        if o.get('t1'): marca(ib, ano)
p = os.path.join(D, 'cidades.json')
cid = json.load(open(p, encoding='utf-8'))
for r in cid:
    r[7:] = [prim.get(r[1])]
json.dump(cid, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
depois = sum(1 for r in cid if r[7] and r[7] > 1994)
print(len(cid), 'cidades;', depois, 'com a primeira eleição depois de 1994;', sum(1 for r in cid if not r[7]), 'sem nenhuma eleição')
