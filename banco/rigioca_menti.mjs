// LA PARTITA CON LE MENTI SI PUÒ RIGIOCARE?
//
// Con un LLM acceso il mondo NON è riproducibile: il modello sta fuori dalla macchina e può
// rispondere in modo diverso allo stesso stato. Ma se si registra ogni risposta *col battito in cui
// è stata applicata*, quella partita si può ripetere. Qui si verifica proprio questo, senza rete:
// si costruisce un diario a mano e lo si rigioca due volte. Le due partite devono coincidere.
//
// (E per controllo se ne gioca una terza con un diario diverso: deve venire un mondo diverso —
//  altrimenti vorrebbe dire che gli editti non contano niente, che sarebbe una notizia peggiore.)
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
const { stepAI, rigioca } = await import(B + "ai.js");

const SEME = process.argv[2] || "menti";
const GIRI = +(process.argv[3] || 700);

function partita(diario) {
  const world = generateWorld({ seed: SEME, waterPct: 58 });
  const registry = new MaterialRegistry();
  for (const m of defaultMaterials()) registry.add(m);
  registry.bindWorld(world);
  const pop = new Population(world, registry, new KnowledgeBase());
  pop.spawn(240);
  spawnAnimals(pop, 320, 45);

  const dt = 0.165;
  let acc = 0;
  for (let t = 0; t < GIRI; t++) {
    stepClimate(pop, dt); pop.step(dt); stepEcosystem(pop, dt);
    stepSociety(pop, dt, predatorThreatQuery(pop));
    stepBuildings(pop, dt); stepFire(pop, dt);
    acc += dt;
    if (acc > 0.35) {
      try { updateFactions(pop); } catch (e) {}
      stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc);
      stepAI(pop, acc);
      // il diario si rimette appena esistono i governi a cui è destinato
      // si aspetta che i governi siano parecchi e assestati: un popolo appena nato si scioglie
      // subito, e un diario destinato a lui cadrebbe nel vuoto.
      if (diario && !pop._daRigiocare && !pop._diarioMesso && pop.aiStati && pop.aiStati.size >= 10 && pop.anno > 40) {
        rigioca(pop, diario(pop)); pop._diarioMesso = true;
      }
      acc = 0;
    }
  }
  const vivi = pop.npcs.filter((n) => n.vivo);
  const somma = (f) => +vivi.reduce((s, n) => s + f(n), 0).toFixed(4);
  return {
    vivi: vivi.length, anno: pop.anno | 0, morti: pop.morti,
    bestie: pop.creature.filter((a) => a.vivo).length,
    sommaX: somma((n) => n.x), sommaFame: somma((n) => n.fame),
    sommaSalute: somma((n) => n.salute), razzie: pop.razzieTot || 0,
    ordiniApplicati: pop.aiChiamate || 0,
    diarioRimasto: pop._daRigiocare ? pop._daRigiocare.length : "esaurito",
    diarioMesso: !!pop._diarioMesso,
    rimessi: (pop.rigiocateApplicate || 0) + " applicati / " + (pop.rigiocateCadute || 0) + " senza popolo / " + (pop.rigiocateIlleggibili || 0) + " illeggibili",
    governi: pop.aiStati ? pop.aiStati.size : 0,
    edittiVivi: pop.aiStati ? [...pop.aiStati.values()].reduce((s, x) => s + ((x.editti || []).length), 0) : 0,
  };
}

// un diario finto: ordini plausibili, con battiti veri presi dallo stato del mondo
const finto = (parole) => (pop) => {
  const out = [];
  const b = pop._battito || 0;
  let i = 0;
  for (const id of pop.aiStati.keys()) {
    const parola = parole[i % parole.length];
    out.push({
      battito: b + 1 + i,   // subito: i popoli devono esistere ancora anno: pop.anno, fazione: id, provider: "finto",
      testo: JSON.stringify({ pensiero: "provo " + parola,
        editti: [{ tipo: parola, quanti: 40, durata: 6 }], messaggi: [], nomina: null }),
    });
    if (++i >= 8) break;
  }
  return out;
};

const A1 = partita(finto(["raccogliere", "coltivare", "difendere"]));
const A2 = partita(finto(["raccogliere", "coltivare", "difendere"]));
const B1 = partita(finto(["attaccare", "migrare", "reprimere"]));

const uguali = JSON.stringify(A1) === JSON.stringify(A2);
console.log("stesso diario, due rigiocate:", uguali ? "IDENTICHE ✓" : "DIVERSE ✗");
if (!uguali) for (const k of Object.keys(A1)) if (A1[k] !== A2[k]) console.log("  differisce:", k, A1[k], "vs", A2[k]);
console.log("diario diverso:", JSON.stringify(A1) === JSON.stringify(B1) ? "identico (SOSPETTO: gli editti non contano)" : "mondo diverso ✓");
console.log("\nA (pacifico):", JSON.stringify(A1));
console.log("B (bellicoso):", JSON.stringify(B1));
