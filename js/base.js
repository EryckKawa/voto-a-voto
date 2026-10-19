/* Voto a voto — utilidades comuns: carregamento de dados, formatação, cores, rotas e dica flutuante. */
(function () {
  "use strict";
  const V = (window.V = {});

  /* ---------- dados: carregados como <script> para funcionar também ao abrir o arquivo direto do disco ---------- */
  const pend = {};
  V.dados = function (chave) {
    window.__D = window.__D || {};
    if (window.__D[chave]) return Promise.resolve(window.__D[chave]);
    if (pend[chave]) return pend[chave];
    pend[chave] = new Promise((ok, falha) => {
      const s = document.createElement("script");
      s.src = "data/" + chave + ".js";
      s.onload = () => (window.__D[chave] ? ok(window.__D[chave]) : falha(new Error("Arquivo sem dados: " + chave)));
      s.onerror = () => { delete pend[chave]; falha(new Error("Não foi possível carregar " + chave)); };
      document.head.appendChild(s);
    });
    return pend[chave];
  };

  /* ---------- formatação pt-BR ---------- */
  const nf = (d) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const N0 = nf(0), N1 = nf(1);
  V.int = (v) => (v == null ? "—" : N0.format(v));
  V.pct = (v, d = 1) => (v == null ? "—" : (d ? N1 : N0).format(v) + "%");
  V.brl = (v) => (v == null ? "—" : v >= 1e6 ? "R$\u00a0" + N1.format(v / 1e6) + "\u00a0mi" : v >= 1e4 ? "R$\u00a0" + N0.format(v / 1e3) + "\u00a0mil" : "R$\u00a0" + N0.format(v));
  V.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /* nome de exibição do partido: siglas que são palavras viram nome próprio (REPUBLICANOS -> Republicanos) */
  const NOMES_PARTIDO = { "PC DO B": "PCdoB", PCDOB: "PCdoB", "PT DO B": "PTdoB", REPUBLICANOS: "Republicanos", SOLIDARIEDADE: "Solidariedade", SD: "Solidariedade",
    "UNIÃO": "União Brasil", UNIAO: "União Brasil", PODE: "Podemos", PODEMOS: "Podemos", AVANTE: "Avante", CIDADANIA: "Cidadania", REDE: "Rede", NOVO: "Novo",
    AGIR: "Agir", MOBILIZA: "Mobiliza", PATRIOTA: "Patriota", PATRI: "Patriota", "MISSÃO": "Missão", DEMOCRATA: "Democrata", PROGRESSISTAS: "PP", REP: "Republicanos" };
  V.nomePartido = (sg) => NOMES_PARTIDO[String(sg || "").toUpperCase()] || sg;
  V.titulo = (s) => String(s || "").toLowerCase().replace(/(^|[\s\-'(])([a-zà-ú])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(De|Da|Do|Das|Dos|E|D')\b/g, (m) => m.toLowerCase());
  V.iniciais = (nome) => { const p = String(nome || "").replace(/[^A-Za-zÀ-ú ]/g, " ").trim().split(/\s+/).filter((x) => x.length > 1); return ((p[0] || "?")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase(); };

  /* ---------- eleições e cargos ---------- */
  V.CARGOS = { PRES: "Presidente", GOV: "Governador", SEN: "Senador", DF: "Deputado federal", DE: "Deputado estadual", PREF: "Prefeito", VER: "Vereador" };
  V.CARGOS_CURTO = { PRES: "Presidente", GOV: "Governador", SEN: "Senador", DF: "Dep. federal", DE: "Dep. estadual", PREF: "Prefeito", VER: "Vereador" };
  V.ANOS = [2018, 2020, 2022, 2024, 2026];
  V.cargosDoAno = (ano) => (ano % 4 === 0 ? ["PREF", "VER"] : ano === 2026 ? ["GOV", "SEN", "DF", "DE"] : ["PRES", "GOV", "SEN", "DF", "DE"]);
  V.tipoAno = (ano) => (ano % 4 === 0 ? "municipal" : "geral");
  V.UFS = { CE: "Ceará", ES: "Espírito Santo", MT: "Mato Grosso", PR: "Paraná", SC: "Santa Catarina", TO: "Tocantins" };

  /* ---------- cores: espectro ideológico do partido (Bolognesi, Ribeiro e Codato, 2023) ---------- */
  V.ESPC = { "ESQUERDA": "#b8232f", "CENTRO-ESQUERDA": "#e8827a", "CENTRO": "#77746e", "CENTRO-DIREITA": "#6f9be0", "DIREITA": "#1d3c9e" };
  V.ESPN = { "ESQUERDA": "Esquerda", "CENTRO-ESQUERDA": "Centro-esquerda", "CENTRO": "Centro", "CENTRO-DIREITA": "Centro-direita", "DIREITA": "Direita" };
  V.espDe = (sg) => (V.ESPECTRO && V.ESPECTRO[sg] ? V.ESPECTRO[sg][0] : null);
  V.corPartido = (sg) => V.ESPC[V.espDe(sg)] || "#77746e";
  V.textoSobre = (cor) => (["#e8827a", "#6f9be0", "#c9ccd1"].includes(cor) ? "#16181d" : "#fff");
  V.partidoHtml = (sg) => { const c = V.corPartido(sg); return '<span class="partido" style="background:' + c + ";color:" + V.textoSobre(c) + '">' + V.esc(sg) + "</span>"; };

  /* ---------- foto do candidato: arquivo img/fotos/<ano>/<sq>.jpg quando existir; senão, iniciais ---------- */
  V.FOTOS = window.__FOTOS || {};
  V.fotoHtml = (k, classe) => {
    const nome = k[0], sq = k[7], ano = k[5], cor = V.corPartido(k[1]);
    const ini = '<span class="iniciais" style="background:' + cor + ";color:" + V.textoSobre(cor) + '">' + V.esc(V.iniciais(nome)) + "</span>";
    if (V.FOTOS[ano] && V.FOTOS[ano][sq]) return '<img loading="lazy" alt="" src="img/fotos/' + ano + "/" + sq + '.jpg" onerror="this.replaceWith(document.createRange().createContextualFragment(this.dataset.f))" data-f="' + V.esc(ini) + '">';
    return ini;
  };

  /* ---------- dica flutuante ---------- */
  const dica = () => document.getElementById("dica");
  V.dica = (ev, html) => {
    const d = dica(); if (!html) { d.hidden = true; return; }
    d.innerHTML = html; d.hidden = false;
    const w = d.offsetWidth, h = d.offsetHeight; let x = ev.clientX + 16, y = ev.clientY + 16;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 16; if (y + h > innerHeight - 8) y = ev.clientY - h - 16;
    d.style.left = Math.max(8, x) + "px"; d.style.top = Math.max(8, y) + "px";
  };
  V.linhasDica = (titulo, linhas) => "<b>" + V.esc(titulo) + '</b><div class="dica__l">' + linhas.map(([a, b]) => "<span>" + V.esc(a) + "</span><span>" + V.esc(b) + "</span>").join("") + "</div>";
  addEventListener("scroll", () => { const d = dica(); if (d) d.hidden = true; }, { passive: true });

  /* ---------- estado de eleição escolhido (compartilhado entre páginas) ---------- */
  V.escolha = { ano: 2024, cargo: "PREF" };
  try { const s = JSON.parse(localStorage.getItem("vav-escolha") || "null"); if (s && V.cargosDoAno(s.ano).includes(s.cargo)) V.escolha = s; } catch (e) {}
  V.salvarEscolha = () => { try { localStorage.setItem("vav-escolha", JSON.stringify(V.escolha)); } catch (e) {} };

  /* seletor ano → cargo; chama aoMudar() */
  V.seletorEleicao = function (host, aoMudar, opts = {}) {
    const anos = opts.anos || V.ANOS;
    function pinta() {
      const e = V.escolha;
      host.innerHTML = '<div class="linha-sel"><span>Eleição</span>' + anos.map((a) => '<button class="chip" data-ano="' + a + '" aria-pressed="' + (e.ano === a) + '">' + a + "<small>" + (a % 4 === 0 ? "municipal" : "geral") + "</small></button>").join("") + "</div>" +
        '<div class="linha-sel"><span>Cargo</span>' + (opts.cargos ? opts.cargos(e.ano) : V.cargosDoAno(e.ano)).map((c) => '<button class="chip" data-cargo="' + c + '" aria-pressed="' + (e.cargo === c) + '">' + V.CARGOS_CURTO[c] + "</button>").join("") + "</div>";
      host.querySelectorAll("[data-ano]").forEach((b) => b.addEventListener("click", () => {
        const a = +b.dataset.ano; const cs = opts.cargos ? opts.cargos(a) : V.cargosDoAno(a);
        V.escolha = { ano: a, cargo: cs.includes(V.escolha.cargo) ? V.escolha.cargo : V.escolha.cargo === "VER" && cs.includes("DE") ? "DE" : V.escolha.cargo === "PREF" && cs.includes("GOV") ? "GOV" : cs[0] };
        V.salvarEscolha(); pinta(); aoMudar();
      }));
      host.querySelectorAll("[data-cargo]").forEach((b) => b.addEventListener("click", () => { V.escolha.cargo = b.dataset.cargo; V.salvarEscolha(); pinta(); aoMudar(); }));
    }
    pinta();
    return pinta;
  };

  /* ---------- rotas por hash ---------- */
  // largura útil da página (seções fora da tela não têm medida enquanto não são desenhadas)
  // (só a largura da janela: ler a largura de um elemento obriga o navegador a recalcular a página inteira)
  V.largura = () => window.innerWidth - 32;
  V.rotas = [];
  V.rota = (re, fn, op) => V.rotas.push([re, fn, op || {}]);
  V.ir = (h) => { if (location.hash === h) dispara(); else location.hash = h; };
  async function dispara() {
    const h = location.hash.replace(/^#/, "") || "/";
    const main = document.getElementById("conteudo");
    for (const [re, fn, op] of V.rotas) {
      const m = h.match(re);
      if (m) {
        // rotas que "mantêm" a tela (o mapa) só se atualizam, sem redesenhar tudo
        const mesma = !!op.mantem && V.rotaAtual === re && main.dataset.rota === String(re);
        V.rotaAtual = re; main.dataset.rota = String(re);
        document.querySelectorAll(".nav a").forEach((a) => a.removeAttribute("aria-current"));
        if (!mesma) main.innerHTML = '<div class="carregando">Carregando…</div>';
        delete main.dataset.erro;
        try { await fn(main, ...m.slice(1), mesma); } catch (err) { console.error(err); main.dataset.erro = "1"; main.innerHTML = '<div class="pagina"><p class="aviso">' + V.esc(err.message) + '. <a href="#/">Voltar ao mapa</a>.</p></div>'; main.dataset.rota = ""; }
        if (!V.semRolar && !mesma) scrollTo(0, 0); V.semRolar = false;
        dispatchEvent(new CustomEvent("vav:pronto", { detail: h }));   // a página terminou de montar (usado pelos testes)
        return;
      }
    }
    main.innerHTML = '<div class="pagina"><p class="vazio">Página não encontrada. <a href="#/">Voltar ao mapa</a>.</p></div>';
  }
  V.iniciarRotas = () => { addEventListener("hashchange", dispara); dispara(); };
  V.marcarNav = (k) => { const a = document.querySelector('.nav a[data-nav="' + k + '"]'); if (a) a.setAttribute("aria-current", "page"); };

  /* ---------- cidades ---------- */
  V.carregarBase = async () => {
    if (V.CIDADES) return;
    const [cid, esp] = await Promise.all([V.dados("cidades"), V.dados("espectro")]);
    V.ESPECTRO = esp;
    V.CIDADES = cid.map((r) => ({ tse: r[0], ibge: r[1], nome: r[2], uf: r[3], capital: !!r[4], pop: r[5], pib: r[6] }));
    V.porIbge = new Map(V.CIDADES.map((c) => [c.ibge, c]));
    V.porTse = new Map(V.CIDADES.map((c) => [String(c.tse), c]));
  };
  V.norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
})();
