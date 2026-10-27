"""Notas ideológicas dos partidos (−1 esquerda … +1 direita).
Fonte: Zucco, C. & Power, T. (2024). The Ideology of Brazilian Parties and Presidents: A Research Note on
Coalitional Presidentialism Under Stress. Latin American Politics and Society 66(1). Tabela C1 do apêndice;
dados no Harvard Dataverse, doi:10.7910/DVN/6KVTUV (Brazilian Legislative Surveys, 1990–2021).
Partidos que a pesquisa não mede recebem nota ESTIMADA: a nota de Bolognesi, Ribeiro & Codato (2023, escala 0–10)
convertida por regressão linear sobre os partidos que aparecem nas duas fontes."""
import json, numpy as np
ONDAS = [1990, 1993, 1997, 2001, 2005, 2009, 2013, 2017, 2021]
# arquivo oficial do Dataverse (bls9_estimates_partiespresidents_long.csv), já conferido
import csv as _csv
_REN = {'CID': 'CIDADANIA', 'PCDOB': 'PCdoB', 'PODE': 'PODEMOS', 'PPold': 'PP_ANTIGO', 'REP': 'REPUBLICANOS', 'SD': 'SOLIDARIEDADE'}
_PRES = {'BOLSONARO', 'COLLOR', 'DILMA', 'FHC', 'ITAMAR', 'LULA', 'SARNEY', 'TEMER'}
NOTAS = {}
for _r in _csv.DictReader(open(__import__('os').path.join(__import__('os').path.dirname(__file__), 'harvard_zucco_power_2024.csv'))):
    k = _r['party.or.pres']
    if k in _PRES: continue
    NOTAS.setdefault(_REN.get(k, k), {})[int(_r['year'])] = round(float(_r['ideo']), 3)
# sigla do TSE (qualquer época) -> linha da pesquisa
ALIAS = {
 'PPS':'CIDADANIA','CIDADANIA':'CIDADANIA','PFL':'DEM','DEM':'DEM','PMDB':'MDB','MDB':'MDB','PC DO B':'PCdoB','PCDOB':'PCdoB',
 'PDT':'PDT','PL':'PL','PR':'PL','PP':'PP','PPB':'PP','PPR':'PP','PDS':'PP','PSB':'PSB','PSDB':'PSDB','PT':'PT','PTB':'PTB',
 'NOVO':'NOVO','PDC':'PDC','PODE':'PODEMOS','PTN':'PODEMOS','PROS':'PROS','PSC':'PSC','PSD':'PSD','PSL':'PSL','PSOL':'PSOL',
 'PSTU':'PSTU','PV':'PV','REDE':'REDE','PRB':'REPUBLICANOS','REPUBLICANOS':'REPUBLICANOS','SD':'SOLIDARIEDADE',
 'SOLIDARIEDADE':'SOLIDARIEDADE','PRN':'PRN',
}
FUSOES = {'UNIÃO': ['DEM', 'PSL'], 'UNIAO': ['DEM', 'PSL']}   # União Brasil (2022) = DEM + PSL
def onda_mais_proxima(ano, ondas):
    return min(ondas, key=lambda w: (abs(w - ano), w))
def nota(sigla, ano, bolognesi):
    """devolve (nota, estimada?, explicação curta)"""
    s = (sigla or '').upper().strip()
    if s in ALIAS:
        d = NOTAS[ALIAS[s]]; w = onda_mais_proxima(ano, list(d)); return d[w], abs(w - ano) > 4, f'Zucco & Power, onda {w}'
    if s in FUSOES:
        vs = [NOTAS[p][onda_mais_proxima(ano, list(NOTAS[p]))] for p in FUSOES[s]]
        return float(np.mean(vs)), True, 'média de DEM e PSL, que se fundiram'
    if s in bolognesi and bolognesi[s] is not None:
        a, b = AJUSTE; return float(np.clip(a + b * bolognesi[s], -1, 1)), True, 'estimada a partir de Bolognesi et al. (2023)'
    return None, True, 'sem nota'
def ajusta(bolognesi):
    xs, ys = [], []
    for s, k in ALIAS.items():
        if s in bolognesi and bolognesi[s] is not None and 2021 in NOTAS[k]: xs.append(bolognesi[s]); ys.append(NOTAS[k][2021])
    b, a = np.polyfit(xs, ys, 1); r = np.corrcoef(xs, ys)[0, 1]
    return (a, b), r, len(xs)
BOL = {k: v[1] for k, v in json.load(open('/tmp/claude-0/web/data/espectro.json')).items()}
AJUSTE, R, N = ajusta(BOL)
def faixa(n):   # mesmo corte de Zucco & Power: centro entre −0,25 e +0,25
    return None if n is None else ('esquerda' if n < -0.25 else 'direita' if n > 0.25 else 'centro')
if __name__ == '__main__':
    print('ajuste Bolognesi->ZP: a=%.3f b=%.3f r=%.2f n=%d' % (*AJUSTE, R, N))
    for s in ['PT','PSOL','PSB','PDT','MDB','PSDB','PSD','UNIÃO','PL','PP','REPUBLICANOS','AVANTE','PRD','AGIR','DC','MOBILIZA','PMB','PRTB','PODE','SOLIDARIEDADE','CIDADANIA','PV','REDE','NOVO','PCdoB','PC DO B','PCB','PCO','UP']:
        print(s, nota(s, 2024, BOL), nota(s, 1996, BOL)[:2])
