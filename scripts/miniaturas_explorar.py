"""Reduz as capturas de testes/miniaturas_explorar.js para as miniaturas dos cartões da página Explorar.

Uso: python scripts/miniaturas_explorar.py <pasta com os PNG>
Grava img/explorar/<nome>.webp em 640 x 360 (o dobro do tamanho do cartão, para telas de alta densidade).
A captura de 1280 x 720 já tem a proporção 16:9; aqui só corta o menu do topo e reduz."""
import os, sys
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEM = sys.argv[1] if len(sys.argv) > 1 else 'miniaturas'
DESTINO = os.path.join(AQUI, '..', 'img', 'explorar')
TOPO = 72   # altura do menu do site na captura, que não entra na miniatura
os.makedirs(DESTINO, exist_ok=True)
for arq in sorted(os.listdir(ORIGEM)):
    if not arq.endswith('.png'): continue
    im = Image.open(os.path.join(ORIGEM, arq)).convert('RGB')
    w, h = im.size
    alt = round(w * 9 / 16)                      # recorte 16:9 logo abaixo do menu
    im = im.crop((0, TOPO, w, min(h, TOPO + alt)))
    im = im.resize((640, 360), Image.LANCZOS)
    saida = os.path.join(DESTINO, arq[:-4] + '.webp')
    im.save(saida, 'WEBP', quality=80, method=6)
    print(saida, os.path.getsize(saida) // 1024, 'KB')
