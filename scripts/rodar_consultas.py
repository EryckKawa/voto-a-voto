"""Roda as 12 questões (scripts/consultas_brasil.sql) no banco nacional e salva
data/br/perguntas.json com o SQL de cada consulta, as colunas, as linhas e o tempo.

Uso: python scripts/rodar_consultas.py [caminho/eleicoes_brasil.duckdb] [só_estes_ids]
"""
import json, os, re, sys, time, datetime, decimal
import duckdb

AQUI = os.path.dirname(os.path.abspath(__file__))
BANCO = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/br/db/eleicoes_brasil.duckdb'
SO = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
SAIDA = os.path.join(AQUI, '..', 'data', 'br', 'perguntas.json')


def blocos(texto):
    """Separa o arquivo em blocos que começam com '-- @id | descrição'."""
    partes = re.split(r'^-- @(\w+) \| (.*)$', texto, flags=re.M)
    for i in range(1, len(partes), 3):
        sql = partes[i + 2].strip()
        sql = re.sub(r'\n-- =+.*', '', sql, flags=re.S).strip()
        yield partes[i], partes[i + 1].strip(), sql


def valor(v):
    if isinstance(v, decimal.Decimal):
        v = float(v)
    if isinstance(v, float):
        return round(v, 4)
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()
    return v


def main():
    texto = open(os.path.join(AQUI, 'consultas_brasil.sql'), encoding='utf-8').read()
    antigo, velho = {}, {}
    if SO and os.path.exists(SAIDA):
        velho = json.load(open(SAIDA, encoding='utf-8'))
        antigo = {c['id']: c for c in velho['consultas']}
    con = duckdb.connect(BANCO, read_only=True)
    con.execute("SET threads TO 4")
    saida = []
    for cid, desc, sql in blocos(texto):
        if SO and cid not in SO:
            if cid in antigo:
                saida.append(antigo[cid])
            continue
        t = time.time()
        cur = con.execute(sql)
        cols = [d[0] for d in cur.description]
        linhas = [[valor(v) for v in r] for r in cur.fetchall()]
        seg = round(time.time() - t, 2)
        print(f'{cid:5} {len(linhas):5} linhas  {seg:6.2f}s  {desc[:70]}', flush=True)
        saida.append({'id': cid, 'descricao': desc, 'sql': sql, 'colunas': cols, 'linhas': linhas, 'segundos': seg})
    # rodando só algumas consultas, o tamanho do banco continua o da última rodada completa
    tam = velho.get('tamanho') if SO and velho else {r[0]: r[1] for r in con.execute(
        "SELECT 'candidaturas', COUNT(*) FROM candidatura UNION ALL SELECT 'votos', COUNT(*) FROM votacao_candidato "
        "UNION ALL SELECT 'receitas', COUNT(*) FROM receita UNION ALL SELECT 'despesas', COUNT(*) FROM despesa "
        "UNION ALL SELECT 'municipios', COUNT(*) FROM municipio").fetchall()}
    banco = velho.get('banco', os.path.basename(BANCO)) if SO and velho else os.path.basename(BANCO)
    json.dump({'gerado': datetime.date.today().isoformat(), 'banco': banco, 'tamanho': tam, 'consultas': saida},
              open(SAIDA, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('salvo', SAIDA, os.path.getsize(SAIDA) // 1024, 'KB')


if __name__ == '__main__':
    main()
