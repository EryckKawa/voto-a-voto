/* Voto a voto — mapa do Brasil com os municípios dos 6 estados (página inicial). */
(function () {
  "use strict";
  const V = window.V;
  V.MAJ = [
    ["PREF2024", "Prefeito", 2024], ["PREF2020", "Prefeito", 2020], ["PRES2022", "Presidente", 2022], ["PRES2018", "Presidente", 2018],
    ["GOV2026", "Governador", 2026], ["GOV2022", "Governador", 2022], ["GOV2018", "Governador", 2018], ["SEN2026", "Senador", 2026], ["SEN2022", "Senador", 2022],
  ];
  V.PERGUNTAS = [
    ["q1", "Dinheiro", "Quanto custa uma cadeira?", "Divida o que cada partido gastou pelo número de eleitos."],
    ["q2", "Dinheiro", "Quem tem mais dinheiro se elege mais?", "Separe os candidatos em cinco grupos pelo dinheiro de campanha."],
    ["q3", "Território", "A cidade rica vota diferente da cidade pobre?", "Compare cidades pelo tamanho e pela renda."],
    ["q4", "Perfil", "Cidade grande elege quem estudou mais?", "Compare candidatos e eleitos pela escolaridade."],
    ["q5", "Partidos", "Quem ainda vota só no número do partido?", "Veja o voto de legenda de cada partido."],
    ["q6", "Partidos", "Do que falam os planos de governo?", "Leia as palavras mais usadas por esquerda e direita."],
    ["q7", "Perfil", "Jovem tem chance de se eleger?", "Compare jovens e mais velhos em cada campo político."],
    ["q8", "Dinheiro", "Para quem as empresas doavam?", "Volte a 2012 e 2014, antes da proibição."],
    ["q9", "Território", "Para que lado a sua cidade foi?", "Siga cada cidade de 2018 a 2024."],
    ["q10", "Dinheiro", "Quem vive de dinheiro público?", "Compare a receita de eleitos e não eleitos."],
    ["q11", "Dinheiro", "Onde vai o dinheiro da campanha?", "Abra a conta das despesas declaradas."],
    ["q12", "Carreira", "Quanto dura uma carreira política?", "Siga quem se elegeu e veja quem volta."],
  ];
  let GEO = null;
  async function geo() {
    if (GEO) return GEO;
    const [br, mu] = await Promise.all([V.dados("geo/brasil"), V.dados("geo/municipios")]);
    GEO = { br: topojson.feature(br, br.objects[Object.keys(br.objects)[0]]), mu: topojson.feature(mu, mu.objects[Object.keys(mu.objects)[0]]) };
    // o d3 espera anéis no sentido horário; polígonos invertidos cobririam o globo inteiro
    const conserta = (fc) => fc.features.forEach((f) => { if (d3.geoArea(f) > 2 * Math.PI) { const g = f.geometry; const rev = (pol) => pol.map((r) => r.slice().reverse()); g.coordinates = g.type === "Polygon" ? rev(g.coordinates) : g.coordinates.map(rev); } });
    conserta(GEO.br); conserta(GEO.mu);
    GEO.ufsGrupo = { type: "FeatureCollection", features: GEO.br.features.filter((f) => V.UFS[f.properties.SIGLA]) };
    return GEO;
  }
  V.geo = geo;

  /* cor de uma cidade: campo político do vencedor, mais forte quanto maior a votação */
  V.corVitoria = (w) => {
    if (!w) return "#e9ebee";
    const base = V.corPartido(w[2]);
    const t = Math.max(0, Math.min(1, (w[3] - 30) / 45));
    return d3.interpolateRgb("#f1f2f4", base)(0.35 + 0.65 * t);
  };

  /* desenha o mapa e devolve funções para recolorir e aproximar */
  V.desenharMapa = async function (host, opts) {
    const G = await geo(), venc = await V.dados("vencedores");
    const W = 900, H = 820;
    const proj = d3.geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], G.br);
    const path = d3.geoPath(proj);
    host.innerHTML = "";
    const svg = d3.select(host).append("svg").attr("class", "mapa-svg").attr("viewBox", [0, 0, W, H]).attr("role", "img").attr("aria-label", "Mapa do Brasil com os municípios do Ceará, Espírito Santo, Mato Grosso, Paraná, Santa Catarina e Tocantins");
    const g = svg.append("g");
    g.append("g").selectAll("path").data(G.br.features).join("path").attr("class", "uf-fora").attr("d", path);
    const mun = g.append("g").selectAll("path").data(G.mu.features).join("path").attr("class", "mun").attr("d", path)
      .attr("tabindex", -1)
      .on("mousemove", (ev, f) => {
        const c = V.porIbge.get(String(f.properties.id)); if (!c) return;
        const w = (venc[c.ibge] || {})[opts.chave()];
        V.dica(ev, w ? V.linhasDica(c.nome + " (" + c.uf + ")", [["Venceu", V.titulo(w[1]) + " · " + w[2]], ["Votos válidos", V.pct(w[3])], ["Diferença para o 2º", V.pct(w[4]) + " pontos"]]) : "<b>" + V.esc(c.nome) + "</b>Sem eleição neste ano");
      })
      .on("mouseleave", () => V.dica(null, null))
      .on("click", (ev, f) => { V.dica(null, null); V.ir("#/cidade/" + f.properties.id); });
    g.append("g").selectAll("path").data(G.ufsGrupo.features).join("path").attr("class", "uf-grupo").attr("d", path);
    const rot = g.append("g").selectAll("text").data(G.ufsGrupo.features).join("text").attr("class", "uf-rotulo")
      .attr("transform", (f) => "translate(" + path.centroid(f) + ")").attr("text-anchor", "middle").text((f) => f.properties.SIGLA);
    function colorir() { const k = opts.chave(); mun.attr("fill", (f) => { const c = V.porIbge.get(String(f.properties.id)); return V.corVitoria(c && (venc[c.ibge] || {})[k]); }); }
    colorir();
    const zoom = d3.zoom().scaleExtent([1, 40]).on("zoom", (ev) => { g.attr("transform", ev.transform); mun.attr("stroke-width", 0.25 / Math.sqrt(ev.transform.k)); rot.style("font-size", 13 / Math.sqrt(ev.transform.k) + "px"); });
    svg.call(zoom).on("wheel.zoom", null);
    function aproximar(feat, ms = 900) {
      const [[x0, y0], [x1, y1]] = path.bounds(feat), k = Math.min(30, 0.88 / Math.max((x1 - x0) / W, (y1 - y0) / H));
      svg.transition().duration(ms).call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(k).translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
    }
    return { colorir, aproximar, inteiro: () => aproximar(G.ufsGrupo, 900), brasil: () => svg.transition().duration(900).call(zoom.transform, d3.zoomIdentity), G, path };
  };

  /* ---------- página inicial ---------- */
  V.rota(/^\/seis(?:\/uf\/([A-Z]{2}))?$/, async function (main, uf) {
    V.marcarNav("inicio");
    await V.carregarBase();
    let chave = localStorage.getItem("vav-mapa") || "PREF2024";
    if (!V.MAJ.some((m) => m[0] === chave)) chave = "PREF2024";
    main.innerHTML = `<div class="pagina">
      <section class="abertura">
        <div class="abertura__mapa"><div id="mapa"></div><div class="mapa-acoes" id="mapa-acoes"></div></div>
        <div class="abertura__lado">
          <h1 class="titulo-grande">Como votou cada cidade de seis estados</h1>
          <p class="lead">Ceará, Espírito Santo, Mato Grosso, Paraná, Santa Catarina e Tocantins: 1.237 cidades e todas as eleições de 2018 a 2026. Escolha uma eleição, passe o mouse pelo mapa ou procure a sua cidade.</p>
          <div class="busca busca-grande"><label class="visualmente-oculto" for="busca2">Buscar cidade ou candidato</label><input id="busca2" type="search" autocomplete="off" placeholder="Digite o nome da sua cidade" aria-controls="busca2-lista" aria-expanded="false"><ul id="busca2-lista" class="busca__lista" role="listbox" hidden></ul></div>
          <div><p class="grupo-rotulo">Eleição no mapa</p><div class="eleicoes" id="eleicoes"></div></div>
          <div><p class="grupo-rotulo">Campo político de quem venceu</p><ul class="legenda" id="legenda"></ul><p class="cartao__sub" style="margin:8px 0 0">Cor mais forte, vitória com mais votos. Partidos classificados pelo levantamento de Bolognesi, Ribeiro e Codato (2023).</p></div>
          <div class="eleicoes" id="ufs"></div>
        </div>
      </section>
      <section class="secao">
        <h2 class="secao__titulo">Perguntas para explorar</h2>
        <p class="secao__sub">Cada pergunta é um roteiro curto: o site mostra onde olhar, e a conclusão fica com você.</p>
        <div class="iscas">${V.PERGUNTAS.map(([id, tema, p, d]) => `<a class="isca" href="#/perguntas/${id}"><span class="isca__tema">${tema}</span><strong>${p}</strong><span>${d}</span></a>`).join("")}</div>
      </section>
    </div>`;
    V.ligarBusca(document.getElementById("busca2"), document.getElementById("busca2-lista"));
    const ufsEl = document.getElementById("ufs");
    const m = await V.desenharMapa(document.getElementById("mapa"), { chave: () => chave });
    const eleEl = document.getElementById("eleicoes");
    function pintaEle() {
      eleEl.innerHTML = V.MAJ.map(([k, c, a]) => `<button class="chip" data-k="${k}" aria-pressed="${k === chave}">${c} <small>${a}</small></button>`).join("");
      eleEl.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { chave = b.dataset.k; try { localStorage.setItem("vav-mapa", chave); } catch (e) {} pintaEle(); m.colorir(); }));
    }
    pintaEle();
    document.getElementById("legenda").innerHTML = Object.entries(V.ESPN).map(([k, n]) => `<li><i style="background:${V.ESPC[k]}"></i>${n}</li>`).join("");
    ufsEl.innerHTML = '<button class="chip" data-uf="" aria-pressed="' + !uf + '">Os seis estados</button>' + Object.entries(V.UFS).map(([s, n]) => `<button class="chip" data-uf="${s}" aria-pressed="${uf === s}">${n}</button>`).join("");
    ufsEl.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { V.semRolar = true; location.hash = b.dataset.uf ? "#/seis/uf/" + b.dataset.uf : "#/seis"; }));
    if (uf) m.aproximar(m.G.ufsGrupo.features.find((f) => f.properties.SIGLA === uf));
  });
})();
