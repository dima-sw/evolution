// QUANTO COSTA CERCARE IL CIBO A OCCHIO.
//
// `bestCell` guarda una finestra quadrata attorno a chi ha fame e tiene il tile migliore. Con
// raggio 8 sono 289 tile per interrogazione — e a interrogare sono sia le persone sia le bestie.
// Prima di costruire qualunque struttura per evitarlo bisogna sapere QUANTE volte accade e QUANTO
// pesa davvero: `npc.js` scala quasi lineare, quindi non è detto che sia lui il collo di bottiglia.
//
// uso: node banco/conta_cibo.mjs [seed] [tick] [battiti-misurati]
import { corri } from "./sim.mjs";
const B = "../src/";
const { Population } = await import(B + "npc.js");
const { stepEcosystem, predatorThreatQuery } = await import(B + "animals.js");
const { stepSociety } = await import(B + "emotions.js");
const { stepSocietyAdvanced } = await import(B + "society.js");
const { stepCulture } = await import(B + "culture.js");
const { stepEntities } = await import(B + "entities.js");
const { stepBuildings } = await import(B + "buildings.js");
const { stepClimate } = await import(B + "climate.js");
const { stepFire } = await import(B + "fire.js");
const { updateFactions } = await import(B + "factions.js");

const { pop } = await corri(process.argv[2] || "scala", 58, +(process.argv[3] || 900));
const BATTITI = +(process.argv[4] || 30);
const vivi = pop.npcs.reduce((s, n) => s + (n.vivo ? 1 : 0), 0);
console.log("gente " + vivi + " · bestie " + (pop.animals ? pop.animals.length : 0));

const c = { chiamate: 0, tile: 0, trovati: 0, ms: 0 };
const vero = Population.prototype.bestCell;
Population.prototype.bestCell = function (grid, cx, cy, R, minV = 0.15) {
  const t = performance.now();
  const r = vero.call(this, grid, cx, cy, R, minV);
  c.ms += performance.now() - t;
  c.chiamate++;
  const x0 = Math.max(0, (cx | 0) - R), x1 = Math.min(this.world.width - 1, (cx | 0) + R);
  const y0 = Math.max(0, (cy | 0) - R), y1 = Math.min(this.world.height - 1, (cy | 0) + R);
  c.tile += (x1 - x0 + 1) * (y1 - y0 + 1);
  if (r) c.trovati++;
  return r;
};

const dt = 0.165;
let acc = 0;
const t0 = performance.now();
for (let t = 0; t < BATTITI; t++) {
  stepClimate(pop, dt); pop.step(dt); stepEcosystem(pop, dt);
  stepSociety(pop, dt, predatorThreatQuery(pop));
  stepBuildings(pop, dt); stepFire(pop, dt);
  acc += dt;
  if (acc > 0.35) { try { updateFactions(pop); } catch (e) {} stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc); acc = 0; }
}
const tutto = (performance.now() - t0) / BATTITI;
const n = (v, d = 1) => v.toFixed(d);
console.log("\nper battito:");
console.log("  chiamate a bestCell ... " + n(c.chiamate / BATTITI, 0));
console.log("  tile letti ............ " + n(c.tile / BATTITI, 0));
console.log("  hanno trovato qualcosa  " + n(c.trovati * 100 / Math.max(1, c.chiamate), 1) + "%");
console.log("  ms dentro bestCell .... " + n(c.ms / BATTITI, 2) + "  (col cronometro addosso: è una SOPRASTIMA)");
console.log("  ms di tutto il battito  " + n(tutto, 1));
console.log("  quota ................. " + n(c.ms / BATTITI / tutto * 100, 1) + "%");
