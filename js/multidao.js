/* Voto a voto — a multidão do Ninguém: os 42,6 milhões de eleitores que faltaram, votaram em branco ou anularam
   no 1º turno de 2024, um ponto para cada mil pessoas. Os pontos saem das cidades onde moram, se juntam por tipo,
   enchem estádios e, no fim, se comparam com o partido mais votado. Dados: data/br/comp/2024 e data/br/ninguem/resumo. */
(function () {
  "use strict";
  const V = window.V;
  const CURTO = { faltou: "Faltaram", nulo: "Anularam", branco: "Em branco" };
  const POR_PONTO = 1000, MARACANA = 78838;   // capacidade oficial do Maracanã
  const mi = (v) => (v / 1e6).toFixed(1).replace(".", ",");
  const TIPOS = [["faltou", "Não foram votar", "#9c5d16"], ["nulo", "Anularam", "#2b2d31"], ["branco", "Votaram em branco", "#8b929c"]];

  V.rota(/^\/multidao$/, async function (main) {
    V.marcarNav("explorar");
    document.title = "A multidão do Ninguém · Voto a voto";
    const [R, comp, G, BR] = await Promise.all([V.dados("br/ninguem/resumo"), V.dados("br/comp/2024"), V.geoBR(), V.baseBR()]);
    const P = R.PREF2024, total = P.abst + P.brancos + P.nulos, lider = P.partidos[0];
    const qtd = { faltou: Math.round(P.abst / POR_PONTO), branco: Math.round(P.brancos / POR_PONTO), nulo: Math.round(P.nulos / POR_PONTO) };
    const N = qtd.faltou + qtd.branco + qtd.nulo, estadios = Math.floor(total / MARACANA);
    const PASSOS = [
      ["Onde ele mora", `Cada ponto são ${V.int(POR_PONTO)} eleitores que, no 1º turno de 2024, não escolheram ninguém para prefeito. São ${V.int(N)} pontos, cada um na cidade de onde veio.`],
      ["Quem ele é", `${V.int(P.abst)} não foram votar, ${V.int(P.nulos)} anularam e ${V.int(P.brancos)} votaram em branco. Somados, ${V.int(total)} eleitores.`],
      ["O tamanho dele", `Daria para lotar o Maracanã ${V.int(estadios)} vezes. Cada oval abaixo é um Maracanã cheio (${V.int(MARACANA)} lugares).`],
      ["Contra o mais votado", `O partido com mais votos para prefeito, o ${V.esc(V.nomePartido(lider[0]))}, teve ${V.int(lider[1])}. O Ninguém teve ${String((total / lider[1]).toFixed(1)).replace(".", ",")} vezes isso.`],
    ];
    main.innerHTML = `<div class="pagina pagina--larga vis">
      <header class="manchete"><p class="manchete__onde"><a href="#/explorar">Explorar</a> · <a href="#/">Ninguém</a> · A multidão</p>
        <h1 class="manchete__titulo">${mi(total)} milhões de pessoas, um ponto para cada mil</h1></header>
      <div class="vis-multidao">
        <div class="vis-passos" role="group" aria-label="Passos">${PASSOS.map(([t], k) => `<button type="button" class="chip" data-passo="${k}" aria-pressed="${k === 0}">${k + 1}. ${t}</button>`).join("")}</div>
        <p class="vis-multidao__txt" id="mult-txt" aria-live="polite"></p>
        <div class="vis-multidao__palco"><canvas id="mult" aria-hidden="true"></canvas></div>
        <div class="vis-multidao__pe"><ul class="legenda">${TIPOS.map(([k, n, c]) => `<li><i style="background:${c}"></i>${n}: ${V.int(qtd[k])} pontos</li>`).join("")}</ul>
          <button type="button" class="btn btn--confirma" id="mult-prox">Próximo ›</button></div>
        <p class="pq-nota">Fonte: TSE, comparecimento do 1º turno de 2024 por cidade. Os pontos de cada tipo são distribuídos pelas cidades na proporção dos eleitores de cada uma.</p>
      </div></div>`;
    const canvas = document.getElementById("mult"), ctx = canvas.getContext("2d");
    const tipo = new Uint8Array(N), cidX = new Float32Array(N), cidY = new Float32Array(N), sorte = new Float32Array(N);
    // cada ponto vai para a cidade em que o acumulado do tipo passa do número dele (distribuição proporcional)
    const ids = G.mun.map((f) => f.id).filter((id) => comp[id] && comp[id].t1), porId = new Map(G.mun.map((f) => [f.id, f]));
    let n = 0;
    TIPOS.forEach(([k], t) => {
      const col = { faltou: 2, branco: 3, nulo: 4 }[k], soma = ids.reduce((s, id) => s + comp[id].t1[col], 0), passo = soma / qtd[k];
      let acc = 0, j = 0;
      for (const id of ids) {
        acc += comp[id].t1[col];
        while (j < qtd[k] && (j + 0.5) * passo <= acc) { const f = porId.get(id); tipo[n] = t; cidX[n] = f.c[0]; cidY[n] = f.c[1]; sorte[n] = Math.random(); n++; j++; }
      }
      while (j < qtd[k]) { tipo[n] = t; cidX[n] = 480; cidY[n] = 450; sorte[n] = Math.random(); n++; j++; }
    });
    const x0 = new Float32Array(N), y0 = new Float32Array(N), x1 = new Float32Array(N), y1 = new Float32Array(N);
    let W = 0, H = 0, tam = 2, passo = 0, t0 = 0, raf = null, extras = null, tmrTour = null;

    /* ---------- onde fica cada ponto em cada passo ---------- */
    function layout(k) {
      extras = null;
      if (k === 0) {   // no mapa, perto da própria cidade
        const e = Math.min(W / 960, (H - 10) / 900), ox = (W - 960 * e) / 2;
        for (let i = 0; i < N; i++) { const a = sorte[i] * 6.283, r = Math.sqrt((i * 7919 % 1000) / 1000) * 5; x1[i] = ox + cidX[i] * e + Math.cos(a) * r; y1[i] = 5 + cidY[i] * e + Math.sin(a) * r; }
        tam = W < 600 ? 1.2 : 1.5; return;
      }
      if (k === 1) {   // três blocos, um por tipo, todos com as mesmas linhas
        let melhor = null;
        for (let L = 20; L <= 600; L += 2) {
          const cols = TIPOS.map(([t]) => Math.ceil(qtd[t] / L)), C = cols.reduce((a, b) => a + b, 0), gap = 6;
          const s = Math.min((W - 2 * gap * 4) / C, (H - 60) / L);
          if (!melhor || s > melhor.s) melhor = { L, cols, s };
        }
        const { L, cols } = melhor, s = melhor.s >= 2 ? Math.floor(melhor.s) : melhor.s, larg = cols.reduce((a, b) => a + b, 0) * s + 2 * 24, oy = 52 + (H - 60 - L * s) / 2;
        let ox = (W - larg) / 2; const contas = [0, 0, 0], inicio = [];
        cols.forEach((c, t) => { inicio[t] = ox; ox += c * s + 24; });
        for (let i = 0; i < N; i++) { const t = tipo[i], q = contas[t]++; x1[i] = inicio[t] + Math.floor(q / L) * s; y1[i] = oy + (L - 1 - (q % L)) * s; }
        extras = { rotulos: TIPOS.map(([k2], t) => [inicio[t], oy - 10, `${CURTO[k2]}\n${mi({ faltou: P.abst, branco: P.brancos, nulo: P.nulos }[k2])} mi`]) };
        tam = s >= 2 ? s - 1 : Math.max(1, s * 0.78); return;
      }
      if (k === 2) {   // estádios: cada oval é um Maracanã cheio
        const qtdE = Math.ceil(N / (MARACANA / POR_PONTO)), aspecto = W / H;
        const cols = Math.max(10, Math.round(Math.sqrt(qtdE * aspecto * 0.75))), lins = Math.ceil(qtdE / cols);
        const cw = W / cols, ch = (H - 10) / lins, rx = cw * 0.42, ry = Math.min(ch * 0.42, rx * 0.72);
        const ordem = Array.from({ length: N }, (_, i) => i).sort((a, b) => tipo[a] - tipo[b]);
        ordem.forEach((i, q) => {
          const e = Math.floor(q / (MARACANA / POR_PONTO)), dentro = q - Math.ceil(e * (MARACANA / POR_PONTO)), a = (dentro / (MARACANA / POR_PONTO)) * 6.283 * 2;
          const anel = dentro % 2 ? 0.72 : 1, cx = (e % cols + 0.5) * cw, cy = 5 + (Math.floor(e / cols) + 0.5) * ch;
          x1[i] = cx + Math.cos(a) * rx * anel; y1[i] = cy + Math.sin(a) * ry * anel;
        });
        tam = W < 600 ? 1 : 1.3; return;
      }
      // contra o mais votado: o Ninguém vira uma coluna; a do partido líder fica desenhada ao lado, na mesma escala
      const s0 = Math.max(1.6, Math.sqrt((W * 0.28 * (H - 60)) / N) * 0.98), s = s0 >= 2 ? Math.floor(s0) : s0, cols = Math.max(8, Math.floor((W * 0.28) / s)), linhas = Math.ceil(N / cols);
      const sy = Math.min(s, (H - 60) / linhas), base = H - 24, ox = W * 0.16;
      const ordem = Array.from({ length: N }, (_, i) => i).sort((a, b) => tipo[a] - tipo[b]);
      ordem.forEach((i, q) => { x1[i] = ox + (q % cols) * s; y1[i] = base - Math.floor(q / cols) * sy; });
      const hl = (Math.ceil(lider[1] / POR_PONTO / cols)) * sy;
      extras = { barra: [W * 0.58, base - hl, cols * s, hl], rotulos: [[ox, base - linhas * sy - 12, `Ninguém: ${V.int(total)}`], [W * 0.58, base - hl - 12, `${V.nomePartido(lider[0])}: ${V.int(lider[1])}`]] };
      tam = Math.min(s, sy) >= 3 ? Math.floor(Math.min(s, sy)) - 1 : Math.max(1, Math.min(s, sy));   // passo pequeno: sem vão, para não formar listras
    }

    /* ---------- desenho ---------- */
    const DUR = 1500, ESPALHA = 700;
    function desenhar(agora) {
      if (!canvas.isConnected) { removeEventListener("resize", medir); clearTimeout(tmrTour); return; }
      const g = (agora - t0) / (DUR + ESPALHA);
      ctx.clearRect(0, 0, W, H);
      let falta = false;
      for (let t = TIPOS.length - 1; t >= 0; t--) {
        ctx.fillStyle = TIPOS[t][2];
        for (let i = 0; i < N; i++) {
          if (tipo[i] !== t) continue;
          let f = (agora - t0 - sorte[i] * ESPALHA) / DUR; if (V.semMovimento()) f = 1;
          f = f <= 0 ? 0 : f >= 1 ? 1 : V.suave(f); if (f < 1) falta = true;
          ctx.fillRect(x0[i] + (x1[i] - x0[i]) * f, y0[i] + (y1[i] - y0[i]) * f, tam, tam);
        }
      }
      if (extras) {
        ctx.globalAlpha = Math.max(0, Math.min(1, (g - 0.6) * 3));
        if (extras.barra) { const [x, y, w, h] = extras.barra; ctx.fillStyle = "rgba(29,60,158,.18)"; ctx.fillRect(x, y, w, h); ctx.strokeStyle = "#1d3c9e"; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h); }
        ctx.fillStyle = "#16181d"; ctx.font = `700 ${W < 600 ? 13 : 16}px "Atkinson Hyperlegible", system-ui, sans-serif`;
        const lh = W < 600 ? 16 : 19;
        for (const [x, y, txt] of extras.rotulos) txt.split("\n").forEach((l, j, ls) => ctx.fillText(l, x, y - (ls.length - 1 - j) * lh));
        ctx.globalAlpha = 1;
      }
      if (falta || g < 1.2) raf = requestAnimationFrame(desenhar);
    }
    function ir(k, primeira) {
      passo = k;
      for (let i = 0; i < N; i++) {   // parte de onde está agora (ou de um ponto no meio, na primeira vez)
        if (primeira) { x0[i] = W / 2 + (sorte[i] - 0.5) * 40; y0[i] = H / 2 + ((i * 31 % 97) / 97 - 0.5) * 40; } else { x0[i] = x1[i]; y0[i] = y1[i]; }
      }
      layout(k);
      document.getElementById("mult-txt").innerHTML = `<b>${PASSOS[k][0]}.</b> ${PASSOS[k][1]}`;
      main.querySelectorAll("[data-passo]").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.passo === k));
      document.getElementById("mult-prox").textContent = k === PASSOS.length - 1 ? "Ver de novo ↺" : "Próximo ›";
      cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(desenhar);
    }
    function medir() {
      if (!canvas.isConnected) return;
      const dpr = Math.min(2, devicePixelRatio || 1);
      W = V.larguraUtil(canvas.parentElement); H = W < 600 ? Math.round(W * 1.15) : Math.min(620, Math.round(W * 0.56));
      canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout(passo); x0.set(x1); y0.set(y1); t0 = -1e9; raf = requestAnimationFrame(desenhar);
    }
    medir(); addEventListener("resize", medir);
    main.querySelector(".vis-passos").addEventListener("click", (e) => { const b = e.target.closest("[data-passo]"); if (b) ir(+b.dataset.passo); });
    document.getElementById("mult-prox").addEventListener("click", () => ir((passo + 1) % PASSOS.length));
    ir(0, true);
    // na apresentação, os passos andam sozinhos
    if (V.tourAtivo && V.tourAtivo()) { const anda = () => { if (!canvas.isConnected || passo === PASSOS.length - 1) return; ir(passo + 1); tmrTour = setTimeout(anda, 5200); }; tmrTour = setTimeout(anda, 5200); }
  });
})();
