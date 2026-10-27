"""Ficha de cada político (Q10: o histórico eleitoral de cada um), para todos os candidatos de 1994 a 2026.

Uso: python ficha_politico.py [eleicoes_brasil.duckdb]
Lê o banco nacional (banco_brasil.py) e grava, em data/br/pol/ (só .js, já no formato que o site carrega):
  f/{id_pessoa % 2048}  ficha: dados da pessoa e cada candidatura (cargo, lugar, partido e nota do partido naquela eleição,
                        votos, resultado, dinheiro da campanha, patrimônio e onde gastou)
  pal/{id_pessoa % 512} as palavras mais usadas no plano de governo de cada candidatura que entregou plano com texto
  cam/{id_pessoa % 64}  deputados federais de 2019 a 2026: como votou em cada votação de mérito do Plenário
  cam/votacoes          as votações de mérito (data, proposição, ementa, resultado, orientação do governo)
  idx/{prefixo}         índice da busca por nome civil e nome na urna, cortado por prefixo até cada pedaço ficar pequeno
  idx/manifesto         a lista dos prefixos
O título de eleitor, que liga a mesma pessoa entre eleições, não sai do banco."""
import sys, os, json, re, unicodedata, shutil, gzip, base64
import duckdb, numpy as np, pandas as pd
from itertools import groupby

AQUI = os.path.dirname(os.path.abspath(__file__))
BANCO = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('BANCO', '/tmp/claude-0/br/db/eleicoes_brasil.duckdb')
D = os.path.join(AQUI, '..', 'data', 'br')
OUT = os.path.join(D, 'pol')
con = duckdb.connect(BANCO, read_only=True)
con.execute("SET memory_limit = '16GB'; SET threads = 8")
log = lambda *a: print(*a, flush=True)
# chave da busca: sem acento, só letras e um espaço entre as palavras (igual a chaveBusca, em js/politico.js)
norm = lambda t: re.sub(r' +', ' ', re.sub(r'[^A-Z ]', '', unicodedata.normalize('NFD', str(t or '').upper()).encode('ascii', 'ignore').decode())).strip()
num = lambda v: None if v is None or (isinstance(v, float) and np.isnan(v)) else int(round(float(v)))


def grava(chave, obj):
    """data/br/<chave>.js no formato de empacotar.py: (window.__D=window.__D||{})["br/<chave>"]=...;"""
    arq = os.path.join(D, chave + '.js')
    os.makedirs(os.path.dirname(arq), exist_ok=True)
    dados = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    if len(dados) >= 1024:
        compacto = base64.b64encode(gzip.compress(dados.encode('utf-8'), compresslevel=6, mtime=0)).decode('ascii')
        dados = 'V.descompactar(' + json.dumps(compacto) + ')'
    with open(arq, 'w', encoding='utf-8') as f:
        f.write('(window.__D=window.__D||{})[' + json.dumps('br/' + chave) + ']=' + dados + ';\n')


for pasta in ('f', 'idx', 'pal', 'cam'):
    shutil.rmtree(os.path.join(OUT, pasta), ignore_errors=True)
SIT = lambda s, e: 'E' if e else '2' if s and '2º TURNO' in s.upper() else 'S' if s and 'SUPLENTE' in s.upper() else 'N' if s and ('NÃO ELEITO' in s.upper() or 'NAO ELEITO' in s.upper()) else '-'

# ------------------------------------------------------------------ candidaturas
log('lendo candidaturas...')
ANOS_CONTAS = {r[0] for r in con.execute("SELECT DISTINCT nr_ano_eleicao FROM receita").fetchall()}
ANOS_BENS = {r[0] for r in con.execute("SELECT DISTINCT nr_ano_eleicao FROM bem_candidato").fetchall()}
C = con.execute("""
WITH vt AS (SELECT id_candidatura, SUM(qt_votos_nominais) FILTER (WHERE nr_turno = 1) v1, SUM(qt_votos_nominais) FILTER (WHERE nr_turno = 2) v2
            FROM votacao_candidato GROUP BY 1),
     rc AS (SELECT id_candidatura, SUM(vr_receita) r, SUM(CASE WHEN fl_recurso_publico THEN vr_receita ELSE 0 END) rp FROM receita GROUP BY 1),
     dp AS (SELECT id_candidatura, SUM(vr_despesa) d FROM despesa GROUP BY 1),
     bm AS (SELECT id_candidatura, SUM(vr_bem) b FROM bem_candidato GROUP BY 1)
SELECT c.id_pessoa, c.id_candidatura, e.nr_ano_eleicao ano, c.cd_cargo, c.sg_ue, c.cd_municipio_tse, p.sg_partido, ROUND(pa.vr_nota, 2) nota,
       c.nr_candidato, c.nm_urna, vt.v1, vt.v2, st.ds_sit_tot_turno, COALESCE(st.fl_eleito, false) eleito, rc.r, rc.rp, dp.d, bm.b,
       c.id_candidatura IN (SELECT id_candidatura FROM proposta_palavra) tem_plano, c.cd_grau_instrucao, c.nr_idade_posse, c.sq_candidato
FROM candidatura c JOIN eleicao e USING (id_eleicao) JOIN partido p USING (id_partido)
LEFT JOIN vw_partido_ano pa ON pa.id_partido = c.id_partido AND pa.nr_ano_eleicao = e.nr_ano_eleicao
LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
LEFT JOIN vt ON vt.id_candidatura = c.id_candidatura LEFT JOIN rc ON rc.id_candidatura = c.id_candidatura
LEFT JOIN dp ON dp.id_candidatura = c.id_candidatura LEFT JOIN bm ON bm.id_candidatura = c.id_candidatura
ORDER BY c.id_pessoa, e.nr_ano_eleicao, c.cd_cargo""").df()
C = C.astype(object).where(C.notna(), None)   # o DuckDB devolve pd.NA nos vazios; aqui viram None
log(len(C), 'candidaturas')

log('onde cada candidato gastou...')
DESP = {}
for idc, tipo, pc in con.execute("""
    WITH d AS (SELECT id_candidatura, nr_tipo, SUM(vr_despesa) v FROM vw_despesa_tipo GROUP BY 1, 2 HAVING SUM(vr_despesa) > 0)
    SELECT id_candidatura, nr_tipo, ROUND(100 * v / SUM(v) OVER (PARTITION BY id_candidatura)) FROM d
    QUALIFY ROW_NUMBER() OVER (PARTITION BY id_candidatura ORDER BY v DESC) <= 4""").fetchall():
    DESP.setdefault(idc, []).append([int(tipo), int(pc)])

P = con.execute("""SELECT id_pessoa, nm_pessoa, YEAR(dt_nascimento), ds_genero, ds_cor_raca, nr_titulo_eleitoral LIKE 'SQ%' FROM pessoa""").fetchall()
PES = {r[0]: r for r in P}

# ------------------------------------------------------------------ ficha e índice da busca
log('montando as fichas...')
fichas, busca = {}, []
for idp, g in groupby(C.itertuples(index=False), key=lambda r: r.id_pessoa):
    pe = PES[idp]
    cands, urnas = [], []
    for r in g:
        if r.nm_urna and r.nm_urna not in urnas: urnas.append(r.nm_urna)
        alc = int(r.cd_municipio_tse) if r.cd_municipio_tse is not None else r.sg_ue
        contas = r.ano in ANOS_CONTAS
        cands.append([int(r.ano), int(r.cd_cargo), alc, r.sg_partido, None if r.nota is None else float(r.nota), num(r.nr_candidato),
                      urnas.index(r.nm_urna) if r.nm_urna else -1, num(r.v1), num(r.v2), SIT(r.ds_sit_tot_turno, r.eleito),
                      num(r.r or 0) if contas else None, num(r.rp or 0) if contas else None, num(r.d or 0) if contas else None,
                      num(r.b or 0) if r.ano in ANOS_BENS else None, int(r.id_candidatura) if r.tem_plano else 0, DESP.get(r.id_candidatura, []),
                      num(r.cd_grau_instrucao), num(r.nr_idade_posse),
                      # sequencial do TSE só onde o site tem foto (img/fotos/<ano>/<sq>.jpg): presidente, governador e senador desde 2010, prefeito em 2024
                      num(r.sq_candidato) if (r.ano >= 2010 and r.cd_cargo in (1, 3, 5)) or (r.ano == 2024 and r.cd_cargo == 11) else None])
    fichas.setdefault(idp % 2048, {})[idp] = [pe[1], pe[2], pe[3], pe[4], 1 if pe[5] else 0, urnas, cands]
    ult = cands[-1]
    vit = sum(1 for c in cands if c[9] == 'E')
    votos = max((c[7] or 0) for c in cands)
    # entrada da busca: [id, nome civil, nome na urna (se diferente), último ano, último cargo, lugar, vitórias, maior votação];
    # a chave é o nome civil, o nome na urna e, para quem já venceu ou teve muitos votos, também o último sobrenome
    urna = urnas[-1] if urnas and norm(urnas[-1]) != norm(pe[1]) else ''
    e = [idp, pe[1], urna, ult[0], ult[1], ult[2], vit, votos]
    chaves = {norm(pe[1])} | ({norm(urna)} if urna else set())
    sob = norm(pe[1]).split(' ')[-1]
    if (vit or votos >= 10000) and len(sob) >= 4: chaves.add(sob)
    busca += [(k, e) for k in chaves if k]
for k, v in fichas.items(): grava(f'pol/f/{k}', v)
QT_PESSOAS = sum(map(len, fichas.values()))
log(QT_PESSOAS, 'pessoas,', len(fichas), 'arquivos de ficha')

# índice: cada pedaço guarda os nomes que começam por um prefixo; o prefixo cresce até o pedaço ter no máximo LIM nomes
LIM = 2500
# AUX, NUL, PRN... são dispositivos no Windows: um arquivo com esse nome não abre nem entra no git
RESERVADO = re.compile(r'^(CON|PRN|AUX|NUL|COM\d|LPT\d)$')
pedaco = lambda nome: 'pol/idx/' + nome + ('~' if RESERVADO.match(nome) else '')
busca.sort(key=lambda x: (x[0], -x[1][7]))
manifesto = []
linha = lambda n, e: [n if n != norm(e[1]) else 0] + e   # 0: a chave é o nome civil
def corta(itens, pre):
    if len(itens) <= LIM or len(pre) >= 12:
        if itens:
            manifesto.append(pre); grava(pedaco(pre.replace(' ', '_') or '_'), [linha(n, e) for n, e in itens])
        return
    grupos = {}
    for n, e in itens: grupos.setdefault(n[len(pre)] if len(n) > len(pre) else '', []).append((n, e))
    if '' in grupos:   # nomes que acabam exatamente no prefixo ficam num pedaço próprio
        manifesto.append(pre + '$'); grava(pedaco((pre.replace(' ', '_') or '_') + '$'), [linha(n, e) for n, e in grupos.pop('')])
    for ch, its in grupos.items(): corta(its, pre + ch)
porLetra = {}
for n, e in busca:
    if len(n) >= 2: porLetra.setdefault(n[:2], []).append((n, e))
for pre, its in porLetra.items(): corta(its, pre)
grava('pol/idx/manifesto', sorted(manifesto))
log(len(busca), 'nomes na busca,', len(manifesto), 'pedaços')

# ------------------------------------------------------------------ palavras dos planos de governo
log('palavras dos planos...')
pal = {}
for idp, idc, ws in con.execute("""
    SELECT c.id_pessoa, w.id_candidatura, list([w.ds_palavra, w.qt::VARCHAR] ORDER BY w.qt DESC)[1:40]
    FROM proposta_palavra w JOIN candidatura c USING (id_candidatura) GROUP BY 1, 2""").fetchall():
    pal.setdefault(idp % 512, {})[idc] = [[w, int(q)] for w, q in ws]
for k, v in pal.items(): grava(f'pol/pal/{k}', v)
log(sum(len(v) for v in pal.values()), 'planos com palavras')

# ------------------------------------------------------------------ Câmara: como cada deputado votou
if con.execute("SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'voto_deputado'").fetchone()[0]:
    log('votos na Câmara...')
    VOT = con.execute("""
        SELECT v.id_votacao, v.dt_votacao, v.sg_proposicao, left(coalesce(v.ds_ementa, ''), 220), left(coalesce(v.ds_votacao, ''), 200), v.fl_aprovacao,
               (SELECT ANY_VALUE(o.ds_orientacao) FROM orientacao_bancada o WHERE o.id_votacao = v.id_votacao AND o.sg_bancada IN ('Governo', 'GOV.')) gov
        FROM votacao_camara v WHERE v.fl_merito AND v.sg_orgao = 'PLEN' ORDER BY v.dt_votacao, v.id_votacao""").fetchall()
    ix = {r[0]: i for i, r in enumerate(VOT)}
    sem_documentos = lambda t: re.sub(r'\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}\b|\b(?:CPF|CNPJ)\s*(?:n[ºo°.]?\s*)?[:.]?\s*\d{11,14}\b', '[documento omitido]', t or '', flags=re.I)
    grava('pol/cam/votacoes', [[r[0], str(r[1]), sem_documentos(r[2]), sem_documentos(r[3]), sem_documentos(r[4]), 1 if r[5] else 0, {'Sim': 'S', 'Não': 'N', 'Obstrução': 'O', 'Liberado': 'L'}.get(r[6], '')] for r in VOT])
    COD = {'Sim': 'S', 'Não': 'N', 'Obstrução': 'O', 'Abstenção': 'A', 'Artigo 17': 'P'}
    V = con.execute("""
        SELECT d.id_pessoa, vd.id_deputado, vd.id_votacao, vd.ds_voto, vd.sg_partido, vd.sg_uf,
               (SELECT ANY_VALUE(o.ds_orientacao) FROM orientacao_bancada o WHERE o.id_votacao = vd.id_votacao
                 AND upper(strip_accents(o.sg_bancada)) = upper(strip_accents(vd.sg_partido))) op
        FROM voto_deputado vd JOIN deputado_camara d USING (id_deputado) JOIN votacao_camara v USING (id_votacao)
        WHERE v.fl_merito AND v.sg_orgao = 'PLEN' AND d.id_pessoa IS NOT NULL""").df()
    # posição de cada deputado pelo próprio voto: 1ª dimensão da matriz deputado x votação (Sim +1, Não e obstrução −1),
    # em cada governo, na escala da nota dos partidos (−1 esquerda, +1 direita); a nota final é a média dos dois governos,
    # como na régua pelo voto, para que seguir o governo da vez não conte como lado
    notas_p = json.load(open(os.path.join(D, 'ideologia_consenso.json'), encoding='utf-8'))['anos']
    V['val'] = V.ds_voto.map({'Sim': 1.0, 'Não': -1.0, 'Obstrução': -1.0})
    V['per'] = np.where(V.id_votacao.map(lambda x: str(VOT[ix[x]][1]) < '2023-01-01' if x in ix else False), 'bol', 'lula')
    pos = {}
    SIGLA = {'PCdoB': 'PC do B', 'PRB': 'REPUBLICANOS', 'PR': 'PL', 'PPS': 'CIDADANIA', 'PATRI': 'PATRIOTA'}   # sigla da Câmara -> sigla do TSE
    def nota_partido(sg, anos):
        for a in anos:
            n = notas_p.get(a, {}).get(SIGLA.get(sg, sg))
            if n and n[0] is not None: return n[0]
    for per, anos_nota in (('bol', ('2018', '2022')), ('lula', ('2026', '2022'))):
        M = V[V.per == per].dropna(subset=['val']).pivot_table(index='id_pessoa', columns='id_votacao', values='val', aggfunc='first')
        M = M.loc[M.notna().sum(axis=1) >= 100]
        X = M.values - np.nanmean(M.values, axis=0)
        X = np.where(np.isnan(X), 0, X)
        u, s, vt = np.linalg.svd(X, full_matrices=False)
        x = (X @ vt[0]) / np.maximum(1, M.notna().sum(axis=1).values)   # média, por voto dado, da projeção no 1º eixo (falta não puxa para o meio)
        partido = V[V.per == per].groupby('id_pessoa').sg_partido.agg(lambda s: s.mode().iat[0]).reindex(M.index)
        alvo = partido.map(lambda sg: nota_partido(sg, anos_nota))
        ok = alvo.notna().values
        a, b = np.polyfit(x[ok], alvo.values[ok].astype(float), 1)   # reta que leva a 1ª dimensão para a escala dos partidos
        for idp, xi in zip(M.index, np.clip(a * x + b, -1, 1)): pos.setdefault(idp, {})[per] = round(float(xi), 2)
        log('posição pelo voto,', per, len(M), 'deputados, correlação com o partido', round(float(np.corrcoef(x[ok], alvo.values[ok].astype(float))[0, 1]), 2))
    gov = {r[0]: r[6] for r in VOT}
    cam = {}
    for idp, g in V.groupby('id_pessoa'):
        votos = [[ix[r.id_votacao], COD.get(r.ds_voto, '?')] for r in g.itertuples() if r.id_votacao in ix]
        dec = g[g.ds_voto.isin(['Sim', 'Não', 'Obstrução'])]
        sim = lambda a, b: (a == 'Sim') == (b == 'Sim')
        segP = [sim(r.ds_voto, r.op) for r in dec.itertuples() if r.op in ('Sim', 'Não', 'Obstrução')]
        segG = [sim(r.ds_voto, gov[r.id_votacao]) for r in dec.itertuples() if gov.get(r.id_votacao) in ('Sim', 'Não', 'Obstrução')]
        p = pos.get(idp, {})
        cam.setdefault(idp % 64, {})[idp] = {
            'ids': sorted(g.id_deputado.unique().tolist()), 'partidos': g.sg_partido.value_counts().index.tolist(),
            'n': len(votos), 'segue_partido': round(100 * np.mean(segP), 1) if len(segP) >= 20 else None,
            'segue_governo': round(100 * np.mean(segG), 1) if len(segG) >= 20 else None,
            'pos': p, 'nota': round((p['bol'] + p['lula']) / 2, 2) if len(p) == 2 else None, 'v': votos}
    for k, v in cam.items(): grava(f'pol/cam/{k}', v)
    log(sum(len(v) for v in cam.values()), 'deputados com votos na ficha,', len(VOT), 'votações de mérito')

grava('pol/info', {'gerado': pd.Timestamp.now().strftime('%Y-%m-%d'), 'pessoas': QT_PESSOAS, 'candidaturas': int(len(C)),
                   'anos_contas': sorted(ANOS_CONTAS), 'anos_bens': sorted(ANOS_BENS)})
log('ok')
