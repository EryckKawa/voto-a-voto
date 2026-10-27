/* Voto a voto — o Brasil em 3D (three.js r147, em vendor/): cada cidade é uma coluna no lugar dela no mapa.
   Altura: eleitores (ou a parte que faltou); cor: o lado de quem venceu. As colunas sobem como numa apuração.
   three.js só é carregado nesta página. */
(function () {
  "use strict";
  const V = window.V;
  const ALTO = 200;   // altura da coluna mais alta, em unidades do mapa (o mapa tem 960 de largura)

  const temWebGL = () => { try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; } };

  // contorno dos estados ("M x,y L x,y ... Z", já projetado) em formas do three.js; o y do mapa vira o z da cena
  function formas(d) {
    const out = [];
    for (const parte of d.split("M").filter(Boolean)) {
      const pts = parte.replace(/Z/g, "").split("L").map((p) => p.split(",").map(Number)).filter((p) => p.length === 2 && !isNaN(p[0]));
      if (pts.length < 3) continue;
      out.push(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x - 480, -(y - 450)))));
    }
    return out;
  }

  V.rota(/^\/3d(?:\/(PRES|GOV|PREF)(\d{4})?)?$/, async function (main, cg, an) {
    V.marcarNav("explorar");
    const cargo = cg || "PRES", anos = V.ANOS_VIS[cargo];
    let ano = anos.includes(+an) ? +an : cargo === "PREF" ? 2024 : 2022, medida = "eleitores";
    document.title = "Brasil em 3D · Voto a voto";
    main.innerHTML = `<div class="pagina pagina--larga vis">
      <header class="manchete"><p class="manchete__onde"><a href="#/explorar">Explorar</a> · Brasil em 3D</p>
        <h1 class="manchete__titulo">Cada coluna é uma cidade</h1>
        <p class="manchete__sub" id="tres-sub">A altura é o número de eleitores; a cor, o lado de quem ficou em primeiro. Arraste para girar, use a roda ou dois dedos para aproximar.</p></header>
      <div class="vis-controles">${V.chipsVis(["PRES", "GOV", "PREF"], cargo, ano)}
        <div class="vis-chips" role="group" aria-label="Altura das colunas"><button type="button" class="chip" data-medida="eleitores" aria-pressed="true">Altura: eleitores</button><button type="button" class="chip" data-medida="faltou" aria-pressed="false">Altura: quem faltou (%)</button></div></div>
      <div class="vis-3d" id="tres-palco"><p class="vis-3d__carrega">Montando o Brasil em 3D…</p>
        <div class="vis-3d__acoes"><button type="button" class="btn vis-play" id="tres-play" aria-pressed="false">▶ Passar os anos</button><button type="button" class="btn" id="tres-subir">Apurar de novo</button></div>
        <p class="vis-ano vis-ano--3d" id="tres-ano" aria-hidden="true">${ano}</p></div>
      <div class="vis-3d__pe">${V.legendaLados()}<p class="pq-nota" id="tres-resumo" aria-live="polite"></p></div></div>`;
    const palco = document.getElementById("tres-palco");
    if (!temWebGL()) { palco.innerHTML = '<p class="aviso">Este navegador não conseguiu ligar o 3D (WebGL). <a href="#/mapa">Veja o mapa normal</a>.</p>'; return; }
    const meu = V.pedido, velho = () => meu !== V.pedido;
    await V.carregarScript("vendor/three.min.js"); await V.carregarScript("vendor/OrbitControls.js");
    const [G, BR] = await Promise.all([V.geoBR(), V.baseBR()]);
    if (velho()) return;

    /* ---------- cena ---------- */
    const celular = innerWidth < 720, comSombra = !celular;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { palco.innerHTML = '<p class="aviso">Este navegador não conseguiu ligar o 3D (WebGL). <a href="#/mapa">Veja o mapa normal</a>.</p>'; return; }
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.shadowMap.enabled = comSombra; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("role", "img");
    palco.querySelector(".vis-3d__carrega").remove(); palco.prepend(renderer.domElement);
    const cena = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 1, 5000);
    camera.position.set(0, celular ? 900 : 560, celular ? 760 : 660);
    const ctrl = new THREE.OrbitControls(camera, renderer.domElement);
    ctrl.target.set(-20, 0, 40); ctrl.enableDamping = true; ctrl.dampingFactor = 0.08;
    ctrl.maxPolarAngle = 1.38; ctrl.minDistance = 160; ctrl.maxDistance = 1800;
    ctrl.autoRotate = !V.semMovimento(); ctrl.autoRotateSpeed = 0.55;
    ctrl.addEventListener("start", () => { ctrl.autoRotate = false; });
    cena.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 0.95));
    const sol = new THREE.DirectionalLight(0xffffff, 0.75);
    sol.position.set(-380, 700, 300); sol.castShadow = comSombra;
    Object.assign(sol.shadow.camera, { left: -560, right: 560, top: 560, bottom: -560, near: 10, far: 2000 });
    sol.shadow.camera.updateProjectionMatrix(); sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0008;
    cena.add(sol);

    // chão: os estados levantados como placas, com a borda marcada
    const chaoMat = new THREE.MeshStandardMaterial({ color: 0xf1f2ef, roughness: 0.95 });
    const bordaMat = new THREE.LineBasicMaterial({ color: 0xa3a9b2 });
    for (const u of G.ufs) {
      const geo = new THREE.ExtrudeGeometry(formas(u.d), { depth: 6, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2); geo.translate(0, -6, 0);
      const placa = new THREE.Mesh(geo, chaoMat); placa.receiveShadow = comSombra; cena.add(placa);
      const borda = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), bordaMat); cena.add(borda);
    }

    // colunas: um único InstancedMesh para as 5.566 cidades
    const cids = G.mun.map((f) => ({ id: f.id, x: f.c[0] - 480, z: f.c[1] - 450, c: BR.porIbge.get(f.id) })).filter((c) => c.c);
    const N = cids.length, caixa = new THREE.BoxGeometry(1, 1, 1); caixa.translate(0, 0.5, 0);
    const colunas = new THREE.InstancedMesh(caixa, new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }), N);
    colunas.castShadow = comSombra; colunas.receiveShadow = comSombra;
    colunas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cena.add(colunas);
    const alturaDe = new Float32Array(N), alturaPara = new Float32Array(N), corDe = new Float32Array(N * 3), corPara = new Float32Array(N * 3);
    const atraso = Float32Array.from(cids, (c) => (c.z + 450) / 900 * 900);   // a apuração varre o mapa de norte a sul
    const m4 = new THREE.Matrix4(), cor = new THREE.Color(), LARG = 3;

    /* ---------- dados de cada eleição ---------- */
    let venc = null, comp = null;
    async function carregar(cg2, a) {
      [venc, comp] = await Promise.all([V.dados("br/venc/" + cg2 + a), V.dados("br/comp/" + a)]);
      const val = (c) => { const t = comp[c.id] && comp[c.id].t1; return !t ? 0 : medida === "eleitores" ? t[0] : t[2] / t[0]; };
      const vs = cids.map(val), max = medida === "eleitores" ? Math.max(...vs) : 0.45;
      cids.forEach((c, i) => {
        alturaDe[i] = alturaPara[i]; corDe[i * 3] = corPara[i * 3]; corDe[i * 3 + 1] = corPara[i * 3 + 1]; corDe[i * 3 + 2] = corPara[i * 3 + 2];
        const f = Math.min(1, vs[i] / max);
        alturaPara[i] = vs[i] ? Math.max(0.8, ALTO * (medida === "eleitores" ? Math.sqrt(f) : f)) : 0.3;   // raiz: São Paulo alto sem esconder as pequenas
        cor.set(V.corVenc(venc[c.id])); corPara[i * 3] = cor.r; corPara[i * 3 + 1] = cor.g; corPara[i * 3 + 2] = cor.b;
      });
      const r = V.resumoVis(venc, cg2);
      document.getElementById("tres-ano").textContent = a;
      document.getElementById("tres-resumo").innerHTML = `${V.NOME_VIS[cg2]} ${a}: ${r.top[0] ? `<b>${V.esc(r.top[0][0])}</b> ficou em 1º em ${V.int(r.top[0][1])} cidades. ` : ""}Esquerda em ${V.int(r.lados.esquerda)}, centro em ${V.int(r.lados.centro)}, direita em ${V.int(r.lados.direita)}.`;
      renderer.domElement.setAttribute("aria-label", `Brasil em 3D, ${V.NOME_VIS[cg2].toLowerCase()} ${a}: colunas com a altura ${medida === "eleitores" ? "do número de eleitores" : "da parte que faltou"} e a cor do lado vencedor.`);
      document.getElementById("tres-sub").textContent = medida === "eleitores" ? "A altura é o número de eleitores; a cor, o lado de quem ficou em primeiro. Arraste para girar, use a roda ou dois dedos para aproximar." : "A altura é a parte dos eleitores que não foi votar; a cor, o lado de quem ficou em primeiro. Arraste para girar.";
      main.querySelectorAll("[data-vis-ano]").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.visAno === a));
      main.querySelectorAll("[data-medida]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.medida === medida));
    }

    /* ---------- animação ---------- */
    let t0 = 0, dur = 1, onda = false;
    const animar = (comOnda) => { onda = comOnda && !V.semMovimento(); t0 = performance.now(); dur = V.semMovimento() ? 1 : onda ? 2600 : 1100; };
    function aplicar(agora) {
      let falta = false;
      for (let i = 0; i < N; i++) {
        const local = onda ? (agora - t0 - atraso[i]) / (dur - 900) : (agora - t0) / dur;
        const f = V.suave(Math.max(0, Math.min(1, local)));
        if (f < 1) falta = true;
        const h = alturaDe[i] + (alturaPara[i] - alturaDe[i]) * f;
        m4.makeScale(LARG, Math.max(0.05, h), LARG); m4.setPosition(cids[i].x, 0, cids[i].z);
        colunas.setMatrixAt(i, m4);
        cor.setRGB(corDe[i * 3] + (corPara[i * 3] - corDe[i * 3]) * f, corDe[i * 3 + 1] + (corPara[i * 3 + 1] - corDe[i * 3 + 1]) * f, corDe[i * 3 + 2] + (corPara[i * 3 + 2] - corDe[i * 3 + 2]) * f);
        colunas.setColorAt(i, cor);
      }
      colunas.instanceMatrix.needsUpdate = true; colunas.instanceColor.needsUpdate = true;
      return falta;
    }
    let anim = true;
    function medir() {
      const w = palco.clientWidth, h = Math.max(360, Math.min(innerHeight * 0.72, w * 0.78));
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    function quadro(agora) {
      if (!renderer.domElement.isConnected) { renderer.dispose(); ctrl.dispose(); removeEventListener("resize", medir); clearTimeout(tmr); return; }
      if (anim) anim = aplicar(agora);
      ctrl.update(); renderer.render(cena, camera);
      requestAnimationFrame(quadro);
    }

    // dica e clique: raio do mouse até a coluna
    const raio = new THREE.Raycaster(), ponto = new THREE.Vector2();
    let baixou = null;
    const colunaEm = (ev) => {
      const r = renderer.domElement.getBoundingClientRect();
      ponto.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      raio.setFromCamera(ponto, camera);
      const hit = raio.intersectObject(colunas)[0];
      return hit ? cids[hit.instanceId] : null;
    };
    renderer.domElement.addEventListener("pointermove", (ev) => {
      if (ev.pointerType !== "mouse" || ev.buttons) { V.dica(null, null); return; }
      const c = colunaEm(ev); if (!c) { V.dica(null, null); renderer.domElement.style.cursor = ""; return; }
      const w = venc[c.id], t = comp[c.id] && comp[c.id].t1;
      renderer.domElement.style.cursor = "pointer";
      V.dica(ev, V.linhasDica(`${c.c.nome} (${c.c.uf})`, [["1º lugar", w && w[9] ? `${V.titulo(w[1])} (${V.nomePartido(w[2])})` : "sem resultado"], ["Eleitores", t ? V.int(t[0]) : "—"], ["Faltaram", t ? V.pct((100 * t[2]) / t[0]) : "—"]]));
    });
    renderer.domElement.addEventListener("pointerleave", () => V.dica(null, null));
    renderer.domElement.addEventListener("pointerdown", (ev) => { baixou = [ev.clientX, ev.clientY]; });
    renderer.domElement.addEventListener("pointerup", (ev) => {
      if (!baixou || Math.hypot(ev.clientX - baixou[0], ev.clientY - baixou[1]) > 6) return;   // foi arrasto, não clique
      const c = colunaEm(ev); if (c) { V.dica(null, null); V.ir(`#/mapa/e/${cargoAtual}${anoAtual}/br/${c.c.uf}/c/${c.id}`); }
    });

    /* ---------- controles ---------- */
    let cargoAtual = cargo, anoAtual = ano, tocando = false, tmr = null;
    const play = document.getElementById("tres-play");
    const trocar = async (a, comOnda) => { anoAtual = a; await carregar(cargoAtual, a); if (!renderer.domElement.isConnected) return; animar(comOnda); anim = true; };
    const parar = () => { tocando = false; clearTimeout(tmr); play.textContent = "▶ Passar os anos"; play.setAttribute("aria-pressed", "false"); };
    const tocar = () => {
      tocando = true; play.textContent = "❚❚ Pausar"; play.setAttribute("aria-pressed", "true");
      const lista = V.ANOS_VIS[cargoAtual];
      const prox = async () => { if (!tocando || !renderer.domElement.isConnected) return; const k = lista.indexOf(anoAtual); if (k === lista.length - 1) { parar(); return; } await trocar(lista[k + 1], false); tmr = setTimeout(prox, 2200); };
      if (anoAtual === lista[lista.length - 1]) { trocar(lista[0], false).then(() => { tmr = setTimeout(prox, 2200); }); } else prox();
    };
    play.addEventListener("click", () => (tocando ? parar() : tocar()));
    document.getElementById("tres-subir").addEventListener("click", () => { alturaDe.fill(0); corDe.set(corPara); onda = true; t0 = performance.now(); dur = V.semMovimento() ? 1 : 2600; anim = true; });
    main.querySelector(".vis-controles").addEventListener("click", (e) => {
      const a = e.target.closest("[data-vis-ano]"), c = e.target.closest("[data-vis-cargo]"), md = e.target.closest("[data-medida]");
      if (a) { parar(); trocar(+a.dataset.visAno, false); }
      if (md && md.dataset.medida !== medida) { medida = md.dataset.medida; trocar(anoAtual, false); }
      if (c && c.dataset.visCargo !== cargoAtual) { parar(); V.ir("#/3d/" + c.dataset.visCargo); }
    });

    medir(); addEventListener("resize", medir);
    await carregar(cargo, ano);
    alturaDe.fill(0); corDe.set(corPara);   // primeira vez: tudo nasce do chão
    animar(true);
    requestAnimationFrame(quadro);
    if (V.tourAtivo && V.tourAtivo()) setTimeout(() => { if (renderer.domElement.isConnected) tocar(); }, 3200);
  });
})();
