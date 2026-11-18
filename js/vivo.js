/* Voto a voto — peças que deixam o número "vivo": a cor de cada bloco, o "você chuta, o dado responde",
   o número em tamanho real (de cada 100, quantas vezes) e o cartão para compartilhar a resposta.
   Usadas pelas páginas das perguntas (js/perguntas.js) e pelo mapa das respostas (js/lobby.js). */
(function () {
  "use strict";
  const V = window.V;
  const N0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }), N1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), N2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* a cor de cada bloco de assunto: a "assinatura" no topo dos cartões e na marca de cada pergunta (não usa vermelho nem azul, que são dos lados políticos) */
  V.COR_BLOCO = { "Dinheiro": "#9c5d16", "Perfil": "#7a3e9d", "Território": "#2f7d5b", "Voto": "#16181d", "Partidos": "#5f6670" };
  V.corBloco = (g) => V.COR_BLOCO[g] || "#16181d";

  /* formatos do chute e dos números em tamanho real */
  V.fmtVivo = (fmt, v) => v == null || isNaN(v) ? "—"
    : fmt === "centavos" ? "R$ " + N2.format(v)
    : fmt === "pct" ? N1.format(v).replace(/,0$/, "") + "%"
    : fmt === "milhoes" ? "R$ " + N1.format(v).replace(/,0$/, "") + " milhões"
    : N0.format(v);

  /* ---------- você chuta, o dado responde ---------- */
  // o leitor arrasta a barra com o que acha; ao confirmar, aparece o número de verdade e a diferença (Kim, Reinecke e Hullman, CHI 2017)
  V.chuteHTML = (c, id) => {
    const meio = Math.round(((c.min || 0) + c.max) / 2 / (c.passo || 1)) * (c.passo || 1);
    return `<form class="chute" data-chute="${V.esc(id)}" data-real="${c.real}" data-fmt="${c.fmt}" data-max="${c.max}" data-min="${c.min || 0}">
      <p class="chute__tit">Antes de ver a resposta: quanto você acha?</p>
      <label class="chute__q" for="chute-${V.esc(id)}">${c.q}</label>
      <div class="chute__linha"><input id="chute-${V.esc(id)}" type="range" min="${c.min || 0}" max="${c.max}" step="${c.passo || 1}" value="${meio}">
        <output for="chute-${V.esc(id)}" class="chute__val">${V.fmtVivo(c.fmt, meio)}</output></div>
      <div class="chute__bts"><button type="submit" class="btn btn--forte">Ver a resposta</button><button type="button" class="btn" data-chute-pular>Pular</button></div>
      <div class="chute__res" aria-live="polite" hidden></div>
    </form>`;
  };
  function revelar(f, chutou) {
    const real = +f.dataset.real, fmt = f.dataset.fmt, max = +f.dataset.max, min = +f.dataset.min;
    const res = f.querySelector(".chute__res"), alvo = f.closest(".chute-bloco") || f.parentElement;
    if (chutou != null) {
      const p = (v) => Math.max(0, Math.min(100, (100 * (v - min)) / (max - min)));
      const dif = Math.abs(chutou - real) / Math.max(Math.abs(real), 1e-9);
      const frase = dif < 0.15 ? "Na mosca: você chegou bem perto." : chutou > real ? "Você chutou alto: o número de verdade é menor." : "Você chutou baixo: o número de verdade é maior.";
      res.innerHTML = `<p class="chute__frase"><b>${frase}</b></p>
        <div class="chute__regua" role="img" aria-label="Você chutou ${V.fmtVivo(fmt, chutou)}; o dado é ${V.fmtVivo(fmt, real)}">
          <span class="chute__marca chute__marca--voce" style="left:${p(chutou)}%"><small>você</small><b>${V.fmtVivo(fmt, chutou)}</b></span>
          <span class="chute__marca chute__marca--real" style="left:${p(real)}%"><small>o dado</small><b>${V.fmtVivo(fmt, real)}</b></span></div>`;
      res.hidden = false;
      f.querySelector(".chute__linha").hidden = true; f.querySelector(".chute__bts").hidden = true;
    } else f.hidden = true;
    alvo.querySelectorAll("[data-depois-do-chute]").forEach((x) => { x.hidden = false; });
    try { const k = "vav-chutes", s = JSON.parse(localStorage.getItem(k) || "{}"); s[f.dataset.chute] = chutou; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {}
    f.dispatchEvent(new CustomEvent("chute-revelado", { bubbles: true, detail: { chutou } }));
  }
  /* quem já chutou nesta pergunta não precisa chutar de novo */
  V.jaChutou = (id) => { try { return id in JSON.parse(localStorage.getItem("vav-chutes") || "{}"); } catch (e) { return false; } };
  document.addEventListener("input", (e) => { const f = e.target.closest("form.chute"); if (f && e.target.type === "range") f.querySelector("output").textContent = V.fmtVivo(f.dataset.fmt, +e.target.value); });
  document.addEventListener("submit", (e) => { const f = e.target.closest("form.chute"); if (!f) return; e.preventDefault(); revelar(f, +f.querySelector("input").value); });
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-chute-pular]"); if (b) revelar(b.closest("form.chute"), null); });

  /* ---------- o número em tamanho real ---------- */
  // "de cada 100", "quantas vezes" e o número com a frase que dá o tamanho (escalas concretas: Chevalier et al. 2013; Hullman et al. 2018)
  const cem = (n, cor) => `<span class="cem" role="img" aria-label="${n} de cada 100">${Array.from({ length: 100 }, (_, i) => `<i${i < n ? ` style="background:${cor}"` : ""}></i>`).join("")}</span>`;
  V.tamanhoHTML = (ts, cor) => !ts || !ts.length ? "" : `<section class="tamanho" aria-label="O número em tamanho real"><h2 class="tamanho__tit">Em tamanho real</h2><div class="tamanho__itens">${ts.map((t) => {
    if (t.tipo === "cem") return `<figure class="tamanho__item">${cem(Math.max(0, Math.min(100, t.n)), t.cor || cor || "#16181d")}<figcaption>${t.texto}</figcaption></figure>`;
    if (t.tipo === "vezes") { const r = t.para / t.de, w = Math.max(1.5, (100 * t.de) / t.para);
      return `<figure class="tamanho__item"><div class="vezes"><span class="vezes__lin"><small>${t.rotDe}</small><i style="width:${w}%;background:${cor || "#16181d"}"></i><b>${V.fmtVivo(t.fmt, t.de)}</b></span>
        <span class="vezes__lin"><small>${t.rotPara}</small><i style="width:100%;background:${cor || "#16181d"}"></i><b>${V.fmtVivo(t.fmt, t.para)}</b></span></div><figcaption><b class="tamanho__n">${N0.format(r)}×</b> ${t.texto}</figcaption></figure>`; }
    return `<figure class="tamanho__item"><b class="tamanho__n">${t.n}</b><figcaption>${t.texto}</figcaption></figure>`;
  }).join("")}</div></section>`;

  /* ---------- cartão para compartilhar ---------- */
  // desenha a resposta num PNG de 1080 × 1350 (o tamanho de post) e oferece compartilhar (celular) ou baixar
  const quebrar = (ctx, txt, larg) => { const ps = String(txt).split(/\s+/), ls = []; let l = ""; for (const p of ps) { const t = l ? l + " " + p : p; if (ctx.measureText(t).width > larg && l) { ls.push(l); l = p; } else l = t; } if (l) ls.push(l); return ls; };
  const limpo = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d.textContent.replace(/\s+/g, " ").trim(); };
  V.cartaoPNG = async (o) => {
    try { await document.fonts.ready; } catch (e) {}
    const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d"), cor = o.cor || "#16181d", M = 84;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = cor; ctx.fillRect(0, 0, W, 22);
    ctx.fillStyle = cor; ctx.font = "700 34px 'Atkinson Hyperlegible', Arial, sans-serif"; ctx.fillText((o.bloco || "Voto a voto").toUpperCase(), M, 110);
    ctx.fillStyle = "#16181d"; ctx.font = "700 76px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    let y = 210; for (const l of quebrar(ctx, limpo(o.titulo), W - 2 * M).slice(0, 3)) { ctx.fillText(l, M, y); y += 80; }
    if (o.numero) { y += 70; ctx.fillStyle = cor; ctx.font = "700 190px 'Barlow Condensed', 'Arial Narrow', sans-serif"; ctx.fillText(limpo(o.numero), M, y + 110); y += 170;
      ctx.fillStyle = "#3b3f46"; ctx.font = "400 38px 'Atkinson Hyperlegible', Arial, sans-serif"; for (const l of quebrar(ctx, limpo(o.rotulo || ""), W - 2 * M).slice(0, 3)) { y += 50; ctx.fillText(l, M, y); } }
    y += 90; ctx.fillStyle = "#16181d"; ctx.font = "700 42px 'Atkinson Hyperlegible', Arial, sans-serif";
    for (const l of quebrar(ctx, limpo(o.frase), W - 2 * M).slice(0, 6)) { ctx.fillText(l, M, y); y += 58; }
    if (o.cidade) { y += 30; ctx.fillStyle = cor; ctx.font = "700 38px 'Atkinson Hyperlegible', Arial, sans-serif"; for (const l of quebrar(ctx, limpo(o.cidade), W - 2 * M).slice(0, 2)) { ctx.fillText(l, M, y); y += 50; } }
    ctx.fillStyle = "#e3e5e8"; ctx.fillRect(M, H - 150, W - 2 * M, 2);
    ctx.fillStyle = "#16181d"; ctx.font = "700 40px 'Barlow Condensed', 'Arial Narrow', sans-serif"; ctx.fillText("Voto a voto", M, H - 90);
    ctx.fillStyle = "#5f6670"; ctx.font = "400 28px 'Atkinson Hyperlegible', Arial, sans-serif"; ctx.fillText("eryckkawa.github.io/voto-a-voto · dados do TSE, 1994 a 2026", M, H - 48);
    return new Promise((ok) => cv.toBlob(ok, "image/png"));
  };
  V.compartilhar = async (o) => {
    const blob = await V.cartaoPNG(o), nome = "voto-a-voto-" + V.norm(limpo(o.titulo)).replace(/[^a-z0-9]+/g, "-").slice(0, 40) + ".png";
    const arq = typeof File === "function" ? new File([blob], nome, { type: "image/png" }) : null;
    if (arq && navigator.canShare && navigator.canShare({ files: [arq] })) { try { await navigator.share({ files: [arq], title: limpo(o.titulo), text: limpo(o.frase) }); return "compartilhado"; } catch (e) { if (e && e.name === "AbortError") return "cancelado"; } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return "baixado";
  };

  /* ---------- a cidade do leitor (lembrada entre as páginas) ---------- */
  V.minhaCidade = () => { try { return localStorage.getItem("vav-minha-cidade") || null; } catch (e) { return null; } };
  V.guardarCidade = (ibge) => { try { if (ibge) localStorage.setItem("vav-minha-cidade", ibge); else localStorage.removeItem("vav-minha-cidade"); } catch (e) {} };
})();
