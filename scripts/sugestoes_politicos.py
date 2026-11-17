"""Sugestões da busca de políticos (#/politicos): três trilhas de nomes para a busca não abrir vazia.

  - os mais votados de 2022 (qualquer cargo, 1º turno);
  - os prefeitos eleitos em 2024 nas capitais com mais votos (e Teresina, a cidade do grupo);
  - quem mais venceu eleições de 1994 a 2026.

Cada nome sai no mesmo formato da busca (js/politico.js, V.buscaPoliticos):
  [id_pessoa, nome civil, nome na urna, último ano, último cargo, lugar, vitórias, maior votação, ano da foto, sequencial da foto]
O lugar segue scripts/ficha_politico.py: o código TSE da cidade (número) ou a sigla da UE ("BR", "PI"...).
Grava data/br/pol/sugestoes.js.

Uso: python scripts/sugestoes_politicos.py [caminho do banco]
"""
import json, os, sys
import duckdb

AQUI = os.path.dirname(os.path.abspath(__file__))
BANCO = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('BANCO', r'C:/Users/okaza/Downloads/BDR_Votacao/banco/eleicoes_brasil.duckdb')
con = duckdb.connect(BANCO, read_only=True)
TERESINA = 12190   # código TSE de Teresina

BASE = """
WITH vt AS (SELECT id_candidatura, SUM(qt_votos_nominais) FILTER (WHERE nr_turno = 1) v1, SUM(qt_votos_nominais) FILTER (WHERE nr_turno = 2) v2
            FROM votacao_candidato GROUP BY 1),
     c AS (SELECT c.*, e.nr_ano_eleicao ano, COALESCE(st.fl_eleito, false) eleito, vt.v1, vt.v2
           FROM candidatura c JOIN eleicao e USING (id_eleicao)
           LEFT JOIN situacao_totalizacao st ON st.id_situacao = c.id_situacao
           LEFT JOIN vt ON vt.id_candidatura = c.id_candidatura)
"""

mais_votados = [r[0] for r in con.execute(BASE + """
SELECT id_pessoa FROM c WHERE ano = 2022 AND v1 IS NOT NULL
GROUP BY id_pessoa ORDER BY MAX(v1) DESC LIMIT 6""").fetchall()]

capitais = con.execute(BASE + """
SELECT c.id_pessoa, c.cd_municipio_tse, GREATEST(COALESCE(c.v1, 0), COALESCE(c.v2, 0)) v
FROM c JOIN municipio m USING (cd_municipio_tse)
WHERE c.ano = 2024 AND c.cd_cargo = 11 AND c.eleito AND m.fl_capital
ORDER BY v DESC""").fetchall()
prefeitos = [r[0] for r in capitais[:5]] + [r[0] for r in capitais[5:] if r[1] == TERESINA][:1]

mais_vitorias = [r[0] for r in con.execute(BASE + """
SELECT id_pessoa FROM c GROUP BY id_pessoa
ORDER BY COUNT(*) FILTER (WHERE eleito) DESC, MAX(COALESCE(v1, 0)) DESC LIMIT 6""").fetchall()]

ids = list(dict.fromkeys(mais_votados + prefeitos + mais_vitorias))
lista = ",".join(map(str, ids))
linhas = con.execute(BASE + f"""
SELECT c.id_pessoa, p.nm_pessoa, c.nm_urna, c.ano, c.cd_cargo, c.cd_municipio_tse, c.sg_ue, c.eleito, c.v1, c.sq_candidato
FROM c JOIN pessoa p USING (id_pessoa) WHERE c.id_pessoa IN ({lista})
ORDER BY c.id_pessoa, c.ano, c.cd_cargo, c.id_candidatura""").fetchall()

norm = lambda t: (t or '').strip().upper()
pessoas = {}
for idp, nome, urna, ano, cargo, mun, ue, eleito, v1, sq in linhas:
    e = pessoas.setdefault(idp, {'nome': nome, 'urna': '', 'ano': 0, 'cargo': 0, 'lugar': None, 'vit': 0, 'votos': 0, 'foto': None})
    e.update(ano=int(ano), cargo=int(cargo), lugar=int(mun) if mun is not None else ue)
    if urna and norm(urna) != norm(nome): e['urna'] = urna
    e['vit'] += 1 if eleito else 0
    e['votos'] = max(e['votos'], int(v1 or 0))
    # foto do TSE que o site tem (data/br/fotos): presidente, governador e senador de 2010 a 2022, prefeito em 2024
    if sq and ano in (2010, 2014, 2018, 2022, 2024) and (cargo in (1, 3, 5) or (ano == 2024 and cargo == 11)): e['foto'] = [int(ano), int(sq)]

item = lambda i: (lambda e: [i, e['nome'], e['urna'], e['ano'], e['cargo'], e['lugar'], e['vit'], e['votos']] + (e['foto'] or [None, None]))(pessoas[i])
saida = {'trilhas': [
    {'tit': 'Os mais votados de 2022', 'nomes': [item(i) for i in mais_votados]},
    {'tit': 'Prefeitos eleitos nas capitais em 2024', 'nomes': [item(i) for i in prefeitos]},
    {'tit': 'Quem mais venceu eleições desde 1994', 'nomes': [item(i) for i in mais_vitorias]},
]}
arq = os.path.join(AQUI, '..', 'data', 'br', 'pol', 'sugestoes.js')
with open(arq, 'w', encoding='utf-8') as f:
    f.write('(window.__D=window.__D||{})["br/pol/sugestoes"]=' + json.dumps(saida, ensure_ascii=False, separators=(',', ':')) + ';\n')
for t in saida['trilhas']:
    print(t['tit'], [n[2] or n[1] for n in t['nomes']])
