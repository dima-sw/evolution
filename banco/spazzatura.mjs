// QUANTO DI QUEL TEMPO È ALLOCAZIONE?
//
// Le proposte di ottimizzazione girano quasi tutte attorno alle allocazioni: array temporanei,
// chiavi-stringa, Map e Set dentro i cicli caldi. Ma prima di inseguirle bisogna sapere se il costo
// c'è davvero: se il motore alloca poco, togliere allocazioni non rende niente — e ci si è già
// cascati una volta stanotte con la cache del vicinato.
//
// Qui si misura quanta memoria si consuma per battito e quanto tempo costa raccoglierla.
//
// uso:  node --expose-gc banco/spazzatura.mjs [seme] [giri]
//       (senza --expose-gc si misura solo la crescita, non la pausa di raccolta)
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

const { pop } = await corri(process.argv[2] || "scala", 58, +(process.argv[3] || 900));
const vivi = () => pop.npcs.filter((n) => n.vivo).length;
const bestie = () => pop.creature.filter((a) => a.vivo).length;

const dt = 0.165;
let acc = 0;
const giro = () => {
  stepClimate(pop, dt); pop.step(dt); stepEcosystem(pop, dt);
  stepSociety(pop, dt, predatorThreatQuery(pop));
  stepBuildings(pop, dt); stepFire(pop, dt);
  acc += dt;
  if (acc > 0.35) { try { updateFactions(pop); } catch (e) {} stepCulture(pop, acc); stepSocietyAdvanced(pop, acc); stepEntities(pop, acc); acc = 0; }
};

const MB = (b) => b / 1048576;
const puoiRaccogliere = typeof global.gc === "function";

for (let i = 0; i < 20; i++) giro();                 // si scalda

if (puoiRaccogliere) global.gc();
const heap0 = process.memoryUsage().heapUsed;
const N = 60;
const t0 = performance.now();
for (let i = 0; i < N; i++) giro();
const tempo = performance.now() - t0;
const heap1 = process.memoryUsage().heapUsed;

let pausa = null;
if (puoiRaccogliere) {
  const g0 = performance.now();
  global.gc();
  pausa = performance.now() - g0;
}

const g = vivi(), b = bestie();
const cresciuto = MB(heap1 - heap0);
console.log(JSON.stringify({
  gente: g, bestie: b,
  "ms per battito": +(tempo / N).toFixed(1),
  "memoria consumata per battito (MB)": +(cresciuto / N).toFixed(2),
  "…per persona (KB)": +((cresciuto * 1024) / N / Math.max(1, g)).toFixed(2),
  "pausa di raccolta (ms)": pausa === null ? "serve --expose-gc" : +pausa.toFixed(1),
  "quanto pesa la raccolta": pausa === null ? "?" :
    (pausa / (tempo / N)).toFixed(2) + " battiti di lavoro per una raccolta",
}, null, 1));

if (!puoiRaccogliere) {
  console.log("\n(rilancia con  node --expose-gc banco/spazzatura.mjs  per la pausa di raccolta)");
} else {
  const quota = pausa / tempo;
  console.log("\n" + (quota > 0.1
    ? "→ la spazzatura pesa: inseguire le allocazioni ha senso."
    : "→ la spazzatura pesa poco: togliere allocazioni renderà poco, meglio guardare altrove."));
}
