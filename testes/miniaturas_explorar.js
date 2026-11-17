/* Miniaturas reais dos cartões da página Explorar: abre cada visualização no Edge sem janela (1280 x 792: o menu de 72 px + 720) e salva a tela em PNG.
   Depois, scripts/miniaturas_explorar.py reduz para WebP de 640 x 360 em img/explorar/.
   Uso: node testes/miniaturas_explorar.js [endereço do site] [pasta de saída]   (Node 22 ou mais: WebSocket embutido) */
const { spawn } = require("child_process"); const fs = require("fs"), path = require("path"), os = require("os");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", PORTA = 9778;
const BASE = process.argv[2] || "http://localhost:8766/", DIR = process.argv[3] || "miniaturas";
// [nome, rota, espera em ms, código para rodar antes da captura]
const VISTAS = [
  ["3d", "#/3d", 9000, ""],
  ["tempo", "#/tempo", 6000, ""],
  ["multidao", "#/multidao", 9000, ""],
  ["patrimonio", "#/patrimonio", 7000, ""],
  ["formularios", "#/formularios", 3500, ""],
];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "vav-min-"));
  const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`, "--no-first-run", "--hide-scrollbars", "--enable-unsafe-swiftshader", "about:blank"], { stdio: "ignore" });
  let alvo; for (let i = 0; i < 60 && !alvo; i++) { await espera(500); try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find((t) => t.type === "page"); } catch (e) {} }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl); await new Promise((ok) => ws.addEventListener("open", ok));
  let id = 0; const pend = new Map(); ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  const C = (method, params = {}) => new Promise((ok) => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
  await C("Emulation.setDeviceMetricsOverride", { width: 1280, height: 792, deviceScaleFactor: 1, mobile: false });
  await C("Page.navigate", { url: BASE + "?min=" + Date.now() + "#/explorar" }); await espera(3000);
  for (const [nome, rota, ms, antes] of VISTAS) {
    await C("Runtime.evaluate", { expression: `location.hash = ${JSON.stringify(rota)}` });
    await espera(antes ? 3000 : ms);
    if (antes) { await C("Runtime.evaluate", { expression: antes }); await espera(ms); }
    await C("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" }); await espera(300);
    const shot = await C("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(DIR, nome + ".png"), Buffer.from(shot.result.data, "base64"));
    console.log(nome);
  }
  ws.close(); edge.kill();
})();
