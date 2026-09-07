// IL LIVELLO ESTREMO: quando il motore smette di dire CHE COSA sia una cosa.
//
// Con `affordanceTotale` acceso non esistono più Arma, Medicina, Veleno, Utensile: restano solo
// proprietà ed effetti, e OGNI POPOLO raggruppa ciò che incontra secondo come lo percepisce, e lo
// battezza con un nome suo. Due popoli che incontrano la stessa materia possono metterla in
// generi diversi, e chiamarla con parole che l'altro non usa.
//
// È il cuore della regola del progetto portato fino in fondo, ed è l'esperimento che non era mai
// stato fatto per una partita intera. Le domande sono tre:
//   1. il mondo regge? (la gente sopravvive, il gioco non si rompe)
//   2. i popoli arrivano davvero a generi DIVERSI, o convergono tutti sugli stessi?
//   3. quanto costa?
//
// uso: node banco/affordanza.mjs [seed] [tick]
const B = "../src/";
const { P } = await import(B + "params.js");
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

const SEME = process.argv[2] || "affordanza";
const TICK = +(process.argv[3] || 420);

function partita() {
  const world = generateWorld({ seed: SEME, waterPct: 58 });
  const registry = new MaterialRegistry();
  for (const m of defaultMaterials()) registry.add(m);
  registry.bindWorld(world);
  const pop = new Population(world, registry, new KnowledgeBase());
  pop.spawn(240);
  spawnAnimals(pop, 320, 45);
  const dt = 0.165;
  let acc = 0;
  const t0 = performance.now();
  for (let t = 0; t < TICK; t++) {
    stepClimate(pop, dt); pop.step(dt); stepEcosystem(pop, dt);
    stepSociety(pop, dt, predatorThreatQuery(pop));
    stepBuildings(pop, dt); stepFire(pop, dt);
    acc += dt;
    if (acc > 0.35) {
      try { updateFactions(pop); } catch (e) {}
      stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc);
      acc = 0;
    }
  }
  return { pop, ms: (performance.now() - t0) / TICK };
}

const culture = (pop) => {
  // le culture stanno appese ai popoli; si raccolgono per via del metodo che le crea
  const viste = new Set(), out = [];
  for (const n of pop.npcs) {
    if (!n.vivo) continue;
    const l = pop.culturaDi(n);
    if (l && !viste.has(l)) { viste.add(l); out.push(l); }
  }
  return out;
};

const racconta = (etichetta, { pop, ms }) => {
  const vivi = pop.npcs.filter((n) => n.vivo);
  const cult = culture(pop);
  const generiPerCultura = cult.map((l) => (l.generi ? l.generi.size : 0));
  const mestieriPerCultura = cult.map((l) => (l.mestieri ? l.mestieri.size : 0));
  const tuttiIGeneri = new Map();          // firma -> quanti popoli l'hanno
  const nomiPerFirma = new Map();          // firma -> nomi diversi dati dai popoli
  for (const l of cult) if (l.generi) for (const [firma, g] of l.generi) {
    tuttiIGeneri.set(firma, (tuttiIGeneri.get(firma) || 0) + 1);
    if (!nomiPerFirma.has(firma)) nomiPerFirma.set(firma, new Set());
    nomiPerFirma.get(firma).add(g.nome);
  }
  const somma = (a) => a.reduce((s, v) => s + v, 0);
  console.log("\n── " + etichetta + " ──");
  console.log("  vivi " + vivi.length + " · morti " + pop.morti + " · materie " +
    pop.registry.materials.length + " · fazioni " + (pop.factions || []).length +
    " · " + ms.toFixed(1) + " ms per battito");
  console.log("  popoli con una cultura propria: " + cult.length);
  console.log("  generi percepiti: " + somma(generiPerCultura) + " in tutto, " +
    tuttiIGeneri.size + " distinti · mestieri battezzati: " + somma(mestieriPerCultura) +
    " (parole coniate: " + (pop.mestieriConiati || 0) + ")");
  // LA DOMANDA VERA: la stessa cosa, popoli diversi, nomi diversi?
  const condivisi = [...tuttiIGeneri.entries()].filter(([, q]) => q > 1);
  const discordi = condivisi.filter(([f]) => nomiPerFirma.get(f).size > 1);
  console.log("  generi incontrati da più popoli: " + condivisi.length +
    " · di cui battezzati con nomi DIVERSI: " + discordi.length);
  for (const [f] of discordi.slice(0, 4))
    console.log("     stessa cosa, nomi diversi: " + [...nomiPerFirma.get(f)].join(" / "));
  const esempi = cult.filter((l) => l.mestieri && l.mestieri.size).slice(0, 3);
  for (const l of esempi)
    console.log("     mestieri di un popolo: " + [...l.mestieri.values()].slice(0, 6).join(" · "));
};

P.affordanceTotale = 0;
racconta("CATEGORIE NOTE (come è adesso)", partita());
P.affordanceTotale = 1;
racconta("AFFORDANCE TOTALE (ogni popolo battezza il suo mondo)", partita());
P.affordanceTotale = 0;
