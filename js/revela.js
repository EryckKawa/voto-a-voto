/* Voto a voto — "O que o voto revela": achados de 30 anos de eleições, cada um com o título que já diz o dado.
   Todos os números vêm de data/br/achados.json, calculado por scripts/achados.py a partir dos arquivos do TSE e do IBGE. */
(function () {
  "use strict";
  const V = window.V;
  const pct = (v, d) => V.pct(v, d);
  const REGS = ["Nordeste", "Norte", "Centro-Oeste", "Sudeste", "Sul"];

  /* barras horizontais em HTML: rótulo, barra, valor */
  function barras(linhas, opts) {
    const mx = opts.max || Math.max(...linhas.map((l) => l.v));
    return `<ol class="barras">${linhas.map((l) => `<li><span class="barras__rot">${l.rot}${l.sub ? `<small>${l.sub}</small>` : ""}</span>
      <span class="barras__trilho">${l.partes ? l.partes.map((p) => `<i style="flex-basis:${(100 * p.v) / mx}%;background:${p.cor}" title="${V.esc(p.tit)}"></i>`).join("") : `<i style="flex-basis:${(100 * l.v) / mx}%;background:${opts.cor}"></i>`}</span>
      <b>${l.vTxt || pct(l.v)}</b></li>`).join("")}</ol>`;
  }

  /* linhas ao longo dos anos. Séries grossas têm nome na ponta; finas ficam em cinza, com o nome na dica */
  function linhas({ anos, series, max = 100, vazios = [], rot }) {
    const estreito = V.largura() < 600, W = estreito ? 360 : 760, H = estreito ? 250 : 300;
    const m = { t: 16, r: estreito ? 108 : 140, b: 30, l: estreito ? 30 : 40 }, fs = estreito ? 11 : 13;
    const x = d3.scalePoint().domain(anos).range([m.l, W - m.r]), y = d3.scaleLinear().domain([0, max]).range([H - m.b, m.t]);
    const ordem = [...series].sort((a, b) => !!a.grossa - !!b.grossa);   // as grossas por cima
    // rótulos das pontas sem encostar um no outro
    const pontas = series.filter((s) => s.grossa).map((s) => ({ s, y: y(s.v[s.v.length - 1]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < pontas.length; i++) if (pontas[i].y - pontas[i - 1].y < fs + 4) pontas[i].y = pontas[i - 1].y + fs + 4;
    return `<svg class="serie" viewBox="0 0 ${W} ${H}" role="img" aria-label="${V.esc(rot)}: ${series.map((s) => s.nome + " " + s.v.map((v, i) => anos[i] + " " + pct(v, 0)).join(", ")).join("; ")}">
      ${[0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(f * max)}" y2="${y(f * max)}" stroke="#e1e3e7"/><text x="${m.l - 6}" y="${y(f * max) + 4}" text-anchor="end" font-size="${fs}" class="serie__eixo">${Math.round(f * max)}%</text>`).join("")}
      ${anos.map((a, i) => (estreito && i % 2 && i !== anos.length - 1 ? "" : `<text x="${x(a)}" y="${H - 8}" text-anchor="middle" font-size="${fs}" class="serie__eixo">${a}</text>`)).join("")}
      ${ordem.map((s) => `<g><title>${V.esc(s.nome)}</title><path d="${d3.line().x((d, i) => x(anos[i])).y((d) => y(d))(s.v)}" fill="none" stroke="${s.cor}" stroke-width="${s.grossa ? 3 : 1.5}"/>
        ${s.grossa ? s.v.map((v, i) => `<circle cx="${x(anos[i])}" cy="${y(v)}" r="4" fill="${vazios.includes(anos[i]) ? "#fff" : s.cor}" stroke="${s.cor}" stroke-width="2"><title>${anos[i]}, ${V.esc(s.nome)}: ${pct(v)}</title></circle>`).join("") : ""}</g>`).join("")}
      ${pontas.map((p) => `<text x="${W - m.r + 8}" y="${p.y + 4}" font-size="${fs + 1}" class="serie__rot" fill="${p.s.cor}">${V.esc((estreito && p.s.curtoM) || p.s.curto || p.s.nome)} ${pct(p.s.v[p.s.v.length - 1], 0)}</text>`).join("")}
    </svg>`;
  }
  const leg = (itens) => `<p class="achado__leg">${itens.map(([cor, t, vazio]) => `<span><i style="background:${vazio ? "#fff" : cor};${vazio ? `border:2px solid ${cor};border-radius:50%` : ""}"></i>${t}</span>`).join("")}</p>`;
  V.graf = { barras, linhas, leg };   // usados também na página das 12 perguntas

  const bloco = (b) => `<article class="achado" id="${b.id}">
      <h2 class="achado__titulo">${b.tit}</h2>
      <p class="achado__tema">${b.tema}</p>
      <p class="achado__sub">${b.sub}</p>
      ${b.legenda || ""}
      ${b.grafico}
      <details class="achado__como"><summary>Como chegamos nesse número</summary><p>${b.como}</p></details>
      <p class="achado__pe"><a href="${b.link}">${b.linkTxt}</a><span>Fonte: ${b.fonte}</span></p>
    </article>`;

  V.rota(/^\/revela$/, async function (main) {
    V.marcarNav("revela");
    const A = await V.dados("br/achados");
    const Q = A.quintos.limites_mil_reais;
    const QNOME = ["20% mais pobres", "2º grupo", "3º grupo", "4º grupo", "20% mais ricas"];

    // 1. a virada de 2006: o PT por riqueza da cidade
    const PR = A.pt_renda, anosP = PR.map((r) => r.ano), r02 = PR.find((r) => r.ano === 2002), r06 = PR.find((r) => r.ano === 2006);
    const desde06 = PR.filter((r) => r.ano >= 2006).every((r) => r.pt[0] > r.pt[4]);
    const ult = [...PR].reverse().find((r) => r.turno === "t2");   // última eleição decidida no 2º turno
    const serRenda = [0, 1, 2, 3, 4].map((i) => ({ nome: QNOME[i], curto: i === 0 ? "mais pobres" : i === 4 ? "mais ricas" : "", curtoM: i === 0 ? "pobres" : i === 4 ? "ricas" : "", cor: i === 0 ? "#16181d" : i === 4 ? "#4f6fb3" : "#c9ccd1", grossa: i === 0 || i === 4, v: PR.map((r) => r.pt[i]) }));

    // 2. Nordeste e Sul: onde o PT fica em 1º para presidente
    const PRG = A.pt_regiao, anosR = PRG.map((r) => r.ano), parte = (r, reg) => (100 * r[reg][0]) / r[reg][1];
    const ne94 = parte(PRG[0], "Nordeste"), neMin = Math.min(...PRG.filter((r) => r.ano >= 2006).map((r) => parte(r, "Nordeste")));
    const sul02 = parte(PRG.find((r) => r.ano === 2002), "Sul"), sulU = parte(PRG[PRG.length - 1], "Sul"), anoU = PRG[PRG.length - 1].ano;
    const CORREG = { Nordeste: "#16181d", Sul: "#4f6fb3" };
    const serReg = REGS.map((g) => ({ nome: g, cor: CORREG[g] || "#c9ccd1", grossa: !!CORREG[g], v: PRG.map((r) => parte(r, g)) }));

    // 2b. cidades de um lado só no 2º turno
    const UL = A.um_lado, u22 = UL[UL.length - 1], u02 = UL[0], uMax = UL.reduce((a, b) => (b.acima70 / b.cidades > a.acima70 / a.cidades ? b : a));
    const linhasUL = UL.map((u) => ({ rot: String(u.ano), sub: `vantagem no país: ${String(u.margem_brasil).replace(".", ",")} ${u.margem_brasil < 2 ? "ponto" : "pontos"}`, v: (100 * u.acima70) / u.cidades, vTxt: pct((100 * u.acima70) / u.cidades, 0) }));

    // 3. voto dividido: presidente x senador na mesma cidade
    const VD = A.voto_dividido, d22 = VD.find((d) => d.ano === 2022);
    const grupo = (d) => { const g = { mesmo: 0, ed: 0, de: 0, centro: 0 };
      for (const [k, n] of Object.entries(d.pares)) { const [a, b] = k.split("|"); if (a === b) g.mesmo += n; else if (a === "esquerda" && b === "direita") g.ed += n; else if (a === "direita" && b === "esquerda") g.de += n; else g.centro += n; }
      return g; };
    const g22 = grupo(d22);
    const PARTES = [["mesmo", "#9aa0aa", "Mesmo lado nos dois"], ["ed", "#6d51a3", "Esquerda para presidente, direita para senador"], ["de", "#d49a4a", "Direita para presidente, esquerda para senador"], ["centro", "#e3e5e9", "Um dos dois de centro"]];
    const linhasVD = VD.map((d) => { const g = grupo(d); return { rot: String(d.ano), sub: d.ano === 2026 ? "só o 1º turno" : "", v: (100 * g.ed) / d.n, vTxt: V.int(g.ed), partes: PARTES.map(([k, cor, t]) => ({ v: (100 * g[k]) / d.n, cor, tit: `${t}: ${V.int(g[k])} cidades (${pct((100 * g[k]) / d.n, 0)})` })) }; });

    // 4. prefeitos reeleitos que trocaram de partido
    const PF = A.prefeitos, p24 = PF[PF.length - 1];
    const linhasPF = PF.map((p) => ({ rot: String(p.ano), sub: `${V.int(p.trocaram)} de ${V.int(p.reeleitos)} reeleitos`, v: (100 * p.trocaram) / p.reeleitos }));

    // 5 e 6. quem falta: tamanho e riqueza da cidade
    const FT = A.falta_tamanho, FR = A.falta_renda;
    // 7. série nacional de falta e branco/nulo para presidente
    const sP = A.serie.filter((s) => s[1] === "PRES").map(([a, , ap, cp, ab, br, nu]) => ({ a, falta: (100 * ab) / ap, bn: (100 * (br + nu)) / cp }));
    const p0 = sP[0], pN = sP[sP.length - 1], p02 = sP.find((d) => d.a === 2002);

    const blocos = [
      { id: "virada", indice: "A virada de 2006", tema: "Renda e voto · presidente, 1994 a 2026",
        tit: `Em 2002, Lula teve ${pct(r02.pt[0], 0)} dos votos nas cidades mais pobres e ${pct(r02.pt[4], 0)} nas mais ricas. Em 2006, a ordem virou${desde06 ? " e nunca mais desvirou" : ""}`,
        sub: `As 5.570 cidades em cinco grupos do mesmo tamanho, pela riqueza produzida por habitante. Em 2006, o PT foi a ${pct(r06.pt[0], 0)} nas mais pobres e caiu para ${pct(r06.pt[4], 0)} nas mais ricas. Em ${ult.ano}, a distância era de ${V.int(Math.round(ult.pt[0] - ult.pt[4]))} pontos.`,
        legenda: leg([["#16181d", "20% mais pobres (até R$ " + Q[0] + " mil por pessoa)"], ["#4f6fb3", "20% mais ricas (acima de R$ " + Q[3] + " mil)"], ["#c9ccd1", "grupos do meio"], ["#16181d", "turno único ou só o 1º turno (1994, 1998, 2026)", true]]),
        grafico: linhas({ anos: anosP, series: serRenda, vazios: [1994, 1998, 2026], rot: "Votos do PT para presidente por grupo de riqueza da cidade" }),
        como: "Parte dos votos válidos do candidato do PT no turno que decidiu a eleição (em 1994 e 1998 não houve 2º turno; de 2026, por enquanto, só há o 1º), somando todas as cidades de cada grupo (TSE). Grupos pelo PIB por habitante (IBGE, PIB de 2021 e Censo 2022). É a média das cidades, não das pessoas: numa cidade rica também há eleitores pobres. Na ciência política, essa mudança é chamada de realinhamento eleitoral (André Singer, Os sentidos do lulismo, 2012).",
        link: "#/mapa/e/PRES2002", linkTxt: "Ver 2002 no mapa e passar os anos", fonte: "TSE e IBGE" },
      { id: "nordeste", indice: "Nordeste e Sul", tema: "Território · presidente, 1994 a 2026",
        tit: `Em 1994, o PT ficou em 1º em ${pct(ne94, 0)} das cidades do Nordeste. De 2006 em diante, em ${pct(Math.floor(neMin), 0)} ou mais. No Sul, foi o contrário: de ${pct(sul02, 0)} em 2002 para ${pct(sulU, 0)} em ${anoU}`,
        sub: "Parte das cidades de cada região em que o candidato do PT foi o mais votado para presidente.",
        legenda: leg([["#16181d", "Nordeste"], ["#4f6fb3", "Sul"], ["#c9ccd1", "Norte, Centro-Oeste e Sudeste"]]),
        grafico: linhas({ anos: anosR, series: serReg, vazios: [1994, 1998, 2026], rot: "Cidades em que o PT ficou em 1º para presidente, por região" }),
        como: "Mais votado no turno que decidiu a eleição em cada cidade (TSE). Em 1994 o Brasil tinha menos municípios; cada ano é contado sobre as cidades que existiam naquela eleição.",
        link: "#/mapa/e/PRES1994", linkTxt: "Ver no mapa, de 1994 a 2026", fonte: "TSE" },
      { id: "um-lado", indice: "Cidades de um lado só", tema: "Polarização · 2º turno para presidente, 2002 a 2022",
        tit: `Em ${u22.ano}, Lula venceu no país por ${String(u22.margem_brasil).replace(".", ",")} ponto, mas em ${V.int(u22.acima70)} cidades (${pct((100 * u22.acima70) / u22.cidades, 0)}) o vencedor local passou de 70% dos votos`,
        sub: `O país dividido ao meio é feito de cidades que quase não se dividem. Em ${u02.ano}, só ${pct((100 * u02.acima70) / u02.cidades, 0)} das cidades deram mais de 70% a um candidato; o recorde foi em ${uMax.ano}, com ${pct((100 * uMax.acima70) / uMax.cidades, 0)}.`,
        grafico: barras(linhasUL, { max: 60, cor: "#16181d" }),
        como: "Parte das cidades em que o candidato mais votado no 2º turno para presidente teve 70% ou mais dos votos válidos da cidade (TSE). A vantagem no país é a diferença entre os dois candidatos, em pontos percentuais, no total do Brasil. Só anos com 2º turno; a barra vai até 60%.",
        link: "#/mapa/e/PRES2022", linkTxt: "Ver o 2º turno de 2022 no mapa", fonte: "TSE" },
      { id: "dividido", indice: "Voto dividido", tema: "Presidente e senador na mesma urna",
        tit: `Em 2022, em ${V.int(g22.ed)} cidades (${pct((100 * g22.ed) / d22.n, 0)}) o 1º lugar para presidente foi da esquerda e, para senador, da direita`,
        sub: "No mesmo dia, na mesma urna, o eleitor escolhe presidente e senador. Cada barra mostra como as cidades combinaram os dois 1º lugares.",
        legenda: leg(PARTES.map(([, cor, t]) => [cor, t])),
        grafico: barras(linhasVD, { max: 100 }),
        como: "Lado de cada candidato pela régua pelo voto na Câmara (esquerda abaixo de −0,25, direita acima de +0,25); partidos sem bancada usam a nota de Harvard. Mais votado em cada cidade no 1º turno para senador e no turno final para presidente (TSE). O número à direita é o de cidades com esquerda para presidente e direita para senador.",
        link: "#/mapa/e/SEN2022", linkTxt: "Ver o mapa de senador 2022", fonte: "TSE e Câmara dos Deputados" },
      { id: "prefeitos", indice: "Prefeitos trocam de partido", tema: "Prefeitos · 2000 a 2024",
        tit: `Em 2024, ${V.int(p24.trocaram)} dos ${V.int(p24.reeleitos)} prefeitos reeleitos tinham trocado de partido: ${pct((100 * p24.trocaram) / p24.reeleitos, 0)}`,
        sub: `A sigla muda e o prefeito fica. E só ${pct((100 * p24.mesmo_partido) / p24.cidades, 0)} das prefeituras ficaram com o mesmo partido de 2020.`,
        grafico: barras(linhasPF, { max: 60, cor: "#16181d" }),
        como: "Reeleito: mesmo nome na urna, na mesma cidade, eleito nas duas eleições (TSE). Quem mudou de nome na urna fica de fora, então os reeleitos são pelo menos esses. Fusões não contam como troca (PFL, DEM e PSL viraram União; PTB e Patriota, PRD; PMDB voltou a ser MDB; e outras). A reeleição para prefeito existe desde a eleição de 2000. A barra vai até 60%.",
        link: "#/mapa/e/PREF2024", linkTxt: "Ver os prefeitos de 2024 no mapa", fonte: "TSE" },
      { id: "falta", indice: "Tamanho da cidade", tema: "Quem falta · prefeito 2024",
        tit: `Nas cidades com mais de 500 mil eleitores, ${pct(FT[4].falta)} faltaram; nas com até 5 mil, ${pct(FT[0].falta)}`,
        sub: "Parte dos eleitores que não foi votar no 1º turno, pelo tamanho da cidade.",
        grafico: barras(FT.map((f) => ({ rot: f.rot + " eleitores", sub: V.int(f.cidades) + " cidades", v: f.falta })), { cor: "#9c5d16" }),
        como: "Abstenções divididas pelos eleitores aptos de cada grupo de cidades, 1º turno de 2024 (TSE). Uma parte da abstenção é de quem mudou de cidade e não transferiu o título.",
        link: "#/mapa/v/abst", linkTxt: "Ver no mapa de quem faltou", fonte: "TSE" },
      { id: "falta-renda", indice: "Renda e falta", tema: "Quem falta · presidente 2022",
        tit: `Nas cidades mais pobres, ${pct(FR[0])} dos eleitores faltaram; nas mais ricas, ${pct(FR[4])}`,
        sub: "Os mesmos cinco grupos de riqueza do primeiro gráfico, agora olhando quem não foi votar.",
        grafico: barras(FR.map((v, i) => ({ rot: QNOME[i], v })), { cor: "#9c5d16" }),
        como: "Abstenções do 1º turno de 2022 divididas pelos eleitores aptos, por grupo de PIB por habitante (TSE e IBGE).",
        link: "#/mapa/e/PRES2022/v/abst", linkTxt: "Ver no mapa de quem faltou em 2022", fonte: "TSE e IBGE" },
      { id: "branco-nulo", indice: "Desde 1994", tema: "Protesto e ausência · 1994 a 2026",
        tit: `Em ${p0.a}, ${pct(p0.bn)} anularam ou votaram em branco para presidente; em ${pN.a}, ${pct(pN.bn)}. A falta foi de ${pct(p0.falta)} para ${pct(pN.falta)}`,
        sub: `Cada ponto é o 1º turno de uma eleição para presidente. O branco e o nulo caíram de ${pct(p0.bn, 0)} para ${pct(p02.bn, 0)} em 2002, a primeira eleição geral só com urna eletrônica, e seguiram caindo. A falta foi no caminho contrário.`,
        legenda: leg([["#9c5d16", "Faltaram"], ["#3b2766", "Branco ou nulo"]]),
        grafico: linhas({ anos: sP.map((d) => d.a), series: [{ nome: "Faltaram", cor: "#9c5d16", grossa: true, v: sP.map((d) => d.falta) }, { nome: "Branco ou nulo", cor: "#3b2766", grossa: true, v: sP.map((d) => d.bn) }], max: 30, rot: "Falta e voto branco ou nulo para presidente, 1º turno" }),
        como: "Soma de todas as cidades do Brasil, 1º turno para presidente (TSE, detalhe da votação por município e zona). Branco e nulo sobre quem foi votar; falta sobre os eleitores aptos. Até 1998 o voto era em cédula de papel em boa parte do país, e cédula mal preenchida virava voto nulo.",
        link: "#/mapa/v/bn", linkTxt: "Ver no mapa de branco e nulo", fonte: "TSE" },
    ];

    document.title = "O que o voto revela · Voto a voto";
    main.innerHTML = `<div class="pagina revela">
      <header class="revela__topo"><h1 class="titulo-grande">O que o voto revela</h1>
        <p class="lead">Oito achados de trinta anos de eleições, de 1994 a 2026, nas 5.570 cidades. Cada título já é a resposta; o gráfico mostra de onde ela vem.</p>
        <nav class="revela__indice" aria-label="Achados">${blocos.map((b) => `<a href="#/revela" data-alvo="${b.id}">${b.indice}</a>`).join("")}</nav></header>
      ${blocos.map(bloco).join("")}
      <p class="revela__fim"><a href="#/perguntas">Ver as 12 perguntas do trabalho, cada uma com a consulta SQL</a></p>
    </div>`;
    main.querySelectorAll("[data-alvo]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); document.getElementById(a.dataset.alvo).scrollIntoView({ behavior: "smooth", block: "start" }); }));
  });
})();
