/* Mapa leve: projeta as cidades e os estados uma vez só (aqui, não no navegador) e grava os desenhos prontos.
   Uso: node scripts/geo_proj.js MUN_TOPOJSON UF_TOPOJSON SAIDA.json
   Mesma projeção do mapa (Mercator encaixada em 960 x 900, margem 12), coordenadas com 1 casa decimal. */
const fs = require("fs"), vm = require("vm");
const ctx = { window: {}, self: {}, console }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["vendor/d3.min.js", "vendor/topojson-client.min.js"]) vm.runInContext(fs.readFileSync(f, "utf8"), ctx);
const d3 = ctx.d3 || ctx.window.d3 || ctx.self.d3, topojson = ctx.topojson || ctx.window.topojson || ctx.self.topojson;
const [gmF, guF, saida] = process.argv.slice(2);
const gm = JSON.parse(fs.readFileSync(gmF)), gu = JSON.parse(fs.readFileSync(guF));
const COD_UF = { 11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO", 21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA", 31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS", 50: "MS", 51: "MT", 52: "GO", 53: "DF" };
// polígonos com orientação invertida cobrem o globo inteiro: desvira (igual ao que o site fazia)
const conserta = (fc) => fc.features.forEach((f) => { if (d3.geoArea(f) > 2 * Math.PI) { const g = f.geometry; const rev = (p) => p.map((r) => r.slice().reverse()); g.coordinates = g.type === "Polygon" ? rev(g.coordinates) : g.coordinates.map(rev); } });
const mun = topojson.feature(gm, gm.objects[Object.keys(gm.objects)[0]]); conserta(mun);
const ufs = topojson.feature(gu, gu.objects[Object.keys(gu.objects)[0]]); conserta(ufs);
const W = 960, H = 900, proj = d3.geoMercator().fitExtent([[12, 12], [W - 12, H - 12]], ufs), path = d3.geoPath(proj).digits(1);
const r1 = (v) => Math.round(v * 10) / 10;
const caixa = (f) => path.bounds(f).flat().map(r1);
const out = {
  W, H,
  m: mun.features.map((f) => [String(f.properties.id), path(f), ...caixa(f), ...path.centroid(f).map(r1)]),
  uf: ufs.features.map((f) => [COD_UF[f.properties.uf], path(f), ...caixa(f)]),
  mesh: path(topojson.mesh(gu, gu.objects[Object.keys(gu.objects)[0]], (a, b) => a !== b)),
};
fs.writeFileSync(saida, JSON.stringify(out));
const pts = out.m.reduce((s, x) => s + (x[1] ? x[1].split(/[MLZ]/).length : 0), 0);
console.log(saida, (fs.statSync(saida).size / 1e6).toFixed(2) + " MB,", out.m.length, "cidades,", pts, "pontos");
