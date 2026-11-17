/* Procura o que quebra no layout, página por página e largura por largura (Edge sem janela):
   - a página mais larga que a tela (rolagem para o lado);
   - elementos que vazam para fora da tela (fora de áreas que rolam de propósito);
   - rótulos curtos (botões, chips, links do menu, selos, números) que quebram em duas linhas;
   - texto cortado (maior que a caixa, sem reticências de propósito).
   Uso: node testes/auditar_quebras.js [endereço do site] [arquivo de saída .json] */
const { spawn } = require("child_process"); const fs = require("fs"), path = require("path"), os = require("os");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", PORTA = 9780;
const BASE = process.argv[2] || "http://localhost:8766/", SAIDA = process.argv[3] || "quebras.json";
const LARGURAS = [360, 390, 600, 768, 1024, 1280, 1920];
const ROTAS = ["#/", "#/mapa", "#/mapa/br/PI/c/2211001", "#/mapa/e/PRES2022", "#/revela", "#/perguntas", "#/perguntas/t1", "#/perguntas/t9", "#/perguntas/t13",
  "#/partidos", "#/politicos", "#/politico/1713641", "#/politico/437785", "#/explorar", "#/formularios", "#/formularios/relatorios"];
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const INSPECAO = `(() => {
  const W = innerWidth, out = [];
  const nome = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id; const c = typeof el.className === "string" ? el.className.trim().split(/\\s+/).filter(Boolean).slice(0, 2) : []; if (c.length) s += "." + c.join("."); const p = el.parentElement; return (p && p.className && typeof p.className === "string" ? p.className.split(" ")[0] + " > " : "") + s; };
  const visivel = (el) => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); return cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden], details:not([open]) > :not(summary), .visualmente-oculto, .vis-tour, .dica"); };
  const rola = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
  // 1. página mais larga que a tela
  if (document.documentElement.scrollWidth > W + 1) out.push({ tipo: "página mais larga que a tela", el: "html", txt: document.documentElement.scrollWidth + " px" });
  const todos = [...document.querySelectorAll("main *, .topo *")];
  // 2. vaza para fora da tela
  for (const el of todos) { if (!visivel(el) || el.closest("svg") && el.tagName !== "svg") continue; const r = el.getBoundingClientRect(); if (r.right > W + 1 && !rola(el) && getComputedStyle(el).position !== "fixed") out.push({ tipo: "vaza para fora da tela", el: nome(el), txt: (el.textContent || "").trim().slice(0, 50) + " (" + Math.round(r.right - W) + " px)" }); }
  // 3. rótulos curtos que quebram em duas linhas
  for (const el of document.querySelectorAll(".nav a, button, .chip, .btn, .selo, .tecla, .kpis b, .pq-selo, summary, label, th, .camadas__op, .tempo__ano, .pol-hist__ano, .pq-assunto__tit, .ranking__cab span, .placar b, .lado__titulo, .vis-card__tit")) {
    if (!visivel(el) || el.querySelector("input, select, textarea")) continue; const t = el.textContent.replace(/\\s+/g, " ").trim(); if (!t || t.length > 24) continue;
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), rects = []; for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (!n.textContent.trim() || n.parentElement.closest(".visualmente-oculto")) continue; const r = document.createRange(); r.selectNodeContents(n); rects.push(...r.getClientRects()); }
    const tops = new Set(rects.filter((x) => x.width > 1).map((x) => Math.round(x.top / 4)));
    if (tops.size > 1) out.push({ tipo: "rótulo curto quebrou", el: nome(el), txt: t });
  }
  // 3b. número ou rótulo que passa da borda do próprio cartão (texto que não quebra, mas não cabe)
  for (const el of document.querySelectorAll(".kpis b, .chip, .btn, .selo, .camadas__op")) {
    if (!visivel(el)) continue; const caixa = el.closest("li, .kpis li, .filtros, .painel, .pq-parte, .cartao") || el.parentElement;
    const r = el.getBoundingClientRect(), c = caixa.getBoundingClientRect();
    if (r.right > c.right + 1 && !rola(el)) out.push({ tipo: "passa da borda do cartão", el: nome(el), txt: el.textContent.trim().slice(0, 40) + " (" + Math.round(r.right - c.right) + " px)" });
  }
  // 4. texto cortado
  for (const el of todos) { if (!visivel(el) || el.children.length || !el.textContent.trim()) continue; const cs = getComputedStyle(el); if (cs.textOverflow === "ellipsis") continue;
    if (/(hidden|clip)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2) out.push({ tipo: "texto cortado", el: nome(el), txt: el.textContent.trim().slice(0, 50) }); }
  return out;
})()`;
(async () => {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "vav-quebra-"));
  const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
  let alvo; for (let i = 0; i < 60 && !alvo; i++) { await espera(500); try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA}/json`)).json()).find((t) => t.type === "page"); } catch (e) {} }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl); await new Promise((ok) => ws.addEventListener("open", ok));
  let id = 0; const pend = new Map(); ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  const C = (method, params = {}) => new Promise((ok) => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
  const achados = {};
  for (const w of LARGURAS) {
    await C("Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 721 });
    await C("Page.navigate", { url: BASE + "?q=" + Date.now() + "#/explorar" }); await espera(2500);
    for (const r of ROTAS) {
      await C("Runtime.evaluate", { expression: `location.hash = ${JSON.stringify(r)}` });
      await espera(r.includes("mapa") || r.includes("politico/") ? 4000 : 2200);
      const res = await C("Runtime.evaluate", { returnByValue: true, expression: INSPECAO });
      for (const a of (res.result.result.value || [])) { const k = `${r} | ${a.tipo} | ${a.el} | ${a.txt}`; (achados[k] = achados[k] || []).push(w); }
    }
    console.log("largura", w, "feita");
  }
  fs.writeFileSync(SAIDA, JSON.stringify(achados, null, 1));
  console.log(Object.keys(achados).length, "achados");
  ws.close(); edge.kill();
})();
