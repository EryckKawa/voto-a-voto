/* Voto a voto — os rabiscos do "jornal rabiscado": caneta circulando o número principal, sublinhado tremido,
   marca-texto, nota escrita à mão, carimbo e post-it. Cada um se desenha quando entra na tela, conforme a pessoa rola,
   e fica desenhado. Quem pede menos movimento no sistema vê tudo já pronto.
   Regra de uso (sempre a mesma, para o leitor aprender sem perceber):
     círculo = o número principal · sublinhado = o que merece atenção · marca-texto = a conclusão
     nota à mão = o comentário · carimbo = alerta · post-it = o porquê */
(function () {
  "use strict";
  const V = window.V;

  // elipses à mão no quadro 200 x 80: ocupam x de 6 a 194 e y de 4 a 76; a ponta final passa do começo por fora do texto
  const CIRC = ["M70,6 C120,1 192,12 194,40 C196,64 150,77 100,76 C48,76 6,62 6,40 C6,18 50,4 104,3 C126,3 146,5 160,8",
    "M150,7 C178,14 196,26 193,42 C190,62 150,76 98,75 C46,74 5,60 7,38 C9,16 56,3 108,4 C130,5 150,8 164,13",
    "M40,12 C70,3 140,2 176,13 C196,22 197,52 172,66 C146,78 60,79 26,66 C2,55 4,26 30,14 C48,6 72,4 96,4"];
  let n = 0;
  const svg = (d, cls, vb = "0 0 200 80") => `<svg class="rb ${cls}" viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${d}" vector-effect="non-scaling-stroke"></path></svg>`;

  /* o número principal, circulado */
  V.rCirculo = (html) => `<span class="rb-alvo rb-alvo--circ"><span class="rb-base"></span><span class="rb-txt">${html}</span>${svg(CIRC[n++ % CIRC.length], "rb-circ")}</span>`;
  /* sublinhado tremido */
  V.rSublinha = (html) => `<span class="rb-alvo rb-alvo--sub"><span class="rb-base"></span><span class="rb-txt">${html}</span>${svg("M1,7 C18,4 40,9 62,6 C78,4 92,5 99,6", "rb-sub", "0 0 100 12")}</span>`;
  /* marca-texto amarelo */
  V.rMarca = (html) => `<mark class="rb-marca">${html}</mark>`;
  /* nota escrita à mão (giro em graus) */
  V.rNota = (txt, giro = -2, cls = "") => `<span class="rb-nota ${cls}" style="--giro:${giro}deg">${txt}</span>`;
  V.rCarimbo = (txt, giro = -4) => `<span class="rb-carimbo" style="--giro:${giro}deg">${txt}</span>`;
  V.rPostit = (html, giro = -2) => `<aside class="rb-postit" style="--giro:${giro}deg"><span class="rb-fita" aria-hidden="true"></span>${html}</aside>`;
  /* check feito à mão, para listas de dicas */
  V.rCheck = () => `<svg class="rb rb-check" viewBox="0 0 26 22" aria-hidden="true" focusable="false"><path d="M3,12 L10,19 L23,3"></path></svg>`;

  /* circula o primeiro número de uma frase (R$ 35,68, 18%, 42,6 milhões, 71...) */
  // a ordem importa: dinheiro primeiro, depois porcentagem, depois um número que não seja ano (1994, 2026...)
  const ESC = "(?:\\s(?:milhões|milhão|bilhões|bilhão|mil))?";
  const NUMS = [new RegExp("R\\$\\s?[\\d.]+(?:,\\d+)?" + ESC), /\d[\d.]*(?:,\d+)?\s(?:milhões|milhão|bilhões|bilhão|mil)/, /\d[\d.]*(?:,\d+)?\s?%/,
    /(?<![\d.,])(?!(?:19|20)\d\d(?!\d|[.,]\d))\d[\d.]*(?:,\d+)?/];
  /* o mesmo, mas com a marca escolhida (V.rSublinha, V.rMarca...) */
  V.rMarcarNumero = (frase, marca) => {
    for (const re of NUMS) { const m = re.exec(frase); if (m) return frase.slice(0, m.index) + marca(m[0]) + frase.slice(m.index + m[0].length); }
    return frase;
  };
  V.rCircularNumero = (frase) => {
    for (const re of NUMS) { const m = re.exec(frase); if (m) return frase.slice(0, m.index) + V.rCirculo(m[0]) + frase.slice(m.index + m[0].length); }
    return frase;
  };

  /* ---------- desenhar conforme rola ---------- */
  const SEL = ".rb, .rb-marca, .rb-nota, .rb-carimbo, .rb-postit";
  const calmo = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let io = null;
  /* encaixa o rabisco na letra: o círculo é uma elipse que passa por fora dos cantos do texto
     (algarismos têm cerca de 0,7 da altura da fonte acima da linha de base) e o sublinhado fica logo abaixo dela */
  function medir(alvo) {
    const s = alvo.querySelector(":scope > svg.rb"), b = alvo.querySelector(":scope > .rb-base"), t = alvo.querySelector(":scope > .rb-txt");
    if (!s || !b || !t) return;
    const ra = alvo.getBoundingClientRect(), rt = t.getBoundingClientRect(), base = b.getBoundingClientRect().bottom;
    if (!ra.width || !rt.width) return;
    const fs = parseFloat(getComputedStyle(alvo).fontSize) || 16, w = rt.width, x0 = rt.left - ra.left, y0 = base - ra.top;
    let L, T, W, H;
    if (s.classList.contains("rb-circ")) {
      const a = w / 2 + 0.3 * fs + 0.04 * w, bb = 0.72 * fs, cx = x0 + w / 2, cy = y0 - 0.34 * fs;
      W = (2 * a) / 0.94; H = (2 * bb) / 0.9; L = cx - W / 2; T = cy - H / 2;
      // folga dos lados do tamanho do que o círculo passa da palavra (mais o traço), para não riscar a palavra vizinha
      const m = Math.max(0.36 * fs, a - w / 2 - 0.1 * fs) + "px";
      alvo.style.marginRight = m; if (alvo.parentElement && alvo.parentElement.tagName !== "B") alvo.style.marginLeft = m;
    } else {
      W = w + 0.08 * fs; H = 0.18 * fs; L = x0 - 0.04 * fs; T = y0 + 0.07 * fs;
    }
    Object.assign(s.style, { left: L + "px", top: T + "px", width: W + "px", height: H + "px", bottom: "auto" });
  }
  const medirTodos = () => document.querySelectorAll("#conteudo .rb-alvo").forEach(medir);
  V.rMedir = medirTodos;
  let tm; addEventListener("resize", () => { clearTimeout(tm); tm = setTimeout(medirTodos, 150); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medirTodos);
  function ligar(el, atraso) {
    if (el.parentElement && el.parentElement.classList.contains("rb-alvo")) medir(el.parentElement); el.style.setProperty("--atraso", atraso + "ms"); el.classList.add("rb-on"); }
  function preparar() {
    medirTodos();
    const els = document.querySelectorAll(SEL);
    if (!("IntersectionObserver" in window) || calmo()) { els.forEach((el) => el.classList.add("rb-on")); return; }
    if (!io) io = new IntersectionObserver((es) => {
      let k = 0;
      // os que entram juntos se desenham um depois do outro, na ordem da página
      es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((e) => { io.unobserve(e.target); ligar(e.target, 150 * k++); });
    }, { threshold: 0.5, rootMargin: "0px 0px -10% 0px" });
    els.forEach((el) => { if (!el.__rb) { el.__rb = true; io.observe(el); } });
  }
  V.rabiscar = preparar;
  addEventListener("vav:pronto", () => requestAnimationFrame(preparar));
  // painéis que se desenham depois (gráficos, mapa) também ganham os seus rabiscos
  const main = document.getElementById("conteudo");
  if (main && "MutationObserver" in window) { let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(preparar, 120); }).observe(main, { childList: true, subtree: true }); }

  /* a data de hoje no cabeçalho do jornal */
  const d = document.getElementById("jt-data");
  if (d) { const s = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()); d.textContent = s.charAt(0).toUpperCase() + s.slice(1); }
})();
