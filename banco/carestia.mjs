// LA FAME EMERGE, O È IL MONDO A NON PRODURLA?
//
// Il lavoro forzato non nasce mai perché nessuno arriva a 0,7 di fame — il 99° percentile sta a
// 0,65. Ma questo non dice ancora se la soglia sia sbagliata: potrebbe essere che quel mondo sia
// semplicemente **un mondo di abbondanza**, dove nessuno è mai disperato, e allora la sottomissione
// che non emerge è la risposta giusta, non un guasto.
//
// Si distingue in un modo solo: si affama il mondo e si guarda. Se sotto carestia la fame sale
// oltre le soglie e i servi compaiono, la legge è sana e il mondo era solo generoso. Se nemmeno
// morendo di fame la gente supera le soglie, allora le soglie non descrivono niente.
//
// uso: node banco/carestia.mjs [ricrescite separate da virgola] [tick]
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

const REGEN = (process.argv[2] || "0.05,0.02,0.008,0.004,0.002").split(",").map(Number);
const TICK = +(process.argv[3] || 420);
const normale = P.vegRegen;

console.log("ricrescita normale del mondo: " + normale + "\n");
console.log("ricrescita   vivi   morti  fame:50°   95°   99°   max   senza nulla  costretti  doni");

for (const regen of REGEN) {
  P.vegRegen = regen;
  const world = generateWorld({ seed: "carestia", waterPct: 58 });
  const registry = new MaterialRegistry();
  for (const m of defaultMaterials()) registry.add(m);
  registry.bindWorld(world);
  const pop = new Population(world, registry, new KnowledgeBase());
  pop.spawn(240);
  spawnAnimals(pop, 320, 45);
  const dt = 0.165;
  let acc = 0;
  // la fame più alta MAI vista, non solo quella dell'ultimo istante: chi sta per morire di fame
  // sparisce in fretta, e una fotografia finale non lo vedrebbe mai.
  let famePiuAlta = 0, mai07 = 0, mai10 = 0, serviMax = 0, serviSomma = 0, campioni = 0;
  for (let t = 0; t < TICK; t++) {
    stepClimate(pop, dt); pop.step(dt); stepEcosystem(pop, dt);
    stepSociety(pop, dt, predatorThreatQuery(pop));
    stepBuildings(pop, dt); stepFire(pop, dt);
    acc += dt;
    if (acc > 0.35) {
      try { updateFactions(pop); } catch (e) {}
      stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc);
      acc = 0;
      for (const n of pop.npcs) {
        if (!n.vivo) continue;
        if (n.fame > famePiuAlta) famePiuAlta = n.fame;
        if (n.fame > 0.7) mai07++;
        if (n.fame > 1.0) mai10++;
      }
      // I SERVI CONTEMPORANEI, non gli episodi. `costretti` conta quante volte è successo in
      // tutta la partita; quello che dice se il mondo è schiavista è quanti ce ne sono ADESSO.
      const ora = pop.npcs.reduce((q, n) => q + (n.vivo && n._padrone ? 1 : 0), 0);
      if (ora > serviMax) serviMax = ora;
      serviSomma += ora; campioni++;
    }
  }
  const vivi = pop.npcs.filter((n) => n.vivo);
  const f = vivi.map((n) => n.fame).sort((a, b) => a - b);
  const pc = (p) => (f.length ? f[Math.min(f.length - 1, (f.length * p) | 0)] : 0);
  console.log(
    String(regen).padStart(9) + String(vivi.length).padStart(7) + String(pop.morti).padStart(8) +
    pc(0.5).toFixed(2).padStart(9) + pc(0.95).toFixed(2).padStart(6) + pc(0.99).toFixed(2).padStart(6) +
    famePiuAlta.toFixed(2).padStart(7) +
    String(vivi.filter((n) => n.inventory.size === 0).length).padStart(13) +
    String(pop.costretti | 0).padStart(11) + String(pop.doni | 0).padStart(6) +
    (regen === normale ? "   ← il mondo normale" : ""));
  console.log("            (episodi sopra 0,7: " + mai07 + " · sopra 1,0, dove la fame fa male: " + mai10 +
    ")  servi nello stesso momento: " + (serviSomma / Math.max(1, campioni)).toFixed(1) + " in media, " +
    serviMax + " al massimo = " + (serviMax * 100 / Math.max(1, vivi.length)).toFixed(1) + "% della gente");
  // ENTRATE E USCITE. Se sotto carestia entrano piu' servi ma ne escono altrettanti, il patto si
  // rompe perche' il padrone non ha di che sfamare: e' una spiegazione, e va misurata.
  // COME SI ESCE DALLA SERVITU'. Non serve toccare il motore per saperlo: chi muore da servo si
  // porta dietro il suo `_padrone`, quindi i morti con un padrone addosso sono esattamente quelli
  // che ne sono usciti morendo. E si puo' confrontare quanto muoiono loro con quanto muoiono
  // tutti gli altri: se la servitu' uccide, si vede qui.
  // Non si contano guardando l'elenco: i morti vengono compattati via. Lo conta il motore, nel
  // punto in cui si muore.
  const mortiServi = (pop.mortiDaServo | 0);
  const orfani = pop.orfaniDiPadrone | 0;
  const usciti = (pop.liberatisi | 0) + mortiServi + orfani;
  const quota = (a, b) => (a * 100 / Math.max(1, b)).toFixed(0) + "%";
  console.log("            entrati " + (pop.costretti | 0) + " · usciti " + usciti +
    " — ribellandosi " + (pop.liberatisi | 0) + " (" + quota(pop.liberatisi | 0, usciti) +
    "), morendo " + mortiServi + " (" + quota(mortiServi, usciti) +
    "), per la morte del padrone " + orfani + " (" + quota(orfani, usciti) + ")");
  const serviOra = pop.npcs.reduce((q, n) => q + (n.vivo && n._padrone != null ? 1 : 0), 0);
  const quadra = (pop.costretti | 0) - usciti - serviOra;
  // Il residuo non e' un'uscita mancante: sono i servi morti per strade che non passano dal punto
  // in cui il motore conta (annegamento, epidemia, violenza). Se restasse GROSSO, allora si',
  // sarebbe un meccanismo che non vedo — ed e' esattamente cosi' che ne ho trovato uno.
  console.log("            IL CONTO: entrati " + (pop.costretti | 0) + " = ribellati " +
    (pop.liberatisi | 0) + " + orfani " + orfani + " + morti di fame o vecchiaia " + mortiServi +
    " + ancora servi " + serviOra + " + " + quadra + " morti in altro modo" +
    (Math.abs(quadra) > (pop.costretti | 0) * 0.15 ? "   ✗ TROPPI: manca un'uscita" : "   ✓"));
}
P.vegRegen = normale;
