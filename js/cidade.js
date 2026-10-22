/* Voto a voto — ficha da cidade, busca e cartão "urna" do candidato. */
(function () {
  "use strict";
  const V = window.V;

  /* cartão no formato da tela da urna eletrônica */
  V.situacao = (k) => (k[3] ? '<span class="tecla tecla--eleito">Eleito</span>' : /2º TURNO/i.test(k[9]) ? '<span class="tecla tecla--segundo">Foi ao 2º turno</span>' : '<span class="tecla tecla--nao">Não eleito</span>');
  V.urnaHtml = (k, o = {}) => `<div class="urna ${o.compacta ? "urna--compacta" : ""}"><div class="urna__tela">
      <span class="urna__cab">Seu voto para</span>
      <span class="urna__cargo">${V.CARGOS[k[4]]} ${k[5]}</span>
      <div class="urna__campos">
        <div class="urna__linha"><span>Número</span><span class="digitos">${String(k[2]).split("").map((d) => "<b>" + d + "</b>").join("")}</span></div>
        <div class="urna__linha"><span>Nome</span><span class="urna__nome">${o.link ? `<a href="${o.link}">${V.esc(V.titulo(k[0]))}</a>` : V.esc(V.titulo(k[0]))}</span></div>
        <div class="urna__linha"><span>Partido</span><span>${V.partidoHtml(k[1])} <span style="color:var(--tinta-3)">${V.esc(V.ESPN[V.espDe(k[1])] || "")}</span></span></div>
      </div>
      <div class="urna__foto">${V.fotoHtml(k)}</div>
      <div class="urna__rodape"><span class="urna__votos">${V.int(o.votos)}<small>${o.rotulo || "votos"}${o.pct != null ? " · " + V.pct(o.pct) : ""}</small></span>${V.situacao(k)}</div>
    </div></div>`;

  /* ---------- busca de cidades e candidatos ---------- */
  // índice nacional da busca, com os nomes já sem acento (carregado só na primeira busca)
  let nomesProm = null;
  const nomesBR = () => nomesProm || (nomesProm = V.dados("br/busca").then((B) => B.map((r) => ({ r, n: V.norm(r[0]) }))));
  V.ligarBusca = function (input, lista) {
    let itens = [], sel = -1;
    const fechar = () => { lista.hidden = true; input.setAttribute("aria-expanded", "false"); sel = -1; };
    async function buscar() {
      const t = V.norm(input.value.trim());
      if (t.length < 2) { fechar(); return; }
      await V.carregarBase(); const BR = await V.baseBR();
      const cid = BR.lista.filter((c) => c.n.includes(t)).sort((a, b) => (b.n.startsWith(t) - a.n.startsWith(t)) || (b.pop || 0) - (a.pop || 0)).slice(0, 7)
        .map((c) => ({ h: V.linkBR && location.hash.startsWith("#/mapa") ? V.linkBR(c.uf, c.ibge) : "#/mapa/br/" + c.uf + "/c/" + c.ibge, ico: '<span class="busca__ico busca__ico--cidade">' + c.uf + "</span>", t: c.nome, s: V.UFN[c.uf] + (c.pop ? " · " + V.int(c.pop) + " moradores" : "") }));
      const pinta = (its) => {
        itens = its;
        lista.innerHTML = itens.length ? itens.map((it, i) => `<li role="option" id="${lista.id}-${i}" aria-selected="false" data-h="${it.h}">${it.ico}<span>${V.esc(it.t)}<br><small>${V.esc(it.s)}</small></span></li>`).join("") : '<li aria-disabled="true"><span></span><span>Nada encontrado com esse nome.</span></li>';
        lista.hidden = false; input.setAttribute("aria-expanded", "true");
        lista.querySelectorAll("li[data-h]").forEach((li) => li.addEventListener("mousedown", (e) => { e.preventDefault(); input.value = ""; fechar(); V.ir(li.dataset.h); }));
      };
      if (cid.length) pinta(cid);
      let cand = [];
      try {
        // Brasil inteiro: presidente, governador e senador (todos) e prefeitos eleitos; cada um leva ao mapa daquela eleição
        const N = await nomesBR();
        const nac = N.filter((x) => x.n.includes(t)).sort((a, b) => b.r[6] - a.r[6]).slice(0, 6).map(({ r }) => {
          const [nome, sg, cg, ano, uf, ib, , el] = r, c = ib && BR.porIbge.get(ib);
          const h = "#/mapa" + (cg === "PREF" && ano === 2024 ? "" : "/e/" + cg + ano) + (uf ? "/br/" + uf + (c ? "/c/" + ib : "") : "");
          const s = sg + " · " + (cg === "PREF" ? `eleito prefeito de ${c ? c.nome + " (" + uf + ")" : uf} em ${ano}` : `${V.CARGOS[cg]} ${ano}${uf ? " · " + uf : ""}${el ? " · eleito" : ""}`);
          return { h, v: r[6], ico: '<span class="busca__ico" style="background:' + V.corPartido(sg) + '">' + V.esc(V.iniciais(nome)) + "</span>", t: V.titulo(nome), s };
        });
        // seis estados do grupo: deputados e vereadores, com a ficha do candidato
        const B = await V.dados("busca");
        const seis = B.filter((r) => !["PRES", "GOV", "SEN", "PREF"].includes(r[3]) && V.norm(r[1]).includes(t)).sort((a, b) => b[6] - a[6]).slice(0, 6)
          .map((r) => ({ h: "#/candidato/" + r[5] + "/" + r[0], v: r[6], ico: '<span class="busca__ico" style="background:' + V.corPartido(r[2]) + '">' + V.esc(V.iniciais(r[1])) + "</span>", t: V.titulo(r[1]), s: r[2] + " · " + V.CARGOS_CURTO[r[3]] + " " + r[4] + " · " + r[5] }));
        cand = nac.concat(seis).sort((a, b) => b.v - a.v).slice(0, 7);
      } catch (e) {}
      if (V.norm(input.value.trim()) === t) pinta(cid.concat(cand));
    }
    let tmr; input.addEventListener("input", () => { clearTimeout(tmr); tmr = setTimeout(buscar, 120); });
    input.addEventListener("keydown", async (e) => {
      let lis = [...lista.querySelectorAll("li[data-h]")];
      if (!lis.length && e.key === "Enter" && input.value.trim().length > 1) { e.preventDefault(); clearTimeout(tmr); await buscar(); lis = [...lista.querySelectorAll("li[data-h]")]; }
      if (!lis.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + lis.length) % lis.length; lis.forEach((l, i) => l.setAttribute("aria-selected", i === sel)); input.setAttribute("aria-activedescendant", lis[sel].id); }
      if (e.key === "Enter") { const li = lis[Math.max(0, sel)]; input.value = ""; fechar(); V.ir(li.dataset.h); }
      if (e.key === "Escape") fechar();
    });
    input.addEventListener("blur", () => setTimeout(fechar, 150));
  };

  /* localizador: o estado com a cidade marcada */
  async function localizador(host, cidade) {
    const G = await V.geo();
    const uf = G.br.features.find((f) => f.properties.SIGLA === cidade.uf);
    const mu = G.mu.features.filter((f) => String(f.properties.id).slice(0, 2) === cidade.ibge.slice(0, 2));
    const alvo = G.mu.features.find((f) => String(f.properties.id) === cidade.ibge);
    const W = 260, H = 200, proj = d3.geoMercator().fitExtent([[6, 6], [W - 6, H - 6]], uf), p = d3.geoPath(proj);
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="mapa-svg" role="img" aria-label="Localização de ${V.esc(cidade.nome)} em ${V.UFS[cidade.uf]}">
      ${mu.map((f) => `<path d="${p(f)}" fill="#e2e5e9" stroke="#fff" stroke-width=".4"/>`).join("")}
      ${alvo ? `<path d="${p(alvo)}" fill="var(--confirma)" stroke="var(--tinta)" stroke-width="1"/>` : ""}
      ${alvo ? `<circle cx="${p.centroid(alvo)[0]}" cy="${p.centroid(alvo)[1]}" r="9" fill="none" stroke="var(--confirma)" stroke-width="2.5"/>` : ""}</svg>`;
  }

  /* ---------- ficha da cidade ---------- */
  V.rota(/^\/cidade\/(\d{7})(?:\/(\d{4})\/([A-Z]+))?$/, async function (main, ibge, ano, cargo) {
    await V.carregarBase();
    await Promise.all([2018, 2022, 2024, 2026].map(V.carregarFotos));   // fotos do TSE dos anos desta base
    const c = V.porIbge.get(ibge);
    if (!c) throw new Error("Cidade não encontrada");
    if (ano && V.cargosDoAno(+ano).includes(cargo)) { V.escolha = { ano: +ano, cargo }; V.salvarEscolha(); }
    const UF = await V.dados("uf/" + c.uf);
    const dadosCid = UF.mun[String(c.tse)] || {};
    document.title = c.nome + " (" + c.uf + ") · Voto a voto";
    main.innerHTML = `<div class="pagina"><p class="aviso aviso--seis">Esta parte ainda mostra só os seis estados do grupo. A versão do Brasil inteiro chega com o banco nacional.</p>
      <div class="cab-cidade">
        <div>
          <p class="migalha"><a href="#/">Mapa</a> › <a href="#/uf/${c.uf}">${V.UFS[c.uf]}</a></p>
          <h1 class="cidade-nome">${V.esc(c.nome)}</h1>
          <div class="fatos">
            ${c.capital ? "<span><b>Capital</b> do estado</span>" : ""}
            <span><b>${V.int(c.pop)}</b> habitantes (Censo 2022)</span>
            <span><b>${V.brl(c.pib)}</b> de PIB por habitante (2021)</span>
          </div>
        </div>
        <div class="localizador" id="loc"></div>
      </div>
      <div class="barra-eleicao" id="sel"></div>
      <div id="res"></div>
    </div>`;
    localizador(document.getElementById("loc"), c);
    let turno = "t1";
    const res = document.getElementById("res");
    function desenha() {
      const { ano, cargo } = V.escolha;
      history.replaceState(null, "", "#/cidade/" + ibge + "/" + ano + "/" + cargo);
      const d = ((dadosCid[ano] || {})[cargo]) || null;
      if (!d || !d.t1 || !d.t1.c.length) { res.innerHTML = `<p class="vazio">Não há votação de ${V.CARGOS[cargo].toLowerCase()} em ${ano} para ${V.esc(c.nome)} na base.${c.ibge === "5101837" && ano < 2024 ? " Boa Esperança do Norte foi criada em 2024." : ""}</p>`; return; }
      if (!d[turno]) turno = "t1";
      const T = d[turno], tot = T.n, top = T.c, k0 = UF.cand[top[0][0]];
      const prop = ["DF", "DE", "VER"].includes(cargo);
      const somaTop = top.reduce((a, r) => a + r[1], 0);
      const linhas = top.map(([id, v], i) => {
        const k = UF.cand[id]; const cor = V.corPartido(k[1]);
        return `<li><span class="mini-foto" style="background:${cor}">${V.fotoHtml(k)}</span>
          <div><a class="cand-nome" href="#/candidato/${c.uf}/${id}">${V.esc(V.titulo(k[0]))}</a> ${V.partidoHtml(k[1])}${k[3] ? '<span class="selo selo--eleito">Eleito</span>' : /2º TURNO/i.test(k[9]) && turno === "t1" ? '<span class="selo selo--2t">2º turno</span>' : ""}
            <div class="barra"><i style="width:${(100 * v) / top[0][1]}%;background:${cor}"></i></div></div>
          <div class="cand-num">${V.pct((100 * v) / tot)}<small>${V.int(v)} votos</small></div></li>`;
      }).join("");
      const p = T.p, val = p ? p[1] - p[3] - p[4] : null;
      const comp = p ? `<div class="cartao comparecimento">
          <div><h2 class="cartao__titulo">Quem foi votar</h2><p class="cartao__sub">${V.int(p[0])} eleitores aptos em ${V.esc(c.nome)}</p></div>
          <div class="pilha" role="img" aria-label="Votos válidos ${V.pct((100 * val) / p[0])}, brancos e nulos ${V.pct((100 * (p[3] + p[4])) / p[0])}, abstenção ${V.pct((100 * p[2]) / p[0])}">
            <i style="width:${(100 * val) / p[0]}%;background:var(--tinta-2)"></i><i style="width:${(100 * p[3]) / p[0]}%;background:#b7bcc4"></i><i style="width:${(100 * p[4]) / p[0]}%;background:#8b929c"></i><i style="width:${(100 * p[2]) / p[0]}%;background:repeating-linear-gradient(45deg,#e1e4e8 0 6px,#f3f4f6 6px 12px)"></i></div>
          <div class="pilha-leg">
            <span><i style="background:var(--tinta-2)"></i>Votos em candidatos</span><b>${V.int(val)}</b>
            <span><i style="background:#b7bcc4"></i>Brancos</span><b>${V.int(p[3])}</b>
            <span><i style="background:#8b929c"></i>Nulos</span><b>${V.int(p[4])}</b>
            <span><i style="background:#e1e4e8"></i>Não foram votar</span><b>${V.int(p[2])} · ${V.pct((100 * p[2]) / p[0])}</b>
          </div></div>` : "";
      res.innerHTML = `
        ${d.t2 ? `<div class="eleicoes" style="margin-bottom:14px"><button class="chip" data-t="t1" aria-pressed="${turno === "t1"}">1º turno</button><button class="chip" data-t="t2" aria-pressed="${turno === "t2"}">2º turno</button></div>` : ""}
        <div class="resultado">
          <div style="display:grid;gap:18px">
            ${prop ? "" : `<div><p class="grupo-rotulo">${turno === "t2" ? "Mais votado no 2º turno" : "Mais votado na cidade"}</p>${V.urnaHtml(k0, { votos: top[0][1], pct: (100 * top[0][1]) / tot, rotulo: "votos em " + c.nome, link: "#/candidato/" + c.uf + "/" + top[0][0] })}</div>`}
            <div class="cartao">
              <h2 class="cartao__titulo">${prop ? "Os mais votados para " + V.CARGOS[cargo].toLowerCase() : "Todos os candidatos"}</h2>
              <p class="cartao__sub">${V.esc(c.nome)}, ${ano}${d.t2 ? (turno === "t1" ? ", 1º turno" : ", 2º turno") : ""} · % dos votos dados a candidatos${prop ? ` · mostrando ${top.length} de todos; eles somam ${V.pct((100 * somaTop) / tot)} dos votos` : ""}</p>
              <ul class="lista-cand">${linhas}</ul>
              ${["GOV", "SEN", "PRES"].includes(cargo) ? `<p class="cartao__sub" style="margin:12px 0 0">"Eleito" vale para o estado ou o país inteiro, não só para esta cidade.</p>` : ""}
            </div>
          </div>
          <div style="display:grid;gap:18px">${comp}</div>
        </div>`;
      res.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { turno = b.dataset.t; desenha(); }));
    }
    V.seletorEleicao(document.getElementById("sel"), desenha);
    desenha();
  });
})();
