/* Voto a voto — "As respostas no mapa" (#/respostas): cada pergunta do trabalho vira uma camada do mapa das 5.570 cidades,
   com classificador (5 grupos iguais, faixas, acima ou abaixo da cidade típica), filtros (região, tamanho, IDH), o tempo passando,
   a mudança entre eleições e a cidade do leitor. Os valores vêm de data/br/lobby/<camada>.js (scripts/lobby.py),
   na mesma ordem das cidades do desenho do mapa (data/br/geo_proj.js). */
(function () {
  "use strict";
  const V = window.V;
  const N0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }), N1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    N2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), N3 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  /* ---------- as camadas: o que cada uma mede e como pintar ---------- */
  const CAM = {
    mulheres: { cor: "#7a3e9d", fmt: "pct", rot: { "VEREADOR": "Mulheres entre os vereadores eleitos", "CANDIDATAS A VEREADOR": "Mulheres entre os candidatos a vereador" }, curto: { "VEREADOR": "Eleitas", "CANDIDATAS A VEREADOR": "Candidatas" } },
    ninguem: { cor: "#25272b", fmt: "pct", rot: { "PRESIDENTE": "Eleitores que não escolheram ninguém para presidente (faltaram, branco ou nulo)", "PREFEITO": "Eleitores que não escolheram ninguém para prefeito (faltaram, branco ou nulo)" }, curto: { "PRESIDENTE": "Presidente", "PREFEITO": "Prefeito" } },
    lado: { esc: "nota", fmt: "nota", rot: { "PRESIDENTE": "Lado do partido mais votado para presidente (1º turno)", "PREFEITO": "Lado do partido mais votado para prefeito (1º turno)" }, curto: { "PRESIDENTE": "Presidente", "PREFEITO": "Prefeito" } },
    bf: { cor: "#2f7d5b", fmt: "num1", rot: { "BENEFÍCIOS": "Benefícios do Bolsa Família por 100 eleitores" } },
    legenda: { cor: "#00727a", fmt: "pct", rot: { "VEREADOR": "Votos só no partido (legenda) para vereador", "DEPUTADO FEDERAL": "Votos só no partido (legenda) para deputado federal" }, curto: { "VEREADOR": "Vereador", "DEPUTADO FEDERAL": "Deputado federal" } },
    gasto: { cor: "#9c5d16", fmt: "reais", rot: { "CAMPANHA MUNICIPAL": "Gasto das campanhas de prefeito e vereador, por eleitor" } },
    publico: { cor: "#9c5d16", fmt: "pct", rot: { "CAMPANHA MUNICIPAL": "Parte das campanhas de prefeito e vereador paga com dinheiro público" } },
    fundo: { cor: "#9c5d16", fmt: "reais", rot: { "CAMPANHA MUNICIPAL": "Dinheiro público nas campanhas de prefeito e vereador, por eleitor" } },
    cadeira: { cor: "#00727a", fmt: "int", rot: { "VEREADOR": "Eleitores por cadeira de vereador" } },
    barradas: { cor: "#2e3238", fmt: "pct", rot: { "VEREADOR E PREFEITO": "Candidaturas a prefeito e vereador barradas pela Justiça Eleitoral" } },
    troca: { cor: "#2e3238", fmt: "pct", rot: { "VEREADOR": "Vereadores que trocaram de partido para tentar a reeleição" } },
    alternancia: { esc: "cat", fmt: "cat", rot: { "PREFEITO": "O que aconteceu com o prefeito" }, cats: [[0, "Reelegeu o mesmo prefeito", "#2f7d5b"], [1, "Mesmo partido, outro prefeito", "#a8cdb8"], [2, "Trocou de partido", "#9c5d16"]] },
    religioso: { cor: "#7a3e9d", fmt: "pct", rot: { "TÍTULO RELIGIOSO": "Candidatos a vereador com título religioso no nome (Pastor, Irmão…)", "TÍTULO DE FARDA": "Candidatos a vereador com título de farda no nome (Delegado, Sargento…)" }, curto: { "TÍTULO RELIGIOSO": "Religioso", "TÍTULO DE FARDA": "Farda" } },
    laranja: { cor: "#7a3e9d", fmt: "pct", rot: { "CANDIDATAS A VEREADORA": "Candidatas a vereadora com até 10 votos" } },
    acerta: { cor: "#2f7d5b", fmt: "de9", semAno: true, fixas: [5.5, 6.5, 7.5, 8.5], rotFixas: ["5 ou menos", "6", "7", "8", "Todas (9)"], rot: { "PRESIDENTE": "Eleições para presidente, de 1994 a 2026, em que a cidade votou no vencedor" } },
    superior: { cor: "#00727a", fmt: "pct", rot: { "ELEITORES": "Eleitores com curso superior" } },
    jovens: { cor: "#00727a", fmt: "pct", rot: { "ELEITORES": "Eleitores de até 29 anos" } },
    idh: { cor: "#2f7d5b", fmt: "idh", semAno: true, fixas: [0.5, 0.6, 0.7, 0.8], rotFixas: ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"], rot: { "IDHM": "Desenvolvimento da cidade (IDH municipal, Censo 2010)" } },
  };
  /* ---------- as perguntas que têm mapa, e as camadas de cada uma (a primeira abre) ---------- */
  const PERG = {
    t1: [["gasto"]], t3: [["lado", "PRESIDENTE"], ["idh"]], t4: [["superior"]], t6: [["ninguem", "PREFEITO"]], t7: [["legenda", "DEPUTADO FEDERAL"]], t8: [["cadeira"]],
    t10: [["alternancia"], ["jovens"]], t11: [["bf"], ["publico"]], t13: [["lado", "PRESIDENTE"]], t14: [["lado", "PRESIDENTE", "mud"]], t15: [["publico"], ["fundo"]], t16: [["barradas"]],
    e3: [["bf"], ["lado", "PRESIDENTE"]], e4: [["mulheres", "VEREADOR"]], e5: [["troca"]], e6: [["fundo"]], e7: [["religioso", "TÍTULO RELIGIOSO"]], e8: [["laranja"]], e9: [["acerta"]],
  };
  V.lobbyTem = (id) => !!PERG[id];

  const fmt = (f, v) => v == null || isNaN(v) ? "sem dado"
    : f === "pct" ? N1.format(v) + "%" : f === "reais" ? "R$ " + N2.format(v) : f === "num1" ? N1.format(v) : f === "int" ? N0.format(v) : f === "de9" ? N0.format(v) + " de 9"
    : f === "idh" ? N3.format(v) : f === "nota" ? (V.nome5 ? V.nome5(v) : N2.format(v)) + " (" + (v > 0 ? "+" : v < 0 ? "−" : "") + N2.format(Math.abs(v)) + ")" : String(v);
  const fmtDif = (f, d) => d == null ? "sem dado" : f === "nota" ? (Math.abs(d) < 0.005 ? "não mudou" : N2.format(Math.abs(d)) + (d > 0 ? " para a direita" : " para a esquerda"))
    : (d > 0 ? "+" : d < 0 ? "−" : "") + (f === "pct" ? N1.format(Math.abs(d)) + " pontos" : f === "reais" ? "R$ " + N2.format(Math.abs(d)) : N1.format(Math.abs(d)));
  const REG = { 1: "Norte", 2: "Nordeste", 3: "Sudeste", 4: "Sul", 5: "Centro-Oeste" };
  const PORTES = [["todas", "Todos os tamanhos", () => true], ["p", "Até 20 mil habitantes", (p) => p <= 20000], ["m", "De 20 mil a 100 mil", (p) => p > 20000 && p <= 100000], ["g", "De 100 mil a 500 mil", (p) => p > 100000 && p <= 500000], ["xg", "Mais de 500 mil", (p) => p > 500000]];
  const IDHS = [["todas", "Qualquer desenvolvimento"], ["b", "IDH baixo (até 0,6)"], ["m", "IDH médio (0,6 a 0,7)"], ["a", "IDH alto (0,7 a 0,8)"], ["ma", "IDH muito alto (0,8 ou mais)"]];
  const faixaIdh = (v) => (v == null ? null : v < 0.6 ? "b" : v < 0.7 ? "m" : v < 0.8 ? "a" : "ma");

  let S = null;   // o estado da página
  const camada = (k) => V.dados("br/lobby/" + k);

  /* ---------- cores e tamanhos: cada cidade é uma bolinha no centro dela ---------- */
  const TINTA = "#2B2B2B", CANETA = "#CC1259", APAGADO = "#D3CFC4";
  function escala() {
    const m = CAM[S.cam], vals = valores(), ok = vals.filter((v) => v != null);
    if (S.modo === "mud") {
      const ant = valores(anoAnterior()), difs = vals.map((v, i) => (v == null || ant[i] == null ? null : v - ant[i])), abs = difs.filter((d) => d != null).map(Math.abs).sort(d3.ascending);
      const lim = Math.max(1e-6, d3.quantile(abs, 0.95) || 1), cs = S.cam === "lado" ? ["#b8232f", "#f3f1ec", "#1d3c9e"] : ["#5e3c99", "#f3f1ec", "#c4570b"];
      const it = d3.interpolateRgbBasis(cs);
      return { val: difs, cor: (d) => (d == null ? null : it(Math.max(0, Math.min(1, 0.5 + d / (2 * lim))))), leg: { grad: cs, ini: fmtDif(m.fmt, -lim), fim: fmtDif(m.fmt, lim), meio: "não mudou" } };
    }
    if (m.esc === "nota") return { val: vals, cor: (v) => (v == null ? null : V.corNota(v)), leg: { grad: ["#7f1119", "#c22f39", "#e38a82", "#cdc3ab", "#8fa9dd", "#4c74cc", "#132c78"], ini: "esquerda", meio: "centro", fim: "direita" } };
    if (m.esc === "cat") return { val: vals, cor: (v) => { const c = m.cats.find((x) => x[0] === v); return c ? c[2] : null; }, leg: { itens: m.cats.map(([, r, c]) => [c, r]) } };
    const ord = ok.slice().sort(d3.ascending);
    let cortes, rots;
    if (S.clas === "mediana") { const md = d3.quantile(ord, 0.5); cortes = [md]; rots = ["Abaixo da cidade típica (" + fmt(m.fmt, md) + ")", "Na cidade típica ou acima"]; }
    else if (S.clas === "faixas" && m.fixas) { cortes = m.fixas; rots = m.rotFixas; }
    else if (S.clas === "faixas") { const a = d3.quantile(ord, 0.02), b = d3.quantile(ord, 0.98), p = (b - a) / 5; cortes = [1, 2, 3, 4].map((k) => a + k * p); }
    else { cortes = [0.2, 0.4, 0.6, 0.8].map((q) => d3.quantile(ord, q)); }
    const n = cortes.length + 1, raios = n === 2 ? [1.3, 3.4] : [0.9, 1.6, 2.3, 3.1, 4.1].slice(5 - n);
    if (!rots) { const f = (v) => fmt(m.fmt, v); rots = raios.map((_, k) => (k === 0 ? "até " + f(cortes[0]) : k === n - 1 ? "mais de " + f(cortes[n - 2]) : f(cortes[k - 1]) + " a " + f(cortes[k]))); }
    const classe = (v) => { let k = 0; while (k < cortes.length && v > cortes[k]) k++; return k; };
    return { val: vals, cor: (v) => (v == null ? null : TINTA), raio: (v) => raios[classe(v)], leg: { pontos: raios.map((r, k) => [r, rots[k]]) } };
  }
  const anosDa = () => (S.dados.anos[S.var] || []);
  const anoAnterior = () => { const a = anosDa(), i = a.indexOf(S.ano); return i > 0 ? a[i - 1] : null; };
  const valores = (ano = S.ano) => (ano == null ? [] : (S.dados.v[S.var] || {})[String(ano)] || []);

  /* ---------- filtros ---------- */
  function passa(i) {
    const f = S.filtro, c = S.cids[i];
    if (!c) return false;
    if (f.reg !== "todas" && REG[c.ibge[0]] !== f.reg) return false;
    if (f.porte !== "todas" && !PORTES.find((p) => p[0] === f.porte)[2](c.pop || 0)) return false;
    if (f.idh !== "todas" && (!S.idh || faixaIdh(S.idh[i]) !== f.idh)) return false;
    return true;
  }
  const filtrando = () => S.filtro.reg !== "todas" || S.filtro.porte !== "todas" || S.filtro.idh !== "todas";

  /* ---------- o mapa em canvas ---------- */
  function medir() {
    const cv = S.cv, larg = cv.parentElement.clientWidth, dpr = Math.min(2, devicePixelRatio || 1);
    S.esc = larg / S.G.W; cv.width = Math.round(larg * dpr); cv.height = Math.round(S.G.H * S.esc * dpr);
    cv.style.width = larg + "px"; cv.style.height = Math.round(S.G.H * S.esc) + "px";
    S.ctx.setTransform(S.esc * dpr, 0, 0, S.esc * dpr, 0, 0);
  }
  function pintar(prog = 1) {
    const { ctx, G } = S, e = S.e = escala();
    ctx.clearRect(0, 0, G.W, G.H);
    for (let i = 0; i < G.mun.length; i++) {
      const [x, y] = G.mun[i].c, v = e.val[i], ok = passa(i) && v != null;
      ctx.fillStyle = ok ? e.cor(v) || APAGADO : APAGADO;
      ctx.beginPath(); ctx.arc(x, y, ok ? (e.raio ? e.raio(v) : 2.2) : 0.8, 0, 2 * Math.PI); ctx.fill();
    }
    // a caneta: a sua cidade circulada com seta e bilhete; a cidade clicada, só circulada
    const circulo = (i, p) => {
      if (i == null || i < 0) return;
      const [x, y] = G.mun[i].c, pts = [[-30, 6], [-34, -30, 26, -36, 34, -6], [40, 24, -4, 38, -24, 26], [-36, 18, -30, -14, -12, -24]];
      ctx.save(); ctx.strokeStyle = CANETA; ctx.lineWidth = 4.5; ctx.lineCap = "round";
      const comp = 260; ctx.setLineDash([comp * p, comp]);
      ctx.beginPath(); ctx.moveTo(x + pts[0][0], y + pts[0][1]);
      for (const c of pts.slice(1)) ctx.bezierCurveTo(x + c[0], y + c[1], x + c[2], y + c[3], x + c[4], y + c[5]);
      ctx.stroke(); ctx.restore();
    };
    const bilhete = (i, txt, p) => {
      if (i == null || i < 0 || p < 1) return;
      const [x, y] = G.mun[i].c, esq = x > G.W * 0.55, sx = esq ? -1 : 1;
      ctx.save(); ctx.strokeStyle = CANETA; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x + sx * 110, y - 120); ctx.bezierCurveTo(x + sx * 105, y - 75, x + sx * 70, y - 55, x + sx * 34, y - 34);
      ctx.moveTo(x + sx * 34, y - 34); ctx.lineTo(x + sx * 54, y - 40); ctx.moveTo(x + sx * 34, y - 34); ctx.lineTo(x + sx * 40, y - 54); ctx.stroke();
      ctx.font = '400 34px "Permanent Marker", cursive'; ctx.fillStyle = CANETA; ctx.textAlign = esq ? "right" : "left";
      ctx.lineJoin = "round"; ctx.strokeStyle = "#F6F5F1"; ctx.lineWidth = 8;
      ctx.strokeText("a sua cidade!", x + sx * 80, y - 160); ctx.fillText("a sua cidade!", x + sx * 80, y - 160);
      ctx.font = '400 26px "Permanent Marker", cursive'; ctx.fillStyle = "#141414";
      ctx.strokeText(txt, x + sx * 80, y - 128); ctx.fillText(txt, x + sx * 80, y - 128);
      ctx.restore();
    };
    circulo(S.minha, prog);
    if (S.minha != null && S.minha >= 0) bilhete(S.minha, S.cids[S.minha] ? S.cids[S.minha].nome : "", prog);
    if (S.sel != null && S.sel !== S.minha) circulo(S.sel, prog);
  }
  /* a caneta circula devagar quando a cidade muda */
  function desenharCaneta() {
    const k = S.minha + ":" + S.sel; if (k === S.ultimaMarca) { pintar(); return; } S.ultimaMarca = k;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { pintar(); return; }
    pintar(0);   // já pinta as cidades (e calcula a escala) antes de a caneta começar
    const t0 = performance.now(), passo = (t) => { const p = Math.min(1, (t - t0) / 700); pintar(p); if (p < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  }
  function achar(ev) {
    const r = S.cv.getBoundingClientRect(), x = (ev.clientX - r.left) / S.esc, y = (ev.clientY - r.top) / S.esc, ctx = S.ctx;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    let achou = -1;
    for (let i = 0; i < S.G.mun.length; i++) { const b = S.G.mun[i].b; if (x < b[0][0] || x > b[1][0] || y < b[0][1] || y > b[1][1]) continue; if (ctx.isPointInPath(S.paths[i], x, y)) { achou = i; break; } }
    ctx.restore(); return achou;
  }

  /* ---------- textos: legenda, resumo, cidade, listas ---------- */
  const mediana = (idx) => { const vs = idx.map((i) => S.e.val[i]).filter((v) => v != null).sort(d3.ascending); return vs.length ? d3.quantile(vs, 0.5) : null; };
  function legendaHTML() {
    const L = S.e.leg, f = filtrando() ? `<li><svg width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="2" fill="${APAGADO}"></circle></svg>Fora do filtro</li>` : "";
    if (L.grad) return `<div class="lb-grad"><i style="background:linear-gradient(90deg,${L.grad.join(",")})"></i><span><b>${L.ini}</b><b>${L.meio}</b><b>${L.fim}</b></span></div><ul class="lb-leg"><li><i style="background:#e6e8eb"></i>Sem dado</li>${f}</ul>`;
    if (L.pontos) return `<ul class="lb-leg"><li>Cada bolinha é uma cidade:</li>${L.pontos.map(([r, t]) => `<li><svg width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="${(r * 2.3).toFixed(1)}" fill="${TINTA}"></circle></svg>${t}</li>`).join("")}${f}</ul>`;
    return `<ul class="lb-leg"><li>Cada bolinha é uma cidade:</li>${L.itens.map(([c, r]) => `<li><i style="background:${c};border-radius:50%"></i>${r}</li>`).join("")}${f}</ul>`;
  }
  function resumoHTML() {
    const m = CAM[S.cam], todas = S.cids.map((_, i) => i), fil = todas.filter(passa), mud = S.modo === "mud";
    if (m.esc === "cat" && !mud) {
      const conta = (idx) => { const t = idx.filter((i) => S.e.val[i] != null); return m.cats.map(([v, r]) => [r, t.length ? (100 * t.filter((i) => S.e.val[i] === v).length) / t.length : null]); };
      const c = conta(filtrando() ? fil : todas);
      return `<p class="lb-resumo">${filtrando() ? `Nas ${N0.format(fil.length)} cidades do filtro` : "No Brasil"}, em ${S.ano}: ${c.map(([r, p]) => `<b>${N0.format(p)}%</b> ${r.toLowerCase()}`).join("; ")}.</p>`;
    }
    const mdB = mediana(todas), mdF = filtrando() ? mediana(fil) : null, f = (v) => (mud ? fmtDif(m.fmt, v) : fmt(m.fmt, v));
    const quando = mud ? `de ${anoAnterior()} para ${S.ano}` : m.semAno ? "" : `em ${S.ano}`;
    return `<p class="lb-resumo">Na cidade típica do Brasil${quando ? ", " + quando : ""}: <b>${f(mdB)}</b>${mdF != null ? `. Nas ${N0.format(fil.length)} cidades do filtro: <b>${f(mdF)}</b>` : ""}.</p>`;
  }
  function serieSVG(i) {
    const anos = anosDa(), vs = anos.map((a) => valores(a)[i]);
    if (anos.length < 2 || vs.every((v) => v == null)) return "";
    const W = 300, H = 70, ok = vs.filter((v) => v != null), lo = Math.min(...ok, 0), hi = Math.max(...ok) || 1, x = (k) => 10 + (k * (W - 20)) / (anos.length - 1), y = (v) => H - 18 - ((v - lo) / (hi - lo || 1)) * (H - 30);
    const pts = vs.map((v, k) => (v == null ? null : [x(k), y(v)])), d = pts.filter(Boolean).map((p, k) => (k ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join("");
    return `<svg class="lb-serie" viewBox="0 0 ${W} ${H}" role="img" aria-label="Valores de ${anos[0]} a ${anos[anos.length - 1]}"><path d="${d}" fill="none" stroke="#141414" stroke-width="2.5"/>
      ${pts.map((p, k) => (p ? `<circle cx="${p[0]}" cy="${p[1]}" r="${anos[k] === S.ano ? 5 : 3}" fill="${anos[k] === S.ano ? CANETA : "#141414"}"/>` : "")).join("")}
      <text x="10" y="${H - 2}" font-size="12" fill="#5f6672">${anos[0]}</text><text x="${W - 10}" y="${H - 2}" font-size="12" text-anchor="end" fill="#5f6672">${anos[anos.length - 1]}</text></svg>`;
  }
  function cidadeHTML(i) {
    if (i == null || i < 0) return `<p class="lb-cidade__vazio">Clique numa cidade do mapa, ou procure a sua acima, para ver o número dela.</p>`;
    const c = S.cids[i], m = CAM[S.cam], v = S.e.val[i], mud = S.modo === "mud";
    const ok = S.e.val.filter((x) => x != null), acima = v == null || m.esc === "cat" ? null : Math.round((100 * ok.filter((x) => x < v).length) / ok.length);
    const valor = mud ? fmtDif(m.fmt, v) : m.esc === "cat" ? ((m.cats.find((x) => x[0] === v) || [])[1] || "sem dado") : fmt(m.fmt, v);
    return `<h3 class="lb-cidade__nome">${V.esc(c.nome)} <span>(${c.uf})</span></h3>
      <p class="lb-cidade__v"><b>${valor}</b> <span>${mud ? `de ${anoAnterior()} para ${S.ano}` : m.semAno ? "" : `em ${S.ano}`}</span></p>
      ${acima != null && !mud ? `<p class="lb-cidade__pos">Maior que em ${acima}% das cidades do Brasil.</p>` : ""}
      ${m.esc !== "cat" ? serieSVG(i) : ""}
      <p class="lb-cidade__links">${S.minha !== i ? `<button type="button" class="btn" data-lb-minha="${i}">Esta é a minha cidade</button>` : `<span class="pq-tag">A sua cidade</span>`}
        <a class="btn" href="#/mapa/br/${c.uf}/c/${c.ibge}">Abrir a cidade</a></p>`;
  }
  function listasHTML() {
    const m = CAM[S.cam]; if (m.esc === "cat" || m.esc === "nota" || S.modo === "mud") return "";
    const idx = S.cids.map((_, i) => i).filter((i) => passa(i) && S.e.val[i] != null && (S.cids[i].pop || 0) >= 50000);
    if (idx.length < 10) return "";
    const ord = idx.sort((a, b) => S.e.val[b] - S.e.val[a]), li = (is) => is.map((i) => `<li><button type="button" class="lb-link" data-lb-cid="${i}">${V.esc(S.cids[i].nome)} (${S.cids[i].uf})</button><b>${fmt(m.fmt, S.e.val[i])}</b></li>`).join("");
    return `<details class="pq-origem lb-listas"><summary>As cidades com o maior e o menor número (mais de 50 mil habitantes)</summary>
      <div class="lb-listas__cols"><div><h3>Maiores</h3><ol>${li(ord.slice(0, 10))}</ol></div><div><h3>Menores</h3><ol>${li(ord.slice(-10).reverse())}</ol></div></div></details>`;
  }

  /* ---------- a página ---------- */
  function controlesHTML() {
    const m = CAM[S.cam], vars = Object.keys(S.dados.anos).filter((k) => S.dados.anos[k].length), anos = anosDa(), cams = PERG[S.id];
    const chip = (ativo, attr, txt) => `<button type="button" class="chip" ${attr} aria-pressed="${ativo}">${txt}</button>`;
    return `${cams.length > 1 ? `<div class="lb-linha"><span class="lb-rot">Camada</span>${cams.map(([k, va], j) => chip(S.cam === k && (!va || va === S.var), `data-lb-cam="${j}"`, V.esc((CAM[k].rot[va || Object.keys(CAM[k].rot)[0]] || "").replace(/ \(.*\)$/, "")))).join("")}</div>` : ""}
      ${vars.length > 1 ? `<div class="lb-linha"><span class="lb-rot">Mostrar</span>${vars.map((k) => chip(S.var === k, `data-lb-var="${V.esc(k)}"`, V.esc((m.curto || {})[k] || k))).join("")}</div>` : ""}
      <div class="lb-linha">${anos.length > 1 ? `<label class="lb-rot" for="lb-ano">Eleição</label><select id="lb-ano">${anos.map((a) => `<option${a === S.ano ? " selected" : ""}>${a}</option>`).join("")}</select>
        <button type="button" class="btn" data-lb-play aria-pressed="${!!S.play}"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">${S.play ? '<rect x="2" y="2" width="4" height="10"/><rect x="8" y="2" width="4" height="10"/>' : '<path d="M3 1.5l9 5.5-9 5.5z"/>'}</svg>${S.play ? "Parar" : "Passar os anos"}</button>
        ${chip(S.modo === "valor", 'data-lb-modo="valor"', "O número")}${chip(S.modo === "mud", 'data-lb-modo="mud"', "A mudança")}` : (m.semAno ? "" : `<span class="lb-rot">Eleição</span><b>${S.ano}</b>`)}</div>
      ${m.esc !== "nota" && m.esc !== "cat" && S.modo !== "mud" ? `<div class="lb-linha"><label class="lb-rot" for="lb-clas">Cores por</label><select id="lb-clas">
        <option value="quantis"${S.clas === "quantis" ? " selected" : ""}>5 grupos do mesmo tamanho</option><option value="faixas"${S.clas === "faixas" ? " selected" : ""}>${m.fixas ? "Faixas fixas" : "5 faixas de valor"}</option>
        <option value="mediana"${S.clas === "mediana" ? " selected" : ""}>Acima ou abaixo da cidade típica</option></select></div>` : ""}`;
  }
  function filtrosHTML() {
    const sel = (id, ops, v) => `<select id="${id}">${ops.map(([k, t]) => `<option value="${k}"${k === v ? " selected" : ""}>${t}</option>`).join("")}</select>`;
    return `<div class="lb-filtros" role="group" aria-label="Filtros"><span class="lb-rot">Filtrar cidades</span>
      ${sel("lb-reg", [["todas", "Todas as regiões"], ...Object.values(REG).map((r) => [r, r])], S.filtro.reg)}
      ${sel("lb-porte", PORTES.map(([k, t]) => [k, t]), S.filtro.porte)}
      ${sel("lb-idh", IDHS, S.filtro.idh)}
      ${filtrando() ? '<button type="button" class="btn" data-lb-limpar>Limpar filtros</button>' : ""}</div>`;
  }
  function pintarTudo() {
    desenharCaneta();
    const m = CAM[S.cam], tit = (S.modo === "mud" ? "Mudança: " : "") + (m.rot[S.var] || m.rot[Object.keys(m.rot)[0]]);
    document.getElementById("lb-ctl").innerHTML = controlesHTML();
    document.getElementById("lb-fil").innerHTML = filtrosHTML();
    document.getElementById("lb-tit").textContent = tit + (S.modo === "mud" ? ` (${anoAnterior()} → ${S.ano})` : m.semAno ? "" : ` · ${S.ano}`);
    document.getElementById("lb-leg").innerHTML = legendaHTML();
    document.getElementById("lb-res").innerHTML = resumoHTML();
    document.getElementById("lb-cid").innerHTML = cidadeHTML(S.sel != null ? S.sel : S.minha);
    document.getElementById("lb-lis").innerHTML = listasHTML();
    S.cv.setAttribute("aria-label", "Mapa do Brasil: " + tit + ". " + document.getElementById("lb-res").textContent);
  }
  function respostaHTML() {
    const t = S.tema;
    if (!t) return "";
    return `<div class="lb-resposta"><p class="pq-resposta">${V.rCircularNumero(t.curta)}</p>
      <p class="pq-acoes"><a class="btn" href="#/perguntas/${t.id}">A resposta completa</a><button type="button" class="btn" data-lb-comp>Compartilhar</button></p></div>`;
  }
  async function trocarCamada(j) {
    const [k, va, modo] = PERG[S.id][j];
    S.cam = k; S.dados = await camada(k);
    const vars = Object.keys(S.dados.anos).filter((x) => S.dados.anos[x].length);
    S.var = va && vars.includes(va) ? va : vars[0];
    const anos = anosDa(); S.ano = anos[anos.length - 1];
    S.modo = modo === "mud" && anos.length > 1 ? "mud" : "valor"; S.clas = CAM[k].fixas ? "faixas" : "quantis";
    pintarTudo();
  }
  async function abrirPergunta(id) {
    S.id = id; S.tema = S.temas.find((t) => t.id === id); pararPlay();
    document.querySelectorAll(".lb-perg [data-lb-id]").forEach((a) => a.setAttribute("aria-current", a.dataset.lbId === id ? "true" : "false"));
    const sel = document.getElementById("lb-perg-sel"); if (sel) sel.value = id;
    const pg = document.querySelector(".lb-pagina"); pg.style.setProperty("--bloco", V.corBloco(S.tema.grupo));
    document.getElementById("lb-pergunta").innerHTML = `<h2 class="lb-q">${S.tema.titulo}</h2>${S.tema.doGrupo ? '<span class="pq-tag">Pergunta do grupo</span>' : ""}${respostaHTML()}`;
    // quem ainda não chutou vê o mapa só depois do chute: o mapa entrega a resposta
    await trocarCamada(0);
    if (location.hash !== "#/respostas/" + id) history.replaceState(null, "", "#/respostas/" + id);
  }
  function pararPlay() { if (S && S.play) { clearInterval(S.play); S.play = null; } }

  /* ---------- eventos ---------- */
  function ligar(main) {   // main aqui é a página do mapa (recriada a cada visita), para os ouvintes não se acumularem
    const cv = S.cv;
    cv.addEventListener("mousemove", (ev) => {
      const i = achar(ev); if (i < 0) { V.dica(null); return; }
      const c = S.cids[i], m = CAM[S.cam], v = S.e.val[i];
      V.dica(ev, V.linhasDica(c.nome + " (" + c.uf + ")", [[S.modo === "mud" ? "Mudança" : String(S.ano), S.modo === "mud" ? (v == null ? "sem dado" : fmtDif(m.fmt, v)) : m.esc === "cat" ? ((m.cats.find((x) => x[0] === v) || [])[1] || "sem dado") : fmt(m.fmt, v)]]));
    });
    cv.addEventListener("mouseleave", () => V.dica(null));
    cv.addEventListener("click", (ev) => { const i = achar(ev); if (i < 0) return; S.sel = i; desenharCaneta(); document.getElementById("lb-cid").innerHTML = cidadeHTML(i); });
    main.addEventListener("click", async (e) => {
      const t = e.target, q = (s) => t.closest(s);
      if (q("[data-lb-id]")) { e.preventDefault(); await abrirPergunta(q("[data-lb-id]").dataset.lbId); return; }
      if (q("[data-lb-cam]")) { await trocarCamada(+q("[data-lb-cam]").dataset.lbCam); return; }
      if (q("[data-lb-var]")) { S.var = q("[data-lb-var]").dataset.lbVar; const a = anosDa(); if (!a.includes(S.ano)) S.ano = a[a.length - 1]; if (S.modo === "mud" && a.length < 2) S.modo = "valor"; pintarTudo(); return; }
      if (q("[data-lb-modo]")) { S.modo = q("[data-lb-modo]").dataset.lbModo; if (S.modo === "mud" && !anoAnterior()) S.ano = anosDa()[1]; pintarTudo(); return; }
      if (q("[data-lb-play]")) {
        if (S.play) { pararPlay(); pintarTudo(); return; }
        const a = anosDa(); let k = S.modo === "mud" ? 1 : 0; S.ano = a[k]; pintarTudo();
        S.play = setInterval(() => { k++; if (k >= a.length) { pararPlay(); pintarTudo(); return; } S.ano = a[k]; pintarTudo(); }, 1300); pintarTudo(); return;
      }
      if (q("[data-lb-limpar]")) { S.filtro = { reg: "todas", porte: "todas", idh: "todas" }; pintarTudo(); return; }
      if (q("[data-lb-minha]")) { S.minha = +q("[data-lb-minha]").dataset.lbMinha; V.guardarCidade(S.cids[S.minha].ibge); pintarTudo(); return; }
      if (q("[data-lb-cid]")) { S.sel = +q("[data-lb-cid]").dataset.lbCid; desenharCaneta(); document.getElementById("lb-cid").innerHTML = cidadeHTML(S.sel); document.getElementById("lb-cid").scrollIntoView({ behavior: "smooth", block: "nearest" }); return; }
      if (q("[data-lb-comp]")) {
        const t2 = S.tema, k2 = t2.kpis[0] || [], i = S.minha, c = i != null && i >= 0 ? S.cids[i] : null, m = CAM[S.cam];
        V.compartilhar({ titulo: t2.titulo, bloco: t2.grupo, cor: V.corBloco(t2.grupo), numero: k2[0], rotulo: k2[1], frase: t2.curta, cidade: c && S.e.val[i] != null && S.modo === "valor" && m.esc !== "cat" ? `Em ${c.nome} (${c.uf}): ${fmt(m.fmt, S.e.val[i])} (${(m.rot[S.var] || "").toLowerCase()}, ${S.ano}).` : "" });
      }
    });
    main.addEventListener("change", async (e) => {
      const id = e.target.id;
      if (id === "lb-ano") { pararPlay(); S.ano = +e.target.value; if (S.modo === "mud" && !anoAnterior()) S.modo = "valor"; pintarTudo(); }
      else if (id === "lb-clas") { S.clas = e.target.value; pintarTudo(); }
      else if (id === "lb-reg") { S.filtro.reg = e.target.value; pintarTudo(); }
      else if (id === "lb-porte") { S.filtro.porte = e.target.value; pintarTudo(); }
      else if (id === "lb-idh") { if (!S.idh) S.idh = (await camada("idh")).v.IDHM["2010"]; S.filtro.idh = e.target.value; pintarTudo(); }
      else if (id === "lb-perg-sel") await abrirPergunta(e.target.value);
      else if (id === "lb-busca") { const c = S.porRot.get(V.norm(e.target.value)); if (c != null) { S.minha = c; S.sel = c; V.guardarCidade(S.cids[c].ibge); pintarTudo(); } }
    });
    let rz; const onRz = () => { clearTimeout(rz); rz = setTimeout(() => { if (document.body.contains(cv)) { medir(); pintar(); } else removeEventListener("resize", onRz); }, 150); };
    addEventListener("resize", onRz);
  }

  V.rota(/^\/respostas(?:\/([te]\d+))?\/?$/, async function (main, id) {
    V.marcarNav("perguntas"); pararPlay();
    main.innerHTML = '<div class="pagina"><p class="carregando">Carregando o mapa…</p></div>';
    const [{ temas }, BR, G] = await Promise.all([V.pqCarregar(), V.baseBR(), V.geoBR()]);
    const lista = temas.filter((t) => PERG[t.id]), BLOCOS = ["Dinheiro", "Perfil", "Território", "Voto", "Partidos"];
    const cids = G.mun.map((f) => BR.porIbge.get(f.id) || null);
    S = { temas, G, cids, paths: G.mun.map((f) => new Path2D(f.d)), ufs: G.ufs.map((u) => new Path2D(u.d)), filtro: { reg: "todas", porte: "todas", idh: "todas" }, modo: "valor", clas: "quantis", sel: null, minha: null, idh: null };
    S.porRot = new Map(cids.map((c, i) => (c ? [V.norm(`${c.nome} (${c.uf})`), i] : null)).filter(Boolean));
    const mc = V.minhaCidade(); if (mc) { const i = cids.findIndex((c) => c && c.ibge === mc); if (i >= 0) S.minha = i; }
    main.innerHTML = `<div class="pagina lb-pagina">
      <header class="pq-cab lb-cab"><p class="pq-migalha"><a href="#/perguntas">Todas as perguntas</a></p>
        <h1 class="titulo-grande">As respostas no mapa</h1>
        <p class="pq-mais">Escolha uma pergunta: o mapa pinta a resposta em cada uma das 5.570 cidades. Filtre, passe os anos, veja o que mudou e procure a sua cidade.</p>
      </header>
      <div class="lb-grade">
        <nav class="lb-perg" aria-label="Perguntas com mapa">
          <label class="lb-perg__sel"><span class="lb-rot">Pergunta</span><select id="lb-perg-sel">${BLOCOS.map((g) => `<optgroup label="${g}">${lista.filter((t) => t.grupo === g).map((t) => `<option value="${t.id}">${V.esc(t.titulo)}</option>`).join("")}</optgroup>`).join("")}</select></label>
          <div class="lb-perg__lista">${BLOCOS.map((g) => { const ts = lista.filter((t) => t.grupo === g); return ts.length ? `<h2 class="lb-perg__bloco" style="--bloco:${V.corBloco(g)}">${g}</h2><ul>${ts.map((t) => `<li><a href="#/respostas/${t.id}" data-lb-id="${t.id}">${V.esc(t.titulo)}${t.doGrupo ? ' <small>do grupo</small>' : ""}</a></li>`).join("")}</ul>` : ""; }).join("")}</div>
        </nav>
        <section class="lb-palco" aria-live="polite">
          <div id="lb-pergunta"></div>
          <div class="lb-cartao">
            <div id="lb-corpo"><h3 class="lb-tit" id="lb-tit"></h3><div id="lb-ctl" class="lb-ctl"></div></div>
            <div class="lb-mapa"><canvas id="lb-cv" role="img"></canvas></div>
            <div id="lb-leg"></div><div id="lb-res"></div>
            <div id="lb-fil"></div>
            <label class="lb-busca"><span class="lb-rot">A sua cidade</span><input id="lb-busca" type="text" list="lb-busca-lista" autocomplete="off" spellcheck="false" placeholder="Digite o nome e escolha na lista" value="${S.minha != null ? V.esc(cids[S.minha].nome + " (" + cids[S.minha].uf + ")") : ""}"><datalist id="lb-busca-lista">${cids.filter(Boolean).map((c) => `<option value="${V.esc(c.nome)} (${c.uf})"></option>`).join("")}</datalist></label>
            <div id="lb-cid" class="lb-cidade"></div>
            <div id="lb-lis"></div>
            <p class="lb-fonte">Fonte: TSE, IBGE, Atlas do Desenvolvimento Humano e Ministério do Desenvolvimento Social. Cidades sem cor não tinham o dado naquele ano (por exemplo, criadas depois).</p>
          </div>
        </section>
      </div></div>`;
    S.cv = document.getElementById("lb-cv"); S.ctx = S.cv.getContext("2d");
    medir(); ligar(main.querySelector(".lb-pagina"));
    // a letra da caneta precisa estar carregada antes de escrever no mapa
    try { document.fonts.load('400 34px "Permanent Marker"').then(() => { if (S && S.e) pintar(); }); } catch (e) {}
    await abrirPergunta(id && PERG[id] ? id : "e4");
  });
})();
