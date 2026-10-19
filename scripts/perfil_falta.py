"""Quem falta: aptos, comparecimento e abstenção por idade, escolaridade, gênero e cor/raça (perfil_comparecimento_abstencao do TSE).
Lê os arquivos por estado de dentro do zip (ignora o _BRASIL, que repete tudo) e grava data/br/perfil/{ano}.json."""
import sys, zipfile, json, pandas as pd
COL = ['NR_TURNO', 'SG_UF', 'DS_GENERO', 'CD_FAIXA_ETARIA', 'DS_FAIXA_ETARIA', 'CD_GRAU_ESCOLARIDADE', 'DS_GRAU_ESCOLARIDADE', 'DS_COR_RACA', 'QT_APTOS', 'QT_COMPARECIMENTO', 'QT_ABSTENCAO']
for ano, arq in zip(sys.argv[1::2], sys.argv[2::2]):
    z = zipfile.ZipFile(arq); partes = []
    for n in z.namelist():
        if not n.endswith('.csv') or 'BRASIL' in n: continue
        for ch in pd.read_csv(z.open(n), sep=';', encoding='latin1', usecols=COL, chunksize=2_000_000):
            ch = ch[ch.NR_TURNO == 1]
            partes.append(ch.groupby(COL[2:8], dropna=False)[COL[8:]].sum().reset_index())
    d = pd.concat(partes).groupby(COL[2:8], dropna=False)[COL[8:]].sum().reset_index()
    out = {}
    for dim, cols in [('idade', ['CD_FAIXA_ETARIA', 'DS_FAIXA_ETARIA']), ('escolaridade', ['CD_GRAU_ESCOLARIDADE', 'DS_GRAU_ESCOLARIDADE']), ('genero', ['DS_GENERO']), ('raca', ['DS_COR_RACA'])]:
        g = d.groupby(cols)[COL[8:]].sum().reset_index()
        out[dim] = [[*(str(x) for x in r[:len(cols)]), int(r[-3]), int(r[-2]), int(r[-1])] for r in g.itertuples(index=False)]
    t = d[COL[8:]].sum(); out['total'] = [int(t.QT_APTOS), int(t.QT_COMPARECIMENTO), int(t.QT_ABSTENCAO)]
    json.dump(out, open(f'/tmp/claude-0/web/data/br/perfil/{ano}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print(ano, 'aptos', out['total'][0], 'abst %.1f%%' % (100 * out['total'][2] / out['total'][0]))
    for r in out['idade']: print('  ', r[1], r[2], '%.1f%%' % (100 * r[4] / max(1, r[2])))
    for r in out['escolaridade']: print('  ', r[1], r[2], '%.1f%%' % (100 * r[4] / max(1, r[2])))
