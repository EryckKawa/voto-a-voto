/* Voto a voto — "Uma pergunta puxa a outra": as 25 perguntas contadas em 6 histórias (#/trilhas).
   Cada cartão é uma pergunta, com o número principal lido das consultas do banco (V.pqCarregar → C);
   entre os cartões, a pergunta que puxa a próxima; no fim de cada história, a moral.
   As faixas "Nos números" comparam grupos de cidades com as camadas do mapa das respostas (data/br/lobby). */
(function () {
  "use strict";
  const V = window.V;
  const fm = {}, N = (v, d = 0) => (fm[d] || (fm[d] = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }))).format(v);
  const P = (v, d = 0) => N(v, d) + "%";
  const mi = (v) => `R$ ${N(v / 1e6, 1)} ${v >= 2e6 ? "milhões" : "milhão"}`;
  const COR = { Dinheiro: "#9c5d16", Perfil: "#00727a", "Território": "#2f7d5b", Voto: "#2e3238", Partidos: "#7a3e9d" };
  const SETA = ['<svg viewBox="0 0 78 30" aria-hidden="true"><path d="M3,18 C20,6 48,26 70,14 M61,7 L72,14 L62,22"/></svg>', '<svg viewBox="0 0 78 30" aria-hidden="true"><path d="M3,12 C24,24 50,4 70,16 M61,9 L72,16 L61,23"/></svg>'];

  /* as histórias: título, cor, moral e a ordem das perguntas */
  const HIST = [
    { t: "De onde vem o dinheiro das campanhas", cor: "#9c5d16", ids: ["t12", "t11", "t15", "e6"], moral: "As empresas saíram e o dinheiro público entrou: hoje, quem paga a campanha é o orçamento do país." },
    { t: "Para onde vai o dinheiro", cor: "#CC1259", ids: ["t1", "e1", "t2", "e8"], moral: "Dinheiro ajuda a ganhar. E parte do dinheiro público vai para candidaturas que quase não tiveram voto." },
    { t: "O Brasil dividido ao meio", cor: "#1D3C9E", ids: ["t3", "e3", "t13", "t14", "e9"], moral: "O mapa do voto para presidente é o mapa da renda: as cidades mais pobres de um lado, as mais ricas do outro." },
    { t: "Quem chega lá", cor: "#00727a", ids: ["t4", "t10", "e4", "e2", "e5"], moral: "Quem chega lá estudou mais que o eleitor e quase sempre é homem. E, para continuar, muitos trocam de partido." },
    { t: "O voto que não conta", cor: "#2e3238", ids: ["t6", "t8", "t7", "t16"], moral: "Mais de um quarto dos eleitores não escolhe ninguém, e na cidade grande o voto de cada um pesa menos." },
    { t: "O nome e a promessa", cor: "#7a3e9d", ids: ["t5", "e7", "t9"], moral: "O sobrenome ainda pesa na cidade; o título religioso não garante voto. E as promessas seguem a moda." },
  ];
  // a pergunta do dia a dia de cada cartão e a pergunta que puxa esta (a do enunciado fica na página da pergunta)
  const PQ = { t12: ["As empresas doavam para qual lado?"], t11: ["O que mudou com a proibição?", "e foram proibidas"], t15: ["Quem passou a pagar?", "quem pagou no lugar?"], e6: ["Quanto isso custa para você?", "e quanto custa?"],
    t1: ["Quanto custa uma vaga?"], e1: ["Onde a campanha gasta?", "onde se gasta?"], t2: ["Quem tem mais bens ganha mais?", "quem tem mais, ganha?"], e8: ["Dinheiro para quem quase não teve voto?", "e quem não teve voto?"],
    t3: ["Cidade pobre vota diferente?"], e3: ["E o Bolsa Família?", "e o Bolsa Família?"], t13: ["Cada região tem um lado?", "e onde ficam?"], t14: ["A cidade muda de lado?", "e o lado muda?"], e9: ["Tem cidade que sempre acerta?", "alguma sempre acerta?"],
    t4: ["O eleito estudou mais?"], t10: ["A idade pesa?", "e a idade?"], e4: ["Quantas mulheres chegam lá?", "e as mulheres?"], e2: ["Quanto dura uma carreira?", "e depois de eleito?"], e5: ["Trocar de partido ajuda?", "para continuar?"],
    t6: ["Quantos não escolhem ninguém?"], t8: ["Quantos eleitores por vereador?", "e onde falta mais?"], t7: ["Quantos votam só no partido?", "e o voto no partido?"], t16: ["Por que candidaturas caem?", "e o voto em barrado?"],
    t5: ["O sobrenome manda?"], e7: ["Título no nome elege?", "e um título no nome?"], t9: ["O que os planos prometem?", "e o que prometem?"] };
  V.trilhaDe = (id) => { const k = HIST.findIndex((h) => h.ids.includes(id)); return k < 0 ? null : { n: k + 1, t: HIST[k].t, cor: HIST[k].cor }; };

  /* o número grande e a frase de cada cartão, lidos das consultas */
  function numeros(C, extra) {
    const T = (id) => (C[id] ? C[id].linhas.map((l) => Object.fromEntries(C[id].colunas.map((k, i) => [k, l[i]]))) : []);
    const F = (id, f) => T(id).find(f) || {}, ult = (xs, k = "nr_ano_eleicao") => xs.slice().sort((a, b) => a[k] - b[k]).pop() || {}, pri = (xs, k = "nr_ano_eleicao") => xs.slice().sort((a, b) => a[k] - b[k])[0] || {};
    const o = {};
    { const xs = T("q8b").filter((r) => r.nr_ano_eleicao === 2014 && r.ds_espectro !== "NÃO CLASSIFICADO").map((r) => r.pc_pj);
      o.t12 = [`${P(Math.min(...xs), 0)} a ${P(Math.max(...xs), 0)}`, "das campanhas de cada lado eram pagas por empresas em 2014. Nenhum lado era o preferido."]; }
    { const a = F("t11a", (r) => r.nr_ano === 2018); o.t11 = [P(a.pc_doacao_empresas, 1), "foi o que sobrou de dinheiro de empresas em 2018. Em 2015, o STF proibiu a doação."]; }
    { const r = F("t15a", (x) => x.nr_ano_eleicao === 2022 && x.ds_cargo === "DEPUTADO FEDERAL" && /^90%/.test(x.ds_faixa));
      o.t15 = [N(r.qt_candidatos), `candidatos a deputado federal viveram quase só de dinheiro público em 2022. Só ${P(r.pc_taxa_sucesso, 1)} deles se elegeram.`]; }
    { const xs = T("e6a"), a = ult(xs), z = pri(xs); o.e6 = [`R$ ${N(a.vr_por_eleitor, 2)}`, `por eleitor em ${a.nr_ano_eleicao}, somando o dinheiro público das campanhas. Em ${z.nr_ano_eleicao}, eram ${N(z.vr_por_eleitor * 100)} centavos.`]; }
    { const d = F("q1c", (r) => r.ds_cargo === "DEPUTADO FEDERAL" && r.nr_ano_eleicao === 2022), v = F("q1c", (r) => r.ds_cargo === "VEREADOR" && r.nr_ano_eleicao === 2024);
      o.t1 = [mi(d.vr_custo_por_cadeira), `por cadeira de deputado federal em 2022. A de vereador saiu por R$ ${N(v.vr_custo_por_cadeira / 1e3)} mil (2024).`]; }
    { const a = ult(T("q11")).nr_ano_eleicao, xs = T("q11").filter((r) => r.nr_ano_eleicao === a).sort((x, y) => y.pc_ano - x.pc_ano), imp = xs.find((r) => /Impulsionamento/.test(r.ds_origem_despesa)) || {};
      o.e1 = [`R$ ${N(xs[0].pc_ano)}`, `de cada R$ 100 viraram santinho e panfleto em ${a}. A internet ficou com R$ ${N(imp.pc_ano)}.`]; }
    { const xs = T("q2b").filter((r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL").sort((a, b) => a.nr_faixa - b.nr_faixa), s0 = xs[0] || {}, s1 = xs[xs.length - 1] || {};
      o.t2 = [`${Math.round(s1.pc_taxa_sucesso)} em 100`, `candidatos com mais de R$ 5 milhões viraram deputado federal em 2022. Sem bens, 1 em ${N(Math.round(s0.qt_candidatos / Math.max(1, s0.qt_eleitos)))}.`]; }
    { const a = ult(T("e8a").filter((r) => r.ds_cargo === "VEREADOR" && r.ds_genero === "FEMININO"));
      o.e8 = [mi(a.vr_publico_ate_10), `foram para ${N(a.qt_ate_10_com_publico)} candidatas a vereadora que tiveram até 10 votos em ${a.nr_ano_eleicao}.`]; }
    { const xs = T("q3b").filter((r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "PRESIDENTE").sort((a, b) => a.ds_faixa_idhm.localeCompare(b.ds_faixa_idhm));
      o.t3 = [P(xs[0].pc_mun_esquerda), `das cidades menos desenvolvidas deram a vitória à esquerda para presidente em 2022. Nas mais desenvolvidas, ${P(xs[xs.length - 1].pc_mun_esquerda)}.`]; }
    { const a = ult(T("t11c").filter((r) => r.ds_cargo === "PRESIDENTE"), "nr_ano").nr_ano, q = (n) => F("t11c", (r) => r.ds_cargo === "PRESIDENTE" && r.nr_ano === a && r.nr_quintil === n);
      o.e3 = [P(q(5).pc_esquerda_1o), `das cidades com mais Bolsa Família puseram a esquerda em 1º em ${a}. Com menos, ${P(q(1).pc_esquerda_1o)}.`]; }
    { const r = (n) => F("t13a", (x) => x.nr_ano_eleicao === 2022 && x.nm_regiao === n && !x.sg_uf);
      o.t13 = [P(r("Nordeste").pc_esquerda), `dos votos do Nordeste foram para a esquerda em 2022. No Centro-Oeste, ${P(r("Centro-Oeste").pc_direita)} foram para a direita.`]; }
    { const a = ult(T("t14b").filter((r) => r.ds_cargo === "PRESIDENTE")), nunca = F("t14a", (r) => r.ds_cargo === "PREFEITO" && r.qt_trocas === 0);
      o.t14 = [P(a.pc_mesmo_lado), `das cidades repetiram em ${a.nr_ano_eleicao} o lado de presidente da eleição anterior. Para prefeito, só ${P(nunca.pc_municipios)} nunca mudaram.`]; }
    { const n9 = Math.max(...T("e9a").map((r) => r.qt_eleicoes)), v = F("e9a", (r) => r.qt_eleicoes === n9 && r.qt_acertos === n9).qt_cidades;
      o.e9 = [N(v), `cidades votaram em quem ganhou as ${n9} eleições para presidente desde 1994.${extra.mg ? ` ${extra.mg} ficam em Minas.` : ""}`]; }
    { const e = F("t4a", (r) => r.ds_cargo === "VEREADOR" && r.ds_grupo === "eleitos" && r.nr_ano_eleicao === 2024), el = F("t4a", (r) => r.ds_cargo === "ELEITORADO" && r.nr_ano_eleicao === 2024);
      o.t4 = [P(e.pc_superior), `dos vereadores eleitos em 2024 têm diploma. Entre os eleitores, ${P(el.pc_superior)}.`]; }
    { const xs = T("t10a").sort((a, b) => a.nr_faixa - b.nr_faixa), a = xs[0], z = xs[xs.length - 1];
      o.t10 = [P(a.pc_reeleitos), `dos prefeitos com ${a.ds_idade} que tentaram de novo se reelegeram. Com ${z.ds_idade}, ${P(z.pc_reeleitos)}.`]; }
    { const a = ult(T("e4a").filter((r) => r.ds_cargo === "VEREADOR")); o.e4 = [P(a.pc_mulheres_eleitas), `dos vereadores eleitos em ${a.nr_ano_eleicao} eram mulheres. Elas foram ${P(a.pc_mulheres_candidatas)} das candidaturas.`]; }
    { const xs = T("q12b"), tot = xs.reduce((s, r) => s + r.qt_pessoas, 0), um = (xs.find((r) => r.qt_vitorias === 1) || {}).qt_pessoas || 0;
      o.e2 = [P((100 * um) / tot), "de quem já venceu uma eleição desde 1994 venceu uma só."]; }
    { const v = ult(T("e5a").filter((r) => r.ds_cargo === "VEREADOR")), d = ult(T("e5a").filter((r) => r.ds_cargo === "DEPUTADO FEDERAL"));
      o.e5 = [P(v.pc_trocaram), `dos vereadores que tentaram de novo em ${v.nr_ano_eleicao} foram por outro partido.${d.pc_reeleitos_ficando > d.pc_reeleitos_trocando ? " Para deputado federal, quem ficou voltou mais." : ""}`]; }
    { const a = ult(T("t6c").filter((r) => r.cd_cargo === 11)); o.t6 = [`${Math.round(a.pc_ninguem)} em 100`, `eleitores não escolheram ninguém para prefeito em ${a.nr_ano_eleicao}: faltaram, anularam ou votaram em branco.`]; }
    { const xs = T("t8b"), hi = xs.find((r) => r.ds_tipo === "mais eleitores por cadeira" && r.nr_ordem === 1) || {}, lo = xs.find((r) => r.ds_tipo === "menos eleitores por cadeira" && r.nr_ordem === 1) || {};
      o.t8 = [N(hi.qt_eleitores_por_cadeira), `eleitores para cada vereador em ${hi.nm_municipio}. Em ${lo.nm_municipio} (${lo.sg_uf}), ${N(lo.qt_eleitores_por_cadeira)}.`]; }
    { const xs = T("q5").filter((r) => r.ds_cargo === "DEPUTADO FEDERAL"), a = ult(xs), z = pri(xs);
      o.t7 = [P(a.pc_legenda), `dos votos para deputado federal foram só no número do partido em ${a.nr_ano_eleicao}. Em ${z.nr_ano_eleicao}, quase ${P(Math.round(z.pc_legenda))}.`]; }
    { const v = T("t16c").filter((r) => /VEREADOR|PREFEITO/.test(r.ds_grupo || "")).reduce((s, r) => s + (r.qt_votos_recebidos || 0), 0);
      o.t16 = [N(v), "votos foram para candidaturas a prefeito e vereador barradas que ainda estavam na urna, e não valeram."]; }
    { const b = F("t5a", (r) => r.nm_regiao === "Brasil"); o.t5 = [P(b.pc_com_familia), "das cidades já tiveram o mesmo sobrenome na prefeitura, com pessoas diferentes, desde 2000."]; }
    { const a = ult(T("e7a").filter((r) => r.ds_cargo === "VEREADOR")).nr_ano_eleicao, g = (x) => F("e7a", (r) => r.ds_cargo === "VEREADOR" && r.nr_ano_eleicao === a && r.ds_grupo === x).pc_eleitos;
      o.e7 = [P(g("religioso"), 1), `dos candidatos a vereador com título religioso se elegeram em ${a}. Sem título, ${P(g("sem título"), 1)}.`]; }
    { const xs = T("t9a").filter((r) => /GOVERNADOR/.test(r.ds_grupo)), a = ult(xs), z = pri(xs);
      o.t9 = [P(a.pc_inteligencia_artificial), `dos planos de governador e presidente falam de inteligência artificial em ${a.nr_ano_eleicao}. Em ${z.nr_ano_eleicao}, ${P(z.pc_inteligencia_artificial)}.`]; }
    return o;
  }

  /* "Nos números": as cidades em 5 grupos por uma camada do mapa, comparando o grupo de baixo com o de cima */
  async function extras() {
    const ex = {};
    try {
      const cam = async (k) => { const d = await V.dados("br/lobby/" + k), v = Object.values(d.v)[0], anos = Object.keys(v).sort(); return v[anos.filter((a) => v[a].filter((x) => x != null).length > 1000).pop()]; };
      const [bf, lado, cad, nin, ac, G] = await Promise.all([cam("bf"), (async () => { const d = await V.dados("br/lobby/lado"); const v = d.v.PRESIDENTE; return v[Object.keys(v).sort().pop()]; })(), cam("cadeira"),
        (async () => { const d = await V.dados("br/lobby/ninguem"); const v = d.v.PREFEITO; return v[Object.keys(v).sort().pop()]; })(), cam("acerta"), V.geoBR()]);
      const grupos = (x, y) => { const ps = x.map((a, i) => [a, y[i]]).filter(([a, b]) => a != null && b != null).sort((p, q) => p[0] - q[0]), q = Math.floor(ps.length / 5); return [ps.slice(0, q).map((p) => p[1]), ps.slice(-q).map((p) => p[1])]; };
      const dir = (ys) => (100 * ys.filter((v) => v > 0).length) / ys.length, med = (ys) => { const s = ys.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
      const [b0, b1] = grupos(bf, lado); ex.e3 = `Em ${Object.keys((await V.dados("br/lobby/lado")).v.PRESIDENTE).sort().pop()}, a direita venceu em ${N(dir(b1))} de cada 100 cidades com mais Bolsa Família, e em ${N(dir(b0))} de cada 100 com menos.`;
      const [c0, c1] = grupos(cad, nin); ex.t8 = `Nas cidades pequenas, ${N(med(c0))} em cada 100 eleitores não escolheram ninguém; nas grandes, ${N(med(c1))}.`;
      const n9 = Math.max(...ac.filter((v) => v != null)); ex.mg = G.mun.filter((f, i) => ac[i] >= n9 && String(f.id).startsWith("31")).length;
    } catch (e) { console.warn("trilhas: faixas dos números não carregaram", e); }
    return ex;
  }

  function cartao(id, b, num, k, chip) {
    const cor = COR[b.grupo] || "#141414", rot = id.startsWith("t") ? `Tema ${id.slice(1)}` : `Pergunta +${id.slice(1)}`;
    return `<a class="tr-cartao" href="#/perguntas/${id}" style="border-top-color:${cor}"><span class="tr-cartao__tag"><span style="color:${cor}">${rot}</span><span>${b.grupo}</span></span>
      <span class="tr-cartao__q">${PQ[id][0]}</span><span class="tr-cartao__n">${k === 0 ? V.rCirculo(num[0]) : num[0]}</span><span class="tr-cartao__a">${num[1]}</span>
      ${chip ? `<span class="tr-cartao__d"><b>Nos números</b>${chip}</span>` : ""}<span class="tr-cartao__ir">Ler a resposta →</span></a>`;
  }

  /* as 6 histórias dentro de um lugar da página (a primeira página das Perguntas) */
  V.trilhasMontar = async function (host) {
    if (!host) return;
    const [{ C, temas }, ex] = await Promise.all([V.pqCarregar(), extras()]);
    if (!host.isConnected) return;
    const porId = Object.fromEntries(temas.map((t) => [t.id, t])), num = numeros(C, ex);
    const nav = HIST.map((h, k) => `<a href="#/perguntas" data-tr="${k}" style="border-top-color:${h.cor}"><b style="color:${h.cor}">${k + 1}</b><span>${h.t}</span><small>${h.ids.length} perguntas</small></a>`).join("");
    const caps = HIST.map((h, k) => `<section class="tr-cap" id="trilha-${k + 1}" aria-labelledby="tr-t${k}">
        <div class="tr-cap__cab"><span class="tr-cap__n" style="color:${h.cor}" aria-hidden="true">${k + 1}</span><div><h2 id="tr-t${k}">${h.t}</h2><span>${h.ids.length} perguntas, da esquerda para a direita</span></div></div>
        <div class="tr-fila">${h.ids.map((id, j) => (j ? `<div class="tr-liga" aria-hidden="true"><span>${PQ[id][1] || ""}</span>${SETA[j % 2]}</div>` : "") + cartao(id, porId[id] || { grupo: "" }, num[id], j, ex[id])).join("")}</div>
        <div class="tr-moral">${V.rPostit(`<b>A moral da história:</b> ${h.moral}`, k % 2 ? -1.5 : 1.2).replace("<aside", "<div").replace("</aside>", "</div>")}</div></section>`).join("");
    host.innerHTML = `<nav class="tr-mapa" aria-label="As 6 histórias">${nav}</nav>${caps}`;
    host.querySelectorAll("[data-tr]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); document.getElementById("trilha-" + (+a.dataset.tr + 1)).scrollIntoView({ behavior: "smooth", block: "start" }); }));
  };
  // o endereço antigo leva à primeira página das Perguntas, que agora abre com as histórias
  V.rota(/^\/trilhas\/?$/, async function () { location.replace("#/perguntas"); });
})();
