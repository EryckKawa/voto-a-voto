"""Nota ideológica dos partidos por eleição: três estudos acadêmicos independentes e o voto na Câmara.

Fontes (arquivos nesta pasta):
  ZP  Zucco, C.; Power, T. (2024). The Ideology of Brazilian Parties and Presidents. Latin American Politics and Society 66(1).
      Pesquisa com deputados federais (Brazilian Legislative Surveys), 9 ondas de 1990 a 2021, escala −1 a +1.
      harvard_zucco_power_2024.csv (Harvard Dataverse, doi:10.7910/DVN/6KVTUV).
  BRC Bolognesi, B.; Ribeiro, E.; Codato, A. (2023). Uma nova classificação ideológica dos partidos políticos brasileiros.
      Dados 66(2). Survey com 519 cientistas políticos da ABCP em julho de 2018, escala 0 a 10. bolognesi_2023.csv (Tabela 1).
  VP  Lindberg, S. et al. (2022). Varieties of Party Identity and Organization (V-Party) Dataset V2. V-Dem.
      doi:10.23696/vpartydsv2. Especialistas por país, uma nota por partido em cada eleição (modelo bayesiano de
      resposta ao item), partidos com mais de 5% dos votos. Variável v2pariglef: esquerda-direita ECONÔMICA.
      vparty_brasil.csv (extraído do pacote vdemdata, github.com/vdeminstitute/vdemdata).
  CAM Voto na Câmara dos Deputados, 2019 a 2026: orientação de cada bancada em 1.854 votações de mérito no Plenário
      (dados abertos da Câmara), escalonamento em cada governo e média dos governos Bolsonaro e Lula, para tirar o efeito
      de quem só acompanha o governo (Zucco, 2009). Calculado por regua_voto.py; data/br/ideologia_voto.json. Só entram
      partidos que votaram nos dois governos. É a única medida que já pega o PL depois de Bolsonaro e o União Brasil.

Método
  1. Escala comum: a de Zucco e Power (−1 a +1). BRC e VP são convertidas por regressão linear (mínimos quadrados) contra a
     nota de ZP do mesmo partido na onda mais próxima no tempo (BRC 2018 ↔ ZP 2017; VP de cada eleição ↔ onda de ZP a até
     2 anos). A correlação de cada ajuste mede a concordância entre os estudos (validade convergente).
  2. Para cada eleição (1994 a 2026), cada estudo entra com a medida mais próxima no tempo, a até 4 anos; depois da última
     medida do estudo, a última vale por até 8 anos (marcada como "medida antiga"). Se nenhum estudo mediu o partido nessa
     janela (partidos pequenos antes de 2014), vale a medida mais próxima a até 12 anos, marcada como "distante".
  3. Cada medida pesa pela distância no tempo: peso = 1 / (1 + anos de distância / 2). Com três medidas ou mais, a nota é a
     mediana ponderada (um ponto fora da curva não puxa a nota); com uma ou duas, a média ponderada. Toda nota fica entre
     −1 e +1. Também se guarda a menor e a maior.
  4. Classificação em 5 faixas (as do site): esquerda < −0,5 ≤ centro-esquerda < −0,25 ≤ centro ≤ +0,25 < centro-direita
     ≤ +0,5 < direita. A classificação é "incerta" quando menos de 2/3 do peso das medidas fica do mesmo
     lado da nota (esquerda × centro × direita, com corte em ±0,25).
  6. Testado e deixado de fora: o que os partidos "pregam", medido pelo texto dos planos de governo (Wordscores, Laver,
     Benoit e Garry, 2003, em wordscores_planos.py). Não passou na validação deixa-um-fora (correlação negativa com as notas
     dos especialistas); a análise de correspondência dos textos só separa a esquerda revolucionária do resto.
  5. Partidos que se fundiram (União Brasil, PRD) recebem a média dos partidos de origem, marcada como derivada.

Saídas: data/br/partidos_notas.json (site) e partido_nota.csv (banco).
"""
import csv, json, os, math
import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
ANOS = list(range(1994, 2027, 2))

# ---------- linhagem: sigla do TSE (e ano) -> identificador do partido ao longo do tempo ----------
def linhagem(sigla, ano):
    s = (sigla or '').upper().strip()
    if s == 'PP' and ano <= 1994: return 'PP_ANTIGO'
    if s == 'PSD' and ano < 2011: return None          # PSD antigo (1987-2003) não é o PSD de Kassab
    if s == 'PSL' and ano < 2018: return None          # PSL nanico antes de Bolsonaro
    if s == 'PL' and ano < 2006: return 'PL'
    return {'PPS': 'CIDADANIA', 'CIDADANIA': 'CIDADANIA', 'PFL': 'DEM', 'DEM': 'DEM', 'PMDB': 'MDB', 'MDB': 'MDB',
            'PC DO B': 'PCDOB', 'PCDOB': 'PCDOB', 'PR': 'PL', 'PL': 'PL', 'PPB': 'PP', 'PPR': 'PP', 'PDS': 'PP', 'PP': 'PP',
            'PODE': 'PODE', 'PODEMOS': 'PODE', 'PTN': 'PODE', 'PRB': 'REP', 'REPUBLICANOS': 'REP', 'SD': 'SD',
            'SOLIDARIEDADE': 'SD', 'PT DO B': 'AVANTE', 'AVANTE': 'AVANTE', 'PMN': 'PMN', 'MOBILIZA': 'PMN', 'PTC': 'PTC',
            'AGIR': 'PTC', 'PSDC': 'DC', 'DC': 'DC', 'PEN': 'PATRIOTA', 'PATRI': 'PATRIOTA', 'PATRIOTA': 'PATRIOTA',
            'UNIÃO': 'UNIAO', 'UNIAO': 'UNIAO', 'PRD': 'PRD'}.get(s, s)

NOME = {'CIDADANIA': 'Cidadania (ex-PPS)', 'DEM': 'DEM (ex-PFL)', 'MDB': 'MDB (ex-PMDB)', 'PCDOB': 'PCdoB', 'PL': 'PL (PR de 2006 a 2019)',
        'PP': 'PP (ex-PPB)', 'PODE': 'Podemos (ex-PTN)', 'REP': 'Republicanos (ex-PRB)', 'SD': 'Solidariedade', 'AVANTE': 'Avante (ex-PTdoB)',
        'PMN': 'Mobiliza (ex-PMN)', 'PTC': 'Agir (ex-PTC)', 'DC': 'DC (ex-PSDC)', 'PATRIOTA': 'Patriota', 'UNIAO': 'União Brasil',
        'PRD': 'PRD', 'PP_ANTIGO': 'PP (1993-1995)'}
FUSOES = {'UNIAO': (2022, ['DEM', 'PSL']), 'PRD': (2024, ['PTB', 'PATRIOTA'])}

# ---------- leitura das três fontes: {fonte: {linhagem: {ano_medida: (nota_original, erro)}}} ----------
def le_zp():
    ren = {'CID': 'CIDADANIA', 'PCDOB': 'PCDOB', 'PODE': 'PODE', 'PPold': 'PP_ANTIGO', 'REP': 'REP', 'SD': 'SD'}
    pres = {'BOLSONARO', 'COLLOR', 'DILMA', 'FHC', 'ITAMAR', 'LULA', 'SARNEY', 'TEMER'}
    d = {}
    for r in csv.DictReader(open(os.path.join(AQUI, 'harvard_zucco_power_2024.csv'))):
        k = r['party.or.pres']
        if k in pres: continue
        d.setdefault(ren.get(k, k), {})[int(r['year'])] = (float(r['ideo']), float(r['ideo.se']))
    return d

def le_brc():
    d = {}
    for r in csv.DictReader(open(os.path.join(AQUI, 'bolognesi_2023.csv'))):
        d.setdefault(linhagem(r['sigla'], 2018), {})[2018] = (float(r['media']), float(r['dp']))
    return d

def le_vp():
    nomes = {'PT': 'PT', 'PSB': 'PSB', 'PDT': 'PDT', 'PMDB': 'MDB', 'PSD': 'PSD', 'PSDB': 'PSDB', 'PR / PL': 'PL', 'PL': 'PL', 'PRB': 'REP',
             'PFL': 'DEM', 'PPB': 'PP', 'PPR': 'PP', 'PDS': 'PP', 'PSL': 'PSL', 'PTB': 'PTB', 'PPS': 'CIDADANIA', 'PDC': 'PDC', 'PRN': 'PRN'}
    d = {}
    for r in csv.DictReader(open(os.path.join(AQUI, 'vparty_brasil.csv'))):
        if not r['v2pariglef']: continue
        k = nomes.get(r['v2pashname'])
        if not k: print('V-Party sem linhagem:', r['v2pashname']); continue
        y = int(r['year'])
        if k == 'PSD' and y < 2011: continue
        lo, hi = float(r['v2pariglef_codelow']), float(r['v2pariglef_codehigh'])
        d.setdefault(k, {})[y] = (float(r['v2pariglef']), (hi - lo) / 2)
    return d

FONTES = {
    'ZP': {'nome': 'Zucco e Power (2024)', 'curto': 'Deputados', 'quem': 'deputados federais avaliam os partidos (9 pesquisas, 1990 a 2021)',
           'ref': 'ZUCCO, Cesar; POWER, Timothy J. The ideology of Brazilian parties and presidents: a research note on coalitional presidentialism under stress. Latin American Politics and Society, v. 66, n. 1, p. 178-188, 2024. Dados: Harvard Dataverse, doi:10.7910/DVN/6KVTUV.'},
    'BRC': {'nome': 'Bolognesi, Ribeiro e Codato (2023)', 'curto': 'Cientistas políticos', 'quem': '519 cientistas políticos da ABCP avaliam 35 partidos (julho de 2018)',
            'ref': 'BOLOGNESI, Bruno; RIBEIRO, Ednaldo; CODATO, Adriano. Uma nova classificação ideológica dos partidos políticos brasileiros. Dados, Rio de Janeiro, v. 66, n. 2, e20210164, 2023. doi:10.1590/dados.2023.66.2.303.'},
    'VP': {'nome': 'V-Party, V-Dem (2022)', 'curto': 'V-Party', 'quem': 'especialistas internacionais avaliam os maiores partidos em cada eleição (1990 a 2018), só na economia',
           'ref': 'LINDBERG, Staffan I. et al. Varieties of Party Identity and Organization (V-Party) Dataset V2. Gotemburgo: Varieties of Democracy (V-Dem) Project, 2022. doi:10.23696/vpartydsv2.'},
    'CAM': {'nome': 'Voto na Câmara (2019–2026)', 'curto': 'Voto na Câmara', 'quem': 'a orientação de cada bancada em 1.854 votações do Plenário, nos governos Bolsonaro e Lula',
            'ref': 'CÂMARA DOS DEPUTADOS. Dados Abertos: votações e orientações de bancada no Plenário, 2019-2026. Brasília, 2026. Disponível em: https://dadosabertos.camara.leg.br. Método: ZUCCO, Cesar. Ideology or what? Legislative behavior in multiparty presidential settings. The Journal of Politics, v. 71, n. 3, p. 1076-1092, 2009.'},
}
ANO_CAM = 2023   # meio do período 2019-2026

def le_cam():
    v = json.load(open(os.path.join(AQUI, '..', 'data', 'br', 'ideologia_voto.json'), encoding='utf-8'))['partidos']
    d = {}
    for sg, r in v.items():
        if r.get('bol') is None or r.get('lula') is None: continue        # votou só num governo: o efeito-governo não sai
        k = linhagem(sg, ANO_CAM)
        if k: d[k] = {ANO_CAM: (r['nota'], abs(r['bol'] - r['lula']) / 2)}
    return d

def peso(dist):
    return 1 / (1 + dist / 2)

def mediana_ponderada(vs, ws):
    o = sorted(zip(vs, ws)); tot = sum(ws); acc = 0
    for i, (v, w) in enumerate(o):
        acc += w
        if abs(acc - tot / 2) < 1e-9 and i + 1 < len(o): return (v + o[i + 1][0]) / 2   # metade exata: média dos dois do meio
        if acc > tot / 2: return v
    return o[-1][0]

def ajuste(orig, alvo, pares_anos):
    """regressão alvo ~ a + b·orig sobre (linhagem, ano_orig -> ano_alvo)."""
    xs, ys, rot = [], [], []
    for k, med in orig.items():
        if k not in alvo: continue
        for y, (v, _) in med.items():
            w = pares_anos(y, list(alvo[k]))
            if w is None: continue
            xs.append(v); ys.append(alvo[k][w][0]); rot.append((k, y, w))
    b, a = np.polyfit(xs, ys, 1)
    r = float(np.corrcoef(xs, ys)[0, 1])
    # concordância de ordem (Spearman), menos sensível a valores extremos
    rx, ry = np.argsort(np.argsort(xs)), np.argsort(np.argsort(ys))
    rho = float(np.corrcoef(rx, ry)[0, 1])
    return {'a': float(a), 'b': float(b), 'r': r, 'rho': rho, 'n': len(xs), 'pontos': [[k, y, w, round(x, 3), round(yv, 3)] for (k, y, w), x, yv in zip(rot, xs, ys)]}

def mais_proxima(y, ws, maxd):
    ws = [w for w in ws if abs(w - y) <= maxd]
    return min(ws, key=lambda w: (abs(w - y), -w)) if ws else None

def faixa5(n):
    return None if n is None else 'esquerda' if n < -0.5 else 'centro-esquerda' if n < -0.25 else 'centro' if n <= 0.25 else 'centro-direita' if n <= 0.5 else 'direita'
def lado(n):
    return 'esquerda' if n < -0.25 else 'direita' if n > 0.25 else 'centro'

def main():
    zp, brc, vp = le_zp(), le_brc(), le_vp()
    aj = {'BRC': ajuste(brc, zp, lambda y, ws: mais_proxima(2017, ws, 0) if y == 2018 else None),
          'VP': ajuste(vp, zp, lambda y, ws: mais_proxima(y, ws, 2))}
    # escala comum
    lim = lambda v: max(-1.0, min(1.0, v))     # toda nota fica na escala de −1 a +1
    conv = {'ZP': {k: {y: (lim(v), e) for y, (v, e) in m.items()} for k, m in zp.items()}}
    for f, src in (('BRC', brc), ('VP', vp)):
        a, b = aj[f]['a'], aj[f]['b']
        conv[f] = {k: {y: (lim(a + b * v), abs(b) * e) for y, (v, e) in m.items()} for k, m in src.items()}
    conv['CAM'] = {k: {y: (lim(v), e) for y, (v, e) in m.items()} for k, m in le_cam().items()}

    def medida(f, k, ano, longe=False):
        m = conv[f].get(k)
        if not m: return None
        ws = list(m); w = mais_proxima(ano, ws, 12 if longe else 4)
        antiga = longe
        if w is None and not longe and ano > max(ws) and ano - max(ws) <= 8: w, antiga = max(ws), True
        if w is None: return None
        v, e = m[w]
        return {'v': round(v, 3), 'e': round(e, 3), 'ano': w, 'antiga': antiga or abs(w - ano) > 4}

    linhas = set(k for f in conv for k in conv[f]) | set(FUSOES)
    out, csvl = {}, []
    for k in sorted(linhas):
        serie = {}
        for ano in ANOS:
            fs = {}
            if k in FUSOES and ano >= FUSOES[k][0]:
                for f in conv:
                    direta = medida(f, k, ano)
                    if direta: fs[f] = direta; continue          # o partido novo já foi medido diretamente (ex.: União no voto)
                    ms = [medida(f, p, ano) for p in FUSOES[k][1]]
                    if all(ms): fs[f] = {'v': round(sum(m['v'] for m in ms) / len(ms), 3), 'e': round(max(m['e'] for m in ms), 3), 'ano': max(m['ano'] for m in ms), 'antiga': True, 'fusao': '+'.join(FUSOES[k][1])}
            elif k in FUSOES:
                continue
            else:
                for f in conv:
                    m = medida(f, k, ano)
                    if m: fs[f] = m
            distante = False
            if not fs and k not in FUSOES:
                # nenhum estudo mediu o partido perto desta eleição: usa a medida mais próxima até 12 anos, marcada
                for f in conv:
                    m = medida(f, k, ano, longe=True)
                    if m: fs[f] = m
                distante = bool(fs)
            if not fs: continue
            vs = [m['v'] for m in fs.values()]
            ws = [peso(abs(ano - m['ano'])) for m in fs.values()]
            for m, w in zip(fs.values(), ws): m['p'] = round(w, 3)
            c = mediana_ponderada(vs, ws) if len(vs) >= 3 else sum(v * w for v, w in zip(vs, ws)) / sum(ws)
            mesmo = sum(w for v, w in zip(vs, ws) if lado(v) == lado(c)) / sum(ws)
            inc = mesmo < 2 / 3
            serie[ano] = {'c': round(c, 3), 'min': round(min(vs), 3), 'max': round(max(vs), 3), 'faixa': faixa5(c), 'incerta': inc, 'distante': distante, 'f': fs}
            for f, m in fs.items():
                csvl.append([k, ano, f, m['v'], m['e'], m['ano'], int(m['antiga'])])
            csvl.append([k, ano, 'CONSENSO', round(c, 3), round((max(vs) - min(vs)) / 2, 3), ano, int(inc)])
        if serie: out[k] = {'nome': NOME.get(k, k), 'serie': serie}

    # concordância par a par na mesma eleição (notas já na escala comum)
    def par(f1, f2, maxd=2):
        """compara medidas originais (já na escala comum) do mesmo partido feitas com até 2 anos de diferença; cada par conta uma vez."""
        vistos, xs, ys, quem = set(), [], [], []
        for k in set(conv[f1]) & set(conv[f2]):
            for y1, (v1, _) in conv[f1][k].items():
                y2 = mais_proxima(y1, list(conv[f2][k]), maxd)
                if y2 is None or (k, y1, y2) in vistos: continue
                vistos.add((k, y1, y2)); xs.append(v1); ys.append(conv[f2][k][y2][0]); quem.append(f"{k} {y1}/{y2}")
        if len(xs) < 3: return None
        same = sum(lado(x) == lado(y) for x, y in zip(xs, ys))
        dif = [q for q, x, y in zip(quem, xs, ys) if lado(x) != lado(y)]
        return {'r': round(float(np.corrcoef(xs, ys)[0, 1]), 3), 'n': len(xs), 'mesmo_lado': same, 'lados_diferentes': dif,
                'pontos': [[q, round(x, 3), round(y, 3)] for q, x, y in zip(quem, xs, ys)]}
    pares = {f'{a}-{b}': par(a, b, 5 if 'CAM' in (a, b) else 2) for a, b in (('ZP', 'BRC'), ('ZP', 'VP'), ('BRC', 'VP'), ('ZP', 'CAM'), ('BRC', 'CAM'), ('VP', 'CAM'))}

    res = {'fontes': {f: {**FONTES[f], **({'ajuste': {kk: (round(v, 4) if isinstance(v, float) else v) for kk, v in aj[f].items()}} if f in aj else {})} for f in FONTES},
           'pares': pares, 'anos': ANOS, 'partidos': out}
    json.dump(res, open(os.path.join(AQUI, '..', 'data', 'br', 'partidos_notas.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(AQUI, 'partido_nota.csv'), 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh); w.writerow(['cd_linhagem', 'nr_ano_eleicao', 'cd_fonte', 'vr_nota', 'vr_erro', 'nr_ano_medida', 'fl_aviso']); w.writerows(csvl)
    # régua do mapa: para cada eleição com mapa, a nota de consenso de cada sigla do TSE que aparece nela
    ideo = json.load(open(os.path.join(AQUI, '..', 'data', 'br', 'ideologia.json'), encoding='utf-8'))
    CURTO = {f: FONTES[f]['nome'] for f in FONTES}
    mapa, presentes = {}, {}
    for ano_s, siglas in ideo['anos'].items():
        ano = int(ano_s); m = {}
        for sg in siglas:
            k = linhagem(sg, ano); s = out.get(k, {}).get('serie', {}).get(ano) if k else None
            presentes.setdefault(ano_s, {}).setdefault(k or '?' + sg, []).append(sg)
            if not s: m[sg] = [None, True, 'nenhuma medida para este partido']; continue
            fs = s['f']; nomes = ', '.join(CURTO[f] for f in fs)
            txt = (f'{len(fs)} medidas' if len(fs) > 1 else '1 medida') + f' ({nomes})'
            if any('fusao' in v for v in fs.values()): txt += '; partido novo: média dos partidos que se fundiram'
            if s['distante']: txt += '; medida feita longe desta eleição'
            if s['incerta']: txt += '; as medidas discordam do lado'
            m[sg] = [s['c'], bool(s['incerta'] or s['distante']), txt]
        mapa[ano_s] = m
    res['presentes'] = presentes
    try: res['planos'] = json.load(open(os.path.join(AQUI, 'planos_wordscores_validacao.json'), encoding='utf-8'))
    except FileNotFoundError: pass
    json.dump(res, open(os.path.join(AQUI, '..', 'data', 'br', 'partidos_notas.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'fonte': 'Zucco e Power (2024), Bolognesi, Ribeiro e Codato (2023), V-Party (2022) e voto na Câmara (2019-2026), ponderados pela data', 'anos': mapa},
              open(os.path.join(AQUI, '..', 'data', 'br', 'ideologia_consenso.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    # relatório
    for f in aj: print(f, 'ajuste a=%.3f b=%.3f r=%.2f rho=%.2f n=%d' % (aj[f]['a'], aj[f]['b'], aj[f]['r'], aj[f]['rho'], aj[f]['n']))
    print('pares', pares)
    for ano in (1994, 2002, 2014, 2022, 2026):
        lin = sorted(((d['serie'][ano]['c'], k, d['serie'][ano]['incerta'], len(d['serie'][ano]['f'])) for k, d in out.items() if ano in d['serie']))
        print(ano, ' '.join(f"{k}:{c:+.2f}{'?' if inc else ''}({n})" for c, k, inc, n in lin))

if __name__ == '__main__':
    main()
