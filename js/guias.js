/* Voto a voto — guias das 12 perguntas: a pessoa segue passos curtos e tira a conclusão sozinha. */
(function () {
  "use strict";
  const V = window.V;
  const GUIAS = {};
  V.guia = (id, def) => (GUIAS[id] = def);

  /* lista de perguntas */
  V.rota(/^\/guias$/, async function (main) {
    V.marcarNav("guias");
    main.innerHTML = `<div class="pagina"><p class="aviso aviso--seis">Esta parte ainda mostra só os seis estados do grupo. A versão do Brasil inteiro chega com o banco nacional.</p><h1 class="titulo-grande" style="margin-bottom:10px">Perguntas para explorar</h1>
      <p class="lead" style="margin-bottom:24px">Doze perguntas sobre dinheiro, voto e carreira política. Cada uma é um roteiro de poucos passos; a conclusão fica com você.</p>
      <div class="iscas">${V.PERGUNTAS.map(([id, tema, p, d]) => `<a class="isca" href="#/guia/${id}"><span class="isca__tema">${tema}</span><strong>${p}</strong><span>${GUIAS[id] ? d : "Roteiro em preparação."}</span></a>`).join("")}</div></div>`;
  });

  /* página de um guia */
  V.rota(/^\/guia\/(q\d+)$/, async function (main, id) {
    V.marcarNav("guias");
    const P = V.PERGUNTAS.find((x) => x[0] === id), G = GUIAS[id];
    if (!P) throw new Error("Pergunta não encontrada");
    if (!G) { main.innerHTML = `<div class="pagina"><p class="migalha"><a href="#/guias">Perguntas</a></p><h1 class="guia__pergunta">${P[2]}</h1><p class="vazio">Este roteiro ainda está sendo montado.</p></div>`; return; }
    await V.carregarBase();
    const dados = await G.dados();
    main.innerHTML = `<div class="pagina"><p class="aviso aviso--seis">Esta parte ainda mostra só os seis estados do grupo. A versão do Brasil inteiro chega com o banco nacional.</p><p class="migalha"><a href="#/guias">Perguntas</a> › ${P[1]}</p>
      <div class="guia">
        <div><h1 class="guia__pergunta">${P[2]}</h1>
          <div class="passos" id="passos"></div>
          <div class="guia__nav"><button class="btn" id="ant">Passo anterior</button><button class="btn btn--confirma" id="prox">Próximo passo</button></div>
        </div>
        <div class="guia__palco"><div class="cartao"><div id="ctrl" class="eleicoes" style="margin-bottom:12px"></div><div id="palco"></div><p class="guia__fonte">${G.fonte}</p></div><div id="reflexao"></div></div>
      </div></div>`;
    const st = Object.assign({ passo: 0 }, G.estado || {});
    const passosEl = document.getElementById("passos"), palco = document.getElementById("palco");
    function render() {
      const passos = G.passos(st, dados);
      st.passo = Math.min(st.passo, passos.length - 1);
      passosEl.innerHTML = passos.map((p, i) => `<button class="passo" data-i="${i}" ${i === st.passo ? 'aria-current="step"' : ""}><b>Passo ${i + 1} de ${passos.length}</b><span>${p.texto}</span></button>`).join("");
      passosEl.querySelectorAll(".passo").forEach((b) => b.addEventListener("click", () => { st.passo = +b.dataset.i; render(); }));
      document.getElementById("ant").disabled = st.passo === 0;
      document.getElementById("prox").disabled = st.passo === passos.length - 1;
      const atual = passos[st.passo];
      document.getElementById("ctrl").innerHTML = atual.controles ? atual.controles(st) : "";
      document.getElementById("ctrl").querySelectorAll("[data-set]").forEach((b) => b.addEventListener("click", () => { const [k, v] = b.dataset.set.split("="); st[k] = isNaN(+v) ? v : +v; render(); }));
      G.desenhar(palco, st, dados, atual.foco || {});
      document.getElementById("reflexao").innerHTML = atual.reflexao ? `<p class="reflexao">${atual.reflexao}</p>` : "";
    }
    document.getElementById("ant").addEventListener("click", () => { st.passo--; render(); });
    document.getElementById("prox").addEventListener("click", () => { st.passo++; render(); });
    render();
  });

  /* ---------- Q2: dinheiro e sucesso ---------- */
  const CARGOQ = { "DEPUTADO FEDERAL": "deputado federal", "DEPUTADO ESTADUAL": "deputado estadual", "PREFEITO": "prefeito", "VEREADOR": "vereador" };
  V.guia("q2", {
    fonte: "Fonte: TSE, candidatos e prestação de contas. Grupos = quintis de receita de campanha (função NTILE no MySQL).",
    estado: { cargo: "DEPUTADO FEDERAL", ano: 2022 },
    dados: () => V.dados("perguntas/q2"),
    passos(st, D) {
      const R = D.filter((r) => r.ds_cargo === st.cargo && r.nr_ano_eleicao === st.ano);
      const n = R.reduce((a, r) => a + r.qt_candidatos, 0);
      const cargos = (s) => Object.entries(CARGOQ).map(([c, l]) => `<button class="chip" data-set="cargo=${c}" aria-pressed="${s.cargo === c}">${V.titulo(l)}</button>`).join("") +
        (s.cargo.startsWith("DEP") ? [2018, 2022] : [2020, 2024]).map((a) => `<button class="chip" data-set="ano=${a}" aria-pressed="${s.ano === a}">${a}</button>`).join("");
      if (!(st.cargo.startsWith("DEP") ? [2018, 2022] : [2020, 2024]).includes(st.ano)) st.ano = st.cargo.startsWith("DEP") ? 2022 : 2024;
      return [
        { texto: `Estes são os ${V.int(n)} candidatos a ${CARGOQ[st.cargo]} de ${st.ano} nos seis estados, separados em cinco grupos do mesmo tamanho pelo dinheiro que arrecadaram. Cada coluna mostra quanto, em média, um candidato daquele grupo recebeu.`, foco: { modo: "dinheiro" } },
        { texto: "Repare na distância entre o primeiro grupo e o último. Passe o mouse nas colunas para ver os valores.", foco: { modo: "dinheiro", destaque: [1, 5] } },
        { texto: "Agora a mesma divisão, mas cada coluna mostra quantos candidatos do grupo foram eleitos.", foco: { modo: "sucesso" } },
        { texto: "Compare de novo o primeiro e o último grupo.", foco: { modo: "sucesso", destaque: [1, 5] } },
        { texto: "Troque o cargo e a eleição nos botões acima do gráfico. O desenho se repete?", foco: { modo: "sucesso" }, controles: cargos },
        { texto: "Para pensar.", foco: { modo: "sucesso" }, controles: cargos, reflexao: "Quem tem mais dinheiro se elege por causa do dinheiro, ou quem já tem chance de ganhar consegue arrecadar mais? O que mudaria a sua resposta?" },
      ];
    },
    desenhar(el, st, D, foco) {
      const R = D.filter((r) => r.ds_cargo === st.cargo && r.nr_ano_eleicao === st.ano).sort((a, b) => a.nr_quintil - b.nr_quintil);
      const din = foco.modo === "dinheiro", val = (r) => (din ? r.vr_receita_media : r.pc_taxa_sucesso);
      const W = 640, H = 380, m = { t: 34, r: 10, b: 64, l: 10 };
      let svg = d3.select(el).select("svg");
      if (svg.empty()) { svg = d3.select(el).append("svg").attr("class", "grafico").attr("viewBox", [0, 0, W, H]).attr("role", "img"); svg.append("g").attr("class", "cols"); svg.append("text").attr("class", "titulo-g").attr("x", 0).attr("y", 18).style("font-weight", 700).style("fill", "var(--tinta)"); }
      svg.attr("aria-label", din ? "Receita média por grupo" : "Percentual de eleitos por grupo");
      svg.select(".titulo-g").text(din ? "Dinheiro médio por candidato" : "Quantos foram eleitos (%)");
      const x = d3.scaleBand().domain([1, 2, 3, 4, 5]).range([m.l, W - m.r]).padding(0.28);
      const y = d3.scaleLinear().domain([0, d3.max(R, val) * 1.12 || 1]).range([H - m.b, m.t]);
      const cor = ["#c9dcf3", "#9cc0ea", "#5f97d8", "#2f6cc0", "#1d3c9e"];
      const g = svg.select(".cols").selectAll("g.col").data(R, (r) => r.nr_quintil).join((e) => { const n = e.append("g").attr("class", "col"); n.append("rect").attr("rx", 4); n.append("text").attr("class", "v").attr("text-anchor", "middle"); n.append("text").attr("class", "q").attr("text-anchor", "middle"); n.append("text").attr("class", "rot").attr("text-anchor", "middle"); return n; });
      g.classed("esmaecido", (r) => foco.destaque && !foco.destaque.includes(r.nr_quintil));
      g.select("rect").transition().duration(700).attr("x", (r) => x(r.nr_quintil)).attr("width", x.bandwidth()).attr("y", (r) => y(val(r))).attr("height", (r) => Math.max(2, y(0) - y(val(r)))).attr("fill", (r) => cor[r.nr_quintil - 1]);
      g.select(".v").transition().duration(700).attr("x", (r) => x(r.nr_quintil) + x.bandwidth() / 2).attr("y", (r) => y(val(r)) - 8).text((r) => (din ? V.brl(val(r)) : V.pct(val(r))));
      g.select(".q").attr("x", (r) => x(r.nr_quintil) + x.bandwidth() / 2).attr("y", H - m.b + 22).style("font-weight", 700).style("fill", "var(--tinta)").text((r) => r.nr_quintil + "º grupo");
      g.select(".rot").attr("x", (r) => x(r.nr_quintil) + x.bandwidth() / 2).attr("y", H - m.b + 42).text((r) => (r.nr_quintil === 1 ? "menos dinheiro" : r.nr_quintil === 5 ? "mais dinheiro" : ""));
      g.on("mousemove", (ev, r) => V.dica(ev, V.linhasDica(r.nr_quintil + "º grupo", [["Candidatos", V.int(r.qt_candidatos)], ["Dinheiro médio", V.brl(r.vr_receita_media)], ["Eleitos", V.int(Math.round((r.qt_candidatos * r.pc_taxa_sucesso) / 100)) + " (" + V.pct(r.pc_taxa_sucesso) + ")"]]))).on("mouseleave", () => V.dica(null, null));
    },
  });
})();
