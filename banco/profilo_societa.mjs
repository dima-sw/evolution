// DOVE VANNO I MILLISECONDI DELLA SOCIETÀ.
//
// Di `stepSocietyAdvanced` si conosceva un numero solo: il totale. Dentro ci sono otto
// sottosistemi, e non si può togliere lavoro inutile se non si sa quale lo stia facendo.
//
// Si prende un mondo vero, gli si appende il cronometro (spento per tutti gli altri: senza
// `_cronoSoc` il motore non fa una misura in più) e si continua a farlo girare NORMALMENTE —
// tutto il ciclo, non la sola società, altrimenti il mondo si deforma sotto la misura.
//
// Oltre ai millisecondi si conta il LAVORO: quante volte ogni sottosistema chiede il vicinato e
// quanta gente ne riceve. È quel rapporto a dire se il problema è "va piano" o "guarda troppa
// gente per fare pochissime cose".
//
// uso: node banco/profilo_societa.mjs [seed] [tick] [passi-misurati]
import { corri } from "./sim.mjs";
const B = "../src/";
const { stepEcosystem, predatorThreatQuery } = await import(B + "animals.js");
const { stepSociety } = await import(B + "emotions.js");
const { stepSocietyAdvanced } = await import(B + "society.js");
const { stepCulture } = await import(B + "culture.js");
const { stepEntities } = await import(B + "entities.js");
const { stepBuildings } = await import(B + "buildings.js");
const { stepClimate } = await import(B + "climate.js");
const { stepFire } = await import(B + "fire.js");
const { updateFactions } = await import(B + "factions.js");

const seed = process.argv[2] || "scala";
const tick = +(process.argv[3] || 900);
const PASSI = +(process.argv[4] || 40);

const { pop } = await corri(seed, 58, tick);
const vivi = () => pop.npcs.reduce((s, n) => s + (n.vivo ? 1 : 0), 0);
console.log("gente " + vivi() + " · bestie " + (pop.animals ? pop.animals.length : 0));

// I CONTATORI ERANO UN PROXY, ED E' STATO UN ERRORE CARO. Ogni `L.qualcosa++` passava per una
// trappola get e una set: nei cicli piu' interni sono centosessantamila volte a passo, e il
// cronometro ha finito per misurare se stesso — trasferimenti da 214 a 289 ms, coercizione da 229
// a 248. I CONTI restano validi (contare non cambia il mondo), i TEMPI di quel giro no.
// Adesso e' un oggetto normale con le chiavi gia' pronte: un `++` su una proprieta' che esiste
// gia' e' una somma, non una chiamata.
pop._cronoSoc = { ms: {}, chiamate: {}, gente: {}, passi: 0, lav: {
  coercGiri: 0, coercRicchi: 0, coercTentano: 0, coercCandidati: 0, servi: 0,
  donoGiri: 0, donoEmpatici: 0, donoTentano: 0, donoCandidati: 0,
  normeGiri: 0, normeVivi: 0, normeColpevoli: 0, normeProcessi: 0,
  mitiGiri: 0, mitiNuovi: 0 } };
console.log("array npcs " + pop.npcs.length + " · di cui vivi " + vivi() + "  (i morti restano dentro)");
const dt = 0.165;
let acc = 0, battiti = 0;
const t0 = performance.now();
while (pop._cronoSoc.passi < PASSI) {
  stepClimate(pop, dt);
  pop.step(dt);
  stepEcosystem(pop, dt);
  stepSociety(pop, dt, predatorThreatQuery(pop));
  stepBuildings(pop, dt); stepFire(pop, dt);
  battiti++;
  acc += dt;
  if (acc > 0.35) {
    try { updateFactions(pop); } catch (e) {}
    stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc);
    acc = 0;
  }
}
const tuttoMs = (performance.now() - t0) / battiti;

const c = pop._cronoSoc, N = c.passi;
const nomi = Object.keys(c.ms).sort((a, b) => c.ms[b] - c.ms[a]);
const tot = nomi.reduce((s, k) => s + c.ms[k], 0);
const num = (v, d = 1) => v.toFixed(d).padStart(8);
console.log("\n" + PASSI + " passi di società su " + battiti + " battiti · " +
  num(tuttoMs) + " ms per battito (tutto il ciclo)\n");
console.log("sottosistema        ms/passo    quota   chiamate    gente   ns/persona");
for (const k of nomi) {
  const ms = c.ms[k] / N, ch = (c.chiamate[k] || 0) / N, ge = (c.gente[k] || 0) / N;
  console.log(k.padEnd(16) + num(ms, 2) + num(c.ms[k] / tot * 100, 1) + "%" +
    num(ch, 1) + num(ge, 0) + (ge > 0 ? num(c.ms[k] * 1e6 / (c.gente[k] || 1), 0) : "       —"));
}
console.log("-".repeat(66));
console.log("TOTALE".padEnd(16) + num(tot / N, 2) + "     100%" +
  num(Object.values(c.chiamate).reduce((a, b) => a + b, 0) / N, 1) +
  num(Object.values(c.gente).reduce((a, b) => a + b, 0) / N, 0));

const lav = Object.keys(c.lav);
if (lav.length) {
  console.log("");
  console.log("il LAVORO, per passo di societa:");
  for (const k of lav.sort()) console.log("  " + k.padEnd(18) + num(c.lav[k] / N, 0));
}
