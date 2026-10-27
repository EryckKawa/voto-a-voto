/* Voto a voto — ficha do político (Q10: o histórico eleitoral de cada um), para todos os candidatos de 1994 a 2026:
   cada candidatura com o partido e o lado dele naquela eleição, votos, resultado, dinheiro, patrimônio e onde gastou,
   nuvens individuais de planos, projetos e discursos; para deputados federais, como votou no Plenário.
   Dados de data/br/pol/, feitos por scripts/ficha_politico.py a partir do banco nacional. */
(function () {
  "use strict";
  const V = window.V;
  const CARGO = { 1: "Presidente", 2: "Vice-presidente", 3: "Governador", 4: "Vice-governador", 5: "Senador", 6: "Deputado federal", 7: "Deputado estadual", 8: "Deputado distrital",
    9: "1º suplente de senador", 10: "2º suplente de senador", 11: "Prefeito", 12: "Vice-prefeito", 13: "Vereador" };
  const SIT = { E: ["Eleito", "selo--eleito"], 2: ["Foi ao 2º turno", "selo--2t"], S: ["Suplente", "selo--sup"], N: ["Não eleito", "selo--nao"], "-": ["Sem resultado", "selo--nao"] };
  const DESP = [null, "Material impresso", "Internet e redes sociais", "Rádio, TV e vídeo", "Militância e cabos eleitorais", "Adesivos, placas e carro de som", "Comícios e eventos",
    "Jornais e revistas", "Pessoal e serviços", "Veículos, viagens e combustível", "Repasse a outros candidatos", "Outras despesas"];
  const COR_DESP = [null, "#16181d", "#0f5fb5", "#7a5aa6", "#d96a12", "#c99a52", "#2f7d5b", "#9c5d16", "#8b929c", "#b7bcc4", "#d6dae0", "#e9ebee"];
  const VOTO = { S: ["Sim", "pol-voto--sim"], N: ["Não", "pol-voto--nao"], O: ["Obstrução", "pol-voto--nao"], A: ["Abstenção", "pol-voto--outro"], P: ["Art. 17 (presidia a sessão)", "pol-voto--outro"], "?": ["Outro", "pol-voto--outro"] };
  const faixa = (n) => (n == null ? null : n < -0.5 ? "ESQUERDA" : n < -0.25 ? "CENTRO-ESQUERDA" : n <= 0.25 ? "CENTRO" : n <= 0.5 ? "CENTRO-DIREITA" : "DIREITA");
  const corNota = (n) => V.ESPC[faixa(n)] || "#c9ccd1";
  const nota = (v) => (v == null ? "—" : (v > 0.005 ? "+" : v < -0.005 ? "−" : "") + Math.abs(v).toFixed(2).replace(".", ","));
  const partido = (sg, n) => { const c = corNota(n); return `<span class="partido" style="background:${c};color:${V.textoSobre(c)}" title="${V.esc(sg)}${n != null ? `: nota ${nota(n)} (${V.ESPN[faixa(n)].toLowerCase()})` : ": partido sem nota"}">${V.esc(V.nomePartido(sg))}</span>`; };
  // o TSE marca o nome de urna que falta com #NULO# (ou #NE#)
  const semUrna = (u) => !u || /^#/.test(u);
  const ARQ_F = (id) => "br/pol/f/" + (id % 2048), ARQ_PAL = (id) => "br/pol/pal/" + (id % 512), ARQ_CAM = (id) => "br/pol/cam/" + (id % 64);

  /* ---------- busca por nome (índice cortado por prefixo: data/br/pol/idx) ---------- */
  let MAN = null, FOTOS = null;
  const chaveBusca = (s) => V.norm(s).toUpperCase().replace(/[^A-Z ]/g, "").replace(/\s+/g, " ").trim();
  V.buscaPoliticos = async (texto, n = 8) => {
    const t = chaveBusca(texto);
    if (t.length < 3) return [];
    const M = await (MAN || (MAN = V.dados("br/pol/idx/manifesto")));
    // o pedaço serve se o prefixo dele é começo do texto, ou se o texto (curto) é começo do prefixo
    const ks = M.filter((k) => { const b = k.replace(/\$$/, ""); return t.startsWith(b) || b.startsWith(t); }).sort((a, b) => b.length - a.length).slice(0, 12);
    // AUX, NUL, PRN... são dispositivos no Windows; esses pedaços levam "~" no nome (scripts/ficha_politico.py)
    const arquivo = (nome) => nome + (/^(CON|PRN|AUX|NUL|COM\d|LPT\d)$/.test(nome) ? "~" : "");
    const pedacos = await Promise.all(ks.map((k) => V.dados("br/pol/idx/" + arquivo((k.replace(/\$$/, "").replace(/ /g, "_") || "_") + (k.endsWith("$") ? "$" : ""))).catch(() => [])));
    const vistos = new Set(), out = [];
    for (const e of pedacos.flat()) {
      const [k, id, civil, urna, ano, cargo, lugar, vit, votos] = e;
      if (vistos.has(id) || !(k || chaveBusca(civil)).startsWith(t)) continue;
      vistos.add(id); out.push({ id, civil, urna: semUrna(urna) ? "" : urna, ano, cargo, lugar, vit, votos });
    }
    return out.sort((a, b) => b.votos - a.votos || b.vit - a.vit).slice(0, n);
  };
  V.lugarPol = (lugar, BR) => (lugar === "BR" ? "Brasil" : typeof lugar === "number" ? ((c) => (c ? `${c.nome} (${c.uf})` : "cidade " + lugar))(BR.porTse.get(lugar)) : V.UFN[lugar] || lugar);
  V.descrPol = (e, BR) => `${CARGO[e.cargo] || "Candidato"} ${e.ano} · ${V.lugarPol(e.lugar, BR)}${e.vit ? ` · ${e.vit} ${e.vit === 1 ? "vitória" : "vitórias"}` : ""}`;

  /* ---------- partes da ficha ---------- */
  // a régua de −1 a +1 com a nota do partido em cada candidatura (e a posição pelo próprio voto, para deputado federal)
  function regua(cands, cam) {
    const pts = cands.filter((c) => c[4] != null && [1, 3, 5, 6, 7, 8, 11, 13].includes(c[1]));
    if (!pts.length && !(cam && cam.nota != null)) return '<p class="vazio">Nenhum dos partidos desta pessoa tem nota nos estudos usados pelo site.</p>';
    const W = 760, H = 150, m = 30, x = (v) => m + ((v + 1) / 2) * (W - 2 * m);
    const faixas = [[-1, -0.5, "ESQUERDA"], [-0.5, -0.25, "CENTRO-ESQUERDA"], [-0.25, 0.25, "CENTRO"], [0.25, 0.5, "CENTRO-DIREITA"], [0.5, 1, "DIREITA"]];
    // partidos iguais na mesma nota viram um ponto só, com os anos juntos
    const grupos = new Map(); pts.forEach((c) => { const k = c[3] + "|" + c[4]; if (!grupos.has(k)) grupos.set(k, { sg: c[3], n: c[4], anos: [] }); grupos.get(k).anos.push(c[0]); });
    const gs = [...grupos.values()].sort((a, b) => a.n - b.n);
    let ult = -1e9, linha = 0;
    gs.forEach((g) => { linha = x(g.n) - ult < 64 ? (linha + 1) % 3 : 0; g.y = 58 + linha * 20; ult = x(g.n); });
    const desc = gs.map((g) => `${g.sg} ${g.anos.join(", ")}: ${nota(g.n)}`).join("; ") + (cam && cam.nota != null ? `; pelo próprio voto na Câmara: ${nota(cam.nota)}` : "");
    return `<svg class="pol-regua" viewBox="0 0 ${W} ${H}" role="img" aria-label="Lado político, de −1 (esquerda) a +1 (direita): ${V.esc(desc)}">
      ${faixas.map(([a, b, f]) => `<rect x="${x(a)}" y="30" width="${x(b) - x(a)}" height="12" fill="${V.ESPC[f]}" opacity=".85"/>`).join("")}
      ${[-1, -0.5, 0, 0.5, 1].map((t) => `<text x="${x(t)}" y="22" text-anchor="middle" class="pol-regua__eixo">${nota(t)}</text>`).join("")}
      <text x="${x(-1)}" y="${H - 6}" class="pol-regua__eixo">esquerda</text><text x="${x(1)}" y="${H - 6}" text-anchor="end" class="pol-regua__eixo">direita</text>
      ${gs.map((g) => `<g><title>${V.esc(g.sg)} em ${g.anos.join(", ")}: nota ${nota(g.n)}</title><line x1="${x(g.n)}" x2="${x(g.n)}" y1="42" y2="${g.y - 8}" stroke="#8b929c"/>
        <circle cx="${x(g.n)}" cy="36" r="7" fill="#fff" stroke="${corNota(g.n)}" stroke-width="3"/>
        <text x="${x(g.n)}" y="${g.y + 4}" text-anchor="middle" class="pol-regua__sg">${V.esc(V.nomePartido(g.sg))} <tspan class="pol-regua__anos">${g.anos.length > 2 ? g.anos[0] + "–" + g.anos[g.anos.length - 1] : g.anos.join(", ")}</tspan></text></g>`).join("")}
      ${cam && cam.nota != null ? `<g><title>Posição pelo próprio voto na Câmara: ${nota(cam.nota)}</title><path d="M${x(cam.nota)} 26 l8 10 l-8 10 l-8 -10 z" fill="#16181d" stroke="#fff" stroke-width="1.5"/></g>` : ""}
    </svg>`;
  }

  function historico(cands, urnas, BR) {
    return `<ol class="pol-hist">${cands.slice().reverse().map((c) => {
      const [ano, cg, lugar, sg, n, nr, ui, v1, v2, sit, rec, pub, desp, patr] = c, s = SIT[sit] || SIT["-"];
      const din = rec != null ? `<span><small>Receita</small>${V.brl(rec)}${rec > 0 ? ` <small>(${V.pct((100 * pub) / rec, 0)} público)</small>` : ""}</span><span><small>Gasto</small>${V.brl(desp)}</span>` : "";
      return `<li class="${sit === "E" ? "pol-hist--eleito" : ""}">
        <span class="pol-hist__ano">${ano}</span>
        <span class="pol-hist__cargo"><b>${CARGO[cg] || "Cargo " + cg}</b> <span class="selo ${s[1]}">${s[0]}</span><small>${V.esc(V.lugarPol(lugar, BR))}${nr ? ` · nº ${nr}` : ""}${ui >= 0 && !semUrna(urnas[ui]) ? ` · na urna: ${V.esc(V.titulo(urnas[ui]))}` : ""}</small></span>
        <span class="pol-hist__partido">${partido(sg, n)} <small>${n != null ? nota(n) : "sem nota"}</small></span>
        <span class="pol-hist__num"><span><small>Votos${v2 ? " (1º turno)" : ""}</small>${v1 != null ? V.int(v1) : "—"}</span>${v2 ? `<span><small>2º turno</small>${V.int(v2)}</span>` : ""}${din}${patr != null ? `<span><small>Bens declarados</small>${V.brl(patr)}</span>` : ""}</span>
      </li>`; }).join("")}</ol>`;
  }

  function gastos(cands, sel) {
    const cs = cands.filter((c) => c[15] && c[15].length);
    if (!cs.length) return "";
    const c = cs[Math.min(sel, cs.length - 1)], soma = c[15].reduce((s, [, p]) => s + p, 0);
    const partes = [...c[15], ...(soma < 100 ? [[11, 100 - soma]] : [])];
    return `<section class="cartao pol-cartao" aria-labelledby="pol-gasto-tit"><h2 class="cartao__titulo" id="pol-gasto-tit">Onde gastou a campanha</h2>
      <p class="cartao__sub">As maiores despesas que declarou ao TSE, pela categoria que ele mesmo escolheu na prestação de contas. Do material impresso aos comícios, é propaganda.</p>
      ${cs.length > 1 ? `<div class="pq-vistas" role="group" aria-label="Eleição">${cs.map((x, i) => `<button class="chip" type="button" data-gasto="${i}" aria-pressed="${x === c}">${CARGO[x[1]]} ${x[0]}</button>`).join("")}</div>` : `<p><b>${CARGO[c[1]]} ${c[0]}</b></p>`}
      <div class="pol-pilha" role="img" aria-label="${V.esc(partes.map(([t, p]) => `${DESP[t]}: ${p}%`).join(", "))}">${partes.map(([t, p]) => `<i style="flex-basis:${p}%;background:${COR_DESP[t]}" title="${V.esc(DESP[t])}: ${p}%"></i>`).join("")}</div>
      <ul class="legenda">${partes.map(([t, p]) => `<li><i style="background:${COR_DESP[t]}"></i>${DESP[t]} <b>${p}%</b></li>`).join("")}</ul>
      <p class="pq-nota">Gasto total: ${V.brl(c[12])}. Valores da época, sem correção pela inflação.</p></section>`;
  }

  async function plano(id, cands, sel) {
    const cs = cands.filter((c) => c[14]).slice().reverse();
    let leg = [], indisponivel = false;
    try { leg = (await V.dados("br/pol/textos/" + (id % 64)))[id] || []; } catch (e) { indisponivel = true; }
    const opcoes = cs.map((c) => ({ titulo: `Plano · ${CARGO[c[1]]} ${c[0]}`, c })).concat(leg.filter((f) => f.palavras.length).map((f) => ({ titulo: `${f.titulo} · ${f.casa === "Senado Federal" ? "Senado" : "Câmara"}`, f })));
    const titulo = '<h2 class="cartao__titulo" id="pol-plano-tit">Nuvem de palavras deste candidato</h2>';
    const falha = indisponivel || leg.some((f) => f.estado !== "ok");
    const semPalavras = leg.some((f) => f.n > 0);
    if (!opcoes.length) return `<section class="cartao pol-cartao" aria-labelledby="pol-plano-tit">${titulo}
      <p class="vazio">${indisponivel ? "Não foi possível carregar os textos parlamentares. Recarregue a página para tentar novamente." : falha ? "A coleta dos textos parlamentares desta pessoa está incompleta." : semPalavras ? "Os textos encontrados não têm palavras suficientes após a remoção das expressões comuns." : "Não há texto disponível nas fontes consultadas para gerar a nuvem desta pessoa."}</p>
      <p class="pq-nota">Planos de governo do TSE: presidente, governador e prefeito, de 2018 a 2026. Atividade parlamentar: projetos e discursos da Câmara e do Senado, de 2019 a 2026, ligados pelo nome civil e nascimento. Textos de assembleias estaduais e câmaras municipais ainda não integram esta base.</p></section>`;
    const escolhido = opcoes[Math.min(sel, opcoes.length - 1)], { c, f } = escolhido;
    const pal = c ? ((await V.dados(ARQ_PAL(id)))[c[14]] || []) : f.palavras;
    const origem = c ? 'Fonte: TSE, plano de governo individual (PDF convertido em texto). Planos escaneados sem texto ficam de fora.' : `Fonte: ${V.esc(f.casa)}. ${V.int(f.n)} ${f.texto === "ementas" ? "ementas de projetos de autoria/coautoria" : f.texto === "resumos oficiais" ? "resumos oficiais de discursos" : "transcrições de discursos"}, de ${f.inicio.split("-").reverse().join("/")} a ${f.fim.split("-").reverse().join("/")}. <a href="${V.esc(f.url)}" target="_blank" rel="noopener noreferrer">Consultar fonte oficial</a>.`;
    return `<section class="cartao pol-cartao" aria-labelledby="pol-plano-tit">${titulo}
      <p class="cartao__sub">As 40 palavras mais frequentes nos textos desta pessoa, sem palavras comuns e expressões de protocolo. Quanto maior, mais vezes aparece. Cada fonte tem sua própria contagem.</p>
      ${opcoes.length > 1 ? `<div class="pq-vistas" role="group" aria-label="Fonte da nuvem">${opcoes.map((x, i) => `<button class="chip" type="button" data-plano="${i}" aria-pressed="${x === escolhido}">${V.esc(x.titulo)}</button>`).join("")}</div>` : `<p><b>${V.esc(escolhido.titulo)}</b></p>`}
      ${V.graf.nuvem(pal.map(([w, q]) => ({ w, q })), { rot: `Palavras desta pessoa: ${escolhido.titulo}`, cor: corNota(c ? c[4] : cands[cands.length - 1][4]) })}
      <p class="pq-nota pol-fonte">${origem}</p>${falha ? '<p class="aviso">A coleta parlamentar está incompleta; os textos disponíveis estão identificados acima.</p>' : ""}</section>`;
  }

  /* como votou no Plenário da Câmara */
  let VOTACOES = null;
  async function camara(cam, filtro, n) {
    VOTACOES = VOTACOES || (await V.dados("br/pol/cam/votacoes"));
    const t = V.norm(filtro || ""), lista = cam.v.slice().sort((a, b) => b[0] - a[0]).map(([i, v]) => ({ x: VOTACOES[i], v }))
      .filter(({ x }) => !t || V.norm(`${x[2] || ""} ${x[3]} ${x[4]}`).includes(t));
    const conta = (c) => cam.v.filter(([, v]) => v === c).length;
    const p = cam.pos || {};
    return `<div class="pol-cam__resumo"><ul class="pq-banco">
        <li><b>${V.int(cam.n)}</b><span>votações de mérito</span></li>
        <li><b>${cam.segue_partido != null ? V.pct(cam.segue_partido, 0) : "—"}</b><span>votos iguais à orientação do partido</span></li>
        <li><b>${cam.segue_governo != null ? V.pct(cam.segue_governo, 0) : "—"}</b><span>votos iguais à orientação do governo</span></li>
        <li><b>${nota(cam.nota != null ? cam.nota : p.bol != null ? p.bol : p.lula)}</b><span>lado pelo próprio voto${cam.nota == null ? ` (só no governo ${p.bol != null ? "Bolsonaro" : "Lula"})` : ""}</span></li>
      </ul>
      <p class="pq-nota">Sim: ${V.int(conta("S"))} · Não: ${V.int(conta("N"))} · Obstrução: ${V.int(conta("O"))} · Abstenção: ${V.int(conta("A"))}. Partidos na Câmara: ${cam.partidos.map((s) => V.esc(V.nomePartido(s))).join(", ")}.
        O lado pelo próprio voto põe cada deputado numa linha a partir de como ele votou (Sim ou Não) nas mesmas votações que os outros, na escala da nota dos partidos; é a média dos governos Bolsonaro e Lula, para que apoiar o governo da vez não conte como lado.</p></div>
      <p class="pol-cam__busca"><label for="pol-cam-filtro">Procurar votação</label><input id="pol-cam-filtro" type="search" value="${V.esc(filtro || "")}" placeholder="Tema, número ou palavra da ementa (ex.: PEC, reforma, armas)" autocomplete="off"></p>
      <p class="pq-nota" aria-live="polite">${t ? `${V.int(lista.length)} votações com "${V.esc(filtro)}".` : "Da mais recente para a mais antiga."}</p>
      <ol class="pol-votos">${lista.slice(0, n).map(({ x, v }) => { const [id, data, sg, ementa, descr, aprov, gov] = x, vv = VOTO[v] || VOTO["?"];
        return `<li><span class="pol-votos__data">${data.split("-").reverse().join("/")}</span>
          <span class="pol-votos__txt"><b>${V.esc(sg || "Votação")}</b> ${V.esc(ementa || descr)}<small>${V.esc(descr)}</small></span>
          <span class="pol-votos__voto"><span class="pol-voto ${vv[1]}">${vv[0]}</span><small>Governo: ${gov === "S" ? "Sim" : gov === "N" ? "Não" : gov === "O" ? "Obstrução" : gov === "L" ? "liberou" : "—"} · ${aprov ? "aprovada" : "rejeitada"}</small></span></li>`; }).join("")}</ol>
      ${lista.length > n ? `<p><button class="btn" type="button" data-mais="${n + 30}">Mostrar mais (${V.int(lista.length - n)} restantes)</button></p>` : ""}
      <p class="pq-nota">Fonte: Câmara dos Deputados, dados abertos (votações nominais do Plenário, 2019 a 2026). Ficam de fora requerimentos, recursos, preferências e redação final.</p>`;
  }

  /* ---------- página da busca: #/politicos ---------- */
  const itemBusca = (e, BR) => `<li><a href="#/politico/${e.id}"><span class="busca__ico" style="background:#5f6672">${V.esc(V.iniciais(e.civil))}</span>
    <span><b>${V.esc(V.titulo(e.urna || e.civil))}</b>${e.urna ? ` <small>${V.esc(V.titulo(e.civil))}</small>` : ""}<small>${V.esc(V.descrPol(e, BR))}</small></span></a></li>`;
  V.rota(/^\/politicos\/?$/, async function (main) {
    V.marcarNav("politicos");
    document.title = "Políticos · Voto a voto";
    const [BR, info] = await Promise.all([V.baseBR(), V.dados("br/pol/info").catch(() => null)]);
    main.innerHTML = `<div class="pagina pol">
      <header class="pq-cab"><h1 class="titulo-grande">Políticos</h1>
        <p class="pq-mais">A ficha de ${info ? V.int(info.pessoas) : "todos os"} candidatos de 1994 a 2026: cada eleição que disputou, por qual partido e de que lado ele estava, quantos votos teve, quanto arrecadou e gastou, os bens que declarou, as palavras de planos, projetos e discursos oficiais disponíveis e, para deputado federal, como votou na Câmara.</p></header>
      <div class="pol-busca" role="search" aria-label="Busca de políticos"><label for="pol-busca">Nome do político</label>
        <input id="pol-busca" type="search" autocomplete="off" spellcheck="false" placeholder="Nome civil ou nome na urna, pelo começo (ex.: Luiz Inácio, Tarcísio, Marina)"></div>
      <p class="pq-nota" id="pol-busca-res" aria-live="polite">Digite pelo menos 3 letras. A busca vai pelo começo do nome civil ou do nome na urna; para quem já venceu uma eleição, também pelo último sobrenome.</p>
      <ol class="pol-lista" id="pol-lista"></ol></div>`;
    const inp = document.getElementById("pol-busca"); let tmr;
    inp.addEventListener("input", () => { clearTimeout(tmr); tmr = setTimeout(async () => {
      const t = inp.value, r = await V.buscaPoliticos(t, 40);
      if (inp.value !== t) return;
      document.getElementById("pol-busca-res").textContent = chaveBusca(t).length < 3 ? "Digite pelo menos 3 letras." : r.length ? `${r.length === 40 ? "As 40 primeiras" : r.length} pessoas, da maior votação para a menor.` : "Ninguém com esse começo de nome.";
      document.getElementById("pol-lista").innerHTML = r.map((e) => itemBusca(e, BR)).join("");
    }, 150); });
    inp.focus();
  });

  V.rota(/^\/politico\/(\d+)$/, async function (main, idTxt) {
    const id = +idTxt;
    const [F, BR] = await Promise.all([V.dados(ARQ_F(id)), V.baseBR()]);
    const p = F && F[id];
    if (!p) throw new Error("Político não encontrado");
    const [nome, nasc, genero, cor, semTitulo, urnas, cands] = p, urnasVal = urnas.filter((u) => !semUrna(u));
    // votos na Câmara (2019 a 2026): procura para quem concorreu a deputado federal desde 2018 (suplente que assumiu também votou);
    // o aviso de ligação não encontrada só vale para quem foi eleito em 2018 ou 2022
    const eleitoDep = cands.some((c) => c[1] === 6 && (c[0] === 2018 || c[0] === 2022) && c[9] === "E");
    const cam = cands.some((c) => c[1] === 6 && c[0] >= 2018) ? ((await V.dados(ARQ_CAM(id)).catch(() => ({}))) || {})[id] : null;
    // foto: a da candidatura mais recente que tem foto do TSE
    const comSq = cands.filter((c) => c[18]).reverse();
    await Promise.all([...new Set(comSq.map((c) => c[0]))].map(V.carregarFotos));
    const cf = comSq.find((c) => V.temFoto(c[0], c[18])), ultima = cands[cands.length - 1];
    const ini = `<span class="iniciais" style="background:${corNota(ultima[4])};color:${V.textoSobre(corNota(ultima[4]))}">${V.esc(V.iniciais(nome))}</span>`;
    const vit = cands.filter((c) => c[9] === "E").length, anos = [...new Set(cands.map((c) => c[0]))];
    const fotos = await (FOTOS || (FOTOS = V.dados("br/pol/fotos").then((ids) => new Set(ids)).catch(() => new Set())));
    const foto = cf ? V.fotoOu(cf[0], cf[18], ini) : fotos.has(+id) ? `<img alt="" src="img/pol/${id % 100}/${id}.jpg" onerror="this.replaceWith(document.createRange().createContextualFragment(this.dataset.f))" data-f="${V.esc(ini)}">` : ini;
    const maior = cands.reduce((m, c) => ((c[7] || 0) > (m[7] || 0) ? c : m), cands[0]);
    // partidos na ordem em que passou por eles
    const trajeto = []; cands.forEach((c) => { const u = trajeto[trajeto.length - 1]; if (!u || u.sg !== c[3]) trajeto.push({ sg: c[3], de: c[0], ate: c[0] }); else u.ate = c[0]; });
    document.title = `${V.titulo(nome)} · Voto a voto`;
    let selGasto = 0, selPlano = 0, filtro = "", nVotos = 30;
    main.innerHTML = `<div class="pagina pol">
      <p class="pq-migalha"><a href="#/perguntas/q12">Histórico eleitoral</a> · <a href="#/perguntas">As perguntas</a></p>
      <header class="pol-cab">
        <div class="pol-foto">${foto}</div>
        <div><h1 class="pol-nome">${V.esc(V.titulo(nome))}</h1>
          <p class="pol-sub">${urnasVal.length ? `Na urna: ${urnasVal.map((u) => V.esc(V.titulo(u))).join(", ")}` : ""}${nasc ? ` · nasceu em ${nasc}` : ""}${genero ? ` · ${V.esc(genero.toLowerCase())}` : ""}${cor && !/^#|N[ÃA]O INFORMADO|N[ÃA]O DIVULG/i.test(cor) ? ` · cor ou raça declarada: ${V.esc(cor.toLowerCase())}` : ""}</p>
          <ul class="pq-banco pol-banco">
            <li><b>${cands.length}</b><span>${cands.length === 1 ? "candidatura" : "candidaturas"}</span></li>
            <li><b>${vit}</b><span>${vit === 1 ? "vitória" : "vitórias"}</span></li>
            <li><b>${anos[0]}${anos.length > 1 ? "–" + anos[anos.length - 1] : ""}</b><span>${anos.length} ${anos.length === 1 ? "eleição" : "eleições"}</span></li>
            <li><b>${maior[7] ? V.int(maior[7]) : "—"}</b><span>maior votação (${CARGO[maior[1]]} ${maior[0]})</span></li>
          </ul>
          <p class="pol-carta-btn"><button type="button" class="btn" id="pol-carta">Ver como carta</button></p></div>
      </header>
      ${semTitulo ? '<p class="aviso">O arquivo do TSE não trouxe o título de eleitor desta candidatura (acontece em 1996 e em registros incompletos). Sem ele, não dá para ligar com certeza as candidaturas desta pessoa em outros anos, que podem estar em outra ficha.</p>' : ""}
      <section class="cartao pol-cartao" aria-labelledby="pol-lado-tit"><h2 class="cartao__titulo" id="pol-lado-tit">Lado político</h2>
        <p class="cartao__sub">A nota do partido em cada eleição em que concorreu, de −1 (esquerda) a +1 (direita), pela régua do site, que junta três estudos acadêmicos e o voto das bancadas na Câmara.${cam && cam.nota != null ? " O losango preto é a posição dele pelo próprio voto como deputado federal." : ""}</p>
        ${regua(cands, cam)}
        <p class="pol-trajeto"><b>Partidos:</b> ${trajeto.map((t) => `${partido(t.sg, (cands.find((c) => c[3] === t.sg && c[0] === t.ate) || [])[4])} <small>${t.de === t.ate ? t.de : t.de + "–" + t.ate}</small>`).join(" → ")}</p>
        <p class="pq-nota">A nota é do partido, não da pessoa: diz o lado da legenda pela qual concorreu, na época. <a href="#/partidos">Como a nota de cada partido é feita</a>.</p></section>
      <div id="pol-plano">${await plano(id, cands, selPlano)}</div>
      <section class="cartao pol-cartao" aria-labelledby="pol-hist-tit"><h2 class="cartao__titulo" id="pol-hist-tit">Histórico eleitoral</h2>
        <p class="cartao__sub">Todas as candidaturas de 1994 a 2026, da mais recente para a mais antiga. Votos nominais; dinheiro e bens declarados ao TSE (prestação de contas desde 2010, bens desde 2006), em valores da época.</p>
        ${historico(cands, urnas, BR)}</section>
      <div id="pol-gasto">${gastos(cands, selGasto)}</div>
      ${cam ? `<section class="cartao pol-cartao pol-cam" aria-labelledby="pol-cam-tit"><h2 class="cartao__titulo" id="pol-cam-tit">Como votou na Câmara</h2>
        <p class="cartao__sub">O voto dele em cada votação nominal de mérito do Plenário, com a orientação do governo e o resultado.</p>
        <div id="pol-cam">${await camara(cam, filtro, nVotos)}</div></section>` : eleitoDep ? '<p class="aviso">Os votos na Câmara começam em 2019 e são ligados ao TSE pelo nome civil e pela data de nascimento; para esta pessoa a ligação não foi encontrada.</p>' : ""}
      <details class="pq-origem"><summary>De onde vêm esses números</summary>
        <p>Candidaturas, votos, situação final, receitas, despesas e bens: TSE, Portal de Dados Abertos, no banco nacional do trabalho (tabelas <code>pessoa</code>, <code>candidatura</code>, <code>votacao_candidato</code>, <code>receita</code>, <code>despesa</code>, <code>bem_candidato</code>, <code>proposta_palavra</code> e as views <code>vw_partido_ano</code> e <code>vw_despesa_tipo</code>). A mesma pessoa é seguida entre eleições pelo título de eleitor, que não aparece no site. A consulta q12d, em <a href="#/perguntas/q12">Histórico eleitoral</a>, é a desta ficha.${cam ? " Votos na Câmara: tabelas <code>votacao_camara</code>, <code>voto_deputado</code>, <code>orientacao_bancada</code> e <code>deputado_camara</code>." : ""}</p></details>
    </div>`;
    // a carta colecionável (js/carta.js), com o que a ficha já calculou
    document.getElementById("pol-carta").addEventListener("click", (e) => {
      const img = main.querySelector(".pol-foto img"), bens = cands.filter((c) => c[13] != null).pop();
      V.abrirCarta({ nome: V.titulo(nome), urna: urnasVal.length ? V.titulo(urnasVal[urnasVal.length - 1]) : "", foto: img && img.naturalWidth ? img.src : null, iniciais: V.iniciais(nome),
        partido: ultima[3], nota: ultima[4], cargo: CARGO[ultima[1]] || "Candidato", ano: ultima[0], situacao: (SIT[ultima[9]] || SIT["-"])[0],
        votos: maior[7] || 0, cargoMaior: `${CARGO[maior[1]] || "Candidato"} ${maior[0]}`, vitorias: vit, eleicoes: anos.length,
        periodo: anos[0] + (anos.length > 1 ? "–" + anos[anos.length - 1] : ""), bens: bens ? [bens[13], bens[0]] : null,
        eleicoes_lista: cands.map((c) => [c[0], CARGO[c[1]] || "Candidato", (SIT[c[9]] || SIT["-"])[0]]),
        trajeto: trajeto.map((t) => [t.sg, t.de, t.ate, (cands.find((c) => c[3] === t.sg && c[0] === t.ate) || [])[4]]) }, e.currentTarget);
    });
    // trocas de recorte sem redesenhar a página toda
    main.querySelector(".pol").addEventListener("click", async (e) => {
      const g = e.target.closest("[data-gasto]"), pl = e.target.closest("[data-plano]"), mais = e.target.closest("[data-mais]");
      if (g) { selGasto = +g.dataset.gasto; document.getElementById("pol-gasto").innerHTML = gastos(cands, selGasto); }
      if (pl) { selPlano = +pl.dataset.plano; document.getElementById("pol-plano").innerHTML = await plano(id, cands, selPlano); }
      if (mais) { nVotos = +mais.dataset.mais; document.getElementById("pol-cam").innerHTML = await camara(cam, filtro, nVotos); }
    });
    let tmr;
    main.querySelector(".pol").addEventListener("input", (e) => {
      if (e.target.id !== "pol-cam-filtro") return;
      clearTimeout(tmr); tmr = setTimeout(async () => {
        filtro = e.target.value; nVotos = 30;
        document.getElementById("pol-cam").innerHTML = await camara(cam, filtro, nVotos);
        const f = document.getElementById("pol-cam-filtro"); f.focus(); f.setSelectionRange(f.value.length, f.value.length);
      }, 200);
    });
  });
})();
