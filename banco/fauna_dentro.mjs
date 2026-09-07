// DENTRO stepEcosystem: bestie, caccia degli umani, contagio. Sono tre cose che scalano con cose
// diverse — le bestie col numero di bestie, le altre due con la GENTE — e sommarle in un totale
// solo fa credere che sia esplosa la fauna quando invece sono cresciuti i cacciatori.
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
const giro = () => {
  stepClimate(pop, dt); pop.step(dt); stepEcosystem(pop, dt);
  stepSociety(pop, dt, predatorThreatQuery(pop));
  stepBuildings(pop, dt); stepFire(pop, dt);
  acc += dt;
  if (acc > 0.35) { try { updateFactions(pop); } catch (e) {} stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc); acc = 0; }
};

const vivi = () => pop.npcs.filter((n) => n.vivo).length;
const bestie = () => pop.creature.filter((a) => a.vivo).length;
for (const soglia of (process.env.TAPPE || "600,1200,2400,4800").split(",").map(Number)) {
  while (vivi() < soglia) { giro(); if (pop.anno > 900) break; }
  if (vivi() < soglia * 0.9) { console.log("non ci arriva a " + soglia); break; }
  pop._cronoFauna = { bestie: 0, caccia: 0, malattia: 0 };
  const N = 60;
  for (let i = 0; i < N; i++) giro();
  const c = pop._cronoFauna, b = bestie(), g = vivi();
  const ms = (v) => (v / N).toFixed(2);
  console.log(
    "gente=" + String(g).padStart(4) + " bestie=" + String(b).padStart(6) +
    " | bestie " + ms(c.bestie) + "ms (" + ((c.bestie / N / b) * 1000).toFixed(2) + " µs a testa)" +
    " | caccia " + ms(c.caccia) + "ms (" + ((c.caccia / N / g) * 1000).toFixed(2) + " µs a persona)" +
    " | malattia " + ms(c.malattia) + "ms");
}
