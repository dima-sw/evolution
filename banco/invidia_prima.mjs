// IL DIVARIO **PRIMA** CHE LA GUERRA SCOPPI.
//
// Una fotografia non può rispondere: fra chi si fa la guerra il divario di ricchezza è piccolo
// (0,262 contro 0,349), ma è quasi certamente causazione INVERSA — le razzie impoveriscono
// entrambi, quindi chi combatte da tempo si è per forza livellato. Guardare la foto e concludere
// «l'ineguaglianza porta pace» sarebbe l'errore classico.
//
// Qui si guarda il film: a ogni campionamento si registrano le coppie **in pace**, con il loro
// divario di ricchezza e di numero; poi si controlla chi, entro i campionamenti seguenti, finisce
// in guerra. Così il divario è misurato PRIMA, e la guerra viene dopo.
import fs from "fs";
const B = "../src/";
const { generateWorld } = await import(B + "world.js");
const { MaterialRegistry, defaultMaterials } = await import(B + "materials.js");
const { KnowledgeBase } = await import(B + "chemistry.js");
const { Population } = await import(B + "npc.js");
const { spawnAnimals, stepEcosystem, predatorThreatQuery } = await import(B + "animals.js");
const { stepSociety } = await import(B + "emotions.js");
const { stepSocietyAdvanced } = await import(B + "society.js");
const { stepCulture } = await import(B + "culture.js");
const { stepEntities } = await import(B + "entities.js");
const { stepBuildings } = await import(B + "buildings.js");
const { stepClimate } = await import(B + "climate.js");
const { stepFire } = await import(B + "fire.js");
const { updateFactions } = await import(B + "factions.js");

const world = generateWorld({ seed: process.argv[2] || "prima", waterPct: 58 });
const registry = new MaterialRegistry();
for (const m of defaultMaterials()) registry.add(m);
registry.bindWorld(world);
const pop = new Population(world, registry, new KnowledgeBase());
pop.spawn(240);
spawnAnimals(pop, 320, 45);

const dt = 0.165;
let acc = 0;
const giro = () => {
  stepClimate(pop, dt); pop.step(dt); stepEcosystem(pop, dt);
  stepSociety(pop, dt, predatorThreatQuery(pop));
  stepBuildings(pop, dt); stepFire(pop, dt);
  acc += dt;
  if (acc > 0.35) { try { updateFactions(pop); } catch (e) {} stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc); acc = 0; }
};

const chiave = (a, b) => [a, b].sort().join("|");
const inAttesa = new Map();   // coppie viste in pace: chiave -> {ricc, num, scaduta}
const esiti = [];             // {ricc, num, guerra}
const TICK = +(process.argv[3] || 1400), PASSO = 40, FINESTRA = 6;

for (let t = 0; t < TICK; t++) {
  giro();
  if (t % PASSO !== 0) continue;

  const facs = (pop.factions || []).filter((f) => f._membri && f._membri.length >= 8);
  if (facs.length < 3) continue;
  const guerre = new Set((pop.fronti || []).map((x) => chiave(x.a, x.b)));

  // 1) chi era in attesa e ora è in guerra: esito positivo. Chi è scaduto: esito negativo.
  for (const [k, v] of [...inAttesa]) {
    if (guerre.has(k)) { esiti.push({ ...v, guerra: 1 }); inAttesa.delete(k); continue; }
    if (--v.scaduta <= 0) { esiti.push({ ...v, guerra: 0 }); inAttesa.delete(k); }
  }

  // 2) nuove coppie in pace da tenere d'occhio
  for (const f of facs) {
    let s = 0, n = 0;
    for (const m of f._membri) { if (!m.vivo) continue; s += m._agiatezza ?? 1; n++; }
    f._ric = n ? s / n : 1;
  }
  for (let i = 0; i < facs.length; i++) for (let j = i + 1; j < facs.length; j++) {
    const A = facs[i], B = facs[j];
    if (Math.hypot(A.x - B.x, A.y - B.y) > 90) continue;
    const k = chiave(A.nome, B.nome);
    if (guerre.has(k) || inAttesa.has(k)) continue;
    inAttesa.set(k, {
      ricc: Math.abs(A._ric - B._ric) / Math.max(A._ric, B._ric, 1e-6),
      num: Math.abs(A.membri - B.membri) / Math.max(A.membri, B.membri),
      scaduta: FINESTRA,
    });
  }
}

if (esiti.length < 40) { console.log("troppo pochi esiti: " + esiti.length); process.exit(0); }
function corr(a, b) {
  const ma = a.reduce((s, x) => s + x, 0) / a.length, mb = b.reduce((s, x) => s + x, 0) / b.length;
  let n = 0, da = 0, db = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; n += x * y; da += x * x; db += y * y; }
  return da && db ? n / Math.sqrt(da * db) : 0;
}
const g = esiti.map((e) => e.guerra);
const scoppiate = esiti.filter((e) => e.guerra), rimastePace = esiti.filter((e) => !e.guerra);
const m = (v, k) => v.length ? +(v.reduce((s, x) => s + x[k], 0) / v.length).toFixed(3) : null;

console.log(JSON.stringify({
  anno: pop.anno | 0,
  "coppie osservate in pace, poi seguite": esiti.length,
  "…che sono finite in guerra": scoppiate.length,
  "…rimaste in pace": rimastePace.length,
  "── il divario MISURATO PRIMA, e la guerra dopo ──": "",
  "divario di RICCHEZZA → guerra": +corr(esiti.map((e) => e.ricc), g).toFixed(3),
  "divario di NUMERO → guerra": +corr(esiti.map((e) => e.num), g).toFixed(3),
  "divario medio di ricchezza — poi in guerra": m(scoppiate, "ricc"),
  "divario medio di ricchezza — rimaste in pace": m(rimastePace, "ricc"),
  "divario medio di numero — poi in guerra": m(scoppiate, "num"),
  "divario medio di numero — rimaste in pace": m(rimastePace, "num"),
}, null, 1));
