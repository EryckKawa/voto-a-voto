/* Voto a voto — Partidos: onde fica cada partido segundo três estudos acadêmicos independentes e o voto na Câmara.
   Dados: data/br/partidos_notas.json, feito por scripts/notas_estudos.py (Zucco e Power 2024; Bolognesi, Ribeiro e Codato 2023;
   V-Party/V-Dem 2022), todos na escala de Zucco e Power (−1 esquerda, +1 direita). */
(function () {
  "use strict";
  const V = window.V;
  const F = ["ZP", "BRC", "VP", "CAM"];
  const NOME_F = { ZP: "Deputados", BRC: "Cientistas políticos", VP: "Especialistas (V-Party)", CAM: "Voto na Câmara" };
  const ACAD = ["ZP", "BRC", "VP"];
  const DOM = [-1.15, 1.15];
  const FAIXAS = [[-1.15, -0.5, "esquerda"], [-0.5, -0.25, "centro-esquerda"], [-0.25, 0.25, "centro"], [0.25, 0.5, "centro-direita"], [0.5, 1.15, "direita"]];
  const fmt = (n) => (n == null ? "—" : (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(2).replace(".", ","));
  const faixa = (n) => (n == null ? "sem nota" : n < -0.5 ? "esquerda" : n < -0.25 ? "centro-esquerda" : n <= 0.25 ? "centro" : n <= 0.5 ? "centro-direita" : "direita");
  const cor = (n) => (V.corNota ? V.corNota(n) : "#777");
  const pct = (a, b) => V.pct((100 * a) / b, 0);

  /* marcador de cada estudo: forma diferente, para não depender de cor */
  function marca(f, x, y, r, extra = "") {
    if (f === "ZP") return `<circle cx="${x}" cy="${y}" r="${r}" fill="#16181d" ${extra}/>`;
    if (f === "CAM") return `<path d="M${x - r},${y - r}L${x + r},${y + r}M${x - r},${y + r}L${x + r},${y - r}" stroke="#16181d" stroke-width="2.4" fill="none" ${extra}/>`;
    if (f === "BRC") return `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" fill="#fff" stroke="#16181d" stroke-width="1.8" ${extra}/>`;
    return `<path d="M${x},${y - r - 1}L${x + r + 1},${y + r}L${x - r - 1},${y + r}Z" fill="#8b929c" stroke="#5f6672" stroke-width="1" ${extra}/>`;
  }
  const legMarca = (f) => `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${marca(f, 9, 9, 5)}</svg>`;
  const legenda = () => `<p class="achado__leg pt-leg">${F.map((f) => `<span>${legMarca(f)}${NOME_F[f]}</span>`).join("")}<span><svg width="18" height="18" aria-hidden="true"><circle cx="9" cy="9" r="7" fill="#8fa9dd" stroke="#16181d" stroke-width="1.5"/></svg>Nota do partido</span></p>`;

  /* ---------- 1. a régua de um ano: uma linha por partido ---------- */
  function linhasAno(D, ano) {
    const pres = D.presentes[ano] || {};
    return Object.entries(pres).filter(([k]) => D.partidos[k] && D.partidos[k].serie[ano])
      .map(([k, sgs]) => ({ k, sg: [...new Set(sgs.map(V.nomePartido))].join("/"), s: D.partidos[k].serie[ano] })).sort((a, b) => a.s.c - b.s.c);
  }
  function graficoAno(L, ano) {
    const est = V.largura() < 600, W = est ? 360 : 880, lab = est ? 112 : 130, dir = est ? 8 : 180, lin = est ? 30 : 28, top = 30;
    const H = top + L.length * lin + 26, x = d3.scaleLinear().domain(DOM).range([lab, W - dir]);
    const fs = est ? 11 : 14;
    const rows = L.map((r, i) => {
      const y = top + i * lin + lin / 2, s = r.s;
      const dica = V.esc(`${r.sg} em ${ano}: nota ${fmt(s.c)} (${faixa(s.c)})` + F.filter((f) => s.f[f]).map((f) => `; ${NOME_F[f]} ${fmt(s.f[f].v)}${s.f[f].antiga || s.f[f].ano !== +ano ? " (medida de " + s.f[f].ano + ")" : ""}`).join("") + (s.incerta ? ". As medidas discordam do lado." : "") + (s.distante ? " Medida feita longe desta eleição." : ""));
      return `<g><title>${dica}</title>
        <text x="${lab - 10}" y="${y + 5}" text-anchor="end" font-size="${fs}" font-weight="700" fill="#16181d">${V.esc(r.sg)}</text>
        ${s.max - s.min > 0.005 ? `<line x1="${x(s.min)}" x2="${x(s.max)}" y1="${y}" y2="${y}" stroke="#9aa0aa" stroke-width="2"/>` : ""}
        ${F.filter((f) => s.f[f]).map((f) => marca(f, x(s.f[f].v), y, est ? 3.5 : 4.5, s.f[f].antiga ? 'opacity=".35"' : 'opacity=".8"')).join("")}
        <circle cx="${x(s.c)}" cy="${y}" r="${est ? 6.5 : 7.5}" fill="${cor(s.c)}" stroke="#16181d" stroke-width="1.5"${s.incerta ? ' stroke-dasharray="3 2"' : ""}/>
        ${est ? "" : `<text x="${W - dir + 12}" y="${y + 5}" font-size="13" fill="${s.incerta ? "#9c5d16" : "#5f6672"}">${faixa(s.c)}${s.incerta ? " (incerto)" : ""}</text>`}</g>`;
    }).join("");
    return `<svg class="pt-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Posição de ${L.length} partidos em ${ano} segundo três estudos e o voto na Câmara">
      <rect x="${x(-0.25)}" y="${top - 6}" width="${x(0.25) - x(-0.25)}" height="${L.length * lin + 6}" fill="#f1ede3"/>
      ${[-0.5, 0.5].map((t) => `<line x1="${x(t)}" x2="${x(t)}" y1="${top - 6}" y2="${H - 26}" stroke="#c9ccd1" stroke-dasharray="2 3"/>`).join("")}
      ${FAIXAS.map(([a, b, n]) => `<text x="${(x(a) + x(b)) / 2}" y="16" text-anchor="middle" font-size="${est ? 10 : 13}" fill="#5f6672">${est ? n.replace("centro-esquerda", "c.-esq.").replace("centro-direita", "c.-dir.") : n}</text>`).join("")}
      ${[-1, -0.5, 0, 0.5, 1].map((t) => `<text x="${x(t)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#5f6672">${t === 0 ? "0" : fmt(t)}</text>`).join("")}
      ${rows}</svg>`;
  }
  function tabelaAno(L, ano) {
    return `<div class="pq__tabela pq__tabela--leitura" tabindex="0" role="region" aria-label="Notas dos partidos em ${ano}"><table>
      <thead><tr><th scope="col">Partido</th>${F.map((f) => `<th scope="col" class="num">${NOME_F[f]}</th>`).join("")}<th scope="col" class="num">Nota</th><th scope="col">Faixa</th></tr></thead>
      <tbody>${L.map((r) => `<tr><th scope="row">${V.esc(r.sg)}</th>${F.map((f) => `<td class="num">${r.s.f[f] ? fmt(r.s.f[f].v) + (r.s.f[f].antiga ? `<small> (${r.s.f[f].ano})</small>` : "") : "—"}</td>`).join("")}<td class="num"><b>${fmt(r.s.c)}</b></td><td>${faixa(r.s.c)}${r.s.incerta ? " (incerto)" : ""}</td></tr>`).join("")}</tbody></table></div>`;
  }

  /* ---------- 2. um partido ao longo do tempo ---------- */
  function trajetoria(D, k) {
    const P = D.partidos[k], anos = Object.keys(P.serie).map(Number).sort((a, b) => a - b);
    const est = V.largura() < 600, W = est ? 360 : 880, H = est ? 260 : 300, m = { t: 14, r: est ? 22 : 24, b: 30, l: est ? 104 : 124 };
    const x = d3.scaleLinear().domain([1990, 2026]).range([m.l, W - m.r]), y = d3.scaleLinear().domain(DOM).range([H - m.b, m.t]);
    // medidas originais de cada estudo (no ano em que foram feitas)
    const med = {}; for (const a of anos) for (const f of F) { const v = P.serie[a].f[f]; if (v && !v.fusao) med[f + v.ano] = { f, ano: v.ano, v: v.v }; }
    const pts = Object.values(med).filter((p) => p.ano >= 1990);
    const linha = d3.line().x((a) => x(a)).y((a) => y(P.serie[a].c))(anos);
    const banda = d3.area().x((a) => x(a)).y0((a) => y(P.serie[a].min)).y1((a) => y(P.serie[a].max))(anos);
    return `<svg class="pt-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${V.esc(P.nome)}: média dos estudos em cada eleição, ${anos.map((a) => a + " " + fmt(P.serie[a].c)).join(", ")}">
      <rect x="${m.l}" y="${y(0.25)}" width="${W - m.r - m.l}" height="${y(-0.25) - y(0.25)}" fill="#f1ede3"/>
      ${[-0.5, 0.5].map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="#c9ccd1" stroke-dasharray="2 3"/>`).join("")}
      ${FAIXAS.map(([a, b, n]) => `<text x="${m.l - 8}" y="${(y(a) + y(b)) / 2 + 4}" text-anchor="end" font-size="${est ? 11 : 13}" fill="#5f6672">${n}</text>`).join("")}
      ${[1994, 2002, 2010, 2018, 2026].map((a) => `<text x="${x(a)}" y="${H - 8}" text-anchor="${a === 2026 ? "end" : "middle"}" font-size="12" fill="#5f6672">${a}</text>`).join("")}
      <path d="${banda}" fill="#9aa0aa" opacity=".22"/>
      <path d="${linha}" fill="none" stroke="#16181d" stroke-width="2.5"/>
      ${anos.map((a) => `<circle cx="${x(a)}" cy="${y(P.serie[a].c)}" r="4.5" fill="${cor(P.serie[a].c)}" stroke="#16181d" stroke-width="1.2"><title>${a}: nota ${fmt(P.serie[a].c)} (${faixa(P.serie[a].c)})</title></circle>`).join("")}
      ${pts.map((p) => marca(p.f, x(p.ano), y(p.v), est ? 4 : 5, `opacity=".9"`).replace(/\/>$/, `><title>${NOME_F[p.f]}, medida de ${p.ano}: ${fmt(p.v)}</title></${p.f === "ZP" ? "circle" : p.f === "BRC" ? "rect" : "path"}>`)).join("")}
    </svg>`;
  }
  function tituloTraj(D, k) {
    const P = D.partidos[k], anos = Object.keys(P.serie).map(Number).sort((a, b) => a - b), a0 = anos[0], a1 = anos[anos.length - 1];
    const f0 = faixa(P.serie[a0].c), f1 = faixa(P.serie[a1].c);
    if (f0 === f1) {
      const mud = anos.map((a) => faixa(P.serie[a].c)).filter((f, i, l) => i && f !== l[i - 1]).length;
      return `${P.nome}: ${f0} em ${a0} e em ${a1}${mud ? ", passando por outras faixas no meio" : ""}`;
    }
    return `${P.nome}: ${f0} em ${a0}, ${f1} em ${a1}`;
  }

  /* ---------- 3. os estudos concordam? um gráfico por par ---------- */
  function dispersao(par, fa, fb) {
    const W = 300, H = 300, m = 40, x = d3.scaleLinear().domain(DOM).range([m, W - 12]), y = d3.scaleLinear().domain(DOM).range([H - m, 12]);
    const dif = new Set(par.lados_diferentes);
    return `<svg class="pt-disp" viewBox="0 0 ${W} ${H}" role="img" aria-label="${NOME_F[fa]} contra ${NOME_F[fb]}: correlação ${String(par.r.toFixed(2)).replace(".", ",")}, ${par.mesmo_lado} de ${par.n} do mesmo lado">
      <rect x="${x(-0.25)}" y="${y(0.25)}" width="${x(0.25) - x(-0.25)}" height="${y(-0.25) - y(0.25)}" fill="#f1ede3"/>
      <line x1="${x(DOM[0])}" y1="${y(DOM[0])}" x2="${x(DOM[1])}" y2="${y(DOM[1])}" stroke="#c9ccd1"/>
      ${[-1, 0, 1].map((t) => `<text x="${x(t)}" y="${H - m + 16}" text-anchor="middle" font-size="12" fill="#5f6672">${t === 0 ? "0" : fmt(t)}</text><text x="${m - 6}" y="${y(t) + 4}" text-anchor="end" font-size="12" fill="#5f6672">${t === 0 ? "0" : fmt(t)}</text>`).join("")}
      <text x="${(m + W) / 2}" y="${H - 4}" text-anchor="middle" font-size="13" font-weight="700" fill="#16181d">${NOME_F[fa]}</text>
      <text transform="translate(12,${(H - m) / 2}) rotate(-90)" text-anchor="middle" font-size="13" font-weight="700" fill="#16181d">${NOME_F[fb]}</text>
      ${par.pontos.map(([q, a, b]) => `<circle cx="${x(a)}" cy="${y(b)}" r="4" fill="${dif.has(q) ? "#9c5d16" : "#16181d"}" opacity="${dif.has(q) ? 1 : 0.55}"><title>${V.esc(q)}: ${NOME_F[fa]} ${fmt(a)}, ${NOME_F[fb]} ${fmt(b)}</title></circle>`).join("")}
    </svg>`;
  }

  /* "PSDB 1990/1990, PSDB 1997/1998, PTB 2001/2002" -> "PSDB (2 vezes), PTB" */
  function agrupa(lista, D) {
    const c = new Map(); for (const q of lista) { const k = q.split(" ")[0]; c.set(k, (c.get(k) || 0) + 1); }
    return [...c].sort((a, b) => b[1] - a[1]).map(([k, n]) => (D.partidos[k] ? D.partidos[k].nome.replace(/ \(.*\)$/, "") : k) + (n > 1 ? ` (${n} vezes)` : "")).join(", ");
  }

  /* ---------- página ---------- */
  const PRINC = ["PSDB", "PT", "MDB", "PL", "PP", "DEM", "PSB", "PDT", "PSD", "REP", "UNIAO", "CIDADANIA"];
  let EST = null;   // { D, ano, k, modo }

  function pintarAno() {
    const { D, ano, modo } = EST, L = linhasAno(D, ano);
    const inc = L.filter((r) => r.s.incerta).map((r) => r.sg);
    document.getElementById("pt-ano-tit").textContent = `Onde fica cada partido em ${ano}`;
    document.getElementById("pt-ano-sub").textContent = `${L.length} partidos que disputaram a eleição e foram medidos por pelo menos uma das quatro fontes. ${inc.length ? `As medidas discordam sobre o lado de ${inc.join(", ").replace(/, ([^,]*)$/, " e $1")}.` : "As medidas concordam sobre o lado de todos."}`;
    document.getElementById("pt-ano-graf").innerHTML = modo === "tab" ? tabelaAno(L, ano) : graficoAno(L, ano);
    document.getElementById("pt-ano-leg").hidden = modo === "tab";
    document.querySelectorAll("[data-ano]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ano === ano)));
    document.querySelectorAll("#pt-ano [data-modo]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.modo === modo)));
  }
  function pintarPar() {
    const { pares, par, D } = EST, x = pares[par];
    if (!x) return;
    document.getElementById("pt-par").innerHTML = `<figure class="pt-par">${dispersao(x.p, x.a, x.b)}<figcaption><b>${x.p.mesmo_lado} de ${x.p.n}</b> do mesmo lado · correlação ${String(x.p.r.toFixed(2)).replace(".", ",")}${x.p.lados_diferentes.length ? `<small>Discordam: ${V.esc(agrupa(x.p.lados_diferentes, D))}</small>` : ""}</figcaption></figure>`;
    document.querySelectorAll("[data-par]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.par === par)));
  }
  function pintarTraj() {
    const { D, k } = EST;
    document.getElementById("pt-traj-tit").textContent = tituloTraj(D, k);
    document.getElementById("pt-traj-graf").innerHTML = trajetoria(D, k);
    document.querySelectorAll("[data-partido]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.partido === k)));
    const sel = document.getElementById("pt-outro"); if (sel) sel.value = PRINC.includes(k) ? "" : k;
  }

  document.getElementById("conteudo").addEventListener("click", (e) => {
    if (!EST || !e.target.closest(".pt-pagina")) return;
    const a = e.target.closest("[data-ano]"), md = e.target.closest("#pt-ano [data-modo]"), p = e.target.closest("[data-partido]"), pr = e.target.closest("[data-par]");
    if (pr) { EST.par = +pr.dataset.par; pintarPar(); return; }
    if (a) { EST.ano = a.dataset.ano; pintarAno(); }
    else if (md) { EST.modo = md.dataset.modo; try { localStorage.setItem("vav-pq-modo", EST.modo); } catch (er) {} pintarAno(); }
    else if (p) { EST.k = p.dataset.partido; pintarTraj(); }
  });
  document.getElementById("conteudo").addEventListener("change", (e) => {
    if (EST && e.target.id === "pt-outro" && e.target.value) { EST.k = e.target.value; pintarTraj(); }
  });

  V.rota(/^\/partidos\/?$/, async function (main) {
    V.marcarNav("partidos");
    const D = await V.dados("br/partidos_notas");
    if (!V.corNota && V.baseBR) await V.baseBR();
    const pares = [["ZP", "BRC"], ["ZP", "VP"], ["BRC", "VP"], ["ZP", "CAM"], ["BRC", "CAM"], ["VP", "CAM"]].map(([a, b]) => ({ a, b, p: D.pares[a + "-" + b] })).filter((x) => x.p);
    const acad = pares.filter((x) => x.b !== "CAM");
    const n = acad.reduce((s, x) => s + x.p.n, 0), igual = acad.reduce((s, x) => s + x.p.mesmo_lado, 0);
    // onde o voto e os estudos mais se afastam (última eleição): o centrão que vota com qualquer governo
    const ultAno = Object.keys(D.presentes).sort().pop();
    const afast = Object.entries(D.presentes[ultAno]).map(([k, sgs]) => { const s = D.partidos[k] && D.partidos[k].serie[ultAno]; if (!s || !s.f.CAM) return null;
      const ac = ACAD.filter((f) => s.f[f]).map((f) => s.f[f].v); if (!ac.length) return null; const m = ac.reduce((a, b) => a + b, 0) / ac.length; return { sg: D.partidos[k].nome.replace(/ \(.*\)$/, ""), m, d: s.f.CAM.v - m }; })
      .filter((x) => x && x.m > 0.25 && x.d <= -0.2).sort((a, b) => a.d - b.d);   // os estudos põem à direita, o voto põe perto do centro
    const nomesL = (xs) => xs.map((x) => x.sg).join(", ").replace(/, ([^,]*)$/, " e $1");
    const rmin = Math.min(...pares.map((x) => x.p.r)), rmax = Math.max(...pares.map((x) => x.p.r));
    const anos = Object.keys(D.presentes).sort();
    let modo = "graf"; try { modo = localStorage.getItem("vav-pq-modo") === "tab" ? "tab" : "graf"; } catch (e) {}
    EST = { D, ano: anos.includes("2022") ? "2022" : anos[anos.length - 1], k: "PSDB", modo, par: 3, pares };
    const outros = Object.entries(D.partidos).filter(([k]) => !PRINC.includes(k) && Object.keys(D.partidos[k].serie).length > 1).sort((a, b) => a[1].nome.localeCompare(b[1].nome));
    const fonte = (f) => D.fontes[f];
    const r2 = (r) => String(r.toFixed(2)).replace(".", ",");
    document.title = "Partidos · Voto a voto";
    main.innerHTML = `<div class="pagina pq-pagina pt-pagina">
      <header class="pq-cab">
        <h1 class="titulo-grande">Onde fica cada partido</h1>
        <p class="pq-resposta">Três estudos feitos por gente diferente põem o partido do mesmo lado em ${pct(igual, n)} das vezes. O voto na Câmara concorda com eles, menos no centrão${afast.length ? `: ${nomesL(afast)} votam mais ao centro do que os estudos dizem, porque acompanham o governo da vez` : ""}.</p>
        <p class="pq-mais">Deputados federais (Zucco e Power, 2024), 519 cientistas políticos brasileiros (Bolognesi, Ribeiro e Codato, 2023) e especialistas internacionais (V-Party, 2022) deram notas aos partidos. A quarta medida é o que as bancadas mandaram votar na Câmara de 2019 a 2026, a única que já pega o PL de Bolsonaro e o União Brasil. Tudo fica na mesma escala, de −1 (esquerda) a +1 (direita). A nota de cada partido em cada eleição pesa mais a medida feita mais perto dela, e é a régua que pinta o mapa.</p>
      </header>

      <section class="pq-painel" id="pt-ano" aria-labelledby="pt-ano-tit">
        <div class="pq-painel__cab">
          <div><h2 class="pq-painel__tit" id="pt-ano-tit"></h2><p class="pq-painel__rec" id="pt-ano-sub"></p></div>
          <div class="pq-modo" role="group" aria-label="Mostrar como"><button type="button" data-modo="graf">Gráfico</button><button type="button" data-modo="tab">Tabela</button></div>
        </div>
        <div class="tempo rolagem-x pt-anos" role="group" aria-label="Eleição">${anos.map((a) => `<button type="button" class="tempo__ano" data-ano="${a}">${a}</button>`).join("")}</div>
        <div id="pt-ano-leg">${legenda()}</div>
        <div class="pq-graf" id="pt-ano-graf"></div>
        <p class="pq-nota">A bolinha colorida é a nota do partido (tracejada quando as medidas discordam do lado); a linha cinza vai da medida que põe o partido mais à esquerda à que põe mais à direita. Marca clara: medida feita longe desta eleição, que pesa menos. Faixa bege: o centro, de −0,25 a +0,25.</p>
      </section>

      <section class="pq-painel" id="pt-traj" aria-labelledby="pt-traj-tit">
        <div><h2 class="pq-painel__tit" id="pt-traj-tit"></h2><p class="pq-painel__rec">A linha é a nota do partido em cada eleição; as marcas são as medidas, no ano em que foram feitas (o voto na Câmara aparece em 2023, o meio de 2019 a 2026); a sombra vai da menor à maior.</p></div>
        <div class="pq-vistas" role="group" aria-label="Partido">${PRINC.filter((k) => D.partidos[k]).map((k) => `<button type="button" class="chip" data-partido="${k}">${V.esc(D.partidos[k].nome.replace(/ \(.*\)$/, ""))}</button>`).join("")}
          <label class="pt-outro"><span class="visualmente-oculto">Outro partido</span><select id="pt-outro"><option value="">Outro partido…</option>${outros.map(([k, p]) => `<option value="${k}">${V.esc(p.nome)}</option>`).join("")}</select></label></div>
        ${legenda()}
        <div class="pq-graf" id="pt-traj-graf"></div>
      </section>

      <section class="pq-painel pt-concorda" id="pt-conc" aria-labelledby="pt-conc-tit">
        <div><h2 class="pq-painel__tit" id="pt-conc-tit">As medidas concordam entre si: correlação de ${r2(rmin)} a ${r2(rmax)}</h2>
          <p class="pq-painel__rec">Cada ponto é um partido medido pelas duas fontes em datas próximas (até 2 anos; até 5 com o voto na Câmara). Na diagonal, as duas dão a mesma nota. Em laranja, os casos em que põem o partido em lados diferentes.</p></div>
        <div class="pq-vistas" role="group" aria-label="Comparação">${pares.map((x, i) => `<button type="button" class="chip" data-par="${i}">${NOME_F[x.a]} × ${NOME_F[x.b]}</button>`).join("")}</div>
        <div class="pt-par-um" id="pt-par"></div>
        <div class="pq__tabela pq__tabela--leitura" tabindex="0" role="region" aria-label="Concordância entre as medidas"><table>
          <thead><tr><th scope="col">Comparação</th><th scope="col" class="num">Correlação</th><th scope="col" class="num">Mesmo lado</th><th scope="col">Discordam</th></tr></thead>
          <tbody>${pares.map(({ a, b, p }) => `<tr><th scope="row">${NOME_F[a]} × ${NOME_F[b]}</th><td class="num">${r2(p.r)}</td><td class="num">${p.mesmo_lado} de ${p.n}</td><td>${V.esc(agrupa(p.lados_diferentes, D)) || "—"}</td></tr>`).join("")}</tbody></table></div>
        <p class="pq-mais">Entre os estudos, quem mais aparece em lados diferentes é o PSDB: para os deputados ele fica no centro, para o V-Party, que mede só a economia, ele é de direita. Entre os estudos e o voto, é o centrão: partidos que os especialistas põem à direita, mas que votam com o governo da vez, de Bolsonaro e de Lula, e por isso caem no meio da régua do voto.</p>
      </section>

      <details class="pq-origem"><summary>Como as notas foram feitas</summary>
        <p><b>As quatro medidas.</b> ${F.map((f) => `${fonte(f).nome}: ${fonte(f).quem}.`).join(" ")}</p>
        <p><b>Mesma escala.</b> A escala comum é a de Zucco e Power (−1 a +1). As notas dos outros dois estudos foram convertidas por uma reta (mínimos quadrados) ajustada nos partidos que aparecem nos dois: ${["BRC", "VP"].map((f) => `${fonte(f).nome}, nota × ${r2(fonte(f).ajuste.b)} ${fonte(f).ajuste.a < 0 ? "−" : "+"} ${r2(Math.abs(fonte(f).ajuste.a))}, com ${fonte(f).ajuste.n} pares e correlação de ${r2(fonte(f).ajuste.r)}`).join("; ")}.</p>
        <p><b>Voto na Câmara.</b> Para cada uma das votações de mérito no Plenário de 2019 a 2026, lemos o que cada bancada orientou (sim ou não). Partidos que orientam igual ficam perto. Isso é feito separadamente nos governos Bolsonaro e Lula, e a nota é a média dos dois: um partido que só acompanha o governo da vez pula de lado e cai no meio; quem é de esquerda ou de direita fica no mesmo lugar (Zucco, 2009). Só entram partidos que votaram nos dois governos. A escala foi ajustada à de Zucco e Power pelos partidos que as duas medem.</p>
        <p><b>Nota de cada eleição.</b> Cada medida entra se foi feita até 4 anos antes ou depois da eleição; depois da última medida de um estudo, ela vale por até 8 anos. Cada uma pesa 1 / (1 + anos de distância ÷ 2): a feita no ano da eleição pesa 1, a de 4 anos antes pesa 1/3. Com três medidas ou mais, a nota é a mediana ponderada, para um ponto fora da curva não puxar a nota; com uma ou duas, a média ponderada. Toda nota fica entre −1 e +1. Quando nada mediu o partido perto da eleição (partidos pequenos antes de 2014), vale a medida mais próxima até 12 anos, com aviso. Partidos que se fundiram (União Brasil, PRD) recebem a média dos partidos de origem quando a medida não pega o partido novo.</p>
        <p><b>Faixas.</b> Esquerda abaixo de −0,5; centro-esquerda até −0,25; centro de −0,25 a +0,25 (o corte de Zucco e Power); centro-direita até +0,5; direita acima disso. A classificação é marcada como incerta quando menos de 2/3 do peso das medidas fica do mesmo lado da nota (esquerda, centro ou direita).</p>
        ${D.planos ? `<p><b>O que eles pregam: testamos e ficou de fora.</b> Medimos também o texto dos planos de governo para presidente de 2018, 2022 e 2026 pelo método Wordscores (Laver, Benoit e Garry, 2003), usando os planos de 2018 como referência, com a nota dos cientistas políticos. A medida não passou no teste: tirando um plano de cada vez das referências e calculando a nota dele pelos outros ${D.planos.n_referencias - 1}, a correlação com a nota verdadeira foi de ${r2(D.planos.r_deixa_um_fora)}. Os planos falam de quase tudo, e o vocabulário só separa a esquerda revolucionária (PSTU, PCO, PCB, UP) do resto. Por isso não entra na nota.</p>` : ""}
        <p><b>Limites.</b> O V-Party pergunta só sobre economia e mede os partidos com mais de 5% dos votos. O estudo de Bolognesi e colegas é de um único ano (2018). Os três estudos são de 2018 a 2021, antes da entrada de Bolsonaro no PL (novembro de 2021) e da criação do União Brasil (2022); para 2022 em diante, só o voto na Câmara mede esses partidos como eles são hoje. O voto mede a orientação do líder, não de cada deputado. O PSD de 1987 a 2003 e o PSL de antes de 2018 eram outros partidos e ficam sem nota.</p>
        <p><b>Referências</b></p>
        <ul class="pt-refs">${F.map((f) => `<li>${fonte(f).ref}</li>`).join("")}<li>LAVER, Michael; BENOIT, Kenneth; GARRY, John. Extracting policy positions from political texts using words as data. American Political Science Review, v. 97, n. 2, p. 311-331, 2003.</li></ul>
        <p>Cálculo em <code>scripts/notas_estudos.py</code>; dados em <code>scripts/harvard_zucco_power_2024.csv</code>, <code>scripts/bolognesi_2023.csv</code> e <code>scripts/vparty_brasil.csv</code>; voto na Câmara em <code>scripts/regua_voto.py</code>; teste dos planos em <code>scripts/wordscores_planos.py</code>.</p>
      </details>
    </div>`;
    pintarAno(); pintarTraj(); pintarPar();
  });
})();
