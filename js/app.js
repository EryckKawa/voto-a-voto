/* Voto a voto — inicialização. */
(function () {
  "use strict";
  const V = window.V;
  V.ligarBusca(document.getElementById("busca"), document.getElementById("busca-lista"));

  /* disputas mais apertadas para prefeito, no Brasil inteiro */
  V.rota(/^\/apertadas$/, async function (main) {
    V.marcarNav("apertadas");
    const BR = await V.baseBR(), ano = 2024, W = await V.dados("br/venc/PREF" + ano);
    const lista = Object.entries(W).filter(([ib, w]) => w[9] && w[6] && BR.porIbge.get(ib)).map(([ib, w]) => ({ c: BR.porIbge.get(ib), w })).sort((a, b) => a.w[5] - b.w[5]);
    const ate10 = lista.filter((x) => x.w[5] < 10).length, empates = lista.filter((x) => x.w[5] === 0).length, top = lista.slice(0, 30);
    const U = Object.fromEntries(await Promise.all([...new Set(top.map((x) => x.c.uf))].map(async (u) => [u, await V.dados("br/uf/" + u + "_PREF" + ano)])));
    const notas = BR.ideo.anos[ano] || {}, nt = (sg) => (notas[sg] ? notas[sg][0] : null);
    const pessoa = (k, eleito) => `<span class="santo"><span class="mini-foto"><span class="iniciais" style="background:${V.parNota(nt(k[1]))[0]};color:${V.parNota(nt(k[1]))[1]};font-size:16px">${V.esc(V.iniciais(k[0]))}</span></span><span class="santo__nome">${V.esc(V.titulo(k[0]))} <small>${V.esc(k[1])}</small>${eleito ? '<span class="selo selo--eleito">Eleito</span>' : ""}</span></span>`;
    document.title = "Disputas apertadas · Voto a voto";
    main.innerHTML = `<div class="pagina pagina--larga">
      <header class="manchete"><p class="manchete__onde"><a href="#/mapa">Brasil</a> · Prefeito ${ano}</p>
        <h1 class="manchete__titulo">Em ${ano}, ${V.int(ate10)} prefeituras foram decididas por menos de 10 votos</h1>
        <p class="manchete__sub">${empates ? `Em ${V.int(empates)} ${empates === 1 ? "cidade houve empate" : "cidades houve empate"}: pela lei, vence o candidato mais velho. ` : ""}Abaixo, as ${top.length} disputas mais apertadas do país, da menor diferença para a maior.</p></header>
      <ol class="apertadas">${top.map(({ c, w }) => { const C = U[c.uf].c, a = C[w[0]], b = C[w[6]];
        return `<li><a href="#/mapa/br/${c.uf}/c/${c.ibge}"><span class="apertadas__dif">${w[5] === 0 ? "Empate" : V.int(w[5]) + (w[5] === 1 ? " voto" : " votos")}</span>
          <span class="apertadas__cid">${V.esc(c.nome)} <small>${c.uf}</small></span>${pessoa(a, true)}${b ? pessoa(b, false) : ""}</a></li>`; }).join("")}</ol>
    </div>`;
  });

  V.iniciarRotas();
})();
