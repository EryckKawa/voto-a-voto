/* Voto a voto — abertura: o candidato Ninguém (quem não foi votar + brancos + nulos).
   A urna é o fio visual: o teclado funciona e explica, na prática, o que é votar em branco e anular. */
(function () {
  "use strict";
  const V = window.V;
  // número de cada partido na urna (eleições de 2024)
  const NUM = { 10: "REPUBLICANOS", 11: "PP", 12: "PDT", 13: "PT", 15: "MDB", 16: "PSTU", 18: "REDE", 20: "PODE", 21: "PCB", 22: "PL", 23: "CIDADANIA", 25: "PRD", 27: "DC", 28: "PRTB", 29: "PCO", 30: "NOVO", 33: "MOBILIZA", 35: "PMB", 36: "AGIR", 40: "PSB", 43: "PV", 44: "UNIÃO", 45: "PSDB", 50: "PSOL", 55: "PSD", 65: "PC do B", 70: "AVANTE", 77: "SOLIDARIEDADE", 80: "UP" };
  const mi = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(".", ",") + " milhões" : V.int(n));
  /* foto do candidato quando existir em img/fotos/<ano>/<sq>.jpg; senão, as iniciais na cor do partido */
  V.fotoBR = (ano, sq, nome, cor) => {
    const tem = window.__D && window.__D["br/fotos"] && window.__D["br/fotos"][ano] && window.__D["br/fotos"][ano].includes(+sq);
    const [bg, fg] = cor || ["#c9ccd1", "#16181d"];
    return tem ? `<img class="foto-c" alt="" loading="lazy" src="img/fotos/${ano}/${sq}.jpg">` : `<span class="foto-c foto-c--ini" style="background:${bg};color:${fg}" aria-hidden="true">${V.esc(V.iniciais(nome))}</span>`;
  };
  const FOTO_NINGUEM = '<span class="foto-c foto-c--ninguem" aria-hidden="true"><svg viewBox="0 0 40 40"><circle cx="20" cy="15" r="7" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/><path d="M6 38c1-9 7-14 14-14s13 5 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/></svg></span>';
  const PESSOA = {
    falta: '<svg viewBox="0 0 40 64" aria-hidden="true"><circle cx="20" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="4 3.2"/><path d="M5 62V40c0-9 6-15 15-15s15 6 15 15v22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="4 3.2"/></svg>',
    nulo: '<svg viewBox="0 0 40 64" aria-hidden="true"><circle cx="20" cy="12" r="9" fill="currentColor"/><path d="M5 62V40c0-9 6-15 15-15s15 6 15 15v22z" fill="currentColor"/><path d="M12 36l16 18M28 36L12 54" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>',
    branco: '<svg viewBox="0 0 40 64" aria-hidden="true"><circle cx="20" cy="12" r="9" fill="#fff" stroke="currentColor" stroke-width="2.4"/><path d="M5 62V40c0-9 6-15 15-15s15 6 15 15v22z" fill="#fff" stroke="currentColor" stroke-width="2.4"/></svg>',
  };
  const SILHUETA = '<svg viewBox="0 0 80 100" aria-hidden="true"><circle cx="40" cy="34" r="17" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 5"/><path d="M10 96c2-22 15-32 30-32s28 10 30 32" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 5"/></svg>';

  let somLigado = true; try { somLigado = localStorage.getItem("vav-som") !== "0"; } catch (e) {}
  let ctx = null;
  function bip(seq) {
    if (!somLigado) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      let t = ctx.currentTime + 0.01;
      for (const [dur, pausa] of seq) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "square"; o.frequency.value = 1960; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.01); g.gain.setValueAtTime(0.05, t + dur - 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02); t += dur + pausa;
      }
    } catch (e) {}
  }
  const BIP_TECLA = [[0.07, 0]], BIP_FIM = [[0.09, 0.05], [0.09, 0.05], [0.09, 0.05], [0.09, 0.05], [0.5, 0]];
  const ICO_SOM = (on) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${on ? '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' : '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}</svg>`;

  V.rota(/^\/$/, async function (main) {
    V.marcarNav("inicio");
    const BR = await V.baseBR();
    try { await V.dados("br/fotos"); } catch (e) {}
    const [PF24, R, N24, N18, N22, EL, C18, C20, C22, C24] = await Promise.all([V.dados("br/perfil/2024"), V.dados("br/ninguem/resumo"), V.dados("br/ninguem/PREF2024"), V.dados("br/ninguem/PRES2018"), V.dados("br/ninguem/PRES2022"), V.dados("br/ninguem/eleito2024"), ...[2018, 2020, 2022, 2024].map((a) => V.dados("br/comp/" + a))]);
    const vence = (N) => Object.values(N).filter((x) => x[1] + x[2] + x[3] > x[4]).length;
    const P = R.PREF2024, ning = P.abst + P.brancos + P.nulos, part = new Map(P.partidos), top = P.partidos[0];
    const notas = (BR.ideo.anos["2024"] || {}), nt = (sg) => (notas[sg] ? notas[sg][0] : null);

    // capitais: Ninguém contra o mais votado do 1º turno
    const caps = BR.lista.filter((c) => c.capital && N24[c.ibge]).map((c) => { const x = N24[c.ibge]; return { c, n: x[1] + x[2] + x[3], v: x[4], nome: V.titulo(x[5]), sg: x[6], sq: x[7] }; }).sort((a, b) => b.n / b.v - a.n / a.v);
    const venceu = caps.filter((x) => x.n > x.v);
    const cidadesNinguem = Object.values(N24).filter((x) => x[1] + x[2] + x[3] > x[4]).length;
    const lista = (xs) => xs.map((x) => `<li class="duelo${x.n > x.v ? " duelo--ninguem" : ""}"><a href="#/mapa/v/abst/br/${x.c.uf}/c/${x.c.ibge}">
        <span class="duelo__cidade">${V.esc(x.c.nome)} <small>${x.c.uf}</small></span>
        <span class="duelo__linha">${FOTO_NINGUEM}<span class="duelo__quem">Ninguém</span><b>${V.int(x.n)}</b><span class="duelo__trilho"><i class="ninguem-barra" style="width:${(100 * x.n) / Math.max(x.n, x.v)}%"></i></span></span>
        <span class="duelo__linha">${V.fotoBR(2024, x.sq, x.nome, V.parNota(nt(x.sg)))}<span class="duelo__quem">${V.esc(x.nome)} <small>${V.esc(x.sg)}</small></span><b>${V.int(x.v)}</b><span class="duelo__trilho"><i style="width:${(100 * x.v) / Math.max(x.n, x.v)}%;background:${V.corNota(nt(x.sg))}"></i></span></span></a></li>`).join("");

    const pf = (100 * P.abst) / ning, pn = (100 * P.nulos) / ning, pb = (100 * P.brancos) / ning;
    const capitulos = [
      ["Quem é o Ninguém", `${Math.round(pf / 10)} em cada 10 votos dele são de quem nem foi votar`, "#cap-1", true],
      ["Onde ele mora", "", "#cap-2", true],
      ["Ele é rico ou pobre?", "", "#cap-3", true],
      ["Quantos anos ele tem", "", "#cap-4", true],
      ["Preguiça ou protesto?", "", "#cap-5", true],
      ["Quem governa, com o voto de quem?", "", "#cap-6", true],
      ["E na sua cidade?", "Digite o nome e veja quem ganhou: o eleito ou o Ninguém", "#cap-cidade", true],
    ];
    // cap. 2: o tamanho do Ninguém (sobre os eleitores) por tamanho da cidade
    const pN = (x) => (100 * (x[1] + x[2] + x[3])) / x[0];
    const FX = [[0, 5e3, "até 5 mil eleitores"], [5e3, 2e4, "5 a 20 mil"], [2e4, 1e5, "20 a 100 mil"], [1e5, 5e5, "100 a 500 mil"], [5e5, 1e9, "mais de 500 mil"]];
    const porTam = FX.map(([a, b, rot]) => { let n = 0, ap = 0, k = 0; for (const x of Object.values(N24)) if (x[0] >= a && x[0] < b) { n += x[1] + x[2] + x[3]; ap += x[0]; k++; } return { rot, sub: V.int(k) + " cidades", v: (100 * n) / ap }; });
    // cap. 3: renda (PIB por habitante) em cinco grupos iguais de cidades
    const comPib = BR.lista.filter((c) => c.pib && c.pop && N24[c.ibge]).map((c) => ({ c, r: c.pib / c.pop, x: N24[c.ibge] })).sort((a, b) => a.r - b.r);
    const G = d3.range(5).map((i) => comPib.slice(Math.floor((i * comPib.length) / 5), Math.floor(((i + 1) * comPib.length) / 5)));
    const rRot = ["20% mais pobres", "2º grupo", "3º grupo", "4º grupo", "20% mais ricas"];
    const porRenda = G.map((g, i) => { let n = 0, ab = 0, bn = 0, ap = 0; for (const { x } of g) { n += x[1] + x[2] + x[3]; ab += x[1]; bn += x[2] + x[3]; ap += x[0]; } return { rot: rRot[i], v: (100 * n) / ap, ab: (100 * ab) / ap, bn: (100 * bn) / ap }; });
    // cap. 5: cada eleição, separando quem faltou de quem foi e não escolheu
    const tot = (C) => { const t = [0, 0, 0, 0, 0, 0]; for (const o of Object.values(C)) if (o.t1) o.t1.forEach((v, i) => (t[i] += v)); return t; };
    const eleicoes = [[2018, C18, "Presidente"], [2020, C20, "Prefeito"], [2022, C22, "Presidente"], [2024, C24, "Prefeito"]].map(([a, C, cg]) => { const t = tot(C); return { a, cg, ab: (100 * t[2]) / t[0], nu: (100 * t[4]) / t[0], br: (100 * t[3]) / t[0], bnC: (100 * (t[3] + t[4])) / t[1] }; });
    const e18 = eleicoes[0], e22 = eleicoes[2];
    // cap. 6: com quantos eleitores da cidade o prefeito foi eleito
    const pe = Object.entries(EL).map(([ib, [v, ap]]) => ({ ib, p: (100 * v) / ap }));
    const menosMetade = pe.filter((x) => x.p < 50).length;
    const capsEl = BR.lista.filter((c) => c.capital && EL[c.ibge]).map((c) => ({ c, p: (100 * EL[c.ibge][0]) / EL[c.ibge][1], t: EL[c.ibge][2], nome: V.titulo((N24[c.ibge] || [])[5] || "") })).sort((a, b) => a.p - b.p);
    const capsMenos = capsEl.filter((x) => x.p < 50).length;
    const elNome = {}; { const venc24 = await V.dados("br/venc/PREF2024"); for (const x of capsEl) { const w = venc24[x.c.ibge]; x.nome = w ? V.titulo(w[1]) : ""; x.sg = w ? w[2] : ""; } }
    const barrasH = (linhas, max, cor) => `<ol class="barras">${linhas.map((l) => `<li><span class="barras__rot">${l.rot}${l.sub ? `<small>${l.sub}</small>` : ""}</span><span class="barras__trilho">${l.partes ? l.partes.map((p) => `<i class="${p.cls || ""}" style="flex-basis:${(100 * p.v) / max}%${p.cor ? ";background:" + p.cor : ""}" title="${V.esc(p.tit)}"></i>`).join("") : `<i class="${cor}" style="flex-basis:${(100 * l.v) / max}%"></i>`}</span><b>${V.pct(l.v)}</b></li>`).join("")}</ol>`;
    // cap. 4: quem falta por idade e por escolaridade (2024, 1º turno)
    const idadesT = PF24.idade.filter((r) => /anos/.test(r[1])).map((r) => ({ rot: r[1].replace(" anos", "").replace(" ou mais", "+"), ap: r[2], p: (100 * r[4]) / r[2], fac: /^(16|17)\b/.test(r[1]) || +r[0] >= 7000 })).sort((a, b) => 0);
    const pIdade = (re) => { const g = PF24.idade.filter((r) => re.test(r[1])); return (100 * d3.sum(g, (r) => r[4])) / d3.sum(g, (r) => r[2]); };
    const p16 = pIdade(/^1[67] anos/), p2129 = pIdade(/^(21 a 24|25 a 29)/), p70 = pIdade(/^(7\d|8\d|9\d|100)/);
    const ESC = { "ANALFABETO": "Não sabe ler", "LÊ E ESCREVE": "Lê e escreve", "ENSINO FUNDAMENTAL INCOMPLETO": "Fundamental incompleto", "ENSINO FUNDAMENTAL COMPLETO": "Fundamental completo", "ENSINO MÉDIO INCOMPLETO": "Médio incompleto", "ENSINO MÉDIO COMPLETO": "Médio completo", "SUPERIOR INCOMPLETO": "Superior incompleto", "SUPERIOR COMPLETO": "Superior completo" };
    const escs = PF24.escolaridade.filter((r) => ESC[r[1]]).map((r) => ({ rot: ESC[r[1]], sub: mi(r[2]) + " de eleitores", v: (100 * r[4]) / r[2] }));
    const pAnalf = escs[0].v, pSup = escs[escs.length - 1].v;
    document.title = "Voto a voto · o candidato mais votado do Brasil se chama Ninguém";
    main.innerHTML = `<div class="pagina ninguem">
      <header class="ninguem__topo">
        <h1 class="ninguem__titulo">O candidato mais votado do Brasil se chama Ninguém</h1>
        <p class="ninguem__lead">É quem não foi votar, anulou ou votou em branco. Em 2024, foram <b>${mi(ning)}</b> de pessoas no 1º turno: quase o triplo do partido mais votado, o ${V.esc(top[0])}, com ${mi(top[1])}.</p>
      </header>
      <section class="urna-hero" aria-label="Urna: experimente digitar">
        <div class="urna-corpo">
          <div class="urna-tela" id="tela" aria-live="polite"></div>
          <div class="urna-teclado" role="group" aria-label="Teclado da urna">
            <div class="urna-teclado__topo"><p class="urna-teclado__marca">Voto a voto</p><button class="urna-som" id="urna-som" aria-pressed="${somLigado}" aria-label="Som da urna">${ICO_SOM(somLigado)}</button></div>
            <div class="urna-teclado__nums">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `<button class="tecla-num" data-d="${d}" aria-label="Tecla ${d}">${d}</button>`).join("")}</div>
            <div class="urna-teclado__acoes"><button class="tecla-acao tecla-acao--branco" data-a="branco">BRANCO</button><button class="tecla-acao tecla-acao--corrige" data-a="corrige">CORRIGE</button><button class="tecla-acao tecla-acao--confirma" data-a="confirma">CONFIRMA</button></div>
          </div>
        </div>
        <p class="urna-dica">Experimente: digite o número de um partido (22, 13, 55…), aperte BRANCO ou digite um número que não existe. CONFIRMA leva para a próxima parte.</p>
      </section>

      <section class="ninguem__secao" id="capitais">
        <h2 class="ninguem__h2">Em 2024, Ninguém venceu em ${venceu.length} capitais</h2>
        <p class="ninguem__sub">No 1º turno, ele teve mais votos que o candidato a prefeito mais votado em ${venceu.map((x) => x.c.nome).join(", ").replace(/, ([^,]*)$/, " e $1")}. No país todo, foram ${V.int(cidadesNinguem)} cidades.</p>
        <ol class="duelos duelos--grade">${lista(venceu)}</ol>
        <details class="duelos__mais"><summary>Ver as outras ${caps.length - venceu.length} capitais</summary><ol class="duelos duelos--grade">${lista(caps.filter((x) => x.n <= x.v))}</ol></details>
        <p class="fonte">1º turno de 2024. O mais votado do 1º turno nem sempre foi o eleito: em Belo Horizonte, por exemplo, Fuad Noman venceu no 2º turno. Brasília não elege prefeito. Fonte: TSE.</p>
      </section>

<section class="ninguem__secao" id="indice">
        <h2 class="ninguem__h2">Quem é esse Ninguém? Sete capítulos para descobrir</h2>
        <ol class="capitulos">${capitulos.map(([t, d, h, pronto], i) => `<li${pronto ? "" : ' class="capitulos--breve"'}>${pronto ? `<a href="#/" data-alvo="${h.slice(1)}">` : "<span>"}<span class="capitulos__n">${i + 1}</span><span><b>${t}</b><small>${d}</small></span>${pronto ? "</a>" : `<em>em breve</em></span>`}</li>`).join("")}</ol>
      </section>

      <section class="ninguem__secao" id="cap-1">
        <p class="ninguem__cap"><span class="digitos digitos--cap" aria-hidden="true"><b>1</b></span><span>Capítulo 1 · Quem é o Ninguém</span></p>
        <h2 class="ninguem__h2">${Math.round(pf / 10)} em cada 10 votos do Ninguém são de quem nem foi votar</h2>
        <p class="ninguem__sub">Os outros são de quem foi até a urna e não escolheu ninguém: ${mi(P.nulos)} anularam e ${mi(P.brancos)} votaram em branco.</p>
        <div class="dez" role="img" aria-label="De cada 10 votos do Ninguém, ${Math.round(pf / 10)} são de quem não foi votar">${(() => { const nf = Math.round(pf / 10), nn = Math.max(1, Math.round(pn / 10)), nb = Math.max(0, 10 - nf - nn); return [["falta", nf, nf + " não foram votar"], ["nulo", nn, nn + " anulou"], ["branco", nb, nb + " votou em branco"]].filter((g) => g[1]).map(([k, n, rot]) => `<span class="dez__g dez__g--${k}"><span class="dez__fig">${PESSOA[k].repeat(n)}</span><small>${rot}</small></span>`).join(""); })()}</div>
        <div class="composicao" role="img" aria-label="Ninguém: ${V.pct(pf)} não foram votar, ${V.pct(pn)} anularam, ${V.pct(pb)} votaram em branco">
          <div class="composicao__fatia composicao__fatia--falta" style="flex-basis:${pf}%"></div>
          <div class="composicao__fatia composicao__fatia--nulo" style="flex-basis:${pn}%"></div>
          <div class="composicao__fatia composicao__fatia--branco" style="flex-basis:${pb}%"></div>
        </div>
        <ul class="composicao__leg"><li><i class="composicao__fatia--falta"></i><b>${mi(P.abst)}</b> não foram votar · ${V.pct(pf, 0)}</li><li><i class="composicao__fatia--nulo"></i><b>${mi(P.nulos)}</b> anularam · ${V.pct(pn, 0)}</li><li><i class="composicao__fatia--branco"></i><b>${mi(P.brancos)}</b> votaram em branco · ${V.pct(pb, 0)}</li></ul>
        <p class="fonte">1º turno para prefeito, 2024, todas as cidades. Fonte: TSE.</p>
      </section>

      <section class="ninguem__secao" id="cap-2">
        <p class="ninguem__cap"><span class="digitos digitos--cap" aria-hidden="true"><b>2</b></span><span>Capítulo 2 · Onde ele mora</span></p>
        <h2 class="ninguem__h2">Nas cidades grandes, Ninguém é ${V.pct(porTam[4].v, 0)} do eleitorado; nas pequenas, ${V.pct(porTam[0].v, 0)}</h2>
        <p class="ninguem__sub">Quanto maior a cidade, maior o Ninguém. Cada cidade do mapa está pintada pela parte dos eleitores que não foi votar, anulou ou votou em branco em 2024.</p>
        <div class="cap2">
          <div class="cap2__mapa"><div id="mapa-ninguem"></div><p class="cap2__leg"><span>menos</span><i></i><span>mais Ninguém</span></p></div>
          <div>${barrasH(porTam.map((x) => ({ ...x })), 45, "ninguem-barra")}<p class="fonte">Ninguém sobre o total de eleitores da cidade, 1º turno para prefeito, 2024. Fonte: TSE.</p></div>
        </div>
      </section>

      <section class="ninguem__secao" id="cap-3">
        <p class="ninguem__cap"><span class="digitos digitos--cap" aria-hidden="true"><b>3</b></span><span>Capítulo 3 · Ele é rico ou pobre?</span></p>
        <h2 class="ninguem__h2">Nas cidades mais ricas, Ninguém é ${V.pct(porRenda[4].v, 0)} do eleitorado; nas mais pobres, ${V.pct(porRenda[0].v, 0)}</h2>
        <p class="ninguem__sub">As cidades foram divididas em cinco grupos do mesmo tamanho pela riqueza produzida por habitante (PIB per capita). Nas mais pobres, menos gente falta e menos gente anula. Uma hipótese: lá, a prefeitura pesa mais na vida de cada um.</p>
        ${barrasH(porRenda.map((x) => ({ rot: x.rot, v: x.v, partes: [{ v: x.ab, cls: "ninguem-barra", tit: "Não foram votar: " + V.pct(x.ab) }, { v: x.bn, cor: "#8f939b", tit: "Branco e nulo: " + V.pct(x.bn) }] })), 45)}
        <p class="achado__leg"><span><i class="ninguem-barra"></i>não foram votar</span><span><i style="background:#8f939b"></i>branco e nulo</span></p>
        <details class="achado__como"><summary>Como chegamos nesse número</summary><p>PIB municipal de 2021 (IBGE) dividido pela população do Censo 2022; cada grupo tem cerca de 1.110 cidades. Somamos, em cada grupo, quem faltou, anulou ou votou em branco no 1º turno de 2024 e dividimos pelo total de eleitores. É a média das cidades, não das pessoas: numa cidade rica também há eleitores pobres. A frase sobre o peso da prefeitura é uma hipótese, não algo que o dado prova.</p></details>
        <p class="fonte">Fonte: TSE e IBGE.</p>
      </section>

      <section class="ninguem__secao" id="cap-4">
        <p class="ninguem__cap"><span class="digitos digitos--cap" aria-hidden="true"><b>4</b></span><span>Capítulo 4 · Quantos anos ele tem</span></p>
        <h2 class="ninguem__h2">Quem mais vai votar tem 16 anos: só ${V.pct(idadesT[0].p, 0)} faltaram. Quem mais falta tem entre 21 e 29: ${V.pct(p2129, 0)}</h2>
        <p class="ninguem__sub">Aos 16 e 17 anos o voto é opcional: só tira o título quem quer, e quem tira, vai. A falta cresce até os vinte e poucos, cai com a idade e dispara depois dos 70, quando o voto volta a ser opcional (${V.pct(p70, 0)} de falta a partir dos 70).</p>
        <div class="idade" id="graf-idade"></div>
        <p class="achado__leg"><span><i class="ninguem-barra"></i>voto obrigatório</span><span><i style="background:#b9bcc3"></i>voto opcional (16 e 17 anos, 70 ou mais)</span></p>
        <p class="fonte">Depois dos 80, parte dessa “falta” é de quem já morreu e ainda está no cadastro eleitoral.</p>
        <h3 class="ninguem__h3">Quem não sabe ler falta ${(pAnalf / pSup).toFixed(1).replace(".", ",")} vezes mais que quem tem diploma</h3>
        <p class="ninguem__sub">Para quem não sabe ler, o voto também é opcional. Do outro lado, quem terminou a faculdade é quem menos fica em casa.</p>
        ${barrasH(escs, 45, "ninguem-barra")}
        <details class="achado__como"><summary>Como chegamos nesse número</summary><p>Arquivo de perfil do comparecimento e da abstenção do TSE, 1º turno de 2024, somando os 27 estados. A falta entre os mais velhos também inclui pessoas que já morreram e continuam no cadastro até a Justiça Eleitoral ser avisada, por isso os números acima de 80 anos são exagerados. Em 2022, para presidente, o desenho é o mesmo.</p></details>
        <p class="fonte">Parte dos eleitores de cada grupo que não foi votar. Fonte: TSE.</p>
      </section>

      <section class="ninguem__secao" id="cap-5">
        <p class="ninguem__cap"><span class="digitos digitos--cap" aria-hidden="true"><b>5</b></span><span>Capítulo 5 · Preguiça ou protesto?</span></p>
        <h2 class="ninguem__h2">Quando a disputa esquentou, o voto branco e nulo para presidente caiu pela metade. A falta, não.</h2>
        <p class="ninguem__sub">Em 2018, ${V.pct(e18.bnC)} de quem foi votar anulou ou votou em branco para presidente; em 2022, ${V.pct(e22.bnC)}. Mas a parte que nem foi votar ficou parecida: ${V.pct(e18.ab)} e ${V.pct(e22.ab)} dos eleitores. Para presidente, Ninguém venceu o mais votado em ${V.int(vence(N18))} cidades em 2018 e em só ${V.int(vence(N22))} em 2022.</p>
        ${barrasH(eleicoes.map((x) => ({ rot: String(x.a), sub: x.cg, v: x.ab + x.nu + x.br, partes: [{ v: x.ab, cls: "ninguem-barra", tit: "Não foram votar: " + V.pct(x.ab) }, { v: x.nu, cor: "#686c75", tit: "Nulos: " + V.pct(x.nu) }, { v: x.br, cor: "#c9ccd2", tit: "Brancos: " + V.pct(x.br) }] })), 35)}
        <p class="achado__leg"><span><i class="ninguem-barra"></i>não foram votar</span><span><i style="background:#686c75"></i>nulos</span><span><i style="background:#c9ccd2"></i>brancos</span></p>
        <p class="fonte">Em % dos eleitores, 1º turno; a barra vai até 35%. Fonte: TSE.</p>
      </section>

      <section class="ninguem__secao" id="cap-6">
        <p class="ninguem__cap"><span class="digitos digitos--cap" aria-hidden="true"><b>6</b></span><span>Capítulo 6 · Quem governa, com o voto de quem?</span></p>
        <h2 class="ninguem__h2">${Math.round((10 * menosMetade) / pe.length)} em cada 10 prefeitos foram eleitos com o voto de menos da metade dos eleitores da cidade</h2>
        <p class="ninguem__sub">Somando quem faltou, quem anulou, quem votou em branco e quem votou em outro candidato, ${V.int(menosMetade)} dos ${V.int(pe.length)} prefeitos eleitos em 2024 não tiveram o voto da maioria dos eleitores. Nas capitais, ${capsMenos} de ${capsEl.length}.</p>
        <ol class="governa">${capsEl.map((x) => `<li><span class="governa__cid">${V.esc(x.c.nome)} <small>${V.esc(x.nome)} · ${V.esc(x.sg)}${x.t === 2 ? " · 2º turno" : ""}</small></span><span class="governa__barra" role="img" aria-label="${V.pct(x.p)} dos eleitores"><i style="width:${x.p}%"></i><em></em></span><b>${V.pct(x.p, 0)}</b></li>`).join("")}</ol>
        <p class="achado__leg"><span><i style="background:var(--confirma)"></i>votou no eleito</span><span>a linha preta marca a metade dos eleitores</span></p>
        <p class="fonte">Votos do eleito no turno que decidiu a eleição, sobre os eleitores aptos da cidade nesse turno. Fonte: TSE.</p>
      </section>

      <section class="ninguem__secao" id="cap-cidade">
        <p class="ninguem__cap"><span class="digitos digitos--cap" aria-hidden="true"><b>7</b></span><span>Capítulo 7 · E na sua cidade?</span></p>
        <h2 class="ninguem__h2">Quem ganhou na sua cidade: o eleito ou o Ninguém?</h2>
        <div class="busca busca-grande"><label class="visualmente-oculto" for="busca-n">Sua cidade</label><input id="busca-n" type="search" role="combobox" aria-autocomplete="list" aria-controls="busca-n-lista" aria-expanded="false" autocomplete="off" placeholder="Digite o nome da sua cidade"><ul id="busca-n-lista" class="busca__lista" role="listbox" hidden></ul></div>
        <p class="urna-dica">Experimente: Teresina, Campinas, Juazeiro do Norte, a cidade onde você vota.</p>
        <div id="sua-cidade"></div>
      </section>


    </div>`;

    // ---------- índice: rolar até o capítulo sem trocar de página; descrição = o título do capítulo ----------
    const rolar = (el) => el && el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    main.querySelectorAll("[data-alvo]").forEach((a) => {
      const sec = document.getElementById(a.dataset.alvo), sm = a.querySelector("small");
      if (sm && !sm.textContent && sec) sm.textContent = sec.querySelector(".ninguem__h2").textContent;
      a.addEventListener("click", (e) => { e.preventDefault(); rolar(sec); });
    });

    // ---------- mapa do capítulo 2 ----------
    {
      const host = document.getElementById("mapa-ninguem"), Wd = 960, Hd = 900;   // mesmas medidas do desenho pronto (geo_proj)
      const vals = Object.values(N24).map(pN).sort(d3.ascending), dom = [d3.quantile(vals, 0.03), d3.quantile(vals, 0.97)];
      const cor = (v) => d3.interpolateRgbBasis(["#f3f3f1", "#cfd0d3", "#9a9da4", "#5c5f67", "#25272b"])(Math.max(0, Math.min(1, (v - dom[0]) / (dom[1] - dom[0]))));
      host.closest(".cap2__mapa").querySelector(".cap2__leg i").style.background = "linear-gradient(90deg,#f3f3f1,#cfd0d3,#9a9da4,#5c5f67,#25272b)";
      const svg = d3.select(host).append("svg").attr("viewBox", [0, 0, Wd, Hd]).attr("class", "mapa-svg").attr("role", "img").attr("aria-label", "Mapa do Brasil: parte do eleitorado de cada cidade que não foi votar, anulou ou votou em branco em 2024");
      // desenha só quando o mapa chega perto da tela; um ouvinte só para todas as cidades
      const desenha = async () => { await V.geoBR(); svg.append("g").style("cursor", "pointer").selectAll("path").data(BR.geo.mun).join("path").attr("d", (f) => f.d).attr("fill", (f) => (N24[f.id] ? cor(pN(N24[f.id])) : "#eceef1")).attr("stroke", "none");
      svg.append("path").attr("d", BR.geo.mesh).attr("fill", "none").attr("stroke", "#fff").attr("stroke-width", 1.6).attr("pointer-events", "none");
      svg.select("g").on("mousemove", (ev) => { const f = ev.target.__data__; if (!f) return; const c = BR.porIbge.get(f.id), x = N24[f.id]; if (c && x) V.dica(ev, V.linhasDica(c.nome + " (" + c.uf + ")", [["Ninguém", V.pct(pN(x)) + " dos eleitores"], ["Não foram votar", V.int(x[1])], ["Branco e nulo", V.int(x[2] + x[3])]])); })
        .on("mouseleave", () => V.dica(null, null)).on("click", (ev) => { const f = ev.target.__data__; if (!f) return; const c = BR.porIbge.get(f.id); if (c) V.ir("#/mapa/v/abst/br/" + c.uf + "/c/" + c.ibge); });
      };
      if ("IntersectionObserver" in window) { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); desenha(); } }, { rootMargin: "400px" }); io.observe(host); } else desenha();
    }

    // ---------- gráfico do capítulo 4: falta por idade ----------
    {
      const host = document.getElementById("graf-idade"), estreito = V.largura() < 640, Wd = estreito ? 360 : 980, Hd = estreito ? 260 : 300, m = { t: 26, r: 4, b: estreito ? 58 : 48, l: estreito ? 44 : 48 };
      // no celular, faixas de 10 anos para caber sem rolar
      const FX = [["16", 16, 16], ["17", 17, 17], ["18–20", 18, 20], ["21–29", 21, 29], ["30–39", 30, 39], ["40–49", 40, 49], ["50–59", 50, 59], ["60–69", 60, 69], ["70–79", 70, 79], ["80+", 80, 999]];
      const inicio = (d) => parseInt(d.rot, 10);
      const idades = estreito ? FX.map(([rot, a, b]) => { const g = idadesT.filter((d) => inicio(d) >= a && inicio(d) <= b), ap = d3.sum(g, (d) => d.ap); return { rot, ap, p: d3.sum(g, (d) => (d.p * d.ap) / 100) * 100 / ap, fac: a <= 17 || a >= 70 }; }) : idadesT;
      const x = d3.scaleBand().domain(idades.map((d) => d.rot)).range([m.l, Wd - m.r]).padding(0.18), y = d3.scaleLinear().domain([0, 100]).range([Hd - m.b, m.t]);
      const svg = d3.select(host).append("svg").attr("viewBox", [0, 0, Wd, Hd]).attr("class", "grafico").attr("role", "img").attr("aria-label", "Parte dos eleitores que faltou, por idade, 2024: " + idades.map((d) => d.rot + " " + V.pct(d.p, 0)).join(", "));
      svg.append("defs").html('<pattern id="hach-n" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="#2b2d31"/><rect width="2.5" height="7" fill="#50535c"/></pattern>');
      svg.append("g").selectAll("line").data([25, 50, 75, 100]).join("line").attr("x1", m.l).attr("x2", Wd - m.r).attr("y1", y).attr("y2", y).attr("stroke", "#e1e3e7");
      svg.append("g").selectAll("text").data([0, 25, 50, 75, 100]).join("text").attr("x", m.l - 6).attr("y", (d) => y(d) + 4).attr("text-anchor", "end").attr("class", "rot").text((d) => d + "%");
      const g = svg.append("g").selectAll("g").data(idades).join("g");
      g.append("rect").attr("x", (d) => x(d.rot)).attr("width", x.bandwidth()).attr("y", (d) => y(d.p)).attr("height", (d) => y(0) - y(d.p)).attr("rx", 3).attr("fill", (d) => (d.fac ? "#b9bcc3" : "url(#hach-n)"))
        .on("mousemove", (ev, d) => V.dica(ev, V.linhasDica(d.rot + (/\d$/.test(d.rot) ? " anos" : ""), [["Faltaram", V.pct(d.p)], ["Eleitores", V.int(d.ap)], ["Voto", d.fac ? "opcional" : "obrigatório"]]))).on("mouseleave", () => V.dica(null, null));
      g.append("text").attr("x", (d) => x(d.rot) + x.bandwidth() / 2).attr("y", (d) => y(d.p) - 6).attr("text-anchor", "middle").attr("class", "v").text((d) => Math.round(d.p));
      g.append("text").attr("x", (d) => x(d.rot) + x.bandwidth() / 2).attr("y", Hd - m.b + 16).attr("text-anchor", "middle").attr("class", "rot").text((d) => d.rot.replace(" a ", "–"));
      if (estreito) {
        svg.selectAll(".v").style("font-size", "12px");
        svg.selectAll(".rot").style("font-size", "11px");
        // no celular, "21–29" vira duas linhas: "21" e "a 29"
        g.selectAll("text.rot").each(function (d) { const [a, b] = d.rot.split("–"); if (!b) return; const t = d3.select(this).text(null), x = t.attr("x"); t.append("tspan").attr("x", x).text(a); t.append("tspan").attr("x", x).attr("dy", 12).text("a " + b); });
      }
      svg.append("text").attr("x", (m.l + Wd - m.r) / 2).attr("y", Hd - 6).attr("text-anchor", "middle").attr("class", "rot").text("idade (anos)");
    }

    // ---------- a urna funciona ----------
    const tela = document.getElementById("tela");
    let dig = "";
    const caixas = (s) => `<span class="digitos">${[0, 1].map((i) => `<b>${s[i] || ""}</b>`).join("")}</span>`;
    function pinta(estado) {
      if (estado === "branco") { tela.innerHTML = `<p class="urna-tela__cab">SEU VOTO PARA</p><p class="urna-tela__cargo">PREFEITO</p><p class="urna-tela__grande">VOTO EM BRANCO</p><p class="urna-tela__num">${mi(P.brancos)} de pessoas fizeram isso em 2024</p><p class="urna-tela__rodape">Branco não vai para nenhum candidato: hoje ele só conta como comparecimento.</p>`; return; }
      const sg = dig.length === 2 ? NUM[+dig] : null;
      if (dig.length === 2 && dig !== "00" && !sg) { tela.innerHTML = `<p class="urna-tela__cab">SEU VOTO PARA</p><p class="urna-tela__cargo">PREFEITO</p><div class="urna-tela__campos"><span>Número:</span>${caixas(dig)}</div><p class="urna-tela__grande">NÚMERO ERRADO<br>VOTO NULO</p><p class="urna-tela__num">${mi(P.nulos)} de pessoas anularam em 2024</p><p class="urna-tela__rodape">Aperte CORRIGE para voltar.</p>`; return; }
      const v = sg ? part.get(sg) || 0 : ning;
      tela.innerHTML = `<p class="urna-tela__cab">SEU VOTO PARA</p><p class="urna-tela__cargo">PREFEITO</p>
        <div class="urna-tela__corpo"><div class="urna-tela__campos"><span>Número:</span>${caixas(dig)}<span>Nome:</span><b class="urna-tela__nome">${sg ? V.esc(sg) : "NINGUÉM"}</b><span>Partido:</span><span>${sg ? V.esc(sg) : "nenhum"}</span></div>
        <div class="urna-tela__foto${sg ? "" : " urna-tela__foto--vazia"}" style="${sg ? `background:${V.parNota(nt(sg))[0]};color:${V.parNota(nt(sg))[1]}` : ""}">${sg ? `<span>${V.esc(sg.slice(0, 4))}</span>` : SILHUETA}</div></div>
        <p class="urna-tela__num"><b>${mi(v)}</b> de votos para prefeito em 2024</p>
        <p class="urna-tela__rodape">${sg ? (v ? `O Ninguém teve ${(ning / v).toFixed(1).replace(".", ",")} vezes mais.` : "Este partido não teve candidato a prefeito.") : "Quem não foi votar, anulou ou votou em branco no 1º turno."} ${dig ? "CORRIGE volta ao Ninguém." : ""}</p>`;
    }
    pinta();
    const tecla = (d) => { bip(BIP_TECLA); if (dig.length >= 2) dig = ""; dig += d; pinta(); };
    document.getElementById("urna-som").addEventListener("click", (e) => { somLigado = !somLigado; try { localStorage.setItem("vav-som", somLigado ? "1" : "0"); } catch (er) {} e.currentTarget.setAttribute("aria-pressed", somLigado); e.currentTarget.innerHTML = ICO_SOM(somLigado); if (somLigado) bip(BIP_TECLA); });
    // abertura: o nome aparece letra a letra e os votos sobem, uma vez por visita
    let viu = false; try { viu = sessionStorage.getItem("vav-urna") === "1"; sessionStorage.setItem("vav-urna", "1"); } catch (e) {}
    if (!viu && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const nomeEl = tela.querySelector(".urna-tela__nome"), votEl = tela.querySelector(".urna-tela__num b"), rod = tela.querySelector(".urna-tela__rodape");
      const alvo = nomeEl.textContent; nomeEl.textContent = ""; votEl.textContent = "0"; rod.style.visibility = "hidden";
      let i = 0; const letra = setInterval(() => { nomeEl.textContent = alvo.slice(0, ++i); if (i >= alvo.length) { clearInterval(letra); const t0 = performance.now(); const passo = (t) => { const e = d3.easeCubicOut(Math.min(1, (t - t0) / 1400)); votEl.textContent = mi(Math.round(ning * e)); if (e < 1) requestAnimationFrame(passo); else rod.style.visibility = ""; }; requestAnimationFrame(passo); } }, 90);
    }
    main.querySelectorAll(".tecla-num").forEach((b) => b.addEventListener("click", () => tecla(b.dataset.d)));
    main.querySelector('[data-a="corrige"]').addEventListener("click", () => { bip(BIP_TECLA); dig = ""; pinta(); });
    main.querySelector('[data-a="branco"]').addEventListener("click", () => { bip(BIP_TECLA); dig = ""; pinta("branco"); });
    main.querySelector('[data-a="confirma"]').addEventListener("click", () => { bip(BIP_FIM); const secs = [...main.querySelectorAll(".ninguem__secao")]; rolar(secs.find((x) => x.getBoundingClientRect().top > 90) || secs[0]); });
    document.querySelector(".urna-corpo").addEventListener("keydown", (e) => { if (/^\d$/.test(e.key)) { tecla(e.key); e.preventDefault(); } else if (e.key === "Backspace") { dig = ""; pinta(); } });

    // ---------- sua cidade ----------
    const inp = document.getElementById("busca-n"), ul = document.getElementById("busca-n-lista"), alvo = document.getElementById("sua-cidade");
    let achados = [], sel = -1;
    const mostra = (c) => {
      const x = N24[c.ibge]; achados = []; ul.hidden = true; inp.value = c.nome;
      if (!x) { alvo.innerHTML = `<p class="vazio">${V.esc(c.nome)} não teve eleição ordinária para prefeito em 2024.</p>`; return; }
      const n = x[1] + x[2] + x[3], m = Math.max(n, x[4]);
      alvo.innerHTML = `<div class="sua"><h3 class="sua__tit">${n > x[4] ? `Em ${V.esc(c.nome)}, Ninguém venceu` : `Em ${V.esc(c.nome)}, ${V.esc(V.titulo(x[5]))} venceu o Ninguém`}</h3>
        <ol class="duelos"><li class="duelo${n > x[4] ? " duelo--ninguem" : ""}"><span class="duelo__linha">${FOTO_NINGUEM}<span class="duelo__quem">Ninguém</span><b>${V.int(n)}</b><span class="duelo__trilho"><i class="ninguem-barra" style="width:${(100 * n) / m}%"></i></span></span>
        <span class="duelo__linha">${V.fotoBR(2024, x[7], V.titulo(x[5]), V.parNota(nt(x[6])))}<span class="duelo__quem">${V.esc(V.titulo(x[5]))} <small>${V.esc(x[6])}</small></span><b>${V.int(x[4])}</b><span class="duelo__trilho"><i style="width:${(100 * x[4]) / m}%;background:${V.corNota(nt(x[6]))}"></i></span></span></li></ol>
        <p class="ninguem__sub">De ${V.int(x[0])} eleitores, ${V.int(x[1])} não foram votar, ${V.int(x[3])} anularam e ${V.int(x[2])} votaram em branco (1º turno). <a href="#/mapa/br/${c.uf}/c/${c.ibge}">Ver o resultado completo no mapa</a>.</p></div>`;
    };
    const pintaLista = () => { ul.innerHTML = achados.map((c, i) => `<li role="option" aria-selected="${i === sel}" data-i="${i}"><span class="busca__ico busca__ico--cidade">${c.uf}</span><span>${V.esc(c.nome)}<br><small>${V.int(c.pop)} moradores</small></span><span></span></li>`).join(""); ul.hidden = !achados.length; inp.setAttribute("aria-expanded", String(!!achados.length)); };
    inp.addEventListener("input", () => { const q = V.norm(inp.value.trim()); sel = -1; achados = q.length < 2 ? [] : BR.lista.filter((c) => c.n.includes(q)).sort((a, b) => (b.n.startsWith(q) - a.n.startsWith(q)) || (b.pop || 0) - (a.pop || 0)).slice(0, 7); pintaLista(); });
    inp.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { sel = Math.min(achados.length - 1, sel + 1); pintaLista(); e.preventDefault(); } else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); pintaLista(); e.preventDefault(); } else if (e.key === "Enter" && achados.length) { e.preventDefault(); mostra(achados[Math.max(0, sel)]); } else if (e.key === "Escape") { achados = []; pintaLista(); } });
    ul.addEventListener("mousedown", (e) => { const li = e.target.closest("li"); if (li) { e.preventDefault(); mostra(achados[+li.dataset.i]); } });
    inp.addEventListener("blur", () => setTimeout(() => { achados = []; pintaLista(); }, 150));
  });
})();
