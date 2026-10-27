"""Foto de cada político na ficha (js/politico.js): uma por pessoa, a da candidatura mais recente nas eleições gerais
de 2014 a 2026 (presidente, governador, senador, deputado federal, estadual e distrital).

Uso: python fotos_politicos.py [eleicoes_brasil.duckdb] [PASTA_BDR_VOTACAO] [--indice]
--indice só atualiza data/br/pol/fotos.js com as fotos já baixadas, sem fazer downloads.
Para cada estado e ano, baixa o pacote foto_cand<ano>_<UF>_div.zip do Portal de Dados Abertos do TSE, tira só as fotos
da lista, recorta em 3:4, reduz para 90x120 e grava em img/pol/<id_pessoa % 100>/<id_pessoa>.jpg. O pacote é apagado
depois; pode parar e rodar de novo, ele pula os pacotes já feitos. A lista de quem tem foto fica em
PASTA/banco/fotos_pol_ok.csv e em data/br/pol/fotos.js, que a página da ficha lê.
As fotos de prefeito são de outros pacotes, de vários GB por estado, e ficam de fora (o site já tem as de 2024)."""
import os, sys, re, io, zipfile, subprocess, json
import duckdb
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
BANCO = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('BANCO')
RAIZ = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.expanduser('~'), 'Downloads', 'BDR_Votacao')
SO_INDICE = '--indice' in sys.argv
SAIDA = os.path.join(AQUI, '..', 'img', 'pol')
TMP = os.path.join(RAIZ, 'banco', 'tmp_fotos'); os.makedirs(TMP, exist_ok=True)
FEITO = os.path.join(RAIZ, 'banco', 'fotos_pol_feito.txt')
OK = os.path.join(RAIZ, 'banco', 'fotos_pol_ok.csv')
W, H = 90, 120
log = lambda *a: print(*a, flush=True)

con = duckdb.connect(BANCO, read_only=True)
lista = con.execute("""
    SELECT e.nr_ano_eleicao, CASE WHEN c.cd_cargo = 1 THEN 'BR' ELSE c.sg_uf END uf, c.sq_candidato, c.id_pessoa
    FROM candidatura c JOIN eleicao e USING (id_eleicao)
    WHERE e.nr_ano_eleicao BETWEEN 2014 AND 2026 AND c.cd_cargo IN (1, 3, 5, 6, 7, 8)
    QUALIFY ROW_NUMBER() OVER (PARTITION BY c.id_pessoa ORDER BY e.nr_ano_eleicao DESC, c.cd_cargo) = 1""").fetchall()
con.close()
pacotes = {}
for ano, uf, sq, idp in lista: pacotes.setdefault((ano, uf), {})[str(sq)] = idp
feitos = set(open(FEITO, encoding='utf-8').read().split()) if os.path.exists(FEITO) else set()
log(len(lista), 'pessoas,', len(pacotes), 'pacotes,', len(feitos), 'já feitos')


def miniatura(dados, destino):
    img = Image.open(io.BytesIO(dados)).convert('RGB')
    sw, sh = img.size; r = W / H
    if sw / sh > r: cw, ch = int(sh * r), sh; cx, cy = (sw - cw) // 2, 0
    else: cw, ch = sw, int(sw / r); cx, cy = 0, (sh - ch) // 4   # um pouco acima do centro: o rosto
    img.crop((cx, cy, cx + cw, cy + ch)).resize((W, H), Image.LANCZOS).save(destino, 'JPEG', quality=68, optimize=True, progressive=True)


for (ano, uf), quer in sorted([] if SO_INDICE else pacotes.items()):
    chave = f'{ano}_{uf}'
    if chave in feitos: continue
    url = f'https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes{ano}/fotos/foto_cand{ano}_{uf}_div.zip'
    zp = os.path.join(TMP, f'foto_cand{ano}_{uf}_div.zip')
    r = subprocess.run(['curl', '-sS', '-f', '-L', '--retry', '5', '--retry-delay', '10', '-o', zp, url])
    if r.returncode != 0: log('sem pacote', chave, 'curl', r.returncode); continue
    n = erros = 0
    try:
        with zipfile.ZipFile(zp) as z, open(OK, 'a', encoding='utf-8') as ok:
            for e in z.infolist():
                m = re.search(r'(\d{6,})', os.path.basename(e.filename))
                if not m or m.group(1) not in quer: continue
                idp = quer[m.group(1)]
                d = os.path.join(SAIDA, str(idp % 100)); os.makedirs(d, exist_ok=True)
                try: miniatura(z.read(e), os.path.join(d, f'{idp}.jpg')); ok.write(f'{idp}\n'); n += 1
                except Exception: erros += 1
    except zipfile.BadZipFile: log('pacote com defeito', chave)
    os.remove(zp)
    with open(FEITO, 'a', encoding='utf-8') as f: f.write(chave + '\n')
    log(chave, f'{n} de {len(quer)} fotos', f'({erros} com erro)' if erros else '')
ids = sorted({int(linha) for linha in open(OK, encoding='utf-8') if linha.strip()}) if os.path.exists(OK) else []
ids = [idp for idp in ids if os.path.exists(os.path.join(SAIDA, str(idp % 100), f'{idp}.jpg'))]
indice = os.path.join(AQUI, '..', 'data', 'br', 'pol', 'fotos.js')
os.makedirs(os.path.dirname(indice), exist_ok=True)
with open(indice + '.tmp', 'w', encoding='utf-8') as f:
    f.write('(window.__D=window.__D||{})["br/pol/fotos"]=' + json.dumps(ids, separators=(',', ':')) + ';\n')
os.replace(indice + '.tmp', indice)
log('fim:', len(ids), 'fotos no índice')
