/* Voto a voto — os quatro diferenciais do jornal rabiscado:
   #/edicao        (em js/edicao.js) O jornal da sua cidade
   #/tira-teima    Tira-teima do grupo da família: as frases que circulam, carimbadas com os dados
   #/dinheiro      Siga o dinheiro: de onde vieram e para onde foram cada R$ 100 das campanhas
   #/cem           Se o Brasil fosse 100 eleitores
   Todos os números são calculados dos dados do site (data/br/perguntas e data/br/lobby), não escritos à mão. */
(function () {
  "use strict";
  const V = window.V;
  const nf = (d) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const N0 = nf(0), N1 = nf(1), N2 = nf(2);
  const reais = (v) => "R$ " + N2.format(v);
  const bi = (v) => "R$ " + N1.format(v / 1e9) + " bilhões";
  const mi = (v) => { const t = N1.format(v / 1e6).replace(/,0$/, ""); return t + (v / 1e6 < 2 ? " milhão" : " milhões"); };
  const L = (C, id) => (C[id] ? C[id].linhas.map((l) => Object.fromEntries(C[id].colunas.map((k, i) => [k, l[i]]))) : []);
  /* arredonda partes para somar exatamente 100 (maior resto) */
  const cem = (vs, total = 100) => { const t = vs.reduce((a, b) => a + b, 0), x = vs.map((v) => (total * v) / t), b = x.map(Math.floor); let falta = total - b.reduce((a, c) => a + c, 0);
    x.map((v, i) => [v - b[i], i]).sort((p, q) => q[0] - p[0]).forEach(([, i]) => { if (falta > 0) { b[i]++; falta--; } }); return b; };
  const MASTRO = (titulo) => `<div class="dif-mastro"><span>${titulo}</span></div>`;

  /* O jornal da sua cidade (#/edicao) mora em js/edicao.js */

  /* ===================== Tira-teima ===================== */
  V.rota(/^\/tira-teima\/?$/, async function (main) {
    V.marcarNav("perguntas");
    const [{ C }, acerta, G] = await Promise.all([V.pqCarregar(), V.dados("br/lobby/acerta"), V.geoBR()]);
    const e6 = L(C, "e6a"), f26 = e6[e6.length - 1] || {};
    const e7 = L(C, "e7a"), g7 = (gr) => e7.find((r) => r.nr_ano_eleicao === 2024 && r.ds_cargo === "VEREADOR" && r.ds_grupo === gr) || {};
    const e8 = L(C, "e8a").find((r) => r.nr_ano_eleicao === 2024 && r.ds_cargo === "VEREADOR" && r.ds_genero === "FEMININO") || {};
    const t6 = L(C, "t6c").find((r) => r.nr_ano_eleicao === 2024 && r.cd_cargo === 11) || {};
    const e5 = L(C, "e5a").filter((r) => r.ds_cargo === "DEPUTADO FEDERAL").sort((a, b) => b.nr_ano_eleicao - a.nr_ano_eleicao)[0] || {};
    const va = acerta.v.PRESIDENTE["2026"], nove = va.filter((x) => x === 9).length, mg = va.filter((x, k) => x === 9 && G.mun[k].id.startsWith("31")).length;
    const F = [
      { f: "“O fundão é dinheirinho, nem faz diferença.”", ver: "MENTIRA", r: `Em ${f26.nr_ano_eleicao}, foram ${bi(f26.vr_publico)} de dinheiro público nas campanhas: ${reais(f26.vr_por_eleitor)} por eleitor.`, n: `${N0.format(Math.round(f26.pc_publico / 10))} de cada 10 reais das campanhas` },
      { f: "“Se botar ‘Pastor’ no nome, ganha fácil.”", ver: "MENTIRA", r: `Só ${N0.format(g7("religioso").pc_eleitos)} de cada 100 candidatos a vereador com título religioso se elegeram em 2024. Sem título, ${N0.format(g7("sem título").pc_eleitos)}.`, n: "o título atrapalha mais do que ajuda" },
      { f: "“Tem partido que lança mulher só pra cumprir cota.”", ver: "TEM SINAIS", r: `Em 2024, ${N0.format(e8.qt_ate_10_com_publico)} candidatas a vereadora tiveram até 10 votos e mesmo assim receberam dinheiro público.`, n: "não prova fraude, mas acende o alerta" },
      { f: "“Se a maioria anular, a eleição é cancelada.”", ver: "MENTIRA", r: `Voto nulo e branco não entram na conta. Em 2024, ${N0.format(t6.pc_ninguem)} de cada 100 eleitores não escolheram ninguém para prefeito, e a eleição valeu com os votos dos outros.`, n: "quem decide é quem vota em alguém" },
      { f: "“Quem ganha em Minas ganha o Brasil.”", ver: "EM PARTE", r: `${N0.format(nove)} cidades votaram em quem venceu para presidente nas 9 eleições desde 1994, e ${N0.format(mg)} delas ficam em Minas Gerais.`, n: "Minas parece muito com o Brasil" },
      { f: "“Trocar de partido ajuda a se reeleger.”", ver: "MENTIRA", r: `Deputado federal que trocou de partido se reelegeu em ${N0.format(e5.pc_reeleitos_trocando)} de cada 100 casos em ${e5.nr_ano_eleicao}; quem ficou, em ${N0.format(e5.pc_reeleitos_ficando)}.`, n: "quem fica volta mais" },
      { f: "“Quase ninguém deixa de votar no Brasil.”", ver: "MENTIRA", r: `Em 2024, ${N0.format(t6.pc_abstencao)} de cada 100 eleitores não foram votar para prefeito: ${mi((t6.pc_abstencao / 100) * t6.qt_aptos)} de pessoas.`, n: "o maior “candidato” foi o Ninguém" },
    ];
    document.title = "Tira-teima · Voto a voto";
    main.innerHTML = `<div class="pagina dif-pagina">
      <header class="dif-cab"><h1 class="titulo-grande">Chegou no grupo da família? A gente confere.</h1>
        <p>As frases que mais circulam sobre eleição, carimbadas com os dados do TSE. Copie a resposta e mande de volta no grupo.</p></header>
      ${F.map((x, k) => `<article class="dif-tt">
        <div class="dif-tt__msg"><span class="dif-tt__enc">Mensagem que circula no grupo</span><span class="dif-tt__frase">${x.f}</span>${V.rCarimbo(x.ver, k % 2 ? 6 : -7)}</div>
        <div class="dif-tt__resp"><p>${x.r}</p>${V.rNota(x.n, -1.5)}<button type="button" class="btn" data-copiar="${k}">Copiar a resposta pro grupo</button><span class="dif-tt__ok" aria-live="polite"></span></div>
      </article>`).join("")}
    </div>`;
    main.querySelectorAll("[data-copiar]").forEach((b) => b.addEventListener("click", async () => {
      const x = F[+b.dataset.copiar], txt = `${x.f.replace(/[“”]/g, "")} ${x.ver}. ${x.r} (Voto a voto, dados do TSE: https://eryckkawa.github.io/voto-a-voto/#/tira-teima)`;
      const ok = b.nextElementSibling;
      try { await navigator.clipboard.writeText(txt); ok.textContent = "Copiado! É só colar no grupo."; } catch (e) { ok.textContent = txt; }
    }));
  });

  /* ===================== Siga o dinheiro ===================== */
  const NOMES_DESP = { "Publicidade por materiais impressos": "material impresso (santinho, panfleto)", "Atividades de militância e mobilização de rua": "militância e cabos eleitorais na rua",
    "Serviços prestados por terceiros": "serviços de terceiros", "Despesas com pessoal": "pessoal da campanha", "Serviços advocatícios": "advogados", "Publicidade por adesivos": "adesivos",
    "Produção de programas de rádio, televisão ou vídeo": "rádio, TV e vídeo", "Despesa com Impulsionamento de Conteúdos": "internet (impulsionamento)", "Serviços contábeis": "contador" };
  V.rota(/^\/dinheiro(?:\/(\d{4}))?\/?$/, async function (main, anoRota) {
    V.marcarNav("perguntas");
    const { C } = await V.pqCarregar();
    const Q = L(C, "q11"), E = L(C, "e6a");
    const anos = [...new Set(Q.map((r) => r.nr_ano_eleicao))].filter((a) => E.some((r) => r.nr_ano_eleicao === a)).sort();
    const ano = anoRota && anos.includes(+anoRota) ? +anoRota : anos.includes(2024) ? 2024 : anos[anos.length - 1];
    // a consulta traz só os tipos de despesa principais, cada um com a sua parte do total do ano (pc_ano); o que falta para 100 são as outras coisas
    const rows = Q.filter((r) => r.nr_ano_eleicao === ano).sort((a, b) => b.pc_ano - a.pc_ano), top = rows.slice(0, 9), resto = Math.max(0, 100 - top.reduce((s, r) => s + r.pc_ano, 0));
    const dest = [...top.map((r) => [r.pc_ano, NOMES_DESP[r.ds_origem_despesa] || r.ds_origem_despesa.toLowerCase()]), [resto, "outras coisas"]];
    const partes = cem(dest.map((d) => d[0])), pub = E.find((r) => r.nr_ano_eleicao === ano) || {}, orig = cem([pub.pc_publico, 100 - pub.pc_publico]);
    const internet = dest.findIndex((d) => /internet/.test(d[1]));
    // o desenho das faixas: 1 real = 6 unidades de altura
    const PX = 6, X1 = 250, X2 = 513, X3 = 527, X4 = 800, fita = (x1, a1, b1, x2, a2, b2) => { const m = (x1 + x2) / 2; return `M${x1},${a1} C${m},${a1} ${m},${a2} ${x2},${a2} L${x2},${b2} C${m},${b2} ${m},${b1} ${x1},${b1} Z`; };
    let svg = "", ym = 50; const y0s = [40, 40 + orig[0] * PX + 30];
    orig.forEach((v, k) => { const h = v * PX; svg += `<path d="${fita(X1, y0s[k], y0s[k] + h, X2, ym, ym + h)}" fill="${k ? "#8C887C" : "#FFE14D"}" fill-opacity="${k ? 0.35 : 0.85}"></path><rect x="${X1 - 14}" y="${y0s[k]}" width="14" height="${h}" fill="#141414"></rect>`; ym += h; });
    svg += `<rect x="${X2}" y="50" width="14" height="600" fill="#141414"></rect>`;
    let ys = 50, yd = 30;
    partes.forEach((v, k) => { const h = v * PX; svg += `<path d="${fita(X3, ys, ys + h, X4, yd, yd + h)}" fill="${k ? "#8C887C" : "#FFE14D"}" fill-opacity="${k ? 0.3 : 0.85}"></path><rect x="${X4}" y="${yd}" width="14" height="${h}" fill="#141414"></rect>
      <text x="828" y="${yd + h / 2 + 7}" class="dif-f__v">R$ ${v}</text><text x="896" y="${yd + h / 2 + 7}" class="dif-f__r">${V.esc(dest[k][1])}</text>`; ys += h; yd += h + 8; });
    const y1 = 40 + (orig[0] * PX) / 2, y2 = y0s[1] + (orig[1] * PX) / 2;
    svg += `<text x="20" y="22" class="dif-f__t">DE ONDE VEIO</text><text x="520" y="22" text-anchor="middle" class="dif-f__t">A CAMPANHA</text><text x="800" y="22" class="dif-f__t">PARA ONDE FOI</text>
      <text x="20" y="${y1}" class="dif-f__big">R$ ${orig[0]}</text><text x="20" y="${y1 + 30}" class="dif-f__r">do governo</text><text x="20" y="${y1 + 54}" class="dif-f__r">(fundo eleitoral)</text>
      <text x="20" y="${y2}" class="dif-f__mid">R$ ${orig[1]}</text><text x="20" y="${y2 + 26}" class="dif-f__r">de pessoas e do</text><text x="20" y="${y2 + 48}" class="dif-f__r">próprio candidato</text>`;
    document.title = "Siga o dinheiro · Voto a voto";
    main.innerHTML = `<div class="pagina dif-pagina">
      <header class="dif-cab"><span class="dif-ret">SIGA O DINHEIRO</span>
        <h1 class="titulo-grande">De onde vieram e para onde foram cada R$ 100 das campanhas de ${ano}</h1>
        <p>${ano % 4 ? "Deputados, senadores, governadores e presidente" : "Prefeitos e vereadores"} do Brasil inteiro. A grossura de cada faixa é o tamanho do dinheiro.</p>
        ${anos.length > 1 ? `<p class="dif-anos" role="group" aria-label="Eleição">${anos.map((a) => `<a class="chip" href="#/dinheiro/${a}"${a === ano ? ' aria-current="page"' : ""}>${a}</a>`).join("")}</p>` : ""}</header>
      <svg class="dif-fluxo" viewBox="0 0 1300 700" role="img" aria-label="De cada R$ 100: ${orig[0]} do governo e ${orig[1]} de pessoas e candidatos. Gastos: ${partes.map((v, k) => `R$ ${v} em ${dest[k][1]}`).join(", ")}.">${svg}</svg>
      <p class="dif-notas">${V.rNota(`${dest[0][1].split(" (")[0]} é o que mais leva dinheiro`, -1.5)}${internet >= 0 ? V.rNota(`e só R$ ${partes[internet]} vão para a internet!`, 1) : ""}</p>
      <section class="dif-seguir">
        <div><b>Agora siga o dinheiro do seu candidato.</b><span>Na ficha de cada candidato estão o que ele recebeu, o que gastou e de quem comprou.</span><a class="btn btn--forte" href="#/politicos">Procurar um candidato</a></div>
        ${V.rPostit("Tudo isso está na prestação de contas que cada candidato manda ao TSE. É público.", -2)}
      </section>
    </div>`;
  });

  /* ===================== Se o Brasil fosse 100 eleitores ===================== */
  V.rota(/^\/cem\/?$/, async function (main) {
    V.marcarNav("perguntas");
    const { C } = await V.pqCarregar();
    const t6 = L(C, "t6c").find((r) => r.nr_ano_eleicao === 2024 && r.cd_cargo === 11) || {};
    const q9 = L(C, "q9").find((r) => r.nr_ano_eleicao === 2024) || {};
    const m4 = L(C, "e4a").find((r) => r.nr_ano_eleicao === 2024 && r.ds_cargo === "VEREADOR") || {};
    const e6 = L(C, "e6a").find((r) => r.nr_ano_eleicao === 2024) || {};
    const vot = 100 - t6.pc_ninguem, lados = q9.pc_votos_esquerda + q9.pc_votos_centro + q9.pc_votos_direita;
    // primeiro quem votou em alguém e quem não escolheu ninguém; depois cada parte se divide (a soma fica certa nos dois níveis)
    const [nv, nn] = cem([vot, t6.pc_ninguem]), sv = cem([q9.pc_votos_direita, q9.pc_votos_centro, q9.pc_votos_esquerda], nv), sn = cem([t6.pc_branco, t6.pc_nulo, t6.pc_abstencao], nn);
    const n = [...sv, ...sn];
    const G = [["votaram em candidato de direita", "dir"], ["votaram em candidato de centro", "cen"], ["votaram em candidato de esquerda", "esq"], ["votaram em branco", "branco"], ["anularam o voto", "nulo"], ["não foram votar", "falta"]];
    const boneco = (cls) => `<svg viewBox="0 0 30 46" class="dif-boneco dif-boneco--${cls}" aria-hidden="true"><circle cx="15" cy="9" r="7"></circle><path d="M3,44 C3,26 8,19 15,19 C22,19 27,26 27,44 Z"></path>${cls === "nulo" ? '<path class="x" d="M8,24 L22,40 M22,24 L8,40"></path>' : ""}</svg>`;
    const gente = G.map(([, cls], k) => boneco(cls).repeat(n[k])).join("");
    const ninguem = n[3] + n[4] + n[5], mulheres = Math.round(m4.pc_mulheres_eleitas), publico = Math.round(e6.pc_publico);
    const bolas = (k, cls) => Array.from({ length: 100 }, (_, i) => `<span class="${i < k ? cls : ""}"></span>`).join("");
    document.title = "Se o Brasil fosse 100 eleitores · Voto a voto";
    main.innerHTML = `<div class="pagina dif-pagina">
      <header class="dif-cab"><h1 class="titulo-grande">Se o Brasil fosse 100 eleitores</h1>
        <p>A eleição para prefeito de 2024, encolhida para 100 pessoas. Cada bonequinho vale ${mi(t6.qt_aptos / 100)} de eleitores de verdade.</p></header>
      <section class="dif-cem">
        <div class="dif-cem__gente" role="img" aria-label="100 bonequinhos: ${G.map(([r], k) => n[k] + " " + r).join(", ")}">${gente}</div>
        <div class="dif-cem__lista">
          ${G.map(([r, cls], k) => `<div><b class="dif-cor--${cls}">${n[k]}</b><span>${r}</span></div>`).join("")}
          ${V.rNota(`${ninguem} de 100 não escolheram ninguém`, -2)}
          ${n[2] ? V.rNota(`${ninguem > n[2] ? `${N1.format(ninguem / n[2]).replace(",0", "")} vezes` : "menos que"} os que votaram na esquerda`, 1, "rb-nota--tinta") : ""}
        </div>
      </section>
      <section class="dif-cem__dois">
        <div><b>Se a câmara de vereadores tivesse 100 cadeiras</b><div class="dif-bolas" role="img" aria-label="${mulheres} de 100">${bolas(mulheres, "on")}</div><span>${mulheres} seriam de mulheres. No eleitorado, elas são mais da metade.</span></div>
        <div><b>Se a campanha custasse R$ 100</b><div class="dif-bolas" role="img" aria-label="${publico} de 100">${bolas(publico, "moeda")}</div><span>R$ ${publico} sairiam do governo.</span></div>
      </section>
    </div>`;
  });
})();
