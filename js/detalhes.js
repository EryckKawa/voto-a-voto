/* Voto a voto — "Os números em detalhe" de cada pergunta: cada dado da consulta explicado em frase, cargo a cargo,
   ano a ano e partido a partido. Tudo sai das linhas das consultas (data/br/perguntas.json), sem número escrito à mão.
   Cada função recebe as consultas (C) e devolve grupos { tit, texto?, itens: [html] }; js/perguntas.js desenha. */
(function () {
  "use strict";
  const V = window.V;
  const U = () => V.pqUtil;
  const b = (s) => `<b>${s}</b>`;
  const L = (C, id) => (C[id] ? U().linhasDe(C[id]) : []);
  const nomeCargo = (cg) => U().CARGO[cg] || U().cap1(String(cg).toLowerCase());
  const lado = { esquerda: "esquerda", centro: "centro", direita: "direita" };
  const ESP = { ESQUERDA: "esquerda", "CENTRO-ESQUERDA": "centro-esquerda", CENTRO: "centro", "CENTRO-DIREITA": "centro-direita", DIREITA: "direita" };
  const lista = (xs) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1]);
  // a prestação de contas de 2026 ainda está chegando ao TSE (o prazo final é 30 dias depois da eleição)
  const aviso26 = (a) => (a === 2026 ? " <small>(prestação de contas de 2026 ainda parcial)</small>" : "");

  V.detalhes = {
    q1(C) {
      const { reais, pct, N1 } = U(), M = L(C, "q1c"), P = L(C, "q1");
      const ult = [[2022, "PRESIDENTE"], [2022, "GOVERNADOR"], [2022, "SENADOR"], [2022, "DEPUTADO FEDERAL"], [2022, "DEPUTADO ESTADUAL"], [2024, "PREFEITO"], [2024, "VEREADOR"]];
      const m = (a, cg) => M.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg);
      const serie = (cg) => M.filter((r) => r.ds_cargo === cg).map((r) => `${r.nr_ano_eleicao}: ${reais(r.vr_custo_por_cadeira)}${aviso26(r.nr_ano_eleicao)}`);
      const p22 = P.filter((r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO FEDERAL").sort((x, y) => y.vr_custo_por_cadeira - x.vr_custo_por_cadeira);
      return [
        { tit: "Cargo a cargo, na eleição mais recente com contas fechadas", texto: "As duas contas da pergunta: o gasto médio (Σ gastos ÷ número de candidatos), que diz quanto custa disputar, e o custo por cadeira (Σ gastos ÷ eleitos), que diz quanto custa vencer.",
          itens: ult.map(([a, cg]) => { const r = m(a, cg); return r && `${b(`${nomeCargo(cg)} (${a})`)}: ${V.int(r.qt_candidatos)} candidatos (${V.int(r.qt_com_despesa)} declararam algum gasto) disputaram ${V.int(r.qt_eleitos)} ${r.qt_eleitos === 1 ? "vaga" : "vagas"} e gastaram juntos ${reais(r.vr_gasto_total)}. Gasto médio por candidato: ${reais(r.vr_gasto_medio_candidato)}. Custo por cadeira: ${reais(r.vr_custo_por_cadeira)}, ${N1.format(r.vr_custo_por_cadeira / Math.max(1, r.vr_gasto_medio_candidato))} vezes o gasto médio. Por mês de mandato, ${reais(r.vr_custo_por_mes_mandato)}.`; }) },
        { tit: "Ano a ano: o custo de uma cadeira", texto: "Valores da época, sem correção pela inflação. A partir de 2018 entra o Fundo Especial de Financiamento de Campanha, criado depois da proibição da doação de empresas.",
          itens: ["DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "SENADOR", "GOVERNADOR", "PREFEITO", "VEREADOR"].map((cg) => { const s = serie(cg); return s.length && `${b(nomeCargo(cg))}: ${s.join(" → ")}.`; }) },
        { tit: "Partido a partido: deputado federal em 2022", texto: "Entre os partidos que elegeram pelo menos 5 deputados federais. O custo junta o gasto de todos os candidatos do partido, eleitos ou não.",
          itens: [p22.length && `${b("Mais caros")}: ${lista(p22.slice(0, 3).map((r) => `${V.nomePartido(r.sg_partido)} (${reais(r.vr_custo_por_cadeira)} por cadeira, ${r.qt_cadeiras} eleitos)`))}.`,
            p22.length && `${b("Mais baratos")}: ${lista(p22.slice(-3).reverse().map((r) => `${V.nomePartido(r.sg_partido)} (${reais(r.vr_custo_por_cadeira)}, ${r.qt_cadeiras} eleitos)`))}.`,
            p22.length && `A diferença entre o mais caro e o mais barato é de ${N1.format(p22[0].vr_custo_por_cadeira / p22[p22.length - 1].vr_custo_por_cadeira)} vezes.`] },
      ];
    },

    q2(C) {
      const { reais, pct } = U(), B = L(C, "q2b"), M = L(C, "q2c"), R = L(C, "q2");
      const QN = ["20% com menos dinheiro", "2º grupo", "3º grupo", "4º grupo", "20% com mais dinheiro"];
      const faixas = (a, cg) => B.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg).map((r) => `${r.ds_faixa}: ${pct(r.pc_taxa_sucesso)} (${V.int(r.qt_eleitos)} de ${V.int(r.qt_candidatos)})`);
      const med = (a, cg) => { const e = M.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg && r.ds_resultado === "eleito"), n = M.find((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg && r.ds_resultado === "não eleito");
        return e && n && `${b(`${nomeCargo(cg)} (${a})`)}: o eleito típico (mediana) declarou ${reais(e.vr_patrimonio_mediano)}, e o não eleito ${reais(n.vr_patrimonio_mediano)}. Na média, que os muito ricos puxam para cima, ${reais(e.vr_patrimonio_medio)} contra ${reais(n.vr_patrimonio_medio)}. ${pct(e.pc_milionarios, 0)} dos eleitos e ${pct(n.pc_milionarios, 0)} dos não eleitos declararam R$ 1 milhão ou mais; ${pct(e.pc_sem_bens, 0)} dos eleitos e ${pct(n.pc_sem_bens, 0)} dos não eleitos não declararam bem nenhum.`; };
      const quint = (a, cg) => R.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg).map((r) => `${QN[r.nr_quintil - 1]} (média de ${V.brl(r.vr_receita_media)}): ${pct(r.pc_taxa_sucesso)}`);
      return [
        { tit: "Taxa de sucesso por faixa de patrimônio declarado", texto: "Parte dos candidatos de cada faixa que se elegeu (eleitos ÷ candidatos da faixa).",
          itens: [[2022, "DEPUTADO FEDERAL"], [2022, "DEPUTADO ESTADUAL"], [2024, "PREFEITO"], [2024, "VEREADOR"]].map(([a, cg]) => { const f = faixas(a, cg); return f.length && `${b(`${nomeCargo(cg)} (${a})`)}: ${f.join("; ")}.`; }) },
        { tit: "Patrimônio dos eleitos e dos não eleitos", itens: [[2022, "DEPUTADO FEDERAL"], [2022, "DEPUTADO ESTADUAL"], [2022, "SENADOR"], [2022, "GOVERNADOR"], [2024, "PREFEITO"], [2024, "VEREADOR"]].map(([a, cg]) => med(a, cg)) },
        { tit: "Dinheiro de campanha: taxa de sucesso por grupo de receita", texto: "Os candidatos de cada cargo em cinco grupos do mesmo tamanho, do que menos arrecadou ao que mais arrecadou.",
          itens: [[2022, "DEPUTADO FEDERAL"], [2022, "DEPUTADO ESTADUAL"], [2024, "PREFEITO"], [2024, "VEREADOR"]].map(([a, cg]) => { const q = quint(a, cg); return q.length && `${b(`${nomeCargo(cg)} (${a})`)}: ${q.join("; ")}.`; }) },
      ];
    },

    q3(C) {
      const { pct, nota, corr } = U(), I = L(C, "q3b"), K = L(C, "q3c"), R = L(C, "q3");
      const faixa = (r) => r.ds_faixa_idhm.slice(2);
      const idh = (a, cg) => I.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg);
      return [
        { tit: "Presidente 2022, por faixa de IDHM", texto: "IDHM do Atlas do Desenvolvimento Humano (Censo 2010). Nota média: a dos votos da cidade, de −1 (esquerda) a +1 (direita), na média das cidades da faixa.",
          itens: idh(2022, "PRESIDENTE").map((r) => `${b("IDHM " + faixa(r))}: ${V.int(r.qt_municipios)} cidades, IDHM médio de ${String(r.vr_idhm_medio).replace(".", ",")} e renda média de R$ ${V.int(r.vr_renda_pc_media)} por pessoa (2010). A esquerda ficou em 1º em ${pct(r.pc_mun_esquerda, 0)} delas, o centro em ${pct(r.pc_mun_centro, 0)} e a direita em ${pct(r.pc_mun_direita, 0)}; nota média ${nota(r.vr_nota_media)}.`) },
        { tit: "Governador 2022 e prefeito 2024, por faixa de IDHM", itens: [[2022, "GOVERNADOR"], [2024, "PREFEITO"]].map(([a, cg]) => { const f = idh(a, cg); return f.length && `${b(`${nomeCargo(cg)} (${a})`)}: esquerda em 1º em ${f.map((r) => `${pct(r.pc_mun_esquerda, 0)} das cidades de IDHM ${faixa(r).split(" (")[0]}`).join(", ")}.`; }) },
        { tit: "Correlação, cidade a cidade, com a nota média dos votos", texto: "De −1 a +1: 0 é nenhuma relação; positiva quer dizer que, quanto maior o indicador, mais à direita a cidade votou.",
          itens: K.map((r) => `${b(`${nomeCargo(r.ds_cargo)} (${r.nr_ano_eleicao})`)}, ${V.int(r.qt_municipios)} cidades: IDHM ${corr(r.r_idhm)}; IDHM Educação ${corr(r.r_idhm_educacao)}; renda por habitante ${corr(r.r_renda_per_capita)}; PIB por habitante ${corr(r.r_pib_per_capita)}; número de habitantes ${corr(r.r_populacao)}.`) },
        { tit: "Tamanho e renda da cidade (governador 2022 e prefeito 2024)", itens: R.map((r) => `${b(`${r.nr_ano_eleicao}, cidade ${r.ds_porte.slice(2)} e ${r.ds_renda.slice(2)}`)}: ${V.int(r.qt_municipios)} cidades, PIB médio de R$ ${V.int(r.vr_pib_pc_medio)} por habitante; esquerda em 1º em ${pct(r.pc_mun_esquerda, 0)}, centro em ${pct(r.pc_mun_centro, 0)}, direita em ${pct(r.pc_mun_direita, 0)}; faltaram ${pct(r.pc_abstencao_media)} dos eleitores.`) },
      ];
    },

    q4(C) {
      const { pct, corr } = U(), E = L(C, "q4b"), K = L(C, "q4c")[0], R = L(C, "q4");
      const q = (cg) => E.filter((r) => r.ds_cargo === cg);
      return [
        ...["VEREADOR", "PREFEITO"].map((cg) => ({ tit: `${nomeCargo(cg)} 2024, pela escolaridade da cidade`, texto: "Cidades em cinco grupos do mesmo tamanho pelo IDHM Educação (1 = menor). Adultos: com 25 anos ou mais e curso superior, Censo 2010; eleitores: perfil do eleitorado do TSE em 2024.",
          itens: q(cg).map((r) => `${b(`Grupo ${r.nr_quintil}`)} (IDHM Educação de ${String(r.vr_idhm_e_min).replace(".", ",")} a ${String(r.vr_idhm_e_max).replace(".", ",")}, ${V.int(r.qt_municipios)} cidades): ${pct(r.pc_adultos_superior_2010)} dos adultos e ${pct(r.pc_eleitores_superior_2024)} dos eleitores com superior; entre os candidatos, ${pct(r.pc_candidatos_superior, 0)}; entre os eleitos, ${pct(r.pc_eleitos_superior, 0)}.`) })),
        K && { tit: "Correlação, cidade a cidade, com a parte dos vereadores eleitos com diploma", itens: [`Com o IDHM Educação: ${corr(K.r_idhm_educacao)}.`, `Com a parte dos adultos com superior (2010): ${corr(K.r_adultos_superior_2010)}; dos eleitores com superior (2024): ${corr(K.r_eleitores_superior_2024)}.`, `Com o IDHM: ${corr(K.r_idhm)}. Com o tamanho da cidade: ${corr(K.r_populacao)}.`, `${V.int(K.qt_municipios)} cidades entram na conta.`] },
        { tit: "Superior completo por tamanho da cidade (prefeito e vereador, 2024)", itens: R.filter((r) => r.nr_ordem === 8).map((r) => `${b(U().cap1(r.ds_porte.slice(2)))}: ${pct(r.pc_candidatos_no_porte, 0)} dos candidatos e ${pct(r.pc_eleitos_no_porte, 0)} dos eleitos tinham curso superior completo (${V.int(r.qt_eleitos)} eleitos).`) },
      ];
    },

    q5(C) {
      const { pct } = U(), R = L(C, "q5"), P = L(C, "q5b");
      return [
        { tit: "Ano a ano: parte dos votos só no número do partido", texto: "Votos de legenda ÷ (votos de legenda + votos nominais), 1º turno.",
          itens: ["DEPUTADO FEDERAL", "DEPUTADO ESTADUAL", "VEREADOR"].map((cg) => { const s = R.filter((r) => r.ds_cargo === cg); return s.length && `${b(nomeCargo(cg))}: ${s.map((r) => `${r.nr_ano_eleicao} ${pct(r.pc_legenda)} (${V.int(r.qt_votos_legenda)} votos)`).join("; ")}.`; }) },
        { tit: "Partido a partido: deputado federal 2022", texto: "Partidos com mais de 500 mil votos, do que mais recebeu voto só na legenda ao que menos recebeu.",
          itens: P.map((r) => `${b(V.nomePartido(r.sg_partido))}${r.ds_espectro ? ` (${ESP[r.ds_espectro] || r.ds_espectro.toLowerCase()})` : ""}: ${pct(r.pc_legenda)} dos seus ${V.int(r.qt_votos_total)} votos foram só na legenda.`) },
      ];
    },

    q6(C) {
      const { pct, N1 } = U(), R = L(C, "q6"), W = L(C, "q6b"), T = L(C, "q6e"), P = L(C, "q6c");
      const TEMAS = [["pc_racial", "racismo ou igualdade racial"], ["pc_reforma_agraria", "reforma agrária"], ["pc_privatizacao", "privatização"], ["pc_desigualdade", "desigualdade"], ["pc_agronegocio", "agronegócio"], ["pc_armas", "armas"], ["pc_seguranca", "segurança pública"], ["pc_meio_ambiente", "meio ambiente"], ["pc_impostos", "impostos"], ["pc_familia", "família"]];
      const bl = (k) => R.find((r) => r.ds_bloco === k) || {};
      const partidos = [...new Set(P.map((r) => r.sg_partido))].slice(0, 8);
      return [
        { tit: "Planos de presidente: tema a tema", texto: `Parte dos planos de cada campo que cita o tema pelo menos uma vez (esquerda ${bl("esquerda").qt_planos} planos, centro ${bl("centro").qt_planos}, direita ${bl("direita").qt_planos}).`,
          itens: TEMAS.map(([k, t]) => `${b(U().cap1(t))}: esquerda ${pct(bl("esquerda")[k], 0)}, centro ${pct(bl("centro")[k], 0)}, direita ${pct(bl("direita")[k], 0)}.`) },
        { tit: "Planos de presidente: as palavras mais usadas por campo", itens: ["esquerda", "centro", "direita"].map((k) => { const ws = W.filter((r) => r.ds_bloco === k).slice(0, 12); return ws.length && `${b(U().cap1(k))}: ${ws.map((r) => `${r.palavra} (${V.int(r.qt)})`).join(", ")}.`; }) },
        { tit: "Palavras típicas de cada campo, cargo a cargo", texto: "As que o campo usa bem mais que a média do cargo, entre as que aparecem em pelo menos 3% dos seus planos; entre parênteses, quantas vezes a média.",
          itens: ["PREFEITO", "GOVERNADOR"].flatMap((cg) => ["esquerda", "centro", "direita"].map((k) => { const ws = T.filter((r) => r.ds_cargo === cg && r.ds_bloco === k).slice(0, 10); return ws.length && `${b(`${nomeCargo(cg)}, ${lado[k]}`)} (${V.int(ws[0].qt_planos)} planos): ${ws.map((r) => `${r.ds_palavra || r.palavra} (${N1.format(r.vr_destaque)})`).join(", ")}.`; })) },
        { tit: "Partido a partido: o que cada um mais repete", texto: "Planos de presidente, governador e prefeito de 2018 a 2026. Em negrito, entre as 15 mais usadas, as que o partido usa pelo menos 1,3 vez mais que a média.",
          itens: partidos.map((sg) => { const ws = P.filter((r) => r.sg_partido === sg).slice(0, 15); return `${b(V.nomePartido(sg))} (${V.int(ws[0].qt_planos)} planos): ${ws.map((r) => (r.vr_destaque >= 1.3 ? `<b>${r.ds_palavra || r.palavra}</b>` : r.ds_palavra || r.palavra)).join(", ")}.`; }) },
      ];
    },

    q7(C) {
      const { pct, anos1 } = U(), J = L(C, "q7c"), D = L(C, "q7d"), R = L(C, "q7"), E = L(C, "q7b");
      const QJ = ["20% com eleitorado mais velho", "2º grupo", "3º grupo", "4º grupo", "20% com eleitorado mais jovem"];
      const anos = [...new Set(R.map((r) => r.nr_ano_eleicao))];
      return [
        ...[2024, 2020].map((a) => ({ tit: `Cidades pela idade do eleitorado (vereadores, ${a})`, texto: "Cinco grupos de cidades do mesmo tamanho pela parte do eleitorado com até 29 anos.",
          itens: J.filter((r) => r.nr_ano_eleicao === a).map((r) => `${b(QJ[r.nr_quintil - 1])} (${V.int(r.qt_municipios)} cidades, de ${pct(r.pc_ate_29_min, 0)} a ${pct(r.pc_ate_29_max, 0)} de jovens): eleitor com ${anos1(r.vr_idade_media_eleitorado)} em média e ${pct(r.pc_eleitorado_ate_29, 0)} com até 29 anos; ${pct(r.pc_candidatos_ate_29)} dos candidatos e ${pct(r.pc_eleitos_ate_29)} dos eleitos com até 29 anos; o vereador eleito tinha ${anos1(r.vr_idade_media_eleitos)}; ${pct(r.pc_sucesso_jovens)} dos candidatos jovens se elegeram.`) })),
        { tit: "Cargo a cargo: idade de quem vota, de quem se candidata e de quem se elege", itens: D.map((r) => `${b(`${nomeCargo(r.ds_cargo)} (${r.nr_ano_eleicao})`)}: eleitor com ${anos1(r.vr_idade_media_eleitorado)}, candidato com ${anos1(r.vr_idade_media_candidatos)}, eleito com ${anos1(r.vr_idade_media_eleitos)} (${V.int(r.qt_eleitos)} eleitos). Até 29 anos: ${pct(r.pc_eleitorado_ate_29, 0)} do eleitorado, ${pct(r.pc_eleitos_ate_29)} dos eleitos. 60 anos ou mais: ${pct(r.pc_eleitorado_60_mais, 0)} do eleitorado, ${pct(r.pc_eleitos_60_mais, 0)} dos eleitos.`) },
        { tit: "Ano a ano: chance de se eleger, jovem e não jovem", itens: anos.map((a) => { const j = R.find((r) => r.nr_ano_eleicao === a && r.ds_faixa === "jovem"), n = R.find((r) => r.nr_ano_eleicao === a && r.ds_faixa !== "jovem"); return j && n && `${b(String(a))}: ${V.int(j.qt_candidatos)} candidatos com até 29 anos, ${V.int(j.qt_eleitos)} eleitos (${pct(j.pc_sucesso)}); com 30 ou mais, ${pct(n.pc_sucesso)} se elegeram.`; }) },
        { tit: "Campo político: espaço para os jovens (2018 a 2024)", itens: E.filter((r) => r.ds_espectro !== "NÃO CLASSIFICADO").map((r) => `${b(U().cap1(ESP[r.ds_espectro] || r.ds_espectro.toLowerCase()))}: ${pct(r.pc_jovens_candidatos)} dos ${V.int(r.qt_candidatos)} candidatos e ${pct(r.pc_jovens_eleitos)} dos eleitos tinham até 29 anos.`) },
      ];
    },

    q8(C) {
      const { pct, reais } = U(), R = L(C, "q8"), E = L(C, "q8b");
      const anos = [...new Set(E.map((r) => r.nr_ano_eleicao))];
      return [
        { tit: "Ano a ano: dinheiro de empresas na receita dos candidatos", texto: "Receita declarada com doador pessoa jurídica (CNPJ) ÷ receita total, fora presidente.",
          itens: R.map((r) => `${b(String(r.nr_ano_eleicao))}: ${reais(r.vr_doacao_pj)} de empresas, ${pct(r.pc_pj)} dos ${reais(r.vr_receita_total)} arrecadados.${r.nr_ano_eleicao >= 2016 ? " Já com a proibição de 2015." : ""}${aviso26(r.nr_ano_eleicao)}`) },
        { tit: "Campo a campo, antes da proibição", itens: anos.map((a) => `${b(String(a))}: ${E.filter((r) => r.nr_ano_eleicao === a && r.ds_espectro !== "NÃO CLASSIFICADO").map((r) => `${ESP[r.ds_espectro] || r.ds_espectro.toLowerCase()} ${pct(r.pc_pj, 0)} (${reais(r.vr_doacao_pj)})`).join("; ")}.`) },
      ];
    },

    q9(C) {
      const { pct, nota } = U(), R = L(C, "q9"), N = L(C, "q9b");
      const cargos = [...new Set(N.map((r) => r.ds_cargo))];
      return [
        { tit: "Ano a ano: votos e cidades por campo (presidente nas gerais, prefeito nas municipais)", texto: "Esquerda junta esquerda e centro-esquerda; direita junta direita e centro-direita. 1º turno.",
          itens: R.map((r) => `${b(`${r.nr_ano_eleicao} (${r.tp_abrangencia === "GERAL" ? "presidente" : "prefeito"})`)}: esquerda ${pct(r.pc_votos_esquerda)}, centro ${pct(r.pc_votos_centro)}, direita ${pct(r.pc_votos_direita)} dos votos. Na frente em ${V.int(r.qt_mun_esquerda_na_frente)}, ${V.int(r.qt_mun_centro_na_frente)} e ${V.int(r.qt_mun_direita_na_frente)} das ${V.int(r.qt_municipios)} cidades.`) },
        { tit: "Cargo a cargo: nota média dos votos (Σ votos do partido × nota ÷ Σ votos)", texto: "No Brasil inteiro e na cidade do meio (mediana); de −1 (esquerda) a +1 (direita).",
          itens: cargos.map((cg) => `${b(nomeCargo(cg))}: ${N.filter((r) => r.ds_cargo === cg).map((r) => `${r.nr_ano_eleicao} ${nota(r.vr_nota_brasil)}`).join("; ")}.`) },
        { tit: "Cidades por lado, cargo a cargo, na eleição mais recente", itens: cargos.map((cg) => { const r = N.filter((x) => x.ds_cargo === cg).slice(-1)[0]; return r && `${b(`${nomeCargo(cg)} (${r.nr_ano_eleicao})`)}: nota do Brasil ${nota(r.vr_nota_brasil)}, da cidade mediana ${nota(r.vr_nota_cidade_mediana)}; cidades com nota de esquerda ${V.int(r.qt_mun_esquerda)}, de centro ${V.int(r.qt_mun_centro)}, de direita ${V.int(r.qt_mun_direita)}; ${pct(r.pc_votos_com_nota, 0)} dos votos foram para partidos com nota.`; }) },
      ];
    },

    q10(C) {
      const { pct, reais } = U(), R = L(C, "q10"), F = L(C, "q10b");
      const pares = [...new Set(R.map((r) => r.nr_ano_eleicao + "|" + r.ds_cargo))];
      return [
        { tit: "Cargo a cargo: dinheiro público e privado de eleitos e não eleitos", texto: "Média por candidato. Dinheiro público: Fundo Especial de Financiamento de Campanha e Fundo Partidário.",
          itens: pares.map((k) => { const [a, cg] = k.split("|"), e = R.find((r) => r.nr_ano_eleicao === +a && r.ds_cargo === cg && r.ds_resultado === "eleito"), n = R.find((r) => r.nr_ano_eleicao === +a && r.ds_cargo === cg && r.ds_resultado !== "eleito");
            return e && n && `${b(`${nomeCargo(cg)} (${a})`)}: o eleito recebeu em média ${reais(e.vr_publico_medio)} de dinheiro público e ${reais(e.vr_privado_medio)} privado (${pct(e.pc_publico, 0)} público); o não eleito, ${reais(n.vr_publico_medio)} público e ${reais(n.vr_privado_medio)} privado (${pct(n.pc_publico, 0)} público). ${V.int(e.qt_candidatos)} eleitos e ${V.int(n.qt_candidatos)} não eleitos.`; }) },
        { tit: "Taxa de sucesso por faixa de dinheiro público", texto: "Quem recebeu algum dinheiro público em cinco grupos do mesmo tamanho; quem não recebeu nada, à parte.",
          itens: [...new Set(F.map((r) => r.nr_ano_eleicao + "|" + r.ds_cargo))].map((k) => { const [a, cg] = k.split("|"); return `${b(`${nomeCargo(cg)} (${a})`)}: ${F.filter((r) => r.nr_ano_eleicao === +a && r.ds_cargo === cg).map((r) => `${r.ds_faixa} ${pct(r.pc_taxa_sucesso)} (${V.int(r.qt_eleitos)} de ${V.int(r.qt_candidatos)}${r.nr_faixa ? `, média de ${V.brl(r.vr_publico_medio)}` : ""})`).join("; ")}.`; }) },
      ];
    },

    q11(C) {
      const { pct, reais } = U(), R = L(C, "q11"), T = L(C, "q11b"), B = L(C, "q11c");
      const anos = [...new Set(R.map((r) => r.nr_ano_eleicao))];
      const cargo = (a, cg) => { const rs = T.filter((r) => r.nr_ano_eleicao === a && r.ds_cargo === cg).sort((x, y) => y.pc_cargo - x.pc_cargo); if (!rs.length) return null;
        const prop = rs.filter((r) => r.fl_propaganda).reduce((s, r) => s + r.pc_cargo, 0), tot = rs.reduce((s, r) => s + r.vr_total, 0);
        return `${b(`${nomeCargo(cg)} (${a})`)}: gastaram ${reais(tot)}, ${pct(prop, 0)} em propaganda. Maiores tipos: ${rs.slice(0, 4).map((r) => `${r.ds_tipo.toLowerCase()} ${pct(r.pc_cargo, 0)}`).join(", ")}.`; };
      return [
        { tit: "Ano a ano: as maiores categorias de despesa", texto: "Categoria escolhida pelo próprio candidato na prestação de contas, fora presidente; parte do total do ano.",
          itens: anos.map((a) => `${b(String(a))}: ${R.filter((r) => r.nr_ano_eleicao === a).slice(0, 6).map((r) => `${r.ds_origem_despesa.toLowerCase()} ${pct(r.pc_ano, 0)} (${reais(r.vr_total)})`).join("; ")}.`) },
        { tit: "Cargo a cargo: quanto vai para propaganda e de que tipo", itens: [2024, 2022, 2020, 2018].flatMap((a) => [...new Set(T.filter((r) => r.nr_ano_eleicao === a).map((r) => r.ds_cargo))].map((cg) => cargo(a, cg))) },
        { tit: "Campo a campo: a propaganda de esquerda, centro e direita", texto: "Só o gasto com propaganda, por tipo.",
          itens: [2024, 2022, 2020, 2018].flatMap((a) => ["esquerda", "centro", "direita"].map((k) => { const rs = B.filter((r) => r.nr_ano_eleicao === a && r.ds_bloco === k).sort((x, y) => y.pc_propaganda - x.pc_propaganda); return rs.length && `${b(`${a}, ${lado[k]}`)}: ${rs.slice(0, 5).map((r) => `${r.ds_tipo.toLowerCase()} ${pct(r.pc_propaganda, 0)}`).join(", ")} (total ${reais(rs.reduce((s, r) => s + r.vr_total, 0))}).`; })) },
      ];
    },

    q12(C) {
      const { pct } = U(), R = L(C, "q12"), B = L(C, "q12b"), T = L(C, "q12c"), K = L(C, "q12e"), H = L(C, "q12d");
      const tot = B.reduce((s, r) => s + r.qt_pessoas, 0);
      const govs = [...new Set(K.map((r) => r.ds_governo))];
      return [
        { tit: "Ano a ano: quantos eleitos voltam a se eleger", itens: R.map((r) => `${b(`${r.nr_ano} (${r.tp_abrangencia === "GERAL" ? "deputados, senadores e governadores" : "prefeitos e vereadores"})`)}: ${V.int(r.qt_eleitos)} eleitos; ${pct(r.pc_eleito_de_novo_4_anos, 0)} se elegeram de novo 4 anos depois${r.pc_eleito_de_novo_8_anos != null ? ` e ${pct(r.pc_eleito_de_novo_8_anos, 0)} 8 anos depois` : ""}.`) },
        { tit: "Quantas vitórias cada político teve de 1994 a 2026", texto: `${V.int(tot)} pessoas venceram pelo menos uma eleição.`,
          itens: B.map((r) => `${b(r.qt_vitorias === 8 ? "8 ou mais vitórias" : `${r.qt_vitorias} ${r.qt_vitorias === 1 ? "vitória" : "vitórias"}`)}: ${V.int(r.qt_pessoas)} pessoas (${pct((100 * r.qt_pessoas) / tot)}).`) },
        { tit: "Os que mais venceram", itens: T.map((r) => `${b(V.titulo(r.nm_pessoa))}: ${r.qt_vitorias} vitórias em ${r.qt_candidaturas} eleições, de ${r.nr_primeira_eleicao} a ${r.nr_ultima_eleicao}. ${V.esc(r.ds_trajetoria)}.`) },
        H.length && { tit: `Uma ficha por dentro: ${V.titulo(H[0].nm_pessoa)}`, texto: "O que a consulta q12d traz para cada candidatura (é a mesma conta da ficha de cada político).",
          itens: H.map((r) => `${b(`${r.nr_ano_eleicao}, ${nomeCargo(r.ds_cargo).toLowerCase()}`)} em ${V.esc(r.ds_lugar)}, como ${V.esc(V.titulo(r.nm_urna || ""))}, pelo ${V.esc(r.sg_partido)} (nota ${U().nota(r.vr_nota_partido)}${r.ds_espectro ? ", " + (ESP[r.ds_espectro] || "") : ""}): ${V.esc((r.ds_sit_tot_turno || "sem resultado").toLowerCase())}${r.qt_votos_1t != null ? `, ${V.int(r.qt_votos_1t)} votos` : ""}${r.vr_despesa_total ? `, gastou ${V.brl(r.vr_despesa_total)}` : ""}${r.vr_patrimonio ? `, declarou ${V.brl(r.vr_patrimonio)} em bens` : ""}.`) },
        ...govs.map((g) => { const ks = K.filter((r) => r.ds_governo === g).sort((x, y) => y.pc_segue_governo - x.pc_segue_governo);
          return { tit: `Câmara, governo ${g}: quanto cada bancada segue o partido e o governo`, texto: "Votos dos deputados iguais à orientação da própria bancada e à do líder do governo, nas votações de mérito do Plenário.",
            itens: ks.map((r) => `${b(V.nomePartido(r.sg_partido))} (${V.int(r.qt_deputados)} deputados, ${V.int(r.qt_votos)} votos): segue o partido em ${pct(r.pc_segue_partido, 0)} e o governo em ${pct(r.pc_segue_governo, 0)}.`) }; }),
      ];
    },
  };
})();
