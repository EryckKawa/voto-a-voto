"""Nuvens individuais de projetos e discursos oficiais, 2019–2026.

Uso: python textos_parlamentares.py [PASTA_BDR_VOTACAO]
Guarda os arquivos públicos fora do site, em PASTA/textos. Publica somente
contagens de palavras e metadados em data/br/pol/textos (64 partes).
Liga parlamentares ao TSE por nome civil e nascimento, sem aproximação por nome.
"""
import base64, csv, gzip, html, http.client, json, re, sys, time, unicodedata
import urllib.request, urllib.error, urllib.parse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path
import duckdb
from palavras_texto import PALAVRAS_COMUNS
csv.field_size_limit(10_000_000)

AQUI = Path(__file__).resolve().parent
RAIZ = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads/BDR_Votacao'
CACHE = RAIZ / 'textos'
OUT = AQUI.parent / 'data/br/pol/textos'
INICIO, FIM = '2019-01-01', min(date.today().isoformat(), '2026-12-31')
TIPOS = {'PL', 'PLP', 'PEC', 'PDL', 'PDC', 'PRC', 'PFC', 'PLS', 'PLC'}
COMUNS = PALAVRAS_COMUNS | set('''senhor senhora senhores senhoras deputado deputada deputados deputadas senador senadora senadores senadoras
presidencia plenaria plenario palavra discurso discursos orador oradora obrigado obrigada excelentissimo excelencia nobres nobre
artigo artigos altera alteracao alteracoes dispoe dispor acrescenta acresce inciso incisos paragrafo paragrafos caput termos
seguinte seguintes referido referida referidos referidas estabelece instituir institui lei leis decreto constituicao resolucao
parecer votacao votacoes emenda emendas requerimento requerimentos camara senado congresso ordem sessao sessoes revisao
relator relatora relatorio aprovacao aprovar aprovado aprovada voto votos sim nao hoje ontem amanha agora quero queria dizer
disse aqui ali voce voces gente vamos fazer estamos estao tenho senhorio palavra uso mesa registro desta deste neste nesta
desses dessas estes estas nossos vossa vosso vossas vossos suas seus poderia quero disse nessa nesse desta deste fica ficam
sera serao todos todas num numa ja sao entao brasil brasileiro brasileira bloco federal sobre tambem muito realmente
primeiro primeira segundo segunda terceiro terceira tempo momento importante exemplo portanto exatamente certamente
parabens saudacao cumprimento cumprimentar cumprimentos nome ausencia presente senhoras nobres seculo milhao milhoes
janeiro fevereiro marco abril maio junho julho agosto setembro outubro novembro dezembro providencias disposicoes transitorias codigo constitucionais
'''.split())
CACHE.mkdir(exist_ok=True)
log = lambda *a: print(*a, flush=True)


def norm(t):
    return ' '.join(unicodedata.normalize('NFD', t or '').encode('ascii', 'ignore').decode().upper().split())


def baixa(url, arquivo, formato='json'):
    destino = urllib.parse.urlsplit(url)
    if destino.scheme != 'https' or destino.hostname not in {'dadosabertos.camara.leg.br', 'legis.senado.leg.br'}:
        raise ValueError('Origem não autorizada para os textos parlamentares')
    arquivo = CACHE / arquivo
    if not arquivo.exists():
        arquivo.parent.mkdir(parents=True, exist_ok=True)
        for tentativa in range(3):
            try:
                req = urllib.request.Request(url, headers={'Accept': 'application/json' if formato == 'json' else 'text/csv', 'User-Agent': 'Voto-a-voto/1.0 estudo-academico'})
                with urllib.request.urlopen(req, timeout=45) as r:
                    dados = r.read()
                if formato == 'json': json.loads(dados)
                tmp = arquivo.with_suffix(arquivo.suffix + '.tmp')
                tmp.write_bytes(dados); tmp.replace(arquivo)
                break
            except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.IncompleteRead, json.JSONDecodeError):
                if tentativa == 2: raise
                time.sleep(2 * (tentativa + 1))
    return json.loads(arquivo.read_text(encoding='utf-8-sig')) if formato == 'json' else arquivo


def lista(v):
    return v if isinstance(v, list) else [v] if v else []


def conta(texto, cont, grafias):
    texto = html.unescape(re.sub(r'<[^>]+>', ' ', texto or ''))
    texto = re.sub(r'https?://\S+|[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}', ' ', texto)
    texto = re.sub(r'^\s*(?:O|A)\s+SR[A.]*\s+[^\n(]+\([^)]*\)\s*[-–—]\s*', '', texto, flags=re.I)
    for g, qt in Counter(re.findall(r'[a-záàâãéêíóôõúüç]{4,}', texto.lower())).items():
        w = norm(g).lower()
        if w in COMUNS: continue
        cont[w] += qt; grafias[w][g] += qt


def resultado(casa, tipo, id_externo, cont, grafias, datas, estado='ok'):
    nomes = {'camara': 'Câmara dos Deputados', 'senado': 'Senado Federal'}
    resumo = casa == 'senado' and tipo == 'discursos'
    titulo = 'Resumos de discursos' if resumo else 'Discursos' if tipo == 'discursos' else 'Projetos de autoria/coautoria'
    url = (f'https://dadosabertos.camara.leg.br/api/v2/deputados/{id_externo}/discursos' if tipo == 'discursos' else f'https://dadosabertos.camara.leg.br/api/v2/proposicoes?idDeputadoAutor={id_externo}') if casa == 'camara' else (f'https://legis.senado.leg.br/dadosabertos/senador/{id_externo}/discursos' if tipo == 'discursos' else f'https://legis.senado.leg.br/dadosabertos/processo?codigoParlamentarAutor={id_externo}')
    return {'id': f'{casa}-{tipo}', 'titulo': titulo, 'casa': nomes[casa], 'n': len(datas),
            'inicio': min(datas) if datas else INICIO, 'fim': max(datas) if datas else FIM, 'estado': estado,
            'texto': 'resumos oficiais' if resumo else 'transcrições' if tipo == 'discursos' else 'ementas',
            'url': url, 'palavras': [[grafias[w].most_common(1)[0][0], q] for w, q in cont.most_common(40)]}


def grava(chave, obj):
    texto = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    b64 = base64.b64encode(gzip.compress(texto.encode('utf-8'), compresslevel=6, mtime=0)).decode('ascii')
    p = OUT / f'{chave}.js'; p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix('.tmp')
    tmp.write_text('(window.__D=window.__D||{})[' + json.dumps(f'br/pol/textos/{chave}') + ']=V.descompactar(' + json.dumps(b64) + ');\n', encoding='utf-8')
    tmp.replace(p)


db = duckdb.connect(str(RAIZ / 'banco/eleicoes_brasil.duckdb'), read_only=True)
identidades = defaultdict(list)
for idp, nome, nasc, cargo, sem_titulo in db.execute("""
    SELECT DISTINCT p.id_pessoa, p.nm_pessoa, p.dt_nascimento,
           CASE WHEN c.cd_cargo IN (9,10) THEN 5 ELSE c.cd_cargo END, p.nr_titulo_eleitoral LIKE 'SQ%'
    FROM pessoa p JOIN candidatura c USING(id_pessoa) WHERE c.cd_cargo IN (5,6,9,10) AND p.dt_nascimento IS NOT NULL
""").fetchall():
    identidades[(norm(nome), str(nasc), cargo)].append((idp, sem_titulo))


def liga(nome, nasc, cargo):
    candidatos = identidades.get((norm(nome), nasc, cargo), [])
    reais = {idp for idp, sem_titulo in candidatos if not sem_titulo}
    ids = reais or {idp for idp, _ in candidatos}
    return next(iter(ids)) if len(ids) == 1 else None


deputados = {}
with (RAIZ / 'camara/deputados.csv').open(encoding='utf-8-sig', newline='') as f:
    for r in csv.DictReader(f, delimiter=';'):
        idp = liga(r['nomeCivil'], r['dataNascimento'], 6)
        if idp: deputados[int(r['uri'].rsplit('/', 1)[-1])] = idp
db.close()
log('deputados ligados por nome civil e nascimento:', len(deputados))

# Arquivos anuais: autoria individual, nunca as proposições em que o deputado apenas votou.
def arquivos_ano(ano):
    for tipo in ('proposicoes', 'proposicoesAutores'):
        baixa(f'https://dadosabertos.camara.leg.br/arquivos/{tipo}/csv/{tipo}-{ano}.csv', f'camara/{tipo}-{ano}.csv', 'csv')
    return ano

with ThreadPoolExecutor(4) as ex:
    for ano in ex.map(arquivos_ano, range(2019, int(FIM[:4]) + 1)): log('arquivos de projetos', ano)

projetos = {}
for ano in range(2019, int(FIM[:4]) + 1):
    autores = defaultdict(set)
    with (CACHE / f'camara/proposicoesAutores-{ano}.csv').open(encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f, delimiter=';'):
            idd = r['idDeputadoAutor']
            if idd.isdigit() and int(idd) in deputados: autores[r['idProposicao']].add(int(idd))
    with (CACHE / f'camara/proposicoes-{ano}.csv').open(encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f, delimiter=';'):
            data = r['dataApresentacao'][:10]
            if r['siglaTipo'] not in TIPOS or not INICIO <= data <= FIM: continue
            for idd in autores.get(r['id'], ()):
                cont, grafias, docs = projetos.setdefault(idd, (Counter(), defaultdict(Counter), {}))
                if r['id'] in docs: continue
                docs[r['id']] = data; conta(r['ementa'], cont, grafias)

publicado = defaultdict(list)
for idd, (cont, grafias, docs) in projetos.items():
    publicado[deputados[idd]].append(resultado('camara', 'projetos', idd, cont, grafias, list(docs.values())))
log('nuvens de projetos da Câmara:', len(projetos))

# Discursos: segue a paginação oficial; cada consulta da Câmara cobre até quatro anos.
def discursos_camara(idd):
    cont, grafias, datas, vistos = Counter(), defaultdict(Counter), [], set()
    try:
        for inicio, fim in ((INICIO, '2022-12-31'), ('2023-01-01', FIM)):
            params = urllib.parse.urlencode({'dataInicio': inicio, 'dataFim': fim, 'itens': 100, 'pagina': 1, 'ordem': 'DESC'})
            url = f'https://dadosabertos.camara.leg.br/api/v2/deputados/{idd}/discursos?{params}'
            pagina = 1
            while url:
                d = baixa(url, f'camara/discursos/{idd}-{inicio[:4]}-{pagina}.json')
                for r in d['dados']:
                    texto = r.get('transcricao') or ''
                    chave = (r.get('dataHoraInicio'), texto)
                    if not texto.strip() or chave in vistos: continue
                    vistos.add(chave); datas.append(r['dataHoraInicio'][:10]); conta(texto, cont, grafias)
                url = next((l['href'] for l in d.get('links', []) if l['rel'] == 'next'), None)
                pagina += 1
        return deputados[idd], resultado('camara', 'discursos', idd, cont, grafias, datas)
    except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.IncompleteRead, json.JSONDecodeError) as e:
        log('falha discursos Câmara', idd, type(e).__name__)
        return deputados[idd], resultado('camara', 'discursos', idd, cont, grafias, datas, 'erro')

# O Senado fornece resumos indexados em lote, identificados assim na ficha.
senadores_raw = baixa('https://legis.senado.leg.br/dadosabertos/senador/lista/legislatura/56/57.json?exercicio=S', 'senadores.json')
senadores = lista(senadores_raw['ListaParlamentarLegislatura'].get('Parlamentares', {}).get('Parlamentar'))


def textos_senado(senador):
    ids = senador['IdentificacaoParlamentar']; codigo = ids['CodigoParlamentar']
    if not codigo.isdigit(): raise ValueError('Código de senador inválido')
    idp, saida = None, []
    try:
        detalhe = baixa(f'https://legis.senado.leg.br/dadosabertos/senador/{codigo}.json', f'senado/{codigo}-detalhe.json')['DetalheParlamentar']['Parlamentar']
        idp = liga(detalhe['IdentificacaoParlamentar']['NomeCompletoParlamentar'], detalhe['DadosBasicosParlamentar'].get('DataNascimento'), 5)
        if not idp: return None, []
        for tipo in ('projetos', 'discursos'):
            cont, grafias, datas = Counter(), defaultdict(Counter), []
            if tipo == 'projetos':
                url = f'https://legis.senado.leg.br/dadosabertos/processo?codigoParlamentarAutor={codigo}&dataInicioApresentacao={INICIO}&dataFimApresentacao={FIM}'
                d = baixa(url, f'senado/{codigo}-projetos.json')
                itens = d if isinstance(d, list) else d.get('processos', [])
                for r in itens:
                    sigla = str(r.get('identificacao', '')).split(' ')[0]
                    if sigla not in TIPOS | {'PRS', 'PDS', 'PLN'}: continue
                    texto = r.get('ementa') or ''; data = str(r.get('dataApresentacao', ''))[:10]
                    if texto and INICIO <= data <= FIM: datas.append(data); conta(texto, cont, grafias)
            else:
                vistos = set()
                for ano in range(2019, int(FIM[:4]) + 1):
                    fim = min(FIM.replace('-', ''), f'{ano}1231')
                    url = f'https://legis.senado.leg.br/dadosabertos/senador/{codigo}/discursos.json?dataInicio={ano}0101&dataFim={fim}'
                    d = baixa(url, f'senado/{codigo}-discursos-{ano}.json')['DiscursosParlamentar']['Parlamentar']
                    for r in lista((d.get('Pronunciamentos') or {}).get('Pronunciamento')):
                        texto = r.get('TextoResumo') or ''; data = r['DataPronunciamento'][:10]
                        chave = r['CodigoPronunciamento']
                        if texto and INICIO <= data <= FIM and chave not in vistos:
                            vistos.add(chave); datas.append(data); conta(texto, cont, grafias)
            saida.append(resultado('senado', tipo, codigo, cont, grafias, datas))
        return idp, saida
    except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.IncompleteRead, json.JSONDecodeError) as e:
        log('falha Senado', codigo, type(e).__name__)
        if idp:
            for tipo in ('projetos', 'discursos'):
                if not any(f['id'] == f'senado-{tipo}' for f in saida):
                    saida.append(resultado('senado', tipo, codigo, Counter(), {}, [], 'erro'))
        return idp, saida


with ThreadPoolExecutor(8) as ex:
    tarefas = {ex.submit(discursos_camara, idd): 'camara' for idd in projetos}
    tarefas.update({ex.submit(textos_senado, s): 'senado' for s in senadores})
    # Quem não propôs projeto no período também pode ter discursado (ex.: suplente).
    votantes = duckdb.connect(str(RAIZ / 'banco/eleicoes_brasil.duckdb'), read_only=True)
    ids_periodo = {r[0] for r in votantes.execute('SELECT id_deputado FROM deputado_camara').fetchall()}
    votantes.close()
    tarefas.update({ex.submit(discursos_camara, idd): 'camara' for idd in ids_periodo & deputados.keys() - projetos.keys()})
    total = len(tarefas)
    for n, fut in enumerate(as_completed(tarefas), 1):
        idp, fontes = fut.result()
        if idp: publicado[idp].extend(fontes if isinstance(fontes, list) else [fontes])
        if n % 25 == 0 or n == total: log('textos parlamentares', n, 'de', total)

partes = {i: {} for i in range(64)}
ordem = {'camara-projetos': 0, 'camara-discursos': 1, 'senado-projetos': 2, 'senado-discursos': 3}
for idp, fontes in publicado.items():
    fontes.sort(key=lambda f: ordem[f['id']])
    partes[idp % 64][idp] = fontes
for i, d in partes.items(): grava(i, d)
info = {'gerado': date.today().isoformat(), 'inicio': INICIO, 'fim': FIM, 'pessoas': len(publicado),
        'pessoas_com_palavras': sum(any(f['palavras'] for f in fs) for fs in publicado.values()),
        'fontes': dict(Counter(f['id'] for fs in publicado.values() for f in fs if f['n'])),
        'documentos': dict(Counter({tipo: sum(f['n'] for fs in publicado.values() for f in fs if f['id'] == tipo) for tipo in ('camara-projetos', 'camara-discursos', 'senado-projetos', 'senado-discursos')})),
        'falhas': sum(f['estado'] != 'ok' for fs in publicado.values() for f in fs)}
grava('info', info)
(CACHE / 'resultado.json').write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')
log(json.dumps(info, ensure_ascii=False))
