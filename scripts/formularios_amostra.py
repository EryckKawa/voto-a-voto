"""Amostra do banco nacional para a página de formulários e relatórios (#/formularios).

Tira do eleicoes_brasil.duckdb as eleições municipais de 2020 e 2024 de uma cidade (Teresina, por padrão), com as
mesmas tabelas e chaves do modelo relacional: uf, municipio, eleicao, cargo, partido, grau_instrucao,
situacao_totalizacao, pessoa, candidatura e votacao_candidato (somada por candidatura e turno). Grava
data/br/form/base.json (e o .js para abrir sem servidor). A página aplica INSERT, UPDATE e DELETE sobre essa amostra
no navegador, com as mesmas restrições do banco (chave primária, única, estrangeira e de verificação).

O título de eleitor não vai para o site: a pessoa ganha um título fictício, só para mostrar a restrição UNIQUE.

Uso: python scripts/formularios_amostra.py caminho/eleicoes_brasil.duckdb [cd_municipio_ibge]
"""
import json, os, sys
import duckdb

BANCO = sys.argv[1]
IBGE = int(sys.argv[2]) if len(sys.argv) > 2 else 2211001   # Teresina
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, '..', 'data', 'br', 'form', 'base.json')

con = duckdb.connect(BANCO, read_only=True)
tse, nome, uf = con.execute("SELECT cd_municipio_tse, nm_municipio, sg_uf FROM municipio WHERE cd_municipio_ibge = ?", [IBGE]).fetchone()


def tab(sql, *p):
    cur = con.execute(sql, list(p))
    cols = [d[0] for d in cur.description]
    linhas = [[(v.isoformat() if hasattr(v, 'isoformat') else float(v) if type(v).__name__ == 'Decimal' else v) for v in r] for r in cur.fetchall()]
    return {'colunas': cols, 'linhas': linhas}


cand = f"""SELECT c.* FROM candidatura c JOIN eleicao e ON e.id_eleicao = c.id_eleicao
           WHERE c.cd_municipio_tse = {tse} AND e.nr_ano_eleicao IN (2020, 2024) AND c.cd_cargo IN (11, 13)"""
base = {
    'cidade': {'nome': nome, 'uf': uf, 'cd_municipio_tse': tse},
    'uf': tab("SELECT sg_uf, nm_uf, nm_regiao FROM uf ORDER BY sg_uf"),
    'municipio': tab("SELECT cd_municipio_tse, cd_municipio_ibge, nm_municipio, sg_uf, fl_capital FROM municipio WHERE sg_uf = ? ORDER BY nm_municipio", uf),
    'eleicao': tab("SELECT id_eleicao, nr_ano_eleicao, tp_abrangencia, ds_eleicao FROM eleicao WHERE nr_ano_eleicao IN (2020, 2024) ORDER BY 1"),
    'cargo': tab("SELECT cd_cargo, ds_cargo FROM cargo WHERE cd_cargo IN (11, 13) ORDER BY 1"),
    'grau_instrucao': tab("SELECT cd_grau_instrucao, ds_grau_instrucao FROM grau_instrucao WHERE nr_ordem > 0 ORDER BY nr_ordem"),
    'situacao_totalizacao': tab("SELECT id_situacao, ds_sit_tot_turno, fl_eleito FROM situacao_totalizacao WHERE ds_sit_tot_turno NOT LIKE '#%' ORDER BY 2"),
    'partido': tab(f"SELECT DISTINCT p.id_partido, p.nr_partido, p.sg_partido, p.nm_partido FROM partido p JOIN ({cand}) c ON c.id_partido = p.id_partido ORDER BY p.sg_partido"),
    # título fictício (o verdadeiro não sai do banco): 9 dígitos a partir do id
    'pessoa': tab(f"""SELECT DISTINCT ps.id_pessoa, ps.nm_pessoa, ps.dt_nascimento, ps.ds_genero, lpad(CAST(100000000 + ps.id_pessoa AS VARCHAR), 12, '0') AS nr_titulo_ficticio
                      FROM pessoa ps JOIN ({cand}) c ON c.id_pessoa = ps.id_pessoa ORDER BY ps.nm_pessoa"""),
    'candidatura': tab(f"""SELECT c.id_candidatura, c.id_pessoa, c.id_eleicao, c.cd_cargo, c.id_partido, c.cd_municipio_tse, c.nr_candidato, c.nm_urna,
                           c.nr_idade_posse, CASE WHEN c.cd_grau_instrucao > 0 THEN c.cd_grau_instrucao END AS cd_grau_instrucao, c.id_situacao
                           FROM ({cand}) c ORDER BY c.id_eleicao, c.cd_cargo, c.nm_urna"""),
    'votacao_candidato': tab(f"""SELECT v.id_candidatura, v.nr_turno, SUM(v.qt_votos_nominais)::INTEGER AS qt_votos
                                 FROM votacao_candidato v JOIN ({cand}) c ON c.id_candidatura = v.id_candidatura GROUP BY 1, 2 ORDER BY 1, 2"""),
}
os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
txt = json.dumps(base, ensure_ascii=False, separators=(',', ':'))
open(SAIDA, 'w', encoding='utf-8').write(txt)
open(SAIDA[:-5] + '.js', 'w', encoding='utf-8', newline='\n').write('(window.__D=window.__D||{})["br/form/base"]=' + txt + ';\n')
print(nome, uf, {k: len(v['linhas']) for k, v in base.items() if isinstance(v, dict) and 'linhas' in v}, os.path.getsize(SAIDA) // 1024, 'KB')
