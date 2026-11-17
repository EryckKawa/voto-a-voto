/* Roda os testes do site (js/testes.js) no Microsoft Edge sem janela, sem instalar nada além do Node.js (18 ou mais):
   abre o Edge com a porta de depuração, controla a página pelo protocolo do DevTools e lê o resultado.
   Faz duas rodadas, uma em tela de computador (1280 × 900) e outra de celular (390 × 844).
   Uso:   node testes/rodar_testes_edge.js [endereço do site]
          (sem endereço, abre o index.html direto do disco)
   Sai com código 1 se algum teste falhar. Equivale a testes/rodar_testes.js, que usa o Playwright. */
const { spawn } = require("child_process");
const path = require("path"), fs = require("fs"), os = require("os");

const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe", "/usr/bin/microsoft-edge", "/usr/bin/google-chrome"].find((p) => fs.existsSync(p));
const BASE = process.argv[2] || "file:///" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");
const PORTA = 9300 + Math.floor(Math.random() * 500);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdp(ws) {
  let id = 0; const pend = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  return (method, params = {}) => new Promise((ok) => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
}

async function rodada(nome, tela) {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "vav-edge-"));
  const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`, "--no-first-run", "--disable-gpu", `--window-size=${tela.w},${tela.h}`, "about:blank"], { stdio: "ignore" });
  try {
    let alvo = null;
    for (let i = 0; i < 60 && !alvo; i++) { await espera(500); try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find((t) => t.type === "page"); } catch (e) {} }
    if (!alvo) throw new Error("o Edge não abriu");
    const ws = new WebSocket(alvo.webSocketDebuggerUrl); await new Promise((ok) => ws.addEventListener("open", ok));
    const C = await cdp(ws);
    await C("Emulation.setDeviceMetricsOverride", { width: tela.w, height: tela.h, deviceScaleFactor: tela.m ? 2 : 1, mobile: !!tela.m });
    if (tela.m) await C("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await C("Page.navigate", { url: BASE + "#/testes/auto" });
    const t0 = Date.now(); let res = null;
    while (Date.now() - t0 < 600000) {
      await espera(2000);
      const r = await C("Runtime.evaluate", { expression: "window.__testes && window.__testes.fim ? JSON.stringify(window.__testes.res) : ''", returnByValue: true });
      if (process.env.VAV_DEBUG) { const d = await C("Runtime.evaluate", { expression: "location.href + ' | ' + ((document.getElementById('testes-painel') || {}).innerText || '').slice(0, 80)", returnByValue: true }); console.error(nome, Math.round((Date.now() - t0) / 1000) + "s", JSON.stringify(d.result).slice(0, 220)); }
      if (r.result && r.result.result && r.result.result.value) { res = JSON.parse(r.result.result.value); break; }
    }
    ws.close();
    if (!res) throw new Error("os testes não terminaram em 10 minutos");
    return [nome, res];
  } finally { edge.kill(); await espera(800); try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (e) {} }
}

(async () => {
  if (!EDGE) { console.error("Não achei o Microsoft Edge (nem o Chrome)."); process.exit(2); }
  const t0 = Date.now(), rodadas = [];
  rodadas.push(await rodada("computador", { w: 1280, h: 900 }));
  rodadas.push(await rodada("celular", { w: 390, h: 844, m: true }));
  let falhas = 0, total = 0;
  for (const [nome, res] of rodadas) {
    console.log(`\n=== ${nome.toUpperCase()} ===`);
    let g = "";
    for (const r of res) {
      total++;
      if (r.grupo !== g) { g = r.grupo; console.log("\n" + g); }
      if (r.st === "falha") falhas++;
      console.log(`  ${r.st === "ok" ? "✓" : r.st === "aviso" ? "!" : "✗"} ${r.nome}: ${r.medido}${r.st !== "ok" ? "  (esperado: " + r.esperado + ")" : ""}`);
    }
  }
  console.log(`\n${falhas ? falhas + " falha(s)" : "Tudo certo"} em ${total} testes · ${((Date.now() - t0) / 1000).toFixed(0)} s no total`);
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
