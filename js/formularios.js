/* Voto a voto — Formulários e relatórios: o protótipo do sistema sobre o modelo relacional (o que a disciplina pede
   no projeto final, no lugar do Access). Usa uma amostra real do banco nacional (data/br/form/base, feita por
   scripts/formularios_amostra.py): as eleições municipais de 2020 e 2024 em Teresina.

   Os formulários fazem INSERT, UPDATE e DELETE nessa amostra com as mesmas regras do banco: chave primária, UNIQUE,
   chave estrangeira (com ON DELETE RESTRICT) e CHECK. Cada operação mostra o comando SQL equivalente. O que a pessoa
   muda fica só no navegador dela (localStorage, como uma lista de operações aplicada sobre a amostra) e pode ser
   desfeito com "Restaurar os dados originais". */
(function () {
  "use strict";
  const V = window.V;
  const CHAVE = "vav-form-ops";

  /* ---------- o esquema: as mesmas tabelas, chaves e restrições do modelo relacional ---------- */
  const GENEROS = ["FEMININO", "MASCULINO", "NÃO DIVULGÁVEL"];
  const ESQ = {
    partido: { rot: "Partidos", um: "partido", pk: ["id_partido"], auto: "id_partido", mostra: (r) => `${r.sg_partido} (${r.nr_partido})`,
      ordem: (a, b) => a.sg_partido.localeCompare(b.sg_partido),
      cols: [
        { n: "id_partido", rot: "Código", tipo: "int", auto: true },
        { n: "nr_partido", rot: "Número", tipo: "int", obrig: true, min: 10, max: 99, unico: true, ajuda: "Dois dígitos, de 10 a 99 (o número na urna)." },
        { n: "sg_partido", rot: "Sigla", tipo: "txt", obrig: true, max: 20, unico: true, maiusc: true },
        { n: "nm_partido", rot: "Nome", tipo: "txt", obrig: true, max: 120, maiusc: true }] },
    pessoa: { rot: "Pessoas", um: "pessoa", pk: ["id_pessoa"], auto: "id_pessoa", mostra: (r) => V.titulo(r.nm_pessoa),
      ordem: (a, b) => a.nm_pessoa.localeCompare(b.nm_pessoa),
      cols: [
        { n: "id_pessoa", rot: "Código", tipo: "int", auto: true },
        { n: "nm_pessoa", rot: "Nome civil", tipo: "txt", obrig: true, max: 120, maiusc: true },
        { n: "dt_nascimento", rot: "Nascimento", tipo: "data", obrig: true, entre: ["1900-01-01", "2008-12-31"], ajuda: "Precisa ter pelo menos 16 anos." },
        { n: "ds_genero", rot: "Gênero", tipo: "opcao", obrig: true, opcoes: GENEROS },
        { n: "nr_titulo_ficticio", rot: "Título de eleitor", tipo: "txt", obrig: true, padrao: /^\d{12}$/, unico: true, ajuda: "12 dígitos. Na amostra o título é fictício: o verdadeiro não sai do banco." }] },
    candidatura: { rot: "Candidaturas", um: "candidatura", pk: ["id_candidatura"], auto: "id_candidatura", mostra: (r) => `${V.titulo(r.nm_urna)} · ${r.nr_candidato}`,
      ordem: (a, b) => b.id_eleicao - a.id_eleicao || a.cd_cargo - b.cd_cargo || a.nm_urna.localeCompare(b.nm_urna),
      unicos: [[["id_eleicao", "cd_municipio_tse", "nr_candidato"], "Já existe um candidato com esse número nessa eleição e cidade."],
               [["id_pessoa", "id_eleicao"], "Essa pessoa já tem uma candidatura nessa eleição."]],
      cols: [
        { n: "id_candidatura", rot: "Código", tipo: "int", auto: true },
        { n: "id_pessoa", rot: "Pessoa", tipo: "fk", ref: "pessoa", obrig: true },
        { n: "id_eleicao", rot: "Eleição", tipo: "fk", ref: "eleicao", obrig: true },
        { n: "cd_cargo", rot: "Cargo", tipo: "fk", ref: "cargo", obrig: true },
        { n: "id_partido", rot: "Partido", tipo: "fk", ref: "partido", obrig: true },
        { n: "cd_municipio_tse", rot: "Município", tipo: "fk", ref: "municipio", obrig: true },
        { n: "nr_candidato", rot: "Número", tipo: "int", obrig: true, min: 10, max: 99999, ajuda: "Prefeito: o número do partido (2 dígitos). Vereador: 5 dígitos, começando pelo número do partido." },
        { n: "nm_urna", rot: "Nome na urna", tipo: "txt", obrig: true, max: 60, maiusc: true },
        { n: "nr_idade_posse", rot: "Idade na posse", tipo: "int", min: 18, max: 110 },
        { n: "cd_grau_instrucao", rot: "Escolaridade", tipo: "fk", ref: "grau_instrucao" },
        { n: "id_situacao", rot: "Situação", tipo: "fk", ref: "situacao_totalizacao" }],
      // CHECK que depende de mais de uma coluna: o número tem de combinar com o partido e o cargo
      verifica: (r, db) => {
        const p = db.partido.find((x) => x.id_partido === r.id_partido), n = String(r.nr_candidato);
        if (p && r.cd_cargo === 11 && n !== String(p.nr_partido)) return `Para prefeito, o número é o do partido: ${p.nr_partido}.`;
        if (p && r.cd_cargo === 13 && (n.length !== 5 || !n.startsWith(String(p.nr_partido)))) return `Para vereador, o número tem 5 dígitos e começa com ${p.nr_partido} (o número do ${p.sg_partido}).`;
        if (r.nr_idade_posse != null && r.cd_cargo === 11 && r.nr_idade_posse < 21) return "Para prefeito, a idade mínima na posse é 21 anos.";
        return null;
      } },
    votacao_candidato: { rot: "Votação", um: "votação", pk: ["id_candidatura", "nr_turno"], mostra: (r, db) => { const c = db.candidatura.find((x) => x.id_candidatura === r.id_candidatura); return `${c ? V.titulo(c.nm_urna) : r.id_candidatura} · ${r.nr_turno}º turno`; },
      ordem: (a, b) => a.id_candidatura - b.id_candidatura || a.nr_turno - b.nr_turno,
      cols: [
        { n: "id_candidatura", rot: "Candidatura", tipo: "fk", ref: "candidatura", obrig: true, chave: true },
        { n: "nr_turno", rot: "Turno", tipo: "int", obrig: true, min: 1, max: 2, chave: true },
        { n: "qt_votos", rot: "Votos", tipo: "int", obrig: true, min: 0 }],
      verifica: (r, db) => { const c = db.candidatura.find((x) => x.id_candidatura === r.id_candidatura); return c && c.cd_cargo === 13 && r.nr_turno === 2 ? "Vereador não tem 2º turno." : null; } },
  };
  // tabelas de apoio (só leitura nos formulários): o que aparece nas listas de escolha
  const APOIO = { eleicao: ["id_eleicao", (r) => r.ds_eleicao], cargo: ["cd_cargo", (r) => V.titulo(r.ds_cargo)], municipio: ["cd_municipio_tse", (r) => r.nm_municipio],
    grau_instrucao: ["cd_grau_instrucao", (r) => V.titulo(r.ds_grau_instrucao)], situacao_totalizacao: ["id_situacao", (r) => V.titulo(r.ds_sit_tot_turno)], pessoa: ["id_pessoa", (r) => V.titulo(r.nm_pessoa)],
    partido: ["id_partido", (r) => `${r.sg_partido} (${r.nr_partido})`], candidatura: ["id_candidatura", (r) => `${V.titulo(r.nm_urna)} (${r.nr_candidato})`] };
  // quem aponta para quem: o que impede um DELETE (ON DELETE RESTRICT)
  const FILHOS = { partido: [["candidatura", "id_partido"]], pessoa: [["candidatura", "id_pessoa"]], candidatura: [["votacao_candidato", "id_candidatura"]] };

  /* ---------- o banco na memória ---------- */
  let DB = null, BASE = null, OPS = [];
  const objetos = (t) => t.linhas.map((l) => Object.fromEntries(t.colunas.map((c, i) => [c, l[i]])));
  const lerOps = () => { try { return JSON.parse(localStorage.getItem(CHAVE) || "[]"); } catch (e) { return []; } };
  const gravarOps = () => { try { localStorage.setItem(CHAVE, JSON.stringify(OPS)); } catch (e) {} };
  async function abrir() {
    if (!BASE) BASE = await V.dados("br/form/base");
    DB = Object.fromEntries(Object.keys(BASE).filter((k) => BASE[k].colunas).map((k) => [k, objetos(BASE[k])]));
    OPS = [];
    for (const op of lerOps()) { try { aplicar(op, true); } catch (e) { /* operação que não vale mais: fica de fora */ } }
    gravarOps();
  }
  const chaveDe = (t, r) => ESQ[t].pk.map((c) => r[c]).join("|");
  const achar = (t, k) => DB[t].find((r) => chaveDe(t, r) === k);

  /* ---------- as regras: devolve a mensagem do erro (como o SGBD) ou null ---------- */
  function validar(t, r, kAntiga) {
    const E = ESQ[t];
    for (const c of E.cols) {
      const v = r[c.n];
      if (c.auto) continue;
      if (v == null || v === "") { if (c.obrig) return `“${c.rot}” é obrigatório (NOT NULL).`; continue; }
      if (c.tipo === "int" && !Number.isInteger(v)) return `“${c.rot}” precisa ser um número inteiro.`;
      if (c.min != null && v < c.min) return `“${c.rot}” não pode ser menor que ${c.min} (CHECK).`;
      if (c.max != null && c.tipo === "int" && v > c.max) return `“${c.rot}” não pode ser maior que ${c.max} (CHECK).`;
      if (c.max != null && c.tipo === "txt" && String(v).length > c.max) return `“${c.rot}” tem no máximo ${c.max} letras (VARCHAR(${c.max})).`;
      if (c.padrao && !c.padrao.test(String(v))) return `“${c.rot}” não está no formato certo. ${c.ajuda || ""}`;
      if (c.entre && (v < c.entre[0] || v > c.entre[1])) return `“${c.rot}” fora do intervalo permitido (CHECK). ${c.ajuda || ""}`;
      if (c.opcoes && !c.opcoes.includes(v)) return `“${c.rot}” precisa ser uma das opções.`;
      if (c.tipo === "fk") { const [pk] = APOIO[c.ref]; if (!DB[c.ref].some((x) => x[pk] === v)) return `Não existe ${c.ref} com ${pk} = ${v} (FOREIGN KEY).`; }
      if (c.unico) { const outro = DB[t].find((x) => x[c.n] === v && chaveDe(t, x) !== kAntiga); if (outro) return `Já existe ${E.um} com ${c.rot.toLowerCase()} = ${v}: ${E.mostra(outro, DB)} (UNIQUE).`; }
    }
    const k = chaveDe(t, r);
    if (k !== kAntiga && achar(t, k)) return `Já existe ${E.um} com essa chave primária (${E.pk.join(", ")} = ${k.replace("|", ", ")}).`;
    for (const [cols, msg] of E.unicos || []) {
      const outro = DB[t].find((x) => cols.every((c) => x[c] === r[c]) && chaveDe(t, x) !== kAntiga);
      if (outro) return `${msg} (UNIQUE em ${cols.join(", ")}: ${E.mostra(outro, DB)}).`;
    }
    return E.verifica ? E.verifica(r, DB) : null;
  }
  function filhosDe(t, r) {
    const pk = ESQ[t].pk[0];
    return (FILHOS[t] || []).map(([ft, fc]) => [ft, DB[ft].filter((x) => x[fc] === r[pk]).length]).filter(([, n]) => n);
  }

  /* ---------- o comando SQL equivalente a cada operação ---------- */
  const lit = (v) => (v == null || v === "" ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  function sql(op) {
    const E = ESQ[op.t], onde = (r) => E.pk.map((c) => `${c} = ${lit(r[c])}`).join(" AND ");
    if (op.op === "ins") { const cs = E.cols.map((c) => c.n).filter((c) => op.r[c] != null); return `INSERT INTO ${op.t} (${cs.join(", ")})\nVALUES (${cs.map((c) => lit(op.r[c])).join(", ")});`; }
    if (op.op === "upd") { const m = E.cols.map((c) => c.n).filter((c) => op.r[c] !== op.antes[c]); return `UPDATE ${op.t}\nSET ${m.map((c) => `${c} = ${lit(op.r[c])}`).join(", ") || E.pk.map((c) => `${c} = ${c}`).join(", ")}\nWHERE ${onde(op.antes)};`; }
    return `DELETE FROM ${op.t}\nWHERE ${onde(op.antes)};`;
  }

  /* aplica uma operação (as que vêm do localStorage passam pelas mesmas regras) */
  function aplicar(op, repetindo) {
    const t = op.t, E = ESQ[t];
    if (op.op === "ins") {
      if (E.auto && op.r[E.auto] == null) op.r[E.auto] = Math.max(0, ...DB[t].map((x) => x[E.auto])) + 1;   // AUTO_INCREMENT
      const erro = validar(t, op.r, null); if (erro) throw new Error(erro);
      DB[t].push({ ...op.r });
    } else {
      const k = op.k, atual = achar(t, k);
      if (!atual) throw new Error("O registro não existe mais.");
      op.antes = { ...atual };
      if (op.op === "upd") {
        const erro = validar(t, op.r, k); if (erro) throw new Error(erro);
        if (chaveDe(t, op.r) !== k) { const f = filhosDe(t, atual); if (f.length) throw new Error(`A chave não pode mudar: há registros ligados em ${f.map(([ft, n]) => `${ft} (${n})`).join(", ")}.`); }
        Object.assign(atual, op.r);
      } else {
        const f = filhosDe(t, atual);
        if (f.length) throw new Error(`Não dá para excluir: ${f.map(([ft, n]) => `${V.int(n)} ${n === 1 ? "registro" : "registros"} em ${ft}`).join(" e ")} ${f.reduce((s, [, n]) => s + n, 0) === 1 ? "aponta" : "apontam"} para ele (FOREIGN KEY ... ON DELETE RESTRICT). Exclua ou mude esses registros antes.`);
        DB[t].splice(DB[t].indexOf(atual), 1);
      }
    }
    OPS.push({ op: op.op, t, k: op.k, r: op.r, antes: op.antes, quando: op.quando || new Date().toISOString() });
    if (!repetindo) gravarOps();
    return op;
  }

  /* ---------- tela ---------- */
  const ABAS = [["candidatura", "Candidaturas"], ["pessoa", "Pessoas"], ["partido", "Partidos"], ["votacao_candidato", "Votação"], ["relatorios", "Relatórios"], ["registro", "Alterações"]];
  let ESTADO = { aba: "candidatura", k: null, novo: false, busca: "", filtro: { eleicao: "", cargo: "" } };
  const esc = V.esc;
  const nomeFk = (ref, v) => { if (v == null) return "—"; const [pk, f] = APOIO[ref], r = DB[ref].find((x) => x[pk] === v); return r ? f(r) : `(${v} não existe)`; };

  function listaFiltrada(t) {
    const E = ESQ[t], b = V.norm(ESTADO.busca);
    let ls = DB[t].slice();
    if (t === "candidatura") {
      if (ESTADO.filtro.eleicao) ls = ls.filter((r) => r.id_eleicao === +ESTADO.filtro.eleicao);
      if (ESTADO.filtro.cargo) ls = ls.filter((r) => r.cd_cargo === +ESTADO.filtro.cargo);
    }
    if (b) ls = ls.filter((r) => V.norm(E.mostra(r, DB) + " " + Object.values(r).join(" ")).includes(b));
    return ls.sort(E.ordem);
  }

  function campoHTML(c, r, novo) {
    const v = r ? r[c.n] : null, id = "f-" + c.n, des = c.auto || (c.chave && !novo) ? " disabled" : "";
    const rot = `<label for="${id}">${c.rot}${c.obrig ? ' <span class="form-obrig" aria-hidden="true">*</span>' : ""}</label>`;
    const ajuda = c.ajuda ? `<small id="${id}-ajuda">${c.ajuda}</small>` : "";
    const desc = c.ajuda ? ` aria-describedby="${id}-ajuda"` : "";
    let input;
    if (c.auto) input = `<input id="${id}" value="${v == null ? "(gerado ao salvar)" : v}" disabled>`;
    else if (c.tipo === "fk" || c.opcoes) {
      const opts = c.opcoes ? c.opcoes.map((o) => [o, V.titulo(o)]) : DB[c.ref].map((x) => [x[APOIO[c.ref][0]], APOIO[c.ref][1](x)]).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
      input = `<select id="${id}" data-col="${c.n}"${des}${desc}${c.obrig ? " required" : ""}><option value="">${c.obrig ? "Escolha…" : "(vazio)"}</option>${opts.map(([val, t]) => `<option value="${esc(val)}"${val === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
    } else input = `<input id="${id}" data-col="${c.n}" type="${c.tipo === "int" ? "number" : c.tipo === "data" ? "date" : "text"}" value="${v == null ? "" : esc(v)}"${des}${desc}${c.obrig ? " required" : ""}${c.tipo === "txt" && c.max ? ` maxlength="${c.max}"` : ""}>`;
    return `<div class="form-campo">${rot}${input}${ajuda}</div>`;
  }

  function lerForm(t) {
    const E = ESQ[t], r = {};
    for (const c of E.cols) {
      if (c.auto) continue;
      const el = document.getElementById("f-" + c.n); if (!el) continue;
      let v = el.value.trim();
      if (v === "") { r[c.n] = null; continue; }
      if (c.tipo === "int" || (c.tipo === "fk" && /^-?\d+$/.test(v))) v = Number(v);
      if (c.maiusc && typeof v === "string") v = v.toUpperCase();
      r[c.n] = v;
    }
    return r;
  }

  function painelTabela(t) {
    const E = ESQ[t], ls = listaFiltrada(t);
    if (ESTADO.k == null && !ESTADO.novo && ls.length) ESTADO.k = chaveDe(t, ls[0]);
    const i = ls.findIndex((r) => chaveDe(t, r) === ESTADO.k), r = ESTADO.novo ? null : ls[i] || null;
    const filtros = t === "candidatura" ? `<label>Eleição <select data-filtro="eleicao"><option value="">Todas</option>${DB.eleicao.map((e) => `<option value="${e.id_eleicao}"${String(e.id_eleicao) === ESTADO.filtro.eleicao ? " selected" : ""}>${e.nr_ano_eleicao}</option>`).join("")}</select></label>
      <label>Cargo <select data-filtro="cargo"><option value="">Todos</option>${DB.cargo.map((c) => `<option value="${c.cd_cargo}"${String(c.cd_cargo) === ESTADO.filtro.cargo ? " selected" : ""}>${V.titulo(c.ds_cargo)}</option>`).join("")}</select></label>` : "";
    const votos = t === "candidatura" && r ? DB.votacao_candidato.filter((v) => v.id_candidatura === r.id_candidatura) : [];
    return `<div class="form-grade">
      <section class="form-lista" aria-label="${E.rot}: lista">
        <div class="form-filtros"><label>Procurar <input type="search" id="form-busca" value="${esc(ESTADO.busca)}" placeholder="Nome, número, sigla…"></label>${filtros}</div>
        <p class="form-conta">${V.int(ls.length)} ${ls.length === 1 ? "registro" : "registros"}</p>
        <ol class="form-itens">${ls.slice(0, 200).map((x) => { const k = chaveDe(t, x); return `<li><button type="button" data-k="${esc(k)}" aria-current="${k === ESTADO.k && !ESTADO.novo}">${esc(E.mostra(x, DB))}${t === "candidatura" ? `<small>${esc(nomeFk("eleicao", x.id_eleicao).replace("Eleições Municipais ", ""))} · ${esc(nomeFk("cargo", x.cd_cargo))} · ${esc(nomeFk("partido", x.id_partido).split(" ")[0])}</small>` : ""}</button></li>`; }).join("")}</ol>
        ${ls.length > 200 ? '<p class="form-conta">Mostrando os 200 primeiros; use a busca ou os filtros.</p>' : ""}
      </section>
      <section class="form-ficha" aria-labelledby="form-ficha-tit">
        <div class="form-nav" role="group" aria-label="Navegar nos registros">
          <button type="button" data-ir="0" aria-label="Primeiro registro"${i <= 0 || ESTADO.novo ? " disabled" : ""}>|◀</button>
          <button type="button" data-ir="${i - 1}" aria-label="Registro anterior"${i <= 0 || ESTADO.novo ? " disabled" : ""}>◀</button>
          <span>${ESTADO.novo ? "Novo registro" : ls.length ? `${V.int(i + 1)} de ${V.int(ls.length)}` : "Nenhum registro"}</span>
          <button type="button" data-ir="${i + 1}" aria-label="Próximo registro"${i >= ls.length - 1 || ESTADO.novo ? " disabled" : ""}>▶</button>
          <button type="button" data-ir="${ls.length - 1}" aria-label="Último registro"${i >= ls.length - 1 || ESTADO.novo ? " disabled" : ""}>▶|</button>
        </div>
        <h2 class="pq-painel__tit" id="form-ficha-tit">${ESTADO.novo ? `Novo registro em ${t}` : r ? esc(E.mostra(r, DB)) : "Escolha um registro"}</h2>
        <form id="form-ficha" novalidate>
          <div class="form-campos">${E.cols.map((c) => campoHTML(c, ESTADO.novo ? { cd_municipio_tse: BASE.cidade.cd_municipio_tse, id_eleicao: DB.eleicao[DB.eleicao.length - 1].id_eleicao } : r, ESTADO.novo)).join("")}</div>
          <p class="form-msg" id="form-msg" role="status" aria-live="polite"></p>
          <div class="form-botoes">
            <button type="submit" class="btn btn--confirma">${ESTADO.novo ? "Incluir" : "Salvar alterações"}</button>
            ${ESTADO.novo ? '<button type="button" class="btn" data-acao="cancelar">Cancelar</button>' : `<button type="button" class="btn" data-acao="novo">Novo</button>${r ? '<button type="button" class="btn btn--perigo" data-acao="excluir">Excluir</button>' : ""}`}
          </div>
        </form>
        ${t === "candidatura" && r ? `<div class="form-sub"><h3>Votação desta candidatura <small>(tabela votacao_candidato)</small></h3>
          ${votos.length ? `<table><thead><tr><th scope="col">Turno</th><th scope="col" class="num">Votos</th></tr></thead><tbody>${votos.map((v) => `<tr><td>${v.nr_turno}º</td><td class="num">${V.int(v.qt_votos)}</td></tr>`).join("")}</tbody></table>` : "<p>Nenhum voto lançado.</p>"}
          <p><a href="#/formularios/votacao_candidato" data-votos="${r.id_candidatura}">Lançar ou corrigir votos</a></p></div>` : ""}
        <details class="form-sql" id="form-sql-box"><summary>Comando SQL equivalente</summary><pre><code id="form-sql">${OPS.length ? esc(sql(OPS[OPS.length - 1])) : "Nenhuma alteração ainda."}</code></pre></details>
      </section></div>`;
  }

  /* ---------- relatórios ---------- */
  const votosDe = (id, turno = 1) => (DB.votacao_candidato.find((v) => v.id_candidatura === id && v.nr_turno === turno) || {}).qt_votos || 0;
  const eleito = (r) => (DB.situacao_totalizacao.find((s) => s.id_situacao === r.id_situacao) || {}).fl_eleito;
  const RELS = {
    resultado: { rot: "Resultado da eleição", params: ["eleicao", "cargo"], fazer: ({ eleicao, cargo }) => {
      const ls = DB.candidatura.filter((r) => r.id_eleicao === eleicao && r.cd_cargo === cargo).map((r) => ({ r, v: votosDe(r.id_candidatura) })).sort((a, b) => b.v - a.v);
      const tot = ls.reduce((s, x) => s + x.v, 0), el = ls.filter((x) => eleito(x.r));
      return { tit: `Resultado: ${V.titulo(nomeFk("cargo", cargo))}, ${nomeFk("eleicao", eleicao)}`, resumo: `${V.int(ls.length)} candidaturas · ${V.int(el.length)} ${el.length === 1 ? "eleito" : "eleitos"} · ${V.int(tot)} votos nominais no 1º turno`,
        cols: ["#", "Nome na urna", "Número", "Partido", "Votos (1º turno)", "% dos votos", "Situação"],
        linhas: ls.map((x, i) => [i + 1, V.titulo(x.r.nm_urna), x.r.nr_candidato, nomeFk("partido", x.r.id_partido).split(" ")[0], V.int(x.v), V.pct(tot ? (100 * x.v) / tot : 0, 2), nomeFk("situacao_totalizacao", x.r.id_situacao)]),
        destaque: ls.map((x) => !!eleito(x.r)) };
    } },
    partidos: { rot: "Candidatos e votos por partido", params: ["eleicao", "cargo"], fazer: ({ eleicao, cargo }) => {
      const g = new Map();
      for (const r of DB.candidatura.filter((x) => x.id_eleicao === eleicao && x.cd_cargo === cargo)) {
        const o = g.get(r.id_partido) || { n: 0, e: 0, v: 0, m: 0 }; o.n++; o.e += eleito(r) ? 1 : 0; o.v += votosDe(r.id_candidatura); if (r.cd_grau_instrucao === 8) o.m++; g.set(r.id_partido, o);
      }
      const tot = [...g.values()].reduce((s, o) => s + o.v, 0), ls = [...g].sort((a, b) => b[1].v - a[1].v);
      return { tit: `Partidos: ${V.titulo(nomeFk("cargo", cargo))}, ${nomeFk("eleicao", eleicao)}`, resumo: `${ls.length} partidos · ${V.int(tot)} votos nominais`,
        cols: ["Partido", "Candidatos", "Eleitos", "Votos", "% dos votos", "Com curso superior"],
        linhas: ls.map(([p, o]) => [nomeFk("partido", p), o.n, o.e, V.int(o.v), V.pct(tot ? (100 * o.v) / tot : 0, 1), V.pct((100 * o.m) / o.n, 0)]),
        total: ["Total", ls.reduce((s, [, o]) => s + o.n, 0), ls.reduce((s, [, o]) => s + o.e, 0), V.int(tot), "100%", ""] };
    } },
    perfil: { rot: "Perfil dos candidatos e dos eleitos", params: ["eleicao", "cargo"], fazer: ({ eleicao, cargo }) => {
      const cs = DB.candidatura.filter((x) => x.id_eleicao === eleicao && x.cd_cargo === cargo), linhas = [];
      const grupo = (rot, chave, nomes) => { for (const [k, nome] of nomes) { const g = cs.filter((r) => chave(r) === k), e = g.filter(eleito); if (g.length) linhas.push([rot, nome, g.length, e.length, V.pct((100 * e.length) / g.length, 1)]); } };
      grupo("Gênero", (r) => (DB.pessoa.find((p) => p.id_pessoa === r.id_pessoa) || {}).ds_genero, GENEROS.map((g) => [g, V.titulo(g)]));
      grupo("Escolaridade", (r) => r.cd_grau_instrucao, DB.grau_instrucao.map((g) => [g.cd_grau_instrucao, V.titulo(g.ds_grau_instrucao)]));
      grupo("Idade na posse", (r) => (r.nr_idade_posse == null ? null : r.nr_idade_posse < 30 ? 1 : r.nr_idade_posse < 45 ? 2 : r.nr_idade_posse < 60 ? 3 : 4), [[1, "Até 29 anos"], [2, "30 a 44"], [3, "45 a 59"], [4, "60 ou mais"]]);
      return { tit: `Perfil: ${V.titulo(nomeFk("cargo", cargo))}, ${nomeFk("eleicao", eleicao)}`, resumo: `${V.int(cs.length)} candidaturas`, cols: ["Grupo", "", "Candidatos", "Eleitos", "Taxa de sucesso"], linhas };
    } },
    ficha: { rot: "Ficha do candidato", params: ["candidatura"], fazer: ({ candidatura }) => {
      const c = DB.candidatura.find((x) => x.id_candidatura === candidatura); if (!c) return { tit: "Ficha do candidato", resumo: "Escolha uma candidatura.", cols: [], linhas: [] };
      const p = DB.pessoa.find((x) => x.id_pessoa === c.id_pessoa) || {}, todas = DB.candidatura.filter((x) => x.id_pessoa === c.id_pessoa);
      return { tit: `Ficha: ${V.titulo(p.nm_pessoa || c.nm_urna)}`, resumo: `Nascimento: ${p.dt_nascimento ? p.dt_nascimento.split("-").reverse().join("/") : "—"} · ${V.titulo(p.ds_genero || "")} · Nome na urna: ${V.titulo(c.nm_urna)}`,
        cols: ["Eleição", "Cargo", "Partido", "Número", "Escolaridade", "Votos 1º turno", "Votos 2º turno", "Situação"],
        linhas: todas.map((x) => [nomeFk("eleicao", x.id_eleicao), nomeFk("cargo", x.cd_cargo), nomeFk("partido", x.id_partido), x.nr_candidato, nomeFk("grau_instrucao", x.cd_grau_instrucao), V.int(votosDe(x.id_candidatura)), votosDe(x.id_candidatura, 2) ? V.int(votosDe(x.id_candidatura, 2)) : "—", nomeFk("situacao_totalizacao", x.id_situacao)]) };
    } },
  };
  let REL = { id: "resultado", eleicao: null, cargo: 13, candidatura: null };
  function painelRelatorios() {
    if (REL.eleicao == null) REL.eleicao = DB.eleicao[DB.eleicao.length - 1].id_eleicao;
    if (REL.candidatura == null) { const p = DB.candidatura.find((x) => x.cd_cargo === 11 && eleito(x)); REL.candidatura = p ? p.id_candidatura : DB.candidatura[0].id_candidatura; }
    const R = RELS[REL.id], out = R.fazer(REL);
    const sel = (n, opts, v) => `<label>${n === "eleicao" ? "Eleição" : n === "cargo" ? "Cargo" : "Candidatura"} <select data-rel="${n}">${opts.map(([val, t]) => `<option value="${val}"${val === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
    const params = R.params.map((n) => n === "eleicao" ? sel(n, DB.eleicao.map((e) => [e.id_eleicao, String(e.nr_ano_eleicao)]), REL.eleicao)
      : n === "cargo" ? sel(n, DB.cargo.map((c) => [c.cd_cargo, V.titulo(c.ds_cargo)]), REL.cargo)
      : sel(n, DB.candidatura.slice().sort((a, b) => a.nm_urna.localeCompare(b.nm_urna)).map((c) => [c.id_candidatura, `${V.titulo(c.nm_urna)} (${nomeFk("eleicao", c.id_eleicao).slice(-4)}, ${nomeFk("cargo", c.cd_cargo)})`]), REL.candidatura)).join("");
    return `<div class="form-rel">
      <div class="form-filtros nao-imprime"><div class="pq-vistas" role="group" aria-label="Relatório">${Object.entries(RELS).map(([k, r]) => `<button type="button" class="chip" data-rel-id="${k}" aria-pressed="${k === REL.id}">${r.rot}</button>`).join("")}</div>
        ${params}<button type="button" class="btn" id="rel-imprimir">Imprimir ou salvar em PDF</button></div>
      <article class="relatorio" aria-labelledby="rel-tit">
        <header><p class="relatorio__marca">Voto a voto · Banco de Dados Relacionais (UFPI) · ${esc(BASE.cidade.nome)} (${BASE.cidade.uf})</p>
          <h2 id="rel-tit">${esc(out.tit)}</h2><p>${esc(out.resumo)}</p></header>
        ${out.cols.length ? `<div class="pq__tabela" tabindex="0" role="region" aria-label="${esc(out.tit)}"><table><thead><tr>${out.cols.map((c, i) => `<th scope="col"${i && /Votos|%|Candidatos|Eleitos|Taxa|Número|superior/.test(c) ? ' class="num"' : ""}>${esc(c)}</th>`).join("")}</tr></thead>
          <tbody>${out.linhas.map((l, j) => `<tr${out.destaque && out.destaque[j] ? ' class="rel-eleito"' : ""}>${l.map((v, i) => `<td${i && /Votos|%|Candidatos|Eleitos|Taxa|Número|superior/.test(out.cols[i]) ? ' class="num"' : ""}>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody>
          ${out.total ? `<tfoot><tr>${out.total.map((v, i) => `<td${i ? ' class="num"' : ""}><b>${esc(v)}</b></td>`).join("")}</tr></tfoot>` : ""}</table></div>` : ""}
        <footer><p>Gerado em ${new Date().toLocaleDateString("pt-BR")} a partir da amostra do banco nacional${OPS.length ? `, com ${OPS.length} ${OPS.length === 1 ? "alteração feita" : "alterações feitas"} nos formulários` : ""}. ${out.destaque ? "Em destaque, os eleitos." : ""}</p></footer>
      </article></div>`;
  }

  function painelRegistro() {
    return `<section class="form-registro"><h2 class="pq-painel__tit">Alterações feitas neste navegador</h2>
      <p>Cada linha é um comando que os formulários executaram sobre a amostra. Elas ficam só neste navegador e voltam quando você abre a página de novo.</p>
      ${OPS.length ? `<ol>${OPS.slice().reverse().map((o) => `<li><b>${{ ins: "Inclusão", upd: "Alteração", del: "Exclusão" }[o.op]} em ${o.t}</b> · ${new Date(o.quando).toLocaleString("pt-BR")}<pre><code>${esc(sql(o))}</code></pre></li>`).join("")}</ol>` : "<p><i>Nenhuma alteração ainda.</i></p>"}
      <p><button type="button" class="btn btn--perigo" id="form-restaurar"${OPS.length ? "" : " disabled"}>Restaurar os dados originais</button></p></section>`;
  }

  function pintar() {
    const main = document.getElementById("conteudo"), alvo = document.getElementById("form-corpo");
    if (!alvo) return;
    document.querySelectorAll("[data-aba]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.aba === ESTADO.aba)));
    alvo.innerHTML = ESTADO.aba === "relatorios" ? painelRelatorios() : ESTADO.aba === "registro" ? painelRegistro() : painelTabela(ESTADO.aba);
    const ab = document.getElementById("form-ops"); if (ab) ab.textContent = OPS.length ? `${OPS.length} ${OPS.length === 1 ? "alteração" : "alterações"} neste navegador` : "Nenhuma alteração: os dados são os originais";
    main.dataset.formAba = ESTADO.aba;
  }
  function msg(txt, ok) { const m = document.getElementById("form-msg"); if (m) { m.textContent = txt; m.className = "form-msg " + (ok ? "form-msg--ok" : "form-msg--erro"); } }
  function mostrarSQL(op) { const s = document.getElementById("form-sql"), box = document.getElementById("form-sql-box"); if (s) { s.textContent = sql(op); box.open = true; } }

  function ligar(main) {
    main.addEventListener("click", (e) => {
      const ab = e.target.closest("[data-aba]"); if (ab) { ESTADO = { ...ESTADO, aba: ab.dataset.aba, k: null, novo: false, busca: "" }; history.replaceState(null, "", "#/formularios/" + ab.dataset.aba); pintar(); return; }
      const it = e.target.closest("[data-k]"); if (it) { ESTADO.k = it.dataset.k; ESTADO.novo = false; pintar(); return; }
      const ir = e.target.closest("[data-ir]"); if (ir) { const ls = listaFiltrada(ESTADO.aba), r = ls[+ir.dataset.ir]; if (r) { ESTADO.k = chaveDe(ESTADO.aba, r); pintar(); } return; }
      const ac = e.target.closest("[data-acao]");
      if (ac && ac.dataset.acao === "novo") { ESTADO.novo = true; pintar(); document.querySelector("#form-ficha input:not([disabled]), #form-ficha select")?.focus(); return; }
      if (ac && ac.dataset.acao === "cancelar") { ESTADO.novo = false; pintar(); return; }
      if (ac && ac.dataset.acao === "excluir") {
        const t = ESTADO.aba, r = achar(t, ESTADO.k);
        if (!r || !confirm(`Excluir ${ESQ[t].um} “${ESQ[t].mostra(r, DB)}”?`)) return;
        try { const op = aplicar({ op: "del", t, k: ESTADO.k }); ESTADO.k = null; pintar(); msg(`Excluído. ${ESQ[t].um.charAt(0).toUpperCase() + ESQ[t].um.slice(1)} removido da tabela ${t}.`, true); mostrarSQL(op); }
        catch (er) { msg(er.message, false); }
        return;
      }
      const vt = e.target.closest("[data-votos]"); if (vt) { e.preventDefault(); ESTADO = { ...ESTADO, aba: "votacao_candidato", k: `${vt.dataset.votos}|1`, novo: false, busca: "" }; if (!achar("votacao_candidato", ESTADO.k)) { ESTADO.novo = true; } pintar(); if (ESTADO.novo) { const s = document.getElementById("f-id_candidatura"); if (s) s.value = vt.dataset.votos; } return; }
      const rl = e.target.closest("[data-rel-id]"); if (rl) { REL.id = rl.dataset.relId; pintar(); return; }
      if (e.target.id === "rel-imprimir") { window.print(); return; }
      if (e.target.id === "form-restaurar") { if (!confirm("Desfazer todas as alterações e voltar aos dados originais da amostra?")) return; OPS = []; try { localStorage.removeItem(CHAVE); } catch (er) {} abrir().then(() => { ESTADO.k = null; pintar(); }); }
    });
    main.addEventListener("submit", (e) => {
      if (e.target.id !== "form-ficha") return;
      e.preventDefault();
      const t = ESTADO.aba, r = lerForm(t);
      if (!ESTADO.novo && !achar(t, ESTADO.k)) { msg("Escolha um registro na lista ou clique em Novo.", false); return; }
      try {
        let op;
        if (ESTADO.novo) { op = aplicar({ op: "ins", t, r }); ESTADO.novo = false; ESTADO.k = chaveDe(t, op.r); ESTADO.busca = ""; }
        else { const atual = achar(t, ESTADO.k); op = aplicar({ op: "upd", t, k: ESTADO.k, r: { ...atual, ...r } }); ESTADO.k = chaveDe(t, op.r); }
        pintar(); msg(op.op === "ins" ? `Incluído na tabela ${t}.` : `Alterações salvas na tabela ${t}.`, true); mostrarSQL(op);
      } catch (er) { msg(er.message, false); }
    });
    main.addEventListener("input", (e) => { if (e.target.id === "form-busca") { ESTADO.busca = e.target.value; clearTimeout(ligar.t); ligar.t = setTimeout(() => { ESTADO.k = null; pintar(); const b = document.getElementById("form-busca"); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }, 200); } });
    main.addEventListener("change", (e) => {
      const f = e.target.dataset.filtro; if (f) { ESTADO.filtro[f] = e.target.value; ESTADO.k = null; pintar(); return; }
      const rp = e.target.dataset.rel; if (rp) { REL[rp] = Number(e.target.value); pintar(); }
    });
  }

  V.rota(/^\/formularios(?:\/(\w+))?\/?$/, async function (main, aba) {
    V.marcarNav("explorar");
    document.title = "Formulários e relatórios · Voto a voto";
    main.innerHTML = '<div class="pagina"><h1 class="titulo-grande">Formulários e relatórios</h1><div class="carregando">Abrindo a amostra do banco…</div></div>';
    await abrir();
    if (aba && (ESQ[aba] || aba === "relatorios" || aba === "registro")) ESTADO.aba = aba;
    ESTADO.k = null; ESTADO.novo = false; ESTADO.busca = "";
    main.innerHTML = `<div class="pagina pq-pagina form-pagina">
      <header class="pq-cab nao-imprime">
        <p class="manchete__onde"><a href="#/explorar">Explorar</a> · Formulários e relatórios</p>
        <h1 class="titulo-grande">Formulários e relatórios</h1>
        <p class="pq-mais">O protótipo do sistema sobre o modelo relacional do trabalho. Ele usa uma amostra real do banco: as eleições municipais de 2020 e 2024 em ${esc(BASE.cidade.nome)} (${BASE.cidade.uf}), com ${V.int(DB.candidatura.length)} candidaturas, ${V.int(DB.pessoa.length)} pessoas e ${V.int(DB.partido.length)} partidos. Os formulários incluem, alteram e excluem registros com as mesmas regras do banco: chave primária, UNIQUE, chave estrangeira e CHECK. Os relatórios saem prontos para imprimir.</p>
        <p class="form-aviso"><b id="form-ops"></b>. O que você muda fica só neste navegador; o banco nacional não é alterado.</p>
      </header>
      <div class="pq-vistas form-abas nao-imprime" role="group" aria-label="Formulário">${ABAS.map(([k, t]) => `<button type="button" class="chip" data-aba="${k}" aria-pressed="false">${t}</button>`).join("")}</div>
      <div id="form-corpo"></div>
    </div>`;
    ligar(main.querySelector(".form-pagina"));
    pintar();
  });
})();
