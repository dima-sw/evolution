// QUANTO FINE CONVIENE FARE LA GRIGLIA DELLE FAZIONI?
//
// Costruire i legami sociali cerca, per ogni persona, le K più vicine entro il raggio. Si va per
// anelli concentrici e ci si ferma appena da fuori non può arrivare nessuno di più vicino — ma
// quell'uscita scatta solo se le celle sono abbastanza piccole: con celle grandi si finisce per
// rastrellare comunque tutta l'area del raggio.
//
// Celle più fini = si esce prima nella calca, ma si interrogano più celle vuote nel rado. Non è
// deducibile: si misura. Il RISULTATO non cambia mai — le K più vicine sono le K più vicine
// qualunque sia la griglia.
//
// uso: node banco/passo_fazioni.mjs [seme]
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

for (const soglia of (process.env.TAPPE || "1200,2400").split(",").map(Number)) {
  while (vivi() < soglia && pop.anno < 900) giro();
  if (vivi() < soglia * 0.9) { console.log("non ci arriva a " + soglia); break; }
  const righe = [];
  for (const passo of [3, 2, 1]) {
    P.passoFazioni = passo;
    updateFactions(pop);                       // un giro a vuoto, per scaldare
    const N = 25;
    const t0 = Number(process.hrtime.bigint());
    for (let i = 0; i < N; i++) updateFactions(pop);
    const ms = (Number(process.hrtime.bigint()) - t0) / 1e6 / N;
    righe.push({ passo, ms, popoli: (pop.factions || []).length });
  }
  const base = righe.find((r) => r.passo === 2).ms;
  console.log("gente=" + String(vivi()).padStart(4) + " | " +
    righe.map((r) => "passo " + r.passo + ": " + r.ms.toFixed(1) + "ms" +
      (r.passo === 2 ? " (com'è ora)" : " (×" + (r.ms / base).toFixed(2) + ")")).join("  ·  ") +
    " | popoli " + righe.map((r) => r.popoli).join("/"));
}
console.log("\nI popoli devono coincidere fra le tre righe: se non coincidono, la griglia sta cambiando il risultato.");
