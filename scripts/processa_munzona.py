"""Lê um arquivo votacao_candidato_munzona do TSE (qualquer ano) e grava, em parquet:
   votos_{ano}.parquet: turno, cargo, uf, cd_mun, sq, votos (válidos, somando as zonas)
   cand_{ano}.parquet : sq, ano, uf, ue, cargo, nr, nome_urna, partido, situacao (resultado final)"""
import sys, pandas as pd, numpy as np, zipfile, io, re, os
OUT = os.path.join(os.environ.get('TMPBR', '/tmp/claude-0/br'), 'pq'); os.makedirs(OUT, exist_ok=True)
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
def processa(ano, fontes, nacional=()):
    """nacional: o arquivo _BRASIL, de onde só entram os cargos que os arquivos das UFs não trazem (presidente em 1998)"""
    partes = []; cands = []; vistos = set()
    for fo in list(fontes) + [('BR', f) for f in nacional]:
        so_novos = fo[0] == 'BR'
        if so_novos: fo = fo[1]
        for ch in ler(fo):
            ch = ch[ch.CD_TIPO_ELEICAO.isin(['2'])] if 'CD_TIPO_ELEICAO' in ch else ch   # só eleição ordinária
            if so_novos: ch = ch[~ch.CD_CARGO.isin(vistos)]
            else: vistos.update(ch.CD_CARGO.unique())
            if ch.empty: continue
            v = pd.to_numeric(ch['QT_VOTOS_NOMINAIS_VALIDOS'] if 'QT_VOTOS_NOMINAIS_VALIDOS' in ch else ch['QT_VOTOS_NOMINAIS'], errors='coerce').fillna(0).astype('int64')
            ch = ch.assign(v=v)
            partes.append(ch.groupby(['NR_TURNO','CD_CARGO','SG_UF','CD_MUNICIPIO','SQ_CANDIDATO'], sort=False).v.sum().reset_index())
            # de 1998 a 2010 o sequencial se repete entre municípios e cargos: o candidato é (sequencial, alcance, cargo), com o alcance
            # sendo o município nas eleições municipais e a UF nas gerais (em 2002 e 2010 o SG_UE traz o município até para deputado)
            ch = ch.assign(ALCANCE=ch.SG_UE.where(ch.CD_CARGO.isin(['11', '12', '13']), ch.SG_UF))
            cands.append(ch[['SQ_CANDIDATO','NR_TURNO','SG_UF','SG_UE','CD_CARGO','NR_CANDIDATO','NM_URNA_CANDIDATO','SG_PARTIDO','DS_SIT_TOT_TURNO','ALCANCE']].drop_duplicates(['SQ_CANDIDATO','ALCANCE','CD_CARGO','NR_TURNO']))
    V = pd.concat(partes).groupby(['NR_TURNO','CD_CARGO','SG_UF','CD_MUNICIPIO','SQ_CANDIDATO']).v.sum().reset_index()
    V.columns = ['turno','cargo','uf','cd_mun','sq','votos']
    for c in ['turno','cargo','cd_mun']: V[c] = V[c].astype('int32')
    V['sq'] = V.sq.astype('int64'); V['votos'] = V.votos.astype('int32')
    C = pd.concat(cands).sort_values('NR_TURNO').drop_duplicates(['SQ_CANDIDATO','ALCANCE','CD_CARGO'], keep='last').drop(columns='ALCANCE')   # situação do último turno disputado
    C = C.rename(columns={'SQ_CANDIDATO':'sq','SG_UF':'uf','SG_UE':'ue','CD_CARGO':'cargo','NR_CANDIDATO':'nr','NM_URNA_CANDIDATO':'nome',
                          'SG_PARTIDO':'partido','DS_SIT_TOT_TURNO':'situacao'}).drop(columns='NR_TURNO')
    C['sq'] = C.sq.astype('int64'); C['cargo'] = C.cargo.astype('int32'); C['ano'] = ano
    V.to_parquet(f'{OUT}/votos_{ano}.parquet'); C.to_parquet(f'{OUT}/cand_{ano}.parquet')
    print(ano, len(V), 'linhas de voto,', len(C), 'candidatos', V.groupby('cargo').votos.sum().to_dict())
if __name__ == '__main__':
    ano = int(sys.argv[1]); arqs = sys.argv[2:]
    fontes, nacional = [], []
    for a in arqs:
        if zipfile.is_zipfile(a):   # .zip ou parte .zip.001
            z = zipfile.ZipFile(a)
            nomes = [n for n in z.namelist() if n.lower().endswith(('.csv','.txt'))]
            fontes += [(z, n) for n in nomes if not re.search(r'_(BRASIL)\.', n, re.I)]
            nacional += [(z, n) for n in nomes if re.search(r'_(BRASIL)\.', n, re.I)]
        else: fontes.append(a)
    processa(ano, fontes, nacional)
