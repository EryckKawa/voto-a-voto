"""Fotos dos candidatos no site: quais baixar e quais já existem.

1) python scripts/lista_fotos.py lista PASTA_ZIPS SAIDA.csv
   Lista os candidatos que aparecem no painel da cidade do mapa (presidente, governador e senador de 2010 a 2026,
   prefeito de 2024) com o sequencial do TSE (o nome do arquivo no pacote de fotos) e o sequencial usado no site
   (data/br/ufx). Em 2010 o arquivo de votos usa outra numeração: a ligação é por estado, cargo e número na urna.
   O baixar_fotos_site.ps1 lê essa lista, baixa os pacotes foto_cand<ano>_<UF>_div.zip do TSE e grava as miniaturas
   em img/fotos/<ano>/<sequencial do site>.jpg.
2) python scripts/lista_fotos.py indice fotos_ok.csv
   Lê o registro das fotos gravadas (ano;sequencial) e escreve data/br/fotos/<ano>.json, que o site usa para saber
   quem tem foto.
"""
import csv, io, json, os, sys, zipfile

AQUI = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(AQUI, '..', 'data', 'br')
CARGOS = {2010: ['PRES', 'GOV', 'SEN'], 2014: ['PRES', 'GOV', 'SEN'], 2018: ['PRES', 'GOV', 'SEN'], 2022: ['PRES', 'GOV', 'SEN'],
          2026: ['PRES', 'GOV', 'SEN'], 2024: ['PREF']}
NOME = {'PRES': 'PRESIDENTE', 'GOV': 'GOVERNADOR', 'SEN': 'SENADOR', 'PREF': 'PREFEITO'}


def carrega(p):
    t = open(p, encoding='utf-8').read()
    return json.loads(t[t.index(']=') + 2:].rstrip().rstrip(';'))


def candidatos(pasta, ano):
    z = zipfile.ZipFile(os.path.join(pasta, f'consulta_cand_{ano}.zip.001'))
    sqs, por_numero = set(), {}
    for n in z.namelist():
        if not n.endswith('.csv') or 'BRASIL' in n: continue
        r = csv.reader(io.TextIOWrapper(z.open(n), encoding='latin-1'), delimiter=';'); h = next(r); ix = {k: i for i, k in enumerate(h)}
        for row in r:
            sq = row[ix['SQ_CANDIDATO']]; sqs.add(sq)
            por_numero[(row[ix['SG_UF']], row[ix['DS_CARGO']].upper(), row[ix['NR_CANDIDATO']])] = sq
    return sqs, por_numero


def lista(pasta, saida):
    linhas = set()
    for ano, cgs in CARGOS.items():
        sqs, por_numero = candidatos(pasta, ano)
        for cg in cgs:
            for uf, u in carrega(os.path.join(DATA, 'ufx', f'{cg}{ano}.js')).items():
                for sq, k in u['c'].items():
                    uf_pacote = 'BR' if cg == 'PRES' else uf
                    sq_foto = sq if sq in sqs else por_numero.get((uf_pacote, NOME[cg], str(k[2])))
                    if sq_foto: linhas.add((ano, uf_pacote, sq_foto, sq))
    with open(saida, 'w', newline='') as f:
        f.write('ano;uf;sq_foto;sq_site\r\n')
        for l in sorted(linhas): f.write(';'.join(map(str, l)) + '\r\n')
    print(len(linhas), 'fotos em', len({(a, u) for a, u, _, _ in linhas}), 'pacotes')


def indice(registro):
    por_ano = {}
    for linha in open(registro, encoding='utf-8-sig'):
        p = linha.strip().split(';')
        if len(p) == 2 and p[0].isdigit(): por_ano.setdefault(p[0], set()).add(int(p[1]))
    os.makedirs(os.path.join(DATA, 'fotos'), exist_ok=True)
    for ano, s in sorted(por_ano.items()):
        txt = json.dumps(sorted(s), separators=(',', ':'))
        open(os.path.join(DATA, 'fotos', f'{ano}.json'), 'w').write(txt)
        open(os.path.join(DATA, 'fotos', f'{ano}.js'), 'w').write('(window.__D=window.__D||{})[' + json.dumps(f'br/fotos/{ano}') + ']=' + txt + ';\n')
        print(ano, len(s), 'fotos')


if __name__ == '__main__':
    if sys.argv[1] == 'lista': lista(sys.argv[2], sys.argv[3])
    else: indice(sys.argv[2])
