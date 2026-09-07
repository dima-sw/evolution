// Dentro pop.step: quale metodo costa? Si avvolgono i metodi senza toccare il sorgente.
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

const world = generateWorld({ seed: "profilo", waterPct: 60 });
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
for (let t = 0; t < 1800; t++) giro();

// ora si avvolgono i metodi sospetti
const cron = {};
const P = Object.getPrototypeOf(pop);
const sospetti = ["gatherAndCraft", "eatKnownFood", "useMedicine", "maybeFabbrica", "updateSapere",
  "ricetteNote", "experiment", "maybeBuildHouse", "maybeFarm", "maybeScrivi", "maybeLeggi",
  "updateMestiere", "aggiornaMedieAzioni", "tileIdx", "walkable", "freshWaterAt", "foraggia", "moveToward", "wander", "bestFood", "reproduce", "aggiornaRicchezza", "seguiAridita",
  // aggiunti dopo: le cose nuove vanno guardate come tutte le altre
  "utensile", "consumaUtensile", "logora", "capienza", "vicini", "decayInventory", "ritrattoDi"];
for (const nome of sospetti) {
  const f = P[nome];
  if (typeof f !== "function") continue;
  cron[nome] = 0;
  P[nome] = function (...args) {
    const t0 = process.hrtime.bigint();
    try { return f.apply(this, args); }
    finally { cron[nome] += Number(process.hrtime.bigint() - t0) / 1e6; }
  };
}

const GIRI = 250;
const t0 = process.hrtime.bigint();
for (let t = 0; t < GIRI; t++) giro();
const tot = Number(process.hrtime.bigint() - t0) / 1e6;

console.log(`umani ${pop.npcs.filter((n) => n.vivo).length} · ${GIRI} giri · totale ${tot.toFixed(0)} ms (${(tot / GIRI).toFixed(1)} ms/giro)\n`);
for (const [k, v] of Object.entries(cron).sort((a, b) => b[1] - a[1])) {
  if (v < 1) continue;
  console.log(k.padEnd(20), (v / GIRI).toFixed(3).padStart(8), "ms/giro", ((v / tot) * 100).toFixed(1).padStart(6) + "%");
}
