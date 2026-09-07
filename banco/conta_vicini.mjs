// Quante volte viene chiamata vicini() in un passo di societa'? Se sono poche, nessuna cache puo'
// rendere: e' il numero che decide se l'ottimizzazione ha senso o no.
import { corri } from "./sim.mjs";
const B = "../src/";
const { P } = await import(B + "params.js");
const { stepSocietyAdvanced } = await import(B + "society.js");
const { pop } = await corri(process.argv[2] || "scala", 58, +(process.argv[3] || 900));
const vivi = pop.npcs.filter((n) => n.vivo).length;
P._contaVicini = 0;
const N = 20;
for (let i = 0; i < N; i++) stepSocietyAdvanced(pop, 0.4);
const perPasso = P._contaVicini / N;
console.log("gente=" + vivi + " | chiamate a vicini() per passo: " + perPasso.toFixed(1) +
  "  (una ogni " + (vivi / Math.max(1, perPasso)).toFixed(0) + " persone)");
console.log(perPasso < vivi * 0.05
  ? "→ troppo poche perche' una cache renda: i chiamanti stanno dietro dadi a bassa probabilita'."
  : "→ abbastanza da giustificare una cache.");
