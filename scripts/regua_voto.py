"""Régua pelo voto: posição dos partidos a partir das orientações de bancada no Plenário da Câmara (2019-2026).

Uso: python regua_voto.py PASTA_CAMARA SAIDA.json [ideologia.json de Harvard]
Lê votacoesOrientacoes-*.csv e votacoes-*.csv (dadosabertos.camara.leg.br).
- Só votações de mérito (fora requerimentos, recursos e preferências).
- Sim = +1, Não e Obstrução = -1, Liberado = sem posição.
- Bloco sem linha própria do partido: o partido herda a orientação do bloco.
- Em cada governo (Bolsonaro 2019-22, Lula 2023-26): concordância entre partidos -> escalonamento (MDS clássico),
  1ª dimensão, de -1 (mais à esquerda) a +1 (mais à direita).
- nota = média dos dois governos; governismo = % de votos iguais à orientação do líder do Governo.
"""
import sys, glob, re, json
import numpy as np, pandas as pd

PASTA, SAIDA = sys.argv[1], sys.argv[2]
NOME = {"PT": "PT", "PL": "PL", "PR": "PL", "PSB": "PSB", "NOVO": "NOVO", "PDT": "PDT", "PSOL": "PSOL", "PCDOB": "PCdoB",
        "PSDB": "PSDB", "PSD": "PSD", "PROS": "PROS", "PV": "PV", "PP": "PP", "PSC": "PSC", "SOLIDARIED": "SOLIDARIEDADE",
        "SOLIDARIEDADE": "SOLIDARIEDADE", "SD": "SOLIDARIEDADE", "SOLID": "SOLIDARIEDADE", "MDB": "MDB", "PTB": "PTB", "PSL": "PSL",
        "DEM": "DEM", "PODEMOS": "PODEMOS", "PODE": "PODEMOS", "AVANTE": "AVANTE", "AVAN": "AVANTE", "PATRIOTA": "PATRIOTA",
        "PATRI": "PATRIOTA", "REPUBLICAN": "REPUBLICANOS", "REPUBLICANOS": "REPUBLICANOS", "PRB": "REPUBLICANOS", "REP": "REPUBLICANOS",
        "REDE": "REDE", "CIDADANIA": "CIDADANIA", "PPS": "CIDADANIA", "CID": "CIDADANIA", "UNIÃO": "UNIÃO", "UNI": "UNIÃO",
        "MISSÃO": "MISSÃO", "PRD": "PRD", "PMN": "PMN", "PHS": "PHS", "PPL": "PPL", "PRP": "PRP", "DC": "DC"}
FED = {"PT": ["PCdoB", "PV"], "PSOL": ["REDE"], "PSDB": ["CIDADANIA"]}


def partidos(b):
    """'PSD' -> ['PSD']; 'Fdr PT-PCdoB-PV' -> 3; 'Bl UniPpFdrPsdbCid...' -> membros legíveis."""
    b = b.strip()
    if b.upper() in NOME:
        return [NOME[b.upper()]], False
    if b.startswith("Fdr "):
        return [NOME[x.upper()] for x in b[4:].split("-") if x.upper() in NOME], True
    s = re.sub(r"^(Bl|Bloco)\s*", "", b).replace("...", "").replace("PT", "Pt").replace("PSDB", "Psdb")
    toks = re.findall(r"[A-Z][a-zçãé]*", s)
    out, fdr = [], "Fdr" in toks
    for t in toks:
        if t.upper() in NOME:
            out.append(NOME[t.upper()])
    if fdr:
        for p in list(out):
            out += FED.get(p, [])
    return sorted(set(out)), True


o = pd.concat([pd.read_csv(f, sep=";", encoding="utf-8-sig", dtype=str) for f in sorted(glob.glob(PASTA + "/votacoesOrientacoes-*.csv"))])
v = pd.concat([pd.read_csv(f, sep=";", encoding="utf-8-sig", dtype=str, usecols=["id", "data"]) for f in sorted(glob.glob(PASTA + "/votacoes-*.csv"))])
o = o[o.siglaOrgao == "PLEN"].merge(v.drop_duplicates("id").rename(columns={"id": "idVotacao"}), on="idVotacao")
proc = o.descricao.fillna("").str.contains(r"[Rr]equerimento|[Rr]ecurso|[Pp]refer[êe]ncia|Redação Final", regex=True)
o = o[~proc]
o["val"] = o.orientacao.map({"Sim": 1, "Não": -1, "Obstrução": -1})
o["per"] = np.where(o.data < "2023-01-01", "bol", "lula")

gov = o[o.siglaBancada.isin(["Governo", "GOV."])].dropna(subset=["val"]).drop_duplicates("idVotacao").set_index("idVotacao").val
linhas = []
for r in o.dropna(subset=["val"]).itertuples():
    if r.siglaBancada in ("Governo", "GOV.", "Minoria", "Maioria", "Oposição"):
        continue
    ps, bloco = partidos(r.siglaBancada)
    for p in ps:
        linhas.append((r.idVotacao, r.per, p, r.val, bloco))
L = pd.DataFrame(linhas, columns=["vot", "per", "p", "val", "bloco"]).sort_values("bloco")  # linha própria vence o bloco
L = L.drop_duplicates(["vot", "p"])

res, nvot = {}, {}
for per in ("bol", "lula"):
    M = L[L.per == per].pivot(index="vot", columns="p", values="val")
    M = M.loc[:, M.notna().sum() >= 60]
    ps = list(M.columns)
    X = M.values
    n = len(ps)
    A = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            ok = ~np.isnan(X[:, i]) & ~np.isnan(X[:, j])
            A[i, j] = (X[ok, i] == X[ok, j]).mean() if ok.sum() >= 20 else np.nan
    A = np.where(np.isnan(A), np.nanmean(A), A)
    D2 = (1 - A) ** 2
    J = np.eye(n) - 1 / n
    B = -0.5 * J @ D2 @ J
    w, U = np.linalg.eigh(B)
    x = U[:, -1] * np.sqrt(w[-1])
    if x[ps.index("PSOL")] > 0:
        x = -x
    x = -1 + 2 * (x - x.min()) / (x.max() - x.min())
    expl = w[-1] / w[w > 0].sum()
    nvot[per] = int(len(M))
    print(per, "votações:", len(M), "dim1 explica", round(100 * expl), "%")
    for p, xi in zip(ps, x):
        g = M[p].dropna()
        gg = gov.reindex(g.index).dropna()
        res.setdefault(p, {})[per] = round(float(xi), 3)
        res[p]["n_" + per] = int(len(g))
        if len(gg) >= 20:
            res[p]["gov_" + per] = round(float(100 * (g.reindex(gg.index) == gg).mean()), 1)

dois = {p: r for p, r in res.items() if "bol" in r and "lula" in r}
for p, r in res.items():
    if p in dois:
        r["nota"] = round((r["bol"] + r["lula"]) / 2, 3)
        continue
    # votou só num governo: a posição vem puxada por quem governava. Usamos a nota média dos 3 partidos
    # que, naquele mesmo governo, votavam mais parecido com ele.
    per = "bol" if "bol" in r else "lula"
    viz = sorted(dois, key=lambda q: abs(dois[q][per] - r[per]))[:3]
    r["nota"] = round(float(np.mean([dois[q]["bol"] / 2 + dois[q]["lula"] / 2 for q in viz])), 3)
    r["um_governo"] = per
    r["vizinhos"] = viz

# mesma forma de data/br/ideologia.json (anos -> sigla do TSE -> [nota, estimada, fonte]); quem não vota na Câmara fica com Harvard
TSE = {"PC do B": "PCdoB", "PCDOB": "PCdoB", "PODE": "PODEMOS", "PATRI": "PATRIOTA", "PR": "PL", "PRB": "REPUBLICANOS", "PPS": "CIDADANIA", "SD": "SOLIDARIEDADE", "PMDB": "MDB"}
H = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {"anos": {}}

# Calibração: o escalonamento põe o partido mais à esquerda da Câmara em −1 e o mais à direita em +1, o que
# faria o PSOL e o PT parecerem "extremos" só por serem os mais à esquerda daquela Câmara. Para usar a mesma
# régua de Harvard (onde −1 e +1 são extremos teóricos), fazemos uma regressão linear da nota pelo voto sobre a
# nota de Harvard (onda 2021) nos partidos medidos pelas duas e que votaram nos dois governos. A ordem e as
# distâncias relativas entre partidos não mudam; só a escala.
H24 = H["anos"].get("2024", {})
def harvard24(p):   # nota de Harvard da sigla do TSE que corresponde ao partido da Câmara (só as medidas, não estimadas)
    for sg in [p] + [k for k, v in TSE.items() if v == p]:
        if sg in H24 and H24[sg][0] is not None and not H24[sg][1]:
            return H24[sg][0]
pares = [(r["nota"], harvard24(p)) for p, r in dois.items() if harvard24(p) is not None]
cal = None
if len(pares) >= 8:
    xs, ys = zip(*pares)
    b_, a_ = np.polyfit(xs, ys, 1)
    cal = {"a": round(float(a_), 4), "b": round(float(b_), 4), "r": round(float(np.corrcoef(xs, ys)[0, 1]), 3), "n": len(pares)}
    f = lambda x: round(float(a_ + b_ * x), 3)
    for r in res.values():
        r["bruto"] = {k: r[k] for k in ("bol", "lula", "nota") if k in r}
        for k in ("bol", "lula", "nota"):
            if k in r: r[k] = f(r[k])
    print("calibração", cal)
anos = {}
for ano, notas in H["anos"].items():
    if int(ano) < 2018:   # antes disso os partidos ainda não votavam na Câmara medida aqui: fica Harvard
        continue
    anos[ano] = {}
    for sg, (n, est, fonte) in notas.items():
        r = res.get(TSE.get(sg, sg))
        if r:
            f = "voto na Câmara, 2019 a 2026" if not r.get("um_governo") else ("voto na Câmara só no governo " + ("Bolsonaro" if r["um_governo"] == "bol" else "Lula") + "; nota pelos partidos que votavam igual (" + ", ".join(r["vizinhos"]) + ")")
            anos[ano][sg] = [r["nota"], bool(r.get("um_governo")), f]
        else:
            anos[ano][sg] = [n, True, "sem votos na Câmara: nota de Harvard" if n is not None else "sem nota"]
gov = {per: round(float(np.mean([r["gov_" + per] for r in dois.values() if "gov_" + per in r])), 1) for per in ("bol", "lula")}
json.dump({"fonte": "Orientações de bancada no Plenário da Câmara dos Deputados, 2019 a 2026 (dadosabertos.camara.leg.br)", "metodo": __doc__.strip(), "votacoes": nvot, "calibracao": cal, "partidos": res, "anos": anos}, open(SAIDA, "w"), ensure_ascii=False, indent=1)
for p, r in sorted(res.items(), key=lambda kv: kv[1]["nota"]):
    print(f'{p:14s} nota {r["nota"]:+.2f}  bol {r.get("bol", float("nan")):+.2f} ({r.get("gov_bol", "-")}%)  lula {r.get("lula", float("nan")):+.2f} ({r.get("gov_lula", "-")}%)  n={r.get("n_bol",0)}/{r.get("n_lula",0)}')
