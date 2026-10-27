"""Monta o banco nacional (eleicoes_brasil.duckdb) do zero, no Windows ou no Linux, a partir da pasta baixada por baixar_brasil.ps1.

Uso:  python montar_banco.py [PASTA_BDR_VOTACAO] [ETAPA ...]
      PASTA_BDR_VOTACAO: padrão %USERPROFILE%/Downloads/BDR_Votacao (com brasil/partes, dados/ibge e propostas)
      ETAPA: munzona, banco, contas, extras (padrão: todas, nessa ordem). Cada etapa pula o que já está pronto.
O banco fica em PASTA/banco/eleicoes_brasil.duckdb e os temporários em PASTA/banco/tmp (variáveis BANCO e TMPBR mudam isso).
Depois: rodar_consultas.py, vies_cidades.py, ficha_politico.py e empacotar.py (ver docs/dados-e-banco.md)."""
import os, sys, glob, shutil, subprocess

AQUI = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
RAIZ = args.pop(0) if args and os.path.isdir(args[0]) else os.path.join(os.path.expanduser('~'), 'Downloads', 'BDR_Votacao')
ETAPAS = args or ['munzona', 'banco', 'contas', 'extras']
P = os.path.join(RAIZ, 'brasil', 'partes')
env = dict(os.environ)
env.setdefault('BANCO', os.path.join(RAIZ, 'banco', 'eleicoes_brasil.duckdb'))
env.setdefault('TMPBR', os.path.join(RAIZ, 'banco', 'tmp'))
env.setdefault('WEB', os.path.join(AQUI, '..', 'data', 'br'))
env.setdefault('IBGE', os.path.join(RAIZ, 'dados', 'ibge'))
env.setdefault('MEMORIA', '16GB')
env['PYTHONIOENCODING'] = 'utf-8'; env['PYTHONUTF8'] = '1'   # no Windows, open() sem encoding leria em cp1252
os.makedirs(os.path.join(env['TMPBR'], 'pq'), exist_ok=True)
ANOS = range(1994, 2027, 2)


def roda(*cmd):
    print('>>', ' '.join(cmd), flush=True)
    subprocess.run([sys.executable, *cmd], env=env, check=True)


def juntar(nome):
    """os arquivos grandes vêm cortados em partes de 300 MB (.zip.001, .002...): junta numa cópia em TMPBR"""
    partes = sorted(glob.glob(os.path.join(P, nome + '.zip.[0-9][0-9][0-9]')))
    if len(partes) <= 1: return partes[0] if partes else None
    alvo = os.path.join(env['TMPBR'], nome + '.zip')
    if not os.path.exists(alvo):
        with open(alvo + '.parcial', 'wb') as o:
            for p in partes:
                with open(p, 'rb') as a: shutil.copyfileobj(a, o)
        os.replace(alvo + '.parcial', alvo)
    return alvo


if 'munzona' in ETAPAS:   # votos por candidato e município, um parquet por ano
    for ano in ANOS:
        if os.path.exists(os.path.join(env['TMPBR'], 'pq', f'votos_{ano}.parquet')): continue
        z = juntar(f'votacao_candidato_munzona_{ano}')
        if z: roda(os.path.join(AQUI, 'processa_munzona.py'), str(ano), z)

BB = os.path.join(AQUI, 'banco_brasil.py')
if 'banco' in ETAPAS:
    roda(BB, P, 'base', 'cand', 'votos', 'partido_votos', 'comp')
if 'contas' in ETAPAS:
    roda(BB, P, 'contas', *map(str, range(2010, 2027, 2)))
if 'extras' in ETAPAS:
    roda(BB, P, 'propostas', 'camara', 'idhm', 'bens', 'eleitorado', 'notas', 'views')
