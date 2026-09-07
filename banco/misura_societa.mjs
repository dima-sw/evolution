// Quanto rende la cache del vicinato per cella? Stesso mondo, stessa funzione, cronometrata con e
// senza. L'interruttore e' temporaneo e viene tolto subito dopo la misura.
import { corri } from "./sim.mjs";
const B = "../src/";
const { P } = await import(B + "params.js");
const { stepSocietyAdvanced } = await import(B + "society.js");
const { pop } = await corri(process.argv[2] || "scala", 58, +(process.argv[3] || 900));
const N = 40;
const prova = (senza) => {
  P._senzaCacheVicinato = senza;
  stepSocietyAdvanced(pop, 0.4);                      // giro a vuoto per scaldare
  const t0 = Number(process.hrtime.bigint());
  for (let i = 0; i < N; i++) stepSocietyAdvanced(pop, 0.4);
  return (Number(process.hrtime.bigint()) - t0) / 1e6 / N;
};
const senza = prova(true), con = prova(false), senza2 = prova(true), con2 = prova(false);
P._senzaCacheVicinato = false;
const s = (senza + senza2) / 2, c = (con + con2) / 2;
console.log("gente=" + pop.npcs.filter((n) => n.vivo).length +
  " | senza cache " + s.toFixed(2) + "ms · con cache " + c.toFixed(2) + "ms" +
  " → " + ((1 - c / s) * 100).toFixed(0) + "% in meno" +
  "   (giri singoli: " + senza.toFixed(1) + "/" + senza2.toFixed(1) + " contro " + con.toFixed(1) + "/" + con2.toFixed(1) + ")");
