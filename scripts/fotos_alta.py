"""Fotos dos candidatos em qualidade boa: refaz as miniaturas de 90x120 (baixar_fotos_site.ps1 e fotos_politicos.py)
na resolução que o TSE publica (161x225, recortada em 3:4), em WebP, que ocupa metade de um JPEG igual.

Uso:  python scripts/fotos_alta.py [PASTA_BDR_VOTACAO]
Lê as mesmas listas das miniaturas: fotos_lista.csv e fotos/fotos_ok.csv (painel do mapa, img/fotos/<ano>/<sq>.webp)
e banco/fotos_pol_ok.csv com o banco (fichas, img/pol/<id % 100>/<id>.webp). Só refaz quem já tem foto no site.
Os pacotes do TSE (foto_cand<ano>_<UF>_div.zip) são lidos direto do servidor: quando a lista pede muitas fotos de um
pacote, ele é baixado inteiro; quando pede poucas (prefeitos de 2024, em pacotes de até 2,3 GB), só as fotos pedidas
são lidas, por pedaços (HTTP Range). Pode parar e rodar de novo: pula os pacotes já feitos."""
import concurrent.futures as cf, csv, io, os, re, subprocess, sys, threading, time, urllib.request, zipfile
import duckdb
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(AQUI, '..')
RAIZ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads', 'BDR_Votacao')
TMP = os.path.join(RAIZ, 'banco', 'tmp_fotos_alta'); os.makedirs(TMP, exist_ok=True)
FEITO = os.path.join(RAIZ, 'banco', 'fotos_alta_feito.txt')
LOG = os.path.join(RAIZ, 'banco', 'log_fotos_alta.txt')
LARG_MAX = 240          # as fotos do TSE têm 161 de largura; se vier maior, fica em 240x320
INTEIRO = 300           # a partir de quantas fotos pedidas vale baixar o pacote inteiro
trava = threading.Lock()


def log(*a):
    linha = time.strftime('%H:%M:%S ') + ' '.join(map(str, a))
    with trava:
        print(linha, flush=True)
        with open(LOG, 'a', encoding='utf-8') as f: f.write(linha + '\n')


def webp(dados, destino):
    img = Image.open(io.BytesIO(dados)).convert('RGB')
    sw, sh = img.size
    if sw / sh > 3 / 4: cw, ch = int(sh * 3 / 4), sh; cx, cy = (sw - cw) // 2, 0
    else: cw, ch = sw, int(sw * 4 / 3); cx, cy = 0, (sh - ch) // 4   # um pouco acima do centro: o rosto
    img = img.crop((cx, cy, cx + cw, cy + ch))
    if cw > LARG_MAX: img = img.resize((LARG_MAX, LARG_MAX * 4 // 3), Image.LANCZOS)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    img.save(destino + '.tmp', 'WEBP', quality=80, method=6)
    os.replace(destino + '.tmp', destino)


class Remoto(io.RawIOBase):
    """Arquivo no servidor lido por pedaços (HTTP Range), para o zipfile abrir sem baixar tudo."""
    def __init__(self, url):
        self.url, self.pos, self.cache = url, 0, []
        with urllib.request.urlopen(urllib.request.Request(url, method='HEAD'), timeout=60) as r: self.tam = int(r.headers['Content-Length'])
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.tam + off
        return self.pos
    def _pega(self, ini, fim):
        for tentativa in range(5):
            try:
                req = urllib.request.Request(self.url, headers={'Range': f'bytes={ini}-{fim - 1}'})
                with urllib.request.urlopen(req, timeout=120) as r: return r.read()
            except Exception:
                time.sleep(3 * (tentativa + 1))
        raise IOError('falhou ' + self.url)
    def read(self, n=-1):
        if n is None or n < 0: n = self.tam - self.pos
        n = min(n, self.tam - self.pos)
        if n <= 0: return b''
        for ini, dados in self.cache:
            if ini <= self.pos and self.pos + n <= ini + len(dados):
                b = dados[self.pos - ini:self.pos - ini + n]; self.pos += n; return b
        ini = self.pos; dados = self._pega(ini, min(self.tam, ini + max(n, 96 * 1024)))   # a foto inteira cabe num pedido
        self.cache = ([(ini, dados)] + self.cache)[:4]
        b = dados[:n]; self.pos += n; return b
    def readinto(self, b):
        d = self.read(len(b)); b[:len(d)] = d; return len(d)


def pacote(ano, uf, quer):
    """quer: {sq_foto: [destinos]}. Devolve (gravadas, pedidas)."""
    url = f'https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes{ano}/fotos/foto_cand{ano}_{uf}_div.zip'
    zp = None
    try:
        rem = Remoto(url)
        if len(quer) >= INTEIRO and rem.tam < 600e6:
            zp = os.path.join(TMP, f'{ano}_{uf}.zip')
            r = subprocess.run(['curl', '-sS', '-f', '-L', '--retry', '5', '--retry-delay', '10', '-o', zp, url])
            if r.returncode: raise IOError(f'curl {r.returncode}')
            z = zipfile.ZipFile(zp)
        else:
            z = zipfile.ZipFile(rem)
        n = erros = 0
        for e in z.infolist():
            m = re.search(r'(\d{6,})', os.path.basename(e.filename))
            if not m or m.group(1) not in quer: continue
            try:
                dados = z.read(e)
                for destino in quer[m.group(1)]: webp(dados, destino)
                n += 1
            except Exception: erros += 1
        z.close()
        return n, erros
    finally:
        if zp and os.path.exists(zp): os.remove(zp)


# ---------- o que refazer: só quem já tem foto no site ----------
pacotes = {}
def quero(ano, uf, sq, destino): pacotes.setdefault((int(ano), uf), {}).setdefault(str(sq), []).append(destino)

ok_mapa = {tuple(l.strip().split(';')) for l in open(os.path.join(RAIZ, 'fotos', 'fotos_ok.csv'), encoding='utf-8') if ';' in l}
with open(os.path.join(RAIZ, 'fotos_lista.csv'), encoding='utf-8') as f:
    for r in csv.DictReader(f, delimiter=';'):
        if (r['ano'], r['sq_site']) in ok_mapa:
            quero(r['ano'], r['uf'], r['sq_foto'], os.path.join(SITE, 'img', 'fotos', r['ano'], r['sq_site'] + '.webp'))

ok_pol = {int(l) for l in open(os.path.join(RAIZ, 'banco', 'fotos_pol_ok.csv'), encoding='utf-8') if l.strip()}
con = duckdb.connect(os.path.join(RAIZ, 'banco', 'eleicoes_brasil.duckdb'), read_only=True)
for ano, uf, sq, idp in con.execute("""
    SELECT e.nr_ano_eleicao, CASE WHEN c.cd_cargo = 1 THEN 'BR' ELSE c.sg_uf END uf, c.sq_candidato, c.id_pessoa
    FROM candidatura c JOIN eleicao e USING (id_eleicao)
    WHERE e.nr_ano_eleicao BETWEEN 2014 AND 2026 AND c.cd_cargo IN (1, 3, 5, 6, 7, 8)
    QUALIFY ROW_NUMBER() OVER (PARTITION BY c.id_pessoa ORDER BY e.nr_ano_eleicao DESC, c.cd_cargo) = 1""").fetchall():
    if idp in ok_pol: quero(ano, uf, sq, os.path.join(SITE, 'img', 'pol', str(idp % 100), f'{idp}.webp'))
con.close()

feitos = set(open(FEITO, encoding='utf-8').read().split()) if os.path.exists(FEITO) else set()
falta = {k: v for k, v in pacotes.items() if f'{k[0]}_{k[1]}' not in feitos}
log(sum(len(v) for v in pacotes.values()), 'fotos em', len(pacotes), 'pacotes;', len(falta), 'pacotes a fazer')


def tarefa(k):
    ano, uf = k
    t0 = time.time()
    try:
        n, erros = pacote(ano, uf, falta[k])
    except Exception as ex:
        log(f'{ano}_{uf} ERRO', ex); return
    with trava:
        with open(FEITO, 'a', encoding='utf-8') as f: f.write(f'{ano}_{uf}\n')
    log(f'{ano}_{uf}: {n} de {len(falta[k])} fotos' + (f', {erros} com erro' if erros else ''), f'({time.time() - t0:.0f} s)')


with cf.ThreadPoolExecutor(6) as ex:
    list(ex.map(tarefa, sorted(falta, key=lambda k: -len(falta[k]))))
log('fim')
