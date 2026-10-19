/* Roda os testes do site (js/testes.js) automaticamente, no computador e numa tela de celular ao mesmo tempo.
   Precisa de Node.js e do Playwright:   npm install playwright   (e   npx playwright install chromium   na primeira vez)
   Uso:   node testes/rodar_testes.js          → imprime o relatório e sai com código 1 se algum teste falhar
   Os mesmos testes rodam sem instalar nada abrindo testes.html no navegador. */
const path = require("path");
const { chromium } = require("playwright");
const URL = "file://" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/") + "#/testes/auto";
const TELAS = [["computador", { viewport: { width: 1280, height: 900 } }], ["celular", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]];

(async () => {
  const t0 = Date.now(), nav = await chromium.launch();
  // uma tela de cada vez: rodando as duas juntas, elas disputam o processador e os testes de velocidade erram para pior
  const rodadas = [];
  for (const [nome, op] of TELAS) rodadas.push(await (async () => {
    const ctx = await nav.newContext(op), p = await ctx.newPage();
    await p.goto(URL);
    await p.waitForFunction(() => window.__testes && window.__testes.fim, null, { timeout: 420000, polling: 250 });
    const res = await p.evaluate(() => window.__testes.res);
    // ordem do Tab (só dá para testar com teclado de verdade, fora da página)
    // página carregada do zero, para o Tab começar do topo (e não de onde o último teste deixou o foco)
    await p.goto("about:blank"); await p.goto(URL.replace("#/testes/auto", "#/")); await p.waitForTimeout(800);
    const ordem = []; for (let i = 0; i < 4; i++) { await p.keyboard.press("Tab"); ordem.push(await p.evaluate(() => { const e = document.activeElement; return (e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 24); })); }
    res.push({ grupo: "Acessibilidade", nome: "Tab começa pelo atalho “Pular para o conteúdo”", st: /Pular/.test(ordem[0]) ? "ok" : "falha", medido: ordem.join(" → "), esperado: "Pular para o conteúdo primeiro" });
    await ctx.close();
    return [nome, res];
  })());
  await nav.close();
  let falhas = 0;
  for (const [nome, res] of rodadas) {
    console.log(`\n=== ${nome.toUpperCase()} ===`);
    let g = "";
    for (const r of res) {
      if (r.grupo !== g) { g = r.grupo; console.log("\n" + g); }
      if (r.st === "falha") falhas++;
      console.log(`  ${r.st === "ok" ? "✓" : r.st === "aviso" ? "!" : "✗"} ${r.nome}: ${r.medido}${r.st !== "ok" ? "  (esperado: " + r.esperado + ")" : ""}`);
    }
  }
  console.log(`\n${falhas ? falhas + " falha(s)" : "Tudo certo"} · ${((Date.now() - t0) / 1000).toFixed(0)} s no total`);
  process.exit(falhas ? 1 : 0);
})();
