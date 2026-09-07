// LO STESSO MONDO SU PIÙ SEMI, E CON DUE MOTORI.
//
// Tutte le verifiche fatte finora hanno un limite dichiarato: **un seme solo**. Un'ottimizzazione
// può lasciare intatta l'impronta di quella partita e romperne un'altra — basta che la strada che
// sbaglia non venga mai percorsa lì dentro. È il difetto che rendeva vuota la verifica della
// coercizione, ed è generale.
//
// Questa sonda prende una cartella di sorgenti QUALSIASI e stampa l'impronta di N semi. Facendola
// girare sul motore di adesso e su una copia con le ottimizzazioni tolte, le due liste devono
// coincidere riga per riga. Se una sola cifra si muove, l'ottimizzazione non è esatta.
//
// uso: node banco/multiseme.mjs <cartella-src> <seme1,seme2,...> [tick]
import path from "path";
import { pathToFileURL } from "url";

const dir = process.argv[2] || "../src";
const B = pathToFileURL(path.resolve(dir)).href + "/";
const semi = (process.argv[3] || "uno,due,tre,quattro,cinque").split(",");
const TICK = +(process.argv[4] || 420);

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

function partita(seme, acqua, tick) {
  const world = generateWorld({ seed: seme, waterPct: acqua });
  const registry = new MaterialRegistry();
  for (const m of defaultMaterials()) registry.add(m);
  registry.bindWorld(world);
  const pop = new Population(world, registry, new KnowledgeBase());
  pop.spawn(240);
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
  }
  return pop;
}

// L'impronta è fatta di somme su TUTTI, non di medie: una media nasconde due errori che si
// compensano, una somma no. E ci sono dentro cose che nascono da strade diverse del codice —
// dove sta la gente, quanta fame ha, quanto si capiscono, quante razzie, quante materie inventate.
const impronta = (pop) => {
  const vivi = pop.npcs.filter((n) => n.vivo);
  const somma = (f) => +vivi.reduce((s, n) => s + f(n), 0).toFixed(4);
  return {
    vivi: vivi.length, anno: pop.anno | 0, nascite: pop.nascite, morti: pop.morti,
    bestie: pop.creature.filter((a) => a.vivo).length,
    sommaX: somma((n) => n.x), sommaY: somma((n) => n.y),
    sommaFame: somma((n) => n.fame), sommaLingua: somma((n) => n.lingua),
    sommaSalute: somma((n) => n.salute), sommaSapere: somma((n) => n.sapere.size),
    servi: vivi.filter((n) => n._padrone).length,
    doni: pop.doni | 0, costretti: pop.costretti | 0, punizioni: pop.punizioni | 0,
    fazioni: (pop.factions || []).length, razzie: pop.razzieTot || 0,
    materie: pop.registry.materials.length, miti: (pop.miti || []).length,
  };
};

console.log("# " + dir + "  ·  " + TICK + " battiti");
for (const seme of semi) {
  const pop = partita(seme, 58, TICK);
  console.log(seme + " " + JSON.stringify(impronta(pop)));
}
