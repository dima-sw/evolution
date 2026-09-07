import fsLog from "fs";
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
const { P } = await import(B + "params.js");
if (process.env.ARID !== undefined) P.aridimento = +process.env.ARID;
if (process.env.EXP === "0") P.espSpenta = 1;

const seed = process.argv[2] || "diagnosi";
const acqua = +(process.argv[3] || 60);
const TICK = +(process.argv[4] || 9000);
const world = generateWorld({ seed, waterPct: acqua });
const registry = new MaterialRegistry();
for (const m of defaultMaterials()) registry.add(m);

registry.bindWorld(world);
const pop = new Population(world, registry, new KnowledgeBase());
pop.spawn(240);
spawnAnimals(pop, 320, 45);

const dt = 0.165; let acc = 0;
let prevMorti = 0, prevNascite = 0;
for (let t = 0; t < TICK; t++) {
  stepClimate(pop, dt); pop.step(dt); stepEcosystem(pop, dt);
  stepSociety(pop, dt, predatorThreatQuery(pop));
  stepBuildings(pop, dt); stepFire(pop, dt);
  acc += dt;
  if (acc > 0.35) { try { updateFactions(pop); } catch (e) {} stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc); acc = 0; }
  if (t % 500 === 0) {
    const vivi = pop.npcs.filter((n) => n.vivo);
    if (!vivi.length) { console.log(`t=${t} anno=${pop.anno|0} ESTINTI`); break; }
    const med = (f) => (vivi.reduce((s, n) => s + f(n), 0) / vivi.length).toFixed(2);
    console.log([
      `t=${String(t).padStart(5)}`, `anno=${String(pop.anno|0).padStart(4)}`,
      `vivi=${String(vivi.length).padStart(4)}`,
      `nasc/500=${pop.nascite - prevNascite}`, `morti/500=${pop.morti - prevMorti}`,
      `fame=${med((n) => n.fame)}`, `sete=${med((n) => n.sete)}`,
      `sal=${med((n) => n.salute)}`, `eta=${med((n) => n.eta)}`,
      `fert=${(pop.fertility.reduce((s,v)=>s+v,0)/pop.fertility.length).toFixed(2)}`, `des=${pop.desertificati||0}`, `raz=${pop.razzieTot||0}`,
      `assoc=${med((n) => n.esperienze ? n.esperienze.size : 0)}`,
    ].join(" "));
    try { fsLog.appendFileSync(process.env.LOG || "progresso.txt",
      "t=" + t + " anno=" + (pop.anno|0) + " vivi=" + vivi.length
      + " fame=" + med((n) => n.fame) + " sal=" + med((n) => n.salute)
      + " fert=" + (pop.fertility.reduce((s,v)=>s+v,0)/pop.fertility.length).toFixed(2)
      + " sfarzo=" + med((n) => n._sfarzo || 0) + " emigr=" + (pop.emigrazioni||0) + "\n"); } catch (e) {}
    prevMorti = pop.morti; prevNascite = pop.nascite;
  }
}
