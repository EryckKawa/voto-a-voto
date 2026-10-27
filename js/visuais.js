/* Voto a voto — peças comuns das páginas visuais: máquina do tempo, Brasil em 3D, multidão do Ninguém,
   corrida do patrimônio e modo apresentação. */
(function () {
  "use strict";
  const V = window.V;

  // scripts pesados (three.js) só entram na página que usa
  const scripts = {};
  V.carregarScript = (src) => scripts[src] || (scripts[src] = new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = src; s.onload = ok;
    s.onerror = () => { delete scripts[src]; falha(new Error("Não foi possível carregar " + src)); };
    document.head.appendChild(s);
  }));
  V.larguraUtil = (el) => { const cs = getComputedStyle(el); return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
  V.semMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  V.suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);   // começa e termina devagar

  // eleições que as páginas visuais percorrem (as mesmas do mapa)
  const GERAIS = [1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026], MUNIC = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
  V.ANOS_VIS = { PRES: GERAIS, GOV: GERAIS, PREF: MUNIC };
  V.NOME_VIS = { PRES: "Presidente", GOV: "Governador", PREF: "Prefeito" };
  V.SEM_COR = "#d9dce1";
  V.corVenc = (w) => (w && w[9] ? V.corNota(w[8]) : V.SEM_COR);

  // resumo de uma eleição: cidades por lado e os nomes (ou partidos) que mais ficaram em 1º
  V.resumoVis = (venc, cargo) => {
    const lados = { esquerda: 0, centro: 0, direita: 0, sem: 0 }, nomes = new Map();
    for (const w of Object.values(venc)) {
      if (!w || !w[9]) { lados.sem++; continue; }
      lados[V.faixa(w[8]) || "sem"]++;
      const k = cargo === "PRES" ? V.titulo(w[1]) : V.nomePartido(w[2]);
      nomes.set(k, (nomes.get(k) || 0) + 1);
    }
    return { lados, top: [...nomes].sort((a, b) => b[1] - a[1]).slice(0, 3) };
  };

  // botões de cargo e de ano, no estilo dos chips do site
  V.chipsVis = (cargos, cargo, ano) => `<div class="vis-chips" role="group" aria-label="Cargo">${cargos.map((c) => `<button type="button" class="chip" data-vis-cargo="${c}" aria-pressed="${c === cargo}">${V.NOME_VIS[c]}</button>`).join("")}</div>
    <div class="vis-chips vis-anos rolagem-x" role="group" aria-label="Ano">${V.ANOS_VIS[cargo].map((a) => `<button type="button" class="chip" data-vis-ano="${a}" aria-pressed="${a === ano}">${a}</button>`).join("")}</div>`;
  V.legendaLados = () => `<ul class="legenda"><li><i style="background:${V.corNota(-0.75)}"></i>Esquerda</li><li><i style="background:${V.corNota(-0.35)}"></i>Centro-esquerda</li><li><i style="background:${V.corNota(0)}"></i>Centro</li><li><i style="background:${V.corNota(0.35)}"></i>Centro-direita</li><li><i style="background:${V.corNota(0.75)}"></i>Direita</li><li><i style="background:${V.SEM_COR}"></i>Sem resultado</li></ul>`;
  V.barraLados = (r) => {
    const t = r.lados.esquerda + r.lados.centro + r.lados.direita + r.lados.sem || 1;
    const f = [["esquerda", V.corNota(-0.75), "#fff"], ["centro", V.corNota(0), "#16181d"], ["direita", V.corNota(0.75), "#fff"], ["sem", V.SEM_COR, "#16181d"]];
    return `<div class="vis-barra" role="img" aria-label="${f.map(([k]) => `${k === "sem" ? "sem resultado" : k}: ${V.int(r.lados[k])} cidades`).join(", ")}">${f.map(([k, c, tc]) => r.lados[k] ? `<i style="flex-basis:${(100 * r.lados[k]) / t}%;background:${c};color:${tc}">${(100 * r.lados[k]) / t >= 9 ? V.int(r.lados[k]) : ""}</i>` : "").join("")}</div>`;
  };

  // um mapa do Brasil em <canvas>, com as cidades já projetadas (data/br/geo_proj): bem mais leve que 5.566 <path> para animar
  V.mapaCanvas = async (canvas) => {
    const G = await V.geoBR(), BR = await V.baseBR();
    const cids = G.mun.map((f) => ({ id: f.id, p: new Path2D(f.d), c: f.c })), ufs = G.ufs.map((u) => new Path2D(u.d));
    const ctx = canvas.getContext("2d");
    let esc = 1;
    const medir = () => {
      const larg = V.larguraUtil(canvas.parentElement), dpr = Math.min(2, devicePixelRatio || 1);
      esc = larg / G.W; canvas.width = Math.round(larg * dpr); canvas.height = Math.round(G.H * esc * dpr);
      canvas.style.width = larg + "px"; canvas.style.height = Math.round(G.H * esc) + "px";
      ctx.setTransform(esc * dpr, 0, 0, esc * dpr, 0, 0);
    };
    medir();
    const pintar = (cor) => {
      ctx.clearRect(0, 0, G.W, G.H);
      for (let i = 0; i < cids.length; i++) { ctx.fillStyle = cor(i); ctx.fill(cids[i].p); }
      ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.1 / esc;
      for (const u of ufs) ctx.stroke(u);
    };
    // a cidade sob o ponteiro (para a dica e o clique)
    const achar = (ev) => {
      const r = canvas.getBoundingClientRect(), x = (ev.clientX - r.left) / esc, y = (ev.clientY - r.top) / esc;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const i = cids.findIndex((c) => Math.abs(c.c[0] - x) < 40 && Math.abs(c.c[1] - y) < 40 && ctx.isPointInPath(c.p, x, y));
      ctx.restore();
      return i < 0 ? null : BR.porIbge.get(cids[i].id);
    };
    return { cids, pintar, medir, achar };
  };
})();
