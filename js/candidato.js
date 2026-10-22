/* Voto a voto — ficha do candidato: cartão da urna, mapa de onde foi votado e trajetória. */
(function () {
  "use strict";
  const V = window.V;
  V.rota(/^\/candidato\/([A-Z]{2})\/(\d+)$/, async function (main, uf, id) {
    await V.carregarBase();
    await Promise.all([2018, 2022, 2024, 2026].map(V.carregarFotos));   // fotos do TSE dos anos desta base
    const UF = await V.dados("uf/" + uf);
    const k = UF.cand[id];
    if (!k) throw new Error("Candidato não encontrado nesta base");
    const [nome, pa, nr, el, cg, ano, pe] = k;
    document.title = V.titulo(nome) + " · Voto a voto";
    const estadual = ["PRES", "GOV", "SEN", "DF", "DE"].includes(cg);
    let votos = null;
    if (estadual) { try { votos = await V.dados("cand/" + uf + "_" + ano + "_" + cg); } catch (e) {} }
    const traj = ((await V.dados("trajetorias"))[pe]) || [];
    const meu = votos && votos.v[id] ? votos.v[id] : [];
    const totUF = meu.reduce((a, r) => a + r[1], 0);
    // cidade do candidato a prefeito/vereador
    let cidade = null, votosCidade = null;
    if (!estadual) {
      for (const [t, anos] of Object.entries(UF.mun)) {
        const d = (anos[ano] || {})[cg]; if (!d) continue;
        const r = d.t1.c.find((x) => String(x[0]) === id); if (r) { cidade = V.porTse.get(t); votosCidade = { v: r[1], n: d.t1.n }; break; }
      }
    }
    const votosMostrar = estadual ? totUF : votosCidade ? votosCidade.v : k[8];
    const rotVotos = cg === "PRES" ? "votos em " + V.UFS[uf] : estadual ? "votos no estado" : "votos" + (cidade ? " em " + cidade.nome : "");
    main.innerHTML = `<div class="pagina"><p class="aviso aviso--seis">Esta parte ainda mostra só os seis estados do grupo. A versão do Brasil inteiro chega com o banco nacional.</p>
      <p class="migalha"><a href="#/">Mapa</a> › ${cidade ? `<a href="#/cidade/${cidade.ibge}/${ano}/${cg}">${V.esc(cidade.nome)}</a>` : V.UFS[uf]}</p>
      <div class="cand-topo">
        <div style="display:grid;gap:18px">
          ${V.urnaHtml(k, { votos: votosMostrar, pct: votosCidade ? (100 * votosCidade.v) / votosCidade.n : null, rotulo: rotVotos })}
          <div class="cartao"><h2 class="cartao__titulo">Trajetória de 2002 a 2026</h2><p class="cartao__sub">Todas as candidaturas desta pessoa nos seis estados</p>
            <ol class="linha-tempo">${traj.map(([a, c, p, local, e]) => `<li><span class="ano">${a}</span><span class="ponto ${e ? "ponto--eleito" : ""}"></span><span class="desc"><b>${V.CARGOS[c] || c}</b> ${V.partidoHtml(p)} ${e ? '<span class="selo selo--eleito">Eleito</span>' : ""}<small>${V.esc(V.UFS[local] || (String(local).length === 2 ? local : V.titulo(local)))}</small></span></li>`).join("") || '<li><span></span><span></span><span class="desc">Sem outras candidaturas na base.</span></li>'}</ol>
          </div>
        </div>
        <div style="display:grid;gap:18px">
          ${estadual && meu.length ? `<div class="cartao"><h2 class="cartao__titulo">Onde ${V.esc(V.titulo(nome).split(" ")[0])} foi votado</h2>
            <p class="cartao__sub">${V.UFS[uf]}, ${ano}, 1º turno · cor mais forte, maior a fatia dos votos da cidade para ${V.CARGOS[cg].toLowerCase()}. Passe o mouse ou toque numa cidade.</p>
            <div id="mapa-cand"></div><ul class="legenda" id="leg-cand" style="margin-top:8px"></ul></div>
            <div class="cartao"><h2 class="cartao__titulo">As 10 cidades que mais deram votos</h2><ol class="top-cidades" id="top-cid"></ol></div>`
            : cidade ? `<div class="cartao"><h2 class="cartao__titulo">${V.esc(cidade.nome)} em ${ano}</h2><p class="cartao__sub">${V.int(votosCidade.v)} dos ${V.int(votosCidade.n)} votos dados a candidatos a ${V.CARGOS[cg].toLowerCase()}.</p><a class="btn" href="#/cidade/${cidade.ibge}/${ano}/${cg}">Ver todos os candidatos de ${V.esc(cidade.nome)}</a></div>` : ""}
        </div>
      </div></div>`;
    if (!(estadual && meu.length)) return;
    // mapa de onde foi votado
    const G = await V.geo();
    const pre = V.CIDADES.find((c) => c.uf === uf).ibge.slice(0, 2);
    const feats = G.mu.features.filter((f) => String(f.properties.id).slice(0, 2) === pre);
    const ufF = G.br.features.find((f) => f.properties.SIGLA === uf);
    const W = 640, H = 520, proj = d3.geoMercator().fitExtent([[8, 8], [W - 8, H - 8]], ufF), path = d3.geoPath(proj);
    const share = new Map(meu.map(([t, v]) => { const n = votos.tot[t] || 1; return [String(t), [v, (100 * v) / n]]; }));
    const mx = d3.quantile([...share.values()].map((x) => x[1]).sort(d3.ascending), 0.97) || 1;
    const cor = V.corPartido(pa), esc = d3.scaleLinear().domain([0, mx]).range([0, 1]).clamp(true);
    const fill = (s) => (s ? d3.interpolateRgb("#f1f2f4", cor)(0.12 + 0.88 * esc(s[1])) : "#f1f2f4");
    const svg = d3.select("#mapa-cand").append("svg").attr("class", "mapa-svg").attr("viewBox", [0, 0, W, H]).attr("role", "img").attr("aria-label", "Mapa dos votos por cidade");
    svg.selectAll("path").data(feats).join("path").attr("class", "mun").attr("d", path)
      .attr("fill", (f) => { const c = V.porIbge.get(String(f.properties.id)); return fill(c && share.get(String(c.tse))); })
      .on("mousemove", (ev, f) => { const c = V.porIbge.get(String(f.properties.id)); if (!c) return; const s = share.get(String(c.tse)); V.dica(ev, V.linhasDica(c.nome, [["Votos", V.int(s ? s[0] : 0)], ["Fatia da cidade", V.pct(s ? s[1] : 0)]])); })
      .on("mouseleave", () => V.dica(null, null))
      .on("click", (ev, f) => V.ir("#/cidade/" + f.properties.id + "/" + ano + "/" + cg));
    const leg = [0, mx / 2, mx].map((v) => `<li><i style="background:${fill([0, v])}"></i>${V.pct(v, 0)} dos votos da cidade</li>`);
    document.getElementById("leg-cand").innerHTML = leg.join("");
    const top = meu.slice().sort((a, b) => b[1] - a[1]).slice(0, 10);
    document.getElementById("top-cid").innerHTML = top.map(([t, v]) => { const c = V.porTse.get(String(t)); return `<li><a href="#/cidade/${c.ibge}/${ano}/${cg}">${V.esc(c.nome)}</a><span><b>${V.int(v)}</b> · ${V.pct(share.get(String(t))[1])}</span></li>`; }).join("");
  });
})();
