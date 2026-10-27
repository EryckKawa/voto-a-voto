/* Voto a voto — máquina do tempo: o mapa das 5.570 cidades passando eleição por eleição, de 1994 a 2026.
   As cores mudam aos poucos de um ano para o outro; a barra embaixo conta as cidades de cada lado. */
(function () {
  "use strict";
  const V = window.V;
  const PASSA = 900, PARA = 1300;   // ms da troca de cores e da pausa em cada ano

  V.rota(/^\/tempo(?:\/(PRES|GOV|PREF))?$/, async function (main, cg) {
    V.marcarNav("explorar");
    const cargo = cg || "PRES", anos = V.ANOS_VIS[cargo];
    document.title = "Máquina do tempo · Voto a voto";
    main.innerHTML = `<div class="pagina pagina--larga vis">
      <header class="manchete"><p class="manchete__onde"><a href="#/explorar">Explorar</a> · Máquina do tempo</p>
        <h1 class="manchete__titulo">Trinta anos de eleições em um minuto</h1>
        <p class="manchete__sub">Cada cidade com a cor do lado de quem ficou em primeiro lugar, eleição por eleição. Aperte o play e veja o país mudar.</p></header>
      <div class="vis-controles">${V.chipsVis(["PRES", "GOV", "PREF"], cargo, anos[0])}</div>
      <div class="vis-tempo">
        <div class="vis-tempo__mapa"><p class="vis-3d__carrega" id="tempo-carrega">Desenhando o mapa…</p><canvas id="tempo-mapa" role="img" aria-label="Mapa das cidades do Brasil"></canvas>
          <p class="vis-ano" id="tempo-ano" aria-hidden="true">${anos[0]}</p></div>
        <div class="vis-tempo__lado">
          <p><button type="button" class="btn btn--confirma vis-play" id="tempo-play" aria-pressed="false" disabled>Carregando os anos…</button></p>
          <div id="tempo-resumo" aria-live="polite"></div>
          ${V.legendaLados()}
          <p class="pq-nota">Clique numa cidade para abrir o mapa daquela eleição. A cor é a nota do partido de quem venceu na cidade, pela régua do site (<a href="#/partidos">como é feita</a>). Cidades criadas depois de uma eleição aparecem sem resultado nela.</p>
        </div>
      </div></div>`;
    const canvas = document.getElementById("tempo-mapa");
    // o primeiro ano aparece logo; os outros chegam pela rede enquanto isso
    const [M, v0] = await Promise.all([V.mapaCanvas(canvas), V.dados("br/venc/" + cargo + anos[0])]);
    const vencs = [], cores = [], resumos = [];
    const preparar = (k, v) => { vencs[k] = v; cores[k] = M.cids.map((c) => d3.color(V.corVenc(v[c.id]))); resumos[k] = V.resumoVis(v, cargo); };
    preparar(0, v0);
    const todos = Promise.all(anos.slice(1).map((a, k) => V.dados("br/venc/" + cargo + a).then((v) => preparar(k + 1, v))));
    document.getElementById("tempo-carrega").remove();
    let i = 0, tocando = false, tmr = null, raf = null;
    const elAno = document.getElementById("tempo-ano"), elRes = document.getElementById("tempo-resumo"), play = document.getElementById("tempo-play");

    const textoResumo = (k) => {
      const r = resumos[k], [a, b] = r.top;
      return `<p class="vis-resumo__ano">${anos[k]}</p><p class="vis-resumo__txt">${a ? `<b>${V.esc(a[0])}</b> ficou em 1º em ${V.int(a[1])} cidades` : "Sem resultados"}${b ? `; <b>${V.esc(b[0])}</b>, em ${V.int(b[1])}` : ""}.</p>${V.barraLados(r)}`;
    };
    const mostrar = (k) => {
      elAno.textContent = anos[k]; elRes.innerHTML = textoResumo(k);
      canvas.setAttribute("aria-label", `Mapa de ${V.NOME_VIS[cargo].toLowerCase()} em ${anos[k]}: esquerda em ${resumos[k].lados.esquerda} cidades, centro em ${resumos[k].lados.centro}, direita em ${resumos[k].lados.direita}`);
      main.querySelectorAll("[data-vis-ano]").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.visAno === anos[k]));
    };
    // troca de cores animada do ano "de" para o ano "para"
    const ir = (para) => {
      const de = i; i = para; mostrar(para); cancelAnimationFrame(raf);
      if (V.semMovimento() || de === para) { M.pintar((n) => cores[para][n]); return; }
      const t0 = performance.now();
      const passo = (t) => {
        if (!canvas.isConnected) return;
        const f = V.suave(Math.min(1, (t - t0) / PASSA));
        M.pintar((n) => { const a = cores[de][n], b = cores[para][n]; return `rgb(${a.r + (b.r - a.r) * f | 0},${a.g + (b.g - a.g) * f | 0},${a.b + (b.b - a.b) * f | 0})`; });
        if (f < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
    };
    const parar = () => { tocando = false; clearTimeout(tmr); play.textContent = "▶ Passar os anos"; play.setAttribute("aria-pressed", "false"); };
    const tocar = () => {
      tocando = true; play.textContent = "❚❚ Pausar"; play.setAttribute("aria-pressed", "true");
      const proximo = () => { if (!tocando || !canvas.isConnected) return; if (i === anos.length - 1) { parar(); return; } ir(i + 1); tmr = setTimeout(proximo, PASSA + PARA); };
      if (i === anos.length - 1) { ir(0); tmr = setTimeout(proximo, PASSA + PARA); } else proximo();
    };
    play.addEventListener("click", () => (tocando ? parar() : tocar()));
    main.querySelector(".vis-controles").addEventListener("click", (e) => {
      const a = e.target.closest("[data-vis-ano]"), c = e.target.closest("[data-vis-cargo]");
      if (a) { parar(); todos.then(() => ir(anos.indexOf(+a.dataset.visAno))); }
      if (c && c.dataset.visCargo !== cargo) { parar(); V.ir("#/tempo/" + c.dataset.visCargo); }
    });
    canvas.addEventListener("mousemove", (ev) => {
      const c = M.achar(ev), w = c && vencs[i][c.ibge];
      V.dica(ev, c ? (w && w[9] ? V.linhasDica(`${c.nome} (${c.uf}) · ${anos[i]}`, [["1º lugar", V.titulo(w[1])], ["Partido", V.nomePartido(w[2])], ["Votos válidos", V.pct(w[3])]]) : `<b>${V.esc(c.nome)} (${c.uf})</b>Sem resultado em ${anos[i]}`) : null);
    });
    canvas.addEventListener("mouseleave", () => V.dica(null, null));
    canvas.addEventListener("click", (ev) => { const c = M.achar(ev); if (c) { parar(); V.dica(null, null); V.ir(`#/mapa/e/${cargo}${anos[i]}/br/${c.uf}/c/${c.ibge}`); } });
    const redimensionar = () => { if (!canvas.isConnected) { removeEventListener("resize", redimensionar); return; } M.medir(); M.pintar((n) => cores[i][n]); };
    addEventListener("resize", redimensionar);
    ir(0);
    todos.then(() => {
      if (!canvas.isConnected) return;
      play.disabled = false; play.textContent = "▶ Passar os anos";
      if (V.tourAtivo && V.tourAtivo()) tocar();   // quem chega pela apresentação já vê o filme rodando
    });
  });
})();
