"""Comparecimento, abstenção, brancos e nulos por cidade (detalhe_votacao_munzona do TSE).
Eleição geral: cargo presidente (arquivo _BR). Municipal: cargo prefeito (arquivo _BRASIL).
Saída data/br/comp/{ano}.json: {ibge: {t1: [aptos, comparecimento, abstencoes, brancos, nulos, validos], t2: [...]}}"""
import sys, csv, json, pandas as pd
D = '/mnt/user-data/uploads/BDR_Votacao/dados'
x = {r['codigo_tse']: r['codigo_ibge'] for r in csv.DictReader(open('/tmp/claude-0/br/ref/tse_ibge.csv'))}
COL = ['NR_TURNO', 'CD_TIPO_ELEICAO', 'CD_MUNICIPIO', 'CD_CARGO', 'QT_APTOS', 'QT_COMPARECIMENTO', 'QT_ABSTENCOES', 'QT_VOTOS_BRANCOS', 'QT_TOTAL_VOTOS_NULOS', 'QT_TOTAL_VOTOS_VALIDOS']
for ano in map(int, sys.argv[1:]):
    geral = ano % 4 == 2
    f = f'{D}/detalhe_votacao_{ano}/detalhe_votacao_munzona_{ano}_{"BR" if geral else "BRASIL"}.csv'
    d = pd.read_csv(f, sep=';', encoding='latin1', usecols=COL, dtype={'CD_MUNICIPIO': str})
    d = d[(d.CD_CARGO == (1 if geral else 11)) & (d.CD_TIPO_ELEICAO == 2)]
    g = d.groupby(['CD_MUNICIPIO', 'NR_TURNO'])[COL[4:]].sum().reset_index()
    out = {}
    for r in g.itertuples(index=False):
        ib = x.get(str(int(r.CD_MUNICIPIO)))
        if not ib: continue
        out.setdefault(ib, {})['t' + str(r.NR_TURNO)] = [int(v) for v in r[2:]]
    json.dump(out, open(f'/tmp/claude-0/web/data/br/comp/{ano}.json', 'w'), separators=(',', ':'))
    t = g[g.NR_TURNO == 1][COL[4:]].sum()
    print(ano, len(out), 'cidades | 1º turno: aptos', int(t.QT_APTOS), 'abst %.1f%%' % (100 * t.QT_ABSTENCOES / t.QT_APTOS), 'branco+nulo %.1f%%' % (100 * (t.QT_VOTOS_BRANCOS + t.QT_TOTAL_VOTOS_NULOS) / t.QT_COMPARECIMENTO))
    if geral:
        t2 = g[g.NR_TURNO == 2][COL[4:]].sum(); print('   2º turno abst %.1f%%' % (100 * t2.QT_ABSTENCOES / t2.QT_APTOS))
