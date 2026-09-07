// Banco di prova headless: riproduce fedelmente il ciclo di main.js senza DOM.
// uso: node sim.mjs <seed> <acqua%> <anni-tick> [pop]
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

export async function corri(seed, acqua, tick = 22000, popStart = 240) {
  const world = generateWorld({ seed, waterPct: acqua });
  const registry = new MaterialRegistry();
  for (const m of defaultMaterials()) registry.add(m);

  registry.bindWorld(world);
  const pop = new Population(world, registry, new KnowledgeBase());
  pop.spawn(popStart);
  spawnAnimals(pop, 320, 45);
  const dt = 0.165;
  let acc = 0;
  for (let t = 0; t < tick; t++) {
    stepClimate(pop, dt);
    pop.step(dt);
    stepEcosystem(pop, dt);
    stepSociety(pop, dt, predatorThreatQuery(pop));
    stepBuildings(pop, dt); stepFire(pop, dt);
    acc += dt;
    if (acc > 0.35) {
      try { updateFactions(pop); } catch (e) {}
      stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc);
      acc = 0;
    }
    if (t % 2000 === 0 && !pop.npcs.some((n) => n.vivo)) break;
  }
  return { pop, registry, world };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const { inclinazioni, avversioni } = await import(B + "experience.js");
  const seed = process.argv[2] || "prova";
  const acqua = +(process.argv[3] || 62);
  const t0 = Date.now();
  const { pop, registry } = await corri(seed, acqua, +(process.argv[4] || 22000));
  const s = pop.stats();
  const combatte = (n) => (n._colpi || 0) > 0;
  console.log(JSON.stringify({
    seed, acqua, anno: pop.anno | 0, sec: ((Date.now() - t0) / 1000) | 0,
    vivi: pop.npcs.filter((n) => n.vivo).length,
    assocMedie: s.esperienzeMedie, coppie: s.coppie, eredita: s.eredita,
    inclinazioni: inclinazioni(pop).map((i) => `${i.nome} ${i.v > 0 ? "+" : ""}${i.v.toFixed(2)}`),
    diChiCombatte: inclinazioni(pop, combatte, 5).map((i) => `${i.nome} ${i.v > 0 ? "+" : ""}${i.v.toFixed(2)}`),
    avversioni: avversioni(pop, registry).map((a) => `${a.nome} (${(a.quota * 100) | 0}%)`),
    razzie: pop.razzieTot || 0, popoli: s.popoli, mestieri: s.mestieri,
    libri: pop.libri || 0, ere: (pop.ere || []).length, desert: pop.desertificati || 0,
    entita: s.entita, memi: s.memi,
  }, null, 1));
}
