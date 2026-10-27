# -*- coding: utf-8 -*-
"""
ETL de carga do banco eleicoes_g6 (DuckDB) a partir dos arquivos do TSE e do IBGE.
Grupo 5: CE, ES, MT, PR, SC, TO (+ BR para Presidente).
Saida: eleicoes_g6.duckdb na mesma pasta deste script. Espelha modelo_votacao_grupo6.sql
com tipos equivalentes do DuckDB.

Decisoes de carga:
- sq_candidato do TSE NAO e unico entre eleicoes (colide entre anos). A PK usa o
  sequencial achatado ANO*10^13 + slot_UF*10^12 + sequencial_original
  (slot_UF = codigo IBGE da UF, 0 para BR; sequenciais observados < 10^12).
- Arquivos _BRASIL (agregados de todos os estados) sao ignorados para nao duplicar
  os estados do grupo; _BR mantem as candidaturas a Presidente (sem fatos por zona).
- Conjuntos #NULO#/#NE#/-1 viram NULL; valores monetarios em decimal com virgula
  sao convertidos para float; datas DD/MM/YYYY viram DATE.
"""
import json
import re
import unicodedata
from datetime import date
from pathlib import Path

import duckdb
import pandas as pd

DADOS = Path(r"C:\Users\okaza\Downloads\BDR_Votacao\dados")
OUT = Path(__file__).resolve().parent
DB = OUT / "eleicoes_g6.duckdb"
LOG = OUT / "carga.log"

UFS = ["CE", "ES", "MT", "PR", "SC", "TO"]
UF_IBGE = {"BR": 0, "CE": 23, "ES": 32, "MT": 51, "PR": 41, "SC": 42, "TO": 17}
NM_UF = {"CE": ("Ceará", "Nordeste"), "ES": ("Espírito Santo", "Sudeste"),
         "MT": ("Mato Grosso", "Centro-Oeste"), "PR": ("Paraná", "Sul"),
         "SC": ("Santa Catarina", "Sul"), "TO": ("Tocantins", "Norte")}
CAPITAIS = {"CE": "FORTALEZA", "ES": "VITORIA", "MT": "CUIABA",
            "PR": "CURITIBA", "SC": "FLORIANOPOLIS", "TO": "PALMAS"}
NULOS = {"#NULO#", "#NE#", "#NI#", "-1", "", "NULL", "#NULL#", "...", "-", "…"}

log_lines = []
def log(msg):
    print(msg, flush=True)
    log_lines.append(str(msg))

def limpar(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return None if s.upper() in NULOS else s

def ints(v):
    v = limpar(v)
    if v is None:
        return None
    try:
        return int(float(v))
    except ValueError:
        return None

def sq_flat(ano, uf, sq):
    s = ints(sq)
    return None if s is None else int(ano) * 10**13 + UF_IBGE.get(uf, 0) * 10**12 + s

def decimal_br(v):
    v = limpar(v)
    if v is None:
        return None
    try:
        return float(v.replace(".", "").replace(",", "."))
    except ValueError:
        return None

def data_br(v):
    v = limpar(v)
    if v is None:
        return None
    try:
        return pd.to_datetime(v, format="%d/%m/%Y").date()
    except Exception:
        return None

def norm(nome):
    s = unicodedata.normalize("NFD", str(nome))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^A-Z0-9 ]", " ", s.upper())
    return re.sub(r"\s+", " ", s).strip()

def read_tse(path, usecols):
    head = pd.read_csv(path, sep=";", encoding="latin-1", dtype=str, nrows=0)
    cols = [c for c in usecols if c in head.columns]
    return pd.read_csv(path, sep=";", encoding="latin-1", dtype=str, usecols=cols)

def titular(v):
    t = limpar(v)
    if t is None:
        return None
    d = re.sub(r"\D", "", t)
    return str(int(d)) if 5 <= len(d) <= 13 else None

con = duckdb.connect(str(DB))

# ------------------------------------------------------------------ schema (equivalente DuckDB)
log("== criando schema ==")
DDL = """
CREATE TABLE uf (sg_uf VARCHAR(2) PRIMARY KEY, cd_uf_ibge TINYINT NOT NULL,
                 nm_uf VARCHAR(40) NOT NULL, nm_regiao VARCHAR(20) NOT NULL);
CREATE TABLE municipio (cd_municipio_tse INTEGER PRIMARY KEY, cd_municipio_ibge INTEGER UNIQUE,
                 nm_municipio VARCHAR(80) NOT NULL, sg_uf VARCHAR(2) NOT NULL REFERENCES uf(sg_uf),
                 fl_capital BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE indicador_municipio (cd_municipio_tse INTEGER NOT NULL REFERENCES municipio(cd_municipio_tse),
                 nr_ano_referencia SMALLINT NOT NULL, qt_populacao INTEGER,
                 vr_pib_mil_reais DECIMAL(16,2), vr_idhm DECIMAL(4,3),
                 PRIMARY KEY (cd_municipio_tse, nr_ano_referencia));
CREATE TABLE eleicao (id_eleicao SMALLINT PRIMARY KEY, nr_ano_eleicao SMALLINT NOT NULL,
                 tp_abrangencia VARCHAR(9) NOT NULL, dt_primeiro_turno DATE, dt_segundo_turno DATE,
                 ds_eleicao VARCHAR(120) NOT NULL, UNIQUE (nr_ano_eleicao, tp_abrangencia));
CREATE TABLE cargo (cd_cargo SMALLINT PRIMARY KEY, ds_cargo VARCHAR(40) NOT NULL);
CREATE TABLE grau_instrucao (cd_grau_instrucao TINYINT PRIMARY KEY, ds_grau_instrucao VARCHAR(40) NOT NULL,
                 nr_ordem TINYINT NOT NULL);
CREATE TABLE situacao_totalizacao (cd_sit_tot_turno SMALLINT PRIMARY KEY, ds_sit_tot_turno VARCHAR(40) NOT NULL,
                 fl_eleito BOOLEAN NOT NULL);
CREATE TABLE partido (id_partido SMALLINT PRIMARY KEY, nr_partido TINYINT NOT NULL,
                 sg_partido VARCHAR(20) NOT NULL, nm_partido VARCHAR(100) NOT NULL,
                 ds_espectro VARCHAR(16), UNIQUE (nr_partido, sg_partido));
CREATE TABLE coligacao (sq_coligacao BIGINT PRIMARY KEY, id_eleicao SMALLINT NOT NULL REFERENCES eleicao(id_eleicao),
                 nm_coligacao VARCHAR(200) NOT NULL, tp_agremiacao VARCHAR(30) NOT NULL,
                 ds_composicao VARCHAR(400));
CREATE TABLE pessoa (id_pessoa INTEGER PRIMARY KEY, nr_titulo_eleitoral VARCHAR(20) UNIQUE,
                 nm_pessoa VARCHAR(120) NOT NULL, dt_nascimento DATE, ds_genero VARCHAR(20), ds_cor_raca VARCHAR(20));
CREATE TABLE candidatura (sq_candidato BIGINT PRIMARY KEY, id_pessoa INTEGER NOT NULL REFERENCES pessoa(id_pessoa),
                 id_eleicao SMALLINT NOT NULL REFERENCES eleicao(id_eleicao),
                 cd_cargo SMALLINT NOT NULL REFERENCES cargo(cd_cargo),
                 id_partido SMALLINT NOT NULL REFERENCES partido(id_partido),
                 sq_coligacao BIGINT REFERENCES coligacao(sq_coligacao),
                 sg_uf VARCHAR(2) REFERENCES uf(sg_uf), cd_municipio_tse INTEGER REFERENCES municipio(cd_municipio_tse),
                 nr_candidato INTEGER NOT NULL, nm_urna VARCHAR(80) NOT NULL, nr_idade_posse TINYINT,
                 cd_grau_instrucao TINYINT REFERENCES grau_instrucao(cd_grau_instrucao),
                 cd_sit_tot_turno SMALLINT REFERENCES situacao_totalizacao(cd_sit_tot_turno),
                 st_reeleicao BOOLEAN, vr_despesa_max DECIMAL(14,2));
CREATE TABLE proposta_governo (sq_candidato BIGINT PRIMARY KEY REFERENCES candidatura(sq_candidato),
                 tx_proposta VARCHAR NOT NULL);
CREATE TABLE votacao_candidato (sq_candidato BIGINT NOT NULL REFERENCES candidatura(sq_candidato),
                 nr_turno TINYINT NOT NULL, cd_municipio_tse INTEGER NOT NULL REFERENCES municipio(cd_municipio_tse),
                 nr_zona SMALLINT NOT NULL, qt_votos_nominais INTEGER NOT NULL,
                 PRIMARY KEY (sq_candidato, nr_turno, cd_municipio_tse, nr_zona));
CREATE TABLE votacao_partido (id_eleicao SMALLINT NOT NULL REFERENCES eleicao(id_eleicao),
                 nr_turno TINYINT NOT NULL, cd_cargo SMALLINT NOT NULL REFERENCES cargo(cd_cargo),
                 id_partido SMALLINT NOT NULL REFERENCES partido(id_partido),
                 cd_municipio_tse INTEGER NOT NULL REFERENCES municipio(cd_municipio_tse),
                 nr_zona SMALLINT NOT NULL, qt_votos_nominais INTEGER NOT NULL, qt_votos_legenda INTEGER NOT NULL,
                 PRIMARY KEY (id_eleicao, nr_turno, cd_cargo, id_partido, cd_municipio_tse, nr_zona));
CREATE TABLE comparecimento (id_eleicao SMALLINT NOT NULL REFERENCES eleicao(id_eleicao),
                 nr_turno TINYINT NOT NULL, cd_cargo SMALLINT NOT NULL REFERENCES cargo(cd_cargo),
                 cd_municipio_tse INTEGER NOT NULL REFERENCES municipio(cd_municipio_tse),
                 nr_zona SMALLINT NOT NULL, qt_aptos INTEGER NOT NULL, qt_comparecimento INTEGER NOT NULL,
                 qt_abstencoes INTEGER NOT NULL, qt_votos_brancos INTEGER NOT NULL, qt_votos_nulos INTEGER NOT NULL,
                 PRIMARY KEY (id_eleicao, nr_turno, cd_cargo, cd_municipio_tse, nr_zona));
CREATE TABLE receita (id_receita BIGINT PRIMARY KEY, sq_candidato BIGINT NOT NULL REFERENCES candidatura(sq_candidato),
                 ds_fonte_receita VARCHAR(40) NOT NULL, ds_origem_receita VARCHAR(80) NOT NULL,
                 tp_doador VARCHAR(9) NOT NULL, nr_cpf_cnpj_doador VARCHAR(14), nm_doador VARCHAR(150),
                 cd_cnae_doador VARCHAR(10), fl_recurso_publico BOOLEAN NOT NULL,
                 vr_receita DECIMAL(14,2) NOT NULL, dt_receita DATE);
CREATE TABLE despesa (id_despesa BIGINT PRIMARY KEY, sq_candidato BIGINT NOT NULL REFERENCES candidatura(sq_candidato),
                 ds_origem_despesa VARCHAR(120) NOT NULL, ds_despesa VARCHAR(400),
                 nr_cpf_cnpj_fornecedor VARCHAR(14), nm_fornecedor VARCHAR(150),
                 vr_despesa DECIMAL(14,2) NOT NULL, dt_despesa DATE);
"""
con.execute(DDL)

def insert_df(table, df):
    df = df[[c for c in con.execute(
        f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}'"
    ).fetchall()[0][0:0] or list(df.columns)]]
    con.register("t_ins", df)
    con.execute(f"INSERT INTO {table} SELECT {','.join(df.columns)} FROM t_ins")
    con.unregister("t_ins")

# ------------------------------------------------------------------ uf / municipio
uf_df = pd.DataFrame([{"sg_uf": uf, "cd_uf_ibge": UF_IBGE[uf],
                       "nm_uf": NM_UF[uf][0], "nm_regiao": NM_UF[uf][1]} for uf in UFS])
insert_df("uf", uf_df)
log(f"uf: {len(uf_df)}")

log("== municipio ==")
ibge = json.load(open(DADOS / "ibge" / "municipios.json", encoding="utf-8"))

def uf_do_ibge(m):
    try:
        return m["microrregiao"]["mesorregiao"]["UF"]["sigla"]
    except (KeyError, TypeError):
        pass
    try:
        return m["regiao-imediata"]["regiao-intermediaria"]["UF"]["sigla"]
    except (KeyError, TypeError):
        return None

ibge_uf = {uf: {norm(m["nome"]): m["id"] for m in ibge if uf_do_ibge(m) == uf}
           for uf in UFS}

mun_rows = {}
for ano in [2018, 2020, 2022, 2024, 2026]:
    for uf in UFS:
        p = DADOS / f"votacao_candidato_{ano}" / f"votacao_candidato_munzona_{ano}_{uf}.csv"
        if p.exists():
            df = read_tse(p, ["CD_MUNICIPIO", "NM_MUNICIPIO"]).dropna()
            for cd, nm in zip(df["CD_MUNICIPIO"], df["NM_MUNICIPIO"]):
                cd_i = ints(cd)
                if cd_i and cd_i not in mun_rows:
                    mun_rows[cd_i] = (uf, str(nm).strip())
for ano in [2004, 2008, 2012, 2016, 2020, 2024]:
    for uf in UFS:
        p = DADOS / f"consulta_cand_{ano}" / f"consulta_cand_{ano}_{uf}.csv"
        if p.exists():
            df = read_tse(p, ["TP_ABRANGENCIA", "SG_UE", "NM_UE"]).dropna()
            df = df[df["TP_ABRANGENCIA"] == "MUNICIPAL"]
            for cd, nm in zip(df["SG_UE"], df["NM_UE"]):
                cd_i = ints(cd)
                if cd_i and cd_i not in mun_rows:
                    mun_rows[cd_i] = (uf, str(nm).strip())

OVERRIDES_TSE_IBGE = {73199: 1722107,   # Fortaleza do Tabocão (TO) -> Tabocão
                      91553: 5106652}   # Santo Antônio do Leverger (MT)
mun_list, nao_casados = [], []
for cd, (uf, nm) in sorted(mun_rows.items()):
    ib = ibge_uf[uf].get(norm(nm))
    if ib is None:
        nao_casados.append((cd, uf, nm))
    mun_list.append({"cd_municipio_tse": cd, "cd_municipio_ibge": ib, "nm_municipio": nm,
                     "sg_uf": uf, "fl_capital": norm(nm) == norm(CAPITAIS[uf])})
# overrides manuais so valem se o codigo IBGE ainda nao foi usado por outro codigo TSE
ja_usados = {r["cd_municipio_ibge"] for r in mun_list if r["cd_municipio_ibge"] is not None}
for cd, uf, nm in nao_casados:
    alvo = OVERRIDES_TSE_IBGE.get(cd)
    if alvo and alvo not in ja_usados:
        for r in mun_list:
            if r["cd_municipio_tse"] == cd:
                r["cd_municipio_ibge"] = alvo
                ja_usados.add(alvo)
insert_df("municipio", pd.DataFrame(mun_list))
log(f"municipio: {len(mun_list)} | sem casamento IBGE: {len(nao_casados)}")
for cd, uf, nm in nao_casados:
    log(f"   SEM IBGE: {cd} {uf} {nm}")

# ------------------------------------------------------------------ indicadores IBGE/Ipea
def sidra(fn):
    d = json.load(open(DADOS / "ibge" / fn, encoding="utf-8"))
    return {int(r["D1C"]): (float(r["V"]) if limpar(r["V"]) else None) for r in d[1:]
            if str(r["D1C"]).isdigit()}

pop21 = sidra("pop_est_2021.json")
pop22 = sidra("pop_censo2022.json")
pib21 = sidra("pib_2021.json")
ipea = json.load(open(r"C:\Users\okaza\AppData\Local\Temp\bdr\ipea_idhm_mun.json", encoding="utf-8"))["value"]
idhm10 = {int(r["TERCODIGO"]): float(r["VALVALOR"]) for r in ipea if r["VALDATA"][:4] == "2010"}

ind_list = []
for r in mun_list:
    ib = r["cd_municipio_ibge"]
    if ib is None:
        continue
    ind_list.append({"cd_municipio_tse": r["cd_municipio_tse"], "nr_ano_referencia": 2021,
                     "qt_populacao": pop21.get(ib), "vr_pib_mil_reais": None, "vr_idhm": None})
    ind_list.append({"cd_municipio_tse": r["cd_municipio_tse"], "nr_ano_referencia": 2022,
                     "qt_populacao": pop22.get(ib), "vr_pib_mil_reais": None, "vr_idhm": None})
    ind_list.append({"cd_municipio_tse": r["cd_municipio_tse"], "nr_ano_referencia": 2021,
                     "qt_populacao": None, "vr_pib_mil_reais": pib21.get(ib), "vr_idhm": None})
    ind_list.append({"cd_municipio_tse": r["cd_municipio_tse"], "nr_ano_referencia": 2010,
                     "qt_populacao": None, "vr_pib_mil_reais": None, "vr_idhm": idhm10.get(ib)})
ind_df = pd.DataFrame(ind_list).groupby(["cd_municipio_tse", "nr_ano_referencia"], as_index=False).max()
insert_df("indicador_municipio", ind_df)
log(f"indicador_municipio: {len(ind_df)}")

# ------------------------------------------------------------------ passada 1: consulta_cand
anos_cand = [2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026]
COLS = ["ANO_ELEICAO", "TP_ABRANGENCIA", "DT_ELEICAO", "DS_ELEICAO", "SG_UF", "SG_UE",
        "CD_CARGO", "DS_CARGO", "SQ_CANDIDATO", "NR_CANDIDATO", "NM_CANDIDATO",
        "NM_URNA_CANDIDATO", "TP_AGREMIACAO", "NR_PARTIDO", "SG_PARTIDO", "NM_PARTIDO",
        "SQ_COLIGACAO", "NM_COLIGACAO", "DS_COMPOSICAO_COLIGACAO", "DT_NASCIMENTO",
        "NR_TITULO_ELEITORAL_CANDIDATO", "DS_GENERO", "DS_COR_RACA", "CD_GRAU_INSTRUCAO",
        "DS_GRAU_INSTRUCAO", "CD_SIT_TOT_TURNO", "DS_SIT_TOT_TURNO", "NR_TURNO",
        "NR_IDADE_DATA_POSSE", "ST_REELEICAO", "VR_DESPESA_MAX_CAMPANHA"]

cargos, graus, sits, partidos, eleicoes, coligs = {}, {}, {}, {}, {}, {}
cand_frames = []
pessoas = {}          # chave -> dict attrs
pessoa_chave = {}     # sq_new -> chave de pessoa

for ano in anos_cand:
    for uf in UFS + ["BR"]:
        p = DADOS / f"consulta_cand_{ano}" / f"consulta_cand_{ano}_{uf}.csv"
        if not p.exists():
            continue
        df = read_tse(p, COLS)
        df["ANO_ELEICAO"] = ano
        # dimensoes
        for cd, ds in zip(df["CD_CARGO"], df["DS_CARGO"]):
            if limpar(cd):
                cargos[ints(cd)] = str(ds).strip()
        for cd, ds in zip(df["CD_GRAU_INSTRUCAO"], df["DS_GRAU_INSTRUCAO"]):
            if limpar(cd) and limpar(ds):
                graus[ints(cd)] = str(ds).strip()
        for cd, ds in zip(df["CD_SIT_TOT_TURNO"], df["DS_SIT_TOT_TURNO"]):
            if limpar(cd) and limpar(ds):
                sits[ints(cd)] = str(ds).strip()
        for nr, sg, nm in zip(df["NR_PARTIDO"], df["SG_PARTIDO"], df["NM_PARTIDO"]):
            if limpar(nr) and limpar(sg):
                partidos[(ints(nr), str(sg).strip())] = str(nm).strip()
        abr = "MUNICIPAL" if "MUNIC" in str(df["TP_ABRANGENCIA"].iloc[0]).upper() else "GERAL"
        prev = eleicoes.get((ano, abr))
        dts = [data_br(x) for x in df["DT_ELEICAO"].dropna()]
        dts = [x for x in dts if x]
        if prev is None:
            eleicoes[(ano, abr)] = (str(df["DS_ELEICAO"].iloc[0]).strip(),
                                    min(dts) if dts else None, max(dts) if dts else None)
        else:
            eleicoes[(ano, abr)] = (prev[0],
                                    min([x for x in [prev[1]] + dts if x]),
                                    max([x for x in [prev[2]] + dts if x]))
        if ano >= 2018:
            for s, nm, tp, comp in zip(df["SQ_COLIGACAO"], df["NM_COLIGACAO"],
                                       df["TP_AGREMIACAO"], df["DS_COMPOSICAO_COLIGACAO"]):
                s_i = ints(s)
                if s_i and s_i > 0:
                    coligs.setdefault((ano, s_i), (limpar(nm) or "", limpar(tp) or "", limpar(comp) or ""))

        # linhas de candidatura (uma por sq; fica a do maior turno)
        for r in df.itertuples(index=False):
            d = dict(zip(df.columns, r))
            sq = sq_flat(ano, uf, d.get("SQ_CANDIDATO"))
            if sq is None:
                continue
            turno = ints(d.get("NR_TURNO")) or 1
            titulo = titular(d.get("NR_TITULO_ELEITORAL_CANDIDATO"))
            chave = ("T", titulo) if titulo else ("S", str(sq))
            if chave[0] == "T":
                att = pessoas.setdefault(chave, {"nm": limpar(d.get("NM_CANDIDATO")),
                                                 "dt": data_br(d.get("DT_NASCIMENTO")),
                                                 "gen": limpar(d.get("DS_GENERO")),
                                                 "cor": limpar(d.get("DS_COR_RACA"))})
                for k, v in (("dt", data_br(d.get("DT_NASCIMENTO"))),
                             ("gen", limpar(d.get("DS_GENERO"))),
                             ("cor", limpar(d.get("DS_COR_RACA")))):
                    if v is not None and att.get(k) is None:
                        att[k] = v
            pessoa_chave[sq] = chave
            mun_cod = ints(d.get("SG_UE")) if abr == "MUNICIPAL" else None
            st_ree = limpar(d.get("ST_REELEICAO"))
            idade = ints(d.get("NR_IDADE_DATA_POSSE"))
            if idade is None and d.get("DT_NASCIMENTO") is not None:
                dt_n = data_br(d.get("DT_NASCIMENTO"))
                if dt_n:
                    posse = date(ano + 1, 1, 1)
                    idade = posse.year - dt_n.year - ((posse.month, posse.day) < (dt_n.month, dt_n.day))
            if idade is not None and not (15 <= idade <= 120):
                idade = None  # datas absurdas no TSE antigo (ex. 1058) viram NULL
            cand_frames.append((sq, chave, ano, abr, ints(d.get("CD_CARGO")),
                                (ints(d.get("NR_PARTIDO")), limpar(d.get("SG_PARTIDO"))),
                                ints(d.get("SQ_COLIGACAO")), uf if uf != "BR" else None,
                                mun_cod, ints(d.get("NR_CANDIDATO")),
                                limpar(d.get("NM_URNA_CANDIDATO")), idade,
                                ints(d.get("CD_GRAU_INSTRUCAO")), ints(d.get("CD_SIT_TOT_TURNO")),
                                (st_ree == "S") if st_ree else None,
                                decimal_br(d.get("VR_DESPESA_MAX_CAMPANHA")), turno))

# coligacoes tambem dos arquivos proprios (2018+)
for ano in [2018, 2020, 2022, 2024, 2026]:
    for uf in UFS + ["BR"]:
        p = DADOS / f"coligacao_{ano}" / f"consulta_coligacao_{ano}_{uf}.csv"
        if p.exists():
            df = read_tse(p, ["SQ_COLIGACAO", "NM_COLIGACAO", "TP_AGREMIACAO",
                              "DS_COMPOSICAO_COLIGACAO"])
            for s, nm, tp, comp in zip(df["SQ_COLIGACAO"], df["NM_COLIGACAO"],
                                       df["TP_AGREMIACAO"], df["DS_COMPOSICAO_COLIGACAO"]):
                s_i = ints(s)
                if s_i and s_i > 0:
                    coligs.setdefault((ano, s_i),
                                      (limpar(nm) or "", limpar(tp) or "", limpar(comp) or ""))

# votacao_partido tambem alimenta o dominio de partidos
for ano in [2018, 2020, 2022, 2024, 2026]:
    for uf in UFS:
        p = DADOS / f"votacao_partido_{ano}" / f"votacao_partido_munzona_{ano}_{uf}.csv"
        if p.exists():
            df = read_tse(p, ["NR_PARTIDO", "SG_PARTIDO", "NM_PARTIDO"]).dropna(subset=["NR_PARTIDO"])
            for nr, sg, nm in zip(df["NR_PARTIDO"], df["SG_PARTIDO"], df["NM_PARTIDO"]):
                if limpar(nr) and limpar(sg):
                    partidos.setdefault((ints(nr), str(sg).strip()), str(nm).strip())

log(f"consulta_cand: candidaturas brutas={len(cand_frames)} | cargos={len(cargos)} "
    f"graus={len(graus)} situações={len(sits)} partidos={len(partidos)} "
    f"eleições={len(eleicoes)} coligações={len(coligs)}")

# ------------------------------------------------------------------ dimensoes
ele_sorted = sorted(eleicoes, key=lambda k: (k[0], k[1]))
ele_map = {k: i + 1 for i, k in enumerate(ele_sorted)}
insert_df("eleicao", pd.DataFrame(
    [{"id_eleicao": ele_map[k], "nr_ano_eleicao": k[0], "tp_abrangencia": k[1],
      "dt_primeiro_turno": eleicoes[k][1], "dt_segundo_turno": eleicoes[k][2],
      "ds_eleicao": eleicoes[k][0][:120]} for k in ele_sorted]))

insert_df("cargo", pd.DataFrame(
    [{"cd_cargo": k, "ds_cargo": v} for k, v in sorted(cargos.items())]))

def ordem_grau(ds):
    d = ds.upper()
    if "ANALFABETO" in d: return 1
    if "LÊ E ESCREVE" in d or "LE E ESCREVE" in d: return 2
    if "5ª" in d and "INC" in d: return 3
    if "5ª" in d: return 5
    if "6º" in d or "9º" in d: return 6
    if "FUND" in d: return 7
    if "MÉDIO INCOMP" in d or "MEDIO INCOMP" in d: return 8
    if "MÉDIO" in d or "MEDIO" in d: return 9
    if "SUPERIOR INCOMP" in d: return 10
    if "PÓS" in d or "POS" in d: return 12
    if "SUPERIOR" in d: return 11
    return 4
insert_df("grau_instrucao", pd.DataFrame(
    [{"cd_grau_instrucao": k, "ds_grau_instrucao": v, "nr_ordem": ordem_grau(v)}
     for k, v in sorted(graus.items())]))

def fl_eleito(ds):
    d = ds.upper()
    return d.startswith("ELEITO") and not d.startswith("ELEITO N")
insert_df("situacao_totalizacao", pd.DataFrame(
    [{"cd_sit_tot_turno": k, "ds_sit_tot_turno": v, "fl_eleito": fl_eleito(v)}
     for k, v in sorted(sits.items())]))

ESPECTRO = {
    "PT": "ESQUERDA", "PSOL": "ESQUERDA", "PCDOB": "ESQUERDA", "PC DO B": "ESQUERDA",
    "PCB": "ESQUERDA", "PSTU": "ESQUERDA", "UP": "ESQUERDA", "PPL": "ESQUERDA",
    "PCO": "ESQUERDA",
    "PSB": "CENTRO-ESQUERDA", "PDT": "CENTRO-ESQUERDA", "PV": "CENTRO-ESQUERDA",
    "REDE": "CENTRO-ESQUERDA", "CIDADANIA": "CENTRO-ESQUERDA", "PPS": "CENTRO-ESQUERDA",
    "PROS": "CENTRO-ESQUERDA", "SOLIDARIEDADE": "CENTRO-ESQUERDA", "PGT": "CENTRO-ESQUERDA",
    "MDB": "CENTRO", "PMDB": "CENTRO", "PSDB": "CENTRO", "AVANTE": "CENTRO",
    "MOBILIZA": "CENTRO",
    "UNIÃO": "CENTRO-DIREITA", "UNIAO": "CENTRO-DIREITA", "PSD": "CENTRO-DIREITA",
    "DEM": "CENTRO-DIREITA", "PFL": "CENTRO-DIREITA", "PP": "CENTRO-DIREITA",
    "PPB": "CENTRO-DIREITA", "PTB": "CENTRO-DIREITA", "PL": "CENTRO-DIREITA",
    "PR": "CENTRO-DIREITA", "PRP": "CENTRO-DIREITA", "PRB": "CENTRO-DIREITA",
    "REPUBLICANOS": "CENTRO-DIREITA", "PSC": "CENTRO-DIREITA", "PTC": "CENTRO-DIREITA",
    "PMN": "CENTRO-DIREITA", "PHS": "CENTRO-DIREITA", "PTN": "CENTRO-DIREITA",
    "PODEMOS": "CENTRO-DIREITA", "PODE": "CENTRO-DIREITA", "PRD": "CENTRO-DIREITA",
    "SD": "CENTRO-DIREITA", "PAN": "CENTRO-DIREITA", "PATRIOTA": "CENTRO-DIREITA",
    "PATRI": "CENTRO-DIREITA", "PEN": "CENTRO-DIREITA", "PRTB": "CENTRO-DIREITA",
    "PMB": "CENTRO-DIREITA", "AGIR": "CENTRO-DIREITA", "DC": "CENTRO-DIREITA",
    "PSDC": "CENTRO-DIREITA", "PT DO B": "CENTRO-DIREITA",
    "NOVO": "DIREITA", "PRONA": "DIREITA", "PSL": "DIREITA",
}
p_sorted = sorted(partidos, key=lambda k: (k[0], k[1]))
p_map = {k: i + 1 for i, k in enumerate(p_sorted)}
par_df = pd.DataFrame([{"id_partido": p_map[k], "nr_partido": k[0], "sg_partido": k[1],
                        "nm_partido": partidos[k][:100],
                        "ds_espectro": ESPECTRO.get(k[1].upper())} for k in p_sorted])
insert_df("partido", par_df)
sem_esp = par_df[par_df["ds_espectro"].isna()]
log("partidos sem espectro: " + (", ".join(f"{r.nr_partido}/{r.sg_partido}"
                                           for r in sem_esp.itertuples()) or "(nenhum)"))

col_map = {}
col_rows = []
for (ano, s), (nm, tp, comp) in sorted(coligs.items()):
    abr = "MUNICIPAL" if ano in (2004, 2008, 2012, 2016, 2020, 2024) else "GERAL"
    col_map[(ano, s)] = s
    col_rows.append({"sq_coligacao": s, "id_eleicao": ele_map[(ano, abr)],
                     "nm_coligacao": (nm or f"AGREMBIACAO {s}")[:200],
                     "tp_agremiacao": (tp or "COLIGAÇÃO")[:30], "ds_composicao": (comp or None)})
insert_df("coligacao", pd.DataFrame(col_rows))
log(f"coligacao: {len(col_rows)}")

# ------------------------------------------------------------------ pessoa + candidatura
p_ids = {}
p_rows = []
for chave, att in pessoas.items():
    p_ids[chave] = len(p_ids) + 1
    p_rows.append({"id_pessoa": p_ids[chave],
                   "nr_titulo_eleitoral": chave[1] if chave[0] == "T" else None,
                   "nm_pessoa": (att["nm"] or "?")[:120], "dt_nascimento": att["dt"],
                   "ds_genero": att["gen"], "ds_cor_raca": att["cor"]})
# pessoas sem titulo (chave por sq): uma linha por candidatura
for i, tup in enumerate(cand_frames):
    chave = tup[1]
    if chave[0] == "S" and chave not in p_ids:
        p_ids[chave] = len(p_ids) + 1
        p_rows.append({"id_pessoa": p_ids[chave], "nr_titulo_eleitoral": None,
                       "nm_pessoa": "?", "dt_nascimento": None, "ds_genero": None,
                       "ds_cor_raca": None})
insert_df("pessoa", pd.DataFrame(p_rows))
log(f"pessoa: {len(p_rows)}")

# dedupe candidatura: manter maior turno por sq
best = {}
for tup in cand_frames:
    sq = tup[0]
    if sq not in best or tup[16] > best[sq][16]:
        best[sq] = tup
log(f"candidatura: brutas={len(cand_frames)} distintas={len(best)}")

c_rows, colig_faltando = [], 0
for tup in best.values():
    (sq, chave, ano, abr, cd_cargo, par, sqc, sguf, mun, nrc, nmurna, idade,
     grau, sit, ree, dmax, turno) = tup
    idp = p_map.get(par)
    colig_id = sqc if (sqc and (ano, sqc) in coligs) else None
    if sqc and sqc > 0 and colig_id is None:
        colig_faltando += 1
    c_rows.append({"sq_candidato": sq, "id_pessoa": p_ids[chave],
                   "id_eleicao": ele_map[(ano, abr)], "cd_cargo": cd_cargo,
                   "id_partido": idp, "sq_coligacao": colig_id, "sg_uf": sguf,
                   "cd_municipio_tse": mun, "nr_candidato": nrc or 0,
                   "nm_urna": (nmurna or "?")[:80], "nr_idade_posse": idade,
                   "cd_grau_instrucao": grau, "cd_sit_tot_turno": sit,
                   "st_reeleicao": ree, "vr_despesa_max": dmax})
insert_df("candidatura", pd.DataFrame(c_rows))
log(f"candidatura carregada: {len(c_rows)} | coligações sem registro: {colig_faltando}")

# ------------------------------------------------------------------ fatos de votacao
def fatos(ano, uf, pasta, padrao, colunas, transform):
    p = DADOS / pasta / padrao.format(ano=ano, uf=uf)
    if not p.exists():
        return None
    df = read_tse(p, colunas)
    out = transform(df, ano, uf)
    return out

vc_rows = []
for ano in [2018, 2020, 2022, 2024, 2026]:
    for uf in UFS:
        p = DADOS / f"votacao_candidato_{ano}" / f"votacao_candidato_munzona_{ano}_{uf}.csv"
        if not p.exists():
            continue
        df = read_tse(p, ["SQ_CANDIDATO", "NR_TURNO", "CD_MUNICIPIO", "NR_ZONA", "QT_VOTOS_NOMINAIS"])
        df = df.dropna(subset=["SQ_CANDIDATO", "CD_MUNICIPIO"])
        vcsq = [sq_flat(ano, uf, s) for s in df["SQ_CANDIDATO"]]
        for sq, t, m, z, q in zip(vcsq, df["NR_TURNO"], df["CD_MUNICIPIO"], df["NR_ZONA"],
                                  df["QT_VOTOS_NOMINAIS"]):
            if sq is None:
                continue
            vc_rows.append((sq, ints(t) or 1, ints(m), ints(z), ints(q) or 0))
vc_df = pd.DataFrame(vc_rows, columns=["sq_candidato", "nr_turno", "cd_municipio_tse",
                                       "nr_zona", "qt_votos_nominais"])
dups = vc_df.duplicated(subset=["sq_candidato", "nr_turno", "cd_municipio_tse", "nr_zona"]).sum()
vc_df = vc_df.drop_duplicates(subset=["sq_candidato", "nr_turno", "cd_municipio_tse", "nr_zona"])
insert_df("votacao_candidato", vc_df)
log(f"votacao_candidato: {len(vc_df)} (duplicados descartados: {dups})")

vp_rows = []
for ano in [2018, 2020, 2022, 2024, 2026]:
    for uf in UFS:
        p = DADOS / f"votacao_partido_{ano}" / f"votacao_partido_munzona_{ano}_{uf}.csv"
        if not p.exists():
            continue
        df = read_tse(p, ["NR_TURNO", "CD_CARGO", "NR_PARTIDO", "SG_PARTIDO",
                          "CD_MUNICIPIO", "NR_ZONA", "QT_VOTOS_NOMINAIS_VALIDOS",
                          "QT_VOTOS_LEGENDA_VALIDOS"])
        df = df.dropna(subset=["NR_PARTIDO", "CD_MUNICIPIO"])
        abr = "MUNICIPAL" if ano in (2020, 2024) else "GERAL"
        for t, cc, nr, sg, m, z, vn, vl in zip(
                df["NR_TURNO"], df["CD_CARGO"], df["NR_PARTIDO"], df["SG_PARTIDO"],
                df["CD_MUNICIPIO"], df["NR_ZONA"], df["QT_VOTOS_NOMINAIS_VALIDOS"],
                df["QT_VOTOS_LEGENDA_VALIDOS"]):
            idp = p_map.get((ints(nr), limpar(sg)))
            if idp is None:
                continue
            vp_rows.append((ele_map[(ano, abr)], ints(t) or 1, ints(cc), idp, ints(m),
                            ints(z), ints(vn) or 0, ints(vl) or 0))
vp_df = pd.DataFrame(vp_rows, columns=["id_eleicao", "nr_turno", "cd_cargo", "id_partido",
                                       "cd_municipio_tse", "nr_zona", "qt_votos_nominais",
                                       "qt_votos_legenda"])
dups = vp_df.duplicated(subset=vp_df.columns[:6]).sum()
vp_df = vp_df.drop_duplicates(subset=vp_df.columns[:6])
insert_df("votacao_partido", vp_df)
log(f"votacao_partido: {len(vp_df)} (duplicados descartados: {dups})")

cp_rows = []
for ano in [2018, 2020, 2022, 2024, 2026]:
    for uf in UFS:
        p = DADOS / f"detalhe_votacao_{ano}" / f"detalhe_votacao_munzona_{ano}_{uf}.csv"
        if not p.exists():
            continue
        df = read_tse(p, ["NR_TURNO", "CD_CARGO", "CD_MUNICIPIO", "NR_ZONA", "QT_APTOS",
                          "QT_COMPARECIMENTO", "QT_ABSTENCOES", "QT_VOTOS_BRANCOS", "QT_VOTOS_NULOS"])
        df = df.dropna(subset=["CD_MUNICIPIO"])
        abr = "MUNICIPAL" if ano in (2020, 2024) else "GERAL"
        for t, cc, m, z, ap, comp, ab, br, nu in zip(
                df["NR_TURNO"], df["CD_CARGO"], df["CD_MUNICIPIO"], df["NR_ZONA"],
                df["QT_APTOS"], df["QT_COMPARECIMENTO"], df["QT_ABSTENCOES"],
                df["QT_VOTOS_BRANCOS"], df["QT_VOTOS_NULOS"]):
            cp_rows.append((ele_map[(ano, abr)], ints(t) or 1, ints(cc), ints(m), ints(z),
                            ints(ap) or 0, ints(comp) or 0, ints(ab) or 0,
                            ints(br) or 0, ints(nu) or 0))
cp_df = pd.DataFrame(cp_rows, columns=["id_eleicao", "nr_turno", "cd_cargo", "cd_municipio_tse",
                                       "nr_zona", "qt_aptos", "qt_comparecimento", "qt_abstencoes",
                                       "qt_votos_brancos", "qt_votos_nulos"])
dups = cp_df.duplicated(subset=cp_df.columns[:5]).sum()
cp_df = cp_df.drop_duplicates(subset=cp_df.columns[:5])
insert_df("comparecimento", cp_df)
log(f"comparecimento: {len(cp_df)} (duplicados descartados: {dups})")

# ------------------------------------------------------------------ receitas e despesas
def tp_doador_de(origem, doc):
    o = (origem or "").upper()
    if "JURÍDICAS" in o or "JURIDICAS" in o:
        return "PJ"
    if "FÍSICAS" in o or "FISICAS" in o:
        return "PF"
    if "PRÓPRIOS" in o or "PROPRIOS" in o:
        return "CANDIDATO"
    if "PARTIDO" in o or "FUNDO" in o or "FEFC" in o:
        return "PARTIDO"
    if "OUTROS CANDIDATOS" in o or "COMITÊ" in o or "COMITE" in o:
        return "CANDIDATO" if "CANDIDATOS" in o else "OUTROS"
    d = re.sub(r"\D", "", doc or "")
    if len(d) == 11:
        return "PF"
    if len(d) == 14:
        return "PJ"
    return "OUTROS"

def fl_publico_de(fonte, origem):
    t = f"{fonte or ''} {origem or ''}".upper()
    return ("FUNDO" in t) or ("FEFC" in t) or ("ESPECIAL DE FINANCIAMENTO" in t)

def so_digitos(v):
    d = re.sub(r"\D", "", limpar(v) or "")
    return d[:14] or None

rc_rows, rc_fora = [], 0
for ano in [2018, 2020, 2022, 2024, 2026]:
    for uf in UFS:
        p = DADOS / f"contas_candidatos_{ano}" / f"receitas_candidatos_{ano}_{uf}.csv"
        if not p.exists():
            continue
        df = read_tse(p, ["SQ_CANDIDATO", "DS_FONTE_RECEITA", "DS_ORIGEM_RECEITA",
                          "NR_CPF_CNPJ_DOADOR", "NM_DOADOR", "CD_CNAE_DOADOR",
                          "VR_RECEITA", "DT_RECEITA"])
        for sq_r, fo, or_, doc, nm, cnae, vr, dt in zip(
                df["SQ_CANDIDATO"], df["DS_FONTE_RECEITA"], df["DS_ORIGEM_RECEITA"],
                df["NR_CPF_CNPJ_DOADOR"], df["NM_DOADOR"], df["CD_CNAE_DOADOR"],
                df["VR_RECEITA"], df["DT_RECEITA"]):
            sq = sq_flat(ano, uf, sq_r)
            if sq is None or sq not in best:
                rc_fora += 1
                continue
            rc_rows.append((sq, (limpar(fo) or "NÃO INFORMADO")[:40],
                            (limpar(or_) or "NÃO INFORMADO")[:80],
                            tp_doador_de(or_, doc), so_digitos(doc),
                            (limpar(nm) or None), (limpar(cnae) or None),
                            fl_publico_de(fo, or_), decimal_br(vr) or 0.0, data_br(dt)))

def col_de(df, *candidatos):
    for c in df.columns:
        cc = norm(c)
        for alvo in candidatos:
            if norm(alvo) == cc:
                return c
    return None

def ler_txt_fin(p):
    df = pd.read_csv(p, sep=";", encoding="latin-1", dtype=str)
    ren = {}
    ren[col_de(df, "Sequencial Candidato")] = "seq"
    ren[col_de(df, "UF")] = "uf"
    ren[col_de(df, "CPF/CNPJ do doador", "CPF/CNPJ do fornecedor")] = "doc"
    ren[col_de(df, "Nome do doador", "Nome do fornecedor")] = "nome"
    ren[col_de(df, "Cod setor econômico do doador")] = "cnae"
    ren[col_de(df, "Data da receita", "Data da despesa")] = "data"
    ren[col_de(df, "Valor receita", "Valor despesa")] = "valor"
    ren[col_de(df, "Tipo receita", "Tipo despesa")] = "tipo"
    ren[col_de(df, "Fonte recurso")] = "fonte"
    ren[col_de(df, "Descriçao da despesa", "Descricao da despesa")] = "descr"
    df = df.rename(columns=ren)
    return df

for ano in [2012, 2014]:
    for uf in UFS + ["BR"]:
        p = DADOS / f"contas_{ano}" / f"receitas_candidatos_{ano}_{uf}.txt"
        if not p.exists():
            continue
        df = ler_txt_fin(p)
        if "fonte" not in df.columns:
            df["fonte"] = "NÃO INFORMADO"
        for seq, fo, tp, doc, nm, cnae, vr, dt in zip(
                df["seq"], df["fonte"], df["tipo"], df["doc"], df["nome"],
                df.get("cnae", pd.Series([None] * len(df))), df["valor"], df["data"]):
            sq = sq_flat(ano, uf, seq)
            if sq is None or sq not in best:
                rc_fora += 1
                continue
            rc_rows.append((sq, (limpar(fo) or "NÃO INFORMADO")[:40],
                            (limpar(tp) or "NÃO INFORMADO")[:80],
                            tp_doador_de(tp, doc), so_digitos(doc), limpar(nm),
                            (limpar(cnae) or None), fl_publico_de(fo, tp),
                            decimal_br(vr) or 0.0, data_br(dt)))
rc_df = pd.DataFrame(rc_rows, columns=["sq_candidato", "ds_fonte_receita", "ds_origem_receita",
                                       "tp_doador", "nr_cpf_cnpj_doador", "nm_doador",
                                       "cd_cnae_doador", "fl_recurso_publico", "vr_receita",
                                       "dt_receita"])
rc_df.insert(0, "id_receita", range(1, len(rc_df) + 1))
insert_df("receita", rc_df)
log(f"receita: {len(rc_df)} | lançamentos sem candidatura: {rc_fora}")

dp_rows, dp_fora = [], 0
for ano in [2018, 2020, 2022, 2024, 2026]:
    for uf in UFS:
        p = DADOS / f"contas_candidatos_{ano}" / f"despesas_contratadas_candidatos_{ano}_{uf}.csv"
        if not p.exists():
            continue
        df = read_tse(p, ["SQ_CANDIDATO", "DS_ORIGEM_DESPESA", "DS_DESPESA",
                          "NR_CPF_CNPJ_FORNECEDOR", "NM_FORNECEDOR", "VR_DESPESA_CONTRATADA",
                          "DT_DESPESA"])
        for sq_r, or_, ds_, doc, nm, vr, dt in zip(
                df["SQ_CANDIDATO"], df["DS_ORIGEM_DESPESA"], df["DS_DESPESA"],
                df["NR_CPF_CNPJ_FORNECEDOR"], df["NM_FORNECEDOR"],
                df["VR_DESPESA_CONTRATADA"], df["DT_DESPESA"]):
            sq = sq_flat(ano, uf, sq_r)
            if sq is None or sq not in best:
                dp_fora += 1
                continue
            dp_rows.append((sq, (limpar(or_) or "NÃO INFORMADO")[:120],
                            limpar(ds_), so_digitos(doc), limpar(nm),
                            decimal_br(vr) or 0.0, data_br(dt)))
for ano in [2012, 2014]:
    for uf in UFS:
        p = DADOS / f"contas_{ano}" / f"despesas_candidatos_{ano}_{uf}.txt"
        if not p.exists():
            continue
        df = ler_txt_fin(p)
        if "descr" not in df.columns:
            df["descr"] = None
        for seq, tp, ds_, doc, nm, vr, dt in zip(
                df["seq"], df["tipo"], df["descr"], df["doc"], df["nome"],
                df["valor"], df["data"]):
            sq = sq_flat(ano, uf, seq)
            if sq is None or sq not in best:
                dp_fora += 1
                continue
            dp_rows.append((sq, (limpar(tp) or "NÃO INFORMADO")[:120], limpar(ds_),
                            so_digitos(doc), limpar(nm), decimal_br(vr) or 0.0, data_br(dt)))
dp_df = pd.DataFrame(dp_rows, columns=["sq_candidato", "ds_origem_despesa", "ds_despesa",
                                       "nr_cpf_cnpj_fornecedor", "nm_fornecedor",
                                       "vr_despesa", "dt_despesa"])
dp_df.insert(0, "id_despesa", range(1, len(dp_df) + 1))
insert_df("despesa", dp_df)
log(f"despesa: {len(dp_df)} | lançamentos sem candidatura: {dp_fora}")

# ------------------------------------------------------------------ views e verificacoes
con.execute("""
CREATE VIEW vw_candidatura_resumo AS
SELECT c.sq_candidato, e.nr_ano_eleicao, cg.ds_cargo, p.sg_partido, p.ds_espectro,
       c.sg_uf, c.cd_municipio_tse, st.fl_eleito, c.nr_idade_posse,
       COALESCE(r.vr_total, 0)   AS vr_receita_total,
       COALESCE(r.vr_publico, 0) AS vr_receita_publica,
       COALESCE(r.vr_privado, 0) AS vr_receita_privada,
       COALESCE(d.vr_total, 0)   AS vr_despesa_total
FROM candidatura c
JOIN eleicao e ON e.id_eleicao = c.id_eleicao
JOIN cargo cg ON cg.cd_cargo = c.cd_cargo
JOIN partido p ON p.id_partido = c.id_partido
LEFT JOIN situacao_totalizacao st ON st.cd_sit_tot_turno = c.cd_sit_tot_turno
LEFT JOIN (SELECT sq_candidato, SUM(vr_receita) vr_total,
                  SUM(CASE WHEN fl_recurso_publico THEN vr_receita ELSE 0 END) vr_publico,
                  SUM(CASE WHEN fl_recurso_publico THEN 0 ELSE vr_receita END) vr_privado
           FROM receita GROUP BY sq_candidato) r ON r.sq_candidato = c.sq_candidato
LEFT JOIN (SELECT sq_candidato, SUM(vr_despesa) vr_total
           FROM despesa GROUP BY sq_candidato) d ON d.sq_candidato = c.sq_candidato
""")
con.execute("""
CREATE VIEW vw_indicador_atual AS
SELECT m.cd_municipio_tse, m.nm_municipio, m.sg_uf,
       pop.qt_populacao, pib.vr_pib_mil_reais,
       ROUND(pib.vr_pib_mil_reais * 1000 / NULLIF(pop.qt_populacao, 0), 2) AS vr_pib_per_capita,
       idh.vr_idhm
FROM municipio m
LEFT JOIN indicador_municipio pop ON pop.cd_municipio_tse = m.cd_municipio_tse AND pop.nr_ano_referencia = 2022
LEFT JOIN indicador_municipio pib ON pib.cd_municipio_tse = m.cd_municipio_tse AND pib.nr_ano_referencia = 2021
LEFT JOIN indicador_municipio idh ON idh.cd_municipio_tse = m.cd_municipio_tse AND idh.nr_ano_referencia = 2010
""")
log("views criadas")

log("== verificacao de integridade ==")
for sql, nome in [
    ("SELECT COUNT(*) FROM candidatura c LEFT JOIN pessoa p ON p.id_pessoa=c.id_pessoa WHERE p.id_pessoa IS NULL", "candidatura sem pessoa"),
    ("SELECT COUNT(*) FROM votacao_candidato v LEFT JOIN candidatura c ON c.sq_candidato=v.sq_candidato WHERE c.sq_candidato IS NULL", "votacao sem candidatura"),
    ("SELECT COUNT(*) FROM votacao_candidato v LEFT JOIN municipio m ON m.cd_municipio_tse=v.cd_municipio_tse WHERE m.cd_municipio_tse IS NULL", "votacao sem municipio"),
    ("SELECT COUNT(*) FROM receita r LEFT JOIN candidatura c ON c.sq_candidato=r.sq_candidato WHERE c.sq_candidato IS NULL", "receita sem candidatura"),
    ("SELECT COUNT(*) FROM despesa d LEFT JOIN candidatura c ON c.sq_candidato=d.sq_candidato WHERE c.sq_candidato IS NULL", "despesa sem candidatura"),
    ("SELECT COUNT(*) FROM candidatura c LEFT JOIN coligacao g ON g.sq_coligacao=c.sq_coligacao WHERE c.sq_coligacao IS NOT NULL AND g.sq_coligacao IS NULL", "candidatura sem coligacao"),
    ("SELECT COUNT(*) FROM indicador_municipio i LEFT JOIN municipio m ON m.cd_municipio_tse=i.cd_municipio_tse WHERE m.cd_municipio_tse IS NULL", "indicador sem municipio"),
]:
    v = con.execute(sql).fetchone()[0]
    log(f"   {nome}: {v}")
for t in ["uf", "municipio", "indicador_municipio", "eleicao", "cargo", "grau_instrucao",
          "situacao_totalizacao", "partido", "coligacao", "pessoa", "candidatura",
          "votacao_candidato", "votacao_partido", "comparecimento", "receita", "despesa"]:
    n = con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    log(f"   {t}: {n} linhas")

con.execute("CHECKPOINT")
con.close()
with open(LOG, "w", encoding="utf-8") as f:
    f.write("\n".join(log_lines) + "\n")
log("FIM DO ETL")
