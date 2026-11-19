/* Voto a voto — respostas desenhadas: Território, Voto e Partidos (as utilidades estão em respostas.js). */
(function () {
  "use strict";
  const V = window.V, U = V.rp;
  const { N, P, R$, Rc, tab, circ, mk, nota, esc, svg, secao, duas, bloco, fatos, leg, bolinhas, eixoY, linha, mao, semEncostar, calor, pares, barrasH, cargoNome, titulo, TELAS } = U;
  const { TINTA, CANETA, MARCA, ESQ, DIR, OURO, CEN, CINZA, CINZA2 } = U.cores;

  /* ================================================================ TERRITÓRIO */
  TELAS.t3 = (C) => {
    const { F, W } = tab(C);
    const fxs = (a, c) => W("q3b", (r) => r.nr_ano_eleicao === a && r.ds_cargo === c).sort((x, y) => x.ds_faixa_idhm.localeCompare(y.ds_faixa_idhm));
    const cg = [["Presidente 2022", 2022, "PRESIDENTE"], ["Governador 2022", 2022, "GOVERNADOR"], ["Senador 2022", 2022, "SENADOR"], ["Prefeito 2024", 2024, "PREFEITO"]];
    const nome = (s) => s.replace(/^\d /, "").replace(/ \(.*\)$/, "").replace("baixo ou muito baixo", "baixo");
    const cards = cg.map(([n, a, c], ci) => `<div class="rp-cabo"><b>${n}</b>${fxs(a, c).map((r, i) => `<div class="rp-cabo__l"><div><b>${ci === 0 && i === 0 ? circ(P(r.pc_mun_esquerda, 0)) : P(r.pc_mun_esquerda, 0)}</b><i style="width:${(r.pc_mun_esquerda * 0.9).toFixed(0)}%;background:${ESQ}"></i></div><span>${nome(r.ds_faixa_idhm)}</span><div><i style="width:${(r.pc_mun_direita * 0.9).toFixed(0)}%;background:${DIR}"></i><b>${P(r.pc_mun_direita, 0)}</b></div></div>`).join("")}</div>`).join("");
    const pr = fxs(2022, "PRESIDENTE");
    const s1 = secao("O cabo de guerra do desenvolvimento", `Para presidente, a esquerda venceu em ${mk(P(pr[0].pc_mun_esquerda, 0) + " das cidades de IDHM baixo")} e em ${P(pr[pr.length - 1].pc_mun_esquerda, 0)} das de IDHM muito alto. Na eleição local, a corda quase não se move para a esquerda.`,
      `<div class="rp-cabos">${cards}</div><p class="rp-sub"><b style="color:${ESQ}">esquerda</b> em 1º ← cidades pela faixa de IDHM → <b style="color:${DIR}">direita</b> em 1º (o resto é centro)</p>`,
      "Parte das cidades de cada faixa de IDHM (Atlas, 2010) em que cada lado ficou em 1º.");
    const ano3 = Math.max(...W("q3", () => true).map((r) => r.nr_ano_eleicao));
    const portes = [...new Set(W("q3", (r) => r.nr_ano_eleicao === ano3).map((r) => r.ds_porte))].sort(), rendas = [...new Set(W("q3", (r) => r.nr_ano_eleicao === ano3).map((r) => r.ds_renda))].sort();
    const m = portes.map((p) => [p.replace(/^\d /, "").replace(/ \(.*\)/, "").replace(/^./, (c) => c.toUpperCase()), rendas.map((rd) => F("q3", (r) => r.nr_ano_eleicao === ano3 && r.ds_porte === p && r.ds_renda === rd).pc_abstencao_media)]);
    const mx = Math.max(...m.flatMap((x) => x[1])), mn = Math.min(...m.flatMap((x) => x[1]));
    const corr = (a, c) => F("q3c", (r) => r.nr_ano_eleicao === a && r.ds_cargo === c);
    const cp = corr(2022, "PRESIDENTE"), cf = corr(2024, "PREFEITO");
    const s2 = duas(bloco("Quem mais falta: a cidade grande e rica", `Abstenção média para prefeito em ${ano3}, por tamanho e renda da cidade.`,
        `<div class="rp-rola"><table class="rp-calor"><thead><tr><th scope="col"><span class="visualmente-oculto">Grupo</span></th>${rendas.map((r) => `<th scope="col">${r.replace(/^\d /, "")}</th>`).join("")}</tr></thead><tbody>${m.map(([n, vs]) => `<tr><th scope="row">${n}</th>${vs.map((v) => { const t = (v - mn) / Math.max(1, mx - mn); return `<td style="background:rgba(20,20,20,${(0.1 + 0.8 * t).toFixed(2)});color:${t > 0.5 ? "#FFFFFF" : TINTA}">${v === mx ? circ(P(v, 0)) : P(v, 0)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`),
      `<div class="rp-bloco">${fatos([[N(cp.r_idhm, 2), `de 0 a 1: quanto o IDHM acompanha o lado do voto para presidente, cidade a cidade (2022). Para prefeito, ${N(cf.r_idhm, 2)}.`], [N(Math.abs(cp.r_populacao), 2), "o tamanho da cidade quase não diz nada sobre o lado"]])}${nota("é o desenvolvimento, não o tamanho", 2)}</div>`, "1.2fr 1fr");
    const gov = fxs(2022, "GOVERNADOR"), pf = fxs(2024, "PREFEITO");
    return { tres: [[P(gov[0].pc_mun_esquerda, 0), "das cidades de IDHM baixo deram o 1º lugar à esquerda para governador em 2022"], [P(pf[pf.length - 1].pc_mun_esquerda, 0), "das cidades de IDHM muito alto elegeram prefeito de esquerda em 2024"],
      [P(mx, 0), `de abstenção na cidade grande e rica; ${P(mn, 0)} na pequena`]], html: s1 + s2 };
  };

  TELAS.t5 = (C) => {
    const { T, F } = tab(C);
    const anos = [2000, 2004, 2008, 2012, 2016, 2020, 2024];
    const fam = T("t5b").slice(0, 5).map((r) => { const ps = {}; String(r.ds_prefeitos).split("; ").forEach((s) => { const m = s.match(/^(\d{4}) (.+)$/); if (m) ps[+m[1]] = titulo(m[2].split(" ")[0]) + (/ (FILHO|JUNIOR|JÚNIOR|NETO)$/.test(m[2]) ? " " + titulo(m[2].split(" ").pop()) : ""); });
      return [r.nm_municipio, r.sg_uf, r.ds_sobrenome, ps, r.qt_mandatos, r.qt_pessoas]; });
    const grid = `<div class="rp-rola"><div class="rp-familia"><span></span>${anos.map((a) => `<b class="rp-num">${a}</b>`).join("")}${fam.map(([c, uf, s, ps]) => `<b>${esc(c)} (${uf})</b>${anos.map((a) => (ps[a] ? `<div class="rp-familia__m"><b>${esc(s)}</b><span>${esc(ps[a])}</span></div>` : `<div class="rp-familia__v"></div>`)).join("")}`).join("")}</div></div>`;
    const f0 = fam[0] || [];
    const s1 = secao("A faixa da família", `Em ${esc(f0[0])} (${f0[1]}), o sobrenome ${titulo(f0[2] || "")} ${mk(`ganhou ${f0[4]} eleições`)} desde 2000, com ${f0[5]} pessoas diferentes.`, grid + nota("cada casa preta é um mandato do mesmo sobrenome", -1.5),
      "Prefeitos eleitos de 2000 a 2024 com o mesmo sobrenome. Casa tracejada: o sobrenome não venceu naquela eleição.");
    const reg = T("t5a").filter((r) => r.nm_regiao !== "Brasil").sort((a, b) => b.pc_com_familia - a.pc_com_familia);
    const a = bloco("Onde mais acontece", "Cidades com dois ou mais prefeitos do mesmo sobrenome desde 2000.", barrasH(reg.map((r, i) => [r.nm_regiao, r.pc_com_familia, i === 0 ? CANETA : CINZA]), 25, (v) => P(v, 0), 130));
    const mult = [["Vereador 2024", 2024, "VEREADOR"], ["Dep. estadual 2022", 2022, "DEPUTADO ESTADUAL"], ["Dep. federal 2022", 2022, "DEPUTADO FEDERAL"]].map(([n, an, c]) => [n, F("t5c", (r) => r.nr_ano_eleicao === an && r.ds_cargo === c && r.fl_sobrenome_prefeito).pc_sucesso, F("t5c", (r) => r.nr_ano_eleicao === an && r.ds_cargo === c && !r.fl_sobrenome_prefeito).pc_sucesso]);
    const mb = mult.map(([n, c, s]) => `<div class="rp-mult"><b>${n}</b><div><i style="width:${(c / 50) * 100}%;background:${TINTA}"></i><i style="width:${(s / 50) * 100}%;background:${CEN}"></i><span>${P(c, 1)} com o sobrenome · ${P(s, 1)} sem · <b>${N(c / s, 1)} vezes</b></span></div></div>`).join("");
    const de = mult[1];
    const b = bloco("O sobrenome de ex-prefeito elege mais", "Parte dos candidatos que se elegeram.", mb, nota(`${N(de[1] / de[2], 0)} vezes mais para deputado estadual`, 2));
    const br5 = F("t5a", (r) => r.nm_regiao === "Brasil"), dep = F("t5c", (r) => r.nr_ano_eleicao === 2022 && r.ds_cargo === "DEPUTADO ESTADUAL" && !r.fl_sobrenome_prefeito);
    return { tres: [[N(br5.qt_com_familia), "cidades tiveram dois ou mais prefeitos com o mesmo sobrenome desde 2000"], [N(br5.qt_familia_3_mandatos), "dessas tiveram o sobrenome no poder em 3 ou mais mandatos"],
      [P(dep.pc_reduto_mediano_eleitos, 0), "dos votos do deputado estadual eleito típico vêm de uma cidade só"]], html: s1 + duas(a, b) };
  };

  const TILES = { RR: [2, 0], AP: [4, 0], AM: [1, 1], PA: [3, 1], MA: [4, 1], CE: [5, 1], RN: [6, 1], AC: [0, 2], RO: [1, 2], MT: [2, 2], TO: [3, 2], PI: [4, 2], PE: [5, 2], PB: [6, 2],
    MS: [2, 3], GO: [3, 3], DF: [4, 3], BA: [5, 3], AL: [6, 3], PR: [2, 4], SP: [3, 4], MG: [4, 4], ES: [5, 4], SE: [6, 4], SC: [2, 5], RJ: [4, 5], RS: [2, 6] };
  TELAS.t13 = (C) => {
    const { T, F } = tab(C);
    const anos = [...new Set(T("t13a").map((r) => r.nr_ano_eleicao))].sort(), aM = anos.includes(2022) ? 2022 : anos[anos.length - 1];
    const uf = (s) => F("t13a", (r) => r.nr_ano_eleicao === aM && r.sg_uf === s);
    const cor = (e, d) => { const m = (e - d) / 60, t = Math.min(1, Math.abs(m)); return m >= 0 ? `rgb(${Math.round(245 - 61 * t)},${Math.round(240 - 205 * t)},${Math.round(232 - 185 * t)})` : `rgb(${Math.round(245 - 216 * t)},${Math.round(240 - 180 * t)},${Math.round(232 - 74 * t)})`; };
    let g = "", ext = [];
    for (const [s, [c, r]] of Object.entries(TILES)) { const v = uf(s), e = v.pc_esquerda || 0, d = v.pc_direita || 0, x = 20 + c * 104, y = 20 + r * 92, fg = Math.abs(e - d) > 25 ? "#FFFFFF" : TINTA;
      ext.push([s, e, d, x, y]); g += `<rect x="${x}" y="${y}" width="98" height="86" fill="${cor(e, d)}" stroke="#F6F5F1" stroke-width="2"/><text x="${x + 10}" y="${y + 26}" class="rp-rot" fill="${fg}">${s}</text><text x="${x + 88}" y="${y + 72}" text-anchor="end" class="rp-n" font-size="22" fill="${fg}">${P(Math.max(e, d), 0)}</text>`; }
    const me = ext.reduce((m, x) => (x[1] - x[2] > m[1] - m[2] ? x : m)), md = ext.reduce((m, x) => (x[2] - x[1] > m[2] - m[1] ? x : m));
    g += `<ellipse cx="${me[3] + 49}" cy="${me[4] + 43}" rx="62" ry="54" fill="none" stroke="${CANETA}" stroke-width="4"/>` + mao(770, me[4] + 50, `← ${me[0]}: ${P(me[1], 0)} esquerda`);
    g += `<ellipse cx="${md[3] + 49}" cy="${md[4] + 43}" rx="62" ry="54" fill="none" stroke="${CANETA}" stroke-width="4"/>` + mao(770, md[4] + 30, `← ${md[0]}: ${P(md[2], 0)} direita`);
    const rg = (n) => F("t13a", (r) => r.nr_ano_eleicao === aM && r.nm_regiao === n && !r.sg_uf);
    const ne = rg("Nordeste"), co = rg("Centro-Oeste"), su = rg("Sul");
    const s1 = secao("O Brasil em 27 casas", `Presidente ${aM}: a esquerda teve ${mk(P(ne.pc_esquerda, 0) + " no Nordeste")}; a direita, ${P(co.pc_direita, 0)} no Centro-Oeste e ${P(su.pc_direita, 0)} no Sul.`,
      `<div class="rp-duas" style="grid-template-columns:2fr 1fr;align-items:start">${svg(990, 680, g, "900px", "Cada estado com o lado que ficou na frente para presidente")}<div class="rp-bloco">${leg([[ESQ, "esquerda na frente"], [DIR, "direita na frente"]])}<p class="rp-sub">Cor mais forte, vantagem maior. Número: a votação do lado que ficou na frente.</p>${nota("cada estado é uma casa do mesmo tamanho, do jeito do mapa", -2, true)}</div></div>`,
      `Votos válidos no turno que decidiu, presidente ${aM}, por estado.`);
    const regs = ["Nordeste", "Norte", "Sudeste", "Centro-Oeste", "Sul"], cores = { Nordeste: ESQ, Sul: DIR, Norte: CINZA, Sudeste: CINZA2, "Centro-Oeste": "#8FA9DD" };
    const X = (i) => 70 + i * ((950 - 70) / (anos.length - 1)), Y = (v) => 330 - (v / 90) * 300;
    let gl = eixoY(70, 950, Y, [0, 30, 50, 70, 90]) + `<line x1="70" x2="950" y1="${Y(50)}" y2="${Y(50)}" stroke="${TINTA}" stroke-width="1.5"/>`;
    const fim = regs.map((n) => [n, anos.map((a) => F("t13a", (r) => r.nr_ano_eleicao === a && r.nm_regiao === n && !r.sg_uf).pc_esquerda || 0)]);
    fim.forEach(([n, vs]) => { gl += `<polyline points="${vs.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}" fill="none" stroke="${cores[n]}" stroke-width="${n === "Nordeste" || n === "Sul" ? 4 : 2}"/>`; });
    const ys = semEncostar(fim.map(([, vs]) => Y(vs[vs.length - 1]) + 5));
    fim.forEach(([n, vs], i) => { gl += `<text x="${X(anos.length - 1) + 10}" y="${ys[i]}" class="rp-rot" font-size="14" fill="${cores[n]}">${n} ${P(vs[vs.length - 1], 0)}</text>`; });
    gl += anos.map((a, i) => `<text x="${X(i)}" y="354" text-anchor="middle" class="rp-n" font-size="15">${a}</text>`).join("");
    const i06 = anos.indexOf(2006);
    if (i06 >= 0) gl += `<line x1="${X(i06)}" x2="${X(i06)}" y1="20" y2="335" stroke="${CANETA}" stroke-dasharray="7 6" stroke-width="2.5"/>` + mao(X(i06) + 10, 40, "2006: o país se parte");
    const v02 = regs.map((n) => F("t13a", (r) => r.nr_ano_eleicao === 2002 && r.nm_regiao === n && !r.sg_uf).pc_esquerda || 0), ne1 = fim[0][1], su1 = fim[4][1];
    const s2 = secao("Em 2002, todo mundo junto", `Em 2002 todas as regiões deram mais de ${N(Math.floor(Math.min(...v02) / 10) * 10)}% à esquerda. A partir de 2006, o Nordeste e o Sul se afastam; em ${anos[anos.length - 1]}, ${mk(`${P(ne1[ne1.length - 1], 0)} contra ${P(su1[su1.length - 1], 0)}`)}.`, svg(1110, 370, gl),
      "Votos da esquerda para presidente no turno que decidiu, por região. Acima da linha preta, a esquerda teve mais da metade.");
    const pico = fim[0][1].reduce((m, v, i) => (v > m[0] ? [v, anos[i]] : m), [0, 0]);
    return { tres: [[P(me[1], 0), `em ${me[0]}, o estado mais à esquerda em ${aM}`], [P(md[2], 0), `para a direita em ${md[0]}, o mais à direita`], [P(pico[0], 0), `teve a esquerda no Nordeste em ${pico[1]}, o auge`]], html: s1 + s2 };
  };

  TELAS.t14 = (C) => {
    const { F, W } = tab(C);
    const h = (c) => W("t14a", (r) => r.ds_cargo === c).sort((a, b) => a.qt_trocas - b.qt_trocas);
    const pf = h("PREFEITO"), pr = h("PRESIDENTE"), n = Math.max(pf.length, pr.length);
    let g = `<text x="540" y="16" text-anchor="middle" class="rp-eixo">trocas de lado</text>`;
    for (let k = 0; k < n; k++) { const y = 30 + k * 52, a = (pf[k] || {}).pc_municipios || 0, b = (pr[k] || {}).pc_municipios || 0;
      g += `<text x="540" y="${y + 24}" text-anchor="middle" class="rp-n" font-size="20">${k}</text><rect x="${500 - a * 10}" y="${y}" width="${a * 10}" height="36" fill="${TINTA}"/><text x="${500 - a * 10 - 8}" y="${y + 24}" text-anchor="end" class="rp-rot" font-size="15">${P(a, 0)}</text>
        <rect x="580" y="${y}" width="${b * 10}" height="36" fill="${CANETA}"/><text x="${580 + b * 10 + 8}" y="${y + 24}" class="rp-rot" font-size="15">${P(b, 0)}</text>`; }
    const um = (pr[1] || {}).pc_municipios || 0;
    g += `<text x="500" y="${40 + n * 52}" text-anchor="end" class="rp-rot">Prefeito</text><text x="580" y="${40 + n * 52}" class="rp-rot" fill="${CANETA}">Presidente</text>` + mao(1060, 190, `↑ ${P(um, 0)} trocaram uma vez só`, CANETA, ' text-anchor="end"');
    const med = pf.reduce((s, r) => s + r.qt_trocas * r.pc_municipios, 0) / 100;
    const s1 = secao("Quantas vezes a cidade mudou de lado", `O prefeito vira à toa: a cidade típica trocou de lado ${N(med, 0)} vezes. Para presidente, ${mk(P(um, 0) + " trocaram uma vez só")}.`, svg(1080, 60 + n * 52, g),
      "Cidades pelo número de vezes que o lado do vencedor mudou de uma eleição para a outra (prefeito desde 1996, presidente desde 1994).");
    const fl = W("t14b", (r) => r.ds_cargo === "PRESIDENTE" && r.qt_esquerda_para_direita + r.qt_direita_para_esquerda > 0).sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao);
    const mx = Math.max(...fl.map((r) => Math.max(r.qt_esquerda_para_direita, r.qt_direita_para_esquerda))), B = 240, esc2 = 170 / mx, cw = 1000 / fl.length;
    let gf = `<line x1="40" x2="1060" y1="${B}" y2="${B}" stroke="${TINTA}" stroke-width="2"/>`;
    fl.forEach((r, i) => { const x = 70 + i * cw + cw / 2, ed = r.qt_esquerda_para_direita, de = r.qt_direita_para_esquerda;
      gf += `<rect x="${x - 34}" y="${B - ed * esc2}" width="68" height="${ed * esc2}" fill="${DIR}"/><rect x="${x - 34}" y="${B}" width="68" height="${de * esc2}" fill="${ESQ}"/>` +
        (ed ? `<text x="${x}" y="${B - ed * esc2 - 8}" text-anchor="middle" class="rp-n" font-size="18">${N(ed)}</text>` : "") + (de ? `<text x="${x}" y="${B + de * esc2 + 22}" text-anchor="middle" class="rp-n" font-size="18">${N(de)}</text>` : "") +
        `<text x="${x}" y="${B + 200}" text-anchor="middle" class="rp-n" font-size="17">${r.nr_ano_eleicao}</text>`; });
    gf += `<text x="40" y="20" class="rp-rot" font-size="15" fill="${DIR}">↑ passaram da esquerda para a direita</text><text x="1060" y="${B + 180}" text-anchor="end" class="rp-rot" font-size="15" fill="${ESQ}">↓ passaram da direita para a esquerda</text>`;
    const u = fl[fl.length - 1] || {};
    if (u.nr_ano_eleicao) gf += mao(1040, 90, `${u.nr_ano_eleicao}: ${N(u.qt_esquerda_para_direita)} para a direita, ${u.qt_direita_para_esquerda ? N(u.qt_direita_para_esquerda) : "nenhuma"} ao contrário →`, CANETA, ' text-anchor="end"');
    const s2 = secao("Quando viram, viram juntas", "Cidades que trocaram de lado para presidente de uma eleição para a seguinte, no 1º turno.", svg(1100, 460, gf));
    const up = F("t14b", (r) => r.ds_cargo === "PRESIDENTE" && r.nr_ano_eleicao === u.nr_ano_eleicao), pfl = W("t14b", (r) => r.ds_cargo === "PREFEITO").sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao);
    const p1 = pfl[pfl.length - 1] || {}, pmin = pfl.reduce((m, r) => (r.pc_mesmo_lado < m.pc_mesmo_lado ? r : m), pfl[0] || {});
    return { tres: [[P(up.pc_mesmo_lado, 0), `das cidades repetiram em ${u.nr_ano_eleicao} o lado de presidente da eleição anterior`], [P((pr[0] || {}).pc_municipios, 0), "nunca trocaram de lado para presidente desde 1994"],
      [P(p1.pc_mesmo_lado, 0), `repetiram o lado do prefeito em ${p1.nr_ano_eleicao}; em ${pmin.nr_ano_eleicao}, ${P(pmin.pc_mesmo_lado, 0)}`]], html: s1 + s2 };
  };

  TELAS.e3 = (C) => {
    const { W } = tab(C);
    const ult = (c) => Math.max(...W("t11c", (r) => r.ds_cargo === c).map((r) => r.nr_ano));
    const q = (c, k) => { const a = ult(c), rs = W("t11c", (r) => r.ds_cargo === c && r.nr_ano === a); return [a, (rs.find((r) => r.nr_quintil === 1) || {})[k], (rs.find((r) => r.nr_quintil === 5) || {})[k]]; };
    const cg = ["PRESIDENTE", "GOVERNADOR", "SENADOR", "DEPUTADO ESTADUAL", "DEPUTADO FEDERAL", "PREFEITO", "VEREADOR"].map((c) => { const [a, lo, hi] = q(c, "pc_esquerda_1o"); return [`${cargoNome[c]} ${a}`, lo || 0, hi || 0]; });
    const Y = (v) => 470 - (v / 100) * 440;
    let g = eixoY(200, 760, Y, [0, 25, 50, 75, 100]);
    const ys = semEncostar(cg.map((x) => Y(x[2]) + 5), 18);
    cg.forEach(([n, a, b], i) => { const cor = i === 0 ? CANETA : i === 1 ? TINTA : CINZA;
      g += `<line x1="250" x2="700" y1="${Y(a)}" y2="${Y(b)}" stroke="${cor}" stroke-width="${i < 2 ? 4 : 2.5}"/><circle cx="250" cy="${Y(a)}" r="6" fill="${cor}"/><circle cx="700" cy="${Y(b)}" r="6" fill="${cor}"/><text x="712" y="${ys[i]}" class="rp-rot" font-size="15" fill="${cor === CINZA ? CINZA2 : cor}">${n} · ${P(b, 0)}</text>`; });
    g += `<text x="250" y="498" text-anchor="middle" class="rp-rot" font-size="15">menos Bolsa Família</text><text x="700" y="498" text-anchor="middle" class="rp-rot" font-size="15">mais Bolsa Família</text>` + mao(470, Y(72), "a ladeira do presidente", CANETA, ` text-anchor="middle" transform="rotate(-24 470 ${Y(62)})"`);
    const p = cg[0];
    const s1 = secao("A ladeira, cargo a cargo", `Para presidente, a esquerda ficou em 1º em ${mk(P(p[1], 0) + " das cidades com menos Bolsa Família")} e em ${P(p[2], 0)} das com mais. Nos outros cargos, a ladeira é bem mais suave.`, svg(1000, 510, g, "1000px"),
      "Cidades em 5 grupos pelo número de benefícios por eleitor. A linha liga o grupo com menos ao grupo com mais.");
    const [ap, plo, phi] = q("PREFEITO", "pc_esquerda_1o"), [, , pdh] = q("PREFEITO", "pc_direita_1o"), nq = (W("t11c", (r) => r.ds_cargo === "PREFEITO" && r.nr_ano === ap && r.nr_quintil === 1)[0] || {}).qt_municipios;
    return { tres: [[P(phi, 0), `das cidades com mais Bolsa Família elegeram prefeito de esquerda em ${ap}; com menos, ${P(plo, 0)}`], [P(pdh, 0), "dessas mesmas cidades elegeram prefeito de direita"], [N(nq || 0), "cidades em cada grupo"]], html: s1 };
  };

  TELAS.e9 = (C) => {
    const { T, W } = tab(C);
    const n9 = Math.max(...T("e9a").map((r) => r.qt_eleicoes)), hist = W("e9a", (r) => r.qt_eleicoes === n9).sort((a, b) => a.qt_acertos - b.qt_acertos);
    const mxh = Math.max(...hist.map((r) => r.qt_cidades)), todas = (hist.find((r) => r.qt_acertos === n9) || {}).qt_cidades || 0;
    const hb = `<div class="rp-hist">${hist.map((r) => `<div><span>${N(r.qt_cidades)}</span><i style="height:${((r.qt_cidades / mxh) * 160).toFixed(0)}px;background:${r.qt_acertos === n9 ? CANETA : TINTA}"></i><b>${r.qt_acertos}</b></div>`).join("")}</div>`;
    const top = T("e9b").filter((r) => r.qt_acertos === n9).sort((a, b) => b.qt_eleitores - a.qt_eleitores);
    const uf = {}; top.forEach((r) => (uf[r.sg_uf] = (uf[r.sg_uf] || 0) + 1));
    const tl = top.slice(0, 6).map((r) => `<div class="rp-lista__l"><span>${esc(r.nm_municipio)} (${r.sg_uf})</span><b class="rp-num">${N(r.qt_eleitores)}</b></div>`).join("");
    const lado = `<div class="rp-bloco">${bloco("Quanto as cidades acertam", `Cidades pelo número de acertos nas ${n9} eleições.`, hb, nota("errar 1 ou 2 vezes é o normal", -2))}${bloco("As maiores que nunca erraram", "número de eleitores", `<div class="rp-lista">${tl}</div>`)}</div>`;
    const s1 = secao(`${todas} pontos que nunca erraram`, `Cada ponto é uma cidade. As ${mk(todas + " em rosa")} votaram em quem ganhou para presidente nas ${n9} eleições, de 1994 a 2026.`,
      `<div class="rp-duas" style="grid-template-columns:1.6fr 1fr;align-items:start"><div class="rp-mapa-acerta" data-rp-acerta="${n9}"><p class="rp-sub">Carregando o mapa…</p></div>${lado}</div>`,
      "Acerto: o candidato mais votado na cidade, no turno que decidiu, foi o eleito presidente.");
    const sete = (hist.find((r) => r.qt_acertos === n9 - 2) || {});
    const t1 = top[0] || {};
    return { tres: [[N(t1.qt_eleitores || 0), `eleitores em ${esc(t1.nm_municipio || "")} (${t1.sg_uf}), a maior das cidades que sempre acertaram`], [String(todas), `cidades acertaram as ${n9} eleições`], [N(sete.qt_cidades || 0), `cidades acertaram ${n9 - 2} das ${n9}`]], html: s1 };
  };

  // o mapa de pontos das cidades que acertam: as posições vêm do desenho do mapa e o número de acertos, da camada "acerta"
  async function mapaAcerta(el) {
    const n9 = +el.dataset.rpAcerta;
    try {
      const [G, A] = await Promise.all([V.geoBR(), V.dados("br/lobby/acerta")]);
      const vs = Object.values(A.v)[0], ano = Object.keys(vs).sort().pop(), v = vs[ano];
      let cinza = "", rosa = "", mg = [];
      G.mun.forEach((f, i) => { const [x, y] = f.c; if ((v[i] || 0) >= n9) { rosa += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(G.W / 170).toFixed(1)}" fill="${CANETA}" stroke="#FFFFFF" stroke-width="1"/>`; if (String(f.id).startsWith("31")) mg.push([x, y]); } else cinza += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(G.W / 600).toFixed(2)}" fill="#C9C5B9"/>`; });
      let extra = "";
      if (mg.length > 5) { const xs = mg.map((p) => p[0]), ys = mg.map((p) => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        extra = `<ellipse cx="${cx}" cy="${cy}" rx="${(Math.max(...xs) - Math.min(...xs)) / 2 + G.W / 30}" ry="${(Math.max(...ys) - Math.min(...ys)) / 2 + G.W / 30}" fill="none" stroke="${TINTA}" stroke-width="${G.W / 300}"/>` +
          `<text x="${Math.max(...xs) + G.W / 25}" y="${Math.min(...ys) - G.W / 80}" class="rp-mao" font-size="${G.W / 40}" fill="${TINTA}">${mg.length} delas em Minas</text>`; }
      el.innerHTML = `<svg class="rp-svg" viewBox="0 0 ${G.W} ${G.H}" role="img" aria-label="Mapa: cada ponto é uma cidade; em rosa, as que acertaram todas as eleições">${cinza}${rosa}${extra}</svg>`;
    } catch (e) { el.innerHTML = '<p class="rp-sub">O mapa não carregou.</p>'; }
  }

  /* ================================================================ VOTO */
  TELAS.t6 = (C) => {
    const { T, W } = tab(C);
    const anos = T("t6c").filter((r) => r.cd_cargo === 1 || r.cd_cargo === 11).sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao);
    const base = 400, e = 300 / 40;
    let g = eixoY(60, 1080, (v) => base - v * e, [0, 10, 20, 30, 40]);
    const cw = 1010 / anos.length;
    anos.forEach((r, i) => { const x = 75 + i * cw; let y = base;
      [[r.pc_abstencao, CINZA2], [r.pc_nulo, CEN], [r.pc_branco, "#FFFFFF"]].forEach(([v, c]) => { const h = v * e; y -= h; g += `<rect x="${x}" y="${y}" width="${cw * 0.75}" height="${h}" fill="${c}" stroke="${TINTA}" stroke-width="1"/>`; });
      g += `<text x="${x + cw * 0.37}" y="${y - 8}" text-anchor="middle" class="rp-n" font-size="15">${N(r.pc_abstencao + r.pc_branco + r.pc_nulo, 0)}</text><text x="${x + cw * 0.37}" y="${base + 20}" text-anchor="middle" class="rp-rot" font-size="12">${String(r.nr_ano_eleicao).slice(2)}</text><text x="${x + cw * 0.37}" y="${base + 36}" text-anchor="middle" class="rp-eixo" font-size="11">${r.cd_cargo === 1 ? "pres." : "pref."}</text>`; });
    g += mao(75, 22, `↙ ${anos[0].nr_ano_eleicao}: o voto em branco ainda pesava`) + mao(1080, 22, "hoje, o maior pedaço é quem nem vai ↘", CANETA, ' text-anchor="end"');
    const vals = anos.map((r) => r.pc_ninguem);
    const s1 = secao(`Trinta anos de Ninguém`, `Somando quem faltou, anulou e votou em branco, o Ninguém fica entre ${mk(`${P(Math.min(...vals), 0)} e ${P(Math.max(...vals), 0)}`)} do eleitorado em toda eleição.`,
      svg(1110, 450, g, "100%", "Abstenção, brancos e nulos em cada eleição") + leg([[CINZA2, "não foi votar"], [CEN, "anulou"], ["#FFFFFF", "votou em branco", true]]), "Parte do eleitorado apto. Anos pares alternam presidente (1º turno) e prefeito (1º turno).");
    const anoB = Math.max(...T("t6b").map((r) => r.nr_ano_eleicao)), qb = W("t6b", (r) => r.nr_ano_eleicao === anoB).sort((a, b) => a.nr_quintil - b.nr_quintil);
    const h = qb.map((r) => `<div class="rp-linhaq"><b>${N(r.pc_ninguem_min, 0)}% a ${N(r.pc_ninguem_max, 0)}%</b><span>${N(r.qt_eleitores_mediano)} eleitores</span><i style="width:${(Math.max(r.pc_ninguem_passou_o_1o, 0.5) / 20 * 100).toFixed(0)}%;background:${r.pc_ninguem_passou_o_1o > 10 ? CANETA : TINTA}"></i><b class="rp-num">${P(r.pc_ninguem_passou_o_1o, 1)}</b></div>`).join("");
    const a = bloco("Onde o Ninguém ganha do 1º colocado", `Cidades em 5 grupos pela parte de Ninguém (prefeito, ${anoB}): eleitores da cidade típica e parte das cidades em que Ninguém passou o mais votado.`, `<div class="rp-linhasq">${h}</div>`, nota("só no grupo de cima ele vence", -2));
    const cid = W("t6a", (r) => r.nr_ano_eleicao === anoB && r.cd_cargo === 11).sort((x, y) => y.pc_ninguem - x.pc_ninguem);
    const hi = cid[0] || {}, lo = cid[cid.length - 1] || {};
    const duo = (r, pink) => `<div><b class="rp-rot">${esc(r.nm_municipio || "")} (${r.sg_uf || ""})</b>${bolinhas(Math.round(r.pc_ninguem || 0), 100, pink ? CANETA : TINTA, 14)}<b class="rp-grande">${pink ? circ(P(r.pc_ninguem || 0, 1)) : P(r.pc_ninguem || 0, 1)}</b></div>`;
    const b = bloco("Os dois extremos", `Parte do eleitorado que não escolheu ninguém para prefeito em ${anoB}.`, `<div class="rp-dupla">${duo(hi, true)}${duo(lo, false)}</div>`);
    const ult = anos.filter((r) => r.cd_cargo === 11).pop() || {}, pr = anos.filter((r) => r.cd_cargo === 1), p0 = pr[0] || {}, p1 = pr[pr.length - 1] || {};
    const sen = T("t6c").filter((r) => r.cd_cargo === 5).find((r) => r.nr_ano_eleicao === 2022);
    return { tres: [[P(ult.pc_abstencao, 1), `do eleitorado nem foi votar para prefeito em ${ult.nr_ano_eleicao}: o maior pedaço`],
      sen ? [`${N(sen.pc_ninguem, 0)} de 100`, `não escolheram ninguém para senador em ${sen.nr_ano_eleicao}`] : [P(p1.pc_ninguem, 0), `para presidente em ${p1.nr_ano_eleicao}`],
      [P(p1.pc_nulo, 1), `anularam para presidente em ${p1.nr_ano_eleicao}; em ${p0.nr_ano_eleicao}, ${P(p0.pc_nulo, 1)}`]], html: s1 + duas(a, b, "1.3fr 1fr") };
  };

  function hemiciclo(n, k, cx, cy, r0, r1, linhas = 9, tam = 5.2) {
    const rs = Array.from({ length: linhas }, (_, i) => r0 + ((r1 - r0) * i) / (linhas - 1)), tot = rs.reduce((s, r) => s + r, 0);
    const por = rs.map((r) => Math.round((n * r) / tot)); por[por.length - 1] += n - por.reduce((s, x) => s + x, 0);
    const pts = [];
    rs.forEach((r, i) => { for (let j = 0; j < por[i]; j++) { const a = Math.PI * (1 - (j + 0.5) / por[i]); pts.push([a, cx + r * Math.cos(a), cy - r * Math.sin(a)]); } });
    pts.sort((a, b) => b[0] - a[0]);
    return pts.map(([, x, y], i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${tam}" fill="${i < k ? CANETA : CEN}"/>`).join("");
  }
  TELAS.t7 = (C) => {
    const { T, W } = tab(C);
    const df = W("t7a", (r) => r.cd_cargo === 6).sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao), d0 = df[0] || {}, d1 = df[df.length - 1] || {};
    let g = hemiciclo(513, d0.qt_cadeiras_da_legenda, 260, 250, 110, 235) + hemiciclo(513, d1.qt_cadeiras_da_legenda, 820, 250, 110, 235);
    g += `<text x="260" y="236" text-anchor="middle" class="rp-n" font-size="56">${d0.qt_cadeiras_da_legenda}</text><text x="260" y="268" text-anchor="middle" class="rp-rot" font-size="16">cadeiras pela legenda · ${d0.nr_ano_eleicao}</text>`;
    g += `<text x="820" y="236" text-anchor="middle" class="rp-n" font-size="56">${d1.qt_cadeiras_da_legenda}</text><text x="820" y="268" text-anchor="middle" class="rp-rot" font-size="16">cadeiras pela legenda · ${d1.nr_ano_eleicao}</text><ellipse cx="820" cy="225" rx="60" ry="42" fill="none" stroke="${CANETA}" stroke-width="4"/>`;
    const s1 = secao("A Câmara, cadeira por cadeira", `Cada bolinha é uma das 513 cadeiras de deputado federal. As rosas são as que o voto só no partido pagou: ${mk(`${d0.qt_cadeiras_da_legenda} em ${d0.nr_ano_eleicao}, ${d1.qt_cadeiras_da_legenda} em ${d1.nr_ano_eleicao}`)}.`,
      svg(1080, 290, g, "100%", "Cadeiras da Câmara pagas pelo voto de legenda"), "Estimativa do grupo: os votos de legenda de cada partido convertidos em cadeiras pela conta do quociente, somados no país.");
    const q = (c) => W("q5", (r) => r.ds_cargo === c).sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao);
    const sd = q("DEPUTADO FEDERAL"), sv = q("VEREADOR"), X = (a) => 60 + ((a - 2000) / 26) * 470, Y = (v) => 280 - (v / 14) * 250;
    let gl = eixoY(60, 540, Y, [0, 5, 10]) + linha(sd.map((r) => [X(r.nr_ano_eleicao), Y(r.pc_legenda)]), TINTA, 3.5) + linha(sv.map((r) => [X(r.nr_ano_eleicao), Y(r.pc_legenda)]), CINZA, 3);
    const ld = sd[sd.length - 1] || {}, lv = sv[sv.length - 1] || {};
    gl += `<text x="${X(ld.nr_ano_eleicao) + 8}" y="${Y(ld.pc_legenda) + 16}" class="rp-rot" font-size="14">dep. federal ${P(ld.pc_legenda, 1)}</text><text x="${X(lv.nr_ano_eleicao) + 8}" y="${Y(lv.pc_legenda) - 6}" class="rp-rot" font-size="14" fill="${CINZA2}">vereador ${P(lv.pc_legenda, 1)}</text>`;
    gl += [2000, 2008, 2016, 2024].map((a) => `<text x="${X(a)}" y="302" text-anchor="middle" class="rp-n" font-size="14">${a}</text>`).join("");
    const a = bloco("Quase ninguém vota só no número do partido", "Parte dos votos dados só à legenda.", svg(680, 320, gl), nota(`de ${P(sd[0].pc_legenda, 0)} para ${P(ld.pc_legenda, 0)} em ${ld.nr_ano_eleicao - sd[0].nr_ano_eleicao} anos`, -2));
    const corE = (e) => (/ESQUERDA/.test(e) ? ESQ : /DIREITA/.test(e) ? DIR : CINZA);
    const pb = T("q5b").sort((x, y) => y.pc_legenda - x.pc_legenda).slice(0, 8);
    const b = bloco("Quem ainda vive de legenda", "Parte dos votos do partido para deputado federal que foi só na legenda, 2022.", barrasH(pb.map((r) => [esc(r.sg_partido), r.pc_legenda, corE(r.ds_espectro)]), Math.ceil(pb[0].pc_legenda), (v) => P(v, 1), 100),
      nota(`o eleitor do ${esc(pb[0].sg_partido)} e do ${esc(pb[1].sg_partido)} vota no partido`, 2));
    const v24 = W("t7a", (r) => r.cd_cargo === 13).sort((x, y) => x.nr_ano_eleicao - y.nr_ano_eleicao), va = v24[0] || {}, vz = v24[v24.length - 1] || {};
    return { tres: [[N(vz.qt_cadeiras_da_legenda), `vereadores eleitos pela legenda em ${vz.nr_ano_eleicao}; em ${va.nr_ano_eleicao}, ${N(va.qt_cadeiras_da_legenda)}`],
      [P(d1.pc_com_votos_proprios, 1), `dos deputados federais de ${d1.nr_ano_eleicao} tiveram votos próprios para uma cadeira inteira`], [P(lv.pc_legenda, 1), `dos votos para vereador em ${lv.nr_ano_eleicao} foram só no partido`]], html: s1 + duas(a, b) };
  };

  TELAS.t8 = (C) => {
    const { T, F } = tab(C);
    const mais = T("t8b").filter((r) => r.ds_tipo === "mais eleitores por cadeira").sort((a, b) => a.nr_ordem - b.nr_ordem), menos = T("t8b").filter((r) => r.ds_tipo === "menos eleitores por cadeira").sort((a, b) => a.nr_ordem - b.nr_ordem);
    const cid = [menos[0], menos[3] || menos[1], mais[2] || mais[1], mais[0]].filter(Boolean), mx = mais[0].qt_eleitores_por_cadeira, Lado = 430;
    const h = cid.map((r) => { const l = Math.max(3, Lado * Math.sqrt(r.qt_eleitores_por_cadeira / mx)), big = r.qt_eleitores_por_cadeira > 1000;
      return `<div class="rp-quadros__q"><div style="width:${l.toFixed(1)}px;height:${l.toFixed(1)}px;background:${big ? CANETA : TINTA}"></div><b class="${big ? "rp-grande" : ""}">${r === mais[0] ? circ(N(r.qt_eleitores_por_cadeira)) : N(r.qt_eleitores_por_cadeira)}</b><span><b>${esc(r.nm_municipio)} (${r.sg_uf})</b><br>${r.qt_cadeiras} vereadores</span></div>`; }).join("");
    const lo = menos[0], hi = mais[0];
    const s1 = secao("Quantos eleitores cabem numa cadeira", `Em ${esc(lo.nm_municipio)}, cada vereador responde por ${N(lo.qt_eleitores_por_cadeira)} eleitores; em ${esc(hi.nm_municipio)}, por ${mk(N(hi.qt_eleitores_por_cadeira))}. O voto de ${esc(lo.nm_municipio)} pesa quase ${N(Math.round(hi.qt_eleitores_por_cadeira / lo.qt_eleitores_por_cadeira / 100) * 100)} vezes mais na câmara da cidade.`,
      `<div class="rp-quadros">${h}${nota(`o quadrado de ${esc(lo.nm_municipio)} é o pontinho!`, -3)}</div>`, "Eleitores aptos ÷ cadeiras de vereador. A área do quadrado é o número de eleitores por cadeira.");
    const fx = T("t8a").sort((a, b) => a.nr_faixa - b.nr_faixa);
    const met = [["Eleitores por cadeira", "qt_eleitores_por_cadeira", true], ["Votos do vereador eleito típico", "qt_votos_eleito_mediano", true], ["Candidatos por vaga", "qt_candidatos_por_cadeira", false], ["Cadeiras na câmara (média)", "qt_cadeiras_media", false]];
    const cards = met.map(([n, k, lg]) => { const vs = fx.map((r) => r[k]), X = (i) => 30 + i * (320 / Math.max(1, vs.length - 1)), mxv = Math.max(...vs);
      const Y = lg ? (v) => 170 - ((Math.log10(v) - 2) / 3) * 150 : (v) => 170 - (v / mxv) * 150, f = lg ? (v) => N(v) : (v) => N(v, 1);
      const gg = linha(vs.map((v, i) => [X(i), Y(v)]), TINTA, 3) + `<text x="${X(0)}" y="${Y(vs[0]) - 10}" text-anchor="middle" class="rp-n" font-size="15">${f(vs[0])}</text><text x="${X(vs.length - 1)}" y="${Y(vs[vs.length - 1]) - 10}" text-anchor="middle" class="rp-n" font-size="17" fill="${CANETA}">${f(vs[vs.length - 1])}</text><text x="${X(0)}" y="196" text-anchor="middle" class="rp-eixo" font-size="11">menor</text><text x="${X(vs.length - 1)}" y="196" text-anchor="middle" class="rp-eixo" font-size="11">maior</text>`;
      return `<div class="rp-mini"><b>${n}</b>${svg(380, 205, gg)}</div>`; }).join("");
    const s2 = secao("Da cidade menor para a maior", `Oito tamanhos de cidade, do menor (${fx[0].ds_faixa}) ao maior (${fx[fx.length - 1].ds_faixa}).`, `<div class="rp-minis">${cards}</div>`,
      "Cidades por número de habitantes. Os dois primeiros gráficos usam régua que multiplica por 10 a cada degrau.");
    const dfc = T("t8c").filter((r) => r.cd_cargo === 6), anoD = Math.max(...dfc.map((r) => r.nr_ano_eleicao)), d = dfc.filter((r) => r.nr_ano_eleicao === anoD);
    const porDep = d.reduce((s, r) => s + r.qt_aptos, 0) / Math.max(1, d.reduce((s, r) => s + r.qt_cadeiras, 0));
    return { tres: [[N(Math.round(porDep)), `eleitores para cada deputado federal em ${anoD}, na média do país`], [`${N(fx[0].qt_cadeiras_media, 0)} a 55`, "cadeiras: o que a Constituição permite, pela população da cidade"],
      [`${N(fx[0].qt_votos_eleito_mediano)} votos`, `elegeram o vereador típico das cidades de ${fx[0].ds_faixa}`]], html: s1 + s2 };
  };

  /* ================================================================ PARTIDOS */
  TELAS.t9 = (C) => {
    const { T, F, W } = tab(C);
    const gp = W("t9a", (r) => /GOVERNADOR/.test(r.ds_grupo)).sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao), anos = gp.map((r) => r.nr_ano_eleicao);
    const top = [["Inteligência artificial", "pc_inteligencia_artificial", CANETA, 4], ["Pandemia", "pc_pandemia", TINTA, 4], ["Saúde mental e autismo", "pc_saude_mental_autismo", CINZA2, 3], ["Clima", "pc_clima", CEN, 2], ["Causa animal", "pc_causa_animal", CEN, 2], ["Digital", "pc_digital", CEN, 2]];
    const X = (i) => 120 + i * (600 / Math.max(1, anos.length - 1)), Y = (v) => 350 - (v / 100) * 320;
    let g = eixoY(120, 720, Y, [0, 25, 50, 75, 100]);
    const fim = top.map(([n, k, c, w]) => [n, gp.map((r) => r[k] || 0), c, w]);
    fim.forEach(([n, vs, c, w]) => { g += linha(vs.map((v, i) => [X(i), Y(v)]), c, w); });
    const ys = semEncostar(fim.map(([, vs]) => Y(vs[vs.length - 1]) + 5), 18);
    fim.forEach(([n, vs, c], i) => { g += `<text x="${X(anos.length - 1) + 14}" y="${ys[i]}" class="rp-rot" font-size="16" fill="${c === CEN ? CINZA2 : c}">${n} · ${P(vs[vs.length - 1], 0)}</text>`; });
    g += anos.map((a, i) => `<text x="${X(i)}" y="378" text-anchor="middle" class="rp-n" font-size="18">${a}</text>`).join("");
    const pd = fim[1][1], ia = fim[0][1], ipk = pd.indexOf(Math.max(...pd));
    g += mao(X(ipk), Y(pd[ipk]) - 18, "a pandemia entrou e saiu", TINTA, ' text-anchor="middle"') + mao(X(Math.max(0, anos.length - 2)) + 150, Y(Math.min(...ia)), "a IA disparou ↗");
    const s1 = secao("Os assuntos que entram e saem", `A pandemia apareceu em ${P(pd[ipk], 0)} dos planos de ${anos[ipk]} e caiu para ${P(pd[pd.length - 1], 0)}. A inteligência artificial foi de ${P(ia[0], 0)} para ${mk(P(ia[ia.length - 1], 0))}.`, svg(1060, 390, g),
      "Parte dos planos de governo de governador e presidente que citam cada assunto (palavras procuradas no texto do plano entregue ao TSE).");
    const q6 = (b) => F("q6", (r) => r.ds_bloco === b);
    const e = q6("esquerda"), d = q6("direita");
    const temas = [["Igualdade racial", "pc_racial"], ["Reforma agrária", "pc_reforma_agraria"], ["Agronegócio", "pc_agronegocio"], ["Privatização", "pc_privatizacao"], ["Desigualdade", "pc_desigualdade"], ["Meio ambiente", "pc_meio_ambiente"], ["Segurança", "pc_seguranca"], ["Armas", "pc_armas"], ["Impostos", "pc_impostos"], ["Família", "pc_familia"]]
      .map(([n, k]) => [n, e[k] || 0, d[k] || 0]).sort((x, y) => (y[1] - y[2]) - (x[1] - x[2]));
    const rows = temas.map(([n, ve, vd], i) => `<div class="rp-borb"><div><b class="rp-num">${i === 0 ? circ(P(ve, 0)) : P(ve, 0)}</b><i style="width:${ve}%;background:${ESQ}"></i></div><span>${n}</span><div><i style="width:${vd}%;background:${DIR}"></i><b class="rp-num">${P(vd, 0)}</b></div></div>`).join("");
    const a = bloco("Esquerda e direita falam de coisas diferentes", `Parte dos planos para presidente que citam cada tema: <b style="color:${ESQ}">esquerda</b> e <b style="color:${DIR}">direita</b>.`, `<div class="rp-borbs">${rows}</div>`, nota("família e impostos: todo mundo fala", -2));
    const sm = F("t9b", (r) => r.ds_tipo === "todos");
    const venn = `<svg class="rp-svg" viewBox="0 0 420 260" style="max-width:420px" role="img" aria-label="Plano anterior e plano novo: ${P(sm.pc_semelhanca_media, 0)} das palavras se repetem"><rect x="20" y="30" width="230" height="200" fill="#FFFFFF" stroke="${TINTA}" stroke-width="2"/><rect x="170" y="30" width="230" height="200" fill="#FFFFFF" fill-opacity=".6" stroke="${TINTA}" stroke-width="2"/><rect x="170" y="30" width="80" height="200" fill="${MARCA}"/><text x="210" y="140" text-anchor="middle" class="rp-n" font-size="30">${P(sm.pc_semelhanca_media, 0)}</text><text x="80" y="22" class="rp-rot" font-size="14">plano anterior</text><text x="300" y="22" class="rp-rot" font-size="14">plano novo</text></svg>`;
    const b = bloco("O mesmo candidato reescreve o plano", "Quando a mesma pessoa se candidata de novo, só um terço das palavras principais do plano se repete.", venn, nota(`só ${P(sm.pc_quase_igual, 0)} entregam um plano quase igual`, 2));
    const pf = W("t9a", (r) => r.ds_grupo === "PREFEITO").sort((x, y) => x.nr_ano_eleicao - y.nr_ano_eleicao), p0 = pf[0] || {}, p1 = pf[pf.length - 1] || {};
    return { tres: [[P(p1.pc_saude_mental_autismo, 0), `dos planos de prefeito de ${p1.nr_ano_eleicao} falam de saúde mental e autismo; em ${p0.nr_ano_eleicao}, ${P(p0.pc_saude_mental_autismo, 0)}`],
      [`${P(e.pc_racial, 0)} e ${P(d.pc_racial, 0)}`, "dos planos para presidente da esquerda e da direita falam de igualdade racial"], [P(sm.pc_semelhanca_media, 0), "das palavras principais se repetem quando o mesmo candidato entrega outro plano"]], html: s1 + duas(a, b, "1.3fr 1fr") };
  };

  TELAS.t16 = (C) => {
    const { T, W } = tab(C);
    const mun = T("t16a").filter((r) => r.tp_abrangencia === "MUNICIPAL" && r.fl_tem_detalhe && r.nr_ano_eleicao >= 2008);
    const ind = mun.reduce((s, r) => s + r.qt_indeferidas, 0), ren = mun.reduce((s, r) => s + r.qt_renuncias, 0), cas = mun.reduce((s, r) => s + r.qt_cassadas, 0), tot = ind + ren + cas;
    const pi = Math.round((100 * ind) / tot), pc = Math.max(1, Math.round((100 * cas) / tot)), pr = 100 - pi - pc;
    const way = `<div class="rp-waffle">${Array.from({ length: 100 }, (_, j) => `<span style="background:${j < pi ? CINZA : j < pi + pr ? CEN : CANETA}"></span>`).join("")}</div>`;
    const lg = `<div class="rp-bloco"><p><i class="rp-q" style="background:${CINZA}"></i><b>${P((100 * ind) / tot, 0)}</b> registro negado (falta de documento, de filiação, Ficha Limpa)</p><p><i class="rp-q" style="background:${CEN}"></i><b>${P((100 * ren) / tot, 0)}</b> renúncia</p><p><i class="rp-q" style="background:${CANETA}"></i><b>${P((100 * cas) / tot, 1)}</b> cassação</p></div>`;
    const anosM = mun.map((r) => r.nr_ano_eleicao);
    const s1 = secao("Por que a candidatura cai", `Das ${N(tot)} candidaturas a prefeito e vereador barradas em ${anosM.join(", ").replace(/, (\d+)$/, " e $1")}, ${mk(P((100 * ind) / tot, 0) + " tiveram o registro negado")}.`, `<div class="rp-duas" style="grid-template-columns:auto 1fr;align-items:center">${way}${lg}</div>`, "Cada quadrado é 1% das candidaturas barradas.");
    const par = T("t16b").sort((a, b) => b.pc_inaptas - a.pc_inaptas), sel = [...par.slice(0, 5), ...par.filter((r) => ["PSOL", "PT", "REPUBLICANOS", "PL", "PSDB", "PSD", "MDB", "PP"].includes(r.sg_partido) && !par.slice(0, 5).includes(r))];
    const mx = Math.ceil(par[0].pc_inaptas), sx = (v) => 140 + (v / mx) * 420;
    let g = sel.map((r, i) => { const y = 18 + i * 26; return `<text x="130" y="${y + 5}" text-anchor="end" class="rp-rot" font-size="14">${esc(r.sg_partido)}</text><line x1="${sx(0)}" x2="${sx(r.pc_inaptas)}" y1="${y}" y2="${y}" stroke="#C9C5B9" stroke-width="2"/><circle cx="${sx(r.pc_inaptas)}" cy="${y}" r="7" fill="${i < 5 ? CANETA : TINTA}"/><text x="${sx(r.pc_inaptas) + 14}" y="${y + 5}" class="rp-n" font-size="14">${P(r.pc_inaptas, 1)}</text>`; }).join("");
    g += mao(690, 18 + (sel.length - 3) * 26, "partido pequeno, mais candidatura barrada ↑", CANETA, ' text-anchor="end"');
    const a = bloco("Partido a partido", "Parte das candidaturas barradas em 2020 e 2022, partido a partido (seleção).", svg(700, sel.length * 26 + 20, g));
    const df = W("t16d", (r) => r.ds_cargo === "DEPUTADO FEDERAL").sort((x, y) => x.nr_ano_eleicao - y.nr_ano_eleicao);
    const X = (i) => 60 + i * (450 / Math.max(1, df.length - 1)), Y = (v) => 260 - (v / 20) * 230;
    let gl = eixoY(60, 520, Y, [0, 5, 10, 15, 20]) + linha(df.map((r, i) => [X(i), Y(r.pc_inaptas)]), TINTA, 3.5) + df.map((r, i) => `<text x="${X(i)}" y="282" text-anchor="middle" class="rp-n" font-size="14">${r.nr_ano_eleicao}</text>`).join("");
    const i10 = df.findIndex((r) => r.nr_ano_eleicao === 2010);
    if (i10 > 0) gl += `<line x1="${X(i10 - 0.5)}" x2="${X(i10 - 0.5)}" y1="20" y2="262" stroke="${CANETA}" stroke-dasharray="6 5" stroke-width="2.5"/>` + mao(X(i10 - 0.5) + 8, 34, "2010: Ficha Limpa");
    const b = bloco("Deputado federal: a Ficha Limpa dobrou a barreira", "Parte das candidaturas a deputado federal barradas.", svg(560, 300, gl));
    const vt = T("t16c").filter((r) => /VEREADOR|PREFEITO/.test(r.ds_grupo || "")).reduce((s, r) => s + (r.qt_votos_recebidos || 0), 0), p1 = par[0], pp = par[par.length - 1];
    return { tres: [[N(tot), `candidaturas municipais barradas em ${anosM.join(", ").replace(/, (\d+)$/, " e $1")}`], [N(vt), "votos dados a candidaturas a prefeito e vereador barradas que ainda estavam na urna: não valeram"],
      [P(p1.pc_inaptas, 1), `das candidaturas do ${esc(p1.sg_partido)} foram barradas em 2020 e 2022; no ${esc(pp.sg_partido)}, ${P(pp.pc_inaptas, 1)}`]], html: s1 + duas(a, b, "1.2fr 1fr") };
  };

  TELAS.e5 = (C) => {
    const { W } = tab(C);
    const ult = (c) => W("e5a", (r) => r.ds_cargo === c).sort((a, b) => b.nr_ano_eleicao - a.nr_ano_eleicao)[0] || {};
    const cg = ["VEREADOR", "PREFEITO", "DEPUTADO ESTADUAL", "DEPUTADO FEDERAL"].map((c) => [cargoNome[c], ult(c)]);
    const cards = cg.map(([n, r]) => { const S = 240, t = r.pc_trocaram, rt = r.pc_reeleitos_trocando, rf = r.pc_reeleitos_ficando, wt = (S * t) / 100;
      return `<div class="rp-mosaico"><b>${n} ${r.nr_ano_eleicao}</b><span>${N(r.qt_tentaram)} tentaram a reeleição</span><svg class="rp-svg" viewBox="0 0 ${S + 4} ${S + 40}" style="max-width:260px" role="img" aria-label="${n}: trocaram ${P(t, 0)}, reeleitos ${P(rt, 0)} de quem trocou e ${P(rf, 0)} de quem ficou">
        <rect x="2" y="2" width="${wt.toFixed(1)}" height="${S}" fill="#FFFFFF" stroke="${TINTA}" stroke-width="2"/><rect x="2" y="${(2 + S * (1 - rt / 100)).toFixed(1)}" width="${wt.toFixed(1)}" height="${((S * rt) / 100).toFixed(1)}" fill="${CANETA}"/>
        <rect x="${(2 + wt).toFixed(1)}" y="2" width="${(S - wt).toFixed(1)}" height="${S}" fill="#FFFFFF" stroke="${TINTA}" stroke-width="2"/><rect x="${(2 + wt).toFixed(1)}" y="${(2 + S * (1 - rf / 100)).toFixed(1)}" width="${(S - wt).toFixed(1)}" height="${((S * rf) / 100).toFixed(1)}" fill="${TINTA}"/>
        <text x="${(2 + wt / 2).toFixed(1)}" y="${S + 24}" text-anchor="middle" class="rp-rot" font-size="13">trocou ${P(t, 0)}</text><text x="${(2 + wt + (S - wt) / 2).toFixed(1)}" y="${S + 24}" text-anchor="middle" class="rp-rot" font-size="13">ficou ${P(100 - t, 0)}</text>
        <text x="${(2 + wt / 2).toFixed(1)}" y="${(2 + S * (1 - rt / 100) + 26).toFixed(1)}" text-anchor="middle" fill="#FFFFFF" class="rp-n" font-size="20">${P(rt, 0)}</text><text x="${(2 + wt + (S - wt) / 2).toFixed(1)}" y="${(2 + S * (1 - rf / 100) + 26).toFixed(1)}" text-anchor="middle" fill="#FFFFFF" class="rp-n" font-size="20">${P(rf, 0)}</text></svg></div>`; }).join("");
    const df = cg[3][1], ve = cg[0][1];
    const s1 = secao("Trocar de camisa ajuda?", `Cada quadrado são os que tentaram a reeleição. A largura é quem trocou e quem ficou no partido; a parte pintada, quem se reelegeu. Para deputado federal, ${mk(P(df.pc_reeleitos_ficando, 0) + " de quem ficou")} voltou, contra ${P(df.pc_reeleitos_trocando, 0)} de quem trocou.`,
      `<div class="rp-mosaicos">${cards}</div>${Math.abs(ve.pc_reeleitos_trocando - ve.pc_reeleitos_ficando) < 5 ? nota("para vereador e prefeito, quase tanto faz", -2) : ""}`);
    const ser = [["Vereador", "VEREADOR", CANETA], ["Prefeito", "PREFEITO", TINTA]].map(([n, c, cor]) => [n, W("e5a", (r) => r.ds_cargo === c).sort((a, b) => a.nr_ano_eleicao - b.nr_ano_eleicao), cor]);
    const anos = ser[0][1].map((r) => r.nr_ano_eleicao), X = (i) => 70 + i * (800 / Math.max(1, anos.length - 1)), Y = (v) => 300 - (v / 70) * 270;
    let g = eixoY(70, 900, Y, [0, 20, 40, 60]);
    ser.forEach(([n, rs, c]) => { g += linha(rs.map((r, i) => [X(anos.indexOf(r.nr_ano_eleicao)), Y(r.pc_trocaram)]), c, 3.5); const u = rs[rs.length - 1]; g += `<text x="${X(anos.indexOf(u.nr_ano_eleicao)) + 12}" y="${Y(u.pc_trocaram) + 5}" class="rp-rot" fill="${c}">${n} ${P(u.pc_trocaram, 0)}</text>`; });
    g += anos.map((a, i) => `<text x="${X(i)}" y="324" text-anchor="middle" class="rp-n" font-size="15">${a}</text>`).join("");
    const i20 = anos.indexOf(2020); if (i20 > 0) g += mao(X(i20) - 20, Y(68), "2020: a troca dispara", CANETA, ' text-anchor="end"');
    const s2 = secao("Cada vez mais gente troca", "Parte dos que tentaram a reeleição e foram por outro partido.", svg(1060, 340, g));
    const pf = cg[1][1];
    return { tres: [[P(pf.pc_trocaram, 0), `dos prefeitos que tentaram a reeleição em ${pf.nr_ano_eleicao} trocaram de partido`], [P(df.pc_trocaram, 0), `dos deputados federais de ${df.nr_ano_eleicao}`],
      [`${P(df.pc_reeleitos_ficando, 0)} × ${P(df.pc_reeleitos_trocando, 0)}`, `voltaram à Câmara: quem ficou no partido × quem trocou (${df.nr_ano_eleicao})`]], html: s1 + s2 };
  };

  /* depois que a página da pergunta é desenhada: o que precisa de dado a mais (o mapa das cidades que acertam) */
  V.rpLigar = (main) => { main.querySelectorAll("[data-rp-acerta]").forEach(mapaAcerta); };
})();
