// QUANTO COSTA RESTITUIRE LA REATTIVITÀ ALLE BESTIE.
//
// Il passo della fauna è spezzato in turni: chi tocca il turno riceve il tempo di tutti, e reagisce
// più tardi a un predatore. Con quattro turni una bestia si accorge del pericolo fino a tre battiti
// dopo. Adesso che quel passo costa molto meno, vale la pena sapere che prezzo ha riprendersi quella
// qualità — perché è qualità, non ottimizzazione al contrario.
//
// uso: node banco/turni_fauna.mjs [seme]
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

const seme = process.argv[2] || "scala";
const SOGLIA = +(process.env.GENTE || 1200);

for (const turni of [4, 2, 1]) {
  P.turniFauna = turni;
  const world = generateWorld({ seed: seme, waterPct: 58 });
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
  while (vivi() < SOGLIA && pop.anno < 900) giro();

  pop._cronoFauna = { bestie: 0, caccia: 0, malattia: 0 };
  const N = 60;
  const t0 = Number(process.hrtime.bigint());
  for (let i = 0; i < N; i++) giro();
  const tot = (Number(process.hrtime.bigint()) - t0) / 1e6 / N;
  const b = pop.creature.filter((a) => a.vivo).length;
  const pred = pop.creature.filter((a) => a.vivo && a.dna.carnivoria > 0.5).length;
  console.log(
    "turni=" + turni +
    " | gente=" + String(vivi()).padStart(4) + " bestie=" + String(b).padStart(6) +
    " predatori=" + String(pred).padStart(5) +
    " | passo bestie " + (pop._cronoFauna.bestie / N).toFixed(1) + "ms" +
    " | giro intero " + tot.toFixed(1) + "ms");
}
console.log("\nLe bestie non sono le stesse fra un turno e l'altro: cambiando il ritmo cambia il mondo.");
console.log("Il numero da guardare è il costo, non il pareggio fra le righe.");
