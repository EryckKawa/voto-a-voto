"""Roda todas as eleições antigas: munzona -> parquet -> vencedores por cidade (venc/uf/resumo) e comparecimento.
Uso: python historico.py PASTA_ZIPS ANO [ANO ...]"""
import sys, os, re, zipfile, subprocess, json, csv
import pandas as pd
P, anos = sys.argv[1], [int(a) for a in sys.argv[2:]]
S = os.path.dirname(os.path.abspath(__file__))
x = {r['codigo_tse']: r['codigo_ibge'] for r in csv.DictReader(open('/tmp/claude-0/br/ref/tse_ibge.csv'))}
COL = ['NR_TURNO', 'CD_TIPO_ELEICAO', 'CD_MUNICIPIO', 'CD_CARGO', 'QT_APTOS', 'QT_COMPARECIMENTO', 'QT_ABSTENCOES', 'QT_VOTOS_BRANCOS', 'QT_TOTAL_VOTOS_NULOS', 'QT_TOTAL_VOTOS_VALIDOS']
EXTRA = ['QT_VOTOS_NULOS', 'QT_VOTOS_NOMINAIS_VALIDOS', 'QT_VOTOS_LEG_VALIDOS']
def arruma(d):
    # arquivos antigos: total de nulos e de válidos zerados; os números estão nas colunas de detalhe
    for c in EXTRA:
        if c not in d: d[c] = 0
    d['QT_TOTAL_VOTOS_NULOS'] = d[['QT_TOTAL_VOTOS_NULOS', 'QT_VOTOS_NULOS']].max(axis=1)
    d['QT_TOTAL_VOTOS_VALIDOS'] = d['QT_TOTAL_VOTOS_VALIDOS'].where(d['QT_TOTAL_VOTOS_VALIDOS'] > 0, d['QT_VOTOS_NOMINAIS_VALIDOS'] + d['QT_VOTOS_LEG_VALIDOS'])
    return d[COL]
SO_COMP = os.environ.get('SO_COMP') == '1'
for ano in anos:
    geral = ano % 4 == 2
    z = f'{P}/votacao_candidato_munzona_{ano}.zip.001'
    if not SO_COMP:
        if not os.path.exists(f'/tmp/claude-0/br/pq/votos_{ano}.parquet'):
            subprocess.run([sys.executable, f'{S}/processa_munzona.py', str(ano), z], check=True)
        for cg in ([1, 3, 5] if geral else [11]):
            subprocess.run([sys.executable, f'{S}/nacional_venc.py', str(ano), str(cg)], check=True)
    # comparecimento: presidente (geral) ou prefeito (municipal), 1º e 2º turno
    zd = zipfile.ZipFile(f'{P}/detalhe_votacao_munzona_{ano}.zip.001')
    nomes = [n for n in zd.namelist() if n.lower().endswith('.csv') and not re.search(r'_(BRASIL|BR)\.csv$', n, re.I)]
    partes = []
    for n in nomes:
        d = pd.read_csv(zd.open(n), sep=';', encoding='latin1', usecols=lambda c: c in COL or c in EXTRA, dtype={'CD_MUNICIPIO': str})
        partes.append(arruma(d)[(d.CD_CARGO == (1 if geral else 11)) & (d.CD_TIPO_ELEICAO == 2)])
    if geral:   # presidente pode estar só no arquivo _BR
        br = [n for n in zd.namelist() if re.search(r'_BR\.csv$', n)]
        if br and not sum(len(p) for p in partes):
            d = pd.read_csv(zd.open(br[0]), sep=';', encoding='latin1', usecols=lambda c: c in COL or c in EXTRA, dtype={'CD_MUNICIPIO': str}); partes = [arruma(d)[(d.CD_CARGO == 1) & (d.CD_TIPO_ELEICAO == 2)]]
    d = pd.concat(partes)
    g = d.groupby(['CD_MUNICIPIO', 'NR_TURNO'])[COL[4:]].sum().reset_index()
    out = {}
    for r in g.itertuples(index=False):
        ib = x.get(str(int(r.CD_MUNICIPIO)))
        if ib: out.setdefault(ib, {})['t' + str(r.NR_TURNO)] = [int(v) for v in r[2:]]
    json.dump(out, open(f'/tmp/claude-0/web/data/br/comp/{ano}.json', 'w'), separators=(',', ':'))
    t = g[g.NR_TURNO == 1][COL[4:]].sum()
    print('COMP', ano, len(out), 'cidades | aptos', int(t.QT_APTOS), 'abst %.1f%%' % (100 * t.QT_ABSTENCOES / t.QT_APTOS), 'branco+nulo %.1f%%' % (100 * (t.QT_VOTOS_BRANCOS + t.QT_TOTAL_VOTOS_NULOS) / t.QT_COMPARECIMENTO), flush=True)
