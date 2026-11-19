/* Voto a voto — a resposta de cada pergunta desenhada com a forma que o dado pede (mockups "Respostas" do canvas).
   Cada tela lê as tabelas das consultas (V.pqCarregar → C) e devolve três números diferentes e as seções visuais.
   Nada aqui é número escrito à mão: tudo sai das consultas do banco.
   Partes: utilidades e gráficos · Dinheiro · Perfil (este arquivo) · Território, Voto, Partidos (respostas2.js). */
(function () {
  "use strict";
  const V = window.V;
  const TINTA = "#141414", CANETA = "#CC1259", MARCA = "#FFE14D", ESQ = "#B8232F", DIR = "#1D3C9E", OURO = "#E0B92E", CEN = "#B8B1A2", CINZA = "#8C887C", CINZA2 = "#55524a";

  /* ---------- números ---------- */
  const fmts = {};
  const N = (v, d = 0) => (fmts[d] || (fmts[d] = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }))).format(v);
  const P = (v, d = 0) => N(v, d) + "%";
  const R$ = (v) => (v >= 1e9 ? `R$ ${N(v / 1e9, 1)} bilhão`.replace(/(\d+,\d) bilhão/, (m, n) => (parseFloat(n.replace(",", ".")) >= 2 ? n + " bilhões" : n + " bilhão"))
    : v >= 1e6 ? `R$ ${N(v / 1e6, 1)} ${v >= 2e6 ? "milhões" : "milhão"}` : v >= 1e3 ? `R$ ${N(v / 1e3)} mil` : `R$ ${N(v, 2)}`);
  const Rc = (v) => (v >= 1e6 ? `R$ ${N(v / 1e6, 1)} mi` : v >= 1e3 ? `R$ ${N(v / 1e3)} mil` : `R$ ${N(v, 2)}`);

  /* ---------- tabelas ---------- */
  const tab = (C) => {
    const cache = {};
    const T = (id) => cache[id] || (cache[id] = C[id] ? C[id].linhas.map((l) => Object.fromEntries(C[id].colunas.map((k, i) => [k, l[i]]))) : []);
    return { T, F: (id, f) => T(id).find(f) || {}, W: (id, f) => T(id).filter(f) };
  };

  /* ---------- marcas da caneta ---------- */
  const circ = (t) => V.rCirculo(t), mk = (t) => V.rMarca(t), sub = (t) => V.rSublinha(t);
  const nota = (t, giro = -2, tinta = false) => `<p class="rp-nota">${V.rNota(t, giro, tinta ? "rb-nota--tinta" : "")}</p>`;
  const esc = (s) => V.esc(String(s));

  /* ---------- peças de página ---------- */
  // todo gráfico tem nome para o leitor de tela (o texto da seção, logo acima, diz o que ele mostra)
  const svg = (w, h, g, max = "100%", rot = "Gráfico da resposta; os números estão no texto acima") => `<svg class="rp-svg" viewBox="0 0 ${w} ${h}" style="max-width:${max}" role="img" aria-label="${esc(rot)}">${g}</svg>`;
  const secao = (h2, a, corpo, como = "") => `<section class="rp-sec"><h2>${h2}</h2>${a ? `<p class="rp-a">${a}</p>` : ""}${corpo}${como ? `<p class="rp-como">${como}</p>` : ""}</section>`;
  const duas = (a, b, cols = "") => `<section class="rp-sec"><div class="rp-duas"${cols ? ` style="grid-template-columns:${cols}"` : ""}>${a}${b}</div></section>`;
  const bloco = (h3, txt, corpo, extra = "") => `<div class="rp-bloco"><h3>${h3}</h3>${txt ? `<p>${txt}</p>` : ""}${corpo}${extra}</div>`;
  const fatos = (xs) => `<div class="rp-fatos">${xs.map(([b, s]) => `<div><b>${b}</b><p>${s}</p></div>`).join("")}</div>`;
  const leg = (xs) => `<p class="rp-leg">${xs.map(([c, t, borda]) => `<span><i style="background:${c}${borda ? ";box-shadow:inset 0 0 0 1.5px " + TINTA : ""}"></i>${t}</span>`).join("")}</p>`;
  const bolinhas = (k, n = 100, cor = TINTA, tam = 13) => `<div class="rp-bolinhas" style="--t:${tam}px" role="img" aria-label="${k} de ${n}">${Array.from({ length: n }, (_, j) => `<span${j < k ? ` style="background:${cor};box-shadow:none"` : ""}></span>`).join("")}</div>`;
  const eixoY = (x0, x1, Y, vals, f = (v) => v + "%") => vals.map((v) => `<line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}" class="rp-grade"/><text x="${x0 - 10}" y="${Y(v) + 5}" text-anchor="end" class="rp-eixo">${f(v)}</text>`).join("");
  const linha = (pts, cor, w = 3) => `<polyline points="${pts.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${cor}" stroke-width="${w}"/>` + pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${w + 1.5}" fill="${cor}"/>`).join("");
  const mao = (x, y, t, cor = CANETA, extra = "") => `<text x="${x}" y="${y}" class="rp-mao" fill="${cor}"${extra}>${t}</text>`;
  // rótulos no fim das linhas sem cair um em cima do outro
  const semEncostar = (ys, gap = 17) => { const ord = ys.map((y, i) => [y, i]).sort((a, b) => a[0] - b[0]), out = []; let ult = -1e9; for (const [y, i] of ord) { const v = Math.max(y, ult + gap); out[i] = v; ult = v; } return out; };
  // halteres (derrotado × eleito) em régua que multiplica por 10
  function halteres(linhas, v0, v1, w = 1060, corLinha = TINTA) {
    const sx = (v) => 230 + (Math.log10(v) - v0) / (v1 - v0) * (w - 380);
    let g = "";
    for (let e = Math.ceil(v0); e <= Math.floor(v1); e++) g += `<line x1="${sx(10 ** e)}" x2="${sx(10 ** e)}" y1="0" y2="${linhas.length * 54}" class="rp-grade"/><text x="${sx(10 ** e)}" y="${linhas.length * 54 + 20}" text-anchor="middle" class="rp-eixo">${Rc(10 ** e).replace(",0", "")}</text>`;
    linhas.forEach(([n, d, e], i) => {
      const y = 26 + i * 54;
      g += `<text x="0" y="${y + 6}" class="rp-rot">${n}</text><line x1="${sx(d)}" x2="${sx(e)}" y1="${y}" y2="${y}" stroke="${corLinha}" stroke-width="${corLinha === OURO ? 8 : 3}"/>`;
      g += `<circle cx="${sx(d)}" cy="${y}" r="9" fill="#F6F5F1" stroke="${TINTA}" stroke-width="2.5"/><circle cx="${sx(e)}" cy="${y}" r="10" fill="${TINTA}"/>`;
      g += `<text x="${sx(d) - 14}" y="${y + 5}" text-anchor="end" class="rp-eixo">${Rc(d)}</text><text x="${sx(e) + 16}" y="${y + 6}" class="rp-n" font-size="17">${Rc(e)}</text>`;
    });
    const yl = linhas.length * 54 + 48;
    g += `<circle cx="240" cy="${yl}" r="8" fill="#F6F5F1" stroke="${TINTA}" stroke-width="2.5"/><text x="254" y="${yl + 5}" class="rp-eixo">derrotado típico</text><circle cx="400" cy="${yl}" r="9" fill="${TINTA}"/><text x="414" y="${yl + 5}" class="rp-eixo">eleito típico</text>`;
    return { g, sx, h: yl + 20 };
  }
  // tabela de calor
  function calor(cols, linhas, maxv, destaque = () => false, f = (v) => P(v)) {
    const cor = (v) => { const t = Math.min(1, v / maxv); return [`rgb(${Math.round(255 - 235 * t)},${Math.round(250 - 230 * t)},${Math.round(235 - 215 * t)})`, t > 0.55 ? "#FFFFFF" : TINTA]; };
    return `<div class="rp-rola"><table class="rp-calor"><thead><tr><th scope="col"><span class="visualmente-oculto">Grupo</span></th>${cols.map((c) => `<th scope="col">${c}</th>`).join("")}</tr></thead><tbody>${linhas.map(([n, vs], i) => `<tr><th scope="row">${n}</th>${vs.map((v, j) => { const [bg, fg] = cor(v || 0); return `<td style="background:${bg};color:${fg}">${v == null ? "—" : destaque(i, j) ? circ(f(v)) : f(v)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  // colunas pequenas lado a lado (pares)
  const pares = (xs, esc2, c1 = CANETA, c2 = CINZA, h = 200) => `<div class="rp-pares">${xs.map(([a, v1, v2]) => `<div><div class="rp-pares__c" style="height:${h}px"><i style="height:${v1 * esc2}px;background:${c1}"></i><i style="height:${v2 * esc2}px;background:${c2}"></i></div><span>${P(v1, v1 < 10 ? 1 : 0)} · ${P(v2, v2 < 10 ? 1 : 0)}</span><b>${a}</b></div>`).join("")}</div>`;
  // barras horizontais simples
  const barrasH = (xs, max, f = (v) => P(v, 0), wRot = 140) => `<div class="rp-barras">${xs.map(([n, v, c]) => `<div style="grid-template-columns:${wRot}px 1fr 74px"><b>${n}</b><i style="width:${Math.max(0.6, (100 * v) / max).toFixed(1)}%;background:${c || CINZA}"></i><b class="rp-num">${f(v)}</b></div>`).join("")}</div>`;
  const cargoNome = { VEREADOR: "Vereador", PREFEITO: "Prefeito", "DEPUTADO ESTADUAL": "Dep. estadual", "DEPUTADO FEDERAL": "Dep. federal", SENADOR: "Senador", GOVERNADOR: "Governador", PRESIDENTE: "Presidente" };
  const titulo = (s) => String(s).toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (m) => m.toLowerCase());

  const TELAS = {};
  V.rp = { N, P, R$, Rc, tab, circ, mk, sub, nota, esc, svg, secao, duas, bloco, fatos, leg, bolinhas, eixoY, linha, mao, semEncostar, halteres, calor, pares, barrasH, cargoNome, titulo, TELAS,
    cores: { TINTA, CANETA, MARCA, ESQ, DIR, OURO, CEN, CINZA, CINZA2 } };

  /* ================================================================ DINHEIRO */
  const NOMES_DESP = { "Publicidade por materiais impressos": "Material impresso", "Atividades de militância e mobilização de rua": "Militância e cabos eleitorais", "Serviços prestados por terceiros": "Serviços de terceiros",
    "Despesas com pessoal": "Pessoal da campanha", "Serviços advocatícios": "Advogados", "Publicidade por adesivos": "Adesivos", "Produção de programas de rádio, televisão ou vídeo": "Rádio, TV e vídeo",
    "Despesa com Impulsionamento de Conteúdos": "Impulsionamento na internet", "Serviços contábeis": "Contador", "Diversas a especificar": "Diversas", "Cessão ou locação de veículos": "Aluguel de carros",
    "Combustíveis e lubrificantes": "Combustível", "Doações financeiras a outros candidatos/partidos": "Repasse a outros candidatos", "Despesas com transporte ou deslocamento": "Transporte" };
  const ACENTO = { militancia: "militância", mobilizacao: "mobilização", divulgacao: "divulgação", impressao: "impressão", confeccao: "confecção", producao: "produção", couche: "couchê", locacao: "locação", distribuicao: "distribuição", veiculo: "veículo", eletronico: "eletrônico", combustivel: "combustível", cabo: "cabo (eleitoral)" };

  TELAS.e1 = (C) => {
    const { T, W } = tab(C);
    const anos = [...new Set(T("q11").map((r) => r.nr_ano_eleicao))].sort();
    const ult = anos[anos.length - 1], doAno = W("q11", (r) => r.nr_ano_eleicao === ult).sort((a, b) => b.pc_ano - a.pc_ano);
    const papel = doAno[0], total = (papel.vr_total * 100) / papel.pc_ano;
    const achaPc = (a, nome) => (T("q11").find((r) => r.nr_ano_eleicao === a && r.ds_origem_despesa === nome) || {}).pc_ano;
    const imp = doAno.find((r) => /Impulsionamento/.test(r.ds_origem_despesa)) || { pc_ano: 0 };
    const adesivo = doAno.find((r) => /adesivos/.test(r.ds_origem_despesa)) || { pc_ano: 0 };
    const gente = doAno.filter((r) => /militância|pessoal|terceiros/i.test(r.ds_origem_despesa)).reduce((s, r) => s + r.pc_ano, 0);
    // o recibo: as 12 maiores despesas e o resto
    const linhas = doAno.slice(0, 12), resto = 100 - linhas.reduce((s, r) => s + r.pc_ano, 0);
    const itens = [...linhas.map((r) => [NOMES_DESP[r.ds_origem_despesa] || r.ds_origem_despesa, r.pc_ano]), ["Outras despesas", resto]].map(([n, v], i) =>
      `<div class="rp-recibo__l"><span>${/Impulsionamento/.test(n) ? mk(n) : n}</span><i></i><b>${i === 0 ? circ("R$ " + N(v, 2)) : "R$ " + N(v, 2)}</b></div>`).join("");
    const recibo = `<div class="rp-recibo"><div class="rp-recibo__cab"><b>CAMPANHAS DE ${ult}</b><span>cada R$ 100,00 gastos pelos candidatos</span></div><div class="rp-recibo__corpo">${itens}</div>
      <div class="rp-recibo__tot"><span>TOTAL</span><span>R$ 100,00</span></div><div class="rp-recibo__pe">${R$(total)} declarados ao TSE</div></div>`;
    const lado = `<div class="rp-bloco rp-recibo__lado">${nota("o papel é o 1º da lista em toda eleição desde " + anos[0], -2)}
      <p>Somando material impresso e adesivos, <b>R$ ${N(papel.pc_ano + adesivo.pc_ano, 0)} de cada R$ 100</b> foram para a propaganda em papel e plástico. A internet ficou com <b>R$ ${N(imp.pc_ano, 2)}</b>.</p>
      ${nota("← só isso na internet", 2, true)}<p>Gente também custa caro: militância, pessoal da campanha e serviços de terceiros somam <b>R$ ${N(gente, 2)}</b>.</p></div>`;
    const s1 = secao(`O recibo de ${ult}`, "Se cada campanha tivesse gastado R$ 100, este seria o recibo.", `<div class="rp-duas">${recibo}${lado}</div>`,
      `Despesas contratadas declaradas ao TSE em ${ult}, pela categoria que o candidato escolheu. As 12 maiores; o resto está em outras despesas.`);
    // linhas no tempo
    const ser = [["Material impresso", "Publicidade por materiais impressos", TINTA, 4], ["Militância de rua", "Atividades de militância e mobilização de rua", CINZA, 2.5],
      ["Rádio, TV e vídeo", "Produção de programas de rádio, televisão ou vídeo", CINZA2, 2.5], ["Internet", "Despesa com Impulsionamento de Conteúdos", CANETA, 3.5]].map(([n, k, c, w]) => [n, anos.map((a) => achaPc(a, k) || 0), c, w]);
    const x0 = 60, x1 = 600, Y = (v) => 330 - (v / 24) * 300, X = (i) => x0 + (i * (x1 - x0)) / (anos.length - 1);
    let g = eixoY(x0, x1, Y, [0, 5, 10, 15, 20]) + anos.map((a, i) => `<text x="${X(i)}" y="356" text-anchor="middle" class="rp-n" font-size="17">${a}</text>`).join("");
    const ys = semEncostar(ser.map(([, vs]) => Y(vs[vs.length - 1]) + 6), 20);
    ser.forEach(([n, vs, c, w], k) => { g += linha(vs.map((v, i) => [X(i), Y(v)]), c, w) + `<text x="${x1 + 14}" y="${ys[k]}" class="rp-rot" fill="${c}">${n} · ${P(vs[vs.length - 1], 1)}</text>`; });
    const iv = ser[3][1];
    g += mao(X(1) - 40, Y(0.6), `a internet foi de ${P(iv[0], 0)} para ${P(iv[iv.length - 1], 0)}… e parou`);
    const s2 = secao("Papel nunca perdeu o 1º lugar", `Em ${anos.length} eleições seguidas, o material impresso ficou com ${mk("cerca de 20% do gasto")}. A internet cresceu, mas segue bem atrás do papel.`, svg(900, 370, g, "980px", "Parte do gasto por tipo de despesa, eleição a eleição"));
    // calor cargo x tipo
    const cg = [["Vereador", "VEREADOR"], ["Prefeito", "PREFEITO"], ["Dep. estadual", "DEPUTADO ESTADUAL"], ["Dep. federal", "DEPUTADO FEDERAL"], ["Senador", "SENADOR"], ["Governador", "GOVERNADOR"], ["Presidente", "PRESIDENTE"]];
    const tipos = [[1, "Papel"], [4, "Rua"], [5, "Adesivo e placa"], [3, "Rádio e TV"], [2, "Internet"], [8, "Pessoal e serviços"]];
    const anoDe = (c) => Math.max(...W("q11b", (r) => r.ds_cargo === c && r.nr_ano_eleicao <= ult).map((r) => r.nr_ano_eleicao));
    const linhasC = cg.map(([n, c]) => { const a = anoDe(c); return [`${n} ${a}`, tipos.map(([t]) => (T("q11b").find((r) => r.ds_cargo === c && r.nr_ano_eleicao === a && r.nr_tipo === t) || {}).pc_cargo)]; });
    const s3 = secao("Cada cargo, um jeito de gastar", "O vereador vive de papel e de gente na rua; o presidente, de rádio, TV e internet.",
      `<div class="rp-duas" style="grid-template-columns:1fr 230px;align-items:center">${calor(tipos.map((t) => t[1]), linhasC, 30, (i, j) => (i === 0 && j === 0) || (i === 6 && j === 3))}${nota("quanto menor o cargo, mais papel; quanto maior, mais tela", -3)}</div>`,
      "Parte do gasto de cada cargo em cada tipo de despesa. Quanto mais escura a casa, maior a parte.");
    // palavras e lados
    const pv = {}; W("e1n", (r) => r.ds_cargo === "VEREADOR" && r.nr_ano_eleicao === Math.max(...W("e1n", (x) => x.ds_cargo === "VEREADOR").map((x) => x.nr_ano_eleicao))).forEach((r) => { const k = r.ds_palavra.replace(/s$/, ""); pv[k] = (pv[k] || 0) + r.qt; });
    const pal = Object.entries(pv).filter(([w]) => !/^(prestado|material|pessoal|apoio|taxa|conf|cheque)$/.test(w)).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const anoV = Math.max(...W("e1n", (x) => x.ds_cargo === "VEREADOR").map((x) => x.nr_ano_eleicao));
    const palH = `<div class="rp-palavras">${pal.map(([w, q], i) => `<div><b>${ACENTO[w] || w}</b><i style="width:${((100 * q) / pal[0][1]).toFixed(0)}%;background:${i < 3 ? TINTA : CINZA}"></i><span>${N(q)}</span></div>`).join("")}</div>`;
    const anoL = Math.max(...T("q11c").map((r) => r.nr_ano_eleicao));
    const ld = (b, t) => (T("q11c").find((r) => r.nr_ano_eleicao === anoL && r.ds_bloco === b && r.nr_tipo === t) || {}).pc_propaganda || 0;
    const lados = [["Papel", 1], ["Rua", 4], ["Rádio e TV", 3], ["Internet", 2]].map(([n, t]) => [n, ["esquerda", "centro", "direita"].map((b) => ld(b, t))]);
    const sx = (v) => 130 + (v / 40) * 360;
    let gl = [0, 10, 20, 30, 40].map((v) => `<line x1="${sx(v)}" x2="${sx(v)}" y1="10" y2="${30 + lados.length * 54}" class="rp-grade"/><text x="${sx(v)}" y="${48 + lados.length * 54}" text-anchor="middle" class="rp-eixo">${v}%</text>`).join("");
    lados.forEach(([n, vs], i) => { const y = 40 + i * 54; gl += `<text x="0" y="${y + 6}" class="rp-rot">${n}</text><line x1="${sx(Math.min(...vs))}" x2="${sx(Math.max(...vs))}" y1="${y}" y2="${y}" stroke="${TINTA}" stroke-width="2"/>` + vs.map((v, k) => `<circle cx="${sx(v)}" cy="${y}" r="9" fill="${[ESQ, CEN, DIR][k]}" stroke="${TINTA}"/>`).join(""); });
    const s4 = duas(bloco("O que está escrito nas notas do vereador", `Palavras mais repetidas na descrição das despesas, ${anoV}.`, palH, nota(`${ACENTO[pal[0][0]] || pal[0][0]} aparece ${N(pal[0][1])} vezes!`, -2)),
      bloco("Esquerda, centro e direita gastam igual no papel", `Parte da propaganda de ${anoL} em cada tipo.`, svg(520, 60 + lados.length * 54, gl) + leg([[ESQ, "esquerda"], [CEN, "centro"], [DIR, "direita"]])));
    return { tres: [[R$(papel.vr_total), `em material impresso em ${ult}, a maior despesa das campanhas`], [N(papel.qt_lancamentos / 1e6, 2).replace(/0$/, "") + " milhão", `despesas com material impresso lançadas na prestação de contas de ${ult}`],
      [`${N(papel.pc_ano / imp.pc_ano, 0)} vezes`, `mais dinheiro no papel que na internet: R$ ${N(papel.pc_ano, 2)} contra R$ ${N(imp.pc_ano, 2)}`]], html: s1 + s2 + s3 + s4 };
  };

  TELAS.t1 = (C) => {
    const { T, F, W } = tab(C);
    const cad = [["Vereador", "VEREADOR", 2024], ["Prefeito", "PREFEITO", 2024], ["Dep. estadual", "DEPUTADO ESTADUAL", 2022], ["Dep. federal", "DEPUTADO FEDERAL", 2022], ["Senador", "SENADOR", 2022], ["Governador", "GOVERNADOR", 2022], ["Presidente", "PRESIDENTE", 2022]]
      .map(([n, c, a]) => { const r = F("q1c", (x) => x.ds_cargo === c && x.nr_ano_eleicao === a); return [n, a, r.vr_custo_por_cadeira, r.qt_eleitos, r.vr_gasto_medio_candidato]; });
    const Wd = 1160, base = 470, L = (v) => (Math.log10(v) - 4) / 5;
    let g = ["10 mil", "100 mil", "1 milhão", "10 milhões", "100 milhões", "1 bilhão"].map((t, k) => { const y = base - k / 5 * 420; return `<line x1="120" x2="${Wd}" y1="${y}" y2="${y}" class="rp-grade"/><text x="110" y="${y + 5}" text-anchor="end" class="rp-eixo">R$ ${t}</text>`; }).join("");
    const cw = (Wd - 140) / cad.length;
    cad.forEach(([n, a, v, el], i) => {
      const x = 140 + i * cw + cw / 2, y = base - L(v) * 420;
      g += `<line x1="${x}" x2="${x}" y1="${base}" y2="${y + 34}" stroke="${TINTA}" stroke-width="2" stroke-dasharray="4 4"/>`;
      g += `<g transform="rotate(${-4 + (i % 3) * 3} ${x} ${y})"><path d="M${x - 72},${y + 6} L${x - 56},${y - 22} L${x + 72},${y - 22} L${x + 72},${y + 34} L${x - 56},${y + 34} Z" fill="${n === "Dep. federal" ? OURO : "#FFFFFF"}" stroke="${TINTA}" stroke-width="2"/><circle cx="${x - 52}" cy="${y + 6}" r="5" fill="#F6F5F1" stroke="${TINTA}" stroke-width="2"/><text x="${x + 10}" y="${y + 14}" text-anchor="middle" class="rp-n" font-size="21">${Rc(v)}</text></g>`;
      g += `<text x="${x}" y="${base + 26}" text-anchor="middle" class="rp-rot">${n}</text><text x="${x}" y="${base + 46}" text-anchor="middle" class="rp-eixo">${a} · ${N(el)} ${el === 1 ? "cadeira" : "cadeiras"}</text>`;
    });
    const ver = cad[0], pres = cad[6], vezes = Math.round(pres[2] / ver[2] / 100) * 100;
    g += mao(140 + 6 * cw + cw / 2 - 84, base - L(pres[2]) * 420 + 64, `= ${N(vezes)} vereadores →`, CANETA, ' text-anchor="end"');
    const s1 = secao("A vitrine das cadeiras", "Quanto mais alto o cargo, mais cara a vaga. Cada linha da régua vale 10 vezes a de baixo.", svg(Wd + 20, 540, g, "100%", "Custo de uma cadeira em cada cargo"),
      "Custo da cadeira = tudo o que os candidatos ao cargo gastaram ÷ número de eleitos. Vereador e prefeito em 2024; os outros cargos em 2022.");
    const q = W("q2", (r) => r.ds_cargo === "DEPUTADO FEDERAL" && r.nr_ano_eleicao === 2022).sort((a, b) => a.nr_quintil - b.nr_quintil);
    const nomesQ = ["20% que menos gastaram", "2º grupo", "3º grupo", "4º grupo", "20% que mais gastaram"];
    const arr = q.map((r, i) => { const p = r.pc_taxa_sucesso, k = p >= 1 ? Math.round(p) : 0, lab = p >= 1 ? P(p, 1) : p > 0 ? "menos de 1 em 100" : "nenhum eleito";
      return `<div class="rp-quintil">${bolinhas(k)}<b class="${p >= 1 ? "rp-grande" : ""}">${p >= 1 ? circ(lab) : lab}</b><span><b>${nomesQ[i]}</b><br>receita média ${Rc(r.vr_receita_media)}</span></div>`; }).join("");
    const top = q[4] || {};
    const s2 = secao("Quem gasta mais se elege mais", `Dos candidatos a deputado federal que mais gastaram, ${mk(Math.round(top.pc_taxa_sucesso) + " em cada 100")} se elegeram. Dos que menos gastaram, ${q[0] && q[0].pc_taxa_sucesso ? P(q[0].pc_taxa_sucesso, 1) : "nenhum"}.`,
      `<div class="rp-quintis">${arr}</div>`, `Candidatos a deputado federal em 2022 divididos em cinco grupos de ${N(top.qt_candidatos || 0)} pela receita. Cada bolinha é 1 em cada 100 candidatos do grupo; as pretas se elegeram.`);
    const part = W("t1a", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL" && r.qt_eleitos > 0).sort((a, b) => a.vr_gasto_por_voto - b.vr_gasto_por_voto);
    const corE = (e) => (/ESQUERDA/.test(e) ? ESQ : /DIREITA/.test(e) ? DIR : CEN);
    const mxv = Math.ceil(Math.max(...part.map((r) => r.vr_gasto_por_voto)) / 10) * 10, sx = (v) => 170 + (v / mxv) * 560;
    let gp = Array.from({ length: mxv / 10 + 1 }, (_, k) => k * 10).map((v) => `<line x1="${sx(v)}" x2="${sx(v)}" y1="0" y2="${part.length * 30 + 6}" class="rp-grade"/><text x="${sx(v)}" y="${part.length * 30 + 26}" text-anchor="middle" class="rp-eixo">R$ ${v}</text>`).join("");
    part.forEach((r, i) => { const y = 16 + i * 30, rr = 5 + Math.sqrt(r.qt_eleitos);
      gp += `<text x="160" y="${y + 5}" text-anchor="end" class="rp-rot" font-size="15">${esc(r.sg_partido)}</text><line x1="${sx(0)}" x2="${sx(r.vr_gasto_por_voto)}" y1="${y}" y2="${y}" stroke="#C9C5B9" stroke-width="2"/><circle cx="${sx(r.vr_gasto_por_voto)}" cy="${y}" r="${rr}" fill="${corE(r.ds_espectro)}" stroke="${TINTA}" fill-opacity=".9"/><text x="${sx(r.vr_gasto_por_voto) + 8 + rr}" y="${y + 5}" class="rp-n" font-size="14">R$ ${N(r.vr_gasto_por_voto, 2)}</text>`; });
    const ba = part[0] || {}, ca = part[part.length - 1] || {};
    gp += mao(sx(ba.vr_gasto_por_voto) + 130, 22, `← ${esc(ba.sg_partido)}: ${ba.qt_eleitos} eleitos com o voto mais barato`) + mao(sx(ca.vr_gasto_por_voto) + 110, 16 + (part.length - 1) * 30 + 6, "← o mais caro");
    const t1b = F("t1b", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL" && r.ds_bloco === "todos");
    const esc1 = (g2) => F("t1c", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL" && r.ds_grau_instrucao === g2);
    const sup = esc1("SUPERIOR COMPLETO"), med = esc1("ENSINO MÉDIO COMPLETO");
    const dip = bloco("Diploma também pesa", "Candidato a deputado federal, 2022.", `<div class="rp-barras">
        <div style="grid-template-columns:150px 1fr 0"><b>Superior completo</b><i style="width:100%;background:${TINTA}"></i><span></span></div><p class="rp-sub">gasto médio ${Rc(sup.vr_gasto_medio)} · ${mk(P(sup.pc_taxa_sucesso, 1) + " se elegeram")}</p>
        <div style="grid-template-columns:150px 1fr 0"><b>Ensino médio</b><i style="width:${((100 * med.vr_gasto_medio) / sup.vr_gasto_medio).toFixed(0)}%;background:${CINZA}"></i><span></span></div><p class="rp-sub">gasto médio ${Rc(med.vr_gasto_medio)} · ${P(med.pc_taxa_sucesso, 1)} se elegeram</p></div>`,
      nota(`${N(sup.vr_gasto_medio / med.vr_gasto_medio, 1)} vezes mais dinheiro`, -2));
    const s3 = secao("Quanto custou cada voto, partido por partido", `Para deputado federal em 2022, um voto do ${esc(ca.sg_partido)} custou ${mk(N(ca.vr_gasto_por_voto / ba.vr_gasto_por_voto, 0) + " vezes")} o de um voto do ${esc(ba.sg_partido)}.`,
      `<div class="rp-duas" style="grid-template-columns:1.6fr 1fr"><div>${svg(1010, part.length * 30 + 40, gp)}<p class="rp-como">Gasto dos candidatos do partido ÷ votos recebidos. Só partidos que elegeram alguém; o tamanho da bolinha é o número de eleitos.</p></div>${dip}</div>`);
    return { tres: [[Rc(ver[4]).replace(" mil", " mil"), `gasto médio de um candidato a vereador em ${ver[1]}`], [`${N(vezes)} vereadores`, `é o preço de uma Presidência: ${R$(pres[2])} contra ${Rc(ver[2])}`],
      [`${N(t1b.vr_por_voto_nao_eleito_mediano / t1b.vr_por_voto_eleito_mediano, 1)} vezes`, `quem perdeu pagou mais por voto: R$ ${N(t1b.vr_por_voto_nao_eleito_mediano, 2)} contra R$ ${N(t1b.vr_por_voto_eleito_mediano, 2)} do eleito (deputado federal, 2022)`]],
      html: s1 + s2 + s3 };
  };

  TELAS.t2 = (C) => {
    const { F, W } = tab(C);
    const fx = W("q2b", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL").sort((a, b) => a.nr_faixa - b.nr_faixa);
    const curto = (s) => s.replace("nenhum bem declarado", "Nenhum bem").replace("até ", "Até ").replace("mais de", "Mais de").replace(/milhões?/, "mi");
    const arr = fx.map((r, i) => { const p = r.pc_taxa_sucesso, v = P(p, 1);
      return `<div class="rp-quintil"><b style="font-size:${26 + i * 4}px">${i === fx.length - 1 ? circ(v) : i === 0 ? sub(v) : v}</b>${bolinhas(Math.round(p), 100, TINTA, 14)}<span><b>${curto(r.ds_faixa)}</b><br>${N(r.qt_candidatos)} candidatos · ${N(r.qt_eleitos)} eleitos</span></div>`; }).join("");
    const sem = fx[0] || {}, rico = fx[fx.length - 1] || {}, umEm = Math.round(sem.qt_candidatos / Math.max(1, sem.qt_eleitos));
    const s1 = secao("A escada da chance", `A cada degrau de patrimônio, a chance de virar deputado federal sobe. Sem nenhum bem, ${mk("1 em cada " + N(umEm))} se elegeu.`,
      `<div class="rp-quintis" style="grid-template-columns:repeat(${fx.length},minmax(0,1fr))">${arr}</div>${nota(`${Math.round(rico.pc_taxa_sucesso)} em cada 100 dos mais ricos!`, -2)}`,
      "Candidatos a deputado federal em 2022 pelos bens declarados ao TSE. Cada bolinha é 1 em cada 100 candidatos da faixa; as pretas se elegeram.");
    const par = (c, a) => [F("q2c", (r) => r.nr_ano_eleicao === a && r.ds_cargo === c && r.ds_resultado === "não eleito"), F("q2c", (r) => r.nr_ano_eleicao === a && r.ds_cargo === c && r.ds_resultado === "eleito")];
    const car = [["VEREADOR", 2024], ["PREFEITO", 2024], ["DEPUTADO ESTADUAL", 2022], ["DEPUTADO FEDERAL", 2022], ["SENADOR", 2022], ["GOVERNADOR", 2022], ["PRESIDENTE", 2022]]
      .map(([c, a]) => { const [d, e] = par(c, a); return [`${cargoNome[c]} ${a}`, d.vr_patrimonio_mediano, e.vr_patrimonio_mediano]; }).filter((x) => x[1] > 0 && x[2] > 0);
    const H = halteres(car, 3.8, 7.2), de = car.find((x) => /estadual/.test(x[0]));
    let g = H.g; if (de) g += mao(H.sx(de[2]) + 130, 26 + car.indexOf(de) * 54 + 10, `${N(de[2] / de[1], 0)} vezes mais rico!`);
    const s2 = secao("O eleito é mais rico que o derrotado, em todo cargo", de ? `Metade dos deputados estaduais eleitos em 2022 declarou mais de ${mk(Rc(de[2]))}; metade dos derrotados, menos de ${Rc(de[1])}.` : "",
      svg(1060, H.h, g), "Patrimônio mediano declarado ao TSE: metade tem mais, metade tem menos. A régua multiplica por 10 a cada linha.");
    const pf = W("q2b", (r) => r.nr_ano_eleicao === 2024 && r.ds_cargo === "PREFEITO").sort((a, b) => a.nr_faixa - b.nr_faixa).map((r) => r.pc_taxa_sucesso), df = fx.map((r) => r.pc_taxa_sucesso);
    const X = (i) => 70 + i * 100, Y = (v) => 300 - (v / 50) * 270;
    let gl = eixoY(70, 570, Y, [0, 10, 20, 30, 40, 50]) + ["nenhum", "até 100 mil", "100–500 mil", "500 mil–1 mi", "1–5 mi", "+5 mi"].map((l, i) => `<text x="${X(i)}" y="324" text-anchor="middle" class="rp-eixo">${l}</text>`).join("");
    [[pf, TINTA, "Prefeito 2024"], [df, CANETA, "Dep. federal 2022"]].forEach(([vs, c, n]) => { gl += linha(vs.map((v, i) => [X(i), Y(v)]), c, 3.5) + `<text x="${X(vs.length - 1) + 12}" y="${Y(vs[vs.length - 1]) + 5}" class="rp-rot" fill="${c}">${n}</text>`; });
    const el = F("q2c", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL" && r.ds_resultado === "eleito"), nel = F("q2c", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL" && r.ds_resultado === "não eleito");
    const [vd, ve] = par("VEREADOR", 2024);
    const s3 = duas(bloco("Para prefeito, o dinheiro pesa menos", `Mesmo sem nenhum bem, ${P(pf[0], 0)} dos candidatos a prefeito venceram em 2024. Para deputado federal, quase ninguém.`, svg(720, 340, gl)),
      `<div class="rp-bloco">${fatos([[circ(P(el.pc_milionarios, 0)), `dos deputados federais eleitos em 2022 declararam R$ 1 milhão ou mais; dos derrotados, ${P(nel.pc_milionarios, 0)}`],
        [`${N(ve.vr_patrimonio_mediano / vd.vr_patrimonio_mediano, 0)} vezes`, `o patrimônio do vereador eleito típico (${Rc(ve.vr_patrimonio_mediano)}) sobre o derrotado (${Rc(vd.vr_patrimonio_mediano)})`]])}${nota("bens declarados pelo próprio candidato", 2, true)}</div>`);
    const pf5 = W("q2b", (r) => r.nr_ano_eleicao === 2024 && r.ds_cargo === "PREFEITO").sort((a, b) => b.nr_faixa - a.nr_faixa)[0] || {};
    return { tres: [[Rc(el.vr_patrimonio_mediano), `patrimônio do deputado federal eleito típico em 2022; o derrotado, ${Rc(nel.vr_patrimonio_mediano)}`],
      [P(pf5.pc_taxa_sucesso, 0), `dos candidatos a prefeito com ${pf5.ds_faixa || "mais bens"} venceram em 2024`], [N(sem.qt_candidatos), `candidatos a deputado federal não declararam nenhum bem em 2022; ${sem.qt_eleitos} se elegeram`]],
      html: s1 + s2 + s3 };
  };

  TELAS.t11 = (C) => {
    const { T, F, W } = tab(C);
    const a = T("t11a"), emp = a.filter((r) => r.pc_doacao_empresas != null);
    const a0 = a[0].nr_ano, a1 = a[a.length - 1].nr_ano, X = (y) => 80 + ((y - a0) / (a1 - a0)) * 1000;
    const Yt = (v) => 250 - (v / 40) * 210, Yb = (v) => 560 - (v / 22) * 220;
    let g = eixoY(80, 1080, Yt, [0, 10, 20, 30, 40]);
    emp.forEach((r) => { const v = r.pc_doacao_empresas; g += `<rect x="${X(r.nr_ano) - 16}" y="${Yt(v)}" width="32" height="${250 - Yt(v)}" fill="${TINTA}"/><text x="${X(r.nr_ano)}" y="${Yt(v) - 8}" text-anchor="middle" class="${v >= 1 ? "rp-n" : "rp-eixo"}" font-size="${v >= 1 ? 18 : 13}">${P(v, 1)}</text>`; });
    g += `<text x="80" y="22" class="rp-rot">Parte das campanhas paga por empresas</text>` + eixoY(80, 1080, Yb, [0, 10, 20], (v) => v + " mi");
    g += `<polygon points="${X(a0)},${Yb(0)} ${a.map((r) => `${X(r.nr_ano)},${Yb(r.qt_beneficios / 1e6)}`).join(" ")} ${X(a1)},${Yb(0)}" fill="${OURO}" fill-opacity=".55" stroke="${TINTA}" stroke-width="2.5"/>`;
    g += `<text x="80" y="318" class="rp-rot">Benefícios do Bolsa Família em dezembro</text>` + a.filter((r) => r.nr_ano % 2 === 0).map((r) => `<text x="${X(r.nr_ano)}" y="586" text-anchor="middle" class="rp-n" font-size="16">${r.nr_ano}</text>`).join("");
    const xc = X(2015.7), mx = a.reduce((m, r) => (r.qt_beneficios > m.qt_beneficios ? r : m), a[0]);
    g += `<line x1="${xc}" x2="${xc}" y1="30" y2="570" stroke="${CANETA}" stroke-width="3" stroke-dasharray="8 6"/>` + mao(xc + 12, 80, "2015: o STF proíbe") + mao(xc + 12, 108, "doação de empresas") + mao(X(mx.nr_ano) - 10, Yb(mx.qt_beneficios / 1e6) - 18, `${N(mx.qt_beneficios / 1e6, 0)} milhões`, TINTA, ' text-anchor="middle"');
    const s1 = secao("O corte de 2015", `As empresas saíram das campanhas de uma vez; o Bolsa Família seguiu e ${mk(`chegou a ${N(mx.qt_beneficios / 1e6, 0)} milhões de benefícios`)} em ${mx.nr_ano}.`, svg(1110, 600, g, "100%", "Doação de empresas e benefícios do Bolsa Família ao longo dos anos"),
      "Em cima: parte da receita dos candidatos doada por empresas, em cada eleição. Embaixo: benefícios pagos em dezembro de cada ano (em 2022, como Auxílio Brasil).");
    const qs = (ano, k) => W("t11b", (r) => r.nr_ano === ano).sort((x, y) => x.nr_quintil - y.nr_quintil).map((r) => r[k] || 0);
    const anoP = Math.max(...T("t11b").map((r) => r.nr_ano));
    const colQ = (vs, cor, rot) => `<div class="rp-colq">${vs.map((v, i) => `<div><b>${P(v, 0)}</b><i style="height:${(v / 80) * 170}px;background:${cor}"></i><span>${i === 0 ? "menos BF" : i === vs.length - 1 ? "mais BF" : ""}</span></div>`).join("")}</div><p class="rp-sub">${rot}</p>`;
    const e12 = qs(2012, "pc_doacao_empresas"), p24 = qs(anoP, "pc_dinheiro_publico");
    const s2 = secao("Igual em todo lugar", "Onde o Bolsa Família alcança mais gente, as empresas não doavam mais. E quem ocupou o lugar delas, o dinheiro público, também pesa igual.",
      `<div class="rp-duas">${bloco("2012: parte paga por empresas", "", colQ(e12, TINTA, "Cidades em 5 grupos, do menor ao maior alcance do Bolsa Família. Campanhas municipais."), nota(`de ${P(Math.min(...e12), 0)} a ${P(Math.max(...e12), 0)}: quase igual`, -2))}
        ${bloco(`${anoP}: parte paga com dinheiro público`, "", colQ(p24, OURO, `Os mesmos 5 grupos de cidades, campanhas de ${anoP}.`), nota("o dinheiro público ocupou o lugar", 2))}</div>`);
    const e14 = F("t11a", (r) => r.nr_ano === 2014), e24 = F("t11a", (r) => r.nr_ano === anoP);
    return { tres: [[R$(e14.vr_doacao_empresas), "doado por empresas às campanhas de 2014, a última eleição antes da proibição"], [R$(e24.vr_doacao_empresas), `foi o que sobrou de doação de empresas em ${anoP}`],
      [`${P(e12[0], 0)} e ${P(e12[e12.length - 1], 0)}`, "das campanhas municipais de 2012 eram pagas por empresas, nas cidades com menos e com mais Bolsa Família"]], html: s1 + s2 };
  };

  TELAS.t12 = (C) => {
    const { T, F, W } = tab(C);
    const tot = T("q8").sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao), anos = tot.map((r) => r.nr_ano_eleicao);
    const esp = [["Esquerda", "ESQUERDA", ESQ], ["Centro-esquerda", "CENTRO-ESQUERDA", "#E38A82"], ["Centro", "CENTRO", CINZA], ["Centro-direita", "CENTRO-DIREITA", "#8FA9DD"], ["Direita", "DIREITA", DIR]];
    const pre = [...new Set(T("q8b").map((r) => r.nr_ano_eleicao))].sort();
    const X = (i) => 90 + i * ((1020 - 90) / (anos.length - 1)), Y = (v) => 380 - (v / 40) * 340, ix = (a) => anos.indexOf(a);
    let g = eixoY(90, 1020, Y, [0, 10, 20, 30, 40]) + anos.map((a, i) => `<text x="${X(i)}" y="408" text-anchor="middle" class="rp-n" font-size="17">${a}</text>`).join("");
    const fim = [];
    esp.forEach(([n, k, c]) => { const vs = pre.map((a) => (F("q8b", (r) => r.nr_ano_eleicao === a && r.ds_espectro === k)).pc_pj || 0);
      g += `<polyline points="${vs.map((v, i) => `${X(ix(pre[i]))},${Y(v)}`).join(" ")} ${X(ix(pre[pre.length - 1]) + 1)},${Y(0)}" fill="none" stroke="${c}" stroke-width="3"/>` + vs.map((v, i) => `<circle cx="${X(ix(pre[i]))}" cy="${Y(v)}" r="5" fill="${c}"/>`).join("");
      fim.push([n, vs[vs.length - 1], c]); });
    const ys = semEncostar(fim.map(([, v]) => Y(v) + 5), 16);
    fim.forEach(([n, v, c], i) => { g += `<text x="${X(ix(pre[pre.length - 1])) + 10}" y="${ys[i]}" class="rp-rot rp-halo" fill="${c}" font-size="14">${n} ${P(v, 0)}</text>`; });
    const depois = tot.filter((r) => r.nr_ano_eleicao > pre[pre.length - 1]);
    g += linha(depois.map((r) => [X(ix(r.nr_ano_eleicao)), Y(r.pc_pj)]), TINTA, 3);
    const xc = X(ix(pre[pre.length - 1]) + 0.6), mxD = Math.max(...depois.filter((r) => r.nr_ano_eleicao >= 2018).map((r) => r.pc_pj));
    g += `<line x1="${xc}" x2="${xc}" y1="20" y2="390" stroke="${CANETA}" stroke-width="3" stroke-dasharray="8 6"/>` + mao(xc + 14, 60, "a proibição: todos caem a zero");
    const p14 = W("q8b", (r) => r.nr_ano_eleicao === pre[pre.length - 1] && r.ds_espectro !== "NÃO CLASSIFICADO").map((r) => r.pc_pj);
    const s1 = secao("Todos dependiam, todos caíram juntos", `Em ${pre[pre.length - 1]}, as empresas pagavam ${mk(`de ${P(Math.min(...p14), 0)} a ${P(Math.max(...p14), 0)}`)} das campanhas de cada campo político. Nenhum lado era o preferido.`, svg(1110, 420, g),
      `Parte da receita dos candidatos doada por empresas, pelo campo político do partido. Depois de 2015, só o total (todos os campos), que nunca passou de ${P(Math.ceil(mxD * 10) / 10, 1)}.`);
    const cg = [["Dep. estadual", "DEPUTADO ESTADUAL"], ["Dep. federal", "DEPUTADO FEDERAL"], ["Senador", "SENADOR"], ["Governador", "GOVERNADOR"], ["Presidente", "PRESIDENTE"]];
    const linhasC = cg.map(([n, c]) => [n, ["esquerda", "centro", "direita"].map((b) => (F("t12a", (r) => r.nr_ano_eleicao === 2014 && r.ds_cargo === c && r.ds_bloco === b)).pc_pj)]);
    const pe = linhasC[4][1][0];
    const t10 = tot[0], tl = tot[tot.length - 1], ult = tot.filter((r) => r.vr_doacao_pj > 0).pop();
    const lado = Math.sqrt(ult.vr_doacao_pj / t10.vr_doacao_pj) * 300;
    const quad = `<div class="rp-quad"><div style="width:300px;height:300px"><span>${R$(t10.vr_doacao_pj)}</span><small>${t10.nr_ano_eleicao}</small></div><div class="rp-quad__p"><div style="width:${Math.max(3, lado).toFixed(1)}px;height:${Math.max(3, lado).toFixed(1)}px"></div><b>${R$(ult.vr_doacao_pj)}</b><small>${ult.nr_ano_eleicao}</small></div></div>`;
    const s2 = duas(bloco("Cargo a cargo, em 2014", `A exceção era a campanha a presidente: as empresas pagaram ${P(pe, 0)} das campanhas da esquerda.`, calor(["esquerda", "centro", "direita"], linhasC, 75, (i, j) => i === 4 && j === 0), nota("a única diferença grande", -2)),
      bloco("Do tamanho de um prédio ao de um tijolo", `Doação de empresas: ${t10.nr_ano_eleicao} contra ${ult.nr_ano_eleicao}, com a área do quadrado proporcional ao valor.`, quad));
    const r18 = F("q8", (r) => r.nr_ano_eleicao === 2018);
    return { tres: [[P(t10.pc_pj, 0), `de todo o dinheiro dos candidatos vinha de empresas em ${t10.nr_ano_eleicao}: ${R$(t10.vr_doacao_pj)}`], [P(r18.pc_pj, 1), "foi a parte das empresas em 2018, a primeira eleição geral sem elas"],
      [P(pe, 0), "da campanha da esquerda para presidente em 2014 foi paga por empresas"]], html: s1 + s2 };
  };

  TELAS.t15 = (C) => {
    const { F, W } = tab(C);
    const fx = W("t15a", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL" && r.qt_candidatos > 0 && !/sem receita/.test(r.ds_faixa)).sort((a, b) => a.nr_faixa - b.nr_faixa);
    const semR = F("t15a", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL" && /sem receita/.test(r.ds_faixa));
    const tot = W("t15a", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL").reduce((s, r) => s + r.qt_candidatos, 0);
    const cols = [["candidatos", "qt_candidatos", (v) => N(v)], ["se elegeram", "pc_taxa_sucesso", (v) => P(v, 1)], ["receita típica", "vr_receita_mediana", (v) => Rc(v)], ["votos típicos", "qt_votos_mediano", (v) => N(v)], ["R$ por voto", "vr_gasto_por_voto", (v) => "R$ " + N(v, 2)]];
    const mx = Object.fromEntries(cols.map(([, k]) => [k, Math.max(...fx.map((r) => r[k] || 0))]));
    const fundo = fx[fx.length - 1] || {};
    const tabela = `<div class="rp-rola"><table class="rp-tabbar"><thead><tr><th scope="col"><span class="visualmente-oculto">Grupo</span></th>${cols.map(([n]) => `<th scope="col">${n}</th>`).join("")}</tr></thead><tbody>${fx.map((r) => { const ef = r === fundo;
      return `<tr><th scope="row">${ef ? mk(r.ds_faixa) : r.ds_faixa}</th>${cols.map(([n, k, f]) => { const dest = ef && (k === "pc_taxa_sucesso" || k === "vr_gasto_por_voto"); const v = r[k] || 0;
        return `<td><b>${dest && k === "pc_taxa_sucesso" ? circ(f(v)) : f(v)}</b><i style="width:${Math.min(100, (100 * v) / (mx[k] || 1)).toFixed(0)}%;background:${dest ? CANETA : CINZA}"></i></td>`; }).join("")}</tr>`; }).join("")}</tbody></table></div>`;
    const s1 = secao("Jeitos de pagar uma campanha", `A maioria (${N(fundo.qt_candidatos)} dos ${N(tot)} candidatos a deputado federal) viveu de ${mk("90% ou mais")} de dinheiro público. Foi o grupo com menos votos e o voto mais caro.`,
      tabela + nota("muito candidato com pouco fundo cada", -2), `Candidatos a deputado federal em 2022 pela parte pública da receita (fundo eleitoral e partidário). Receita e votos típicos: metade tem mais, metade tem menos. Fora da tabela: ${N(semR.qt_candidatos || 0)} sem receita declarada.`);
    const car = ["DEPUTADO ESTADUAL", "DEPUTADO FEDERAL", "SENADOR", "GOVERNADOR", "PRESIDENTE"].map((c) => [cargoNome[c], F("q10", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === c && r.ds_resultado === "não eleito").vr_publico_medio, F("q10", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === c && r.ds_resultado === "eleito").vr_publico_medio]).filter((x) => x[1] > 0 && x[2] > 0);
    const H = halteres(car, 4.6, 8.3, 1060, OURO), df = car[1];
    const g = H.g + mao(H.sx(df[2]) + 130, 26 + 54 + 8, `${N(df[2] / df[1], 0)} vezes mais fundo para o eleito`);
    const s2 = secao(`O eleito recebeu ${N(df[2] / df[1], 0)} vezes mais fundo`, `O deputado federal eleito recebeu, em média, ${mk(R$(df[2]))} de dinheiro público; o derrotado, ${Rc(df[1])}.`, svg(1060, H.h, g),
      "Dinheiro público médio por candidato em 2022 (fundo eleitoral e partidário), eleitos (ponto preto) e não eleitos (ponto branco). A régua multiplica por 10 a cada linha.");
    const mist = fx.find((r) => /menos da metade/.test(r.ds_faixa)) || {}, priv = fx.find((r) => /privado/.test(r.ds_faixa)) || {};
    return { tres: [[N(fundo.qt_candidatos), "candidatos a deputado federal viveram de 90% ou mais de dinheiro público em 2022"], ["R$ " + N(fundo.vr_gasto_por_voto, 2), `custou cada voto de quem vive do fundo; R$ ${N(mist.vr_gasto_por_voto, 2)} o de quem tem menos da metade pública`],
      [P(priv.pc_taxa_sucesso, 1), "dos que usaram só dinheiro privado se elegeram: sem fundo também não dá"]], html: s1 + s2 };
  };

  TELAS.e6 = (C) => {
    const { T } = tab(C);
    const vals = T("e6a").sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao);
    const Wd = 1110, base = 470, cw = (Wd - 80) / vals.length;
    let g = "";
    vals.forEach((r, i) => {
      const x = 70 + i * cw + cw / 2, v = r.vr_por_eleitor, n = Math.floor(v);
      for (let k = 0; k < n; k++) { const y = base - 12 - k * 11; g += `<ellipse cx="${x}" cy="${y + 5}" rx="34" ry="9" fill="#B8952A"/><ellipse cx="${x}" cy="${y}" rx="34" ry="9" fill="${OURO}" stroke="#8A6D12" stroke-width="1.2"/>`; }
      const fr = v - n; if (fr > 0.05 || n === 0) g += `<ellipse cx="${x}" cy="${base - 12 - n * 11}" rx="${Math.max(6, 34 * fr).toFixed(1)}" ry="${Math.max(2.5, 9 * fr).toFixed(1)}" fill="${OURO}" stroke="#8A6D12" stroke-width="1.2"/>`;
      g += `<text x="${x}" y="${base - 12 - Math.max(n, 1) * 11 - 22}" text-anchor="middle" class="rp-n" font-size="${v < 30 ? 19 : 24}">R$ ${N(v, 2)}</text><text x="${x}" y="${base + 26}" text-anchor="middle" class="rp-n" font-size="18">${r.nr_ano_eleicao}</text>`;
    });
    g += `<line x1="40" x2="${Wd}" y1="${base}" y2="${base}" stroke="${TINTA}" stroke-width="2"/><text x="70" y="30" class="rp-eixo">cada moeda = R$ 1 por eleitor</text>`;
    const i18 = vals.findIndex((r) => r.nr_ano_eleicao === 2018);
    if (i18 >= 0) { const x = 70 + i18 * cw + cw / 2; g += mao(x - 60, base - 260, "2018: chega o fundo eleitoral", CANETA, ` text-anchor="middle"`) + `<path d="M${x - 40},${base - 250} C${x - 20},${base - 230} ${x - 10},${base - 215} ${x - 4},${base - 200}" fill="none" stroke="${CANETA}" stroke-width="3"/>`; }
    const a0 = vals[0], a1 = vals[vals.length - 1];
    const s1 = secao("A pilha de moedas de cada eleitor", `Dinheiro público nas campanhas dividido por todos os eleitores do país: de ${mk(N(a0.vr_por_eleitor * 100, 0) + " centavos")} em ${a0.nr_ano_eleicao} para R$ ${N(a1.vr_por_eleitor, 2)} em ${a1.nr_ano_eleicao}.`, svg(Wd + 20, base + 40, g, "100%", "Dinheiro público por eleitor em cada eleição"),
      "Fundo eleitoral e fundo partidário recebidos pelos candidatos ÷ eleitores aptos naquele ano. Valores da época, sem correção pela inflação.");
    const jar = `<div class="rp-potes">${vals.map((r) => `<div><div class="rp-pote"><i style="height:${r.pc_publico}%"></i></div><b>${P(r.pc_publico, 0)}</b><span>${r.nr_ano_eleicao}</span></div>`).join("")}</div>`;
    const cg = T("e6b").filter((r) => r.nr_ano_eleicao === a1.nr_ano_eleicao && r.vr_publico > 0 && cargoNome[r.ds_cargo]).sort((a, b) => b.vr_publico - a.vr_publico);
    const totC = cg.reduce((s, r) => s + r.vr_publico, 0), tons = [TINTA, CINZA2, CINZA, CEN, "#D9D5CA", "#E9E6DE"];
    const barra = `<div class="rp-pilha">${cg.map((r, i) => `<div style="flex:${r.vr_publico};background:${tons[i] || "#E9E6DE"};color:${i < 2 ? "#FFFFFF" : TINTA}"><b>${r.vr_publico / totC > 0.12 ? R$(r.vr_publico).replace(" bilhões", " bi").replace(" bilhão", " bi") : ""}</b></div>`).join("")}</div>`;
    const lg = cg.map((r, i) => `<div class="rp-pilha__l"><i style="background:${tons[i] || "#E9E6DE"}"></i><b>${cargoNome[r.ds_cargo]}</b><span>${Rc(r.vr_publico_por_eleito)} por eleito${i === 0 ? " · " + mk("o cargo que mais leva") : ""}</span></div>`).join("");
    const s2 = duas(bloco("Quanto da campanha é dinheiro público", "Parte da receita de todos os candidatos.", jar, nota("até 2014, as empresas pagavam boa parte", -2)),
      bloco(`Para onde foram os ${R$(a1.vr_publico)} de ${a1.nr_ano_eleicao}`, `Dinheiro público por cargo, eleição de ${a1.nr_ano_eleicao}.`, barra + lg));
    const a14 = vals.find((r) => r.nr_ano_eleicao === 2014) || {};
    return { tres: [[R$(a1.vr_publico), `de dinheiro público nas campanhas de ${a1.nr_ano_eleicao}`], [`${a1.vr_por_eleitor / a0.vr_por_eleitor >= 100 ? "mais de 100" : N(a1.vr_por_eleitor / a0.vr_por_eleitor, 0)} vezes`, `o valor por eleitor de ${a0.nr_ano_eleicao}`],
      [P(a1.pc_publico, 0), `das campanhas de ${a1.nr_ano_eleicao} foram pagas com dinheiro público; em 2014, ${P(a14.pc_publico, 0)}`]], html: s1 + s2 };
  };

  /* ================================================================ PERFIL */
  TELAS.t4 = (C) => {
    const { F, W } = tab(C);
    const g4 = (a, c, gr) => F("t4a", (r) => r.nr_ano_eleicao === a && r.ds_cargo === c && r.ds_grupo === gr);
    const linhas = [["Eleitores (2024)", g4(2024, "ELEITORADO", "eleitores")], ["Candidatos a vereador", g4(2024, "VEREADOR", "candidatos")], ["Vereadores eleitos", g4(2024, "VEREADOR", "eleitos")],
      ["Deputados federais eleitos (2022)", g4(2022, "DEPUTADO FEDERAL", "eleitos")], ["Governadores eleitos (2022)", g4(2022, "GOVERNADOR", "eleitos")]];
    const seg = (v, c, fg, t) => (v > 0 ? `<div style="flex:${v};background:${c};color:${fg}">${v >= 7 ? t : ""}</div>` : "");
    const h = linhas.map(([n, r], i) => `<div class="rp-espelho"><b>${n}</b><div>${seg(r.pc_superior, TINTA, "#FFFFFF", i === 0 || i === 3 ? circ(P(r.pc_superior, 0)) : P(r.pc_superior, 0))}${seg(r.pc_medio, CEN, TINTA, P(r.pc_medio, 0))}${seg(r.pc_ate_fundamental, "#FFFFFF", TINTA, P(r.pc_ate_fundamental, 0))}</div></div>`).join("");
    const pres = g4(2022, "PRESIDENTE", "eleitos");
    const s1 = secao("O espelho que distorce", `De cada 100 eleitores, ${N(linhas[0][1].pc_superior, 0)} têm diploma. Na Câmara dos Deputados, ${mk(N(linhas[3][1].pc_superior, 0) + " de cada 100")}. Quanto mais alto o cargo, mais estudado o eleito.`,
      `<div class="rp-espelhos">${h}</div>${leg([[TINTA, "curso superior"], [CEN, "ensino médio"], ["#FFFFFF", "até o fundamental", true]])}${pres.pc_superior === 0 ? nota("o presidente eleito em 2022 é a exceção: não tem diploma", -1.5) : ""}`,
      "Escolaridade declarada ao TSE. Eleitores e candidatos de 2024; deputados e governadores de 2022.");
    const ch = (a, c, g2) => F("t1c", (r) => r.nr_ano_eleicao === a && r.ds_cargo === c && r.ds_grau_instrucao === g2).pc_taxa_sucesso || 0;
    const prs = [["Dep. federal 2022", 2022, "DEPUTADO FEDERAL"], ["Vereador 2024", 2024, "VEREADOR"], ["Prefeito 2024", 2024, "PREFEITO"]].map(([n, a, c]) => [n, ch(a, c, "SUPERIOR COMPLETO"), ch(a, c, "ENSINO MÉDIO COMPLETO")]);
    const mx = Math.ceil(Math.max(...prs.flatMap((x) => [x[1], x[2]])) / 10) * 10, Yp = (v) => 300 - (v / mx) * 250;
    let g = prs.map(([n, a, b], i) => { const x = 50 + i * 190, cor = Math.abs(a - b) > 1 ? CANETA : CINZA;
      return `<line x1="${x}" x2="${x + 110}" y1="${Yp(b)}" y2="${Yp(a)}" stroke="${cor}" stroke-width="3.5"/><circle cx="${x}" cy="${Yp(b)}" r="7" fill="#FFFFFF" stroke="${TINTA}" stroke-width="2.5"/><circle cx="${x + 110}" cy="${Yp(a)}" r="8" fill="${TINTA}"/>
        <text x="${x - 10}" y="${Yp(b) + 5}" text-anchor="end" class="rp-eixo">${P(b, 1)}</text><text x="${x + 120}" y="${Yp(a) + 6}" class="rp-n" font-size="18">${P(a, 1)}</text>
        <text x="${x + 55}" y="330" text-anchor="middle" class="rp-rot" font-size="14">${n}</text><text x="${x}" y="350" text-anchor="middle" class="rp-eixo" font-size="12">médio</text><text x="${x + 110}" y="350" text-anchor="middle" class="rp-eixo" font-size="12">superior</text>`; }).join("");
    const pf = prs[2];
    const q = W("q4b", (r) => r.ds_cargo === "VEREADOR").sort((a, b) => a.nr_quintil - b.nr_quintil);
    const X = (i) => 70 + i * 110, Y = (v) => 280 - (v / 60) * 250;
    let gq = eixoY(70, 520, Y, [0, 20, 40, 60]);
    [["pc_eleitos_superior", TINTA, "vereadores eleitos com diploma"], ["pc_eleitores_superior_2024", CINZA, "eleitores com diploma"]].forEach(([k, c]) => { gq += linha(q.map((r, i) => [X(i), Y(r[k])]), c, 3.5) + `<text x="${X(q.length - 1) + 10}" y="${Y(q[q.length - 1][k]) + 5}" class="rp-rot" fill="${c}" font-size="14">${P(q[q.length - 1][k], 0)}</text>`; });
    gq += `<text x="${X(0)}" y="302" text-anchor="middle" class="rp-eixo">menos estudada</text><text x="${X(4)}" y="302" text-anchor="middle" class="rp-eixo">mais estudada</text>`;
    const s2 = duas(bloco("Diploma ajuda a se eleger?", "Parte dos candidatos que se elegeram, por escolaridade.", svg(620, 360, g), Math.abs(pf[1] - pf[2]) < 1 ? nota("para prefeito, tanto faz", 2) : ""),
      bloco("Cidade mais estudada elege mais diplomados", "Cidades em 5 grupos pelo IDHM Educação; vereadores de 2024.", svg(600, 320, gq) + leg([[TINTA, "vereadores eleitos com diploma"], [CINZA, "eleitores com diploma"]]), nota("a distância nunca fecha", -2)));
    return { tres: [[P(linhas[3][1].pc_superior, 0), "dos deputados federais eleitos em 2022 têm curso superior"], [P(linhas[2][1].pc_superior, 0), `dos vereadores eleitos em 2024; entre os candidatos, ${P(linhas[1][1].pc_superior, 0)}`],
      [`${P(pf[1], 1)} e ${P(pf[2], 1)}`, "de chance para prefeito, com e sem diploma: aqui o estudo não pesa"]], html: s1 + s2 };
  };

  TELAS.t10 = (C) => {
    const { T, F, W } = tab(C);
    const fx = T("t10a").sort((a, b) => a.nr_faixa - b.nr_faixa);
    let g = fx.map((r, i) => { const x = 60 + i * 200, y = 340 - (r.pc_reeleitos / 80) * 300;
      return `<rect x="${x}" y="${y}" width="200" height="${340 - y}" fill="${i === 0 ? TINTA : i === fx.length - 1 ? CANETA : CINZA2}" stroke="#F6F5F1" stroke-width="3"/><text x="${x + 100}" y="${y - 12}" text-anchor="middle" class="rp-n" font-size="30">${P(r.pc_reeleitos, 0)}</text>
        <text x="${x + 100}" y="366" text-anchor="middle" class="rp-rot">${r.ds_idade.replace(/^(\d)/, "$1")}${/anos/.test(r.ds_idade) ? "" : " anos"}</text><text x="${x + 100}" y="386" text-anchor="middle" class="rp-eixo">${N(r.qt_tentaram)} tentaram</text>`; }).join("");
    g += mao(1060, 34, "cada década, um degrau abaixo ↘", CANETA, ' text-anchor="end"');
    const a = fx[0], z = fx[fx.length - 1];
    const s1 = secao("A escada da idade", `Prefeito com ${a.ds_idade} que tentou de novo ${mk(`se reelegeu em ${P(a.pc_reeleitos, 0)} das vezes`)}; com ${z.ds_idade}, em ${P(z.pc_reeleitos, 0)}.`, svg(1080, 400, g), "Prefeitos que tentaram a reeleição, pela idade no dia da eleição.");
    const anos = T("t10b").sort((x, y) => x.nr_ano_eleicao - y.nr_ano_eleicao);
    const col = `<div class="rp-col100">${anos.map((r) => `<div><div class="rp-col100__c"><i style="height:${r.pc_mesmo_prefeito}%;background:${TINTA}"></i><i style="height:${r.pc_outro_do_mesmo_partido}%;background:${CINZA}"></i><i style="height:${r.pc_troca_de_partido}%;background:#FFFFFF"><b>${P(r.pc_troca_de_partido, 0)}</b></i></div><span>${r.nr_ano_eleicao}</span></div>`).join("")}</div>`;
    const mxT = anos.reduce((m, r) => (r.pc_troca_de_partido > m.pc_troca_de_partido ? r : m), anos[0]), ul = anos[anos.length - 1];
    const q = W("q7c", (r) => r.nr_ano_eleicao === Math.max(...T("q7c").map((x) => x.nr_ano_eleicao))).sort((x, y) => x.nr_quintil - y.nr_quintil);
    const X = (i) => 70 + i * 110, Y = (v) => 280 - (v / 35) * 250;
    let gq = eixoY(70, 520, Y, [0, 10, 20, 30]);
    [["pc_eleitorado_ate_29", CINZA, "eleitores com até 29 anos"], ["pc_eleitos_ate_29", CANETA, "vereadores eleitos com até 29"]].forEach(([k, c, n]) => { gq += linha(q.map((r, i) => [X(i), Y(r[k])]), c, 3.5) + `<text x="${X(q.length - 1) - 6}" y="${Y(q[q.length - 1][k]) - 12}" class="rp-rot" fill="${c}" font-size="14" text-anchor="end">${n}: ${P(q[q.length - 1][k], 1)}</text>`; });
    gq += `<text x="${X(0)}" y="302" text-anchor="middle" class="rp-eixo">eleitorado mais velho</text><text x="${X(4)}" y="302" text-anchor="middle" class="rp-eixo">mais jovem</text>`;
    const jv = q[q.length - 1] || {};
    const s2 = duas(bloco("O poder troca menos de mãos", "Prefeituras em cada eleição.", col + leg([[TINTA, "mesmo prefeito"], [CINZA, "outro do mesmo partido"], ["#FFFFFF", "trocou de partido (número)", true]]), nota(`de ${P(mxT.pc_troca_de_partido, 0)} para ${P(ul.pc_troca_de_partido, 0)} desde ${mxT.nr_ano_eleicao}`, -2)),
      bloco("Jovem não vota em jovem", "Cidades em 5 grupos pela parte do eleitorado com até 29 anos.", svg(600, 320, gq), nota(`o jovem é ${P(jv.pc_eleitorado_ate_29, 0)} do eleitor e ${P(jv.pc_eleitos_ate_29, 0)} do eleito`, 2)));
    const nv = F("t10c", (r) => r.nr_ano_eleicao === 2022);
    return { tres: [[`${N(ul.vr_idade_quem_entrou, 1)} anos`, `tinha o prefeito que entrou em ${ul.nr_ano_eleicao}; o que saiu, ${N(ul.vr_idade_quem_saiu, 1)}`],
      [P(nv.pc_novatos, 0), `dos deputados federais de 2022 eram novatos, ${N(nv.vr_idade_reeleitos - nv.vr_idade_novatos, 0)} anos mais novos que os reeleitos`], [P(jv.pc_eleitos_ate_29, 1), "dos vereadores eleitos tinham até 29 anos, mesmo onde o eleitor é mais jovem"]], html: s1 + s2 };
  };

  TELAS.e2 = (C) => {
    const { T, F } = tab(C);
    const v = T("q12b").sort((a, b) => a.qt_vitorias - b.qt_vitorias), tot = v.reduce((s, r) => s + r.qt_pessoas, 0);
    const h = v.map((r, i) => { const pelo = v.slice(i).reduce((s, x) => s + x.qt_pessoas, 0), pc = (100 * pelo) / tot;
      return `<div class="rp-funil"><b>${r.qt_vitorias} ${r.qt_vitorias === 1 ? "vitória" : "vitórias"} ou mais</b><div><i style="width:${Math.max(pc, 0.4).toFixed(1)}%;background:${i === 0 ? TINTA : i === 1 ? CANETA : CINZA2}"></i></div><b class="rp-num">${P(pc, pc < 10 ? 1 : 0)}</b></div>`; }).join("");
    const um = (100 * v[0].qt_pessoas) / tot, max = v[v.length - 1];
    const s1 = secao("O funil da carreira", `De ${N(tot)} pessoas que venceram alguma eleição desde 1994, ${mk(P(um, 0) + " venceram uma só")}. Só ${N(max.qt_pessoas)} chegaram a ${max.qt_vitorias} vitórias.`,
      `<div class="rp-funis">${h}</div>${nota("mais da metade some depois da 1ª vitória", -2)}`, "Pessoas seguidas pelo título de eleitor em todas as eleições de 1994 a 2026. Cada faixa mostra quantas chegaram a pelo menos aquele número de vitórias.");
    // trajetórias: as três primeiras da lista de carreiras mais longas
    const sig = { vereador: "VER", prefeito: "PREF", "deputado estadual": "DE", "deputado distrital": "DE", "deputado federal": "DF", senador: "SEN", governador: "GOV", presidente: "PRES" };
    const cores = { VER: CEN, PREF: CINZA2, DE: "#8FA9DD", DF: DIR, SEN: CANETA, GOV: "#E38A82", PRES: TINTA }, nomesC = { VER: "vereador", PREF: "prefeito", DE: "dep. estadual", DF: "dep. federal", SEN: "senador", GOV: "governador", PRES: "presidente" };
    const trajs = T("q12c").slice(0, 3).map((r) => { const ps = r.ds_trajetoria.split(" → ").map((s) => { const m = s.match(/^(\d{4}) (.+?) \((.+?)\)( não eleito)?/); return m ? [+m[1], sig[m[2]] || "VER", !m[4], m[3]] : null; }).filter(Boolean);
      const parts = [...new Set(ps.map((p) => p[3]))]; return [titulo(r.nm_pessoa.split(" ").slice(0, 1).join(" ")) + " " + titulo(r.nm_pessoa.split(" ").slice(-1)[0]) + ` (${parts.length > 2 ? parts[0] + " → … → " + parts[parts.length - 1] : parts.join(" → ")})`, ps]; });
    const a0 = Math.min(...trajs.flatMap((t) => t[1].map((p) => p[0]))), a1 = Math.max(...trajs.flatMap((t) => t[1].map((p) => p[0])));
    const X = (a) => 300 + ((a - a0) / Math.max(1, a1 - a0)) * 760;
    let g = Array.from({ length: Math.floor((a1 - a0) / 4) + 1 }, (_, k) => a0 + k * 4).map((a) => `<text x="${X(a)}" y="20" text-anchor="middle" class="rp-n" font-size="15">${a}</text>`).join("");
    const usados = new Set();
    trajs.forEach(([n, ps], i) => { const y = 60 + i * 70; g += `<text x="0" y="${y + 5}" class="rp-rot" font-size="15">${esc(n)}</text><line x1="${X(ps[0][0])}" x2="${X(ps[ps.length - 1][0])}" y1="${y}" y2="${y}" stroke="${TINTA}" stroke-width="2"/>`;
      ps.forEach(([a, c, ok]) => { usados.add(c); g += `<circle cx="${X(a)}" cy="${y}" r="13" fill="${ok ? cores[c] : "#FFFFFF"}" stroke="${TINTA}" stroke-width="2"/>`; }); });
    g += [...usados].map((c, i) => `<circle cx="${310 + i * 140}" cy="270" r="9" fill="${cores[c]}" stroke="${TINTA}"/><text x="${324 + i * 140}" y="275" class="rp-eixo">${nomesC[c]}</text>`).join("") + `<circle cx="${310 + usados.size * 140}" cy="270" r="9" fill="#FFFFFF" stroke="${TINTA}" stroke-width="2"/><text x="${324 + usados.size * 140}" y="275" class="rp-eixo">perdeu</text>`;
    const s2 = secao("As carreiras que não acabam", "Três das trajetórias mais longas do banco, eleição por eleição.", svg(1080, 290, g));
    const gov = [...new Set(T("q12e").map((r) => r.ds_governo))];
    const sgs = ["PL", "PP", "REPUBLICANOS", "UNIÃO", "PSD", "MDB", "PSOL", "PT"], centr = ["PP", "REPUBLICANOS", "UNIÃO", "PSD", "MDB"];
    const vg = (gv, sg) => (F("q12e", (r) => r.ds_governo === gv && r.sg_partido === sg)).pc_segue_governo;
    const Ys = (v) => 330 - (v / 100) * 300;
    let gs = eixoY(120, 520, Ys, [0, 25, 50, 75, 100]);
    const rot = [];
    sgs.forEach((sg) => { const b = vg(gov[0], sg), l = vg(gov[1], sg); if (b == null || l == null) return; const cor = sg === "PT" || sg === "PSOL" ? ESQ : sg === "PL" ? DIR : CINZA;
      gs += `<line x1="160" x2="470" y1="${Ys(b)}" y2="${Ys(l)}" stroke="${cor}" stroke-width="${centr.includes(sg) ? 2 : 3.5}"/><circle cx="160" cy="${Ys(b)}" r="5" fill="${cor}"/><circle cx="470" cy="${Ys(l)}" r="5" fill="${cor}"/>`;
      if (!centr.includes(sg) || sg === "PSD") rot.push([sg === "PSD" ? "centrão" : sg, l, cor]); });
    const yr = semEncostar(rot.map((r) => Ys(r[1]) + 5));
    rot.forEach(([n, l, c], i) => { gs += `<text x="480" y="${yr[i]}" class="rp-rot" font-size="14" fill="${c}">${n} ${P(l, 0)}</text>`; });
    gs += `<text x="160" y="356" text-anchor="middle" class="rp-rot" font-size="14">governo ${gov[0].split(" ")[0]}</text><text x="470" y="356" text-anchor="middle" class="rp-rot" font-size="14">governo ${gov[1].split(" ")[0]}</text>`;
    const ger = T("q12").filter((r) => r.tp_abrangencia === "GERAL").sort((a, b) => b.nr_ano - a.nr_ano)[0] || {}, mun = T("q12").filter((r) => r.tp_abrangencia === "MUNICIPAL").sort((a, b) => b.nr_ano - a.nr_ano)[0] || {};
    const s3 = duas(bloco("O centrão vota com qualquer governo", "Parte das votações da Câmara em que a bancada votou como o governo pediu.", svg(640, 370, gs), nota("PP, União, PSD, MDB: sempre perto do governo", -2)),
      `<div class="rp-bloco">${fatos([[circ(P(ger.pc_eleito_de_novo_4_anos, 0)), `dos deputados, senadores e governadores eleitos em ${ger.nr_ano} se elegeram de novo em ${ger.nr_ano + 4}`],
        [P(mun.pc_eleito_de_novo_4_anos, 0), `dos prefeitos e vereadores eleitos em ${mun.nr_ano} voltaram em ${mun.nr_ano + 4}: na cidade, a volta é mais difícil`]])}${nota("a ficha de cada um está em Políticos →", 2, true)}</div>`, "1.4fr 1fr");
    return { tres: [[N(tot), "pessoas venceram pelo menos uma eleição de 1994 a 2026"], [N(max.qt_pessoas), `chegaram a ${max.qt_vitorias} vitórias`], [P(ger.pc_eleito_de_novo_4_anos, 0), `dos eleitos em ${ger.nr_ano} para deputado, senador e governador voltaram em ${ger.nr_ano + 4}`]], html: s1 + s2 + s3 };
  };

  TELAS.e4 = (C) => {
    const { F, W } = tab(C);
    const ve = W("e4a", (r) => r.ds_cargo === "VEREADOR").sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao);
    const X = (i) => 90 + (i * 920) / Math.max(1, ve.length - 1), Y = (v) => 360 - (v / 50) * 320;
    let g = eixoY(90, 1010, Y, [0, 10, 20, 30, 40, 50]);
    g += `<polygon points="${ve.map((r, i) => `${X(i)},${Y(r.pc_mulheres_candidatas)}`).join(" ")} ${ve.map((r, i) => `${X(i)},${Y(r.pc_mulheres_eleitas)}`).reverse().join(" ")}" fill="${MARCA}" fill-opacity=".55"/>`;
    g += `<line x1="90" x2="1010" y1="${Y(30)}" y2="${Y(30)}" stroke="${TINTA}" stroke-dasharray="6 5" stroke-width="2"/><text x="1010" y="${Y(30) - 8}" text-anchor="end" class="rp-rot" font-size="14">cota: 30% das candidaturas (2009)</text>`;
    [["pc_mulheres_candidatas", TINTA, "candidatas"], ["pc_mulheres_eleitas", CANETA, "eleitas"]].forEach(([k, c, n]) => { g += linha(ve.map((r, i) => [X(i), Y(r[k])]), c, 4) + `<text x="${X(ve.length - 1) + 12}" y="${Y(ve[ve.length - 1][k]) + 6}" class="rp-rot" fill="${c}">${n} ${P(ve[ve.length - 1][k], 0)}</text>`; });
    g += ve.map((r, i) => `<text x="${X(i)}" y="386" text-anchor="middle" class="rp-n" font-size="16">${r.nr_ano_eleicao}</text>`).join("") + mao(X(Math.floor(ve.length * 0.6)), Y(24), "a distância não fecha", TINTA, ' text-anchor="middle"');
    const v0 = ve[0], v1 = ve[ve.length - 1];
    const s1 = secao("A cota encheu a lista, não a câmara", `As candidatas a vereadora passaram de ${P(v0.pc_mulheres_candidatas, 0)} para ${P(v1.pc_mulheres_candidatas, 0)}; as eleitas, de ${P(v0.pc_mulheres_eleitas, 0)} para ${mk(P(v1.pc_mulheres_eleitas, 0))}.`, svg(1120, 400, g),
      "Parte das candidaturas e dos eleitos que são mulheres, vereador. A faixa amarela é a distância entre as duas.");
    const km = Math.round(v1.pc_sucesso_mulheres), kh = Math.round(v1.pc_sucesso_homens);
    const a = bloco("De cada 100 que se candidatam", `Vereador, ${v1.nr_ano_eleicao}.`, `<div class="rp-dupla"><div>${bolinhas(km, 100, CANETA)}<b class="rp-grande">${circ(String(km))} candidatas eleitas</b></div><div>${bolinhas(kh)}<b class="rp-grande">${kh} candidatos eleitos</b></div></div>`);
    const b4 = [...new Set(W("e4b", (r) => r.ds_cargo === "VEREADOR").map((r) => r.nr_ano_eleicao))].sort().map((an) => [an, F("e4b", (r) => r.ds_cargo === "VEREADOR" && r.nr_ano_eleicao === an && r.ds_genero === "FEMININO").pc_ate_10_votos, F("e4b", (r) => r.ds_cargo === "VEREADOR" && r.nr_ano_eleicao === an && r.ds_genero === "MASCULINO").pc_ate_10_votos]);
    const pk = b4.reduce((m, x) => (x[1] > m[1] ? x : m), b4[0]);
    const b = bloco("Candidatura quase sem voto", "Parte das candidaturas a vereador com até 10 votos: mulheres (rosa) e homens (cinza).", pares(b4, 5.5), nota(`${P(pk[1], 0)} delas em ${pk[0]}: sinal de candidatura só para a cota`, -2));
    const df = W("e4a", (r) => r.ds_cargo === "DEPUTADO FEDERAL").sort((x, y) => x.nr_ano_eleicao - y.nr_ano_eleicao), d1 = df[df.length - 1] || {}, d0 = df[0] || {};
    const u = b4[b4.length - 1] || [];
    return { tres: [[P(d1.pc_mulheres_eleitas, 0), `dos deputados federais eleitos em ${d1.nr_ano_eleicao} são mulheres; em ${d0.nr_ano_eleicao}, ${P(d0.pc_mulheres_eleitas, 0)}`], [`${km} em 100`, `candidatas a vereadora se elegeram em ${v1.nr_ano_eleicao}; dos candidatos, ${kh}`],
      [P(u[1], 0), `das candidatas a vereadora tiveram até 10 votos em ${u[0]}; dos homens, ${P(u[2], 0)}`]], html: s1 + duas(a, b) };
  };

  TELAS.e7 = (C) => {
    const { F, W } = tab(C);
    const anos = [...new Set(W("e7a", (r) => r.ds_cargo === "VEREADOR").map((r) => r.nr_ano_eleicao))].sort();
    const q = (a, g2, c = "VEREADOR") => F("e7a", (r) => r.nr_ano_eleicao === a && r.ds_cargo === c && r.ds_grupo === g2);
    const mx = Math.max(...anos.flatMap((a) => [q(a, "religioso").qt_candidaturas || 0, q(a, "farda").qt_candidaturas || 0]));
    const col = `<div class="rp-pares">${anos.map((a) => `<div><div class="rp-pares__c" style="height:220px"><i style="height:${((q(a, "religioso").qt_candidaturas / mx) * 200).toFixed(0)}px;background:${TINTA}"></i><i style="height:${((q(a, "farda").qt_candidaturas / mx) * 200).toFixed(0)}px;background:${DIR}"></i></div><b>${a}</b></div>`).join("")}</div>`;
    const cr = (t, c, gi) => `<span class="rp-cracha" style="border-top-color:${c};transform:rotate(${gi}deg)">${t}</span>`;
    const a0 = anos[0], a1 = anos[anos.length - 1];
    const a = bloco("Cada vez mais títulos na urna", "Candidatos a vereador com título religioso (preto) e de farda (azul) no nome.", `<div class="rp-crachas">${cr("Pastor", TINTA, -2)}${cr("Irmã", TINTA, 1)}${cr("Sargento", DIR, 2)}${cr("Delegado", DIR, -1)}</div>${col}`,
      nota(`religioso: de ${N(q(a0, "religioso").qt_candidaturas)} para ${N(q(a1, "religioso").qt_candidaturas)}`, -2));
    const anoD = Math.max(...W("e7a", (r) => r.ds_cargo === "DEPUTADO ESTADUAL").map((r) => r.nr_ano_eleicao));
    const plac = (c, an, destaque) => barrasH([["Sem título", q(an, "sem título", c).pc_eleitos, CINZA], ["Farda", q(an, "farda", c).pc_eleitos, DIR], ["Religioso", q(an, "religioso", c).pc_eleitos, TINTA]], 14, (v) => P(v, 1));
    const b = bloco("O placar da urna", "Parte dos candidatos que se elegeram.", `<b class="rp-sub">Vereador, ${a1}</b>${plac("VEREADOR", a1)}<b class="rp-sub">Deputado estadual, ${anoD}</b>${plac("DEPUTADO ESTADUAL", anoD)}`, nota("a farda ganha da média só para deputado", 2));
    const rD = q(anoD, "religioso", "DEPUTADO ESTADUAL"), fD = q(anoD, "farda", "DEPUTADO ESTADUAL"), sD = q(anoD, "sem título", "DEPUTADO ESTADUAL");
    return { tres: [[N(q(a1, "religioso").qt_candidaturas), `candidatos a vereador com título religioso em ${a1}; eram ${N(q(a0, "religioso").qt_candidaturas)} em ${a0}`],
      [P(fD.pc_eleitos, 1), `dos candidatos a deputado estadual com título de farda se elegeram em ${anoD}; a média dos sem título, ${P(sD.pc_eleitos, 1)}`], [N(rD.qt_eleitos), `candidatos com título religioso se elegeram deputado estadual em ${anoD}, de ${N(rD.qt_candidaturas)}`]],
      html: duas(a, b) };
  };

  TELAS.e8 = (C) => {
    const { F, W } = tab(C);
    const anos = [...new Set(W("e8a", (r) => r.ds_cargo === "VEREADOR").map((r) => r.nr_ano_eleicao))].sort();
    const q = (a, gn) => F("e8a", (r) => r.ds_cargo === "VEREADOR" && r.nr_ano_eleicao === a && r.ds_genero === gn);
    const mx = Math.max(...anos.map((a) => q(a, "FEMININO").vr_publico_ate_10 || 0));
    let g = "";
    anos.forEach((a, i) => { const x = 180 + i * 330;
      [[q(a, "FEMININO"), CANETA, 170, "candidatas", 0.9], [q(a, "MASCULINO"), CINZA, 500, "candidatos", 0.7]].forEach(([r, c, y, rot, op]) => { const rr = Math.max(4, 120 * Math.sqrt((r.vr_publico_ate_10 || 0) / mx));
        g += `<circle cx="${x}" cy="${y}" r="${rr.toFixed(1)}" fill="${c}" fill-opacity="${op}"/><text x="${x}" y="${y + rr + 26}" text-anchor="middle" class="rp-n" font-size="20">${Rc(r.vr_publico_ate_10 || 0)}</text><text x="${x}" y="${y + rr + 46}" text-anchor="middle" class="rp-eixo">${N(r.qt_ate_10_com_publico || 0)} ${rot}</text>`; });
      g += `<text x="${x}" y="720" text-anchor="middle" class="rp-n" font-size="22">${a}</text>`; });
    g += `<text x="0" y="175" class="rp-rot" fill="${CANETA}">Mulheres</text><text x="0" y="505" class="rp-rot" fill="${CINZA2}">Homens</text>` + mao(350, 60, "2018: o fundo eleitoral chega", CANETA, ' text-anchor="middle"');
    const f0 = q(anos[0], "FEMININO"), f1 = q(anos[anos.length - 1], "FEMININO"), h1 = q(anos[anos.length - 1], "MASCULINO");
    const s1 = secao("O dinheiro que chegou a quem quase não teve voto", `Candidaturas a vereador com até 10 votos que receberam dinheiro público: de ${R$(f0.vr_publico_ate_10)} em ${anos[0]} para ${mk(R$(f1.vr_publico_ate_10))} em ${anos[anos.length - 1]}, só nas mulheres.`,
      svg(1080, 740, g, "1000px"), "A área de cada círculo é o dinheiro público recebido pelas candidaturas com até 10 votos.");
    const a = bloco("Mais comum entre as mulheres", "Parte das candidaturas a vereador com até 10 votos e dinheiro público.", pares(anos.map((an) => [an, q(an, "FEMININO").pc_ate_10_com_publico, q(an, "MASCULINO").pc_ate_10_com_publico]), 25), nota("mais que o dobro", -2));
    const b = `<div class="rp-bloco">${fatos([[circ(Rc(f1.vr_publico_ate_10 / f1.qt_ate_10_com_publico)), `em média, para cada candidata a vereadora com até 10 votos que recebeu dinheiro público em ${anos[anos.length - 1]}`],
      ["30%", "do fundo tem de ir para as candidatas desde 2018: a regra que explica o salto"]])}</div>`;
    return { tres: [[N(f1.qt_ate_10_com_publico), `candidatas a vereadora com até 10 votos e dinheiro público em ${anos[anos.length - 1]}`], [N(h1.qt_ate_10_com_publico), `candidatos homens na mesma situação (${R$(h1.vr_publico_ate_10)})`],
      [`${N(f1.vr_publico_ate_10 / f0.vr_publico_ate_10, 0)} vezes`, `mais dinheiro nessas candidaturas de mulheres que em ${anos[0]}`]], html: s1 + duas(a, b) };
  };
})();
