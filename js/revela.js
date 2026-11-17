/* Voto a voto — "O que o voto revela": achados de 30 anos de eleições, cada um com o título que já diz o dado.
   Todos os números vêm de data/br/achados.json, calculado por scripts/achados.py a partir dos arquivos do TSE e do IBGE. */
(function () {
  "use strict";
  const V = window.V;
  const pct = (v, d) => V.pct(v, d);
  const REGS = ["Nordeste", "Norte", "Centro-Oeste", "Sudeste", "Sul"];

  /* enquanto a página monta, cada gráfico guarda a tabela com os mesmos números (é o CSV do cartão) */
  let TABS = null;
  const semTag = (h) => String(h == null ? "" : h).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  /* barras horizontais em HTML: rótulo, barra, valor */
  function barras(linhas, opts) {
    if (TABS) {
      const nomes = linhas[0] && linhas[0].partes ? linhas[0].partes.map((p, i) => semTag(p.tit).split(":")[0] || "Parte " + (i + 1)) : [];
      TABS.push({ cols: ["Grupo", ...(nomes.length ? nomes : ["Valor"])], linhas: linhas.map((l) => [semTag(l.rot) + (l.sub ? " (" + semTag(l.sub) + ")" : ""), ...(nomes.length ? l.partes.map((p) => pct(p.v)) : [l.vTxt ? semTag(l.vTxt) : pct(l.v)])]) });
    }
    const mx = opts.max || Math.max(...linhas.map((l) => l.v));
    return `<ol class="barras">${linhas.map((l) => `<li><span class="barras__rot">${l.rot}${l.sub ? `<small>${l.sub}</small>` : ""}</span>
      <span class="barras__trilho">${l.partes ? l.partes.map((p) => `<i style="flex-basis:${(100 * p.v) / mx}%;background:${p.cor}" title="${V.esc(p.tit)}"></i>`).join("") : `<i style="flex-basis:${(100 * l.v) / mx}%;background:${opts.cor}"></i>`}</span>
      <b>${l.vTxt || pct(l.v)}</b></li>`).join("")}</ol>`;
  }

  /* linhas ao longo dos anos. Séries grossas têm nome na ponta; finas ficam em cinza, com o nome na dica.
     Por padrão a escala vai de 0 a max (em %). Para uma escala com negativos (a nota de −1 a +1), passe min, fmt (valor) e
     fmtEixo (rótulo do eixo), e meio: a linha de referência mais escura (o zero). Um valor null é um ano sem dado: a linha
     liga os pontos que existem. */
  function linhas({ anos, series, max = 100, min = 0, vazios = [], rot, fmt = (v) => pct(v, 0), fmtPonto = (v) => pct(v), fmtEixo = (t) => Math.round(t) + "%", meio = null, marcas = [0, 0.25, 0.5, 0.75, 1], faixas = [] }) {
    if (TABS) TABS.push({ cols: ["Ano", ...series.map((s) => s.nome)], linhas: anos.map((a, i) => [a, ...series.map((s) => (s.v[i] == null ? "" : fmtPonto(s.v[i])))]) });
    const estreito = V.largura() < 600, W = estreito ? 360 : 760, H = estreito ? 250 : 300;
    const m = { t: 16, r: estreito ? 108 : 140, b: 30, l: estreito ? 34 : 44 }, fs = estreito ? 11 : 13;
    const x = d3.scalePoint().domain(anos).range([m.l, W - m.r]), y = d3.scaleLinear().domain([min, max]).range([H - m.b, m.t]);
    const ordem = [...series].sort((a, b) => !!a.grossa - !!b.grossa);   // as grossas por cima
    const pts = (s) => s.v.map((v, i) => [anos[i], v]).filter(([, v]) => v != null);
    const ult = (s) => { const p = pts(s); return p.length ? p[p.length - 1][1] : null; };
    // rótulos das pontas sem encostar um no outro
    const pontas = series.filter((s) => s.grossa && ult(s) != null).map((s) => ({ s, y: y(ult(s)) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < pontas.length; i++) if (pontas[i].y - pontas[i - 1].y < fs + 4) pontas[i].y = pontas[i - 1].y + fs + 4;
    return `<svg class="serie" viewBox="0 0 ${W} ${H}" role="img" aria-label="${V.esc(rot)}: ${series.map((s) => s.nome + " " + pts(s).map(([a, v]) => a + " " + fmt(v)).join(", ")).join("; ")}">
      ${faixas.map(([de, ate, cor]) => { const a = Math.min(max, ate), d = Math.max(min, de); return a > d ? `<rect x="${m.l}" width="${W - m.r - m.l}" y="${y(a)}" height="${y(d) - y(a)}" fill="${cor}" opacity=".08"/>` : ""; }).join("")}
      ${marcas.map((f) => { const t = min + f * (max - min); return `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="${meio != null && Math.abs(t - meio) < 1e-9 ? "#9aa0a8" : "#e1e3e7"}"/><text x="${m.l - 6}" y="${y(t) + 4}" text-anchor="end" font-size="${fs}" class="serie__eixo">${fmtEixo(t)}</text>`; }).join("")}
      ${anos.map((a, i) => (estreito && i % 2 && i !== anos.length - 1 ? "" : `<text x="${x(a)}" y="${H - 8}" text-anchor="middle" font-size="${fs}" class="serie__eixo">${a}</text>`)).join("")}
      ${ordem.map((s) => `<g><title>${V.esc(s.nome)}</title><path d="${d3.line().x((d) => x(d[0])).y((d) => y(d[1]))(pts(s))}" fill="none" stroke="${s.cor}" stroke-width="${s.grossa ? 3 : 1.5}"${s.tracejada ? ' stroke-dasharray="6 4"' : ""}/>
        ${s.grossa ? pts(s).map(([a, v]) => `<circle cx="${x(a)}" cy="${y(v)}" r="4" fill="${vazios.includes(a) ? "#fff" : s.cor}" stroke="${s.cor}" stroke-width="2"><title>${a}, ${V.esc(s.nome)}: ${fmtPonto(v)}</title></circle>`).join("") : ""}</g>`).join("")}
      ${pontas.map((p) => `<text x="${W - m.r + 8}" y="${p.y + 4}" font-size="${fs + 1}" class="serie__rot" fill="${p.s.cor}">${V.esc((estreito && p.s.curtoM) || p.s.curto || p.s.nome)} ${fmt(ult(p.s))}</text>`).join("")}
    </svg>`;
  }
  const leg = (itens) => `<p class="achado__leg">${itens.map(([cor, t, vazio]) => `<span><i style="background:${vazio ? "#fff" : cor};${vazio ? `border:2px solid ${cor};border-radius:50%` : ""}"></i>${t}</span>`).join("")}</p>`;

  /* nuvem de palavras: o tamanho é a raiz da contagem; as maiores ficam no meio (ordem fixa, sem sorteio, para a nuvem
     não mudar a cada visita). itens: [{ w (palavra), q (contagem), cor? , tit? }]. A mesma lista vai para o leitor de tela. */
  function nuvem(itens, { rot = "Nuvem de palavras", min = 14, max = 46, cor = "#16181d" } = {}) {
    if (!itens.length) return '<p class="vazio">Sem palavras para mostrar.</p>';
    const ord = [...itens].sort((a, b) => b.q - a.q), qm = ord[0].q, q0 = ord[ord.length - 1].q;
    const tam = (q) => (qm === q0 ? (min + max) / 2 : min + (max - min) * Math.sqrt((q - q0) / (qm - q0)));
    const meio = []; ord.forEach((it, i) => (i % 2 ? meio.push(it) : meio.unshift(it)));
    return `<p class="nuvem" role="img" aria-label="${V.esc(rot)}: ${ord.map((it) => `${it.w} (${V.int(it.q)})`).join(", ")}">${meio.map((it) =>
      `<span style="font-size:${tam(it.q).toFixed(1)}px;color:${it.cor || cor}" title="${V.esc(it.tit || `${it.w}: ${V.int(it.q)} vezes`)}">${V.esc(it.w)}</span>`).join(" ")}</p>`;
  }
  V.graf = { barras, linhas, leg, nuvem };   // usados também na página dos 16 temas e na ficha do político

  const bloco = (b, i) => `<article class="achado" id="${b.id}">
      <h2 class="achado__titulo">${b.tit}</h2>
      <p class="achado__tema">${b.tema}</p>
      <p class="achado__sub">${b.sub}</p>
      ${b.legenda || ""}
      ${b.grafico}
      <details class="achado__como"><summary>Como chegamos nesse número</summary><p>${b.como}</p></details>
      <div class="achado__pe"><p>Fonte: ${b.fonte}. <a href="${b.link}">${b.linkTxt}</a></p><button type="button" class="btn pq-csv" data-csv="${i}">Baixar dados (CSV)</button></div>
    </article>`;

  V.rota(/^\/revela$/, async function (main) {
    V.marcarNav("revela");
    const A = await V.dados("br/achados");
    TABS = [];
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
    const linhasVD = VD.map((d) => { const g = grupo(d); return { rot: String(d.ano), sub: "", v: (100 * g.ed) / d.n, vTxt: V.int(g.ed), partes: PARTES.map(([k, cor, t]) => ({ v: (100 * g[k]) / d.n, cor, tit: `${t}: ${V.int(g[k])} cidades (${pct((100 * g[k]) / d.n, 0)})` })) }; });

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
        tit: desde06 ? "Desde 2006, as cidades mais pobres votam mais no PT que as mais ricas" : `Em 2002, Lula teve ${pct(r02.pt[0], 0)} dos votos nas cidades mais pobres e ${pct(r02.pt[4], 0)} nas mais ricas`,
        sub: `Em ${ult.ano}, o PT teve ${pct(ult.pt[0], 0)} dos votos nas cidades mais pobres e ${pct(ult.pt[4], 0)} nas mais ricas. Em 2002, a ordem era a contrária.`,
        legenda: leg([["#16181d", "20% mais pobres (até R$ " + Q[0] + " mil por pessoa)"], ["#4f6fb3", "20% mais ricas (acima de R$ " + Q[3] + " mil)"], ["#c9ccd1", "grupos do meio"], ["#16181d", "turno único (1994 e 1998)", true]]),
        grafico: linhas({ anos: anosP, series: serRenda, vazios: [1994, 1998], rot: "Votos do PT para presidente por grupo de riqueza da cidade" }),
        como: "Parte dos votos válidos do candidato do PT no turno que decidiu a eleição (em 1994 e 1998 não houve 2º turno), somando todas as cidades de cada grupo (TSE). Grupos pelo PIB por habitante (IBGE, PIB de 2021 e Censo 2022). É a média das cidades, não das pessoas: numa cidade rica também há eleitores pobres. Na ciência política, essa mudança é chamada de realinhamento eleitoral (André Singer, Os sentidos do lulismo, 2012).",
        link: "#/mapa/e/PRES2002", linkTxt: "Ver 2002 no mapa e passar os anos", fonte: "TSE e IBGE" },
      { id: "nordeste", indice: "Nordeste e Sul", tema: "Território · presidente, 1994 a 2026",
        tit: "O PT ganhou o Nordeste e perdeu o Sul",
        sub: `Desde 2006, o PT fica em 1º em ${pct(Math.floor(neMin), 0)} ou mais das cidades do Nordeste; no Sul, caiu de ${pct(sul02, 0)} (2002) para ${pct(sulU, 0)} (${anoU}).`,
        legenda: leg([["#16181d", "Nordeste"], ["#4f6fb3", "Sul"], ["#c9ccd1", "Norte, Centro-Oeste e Sudeste"]]),
        grafico: linhas({ anos: anosR, series: serReg, vazios: [1994, 1998], rot: "Cidades em que o PT ficou em 1º para presidente, por região" }),
        como: "Mais votado no turno que decidiu a eleição em cada cidade (TSE). Em 1994 o Brasil tinha menos municípios; cada ano é contado sobre as cidades que existiam naquela eleição.",
        link: "#/mapa/e/PRES1994", linkTxt: "Ver no mapa, de 1994 a 2026", fonte: "TSE" },
      { id: "um-lado", indice: "Cidades de um lado só", tema: "Polarização · 2º turno para presidente, 2002 a 2022",
        tit: "O país se divide ao meio, mas cada cidade escolhe um lado",
        sub: `Em ${u22.ano}, Lula venceu no país por ${String(u22.margem_brasil).replace(".", ",")} ponto; em ${V.int(u22.acima70)} cidades, o vencedor teve mais de 70% dos votos.`,
        grafico: barras(linhasUL, { max: 60, cor: "#16181d" }),
        como: "Parte das cidades em que o candidato mais votado no 2º turno para presidente teve 70% ou mais dos votos válidos da cidade (TSE). A vantagem no país é a diferença entre os dois candidatos, em pontos percentuais, no total do Brasil. Só anos com 2º turno; a barra vai até 60%.",
        link: "#/mapa/e/PRES2022", linkTxt: "Ver o 2º turno de 2022 no mapa", fonte: "TSE" },
      { id: "dividido", indice: "Voto dividido", tema: "Presidente e senador na mesma urna",
        tit: `Em ${pct((100 * g22.ed) / d22.n, 0)} das cidades, o eleitor deu presidente à esquerda e senador à direita`,
        sub: `Foi em 2022, em ${V.int(g22.ed)} cidades: no mesmo dia e na mesma urna.`,
        legenda: leg(PARTES.map(([, cor, t]) => [cor, t])),
        grafico: barras(linhasVD, { max: 100 }),
        como: "Lado de cada candidato pela régua pelo voto na Câmara (esquerda abaixo de −0,25, direita acima de +0,25); partidos sem bancada usam a nota de Harvard. Mais votado em cada cidade no 1º turno para senador e no turno final para presidente (TSE). O número à direita é o de cidades com esquerda para presidente e direita para senador.",
        link: "#/mapa/e/SEN2022", linkTxt: "Ver o mapa de senador 2022", fonte: "TSE e Câmara dos Deputados" },
      { id: "prefeitos", indice: "Prefeitos trocam de partido", tema: "Prefeitos · 2000 a 2024",
        tit: `${pct((100 * p24.trocaram) / p24.reeleitos, 0)} dos prefeitos reeleitos em 2024 tinham trocado de partido`,
        sub: `A sigla muda e o prefeito fica: foram ${V.int(p24.trocaram)} dos ${V.int(p24.reeleitos)} reeleitos.`,
        grafico: barras(linhasPF, { max: 60, cor: "#16181d" }),
        como: "Reeleito: mesmo nome na urna, na mesma cidade, eleito nas duas eleições (TSE). Quem mudou de nome na urna fica de fora, então os reeleitos são pelo menos esses. Fusões não contam como troca (PFL, DEM e PSL viraram União; PTB e Patriota, PRD; PMDB voltou a ser MDB; e outras). A reeleição para prefeito existe desde a eleição de 2000. A barra vai até 60%.",
        link: "#/mapa/e/PREF2024", linkTxt: "Ver os prefeitos de 2024 no mapa", fonte: "TSE" },
      { id: "falta", indice: "Tamanho da cidade", tema: "Quem falta · prefeito 2024",
        tit: `Cidade grande falta mais: ${pct(FT[4].falta, 0)} dos eleitores, contra ${pct(FT[0].falta, 0)} na cidade pequena`,
        sub: "Parte dos eleitores que não foi votar no 1º turno para prefeito em 2024, pelo tamanho da cidade.",
        grafico: barras(FT.map((f) => ({ rot: f.rot + " eleitores", sub: V.int(f.cidades) + " cidades", v: f.falta })), { cor: "#9c5d16" }),
        como: "Abstenções divididas pelos eleitores aptos de cada grupo de cidades, 1º turno de 2024 (TSE). Uma parte da abstenção é de quem mudou de cidade e não transferiu o título.",
        link: "#/mapa/v/abst", linkTxt: "Ver no mapa de quem faltou", fonte: "TSE" },
      { id: "falta-renda", indice: "Renda e falta", tema: "Quem falta · presidente 2022",
        tit: `Nas cidades mais pobres falta mais gente: ${pct(FR[0], 0)}, contra ${pct(FR[4], 0)} nas mais ricas`,
        sub: "Parte dos eleitores que não foi votar para presidente em 2022, pelos cinco grupos de riqueza da cidade.",
        grafico: barras(FR.map((v, i) => ({ rot: QNOME[i], v })), { cor: "#9c5d16" }),
        como: "Abstenções do 1º turno de 2022 divididas pelos eleitores aptos, por grupo de PIB por habitante (TSE e IBGE).",
        link: "#/mapa/e/PRES2022/v/abst", linkTxt: "Ver no mapa de quem faltou em 2022", fonte: "TSE e IBGE" },
      { id: "branco-nulo", indice: "Desde 1994", tema: "Protesto e ausência · 1994 a 2026",
        tit: "Quase ninguém anula mais o voto, mas cada vez mais gente falta",
        sub: `Para presidente, o branco e o nulo foram de ${pct(p0.bn, 0)} (${p0.a}) para ${pct(pN.bn, 0)} (${pN.a}); a falta, de ${pct(p0.falta, 0)} para ${pct(pN.falta, 0)}.`,
        legenda: leg([["#9c5d16", "Faltaram"], ["#3b2766", "Branco ou nulo"]]),
        grafico: linhas({ anos: sP.map((d) => d.a), series: [{ nome: "Faltaram", cor: "#9c5d16", grossa: true, v: sP.map((d) => d.falta) }, { nome: "Branco ou nulo", cor: "#3b2766", grossa: true, v: sP.map((d) => d.bn) }], max: 30, rot: "Falta e voto branco ou nulo para presidente, 1º turno" }),
        como: "Soma de todas as cidades do Brasil, 1º turno para presidente (TSE, detalhe da votação por município e zona). Branco e nulo sobre quem foi votar; falta sobre os eleitores aptos. Até 1998 o voto era em cédula de papel em boa parte do país, e cédula mal preenchida virava voto nulo.",
        link: "#/mapa/v/bn", linkTxt: "Ver no mapa de branco e nulo", fonte: "TSE" },
    ];

    const tabs = TABS; TABS = null;
    document.title = "O que o voto revela · Voto a voto";
    main.innerHTML = `<div class="pagina revela">
      <header class="revela__topo"><h1 class="titulo-grande">O que o voto revela</h1>
        <p class="lead">Oito achados de trinta anos de eleições, de 1994 a 2026, nas 5.570 cidades. Cada título já é a resposta; o gráfico mostra de onde ela vem.</p>
      </header>
      <nav aria-label="Os oito achados"><ol class="capitulos revela__indice">${blocos.map((b, i) => `<li><a href="#/revela" data-alvo="${b.id}"><span class="capitulos__n">${i + 1}</span><span><b>${b.indice}</b><small>${b.tema}</small></span></a></li>`).join("")}</ol></nav>
      ${blocos.map(bloco).join("")}
      <section aria-labelledby="rev-prox" class="revela__fim"><h2 class="secao__titulo" id="rev-prox">Para continuar</h2>
        <ul class="proximos">
          <li><a href="#/perguntas"><b>As 16 perguntas do trabalho</b><span>Cada tema do enunciado com a resposta, os gráficos e a fonte</span></a></li>
          <li><a href="#/mapa"><b>O mapa</b><span>Quem venceu em cada cidade, em qualquer cargo e ano desde 1994</span></a></li>
          <li><a href="#/explorar"><b>Explorar</b><span>Mapa em 3D, máquina do tempo e a multidão do Ninguém</span></a></li>
        </ul></section>
    </div>`;
    main.querySelectorAll("[data-csv]").forEach((bt) => bt.addEventListener("click", () => { const b = blocos[+bt.dataset.csv]; V.baixarCSV(tabs[+bt.dataset.csv], "revela " + b.id); }));
    main.querySelectorAll("[data-alvo]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); document.getElementById(a.dataset.alvo).scrollIntoView({ behavior: "smooth", block: "start" }); }));
  });
})();
