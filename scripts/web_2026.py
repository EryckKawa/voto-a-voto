"""Regrava os dados do site que mudam com o resultado final de 2026 (2º turno de presidente e governador, 16/11/2026).

Os scripts antigos (nacional_venc.py, historia.py, achados.py...) leem os .json intermediários numa pasta fixa de outro
ambiente (/tmp/claude-0/web/data/br). Aqui:
  1. decodifica os .js do site (data/br) numa pasta de trabalho, em .json;
  2. refaz, para 2026, o que nacional_venc.py faz (quem venceu em cada cidade, os totais e os resultados por estado), com a
     nota de cada partido que o site já usa em 2026 (a dos arquivos de 2026 publicados), e o comparecimento por cidade;
  3. roda historia.py, serie_comp.py, busca_brasil.py e achados.py apontando para a pasta de trabalho;
  4. empacota de volta em data/br só os arquivos que mudaram.
Uso: python scripts/web_2026.py [pasta com detalhe_votacao_munzona_2026.zip.001] [pasta de trabalho]"""
import os, sys, json, re, gzip, base64, glob, zipfile, io
import pandas as pd

AQUI = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.normpath(os.path.join(AQUI, '..', 'data', 'br'))
NOVOS = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads', 'BDR_Votacao', 'brasil', 'novos_2026')
ST = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.environ.get('TEMP', '/tmp'), 'vav_web_2026')
PQ = os.path.join(os.path.expanduser('~'), 'Downloads', 'BDR_Votacao', 'banco', 'tmp', 'pq')
ANO = 2026
CG = {1: 'PRES', 3: 'GOV', 5: 'SEN'}
log = lambda *a: print(*a, flush=True)


def ler_js(p):
    t = open(p, encoding='utf-8').read(); d = re.search(r'\]=(.*);\s*$', t, re.S).group(1)
    if d.startswith('V.descompactar('): d = gzip.decompress(base64.b64decode(json.loads(d[15:-1]))).decode('utf-8')
    return json.loads(d)


def gravar_js(chave, obj):
    """data/br/<chave>.js no formato de empacotar.py; .json ao lado só se o repositório já guarda um"""
    txt = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    arq = os.path.join(WEB, chave + '.js')
    os.makedirs(os.path.dirname(arq), exist_ok=True)
    novo = '(window.__D=window.__D||{})[' + json.dumps('br/' + chave) + ']=' + txt + ';\n'
    velho = open(arq, encoding='utf-8').read() if os.path.exists(arq) else None
    if os.path.exists(arq) and ler_js(arq) == obj: return False
    open(arq, 'w', encoding='utf-8').write(novo)
    if os.path.exists(os.path.join(WEB, chave + '.json')): open(os.path.join(WEB, chave + '.json'), 'w', encoding='utf-8').write(txt)
    return True


# 1. pasta de trabalho com os .json (sem as fichas, fotos e afins, que estes scripts não leem)
FORA = ('pol', 'fotos', 'form', 'vies', 'perguntas', 'busca')
n = 0
for p in glob.glob(os.path.join(WEB, '**', '*.js'), recursive=True):
    rel = os.path.relpath(p, WEB)[:-3]
    if rel.split(os.sep)[0] in FORA: continue
    alvo = os.path.join(ST, rel + '.json'); os.makedirs(os.path.dirname(alvo), exist_ok=True)
    json.dump(ler_js(p), open(alvo, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); n += 1
log(n, 'arquivos decodificados em', ST)
L = lambda chave: json.load(open(os.path.join(ST, chave + '.json'), encoding='utf-8'))
def salvar_st(chave, obj): json.dump(obj, open(os.path.join(ST, chave + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

cid = L('cidades'); tse2ibge = {c[0]: c[1] for c in cid}

# 2a. quem venceu, totais e resultados por estado (a lógica de nacional_venc.py, para 2026)
V0 = pd.read_parquet(f'{PQ}/votos_{ANO}.parquet'); C = pd.read_parquet(f'{PQ}/cand_{ANO}.parquet').set_index('sq')
C = C[~C.index.duplicated()]   # presidente aparece uma vez por estado no arquivo do TSE: nome, partido e situação são os mesmos
mudou = []
for cargo, sig in CG.items():
    k = sig + str(ANO)
    antes = L(f'venc/{k}')
    nota_de = {}
    for w in antes.values():
        if w[2] and w[8] is not None: nota_de[w[2]] = w[8]
        if w[7] and w[7] not in nota_de: pass
    ufx_antes = L(f'ufx/{k}')
    V = V0[V0.cargo == cargo]
    venc, porUF = {}, {}
    for (cd, uf), g in V.groupby(['cd_mun', 'uf']):
        tmax = g.turno.max(); gt = g[g.turno == tmax].sort_values('votos', ascending=False)
        tot = int(gt.votos.sum()); sqs = gt.sq.tolist()
        w = sqs[0]; outros = [s for s in sqs if s != w]; s2 = outros[0] if outros else None
        vw = int(gt.set_index('sq').votos[w]); v2 = int(gt.set_index('sq').votos[s2]) if s2 else 0
        nt = nota_de.get(C.partido[w])
        ib = tse2ibge.get(int(cd))
        if not ib: continue
        venc[ib] = [int(w), C.nome[w], C.partido[w], round(100 * vw / tot, 1) if tot else 0, round(100 * (vw - v2) / tot, 1) if tot else 0,
                    vw - v2, int(s2) if s2 else None, C.partido[s2] if s2 else None, nt, 1]
        r = {}
        for t, gg in g.groupby('turno'):
            gg = gg.sort_values('votos', ascending=False)
            r['t' + str(t)] = [[int(s), int(v)] for s, v in zip(gg.sq, gg.votos)]
        porUF.setdefault(uf, {})[int(cd)] = r
    sem_nota = sorted({w[2] for w in venc.values() if w[8] is None})
    if sem_nota: log('  aviso: partidos vencedores sem nota em 2026:', sem_nota)
    ufx = {}
    for uf, m in porUF.items():
        sqs = {s for r in m.values() for t in r.values() for s, _ in t}
        ufx[uf] = {'r': {str(a): b for a, b in m.items()}, 'c': {str(int(s)): [C.nome[s], C.partido[s], str(C.nr[s]), C.situacao[s]] for s in sqs}}
    res = {'c': {}, 'BR': {}, 'UF': {}}
    for t, gt in V.groupby('turno'):
        tb = gt.groupby('sq').votos.sum().sort_values(ascending=False)
        res['BR']['t' + str(t)] = [[int(a), int(b)] for a, b in tb.items()]
        for uf, gu in gt.groupby('uf'):
            tu = gu.groupby('sq').votos.sum().sort_values(ascending=False)
            res['UF'].setdefault(uf, {})['t' + str(t)] = [[int(a), int(b)] for a, b in tu.items()]
    for sq in V.sq.unique(): res['c'][str(int(sq))] = [C.nome[sq], C.partido[sq], str(C.nr[sq]), C.situacao[sq]]
    trocou = sum(1 for ib, w in venc.items() if ib in antes and antes[ib][0] != w[0])
    log(k, len(venc), 'cidades;', trocou, 'cidades mudaram de vencedor com o 2º turno;', 'eleitos:', sorted({v[0] for v in res['c'].values() if str(v[3]).startswith('ELEITO')})[:6])
    for chave, obj in ((f'venc/{k}', venc), (f'resumo/{k}', res), (f'ufx/{k}', ufx)):
        salvar_st(chave, obj)
        if gravar_js(chave, obj): mudou.append(chave)
    # historia.py e busca_brasil.py leem uf/{UF}_{k}.json: grava na pasta de trabalho
    os.makedirs(os.path.join(ST, 'uf'), exist_ok=True)
    for uf, o in ufx.items(): salvar_st(f'uf/{uf}_{k}', o)

# 2b. comparecimento por cidade, os dois turnos (a lógica de nacional_comparecimento.py: cargo presidente)
COL = ['NR_TURNO', 'CD_TIPO_ELEICAO', 'CD_MUNICIPIO', 'CD_CARGO', 'QT_APTOS', 'QT_COMPARECIMENTO', 'QT_ABSTENCOES', 'QT_VOTOS_BRANCOS', 'QT_TOTAL_VOTOS_NULOS', 'QT_TOTAL_VOTOS_VALIDOS']
with zipfile.ZipFile(os.path.join(NOVOS, f'detalhe_votacao_munzona_{ANO}.zip.001')) as z:
    nome = next(n for n in z.namelist() if re.search(rf'detalhe_votacao_munzona_{ANO}_BR\.csv$', n, re.I))
    d = pd.read_csv(io.BytesIO(z.read(nome)), sep=';', encoding='latin1', usecols=COL, dtype={'CD_MUNICIPIO': str})
d = d[(d.CD_CARGO == 1) & (d.CD_TIPO_ELEICAO == 2)]
g = d.groupby(['CD_MUNICIPIO', 'NR_TURNO'])[COL[4:]].sum().reset_index()
comp = {}
for r in g.itertuples(index=False):
    ib = tse2ibge.get(int(r.CD_MUNICIPIO))
    if ib: comp.setdefault(ib, {})['t' + str(r.NR_TURNO)] = [int(v) for v in r[2:]]
log('comp', ANO, len(comp), 'cidades; turnos', sorted({t for o in comp.values() for t in o}))
salvar_st(f'comp/{ANO}', comp)
if gravar_js(f'comp/{ANO}', comp): mudou.append(f'comp/{ANO}')

# 3. os scripts de sempre, apontados para a pasta de trabalho
def roda(script, saidas):
    fonte = open(os.path.join(AQUI, script), encoding='utf-8').read()
    fonte = fonte.replace('/tmp/claude-0/web/data/br', ST.replace('\\', '/'))
    fonte = fonte.replace("os.path.join(os.path.dirname(__file__), '..', 'data', 'br')", repr(ST))
    ns = {'__file__': os.path.join(AQUI, script), '__name__': '__main__'}
    sys_argv = sys.argv; sys.argv = [script]
    _open = open
    try: exec(compile(fonte, script, 'exec'), ns)
    finally: sys.argv = sys_argv
    for chave in saidas:
        for p in glob.glob(os.path.join(ST, chave + '.json')):
            ch = os.path.relpath(p, ST)[:-5].replace(os.sep, '/')
            if gravar_js(ch, json.load(open(p, encoding='utf-8'))): mudou.append(ch)

# histórico de cada cidade: historia.py refaria o arquivo sem as linhas de deputado e vereador (que nacional_proporcional.py
# acrescenta depois); aqui só as linhas de 2026 de presidente, governador e senador e a abstenção de 2026 são trocadas
def patch_hist():
    venc26 = {sig: L(f'venc/{sig}{ANO}') for sig in CG.values()}
    uf_de = {c[1]: c[3] for c in cid}
    for p in glob.glob(os.path.join(WEB, 'hist', '*.js')):
        u = os.path.basename(p)[:-3]; H = ler_js(p)
        for ib, h in H.items():
            for sig, W in venc26.items():
                if ib not in W: continue
                w = W[ib]; lin = [ANO, w[1], w[2], w[3]] + ([] if w[9] else [0])
                h[sig] = sorted([x for x in h.get(sig, []) if x[0] != ANO] + [lin])
            o = comp.get(ib, {}).get('t1')
            if o and o[0]: h['abst'] = sorted([x for x in h.get('abst', []) if x[0] != ANO] + [[ANO, round(100 * o[2] / o[0], 1)]])
        if gravar_js(f'hist/{u}', H): mudou.append(f'hist/{u}')
patch_hist()
roda('serie_comp.py', ['serie_comp'])
roda('busca_brasil.py', ['busca'])
roda('achados.py', ['achados'])
log('arquivos do site que mudaram:', len(mudou), mudou)
