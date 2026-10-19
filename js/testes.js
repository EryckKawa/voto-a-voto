/* Voto a voto — testes do site, rodando dentro do próprio navegador (abra index.html#/testes ou testes.html).
   Cinco grupos: velocidade, funcionamento, preenchimento (campos e mapa sem vazios), acessibilidade (axe-core) e conferência dos dados com números oficiais do TSE.
   Os testes esperam a página ficar pronta (evento "vav:pronto" do roteador) em vez de esperar um tempo fixo. */
(function () {
  "use strict";
  const V = window.V;

  /* ---------- coleta de erros desde o carregamento da página ---------- */
  const ERROS = [];
  addEventListener("error", (e) => ERROS.push(e.message || String(e)));
  addEventListener("unhandledrejection", (e) => ERROS.push(String(e.reason && e.reason.message ? e.reason.message : e.reason)));
  const errOriginal = console.error;
  console.error = function (...a) { ERROS.push(a.map((x) => (x && x.message) || String(x)).join(" ")); errOriginal.apply(console, a); };

  /* ---------- tarefas longas (travadas de mais de 50 ms), quando o navegador informa ---------- */
  const LONGAS = [];
  let temLongas = false;
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => LONGAS.push([e.startTime, e.duration]))).observe({ type: "longtask", buffered: true }); temLongas = true; } catch (e) {}
  const travouEntre = (t0, t1) => LONGAS.filter(([s]) => s >= t0 && s <= t1).reduce((a, [, d]) => a + d, 0);

  /* ---------- utilidades ---------- */
  const quadros = (n = 2) => new Promise((ok) => { const f = () => (--n <= 0 ? ok() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const ate = (cond, limite = 8000) => new Promise((ok, falha) => {
    const t0 = performance.now();
    (function olha() { let r; try { r = cond(); } catch (e) {} if (r) return ok(r); if (performance.now() - t0 > limite) return falha(new Error("não aconteceu em " + limite / 1000 + " s")); setTimeout(olha, 16); })();
  });
  const irPara = (h, limite = 15000) => new Promise((ok, falha) => {
    const t = setTimeout(() => { removeEventListener("vav:pronto", fim); falha(new Error("a página não terminou de abrir")); }, limite);
    function fim() { clearTimeout(t); removeEventListener("vav:pronto", fim); ok(); }
    addEventListener("vav:pronto", fim);
    if (location.hash === h) V.ir(h); else location.hash = h;
  });
  const q = (s) => document.querySelector(s), qq = (s) => [...document.querySelectorAll(s)];
  const txt = (s) => (q(s) ? q(s).textContent.replace(/\s+/g, " ").trim() : "");
  const ms = (v) => V.int(Math.round(v)) + " ms";
  const carregarAxe = () => (window.axe ? Promise.resolve() : new Promise((ok, falha) => { const s = document.createElement("script"); s.src = "vendor/axe.min.js"; s.onload = ok; s.onerror = () => falha(new Error("vendor/axe.min.js não encontrado")); document.head.appendChild(s); }));

  /* resultado de um teste: ok (passou), aviso (passou com ressalva) ou falha */
  const R = (ok, medido, esperado, nota) => ({ st: ok === true ? "ok" : ok === "aviso" ? "aviso" : "falha", medido, esperado, nota });

  /* mede o tempo até a página ficar pronta e a condição aparecer, e quanto o navegador travou nesse meio-tempo */
  async function medirPagina(h, pronta, limiteMs, limiteTrava) {
    const t0 = performance.now();
    await irPara(h); await ate(pronta, 15000); await quadros(2);
    const t = performance.now() - t0;
    await new Promise((r) => setTimeout(r, 400));      // tarefas que ainda rodam logo depois de abrir
    const trava = travouEntre(t0, performance.now());
    if (q("main").dataset.erro) return R(false, "erro ao abrir", "abrir sem erro", txt("main .aviso"));
    const ok = t <= limiteMs && (!temLongas || trava <= limiteTrava);
    const quase = t <= limiteMs * 1.6;
    return R(ok ? true : quase ? "aviso" : false, ms(t) + (temLongas ? " · travou " + ms(trava) : ""), "até " + ms(limiteMs) + (temLongas ? " · travar até " + ms(limiteTrava) : ""));
  }

  /* ---------- os testes ---------- */
  const T = [];
  const teste = (grupo, nome, rodar) => T.push({ grupo, nome, rodar });

  // VELOCIDADE (a primeira visita a cada página: os dados ainda não estão na memória)
  teste("Velocidade", "Página inicial (Ninguém) abre", () => medirPagina("#/", () => /Ninguém/.test(txt("main h1")), 1500, 300));
  teste("Velocidade", "O que o voto revela abre", () => medirPagina("#/revela", () => qq(".achado").length >= 5, 1200, 300));
  teste("Velocidade", "Mapa do Brasil abre", () => medirPagina("#/mapa", () => qq("#mapa-br path.mun").length > 5000 && /prefeituras/.test(txt("#manchete")), 2000, 600));
  teste("Velocidade", "Cidade abre com o histórico (São Paulo)", () => medirPagina("#/mapa/br/SP/c/3550308", () => qq("#hist .linha-tempo").length >= 3, 2000, 600));
  teste("Velocidade", "Eleição antiga abre (presidente 1994)", () => medirPagina("#/mapa/e/PRES1994", () => /1994/.test(txt("#manchete")), 1500, 500));
  teste("Velocidade", "12 perguntas abre", () => medirPagina("#/perguntas", () => qq(".pq-lista a").length === 12, 1500, 400));
  teste("Velocidade", "Partidos abre", () => medirPagina("#/partidos", () => qq("#pt-ano-graf svg g").length > 20, 1500, 400));
  teste("Velocidade", "Trocar de ano no mapa", () => medirPagina("#/mapa/e/PRES2022", () => /2022/.test(txt("#manchete")), 800, 400));
  teste("Velocidade", "Trocar a régua (voto ↔ Harvard)", async () => {
    await irPara("#/mapa");
    const atual = V.regua(), outra = atual === "voto" ? "harvard" : "voto";
    const t0 = performance.now();
    q(`[data-regua="${outra}"]`).click();
    await ate(() => V.regua() === outra && q(`[data-regua="${outra}"]`).getAttribute("aria-pressed") === "true"); await quadros(2);
    const t = performance.now() - t0;
    q(`[data-regua="${atual}"]`).click(); await ate(() => V.regua() === atual);
    return R(t <= 700 ? true : t <= 1200 ? "aviso" : false, ms(t), "até 700 ms");
  });
  teste("Velocidade", "Zoom do mapa fluido", async () => {
    await irPara("#/mapa"); await quadros(3);
    let n = 0, rodando = true; const conta = () => { n++; if (rodando) requestAnimationFrame(conta); }; requestAnimationFrame(conta);
    const t0 = performance.now(); q("#z-mais").click();
    await new Promise((r) => setTimeout(r, 900)); rodando = false;
    const fps = n / ((performance.now() - t0) / 1000);
    q("#z-br").click(); await new Promise((r) => setTimeout(r, 900));
    return R(fps >= 40 ? true : fps >= 24 ? "aviso" : false, Math.round(fps) + " quadros/s", "40 ou mais", fps < 40 ? "Abaixo de 40 o zoom parece engasgar. Em computador sem placa de vídeo é comum ficar entre 25 e 40." : "");
  });
  teste("Velocidade", "Memória usada", async () => {
    const m = performance.memory;
    if (!m) return R("aviso", "este navegador não informa", "até 120 MB", "Só o Chrome e o Edge informam a memória.");
    const mb = m.usedJSHeapSize / 1e6;
    return R(mb <= 120 ? true : mb <= 200 ? "aviso" : false, V.int(Math.round(mb)) + " MB", "até 120 MB");
  });

  // FUNCIONAMENTO
  teste("Funcionamento", "Menu com as cinco seções (sem Disputas apertadas)", async () => {
    const ls = qq(".nav a").map((a) => a.textContent.trim());
    return R(ls.length === 5 && ls[3] === "12 perguntas" && ls[4] === "Partidos" && !ls.some((l) => /Disputas/.test(l)), ls.join(" · "), "Ninguém · Mapa · O que o voto revela · 12 perguntas · Partidos");
  });
  teste("Funcionamento", "Endereço antigo das disputas leva ao mapa", async () => {
    location.hash = "#/apertadas";
    await ate(() => location.hash.startsWith("#/mapa") && q("#mapa-br"), 8000);
    return R(true, location.hash, "#/mapa");
  });
  teste("Funcionamento", "Busca acha Campinas e abre a cidade", async () => {
    await irPara("#/");
    const inp = q("#busca"); inp.value = "campinas"; inp.dispatchEvent(new Event("input", { bubbles: true }));
    const li = await ate(() => qq("#busca-lista li[data-h]").find((l) => /Campinas/.test(l.textContent)), 6000);
    const pronto = new Promise((ok) => addEventListener("vav:pronto", function f() { removeEventListener("vav:pronto", f); ok(); }));
    li.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    await pronto; await ate(() => /Campinas/.test(txt("#manchete")), 8000);
    return R(true, txt("#manchete").slice(0, 70) + "…", "título fala de Campinas");
  });
  teste("Funcionamento", "Clicar numa cidade do mapa aproxima o estado", async () => {
    await irPara("#/mapa"); await quadros(2);
    const el = qq("#mapa-br path.mun").find((p) => p.__data__ && p.__data__.id === "3509502");   // Campinas, SP
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await ate(() => location.hash.includes("/br/SP"), 6000); await ate(() => /São Paulo/.test(txt("#manchete")), 6000);
    return R(true, location.hash, "#/mapa/br/SP");
  });
  teste("Funcionamento", "Botões de cargo do maior para o menor, com deputados e vereador", async () => {
    await irPara("#/mapa"); const b = qq("#controles .controles__linha .chip").map((e) => e.textContent.trim());
    return R(b.join(",") === "Presidente,Governador,Senador,Dep. federal,Dep. estadual,Prefeito,Vereador", b.join(" · "), "Presidente · Governador · Senador · Dep. federal · Dep. estadual · Prefeito · Vereador");
  });
  teste("Funcionamento", "Deputado federal: cidade mostra o partido mais votado", async () => {
    await irPara("#/mapa/e/DF2022/br/PI/c/2211001"); await ate(() => qq("#cid-corpo .ranking li").length >= 3, 8000);
    const t = txt("#manchete h1"), n = qq("#cid-corpo .ranking li").length;
    return R(/partido mais votado para deputado federal em 2022/.test(t) && n >= 3, t.slice(0, 80) + " · " + n + " partidos", "título com o partido mais votado; lista de partidos no painel");
  });
  teste("Funcionamento", "▶ Passar os anos avança sozinho", async () => {
    await irPara("#/mapa"); await quadros(2);
    q("#tocar").click();
    await ate(() => /\/e\/PREF(1996|2000)/.test(location.hash), 4000);
    const ano = location.hash; q("#tocar") && q("#tocar").click(); await new Promise((r) => setTimeout(r, 300));
    return R(true, ano, "passa para os anos anteriores");
  });
  teste("Funcionamento", "Histórico da cidade tem os sete cargos, do maior para o menor", async () => {
    await irPara("#/mapa/br/PI/c/2211001"); const n = await ate(() => qq("#hist .linha-tempo").length >= 7 && qq("#hist .linha-tempo").length, 8000);
    const anos = qq("#hist .linha-tempo__anos li").length, ordem = qq("#hist .linha-tempo__cg").map((e) => e.textContent.trim());
    const certa = ordem.join(",") === "Presidente,Governador,Senador,Deputado federal,Deputado estadual,Prefeito,Vereador";
    return R(n === 7 && anos >= 55 && certa, n + " cargos, " + anos + " eleições · " + ordem.join(", "), "7 cargos na ordem Presidente … Vereador, 55 ou mais eleições");
  });
  teste("Funcionamento", "12 perguntas: recorte, Gráfico | Tabela e SQL", async () => {
    await irPara("#/perguntas/q2"); await quadros(2);
    if (q("[data-modo='graf']")) q("[data-modo='graf']").click();
    const antes = txt("#pq-graf"); q("[data-vista='3']").click(); await quadros(1);
    const trocou = antes !== txt("#pq-graf");
    q("[data-modo='tab']").click(); await quadros(1);
    const linhasTab = qq("#pq-graf tbody tr").length; q("[data-modo='graf']").click();
    const sql = /SELECT/.test(txt("#sql-q2"));
    return R(trocou && linhasTab === 5 && sql, `recorte ${trocou ? "trocou" : "não trocou"} · tabela com ${linhasTab} linhas · SQL ${sql ? "presente" : "ausente"}`, "troca o gráfico; tabela com 5 grupos; SQL na página");
  });
  teste("Funcionamento", "Régua: o PT não aparece como extremo", async () => {
    const BR = await V.baseBR(), pt = BR.ideoV.partidos.PT.nota, psol = BR.ideoV.partidos.PSOL.nota;
    return R(pt > -0.8 && psol > -0.9 && V.nome5(pt) === "esquerda", "PT " + pt.toFixed(2).replace(".", ",") + " (" + V.nome5(pt) + ") · PSOL " + psol.toFixed(2).replace(".", ","), "nenhum partido perto de −1");
  });

  // ACESSIBILIDADE
  const PAGS_A11Y = [["#/", "Página inicial"], ["#/mapa", "Mapa"], ["#/mapa/br/SP/c/3550308", "Cidade"], ["#/revela", "O que o voto revela"], ["#/perguntas", "12 perguntas"], ["#/perguntas/q3", "Uma pergunta (Q3)"], ["#/partidos", "Partidos"]];
  for (const [h, nome] of PAGS_A11Y) {
    teste("Acessibilidade", `${nome}: regras de acessibilidade (axe)`, async () => {
      await carregarAxe(); await irPara(h); await quadros(3);
      const r = await window.axe.run(document, { exclude: [["#testes-painel"]], resultTypes: ["violations"] });
      const v = r.violations;
      return R(v.length === 0, v.length ? v.map((x) => `${x.id} (${x.nodes.length})`).join(", ") : "nenhum problema", "nenhum problema", v.length ? v[0].help : "");
    });
    teste("Acessibilidade", `${nome}: áreas de clique grandes o bastante`, async () => {
      if (location.hash !== h) { await irPara(h); await quadros(2); }
      // WCAG 2.5.8: alvo de pelo menos 24 × 24 px; links dentro de um parágrafo de texto são exceção
      const peq = qq("a[href], button, input, select, [role=button], [tabindex='0']").filter((e) => {
        if (e.closest("#testes-painel") || e.closest("p, small, .fonte")) return false;
        const b = e.getBoundingClientRect(); if (!b.width || !b.height || getComputedStyle(e).visibility === "hidden") return false;
        return b.width < 24 || b.height < 24;
      });
      return R(peq.length === 0, peq.length ? peq.length + ": " + peq.slice(0, 4).map((e) => (e.textContent.trim() || e.getAttribute("aria-label") || e.tagName).slice(0, 24)).join(" · ") : "todas", "todas com 24 × 24 px ou mais");
    });
  }

  // DADOS: o site bate com os números oficiais do TSE?
  const perto = (a, b, tol) => Math.abs(a - b) <= tol;
  teste("Dados", "Presidente 2022, 2º turno: Lula 60.345.999 × Bolsonaro 58.206.354", async () => {
    const r = await V.dados("br/resumo/PRES2022"), t2 = r.BR.t2;
    const voto = (nome) => { const x = t2.find(([sq]) => r.c[sq] && new RegExp(nome, "i").test(r.c[sq][0])); return x ? x[1] : 0; };
    const l = voto("LULA"), b = voto("BOLSONARO");
    return R(l === 60345999 && b === 58206354, V.int(l) + " × " + V.int(b), "60.345.999 × 58.206.354 (TSE)");
  });
  teste("Dados", "O mapa tem as 5.570 cidades do Brasil", async () => {
    const BR = await V.baseBR();
    return R(BR.lista.length === 5570, V.int(BR.lista.length) + " cidades", "5.570 (IBGE)");
  });
  teste("Dados", "Abstenção no 1º turno de 2022: 20,9%", async () => {
    const s = (await V.dados("br/serie_comp")).find((x) => x[0] === 2022), v = (100 * s[4]) / s[2];
    return R(perto(v, 20.95, 0.3), V.pct(v), "20,9% (TSE), tolerância de 0,3 ponto");
  });
  teste("Dados", "Branco e nulo para presidente em 1994: 18,8%", async () => {
    const s = (await V.dados("br/serie_comp")).find((x) => x[0] === 1994), v = (100 * (s[5] + s[6])) / s[3];
    return R(perto(v, 18.8, 0.3), V.pct(v), "18,8% (TSE)");
  });
  teste("Dados", "Prefeitos eleitos em 2008: PMDB 1.201, PSDB 791, PT 558", async () => {
    const w = await V.dados("br/venc/PREF2008"), c = {};
    for (const x of Object.values(w)) if (x[9]) c[x[2]] = (c[x[2]] || 0) + 1;
    return R(perto(c.PMDB, 1201, 2) && perto(c.PSDB, 791, 2) && perto(c.PT, 558, 2), `PMDB ${c.PMDB}, PSDB ${c.PSDB}, PT ${c.PT}`, "1.201, 791, 558 (TSE), tolerância de 2", "Diferenças de 1 vêm de eleições refeitas depois.");
  });
  teste("Dados", "Ninguém em 2024: 42,6 milhões de eleitores", async () => {
    const c = await V.dados("br/comp/2024"); let s = 0;   // mesma fonte do título da página inicial: todas as cidades, 1º turno
    for (const o of Object.values(c)) if (o.t1) s += o.t1[2] + o.t1[3] + o.t1[4];
    return R(perto(s / 1e6, 42.6, 0.1), V.int(s), "42,6 milhões (TSE: faltas + brancos + nulos)");
  });
  teste("Dados", "Achado da virada: PT melhor nas ricas em 2002 e nas pobres de 2006 em diante", async () => {
    const A = await V.dados("br/achados"), r = (a) => A.pt_renda.find((x) => x.ano === a).pt;
    const ok = r(2002)[0] < r(2002)[4] && A.pt_renda.filter((x) => x.ano >= 2006).every((x) => x.pt[0] > x.pt[4]);
    return R(ok, `2002: ${V.pct(r(2002)[0], 0)} × ${V.pct(r(2002)[4], 0)} · 2006: ${V.pct(r(2006)[0], 0)} × ${V.pct(r(2006)[4], 0)}`, "mais pobres < mais ricas em 2002; > de 2006 em diante");
  });
  teste("Dados", "Achado das cidades de um lado só: vantagem de 2022 bate com o resultado oficial", async () => {
    const A = await V.dados("br/achados"), u = A.um_lado.find((x) => x.ano === 2022);
    // TSE: Lula 50,90% × Bolsonaro 49,10% dos válidos no 2º turno de 2022
    return R(Math.abs(u.margem_brasil - 1.8) < 0.05 && u.acima70 > 0 && u.acima70 < u.cidades, `vantagem ${String(u.margem_brasil).replace(".", ",")} ponto · ${V.int(u.acima70)} cidades acima de 70%`, "1,8 ponto (TSE)");
  });
  teste("Dados", "Achado dos prefeitos: conta de reeleitos bate com o arquivo de 2024", async () => {
    const A = await V.dados("br/achados"), p = A.prefeitos[A.prefeitos.length - 1], w = await V.dados("br/venc/PREF2024");
    const eleitos = Object.values(w).filter((x) => x[9]).length;
    return R(p.reeleitos <= eleitos && p.trocaram <= p.reeleitos && p.reeleitos > 1500, `${V.int(p.trocaram)} de ${V.int(p.reeleitos)} reeleitos (de ${V.int(eleitos)} eleitos)`, "números coerentes entre si");
  });
  teste("Dados", "Banco nacional: 513 deputados federais e 1.035 estaduais eleitos em 2022", async () => {
    const P = await V.dados("br/perguntas"), c = P.consultas.find((x) => x.id === "q1b"), i = c.colunas.indexOf("qt_cadeiras");
    const n = (cg) => (c.linhas.find((l) => l[0] === 2022 && l[1] === cg) || [])[i];
    return R(n("DEPUTADO FEDERAL") === 513 && n("DEPUTADO ESTADUAL") === 1035, `${n("DEPUTADO FEDERAL")} e ${n("DEPUTADO ESTADUAL")}`, "513 e 1.035 cadeiras (fora as 24 do DF)");
  });
  teste("Dados", "Banco nacional: doação de empresas some depois da proibição de 2015", async () => {
    const P = await V.dados("br/perguntas"), c = P.consultas.find((x) => x.id === "q8"), i = c.colunas.indexOf("pc_pj");
    const v = (a) => (c.linhas.find((l) => l[0] === a) || [])[i];
    return R(v(2014) > 15 && v(2018) < 1, `2014: ${V.pct(v(2014))} · 2018: ${V.pct(v(2018))}`, "mais de 15% em 2014; menos de 1% em 2018");
  });
  teste("Dados", "Banco nacional: o mapa e a consulta contam as mesmas 5.570 cidades", async () => {
    const P = await V.dados("br/perguntas"), c = P.consultas.find((x) => x.id === "q9"), i = c.colunas.indexOf("qt_municipios");
    const mx = Math.max(...c.linhas.map((l) => l[i]));
    return R(P.tamanho.municipios === 5570 && mx <= 5570, `${V.int(P.tamanho.municipios)} no banco; até ${V.int(mx)} por eleição`, "5.570, sem o voto no exterior");
  });
  teste("Dados", "Os três estudos concordam entre si (correlação de 0,9 ou mais)", async () => {
    const D = await V.dados("br/partidos_notas"), ps = Object.entries(D.pares).filter(([k, p]) => p && !k.includes("CAM"));
    return R(ps.length === 3 && ps.every(([, p]) => p.r >= 0.9), ps.map(([k, p]) => `${k} ${p.r.toFixed(2).replace(".", ",")} (n=${p.n})`).join(" · "), "0,90 ou mais nos três pares");
  });
  teste("Dados", "Consenso: PT à esquerda, PSDB do centro (1994) à centro-direita (2014)", async () => {
    const P = (await V.dados("br/partidos_notas")).partidos, c = (k, a) => P[k].serie[a].c;
    const ok = c("PT", 2022) < -0.5 && c("PSDB", 1994) > -0.25 && c("PSDB", 1994) <= 0.25 && c("PSDB", 2014) > 0.25 && c("PL", 2022) > 0.25;
    return R(ok, `PT 2022 ${c("PT", 2022).toFixed(2)} · PSDB 1994 ${c("PSDB", 1994).toFixed(2)}, 2014 ${c("PSDB", 2014).toFixed(2)} · PL 2022 ${c("PL", 2022).toFixed(2)}`, "PT < −0,5; PSDB centro em 1994 e > +0,25 em 2014; PL > +0,25");
  });
  teste("Dados", "Notas recentes: PL de 2026 na direita, todas entre −1 e +1", async () => {
    const P = (await V.dados("br/partidos_notas")).partidos;
    const todas = Object.values(P).flatMap((p) => Object.values(p.serie).map((s) => s.c)), fora = todas.filter((c) => c < -1 || c > 1).length;
    const pl = P.PL.serie[2026].c, novo = P.NOVO.serie[2026].c;
    return R(pl > 0.5 && novo > 0.5 && fora === 0, `PL 2026 ${pl.toFixed(2)} · Novo ${novo.toFixed(2)} · ${fora} fora da escala`, "PL e Novo acima de +0,5; nenhuma nota fora de −1 a +1");
  });
  teste("Dados", "Régua pelo voto concorda com a de Harvard", async () => {
    const BR = await V.baseBR(), c = BR.ideoV.calibracao;
    return R(c && c.r >= 0.9, "correlação de " + c.r.toFixed(2).replace(".", ",") + " em " + c.n + " partidos", "0,90 ou mais");
  });

  // PREENCHIMENTO: nenhum campo vazio, nenhuma área do mapa sem cor ou sem explicação, e a busca aguenta qualquer texto
  const ELEICOES_MAPA = () => Object.entries(V.ELEICOES_BR).map(([c, e]) => [c, e.prontos]);
  teste("Preenchimento", "Mapa: em todas as 61 eleições (7 cargos), toda cidade tem cor ou motivo", async () => {
    const BR = await V.baseBR(); await V.geoBR();
    const ids = BR.geo.mun.map((f) => f.id), ruins = [], semArq = []; let n = 0;
    for (const [cg, anos] of ELEICOES_MAPA()) for (const a of anos) {
      const w = await V.dados("br/venc/" + cg + a); n++;
      const conta = { venc: 0, indef: 0, semArq: 0, novo: 0, semPref: 0, x: 0 };
      for (const id of ids) { const k = V.porQueBR(id, a, cg, w[id]); conta[k in conta ? k : "x"]++; if (k === "venc" && w[id][8] === undefined) conta.x++; }
      if (conta.x) ruins.push(cg + a);
      if (conta.semArq) semArq.push(`${cg} ${a}: ${conta.semArq}`);
      if (conta.venc < ids.length * (a === 1994 ? 0.85 : 0.94)) ruins.push(`${cg}${a} só ${conta.venc} com vencedor`);
    }
    return R(ruins.length === 0 && n === 61, `${n} eleições, ${V.int(ids.length)} desenhos cada${ruins.length ? " · problema: " + ruins.join(", ") : ""}`, "toda cidade com vencedor, ou marcada como sem resultado oficial ou ainda não criada",
      semArq.length ? "Sem resultado no arquivo do TSE: " + semArq.join("; ") + "." : "");
  });
  const NOME_E = { PRES: "presidente", PREF: "prefeito", GOV: "governador", DF: "deputado federal", VER: "vereador" };
  for (const e of ["PRES1994", "PREF1996", "PREF2024", "GOV2022", "DF2022", "VER1996"]) {
    teste("Preenchimento", `Mapa de ${NOME_E[e.slice(0, -4)]} ${e.slice(-4)}: nenhuma cidade em branco, legenda fecha a conta`, async () => {
      await irPara(e === "PREF2024" ? "#/mapa" : "#/mapa/e/" + e); await ate(() => q("#apu-rever") && !q("#apu-rever").hidden, 8000); await quadros(2);
      const ps = qq("#mapa-br path.mun"), branco = ps.filter((p) => { const f = p.getAttribute("fill"); return !f || f === "none" || f === "#eceef1"; });
      const num = (id) => (q(id) && !q(id).closest("[hidden]") ? +q(id).textContent.replace(/\D/g, "") : 0);
      const comCor = ps.filter((p) => !/^url/.test(p.getAttribute("fill") || "")).length;
      const leg = num("#leg-indef") + num("#leg-novo");
      const semCor = ps.length - comCor;
      // a legenda conta as 5.570 cidades de hoje; quatro delas (criadas depois do desenho do mapa) não têm desenho próprio
      return R(branco.length === 0 && Math.abs(leg - semCor) <= 4, `${branco.length} em branco · ${V.int(comCor)} com cor · ${V.int(semCor)} hachuradas ou pontilhadas · legenda: ${V.int(leg)}`, "nenhuma em branco; legenda igual às marcadas (±4)");
    });
  }
  teste("Preenchimento", "Textos sem campo vazio em todas as páginas", async () => {
    const pags = ["#/", "#/mapa", "#/mapa/e/PRES1994", "#/mapa/e/PREF1996/br/MA", "#/mapa/e/DF2022", "#/mapa/e/DE2014/br/BA", "#/mapa/e/VER2024/br/PI/c/2211001", "#/mapa/v/abst", "#/mapa/v/bn", "#/mapa/v/vira", "#/revela", "#/perguntas", ...Array.from({ length: 12 }, (_, i) => "#/perguntas/q" + (i + 1)), "#/partidos"];
    const ruins = [], RUIM = /\b(undefined|NaN|null|Infinity)\b|\[object |R\$ ?NaN/;
    for (const h of pags) {
      await irPara(h); await quadros(2);
      const m = q("main"), t = m.innerText;
      if (RUIM.test(t)) ruins.push(h + ": “" + t.match(RUIM)[0] + "”");
      const vaz = qq("main h1, main h2, main h3, main th, main .pq-resp, main .manchete__titulo").filter((e) => !e.textContent.trim() && !e.closest("[hidden]"));
      if (vaz.length) ruins.push(h + ": " + vaz.length + " título(s) vazio(s)");
      if (m.dataset.erro) ruins.push(h + ": erro ao abrir");
    }
    return R(ruins.length === 0, ruins.length ? ruins.slice(0, 3).join(" · ") : `${pags.length} páginas, nenhum vazio`, "sem “undefined”, “NaN” ou título vazio");
  });
  teste("Preenchimento", "Tabelas das 12 perguntas sem célula vazia", async () => {
    const ruins = [];
    for (let i = 1; i <= 12; i++) {
      await irPara("#/perguntas/q" + i); await quadros(1);
      const vaz = qq("main td").filter((td) => !td.textContent.trim());
      if (vaz.length) ruins.push(`Q${i}: ${vaz.length}`);
    }
    return R(ruins.length === 0, ruins.length ? "células vazias em " + ruins.join(", ") : "nenhuma célula vazia", "toda célula com valor ou “—”");
  });
  teste("Preenchimento", "Uma cidade de cada estado: painel completo", async () => {
    const BR = await V.baseBR(), ruins = [], explicadas = [];
    const maior = Object.keys(V.UFN).filter((u) => u !== "DF").map((u) => BR.lista.filter((c) => c.uf === u).sort((a, b) => (b.pop || 0) - (a.pop || 0))[1] || BR.lista.find((c) => c.uf === u));
    for (const c of maior) {
      await irPara(`#/mapa/br/${c.uf}/c/${c.ibge}`); await ate(() => qq("#hist .linha-tempo").length >= 7, 8000).catch(() => {});
      const nome = txt(".urna__nome"), cands = qq("#cid-corpo .lista-cand li").length, cargos = qq("#hist .linha-tempo").length;
      // cidade sem resultado oficial em 2024: no lugar da urna, o painel explica o porquê
      const explica = txt("#cid-corpo .vazio").length > 40;
      if (explica && cargos >= 7) explicadas.push(c.nome + "/" + c.uf);
      else if (!nome || cands < 1 || cargos < 7) ruins.push(`${c.nome}/${c.uf} (urna ${nome ? "ok" : "vazia"}, ${cands} candidatos, ${cargos} cargos)`);
    }
    return R(ruins.length === 0, ruins.length ? ruins.slice(0, 3).join(" · ") : `${maior.length} cidades com urna, candidatos e histórico`, "urna, lista de candidatos e os sete cargos no histórico",
      explicadas.length ? "Sem resultado oficial em 2024, com a explicação no painel: " + explicadas.join(", ") + "." : "");
  });
  // a busca: o único campo de texto do site
  const buscar = async (texto, esperar = true) => {
    const inp = q("#busca"); inp.focus(); inp.value = texto; inp.dispatchEvent(new Event("input", { bubbles: true }));
    if (!esperar) { await new Promise((r) => setTimeout(r, 400)); return qq("#busca-lista li"); }
    await ate(() => !q("#busca-lista").hidden && qq("#busca-lista li").length, 8000).catch(() => {});
    await new Promise((r) => setTimeout(r, 350));   // o índice de candidatos chega depois das cidades
    return qq("#busca-lista li");
  };
  const limparBusca = () => { const inp = q("#busca"); inp.value = ""; inp.dispatchEvent(new Event("input", { bubbles: true })); inp.blur(); };
  teste("Preenchimento", "Busca: acentos, maiúsculas e espaços não atrapalham", async () => {
    await irPara("#/");
    const casos = [["SÃO PAULO", /São Paulo/], ["sao paulo", /São Paulo/], ["  teresina  ", /Teresina/], ["CuiaBá", /Cuiabá/], ["mojui", /Mojuí dos Campos/]];
    const ruins = [];
    for (const [t, re] of casos) { const li = await buscar(t); if (!li.some((l) => re.test(l.textContent))) ruins.push(`“${t.trim()}”`); }
    limparBusca();
    return R(ruins.length === 0, ruins.length ? "não achou: " + ruins.join(", ") : `${casos.length} buscas acharam a cidade`, "acha a cidade escrita de qualquer jeito");
  });
  teste("Preenchimento", "Busca: candidatos do Brasil inteiro", async () => {
    await irPara("#/");
    const casos = [["lula", /Lula/i, /Presidente/], ["silvio mendes", /Silvio Mendes/i, /Teresina/], ["tarcisio", /Tarc[ií]sio/i, /Governador|SP/]];
    const ruins = [];
    for (const [t, re, re2] of casos) { const li = await buscar(t); if (!li.some((l) => re.test(l.textContent) && re2.test(l.textContent))) ruins.push(`“${t}”`); }
    // e o resultado leva para o mapa daquela eleição
    const li = (await buscar("silvio mendes")).find((l) => /Teresina/.test(l.textContent));
    const pronto = new Promise((ok) => addEventListener("vav:pronto", function f() { removeEventListener("vav:pronto", f); ok(); }));
    if (li) { li.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true })); await pronto; await ate(() => /Teresina/.test(txt("#manchete")), 8000).catch(() => {}); }
    const foi = /Teresina/.test(txt("#manchete"));
    return R(ruins.length === 0 && foi, (ruins.length ? "não achou: " + ruins.join(", ") + " · " : `${casos.length} candidatos achados · `) + (foi ? "abriu Teresina" : "não abriu a cidade"), "acha presidente, prefeito e governador e abre o mapa da eleição");
  });
  teste("Preenchimento", "Busca: texto estranho não quebra nem injeta código", async () => {
    await irPara("#/");
    const antes = ERROS.length, ruins = [];
    const vazio = await buscar("zzqqxxkw");
    if (!vazio.some((l) => /Nada encontrado/.test(l.textContent))) ruins.push("sem aviso de “nada encontrado”");
    const um = await buscar("a", false); if (!q("#busca-lista").hidden && um.length) ruins.push("1 letra abriu a lista");
    await buscar('<img src=x onerror="window.__xss=1">');
    if (q("#busca-lista img") || window.__xss) ruins.push("o texto virou código");
    await buscar("%'; DROP TABLE municipio; --");
    await buscar("ã".repeat(300));
    limparBusca();
    if (ERROS.length > antes) ruins.push("erro de JavaScript: " + ERROS[antes].slice(0, 60));
    return R(ruins.length === 0, ruins.length ? ruins.join(" · ") : "5 textos estranhos, nenhum problema", "avisa que não achou; não executa código; nenhum erro");
  });
  teste("Preenchimento", "Busca pelo teclado: Enter abre o primeiro resultado", async () => {
    await irPara("#/");
    await buscar("campina grande");
    const pronto = new Promise((ok) => addEventListener("vav:pronto", function f() { removeEventListener("vav:pronto", f); ok(); }));
    q("#busca").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await pronto; await ate(() => /Campina Grande/.test(txt("#manchete")), 8000).catch(() => {});
    return R(/Campina Grande/.test(txt("#manchete")), txt("#manchete").slice(0, 60) + "…", "abre Campina Grande");
  });

  // por último: nada quebrou durante todos os testes acima
  teste("Funcionamento", "Nenhum erro de JavaScript durante os testes", async () => R(ERROS.length === 0, ERROS.length ? ERROS.length + ": " + ERROS[0].slice(0, 90) : "nenhum", "nenhum"));

  /* ---------- execução e relatório ---------- */
  const GRUPOS = ["Velocidade", "Funcionamento", "Preenchimento", "Acessibilidade", "Dados"];
  const ICONE = { ok: "✓", aviso: "!", falha: "✗" };
  let ultimo = null;

  function painel() {
    let p = document.getElementById("testes-painel");
    if (!p) { p = document.createElement("div"); p.id = "testes-painel"; p.className = "testes-painel"; p.setAttribute("role", "status"); p.setAttribute("aria-live", "polite"); document.body.appendChild(p); }
    return p;
  }

  async function rodar() {
    const memo = {};
    try { for (const k of ["vav-urna", "vav-apurou"]) { memo[k] = sessionStorage.getItem(k); sessionStorage.setItem(k, "1"); } } catch (e) {}   // sem animações de abertura
    const p = painel(), res = [], t0 = performance.now();
    for (let i = 0; i < T.length; i++) {
      const t = T[i];
      p.innerHTML = `<b>Testando ${i + 1} de ${T.length}</b><span>${V.esc(t.grupo)} · ${V.esc(t.nome)}</span><i style="width:${(100 * i) / T.length}%"></i>`;
      let r;
      try { r = await t.rodar(); } catch (e) { r = R(false, e.message, "—"); }
      res.push({ grupo: t.grupo, nome: t.nome, ...r });
    }
    try { for (const k in memo) if (memo[k] == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, memo[k]); } catch (e) {}
    p.remove();
    ultimo = { quando: new Date(), duracao: performance.now() - t0, largura: innerWidth, navegador: navigator.userAgent, res };
    window.__testes = { fim: true, ...ultimo };
    location.hash = "#/testes";
  }

  function relatorioTexto(u) {
    const l = [`Voto a voto · testes do site`, `${u.quando.toLocaleString("pt-BR")} · tela de ${u.largura}px · ${u.navegador}`, ""];
    for (const g of GRUPOS) { l.push(g.toUpperCase()); for (const r of u.res.filter((x) => x.grupo === g)) l.push(`  [${r.st === "ok" ? "OK" : r.st === "aviso" ? "AVISO" : "FALHOU"}] ${r.nome}: ${r.medido} (esperado: ${r.esperado})${r.nota ? " — " + r.nota : ""}`); l.push(""); }
    const c = contar(u.res); l.push(`${c.ok} passaram, ${c.aviso} com aviso, ${c.falha} falharam.`);
    return l.join("\n");
  }
  const contar = (res) => ({ ok: res.filter((r) => r.st === "ok").length, aviso: res.filter((r) => r.st === "aviso").length, falha: res.filter((r) => r.st === "falha").length });

  V.rota(/^\/testes(\/auto)?$/, async function (main, auto) {
    document.title = "Testes do site · Voto a voto";
    if (auto && !ultimo) { main.innerHTML = '<div class="pagina"><p>Rodando os testes…</p></div>'; setTimeout(rodar, 50); return; }
    const u = ultimo, c = u ? contar(u.res) : null;
    main.innerHTML = `<div class="pagina testes">
      <header><h1 class="titulo-grande">${u ? (c.falha ? `${c.falha} ${c.falha === 1 ? "teste falhou" : "testes falharam"} de ${u.res.length}` : `Os ${u.res.length} testes passaram${c.aviso ? `, ${c.aviso} com aviso` : ""}`) : "Testes do site"}</h1>
        <p class="lead">${u ? `Rodados agora neste navegador, numa tela de ${u.largura} px, em ${V.int(Math.round(u.duracao / 1000))} segundos.` : `${T.length} testes em cinco grupos: velocidade, funcionamento, preenchimento, acessibilidade e conferência dos dados com os números oficiais do TSE. Eles abrem as páginas sozinhos; leva cerca de dois minutos. Para testar o celular, abra esta página numa janela estreita ou no próprio celular.`}</p>
        <p class="testes__acoes"><button type="button" class="btn btn--confirma" id="testes-rodar">${u ? "Rodar de novo" : "Rodar os testes"}</button>${u ? ' <button type="button" class="btn" id="testes-baixar">Baixar relatório (.txt)</button>' : ""}</p></header>
      ${u ? GRUPOS.map((g) => { const rs = u.res.filter((r) => r.grupo === g), cc = contar(rs); return `<section class="testes__grupo"><h2 class="secao__titulo">${g} <small>${cc.ok} de ${rs.length}</small></h2>
        <table class="testes__tabela"><thead><tr><th scope="col"><span class="visualmente-oculto">Resultado</span></th><th scope="col">Teste</th><th scope="col">Medido</th><th scope="col">Esperado</th></tr></thead><tbody>
        ${rs.map((r) => `<tr class="t--${r.st}"><td><span class="testes__st" aria-label="${r.st === "ok" ? "passou" : r.st === "aviso" ? "aviso" : "falhou"}">${ICONE[r.st]}</span></td><td>${V.esc(r.nome)}${r.nota ? `<small>${V.esc(r.nota)}</small>` : ""}</td><td>${V.esc(r.medido)}</td><td>${V.esc(r.esperado)}</td></tr>`).join("")}</tbody></table></section>`; }).join("") : ""}
    </div>`;
    q("#testes-rodar").onclick = rodar;
    if (q("#testes-baixar")) q("#testes-baixar").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([relatorioTexto(u)], { type: "text/plain;charset=utf-8" })); a.download = "testes-voto-a-voto.txt"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  });
  V.testes = { rodar, lista: T };
})();
