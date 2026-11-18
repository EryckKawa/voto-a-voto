/* Voto a voto — os rabiscos do "jornal rabiscado": caneta circulando o número principal, sublinhado tremido,
   marca-texto, nota escrita à mão, carimbo e post-it. Cada um se desenha quando entra na tela, conforme a pessoa rola,
   e fica desenhado. Quem pede menos movimento no sistema vê tudo já pronto.
   Regra de uso (sempre a mesma, para o leitor aprender sem perceber):
     círculo = o número principal · sublinhado = o que merece atenção · marca-texto = a conclusão
     nota à mão = o comentário · carimbo = alerta · post-it = o porquê */
(function () {
  "use strict";
  const V = window.V;

  const CIRC = ["M14,44 C8,14 70,4 112,6 C164,8 198,22 192,44 C186,68 128,80 86,75 C36,70 4,58 18,30 C24,20 40,14 60,12",
    "M10,40 C12,12 80,2 120,8 C168,14 196,26 190,48 C182,72 110,80 70,74 C28,68 6,56 16,32 C22,22 44,12 70,10",
    "M18,46 C6,18 66,6 108,4 C160,4 196,18 194,40 C192,66 136,78 92,76 C40,74 2,62 14,34"];
  let n = 0;
  const svg = (d, cls, vb = "0 0 200 80") => `<svg class="rb ${cls}" viewBox="${vb}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="${d}" vector-effect="non-scaling-stroke"></path></svg>`;

  /* o número principal, circulado */
  V.rCirculo = (html) => `<span class="rb-alvo rb-alvo--circ">${html}${svg(CIRC[n++ % CIRC.length], "rb-circ")}</span>`;
  /* sublinhado tremido */
  V.rSublinha = (html) => `<span class="rb-alvo rb-alvo--sub">${html}${svg("M0,6 Q8,0 16,6 T32,6 T48,6 T64,6 T80,6 T100,6", "rb-sub", "0 0 100 12")}</span>`;
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
  function ligar(el, atraso) { el.style.setProperty("--atraso", atraso + "ms"); el.classList.add("rb-on"); }
  function preparar() {
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
