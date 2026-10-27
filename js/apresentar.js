/* Voto a voto — página Explorar (as visualizações novas) e modo apresentação: uma barra fixa embaixo leva o site
   por um roteiro, passo a passo, com as setas do teclado ou o passador de slides (PageDown/PageUp). */
(function () {
  "use strict";
  const V = window.V;
  const ROTEIRO = [
    ["#/", "O candidato mais votado do Brasil se chama Ninguém", "Em 2024, 42,6 milhões de eleitores faltaram, anularam ou votaram em branco para prefeito."],
    ["#/multidao", "Ninguém, em pessoas", "Cada ponto são mil eleitores. Eles saem das cidades onde moram e lotam o Maracanã 539 vezes."],
    ["#/mapa", "As 5.570 cidades", "Cada cidade com a cor do lado de quem venceu, de 1994 a 2026, em sete cargos."],
    ["#/tempo", "Trinta anos em um minuto", "As eleições para presidente passando uma a uma, cidade por cidade."],
    ["#/3d", "O Brasil em 3D", "Cada coluna é uma cidade: a altura é o número de eleitores; a cor, o lado de quem venceu."],
    ["#/perguntas", "As 12 perguntas do trabalho", "Cada resposta traz o gráfico, a tabela e a consulta SQL que a produziu, no banco nacional."],
    ["#/partidos", "Onde fica cada partido", "Entre a esquerda e a direita, segundo três estudos acadêmicos e o voto na Câmara."],
    ["#/politico/1713641", "A ficha de 2,4 milhões de candidatos", "Cada eleição, partido, votos, dinheiro e bens. E cada ficha vira uma carta.", () => esperar("#pol-carta", 6000).then((b) => b && setTimeout(() => b.isConnected && b.click(), 1200))],
    ["#/patrimonio", "Quem declarou mais bens", "Os eleitos com mais bens declarados ao TSE, eleição por eleição, de 2006 a 2026."],
    ["#/testes", "Tudo conferido", "Testes de velocidade, funcionamento, acessibilidade e dos números com os resultados oficiais do TSE."],
  ];
  const esperar = (sel, ms) => new Promise((ok) => { const t0 = Date.now(); const f = () => { const e = document.querySelector(sel); if (e || Date.now() - t0 > ms) ok(e); else setTimeout(f, 150); }; f(); });
  let passo = -1, barra = null;
  V.tourAtivo = () => passo >= 0;

  function mostrar(k) {
    passo = Math.max(0, Math.min(ROTEIRO.length - 1, k));
    const [h, tit, fala, depois] = ROTEIRO[passo];
    barra.querySelector(".vis-tour__tit").textContent = tit;
    barra.querySelector(".vis-tour__fala").textContent = fala;
    barra.querySelector(".vis-tour__n").textContent = `${passo + 1} de ${ROTEIRO.length}`;
    barra.querySelector("[data-t='ant']").disabled = passo === 0;
    barra.querySelector("[data-t='prox']").textContent = passo === ROTEIRO.length - 1 ? "Fim" : "Próximo ›";
    const carta = document.querySelector(".vis-carta"); if (carta) carta.remove();
    V.ir(h);
    if (depois) depois();
  }
  function sair() {
    passo = -1; if (barra) barra.remove(); barra = null;
    removeEventListener("keydown", tecla, true);
    document.body.classList.remove("com-tour");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  function tecla(e) {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (["ArrowRight", "PageDown"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); passo === ROTEIRO.length - 1 ? sair() : mostrar(passo + 1); }
    else if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); mostrar(passo - 1); }
    else if (e.key === "Escape" && !document.querySelector(".vis-carta")) sair();
  }
  V.comecarTour = (k = 0) => {
    if (!barra) {
      barra = document.createElement("div");
      barra.className = "vis-tour"; barra.setAttribute("role", "region"); barra.setAttribute("aria-label", "Modo apresentação");
      barra.innerHTML = `<button type="button" class="btn" data-t="ant" aria-label="Passo anterior">‹</button>
        <div class="vis-tour__txt" aria-live="polite"><p class="vis-tour__tit"></p><p class="vis-tour__fala"></p></div>
        <span class="vis-tour__n"></span>
        <button type="button" class="btn btn--confirma" data-t="prox">Próximo ›</button>
        <button type="button" class="btn vis-tour__tela" data-t="tela">Tela cheia</button>
        <button type="button" class="btn" data-t="sair" aria-label="Sair da apresentação">✕</button>`;
      barra.addEventListener("click", (e) => {
        const b = e.target.closest("[data-t]"); if (!b) return;
        if (b.dataset.t === "prox") passo === ROTEIRO.length - 1 ? sair() : mostrar(passo + 1);
        if (b.dataset.t === "ant") mostrar(passo - 1);
        if (b.dataset.t === "sair") sair();
        if (b.dataset.t === "tela") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
      });
      document.body.append(barra); document.body.classList.add("com-tour");
      addEventListener("keydown", tecla, true);
    }
    mostrar(k);
  };

  // #/apresentar começa o roteiro (dá para mandar o link direto)
  V.rota(/^\/apresentar$/, async function (main) {
    main.innerHTML = '<div class="carregando">Abrindo a apresentação…</div>';
    setTimeout(() => V.comecarTour(0), 0);
  });

  V.rota(/^\/explorar$/, async function (main) {
    V.marcarNav("explorar");
    document.title = "Explorar · Voto a voto";
    const CARTOES = [
      ["#/3d", "Brasil em 3D", "Cada cidade vira uma coluna: a altura é o número de eleitores, a cor é o lado de quem venceu. Gire, aproxime e veja as colunas subirem.", "vis-card--3d"],
      ["#/tempo", "Máquina do tempo", "As eleições de 1994 a 2026 passando como um filme, cidade por cidade.", "vis-card--tempo"],
      ["#/multidao", "A multidão do Ninguém", "42,6 milhões de eleitores que não escolheram ninguém, um ponto para cada mil, enchendo estádios.", "vis-card--multidao"],
      ["#/patrimonio", "Corrida do patrimônio", "Os eleitos com mais bens declarados, ultrapassando uns aos outros eleição a eleição.", "vis-card--patrimonio"],
      ["#/politico/1713641", "Carta do político", "Toda ficha de político vira uma carta colecionável, que dá para virar e baixar. Exemplo: Lula.", "vis-card--carta"],
    ];
    main.innerHTML = `<div class="pagina vis">
      <header class="manchete"><h1 class="manchete__titulo">Explorar: os dados em movimento</h1>
        <p class="manchete__sub">Os mesmos dados do TSE das outras páginas, em formas para ver e mexer.</p>
        <p><button type="button" class="btn btn--confirma vis-comecar" id="vis-comecar">▶ Começar a apresentação</button> <small class="vis-dica-tecla">Passe com as setas ← → ou com o passador de slides; Esc sai.</small></p></header>
      <ul class="vis-cards">${CARTOES.map(([h, t, d, c]) => `<li><a class="vis-card ${c}" href="${h}"><span class="vis-card__arte" aria-hidden="true"></span><span class="vis-card__tit">${t}</span><span class="vis-card__txt">${d}</span></a></li>`).join("")}</ul>
    </div>`;
    document.getElementById("vis-comecar").addEventListener("click", () => V.comecarTour(0));
  });
})();
