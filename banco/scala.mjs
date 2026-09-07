// COME CRESCE IL COSTO CON LA GENTE. Non basta sapere che rallenta: serve l'esponente. Se un
// modulo raddoppia quando la gente raddoppia e' lineare e si puo' tenere; se quadruplica e'
// quadratico e prima o poi impianta il mondo, qualunque macchina si usi.
import fs from "fs";
const B = "../src/";
const { P } = await import(B + "params.js");
P.tettoPopolazione = 999999; P.tettoFauna = 999999;
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

const world = generateWorld({ seed: process.argv[2] || "scala", waterPct: 58 });
const registry = new MaterialRegistry();
for (const m of defaultMaterials()) registry.add(m);
registry.bindWorld(world);
const pop = new Population(world, registry, new KnowledgeBase());
pop.spawn(240);
spawnAnimals(pop, 320, 45);

const dt = 0.165;
let acc = 0;
const c = { clima: 0, umani: 0, fauna: 0, emozioni: 0, edifici: 0, fuoco: 0, fazioni: 0, cultura: 0, societa: 0, entita: 0 };
const t0 = () => Number(process.hrtime.bigint());
const giro = () => {
  let a = t0(); stepClimate(pop, dt); c.clima += t0() - a;
  a = t0(); pop.step(dt); c.umani += t0() - a;
  a = t0(); stepEcosystem(pop, dt); c.fauna += t0() - a;
  a = t0(); stepSociety(pop, dt, predatorThreatQuery(pop)); c.emozioni += t0() - a;
  a = t0(); stepBuildings(pop, dt); c.edifici += t0() - a;
  a = t0(); stepFire(pop, dt); c.fuoco += t0() - a;
  acc += dt;
  if (acc > 0.35) {
    a = t0(); try { updateFactions(pop); } catch (e) {} c.fazioni += t0() - a;
    a = t0(); stepCulture(pop, acc); c.cultura += t0() - a;
    a = t0(); stepSocietyAdvanced(pop, acc); c.societa += t0() - a;
    a = t0(); stepEntities(pop, acc); c.entita += t0() - a;
    acc = 0;
  }
};

const TAPPE = (process.env.TAPPE || "600,1200,2400,4800").split(",").map(Number);
const LOG = process.env.LOG || "scala.txt";
let prec = null;
for (const soglia of TAPPE) {
  while (pop.npcs.filter((n) => n.vivo).length < soglia) {
    giro();
    if (pop.anno > 900) break;
  }
  const vivi = pop.npcs.filter((n) => n.vivo).length;
  if (vivi < soglia * 0.9) { fs.appendFileSync(LOG, "non ci arriva a " + soglia + " (fermo a " + vivi + ")\n"); break; }
  for (const k in c) c[k] = 0;
  const N = 60;
  for (let i = 0; i < N; i++) giro();
  const ms = {};
  let tot = 0;
  for (const k in c) { ms[k] = c[k] / 1e6 / N; tot += ms[k]; }
  const ordinati = Object.entries(ms).sort((x, y) => y[1] - x[1]);
  let riga = "gente=" + vivi + " bestie=" + pop.creature.filter((a) => a.vivo).length +
    " TOT=" + tot.toFixed(1) + "ms | " + ordinati.map(([k, v]) => k + "=" + v.toFixed(2)).join(" ");
  if (prec) {
    const fattGente = vivi / prec.vivi;
    const esp = (k) => (Math.log(ms[k] / Math.max(1e-6, prec.ms[k])) / Math.log(fattGente)).toFixed(2);
    riga += "\n   gente x" + fattGente.toFixed(2) + " -> esponenti: " +
      ordinati.filter(([k]) => ms[k] > 0.5).map(([k]) => k + "^" + esp(k)).join(" ") +
      "  TOTALE^" + (Math.log(tot / prec.tot) / Math.log(fattGente)).toFixed(2);
  }
  console.log(riga);
  fs.appendFileSync(LOG, riga + "\n");
  prec = { vivi, ms, tot };
}
