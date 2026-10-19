"""Lê um arquivo votacao_candidato_munzona do TSE (qualquer ano) e grava, em parquet:
   votos_{ano}.parquet: turno, cargo, uf, cd_mun, sq, votos (válidos, somando as zonas)
   cand_{ano}.parquet : sq, ano, uf, ue, cargo, nr, nome_urna, partido, situacao (resultado final)"""
import sys, pandas as pd, numpy as np, zipfile, io, re, os
OUT = '/tmp/claude-0/br/pq'
COLS = ['ANO_ELEICAO','CD_TIPO_ELEICAO','NR_TURNO','SG_UF','SG_UE','CD_MUNICIPIO','CD_CARGO','SQ_CANDIDATO','NR_CANDIDATO',
        'NM_URNA_CANDIDATO','SG_PARTIDO','QT_VOTOS_NOMINAIS','QT_VOTOS_NOMINAIS_VALIDOS','DS_SIT_TOT_TURNO','DS_CARGO']
def ler(fonte):
    """fonte: caminho .csv ou (zipfile, nome_entrada)"""
    abre = (lambda: open(fonte, 'rb')) if isinstance(fonte, str) else (lambda: fonte[0].open(fonte[1]))
    with abre() as f: cab = f.readline().decode('latin1')
    tem_cab = 'ANO_ELEICAO' in cab
    usar = [c for c in COLS if c in cab] if tem_cab else None
    with abre() as f:
        for ch in pd.read_csv(f, sep=';', encoding='latin1', usecols=usar, dtype=str, chunksize=1_500_000, header=0 if tem_cab else None):
            yield ch
# De 1998 a 2010 o SQ_CANDIDATO do TSE se repete entre municípios e estados (é um contador local).
# Nesses anos, cada candidato ganha um código próprio a partir de (unidade eleitoral, cargo, SQ).
REMAP = {}
GERAIS = {'3', '5', '6', '7', '8', '9', '10'}   # cargos estaduais: o candidato vale no estado inteiro
def recodifica(ch):
    # o alcance do candidato: Brasil (presidente, pelo número), estado (governador, senador, deputados) ou município
    esc = ch.SG_UE.astype(str).where(~ch.CD_CARGO.isin(GERAIS), ch.SG_UF.astype(str))
    pres = ch.CD_CARGO == '1'
    k = esc.where(~pres, 'BR') + '|' + ch.CD_CARGO.astype(str) + '|' + ch.SQ_CANDIDATO.astype(str).where(~pres, ch.NR_CANDIDATO.astype(str))
    novos = [x for x in pd.unique(k) if x not in REMAP]
    for x in novos: REMAP[x] = str(9_000_000_000 + len(REMAP))
    return ch.assign(SQ_CANDIDATO=k.map(REMAP))
def processa(ano, fontes, brasil=()):
    partes = []; cands = []; tem_pres = False
    fontes = list(fontes) + [('BRASIL', fo) for fo in brasil]
    for fo in fontes:
        so_pres = isinstance(fo, tuple) and fo[0] == 'BRASIL'
        if so_pres:
            if tem_pres or ano % 4 != 2: continue   # o arquivo BRASIL só entra se o presidente não veio nos estados
            fo = fo[1]
        for ch in ler(fo):
            ch = ch[ch.CD_TIPO_ELEICAO.isin(['2'])] if 'CD_TIPO_ELEICAO' in ch else ch   # só eleição ordinária
            if so_pres: ch = ch[ch.CD_CARGO == '1']
            if (ch.CD_CARGO == '1').any(): tem_pres = True
            if 1998 <= ano <= 2010: ch = recodifica(ch)
            v = pd.to_numeric(ch['QT_VOTOS_NOMINAIS_VALIDOS'] if 'QT_VOTOS_NOMINAIS_VALIDOS' in ch else ch['QT_VOTOS_NOMINAIS'], errors='coerce').fillna(0).astype('int64')
            ch = ch.assign(v=v)
            partes.append(ch.groupby(['NR_TURNO','CD_CARGO','SG_UF','CD_MUNICIPIO','SQ_CANDIDATO'], sort=False).v.sum().reset_index())
            cands.append(ch[['SQ_CANDIDATO','NR_TURNO','SG_UF','SG_UE','CD_CARGO','NR_CANDIDATO','NM_URNA_CANDIDATO','SG_PARTIDO','DS_SIT_TOT_TURNO']].drop_duplicates(['SQ_CANDIDATO','NR_TURNO']))
    V = pd.concat(partes).groupby(['NR_TURNO','CD_CARGO','SG_UF','CD_MUNICIPIO','SQ_CANDIDATO']).v.sum().reset_index()
    V.columns = ['turno','cargo','uf','cd_mun','sq','votos']
    for c in ['turno','cargo','cd_mun']: V[c] = V[c].astype('int32')
    V['sq'] = V.sq.astype('int64'); V['votos'] = V.votos.astype('int32')
    C = pd.concat(cands).sort_values('NR_TURNO').drop_duplicates('SQ_CANDIDATO', keep='last')   # situação do último turno disputado
    C = C.rename(columns={'SQ_CANDIDATO':'sq','SG_UF':'uf','SG_UE':'ue','CD_CARGO':'cargo','NR_CANDIDATO':'nr','NM_URNA_CANDIDATO':'nome',
                          'SG_PARTIDO':'partido','DS_SIT_TOT_TURNO':'situacao'}).drop(columns='NR_TURNO')
    C['sq'] = C.sq.astype('int64'); C['cargo'] = C.cargo.astype('int32'); C['ano'] = ano
    V.to_parquet(f'{OUT}/votos_{ano}.parquet'); C.to_parquet(f'{OUT}/cand_{ano}.parquet')
    print(ano, len(V), 'linhas de voto,', len(C), 'candidatos', V.groupby('cargo').votos.sum().to_dict())
if __name__ == '__main__':
    ano = int(sys.argv[1]); arqs = sys.argv[2:]
    fontes = []; brasil = []
    for a in arqs:
        if '.zip' in a:   # aceita .zip e .zip.001
            z = zipfile.ZipFile(a)
            nomes = [n for n in z.namelist() if n.lower().endswith(('.csv','.txt'))]
            fontes += [(z, n) for n in nomes if not re.search(r'_(BRASIL)\.', n, re.I)]
            brasil += [(z, n) for n in nomes if re.search(r'_(BRASIL)\.', n, re.I)]
        else: fontes.append(a)
    processa(ano, fontes, brasil)
