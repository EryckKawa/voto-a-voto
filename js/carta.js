/* Voto a voto — a carta do político: a ficha resumida numa carta colecionável, desenhada em <canvas>
   (a mesma imagem que se baixa), com inclinação 3D que segue o mouse e verso com a trajetória de partidos.
   Aberta pelo botão "Ver como carta" da ficha (js/politico.js). */
(function () {
  "use strict";
  const V = window.V;
  const CW = 600, CH = 840;
  const estrelas = (v) => (v >= 1e6 ? 5 : v >= 1e5 ? 4 : v >= 1e4 ? 3 : v >= 1e3 ? 2 : 1);
  const notaTxt = (n) => (n == null ? "sem nota" : (n > 0.005 ? "+" : n < -0.005 ? "−" : "") + Math.abs(n).toFixed(2).replace(".", ","));

  function caixaRedonda(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // texto que encolhe até caber na largura
  function caber(ctx, txt, x, y, larg, tam, peso, fonte) {
    let t = tam; do { ctx.font = `${peso} ${t}px ${fonte}`; t -= 2; } while (ctx.measureText(txt).width > larg && t > 14);
    ctx.fillText(txt, x, y);
  }
  const NUM = '"Barlow Condensed", "Arial Narrow", sans-serif', TXT = '"Atkinson Hyperlegible", system-ui, sans-serif';

  async function frente(d) {
    const cv = document.createElement("canvas"); cv.width = CW; cv.height = CH;
    const ctx = cv.getContext("2d"), corLado = d3.color(V.corNota(d.nota)), escuro = corLado.darker(1.6).formatHex(), claro = corLado.brighter(0.4).formatHex();
    // moldura e fundo na cor do lado do partido
    caixaRedonda(ctx, 0, 0, CW, CH, 34); ctx.fillStyle = "#16181d"; ctx.fill();
    const fundo = ctx.createLinearGradient(0, 0, CW, CH); fundo.addColorStop(0, claro); fundo.addColorStop(1, escuro);
    caixaRedonda(ctx, 16, 16, CW - 32, CH - 32, 24); ctx.fillStyle = fundo; ctx.fill();
    // faixas diagonais discretas
    ctx.save(); caixaRedonda(ctx, 16, 16, CW - 32, CH - 32, 24); ctx.clip(); ctx.globalAlpha = 0.08; ctx.fillStyle = "#fff";
    for (let k = -CH; k < CW; k += 46) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + 18, 0); ctx.lineTo(k + 18 + CH * 0.6, CH); ctx.lineTo(k + CH * 0.6, CH); ctx.fill(); }
    ctx.restore();
    // cabeçalho
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.font = `700 22px ${NUM}`; ctx.textBaseline = "alphabetic"; ctx.fillText("VOTO A VOTO", 44, 62);
    ctx.textAlign = "right"; ctx.font = `700 26px ${NUM}`; ctx.fillText("★".repeat(estrelas(d.votos)) + "☆".repeat(5 - estrelas(d.votos)), CW - 44, 64); ctx.textAlign = "left";
    // foto (ou as iniciais)
    const fx = 44, fy = 84, fw = CW - 88, fh = 380;
    ctx.save(); caixaRedonda(ctx, fx, fy, fw, fh, 16); ctx.clip();
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(fx, fy, fw, fh);
    let temFoto = false;
    if (d.foto) {
      try {
        const img = new Image(); img.src = d.foto; await img.decode();
        const e = Math.max(fw / img.naturalWidth, fh / img.naturalHeight), w = img.naturalWidth * e, h = img.naturalHeight * e;
        ctx.drawImage(img, fx + (fw - w) / 2, fy + Math.min(0, (fh - h) * 0.25), w, h); temFoto = true;
      } catch (e) {}
    }
    if (!temFoto) { ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = `700 170px ${NUM}`; ctx.textAlign = "center"; ctx.fillText(d.iniciais, CW / 2, fy + fh / 2 + 60); ctx.textAlign = "left"; }
    const sombra = ctx.createLinearGradient(0, fy + fh - 150, 0, fy + fh); sombra.addColorStop(0, "rgba(0,0,0,0)"); sombra.addColorStop(1, "rgba(0,0,0,.7)");
    ctx.fillStyle = sombra; ctx.fillRect(fx, fy + fh - 150, fw, 150);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 3; caixaRedonda(ctx, fx, fy, fw, fh, 16); ctx.stroke();
    // nome sobre a foto
    ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 8;
    caber(ctx, (d.urna || d.nome).toUpperCase(), fx + 20, fy + fh - 52, fw - 40, 58, 700, NUM);
    ctx.font = `400 21px ${TXT}`; ctx.fillText(`${d.cargo} ${d.ano}${d.situacao && d.situacao !== "Sem resultado" ? " · " + d.situacao : ""}`, fx + 20, fy + fh - 20);
    ctx.shadowBlur = 0;
    // partido
    ctx.font = `700 26px ${NUM}`; const sg = V.nomePartido(d.partido), lw = ctx.measureText(sg).width + 30;
    caixaRedonda(ctx, CW - 44 - lw, fy + 16, lw, 40, 20); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.fillStyle = "#16181d"; ctx.fillText(sg, CW - 44 - lw + 15, fy + 45);
    // atributos
    const attrs = [["Maior votação", V.int(d.votos), d.cargoMaior], ["Vitórias", V.int(d.vitorias), `em ${d.eleicoes} ${d.eleicoes === 1 ? "eleição" : "eleições"}`],
      ["Lado do partido", notaTxt(d.nota), V.nome5(d.nota)], ["Bens declarados", d.bens ? V.brl(d.bens[0]).replace(/ /g, " ") : "—", d.bens ? `em ${d.bens[1]}` : "não declarou"]];
    attrs.forEach(([rot, val, sub], k) => {
      const x = 44 + (k % 2) * ((CW - 88) / 2 + 8), y = 492 + Math.floor(k / 2) * 132, w = (CW - 88) / 2 - 8;
      caixaRedonda(ctx, x, y, w, 118, 14); ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fill();
      ctx.fillStyle = "#444b56"; ctx.font = `700 18px ${TXT}`; ctx.fillText(rot.toUpperCase(), x + 16, y + 30);
      ctx.fillStyle = "#16181d"; caber(ctx, val, x + 16, y + 78, w - 32, 50, 700, NUM);
      ctx.fillStyle = "#5f6672"; ctx.font = `400 17px ${TXT}`; caber(ctx, sub, x + 16, y + 104, w - 32, 17, 400, TXT);
    });
    ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.font = `400 16px ${TXT}`; ctx.fillText(`Dados: TSE · ${d.periodo} · Trabalho de BDR, UFPI, Grupo 6`, 44, CH - 42);
    return cv;
  }

  function verso(d) {
    const cv = document.createElement("canvas"); cv.width = CW; cv.height = CH;
    const ctx = cv.getContext("2d");
    caixaRedonda(ctx, 0, 0, CW, CH, 34); ctx.fillStyle = "#16181d"; ctx.fill();
    caixaRedonda(ctx, 16, 16, CW - 32, CH - 32, 24); ctx.fillStyle = "#2b2d31"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = `700 46px ${NUM}`; ctx.fillText("TRAJETÓRIA", 44, 92);
    ctx.font = `400 20px ${TXT}`; ctx.fillStyle = "#c9ccd1"; caber(ctx, d.nome, 44, 126, CW - 88, 20, 400, TXT);
    // régua de −1 a +1 com cada partido
    const rx = 64, rw = CW - 128, ry = 186, px = (n) => rx + ((n + 1) / 2) * rw;
    const grad = ctx.createLinearGradient(rx, 0, rx + rw, 0); [-1, -0.5, 0, 0.5, 1].forEach((n, k) => grad.addColorStop(k / 4, V.corNota(n)));
    caixaRedonda(ctx, rx, ry, rw, 16, 8); ctx.fillStyle = grad; ctx.fill();
    ctx.font = `400 16px ${TXT}`; ctx.fillStyle = "#c9ccd1"; ctx.fillText("esquerda", rx, ry + 44); ctx.textAlign = "right"; ctx.fillText("direita", rx + rw, ry + 44); ctx.textAlign = "left";
    d.trajeto.filter((t) => t[3] != null).forEach((t) => { ctx.beginPath(); ctx.arc(px(t[3]), ry + 8, 11, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = V.corNota(t[3]); ctx.stroke(); });
    // lista de partidos
    const lista = d.trajeto.slice(-9);
    lista.forEach((t, k) => {
      const y = 290 + k * 54;
      caixaRedonda(ctx, 44, y, 14, 40, 4); ctx.fillStyle = V.corNota(t[3]); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `700 32px ${NUM}`; ctx.fillText(V.nomePartido(t[0]), 74, y + 31);
      ctx.fillStyle = "#c9ccd1"; ctx.font = `400 19px ${TXT}`; ctx.textAlign = "right"; ctx.fillText(t[1] === t[2] ? String(t[1]) : `${t[1]}–${t[2]}`, CW - 44, y + 28); ctx.textAlign = "left";
      if (k < lista.length - 1) { ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(51, y + 42); ctx.lineTo(51, y + 54); ctx.stroke(); }
    });
    let yEl = 290 + lista.length * 54 + (d.trajeto.length > lista.length ? 40 : 18);
    if (d.eleicoes_lista && yEl < CH - 140) {
      ctx.fillStyle = "#fff"; ctx.font = `700 30px ${NUM}`; ctx.fillText("ELEIÇÕES", 44, yEl + 10); yEl += 24;
      const caben = Math.floor((CH - 80 - yEl) / 34), els = d.eleicoes_lista.slice(-caben).reverse();
      els.forEach(([a, cg, sit], k) => { const y = yEl + 26 + k * 34; ctx.fillStyle = sit === "Eleito" ? "#7fd6a1" : "#c9ccd1"; ctx.font = `700 22px ${NUM}`; ctx.fillText(String(a), 44, y); ctx.font = `400 18px ${TXT}`; ctx.fillStyle = "#fff"; ctx.fillText(cg, 104, y); ctx.textAlign = "right"; ctx.fillStyle = sit === "Eleito" ? "#7fd6a1" : "#c9ccd1"; ctx.fillText(sit, CW - 44, y); ctx.textAlign = "left"; });
    }
    if (d.trajeto.length > lista.length) { ctx.fillStyle = "#c9ccd1"; ctx.font = `400 17px ${TXT}`; ctx.fillText(`e mais ${d.trajeto.length - lista.length} partidos antes`, 44, 290 + lista.length * 54 + 14); }
    ctx.fillStyle = "#8b929c"; ctx.font = `400 16px ${TXT}`; ctx.fillText("A nota é do partido em cada eleição, pela régua do site.", 44, CH - 42);
    return cv;
  }

  V.abrirCarta = async (d, origem) => {
    await Promise.all([document.fonts.load(`700 40px ${NUM}`), document.fonts.load(`400 20px ${TXT}`), document.fonts.load(`700 20px ${TXT}`)]).catch(() => {});
    const [f, v] = await Promise.all([frente(d), verso(d)]);
    const fundo = document.createElement("div");
    fundo.className = "vis-carta"; fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true"); fundo.setAttribute("aria-label", `Carta de ${d.nome}`);
    fundo.innerHTML = `<div class="vis-carta__cena"><div class="vis-carta__giro"><div class="vis-carta__face"></div><div class="vis-carta__face vis-carta__face--verso"></div><i class="vis-carta__brilho"></i></div></div>
      <div class="vis-carta__acoes"><button type="button" class="btn" data-c="virar">↻ Virar</button><button type="button" class="btn btn--confirma" data-c="baixar">Baixar imagem</button><button type="button" class="btn" data-c="fechar">Fechar</button></div>`;
    f.setAttribute("role", "img"); f.setAttribute("aria-label", `Carta de ${d.nome}: maior votação ${V.int(d.votos)}, ${d.vitorias} vitórias, partido ${d.partido}`);
    v.setAttribute("role", "img"); v.setAttribute("aria-label", `Verso: partidos de ${d.nome}: ${d.trajeto.map((t) => t[0]).join(", ")}`);
    fundo.querySelector(".vis-carta__face").append(f); fundo.querySelector(".vis-carta__face--verso").append(v);
    document.body.append(fundo);
    const giro = fundo.querySelector(".vis-carta__giro"), brilho = fundo.querySelector(".vis-carta__brilho");
    let virada = false, rx = 0, ry = 0;
    const aplicar = () => { giro.style.transform = `rotateX(${rx}deg) rotateY(${ry + (virada ? 180 : 0)}deg)`; };
    const fechar = () => { fundo.remove(); removeEventListener("keydown", tecla); removeEventListener("hashchange", fechar); if (origem && origem.isConnected) origem.focus(); };
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    addEventListener("keydown", tecla); addEventListener("hashchange", fechar);
    fundo.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]");
      if (e.target === fundo || (b && b.dataset.c === "fechar")) fechar();
      else if (b && b.dataset.c === "virar") { virada = !virada; aplicar(); }
      else if (b && b.dataset.c === "baixar") {
        try { f.toBlob((blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `carta-${V.norm(d.urna || d.nome).replace(/[^a-z0-9]+/g, "-")}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }, "image/png"); }
        catch (err) { b.textContent = "Baixar só funciona pelo site publicado"; }
      }
    });
    // inclinação que segue o ponteiro, com um reflexo de luz
    const cena = fundo.querySelector(".vis-carta__cena");
    if (!V.semMovimento()) {
      cena.addEventListener("pointermove", (e) => {
        const r = cena.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry = (px - 0.5) * 24; rx = (0.5 - py) * 18; aplicar();
        brilho.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,.38), rgba(255,255,255,0) 55%)`;
      });
      cena.addEventListener("pointerleave", () => { rx = ry = 0; aplicar(); brilho.style.background = ""; });
    }
    cena.addEventListener("click", () => { virada = !virada; aplicar(); });
    requestAnimationFrame(() => fundo.classList.add("vis-carta--aberta"));
    fundo.querySelector("[data-c='fechar']").focus();
  };
})();
