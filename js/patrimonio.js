/* Voto a voto — corrida do patrimônio: os dez eleitos com mais bens declarados ao TSE em cada eleição geral,
   de 2006 a 2026, em barras que se ultrapassam. Dados: data/br/patrimonio (scripts/corrida_patrimonio.py). */
(function () {
  "use strict";
  const V = window.V;
  const TOP = 10, PASSA = 1400, PARA = 2000;
  const CARGO = { 1: "Presidente", 3: "Governador", 5: "Senador", 6: "Dep. federal" };

  V.rota(/^\/patrimonio$/, async function (main) {
    V.marcarNav("explorar");
    document.title = "Corrida do patrimônio · Voto a voto";
    const [D, BR] = await Promise.all([V.dados("br/patrimonio"), V.baseBR()]);
    const anos = Object.keys(D.anos).map(Number).sort();
    main.innerHTML = `<div class="pagina vis">
      <header class="manchete"><p class="manchete__onde"><a href="#/explorar">Explorar</a> · Corrida do patrimônio</p>
        <h1 class="manchete__titulo">Os eleitos com mais bens declarados, de ${anos[0]} a ${anos[anos.length - 1]}</h1>
        <p class="manchete__sub">Presidente, governador, senador e deputado federal eleitos. A cor é o lado do partido em cada eleição; clique numa barra para abrir a ficha.</p></header>
      <div class="vis-controles"><div class="vis-chips rolagem-x" role="group" aria-label="Ano">${anos.map((a, k) => `<button type="button" class="chip" data-ano="${a}" aria-pressed="${k === 0}">${a}</button>`).join("")}</div>
        <button type="button" class="btn btn--confirma vis-play" id="pat-play" aria-pressed="false">▶ Começar a corrida</button></div>
      <div class="cartao vis-corrida"><svg id="pat-svg" role="img"></svg><p class="vis-ano vis-ano--corrida" id="pat-ano" aria-hidden="true">${anos[0]}</p></div>
      <ol class="visualmente-oculto" id="pat-lista" aria-live="polite"></ol>
      <p class="pq-nota">Fonte: TSE, bens declarados pelos candidatos, em reais da época, sem correção pela inflação. Só entram os eleitos: entre todos os candidatos, o topo da lista é tomado por erros de digitação do próprio arquivo do TSE (em 2018, três candidatos a deputado federal declararam cerca de R$ 1 bilhão cada). A soma é do que a pessoa declarou, não uma auditoria do patrimônio.</p>
    </div>`;
    const svg = d3.select("#pat-svg"), caixa = main.querySelector(".vis-corrida");
    const linhaH = innerWidth < 600 ? 40 : 44, m = { t: 8, r: innerWidth < 600 ? 74 : 110, b: 8, l: 8 };
    let W = 0, i = 0, tocando = false, tmr = null;
    const cor = (x, ano) => V.corNota(V.notaDe(x[2], ano));
    const fmt = (v) => (v >= 1e9 ? "R$ " + (v / 1e9).toFixed(2).replace(".", ",") + " bi" : "R$ " + (v / 1e6).toFixed(1).replace(".", ",") + " mi");

    function desenhar(k, dur) {
      const ano = anos[k], dados = D.anos[ano].slice(0, TOP), max = d3.max(dados, (x) => x[5]) || 1;
      W = caixa.clientWidth - 40; const H = m.t + TOP * linhaH + m.b;
      svg.attr("viewBox", `0 0 ${W} ${H}`).attr("width", W).attr("height", H).attr("aria-label", `Em ${ano}: ` + dados.map((x, r) => `${r + 1}º ${V.titulo(x[1])}, ${fmt(x[5])}`).join("; "));
      const x = d3.scaleLinear().domain([0, max]).range([0, W - m.l - m.r]), y = (r) => m.t + r * linhaH;
      // o nome vai dentro da barra quando cabe; senão, logo depois dela, e o valor depois do nome
      const info = (d) => `${V.nomePartido(d[2])} · ${CARGO[d[3]]}${d[4] && d[4] !== "BR" ? " · " + d[4] : ""}`;
      const larg = (d) => Math.max(V.titulo(d[1]).length * (innerWidth < 600 ? 7.6 : 8.6), info(d).length * (innerWidth < 600 ? 6 : 6.8)), dentro = (d) => x(d[5]) > larg(d) + 16;
      const t = svg.transition().duration(dur).ease(d3.easeCubicInOut);
      const g = svg.selectAll("g.vis-barra-p").data(dados, (d) => d[0]);
      const novo = g.enter().append("g").attr("class", "vis-barra-p").attr("transform", `translate(${m.l},${H + 10})`).style("opacity", 0).style("cursor", "pointer");
      novo.append("rect").attr("height", linhaH - 8).attr("rx", 4).attr("width", 0);
      novo.append("text").attr("class", "vis-barra-p__nome").attr("y", (linhaH - 8) / 2 - 2).attr("dy", ".1em");
      novo.append("text").attr("class", "vis-barra-p__info").attr("y", (linhaH - 8) / 2 + 13);
      novo.append("text").attr("class", "vis-barra-p__valor").attr("y", (linhaH - 8) / 2).attr("dy", ".35em");
      novo.append("title");
      const todos = novo.merge(g);
      todos.on("click", (ev, d) => V.ir("#/politico/" + d[0]));
      todos.select("title").text((d) => `${V.titulo(d[1])}: ${fmt(d[5])} em ${ano}`);
      todos.transition(t).attr("transform", (d, r) => `translate(${m.l},${y(r)})`).style("opacity", 1);
      todos.select("rect").transition(t).attr("width", (d) => Math.max(4, x(d[5]))).attr("fill", (d) => cor(d, ano));
      todos.select(".vis-barra-p__nome").text((d) => V.titulo(d[1])).attr("x", 8).attr("fill", (d) => V.textoNota(V.notaDe(d[2], ano)))
        .transition(t).attr("x", (d) => (dentro(d) ? 8 : x(d[5]) + 8)).attr("fill", (d) => (dentro(d) ? V.textoNota(V.notaDe(d[2], ano)) : "#16181d"));
      todos.select(".vis-barra-p__info").text(info)
        .transition(t).attr("x", (d) => (dentro(d) ? 8 : x(d[5]) + 8)).attr("fill", (d) => (dentro(d) ? V.textoNota(V.notaDe(d[2], ano)) : "#444b56"));
      todos.select(".vis-barra-p__valor").transition(t).attr("x", (d) => Math.max(4, x(d[5])) + 8 + (dentro(d) ? 0 : larg(d) + 10))
        .tween("text", function (d) { const de = +this.dataset.v || 0, f = d3.interpolateNumber(de, d[5]); this.dataset.v = d[5]; return (s) => { this.textContent = fmt(f(s)); }; });
      g.exit().transition(t).attr("transform", `translate(${m.l},${H + 10})`).style("opacity", 0).remove();
      document.getElementById("pat-ano").textContent = ano;
      document.getElementById("pat-lista").innerHTML = dados.map((d) => `<li>${V.esc(V.titulo(d[1]))}, ${V.esc(d[2])}: ${fmt(d[5])}</li>`).join("");
      main.querySelectorAll("[data-ano]").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.ano === ano));
    }
    const play = document.getElementById("pat-play");
    const parar = () => { tocando = false; clearTimeout(tmr); play.textContent = "▶ Começar a corrida"; play.setAttribute("aria-pressed", "false"); };
    const tocar = () => {
      tocando = true; play.textContent = "❚❚ Pausar"; play.setAttribute("aria-pressed", "true");
      const prox = () => { if (!tocando || !caixa.isConnected) return; if (i === anos.length - 1) { parar(); return; } i++; desenhar(i, V.semMovimento() ? 0 : PASSA); tmr = setTimeout(prox, PASSA + PARA); };
      if (i === anos.length - 1) { i = 0; desenhar(0, V.semMovimento() ? 0 : PASSA); tmr = setTimeout(prox, PASSA + PARA); } else prox();
    };
    play.addEventListener("click", () => (tocando ? parar() : tocar()));
    main.querySelector(".vis-chips").addEventListener("click", (e) => { const b = e.target.closest("[data-ano]"); if (b) { parar(); i = anos.indexOf(+b.dataset.ano); desenhar(i, V.semMovimento() ? 0 : 900); } });
    const redim = () => { if (!caixa.isConnected) { removeEventListener("resize", redim); return; } desenhar(i, 0); };
    addEventListener("resize", redim);
    desenhar(0, 0);
    if (V.tourAtivo && V.tourAtivo()) setTimeout(tocar, 900);
  });
})();
