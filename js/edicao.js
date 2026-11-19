/* Voto a voto — #/edicao: O Voto da sua cidade, uma edição escrita pelos dados para cada uma das 5.570 cidades.
   Quem manda hoje; a manchete escolhida por regras (o lado para presidente e para prefeito, quem acerta o presidente,
   quem virou, o nome que domina a prefeitura); a cidade entre as parecidas (capitais com capitais, as outras com as do
   mesmo tamanho); e o voto desde a primeira eleição da cidade. Tudo calculado dos dados do site
   (data/br/hist, resumo, achados e as camadas do mapa em data/br/lobby), nada escrito à mão. */
(function () {
  "use strict";
  const V = window.V;
  const nf = (d) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const N0 = nf(0), N1 = nf(1), N2 = nf(2);
  const reais = (v) => "R$ " + N2.format(v);
  const pc = (v, d = 1) => (d ? N1 : N0).format(v) + "%";
  const ESQ = "#B8232F", DIR = "#1D3C9E", CEN = "#8C887C", CANETA = "#CC1259", FALTA = "#9c5d16";
  const TINT = { esquerda: ["#F4D5D8", ESQ], centro: ["#E6E2D8", CEN], direita: ["#D6DDF2", DIR] };
  const tint = (l) => TINT[l] || ["#FFFFFF", "#C9C5B9"];
  const ORD = (n) => n + "ª";

  /* cada camada do mapa vira uma comparação possível com as cidades parecidas */
  const NOTICIAS = [
    { cam: "cadeira", var: "VEREADOR", t: (n, v) => `Cada vereador de ${n} representa ${N0.format(v)} eleitores`, f: (v) => N0.format(v), mais: "mais eleitores por vereador", menos: "menos eleitores por vereador" },
    { cam: "fundo", var: "CAMPANHA MUNICIPAL", t: (n, v) => `${n} recebeu ${reais(v)} de dinheiro público por eleitor nas campanhas de 2024`, f: reais, mais: "mais dinheiro público por eleitor", menos: "menos dinheiro público por eleitor" },
    { cam: "gasto", var: "CAMPANHA MUNICIPAL", t: (n, v) => `As campanhas de ${n} gastaram ${reais(v)} por eleitor em 2024`, f: reais, mais: "mais gasto por eleitor", menos: "menos gasto por eleitor" },
    { cam: "religioso", var: "TÍTULO RELIGIOSO", t: (n, v) => (v < 1 ? `Menos de 1 em cada 100 candidatos a vereador de ${n} usou “Pastor” ou “Irmão” no nome` : `${N1.format(v).replace(",0", "")} em cada 100 candidatos a vereador de ${n} puseram “Pastor” ou “Irmão” no nome`), f: (v) => N1.format(v) + "%", mais: "mais pastores e irmãos", menos: "menos pastores e irmãos" },
    { cam: "superior", var: "ELEITORES", t: (n, v) => `${N0.format(v)} em cada 100 eleitores de ${n} têm curso superior`, f: (v) => N1.format(v) + "%", mais: "mais diploma", menos: "menos diploma" },
    { cam: "mulheres", var: "VEREADOR", t: (n, v) => `${N0.format(v)} em cada 100 vereadores eleitos em ${n} são mulheres`, f: (v) => N1.format(v) + "%", mais: "mais vereadoras", menos: "menos vereadoras" },
    { cam: "ninguem", var: "PRESIDENTE", t: (n, v) => `${N1.format(v)}% dos eleitores de ${n} não escolheram ninguém para presidente`, f: (v) => N1.format(v) + "%", mais: "mais gente sem escolher", menos: "menos gente sem escolher", sub: "Faltaram, votaram em branco ou anularam, em 2026." },
    { cam: "troca", var: "VEREADOR", t: (n, v) => `${N0.format(v)} em cada 100 vereadores de ${n} que tentaram a reeleição trocaram de partido`, f: (v) => N1.format(v) + "%", mais: "mais troca de partido", menos: "menos troca de partido" },
    { cam: "laranja", var: "CANDIDATAS A VEREADORA", t: (n, v) => `${N0.format(v)} em cada 100 candidatas a vereadora de ${n} tiveram até 10 votos`, f: (v) => N1.format(v) + "%", mais: "mais candidatas com até 10 votos", menos: "menos candidatas com até 10 votos" },
    { cam: "bf", var: "BENEFÍCIOS", t: (n, v) => `${n} tem ${N1.format(v)} benefícios do Bolsa Família para cada 100 eleitores`, f: (v) => N1.format(v), mais: "mais Bolsa Família", menos: "menos Bolsa Família" },
    { cam: "jovens", var: "ELEITORES", t: (n, v) => `${N0.format(v)} em cada 100 eleitores de ${n} têm até 29 anos`, f: (v) => N1.format(v) + "%", mais: "mais eleitores jovens", menos: "menos eleitores jovens" },
  ];
  /* grupos de tamanho (moradores) para as cidades que não são capital */
  const FAIXAS = [[0, 5e3, "até 5 mil"], [5e3, 1e4, "de 5 a 10 mil"], [1e4, 2e4, "de 10 a 20 mil"], [2e4, 5e4, "de 20 a 50 mil"], [5e4, 1e5, "de 50 a 100 mil"], [1e5, 5e5, "de 100 a 500 mil"], [5e5, Infinity, "mais de 500 mil"]];

  /* nome de urna para leitura: Lula, e não Luiz Inacio Lula da Silva; nome cortado no TSE (30 letras) perde a última palavra */
  const APELIDO = { "LUIZ INACIO LULA DA SILVA": "Lula", "FERNANDO HENRIQUE CARDOSO": "Fernando Henrique", "JAIR MESSIAS BOLSONARO": "Bolsonaro" };
  const nome = (s) => { s = String(s || "").trim(); if (APELIDO[s]) return APELIDO[s]; if (s.length >= 30) s = s.split(" ").slice(0, -1).join(" "); return V.titulo(s); };
  /* a mesma pessoa com nomes de urna diferentes (Firmino, Firmino Filho...): conta pelo primeiro nome, ou pelos dois
     primeiros quando o primeiro é comum demais para identificar alguém */
  const COMUNS = new Set("JOSE JOAO MARIA ANTONIO FRANCISCO PEDRO PAULO CARLOS LUIZ LUIS ANA MANOEL MANUEL RAIMUNDO SEBASTIAO FRANCISCA ANTONIA DR DRA DOUTOR PROFESSOR PROFESSORA PROF PASTOR IRMAO ZE JORGE MARCOS MARCO JOAQUIM BENEDITO GERALDO".split(" "));
  const chave = (s) => { const w = V.norm(String(s)).toUpperCase().split(/\s+/).filter((x) => !["DA", "DE", "DO", "DAS", "DOS", "E"].includes(x)); return COMUNS.has(w[0]) ? w.slice(0, 2).join(" ") : w[0]; };
  const ladoDe = (sg, ano) => V.faixa(V.notaDe(sg, ano));
  const R = (d) => { const t = d.t2 || d.t1; const tot = t.reduce((s, x) => s + x[1], 0); return { t, tot, turno: d.t2 ? "t2" : "t1" }; };

  async function edicao(main, ibgeRota) {
    V.marcarNav("cidade");
    const [BR, G] = await Promise.all([V.baseBR(), V.geoBR()]);
    const ibge = ibgeRota || V.minhaCidade() || "2211001";
    const i = G.mun.findIndex((f) => f.id === ibge), c = BR.porIbge.get(ibge);
    if (i < 0 || !c) { main.innerHTML = '<div class="pagina"><p class="aviso">Cidade não encontrada.</p></div>'; return; }
    V.guardarCidade(ibge);
    const PRESA = [1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026];
    const [hist, A, rp, rg, ...cams] = await Promise.all([V.dados("br/hist/" + c.uf), V.dados("br/achados"), Promise.all(PRESA.map((a) => V.dados("br/resumo/PRES" + a))),
      Promise.all(PRESA.map((a) => V.dados("br/resumo/GOV" + a))), ...[...new Set(NOTICIAS.map((x) => x.cam))].map(async (k) => [k, await V.dados("br/lobby/" + k)])]);
    const D = Object.fromEntries(cams), H = hist[ibge] || {}, NM = c.nome, UF = c.uf, mesmoNome = V.norm(V.UFN[UF]) === V.norm(NM), noUF = mesmoNome ? `no estado ${V.noUF(UF).replace(/^em /, "de ").replace(/^n([oa]) /, "d$1 ")}` : V.noUF(UF), ufRot = mesmoNome ? "Estado" : V.UFN[UF], soDF = UF === "DF", sem = (k) => !(H[k] && H[k].length);
    const temPref = !sem("PREF");

    /* presidente: quem venceu no Brasil e quanto cada um teve no turno que decidiu */
    const presBR = PRESA.map((a, k) => { const d = rp[k], b = R(d.BR), u = d.UF[UF] ? R(d.UF[UF]) : null, w = d.c[String(b.t[0][0])];
      const parte = (x, sg) => { if (!x) return null; const y = x.t.find((z) => (d.c[String(z[0])] || [])[1] === sg); return y ? (100 * y[1]) / x.tot : null; };
      return { ano: a, eleito: w[0], sg: w[1], turno: b.turno, br: (sg) => parte(b, sg), uf: (sg) => parte(u, sg) }; });
    const P = (H.PRES || []).map(([ano, nm, sg, pct]) => ({ ano, nm, sg, pct, lado: ladoDe(sg, ano), B: presBR.find((x) => x.ano === ano) }));
    const PF = (H.PREF || []).map(([ano, nm, sg, pct]) => ({ ano, nm, sg, pct, lado: ladoDe(sg, ano) }));
    const GV = (H.GOV || []).map(([ano, nm, sg, pct]) => { const d = rg[PRESA.indexOf(ano)], u = d && d.UF[UF] ? R(d.UF[UF]) : null, w = u ? d.c[String(u.t[0][0])] : null;
      return { ano, nm, sg, pct, lado: ladoDe(sg, ano), est: w ? w[0] : null, estSg: w ? w[1] : null, estPct: u ? (100 * u.t[0][1]) / u.tot : null }; });
    const acertos = P.filter((p) => p.B && p.sg === p.B.sg).length;

    /* ---------- quem manda hoje ---------- */
    const pf = PF[PF.length - 1], gv = GV[GV.length - 1], pr = P[P.length - 1];
    const chip = (l) => (l ? `<span class="sc-ld sc-ld--${l}">${l}</span>` : "");
    const vezes = (lista, x) => lista.filter((y) => chave(y.nm) === chave(x.nm)).map((y) => y.ano);
    const manda = [];
    if (pf) { const vs = vezes(PF, pf); manda.push(["Prefeito", nome(pf.nm), pf.lado, `${pf.sg}, venceu em ${pf.ano} com ${pc(pf.pct)} dos votos válidos.${vs.length > 1 ? ` É a ${ORD(vs.length)} vez (${vs.join(", ")}).` : ""}`]); }
    else { const sn = (H.SEN || [])[H.SEN ? H.SEN.length - 1 : 0]; if (sn) manda.push(["Para o Senado, o mais votado", nome(sn[1]), ladoDe(sn[2], sn[0]), `${sn[2]}, com ${pc(sn[3])} aqui em ${sn[0]}. ${UF === "DF" ? "O Distrito Federal não tem prefeito: quem governa Brasília é o governador." : ""}`]); }
    if (gv && gv.est) { const igual = chave(gv.est) === chave(gv.nm);
      manda.push(["Governador", nome(gv.est), ladoDe(gv.estSg, gv.ano), soDF ? `${gv.estSg}, venceu com ${pc(gv.estPct)} em ${gv.ano}.` : igual ? `${gv.estSg}, teve ${pc(gv.pct)} aqui e ${pc(gv.estPct)} ${noUF} em ${gv.ano}.` : `${gv.estSg}, venceu com ${pc(gv.estPct)} ${noUF} em ${gv.ano}. Aqui, o mais votado foi ${nome(gv.nm)} (${gv.sg}).`]); }
    if (pr && pr.B) { const ele = pr.B, aqui = pr.sg === ele.sg ? pr.pct : ele.turno === "t2" ? 100 - pr.pct : null;
      manda.push(["Presidente", nome(ele.eleito), ladoDe(ele.sg, pr.ano), `${ele.sg}, teve ${aqui == null ? "menos que o 1º colocado" : pc(aqui)} aqui e ${pc(ele.br(ele.sg))} no Brasil${ele.turno === "t2" ? " no 2º turno" : ""} de ${pr.ano}.`]); }

    /* ---------- a manchete: a regra mais forte que vale para esta cidade ---------- */
    const conta = (xs, f) => xs.reduce((m, x) => ((m[f(x)] = (m[f(x)] || 0) + 1), m), {});
    const cands = [];
    if (P.length >= 4) {
      const porSg = Object.entries(conta(P, (p) => p.sg)).sort((a, b) => b[1] - a[1]), [sgP, kP] = porSg[0], nP = P.length, desde = P[0].ano;
      const kPref = PF.filter((x) => x.sg === sgP).length;
      if (kP / nP >= 0.75 && PF.length >= 4 && kPref === 0)
        cands.push([100, `O ${sgP} ganhou aqui ${kP === nP ? `todas as ${nP}` : `${kP} das ${nP}`} eleições para presidente e nenhuma das ${PF.length} para prefeito`,
          `Para presidente, ${NM} deu o 1º lugar ao ${sgP} ${kP === nP ? "em todas as eleições" : "quase sempre"} desde ${desde}. Para prefeito, o ${sgP} nunca ganhou: ${Object.entries(conta(PF, (x) => x.sg)).sort((a, b) => b[1] - a[1]).map(([s, k]) => `${s} ${k === 1 ? "uma vez" : k + " vezes"}`).join(", ")}.`]);
      const ptAqui = P.filter((p) => p.sg === "PT").length, ptBR = P.filter((p) => p.B && p.B.sg === "PT").length;
      if (ptBR - ptAqui >= 4) cands.push([88, `O PT ganhou ${ptBR} das ${nP} eleições para presidente no Brasil, mas só ${ptAqui === 0 ? "nenhuma" : ptAqui} aqui`.replace("só nenhuma", "nenhuma"),
        `Desde ${desde}, ${NM} deu o 1º lugar a ${Object.entries(conta(P.filter((p) => p.sg !== "PT"), (p) => p.sg)).sort((a, b) => b[1] - a[1]).map(([s2, k]) => `${s2} (${k === 1 ? "uma vez" : k + " vezes"})`).join(", ").replace(/, ([^,]+)$/, " e $1")}${ptAqui ? `; o PT ganhou aqui em ${P.filter((p) => p.sg === "PT").map((p) => p.ano).join(", ").replace(/, (\d+)$/, " e $1")}` : ""}.`]);
      if (kP === nP) cands.push([90, `O ${sgP} ganhou aqui todas as ${nP} eleições para presidente desde ${desde}`, `${NM} ficou com o ${sgP} até quando o Brasil escolheu outro${P.some((p) => p.B && p.B.sg !== sgP) ? ` (${P.filter((p) => p.B && p.B.sg !== sgP).map((p) => p.ano).join(", ").replace(/, (\d+)$/, " e $1")})` : ""}.`]);
      if (acertos === nP) cands.push([85, `${NM} votou em quem venceu para presidente em todas as ${nP} eleições desde ${desde}`, `De ${P.map((p) => nome(p.B.eleito)).filter((x, k, a) => a.indexOf(x) === k).join(", ").replace(/, ([^,]+)$/, " a $1")}: aqui ganhou sempre quem o Brasil elegeu.`]);
      const lados = P.map((p) => p.lado), ult = lados.slice(-3), L2 = ult[0], ini = lados.slice(0, -3);
      if (ini.length >= 3 && L2 && L2 !== "centro" && ult.every((l) => l === L2)) { const L1n = ini.filter((l) => l && l !== L2 && l !== "centro").length;
        if (L1n / ini.length >= 0.6) { const L1 = L2 === "esquerda" ? "direita" : "esquerda", vira = P[P.length - 3].ano;
          cands.push([80, `${NM} votou ${L1 === "esquerda" ? "na esquerda" : "na direita"} para presidente em ${L1n} das ${ini.length} primeiras eleições e ${L2 === "esquerda" ? "na esquerda" : "na direita"} nas últimas 3`, `A virada foi em ${vira}: desde então, o 1º lugar aqui foi sempre de um partido de ${L2}.`]); } }
    }
    if (PF.length >= 4) { const top = Object.entries(conta(PF, (x) => chave(x.nm))).sort((a, b) => b[1] - a[1])[0];
      if (top[1] >= 3) { const qs = PF.filter((x) => chave(x.nm) === top[0]), nmT = nome(qs[qs.length - 1].nm);
        cands.push([70 + top[1], `${nmT} ganhou ${top[1]} das ${PF.length} eleições para prefeito`, `Venceu em ${qs.map((x) => `${x.ano} (${x.sg})`).join(", ").replace(/, ([^,]+)$/, " e $1")}. Nomes de urna parecidos contam como a mesma pessoa.`]); } }

    /* ---------- a cidade entre as parecidas ---------- */
    const capital = c.capital, faixa = FAIXAS.find(([a, b]) => (c.pop || 0) >= a && (c.pop || 0) < b);
    const grupoIdx = G.mun.map((f, k) => [f.id, k]).filter(([id]) => { const x = BR.porIbge.get(id); return x && (capital ? x.capital : !x.capital && (x.pop || 0) >= faixa[0] && (x.pop || 0) < faixa[1]); }).map(([, k]) => k);
    const grupoNome = capital ? "as capitais" : `as cidades ${faixa[2]} moradores`;
    const comp = NOTICIAS.map((x) => {
      const camada = D[x.cam], anos = (camada.anos || {})[x.var] || []; if (!anos.length) return null;
      const vs = camada.v[x.var][String(anos[anos.length - 1])], v = vs[i]; if (v == null) return null;
      const g = grupoIdx.map((k) => [vs[k], k]).filter(([y]) => y != null).sort((a, b) => a[0] - b[0]); if (g.length < 5) return null;
      const todos = vs.filter((y) => y != null).sort((a, b) => a - b), med = todos[Math.floor(todos.length / 2)];
      const acima = g.filter(([y]) => y > v).length, abaixo = g.filter(([y]) => y < v).length, n = g.length, p = (100 * (abaixo + (n - acima - abaixo) / 2)) / n;
      return { ...x, v, med, g, n, rank: 1 + acima, p, forca: Math.abs(p - 50) };
    }).filter(Boolean).sort((a, b) => b.forca - a.forca);
    const posTxt = (x) => {
      if (capital) { const r = x.rank, n = x.n; if (n / 3 < r && r <= n - n / 3) return `no meio das capitais (${ORD(r)} de ${n})`; return r <= n / 2 ? `a ${ORD(r)} capital com ${x.mais}` : `a ${ORD(n - x.rank + 1)} capital com ${x.menos}`; }
      if (x.rank <= 10) return `a ${ORD(x.rank)} com ${x.mais} entre as ${V.int(x.n)} do mesmo tamanho`;
      if (x.n - x.rank < 10) return `a ${ORD(x.n - x.rank + 1)} com ${x.menos} entre as ${V.int(x.n)} do mesmo tamanho`;
      const d = Math.min(9, Math.max(1, Math.round(x.p / 10))); if (d >= 4 && d <= 6) return `no meio das cidades do mesmo tamanho`;
      return d > 5 ? `mais que em ${d} de cada 10 cidades do mesmo tamanho` : `menos que em ${10 - d} de cada 10 cidades do mesmo tamanho`;
    };
    if (comp.length && comp[0].forca >= 40) cands.push([50, comp[0].t(NM, comp[0].v), `${posTxt(comp[0]).replace(/^./, (s) => s.toUpperCase())}. Numa cidade comum do Brasil, ${comp[0].f(comp[0].med)}.`]);
    if (!cands.length) cands.push([10, `${NM} votou em quem venceu para presidente em ${acertos} das ${P.length} eleições desde ${P[0] ? P[0].ano : c.prim}`, "O voto da cidade, eleição por eleição, está logo abaixo."]);
    const [, h1, sub] = cands.sort((a, b) => b[0] - a[0])[0];

    /* filas de caixas coloridas: presidente e prefeito */
    const fila = (lista) => `<div class="sc-cx">${lista.map((x) => { const [f, b] = tint(x.lado); return `<span style="background:${f};border-color:${b}" title="${x.ano}: ${V.esc(nome(x.nm))} (${x.sg})">${x.sg}<i>${x.ano}</i></span>`; }).join("")}</div>`;

    /* caixa do presidente: o vencedor daqui, aqui, no estado e no Brasil */
    let caixa = "";
    if (pr && pr.B) {
      const sg = pr.sg, br = pr.B.br(sg), uf = pr.B.uf(sg), cor = (TINT[pr.lado] || TINT.centro)[1], d = br == null ? null : pr.pct - br;
      const barra = (rot, v, c2) => (v == null ? "" : `<div class="sc-bar"><small>${rot}</small><b style="color:${c2}">${pc(v)}</b><i><u style="width:${Math.min(100, v)}%;background:${c2}"></u></i></div>`);
      caixa = `<div class="sc-vs"><p class="sc-tag">${pr.B.turno === "t2" ? "2º turno" : "Eleição"} de ${pr.ano}</p>
        <h2>${V.esc(nome(pr.nm))} teve ${pc(pr.pct)} aqui${d == null ? "" : `, ${N0.format(Math.abs(d))} ${Math.round(Math.abs(d)) === 1 ? "ponto" : "pontos"} ${d >= 0 ? "a mais" : "a menos"} que no Brasil`}</h2>
        ${barra(NM, pr.pct, cor)}${soDF ? "" : barra(ufRot, uf, cor)}${barra("Brasil", br, "#141414")}
        <p class="sc-pp">${NM} acertou o presidente em ${acertos} das ${P.length} eleições desde ${P[0].ano}.</p>
        <a class="sc-ler" href="#sc-hist">Ver o voto de ${V.esc(NM)} desde ${P[0].ano} ↓</a></div>`;
    }

    /* tira de bolinhas: cada uma é uma cidade do grupo */
    const tira = (x) => {
      const vs = x.g.map(([y]) => y), muitas = vs.length > 60, lo = muitas ? vs[Math.floor(vs.length * 0.02)] : vs[0], hi = muitas ? vs[Math.floor(vs.length * 0.98)] : vs[vs.length - 1];
      const W = 560, X = (v) => 20 + ((Math.max(lo, Math.min(hi, v)) - lo) / ((hi - lo) || 1)) * (W - 40);
      const pts = x.g.filter(([, k]) => k !== i).map(([y]) => `<circle cx="${X(y).toFixed(1)}" cy="34" r="${muitas ? 3.5 : 6}" fill="#9C9686" fill-opacity="${muitas ? 0.28 : 0.8}"/>`).join("");
      const nomeK = (k) => (BR.porIbge.get(G.mun[k].id) || {}).nome || "";
      const ext = muitas ? [lo === vs[0] ? x.f(lo) : `${x.f(lo)} ou menos`, hi === vs[vs.length - 1] ? x.f(hi) : `${x.f(hi)} ou mais`] : [`${nomeK(x.g[0][1])} ${x.f(vs[0])}`, `${nomeK(x.g[x.g.length - 1][1])} ${x.f(vs[vs.length - 1])}`];
      return `<svg class="sc-tira" viewBox="0 0 ${W} 74" role="img" aria-label="${V.esc(NM)}: ${x.f(x.v)}; ${grupoNome}: de ${ext[0]} a ${ext[1]}"><line x1="20" y1="34" x2="${W - 20}" y2="34" stroke="#C9C5B9" stroke-width="2"/>${pts}
        <circle cx="${X(x.v).toFixed(1)}" cy="34" r="10" fill="${CANETA}" stroke="#141414" stroke-width="2"/><text x="${Math.min(W - 60, Math.max(60, X(x.v))).toFixed(1)}" y="14" text-anchor="middle" class="sc-tira__eu">${V.esc(NM)}</text>
        <text x="20" y="68" class="sc-tira__e">${V.esc(ext[0])}</text><text x="${W - 20}" y="68" text-anchor="end" class="sc-tira__e">${V.esc(ext[1])}</text></svg>`;
    };
    const compHtml = comp.slice(0, 5).map((x) => `<div class="sc-cap"><div><h3>${x.t(NM, x.v)}: ${V.rMarca(posTxt(x))}</h3><p>${x.sub ? x.sub + " " : ""}Numa cidade comum do Brasil, ${x.f(x.med)}.</p></div>${tira(x)}</div>`).join("");

    /* ---------- desde a primeira eleição: a grade ---------- */
    const ano0 = Math.min(...[P, PF, GV].filter((l) => l.length).map((l) => l[0].ano)), anos = []; for (let a = ano0; a <= 2026; a += 2) anos.push(a);
    const SEN = (H.SEN || []).map(([ano, nm, sg, pct]) => ({ ano, nm, sg, pct, lado: ladoDe(sg, ano) }));
    const linhasG = [["Presidente", P], ["Governador", GV], ["Senador", SEN], ...(temPref ? [["Prefeito", PF]] : [])].filter(([, l]) => l.length);
    const difP = new Set(P.filter((p) => p.B && p.sg !== p.B.sg).map((p) => p.ano)), difG = new Set((soDF ? [] : GV).filter((g) => g.est && chave(g.est) !== chave(g.nm)).map((g) => g.ano));
    const grade = `<div class="sc-grade" style="grid-template-columns:110px repeat(${anos.length},minmax(0,1fr))"><div></div>${anos.map((a) => `<div class="sc-grade__ano">${a}</div>`).join("")}
      ${linhasG.map(([rot, l]) => `<div class="sc-grade__rot">${rot}</div>${anos.map((a) => { const x = l.find((y) => y.ano === a); if (!x) return "<div></div>";
        const [f, b] = tint(x.lado), dif = (rot === "Presidente" && difP.has(a)) || (rot === "Governador" && difG.has(a));
        return `<div class="sc-gc${dif ? " sc-gc--dif" : ""}" style="background:${f};border-color:${b}" title="${a}: ${V.esc(nome(x.nm))} (${x.sg}), ${pc(x.pct)}">${x.sg}<i>${x.pct >= 99.9 ? "" : pc(x.pct, 0)}</i></div>`; }).join("")}`).join("")}</div>`;
    const ndif = difP.size + difG.size;
    const difTxt = ndif ? `${ndif === 1 ? "Uma vez" : ndif + " vezes"} ${NM} votou diferente: ${[difP.size ? `para presidente, quando o Brasil elegeu outro (${[...difP].join(", ").replace(/, (\d+)$/, " e $1")})` : "", difG.size ? `para governador, quando o estado elegeu outro (${[...difG].join(", ").replace(/, (\d+)$/, " e $1")})` : ""].filter(Boolean).join("; ")}.` : `${NM} votou no mesmo presidente que o Brasil e no mesmo governador que o estado em todas as eleições.`;

    /* o PT no 2º turno: aqui × Brasil (o PT esteve em todos os 2º turnos desde 2002) */
    const ptS = P.filter((p) => p.B && p.B.turno === "t2" && p.B.br("PT") != null).map((p) => ({ ano: p.ano, aqui: p.sg === "PT" ? p.pct : 100 - p.pct, br: p.B.br("PT") }));
    const linha = (series, anosL, { max = 100, passo = 25, rot }) => {
      const W = 600, Hh = 280, X = (k) => 56 + (k * (W - 180)) / Math.max(1, anosL.length - 1), Y = (v) => Hh - 36 - (v / max) * (Hh - 64);
      const grades = []; for (let v = 0; v <= max; v += passo) grades.push(`<line x1="56" x2="${X(anosL.length - 1)}" y1="${Y(v)}" y2="${Y(v)}" stroke="#E2DED4"/><text x="48" y="${Y(v) + 5}" text-anchor="end" class="sc-l__e">${v}%</text>`);
      const ls = series.map((s) => `<polyline points="${s.v.map((v, k) => `${X(k)},${Y(v)}`).join(" ")}" fill="none" stroke="${s.cor}" stroke-width="${s.w}"/>${s.v.map((v, k) => `<circle cx="${X(k)}" cy="${Y(v)}" r="4" fill="${s.cor}"><title>${anosL[k]}: ${pc(v)}</title></circle>`).join("")}
        <text x="${X(anosL.length - 1) + 10}" y="${Y(s.v[s.v.length - 1]) + s.dy}" class="sc-l__n" fill="${s.cor}">${s.nome} ${pc(s.v[s.v.length - 1], 0)}</text>`).join("");
      const passoA = anosL.length > 10 ? 4 : 1;
      return `<svg class="sc-l" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${rot}">${grades.join("")}${ls}${anosL.map((a, k) => (k % passoA === 0 || k === anosL.length - 1 ? `<text x="${X(k)}" y="${Hh - 10}" text-anchor="middle" class="sc-l__e">${a}</text>` : "")).join("")}</svg>`;
    };
    let ptHtml = "";
    if (ptS.length >= 3) {
      const mais = ptS.filter((x) => x.aqui > x.br).length, u = ptS[ptS.length - 1], d = u.aqui - u.br, sobe = u.aqui >= u.br;
      ptHtml = `<div class="sc-sec"><h2>O PT no 2º turno: ${V.esc(NM)} × Brasil</h2>
        <p class="sc-a">${mais === ptS.length ? `O PT teve mais votos aqui que no Brasil em todos os ${ptS.length} segundos turnos.` : mais === 0 ? `O PT teve menos votos aqui que no Brasil em todos os ${ptS.length} segundos turnos.` : `O PT teve mais votos aqui que no Brasil em ${mais} dos ${ptS.length} segundos turnos.`} Em ${u.ano}, ${V.rMarca(`${N0.format(Math.abs(d))} ${Math.round(Math.abs(d)) === 1 ? "ponto" : "pontos"} ${sobe ? "a mais" : "a menos"}`)}.</p>
        ${linha([{ nome: "aqui", v: ptS.map((x) => x.aqui), cor: ESQ, w: 4, dy: sobe ? -4 : 14 }, { nome: "Brasil", v: ptS.map((x) => x.br), cor: "#141414", w: 2.5, dy: sobe ? 14 : -4 }], ptS.map((x) => x.ano), { rot: "O PT no 2º turno para presidente, aqui e no Brasil" })}
        <p class="sc-como">Parte dos votos válidos do candidato do PT no 2º turno para presidente. O PT esteve em todos os segundos turnos desde 2002.</p></div>`;
    }
    /* prefeitos */
    let prefHtml = "";
    if (PF.length) {
      const ks = Object.entries(conta(PF, (x) => chave(x.nm))).sort((a, b) => b[1] - a[1]), nomeK = (k) => nome(PF.filter((x) => chave(x.nm) === k).pop().nm);
      const lead = ks[0][1] === 1 ? `Cada eleição teve um prefeito diferente: ${PF.length} nomes em ${PF.length} eleições.` : ks[1] && ks[1][1] >= 2 && ks[0][1] + ks[1][1] >= PF.length - 1 ? `Dois nomes ganharam ${ks[0][1] + ks[1][1]} das ${PF.length} eleições: ${nomeK(ks[0][0])} (${ks[0][1]} vezes) e ${nomeK(ks[1][0])} (${ks[1][1]}).` : `${nomeK(ks[0][0])} ganhou ${ks[0][1]} das ${PF.length} eleições.`;
      prefHtml = `<div class="sc-sec"><h2>Os prefeitos desde ${PF[0].ano}</h2><p class="sc-a">${lead}</p>
        <div class="sc-prefs">${PF.map((x) => `<div><b>${x.ano}</b><span>${V.esc(nome(x.nm))}</span><span>${x.sg}</span><span class="sc-pb" title="${pc(x.pct)} dos votos válidos"><u style="width:${Math.min(100, x.pct)}%;background:${tint(x.lado)[1]}"></u></span></div>`).join("")}</div>
        <p class="sc-como">A barra é quanto o prefeito teve dos votos válidos; a cor é o lado do partido naquele ano. Nomes de urna parecidos contam como a mesma pessoa.</p></div>`;
    }
    /* quem falta */
    const serie = new Map(A.serie.map((s) => [s[0] + s[1], (100 * s[4]) / s[2]]));
    const FA = (H.abst || []).map(([a, v]) => ({ a, aqui: v, br: serie.get(a + "PRES") ?? serie.get(a + "PREF") })).filter((x) => x.br != null);
    let faltaHtml = "";
    if (FA.length >= 3) {
      let k = FA.length; while (k > 0 && FA[k - 1].aqui < FA[k - 1].br) k--; let k2 = FA.length; while (k2 > 0 && FA[k2 - 1].aqui > FA[k2 - 1].br) k2--;
      const u = FA[FA.length - 1];
      const lead = FA.length - k >= 3 ? `Desde ${FA[k].a}, ${NM} falta menos que o Brasil: ${pc(u.aqui)} contra ${pc(u.br)} em ${u.a}.` : FA.length - k2 >= 3 ? `Desde ${FA[k2].a}, ${NM} falta mais que o Brasil: ${pc(u.aqui)} contra ${pc(u.br)} em ${u.a}.` : `Em ${u.a}, faltaram ${pc(u.aqui)} dos eleitores daqui e ${pc(u.br)} no Brasil.`;
      faltaHtml = `<div class="sc-sec"><h2>Quem falta: ${V.esc(NM)} × Brasil</h2><p class="sc-a">${lead}</p>
        ${linha([{ nome: "aqui", v: FA.map((x) => x.aqui), cor: FALTA, w: 4, dy: u.aqui < u.br ? 14 : -4 }, { nome: "Brasil", v: FA.map((x) => x.br), cor: "#141414", w: 2.5, dy: u.aqui < u.br ? -4 : 14 }], FA.map((x) => x.a), { max: 40, passo: 10, rot: "Eleitores que faltaram, aqui e no Brasil" })}
        <p class="sc-como">Eleitores que não foram votar sobre os aptos, no 1º turno: presidente nos anos de eleição geral, prefeito nos de eleição municipal.</p></div>`;
    }
    /* governador: a cidade e o estado */
    let govHtml = "";
    const GVe = soDF ? [] : GV.filter((g) => g.est);
    if (GVe.length) {
      const ds = GVe.filter((g) => chave(g.est) !== chave(g.nm)).map((g) => g.ano);
      govHtml = `<div class="sc-sec"><h2>Governador: a cidade e o estado</h2><p class="sc-a">${ds.length ? `Em ${ds.join(", ").replace(/, (\d+)$/, " e $1")}, ${NM} escolheu um governador e ${V.UFN[UF] === "Distrito Federal" ? "o Distrito Federal" : "o estado"} elegeu outro.` : `${NM} votou no mesmo governador que o estado em todas as ${GVe.length} eleições.`}</p>
        <div class="sc-gov"><div class="sc-gov__h"><span>Ano</span><span>Mais votado aqui</span><span>Eleito ${noUF}</span><span></span></div>
        ${GVe.map((g) => { const d = chave(g.est) !== chave(g.nm); return `<div${d ? ' class="sc-gov--dif"' : ""}><b>${g.ano}</b><span>${V.esc(nome(g.nm))} <small>${g.sg}</small></span><span>${V.esc(nome(g.est))} <small>${g.estSg}</small></span><span>${d ? '<abbr title="diferente">≠</abbr>' : ""}</span></div>`; }).join("")}</div></div>`;
    }

    document.title = `O Voto de ${NM} · Voto a voto`;
    const datalist = BR.lista.map((x) => `<option value="${V.esc(x.nome)} (${x.uf})"></option>`).join("");
    const desc = capital ? `capital ${V.noUF(UF).replace(/^n/, "d")}` : `${V.UFN[UF]}`;
    main.innerHTML = `<div class="pagina dif-pagina sc">
      <div class="dif-barra">
        <p><b>Uma edição do jornal só para a sua cidade.</b> Quem manda, como a cidade vota desde a primeira eleição e onde ela fica entre as parecidas.</p>
        <div class="dif-acoes">
          <label>Cidade <input id="dif-cidade" type="text" list="dif-cidades" autocomplete="off" value="${V.esc(NM)} (${UF})"><datalist id="dif-cidades">${datalist}</datalist></label>
          <button type="button" class="btn btn--forte" data-dif-imprimir>Imprimir ou salvar em PDF</button>
          <button type="button" class="btn" data-dif-compartilhar>Compartilhar</button>
        </div>
      </div>
      <article class="dif-jornal sc-jornal" aria-label="O Voto de ${V.esc(NM)}">
        <header class="dif-jornal__cab">
          <div class="dif-jornal__linha"><span>Edição de ${V.esc(NM)} (${UF}) · ${desc} · ${V.int(c.pop)} moradores</span><span>Eleições de ${ano0} a 2026 · dados do TSE e do IBGE</span></div>
          <div class="dif-jornal__nome"><span>O Voto de ${V.esc(NM)}</span>${V.rCarimbo("só sua", 9)}</div>
        </header>
        <section class="sc-manda" aria-label="Quem manda aqui">${manda.map(([cg, n, l, t]) => `<div><p class="sc-cg">${cg}</p><p class="sc-quem">${V.esc(n)}${chip(l)}</p><p class="sc-pp">${t}</p></div>`).join("")}</section>
        <section class="dif-jornal__abre">
          <div class="dif-jornal__manchete">
            <p class="sc-tag sc-tag--caneta">A manchete</p>
            <h1>${V.rCircularNumero(h1)}</h1>
            <p class="sc-sub">${sub}</p>
            ${P.length || PF.length ? `<div class="sc-fila">${P.length ? `<div><small>Presidente</small>${fila(P)}</div>` : ""}${PF.length ? `<div><small>Prefeito</small>${fila(PF)}</div>` : ""}</div>` : ""}
          </div>
          ${caixa}
        </section>
        ${compHtml ? `<section class="sc-caps" aria-labelledby="sc-caps-t"><h2 id="sc-caps-t">${V.esc(NM)} entre ${grupoNome}</h2>
          <p class="sc-a">${capital ? `Comparar uma capital com uma cidade de 10 mil eleitores engana. Aqui ${V.esc(NM)} é comparada com as outras capitais: cada bolinha é uma capital.` : `Aqui ${V.esc(NM)} é comparada com as ${V.int(grupoIdx.length)} cidades que não são capital e têm ${faixa[2]} moradores: cada bolinha é uma delas.`}</p>
          ${compHtml}</section>` : ""}
        <section class="sc-hist" id="sc-hist" aria-labelledby="sc-hist-t"><h2 id="sc-hist-t">${V.esc(NM)} em cada eleição desde ${ano0}</h2>
          <p class="sc-a">Quem ficou em 1º aqui. A cor é o lado do partido naquele ano; o número é quanto o vencedor teve aqui.</p>
          <div class="sc-leg">${["esquerda", "centro", "direita"].map((l) => `<span><i style="background:${TINT[l][0]};border-color:${TINT[l][1]}"></i>partido de ${l}</span>`).join("")}<span><i class="sc-leg__dif"></i>${V.esc(NM)} votou diferente do Brasil (presidente) ou do estado (governador)</span></div>
          <div class="sc-grade-rola">${grade}</div><p class="sc-como">${difTxt}${c.prim > 1994 ? ` ${NM} teve a primeira eleição própria em ${c.prim}; antes, seus eleitores votavam na cidade de origem.` : ""}</p></section>
        ${ptHtml || prefHtml ? `<section class="sc-duas">${ptHtml}${prefHtml}</section>` : ""}
        ${faltaHtml || govHtml ? `<section class="sc-duas">${faltaHtml}${govHtml}</section>` : ""}
        <section class="dif-jornal__pe sc-pe">${V.rPostit(`Números dos dados abertos do TSE, do IBGE e do Ministério do Desenvolvimento Social. O lado do partido vem da régua escolhida no mapa. ${capital ? "A posição entre as capitais conta 27 capitais (26 nos assuntos de prefeito e vereador: Brasília não tem)." : `As cidades parecidas são as ${V.int(grupoIdx.length)} que não são capital e têm ${faixa[2]} moradores.`}`, -1.5).replace("<aside", "<div").replace("</aside>", "</div>")}</section>
      </article>
      <p class="dif-links"><a href="#/mapa/br/${UF}/c/${c.ibge}">Ver ${V.esc(NM)} no mapa</a> · <a href="#/respostas">Ver a sua cidade no mapa das respostas</a></p>
    </div>`;
    main.querySelector("[data-dif-imprimir]").addEventListener("click", () => print());
    main.querySelector("[data-dif-compartilhar]").addEventListener("click", () => V.compartilhar({ titulo: h1, bloco: "O Voto de " + NM, cor: CANETA, frase: sub }));
    main.querySelector("#dif-cidade").addEventListener("change", (e) => {
      const alvo = V.norm(e.target.value), achou = BR.lista.find((x) => V.norm(`${x.nome} (${x.uf})`) === alvo);
      if (achou) V.ir("#/edicao/" + achou.ibge);
    });
  }
  V.rota(/^\/edicao(?:\/(\d{7}))?\/?$/, async function (main, ibge) { await edicao(main, ibge); });
})();
