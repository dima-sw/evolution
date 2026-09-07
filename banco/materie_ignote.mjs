// E SE NESSUNO SAPESSE GIÀ TUTTO?
//
// Il motore regalava a chiunque, dal primo istante, la conoscenza perfetta di ogni materia grezza:
// `physiology(m.props)` diceva quanto una cosa nutre, cura o avvelena, e nessuno l'aveva mai
// assaggiata. Era l'onniscienza cablata più grossa rimasta — e stonava col resto del progetto, che
// per le COMBINAZIONI modella con cura ipotesi → esperimento → teoria.
//
// Con `materieIgnote` acceso si conosce ciò che si SENTE (il sapore, e l'amaro che è l'allarme del
// veleno) e si impara ciò che una cosa FA soltanto mangiandola.
//
// Le domande, in ordine di quanto contano:
//   1. il mondo regge? (o si avvelenano tutti e si estinguono)
//   2. si impara davvero? (quante materie conosce il popolo, col passare degli anni)
//   3. si sbaglia davvero? (quante volte si mangia qualcosa creduto buono che fa male — e il
//      caso più bello: una MEDICINA AMARA scansata perché sembra veleno)
//   4. quanto costa?
//
// uso: node banco/materie_ignote.mjs [seed] [tick]
const B = "../src/";
const { P } = await import(B + "params.js");
const { generateWorld } = await import(B + "world.js");
const { MaterialRegistry, defaultMaterials } = await import(B + "materials.js");
const { KnowledgeBase, physiology } = await import(B + "chemistry.js");
const { Population } = await import(B + "npc.js");
const { sapore } = await import(B + "desire.js");
const { spawnAnimals, stepEcosystem, predatorThreatQuery } = await import(B + "animals.js");
const { stepSociety } = await import(B + "emotions.js");
const { stepSocietyAdvanced } = await import(B + "society.js");
const { stepCulture } = await import(B + "culture.js");
const { stepEntities } = await import(B + "entities.js");
const { stepBuildings } = await import(B + "buildings.js");
const { stepClimate } = await import(B + "climate.js");
const { stepFire } = await import(B + "fire.js");
const { updateFactions } = await import(B + "factions.js");

const SEME = process.argv[2] || "sapere";
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

const racconta = (etichetta, { pop, ms }) => {
  const vivi = pop.npcs.filter((n) => n.vivo);
  console.log("\n── " + etichetta + " ──");
  console.log("  vivi " + vivi.length + " · morti " + pop.morti +
    " · salute media " + (vivi.reduce((s, n) => s + n.salute, 0) / Math.max(1, vivi.length)).toFixed(3) +
    " · dolore " + (vivi.reduce((s, n) => s + (n.dolore || 0), 0) / Math.max(1, vivi.length)).toFixed(3) +
    " · " + ms.toFixed(1) + " ms per battito");

  // che cosa il popolo ha imparato, e quanto si sbagliava
  const commestibili = pop.registry.materials.filter((m) => m.rinnovabile && !m.sintetico);
  let conosciute = 0, sbagliavaVeleno = 0, sbagliavaMedicina = 0;
  const esempi = [];
  for (const m of commestibili) {
    const vero = physiology(m.props);
    const c = pop.saperi ? pop.saperi.per.get(m.id) : null;
    if (c) conosciute++;
    // che cosa avrebbe SOSPETTATO senza averla mai provata
    const sospetto = { nutre: Math.max(0, sapore(m.props)) * 0.9, cura: 0, nuoce: m.props.tossicita || 0 };
    // il veleno insapore: sembrava buono e fa male
    if (sospetto.nuoce < 0.12 && vero.danno > 0.2) {
      sbagliavaVeleno++;
      if (esempi.length < 8) esempi.push("  ✗ «" + m.nome + "» sembra innocuo e fa male (sospetto " +
        sospetto.nuoce.toFixed(2) + ", vero " + vero.danno.toFixed(2) + ")" + (c ? "  — poi imparato" : "  — mai provato"));
    }
    // la medicina amara: sembra veleno e invece cura
    if (sospetto.nuoce > 0.3 && vero.beneficio > 0.15) {
      sbagliavaMedicina++;
      if (esempi.length < 8) esempi.push("  ✗ «" + m.nome + "» sembra veleno e invece cura (amaro " +
        sospetto.nuoce.toFixed(2) + ", cura " + vero.beneficio.toFixed(2) + ")" + (c ? "  — poi imparato" : "  — mai provato"));
    }
  }
  console.log("  materie commestibili " + commestibili.length + " · imparate da questo popolo " + conosciute +
    " (" + (conosciute * 100 / Math.max(1, commestibili.length)).toFixed(0) + "%)");
  console.log("  dove il sapore INGANNA: " + sbagliavaVeleno + " veleni insapori · " +
    sbagliavaMedicina + " medicine amare");
  for (const e of esempi) console.log(e);
};

P.materieIgnote = 0;
racconta("TUTTI SANNO TUTTO (com'è adesso)", partita());
P.materieIgnote = 1;
racconta("LE MATERIE VANNO CONOSCIUTE", partita());
P.materieIgnote = 0;
