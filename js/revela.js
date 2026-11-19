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
  V.graf = { barras, linhas, leg, nuvem };   // usados também nas perguntas do trabalho e na ficha do político

  const bloco = (b, i) => `<article class="achado" id="${b.id}">
      <h2 class="achado__titulo">${V.rCircularNumero(b.tit)}</h2>
      <p class="achado__tema">${b.tema}</p>
      <p class="achado__sub">${V.rMarcarNumero(b.sub, V.rMarca)}</p>
      ${b.legenda || ""}
      ${b.grafico}
      <details class="achado__como"><summary>Como chegamos nesse número</summary><p>${b.como}</p></details>
      <div class="achado__pe"><p>Fonte: ${b.fonte}. <a href="${b.link}">${b.linkTxt}</a></p><button type="button" class="btn pq-csv" data-csv="${i}">Baixar dados (CSV)</button></div>
    </article>`;

  async function dadosRevela() {
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
    const UL = [...A.um_lado];
    if (!UL.some((u) => u.ano === 2026)) {
      try { const [v26, r26] = await Promise.all([V.dados("br/venc/PRES2026"), V.dados("br/resumo/PRES2026")]); const ws = Object.values(v26), sc = r26.BR.t2 || r26.BR.t1, tot = sc.reduce((a, x) => a + x[1], 0);
        UL.push({ ano: 2026, cidades: ws.length, acima70: ws.filter((w) => w[3] >= 70).length, margem_brasil: Math.round((1000 * (sc[0][1] - sc[1][1])) / tot) / 10 }); } catch (e) {}
    }
    const u22 = UL[UL.length - 1], u02 = UL[0], uMax = UL.reduce((a, b) => (b.acima70 / b.cidades > a.acima70 / a.cidades ? b : a));
    const linhasUL = UL.map((u) => ({ rot: String(u.ano), sub: `diferença no país: ${String(u.margem_brasil).replace(".", ",")} ${u.margem_brasil < 2 ? "ponto" : "pontos"}`, v: (100 * u.acima70) / u.cidades, vTxt: pct((100 * u.acima70) / u.cidades, 0) }));

    // 3. voto dividido: presidente x senador na mesma cidade
    const VD = A.voto_dividido, d22 = VD[VD.length - 1], d22b = VD.find((d) => d.ano === 2022);
    const grupo = (d) => { const g = { mesmo: 0, ed: 0, de: 0, centro: 0 };
      for (const [k, n] of Object.entries(d.pares)) { const [a, b] = k.split("|"); if (a === b) g.mesmo += n; else if (a === "esquerda" && b === "direita") g.ed += n; else if (a === "direita" && b === "esquerda") g.de += n; else g.centro += n; }
      return g; };
    const g22 = grupo(d22), g22b = d22b && d22b !== d22 ? grupo(d22b) : null;
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
      { id: "um-lado", indice: "Cidades de um lado só", tema: `Polarização · 2º turno para presidente, 2002 a ${u22.ano}`,
        tit: "O país se divide ao meio, mas cada cidade escolhe um lado",
        sub: `Em ${u22.ano}, a diferença no país foi de ${String(u22.margem_brasil).replace(".", ",")} ${u22.margem_brasil < 2 ? "ponto" : "pontos"}; em ${V.int(u22.acima70)} cidades, o vencedor teve 70% ou mais dos votos.`,
        grafico: barras(linhasUL, { max: 60, cor: "#16181d" }),
        como: "Parte das cidades em que o candidato mais votado no 2º turno para presidente teve 70% ou mais dos votos válidos da cidade (TSE). A vantagem no país é a diferença entre os dois candidatos, em pontos percentuais, no total do Brasil. Só anos com 2º turno; a barra vai até 60%.",
        link: "#/mapa", linkTxt: `Ver o 2º turno de ${u22.ano} no mapa`, fonte: "TSE" },
      { id: "dividido", indice: "Voto dividido", tema: "Presidente e senador na mesma urna",
        tit: `Em ${pct((100 * g22.ed) / d22.n, 0)} das cidades, o eleitor deu presidente à esquerda e senador à direita`,
        sub: `Foi em ${d22.ano}, em ${V.int(g22.ed)} cidades: no mesmo dia e na mesma urna.${g22b ? ` Em 2022, foram ${V.int(g22b.ed)}.` : ""}`,
        legenda: leg(PARTES.map(([, cor, t]) => [cor, t])),
        grafico: barras(linhasVD, { max: 100 }),
        como: "Lado de cada candidato pela régua pelo voto na Câmara (esquerda abaixo de −0,25, direita acima de +0,25); partidos sem bancada usam a nota de Harvard. Mais votado em cada cidade no 1º turno para senador e no turno final para presidente (TSE). O número à direita é o de cidades com esquerda para presidente e direita para senador.",
        link: `#/mapa/e/SEN${d22.ano}`, linkTxt: `Ver o mapa de senador ${d22.ano}`, fonte: "TSE e Câmara dos Deputados" },
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
        tit: `Rica ou pobre, a cidade falta quase igual: de ${pct(Math.min(...FR), 0)} a ${pct(Math.max(...FR), 0)}`,
        sub: "Parte dos eleitores que não foi votar para presidente em 2022, pelos cinco grupos de riqueza da cidade. O tamanho da cidade pesa mais que a renda.",
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
    const EXTRA = {
      virada: { perg: "Cidade pobre e cidade rica votam igual?", tres: [[`${pct(r02.pt[0], 0)} → ${pct(ult.pt[0], 0)}`, `o PT nas cidades mais pobres, de 2002 para ${ult.ano}`], [`${pct(r02.pt[4], 0)} → ${pct(ult.pt[4], 0)}`, "o PT nas cidades mais ricas, no mesmo período"], [`${Math.round(ult.pt[0] - ult.pt[4])} pontos`, `de distância entre os dois grupos em ${ult.ano}`]],
        importa: "É a média das cidades, não das pessoas: numa cidade rica também há eleitor pobre. Mas o mapa do voto para presidente passou a seguir o mapa da renda, o que a ciência política chama de realinhamento eleitoral.",
        veja: [["#/perguntas/e3", "Pergunta +3", "O Bolsa Família e o voto"], ["#/perguntas/t3", "Tema 3", "Índices municipais e voto"], ["#/mapa/e/PRES2002", "Mapa", "Passe os anos de 2002 a 2026"]] },
      nordeste: { perg: "Cada região vota de um jeito?", tres: [[pct(parte(PRG[PRG.length - 1], "Nordeste"), 0), `das cidades do Nordeste com o PT em 1º em ${anoU}`], [pct(sulU, 0), `das cidades do Sul, em ${anoU}`], [pct(sul02, 0), "das cidades do Sul em 2002"]],
        importa: "Desde 2006, o voto para presidente tem endereço: o Nordeste fica com o PT eleição após eleição, e o Sul, que era do PT em 2002, mudou de lado.",
        veja: [["#/perguntas/t13", "Tema 13", "Viés político regional"], ["#/perguntas/t14", "Tema 14", "A cidade mantém o lado?"], ["#/mapa/e/PRES1994", "Mapa", "Ver de 1994 a 2026"]] },
      "um-lado": { perg: "O Brasil está dividido?", tres: [[pct((100 * u22.acima70) / u22.cidades, 0), `das cidades deram 70% ou mais a um lado em ${u22.ano}`], [`${String(u22.margem_brasil).replace(".", ",")} pontos`, `de diferença no país em ${u22.ano}`], [pct((100 * uMax.acima70) / uMax.cidades, 0), `em ${uMax.ano}, o ano com mais cidades de um lado só`]],
        importa: "O resultado apertado no país é a soma de cidades que, sozinhas, não ficam divididas: em mais de um terço delas, um lado leva 70% ou mais.",
        veja: [["#/perguntas/t14", "Tema 14", "A cidade mantém o lado?"], ["#/perguntas/e9", "Pergunta +9", "As cidades que acertam"], ["#/mapa", "Mapa", "Quem virou de 2022 para 2026"]] },
      dividido: { perg: "O eleitor vota sempre no mesmo lado?", tres: [[V.int(g22.ed), `cidades com presidente à esquerda e senador à direita em ${d22.ano}`], ...(g22b ? [[V.int(g22b.ed), "cidades em 2022"]] : []), [pct((100 * g22.mesmo) / d22.n, 0), `das cidades deram o mesmo lado aos dois em ${d22.ano}`]],
        importa: "Muita gente escolhe a pessoa, não o lado: no mesmo dia, na mesma urna, o mesmo eleitorado deu presidente à esquerda e senador à direita.",
        veja: [["#/perguntas/t13", "Tema 13", "Viés político regional"], ["#/partidos", "Partidos", "Onde fica cada partido"], [`#/mapa/e/SEN${d22.ano}`, "Mapa", `Senador ${d22.ano}`]] },
      prefeitos: { perg: "Para continuar no cargo, o prefeito troca de partido?", tres: [[pct((100 * p24.trocaram) / p24.reeleitos, 0), "dos prefeitos reeleitos em 2024 tinham trocado de partido"], [V.int(p24.trocaram), `de ${V.int(p24.reeleitos)} reeleitos`], [pct((100 * PF[0].trocaram) / PF[0].reeleitos, 0), `em ${PF[0].ano}`]],
        importa: "A sigla muda e o prefeito fica: na eleição da cidade, a pessoa pesa mais que o partido.",
        veja: [["#/perguntas/e5", "Pergunta +5", "Troca de partido"], ["#/perguntas/t10", "Tema 10", "Idade e alternância de poder"], ["#/mapa/e/PREF2024", "Mapa", "Os prefeitos de 2024"]] },
      falta: { perg: "Onde mais gente deixa de votar?", tres: [[pct(FT[4].falta, 0), `faltaram nas cidades com ${FT[4].rot} eleitores`], [pct(FT[0].falta, 0), `nas cidades com ${FT[0].rot} eleitores`], [V.int(FT[4].cidades), `cidades com ${FT[4].rot} eleitores`]],
        importa: "Parte da falta é de quem mudou de cidade e não transferiu o título, e isso acontece mais na cidade grande. Mesmo assim, a diferença é grande: o dobro.",
        veja: [["#/perguntas/t6", "Tema 6", "Votos brancos, nulos e abstenção"], ["#/", "Ninguém", "O candidato mais votado do Brasil"], ["#/mapa/v/abst", "Mapa", "Quem faltou"]] },
      "falta-renda": { perg: "O eleitor pobre vota menos?", tres: [[pct(FR[0], 1), "faltaram nas cidades mais pobres (2022)"], [pct(FR[4], 1), "nas cidades mais ricas"], [`${String(Math.round(10 * (Math.max(...FR) - Math.min(...FR))) / 10).replace(".", ",")} pontos`, "de diferença entre o grupo que mais falta e o que menos falta"]],
        importa: "Um achado também é dizer o que não acontece: a renda da cidade quase não muda quantos faltam. O que muda é o tamanho da cidade.",
        veja: [["#/revela/falta", "Achado", "Cidade grande falta mais"], ["#/perguntas/t6", "Tema 6", "Votos brancos, nulos e abstenção"], ["#/mapa/e/PRES2022/v/abst", "Mapa", "Quem faltou em 2022"]] },
      "branco-nulo": { perg: "O eleitor anula mais ou falta mais?", tres: [[`${pct(p0.bn, 0)} → ${pct(pN.bn, 0)}`, `branco e nulo para presidente, de ${p0.a} a ${pN.a}`], [`${pct(p0.falta, 0)} → ${pct(pN.falta, 0)}`, "a falta, no mesmo período"], [pct(pN.falta + ((100 - pN.falta) * pN.bn) / 100, 0), `dos eleitores não escolheram ninguém em ${pN.a}`]],
        importa: "Até 1998, o voto em papel mal preenchido virava nulo sem querer. Com a urna eletrônica, quem não quer escolher hoje simplesmente não vai.",
        veja: [["#/", "Ninguém", "O candidato mais votado do Brasil"], ["#/perguntas/t6", "Tema 6", "Votos brancos, nulos e abstenção"], ["#/mapa/v/bn", "Mapa", "Branco e nulo"]] },
    };
    return { A, blocos, tabs, EXTRA, dados: { pob: serRenda[0].v, ric: serRenda[4].v, anosP, PRG, parte, u22, p24, PF, FT, FR, sP, g22, d22, g22b } };
  }

  /* a pequena linha da capa (falta e branco/nulo) */
  function miniLinha(vs, anos, cor, ymax) {
    const W = 360, H = 120, X = (i) => 14 + (i * (W - 70)) / (vs.length - 1), Y = (v) => H - 22 - (v / ymax) * (H - 40);
    return `<svg class="rv-mini" viewBox="0 0 ${W} ${H}" role="img" aria-label="De ${pct(vs[0], 0)} em ${anos[0]} para ${pct(vs[vs.length - 1], 0)} em ${anos[anos.length - 1]}"><polyline points="${vs.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}" fill="none" stroke="${cor}" stroke-width="3"/>${vs.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="${cor}"/>`).join("")}
      <text x="${X(0)}" y="${H - 4}" class="rv-mini__e">${anos[0]}</text><text x="${X(vs.length - 1)}" y="${H - 4}" text-anchor="end" class="rv-mini__e">${anos[anos.length - 1]}</text>
      <text x="${X(0)}" y="${Y(vs[0]) - 8}" class="rv-mini__n">${pct(vs[0], 0)}</text><text x="${X(vs.length - 1) + 6}" y="${Y(vs[vs.length - 1]) + 5}" class="rv-mini__n" fill="${cor}">${pct(vs[vs.length - 1], 0)}</text></svg>`;
  }
  const duas = (r1, v1, c1, r2, v2, c2, fmt = (v) => pct(v, 0), mx) => { mx = mx || Math.max(v1, v2);
    return `<div class="rv-duas"><div><small>${r1}</small><b style="color:${c1}">${fmt(v1)}</b><i><u style="width:${Math.max(1, (100 * v1) / mx).toFixed(0)}%;background:${c1}"></u></i></div><div><small>${r2}</small><b style="color:${c2}">${fmt(v2)}</b><i><u style="width:${Math.max(1, (100 * v2) / mx).toFixed(0)}%;background:${c2}"></u></i></div></div>`; };
  const ESQ = "#B8232F", DIR = "#1D3C9E", FALTA = "#9c5d16";

  /* ---------- a capa: os 8 achados como a primeira página de um jornal ---------- */
  V.rota(/^\/revela$/, async function (main) {
    V.marcarNav("revela");
    const { blocos, dados: D } = await dadosRevela();
    const b = Object.fromEntries(blocos.map((x) => [x.id, x]));
    document.title = "O que o voto revela · Voto a voto";
    const neU = D.parte(D.PRG[D.PRG.length - 1], "Nordeste"), sulU = D.parte(D.PRG[D.PRG.length - 1], "Sul"), anoU = D.PRG[D.PRG.length - 1].ano;
    const bnS = D.sP.map((x) => x.bn), anosS = D.sP.map((x) => x.a);
    main.innerHTML = `<div class="pagina revela rv">
      <header class="rv-cab"><h1 class="titulo-grande">O que o voto revela</h1>
        <p class="rv-lead">Oito achados de trinta anos de eleições, de 1994 a 2026, nas 5.570 cidades. Cada título já é a resposta.</p>
        <nav class="rv-indice" aria-label="Os oito achados">${blocos.map((x, i) => `<a href="#/revela/${x.id}"><b>${i + 1}</b>${x.indice}</a>`).join("")}</nav></header>
      <section class="rv-capa" aria-label="Os achados">
        <article class="rv-capa__lead"><p class="rv-tag rv-tag--caneta">A manchete · ${b.virada.tema}</p>
          <h2><a href="#/revela/virada">${b.virada.tit}</a></h2>
          <p class="rv-p rv-p--g">${V.rMarcarNumero(b.virada.sub, V.rMarca)}</p>
          ${b.virada.legenda || ""}${b.virada.grafico}
          <p class="rv-nota">${V.rNota("até 2002, o PT ia melhor nas cidades ricas", -2)}</p><a class="rv-ler" href="#/revela/virada">Ler o achado completo →</a></article>
        <div class="rv-capa__lado">
          <article><p class="rv-tag" style="color:${ESQ}">Nordeste e Sul</p><h3><a href="#/revela/nordeste">O PT ficou em 1º em ${V.rCirculo(pct(neU, 0))} das cidades do Nordeste e em ${pct(sulU, 0)} das do Sul</a></h3>${duas(`Nordeste, ${anoU}`, neU, ESQ, `Sul, ${anoU}`, sulU, DIR, (v) => pct(v, 0), 100)}<a class="rv-ler" href="#/revela/nordeste">Ler →</a></article>
          <article><p class="rv-tag">Prefeitos</p><h3><a href="#/revela/prefeitos">${V.rMarcarNumero(b.prefeitos.tit, V.rMarca)}</a></h3><p class="rv-p">${V.int(D.p24.trocaram)} de ${V.int(D.p24.reeleitos)}. Em ${D.PF[0].ano}, eram ${pct((100 * D.PF[0].trocaram) / D.PF[0].reeleitos, 0)}.</p><a class="rv-ler" href="#/revela/prefeitos">Ler →</a></article>
          <article><p class="rv-tag">Voto dividido</p><h3><a href="#/revela/dividido">${V.int(D.g22.ed)} cidades deram presidente à esquerda e senador à direita em ${D.d22.ano}</a></h3><p class="rv-p">Na mesma urna, no mesmo dia.${D.g22b ? ` Em 2022, foram ${V.int(D.g22b.ed)}.` : ""}</p><a class="rv-ler" href="#/revela/dividido">Ler →</a></article>
        </div></section>
      <section class="rv-rodape" aria-label="Mais achados">
        <article><p class="rv-tag" style="color:${FALTA}">Quem falta</p><h3><a href="#/revela/falta">Cidade grande falta o dobro da pequena</a></h3><p class="rv-big" style="color:${FALTA}">${pct(D.FT[4].falta, 0)}</p><p class="rv-p">contra ${pct(D.FT[0].falta, 0)} nas cidades de ${D.FT[0].rot} eleitores (prefeito, 2024).</p></article>
        <article><p class="rv-tag">Desde 1994</p><h3><a href="#/revela/branco-nulo">Quase ninguém anula mais; cada vez mais gente falta</a></h3>${miniLinha(bnS, anosS, "#3b2766", 25)}<p class="rv-p">Branco e nulo para presidente: de ${pct(bnS[0], 0)} para ${pct(bnS[bnS.length - 1], 0)}.</p></article>
        <article><p class="rv-tag">Um lado só</p><h3><a href="#/revela/um-lado">Mais de 1 em cada 3 cidades dá 70% ou mais a um lado</a></h3><p class="rv-big">${pct((100 * D.u22.acima70) / D.u22.cidades, 0)}</p><p class="rv-p">das cidades em ${D.u22.ano} (${V.int(D.u22.acima70)}), num país em que a diferença foi de ${String(D.u22.margem_brasil).replace(".", ",")} pontos.</p></article>
        <article><p class="rv-tag">Renda e falta</p><h3><a href="#/revela/falta-renda">Rica ou pobre, a cidade falta quase igual</a></h3><p class="rv-big">${pct(Math.min(...D.FR), 0)} a ${pct(Math.max(...D.FR), 0)}</p><p class="rv-p">de quem não foi votar para presidente em 2022, das cidades mais ricas às mais pobres. O tamanho pesa mais que a renda.</p></article>
      </section>
      <section class="rv-novos-sec" aria-labelledby="rv-novos-tit"><h2 class="rv-sec__tit" id="rv-novos-tit">Seis achados novos</h2>
        <p class="rv-p rv-p--g">Mais seis coisas que o banco do trabalho mostra, cada uma com a pergunta, a resposta e por que importa.</p>
        <div class="rv-novos" id="rv-novos"><p class="vazio">Calculando…</p></div></section>
      <section aria-labelledby="rev-prox" class="revela__fim"><h2 class="secao__titulo" id="rev-prox">Para continuar</h2>
        <ul class="proximos">
          <li><a href="#/perguntas"><b>Perguntas do trabalho</b><span>As 25 perguntas contadas em 6 histórias</span></a></li>
          <li><a href="#/mapa"><b>O mapa</b><span>Quem venceu em cada cidade, em qualquer cargo e ano desde 1994</span></a></li>
          <li><a href="#/explorar"><b>Explorar</b><span>Mapa em 3D, máquina do tempo e a multidão do Ninguém</span></a></li>
        </ul></section>
    </div>`;
    novos(document.getElementById("rv-novos"));
  });

  /* ---------- a página de um achado ---------- */
  V.rota(/^\/revela\/([a-z-]+)$/, async function (main, id) {
    V.marcarNav("revela");
    const { blocos, tabs, EXTRA } = await dadosRevela();
    const i = blocos.findIndex((x) => x.id === id);
    if (i < 0) { location.replace("#/revela"); return; }
    const b = blocos[i], ex = EXTRA[id] || {}, ant = blocos[i - 1], prox = blocos[i + 1];
    document.title = `${b.indice} · O que o voto revela · Voto a voto`;
    main.innerHTML = `<div class="pagina revela rv rv-achado">
      <nav class="rv-migalha" aria-label="Achados"><a href="#/revela">O que o voto revela</a> › Achado ${i + 1} de ${blocos.length}
        <span>${ant ? `<a href="#/revela/${ant.id}">← ${ant.indice}</a>` : ""}${prox ? `<a href="#/revela/${prox.id}">${prox.indice} →</a>` : ""}</span></nav>
      <article class="achado" id="${b.id}">
        <header class="rv-achado__cab"><p class="rv-tag rv-tag--caneta">${b.tema}</p>${ex.perg ? `<p class="rv-perg">${ex.perg}</p>` : ""}
          <h1 class="achado__titulo">${V.rCircularNumero(b.tit)}</h1><p class="achado__sub">${V.rMarcarNumero(b.sub, V.rMarca)}</p></header>
        ${ex.tres ? `<section class="rv-tres" aria-label="Os números">${ex.tres.map(([n, t]) => `<div><b>${n}</b><span>${t}</span></div>`).join("")}</section>` : ""}
        <section class="rv-graf">${b.legenda || ""}${b.grafico}</section>
        ${ex.importa ? `<div class="rv-importa">${V.rPostit(`<b>O que isso quer dizer:</b> ${ex.importa}`, -1.2).replace("<aside", "<div").replace("</aside>", "</div>")}</div>` : ""}
        <details class="achado__como"><summary>Como chegamos nesse número</summary><p>${b.como}</p></details>
        <div class="achado__pe"><p>Fonte: ${b.fonte}. <a href="${b.link}">${b.linkTxt}</a></p><button type="button" class="btn pq-csv" data-csv="${i}">Baixar dados (CSV)</button></div>
      </article>
      ${ex.veja ? `<section class="rv-veja" aria-labelledby="rv-veja-tit"><h2 class="rv-sec__tit" id="rv-veja-tit">Veja também</h2><div>${ex.veja.map(([h, r, t]) => `<a href="${h}"><span>${r}</span><b>${t}</b></a>`).join("")}</div></section>` : ""}
    </div>`;
    main.querySelector("[data-csv]").addEventListener("click", () => V.baixarCSV(tabs[i], "revela " + b.id));
  });

  /* ---------- seis achados novos, calculados das consultas e das camadas do mapa ---------- */
  async function novos(el) {
    if (!el) return;
    const cards = [];
    try {
      const [{ C }, BRb, A, v22, v26, cam] = await Promise.all([V.pqCarregar(), V.baseBR(), V.dados("br/achados"), V.dados("br/venc/PRES2022"), V.dados("br/venc/PRES2026"),
        Promise.all(["bf", "superior", "lado"].map((k) => V.dados("br/lobby/" + k)))]);
      const T = (id) => (C[id] ? C[id].linhas.map((l) => Object.fromEntries(C[id].colunas.map((k, j) => [k, l[j]]))) : []);
      // 1. quem virou
      const lado = (w) => (w && w[9] ? V.faixa(w[8]) : null), dir = [], esq = [];
      for (const c of BRb.lista) { const a = lado(v22[c.ibge]), z = lado(v26[c.ibge]); if (a === "esquerda" && z === "direita") dir.push(c); else if (a === "direita" && z === "esquerda") esq.push(c); }
      const pop = (xs) => xs.reduce((t, c) => t + (c.pop || 0), 0), maior = esq.slice().sort((a, b) => (b.pop || 0) - (a.pop || 0))[0];
      cards.push(["Quem virou", "Quantas cidades mudaram de lado de 2022 para 2026?", `${V.rCirculo(V.int(dir.length))} cidades foram da esquerda para a direita. ${V.int(esq.length)} fizeram o contrário.`,
        duas("Para a direita", dir.length, DIR, "Para a esquerda", esq.length, ESQ, (v) => V.int(v)),
        maior && (maior.pop || 0) > pop(dir) ? `Entre as ${V.int(esq.length)} está ${V.esc(maior.nome)}, com ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(maior.pop / 1e6)} milhões de moradores: mais que as ${V.int(dir.length)} juntas. Contar cidades engana; contar gente, não.` : "Contar cidades não é contar gente: a cidade grande pesa mais no voto.", "#/mapa"]);
      // 2 e 5. Bolsa Família e diploma × vitória da direita para presidente (5 grupos de cidades)
      const ult = (d) => { const v = Object.values(d.v)[0], anos = Object.keys(v).sort(); return v[anos.filter((a) => v[a].filter((x) => x != null).length > 1000).pop()]; };
      const ladoP = cam[2].v.PRESIDENTE[Object.keys(cam[2].v.PRESIDENTE).sort().pop()];
      const grupos = (x) => { const ps = x.map((a, j) => [a, ladoP[j]]).filter(([a, b]) => a != null && b != null).sort((p, q) => p[0] - q[0]), q = Math.floor(ps.length / 5), d = (ys) => (100 * ys.filter((p) => p[1] > 0).length) / ys.length; return [d(ps.slice(0, q)), d(ps.slice(-q))]; };
      const [bf0, bf1] = grupos(ult(cam[0])), [su0, su1] = grupos(ult(cam[1]));
      cards.push(["Bolsa Família", "Onde há mais Bolsa Família, o voto muda?", `A direita venceu em ${V.rMarca(`${V.int(Math.round(bf1))} de cada 100`)} cidades com mais Bolsa Família, e em ${V.int(Math.round(bf0))} de cada 100 com menos.`,
        duas("Mais Bolsa Família", bf1, DIR, "Menos Bolsa Família", bf0, DIR, (v) => pct(v, 0), 100), "Bolsa Família e pobreza andam juntos: o número não diz que o programa compra voto, diz que o voto segue a renda.", "#/perguntas/e3"]);
      // 3. prefeitos que voltam
      const PF = A.prefeitos, p0 = PF[1], pU = PF[PF.length - 1], taxa = (p) => (100 * p.reeleitos) / p.cidades;
      cards.push(["Prefeitos", "O prefeito continua no cargo?", `Em ${pU.ano}, ${V.rCirculo(pct(taxa(pU), 0))} das prefeituras reelegeram o prefeito. Em ${p0.ano}, ${pct(taxa(p0), 0)}.`,
        miniLinha(PF.slice(1).map(taxa), PF.slice(1).map((p) => p.ano), "#141414", 45), `O prefeito que tenta de novo ganha cada vez mais. E ${pct((100 * pU.trocaram) / pU.reeleitos, 0)} deles trocaram de partido para isso.`, "#/perguntas/t10"]);
      // 4. jovens
      const qj = T("q7c"), aJ = Math.max(...qj.map((r) => r.nr_ano_eleicao)), j5 = qj.find((r) => r.nr_ano_eleicao === aJ && r.nr_quintil === 5) || {};
      cards.push(["Jovens", "Jovem vota em jovem?", `Onde o eleitorado é mais jovem, ${V.rMarca(pct(j5.pc_eleitorado_ate_29, 0))} dos eleitores têm até 29 anos. Entre os vereadores eleitos, ${pct(j5.pc_eleitos_ate_29, 0)}.`,
        duas("Eleitores até 29 anos", j5.pc_eleitorado_ate_29, "#8C887C", "Vereadores eleitos até 29", j5.pc_eleitos_ate_29, "#CC1259"), "O jovem vota, mas não se elege: a câmara não se parece com quem a escolhe.", "#/perguntas/t10"]);
      cards.push(["Estudo e voto", "Onde mais gente tem diploma, o voto muda?", `A direita venceu em ${V.rMarca(`${V.int(Math.round(su1))} de cada 100`)} cidades onde mais eleitores têm diploma, e em ${V.int(Math.round(su0))} onde menos têm.`,
        duas("Mais diploma", su1, DIR, "Menos diploma", su0, DIR, (v) => pct(v, 0), 100), "Estudo, renda e Bolsa Família contam a mesma história: o Brasil se divide pelo desenvolvimento.", "#/perguntas/t3"]);
      // 6. o voto no partido
      const q5 = T("q5").filter((r) => r.ds_cargo === "DEPUTADO FEDERAL").sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao), t7 = T("t7a").filter((r) => r.cd_cargo === 6).sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao).pop() || {};
      cards.push(["O voto no partido", "Ainda se vota no número do partido?", `Para deputado federal, o voto só no partido caiu de ${pct(q5[0].pc_legenda, 1)} (${q5[0].nr_ano_eleicao}) para ${V.rCirculo(pct(q5[q5.length - 1].pc_legenda, 1))} (${q5[q5.length - 1].nr_ano_eleicao}).`,
        miniLinha(q5.map((r) => r.pc_legenda), q5.map((r) => r.nr_ano_eleicao), "#141414", 12), `O eleitor vota na pessoa, não no partido. E quase nenhum deputado se elege só com os próprios votos: ${pct(t7.pc_com_votos_proprios, 1)} em ${t7.nr_ano_eleicao}.`, "#/perguntas/t7"]);
    } catch (e) { console.warn("revela: achados novos não carregaram", e); }
    if (!el.isConnected) return;
    el.innerHTML = cards.length ? cards.map(([t, q, a, viz, imp, h]) => `<article class="rv-novo"><p class="rv-tag rv-tag--caneta">${t}</p><p class="rv-novo__q">${q}</p><h3>${a}</h3>${viz}
      <p class="rv-novo__imp"><b>Por que importa:</b> ${imp}</p><a class="rv-ler" href="${h}">Ver os dados →</a></article>`).join("") : '<p class="vazio">Os achados novos não carregaram.</p>';
  }
})();

