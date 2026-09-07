// QUANTA GENTE PUÒ NUTRIRE QUESTA MAPPA? La domanda che sta sotto a tutta la faccenda dei tetti.
// Non serve simulare per ore: la capacità di carico è la somma di quanto rende ogni tile diviso
// quanto consuma una persona. Se il mondo si ferma LÌ, allora non manca nessuna legge — è che
// quella mappa nutre quella gente, e il salvagente sta semplicemente dove sta il soffitto vero.
const B = "../src/";
const { P } = await import(B + "params.js");
const { generateWorld } = await import(B + "world.js");
const { MaterialRegistry, defaultMaterials } = await import(B + "materials.js");
const { KnowledgeBase } = await import(B + "chemistry.js");
const { Population } = await import(B + "npc.js");

const DIM = +(process.env.DIM || 320);
const world = generateWorld({ seed: process.argv[2] || "capienza", width: DIM, height: DIM, waterPct: 58 });
const registry = new MaterialRegistry();
for (const m of defaultMaterials()) registry.add(m);
registry.bindWorld(world);
const pop = new Population(world, registry, new KnowledgeBase());
pop.spawn(20);

const N = world.width * world.height;
let terra = 0, resa = 0;
for (let i = 0; i < N; i++) {
  if (pop.foodCap[i] > 0) { terra++; resa += pop.foodCap[i]; }
}
// quanto mangia una persona in un anno: il ritmo della fame contro quanto toglie un pasto
const famePerAnno = P.fameRate !== undefined ? P.fameRate : 0.35;

console.log(JSON.stringify({
  "mappa": world.width + "×" + world.height + " = " + N + " tile",
  "di cui terra che produce": terra + " (" + ((terra / N) * 100).toFixed(0) + "%)",
  "resa totale della terra (somma dei foodCap)": +resa.toFixed(0),
  "resa media per tile": +(resa / Math.max(1, terra)).toFixed(3),
  "── e quindi ──": "",
  "quanta gente se una persona vive con 1 di resa l'anno": Math.round(resa),
  "…con 2": Math.round(resa / 2),
  "…con 3": Math.round(resa / 3),
  "il salvagente sta a": P.tettoPopolazione,
}, null, 1));
