"""Depois de fotos_alta.py: toda foto que o site lista (data/br/fotos/<ano>.js e data/br/pol/fotos.js) precisa existir
em .webp. Quem não veio do TSE nesta rodada é convertido da miniatura antiga (.jpg, 90x120), para não faltar nenhuma.
Com --apagar-jpg, apaga as miniaturas .jpg que já têm a .webp.

Uso:  python scripts/fotos_completar.py [--apagar-jpg]"""
import base64, gzip, json, os, re, sys
from PIL import Image

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
D = os.path.join(SITE, 'data', 'br')


def carrega(chave):
    t = open(os.path.join(D, chave + '.js'), encoding='utf-8').read()
    m = re.search(r'V\.descompactar\("([^"]+)"\)', t)
    if m: return json.loads(gzip.decompress(base64.b64decode(m.group(1))).decode('utf-8'))
    return json.loads(t[t.index(']=') + 2:].rstrip().rstrip(';'))


caminhos = []
for arq in os.listdir(os.path.join(D, 'fotos')):
    if arq.endswith('.js'):
        ano = arq[:-3]
        caminhos += [os.path.join(SITE, 'img', 'fotos', ano, f'{sq}') for sq in carrega('fotos/' + ano)]
caminhos += [os.path.join(SITE, 'img', 'pol', str(i % 100), f'{i}') for i in carrega('pol/fotos')]

novas = convertidas = sem_nada = apagadas = 0
for c in caminhos:
    if os.path.exists(c + '.webp'): novas += 1
    elif os.path.exists(c + '.jpg'):
        Image.open(c + '.jpg').convert('RGB').save(c + '.webp', 'WEBP', quality=82, method=6); convertidas += 1
    else: sem_nada += 1
    if '--apagar-jpg' in sys.argv and os.path.exists(c + '.webp') and os.path.exists(c + '.jpg'):
        os.remove(c + '.jpg'); apagadas += 1
print(f'{len(caminhos)} fotos listadas: {novas} em boa qualidade, {convertidas} convertidas da miniatura, {sem_nada} sem arquivo'
      + (f'; {apagadas} .jpg apagados' if apagadas else ''))
