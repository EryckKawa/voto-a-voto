/* Voto a voto — os 16 temas do enunciado (questoes_analise_dados_eleitorais), respondidos com o Brasil inteiro.
   Cada número sai de uma consulta de scripts/consultas_brasil.sql, rodada no banco nacional (eleicoes_brasil.duckdb)
   por scripts/rodar_consultas.py, que grava as linhas em data/br/perguntas.json. A página mostra a resposta em uma
   frase, os pontos principais, o gráfico e de onde vêm os números; o SQL fica no arquivo, não na página. */
(function () {
  "use strict";
  const V = window.V;
  const pct = (v, d) => V.pct(v, d);
  const N1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const N2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /* dinheiro por extenso, para os títulos */
  // o plural vale para o número arredondado que aparece ("R$ 2 milhões", mesmo que o valor seja 1,96 milhão)
  const r1 = (x) => Math.round(x * 10) / 10;
  const reais = (v) => (v == null ? "—" : v >= 1e9 ? `R$ ${N1.format(v / 1e9)} ${r1(v / 1e9) >= 2 ? "bilhões" : "bilhão"}` : v >= 1e6 ? `R$ ${N1.format(v / 1e6)} ${r1(v / 1e6) >= 2 ? "milhões" : "milhão"}` : v >= 1e3 ? `R$ ${V.int(Math.round(v / 1e3))} mil` : `R$ ${V.int(Math.round(v))}`);
  const centavos = (v) => (v == null ? "—" : `R$ ${N2.format(v)}`);
  const vezes = (a, b) => { const r = a / b; return r >= 2 ? `${N1.format(r).replace(/,0$/, "")} vezes` : `${pct(100 * (r - 1), 0)} a mais`; };
  const vezesN = (a, b) => `${N1.format(a / b).replace(/,0$/, "")} vezes`;
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const milhoes = (v) => `${N1.format(v / 1e6).replace(/,0$/, "")} milhões`;
  /* nota de −1 (esquerda) a +1 (direita), com sinal: "+0,20", "−0,35" */
  const nota = (v, d = 2) => (v == null ? "—" : (v > 0.0005 ? "+" : v < -0.0005 ? "−" : "") + Math.abs(v).toFixed(d).replace(".", ","));
  /* correlação de Pearson, com duas casas: "0,77" */
  const corr = (v) => (v == null ? "—" : (v < 0 ? "−" : "") + Math.abs(v).toFixed(2).replace(".", ","));
  const anos1 = (v) => `${N1.format(v)} anos`;
  const CARGOS_NOTA = [["PRES", 1, "Presidente", "#16181d"], ["GOV", 3, "Governador", "#4f6fb3"], ["SEN", 5, "Senador", "#7a5aa6"], ["DF", 6, "Deputado federal", "#9c5d16"], ["DE", 7, "Deputado estadual", "#c99a52"], ["PREF", 11, "Prefeito", "#2f7d5b"], ["VER", 13, "Vereador", "#79b394"]];
  const CARGO = { PRESIDENTE: "Presidente", "DEPUTADO FEDERAL": "Deputado federal", "DEPUTADO ESTADUAL": "Deputado estadual", PREFEITO: "Prefeito", VEREADOR: "Vereador", SENADOR: "Senador", GOVERNADOR: "Governador" };
  const ESP5 = ["ESQUERDA", "CENTRO-ESQUERDA", "CENTRO", "CENTRO-DIREITA", "DIREITA"];
  const COR = { esq: V.ESPC.ESQUERDA, cen: V.ESPC.CENTRO, dir: V.ESPC.DIREITA, escuro: "#16181d", azul: "#4f6fb3", cinza: "#c9ccd1", terra: "#9c5d16", verde: "#2f7d5b" };
  const corEsp = (e) => V.ESPC[e] || COR.cen;
  const GH = "https://github.com/EryckKawa/voto-a-voto/blob/main/scripts/consultas_brasil.sql";

  /* resultado de uma consulta como lista de objetos (consulta que falta vira lista vazia) */
  const linhasDe = (c) => (c ? c.linhas.map((l) => Object.fromEntries(c.colunas.map((k, i) => [k, l[i]]))) : []);
  // os mesmos formatos servem para "Mais números" (js/detalhes.js)
  V.pqUtil = { pct, reais, vezes, cap1, nota, corr, anos1, CARGO, linhasDe, N1 };

  /* duas (ou mais) barras por linha: um tema, dois grupos */
  function paresHTML(linhas, { nomes, cores, max, fmt = (v) => pct(v) }) {
    const mx = max || Math.max(...linhas.flatMap((l) => l.v.filter((v) => v != null)));
    return `<ol class="pares">${linhas.map((l) => `<li><span class="pares__rot">${l.rot}${l.sub ? `<small>${l.sub}</small>` : ""}</span><span class="pares__lins">
      ${l.v.map((v, i) => `<span class="pares__lin"><small>${nomes[i]}</small><span class="barras__trilho"><i style="flex-basis:${v == null ? 0 : Math.max(0, (100 * v) / mx)}%;background:${cores[i]}"></i></span><b>${v == null ? "—" : fmt(v)}</b></span>`).join("")}</span></li>`).join("")}</ol>`;
  }
  const tabelaHTML = (t, rot) => `<div class="pq__tabela pq__tabela--leitura" tabindex="0" role="region" aria-label="${V.esc(rot)}"><table><caption class="visualmente-oculto">${V.esc(rot)}</caption>
      <thead><tr>${t.cols.map((c, i) => `<th scope="col"${i ? ' class="num"' : ""}>${V.esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${t.linhas.map((l) => `<tr>${l.map((v, i) => (i ? `<td class="num">${v}</td>` : `<th scope="row">${v}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;

  /* texto branco ou escuro, o que tiver mais contraste com o fundo (regra WCAG): devolve [cor, contraste] */
  const lum = (c) => { const { r, g, b } = d3.rgb(c); return [r, g, b].map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0); };
  const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const melhorTexto = (bg) => [["#ffffff", contraste(bg, "#ffffff")], ["#16181d", contraste(bg, "#16181d")]].sort((a, b) => b[1] - a[1])[0];

  /* mapa de calor (tema 13): estados nas linhas, eleições nas colunas; a cor é o campo que teve mais votos */
  function calorHTML(R) {
    const anos = [...new Set(R.map((r) => r.nr_ano_eleicao))].sort();
    const REG = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
    const cel = (r) => {
      if (!r) return '<td class="calor__vazio">—</td>';
      // o campo com mais votos dá a cor; quanto maior a parte dele, mais forte
      const [l, v, base] = [["E", r.pc_esquerda, V.ESPC.ESQUERDA], ["C", r.pc_centro, V.ESPC.CENTRO], ["D", r.pc_direita, V.ESPC.DIREITA]].sort((a, b) => b[1] - a[1])[0];
      let f = Math.max(0.15, Math.min(1, (v - 35) / 40)), cor = d3.interpolateRgb("#ffffff", base)(f), txt = melhorTexto(cor);
      if (txt[1] < 4.5) { f = 1; cor = base; txt = melhorTexto(cor); }   // tom do meio: usa a cor cheia, para o número ser legível
      return `<td style="background:${cor};color:${txt[0]}" title="${r.nr_ano_eleicao}: esquerda ${pct(r.pc_esquerda, 0)}, centro ${pct(r.pc_centro, 0)}, direita ${pct(r.pc_direita, 0)}">${l} ${Math.round(v)}</td>`;
    };
    const linha = (rot, cls, sel) => `<tr class="${cls}"><th scope="row">${rot}</th>${anos.map((a) => cel(R.find((r) => r.nr_ano_eleicao === a && sel(r)))).join("")}</tr>`;
    const corpo = [linha("Brasil", "calor__br", (r) => r.nm_regiao === "Brasil"),
      ...REG.flatMap((g) => [linha(g, "calor__reg", (r) => r.nm_regiao === g && !r.sg_uf),
        ...[...new Set(R.filter((r) => r.nm_regiao === g && r.sg_uf).map((r) => r.sg_uf))].sort().map((uf) => linha(uf, "", (r) => r.sg_uf === uf))])];
    return `<div class="calor" tabindex="0" role="region" aria-label="Mapa de calor: vantagem da direita ou da esquerda para presidente, por estado e eleição">
      <table><caption class="visualmente-oculto">Vantagem em pontos percentuais da direita (D) ou da esquerda (E) no 1º turno para presidente</caption>
      <thead><tr><th scope="col">Estado</th>${anos.map((a) => `<th scope="col">${a}</th>`).join("")}</tr></thead><tbody>${corpo.join("")}</tbody></table></div>`;
  }

  /* ---------- as respostas que já existiam (Q1 a Q12): os gráficos e os números de cada uma ---------- */
  function montarAntigas(C) {
    const G = V.graf, leg = G.leg;
    /* cada gráfico devolve o desenho e a mesma informação em tabela (botão Gráfico | Tabela) */
    const barras = (l, o = {}) => {
      let html = G.barras(l, o); if (o.total) html = html.replace("<li>", '<li class="barras__total">');
      const temSub = l.some((x) => x.sub), c = o.cols || ["", "", "Valor"];
      const cols = [c[0], ...(temSub ? [c[1]] : []), ...(o.nomesPartes || [c[2]])];
      const fp = o.fmtParte || ((v) => pct(v, 0));
      return { html, tab: { cols, linhas: l.map((x) => [x.rot, ...(temSub ? [x.sub || ""] : []), ...(o.nomesPartes ? x.partes.map((p) => fp(p.v)) : [x.vTxt || pct(x.v)])]) } };
    };
    const linhas = (o) => { const f = o.fmtPonto || o.fmt || ((v) => pct(v));
      return { html: G.linhas(o), tab: { cols: ["Ano", ...o.series.map((x) => x.nome)], linhas: o.anos.map((a, i) => [String(a), ...o.series.map((x) => (x.v[i] == null ? "—" : f(x.v[i])))]) } }; };
    /* linhas da nota (−1 esquerda, +1 direita): zero marcado e as faixas de esquerda e direita sombreadas */
    const linhasNota = (o) => linhas({ min: -0.5, max: 0.5, meio: 0, fmt: (v) => nota(v), fmtPonto: (v) => nota(v), fmtEixo: (t) => nota(t), faixas: [[-1, -0.25, COR.esq], [0.25, 1, COR.dir]], ...o });
    const pares = (l, o) => {
      const temSub = l.some((x) => x.sub), c = o.cols || [""], f = o.fmt || ((v) => pct(v));
      return { html: paresHTML(l, o), tab: { cols: [c[0], ...(temSub ? [c[1] || ""] : []), ...o.nomes.map(cap1)], linhas: l.map((x) => [x.rot, ...(temSub ? [x.sub || ""] : []), ...x.v.map((v) => (v == null ? "—" : f(v)))]) } };
    };
    const Q = { G, leg, barras, linhas, linhasNota, pares };

    // ---------- Q1. custo por cadeira ----------
    {
      const tot = linhasDe(C.q1b), part = linhasDe(C.q1), med = linhasDe(C.q1c);
      const t = (a, cg) => tot.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg);
      const m = (a, cg) => med.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg) || {};
      const CG_MED = [[2022, "PRESIDENTE"], [2022, "GOVERNADOR"], [2022, "SENADOR"], [2022, "DEPUTADO FEDERAL"], [2022, "DEPUTADO ESTADUAL"], [2024, "PREFEITO"], [2024, "VEREADOR"]];
      const vistaMedia = (campo, rot, nt) => ({ rot, graf: () => barras(CG_MED.map(([a, cg]) => m(a, cg)).filter((r) => r[campo] != null).map((r) => ({ rot: `${CARGO[r.ds_cargo] || r.ds_cargo} ${r.nr_ano_eleicao}`, sub: `${V.int(r.qt_candidatos)} candidatos · ${V.int(r.qt_eleitos)} ${r.qt_eleitos === 1 ? "eleito" : "eleitos"}`, v: r[campo], vTxt: V.brl(r[campo]) })),
        { cor: COR.terra, cols: ["Cargo", "Candidatos e eleitos", rot] }), nota: nt });
      const vista = (a, cg) => ({ rot: `Por partido · ${CARGO[cg]} ${a}`, graf: () => {
        // os 12 partidos com mais cadeiras, do mais caro para o mais barato
        const ps = part.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg).sort((x, y) => y.qt_cadeiras - x.qt_cadeiras).slice(0, 12).sort((x, y) => y.vr_custo_por_cadeira - x.vr_custo_por_cadeira);
        const media = t(a, cg);
        return barras([{ rot: "Todos os partidos", sub: `${V.int(media.qt_cadeiras)} cadeiras`, v: media.vr_custo_por_cadeira, vTxt: V.brl(media.vr_custo_por_cadeira) },
          ...ps.map((r) => ({ rot: r.sg_partido, sub: `${V.int(r.qt_cadeiras)} ${r.qt_cadeiras === 1 ? "cadeira" : "cadeiras"}`, v: r.vr_custo_por_cadeira, vTxt: V.brl(r.vr_custo_por_cadeira) }))], { cor: COR.escuro, total: true, cols: ["Partido", "Cadeiras", "Custo por cadeira"] });
      }, nota: "Os 12 partidos que ganharam mais cadeiras, do mais caro para o mais barato. O custo junta o gasto de todos os candidatos do partido, eleitos ou não." });
      Q.q1 = { t, m, vistas: [vistaMedia("vr_custo_por_cadeira", "Custo por cadeira, cargo a cargo", "Soma do gasto de todos os candidatos ÷ número de eleitos: quanto custa vencer."),
        vistaMedia("vr_gasto_medio_candidato", "Gasto médio por candidato", "Soma do gasto ÷ número de candidatos do cargo: quanto custa, em média, disputar. Inclui quem não declarou gasto nenhum."),
        vista(2022, "DEPUTADO FEDERAL"), vista(2024, "VEREADOR"),
        vistaMedia("vr_custo_por_mes_mandato", "Por mês de mandato", "Custo por cadeira dividido pelos meses de mandato: 48 meses, 96 para senador.")] };
    }

    // ---------- Q2. patrimônio, dinheiro de campanha e sucesso ----------
    {
      const R = linhasDe(C.q2), B = linhasDe(C.q2b), M = linhasDe(C.q2c);
      const QN = ["20% com menos dinheiro", "2º grupo", "3º grupo", "4º grupo", "20% com mais dinheiro"];
      const de = (a, cg) => R.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg);
      const bens = (a, cg) => B.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg);
      const med = (a, cg, res) => M.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg && r.ds_resultado === res) || {};
      const vistaBens = (a, cg) => ({ rot: `${CARGO[cg]} ${a}`, graf: () => barras(bens(a, cg).map((r) => ({ rot: cap1(r.ds_faixa), sub: `${V.int(r.qt_candidatos)} candidatos`, v: r.pc_taxa_sucesso })), { cor: COR.terra, max: 100, cols: ["Bens declarados", "Candidatos", "Eleitos"] }),
        nota: "A barra vai até 100%: a parte dos candidatos de cada faixa de patrimônio que se elegeu." });
      const vistaCamp = (a, cg) => ({ rot: `Dinheiro de campanha · ${CARGO[cg]} ${a}`, graf: () => barras(de(a, cg).map((r) => ({ rot: QN[r.nr_quintil - 1], sub: `média de ${V.brl(r.vr_receita_media)}`, v: r.pc_taxa_sucesso })), { cor: COR.escuro, max: 100, cols: ["Grupo de candidatos", "Receita média", "Eleitos"] }),
        nota: "Os candidatos do cargo em cinco grupos do mesmo tamanho, pelo dinheiro que arrecadaram. A barra vai até 100%: a parte de cada grupo que se elegeu." });
      Q.q2 = { de, bens, med, vistas: [vistaBens(2022, "DEPUTADO FEDERAL"), vistaBens(2024, "PREFEITO"), vistaBens(2024, "VEREADOR")], vistaCamp };
    }

    // ---------- Q3. IDHM, renda e campo político ----------
    {
      const R = linhasDe(C.q3), I = linhasDe(C.q3b), K = linhasDe(C.q3c);
      const RN = { "1 pobre": "pobre", "2 intermediário": "renda média", "3 rico": "rica" }, PN = { "1": "Pequena", "2": "Média", "3": "Grande" };
      const ach = (a, p, r) => R.find((x) => x.nr_ano_eleicao === a && x.ds_porte.startsWith(p) && x.ds_renda === r) || {};
      const idh = (a, cg) => I.filter((x) => x.nr_ano_eleicao === a && x.ds_cargo === cg);
      const k = (a, cg) => K.find((x) => x.nr_ano_eleicao === a && x.ds_cargo === cg) || {};
      const PARTES = (x) => [["pc_mun_esquerda", COR.esq, "Esquerda em 1º"], ["pc_mun_centro", COR.cen, "Centro em 1º"], ["pc_mun_direita", COR.dir, "Direita em 1º"]].map(([c, cor, t]) => ({ v: x[c], cor, tit: `${t}: ${pct(x[c], 0)} das cidades` }));
      const LEG = leg([[COR.esq, "Esquerda em 1º"], [COR.cen, "Centro em 1º"], [COR.dir, "Direita em 1º"]]);
      const vistaI = (a, cg) => ({ rot: `IDHM · ${cap1(CARGO[cg] || cg.toLowerCase())} ${a}`, legenda: LEG, graf: () => barras(idh(a, cg).map((x) => { const [nm, fx] = x.ds_faixa_idhm.slice(2).split(" ("); return { rot: `IDHM ${nm}`, sub: `${fx.replace(")", "")} · ${V.int(x.qt_municipios)} cidades`, v: 100, vTxt: pct(x.pc_mun_esquerda, 0), partes: PARTES(x) }; }),
          { max: 100, cols: ["IDHM da cidade", "Faixa e cidades"], nomesPartes: ["Esquerda em 1º", "Centro em 1º", "Direita em 1º"] }),
        nota: "O número à direita é a parte das cidades com a esquerda em 1º. Faixas de IDHM do PNUD; as 32 cidades de IDHM muito baixo estão junto com as de IDHM baixo." });
      const INDS = [["r_idhm", "IDHM"], ["r_idhm_educacao", "IDHM Educação"], ["r_renda_per_capita", "Renda por habitante (Atlas)"], ["r_pib_per_capita", "PIB por habitante (IBGE)"], ["r_populacao", "Número de habitantes"]];
      const kP = k(2022, "PRESIDENTE"), kG = k(2022, "GOVERNADOR"), kM = k(2024, "PREFEITO");
      const vistaK = { rot: "O que mais separa o voto", legenda: leg([[COR.escuro, "Presidente 2022"], [COR.azul, "Governador 2022"], [COR.cinza, "Prefeito 2024"]]),
        graf: () => pares(INDS.map(([c, tt]) => ({ rot: tt, v: [kP[c], kG[c], kM[c]] })), { nomes: ["presidente 2022", "governador 2022", "prefeito 2024"], cores: [COR.escuro, COR.azul, COR.cinza], max: 1, fmt: corr, cols: ["Indicador da cidade"] }),
        nota: "Correlação, cidade a cidade, entre o indicador e a nota média dos votos: 0 é nenhuma relação, 1 é relação total. Positiva: quanto maior o indicador, mais à direita a cidade votou." };
      const vistaR = (a, rot) => ({ rot, legenda: LEG, graf: () => barras(R.filter((x) => x.nr_ano_eleicao === a).map((x) => ({ rot: `${PN[x.ds_porte[0]]} e ${RN[x.ds_renda]}`, sub: `${V.int(x.qt_municipios)} cidades · faltaram ${pct(x.pc_abstencao_media, 0)}`, v: 100, vTxt: pct(x.pc_mun_esquerda, 0),
          partes: PARTES(x) })), { max: 100, cols: ["Tamanho e renda", "Cidades e faltas"], nomesPartes: ["Esquerda em 1º", "Centro em 1º", "Direita em 1º"] }),
        nota: "O número à direita é a parte das cidades com a esquerda em 1º. Pequena: até 20 mil habitantes; média: até 100 mil; grande: mais de 100 mil." });
      Q.q3 = { ach, idh, kP, kG, kM, vistas: [vistaI(2022, "PRESIDENTE"), vistaI(2022, "GOVERNADOR"), vistaI(2024, "PREFEITO"), vistaK, vistaR(2022, "Renda e tamanho · Governador 2022"), vistaR(2024, "Renda e tamanho · Prefeito 2024")] };
    }

    // ---------- Q4. escolaridade da cidade x escolaridade dos eleitos ----------
    {
      const R = linhasDe(C.q4).filter((r) => r.nr_ordem === 8), E = linhasDe(C.q4b), K = linhasDe(C.q4c)[0] || {};
      const PN = ["Até 20 mil habitantes", "De 20 a 100 mil", "Mais de 100 mil"];
      const eq = (cg) => E.filter((r) => r.ds_cargo === cg);
      const QE = ["20% com IDHM Educação mais baixo", "2º grupo", "3º grupo", "4º grupo", "20% com IDHM Educação mais alto"];
      const N3 = (v) => v.toFixed(3).replace(".", ",");
      const LEG = leg([[COR.cinza, "Entre os candidatos"], [COR.escuro, "Entre os eleitos"]]);
      const vistaE = (cg) => ({ rot: `Escolaridade da cidade · ${CARGO[cg]}`, legenda: LEG, graf: () => pares(eq(cg).map((r) => ({ rot: QE[r.nr_quintil - 1], sub: `IDHM Educação de ${N3(r.vr_idhm_e_min)} a ${N3(r.vr_idhm_e_max)} · ${pct(r.pc_adultos_superior_2010, 0)} dos adultos com diploma`, v: [r.pc_candidatos_superior, r.pc_eleitos_superior] })),
          { nomes: ["candidatos", "eleitos"], cores: [COR.cinza, COR.escuro], max: 100, cols: ["Cidades", "IDHM Educação e adultos com diploma"] }),
        nota: `Parte com superior completo, ${cg === "PREFEITO" ? "prefeitos" : "vereadores"}, eleição de 2024. Cidades em cinco grupos do mesmo tamanho pelo IDHM Educação (Censo 2010).` });
      Q.q4 = { R, eq, K, vistas: [vistaE("VEREADOR"), vistaE("PREFEITO"), { rot: "Tamanho da cidade", legenda: LEG, graf: () => pares(R.map((r, i) => ({ rot: PN[i], v: [r.pc_candidatos_no_porte, r.pc_eleitos_no_porte] })), { nomes: ["candidatos", "eleitos"], cores: [COR.cinza, COR.escuro], max: 100, cols: ["Tamanho da cidade"] }),
          nota: "Parte com superior completo, prefeito e vereador, eleição de 2024." }] };
    }

    // ---------- Q5. voto de legenda ----------
    {
      const R = linhasDe(C.q5), P = linhasDe(C.q5b);
      const s = (cg) => R.filter((r) => r.ds_cargo === cg);
      const fed = s("DEPUTADO FEDERAL"), est = s("DEPUTADO ESTADUAL"), ver = s("VEREADOR");
      Q.q5 = { fed, est, ver, P, vistas: [{ rot: "Ao longo do tempo", legenda: leg([[COR.escuro, "Deputado federal"], [COR.azul, "Deputado estadual"]]),
        graf: () => linhas({ anos: fed.map((r) => r.nr_ano_eleicao), max: 16, rot: "Parte dos votos que foi só no número do partido",
          series: [{ nome: "Deputado federal", curto: "Federal", cor: COR.escuro, grossa: true, v: fed.map((r) => r.pc_legenda) }, { nome: "Deputado estadual", curto: "Estadual", cor: COR.azul, grossa: true, v: est.map((r) => r.pc_legenda) }] }),
        nota: "Parte dos votos válidos para o cargo (nominais mais legenda), 1º turno. 1998 fica de fora: o arquivo do TSE daquele ano não separa o voto de legenda." },
        { rot: "Partido a partido (2022)", graf: () => barras(P.slice(0, 14).map((r) => ({ rot: V.nomePartido(r.sg_partido), sub: `${milhoes(r.qt_votos_total)} de votos`, v: r.pc_legenda, partes: [{ v: r.pc_legenda, cor: corEsp(r.ds_espectro), tit: V.ESPN[r.ds_espectro] || "sem nota" }] })), { max: 12, cols: ["Partido", "Votos", "Legenda"], nomesPartes: ["Legenda"], fmtParte: (v) => pct(v) }),
          nota: "Parte dos votos de cada partido para deputado federal em 2022 que foi só na legenda. Partidos com mais de 500 mil votos, na cor do seu campo político." }] };
    }

    // ---------- Q6. planos de governo ----------
    {
      const R = linhasDe(C.q6), W = linhasDe(C.q6b);
      const e = R.find((r) => r.ds_bloco === "esquerda") || {}, d = R.find((r) => r.ds_bloco === "direita") || {};
      const TEMAS = [["pc_racial", "Racismo ou igualdade racial"], ["pc_reforma_agraria", "Reforma agrária"], ["pc_privatizacao", "Privatização"], ["pc_desigualdade", "Desigualdade"], ["pc_agronegocio", "Agronegócio"], ["pc_armas", "Armas"], ["pc_seguranca", "Segurança pública"], ["pc_meio_ambiente", "Meio ambiente"], ["pc_impostos", "Impostos"], ["pc_familia", "Família"]]
        .map(([k, t]) => ({ k, t, dif: e[k] - d[k] })).sort((a, b) => b.dif - a.dif);
      const qt = (b, w) => (W.find((x) => x.ds_bloco === b && x.palavra === w) || {}).qt || 0;
      const NB = linhasDe(C.q6d), NP = linhasDe(C.q6c), NT = linhasDe(C.q6e);
      const BLOCOS = [["esquerda", COR.esq, "Esquerda"], ["centro", COR.cen, "Centro"], ["direita", COR.dir, "Direita"]];
      const nuvemDe = (ls, cor, rot, n = 40) => G.nuvem(ls.slice(0, n).map((x) => ({ w: x.ds_palavra || x.palavra, q: x.qt, cor, tit: `${x.ds_palavra || x.palavra}: ${V.int(x.qt)} vezes, em ${V.int(x.qt_planos_com_palavra)} planos` })), { rot, max: 36 });
      const tabPal = (grupos) => ({ cols: ["Grupo", "Palavras mais usadas (vezes)"], linhas: grupos.map(([g, ls]) => [g, ls.slice(0, 15).map((x) => `${V.esc(x.ds_palavra || x.palavra)} (${V.int(x.qt)})`).join(", ")]) });
      const vistaNuvemCargo = (cg) => ({ rot: `Nuvem · ${CARGO[cg]}`, graf: () => {
        const gs = BLOCOS.map(([b, cor, nome]) => { const ls = NB.filter((x) => x.ds_cargo === cg && x.ds_bloco === b); return { b, cor, nome, ls, n: ls.length ? ls[0].qt_planos : 0 }; }).filter((g) => g.ls.length);
        return { html: `<div class="nuvens">${gs.map((g) => `<figure class="nuvens__item"><figcaption><b style="color:${g.cor}">${g.nome}</b> · ${V.int(g.n)} planos</figcaption>${nuvemDe(g.ls, g.cor, `Palavras dos planos da ${g.nome.toLowerCase()} para ${CARGO[cg].toLowerCase()}`, 30)}</figure>`).join("")}</div>`,
          tab: tabPal(gs.map((g) => [`${g.nome} (${V.int(g.n)} planos)`, g.ls])) }; },
        nota: "As palavras mais usadas nos planos de governo de cada campo político, fora as comuns a qualquer plano (governo, município, programa...). Quanto maior, mais vezes aparece." });
      const vistaTipicas = (cg) => ({ rot: `Típicas · ${CARGO[cg]}`, graf: () => {
        const gs = BLOCOS.map(([b, cor, nome]) => ({ b, cor, nome, ls: NT.filter((x) => x.ds_cargo === cg && x.ds_bloco === b) })).filter((g) => g.ls.length);
        return { html: `<div class="nuvens">${gs.map((g) => `<figure class="nuvens__item"><figcaption><b style="color:${g.cor}">${g.nome}</b> · ${V.int(g.ls[0].qt_planos)} planos</figcaption>${G.nuvem(g.ls.map((x) => ({ w: x.ds_palavra || x.palavra, q: Math.round(100 * x.vr_destaque), cor: g.cor, tit: `${x.ds_palavra || x.palavra}: ${N1.format(x.vr_destaque)} vezes a média do cargo` })), { rot: `Palavras típicas da ${g.nome.toLowerCase()} para ${CARGO[cg].toLowerCase()}`, max: 32 })}</figure>`).join("")}</div>`,
          tab: { cols: ["Grupo", "Palavras típicas (vezes a média do cargo)"], linhas: gs.map((g) => [`${g.nome} (${V.int(g.ls[0].qt_planos)} planos)`, g.ls.slice(0, 15).map((x) => `${V.esc(x.ds_palavra || x.palavra)} (${N1.format(x.vr_destaque)})`).join(", ")]) } }; },
        nota: "As palavras que cada campo usa bem mais que a média do cargo. Mostra o que separa os campos; a nuvem das mais usadas mostra o que eles têm em comum." });
      const partidosN = [...new Set(NP.map((x) => x.sg_partido))].slice(0, 12);
      const vistaNuvemPartido = { rot: "Nuvem · por partido", graf: () => {
        const gs = partidosN.map((sg) => { const ls = NP.filter((x) => x.sg_partido === sg), n = ls[0].vr_nota_partido; return { sg, ls, cor: n == null ? COR.escuro : V.ESPC[n < -0.5 ? "ESQUERDA" : n < -0.25 ? "CENTRO-ESQUERDA" : n <= 0.25 ? "CENTRO" : n <= 0.5 ? "CENTRO-DIREITA" : "DIREITA"] }; });
        return { html: `<div class="nuvens nuvens--partidos">${gs.map((g) => `<figure class="nuvens__item"><figcaption><b style="color:${g.cor}">${V.esc(V.nomePartido(g.sg))}</b> · ${V.int(g.ls[0].qt_planos)} planos</figcaption>${nuvemDe(g.ls, g.cor, `Palavras dos planos do ${g.sg}`, 20)}</figure>`).join("")}</div>`,
          tab: tabPal(gs.map((g) => [`${V.nomePartido(g.sg)} (${V.int(g.ls[0].qt_planos)} planos)`, g.ls])) }; },
        nota: "Os 12 partidos com mais planos de governo entregues (presidente, governador e prefeito, 2018 a 2026). As 20 palavras mais usadas por cada um." };
      Q.q6 = { e, d, qt, vistas: [{ rot: "Esquerda × direita · presidente", legenda: leg([[COR.esq, `Esquerda (${e.qt_planos} planos)`], [COR.dir, `Direita (${d.qt_planos} planos)`]]),
            graf: () => pares(TEMAS.map((x) => ({ rot: x.t, v: [e[x.k], d[x.k]] })), { nomes: ["esquerda", "direita"], cores: [COR.esq, COR.dir], max: 100, fmt: (v) => pct(v, 0), cols: ["Tema"] }),
            nota: "Parte dos planos de presidente (2018, 2022 e 2026) que cita o tema pelo menos uma vez." },
          ...["PREFEITO", "GOVERNADOR"].filter((cg) => NB.some((x) => x.ds_cargo === cg)).map(vistaNuvemCargo),
          ...["PREFEITO"].filter((cg) => NT.some((x) => x.ds_cargo === cg)).map(vistaTipicas),
          ...(NP.length ? [vistaNuvemPartido] : [])] };
    }

    // ---------- Q7. idade: jovem vota em jovem? ----------
    {
      const R = linhasDe(C.q7), J = linhasDe(C.q7c), D = linhasDe(C.q7d);
      const anos = [...new Set(R.map((r) => r.nr_ano_eleicao))].filter((a) => a % 4 === 0);
      const g = (a, f) => R.find((r) => r.nr_ano_eleicao === a && r.ds_faixa === f) || {};
      const jq = (a) => J.filter((r) => r.nr_ano_eleicao === a);
      const d = (a, cg) => D.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg) || {};
      const QJ = ["20% com eleitorado mais velho", "2º grupo", "3º grupo", "4º grupo", "20% com eleitorado mais jovem"];
      const LEGJ = leg([[COR.cinza, "No eleitorado"], [COR.azul, "Entre os vereadores eleitos"]]);
      const vistaJ = (a) => ({ rot: `Jovem vota em jovem? (${a})`, legenda: LEGJ, graf: () => pares(jq(a).map((r) => ({ rot: QJ[r.nr_quintil - 1], sub: `${V.int(r.qt_municipios)} cidades · eleitor com ${anos1(r.vr_idade_media_eleitorado)} em média`, v: [r.pc_eleitorado_ate_29, r.pc_eleitos_ate_29] })),
          { nomes: ["no eleitorado", "entre os eleitos"], cores: [COR.cinza, COR.azul], max: 40, cols: ["Cidades", "Idade média do eleitor"] }),
        nota: `Parte com até 29 anos. Cidades em cinco grupos do mesmo tamanho pela parte do eleitorado com até 29 anos (TSE, ${a}); vereadores eleitos no mesmo ano.` });
      const CG7 = [[2024, "VEREADOR"], [2024, "PREFEITO"], [2022, "DEPUTADO ESTADUAL"], [2022, "DEPUTADO FEDERAL"], [2022, "GOVERNADOR"], [2022, "SENADOR"]];
      const vistaIdade = { rot: "Idade de quem vota e de quem é eleito", legenda: leg([[COR.cinza, "Eleitor"], [COR.escuro, "Eleito"]]), graf: () => pares(CG7.map(([a, cg]) => { const r = d(a, cg); return { rot: `${CARGO[cg]} ${a}`, sub: `${V.int(r.qt_eleitos)} eleitos`, v: [r.vr_idade_media_eleitorado, r.vr_idade_media_eleitos] }; }),
          { nomes: ["eleitor", "eleito"], cores: [COR.cinza, COR.escuro], max: 70, fmt: anos1, cols: ["Cargo", "Eleitos"] }),
        nota: "Idade média do eleitorado apto (TSE) e dos eleitos na data da posse. A barra vai até 70 anos." };
      const vistaSucesso = { rot: "Chance do jovem se eleger", legenda: leg([[COR.azul, "Até 29 anos"], [COR.escuro, "30 anos ou mais"]]), graf: () => pares(anos.map((a) => ({ rot: String(a), sub: `${V.int(g(a, "jovem").qt_candidatos)} candidatos jovens`, v: [g(a, "jovem").pc_sucesso, g(a, "não jovem").pc_sucesso] })), { nomes: ["até 29 anos", "30 ou mais"], cores: [COR.azul, COR.escuro], cols: ["Ano", "Candidatos jovens"] }),
        nota: "Parte dos candidatos a prefeito e vereador que se elegeu, nas eleições municipais." };
      Q.q7 = { g, jq, d, vistas: [vistaJ(2024), vistaIdade, vistaSucesso] };
    }

    // ---------- Q8. empresas ----------
    {
      const R = linhasDe(C.q8), E = linhasDe(C.q8b).filter((r) => r.ds_espectro !== "NÃO CLASSIFICADO");
      const vista = (a) => ({ rot: String(a), graf: () => barras(ESP5.map((k) => E.find((r) => r.nr_ano_eleicao === a && r.ds_espectro === k)).filter(Boolean).map((r) => ({ rot: V.ESPN[r.ds_espectro], sub: `${reais(r.vr_doacao_pj)} de empresas`, v: r.pc_pj, partes: [{ v: r.pc_pj, cor: corEsp(r.ds_espectro), tit: V.ESPN[r.ds_espectro] }] })), { max: 50, cols: ["Campo político", "Doação de empresas", "Parte da receita"], nomesPartes: ["Parte da receita"] }),
        nota: "Parte da receita dos candidatos de cada campo que veio de empresas. A barra vai até 50%." });
      Q.q8 = { R, E, vistas: [vista(2014), vista(2012), vista(2010), { rot: "Antes e depois da proibição", graf: () => barras(R.map((r) => ({ rot: String(r.nr_ano_eleicao), sub: reais(r.vr_doacao_pj), v: r.pc_pj })), { cor: COR.terra, max: 50, cols: ["Ano", "Doação de empresas", "Parte da receita"] }), nota: "Parte de toda a receita dos candidatos que veio de empresas, por ano. O Supremo proibiu a doação de empresas em 2015." }] };
    }

    // ---------- Q9. para que lado ----------
    {
      const R = linhasDe(C.q9);
      const s = (t) => R.filter((r) => r.tp_abrangencia === t);
      const Gr = s("GERAL"), M = s("MUNICIPAL");
      const ser = (L) => [["pc_votos_esquerda", "Esquerda", COR.esq], ["pc_votos_centro", "Centro", COR.cen], ["pc_votos_direita", "Direita", COR.dir]].map(([k, nome, cor]) => ({ nome, cor, grossa: true, v: L.map((r) => r[k]) }));
      const NB = linhasDe(C.q9b), nb = (cd, a) => (NB.find((r) => r.cd_cargo === cd && r.nr_ano_eleicao === a) || {}).vr_nota_brasil;
      const serNota = (anosS, cgs) => CARGOS_NOTA.filter(([, cd]) => cgs.includes(cd)).map(([, cd, nome, cor]) => ({ nome, cor, grossa: true, curto: nome.replace("Deputado ", "Dep. "), curtoM: nome.replace("Deputado federal", "Fed.").replace("Deputado estadual", "Est.").replace("Presidente", "Pres.").replace("Governador", "Gov.").replace("Senador", "Sen."), v: anosS.map((a) => nb(cd, a) ?? null) }));
      const anosG = [1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026], anosM = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
      const legNota = (cds) => leg(CARGOS_NOTA.filter(([, cd]) => cds.includes(cd)).map(([, , nome, cor]) => [cor, nome]));
      const LEG3 = leg([[COR.esq, "Esquerda e centro-esquerda"], [COR.cen, "Centro"], [COR.dir, "Direita e centro-direita"]]);
      Q.q9 = { Gr, M, nb, vistas: [{ rot: "Presidente", legenda: LEG3, graf: () => linhas({ anos: Gr.map((r) => r.nr_ano_eleicao), series: ser(Gr), max: 80, rot: "Votos para presidente por lado, 1º turno" }), nota: "Parte dos votos nominais do 1º turno para presidente, por campo político do partido na época." },
          { rot: "Prefeito", legenda: LEG3, graf: () => linhas({ anos: M.map((r) => r.nr_ano_eleicao), series: ser(M), max: 80, rot: "Votos para prefeito por lado, 1º turno" }), nota: "Soma dos votos de todas as cidades no 1º turno." },
          { rot: "Nota · eleições gerais", legenda: legNota([1, 3, 5, 6, 7]), graf: () => linhasNota({ anos: anosG, series: serNota(anosG, [1, 3, 5, 6, 7]), rot: "Nota média dos votos por cargo, eleições gerais, 1º turno" }),
            nota: "Nota média dos votos de todo o Brasil: −1 é tudo na esquerda, +1 tudo na direita. O arquivo de votos por partido do TSE não traz presidente, governador e senador em 1994, nem presidente em 1998." },
          { rot: "Nota · eleições municipais", legenda: legNota([11, 13]), graf: () => linhasNota({ anos: anosM, series: serNota(anosM, [11, 13]), rot: "Nota média dos votos por cargo, eleições municipais, 1º turno" }),
            nota: "Nota média dos votos de todas as cidades, de −1 (esquerda) a +1 (direita)." }] };
    }

    // ---------- Q10. dinheiro público ----------
    {
      const R = linhasDe(C.q10), F = linhasDe(C.q10b);
      const g = (a, cg, res) => R.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg && r.ds_resultado === res) || {};
      const fx = (a, cg) => F.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg);
      const vistaFaixa = (a, cg) => ({ rot: `Fundo e vitória · ${CARGO[cg]} ${a}`, graf: () => barras(fx(a, cg).map((r) => ({ rot: cap1(r.ds_faixa), sub: `${V.int(r.qt_candidatos)} candidatos · média de ${V.brl(r.vr_publico_medio)}`, v: r.pc_taxa_sucesso })),
        { cor: COR.escuro, max: 100, cols: ["Dinheiro público recebido", "Candidatos e média", "Eleitos"] }),
        nota: "A barra vai até 100%: a parte dos candidatos de cada faixa que se elegeu. Quem recebeu algum dinheiro público está em cinco grupos do mesmo tamanho; quem não recebeu nada, à parte." });
      const vista = (a, cg) => ({ rot: `Eleitos × não eleitos · ${CARGO[cg]} ${a}`, legenda: leg([[COR.escuro, "Dinheiro público (fundos)"], [COR.cinza, "Dinheiro privado"]]), graf: () => barras(["eleito", "não eleito"].map((res) => { const r = g(a, cg, res);
          return { rot: res === "eleito" ? "Eleitos" : "Não eleitos", sub: `${V.int(r.qt_candidatos)} candidatos · ${pct(r.pc_publico, 0)} público`, v: r.vr_publico_medio + r.vr_privado_medio, vTxt: V.brl(r.vr_publico_medio + r.vr_privado_medio),
            partes: [{ v: r.vr_publico_medio, cor: COR.escuro, tit: `Dinheiro público: ${V.brl(r.vr_publico_medio)} em média` }, { v: r.vr_privado_medio, cor: COR.cinza, tit: `Dinheiro privado: ${V.brl(r.vr_privado_medio)} em média` }] }; }), { cols: ["Resultado", "Candidatos"], nomesPartes: ["Dinheiro público, média", "Dinheiro privado, média"], fmtParte: V.brl }),
        nota: "Receita média por candidato. Dinheiro público: Fundo Especial de Financiamento de Campanha e Fundo Partidário." });
      Q.q10 = { g, fx, vistas: [vista(2022, "DEPUTADO FEDERAL"), vista(2024, "VEREADOR"), ...(F.length ? [vistaFaixa(2022, "DEPUTADO FEDERAL"), vistaFaixa(2024, "VEREADOR")] : [])] };
    }

    // ---------- Q11. despesas ----------
    {
      const R = linhasDe(C.q11);
      const ano = (a) => R.filter((r) => r.nr_ano_eleicao === a);
      const NOME = (s) => s.replace("Despesa com Impulsionamento de Conteúdos", "Impulsionamento nas redes").replace("Publicidade por materiais impressos", "Material impresso").replace("Atividades de militância e mobilização de rua", "Militância e cabos eleitorais").replace("Produção de programas de rádio, televisão ou vídeo", "Rádio, TV e vídeo").replace("Doações financeiras a outros candidatos/partidos", "Repasse a outros candidatos");
      const vista = (a) => ({ rot: String(a), graf: () => barras(ano(a).slice(0, 8).map((r) => ({ rot: NOME(r.ds_origem_despesa), sub: reais(r.vr_total), v: r.pc_ano })), { cor: COR.escuro, max: 25, cols: ["Despesa", "Valor", "Parte do total"] }),
        nota: "As oito maiores categorias, em parte do total gasto no ano. A barra vai até 25%." });
      const TB = linhasDe(C.q11b), TC = linhasDe(C.q11c);
      const COR_T = [null, "#16181d", "#0f5fb5", "#7a5aa6", "#d96a12", "#c99a52", "#2f7d5b", "#9c5d16", "#8b929c", "#b7bcc4", "#d6dae0", "#e9ebee"];
      const tipos = (ls) => [...new Map(ls.map((r) => [r.nr_tipo, r.ds_tipo])).entries()].sort((x, y) => x[0] - y[0]);
      const pilha = (ls, campo, chave, rots, a) => { const ts = tipos(ls.filter((r) => r.nr_ano_eleicao === a));
        return barras(rots.map(([k, rot]) => { const rs = ls.filter((r) => r.nr_ano_eleicao === a && r[chave] === k);
          return rs.length ? { rot, sub: reais(rs.reduce((s, r) => s + r.vr_total, 0)), v: 100, vTxt: pct((rs.find((r) => r.nr_tipo === 1) || {})[campo] || 0, 0),
            partes: ts.map(([t, nome]) => { const r = rs.find((x) => x.nr_tipo === t); return { v: r ? r[campo] : 0, cor: COR_T[t], tit: `${nome}: ${pct(r ? r[campo] : 0)}` }; }) } : null; }).filter(Boolean),
          { max: 100, cols: ["", "Total"], nomesPartes: ts.map(([, n]) => n) }); };
      const legT = (ls, a) => leg(tipos(ls.filter((r) => r.nr_ano_eleicao === a)).map(([t, n]) => [COR_T[t], n]));
      const CGS = (a) => (a % 4 ? [["PRESIDENTE", "Presidente"], ["GOVERNADOR", "Governador"], ["SENADOR", "Senador"], ["DEPUTADO FEDERAL", "Deputado federal"], ["DEPUTADO ESTADUAL", "Deputado estadual"]] : [["PREFEITO", "Prefeito"], ["VEREADOR", "Vereador"]]);
      const p24 = (cg, t) => (TB.find((r) => r.nr_ano_eleicao === 2024 && r.ds_cargo === cg && r.nr_tipo === t) || {}).pc_cargo;
      const net = (b, a) => (TC.find((r) => r.nr_ano_eleicao === a && r.ds_bloco === b && r.nr_tipo === 2) || {}).pc_propaganda;
      Q.q11 = { ano, p24, net, vistas: [vista(2024), vista(2022), vista(2018),
        ...(TB.length ? [{ rot: "Por cargo 2024", legenda: legT(TB, 2024), graf: () => pilha(TB, "pc_cargo", "ds_cargo", CGS(2024), 2024), nota: "Cada barra é todo o gasto do cargo, dividido pelo tipo de despesa; o número à direita é a parte do material impresso." }] : []),
        ...(TC.length ? [{ rot: "Por lado 2022", legenda: legT(TC, 2022), graf: () => pilha(TC, "pc_propaganda", "ds_bloco", [["esquerda", "Esquerda"], ["centro", "Centro"], ["direita", "Direita"]], 2022), nota: "Só o gasto com propaganda, dividido pelo tipo, para os candidatos de cada campo político." }] : [])] };
    }

    // ---------- Q12. carreira ----------
    {
      const R = linhasDe(C.q12), B = linhasDe(C.q12b), T = linhasDe(C.q12c), K = linhasDe(C.q12e);
      const ger = R.filter((r) => r.tp_abrangencia === "GERAL"), mun = R.filter((r) => r.tp_abrangencia === "MUNICIPAL");
      const graf = (L) => () => pares(L.map((r) => ({ rot: String(r.nr_ano), sub: `${V.int(r.qt_eleitos)} eleitos`, v: [r.pc_eleito_de_novo_4_anos, r.pc_eleito_de_novo_8_anos] })), { nomes: ["4 anos depois", "8 anos depois"], cores: [COR.escuro, COR.azul], max: 100, fmt: (v) => pct(v, 0), cols: ["Eleitos em", "Eleitos"] });
      const LEG = leg([[COR.escuro, "Eleito de novo 4 anos depois"], [COR.azul, "8 anos depois"]]);
      const vistaCam = (gov) => ({ rot: `Câmara · ${gov.split(" ")[0]}`, legenda: leg([[COR.cinza, "Segue o próprio partido"], [COR.escuro, "Segue o governo"]]),
        graf: () => pares(K.filter((r) => r.ds_governo === gov).sort((a, b) => b.pc_segue_governo - a.pc_segue_governo).map((r) => ({ rot: V.nomePartido(r.sg_partido), sub: `${V.int(r.qt_deputados)} deputados`, v: [r.pc_segue_partido, r.pc_segue_governo] })),
          { nomes: ["partido", "governo"], cores: [COR.cinza, COR.escuro], max: 100, fmt: (v) => pct(v, 0), cols: ["Partido", "Deputados"] }),
        nota: `Votos dos deputados de cada partido iguais à orientação da própria bancada e à do líder do governo, nas votações de mérito do Plenário no governo ${gov}.` });
      const govs = [...new Set(K.map((r) => r.ds_governo))].sort().reverse();
      Q.q12 = { R, B, T, ger, mun, vistas: [{ rot: "Deputado, senador e governador", legenda: LEG, graf: graf(ger), nota: "Eleito de novo na eleição geral seguinte, para qualquer desses cargos." }, { rot: "Prefeito e vereador", legenda: LEG, graf: graf(mun), nota: "Para 2020, a volta de 8 anos depois ainda não aconteceu (2028)." }, ...govs.map(vistaCam)] };
    }
    return Q;
  }

  /* ---------- os 16 temas do enunciado (e as duas perguntas a mais do grupo) ---------- */
  function montarTemas(C, Q) {
    const { G, leg, barras, linhas, pares } = Q;
    const L = (id) => linhasDe(C[id]);
    const T = [];
    const tema = (o) => T.push(o);
    const lista = (xs) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1]);
    const vistaTabela = (rot, cols, linhasT, nt) => ({ rot, graf: () => { const t = { cols, linhas: linhasT }; return { html: tabelaHTML(t, rot), tab: t }; }, nota: nt });

    // ---------- Tema 1 ----------
    {
      const f22 = Q.q1.t(2022, "DEPUTADO FEDERAL") || {}, f18 = Q.q1.t(2018, "DEPUTADO FEDERAL") || {}, v24 = Q.q1.t(2024, "VEREADOR") || {}, p24 = Q.q1.t(2024, "PREFEITO") || {};
      const mF = Q.q1.m(2022, "DEPUTADO FEDERAL");
      const quint = Q.q2.de(2022, "DEPUTADO FEDERAL"), q5 = quint[4] || {}, q1 = quint[0] || {};
      const P = L("t1a"), B = L("t1b"), E = L("t1c");
      const pf = P.filter((r) => r.ds_cargo === "DEPUTADO FEDERAL"), caro = pf[0] || {}, barato = pf[pf.length - 1] || {};
      const b = (cg, bl) => B.find((r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === cg && r.ds_bloco === bl) || {};
      const bT = b("DEPUTADO FEDERAL", "todos"), bE = b("DEPUTADO FEDERAL", "esquerda"), bC = b("DEPUTADO FEDERAL", "centro"), bD = b("DEPUTADO FEDERAL", "direita");
      const e = (cg, o) => E.find((r) => r.ds_cargo === cg && r.nr_ordem === o) || {};
      const eSup = e("DEPUTADO FEDERAL", 8), eMed = e("DEPUTADO FEDERAL", 6);
      const vistaPartido = (a, cg) => ({ rot: `Gasto por voto · ${CARGO[cg]} ${a}`, legenda: leg(ESP5.map((k) => [V.ESPC[k], V.ESPN[k]])), graf: () => barras(P.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg).map((r) => ({ rot: V.nomePartido(r.sg_partido), sub: `${milhoes(r.qt_votos)} de votos · ${V.int(r.qt_eleitos)} eleitos`, v: r.vr_gasto_por_voto, vTxt: centavos(r.vr_gasto_por_voto),
          partes: [{ v: r.vr_gasto_por_voto, cor: corEsp(r.ds_espectro), tit: `${V.ESPN[r.ds_espectro] || "sem nota"} (nota ${nota(r.vr_nota)})` }] })), { cols: ["Partido", "Votos e eleitos", "Gasto por voto"], nomesPartes: ["Gasto por voto"], fmtParte: centavos }),
        nota: "Tudo o que os candidatos do partido gastaram ÷ todos os votos que eles receberam no 1º turno. Do mais caro para o mais barato; cada barra na cor do campo político do partido. Partidos com 5 ou mais eleitos." });
      const CGS = [["GOVERNADOR", "Governador"], ["SENADOR", "Senador"], ["DEPUTADO FEDERAL", "Deputado federal"], ["DEPUTADO ESTADUAL", "Deputado estadual"]];
      const vistaCampo = { rot: "Gasto por voto · por campo (2022)", legenda: leg([[COR.esq, "Esquerda"], [COR.cen, "Centro"], [COR.dir, "Direita"]]),
        graf: () => pares(CGS.map(([cg, nm]) => ({ rot: nm, sub: `correlação gasto × votos: ${corr(b(cg, "todos").r_gasto_votos)}`, v: ["esquerda", "centro", "direita"].map((bl) => b(cg, bl).vr_gasto_por_voto) })), { nomes: ["esquerda", "centro", "direita"], cores: [COR.esq, COR.cen, COR.dir], fmt: centavos, cols: ["Cargo", "Correlação"] }),
        nota: "Gasto de todos os candidatos de cada campo ÷ os votos que receberam, eleição de 2022. A correlação (de 0 a 1) mostra quanto o gasto de cada candidato acompanha os votos dele." };
      const vistaEsc = (cg, a) => ({ rot: `Escolaridade e gasto · ${CARGO[cg]} ${a}`, legenda: leg([[COR.terra, "Gasto médio por candidato"]]), graf: () => barras(E.filter((r) => r.ds_cargo === cg).map((r) => ({ rot: cap1(r.ds_grau_instrucao.toLowerCase()), sub: `${V.int(r.qt_candidatos)} candidatos · ${pct(r.pc_taxa_sucesso)} se elegeram`, v: r.vr_gasto_medio, vTxt: V.brl(r.vr_gasto_medio) })), { cor: COR.terra, cols: ["Escolaridade", "Candidatos e eleitos", "Gasto médio"] }),
        nota: "Gasto médio de campanha por candidato, pela escolaridade que ele declarou ao TSE." });
      tema({ id: "t1", n: 1, grupo: "Dinheiro", titulo: "Custos de campanha e eleição", antigas: ["q1"],
        enunciado: ["Quanto custa, em média, uma cadeira eletiva?", "Analisar o gasto de campanha dos candidatos.", "Avaliar a relação entre o gasto de campanha e o resultado eleitoral (eleito ou não eleito).", "Calcular o coeficiente entre gasto de campanha e número de votos e elaborar um ranking, inclusive considerando o viés ideológico.", "Relacionar escolaridade e custo médio da eleição."],
        curta: `Deputado federal: ${reais(f22.vr_custo_por_cadeira)} por cadeira em 2022. Vereador: ${reais(v24.vr_custo_por_cadeira)} em 2024.`,
        num: reais(f22.vr_custo_por_cadeira), numRot: "por cadeira de deputado federal em 2022",
        resposta: `Uma cadeira de deputado federal custou ${reais(f22.vr_custo_por_cadeira)} em 2022, ${vezes(f22.vr_custo_por_cadeira, f18.vr_custo_por_cadeira)} o custo de 2018. Uma de vereador, ${reais(v24.vr_custo_por_cadeira)} em 2024`,
        pontos: [
          `<b>Custo por cadeira</b> é tudo o que os candidatos gastaram ÷ número de eleitos. Prefeito em 2024: ${reais(p24.vr_custo_por_cadeira)}. Pela outra conta, o gasto médio de cada candidato a deputado federal foi de ${reais(mF.vr_gasto_medio_candidato)}.`,
          `<b>Gasto e resultado andam juntos.</b> Entre os candidatos a deputado federal com mais dinheiro (os 20% do topo), ${pct(q5.pc_taxa_sucesso, 0)} se elegeram; entre os 20% com menos, ${q1.pc_taxa_sucesso < 0.05 ? "praticamente nenhum" : pct(q1.pc_taxa_sucesso)}.`,
          `<b>Coeficiente gasto × votos:</b> a correlação, candidato a candidato, foi de ${corr(bT.r_gasto_votos)} para deputado federal em 2022 (1 seria relação perfeita). E quem perde paga mais caro por voto: o eleito típico gastou ${centavos(bT.vr_por_voto_eleito_mediano)} por voto; o não eleito, ${centavos(bT.vr_por_voto_nao_eleito_mediano)}.`,
          `<b>Ranking por partido:</b> o voto mais caro para deputado federal foi o do ${V.nomePartido(caro.sg_partido)} (${centavos(caro.vr_gasto_por_voto)}); o mais barato, o do ${V.nomePartido(barato.sg_partido)} (${centavos(barato.vr_gasto_por_voto)}). Por campo político: esquerda ${centavos(bE.vr_gasto_por_voto)}, centro ${centavos(bC.vr_gasto_por_voto)}, direita ${centavos(bD.vr_gasto_por_voto)} por voto.`,
          `<b>Escolaridade e custo:</b> o candidato a deputado federal com curso superior gastou em média ${reais(eSup.vr_gasto_medio)}; o com ensino médio, ${reais(eMed.vr_gasto_medio)}. O de curso superior também se elegeu mais: ${pct(eSup.pc_taxa_sucesso)} contra ${pct(eMed.pc_taxa_sucesso)}.`],
        vistas: [Q.q1.vistas[0], Q.q2.vistaCamp(2022, "DEPUTADO FEDERAL"), vistaPartido(2022, "DEPUTADO FEDERAL"), vistaCampo, vistaEsc("DEPUTADO FEDERAL", 2022), Q.q1.vistas[1]],
        cuidado: ["Valores da época, sem correção pela inflação, e só o que os candidatos declararam ao TSE.", "Dinheiro e voto andam juntos nos dois sentidos: quem já tem chance de ganhar atrai mais doação e mais fundo do partido. É associação, não prova de que o gasto elege.", "A prestação de contas de 2026 ainda está chegando ao TSE."],
        como: "Despesas contratadas e receitas declaradas pelos candidatos na prestação de contas final (TSE), somadas por candidatura. Votos: votação nominal de cada candidato no 1º turno, somada nas 5.570 cidades. O custo por cadeira divide o gasto pelo número de eleitos; o gasto por voto divide o gasto pelos votos; a correlação usa o logaritmo do gasto e dos votos de cada candidato. O campo político é o do partido naquela eleição.",
        tabelas: ["vw_candidatura_resumo", "candidatura", "despesa", "receita", "votacao_candidato", "grau_instrucao", "situacao_totalizacao", "vw_partido_ano"], consultas: ["q1", "q1b", "q1c", "q2", "t1a", "t1b", "t1c"], fonte: "TSE, prestação de contas e votação" });
    }

    // ---------- Tema 2 ----------
    {
      const bf = Q.q2.bens(2022, "DEPUTADO FEDERAL"), b0 = bf[0] || {}, b6 = bf[bf.length - 1] || {};
      const mE = Q.q2.med(2022, "DEPUTADO FEDERAL", "eleito"), mN = Q.q2.med(2022, "DEPUTADO FEDERAL", "não eleito"), vE = Q.q2.med(2024, "VEREADOR", "eleito"), vN = Q.q2.med(2024, "VEREADOR", "não eleito");
      const pv = Q.q2.bens(2024, "PREFEITO"), p0 = pv[0] || {}, p6 = pv[pv.length - 1] || {};
      tema({ id: "t2", n: 2, grupo: "Dinheiro", titulo: "Taxa de sucesso e patrimônio", antigas: ["q2"],
        enunciado: ["Qual é a taxa de sucesso eleitoral por faixa de patrimônio declarado?"],
        curta: `Com mais de R$ 5 milhões em bens, ${pct(b6.pc_taxa_sucesso, 0)} se elegeram deputado federal; sem bens, ${pct(b0.pc_taxa_sucesso)}.`,
        num: `${pct(b6.pc_taxa_sucesso, 0)} × ${pct(b0.pc_taxa_sucesso)}`, numRot: "dos candidatos a deputado federal com mais de R$ 5 milhões × sem nenhum bem se elegeram (2022)",
        resposta: `Quanto mais patrimônio, maior a chance: dos candidatos a deputado federal de 2022 com mais de R$ 5 milhões em bens, ${pct(b6.pc_taxa_sucesso, 0)} se elegeram; dos que não declararam bem nenhum, ${pct(b0.pc_taxa_sucesso)}`,
        pontos: [
          `<b>A chance sobe a cada faixa de patrimônio</b>, para todos os cargos. Para prefeito em 2024, foi de ${pct(p0.pc_taxa_sucesso, 0)} (sem bens) a ${pct(p6.pc_taxa_sucesso, 0)} (mais de R$ 5 milhões).`,
          `<b>O eleito é mais rico que o derrotado.</b> Metade dos deputados federais eleitos em 2022 declarou mais de ${reais(mE.vr_patrimonio_mediano)}; metade dos que perderam, menos de ${reais(mN.vr_patrimonio_mediano)}.`,
          `<b>Também na cidade:</b> o vereador eleito típico de 2024 declarou ${reais(vE.vr_patrimonio_mediano)}; o não eleito, ${reais(vN.vr_patrimonio_mediano)}.`,
          `${pct(mE.pc_milionarios, 0)} dos deputados federais eleitos em 2022 declararam R$ 1 milhão ou mais em bens; entre os que perderam, ${pct(mN.pc_milionarios, 0)}.`],
        vistas: Q.q2.vistas,
        cuidado: ["O patrimônio é o que o candidato declarou, pelo valor que ele mesmo informou (muitas vezes o de compra). Não declarar não quer dizer não ter.", "É associação, não causa: quem tem patrimônio costuma ter mais tempo, contatos e apoio do partido."],
        como: "Soma dos bens que cada candidato declarou ao TSE no registro da candidatura (casa, terreno, carro, aplicações, participação em empresa). Os candidatos ficam em seis faixas de patrimônio; a taxa de sucesso é eleitos ÷ candidatos da faixa.",
        tabelas: ["bem_candidato", "vw_patrimonio_candidato", "candidatura", "situacao_totalizacao"], consultas: ["q2b", "q2c"], fonte: "TSE, bens declarados pelos candidatos" });
    }

    // ---------- Tema 3 ----------
    {
      const ip = Q.q3.idh(2022, "PRESIDENTE"), i1 = ip[0] || {}, i5 = ip[ip.length - 1] || {};
      const pp = Q.q3.ach(2022, "1", "1 pobre"), pr = Q.q3.ach(2022, "1", "3 rico"), pg = Q.q3.ach(2024, "3", "3 rico"), ppq = Q.q3.ach(2024, "1", "1 pobre");
      tema({ id: "t3", n: 3, grupo: "Território", titulo: "Índices municipais e comportamento eleitoral", antigas: ["q3"],
        enunciado: ["Como os índices do município se relacionam com o voto de cada candidato? Há relação com o viés ideológico?"],
        curta: `Para presidente, a esquerda venceu em ${pct(i1.pc_mun_esquerda, 0)} das cidades de IDHM baixo e em ${pct(i5.pc_mun_esquerda, 0)} das de IDHM muito alto.`,
        num: `${pct(i1.pc_mun_esquerda, 0)} × ${pct(i5.pc_mun_esquerda, 0)}`, numRot: "das cidades de IDHM baixo × muito alto deram o 1º lugar à esquerda para presidente (2022)",
        resposta: `Sim, e muito para presidente: em 2022, a esquerda ficou em 1º em ${pct(i1.pc_mun_esquerda, 0)} das cidades de IDHM baixo e em ${pct(i5.pc_mun_esquerda, 0)} das de IDHM muito alto`,
        pontos: [
          `<b>Quanto mais desenvolvida a cidade, mais à direita ela vota para presidente.</b> Cidade a cidade, a correlação entre o IDHM e o lado do voto foi de ${corr(Q.q3.kP.r_idhm)} em 2022; a renda por habitante separa ainda um pouco mais (${corr(Q.q3.kP.r_renda_per_capita)}).`,
          `<b>O tamanho da cidade quase não importa</b> (correlação de ${corr(Q.q3.kP.r_populacao)}).`,
          `<b>Na eleição local o efeito encolhe:</b> ${corr(Q.q3.kG.r_idhm)} para governador e ${corr(Q.q3.kM.r_idhm)} para prefeito. Para governador, a esquerda ficou em 1º em ${pct(pp.pc_mun_esquerda, 0)} das cidades pequenas e pobres e em ${pct(pr.pc_mun_esquerda, 0)} das pequenas e ricas.`,
          `<b>Índices e abstenção:</b> em 2024, faltaram ${pct(pg.pc_abstencao_media, 0)} dos eleitores nas cidades grandes e ricas e ${pct(ppq.pc_abstencao_media, 0)} nas pequenas e pobres.`],
        vistas: Q.q3.vistas,
        cuidado: ["O IDHM é o do Censo 2010, o último calculado para as cidades; seis cidades criadas depois ficam de fora.", "Correlação entre cidades não diz como cada eleitor votou."],
        como: "IDHM, IDHM Educação e renda por habitante do Atlas do Desenvolvimento Humano (PNUD, Ipea e Fundação João Pinheiro), Censo 2010; PIB por habitante (IBGE, 2021) e população (Censo 2022). O partido mais votado em cada cidade no 1º turno é classificado pela nota do partido naquela eleição (página Partidos). A nota média da cidade soma os votos de cada partido vezes a nota dele.",
        tabelas: ["vw_indicador_atual", "indicador_atlas", "indicador_municipio", "votacao_partido", "votacao_candidato", "comparecimento", "vw_partido_ano"], consultas: ["q3b", "q3c", "q3"], link: "#/mapa/e/PRES2022", linkTxt: "Ver presidente 2022 no mapa", fonte: "TSE, IBGE e Atlas do Desenvolvimento Humano" });
    }

    // ---------- Tema 4 ----------
    {
      const E = L("t1c"), A = L("t4a");
      const e = (cg, o) => E.find((r) => r.ds_cargo === cg && r.nr_ordem === o) || {};
      const a = (ano, cg, gr) => A.find((r) => r.nr_ano_eleicao === ano && r.ds_cargo === cg && r.ds_grupo === gr) || {};
      const el24 = a(2024, "ELEITORADO", "eleitores"), ve = a(2024, "VEREADOR", "eleitos"), vc = a(2024, "VEREADOR", "candidatos"), df = a(2022, "DEPUTADO FEDERAL", "eleitos");
      const ve4 = Q.q4.eq("VEREADOR"), v1 = ve4[0] || {}, v5 = ve4[ve4.length - 1] || {};
      const LEGE = leg([[COR.cinza, "Até fundamental"], [COR.azul, "Médio (e superior incompleto)"], [COR.escuro, "Superior completo"]]);
      const vistaEleit = (ano) => ({ rot: `Eleitor × candidato × eleito (${ano})`, legenda: LEGE, graf: () => barras(A.filter((r) => r.nr_ano_eleicao === ano).map((r) => ({ rot: r.cd_cargo ? `${CARGO[r.ds_cargo] || r.ds_cargo} · ${r.ds_grupo}` : "Eleitores", v: 100, vTxt: pct(r.pc_superior, 0),
          partes: [{ v: r.pc_ate_fundamental, cor: COR.cinza, tit: `Até fundamental: ${pct(r.pc_ate_fundamental, 0)}` }, { v: r.pc_medio, cor: COR.azul, tit: `Médio: ${pct(r.pc_medio, 0)}` }, { v: r.pc_superior, cor: COR.escuro, tit: `Superior completo: ${pct(r.pc_superior, 0)}` }] })), { max: 100, cols: ["Grupo", "", ""], nomesPartes: ["Até fundamental", "Médio", "Superior completo"] }),
        nota: "Escolaridade declarada ao TSE: a do eleitorado (perfil do eleitorado) e a dos candidatos (registro da candidatura). O número à direita é a parte com superior completo." });
      const vistaSuc = (cg, ano) => ({ rot: `Escolaridade e chance · ${CARGO[cg]} ${ano}`, graf: () => barras(E.filter((r) => r.ds_cargo === cg).map((r) => ({ rot: cap1(r.ds_grau_instrucao.toLowerCase()), sub: `${V.int(r.qt_candidatos)} candidatos · patrimônio típico ${V.brl(r.vr_patrimonio_mediano)}`, v: r.pc_taxa_sucesso })), { cor: COR.escuro, cols: ["Escolaridade", "Candidatos e patrimônio", "Eleitos"] }),
        nota: "Parte dos candidatos de cada nível de escolaridade que se elegeu. Patrimônio típico: a mediana dos bens declarados." });
      tema({ id: "t4", n: 4, grupo: "Perfil", titulo: "Escolaridade, capacidade eleitoral e patrimônio", antigas: ["q4"],
        enunciado: ["Existe relação entre escolaridade e capacidade de ser eleito?", "Comparar a escolaridade média do eleitorado com a escolaridade dos candidatos.", "Avaliar a relação entre escolaridade do eleitorado, escolaridade dos candidatos e patrimônio declarado."],
        curta: `${pct(el24.pc_superior, 0)} dos eleitores têm curso superior; entre os vereadores eleitos, ${pct(ve.pc_superior, 0)}.`,
        num: `${pct(el24.pc_superior, 0)} × ${pct(ve.pc_superior, 0)}`, numRot: "dos eleitores × dos vereadores eleitos têm curso superior (2024)",
        resposta: `Sim: o eleito é bem mais estudado que o eleitor. Em 2024, ${pct(el24.pc_superior, 0)} dos eleitores tinham curso superior; entre os vereadores eleitos, ${pct(ve.pc_superior, 0)}; entre os deputados federais eleitos em 2022, ${pct(df.pc_superior, 0)}`,
        pontos: [
          `<b>Diploma aumenta a chance de se eleger</b> nos cargos de deputado e vereador: ${pct(e("DEPUTADO FEDERAL", 8).pc_taxa_sucesso)} dos candidatos a deputado federal com superior completo se elegeram, contra ${pct(e("DEPUTADO FEDERAL", 6).pc_taxa_sucesso)} dos com ensino médio. Para vereador, ${pct(e("VEREADOR", 8).pc_taxa_sucesso)} contra ${pct(e("VEREADOR", 6).pc_taxa_sucesso)}.`,
          `<b>Para prefeito, não:</b> ${pct(e("PREFEITO", 8).pc_taxa_sucesso)} dos candidatos com diploma e ${pct(e("PREFEITO", 6).pc_taxa_sucesso)} dos com ensino médio se elegeram.`,
          `<b>O eleitor escolhe quem estudou mais que ele:</b> entre os candidatos a vereador de 2024, ${pct(vc.pc_superior, 0)} tinham diploma; entre os eleitos, ${pct(ve.pc_superior, 0)}.`,
          `<b>Escolaridade anda com patrimônio:</b> o candidato a deputado federal com diploma declarou, tipicamente, ${reais(e("DEPUTADO FEDERAL", 8).vr_patrimonio_mediano)} em bens; o com ensino médio, ${reais(e("DEPUTADO FEDERAL", 6).vr_patrimonio_mediano)}.`,
          `<b>Cidade mais estudada elege mais diplomados:</b> nas cidades com o IDHM Educação mais alto, ${pct(v5.pc_eleitos_superior, 0)} dos vereadores eleitos tinham diploma; nas com o mais baixo, ${pct(v1.pc_eleitos_superior, 0)}.`],
        vistas: [vistaEleit(2024), vistaSuc("DEPUTADO FEDERAL", 2022), vistaSuc("VEREADOR", 2024), vistaSuc("PREFEITO", 2024), Q.q4.vistas[0], Q.q4.vistas[2]],
        cuidado: ["A escolaridade é a que cada um declarou ao TSE (o eleitor, no cadastro; o candidato, no registro).", "Mediana do patrimônio: metade declarou mais, metade menos. Quem não declarou bens conta como zero."],
        como: "Grau de instrução declarado pelos candidatos no registro da candidatura e escolaridade do eleitorado apto no perfil do eleitorado (TSE), mais o IDHM Educação das cidades (Atlas, Censo 2010). Taxa de sucesso: eleitos ÷ candidatos.",
        tabelas: ["candidatura", "grau_instrucao", "eleitorado_perfil", "vw_eleitorado_municipio", "vw_patrimonio_candidato", "indicador_atlas", "situacao_totalizacao"], consultas: ["t4a", "t1c", "q4b", "q4c", "q4"], fonte: "TSE e Atlas do Desenvolvimento Humano" });
    }

    // ---------- Tema 5 ----------
    {
      const F = L("t5a"), X = L("t5b"), S = L("t5c");
      const br = F.find((r) => r.nm_regiao === "Brasil") || {};
      const s = (a, cg, f) => S.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg && r.fl_sobrenome_prefeito === f) || {};
      const deS = s(2022, "DEPUTADO ESTADUAL", true), deN = s(2022, "DEPUTADO ESTADUAL", false), dfS = s(2022, "DEPUTADO FEDERAL", true), dfN = s(2022, "DEPUTADO FEDERAL", false);
      const ex = X[0] || {};
      const regs = F.filter((r) => r.nm_regiao !== "Brasil").sort((a, b) => b.pc_com_familia - a.pc_com_familia);
      const vistaReg = { rot: "Famílias na prefeitura, por região", legenda: leg([[COR.terra, "Mesmo sobrenome, 2 ou mais mandatos"], [COR.escuro, "3 ou mais mandatos"]]),
        graf: () => pares(F.map((r) => ({ rot: r.nm_regiao, sub: `${V.int(r.qt_municipios)} cidades`, v: [r.pc_com_familia, r.pc_familia_3_mandatos] })), { nomes: ["2 ou mais mandatos", "3 ou mais"], cores: [COR.terra, COR.escuro], fmt: (v) => pct(v, 0), cols: ["Região", "Cidades"] }),
        nota: "Parte das cidades em que pessoas diferentes com o mesmo sobrenome ganharam a prefeitura em pelo menos 2 (ou 3) eleições, de 2000 a 2024." };
      const vistaDep = { rot: "Sobrenome de ex-prefeito e voto", legenda: leg([[COR.terra, "Com sobrenome de ex-prefeito da sua cidade-reduto"], [COR.cinza, "Sem"]]),
        graf: () => pares([[2022, "DEPUTADO FEDERAL"], [2022, "DEPUTADO ESTADUAL"], [2018, "DEPUTADO FEDERAL"], [2018, "DEPUTADO ESTADUAL"]].map(([a, cg]) => ({ rot: `${CARGO[cg]} ${a}`, sub: `${V.int(s(a, cg, true).qt_candidatos)} com o sobrenome`, v: [s(a, cg, true).pc_sucesso, s(a, cg, false).pc_sucesso] })), { nomes: ["com", "sem"], cores: [COR.terra, COR.cinza], fmt: (v) => pct(v, 0), cols: ["Cargo", "Candidatos com o sobrenome"] }),
        nota: "Parte dos candidatos que se elegeu. Cidade-reduto: a cidade de onde veio a maior parte dos votos do candidato. Só candidatos com pelo menos mil votos." };
      const vistaConc = { rot: "Votos concentrados numa cidade", legenda: leg([[COR.terra, "Com sobrenome de ex-prefeito"], [COR.cinza, "Sem"]]),
        graf: () => pares([[2022, "DEPUTADO FEDERAL"], [2022, "DEPUTADO ESTADUAL"]].map(([a, cg]) => ({ rot: `${CARGO[cg]} ${a}`, sub: "eleitos", v: [s(a, cg, true).pc_reduto_mediano_eleitos, s(a, cg, false).pc_reduto_mediano_eleitos] })), { nomes: ["com", "sem"], cores: [COR.terra, COR.cinza], fmt: (v) => pct(v, 0), cols: ["Cargo"] }),
        nota: "Parte típica (mediana) dos votos de um deputado eleito que veio de uma só cidade, a sua cidade-reduto." };
      const vistaEx = vistaTabela("As famílias que mais governaram", ["Cidade", "Sobrenome", "Mandatos", "Pessoas", "Prefeitos eleitos"], X.slice(0, 12).map((r) => [`${V.esc(r.nm_municipio)} (${r.sg_uf})`, V.esc(V.titulo(r.ds_sobrenome)), String(r.qt_mandatos), String(r.qt_pessoas), V.esc(V.titulo(r.ds_prefeitos))]),
        "Cidades em que o mesmo sobrenome mais vezes ganhou a prefeitura, com pessoas diferentes, de 2000 a 2024.");
      tema({ id: "t5", n: 5, grupo: "Território", titulo: "Sobrenome, cidade e concentração eleitoral",
        enunciado: ["Existe relação entre sobrenome e cidade de origem/atuação e a concentração de votos, caracterizando um possível “curral eleitoral”?"],
        curta: `Em ${pct(br.pc_com_familia, 0)} das cidades, o mesmo sobrenome já foi prefeito com pessoas diferentes.`,
        num: pct(br.pc_com_familia, 0), numRot: "das cidades já tiveram dois ou mais prefeitos com o mesmo sobrenome (2000 a 2024)",
        resposta: `Há sinais fortes: em ${pct(br.pc_com_familia, 0)} das cidades, duas ou mais pessoas com o mesmo sobrenome já foram eleitas prefeito desde 2000. E o deputado estadual que tem o sobrenome de um ex-prefeito da cidade onde mais recebe votos se elegeu ${vezesN(deS.pc_sucesso, deN.pc_sucesso)} mais (${pct(deS.pc_sucesso, 0)} contra ${pct(deN.pc_sucesso, 0)}, em 2022)`,
        pontos: [
          `<b>Famílias no poder local:</b> ${V.int(br.qt_com_familia)} cidades tiveram dois ou mais prefeitos com o mesmo sobrenome; em ${V.int(br.qt_familia_3_mandatos)}, esse sobrenome governou em 3 ou mais mandatos. A região com mais casos é o ${regs[0] ? regs[0].nm_regiao : "—"} (${pct((regs[0] || {}).pc_com_familia, 0)} das cidades).`,
          `<b>Exemplo extremo:</b> em ${V.esc(ex.nm_municipio || "")} (${ex.sg_uf || ""}), o sobrenome ${V.esc(V.titulo(ex.ds_sobrenome || ""))} ganhou ${ex.qt_mandatos} das 7 eleições, com ${ex.qt_pessoas} pessoas diferentes.`,
          `<b>O sobrenome ajuda o deputado:</b> para deputado federal em 2022, ${pct(dfS.pc_sucesso, 0)} dos que tinham o sobrenome de um ex-prefeito da sua cidade-reduto se elegeram, contra ${pct(dfN.pc_sucesso, 0)} dos demais.`,
          `<b>Votos concentrados:</b> o deputado estadual eleito típico tirou ${pct(deN.pc_reduto_mediano_eleitos, 0)} dos seus votos de uma só cidade; ${pct(deN.pc_eleitos_metade_numa_cidade, 0)} deles tiraram mais da metade de uma cidade só.`],
        vistas: [vistaDep, vistaReg, vistaEx, vistaConc],
        cuidado: ["Sobrenome igual não prova parentesco. Para reduzir coincidências, ficam de fora os 50 sobrenomes mais comuns (Silva, Santos, Oliveira...) e só contam pessoas diferentes.", "Mulheres que adotam o sobrenome do marido entram como da mesma família, o que costuma ser verdade na política local.", "1996 fica de fora porque não há título de eleitor para separar as pessoas."],
        como: "Sobrenome: a última palavra do nome civil do candidato, sem Júnior, Filho, Neto, Sobrinho. Prefeitos eleitos de 2000 a 2024 (TSE). Cidade-reduto: a cidade onde o deputado teve mais votos no 1º turno (votação por município). O deputado “tem sobrenome de ex-prefeito” quando alguém com o mesmo sobrenome já foi eleito prefeito da sua cidade-reduto antes daquela eleição.",
        tabelas: ["pessoa", "candidatura", "votacao_candidato", "municipio", "uf", "situacao_totalizacao"], consultas: ["t5a", "t5b", "t5c"], fonte: "TSE, candidaturas e votação por município" });
    }

    // ---------- Tema 6 ----------
    {
      const S = L("t6c"), R = L("t6a"), Qn = L("t6b");
      const s24 = S.find((r) => r.nr_ano_eleicao === 2024) || {}, s22 = S.find((r) => r.nr_ano_eleicao === 2022) || {}, s94 = S.find((r) => r.nr_ano_eleicao === 1994) || {};
      const q = (a, n) => Qn.find((r) => r.nr_ano_eleicao === a && r.nr_quintil === n) || {};
      const q5 = q(2024, 5), q1 = q(2024, 1);
      const top24 = R.filter((r) => r.nr_ano_eleicao === 2024 && r.ds_lista === "mais"), bai24 = R.filter((r) => r.nr_ano_eleicao === 2024 && r.ds_lista === "menos");
      const t1 = top24[0] || {}, u1 = bai24[bai24.length - 1] || {};
      const LEG = leg([[COR.escuro, "Abstenção"], [COR.terra, "Branco"], [COR.cinza, "Nulo"]]);
      const vistaSerie = { rot: "Eleição a eleição", legenda: LEG, graf: () => barras(S.map((r) => ({ rot: `${r.nr_ano_eleicao} · ${r.cd_cargo === 1 ? "presidente" : "prefeito"}`, v: r.pc_ninguem, vTxt: pct(r.pc_ninguem),
          partes: [{ v: r.pc_abstencao, cor: COR.escuro, tit: `Abstenção: ${pct(r.pc_abstencao)}` }, { v: r.pc_branco, cor: COR.terra, tit: `Branco: ${pct(r.pc_branco)}` }, { v: r.pc_nulo, cor: COR.cinza, tit: `Nulo: ${pct(r.pc_nulo)}` }] })), { max: 40, cols: ["Eleição", "", ""], nomesPartes: ["Abstenção", "Branco", "Nulo"], fmtParte: (v) => pct(v) }),
        nota: "Parte do eleitorado apto que não escolheu ninguém no 1º turno: faltou, votou em branco ou anulou. Presidente nas eleições gerais, prefeito nas municipais." };
      const vistaRank = (a) => vistaTabela(`Ranking das cidades (${a})`, ["Cidade", "Lista", "Eleitores", "Ninguém", "Faltou", "Branco e nulo", "1º colocado"],
        R.filter((r) => r.nr_ano_eleicao === a).map((r) => [`${V.esc(r.nm_municipio)} (${r.sg_uf})`, r.ds_lista === "mais" ? "10 com mais" : "5 com menos", V.int(r.qt_aptos), pct(r.pc_ninguem), pct(r.pc_abstencao), pct(r.pc_branco_nulo), pct(r.pc_1o_colocado)]),
        `${a === 2024 ? "Prefeito" : "Presidente"} em ${a}, 1º turno. "1º colocado": parte do eleitorado que votou no mais votado.`);
      const vistaQ = (a) => ({ rot: `Ninguém e resultado (${a})`, legenda: leg([[COR.escuro, "Cidades com um só candidato"], [COR.terra, "O Ninguém passou o 1º colocado"]]),
        graf: () => pares(Qn.filter((r) => r.nr_ano_eleicao === a).map((r) => ({ rot: `${pct(r.pc_ninguem_min, 0)} a ${pct(r.pc_ninguem_max, 0)} de Ninguém`, sub: `${V.int(r.qt_municipios)} cidades · o 1º teve ${pct(r.pc_eleitores_do_1o, 0)} do eleitorado`, v: [r.pc_candidato_unico, r.pc_ninguem_passou_o_1o] })), { nomes: ["um só candidato", "Ninguém passou o 1º"], cores: [COR.escuro, COR.terra], fmt: (v) => pct(v, 0), cols: ["Grupo de cidades", "Cidades e 1º colocado"] }),
        nota: "Cidades em cinco grupos do mesmo tamanho pela parte do eleitorado que não escolheu ninguém para prefeito." });
      tema({ id: "t6", n: 6, grupo: "Voto", titulo: "Votos brancos, nulos e abstenção",
        enunciado: ["Analisar a soma de votos brancos e nulos em conjunto com a abstenção e sua relação com o resultado eleitoral.", "Construir uma listagem/ranking dos municípios ou eleições com maior concentração desses indicadores."],
        curta: `${milhoes(s24.qt_ninguem)} de eleitores (${pct(s24.pc_ninguem)}) não escolheram ninguém para prefeito em 2024.`,
        num: pct(s24.pc_ninguem), numRot: `do eleitorado não escolheu ninguém para prefeito em 2024 (${milhoes(s24.qt_ninguem)})`,
        resposta: `Em 2024, ${milhoes(s24.qt_ninguem)} de eleitores (${pct(s24.pc_ninguem)}) não escolheram ninguém para prefeito. Onde esse "Ninguém" é maior, muitas vezes não havia escolha: ${pct(q5.pc_candidato_unico, 0)} dessas cidades tinham um só candidato`,
        pontos: [
          `<b>Somando abstenção, brancos e nulos</b>, o "Ninguém" foi de ${pct(s94.pc_ninguem)} (presidente, 1994) a ${pct(s22.pc_ninguem)} (presidente, 2022). Hoje, o maior pedaço é a abstenção: ${pct(s24.pc_abstencao)} em 2024.`,
          `<b>Relação com o resultado:</b> no grupo de cidades com mais "Ninguém" em 2024, ele teve mais votos que o 1º colocado em ${pct(q5.pc_ninguem_passou_o_1o, 0)} das cidades; no grupo com menos, em ${pct(q1.pc_ninguem_passou_o_1o, 0)}.`,
          `<b>Quem lidera o ranking:</b> ${V.esc(t1.nm_municipio || "")} (${t1.sg_uf || ""}), onde ${pct(t1.pc_ninguem)} do eleitorado não escolheu ninguém para prefeito (${pct(t1.pc_branco_nulo)} votaram em branco ou nulo). No outro extremo, ${V.esc(u1.nm_municipio || "")} (${u1.sg_uf || ""}), com ${pct(u1.pc_ninguem)}.`,
          `<b>Cidade grande falta mais:</b> no grupo com mais "Ninguém", a cidade típica tem ${V.int(q5.qt_eleitores_mediano)} eleitores; no grupo com menos, ${V.int(q1.qt_eleitores_mediano)}.`],
        vistas: [vistaSerie, vistaRank(2024), vistaQ(2024), vistaRank(2022), vistaQ(2020)],
        cuidado: ["Parte da abstenção é de quem mudou de cidade ou morreu e continua no cadastro.", "Com um candidato só, branco e nulo são a única forma de não votar nele."],
        como: "Comparecimento, abstenção, brancos e nulos de cada cidade no 1º turno (TSE, detalhe da votação por município e zona) e os votos do candidato mais votado (votação nominal por município).",
        tabelas: ["comparecimento", "votacao_candidato", "candidatura", "municipio"], consultas: ["t6c", "t6a", "t6b"], link: "#/", linkTxt: "Ver o candidato Ninguém na página inicial", fonte: "TSE, comparecimento e votação" });
    }

    // ---------- Tema 7 ----------
    {
      const fed = Q.q5.fed, ver = Q.q5.ver, f0 = fed[0] || {}, fN = fed[fed.length - 1] || {}, P = Q.q5.P;
      const A = L("t7a"), a = (cg, ano) => A.find((r) => r.ds_cargo === cg && r.nr_ano_eleicao === ano) || {};
      const aF = A.filter((r) => r.ds_cargo === "DEPUTADO FEDERAL"), aF0 = aF[0] || {}, aFN = aF[aF.length - 1] || {};
      const aV = A.filter((r) => r.ds_cargo === "VEREADOR"), aVN = aV[aV.length - 1] || {}, aV0 = aV[0] || {};
      const vistaCad = { rot: "Cadeiras que vieram da legenda", legenda: leg([[COR.escuro, "Deputado federal"], [COR.azul, "Deputado estadual"], [COR.verde, "Vereador"]]),
        graf: () => { const anos = [...new Set(A.map((r) => r.nr_ano_eleicao))].sort();
          return linhas({ anos, max: 15, rot: "Parte das cadeiras que veio do voto de legenda", series: [["DEPUTADO FEDERAL", "Deputado federal", COR.escuro], ["DEPUTADO ESTADUAL", "Deputado estadual", COR.azul], ["VEREADOR", "Vereador", COR.verde]].map(([cg, nome, cor]) => ({ nome, cor, grossa: true, curto: nome.replace("Deputado ", "Dep. "), v: anos.map((x) => (A.find((r) => r.ds_cargo === cg && r.nr_ano_eleicao === x) || {}).pc_cadeiras_da_legenda ?? null) })) }); },
        nota: "Em cada partido, os eleitos multiplicados pela parte dos votos do partido que foi só na legenda, somados no país, divididos pelo total de cadeiras." };
      const vistaProp = vistaTabela("Eleitos com votos próprios", ["Eleição", "Eleitos", "Votos de legenda", "Cadeiras da legenda", "Com votos próprios para 1 cadeira"],
        A.map((r) => [`${CARGO[r.ds_cargo]} ${r.nr_ano_eleicao}`, V.int(r.qt_eleitos), V.int(r.qt_legenda), `${V.int(r.qt_cadeiras_da_legenda)} (${pct(r.pc_cadeiras_da_legenda)})`, `${V.int(r.qt_com_votos_proprios)} (${pct(r.pc_com_votos_proprios)})`]),
        "Votos próprios para 1 cadeira: o candidato teve, sozinho, pelo menos o quociente eleitoral (votos válidos ÷ cadeiras do estado ou da cidade). Os demais dependeram dos votos do partido: os de legenda e os dos colegas de lista.");
      tema({ id: "t7", n: 7, grupo: "Voto", titulo: "Votos por legenda", antigas: ["q5"],
        enunciado: ["Quantos votos são obtidos por legenda e quantos candidatos são eleitos por esse meio?"],
        curta: `O voto só no partido caiu para ${pct(fN.pc_legenda)} e valeu cerca de ${V.int(aFN.qt_cadeiras_da_legenda)} das 513 cadeiras de deputado federal.`,
        num: V.int(aFN.qt_cadeiras_da_legenda), numRot: `das 513 cadeiras de deputado federal vieram do voto de legenda em ${aFN.nr_ano_eleicao}`,
        resposta: `Cada vez menos: em ${fN.nr_ano_eleicao}, ${pct(fN.pc_legenda)} dos votos para deputado federal foram só no número do partido (${V.int(aFN.qt_legenda)} votos), o que valeu cerca de ${V.int(aFN.qt_cadeiras_da_legenda)} das 513 cadeiras. Em ${aF0.nr_ano_eleicao}, eram ${V.int(aF0.qt_cadeiras_da_legenda)}`,
        pontos: [
          `<b>O voto de legenda caiu</b> de ${pct(f0.pc_legenda)} (${f0.nr_ano_eleicao}) para ${pct(fN.pc_legenda)} (${fN.nr_ano_eleicao}) para deputado federal, e de ${pct((ver[0] || {}).pc_legenda)} (${(ver[0] || {}).nr_ano_eleicao}) para ${pct((ver[ver.length - 1] || {}).pc_legenda)} (${(ver[ver.length - 1] || {}).nr_ano_eleicao}) para vereador.`,
          `<b>Vereadores eleitos pela legenda:</b> cerca de ${V.int(aVN.qt_cadeiras_da_legenda)} das ${V.int(aVN.qt_eleitos)} cadeiras de ${aVN.nr_ano_eleicao} (eram ${V.int(aV0.qt_cadeiras_da_legenda)} em ${aV0.nr_ano_eleicao}).`,
          `<b>Quase ninguém se elege sozinho:</b> só ${pct(a("DEPUTADO FEDERAL", aFN.nr_ano_eleicao).pc_com_votos_proprios)} dos deputados federais de ${aFN.nr_ano_eleicao} tiveram votos próprios para uma cadeira inteira; os outros dependeram dos votos do partido.`,
          `<b>Quem ainda vive de legenda:</b> em 2022, ${lista(P.slice(0, 3).map((r) => `${V.nomePartido(r.sg_partido)} (${pct(r.pc_legenda, 0)} dos seus votos)`))}.`],
        vistas: [...Q.q5.vistas, vistaCad, vistaProp],
        cuidado: ["1998 fica de fora: o arquivo do TSE daquele ano não separa o voto de legenda.", "“Cadeiras da legenda” é uma estimativa proporcional: o sistema distribui as cadeiras pelo total do partido, sem dizer qual voto elegeu quem."],
        como: "Votos nominais e de legenda de cada partido em cada cidade (TSE, votação por partido), somados por estado (deputados) ou por cidade (vereador). Eleitos e votos de cada candidato: candidaturas e votação nominal do TSE.",
        tabelas: ["votacao_partido", "votacao_candidato", "candidatura", "partido", "situacao_totalizacao"], consultas: ["q5", "q5b", "t7a"], fonte: "TSE, votação por partido e por candidato" });
    }

    // ---------- Tema 8 ----------
    {
      const F = L("t8a"), X = L("t8b");
      const f1 = F[0] || {}, fN = F[F.length - 1] || {};
      const r = (X.find((x) => x.ds_tipo === "correlação") || {}).r_eleitores_cadeiras;
      const mais = X.filter((x) => x.ds_tipo === "mais eleitores por cadeira"), menos = X.filter((x) => x.ds_tipo === "menos eleitores por cadeira");
      const m1 = mais[0] || {}, n1 = menos[0] || {};
      const vistaFx = { rot: "Eleitores por vereador", graf: () => barras(F.map((x) => ({ rot: cap1(x.ds_faixa), sub: `${V.int(x.qt_municipios)} cidades · ${N1.format(x.qt_cadeiras_media)} vereadores em média`, v: x.qt_eleitores_por_cadeira, vTxt: V.int(x.qt_eleitores_por_cadeira) })), { cor: COR.escuro, cols: ["Tamanho da cidade", "Cidades e cadeiras", "Eleitores por cadeira"] }),
        nota: "Eleitores aptos ÷ cadeiras de vereador, somando as cidades de cada faixa de população (Censo 2022). Eleição de 2024." };
      const vistaVotos = { rot: "Votos para se eleger", legenda: leg([[COR.terra, "Votos do eleito típico"], [COR.cinza, "Votos válidos por cadeira"]]),
        graf: () => pares(F.map((x) => ({ rot: cap1(x.ds_faixa), sub: `${N1.format(x.qt_candidatos_por_cadeira)} candidatos por vaga`, v: [x.qt_votos_eleito_mediano, x.qt_votos_por_cadeira] })), { nomes: ["eleito típico", "por cadeira"], cores: [COR.terra, COR.cinza], fmt: (v) => V.int(v), cols: ["Tamanho da cidade", "Candidatos por vaga"] }),
        nota: "Eleito típico: a mediana dos votos dos vereadores eleitos da cidade. Por cadeira: votos válidos para vereador ÷ cadeiras." };
      const vistaExt = vistaTabela("Os extremos", ["Cidade", "Lista", "Vereadores", "Eleitores", "Eleitores por vereador"], [...mais, ...menos].map((x) => [`${V.esc(x.nm_municipio)} (${x.sg_uf})`, x.ds_tipo.startsWith("mais") ? "Mais" : "Menos", V.int(x.qt_cadeiras), V.int(x.qt_aptos), V.int(x.qt_eleitores_por_cadeira)]),
        "As 5 cidades em que cada vereador representa mais eleitores e as 5 em que representa menos, eleição de 2024.");
      tema({ id: "t8", n: 8, grupo: "Voto", titulo: "Quantidade de vereadores e número de votos",
        enunciado: ["Qual é a relação entre a quantidade de vereadores eleitos e o número de votos obtidos?"],
        curta: `Em ${m1.nm_municipio}, cada vereador representa ${V.int(m1.qt_eleitores_por_cadeira)} eleitores; em ${n1.nm_municipio}, ${V.int(n1.qt_eleitores_por_cadeira)}.`,
        num: `${V.int(m1.qt_eleitores_por_cadeira)} × ${V.int(n1.qt_eleitores_por_cadeira)}`, numRot: `eleitores por vereador em ${m1.nm_municipio || ""} × em ${n1.nm_municipio || ""} (2024)`,
        resposta: `Cidade maior tem mais vereadores, mas bem menos que o tamanho dela: em ${m1.nm_municipio} (${m1.sg_uf}), cada um dos ${m1.qt_cadeiras} vereadores representa ${V.int(m1.qt_eleitores_por_cadeira)} eleitores; em ${n1.nm_municipio} (${n1.sg_uf}), cada um dos ${n1.qt_cadeiras} representa ${V.int(n1.qt_eleitores_por_cadeira)}`,
        pontos: [
          `<b>O número de vereadores cresce devagar:</b> as cidades com até 5 mil habitantes têm ${N1.format(f1.qt_cadeiras_media)} vereadores em média; as com mais de 1 milhão, ${N1.format(fN.qt_cadeiras_media)}. A Constituição fixa de 9 a 55 cadeiras pela população.`,
          `<b>Por isso o voto vale mais na cidade pequena:</b> ${V.int(f1.qt_eleitores_por_cadeira)} eleitores por vereador nas menores, ${V.int(fN.qt_eleitores_por_cadeira)} nas maiores.`,
          `<b>Votos para se eleger:</b> o vereador eleito típico teve ${V.int(f1.qt_votos_eleito_mediano)} votos nas cidades de até 5 mil habitantes e ${V.int(fN.qt_votos_eleito_mediano)} nas de mais de 1 milhão.`,
          `<b>Mais disputa na cidade grande:</b> ${N1.format(fN.qt_candidatos_por_cadeira)} candidatos por vaga nas maiores, ${N1.format(f1.qt_candidatos_por_cadeira)} nas menores. Cidade a cidade, a correlação entre o tamanho do eleitorado (em logaritmo) e o número de cadeiras é de ${corr(r)}.`],
        vistas: [vistaFx, vistaVotos, vistaExt],
        cuidado: ["Eleitores aptos são os do cadastro do TSE em 2024, não a população.", "Votos de legenda contam nos votos válidos por cadeira, mas não nos votos de nenhum candidato."],
        como: "Vereadores eleitos em 2024 e votos de cada um (TSE), eleitores aptos e votos válidos para vereador de cada cidade, e a população do Censo 2022 (IBGE) para separar as cidades por tamanho.",
        tabelas: ["candidatura", "votacao_candidato", "votacao_partido", "comparecimento", "vw_indicador_atual", "situacao_totalizacao"], consultas: ["t8a", "t8b"], fonte: "TSE e IBGE" });
    }

    // ---------- Tema 9 ----------
    {
      const A = L("t9a"), S = L("t9b");
      const g = (grp) => A.filter((r) => r.ds_grupo === grp);
      const gp = g("GOVERNADOR E PRESIDENTE"), pf = g("PREFEITO");
      const y = (ls, a) => ls.find((r) => r.nr_ano_eleicao === a) || {};
      const g18 = y(gp, 2018), g22 = y(gp, 2022), g26 = y(gp, 2026), p20 = y(pf, 2020), p24 = y(pf, 2024);
      const st = S.find((r) => r.ds_tipo === "todos") || {}, sm = S.find((r) => r.ds_tipo === "mesmo cargo") || {};
      const ASS = [["pc_pandemia", "Pandemia"], ["pc_inteligencia_artificial", "Inteligência artificial"], ["pc_saude_mental_autismo", "Saúde mental e autismo"], ["pc_causa_animal", "Causa animal"], ["pc_clima", "Clima e sustentabilidade"], ["pc_mulheres", "Mulheres"], ["pc_transparencia", "Transparência"], ["pc_digital", "Internet e digital"], ["pc_seguranca", "Segurança pública"]];
      const vistaG = (ls, rot, nomes) => ({ rot, graf: () => pares(ASS.map(([k, t]) => ({ rot: t, v: ls.map((r) => r[k]) })), { nomes: ls.map((r) => `${r.nr_ano_eleicao}`), cores: ls.length === 3 ? [COR.cinza, COR.azul, COR.escuro] : [COR.cinza, COR.escuro], max: 100, fmt: (v) => pct(v, 0), cols: ["Assunto"] }),
        legenda: leg(ls.map((r, i) => [(ls.length === 3 ? [COR.cinza, COR.azul, COR.escuro] : [COR.cinza, COR.escuro])[i], `${r.nr_ano_eleicao} (${V.int(r.qt_planos)} planos)`])), nota: `Parte dos planos de ${nomes} que cita o assunto pelo menos uma vez.` });
      const vistaSim = vistaTabela("O mesmo candidato, de novo", ["Plano seguinte", "Pares de planos", "Palavras repetidas (média)", "Quase igual (80% ou mais)", "Muito diferente (menos de 30%)"],
        S.map((r) => [cap1(r.ds_tipo), V.int(r.qt_pares_de_planos), pct(r.pc_semelhanca_media, 0), pct(r.pc_quase_igual, 0), pct(r.pc_muito_diferente, 0)]),
        "Cada plano comparado com o plano seguinte da mesma pessoa (2018 a 2026): parte das 80 palavras mais usadas que aparece nos dois.");
      tema({ id: "t9", n: 9, grupo: "Partidos", titulo: "Propostas dos candidatos ao longo do tempo", antigas: ["q6"],
        enunciado: ["Como as propostas apresentadas por cada candidato evoluem ao longo da linha do tempo?"],
        curta: `Inteligência artificial: de ${pct(g18.pc_inteligencia_artificial, 0)} para ${pct(g26.pc_inteligencia_artificial, 0)} dos planos de governador e presidente, de 2018 a 2026.`,
        num: `${pct(g18.pc_inteligencia_artificial, 0)} → ${pct(g26.pc_inteligencia_artificial, 0)}`, numRot: "dos planos de governador e presidente falam de inteligência artificial (2018 → 2026)",
        resposta: `As propostas seguem o assunto do momento: a pandemia estava em ${pct(g22.pc_pandemia, 0)} dos planos de governador e presidente em 2022 e caiu para ${pct(g26.pc_pandemia, 0)} em 2026; a inteligência artificial foi de ${pct(g18.pc_inteligencia_artificial, 0)} (2018) para ${pct(g26.pc_inteligencia_artificial, 0)} (2026)`,
        pontos: [
          `<b>Assuntos novos:</b> saúde mental e autismo apareciam em ${pct(p20.pc_saude_mental_autismo, 0)} dos planos de prefeito em 2020 e em ${pct(p24.pc_saude_mental_autismo, 0)} em 2024; a causa animal, de ${pct(p20.pc_causa_animal, 0)} para ${pct(p24.pc_causa_animal, 0)}.`,
          `<b>Cada candidato reescreve o plano:</b> quando a mesma pessoa se candidata de novo, só ${pct(st.pc_semelhanca_media, 0)} das palavras principais se repetem, em média. Mesmo no mesmo cargo, ${pct(sm.pc_quase_igual, 0)} dos planos são quase iguais ao anterior.`,
          `<b>Esquerda e direita falam de coisas diferentes:</b> ${pct(Q.q6.e.pc_racial, 0)} dos planos da esquerda para presidente falam de racismo ou igualdade racial; na direita, ${pct(Q.q6.d.pc_racial, 0)}.`,
          `<b>Saúde, educação e emprego estão em quase todos</b> (emprego aparece em mais de 90% dos planos de prefeito), por isso não aparecem como diferença.`],
        vistas: [vistaG([g18, g22, g26], "Assuntos · governador e presidente", "governador e presidente"), vistaG([p20, p24], "Assuntos · prefeito", "prefeito"), vistaSim, ...Q.q6.vistas.filter((v) => !/Típicas|Nuvem · Governador/.test(v.rot))],
        cuidado: ["A busca é por palavras: citar um assunto não diz se o plano é a favor ou contra.", "Plano escaneado como imagem não tem texto e fica de fora.", "Os planos só são publicados pelo TSE a partir de 2018 (presidente e governador) e 2020 (prefeito)."],
        como: "Texto dos planos de governo entregues ao TSE (PDF convertido em texto), de presidente e governador (2018, 2022 e 2026) e de prefeito (2020 e 2024). Cada assunto é uma lista de palavras, buscada sem acento e sem maiúscula. A comparação do mesmo candidato usa as 80 palavras mais usadas de cada plano e o título de eleitor para ligar a pessoa.",
        tabelas: ["proposta_governo", "proposta_palavra", "candidatura", "pessoa", "partido", "vw_partido_ano"], consultas: ["t9a", "t9b", "q6", "q6b", "q6c", "q6d", "q6e"], fonte: "TSE, propostas de governo" });
    }

    // ---------- Tema 10 ----------
    {
      const R = L("t10a"), A = L("t10b"), D = L("t10c");
      const r1 = R[0] || {}, r5 = R[R.length - 1] || {};
      const a24 = A.find((r) => r.nr_ano_eleicao === 2024) || {}, a16 = A.find((r) => r.nr_ano_eleicao === 2016) || {};
      const d22 = D.find((r) => r.nr_ano_eleicao === 2022) || {};
      const jy = (Q.q7.jq(2024) || []).slice(-1)[0] || {};
      const vistaRe = { rot: "Prefeito tentando a reeleição", graf: () => barras(R.map((r) => ({ rot: cap1(r.ds_idade), sub: `${V.int(r.qt_tentaram)} tentaram`, v: r.pc_reeleitos })), { cor: COR.escuro, max: 100, cols: ["Idade", "Tentaram", "Reeleitos"] }),
        nota: "Prefeitos eleitos que disputaram de novo a mesma prefeitura na eleição seguinte, de 2004 a 2024, pela idade na posse. A barra vai até 100%." };
      const LEGA = leg([[COR.escuro, "Mesmo prefeito"], [COR.azul, "Outro do mesmo partido"], [COR.terra, "Troca de partido"]]);
      const vistaAlt = { rot: "Alternância nas prefeituras", legenda: LEGA, graf: () => barras(A.map((r) => ({ rot: String(r.nr_ano_eleicao), sub: `${V.int(r.qt_municipios)} cidades`, v: 100, vTxt: pct(r.pc_troca_de_partido, 0),
          partes: [{ v: r.pc_mesmo_prefeito, cor: COR.escuro, tit: `Mesmo prefeito: ${pct(r.pc_mesmo_prefeito, 0)}` }, { v: r.pc_outro_do_mesmo_partido, cor: COR.azul, tit: `Outro do mesmo partido: ${pct(r.pc_outro_do_mesmo_partido, 0)}` }, { v: r.pc_troca_de_partido, cor: COR.terra, tit: `Troca de partido: ${pct(r.pc_troca_de_partido, 0)}` }] })), { max: 100, cols: ["Eleição", "Cidades"], nomesPartes: ["Mesmo prefeito", "Outro do mesmo partido", "Troca de partido"] }),
        nota: "O que aconteceu em cada prefeitura em relação à eleição anterior. O número à direita é a parte em que o poder trocou de partido." };
      const vistaIdadeAlt = { rot: "Idade de quem entra e de quem sai", legenda: leg([[COR.cinza, "Prefeito que saiu"], [COR.terra, "Prefeito que entrou"], [COR.escuro, "Prefeito reeleito"]]),
        graf: () => pares(A.map((r) => ({ rot: String(r.nr_ano_eleicao), v: [r.vr_idade_quem_saiu, r.vr_idade_quem_entrou, r.vr_idade_reeleito] })), { nomes: ["saiu", "entrou", "reeleito"], cores: [COR.cinza, COR.terra, COR.escuro], max: 60, fmt: anos1, cols: ["Eleição"] }),
        nota: "Idade média na posse, nas prefeituras que trocaram de partido (quem saiu e quem entrou) e dos prefeitos reeleitos." };
      const vistaCam = { rot: "Renovação na Câmara", legenda: leg([[COR.terra, "Novatos"], [COR.escuro, "Reeleitos"]]),
        graf: () => pares(D.map((r) => ({ rot: String(r.nr_ano_eleicao), sub: `${pct(r.pc_novatos, 0)} de novatos`, v: [r.vr_idade_novatos, r.vr_idade_reeleitos] })), { nomes: ["novatos", "reeleitos"], cores: [COR.terra, COR.escuro], max: 60, fmt: anos1, cols: ["Eleição", "Novatos"] }),
        nota: "Deputados federais eleitos que não eram deputados federais na legislatura anterior (novatos) e os que voltaram, com a idade média na posse." };
      tema({ id: "t10", n: 10, grupo: "Perfil", titulo: "Idade e alternância de poder", antigas: ["q7"],
        enunciado: ["Existe relação entre a idade dos candidatos e a alternância de poder ao longo do tempo?"],
        curta: `Prefeito de até 39 anos se reelegeu em ${pct(r1.pc_reeleitos, 0)} das tentativas; com 70 ou mais, em ${pct(r5.pc_reeleitos, 0)}.`,
        num: `${pct(r1.pc_reeleitos, 0)} × ${pct(r5.pc_reeleitos, 0)}`, numRot: "dos prefeitos com até 39 × com 70 anos ou mais que tentaram se reeleger conseguiram",
        resposta: `Sim: quanto mais velho o prefeito, menor a chance de continuar. De 2004 a 2024, ${pct(r1.pc_reeleitos, 0)} dos prefeitos com até 39 anos que tentaram a reeleição conseguiram; com 70 anos ou mais, ${pct(r5.pc_reeleitos, 0)}`,
        pontos: [
          `<b>Quando o poder troca de mãos, entra alguém mais novo:</b> em 2024, o prefeito que saiu tinha ${anos1(a24.vr_idade_quem_saiu)} em média; o que entrou, ${anos1(a24.vr_idade_quem_entrou)}.`,
          `<b>A alternância diminuiu:</b> em 2016, ${pct(a16.pc_troca_de_partido, 0)} das prefeituras trocaram de partido; em 2024, ${pct(a24.pc_troca_de_partido, 0)}, e ${pct(a24.pc_mesmo_prefeito, 0)} reelegeram o mesmo prefeito.`,
          `<b>Na Câmara dos Deputados, o novato é mais jovem:</b> em 2022, ${pct(d22.pc_novatos, 0)} dos deputados federais eram novatos, com ${anos1(d22.vr_idade_novatos)} em média; os reeleitos tinham ${anos1(d22.vr_idade_reeleitos)}.`,
          `<b>Mas jovem não vota em jovem:</b> nas cidades com o eleitorado mais jovem, ${pct(jy.pc_eleitorado_ate_29, 0)} dos eleitores têm até 29 anos, e só ${pct(jy.pc_eleitos_ate_29)} dos vereadores eleitos em 2024.`],
        vistas: [vistaRe, vistaAlt, vistaIdadeAlt, vistaCam, Q.q7.vistas[0]],
        cuidado: ["A pessoa é seguida pelo título de eleitor; 1996 fica de fora por não ter o título.", "Partido pela linhagem: PFL, DEM e União contam como o mesmo, e PR e PL também, para mudança de nome não parecer troca.", "É associação: o prefeito mais velho pode, por exemplo, estar no segundo mandato e não poder concorrer a um terceiro."],
        como: "Prefeitos e deputados federais eleitos (TSE), ligados entre uma eleição e a seguinte pelo título de eleitor, com a idade declarada na data da posse. Partido do prefeito pela linhagem do partido (página Partidos). Eleitorado por idade: perfil do eleitorado do TSE.",
        tabelas: ["candidatura", "pessoa", "situacao_totalizacao", "vw_partido_ano", "eleitorado_perfil", "vw_eleitorado_municipio"], consultas: ["t10a", "t10b", "t10c", "q7c", "q7d", "q7"], fonte: "TSE" });
    }

    // ---------- Tema 11 ----------
    {
      const S = L("t11a"), Qn = L("t11b");
      const y = (a) => S.find((r) => r.nr_ano === a) || {};
      const b04 = y(2004), b14 = y(2014), b10 = y(2010), b18 = y(2018), b24 = y(2024);
      const q = (a, n) => Qn.find((r) => r.nr_ano === a && r.nr_quintil === n) || {};
      const q12a = q(2012, 1), q12e = q(2012, 5), q24a = q(2024, 1), q24e = q(2024, 5);
      const anos = S.map((r) => r.nr_ano);
      const vistaSerie = { rot: "Linha do tempo", legenda: leg([[COR.verde, "Benefícios do Bolsa Família (milhões)"], [COR.terra, "Parte das campanhas paga por empresas (%)"]]),
        graf: () => linhas({ anos, max: 40, rot: "Bolsa Família e dinheiro de empresas nas campanhas", fmt: (v) => N1.format(v), fmtPonto: (v) => N1.format(v), fmtEixo: (t) => String(Math.round(t)),
          series: [{ nome: "Bolsa Família (milhões de benefícios)", curto: "Bolsa Família", cor: COR.verde, grossa: true, v: S.map((r) => (r.qt_beneficios == null ? null : r.qt_beneficios / 1e6)) }, { nome: "Empresas (% das campanhas)", curto: "Empresas", cor: COR.terra, grossa: true, v: S.map((r) => (r.pc_doacao_empresas == null ? null : r.pc_doacao_empresas)) }] }),
        nota: "Benefícios pagos em dezembro de cada ano (milhões) e parte da receita dos candidatos que veio de empresas, nos anos de eleição com prestação de contas (2010 em diante)." };
      const vistaQ = (a) => ({ rot: `Cidades pelo alcance do programa (${a})`, legenda: leg([[COR.terra, "Empresas na receita das campanhas"], [COR.esq, "Prefeito eleito de esquerda"], [COR.dir, "Prefeito eleito de direita"]]),
        graf: () => pares(Qn.filter((r) => r.nr_ano === a).map((r) => ({ rot: `${pct(r.pc_alcance_min, 0)} a ${r.nr_quintil === 5 ? "mais" : pct(r.pc_alcance_max, 0)}`, sub: `${V.int(r.qt_municipios)} cidades`, v: [r.pc_doacao_empresas, r.pc_prefeito_esquerda, r.pc_prefeito_direita] })), { nomes: ["empresas", "prefeito de esquerda", "prefeito de direita"], cores: [COR.terra, COR.esq, COR.dir], max: 100, fmt: (v) => pct(v, 0), cols: ["Benefícios por 100 eleitores", "Cidades"] }),
        nota: "Cidades em cinco grupos do mesmo tamanho pelo número de benefícios do Bolsa Família por eleitor (dezembro do ano da eleição). Campanhas de prefeito e vereador." });
      tema({ id: "t11", n: 11, grupo: "Dinheiro", titulo: "Doações de campanha e Bolsa Família",
        enunciado: ["Como as doações de campanha de pessoas jurídicas (PJ) se comportam ao longo da linha do tempo em relação ao Bolsa Família?"],
        curta: `As empresas pagavam ${pct(b14.pc_doacao_empresas, 0)} das campanhas em 2014 e ${pct(b18.pc_doacao_empresas)} em 2018; o Bolsa Família continuou.`,
        num: `${pct(b14.pc_doacao_empresas, 0)} → ${pct(b18.pc_doacao_empresas)}`, numRot: "das campanhas pagas por empresas (2014 → 2018), enquanto o Bolsa Família seguiu com 14 milhões de benefícios",
        resposta: `As duas linhas seguem caminhos separados: o Bolsa Família cresceu de ${milhoes(b04.qt_beneficios)} de benefícios (2004) para ${milhoes(b14.qt_beneficios)} (2014) enquanto as empresas pagavam de ${pct(Math.min(b10.pc_doacao_empresas, b14.pc_doacao_empresas, y(2012).pc_doacao_empresas), 0)} a ${pct(b10.pc_doacao_empresas, 0)} das campanhas. Depois da proibição de 2015, a doação de empresas caiu a ${pct(b18.pc_doacao_empresas)}, e o programa continuou`,
        pontos: [
          `<b>Antes da proibição, as empresas doavam igual em todo lugar:</b> em 2012, pagavam ${pct(q12a.pc_doacao_empresas, 0)} das campanhas municipais nas cidades onde o Bolsa Família alcança menos gente e ${pct(q12e.pc_doacao_empresas, 0)} onde alcança mais.`,
          `<b>O alcance do programa separa o voto, não o dinheiro:</b> em 2024, a esquerda elegeu o prefeito em ${pct(q24e.pc_prefeito_esquerda, 0)} das cidades com mais benefícios por eleitor e em ${pct(q24a.pc_prefeito_esquerda, 0)} das com menos; a direita, em ${pct(q24e.pc_prefeito_direita, 0)} e ${pct(q24a.pc_prefeito_direita, 0)}.`,
          `<b>Depois de 2015, o dinheiro público ocupou o lugar das empresas:</b> em 2024, ele foi ${pct(q24a.pc_dinheiro_publico, 0)} a ${pct(q24e.pc_dinheiro_publico, 0)} da receita das campanhas municipais, em todos os grupos de cidades.`,
          `<b>O programa ficou maior em 2022:</b> ${milhoes(y(2022).qt_beneficios)} de benefícios em dezembro (como Auxílio Brasil), e ${milhoes(b24.qt_beneficios)} em 2024.`],
        vistas: [vistaSerie, vistaQ(2012), vistaQ(2024), vistaQ(2016)],
        cuidado: ["O Bolsa Família é medido pelos benefícios pagos em dezembro; entre 2021 e 2023 o programa se chamou Auxílio Brasil.", "Em 2010, 2012 e 2014 parte do dinheiro de empresas passava pelo partido antes de chegar ao candidato, então a parte das empresas é no mínimo a mostrada.", "Comparar as duas séries mostra o que aconteceu ao mesmo tempo, não que uma causou a outra."],
        como: "Bolsa Família: número de benefícios e valor pago em dezembro, por município, de 2004 a 2025 (Ministério do Desenvolvimento e Assistência Social, pela API do IpeaData), carregados na tabela bolsa_familia_municipio. Doações de empresas: receitas dos candidatos com doador pessoa jurídica (TSE). Alcance do programa: benefícios ÷ eleitores aptos da cidade.",
        tabelas: ["bolsa_familia_municipio", "receita", "candidatura", "comparecimento", "vw_partido_ano"], consultas: ["t11a", "t11b"], fonte: "MDS (via IpeaData) e TSE" });
    }

    // ---------- Tema 12 ----------
    {
      const R = Q.q8.R, E = Q.q8.E;
      const r14 = R.find((r) => r.nr_ano_eleicao === 2014) || {}, r18 = R.find((r) => r.nr_ano_eleicao === 2018) || {}, r10 = R.find((r) => r.nr_ano_eleicao === 2010) || {};
      const e14 = E.filter((r) => r.nr_ano_eleicao === 2014), mx = e14.reduce((a, b) => (b.pc_pj > (a.pc_pj || 0) ? b : a), {}), mn = e14.reduce((a, b) => (b.pc_pj < (a.pc_pj ?? 1e9) ? b : a), {});
      tema({ id: "t12", n: 12, grupo: "Dinheiro", titulo: "Doações de pessoas jurídicas e viés político", antigas: ["q8"],
        enunciado: ["Qual é a relação entre doações de pessoas jurídicas (PJ) e o viés político?"],
        curta: `Para todos os lados: em 2014, de ${pct(mn.pc_pj, 0)} a ${pct(mx.pc_pj, 0)} das campanhas de cada campo político.`,
        num: pct(r14.pc_pj, 0), numRot: `das campanhas eram pagas por empresas em 2014; ${pct(r18.pc_pj)} em 2018`,
        resposta: `As empresas doavam para todos os lados: em 2014, pagavam de ${pct(mn.pc_pj, 0)} (${(V.ESPN[mn.ds_espectro] || "").toLowerCase()}) a ${pct(mx.pc_pj, 0)} (${(V.ESPN[mx.ds_espectro] || "").toLowerCase()}) das campanhas de cada campo político`,
        pontos: [
          `<b>Todos dependiam das empresas:</b> em 2010, ${pct(r10.pc_pj, 0)} de todo o dinheiro dos candidatos vinha de empresas (${reais(r10.vr_doacao_pj)}); em 2014, ${reais(r14.vr_doacao_pj)}.`,
          `<b>A proibição acabou com isso:</b> o Supremo proibiu a doação de empresas em 2015; em 2018 ela era ${pct(r18.pc_pj)} da receita.`,
          `<b>Quem ocupou o lugar foi o dinheiro público</b> (tema 15).`],
        vistas: Q.q8.vistas,
        cuidado: ["Em 2010, 2012 e 2014, o dinheiro de empresa que passava pelo partido aparece como receita do partido: a parte das empresas é no mínimo a mostrada.", "O campo político é o do partido do candidato naquela eleição."],
        como: "Receitas declaradas pelos candidatos ao TSE com doador pessoa jurídica (CNPJ), fora presidente, somadas pelo campo político do partido do candidato.",
        tabelas: ["receita", "candidatura", "partido", "vw_partido_ano"], consultas: ["q8", "q8b"], fonte: "TSE, prestação de contas" });
    }

    // ---------- Tema 13 ----------
    {
      const R = L("t13a");
      const reg = (a, g) => R.find((r) => r.nr_ano_eleicao === a && r.nm_regiao === g && !r.sg_uf) || {};
      const ne22 = reg(2022, "Nordeste"), co22 = reg(2022, "Centro-Oeste"), su22 = reg(2022, "Sul"), su14 = reg(2014, "Sul"), ne14 = reg(2014, "Nordeste");
      const ufs22 = R.filter((r) => r.nr_ano_eleicao === 2022 && r.sg_uf).sort((a, b) => (b.pc_direita - b.pc_esquerda) - (a.pc_direita - a.pc_esquerda));
      const uD = ufs22[0] || {}, uE = ufs22[ufs22.length - 1] || {};
      const vistaCalor = { rot: "Mapa de calor · presidente", legenda: `<p class="achado__leg"><span><i style="background:${V.ESPC.ESQUERDA}"></i>E: esquerda na frente</span><span><i style="background:${V.ESPC.CENTRO}"></i>C: centro</span><span><i style="background:${V.ESPC.DIREITA}"></i>D: direita</span><span>o número é a parte dos votos do campo que ficou na frente</span></p>`,
        graf: () => ({ html: calorHTML(R), tab: { cols: ["Estado", ...[...new Set(R.map((r) => r.nr_ano_eleicao))].sort().map(String)], linhas: [...new Set(R.map((r) => r.sg_uf || r.nm_regiao))].map((k) => [k, ...[...new Set(R.map((r) => r.nr_ano_eleicao))].sort().map((a) => { const r = R.find((x) => x.nr_ano_eleicao === a && (x.sg_uf || x.nm_regiao) === k); return r ? `E ${pct(r.pc_esquerda, 0)} · D ${pct(r.pc_direita, 0)}` : "—"; })]) } }),
        nota: "Cada quadrado é um estado numa eleição: a cor mostra o campo político que teve mais votos para presidente no 1º turno (esquerda, centro ou direita) e fica mais forte quanto maior a parte dele. Esquerda e direita somam o centro-esquerda e o centro-direita. Em 1994 e 1998 o PSDB de Fernando Henrique conta como centro." };
      const vistaReg = (a) => ({ rot: `Regiões ${a}`, legenda: leg([[COR.esq, "Esquerda"], [COR.cen, "Centro"], [COR.dir, "Direita"]]),
        graf: () => barras(["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"].map((g) => { const r = reg(a, g); return { rot: g, v: 100, vTxt: `D ${pct(r.pc_direita, 0)}`, partes: [{ v: r.pc_esquerda, cor: COR.esq, tit: `Esquerda: ${pct(r.pc_esquerda, 0)}` }, { v: r.pc_centro, cor: COR.cen, tit: `Centro: ${pct(r.pc_centro, 0)}` }, { v: r.pc_direita, cor: COR.dir, tit: `Direita: ${pct(r.pc_direita, 0)}` }] }; }), { max: 100, cols: ["Região"], nomesPartes: ["Esquerda", "Centro", "Direita"] }),
        nota: "Parte dos votos para presidente no 1º turno, por campo político do partido do candidato." });
      tema({ id: "t13", n: 13, grupo: "Território", titulo: "Viés político regional",
        enunciado: ["Qual é o viés político predominante em determinada região?", "Representar os resultados por meio de um mapa de calor."],
        curta: `Presidente 2022: esquerda com ${pct(ne22.pc_esquerda, 0)} no Nordeste, direita com ${pct(co22.pc_direita, 0)} no Centro-Oeste.`,
        num: `${pct(ne22.pc_esquerda, 0)} × ${pct(co22.pc_direita, 0)}`, numRot: "esquerda no Nordeste × direita no Centro-Oeste, presidente 2022",
        resposta: `O Nordeste é o mais à esquerda: em 2022, ${pct(ne22.pc_esquerda, 0)} dos votos para presidente foram para a esquerda. O Centro-Oeste e o Sul são os mais à direita: ${pct(co22.pc_direita, 0)} e ${pct(su22.pc_direita, 0)} para a direita`,
        pontos: [
          `<b>A divisão regional é recente:</b> em 2002, todas as regiões deram pelo menos ${pct(Math.min(...["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"].map((g) => reg(2002, g).pc_esquerda)), 0)} dos votos para a esquerda; a separação entre Nordeste e Sul cresce a partir de 2006.`,
          `<b>Em 2014,</b> a esquerda teve ${pct(ne14.pc_esquerda, 0)} no Nordeste e ${pct(su14.pc_esquerda, 0)} no Sul.`,
          `<b>Os extremos em 2022:</b> ${uE.sg_uf} (esquerda com ${pct(uE.pc_esquerda, 0)}) e ${uD.sg_uf} (direita com ${pct(uD.pc_direita, 0)}).`,
          `<b>Cidade a cidade,</b> o mapa do site mostra o lado de quem venceu em cada uma das 5.570, em sete cargos.`],
        vistas: [vistaCalor, vistaReg(2022), vistaReg(2026), vistaReg(2014)],
        cuidado: ["O lado é o do partido do candidato naquela eleição (três estudos acadêmicos e o voto na Câmara). O PSDB fica na fronteira entre centro e direita e muda de faixa em alguns anos.", "É o voto para presidente; para prefeito e deputado o mapa regional é outro (veja o mapa)."],
        como: "Votos nominais de cada candidato a presidente no 1º turno em cada cidade (TSE), somados por estado e região, separados pelo campo político do partido naquela eleição.",
        tabelas: ["votacao_candidato", "candidatura", "municipio", "uf", "vw_partido_ano"], consultas: ["t13a"], link: "#/mapa/e/PRES2022", linkTxt: "Ver o mapa das 5.570 cidades", fonte: "TSE; notas dos partidos: Zucco e Power (2024), Bolognesi, Ribeiro e Codato (2023), V-Party (2022) e Câmara dos Deputados" });
    }

    // ---------- Tema 14 ----------
    {
      const A = L("t14a"), B = L("t14b");
      const a = (cg, n) => A.find((r) => r.ds_cargo === cg && r.qt_trocas === n) || {};
      const pf0 = a("PREFEITO", 0), pr0 = a("PRESIDENTE", 0), pr1 = a("PRESIDENTE", 1);
      const b = (cg, ano) => B.find((r) => r.ds_cargo === cg && r.nr_ano_eleicao === ano) || {};
      const p22 = b("PRESIDENTE", 2022), p26 = b("PRESIDENTE", 2026), f24 = b("PREFEITO", 2024), f12 = b("PREFEITO", 2012);
      const pfMed = A.filter((r) => r.ds_cargo === "PREFEITO").reduce((s, r) => s + r.qt_trocas * r.pc_municipios, 0) / 100;
      const vistaTrocas = { rot: "Quantas vezes a cidade trocou de lado", legenda: leg([[COR.escuro, "Presidente (1º colocado)"], [COR.terra, "Prefeito eleito"]]),
        graf: () => pares([0, 1, 2, 3, 4, 5, 6].map((n) => ({ rot: n === 6 ? "6 ou mais" : n === 1 ? "1 vez" : n === 0 ? "Nunca" : `${n} vezes`, v: [a("PRESIDENTE", n).pc_municipios, a("PREFEITO", n).pc_municipios] })), { nomes: ["presidente", "prefeito"], cores: [COR.escuro, COR.terra], max: 50, fmt: (v) => pct(v, 0), cols: ["Trocas de lado"] }),
        nota: "Parte das cidades por número de trocas de campo político (esquerda, centro, direita) entre uma eleição e a seguinte: presidente de 1994 a 2026, prefeito de 1996 a 2024." };
      const vistaAno = { rot: "Eleição a eleição", legenda: leg([[COR.escuro, "Presidente"], [COR.terra, "Prefeito"]]),
        graf: () => { const anos = [...new Set(B.map((r) => r.nr_ano_eleicao))].sort();
          return linhas({ anos, max: 100, rot: "Parte das cidades que repetiu o lado da eleição anterior", series: [["PRESIDENTE", "Presidente", COR.escuro], ["PREFEITO", "Prefeito", COR.terra]].map(([cg, nome, cor]) => ({ nome, cor, grossa: true, v: anos.map((x) => (B.find((r) => r.ds_cargo === cg && r.nr_ano_eleicao === x) || {}).pc_mesmo_lado ?? null) })) }); },
        nota: "Parte das cidades em que o 1º colocado para presidente (ou o prefeito eleito) era do mesmo campo político que na eleição anterior do mesmo cargo." };
      tema({ id: "t14", n: 14, grupo: "Território", titulo: "Manutenção do viés político ao longo do tempo", antigas: ["q9"],
        enunciado: ["Na linha do tempo, o município mantém o mesmo viés político?"],
        curta: `Só ${pct(pf0.pc_municipios, 0)} das cidades elegeram prefeitos do mesmo lado em todas as eleições desde 1996.`,
        num: pct(pf0.pc_municipios, 0), numRot: "das cidades tiveram prefeitos do mesmo lado em todas as eleições, de 1996 a 2024",
        resposta: `Para prefeito, quase nunca: só ${pct(pf0.pc_municipios, 0)} das cidades elegeram prefeitos do mesmo campo político em todas as eleições desde 1996. Para presidente, as cidades ficaram mais fiéis: ${pct(p22.pc_mesmo_lado, 0)} repetiram o lado de 2018 em 2022`,
        pontos: [
          `<b>Prefeito troca muito:</b> a cidade típica mudou de lado umas ${N1.format(pfMed)} vezes em 8 eleições. Em 2012, só ${pct(f12.pc_mesmo_lado, 0)} repetiram o lado do prefeito anterior; em 2024, ${pct(f24.pc_mesmo_lado, 0)}.`,
          `<b>Presidente:</b> ${pct(pr1.pc_municipios, 0)} das cidades trocaram de lado uma vez só, e ${pct(pr0.pc_municipios, 0)} nunca trocaram de 1994 a 2026. A polarização deixou o voto mais estável: ${pct(p26.pc_mesmo_lado, 0)} repetiram em 2026 o lado de 2022.`,
          `<b>Quando viram, viram juntas:</b> de 2022 para 2026, ${V.int(p26.qt_esquerda_para_direita)} cidades passaram da esquerda para a direita para presidente, e ${V.int(p26.qt_direita_para_esquerda)} no sentido contrário.`,
          `<b>Abaixo, a linha da sua cidade,</b> cargo a cargo, de 1994 a 2026.`],
        vistas: [vistaTrocas, vistaAno, ...Q.q9.vistas],
        extra: cidadeHTML, ligar: ligarCidade,
        cuidado: ["O PSDB fica na fronteira entre centro e centro-direita e muda de faixa em alguns anos; isso conta como troca nas eleições de 1998 a 2014.", "Para presidente, o lado é o do 1º colocado na cidade no 1º turno; para prefeito, o do eleito."],
        como: "Campo político do partido do 1º colocado para presidente (1º turno) e do prefeito eleito em cada cidade, eleição a eleição (TSE), com a nota do partido naquela eleição. A linha da cidade usa a nota média dos votos de cada cargo (Σ votos do partido × nota do partido ÷ Σ votos).",
        tabelas: ["votacao_candidato", "votacao_partido", "candidatura", "municipio", "vw_partido_ano", "partido_nota"], consultas: ["t14a", "t14b", "q9", "q9b"], link: "#/tempo", linkTxt: "Ver a máquina do tempo (o mapa eleição a eleição)", fonte: "TSE; notas dos partidos: Zucco e Power (2024), Bolognesi, Ribeiro e Codato (2023), V-Party (2022) e Câmara" });
    }

    // ---------- Tema 15 ----------
    {
      const F = L("t15a"), fe = Q.q10.g(2022, "DEPUTADO FEDERAL", "eleito"), fn = Q.q10.g(2022, "DEPUTADO FEDERAL", "não eleito");
      const f = (cg, n) => F.find((r) => r.ds_cargo === cg && r.nr_faixa === n) || {};
      const d4 = f("DEPUTADO FEDERAL", 4), d3 = f("DEPUTADO FEDERAL", 3), d2 = f("DEPUTADO FEDERAL", 2), d1 = f("DEPUTADO FEDERAL", 1);
      const v4 = f("VEREADOR", 4), v2 = f("VEREADOR", 2);
      const vistaDep = (cg, a) => ({ rot: `Dependência do fundo · ${CARGO[cg]} ${a}`, graf: () => barras(F.filter((r) => r.ds_cargo === cg && r.nr_faixa > 0).map((r) => ({ rot: cap1(r.ds_faixa), sub: `${V.int(r.qt_candidatos)} candidatos · ${centavos(r.vr_gasto_por_voto)} por voto`, v: r.pc_taxa_sucesso })), { cor: COR.escuro, cols: ["Origem do dinheiro", "Candidatos e gasto por voto", "Eleitos"] }),
        nota: "Candidatos pela parte da sua receita que veio dos fundos públicos (eleitoral e partidário). A barra é a parte que se elegeu." });
      tema({ id: "t15", n: 15, grupo: "Dinheiro", titulo: "Dependência de repasses públicos e financiamento", antigas: ["q10"],
        enunciado: ["Como se comportam os candidatos que dependem mais de repasses públicos em comparação com aqueles financiados por outras fontes?"],
        curta: `Com 90% ou mais de dinheiro público, ${pct(d4.pc_taxa_sucesso)} se elegeram deputado federal; misturando, ${pct(d3.pc_taxa_sucesso, 0)}.`,
        num: `${pct(d4.pc_taxa_sucesso)} × ${pct(d3.pc_taxa_sucesso, 0)}`, numRot: "se elegeram entre os candidatos a deputado federal com 90% ou mais de dinheiro público × entre os que misturavam (2022)",
        resposta: `Quem depende só do fundo público perde mais: dos candidatos a deputado federal de 2022 com 90% ou mais de dinheiro público, ${pct(d4.pc_taxa_sucesso)} se elegeram; dos que misturavam dinheiro público e privado, ${pct(d3.pc_taxa_sucesso, 0)}`,
        pontos: [
          `<b>O fundo vai para todos, mas em quantidades bem diferentes:</b> o deputado federal eleito em 2022 recebeu, em média, ${reais(fe.vr_publico_medio)} de dinheiro público; o não eleito, ${reais(fn.vr_publico_medio)}.`,
          `<b>Dinheiro só público costuma ser pouco:</b> o candidato a deputado federal que viveu de 90% ou mais de fundo teve receita típica de ${reais(d4.vr_receita_mediana)} e ${V.int(d4.qt_votos_mediano)} votos; quem tinha menos da metade pública, ${reais(d2.vr_receita_mediana)} e ${V.int(d2.qt_votos_mediano)} votos.`,
          `<b>E o voto sai mais caro:</b> ${centavos(d4.vr_gasto_por_voto)} por voto para quem depende do fundo, contra ${centavos(d2.vr_gasto_por_voto)} para quem tem menos da metade pública.`,
          `<b>Só dinheiro privado também não basta:</b> ${pct(d1.pc_taxa_sucesso)} dos candidatos a deputado federal sem nenhum dinheiro público se elegeram. Para vereador, a diferença se repete: ${pct(v4.pc_taxa_sucesso)} (quase só fundo) contra ${pct(v2.pc_taxa_sucesso)} (menos da metade).`],
        vistas: [vistaDep("DEPUTADO FEDERAL", 2022), vistaDep("VEREADOR", 2024), vistaDep("PREFEITO", 2024), Q.q10.vistas[0], ...Q.q10.vistas.slice(2, 3)],
        cuidado: ["O partido manda mais dinheiro para quem já tem chance, então a relação entre fundo e vitória vale nos dois sentidos.", "“Dinheiro público” é o Fundo Especial de Financiamento de Campanha e o Fundo Partidário, como declarados pelo candidato."],
        como: "Receitas declaradas pelos candidatos ao TSE, separadas em públicas (FEFC e Fundo Partidário) e privadas. Cada candidato entra numa faixa pela parte pública da sua receita; a taxa de sucesso é eleitos ÷ candidatos da faixa.",
        tabelas: ["vw_candidatura_resumo", "receita", "candidatura", "votacao_candidato", "situacao_totalizacao"], consultas: ["t15a", "q10", "q10b"], fonte: "TSE, prestação de contas" });
    }

    // ---------- Tema 16 ----------
    {
      const A = L("t16a").map((r) => ({ ...r, pc: (100 * r.qt_inaptas) / r.qt_candidaturas })), P = L("t16b"), X = L("t16c");
      const y = (a) => A.find((r) => r.nr_ano_eleicao === a) || {};
      const a20 = y(2020), a22 = y(2022), a16 = y(2016), a12 = y(2012);
      const pTop = P[0] || {}, pFim = P[P.length - 1] || {};
      const tot = X.reduce((s, r) => s + r.qt_candidaturas, 0), comV = X.reduce((s, r) => s + r.qt_com_votos_na_urna, 0), votos = X.reduce((s, r) => s + r.qt_votos_recebidos, 0);
      const ind = X.filter((r) => /^INDEFERIDO|INELEG/.test(r.ds_detalhe_situacao || "")).reduce((s, r) => s + r.qt_candidaturas, 0);
      const cas = X.filter((r) => /^CASSADO/.test(r.ds_detalhe_situacao || "")).reduce((s, r) => s + r.qt_candidaturas, 0);
      const ren = X.filter((r) => /^REN/.test(r.ds_detalhe_situacao || "")).reduce((s, r) => s + r.qt_candidaturas, 0);
      const vistaAno = { rot: "Eleição a eleição", graf: () => barras(A.map((r) => ({ rot: String(r.nr_ano_eleicao), sub: `${V.int(r.qt_candidaturas)} candidaturas`, v: r.pc, vTxt: pct(r.pc) })), { cor: COR.escuro, cols: ["Eleição", "Candidaturas", "Inaptas"] }),
        nota: "Parte das candidaturas que a Justiça Eleitoral não deixou valer: registro negado (indeferido ou inelegível), cassado, cancelado, ou renúncia e falecimento." };
      const vistaTipo = { rot: "Tipo de processo (2008 a 2016)", graf: () => barras(X.map((r) => ({ rot: cap1((r.ds_detalhe_situacao || "").toLowerCase()), sub: `${V.int(r.qt_com_votos_na_urna)} ainda receberam votos`, v: r.qt_candidaturas, vTxt: V.int(r.qt_candidaturas) })), { cor: COR.terra, cols: ["Situação do registro", "Com votos na urna", "Candidaturas"] }),
        nota: "Candidaturas a prefeito e vereador de 2008, 2012 e 2016 pela situação do registro (os anos em que o TSE publica o detalhe). Com recurso: o candidato recorreu da decisão." };
      const vistaPart = { rot: "Partido a partido (2020 e 2022)", legenda: leg(ESP5.map((k) => [V.ESPC[k], V.ESPN[k]])),
        graf: () => barras(P.map((r) => ({ rot: V.nomePartido(r.sg_partido), sub: `${V.int(r.qt_candidaturas)} candidaturas`, v: r.pc_inaptas, vTxt: pct(r.pc_inaptas), partes: [{ v: r.pc_inaptas, cor: corEsp(r.ds_espectro), tit: V.ESPN[r.ds_espectro] || "sem nota" }] })), { cols: ["Partido", "Candidaturas", "Inaptas"], nomesPartes: ["Inaptas"], fmtParte: (v) => pct(v, 1) }),
        nota: "Parte das candidaturas de cada partido que ficou inapta, eleições de 2020 e 2022 somadas. Partidos com 2 mil candidaturas ou mais, na cor do seu campo político." };
      tema({ id: "t16", n: 16, grupo: "Partidos", titulo: "Candidatos, partidos e processos",
        enunciado: ["Qual é o perfil dos processos em que cada candidato ou partido está envolvido?"],
        curta: `${pct(a20.pc)} das candidaturas de 2020 foram barradas pela Justiça Eleitoral.`,
        num: pct(a20.pc), numRot: "das candidaturas de 2020 foram barradas pela Justiça Eleitoral (registro negado, cassado ou cancelado, ou renúncia)",
        resposta: `Os processos que aparecem nos dados abertos são os de registro de candidatura: em 2020, ${V.int(a20.qt_inaptas)} candidaturas (${pct(a20.pc)}) ficaram inaptas, e em 2022, ${pct(a22.pc)}. O tipo mais comum é o registro negado (indeferido)`,
        pontos: [
          `<b>Perfil dos processos:</b> nas eleições municipais de 2008, 2012 e 2016, das ${V.int(tot)} candidaturas barradas, ${pct((100 * ind) / tot, 0)} tiveram o registro negado (por falta de documento, de filiação ou por inelegibilidade, como na Lei da Ficha Limpa), ${pct((100 * ren) / tot, 0)} foram renúncias e ${pct((100 * cas) / tot, 1)} cassações.`,
          `<b>Partidos pequenos têm mais candidaturas barradas:</b> em 2020 e 2022, ${pct(pTop.pc_inaptas)} das candidaturas do ${V.nomePartido(pTop.sg_partido)} ficaram inaptas; no ${V.nomePartido(pFim.sg_partido)}, ${pct(pFim.pc_inaptas)}.`,
          `<b>Barrado também recebe voto:</b> ${V.int(comV)} dessas candidaturas ainda estavam na urna enquanto recorriam e receberam ${V.int(votos)} votos, que não valeram.`,
          `<b>Ao longo do tempo:</b> ${pct(a12.pc)} das candidaturas ficaram inaptas em 2012 e ${pct(a16.pc)} em 2016, depois da Lei da Ficha Limpa (2010).`],
        vistas: [vistaAno, vistaTipo, vistaPart],
        cuidado: ["Processos criminais, de improbidade ou de contas não estão nos dados abertos do TSE; aqui entram só os julgamentos do registro da candidatura.", "De 2014 a 2022 o TSE publica só “apto” ou “inapto”, sem o motivo; em 2024 e 2026 o campo veio vazio. Por isso o tipo de processo é mostrado de 2008 a 2016.", "Indeferido não quer dizer condenado: muitos registros são negados por falha de documentação."],
        como: "Situação da candidatura e, quando o TSE publica, o detalhe (deferido, indeferido, cassado, inelegível, renúncia...) de cada candidato no arquivo de candidatos do TSE, de 1998 a 2022, carregados na tabela situacao_registro, mais os votos recebidos (votação nominal).",
        tabelas: ["situacao_registro", "candidatura", "partido", "vw_partido_ano", "votacao_candidato"], consultas: ["t16a", "t16b", "t16c"], fonte: "TSE, candidatos (situação do registro)" });
    }

    // ---------- as duas perguntas a mais do grupo ----------
    {
      const top = (Q.q11.ano(2024)[0]) || {}, imp = Q.q11.ano(2024).find((r) => /Impulsionamento/i.test(r.ds_origem_despesa)) || {}, imp18 = Q.q11.ano(2018).find((r) => /Impulsionamento/i.test(r.ds_origem_despesa)) || {};
      tema({ id: "e1", n: "+1", extra1: true, grupo: "A mais", titulo: "Onde vai o dinheiro da campanha?", antigas: ["q11"],
        enunciado: ["Pergunta a mais do grupo: onde o candidato investe em propaganda?"],
        curta: `${pct(top.pc_ano, 0)} do gasto das campanhas de 2024 foi com material impresso.`,
        num: pct(top.pc_ano, 0), numRot: "do gasto das campanhas foi com material impresso (2024)",
        resposta: `Em papel: em 2024, ${pct(top.pc_ano, 0)} do dinheiro das campanhas foi para material impresso (${reais(top.vr_total)}), a maior despesa em todas as eleições desde 2018`,
        pontos: [`<b>A internet cresce devagar:</b> o impulsionamento nas redes foi de ${pct(imp18.pc_ano)} do gasto em 2018 para ${pct(imp.pc_ano)} em 2024.`,
          `<b>Cada cargo gasta de um jeito:</b> em 2024, o vereador pôs ${pct(Q.q11.p24("VEREADOR", 1), 0)} em material impresso e ${pct(Q.q11.p24("VEREADOR", 4), 0)} em militância de rua; o prefeito, ${pct(Q.q11.p24("PREFEITO", 3), 0)} em rádio, TV e vídeo.`],
        vistas: Q.q11.vistas, cuidado: ["As categorias são as que o próprio candidato escolhe na prestação de contas."],
        como: "Despesas contratadas declaradas pelos candidatos ao TSE, pela categoria escolhida na prestação de contas, juntadas em onze tipos (view vw_despesa_tipo).",
        tabelas: ["despesa", "vw_despesa_tipo", "candidatura"], consultas: ["q11", "q11b", "q11c"], fonte: "TSE, prestação de contas" });
      const g18 = Q.q12.R.find((r) => r.nr_ano === 2018) || {}, tot = Q.q12.B.reduce((s, r) => s + r.qt_pessoas, 0), um = (Q.q12.B.find((r) => r.qt_vitorias === 1) || {}).qt_pessoas || 0;
      tema({ id: "e2", n: "+2", grupo: "A mais", titulo: "Qual é o histórico de cada político?", antigas: ["q12"],
        enunciado: ["Pergunta a mais do grupo: o político e sua linha do tempo — sobrevivência na carreira."],
        curta: `De quem já venceu uma eleição desde 1994, ${pct((100 * um) / tot, 0)} venceu uma só.`,
        num: pct(g18.pc_eleito_de_novo_4_anos, 0), numRot: "dos deputados, senadores e governadores de 2018 se elegeram de novo em 2022",
        resposta: `A carreira é curta para a maioria: de 1994 a 2026, ${V.int(tot)} pessoas venceram alguma eleição, e ${pct((100 * um) / tot, 0)} delas venceram uma só. Dos deputados, senadores e governadores eleitos em 2018, ${Math.round(g18.pc_eleito_de_novo_4_anos)} em cada 100 voltaram em 2022`,
        pontos: [`<b>A ficha de cada um dos 2,4 milhões de candidatos</b> está na página Políticos: cada eleição, partido, votos, dinheiro, bens e, para deputado federal, como votou na Câmara.`],
        vistas: Q.q12.vistas, extra: politicoHTML(Q.q12.T), ligar: ligarPolitico,
        cuidado: ["A mesma pessoa é seguida pelo título de eleitor; 1996 fica de fora.", "Senador tem mandato de oito anos, o que puxa para baixo a volta de 4 anos."],
        como: "Candidaturas de 1994 a 2026 (TSE) ligadas pelo título de eleitor; votos na Câmara: dados abertos da Câmara dos Deputados, 2019 a 2026.",
        tabelas: ["candidatura", "pessoa", "situacao_totalizacao", "votacao_camara", "voto_deputado", "orientacao_bancada", "deputado_camara"], consultas: ["q12", "q12b", "q12c", "q12d", "q12e"], link: "#/politicos", linkTxt: "Abrir a busca de políticos", fonte: "TSE e Câmara dos Deputados" });
    }
    return T;
  }

  /* ---------- tema 14: a linha do tempo de uma cidade (data/br/vies/{UF}, feito por scripts/vies_cidades.py) ---------- */
  const cidadeHTML = `<section class="pq-painel pq-cidade" aria-labelledby="pq-cid-tit">
      <div class="pq-painel__cab"><div><h2 class="pq-painel__tit" id="pq-cid-tit">A sua cidade, cargo a cargo</h2>
        <p class="pq-painel__rec">Nota média dos votos no 1º turno, de −1 (esquerda) a +1 (direita), de 1994 a 2026</p></div></div>
      <p class="pq-cidade__busca"><label for="pq-cid-busca">Cidade</label>
        <input id="pq-cid-busca" type="text" list="pq-cid-lista" autocomplete="off" spellcheck="false" placeholder="Digite o nome e escolha na lista"><datalist id="pq-cid-lista"></datalist></p>
      <p class="pq-cidade__res" id="pq-cid-res" aria-live="polite"></p>
      <div id="pq-cid-leg"></div><div class="pq-graf" id="pq-cid-graf"></div>
      <p class="pq-nota" id="pq-cid-nota"></p>
    </section>`;
  async function ligarCidade() {
    const BR = await V.baseBR(), inp = document.getElementById("pq-cid-busca");
    if (!inp) return;
    const rot = (c) => `${c.nome} (${c.uf})`, porRot = new Map(BR.lista.map((c) => [V.norm(rot(c)), c]));
    document.getElementById("pq-cid-lista").innerHTML = BR.lista.map((c) => `<option value="${V.esc(rot(c))}"></option>`).join("");
    const anos = Array.from({ length: 17 }, (_, i) => 1994 + 2 * i);
    async function mostrar(c) {
      const d = ((await V.dados("br/vies/" + c.uf)) || {})[c.ibge] || {};
      if (!document.getElementById("pq-cid-graf")) return;   // a pessoa já saiu da página
      const cgs = CARGOS_NOTA.filter(([k]) => d[k] && d[k].length);
      const series = cgs.map(([k, , nome, cor]) => { const m = new Map(d[k]); return { nome, cor, grossa: true, curto: nome.replace("Deputado ", "Dep. "), curtoM: nome.replace("Deputado federal", "Fed.").replace("Deputado estadual", "Est.").replace("Presidente", "Pres.").replace("Governador", "Gov.").replace("Senador", "Sen.").replace("Prefeito", "Pref.").replace("Vereador", "Ver."), v: anos.map((a) => m.get(a) ?? null) }; });
      const ult = (k) => (d[k] && d[k].length ? d[k][d[k].length - 1] : null), pres = ult("PRES"), ver = ult("VER");
      document.getElementById("pq-cid-res").innerHTML = `<b>${V.esc(c.nome)}</b>${pres ? `: para presidente, ${nota(pres[1])} em ${pres[0]}` : ""}${ver ? `${pres ? ";" : ":"} para vereador, ${nota(ver[1])} em ${ver[0]}` : ""}.`;
      document.getElementById("pq-cid-leg").innerHTML = V.graf.leg(cgs.map(([, , nome, cor]) => [cor, nome]));
      document.getElementById("pq-cid-graf").innerHTML = series.length ? V.graf.linhas({ anos, series, min: -1, max: 1, meio: 0, fmt: (v) => nota(v), fmtPonto: (v) => nota(v), fmtEixo: (t) => nota(t, 1), faixas: [[-1, -0.25, V.ESPC.ESQUERDA], [0.25, 1, V.ESPC.DIREITA]], rot: `Nota média dos votos em ${c.nome}, por cargo` }) : '<p class="vazio">Sem votos por partido para esta cidade.</p>';
      document.getElementById("pq-cid-nota").innerHTML = `As faixas sombreadas são esquerda (abaixo de −0,25) e direita (acima de +0,25). Só entram as eleições em que pelo menos 80% dos votos da cidade foram para partidos com nota. <a href="${V.linkBR ? V.linkBR(c.uf, c.ibge) : "#/mapa/br/" + c.uf + "/c/" + c.ibge}">Ver ${V.esc(c.nome)} no mapa</a>.`;
    }
    const escolher = () => { const c = porRot.get(V.norm(inp.value.trim())); if (c) { mostrar(c); try { localStorage.setItem("vav-pq-cidade", c.ibge); } catch (e) {} } };
    inp.addEventListener("change", escolher);
    inp.addEventListener("input", escolher);
    let ib = "2211001";   // Teresina, até a pessoa escolher outra
    try { ib = localStorage.getItem("vav-pq-cidade") || ib; } catch (e) {}
    const c0 = BR.porIbge.get(ib) || BR.porIbge.get("2211001");
    inp.value = rot(c0); await mostrar(c0);
  }

  /* ---------- pergunta a mais 2: a busca de políticos ---------- */
  const politicoHTML = (T) => `<section class="pq-painel" aria-labelledby="pq-pol-tit"><div class="pq-painel__cab"><div><h2 class="pq-painel__tit" id="pq-pol-tit">O histórico de cada político</h2>
      <p class="pq-painel__rec">Todos os candidatos de 1994 a 2026: cada eleição, o partido e o lado dele, votos, dinheiro, bens e plano de governo</p></div></div>
      <div class="pol-busca" role="search"><label for="pq-pol-busca">Nome do político</label><input id="pq-pol-busca" type="search" autocomplete="off" spellcheck="false" placeholder="Nome civil ou nome na urna, pelo começo"></div>
      <ol class="pol-lista" id="pq-pol-lista">${T.slice(0, 5).map((r) => `<li><span class="pq-nota"><b>${V.esc(V.titulo(r.nm_pessoa))}</b>: ${r.qt_vitorias} vitórias em ${r.qt_candidaturas} eleições. ${V.esc(r.ds_trajetoria)}</span></li>`).join("")}</ol>
      <p class="pq-nota">Até você buscar, a lista mostra os que mais venceram eleições de 1994 a 2026.</p></section>`;
  async function ligarPolitico() {
    const inp = document.getElementById("pq-pol-busca"); if (!inp) return; const BR = await V.baseBR(); let tmr;
    inp.addEventListener("input", () => { clearTimeout(tmr); tmr = setTimeout(async () => { const t = inp.value, r = await V.buscaPoliticos(t, 10); if (inp.value !== t) return;
      document.getElementById("pq-pol-lista").innerHTML = r.map((e) => `<li><a href="#/politico/${e.id}"><span class="busca__ico" style="background:#5f6672">${V.esc(V.iniciais(e.civil))}</span><span><b>${V.esc(V.titulo(e.urna || e.civil))}</b><small>${V.esc(V.descrPol(e, BR))}</small></span></a></li>`).join("") || '<li class="pq-nota">Ninguém com esse começo de nome.</li>'; }, 150); });
  }

  /* ---------- páginas ---------- */
  const modoSalvo = () => { try { return localStorage.getItem("vav-pq-modo") === "tab" ? "tab" : "graf"; } catch (e) { return "graf"; } };
  let ATUAL = null;      // tema aberto: { b, vi (recorte escolhido), modo ("graf" | "tab") }
  let CACHE = null;      // { P, C, temas }
  // os endereços antigos (#/perguntas/q1 ... q12) levam ao tema que agora responde a mesma pergunta
  const ANTIGO = { q1: "t1", q2: "t2", q3: "t3", q4: "t4", q5: "t7", q6: "t9", q7: "t10", q8: "t12", q9: "t14", q10: "t15", q11: "e1", q12: "e2" };
  V.TEMA_DE = ANTIGO;

  async function carregar() {
    if (CACHE) return CACHE;
    const P = await V.dados("br/perguntas");
    const C = Object.fromEntries(P.consultas.map((c) => [c.id, c]));
    return (CACHE = { P, C, temas: montarTemas(C, montarAntigas(C)) });
  }

  function pintarPainel() {
    const { b, vi, modo } = ATUAL, v = b.vistas[vi];
    let g; try { g = v.graf(); } catch (e) { console.error(e); g = { html: '<p class="vazio">Não foi possível desenhar este gráfico.</p>', tab: { cols: [""], linhas: [] } }; }
    document.getElementById("pq-leg").innerHTML = v.legenda || "";
    document.getElementById("pq-leg").hidden = modo === "tab";
    document.getElementById("pq-graf").innerHTML = modo === "tab" ? tabelaHTML(g.tab, v.rot) : g.html;
    document.getElementById("pq-nota").innerHTML = `${v.nota ? v.nota + " " : ""}<span class="pq-fonte">Fonte: ${b.fonte}.</span>`;
    document.querySelectorAll("#pq-painel [data-vista]").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.vista === vi)));
    document.querySelectorAll("#pq-painel [data-modo]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.modo === modo)));
  }

  /* "Mais números": grupos de frases montados por js/detalhes.js a partir das linhas das consultas antigas */
  function maisHTML(b, C) {
    const grupos = [];
    for (const id of b.antigas || []) {
      const f = V.detalhes && V.detalhes[id];
      if (!f) continue;
      try { grupos.push(...f(C).filter((g) => g && g.itens && g.itens.filter(Boolean).length)); } catch (e) { console.error(e); }
    }
    if (!grupos.length) return "";
    return `<details class="pq-origem pq-mais-num"><summary>Mais números, ano a ano e cargo a cargo</summary>
      ${grupos.map((g) => `<div class="pq-detalhe__grupo"><h3>${g.tit}</h3>${g.texto ? `<p>${g.texto}</p>` : ""}<ul>${g.itens.filter(Boolean).map((i) => `<li>${i}</li>`).join("")}</ul></div>`).join("")}</details>`;
  }

  const selo = (b) => `<span class="pq-selo">${typeof b.n === "number" ? b.n : b.n}</span>`;
  function paginaTema(b, temas, C) {
    const i = temas.indexOf(b), ant = temas[i - 1], prox = temas[i + 1];
    return `<div class="pagina pq-pagina">
      <p class="pq-migalha"><a href="#/perguntas">Todos os 16 temas</a></p>
      <header class="pq-cab">
        <h1 class="pq-titulo">${selo(b)} ${b.titulo}</h1>
        <details class="pq-enunciado"${V.largura() >= 700 ? " open" : ""}><summary>${typeof b.n === "number" ? "O que o enunciado pede" : "A pergunta do grupo"}</summary><ul>${b.enunciado.map((e) => `<li>${e}</li>`).join("")}</ul></details>
        <p class="pq-resposta">${b.resposta}.</p>
      </header>
      <section class="pq-pontos" aria-labelledby="pq-pontos-tit"><h2 class="pq-painel__tit" id="pq-pontos-tit">O que os dados mostram</h2>
        <ul>${b.pontos.map((p) => `<li>${p}</li>`).join("")}</ul></section>
      <section class="pq-painel" id="pq-painel" aria-labelledby="pq-medida">
        <div class="pq-painel__cab">
          <h2 class="pq-painel__tit" id="pq-medida">Veja nos gráficos</h2>
          <div class="pq-modo" role="group" aria-label="Mostrar como"><button type="button" data-modo="graf">Gráfico</button><button type="button" data-modo="tab">Tabela</button></div>
        </div>
        ${b.vistas.length > 1 ? `<div class="pq-vistas" role="group" aria-label="Recorte">${b.vistas.map((v, k) => `<button class="chip" type="button" data-vista="${k}">${v.rot}</button>`).join("")}</div>` : ""}
        <div id="pq-leg"></div>
        <div class="pq-graf" id="pq-graf"></div>
        <p class="pq-nota" id="pq-nota"></p>
      </section>
      ${b.extra || ""}
      <section class="pq-cuidado" aria-labelledby="pq-cuid-tit"><h2 class="pq-painel__tit" id="pq-cuid-tit">Cuidado ao ler</h2>
        <ul>${b.cuidado.map((c) => `<li>${c}</li>`).join("")}</ul></section>
      <details class="pq-origem"><summary>De onde vêm esses números</summary>
        <p>${b.como}</p>
        <p><b>Fonte:</b> ${b.fonte}.</p>
        <p><b>Tabelas do banco usadas:</b> ${b.tabelas.map((t) => `<code>${t}</code>`).join(", ")}.</p>
        <p><b>Consultas:</b> ${b.consultas.map((id) => `<code title="${V.esc((C[id] || {}).descricao || "")}">${id}</code>`).join(", ")}, no arquivo <a href="${GH}" rel="noopener"><code>scripts/consultas_brasil.sql</code></a>, rodadas no banco nacional em DuckDB.</p>
      </details>
      ${maisHTML(b, C)}
      ${b.link ? `<p class="pq-link"><a href="${b.link}">${b.linkTxt}</a></p>` : ""}
      <nav class="pq-passos" aria-label="Outros temas">
        ${ant ? `<a href="#/perguntas/${ant.id}" class="pq-passos__ant"><small>Anterior</small><span><b>${ant.n}</b> ${ant.titulo}</span></a>` : "<span></span>"}
        ${prox ? `<a href="#/perguntas/${prox.id}" class="pq-passos__prox"><small>Próximo</small><span><b>${prox.n}</b> ${prox.titulo}</span></a>` : ""}
      </nav>
    </div>`;
  }

  function paginaIndice(P, temas) {
    const T = P.tamanho || {}, mi = (v) => N1.format(v / 1e6).replace(/,0$/, "");
    const item = (b) => `<li><a href="#/perguntas/${b.id}">${selo(b)}
        <strong class="pq-lista__q">${b.titulo}</strong><span class="pq-lista__rot">${b.curta}</span></a></li>`;
    const principais = temas.filter((b) => typeof b.n === "number"), extras = temas.filter((b) => typeof b.n !== "number");
    return `<div class="pagina pq-pagina">
      <header class="pq-cab">
        <h1 class="titulo-grande">As 16 perguntas do trabalho</h1>
        <p class="pq-mais">Os 16 temas do enunciado, respondidos com as eleições de 1994 a 2026 no Brasil inteiro.</p>
        <ul class="pq-banco">
          <li><b>${mi(T.candidaturas)} mi</b><span>candidaturas</span></li>
          <li><b>${mi(T.votos)} mi</b><span>linhas de votos</span></li>
          <li><b>${mi(T.receitas + T.despesas)} mi</b><span>receitas e despesas</span></li>
          <li><b>${V.int(T.municipios)}</b><span>cidades</span></li>
        </ul>
      </header>
      <ol class="pq-lista">${principais.map(item).join("")}</ol>
      <h2 class="secao__titulo" style="margin-top:8px">Duas perguntas a mais do grupo</h2>
      <ol class="pq-lista">${extras.map(item).join("")}</ol>
      <p class="pq__rodape">Consultas em <code>scripts/consultas_brasil.sql</code>, rodadas em ${P.gerado.split("-").reverse().join("/")} no banco nacional (DuckDB).</p>
    </div>`;
  }

  /* um só ouvinte de cliques para as páginas dos temas */
  document.getElementById("conteudo").addEventListener("click", (e) => {
    if (!ATUAL || !e.target.closest("#pq-painel")) return;
    const vt = e.target.closest("[data-vista]"), md = e.target.closest("[data-modo]");
    if (vt) { ATUAL.vi = +vt.dataset.vista; pintarPainel(); }
    else if (md) { ATUAL.modo = md.dataset.modo; try { localStorage.setItem("vav-pq-modo", ATUAL.modo); } catch (er) {} pintarPainel(); }
  });

  V.rota(/^\/guias$/, async function () { location.replace("#/perguntas"); });
  V.rota(/^\/guia\/(q\d+)$/, async function (main, id) { location.replace("#/perguntas/" + (ANTIGO[id] || "")); });

  V.rota(/^\/perguntas(?:\/([qte]\d+))?\/?$/, async function (main, id) {
    V.marcarNav("perguntas");
    if (id && ANTIGO[id]) { location.replace("#/perguntas/" + ANTIGO[id]); return; }
    const { P, C, temas } = await carregar();
    const b = id && temas.find((x) => x.id === id);
    ATUAL = null;
    if (!b) { document.title = "As 16 perguntas · Voto a voto"; main.innerHTML = paginaIndice(P, temas); return; }
    document.title = `${typeof b.n === "number" ? "Tema " + b.n : "Pergunta a mais"}. ${b.titulo} · Voto a voto`;
    main.innerHTML = paginaTema(b, temas, C);
    ATUAL = { b, vi: 0, modo: modoSalvo() };
    pintarPainel();
    if (b.ligar) await b.ligar();
  });
})();
