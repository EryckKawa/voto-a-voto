# -*- coding: utf-8 -*-
"""Carga suplementar: fatos de PRESIDENTE por municipio/zona, que estao apenas nos
arquivos _BR (os arquivos por UF nao trazem o cargo PRESIDENTE).
Filtra os 1.237 municipios do Grupo 5 e usa sq_flat com slot BR (=0), igual ao ETL.
"""
import re
from pathlib import Path

import duckdb
import pandas as pd

DADOS = Path(r"C:\Users\okaza\Downloads\BDR_Votacao\dados")
OUT = Path(__file__).resolve().parent
NULOS = {"#NULO#", "#NE#", "#NI#", "-1", "", "NULL", "#NULL#"}

def ints(v):
    s = str(v).strip()
    if s.upper() in NULOS:
        return None
    try:
        return int(float(s))
    except ValueError:
        return None

def sq_flat(ano, slot, sq):
    s = ints(sq)
    return None if s is None else int(ano) * 10**13 + slot * 10**12 + s

con = duckdb.connect(str(OUT / "eleicoes_g6.duckdb"))
munis = set(r[0] for r in con.execute("SELECT cd_municipio_tse FROM municipio").fetchall())
elei = {(r[0], r[1]): r[2] for r in con.execute(
    "SELECT nr_ano_eleicao, tp_abrangencia, id_eleicao FROM eleicao").fetchall()}
pari = {(r[0], r[1]): r[2] for r in con.execute(
    "SELECT nr_partido, sg_partido, id_partido FROM partido").fetchall()}

for ano in [2018, 2020, 2022, 2024, 2026]:
    id_e = elei.get((ano, "GERAL"))
    if id_e is None:
        continue

    # --- votacao_candidato (presidente por muni/zona)
    try:
        p = DADOS / f"votacao_candidato_{ano}" / f"votacao_candidato_munzona_{ano}_BR.csv"
        if p.exists():
            df = pd.read_csv(p, sep=";", encoding="latin-1", dtype=str,
                             usecols=["SQ_CANDIDATO", "NR_TURNO", "CD_MUNICIPIO", "NR_ZONA",
                                      "QT_VOTOS_NOMINAIS"])
            if "SQ_CANDIDATO" not in df.columns:
                print(f"{ano}: votacao BR sem SQ_CANDIDATO, pulando")
            else:
                df = df[df["CD_MUNICIPIO"].map(lambda x: ints(x) in munis)]
                df = df.dropna(subset=["SQ_CANDIDATO"])
                rows = []
                for s, t, m, z, q in zip(df["SQ_CANDIDATO"], df["NR_TURNO"], df["CD_MUNICIPIO"],
                                         df["NR_ZONA"], df["QT_VOTOS_NOMINAIS"]):
                    sq = sq_flat(ano, 0, s)
                    if sq is not None:
                        rows.append((sq, ints(t) or 1, ints(m), ints(z), ints(q) or 0))
                ins = pd.DataFrame(rows, columns=["sq_candidato", "nr_turno", "cd_municipio_tse",
                                                  "nr_zona", "qt_votos_nominais"])
                ins = ins.drop_duplicates(subset=["sq_candidato", "nr_turno", "cd_municipio_tse",
                                                  "nr_zona"])
                con.register("t_br", ins)
                con.execute("INSERT OR IGNORE INTO votacao_candidato SELECT * FROM t_br")
                con.unregister("t_br")
                print(f"{ano}: votacao BR +{len(ins)}")
    except Exception as e:
        print(f"{ano}: votacao BR ERRO: {e}")

    # --- votacao_partido (presidente por muni/zona)
    p = DADOS / f"votacao_partido_{ano}" / f"votacao_partido_munzona_{ano}_BR.csv"
    if p.exists():
        df = pd.read_csv(p, sep=";", encoding="latin-1", dtype=str,
                         usecols=["NR_TURNO", "CD_CARGO", "NR_PARTIDO", "SG_PARTIDO",
                                  "CD_MUNICIPIO", "NR_ZONA", "QT_VOTOS_NOMINAIS_VALIDOS",
                                  "QT_VOTOS_LEGENDA_VALIDOS"])
        df = df[df["CD_MUNICIPIO"].map(lambda x: ints(x) in munis)]
        df["SG_PARTIDO"] = df["SG_PARTIDO"].fillna("")
        rows = []
        for t, cc, nr, sg, m, z, vn, vl in zip(
                df["NR_TURNO"], df["CD_CARGO"], df["NR_PARTIDO"], df["SG_PARTIDO"],
                df["CD_MUNICIPIO"], df["NR_ZONA"], df["QT_VOTOS_NOMINAIS_VALIDOS"],
                df["QT_VOTOS_LEGENDA_VALIDOS"]):
            idp = pari.get((ints(nr), sg.strip()))
            if idp is None:
                continue
            rows.append((id_e, ints(t) or 1, ints(cc), idp, ints(m), ints(z),
                         ints(vn) or 0, ints(vl) or 0))
        ins = pd.DataFrame(rows, columns=["id_eleicao", "nr_turno", "cd_cargo", "id_partido",
                                          "cd_municipio_tse", "nr_zona", "qt_votos_nominais",
                                          "qt_votos_legenda"])
        ins = ins.drop_duplicates(subset=list(ins.columns[:6]))
        con.register("t_br", ins)
        con.execute("INSERT OR IGNORE INTO votacao_partido SELECT * FROM t_br")
        con.unregister("t_br")
        print(f"{ano}: votacao_partido BR +{len(ins)}")

    # --- comparecimento (presidente por muni/zona)
    p = DADOS / f"detalhe_votacao_{ano}" / f"detalhe_votacao_munzona_{ano}_BR.csv"
    if p.exists():
        df = pd.read_csv(p, sep=";", encoding="latin-1", dtype=str,
                         usecols=["NR_TURNO", "CD_CARGO", "CD_MUNICIPIO", "NR_ZONA", "QT_APTOS",
                                  "QT_COMPARECIMENTO", "QT_ABSTENCOES", "QT_VOTOS_BRANCOS",
                                  "QT_VOTOS_NULOS"])
        df = df[df["CD_MUNICIPIO"].map(lambda x: ints(x) in munis)]
        rows = []
        for t, cc, m, z, ap, comp, ab, br, nu in zip(
                df["NR_TURNO"], df["CD_CARGO"], df["CD_MUNICIPIO"], df["NR_ZONA"],
                df["QT_APTOS"], df["QT_COMPARECIMENTO"], df["QT_ABSTENCOES"],
                df["QT_VOTOS_BRANCOS"], df["QT_VOTOS_NULOS"]):
            rows.append((id_e, ints(t) or 1, ints(cc), ints(m), ints(z), ints(ap) or 0,
                         ints(comp) or 0, ints(ab) or 0, ints(br) or 0, ints(nu) or 0))
        ins = pd.DataFrame(rows, columns=["id_eleicao", "nr_turno", "cd_cargo",
                                          "cd_municipio_tse", "nr_zona", "qt_aptos",
                                          "qt_comparecimento", "qt_abstencoes",
                                          "qt_votos_brancos", "qt_votos_nulos"])
        ins = ins.drop_duplicates(subset=list(ins.columns[:5]))
        con.register("t_br", ins)
        con.execute("INSERT OR IGNORE INTO comparecimento SELECT * FROM t_br")
        con.unregister("t_br")
        print(f"{ano}: comparecimento BR +{len(ins)}")

print("verificacao FK votacao:", con.execute("""
SELECT COUNT(*) FROM votacao_candidato v LEFT JOIN candidatura c
ON c.sq_candidato=v.sq_candidato WHERE c.sq_candidato IS NULL""").fetchone()[0])
con.execute("CHECKPOINT")
con.close()
print("OK")
