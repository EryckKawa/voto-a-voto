/* Voto a voto — mapa das 5.570 cidades pintado pela posição do partido vencedor entre esquerda e direita.
   Duas réguas: pelo voto na Câmara (orientações de bancada, 2019-2026; padrão) e pela pesquisa de Harvard
   (Zucco & Power, 2024, Brazilian Legislative Surveys). */
(function () {
  "use strict";
  const V = window.V;
  const UFN = { AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul", MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco", PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul", SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins" };
  const DO_UF = { AC: "do Acre", AL: "de Alagoas", AM: "do Amazonas", AP: "do Amapá", BA: "da Bahia", CE: "do Ceará", DF: "do Distrito Federal", ES: "do Espírito Santo", GO: "de Goiás", MA: "do Maranhão", MG: "de Minas Gerais", MS: "de Mato Grosso do Sul", MT: "de Mato Grosso", PA: "do Pará", PB: "da Paraíba", PE: "de Pernambuco", PI: "do Piauí", PR: "do Paraná", RJ: "do Rio de Janeiro", RN: "do Rio Grande do Norte", RO: "de Rondônia", RR: "de Roraima", RS: "do Rio Grande do Sul", SC: "de Santa Catarina", SE: "de Sergipe", SP: "de São Paulo", TO: "do Tocantins" };
  const COD_UF = { 11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO", 21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF" };
  const GRUPO = ["CE", "ES", "MT", "PR", "SC", "TO"];
  V.UFN = UFN;

  /* cor contínua pela nota: −1 esquerda (vermelho) … 0 centro (cinza claro) … +1 direita (azul) */
  const corEsc = d3.scaleLinear().domain([-1, -0.5, -0.25, 0, 0.25, 0.5, 1])
    .range(["#7f1119", "#c22f39", "#e38a82", "#cdc3ab", "#8fa9dd", "#4c74cc", "#132c78"]).interpolate(d3.interpolateLab).clamp(true);
  V.corNota = (n) => (n == null ? "#c9ccd1" : corEsc(n));
  V.textoNota = (n) => (n != null && d3.lab(corEsc(n)).l < 50 ? "#fff" : "#16181d");
  /* fundo + texto legíveis (contraste 4,5:1) para textos pequenos sobre a cor da nota */
  V.parNota = (n) => { if (n == null) return ["#c9ccd1", "#16181d"]; const c = d3.lab(corEsc(n)); if (c.l < 47) { c.l = Math.min(c.l, 44); return [c.formatHex(), "#fff"]; } if (c.l > 60) return [c.formatHex(), "#16181d"]; c.l = 44; return [c.formatHex(), "#fff"]; };
  V.faixa = (n) => (n == null ? null : n < -0.25 ? "esquerda" : n > 0.25 ? "direita" : "centro");
  const FX = { esquerda: { nome: "Esquerda", art: "a esquerda", cor: "#c22f39" }, centro: { nome: "Centro", art: "o centro", cor: "#cdc3ab" }, direita: { nome: "Direita", art: "a direita", cor: "#2f55b5" } };
  const FAIXAS5 = [[-1, -0.5, "esquerda"], [-0.5, -0.25, "centro-esquerda"], [-0.25, 0.25, "centro"], [0.25, 0.5, "centro-direita"], [0.5, 1, "direita"]];
  V.nome5 = (n) => (n == null ? "sem nota" : FAIXAS5.find(([a, b], i) => n < b || i === 4)[2]);
  const fmtNota = (n) => (n == null ? "sem nota" : (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(2).replace(".", ","));

  /* ---------- duas réguas. A escolhida reescreve a nota (w[8]) de todo resultado já carregado; a de Harvard fica guardada em w[10] ---------- */
  /* três réguas: a média dos três estudos (padrão), a pesquisa de Harvard e a nossa, pelo voto na Câmara */
  let REGUA = "consenso";
  try { const r = localStorage.getItem("vav-regua2"); if (r === "harvard" || r === "voto") REGUA = r; } catch (e) {}
  V.regua = () => REGUA;
  const NOME_REGUA = { consenso: "pelos estudos e pelo voto", voto: "pelo voto na Câmara", harvard: "pela pesquisa de Harvard" };
  const notasDaRegua = (ano) => (REGUA === "voto" ? BR.ideoV.anos[ano] : REGUA === "consenso" ? BR.ideoC.anos[ano] : null) || {};
  function aplicarRegua() {
    if (!BR) return;
    for (const [k, d] of Object.entries(window.__D || {})) {
      const m = /^br\/venc\/[A-Z]+(\d{4})$/.exec(k);
      if (!m || d.__regua === REGUA) continue;
      const notas = notasDaRegua(m[1]);
      for (const w of Object.values(d)) { if (w[10] === undefined) w[10] = w[8]; const n = notas[w[2]]; w[8] = REGUA === "harvard" ? w[10] : REGUA === "consenso" ? (n ? n[0] : null) : n ? n[0] : w[10]; }
      Object.defineProperty(d, "__regua", { value: REGUA, writable: true, configurable: true, enumerable: false });
    }
  }
  const notaDe = (sg, ano) => {
    if (REGUA === "consenso") { const c = BR.ideoC.anos[ano] && BR.ideoC.anos[ano][sg]; return c ? c[0] : null; }
    const v = REGUA === "voto" && BR.ideoV.anos[ano] && BR.ideoV.anos[ano][sg], h = BR.ideoH.anos[ano] && BR.ideoH.anos[ano][sg]; return v ? v[0] : h ? h[0] : null;
  };
  V.notaDe = (sg, ano) => (BR ? notaDe(sg, String(ano)) : null);
  const dadosBase = V.dados;
  V.dados = (k) => dadosBase(k).then((d) => { if (/^br\/venc\//.test(k)) aplicarRegua(); return d; });

  let BR = null;
  async function base() {
    if (BR) return BR;
    // desenhos do mapa já projetados (scripts/geo_proj.js): o navegador não precisa calcular a projeção de 5.566 cidades
    const [cid, ideoH, ideoV, ideoC] = await Promise.all([V.dados("br/cidades"), V.dados("br/ideologia"), V.dados("br/ideologia_voto"), V.dados("br/ideologia_consenso")]);
    const lista = cid.map((r) => ({ tse: r[0], ibge: r[1], nome: r[2], uf: r[3], capital: !!r[4], pop: r[5], pib: r[6], prim: r[7] || 1994, n: V.norm(r[2]) }));
    BR = { lista, porIbge: new Map(lista.map((c) => [c.ibge, c])), porTse: new Map(lista.map((c) => [c.tse, c])), ideoH, ideoV, ideoC, geo: null };
    // a régua pelo voto só mede partidos de 2019 em diante; para eleições antigas vale a de Harvard
    for (const a of Object.keys(ideoH.anos)) if (!ideoV.anos[a]) ideoV.anos[a] = ideoH.anos[a];
    Object.defineProperty(BR, "ideo", { get: () => (REGUA === "voto" ? BR.ideoV : REGUA === "consenso" ? BR.ideoC : BR.ideoH) });
    aplicarRegua();
    return BR;
  }
  V.baseBR = base;

  /* cidade sem vencedor no mapa: por quê. O mapa usa o desenho atual das cidades, então uma cidade criada depois
     ainda não tem resultado próprio nos anos de antes (os eleitores dela votavam na cidade de origem). */
  const SEM_PREF = { "5300108": "O Distrito Federal não tem prefeito: quem governa Brasília é o governador.", "2605459": "Fernando de Noronha é um distrito de Pernambuco, governado pelo estado, e não tem prefeito." };
  const SEM_VER = { "5300108": "O Distrito Federal não tem vereadores: as leis de Brasília são feitas pela Câmara Legislativa, eleita com os deputados distritais.", "2605459": "Fernando de Noronha é um distrito de Pernambuco e não tem câmara de vereadores." };
  function porQue(ib, w, ano, cargo) {
    if (w) return w[9] ? "venc" : "indef";
    const c = BR.porIbge.get(ib);
    if ((cargo === "PREF" || cargo === "VER") && SEM_PREF[ib]) return "semPref";
    if (c && c.prim > ano) return "novo";
    return "semArq";
  }
  V.porQueBR = (ib, ano, cargo, w) => porQue(ib, w, ano, cargo);
  const agora = () => BR.eleicao;   // a eleição na tela, gravada pela rota antes de desenhar o mapa
  const textoPorQue = (k, c, ano, cargo) => ({
    indef: [`${c.nome} ficou sem resultado oficial em ${ano}`, `O TSE não declarou ninguém eleito em ${c.nome} em ${ano}: a eleição foi anulada ou ficou em julgamento.`],
    semPref: [`${c.nome} não elege ${cargo === "VER" ? "vereadores" : "prefeito"}`, (cargo === "VER" ? SEM_VER : SEM_PREF)[c.ibge]],
    novo: [`${c.nome} ainda não era município em ${ano}`, `Os eleitores de lá votavam na cidade de onde ela se separou. A primeira eleição de ${c.nome} foi em ${c.prim}.`],
    semArq: [`${c.nome} ficou sem resultado oficial em ${ano}`, ano >= 2004 ? `O arquivo oficial do TSE não traz o resultado de ${c.nome} para ${NOME_CG[cargo]} em ${ano}. Em geral, isso acontece quando a Justiça Eleitoral anula a eleição da cidade ou ela ainda está em julgamento.` : `O arquivo oficial do TSE de ${ano} não traz o resultado de ${c.nome} para ${NOME_CG[cargo]}.`],
  })[k];
  // o desenho do mapa (2 MB) só é carregado por quem desenha mapa
  let geoProm = null;
  V.geoBR = () => geoProm || (geoProm = (async () => {
    await base(); const G = await V.dados("br/geo_proj");
      const geo = { W: G.W, H: G.H, mesh: G.mesh, mun: G.m.map((r) => ({ id: r[0], d: r[1], b: [[r[2], r[3]], [r[4], r[5]]], c: [r[6], r[7]] })), ufs: G.uf.map((r) => ({ sg: r[0], d: r[1], b: [[r[2], r[3]], [r[4], r[5]]] })) };
      geo.porId = new Map(geo.mun.map((f) => [f.id, f]));
      BR.geo = geo; return geo;
  })());

  /* eleições do mapa; as que ainda não chegaram aparecem desligadas */
  const GERAIS = [1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026], MUNIC = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
  // cargos de eleição proporcional: a cidade fica com a cor do partido mais votado (candidatos + legenda)
  const PROP = { DF: true, DE: true, VER: true };
  const ELEICOES = {
    // do cargo maior para o menor: os botões aparecem nesta ordem
    PRES: { nome: "Presidente", anos: GERAIS, prontos: GERAIS },
    GOV: { nome: "Governador", anos: GERAIS, prontos: GERAIS },
    SEN: { nome: "Senador", anos: GERAIS, prontos: GERAIS },
    DF: { nome: "Dep. federal", anos: GERAIS, prontos: GERAIS },
    DE: { nome: "Dep. estadual", anos: GERAIS, prontos: GERAIS },
    PREF: { nome: "Prefeito", anos: MUNIC, prontos: MUNIC },
    VER: { nome: "Vereador", anos: MUNIC, prontos: MUNIC },
  };
  V.ELEICOES_BR = ELEICOES;


  /* link que guarda a eleição escolhida (prefeito 2024 é o padrão e não aparece no endereço) */
  const lk = (uf, ib, e, cam) => { const cg = e ? e[0] : H ? H.cargo : "PREF", an = e ? e[1] : H ? H.ano : 2024, cm = cam || (H && H.cam) || "venc"; return "#/mapa" + (cg === "PREF" && an === 2024 ? "" : `/e/${cg}${an}`) + (cm !== "venc" ? `/v/${cm}` : "") + (uf ? "/br/" + uf + (ib ? "/c/" + ib : "") : ""); };
  V.linkBR = (uf, ib) => lk(uf, ib);
  const NO_UF = (uf) => (uf ? DO_UF[uf].replace(/^do /, "no ").replace(/^da /, "na ").replace(/^de /, "em ") : "no Brasil");
  const NOME_CG = { PREF: "prefeito", PRES: "presidente", GOV: "governador", SEN: "senador", DF: "deputado federal", DE: "deputado estadual", VER: "vereador" };
  // o mesmo resumo é pedido várias vezes por tela (título, placar, painel): guarda o resultado
  const memoResumo = new WeakMap();
  function resumo(venc, filtro) {
    const chave = (filtro || "BR") + "|" + REGUA; let m = memoResumo.get(venc); if (!m) memoResumo.set(venc, (m = new Map()));
    if (!m.has(chave)) m.set(chave, resumoCalc(venc, filtro));
    return m.get(chave);
  }
  // cidades de hoje sem resultado nesta eleição, pelo motivo, no Brasil e em cada estado (uma passada só por eleição)
  const memoFaltas = new WeakMap();
  function faltas(venc) {
    if (memoFaltas.has(venc)) return memoFaltas.get(venc);
    const { ano, cargo } = BR.eleicao || {}, out = { BR: {} };
    if (ano) for (const c of BR.lista) {
      if (venc[c.ibge]) continue; const k = porQue(c.ibge, null, ano, cargo), u = out[c.uf] || (out[c.uf] = {});
      u[k] = (u[k] || 0) + 1; out.BR[k] = (out.BR[k] || 0) + 1;
    }
    memoFaltas.set(venc, out); return out;
  }
  function resumoCalc(venc, filtro) {
    const r = { esquerda: 0, centro: 0, direita: 0, pop: { esquerda: 0, centro: 0, direita: 0 }, indef: 0, semNota: 0, total: 0, partidos: new Map() };
    for (const ib in venc) {
      const w = venc[ib], c = BR.porIbge.get(ib); if (!c || (filtro && c.uf !== filtro)) continue;
      if (!w[9]) { r.indef++; continue; }
      const f = V.faixa(w[8]); if (!f) { r.semNota++; continue; }
      r[f]++; r.total++; r.pop[f] += c.pop || 0;
      const p = r.partidos.get(w[2]) || { sg: w[2], n: 0, nota: w[8] }; p.n++; r.partidos.set(w[2], p);
    }
    r.todas = r.total + r.semNota;   // os títulos contam todas as cidades com resultado, inclusive as de partido sem nota
    // as cidades de hoje que ficam sem vencedor nesta eleição, pelo motivo
    const fx = faltas(venc)[filtro || "BR"] || {}; r.semArq = fx.semArq || 0; r.novo = fx.novo || 0; r.semPref = fx.semPref || 0;
    r.semRes = r.indef + r.semArq;
    return r;
  }
  /* candidatos que mais venceram cidades no recorte, com a faixa de cada um */
  function vencedoresPorNome(venc, uf) {
    const m = new Map();
    for (const [ib, w] of Object.entries(venc)) { const c = BR.porIbge.get(ib); if (!c || (uf && c.uf !== uf) || !w[9]) continue; const k = w[1] + "|" + w[2]; const o = m.get(k) || { nome: V.titulo(w[1]), sg: w[2], f: V.faixa(w[8]), n: 0 }; o.n++; m.set(k, o); }
    return [...m.values()].sort((a, b) => b.n - a.n);
  }
  function rotulosPlacar(cargo, venc, uf) {
    if (cargo === "PREF" || PROP[cargo]) return null;
    const rot = {}; for (const v of vencedoresPorNome(venc, uf)) if (!rot[v.f]) rot[v.f] = v.nome; return rot;
  }
  function votosDe(RES, uf) { const sc = uf ? RES.UF[uf] : RES.BR; if (!sc) return null; const t = sc.t2 ? "t2" : "t1"; const tot = sc[t].reduce((a, x) => a + x[1], 0); return { t, l: sc[t].map(([sq, v]) => ({ k: RES.c[sq], v, p: (100 * v) / tot })), t1: sc.t1 }; }
  function mancheteMaj(r, ano, cargo, uf, RES) {
    const vs = vencedoresPorNome(BR.venc, uf), a = vs[0], b = vs[1];
    const onde = uf ? DO_UF[uf] : "do Brasil", em = NO_UF(uf);
    const tit = `Em ${ano}, ${a.nome} ${cargo === "PREF" ? "venceu" : "ficou em primeiro"} em <span class="conta" data-f="${a.f}">${V.int(a.n)}</span> das <span class="conta" data-f="todas">${V.int(r.todas)}</span> cidades ${onde}`;
    const vt = votosDe(RES, uf); let sub = b ? `${b.nome} ${cargo === "PREF" ? "venceu" : "ficou em primeiro"} em ${V.int(b.n)}. ` : "";
    if (vt && vt.l.length > 1) sub += `${vt.t === "t2" ? "No 2º turno" : "No 1º turno"}, ${em}, ${V.titulo(vt.l[0].k[0])} teve ${V.pct(vt.l[0].p)} dos votos válidos e ${V.titulo(vt.l[1].k[0])}, ${V.pct(vt.l[1].p)}.`;
    return { tit, sub };
  }
  function manchete(r, ano, cargo, uf, RES) {
    if (cargo !== "PREF" && !PROP[cargo] && !ESTADUAL(cargo, uf)) return mancheteMaj(r, ano, cargo, uf, RES);
    const ordem = ["direita", "centro", "esquerda"].sort((a, b) => r[b] - r[a]);
    const [m, s1, s2] = ordem, popT = r.pop.esquerda + r.pop.centro + r.pop.direita;
    const onde = uf ? DO_UF[uf] : "do Brasil";
    const tit = cargo === "PREF" ? `Em ${ano}, ${FX[m].art} venceu em <span class="conta" data-f="${m}">${V.int(r[m])}</span> das <span class="conta" data-f="todas">${V.int(r.todas)}</span> prefeituras ${onde}`
      : `Em ${ano}, para ${NOME_CG[cargo]}, ${FX[m].art} foi ${m === "centro" ? "o mais votado" : "a mais votada"} em <span class="conta" data-f="${m}">${V.int(r[m])}</span> das <span class="conta" data-f="todas">${V.int(r.todas)}</span> cidades ${onde}`;
    const verbo = cargo === "PREF" ? "venceu" : "ficou na frente";
    const sub = (PROP[cargo] ? "Cada cidade tem a cor do partido mais votado, somando os votos nos candidatos e na legenda. " : "") + `Essas cidades reúnem ${V.pct((100 * r.pop[m]) / (popT || 1), 0)} dos moradores. ${FX[s1].art[0].toUpperCase() + FX[s1].art.slice(1)} ${verbo} em ${V.int(r[s1])} e ${FX[s2].art}, em ${V.int(r[s2])}.`;
    return { tit, sub };
  }
  /* cargos proporcionais: o partido mais votado na cidade e por quanto */
  function mancheteProp(c, w, P, ano, cargo) {
    if (!w) { const [t, s] = textoPorQue(porQue(c.ibge, null, ano, cargo), c, ano, cargo); return { tit: t, sub: s }; }
    const lst = (P && P[c.uf] && P[c.uf][c.tse]) || [], tot = lst.reduce((a, x) => a + x[1], 0), top = P && P[c.uf] && P[c.uf]._c && P[c.uf]._c[c.tse];
    const n1 = V.nomePartido(w[2]), tit = `Em ${c.nome}, o partido mais votado para ${NOME_CG[cargo]} em ${ano} foi o ${n1}`;
    if (!lst.length || !tot) return { tit, sub: "" };
    const [s1, v1] = lst[0], [s2, v2] = lst[1] || [null, 0];
    const sub = `${V.pct((100 * v1) / tot)} dos votos${s2 ? `, contra ${V.pct((100 * v2) / tot)} do ${V.nomePartido(s2)}` : ""}, somando candidatos e legenda.${top ? ` Quem teve mais votos aqui foi ${V.titulo(top[0])} (${V.nomePartido(top[1])}), com ${V.int(top[2])}.` : ""}`;
    return { tit, sub, v1, v2, tot, k1: [s1, s1], k2: s2 ? [s2, s2] : null, rot1: V.nomePartido(s1), rot2: s2 ? V.nomePartido(s2) : "" };
  }
  async function painelProp(el, ib, ano, cargo) {
    const c = BR.porIbge.get(ib);
    el.innerHTML = `<p class="lado__volta"><a href="${lk(c.uf)}">← ${UFN[c.uf]}</a></p><h2 class="lado__cidade">${V.esc(c.nome)}</h2>
      <p class="lado__fatos">${UFN[c.uf]}${c.capital ? " · capital" : ""} · ${V.int(c.pop)} moradores (Censo 2022)</p><div id="cid-corpo"><p class="vazio">Carregando…</p></div>`;
    let P = null; try { P = await V.dados("br/prop/" + cargo + ano); } catch (e) {}
    const lst = P && P[c.uf] && P[c.uf][c.tse], corpo = document.getElementById("cid-corpo");
    if (!lst) { corpo.innerHTML = '<p class="vazio">' + V.esc(textoPorQue(porQue(ib, null, ano, cargo), c, ano, cargo)[1]) + '</p><div id="hist"></div>'; document.getElementById("hist").innerHTML = await historicoHtml(ib); return; }
    const notas = BR.ideo.anos[ano] || {}, nt = (sg) => (notas[sg] ? notas[sg][0] : null), tot = lst.reduce((a, x) => a + x[1], 0);
    const top = P[c.uf]._c && P[c.uf]._c[c.tse];
    corpo.innerHTML = `<h3 class="lado__turno">Votos por partido para ${NOME_CG[cargo]} em ${ano}</h3><p class="lado__sub">Votos nos candidatos do partido mais os votos só no número do partido (legenda)${ano < 2000 ? "; antes de 2000 o TSE não separa a legenda, e só entram os votos nos candidatos" : ""}.</p>
      <ol class="ranking">${lst.map(([sg, v]) => `<li><span class="ranking__sg">${V.esc(sg === "outros" ? "Outros partidos" : V.nomePartido(sg))}</span><span class="ranking__barra"><i style="width:${(100 * v) / lst[0][1]}%;background:${sg === "outros" ? "#c9ccd1" : V.corNota(nt(sg))}"></i></span><b>${V.pct((100 * v) / tot, 0)}</b><small>${V.int(v)}</small></li>`).join("")}</ol>
      ${top ? `<p class="lado__sub">Candidato com mais votos na cidade: <b>${V.esc(V.titulo(top[0]))}</b> (${V.esc(V.nomePartido(top[1]))}), ${V.int(top[2])} votos.</p>` : ""}<div id="hist"></div>`;
    document.getElementById("hist").innerHTML = await historicoHtml(ib);
  }
  /* manchete de uma cidade: quem venceu e por quanto */
  function mancheteCidade(c, w, U, ano, cargo) {
    if (!w) { const [t, s] = textoPorQue(porQue(c.ibge, null, ano, cargo), c, ano, cargo); return { tit: t, sub: s }; }
    if (!U || !U.r[c.tse]) return { tit: `${c.nome}: sem resultado para ${NOME_CG[cargo]} em ${ano}`, sub: "" };
    const r = U.r[c.tse], t = r.t2 ? "t2" : "t1", rs = r[t], tot = rs.reduce((a, x) => a + x[1], 0);
    const k1 = U.c[w[0]], k2 = w[6] ? U.c[w[6]] : null, v1 = (rs.find((x) => x[0] === w[0]) || [0, 0])[1], v2 = w[6] ? (rs.find((x) => x[0] === w[6]) || [0, 0])[1] : 0;
    if (!w[9]) return { tit: `${c.nome} ficou sem prefeito definido em ${ano}`, sub: "O TSE não marcou nenhum candidato como eleito (eleição anulada ou em julgamento)." };
    const nome = V.titulo(k1[0]) + " (" + k1[1] + ")";
    const tit = !k2 ? `Em ${c.nome}, ${nome} foi eleito sem adversário em ${ano}` : `Em ${c.nome}, ${nome} ${cargo === "PREF" ? "venceu" : "ficou à frente"} por ${V.int(v1 - v2)} ${v1 - v2 === 1 ? "voto" : "votos"}${t === "t2" ? " no 2º turno" : ""}`;
    let sub = k2 ? `${V.pct((100 * v1) / tot)} a ${V.pct((100 * v2) / tot)} contra ${V.titulo(k2[0])} (${k2[1]}).` : "";
    if (t === "t2" && r.t1) { const p1 = r.t1.findIndex((x) => x[0] === w[0]); if (p1 > 0) sub += " No 1º turno, tinha ficado em " + (p1 + 1) + "º lugar."; }
    return { tit, sub, v1, v2, tot, k1, k2 };
  }
  const plural = (n, um, varios) => V.int(n) + " " + (n === 1 ? um : varios);
  const ORD = ["esquerda", "centro", "direita"];
  let ROT = null;
  // dentro da fatia só vão número e porcentagem (cabem sempre); os nomes ficam na legenda logo abaixo, sem cortar
  // o número só entra se couber inteiro na largura da fatia (sem cortar "460" em "46")
  let PLW = 480;
  const fatiaHtml = (f, n, tot) => {
    if (!n) return ""; const p = (100 * n) / (tot || 1), txt = V.int(n), larg = (p / 100) * PLW, dig = PLW < 420 ? 11 : 13.5;
    if (larg < 26 + txt.length * dig) return "";
    return `<b>${txt}</b>${p >= 11 && larg >= 64 ? `<span>${V.pct(p, 0)}</span>` : ""}`;
  };
  const legendaPlacar = (r, rot) => `<p class="placar-nomes">${ORD.filter((f) => r[f]).map((f) => `<span><i class="placar-nomes__cor placar-nomes__cor--${f}"></i>${V.esc((rot && rot[f]) || FX[f].nome)}</span>`).join("")}</p>`;
  function placar(r, rot) {
    ROT = rot;
    return `<div class="placar" role="img" aria-label="${ORD.map((f) => ((rot && rot[f]) || FX[f].nome) + ": " + r[f] + " cidades").join(", ")}">${ORD.map((f) => `<div class="placar__fatia placar__fatia--${f}" data-f="${f}" style="flex-basis:${(100 * r[f]) / (r.total || 1)}%">${fatiaHtml(f, r[f], r.total)}</div>`).join("")}</div>`;
  }
  function apuracaoHtml(pronto) {
    return `<div class="apuracao" id="apuracao"><span class="apuracao__rot"><span id="apu-rot">${pronto ? "Apuração concluída" : "Apurando"}</span> · <b id="apu-pct">${pronto ? "100%" : "0%"}</b> das cidades</span>
      <span class="apuracao__trilho"><i id="apu-barra" style="width:${pronto ? 100 : 0}%"></i></span>
      <button class="apuracao__rever" id="apu-rever" ${pronto ? "" : "hidden"}><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M12 1.5v3h-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>Rever a apuração</button></div>`;
  }
  /* a abertura conta os votos como na noite da eleição: as cidades chegam aos poucos e o placar sobe até 100% */
  function apurar(venc, r, M, aoFim) {
    const ids = Object.keys(venc).filter((ib) => BR.porIbge.get(ib));
    // ordem embaralhada, mas sempre a mesma (semente fixa), como os boletins chegando de todo o país
    let sem = 7; const rnd = () => ((sem = (sem * 16807) % 2147483647) / 2147483647);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const N = ids.length, acc = { esquerda: [0], centro: [0], direita: [0], total: [0], todas: [0] };
    ids.forEach((ib, i) => { const w = venc[ib], f = w[9] ? V.faixa(w[8]) : null; for (const k of [...ORD, "total"]) acc[k].push(acc[k][i] + ((k === "total" ? !!f : f === k) ? 1 : 0)); acc.todas.push(acc.todas[i] + (w[9] ? 1 : 0)); });
    const fat = {}; document.querySelectorAll(".placar__fatia").forEach((el) => (fat[el.dataset.f] = el));
    const contas = [...document.querySelectorAll(".manchete__titulo .conta")];
    const barra = document.getElementById("apu-barra"), pct = document.getElementById("apu-pct"), rot = document.getElementById("apu-rot");
    const sub = document.querySelector(".manchete__sub"); sub.classList.add("apuracao-esconde");
    document.getElementById("apu-rever").hidden = true; rot.textContent = "Apurando";
    M.limpar(venc); const plc = document.querySelector(".placar"); if (plc) plc.classList.add("apurando");
    const D = 3200, t0 = performance.now(); let feito = 0;
    function quadro(agora) {
      if (!barra.isConnected) return;   // a pessoa saiu do mapa no meio da apuração
      const t = Math.max(0, Math.min(1, (agora - t0) / D)), e = d3.easeCubicOut(t), n = Math.round(e * N);
      M.pintar(ids.slice(feito, n), venc); feito = n;
      const tot = acc.total[n];
      for (const f of ORD) { fat[f].style.flexBasis = (100 * acc[f][n]) / (tot || 1) + "%"; fat[f].innerHTML = fatiaHtml(f, acc[f][n], tot); }
      contas.forEach((el) => (el.textContent = V.int(acc[el.dataset.f][n])));
      barra.style.width = (100 * n) / N + "%"; pct.textContent = Math.floor((100 * n) / N) + "%";
      if (t < 1) requestAnimationFrame(quadro);
      else { if (plc) plc.classList.remove("apurando"); rot.textContent = "Apuração concluída"; pct.textContent = "100%"; sub.classList.remove("apuracao-esconde"); document.getElementById("apu-rever").hidden = false; if (aoFim) aoFim(); }
    }
    requestAnimationFrame(quadro);
  }
  const ESTADUAL = (cargo, uf) => (cargo === "GOV" || cargo === "SEN") && !uf;
  function ranking(r, ano, cargo, uf, RES) {
    if (cargo !== "PREF" && !PROP[cargo] && !ESTADUAL(cargo, uf)) {
      const vt = votosDe(RES, uf); if (!vt) return "";
      const sc = vt.t1, tot = sc.reduce((a, x) => a + x[1], 0), mx = sc[0][1], notas = BR.ideo.anos[ano] || {};
      return `<h2 class="lado__titulo">Votos no 1º turno ${NO_UF(uf)}</h2><p class="lado__sub">Todos os candidatos. Cada barra tem a cor da nota do partido ${NOME_REGUA[REGUA]}.</p>
        <ol class="ranking ranking--cand">${sc.map(([sq, v]) => { const k = RES.c[sq], n = notas[k[1]] ? notas[k[1]][0] : null; return `<li><span class="ranking__sg">${V.esc(V.titulo(k[0]))} <small>${V.esc(V.nomePartido(k[1]))}</small></span><span class="ranking__barra"><i style="width:${(100 * v) / mx}%;background:${V.corNota(n)}"></i></span><b>${V.pct((100 * v) / tot)}</b><small>${fmtNota(n)}</small></li>`; }).join("")}</ol>`;
    }
    const ps = [...r.partidos.values()].sort((a, b) => b.n - a.n).slice(0, 12), mx = ps.length ? ps[0].n : 1;
    return `<h2 class="lado__titulo">${cargo === "PREF" ? "Quem mais elegeu prefeitos" : PROP[cargo] ? `Partido mais votado para ${NOME_CG[cargo]}, em número de cidades` : `Partido do candidato a ${NOME_CG[cargo]} mais votado, em número de cidades`}</h2><p class="lado__sub">Cada barra tem a cor da nota do partido ${NOME_REGUA[REGUA]}. <span class="so-mouse">Passe o mouse num partido para ver as cidades dele no mapa.</span></p>
      <ol class="ranking">${ps.map((p) => `<li data-sg="${V.esc(p.sg)}"><span class="ranking__sg">${V.esc(V.nomePartido(p.sg))}</span><span class="ranking__barra"><i style="width:${(100 * p.n) / mx}%;background:${V.corNota(p.nota)}"></i></span><b>${V.int(p.n)}</b><small>${fmtNota(p.nota)}</small></li>`).join("")}</ol>`;
  }
  function porEstado(venc, ufSel, cargo) {
    const linhas = Object.keys(UFN).filter((s) => s !== "DF").map((s) => { const q = resumo(venc, s); return { s, q, pd: q.direita / (q.total || 1) }; }).sort((a, b) => b.pd - a.pd);
    return `<h2 class="lado__titulo lado__titulo--2">Estado por estado</h2><p class="lado__sub">Do mais à direita ao mais à esquerda. Clique para aproximar.</p>
      <ol class="estados-lista">${linhas.map(({ s, q }) => `<li${s === ufSel ? ' aria-current="true"' : ""}><a href="${lk(s)}" data-uf="${s}"><span class="estados-lista__uf">${s}${GRUPO.includes(s) ? '<i title="Estado do grupo"></i>' : ""}</span>
        <span class="estados-lista__barra">${ORD.map((f) => `<i style="flex-basis:${(100 * q[f]) / (q.total || 1)}%;background:${FX[f].cor}"></i>`).join("")}</span><span class="estados-lista__n">${V.pct((100 * q.direita) / (q.total || 1), 0)}</span></a></li>`).join("")}</ol>
      <p class="estados-lista__leg"><i class="g"></i>estado do grupo · número = parte ${cargo === "PREF" ? "das prefeituras" : "das cidades"} com a direita</p>`;
  }
  /* a régua dos partidos do ano: uma linha por partido, do mais à esquerda ao mais à direita, todas na mesma escala */
  function regua(ano, cargo, RES) {
    const notas = BR.ideo.anos[ano] || {}, venc = BR.venc;
    const conta = {}; for (const w of Object.values(venc)) if (w[9]) conta[w[2]] = (conta[w[2]] || 0) + 1;
    const doCargo = cargo !== "PREF" && RES ? new Set(Object.values(RES.c).map((k) => k[1])) : null;
    const ps = Object.entries(notas).filter(([s, v]) => v[0] != null && (doCargo ? doCargo.has(s) : (conta[s] || 0) >= 60)).map(([s, v]) => ({ s, nome: V.nomePartido(s), n: v[0], inc: v[1], txt: v[2], c: conta[s] })).sort((a, b) => a.n - b.n);
    const est = V.largura() < 600, W = est ? 360 : 860, lab = est ? 104 : 150, dir = est ? 12 : 190, lin = est ? 34 : 30, top = 28;
    const H = top + ps.length * lin + 24, x = d3.scaleLinear().domain([-1, 1]).range([lab, W - dir]);
    const rotFaixa = (n) => V.nome5(n);
    const linhas = ps.map((p, i) => {
      const y = top + i * lin + lin / 2;
      const dica = V.esc(`${p.nome}: ${fmtNota(p.n)}, ${rotFaixa(p.n)}${p.c ? ` · ${V.int(p.c)} ${cargo === "PREF" ? "prefeituras" : "cidades"}` : ""}${p.txt ? ` · ${p.txt}` : ""}`);
      return `<g><title>${dica}</title>
        <text x="${lab - 12}" y="${y + 5}" text-anchor="end" class="regua__sg">${V.esc(p.nome)}</text>
        <line x1="${lab}" x2="${W - dir}" y1="${y}" y2="${y}" stroke="#d6dae0" stroke-width="2"/>
        <circle cx="${x(p.n)}" cy="${y}" r="${est ? 7 : 8}" fill="${V.corNota(p.n)}" stroke="#16181d" stroke-width="1.5"${p.inc ? ' stroke-dasharray="3 2"' : ""}/>
        ${est ? (p.inc ? `<text x="${x(p.n) + 12}" y="${y - 9}" class="regua__inc">?</text>` : "") : `<text x="${W - dir + 16}" y="${y + 5}" class="regua__faixa${p.inc ? " regua__faixa--inc" : ""}">${rotFaixa(p.n)}${p.inc ? (REGUA === "consenso" ? " (incerto)" : " (estimada)") : ""}</text>`}</g>`;
    }).join("");
    return `<svg class="regua regua--lista" viewBox="0 0 ${W} ${H}" role="img" aria-label="Posição dos partidos ${NOME_REGUA[REGUA]}, em ${ano}: ${ps.map((p) => p.nome + " " + fmtNota(p.n) + " " + rotFaixa(p.n)).join(", ")}">
      <rect x="${x(-0.25)}" y="${top - 6}" width="${x(0.25) - x(-0.25)}" height="${ps.length * lin + 6}" fill="#f1ede3"/>
      ${[-0.5, 0.5].map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="${top - 6}" y2="${H - 24}" stroke="#c9ccd1" stroke-dasharray="2 3"/>`).join("")}
      ${FAIXAS5.map(([a, b, nome]) => `<text x="${(x(a) + x(b)) / 2}" y="16" text-anchor="middle" class="regua__ext">${est ? nome.replace("centro-esquerda", "c.-esq.").replace("centro-direita", "c.-dir.") : nome}</text>`).join("")}
      ${linhas}
      <text x="${lab}" y="${H - 4}" class="regua__ext">−1</text><text x="${x(0)}" y="${H - 4}" text-anchor="middle" class="regua__ext">0</text><text x="${W - dir}" y="${H - 4}" text-anchor="end" class="regua__ext">+1</text>
    </svg>`;
  }

  /* ---------- mapa ---------- */
  function desenhar(host, aoClicar) {
    const W = BR.geo.W, H = BR.geo.H;
    host.innerHTML = "";
    const svg = d3.select(host).append("svg").attr("class", "mapa-svg mapa-br__svg").attr("viewBox", [0, 0, W, H]).attr("role", "img")
      .attr("aria-label", "Mapa do Brasil com as cidades pintadas pela posição ideológica do partido que venceu");
    svg.append("defs").html('<pattern id="hach" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#d9dce1"/><line x1="0" y1="0" x2="0" y2="6" stroke="#9aa0a8" stroke-width="2"/></pattern><pattern id="novo" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#e2e5e9"/><circle cx="2" cy="2" r=".95" fill="#7b818a"/></pattern>');
    const g = svg.append("g");
    const munG = g.append("g").attr("class", "muns").style("stroke-width", 0.35);
    const mun = munG.selectAll("path").data(BR.geo.mun).join("path").attr("class", "mun").attr("d", (f) => f.d);
    const veu = g.append("path").attr("class", "veu").attr("fill-rule", "evenodd").attr("d", null);
    const bord = g.append("path").attr("class", "uf-borda").attr("d", BR.geo.mesh).style("stroke-width", 1.6);
    const caps = BR.lista.filter((c) => c.capital).map((c) => { const f = BR.geo.porId.get(c.ibge); return f ? { c, xy: f.c } : null; }).filter(Boolean);
    const capG = g.append("g").attr("class", "capitais").style("display", "none");
    capG.selectAll("g").data(caps).join("g").attr("transform", (d) => `translate(${d.xy})`).call((s) => { s.append("circle").attr("r", 2.5); s.append("text").attr("x", 5).attr("y", 4).text((d) => d.c.nome); });
    let k = 1; const PERTO = 2.6;
    const zoom = d3.zoom().scaleExtent([1, 80]).filter((ev) => (ev.type === "wheel" ? ev.ctrlKey || ev.metaKey : !ev.button))
      .on("start", () => svg.classed("movendo", true))
      .on("zoom", (ev) => { k = ev.transform.k; g.attr("transform", ev.transform); bord.style("stroke-width", 1.6 / k); })
      .on("end", () => {
        svg.classed("movendo", false); munG.style("stroke-width", 0.35 / k);
        capG.style("display", k > 2.2 ? null : "none").selectAll("circle").attr("r", 2.6 / k).attr("stroke-width", 1 / k);
        capG.selectAll("text").attr("font-size", 12 / k).attr("x", 5 / k).attr("y", 4 / k).attr("stroke-width", 3 / k);
      });
    svg.call(zoom).on("dblclick.zoom", null);
    let aviso = null;
    svg.on("wheel", (ev) => { if (ev.ctrlKey || ev.metaKey) return; if (!aviso) { aviso = d3.select(host).append("div").attr("class", "mapa-aviso").text("Use Ctrl + rolagem (ou os botões +/−) para aproximar"); } aviso.classed("ver", true); clearTimeout(aviso._t); aviso._t = setTimeout(() => aviso.classed("ver", false), 1400); });
    // cidade sem vencedor: hachurada quando a eleição houve mas não tem resultado oficial; pontilhada quando não houve eleição ali
    const FUNDO = { indef: "url(#hach)", semArq: "url(#hach)", novo: "url(#novo)", semPref: "url(#novo)" };
    const corDe = (w, id) => (w && w[9] ? V.corNota(w[8]) : FUNDO[porQue(id, w, agora().ano, agora().cargo)]);
    const dicaSem = (c, w) => { const [t, s] = textoPorQue(porQue(c.ibge, w, agora().ano, agora().cargo), c, agora().ano, agora().cargo); return `<b>${V.esc(c.nome)} (${c.uf})</b>${V.esc(t.replace(c.nome + " ", "").replace(/^./, (x) => x.toUpperCase()))}.<br><small>${V.esc(s)}</small>`; };
    const elPor = new Map(); mun.each(function (f) { elPor.set(f.id, this); });
    // um único ouvinte para as 5.566 cidades (em vez de três por cidade)
    let aoMover = null;
    munG.on("mousemove", (ev) => { const f = ev.target.__data__; if (f && aoMover) aoMover(ev, f); }).on("mouseleave", () => V.dica(null, null))
      .on("click", (ev) => { const f = ev.target.__data__; if (!f) return; V.dica(null, null); aoClicar(f.id, k >= PERTO); });
    function colorirMetrica(valor, cor, dica) {
      mun.attr("fill", (f) => { const v = valor(f.id); return v != null ? cor(v) : BR.porIbge.get(f.id).prim > agora().ano ? "url(#novo)" : "url(#hach)"; });
      aoMover = (ev, f) => { const c = BR.porIbge.get(f.id); if (!c) return; V.dica(ev, dica(c) + (k < PERTO ? '<p class="dica__acao">Clique para aproximar ' + V.esc(UFN[c.uf]) + "</p>" : "")); };
    }
    // linhas da dica de uma cidade com vencedor; nos cargos proporcionais, o partido mais votado e o candidato mais votado
    const linhasVenc = (w, tudo) => {
      if (PROP[agora().cargo]) return [["Partido mais votado", V.nomePartido(w[2])], ["Votos do partido", V.pct(w[3])], ...(tudo ? [["Vantagem sobre o 2º", V.int(w[5]) + " votos (" + V.nomePartido(w[7] || "") + ")"], ["Candidato mais votado", V.titulo(w[1])], ["Nota do partido", fmtNota(w[8])]] : [])];
      return [["Venceu", V.titulo(w[1]) + " · " + w[2]], ["Votos válidos", V.pct(w[3])], ...(tudo ? [["Vantagem sobre o 2º", V.int(w[5]) + " votos"], ["Nota do partido", fmtNota(w[8])]] : [])];
    };
    function colorir(venc) {
      mun.attr("fill", (f) => corDe(venc[f.id], f.id));
      aoMover = (ev, f) => {
        const c = BR.porIbge.get(f.id); if (!c) return; const w = venc[c.ibge];
        if (k < PERTO) { V.dica(ev, (w && w[9] ? V.linhasDica(c.nome + " (" + c.uf + ")", linhasVenc(w, false)) : dicaSem(c, w)) + '<p class="dica__acao">Clique para aproximar ' + V.esc(UFN[c.uf]) + "</p>"); return; }
        V.dica(ev, w && w[9] ? V.linhasDica(c.nome + " (" + c.uf + ")", linhasVenc(w, true)) : dicaSem(c, w));
      };
    }
    function para(feat, ms = 800, frac = 0.86, kmax = 40) {
      const [[x0, y0], [x1, y1]] = feat.b, kk = Math.min(kmax, frac / Math.max((x1 - x0) / W, (y1 - y0) / H));
      svg.transition().duration(ms).call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(kk).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
    }
    function destacar(ib) { mun.filter(".mun--sel").classed("mun--sel", false); if (ib) mun.filter((f) => f.id === ib).classed("mun--sel", true).raise(); }
    // fora do estado escolhido, um véu claro (um único desenho, leve) em vez de apagar cidade por cidade
    function foco(uf) { const f = uf && BR.geo.ufs.find((x) => x.sg === uf); veu.attr("d", f ? `M${-W * 3},${-H * 3}H${W * 4}V${H * 4}H${-W * 3}Z` + f.d : null); }
    function realcar(pred) { mun.classed("mun--apagada", pred ? (f) => !pred(f.id) : false); }
    return {
      colorir, colorirMetrica, destacar, realcar, foco,
      // antes da apuração, as cidades que vão chegar ficam em branco; as que não têm resultado já aparecem com o motivo
      limpar: (venc) => mun.attr("fill", (f) => (venc && !venc[f.id] ? corDe(null, f.id) : "#eceef1")),
      pintar: (ids, venc) => ids.forEach((ib) => { const el = elPor.get(ib); if (el) el.setAttribute("fill", corDe(venc[ib], ib)); }),
      estado: (sg) => para(BR.geo.ufs.find((f) => f.sg === sg)),
      cidade: (ib) => { const f = BR.geo.porId.get(ib); if (f) para(f, 900, 0.14, 24); },
      brasil: () => svg.transition().duration(800).call(zoom.transform, d3.zoomIdentity),
      mais: () => svg.transition().duration(300).call(zoom.scaleBy, 1.8), menos: () => svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.8),
    };
  }

  /* ---------- painel da cidade ---------- */
  async function painelCidade(el, ib, ano, cargo) {
    const c = BR.porIbge.get(ib); if (!c) return;
    if (PROP[cargo]) return painelProp(el, ib, ano, cargo);
    const w = BR.venc[ib];
    el.innerHTML = `<p class="lado__volta"><a href="${lk(c.uf)}">← ${UFN[c.uf]}</a></p><h2 class="lado__cidade">${V.esc(c.nome)}</h2>
      <p class="lado__fatos">${UFN[c.uf]}${c.capital ? " · capital" : ""} · ${V.int(c.pop)} moradores (Censo 2022)</p><div id="cid-corpo"><p class="vazio">Carregando…</p></div>`;
    let U; try { U = (await V.dados("br/ufx/" + cargo + ano))[c.uf]; if (!U) throw new Error("sem dados"); } catch (e) { document.getElementById("cid-corpo").innerHTML = '<p class="vazio">Sem dados desta eleição.</p>'; return; }
    const r = U.r[c.tse]; if (!r) { document.getElementById("cid-corpo").innerHTML = '<p class="vazio">' + V.esc(textoPorQue(porQue(ib, null, ano, cargo), c, ano, cargo)[1]) + '</p><div id="hist"></div>'; document.getElementById("hist").innerHTML = await historicoHtml(ib); return; }
    const notas = BR.ideo.anos[ano] || {};
    const nt = (sg) => (notas[sg] ? notas[sg][0] : null);
    const turnos = r.t2 ? ["t1"] : ["t1"];
    await V.carregarFotos(ano);   // fotos do TSE (quando há): senão, as iniciais
    const vk = w && U.c[w[0]];
    const urna = vk ? `<div class="urna urna--compacta"><div class="urna__tela"><span class="urna__cab">SEU VOTO PARA</span><span class="urna__cargo">${V.CARGOS[cargo]} · ${ano}</span>
      <div class="urna__campos"><div class="urna__linha"><span>Número:</span><span class="digitos">${String(vk[2]).split("").map((d) => "<b>" + d + "</b>").join("")}</span></div>
      <div class="urna__linha"><span>Nome:</span><span class="urna__nome">${V.esc(V.titulo(vk[0]))}</span></div><div class="urna__linha"><span>Partido:</span><span><b>${V.esc(vk[1])}</b> <small class="nota-chip" style="background:${V.parNota(nt(vk[1]))[0]};color:${V.parNota(nt(vk[1]))[1]}">nota ${fmtNota(nt(vk[1]))} · ${V.nome5(nt(vk[1]))}</small></span></div></div>
      <div class="urna__foto">${V.fotoOu(ano, w[0], `<span class="iniciais" style="background:${V.parNota(nt(vk[1]))[0]};color:${V.parNota(nt(vk[1]))[1]}">${V.esc(V.iniciais(vk[0]))}</span>`)}</div>
      <div class="urna__rodape"><span class="urna__votos">${V.pct(w[3])}<small>dos votos válidos</small></span>${cargo === "PREF" ? `<span class="tecla ${w[9] ? "tecla--eleito" : "tecla--nao"}">${w[9] ? "Eleito" : "Sem resultado definido"}</span>` : `<span class="tecla tecla--nao">Mais votado aqui</span>${String(vk[3]).startsWith("ELEITO") ? '<span class="tecla tecla--eleito">Eleito no país</span>' : ""}`}</div></div></div>` : "";
    const lista = turnos.map((t) => {
      const rs = r[t], tot = rs.reduce((a, x) => a + x[1], 0);
      return `<h3 class="lado__turno">${r.t2 ? "Como foi o 1º turno" : "Todos os candidatos"}</h3><ul class="lista-cand lista-cand--curta">${rs.map(([sq, v]) => {
        const k = U.c[sq] || ["?", "?", "", ""], p = (100 * v) / (tot || 1);
        return `<li><span class="mini-foto" style="width:40px;height:40px">${V.fotoOu(ano, sq, `<span class="iniciais" style="background:${V.parNota(nt(k[1]))[0]};color:${V.parNota(nt(k[1]))[1]};font-size:16px">${V.esc(V.iniciais(k[0]))}</span>`)}</span>
          <span><span class="cand-nome">${V.esc(V.titulo(k[0]))}<small>${V.esc(k[1])}</small>${String(k[3]).startsWith("ELEITO") ? '<span class="selo selo--eleito">Eleito</span>' : ""}</span><span class="barra"><i style="width:${p}%;background:${V.corNota(nt(k[1]))}"></i></span></span>
          <span class="cand-num">${V.pct(p)}<small>${V.int(v)} votos</small></span></li>`;
      }).join("")}</ul>`;
    }).join("");
    document.getElementById("cid-corpo").innerHTML = urna + lista + '<div id="hist"></div>';
    document.getElementById("hist").innerHTML = await historicoHtml(ib);
  }

  /* ---------- o ato de votar: quem foi, quem faltou, quem anulou ou votou em branco ---------- */
  const legVenc = () => `<span class="mapa-leg__escala"><span>Esquerda</span><i></i><span>Direita</span></span>
      <a class="mapa-leg__regua" href="#/mapa" data-alvo="reguas">Régua ${REGUA === "voto" && H && H.ano < 2018 ? "de Harvard (para anos antes de 2019)" : NOME_REGUA[REGUA]}</a>
      <span class="mapa-leg__item" id="leg-indef-box" hidden><i class="mapa-leg__risco"></i><span>Sem resultado oficial (<span id="leg-indef"></span>)</span></span>
      <span class="mapa-leg__item" id="leg-novo-box" hidden><i class="mapa-leg__novo"></i><span>Ainda não era município (<span id="leg-novo"></span>)</span></span>
      <span class="mapa-leg__item" id="leg-pref-box" hidden><i class="mapa-leg__novo"></i><span id="leg-pref">Brasília e Fernando de Noronha não têm prefeito</span></span>
      <span class="mapa-leg__item" id="leg-sem-box" hidden><i class="mapa-leg__sem"></i><span>Partido que os estudos não medem (<span id="leg-sem"></span>)</span></span>
      <span class="mapa-leg__dica"><span class="so-mouse">Clique num estado, depois numa cidade · Ctrl + rolagem aproxima</span><span class="so-toque">Toque num estado, depois numa cidade · dois dedos aproximam</span></span>`;
  const MET = {
    abst: { cores: ["#f7f1e6", "#ecd2a4", "#d49a4a", "#9c5d16", "#58320a"], valor: (t) => (t[0] ? (100 * t[2]) / t[0] : null), rot: "eleitores que não foram votar" },
    bn: { cores: ["#f4f1f8", "#d3c7e6", "#a48ccb", "#6d51a3", "#3b2766"], valor: (t) => (t[1] ? (100 * (t[3] + t[4])) / t[1] : null), rot: "votos brancos e nulos" },
  };
  const soma = (comp, uf) => { const s = [0, 0, 0, 0, 0, 0]; for (const [ib, o] of Object.entries(comp)) { const c = BR.porIbge.get(ib); if (!c || (uf && c.uf !== uf) || !o.t1) continue; o.t1.forEach((v, i) => (s[i] += v)); } return s; };
  const soma2 = (comp, uf) => { const s = [0, 0, 0, 0, 0, 0]; let tem = false; for (const [ib, o] of Object.entries(comp)) { const c = BR.porIbge.get(ib); if (!c || (uf && c.uf !== uf) || !o.t2) continue; tem = true; o.t2.forEach((v, i) => (s[i] += v)); } return tem ? s : null; };
  const mi = (n) => (n >= 1e6 ? V.int(Math.round(n / 1e5) / 10).replace(/(\d)$/, "$1") + "" : V.int(n));
  const milhoes = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",") + " milhões" : V.int(n));
  async function atualizarMetrica(uf, ib, cargo, ano, cam, trocou) {
    const M = H.M, X = MET[cam], comp = await V.dados("br/comp/" + ano);
    const val = (id) => (comp[id] && comp[id].t1 ? X.valor(comp[id].t1) : null);
    const todos = Object.keys(comp).map(val).filter((v) => v != null).sort(d3.ascending);
    const dom = [d3.quantile(todos, 0.02), d3.quantile(todos, 0.98)];
    const esc = d3.scaleQuantize ? null : null;
    const cor = (v) => d3.interpolateRgbBasis(X.cores)(Math.max(0, Math.min(1, (v - dom[0]) / (dom[1] - dom[0]))));
    const semComp = (c) => (c.prim > ano ? `ainda não era município em ${ano}` : `o TSE não traz o comparecimento de ${ano}`);
    const dica = (c) => { const o = comp[c.ibge]; if (!o || !o.t1) return "<b>" + V.esc(c.nome) + "</b>" + V.esc(semComp(c)[0].toUpperCase() + semComp(c).slice(1)) + "."; const t = o.t1; return V.linhasDica(c.nome + " (" + c.uf + ")", cam === "abst" ? [["Não foram votar", V.pct((100 * t[2]) / t[0])], ["Eleitores", V.int(t[0])], ["Foram votar", V.int(t[1])]] : [["Brancos", V.pct((100 * t[3]) / t[1])], ["Nulos", V.pct((100 * t[4]) / t[1])], ["Foram votar", V.int(t[1])]]); };
    if (trocou) M.colorirMetrica(val, cor, dica);
    document.getElementById("mapa-leg").innerHTML = `<span class="mapa-leg__escala"><span>${V.pct(dom[0], 0)}</span><i style="background:linear-gradient(90deg,${X.cores.join(",")})"></i><span>${V.pct(dom[1], 0)} ou mais</span></span>
      <span class="mapa-leg__item">${X.rot}, 1º turno</span><span class="mapa-leg__dica"><span class="so-mouse">Clique num estado, depois numa cidade</span><span class="so-toque">Toque num estado, depois numa cidade</span></span>`;
    const S = soma(comp, uf), SB = soma(comp), S2 = cargo === "PRES" ? soma2(comp, uf) : null;
    const pS = X.valor(S), pBR = X.valor(SB);
    // extremos entre cidades com 5 mil eleitores ou mais (cidades muito pequenas oscilam demais)
    const lista = Object.entries(comp).filter(([id, o]) => { const c = BR.porIbge.get(id); return c && o.t1 && o.t1[0] >= 5000 && (!uf || c.uf === uf); }).map(([id, o]) => ({ c: BR.porIbge.get(id), v: X.valor(o.t1), t: o.t1 })).sort((a, b) => b.v - a.v);
    const mais = lista[0], menos = lista[lista.length - 1];
    const onde = uf ? DO_UF[uf] : "do Brasil", nome = (x) => `${x.c.nome}${uf ? "" : " (" + x.c.uf + ")"}`;
    let tit, sub, barra, cid = ib ? BR.porIbge.get(ib) : null;
    const pc = cid && comp[ib] && comp[ib].t1 ? comp[ib].t1 : null;
    if (cam === "abst") {
      if (cid) { tit = pc ? `Em ${cid.nome}, ${V.pct(X.valor(pc))} dos eleitores não foram votar em ${ano}` : `${cid.nome}: ${semComp(cid)}`; sub = pc ? `${V.int(pc[2])} de ${V.int(pc[0])} eleitores faltaram no 1º turno. ${NO_UF(cid.uf)[0].toUpperCase() + NO_UF(cid.uf).slice(1)}, foram ${V.pct(X.valor(soma(comp, cid.uf)))}; no Brasil, ${V.pct(pBR)}.` : ""; }
      else { tit = `Em ${ano}, ${V.pct(pS)} dos eleitores ${onde} não foram votar`; sub = `São ${milhoes(S[2])} de pessoas no 1º turno${S2 ? `; no 2º turno, ${V.pct(X.valor(S2))}` : ""}. Onde mais gente faltou: ${nome(mais)}, ${V.pct(mais.v)}. Onde menos: ${nome(menos)}, ${V.pct(menos.v)}.`; }
      const t = pc || S; const pf = (100 * t[1]) / t[0];
      barra = `<div class="placar placar--cidade"><div class="placar__fatia" style="flex-basis:${pf}%;background:#2f6b4f;color:#fff"><b>${V.pct(pf)}</b><span>Foram votar</span></div><div class="placar__fatia placar__fatia--fim" style="flex-basis:${100 - pf}%;background:#9c5d16;color:#fff"><b>${V.pct(100 - pf)}</b><span${100 - pf < 25 ? ' class="so-largo"' : ""}>Não foram</span></div></div>`;
    } else {
      const t = pc || S, pb = (100 * t[3]) / t[1], pn = (100 * t[4]) / t[1];
      if (cid) { tit = pc ? `Em ${cid.nome}, ${V.pct(pb + pn)} dos votos para ${ano % 4 === 2 ? "presidente" : "prefeito"} foram brancos ou nulos em ${ano}` : `${cid.nome}: ${semComp(cid)}`; sub = pc ? `Brancos: ${V.pct(pb)}. Nulos: ${V.pct(pn)}. ${NO_UF(cid.uf)[0].toUpperCase() + NO_UF(cid.uf).slice(1)}, a soma foi ${V.pct(X.valor(soma(comp, cid.uf)))}; no Brasil, ${V.pct(pBR)}.` : ""; }
      else { tit = `Em ${ano}, ${V.pct(pS)} de quem foi votar ${NO_UF(uf)} anulou ou votou em branco para ${ano % 4 === 2 ? "presidente" : "prefeito"}`; sub = `Brancos: ${V.pct(pb)}; nulos: ${V.pct(pn)}, no 1º turno. Onde mais: ${nome(mais)}, ${V.pct(mais.v)}. Onde menos: ${nome(menos)}, ${V.pct(menos.v)}.`; }
      barra = `<div class="placar placar--cidade"><div class="placar__fatia" style="flex-basis:${100 - pb - pn}%;background:#4a5160;color:#fff"><b>${V.pct(100 - pb - pn)}</b><span>Votos válidos</span></div><div class="placar__fatia" style="flex-basis:${pb}%;background:#a48ccb;color:#16181d"></div><div class="placar__fatia placar__fatia--fim" style="flex-basis:${pn}%;background:#3b2766;color:#fff"></div></div>
        <p class="placar-leg"><i style="background:#a48ccb"></i>Brancos ${V.pct(pb)} <i style="background:#3b2766"></i>Nulos ${V.pct(pn)}</p>`;
    }
    document.title = (cid ? cid.nome + " · " : uf ? UFN[uf] + " · " : "") + "Voto a voto";
    const cab = document.getElementById("manchete");
    cab.innerHTML = `<p class="manchete__onde"><a href="${lk()}">Brasil</a>${uf ? ` › ${cid ? `<a href="${lk(uf)}">${UFN[uf]}</a> › ${V.esc(cid.nome)}` : UFN[uf]}` : ""} · ${V.CARGOS[cargo]} ${ano} · ${CAMADAS[cam]}</p>
      <h1 class="manchete__titulo">${tit}</h1>${sub ? `<p class="manchete__sub">${sub}</p>` : ""}${barra}`;
    M.realcar(null); M.foco(uf || null);
    if (ib) { M.destacar(ib); M.cidade(ib); } else { M.destacar(null); if (uf) M.estado(uf); else M.brasil(); }
    // lado: os extremos e estado por estado
    const lado = document.getElementById("lado"); lado.classList.remove("lado--chega");
    if (cid) { lado.innerHTML = `<p class="lado__volta"><a href="${lk(cid.uf)}">← ${UFN[cid.uf]}</a></p><h2 class="lado__cidade">${V.esc(cid.nome)}</h2><p class="lado__fatos">${UFN[cid.uf]} · ${V.int(cid.pop)} moradores</p><div id="hist"></div>`; document.getElementById("hist").innerHTML = await historicoHtml(ib); if (cab.getBoundingClientRect().top < 0) cab.scrollIntoView({ block: "start" }); return null; }
    const item = (x) => `<li><a href="${lk(x.c.uf, x.c.ibge)}"><span class="extremos__nome">${V.esc(x.c.nome)} <small>${x.c.uf}</small></span><span class="extremos__barra"><i style="width:${Math.min(100, (100 * x.v) / (mais.v || 1))}%;background:${cor(x.v)}"></i></span><b>${V.pct(x.v)}</b></a></li>`;
    const ests = Object.keys(UFN).map((s) => ({ s, v: X.valor(soma(comp, s)) })).filter((x) => x.v != null).sort((a, b) => b.v - a.v), mxE = ests[0].v;
    lado.innerHTML = `<h2 class="lado__titulo">${cam === "abst" ? "Onde mais gente faltou" : "Onde mais se anulou ou votou em branco"}</h2><p class="lado__sub">Cidades com 5 mil eleitores ou mais${uf ? " " + NO_UF(uf) : ""}, 1º turno de ${ano}.</p>
      <ol class="extremos">${lista.slice(0, 8).map(item).join("")}</ol>
      <h3 class="lado__turno">${cam === "abst" ? "Onde menos faltou" : "Onde menos"}</h3><ol class="extremos">${lista.slice(-5).reverse().map(item).join("")}</ol>
      <h2 class="lado__titulo lado__titulo--2">Estado por estado</h2><p class="lado__sub">Do maior para o menor. Clique para aproximar.</p>
      <ol class="estados-lista">${ests.map((x) => `<li${x.s === uf ? ' aria-current="true"' : ""}><a href="${lk(x.s)}" data-uf="${x.s}"><span class="estados-lista__uf">${x.s}${GRUPO.includes(x.s) ? '<i title="Estado do grupo"></i>' : ""}</span><span class="estados-lista__barra"><i style="flex-basis:${(100 * x.v) / mxE}%;background:${cor(x.v)}"></i></span><span class="estados-lista__n">${V.pct(x.v, 0)}</span></a></li>`).join("")}</ol>`;
    if (cab.getBoundingClientRect().top < 0) cab.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    return null;
  }

  /* ---------- a mesma cidade em todas as eleições que já estão no site ---------- */
  async function historicoHtml(ib) {
    const c = BR.porIbge.get(ib), Hs = (await V.dados("br/hist/" + c.uf))[ib] || {};
    const CGS = [["PRES", "Presidente"], ["GOV", "Governador"], ["SEN", "Senador"], ["DF", "Deputado federal"], ["DE", "Deputado estadual"], ["PREF", "Prefeito"], ["VER", "Vereador"]].filter(([k]) => Hs[k] && Hs[k].length);
    // título com o dado: em quem a cidade mais votou para presidente
    let tit = `${V.esc(c.nome)} em cada eleição`;
    if (Hs.PRES && Hs.PRES.length > 2) {
      const cont = d3.rollups(Hs.PRES, (v) => v.length, (r) => r[2]).sort((a, b) => b[1] - a[1]);
      tit = `Para presidente, ${V.esc(c.nome)} votou mais no ${V.esc(cont[0][0])}: ${cont[0][1]} de ${Hs.PRES.length} eleições desde ${Hs.PRES[0][0]}`;
    }
    const faixa = (k, nome) => `<div class="linha-tempo"><p class="linha-tempo__cg">${nome}</p><ol class="linha-tempo__anos">${Hs[k].map(([ano, nm, sg, pct, def]) => {
      const n = notaDe(sg, String(ano)), [bg, tx] = V.parNota(n);
      return `<li><a href="${lk(c.uf, ib, [k, ano], "venc")}" style="background:${bg};color:${tx}" title="${V.esc(PROP[k] ? `${ano}: ${V.nomePartido(sg)} foi o partido mais votado aqui, com ${V.pct(pct)} dos votos` : `${ano}: ${V.titulo(nm)} (${sg}), ${V.pct(pct)} dos votos válidos aqui${def === 0 ? "; sem resultado definido" : ""}`)}"><b>${V.esc(sg.replace("PC do B", "PCdoB").replace("REPUBLICANOS", "REPUB.").replace("SOLIDARIEDADE", "SOLID.").replace("CIDADANIA", "CIDAD."))}</b><small>${String(ano).slice(2)}</small></a></li>`;
    }).join("")}</ol></div>`;
    const abst = (Hs.abst || []).map(([a, v]) => ({ a, v }));
    const W = 300, Hh = 76, x = d3.scalePoint().domain(abst.map((d) => d.a)).range([14, W - 14]), y = d3.scaleLinear().domain([0, Math.max(30, d3.max(abst, (d) => d.v) || 0)]).range([Hh - 18, 18]);
    const ult = abst[abst.length - 1], pri = abst[0];
    const spark = abst.length > 1 ? `<svg class="hist__spark" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Abstenção: ${abst.map((d) => d.a + " " + V.pct(d.v)).join(", ")}">
      <path d="${d3.line().x((d) => x(d.a)).y((d) => y(d.v))(abst)}" fill="none" stroke="#9c5d16" stroke-width="2"/>
      ${abst.map((d, i) => `<circle cx="${x(d.a)}" cy="${y(d.v)}" r="3.5" fill="#9c5d16" stroke="#fff" stroke-width="1.5"><title>${d.a}: ${V.pct(d.v)}</title></circle>${i === 0 || i === abst.length - 1 ? `<text x="${x(d.a)}" y="${y(d.v) - 8}" text-anchor="middle" class="v">${V.pct(d.v, 0)}</text><text x="${x(d.a)}" y="${Hh - 2}" text-anchor="middle">${d.a}</text>` : ""}`).join("")}</svg>` : "";
    return `<h3 class="lado__turno hist__tit">${tit}</h3>
      <p class="hist__sub">Quem venceu aqui em cada eleição (para deputado e vereador, o partido mais votado). A cor é a nota do partido ${NOME_REGUA[REGUA]}${REGUA === "voto" ? " (antes de 2018, Harvard)" : ""}. Toque num ano para ver o mapa.</p>
      ${CGS.map(([k, n]) => faixa(k, n)).join("")}
      ${spark ? `<p class="hist__sub">Eleitores que não foram votar, 1º turno: ${V.pct(pri.v, 0)} em ${pri.a}, ${V.pct(ult.v, 0)} em ${ult.a}</p>${spark}` : ""}`;
  }


  /* ---------- para que lado a cidade foi: PT no 2º turno de 2018 (Haddad) e de 2022 (Lula) ---------- */
  async function atualizarVirada(uf, ib, trocou) {
    const M = H.M, VR = await V.dados("br/virada");
    const dif = (id) => (VR[id] ? VR[id][1] - VR[id][0] : null);
    const cor = d3.scaleLinear().domain([-15, -5, 0, 5, 15]).range(["#132c78", "#7d97d6", "#e4e2dd", "#e08a83", "#8e1520"]).clamp(true).interpolate(d3.interpolateLab);
    const sinal = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1).replace(".", ",");
    const dica = (c) => { const o = VR[c.ibge]; return o ? V.linhasDica(c.nome + " (" + c.uf + ")", [["PT em 2018 (Haddad)", V.pct(o[0])], ["PT em 2022 (Lula)", V.pct(o[1])], ["Mudança", sinal(o[1] - o[0]) + " pontos"]]) : "<b>" + V.esc(c.nome) + "</b>"; };
    if (trocou) M.colorirMetrica(dif, cor, dica);
    document.getElementById("mapa-leg").innerHTML = `<span class="mapa-leg__escala"><span>Foi para Bolsonaro</span><i style="background:linear-gradient(90deg,#132c78,#7d97d6,#e4e2dd,#e08a83,#8e1520)"></i><span>Foi para o PT</span></span>
      <span class="mapa-leg__item">mudança do PT no 2º turno, de 2018 para 2022 (até 15 pontos)</span>`;
    const ids = Object.keys(VR).filter((id) => { const c = BR.porIbge.get(id); return c && (!uf || c.uf === uf); });
    const cresceu = ids.filter((id) => dif(id) > 0).length, paraPT = ids.filter((id) => VR[id][0] < 50 && VR[id][1] >= 50).length, paraB = ids.filter((id) => VR[id][0] >= 50 && VR[id][1] < 50).length;
    const pond = (k) => { let a = 0, t = 0; for (const id of ids) { a += (VR[id][k] * VR[id][2]) / 100; t += VR[id][2]; } return (100 * a) / t; };
    const cid = ib ? BR.porIbge.get(ib) : null, o = cid && VR[ib];
    let tit, sub, barra;
    if (cid && o) {
      const d = o[1] - o[0];
      tit = `Em ${cid.nome}, o PT ${d >= 0 ? "ganhou" : "perdeu"} ${Math.abs(d).toFixed(1).replace(".", ",")} pontos de 2018 para 2022`;
      sub = `Haddad teve ${V.pct(o[0])} no 2º turno de 2018; Lula, ${V.pct(o[1])} em 2022.${(o[0] < 50) !== (o[1] < 50) ? ` A cidade trocou de lado: em 2018 ganhou ${o[0] < 50 ? "Bolsonaro" : "Haddad"}; em 2022, ${o[1] < 50 ? "Bolsonaro" : "Lula"}.` : ""}`;
    } else {
      tit = `De 2018 para 2022, o PT cresceu em ${V.int(cresceu)} das ${V.int(ids.length)} cidades ${uf ? DO_UF[uf] : "do Brasil"}`;
      sub = `${V.int(paraPT)} ${paraPT === 1 ? "cidade trocou" : "cidades trocaram"} Bolsonaro por Lula; ${V.int(paraB)} fizeram o caminho inverso. No 2º turno, o PT foi de ${V.pct(pond(0))} para ${V.pct(pond(1))} dos votos válidos ${NO_UF(uf)}.`;
    }
    const a0 = cid && o ? o[0] : pond(0), a1 = cid && o ? o[1] : pond(1);
    barra = `<div class="duas-barras"><span>2018</span><div class="placar placar--cidade"><div class="placar__fatia" style="flex-basis:${a0}%;background:#a3172a;color:#fff"><b>${V.pct(a0)}</b><span class="so-largo">Haddad</span></div><div class="placar__fatia placar__fatia--fim" style="flex-basis:${100 - a0}%;background:#2f55b5;color:#fff"><b>${V.pct(100 - a0)}</b><span class="so-largo">Bolsonaro</span></div></div>
      <span>2022</span><div class="placar placar--cidade"><div class="placar__fatia" style="flex-basis:${a1}%;background:#a3172a;color:#fff"><b>${V.pct(a1)}</b><span class="so-largo">Lula</span></div><div class="placar__fatia placar__fatia--fim" style="flex-basis:${100 - a1}%;background:#2f55b5;color:#fff"><b>${V.pct(100 - a1)}</b><span class="so-largo">Bolsonaro</span></div></div></div>`;
    document.title = (cid ? cid.nome + " · " : uf ? UFN[uf] + " · " : "") + "Voto a voto";
    const cab = document.getElementById("manchete");
    cab.innerHTML = `<p class="manchete__onde"><a href="${lk()}">Brasil</a>${uf ? ` › ${cid ? `<a href="${lk(uf)}">${UFN[uf]}</a> › ${V.esc(cid.nome)}` : UFN[uf]}` : ""} · Presidente, 2º turno, 2018 → 2022</p>
      <h1 class="manchete__titulo">${tit}</h1><p class="manchete__sub">${sub}</p>${barra}`;
    M.realcar(null); M.foco(uf || null);
    if (ib) { M.destacar(ib); M.cidade(ib); } else { M.destacar(null); if (uf) M.estado(uf); else M.brasil(); }
    const lado = document.getElementById("lado"); lado.classList.remove("lado--chega");
    if (cid) { lado.innerHTML = `<p class="lado__volta"><a href="${lk(cid.uf)}">← ${UFN[cid.uf]}</a></p><h2 class="lado__cidade">${V.esc(cid.nome)}</h2><p class="lado__fatos">${UFN[cid.uf]} · ${V.int(cid.pop)} moradores</p><div id="hist"></div>`; document.getElementById("hist").innerHTML = await historicoHtml(ib); }
    else {
      const grandes = ids.filter((id) => VR[id][2] >= 5000).map((id) => ({ c: BR.porIbge.get(id), v: dif(id) })).sort((a, b) => b.v - a.v);
      const item = (x) => `<li><a href="${lk(x.c.uf, x.c.ibge)}"><span class="extremos__nome">${V.esc(x.c.nome)} <small>${x.c.uf}</small></span><span class="extremos__barra"><i style="width:${Math.min(100, (100 * Math.abs(x.v)) / 30)}%;background:${cor(x.v)}"></i></span><b>${sinal(x.v)}</b></a></li>`;
      const ests = Object.keys(UFN).map((s) => { const ii = Object.keys(VR).filter((id) => BR.porIbge.get(id) && BR.porIbge.get(id).uf === s); let a0 = 0, a1 = 0, t = 0; for (const id of ii) { a0 += (VR[id][0] * VR[id][2]) / 100; a1 += (VR[id][1] * VR[id][2]) / 100; t += VR[id][2]; } return { s, v: t ? (100 * (a1 - a0)) / t : 0 }; }).sort((a, b) => b.v - a.v), mx = d3.max(ests, (e) => Math.abs(e.v));
      lado.innerHTML = `<h2 class="lado__titulo">Onde o PT mais cresceu</h2><p class="lado__sub">Cidades com 5 mil votos ou mais${uf ? " " + NO_UF(uf) : ""}, em pontos percentuais.</p><ol class="extremos">${grandes.slice(0, 6).map(item).join("")}</ol>
        <h3 class="lado__turno">Onde mais foi para Bolsonaro</h3><ol class="extremos">${grandes.slice(-6).reverse().map(item).join("")}</ol>
        <h2 class="lado__titulo lado__titulo--2">Estado por estado</h2><p class="lado__sub">Mudança do PT no 2º turno, em pontos.</p>
        <ol class="estados-lista">${ests.map((x) => `<li${x.s === uf ? ' aria-current="true"' : ""}><a href="${lk(x.s)}" data-uf="${x.s}"><span class="estados-lista__uf">${x.s}${GRUPO.includes(x.s) ? '<i title="Estado do grupo"></i>' : ""}</span><span class="estados-lista__barra estados-lista__barra--div"><i style="margin-left:${x.v < 0 ? 50 - (50 * -x.v) / mx : 50}%;flex-basis:${(50 * Math.abs(x.v)) / mx}%;background:${cor(x.v * 2)}"></i></span><span class="estados-lista__n">${sinal(x.v)}</span></a></li>`).join("")}</ol>`;
    }
    if (cab.getBoundingClientRect().top < 0) cab.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    return null;
  }

  /* ---------- página: monta uma vez; ao trocar de estado ou cidade, só atualiza (o mapa fica e se move) ---------- */
  let H = null;
  const tween = (el, de, para, ms = 550) => {
    if (de === para || matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = V.int(para); return; }
    const t0 = performance.now(); const passo = (t) => { const e = d3.easeCubicOut(Math.min(1, (t - t0) / ms)); el.textContent = V.int(Math.round(de + (para - de) * e)); if (e < 1) requestAnimationFrame(passo); }; requestAnimationFrame(passo);
  };
  const CAMADAS = { venc: "Quem venceu", abst: "Quem faltou", bn: "Branco e nulo", vira: "Virada 2018–22" };
  function controlesHtml(cargo, ano) {
    document.getElementById("camadas").innerHTML = `<span class="camadas__rot">O que o mapa mostra</span><div class="camadas" role="group" aria-label="O que o mapa mostra">${Object.entries(CAMADAS).map(([k, n]) => `<a class="camadas__op" ${k === H.cam ? 'aria-current="true"' : ""} href="${lk(H.uf, H.ib, null, k)}">${n}</a>`).join("")}</div>`;
    return `<div class="controles__linha" role="group" aria-label="Cargo">${Object.entries(ELEICOES).map(([k, e]) => `<a class="chip" role="button" aria-pressed="${k === cargo}" ${e.prontos.length ? `href="${lk(H.uf, null, [k, e.prontos[e.prontos.length - 1]])}"` : 'aria-disabled="true"'}>${e.nome}</a>`).join("")}</div>
      <div class="tempo rolagem-x" role="group" aria-label="Ano">${ELEICOES[cargo].prontos.length > 2 ? `<button type="button" class="tempo__play" id="tocar" aria-label="Passar por todas as eleições de ${ELEICOES[cargo].nome.toLowerCase()}">${tocando ? "■ Parar" : "▶ Passar os anos"}</button>` : ""}${ELEICOES[cargo].anos.map((a) => ELEICOES[cargo].prontos.includes(a) ? `<a class="tempo__ano" ${a === ano ? 'aria-current="true"' : ""} href="${lk(H.uf, H.ib, [cargo, a])}">${a}</a>` : `<span class="tempo__ano" aria-disabled="true">${a}</span>`).join("")}</div>
      ${ano === 2026 ? '<p class="controles__nota">2026: resultado do 1º turno (4 de outubro). O 2º turno é em 25 de outubro.</p>' : ""}`;
  }
  function textosRegua() {
    const V2 = BR.ideoV, nv = V2.votacoes;
    if (REGUA === "consenso") {
      document.getElementById("regua-txt").innerHTML = `A nota de cada partido junta três pesquisas com especialistas e deputados e o que a bancada votou na Câmara de 2019 a 2026. <a href="#/partidos">Ver cada medida na página Partidos</a>.`;
      document.getElementById("regua-fonte").innerHTML = "Bolinha tracejada (incerto): as medidas discordam sobre o lado do partido. Faixa bege: o centro, de −0,25 a +0,25. Fontes: Zucco e Power (2024); Bolognesi, Ribeiro e Codato (2023); V-Party (2022); Câmara dos Deputados. Votos: TSE.";
      return;
    }
    document.getElementById("regua-txt").innerHTML = REGUA === "voto"
      ? `A nota de cada partido vem só do que a bancada mandou votar na Câmara: ${V.int(nv.bol)} votações no governo Bolsonaro e ${V.int(nv.lula)} no de Lula, com a média dos dois governos.${H && H.ano && H.ano < 2018 ? ` <b>Em ${H.ano} esses partidos ainda não votavam assim; o mapa deste ano usa a pesquisa de Harvard.</b>` : ""}`
      : "A nota de cada partido vem só da pesquisa com deputados federais feita de 1990 a 2021 (Zucco e Power, 2024).";
    document.getElementById("regua-fonte").innerHTML = REGUA === "voto"
      ? "Bolinha tracejada (estimada): partido que votou em só um dos governos, com a nota dos três partidos que votavam mais parecido com ele. Partido sem bancada usa a nota de Harvard. Faixa bege: o centro, de −0,25 a +0,25. Fonte: Câmara dos Deputados. Votos: TSE."
      : "Bolinha tracejada (estimada): partido que a pesquisa não mede, com nota estimada pela de Bolognesi, Ribeiro e Codato (2023). União Brasil: média de DEM e PSL. Faixa bege: o centro, de −0,25 a +0,25. Fonte: Zucco e Power (2024), Harvard Dataverse. Votos: TSE.";
  }
  const comoVoto = () => `Usamos as votações de mérito no Plenário (projetos, emendas, destaques), sem requerimentos de adiamento ou de pauta. Para cada uma, lemos a orientação de cada bancada: sim ou não (obstrução conta como não). Se o partido estava num bloco e não orientou sozinho, vale a orientação do bloco. Em cada governo, contamos quantas vezes cada par de partidos orientou igual e colocamos todos numa linha (escalonamento multidimensional). Essa linha só diz quem está mais perto de quem; para dar um número com o mesmo sentido do de Harvard, ajustamos a escala por uma reta que liga as duas réguas nos ${BR.ideoV.calibracao.n} partidos medidos por ambas (correlação de ${String(BR.ideoV.calibracao.r.toFixed(2)).replace(".", ",")}). A ordem e as distâncias entre os partidos continuam as do voto; só a escala vem de Harvard. Por isso o PSOL, o partido mais à esquerda da Câmara, fica em ${fmtNota(BR.ideoV.partidos.PSOL.nota)}, e não em −1. A nota do mapa é a média das posições nos dois governos. Por que dois governos: no Brasil, o voto na Câmara mistura ideia com ser governo ou oposição (Zucco, 2009). Bolsonaro e Lula estão em lados opostos; um partido que só acompanha quem governa pula de um lado para o outro e, na média, cai no meio. Quem é de esquerda ou de direita fica no mesmo lugar nos dois governos.`;
  const nomeP = (p) => V.nomePartido(p);
  const HSIG = { PCdoB: "PC do B", PODEMOS: "PODE" };
  function grafGoverno(soTexto) {
    const P = BR.ideoV.partidos, H24 = BR.ideoH.anos["2024"] || {};
    const ps = Object.entries(P).filter(([, r]) => r.bol != null && r.lula != null).map(([p, r]) => ({ p, ...r, h: H24[HSIG[p] || p] ? H24[HSIG[p] || p][0] : null })).sort((a, b) => a.nota - b.nota);
    const gov = ps.filter((r) => r.gov_bol >= 85 && r.gov_lula >= 85);
    const lista = (xs) => xs.map((r) => nomeP(r.p)).join(", ").replace(/, ([^,]*)$/, " e $1");
    document.getElementById("gov-tit").textContent = `${gov.length} partidos votaram com o governo em mais de 85% das vezes, com Bolsonaro e com Lula`;
    const dir = gov.filter((r) => r.h != null && r.h - r.nota > 0.15);
    document.getElementById("gov-sub").innerHTML = `${lista(gov)} mudam de lado quando muda o presidente. Pela régua do voto, ficam perto do centro${dir.length ? `; na pesquisa de Harvard, ${lista(dir)} aparecem mais à direita` : ""}. PT, PSOL e PCdoB ficam à esquerda nos dois governos; PL e Novo, à direita.`;
    if (soTexto) return;
    const host = document.getElementById("gov-graf"), estreito = V.largura() < 600;
    const W = estreito ? 360 : 760, lin = 26, m = { t: 34, r: 26, b: 30, l: estreito ? 96 : 120 }, Hh = m.t + ps.length * lin + m.b;
    const x = d3.scaleLinear().domain([-1, 1]).range([m.l, W - m.r]);
    const fs = estreito ? 12 : 14;
    const linhas = ps.map((r, i) => {
      const y = m.t + i * lin + lin / 2, mov = gov.includes(r);
      const dica = V.esc(`${nomeP(r.p)}: com Bolsonaro ${fmtNota(r.bol)} (votou com o governo ${V.pct(r.gov_bol, 0)} das vezes); com Lula ${fmtNota(r.lula)} (${V.pct(r.gov_lula, 0)}); média ${fmtNota(r.nota)}${r.h != null ? "; Harvard " + fmtNota(r.h) : ""}`);
      return `<g class="gov-linha${mov ? " gov-linha--gov" : ""}"><title>${dica}</title>
        <text x="${m.l - 10}" y="${y + 5}" text-anchor="end" font-size="${fs}" class="gov-sg">${V.esc(nomeP(r.p))}</text>
        <line x1="${x(r.bol)}" x2="${x(r.lula)}" y1="${y}" y2="${y}" stroke="${mov ? "#16181d" : "#9aa0aa"}" stroke-width="${mov ? 2.5 : 1.5}"/>
        <rect x="${x(r.nota) - 1.5}" y="${y - 8}" width="3" height="16" fill="${V.corNota(r.nota)}" stroke="#16181d" stroke-width=".8"/>
        ${r.h != null ? `<path d="M${x(r.h)},${y - 6}l6,6l-6,6l-6,-6z" fill="#fff" stroke="#6b7079" stroke-width="1.5"/>` : ""}
        <circle cx="${x(r.bol)}" cy="${y}" r="6" fill="#16181d"/><circle cx="${x(r.lula)}" cy="${y}" r="6" fill="#fff" stroke="#16181d" stroke-width="2"/></g>`;
    }).join("");
    host.innerHTML = `<p class="achado__leg gov-leg"><span><i class="gov-leg__b"></i>com Bolsonaro (2019–22)</span><span><i class="gov-leg__l"></i>com Lula (2023–26)</span><span><i class="gov-leg__m"></i>média: a nota do mapa</span><span><i class="gov-leg__h"></i>Harvard</span></p>
      <svg viewBox="0 0 ${W} ${Hh}" class="gov-svg" role="img" aria-label="Posição de cada partido pelo voto na Câmara, no governo Bolsonaro e no governo Lula">
        <rect x="${x(-0.25)}" y="${m.t - 8}" width="${x(0.25) - x(-0.25)}" height="${ps.length * lin + 8}" fill="#f1ede3"/>
        ${[-1, -0.5, 0, 0.5, 1].map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t - 8}" y2="${Hh - m.b}" stroke="#e1e3e7"/><text x="${x(t)}" y="${Hh - 10}" text-anchor="middle" font-size="${fs - 1}" class="rot">${t === 0 ? "0" : fmtNota(t)}</text>`).join("")}
        ${FAIXAS5.map(([a, b, nome]) => `<text x="${(x(a) + x(b)) / 2}" y="16" text-anchor="middle" font-size="${estreito ? fs - 2 : fs - 1}" class="rot">${estreito ? nome.replace("centro-esquerda", "c.-esq.").replace("centro-direita", "c.-dir.") : nome}</text>`).join("")}
        ${[-0.5, 0.5].map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t - 8}" y2="${Hh - m.b}" stroke="#c9ccd1" stroke-dasharray="2 3"/>`).join("")}
        ${linhas}</svg>
      <details class="achado__como"><summary>Ver os números em tabela</summary><div class="rolagem-x"><table class="gov-tabela"><thead><tr><th>Partido</th><th>Com Bolsonaro</th><th>Votou com o governo</th><th>Com Lula</th><th>Votou com o governo</th><th>Nota (média)</th><th>Harvard</th></tr></thead>
        <tbody>${ps.map((r) => `<tr><td>${V.esc(nomeP(r.p))}</td><td>${fmtNota(r.bol)}</td><td>${V.pct(r.gov_bol, 0)}</td><td>${fmtNota(r.lula)}</td><td>${V.pct(r.gov_lula, 0)}</td><td><b>${fmtNota(r.nota)}</b></td><td>${fmtNota(r.h)}</td></tr>`).join("")}</tbody></table></div></details>`;
  }
  function trocarRegua(r) {
    if (r === REGUA) return;
    REGUA = r; try { localStorage.setItem("vav-regua2", r); } catch (e) {}
    aplicarRegua();
    document.querySelectorAll("[data-regua]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.regua === REGUA)));
    textosRegua();
    const { uf, ib, cargo, ano, cam } = H; H.cargo = null; H.cam = null;
    atualizar(uf, ib, cargo, ano, cam);
  }
  // ▶: passa por todas as eleições do cargo, uma a cada 1,8 s, no mesmo lugar do mapa
  let tocando = null;
  function tocar() {
    if (tocando) { clearTimeout(tocando); tocando = null; const b = document.getElementById("tocar"); if (b) b.textContent = "▶ Passar os anos"; return; }
    const anos = ELEICOES[H.cargo].prontos; let i = anos.indexOf(H.ano); if (i < 0 || i === anos.length - 1) i = -1;
    const passo = () => {
      i++; if (i >= anos.length || !document.getElementById("mapa-br")) { tocando = null; const b = document.getElementById("tocar"); if (b) b.textContent = "▶ Passar os anos"; return; }
      if (anos[i + 1]) V.dados("br/venc/" + H.cargo + anos[i + 1]);   // já carrega o próximo
      V.semRolar = true; location.hash = lk(H.uf, null, [H.cargo, anos[i]]);
      tocando = setTimeout(passo, 1800);
    };
    tocando = setTimeout(passo, 10);
  }
  function montar(main) {
    main.innerHTML = `<div class="pagina pagina--larga">
      <div class="home">
        <div class="home__camadas" id="camadas"></div>
        <header class="manchete" id="manchete" aria-live="polite"></header>
        <div class="controles" id="controles"></div>
        <div class="home__mapa"><div class="painel__mapa">
          <div id="mapa-br" class="mapa-br"></div>
          <div class="mapa-zoom"><button class="btn" id="z-mais" aria-label="Aproximar">+</button><button class="btn" id="z-menos" aria-label="Afastar">−</button><button class="btn" id="z-br">Brasil inteiro</button></div>
          <div class="mapa-leg" id="mapa-leg">
            ${legVenc()}
          </div>
        </div></div>
        <aside class="home__lado"><div id="lado" class="lado"></div></aside>
      </div>
      <section class="regua-bloco" id="reguas">
        <h2 class="secao__titulo" id="regua-tit">Onde fica cada partido</h2>
        <p class="regua-escolha__rot" id="regua-rot">Régua que pinta o mapa</p>
        <div class="camadas" role="group" aria-labelledby="regua-rot">${Object.entries({ consenso: "Todas as medidas", harvard: "Pesquisa de Harvard", voto: "Voto na Câmara" }).map(([k, n]) => `<button type="button" class="camadas__op" data-regua="${k}" aria-pressed="${k === REGUA}">${n}</button>`).join("")}</div>
        <p class="secao__sub" id="regua-txt"></p>
        <div class="regua-rolagem" tabindex="0" role="region" aria-label="Régua dos partidos" id="regua-box"></div>
        <p class="fonte" id="regua-fonte"></p>
        <details class="pq-origem regua-gov"><summary>Por que o voto na Câmara põe o centrão no meio</summary>
          <h3 class="secao__titulo secao__titulo--menor" id="gov-tit"></h3>
          <p class="secao__sub" id="gov-sub"></p>
          <div id="gov-graf" class="gov-graf"></div>
          <p class="secao__sub">${comoVoto()}</p>
        </details>
      </section>
    </div>`;
    const M = desenhar(document.getElementById("mapa-br"), (id, perto) => {
      const c = BR.porIbge.get(id); if (!c) return;
      V.semRolar = true; location.hash = perto || (H && H.uf === c.uf) ? lk(c.uf, id) : lk(c.uf);
    });
    M.colorir(BR.venc);
    document.getElementById("z-mais").onclick = M.mais; document.getElementById("z-menos").onclick = M.menos;
    document.getElementById("z-br").onclick = () => { V.semRolar = true; location.hash = lk(); };
    // mapa ligado ao que se aponta: partido, campo político ou estado
    const venc = () => BR.venc;
    const ligar = (sel, pred) => {
      document.querySelector(".home").addEventListener("mouseover", (e) => { const el = e.target.closest(sel); if (el) M.realcar(pred(el)); });
      document.querySelector(".home").addEventListener("mouseout", (e) => { const el = e.target.closest(sel); if (el && !el.contains(e.relatedTarget)) M.realcar(null); });
    };
    ligar(".ranking li[data-sg]", (el) => (id) => { const w = venc()[id]; return w && w[9] && w[2] === el.dataset.sg && (!H.uf || BR.porIbge.get(id).uf === H.uf); });
    ligar(".placar:not(.placar--cidade) .placar__fatia[data-f]", (el) => (id) => { const w = venc()[id]; return w && w[9] && V.faixa(w[8]) === el.dataset.f && (!H.uf || BR.porIbge.get(id).uf === H.uf); });
    ligar(".estados-lista a[data-uf]", (el) => (id) => { const c = BR.porIbge.get(id); return c && c.uf === el.dataset.uf; });
    H = { M, cargo: null, ano: null, uf: undefined, ib: undefined, cam: null };
    document.querySelectorAll("[data-regua]").forEach((b) => (b.onclick = () => trocarRegua(b.dataset.regua)));
    document.getElementById("controles").addEventListener("click", (e) => { if (e.target.closest("#tocar")) tocar(); else if (tocando && e.target.closest("a")) tocar(); });
    main.querySelectorAll("[data-alvo]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); document.getElementById(a.dataset.alvo).scrollIntoView({ behavior: "smooth", block: "start" }); }));
    textosRegua(); grafGoverno(true);
    const blocoReguas = document.getElementById("reguas");
    if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); grafGoverno(); } }, { rootMargin: "600px" }); io.observe(blocoReguas); } else grafGoverno();
  }
  async function atualizar(uf, ib, cargo, ano, cam) {
    const M = H.M, trocouEl = H.cargo !== cargo || H.ano !== ano, trocou = trocouEl || H.cam !== cam;
    H.cargo = cargo; H.ano = ano; H.uf = uf; H.ib = ib; H.cam = cam;
    const RES = cargo === "PREF" || PROP[cargo] ? null : await V.dados("br/resumo/" + cargo + ano);
    if (trocouEl) { document.getElementById("regua-box").innerHTML = regua(String(ano), cargo, RES); document.getElementById("regua-tit").textContent = `Onde fica cada partido em ${ano}`; textosRegua(); }
    document.getElementById("controles").innerHTML = controlesHtml(cargo, ano);
    if (cam === "vira") { document.getElementById("controles").innerHTML = '<p class="controles__nota">Compara o 2º turno para presidente: Haddad (PT) em 2018 e Lula (PT) em 2022, cidade por cidade.</p>'; return atualizarVirada(uf, ib, trocou); }
    if (cam !== "venc") return atualizarMetrica(uf, ib, cargo, ano, cam, trocou);
    if (trocou) { M.colorir(BR.venc); document.getElementById("mapa-leg").innerHTML = legVenc(); }
    const r = resumo(BR.venc, uf);
    let m = manchete(r, ano, cargo, uf, RES), cid = null, U = null;
    if (ib && PROP[cargo]) { cid = BR.porIbge.get(ib); let P = null; try { P = await V.dados("br/prop/" + cargo + ano); } catch (e) {} m = mancheteProp(cid, BR.venc[ib], P, ano, cargo); }
    else if (ib) { cid = BR.porIbge.get(ib); try { U = (await V.dados("br/ufx/" + cargo + ano))[cid.uf]; } catch (e) {} m = mancheteCidade(cid, BR.venc[ib], U, ano, cargo); }
    document.title = (cid ? cid.nome + " · " : uf ? UFN[uf] + " · " : "") + "Voto a voto";
    const notas = BR.ideo.anos[ano] || {}, nt = (sg) => (notas[sg] ? notas[sg][0] : null);
    const cabe = (f) => f * (document.getElementById("manchete").clientWidth || PLW) >= 84;   // número da fatia só se couber inteiro
    const barraCidade = m.k2 ? `<div class="placar placar--cidade" role="img" aria-label="${V.esc(m.rot1 || V.titulo(m.k1[0]))} ${V.pct((100 * m.v1) / m.tot)}, ${V.esc(m.rot2 || V.titulo(m.k2[0]))} ${V.pct((100 * m.v2) / m.tot)}">
        <div class="placar__fatia" style="flex-basis:${(100 * m.v1) / m.tot}%;background:${V.parNota(nt(m.k1[1]))[0]};color:${V.parNota(nt(m.k1[1]))[1]}">${cabe(m.v1 / m.tot) ? `<b>${V.pct((100 * m.v1) / m.tot)}</b><span>${V.esc(m.rot1 || V.titulo(m.k1[0]))}</span>` : ""}</div>
        <div class="placar__fatia placar__resto" style="flex-basis:${(100 * (m.tot - m.v1 - m.v2)) / m.tot}%"></div>
        <div class="placar__fatia placar__fatia--fim" style="flex-basis:${(100 * m.v2) / m.tot}%;background:${V.parNota(nt(m.k2[1]))[0]};color:${V.parNota(nt(m.k2[1]))[1]}">${cabe(m.v2 / m.tot) ? `<b>${V.pct((100 * m.v2) / m.tot)}</b><span>${V.esc(m.rot2 || V.titulo(m.k2[0]))}</span>` : ""}</div></div>` : "";
    const cab = document.getElementById("manchete"); PLW = cab.clientWidth || PLW;
    // guarda os números de antes para a troca de estado contar de um valor para o outro
    const antes = {}; cab.querySelectorAll(".conta").forEach((el) => (antes[el.dataset.f] = +el.textContent.replace(/\D/g, "")));
    const fatAntes = {}; cab.querySelectorAll(".placar__fatia[data-f]").forEach((el) => (fatAntes[el.dataset.f] = el.style.flexBasis));
    cab.innerHTML = `<p class="manchete__onde"><a href="${lk()}">Brasil</a>${uf ? ` › ${cid ? `<a href="${lk(uf)}">${UFN[uf]}</a> › ${V.esc(cid.nome)}` : UFN[uf]}` : ""} · ${V.CARGOS[cargo]} ${ano}</p>
        <h1 class="manchete__titulo">${m.tit}</h1>
        ${m.sub ? `<p class="manchete__sub">${m.sub}</p>` : ""}
        ${cid ? barraCidade : apuracaoHtml(true) + placar(r, rotulosPlacar(cargo, BR.venc, uf)) + legendaPlacar(r, rotulosPlacar(cargo, BR.venc, uf))}`;
    cab.querySelectorAll(".conta").forEach((el) => { if (antes[el.dataset.f] != null && !trocou) tween(el, antes[el.dataset.f], r[el.dataset.f]); });
    const fats = cab.querySelectorAll(".placar__fatia[data-f]");
    if (Object.keys(fatAntes).length) { const novo = []; fats.forEach((el) => { novo.push(el.style.flexBasis); el.style.flexBasis = fatAntes[el.dataset.f]; }); requestAnimationFrame(() => requestAnimationFrame(() => fats.forEach((el, i) => (el.style.flexBasis = novo[i])))); }
    document.getElementById("leg-indef").textContent = plural(r.semRes, "cidade", "cidades"); document.getElementById("leg-indef-box").hidden = !r.semRes;
    document.getElementById("leg-novo").textContent = plural(r.novo, "cidade de hoje", "cidades de hoje"); document.getElementById("leg-novo-box").hidden = !r.novo;
    document.getElementById("leg-pref-box").hidden = !r.semPref; document.getElementById("leg-pref").textContent = `Brasília e Fernando de Noronha não têm ${cargo === "VER" ? "vereadores" : "prefeito"}`;
    document.getElementById("leg-sem").textContent = plural(r.semNota, "cidade", "cidades"); document.getElementById("leg-sem-box").hidden = !r.semNota;
    const lado = document.getElementById("lado");
    lado.classList.remove("lado--chega");
    M.realcar(null); M.foco(uf || null);
    if (ib) { M.destacar(ib); M.cidade(ib); painelCidade(lado, ib, ano, cargo); }
    else { M.destacar(null); if (uf) M.estado(uf); else M.brasil(); lado.innerHTML = ranking(r, ano, cargo, uf, RES) + porEstado(BR.venc, uf, cargo); }
    // no celular, depois de tocar no mapa, o título com a resposta volta para a vista
    if (cab.getBoundingClientRect().top < 0) cab.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    const rever = document.getElementById("apu-rever");
    if (rever) rever.onclick = () => {
      if (!uf) lado.innerHTML = '<p class="lado__sub">O resumo aparece quando a apuração terminar.</p>';
      apurar(uf ? Object.fromEntries(Object.entries(BR.venc).filter(([k]) => BR.porIbge.get(k) && BR.porIbge.get(k).uf === uf)) : BR.venc, r, M, () => { lado.innerHTML = ranking(r, ano, cargo, uf, RES) + porEstado(BR.venc, uf, cargo); lado.classList.add("lado--chega"); M.colorir(BR.venc); });
    };
    return rever;
  }
  V.rota(/^\/mapa(?:\/e\/([A-Z]+)(\d{4}))?(?:\/v\/(abst|bn|vira))?(?:\/br\/([A-Z]{2})(?:\/c\/(\d{7}))?)?\/?$/, async function (main, cg, an, cam, uf, ib, mesma) {
    V.marcarNav("mapa");
    await base(); await V.geoBR();
    let cargo = cg || "PREF", ano = an ? +an : 2024;
    if (!ELEICOES[cargo] || !ELEICOES[cargo].prontos.includes(ano)) { cargo = "PREF"; ano = 2024; }
    BR.venc = await V.dados("br/venc/" + cargo + ano); BR.eleicao = { cargo, ano };
    if (ib && !uf) uf = BR.porIbge.get(ib) && BR.porIbge.get(ib).uf;
    const nova = !mesma || !H || !document.getElementById("mapa-br");
    if (nova) montar(main);
    const rever = await atualizar(uf, ib, cargo, ano, cam || "venc");
    if (nova && rever && !uf && !ib) {
      let jaViu = false; try { jaViu = sessionStorage.getItem("vav-apurou") === "1"; sessionStorage.setItem("vav-apurou", "1"); } catch (e) {}
      if (!jaViu && !matchMedia("(prefers-reduced-motion: reduce)").matches) rever.click();
    }
  }, { mantem: true });
})();
