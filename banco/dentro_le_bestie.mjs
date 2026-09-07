// DOVE VANNO I MILLISECONDI DELLE BESTIE.
//
// Il totale diceva che una bestia costa da 0,87 a 8,80 µs a seconda della partita — dieci volte
// tanto mentre le bestie DIMINUISCONO. Non poteva essere il passo di una bestia: dentro quel numero
// c'erano tre cose diverse. Le due griglie scalano col numero di bestie; il censimento dei branchi
// scala col numero di BRANCHI, ed e' un'altra cosa — piu' le bestie si diradano, piu' branchi
// distinti esistono, e ogni branco paga una ricerca dei pericoli.
//
// uso: node banco/dentro_le_bestie.mjs [seed]
import { corri } from "./sim.mjs";
const B = "../src/";
const { stepEcosystem, contaLavoroFauna } = await import(B + "animals.js");

console.log("tick  gente  bestie  branchi  b/branco |  griglie  branchi  ognuna   TOT | per bestia");
for (const tick of [300, 500, 700, 900]) {
  const { pop } = await corri(process.argv[2] || "scala", 58, tick);
  const bestie = pop.creature.filter((a) => a.vivo).length;
  const gente = pop.npcs.filter((n) => n.vivo).length;
  pop._cronoFauna = { bestie: 0, caccia: 0, malattia: 0, griglie: 0, branchi: 0 };
  const N = 24;
  const lav = { celle: 0, esaminate: 0, celleCaccia: 0, esamCaccia: 0, celleFuga: 0, esamFuga: 0,
    chiamateCaccia: 0, cacciaAVuoto: 0, chiamateFuga: 0, fase: null };
  contaLavoroFauna(lav);
  for (let t = 0; t < N; t++) stepEcosystem(pop, 0.165);
  contaLavoroFauna(null);
  const c = pop._cronoFauna;
  const ognuna = (c.bestie - c.griglie - c.branchi) / N;
  const nb = c.nBranchi || 0;
  console.log(
    String(tick).padStart(4) + String(gente).padStart(7) + String(bestie).padStart(8) +
    String(nb).padStart(9) + (bestie / Math.max(1, nb)).toFixed(1).padStart(10) + " |" +
    (c.griglie / N).toFixed(1).padStart(9) + (c.branchi / N).toFixed(1).padStart(9) +
    ognuna.toFixed(1).padStart(8) + (c.bestie / N).toFixed(1).padStart(6) + " |" +
    ((c.bestie / N) * 1000 / Math.max(1, bestie)).toFixed(2).padStart(11) + " µs");
  const per = (v) => (v / N).toFixed(0).padStart(8);
  console.log("       caccia: " + (lav.chiamateCaccia / N).toFixed(0) + " ricerche/battito · " +
    per(lav.celleCaccia) + " celle · " + per(lav.esamCaccia) + " bestie guardate · a vuoto " +
    (lav.cacciaAVuoto * 100 / Math.max(1, lav.chiamateCaccia)).toFixed(0) + "%");
  console.log("       fuga:   " + (lav.chiamateFuga / N).toFixed(0) + " ricerche/battito · " +
    per(lav.celleFuga) + " celle · " + per(lav.esamFuga) + " bestie guardate");
}
