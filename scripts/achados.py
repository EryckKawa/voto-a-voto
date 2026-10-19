"""Calcula os achados da página "O que o voto revela" e grava data/br/achados.json (a página só lê este arquivo pequeno).
Fontes: data/br/venc, ufx, comp, cidades, ideologia_voto, ideologia (todas geradas a partir dos arquivos do TSE e do IBGE)."""
import json, collections, unicodedata, re
D = '/tmp/claude-0/web/data/br'
L = lambda p: json.load(open(f'{D}/{p}.json'))
cid = {c[1]: c for c in L('cidades')}                    # [tse, ibge, nome, uf, capital, pop, pib]
tse2ib = {str(c[0]): c[1] for c in cid.values()}
REG = {'1': 'Norte', '2': 'Nordeste', '3': 'Sudeste', '4': 'Sul', '5': 'Centro-Oeste'}
OUT = {}

# quintos de riqueza: PIB por habitante (IBGE 2021 / Censo 2022), 5 grupos com o mesmo número de cidades
com = sorted([c for c in cid.values() if c[5] and c[6]], key=lambda c: c[6] / c[5])
quinto = {c[1]: min(4, i * 5 // len(com)) for i, c in enumerate(com)}
lim = [round(com[min(len(com) - 1, (i + 1) * len(com) // 5 - 1)][6] / com[min(len(com) - 1, (i + 1) * len(com) // 5 - 1)][5] / 1000) for i in range(5)]
OUT['quintos'] = {'limites_mil_reais': lim, 'cidades': len(com)}

# 1. PT por riqueza da cidade, em todas as eleições para presidente (turno final; 1994 e 1998 só tiveram um)
ser = []
for a in range(1994, 2027, 4):
    U = L(f'ufx/PRES{a}')
    turno = 't2' if any('t2' in r for D_ in U.values() for r in D_['r'].values()) else 't1'
    s = [[0, 0] for _ in range(5)]
    for uf, Du in U.items():
        for cd, r in Du['r'].items():
            ib = tse2ib.get(cd)
            if ib not in quinto or turno not in r: continue
            tot = sum(v for _, v in r[turno]); pt = sum(v for sq, v in r[turno] if Du['c'][str(sq)][1] == 'PT')
            s[quinto[ib]][0] += pt; s[quinto[ib]][1] += tot
    ser.append({'ano': a, 'turno': turno, 'pt': [round(100 * x / y, 1) for x, y in s]})
OUT['pt_renda'] = ser

# 2. onde o PT ficou em 1º para presidente, por região (turno final)
reg = []
for a in range(1994, 2027, 4):
    w = L(f'venc/PRES{a}'); c = collections.defaultdict(lambda: [0, 0])
    for ib, x in w.items():
        r = REG[ib[0]]; c[r][1] += 1; c[r][0] += x[2] == 'PT'
    reg.append({'ano': a, **{r: [c[r][0], c[r][1]] for r in REG.values()}})
OUT['pt_regiao'] = reg

# 3. voto dividido: lado do 1º colocado para presidente x para senador, na mesma cidade (régua pelo voto)
IV, IH = L('ideologia_voto')['anos'], L('ideologia')['anos']
fx = lambda n: None if n is None else 'esquerda' if n < -0.25 else 'direita' if n > 0.25 else 'centro'
div = []
for a in (2018, 2022, 2026):
    P, S = L(f'venc/PRES{a}'), L(f'venc/SEN{a}')
    nt = lambda sg: ((IV.get(str(a)) or {}).get(sg) or IH[str(a)].get(sg) or [None])[0]
    c = collections.Counter()
    for ib, x in P.items():
        if ib in S: c[fx(nt(x[2])) + '|' + fx(nt(S[ib][2]))] += 1
    div.append({'ano': a, 'n': sum(c.values()), 'pares': dict(c)})
OUT['voto_dividido'] = div

# 4. prefeitos reeleitos (mesmo nome na urna, mesma cidade) que trocaram de partido; fusões não contam como troca
FUS = {'PFL': 'DEM', 'DEM': 'UNIÃO', 'PSL': 'UNIÃO', 'PMDB': 'MDB', 'PPB': 'PP', 'PR': 'PL', 'PRB': 'REPUBLICANOS', 'PPS': 'CIDADANIA', 'PTN': 'PODE',
       'PT do B': 'AVANTE', 'PSDC': 'DC', 'PEN': 'PATRI', 'SD': 'SOLIDARIEDADE', 'PTB': 'PRD', 'PATRI': 'PRD', 'PATRIOTA': 'PRD', 'PROS': 'SOLIDARIEDADE',
       'PSC': 'PODE', 'PHS': 'PODE', 'PRP': 'PATRI', 'PPL': 'PC do B', 'PMN': 'MOBILIZA'}
def raiz(p):
    for _ in range(5): p = FUS.get(p, p)
    return p
nome = lambda s: re.sub(r'[^a-z ]', '', unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()).strip()
anos = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024]
pref = []
for a, b in zip(anos, anos[1:]):
    A, B = L(f'venc/PREF{a}'), L(f'venc/PREF{b}'); n = mesmo = re_ = troca = 0
    for ib, x in B.items():
        if ib in A and A[ib][9] and x[9]:
            n += 1; mesmo += raiz(A[ib][2]) == raiz(x[2])
            if nome(A[ib][1]) == nome(x[1]):
                re_ += 1; troca += raiz(A[ib][2]) != raiz(x[2])
    pref.append({'ano': b, 'cidades': n, 'mesmo_partido': mesmo, 'reeleitos': re_, 'trocaram': troca})
OUT['prefeitos'] = pref

# 5. falta por tamanho da cidade (2024) e por riqueza (2022), e série nacional de falta e branco/nulo
c24, c22 = L('comp/2024'), L('comp/2022')
fxs = [[0, 5e3, 'até 5 mil'], [5e3, 2e4, '5 a 20 mil'], [2e4, 1e5, '20 a 100 mil'], [1e5, 5e5, '100 a 500 mil'], [5e5, 1e12, 'mais de 500 mil']]
tam = []
for a_, b_, rot in fxs:
    ab = ap = n = 0
    for o in c24.values():
        if o.get('t1') and a_ <= o['t1'][0] < b_: ab += o['t1'][2]; ap += o['t1'][0]; n += 1
    tam.append({'rot': rot, 'cidades': n, 'falta': round(100 * ab / ap, 1)})
OUT['falta_tamanho'] = tam
fr = [[0, 0] for _ in range(5)]
for ib, o in c22.items():
    if ib in quinto and o.get('t1'): fr[quinto[ib]][0] += o['t1'][2]; fr[quinto[ib]][1] += o['t1'][0]
OUT['falta_renda'] = [round(100 * a / b, 1) for a, b in fr]
OUT['serie'] = L('serie_comp')
# 6. cidades de um lado só: no 2º turno para presidente, parte das cidades em que o vencedor local passou de 70%
lado = []
for a in range(2002, 2023, 4):
    w = L(f'venc/PRES{a}'); r = L(f'resumo/PRES{a}')['BR']['t2']
    tot = sum(v for _, v in r); marg = 100 * (r[0][1] - r[1][1]) / tot
    lado.append({'ano': a, 'cidades': len(w), 'acima70': sum(x[3] >= 70 for x in w.values()), 'margem_brasil': round(marg, 1)})
OUT['um_lado'] = lado
json.dump(OUT, open(f'{D}/achados.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(OUT['um_lado']); print(json.dumps({k: OUT[k] for k in ('pt_renda', 'prefeitos', 'falta_tamanho', 'falta_renda')}, ensure_ascii=False)[:1800])
print(OUT['quintos'], [(r['ano'], r['Nordeste'], r['Sul']) for r in reg])
print([(d['ano'], d['pares'].get('esquerda|direita'), d['n']) for d in div])
