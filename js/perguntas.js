/* Voto a voto — as 12 perguntas do trabalho, respondidas com o Brasil inteiro.
   Cada número sai de uma consulta de scripts/consultas_brasil.sql, rodada no banco nacional (eleicoes_brasil.duckdb)
   por scripts/rodar_consultas.py. A página mostra o SQL e o resultado de cada consulta. */
(function () {
  "use strict";
  const V = window.V;
  const pct = (v, d) => V.pct(v, d);
  const N1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  /* dinheiro por extenso, para os títulos */
  const reais = (v) => (v >= 1e9 ? `R$\u00a0${N1.format(v / 1e9)}\u00a0${v >= 2e9 ? "bilhões" : "bilhão"}` : v >= 1e6 ? `R$\u00a0${N1.format(v / 1e6)}\u00a0${v >= 2e6 ? "milhões" : "milhão"}` : v >= 1e3 ? `R$\u00a0${V.int(Math.round(v / 1e3))}\u00a0mil` : `R$\u00a0${V.int(Math.round(v))}`);
  const vezes = (a, b) => { const r = a / b; return r >= 2 ? `${N1.format(r).replace(/,0$/, "")} vezes` : `${pct(100 * (r - 1), 0)} a mais`; };
  const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  /* nota de −1 (esquerda) a +1 (direita), com sinal: "+0,20", "−0,35" */
  const nota = (v, d = 2) => (v == null ? "—" : (v > 0.0005 ? "+" : v < -0.0005 ? "−" : "") + Math.abs(v).toFixed(d).replace(".", ","));
  /* correlação de Pearson, com duas casas: "0,77" */
  const corr = (v) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(2).replace(".", ",");
  const anos1 = (v) => `${N1.format(v)} anos`;
  const CARGOS_NOTA = [["PRES", 1, "Presidente", "#16181d"], ["GOV", 3, "Governador", "#4f6fb3"], ["SEN", 5, "Senador", "#7a5aa6"], ["DF", 6, "Deputado federal", "#9c5d16"], ["DE", 7, "Deputado estadual", "#c99a52"], ["PREF", 11, "Prefeito", "#2f7d5b"], ["VER", 13, "Vereador", "#79b394"]];
  const CARGO = { PRESIDENTE: "Presidente", "DEPUTADO FEDERAL": "Deputado federal", "DEPUTADO ESTADUAL": "Deputado estadual", PREFEITO: "Prefeito", VEREADOR: "Vereador", SENADOR: "Senador", GOVERNADOR: "Governador" };
  const ESP5 = ["ESQUERDA", "CENTRO-ESQUERDA", "CENTRO", "CENTRO-DIREITA", "DIREITA"];
  const COR = { esq: V.ESPC.ESQUERDA, cen: V.ESPC.CENTRO, dir: V.ESPC.DIREITA, escuro: "#16181d", azul: "#4f6fb3", cinza: "#c9ccd1", terra: "#9c5d16" };

  /* resultado de uma consulta como lista de objetos */
  const linhasDe = (c) => c.linhas.map((l) => Object.fromEntries(c.colunas.map((k, i) => [k, l[i]])));

  /* duas (ou mais) barras por linha: um tema, dois grupos */
  function paresHTML(linhas, { nomes, cores, max, fmt = (v) => pct(v) }) {
    const mx = max || Math.max(...linhas.flatMap((l) => l.v.filter((v) => v != null)));
    return `<ol class="pares">${linhas.map((l) => `<li><span class="pares__rot">${l.rot}${l.sub ? `<small>${l.sub}</small>` : ""}</span><span class="pares__lins">
      ${l.v.map((v, i) => `<span class="pares__lin"><small>${nomes[i]}</small><span class="barras__trilho"><i style="flex-basis:${v == null ? 0 : Math.max(0, (100 * v) / mx)}%;background:${cores[i]}"></i></span><b>${v == null ? "—" : fmt(v)}</b></span>`).join("")}</span></li>`).join("")}</ol>`;
  }

  /* tabela do resultado de uma consulta (as primeiras linhas) */
  const fmtCel = (v) => (v == null ? "—" : typeof v === "number" ? (Number.isInteger(v) && Math.abs(v) >= 1900 && Math.abs(v) <= 2100 ? String(v) : v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })) : V.esc(v));
  function tabela(c, n = 20) {
    const ls = c.linhas.slice(0, n);
    return `<div class="pq__tabela" tabindex="0" role="region" aria-label="Resultado da consulta ${c.id}"><table><thead><tr>${c.colunas.map((k, i) => `<th scope="col"${typeof (c.linhas[0] || [])[i] === "number" ? ' class="num"' : ""}>${k}</th>`).join("")}</tr></thead>
      <tbody>${ls.map((l) => `<tr>${l.map((v) => `<td${typeof v === "number" ? ' class="num"' : ""}>${fmtCel(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
      <p class="pq__nota">${c.linhas.length > n ? `Primeiras ${n} de ${V.int(c.linhas.length)} linhas.` : `${V.int(c.linhas.length)} ${c.linhas.length === 1 ? "linha" : "linhas"}.`} A consulta levou ${String(c.segundos).replace(".", ",")} s no DuckDB.</p>`;
  }
  const blocoSQL = (c) => `<div class="pq__sql"><div class="pq__sql-cab"><p class="pq__sql-tit"><b>${c.id}</b> ${V.esc(c.descricao)}</p><button class="pq__copiar" type="button" data-copiar="${c.id}">Copiar SQL</button></div>
      <div class="pq__codigo"><pre><code id="sql-${c.id}">${V.esc(c.sql)}</code></pre></div>
      ${tabela(c)}</div>`;

  function montar(C) {
    const G = V.graf, leg = G.leg;
    /* cada gráfico devolve o desenho e a mesma informação em tabela (botão Gráfico | Tabela) */
    const barras = (l, o = {}) => {
      let html = G.barras(l, o); if (o.total) html = html.replace("<li>", '<li class="barras__total">');
      const temSub = l.some((x) => x.sub), c = o.cols || ["", "", "Valor"];
      const cols = [c[0], ...(temSub ? [c[1]] : []), ...(o.nomesPartes || [c[2]])];
      const fp = o.fmtParte || ((v) => pct(v, 0));
      return { html, tab: { cols, linhas: l.map((x) => [x.rot, ...(temSub ? [x.sub] : []), ...(o.nomesPartes ? x.partes.map((p) => fp(p.v)) : [x.vTxt || pct(x.v)])]) } };
    };
    const linhas = (o) => { const f = o.fmtPonto || o.fmt || ((v) => pct(v));
      return { html: G.linhas(o), tab: { cols: ["Ano", ...o.series.map((x) => x.nome)], linhas: o.anos.map((a, i) => [String(a), ...o.series.map((x) => (x.v[i] == null ? "—" : f(x.v[i])))]) } }; };
    /* linhas da nota (−1 esquerda, +1 direita): zero marcado e as faixas de esquerda e direita sombreadas */
    const linhasNota = (o) => linhas({ min: -0.5, max: 0.5, meio: 0, fmt: (v) => nota(v), fmtPonto: (v) => nota(v), fmtEixo: (t) => nota(t), faixas: [[-1, -0.25, COR.esq], [0.25, 1, COR.dir]], ...o });
    const pares = (l, o) => {
      const temSub = l.some((x) => x.sub), c = o.cols || [""], f = o.fmt || ((v) => pct(v));
      return { html: paresHTML(l, o), tab: { cols: [c[0], ...(temSub ? [c[1] || ""] : []), ...o.nomes.map(cap1)], linhas: l.map((x) => [x.rot, ...(temSub ? [x.sub] : []), ...x.v.map((v) => (v == null ? "—" : f(v)))]) } };
    };
    const blocos = [];

    // ---------- 1. custo por cadeira ----------
    {
      const tot = linhasDe(C.q1b), part = linhasDe(C.q1);
      const t = (a, cg) => tot.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg);
      const f22 = t(2022, "DEPUTADO FEDERAL"), f18 = t(2018, "DEPUTADO FEDERAL"), v24 = t(2024, "VEREADOR"), p24 = t(2024, "PREFEITO");
      const vista = (a, cg) => ({ rot: `${CARGO[cg]} ${a}`, graf: () => {
        // os 12 partidos com mais cadeiras, do mais caro para o mais barato
        const ps = part.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg).sort((x, y) => y.qt_cadeiras - x.qt_cadeiras).slice(0, 12).sort((x, y) => y.vr_custo_por_cadeira - x.vr_custo_por_cadeira);
        const media = t(a, cg);
        return barras([{ rot: "Todos os partidos", sub: `${V.int(media.qt_cadeiras)} cadeiras`, v: media.vr_custo_por_cadeira, vTxt: V.brl(media.vr_custo_por_cadeira) },
          ...ps.map((r) => ({ rot: r.sg_partido, sub: `${V.int(r.qt_cadeiras)} ${r.qt_cadeiras === 1 ? "cadeira" : "cadeiras"}`, v: r.vr_custo_por_cadeira, vTxt: V.brl(r.vr_custo_por_cadeira) }))], { cor: COR.escuro, total: true, cols: ["Partido", "Cadeiras", "Custo por cadeira"] });
      }, nota: "Os 12 partidos que ganharam mais cadeiras, do mais caro para o mais barato. A consulta traz todos os partidos com pelo menos 5." });
      blocos.push({ id: "q1", n: 1, num: V.brl(f22.vr_custo_por_cadeira), numRot: "por cadeira de deputado federal em 2022", medida: "Despesa de campanha por cadeira conquistada", tabelas: ["vw_candidatura_resumo", "candidatura", "despesa", "situacao_totalizacao", "partido"], tema: "Dinheiro", pergunta: "Quanto custa uma cadeira?",
        tit: `Em 2022, cada cadeira de deputado federal custou ${reais(f22.vr_custo_por_cadeira)} em despesas de campanha: ${vezes(f22.vr_custo_por_cadeira, f18.vr_custo_por_cadeira)} o custo de 2018`,
        sub: `É tudo o que os candidatos do partido gastaram, eleitos ou não, dividido pelas cadeiras que ganharam. Para vereador, em 2024, foram ${reais(v24.vr_custo_por_cadeira)} por cadeira; para prefeito, ${reais(p24.vr_custo_por_cadeira)}.`,
        vistas: [vista(2022, "DEPUTADO FEDERAL"), vista(2018, "DEPUTADO FEDERAL"), vista(2024, "PREFEITO"), vista(2024, "VEREADOR")],
        como: "Soma das despesas contratadas declaradas ao TSE por todos os candidatos de cada partido no cargo, dividida pelo número de eleitos do partido. Valores da época, sem correção pela inflação. A prestação de contas é a final, entregue depois da eleição.",
        consultas: ["q1", "q1b"], fonte: "TSE, prestação de contas eleitorais" });
    }

    // ---------- 2. patrimônio, dinheiro de campanha e sucesso ----------
    {
      const R = linhasDe(C.q2), B = linhasDe(C.q2b), M = linhasDe(C.q2c);
      const QN = ["20% com menos dinheiro", "2º grupo", "3º grupo", "4º grupo", "20% com mais dinheiro"];
      const de = (a, cg) => R.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg);
      const bens = (a, cg) => B.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg);
      const med = (a, cg, res) => M.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg && r.ds_resultado === res);
      const f = de(2022, "DEPUTADO FEDERAL"), baixo = f.slice(0, 3), nB = baixo.reduce((s, r) => s + r.qt_candidatos, 0), eB = Math.round(baixo.reduce((s, r) => s + (r.qt_candidatos * r.pc_taxa_sucesso) / 100, 0));
      const bf = bens(2022, "DEPUTADO FEDERAL"), b0 = bf[0], b6 = bf[bf.length - 1];
      const mE = med(2022, "DEPUTADO FEDERAL", "eleito"), mN = med(2022, "DEPUTADO FEDERAL", "não eleito"), vE = med(2024, "VEREADOR", "eleito"), vN = med(2024, "VEREADOR", "não eleito");
      const vistaBens = (a, cg) => ({ rot: `Bens · ${CARGO[cg]} ${a}`, graf: () => barras(bens(a, cg).map((r) => ({ rot: cap1(r.ds_faixa), sub: `${V.int(r.qt_candidatos)} candidatos`, v: r.pc_taxa_sucesso })), { cor: COR.terra, max: 100, cols: ["Bens declarados", "Candidatos", "Eleitos"] }),
        nota: "A barra vai até 100%: a parte dos candidatos de cada faixa de patrimônio que se elegeu." });
      const vista = (a, cg) => ({ rot: `Campanha · ${CARGO[cg]} ${a}`, graf: () => barras(de(a, cg).map((r) => ({ rot: QN[r.nr_quintil - 1], sub: `média de ${V.brl(r.vr_receita_media)}`, v: r.pc_taxa_sucesso })), { cor: COR.escuro, max: 100, cols: ["Grupo de candidatos", "Receita média", "Eleitos"] }),
        nota: "A barra vai até 100%: a parte dos candidatos de cada grupo, pelo dinheiro de campanha, que se elegeu." });
      blocos.push({ id: "q2", n: 2, num: `${pct(b6.pc_taxa_sucesso, 0)} × ${pct(b0.pc_taxa_sucesso)}`, numRot: "dos candidatos a deputado federal com mais de R$ 5 milhões em bens × sem nenhum bem se elegeram (2022)", medida: "Parte dos candidatos que se elegeu, pelo patrimônio e pelo dinheiro de campanha", tabelas: ["bem_candidato", "vw_patrimonio_candidato", "candidatura", "situacao_totalizacao", "vw_candidatura_resumo", "receita"], tema: "Dinheiro", pergunta: "Quem tem mais dinheiro se elege mais?",
        tit: `Entre os candidatos a deputado federal de 2022 que declararam mais de R$ 5 milhões em bens, ${pct(b6.pc_taxa_sucesso, 0)} se elegeram. Entre os que não declararam bem nenhum, ${pct(b0.pc_taxa_sucesso)}`,
        sub: `A chance sobe a cada faixa de patrimônio. Metade dos deputados federais eleitos tinha mais de ${reais(mE.vr_patrimonio_mediano)} em bens; metade dos que perderam, menos de ${reais(mN.vr_patrimonio_mediano)}. Para vereador, em 2024, ${reais(vE.vr_patrimonio_mediano)} contra ${reais(vN.vr_patrimonio_mediano)}. O dinheiro da campanha conta a mesma história: no grupo de candidatos a deputado federal com mais receita, ${pct(f[4].pc_taxa_sucesso, 0)} se elegeram; entre os ${V.int(nB)} com menos, ${V.int(eB)}.`,
        vistas: [vistaBens(2022, "DEPUTADO FEDERAL"), vistaBens(2024, "PREFEITO"), vistaBens(2024, "VEREADOR"), vista(2022, "DEPUTADO FEDERAL"), vista(2024, "VEREADOR")],
        como: "Patrimônio: soma dos bens que o candidato declarou ao TSE no registro da candidatura (casa, terreno, carro, aplicações, participação em empresa), pelo valor que ele mesmo informou. Quem não declarou nenhum bem conta como zero. Dinheiro de campanha: receita total declarada na prestação de contas, com NTILE(5) separando os candidatos de cada cargo e ano em cinco grupos iguais. Nos dois casos a tabela mostra associação, não causa: quem tem patrimônio costuma ter mais tempo, mais contatos e mais chance de receber dinheiro do partido.",
        consultas: ["q2b", "q2c", "q2"], fonte: "TSE, bens declarados e prestação de contas" });
    }

    // ---------- 3. IDHM, renda e campo político ----------
    {
      const R = linhasDe(C.q3), I = linhasDe(C.q3b), K = linhasDe(C.q3c);
      const RN = { "1 pobre": "pobre", "2 intermediário": "renda média", "3 rico": "rica" }, PN = { "1": "Pequena", "2": "Média", "3": "Grande" };
      const ach = (a, p, r) => R.find((x) => x.nr_ano_eleicao === a && x.ds_porte.startsWith(p) && x.ds_renda === r);
      const pp = ach(2022, "1", "1 pobre"), pr = ach(2022, "1", "3 rico");
      const idh = (a, cg) => I.filter((x) => x.nr_ano_eleicao === a && x.ds_cargo === cg);
      const ip = idh(2022, "PRESIDENTE"), i1 = ip[0], i5 = ip[ip.length - 1];
      const k = (a, cg) => K.find((x) => x.nr_ano_eleicao === a && x.ds_cargo === cg);
      const kP = k(2022, "PRESIDENTE"), kG = k(2022, "GOVERNADOR"), kM = k(2024, "PREFEITO");
      const PARTES = (x) => [["pc_mun_esquerda", COR.esq, "Esquerda em 1º"], ["pc_mun_centro", COR.cen, "Centro em 1º"], ["pc_mun_direita", COR.dir, "Direita em 1º"]].map(([c, cor, t]) => ({ v: x[c], cor, tit: `${t}: ${pct(x[c], 0)} das cidades` }));
      const LEG = leg([[COR.esq, "Esquerda em 1º"], [COR.cen, "Centro em 1º"], [COR.dir, "Direita em 1º"]]);
      const vistaI = (a, cg) => ({ rot: `IDHM · ${cap1(CARGO[cg] || cg.toLowerCase())} ${a}`, legenda: LEG, graf: () => barras(idh(a, cg).map((x) => { const [nm, fx] = x.ds_faixa_idhm.slice(2).split(" ("); return { rot: `IDHM ${nm}`, sub: `${fx.replace(")", "")} · ${V.int(x.qt_municipios)} cidades · nota ${nota(x.vr_nota_media)}`, v: 100, vTxt: pct(x.pc_mun_esquerda, 0), partes: PARTES(x) }; }),
          { max: 100, cols: ["IDHM da cidade", "Faixa, cidades e nota média"], nomesPartes: ["Esquerda em 1º", "Centro em 1º", "Direita em 1º"] }),
        nota: "O número à direita é a parte das cidades com a esquerda em 1º. Faixas de IDHM do PNUD; as 32 cidades de IDHM muito baixo (abaixo de 0,500) estão junto com as de IDHM baixo. Nota média: a dos votos da cidade, de −1 (esquerda) a +1 (direita), na média das cidades da faixa." });
      const INDS = [["r_idhm", "IDHM"], ["r_idhm_educacao", "IDHM Educação"], ["r_renda_per_capita", "Renda por habitante (Atlas)"], ["r_pib_per_capita", "PIB por habitante (IBGE)"], ["r_populacao", "Número de habitantes"]];
      const vistaK = { rot: "Correlação", legenda: leg([[COR.escuro, "Presidente 2022"], [COR.azul, "Governador 2022"], [COR.cinza, "Prefeito 2024"]]),
        graf: () => pares(INDS.map(([c, t]) => ({ rot: t, v: [kP[c], kG[c], kM[c]] })), { nomes: ["presidente 2022", "governador 2022", "prefeito 2024"], cores: [COR.escuro, COR.azul, COR.cinza], max: 1, fmt: corr, cols: ["Indicador da cidade"] }),
        nota: "Correlação, cidade a cidade, entre o indicador e a nota média dos votos: 0 é nenhuma relação, 1 é relação total. Positiva: quanto maior o indicador, mais à direita a cidade votou. Renda, PIB e habitantes em logaritmo." };
      const vista = (a, rot) => ({ rot, legenda: LEG, graf: () => barras(R.filter((x) => x.nr_ano_eleicao === a).map((x) => ({ rot: `${PN[x.ds_porte[0]]} e ${RN[x.ds_renda]}`, sub: `${V.int(x.qt_municipios)} cidades · faltaram ${pct(x.pc_abstencao_media, 0)}`, v: 100, vTxt: pct(x.pc_mun_esquerda, 0),
          partes: PARTES(x) })), { max: 100, cols: ["Tamanho e renda", "Cidades e faltas"], nomesPartes: ["Esquerda em 1º", "Centro em 1º", "Direita em 1º"] }),
        nota: "O número à direita é a parte das cidades com a esquerda em 1º. Pequena: até 20 mil habitantes; média: até 100 mil; grande: mais de 100 mil." });
      blocos.push({ id: "q3", n: 3, num: `${pct(i1.pc_mun_esquerda, 0)} × ${pct(i5.pc_mun_esquerda, 0)}`, numRot: "das cidades de IDHM baixo × muito alto deram o 1º lugar à esquerda para presidente (2022)", medida: "Campo político do mais votado, pelo desenvolvimento, pela renda e pelo tamanho da cidade", tabelas: ["votacao_partido", "votacao_candidato", "candidatura", "partido", "comparecimento", "eleicao", "vw_indicador_atual", "indicador_municipio", "indicador_atlas", "vw_partido_ano"], tema: "Território", pergunta: "A cidade rica vota diferente da cidade pobre?",
        tit: `Em 2022, nas cidades de IDHM baixo ou muito baixo, a esquerda ficou em 1º para presidente em ${pct(i1.pc_mun_esquerda, 0)} delas. Nas de IDHM muito alto, em ${pct(i5.pc_mun_esquerda, 0)}`,
        sub: `Quanto maior o desenvolvimento da cidade, mais à direita ela vota para presidente: cidade a cidade, a correlação entre o IDHM e a nota média dos votos foi de ${corr(kP.r_idhm)} em 2022, e a renda por habitante separa ainda um pouco mais (${corr(kP.r_renda_per_capita)}). O tamanho da cidade não separa nada (${corr(kP.r_populacao)}). Na eleição local o efeito encolhe: ${corr(kG.r_idhm)} para governador e ${corr(kM.r_idhm)} para prefeito. Para governador, nas cidades pequenas e pobres a esquerda ficou em 1º em ${pct(pp.pc_mun_esquerda, 0)} delas; nas pequenas e ricas, em ${pct(pr.pc_mun_esquerda, 0)}.`,
        vistas: [vistaI(2022, "PRESIDENTE"), vistaI(2022, "GOVERNADOR"), vistaI(2024, "PREFEITO"), vistaK, vista(2022, "Renda e tamanho · Governador 2022"), vista(2024, "Renda e tamanho · Prefeito 2024")],
        como: "IDHM: Índice de Desenvolvimento Humano Municipal do Atlas do Desenvolvimento Humano no Brasil (PNUD, Ipea e Fundação João Pinheiro), que junta educação, renda e longevidade numa nota de 0 a 1. É o do Censo 2010, o último calculado para as cidades; baixado da API do IpeaData. Partido mais votado em cada cidade no 1º turno (TSE), classificado pela nota do partido na época da eleição, que junta três estudos e o voto na Câmara; esquerda e centro-esquerda contam juntas, assim como direita e centro-direita. Nota média da cidade: soma dos votos de cada partido (nominais e de legenda) vezes a nota dele, dividida pelo total. Correlação de Pearson entre as cidades. Tamanho pela população do Censo 2022; renda pelo PIB por habitante de 2021 (IBGE), com as cidades em três grupos do mesmo tamanho.",
        consultas: ["q3b", "q3c", "q3"], link: "#/mapa/e/PRES2022", linkTxt: "Ver presidente 2022 no mapa", fonte: "TSE, IBGE e Atlas do Desenvolvimento Humano (PNUD, Ipea e FJP)" });
    }

    // ---------- 4. escolaridade da cidade x escolaridade dos eleitos ----------
    {
      const R = linhasDe(C.q4).filter((r) => r.nr_ordem === 8), E = linhasDe(C.q4b), K = linhasDe(C.q4c)[0];
      const PN = ["Até 20 mil habitantes", "De 20 a 100 mil", "Mais de 100 mil"];
      const [pq, , gr] = R;
      const eq = (cg) => E.filter((r) => r.ds_cargo === cg), ve = eq("VEREADOR"), v1 = ve[0], v5 = ve[ve.length - 1], pf = eq("PREFEITO");
      const QE = ["20% com IDHM Educação mais baixo", "2º grupo", "3º grupo", "4º grupo", "20% com IDHM Educação mais alto"];
      const N3 = (v) => v.toFixed(3).replace(".", ",");
      const LEG = leg([[COR.cinza, "Entre os candidatos"], [COR.escuro, "Entre os eleitos"]]);
      const vistaE = (cg) => ({ rot: `Escolaridade da cidade · ${CARGO[cg]}`, legenda: LEG, graf: () => pares(eq(cg).map((r) => ({ rot: QE[r.nr_quintil - 1], sub: `IDHM Educação de ${N3(r.vr_idhm_e_min)} a ${N3(r.vr_idhm_e_max)} · ${pct(r.pc_adultos_superior_2010, 0)} dos adultos com diploma`, v: [r.pc_candidatos_superior, r.pc_eleitos_superior] })),
          { nomes: ["candidatos", "eleitos"], cores: [COR.cinza, COR.escuro], max: 100, cols: ["Cidades", "IDHM Educação e adultos com diploma"] }),
        nota: `Parte com superior completo, ${cg === "PREFEITO" ? "prefeitos" : "vereadores"}, eleição de 2024. Cidades em cinco grupos do mesmo tamanho pelo IDHM Educação (Censo 2010).` });
      blocos.push({ id: "q4", n: 4, num: `${pct(v5.pc_eleitos_superior, 0)} × ${pct(v1.pc_eleitos_superior, 0)}`, numRot: "dos vereadores eleitos têm diploma nas cidades de IDHM Educação mais alto × mais baixo (2024)", medida: "Parte com curso superior completo, pela escolaridade e pelo tamanho da cidade", tabelas: ["candidatura", "grau_instrucao", "situacao_totalizacao", "eleicao", "vw_indicador_atual", "indicador_atlas", "vw_eleitorado_municipio", "eleitorado_perfil"], tema: "Perfil", pergunta: "Cidade mais estudada elege quem estudou mais?",
        tit: `Nas cidades com o IDHM Educação mais alto, ${pct(v5.pc_eleitos_superior, 0)} dos vereadores eleitos em 2024 tinham curso superior. Nas com o mais baixo, ${pct(v1.pc_eleitos_superior, 0)}`,
        sub: `E o eleitor escolhe gente mais estudada que ele: onde só ${pct(v1.pc_adultos_superior_2010, 0)} dos adultos tinham diploma, ${pct(v1.pc_eleitos_superior, 0)} dos vereadores eleitos tinham (entre os candidatos, ${pct(v1.pc_candidatos_superior, 0)}). Para prefeito, de ${pct(pf[0].pc_eleitos_superior, 0)} a ${pct(pf[pf.length - 1].pc_eleitos_superior, 0)}. Escolaridade e tamanho andam juntos: cidade a cidade, a parte dos vereadores com diploma acompanha a dos adultos com diploma (correlação de ${corr(K.r_adultos_superior_2010)}) tanto quanto o tamanho da cidade (${corr(K.r_populacao)}). Nas cidades com mais de 100 mil habitantes, ${pct(gr.pc_eleitos_no_porte, 0)} dos eleitos tinham diploma; nas com até 20 mil, ${pct(pq.pc_eleitos_no_porte, 0)}.`,
        vistas: [vistaE("VEREADOR"), vistaE("PREFEITO"), { rot: "Tamanho da cidade", legenda: LEG, graf: () => pares(R.map((r, i) => ({ rot: PN[i], v: [r.pc_candidatos_no_porte, r.pc_eleitos_no_porte] })), { nomes: ["candidatos", "eleitos"], cores: [COR.cinza, COR.escuro], max: 100, cols: ["Tamanho da cidade"] }),
          nota: "Parte com superior completo, prefeito e vereador, eleição de 2024." }],
        como: "Grau de instrução declarado pelo candidato no registro da candidatura (TSE), prefeitos e vereadores de 2024. Escolaridade da cidade: IDHM Educação e parte dos adultos (25 anos ou mais) com curso superior, do Atlas do Desenvolvimento Humano (Censo 2010, o último calculado para as cidades), e parte dos eleitores com superior completo no perfil do eleitorado do TSE de 2024. Tamanho da cidade pela população do Censo 2022 (IBGE). Correlação de Pearson entre as cidades, com a população em logaritmo.",
        consultas: ["q4b", "q4c", "q4"], fonte: "TSE, IBGE e Atlas do Desenvolvimento Humano (PNUD, Ipea e FJP)" });
    }

    // ---------- 5. voto de legenda ----------
    {
      const R = linhasDe(C.q5), P = linhasDe(C.q5b);
      const s = (cg) => R.filter((r) => r.ds_cargo === cg);
      const fed = s("DEPUTADO FEDERAL"), est = s("DEPUTADO ESTADUAL"), ver = s("VEREADOR");
      const f0 = fed[0], fN = fed[fed.length - 1];
      blocos.push({ id: "q5", n: 5, num: pct(fN.pc_legenda), numRot: `dos votos para deputado federal foram só no número do partido (${fN.nr_ano_eleicao})`, medida: "Parte dos votos que foi só no número do partido", recorte: "1º turno, 2002 a 2026", tabelas: ["votacao_partido", "partido", "cargo", "eleicao"], tema: "Partidos", pergunta: "Quem ainda vota só no número do partido?",
        tit: `Em ${f0.nr_ano_eleicao}, ${pct(f0.pc_legenda)} dos votos para deputado federal foram só no número do partido. Em ${fN.nr_ano_eleicao}, ${pct(fN.pc_legenda)}`,
        sub: `O eleitor vota cada vez mais na pessoa. Para vereador, a legenda caiu de ${pct(ver[0].pc_legenda)} em ${ver[0].nr_ano_eleicao} para ${pct(ver[ver.length - 1].pc_legenda)} em ${ver[ver.length - 1].nr_ano_eleicao}. Em 2022, quem mais recebeu voto de legenda para deputado federal foram ${P[0].sg_partido} (${pct(P[0].pc_legenda, 0)}) e ${P[1].sg_partido} (${pct(P[1].pc_legenda, 0)}).`,
        legenda: leg([[COR.escuro, "Deputado federal"], [COR.azul, "Deputado estadual"]]),
        grafico: () => linhas({ anos: fed.map((r) => r.nr_ano_eleicao), max: 16, rot: "Parte dos votos que foi só no número do partido",
          series: [{ nome: "Deputado federal", curto: "Federal", cor: COR.escuro, grossa: true, v: fed.map((r) => r.pc_legenda) }, { nome: "Deputado estadual", curto: "Estadual", cor: COR.azul, grossa: true, v: est.map((r) => r.pc_legenda) }] }),
        nota: "Parte dos votos válidos para o cargo (nominais mais legenda), 1º turno. 1998 fica de fora: o arquivo do TSE daquele ano não separa o voto de legenda.",
        como: "Votos de legenda e nominais por partido e município (TSE, votação por partido). Os votos de legenda contam para o partido, mas não para nenhum candidato.",
        consultas: ["q5", "q5b"], fonte: "TSE" });
    }

    // ---------- 6. planos de governo ----------
    {
      const R = linhasDe(C.q6), W = linhasDe(C.q6b);
      const e = R.find((r) => r.ds_bloco === "esquerda"), d = R.find((r) => r.ds_bloco === "direita");
      const TEMAS = [["pc_racial", "Racismo ou igualdade racial"], ["pc_reforma_agraria", "Reforma agrária"], ["pc_privatizacao", "Privatização"], ["pc_desigualdade", "Desigualdade"], ["pc_agronegocio", "Agronegócio"], ["pc_armas", "Armas"], ["pc_seguranca", "Segurança pública"], ["pc_meio_ambiente", "Meio ambiente"], ["pc_impostos", "Impostos"], ["pc_familia", "Família"]]
        .map(([k, t]) => ({ k, t, dif: e[k] - d[k] })).sort((a, b) => b.dif - a.dif);
      const qt = (b, w) => (W.find((x) => x.ds_bloco === b && x.palavra === w) || {}).qt || 0;
      blocos.push({ id: "q6", n: 6, num: `${pct(e.pc_racial, 0)} × ${pct(d.pc_racial, 0)}`, numRot: "dos planos da esquerda × da direita falam de racismo", medida: "Parte dos planos de governo que cita cada tema", recorte: "Candidatos a presidente em 2018, 2022 e 2026", tabelas: ["proposta_governo", "candidatura", "partido", "eleicao"], tema: "Partidos", pergunta: "Do que falam os planos de governo?",
        tit: `${pct(e.pc_racial, 0)} dos planos da esquerda para presidente falam de racismo ou igualdade racial; na direita, ${pct(d.pc_racial, 0)}. Com a reforma agrária, é ${pct(e.pc_reforma_agraria, 0)} contra ${pct(d.pc_reforma_agraria, 0)}`,
        sub: `Todos falam de família, impostos e meio ambiente. A diferença está no resto: a direita escreveu "segurança" ${V.int(qt("direita", "seguranca"))} vezes em ${d.qt_planos} planos, a esquerda ${V.int(qt("esquerda", "seguranca"))} em ${e.qt_planos}. "Trabalhadores", "direitos" e "mulheres" estão entre as palavras mais usadas só na esquerda.`,
        legenda: leg([[COR.esq, `Esquerda (${e.qt_planos} planos)`], [COR.dir, `Direita (${d.qt_planos} planos)`]]),
        grafico: () => pares(TEMAS.map((x) => ({ rot: x.t, v: [e[x.k], d[x.k]] })), { nomes: ["esquerda", "direita"], cores: [COR.esq, COR.dir], max: 100, fmt: (v) => pct(v, 0), cols: ["Tema"] }),
        nota: "Parte dos planos que cita o tema pelo menos uma vez. Do tema em que a esquerda mais se destaca para aquele em que a direita mais se destaca.",
        como: `Planos de governo entregues ao TSE pelos candidatos a presidente de 2018, 2022 e 2026 (${R.reduce((s, r) => s + r.qt_planos, 0)} planos), convertidos de PDF para texto. A busca ignora acento e maiúscula. Citar um tema não diz se o plano é a favor ou contra: a esquerda cita "privatização" mais vezes, muitas vezes para criticar. O centro (${R.find((r) => r.ds_bloco === "centro").qt_planos} planos) está na consulta.`,
        consultas: ["q6", "q6b"], fonte: "TSE, propostas de governo" });
    }

    // ---------- 7. idade: jovem vota em jovem? ----------
    {
      const R = linhasDe(C.q7), E = linhasDe(C.q7b).filter((r) => r.ds_espectro !== "NÃO CLASSIFICADO"), J = linhasDe(C.q7c), D = linhasDe(C.q7d);
      const anos = [...new Set(R.map((r) => r.nr_ano_eleicao))].filter((a) => a % 4 === 0);
      const g = (a, f) => R.find((r) => r.nr_ano_eleicao === a && r.ds_faixa === f);
      const sj24 = g(2024, "jovem"), sn24 = g(2024, "não jovem");
      const mn = Math.min(...E.map((r) => r.pc_jovens_eleitos)), mx = Math.max(...E.map((r) => r.pc_jovens_eleitos));
      const jq = (a) => J.filter((r) => r.nr_ano_eleicao === a), j24 = jq(2024), jo = j24[0], jy = j24[j24.length - 1];
      const d = (a, cg) => D.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg);
      const dV = d(2024, "VEREADOR"), dF = d(2022, "DEPUTADO FEDERAL"), dS = d(2022, "SENADOR");
      const QJ = ["20% com eleitorado mais velho", "2º grupo", "3º grupo", "4º grupo", "20% com eleitorado mais jovem"];
      const LEGJ = leg([[COR.cinza, "No eleitorado"], [COR.azul, "Entre os vereadores eleitos"]]);
      const vistaJ = (a) => ({ rot: `Eleitorado e eleitos ${a}`, legenda: LEGJ, graf: () => pares(jq(a).map((r) => ({ rot: QJ[r.nr_quintil - 1], sub: `${V.int(r.qt_municipios)} cidades · eleitor com ${anos1(r.vr_idade_media_eleitorado)} em média`, v: [r.pc_eleitorado_ate_29, r.pc_eleitos_ate_29] })),
          { nomes: ["no eleitorado", "entre os eleitos"], cores: [COR.cinza, COR.azul], max: 40, cols: ["Cidades", "Idade média do eleitor"] }),
        nota: `Parte com até 29 anos. Cidades em cinco grupos do mesmo tamanho pela parte do eleitorado com até 29 anos (TSE, ${a}); vereadores eleitos no mesmo ano. A barra vai até 40%.` });
      const CG7 = [[2024, "VEREADOR"], [2024, "PREFEITO"], [2022, "DEPUTADO ESTADUAL"], [2022, "DEPUTADO FEDERAL"], [2022, "GOVERNADOR"], [2022, "SENADOR"]];
      const vistaIdade = { rot: "Idade média por cargo", legenda: leg([[COR.cinza, "Eleitor"], [COR.escuro, "Eleito"]]), graf: () => pares(CG7.map(([a, cg]) => { const r = d(a, cg); return { rot: `${CARGO[cg]} ${a}`, sub: `${V.int(r.qt_eleitos)} eleitos`, v: [r.vr_idade_media_eleitorado, r.vr_idade_media_eleitos] }; }),
          { nomes: ["eleitor", "eleito"], cores: [COR.cinza, COR.escuro], max: 70, fmt: anos1, cols: ["Cargo", "Eleitos"] }),
        nota: "Idade média do eleitorado apto (TSE) e dos eleitos na data da posse. A barra vai até 70 anos." };
      const vistaSucesso = { rot: "Chance de se eleger", legenda: leg([[COR.azul, "Até 29 anos"], [COR.escuro, "30 anos ou mais"]]), graf: () => pares(anos.map((a) => ({ rot: String(a), sub: `${V.int(g(a, "jovem").qt_candidatos)} candidatos jovens`, v: [g(a, "jovem").pc_sucesso, g(a, "não jovem").pc_sucesso] })), { nomes: ["até 29 anos", "30 ou mais"], cores: [COR.azul, COR.escuro], cols: ["Ano", "Candidatos jovens"] }),
        nota: "Parte dos candidatos a prefeito e vereador que se elegeu, nas eleições municipais. A consulta também traz deputados, nas eleições gerais." };
      blocos.push({ id: "q7", n: 7, num: `${pct(jy.pc_eleitorado_ate_29, 0)} × ${pct(jy.pc_eleitos_ate_29, 0)}`, numRot: "dos eleitores × dos vereadores eleitos têm até 29 anos, nas cidades de eleitorado mais jovem (2024)", medida: "Parte com até 29 anos e idade média, de quem vota e de quem é eleito", tabelas: ["eleitorado_perfil", "vw_eleitorado_municipio", "candidatura", "situacao_totalizacao", "vw_candidatura_resumo", "partido"], tema: "Perfil", pergunta: "Jovem vota em jovem?",
        tit: `Não. Nas cidades com o eleitorado mais jovem, ${pct(jy.pc_eleitorado_ate_29, 0)} dos eleitores têm até 29 anos, mas só ${pct(jy.pc_eleitos_ate_29)} dos vereadores eleitos em 2024. Nas de eleitorado mais velho, ${pct(jo.pc_eleitos_ate_29)}`,
        sub: `A idade de quem vota quase não muda a de quem se elege. O eleitor tinha ${anos1(dV.vr_idade_media_eleitorado)} em média em 2024; o vereador eleito, ${anos1(dV.vr_idade_media_eleitos)}; o deputado federal de 2022, ${anos1(dF.vr_idade_media_eleitos)}; o senador, ${anos1(dS.vr_idade_media_eleitos)}. E o jovem que se candidata perde mais: em 2024, ${pct(sj24.pc_sucesso)} dos candidatos com até 29 anos se elegeram prefeito ou vereador, contra ${pct(sn24.pc_sucesso)} dos mais velhos. Nenhum campo político abre mais espaço: de 2018 a 2024, os jovens foram de ${pct(mn)} a ${pct(mx)} dos eleitos em todos, da esquerda à direita.`,
        vistas: [vistaJ(2024), vistaJ(2020), vistaIdade, vistaSucesso],
        como: "Eleitorado: perfil do eleitorado do TSE no ano de cada eleição, com a faixa de idade de cada eleitor apto, cidade a cidade; a idade média usa o meio de cada faixa. O TSE já publica esse perfil ano a ano, então não é preciso projetar a população entre um censo e outro (como faria o IpeaData), e ele conta só quem pode votar. Eleitos: idade na data da posse, declarada no registro da candidatura (TSE). Jovem: até 29 anos, como no Estatuto da Juventude. O voto é secreto, então não dá para saber em quem cada jovem votou: a pergunta é respondida cidade a cidade, comparando as que têm mais e menos eleitores jovens.",
        consultas: ["q7c", "q7d", "q7", "q7b"], fonte: "TSE, perfil do eleitorado e candidaturas" });
    }

    // ---------- 8. empresas ----------
    {
      const R = linhasDe(C.q8), E = linhasDe(C.q8b).filter((r) => r.ds_espectro !== "NÃO CLASSIFICADO");
      const r14 = R.find((r) => r.nr_ano_eleicao === 2014), r18 = R.find((r) => r.nr_ano_eleicao === 2018), r10 = R.find((r) => r.nr_ano_eleicao === 2010);
      const e14 = E.filter((r) => r.nr_ano_eleicao === 2014);
      const vista = (a) => ({ rot: String(a), graf: () => barras(ESP5.map((k) => E.find((r) => r.nr_ano_eleicao === a && r.ds_espectro === k)).filter(Boolean).map((r) => ({ rot: V.ESPN[r.ds_espectro], sub: `${reais(r.vr_doacao_pj)} de empresas`, v: r.pc_pj })), { cor: COR.terra, max: 50, cols: ["Campo político", "Doação de empresas", "Parte da receita"] }),
        nota: "Parte da receita dos candidatos de cada campo que veio de empresas. A barra vai até 50%." });
      blocos.push({ id: "q8", n: 8, num: pct(r14.pc_pj, 0), numRot: `do dinheiro dos candidatos vinha de empresas em 2014; ${pct(r18.pc_pj)} em 2018`, medida: "Parte da receita que veio de empresas", tabelas: ["receita", "candidatura", "partido", "eleicao"], tema: "Dinheiro", pergunta: "Para quem as empresas doavam?",
        tit: `Para todos os lados. Em 2014, as empresas pagavam de ${pct(Math.min(...e14.map((r) => r.pc_pj)), 0)} a ${pct(Math.max(...e14.map((r) => r.pc_pj)), 0)} das campanhas em cada campo político. Proibidas, eram ${pct(r18.pc_pj)} em 2018`,
        sub: `Em 2010, ${pct(r10.pc_pj, 0)} do dinheiro dos candidatos vinha de empresas: ${reais(r10.vr_doacao_pj)}. Em 2014, ${reais(r14.vr_doacao_pj)}. O Supremo proibiu a doação de empresas em 2015, e o dinheiro público passou a ocupar o lugar (pergunta 10).`,
        vistas: [vista(2014), vista(2012), vista(2010), { rot: "Antes e depois", graf: () => barras(R.map((r) => ({ rot: String(r.nr_ano_eleicao), sub: reais(r.vr_doacao_pj), v: r.pc_pj })), { cor: COR.terra, max: 50, cols: ["Ano", "Doação de empresas", "Parte da receita"] }), nota: "Parte de toda a receita dos candidatos que veio de empresas, por ano." }],
        como: "Receitas declaradas pelos candidatos ao TSE com doador pessoa jurídica (CNPJ), fora presidente. Em 2010, 2012 e 2014, o dinheiro de empresa que passava pelo partido antes de chegar ao candidato aparece como receita do partido, então a parte das empresas é no mínimo essa. Depois de 2015 ainda aparecem pequenas receitas com CNPJ, como as de outras campanhas.",
        consultas: ["q8", "q8b"], fonte: "TSE, prestação de contas eleitorais" });
    }

    // ---------- 9. para que lado ----------
    {
      const R = linhasDe(C.q9);
      const s = (t) => R.filter((r) => r.tp_abrangencia === t);
      const G = s("GERAL"), M = s("MUNICIPAL"), gN = G[G.length - 1], mN = M[M.length - 1];
      // último ano em que o centro teve mais votos que a direita para presidente, e o primeiro depois dele
      const ultC = [...G].reverse().find((r) => r.pc_votos_centro > r.pc_votos_direita), primD = G.find((r) => r.nr_ano_eleicao > ultC.nr_ano_eleicao);
      const antesD = G.filter((r) => r.nr_ano_eleicao < ultC.nr_ano_eleicao && r.pc_votos_direita > r.pc_votos_centro).map((r) => r.nr_ano_eleicao);
      // desde quando a direita está na frente em mais cidades para prefeito, sem interrupção
      const frenteD = (r) => r.qt_mun_direita_na_frente > r.qt_mun_centro_na_frente && r.qt_mun_direita_na_frente > r.qt_mun_esquerda_na_frente;
      let desde = mN; for (let i = M.length - 1; i >= 0 && frenteD(M[i]); i--) desde = M[i];
      const ser = (L) => [["pc_votos_esquerda", "Esquerda", COR.esq], ["pc_votos_centro", "Centro", COR.cen], ["pc_votos_direita", "Direita", COR.dir]].map(([k, nome, cor]) => ({ nome, cor, grossa: true, v: L.map((r) => r[k]) }));
      const NB = linhasDe(C.q9b), nb = (cd, a) => (NB.find((r) => r.cd_cargo === cd && r.nr_ano_eleicao === a) || {}).vr_nota_brasil;
      const serNota = (anosS, cgs) => CARGOS_NOTA.filter(([, cd]) => cgs.includes(cd)).map(([, cd, nome, cor]) => ({ nome, cor, grossa: true, curto: nome.replace("Deputado ", "Dep. "), curtoM: nome.replace("Deputado federal", "Fed.").replace("Deputado estadual", "Est.").replace("Presidente", "Pres.").replace("Governador", "Gov.").replace("Senador", "Sen."), v: anosS.map((a) => nb(cd, a) ?? null) }));
      const anosG = [1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026], anosM = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
      const legNota = (cds) => leg(CARGOS_NOTA.filter(([, cd]) => cds.includes(cd)).map(([, , nome, cor]) => [cor, nome]));
      const notaVistas = [
        { rot: "Nota · eleições gerais", legenda: legNota([1, 3, 5, 6, 7]), graf: () => linhasNota({ anos: anosG, series: serNota(anosG, [1, 3, 5, 6, 7]), rot: "Nota média dos votos por cargo, eleições gerais, 1º turno" }),
          nota: "Nota média dos votos de todo o Brasil: −1 é tudo na esquerda, +1 tudo na direita; as faixas sombreadas são esquerda (abaixo de −0,25) e direita (acima de +0,25). O arquivo de votos por partido do TSE não traz presidente, governador e senador em 1994, nem presidente em 1998." },
        { rot: "Nota · eleições municipais", legenda: legNota([11, 13]), graf: () => linhasNota({ anos: anosM, series: serNota(anosM, [11, 13]), rot: "Nota média dos votos por cargo, eleições municipais, 1º turno" }),
          nota: "Nota média dos votos de todas as cidades, de −1 (esquerda) a +1 (direita)." }];
      blocos.push({ id: "q9", n: 9, num: `${pct(gN.pc_votos_direita, 0)} × ${pct(gN.pc_votos_esquerda, 0)}`, numRot: `direita × esquerda para presidente no 1º turno de ${gN.nr_ano_eleicao}`, medida: "Votos no 1º turno por campo político", tabelas: ["votacao_partido", "votacao_candidato", "candidatura", "partido", "eleicao", "municipio", "vw_partido_ano", "partido_nota"], tema: "Território", pergunta: "Para que lado a sua cidade foi?",
        tit: `Desde ${primD.nr_ano_eleicao}, a disputa para presidente é esquerda contra direita: em ${gN.nr_ano_eleicao}, ${pct(gN.pc_votos_direita, 0)} a ${pct(gN.pc_votos_esquerda, 0)} no 1º turno`,
        sub: `Somando os votos de cada partido pela nota dele (de −1, esquerda, a +1, direita), o país vota mais à direita para deputado e vereador do que para presidente: em 2022, ${nota(nb(6, 2022))} para deputado federal e ${nota(nb(1, 2022))} para presidente; para vereador, a nota foi de ${nota(nb(13, 2008))} em 2008 para ${nota(nb(13, 2024))} em 2024. Antes, o adversário do PT era o PSDB, que as medidas põem bem na fronteira entre centro e centro-direita (+0,25)${antesD.length ? `: em ${antesD.join(" e ")} ele aparece à direita, em ${ultC.nr_ano_eleicao} de novo no centro` : ""} (<a href="#/partidos">veja na página Partidos</a>). Para prefeito, a direita está na frente em mais cidades desde ${desde.nr_ano_eleicao}: em ${mN.nr_ano_eleicao}, em ${V.int(mN.qt_mun_direita_na_frente)} das ${V.int(mN.qt_municipios)}. Abaixo, a linha da sua cidade.`,
        legenda: leg([[COR.esq, "Esquerda e centro-esquerda"], [COR.cen, "Centro"], [COR.dir, "Direita e centro-direita"]]),
        vistas: [...notaVistas, { rot: "Presidente", graf: () => linhas({ anos: G.map((r) => r.nr_ano_eleicao), series: ser(G), max: 80, rot: "Votos para presidente por lado, 1º turno" }), nota: `Parte dos votos nominais do 1º turno. Cidades com a esquerda na frente: ${G.map((r) => `${r.nr_ano_eleicao}, ${V.int(r.qt_mun_esquerda_na_frente)}`).slice(-3).join("; ")}.` },
          { rot: "Prefeito", graf: () => linhas({ anos: M.map((r) => r.nr_ano_eleicao), series: ser(M), max: 80, rot: "Votos para prefeito por lado, 1º turno" }), nota: "Soma dos votos de todas as cidades no 1º turno." }],
        como: "Nota média: para cada cidade, cargo e eleição, a soma dos votos de cada partido no 1º turno (nominais e de legenda) vezes a nota do partido, dividida pelo total de votos dos partidos com nota. Cada partido entra com a nota da época da eleição (view vw_partido_ano): três estudos acadêmicos (Zucco e Power, 2024; Bolognesi, Ribeiro e Codato, 2023; V-Party, 2022) e o voto na Câmara (2019 a 2026), pesando mais a medida mais próxima da eleição. O que falta para 100% são votos em partidos que nenhum estudo mede (como o Prona de Enéas, em 1994).",
        consultas: ["q9b", "q9"], extra: cidadeHTML, ligar: ligarCidade, link: "#/mapa/e/PRES2026", linkTxt: "Ver a sua cidade no mapa, de 1994 a 2026", fonte: "TSE; notas dos partidos: Zucco e Power (2024), Bolognesi, Ribeiro e Codato (2023), V-Party (2022) e Câmara dos Deputados" });
    }

    // ---------- 10. dinheiro público ----------
    {
      const R = linhasDe(C.q10);
      const g = (a, cg, res) => R.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg && r.ds_resultado === res);
      const fe = g(2022, "DEPUTADO FEDERAL", "eleito"), fn = g(2022, "DEPUTADO FEDERAL", "não eleito");
      const vista = (a, cg) => ({ rot: `${CARGO[cg]} ${a}`, graf: () => barras(["eleito", "não eleito"].map((res) => { const r = g(a, cg, res);
          return { rot: res === "eleito" ? "Eleitos" : "Não eleitos", sub: `${V.int(r.qt_candidatos)} candidatos · ${pct(r.pc_publico, 0)} público`, v: r.vr_publico_medio + r.vr_privado_medio, vTxt: V.brl(r.vr_publico_medio + r.vr_privado_medio),
            partes: [{ v: r.vr_publico_medio, cor: COR.escuro, tit: `Dinheiro público: ${V.brl(r.vr_publico_medio)} em média` }, { v: r.vr_privado_medio, cor: COR.cinza, tit: `Dinheiro privado: ${V.brl(r.vr_privado_medio)} em média` }] }; }), { cols: ["Resultado", "Candidatos"], nomesPartes: ["Dinheiro público, média", "Dinheiro privado, média"], fmtParte: V.brl }),
        nota: "Dinheiro público: Fundo Especial de Financiamento de Campanha e Fundo Partidário." });
      blocos.push({ id: "q10", n: 10, num: V.brl(fe.vr_publico_medio), numRot: "de dinheiro público, em média, para cada deputado federal eleito (2022)", medida: "Receita média por candidato", tabelas: ["vw_candidatura_resumo", "candidatura", "receita", "situacao_totalizacao"], tema: "Dinheiro", pergunta: "Quem vive de dinheiro público?",
        tit: `Em 2022, um deputado federal eleito recebeu em média ${reais(fe.vr_publico_medio)} de dinheiro público. Quem perdeu, ${reais(fn.vr_publico_medio)}: ${vezes(fe.vr_publico_medio, fn.vr_publico_medio)} menos`,
        sub: `Os fundos eleitoral e partidário pagam a maior parte das campanhas, e o partido escolhe para quem vai. Quem perde depende ainda mais deles: ${pct(fn.pc_publico, 0)} do dinheiro dos não eleitos era público, contra ${pct(fe.pc_publico, 0)} dos eleitos.`,
        legenda: leg([[COR.escuro, "Dinheiro público (fundos)"], [COR.cinza, "Dinheiro privado"]]),
        vistas: [vista(2022, "DEPUTADO FEDERAL"), vista(2022, "DEPUTADO ESTADUAL"), vista(2024, "PREFEITO"), vista(2024, "VEREADOR")],
        como: "Receita pública: a que o candidato declarou como vinda do Fundo Especial de Financiamento de Campanha (FEFC) ou do Fundo Partidário. O resto é privado: pessoas, recursos próprios e outras fontes (TSE).",
        consultas: ["q10"], fonte: "TSE, prestação de contas eleitorais" });
    }

    // ---------- 11. despesas ----------
    {
      const R = linhasDe(C.q11);
      const ano = (a) => R.filter((r) => r.nr_ano_eleicao === a);
      const top = ano(2024)[0], imp = ano(2024).find((r) => /Impulsionamento/i.test(r.ds_origem_despesa)), imp18 = ano(2018).find((r) => /Impulsionamento/i.test(r.ds_origem_despesa));
      const NOME = (s) => s.replace("Despesa com Impulsionamento de Conteúdos", "Impulsionamento nas redes").replace("Publicidade por materiais impressos", "Material impresso").replace("Atividades de militância e mobilização de rua", "Militância e cabos eleitorais").replace("Produção de programas de rádio, televisão ou vídeo", "Rádio, TV e vídeo").replace("Doações financeiras a outros candidatos/partidos", "Repasse a outros candidatos");
      const vista = (a) => ({ rot: String(a), graf: () => barras(ano(a).slice(0, 8).map((r) => ({ rot: NOME(r.ds_origem_despesa), sub: reais(r.vr_total), v: r.pc_ano })), { cor: COR.escuro, max: 25, cols: ["Despesa", "Valor", "Parte do total"] }),
        nota: "As oito maiores categorias, em parte do total gasto no ano. A barra vai até 25%." });
      blocos.push({ id: "q11", n: 11, num: pct(top.pc_ano, 0), numRot: "do gasto das campanhas foi com material impresso (2024)", medida: "Parte do gasto total, por tipo de despesa", tabelas: ["despesa", "candidatura", "eleicao"], tema: "Dinheiro", pergunta: "Onde vai o dinheiro da campanha?",
        tit: `Em 2024, ${pct(top.pc_ano, 0)} do dinheiro das campanhas foi para material impresso: ${reais(top.vr_total)}. É a maior despesa em todas as eleições desde 2018`,
        sub: `Santinho, panfleto e adesivo ainda ganham da internet. O impulsionamento de conteúdo nas redes cresceu de ${pct(imp18.pc_ano)} em 2018 para ${pct(imp.pc_ano)} em 2024.`,
        vistas: [vista(2024), vista(2022), vista(2020), vista(2018)],
        como: "Despesas contratadas declaradas pelos candidatos ao TSE, fora presidente, pela categoria que o próprio candidato escolhe na prestação de contas. Militância inclui o pagamento de cabos eleitorais e de quem distribui material na rua.",
        consultas: ["q11"], fonte: "TSE, prestação de contas eleitorais" });
    }

    // ---------- 12. carreira ----------
    {
      const R = linhasDe(C.q12), B = linhasDe(C.q12b), T = linhasDe(C.q12c);
      const g18 = R.find((r) => r.nr_ano === 2018), m16 = R.find((r) => r.nr_ano === 2016), m20 = R.find((r) => r.nr_ano === 2020);
      const tot = B.reduce((s, r) => s + r.qt_pessoas, 0), um = B.find((r) => r.qt_vitorias === 1).qt_pessoas, oito = B.find((r) => r.qt_vitorias === 8).qt_pessoas;
      const ger = R.filter((r) => r.tp_abrangencia === "GERAL"), mun = R.filter((r) => r.tp_abrangencia === "MUNICIPAL");
      const graf = (L) => () => pares(L.map((r) => ({ rot: String(r.nr_ano), sub: `${V.int(r.qt_eleitos)} eleitos`, v: [r.pc_eleito_de_novo_4_anos, r.pc_eleito_de_novo_8_anos] })), { nomes: ["4 anos depois", "8 anos depois"], cores: [COR.escuro, COR.azul], max: 100, fmt: (v) => pct(v, 0), cols: ["Eleitos em", "Eleitos"] });
      blocos.push({ id: "q12", n: 12, num: pct(g18.pc_eleito_de_novo_4_anos, 0), numRot: "dos deputados, senadores e governadores de 2018 se elegeram de novo em 2022", medida: "Eleitos que voltaram a se eleger", tabelas: ["candidatura", "pessoa", "situacao_totalizacao", "eleicao", "cargo", "partido"], tema: "Carreira", pergunta: "Quanto dura uma carreira política?",
        tit: `De cada 100 deputados, senadores e governadores eleitos em 2018, ${Math.round(g18.pc_eleito_de_novo_4_anos)} se elegeram de novo em 2022 e ${Math.round(g18.pc_eleito_de_novo_8_anos)} em 2026`,
        sub: `Na política da cidade a carreira é mais curta: dos prefeitos e vereadores de 2016, ${pct(m16.pc_eleito_de_novo_4_anos, 0)} voltaram em 2020 e ${pct(m16.pc_eleito_de_novo_8_anos, 0)} em 2024 (de 2020 para 2024, ${pct(m20.pc_eleito_de_novo_4_anos, 0)}). De 1994 a 2026, ${V.int(tot)} pessoas venceram alguma eleição; ${pct((100 * um) / tot, 0)} venceram uma só, e ${V.int(oito)} venceram oito ou mais.`,
        legenda: leg([[COR.escuro, "Eleito de novo 4 anos depois"], [COR.azul, "8 anos depois"]]),
        vistas: [{ rot: "Deputado, senador e governador", graf: graf(ger), nota: "Eleito de novo na eleição geral seguinte, para qualquer desses cargos. Quem virou prefeito dois anos depois não entra na conta." }, { rot: "Prefeito e vereador", graf: graf(mun), nota: "Para 2020, a volta de 8 anos depois ainda não aconteceu (2028)." }],
        extra: `<details class="pq-origem"><summary>Quem mais venceu de 1994 a 2026</summary><ol class="pq__lista">${T.slice(0, 5).map((r) => `<li><b>${V.esc(r.nm_pessoa)}</b>: ${r.qt_vitorias} vitórias em ${r.qt_candidaturas} eleições<small>${V.esc(r.ds_trajetoria)}</small></li>`).join("")}</ol></details>`,
        como: "A mesma pessoa é seguida pelo título de eleitor declarado no registro da candidatura (TSE), que muda menos que o nome na urna. 1996 fica de fora: os arquivos daquele ano não trazem o título. Conta qualquer cargo de deputado, senador, governador, prefeito ou vereador (a carreira pode mudar de cargo); suplentes que assumiram depois não contam. Senador tem mandato de oito anos: quem se elegeu em 2018 só voltaria a disputar em 2026, o que puxa para baixo a volta de 4 anos.",
        consultas: ["q12", "q12b", "q12c"], fonte: "TSE" });
    }
    return blocos;
  }

  /* ---------- Q9: a linha do tempo de uma cidade, cargo a cargo (data/br/vies/{UF}, feito por scripts/vies_cidades.py) ---------- */
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

  /* ---------- páginas ---------- */
  const modoSalvo = () => { try { return localStorage.getItem("vav-pq-modo") === "tab" ? "tab" : "graf"; } catch (e) { return "graf"; } };
  let ATUAL = null;      // pergunta aberta: { b, vi (recorte escolhido), modo ("graf" | "tab") }
  let CACHE = null;      // { P, C, blocos }

  async function carregar() {
    if (CACHE) return CACHE;
    const P = await V.dados("br/perguntas");
    const C = Object.fromEntries(P.consultas.map((c) => [c.id, c]));
    return (CACHE = { P, C, blocos: montar(C) });
  }
  const vistasDe = (b) => b.vistas || [{ graf: b.grafico, nota: b.nota }];
  const tabelaHTML = (t, rot) => `<div class="pq__tabela pq__tabela--leitura" tabindex="0" role="region" aria-label="${V.esc(rot)}"><table><caption class="visualmente-oculto">${V.esc(rot)}</caption>
      <thead><tr>${t.cols.map((c, i) => `<th scope="col"${i ? ' class="num"' : ""}>${V.esc(c)}</th>`).join("")}</tr></thead>
      <tbody>${t.linhas.map((l) => `<tr>${l.map((v, i) => (i ? `<td class="num">${v}</td>` : `<th scope="row">${v}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;

  function pintarPainel() {
    const { b, vi, modo } = ATUAL, v = vistasDe(b)[vi], g = v.graf();
    const rec = v.rec || b.recorte || v.rot || "";
    document.getElementById("pq-rec").textContent = vistasDe(b).length > 1 ? "" : rec;
    document.getElementById("pq-rec").hidden = vistasDe(b).length > 1;
    document.getElementById("pq-leg").innerHTML = v.legenda || b.legenda || "";
    document.getElementById("pq-leg").hidden = modo === "tab";
    document.getElementById("pq-graf").innerHTML = modo === "tab" ? tabelaHTML(g.tab, `${b.medida}${rec ? ", " + rec : ""}`) : g.html;
    document.getElementById("pq-nota").innerHTML = `${v.nota ? v.nota + " " : ""}<span class="pq-fonte">Fonte: ${b.fonte}.</span>`;
    document.querySelectorAll("#pq-painel [data-vista]").forEach((x) => x.setAttribute("aria-pressed", String(+x.dataset.vista === vi)));
    document.querySelectorAll("#pq-painel [data-modo]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.modo === modo)));
  }

  function paginaPergunta(b, blocos, C) {
    const vs = vistasDe(b), i = blocos.indexOf(b), ant = blocos[i - 1], prox = blocos[i + 1];
    return `<div class="pagina pq-pagina">
      <p class="pq-migalha"><a href="#/perguntas">Todas as 12 perguntas</a></p>
      <header class="pq-cab">
        <h1 class="pq-titulo"><span class="pq-selo">Q${b.n}</span> ${b.pergunta}</h1>
        <p class="pq-resposta">${b.tit}.</p>
        <p class="pq-mais">${b.sub}</p>
      </header>
      <section class="pq-painel" id="pq-painel" aria-labelledby="pq-medida">
        <div class="pq-painel__cab">
          <div><h2 class="pq-painel__tit" id="pq-medida">${b.medida}</h2><p class="pq-painel__rec" id="pq-rec"></p></div>
          <div class="pq-modo" role="group" aria-label="Mostrar como"><button type="button" data-modo="graf">Gráfico</button><button type="button" data-modo="tab">Tabela</button></div>
        </div>
        ${vs.length > 1 ? `<div class="pq-vistas" role="group" aria-label="Recorte">${vs.map((v, k) => `<button class="chip" type="button" data-vista="${k}">${v.rot}</button>`).join("")}</div>` : ""}
        <div id="pq-leg">${b.legenda || ""}</div>
        <div class="pq-graf" id="pq-graf"></div>
        <p class="pq-nota" id="pq-nota"></p>
      </section>
      ${b.extra || ""}
      <details class="pq-origem"><summary>De onde vêm esses números</summary>
        <p>${b.como}</p>
        <p><b>Tabelas do banco usadas:</b> ${b.tabelas.map((t) => `<code>${t}</code>`).join(", ")}.</p>
        ${b.consultas.map((id) => blocoSQL(C[id])).join("")}
      </details>
      ${b.link ? `<p class="pq-link"><a href="${b.link}">${b.linkTxt}</a></p>` : ""}
      <nav class="pq-passos" aria-label="Outras perguntas">
        ${ant ? `<a href="#/perguntas/${ant.id}" class="pq-passos__ant"><small>Pergunta anterior</small><span><b>Q${ant.n}</b> ${ant.pergunta}</span></a>` : "<span></span>"}
        ${prox ? `<a href="#/perguntas/${prox.id}" class="pq-passos__prox"><small>Próxima pergunta</small><span><b>Q${prox.n}</b> ${prox.pergunta}</span></a>` : ""}
      </nav>
    </div>`;
  }

  function paginaIndice(P, blocos) {
    const T = P.tamanho, mi = (v) => N1.format(v / 1e6).replace(/,0$/, "");
    return `<div class="pagina pq-pagina">
      <header class="pq-cab">
        <h1 class="titulo-grande">As 12 perguntas</h1>
        <p class="pq-mais">As perguntas do trabalho, respondidas com as eleições de 1994 a 2026 em todo o Brasil. Cada resposta sai de uma consulta SQL que você pode abrir e copiar.</p>
        <ul class="pq-banco">
          <li><b>${mi(T.candidaturas)} mi</b><span>candidaturas</span></li>
          <li><b>${mi(T.votos)} mi</b><span>linhas de votos</span></li>
          <li><b>${mi(T.receitas + T.despesas)} mi</b><span>receitas e despesas</span></li>
          <li><b>${V.int(T.municipios)}</b><span>cidades</span></li>
        </ul>
      </header>
      <ol class="pq-lista">${blocos.map((b) => `<li><a href="#/perguntas/${b.id}"><span class="pq-selo">Q${b.n}</span>
        <strong class="pq-lista__q">${b.pergunta}</strong><span class="pq-lista__num">${b.num}</span><span class="pq-lista__rot">${b.numRot}</span></a></li>`).join("")}</ol>
      <p class="pq__rodape">Banco <code>${V.esc(P.banco)}</code> (DuckDB), montado por <code>scripts/banco_brasil.py</code> no mesmo modelo relacional do trabalho. Consultas em <code>scripts/consultas_brasil.sql</code>, rodadas em ${P.gerado.split("-").reverse().join("/")}.</p>
    </div>`;
  }

  /* um só ouvinte de cliques para as páginas das perguntas */
  document.getElementById("conteudo").addEventListener("click", (e) => {
    if (!ATUAL || !e.target.closest("#pq-painel, .pq-origem")) return;
    const vt = e.target.closest("[data-vista]"), md = e.target.closest("[data-modo]"), cp = e.target.closest("[data-copiar]");
    if (vt) { ATUAL.vi = +vt.dataset.vista; pintarPainel(); }
    else if (md) { ATUAL.modo = md.dataset.modo; try { localStorage.setItem("vav-pq-modo", ATUAL.modo); } catch (er) {} pintarPainel(); }
    else if (cp) {
      const id = cp.dataset.copiar, txt = document.getElementById("sql-" + id).textContent;
      const ok = () => { cp.textContent = "Copiado"; setTimeout(() => (cp.textContent = "Copiar SQL"), 1600); };
      const sel = () => { const r = document.createRange(); r.selectNodeContents(document.getElementById("sql-" + id)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); cp.textContent = "Selecionado: Ctrl+C"; };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(ok, sel); else sel();
    }
  });

  V.rota(/^\/guias$/, async function () { location.replace("#/perguntas"); });
  V.rota(/^\/guia\/(q\d+)$/, async function (main, id) { location.replace("#/perguntas/" + id); });

  V.rota(/^\/perguntas(?:\/(q\d+))?\/?$/, async function (main, id) {
    V.marcarNav("perguntas");
    const { P, C, blocos } = await carregar();
    const b = id && blocos.find((x) => x.id === id);
    ATUAL = null;
    if (!b) { document.title = "As 12 perguntas · Voto a voto"; main.innerHTML = paginaIndice(P, blocos); return; }
    document.title = `Q${b.n}. ${b.pergunta} · Voto a voto`;
    main.innerHTML = paginaPergunta(b, blocos, C);
    ATUAL = { b, vi: 0, modo: modoSalvo() };
    pintarPainel();
    if (b.ligar) await b.ligar();
  });
})();
